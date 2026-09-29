import { MilestonesService } from './milestones.service';
import { DatabaseService } from '../../database/database.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('MilestonesService', () => {
  let service: MilestonesService;
  let mockDb: { query: jest.Mock };

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
    };
    service = new MilestonesService(mockDb as unknown as DatabaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create milestone', () => {
    it('should throw BadRequestException if projectId is missing for PROJECT entityType', async () => {
      await expect(
        service.create(
          {
            milestoneCode: 'MLS-01',
            milestoneName: 'Milestone 1',
            entityType: 'PROJECT',
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create milestone successfully', async () => {
      mockDb.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'mls-1',
            milestone_code: 'MLS-01',
            milestone_name: 'Alpha Delivery',
            status: 'PLANNED',
          },
        ],
      });

      const res = await service.create(
        {
          milestoneCode: 'MLS-01',
          milestoneName: 'Alpha Delivery',
          entityType: 'PROJECT',
          projectId: 'proj-1',
          targetDate: '2026-11-15',
        },
        'user-1',
      );

      expect(res.id).toBe('mls-1');
      expect(res.status).toBe('PLANNED');
    });
  });

  describe('findById', () => {
    it('should return milestone with linked tasks', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: 'mls-1', milestone_name: 'Alpha Delivery' }],
        })
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: 'tsk-1', title: 'Setup DB' }],
        });

      const res = await service.findById('mls-1');
      expect(res.id).toBe('mls-1');
      expect(res.tasks.length).toBe(1);
    });
  });
});
