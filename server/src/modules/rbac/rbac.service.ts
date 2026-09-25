import {
  Injectable,
  Logger,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { RECORD_ID } from '../../common/validators/record-id';
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

  async enforceBranchScope(request: any) {
    const user = request.user;
    if (!user || user.roleCode === 'ROLE_SUPER_ADMIN') return;
    const branches = await this.db.query(
      'SELECT branch_id FROM user_branches WHERE user_id=$1',
      [user.id],
    );
    const allowed = new Set([
      user.primaryBranchId,
      ...branches.rows.map((r) => r.branch_id),
    ]);
    const selected = request.headers['x-branch-id'] || user.primaryBranchId;
    if (typeof selected !== 'string' || !RECORD_ID.test(selected))
      throw new BadRequestException('Invalid branch identifier');
    const requireBranch = (id: string) => {
      if (!allowed.has(id))
        throw new ForbiddenException('You do not have access to this branch');
    };
    requireBranch(selected);
    for (const id of [
      request.query.branchId,
      request.body?.branchId,
      request.body?.primaryBranchId,
      ...(request.body?.secondaryBranchIds || []),
    ])
      if (id) requireBranch(id);
    request.allowedBranchIds = [...allowed];
    const route = request.path.replace(/^\/api\/v1\//, '').split('/');
    if (
      ['tasks', 'projects', 'clients', 'users', 'time-logs'].includes(
        route[0],
      ) &&
      route.length === 1 &&
      request.method === 'GET'
    )
      request.query.branchId ||= selected;
    // Validate the branch of individual business records, not merely the selected header.
    const checks: Array<[string, string | undefined]> = [];
    const id = route[1];
    if (
      ['tasks', 'projects', 'clients'].includes(route[0]) &&
      id &&
      RECORD_ID.test(id)
    )
      checks.push([route[0], id]);
    if (route[0] === 'tasks' && route[1] === 'subtasks')
      checks.push(['tasks', route[2]]);
    for (const [field, table] of [
      ['taskId', 'tasks'],
      ['parentTaskId', 'tasks'],
      ['projectId', 'projects'],
      ['clientId', 'clients'],
    ])
      if (request.body?.[field]) checks.push([table, request.body[field]]);
    if (['comments', 'time-logs'].includes(route[0]) && route[1] === 'task')
      checks.push(['tasks', route[2]]);
    if (route[0] === 'attachments') {
      const type =
        request.body?.entityType ||
        (route[1] === 'entity' ? route[2] : undefined);
      const entityId =
        request.body?.entityId ||
        (route[1] === 'entity' ? route[3] : undefined);
      const table = { TASK: 'tasks', PROJECT: 'projects', CLIENT: 'clients' }[
        type
      ];
      if (table && entityId) checks.push([table, entityId]);
    }
    if (
      id &&
      RECORD_ID.test(id) &&
      ['time-logs', 'comments'].includes(route[0])
    ) {
      const table =
        route[0] === 'time-logs' ? 'task_time_logs' : 'task_comments';
      const related = await this.db.query(
        `SELECT task_id FROM ${table} WHERE id=$1`,
        [id],
      );
      if (related.rows[0]) checks.push(['tasks', related.rows[0].task_id]);
    }
    if (route[0] === 'users' && id && RECORD_ID.test(id)) {
      const employee = await this.db.query(
        'SELECT primary_branch_id FROM users WHERE id=$1',
        [id],
      );
      if (employee.rows[0]) requireBranch(employee.rows[0].primary_branch_id);
    }
    if (route[0] === 'branches' && id && RECORD_ID.test(id)) requireBranch(id);
    if (route[0] === 'attachments' && id && RECORD_ID.test(id)) {
      const attachment = (
        await this.db.query(
          'SELECT entity_type,entity_id FROM attachments WHERE id=$1',
          [id],
        )
      ).rows[0];
      const table = { TASK: 'tasks', PROJECT: 'projects', CLIENT: 'clients' }[
        attachment?.entity_type
      ];
      if (table) checks.push([table, attachment.entity_id]);
      if (attachment?.entity_type === 'TASK_COMMENT') {
        const comment = (
          await this.db.query('SELECT task_id FROM task_comments WHERE id=$1', [
            attachment.entity_id,
          ])
        ).rows[0];
        if (comment) checks.push(['tasks', comment.task_id]);
      }
    }
    for (const [table, recordId] of checks) {
      if (!recordId || !RECORD_ID.test(recordId))
        throw new BadRequestException('Invalid record identifier');
      const result = await this.db.query(
        `SELECT branch_id,created_by FROM ${table} WHERE id=$1`,
        [recordId],
      );
      if (result.rows[0]?.branch_id) requireBranch(result.rows[0].branch_id);
      else if (result.rowCount && result.rows[0].created_by !== user.id)
        throw new ForbiddenException('Record has no accessible branch');
    }
  }

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
      INNER JOIN roles r ON u.role_id = r.id AND r.is_active = TRUE
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
      const branchOverridesResult = await this.db.query(branchOverridesQuery, [
        branchId,
      ]);
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
    const userOverridesResult = await this.db.query(userOverridesQuery, [
      userId,
    ]);
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
