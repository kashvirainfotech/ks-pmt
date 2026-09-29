import { CalendarsService } from './calendars.service';
import { DatabaseService } from '../../database/database.service';
import { BadRequestException } from '@nestjs/common';

describe('CalendarsService', () => {
  let service: CalendarsService;
  let mockDb: { query: jest.Mock };

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
    };
    service = new CalendarsService(mockDb as unknown as DatabaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create calendar', () => {
    it('should throw BadRequestException if calendar code exists', async () => {
      mockDb.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: '1' }] });
      await expect(
        service.create({ calendarCode: 'CAL-CORP', calendarName: 'Corporate' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create calendar successfully', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // duplicate check
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: 'cal-123',
              calendar_code: 'CAL-CORP',
              calendar_name: 'Corporate Calendar',
              working_days_mask: '1111100',
              standard_hours_per_day: 8.0,
            },
          ],
        }); // insert

      const result = await service.create(
        { calendarCode: 'CAL-CORP', calendarName: 'Corporate Calendar' },
        'user-1',
      );
      expect(result.id).toBe('cal-123');
      expect(result.calendar_code).toBe('CAL-CORP');
    });
  });

  describe('holidays', () => {
    it('should add holiday to an existing calendar', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'cal-1' }] }) // calendar check
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: 'hol-1',
              calendar_id: 'cal-1',
              holiday_name: 'New Year',
              holiday_date: '2026-01-01',
            },
          ],
        }); // insert

      const res = await service.addHoliday(
        {
          calendarId: 'cal-1',
          holidayName: 'New Year',
          holidayDate: '2026-01-01',
          isRecurring: true,
        },
        'user-1',
      );
      expect(res.id).toBe('hol-1');
      expect(res.holiday_name).toBe('New Year');
    });
  });

  describe('effective calendar and capacity calculation', () => {
    it('should resolve effective calendar from direct assignment', async () => {
      mockDb.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            assignment_id: 'assign-1',
            custom_hours_per_day: '4.00',
            billable_target_hours_per_week: '20.00',
            is_contractor: true,
            id: 'cal-part-time',
            calendar_code: 'CAL-PT',
            calendar_name: 'Part Time Schedule',
            timezone: 'Asia/Kolkata',
            working_days_mask: '1111100',
          },
        ],
      });

      const effective = await service.getEffectiveCalendar('user-contractor', '2026-10-05');
      expect(effective.source).toBe('DIRECT_ASSIGNMENT');
      expect(effective.hoursPerDay).toBe(4.0);
      expect(effective.isContractor).toBe(true);
    });

    it('should identify weekends as non-working days', async () => {
      // Direct assignment returns empty, fallback returns standard Mon-Fri
      mockDb.query
        .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // direct assignment check
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: 'cal-corp',
              calendar_code: 'CAL-CORP',
              calendar_name: 'Corporate Standard',
              timezone: 'Asia/Kolkata',
              working_days_mask: '1111100', // Mon-Fri working, Sat-Sun off
              standard_hours_per_day: '8.00',
            },
          ],
        }); // branch/global query

      // 2026-10-04 is Sunday (non-working in mask 1111100)
      const res = await service.isWorkingDay('user-1', '2026-10-04');
      expect(res.isWorkingDay).toBe(false);
      expect(res.reason).toContain('Weekend');
    });

    it('should identify public holidays as non-working days', async () => {
      // 2026-01-26 is Monday (working day in mask)
      mockDb.query
        .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // direct assignment
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: 'cal-corp',
              calendar_code: 'CAL-CORP',
              calendar_name: 'Corporate Standard',
              timezone: 'Asia/Kolkata',
              working_days_mask: '1111100',
              standard_hours_per_day: '8.00',
            },
          ],
        }) // fallback
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ holiday_name: 'Republic Day' }],
        }); // holiday check

      const res = await service.isWorkingDay('user-1', '2026-01-26');
      expect(res.isWorkingDay).toBe(false);
      expect(res.reason).toContain('Republic Day');
    });

    it('should identify approved leaves as non-working days', async () => {
      // 2026-10-05 is Monday
      mockDb.query
        .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // direct assignment
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: 'cal-corp',
              calendar_code: 'CAL-CORP',
              calendar_name: 'Corporate Standard',
              timezone: 'Asia/Kolkata',
              working_days_mask: '1111100',
              standard_hours_per_day: '8.00',
            },
          ],
        }) // fallback
        .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // no holiday
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ leave_type: 'ANNUAL', reason: 'Vacation' }],
        }); // approved leave found

      const res = await service.isWorkingDay('user-1', '2026-10-05');
      expect(res.isWorkingDay).toBe(false);
      expect(res.reason).toContain('Approved Leave: ANNUAL');
    });
  });

  describe('leave management', () => {
    it('should review and approve leave record', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'leave-1', status: 'PENDING' }] }) // existing check
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: 'leave-1', status: 'APPROVED', approved_by: 'manager-1' }],
        }); // update

      const res = await service.reviewLeave('leave-1', { status: 'APPROVED' }, 'manager-1');
      expect(res.status).toBe('APPROVED');
      expect(res.approved_by).toBe('manager-1');
    });
  });
});
