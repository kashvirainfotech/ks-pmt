import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  CreateRaidItemDto,
  RaidCategory,
  RaidLikelihood,
  RaidImpact,
  ClientVisibility,
} from './dto/create-raid-item.dto';
import { UpdateRaidItemDto } from './dto/update-raid-item.dto';
import { CreateClientActionRequestDto } from './dto/create-client-action-request.dto';
import { RespondClientActionRequestDto } from './dto/respond-client-action-request.dto';
import { QueryRaidDto, QueryClientActionDto } from './dto/query-raid.dto';
import { ClientContactUser } from '../client-portal/client-portal.service';

@Injectable()
export class RaidService {
  constructor(private readonly db: DatabaseService) {}

  // ==========================================
  // 1. Code Generators
  // ==========================================

  private async generateItemCode(category: RaidCategory): Promise<string> {
    const prefixMap: Record<RaidCategory, string> = {
      [RaidCategory.RISK]: 'RSK',
      [RaidCategory.ASSUMPTION]: 'ASM',
      [RaidCategory.DECISION]: 'DEC',
      [RaidCategory.ISSUE]: 'ISS',
    };
    const prefix = prefixMap[category] || 'RAID';
    const year = new Date().getFullYear();
    const seqPattern = `${prefix}-${year}-%`;

    const res = await this.db.query(
      `SELECT item_code FROM raid_items WHERE item_code LIKE $1 ORDER BY item_code DESC LIMIT 1`,
      [seqPattern],
    );

    let nextNum = 1;
    if (res.rowCount && res.rowCount > 0) {
      const match = res.rows[0].item_code.match(new RegExp(`${prefix}-${year}-(\\d+)`));
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    return `${prefix}-${year}-${String(nextNum).padStart(4, '0')}`;
  }

  private async generateActionCode(): Promise<string> {
    const year = new Date().getFullYear();
    const seqPattern = `ACT-${year}-%`;

    const res = await this.db.query(
      `SELECT action_code FROM client_action_requests WHERE action_code LIKE $1 ORDER BY action_code DESC LIMIT 1`,
      [seqPattern],
    );

    let nextNum = 1;
    if (res.rowCount && res.rowCount > 0) {
      const match = res.rows[0].action_code.match(new RegExp(`ACT-${year}-(\\d+)`));
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    return `ACT-${year}-${String(nextNum).padStart(4, '0')}`;
  }

  private calculateRiskScore(likelihood?: RaidLikelihood, impact?: RaidImpact): number | undefined {
    if (!likelihood || !impact) return undefined;
    const lMap: Record<RaidLikelihood, number> = {
      [RaidLikelihood.LOW]: 1,
      [RaidLikelihood.MEDIUM]: 2,
      [RaidLikelihood.HIGH]: 3,
      [RaidLikelihood.VERY_HIGH]: 4,
    };
    const iMap: Record<RaidImpact, number> = {
      [RaidImpact.LOW]: 1,
      [RaidImpact.MEDIUM]: 2,
      [RaidImpact.HIGH]: 3,
      [RaidImpact.CRITICAL]: 4,
    };
    return (lMap[likelihood] || 1) * (iMap[impact] || 1);
  }

  // ==========================================
  // 2. RAID Items (Risks, Assumptions, Decisions, Issues)
  // ==========================================

  async createRaidItem(dto: CreateRaidItemDto, user: { userId: string }) {
    const itemCode = await this.generateItemCode(dto.category);
    const score = dto.riskScore ?? this.calculateRiskScore(dto.likelihood, dto.impact);

    let defaultStatus = 'OPEN';
    if (dto.category === RaidCategory.RISK) defaultStatus = 'IDENTIFIED';
    else if (dto.category === RaidCategory.ASSUMPTION) defaultStatus = 'VALIDATING';
    else if (dto.category === RaidCategory.DECISION) defaultStatus = 'PROPOSED';

    const status = dto.status || defaultStatus;

    if (dto.supersedesId) {
      const priorCheck = await this.db.query(
        `SELECT id, category, status FROM raid_items WHERE id = $1 AND is_active = TRUE`,
        [dto.supersedesId],
      );
      if (priorCheck.rowCount === 0) {
        throw new NotFoundException(`Prior decision with ID ${dto.supersedesId} not found`);
      }
    }

    const query = `
      INSERT INTO raid_items (
        item_code, category, project_id, product_id, title, description,
        owner_user_id, review_date, status, likelihood, impact, risk_score,
        mitigation_plan, contingency_plan, internal_discussion,
        requirement_id, milestone_id, task_id, component_id, realized_blocker_episode_id,
        participants, context, alternatives_considered, rationale, consequences,
        technical_impact, business_impact, supersedes_id,
        is_client_shared, client_visibility, client_summary,
        current_revision, created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12,
        $13, $14, $15,
        $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25,
        $26, $27, $28,
        $29, $30, $31,
        1, $32, $32
      )
      RETURNING *;
    `;

    const values = [
      itemCode,
      dto.category,
      dto.projectId || null,
      dto.productId || null,
      dto.title,
      dto.description || null,
      dto.ownerUserId || null,
      dto.reviewDate || null,
      status,
      dto.likelihood || null,
      dto.impact || null,
      score || null,
      dto.mitigationPlan || null,
      dto.contingencyPlan || null,
      dto.internalDiscussion || null,
      dto.requirementId || null,
      dto.milestoneId || null,
      dto.taskId || null,
      dto.componentId || null,
      dto.realizedBlockerEpisodeId || null,
      JSON.stringify(dto.participants || []),
      dto.context || null,
      JSON.stringify(dto.alternativesConsidered || []),
      dto.rationale || null,
      dto.consequences || null,
      dto.technicalImpact || null,
      dto.businessImpact || null,
      dto.supersedesId || null,
      dto.isClientShared ?? false,
      dto.clientVisibility || ClientVisibility.INTERNAL_ONLY,
      dto.clientSummary || null,
      user.userId,
    ];

    const result = await this.db.query(query, values);
    const createdItem = result.rows[0];

    // If supersedesId was supplied, link the prior decision
    if (dto.supersedesId) {
      await this.db.query(
        `UPDATE raid_items
         SET superseded_by_id = $1, status = 'SUPERSEDED', updated_by = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [createdItem.id, user.userId, dto.supersedesId],
      );
    }

    // Record Revision 1 snapshot
    await this.db.query(
      `INSERT INTO raid_item_revisions (raid_item_id, revision_number, snapshot, change_summary, created_by, updated_by)
       VALUES ($1, 1, $2, $3, $4, $4)`,
      [
        createdItem.id,
        JSON.stringify(createdItem),
        'Initial record creation',
        user.userId,
      ],
    );

    return createdItem;
  }

  async updateRaidItem(id: string, dto: UpdateRaidItemDto, user: { userId: string }) {
    const existing = await this.getRaidItemById(id);

    const calculatedScore =
      dto.riskScore ??
      this.calculateRiskScore(
        dto.likelihood || existing.likelihood,
        dto.impact || existing.impact,
      );

    const nextRevision = (existing.current_revision || 1) + 1;

    const query = `
      UPDATE raid_items SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        owner_user_id = COALESCE($3, owner_user_id),
        review_date = COALESCE($4, review_date),
        status = COALESCE($5, status),
        likelihood = COALESCE($6, likelihood),
        impact = COALESCE($7, impact),
        risk_score = COALESCE($8, risk_score),
        mitigation_plan = COALESCE($9, mitigation_plan),
        contingency_plan = COALESCE($10, contingency_plan),
        internal_discussion = COALESCE($11, internal_discussion),
        requirement_id = COALESCE($12, requirement_id),
        milestone_id = COALESCE($13, milestone_id),
        task_id = COALESCE($14, task_id),
        component_id = COALESCE($15, component_id),
        realized_blocker_episode_id = COALESCE($16, realized_blocker_episode_id),
        participants = COALESCE($17, participants),
        context = COALESCE($18, context),
        alternatives_considered = COALESCE($19, alternatives_considered),
        rationale = COALESCE($20, rationale),
        consequences = COALESCE($21, consequences),
        technical_impact = COALESCE($22, technical_impact),
        business_impact = COALESCE($23, business_impact),
        superseded_by_id = COALESCE($24, superseded_by_id),
        is_client_shared = COALESCE($25, is_client_shared),
        client_visibility = COALESCE($26, client_visibility),
        client_summary = COALESCE($27, client_summary),
        current_revision = $28,
        updated_by = $29,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $30
      RETURNING *;
    `;

    const values = [
      dto.title ?? null,
      dto.description ?? null,
      dto.ownerUserId ?? null,
      dto.reviewDate ?? null,
      dto.status ?? null,
      dto.likelihood ?? null,
      dto.impact ?? null,
      calculatedScore ?? null,
      dto.mitigationPlan ?? null,
      dto.contingencyPlan ?? null,
      dto.internalDiscussion ?? null,
      dto.requirementId ?? null,
      dto.milestoneId ?? null,
      dto.taskId ?? null,
      dto.componentId ?? null,
      dto.realizedBlockerEpisodeId ?? null,
      dto.participants ? JSON.stringify(dto.participants) : null,
      dto.context ?? null,
      dto.alternativesConsidered ? JSON.stringify(dto.alternativesConsidered) : null,
      dto.rationale ?? null,
      dto.consequences ?? null,
      dto.technicalImpact ?? null,
      dto.businessImpact ?? null,
      dto.supersededById ?? null,
      dto.isClientShared !== undefined ? dto.isClientShared : null,
      dto.clientVisibility ?? null,
      dto.clientSummary ?? null,
      nextRevision,
      user.userId,
      id,
    ];

    const result = await this.db.query(query, values);
    const updated = result.rows[0];

    // Snapshot revision
    await this.db.query(
      `INSERT INTO raid_item_revisions (raid_item_id, revision_number, snapshot, change_summary, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $5)`,
      [
        id,
        nextRevision,
        JSON.stringify(updated),
        dto.changeSummary || 'Updated record attributes',
        user.userId,
      ],
    );

    return updated;
  }

  async supersedeDecision(
    id: string,
    dto: {
      newTitle: string;
      rationale: string;
      context?: string;
      alternativesConsidered?: any[];
      consequences?: string;
      technicalImpact?: string;
      businessImpact?: string;
      participants?: any[];
      isClientShared?: boolean;
      clientVisibility?: ClientVisibility;
      clientSummary?: string;
      changeSummary?: string;
    },
    user: { userId: string },
  ) {
    const prior = await this.getRaidItemById(id);
    if (prior.category !== RaidCategory.DECISION) {
      throw new BadRequestException('Only DECISION items can undergo architecture supersession');
    }

    // Explicit domain requirement: "A superseded technical decision does not itself approve a commercial scope change"
    // We document and ensure this action is pure technical decision governance.

    // 1. Create successor decision
    const successor = await this.createRaidItem(
      {
        category: RaidCategory.DECISION,
        projectId: prior.project_id,
        productId: prior.product_id,
        title: dto.newTitle,
        context: dto.context || prior.context,
        rationale: dto.rationale,
        alternativesConsidered: dto.alternativesConsidered || prior.alternatives_considered,
        consequences: dto.consequences,
        technicalImpact: dto.technicalImpact,
        businessImpact: dto.businessImpact,
        participants: dto.participants || prior.participants,
        supersedesId: prior.id,
        isClientShared: dto.isClientShared ?? prior.is_client_shared,
        clientVisibility: dto.clientVisibility || prior.client_visibility,
        clientSummary: dto.clientSummary,
        status: 'ACCEPTED',
      },
      user,
    );

    // 2. Mark prior as SUPERSEDED
    await this.updateRaidItem(
      prior.id,
      {
        status: 'SUPERSEDED',
        supersededById: successor.id,
        changeSummary:
          dto.changeSummary || `Superseded by architectural decision ${successor.item_code}`,
      },
      user,
    );

    return {
      message: `Decision ${prior.item_code} successfully superseded by ${successor.item_code}`,
      priorDecisionId: prior.id,
      successorDecision: successor,
    };
  }

  async getRaidItems(query: QueryRaidDto) {
    const conditions: string[] = ['ri.is_active = TRUE'];
    const values: any[] = [];
    let pIdx = 1;

    if (query.projectId) {
      conditions.push(`ri.project_id = $${pIdx++}`);
      values.push(query.projectId);
    }
    if (query.productId) {
      conditions.push(`ri.product_id = $${pIdx++}`);
      values.push(query.productId);
    }
    if (query.category) {
      conditions.push(`ri.category = $${pIdx++}`);
      values.push(query.category);
    }
    if (query.status) {
      conditions.push(`ri.status = $${pIdx++}`);
      values.push(query.status);
    }
    if (query.likelihood) {
      conditions.push(`ri.likelihood = $${pIdx++}`);
      values.push(query.likelihood);
    }
    if (query.impact) {
      conditions.push(`ri.impact = $${pIdx++}`);
      values.push(query.impact);
    }
    if (query.isClientShared !== undefined) {
      conditions.push(`ri.is_client_shared = $${pIdx++}`);
      values.push(query.isClientShared);
    }
    if (query.search) {
      conditions.push(`(ri.title ILIKE $${pIdx} OR ri.item_code ILIKE $${pIdx} OR ri.description ILIKE $${pIdx})`);
      values.push(`%${query.search}%`);
      pIdx++;
    }

    const sql = `
      SELECT ri.*,
             p.project_name, p.project_code,
             pr.product_name, pr.product_code,
             CONCAT(u.first_name, ' ', u.last_name) AS owner_name,
             u.email AS owner_email,
             r.req_code, r.title AS requirement_title,
             m.milestone_name, m.milestone_code,
             sc.component_name, sc.component_code,
             t.task_code, t.title AS task_title,
             tbe.reason AS blocker_reason,
             succ.item_code AS superseded_by_code,
             succ.title AS superseded_by_title,
             prev.item_code AS supersedes_code,
             prev.title AS supersedes_title
      FROM raid_items ri
      LEFT JOIN projects p ON ri.project_id = p.id
      LEFT JOIN products pr ON ri.product_id = pr.id
      LEFT JOIN users u ON ri.owner_user_id = u.id
      LEFT JOIN requirement_specifications r ON ri.requirement_id = r.id
      LEFT JOIN milestones m ON ri.milestone_id = m.id
      LEFT JOIN software_components sc ON ri.component_id = sc.id
      LEFT JOIN tasks t ON ri.task_id = t.id
      LEFT JOIN task_blocker_episodes tbe ON ri.realized_blocker_episode_id = tbe.id
      LEFT JOIN raid_items succ ON ri.superseded_by_id = succ.id
      LEFT JOIN raid_items prev ON ri.supersedes_id = prev.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY ri.created_at DESC;
    `;

    const res = await this.db.query(sql, values);
    return res.rows;
  }

  async getRaidItemById(id: string) {
    const sql = `
      SELECT ri.*,
             p.project_name, p.project_code,
             pr.product_name, pr.product_code,
             CONCAT(u.first_name, ' ', u.last_name) AS owner_name,
             u.email AS owner_email,
             r.req_code, r.title AS requirement_title,
             m.milestone_name, m.milestone_code,
             sc.component_name, sc.component_code,
             t.task_code, t.title AS task_title,
             tbe.reason AS blocker_reason,
             succ.item_code AS superseded_by_code,
             succ.title AS superseded_by_title,
             prev.item_code AS supersedes_code,
             prev.title AS supersedes_title
      FROM raid_items ri
      LEFT JOIN projects p ON ri.project_id = p.id
      LEFT JOIN products pr ON ri.product_id = pr.id
      LEFT JOIN users u ON ri.owner_user_id = u.id
      LEFT JOIN requirement_specifications r ON ri.requirement_id = r.id
      LEFT JOIN milestones m ON ri.milestone_id = m.id
      LEFT JOIN software_components sc ON ri.component_id = sc.id
      LEFT JOIN tasks t ON ri.task_id = t.id
      LEFT JOIN task_blocker_episodes tbe ON ri.realized_blocker_episode_id = tbe.id
      LEFT JOIN raid_items succ ON ri.superseded_by_id = succ.id
      LEFT JOIN raid_items prev ON ri.supersedes_id = prev.id
      WHERE ri.id = $1 AND ri.is_active = TRUE;
    `;

    const res = await this.db.query(sql, [id]);
    if (res.rowCount === 0) {
      throw new NotFoundException(`RAID item with ID ${id} not found`);
    }

    const item = res.rows[0];

    // Fetch revision history
    const revRes = await this.db.query(
      `SELECT rir.*, CONCAT(u.first_name, ' ', u.last_name) AS author_name
       FROM raid_item_revisions rir
       LEFT JOIN users u ON rir.created_by = u.id
       WHERE rir.raid_item_id = $1 AND rir.is_active = TRUE
       ORDER BY rir.revision_number DESC;`,
      [id],
    );
    item.revisions = revRes.rows;

    // Fetch linked client action requests
    const actRes = await this.db.query(
      `SELECT car.*,
              c.company_name AS client_name,
              CONCAT(cc.first_name, ' ', cc.last_name) AS assigned_contact_name,
              CONCAT(resp.first_name, ' ', resp.last_name) AS responded_by_contact_name
       FROM client_action_requests car
       LEFT JOIN clients c ON car.client_id = c.id
       LEFT JOIN client_contacts cc ON car.assigned_contact_id = cc.id
       LEFT JOIN client_contacts resp ON car.responded_by_contact_id = resp.id
       WHERE car.raid_item_id = $1 AND car.is_active = TRUE
       ORDER BY car.created_at DESC;`,
      [id],
    );
    item.action_requests = actRes.rows;

    return item;
  }

  async deleteRaidItem(id: string, user: { userId: string }) {
    await this.getRaidItemById(id);
    await this.db.query(
      `UPDATE raid_items SET is_active = FALSE, updated_by = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [user.userId, id],
    );
    return { message: 'RAID item archived successfully' };
  }

  // ==========================================
  // 3. Client Action Requests (Publishing Actions & Decisions)
  // ==========================================

  async createClientActionRequest(dto: CreateClientActionRequestDto, user: { userId: string }) {
    const actionCode = await this.generateActionCode();

    // Verify client organization exists
    const clientCheck = await this.db.query(
      `SELECT id, company_name FROM clients WHERE id = $1 AND is_active = TRUE`,
      [dto.clientId],
    );
    if (clientCheck.rowCount === 0) {
      throw new NotFoundException(`Client organization with ID ${dto.clientId} not found`);
    }

    const query = `
      INSERT INTO client_action_requests (
        action_code, raid_item_id, project_id, product_id, client_id,
        title, description, context_for_client, priority, due_date,
        assigned_contact_id, requires_approver, status, created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, 'PENDING', $13, $13
      )
      RETURNING *;
    `;

    const values = [
      actionCode,
      dto.raidItemId || null,
      dto.projectId,
      dto.productId || null,
      dto.clientId,
      dto.title,
      dto.description,
      dto.contextForClient,
      dto.priority || 'MEDIUM',
      dto.dueDate,
      dto.assignedContactId || null,
      dto.requiresApprover ?? false,
      user.userId,
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async getClientActionRequests(query: QueryClientActionDto) {
    const conditions: string[] = ['car.is_active = TRUE'];
    const values: any[] = [];
    let pIdx = 1;

    if (query.projectId) {
      conditions.push(`car.project_id = $${pIdx++}`);
      values.push(query.projectId);
    }
    if (query.clientId) {
      conditions.push(`car.client_id = $${pIdx++}`);
      values.push(query.clientId);
    }
    if (query.status) {
      conditions.push(`car.status = $${pIdx++}`);
      values.push(query.status);
    }
    if (query.priority) {
      conditions.push(`car.priority = $${pIdx++}`);
      values.push(query.priority);
    }

    const sql = `
      SELECT car.*,
             p.project_name, p.project_code,
             c.company_name AS client_name,
             CONCAT(cc.first_name, ' ', cc.last_name) AS assigned_contact_name,
             CONCAT(resp.first_name, ' ', resp.last_name) AS responded_by_contact_name,
             ri.item_code AS raid_item_code, ri.category AS raid_category
      FROM client_action_requests car
      LEFT JOIN projects p ON car.project_id = p.id
      LEFT JOIN clients c ON car.client_id = c.id
      LEFT JOIN client_contacts cc ON car.assigned_contact_id = cc.id
      LEFT JOIN client_contacts resp ON car.responded_by_contact_id = resp.id
      LEFT JOIN raid_items ri ON car.raid_item_id = ri.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY car.due_date ASC, car.created_at DESC;
    `;

    const res = await this.db.query(sql, values);
    return res.rows;
  }

  async resolveClientActionRequest(
    id: string,
    dto: { resultingDecision: string; resultingChangeRequestId?: string; notes?: string },
    user: { userId: string },
  ) {
    const res = await this.db.query(
      `UPDATE client_action_requests SET
         status = 'RESOLVED',
         resulting_decision = COALESCE($1, resulting_decision),
         resulting_change_request_id = COALESCE($2, resulting_change_request_id),
         updated_by = $3,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND is_active = TRUE
       RETURNING *;`,
      [dto.resultingDecision || null, dto.resultingChangeRequestId || null, user.userId, id],
    );
    if (res.rowCount === 0) {
      throw new NotFoundException(`Client action request with ID ${id} not found`);
    }
    return res.rows[0];
  }

  // ==========================================
  // 4. Customer Portal: Zero Confidentiality Leakage Methods
  // ==========================================

  async getClientPortalActionRequests(contact: ClientContactUser, projectId?: string) {
    let sql = `
      SELECT car.id, car.action_code, car.title, car.description,
             car.context_for_client, car.priority, car.due_date,
             car.requires_approver, car.status, car.response_text,
             car.responded_at, car.resulting_decision,
             p.project_name, p.project_code,
             CONCAT(resp.first_name, ' ', resp.last_name) AS responded_by_name
      FROM client_action_requests car
      INNER JOIN client_contact_projects ccp ON car.project_id = ccp.project_id
             AND ccp.contact_id = $1 AND ccp.is_active = TRUE
      LEFT JOIN projects p ON car.project_id = p.id
      LEFT JOIN client_contacts resp ON car.responded_by_contact_id = resp.id
      WHERE car.client_id = $2 AND car.is_active = TRUE
    `;
    const params: any[] = [contact.contactId, contact.clientId];

    if (projectId) {
      sql += ` AND car.project_id = $3`;
      params.push(projectId);
    }

    sql += ` ORDER BY car.due_date ASC;`;

    const res = await this.db.query(sql, params);
    return res.rows;
  }

  async getClientPortalActionRequestDetail(id: string, contact: ClientContactUser) {
    const sql = `
      SELECT car.id, car.action_code, car.title, car.description,
             car.context_for_client, car.priority, car.due_date,
             car.requires_approver, car.status, car.response_text,
             car.responded_at, car.resulting_decision, car.project_id,
             p.project_name, p.project_code,
             CONCAT(resp.first_name, ' ', resp.last_name) AS responded_by_name
      FROM client_action_requests car
      INNER JOIN client_contact_projects ccp ON car.project_id = ccp.project_id
             AND ccp.contact_id = $1 AND ccp.is_active = TRUE
      LEFT JOIN projects p ON car.project_id = p.id
      LEFT JOIN client_contacts resp ON car.responded_by_contact_id = resp.id
      WHERE car.id = $2 AND car.client_id = $3 AND car.is_active = TRUE;
    `;

    const res = await this.db.query(sql, [contact.contactId, id, contact.clientId]);
    if (res.rowCount === 0) {
      throw new NotFoundException(`Action item not found or you do not have permission to view it`);
    }

    return res.rows[0];
  }

  async respondToClientActionRequest(
    id: string,
    dto: RespondClientActionRequestDto,
    contact: ClientContactUser,
  ) {
    const action = await this.getClientPortalActionRequestDetail(id, contact);

    if (action.status === 'RESOLVED') {
      throw new BadRequestException('This action request has already been finalized and resolved');
    }

    // Verify approval authorization if required
    if (action.requires_approver && !contact.isApprover) {
      const grantRes = await this.db.query(
        `SELECT can_approve_scope, can_approve_uat 
         FROM client_contact_projects 
         WHERE contact_id = $1 AND project_id = $2 AND is_active = TRUE`,
        [contact.contactId, action.project_id],
      );
      const grant = grantRes.rows ? grantRes.rows[0] : null;
      const hasAuthority = grant && (grant.can_approve_scope || grant.can_approve_uat);

      if (!hasAuthority) {
        throw new ForbiddenException(
          'This decision requires authorized client approver authority (contact.is_approver)',
        );
      }
    }

    const nextStatus =
      dto.resultingDecision === 'APPROVED' || dto.resultingDecision === 'REJECTED'
        ? 'RESPONDED'
        : 'IN_REVIEW';

    const updateSql = `
      UPDATE client_action_requests SET
        response_text = $1,
        responded_by_contact_id = $2,
        responded_at = CURRENT_TIMESTAMP,
        resulting_decision = $3,
        resulting_change_request_id = $4,
        status = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *;
    `;

    const res = await this.db.query(updateSql, [
      dto.responseText,
      contact.contactId,
      dto.resultingDecision,
      dto.resultingChangeRequestId || null,
      nextStatus,
      id,
    ]);

    return {
      message: 'Decision and feedback submitted successfully',
      action: res.rows[0],
    };
  }

  async getClientPortalDecisions(contact: ClientContactUser, projectId?: string) {
    // Requirements acceptance test:
    // "Acceptance: an unresolved client decision appears in the client's action list without exposing the internal risk discussion.
    // Decision records add participants, context, alternatives considered, rationale, consequences and technical/business impact;
    // link work, components and knowledge. Lifecycle: PROPOSED / ACCEPTED / REJECTED / SUPERSEDED, with a successor link and full history.
    // A superseded technical decision does not itself approve a commercial scope change."
    // Zero-leakage: internal_discussion is strictly omitted.

    let sql = `
      SELECT ri.id, ri.item_code, ri.title, ri.description,
             ri.status, ri.context, ri.alternatives_considered,
             ri.rationale, ri.consequences, ri.technical_impact,
             ri.business_impact, ri.client_visibility, ri.client_summary,
             ri.current_revision, ri.created_at, ri.updated_at,
             p.project_name, p.project_code,
             succ.item_code AS superseded_by_code,
             succ.title AS superseded_by_title,
             prev.item_code AS supersedes_code,
             prev.title AS supersedes_title
      FROM raid_items ri
      INNER JOIN client_contact_projects ccp ON ri.project_id = ccp.project_id
             AND ccp.contact_id = $1 AND ccp.is_active = TRUE
      LEFT JOIN projects p ON ri.project_id = p.id
      LEFT JOIN raid_items succ ON ri.superseded_by_id = succ.id
      LEFT JOIN raid_items prev ON ri.supersedes_id = prev.id
      WHERE ri.category = 'DECISION'
        AND ri.is_active = TRUE
        AND ri.is_client_shared = TRUE
        AND ri.client_visibility IN ('CLIENT_SUMMARY', 'CLIENT_FULL')
    `;
    const params: any[] = [contact.contactId];

    if (projectId) {
      sql += ` AND ri.project_id = $2`;
      params.push(projectId);
    }

    sql += ` ORDER BY ri.created_at DESC;`;

    const res = await this.db.query(sql, params);

    // If client_visibility === 'CLIENT_SUMMARY', redact detailed internal consequences/alternatives
    return res.rows.map((row) => {
      if (row.client_visibility === 'CLIENT_SUMMARY') {
        return {
          ...row,
          alternatives_considered: [],
          technical_impact: null,
          rationale: row.client_summary || row.rationale,
        };
      }
      return row;
    });
  }
}
