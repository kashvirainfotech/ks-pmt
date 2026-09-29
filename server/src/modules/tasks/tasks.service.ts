import { customDefinitions, customValues } from "./custom-task-fields";
import { validateDateRanges } from "../../common/validators/date-ranges";
import { taskEvent } from "../notifications/task-events";
import { randomUUID } from "crypto";
import { persistExtended } from "../../database/extended-fields";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import { TaskWorkflowsService } from "../task-workflows/task-workflows.service";
import { AssignmentService } from "../assignment/assignment.service";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { ChangeTaskStatusDto } from "./dto/change-status.dto";
import { AssignTaskDto } from "./dto/assign-task.dto";
import { QueryTaskDto } from "./dto/query-task.dto";
import {
  BulkUpdateTasksDto,
  BulkUpdateTasksResponse,
  BulkUpdateResultItem,
  BulkUpdateFailedItem,
} from "./dto/bulk-update-tasks.dto";

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly workflowsService: TaskWorkflowsService,
    private readonly assignmentService: AssignmentService,
  ) {}

  async toggleSubtask(id: string, completed: boolean, userId: string) {
    const task = await this.findOne(id);
    if (!task.parent_task_id)
      throw new BadRequestException("This record is not a subtask");
    const allowed = await this.workflowsService.getAllowedNextStatuses(
      task.task_type_id,
      task.status_id,
    );
    const target = allowed.find((s) =>
      completed ? s.status_category === "DONE" : !s.is_terminal,
    );
    if (!target)
      throw new BadRequestException(
        "No permitted completion/reopen transition. Open this task and follow its configured workflow.",
      );
    return this.changeStatus(id, { toStatusId: target.id }, userId);
  }

  /**
   * Helper: Generate sequential unique task code (e.g. TSK-1001)
   */
  private async generateTaskCode(projectId?: string): Promise<string> {
    let prefix = "TSK";
    if (projectId) {
      const prjQuery = `SELECT project_code FROM projects WHERE id = $1;`;
      const prjResult = await this.db.query(prjQuery, [projectId]);
      if (prjResult.rowCount > 0 && prjResult.rows[0].project_code) {
        prefix = prjResult.rows[0].project_code;
      }
    }

    return `${prefix.slice(0, 20)}-${randomUUID().replace(/-/g, "").slice(0, 24)}`;
  }

  /**
   * Create task with subtask hierarchy, multi-assignees, and auto-assignment evaluation
   */
  async create(dto: CreateTaskDto, userId: string) {
    if (!dto.title?.trim()) throw new BadRequestException("Title is required");
    dto.title = dto.title.trim();
    validateDateRanges(dto);
    if (dto.projectId && dto.productId) {
      throw new BadRequestException(
        "A task cannot belong to both a Project and a Product simultaneously.",
      );
    }

    if (
      dto.primaryAssigneeId &&
      !dto.assigneeIds?.includes(dto.primaryAssigneeId)
    )
      throw new BadRequestException(
        "Primary assignee must be in the assignee list",
      );
    if (
      dto.plannedStartDate &&
      dto.plannedEndDate &&
      dto.plannedEndDate < dto.plannedStartDate
    )
      throw new BadRequestException("Planned end must follow planned start");
    if (dto.projectId) {
      const project = (
        await this.db.query(
          "SELECT branch_id FROM projects WHERE id=$1 AND is_active=TRUE",
          [dto.projectId],
        )
      ).rows[0];
      if (!project) throw new BadRequestException("Choose an active project");
      if (
        dto.branchId &&
        project.branch_id &&
        dto.branchId !== project.branch_id
      )
        throw new BadRequestException(
          "Project must belong to the selected branch",
        );
      dto.branchId ||= project.branch_id;
    }
    if (
      dto.productId &&
      !(
        await this.db.query(
          "SELECT id FROM products WHERE id=$1 AND is_active=TRUE",
          [dto.productId],
        )
      ).rows.length
    )
      throw new BadRequestException("Choose an active product");
    if (dto.parentTaskId) {
      const parent = await this.findOne(dto.parentTaskId);
      if (
        (dto.projectId || null) !== parent.project_id ||
        (dto.productId || null) !== parent.product_id
      )
        throw new BadRequestException(
          "Subtask must use its parent project or product",
        );
      if (dto.branchId && dto.branchId !== parent.branch_id)
        throw new BadRequestException("Subtask must use its parent branch");
      dto.branchId ||= parent.branch_id;
    }
    if (dto.versionId) {
      const version = (
        await this.db.query(
          "SELECT project_id,product_id FROM versions WHERE id=$1 AND is_active=TRUE",
          [dto.versionId],
        )
      ).rows[0];
      if (
        !version ||
        (version.project_id || null) !== (dto.projectId || null) ||
        (version.product_id || null) !== (dto.productId || null)
      )
        throw new BadRequestException(
          "Version must belong to the selected project or product",
        );
    }
    const type = (
      await this.db.query(
        "SELECT custom_fields, is_chargeable_default, to_jsonb(task_types)->>'default_severity' AS default_severity FROM task_types WHERE id=$1 AND is_active=TRUE",
        [dto.taskTypeId],
      )
    ).rows[0];
    if (!type) throw new BadRequestException("Choose an active task type");
    const taskCustomValues = customValues(
      type.custom_fields || {},
      {},
      dto.customFieldValues,
      true,
    );
    if (dto.isChargeable === undefined)
      dto.isChargeable = type.is_chargeable_default;
    if (dto.severity === undefined && type.default_severity)
      dto.severity = type.default_severity;

    // Default status: Find initial status (e.g. 'OPEN' or lowest sequence order)
    const statusQuery = `
      SELECT id FROM task_statuses
      WHERE is_active = TRUE AND status_category = 'TODO'
        AND (EXISTS (SELECT 1 FROM task_type_workflow_statuses w WHERE w.task_type_id=$1 AND w.is_active=TRUE AND w.from_status_id=task_statuses.id)
          OR NOT EXISTS (SELECT 1 FROM task_type_workflow_statuses w WHERE w.task_type_id=$1 AND w.is_active=TRUE))
      ORDER BY sequence_order ASC, id
      LIMIT 1;
    `;
    const statusResult = await this.db.query(statusQuery, [dto.taskTypeId]);
    const initialStatusId = statusResult.rows[0]?.id;

    if (!initialStatusId) {
      throw new BadRequestException("No active task status defined in system.");
    }

    const taskCode = await this.generateTaskCode(dto.projectId);

    return await this.db.transaction(async (client) => {
      const insertTaskQuery = `
        INSERT INTO tasks (
          task_code, title, description, hierarchy_level, task_type_id, status_id,
          priority, project_id, product_id, version_id, sprint_id, milestone_id,
          parent_task_id, backlog_order, story_points, t_shirt_size,
          planned_start_date, planned_end_date, estimated_hours,
          is_chargeable, charge_amount, currency, branch_id,
          created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $24
        )
        RETURNING *;
      `;

      const taskResult = await persistExtended(
        client,
        insertTaskQuery,
        [
          taskCode,
          dto.title,
          dto.description || null,
          dto.hierarchyLevel || 'TASK',
          dto.taskTypeId,
          initialStatusId,
          dto.priority || "MEDIUM",
          dto.projectId || null,
          dto.productId || null,
          dto.versionId || null,
          dto.sprintId || null,
          dto.milestoneId || null,
          dto.parentTaskId || null,
          dto.backlogOrder || 0.0,
          dto.storyPoints ?? null,
          dto.tShirtSize || null,
          dto.plannedStartDate || null,
          dto.plannedEndDate || null,
          dto.estimatedHours || 0.0,
          dto.isChargeable ?? false,
          dto.chargeAmount || 0.0,
          dto.currency || "INR",
          dto.branchId || null,
          userId,
        ],
        "tasks",
        { severity: dto.severity, custom_field_values: taskCustomValues },
      );

      const newTask = taskResult.rows[0];

      await this.validateCustomUsers(
        client,
        type.custom_fields || {},
        taskCustomValues,
        dto.branchId,
      );

      // Multi-Assignees handling
      let finalAssigneeIds: string[] = dto.assigneeIds || [];

      // If no assignees specified, evaluate Auto-Assignment Matrix rule
      if (finalAssigneeIds.length === 0) {
        const autoUser = await this.assignmentService.evaluateAutoAssignment(
          "ON_CREATION",
          dto.taskTypeId,
          dto.branchId,
          dto.projectId,
        );
        if (autoUser) {
          finalAssigneeIds.push(autoUser);
        }
      }

      await this.validateAssignees(
        client,
        finalAssigneeIds,
        dto.primaryAssigneeId,
        dto.branchId,
      );

      // Insert assigned users
      for (const assigneeId of finalAssigneeIds) {
        const isPrimary =
          assigneeId === (dto.primaryAssigneeId || finalAssigneeIds[0]);
        await client.query(
          `INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by, updated_by)
           VALUES ($1, $2, $3, $4, $4, $4)
           ON CONFLICT (task_id, user_id) DO NOTHING;`,
          [newTask.id, assigneeId, isPrimary, userId],
        );
      }

      await taskEvent(
        client,
        newTask.id,
        userId,
        "TASK_ASSIGNED",
        "Task assigned",
        newTask.title,
      );
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
      whereClauses.push(
        `EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = $${params.length})`,
      );
    }

    if (query.sprintId) {
      params.push(query.sprintId);
      whereClauses.push(`t.sprint_id = $${params.length}`);
    }

    if (query.milestoneId) {
      params.push(query.milestoneId);
      whereClauses.push(`t.milestone_id = $${params.length}`);
    }

    if (query.hierarchyLevel) {
      params.push(query.hierarchyLevel);
      whereClauses.push(`t.hierarchy_level = $${params.length}`);
    }

    if (query.isBacklog) {
      whereClauses.push(`t.sprint_id IS NULL`);
    }

    if (query.isBlocked !== undefined) {
      params.push(query.isBlocked);
      whereClauses.push(`t.is_blocked = $${params.length}`);
    }

    if (query.unassignedOnly) {
      whereClauses.push(
        `NOT EXISTS (SELECT 1 FROM task_assignees ta_check WHERE ta_check.task_id = t.id)`,
      );
    }

    if (query.isCompleted !== undefined) {
      whereClauses.push(
        query.isCompleted ? `ts.is_terminal = TRUE` : `ts.is_terminal = FALSE`,
      );
    }

    if (query.statusCategory) {
      params.push(query.statusCategory);
      whereClauses.push(`ts.status_category = $${params.length}`);
    }

    if (query.search) {
      params.push(`%${query.search.trim()}%`);
      whereClauses.push(
        `(t.task_code ILIKE $${params.length} OR t.title ILIKE $${params.length})`,
      );
    }

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const countSql = `
      SELECT COUNT(DISTINCT t.id) AS total 
      FROM tasks t
      INNER JOIN task_statuses ts ON t.status_id = ts.id
      ${whereSql};
    `;
    const countResult = await this.db.query(countSql, params);
    const totalRecords = parseInt(countResult.rows[0]?.total || "0", 10);
    const totalPages = Math.ceil(totalRecords / limit);

    let orderBySql = 'ORDER BY t.backlog_order ASC, t.created_at DESC';
    if (query.sort) {
      const allowedCols: Record<string, string> = {
        priority: 't.priority',
        title: 't.title',
        task_code: 't.task_code',
        created_at: 't.created_at',
        due_date: 't.planned_end_date',
        planned_end_date: 't.planned_end_date',
        estimated_hours: 't.estimated_hours',
        story_points: 't.story_points',
        backlog_order: 't.backlog_order',
        status_name: 'ts.status_name',
        project_name: 'p.project_name',
      };
      const orderParts: string[] = [];
      const parts = query.sort.split(',');
      for (const part of parts) {
        const [col, dir] = part.trim().split(':');
        const dbCol = allowedCols[col?.toLowerCase()];
        if (dbCol) {
          const direction = dir?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
          orderParts.push(`${dbCol} ${direction}`);
        }
      }
      if (orderParts.length > 0) {
        orderBySql = `ORDER BY ${orderParts.join(', ')}`;
      }
    }

    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const dataSql = `
      SELECT 
        t.id, t.task_code, t.title, t.description, t.hierarchy_level, t.task_type_id, t.status_id,
        t.project_id, t.product_id, t.version_id, t.sprint_id, t.milestone_id, t.branch_id,
        t.priority, t.severity, t.is_blocked, t.resolution, t.resolution_details, t.resolved_at, t.resolved_by,
        t.estimated_hours, t.story_points, t.t_shirt_size, t.backlog_order,
        t.is_chargeable, t.charge_amount, t.currency,
        t.planned_start_date, t.planned_end_date,
        t.actual_start_date, t.actual_end_date,
        t.created_at,
        tt.type_name, tt.color_hex AS type_color, tt.icon_name AS type_icon,
        ts.status_name, ts.color_hex AS status_color, ts.status_category, ts.is_terminal,
        p.project_name, pr.product_name, v.version_code,
        sp.sprint_code, sp.sprint_name,
        m.milestone_code, m.milestone_name,
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
      LEFT JOIN sprints sp ON t.sprint_id = sp.id
      LEFT JOIN milestones m ON t.milestone_id = m.id
      LEFT JOIN task_assignees ta ON t.id = ta.task_id
      LEFT JOIN users u ON ta.user_id = u.id
      ${whereSql}
      GROUP BY 
        t.id, tt.type_name, tt.color_hex, tt.icon_name, ts.status_name, ts.color_hex, ts.status_category, ts.is_terminal,
        p.project_name, pr.product_name, v.version_code, sp.sprint_code, sp.sprint_name, m.milestone_code, m.milestone_name
      ${orderBySql}
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
        tt.type_name, tt.color_hex AS type_color, tt.custom_fields AS custom_field_definitions,
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
      effortSummary: effortResult.rows[0] || {
        total_hours: 0,
        billable_hours: 0,
        non_billable_hours: 0,
      },
    };
  }

  /**
   * Get direct subtasks of a parent task
   */
  async findSubtasks(parentTaskId: string) {
    await this.findOne(parentTaskId);

    const query = `
      SELECT 
        t.id, t.task_code, t.title, t.description, t.task_type_id, t.status_id, t.project_id, t.product_id, t.version_id, t.branch_id, t.priority, t.estimated_hours,
        t.is_chargeable, t.charge_amount,
        tt.type_name, tt.color_hex AS type_color,
        ts.status_name, ts.color_hex AS status_color, ts.is_terminal, (ts.status_category = 'DONE') AS is_completed,
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
      GROUP BY t.id, tt.type_name, tt.color_hex, ts.status_name, ts.color_hex, ts.is_terminal, ts.status_category
      ORDER BY t.created_at ASC;
    `;
    const result = await this.db.query(query, [parentTaskId]);
    return result.rows;
  }

  /**
   * Transition Task Status with workflow state-machine validation
   */
  async changeStatus(id: string, dto: ChangeTaskStatusDto, userOrId: any) {
    const task = await this.findOne(id);
    const userObj = typeof userOrId === 'string' ? { id: userOrId, role_code: 'ROLE_DEVELOPER' } : (userOrId || {});
    const userId = userObj.id || userOrId;

    // 1. Workflow validation: check if transition is allowed and validate gate rules (CONFIG-001)
    if (typeof this.workflowsService.validateTransition === 'function') {
      await this.workflowsService.validateTransition(
        task,
        dto.toStatusId,
        userObj,
        dto,
      );
    } else {
      const allowedStatuses = await this.workflowsService.getAllowedNextStatuses(
        task.task_type_id,
        task.status_id,
      );
      const isPermitted = allowedStatuses.some((s: any) => s.id === dto.toStatusId);
      if (!isPermitted) {
        const allowedNames = allowedStatuses.map((s: any) => s.status_name).join(', ');
        throw new BadRequestException(
          `Invalid status transition. Allowed next status(es): [${allowedNames}]`,
        );
      }
    }

    // 2. Fetch destination status details
    const destStatus = await this.workflowsService.findOneStatus(
      dto.toStatusId,
    );

    // Auto date updates
    let actualStartUpdate = "";
    let actualEndUpdate = "";

    // If entering IN_PROGRESS category and actual_start_date is null
    if (
      destStatus.status_category === "IN_PROGRESS" &&
      !task.actual_start_date
    ) {
      actualStartUpdate = `, actual_start_date = CURRENT_TIMESTAMP`;
    }

    // If entering terminal state (e.g. Closed)
    let resolutionUpdate = "";
    if (destStatus.is_terminal) {
      if (task.type_name === "Bug / Defect" || task.type_code === "BUG") {
        const finalResolution = dto.resolution || task.resolution;
        if (!finalResolution) {
          throw new BadRequestException(
            "Resolution classification (FIXED, WONT_FIX, DUPLICATE, CANNOT_REPRODUCE, BY_DESIGN) is required when closing a Bug / Defect",
          );
        }
      }
      if (!task.actual_end_date) {
        actualEndUpdate = `, actual_end_date = CURRENT_TIMESTAMP`;
      }
      if (dto.resolution) {
        if (
          ![
            "FIXED",
            "WONT_FIX",
            "DUPLICATE",
            "CANNOT_REPRODUCE",
            "BY_DESIGN",
          ].includes(dto.resolution)
        ) {
          throw new BadRequestException("Invalid resolution classification");
        }
        const sanitizedDetails = dto.resolutionDetails
          ? `'${dto.resolutionDetails.replace(/'/g, "''")}'`
          : "NULL";
        resolutionUpdate = `, resolution = '${dto.resolution}', resolution_details = ${sanitizedDetails}, resolved_at = CURRENT_TIMESTAMP, resolved_by = '${userId}'`;
      }
    } else {
      actualEndUpdate = `, actual_end_date = NULL`;
      if (task.resolution) {
        resolutionUpdate = `, resolution = NULL, resolution_details = NULL, resolved_at = NULL, resolved_by = NULL`;
      }
    }

    const autoUser = await this.assignmentService.evaluateAutoAssignment(
      "ON_STATUS_CHANGE",
      task.task_type_id,
      task.branch_id,
      task.project_id,
      task.status_id,
      dto.toStatusId,
    );
    return this.db.transaction(async (client) => {
      await this.lockTask(client, id, dto.expectedRevision ?? task.revision);
      const result = await client.query(
        `UPDATE tasks SET status_id=$1, updated_by=$2
        ${actualStartUpdate} ${actualEndUpdate} ${resolutionUpdate} WHERE id=$3 RETURNING *`,
        [dto.toStatusId, userId, id],
      );
      if (autoUser)
        await this.replaceAssignees(
          client,
          id,
          { assigneeIds: [autoUser], primaryAssigneeId: autoUser },
          userId,
          task.branch_id,
        );
      await taskEvent(
        client,
        id,
        userId,
        "STATUS_CHANGED",
        "Task status changed",
        `${task.title}: ${destStatus.status_name}`,
      );
      return result.rows[0];
    });
  }

  /**
   * Assign or Reassign employees to task
   */
  private async lockTask(client: any, id: string, expectedRevision?: number) {
    const task = (
      await client.query("SELECT * FROM tasks WHERE id=$1 FOR UPDATE", [id])
    ).rows[0];
    if (!task) throw new NotFoundException("Task not found");
    if (expectedRevision !== undefined && task.revision !== expectedRevision)
      throw new ConflictException(
        "This task changed since you opened it. Reload the latest task, review your draft and save again.",
      );
    return task;
  }

  async history(id: string, page = 1) {
    if (!Number.isInteger(page) || page < 1)
      throw new BadRequestException("Invalid history page");
    await this.findOne(id);
    const count = await this.db.query(
      "SELECT COUNT(*) AS total FROM audit_logs WHERE entity_name='tasks' AND record_id=$1",
      [id],
    );
    const data = await this.db.query(
      `SELECT a.id,a.action_type,a.created_at,a.old_values,a.new_values,
      CONCAT(u.first_name,' ',u.last_name) AS actor_name FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id
      WHERE a.entity_name='tasks' AND a.record_id=$1 ORDER BY a.created_at DESC,a.id DESC LIMIT 20 OFFSET $2`,
      [id, (page - 1) * 20],
    );
    const total = Number(count.rows[0].total);
    return {
      data: data.rows,
      meta: {
        page,
        limit: 20,
        total_count: total,
        total_pages: Math.ceil(total / 20),
      },
    };
  }

  private async validateAssignees(
    client: any,
    ids: string[],
    primary: string | undefined,
    branchId?: string,
  ) {
    if (primary && !ids.includes(primary))
      throw new BadRequestException(
        "Primary assignee must be in the assignee list",
      );
    if (new Set(ids).size !== ids.length)
      throw new BadRequestException("Assignees must be unique");
    if (!ids.length) return [];
    const result = await client.query(
      `SELECT u.id, CONCAT(u.first_name,' ',u.last_name) AS name FROM users u WHERE u.id=ANY($1::uuid[]) AND u.is_active=TRUE
      AND ($2::uuid IS NULL OR u.primary_branch_id=$2 OR EXISTS
        (SELECT 1 FROM user_branches ub WHERE ub.user_id=u.id AND ub.branch_id=$2))`,
      [ids, branchId || null],
    );
    if (result.rows.length !== ids.length)
      throw new BadRequestException(
        "Choose active assignees with access to the task branch",
      );
    return result.rows;
  }

  private async validateCustomUsers(
    client: any,
    schema: Record<string, any>,
    values: Record<string, any>,
    branchId?: string,
  ) {
    const ids = Object.entries(customDefinitions(schema))
      .filter(([key, field]) => field.type === "user" && values[key])
      .map(([key]) => values[key]);
    await this.validateAssignees(
      client,
      [...new Set<string>(ids)],
      undefined,
      branchId,
    );
  }

  private async replaceAssignees(
    client: any,
    id: string,
    dto: AssignTaskDto,
    actor: string,
    branchId?: string,
  ) {
    const people = await this.validateAssignees(
      client,
      dto.assigneeIds,
      dto.primaryAssigneeId,
      branchId,
    );
    const previous = await client.query(
      `SELECT ta.user_id AS id, CONCAT(u.first_name,' ',u.last_name) AS name, ta.is_primary_assignee AS primary
      FROM task_assignees ta JOIN users u ON u.id=ta.user_id WHERE ta.task_id=$1 ORDER BY ta.user_id`,
      [id],
    );
    await client.query("DELETE FROM task_assignees WHERE task_id=$1", [id]);
    for (const userId of dto.assigneeIds) {
      await client.query(
        `INSERT INTO task_assignees
        (task_id,user_id,is_primary_assignee,assigned_by_user_id,created_by,updated_by)
        VALUES ($1,$2,$3,$4,$4,$4)`,
        [
          id,
          userId,
          userId === (dto.primaryAssigneeId || dto.assigneeIds[0]),
          actor,
        ],
      );
    }
    const next = people.map((person: any) => ({
      ...person,
      primary: person.id === (dto.primaryAssigneeId || dto.assigneeIds[0]),
    }));
    await client.query(
      `INSERT INTO audit_logs (user_id,action_type,entity_name,record_id,old_values,new_values,created_by,updated_by)
      VALUES ($1,'TASK_ASSIGNEES_CHANGED','tasks',$2,$3::jsonb,$4::jsonb,$1,$1)`,
      [
        actor,
        id,
        JSON.stringify({ assignees: previous.rows }),
        JSON.stringify({ assignees: next }),
      ],
    );
    await taskEvent(
      client,
      id,
      actor,
      "TASK_ASSIGNED",
      "Task assignment changed",
      "You have been assigned to this task",
    );
  }

  async assignUsers(id: string, dto: AssignTaskDto, assignedByUserId: string) {
    return this.db.transaction(async (client) => {
      const task = await this.lockTask(client, id, dto.expectedRevision);
      await this.replaceAssignees(
        client,
        id,
        dto,
        assignedByUserId,
        task.branch_id,
      );
      const result = await client.query(
        "UPDATE tasks SET updated_by=$1 WHERE id=$2 RETURNING *",
        [assignedByUserId, id],
      );
      return {
        success: true,
        count: dto.assigneeIds.length,
        ...result.rows[0],
      };
    });
  }

  /** Omitted fields are unchanged; explicit null clears nullable fields. */
  async update(id: string, dto: UpdateTaskDto, userId: string) {
    return this.db.transaction(async (client) => {
      const existing = await this.lockTask(client, id, dto.expectedRevision);
      validateDateRanges(dto, existing, true);
      for (const key of [
        "title",
        "taskTypeId",
        "priority",
        "estimatedHours",
        "isChargeable",
        "chargeAmount",
        "currency",
        "assigneeIds",
      ]) {
        if (dto[key] === null)
          throw new BadRequestException(`${key} cannot be cleared`);
      }
      if (dto.title !== undefined && !dto.title.trim())
        throw new BadRequestException("Title is required");
      // Moving scope needs its own workflow; never silently accept ignored fields.
      for (const [key, column] of [
        ["projectId", "project_id"],
        ["productId", "product_id"],
        ["parentTaskId", "parent_task_id"],
        ["branchId", "branch_id"],
      ]) {
        if (dto[key] !== undefined && dto[key] !== existing[column])
          throw new BadRequestException(
            "Task scope cannot be changed in the field editor",
          );
      }
      let taskCustomValues: Record<string, any> | undefined;
      if (dto.taskTypeId !== undefined || dto.customFieldValues !== undefined) {
        const type = (
          await client.query(
            "SELECT id, custom_fields FROM task_types WHERE id=$1 AND is_active=TRUE",
            [dto.taskTypeId || existing.task_type_id],
          )
        ).rows[0];
        if (!type) throw new BadRequestException("Choose an active task type");
        taskCustomValues = customValues(
          type.custom_fields || {},
          existing.custom_field_values || {},
          dto.customFieldValues,
          dto.taskTypeId !== undefined &&
            dto.taskTypeId !== existing.task_type_id,
        );
        await this.validateCustomUsers(
          client,
          type.custom_fields || {},
          taskCustomValues,
          existing.branch_id,
        );
        if (
          dto.taskTypeId !== undefined &&
          dto.taskTypeId !== existing.task_type_id
        ) {
          const compatible = await client.query(
            `SELECT id FROM task_type_workflow_statuses
            WHERE task_type_id=$1 AND is_active=TRUE AND (from_status_id=$2 OR to_status_id=$2) LIMIT 1`,
            [dto.taskTypeId, existing.status_id],
          );
          if (!compatible.rows.length)
            throw new BadRequestException(
              "Current status is not part of the selected task type workflow",
            );
        }
      }
      if (dto.versionId) {
        const version = (
          await client.query(
            "SELECT project_id,product_id FROM versions WHERE id=$1 AND is_active=TRUE",
            [dto.versionId],
          )
        ).rows[0];
        if (
          !version ||
          version.project_id !== existing.project_id ||
          version.product_id !== existing.product_id
        )
          throw new BadRequestException(
            "Version must belong to the task project or product",
          );
      }
      if (dto.primaryAssigneeId !== undefined && dto.assigneeIds === undefined)
        throw new BadRequestException(
          "Send the assignee list when changing the primary owner",
        );
      const columns: Record<string, string> = {
        title: "title",
        description: "description",
        taskTypeId: "task_type_id",
        priority: "priority",
        severity: "severity",
        versionId: "version_id",
        sprintId: "sprint_id",
        milestoneId: "milestone_id",
        hierarchyLevel: "hierarchy_level",
        storyPoints: "story_points",
        tShirtSize: "t_shirt_size",
        backlogOrder: "backlog_order",
        plannedStartDate: "planned_start_date",
        plannedEndDate: "planned_end_date",
        actualStartDate: "actual_start_date",
        actualEndDate: "actual_end_date",
        estimatedHours: "estimated_hours",
        isChargeable: "is_chargeable",
        chargeAmount: "charge_amount",
        currency: "currency",
        resolution: "resolution",
        resolutionDetails: "resolution_details",
      };
      const values: any[] = [userId, id];
      const sets = ["updated_by=$1"];
      for (const [key, column] of Object.entries(columns)) {
        if (dto[key] !== undefined) {
          values.push(key === "title" ? dto[key].trim() : dto[key]);
          sets.push(`${column}=$${values.length}`);
        }
      }
      if (dto.resolution !== undefined) {
        if (dto.resolution) {
          values.push(new Date());
          sets.push(`resolved_at=$${values.length}`);
          values.push(userId);
          sets.push(`resolved_by=$${values.length}`);
        } else {
          sets.push("resolved_at=NULL");
          sets.push("resolved_by=NULL");
        }
      }
      if (dto.assigneeIds !== undefined)
        await this.replaceAssignees(
          client,
          id,
          {
            assigneeIds: dto.assigneeIds,
            primaryAssigneeId: dto.primaryAssigneeId,
          },
          userId,
          existing.branch_id,
        );
      if (taskCustomValues !== undefined) {
        values.push(JSON.stringify(taskCustomValues));
        sets.push(`custom_field_values=$${values.length}::jsonb`);
      }
      const result = await client.query(
        `UPDATE tasks SET ${sets.join(", ")} WHERE id=$2 RETURNING *`,
        values,
      );
      return result.rows[0];
    });
  }

  /**
   * Reorder tasks in ranked product/project backlog (PLAN-001)
   */
  async reorderTasks(items: { taskId: string; backlogOrder: number }[], userId: string) {
    return await this.db.transaction(async (client) => {
      for (const item of items) {
        await client.query(
          `UPDATE tasks SET backlog_order = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3;`,
          [item.backlogOrder, userId, item.taskId],
        );
      }
      return { success: true, updatedCount: items.length };
    });
  }

  /**
   * Bulk update tasks with workflow validation, optimistic revision checks,
   * and partial failure reporting (PLAN-003)
   */
  async bulkUpdateTasks(
    dto: BulkUpdateTasksDto,
    userId: string,
    access?: any,
  ): Promise<BulkUpdateTasksResponse> {
    const succeeded: BulkUpdateResultItem[] = [];
    const failed: BulkUpdateFailedItem[] = [];

    for (const item of dto.items) {
      try {
        const taskRes = await this.db.query(
          `SELECT t.*, ts.status_name, ts.status_category, ts.is_terminal, tt.type_name
           FROM tasks t
           INNER JOIN task_statuses ts ON t.status_id = ts.id
           INNER JOIN task_types tt ON t.task_type_id = tt.id
           WHERE t.id = $1`,
          [item.id],
        );

        const task = taskRes.rows[0];
        if (!task) {
          failed.push({
            id: item.id,
            code: 'NOT_FOUND',
            reason: 'Task not found',
          });
          continue;
        }

        // 1. Optimistic concurrency revision check
        if (item.expectedRevision !== undefined && task.revision !== item.expectedRevision) {
          failed.push({
            id: item.id,
            taskCode: task.task_code,
            title: task.title,
            code: 'REVISION_CONFLICT',
            reason: `Revision conflict: expected revision ${item.expectedRevision}, but task has revision ${task.revision}. Reload latest data.`,
          });
          continue;
        }

        // 2. Workflow state machine & gate rules validation if statusId changed (CONFIG-001)
        if (item.statusId && item.statusId !== task.status_id) {
          try {
            await this.workflowsService.validateTransition(
              task,
              item.statusId,
              { id: userId, role_code: 'ROLE_DEVELOPER' },
              item,
            );
          } catch (err: any) {
            const reason = err?.response?.message || err?.message || 'Workflow transition gate failed';
            failed.push({
              id: item.id,
              taskCode: task.task_code,
              title: task.title,
              code: 'INVALID_TRANSITION',
              reason: typeof reason === 'string' ? reason : JSON.stringify(reason),
            });
            continue;
          }

          // Check if bug closing requires resolution
          const destStatus = await this.workflowsService.findOneStatus(item.statusId);
          if (destStatus.is_terminal && (task.type_name === 'Bug / Defect' || task.task_type_id === 'BUG')) {
            const finalRes = item.resolution || task.resolution;
            if (!finalRes) {
              failed.push({
                id: item.id,
                taskCode: task.task_code,
                title: task.title,
                code: 'VALIDATION_ERROR',
                reason: 'Resolution classification is mandatory when closing a Bug / Defect',
              });
              continue;
            }
          }
        }

        // 3. Execute updates in a transaction for this task
        await this.db.transaction(async (client) => {
          const updates: string[] = [
            'revision = revision + 1',
            'updated_by = $2',
            'updated_at = CURRENT_TIMESTAMP',
          ];
          const updateParams: any[] = [item.id, userId];

          if (item.statusId) {
            updateParams.push(item.statusId);
            updates.push(`status_id = $${updateParams.length}`);

            const dest = await this.workflowsService.findOneStatus(item.statusId);
            if (dest.status_category === 'IN_PROGRESS' && !task.actual_start_date) {
              updates.push(`actual_start_date = CURRENT_TIMESTAMP`);
            }
            if (dest.is_terminal) {
              if (!task.actual_end_date) {
                updates.push(`actual_end_date = CURRENT_TIMESTAMP`);
              }
              if (item.resolution) {
                updateParams.push(item.resolution);
                updates.push(`resolution = $${updateParams.length}`);
                updateParams.push(userId);
                updates.push(`resolved_by = $${updateParams.length}`);
                updates.push(`resolved_at = CURRENT_TIMESTAMP`);
              }
              if (item.resolutionDetails !== undefined) {
                updateParams.push(item.resolutionDetails);
                updates.push(`resolution_details = $${updateParams.length}`);
              }
            } else {
              updates.push(`actual_end_date = NULL`);
              if (task.resolution) {
                updates.push(`resolution = NULL, resolution_details = NULL, resolved_at = NULL, resolved_by = NULL`);
              }
            }
          }

          if (item.priority) {
            updateParams.push(item.priority);
            updates.push(`priority = $${updateParams.length}`);
          }
          if (item.sprintId !== undefined) {
            updateParams.push(item.sprintId || null);
            updates.push(`sprint_id = $${updateParams.length}`);
          }
          if (item.milestoneId !== undefined) {
            updateParams.push(item.milestoneId || null);
            updates.push(`milestone_id = $${updateParams.length}`);
          }
          if (item.storyPoints !== undefined) {
            updateParams.push(item.storyPoints);
            updates.push(`story_points = $${updateParams.length}`);
          }
          if (item.tShirtSize !== undefined) {
            updateParams.push(item.tShirtSize);
            updates.push(`t_shirt_size = $${updateParams.length}`);
          }
          if (item.plannedDueDate !== undefined) {
            updateParams.push(item.plannedDueDate);
            updates.push(`planned_end_date = $${updateParams.length}`);
          }
          if (item.isBlocked !== undefined) {
            updateParams.push(item.isBlocked);
            updates.push(`is_blocked = $${updateParams.length}`);
          }

          await client.query(
            `UPDATE tasks SET ${updates.join(', ')} WHERE id = $1`,
            updateParams,
          );

          if (item.assigneeIds !== undefined) {
            await this.replaceAssignees(
              client,
              item.id,
              { assigneeIds: item.assigneeIds, primaryAssigneeId: item.assigneeIds[0] },
              userId,
              task.branch_id,
            );
          }

          await taskEvent(
            client,
            item.id,
            userId,
            'BULK_UPDATE',
            'Task updated via bulk action',
            dto.remarks || 'Bulk update',
          );
        });

        succeeded.push({
          id: item.id,
          taskCode: task.task_code,
          title: task.title,
        });
      } catch (err: any) {
        failed.push({
          id: item.id,
          code: 'VALIDATION_ERROR',
          reason: err.message || 'Failed to update task',
        });
      }
    }

    return {
      total: dto.items.length,
      succeededCount: succeeded.length,
      failedCount: failed.length,
      succeeded,
      failed,
    };
  }

  /**
   * Coordinated server-side query and export for large datasets (PLAN-003)
   */
  async exportTasks(query: QueryTaskDto, format: 'csv' | 'json' = 'csv') {
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
      whereClauses.push(
        `EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = $${params.length})`,
      );
    }
    if (query.sprintId) {
      params.push(query.sprintId);
      whereClauses.push(`t.sprint_id = $${params.length}`);
    }
    if (query.milestoneId) {
      params.push(query.milestoneId);
      whereClauses.push(`t.milestone_id = $${params.length}`);
    }
    if (query.hierarchyLevel) {
      params.push(query.hierarchyLevel);
      whereClauses.push(`t.hierarchy_level = $${params.length}`);
    }
    if (query.isBacklog) {
      whereClauses.push(`t.sprint_id IS NULL`);
    }
    if (query.isBlocked !== undefined) {
      params.push(query.isBlocked);
      whereClauses.push(`t.is_blocked = $${params.length}`);
    }
    if (query.unassignedOnly) {
      whereClauses.push(
        `NOT EXISTS (SELECT 1 FROM task_assignees ta_check WHERE ta_check.task_id = t.id)`,
      );
    }
    if (query.isCompleted !== undefined) {
      whereClauses.push(
        query.isCompleted ? `ts.is_terminal = TRUE` : `ts.is_terminal = FALSE`,
      );
    }
    if (query.statusCategory) {
      params.push(query.statusCategory);
      whereClauses.push(`ts.status_category = $${params.length}`);
    }
    if (query.search) {
      params.push(`%${query.search.trim()}%`);
      whereClauses.push(
        `(t.task_code ILIKE $${params.length} OR t.title ILIKE $${params.length})`,
      );
    }

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const sql = `
      SELECT 
        t.task_code, t.title, t.hierarchy_level, tt.type_name, ts.status_name,
        t.priority, t.severity, p.project_name, pr.product_name,
        sp.sprint_name, m.milestone_name,
        t.estimated_hours, t.story_points, t.t_shirt_size,
        t.planned_end_date, t.is_blocked, t.resolution,
        t.created_at,
        COALESCE(string_agg(DISTINCT CONCAT(u.first_name, ' ', u.last_name), '; '), '') as assignees_text
      FROM tasks t
      INNER JOIN task_types tt ON t.task_type_id = tt.id
      INNER JOIN task_statuses ts ON t.status_id = ts.id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN products pr ON t.product_id = pr.id
      LEFT JOIN sprints sp ON t.sprint_id = sp.id
      LEFT JOIN milestones m ON t.milestone_id = m.id
      LEFT JOIN task_assignees ta ON t.id = ta.task_id
      LEFT JOIN users u ON ta.user_id = u.id
      ${whereSql}
      GROUP BY 
        t.id, t.task_code, t.title, t.hierarchy_level, tt.type_name, ts.status_name,
        t.priority, t.severity, p.project_name, pr.product_name,
        sp.sprint_name, m.milestone_name,
        t.estimated_hours, t.story_points, t.t_shirt_size,
        t.planned_end_date, t.is_blocked, t.resolution, t.created_at
      ORDER BY t.backlog_order ASC, t.created_at DESC
    `;

    const result = await this.db.query(sql, params);
    if (format === 'json') {
      return { data: result.rows, totalRecords: result.rows.length };
    }

    const headers = [
      'Task Code', 'Title', 'Hierarchy', 'Type', 'Status', 'Priority', 'Severity',
      'Project', 'Product', 'Sprint', 'Milestone', 'Estimated Hours', 'Story Points',
      'T-Shirt', 'Due Date', 'Blocked', 'Resolution', 'Assignees', 'Created At'
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const lines = [
      headers.join(','),
      ...result.rows.map((r: any) => [
        escapeCsv(r.task_code),
        escapeCsv(r.title),
        escapeCsv(r.hierarchy_level),
        escapeCsv(r.type_name),
        escapeCsv(r.status_name),
        escapeCsv(r.priority),
        escapeCsv(r.severity),
        escapeCsv(r.project_name),
        escapeCsv(r.product_name),
        escapeCsv(r.sprint_name),
        escapeCsv(r.milestone_name),
        escapeCsv(r.estimated_hours),
        escapeCsv(r.story_points),
        escapeCsv(r.t_shirt_size),
        escapeCsv(r.planned_end_date),
        escapeCsv(r.is_blocked ? 'YES' : 'NO'),
        escapeCsv(r.resolution),
        escapeCsv(r.assignees_text),
        escapeCsv(r.created_at),
      ].join(',')),
    ];

    return {
      csv: lines.join('\n'),
      totalRecords: result.rows.length,
      filename: `tasks_export_${new Date().toISOString().slice(0, 10)}.csv`,
    };
  }
}
