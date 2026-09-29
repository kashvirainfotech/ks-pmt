import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateUatPackageDto } from './dto/create-uat-package.dto';
import { CreateUatRevisionDto } from './dto/create-uat-revision.dto';
import { ReviewUatRevisionDto } from './dto/review-uat-revision.dto';
import { RecordChecklistProgressDto } from './dto/record-checklist-progress.dto';
import { ClientUatDecisionDto } from './dto/client-uat-decision.dto';
import { RecordInstalledVersionDto } from './dto/record-installed-version.dto';
import { QueryUatPackagesDto } from './dto/query-uat-packages.dto';
import { ClientContactUser } from '../client-portal/client-portal.service';

@Injectable()
export class UatPackagesService {
  constructor(private readonly db: DatabaseService) {}

  // ========================================================
  // 1. UAT Package Creation & Querying
  // ========================================================

  async createUatPackage(dto: CreateUatPackageDto, userId: string) {
    if ((!dto.projectId && !dto.productId) || (dto.projectId && dto.productId)) {
      throw new BadRequestException('A UAT package must be linked to either a project or a product, but not both');
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

    if (dto.versionId) {
      const vCheck = await this.db.query(
        `SELECT id FROM versions WHERE id = $1 AND is_active = TRUE`,
        [dto.versionId],
      );
      if (vCheck.rowCount === 0) {
        throw new NotFoundException(`Version with ID ${dto.versionId} not found`);
      }
    }

    if (dto.milestoneId) {
      const mCheck = await this.db.query(
        `SELECT id FROM milestones WHERE id = $1`,
        [dto.milestoneId],
      );
      if (mCheck.rowCount === 0) {
        throw new NotFoundException(`Milestone with ID ${dto.milestoneId} not found`);
      }
    }

    const packageCode = dto.packageCode || `UAT-${Date.now().toString().slice(-6)}`;

    return this.db.transaction(async (client) => {
      // 1. Insert UAT Package Header
      const pkgInsert = await client.query(
        `INSERT INTO uat_packages (
          package_code, project_id, product_id, version_id, milestone_id,
          title, description, environment_url, build_number,
          test_credentials_instructions, current_revision, status,
          target_signoff_date, prepared_by_user_id, qa_lead_user_id,
          is_active, created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1, 'DRAFT', $11, $12, $13, TRUE, $12, $12
        ) RETURNING *`,
        [
          packageCode,
          dto.projectId || null,
          dto.productId || null,
          dto.versionId || null,
          dto.milestoneId || null,
          dto.title,
          dto.description,
          dto.environmentUrl || null,
          dto.buildNumber || null,
          dto.testCredentialsInstructions || null,
          dto.targetSignoffDate || null,
          userId,
          dto.qaLeadUserId || null,
        ],
      );

      const pkg = pkgInsert.rows[0];

      // 2. Insert Revision 1
      const revInsert = await client.query(
        `INSERT INTO uat_package_revisions (
          package_id, revision_number, revision_notes, status,
          known_issues, test_evidence_urls, is_active, created_by, updated_by
        ) VALUES (
          $1, 1, $2, 'DRAFT', $3, $4, TRUE, $5, $5
        ) RETURNING *`,
        [
          pkg.id,
          dto.revisionNotes || 'Initial UAT package release candidate',
          JSON.stringify(dto.knownIssues || []),
          JSON.stringify(dto.testEvidenceUrls || []),
          userId,
        ],
      );

      const rev = revInsert.rows[0];

      // 3. Insert Checklist Items if provided
      const items: any[] = [];
      if (dto.checklistItems && dto.checklistItems.length > 0) {
        let idx = 1;
        for (const item of dto.checklistItems) {
          const itemCode = item.itemCode || `CHK-${String(idx).padStart(2, '0')}`;
          const itemRes = await client.query(
            `INSERT INTO uat_checklist_items (
              package_revision_id, item_code, title, instructions, expected_outcome,
              criterion_id, order_index, developer_done, qa_verified, client_status,
              is_active, created_by, updated_by
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, FALSE, FALSE, 'PENDING', TRUE, $8, $8
            ) RETURNING *`,
            [
              rev.id,
              itemCode,
              item.title,
              item.instructions,
              item.expectedOutcome,
              item.criterionId || null,
              item.orderIndex || idx,
              userId,
            ],
          );
          items.push(itemRes.rows[0]);
          idx++;
        }
      }

      return {
        ...pkg,
        currentRevision: {
          ...rev,
          checklistItems: items,
        },
      };
    });
  }

  async getUatPackages(query: QueryUatPackagesDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT 
        up.*,
        p.project_name,
        p.project_code,
        pr.product_name,
        pr.product_code,
        v.version_name,
        m.name as milestone_name,
        prep.first_name || ' ' || prep.last_name as prepared_by_name,
        qa.first_name || ' ' || qa.last_name as qa_lead_name,
        upr.revision_number,
        upr.status as revision_status,
        upr.client_decision,
        upr.decided_at,
        upr.submitted_to_client_at,
        COUNT(DISTINCT uci.id)::int as total_checklist_items,
        COUNT(DISTINCT CASE WHEN uci.developer_done = TRUE THEN uci.id END)::int as dev_done_items,
        COUNT(DISTINCT CASE WHEN uci.qa_verified = TRUE THEN uci.id END)::int as qa_verified_items,
        COUNT(DISTINCT CASE WHEN uci.client_status = 'PASSED' THEN uci.id END)::int as client_passed_items,
        COUNT(DISTINCT CASE WHEN uci.client_status = 'FAILED' THEN uci.id END)::int as client_failed_items
      FROM uat_packages up
      LEFT JOIN projects p ON up.project_id = p.id
      LEFT JOIN products pr ON up.product_id = pr.id
      LEFT JOIN versions v ON up.version_id = v.id
      LEFT JOIN milestones m ON up.milestone_id = m.id
      LEFT JOIN users prep ON up.prepared_by_user_id = prep.id
      LEFT JOIN users qa ON up.qa_lead_user_id = qa.id
      LEFT JOIN uat_package_revisions upr ON up.id = upr.package_id AND up.current_revision = upr.revision_number
      LEFT JOIN uat_checklist_items uci ON upr.id = uci.package_revision_id AND uci.is_active = TRUE
      WHERE up.is_active = TRUE
    `;

    const params: any[] = [];
    let pIndex = 1;

    if (query.projectId) {
      sql += ` AND up.project_id = $${pIndex++}`;
      params.push(query.projectId);
    }

    if (query.productId) {
      sql += ` AND up.product_id = $${pIndex++}`;
      params.push(query.productId);
    }

    if (query.status) {
      sql += ` AND up.status = $${pIndex++}`;
      params.push(query.status);
    }

    if (query.search) {
      sql += ` AND (up.title ILIKE $${pIndex} OR up.package_code ILIKE $${pIndex} OR up.description ILIKE $${pIndex})`;
      params.push(`%${query.search}%`);
      pIndex++;
    }

    sql += ` GROUP BY up.id, p.project_name, p.project_code, pr.product_name, pr.product_code, v.version_name, m.name, prep.first_name, prep.last_name, qa.first_name, qa.last_name, upr.id`;
    sql += ` ORDER BY up.created_at DESC`;

    const countSql = `SELECT COUNT(DISTINCT up.id) as total FROM uat_packages up WHERE up.is_active = TRUE` +
      (query.projectId ? ` AND up.project_id = '${query.projectId}'` : '') +
      (query.productId ? ` AND up.product_id = '${query.productId}'` : '') +
      (query.status ? ` AND up.status = '${query.status}'` : '') +
      (query.search ? ` AND (up.title ILIKE '%${query.search}%' OR up.package_code ILIKE '%${query.search}%')` : '');

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

  async getUatPackageById(id: string) {
    const pkgRes = await this.db.query(
      `SELECT 
        up.*,
        p.project_name,
        p.project_code,
        pr.product_name,
        pr.product_code,
        v.version_name,
        m.name as milestone_name,
        prep.first_name || ' ' || prep.last_name as prepared_by_name,
        qa.first_name || ' ' || qa.last_name as qa_lead_name
      FROM uat_packages up
      LEFT JOIN projects p ON up.project_id = p.id
      LEFT JOIN products pr ON up.product_id = pr.id
      LEFT JOIN versions v ON up.version_id = v.id
      LEFT JOIN milestones m ON up.milestone_id = m.id
      LEFT JOIN users prep ON up.prepared_by_user_id = prep.id
      LEFT JOIN users qa ON up.qa_lead_user_id = qa.id
      WHERE up.id = $1 AND up.is_active = TRUE`,
      [id],
    );

    if (pkgRes.rowCount === 0) {
      throw new NotFoundException(`UAT Package with ID ${id} not found`);
    }

    const pkg = pkgRes.rows[0];

    // Fetch all revisions
    const revsRes = await this.db.query(
      `SELECT 
        upr.*,
        qa.first_name || ' ' || qa.last_name as qa_approved_by_name,
        cc.first_name || ' ' || cc.last_name as decided_by_contact_name,
        cc.email as decided_by_contact_email,
        c.company_name as decided_by_client_company
      FROM uat_package_revisions upr
      LEFT JOIN users qa ON upr.qa_approved_by = qa.id
      LEFT JOIN client_contacts cc ON upr.decided_by_contact_id = cc.id
      LEFT JOIN clients c ON cc.client_id = c.id
      WHERE upr.package_id = $1 AND upr.is_active = TRUE
      ORDER BY upr.revision_number DESC`,
      [id],
    );

    // Fetch checklist items for all revisions
    const itemsRes = await this.db.query(
      `SELECT 
        uci.*,
        qa.first_name || ' ' || qa.last_name as qa_verified_by_name,
        cc.first_name || ' ' || cc.last_name as client_tested_by_contact_name,
        rac.criteria_code,
        rac.title as criteria_title,
        t.task_code as linked_defect_code,
        t.title as linked_defect_title,
        t.status as linked_defect_status
      FROM uat_checklist_items uci
      LEFT JOIN users qa ON uci.qa_verified_by = qa.id
      LEFT JOIN client_contacts cc ON uci.client_tested_by_contact_id = cc.id
      LEFT JOIN requirement_acceptance_criteria rac ON uci.criterion_id = rac.id
      LEFT JOIN tasks t ON uci.linked_defect_task_id = t.id
      WHERE uci.package_revision_id IN (
        SELECT id FROM uat_package_revisions WHERE package_id = $1 AND is_active = TRUE
      ) AND uci.is_active = TRUE
      ORDER BY uci.order_index ASC, uci.item_code ASC`,
      [id],
    );

    // Group items by revision ID
    const revisionsWithItems = revsRes.rows.map((rev) => ({
      ...rev,
      checklistItems: itemsRes.rows.filter((item) => item.package_revision_id === rev.id),
    }));

    return {
      ...pkg,
      revisions: revisionsWithItems,
    };
  }

  // ========================================================
  // 2. Internal QA Review & Package Submission
  // ========================================================

  async submitForQaReview(id: string, userId: string) {
    const pkg = await this.getUatPackageById(id);

    const currentRev = pkg.revisions.find((r: any) => r.revision_number === pkg.current_revision);
    if (!currentRev) {
      throw new NotFoundException(`Current revision ${pkg.current_revision} not found`);
    }

    if (currentRev.status !== 'DRAFT' && currentRev.status !== 'CHANGES_REQUESTED') {
      throw new BadRequestException(
        `Cannot submit for internal QA: current revision status is ${currentRev.status} (must be DRAFT or CHANGES_REQUESTED)`,
      );
    }

    return this.db.transaction(async (client) => {
      await client.query(
        `UPDATE uat_package_revisions 
         SET status = 'INTERNAL_QA', updated_by = $1, updated_at = CURRENT_TIMESTAMP
         WHERE package_id = $2 AND revision_number = $3`,
        [userId, id, pkg.current_revision],
      );

      const pkgUpdate = await client.query(
        `UPDATE uat_packages
         SET status = 'INTERNAL_QA', updated_by = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [userId, id],
      );

      return pkgUpdate.rows[0];
    });
  }

  async reviewRevisionQa(id: string, revisionNumber: number, dto: ReviewUatRevisionDto, userId: string) {
    const pkg = await this.getUatPackageById(id);

    const targetRev = pkg.revisions.find((r: any) => r.revision_number === revisionNumber);
    if (!targetRev) {
      throw new NotFoundException(`Revision ${revisionNumber} not found for package ${id}`);
    }

    if (targetRev.status !== 'INTERNAL_QA') {
      throw new BadRequestException(`Revision ${revisionNumber} is in status ${targetRev.status}, not INTERNAL_QA`);
    }

    const submittedToClientAt = dto.status === 'READY_FOR_CLIENT' ? new Date().toISOString() : null;

    return this.db.transaction(async (client) => {
      const revUpdate = await client.query(
        `UPDATE uat_package_revisions
         SET status = $1,
             qa_approved_by = $2,
             qa_approved_at = CURRENT_TIMESTAMP,
             qa_notes = $3,
             submitted_to_client_at = COALESCE($4, submitted_to_client_at),
             updated_by = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE package_id = $5 AND revision_number = $6
         RETURNING *`,
        [dto.status, userId, dto.qaNotes || null, submittedToClientAt, id, revisionNumber],
      );

      await client.query(
        `UPDATE uat_packages
         SET status = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [dto.status, userId, id],
      );

      return revUpdate.rows[0];
    });
  }

  // ========================================================
  // 3. Material Revisions ($N+1$, Requires Fresh Decision)
  // ========================================================

  async createMaterialRevision(id: string, dto: CreateUatRevisionDto, userId: string) {
    const pkg = await this.getUatPackageById(id);

    const nextRevisionNumber = pkg.current_revision + 1;
    const initialStatus = dto.submitForInternalQa ? 'INTERNAL_QA' : 'DRAFT';

    return this.db.transaction(async (client) => {
      // 1. Supersede previous active revision
      await client.query(
        `UPDATE uat_package_revisions
         SET status = 'SUPERSEDED', updated_by = $1, updated_at = CURRENT_TIMESTAMP
         WHERE package_id = $2 AND revision_number = $3 AND status IN ('DRAFT', 'INTERNAL_QA', 'READY_FOR_CLIENT')`,
        [userId, id, pkg.current_revision],
      );

      // 2. Insert new revision
      const revInsert = await client.query(
        `INSERT INTO uat_package_revisions (
          package_id, revision_number, revision_notes, status,
          known_issues, test_evidence_urls, is_active, created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, TRUE, $7, $7
        ) RETURNING *`,
        [
          id,
          nextRevisionNumber,
          dto.revisionNotes,
          initialStatus,
          JSON.stringify(dto.knownIssues || []),
          JSON.stringify(dto.testEvidenceUrls || []),
          userId,
        ],
      );

      const newRev = revInsert.rows[0];

      // 3. Insert checklist items: if provided, use them; otherwise clone previous items with reset client status
      const items: any[] = [];
      if (dto.checklistItems && dto.checklistItems.length > 0) {
        let idx = 1;
        for (const item of dto.checklistItems) {
          const itemCode = item.itemCode || `CHK-${String(idx).padStart(2, '0')}`;
          const itemRes = await client.query(
            `INSERT INTO uat_checklist_items (
              package_revision_id, item_code, title, instructions, expected_outcome,
              criterion_id, order_index, developer_done, qa_verified, client_status,
              is_active, created_by, updated_by
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, FALSE, FALSE, 'PENDING', TRUE, $8, $8
            ) RETURNING *`,
            [
              newRev.id,
              itemCode,
              item.title,
              item.instructions,
              item.expectedOutcome,
              item.criterionId || null,
              item.orderIndex || idx,
              userId,
            ],
          );
          items.push(itemRes.rows[0]);
          idx++;
        }
      } else {
        // Clone from current revision with fresh unaccepted client status
        const prevRev = pkg.revisions.find((r: any) => r.revision_number === pkg.current_revision);
        if (prevRev && prevRev.checklistItems) {
          for (const item of prevRev.checklistItems) {
            const itemRes = await client.query(
              `INSERT INTO uat_checklist_items (
                package_revision_id, item_code, title, instructions, expected_outcome,
                criterion_id, order_index, developer_done, qa_verified, client_status,
                is_active, created_by, updated_by
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING', TRUE, $10, $10
              ) RETURNING *`,
              [
                newRev.id,
                item.item_code,
                item.title,
                item.instructions,
                item.expected_outcome,
                item.criterion_id || null,
                item.order_index,
                item.developer_done,
                item.qa_verified,
                userId,
              ],
            );
            items.push(itemRes.rows[0]);
          }
        }
      }

      // 4. Update package header pointer
      const pkgUpdate = await client.query(
        `UPDATE uat_packages
         SET current_revision = $1, status = $2, updated_by = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [nextRevisionNumber, initialStatus, userId, id],
      );

      return {
        ...pkgUpdate.rows[0],
        newRevision: {
          ...newRev,
          checklistItems: items,
        },
      };
    });
  }

  // ========================================================
  // 4. Tri-State Checklist Item Progress
  // ========================================================

  async updateChecklistItem(
    itemId: string,
    dto: RecordChecklistProgressDto,
    actorUserId?: string,
    actorContactId?: string,
  ) {
    const itemCheck = await this.db.query(
      `SELECT uci.*, upr.package_id, upr.revision_number, up.status as package_status
       FROM uat_checklist_items uci
       JOIN uat_package_revisions upr ON uci.package_revision_id = upr.id
       JOIN uat_packages up ON upr.package_id = up.id
       WHERE uci.id = $1 AND uci.is_active = TRUE`,
      [itemId],
    );

    if (itemCheck.rowCount === 0) {
      throw new NotFoundException(`UAT Checklist Item with ID ${itemId} not found`);
    }

    const currentItem = itemCheck.rows[0];

    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [];
    let pIdx = 1;

    if (dto.developerDone !== undefined) {
      updates.push(`developer_done = $${pIdx++}`);
      params.push(dto.developerDone);
      if (dto.developerDone) {
        updates.push(`developer_done_at = CURRENT_TIMESTAMP`);
      }
    }

    if (dto.qaVerified !== undefined) {
      updates.push(`qa_verified = $${pIdx++}`);
      params.push(dto.qaVerified);
      if (dto.qaVerified) {
        updates.push(`qa_verified_by = $${pIdx++}`);
        params.push(actorUserId || null);
        updates.push(`qa_verified_at = CURRENT_TIMESTAMP`);
      }
      if (dto.qaEvidenceNotes !== undefined) {
        updates.push(`qa_evidence_notes = $${pIdx++}`);
        params.push(dto.qaEvidenceNotes);
      }
    }

    if (dto.clientStatus !== undefined) {
      updates.push(`client_status = $${pIdx++}`);
      params.push(dto.clientStatus);
      updates.push(`client_tested_by_contact_id = $${pIdx++}`);
      params.push(actorContactId || null);
      updates.push(`client_tested_at = CURRENT_TIMESTAMP`);
      if (dto.clientFeedback !== undefined) {
        updates.push(`client_feedback = $${pIdx++}`);
        params.push(dto.clientFeedback);
      }
      if (dto.linkedDefectTaskId !== undefined) {
        updates.push(`linked_defect_task_id = $${pIdx++}`);
        params.push(dto.linkedDefectTaskId);
      }
    }

    const actor = actorUserId || actorContactId;
    if (actor) {
      updates.push(`updated_by = $${pIdx++}`);
      params.push(actor);
    }

    params.push(itemId);
    const res = await this.db.query(
      `UPDATE uat_checklist_items
       SET ${updates.join(', ')}
       WHERE id = $${pIdx}
       RETURNING *`,
      params,
    );

    return res.rows[0];
  }

  // ========================================================
  // 5. Client Approver Decision Recording
  // ========================================================

  async recordClientDecision(
    id: string,
    revisionNumber: number,
    dto: ClientUatDecisionDto,
    contactUser?: ClientContactUser,
    internalUserId?: string,
  ) {
    const pkg = await this.getUatPackageById(id);

    if (revisionNumber !== pkg.current_revision) {
      throw new BadRequestException(
        `Client decision can only be recorded on current revision (rev ${pkg.current_revision}). Revision ${revisionNumber} is historical/superseded.`,
      );
    }

    const currentRev = pkg.revisions.find((r: any) => r.revision_number === revisionNumber);
    if (!currentRev) {
      throw new NotFoundException(`Revision ${revisionNumber} not found`);
    }

    if (currentRev.status !== 'READY_FOR_CLIENT' && !internalUserId) {
      throw new BadRequestException(
        `Revision ${revisionNumber} is in status ${currentRev.status}, must be READY_FOR_CLIENT for client decision`,
      );
    }

    // Verify contact authority if submitted directly by contact
    if (contactUser) {
      if (pkg.project_id) {
        const grantRes = await this.db.query(
          `SELECT can_approve_uat 
           FROM client_contact_projects 
           WHERE contact_id = $1 AND project_id = $2 AND is_active = TRUE`,
          [contactUser.contactId, pkg.project_id],
        );
        const grant = grantRes.rows[0];
        const hasUatApproval = contactUser.isApprover || (grant && grant.can_approve_uat);
        if (!hasUatApproval) {
          throw new ForbiddenException('Your contact account does not have UAT sign-off authority for this project');
        }
      } else if (!contactUser.isApprover) {
        throw new ForbiddenException('Only designated client approvers can sign off on product UAT packages');
      }
    }

    const decidedByContactId = contactUser?.contactId || dto.contactId || null;
    const actorId = internalUserId || contactUser?.id || decidedByContactId;

    const finalStatus =
      dto.decision === 'APPROVED'
        ? 'ACCEPTED'
        : dto.decision === 'CHANGES_REQUESTED'
        ? 'CHANGES_REQUESTED'
        : 'REJECTED';

    return this.db.transaction(async (client) => {
      // 1. Update revision record
      const revUpdate = await client.query(
        `UPDATE uat_package_revisions
         SET client_decision = $1,
             decided_by_contact_id = $2,
             decided_at = CURRENT_TIMESTAMP,
             client_signoff_remarks = $3,
             status = $4,
             updated_by = $5,
             updated_at = CURRENT_TIMESTAMP
         WHERE package_id = $6 AND revision_number = $7
         RETURNING *`,
        [
          dto.decision,
          decidedByContactId,
          dto.remarks || null,
          finalStatus,
          actorId,
          id,
          revisionNumber,
        ],
      );

      // 2. Update package status
      const pkgUpdate = await client.query(
        `UPDATE uat_packages
         SET status = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [finalStatus, actorId, id],
      );

      // 3. If APPROVED and client organization known, optionally create or prompt installed version
      return {
        ...pkgUpdate.rows[0],
        decidedRevision: revUpdate.rows[0],
      };
    });
  }

  // ========================================================
  // 6. Client Installed / Accepted Versions (SRS §3.24)
  // ========================================================

  async recordInstalledVersion(dto: RecordInstalledVersionDto, userId: string) {
    const clientCheck = await this.db.query(
      `SELECT id FROM clients WHERE id = $1 AND is_active = TRUE`,
      [dto.clientId],
    );
    if (clientCheck.rowCount === 0) {
      throw new NotFoundException(`Client organization with ID ${dto.clientId} not found`);
    }

    const vCheck = await this.db.query(
      `SELECT id FROM versions WHERE id = $1 AND is_active = TRUE`,
      [dto.versionId],
    );
    if (vCheck.rowCount === 0) {
      throw new NotFoundException(`Version with ID ${dto.versionId} not found`);
    }

    return this.db.transaction(async (client) => {
      // Reset previous current_active flag for this environment
      await client.query(
        `UPDATE client_installed_versions
         SET is_current_active = FALSE, updated_by = $1, updated_at = CURRENT_TIMESTAMP
         WHERE client_id = $2 AND environment_name = $3`,
        [userId, dto.clientId, dto.environmentName],
      );

      const res = await client.query(
        `INSERT INTO client_installed_versions (
          client_id, product_id, project_id, version_id, environment_name,
          accepted_by_contact_id, installed_by_user_id, uat_package_id,
          notes, is_current_active, is_active, created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, TRUE, $10, $10
        ) RETURNING *`,
        [
          dto.clientId,
          dto.productId || null,
          dto.projectId || null,
          dto.versionId,
          dto.environmentName,
          dto.acceptedByContactId || null,
          dto.installedByUserId || userId,
          dto.uatPackageId || null,
          dto.notes || null,
          userId,
        ],
      );

      return res.rows[0];
    });
  }

  async getInstalledVersions(clientId: string) {
    const res = await this.db.query(
      `SELECT 
        civ.*,
        c.company_name as client_name,
        v.version_name,
        p.project_name,
        pr.product_name,
        cc.first_name || ' ' || cc.last_name as accepted_by_contact_name,
        u.first_name || ' ' || u.last_name as installed_by_user_name,
        up.package_code as uat_package_code,
        up.title as uat_package_title
      FROM client_installed_versions civ
      JOIN clients c ON civ.client_id = c.id
      JOIN versions v ON civ.version_id = v.id
      LEFT JOIN projects p ON civ.project_id = p.id
      LEFT JOIN products pr ON civ.product_id = pr.id
      LEFT JOIN client_contacts cc ON civ.accepted_by_contact_id = cc.id
      LEFT JOIN users u ON civ.installed_by_user_id = u.id
      LEFT JOIN uat_packages up ON civ.uat_package_id = up.id
      WHERE civ.client_id = $1 AND civ.is_active = TRUE
      ORDER BY civ.installed_at DESC`,
      [clientId],
    );
    return res.rows;
  }

  // ========================================================
  // 7. Client Portal Accessible Methods (Zero-Leakage)
  // ========================================================

  async getClientPortalUatPackages(contact: ClientContactUser, projectId?: string) {
    let sql = `
      SELECT 
        up.id,
        up.package_code,
        up.title,
        up.description,
        up.environment_url,
        up.build_number,
        up.test_credentials_instructions,
        up.current_revision,
        up.status,
        up.target_signoff_date,
        up.created_at,
        up.updated_at,
        p.project_name,
        p.project_code,
        pr.product_name,
        pr.product_code,
        v.version_name,
        m.name as milestone_name,
        upr.revision_number,
        upr.revision_notes,
        upr.known_issues,
        upr.test_evidence_urls,
        upr.status as revision_status,
        upr.client_decision,
        upr.decided_at,
        upr.client_signoff_remarks,
        upr.submitted_to_client_at,
        COUNT(DISTINCT uci.id)::int as total_checklist_items,
        COUNT(DISTINCT CASE WHEN uci.client_status = 'PASSED' THEN uci.id END)::int as client_passed_items,
        COUNT(DISTINCT CASE WHEN uci.client_status = 'FAILED' THEN uci.id END)::int as client_failed_items
      FROM uat_packages up
      LEFT JOIN projects p ON up.project_id = p.id
      LEFT JOIN products pr ON up.product_id = pr.id
      LEFT JOIN versions v ON up.version_id = v.id
      LEFT JOIN milestones m ON up.milestone_id = m.id
      LEFT JOIN uat_package_revisions upr ON up.id = upr.package_id AND up.current_revision = upr.revision_number
      LEFT JOIN uat_checklist_items uci ON upr.id = uci.package_revision_id AND uci.is_active = TRUE
      WHERE up.is_active = TRUE
        AND up.status IN ('READY_FOR_CLIENT', 'ACCEPTED', 'CHANGES_REQUESTED', 'REJECTED', 'SUPERSEDED')
    `;

    const params: any[] = [];
    let pIdx = 1;

    sql += ` AND (
      up.project_id IN (
        SELECT project_id FROM client_contact_projects WHERE contact_id = $${pIdx} AND is_active = TRUE
      )
      OR up.project_id IN (
        SELECT id FROM projects WHERE client_id = $${pIdx + 1}
      )
    )`;
    params.push(contact.contactId, contact.clientId);
    pIdx += 2;

    if (projectId) {
      sql += ` AND up.project_id = $${pIdx++}`;
      params.push(projectId);
    }

    sql += ` GROUP BY up.id, p.project_name, p.project_code, pr.product_name, pr.product_code, v.version_name, m.name, upr.id`;
    sql += ` ORDER BY up.created_at DESC`;

    const res = await this.db.query(sql, params);
    return res.rows;
  }

  async getClientPortalUatPackageDetail(id: string, contact: ClientContactUser) {
    const pkgRes = await this.db.query(
      `SELECT 
        up.id,
        up.package_code,
        up.title,
        up.description,
        up.environment_url,
        up.build_number,
        up.test_credentials_instructions,
        up.current_revision,
        up.status,
        up.target_signoff_date,
        up.project_id,
        up.product_id,
        up.created_at,
        up.updated_at,
        p.project_name,
        p.project_code,
        pr.product_name,
        pr.product_code,
        v.version_name,
        m.name as milestone_name
      FROM uat_packages up
      LEFT JOIN projects p ON up.project_id = p.id
      LEFT JOIN products pr ON up.product_id = pr.id
      LEFT JOIN versions v ON up.version_id = v.id
      LEFT JOIN milestones m ON up.milestone_id = m.id
      WHERE up.id = $1 AND up.is_active = TRUE
        AND up.status IN ('READY_FOR_CLIENT', 'ACCEPTED', 'CHANGES_REQUESTED', 'REJECTED', 'SUPERSEDED')
        AND (
          up.project_id IN (
            SELECT project_id FROM client_contact_projects WHERE contact_id = $2 AND is_active = TRUE
          )
          OR up.project_id IN (
            SELECT id FROM projects WHERE client_id = $3
          )
        )`,
      [id, contact.contactId, contact.clientId],
    );

    if (pkgRes.rowCount === 0) {
      throw new NotFoundException(`UAT Package not found or not published to client`);
    }

    const pkg = pkgRes.rows[0];

    // Client-safe revisions - STRICT ZERO LEAKAGE OF QA INTERNAL NOTES
    const revsRes = await this.db.query(
      `SELECT 
        upr.id,
        upr.revision_number,
        upr.revision_notes,
        upr.status,
        upr.known_issues,
        upr.test_evidence_urls,
        upr.client_decision,
        upr.decided_at,
        upr.client_signoff_remarks,
        upr.submitted_to_client_at,
        cc.first_name || ' ' || cc.last_name as decided_by_contact_name
      FROM uat_package_revisions upr
      LEFT JOIN client_contacts cc ON upr.decided_by_contact_id = cc.id
      WHERE upr.package_id = $1 AND upr.is_active = TRUE
        AND upr.status IN ('READY_FOR_CLIENT', 'ACCEPTED', 'CHANGES_REQUESTED', 'REJECTED', 'SUPERSEDED')
      ORDER BY upr.revision_number DESC`,
      [id],
    );

    // Checklist items for published revisions
    const itemsRes = await this.db.query(
      `SELECT 
        uci.id,
        uci.package_revision_id,
        uci.item_code,
        uci.title,
        uci.instructions,
        uci.expected_outcome,
        uci.developer_done,
        uci.qa_verified,
        uci.client_status,
        uci.client_feedback,
        uci.client_tested_at,
        cc.first_name || ' ' || cc.last_name as client_tested_by_contact_name,
        rac.criteria_code,
        rac.title as criteria_title
      FROM uat_checklist_items uci
      LEFT JOIN client_contacts cc ON uci.client_tested_by_contact_id = cc.id
      LEFT JOIN requirement_acceptance_criteria rac ON uci.criterion_id = rac.id
      WHERE uci.package_revision_id IN (
        SELECT id FROM uat_package_revisions WHERE package_id = $1 AND is_active = TRUE
      ) AND uci.is_active = TRUE
      ORDER BY uci.order_index ASC, uci.item_code ASC`,
      [id],
    );

    const revisionsWithItems = revsRes.rows.map((rev) => ({
      ...rev,
      checklistItems: itemsRes.rows.filter((item) => item.package_revision_id === rev.id),
    }));

    return {
      ...pkg,
      revisions: revisionsWithItems,
    };
  }
}
