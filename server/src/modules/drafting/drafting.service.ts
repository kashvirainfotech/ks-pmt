import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import { DatabaseService } from "../../database/database.service";
import {
  AudienceScope,
  DraftStatus,
  DraftType,
  GenerateDraftDto,
  QueryDraftsDto,
  ReviewDraftDto,
  UpdateRuleConfigDto,
} from "./dto/draft-dtos";
import {
  compileReleaseNotesDraft,
  computeTitleSimilarity,
  generateCriteriaDraft,
  generateWbsDraft,
} from "./draft-generator";

@Injectable()
export class DraftingService {
  private readonly logger = new Logger(DraftingService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * List all drafts with filter criteria and reviewer / creator metadata
   */
  async getDrafts(query: QueryDraftsDto) {
    const params: any[] = [];
    const where: string[] = ["d.is_active = TRUE"];

    if (query.draftType) {
      params.push(query.draftType);
      where.push(`d.draft_type = $${params.length}`);
    }

    if (query.sourceEntityType) {
      params.push(query.sourceEntityType);
      where.push(`d.source_entity_type = $${params.length}`);
    }

    if (query.sourceEntityId) {
      params.push(query.sourceEntityId);
      where.push(`d.source_entity_id = $${params.length}`);
    }

    if (query.status) {
      params.push(query.status);
      where.push(`d.status = $${params.length}`);
    }

    if (query.audienceScope) {
      params.push(query.audienceScope);
      where.push(`d.audience_scope = $${params.length}`);
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;
    const sql = `
      SELECT 
        d.*,
        u_creator.display_name AS creator_name,
        u_reviewer.display_name AS reviewer_name
      FROM draft_suggestions d
      LEFT JOIN users u_creator ON d.created_by = u_creator.id
      LEFT JOIN users u_reviewer ON d.reviewed_by = u_reviewer.id
      ${whereSql}
      ORDER BY 
        CASE WHEN d.status = 'PENDING_REVIEW' THEN 0 ELSE 1 END,
        d.created_at DESC;
    `;

    const res = await this.db.query(sql, params);
    return res.rows;
  }

  /**
   * Retrieve a single draft suggestion by ID
   */
  async getDraftById(id: string) {
    const sql = `
      SELECT 
        d.*,
        u_creator.display_name AS creator_name,
        u_reviewer.display_name AS reviewer_name
      FROM draft_suggestions d
      LEFT JOIN users u_creator ON d.created_by = u_creator.id
      LEFT JOIN users u_reviewer ON d.reviewed_by = u_reviewer.id
      WHERE d.id = $1 AND d.is_active = TRUE;
    `;
    const res = await this.db.query(sql, [id]);
    if (res.rowCount === 0) {
      throw new NotFoundException(`Draft suggestion not found`);
    }
    return res.rows[0];
  }

  /**
   * Deterministic draft generator based on source entities and configuration rules
   */
  async generateDraft(dto: GenerateDraftDto, userId: string) {
    const audience = dto.audienceScope || AudienceScope.INTERNAL_ONLY;

    switch (dto.generatorType) {
      case "SUBTASKS": {
        const taskRes = await this.db.query(
          `SELECT t.*, p.project_code FROM tasks t LEFT JOIN projects p ON t.project_id = p.id WHERE t.id = $1 AND t.is_active = TRUE;`,
          [dto.entityId],
        );
        if (taskRes.rowCount === 0) {
          throw new NotFoundException(`Source task not found`);
        }
        const task = taskRes.rows[0];
        const draftContent = generateWbsDraft(
          task.title,
          task.description,
          task.estimated_hours || 24,
        );

        const draftCode = `DRF-WBS-${Date.now().toString().slice(-6)}`;
        const insertRes = await this.db.query(
          `
          INSERT INTO draft_suggestions (
            draft_code, draft_type, title, source_entity_type, source_entity_id,
            source_entity_code, audience_scope, status, suggested_content, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *;
        `,
          [
            draftCode,
            DraftType.DRAFT_SUBTASKS,
            `Work Breakdown Structure: ${task.title}`,
            "TASK",
            task.id,
            task.task_code,
            audience,
            DraftStatus.PENDING_REVIEW,
            JSON.stringify(draftContent),
            userId,
          ],
        );
        return insertRes.rows[0];
      }

      case "ACCEPTANCE_CRITERIA": {
        const reqRes = await this.db.query(
          `SELECT * FROM requirement_specifications WHERE id = $1 AND is_active = TRUE;`,
          [dto.entityId],
        );
        if (reqRes.rowCount === 0) {
          throw new NotFoundException(`Source requirement specification not found`);
        }
        const req = reqRes.rows[0];
        const draftContent = generateCriteriaDraft(
          req.req_code,
          req.title,
          req.in_scope || req.business_objective,
        );

        const draftCode = `DRF-AC-${Date.now().toString().slice(-6)}`;
        const insertRes = await this.db.query(
          `
          INSERT INTO draft_suggestions (
            draft_code, draft_type, title, source_entity_type, source_entity_id,
            source_entity_code, audience_scope, status, suggested_content, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *;
        `,
          [
            draftCode,
            DraftType.DRAFT_ACCEPTANCE_CRITERIA,
            `Acceptance Criteria: ${req.title}`,
            "REQUIREMENT",
            req.id,
            req.req_code,
            audience,
            DraftStatus.PENDING_REVIEW,
            JSON.stringify(draftContent),
            userId,
          ],
        );
        return insertRes.rows[0];
      }

      case "RELEASE_NOTES": {
        const verRes = await this.db.query(
          `SELECT * FROM versions WHERE id = $1 AND is_active = TRUE;`,
          [dto.entityId],
        );
        if (verRes.rowCount === 0) {
          throw new NotFoundException(`Source software version not found`);
        }
        const version = verRes.rows[0];

        const tasksRes = await this.db.query(
          `
          SELECT 
            t.task_code AS code,
            t.title,
            tt.type_name AS type,
            (tt.type_name ILIKE '%bug%' OR tt.type_name ILIKE '%defect%') AS is_bug
          FROM tasks t
          JOIN task_types tt ON t.task_type_id = tt.id
          WHERE t.version_id = $1 AND t.is_active = TRUE
          ORDER BY t.created_at ASC;
        `,
          [version.id],
        );

        const draftContent = compileReleaseNotesDraft(
          version.version_code,
          tasksRes.rows,
          audience === AudienceScope.CLIENT_SAFE ? "CLIENT_SAFE" : "INTERNAL_ONLY",
        );

        const draftCode = `DRF-REL-${Date.now().toString().slice(-6)}`;
        const insertRes = await this.db.query(
          `
          INSERT INTO draft_suggestions (
            draft_code, draft_type, title, source_entity_type, source_entity_id,
            source_entity_code, audience_scope, status, suggested_content, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *;
        `,
          [
            draftCode,
            DraftType.DRAFT_RELEASE_NOTES,
            `Release Notes: ${version.version_code} (${audience})`,
            "VERSION",
            version.id,
            version.version_code,
            audience,
            DraftStatus.PENDING_REVIEW,
            JSON.stringify(draftContent),
            userId,
          ],
        );
        return insertRes.rows[0];
      }

      case "GAP_AUDIT": {
        // Run audit on specifications lacking test cases or acceptance criteria
        const gapSpecsRes = await this.db.query(`
          SELECT 
            r.id,
            r.req_code,
            r.title,
            r.status,
            (
              SELECT COUNT(*) 
              FROM requirement_acceptance_criteria rac 
              WHERE rac.requirement_id = r.id AND rac.is_active = TRUE
            ) AS criteria_count,
            (
              SELECT COUNT(*)
              FROM requirement_acceptance_criteria rac
              JOIN test_cases tc ON tc.requirement_criterion_id = rac.id
              WHERE rac.requirement_id = r.id AND tc.is_active = TRUE
            ) AS test_case_count
          FROM requirement_specifications r
          WHERE r.is_active = TRUE
          ORDER BY r.created_at DESC
          LIMIT 20;
        `);

        const createdGaps: any[] = [];
        for (const spec of gapSpecsRes.rows) {
          const criteriaCount = Number(spec.criteria_count);
          const testCaseCount = Number(spec.test_case_count);

          if (criteriaCount === 0) {
            const draftCode = `GAP-AC-${spec.req_code}-${Date.now().toString().slice(-4)}`;
            const title = `Coverage Gap: ${spec.req_code} lacks Acceptance Criteria`;
            const content = {
              rule_code: "RULE-GAP-ACCEPTANCE",
              issue: "Specification has no verifiable Given-When-Then criteria defined",
              recommendation: "Generate acceptance criteria draft and baseline requirement.",
              criteria_count: 0,
              test_case_count: testCaseCount,
            };

            const ins = await this.db.query(
              `
              INSERT INTO draft_suggestions (
                draft_code, draft_type, title, source_entity_type, source_entity_id,
                source_entity_code, audience_scope, status, suggested_content, created_by
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              ON CONFLICT (draft_code) DO NOTHING
              RETURNING *;
            `,
              [
                draftCode,
                DraftType.GAP_SUGGESTION,
                title,
                "REQUIREMENT",
                spec.id,
                spec.req_code,
                AudienceScope.INTERNAL_ONLY,
                DraftStatus.PENDING_REVIEW,
                JSON.stringify(content),
                userId,
              ],
            );
            if (ins.rows.length > 0) createdGaps.push(ins.rows[0]);
          }

          if (criteriaCount > 0 && testCaseCount === 0) {
            const draftCode = `GAP-QA-${spec.req_code}-${Date.now().toString().slice(-4)}`;
            const title = `QA Test Gap: ${spec.req_code} has criteria but 0 linked Test Cases`;
            const content = {
              rule_code: "RULE-GAP-TESTING",
              issue: "Acceptance criteria exist but no manual or automated test cases are linked",
              recommendation: "Author QA verification test cases before sprint regression lock.",
              criteria_count: criteriaCount,
              test_case_count: 0,
            };

            const ins = await this.db.query(
              `
              INSERT INTO draft_suggestions (
                draft_code, draft_type, title, source_entity_type, source_entity_id,
                source_entity_code, audience_scope, status, suggested_content, created_by
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              ON CONFLICT (draft_code) DO NOTHING
              RETURNING *;
            `,
              [
                draftCode,
                DraftType.GAP_SUGGESTION,
                title,
                "REQUIREMENT",
                spec.id,
                spec.req_code,
                AudienceScope.INTERNAL_ONLY,
                DraftStatus.PENDING_REVIEW,
                JSON.stringify(content),
                userId,
              ],
            );
            if (ins.rows.length > 0) createdGaps.push(ins.rows[0]);
          }
        }

        return {
          audited_requirements: gapSpecsRes.rowCount,
          gaps_detected: createdGaps.length,
          gap_suggestions: createdGaps,
        };
      }

      case "DUPLICATE_CHECK": {
        // Query threshold from rules
        const ruleRes = await this.db.query(
          `SELECT similarity_threshold FROM draft_rule_configs WHERE rule_code = 'RULE-DUP-TASKS' AND is_enabled = TRUE;`,
        );
        const threshold = ruleRes.rowCount > 0 ? Number(ruleRes.rows[0].similarity_threshold) : 0.65;

        const targetTaskRes = await this.db.query(
          `SELECT id, task_code, title, project_id FROM tasks WHERE id = $1;`,
          [dto.entityId],
        );
        if (targetTaskRes.rowCount === 0) {
          throw new NotFoundException(`Task not found for duplicate scan`);
        }
        const target = targetTaskRes.rows[0];

        const otherTasksRes = await this.db.query(
          `SELECT id, task_code, title FROM tasks WHERE id <> $1 AND is_active = TRUE ORDER BY created_at DESC LIMIT 50;`,
          [target.id],
        );

        const duplicates: any[] = [];
        for (const candidate of otherTasksRes.rows) {
          const sim = computeTitleSimilarity(target.title, candidate.title);
          if (sim >= threshold) {
            duplicates.push({
              matched_task_id: candidate.id,
              matched_task_code: candidate.task_code,
              matched_title: candidate.title,
              similarity_score: sim,
            });
          }
        }

        if (duplicates.length > 0) {
          const draftCode = `DUP-${target.task_code}-${Date.now().toString().slice(-4)}`;
          const content = {
            target_task: { id: target.id, code: target.task_code, title: target.title },
            matches: duplicates,
            threshold_used: threshold,
          };

          const insertRes = await this.db.query(
            `
            INSERT INTO draft_suggestions (
              draft_code, draft_type, title, source_entity_type, source_entity_id,
              source_entity_code, audience_scope, status, suggested_content, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *;
          `,
            [
              draftCode,
              DraftType.DUPLICATE_SUGGESTION,
              `Potential Duplicates: ${target.task_code} (${duplicates.length} match${duplicates.length > 1 ? "es" : ""})`,
              "TASK",
              target.id,
              target.task_code,
              AudienceScope.INTERNAL_ONLY,
              DraftStatus.PENDING_REVIEW,
              JSON.stringify(content),
              userId,
            ],
          );
          return insertRes.rows[0];
        }

        return {
          message: "No duplicates found above threshold",
          scanned_tasks: otherTasksRes.rowCount,
          threshold,
        };
      }

      default:
        throw new BadRequestException(`Unsupported generator type`);
    }
  }

  /**
   * Human review workflow: Accept, Modify & Accept, Reject, or Discard draft.
   * If applyToSource = true on acceptance, instantiate subtasks or criteria into live entities.
   */
  async reviewDraft(id: string, dto: ReviewDraftDto, userId: string) {
    const draftRes = await this.db.query(
      `SELECT * FROM draft_suggestions WHERE id = $1 AND is_active = TRUE;`,
      [id],
    );
    if (draftRes.rowCount === 0) {
      throw new NotFoundException(`Draft suggestion not found`);
    }
    const draft = draftRes.rows[0];

    let appliedEntityType = draft.applied_entity_type;
    let appliedEntityId = draft.applied_entity_id;

    const isAccepted =
      dto.status === DraftStatus.ACCEPTED ||
      dto.status === DraftStatus.MODIFIED_AND_ACCEPTED;

    if (isAccepted && dto.applyToSource) {
      const activeContent = dto.reviewedContent || draft.suggested_content;

      if (draft.draft_type === DraftType.DRAFT_SUBTASKS) {
        // Instantiate child tasks under source task
        const parentTaskRes = await this.db.query(
          `SELECT * FROM tasks WHERE id = $1;`,
          [draft.source_entity_id],
        );
        if (parentTaskRes.rowCount > 0) {
          const parent = parentTaskRes.rows[0];
          const subtasks = activeContent.subtasks || [];
          let firstId: string | null = null;

          for (let i = 0; i < subtasks.length; i++) {
            const sub = subtasks[i];
            const subCode = `${parent.task_code}-SUB${i + 1}-${randomUUID().slice(0, 4).toUpperCase()}`;
            const subIns = await this.db.query(
              `
              INSERT INTO tasks (
                task_code, title, hierarchy_level, task_type_id, status_id,
                project_id, product_id, version_id, branch_id, parent_task_id,
                estimated_hours, created_by
              ) VALUES ($1, $2, 'SUBTASK', $3, $4, $5, $6, $7, $8, $9, $10, $11)
              RETURNING id;
            `,
              [
                subCode,
                sub.title,
                parent.task_type_id,
                parent.status_id,
                parent.project_id,
                parent.product_id,
                parent.version_id,
                parent.branch_id,
                parent.id,
                sub.estimated_hours || 4,
                userId,
              ],
            );
            if (!firstId && subIns.rows.length > 0) {
              firstId = subIns.rows[0].id;
            }
          }
          appliedEntityType = "TASK";
          appliedEntityId = firstId || parent.id;
        }
      } else if (draft.draft_type === DraftType.DRAFT_ACCEPTANCE_CRITERIA) {
        // Instantiate into requirement_acceptance_criteria
        const criteria = activeContent.criteria || [];
        for (let i = 0; i < criteria.length; i++) {
          const crit = criteria[i];
          await this.db.query(
            `
            INSERT INTO requirement_acceptance_criteria (
              requirement_id, criteria_code, title, description,
              verification_method, order_index, created_by
            ) VALUES ($1, $2, $3, $4, 'MANUAL_TEST', $5, $6)
            ON CONFLICT DO NOTHING;
          `,
            [
              draft.source_entity_id,
              crit.criterion_code || `AC-${i + 1}`,
              crit.given_condition.slice(0, 250),
              `Given: ${crit.given_condition}\nWhen: ${crit.when_action}\nThen: ${crit.then_expected}`,
              i + 1,
              userId,
            ],
          );
        }
        appliedEntityType = "REQUIREMENT_ACCEPTANCE_CRITERIA";
        appliedEntityId = draft.source_entity_id;
      }
    }

    const updateRes = await this.db.query(
      `
      UPDATE draft_suggestions
      SET 
        status = $1,
        review_notes = $2,
        reviewed_content = $3,
        reviewed_by = $4,
        reviewed_at = CURRENT_TIMESTAMP,
        applied_entity_type = $5,
        applied_entity_id = $6,
        updated_by = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *;
    `,
      [
        dto.status,
        dto.reviewNotes || null,
        dto.reviewedContent ? JSON.stringify(dto.reviewedContent) : draft.reviewed_content,
        userId,
        appliedEntityType,
        appliedEntityId,
        id,
      ],
    );

    return updateRes.rows[0];
  }

  /**
   * Retrieve all drafting rule configurations
   */
  async getRuleConfigs() {
    const res = await this.db.query(
      `SELECT * FROM draft_rule_configs WHERE is_active = TRUE ORDER BY rule_code ASC;`,
    );
    return res.rows;
  }

  /**
   * Update configuration parameters for a drafting rule
   */
  async updateRuleConfig(id: string, dto: UpdateRuleConfigDto, userId: string) {
    const existRes = await this.db.query(
      `SELECT * FROM draft_rule_configs WHERE id = $1 AND is_active = TRUE;`,
      [id],
    );
    if (existRes.rowCount === 0) {
      throw new NotFoundException(`Draft rule config not found`);
    }

    const current = existRes.rows[0];
    const isEnabled = dto.isEnabled !== undefined ? dto.isEnabled : current.is_enabled;
    const similarity =
      dto.similarityThreshold !== undefined
        ? dto.similarityThreshold
        : current.similarity_threshold;
    const params =
      dto.ruleParameters !== undefined
        ? JSON.stringify(dto.ruleParameters)
        : current.rule_parameters;
    const desc = dto.description !== undefined ? dto.description : current.description;

    const res = await this.db.query(
      `
      UPDATE draft_rule_configs
      SET 
        is_enabled = $1,
        similarity_threshold = $2,
        rule_parameters = $3,
        description = $4,
        updated_by = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *;
    `,
      [isEnabled, similarity, params, desc, userId, id],
    );

    return res.rows[0];
  }
}
