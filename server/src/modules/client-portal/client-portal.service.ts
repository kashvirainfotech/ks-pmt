import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { DatabaseService } from '../../database/database.service';
import { InviteContactDto, ProjectGrantItemDto } from './dto/invite-contact.dto';
import { AcceptInviteDto, ClientLoginDto, UpdateContactDto } from './dto/accept-invite.dto';
import { UpdateProjectGrantsDto } from './dto/project-grants.dto';
import { CreateIntakeRequestDto } from './dto/create-intake-request.dto';
import { TriageRequestDto } from './dto/triage-request.dto';
import { CreateRequestMessageDto, QueryRequestsDto } from './dto/request-message.dto';

export interface ClientContactUser {
  id: string;
  contactId: string;
  clientId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  portalRole: 'CLIENT_USER' | 'CLIENT_ADMIN';
  isApprover: boolean;
  companyName: string;
  clientCode: string;
  isClientContact: boolean;
}

@Injectable()
export class ClientPortalService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ========================================================
  // 1. Contact Management & Portal Auth (CLIENT-001)
  // ========================================================

  async inviteContact(
    dto: InviteContactDto,
    inviter: { userId?: string; contactId?: string },
  ) {
    const clientCheck = await this.db.query(
      `SELECT id, company_name, is_active FROM clients WHERE id = $1`,
      [dto.clientId],
    );
    if (clientCheck.rowCount === 0) {
      throw new NotFoundException(`Client organization with ID ${dto.clientId} not found`);
    }
    if (!clientCheck.rows[0].is_active) {
      throw new BadRequestException('Cannot invite contacts to an inactive client organization');
    }

    const emailCheck = await this.db.query(
      `SELECT id FROM client_contacts WHERE LOWER(email) = LOWER($1)`,
      [dto.email],
    );
    if (emailCheck.rowCount > 0) {
      throw new BadRequestException(`Email '${dto.email}' is already registered as a client contact`);
    }

    const invitationToken = crypto.randomBytes(32).toString('hex');

    const insertContactQuery = `
      INSERT INTO client_contacts (
        client_id, first_name, last_name, email, phone, job_title,
        portal_role, is_approver, status, invitation_token,
        invitation_sent_at, invited_by_user_id, invited_by_contact_id,
        is_active, created_by, updated_by
      ) VALUES (
        $1, $2, $3, LOWER($4), $5, $6,
        $7, $8, 'INVITED', $9,
        CURRENT_TIMESTAMP, $10, $11,
        TRUE, $12, $12
      )
      RETURNING *;
    `;

    const auditUserId = inviter.userId || '00000000-0000-0000-0000-000000000001';

    const contactResult = await this.db.query(insertContactQuery, [
      dto.clientId,
      dto.firstName,
      dto.lastName,
      dto.email,
      dto.phone || null,
      dto.jobTitle || null,
      dto.portalRole || 'CLIENT_USER',
      dto.isApprover || false,
      invitationToken,
      inviter.userId || null,
      inviter.contactId || null,
      auditUserId,
    ]);

    const contact = contactResult.rows[0];

    // Insert project grants if supplied
    if (dto.projectGrants && dto.projectGrants.length > 0) {
      for (const grant of dto.projectGrants) {
        await this.db.query(
          `INSERT INTO client_contact_projects (
            contact_id, project_id, can_view_milestones, can_create_requests,
            can_approve_scope, can_approve_uat, is_active, created_by, updated_by
          ) VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, $7)
          ON CONFLICT (contact_id, project_id) DO UPDATE SET
            can_view_milestones = EXCLUDED.can_view_milestones,
            can_create_requests = EXCLUDED.can_create_requests,
            can_approve_scope = EXCLUDED.can_approve_scope,
            can_approve_uat = EXCLUDED.can_approve_uat,
            updated_at = CURRENT_TIMESTAMP`,
          [
            contact.id,
            grant.projectId,
            grant.canViewMilestones !== false,
            grant.canCreateRequests !== false,
            grant.canApproveScope === true,
            grant.canApproveUat === true,
            auditUserId,
          ],
        );
      }
    }

    return {
      contact,
      invitationToken,
      invitationLink: `/client-portal/activate?token=${invitationToken}`,
    };
  }

  async resendInvite(contactId: string, userId: string) {
    const contact = await this.db.query(
      `SELECT * FROM client_contacts WHERE id = $1`,
      [contactId],
    );
    if (contact.rowCount === 0) {
      throw new NotFoundException(`Contact with ID ${contactId} not found`);
    }
    if (contact.rows[0].status === 'REVOKED') {
      throw new BadRequestException('Cannot resend invitation to a revoked contact');
    }

    const invitationToken = crypto.randomBytes(32).toString('hex');
    await this.db.query(
      `UPDATE client_contacts SET
        invitation_token = $1,
        invitation_sent_at = CURRENT_TIMESTAMP,
        status = 'INVITED',
        updated_by = $2,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [invitationToken, userId, contactId],
    );

    return {
      message: 'Invitation resent successfully',
      invitationToken,
      invitationLink: `/client-portal/activate?token=${invitationToken}`,
    };
  }

  async acceptInvite(dto: AcceptInviteDto) {
    const contactResult = await this.db.query(
      `SELECT * FROM client_contacts WHERE invitation_token = $1 AND is_active = TRUE`,
      [dto.invitationToken],
    );

    if (contactResult.rowCount === 0) {
      throw new BadRequestException('Invalid or expired invitation token');
    }

    const contact = contactResult.rows[0];

    if (contact.status === 'REVOKED') {
      throw new ForbiddenException('This contact account has been revoked');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const updateQuery = `
      UPDATE client_contacts SET
        password_hash = $1,
        phone = COALESCE($2, phone),
        status = 'ACTIVE',
        invitation_accepted_at = CURRENT_TIMESTAMP,
        invitation_token = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING id, client_id, first_name, last_name, email, phone, job_title, portal_role, is_approver, status;
    `;

    const updated = await this.db.query(updateQuery, [
      passwordHash,
      dto.phone || null,
      contact.id,
    ]);

    return {
      message: 'Account activated successfully. You can now login to the customer portal.',
      contact: updated.rows[0],
    };
  }

  async login(dto: ClientLoginDto, ipAddress: string) {
    const contactQuery = `
      SELECT cc.id, cc.client_id, cc.first_name, cc.last_name, cc.email,
             cc.phone, cc.job_title, cc.password_hash, cc.portal_role,
             cc.is_approver, cc.status, cc.is_active,
             c.company_name, c.client_code, c.is_active AS client_is_active
      FROM client_contacts cc
      INNER JOIN clients c ON cc.client_id = c.id
      WHERE LOWER(cc.email) = LOWER($1);
    `;

    const result = await this.db.query(contactQuery, [dto.email]);

    if (result.rowCount === 0) {
      throw new UnauthorizedException('Invalid client portal credentials');
    }

    const contact = result.rows[0];

    if (!contact.is_active || contact.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        contact.status === 'REVOKED'
          ? 'Your portal access has been revoked. Please contact support.'
          : 'Your account is not active. Please complete activation via your invitation email.',
      );
    }

    if (!contact.client_is_active) {
      throw new UnauthorizedException('Your client organization account is inactive.');
    }

    if (!contact.password_hash) {
      throw new UnauthorizedException('Password not set. Please activate your invitation first.');
    }

    const isMatch = await bcrypt.compare(dto.password, contact.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid client portal credentials');
    }

    // Update login timestamp & IP
    await this.db.query(
      `UPDATE client_contacts SET last_login_at = CURRENT_TIMESTAMP, last_login_ip = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [ipAddress, contact.id],
    );

    // Issue portal access token
    const accessSecret = this.configService.get<string>(
      'JWT_ACCESS_SECRET',
      'ks_pmt_jwt_super_secret_access_key_2026_change_in_prod',
    );

    const payload = {
      sub: contact.id,
      email: contact.email,
      isClientContact: true,
      clientId: contact.client_id,
      portalRole: contact.portal_role,
      isApprover: contact.is_approver,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: accessSecret,
      expiresIn: '8h',
    });

    return {
      accessToken,
      contact: {
        id: contact.id,
        clientId: contact.client_id,
        companyName: contact.company_name,
        clientCode: contact.client_code,
        firstName: contact.first_name,
        lastName: contact.last_name,
        email: contact.email,
        phone: contact.phone,
        jobTitle: contact.job_title,
        portalRole: contact.portal_role,
        isApprover: contact.is_approver,
      },
    };
  }

  async getContacts(query: { clientId?: string; status?: string; search?: string }) {
    const params: any[] = [];
    const where: string[] = ['cc.is_active = TRUE'];

    if (query.clientId) {
      params.push(query.clientId);
      where.push(`cc.client_id = $${params.length}`);
    }

    if (query.status) {
      params.push(query.status);
      where.push(`cc.status = $${params.length}`);
    }

    if (query.search) {
      params.push(`%${query.search.toLowerCase()}%`);
      where.push(
        `(LOWER(cc.first_name) LIKE $${params.length} OR LOWER(cc.last_name) LIKE $${params.length} OR LOWER(cc.email) LIKE $${params.length} OR LOWER(c.company_name) LIKE $${params.length})`,
      );
    }

    const contactsQuery = `
      SELECT cc.id, cc.client_id, cc.first_name, cc.last_name, cc.email,
             cc.phone, cc.job_title, cc.portal_role, cc.is_approver,
             cc.status, cc.invitation_sent_at, cc.invitation_accepted_at,
             cc.last_login_at, cc.created_at,
             c.company_name, c.client_code,
             COUNT(DISTINCT ccp.project_id)::int AS granted_project_count
      FROM client_contacts cc
      INNER JOIN clients c ON cc.client_id = c.id
      LEFT JOIN client_contact_projects ccp ON cc.id = ccp.contact_id AND ccp.is_active = TRUE
      WHERE ${where.join(' AND ')}
      GROUP BY cc.id, c.id
      ORDER BY cc.created_at DESC;
    `;

    const result = await this.db.query(contactsQuery, params);
    return result.rows;
  }

  async getContactById(id: string) {
    const contactQuery = `
      SELECT cc.id, cc.client_id, cc.first_name, cc.last_name, cc.email,
             cc.phone, cc.job_title, cc.portal_role, cc.is_approver,
             cc.status, cc.invitation_sent_at, cc.invitation_accepted_at,
             cc.last_login_at, cc.created_at,
             c.company_name, c.client_code, c.email AS client_email, c.website
      FROM client_contacts cc
      INNER JOIN clients c ON cc.client_id = c.id
      WHERE cc.id = $1 AND cc.is_active = TRUE;
    `;

    const result = await this.db.query(contactQuery, [id]);
    if (result.rowCount === 0) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }

    const contact = result.rows[0];

    const projectsQuery = `
      SELECT ccp.id AS grant_id, ccp.project_id, ccp.can_view_milestones,
             ccp.can_create_requests, ccp.can_approve_scope, ccp.can_approve_uat,
             p.project_code, p.project_name, p.project_status
      FROM client_contact_projects ccp
      INNER JOIN projects p ON ccp.project_id = p.id
      WHERE ccp.contact_id = $1 AND ccp.is_active = TRUE;
    `;
    const projects = await this.db.query(projectsQuery, [id]);

    return {
      ...contact,
      projectGrants: projects.rows,
    };
  }

  async updateContact(id: string, dto: UpdateContactDto, userId: string) {
    await this.getContactById(id);

    const updateQuery = `
      UPDATE client_contacts SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        phone = COALESCE($3, phone),
        job_title = COALESCE($4, job_title),
        portal_role = COALESCE($5, portal_role),
        is_approver = COALESCE($6, is_approver),
        status = COALESCE($7, status),
        updated_by = $8,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *;
    `;

    const result = await this.db.query(updateQuery, [
      dto.firstName || null,
      dto.lastName || null,
      dto.phone || null,
      dto.jobTitle || null,
      dto.portalRole || null,
      dto.isApprover !== undefined ? dto.isApprover : null,
      dto.status || null,
      userId,
      id,
    ]);

    return result.rows[0];
  }

  async revokeContact(id: string, userId: string) {
    const result = await this.db.query(
      `UPDATE client_contacts SET status = 'REVOKED', is_active = FALSE, updated_by = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, status`,
      [userId, id],
    );
    if (result.rowCount === 0) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }
    return {
      message: 'Client contact access has been revoked successfully',
      contact: result.rows[0],
    };
  }

  async updateProjectGrants(contactId: string, dto: UpdateProjectGrantsDto, userId: string) {
    await this.getContactById(contactId);

    // Deactivate existing grants
    await this.db.query(
      `UPDATE client_contact_projects SET is_active = FALSE, updated_by = $1, updated_at = CURRENT_TIMESTAMP WHERE contact_id = $2`,
      [userId, contactId],
    );

    // Re-insert or reactivate specified grants
    for (const grant of dto.grants) {
      await this.db.query(
        `INSERT INTO client_contact_projects (
          contact_id, project_id, can_view_milestones, can_create_requests,
          can_approve_scope, can_approve_uat, is_active, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, $7)
        ON CONFLICT (contact_id, project_id) DO UPDATE SET
          can_view_milestones = EXCLUDED.can_view_milestones,
          can_create_requests = EXCLUDED.can_create_requests,
          can_approve_scope = EXCLUDED.can_approve_scope,
          can_approve_uat = EXCLUDED.can_approve_uat,
          is_active = TRUE,
          updated_by = $7,
          updated_at = CURRENT_TIMESTAMP`,
        [
          contactId,
          grant.projectId,
          grant.canViewMilestones !== false,
          grant.canCreateRequests !== false,
          grant.canApproveScope === true,
          grant.canApproveUat === true,
          userId,
        ],
      );
    }

    return this.getContactById(contactId);
  }

  async getPortalContext(contact: ClientContactUser) {
    // 1. Client Company Info (Strictly Allowlisted)
    const clientQuery = `
      SELECT id, client_code, company_name, email, website, city, country
      FROM clients
      WHERE id = $1 AND is_active = TRUE;
    `;
    const clientResult = await this.db.query(clientQuery, [contact.clientId]);
    const client = clientResult.rows[0];

    // 2. Permitted Projects (Allowlisted fields only: NO financials/cost rates!)
    const projectsQuery = `
      SELECT p.id, p.project_code, p.project_name, p.description,
             p.project_status, p.planned_start_date, p.planned_end_date,
             CONCAT(mgr.first_name, ' ', mgr.last_name) AS project_manager_name,
             mgr.email AS project_manager_email,
             ccp.can_view_milestones, ccp.can_create_requests,
             ccp.can_approve_scope, ccp.can_approve_uat
      FROM client_contact_projects ccp
      INNER JOIN projects p ON ccp.project_id = p.id
      LEFT JOIN users mgr ON p.project_manager_user_id = mgr.id
      WHERE ccp.contact_id = $1 AND ccp.is_active = TRUE AND p.is_active = TRUE
      ORDER BY p.project_name ASC;
    `;
    const projects = await this.db.query(projectsQuery, [contact.id]);

    // 3. Licensed Products for Client Organization (Allowlisted fields only: NO internal costs!)
    const productsQuery = `
      SELECT pr.id, pr.product_code, pr.product_name, pr.description,
             pr.category, pr.current_version,
             pcm.license_type, pcm.support_tier, pcm.license_start_date,
             pcm.license_end_date, pcm.amc_renewal_date, pcm.status AS license_status
      FROM product_client_mappings pcm
      INNER JOIN products pr ON pcm.product_id = pr.id
      WHERE pcm.client_id = $1 AND pcm.is_active = TRUE AND pr.is_active = TRUE
      ORDER BY pr.product_name ASC;
    `;
    const products = await this.db.query(productsQuery, [contact.clientId]);

    return {
      contact: {
        id: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone,
        jobTitle: contact.jobTitle,
        portalRole: contact.portalRole,
        isApprover: contact.isApprover,
      },
      client,
      permittedProjects: projects.rows,
      licensedProducts: products.rows,
    };
  }

  // ========================================================
  // 2. Client Intake Requests & Progress Triage (CLIENT-002)
  // ========================================================

  async createRequest(dto: CreateIntakeRequestDto, contact: ClientContactUser) {
    // Validate project access if projectId provided
    if (dto.projectId) {
      const grantCheck = await this.db.query(
        `SELECT id, can_create_requests FROM client_contact_projects WHERE contact_id = $1 AND project_id = $2 AND is_active = TRUE`,
        [contact.id, dto.projectId],
      );
      if (grantCheck.rowCount === 0) {
        throw new ForbiddenException('You do not have access to submit requests for this project');
      }
      if (!grantCheck.rows[0].can_create_requests) {
        throw new ForbiddenException('Request submission permission is disabled for this project');
      }
    }

    // Validate product mapping if productId provided
    if (dto.productId) {
      const productCheck = await this.db.query(
        `SELECT id FROM product_client_mappings WHERE client_id = $1 AND product_id = $2 AND is_active = TRUE`,
        [contact.clientId, dto.productId],
      );
      if (productCheck.rowCount === 0) {
        throw new ForbiddenException('Your organization does not hold an active license for this product');
      }
    }

    // Generate request number: REQ-YYYY-XXXX
    const year = new Date().getFullYear();
    const countResult = await this.db.query(
      `SELECT COUNT(id)::int AS cnt FROM client_intake_requests WHERE request_number LIKE $1`,
      [`REQ-${year}-%`],
    );
    const sequence = (countResult.rows[0]?.cnt || 0) + 1;
    const requestNumber = `REQ-${year}-${sequence.toString().padStart(4, '0')}`;

    const insertQuery = `
      INSERT INTO client_intake_requests (
        request_number, client_id, contact_id, project_id, product_id, component_id,
        request_type, title, description, status, client_priority,
        business_impact, impact_breadth, environment_details, attachments,
        is_active, created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, 'SUBMITTED', $10,
        $11, $12, $13, $14,
        TRUE, $3, $3
      )
      RETURNING *;
    `;

    const result = await this.db.query(insertQuery, [
      requestNumber,
      contact.clientId,
      contact.id,
      dto.projectId || null,
      dto.productId || null,
      dto.componentId || null,
      dto.requestType,
      dto.title,
      dto.description,
      dto.clientPriority || 'MEDIUM',
      dto.businessImpact || 'OPERATIONS',
      dto.impactBreadth || 'SINGLE_USER',
      JSON.stringify(dto.environmentDetails || {}),
      JSON.stringify(dto.attachments || []),
    ]);

    const created = result.rows[0];

    return {
      message: 'Request submitted successfully. Our engineering/support team will triage your request.',
      request: this.mapCustomerFacingRequest(created),
    };
  }

  async getClientRequests(contact: ClientContactUser, query: QueryRequestsDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const params: any[] = [contact.clientId];
    const where: string[] = ['r.client_id = $1', 'r.is_active = TRUE'];

    if (query.projectId) {
      params.push(query.projectId);
      where.push(`r.project_id = $${params.length}`);
    }

    if (query.productId) {
      params.push(query.productId);
      where.push(`r.product_id = $${params.length}`);
    }

    if (query.requestType) {
      params.push(query.requestType);
      where.push(`r.request_type = $${params.length}`);
    }

    if (query.status) {
      params.push(query.status);
      where.push(`r.status = $${params.length}`);
    }

    if (query.search) {
      params.push(`%${query.search.toLowerCase()}%`);
      where.push(
        `(LOWER(r.title) LIKE $${params.length} OR LOWER(r.request_number) LIKE $${params.length})`,
      );
    }

    const countQuery = `
      SELECT COUNT(r.id)::int AS total
      FROM client_intake_requests r
      WHERE ${where.join(' AND ')};
    `;
    const countResult = await this.db.query(countQuery, params);
    const totalCount = countResult.rows[0]?.total || 0;

    const dataQuery = `
      SELECT r.id, r.request_number, r.client_id, r.contact_id,
             r.project_id, r.product_id, r.component_id,
             r.request_type, r.title, r.description, r.status,
             r.client_priority, r.business_impact, r.impact_breadth,
             r.environment_details, r.attachments, r.created_at, r.updated_at,
             p.project_name, p.project_code,
             pr.product_name, pr.product_code,
             sc.component_name,
             CONCAT(cc.first_name, ' ', cc.last_name) AS submitter_name,
             t.status_id AS linked_task_status_id,
             ts.status_name AS linked_task_status_name,
             ts.category AS linked_task_status_category
      FROM client_intake_requests r
      LEFT JOIN projects p ON r.project_id = p.id
      LEFT JOIN products pr ON r.product_id = pr.id
      LEFT JOIN software_components sc ON r.component_id = sc.id
      INNER JOIN client_contacts cc ON r.contact_id = cc.id
      LEFT JOIN tasks t ON r.linked_task_id = t.id
      LEFT JOIN task_statuses ts ON t.status_id = ts.id
      WHERE ${where.join(' AND ')}
      ORDER BY r.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2};
    `;

    params.push(limit, offset);
    const dataResult = await this.db.query(dataQuery, params);

    const mapped = dataResult.rows.map((row) => this.mapCustomerFacingRequest(row));

    return {
      data: mapped,
      meta: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async getClientRequestById(id: string, contact: ClientContactUser) {
    const requestQuery = `
      SELECT r.id, r.request_number, r.client_id, r.contact_id,
             r.project_id, r.product_id, r.component_id,
             r.request_type, r.title, r.description, r.status,
             r.client_priority, r.business_impact, r.impact_breadth,
             r.environment_details, r.attachments, r.rejection_or_decline_reason,
             r.affected_version, r.target_fix_version,
             r.created_at, r.updated_at,
             p.project_name, p.project_code,
             pr.product_name, pr.product_code,
             sc.component_name,
             CONCAT(cc.first_name, ' ', cc.last_name) AS submitter_name,
             t.status_id AS linked_task_status_id,
             ts.status_name AS linked_task_status_name,
             ts.category AS linked_task_status_category
      FROM client_intake_requests r
      LEFT JOIN projects p ON r.project_id = p.id
      LEFT JOIN products pr ON r.product_id = pr.id
      LEFT JOIN software_components sc ON r.component_id = sc.id
      INNER JOIN client_contacts cc ON r.contact_id = cc.id
      LEFT JOIN tasks t ON r.linked_task_id = t.id
      LEFT JOIN task_statuses ts ON t.status_id = ts.id
      WHERE r.id = $1 AND r.client_id = $2 AND r.is_active = TRUE;
    `;

    const result = await this.db.query(requestQuery, [id, contact.clientId]);
    if (result.rowCount === 0) {
      throw new NotFoundException(`Request not found or access restricted`);
    }

    const row = result.rows[0];

    // Load public messages (is_internal_only = FALSE)
    const messagesQuery = `
      SELECT m.id, m.sender_type, m.message, m.attachments, m.created_at,
             CONCAT(cc.first_name, ' ', cc.last_name) AS contact_author_name,
             CONCAT(u.first_name, ' ', u.last_name) AS staff_author_name
      FROM client_request_messages m
      LEFT JOIN client_contacts cc ON m.contact_id = cc.id
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.request_id = $1 AND m.is_internal_only = FALSE AND m.is_active = TRUE
      ORDER BY m.created_at ASC;
    `;
    const messages = await this.db.query(messagesQuery, [id]);

    return {
      ...this.mapCustomerFacingRequest(row),
      messages: messages.rows.map((m) => ({
        id: m.id,
        senderType: m.sender_type,
        authorName: m.sender_type === 'CLIENT_CONTACT' ? m.contact_author_name : (m.staff_author_name || 'Support Team'),
        message: m.message,
        attachments: m.attachments,
        createdAt: m.created_at,
      })),
    };
  }

  async addClientMessage(id: string, dto: CreateRequestMessageDto, contact: ClientContactUser) {
    const reqCheck = await this.db.query(
      `SELECT id, status FROM client_intake_requests WHERE id = $1 AND client_id = $2 AND is_active = TRUE`,
      [id, contact.clientId],
    );
    if (reqCheck.rowCount === 0) {
      throw new NotFoundException('Request not found or access restricted');
    }

    const currentStatus = reqCheck.rows[0].status;

    const insertQuery = `
      INSERT INTO client_request_messages (
        request_id, sender_type, contact_id, message, is_internal_only,
        attachments, is_active, created_by, updated_by
      ) VALUES (
        $1, 'CLIENT_CONTACT', $2, $3, FALSE,
        $4, TRUE, $2, $2
      )
      RETURNING *;
    `;

    const result = await this.db.query(insertQuery, [
      id,
      contact.id,
      dto.message,
      JSON.stringify(dto.attachments || []),
    ]);

    // If request was awaiting customer information, transition back to UNDER_REVIEW
    if (currentStatus === 'NEEDS_INFORMATION') {
      await this.db.query(
        `UPDATE client_intake_requests SET status = 'UNDER_REVIEW', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [id],
      );
    }

    return {
      message: 'Message added successfully',
      messageRecord: result.rows[0],
    };
  }

  // ========================================================
  // 3. Internal Triage & Delivery Work Linking (CLIENT-002)
  // ========================================================

  async getInternalRequests(query: QueryRequestsDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const params: any[] = [];
    const where: string[] = ['r.is_active = TRUE'];

    if (query.clientId) {
      params.push(query.clientId);
      where.push(`r.client_id = $${params.length}`);
    }

    if (query.projectId) {
      params.push(query.projectId);
      where.push(`r.project_id = $${params.length}`);
    }

    if (query.productId) {
      params.push(query.productId);
      where.push(`r.product_id = $${params.length}`);
    }

    if (query.status) {
      params.push(query.status);
      where.push(`r.status = $${params.length}`);
    }

    if (query.requestType) {
      params.push(query.requestType);
      where.push(`r.request_type = $${params.length}`);
    }

    if (query.search) {
      params.push(`%${query.search.toLowerCase()}%`);
      where.push(
        `(LOWER(r.title) LIKE $${params.length} OR LOWER(r.request_number) LIKE $${params.length} OR LOWER(c.company_name) LIKE $${params.length})`,
      );
    }

    const countQuery = `
      SELECT COUNT(r.id)::int AS total
      FROM client_intake_requests r
      INNER JOIN clients c ON r.client_id = c.id
      WHERE ${where.join(' AND ')};
    `;
    const countResult = await this.db.query(countQuery, params);
    const totalCount = countResult.rows[0]?.total || 0;

    const dataQuery = `
      SELECT r.*,
             c.company_name, c.client_code,
             CONCAT(cc.first_name, ' ', cc.last_name) AS contact_name,
             cc.email AS contact_email,
             p.project_name, p.project_code,
             pr.product_name, pr.product_code,
             sc.component_name,
             t.task_number AS linked_task_number,
             t.title AS linked_task_title,
             ts.status_name AS linked_task_status_name,
             ts.category AS linked_task_status_category,
             CONCAT(triager.first_name, ' ', triager.last_name) AS triaged_by_name
      FROM client_intake_requests r
      INNER JOIN clients c ON r.client_id = c.id
      INNER JOIN client_contacts cc ON r.contact_id = cc.id
      LEFT JOIN projects p ON r.project_id = p.id
      LEFT JOIN products pr ON r.product_id = pr.id
      LEFT JOIN software_components sc ON r.component_id = sc.id
      LEFT JOIN tasks t ON r.linked_task_id = t.id
      LEFT JOIN task_statuses ts ON t.status_id = ts.id
      LEFT JOIN users triager ON r.triaged_by = triager.id
      WHERE ${where.join(' AND ')}
      ORDER BY 
        CASE 
          WHEN r.status = 'SUBMITTED' THEN 1
          WHEN r.status = 'UNDER_REVIEW' THEN 2
          WHEN r.status = 'NEEDS_INFORMATION' THEN 3
          WHEN r.status = 'ACCEPTED' THEN 4
          ELSE 5
        END ASC,
        r.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2};
    `;

    params.push(limit, offset);
    const dataResult = await this.db.query(dataQuery, params);

    return {
      data: dataResult.rows,
      meta: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async getInternalRequestById(id: string) {
    const requestQuery = `
      SELECT r.*,
             c.company_name, c.client_code,
             CONCAT(cc.first_name, ' ', cc.last_name) AS contact_name,
             cc.email AS contact_email, cc.phone AS contact_phone,
             p.project_name, p.project_code,
             pr.product_name, pr.product_code,
             sc.component_name,
             t.task_number AS linked_task_number,
             t.title AS linked_task_title,
             ts.status_name AS linked_task_status_name,
             ts.category AS linked_task_status_category,
             dup.request_number AS duplicate_request_number,
             dup.title AS duplicate_request_title,
             CONCAT(triager.first_name, ' ', triager.last_name) AS triaged_by_name
      FROM client_intake_requests r
      INNER JOIN clients c ON r.client_id = c.id
      INNER JOIN client_contacts cc ON r.contact_id = cc.id
      LEFT JOIN projects p ON r.project_id = p.id
      LEFT JOIN products pr ON r.product_id = pr.id
      LEFT JOIN software_components sc ON r.component_id = sc.id
      LEFT JOIN tasks t ON r.linked_task_id = t.id
      LEFT JOIN task_statuses ts ON t.status_id = ts.id
      LEFT JOIN client_intake_requests dup ON r.duplicate_of_request_id = dup.id
      LEFT JOIN users triager ON r.triaged_by = triager.id
      WHERE r.id = $1 AND r.is_active = TRUE;
    `;

    const result = await this.db.query(requestQuery, [id]);
    if (result.rowCount === 0) {
      throw new NotFoundException(`Request with ID ${id} not found`);
    }

    const row = result.rows[0];

    // Load all messages (including internal only)
    const messagesQuery = `
      SELECT m.*,
             CONCAT(cc.first_name, ' ', cc.last_name) AS contact_author_name,
             CONCAT(u.first_name, ' ', u.last_name) AS staff_author_name,
             u.email AS staff_email
      FROM client_request_messages m
      LEFT JOIN client_contacts cc ON m.contact_id = cc.id
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.request_id = $1 AND m.is_active = TRUE
      ORDER BY m.created_at ASC;
    `;
    const messages = await this.db.query(messagesQuery, [id]);

    return {
      ...row,
      messages: messages.rows,
    };
  }

  async triageRequest(id: string, dto: TriageRequestDto, userId: string) {
    await this.getInternalRequestById(id);

    if (dto.status === 'DECLINED' && !dto.rejectionOrDeclineReason) {
      throw new BadRequestException('A decline reason is required when marking a request as DECLINED');
    }

    if (dto.status === 'DUPLICATE' && !dto.duplicateOfRequestId) {
      throw new BadRequestException('A duplicate request ID reference is required when marking as DUPLICATE');
    }

    const updateQuery = `
      UPDATE client_intake_requests SET
        status = COALESCE($1, status),
        internal_priority = COALESCE($2, internal_priority),
        technical_severity = COALESCE($3, technical_severity),
        business_impact = COALESCE($4, business_impact),
        impact_breadth = COALESCE($5, impact_breadth),
        rejection_or_decline_reason = COALESCE($6, rejection_or_decline_reason),
        duplicate_of_request_id = COALESCE($7, duplicate_of_request_id),
        linked_task_id = COALESCE($8, linked_task_id),
        affected_version = COALESCE($9, affected_version),
        target_fix_version = COALESCE($10, target_fix_version),
        triaged_by = $11,
        triaged_at = CURRENT_TIMESTAMP,
        updated_by = $11,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *;
    `;

    const result = await this.db.query(updateQuery, [
      dto.status || null,
      dto.internalPriority || null,
      dto.technicalSeverity || null,
      dto.businessImpact || null,
      dto.impactBreadth || null,
      dto.rejectionOrDeclineReason || null,
      dto.duplicateOfRequestId || null,
      dto.linkedTaskId || null,
      dto.affectedVersion || null,
      dto.targetFixVersion || null,
      userId,
      id,
    ]);

    // If notes are supplied, add an internal message
    if (dto.notes) {
      await this.addInternalMessage(
        id,
        { message: dto.notes, isInternalOnly: true },
        userId,
      );
    }

    return result.rows[0];
  }

  async linkTask(id: string, linkedTaskId: string, userId: string) {
    const taskCheck = await this.db.query(
      `SELECT id, task_number, title FROM tasks WHERE id = $1 AND is_active = TRUE`,
      [linkedTaskId],
    );
    if (taskCheck.rowCount === 0) {
      throw new NotFoundException(`Task with ID ${linkedTaskId} not found`);
    }

    const updateQuery = `
      UPDATE client_intake_requests SET
        linked_task_id = $1,
        status = CASE WHEN status = 'SUBMITTED' THEN 'ACCEPTED' ELSE status END,
        triaged_by = COALESCE(triaged_by, $2),
        triaged_at = COALESCE(triaged_at, CURRENT_TIMESTAMP),
        updated_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *;
    `;

    const result = await this.db.query(updateQuery, [linkedTaskId, userId, id]);
    return {
      message: `Request linked to task ${taskCheck.rows[0].task_number} successfully`,
      request: result.rows[0],
    };
  }

  async createTaskFromRequest(
    id: string,
    createDto: {
      projectId: string;
      taskTypeId?: string;
      title?: string;
      priority?: string;
    },
    userId: string,
  ) {
    const req = await this.getInternalRequestById(id);

    // Get default status for project or global
    const statusResult = await this.db.query(
      `SELECT id FROM task_statuses WHERE is_default = TRUE LIMIT 1`,
    );
    const defaultStatusId = statusResult.rows[0]?.id;

    // Get task type
    let taskTypeId = createDto.taskTypeId;
    if (!taskTypeId) {
      const typeCode = req.request_type === 'BUG' ? 'TT-BUG' : 'TT-TASK';
      const typeResult = await this.db.query(
        `SELECT id FROM task_types WHERE type_code = $1 LIMIT 1`,
        [typeCode],
      );
      taskTypeId = typeResult.rows[0]?.id;
    }

    const countResult = await this.db.query(`SELECT COUNT(id)::int AS cnt FROM tasks`);
    const taskSeq = (countResult.rows[0]?.cnt || 0) + 1;
    const taskNumber = `TASK-${taskSeq.toString().padStart(5, '0')}`;

    const insertTaskQuery = `
      INSERT INTO tasks (
        task_number, title, description, project_id, task_type_id,
        status_id, priority, is_active, created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, TRUE, $8, $8
      )
      RETURNING *;
    `;

    const taskResult = await this.db.query(insertTaskQuery, [
      taskNumber,
      createDto.title || req.title,
      `[Created from Client Request ${req.request_number}]\n\n${req.description}`,
      createDto.projectId || req.project_id,
      taskTypeId,
      defaultStatusId,
      createDto.priority || req.internal_priority || req.client_priority || 'MEDIUM',
      userId,
    ]);

    const createdTask = taskResult.rows[0];

    // Atomically link to request and mark as ACCEPTED
    await this.linkTask(id, createdTask.id, userId);

    return {
      message: `Created delivery task ${createdTask.task_number} and linked to request ${req.request_number}`,
      task: createdTask,
    };
  }

  async addInternalMessage(
    id: string,
    dto: CreateRequestMessageDto,
    userId: string,
  ) {
    await this.getInternalRequestById(id);

    const insertQuery = `
      INSERT INTO client_request_messages (
        request_id, sender_type, user_id, message, is_internal_only,
        attachments, is_active, created_by, updated_by
      ) VALUES (
        $1, 'INTERNAL_USER', $2, $3, $4,
        $5, TRUE, $2, $2
      )
      RETURNING *;
    `;

    const result = await this.db.query(insertQuery, [
      id,
      userId,
      dto.message,
      dto.isInternalOnly === true,
      JSON.stringify(dto.attachments || []),
    ]);

    return result.rows[0];
  }

  async getImpactSummary() {
    // 1. Requests by status
    const statusQuery = `
      SELECT status, COUNT(id)::int AS count
      FROM client_intake_requests
      WHERE is_active = TRUE
      GROUP BY status;
    `;
    const statusStats = await this.db.query(statusQuery);

    // 2. Requests by Business Impact
    const impactQuery = `
      SELECT business_impact, COUNT(id)::int AS count
      FROM client_intake_requests
      WHERE is_active = TRUE
      GROUP BY business_impact;
    `;
    const impactStats = await this.db.query(impactQuery);

    // 3. Requests by Impact Breadth
    const breadthQuery = `
      SELECT impact_breadth, COUNT(id)::int AS count
      FROM client_intake_requests
      WHERE is_active = TRUE
      GROUP BY impact_breadth;
    `;
    const breadthStats = await this.db.query(breadthQuery);

    // 4. Requests by Request Type
    const typeQuery = `
      SELECT request_type, COUNT(id)::int AS count
      FROM client_intake_requests
      WHERE is_active = TRUE
      GROUP BY request_type;
    `;
    const typeStats = await this.db.query(typeQuery);

    return {
      byStatus: statusStats.rows,
      byBusinessImpact: impactStats.rows,
      byImpactBreadth: breadthStats.rows,
      byRequestType: typeStats.rows,
    };
  }

  // ========================================================
  // Helpers
  // ========================================================

  private mapCustomerFacingRequest(row: any) {
    let customerStatus = 'Received';
    let customerStatusColor = 'blue';

    if (row.status === 'SUBMITTED') {
      customerStatus = 'Received';
      customerStatusColor = 'blue';
    } else if (row.status === 'UNDER_REVIEW') {
      customerStatus = 'In review';
      customerStatusColor = 'amber';
    } else if (row.status === 'NEEDS_INFORMATION') {
      customerStatus = 'Action needed from you';
      customerStatusColor = 'orange';
    } else if (row.status === 'DECLINED') {
      customerStatus = 'Declined';
      customerStatusColor = 'red';
    } else if (row.status === 'DUPLICATE') {
      customerStatus = 'Duplicate (Linked)';
      customerStatusColor = 'zinc';
    } else if (row.status === 'ACCEPTED') {
      const category = (row.linked_task_status_category || '').toUpperCase();
      const statusName = (row.linked_task_status_name || '').toUpperCase();

      if (category === 'COMPLETED' || statusName.includes('CLOSED') || statusName.includes('DONE')) {
        customerStatus = 'Accepted / Closed';
        customerStatusColor = 'emerald';
      } else if (statusName.includes('UAT') || statusName.includes('CLIENT')) {
        customerStatus = 'Awaiting your acceptance';
        customerStatusColor = 'purple';
      } else if (statusName.includes('TEST') || statusName.includes('QA')) {
        customerStatus = 'In QA';
        customerStatusColor = 'indigo';
      } else if (category === 'IN_PROGRESS' || category === 'IN_REVIEW') {
        customerStatus = 'In progress';
        customerStatusColor = 'sky';
      } else {
        customerStatus = 'Scheduled';
        customerStatusColor = 'teal';
      }
    }

    return {
      id: row.id,
      requestNumber: row.request_number,
      requestType: row.request_type,
      title: row.title,
      description: row.description,
      clientPriority: row.client_priority,
      businessImpact: row.business_impact,
      impactBreadth: row.impact_breadth,
      environmentDetails: row.environment_details,
      attachments: row.attachments,
      projectName: row.project_name || null,
      projectCode: row.project_code || null,
      productName: row.product_name || null,
      productCode: row.product_code || null,
      componentName: row.component_name || null,
      submitterName: row.submitter_name,
      customerStatus,
      customerStatusColor,
      rejectionReason: row.status === 'DECLINED' ? row.rejection_or_decline_reason : null,
      affectedVersion: row.affected_version || null,
      targetFixVersion: row.target_fix_version || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
