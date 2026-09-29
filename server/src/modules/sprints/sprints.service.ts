import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CalendarsService } from '../calendars/calendars.service';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';
import { CloseSprintDto } from './dto/close-sprint.dto';
import { AddSprintTasksDto, RemoveSprintTaskDto } from './dto/sprint-task-scope.dto';
import { QuerySprintDto } from './dto/query-sprint.dto';

@Injectable()
export class SprintsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly calendarsService: CalendarsService,
  ) {}

  async create(dto: CreateSprintDto, userId: string) {
    if (new Date(dto.endDate) < new Date(dto.startDate)) {
      throw new BadRequestException('endDate cannot precede startDate.');
    }

    if (dto.entityType === 'PROJECT' && !dto.projectId) {
      throw new BadRequestException('projectId is required when entityType is PROJECT.');
    }
    if (dto.entityType === 'PRODUCT' && !dto.productId) {
      throw new BadRequestException('productId is required when entityType is PRODUCT.');
    }

    const query = `
      INSERT INTO sprints (
        sprint_code,
        sprint_name,
        sprint_goal,
        entity_type,
        project_id,
        product_id,
        start_date,
        end_date,
        status,
        is_active,
        created_by,
        updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PLANNING', TRUE, $9, $9)
      RETURNING *;
    `;

    const res = await this.db.query(query, [
      dto.sprintCode.trim().toUpperCase(),
      dto.sprintName.trim(),
      dto.sprintGoal || null,
      dto.entityType,
      dto.projectId || null,
      dto.productId || null,
      dto.startDate,
      dto.endDate,
      userId,
    ]);

    return res.rows[0];
  }

  async findAll(query: QuerySprintDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['s.is_active = TRUE'];
    const params: any[] = [];
    let paramIndex = 1;

    if (query.projectId) {
      conditions.push(`s.project_id = $${paramIndex}`);
      params.push(query.projectId);
      paramIndex++;
    }

    if (query.productId) {
      conditions.push(`s.product_id = $${paramIndex}`);
      params.push(query.productId);
      paramIndex++;
    }

    if (query.status) {
      conditions.push(`s.status = $${paramIndex}`);
      params.push(query.status);
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countRes = await this.db.query(
      `SELECT COUNT(*)::int AS total FROM sprints s ${whereClause};`,
      params,
    );
    const total = countRes.rows[0]?.total || 0;

    const sql = `
      SELECT 
        s.*,
        p.project_name,
        p.project_code,
        pr.product_name,
        pr.product_code,
        COUNT(DISTINCT t.id)::int AS current_tasks_count,
        COALESCE(SUM(t.story_points), 0)::numeric(8, 1) AS current_story_points,
        COALESCE(SUM(t.estimated_hours), 0)::numeric(8, 2) AS current_estimated_hours
      FROM sprints s
      LEFT JOIN projects p ON s.project_id = p.id
      LEFT JOIN products pr ON s.product_id = pr.id
      LEFT JOIN tasks t ON t.sprint_id = s.id
      ${whereClause}
      GROUP BY s.id, p.project_name, p.project_code, pr.product_name, pr.product_code
      ORDER BY s.start_date DESC
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
    const sprintRes = await this.db.query(
      `
      SELECT 
        s.*,
        p.project_name,
        p.project_code,
        pr.product_name,
        pr.product_code
      FROM sprints s
      LEFT JOIN projects p ON s.project_id = p.id
      LEFT JOIN products pr ON s.product_id = pr.id
      WHERE s.id = $1;
      `,
      [id],
    );

    if (sprintRes.rowCount === 0) {
      throw new NotFoundException(`Sprint with ID '${id}' not found.`);
    }

    // Load tasks in this sprint
    const tasksRes = await this.db.query(
      `
      SELECT 
        t.id,
        t.task_code,
        t.title,
        t.hierarchy_level,
        t.priority,
        t.story_points,
        t.t_shirt_size,
        t.estimated_hours,
        t.backlog_order,
        ts.status_name,
        ts.status_category,
        tt.type_name,
        tt.color_hex,
        u.first_name AS primary_assignee_first_name,
        u.last_name AS primary_assignee_last_name
      FROM tasks t
      JOIN task_statuses ts ON t.status_id = ts.id
      JOIN task_types tt ON t.task_type_id = tt.id
      LEFT JOIN task_assignees ta ON ta.task_id = t.id AND ta.is_primary_assignee = TRUE
      LEFT JOIN users u ON ta.user_id = u.id
      WHERE t.sprint_id = $1
      ORDER BY t.backlog_order ASC, t.created_at ASC;
      `,
      [id],
    );

    return {
      ...sprintRes.rows[0],
      tasks: tasksRes.rows,
    };
  }

  async update(id: string, dto: UpdateSprintDto, userId: string) {
    const existing = await this.db.query(
      `SELECT * FROM sprints WHERE id = $1;`,
      [id],
    );
    if (existing.rowCount === 0) {
      throw new NotFoundException(`Sprint with ID '${id}' not found.`);
    }

    const current = existing.rows[0];
    const sprintName = dto.sprintName !== undefined ? dto.sprintName.trim() : current.sprint_name;
    const sprintGoal = dto.sprintGoal !== undefined ? dto.sprintGoal : current.sprint_goal;
    const startDate = dto.startDate || current.start_date;
    const endDate = dto.endDate || current.end_date;
    const status = dto.status || current.status;

    const query = `
      UPDATE sprints
      SET 
        sprint_name = $1,
        sprint_goal = $2,
        start_date = $3,
        end_date = $4,
        status = $5,
        updated_by = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *;
    `;

    const res = await this.db.query(query, [
      sprintName,
      sprintGoal,
      startDate,
      endDate,
      status,
      userId,
      id,
    ]);

    return res.rows[0];
  }

  /**
   * Start Sprint: Snapshots commitment metrics and initializes the scope ledger (PLAN-001)
   */
  async startSprint(id: string, userId: string) {
    const existing = await this.db.query(
      `SELECT * FROM sprints WHERE id = $1;`,
      [id],
    );
    if (existing.rowCount === 0) {
      throw new NotFoundException(`Sprint with ID '${id}' not found.`);
    }

    const sprint = existing.rows[0];
    if (sprint.status !== 'PLANNING') {
      throw new BadRequestException(`Cannot start sprint in '${sprint.status}' status. Must be in PLANNING.`);
    }

    // Get current committed tasks
    const tasksRes = await this.db.query(
      `
      SELECT id, story_points, estimated_hours
      FROM tasks
      WHERE sprint_id = $1;
      `,
      [id],
    );

    const tasks = tasksRes.rows;
    const committedTasksCount = tasks.length;
    const committedStoryPoints = tasks.reduce(
      (sum, t) => sum + Number(t.story_points || 0),
      0,
    );
    const committedHours = tasks.reduce(
      (sum, t) => sum + Number(t.estimated_hours || 0),
      0,
    );

    // Record initial commitment ledger entries in sprint_tasks
    for (const t of tasks) {
      await this.db.query(
        `
        INSERT INTO sprint_tasks (
          sprint_id,
          task_id,
          is_initial_commitment,
          added_at,
          added_by,
          created_by,
          updated_by
        ) VALUES ($1, $2, TRUE, CURRENT_TIMESTAMP, $3, $3, $3)
        ON CONFLICT (sprint_id, task_id, added_at) DO NOTHING;
        `,
        [id, t.id, userId],
      );
    }

    // Update sprint state
    const updateRes = await this.db.query(
      `
      UPDATE sprints
      SET 
        status = 'ACTIVE',
        committed_tasks_count = $1,
        committed_story_points = $2,
        committed_hours = $3,
        updated_by = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *;
      `,
      [committedTasksCount, committedStoryPoints, committedHours, userId, id],
    );

    return updateRes.rows[0];
  }

  /**
   * Close Sprint: Computes completion statistics and handles rollover of incomplete work (PLAN-001)
   */
  async closeSprint(id: string, dto: CloseSprintDto, userId: string) {
    const existing = await this.db.query(
      `SELECT * FROM sprints WHERE id = $1;`,
      [id],
    );
    if (existing.rowCount === 0) {
      throw new NotFoundException(`Sprint with ID '${id}' not found.`);
    }

    const sprint = existing.rows[0];
    if (sprint.status !== 'ACTIVE') {
      throw new BadRequestException(`Cannot close sprint in '${sprint.status}' status. Only ACTIVE sprints can be closed.`);
    }

    // Get all sprint tasks with their completion status
    const tasksRes = await this.db.query(
      `
      SELECT 
        t.id,
        t.story_points,
        t.estimated_hours,
        ts.is_terminal,
        ts.status_category
      FROM tasks t
      JOIN task_statuses ts ON t.status_id = ts.id
      WHERE t.sprint_id = $1;
      `,
      [id],
    );

    const completedTasks = tasksRes.rows.filter(
      (t) => t.is_terminal || t.status_category === 'DONE',
    );
    const incompleteTasks = tasksRes.rows.filter(
      (t) => !t.is_terminal && t.status_category !== 'DONE',
    );

    const completedTasksCount = completedTasks.length;
    const completedStoryPoints = completedTasks.reduce(
      (sum, t) => sum + Number(t.story_points || 0),
      0,
    );
    const completedHours = completedTasks.reduce(
      (sum, t) => sum + Number(t.estimated_hours || 0),
      0,
    );

    // Handle incomplete tasks rollover
    if (incompleteTasks.length > 0) {
      if (dto.targetSprintId) {
        // Validate target sprint
        const targetRes = await this.db.query(
          `SELECT id FROM sprints WHERE id = $1 AND is_active = TRUE;`,
          [dto.targetSprintId],
        );
        if (targetRes.rowCount === 0) {
          throw new NotFoundException(`Target sprint with ID '${dto.targetSprintId}' not found.`);
        }

        const incompleteTaskIds = incompleteTasks.map((t) => t.id);
        // Move incomplete tasks to target sprint
        await this.db.query(
          `UPDATE tasks SET sprint_id = $1 WHERE id = ANY($2::uuid[]);`,
          [dto.targetSprintId, incompleteTaskIds],
        );

        // Record rollover in scope ledger
        for (const t of incompleteTasks) {
          await this.db.query(
            `
            INSERT INTO sprint_tasks (
              sprint_id,
              task_id,
              is_initial_commitment,
              added_at,
              added_by,
              scope_change_reason,
              rollover_from_sprint_id,
              created_by,
              updated_by
            ) VALUES ($1, $2, FALSE, CURRENT_TIMESTAMP, $3, $4, $5, $3, $3);
            `,
            [
              dto.targetSprintId,
              t.id,
              userId,
              dto.rolloverReason || `Rollover from closed sprint ${sprint.sprint_code}`,
              id,
            ],
          );
        }
      } else {
        // Eject incomplete tasks back to backlog
        const incompleteTaskIds = incompleteTasks.map((t) => t.id);
        await this.db.query(
          `UPDATE tasks SET sprint_id = NULL WHERE id = ANY($1::uuid[]);`,
          [incompleteTaskIds],
        );
      }
    }

    // Mark sprint COMPLETED
    const updateRes = await this.db.query(
      `
      UPDATE sprints
      SET 
        status = 'COMPLETED',
        completed_tasks_count = $1,
        completed_story_points = $2,
        completed_hours = $3,
        completed_at = CURRENT_TIMESTAMP,
        completed_by = $4,
        updated_by = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *;
      `,
      [completedTasksCount, completedStoryPoints, completedHours, userId, id],
    );

    return {
      sprint: updateRes.rows[0],
      completedTasksCount,
      completedStoryPoints,
      completedHours,
      rolledOverTasksCount: incompleteTasks.length,
      targetSprintId: dto.targetSprintId || null,
    };
  }

  /**
   * Add Tasks to Sprint & record scope change ledger
   */
  async addTasks(sprintId: string, dto: AddSprintTasksDto, userId: string) {
    const sprintRes = await this.db.query(
      `SELECT * FROM sprints WHERE id = $1;`,
      [sprintId],
    );
    if (sprintRes.rowCount === 0) {
      throw new NotFoundException(`Sprint with ID '${sprintId}' not found.`);
    }

    const sprint = sprintRes.rows[0];

    // Assign tasks to sprint
    await this.db.query(
      `UPDATE tasks SET sprint_id = $1 WHERE id = ANY($2::uuid[]);`,
      [sprintId, dto.taskIds],
    );

    // If sprint is active, record mid-sprint addition in scope ledger
    if (sprint.status === 'ACTIVE') {
      for (const taskId of dto.taskIds) {
        await this.db.query(
          `
          INSERT INTO sprint_tasks (
            sprint_id,
            task_id,
            is_initial_commitment,
            added_at,
            added_by,
            scope_change_reason,
            created_by,
            updated_by
          ) VALUES ($1, $2, FALSE, CURRENT_TIMESTAMP, $3, $4, $3, $3);
          `,
          [
            sprintId,
            taskId,
            userId,
            dto.scopeChangeReason || 'Mid-sprint scope addition',
          ],
        );
      }
    }

    return { success: true, addedCount: dto.taskIds.length };
  }

  /**
   * Remove Task from Sprint & record scope change ledger
   */
  async removeTask(sprintId: string, taskId: string, dto: RemoveSprintTaskDto, userId: string) {
    const sprintRes = await this.db.query(
      `SELECT * FROM sprints WHERE id = $1;`,
      [sprintId],
    );
    if (sprintRes.rowCount === 0) {
      throw new NotFoundException(`Sprint with ID '${sprintId}' not found.`);
    }

    const sprint = sprintRes.rows[0];

    // Clear sprint assignment from task
    await this.db.query(
      `UPDATE tasks SET sprint_id = NULL WHERE id = $1 AND sprint_id = $2;`,
      [taskId, sprintId],
    );

    // If sprint is active, record scope removal
    if (sprint.status === 'ACTIVE') {
      await this.db.query(
        `
        UPDATE sprint_tasks
        SET 
          removed_at = CURRENT_TIMESTAMP,
          removed_by = $1,
          scope_change_reason = $2,
          updated_by = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE sprint_id = $3 AND task_id = $4 AND removed_at IS NULL;
        `,
        [userId, dto.scopeChangeReason || 'Mid-sprint scope reduction', sprintId, taskId],
      );
    }

    return { success: true, removedTaskId: taskId };
  }

  /**
   * Get Scope Ledger: Historical audit log of sprint commitment, additions, removals, and rollovers
   */
  async getScopeLedger(sprintId: string) {
    const query = `
      SELECT 
        st.*,
        t.task_code,
        t.title AS task_title,
        t.story_points,
        t.estimated_hours,
        u_add.first_name AS added_by_first_name,
        u_add.last_name AS added_by_last_name,
        u_rem.first_name AS removed_by_first_name,
        u_rem.last_name AS removed_by_last_name,
        prev_s.sprint_code AS rollover_from_sprint_code
      FROM sprint_tasks st
      JOIN tasks t ON st.task_id = t.id
      JOIN users u_add ON st.added_by = u_add.id
      LEFT JOIN users u_rem ON st.removed_by = u_rem.id
      LEFT JOIN sprints prev_s ON st.rollover_from_sprint_id = prev_s.id
      WHERE st.sprint_id = $1
      ORDER BY st.added_at ASC;
    `;

    const res = await this.db.query(query, [sprintId]);
    return res.rows;
  }

  /**
   * Calculate Sprint Available Capacity:
   * Uses FND-001 CalendarsService to compute net available delivery hours
   * for each assigned team member over the sprint start_date to end_date.
   */
  async calculateSprintCapacity(sprintId: string) {
    const sprintRes = await this.db.query(
      `SELECT * FROM sprints WHERE id = $1;`,
      [sprintId],
    );
    if (sprintRes.rowCount === 0) {
      throw new NotFoundException(`Sprint with ID '${sprintId}' not found.`);
    }

    const sprint = sprintRes.rows[0];
    const startDateStr = String(sprint.start_date).slice(0, 10);
    const endDateStr = String(sprint.end_date).slice(0, 10);

    // Find team members associated with this sprint's project
    let members: any[] = [];
    if (sprint.project_id) {
      const memRes = await this.db.query(
        `
        SELECT 
          pm.user_id,
          pm.project_role,
          pm.allocation_percentage,
          u.first_name,
          u.last_name,
          u.email
        FROM project_members pm
        JOIN users u ON pm.user_id = u.id
        WHERE pm.project_id = $1 AND pm.is_active = TRUE;
        `,
        [sprint.project_id],
      );
      members = memRes.rows;
    }

    let sprintTotalCapacityHours = 0;
    const memberBreakdowns: any[] = [];

    for (const m of members) {
      const capacity = await this.calendarsService.calculateWorkingCapacity(
        m.user_id,
        startDateStr,
        endDateStr,
      );

      const allocationFactor = Number(m.allocation_percentage || 100) / 100;
      const effectiveMemberHours = capacity.totalExpectedHours * allocationFactor;
      sprintTotalCapacityHours += effectiveMemberHours;

      memberBreakdowns.push({
        userId: m.user_id,
        name: `${m.first_name} ${m.last_name}`,
        projectRole: m.project_role,
        allocationPercentage: m.allocation_percentage,
        totalWorkingDays: capacity.totalWorkingDays,
        rawWorkingHours: capacity.totalExpectedHours,
        holidaysCount: capacity.holidaysCount,
        leaveDaysCount: capacity.leaveDaysCount,
        effectiveDeliveryHours: effectiveMemberHours,
      });
    }

    // Persist total capacity to sprint record
    await this.db.query(
      `UPDATE sprints SET total_capacity_hours = $1 WHERE id = $2;`,
      [sprintTotalCapacityHours, sprintId],
    );

    return {
      sprintId,
      sprintCode: sprint.sprint_code,
      startDate: startDateStr,
      endDate: endDateStr,
      totalCapacityHours: sprintTotalCapacityHours,
      teamMembersCount: members.length,
      members: memberBreakdowns,
    };
  }
}
