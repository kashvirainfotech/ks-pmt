import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateChangeRequestDto } from './dto/create-change-request.dto';
import { CreateRevisionDto } from './dto/create-revision.dto';
import { ReviewRevisionDto } from './dto/review-revision.dto';
import { ClientDecisionDto } from './dto/client-decision.dto';
import { LinkCrTasksDto } from './dto/link-cr-tasks.dto';
import { QueryChangeRequestsDto } from './dto/query-change-requests.dto';
import { ClientContactUser } from '../client-portal/client-portal.service';

@Injectable()
export class ChangeRequestsService {
  constructor(private readonly db: DatabaseService) {}

  // ========================================================
  // 1. Change Requests CRUD & Initial Creation
  // ========================================================

  async createChangeRequest(dto: CreateChangeRequestDto, userId: string) {
    if ((!dto.projectId && !dto.productId) || (dto.projectId && dto.productId)) {
      throw new BadRequestException('A change request must be linked to either a project or a product, but not both');
    }

    if (dto.projectId) {
      const projCheck = await this.db.query(
        `SELECT id FROM projects WHERE id = $1 AND is_active = TRUE`,
        [dto.projectId],
      );
      if (projCheck.rowCount === 0) {
        throw new NotFoundException(`Project with ID ${dto.projectId} not found`);
      }
    }

    if (dto.productId) {
      const prodCheck = await this.db.query(
        `SELECT id FROM products WHERE id = $1 AND is_active = TRUE`,
        [dto.productId],
      );
      if (prodCheck.rowCount === 0) {
        throw new NotFoundException(`Product with ID ${dto.productId} not found`);
      }
    }

    if (dto.originatingIntakeRequestId) {
      const reqCheck = await this.db.query(
        `SELECT id FROM client_intake_requests WHERE id = $1`,
        [dto.originatingIntakeRequestId],
      );
      if (reqCheck.rowCount === 0) {
        throw new NotFoundException(`Originating intake request with ID ${dto.originatingIntakeRequestId} not found`);
      }
    }

    if (dto.requirementId) {
      const reqCheck = await this.db.query(
        `SELECT id FROM requirement_specifications WHERE id = $1`,
        [dto.requirementId],
      );
      if (reqCheck.rowCount === 0) {
        throw new NotFoundException(`Requirement with ID ${dto.requirementId} not found`);
      }
    }

    const pmCheck = await this.db.query(
      `SELECT id FROM users WHERE id = $1 AND is_active = TRUE`,
      [dto.accountablePmUserId],
    );
    if (pmCheck.rowCount === 0) {
      throw new NotFoundException(`Accountable PM user with ID ${dto.accountablePmUserId} not found`);
    }

    const crNumber = dto.crNumber || `CR-${Date.now().toString().slice(-6)}`;

    return this.db.transaction(async (client) => {
      // 1. Insert Change Request header
      const crInsert = await client.query(
        `INSERT INTO change_requests (
          cr_number, project_id, product_id, originating_intake_request_id,
          requirement_id, title, description, business_justification,
          impact_summary, accountable_pm_user_id, current_revision,
          status, linked_milestone_id, is_active, created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1, 'DRAFT', $11, TRUE, $12, $12
        ) RETURNING *`,
        [
          crNumber,
          dto.projectId || null,
          dto.productId || null,
          dto.originatingIntakeRequestId || null,
          dto.requirementId || null,
          dto.title,
          dto.description,
          dto.businessJustification,
          dto.impactSummary || null,
          dto.accountablePmUserId,
          dto.linkedMilestoneId || null,
          userId,
        ],
      );

      const cr = crInsert.rows[0];

      // 2. Insert Revision 1
      const revInsert = await client.query(
        `INSERT INTO change_request_revisions (
          change_request_id, revision_number, scope_description, deliverables,
          estimated_hours, quoted_price, currency, schedule_delay_days,
          revised_delivery_date, revision_reason, status, submitted_by_user_id,
          is_active, created_by, updated_by
        ) VALUES (
          $1, 1, $2, $3, $4, $5, $6, $7, $8, $9, 'DRAFT', $10, TRUE, $10, $10
        ) RETURNING *`,
        [
          cr.id,
          dto.scopeDescription,
          JSON.stringify(dto.deliverables || []),
          dto.estimatedHours || 0,
          dto.quotedPrice || 0,
          dto.currency || 'INR',
          dto.scheduleDelayDays || 0,
          dto.revisedDeliveryDate || null,
          dto.revisionReason || 'Initial scope and quotation',
          userId,
        ],
      );

      return {
        ...cr,
        currentRevision: revInsert.rows[0],
      };
    });
  }

  async getChangeRequests(query: QueryChangeRequestsDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT 
        cr.*,
        p.project_name,
        p.project_code,
        pr.product_name,
        pr.product_code,
        u.first_name || ' ' || u.last_name as accountable_pm_name,
        u.email as accountable_pm_email,
        cir.request_number as originating_request_number,
        cir.title as originating_request_title,
        m.name as linked_milestone_name,
        crr.revision_number,
        crr.scope_description,
        crr.deliverables,
        crr.estimated_hours,
        crr.quoted_price,
        crr.currency,
        crr.schedule_delay_days,
        crr.revised_delivery_date,
        crr.status as revision_status,
        crr.client_decision,
        crr.decided_at,
        crr.client_remarks,
        COUNT(DISTINCT crt.task_id)::int as linked_tasks_count
      FROM change_requests cr
      LEFT JOIN projects p ON cr.project_id = p.id
      LEFT JOIN products pr ON cr.product_id = pr.id
      LEFT JOIN users u ON cr.accountable_pm_user_id = u.id
      LEFT JOIN client_intake_requests cir ON cr.originating_intake_request_id = cir.id
      LEFT JOIN milestones m ON cr.linked_milestone_id = m.id
      LEFT JOIN change_request_revisions crr ON cr.id = crr.change_request_id AND cr.current_revision = crr.revision_number
      LEFT JOIN change_request_tasks crt ON cr.id = crt.change_request_id AND crt.is_active = TRUE
      WHERE cr.is_active = TRUE
    `;

    const params: any[] = [];
    let pIndex = 1;

    if (query.projectId) {
      sql += ` AND cr.project_id = $${pIndex++}`;
      params.push(query.projectId);
    }

    if (query.productId) {
      sql += ` AND cr.product_id = $${pIndex++}`;
      params.push(query.productId);
    }

    if (query.status) {
      sql += ` AND cr.status = $${pIndex++}`;
      params.push(query.status);
    }

    if (query.search) {
      sql += ` AND (cr.title ILIKE $${pIndex} OR cr.cr_number ILIKE $${pIndex} OR cr.description ILIKE $${pIndex})`;
      params.push(`%${query.search}%`);
      pIndex++;
    }

    sql += ` GROUP BY cr.id, p.project_name, p.project_code, pr.product_name, pr.product_code, u.first_name, u.last_name, u.email, cir.request_number, cir.title, m.name, crr.id`;
    sql += ` ORDER BY cr.created_at DESC`;

    const countSql = `SELECT COUNT(DISTINCT cr.id) as total FROM change_requests cr WHERE cr.is_active = TRUE` +
      (query.projectId ? ` AND cr.project_id = '${query.projectId}'` : '') +
      (query.productId ? ` AND cr.product_id = '${query.productId}'` : '') +
      (query.status ? ` AND cr.status = '${query.status}'` : '') +
      (query.search ? ` AND (cr.title ILIKE '%${query.search}%' OR cr.cr_number ILIKE '%${query.search}%')` : '');

    const [dataRes, countRes] = await Promise.all([
      this.db.query(`${sql} LIMIT $${pIndex++} OFFSET $${pIndex++}`, [...params, limit, offset]),
      this.db.query(countSql),
    ]);

    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    return {
      data: dataRes.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getChangeRequestById(id: string) {
    const crRes = await this.db.query(
      `SELECT 
        cr.*,
        p.project_name,
        p.project_code,
        pr.product_name,
        pr.product_code,
        u.first_name || ' ' || u.last_name as accountable_pm_name,
        u.email as accountable_pm_email,
        cir.request_number as originating_request_number,
        cir.title as originating_request_title,
        m.name as linked_milestone_name
      FROM change_requests cr
      LEFT JOIN projects p ON cr.project_id = p.id
      LEFT JOIN products pr ON cr.product_id = pr.id
      LEFT JOIN users u ON cr.accountable_pm_user_id = u.id
      LEFT JOIN client_intake_requests cir ON cr.originating_intake_request_id = cir.id
      LEFT JOIN milestones m ON cr.linked_milestone_id = m.id
      WHERE cr.id = $1 AND cr.is_active = TRUE`,
      [id],
    );

    if (crRes.rowCount === 0) {
      throw new NotFoundException(`Change Request with ID ${id} not found`);
    }

    const cr = crRes.rows[0];

    // Fetch all revisions
    const revsRes = await this.db.query(
      `SELECT 
        crr.*,
        sub.first_name || ' ' || sub.last_name as submitted_by_name,
        rev.first_name || ' ' || rev.last_name as internal_reviewed_by_name,
        cc.first_name || ' ' || cc.last_name as decided_by_contact_name,
        cc.email as decided_by_contact_email,
        c.company_name as decided_by_client_company
      FROM change_request_revisions crr
      LEFT JOIN users sub ON crr.submitted_by_user_id = sub.id
      LEFT JOIN users rev ON crr.internal_reviewed_by = rev.id
      LEFT JOIN client_contacts cc ON crr.decided_by_contact_id = cc.id
      LEFT JOIN clients c ON cc.client_id = c.id
      WHERE crr.change_request_id = $1 AND crr.is_active = TRUE
      ORDER BY crr.revision_number DESC`,
      [id],
    );

    // Fetch linked delivery tasks
    const tasksRes = await this.db.query(
      `SELECT 
        crt.id as mapping_id,
        crt.is_scope_addition,
        crt.notes as mapping_notes,
        crt.created_at as linked_at,
        t.id as task_id,
        t.task_code,
        t.title as task_title,
        t.status as task_status,
        t.priority as task_priority,
        t.estimated_hours,
        t.actual_hours,
        assignee.first_name || ' ' || assignee.last_name as assignee_name
      FROM change_request_tasks crt
      JOIN tasks t ON crt.task_id = t.id
      LEFT JOIN users assignee ON t.assignee_id = assignee.id
      WHERE crt.change_request_id = $1 AND crt.is_active = TRUE
      ORDER BY t.task_code ASC`,
      [id],
    );

    return {
      ...cr,
      revisions: revsRes.rows,
      tasks: tasksRes.rows,
    };
  }

  // ========================================================
  // 2. Internal Review Lifecycle
  // ========================================================

  async submitForInternalReview(id: string, userId: string) {
    const cr = await this.getChangeRequestById(id);

    const currentRev = cr.revisions.find((r: any) => r.revision_number === cr.current_revision);
    if (!currentRev) {
      throw new NotFoundException(`Current revision ${cr.current_revision} not found`);
    }

    if (currentRev.status !== 'DRAFT' && currentRev.status !== 'CHANGES_REQUESTED') {
      throw new BadRequestException(
        `Cannot submit for internal review: current revision status is ${currentRev.status} (must be DRAFT or CHANGES_REQUESTED)`,
      );
    }

    return this.db.transaction(async (client) => {
      await client.query(
        `UPDATE change_request_revisions 
         SET status = 'INTERNAL_REVIEW', updated_by = $1, updated_at = CURRENT_TIMESTAMP
         WHERE change_request_id = $2 AND revision_number = $3`,
        [userId, id, cr.current_revision],
      );

      const crUpdate = await client.query(
        `UPDATE change_requests
         SET status = 'INTERNAL_REVIEW', updated_by = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [userId, id],
      );

      return crUpdate.rows[0];
    });
  }

  async reviewRevision(id: string, revisionNumber: number, dto: ReviewRevisionDto, userId: string) {
    const cr = await this.getChangeRequestById(id);

    const targetRev = cr.revisions.find((r: any) => r.revision_number === revisionNumber);
    if (!targetRev) {
      throw new NotFoundException(`Revision ${revisionNumber} not found for change request ${id}`);
    }

    if (targetRev.status !== 'INTERNAL_REVIEW') {
      throw new BadRequestException(`Revision ${revisionNumber} is in status ${targetRev.status}, not INTERNAL_REVIEW`);
    }

    return this.db.transaction(async (client) => {
      const revUpdate = await client.query(
        `UPDATE change_request_revisions
         SET status = $1,
             internal_reviewed_by = $2,
             internal_reviewed_at = CURRENT_TIMESTAMP,
             internal_review_notes = $3,
             updated_by = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE change_request_id = $4 AND revision_number = $5
         RETURNING *`,
        [dto.status, userId, dto.internalReviewNotes || null, id, revisionNumber],
      );

      await client.query(
        `UPDATE change_requests
         SET status = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [dto.status, userId, id],
      );

      return revUpdate.rows[0];
    });
  }

  // ========================================================
  // 3. Material Revisions (Creates N+1, Requires Re-Approval)
  // ========================================================

  async createMaterialRevision(id: string, dto: CreateRevisionDto, userId: string) {
    const cr = await this.getChangeRequestById(id);

    const nextRevisionNumber = cr.current_revision + 1;
    const initialStatus = dto.submitForInternalReview ? 'INTERNAL_REVIEW' : 'DRAFT';

    return this.db.transaction(async (client) => {
      // 1. Supersede previous active revision if it was in review or draft
      await client.query(
        `UPDATE change_request_revisions
         SET status = 'SUPERSEDED', updated_by = $1, updated_at = CURRENT_TIMESTAMP
         WHERE change_request_id = $2 AND revision_number = $3 AND status IN ('DRAFT', 'INTERNAL_REVIEW', 'AWAITING_CLIENT')`,
        [userId, id, cr.current_revision],
      );

      // 2. Insert new revision
      const revInsert = await client.query(
        `INSERT INTO change_request_revisions (
          change_request_id, revision_number, scope_description, deliverables,
          estimated_hours, quoted_price, currency, schedule_delay_days,
          revised_delivery_date, revision_reason, status, submitted_by_user_id,
          is_active, created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, TRUE, $12, $12
        ) RETURNING *`,
        [
          id,
          nextRevisionNumber,
          dto.scopeDescription,
          JSON.stringify(dto.deliverables || []),
          dto.estimatedHours || 0,
          dto.quotedPrice || 0,
          dto.currency || 'INR',
          dto.scheduleDelayDays || 0,
          dto.revisedDeliveryDate || null,
          dto.revisionReason,
          initialStatus,
          userId,
        ],
      );

      // 3. Update change request header pointer
      const crUpdate = await client.query(
        `UPDATE change_requests
         SET current_revision = $1, status = $2, updated_by = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [nextRevisionNumber, initialStatus, userId, id],
      );

      return {
        ...crUpdate.rows[0],
        newRevision: revInsert.rows[0],
      };
    });
  }

  // ========================================================
  // 4. Client Approver Decision Recording
  // ========================================================

  async recordClientDecision(
    id: string,
    revisionNumber: number,
    dto: ClientDecisionDto,
    contactUser?: ClientContactUser,
    internalUserId?: string,
  ) {
    const cr = await this.getChangeRequestById(id);

    if (revisionNumber !== cr.current_revision) {
      throw new BadRequestException(
        `Client decision can only be recorded on current revision (rev ${cr.current_revision}). Revision ${revisionNumber} is historical/superseded.`,
      );
    }

    const currentRev = cr.revisions.find((r: any) => r.revision_number === revisionNumber);
    if (!currentRev) {
      throw new NotFoundException(`Revision ${revisionNumber} not found`);
    }

    // Must be in AWAITING_CLIENT status (or internal user authorized override)
    if (currentRev.status !== 'AWAITING_CLIENT' && !internalUserId) {
      throw new BadRequestException(
        `Revision ${revisionNumber} is in status ${currentRev.status}, must be AWAITING_CLIENT for client decision`,
      );
    }

    // Verify contact authority if submitted directly by contact
    if (contactUser) {
      if (cr.project_id) {
        const grantRes = await this.db.query(
          `SELECT can_approve_scope 
           FROM client_contact_projects 
           WHERE contact_id = $1 AND project_id = $2 AND is_active = TRUE`,
          [contactUser.contactId, cr.project_id],
        );
        const grant = grantRes.rows[0];
        const hasScopeApproval = contactUser.isApprover || (grant && grant.can_approve_scope);
        if (!hasScopeApproval) {
          throw new ForbiddenException('Your contact account does not have scope approval authority for this project');
        }
      } else if (!contactUser.isApprover) {
        throw new ForbiddenException('Only designated client approvers can approve product change requests');
      }
    }

    const decidedByContactId = contactUser?.contactId || dto.contactId || null;
    const actorId = internalUserId || contactUser?.id || decidedByContactId;

    return this.db.transaction(async (client) => {
      // 1. Update revision record
      const revUpdate = await client.query(
        `UPDATE change_request_revisions
         SET client_decision = $1,
             decided_by_contact_id = $2,
             decided_at = CURRENT_TIMESTAMP,
             client_remarks = $3,
             status = $4,
             updated_by = $5,
             updated_at = CURRENT_TIMESTAMP
         WHERE change_request_id = $6 AND revision_number = $7
         RETURNING *`,
        [
          dto.decision,
          decidedByContactId,
          dto.remarks || null,
          dto.decision,
          actorId,
          id,
          revisionNumber,
        ],
      );

      // 2. Update CR status
      const crUpdate = await client.query(
        `UPDATE change_requests
         SET status = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [dto.decision, actorId, id],
      );

      // 3. If approved and originating intake request exists, update intake request status or activity
      if (dto.decision === 'APPROVED' && cr.originating_intake_request_id) {
        await client.query(
          `UPDATE client_intake_requests
           SET status = 'IN_DELIVERY', updated_at = CURRENT_TIMESTAMP
           WHERE id = $1 AND status IN ('UNDER_REVIEW', 'AWAITING_CLIENT')`,
          [cr.originating_intake_request_id],
        );
      }

      return {
        ...crUpdate.rows[0],
        decidedRevision: revUpdate.rows[0],
      };
    });
  }

  // ========================================================
  // 5. Link Delivery Tasks to Approved Change Requests
  // ========================================================

  async linkDeliveryTasks(id: string, dto: LinkCrTasksDto, userId: string) {
    const cr = await this.getChangeRequestById(id);

    if (cr.status !== 'APPROVED') {
      throw new BadRequestException('Only APPROVED change requests can be linked to delivery tasks');
    }

    if (!dto.taskIds || dto.taskIds.length === 0) {
      throw new BadRequestException('At least one task ID must be provided');
    }

    const isScopeAddition = dto.isScopeAddition ?? true;

    return this.db.transaction(async (client) => {
      for (const taskId of dto.taskIds) {
        // Validate task belongs to same project if project-linked
        if (cr.project_id) {
          const taskCheck = await client.query(
            `SELECT id FROM tasks WHERE id = $1 AND project_id = $2`,
            [taskId, cr.project_id],
          );
          if (taskCheck.rowCount === 0) {
            throw new BadRequestException(`Task ${taskId} does not belong to project ${cr.project_id}`);
          }
        }

        await client.query(
          `INSERT INTO change_request_tasks (
            change_request_id, task_id, is_scope_addition, is_active, created_by, updated_by
          ) VALUES ($1, $2, $3, TRUE, $4, $4)
          ON CONFLICT (change_request_id, task_id) 
          DO UPDATE SET is_scope_addition = EXCLUDED.is_scope_addition, updated_by = EXCLUDED.updated_by, updated_at = CURRENT_TIMESTAMP`,
          [id, taskId, isScopeAddition, userId],
        );
      }

      const tasksRes = await client.query(
        `SELECT crt.*, t.task_code, t.title as task_title, t.status as task_status
         FROM change_request_tasks crt
         JOIN tasks t ON crt.task_id = t.id
         WHERE crt.change_request_id = $1 AND crt.is_active = TRUE`,
        [id],
      );

      return {
        message: `Successfully linked ${dto.taskIds.length} tasks to change request ${cr.cr_number}`,
        linkedTasks: tasksRes.rows,
      };
    });
  }

  async unlinkDeliveryTask(id: string, taskId: string) {
    const res = await this.db.query(
      `DELETE FROM change_request_tasks WHERE change_request_id = $1 AND task_id = $2 RETURNING id`,
      [id, taskId],
    );

    if (res.rowCount === 0) {
      throw new NotFoundException(`Task mapping between CR ${id} and Task ${taskId} not found`);
    }

    return { message: 'Task unlinked from change request successfully' };
  }

  // ========================================================
  // 6. Client Portal Accessible Read & Decision
  // ========================================================

  async getClientPortalChangeRequests(contact: ClientContactUser, projectId?: string) {
    let sql = `
      SELECT 
        cr.id,
        cr.cr_number,
        cr.title,
        cr.description,
        cr.business_justification,
        cr.impact_summary,
        cr.current_revision,
        cr.status,
        cr.created_at,
        cr.updated_at,
        p.project_name,
        p.project_code,
        pr.product_name,
        pr.product_code,
        u.first_name || ' ' || u.last_name as accountable_pm_name,
        crr.revision_number,
        crr.scope_description,
        crr.deliverables,
        crr.quoted_price,
        crr.currency,
        crr.schedule_delay_days,
        crr.revised_delivery_date,
        crr.status as revision_status,
        crr.client_decision,
        crr.decided_at,
        crr.client_remarks
      FROM change_requests cr
      LEFT JOIN projects p ON cr.project_id = p.id
      LEFT JOIN products pr ON cr.product_id = pr.id
      LEFT JOIN users u ON cr.accountable_pm_user_id = u.id
      LEFT JOIN change_request_revisions crr ON cr.id = crr.change_request_id AND cr.current_revision = crr.revision_number
      WHERE cr.is_active = TRUE
        AND cr.status IN ('AWAITING_CLIENT', 'APPROVED', 'CHANGES_REQUESTED', 'REJECTED', 'DEFERRED', 'WITHDRAWN')
    `;

    const params: any[] = [];
    let pIdx = 1;

    // Contact project isolation
    sql += ` AND (
      cr.project_id IN (
        SELECT project_id FROM client_contact_projects WHERE contact_id = $${pIdx} AND is_active = TRUE
      )
      OR cr.project_id IN (
        SELECT id FROM projects WHERE client_id = $${pIdx + 1}
      )
    )`;
    params.push(contact.contactId, contact.clientId);
    pIdx += 2;

    if (projectId) {
      sql += ` AND cr.project_id = $${pIdx++}`;
      params.push(projectId);
    }

    sql += ` ORDER BY cr.created_at DESC`;

    const res = await this.db.query(sql, params);
    return res.rows;
  }

  async getClientPortalChangeRequestDetail(id: string, contact: ClientContactUser) {
    const crRes = await this.db.query(
      `SELECT 
        cr.id,
        cr.cr_number,
        cr.title,
        cr.description,
        cr.business_justification,
        cr.impact_summary,
        cr.current_revision,
        cr.status,
        cr.project_id,
        cr.product_id,
        cr.created_at,
        cr.updated_at,
        p.project_name,
        p.project_code,
        pr.product_name,
        pr.product_code,
        u.first_name || ' ' || u.last_name as accountable_pm_name
      FROM change_requests cr
      LEFT JOIN projects p ON cr.project_id = p.id
      LEFT JOIN products pr ON cr.product_id = pr.id
      LEFT JOIN users u ON cr.accountable_pm_user_id = u.id
      WHERE cr.id = $1 AND cr.is_active = TRUE
        AND cr.status IN ('AWAITING_CLIENT', 'APPROVED', 'CHANGES_REQUESTED', 'REJECTED', 'DEFERRED', 'WITHDRAWN')
        AND (
          cr.project_id IN (
            SELECT project_id FROM client_contact_projects WHERE contact_id = $2 AND is_active = TRUE
          )
          OR cr.project_id IN (
            SELECT id FROM projects WHERE client_id = $3
          )
        )`,
      [id, contact.contactId, contact.clientId],
    );

    if (crRes.rowCount === 0) {
      throw new NotFoundException(`Change request not found or not published to client`);
    }

    const cr = crRes.rows[0];

    // Client safe revisions - ZERO LEAKAGE OF INTERNAL NOTES
    const revsRes = await this.db.query(
      `SELECT 
        crr.id,
        crr.revision_number,
        crr.scope_description,
        crr.deliverables,
        crr.quoted_price,
        crr.currency,
        crr.schedule_delay_days,
        crr.revised_delivery_date,
        crr.revision_reason,
        crr.status,
        crr.submitted_at,
        crr.client_decision,
        crr.decided_at,
        crr.client_remarks,
        cc.first_name || ' ' || cc.last_name as decided_by_contact_name
      FROM change_request_revisions crr
      LEFT JOIN client_contacts cc ON crr.decided_by_contact_id = cc.id
      WHERE crr.change_request_id = $1 AND crr.is_active = TRUE
        AND crr.status IN ('AWAITING_CLIENT', 'APPROVED', 'CHANGES_REQUESTED', 'REJECTED', 'SUPERSEDED')
      ORDER BY crr.revision_number DESC`,
      [id],
    );

    // Linked tasks that are marked client visible
    const tasksRes = await this.db.query(
      `SELECT 
        t.id,
        t.task_code,
        t.title,
        t.status,
        crt.is_scope_addition
      FROM change_request_tasks crt
      JOIN tasks t ON crt.task_id = t.id
      WHERE crt.change_request_id = $1 AND crt.is_active = TRUE
      ORDER BY t.task_code ASC`,
      [id],
    );

    return {
      ...cr,
      revisions: revsRes.rows,
      tasks: tasksRes.rows,
    };
  }
}
