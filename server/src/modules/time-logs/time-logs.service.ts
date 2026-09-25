import { validateDateRanges } from '../../common/validators/date-ranges';
import { RbacService } from '../rbac/rbac.service';
import {
  ForbiddenException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateTimeLogDto } from './dto/create-time-log.dto';
import { QueryTimeLogDto } from './dto/query-time-log.dto';

@Injectable()
export class TimeLogsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly rbac: RbacService,
  ) {}

  async canReview(userId: string, branchId: string) {
    const p = await this.rbac.getEffectivePermissions(userId, branchId);
    return (
      p.roleCode === 'ROLE_SUPER_ADMIN' || p.permissions.has('TIMELOGS:APPROVE')
    );
  }

  async submit(id: string, userId: string) {
    const result = await this.db.writeWithFields(
      `UPDATE task_time_logs SET updated_by=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND user_id=$2 AND COALESCE(to_jsonb(task_time_logs)->>'approval_status','DRAFT') IN ('DRAFT','REJECTED') RETURNING *`,
      [id, userId],
      'task_time_logs',
      {
        approval_status: 'SUBMITTED',
        review_remarks: null,
        reviewed_by: null,
        reviewed_at: null,
      },
    );
    if (!result.rowCount)
      throw new BadRequestException(
        'Only your draft or rejected worklog can be submitted',
      );
    return result.rows[0];
  }

  async review(
    id: string,
    status: string,
    remarks: string | undefined,
    userId: string,
  ) {
    const result = await this.db.writeWithFields(
      `UPDATE task_time_logs SET updated_by=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND user_id<>$2 AND to_jsonb(task_time_logs)->>'approval_status'='SUBMITTED' RETURNING *`,
      [id, userId],
      'task_time_logs',
      {
        approval_status: status,
        reviewed_by: userId,
        reviewed_at: new Date(),
        review_remarks: remarks || null,
      },
    );
    if (!result.rowCount)
      throw new BadRequestException(
        'Only submitted worklogs belonging to another employee can be reviewed',
      );
    return result.rows[0];
  }

  async create(dto: CreateTimeLogDto, userId: string) {
    validateDateRanges(dto);
    const taskQuery = `SELECT id, task_code, title FROM tasks WHERE id = $1;`;
    const taskResult = await this.db.query(taskQuery, [dto.taskId]);
    if (taskResult.rowCount === 0) {
      throw new NotFoundException(`Task with ID ${dto.taskId} not found.`);
    }

    const insertQuery = `
      INSERT INTO task_time_logs (
        task_id, user_id, log_date, hours_spent, is_billable,
        description, timer_start_time, timer_end_time,
        created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $2, $2
      )
      RETURNING *;
    `;

    const result = await this.db.writeWithFields(
      insertQuery,
      [
        dto.taskId,
        userId,
        dto.logDate,
        dto.hoursSpent,
        dto.isBillable ?? true,
        dto.description,
        dto.timerStartTime || null,
        dto.timerEndTime || null,
      ],
      'task_time_logs',
      { is_overtime: dto.isOvertime, is_weekend: dto.isWeekend },
    );

    return result.rows[0];
  }

  async findByTask(taskId: string) {
    const logsQuery = `
      SELECT 
        tl.*,
        u.employee_code,
        CONCAT(u.first_name, ' ', u.last_name) AS employee_name,
        u.avatar_s3_key
      FROM task_time_logs tl
      INNER JOIN users u ON tl.user_id = u.id
      WHERE tl.task_id = $1
      ORDER BY tl.log_date DESC, tl.created_at DESC;
    `;
    const logsResult = await this.db.query(logsQuery, [taskId]);

    // Aggregate effort calculation via stored function fn_calculate_task_effort
    const effortQuery = `SELECT * FROM fn_calculate_task_effort($1, TRUE);`;
    const effortResult = await this.db.query(effortQuery, [taskId]);

    return {
      logs: logsResult.rows,
      effortTotals: effortResult.rows[0] || {
        total_hours: 0,
        billable_hours: 0,
        non_billable_hours: 0,
      },
    };
  }

  async findAll(query: QueryTimeLogDto) {
    const params: any[] = [];
    const whereClauses: string[] = ['1=1'];

    if (query.branchId) {
      params.push(query.branchId);
      whereClauses.push(
        `EXISTS (SELECT 1 FROM tasks scoped WHERE scoped.id=tl.task_id AND scoped.branch_id=$${params.length})`,
      );
    }

    if (query.userId) {
      params.push(query.userId);
      whereClauses.push(`tl.user_id = $${params.length}`);
    }

    if (query.taskId) {
      params.push(query.taskId);
      whereClauses.push(`tl.task_id = $${params.length}`);
    }

    if (query.startDate) {
      params.push(query.startDate);
      whereClauses.push(`tl.log_date >= $${params.length}`);
    }

    if (query.endDate) {
      params.push(query.endDate);
      whereClauses.push(`tl.log_date <= $${params.length}`);
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const countQuery = `SELECT COUNT(*) AS total FROM task_time_logs tl ${whereSql};`;
    const countResult = await this.db.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].total, 10);

    const limit = query.limit ? Number(query.limit) : 50;
    const page = query.page ? Number(query.page) : 1;
    const offset = (page - 1) * limit;

    const dataSql = `
      SELECT 
        tl.*,
        ROUND(tl.hours_spent * 60) AS duration_minutes,
        CONCAT(u.first_name, ' ', u.last_name) AS user_name,
        u.employee_code,
        u.avatar_s3_key,
        t.task_code,
        t.title AS task_title,
        p.project_name,
        pr.product_name
      FROM task_time_logs tl
      INNER JOIN users u ON tl.user_id = u.id
      INNER JOIN tasks t ON tl.task_id = t.id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN products pr ON t.product_id = pr.id
      ${whereSql}
      ORDER BY tl.log_date DESC, tl.created_at DESC
      LIMIT ${limit} OFFSET ${offset};
    `;

    const result = await this.db.query(dataSql, params);

    return {
      timeLogs: result.rows,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
    };
  }

  async findMyLogs(userId: string, query: QueryTimeLogDto) {
    const params: any[] = [userId];
    const whereClauses: string[] = ['tl.user_id = $1'];

    if (query.startDate) {
      params.push(query.startDate);
      whereClauses.push(`tl.log_date >= $${params.length}`);
    }

    if (query.endDate) {
      params.push(query.endDate);
      whereClauses.push(`tl.log_date <= $${params.length}`);
    }

    if (query.taskId) {
      params.push(query.taskId);
      whereClauses.push(`tl.task_id = $${params.length}`);
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const dataSql = `
      SELECT 
        tl.*,
        t.task_code,
        t.title AS task_title,
        p.project_name,
        pr.product_name
      FROM task_time_logs tl
      INNER JOIN tasks t ON tl.task_id = t.id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN products pr ON t.product_id = pr.id
      ${whereSql}
      ORDER BY tl.log_date DESC, tl.created_at DESC;
    `;

    const result = await this.db.query(dataSql, params);

    const totalHours = result.rows.reduce(
      (acc, row) => acc + parseFloat(row.hours_spent),
      0,
    );
    const billableHours = result.rows
      .filter((row) => row.is_billable)
      .reduce((acc, row) => acc + parseFloat(row.hours_spent), 0);

    return {
      logs: result.rows,
      summary: {
        totalHours: totalHours.toFixed(2),
        billableHours: billableHours.toFixed(2),
        nonBillableHours: (totalHours - billableHours).toFixed(2),
      },
    };
  }

  async getEmployeeWorkload() {
    const query = `SELECT * FROM vw_employee_workload ORDER BY active_assigned_tasks_count DESC;`;
    const result = await this.db.query(query);
    return result.rows;
  }

  async deleteLog(id: string, userId: string, roleCode: string) {
    const checkQuery = `SELECT id, user_id, to_jsonb(task_time_logs)->>'approval_status' AS approval_status FROM task_time_logs WHERE id = $1;`;
    const checkResult = await this.db.query(checkQuery, [id]);
    if (checkResult.rowCount === 0) {
      throw new NotFoundException(`Time log with ID ${id} not found.`);
    }

    const log = checkResult.rows[0];
    if (['SUBMITTED', 'APPROVED'].includes(log.approval_status))
      throw new ForbiddenException(
        'Submitted or approved worklogs cannot be deleted',
      );
    if (log.user_id !== userId && roleCode !== 'ROLE_SUPER_ADMIN') {
      throw new ForbiddenException('You can only delete your own time logs.');
    }

    await this.db.query(`DELETE FROM task_time_logs WHERE id = $1;`, [id]);
    return { success: true, message: 'Time log deleted successfully' };
  }
}
