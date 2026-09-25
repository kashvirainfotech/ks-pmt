import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateTimeLogDto } from './dto/create-time-log.dto';
import { QueryTimeLogDto } from './dto/query-time-log.dto';

@Injectable()
export class TimeLogsService {
  constructor(private readonly db: DatabaseService) {}

  async create(dto: CreateTimeLogDto, userId: string) {
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

    const result = await this.db.query(insertQuery, [
      dto.taskId,
      userId,
      dto.logDate,
      dto.hoursSpent,
      dto.isBillable ?? true,
      dto.description,
      dto.timerStartTime || null,
      dto.timerEndTime || null,
    ]);

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
      effortTotals: effortResult.rows[0] || { total_hours: 0, billable_hours: 0, non_billable_hours: 0 },
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

    const totalHours = result.rows.reduce((acc, row) => acc + parseFloat(row.hours_spent), 0);
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
    const checkQuery = `SELECT id, user_id FROM task_time_logs WHERE id = $1;`;
    const checkResult = await this.db.query(checkQuery, [id]);
    if (checkResult.rowCount === 0) {
      throw new NotFoundException(`Time log with ID ${id} not found.`);
    }

    const log = checkResult.rows[0];
    if (log.user_id !== userId && roleCode !== 'ROLE_SUPER_ADMIN') {
      throw new ForbiddenException('You can only delete your own time logs.');
    }

    await this.db.query(`DELETE FROM task_time_logs WHERE id = $1;`, [id]);
    return { success: true, message: 'Time log deleted successfully' };
  }
}
