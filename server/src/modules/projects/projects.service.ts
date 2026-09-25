import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AllocateMemberDto } from './dto/allocate-member.dto';
import { QueryProjectDto } from './dto/query-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly db: DatabaseService) {}

  // ----------------------------------------------------
  // Projects Master
  // ----------------------------------------------------

  async create(dto: CreateProjectDto, userId: string, activeBranchId?: string) {
    const checkQuery = `SELECT id FROM projects WHERE project_code = $1;`;
    const checkResult = await this.db.query(checkQuery, [dto.projectCode]);
    if (checkResult.rowCount > 0) {
      throw new BadRequestException(`Project code '${dto.projectCode}' already exists.`);
    }

    const isValidUuid = (val?: string | null) =>
      typeof val === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    // Resolve branch ID
    let branchId = isValidUuid(dto.branchId) ? dto.branchId : (isValidUuid(activeBranchId) ? activeBranchId : undefined);
    if (!branchId) {
      const branchRes = await this.db.query(
        `SELECT primary_branch_id FROM users WHERE id = $1;`,
        [userId],
      );
      branchId = branchRes.rows[0]?.primary_branch_id;
    }
    if (!branchId) {
      const defaultBranch = await this.db.query(
        `SELECT id FROM branches ORDER BY is_head_office DESC, created_at ASC LIMIT 1;`,
      );
      branchId = defaultBranch.rows[0]?.id;
    }

    // Resolve Project Manager User ID
    const projectManagerUserId = isValidUuid(dto.projectManagerUserId) ? dto.projectManagerUserId : userId;

    // Resolve billing type (map FIXED_PRICE to FIXED_COST)
    let billingType = dto.billingType || 'FIXED_COST';
    if (billingType === 'FIXED_PRICE') {
      billingType = 'FIXED_COST';
    }

    // Resolve budgeted hours (support totalBudgetHours alias)
    const budgetedHours = dto.budgetedHours ?? dto.totalBudgetHours ?? 0.00;

    // Resolve client ID (if null/empty, check if fallback client exists)
    let clientId = dto.clientId || null;
    if (!clientId) {
      const defaultClient = await this.db.query(
        `SELECT id FROM clients ORDER BY created_at ASC LIMIT 1;`,
      );
      if (defaultClient.rowCount > 0) {
        clientId = defaultClient.rows[0].id;
      }
    }

    const insertQuery = `
      INSERT INTO projects (
        project_code, project_name, description, client_id,
        branch_id, project_manager_user_id, billing_type, contract_amount,
        hourly_rate, budgeted_hours, currency, planned_start_date,
        planned_end_date, project_status, is_active, created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        $14, TRUE, $15, $15
      )
      RETURNING *;
    `;

    const result = await this.db.query(insertQuery, [
      dto.projectCode,
      dto.projectName,
      dto.description || null,
      clientId,
      branchId,
      projectManagerUserId,
      billingType,
      dto.contractAmount || 0.00,
      dto.hourlyRate || 0.00,
      budgetedHours,
      dto.currency || 'INR',
      dto.plannedStartDate || null,
      dto.plannedEndDate || null,
      dto.projectStatus || 'PLANNING',
      userId,
    ]);

    return result.rows[0];
  }

  async findAll(query: QueryProjectDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const params: any[] = [];
    const whereClauses: string[] = [];

    if (!query.includeInactive) {
      whereClauses.push('p.is_active = TRUE');
    }

    if (query.clientId) {
      params.push(query.clientId);
      whereClauses.push(`p.client_id = $${params.length}`);
    }

    if (query.branchId) {
      params.push(query.branchId);
      whereClauses.push(`p.branch_id = $${params.length}`);
    }

    if (query.projectManagerUserId) {
      params.push(query.projectManagerUserId);
      whereClauses.push(`p.project_manager_user_id = $${params.length}`);
    }

    if (query.projectStatus) {
      params.push(query.projectStatus);
      whereClauses.push(`p.project_status = $${params.length}`);
    }

    if (query.search) {
      params.push(`%${query.search.trim()}%`);
      whereClauses.push(`(p.project_code ILIKE $${params.length} OR p.project_name ILIKE $${params.length})`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(p.id) AS total FROM projects p ${whereSql};`;
    const countResult = await this.db.query(countSql, params);
    const totalRecords = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(totalRecords / limit);

    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const dataSql = `
      SELECT 
        p.*,
        c.company_name AS client_name,
        b.branch_name,
        CONCAT(u.first_name, ' ', u.last_name) AS project_manager_name,
        COUNT(DISTINCT pm.user_id) AS team_members_count,
        COUNT(DISTINCT t.id) AS total_tasks_count
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.id
      INNER JOIN branches b ON p.branch_id = b.id
      INNER JOIN users u ON p.project_manager_user_id = u.id
      LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.is_active = TRUE
      LEFT JOIN tasks t ON p.id = t.project_id
      ${whereSql}
      GROUP BY p.id, c.company_name, b.branch_name, u.first_name, u.last_name
      ORDER BY p.created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx};
    `;

    const dataResult = await this.db.query(dataSql, params);

    return {
      data: dataResult.rows,
      meta: {
        page,
        limit,
        totalRecords,
        totalPages,
      },
    };
  }

  async findOne(id: string) {
    const query = `
      SELECT 
        p.*,
        c.company_name AS client_name,
        c.contact_person AS client_contact,
        c.email AS client_email,
        b.branch_name,
        CONCAT(u.first_name, ' ', u.last_name) AS project_manager_name,
        u.email AS project_manager_email
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.id
      INNER JOIN branches b ON p.branch_id = b.id
      INNER JOIN users u ON p.project_manager_user_id = u.id
      WHERE p.id = $1;
    `;
    const result = await this.db.query(query, [id]);
    if (result.rowCount === 0) {
      throw new NotFoundException(`Project with ID ${id} not found.`);
    }

    const project = result.rows[0];

    // Team members
    const members = await this.findMembers(id);

    // Versions / Sprints
    const versionsQuery = `
      SELECT id, version_code, version_name, planned_start_date, target_release_date, status
      FROM versions
      WHERE project_id = $1 AND is_active = TRUE
      ORDER BY created_at DESC;
    `;
    const versionsResult = await this.db.query(versionsQuery, [id]);

    return {
      ...project,
      teamMembers: members,
      versions: versionsResult.rows,
    };
  }

  async update(id: string, dto: UpdateProjectDto, userId: string) {
    await this.findOne(id);

    const updateQuery = `
      UPDATE projects SET
        project_name = COALESCE($1, project_name),
        description = COALESCE($2, description),
        client_id = COALESCE($3, client_id),
        branch_id = COALESCE($4, branch_id),
        project_manager_user_id = COALESCE($5, project_manager_user_id),
        billing_type = COALESCE($6, billing_type),
        contract_amount = COALESCE($7, contract_amount),
        hourly_rate = COALESCE($8, hourly_rate),
        budgeted_hours = COALESCE($9, budgeted_hours),
        currency = COALESCE($10, currency),
        planned_start_date = COALESCE($11, planned_start_date),
        planned_end_date = COALESCE($12, planned_end_date),
        actual_start_date = COALESCE($13, actual_start_date),
        actual_end_date = COALESCE($14, actual_end_date),
        project_status = COALESCE($15, project_status),
        is_active = COALESCE($16, is_active),
        updated_by = $17,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $18
      RETURNING *;
    `;

    const result = await this.db.query(updateQuery, [
      dto.projectName,
      dto.description,
      dto.clientId,
      dto.branchId,
      dto.projectManagerUserId,
      dto.billingType,
      dto.contractAmount,
      dto.hourlyRate,
      dto.budgetedHours,
      dto.currency,
      dto.plannedStartDate,
      dto.plannedEndDate,
      dto.actualStartDate,
      dto.actualEndDate,
      dto.projectStatus,
      dto.isActive,
      userId,
      id,
    ]);

    return result.rows[0];
  }

  async toggleActive(id: string, isActive: boolean, userId: string) {
    await this.findOne(id);
    const query = `
      UPDATE projects SET
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
  // Team Allocation Management
  // ----------------------------------------------------

  async allocateMember(projectId: string, dto: AllocateMemberDto, userId: string) {
    await this.findOne(projectId);

    const upsertQuery = `
      INSERT INTO project_members (
        project_id, user_id, project_role, allocation_percentage,
        start_date, end_date, is_active, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, $7)
      ON CONFLICT (project_id, user_id)
      DO UPDATE SET
        project_role = EXCLUDED.project_role,
        allocation_percentage = EXCLUDED.allocation_percentage,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        is_active = TRUE,
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    const result = await this.db.query(upsertQuery, [
      projectId,
      dto.userId,
      dto.projectRole,
      dto.allocationPercentage || 100.00,
      dto.startDate || null,
      dto.endDate || null,
      userId,
    ]);

    return result.rows[0];
  }

  async findMembers(projectId: string) {
    const query = `
      SELECT 
        pm.id AS allocation_id,
        pm.user_id,
        u.employee_code,
        CONCAT(u.first_name, ' ', u.last_name) AS full_name,
        u.email,
        u.avatar_s3_key,
        des.desig_name,
        pm.project_role,
        pm.allocation_percentage,
        pm.start_date,
        pm.end_date,
        pm.is_active
      FROM project_members pm
      INNER JOIN users u ON pm.user_id = u.id
      INNER JOIN designations des ON u.designation_id = des.id
      WHERE pm.project_id = $1 AND pm.is_active = TRUE
      ORDER BY pm.allocation_percentage DESC;
    `;
    const result = await this.db.query(query, [projectId]);
    return result.rows;
  }

  async removeMember(projectId: string, userId: string) {
    const query = `
      UPDATE project_members SET
        is_active = FALSE,
        updated_at = CURRENT_TIMESTAMP
      WHERE project_id = $1 AND user_id = $2
      RETURNING *;
    `;
    const result = await this.db.query(query, [projectId, userId]);
    if (result.rowCount === 0) {
      throw new NotFoundException('Member allocation not found for this project.');
    }
    return { success: true, message: 'Member deallocated from project' };
  }

  // ----------------------------------------------------
  // Financial & Effort Summary
  // ----------------------------------------------------

  async getFinancialSummary(projectId: string) {
    const query = `
      SELECT * FROM vw_project_financial_summary
      WHERE project_id = $1;
    `;
    const result = await this.db.query(query, [projectId]);
    if (result.rowCount === 0) {
      throw new NotFoundException(`Financial summary for project ${projectId} not found.`);
    }
    return result.rows[0];
  }
}
