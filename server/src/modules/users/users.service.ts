import { persistExtended } from '../../database/extended-fields';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../../database/database.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PermissionOverrideDto } from './dto/permission-override.dto';
import { QueryUserDto } from './dto/query-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Provision a new employee / system user (Admin/HR only)
   */
  async create(dto: CreateUserDto, creatorUserId: string) {
    if ((dto.isEmailLoginAllowed ?? true) && !dto.password)
      throw new BadRequestException(
        'Password is required when email login is enabled',
      );
    if (dto.isEmailLoginAllowed === false && dto.isOtpLoginAllowed === false)
      throw new BadRequestException('Enable at least one login method');
    // 1. Check uniqueness
    const uniquenessQuery = `
      SELECT employee_code, email, mobile_number
      FROM users
      WHERE employee_code = $1 OR LOWER(email) = LOWER($2) OR mobile_number = $3;
    `;
    const uniquenessResult = await this.db.query(uniquenessQuery, [
      dto.employeeCode,
      dto.email,
      dto.mobileNumber,
    ]);

    if (uniquenessResult.rowCount > 0) {
      const existing = uniquenessResult.rows[0];
      if (existing.employee_code === dto.employeeCode) {
        throw new BadRequestException(
          `Employee code '${dto.employeeCode}' already exists.`,
        );
      }
      if (existing.email.toLowerCase() === dto.email.toLowerCase()) {
        throw new BadRequestException(
          `Email '${dto.email}' is already registered.`,
        );
      }
      if (existing.mobile_number === dto.mobileNumber) {
        throw new BadRequestException(
          `Mobile number '${dto.mobileNumber}' is already registered.`,
        );
      }
    }

    // 2. Hash password if provided
    let passwordHash: string | null = null;
    if (dto.password) {
      passwordHash = await bcrypt.hash(dto.password, 12);
    }

    // 3. Insert in transaction with secondary branches
    return await this.db.transaction(async (client) => {
      const insertUserQuery = `
        INSERT INTO users (
          employee_code, first_name, last_name, email, mobile_number,
          password_hash, primary_branch_id, department_id, designation_id,
          role_id, reporting_manager_id, is_email_login_allowed,
          is_otp_login_allowed, is_active, created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, TRUE, $14, $14
        )
        RETURNING id, employee_code, first_name, last_name, email, mobile_number,
                  primary_branch_id, department_id, designation_id, role_id,
                  reporting_manager_id, is_email_login_allowed, is_otp_login_allowed,
                  is_active, created_at;
      `;

      const userResult = await persistExtended(
        client,
        insertUserQuery,
        [
          dto.employeeCode,
          dto.firstName,
          dto.lastName,
          dto.email.toLowerCase(),
          dto.mobileNumber,
          passwordHash,
          dto.primaryBranchId,
          dto.departmentId,
          dto.designationId,
          dto.roleId,
          dto.reportingManagerId || null,
          dto.isEmailLoginAllowed ?? true,
          dto.isOtpLoginAllowed ?? true,
          creatorUserId,
        ],
        'users',
        {
          emergency_contact: dto.emergencyContact,
          employment_status: dto.employmentStatus,
          ...(dto.employmentStatus
            ? { is_active: dto.employmentStatus === 'ACTIVE' }
            : {}),
        },
      );

      const newUser = userResult.rows[0];

      // Insert secondary branch mappings
      if (dto.secondaryBranchIds && dto.secondaryBranchIds.length > 0) {
        for (const branchId of dto.secondaryBranchIds) {
          if (branchId !== dto.primaryBranchId) {
            await client.query(
              `INSERT INTO user_branches (user_id, branch_id, created_by, updated_by)
               VALUES ($1, $2, $3, $3)
               ON CONFLICT (user_id, branch_id) DO NOTHING;`,
              [newUser.id, branchId, creatorUserId],
            );
          }
        }
      }

      return newUser;
    });
  }

  /**
   * Filterable and paginated list of employees
   */
  async findAll(query: QueryUserDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const params: any[] = [];
    let whereClauses: string[] = [];

    if (!query.includeInactive) {
      whereClauses.push('u.is_active = TRUE');
    }

    if (query.branchId) {
      params.push(query.branchId);
      whereClauses.push(
        `(u.primary_branch_id = $${params.length} OR ub.branch_id = $${params.length})`,
      );
    }

    if (query.departmentId) {
      params.push(query.departmentId);
      whereClauses.push(`u.department_id = $${params.length}`);
    }

    if (query.designationId) {
      params.push(query.designationId);
      whereClauses.push(`u.designation_id = $${params.length}`);
    }

    if (query.roleId) {
      params.push(query.roleId);
      whereClauses.push(`u.role_id = $${params.length}`);
    }

    if (query.search) {
      params.push(`%${query.search.trim()}%`);
      whereClauses.push(`(
        u.employee_code ILIKE $${params.length} OR
        u.first_name ILIKE $${params.length} OR
        u.last_name ILIKE $${params.length} OR
        u.email ILIKE $${params.length}
      )`);
    }

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Total Count
    const countSql = `
      SELECT COUNT(DISTINCT u.id) AS total
      FROM users u
      LEFT JOIN user_branches ub ON u.id = ub.user_id
      ${whereSql};
    `;
    const countResult = await this.db.query(countSql, params);
    const totalRecords = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(totalRecords / limit);

    // Data query
    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const dataSql = `
      SELECT 
        u.id, u.employee_code, u.first_name, u.last_name, u.email, 
        to_jsonb(u)->>'emergency_contact' AS emergency_contact, to_jsonb(u)->>'employment_status' AS employment_status, u.mobile_number, u.avatar_s3_key, u.is_active,
        b.branch_name AS primary_branch_name,
        d.dept_name,
        des.desig_name, des.hierarchy_level,
        r.role_code, r.role_name,
        CONCAT(mgr.first_name, ' ', mgr.last_name) AS reporting_manager_name,
        u.last_login_at
      FROM users u
      INNER JOIN branches b ON u.primary_branch_id = b.id
      INNER JOIN departments d ON u.department_id = d.id
      INNER JOIN designations des ON u.designation_id = des.id
      INNER JOIN roles r ON u.role_id = r.id
      LEFT JOIN users mgr ON u.reporting_manager_id = mgr.id
      LEFT JOIN user_branches ub ON u.id = ub.user_id
      ${whereSql}
      GROUP BY u.id, b.branch_name, d.dept_name, des.desig_name, des.hierarchy_level, r.role_code, r.role_name, mgr.first_name, mgr.last_name
      ORDER BY u.created_at DESC
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

  /**
   * Get employee by ID with branches and permission overrides
   */
  async findOne(id: string) {
    const userQuery = `
      SELECT 
        u.id, u.employee_code, u.first_name, u.last_name, u.email,
        to_jsonb(u)->>'emergency_contact' AS emergency_contact, to_jsonb(u)->>'employment_status' AS employment_status, u.mobile_number, u.avatar_s3_key, u.is_email_login_allowed,
        u.is_otp_login_allowed, u.is_active, u.last_login_at, u.last_login_ip,
        u.created_at, u.updated_at,
        b.id AS primary_branch_id, b.branch_name AS primary_branch_name,
        d.id AS department_id, d.dept_name,
        des.id AS designation_id, des.desig_name, des.hierarchy_level,
        r.id AS role_id, r.role_code, r.role_name,
        mgr.id AS reporting_manager_id, CONCAT(mgr.first_name, ' ', mgr.last_name) AS reporting_manager_name
      FROM users u
      INNER JOIN branches b ON u.primary_branch_id = b.id
      INNER JOIN departments d ON u.department_id = d.id
      INNER JOIN designations des ON u.designation_id = des.id
      INNER JOIN roles r ON u.role_id = r.id
      LEFT JOIN users mgr ON u.reporting_manager_id = mgr.id
      WHERE u.id = $1;
    `;
    const userResult = await this.db.query(userQuery, [id]);
    if (userResult.rowCount === 0) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    const user = userResult.rows[0];

    // Secondary branches
    const secBranchesQuery = `
      SELECT b.id, b.branch_code, b.branch_name, b.city
      FROM user_branches ub
      INNER JOIN branches b ON ub.branch_id = b.id
      WHERE ub.user_id = $1 AND b.is_active = TRUE;
    `;
    const secBranchesResult = await this.db.query(secBranchesQuery, [id]);

    // User-level permission overrides
    const overridesQuery = `
      SELECT p.id AS permission_id, p.permission_code, p.module, p.action, upo.is_granted, upo.reason
      FROM user_permission_overrides upo
      INNER JOIN permissions p ON upo.permission_id = p.id
      WHERE upo.user_id = $1;
    `;
    const overridesResult = await this.db.query(overridesQuery, [id]);

    return {
      ...user,
      secondaryBranches: secBranchesResult.rows,
      permissionOverrides: overridesResult.rows,
    };
  }

  /**
   * Update employee profile
   */
  async update(id: string, dto: UpdateUserDto, updaterUserId: string) {
    await this.findOne(id);

    return await this.db.transaction(async (client) => {
      let passwordUpdateSql = '';
      const params: any[] = [
        dto.firstName,
        dto.lastName,
        dto.email ? dto.email.toLowerCase() : undefined,
        dto.mobileNumber,
        dto.primaryBranchId,
        dto.departmentId,
        dto.designationId,
        dto.roleId,
        dto.reportingManagerId,
        dto.isEmailLoginAllowed,
        dto.isOtpLoginAllowed,
        dto.isActive,
        updaterUserId,
        id,
      ];

      if (dto.password) {
        const hash = await bcrypt.hash(dto.password, 12);
        params.push(hash);
        passwordUpdateSql = `, password_hash = $${params.length}`;
      }

      const updateQuery = `
        UPDATE users SET
          first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          email = COALESCE($3, email),
          mobile_number = COALESCE($4, mobile_number),
          primary_branch_id = COALESCE($5, primary_branch_id),
          department_id = COALESCE($6, department_id),
          designation_id = COALESCE($7, designation_id),
          role_id = COALESCE($8, role_id),
          reporting_manager_id = COALESCE($9, reporting_manager_id),
          is_email_login_allowed = COALESCE($10, is_email_login_allowed),
          is_otp_login_allowed = COALESCE($11, is_otp_login_allowed),
          is_active = COALESCE($12, is_active),
          updated_by = $13,
          updated_at = CURRENT_TIMESTAMP
          ${passwordUpdateSql}
        WHERE id = $14
        RETURNING id, employee_code, first_name, last_name, email, mobile_number, is_active;
      `;

      const result = await persistExtended(
        client,
        updateQuery,
        params,
        'users',
        {
          emergency_contact: dto.emergencyContact,
          employment_status: dto.employmentStatus,
          ...(dto.employmentStatus
            ? { is_active: dto.employmentStatus === 'ACTIVE' }
            : {}),
        },
      );

      // Update secondary branches if provided
      if (dto.secondaryBranchIds) {
        await client.query(`DELETE FROM user_branches WHERE user_id = $1;`, [
          id,
        ]);
        for (const branchId of dto.secondaryBranchIds) {
          if (
            branchId !==
            (dto.primaryBranchId || result.rows[0].primary_branch_id)
          ) {
            await client.query(
              `INSERT INTO user_branches (user_id, branch_id, created_by, updated_by)
               VALUES ($1, $2, $3, $3)
               ON CONFLICT (user_id, branch_id) DO NOTHING;`,
              [id, branchId, updaterUserId],
            );
          }
        }
      }

      return result.rows[0];
    });
  }

  /**
   * Set user-level permission override
   */
  async setPermissionOverride(
    userId: string,
    dto: PermissionOverrideDto,
    updaterUserId: string,
  ) {
    await this.findOne(userId);

    const upsertQuery = `
      INSERT INTO user_permission_overrides (
        user_id, permission_id, is_granted, reason, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $5)
      ON CONFLICT (user_id, permission_id) 
      DO UPDATE SET 
        is_granted = EXCLUDED.is_granted,
        reason = EXCLUDED.reason,
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;
    const result = await this.db.query(upsertQuery, [
      userId,
      dto.permissionId,
      dto.isGranted,
      dto.reason || null,
      updaterUserId,
    ]);

    return result.rows[0];
  }

  /**
   * Remove user-level permission override
   */
  async deletePermissionOverride(userId: string, permissionId: string) {
    const deleteQuery = `
      DELETE FROM user_permission_overrides
      WHERE user_id = $1 AND permission_id = $2
      RETURNING *;
    `;
    const result = await this.db.query(deleteQuery, [userId, permissionId]);
    if (result.rowCount === 0) {
      throw new NotFoundException(
        'Permission override not found for this user.',
      );
    }
    return { success: true };
  }

  /**
   * Toggle user active / inactive status
   */
  async toggleActive(id: string, isActive: boolean, updaterUserId: string) {
    await this.findOne(id);
    const query = `
      UPDATE users SET
        is_active = $1,
        updated_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING id, employee_code, first_name, last_name, is_active;
    `;
    const result = await this.db.writeWithFields(
      query,
      [isActive, updaterUserId, id],
      'users',
      { employment_status: isActive ? 'ACTIVE' : 'INACTIVE' },
    );
    return result.rows[0];
  }
}
