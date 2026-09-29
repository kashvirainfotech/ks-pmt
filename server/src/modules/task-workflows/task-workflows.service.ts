import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateStatusDto } from './dto/create-status.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { CreateWorkflowTransitionDto } from './dto/create-workflow-transition.dto';
import {
  CloneWorkflowSchemeDto,
  ConfigureSchemeTransitionsDto,
  CreateWorkflowSchemeDto,
  PublishWorkflowSchemeDto,
  UpdateWorkflowSchemeDto,
} from './dto/workflow-scheme.dto';

@Injectable()
export class TaskWorkflowsService {
  constructor(private readonly db: DatabaseService) {}

  // ----------------------------------------------------
  // 1. Task Statuses Management
  // ----------------------------------------------------

  async createStatus(dto: CreateStatusDto, userId: string) {
    const checkQuery = `SELECT id FROM task_statuses WHERE status_code = $1;`;
    const checkResult = await this.db.query(checkQuery, [dto.statusCode]);
    if (checkResult.rowCount > 0) {
      throw new BadRequestException(`Status code '${dto.statusCode}' already exists.`);
    }

    const insertQuery = `
      INSERT INTO task_statuses (
        status_code, status_name, description, status_category,
        sequence_order, color_hex, is_terminal, is_active,
        created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8, $8)
      RETURNING *;
    `;
    const result = await this.db.query(insertQuery, [
      dto.statusCode,
      dto.statusName,
      dto.description || null,
      dto.statusCategory,
      dto.sequenceOrder || 1,
      dto.colorHex || '#6B7280',
      dto.isTerminal || false,
      userId,
    ]);

    return result.rows[0];
  }

  async findAllStatuses(includeInactive = false) {
    const query = `
      SELECT 
        ts.*,
        COUNT(DISTINCT t.id) AS current_tasks_count
      FROM task_statuses ts
      LEFT JOIN tasks t ON ts.id = t.status_id
      WHERE ($1::BOOLEAN = TRUE OR ts.is_active = TRUE)
      GROUP BY ts.id
      ORDER BY ts.sequence_order ASC;
    `;
    const result = await this.db.query(query, [includeInactive]);
    return result.rows;
  }

  async findOneStatus(id: string) {
    const query = `SELECT * FROM task_statuses WHERE id = $1;`;
    const result = await this.db.query(query, [id]);
    if (result.rowCount === 0) {
      throw new NotFoundException(`Task status with ID ${id} not found.`);
    }
    return result.rows[0];
  }

  async updateStatus(id: string, dto: UpdateStatusDto, userId: string) {
    await this.findOneStatus(id);

    const updateQuery = `
      UPDATE task_statuses SET
        status_name = COALESCE($1, status_name),
        description = COALESCE($2, description),
        status_category = COALESCE($3, status_category),
        sequence_order = COALESCE($4, sequence_order),
        color_hex = COALESCE($5, color_hex),
        is_terminal = COALESCE($6, is_terminal),
        is_active = COALESCE($7, is_active),
        updated_by = $8,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *;
    `;
    const result = await this.db.query(updateQuery, [
      dto.statusName,
      dto.description,
      dto.statusCategory,
      dto.sequenceOrder,
      dto.colorHex,
      dto.isTerminal,
      dto.isActive,
      userId,
      id,
    ]);

    return result.rows[0];
  }

  async toggleStatusActive(id: string, isActive: boolean, userId: string) {
    await this.findOneStatus(id);
    const query = `
      UPDATE task_statuses SET
        is_active = $1,
        updated_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *;
    `;
    const result = await this.db.query(query, [isActive, userId, id]);
    return result.rows[0];
  }

  // ----------------------------------------------------
  // 2. Global Workflow Transitions Management (Legacy Fallback)
  // ----------------------------------------------------

  async createTransition(dto: CreateWorkflowTransitionDto, userId: string) {
    if (dto.fromStatusId === dto.toStatusId) {
      throw new BadRequestException('from_status and to_status cannot be identical.');
    }

    const checkQuery = `
      SELECT id FROM task_type_workflow_statuses
      WHERE task_type_id = $1 AND from_status_id = $2 AND to_status_id = $3;
    `;
    const checkResult = await this.db.query(checkQuery, [
      dto.taskTypeId,
      dto.fromStatusId,
      dto.toStatusId,
    ]);
    if (checkResult.rowCount > 0) {
      throw new BadRequestException('This workflow transition is already defined.');
    }

    const insertQuery = `
      INSERT INTO task_type_workflow_statuses (
        task_type_id, from_status_id, to_status_id, is_active, created_by, updated_by
      ) VALUES ($1, $2, $3, TRUE, $4, $4)
      RETURNING *;
    `;
    const result = await this.db.query(insertQuery, [
      dto.taskTypeId,
      dto.fromStatusId,
      dto.toStatusId,
      userId,
    ]);

    return result.rows[0];
  }

  async findTransitionsByTaskType(taskTypeId: string) {
    const query = `
      SELECT 
        w.id,
        w.task_type_id,
        tt.type_name,
        w.from_status_id,
        fs.status_name AS from_status_name,
        fs.color_hex AS from_status_color,
        w.to_status_id,
        ts.status_name AS to_status_name,
        ts.color_hex AS to_status_color,
        ts.is_terminal AS to_status_is_terminal,
        w.is_active
      FROM task_type_workflow_statuses w
      INNER JOIN task_types tt ON w.task_type_id = tt.id
      INNER JOIN task_statuses fs ON w.from_status_id = fs.id
      INNER JOIN task_statuses ts ON w.to_status_id = ts.id
      WHERE w.task_type_id = $1 AND w.is_active = TRUE
      ORDER BY fs.sequence_order ASC, ts.sequence_order ASC;
    `;
    const result = await this.db.query(query, [taskTypeId]);
    return result.rows;
  }

  async deleteTransition(id: string) {
    const query = `
      DELETE FROM task_type_workflow_statuses
      WHERE id = $1
      RETURNING *;
    `;
    const result = await this.db.query(query, [id]);
    if (result.rowCount === 0) {
      throw new NotFoundException(`Transition with ID ${id} not found.`);
    }
    return { success: true };
  }

  // ----------------------------------------------------
  // 3. Workflow Schemes CRUD & Overrides (CONFIG-001)
  // ----------------------------------------------------

  async createScheme(dto: CreateWorkflowSchemeDto, userId: string) {
    // Validate scope consistency
    if (dto.scope === 'PROJECT' && !dto.projectId) {
      throw new BadRequestException('Project ID is required for PROJECT scope workflow scheme.');
    }
    if (dto.scope === 'PRODUCT' && !dto.productId) {
      throw new BadRequestException('Product ID is required for PRODUCT scope workflow scheme.');
    }
    if (dto.scope === 'GLOBAL' && (dto.projectId || dto.productId)) {
      throw new BadRequestException('Global workflow scheme cannot be tied to a project or product.');
    }

    const existing = await this.db.query(
      `SELECT id FROM workflow_schemes WHERE scheme_code = $1 AND version = 1;`,
      [dto.schemeCode],
    );
    if (existing.rowCount > 0) {
      throw new BadRequestException(`Scheme with code '${dto.schemeCode}' already exists.`);
    }

    const insertSql = `
      INSERT INTO workflow_schemes (
        scheme_code,
        scheme_name,
        description,
        scope,
        project_id,
        product_id,
        task_type_id,
        status,
        version,
        is_active,
        created_by,
        updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'DRAFT', 1, TRUE, $8, $8)
      RETURNING *;
    `;

    const res = await this.db.query(insertSql, [
      dto.schemeCode,
      dto.schemeName,
      dto.description || null,
      dto.scope,
      dto.projectId || null,
      dto.productId || null,
      dto.taskTypeId || null,
      userId,
    ]);

    return res.rows[0];
  }

  async getSchemes(filters: {
    scope?: string;
    projectId?: string;
    productId?: string;
    status?: string;
  }) {
    const conditions: string[] = ['ws.is_active = TRUE'];
    const params: any[] = [];

    if (filters.scope) {
      params.push(filters.scope);
      conditions.push(`ws.scope = $${params.length}`);
    }
    if (filters.projectId) {
      params.push(filters.projectId);
      conditions.push(`ws.project_id = $${params.length}`);
    }
    if (filters.productId) {
      params.push(filters.productId);
      conditions.push(`ws.product_id = $${params.length}`);
    }
    if (filters.status) {
      params.push(filters.status);
      conditions.push(`ws.status = $${params.length}`);
    }

    const query = `
      SELECT 
        ws.*,
        p.name AS project_name,
        pr.product_name,
        tt.type_name AS task_type_name,
        COUNT(DISTINCT wst.id)::int AS transitions_count
      FROM workflow_schemes ws
      LEFT JOIN projects p ON ws.project_id = p.id
      LEFT JOIN products pr ON ws.product_id = pr.id
      LEFT JOIN task_types tt ON ws.task_type_id = tt.id
      LEFT JOIN workflow_scheme_transitions wst ON ws.id = wst.scheme_id AND wst.is_active = TRUE
      WHERE ${conditions.join(' AND ')}
      GROUP BY ws.id, p.name, pr.product_name, tt.type_name
      ORDER BY ws.scope ASC, ws.created_at DESC;
    `;

    const res = await this.db.query(query, params);
    return res.rows;
  }

  async getSchemeById(id: string) {
    const schemeRes = await this.db.query(
      `
      SELECT 
        ws.*,
        p.name AS project_name,
        pr.product_name,
        tt.type_name AS task_type_name
      FROM workflow_schemes ws
      LEFT JOIN projects p ON ws.project_id = p.id
      LEFT JOIN products pr ON ws.product_id = pr.id
      LEFT JOIN task_types tt ON ws.task_type_id = tt.id
      WHERE ws.id = $1 AND ws.is_active = TRUE;
      `,
      [id],
    );

    if (schemeRes.rowCount === 0) {
      throw new NotFoundException(`Workflow scheme with ID '${id}' not found.`);
    }

    const scheme = schemeRes.rows[0];

    // Fetch transitions
    const transRes = await this.db.query(
      `
      SELECT 
        wst.*,
        fs.status_code AS from_status_code,
        fs.status_name AS from_status_name,
        fs.color_hex AS from_status_color,
        fs.status_category AS from_status_category,
        ts.status_code AS to_status_code,
        ts.status_name AS to_status_name,
        ts.color_hex AS to_status_color,
        ts.status_category AS to_status_category,
        ts.is_terminal AS to_status_is_terminal
      FROM workflow_scheme_transitions wst
      JOIN task_statuses fs ON wst.from_status_id = fs.id
      JOIN task_statuses ts ON wst.to_status_id = ts.id
      WHERE wst.scheme_id = $1 AND wst.is_active = TRUE
      ORDER BY fs.sequence_order ASC, ts.sequence_order ASC;
      `,
      [id],
    );

    return {
      ...scheme,
      transitions: transRes.rows,
    };
  }

  async updateScheme(id: string, dto: UpdateWorkflowSchemeDto, userId: string) {
    await this.getSchemeById(id);

    const query = `
      UPDATE workflow_schemes
      SET
        scheme_name = COALESCE($1, scheme_name),
        description = COALESCE($2, description),
        updated_by = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *;
    `;

    const res = await this.db.query(query, [dto.schemeName, dto.description, userId, id]);
    return res.rows[0];
  }

  async configureSchemeTransitions(
    schemeId: string,
    dto: ConfigureSchemeTransitionsDto,
    userId: string,
  ) {
    const scheme = await this.getSchemeById(schemeId);
    if (scheme.status === 'ARCHIVED') {
      throw new BadRequestException('Cannot configure transitions on an ARCHIVED workflow scheme.');
    }

    // Atomic replacement of transitions for this scheme
    return this.db.transaction(async (client) => {
      // Delete existing
      await client.query(
        `DELETE FROM workflow_scheme_transitions WHERE scheme_id = $1;`,
        [schemeId],
      );

      // Insert new transitions
      for (const t of dto.transitions) {
        if (t.fromStatusId === t.toStatusId) {
          throw new BadRequestException('Self-transitions are not allowed.');
        }

        const insertSql = `
          INSERT INTO workflow_scheme_transitions (
            scheme_id,
            from_status_id,
            to_status_id,
            allowed_roles,
            required_fields,
            requires_release_association,
            requires_qa_signoff,
            requires_resolution,
            manual_gate_name,
            transition_notes_prompt,
            is_active,
            created_by,
            updated_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, $11, $11);
        `;

        await client.query(insertSql, [
          schemeId,
          t.fromStatusId,
          t.toStatusId,
          JSON.stringify(t.allowedRoles || []),
          JSON.stringify(t.requiredFields || []),
          t.requiresReleaseAssociation ?? false,
          t.requiresQaSignoff ?? false,
          t.requiresResolution ?? false,
          t.manualGateName || null,
          t.transitionNotesPrompt || null,
          userId,
        ]);
      }

      return this.getSchemeById(schemeId);
    });
  }

  // ----------------------------------------------------
  // 4. Graph Soundness Validation & Draft Preview (CONFIG-001)
  // ----------------------------------------------------

  async validateWorkflowDraft(schemeId: string) {
    const scheme = await this.getSchemeById(schemeId);
    const transitions = scheme.transitions || [];

    const errors: string[] = [];
    const warnings: string[] = [];

    if (transitions.length === 0) {
      errors.push('Workflow scheme has no transitions configured.');
      return {
        isValid: false,
        errors,
        warnings,
        totalTransitions: 0,
        statusCount: 0,
      };
    }

    const uniqueStatusIds = new Set<string>();
    const inDegree: Record<string, number> = {};
    const outDegree: Record<string, number> = {};
    const statusMap: Record<string, any> = {};

    for (const t of transitions) {
      uniqueStatusIds.add(t.from_status_id);
      uniqueStatusIds.add(t.to_status_id);

      inDegree[t.to_status_id] = (inDegree[t.to_status_id] || 0) + 1;
      outDegree[t.from_status_id] = (outDegree[t.from_status_id] || 0) + 1;

      statusMap[t.from_status_id] = {
        name: t.from_status_name,
        category: t.from_status_category,
        isTerminal: false,
      };
      statusMap[t.to_status_id] = {
        name: t.to_status_name,
        category: t.to_status_category,
        isTerminal: t.to_status_is_terminal,
      };
    }

    // Identify start/initial states (status_category = 'TODO' or in-degree = 0)
    let hasInitialState = false;
    let hasTerminalState = false;

    for (const statusId of uniqueStatusIds) {
      const info = statusMap[statusId];
      const incoming = inDegree[statusId] || 0;
      const outgoing = outDegree[statusId] || 0;

      if (info.category === 'TODO' || incoming === 0) {
        hasInitialState = true;
      }

      if (info.isTerminal) {
        hasTerminalState = true;
      }

      // Check for unreachable states (not TODO and incoming = 0)
      if (incoming === 0 && info.category !== 'TODO') {
        warnings.push(
          `Status '${info.name}' has no incoming transitions and is not a 'TODO' initial state (may be unreachable).`,
        );
      }

      // Check for dead-end non-terminal states
      if (outgoing === 0 && !info.isTerminal) {
        errors.push(
          `Status '${info.name}' is a dead-end with no outgoing transitions, but is not marked as a terminal/closed status.`,
        );
      }
    }

    if (!hasInitialState) {
      errors.push('Workflow must contain at least one initial or TODO status.');
    }

    if (!hasTerminalState) {
      warnings.push('Workflow does not contain any terminal status (e.g. Closed or Cancelled).');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      totalTransitions: transitions.length,
      statusCount: uniqueStatusIds.size,
      statusList: Object.entries(statusMap).map(([id, info]) => ({
        id,
        name: info.name,
        category: info.category,
        isTerminal: info.isTerminal,
      })),
    };
  }

  // ----------------------------------------------------
  // 5. Publish Scheme with Safe Active Task Remapping (CONFIG-001)
  // ----------------------------------------------------

  async publishWorkflowScheme(
    schemeId: string,
    dto: PublishWorkflowSchemeDto,
    userId: string,
  ) {
    const scheme = await this.getSchemeById(schemeId);

    // 1. Run graph validation
    const validation = await this.validateWorkflowDraft(schemeId);
    if (!validation.isValid) {
      throw new BadRequestException(
        `Cannot publish invalid workflow scheme: ${validation.errors.join('; ')}`,
      );
    }

    // 2. Identify active scheme statuses
    const newStatusIds = new Set<string>();
    for (const t of scheme.transitions) {
      newStatusIds.add(t.from_status_id);
      newStatusIds.add(t.to_status_id);
    }

    return this.db.transaction(async (client) => {
      // 3. If project or product override, check for stranded active tasks
      if (scheme.scope === 'PROJECT' && scheme.project_id) {
        const tasksQuery = `
          SELECT DISTINCT t.status_id, ts.status_name, COUNT(t.id)::int AS task_count
          FROM tasks t
          JOIN task_statuses ts ON t.status_id = ts.id
          WHERE t.project_id = $1 AND t.is_active = TRUE
          GROUP BY t.status_id, ts.status_name;
        `;
        const taskStatusesRes = await client.query(tasksQuery, [scheme.project_id]);

        const unmappedDeprecatedStatuses: Array<{ id: string; name: string; count: number }> = [];

        for (const row of taskStatusesRes.rows) {
          if (!newStatusIds.has(row.status_id)) {
            // This status is deprecated in the new scheme!
            const targetStatusId = dto.activeTaskRemapping?.[row.status_id];
            if (!targetStatusId || !newStatusIds.has(targetStatusId)) {
              unmappedDeprecatedStatuses.push({
                id: row.status_id,
                name: row.status_name,
                count: row.task_count,
              });
            } else {
              // Remap active tasks to the chosen target status
              await client.query(
                `
                UPDATE tasks 
                SET status_id = $1, revision = revision + 1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
                WHERE project_id = $3 AND status_id = $4 AND is_active = TRUE;
                `,
                [targetStatusId, userId, scheme.project_id, row.status_id],
              );
            }
          }
        }

        if (unmappedDeprecatedStatuses.length > 0) {
          const detail = unmappedDeprecatedStatuses
            .map((s) => `'${s.name}' (${s.count} active tasks)`)
            .join(', ');
          throw new BadRequestException(
            `Cannot publish workflow: active tasks exist in deprecated statuses that must be remapped before publishing. Missing remapping for: ${detail}`,
          );
        }
      }

      // 4. Archive any previously published scheme for the same exact scope
      const archiveSql = `
        UPDATE workflow_schemes
        SET status = 'ARCHIVED', updated_by = $1, updated_at = CURRENT_TIMESTAMP
        WHERE scope = $2 
          AND COALESCE(project_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE($3, '00000000-0000-0000-0000-000000000000'::uuid)
          AND COALESCE(product_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE($4, '00000000-0000-0000-0000-000000000000'::uuid)
          AND COALESCE(task_type_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE($5, '00000000-0000-0000-0000-000000000000'::uuid)
          AND status = 'PUBLISHED';
      `;
      await client.query(archiveSql, [
        userId,
        scheme.scope,
        scheme.project_id || null,
        scheme.product_id || null,
        scheme.task_type_id || null,
      ]);

      // 5. Mark this scheme as PUBLISHED
      const publishSql = `
        UPDATE workflow_schemes
        SET status = 'PUBLISHED', updated_by = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *;
      `;
      const res = await client.query(publishSql, [userId, schemeId]);
      return res.rows[0];
    });
  }

  // ----------------------------------------------------
  // 6. Clone Workflow Scheme (e.g. clone global default into project)
  // ----------------------------------------------------

  async cloneScheme(sourceSchemeId: string, dto: CloneWorkflowSchemeDto, userId: string) {
    const source = await this.getSchemeById(sourceSchemeId);

    return this.db.transaction(async (client) => {
      const insertSchemeSql = `
        INSERT INTO workflow_schemes (
          scheme_code,
          scheme_name,
          description,
          scope,
          project_id,
          product_id,
          task_type_id,
          status,
          version,
          is_active,
          created_by,
          updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'DRAFT', 1, TRUE, $8, $8)
        RETURNING *;
      `;

      const newSchemeRes = await client.query(insertSchemeSql, [
        dto.newSchemeCode,
        dto.newSchemeName,
        `Cloned from ${source.scheme_name} (${source.scheme_code})`,
        dto.targetScope,
        dto.targetProjectId || null,
        dto.targetProductId || null,
        source.task_type_id || null,
        userId,
      ]);

      const newSchemeId = newSchemeRes.rows[0].id;

      // Copy transitions
      for (const t of source.transitions || []) {
        const insertTransSql = `
          INSERT INTO workflow_scheme_transitions (
            scheme_id,
            from_status_id,
            to_status_id,
            allowed_roles,
            required_fields,
            requires_release_association,
            requires_qa_signoff,
            requires_resolution,
            manual_gate_name,
            transition_notes_prompt,
            is_active,
            created_by,
            updated_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, $11, $11);
        `;

        await client.query(insertTransSql, [
          newSchemeId,
          t.from_status_id,
          t.to_status_id,
          JSON.stringify(t.allowed_roles || []),
          JSON.stringify(t.required_fields || []),
          t.requires_release_association || false,
          t.requires_qa_signoff || false,
          t.requires_resolution || false,
          t.manual_gate_name || null,
          t.transition_notes_prompt || null,
          userId,
        ]);
      }

      return this.getSchemeById(newSchemeId);
    });
  }

  // ----------------------------------------------------
  // 7. Effective Workflow Resolution & Allowed Next Statuses
  // ----------------------------------------------------

  async getEffectiveWorkflow(params: {
    projectId?: string;
    productId?: string;
    taskTypeId: string;
  }) {
    // 1. Check Project Override
    if (params.projectId) {
      const projRes = await this.db.query(
        `
        SELECT * FROM workflow_schemes
        WHERE scope = 'PROJECT' AND project_id = $1 AND status = 'PUBLISHED' AND is_active = TRUE
          AND (task_type_id = $2 OR task_type_id IS NULL)
        ORDER BY task_type_id DESC NULLS LAST
        LIMIT 1;
        `,
        [params.projectId, params.taskTypeId],
      );

      if (projRes.rowCount > 0) {
        const scheme = await this.getSchemeById(projRes.rows[0].id);
        return {
          scheme,
          effectiveSource: 'PROJECT_OVERRIDE',
        };
      }
    }

    // 2. Check Product Override
    if (params.productId) {
      const prodRes = await this.db.query(
        `
        SELECT * FROM workflow_schemes
        WHERE scope = 'PRODUCT' AND product_id = $1 AND status = 'PUBLISHED' AND is_active = TRUE
          AND (task_type_id = $2 OR task_type_id IS NULL)
        ORDER BY task_type_id DESC NULLS LAST
        LIMIT 1;
        `,
        [params.productId, params.taskTypeId],
      );

      if (prodRes.rowCount > 0) {
        const scheme = await this.getSchemeById(prodRes.rows[0].id);
        return {
          scheme,
          effectiveSource: 'PRODUCT_OVERRIDE',
        };
      }
    }

    // 3. Check Global Published Scheme
    const globalRes = await this.db.query(
      `
      SELECT * FROM workflow_schemes
      WHERE scope = 'GLOBAL' AND status = 'PUBLISHED' AND is_active = TRUE
        AND (task_type_id = $1 OR task_type_id IS NULL)
      ORDER BY task_type_id DESC NULLS LAST
      LIMIT 1;
      `,
      [params.taskTypeId],
    );

    if (globalRes.rowCount > 0) {
      const scheme = await this.getSchemeById(globalRes.rows[0].id);
      return {
        scheme,
        effectiveSource: 'GLOBAL_DEFAULT',
      };
    }

    // 4. Default System Fallback to task_type_workflow_statuses
    return {
      scheme: null,
      effectiveSource: 'GLOBAL_SYSTEM_FALLBACK',
    };
  }

  async getAllowedNextStatuses(
    taskTypeId: string,
    fromStatusId: string,
    projectId?: string,
    productId?: string,
    userRole?: string,
  ) {
    const effective = await this.getEffectiveWorkflow({
      projectId,
      productId,
      taskTypeId,
    });

    if (effective.scheme) {
      // Filter transitions for fromStatusId
      const matchingTransitions = (effective.scheme.transitions || []).filter(
        (t: any) => t.from_status_id === fromStatusId,
      );

      return matchingTransitions.map((t: any) => ({
        id: t.to_status_id,
        status_code: t.to_status_code,
        status_name: t.to_status_name,
        status_category: t.to_status_category,
        color_hex: t.to_status_color,
        is_terminal: t.to_status_is_terminal,
        gateRules: {
          allowedRoles: t.allowed_roles || [],
          requiredFields: t.required_fields || [],
          requiresReleaseAssociation: t.requires_release_association,
          requiresQaSignoff: t.requires_qa_signoff,
          requiresResolution: t.requires_resolution,
          manualGateName: t.manual_gate_name,
          transitionNotesPrompt: t.transition_notes_prompt,
        },
        effectiveSource: effective.effectiveSource,
        schemeName: effective.scheme.scheme_name,
      }));
    }

    // Fallback to global table
    const query = `
      SELECT 
        ts.id,
        ts.status_code,
        ts.status_name,
        ts.status_category,
        ts.sequence_order,
        ts.color_hex,
        ts.is_terminal
      FROM task_type_workflow_statuses w
      INNER JOIN task_statuses ts ON w.to_status_id = ts.id
      WHERE w.task_type_id = $1 
        AND w.from_status_id = $2 
        AND w.is_active = TRUE 
        AND ts.is_active = TRUE
      ORDER BY ts.sequence_order ASC;
    `;
    const result = await this.db.query(query, [taskTypeId, fromStatusId]);
    return result.rows.map((r) => ({
      ...r,
      gateRules: null,
      effectiveSource: 'GLOBAL_SYSTEM_FALLBACK',
    }));
  }

  // ----------------------------------------------------
  // 8. Gate Rule Validation for Task Status Transition (CONFIG-001)
  // ----------------------------------------------------

  async validateTransition(
    task: any,
    toStatusId: string,
    user: any,
    payload: any = {},
  ) {
    const allowed = await this.getAllowedNextStatuses(
      task.task_type_id,
      task.status_id,
      task.project_id,
      task.product_id,
      user?.role_code,
    );

    const target = allowed.find((s) => s.id === toStatusId);
    if (!target) {
      const allowedNames = allowed.map((s) => s.status_name).join(', ') || 'None';
      throw new BadRequestException(
        `Invalid status transition from '${task.status_name || task.status_id}'. Allowed next status(es): [${allowedNames}]`,
      );
    }

    const failedGates: string[] = [];

    if (target.gateRules) {
      const rules = target.gateRules;

      // 1. Role validation (Super Admin always bypasses role restriction)
      if (
        rules.allowedRoles &&
        rules.allowedRoles.length > 0 &&
        user?.role_code !== 'ROLE_SUPER_ADMIN'
      ) {
        if (!rules.allowedRoles.includes(user?.role_code)) {
          failedGates.push(
            `Role '${user?.role_name || user?.role_code}' is not authorized to execute this transition. Permitted roles: [${rules.allowedRoles.join(', ')}]`,
          );
        }
      }

      // 2. Required fields validation
      if (rules.requiredFields && rules.requiredFields.length > 0) {
        for (const field of rules.requiredFields) {
          const val = payload[field] ?? task[field] ?? task.custom_field_values?.[field];
          if (val === undefined || val === null || val === '') {
            failedGates.push(`Field '${field}' is required to transition to '${target.status_name}'.`);
          }
        }
      }

      // 3. Release association validation
      if (rules.requiresReleaseAssociation) {
        const versionId = payload.versionId ?? task.version_id;
        if (!versionId) {
          failedGates.push(
            `A target release/version must be assigned before transitioning to '${target.status_name}'.`,
          );
        }
      }

      // 4. Resolution validation
      if (rules.requiresResolution) {
        const resolution = payload.resolution ?? task.resolution;
        if (!resolution) {
          failedGates.push(
            `Resolution classification is required before transitioning to '${target.status_name}'.`,
          );
        }
      }
    }

    if (failedGates.length > 0) {
      throw new BadRequestException({
        message: `Workflow transition gate requirements not met: ${failedGates.join('; ')}`,
        failedGates,
        targetStatus: target.status_name,
        gateName: target.gateRules?.manualGateName || null,
      });
    }

    return {
      isValid: true,
      targetStatus: target,
    };
  }
}
