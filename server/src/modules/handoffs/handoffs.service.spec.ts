import { BadRequestException, NotFoundException } from '@nestjs/common';
import { HandoffsService } from './handoffs.service';

describe('HandoffsService (FLOW-001)', () => {
  let service: HandoffsService;
  let mockDbService: any;
  let mockCalendarsService: any;

  beforeEach(() => {
    mockDbService = {
      query: jest.fn(),
    };
    mockCalendarsService = {
      getEffectiveCalendar: jest.fn(),
      isWorkingDay: jest.fn(),
    };

    service = new HandoffsService(mockDbService, mockCalendarsService);
  });

  describe('Dual Metric Duration Calculations (Acceptance Rule)', () => {
    it('should correctly compute 19h 43m elapsed time and business time when sending at 14:32 and starting next day at 10:15', () => {
      // 2026-10-05 is Monday, 2026-10-06 is Tuesday
      // Send at 14:32 on Monday, start at 10:15 on Tuesday
      const sentAt = '2026-10-05T14:32:00';
      const workStartedAt = '2026-10-06T10:15:00';

      const metrics = service.calculateDurations(
        sentAt,
        workStartedAt,
        9.5, // 09:30 AM
        18.0, // 06:00 PM
      );

      // Elapsed time:
      // Mon 14:32 to 24:00 = 9h 28m
      // Tue 00:00 to 10:15 = 10h 15m
      // Total elapsed = 19h 43m (1,183 minutes = 70,980 seconds)
      expect(metrics.elapsedFormatted).toBe('19h 43m');
      expect(metrics.elapsedSeconds).toBe(19 * 3600 + 43 * 60);

      // Business time:
      // Mon 14:32 to 18:00 = 3h 28m (208 minutes)
      // Tue 09:30 to 10:15 = 45m (45 minutes)
      // Total business = 4h 13m (253 minutes = 15,180 seconds)
      expect(metrics.businessFormatted).toBe('4h 13m');
      expect(metrics.businessSeconds).toBe(4 * 3600 + 13 * 60);
    });

    it('should handle zero or invalid elapsed duration cleanly', () => {
      const metrics = service.calculateDurations('invalid', 'invalid');
      expect(metrics.elapsedFormatted).toBe('0m');
      expect(metrics.businessFormatted).toBe('0m');
    });
  });

  describe('createHandoff', () => {
    it('should reject if neither toTeamId nor toUserId is provided', async () => {
      await expect(
        service.createHandoff(
          { taskId: '11111111-1111-1111-1111-111111111111' },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if task does not exist', async () => {
      mockDbService.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await expect(
        service.createHandoff(
          {
            taskId: 'non-existent-task',
            toUserId: 'user-2',
          },
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject if task already has an active open handoff', async () => {
      // 1. Task lookup succeeds
      mockDbService.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'task-1', task_code: 'TSK-001', title: 'Test Task' }],
      });
      // 2. Active handoff check finds existing PENDING handoff
      mockDbService.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'active-h-1', status: 'PENDING' }],
      });

      await expect(
        service.createHandoff(
          {
            taskId: 'task-1',
            toUserId: 'user-2',
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create new handoff in PENDING status when valid', async () => {
      // 1. Task lookup
      mockDbService.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'task-1', task_code: 'TSK-001', title: 'Test Task' }],
      });
      // 2. Active handoff check: none
      mockDbService.query.mockResolvedValueOnce({
        rowCount: 0,
        rows: [],
      });
      // 3. Sender team resolution
      mockDbService.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ team_id: 'team-dev' }],
      });
      // 4. Insert handoff
      mockDbService.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'new-h-1' }],
      });
      // 5. getHandoffById query
      mockDbService.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'new-h-1',
            task_id: 'task-1',
            status: 'PENDING',
            sent_at: new Date().toISOString(),
          },
        ],
      });

      const result = await service.createHandoff(
        {
          taskId: 'task-1',
          toTeamId: 'team-qa',
          handoffType: 'DEV_TO_QA',
          requiredContext: 'Ready on staging environment',
        },
        'user-1',
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('new-h-1');
      expect(result.status).toBe('PENDING');
    });
  });

  describe('acknowledgeHandoff', () => {
    it('should transition PENDING to ACCEPTED and record acknowledged_at', async () => {
      // 1. Raw handoff lookup
      mockDbService.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'h-1',
            task_id: 'task-1',
            status: 'PENDING',
            to_user_id: null,
            notes: null,
          },
        ],
      });
      // 2. Update query
      mockDbService.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'h-1' }],
      });
      // 3. getHandoffById query
      mockDbService.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'h-1',
            status: 'ACCEPTED',
            acknowledged_at: new Date().toISOString(),
            to_user_id: 'user-qa-1',
          },
        ],
      });

      const result = await service.acknowledgeHandoff(
        'h-1',
        { notes: 'Acknowledged QA queue ticket' },
        'user-qa-1',
      );

      expect(result.status).toBe('ACCEPTED');
      expect(result.to_user_id).toBe('user-qa-1');
    });

    it('should reject acknowledgment if already in progress or completed', async () => {
      mockDbService.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'h-1', status: 'IN_PROGRESS' }],
      });

      await expect(
        service.acknowledgeHandoff('h-1', {}, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('startWork', () => {
    it('should transition ACCEPTED to IN_PROGRESS and record work_started_at', async () => {
      mockDbService.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'h-1',
            task_id: 'task-1',
            status: 'ACCEPTED',
            acknowledged_at: new Date().toISOString(),
            to_user_id: 'user-qa-1',
          },
        ],
      });
      mockDbService.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'h-1' }],
      });
      mockDbService.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'h-1',
            status: 'IN_PROGRESS',
            work_started_at: new Date().toISOString(),
            work_started_by: 'user-qa-1',
          },
        ],
      });

      const result = await service.startWork(
        'h-1',
        { notes: 'Starting test cycle' },
        'user-qa-1',
      );

      expect(result.status).toBe('IN_PROGRESS');
      expect(result.work_started_by).toBe('user-qa-1');
    });
  });

  describe('returnForRework', () => {
    it('should close current handoff with RETURNED_FOR_REWORK and create successor predecessor link', async () => {
      // 1. Raw handoff lookup
      mockDbService.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'h-qa-1',
            task_id: 'task-1',
            from_team_id: 'team-dev',
            from_user_id: 'user-dev-1',
            to_team_id: 'team-qa',
            to_user_id: 'user-qa-1',
            status: 'IN_PROGRESS',
          },
        ],
      });
      // 2. Update close current
      mockDbService.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'h-qa-1' }],
      });
      // 3. Insert successor
      mockDbService.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'h-rework-2' }],
      });
      // 4. getHandoffById (closed)
      mockDbService.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'h-qa-1',
            status: 'RETURNED_FOR_REWORK',
            rejection_or_return_reason: 'Defect in validation logic',
          },
        ],
      });
      // 5. getHandoffById (successor)
      mockDbService.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'h-rework-2',
            predecessor_handoff_id: 'h-qa-1',
            status: 'PENDING',
            handoff_type: 'QA_TO_DEV_REWORK',
          },
        ],
      });

      const res = await service.returnForRework(
        'h-qa-1',
        { reason: 'Defect in validation logic' },
        'user-qa-1',
      );

      expect(res.returnedHandoff.status).toBe('RETURNED_FOR_REWORK');
      expect(res.successorHandoff.predecessor_handoff_id).toBe('h-qa-1');
      expect(res.successorHandoff.status).toBe('PENDING');
    });
  });

  describe('getHandoffAnalytics', () => {
    it('should aggregate rework rate and averages without individual blame', async () => {
      mockDbService.query.mockResolvedValueOnce({
        rowCount: 3,
        rows: [
          {
            id: 'h-1',
            handoff_type: 'DEV_TO_QA',
            status: 'COMPLETED',
            sent_at: '2026-10-05T10:00:00Z',
            acknowledged_at: '2026-10-05T10:30:00Z',
            work_started_at: '2026-10-05T11:00:00Z',
          },
          {
            id: 'h-2',
            handoff_type: 'DEV_TO_QA',
            status: 'RETURNED_FOR_REWORK',
            sent_at: '2026-10-05T14:00:00Z',
            acknowledged_at: '2026-10-05T14:15:00Z',
            work_started_at: '2026-10-05T14:30:00Z',
          },
          {
            id: 'h-3',
            handoff_type: 'DEV_TO_REVIEW',
            status: 'COMPLETED',
            sent_at: '2026-10-05T09:00:00Z',
            acknowledged_at: '2026-10-05T09:10:00Z',
            work_started_at: '2026-10-05T09:20:00Z',
          },
        ],
      });

      const analytics = await service.getHandoffAnalytics();

      expect(analytics.summary.totalHandoffs).toBe(3);
      expect(analytics.summary.totalReworkCount).toBe(1);
      expect(analytics.summary.reworkRatePct).toBe(33.3);
      expect(analytics.byStage.length).toBe(2);
    });
  });
});
