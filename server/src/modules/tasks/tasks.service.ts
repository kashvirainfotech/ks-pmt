import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { TaskWorkflowsService } from '../task-workflows/task-workflows.service';
import { AssignmentService } from '../assignment/assignment.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ChangeTaskStatusDto } from './dto/change-status.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { QueryTaskDto } from './dto/query-task.dto';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly workflowsService: TaskWorkflowsService,
    private readonly assignmentService: AssignmentService,
  ) {}

  /**
   * Helper: Generate sequential unique task code (e.g. TSK-1001)
   */
  private async generateTaskCode(projectId?: string): Promise<string> {
    let prefix = 'TSK';
    if (projectId) {
      const prjQuery = `SELECT project_code FROM projects WHERE id = $1;`;
      const prjResult = await this.db.query(prjQuery, [projectId]);
      if (prjResult.rowCount > 0 && prjResult.rows[0].project_code) {
        prefix = prjResult.rows[0].project_code;
      }
    }

    const countQuery = `SELECT COUNT(id) AS total FROM tasks;`;
    const countResult = await this.db.query(countQuery);
    const nextNum = parseInt(countResult.rows[0].total, 10) + 1001;
    return `${prefix}-${nextNum}`;
  }

  /**
   * Create task with subtask hierarchy, multi-assignees, and auto-assignment evaluation
   */
  async create(dto: CreateTaskDto, userId: string) {
    if (dto.projectId && dto.productId) {
      throw new BadRequestException('A task cannot belong to both a Project and a Product simultaneously.');
    }

    // Default status: Find initial status (e.g. 'OPEN' or lowest sequence order)
    const statusQuery = `
      SELECT id FROM task_statuses
      WHERE is_active = TRUE
      ORDER BY sequence_order ASC
      LIMIT 1;
    `;
    const statusResult = await this.db.query(statusQuery);
    const initialStatusId = statusResult.rows[0]?.id;

    if (!initialStatusId) {
      throw new BadRequestException('No active task status defined in system.');
    }

    const taskCode = await this.generateTaskCode(dto.projectId);

    return await this.db.transaction(async (client) => {
      const insertTaskQuery = `
        INSERT INTO tasks (
          task_code, title, description, task_type_id, status_id,
          priority, project_id, product_id, version_id, parent_task_id,
          planned_start_date, planned_end_date, estimated_hours,
          is_chargeable, charge_amount, currency, branch_id,
          created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $18
        )
        RETURNING *;
      `;

      const taskResult = await client.query(insertTaskQuery, [
        taskCode,
        dto.title,
        dto.description || null,
        dto.taskTypeId,
        initialStatusId,
        dto.priority || 'MEDIUM',
        dto.projectId || null,
        dto.productId || null,
        dto.versionId || null,
        dto.parentTaskId || null,
        dto.plannedStartDate || null,
        dto.plannedEndDate || null,
        dto.estimatedHours || 0.00,
        dto.isChargeable ?? false,
        dto.chargeAmount || 0.00,
        dto.currency || 'INR',
        dto.branchId || null,
        userId,
      ]);

      const newTask = taskResult.rows[0];

      // Multi-Assignees handling
      let finalAssigneeIds: string[] = dto.assigneeIds || [];

      // If no assignees specified, evaluate Auto-Assignment Matrix rule
      if (finalAssigneeIds.length === 0) {
        const autoUser = await this.assignmentService.evaluateAutoAssignment(
          'ON_CREATION',
          dto.taskTypeId,
          dto.branchId,
          dto.projectId,
        );
        if (autoUser) {
          finalAssigneeIds.push(autoUser);
        }
      }

      // Insert assigned users
      for (const assigneeId of finalAssigneeIds) {
        const isPrimary = assigneeId === (dto.primaryAssigneeId || finalAssigneeIds[0]);
        await client.query(
          `INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by, updated_by)
           VALUES ($1, $2, $3, $4, $4, $4)
           ON CONFLICT (task_id, user_id) DO NOTHING;`,
          [newTask.id, assigneeId, isPrimary, userId],
        );
      }

      return newTask;
    });
  }

  /**
   * Filterable and paginated tasks list
   */
  async findAll(query: QueryTaskDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const params: any[] = [];
    const whereClauses: string[] = [];

    if (query.projectId) {
      params.push(query.projectId);
      whereClauses.push(`t.project_id = $${params.length}`);
    }

    if (query.productId) {
      params.push(query.productId);
      whereClauses.push(`t.product_id = $${params.length}`);
    }

    if (query.versionId) {
      params.push(query.versionId);
      whereClauses.push(`t.version_id = $${params.length}`);
    }

    if (query.taskTypeId) {
      params.push(query.taskTypeId);
      whereClauses.push(`t.task_type_id = $${params.length}`);
    }

    if (query.statusId) {
      params.push(query.statusId);
      whereClauses.push(`t.status_id = $${params.length}`);
    }

    if (query.priority) {
      params.push(query.priority);
      whereClauses.push(`t.priority = $${params.length}`);
    }

    if (query.branchId) {
      params.push(query.branchId);
      whereClauses.push(`t.branch_id = $${params.length}`);
    }

    if (query.isChargeable !== undefined) {
      params.push(query.isChargeable);
      whereClauses.push(`t.is_chargeable = $${params.length}`);
    }

    if (query.assigneeUserId) {
      params.push(query.assigneeUserId);
      whereClauses.push(`EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = $${params.length})`);
    }

    if (query.search) {
      params.push(`%${query.search.trim()}%`);
      whereClauses.push(`(t.task_code ILIKE $${params.length} OR t.title ILIKE $${params.length})`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(t.id) AS total FROM tasks t ${whereSql};`;
    const countResult = await this.db.query(countSql, params);
    const totalRecords = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(totalRecords / limit);

    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const dataSql = `
      SELECT 
        t.id, t.task_code, t.title, t.priority, t.estimated_hours,
        t.is_chargeable, t.charge_amount, t.currency,
        t.planned_start_date, t.planned_end_date,
        t.actual_start_date, t.actual_end_date,
        t.created_at,
        tt.type_name, tt.color_hex AS type_color, tt.icon_name AS type_icon,
        ts.status_name, ts.color_hex AS status_color, ts.status_category, ts.is_terminal,
        p.project_name, pr.product_name, v.version_code,
        COALESCE(
          json_agg(
            json_build_object(
              'userId', u.id,
              'name', CONCAT(u.first_name, ' ', u.last_name),
              'avatar', u.avatar_s3_key,
              'isPrimary', ta.is_primary_assignee
            )
          ) FILTER (WHERE u.id IS NOT NULL), '[]'
        ) AS assignees
      FROM tasks t
      INNER JOIN task_types tt ON t.task_type_id = tt.id
      INNER JOIN task_statuses ts ON t.status_id = ts.id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN products pr ON t.product_id = pr.id
      LEFT JOIN versions v ON t.version_id = v.id
      LEFT JOIN task_assignees ta ON t.id = ta.task_id
      LEFT JOIN users u ON ta.user_id = u.id
      ${whereSql}
      GROUP BY t.id, tt.type_name, tt.color_hex, tt.icon_name, ts.status_name, ts.color_hex, ts.status_category, ts.is_terminal, p.project_name, pr.product_name, v.version_code
      ORDER BY t.created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx};
    `;

    const dataResult = await this.db.query(dataSql, params);

    return {
      data: dataResult.rows,
      meta: {
        page,
        limit,
        totalRecords,
        totalPages,
      },
    };
  }

  /**
   * Get single task with subtasks count, logged effort, and assignees
   */
  async findOne(id: string) {
    const query = `
      SELECT 
        t.*,
        tt.type_name, tt.color_hex AS type_color,
        ts.status_name, ts.color_hex AS status_color, ts.status_category, ts.is_terminal,
        p.project_name, pr.product_name, v.version_code,
        b.branch_name,
        parent.task_code AS parent_task_code, parent.title AS parent_task_title
      FROM tasks t
      INNER JOIN task_types tt ON t.task_type_id = tt.id
      INNER JOIN task_statuses ts ON t.status_id = ts.id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN products pr ON t.product_id = pr.id
      LEFT JOIN versions v ON t.version_id = v.id
      LEFT JOIN branches b ON t.branch_id = b.id
      LEFT JOIN tasks parent ON t.parent_task_id = parent.id
      WHERE t.id = $1;
    `;
    const result = await this.db.query(query, [id]);
    if (result.rowCount === 0) {
      throw new NotFoundException(`Task with ID ${id} not found.`);
    }

    const task = result.rows[0];

    // Assignees
    const assigneesQuery = `
      SELECT 
        ta.user_id,
        u.employee_code,
        CONCAT(u.first_name, ' ', u.last_name) AS full_name,
        u.email,
        u.avatar_s3_key,
        des.desig_name,
        ta.is_primary_assignee,
        ta.assigned_at
      FROM task_assignees ta
      INNER JOIN users u ON ta.user_id = u.id
      INNER JOIN designations des ON u.designation_id = des.id
      WHERE ta.task_id = $1;
    `;
    const assigneesResult = await this.db.query(assigneesQuery, [id]);

    // Subtasks count
    const subtasksCountQuery = `SELECT COUNT(id) AS total_subtasks FROM tasks WHERE parent_task_id = $1;`;
    const subtasksCountResult = await this.db.query(subtasksCountQuery, [id]);

    // Logged effort (via fn_calculate_task_effort)
    const effortQuery = `SELECT * FROM fn_calculate_task_effort($1, TRUE);`;
    const effortResult = await this.db.query(effortQuery, [id]);

    return {
      ...task,
      assignees: assigneesResult.rows,
      totalSubtasks: parseInt(subtasksCountResult.rows[0].total_subtasks, 10),
      effortSummary: effortResult.rows[0] || { total_hours: 0, billable_hours: 0, non_billable_hours: 0 },
    };
  }

  /**
   * Get direct subtasks of a parent task
   */
  async findSubtasks(parentTaskId: string) {
    await this.findOne(parentTaskId);

    const query = `
      SELECT 
        t.id, t.task_code, t.title, t.priority, t.estimated_hours,
        t.is_chargeable, t.charge_amount,
        tt.type_name, tt.color_hex AS type_color,
        ts.status_name, ts.color_hex AS status_color, ts.is_terminal,
        COALESCE(
          json_agg(
            json_build_object(
              'userId', u.id,
              'name', CONCAT(u.first_name, ' ', u.last_name),
              'avatar', u.avatar_s3_key
            )
          ) FILTER (WHERE u.id IS NOT NULL), '[]'
        ) AS assignees
      FROM tasks t
      INNER JOIN task_types tt ON t.task_type_id = tt.id
      INNER JOIN task_statuses ts ON t.status_id = ts.id
      LEFT JOIN task_assignees ta ON t.id = ta.task_id
      LEFT JOIN users u ON ta.user_id = u.id
      WHERE t.parent_task_id = $1
      GROUP BY t.id, tt.type_name, tt.color_hex, ts.status_name, ts.color_hex, ts.is_terminal
      ORDER BY t.created_at ASC;
    `;
    const result = await this.db.query(query, [parentTaskId]);
    return result.rows;
  }

  /**
   * Transition Task Status with workflow state-machine validation
   */
  async changeStatus(id: string, dto: ChangeTaskStatusDto, userId: string) {
    const task = await this.findOne(id);

    // 1. Workflow validation: check if transition is allowed
    const allowedStatuses = await this.workflowsService.getAllowedNextStatuses(
      task.task_type_id,
      task.status_id,
    );

    const isPermitted = allowedStatuses.some((s) => s.id === dto.toStatusId);
    if (!isPermitted && allowedStatuses.length > 0) {
      const allowedNames = allowedStatuses.map((s) => s.status_name).join(', ');
      throw new BadRequestException(
        `Invalid status transition. Allowed next status(es): [${allowedNames}]`,
      );
    }

    // 2. Fetch destination status details
    const destStatus = await this.workflowsService.findOneStatus(dto.toStatusId);

    // Auto date updates
    let actualStartUpdate = '';
    let actualEndUpdate = '';

    // If entering IN_PROGRESS category and actual_start_date is null
    if (destStatus.status_category === 'IN_PROGRESS' && !task.actual_start_date) {
      actualStartUpdate = `, actual_start_date = CURRENT_TIMESTAMP`;
    }

    // If entering terminal state (e.g. Closed)
    if (destStatus.is_terminal && !task.actual_end_date) {
      actualEndUpdate = `, actual_end_date = CURRENT_TIMESTAMP`;
    }

    const updateQuery = `
      UPDATE tasks SET
        status_id = $1,
        updated_by = $2,
        updated_at = CURRENT_TIMESTAMP
        ${actualStartUpdate}
        ${actualEndUpdate}
      WHERE id = $3
      RETURNING *;
    `;

    const result = await this.db.query(updateQuery, [dto.toStatusId, userId, id]);
    const updatedTask = result.rows[0];

    // 3. Evaluate Auto-Assignment Matrix rule on status change
    const autoUser = await this.assignmentService.evaluateAutoAssignment(
      'ON_STATUS_CHANGE',
      task.task_type_id,
      task.branch_id,
      task.project_id,
      task.status_id,
      dto.toStatusId,
    );

    if (autoUser) {
      await this.assignUsers(id, { assigneeIds: [autoUser], primaryAssigneeId: autoUser }, userId);
      this.logger.log(`Task ${task.task_code} auto-reassigned to user ${autoUser} on status change.`);
    }

    return updatedTask;
  }

  /**
   * Assign or Reassign employees to task
   */
  async assignUsers(id: string, dto: AssignTaskDto, assignedByUserId: string) {
    await this.findOne(id);

    return await this.db.transaction(async (client) => {
      // Clear existing assignees
      await client.query(`DELETE FROM task_assignees WHERE task_id = $1;`, [id]);

      // Insert new assignees
      for (const assigneeId of dto.assigneeIds) {
        const isPrimary = assigneeId === (dto.primaryAssigneeId || dto.assigneeIds[0]);
        await client.query(
          `INSERT INTO task_assignees (
            task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by, updated_by
          ) VALUES ($1, $2, $3, $4, $4, $4);`,
          [id, assigneeId, isPrimary, assignedByUserId],
        );
      }

      return { success: true, count: dto.assigneeIds.length };
    });
  }

  /**
   * Update task parameters
   */
  async update(id: string, dto: UpdateTaskDto, userId: string) {
    await this.findOne(id);

    const updateQuery = `
      UPDATE tasks SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        task_type_id = COALESCE($3, task_type_id),
        priority = COALESCE($4, priority),
        version_id = COALESCE($5, version_id),
        planned_start_date = COALESCE($6, planned_start_date),
        planned_end_date = COALESCE($7, planned_end_date),
        actual_start_date = COALESCE($8, actual_start_date),
        actual_end_date = COALESCE($9, actual_end_date),
        estimated_hours = COALESCE($10, estimated_hours),
        is_chargeable = COALESCE($11, is_chargeable),
        charge_amount = COALESCE($12, charge_amount),
        currency = COALESCE($13, currency),
        branch_id = COALESCE($14, branch_id),
        updated_by = $15,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $16
      RETURNING *;
    `;

    const result = await this.db.query(updateQuery, [
      dto.title,
      dto.description,
      dto.taskTypeId,
      dto.priority,
      dto.versionId,
      dto.plannedStartDate,
      dto.plannedEndDate,
      dto.actualStartDate,
      dto.actualEndDate,
      dto.estimatedHours,
      dto.isChargeable,
      dto.chargeAmount,
      dto.currency,
      dto.branchId,
      userId,
      id,
    ]);

    // Update assignees if provided
    if (dto.assigneeIds) {
      await this.assignUsers(
        id,
        { assigneeIds: dto.assigneeIds, primaryAssigneeId: dto.primaryAssigneeId },
        userId,
      );
    }

    return result.rows[0];
  }
}
