import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';
import { CreateAcceptanceCriterionDto } from './dto/create-acceptance-criterion.dto';
import { UpdateAcceptanceCriterionDto } from './dto/update-acceptance-criterion.dto';
import { BaselineRequirementDto } from './dto/baseline-requirement.dto';
import { LinkCriterionTasksDto } from './dto/link-criterion-tasks.dto';
import { QaVerifyCriterionDto } from './dto/qa-verify-criterion.dto';
import { ClientSignoffDto } from './dto/client-signoff.dto';
import { QueryRequirementsDto } from './dto/query-requirements.dto';

@Injectable()
export class RequirementsService {
  constructor(private readonly db: DatabaseService) {}

  // ========================================================
  // 1. Requirement Specifications CRUD & Lifecycle
  // ========================================================

  async createRequirement(dto: CreateRequirementDto, userId: string) {
    if ((!dto.projectId && !dto.productId) || (dto.projectId && dto.productId)) {
      throw new BadRequestException('A requirement must be linked to either a project or a product, but not both');
    }

    if (dto.projectId) {
      const projCheck = await this.db.query(`SELECT id FROM projects WHERE id = $1 AND is_active = TRUE`, [dto.projectId]);
      if (projCheck.rowCount === 0) {
        throw new NotFoundException(`Project with ID ${dto.projectId} not found`);
      }
    }

    if (dto.productId) {
      const prodCheck = await this.db.query(`SELECT id FROM products WHERE id = $1 AND is_active = TRUE`, [dto.productId]);
      if (prodCheck.rowCount === 0) {
        throw new NotFoundException(`Product with ID ${dto.productId} not found`);
      }
    }

    if (dto.originatingRequestId) {
      const reqCheck = await this.db.query(`SELECT id FROM client_intake_requests WHERE id = $1`, [dto.originatingRequestId]);
      if (reqCheck.rowCount === 0) {
        throw new NotFoundException(`Originating intake request with ID ${dto.originatingRequestId} not found`);
      }
    }

    const code = dto.reqCode || `REQ-${Math.floor(100000 + Math.random() * 900000)}`;

    const res = await this.db.query(
      `INSERT INTO requirement_specifications (
        req_code, title, project_id, product_id, module_name,
        business_objective, in_scope, out_of_scope, assumptions,
        originating_request_id, version, status, is_baselined,
        is_client_visible, is_active, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1, 'DRAFT', FALSE, $11, TRUE, $12, $12)
      RETURNING *`,
      [
        code,
        dto.title,
        dto.projectId || null,
        dto.productId || null,
        dto.moduleName || null,
        dto.businessObjective,
        dto.inScope || null,
        dto.outOfScope || null,
        dto.assumptions || null,
        dto.originatingRequestId || null,
        dto.isClientVisible ?? true,
        userId,
      ],
    );

    return res.rows[0];
  }

  async getRequirements(query: QueryRequirementsDto) {
    let sql = `
      SELECT 
        r.*,
        p.project_name,
        p.project_code,
        pr.product_name,
        pr.product_code,
        cir.request_number as originating_request_number,
        cir.title as originating_request_title,
        COUNT(DISTINCT rac.id)::int as total_criteria,
        COUNT(DISTINCT CASE WHEN rac.implementation_status IN ('IMPLEMENTED', 'VERIFIED_QA', 'ACCEPTED_CLIENT') THEN rac.id END)::int as implemented_criteria,
        COUNT(DISTINCT CASE WHEN rac.implementation_status = 'VERIFIED_QA' THEN rac.id END)::int as qa_verified_criteria,
        COUNT(DISTINCT CASE WHEN rac.client_signoff_status = 'ACCEPTED' THEN rac.id END)::int as client_accepted_criteria,
        COUNT(DISTINCT rct.task_id)::int as linked_tasks_count
      FROM requirement_specifications r
      LEFT JOIN projects p ON r.project_id = p.id
      LEFT JOIN products pr ON r.product_id = pr.id
      LEFT JOIN client_intake_requests cir ON r.originating_request_id = cir.id
      LEFT JOIN requirement_acceptance_criteria rac ON r.id = rac.requirement_id AND rac.is_active = TRUE
      LEFT JOIN requirement_criterion_tasks rct ON rac.id = rct.criterion_id AND rct.is_active = TRUE
      WHERE r.is_active = TRUE
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (query.projectId) {
      sql += ` AND r.project_id = $${paramIndex++}`;
      params.push(query.projectId);
    }

    if (query.productId) {
      sql += ` AND r.product_id = $${paramIndex++}`;
      params.push(query.productId);
    }

    if (query.status) {
      sql += ` AND r.status = $${paramIndex++}`;
      params.push(query.status);
    }

    if (query.isBaselined !== undefined) {
      sql += ` AND r.is_baselined = $${paramIndex++}`;
      params.push(query.isBaselined);
    }

    if (query.search) {
      sql += ` AND (r.req_code ILIKE $${paramIndex} OR r.title ILIKE $${paramIndex} OR r.business_objective ILIKE $${paramIndex})`;
      params.push(`%${query.search}%`);
      paramIndex++;
    }

    sql += ` GROUP BY r.id, p.id, pr.id, cir.id ORDER BY r.created_at DESC`;

    const res = await this.db.query(sql, params);
    return res.rows;
  }

  async getRequirementById(id: string) {
    const res = await this.db.query(
      `SELECT 
        r.*,
        p.project_name,
        p.project_code,
        pr.product_name,
        pr.product_code,
        cir.request_number as originating_request_number,
        cir.title as originating_request_title,
        u1.full_name as created_by_name,
        u2.full_name as baselined_by_name
      FROM requirement_specifications r
      LEFT JOIN projects p ON r.project_id = p.id
      LEFT JOIN products pr ON r.product_id = pr.id
      LEFT JOIN client_intake_requests cir ON r.originating_request_id = cir.id
      LEFT JOIN users u1 ON r.created_by = u1.id
      LEFT JOIN users u2 ON r.baselined_by = u2.id
      WHERE r.id = $1 AND r.is_active = TRUE`,
      [id],
    );

    if (res.rowCount === 0) {
      throw new NotFoundException(`Requirement specification with ID ${id} not found`);
    }

    const requirement = res.rows[0];

    // Fetch criteria with linked tasks
    const criteriaRes = await this.db.query(
      `SELECT 
        rac.*,
        u_qa.full_name as qa_verified_by_name,
        cc.first_name || ' ' || cc.last_name as client_signoff_by_name,
        COALESCE(
          json_agg(
            json_build_object(
              'id', t.id,
              'taskCode', t.task_code,
              'title', t.title,
              'priority', t.priority,
              'statusId', t.status_id,
              'statusName', ts.status_name,
              'statusCategory', ts.status_category
            )
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'::json
        ) as linked_tasks
      FROM requirement_acceptance_criteria rac
      LEFT JOIN users u_qa ON rac.qa_verified_by = u_qa.id
      LEFT JOIN client_contacts cc ON rac.client_signoff_by_contact_id = cc.id
      LEFT JOIN requirement_criterion_tasks rct ON rac.id = rct.criterion_id AND rct.is_active = TRUE
      LEFT JOIN tasks t ON rct.task_id = t.id
      LEFT JOIN task_statuses ts ON t.status_id = ts.id
      WHERE rac.requirement_id = $1 AND rac.is_active = TRUE
      GROUP BY rac.id, u_qa.id, cc.id
      ORDER BY rac.order_index ASC, rac.created_at ASC`,
      [id],
    );

    // Fetch baselines history
    const baselinesRes = await this.db.query(
      `SELECT 
        rb.*,
        u.full_name as baselined_by_name,
        cc.first_name || ' ' || cc.last_name as approved_by_name
      FROM requirement_baselines rb
      LEFT JOIN users u ON rb.baselined_by = u.id
      LEFT JOIN client_contacts cc ON rb.approved_by_contact_id = cc.id
      WHERE rb.requirement_id = $1 AND rb.is_active = TRUE
      ORDER BY rb.version DESC`,
      [id],
    );

    return {
      ...requirement,
      criteria: criteriaRes.rows,
      baselines: baselinesRes.rows,
    };
  }

  async updateRequirement(id: string, dto: UpdateRequirementDto, userId: string) {
    const existing = await this.db.query(
      `SELECT * FROM requirement_specifications WHERE id = $1 AND is_active = TRUE`,
      [id],
    );
    if (existing.rowCount === 0) {
      throw new NotFoundException(`Requirement specification with ID ${id} not found`);
    }

    const current = existing.rows[0];

    // If currently baselined and user edits core fields without explicitly passing status, mark as AMENDED
    let nextStatus = dto.status || current.status;
    let isBaselined = current.is_baselined;
    if (current.is_baselined && !dto.status && (dto.title || dto.businessObjective || dto.inScope || dto.outOfScope)) {
      nextStatus = 'AMENDED';
      isBaselined = false;
    }

    const res = await this.db.query(
      `UPDATE requirement_specifications
       SET title = COALESCE($1, title),
           module_name = COALESCE($2, module_name),
           business_objective = COALESCE($3, business_objective),
           in_scope = COALESCE($4, in_scope),
           out_of_scope = COALESCE($5, out_of_scope),
           assumptions = COALESCE($6, assumptions),
           originating_request_id = COALESCE($7, originating_request_id),
           is_client_visible = COALESCE($8, is_client_visible),
           status = $9,
           is_baselined = $10,
           updated_by = $11,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $12
       RETURNING *`,
      [
        dto.title || null,
        dto.moduleName || null,
        dto.businessObjective || null,
        dto.inScope || null,
        dto.outOfScope || null,
        dto.assumptions || null,
        dto.originatingRequestId || null,
        dto.isClientVisible !== undefined ? dto.isClientVisible : null,
        nextStatus,
        isBaselined,
        userId,
        id,
      ],
    );

    return res.rows[0];
  }

  // ========================================================
  // 2. Baselines & Formal Sign-Off Snapshots
  // ========================================================

  async baselineRequirement(id: string, dto: BaselineRequirementDto, userId: string) {
    const reqRes = await this.db.query(
      `SELECT * FROM requirement_specifications WHERE id = $1 AND is_active = TRUE`,
      [id],
    );
    if (reqRes.rowCount === 0) {
      throw new NotFoundException(`Requirement specification with ID ${id} not found`);
    }

    const req = reqRes.rows[0];

    // Fetch criteria
    const critRes = await this.db.query(
      `SELECT * FROM requirement_acceptance_criteria WHERE requirement_id = $1 AND is_active = TRUE ORDER BY order_index ASC`,
      [id],
    );

    if (critRes.rowCount === 0) {
      throw new BadRequestException('Cannot baseline requirement without at least one acceptance criterion');
    }

    // Freeze snapshot data
    const snapshot = {
      requirement: req,
      criteria: critRes.rows,
      snapshotTimestamp: new Date().toISOString(),
      baselinedBy: userId,
    };

    // Save into requirement_baselines
    const baselineRes = await this.db.query(
      `INSERT INTO requirement_baselines (
        requirement_id, version, baseline_name, snapshot_data,
        baselined_by, baselined_at, notes, is_active, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, TRUE, $5, $5)
      RETURNING *`,
      [
        id,
        req.version,
        dto.baselineName,
        JSON.stringify(snapshot),
        userId,
        dto.notes || null,
      ],
    );

    // Update requirement specification status
    await this.db.query(
      `UPDATE requirement_specifications
       SET is_baselined = TRUE,
           status = 'BASELINED',
           baselined_at = CURRENT_TIMESTAMP,
           baselined_by = $1,
           updated_by = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [userId, id],
    );

    return baselineRes.rows[0];
  }

  async proposeAmendment(id: string, userId: string) {
    const reqRes = await this.db.query(
      `SELECT * FROM requirement_specifications WHERE id = $1 AND is_active = TRUE`,
      [id],
    );
    if (reqRes.rowCount === 0) {
      throw new NotFoundException(`Requirement specification with ID ${id} not found`);
    }

    const req = reqRes.rows[0];
    if (!req.is_baselined) {
      throw new BadRequestException('Requirement is not currently baselined; proposal only applies to baselined revisions');
    }

    const newVersion = req.version + 1;

    const res = await this.db.query(
      `UPDATE requirement_specifications
       SET version = $1,
           status = 'AMENDED',
           is_baselined = FALSE,
           updated_by = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [newVersion, userId, id],
    );

    return res.rows[0];
  }

  // ========================================================
  // 3. Acceptance Criteria & Delivery Task Mapping
  // ========================================================

  async addCriterion(reqId: string, dto: CreateAcceptanceCriterionDto, userId: string) {
    const reqRes = await this.db.query(
      `SELECT * FROM requirement_specifications WHERE id = $1 AND is_active = TRUE`,
      [reqId],
    );
    if (reqRes.rowCount === 0) {
      throw new NotFoundException(`Requirement specification with ID ${reqId} not found`);
    }
    const req = reqRes.rows[0];

    // Determine code if not provided
    let code = dto.criteriaCode;
    if (!code) {
      const countRes = await this.db.query(
        `SELECT COUNT(*)::int as total FROM requirement_acceptance_criteria WHERE requirement_id = $1`,
        [reqId],
      );
      const nextIdx = countRes.rows[0].total + 1;
      code = `${req.req_code}-AC${nextIdx}`;
    }

    const orderIdx = dto.orderIndex || 1;

    const res = await this.db.query(
      `INSERT INTO requirement_acceptance_criteria (
        requirement_id, criteria_code, title, description,
        verification_method, implementation_status, order_index,
        is_active, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, 'NOT_STARTED', $6, TRUE, $7, $7)
      RETURNING *`,
      [
        reqId,
        code,
        dto.title,
        dto.description,
        dto.verificationMethod || 'MANUAL_TEST',
        orderIdx,
        userId,
      ],
    );

    return res.rows[0];
  }

  async updateCriterion(criterionId: string, dto: UpdateAcceptanceCriterionDto, userId: string) {
    const check = await this.db.query(
      `SELECT * FROM requirement_acceptance_criteria WHERE id = $1 AND is_active = TRUE`,
      [criterionId],
    );
    if (check.rowCount === 0) {
      throw new NotFoundException(`Acceptance criterion with ID ${criterionId} not found`);
    }

    const res = await this.db.query(
      `UPDATE requirement_acceptance_criteria
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           verification_method = COALESCE($3, verification_method),
           implementation_status = COALESCE($4, implementation_status),
           order_index = COALESCE($5, order_index),
           updated_by = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [
        dto.title || null,
        dto.description || null,
        dto.verificationMethod || null,
        dto.implementationStatus || null,
        dto.orderIndex || null,
        userId,
        criterionId,
      ],
    );

    return res.rows[0];
  }

  async deleteCriterion(criterionId: string) {
    const check = await this.db.query(
      `SELECT * FROM requirement_acceptance_criteria WHERE id = $1 AND is_active = TRUE`,
      [criterionId],
    );
    if (check.rowCount === 0) {
      throw new NotFoundException(`Acceptance criterion with ID ${criterionId} not found`);
    }

    await this.db.query(
      `UPDATE requirement_acceptance_criteria SET is_active = FALSE WHERE id = $1`,
      [criterionId],
    );

    return { message: 'Criterion deactivated successfully', id: criterionId };
  }

  async linkTasksToCriterion(criterionId: string, dto: LinkCriterionTasksDto, userId: string) {
    const check = await this.db.query(
      `SELECT * FROM requirement_acceptance_criteria WHERE id = $1 AND is_active = TRUE`,
      [criterionId],
    );
    if (check.rowCount === 0) {
      throw new NotFoundException(`Acceptance criterion with ID ${criterionId} not found`);
    }

    for (const taskId of dto.taskIds) {
      await this.db.query(
        `INSERT INTO requirement_criterion_tasks (criterion_id, task_id, notes, is_active, created_by, updated_by)
         VALUES ($1, $2, $3, TRUE, $4, $4)
         ON CONFLICT (criterion_id, task_id) DO NOTHING`,
        [criterionId, taskId, dto.notes || null, userId],
      );
    }

    // Auto-advance implementation status to IN_PROGRESS if currently NOT_STARTED
    if (check.rows[0].implementation_status === 'NOT_STARTED') {
      await this.db.query(
        `UPDATE requirement_acceptance_criteria
         SET implementation_status = 'IN_PROGRESS', updated_by = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [userId, criterionId],
      );
    }

    return { message: `${dto.taskIds.length} task(s) linked to criterion`, criterionId };
  }

  async unlinkTaskFromCriterion(criterionId: string, taskId: string) {
    await this.db.query(
      `DELETE FROM requirement_criterion_tasks WHERE criterion_id = $1 AND task_id = $2`,
      [criterionId, taskId],
    );
    return { message: 'Task unlinked from criterion', criterionId, taskId };
  }

  // ========================================================
  // 4. QA Verification & Client Sign-Off
  // ========================================================

  async recordQaVerification(criterionId: string, dto: QaVerifyCriterionDto, userId: string) {
    const check = await this.db.query(
      `SELECT * FROM requirement_acceptance_criteria WHERE id = $1 AND is_active = TRUE`,
      [criterionId],
    );
    if (check.rowCount === 0) {
      throw new NotFoundException(`Acceptance criterion with ID ${criterionId} not found`);
    }

    const nextStatus = dto.status || 'VERIFIED_QA';
    const evidenceJson = JSON.stringify(dto.evidenceUrls || []);

    const res = await this.db.query(
      `UPDATE requirement_acceptance_criteria
       SET qa_evidence_notes = COALESCE($1, qa_evidence_notes),
           qa_evidence_urls = $2::jsonb,
           qa_verified_by = $3,
           qa_verified_at = CURRENT_TIMESTAMP,
           implementation_status = $4,
           verification_method = COALESCE($5, verification_method),
           updated_by = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [
        dto.evidenceNotes || null,
        evidenceJson,
        userId,
        nextStatus,
        dto.verificationMethod || null,
        criterionId,
      ],
    );

    return res.rows[0];
  }

  async recordClientSignoff(
    criterionId: string,
    dto: ClientSignoffDto,
    contact: { contactId: string; clientId: string; isApprover: boolean },
  ) {
    const critRes = await this.db.query(
      `SELECT rac.*, r.project_id, r.product_id, r.is_client_visible, r.is_baselined
       FROM requirement_acceptance_criteria rac
       JOIN requirement_specifications r ON rac.requirement_id = r.id
       WHERE rac.id = $1 AND rac.is_active = TRUE`,
      [criterionId],
    );

    if (critRes.rowCount === 0) {
      throw new NotFoundException(`Acceptance criterion with ID ${criterionId} not found`);
    }

    const criterion = critRes.rows[0];

    // Must be client visible and baselined
    if (!criterion.is_client_visible || !criterion.is_baselined) {
      throw new ForbiddenException('Cannot sign off on unbaselined or non-published requirements');
    }

    // Verify client approver permission
    if (criterion.project_id) {
      const grantRes = await this.db.query(
        `SELECT can_approve_scope, can_approve_uat 
         FROM client_contact_projects 
         WHERE contact_id = $1 AND project_id = $2 AND is_active = TRUE`,
        [contact.contactId, criterion.project_id],
      );
      const grant = grantRes.rows[0];
      const hasPermission = contact.isApprover || (grant && (grant.can_approve_scope || grant.can_approve_uat));
      if (!hasPermission) {
        throw new ForbiddenException('Your contact account does not have approver authority for this project');
      }
    } else if (!contact.isApprover) {
      throw new ForbiddenException('Only designated client approvers can sign off on product criteria');
    }

    const nextImplStatus = dto.signoffStatus === 'ACCEPTED' ? 'ACCEPTED_CLIENT' : criterion.implementation_status;

    const res = await this.db.query(
      `UPDATE requirement_acceptance_criteria
       SET client_signoff_status = $1,
           client_signoff_by_contact_id = $2,
           client_signoff_at = CURRENT_TIMESTAMP,
           client_signoff_notes = $3,
           implementation_status = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [
        dto.signoffStatus,
        contact.contactId,
        dto.notes || null,
        nextImplStatus,
        criterionId,
      ],
    );

    return res.rows[0];
  }

  // ========================================================
  // 5. Traceability Matrix & Coverage Analytics
  // ========================================================

  async getTraceabilityMatrix(filter: { projectId?: string; productId?: string }) {
    let whereClause = `WHERE r.is_active = TRUE`;
    const params: any[] = [];
    let pIdx = 1;

    if (filter.projectId) {
      whereClause += ` AND r.project_id = $${pIdx++}`;
      params.push(filter.projectId);
    }
    if (filter.productId) {
      whereClause += ` AND r.product_id = $${pIdx++}`;
      params.push(filter.productId);
    }

    // 1. Detailed Matrix Rows
    const rowsRes = await this.db.query(
      `SELECT 
        r.id as requirement_id,
        r.req_code,
        r.title as requirement_title,
        r.status as requirement_status,
        r.version as requirement_version,
        r.is_baselined,
        r.is_client_visible,
        p.project_name,
        pr.product_name,
        cir.request_number as originating_request_number,
        rac.id as criterion_id,
        rac.criteria_code,
        rac.title as criterion_title,
        rac.verification_method,
        rac.implementation_status,
        rac.qa_verified_at,
        rac.client_signoff_status,
        rac.client_signoff_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', t.id,
              'taskCode', t.task_code,
              'title', t.title,
              'statusName', ts.status_name,
              'statusCategory', ts.status_category
            )
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'::json
        ) as linked_tasks
      FROM requirement_specifications r
      LEFT JOIN projects p ON r.project_id = p.id
      LEFT JOIN products pr ON r.product_id = pr.id
      LEFT JOIN client_intake_requests cir ON r.originating_request_id = cir.id
      LEFT JOIN requirement_acceptance_criteria rac ON r.id = rac.requirement_id AND rac.is_active = TRUE
      LEFT JOIN requirement_criterion_tasks rct ON rac.id = rct.criterion_id AND rct.is_active = TRUE
      LEFT JOIN tasks t ON rct.task_id = t.id
      LEFT JOIN task_statuses ts ON t.status_id = ts.id
      ${whereClause}
      GROUP BY r.id, p.id, pr.id, cir.id, rac.id
      ORDER BY r.req_code ASC, rac.order_index ASC`,
      params,
    );

    const rows = rowsRes.rows;

    // Aggregate summary metrics
    const totalRequirements = new Set(rows.map((r) => r.requirement_id)).size;
    const baselinedRequirements = new Set(rows.filter((r) => r.is_baselined).map((r) => r.requirement_id)).size;
    const criteriaRows = rows.filter((r) => r.criterion_id !== null);
    const totalCriteria = criteriaRows.length;

    const implementedCount = criteriaRows.filter(
      (r) => r.linked_tasks && JSON.parse(JSON.stringify(r.linked_tasks)).length > 0,
    ).length;
    const qaVerifiedCount = criteriaRows.filter((r) => r.implementation_status === 'VERIFIED_QA' || r.qa_verified_at !== null).length;
    const clientAcceptedCount = criteriaRows.filter((r) => r.client_signoff_status === 'ACCEPTED').length;

    // Coverage gaps
    const unimplementedCriteria = criteriaRows
      .filter((r) => !r.linked_tasks || JSON.parse(JSON.stringify(r.linked_tasks)).length === 0)
      .map((r) => ({
        requirementId: r.requirement_id,
        reqCode: r.req_code,
        criterionId: r.criterion_id,
        criteriaCode: r.criteria_code,
        criterionTitle: r.criterion_title,
      }));

    const unverifiedCriteria = criteriaRows
      .filter((r) => r.implementation_status !== 'VERIFIED_QA' && !r.qa_verified_at)
      .map((r) => ({
        requirementId: r.requirement_id,
        reqCode: r.req_code,
        criterionId: r.criterion_id,
        criteriaCode: r.criteria_code,
        criterionTitle: r.criterion_title,
      }));

    const unacceptedCriteria = criteriaRows
      .filter((r) => r.client_signoff_status !== 'ACCEPTED')
      .map((r) => ({
        requirementId: r.requirement_id,
        reqCode: r.req_code,
        criterionId: r.criterion_id,
        criteriaCode: r.criteria_code,
        criterionTitle: r.criterion_title,
        signoffStatus: r.client_signoff_status,
      }));

    return {
      summary: {
        totalRequirements,
        baselinedRequirements,
        totalCriteria,
        implementedCount,
        implementationCoveragePct: totalCriteria > 0 ? Math.round((implementedCount / totalCriteria) * 100) : 0,
        qaVerifiedCount,
        qaCoveragePct: totalCriteria > 0 ? Math.round((qaVerifiedCount / totalCriteria) * 100) : 0,
        clientAcceptedCount,
        clientAcceptedPct: totalCriteria > 0 ? Math.round((clientAcceptedCount / totalCriteria) * 100) : 0,
      },
      gaps: {
        unimplementedCriteria,
        unverifiedCriteria,
        unacceptedCriteria,
      },
      traceability: rows,
    };
  }

  // ========================================================
  // 6. Client Portal Allowlisted Read Endpoints (CLIENT-003)
  // ========================================================

  async getClientPortalRequirements(contactId: string, projectId?: string) {
    // 1. Fetch contact's permitted projects
    const grantsRes = await this.db.query(
      `SELECT project_id, can_view_milestones, can_approve_scope, can_approve_uat 
       FROM client_contact_projects 
       WHERE contact_id = $1 AND is_active = TRUE`,
      [contactId],
    );

    const grantedProjectIds = grantsRes.rows.map((g) => g.project_id);
    if (grantedProjectIds.length === 0) {
      return [];
    }

    let sql = `
      SELECT 
        r.id,
        r.req_code,
        r.title,
        r.module_name,
        r.business_objective,
        r.in_scope,
        r.out_of_scope,
        r.assumptions,
        r.version,
        r.is_baselined,
        r.baselined_at,
        p.id as project_id,
        p.project_name,
        p.project_code,
        COUNT(DISTINCT rac.id)::int as total_criteria,
        COUNT(DISTINCT CASE WHEN rac.client_signoff_status = 'ACCEPTED' THEN rac.id END)::int as accepted_criteria,
        COUNT(DISTINCT CASE WHEN rac.client_signoff_status = 'PENDING' THEN rac.id END)::int as pending_signoff_criteria
      FROM requirement_specifications r
      JOIN projects p ON r.project_id = p.id
      LEFT JOIN requirement_acceptance_criteria rac ON r.id = rac.requirement_id AND rac.is_active = TRUE
      WHERE r.is_active = TRUE 
        AND r.is_client_visible = TRUE 
        AND r.is_baselined = TRUE
        AND r.project_id = ANY($1::uuid[])
    `;

    const params: any[] = [grantedProjectIds];
    if (projectId) {
      sql += ` AND r.project_id = $2`;
      params.push(projectId);
    }

    sql += ` GROUP BY r.id, p.id ORDER BY r.baselined_at DESC, r.req_code ASC`;

    const res = await this.db.query(sql, params);
    return res.rows;
  }

  async getClientPortalRequirementDetail(requirementId: string, contactId: string) {
    const grantsRes = await this.db.query(
      `SELECT project_id, can_approve_scope, can_approve_uat 
       FROM client_contact_projects 
       WHERE contact_id = $1 AND is_active = TRUE`,
      [contactId],
    );
    const grantedProjectIds = grantsRes.rows.map((g) => g.project_id);

    const res = await this.db.query(
      `SELECT 
        r.id,
        r.req_code,
        r.title,
        r.module_name,
        r.business_objective,
        r.in_scope,
        r.out_of_scope,
        r.assumptions,
        r.version,
        r.is_baselined,
        r.baselined_at,
        p.id as project_id,
        p.project_name,
        p.project_code
      FROM requirement_specifications r
      JOIN projects p ON r.project_id = p.id
      WHERE r.id = $1 
        AND r.is_active = TRUE 
        AND r.is_client_visible = TRUE 
        AND r.is_baselined = TRUE
        AND r.project_id = ANY($2::uuid[])`,
      [requirementId, grantedProjectIds],
    );

    if (res.rowCount === 0) {
      throw new NotFoundException('Requirement specification not found or not accessible');
    }

    const requirement = res.rows[0];

    // Fetch criteria (sanitized: only description, verification method, status, client signoff)
    const criteriaRes = await this.db.query(
      `SELECT 
        rac.id,
        rac.criteria_code,
        rac.title,
        rac.description,
        rac.verification_method,
        rac.implementation_status,
        rac.order_index,
        rac.client_signoff_status,
        rac.client_signoff_at,
        rac.client_signoff_notes,
        CASE WHEN rac.qa_verified_at IS NOT NULL THEN TRUE ELSE FALSE END as is_qa_verified
      FROM requirement_acceptance_criteria rac
      WHERE rac.requirement_id = $1 AND rac.is_active = TRUE
      ORDER BY rac.order_index ASC, rac.criteria_code ASC`,
      [requirementId],
    );

    return {
      ...requirement,
      criteria: criteriaRes.rows,
    };
  }
}
