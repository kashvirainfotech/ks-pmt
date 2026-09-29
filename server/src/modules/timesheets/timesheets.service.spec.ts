import { TimesheetsService, getWeekBoundaries } from './timesheets.service';
import { DatabaseService } from '../../database/database.service';
import { CalendarsService } from '../calendars/calendars.service';
import { ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';

describe('TimesheetsService (TIME-001)', () => {
  let service: TimesheetsService;
  let mockDb: any;
  let mockCalendars: any;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
      transaction: jest.fn((callback) => callback(mockDb)),
    };

    mockCalendars = {
      calculateWorkingCapacity: jest.fn(),
    };

    service = new TimesheetsService(
      mockDb as unknown as DatabaseService,
      mockCalendars as unknown as CalendarsService,
    );
  });

  describe('getWeekBoundaries', () => {
    it('should accurately compute Monday to Sunday boundaries', () => {
      // 2026-09-29 is a Tuesday
      const boundaries = getWeekBoundaries('2026-09-29');
      expect(boundaries.startDate).toBe('2026-09-28'); // Monday
      expect(boundaries.endDate).toBe('2026-10-04'); // Sunday
    });
  });

  describe('getWeeklyTimesheet', () => {
    it('should compute expected delivery capacity from CalendarsService and calculate missing hours', async () => {
      // 32-hour scheduled week with 8-hour approved leave expects 24 hours (SRS Acceptance Rule)
      mockCalendars.calculateWorkingCapacity.mockResolvedValueOnce({
        netWorkingDays: 3,
        effectiveHoursPerDay: 8,
        totalExpectedHours: 24.0,
      });

      // Existing timesheet found
      mockDb.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'ts-1',
              user_id: 'user-dev',
              period_start_date: '2026-09-28',
              period_end_date: '2026-10-04',
              expected_hours: 24.0,
              status: 'DRAFT',
            },
          ],
        })
        // Constituent worklogs (18 hours logged)
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'log-1',
              task_id: 'tsk-1',
              user_id: 'user-dev',
              log_date: '2026-09-28',
              hours_spent: 8.0,
              is_billable: true,
              is_overtime: false,
              task_code: 'TSK-10',
              task_title: 'Backend API',
            },
            {
              id: 'log-2',
              task_id: 'tsk-1',
              user_id: 'user-dev',
              log_date: '2026-09-29',
              hours_spent: 10.0,
              is_billable: true,
              is_overtime: false,
              task_code: 'TSK-10',
              task_title: 'Backend API',
            },
          ],
        })
        // Update timesheet sums
        .mockResolvedValueOnce({ rows: [] })
        // Portions
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.getWeeklyTimesheet('user-dev', '2026-09-29');

      expect(result.summary.expectedHours).toBe(24.0);
      expect(result.summary.totalLoggedHours).toBe(18.0);
      expect(result.summary.missingHours).toBe(6.0); // 24 - 18 = 6 hours missing
      expect(result.summary.isUnderExpected).toBe(true);
      expect(result.grid).toHaveLength(1);
      expect(result.grid[0].totalHours).toBe(18.0);
    });
  });

  describe('submitTimesheet', () => {
    it('should reject submission if total logged hours is 0', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'ts-empty',
            user_id: 'user-dev',
            total_logged_hours: 0,
            status: 'DRAFT',
          },
        ],
      });

      await expect(
        service.submitTimesheet('ts-empty', 'user-dev', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject submission if user is not the owner', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'ts-other',
            user_id: 'other-user',
            total_logged_hours: 20,
            status: 'DRAFT',
          },
        ],
      });

      await expect(
        service.submitTimesheet('ts-other', 'user-dev', {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('reviewPortion', () => {
    it('should prevent self-approval unless Super Admin', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'portion-1',
            timesheet_id: 'ts-1',
            timesheet_user_id: 'user-dev',
            status: 'PENDING',
          },
        ],
      });

      await expect(
        service.reviewPortion(
          'portion-1',
          { status: 'APPROVED' },
          'user-dev', // Same user attempting self-approval!
          false,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should mark parent timesheet REJECTED if any portion is rejected', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'portion-2',
              timesheet_id: 'ts-parent',
              timesheet_user_id: 'user-dev',
              timesheet_status: 'SUBMITTED',
            },
          ],
        })
        // UPDATE portion
        .mockResolvedValueOnce({ rows: [] })
        // Check all portions (one approved, one rejected)
        .mockResolvedValueOnce({
          rows: [{ status: 'APPROVED' }, { status: 'REJECTED' }],
        })
        // UPDATE parent timesheet to REJECTED
        .mockResolvedValueOnce({ rows: [] });

      const res = await service.reviewPortion(
        'portion-2',
        { status: 'REJECTED', reviewRemarks: 'Needs more detail' },
        'user-pm',
        false,
      );

      expect(res.portionStatus).toBe('REJECTED');
      expect(res.timesheetStatus).toBe('REJECTED');
    });

    it('should mark parent timesheet APPROVED only when ALL portions are approved', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'portion-3',
              timesheet_id: 'ts-parent-2',
              timesheet_user_id: 'user-dev',
              timesheet_status: 'SUBMITTED',
            },
          ],
        })
        // UPDATE portion
        .mockResolvedValueOnce({ rows: [] })
        // Check all portions (both approved)
        .mockResolvedValueOnce({
          rows: [{ status: 'APPROVED' }, { status: 'APPROVED' }],
        })
        // UPDATE parent timesheet to APPROVED
        .mockResolvedValueOnce({ rows: [] })
        // UPDATE constituent worklogs
        .mockResolvedValueOnce({ rows: [] });

      const res = await service.reviewPortion(
        'portion-3',
        { status: 'APPROVED' },
        'user-pm',
        false,
      );

      expect(res.portionStatus).toBe('APPROVED');
      expect(res.timesheetStatus).toBe('APPROVED');
    });
  });

  describe('Persistent Timer (TIME-001)', () => {
    it('should start timer on task and enforce one active session per user', async () => {
      // No previous timer
      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // getActiveTimer
        .mockResolvedValueOnce({ rows: [{ id: 'tsk-1' }] }) // verify task
        .mockResolvedValueOnce({ rows: [{ id: 'timer-1' }] }) // insert timer
        .mockResolvedValueOnce({
          // getActiveTimer return
          rows: [
            {
              id: 'timer-1',
              user_id: 'user-1',
              task_id: 'tsk-1',
              started_at: new Date().toISOString(),
              accumulated_seconds: 0,
              is_paused: false,
              task_code: 'TSK-01',
              task_title: 'Auth engine',
            },
          ],
        });

      const timer = await service.startTimer('user-1', { taskId: 'tsk-1' });
      expect(timer.task_id).toBe('tsk-1');
      expect(timer.is_paused).toBe(false);
      expect(timer.elapsedFormatted).toBeDefined();
    });

    it('should stop timer and create a task_time_logs entry', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          // getActiveTimer
          rows: [
            {
              id: 'timer-2',
              user_id: 'user-1',
              task_id: 'tsk-2',
              started_at: new Date(Date.now() - 3600 * 1000).toISOString(), // 1 hour ago
              accumulated_seconds: 0,
              is_paused: false,
              is_billable: true,
              created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
            },
          ],
        })
        // insert task_time_logs
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'log-created',
              task_id: 'tsk-2',
              hours_spent: 1.0,
              description: 'Completed auth module',
            },
          ],
        })
        // delete user_active_timers
        .mockResolvedValueOnce({ rows: [] });

      const log = await service.stopAndLogTimer('user-1', {
        description: 'Completed auth module',
      });

      expect(log.id).toBe('log-created');
      expect(log.hours_spent).toBe(1.0);
    });
  });
});
