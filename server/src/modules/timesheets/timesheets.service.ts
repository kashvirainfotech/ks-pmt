import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CalendarsService } from '../calendars/calendars.service';
import { QueryTimesheetDto } from './dto/query-timesheet.dto';
import { SubmitTimesheetDto } from './dto/submit-timesheet.dto';
import { ReviewTimesheetPortionDto } from './dto/review-timesheet-portion.dto';
import { StartTimerDto } from './dto/start-timer.dto';
import { StopTimerDto } from './dto/stop-timer.dto';

export function getWeekBoundaries(inputDate?: string): { startDate: string; endDate: string } {
  const d = inputDate ? new Date(inputDate + 'T00:00:00Z') : new Date();
  const day = d.getUTCDay(); // 0 is Sunday, 1 is Monday
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  return {
    startDate: monday.toISOString().slice(0, 10),
    endDate: sunday.toISOString().slice(0, 10),
  };
}

@Injectable()
export class TimesheetsService {
  private readonly logger = new Logger(TimesheetsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly calendarsService: CalendarsService,
  ) {}

  // =========================================================================
  // 1. WEEKLY TIMESHEETS & EXPECTED HOURS CALCULATION (TIME-001)
  // =========================================================================

  async getWeeklyTimesheet(targetUserId: string, startDate?: string) {
    const { startDate: periodStart, endDate: periodEnd } = getWeekBoundaries(startDate);

    // 1. Calculate expected hours via FND-001 CalendarsService
    let expectedHours = 40.0;
    try {
      const capacity = await this.calendarsService.calculateWorkingCapacity(
        targetUserId,
        periodStart,
        periodEnd,
      );
      if (capacity && capacity.totalExpectedHours !== undefined) {
        expectedHours = Number(capacity.totalExpectedHours);
      }
    } catch (e: any) {
      this.logger.warn(`Could not calculate calendar capacity for user ${targetUserId}: ${e.message}`);
    }

    // 2. Fetch or create weekly_timesheets record
    let timesheetRes = await this.db.query(
      `SELECT * FROM weekly_timesheets WHERE user_id = $1 AND period_start_date = $2`,
      [targetUserId, periodStart],
    );

    let timesheet: any;
    if (timesheetRes.rows.length === 0) {
      const createRes = await this.db.query(
        `INSERT INTO weekly_timesheets (
          user_id, period_start_date, period_end_date, expected_hours,
          status, created_by
        ) VALUES ($1, $2, $3, $4, 'DRAFT', $1)
        RETURNING *`,
        [targetUserId, periodStart, periodEnd, expectedHours],
      );
      timesheet = createRes.rows[0];
    } else {
      timesheet = timesheetRes.rows[0];
      // Keep expected hours up to date if still in DRAFT
      if (timesheet.status === 'DRAFT' && Number(timesheet.expected_hours) !== expectedHours) {
        await this.db.query(
          `UPDATE weekly_timesheets SET expected_hours = $1 WHERE id = $2`,
          [expectedHours, timesheet.id],
        );
        timesheet.expected_hours = expectedHours;
      }
    }

    // 3. Fetch all constituent worklogs in that week
    const logsRes = await this.db.query(
      `SELECT 
        ttl.*,
        t.task_code, t.title as task_title, t.priority as task_priority,
        p.id as project_id, p.project_name,
        pr.id as product_id, pr.product_name,
        ts.status_name, ts.color_hex as status_color
       FROM task_time_logs ttl
       INNER JOIN tasks t ON ttl.task_id = t.id
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN products pr ON t.product_id = pr.id
       LEFT JOIN task_statuses ts ON t.status_id = ts.id
       WHERE ttl.user_id = $1 AND ttl.log_date BETWEEN $2 AND $3
       ORDER BY ttl.log_date ASC, ttl.created_at ASC`,
      [targetUserId, periodStart, periodEnd],
    );

    const worklogs = logsRes.rows;

    // 4. Compute sums
    let totalLoggedHours = 0;
    let totalBillableHours = 0;
    let totalOvertimeHours = 0;

    // Group logs by task and date for weekly grid
    const taskGridMap: Record<string, any> = {};

    for (const log of worklogs) {
      const hours = Number(log.hours_spent) || 0;
      totalLoggedHours += hours;
      if (log.is_billable) totalBillableHours += hours;
      if (log.is_overtime) totalOvertimeHours += hours;

      if (!taskGridMap[log.task_id]) {
        taskGridMap[log.task_id] = {
          taskId: log.task_id,
          taskCode: log.task_code,
          taskTitle: log.task_title,
          projectName: log.project_name || log.product_name || 'Independent',
          projectId: log.project_id,
          productId: log.product_id,
          statusName: log.status_name,
          statusColor: log.status_color,
          isBillable: log.is_billable,
          dailyHours: {
            Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0,
          },
          totalHours: 0,
          logs: [],
        };
      }

      const logDayIndex = new Date(log.log_date + 'T00:00:00Z').getUTCDay();
      const dayKeys = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayKey = dayKeys[logDayIndex];

      taskGridMap[log.task_id].dailyHours[dayKey] = +(
        taskGridMap[log.task_id].dailyHours[dayKey] + hours
      ).toFixed(2);
      taskGridMap[log.task_id].totalHours = +(
        taskGridMap[log.task_id].totalHours + hours
      ).toFixed(2);
      taskGridMap[log.task_id].logs.push(log);
    }

    totalLoggedHours = +totalLoggedHours.toFixed(2);
    totalBillableHours = +totalBillableHours.toFixed(2);
    totalOvertimeHours = +totalOvertimeHours.toFixed(2);

    // Update timesheet sums
    await this.db.query(
      `UPDATE weekly_timesheets 
       SET total_logged_hours = $1, total_billable_hours = $2, total_overtime_hours = $3
       WHERE id = $4`,
      [totalLoggedHours, totalBillableHours, totalOvertimeHours, timesheet.id],
    );
    timesheet.total_logged_hours = totalLoggedHours;
    timesheet.total_billable_hours = totalBillableHours;
    timesheet.total_overtime_hours = totalOvertimeHours;

    // 5. Fetch project reviewer portions
    const portionsRes = await this.db.query(
      `SELECT tpp.*, p.project_name, pr.product_name,
              u.first_name || ' ' || COALESCE(u.last_name, '') as reviewer_name
       FROM timesheet_project_portions tpp
       LEFT JOIN projects p ON tpp.project_id = p.id
       LEFT JOIN products pr ON tpp.product_id = pr.id
       LEFT JOIN users u ON tpp.reviewed_by = u.id
       WHERE tpp.timesheet_id = $1
       ORDER BY p.project_name ASC`,
      [timesheet.id],
    );

    const missingHours = Math.max(0, +(expectedHours - totalLoggedHours).toFixed(2));

    return {
      timesheet,
      grid: Object.values(taskGridMap),
      worklogs,
      portions: portionsRes.rows,
      summary: {
        periodStart,
        periodEnd,
        expectedHours,
        totalLoggedHours,
        totalBillableHours,
        totalOvertimeHours,
        missingHours,
        isUnderExpected: totalLoggedHours < expectedHours,
      },
    };
  }

  // =========================================================================
  // 2. TIMESHEET SUBMISSION & CROSS-PROJECT REVIEW WORKFLOW (TIME-001)
  // =========================================================================

  async submitTimesheet(id: string, userId: string, dto: SubmitTimesheetDto) {
    const timesheetRes = await this.db.query(
      `SELECT * FROM weekly_timesheets WHERE id = $1`,
      [id],
    );
    const timesheet = timesheetRes.rows[0];
    if (!timesheet) throw new NotFoundException('Timesheet not found');

    if (timesheet.user_id !== userId) {
      throw new ForbiddenException('Only the timesheet owner can submit this weekly timesheet');
    }

    if (!['DRAFT', 'REJECTED'].includes(timesheet.status)) {
      throw new BadRequestException('Only timesheets in DRAFT or REJECTED status can be submitted');
    }

    if (dto.expectedRevision && timesheet.revision !== dto.expectedRevision) {
      throw new ConflictException(
        `Timesheet revision mismatch (expected: ${dto.expectedRevision}, current: ${timesheet.revision}). Reload latest timesheet.`,
      );
    }

    // Ensure there are logged hours
    if (Number(timesheet.total_logged_hours) <= 0) {
      throw new BadRequestException('Cannot submit a timesheet with 0 logged hours');
    }

    // Split into project portions based on tasks in task_time_logs
    const projectHoursRes = await this.db.query(
      `SELECT 
        t.project_id, t.product_id,
        SUM(ttl.hours_spent) as logged_hours,
        SUM(CASE WHEN ttl.is_billable THEN ttl.hours_spent ELSE 0 END) as billable_hours
       FROM task_time_logs ttl
       INNER JOIN tasks t ON ttl.task_id = t.id
       WHERE ttl.user_id = $1 AND ttl.log_date BETWEEN $2 AND $3
       GROUP BY t.project_id, t.product_id`,
      [userId, timesheet.period_start_date, timesheet.period_end_date],
    );

    return await this.db.transaction(async (client) => {
      // 1. Delete previous portions if resubmitting from REJECTED
      await client.query(
        `DELETE FROM timesheet_project_portions WHERE timesheet_id = $1`,
        [id],
      );

      // 2. Insert fresh project portions
      for (const ph of projectHoursRes.rows) {
        await client.query(
          `INSERT INTO timesheet_project_portions (
            timesheet_id, project_id, product_id,
            logged_hours, billable_hours, status,
            created_by
          ) VALUES ($1, $2, $3, $4, $5, 'PENDING', $6)`,
          [
            id,
            ph.project_id || null,
            ph.product_id || null,
            Number(ph.logged_hours) || 0,
            Number(ph.billable_hours) || 0,
            userId,
          ],
        );
      }

      // 3. Mark timesheet submitted
      const updatedRes = await client.query(
        `UPDATE weekly_timesheets
         SET status = 'SUBMITTED',
             submitted_at = CURRENT_TIMESTAMP,
             submission_notes = $1,
             rejection_reason = NULL,
             rejected_at = NULL,
             rejected_by = NULL,
             revision = revision + 1,
             updated_by = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [dto.submissionNotes || null, userId, id],
      );

      // 4. Update constituent worklogs to SUBMITTED
      await client.query(
        `UPDATE task_time_logs
         SET approval_status = 'SUBMITTED', timesheet_id = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2 AND log_date BETWEEN $3 AND $4`,
        [id, userId, timesheet.period_start_date, timesheet.period_end_date],
      );

      return updatedRes.rows[0];
    });
  }

  async reviewPortion(
    portionId: string,
    dto: ReviewTimesheetPortionDto,
    reviewerId: string,
    isSuperAdmin = false,
  ) {
    const portionRes = await this.db.query(
      `SELECT tpp.*, wt.user_id as timesheet_user_id, wt.status as timesheet_status
       FROM timesheet_project_portions tpp
       INNER JOIN weekly_timesheets wt ON tpp.timesheet_id = wt.id
       WHERE tpp.id = $1`,
      [portionId],
    );

    const portion = portionRes.rows[0];
    if (!portion) throw new NotFoundException('Timesheet portion not found');

    // Rule: No unauthorized self-approval
    if (portion.timesheet_user_id === reviewerId && !isSuperAdmin) {
      throw new ForbiddenException('You cannot approve or review your own timesheet portion');
    }

    if (dto.expectedRevision && portion.revision !== dto.expectedRevision) {
      throw new ConflictException('Portion was modified by another reviewer. Reload latest data.');
    }

    return await this.db.transaction(async (client) => {
      // 1. Update portion decision
      await client.query(
        `UPDATE timesheet_project_portions
         SET status = $1,
             reviewed_by = $2,
             reviewed_at = CURRENT_TIMESTAMP,
             review_remarks = $3,
             revision = revision + 1,
             updated_by = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [dto.status, reviewerId, dto.reviewRemarks || null, portionId],
      );

      // 2. Fetch all portions for parent timesheet to evaluate composite state
      const allPortions = (
        await client.query(
          `SELECT status FROM timesheet_project_portions WHERE timesheet_id = $1`,
          [portion.timesheet_id],
        )
      ).rows;

      const hasRejection = allPortions.some((p: any) => p.status === 'REJECTED');
      const allApproved = allPortions.every((p: any) => p.status === 'APPROVED');

      let parentStatus = portion.timesheet_status;
      if (hasRejection) {
        parentStatus = 'REJECTED';
        await client.query(
          `UPDATE weekly_timesheets
           SET status = 'REJECTED',
               rejection_reason = $1,
               rejected_at = CURRENT_TIMESTAMP,
               rejected_by = $2,
               revision = revision + 1,
               updated_by = $2,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [dto.reviewRemarks || 'Portion rejected by reviewer', reviewerId, portion.timesheet_id],
        );
      } else if (allApproved) {
        parentStatus = 'APPROVED';
        await client.query(
          `UPDATE weekly_timesheets
           SET status = 'APPROVED',
               approved_at = CURRENT_TIMESTAMP,
               approved_by = $1,
               rejection_reason = NULL,
               rejected_at = NULL,
               rejected_by = NULL,
               revision = revision + 1,
               updated_by = $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [reviewerId, portion.timesheet_id],
        );

        // Update all constituent worklogs to APPROVED
        await client.query(
          `UPDATE task_time_logs
           SET approval_status = 'APPROVED', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP
           WHERE timesheet_id = $2`,
          [reviewerId, portion.timesheet_id],
        );
      }

      return {
        portionId,
        portionStatus: dto.status,
        timesheetId: portion.timesheet_id,
        timesheetStatus: parentStatus,
      };
    });
  }

  async reopenTimesheet(id: string, userId: string, reason?: string) {
    const timesheetRes = await this.db.query(
      `SELECT * FROM weekly_timesheets WHERE id = $1`,
      [id],
    );
    const timesheet = timesheetRes.rows[0];
    if (!timesheet) throw new NotFoundException('Timesheet not found');

    return await this.db.transaction(async (client) => {
      // Reset timesheet status to DRAFT
      const res = await client.query(
        `UPDATE weekly_timesheets
         SET status = 'DRAFT',
             rejection_reason = $1,
             revision = revision + 1,
             updated_by = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [reason ? `Reopened: ${reason}` : 'Reopened for amendment', userId, id],
      );

      // Reopen constituent worklogs
      await client.query(
        `UPDATE task_time_logs
         SET approval_status = 'DRAFT', updated_by = $1, updated_at = CURRENT_TIMESTAMP
         WHERE timesheet_id = $2`,
        [userId, id],
      );

      return res.rows[0];
    });
  }

  // =========================================================================
  // 3. PERSISTENT GLOBAL ACTIVE TIMER ACROSS TABS & DEVICES (TIME-001)
  // =========================================================================

  async getActiveTimer(userId: string) {
    const result = await this.db.query(
      `SELECT 
        uat.*,
        t.task_code, t.title as task_title, t.priority as task_priority,
        p.id as project_id, p.project_name
       FROM user_active_timers uat
       INNER JOIN tasks t ON uat.task_id = t.id
       LEFT JOIN projects p ON t.project_id = p.id
       WHERE uat.user_id = $1`,
      [userId],
    );

    if (result.rows.length === 0) return null;

    const timer = result.rows[0];
    let elapsedSeconds = timer.accumulated_seconds || 0;

    if (!timer.is_paused && timer.started_at) {
      const now = new Date().getTime();
      const started = new Date(timer.started_at).getTime();
      const runningDiffSeconds = Math.max(0, Math.floor((now - started) / 1000));
      elapsedSeconds += runningDiffSeconds;
    }

    const h = Math.floor(elapsedSeconds / 3600);
    const m = Math.floor((elapsedSeconds % 3600) / 60);
    const s = elapsedSeconds % 60;
    const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    return {
      ...timer,
      elapsedSeconds,
      elapsedFormatted: formatted,
    };
  }

  async startTimer(userId: string, dto: StartTimerDto) {
    // If timer is already running on a different task, stop and log it first
    const existing = await this.getActiveTimer(userId);
    if (existing) {
      if (existing.task_id === dto.taskId) {
        // If already on same task, resume if paused
        if (existing.is_paused) {
          await this.resumeTimer(userId);
          return await this.getActiveTimer(userId);
        }
        return existing;
      }
      // Task switching: log previous timer work if > 60 seconds
      if (existing.elapsedSeconds >= 60) {
        await this.stopAndLogTimer(userId, {
          description: `Switching to task: ${dto.taskId}`,
        });
      } else {
        await this.discardTimer(userId);
      }
    }

    // Verify task exists
    const task = (
      await this.db.query(`SELECT id, task_code, title FROM tasks WHERE id = $1`, [dto.taskId])
    ).rows[0];
    if (!task) throw new NotFoundException('Task not found');

    const result = await this.db.query(
      `INSERT INTO user_active_timers (
        user_id, task_id, started_at, accumulated_seconds, is_paused, notes, is_billable
      ) VALUES ($1, $2, CURRENT_TIMESTAMP, 0, FALSE, $3, $4)
      ON CONFLICT (user_id) DO UPDATE
      SET task_id = EXCLUDED.task_id,
          started_at = CURRENT_TIMESTAMP,
          accumulated_seconds = 0,
          is_paused = FALSE,
          paused_at = NULL,
          notes = EXCLUDED.notes,
          is_billable = EXCLUDED.is_billable,
          updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [userId, dto.taskId, dto.notes || null, dto.isBillable ?? true],
    );

    return await this.getActiveTimer(userId);
  }

  async pauseTimer(userId: string) {
    const timer = await this.getActiveTimer(userId);
    if (!timer) throw new NotFoundException('No active timer session');

    if (timer.is_paused) return timer;

    await this.db.query(
      `UPDATE user_active_timers
       SET is_paused = TRUE,
           paused_at = CURRENT_TIMESTAMP,
           accumulated_seconds = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2`,
      [timer.elapsedSeconds, userId],
    );

    return await this.getActiveTimer(userId);
  }

  async resumeTimer(userId: string) {
    const timer = await this.getActiveTimer(userId);
    if (!timer) throw new NotFoundException('No active timer session');

    if (!timer.is_paused) return timer;

    await this.db.query(
      `UPDATE user_active_timers
       SET is_paused = FALSE,
           paused_at = NULL,
           started_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1`,
      [userId],
    );

    return await this.getActiveTimer(userId);
  }

  async stopAndLogTimer(userId: string, dto: StopTimerDto) {
    const timer = await this.getActiveTimer(userId);
    if (!timer) throw new NotFoundException('No active timer session to stop');

    const hoursSpent = Math.max(0.01, +(timer.elapsedSeconds / 3600).toFixed(2));
    const logDate = dto.logDate || new Date().toISOString().slice(0, 10);
    const description = dto.description || timer.notes || 'Timer logged work';
    const isBillable = dto.isBillable ?? timer.is_billable;

    return await this.db.transaction(async (client) => {
      // 1. Insert into task_time_logs
      const logRes = await client.query(
        `INSERT INTO task_time_logs (
          task_id, user_id, log_date, hours_spent, is_billable,
          description, timer_start_time, timer_end_time,
          approval_status, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, 'DRAFT', $2, $2)
        RETURNING *`,
        [
          timer.task_id,
          userId,
          logDate,
          hoursSpent,
          isBillable,
          description,
          timer.created_at,
        ],
      );

      // 2. Remove active timer record
      await client.query(`DELETE FROM user_active_timers WHERE user_id = $1`, [userId]);

      return logRes.rows[0];
    });
  }

  async discardTimer(userId: string) {
    await this.db.query(`DELETE FROM user_active_timers WHERE user_id = $1`, [userId]);
    return { success: true, message: 'Active timer discarded' };
  }
}
