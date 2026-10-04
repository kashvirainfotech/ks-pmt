import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  CreateTestSuiteDto,
  UpdateTestSuiteDto,
} from './dto/create-test-suite.dto';
import {
  CreateTestCaseDto,
  UpdateTestCaseDto,
} from './dto/create-test-case.dto';
import {
  CreateTestRunDto,
  UpdateTestRunDto,
} from './dto/create-test-run.dto';
import {
  ExecuteTestRunItemDto,
  LogDefectFromRunItemDto,
} from './dto/execute-test-run-item.dto';
import {
  CreateReleaseChecklistDto,
} from './dto/create-release-checklist.dto';
import {
  SignoffChecklistDto,
  UpdateChecklistItemDto,
} from './dto/signoff-checklist.dto';
import {
  QueryReleaseChecklistsDto,
  QueryTestCasesDto,
  QueryTestRunsDto,
  QueryTestSuitesDto,
} from './dto/query-qa.dto';
import {
  CreateQaEnvironmentDto,
  UpdateQaEnvironmentDto,
} from './dto/create-qa-environment.dto';
import { CreateIssueObservationDto } from './dto/create-issue-observation.dto';
import {
  QueryQaEnvironmentsDto,
  QueryIssueObservationsDto,
} from './dto/query-qa-environments.dto';

@Injectable()
export class QaService {
  constructor(private readonly db: DatabaseService) {}

  // ========================================================
  // 1. Test Suites Management
  // ========================================================

  async createTestSuite(dto: CreateTestSuiteDto, userId: string) {
    if (
      (dto.entityType === 'PRODUCT' && (!dto.productId || dto.projectId)) ||
      (dto.entityType === 'PROJECT' && (!dto.projectId || dto.productId))
    ) {
      throw new BadRequestException(
        'For entityType PRODUCT, productId must be provided and projectId must be null. For PROJECT, projectId must be provided and productId must be null.',
      );
    }

    const suiteCode =
      dto.suiteCode || `SUITE-${Date.now().toString().slice(-6)}`;

    const res = await this.db.query(
      `INSERT INTO test_suites (
        suite_code, suite_name, description, entity_type, product_id, project_id,
        component_id, is_active, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8, $8)
      RETURNING *`,
      [
        suiteCode,
        dto.suiteName,
        dto.description || null,
        dto.entityType,
        dto.productId || null,
        dto.projectId || null,
        dto.componentId || null,
        userId,
      ],
    );

    return res.rows[0];
  }

  async getTestSuites(query: QueryTestSuitesDto) {
    const params: any[] = [];
    const where: string[] = ['ts.is_active = TRUE'];

    if (query.entityType) {
      params.push(query.entityType);
      where.push(`ts.entity_type = $${params.length}`);
    }
    if (query.productId) {
      params.push(query.productId);
      where.push(`ts.product_id = $${params.length}`);
    }
    if (query.projectId) {
      params.push(query.projectId);
      where.push(`ts.project_id = $${params.length}`);
    }
    if (query.search) {
      params.push(`%${query.search}%`);
      where.push(
        `(ts.suite_code ILIKE $${params.length} OR ts.suite_name ILIKE $${params.length} OR ts.description ILIKE $${params.length})`,
      );
    }

    const res = await this.db.query(
      `SELECT
        ts.*,
        p.project_name,
        pr.product_name,
        sc.component_name,
        COUNT(tc.id) FILTER (WHERE tc.is_active = TRUE)::INTEGER AS total_cases_count
      FROM test_suites ts
      LEFT JOIN projects p ON ts.project_id = p.id
      LEFT JOIN products pr ON ts.product_id = pr.id
      LEFT JOIN software_components sc ON ts.component_id = sc.id
      LEFT JOIN test_cases tc ON ts.id = tc.suite_id
      WHERE ${where.join(' AND ')}
      GROUP BY ts.id, p.project_name, pr.product_name, sc.component_name
      ORDER BY ts.created_at DESC`,
      params,
    );

    return res.rows;
  }

  async getTestSuiteById(id: string) {
    const suiteRes = await this.db.query(
      `SELECT
        ts.*,
        p.project_name,
        pr.product_name,
        sc.component_name
      FROM test_suites ts
      LEFT JOIN projects p ON ts.project_id = p.id
      LEFT JOIN products pr ON ts.product_id = pr.id
      LEFT JOIN software_components sc ON ts.component_id = sc.id
      WHERE ts.id = $1 AND ts.is_active = TRUE`,
      [id],
    );

    if (suiteRes.rowCount === 0) {
      throw new NotFoundException(`Test Suite with ID ${id} not found`);
    }

    const casesRes = await this.db.query(
      `SELECT * FROM test_cases WHERE suite_id = $1 AND is_active = TRUE ORDER BY created_at ASC`,
      [id],
    );

    return {
      ...suiteRes.rows[0],
      testCases: casesRes.rows,
    };
  }

  async updateTestSuite(id: string, dto: UpdateTestSuiteDto, userId: string) {
    const existing = await this.db.query(
      `SELECT id FROM test_suites WHERE id = $1 AND is_active = TRUE`,
      [id],
    );
    if (existing.rowCount === 0) {
      throw new NotFoundException(`Test Suite with ID ${id} not found`);
    }

    const res = await this.db.query(
      `UPDATE test_suites
       SET
         suite_name = COALESCE($2, suite_name),
         description = COALESCE($3, description),
         component_id = COALESCE($4, component_id),
         updated_by = $5,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, dto.suiteName || null, dto.description || null, dto.componentId || null, userId],
    );

    return res.rows[0];
  }

  async deleteTestSuite(id: string, userId: string) {
    const res = await this.db.query(
      `UPDATE test_suites
       SET is_active = FALSE, updated_by = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND is_active = TRUE
       RETURNING id`,
      [id, userId],
    );
    if (res.rowCount === 0) {
      throw new NotFoundException(`Test Suite with ID ${id} not found`);
    }
    return { success: true, message: 'Test Suite deleted successfully' };
  }

  // ========================================================
  // 2. Test Cases Management
  // ========================================================

  async createTestCase(dto: CreateTestCaseDto, userId: string) {
    const suite = await this.db.query(
      `SELECT id, entity_type, product_id, project_id FROM test_suites WHERE id = $1 AND is_active = TRUE`,
      [dto.suiteId],
    );
    if (suite.rowCount === 0) {
      throw new NotFoundException(`Test Suite with ID ${dto.suiteId} not found`);
    }

    const caseCode =
      dto.caseCode || `TC-${Date.now().toString().slice(-6)}`;

    const res = await this.db.query(
      `INSERT INTO test_cases (
        case_code, suite_id, title, description, preconditions,
        test_steps, expected_result, severity, priority, execution_type,
        estimated_minutes, requirement_criterion_id, component_id,
        version, is_active, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12, $13, 1, TRUE, $14, $14)
      RETURNING *`,
      [
        caseCode,
        dto.suiteId,
        dto.title,
        dto.description || null,
        dto.preconditions || null,
        JSON.stringify(dto.testSteps || []),
        dto.expectedResult,
        dto.severity || 'MAJOR',
        dto.priority || 'MEDIUM',
        dto.executionType || 'MANUAL',
        dto.estimatedMinutes || 15,
        dto.requirementCriterionId || null,
        dto.componentId || null,
        userId,
      ],
    );

    return res.rows[0];
  }

  async getTestCases(query: QueryTestCasesDto) {
    const params: any[] = [];
    const where: string[] = ['tc.is_active = TRUE'];

    if (query.suiteId) {
      params.push(query.suiteId);
      where.push(`tc.suite_id = $${params.length}`);
    }
    if (query.productId) {
      params.push(query.productId);
      where.push(`ts.product_id = $${params.length}`);
    }
    if (query.projectId) {
      params.push(query.projectId);
      where.push(`ts.project_id = $${params.length}`);
    }
    if (query.severity) {
      params.push(query.severity);
      where.push(`tc.severity = $${params.length}`);
    }
    if (query.priority) {
      params.push(query.priority);
      where.push(`tc.priority = $${params.length}`);
    }
    if (query.executionType) {
      params.push(query.executionType);
      where.push(`tc.execution_type = $${params.length}`);
    }
    if (query.search) {
      params.push(`%${query.search}%`);
      where.push(
        `(tc.case_code ILIKE $${params.length} OR tc.title ILIKE $${params.length} OR tc.description ILIKE $${params.length})`,
      );
    }

    const page = query.page || 1;
    const limit = query.limit || 50;
    const offset = (page - 1) * limit;

    const countRes = await this.db.query(
      `SELECT COUNT(*)::INTEGER AS total
       FROM test_cases tc
       INNER JOIN test_suites ts ON tc.suite_id = ts.id
       WHERE ${where.join(' AND ')}`,
      params,
    );

    const total = countRes.rows[0]?.total || 0;

    params.push(limit, offset);
    const dataRes = await this.db.query(
      `SELECT
        tc.*,
        ts.suite_code,
        ts.suite_name,
        ts.entity_type,
        ts.product_id,
        ts.project_id,
        sc.component_name,
        rac.criterion_code,
        rac.title AS criterion_title
       FROM test_cases tc
       INNER JOIN test_suites ts ON tc.suite_id = ts.id
       LEFT JOIN software_components sc ON tc.component_id = sc.id
       LEFT JOIN requirement_acceptance_criteria rac ON tc.requirement_criterion_id = rac.id
       WHERE ${where.join(' AND ')}
       ORDER BY tc.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return {
      items: dataRes.rows,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTestCaseById(id: string) {
    const caseRes = await this.db.query(
      `SELECT
        tc.*,
        ts.suite_code,
        ts.suite_name,
        ts.entity_type,
        ts.product_id,
        ts.project_id,
        p.project_name,
        pr.product_name,
        sc.component_name,
        rac.criterion_code,
        rac.title AS criterion_title
       FROM test_cases tc
       INNER JOIN test_suites ts ON tc.suite_id = ts.id
       LEFT JOIN projects p ON ts.project_id = p.id
       LEFT JOIN products pr ON ts.product_id = pr.id
       LEFT JOIN software_components sc ON tc.component_id = sc.id
       LEFT JOIN requirement_acceptance_criteria rac ON tc.requirement_criterion_id = rac.id
       WHERE tc.id = $1 AND tc.is_active = TRUE`,
      [id],
    );

    if (caseRes.rowCount === 0) {
      throw new NotFoundException(`Test Case with ID ${id} not found`);
    }

    // Include recent run executions
    const runsRes = await this.db.query(
      `SELECT
        tri.id AS run_item_id,
        tri.status,
        tri.actual_result,
        tri.execution_notes,
        tri.executed_at,
        u.first_name || ' ' || u.last_name AS executed_by_name,
        tr.id AS test_run_id,
        tr.run_code,
        tr.title AS test_run_title,
        tr.environment
       FROM test_run_items tri
       INNER JOIN test_runs tr ON tri.test_run_id = tr.id
       LEFT JOIN users u ON tri.executed_by_user_id = u.id
       WHERE tri.test_case_id = $1 AND tri.is_active = TRUE
       ORDER BY tri.executed_at DESC NULLS LAST, tri.created_at DESC
       LIMIT 10`,
      [id],
    );

    return {
      ...caseRes.rows[0],
      recentExecutions: runsRes.rows,
    };
  }

  async updateTestCase(id: string, dto: UpdateTestCaseDto, userId: string) {
    const existing = await this.db.query(
      `SELECT * FROM test_cases WHERE id = $1 AND is_active = TRUE`,
      [id],
    );
    if (existing.rowCount === 0) {
      throw new NotFoundException(`Test Case with ID ${id} not found`);
    }

    const cur = existing.rows[0];

    const res = await this.db.query(
      `UPDATE test_cases
       SET
         suite_id = COALESCE($2, suite_id),
         title = COALESCE($3, title),
         description = COALESCE($4, description),
         preconditions = COALESCE($5, preconditions),
         test_steps = CASE WHEN $6::jsonb IS NOT NULL THEN $6::jsonb ELSE test_steps END,
         expected_result = COALESCE($7, expected_result),
         severity = COALESCE($8, severity),
         priority = COALESCE($9, priority),
         execution_type = COALESCE($10, execution_type),
         estimated_minutes = COALESCE($11, estimated_minutes),
         requirement_criterion_id = COALESCE($12, requirement_criterion_id),
         component_id = COALESCE($13, component_id),
         version = version + 1,
         updated_by = $14,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [
        id,
        dto.suiteId || null,
        dto.title || null,
        dto.description || null,
        dto.preconditions || null,
        dto.testSteps ? JSON.stringify(dto.testSteps) : null,
        dto.expectedResult || null,
        dto.severity || null,
        dto.priority || null,
        dto.executionType || null,
        dto.estimatedMinutes || null,
        dto.requirementCriterionId || null,
        dto.componentId || null,
        userId,
      ],
    );

    return res.rows[0];
  }

  async deleteTestCase(id: string, userId: string) {
    const res = await this.db.query(
      `UPDATE test_cases
       SET is_active = FALSE, updated_by = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND is_active = TRUE
       RETURNING id`,
      [id, userId],
    );
    if (res.rowCount === 0) {
      throw new NotFoundException(`Test Case with ID ${id} not found`);
    }
    return { success: true, message: 'Test Case deleted successfully' };
  }

  // ========================================================
  // 3. Test Runs Management & Execution
  // ========================================================

  async createTestRun(dto: CreateTestRunDto, userId: string) {
    if (
      (dto.entityType === 'PRODUCT' && (!dto.productId || dto.projectId)) ||
      (dto.entityType === 'PROJECT' && (!dto.projectId || dto.productId))
    ) {
      throw new BadRequestException(
        'For entityType PRODUCT, productId must be provided and projectId must be null. For PROJECT, projectId must be provided and productId must be null.',
      );
    }

    const runCode = dto.runCode || `TRUN-${Date.now().toString().slice(-6)}`;

    return this.db.transaction(async (client) => {
      // 1. Determine test cases to include
      let targetCaseIds: string[] = [];

      if (dto.testCaseIds && dto.testCaseIds.length > 0) {
        targetCaseIds = [...new Set(dto.testCaseIds)];
      }

      if (dto.testSuiteIds && dto.testSuiteIds.length > 0) {
        const suiteCases = await client.query(
          `SELECT id FROM test_cases WHERE suite_id = ANY($1) AND is_active = TRUE`,
          [dto.testSuiteIds],
        );
        const suiteCaseIds = suiteCases.rows.map((r: any) => r.id);
        targetCaseIds = [...new Set([...targetCaseIds, ...suiteCaseIds])];
      }

      const totalCases = targetCaseIds.length;

      // 2. Insert Test Run
      const runRes = await client.query(
        `INSERT INTO test_runs (
          run_code, title, description, entity_type, product_id, project_id,
          version_id, milestone_id, environment, status, assigned_to_user_id,
          total_cases, passed_cases, failed_cases, blocked_cases, skipped_cases,
          started_at, is_active, created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, 'PLANNED', $10,
          $11, 0, 0, 0, 0,
          NULL, TRUE, $12, $12
        ) RETURNING *`,
        [
          runCode,
          dto.title,
          dto.description || null,
          dto.entityType,
          dto.productId || null,
          dto.projectId || null,
          dto.versionId || null,
          dto.milestoneId || null,
          dto.environment || 'STAGING',
          dto.assignedToUserId || null,
          totalCases,
          userId,
        ],
      );

      const run = runRes.rows[0];

      // 3. Create initial test_run_items
      for (const caseId of targetCaseIds) {
        await client.query(
          `INSERT INTO test_run_items (
            test_run_id, test_case_id, status, is_active, created_by, updated_by
          ) VALUES ($1, $2, 'PENDING', TRUE, $3, $3)
          ON CONFLICT (test_run_id, test_case_id) DO NOTHING`,
          [run.id, caseId, userId],
        );
      }

      return run;
    });
  }

  async getTestRuns(query: QueryTestRunsDto) {
    const params: any[] = [];
    const where: string[] = ['tr.is_active = TRUE'];

    if (query.entityType) {
      params.push(query.entityType);
      where.push(`tr.entity_type = $${params.length}`);
    }
    if (query.productId) {
      params.push(query.productId);
      where.push(`tr.product_id = $${params.length}`);
    }
    if (query.projectId) {
      params.push(query.projectId);
      where.push(`tr.project_id = $${params.length}`);
    }
    if (query.versionId) {
      params.push(query.versionId);
      where.push(`tr.version_id = $${params.length}`);
    }
    if (query.milestoneId) {
      params.push(query.milestoneId);
      where.push(`tr.milestone_id = $${params.length}`);
    }
    if (query.environment) {
      params.push(query.environment);
      where.push(`tr.environment = $${params.length}`);
    }
    if (query.status) {
      params.push(query.status);
      where.push(`tr.status = $${params.length}`);
    }

    const res = await this.db.query(
      `SELECT
        tr.*,
        p.project_name,
        pr.product_name,
        v.version_name,
        m.milestone_name,
        u.first_name || ' ' || u.last_name AS assignee_name,
        CASE
          WHEN tr.total_cases > 0 THEN ROUND((tr.passed_cases::DECIMAL / tr.total_cases::DECIMAL) * 100, 1)
          ELSE 0.0
        END AS pass_rate_percentage
      FROM test_runs tr
      LEFT JOIN projects p ON tr.project_id = p.id
      LEFT JOIN products pr ON tr.product_id = pr.id
      LEFT JOIN versions v ON tr.version_id = v.id
      LEFT JOIN milestones m ON tr.milestone_id = m.id
      LEFT JOIN users u ON tr.assigned_to_user_id = u.id
      WHERE ${where.join(' AND ')}
      ORDER BY tr.created_at DESC`,
      params,
    );

    return res.rows;
  }

  async getTestRunById(id: string) {
    const runRes = await this.db.query(
      `SELECT
        tr.*,
        p.project_name,
        pr.product_name,
        v.version_name,
        m.milestone_name,
        u.first_name || ' ' || u.last_name AS assignee_name
      FROM test_runs tr
      LEFT JOIN projects p ON tr.project_id = p.id
      LEFT JOIN products pr ON tr.product_id = pr.id
      LEFT JOIN versions v ON tr.version_id = v.id
      LEFT JOIN milestones m ON tr.milestone_id = m.id
      LEFT JOIN users u ON tr.assigned_to_user_id = u.id
      WHERE tr.id = $1 AND tr.is_active = TRUE`,
      [id],
    );

    if (runRes.rowCount === 0) {
      throw new NotFoundException(`Test Run with ID ${id} not found`);
    }

    const itemsRes = await this.db.query(
      `SELECT
        tri.*,
        tc.case_code,
        tc.title AS case_title,
        tc.severity,
        tc.priority,
        tc.execution_type,
        tc.preconditions,
        tc.test_steps,
        tc.expected_result,
        ts.suite_name,
        exec_u.first_name || ' ' || exec_u.last_name AS executed_by_name,
        t.task_code AS defect_task_code,
        t.title AS defect_title,
        t.priority AS defect_priority,
        task_st.status_name AS defect_status_name,
        task_st.color_hex AS defect_status_color
      FROM test_run_items tri
      INNER JOIN test_cases tc ON tri.test_case_id = tc.id
      INNER JOIN test_suites ts ON tc.suite_id = ts.id
      LEFT JOIN users exec_u ON tri.executed_by_user_id = exec_u.id
      LEFT JOIN tasks t ON tri.linked_defect_task_id = t.id
      LEFT JOIN task_statuses task_st ON t.status_id = task_st.id
      WHERE tri.test_run_id = $1 AND tri.is_active = TRUE
      ORDER BY tc.case_code ASC`,
      [id],
    );

    return {
      ...runRes.rows[0],
      items: itemsRes.rows,
    };
  }

  async updateTestRun(id: string, dto: UpdateTestRunDto, userId: string) {
    const existing = await this.db.query(
      `SELECT * FROM test_runs WHERE id = $1 AND is_active = TRUE`,
      [id],
    );
    if (existing.rowCount === 0) {
      throw new NotFoundException(`Test Run with ID ${id} not found`);
    }

    let startedAt = existing.rows[0].started_at;
    let completedAt = existing.rows[0].completed_at;

    if (dto.status === 'IN_PROGRESS' && !startedAt) {
      startedAt = new Date();
    }
    if ((dto.status === 'COMPLETED' || dto.status === 'ABORTED') && !completedAt) {
      completedAt = new Date();
    }

    const res = await this.db.query(
      `UPDATE test_runs
       SET
         title = COALESCE($2, title),
         description = COALESCE($3, description),
         environment = COALESCE($4, environment),
         status = COALESCE($5, status),
         assigned_to_user_id = COALESCE($6, assigned_to_user_id),
         started_at = $7,
         completed_at = $8,
         updated_by = $9,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [
        id,
        dto.title || null,
        dto.description || null,
        dto.environment || null,
        dto.status || null,
        dto.assignedToUserId || null,
        startedAt,
        completedAt,
        userId,
      ],
    );

    return res.rows[0];
  }

  async executeTestRunItem(
    itemId: string,
    dto: ExecuteTestRunItemDto,
    userId: string,
  ) {
    const itemCheck = await this.db.query(
      `SELECT id, test_run_id, test_case_id FROM test_run_items WHERE id = $1 AND is_active = TRUE`,
      [itemId],
    );
    if (itemCheck.rowCount === 0) {
      throw new NotFoundException(`Test Run Item with ID ${itemId} not found`);
    }

    const item = itemCheck.rows[0];

    return this.db.transaction(async (client) => {
      // 1. Update Test Run Item
      const res = await client.query(
        `UPDATE test_run_items
         SET
           status = $2,
           actual_result = COALESCE($3, actual_result),
           execution_notes = COALESCE($4, execution_notes),
           executed_by_user_id = $5,
           executed_at = CURRENT_TIMESTAMP,
           evidence_urls = CASE WHEN $6::jsonb IS NOT NULL THEN $6::jsonb ELSE evidence_urls END,
           linked_defect_task_id = COALESCE($7, linked_defect_task_id),
           updated_by = $5,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [
          itemId,
          dto.status,
          dto.actualResult || null,
          dto.executionNotes || null,
          userId,
          dto.evidenceUrls ? JSON.stringify(dto.evidenceUrls) : null,
          dto.linkedDefectTaskId || null,
        ],
      );

      // 2. Recalculate Test Run aggregate counts
      const countsRes = await client.query(
        `SELECT
          COUNT(*) FILTER (WHERE status = 'PASSED')::INTEGER AS passed,
          COUNT(*) FILTER (WHERE status = 'FAILED')::INTEGER AS failed,
          COUNT(*) FILTER (WHERE status = 'BLOCKED')::INTEGER AS blocked,
          COUNT(*) FILTER (WHERE status = 'SKIPPED')::INTEGER AS skipped,
          COUNT(*) FILTER (WHERE status = 'PENDING')::INTEGER AS pending,
          COUNT(*)::INTEGER AS total
         FROM test_run_items
         WHERE test_run_id = $1 AND is_active = TRUE`,
        [item.test_run_id],
      );

      const counts = countsRes.rows[0];
      const hasExecutedAny = counts.total > counts.pending;
      const isAllExecuted = counts.pending === 0;

      await client.query(
        `UPDATE test_runs
         SET
           total_cases = $2,
           passed_cases = $3,
           failed_cases = $4,
           blocked_cases = $5,
           skipped_cases = $6,
           status = CASE
             WHEN $7 = TRUE AND status = 'IN_PROGRESS' THEN 'COMPLETED'
             WHEN $8 = TRUE AND status = 'PLANNED' THEN 'IN_PROGRESS'
             ELSE status
           END,
           started_at = CASE
             WHEN started_at IS NULL AND $8 = TRUE THEN CURRENT_TIMESTAMP
             ELSE started_at
           END,
           completed_at = CASE
             WHEN $7 = TRUE THEN CURRENT_TIMESTAMP
             ELSE completed_at
           END,
           updated_by = $9,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [
          item.test_run_id,
          counts.total,
          counts.passed,
          counts.failed,
          counts.blocked,
          counts.skipped,
          isAllExecuted,
          hasExecutedAny,
          userId,
        ],
      );

      return res.rows[0];
    });
  }

  // 1-Click Defect Logging directly from failed test run item
  async logDefectFromRunItem(
    itemId: string,
    dto: LogDefectFromRunItemDto,
    userId: string,
  ) {
    const itemRes = await this.db.query(
      `SELECT
        tri.id, tri.test_run_id, tri.test_case_id, tri.actual_result,
        tc.case_code, tc.title AS case_title, tc.test_steps, tc.expected_result,
        tc.component_id, tc.requirement_criterion_id,
        tr.entity_type, tr.product_id, tr.project_id, tr.version_id, tr.milestone_id, tr.environment
       FROM test_run_items tri
       INNER JOIN test_cases tc ON tri.test_case_id = tc.id
       INNER JOIN test_runs tr ON tri.test_run_id = tr.id
       WHERE tri.id = $1 AND tri.is_active = TRUE`,
      [itemId],
    );

    if (itemRes.rowCount === 0) {
      throw new NotFoundException(`Test Run Item with ID ${itemId} not found`);
    }

    const item = itemRes.rows[0];

    return this.db.transaction(async (client) => {
      // Find BUG task type
      const bugTypeRes = await client.query(
        `SELECT id FROM task_types WHERE type_code = 'BUG' AND is_active = TRUE LIMIT 1`,
      );
      if (bugTypeRes.rowCount === 0) {
        throw new BadRequestException('Task Type BUG not configured in the system');
      }
      const bugTypeId = bugTypeRes.rows[0].id;

      // Find OPEN task status
      const openStatusRes = await client.query(
        `SELECT id FROM task_statuses WHERE status_code = 'OPEN' AND is_active = TRUE LIMIT 1`,
      );
      const openStatusId = openStatusRes.rows[0]?.id;

      // Determine primary branch
      let branchId = dto.branchId || null;
      if (!branchId) {
        const uBranch = await client.query(
          `SELECT primary_branch_id FROM users WHERE id = $1`,
          [userId],
        );
        branchId = uBranch.rows[0]?.primary_branch_id || null;
      }

      const taskCode = `TSK-BUG-${Date.now().toString().slice(-6)}`;

      const customFields = {
        environment: item.environment,
        steps_to_reproduce: JSON.stringify(item.test_steps),
        expected_behavior: item.expected_result,
        actual_behavior: item.actual_result || 'Test execution failure observed.',
        reproduction_frequency: 'Always',
      };

      const taskInsert = await client.query(
        `INSERT INTO tasks (
          task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
          priority, project_id, product_id, version_id, milestone_id, sprint_id,
          branch_id, custom_field_values, is_active, created_by, updated_by
        ) VALUES (
          $1, 1, $2, $3, 'TASK', $4, $5,
          $6, $7, $8, $9, $10, $11,
          $12, $13::jsonb, TRUE, $14, $14
        ) RETURNING *`,
        [
          taskCode,
          dto.title || `Bug from ${item.case_code}: ${item.case_title}`,
          dto.description ||
            `Automated defect generated from failed test run execution of ${item.case_code}.\nActual: ${item.actual_result || 'N/A'}`,
          bugTypeId,
          openStatusId,
          dto.priority || 'HIGH',
          item.project_id || null,
          item.product_id || null,
          item.version_id || null,
          item.milestone_id || null,
          dto.sprintId || null,
          branchId,
          JSON.stringify(customFields),
          userId,
        ],
      );

      const createdTask = taskInsert.rows[0];

      // Assign user if provided
      if (dto.assigneeUserId) {
        await client.query(
          `INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
           VALUES ($1, $2, TRUE, $3, $3)
           ON CONFLICT (task_id, user_id) DO NOTHING`,
          [createdTask.id, dto.assigneeUserId, userId],
        );
      }

      // Link component if test case has one
      if (item.component_id) {
        await client.query(
          `INSERT INTO task_components (task_id, component_id, is_primary, created_by)
           VALUES ($1, $2, TRUE, $3)
           ON CONFLICT (task_id, component_id) DO NOTHING`,
          [createdTask.id, item.component_id, userId],
        );
      }

      // Link defect to run item
      await client.query(
        `UPDATE test_run_items
         SET linked_defect_task_id = $2, status = 'FAILED', updated_by = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [itemId, createdTask.id, userId],
      );

      return {
        defect: createdTask,
        runItemId: itemId,
        message: `Bug defect ${taskCode} created and linked to test run item successfully`,
      };
    });
  }

  // ========================================================
  // 4. Release Readiness Gatekeeper & Signoff
  // ========================================================

  async createReleaseChecklist(dto: CreateReleaseChecklistDto, userId: string) {
    if (
      (dto.entityType === 'PRODUCT' && (!dto.productId || dto.projectId)) ||
      (dto.entityType === 'PROJECT' && (!dto.projectId || dto.productId))
    ) {
      throw new BadRequestException(
        'For entityType PRODUCT, productId must be provided and projectId must be null. For PROJECT, projectId must be provided and productId must be null.',
      );
    }

    const checklistCode =
      dto.checklistCode || `REL-GATE-${Date.now().toString().slice(-6)}`;

    return this.db.transaction(async (client) => {
      // 1. Create Checklist Header
      const clRes = await client.query(
        `INSERT INTO release_readiness_checklists (
          checklist_code, entity_type, product_id, project_id, version_id,
          milestone_id, title, overall_status, target_release_date,
          lead_qa_user_id, signoff_pm_user_id, is_active, created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, 'NOT_STARTED', $8, $9, $10, TRUE, $11, $11
        ) RETURNING *`,
        [
          checklistCode,
          dto.entityType,
          dto.productId || null,
          dto.projectId || null,
          dto.versionId || null,
          dto.milestoneId || null,
          dto.title,
          dto.targetReleaseDate || null,
          dto.leadQaUserId || null,
          dto.signoffPmUserId || null,
          userId,
        ],
      );

      const checklist = clRes.rows[0];

      // 2. Populate Gate Items
      let itemsToInsert = dto.customItems;

      // Default Standard 6 Gates if none provided
      if (!itemsToInsert || itemsToInsert.length === 0) {
        itemsToInsert = [
          {
            itemCode: 'GATE-01',
            gateCategory: 'QA_TESTING',
            title: 'Full Regression Suite Passing Rate >= 95%',
            description: 'All critical and high severity test cases must pass on staging.',
            isMandatory: true,
            orderIndex: 1,
          },
          {
            itemCode: 'GATE-02',
            gateCategory: 'SECURITY',
            title: 'Static & Dynamic Vulnerability Scans Clean',
            description: 'Zero unresolved critical or high security vulnerabilities.',
            isMandatory: true,
            orderIndex: 2,
          },
          {
            itemCode: 'GATE-03',
            gateCategory: 'PERFORMANCE',
            title: 'Target User Concurrency Benchmark Latency Met',
            description: 'API 95th percentile response time satisfies SLA.',
            isMandatory: false,
            orderIndex: 3,
          },
          {
            itemCode: 'GATE-04',
            gateCategory: 'DATA_MIGRATION',
            title: 'Database Schema & Seed Migration Dry-Run Tested',
            description: 'Schema alters executed without table locking or data loss.',
            isMandatory: true,
            orderIndex: 4,
          },
          {
            itemCode: 'GATE-05',
            gateCategory: 'CLIENT_UAT',
            title: 'Key Client Stakeholders Signoff & Pilot Acceptance',
            description: 'Customer or product owner signoff received on release candidate.',
            isMandatory: true,
            orderIndex: 5,
          },
          {
            itemCode: 'GATE-06',
            gateCategory: 'DOCUMENTATION',
            title: 'Release Notes & Operations Deployment Guide Published',
            description: 'User guides and deployment runbooks published to knowledge base.',
            isMandatory: false,
            orderIndex: 6,
          },
        ];
      }

      for (let i = 0; i < itemsToInsert.length; i++) {
        const item = itemsToInsert[i];
        await client.query(
          `INSERT INTO release_checklist_items (
            checklist_id, item_code, gate_category, title, description,
            status, is_mandatory, order_index, is_active, created_by, updated_by
          ) VALUES ($1, $2, $3, $4, $5, 'PENDING', $6, $7, TRUE, $8, $8)
          ON CONFLICT (checklist_id, item_code) DO NOTHING`,
          [
            checklist.id,
            item.itemCode || `GATE-0${i + 1}`,
            item.gateCategory,
            item.title,
            item.description || null,
            item.isMandatory !== undefined ? item.isMandatory : true,
            item.orderIndex || i + 1,
            userId,
          ],
        );
      }

      return checklist;
    });
  }

  async getReleaseChecklists(query: QueryReleaseChecklistsDto) {
    const params: any[] = [];
    const where: string[] = ['rrc.is_active = TRUE'];

    if (query.entityType) {
      params.push(query.entityType);
      where.push(`rrc.entity_type = $${params.length}`);
    }
    if (query.productId) {
      params.push(query.productId);
      where.push(`rrc.product_id = $${params.length}`);
    }
    if (query.projectId) {
      params.push(query.projectId);
      where.push(`rrc.project_id = $${params.length}`);
    }
    if (query.versionId) {
      params.push(query.versionId);
      where.push(`rrc.version_id = $${params.length}`);
    }
    if (query.milestoneId) {
      params.push(query.milestoneId);
      where.push(`rrc.milestone_id = $${params.length}`);
    }
    if (query.overallStatus) {
      params.push(query.overallStatus);
      where.push(`rrc.overall_status = $${params.length}`);
    }

    const res = await this.db.query(
      `SELECT
        rrc.*,
        p.project_name,
        pr.product_name,
        v.version_name,
        m.milestone_name,
        qa_u.first_name || ' ' || qa_u.last_name AS lead_qa_name,
        pm_u.first_name || ' ' || pm_u.last_name AS signoff_pm_name,
        COUNT(rci.id)::INTEGER AS total_items_count,
        COUNT(rci.id) FILTER (WHERE rci.status = 'PASSED')::INTEGER AS passed_items_count,
        COUNT(rci.id) FILTER (WHERE rci.status = 'FAILED')::INTEGER AS failed_items_count,
        COUNT(rci.id) FILTER (WHERE rci.status = 'WAIVED')::INTEGER AS waived_items_count,
        COUNT(rci.id) FILTER (WHERE rci.status = 'PENDING')::INTEGER AS pending_items_count
      FROM release_readiness_checklists rrc
      LEFT JOIN projects p ON rrc.project_id = p.id
      LEFT JOIN products pr ON rrc.product_id = pr.id
      LEFT JOIN versions v ON rrc.version_id = v.id
      LEFT JOIN milestones m ON rrc.milestone_id = m.id
      LEFT JOIN users qa_u ON rrc.lead_qa_user_id = qa_u.id
      LEFT JOIN users pm_u ON rrc.signoff_pm_user_id = pm_u.id
      LEFT JOIN release_checklist_items rci ON rrc.id = rci.checklist_id AND rci.is_active = TRUE
      WHERE ${where.join(' AND ')}
      GROUP BY rrc.id, p.project_name, pr.product_name, v.version_name, m.milestone_name, qa_u.first_name, qa_u.last_name, pm_u.first_name, pm_u.last_name
      ORDER BY rrc.created_at DESC`,
      params,
    );

    return res.rows;
  }

  async getReleaseChecklistById(id: string) {
    const clRes = await this.db.query(
      `SELECT
        rrc.*,
        p.project_name,
        pr.product_name,
        v.version_name,
        m.milestone_name,
        qa_u.first_name || ' ' || qa_u.last_name AS lead_qa_name,
        pm_u.first_name || ' ' || pm_u.last_name AS signoff_pm_name
      FROM release_readiness_checklists rrc
      LEFT JOIN projects p ON rrc.project_id = p.id
      LEFT JOIN products pr ON rrc.product_id = pr.id
      LEFT JOIN versions v ON rrc.version_id = v.id
      LEFT JOIN milestones m ON rrc.milestone_id = m.id
      LEFT JOIN users qa_u ON rrc.lead_qa_user_id = qa_u.id
      LEFT JOIN users pm_u ON rrc.signoff_pm_user_id = pm_u.id
      WHERE rrc.id = $1 AND rrc.is_active = TRUE`,
      [id],
    );

    if (clRes.rowCount === 0) {
      throw new NotFoundException(`Release Checklist with ID ${id} not found`);
    }

    const itemsRes = await this.db.query(
      `SELECT
        rci.*,
        u.first_name || ' ' || u.last_name AS verified_by_name
      FROM release_checklist_items rci
      LEFT JOIN users u ON rci.verified_by_user_id = u.id
      WHERE rci.checklist_id = $1 AND rci.is_active = TRUE
      ORDER BY rci.order_index ASC, rci.created_at ASC`,
      [id],
    );

    return {
      ...clRes.rows[0],
      items: itemsRes.rows,
    };
  }

  async updateChecklistItem(
    checklistId: string,
    itemId: string,
    dto: UpdateChecklistItemDto,
    userId: string,
  ) {
    const itemCheck = await this.db.query(
      `SELECT id FROM release_checklist_items WHERE id = $1 AND checklist_id = $2 AND is_active = TRUE`,
      [itemId, checklistId],
    );
    if (itemCheck.rowCount === 0) {
      throw new NotFoundException(`Checklist item with ID ${itemId} not found`);
    }

    const res = await this.db.query(
      `UPDATE release_checklist_items
       SET
         status = $3,
         verified_by_user_id = $4,
         verified_at = CURRENT_TIMESTAMP,
         evidence_notes = COALESCE($5, evidence_notes),
         waived_reason = COALESCE($6, waived_reason),
         updated_by = $4,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND checklist_id = $2
       RETURNING *`,
      [
        itemId,
        checklistId,
        dto.status,
        userId,
        dto.evidenceNotes || null,
        dto.waivedReason || null,
      ],
    );

    return res.rows[0];
  }

  async signoffChecklist(
    checklistId: string,
    dto: SignoffChecklistDto,
    userId: string,
  ) {
    const clCheck = await this.db.query(
      `SELECT id, overall_status FROM release_readiness_checklists WHERE id = $1 AND is_active = TRUE`,
      [checklistId],
    );
    if (clCheck.rowCount === 0) {
      throw new NotFoundException(`Release Checklist with ID ${checklistId} not found`);
    }

    // Check mandatory items status
    const mandatoryRes = await this.db.query(
      `SELECT item_code, title, status FROM release_checklist_items
       WHERE checklist_id = $1 AND is_mandatory = TRUE AND status NOT IN ('PASSED', 'WAIVED') AND is_active = TRUE`,
      [checklistId],
    );

    if (
      dto.overallStatus === 'READY_FOR_RELEASE' &&
      mandatoryRes.rowCount > 0
    ) {
      const pendingGates = mandatoryRes.rows.map((r: any) => `${r.item_code} (${r.status})`).join(', ');
      throw new BadRequestException(
        `Cannot approve READY_FOR_RELEASE while mandatory gates are pending or failed: ${pendingGates}. Waive them with reason or resolve them first.`,
      );
    }

    const res = await this.db.query(
      `UPDATE release_readiness_checklists
       SET
         overall_status = $2,
         signoff_pm_user_id = $3,
         signed_off_at = CURRENT_TIMESTAMP,
         signoff_notes = COALESCE($4, signoff_notes),
         exceptions_notes = COALESCE($5, exceptions_notes),
         updated_by = $3,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [
        checklistId,
        dto.overallStatus,
        userId,
        dto.signoffNotes || null,
        dto.exceptionsNotes || null,
      ],
    );

    return res.rows[0];
  }

  // ========================================================
  // 5. Traceability & Radar Matrix
  // ========================================================

  async getTraceabilityMatrix(productId?: string, projectId?: string) {
    const params: any[] = [];
    const where: string[] = ['tc.is_active = TRUE'];

    if (productId) {
      params.push(productId);
      where.push(`ts.product_id = $${params.length}`);
    }
    if (projectId) {
      params.push(projectId);
      where.push(`ts.project_id = $${params.length}`);
    }

    const res = await this.db.query(
      `SELECT
        tc.id AS test_case_id,
        tc.case_code,
        tc.title AS case_title,
        tc.severity,
        tc.priority,
        tc.execution_type,
        ts.id AS suite_id,
        ts.suite_code,
        ts.suite_name,
        p.project_name,
        pr.product_name,
        rac.id AS requirement_criterion_id,
        rac.criterion_code,
        rac.title AS criterion_title,
        latest_exec.latest_status,
        latest_exec.latest_executed_at,
        latest_exec.run_code AS latest_run_code,
        defect.task_code AS linked_defect_code,
        defect.title AS linked_defect_title,
        defect_st.status_name AS defect_status_name,
        defect_st.color_hex AS defect_status_color
      FROM test_cases tc
      INNER JOIN test_suites ts ON tc.suite_id = ts.id
      LEFT JOIN projects p ON ts.project_id = p.id
      LEFT JOIN products pr ON ts.product_id = pr.id
      LEFT JOIN requirement_acceptance_criteria rac ON tc.requirement_criterion_id = rac.id
      LEFT JOIN LATERAL (
        SELECT
          tri.status AS latest_status,
          tri.executed_at AS latest_executed_at,
          tri.linked_defect_task_id,
          tr.run_code
        FROM test_run_items tri
        INNER JOIN test_runs tr ON tri.test_run_id = tr.id
        WHERE tri.test_case_id = tc.id AND tri.is_active = TRUE
        ORDER BY tri.executed_at DESC NULLS LAST, tri.created_at DESC
        LIMIT 1
      ) latest_exec ON TRUE
      LEFT JOIN tasks defect ON latest_exec.linked_defect_task_id = defect.id
      LEFT JOIN task_statuses defect_st ON defect.status_id = defect_st.id
      WHERE ${where.join(' AND ')}
      ORDER BY ts.suite_code ASC, tc.case_code ASC`,
      params,
    );

    // Summary counters
    const totalCases = res.rows.length;
    const passedCases = res.rows.filter((r: any) => r.latest_status === 'PASSED').length;
    const failedCases = res.rows.filter((r: any) => r.latest_status === 'FAILED').length;
    const blockedCases = res.rows.filter((r: any) => r.latest_status === 'BLOCKED').length;
    const pendingCases = totalCases - (passedCases + failedCases + blockedCases);
    const linkedDefectsCount = res.rows.filter((r: any) => r.linked_defect_code).length;

    return {
      summary: {
        totalCases,
        passedCases,
        failedCases,
        blockedCases,
        pendingCases,
        linkedDefectsCount,
        coveragePercentage:
          totalCases > 0
            ? Math.round(((totalCases - pendingCases) / totalCases) * 100)
            : 0,
      },
      items: res.rows,
    };
  }

  // ========================================================
  // 6. QA Scoped Environments Management (QA-002)
  // ========================================================

  private async generateEnvironmentCode(): Promise<string> {
    const year = new Date().getFullYear();
    const pattern = `ENV-${year}-%`;

    const res = await this.db.query(
      `SELECT env_code FROM qa_environments WHERE env_code LIKE $1 ORDER BY env_code DESC LIMIT 1`,
      [pattern],
    );

    let nextNum = 1;
    if (res.rowCount && res.rowCount > 0) {
      const match = res.rows[0].env_code.match(new RegExp(`ENV-${year}-(\\d+)`));
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    return `ENV-${year}-${String(nextNum).padStart(4, '0')}`;
  }

  private async generateObservationCode(): Promise<string> {
    const year = new Date().getFullYear();
    const pattern = `OBS-${year}-%`;

    const res = await this.db.query(
      `SELECT observation_code FROM issue_environment_observations WHERE observation_code LIKE $1 ORDER BY observation_code DESC LIMIT 1`,
      [pattern],
    );

    let nextNum = 1;
    if (res.rowCount && res.rowCount > 0) {
      const match = res.rows[0].observation_code.match(new RegExp(`OBS-${year}-(\\d+)`));
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    return `OBS-${year}-${String(nextNum).padStart(4, '0')}`;
  }

  async createEnvironment(dto: CreateQaEnvironmentDto, userId: string) {
    const code = await this.generateEnvironmentCode();

    const res = await this.db.query(
      `INSERT INTO qa_environments (
        env_code, env_name, env_type, scope_type,
        product_id, project_id, client_id, region, description,
        context_metadata, is_active, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, $11, $11)
      RETURNING *`,
      [
        code,
        dto.env_name,
        dto.env_type,
        dto.scope_type,
        dto.product_id || null,
        dto.project_id || null,
        dto.client_id || null,
        dto.region || null,
        dto.description || null,
        JSON.stringify(dto.context_metadata || {}),
        userId,
      ],
    );
    return res.rows[0];
  }

  async getEnvironments(query: QueryQaEnvironmentsDto) {
    const conditions: string[] = ['qe.is_active = TRUE'];
    const params: any[] = [];
    let pIdx = 1;

    if (query.env_type) {
      conditions.push(`qe.env_type = $${pIdx++}`);
      params.push(query.env_type);
    }
    if (query.scope_type) {
      conditions.push(`qe.scope_type = $${pIdx++}`);
      params.push(query.scope_type);
    }
    if (query.product_id) {
      conditions.push(`qe.product_id = $${pIdx++}`);
      params.push(query.product_id);
    }
    if (query.project_id) {
      conditions.push(`qe.project_id = $${pIdx++}`);
      params.push(query.project_id);
    }
    if (query.client_id) {
      conditions.push(`qe.client_id = $${pIdx++}`);
      params.push(query.client_id);
    }
    if (query.search) {
      conditions.push(
        `(qe.env_name ILIKE $${pIdx} OR qe.env_code ILIKE $${pIdx} OR qe.region ILIKE $${pIdx})`,
      );
      params.push(`%${query.search}%`);
      pIdx++;
    }

    const sql = `
      SELECT
        qe.*,
        p.product_name,
        prj.project_name,
        c.client_name,
        (
          SELECT COUNT(*)::int
          FROM issue_environment_observations ieo
          WHERE ieo.environment_id = qe.id AND ieo.is_active = TRUE
        ) AS observations_count
      FROM qa_environments qe
      LEFT JOIN products p ON qe.product_id = p.id
      LEFT JOIN projects prj ON qe.project_id = prj.id
      LEFT JOIN clients c ON qe.client_id = c.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY qe.env_type ASC, qe.env_name ASC
    `;

    const res = await this.db.query(sql, params);
    return res.rows;
  }

  async getEnvironmentById(id: string) {
    const res = await this.db.query(
      `SELECT
        qe.*,
        p.product_name,
        prj.project_name,
        c.client_name
      FROM qa_environments qe
      LEFT JOIN products p ON qe.product_id = p.id
      LEFT JOIN projects prj ON qe.project_id = prj.id
      LEFT JOIN clients c ON qe.client_id = c.id
      WHERE qe.id = $1 AND qe.is_active = TRUE`,
      [id],
    );

    if (!res.rowCount || res.rowCount === 0) {
      throw new NotFoundException(`QA environment with ID ${id} not found`);
    }
    return res.rows[0];
  }

  async updateEnvironment(id: string, dto: UpdateQaEnvironmentDto, userId: string) {
    await this.getEnvironmentById(id);

    const updates: string[] = ['updated_by = $1', 'updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [userId];
    let pIdx = 2;

    if (dto.env_name !== undefined) {
      updates.push(`env_name = $${pIdx++}`);
      params.push(dto.env_name);
    }
    if (dto.env_type !== undefined) {
      updates.push(`env_type = $${pIdx++}`);
      params.push(dto.env_type);
    }
    if (dto.scope_type !== undefined) {
      updates.push(`scope_type = $${pIdx++}`);
      params.push(dto.scope_type);
    }
    if (dto.product_id !== undefined) {
      updates.push(`product_id = $${pIdx++}`);
      params.push(dto.product_id || null);
    }
    if (dto.project_id !== undefined) {
      updates.push(`project_id = $${pIdx++}`);
      params.push(dto.project_id || null);
    }
    if (dto.client_id !== undefined) {
      updates.push(`client_id = $${pIdx++}`);
      params.push(dto.client_id || null);
    }
    if (dto.region !== undefined) {
      updates.push(`region = $${pIdx++}`);
      params.push(dto.region);
    }
    if (dto.description !== undefined) {
      updates.push(`description = $${pIdx++}`);
      params.push(dto.description);
    }
    if (dto.context_metadata !== undefined) {
      updates.push(`context_metadata = $${pIdx++}`);
      params.push(JSON.stringify(dto.context_metadata));
    }

    params.push(id);
    const sql = `
      UPDATE qa_environments
      SET ${updates.join(', ')}
      WHERE id = $${pIdx} AND is_active = TRUE
      RETURNING *
    `;

    const res = await this.db.query(sql, params);
    return res.rows[0];
  }

  async deleteEnvironment(id: string, userId: string) {
    await this.getEnvironmentById(id);

    await this.db.query(
      `UPDATE qa_environments
      SET is_active = FALSE, updated_by = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2`,
      [userId, id],
    );
    return { success: true, message: `QA environment ${id} deleted` };
  }

  // ========================================================
  // 7. Issue Environment Observations & Retests (QA-002)
  // ========================================================

  async createIssueObservation(dto: CreateIssueObservationDto, user: any) {
    const taskRes = await this.db.query(
      `SELECT id, task_code, title, project_id, product_id, version_id FROM tasks WHERE id = $1 AND is_active = TRUE`,
      [dto.task_id],
    );
    if (!taskRes.rowCount || taskRes.rowCount === 0) {
      throw new NotFoundException(`Task with ID ${dto.task_id} not found`);
    }

    const envRes = await this.db.query(
      `SELECT id, env_code, env_type, client_id FROM qa_environments WHERE id = $1 AND is_active = TRUE`,
      [dto.environment_id],
    );
    if (!envRes.rowCount || envRes.rowCount === 0) {
      throw new NotFoundException(`Environment with ID ${dto.environment_id} not found`);
    }

    const verRes = await this.db.query(
      `SELECT id, version_code FROM versions WHERE id = $1 AND is_active = TRUE`,
      [dto.version_id],
    );
    if (!verRes.rowCount || verRes.rowCount === 0) {
      throw new NotFoundException(`Version with ID ${dto.version_id} not found`);
    }

    const code = await this.generateObservationCode();
    const userId = user.userId || user.id;
    const isClientVis = dto.is_client_visible !== undefined ? dto.is_client_visible : (envRes.rows[0].env_type === 'CLIENT_UAT' || envRes.rows[0].env_type === 'ON_PREMISE_CLIENT');

    const res = await this.db.query(
      `INSERT INTO issue_environment_observations (
        observation_code, task_id, environment_id, version_id,
        observation_type, observed_at, tester_user_id, client_contact_id,
        browser_info, os_info, device_info, build_label,
        evidence_notes, attachment_url, is_client_visible, is_active,
        created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, COALESCE($6, CURRENT_TIMESTAMP), $7, $8, $9, $10, $11, $12, $13, $14, $15, TRUE, $16, $16)
      RETURNING *`,
      [
        code,
        dto.task_id,
        dto.environment_id,
        dto.version_id,
        dto.observation_type,
        dto.observed_at || null,
        dto.tester_user_id || userId,
        dto.client_contact_id || null,
        dto.browser_info || null,
        dto.os_info || null,
        dto.device_info || null,
        dto.build_label || null,
        dto.evidence_notes || null,
        dto.attachment_url || null,
        isClientVis,
        userId,
      ],
    );

    // CRITICAL QA-002 ACCEPTANCE ENFORCEMENT:
    // A fix passing internal QA does NOT automatically close or mark client environments as passed.
    // Client UAT and customer-specific on-premise environments remain strictly independent facts.

    return res.rows[0];
  }

  async getIssueObservations(query: QueryIssueObservationsDto, user: any) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['ieo.is_active = TRUE'];
    const params: any[] = [];
    let pIdx = 1;

    // Privacy boundary: If client user, restrict strictly to their client-visible items
    const isClient = !!user?.clientId;
    if (isClient) {
      conditions.push(
        `(ieo.is_client_visible = TRUE AND (qe.scope_type = 'GLOBAL' OR qe.client_id = $${pIdx}))`,
      );
      params.push(user.clientId);
      pIdx++;
    } else if (query.is_client_visible !== undefined) {
      conditions.push(`ieo.is_client_visible = $${pIdx++}`);
      params.push(query.is_client_visible);
    }

    if (query.task_id) {
      conditions.push(`ieo.task_id = $${pIdx++}`);
      params.push(query.task_id);
    }
    if (query.environment_id) {
      conditions.push(`ieo.environment_id = $${pIdx++}`);
      params.push(query.environment_id);
    }
    if (query.version_id) {
      conditions.push(`ieo.version_id = $${pIdx++}`);
      params.push(query.version_id);
    }
    if (query.observation_type) {
      conditions.push(`ieo.observation_type = $${pIdx++}`);
      params.push(query.observation_type);
    }
    if (query.product_id) {
      conditions.push(`(t.product_id = $${pIdx} OR qe.product_id = $${pIdx})`);
      params.push(query.product_id);
      pIdx++;
    }
    if (query.project_id) {
      conditions.push(`(t.project_id = $${pIdx} OR qe.project_id = $${pIdx})`);
      params.push(query.project_id);
      pIdx++;
    }
    if (query.client_id && !isClient) {
      conditions.push(`qe.client_id = $${pIdx++}`);
      params.push(query.client_id);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await this.db.query(
      `SELECT COUNT(*)::int as total
      FROM issue_environment_observations ieo
      JOIN tasks t ON ieo.task_id = t.id
      JOIN qa_environments qe ON ieo.environment_id = qe.id
      ${whereClause}`,
      params,
    );
    const total = countRes.rows[0]?.total || 0;

    const sql = `
      SELECT
        ieo.*,
        t.task_code,
        t.title AS task_title,
        qe.env_code,
        qe.env_name,
        qe.env_type,
        qe.region AS env_region,
        c.client_name,
        v.version_code,
        v.version_name,
        u.display_name AS tester_name,
        u.email AS tester_email,
        cc.first_name || ' ' || cc.last_name AS client_contact_name
      FROM issue_environment_observations ieo
      JOIN tasks t ON ieo.task_id = t.id
      JOIN qa_environments qe ON ieo.environment_id = qe.id
      JOIN versions v ON ieo.version_id = v.id
      LEFT JOIN clients c ON qe.client_id = c.id
      LEFT JOIN users u ON ieo.tester_user_id = u.id
      LEFT JOIN client_contacts cc ON ieo.client_contact_id = cc.id
      ${whereClause}
      ORDER BY ieo.observed_at DESC
      LIMIT $${pIdx++} OFFSET $${pIdx++}
    `;

    params.push(limit, offset);
    const res = await this.db.query(sql, params);

    return {
      items: res.rows,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  async getTaskEnvironmentMatrix(taskId: string, user: any) {
    const taskRes = await this.db.query(
      `SELECT
        t.id, t.task_code, t.title, t.priority,
        ts.status_name,
        v.version_code AS task_version_code,
        p.product_name,
        prj.project_name
      FROM tasks t
      LEFT JOIN task_statuses ts ON t.status_id = ts.id
      LEFT JOIN versions v ON t.version_id = v.id
      LEFT JOIN products p ON t.product_id = p.id
      LEFT JOIN projects prj ON t.project_id = prj.id
      WHERE t.id = $1 AND t.is_active = TRUE`,
      [taskId],
    );

    if (!taskRes.rowCount || taskRes.rowCount === 0) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    const task = taskRes.rows[0];
    const isClient = !!user?.clientId;

    const privacyCondition = isClient
      ? `AND (ieo.is_client_visible = TRUE AND (qe.scope_type = 'GLOBAL' OR qe.client_id = '${user.clientId}'))`
      : '';

    // Fetch latest observation per environment and version
    const observationsSql = `
      SELECT DISTINCT ON (ieo.environment_id, ieo.version_id)
        ieo.id,
        ieo.observation_code,
        ieo.observation_type,
        ieo.observed_at,
        ieo.build_label,
        ieo.browser_info,
        ieo.os_info,
        ieo.evidence_notes,
        ieo.is_client_visible,
        qe.id AS environment_id,
        qe.env_code,
        qe.env_name,
        qe.env_type,
        qe.scope_type,
        c.client_name,
        v.id AS version_id,
        v.version_code,
        v.version_name,
        u.display_name AS tester_name,
        cc.first_name || ' ' || cc.last_name AS client_contact_name
      FROM issue_environment_observations ieo
      JOIN qa_environments qe ON ieo.environment_id = qe.id
      JOIN versions v ON ieo.version_id = v.id
      LEFT JOIN clients c ON qe.client_id = c.id
      LEFT JOIN users u ON ieo.tester_user_id = u.id
      LEFT JOIN client_contacts cc ON ieo.client_contact_id = cc.id
      WHERE ieo.task_id = $1 AND ieo.is_active = TRUE ${privacyCondition}
      ORDER BY ieo.environment_id, ieo.version_id, ieo.observed_at DESC
    `;

    const obsRes = await this.db.query(observationsSql, [taskId]);

    // Compute status rollup
    const hasPassedInternalQa = obsRes.rows.some(
      (r: any) => r.env_type === 'INTERNAL_QA' && r.observation_type === 'PASSED',
    );
    const hasFailingClientUat = obsRes.rows.some(
      (r: any) => r.env_type === 'CLIENT_UAT' && r.observation_type === 'FAILED',
    );
    const hasUnresolvedOlderVersion = obsRes.rows.some(
      (r: any) =>
        (r.observation_type === 'FOUND_REPRODUCED' || r.observation_type === 'FAILED') &&
        r.version_code !== task.task_version_code,
    );

    return {
      task,
      matrix: obsRes.rows,
      evaluationSummary: {
        hasPassedInternalQa,
        hasFailingClientUat,
        hasUnresolvedOlderVersion,
        // Proves QA-002: Internal pass does not resolve client issues
        isFullyResolvedAcrossAllEnvironments:
          obsRes.rows.length > 0 &&
          obsRes.rows.every((r: any) => r.observation_type === 'PASSED'),
      },
    };
  }
}

