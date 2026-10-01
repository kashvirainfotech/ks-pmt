import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  CreateProjectTemplateDto,
  UpdateProjectTemplateDto,
} from './dto/create-project-template.dto';
import {
  CreateTaskTemplateDto,
  UpdateTaskTemplateDto,
} from './dto/create-task-template.dto';
import {
  CreateRecurrenceRuleDto,
  RecurrenceFrequency,
  UpdateRecurrenceRuleDto,
} from './dto/create-recurrence-rule.dto';
import {
  InstantiateProjectTemplateDto,
  InstantiateTaskTemplateDto,
} from './dto/instantiate-template.dto';
import {
  QueryProjectTemplatesDto,
  QueryRecurrenceRulesDto,
  QueryTaskTemplatesDto,
} from './dto/query-templates.dto';

@Injectable()
export class TemplatesService {
  constructor(private readonly db: DatabaseService) {}

  // ========================================================
  // Helpers
  // ========================================================

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private computeNextRunDate(
    currentDateStr: string,
    frequency: RecurrenceFrequency,
    intervalCount = 1,
  ): string {
    const baseDate = new Date(currentDateStr);
    const count = intervalCount > 0 ? intervalCount : 1;

    switch (frequency) {
      case RecurrenceFrequency.DAILY:
        baseDate.setDate(baseDate.getDate() + count);
        break;
      case RecurrenceFrequency.WEEKLY:
        baseDate.setDate(baseDate.getDate() + 7 * count);
        break;
      case RecurrenceFrequency.BIWEEKLY:
        baseDate.setDate(baseDate.getDate() + 14 * count);
        break;
      case RecurrenceFrequency.MONTHLY:
        baseDate.setMonth(baseDate.getMonth() + count);
        break;
      case RecurrenceFrequency.QUARTERLY:
        baseDate.setMonth(baseDate.getMonth() + 3 * count);
        break;
      case RecurrenceFrequency.ANNUALLY:
        baseDate.setFullYear(baseDate.getFullYear() + count);
        break;
      default:
        baseDate.setDate(baseDate.getDate() + 7);
    }
    return this.formatDate(baseDate);
  }

  private async getDefaultTaskStatusId(): Promise<string> {
    const res = await this.db.query(
      `SELECT id FROM task_statuses WHERE status_code = 'OPEN' OR status_category = 'TODO' ORDER BY sequence_order ASC LIMIT 1`,
    );
    if (!res.rows.length) {
      const fallback = await this.db.query(`SELECT id FROM task_statuses LIMIT 1`);
      return fallback.rows[0]?.id;
    }
    return res.rows[0].id;
  }

  private async getDefaultTaskTypeId(): Promise<string> {
    const res = await this.db.query(
      `SELECT id FROM task_types WHERE type_code = 'TASK' LIMIT 1`,
    );
    if (!res.rows.length) {
      const fallback = await this.db.query(`SELECT id FROM task_types LIMIT 1`);
      return fallback.rows[0]?.id;
    }
    return res.rows[0].id;
  }

  // ========================================================
  // 1. Project Templates Master
  // ========================================================

  async createProjectTemplate(dto: CreateProjectTemplateDto, userId: string) {
    const templateCode =
      dto.templateCode ||
      `TPL-PRJ-${Date.now().toString().slice(-6)}`;

    const res = await this.db.query(
      `INSERT INTO project_templates (
        template_code, template_name, description, category,
        target_engagement_model, default_estimated_duration_days,
        milestone_templates, is_active, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
      RETURNING *`,
      [
        templateCode,
        dto.templateName,
        dto.description || null,
        dto.category || 'CUSTOM',
        dto.targetEngagementModel || 'TIME_AND_MATERIALS',
        dto.defaultEstimatedDurationDays || 30,
        JSON.stringify(dto.milestoneTemplates || []),
        dto.isActive ?? true,
        userId,
      ],
    );
    return res.rows[0];
  }

  async getProjectTemplates(query: QueryProjectTemplatesDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    if (query.search) {
      conditions.push(
        `(pt.template_name ILIKE $${pIdx} OR pt.template_code ILIKE $${pIdx} OR pt.description ILIKE $${pIdx})`,
      );
      params.push(`%${query.search}%`);
      pIdx++;
    }

    if (query.category) {
      conditions.push(`pt.category = $${pIdx}`);
      params.push(query.category);
      pIdx++;
    }

    if (query.isActive !== undefined) {
      conditions.push(`pt.is_active = $${pIdx}`);
      params.push(query.isActive);
      pIdx++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await this.db.query(
      `SELECT COUNT(*)::int as total FROM project_templates pt ${whereClause}`,
      params,
    );
    const totalCount = countRes.rows[0]?.total || 0;

    const listQuery = `
      SELECT pt.*,
        (SELECT COUNT(*)::int FROM task_templates tt WHERE tt.project_template_id = pt.id) as task_templates_count
      FROM project_templates pt
      ${whereClause}
      ORDER BY pt.created_at DESC
      LIMIT $${pIdx} OFFSET $${pIdx + 1}
    `;
    params.push(limit, offset);

    const listRes = await this.db.query(listQuery, params);

    return {
      data: listRes.rows,
      meta: {
        page,
        limit,
        total_count: totalCount,
        total_pages: Math.ceil(totalCount / limit) || 1,
      },
    };
  }

  async getProjectTemplateById(id: string) {
    const res = await this.db.query(
      `SELECT * FROM project_templates WHERE id = $1`,
      [id],
    );
    if (!res.rows.length) {
      throw new NotFoundException(`Project template with id ${id} not found.`);
    }
    const template = res.rows[0];

    const tasksRes = await this.db.query(
      `SELECT * FROM task_templates WHERE project_template_id = $1 ORDER BY display_order ASC, created_at ASC`,
      [id],
    );
    template.task_templates = tasksRes.rows;

    return template;
  }

  async updateProjectTemplate(
    id: string,
    dto: UpdateProjectTemplateDto,
    userId: string,
  ) {
    await this.getProjectTemplateById(id);

    const updates: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    if (dto.templateName !== undefined) {
      updates.push(`template_name = $${pIdx}`);
      params.push(dto.templateName);
      pIdx++;
    }
    if (dto.description !== undefined) {
      updates.push(`description = $${pIdx}`);
      params.push(dto.description);
      pIdx++;
    }
    if (dto.category !== undefined) {
      updates.push(`category = $${pIdx}`);
      params.push(dto.category);
      pIdx++;
    }
    if (dto.targetEngagementModel !== undefined) {
      updates.push(`target_engagement_model = $${pIdx}`);
      params.push(dto.targetEngagementModel);
      pIdx++;
    }
    if (dto.defaultEstimatedDurationDays !== undefined) {
      updates.push(`default_estimated_duration_days = $${pIdx}`);
      params.push(dto.defaultEstimatedDurationDays);
      pIdx++;
    }
    if (dto.milestoneTemplates !== undefined) {
      updates.push(`milestone_templates = $${pIdx}`);
      params.push(JSON.stringify(dto.milestoneTemplates));
      pIdx++;
    }
    if (dto.isActive !== undefined) {
      updates.push(`is_active = $${pIdx}`);
      params.push(dto.isActive);
      pIdx++;
    }

    if (updates.length === 0) {
      return this.getProjectTemplateById(id);
    }

    updates.push(`updated_by = $${pIdx}`);
    params.push(userId);
    pIdx++;

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    params.push(id);
    const sql = `UPDATE project_templates SET ${updates.join(', ')} WHERE id = $${pIdx} RETURNING *`;

    const res = await this.db.query(sql, params);
    return res.rows[0];
  }

  async deleteProjectTemplate(id: string) {
    await this.getProjectTemplateById(id);
    // Soft delete to protect referential integrity
    await this.db.query(
      `UPDATE project_templates SET is_active = FALSE WHERE id = $1`,
      [id],
    );
    return { success: true, message: 'Project template archived successfully.' };
  }

  // ========================================================
  // 2. Task Templates Library
  // ========================================================

  async createTaskTemplate(dto: CreateTaskTemplateDto, userId: string) {
    const taskTemplateCode =
      dto.taskTemplateCode ||
      `TPL-TSK-${Date.now().toString().slice(-6)}`;

    const defaultTypeId = await this.getDefaultTaskTypeId();

    const res = await this.db.query(
      `INSERT INTO task_templates (
        project_template_id, task_template_code, title, description,
        task_type_id, priority, hierarchy_level, parent_task_template_id,
        start_offset_days, duration_days, estimated_hours, default_role_code,
        checklists_template, display_order, is_active, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $16)
      RETURNING *`,
      [
        dto.projectTemplateId || null,
        taskTemplateCode,
        dto.title,
        dto.description || null,
        dto.taskTypeId || defaultTypeId,
        dto.priority || 'MEDIUM',
        dto.hierarchyLevel || 'TASK',
        dto.parentTaskTemplateId || null,
        dto.startOffsetDays ?? 0,
        dto.durationDays ?? 1,
        dto.estimatedHours ?? 0,
        dto.defaultRoleCode || null,
        JSON.stringify(dto.checklistsTemplate || []),
        dto.displayOrder ?? 0,
        dto.isActive ?? true,
        userId,
      ],
    );
    return res.rows[0];
  }

  async getTaskTemplates(query: QueryTaskTemplatesDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    if (query.search) {
      conditions.push(
        `(tt.title ILIKE $${pIdx} OR tt.task_template_code ILIKE $${pIdx} OR tt.description ILIKE $${pIdx})`,
      );
      params.push(`%${query.search}%`);
      pIdx++;
    }

    if (query.projectTemplateId) {
      conditions.push(`tt.project_template_id = $${pIdx}`);
      params.push(query.projectTemplateId);
      pIdx++;
    }

    if (query.isStandaloneOnly) {
      conditions.push(`tt.project_template_id IS NULL`);
    }

    if (query.isActive !== undefined) {
      conditions.push(`tt.is_active = $${pIdx}`);
      params.push(query.isActive);
      pIdx++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await this.db.query(
      `SELECT COUNT(*)::int as total FROM task_templates tt ${whereClause}`,
      params,
    );
    const totalCount = countRes.rows[0]?.total || 0;

    const listQuery = `
      SELECT tt.*, pt.template_name as project_template_name
      FROM task_templates tt
      LEFT JOIN project_templates pt ON tt.project_template_id = pt.id
      ${whereClause}
      ORDER BY tt.display_order ASC, tt.created_at DESC
      LIMIT $${pIdx} OFFSET $${pIdx + 1}
    `;
    params.push(limit, offset);

    const listRes = await this.db.query(listQuery, params);

    return {
      data: listRes.rows,
      meta: {
        page,
        limit,
        total_count: totalCount,
        total_pages: Math.ceil(totalCount / limit) || 1,
      },
    };
  }

  async getTaskTemplateById(id: string) {
    const res = await this.db.query(
      `SELECT tt.*, pt.template_name as project_template_name
       FROM task_templates tt
       LEFT JOIN project_templates pt ON tt.project_template_id = pt.id
       WHERE tt.id = $1`,
      [id],
    );
    if (!res.rows.length) {
      throw new NotFoundException(`Task template with id ${id} not found.`);
    }
    return res.rows[0];
  }

  async updateTaskTemplate(
    id: string,
    dto: UpdateTaskTemplateDto,
    userId: string,
  ) {
    await this.getTaskTemplateById(id);

    const updates: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    if (dto.projectTemplateId !== undefined) {
      updates.push(`project_template_id = $${pIdx}`);
      params.push(dto.projectTemplateId || null);
      pIdx++;
    }
    if (dto.title !== undefined) {
      updates.push(`title = $${pIdx}`);
      params.push(dto.title);
      pIdx++;
    }
    if (dto.description !== undefined) {
      updates.push(`description = $${pIdx}`);
      params.push(dto.description);
      pIdx++;
    }
    if (dto.taskTypeId !== undefined) {
      updates.push(`task_type_id = $${pIdx}`);
      params.push(dto.taskTypeId);
      pIdx++;
    }
    if (dto.priority !== undefined) {
      updates.push(`priority = $${pIdx}`);
      params.push(dto.priority);
      pIdx++;
    }
    if (dto.hierarchyLevel !== undefined) {
      updates.push(`hierarchy_level = $${pIdx}`);
      params.push(dto.hierarchyLevel);
      pIdx++;
    }
    if (dto.parentTaskTemplateId !== undefined) {
      updates.push(`parent_task_template_id = $${pIdx}`);
      params.push(dto.parentTaskTemplateId || null);
      pIdx++;
    }
    if (dto.startOffsetDays !== undefined) {
      updates.push(`start_offset_days = $${pIdx}`);
      params.push(dto.startOffsetDays);
      pIdx++;
    }
    if (dto.durationDays !== undefined) {
      updates.push(`duration_days = $${pIdx}`);
      params.push(dto.durationDays);
      pIdx++;
    }
    if (dto.estimatedHours !== undefined) {
      updates.push(`estimated_hours = $${pIdx}`);
      params.push(dto.estimatedHours);
      pIdx++;
    }
    if (dto.defaultRoleCode !== undefined) {
      updates.push(`default_role_code = $${pIdx}`);
      params.push(dto.defaultRoleCode || null);
      pIdx++;
    }
    if (dto.checklistsTemplate !== undefined) {
      updates.push(`checklists_template = $${pIdx}`);
      params.push(JSON.stringify(dto.checklistsTemplate));
      pIdx++;
    }
    if (dto.displayOrder !== undefined) {
      updates.push(`display_order = $${pIdx}`);
      params.push(dto.displayOrder);
      pIdx++;
    }
    if (dto.isActive !== undefined) {
      updates.push(`is_active = $${pIdx}`);
      params.push(dto.isActive);
      pIdx++;
    }

    if (updates.length === 0) {
      return this.getTaskTemplateById(id);
    }

    updates.push(`updated_by = $${pIdx}`);
    params.push(userId);
    pIdx++;

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    params.push(id);
    const sql = `UPDATE task_templates SET ${updates.join(', ')} WHERE id = $${pIdx} RETURNING *`;

    const res = await this.db.query(sql, params);
    return res.rows[0];
  }

  async deleteTaskTaskTemplate(id: string) {
    await this.getTaskTemplateById(id);
    await this.db.query(
      `UPDATE task_templates SET is_active = FALSE WHERE id = $1`,
      [id],
    );
    return { success: true, message: 'Task template archived successfully.' };
  }

  // ========================================================
  // 3. Template Instantiation Engine (Relative Dates & Zero Leakage)
  // ========================================================

  async instantiateProject(
    projectTemplateId: string,
    dto: InstantiateProjectTemplateDto,
    userId: string,
  ) {
    const template = await this.getProjectTemplateById(projectTemplateId);
    const anchorDate = new Date(dto.anchorStartDate);
    if (isNaN(anchorDate.getTime())) {
      throw new BadRequestException('Invalid anchorStartDate format.');
    }

    // Resolve branch
    let branchId = dto.branchId;
    if (!branchId) {
      const uRes = await this.db.query(
        `SELECT branch_id FROM users WHERE id = $1`,
        [userId],
      );
      branchId = uRes.rows[0]?.branch_id;
      if (!branchId) {
        const bRes = await this.db.query(
          `SELECT id FROM branches WHERE is_head_office = TRUE LIMIT 1`,
        );
        branchId = bRes.rows[0]?.id;
      }
    }

    const pmUserId = dto.projectManagerId || userId;
    const durationDays = template.default_estimated_duration_days || 30;
    const plannedEndDate = this.formatDate(this.addDays(anchorDate, durationDays));
    const plannedStartDate = this.formatDate(anchorDate);

    // 1. Create Project Record
    const projectRes = await this.db.query(
      `INSERT INTO projects (
        project_code, project_name, description, client_id, branch_id,
        project_manager_user_id, billing_type, currency,
        planned_start_date, planned_end_date, project_status,
        is_active, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'INR', $8, $9, 'PLANNING', TRUE, $10, $10)
      RETURNING *`,
      [
        dto.projectCode,
        dto.projectName,
        dto.description || template.description,
        dto.clientId,
        branchId,
        pmUserId,
        template.target_engagement_model || 'TIME_AND_MATERIALS',
        plannedStartDate,
        plannedEndDate,
        userId,
      ],
    );
    const newProject = projectRes.rows[0];

    // 2. Instantiate Milestones
    const milestoneMap = new Map<number, string>();
    const milestoneTemplates = template.milestone_templates || [];
    let milestoneCount = 0;

    for (let i = 0; i < milestoneTemplates.length; i++) {
      const mt = milestoneTemplates[i];
      const offset = Number(mt.target_offset_days ?? (i + 1) * 10);
      const targetDate = this.formatDate(this.addDays(anchorDate, offset));
      const mCode = `${dto.projectCode}-MLS-${i + 1}`;

      const mRes = await this.db.query(
        `INSERT INTO milestones (
          milestone_code, milestone_name, description, entity_type, project_id,
          target_date, status, is_active, created_by, updated_by
        ) VALUES ($1, $2, $3, 'PROJECT', $4, $5, 'PLANNED', TRUE, $6, $6)
        RETURNING id`,
        [mCode, mt.name, mt.description || null, newProject.id, targetDate, userId],
      );
      if (mRes.rows.length) {
        milestoneMap.set(mt.display_order ?? i + 1, mRes.rows[0].id);
        milestoneCount++;
      }
    }

    // 3. Instantiate Task Templates into new Tasks with relative dates
    const defaultStatusId = await this.getDefaultTaskStatusId();
    const defaultTypeId = await this.getDefaultTaskTypeId();
    const taskTemplates = template.task_templates || [];
    let taskCount = 0;

    for (let i = 0; i < taskTemplates.length; i++) {
      const tt = taskTemplates[i];
      const startOffset = Number(tt.start_offset_days ?? 0);
      const duration = Number(tt.duration_days ?? 1);

      const taskPlannedStart = this.formatDate(this.addDays(anchorDate, startOffset));
      const taskPlannedEnd = this.formatDate(
        this.addDays(new Date(taskPlannedStart), duration),
      );

      const taskCode = `${dto.projectCode}-${String(i + 1).padStart(3, '0')}`;

      // Associate with milestone if applicable
      const matchedMilestoneId =
        milestoneMap.get(tt.display_order) || milestoneMap.get(1) || null;

      // Pack checklists template into custom_field_values
      const customFieldValues = {
        template_code: tt.task_template_code,
        checklists: tt.checklists_template || [],
      };

      await this.db.query(
        `INSERT INTO tasks (
          task_code, revision, title, description, hierarchy_level,
          task_type_id, status_id, priority, project_id, milestone_id,
          planned_start_date, planned_end_date, estimated_hours,
          branch_id, custom_field_values, created_by, updated_by
        ) VALUES (
          $1, 1, $2, $3, $4,
          $5, $6, $7, $8, $9,
          $10, $11, $12,
          $13, $14, $15, $15
        )`,
        [
          taskCode,
          tt.title,
          tt.description,
          tt.hierarchy_level || 'TASK',
          tt.task_type_id || defaultTypeId,
          defaultStatusId,
          tt.priority || 'MEDIUM',
          newProject.id,
          matchedMilestoneId,
          taskPlannedStart,
          taskPlannedEnd,
          tt.estimated_hours || 0,
          branchId,
          JSON.stringify(customFieldValues),
          userId,
        ],
      );
      taskCount++;
    }

    return {
      project: newProject,
      milestones_created: milestoneCount,
      tasks_created: taskCount,
    };
  }

  async instantiateTask(
    taskTemplateId: string,
    dto: InstantiateTaskTemplateDto,
    userId: string,
  ) {
    const tt = await this.getTaskTemplateById(taskTemplateId);
    const anchorDate = new Date(dto.anchorStartDate);
    if (isNaN(anchorDate.getTime())) {
      throw new BadRequestException('Invalid anchorStartDate format.');
    }

    if (!dto.projectId && !dto.productId) {
      throw new BadRequestException('Either projectId or productId must be provided.');
    }

    const startOffset = Number(tt.start_offset_days ?? 0);
    const duration = Number(tt.duration_days ?? 1);
    const plannedStart = this.formatDate(this.addDays(anchorDate, startOffset));
    const plannedEnd = this.formatDate(this.addDays(new Date(plannedStart), duration));

    let branchId = dto.branchId;
    if (!branchId) {
      const uRes = await this.db.query(
        `SELECT branch_id FROM users WHERE id = $1`,
        [userId],
      );
      branchId = uRes.rows[0]?.branch_id;
      if (!branchId) {
        const bRes = await this.db.query(
          `SELECT id FROM branches WHERE is_head_office = TRUE LIMIT 1`,
        );
        branchId = bRes.rows[0]?.id;
      }
    }

    const defaultStatusId = await this.getDefaultTaskStatusId();
    const defaultTypeId = await this.getDefaultTaskTypeId();
    const taskCode = `TSK-${Date.now().toString().slice(-6)}`;

    const customFieldValues = {
      template_code: tt.task_template_code,
      checklists: tt.checklists_template || [],
    };

    const taskRes = await this.db.query(
      `INSERT INTO tasks (
        task_code, revision, title, description, hierarchy_level,
        task_type_id, status_id, priority, project_id, product_id,
        milestone_id, sprint_id, responsible_team_id,
        planned_start_date, planned_end_date, estimated_hours,
        branch_id, custom_field_values, created_by, updated_by
      ) VALUES (
        $1, 1, $2, $3, $4,
        $5, $6, $7, $8, $9,
        $10, $11, $12,
        $13, $14, $15,
        $16, $17, $18, $18
      ) RETURNING *`,
      [
        taskCode,
        tt.title,
        tt.description,
        tt.hierarchy_level || 'TASK',
        tt.task_type_id || defaultTypeId,
        defaultStatusId,
        tt.priority || 'MEDIUM',
        dto.projectId || null,
        dto.productId || null,
        dto.milestoneId || null,
        dto.sprintId || null,
        dto.responsibleTeamId || null,
        plannedStart,
        plannedEnd,
        tt.estimated_hours || 0,
        branchId,
        JSON.stringify(customFieldValues),
        userId,
      ],
    );
    const newTask = taskRes.rows[0];

    if (dto.assigneeUserId) {
      await this.db.query(
        `INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
         VALUES ($1, $2, TRUE, $3, $3)
         ON CONFLICT (task_id, user_id) DO NOTHING`,
        [newTask.id, dto.assigneeUserId, userId],
      );
    }

    return newTask;
  }

  // ========================================================
  // 4. Recurring Work Rules & Deduplication Engine
  // ========================================================

  async createRecurrenceRule(dto: CreateRecurrenceRuleDto, userId: string) {
    if (!dto.productId && !dto.projectId) {
      throw new BadRequestException('A recurring rule must be tied to either a productId or a projectId.');
    }
    if (dto.productId && dto.projectId) {
      throw new BadRequestException('A recurring rule cannot have both productId and projectId.');
    }

    const ruleCode =
      dto.ruleCode ||
      `REC-${Date.now().toString().slice(-6)}`;

    const res = await this.db.query(
      `INSERT INTO recurring_work_rules (
        rule_code, title, description, product_id, project_id,
        task_template_id, frequency, interval_count, day_of_month,
        day_of_week, month_of_year, next_run_date, end_date,
        max_occurrences, default_assignee_user_id, default_priority,
        is_active, created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12, $13,
        $14, $15, $16,
        $17, $18, $18
      ) RETURNING *`,
      [
        ruleCode,
        dto.title,
        dto.description || null,
        dto.productId || null,
        dto.projectId || null,
        dto.taskTemplateId || null,
        dto.frequency,
        dto.intervalCount || 1,
        dto.dayOfMonth || null,
        dto.dayOfWeek ?? null,
        dto.monthOfYear || null,
        dto.nextRunDate,
        dto.endDate || null,
        dto.maxOccurrences || null,
        dto.defaultAssigneeUserId || null,
        dto.defaultPriority || 'MEDIUM',
        dto.isActive ?? true,
        userId,
      ],
    );
    return res.rows[0];
  }

  async getRecurrenceRules(query: QueryRecurrenceRulesDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    if (query.search) {
      conditions.push(
        `(r.title ILIKE $${pIdx} OR r.rule_code ILIKE $${pIdx} OR r.description ILIKE $${pIdx})`,
      );
      params.push(`%${query.search}%`);
      pIdx++;
    }

    if (query.productId) {
      conditions.push(`r.product_id = $${pIdx}`);
      params.push(query.productId);
      pIdx++;
    }

    if (query.projectId) {
      conditions.push(`r.project_id = $${pIdx}`);
      params.push(query.projectId);
      pIdx++;
    }

    if (query.isActive !== undefined) {
      conditions.push(`r.is_active = $${pIdx}`);
      params.push(query.isActive);
      pIdx++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await this.db.query(
      `SELECT COUNT(*)::int as total FROM recurring_work_rules r ${whereClause}`,
      params,
    );
    const totalCount = countRes.rows[0]?.total || 0;

    const listQuery = `
      SELECT r.*,
        p.project_name, prod.name as product_name,
        tt.title as task_template_title,
        u.full_name as default_assignee_name,
        (SELECT COUNT(*)::int FROM recurring_task_occurrences o WHERE o.rule_id = r.id) as executed_occurrences_count
      FROM recurring_work_rules r
      LEFT JOIN projects p ON r.project_id = p.id
      LEFT JOIN products prod ON r.product_id = prod.id
      LEFT JOIN task_templates tt ON r.task_template_id = tt.id
      LEFT JOIN users u ON r.default_assignee_user_id = u.id
      ${whereClause}
      ORDER BY r.next_run_date ASC, r.created_at DESC
      LIMIT $${pIdx} OFFSET $${pIdx + 1}
    `;
    params.push(limit, offset);

    const listRes = await this.db.query(listQuery, params);

    return {
      data: listRes.rows,
      meta: {
        page,
        limit,
        total_count: totalCount,
        total_pages: Math.ceil(totalCount / limit) || 1,
      },
    };
  }

  async getRecurrenceRuleById(id: string) {
    const res = await this.db.query(
      `SELECT r.*,
        p.project_name, prod.name as product_name,
        tt.title as task_template_title,
        u.full_name as default_assignee_name
       FROM recurring_work_rules r
       LEFT JOIN projects p ON r.project_id = p.id
       LEFT JOIN products prod ON r.product_id = prod.id
       LEFT JOIN task_templates tt ON r.task_template_id = tt.id
       LEFT JOIN users u ON r.default_assignee_user_id = u.id
       WHERE r.id = $1`,
      [id],
    );
    if (!res.rows.length) {
      throw new NotFoundException(`Recurring work rule with id ${id} not found.`);
    }
    return res.rows[0];
  }

  async updateRecurrenceRule(
    id: string,
    dto: UpdateRecurrenceRuleDto,
    userId: string,
  ) {
    await this.getRecurrenceRuleById(id);

    const updates: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    if (dto.title !== undefined) {
      updates.push(`title = $${pIdx}`);
      params.push(dto.title);
      pIdx++;
    }
    if (dto.description !== undefined) {
      updates.push(`description = $${pIdx}`);
      params.push(dto.description);
      pIdx++;
    }
    if (dto.productId !== undefined) {
      updates.push(`product_id = $${pIdx}`);
      params.push(dto.productId || null);
      pIdx++;
    }
    if (dto.projectId !== undefined) {
      updates.push(`project_id = $${pIdx}`);
      params.push(dto.projectId || null);
      pIdx++;
    }
    if (dto.taskTemplateId !== undefined) {
      updates.push(`task_template_id = $${pIdx}`);
      params.push(dto.taskTemplateId || null);
      pIdx++;
    }
    if (dto.frequency !== undefined) {
      updates.push(`frequency = $${pIdx}`);
      params.push(dto.frequency);
      pIdx++;
    }
    if (dto.intervalCount !== undefined) {
      updates.push(`interval_count = $${pIdx}`);
      params.push(dto.intervalCount);
      pIdx++;
    }
    if (dto.dayOfWeek !== undefined) {
      updates.push(`day_of_week = $${pIdx}`);
      params.push(dto.dayOfWeek ?? null);
      pIdx++;
    }
    if (dto.dayOfMonth !== undefined) {
      updates.push(`day_of_month = $${pIdx}`);
      params.push(dto.dayOfMonth || null);
      pIdx++;
    }
    if (dto.monthOfYear !== undefined) {
      updates.push(`month_of_year = $${pIdx}`);
      params.push(dto.monthOfYear || null);
      pIdx++;
    }
    if (dto.nextRunDate !== undefined) {
      updates.push(`next_run_date = $${pIdx}`);
      params.push(dto.nextRunDate);
      pIdx++;
    }
    if (dto.endDate !== undefined) {
      updates.push(`end_date = $${pIdx}`);
      params.push(dto.endDate || null);
      pIdx++;
    }
    if (dto.maxOccurrences !== undefined) {
      updates.push(`max_occurrences = $${pIdx}`);
      params.push(dto.maxOccurrences || null);
      pIdx++;
    }
    if (dto.defaultAssigneeUserId !== undefined) {
      updates.push(`default_assignee_user_id = $${pIdx}`);
      params.push(dto.defaultAssigneeUserId || null);
      pIdx++;
    }
    if (dto.defaultPriority !== undefined) {
      updates.push(`default_priority = $${pIdx}`);
      params.push(dto.defaultPriority);
      pIdx++;
    }
    if (dto.isActive !== undefined) {
      updates.push(`is_active = $${pIdx}`);
      params.push(dto.isActive);
      pIdx++;
    }

    if (updates.length === 0) {
      return this.getRecurrenceRuleById(id);
    }

    updates.push(`updated_by = $${pIdx}`);
    params.push(userId);
    pIdx++;

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    params.push(id);
    const sql = `UPDATE recurring_work_rules SET ${updates.join(', ')} WHERE id = $${pIdx} RETURNING *`;

    const res = await this.db.query(sql, params);
    return res.rows[0];
  }

  async deleteRecurrenceRule(id: string) {
    await this.getRecurrenceRuleById(id);
    await this.db.query(
      `UPDATE recurring_work_rules SET is_active = FALSE WHERE id = $1`,
      [id],
    );
    return { success: true, message: 'Recurring rule deactivated successfully.' };
  }

  async getRuleOccurrences(ruleId: string) {
    await this.getRecurrenceRuleById(ruleId);
    const res = await this.db.query(
      `SELECT o.*, t.task_code, t.title as task_title, t.priority, s.status_name
       FROM recurring_task_occurrences o
       LEFT JOIN tasks t ON o.generated_task_id = t.id
       LEFT JOIN task_statuses s ON t.status_id = s.id
       WHERE o.rule_id = $1
       ORDER BY o.scheduled_date DESC`,
      [ruleId],
    );
    return res.rows;
  }

  /**
   * Idempotent Recurrence Trigger:
   * Generates a new task instance and logs occurrence with strict deduplication on (rule_id, scheduled_date).
   */
  async triggerRecurrenceRule(
    ruleId: string,
    targetDateOverride?: string,
    userId?: string,
  ) {
    const rule = await this.getRecurrenceRuleById(ruleId);

    const scheduledDate =
      targetDateOverride ||
      (rule.next_run_date ? this.formatDate(new Date(rule.next_run_date)) : this.formatDate(new Date()));

    // 1. Idempotency Check: prevent duplicate execution for the same scheduled date
    const existingOcc = await this.db.query(
      `SELECT * FROM recurring_task_occurrences WHERE rule_id = $1 AND scheduled_date = $2`,
      [ruleId, scheduledDate],
    );
    if (existingOcc.rows.length > 0) {
      throw new ConflictException(
        `Occurrence for rule '${rule.rule_code}' on ${scheduledDate} has already been executed (Task ID: ${existingOcc.rows[0].generated_task_id}). Duplicates are prohibited.`,
      );
    }

    // 2. Max Occurrences & End Date Check
    if (
      rule.max_occurrences &&
      rule.total_occurrences_count >= rule.max_occurrences
    ) {
      throw new BadRequestException(
        `Rule '${rule.rule_code}' has reached its maximum limit of ${rule.max_occurrences} occurrences.`,
      );
    }

    if (rule.end_date && new Date(scheduledDate) > new Date(rule.end_date)) {
      throw new BadRequestException(
        `Scheduled date ${scheduledDate} is past the rule's active end date (${rule.end_date}).`,
      );
    }

    // 3. Resolve template details if linked
    let title = rule.title;
    let description = rule.description;
    let priority = rule.default_priority || 'MEDIUM';
    let durationDays = 1;
    let estimatedHours = 0;
    let customFieldValues: any = { recurrence_rule_code: rule.rule_code };

    if (rule.task_template_id) {
      const ttRes = await this.db.query(
        `SELECT * FROM task_templates WHERE id = $1`,
        [rule.task_template_id],
      );
      if (ttRes.rows.length) {
        const tt = ttRes.rows[0];
        title = `${rule.title} - ${scheduledDate}`;
        description = tt.description || description;
        priority = tt.priority || priority;
        durationDays = Number(tt.duration_days || 1);
        estimatedHours = Number(tt.estimated_hours || 0);
        customFieldValues = {
          recurrence_rule_code: rule.rule_code,
          template_code: tt.task_template_code,
          checklists: tt.checklists_template || [],
        };
      }
    } else {
      title = `${rule.title} - ${scheduledDate}`;
    }

    // Resolve branch and defaults
    const defaultStatusId = await this.getDefaultTaskStatusId();
    const defaultTypeId = await this.getDefaultTaskTypeId();
    const bRes = await this.db.query(
      `SELECT id FROM branches WHERE is_head_office = TRUE LIMIT 1`,
    );
    const branchId = bRes.rows[0]?.id;

    const plannedStartDate = scheduledDate;
    const plannedEndDate = this.formatDate(
      this.addDays(new Date(scheduledDate), durationDays),
    );

    const taskCode = `REC-${Date.now().toString().slice(-6)}`;
    const effectiveUserId = userId || rule.created_by;

    // 4. Generate Task Record
    const taskRes = await this.db.query(
      `INSERT INTO tasks (
        task_code, revision, title, description, hierarchy_level,
        task_type_id, status_id, priority, project_id, product_id,
        planned_start_date, planned_end_date, estimated_hours,
        branch_id, custom_field_values, created_by, updated_by
      ) VALUES (
        $1, 1, $2, $3, 'TASK',
        $4, $5, $6, $7, $8,
        $9, $10, $11,
        $12, $13, $14, $14
      ) RETURNING *`,
      [
        taskCode,
        title,
        description,
        defaultTypeId,
        defaultStatusId,
        priority,
        rule.project_id || null,
        rule.product_id || null,
        plannedStartDate,
        plannedEndDate,
        estimatedHours,
        branchId,
        JSON.stringify(customFieldValues),
        effectiveUserId,
      ],
    );
    const generatedTask = taskRes.rows[0];

    // Assign default user if configured
    if (rule.default_assignee_user_id) {
      await this.db.query(
        `INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
         VALUES ($1, $2, TRUE, $3, $3)
         ON CONFLICT (task_id, user_id) DO NOTHING`,
        [generatedTask.id, rule.default_assignee_user_id, effectiveUserId],
      );
    }

    // 5. Register in recurring_task_occurrences (enforcing uniqueness)
    const occRes = await this.db.query(
      `INSERT INTO recurring_task_occurrences (
        rule_id, scheduled_date, executed_at, generated_task_id, execution_status, created_by
      ) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, 'SUCCESS', $4)
      RETURNING *`,
      [ruleId, scheduledDate, generatedTask.id, effectiveUserId],
    );
    const occurrence = occRes.rows[0];

    // 6. Compute new next_run_date and advance counter
    const newNextRunDate = this.computeNextRunDate(
      scheduledDate,
      rule.frequency as RecurrenceFrequency,
      rule.interval_count,
    );

    await this.db.query(
      `UPDATE recurring_work_rules
       SET next_run_date = $1,
           total_occurrences_count = total_occurrences_count + 1,
           updated_at = CURRENT_TIMESTAMP,
           updated_by = $2
       WHERE id = $3`,
      [newNextRunDate, effectiveUserId, ruleId],
    );

    return {
      occurrence,
      generated_task: generatedTask,
      next_run_date: newNextRunDate,
    };
  }
}
