import { AssignmentService } from './assignment.service';
import { DatabaseService } from '../../database/database.service';

describe('AssignmentService', () => {
  let service: AssignmentService;
  let mockDb: { query: jest.Mock };

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
    };
    service = new AssignmentService(mockDb as unknown as DatabaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('evaluateAutoAssignment', () => {
    it('should return target_user_id when rule is SPECIFIC_USER', async () => {
      mockDb.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'rule-1',
            rule_name: 'Assign to Lead',
            target_assignment_type: 'SPECIFIC_USER',
            target_user_id: 'user-lead-uuid',
          },
        ],
      });

      const result = await service.evaluateAutoAssignment('ON_CREATION', 'task-type-bug');
      expect(result).toBe('user-lead-uuid');
    });

    it('should resolve Department HOD when rule is DEPARTMENT_HOD', async () => {
      // 1. Rule query
      mockDb.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'rule-2',
            rule_name: 'Route to QA HOD',
            target_assignment_type: 'DEPARTMENT_HOD',
            target_department_id: 'dept-qa-uuid',
          },
        ],
      });

      // 2. HOD query
      mockDb.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          { hod_user_id: 'user-qa-hod-uuid' },
        ],
      });

      const result = await service.evaluateAutoAssignment('ON_STATUS_CHANGE', 'task-type-dev', undefined, undefined, 'status-open', 'status-qa');
      expect(result).toBe('user-qa-hod-uuid');
    });

    it('should return null when no matching rule is configured', async () => {
      mockDb.query.mockResolvedValueOnce({
        rowCount: 0,
        rows: [],
      });

      const result = await service.evaluateAutoAssignment('ON_CREATION', 'task-type-random');
      expect(result).toBeNull();
    });
  });
});
