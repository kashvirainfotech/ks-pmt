import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

export interface UserEffectivePermissions {
  userId: string;
  roleCode: string;
  branchId: string;
  permissions: Set<string>;
}

@Injectable()
export class RbacService {
  private readonly logger = new Logger(RbacService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Calculate effective permissions for a user taking into account:
   * 1. Base Role Permissions
   * 2. Branch-Level Overrides (can restrict permissions branch-wide)
   * 3. User-Level Overrides (explicit user-level grants or revocations)
   */
  async getEffectivePermissions(
    userId: string,
    activeBranchId?: string,
  ): Promise<UserEffectivePermissions> {
    // 1. Fetch user, role, and branch details
    const userQuery = `
      SELECT u.id, u.role_id, r.role_code, u.primary_branch_id
      FROM users u
      INNER JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1 AND u.is_active = TRUE;
    `;
    const userResult = await this.db.query(userQuery, [userId]);
    if (userResult.rowCount === 0) {
      return {
        userId,
        roleCode: '',
        branchId: '',
        permissions: new Set(),
      };
    }

    const user = userResult.rows[0];
    const branchId = activeBranchId || user.primary_branch_id;
    const roleCode = user.role_code;

    // Super Admin has all permissions automatically
    if (roleCode === 'ROLE_SUPER_ADMIN') {
      const allPermsQuery = `SELECT permission_code FROM permissions WHERE is_active = TRUE;`;
      const allPermsResult = await this.db.query(allPermsQuery);
      const permSet = new Set<string>(
        allPermsResult.rows.map((row) => row.permission_code),
      );
      return {
        userId,
        roleCode,
        branchId,
        permissions: permSet,
      };
    }

    // 2. Fetch base role permissions
    const rolePermsQuery = `
      SELECT p.permission_code
      FROM role_permissions rp
      INNER JOIN permissions p ON rp.permission_id = p.id
      WHERE rp.role_id = $1 AND p.is_active = TRUE;
    `;
    const rolePermsResult = await this.db.query(rolePermsQuery, [user.role_id]);
    const effectivePerms = new Set<string>(
      rolePermsResult.rows.map((row) => row.permission_code),
    );

    // 3. Apply Branch-Level Overrides
    // If a permission is marked is_allowed = FALSE for this branch, remove it
    if (branchId) {
      const branchOverridesQuery = `
        SELECT p.permission_code, bpo.is_allowed
        FROM branch_permission_overrides bpo
        INNER JOIN permissions p ON bpo.permission_id = p.id
        WHERE bpo.branch_id = $1 AND p.is_active = TRUE;
      `;
      const branchOverridesResult = await this.db.query(branchOverridesQuery, [branchId]);
      for (const row of branchOverridesResult.rows) {
        if (!row.is_allowed) {
          effectivePerms.delete(row.permission_code);
        }
      }
    }

    // 4. Apply User-Level Overrides (Highest priority)
    const userOverridesQuery = `
      SELECT p.permission_code, upo.is_granted
      FROM user_permission_overrides upo
      INNER JOIN permissions p ON upo.permission_id = p.id
      WHERE upo.user_id = $1 AND p.is_active = TRUE;
    `;
    const userOverridesResult = await this.db.query(userOverridesQuery, [userId]);
    for (const row of userOverridesResult.rows) {
      if (row.is_granted) {
        effectivePerms.add(row.permission_code);
      } else {
        effectivePerms.delete(row.permission_code);
      }
    }

    return {
      userId,
      roleCode,
      branchId,
      permissions: effectivePerms,
    };
  }
}
