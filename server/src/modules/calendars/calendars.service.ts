import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateCalendarDto } from './dto/create-calendar.dto';
import { UpdateCalendarDto } from './dto/update-calendar.dto';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { AssignCalendarDto } from './dto/assign-calendar.dto';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { ReviewLeaveDto } from './dto/review-leave.dto';
import { QueryCalendarDto, QueryLeaveDto } from './dto/query-calendar.dto';

@Injectable()
export class CalendarsService {
  constructor(private readonly db: DatabaseService) {}

  // ==========================================
  // 1. WORKING CALENDARS CRUD
  // ==========================================

  async create(dto: CreateCalendarDto, userId: string) {
    const existing = await this.db.query(
      `SELECT id FROM working_calendars WHERE calendar_code = $1;`,
      [dto.calendarCode],
    );
    if (existing.rowCount > 0) {
      throw new BadRequestException(
        `Calendar with code '${dto.calendarCode}' already exists.`,
      );
    }

    if (dto.isDefault) {
      await this.db.query(
        `UPDATE working_calendars SET is_default = FALSE WHERE is_default = TRUE;`,
      );
    }

    const query = `
      INSERT INTO working_calendars (
        calendar_code,
        calendar_name,
        branch_id,
        timezone,
        standard_hours_per_day,
        working_days_mask,
        is_default,
        description,
        is_active,
        created_by,
        updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9, $9)
      RETURNING *;
    `;
    const res = await this.db.query(query, [
      dto.calendarCode.trim().toUpperCase(),
      dto.calendarName.trim(),
      dto.branchId || null,
      dto.timezone || 'Asia/Kolkata',
      dto.standardHoursPerDay ?? 8.0,
      dto.workingDaysMask || '1111100',
      dto.isDefault ?? false,
      dto.description || null,
      userId,
    ]);

    return res.rows[0];
  }

  async findAll(query: QueryCalendarDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (query.search) {
      conditions.push(
        `(c.calendar_code ILIKE $${paramIndex} OR c.calendar_name ILIKE $${paramIndex})`,
      );
      params.push(`%${query.search}%`);
      paramIndex++;
    }

    if (query.branchId) {
      conditions.push(`c.branch_id = $${paramIndex}`);
      params.push(query.branchId);
      paramIndex++;
    }

    if (query.isActive !== undefined) {
      conditions.push(`c.is_active = $${paramIndex}`);
      params.push(query.isActive);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await this.db.query(
      `SELECT COUNT(*)::int AS total FROM working_calendars c ${whereClause};`,
      params,
    );
    const total = countRes.rows[0]?.total || 0;

    const sql = `
      SELECT 
        c.*,
        b.branch_name,
        b.branch_code,
        COUNT(DISTINCT h.id)::int AS holidays_count,
        COUNT(DISTINCT a.id)::int AS assigned_users_count
      FROM working_calendars c
      LEFT JOIN branches b ON c.branch_id = b.id
      LEFT JOIN calendar_holidays h ON h.calendar_id = c.id AND h.is_active = TRUE
      LEFT JOIN employee_calendar_assignments a ON a.calendar_id = c.id AND a.is_active = TRUE
      ${whereClause}
      GROUP BY c.id, b.branch_name, b.branch_code
      ORDER BY c.is_default DESC, c.calendar_name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
    `;

    const dataRes = await this.db.query(sql, [...params, limit, offset]);

    return {
      items: dataRes.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    const query = `
      SELECT 
        c.*,
        b.branch_name,
        b.branch_code
      FROM working_calendars c
      LEFT JOIN branches b ON c.branch_id = b.id
      WHERE c.id = $1;
    `;
    const res = await this.db.query(query, [id]);
    if (res.rowCount === 0) {
      throw new NotFoundException(`Working calendar with ID '${id}' not found.`);
    }

    const holidays = await this.getHolidays(id);

    return {
      ...res.rows[0],
      holidays,
    };
  }

  async update(id: string, dto: UpdateCalendarDto, userId: string) {
    const existing = await this.db.query(
      `SELECT * FROM working_calendars WHERE id = $1;`,
      [id],
    );
    if (existing.rowCount === 0) {
      throw new NotFoundException(`Working calendar with ID '${id}' not found.`);
    }

    if (dto.calendarCode && dto.calendarCode !== existing.rows[0].calendar_code) {
      const codeCheck = await this.db.query(
        `SELECT id FROM working_calendars WHERE calendar_code = $1 AND id != $2;`,
        [dto.calendarCode, id],
      );
      if (codeCheck.rowCount > 0) {
        throw new BadRequestException(
          `Calendar code '${dto.calendarCode}' is already in use by another calendar.`,
        );
      }
    }

    if (dto.isDefault) {
      await this.db.query(
        `UPDATE working_calendars SET is_default = FALSE WHERE id != $1 AND is_default = TRUE;`,
        [id],
      );
    }

    const current = existing.rows[0];
    const updated = {
      calendar_code: dto.calendarCode ? dto.calendarCode.trim().toUpperCase() : current.calendar_code,
      calendar_name: dto.calendarName !== undefined ? dto.calendarName.trim() : current.calendar_name,
      branch_id: dto.branchId !== undefined ? dto.branchId : current.branch_id,
      timezone: dto.timezone !== undefined ? dto.timezone : current.timezone,
      standard_hours_per_day: dto.standardHoursPerDay !== undefined ? dto.standardHoursPerDay : current.standard_hours_per_day,
      working_days_mask: dto.workingDaysMask !== undefined ? dto.workingDaysMask : current.working_days_mask,
      is_default: dto.isDefault !== undefined ? dto.isDefault : current.is_default,
      description: dto.description !== undefined ? dto.description : current.description,
      is_active: dto.isActive !== undefined ? dto.isActive : current.is_active,
    };

    const updateQuery = `
      UPDATE working_calendars
      SET 
        calendar_code = $1,
        calendar_name = $2,
        branch_id = $3,
        timezone = $4,
        standard_hours_per_day = $5,
        working_days_mask = $6,
        is_default = $7,
        description = $8,
        is_active = $9,
        updated_by = $10,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *;
    `;

    const res = await this.db.query(updateQuery, [
      updated.calendar_code,
      updated.calendar_name,
      updated.branch_id,
      updated.timezone,
      updated.standard_hours_per_day,
      updated.working_days_mask,
      updated.is_default,
      updated.description,
      updated.is_active,
      userId,
      id,
    ]);

    return res.rows[0];
  }

  async remove(id: string, userId: string) {
    const existing = await this.db.query(
      `SELECT is_default FROM working_calendars WHERE id = $1;`,
      [id],
    );
    if (existing.rowCount === 0) {
      throw new NotFoundException(`Working calendar with ID '${id}' not found.`);
    }
    if (existing.rows[0].is_default) {
      throw new BadRequestException(
        'Cannot deactivate the default corporate calendar. Designate another default calendar first.',
      );
    }

    const res = await this.db.query(
      `UPDATE working_calendars SET is_active = FALSE, updated_by = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *;`,
      [id, userId],
    );
    return res.rows[0];
  }

  // ==========================================
  // 2. HOLIDAYS MANAGEMENT
  // ==========================================

  async getHolidays(calendarId: string, year?: number) {
    let query = `
      SELECT *
      FROM calendar_holidays
      WHERE calendar_id = $1 AND is_active = TRUE
    `;
    const params: any[] = [calendarId];

    if (year) {
      query += ` AND (EXTRACT(YEAR FROM holiday_date) = $2 OR is_recurring = TRUE)`;
      params.push(year);
    }

    query += ` ORDER BY holiday_date ASC;`;
    const res = await this.db.query(query, params);
    return res.rows;
  }

  async addHoliday(dto: CreateHolidayDto, userId: string) {
    const cal = await this.db.query(
      `SELECT id FROM working_calendars WHERE id = $1;`,
      [dto.calendarId],
    );
    if (cal.rowCount === 0) {
      throw new NotFoundException(`Working calendar with ID '${dto.calendarId}' not found.`);
    }

    const query = `
      INSERT INTO calendar_holidays (
        calendar_id,
        holiday_name,
        holiday_date,
        is_recurring,
        description,
        is_active,
        created_by,
        updated_by
      ) VALUES ($1, $2, $3, $4, $5, TRUE, $6, $6)
      RETURNING *;
    `;
    const res = await this.db.query(query, [
      dto.calendarId,
      dto.holidayName.trim(),
      dto.holidayDate,
      dto.isRecurring ?? false,
      dto.description || null,
      userId,
    ]);
    return res.rows[0];
  }

  async removeHoliday(holidayId: string) {
    const res = await this.db.query(
      `DELETE FROM calendar_holidays WHERE id = $1 RETURNING *;`,
      [holidayId],
    );
    if (res.rowCount === 0) {
      throw new NotFoundException(`Holiday with ID '${holidayId}' not found.`);
    }
    return { success: true, deleted: res.rows[0] };
  }

  // ==========================================
  // 3. EMPLOYEE SCHEDULE ASSIGNMENTS & RESOLUTION
  // ==========================================

  async assignCalendar(dto: AssignCalendarDto, userId: string) {
    // Validate target user
    const userRes = await this.db.query(
      `SELECT id FROM users WHERE id = $1;`,
      [dto.userId],
    );
    if (userRes.rowCount === 0) {
      throw new NotFoundException(`User with ID '${dto.userId}' not found.`);
    }

    // Validate calendar
    const calRes = await this.db.query(
      `SELECT id FROM working_calendars WHERE id = $1;`,
      [dto.calendarId],
    );
    if (calRes.rowCount === 0) {
      throw new NotFoundException(`Working calendar with ID '${dto.calendarId}' not found.`);
    }

    if (dto.effectiveTo && new Date(dto.effectiveTo) < new Date(dto.effectiveFrom)) {
      throw new BadRequestException('effectiveTo date cannot precede effectiveFrom date.');
    }

    const query = `
      INSERT INTO employee_calendar_assignments (
        user_id,
        calendar_id,
        effective_from,
        effective_to,
        custom_hours_per_day,
        billable_target_hours_per_week,
        is_contractor,
        notes,
        is_active,
        created_by,
        updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9, $9)
      RETURNING *;
    `;
    const res = await this.db.query(query, [
      dto.userId,
      dto.calendarId,
      dto.effectiveFrom,
      dto.effectiveTo || null,
      dto.customHoursPerDay || null,
      dto.billableTargetHoursPerWeek ?? 40.0,
      dto.isContractor ?? false,
      dto.notes || null,
      userId,
    ]);

    return res.rows[0];
  }

  async getAssignmentsByUser(userId: string) {
    const query = `
      SELECT 
        a.*,
        c.calendar_code,
        c.calendar_name,
        c.timezone,
        c.standard_hours_per_day,
        c.working_days_mask
      FROM employee_calendar_assignments a
      JOIN working_calendars c ON a.calendar_id = c.id
      WHERE a.user_id = $1 AND a.is_active = TRUE
      ORDER BY a.effective_from DESC;
    `;
    const res = await this.db.query(query, [userId]);
    return res.rows;
  }

  /**
   * Resolves the effective working calendar and hours for a user on a given date.
   * Priority:
   * 1. Direct Employee Calendar Assignment covering date.
   * 2. User's Branch default calendar.
   * 3. Global corporate default calendar.
   */
  async getEffectiveCalendar(userId: string, targetDateStr: string) {
    // 1. Direct assignment
    const assignQuery = `
      SELECT 
        a.id AS assignment_id,
        a.custom_hours_per_day,
        a.billable_target_hours_per_week,
        a.is_contractor,
        c.*
      FROM employee_calendar_assignments a
      JOIN working_calendars c ON a.calendar_id = c.id
      WHERE a.user_id = $1 
        AND a.is_active = TRUE
        AND a.effective_from <= $2::DATE
        AND (a.effective_to IS NULL OR a.effective_to >= $2::DATE)
      ORDER BY a.effective_from DESC
      LIMIT 1;
    `;
    const assignRes = await this.db.query(assignQuery, [userId, targetDateStr]);
    if (assignRes.rowCount > 0) {
      const row = assignRes.rows[0];
      return {
        source: 'DIRECT_ASSIGNMENT',
        calendarId: row.id,
        calendarCode: row.calendar_code,
        calendarName: row.calendar_name,
        timezone: row.timezone,
        workingDaysMask: row.working_days_mask,
        hoursPerDay: Number(row.custom_hours_per_day || row.standard_hours_per_day),
        billableTargetHoursPerWeek: Number(row.billable_target_hours_per_week),
        isContractor: row.is_contractor,
      };
    }

    // 2. Branch default or Global default
    const fallbackQuery = `
      SELECT 
        c.*,
        u.branch_id AS user_branch_id
      FROM users u
      LEFT JOIN working_calendars c ON (c.branch_id = u.branch_id AND c.is_active = TRUE)
      WHERE u.id = $1
      ORDER BY c.is_default DESC
      LIMIT 1;
    `;
    const fallbackRes = await this.db.query(fallbackQuery, [userId]);
    if (fallbackRes.rowCount > 0 && fallbackRes.rows[0].id) {
      const row = fallbackRes.rows[0];
      return {
        source: 'BRANCH_CALENDAR',
        calendarId: row.id,
        calendarCode: row.calendar_code,
        calendarName: row.calendar_name,
        timezone: row.timezone,
        workingDaysMask: row.working_days_mask,
        hoursPerDay: Number(row.standard_hours_per_day),
        billableTargetHoursPerWeek: 40.0,
        isContractor: false,
      };
    }

    // 3. Fallback to global default
    const globalDefault = await this.db.query(
      `SELECT * FROM working_calendars WHERE is_default = TRUE AND is_active = TRUE LIMIT 1;`,
    );
    if (globalDefault.rowCount > 0) {
      const row = globalDefault.rows[0];
      return {
        source: 'GLOBAL_DEFAULT',
        calendarId: row.id,
        calendarCode: row.calendar_code,
        calendarName: row.calendar_name,
        timezone: row.timezone,
        workingDaysMask: row.working_days_mask,
        hoursPerDay: Number(row.standard_hours_per_day),
        billableTargetHoursPerWeek: 40.0,
        isContractor: false,
      };
    }

    // Default hardcoded corporate fallback if DB is pristine blank
    return {
      source: 'SYSTEM_FALLBACK',
      calendarId: null,
      calendarCode: 'SYS-DEFAULT',
      calendarName: 'System Standard Week (Mon-Fri 8h)',
      timezone: 'Asia/Kolkata',
      workingDaysMask: '1111100',
      hoursPerDay: 8.0,
      billableTargetHoursPerWeek: 40.0,
      isContractor: false,
    };
  }

  /**
   * Determine if a specific date is a working day for a user.
   * Checks: Workweek Mask, Calendar Holidays, and Approved Leaves.
   */
  async isWorkingDay(userId: string, dateStr: string) {
    const calendar = await this.getEffectiveCalendar(userId, dateStr);

    const d = new Date(dateStr + 'T00:00:00Z');
    // JS getUTCDay: 0=Sun, 1=Mon, ..., 6=Sat.
    // Our mask: index 0=Mon, 1=Tue, ..., 5=Sat, 6=Sun.
    const dayOfWeek = d.getUTCDay();
    const maskIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const isMaskWorking = calendar.workingDaysMask.charAt(maskIndex) === '1';

    if (!isMaskWorking) {
      return {
        date: dateStr,
        isWorkingDay: false,
        hoursExpected: 0,
        reason: 'Weekend / Scheduled Off Day',
        calendarName: calendar.calendarName,
      };
    }

    // Check holiday
    if (calendar.calendarId) {
      const monthDay = dateStr.substring(5); // 'MM-DD'
      const holidayRes = await this.db.query(
        `
        SELECT holiday_name FROM calendar_holidays
        WHERE calendar_id = $1 AND is_active = TRUE
          AND (holiday_date = $2::DATE OR (is_recurring = TRUE AND TO_CHAR(holiday_date, 'MM-DD') = $3))
        LIMIT 1;
        `,
        [calendar.calendarId, dateStr, monthDay],
      );
      if (holidayRes.rowCount > 0) {
        return {
          date: dateStr,
          isWorkingDay: false,
          hoursExpected: 0,
          reason: `Public Holiday: ${holidayRes.rows[0].holiday_name}`,
          calendarName: calendar.calendarName,
        };
      }
    }

    // Check approved leave
    const leaveRes = await this.db.query(
      `
      SELECT leave_type, reason FROM employee_leave_records
      WHERE user_id = $1 
        AND is_active = TRUE
        AND status = 'APPROVED'
        AND start_date <= $2::DATE
        AND end_date >= $2::DATE
      LIMIT 1;
      `,
      [userId, dateStr],
    );
    if (leaveRes.rowCount > 0) {
      return {
        date: dateStr,
        isWorkingDay: false,
        hoursExpected: 0,
        reason: `Approved Leave: ${leaveRes.rows[0].leave_type}`,
        calendarName: calendar.calendarName,
      };
    }

    return {
      date: dateStr,
      isWorkingDay: true,
      hoursExpected: calendar.hoursPerDay,
      reason: 'Standard Working Day',
      calendarName: calendar.calendarName,
    };
  }

  /**
   * Calculates net working days and total available delivery hours across a date range.
   */
  async calculateWorkingCapacity(userId: string, startDateStr: string, endDateStr: string) {
    const start = new Date(startDateStr + 'T00:00:00Z');
    const end = new Date(endDateStr + 'T00:00:00Z');

    if (end < start) {
      throw new BadRequestException('endDate cannot be earlier than startDate.');
    }

    let current = new Date(start);
    let totalWorkingDays = 0;
    let totalExpectedHours = 0;
    let holidaysCount = 0;
    let leaveDaysCount = 0;
    let weekendsCount = 0;

    const breakdown: any[] = [];

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const check = await this.isWorkingDay(userId, dateStr);

      if (check.isWorkingDay) {
        totalWorkingDays++;
        totalExpectedHours += check.hoursExpected;
      } else if (check.reason.startsWith('Public Holiday')) {
        holidaysCount++;
      } else if (check.reason.startsWith('Approved Leave')) {
        leaveDaysCount++;
      } else {
        weekendsCount++;
      }

      breakdown.push(check);
      current.setUTCDate(current.getUTCDate() + 1);
    }

    return {
      userId,
      startDate: startDateStr,
      endDate: endDateStr,
      totalWorkingDays,
      totalExpectedHours,
      holidaysCount,
      leaveDaysCount,
      weekendsCount,
      breakdown,
    };
  }

  // ==========================================
  // 4. EMPLOYEE LEAVE RECORDS
  // ==========================================

  async createLeave(dto: CreateLeaveDto, requesterUserId: string, canApprove = false) {
    const targetUserId = dto.userId || requesterUserId;

    if (new Date(dto.endDate) < new Date(dto.startDate)) {
      throw new BadRequestException('endDate cannot precede startDate.');
    }

    // Default status: If submitted by someone with approval rights for others, default APPROVED; else PENDING
    const initialStatus = canApprove ? 'APPROVED' : 'PENDING';
    const approvedBy = initialStatus === 'APPROVED' ? requesterUserId : null;
    const approvedAt = initialStatus === 'APPROVED' ? 'NOW()' : null;

    const query = `
      INSERT INTO employee_leave_records (
        user_id,
        leave_type,
        start_date,
        end_date,
        days_count,
        status,
        reason,
        approved_by,
        approved_at,
        is_active,
        created_by,
        updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ${approvedAt ? 'CURRENT_TIMESTAMP' : 'NULL'}, TRUE, $9, $9)
      RETURNING *;
    `;

    const res = await this.db.query(query, [
      targetUserId,
      dto.leaveType,
      dto.startDate,
      dto.endDate,
      dto.daysCount,
      initialStatus,
      dto.reason || null,
      approvedBy,
      requesterUserId,
    ]);

    return res.rows[0];
  }

  async findAllLeaves(query: QueryLeaveDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 50));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['l.is_active = TRUE'];
    const params: any[] = [];
    let paramIndex = 1;

    if (query.userId) {
      conditions.push(`l.user_id = $${paramIndex}`);
      params.push(query.userId);
      paramIndex++;
    }

    if (query.status) {
      conditions.push(`l.status = $${paramIndex}`);
      params.push(query.status);
      paramIndex++;
    }

    if (query.startDate) {
      conditions.push(`l.end_date >= $${paramIndex}::DATE`);
      params.push(query.startDate);
      paramIndex++;
    }

    if (query.endDate) {
      conditions.push(`l.start_date <= $${paramIndex}::DATE`);
      params.push(query.endDate);
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countRes = await this.db.query(
      `SELECT COUNT(*)::int AS total FROM employee_leave_records l ${whereClause};`,
      params,
    );
    const total = countRes.rows[0]?.total || 0;

    const sql = `
      SELECT 
        l.*,
        CONCAT(u.first_name, ' ', u.last_name) AS employee_name,
        u.email AS employee_email,
        u.employee_id,
        CONCAT(app.first_name, ' ', app.last_name) AS approver_name
      FROM employee_leave_records l
      JOIN users u ON l.user_id = u.id
      LEFT JOIN users app ON l.approved_by = app.id
      ${whereClause}
      ORDER BY l.start_date DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
    `;

    const dataRes = await this.db.query(sql, [...params, limit, offset]);

    return {
      items: dataRes.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async reviewLeave(id: string, dto: ReviewLeaveDto, reviewerUserId: string) {
    const existing = await this.db.query(
      `SELECT * FROM employee_leave_records WHERE id = $1;`,
      [id],
    );
    if (existing.rowCount === 0) {
      throw new NotFoundException(`Leave record with ID '${id}' not found.`);
    }

    const query = `
      UPDATE employee_leave_records
      SET 
        status = $1,
        approved_by = $2,
        approved_at = CURRENT_TIMESTAMP,
        updated_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *;
    `;
    const res = await this.db.query(query, [dto.status, reviewerUserId, id]);
    return res.rows[0];
  }
}
