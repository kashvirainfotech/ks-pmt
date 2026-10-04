import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateWipLimitDto, WipEnforcementMode } from './dto/create-wip-limit.dto';
import { CreateWipOverrideExceptionDto } from './dto/wip-override.dto';
import { CreateFlowAgingConfigDto } from './dto/create-flow-aging.dto';
import { FlowQueryDto, CheckWipLimitDto, RebuildCfdDto } from './dto/flow-query.dto';

@Injectable()
export class FlowAnalyticsService {
  private readonly logger = new Logger(FlowAnalyticsService.name);

  constructor(private readonly db: DatabaseService) {}

  // ========================================================
  // 1. Work-in-Progress (WIP) Limits & Exceptions
  // ========================================================

  async getWipLimits(filter?: { projectId?: string; teamId?: string; userId?: string; limitType?: string }) {
    let sql = `
      SELECT 
        wl.*,
        p.project_name,
        t.team_name,
        u.full_name AS user_name,
        ts.status_name,
        ts.status_category
      FROM wip_limits wl
      LEFT JOIN projects p ON p.id = wl.project_id
      LEFT JOIN teams t ON t.id = wl.team_id
      LEFT JOIN users u ON u.id = wl.user_id
      LEFT JOIN task_statuses ts ON ts.id = wl.status_id
      WHERE wl.is_active = TRUE
    `;
    const params: any[] = [];

    if (filter?.projectId) {
      params.push(filter.projectId);
      sql += ` AND (wl.project_id = $${params.length} OR wl.project_id IS NULL)`;
    }
    if (filter?.teamId) {
      params.push(filter.teamId);
      sql += ` AND (wl.team_id = $${params.length} OR wl.team_id IS NULL)`;
    }
    if (filter?.userId) {
      params.push(filter.userId);
      sql += ` AND (wl.user_id = $${params.length} OR wl.user_id IS NULL)`;
    }
    if (filter?.limitType) {
      params.push(filter.limitType);
      sql += ` AND wl.limit_type = $${params.length}`;
    }

    sql += ` ORDER BY wl.created_at DESC;`;
    const res = await this.db.query(sql, params);
    return res.rows;
  }

  async createWipLimit(dto: CreateWipLimitDto, userId: string) {
    const limitCode = dto.limit_code || `WIP-${dto.limit_type}-${Date.now().toString(36).toUpperCase()}`;

    const res = await this.db.query(
      `INSERT INTO wip_limits (
        limit_code, name, description, limit_type, project_id, team_id, user_id, status_id,
        max_wip_count, enforcement_mode, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, $11)
      RETURNING *;`,
      [
        limitCode,
        dto.name,
        dto.description || null,
        dto.limit_type,
        dto.project_id || null,
        dto.team_id || null,
        dto.user_id || null,
        dto.status_id || null,
        dto.max_wip_count,
        dto.enforcement_mode || WipEnforcementMode.SOFT_WARNING,
        userId,
      ],
    );
    return res.rows[0];
  }

  async updateWipLimit(id: string, dto: Partial<CreateWipLimitDto>, userId: string) {
    const limit = await this.db.query(`SELECT * FROM wip_limits WHERE id = $1 AND is_active = TRUE;`, [id]);
    if (limit.rowCount === 0) {
      throw new NotFoundException(`WIP Limit not found`);
    }

    const current = limit.rows[0];
    const res = await this.db.query(
      `UPDATE wip_limits SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        max_wip_count = COALESCE($3, max_wip_count),
        enforcement_mode = COALESCE($4, enforcement_mode),
        updated_by = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6 RETURNING *;`,
      [
        dto.name ?? current.name,
        dto.description ?? current.description,
        dto.max_wip_count ?? current.max_wip_count,
        dto.enforcement_mode ?? current.enforcement_mode,
        userId,
        id,
      ],
    );
    return res.rows[0];
  }

  async deleteWipLimit(id: string, userId: string) {
    const res = await this.db.query(
      `UPDATE wip_limits SET is_active = FALSE, updated_by = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 RETURNING id;`,
      [userId, id],
    );
    if (res.rowCount === 0) {
      throw new NotFoundException(`WIP Limit not found`);
    }
    return { success: true, message: 'WIP Limit deleted successfully' };
  }

  async checkWipLimits(dto: CheckWipLimitDto) {
    const breaches: any[] = [];
    let isHardGuardTriggered = false;

    // Check Stage WIP limit
    if (dto.statusId) {
      const stageLimits = await this.db.query(
        `SELECT * FROM wip_limits 
         WHERE limit_type = 'STAGE' AND status_id = $1 AND is_active = TRUE
           AND (project_id = $2 OR project_id IS NULL)
         ORDER BY (project_id IS NOT NULL) DESC;`,
        [dto.statusId, dto.projectId || null],
      );

      if (stageLimits.rowCount > 0) {
        const limit = stageLimits.rows[0];
        // Count distinct active tasks in this status (excluding terminal/cancelled)
        const countRes = await this.db.query(
          `SELECT COUNT(DISTINCT t.id)::int AS current_count
           FROM tasks t
           WHERE t.status_id = $1 AND ($2::uuid IS NULL OR t.project_id = $2);`,
          [dto.statusId, dto.projectId || null],
        );
        const currentCount = countRes.rows[0]?.current_count || 0;

        if (currentCount >= limit.max_wip_count) {
          breaches.push({
            limitId: limit.id,
            limitType: 'STAGE',
            name: limit.name,
            currentCount,
            maxLimit: limit.max_wip_count,
            enforcementMode: limit.enforcement_mode,
            message: `Stage WIP limit reached (${currentCount}/${limit.max_wip_count}).`,
          });
          if (limit.enforcement_mode === 'HARD_GUARD') {
            isHardGuardTriggered = true;
          }
        }
      }
    }

    // Check User WIP limit
    if (dto.userId) {
      const userLimits = await this.db.query(
        `SELECT * FROM wip_limits WHERE limit_type = 'USER' AND user_id = $1 AND is_active = TRUE;`,
        [dto.userId],
      );
      if (userLimits.rowCount > 0) {
        const limit = userLimits.rows[0];
        // Count active tasks assigned as primary assignee
        const countRes = await this.db.query(
          `SELECT COUNT(DISTINCT t.id)::int AS current_count
           FROM tasks t
           JOIN task_assignees ta ON ta.task_id = t.id AND ta.is_primary_assignee = TRUE
           JOIN task_statuses ts ON ts.id = t.status_id
           WHERE ta.user_id = $1 AND ts.is_terminal = FALSE;`,
          [dto.userId],
        );
        const currentCount = countRes.rows[0]?.current_count || 0;

        if (currentCount >= limit.max_wip_count) {
          breaches.push({
            limitId: limit.id,
            limitType: 'USER',
            name: limit.name,
            currentCount,
            maxLimit: limit.max_wip_count,
            enforcementMode: limit.enforcement_mode,
            message: `User assigned WIP limit reached (${currentCount}/${limit.max_wip_count}).`,
          });
          if (limit.enforcement_mode === 'HARD_GUARD') {
            isHardGuardTriggered = true;
          }
        }
      }
    }

    // Check Team WIP limit
    if (dto.teamId) {
      const teamLimits = await this.db.query(
        `SELECT * FROM wip_limits WHERE limit_type = 'TEAM' AND team_id = $1 AND is_active = TRUE;`,
        [dto.teamId],
      );
      if (teamLimits.rowCount > 0) {
        const limit = teamLimits.rows[0];
        const countRes = await this.db.query(
          `SELECT COUNT(DISTINCT t.id)::int AS current_count
           FROM tasks t
           JOIN task_statuses ts ON ts.id = t.status_id
           WHERE t.responsible_team_id = $1 AND ts.is_terminal = FALSE;`,
          [dto.teamId],
        );
        const currentCount = countRes.rows[0]?.current_count || 0;

        if (currentCount >= limit.max_wip_count) {
          breaches.push({
            limitId: limit.id,
            limitType: 'TEAM',
            name: limit.name,
            currentCount,
            maxLimit: limit.max_wip_count,
            enforcementMode: limit.enforcement_mode,
            message: `Team WIP ceiling reached (${currentCount}/${limit.max_wip_count}).`,
          });
          if (limit.enforcement_mode === 'HARD_GUARD') {
            isHardGuardTriggered = true;
          }
        }
      }
    }

    return {
      allowed: !isHardGuardTriggered,
      isBreached: breaches.length > 0,
      hardGuardActive: isHardGuardTriggered,
      breaches,
    };
  }

  async createOverrideException(dto: CreateWipOverrideExceptionDto, userId: string) {
    const exceptionCode = `EXC-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;

    // Get current count for context
    let currentCount = 1;
    let limitValue = 1;
    if (dto.wip_limit_id) {
      const limit = await this.db.query(`SELECT max_wip_count FROM wip_limits WHERE id = $1;`, [dto.wip_limit_id]);
      if (limit.rowCount > 0) {
        limitValue = limit.rows[0].max_wip_count;
        currentCount = limitValue + 1;
      }
    }

    const res = await this.db.query(
      `INSERT INTO wip_override_exceptions (
        exception_code, wip_limit_id, task_id, user_id, team_id, status_id, project_id,
        current_wip_count, limit_value, reason, is_expedited, authorized_by, authorized_at,
        expires_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, $13, $14)
      RETURNING *;`,
      [
        exceptionCode,
        dto.wip_limit_id || null,
        dto.task_id,
        dto.user_id || null,
        dto.team_id || null,
        dto.status_id || null,
        dto.project_id || null,
        currentCount,
        limitValue,
        dto.reason,
        dto.is_expedited !== false,
        userId,
        dto.expires_at || null,
        userId,
      ],
    );
    return res.rows[0];
  }

  async getOverrideExceptions(filter?: { projectId?: string; taskId?: string }) {
    let sql = `
      SELECT 
        woe.*,
        t.task_code,
        t.title AS task_title,
        p.project_name,
        u.full_name AS user_name,
        auth_u.full_name AS authorized_by_name,
        wl.name AS limit_name,
        wl.limit_type
      FROM wip_override_exceptions woe
      JOIN tasks t ON t.id = woe.task_id
      LEFT JOIN projects p ON p.id = woe.project_id
      LEFT JOIN users u ON u.id = woe.user_id
      LEFT JOIN users auth_u ON auth_u.id = woe.authorized_by
      LEFT JOIN wip_limits wl ON wl.id = woe.wip_limit_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (filter?.projectId) {
      params.push(filter.projectId);
      sql += ` AND woe.project_id = $${params.length}`;
    }
    if (filter?.taskId) {
      params.push(filter.taskId);
      sql += ` AND woe.task_id = $${params.length}`;
    }
    sql += ` ORDER BY woe.authorized_at DESC;`;
    const res = await this.db.query(sql, params);
    return res.rows;
  }

  async getCurrentWipBoard(projectId?: string, teamId?: string) {
    // 1. Stage summary: Distinct tasks per status, counting blocked items as an overlay
    const stageSql = `
      SELECT 
        ts.id AS status_id,
        ts.status_code,
        ts.status_name,
        ts.status_category,
        ts.sequence_order,
        COUNT(DISTINCT t.id)::int AS total_tasks,
        COUNT(DISTINCT CASE WHEN t.is_blocked = TRUE THEN t.id END)::int AS blocked_overlay_count,
        COALESCE(wl.max_wip_count, 0)::int AS max_wip_limit,
        wl.enforcement_mode
      FROM task_statuses ts
      LEFT JOIN tasks t ON t.status_id = ts.id 
        AND ($1::uuid IS NULL OR t.project_id = $1)
        AND ($2::uuid IS NULL OR t.responsible_team_id = $2)
      LEFT JOIN wip_limits wl ON wl.status_id = ts.id 
        AND wl.limit_type = 'STAGE' 
        AND wl.is_active = TRUE
        AND ($1::uuid IS NULL OR wl.project_id = $1 OR wl.project_id IS NULL)
      WHERE ts.is_active = TRUE
      GROUP BY ts.id, ts.status_code, ts.status_name, ts.status_category, ts.sequence_order, wl.max_wip_count, wl.enforcement_mode
      ORDER BY ts.sequence_order ASC;
    `;
    const stageRes = await this.db.query(stageSql, [projectId || null, teamId || null]);

    // 2. Assignee Workload & WIP: primary assignees vs collaborators
    const assigneeSql = `
      SELECT 
        u.id AS user_id,
        u.full_name,
        u.email,
        COUNT(DISTINCT CASE WHEN ta.is_primary_assignee = TRUE THEN t.id END)::int AS primary_active_wip,
        COUNT(DISTINCT CASE WHEN ta.is_primary_assignee = FALSE THEN t.id END)::int AS collaborator_active_wip,
        COUNT(DISTINCT CASE WHEN t.is_blocked = TRUE AND ta.is_primary_assignee = TRUE THEN t.id END)::int AS blocked_primary_count,
        COALESCE(wl.max_wip_count, 0)::int AS max_wip_limit,
        wl.enforcement_mode
      FROM users u
      JOIN task_assignees ta ON ta.user_id = u.id
      JOIN tasks t ON t.id = ta.task_id
      JOIN task_statuses ts ON ts.id = t.status_id AND ts.is_terminal = FALSE
      LEFT JOIN wip_limits wl ON wl.user_id = u.id AND wl.limit_type = 'USER' AND wl.is_active = TRUE
      WHERE ($1::uuid IS NULL OR t.project_id = $1)
        AND ($2::uuid IS NULL OR t.responsible_team_id = $2)
      GROUP BY u.id, u.full_name, u.email, wl.max_wip_count, wl.enforcement_mode
      ORDER BY primary_active_wip DESC;
    `;
    const assigneeRes = await this.db.query(assigneeSql, [projectId || null, teamId || null]);

    return {
      stages: stageRes.rows,
      assignees: assigneeRes.rows,
      timestamp: new Date().toISOString(),
    };
  }

  // ========================================================
  // 2. Operational Aging & Queue Tenures
  // ========================================================

  async getOperationalAging(filter: FlowQueryDto) {
    let sql = `
      SELECT 
        t.id AS task_id,
        t.task_code,
        t.title,
        t.priority,
        t.hierarchy_level,
        t.is_blocked,
        t.created_at,
        p.project_name,
        p.id AS project_id,
        tt.type_name,
        ts.status_code,
        ts.status_name,
        ts.status_category,
        u.id AS primary_assignee_id,
        u.full_name AS primary_assignee_name,
        -- Status entry timestamp from latest duration or updated_at
        COALESCE(tsd.started_at, t.updated_at, t.created_at) AS current_status_entered_at,
        -- Primary assignee tenure
        COALESCE(ta.created_at, t.created_at) AS assigned_at,
        -- Blocked age calculation
        COALESCE(
          (SELECT SUM(EXTRACT(EPOCH FROM (COALESCE(tbe.resolved_at, CURRENT_TIMESTAMP) - tbe.started_at))/3600)::numeric(8,1)
           FROM task_blocker_episodes tbe 
           WHERE tbe.task_id = t.id AND tbe.status IN ('ACTIVE', 'RESOLVED')), 0.0
        ) AS total_blocked_hours
      FROM tasks t
      JOIN task_statuses ts ON ts.id = t.status_id
      LEFT JOIN projects p ON p.id = t.project_id
      LEFT JOIN task_types tt ON tt.id = t.task_type_id
      LEFT JOIN task_assignees ta ON ta.task_id = t.id AND ta.is_primary_assignee = TRUE
      LEFT JOIN users u ON u.id = ta.user_id
      LEFT JOIN LATERAL (
        SELECT started_at FROM task_status_durations 
        WHERE task_id = t.id AND is_current = TRUE 
        ORDER BY started_at DESC LIMIT 1
      ) tsd ON TRUE
      WHERE ts.is_terminal = FALSE
    `;
    const params: any[] = [];

    if (filter.projectId) {
      params.push(filter.projectId);
      sql += ` AND t.project_id = $${params.length}`;
    }
    if (filter.teamId) {
      params.push(filter.teamId);
      sql += ` AND t.responsible_team_id = $${params.length}`;
    }
    if (filter.assigneeId) {
      params.push(filter.assigneeId);
      sql += ` AND ta.user_id = $${params.length}`;
    }
    if (filter.statusId) {
      params.push(filter.statusId);
      sql += ` AND t.status_id = $${params.length}`;
    }
    if (filter.priority) {
      params.push(filter.priority);
      sql += ` AND t.priority = $${params.length}`;
    }

    sql += ` ORDER BY t.created_at ASC;`;
    const res = await this.db.query(sql, params);

    // Fetch applicable aging configurations
    const agingConfigs = await this.db.query(
      `SELECT * FROM flow_aging_configurations WHERE is_active = TRUE ORDER BY precedence_rank ASC;`,
    );

    const now = new Date().getTime();
    let countNormal = 0;
    let countWarning = 0;
    let countCritical = 0;

    const items = res.rows.map((row) => {
      const createdAt = new Date(row.created_at).getTime();
      const statusEnteredAt = new Date(row.current_status_entered_at).getTime();
      const assignedAt = new Date(row.assigned_at).getTime();

      const totalItemAgeHours = Math.max(0, Math.round(((now - createdAt) / (1000 * 3600)) * 10) / 10);
      const currentStatusTenureHours = Math.max(0, Math.round(((now - statusEnteredAt) / (1000 * 3600)) * 10) / 10);
      const primaryOwnerTenureHours = Math.max(0, Math.round(((now - assignedAt) / (1000 * 3600)) * 10) / 10);
      const blockedAgeHours = parseFloat(row.total_blocked_hours) || 0;

      // Queue age: if status is in TODO or REVIEW_TEST
      const isQueueStatus = ['TODO', 'REVIEW_TEST'].includes(row.status_category);
      const queueWaitingAgeHours = isQueueStatus ? currentStatusTenureHours : 0;

      // Find matching config rule
      let warnThresh = 48.0;
      let critThresh = 96.0;
      for (const cfg of agingConfigs.rows) {
        const matchesProject = !cfg.project_id || cfg.project_id === row.project_id;
        const matchesPriority = !cfg.priority || cfg.priority === row.priority;
        const matchesStatus = !cfg.status_id || cfg.status_id === row.status_id;
        if (matchesProject && matchesPriority && matchesStatus) {
          warnThresh = parseFloat(cfg.warning_threshold_hours);
          critThresh = parseFloat(cfg.critical_threshold_hours);
          break;
        }
      }

      let agingSeverity: 'NORMAL' | 'WARNING' | 'CRITICAL' = 'NORMAL';
      if (currentStatusTenureHours >= critThresh) {
        agingSeverity = 'CRITICAL';
        countCritical++;
      } else if (currentStatusTenureHours >= warnThresh) {
        agingSeverity = 'WARNING';
        countWarning++;
      } else {
        countNormal++;
      }

      return {
        taskId: row.task_id,
        taskCode: row.task_code,
        title: row.title,
        priority: row.priority,
        statusName: row.status_name,
        statusCategory: row.status_category,
        projectName: row.project_name,
        primaryAssignee: row.primary_assignee_name || 'Unassigned',
        isBlocked: row.is_blocked,
        totalItemAgeHours,
        currentStatusTenureHours,
        primaryOwnerTenureHours,
        blockedAgeHours,
        queueWaitingAgeHours,
        warningThresholdHours: warnThresh,
        criticalThresholdHours: critThresh,
        agingSeverity,
      };
    });

    return {
      summary: {
        totalActiveTasks: items.length,
        normalCount: countNormal,
        warningCount: countWarning,
        criticalCount: countCritical,
        averageTenureHours: items.length > 0
          ? Math.round((items.reduce((acc, curr) => acc + curr.currentStatusTenureHours, 0) / items.length) * 10) / 10
          : 0,
      },
      items,
      notice: 'Operational aging is a process flow diagnostic signal and is strictly not an individual performance ranking.',
    };
  }

  // ========================================================
  // 3. Active vs. Waiting Flow Time Partitioning
  // ========================================================

  async getFlowTimePartition(filter: FlowQueryDto) {
    let sql = `
      SELECT 
        tsd.flow_interval_type,
        tsd.waiting_reason,
        SUM(tsd.elapsed_duration_minutes)::bigint AS total_elapsed_minutes,
        SUM(tsd.business_duration_minutes)::bigint AS total_business_minutes,
        COUNT(*)::int AS interval_count
      FROM task_status_durations tsd
      JOIN tasks t ON t.id = tsd.task_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filter.projectId) {
      params.push(filter.projectId);
      sql += ` AND t.project_id = $${params.length}`;
    }
    if (filter.teamId) {
      params.push(filter.teamId);
      sql += ` AND t.responsible_team_id = $${params.length}`;
    }
    if (filter.startDate) {
      params.push(filter.startDate);
      sql += ` AND tsd.started_at >= $${params.length}`;
    }
    if (filter.endDate) {
      params.push(filter.endDate);
      sql += ` AND tsd.started_at <= $${params.length}`;
    }

    sql += ` GROUP BY tsd.flow_interval_type, tsd.waiting_reason ORDER BY total_elapsed_minutes DESC;`;
    const res = await this.db.query(sql, params);

    let activeMinutes = 0;
    let waitingMinutes = 0;
    let unclassifiedMinutes = 0;
    const waitingBreakdown: Record<string, { elapsedMinutes: number; businessMinutes: number; count: number }> = {
      CUSTOMER: { elapsedMinutes: 0, businessMinutes: 0, count: 0 },
      DEPENDENCY: { elapsedMinutes: 0, businessMinutes: 0, count: 0 },
      APPROVAL: { elapsedMinutes: 0, businessMinutes: 0, count: 0 },
      REVIEW_QA_QUEUE: { elapsedMinutes: 0, businessMinutes: 0, count: 0 },
      ENVIRONMENT: { elapsedMinutes: 0, businessMinutes: 0, count: 0 },
      VENDOR: { elapsedMinutes: 0, businessMinutes: 0, count: 0 },
      TEAM_AVAILABILITY: { elapsedMinutes: 0, businessMinutes: 0, count: 0 },
      OTHER: { elapsedMinutes: 0, businessMinutes: 0, count: 0 },
    };

    for (const row of res.rows) {
      const elapsed = parseInt(row.total_elapsed_minutes) || 0;
      const business = parseInt(row.total_business_minutes) || 0;
      const count = parseInt(row.interval_count) || 0;

      if (row.flow_interval_type === 'ACTIVE') {
        activeMinutes += elapsed;
      } else if (row.flow_interval_type === 'WAITING') {
        waitingMinutes += elapsed;
        const reason = row.waiting_reason || 'OTHER';
        if (!waitingBreakdown[reason]) {
          waitingBreakdown[reason] = { elapsedMinutes: 0, businessMinutes: 0, count: 0 };
        }
        waitingBreakdown[reason].elapsedMinutes += elapsed;
        waitingBreakdown[reason].businessMinutes += business;
        waitingBreakdown[reason].count += count;
      } else {
        unclassifiedMinutes += elapsed;
      }
    }

    const totalCycleTimeMinutes = activeMinutes + waitingMinutes + unclassifiedMinutes;
    const flowEfficiencyPercent = totalCycleTimeMinutes > 0
      ? Math.round((activeMinutes / totalCycleTimeMinutes) * 1000) / 10
      : 0;

    return {
      partitionValidation: {
        activeMinutes,
        waitingMinutes,
        unclassifiedMinutes,
        totalCycleTimeMinutes,
        isPartitionExact: (activeMinutes + waitingMinutes + unclassifiedMinutes) === totalCycleTimeMinutes,
      },
      durationsHours: {
        activeHours: Math.round((activeMinutes / 60) * 10) / 10,
        waitingHours: Math.round((waitingMinutes / 60) * 10) / 10,
        unclassifiedHours: Math.round((unclassifiedMinutes / 60) * 10) / 10,
        totalCycleTimeHours: Math.round((totalCycleTimeMinutes / 60) * 10) / 10,
      },
      flowEfficiencyPercent,
      waitingBreakdown,
      standardNotice: 'Flow duration measures process lead and waiting intervals. It is strictly independent from employee logged timesheet hours (worklogs).',
    };
  }

  // ========================================================
  // 4. Lead Time & Cycle Time Distributions
  // ========================================================

  async getCycleTimeMetrics(filter: FlowQueryDto) {
    let sql = `
      SELECT 
        t.id,
        t.task_code,
        t.title,
        t.created_at,
        t.actual_start_date,
        t.actual_end_date,
        t.resolved_at,
        t.story_points,
        ts.status_category,
        ts.is_terminal,
        -- Check if task experienced rework or reopening
        EXISTS(
          SELECT 1 FROM task_status_durations tsd 
          WHERE tsd.task_id = t.id AND tsd.is_rework = TRUE
        ) AS has_rework
      FROM tasks t
      JOIN task_statuses ts ON ts.id = t.status_id
      WHERE ts.is_terminal = TRUE
    `;
    const params: any[] = [];

    if (filter.projectId) {
      params.push(filter.projectId);
      sql += ` AND t.project_id = $${params.length}`;
    }
    if (filter.teamId) {
      params.push(filter.teamId);
      sql += ` AND t.responsible_team_id = $${params.length}`;
    }
    if (filter.startDate) {
      params.push(filter.startDate);
      sql += ` AND t.created_at >= $${params.length}`;
    }
    if (filter.endDate) {
      params.push(filter.endDate);
      sql += ` AND t.created_at <= $${params.length}`;
    }

    const res = await this.db.query(sql, params);

    const completedTasks: any[] = [];
    const cancelledTasks: any[] = [];

    for (const row of res.rows) {
      if (row.status_category === 'CANCELLED') {
        cancelledTasks.push(row);
        continue;
      }

      const created = new Date(row.created_at).getTime();
      const finished = new Date(row.resolved_at || row.actual_end_date || row.created_at).getTime();
      const started = new Date(row.actual_start_date || row.created_at).getTime();

      const leadTimeHours = Math.max(0, Math.round(((finished - created) / (1000 * 3600)) * 10) / 10);
      const cycleTimeHours = Math.max(0, Math.round(((finished - started) / (1000 * 3600)) * 10) / 10);

      completedTasks.push({
        taskId: row.id,
        taskCode: row.task_code,
        title: row.title,
        leadTimeHours,
        cycleTimeHours,
        storyPoints: parseFloat(row.story_points) || 0,
        hasRework: row.has_rework,
      });
    }

    const cycleTimes = completedTasks.map((t) => t.cycleTimeHours).sort((a, b) => a - b);
    const leadTimes = completedTasks.map((t) => t.leadTimeHours).sort((a, b) => a - b);

    const calcPercentile = (arr: number[], p: number) => {
      if (arr.length === 0) return 0;
      const index = Math.ceil((p / 100) * arr.length) - 1;
      return arr[Math.max(0, Math.min(index, arr.length - 1))];
    };

    const reworkCount = completedTasks.filter((t) => t.hasRework).length;

    return {
      sampleSize: completedTasks.length,
      cancelledCount: cancelledTasks.length,
      leadTime: {
        min: leadTimes[0] || 0,
        max: leadTimes[leadTimes.length - 1] || 0,
        avg: leadTimes.length > 0 ? Math.round((leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length) * 10) / 10 : 0,
        p50: calcPercentile(leadTimes, 50),
        p85: calcPercentile(leadTimes, 85),
        p95: calcPercentile(leadTimes, 95),
      },
      cycleTime: {
        min: cycleTimes[0] || 0,
        max: cycleTimes[cycleTimes.length - 1] || 0,
        avg: cycleTimes.length > 0 ? Math.round((cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length) * 10) / 10 : 0,
        p50: calcPercentile(cycleTimes, 50),
        p85: calcPercentile(cycleTimes, 85),
        p95: calcPercentile(cycleTimes, 95),
      },
      qualityMetrics: {
        firstTimeRightCount: completedTasks.length - reworkCount,
        reworkCount,
        firstTimeRightRatePercent: completedTasks.length > 0
          ? Math.round(((completedTasks.length - reworkCount) / completedTasks.length) * 1000) / 10
          : 100,
      },
      scatterPoints: completedTasks.slice(0, 50),
      disclosure: 'Cancelled tasks are excluded from completed cycle time calculations to prevent throughput inflation.',
    };
  }

  // ========================================================
  // 5. Cumulative Flow Diagrams (CFD) & Dwell Time Heatmap
  // ========================================================

  async getCumulativeFlowData(projectId?: string, sprintId?: string, startDate?: string, endDate?: string) {
    let sql = `
      SELECT 
        snapshot_date,
        status_category,
        SUM(task_count)::int AS task_count,
        SUM(story_points)::numeric(8,2) AS total_points
      FROM daily_cumulative_flow_snapshots
      WHERE 1=1
    `;
    const params: any[] = [];
    if (projectId) {
      params.push(projectId);
      sql += ` AND project_id = $${params.length}`;
    }
    if (sprintId) {
      params.push(sprintId);
      sql += ` AND sprint_id = $${params.length}`;
    }
    if (startDate) {
      params.push(startDate);
      sql += ` AND snapshot_date >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      sql += ` AND snapshot_date <= $${params.length}`;
    }

    sql += ` GROUP BY snapshot_date, status_category ORDER BY snapshot_date ASC;`;
    const res = await this.db.query(sql, params);

    // Group by snapshot_date
    const dateMap = new Map<string, any>();
    for (const row of res.rows) {
      const d = row.snapshot_date.toISOString().split('T')[0];
      if (!dateMap.has(d)) {
        dateMap.set(d, {
          date: d,
          TODO: 0,
          IN_PROGRESS: 0,
          REVIEW_TEST: 0,
          DONE: 0,
          CANCELLED: 0,
        });
      }
      const entry = dateMap.get(d);
      if (entry[row.status_category] !== undefined) {
        entry[row.status_category] = row.task_count;
      }
    }

    return Array.from(dateMap.values());
  }

  async rebuildCfdSnapshots(dto: RebuildCfdDto, userId: string) {
    // Delete existing rebuilt snapshots for this scope
    let deleteSql = `DELETE FROM daily_cumulative_flow_snapshots WHERE 1=1`;
    const params: any[] = [];
    if (dto.projectId) {
      params.push(dto.projectId);
      deleteSql += ` AND project_id = $${params.length}`;
    }
    if (dto.sprintId) {
      params.push(dto.sprintId);
      deleteSql += ` AND sprint_id = $${params.length}`;
    }
    await this.db.query(deleteSql, params);

    // Calculate current breakdown by status_category
    const breakdownRes = await this.db.query(
      `SELECT 
        ts.status_category,
        COUNT(t.id)::int AS task_count,
        COALESCE(SUM(t.story_points), 0)::numeric(8,2) AS total_points
       FROM tasks t
       JOIN task_statuses ts ON ts.id = t.status_id
       WHERE ($1::uuid IS NULL OR t.project_id = $1)
         AND ($2::uuid IS NULL OR t.sprint_id = $2)
       GROUP BY ts.status_category;`,
      [dto.projectId || null, dto.sprintId || null],
    );

    const today = new Date().toISOString().split('T')[0];
    for (const row of breakdownRes.rows) {
      await this.db.query(
        `INSERT INTO daily_cumulative_flow_snapshots (
          project_id, sprint_id, snapshot_date, status_category, task_count, story_points, is_rebuilt, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7);`,
        [dto.projectId || null, dto.sprintId || null, today, row.status_category, row.task_count, row.total_points, userId],
      );
    }

    return {
      success: true,
      message: 'CFD Snapshots rebuilt successfully from canonical source events.',
      rebuiltCount: breakdownRes.rowCount,
    };
  }

  async getDwellTimeHeatmap(projectId?: string, sprintId?: string) {
    let sql = `
      SELECT 
        ts.id AS status_id,
        ts.status_code,
        ts.status_name,
        ts.status_category,
        ts.sequence_order,
        COUNT(tsd.id)::int AS sample_size,
        COALESCE(AVG(tsd.elapsed_duration_minutes), 0)::numeric(8,1) AS avg_elapsed_minutes,
        COALESCE(AVG(tsd.business_duration_minutes), 0)::numeric(8,1) AS avg_business_minutes,
        COALESCE(MAX(tsd.elapsed_duration_minutes), 0)::int AS max_elapsed_minutes
      FROM task_statuses ts
      LEFT JOIN task_status_durations tsd ON tsd.status_id = ts.id
      LEFT JOIN tasks t ON t.id = tsd.task_id
      WHERE ts.is_active = TRUE
        AND ($1::uuid IS NULL OR t.project_id = $1)
        AND ($2::uuid IS NULL OR t.sprint_id = $2)
      GROUP BY ts.id, ts.status_code, ts.status_name, ts.status_category, ts.sequence_order
      ORDER BY ts.sequence_order ASC;
    `;
    const res = await this.db.query(sql, [projectId || null, sprintId || null]);

    const stages = res.rows.map((r) => {
      const avgHours = Math.round((parseFloat(r.avg_elapsed_minutes) / 60) * 10) / 10;
      const businessAvgHours = Math.round((parseFloat(r.avg_business_minutes) / 60) * 10) / 10;
      const maxHours = Math.round((parseInt(r.max_elapsed_minutes) / 60) * 10) / 10;
      return {
        statusId: r.status_id,
        statusCode: r.status_code,
        statusName: r.status_name,
        statusCategory: r.status_category,
        sampleSize: r.sample_size,
        avgDwellHours: avgHours,
        avgBusinessDwellHours: businessAvgHours,
        maxDwellHours: maxHours,
        isBottleneck: avgHours >= 48.0, // Stage bottleneck if average dwell time >= 48h
      };
    });

    return {
      stages,
      timestamp: new Date().toISOString(),
    };
  }

  // ========================================================
  // 6. Flow Aging Configuration CRUD
  // ========================================================

  async getFlowAgingConfigs(projectId?: string) {
    let sql = `
      SELECT fac.*, p.project_name, t.team_name, tt.type_name, ts.status_name
      FROM flow_aging_configurations fac
      LEFT JOIN projects p ON p.id = fac.project_id
      LEFT JOIN teams t ON t.id = fac.team_id
      LEFT JOIN task_types tt ON tt.id = fac.task_type_id
      LEFT JOIN task_statuses ts ON ts.id = fac.status_id
      WHERE fac.is_active = TRUE
    `;
    const params: any[] = [];
    if (projectId) {
      params.push(projectId);
      sql += ` AND (fac.project_id = $${params.length} OR fac.project_id IS NULL)`;
    }
    sql += ` ORDER BY fac.precedence_rank ASC, fac.created_at DESC;`;
    const res = await this.db.query(sql, params);
    return res.rows;
  }

  async createFlowAgingConfig(dto: CreateFlowAgingConfigDto, userId: string) {
    const configCode = dto.config_code || `AGING-${Date.now().toString(36).toUpperCase()}`;

    const res = await this.db.query(
      `INSERT INTO flow_aging_configurations (
        config_code, name, description, project_id, team_id, task_type_id, priority, status_id,
        warning_threshold_hours, critical_threshold_hours, time_basis, calendar_id, precedence_rank,
        is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, TRUE, $14)
      RETURNING *;`,
      [
        configCode,
        dto.name,
        dto.description || null,
        dto.project_id || null,
        dto.team_id || null,
        dto.task_type_id || null,
        dto.priority || null,
        dto.status_id || null,
        dto.warning_threshold_hours,
        dto.critical_threshold_hours,
        dto.time_basis,
        dto.calendar_id || null,
        dto.precedence_rank || 100,
        userId,
      ],
    );
    return res.rows[0];
  }
}
