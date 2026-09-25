import { RbacService } from './rbac.service';
import { DatabaseService } from '../../database/database.service';

describe('RbacService', () => {
  let service: RbacService;
  let mockDb: { query: jest.Mock };

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
    };
    service = new RbacService(mockDb as unknown as DatabaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getEffectivePermissions', () => {
    const userId = '00000000-0000-0000-0000-000000000001';
    const branchId = '11111111-1111-1111-1111-111111111111';

    it('should grant all active permissions to ROLE_SUPER_ADMIN automatically', async () => {
      // 1. User query: returns Super Admin
      mockDb.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: userId,
            role_id: 'super-admin-role',
            role_code: 'ROLE_SUPER_ADMIN',
            primary_branch_id: branchId,
          },
        ],
      });

      // 2. All active permissions query
      mockDb.query.mockResolvedValueOnce({
        rowCount: 3,
        rows: [
          { permission_code: 'TASKS:CREATE' },
          { permission_code: 'TASKS:READ' },
          { permission_code: 'USERS:MANAGE' },
        ],
      });

      const result = await service.getEffectivePermissions(userId);

      expect(result.roleCode).toBe('ROLE_SUPER_ADMIN');
      expect(result.permissions.has('TASKS:CREATE')).toBe(true);
      expect(result.permissions.has('TASKS:READ')).toBe(true);
      expect(result.permissions.has('USERS:MANAGE')).toBe(true);
      expect(result.permissions.size).toBe(3);
    });

    it('should evaluate base role permissions and apply branch and user overrides', async () => {
      // 1. User query: Developer in branch
      mockDb.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: userId,
            role_id: 'dev-role',
            role_code: 'ROLE_DEVELOPER',
            primary_branch_id: branchId,
          },
        ],
      });

      // 2. Base role permissions
      mockDb.query.mockResolvedValueOnce({
        rowCount: 2,
        rows: [
          { permission_code: 'TASKS:READ' },
          { permission_code: 'TIMELOGS:LOG_OWN' },
        ],
      });

      // 3. Branch overrides: revokes TIMELOGS:LOG_OWN (is_allowed = false)
      mockDb.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          { permission_code: 'TIMELOGS:LOG_OWN', is_allowed: false },
        ],
      });

      // 4. User overrides: explicitly grants TASKS:CREATE (is_granted = true)
      mockDb.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          { permission_code: 'TASKS:CREATE', is_granted: true },
        ],
      });

      const result = await service.getEffectivePermissions(userId, branchId);

      expect(result.roleCode).toBe('ROLE_DEVELOPER');
      expect(result.permissions.has('TASKS:READ')).toBe(true); // From Base Role
      expect(result.permissions.has('TIMELOGS:LOG_OWN')).toBe(false); // Revoked by branch override
      expect(result.permissions.has('TASKS:CREATE')).toBe(true); // Granted by user explicit override
    });
  });
});
