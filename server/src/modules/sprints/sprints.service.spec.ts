import { SprintsService } from './sprints.service';
import { DatabaseService } from '../../database/database.service';
import { CalendarsService } from '../calendars/calendars.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('SprintsService', () => {
  let service: SprintsService;
  let mockDb: { query: jest.Mock };
  let mockCalendarsService: { calculateWorkingCapacity: jest.Mock };

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
    };
    mockCalendarsService = {
      calculateWorkingCapacity: jest.fn(),
    };
    service = new SprintsService(
      mockDb as unknown as DatabaseService,
      mockCalendarsService as unknown as CalendarsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create sprint', () => {
    it('should throw BadRequestException if end date precedes start date', async () => {
      await expect(
        service.create(
          {
            sprintCode: 'SPR-01',
            sprintName: 'Sprint 1',
            entityType: 'PROJECT',
            projectId: 'proj-1',
            startDate: '2026-10-10',
            endDate: '2026-10-05',
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create sprint successfully', async () => {
      mockDb.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'sprint-1',
            sprint_code: 'SPR-01',
            sprint_name: 'Sprint 1',
            status: 'PLANNING',
          },
        ],
      });

      const res = await service.create(
        {
          sprintCode: 'SPR-01',
          sprintName: 'Sprint 1',
          entityType: 'PROJECT',
          projectId: 'proj-1',
          startDate: '2026-10-01',
          endDate: '2026-10-14',
        },
        'user-1',
      );

      expect(res.id).toBe('sprint-1');
      expect(res.status).toBe('PLANNING');
    });
  });

  describe('startSprint', () => {
    it('should snapshot committed points, hours, and tasks count', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: 'sprint-1', status: 'PLANNING' }],
        }) // check sprint
        .mockResolvedValueOnce({
          rowCount: 2,
          rows: [
            { id: 'task-1', story_points: 3, estimated_hours: 8 },
            { id: 'task-2', story_points: 5, estimated_hours: 12 },
          ],
        }) // get tasks
        .mockResolvedValueOnce({ rowCount: 1 }) // ledger insert task 1
        .mockResolvedValueOnce({ rowCount: 1 }) // ledger insert task 2
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: 'sprint-1',
              status: 'ACTIVE',
              committed_tasks_count: 2,
              committed_story_points: '8.00',
              committed_hours: '20.00',
            },
          ],
        }); // update sprint

      const res = await service.startSprint('sprint-1', 'user-1');
      expect(res.status).toBe('ACTIVE');
      expect(res.committed_tasks_count).toBe(2);
    });
  });

  describe('closeSprint and rollover', () => {
    it('should close sprint and rollover incomplete tasks to target sprint', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: 'sprint-1', sprint_code: 'SPR-01', status: 'ACTIVE' }],
        }) // check active sprint
        .mockResolvedValueOnce({
          rowCount: 2,
          rows: [
            { id: 'task-1', story_points: 3, estimated_hours: 8, is_terminal: true, status_category: 'DONE' },
            { id: 'task-2', story_points: 5, estimated_hours: 12, is_terminal: false, status_category: 'IN_PROGRESS' },
          ],
        }) // get tasks
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'sprint-2' }] }) // target sprint check
        .mockResolvedValueOnce({ rowCount: 1 }) // update incomplete tasks sprint_id
        .mockResolvedValueOnce({ rowCount: 1 }) // insert ledger rollover task 2
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: 'sprint-1',
              status: 'COMPLETED',
              completed_tasks_count: 1,
              completed_story_points: '3.00',
              completed_hours: '8.00',
            },
          ],
        }); // update sprint

      const result = await service.closeSprint('sprint-1', { targetSprintId: 'sprint-2' }, 'user-1');
      expect(result.completedTasksCount).toBe(1);
      expect(result.completedStoryPoints).toBe(3);
      expect(result.rolledOverTasksCount).toBe(1);
      expect(result.targetSprintId).toBe('sprint-2');
    });
  });

  describe('capacity calculation', () => {
    it('should calculate sprint delivery capacity using CalendarsService', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: 'sprint-1',
              sprint_code: 'SPR-01',
              project_id: 'proj-1',
              start_date: '2026-10-01',
              end_date: '2026-10-14',
            },
          ],
        }) // sprint query
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              user_id: 'dev-1',
              project_role: 'Fullstack Dev',
              allocation_percentage: '100',
              first_name: 'John',
              last_name: 'Doe',
              email: 'john@example.com',
            },
          ],
        }) // project members
        .mockResolvedValueOnce({ rowCount: 1 }); // update sprint total capacity

      mockCalendarsService.calculateWorkingCapacity.mockResolvedValueOnce({
        userId: 'dev-1',
        totalWorkingDays: 10,
        totalExpectedHours: 80,
        holidaysCount: 0,
        leaveDaysCount: 0,
      });

      const res = await service.calculateSprintCapacity('sprint-1');
      expect(res.teamMembersCount).toBe(1);
      expect(res.totalCapacityHours).toBe(80);
      expect(res.members[0].effectiveDeliveryHours).toBe(80);
    });
  });
});
