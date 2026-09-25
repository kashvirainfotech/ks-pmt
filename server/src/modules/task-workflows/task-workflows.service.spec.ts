import { TaskWorkflowsService } from './task-workflows.service';
import { DatabaseService } from '../../database/database.service';
import { BadRequestException } from '@nestjs/common';

describe('TaskWorkflowsService', () => {
  let service: TaskWorkflowsService;
  let mockDb: { query: jest.Mock };

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
    };
    service = new TaskWorkflowsService(mockDb as unknown as DatabaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllowedNextStatuses', () => {
    it('should return permitted status transitions defined for task type', async () => {
      const taskTypeId = 'tt-1';
      const fromStatusId = 'status-open';

      mockDb.query.mockResolvedValueOnce({
        rowCount: 2,
        rows: [
          { id: 'status-in-progress', status_code: 'IN_PROGRESS', status_name: 'In Progress' },
          { id: 'status-cancelled', status_code: 'CANCELLED', status_name: 'Cancelled' },
        ],
      });

      const result = await service.getAllowedNextStatuses(taskTypeId, fromStatusId);
      expect(result).toHaveLength(2);
      expect(result[0].status_code).toBe('IN_PROGRESS');
      expect(result[1].status_code).toBe('CANCELLED');
    });
  });

  describe('createTransition', () => {
    it('should throw BadRequestException if fromStatus and toStatus are identical', async () => {
      await expect(
        service.createTransition(
          {
            taskTypeId: 'tt-1',
            fromStatusId: 'status-same',
            toStatusId: 'status-same',
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
