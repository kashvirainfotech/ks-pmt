import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateSlaPolicyDto } from './dto/create-sla-policy.dto';
import { StartSlaCycleDto } from './dto/start-sla-cycle.dto';
import {
  FirstResponseActionDto,
  ResolutionActionDto,
  PauseCycleDto,
  ExtendDeadlineDto,
  AcknowledgeAlertDto,
  ResolveAlertDto,
} from './dto/sla-action.dto';

export interface SlaPolicyMatchParams {
  clientId?: string;
  projectId?: string;
  taskTypeId?: string;
  priority?: string;
  severity?: string;
}

@Injectable()
export class SlaService {
  private readonly logger = new Logger(SlaService.name);

  constructor(private readonly db: DatabaseService) {}

  // ========================================================
  // 1. SLA Policy Management (Deterministic Precedence)
  // ========================================================

  async createPolicy(dto: CreateSlaPolicyDto, userId: string) {
    const existing = await this.db.query(
      `SELECT id FROM sla_policies WHERE policy_code = $1;`,
      [dto.policyCode],
    );
    if (existing.rowCount > 0) {
      throw new BadRequestException(
        `SLA Policy with code '${dto.policyCode}' already exists.`,
      );
    }

    if (dto.isDefault) {
      await this.db.query(
        `UPDATE sla_policies SET is_default = FALSE WHERE is_default = TRUE;`,
      );
    }

    const query = `
      INSERT INTO sla_policies (
        policy_code,
        policy_name,
        description,
        client_id,
        project_id,
        task_type_id,
        priority,
        severity,
        tier,
        calendar_id,
        response_time_minutes,
        response_time_basis,
        resolution_time_minutes,
        resolution_time_basis,
        response_warning_threshold_pct,
        resolution_warning_threshold_pct,
        escalation_rules,
        precedence_rank,
        is_default,
        is_active,
        created_by,
        updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, TRUE, $20, $20)
      RETURNING *;
    `;

    const res = await this.db.query(query, [
      dto.policyCode.trim().toUpperCase(),
      dto.policyName.trim(),
      dto.description || null,
      dto.clientId || null,
      dto.projectId || null,
      dto.taskTypeId || null,
      dto.priority || null,
      dto.severity || null,
      dto.tier || 'TIER_3_STANDARD',
      dto.calendarId || null,
      dto.responseTimeMinutes,
      dto.responseTimeBasis || 'BUSINESS_HOURS',
      dto.resolutionTimeMinutes,
      dto.resolutionTimeBasis || 'BUSINESS_HOURS',
      dto.responseWarningThresholdPct ?? 75,
      dto.resolutionWarningThresholdPct ?? 75,
      JSON.stringify(dto.escalationRules || []),
      dto.precedenceRank ?? 100,
      dto.isDefault ?? false,
      userId,
    ]);

    return res.rows[0];
  }

  async findAllPolicies(filter?: { clientId?: string; projectId?: string; tier?: string }) {
    let query = `
      SELECT p.*,
             c.company_name AS client_name,
             pr.project_name,
             tt.type_name AS task_type_name,
             cal.calendar_name
      FROM sla_policies p
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN projects pr ON p.project_id = pr.id
      LEFT JOIN task_types tt ON p.task_type_id = tt.id
      LEFT JOIN working_calendars cal ON p.calendar_id = cal.id
      WHERE p.is_active = TRUE
    `;
    const params: any[] = [];

    if (filter?.clientId) {
      params.push(filter.clientId);
      query += ` AND p.client_id = $${params.length}`;
    }
    if (filter?.projectId) {
      params.push(filter.projectId);
      query += ` AND p.project_id = $${params.length}`;
    }
    if (filter?.tier) {
      params.push(filter.tier);
      query += ` AND p.tier = $${params.length}`;
    }

    query += ` ORDER BY p.precedence_rank ASC, p.created_at DESC;`;

    const res = await this.db.query(query, params);
    return res.rows;
  }

  async findPolicyById(id: string) {
    const query = `
      SELECT p.*,
             c.company_name AS client_name,
             pr.project_name,
             tt.type_name AS task_type_name,
             cal.calendar_name
      FROM sla_policies p
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN projects pr ON p.project_id = pr.id
      LEFT JOIN task_types tt ON p.task_type_id = tt.id
      LEFT JOIN working_calendars cal ON p.calendar_id = cal.id
      WHERE p.id = $1 AND p.is_active = TRUE;
    `;
    const res = await this.db.query(query, [id]);
    if (res.rowCount === 0) {
      throw new NotFoundException(`SLA Policy with ID '${id}' not found.`);
    }
    return res.rows[0];
  }

  async updatePolicy(id: string, dto: Partial<CreateSlaPolicyDto>, userId: string) {
    const existing = await this.findPolicyById(id);

    if (dto.isDefault) {
      await this.db.query(
        `UPDATE sla_policies SET is_default = FALSE WHERE is_default = TRUE AND id != $1;`,
        [id],
      );
    }

    const query = `
      UPDATE sla_policies SET
        policy_name = COALESCE($1, policy_name),
        description = COALESCE($2, description),
        client_id = CASE WHEN $3::text IS NOT NULL THEN $3::uuid ELSE client_id END,
        project_id = CASE WHEN $4::text IS NOT NULL THEN $4::uuid ELSE project_id END,
        task_type_id = CASE WHEN $5::text IS NOT NULL THEN $5::uuid ELSE task_type_id END,
        priority = COALESCE($6, priority),
        severity = COALESCE($7, severity),
        tier = COALESCE($8, tier),
        calendar_id = CASE WHEN $9::text IS NOT NULL THEN $9::uuid ELSE calendar_id END,
        response_time_minutes = COALESCE($10, response_time_minutes),
        response_time_basis = COALESCE($11, response_time_basis),
        resolution_time_minutes = COALESCE($12, resolution_time_minutes),
        resolution_time_basis = COALESCE($13, resolution_time_basis),
        response_warning_threshold_pct = COALESCE($14, response_warning_threshold_pct),
        resolution_warning_threshold_pct = COALESCE($15, resolution_warning_threshold_pct),
        escalation_rules = CASE WHEN $16::text IS NOT NULL THEN $16::jsonb ELSE escalation_rules END,
        precedence_rank = COALESCE($17, precedence_rank),
        is_default = COALESCE($18, is_default),
        updated_by = $19,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $20
      RETURNING *;
    `;

    const res = await this.db.query(query, [
      dto.policyName ?? null,
      dto.description ?? null,
      dto.clientId ?? null,
      dto.projectId ?? null,
      dto.taskTypeId ?? null,
      dto.priority ?? null,
      dto.severity ?? null,
      dto.tier ?? null,
      dto.calendarId ?? null,
      dto.responseTimeMinutes ?? null,
      dto.responseTimeBasis ?? null,
      dto.resolutionTimeMinutes ?? null,
      dto.resolutionTimeBasis ?? null,
      dto.responseWarningThresholdPct ?? null,
      dto.resolutionWarningThresholdPct ?? null,
      dto.escalationRules ? JSON.stringify(dto.escalationRules) : null,
      dto.precedenceRank ?? null,
      dto.isDefault ?? null,
      userId,
      id,
    ]);

    return res.rows[0];
  }

  async deletePolicy(id: string, userId: string) {
    const existing = await this.findPolicyById(id);
    await this.db.query(
      `UPDATE sla_policies SET is_active = FALSE, updated_by = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2;`,
      [userId, id],
    );
    return { success: true, message: `SLA Policy ${existing.policy_code} deactivated.` };
  }

  /**
   * Deterministic most-specific policy selection with fallback
   */
  async findApplicablePolicy(params: SlaPolicyMatchParams) {
    const query = `
      SELECT p.*,
             cal.calendar_name,
             cal.timezone,
             cal.standard_hours_per_day,
             cal.working_days_mask,
             (
               (CASE WHEN p.client_id = $1::uuid THEN 100 ELSE 0 END) +
               (CASE WHEN p.project_id = $2::uuid THEN 50 ELSE 0 END) +
               (CASE WHEN p.task_type_id = $3::uuid THEN 25 ELSE 0 END) +
               (CASE WHEN p.priority = $4 THEN 15 ELSE 0 END) +
               (CASE WHEN p.severity = $5 THEN 10 ELSE 0 END)
             ) AS match_score
      FROM sla_policies p
      LEFT JOIN working_calendars cal ON p.calendar_id = cal.id
      WHERE p.is_active = TRUE
        AND (p.client_id IS NULL OR p.client_id = $1::uuid)
        AND (p.project_id IS NULL OR p.project_id = $2::uuid)
        AND (p.task_type_id IS NULL OR p.task_type_id = $3::uuid)
        AND (p.priority IS NULL OR p.priority = $4)
        AND (p.severity IS NULL OR p.severity = $5)
      ORDER BY match_score DESC, p.precedence_rank ASC, p.is_default DESC
      LIMIT 1;
    `;

    const res = await this.db.query(query, [
      params.clientId || null,
      params.projectId || null,
      params.taskTypeId || null,
      params.priority || null,
      params.severity || null,
    ]);

    if (res.rowCount > 0) {
      return res.rows[0];
    }

    // Fallback to global default policy
    const fallbackRes = await this.db.query(
      `SELECT p.*, cal.calendar_name, cal.timezone, cal.standard_hours_per_day, cal.working_days_mask
       FROM sla_policies p
       LEFT JOIN working_calendars cal ON p.calendar_id = cal.id
       WHERE p.is_active = TRUE AND p.is_default = TRUE
       LIMIT 1;`,
    );

    if (fallbackRes.rowCount > 0) {
      return fallbackRes.rows[0];
    }

    // Absolute fallback in memory if none defined
    return {
      id: null,
      policy_code: 'SLA-FALLBACK-SYSTEM',
      policy_name: 'Standard System Fallback SLA',
      response_time_minutes: 240,
      response_time_basis: 'BUSINESS_HOURS',
      resolution_time_minutes: 1440,
      resolution_time_basis: 'BUSINESS_HOURS',
      response_warning_threshold_pct: 75,
      resolution_warning_threshold_pct: 75,
      tier: 'TIER_3_STANDARD',
    };
  }

  // ========================================================
  // 2. SLA Tracking Cycles Lifecycle
  // ========================================================

  /**
   * Calculates deadline given startTime, durationMinutes, basis and calendar
   */
  calculateDeadline(
    startTime: Date,
    durationMinutes: number,
    basis: string,
    calendar?: any,
  ): Date {
    if (basis === 'ELAPSED_HOURS' || !calendar) {
      return new Date(startTime.getTime() + durationMinutes * 60000);
    }

    // BUSINESS_HOURS: Stepping through working hours (default 8h/day e.g. 9:30 to 17:30)
    let current = new Date(startTime.getTime());
    let remainingMinutes = durationMinutes;
    const workingDaysMask = calendar?.working_days_mask || '1111100'; // Mon-Fri
    const dailyHours = Number(calendar?.standard_hours_per_day) || 8;
    const dailyMinutes = dailyHours * 60;

    // Step minute-by-minute or block-by-block
    while (remainingMinutes > 0) {
      // 0 = Sunday, 1 = Monday, etc.
      const dayOfWeek = current.getDay(); // 0 is Sun, 1 is Mon...
      const maskIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const isWorkingDay = workingDaysMask[maskIndex] === '1';

      if (!isWorkingDay) {
        // Advance to next day 09:00
        current.setDate(current.getDate() + 1);
        current.setHours(9, 0, 0, 0);
        continue;
      }

      // Inside working day
      const currentHour = current.getHours() + current.getMinutes() / 60;
      if (currentHour < 9) {
        current.setHours(9, 0, 0, 0);
      } else if (currentHour >= 17) {
        // Advance to next morning
        current.setDate(current.getDate() + 1);
        current.setHours(9, 0, 0, 0);
        continue;
      }

      // Minutes left in current business day
      const minutesLeftToday = Math.max(0, Math.floor((17 - (current.getHours() + current.getMinutes() / 60)) * 60));
      if (remainingMinutes <= minutesLeftToday) {
        current = new Date(current.getTime() + remainingMinutes * 60000);
        remainingMinutes = 0;
      } else {
        remainingMinutes -= minutesLeftToday;
        current.setDate(current.getDate() + 1);
        current.setHours(9, 0, 0, 0);
      }
    }

    return current;
  }

  async startCycle(dto: StartSlaCycleDto, userId: string) {
    if (!dto.taskId && !dto.clientRequestId) {
      throw new BadRequestException('Either taskId or clientRequestId is required to start an SLA cycle.');
    }

    let clientId: string | null = null;
    let projectId: string | null = null;
    let taskTypeId: string | null = null;
    let priority: string | null = null;
    let severity: string | null = null;

    if (dto.taskId) {
      const taskRes = await this.db.query(
        `SELECT t.*, p.client_id FROM tasks t LEFT JOIN projects p ON t.project_id = p.id WHERE t.id = $1;`,
        [dto.taskId],
      );
      if (taskRes.rowCount === 0) {
        throw new NotFoundException(`Task ${dto.taskId} not found.`);
      }
      const task = taskRes.rows[0];
      clientId = task.client_id;
      projectId = task.project_id;
      taskTypeId = task.task_type_id;
      priority = task.priority;
      severity = task.severity;
    } else if (dto.clientRequestId) {
      const reqRes = await this.db.query(
        `SELECT * FROM client_intake_requests WHERE id = $1;`,
        [dto.clientRequestId],
      );
      if (reqRes.rowCount === 0) {
        throw new NotFoundException(`Client intake request ${dto.clientRequestId} not found.`);
      }
      const req = reqRes.rows[0];
      clientId = req.client_id;
      projectId = req.project_id;
      priority = req.internal_priority || req.client_priority;
      severity = req.technical_severity;
    }

    // Select policy
    let policy: any;
    if (dto.policyId) {
      policy = await this.findPolicyById(dto.policyId);
    } else {
      policy = await this.findApplicablePolicy({
        clientId: clientId || undefined,
        projectId: projectId || undefined,
        taskTypeId: taskTypeId || undefined,
        priority: priority || undefined,
        severity: severity || undefined,
      });
    }

    const now = new Date();
    const responseDeadline = this.calculateDeadline(
      now,
      policy.response_time_minutes,
      policy.response_time_basis,
      policy,
    );
    const resolutionDeadline = this.calculateDeadline(
      now,
      policy.resolution_time_minutes,
      policy.resolution_time_basis,
      policy,
    );

    // Generate cycle number
    const countRes = await this.db.query(`SELECT COUNT(*) FROM sla_tracking_cycles;`);
    const seq = parseInt(countRes.rows[0].count, 10) + 1;
    const cycleNumber = `SLA-CYC-${now.getFullYear()}-${seq.toString().padStart(4, '0')}`;

    const policySnapshot = {
      policy_id: policy.id,
      policy_code: policy.policy_code,
      policy_name: policy.policy_name,
      tier: policy.tier,
      response_time_minutes: policy.response_time_minutes,
      response_time_basis: policy.response_time_basis,
      resolution_time_minutes: policy.resolution_time_minutes,
      resolution_time_basis: policy.resolution_time_basis,
      response_warning_threshold_pct: policy.response_warning_threshold_pct,
      resolution_warning_threshold_pct: policy.resolution_warning_threshold_pct,
    };

    const calendarSnapshot = {
      calendar_id: policy.calendar_id,
      calendar_name: policy.calendar_name,
      timezone: policy.timezone || 'Asia/Kolkata',
      standard_hours_per_day: policy.standard_hours_per_day || 8,
      working_days_mask: policy.working_days_mask || '1111100',
    };

    const insertQuery = `
      INSERT INTO sla_tracking_cycles (
        cycle_number,
        task_id,
        client_request_id,
        sla_policy_id,
        cycle_iteration,
        policy_snapshot,
        calendar_snapshot,
        status,
        response_deadline,
        response_status,
        resolution_deadline,
        original_resolution_deadline,
        resolution_status,
        is_paused,
        is_active,
        created_by,
        updated_by
      ) VALUES ($1, $2, $3, $4, 1, $5, $6, 'RUNNING', $7, 'PENDING', $8, $8, 'PENDING', FALSE, TRUE, $9, $9)
      RETURNING *;
    `;

    const res = await this.db.query(insertQuery, [
      cycleNumber,
      dto.taskId || null,
      dto.clientRequestId || null,
      policy.id,
      JSON.stringify(policySnapshot),
      JSON.stringify(calendarSnapshot),
      responseDeadline.toISOString(),
      resolutionDeadline.toISOString(),
      userId,
    ]);

    return res.rows[0];
  }

  async recordFirstResponse(cycleId: string, dto: FirstResponseActionDto, userId: string) {
    if (!dto.isCustomerVisible) {
      throw new BadRequestException(
        'Internal updates and status changes do not satisfy customer first-response SLA. An eligible customer-visible reply is required.',
      );
    }

    const cycleRes = await this.db.query(
      `SELECT * FROM sla_tracking_cycles WHERE id = $1 AND is_active = TRUE;`,
      [cycleId],
    );
    if (cycleRes.rowCount === 0) {
      throw new NotFoundException(`SLA Cycle '${cycleId}' not found.`);
    }

    const cycle = cycleRes.rows[0];
    if (cycle.response_status === 'MET') {
      return cycle; // Already met
    }

    const now = new Date();
    const deadline = new Date(cycle.response_deadline);
    const createdAt = new Date(cycle.created_at);

    const elapsedMinutes = Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / 60000));
    const responseStatus = now <= deadline ? 'MET' : 'BREACHED';

    const updateQuery = `
      UPDATE sla_tracking_cycles SET
        responded_at = $1,
        responded_by_user_id = $2,
        response_status = $3,
        elapsed_response_minutes = $4,
        business_response_minutes = $4,
        status = CASE 
          WHEN status = 'RUNNING' AND $3 = 'MET' THEN 'RESPONSE_MET'
          WHEN status = 'RUNNING' AND $3 = 'BREACHED' THEN 'RESPONSE_BREACHED'
          ELSE status
        END,
        updated_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *;
    `;

    const res = await this.db.query(updateQuery, [
      now.toISOString(),
      userId,
      responseStatus,
      elapsedMinutes,
      cycleId,
    ]);

    // Clear any open response risk alerts
    await this.db.query(
      `UPDATE risk_alerts SET status = 'AUTO_CLEARED', resolved_at = CURRENT_TIMESTAMP, updated_by = $1 WHERE sla_cycle_id = $2 AND alert_type IN ('SLA_RESPONSE_AT_RISK', 'SLA_RESPONSE_BREACHED');`,
      [userId, cycleId],
    );

    return res.rows[0];
  }

  async recordResolution(cycleId: string, dto: ResolutionActionDto, userId: string) {
    const validTerminalCategories = ['RESOLVED', 'CLOSED', 'COMPLETED', 'ACCEPTED'];
    if (!validTerminalCategories.includes(dto.terminalStatusCategory.toUpperCase())) {
      throw new BadRequestException(
        `Terminal status category '${dto.terminalStatusCategory}' is not recognized as a final customer resolution. Permitted: ${validTerminalCategories.join(', ')}`,
      );
    }

    const cycleRes = await this.db.query(
      `SELECT * FROM sla_tracking_cycles WHERE id = $1 AND is_active = TRUE;`,
      [cycleId],
    );
    if (cycleRes.rowCount === 0) {
      throw new NotFoundException(`SLA Cycle '${cycleId}' not found.`);
    }

    const cycle = cycleRes.rows[0];
    const now = new Date();
    const deadline = new Date(cycle.resolution_deadline);
    const createdAt = new Date(cycle.created_at);

    const elapsedMinutes = Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / 60000) - (cycle.total_paused_minutes || 0));
    const resolutionStatus = now <= deadline ? 'MET' : 'BREACHED';
    const cycleStatus = resolutionStatus === 'MET' ? 'RESOLVED_MET' : 'RESOLVED_BREACHED';

    const updateQuery = `
      UPDATE sla_tracking_cycles SET
        resolved_at = $1,
        resolved_by_user_id = $2,
        resolution_status = $3,
        elapsed_resolution_minutes = $4,
        business_resolution_minutes = $4,
        status = $5,
        is_paused = FALSE,
        updated_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *;
    `;

    const res = await this.db.query(updateQuery, [
      now.toISOString(),
      userId,
      resolutionStatus,
      elapsedMinutes,
      cycleStatus,
      cycleId,
    ]);

    // Auto-clear all open risk alerts for this cycle
    await this.db.query(
      `UPDATE risk_alerts SET status = 'AUTO_CLEARED', resolved_at = CURRENT_TIMESTAMP, updated_by = $1 WHERE sla_cycle_id = $2;`,
      [userId, cycleId],
    );

    return res.rows[0];
  }

  async pauseCycle(cycleId: string, dto: PauseCycleDto, userId: string) {
    const cycleRes = await this.db.query(
      `SELECT * FROM sla_tracking_cycles WHERE id = $1 AND is_active = TRUE;`,
      [cycleId],
    );
    if (cycleRes.rowCount === 0) {
      throw new NotFoundException(`SLA Cycle '${cycleId}' not found.`);
    }

    const cycle = cycleRes.rows[0];
    if (cycle.is_paused) {
      throw new BadRequestException('SLA Cycle is already paused.');
    }

    const updateQuery = `
      UPDATE sla_tracking_cycles SET
        is_paused = TRUE,
        current_pause_started_at = CURRENT_TIMESTAMP,
        current_pause_reason = $1,
        status = 'PAUSED',
        updated_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *;
    `;

    const res = await this.db.query(updateQuery, [dto.pauseReason, userId, cycleId]);
    return res.rows[0];
  }

  async resumeCycle(cycleId: string, userId: string) {
    const cycleRes = await this.db.query(
      `SELECT * FROM sla_tracking_cycles WHERE id = $1 AND is_active = TRUE;`,
      [cycleId],
    );
    if (cycleRes.rowCount === 0) {
      throw new NotFoundException(`SLA Cycle '${cycleId}' not found.`);
    }

    const cycle = cycleRes.rows[0];
    if (!cycle.is_paused || !cycle.current_pause_started_at) {
      throw new BadRequestException('SLA Cycle is not paused.');
    }

    const now = new Date();
    const pauseStart = new Date(cycle.current_pause_started_at);
    const pauseDurationMinutes = Math.max(1, Math.floor((now.getTime() - pauseStart.getTime()) / 60000));
    const totalPausedMinutes = (cycle.total_paused_minutes || 0) + pauseDurationMinutes;

    // Shift deadlines outward by the paused duration
    const newResponseDeadline = new Date(new Date(cycle.response_deadline).getTime() + pauseDurationMinutes * 60000);
    const newResolutionDeadline = new Date(new Date(cycle.resolution_deadline).getTime() + pauseDurationMinutes * 60000);

    const pauseEpisodes = Array.isArray(cycle.pause_episodes) ? cycle.pause_episodes : [];
    pauseEpisodes.push({
      paused_at: cycle.current_pause_started_at,
      resumed_at: now.toISOString(),
      duration_minutes: pauseDurationMinutes,
      reason: cycle.current_pause_reason,
    });

    const previousStatus = cycle.response_status === 'MET' ? 'RESPONSE_MET' : 'RUNNING';

    const updateQuery = `
      UPDATE sla_tracking_cycles SET
        is_paused = FALSE,
        current_pause_started_at = NULL,
        current_pause_reason = NULL,
        total_paused_minutes = $1,
        response_deadline = $2,
        resolution_deadline = $3,
        pause_episodes = $4::jsonb,
        status = $5,
        updated_by = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *;
    `;

    const res = await this.db.query(updateQuery, [
      totalPausedMinutes,
      newResponseDeadline.toISOString(),
      newResolutionDeadline.toISOString(),
      JSON.stringify(pauseEpisodes),
      previousStatus,
      userId,
      cycleId,
    ]);

    return res.rows[0];
  }

  async extendDeadline(cycleId: string, dto: ExtendDeadlineDto, userId: string) {
    const cycleRes = await this.db.query(
      `SELECT * FROM sla_tracking_cycles WHERE id = $1 AND is_active = TRUE;`,
      [cycleId],
    );
    if (cycleRes.rowCount === 0) {
      throw new NotFoundException(`SLA Cycle '${cycleId}' not found.`);
    }

    const cycle = cycleRes.rows[0];
    const newResolutionDeadline = new Date(new Date(cycle.resolution_deadline).getTime() + dto.addedMinutes * 60000);
    const extensionHistory = Array.isArray(cycle.extension_history) ? cycle.extension_history : [];

    extensionHistory.push({
      extended_at: new Date().toISOString(),
      added_minutes: dto.addedMinutes,
      reason: dto.reason,
      change_request_id: dto.changeRequestId || null,
      extended_by: userId,
    });

    const updateQuery = `
      UPDATE sla_tracking_cycles SET
        resolution_deadline = $1,
        extension_count = extension_count + 1,
        extension_history = $2::jsonb,
        change_request_id = CASE WHEN $3::text IS NOT NULL THEN $3::uuid ELSE change_request_id END,
        updated_by = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *;
    `;

    const res = await this.db.query(updateQuery, [
      newResolutionDeadline.toISOString(),
      JSON.stringify(extensionHistory),
      dto.changeRequestId || null,
      userId,
      cycleId,
    ]);

    return res.rows[0];
  }

  async reopenCycle(cycleId: string, reason: string, userId: string) {
    const cycleRes = await this.db.query(
      `SELECT * FROM sla_tracking_cycles WHERE id = $1 AND is_active = TRUE;`,
      [cycleId],
    );
    if (cycleRes.rowCount === 0) {
      throw new NotFoundException(`SLA Cycle '${cycleId}' not found.`);
    }

    const oldCycle = cycleRes.rows[0];
    const newIteration = (oldCycle.cycle_iteration || 1) + 1;
    const newCycleNumber = `${oldCycle.cycle_number}-R${newIteration}`;

    const policy = await this.findPolicyById(oldCycle.sla_policy_id);
    const now = new Date();
    const responseDeadline = this.calculateDeadline(
      now,
      policy.response_time_minutes,
      policy.response_time_basis,
      policy,
    );
    const resolutionDeadline = this.calculateDeadline(
      now,
      policy.resolution_time_minutes,
      policy.resolution_time_basis,
      policy,
    );

    const insertQuery = `
      INSERT INTO sla_tracking_cycles (
        cycle_number,
        task_id,
        client_request_id,
        sla_policy_id,
        cycle_iteration,
        policy_snapshot,
        calendar_snapshot,
        status,
        response_deadline,
        response_status,
        resolution_deadline,
        original_resolution_deadline,
        resolution_status,
        is_paused,
        is_active,
        created_by,
        updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'RUNNING', $8, 'PENDING', $9, $9, 'PENDING', FALSE, TRUE, $10, $10)
      RETURNING *;
    `;

    const res = await this.db.query(insertQuery, [
      newCycleNumber,
      oldCycle.task_id,
      oldCycle.client_request_id,
      oldCycle.sla_policy_id,
      newIteration,
      JSON.stringify(oldCycle.policy_snapshot),
      JSON.stringify(oldCycle.calendar_snapshot),
      responseDeadline.toISOString(),
      resolutionDeadline.toISOString(),
      userId,
    ]);

    return res.rows[0];
  }

  async findAllCycles(filter?: { taskId?: string; status?: string; projectId?: string }) {
    let query = `
      SELECT c.*,
             t.task_code,
             t.title AS task_title,
             p.policy_name,
             p.tier,
             pr.project_name
      FROM sla_tracking_cycles c
      LEFT JOIN tasks t ON c.task_id = t.id
      LEFT JOIN projects pr ON t.project_id = pr.id
      LEFT JOIN sla_policies p ON c.sla_policy_id = p.id
      WHERE c.is_active = TRUE
    `;
    const params: any[] = [];

    if (filter?.taskId) {
      params.push(filter.taskId);
      query += ` AND c.task_id = $${params.length}`;
    }
    if (filter?.status) {
      params.push(filter.status);
      query += ` AND c.status = $${params.length}`;
    }
    if (filter?.projectId) {
      params.push(filter.projectId);
      query += ` AND t.project_id = $${params.length}`;
    }

    query += ` ORDER BY c.created_at DESC;`;
    const res = await this.db.query(query, params);
    return res.rows;
  }

  async findCycleById(id: string) {
    const query = `
      SELECT c.*,
             t.task_code,
             t.title AS task_title,
             p.policy_name,
             p.tier,
             pr.project_name,
             u_resp.first_name || ' ' || u_resp.last_name AS responded_by_name,
             u_res.first_name || ' ' || u_res.last_name AS resolved_by_name
      FROM sla_tracking_cycles c
      LEFT JOIN tasks t ON c.task_id = t.id
      LEFT JOIN projects pr ON t.project_id = pr.id
      LEFT JOIN sla_policies p ON c.sla_policy_id = p.id
      LEFT JOIN users u_resp ON c.responded_by_user_id = u_resp.id
      LEFT JOIN users u_res ON c.resolved_by_user_id = u_res.id
      WHERE c.id = $1 AND c.is_active = TRUE;
    `;
    const res = await this.db.query(query, [id]);
    if (res.rowCount === 0) {
      throw new NotFoundException(`SLA Cycle '${id}' not found.`);
    }
    return res.rows[0];
  }

  // ========================================================
  // 3. Rule-Based Risk Alerts Engine (No AI Hype)
  // ========================================================

  async evaluateRiskAlerts(filter?: { projectId?: string; clientId?: string }) {
    const createdAlerts: any[] = [];

    // 1. Response at risk & breached
    const responseQuery = `
      SELECT c.id AS cycle_id, c.cycle_number, c.task_id, c.response_deadline, c.created_at,
             t.task_code, t.title AS task_title, t.project_id, pr.client_id,
             (c.policy_snapshot->>'response_time_minutes')::int AS response_time_minutes,
             (c.policy_snapshot->>'response_warning_threshold_pct')::int AS threshold_pct
      FROM sla_tracking_cycles c
      JOIN tasks t ON c.task_id = t.id
      JOIN projects pr ON t.project_id = pr.id
      WHERE c.is_active = TRUE
        AND c.status IN ('RUNNING', 'PAUSED')
        AND c.response_status = 'PENDING';
    `;
    const responseRes = await this.db.query(responseQuery);
    const now = new Date();

    for (const row of responseRes.rows) {
      const deadline = new Date(row.response_deadline);
      const isBreached = now > deadline;
      const thresholdMinutes = (row.response_time_minutes * (row.threshold_pct || 75)) / 100;
      const elapsedMinutes = (now.getTime() - new Date(row.created_at).getTime()) / 60000;
      const isAtRisk = !isBreached && elapsedMinutes >= thresholdMinutes;

      if (isBreached) {
        const alert = await this.upsertAlert({
          alertType: 'SLA_RESPONSE_BREACHED',
          severity: 'CRITICAL',
          slaCycleId: row.cycle_id,
          taskId: row.task_id,
          projectId: row.project_id,
          clientId: row.client_id,
          title: `First Response SLA Breached on ${row.task_code}`,
          description: `First response deadline of ${row.response_time_minutes} minutes elapsed without customer communication.`,
          triggerReason: `Current time exceeds response deadline ${deadline.toISOString()}.`,
          recommendedAction: 'Send immediate customer acknowledgment and triage ticket.',
          escalationTier: 2,
        });
        if (alert) createdAlerts.push(alert);
      } else if (isAtRisk) {
        const alert = await this.upsertAlert({
          alertType: 'SLA_RESPONSE_AT_RISK',
          severity: 'HIGH',
          slaCycleId: row.cycle_id,
          taskId: row.task_id,
          projectId: row.project_id,
          clientId: row.client_id,
          title: `First Response SLA at Risk on ${row.task_code}`,
          description: `First response target has reached ${row.threshold_pct}% of allowed duration.`,
          triggerReason: `Elapsed ${Math.floor(elapsedMinutes)} minutes towards ${row.response_time_minutes} minute target.`,
          recommendedAction: 'Acknowledge inquiry and request any needed reproduction steps.',
          escalationTier: 1,
        });
        if (alert) createdAlerts.push(alert);
      }
    }

    // 2. Resolution at risk & breached
    const resolutionQuery = `
      SELECT c.id AS cycle_id, c.cycle_number, c.task_id, c.resolution_deadline, c.created_at, c.total_paused_minutes,
             t.task_code, t.title AS task_title, t.project_id, pr.client_id,
             (c.policy_snapshot->>'resolution_time_minutes')::int AS resolution_time_minutes,
             (c.policy_snapshot->>'resolution_warning_threshold_pct')::int AS threshold_pct
      FROM sla_tracking_cycles c
      JOIN tasks t ON c.task_id = t.id
      JOIN projects pr ON t.project_id = pr.id
      WHERE c.is_active = TRUE
        AND c.status IN ('RUNNING', 'RESPONSE_MET', 'RESPONSE_BREACHED', 'PAUSED')
        AND c.resolution_status = 'PENDING';
    `;
    const resolutionRes = await this.db.query(resolutionQuery);

    for (const row of resolutionRes.rows) {
      const deadline = new Date(row.resolution_deadline);
      const isBreached = now > deadline;
      const thresholdMinutes = (row.resolution_time_minutes * (row.threshold_pct || 75)) / 100;
      const elapsedMinutes = (now.getTime() - new Date(row.created_at).getTime()) / 60000 - (row.total_paused_minutes || 0);
      const isAtRisk = !isBreached && elapsedMinutes >= thresholdMinutes;

      if (isBreached) {
        const alert = await this.upsertAlert({
          alertType: 'SLA_RESOLUTION_BREACHED',
          severity: 'CRITICAL',
          slaCycleId: row.cycle_id,
          taskId: row.task_id,
          projectId: row.project_id,
          clientId: row.client_id,
          title: `Resolution SLA Breached on ${row.task_code}`,
          description: `Resolution deadline elapsed without customer-facing resolution status.`,
          triggerReason: `Current time exceeds resolution deadline ${deadline.toISOString()}.`,
          recommendedAction: 'Escalate to Delivery Lead and schedule expedited peer review.',
          escalationTier: 3,
        });
        if (alert) createdAlerts.push(alert);
      } else if (isAtRisk) {
        const alert = await this.upsertAlert({
          alertType: 'SLA_RESOLUTION_AT_RISK',
          severity: 'HIGH',
          slaCycleId: row.cycle_id,
          taskId: row.task_id,
          projectId: row.project_id,
          clientId: row.client_id,
          title: `Resolution SLA at Risk on ${row.task_code}`,
          description: `Resolution time consumed ${Math.floor(elapsedMinutes)} of ${row.resolution_time_minutes} minutes.`,
          triggerReason: `Resolution duration reached ${row.threshold_pct}% threshold.`,
          recommendedAction: 'Verify pending code review or test verification to unblock closure.',
          escalationTier: 1,
        });
        if (alert) createdAlerts.push(alert);
      }
    }

    // 3. Stale Active Work: In progress for > 72 hours without time log or activity
    const staleQuery = `
      SELECT t.id, t.task_code, t.title, t.project_id, pr.client_id, t.updated_at,
             ta.user_id AS assignee_id
      FROM tasks t
      JOIN task_workflow_statuses s ON t.status_id = s.id
      JOIN projects pr ON t.project_id = pr.id
      LEFT JOIN task_assignees ta ON t.id = ta.task_id AND ta.is_primary_assignee = TRUE
      WHERE t.is_active = TRUE
        AND s.category = 'IN_PROGRESS'
        AND t.updated_at < CURRENT_TIMESTAMP - INTERVAL '72 hours'
        AND NOT EXISTS (
          SELECT 1 FROM task_time_logs l WHERE l.task_id = t.id AND l.created_at >= CURRENT_TIMESTAMP - INTERVAL '72 hours'
        )
      LIMIT 20;
    `;
    const staleRes = await this.db.query(staleQuery);
    for (const row of staleRes.rows) {
      const alert = await this.upsertAlert({
        alertType: 'STALE_ACTIVE_WORK',
        severity: 'MEDIUM',
        taskId: row.id,
        projectId: row.project_id,
        clientId: row.client_id,
        title: `Stale Active Task: ${row.task_code}`,
        description: `Task has been in active status without updates or logged work for over 72 hours.`,
        triggerReason: `No time logs or updates since ${new Date(row.updated_at).toLocaleString()}.`,
        recommendedAction: 'Check in with primary assignee or move to BLOCKED if external impediment exists.',
        escalationTier: 1,
        assignedOwnerId: row.assignee_id,
      });
      if (alert) createdAlerts.push(alert);
    }

    return createdAlerts;
  }

  private async upsertAlert(data: {
    alertType: string;
    severity: string;
    slaCycleId?: string;
    taskId?: string;
    projectId?: string;
    clientId?: string;
    title: string;
    description: string;
    triggerReason: string;
    recommendedAction: string;
    escalationTier: number;
    assignedOwnerId?: string;
  }) {
    // Check if matching active alert already exists
    let existingQuery = `
      SELECT id FROM risk_alerts
      WHERE alert_type = $1 AND status IN ('ACTIVE', 'ACKNOWLEDGED')
    `;
    const params: any[] = [data.alertType];
    if (data.slaCycleId) {
      params.push(data.slaCycleId);
      existingQuery += ` AND sla_cycle_id = $${params.length}`;
    } else if (data.taskId) {
      params.push(data.taskId);
      existingQuery += ` AND task_id = $${params.length}`;
    }

    const existingRes = await this.db.query(existingQuery, params);
    if (existingRes.rowCount > 0) {
      // Refresh timestamp
      await this.db.query(
        `UPDATE risk_alerts SET freshness_updated_at = CURRENT_TIMESTAMP WHERE id = $1;`,
        [existingRes.rows[0].id],
      );
      return null;
    }

    // Generate alert code
    const countRes = await this.db.query(`SELECT COUNT(*) FROM risk_alerts;`);
    const seq = parseInt(countRes.rows[0].count, 10) + 1;
    const alertCode = `ALT-${new Date().getFullYear()}-${seq.toString().padStart(4, '0')}`;

    const adminRes = await this.db.query(
      `SELECT id FROM users WHERE role_code = 'ROLE_SUPER_ADMIN' LIMIT 1;`,
    );
    const systemUserId = adminRes.rows[0]?.id;

    const insertQuery = `
      INSERT INTO risk_alerts (
        alert_code,
        alert_type,
        severity,
        sla_cycle_id,
        task_id,
        project_id,
        client_id,
        title,
        description,
        trigger_reason,
        recommended_action,
        status,
        escalation_tier,
        assigned_owner_id,
        freshness_updated_at,
        is_active,
        created_by,
        updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'ACTIVE', $12, $13, CURRENT_TIMESTAMP, TRUE, $14, $14)
      RETURNING *;
    `;

    const res = await this.db.query(insertQuery, [
      alertCode,
      data.alertType,
      data.severity,
      data.slaCycleId || null,
      data.taskId || null,
      data.projectId || null,
      data.clientId || null,
      data.title,
      data.description,
      data.triggerReason,
      data.recommendedAction,
      data.escalationTier,
      data.assignedOwnerId || null,
      systemUserId,
    ]);

    return res.rows[0];
  }

  async findAllAlerts(filter?: { status?: string; severity?: string; projectId?: string }) {
    let query = `
      SELECT a.*,
             t.task_code,
             t.title AS task_title,
             pr.project_name,
             c.company_name AS client_name,
             u.first_name || ' ' || u.last_name AS owner_name
      FROM risk_alerts a
      LEFT JOIN tasks t ON a.task_id = t.id
      LEFT JOIN projects pr ON a.project_id = pr.id
      LEFT JOIN clients c ON a.client_id = c.id
      LEFT JOIN users u ON a.assigned_owner_id = u.id
      WHERE a.is_active = TRUE
    `;
    const params: any[] = [];

    if (filter?.status) {
      params.push(filter.status);
      query += ` AND a.status = $${params.length}`;
    }
    if (filter?.severity) {
      params.push(filter.severity);
      query += ` AND a.severity = $${params.length}`;
    }
    if (filter?.projectId) {
      params.push(filter.projectId);
      query += ` AND a.project_id = $${params.length}`;
    }

    query += ` ORDER BY CASE a.severity WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END, a.created_at DESC;`;

    const res = await this.db.query(query, params);
    return res.rows;
  }

  async acknowledgeAlert(alertId: string, dto: AcknowledgeAlertDto, userId: string) {
    const updateQuery = `
      UPDATE risk_alerts SET
        status = 'ACKNOWLEDGED',
        acknowledged_at = CURRENT_TIMESTAMP,
        acknowledged_by = $1,
        updated_by = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND is_active = TRUE
      RETURNING *;
    `;
    const res = await this.db.query(updateQuery, [userId, alertId]);
    if (res.rowCount === 0) {
      throw new NotFoundException(`Risk Alert '${alertId}' not found.`);
    }
    return res.rows[0];
  }

  async resolveAlert(alertId: string, dto: ResolveAlertDto, userId: string) {
    const updateQuery = `
      UPDATE risk_alerts SET
        status = 'RESOLVED',
        resolved_at = CURRENT_TIMESTAMP,
        resolution_notes = $1,
        updated_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND is_active = TRUE
      RETURNING *;
    `;
    const res = await this.db.query(updateQuery, [dto.resolutionNotes, userId, alertId]);
    if (res.rowCount === 0) {
      throw new NotFoundException(`Risk Alert '${alertId}' not found.`);
    }
    return res.rows[0];
  }

  async dismissAlert(alertId: string, notes: string, userId: string) {
    const updateQuery = `
      UPDATE risk_alerts SET
        status = 'DISMISSED',
        resolution_notes = $1,
        resolved_at = CURRENT_TIMESTAMP,
        updated_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND is_active = TRUE
      RETURNING *;
    `;
    const res = await this.db.query(updateQuery, [notes, userId, alertId]);
    if (res.rowCount === 0) {
      throw new NotFoundException(`Risk Alert '${alertId}' not found.`);
    }
    return res.rows[0];
  }

  // ========================================================
  // 4. SLA Analytics & Executive Dashboard
  // ========================================================

  async getSlaDashboard(projectId?: string, clientId?: string) {
    // 1. Overall cycle counters
    let cycleQuery = `
      SELECT 
        COUNT(*) AS total_cycles,
        COUNT(*) FILTER (WHERE status = 'RUNNING') AS running_cycles,
        COUNT(*) FILTER (WHERE status = 'PAUSED') AS paused_cycles,
        COUNT(*) FILTER (WHERE response_status = 'MET') AS response_met_count,
        COUNT(*) FILTER (WHERE response_status = 'BREACHED') AS response_breached_count,
        COUNT(*) FILTER (WHERE resolution_status = 'MET') AS resolution_met_count,
        COUNT(*) FILTER (WHERE resolution_status = 'BREACHED') AS resolution_breached_count,
        AVG(elapsed_response_minutes) FILTER (WHERE response_status = 'MET') AS avg_response_elapsed,
        AVG(elapsed_resolution_minutes) FILTER (WHERE resolution_status = 'MET') AS avg_resolution_elapsed
      FROM sla_tracking_cycles c
      LEFT JOIN tasks t ON c.task_id = t.id
      WHERE c.is_active = TRUE
    `;
    const params: any[] = [];
    if (projectId) {
      params.push(projectId);
      cycleQuery += ` AND t.project_id = $${params.length}`;
    }
    const cycleRes = await this.db.query(cycleQuery, params);
    const row = cycleRes.rows[0] || {};

    const respMet = parseInt(row.response_met_count || '0', 10);
    const respBreached = parseInt(row.response_breached_count || '0', 10);
    const respTotal = respMet + respBreached;
    const responseComplianceRate = respTotal > 0 ? Number(((respMet / respTotal) * 100).toFixed(1)) : 100.0;

    const resMet = parseInt(row.resolution_met_count || '0', 10);
    const resBreached = parseInt(row.resolution_breached_count || '0', 10);
    const resTotal = resMet + resBreached;
    const resolutionComplianceRate = resTotal > 0 ? Number(((resMet / resTotal) * 100).toFixed(1)) : 100.0;

    const overallRate = resTotal > 0 && respTotal > 0
      ? Number((((respMet + resMet) / (respTotal + resTotal)) * 100).toFixed(1))
      : 100.0;

    // 2. Alert counters
    let alertQuery = `
      SELECT 
        COUNT(*) AS active_alerts_count,
        COUNT(*) FILTER (WHERE severity = 'CRITICAL') AS critical_alerts,
        COUNT(*) FILTER (WHERE severity = 'HIGH') AS high_alerts,
        COUNT(*) FILTER (WHERE severity = 'MEDIUM') AS medium_alerts,
        COUNT(*) FILTER (WHERE alert_type LIKE 'SLA_RESPONSE%') AS response_alerts,
        COUNT(*) FILTER (WHERE alert_type LIKE 'SLA_RESOLUTION%') AS resolution_alerts,
        COUNT(*) FILTER (WHERE alert_type = 'STALE_ACTIVE_WORK') AS stale_work_alerts
      FROM risk_alerts
      WHERE is_active = TRUE AND status IN ('ACTIVE', 'ACKNOWLEDGED')
    `;
    const alertParams: any[] = [];
    if (projectId) {
      alertParams.push(projectId);
      alertQuery += ` AND project_id = $${alertParams.length}`;
    }
    const alertRes = await this.db.query(alertQuery, alertParams);
    const alertRow = alertRes.rows[0] || {};

    return {
      summary: {
        totalCycles: parseInt(row.total_cycles || '0', 10),
        runningCycles: parseInt(row.running_cycles || '0', 10),
        pausedCycles: parseInt(row.paused_cycles || '0', 10),
        overallComplianceRate: overallRate,
        responseComplianceRate,
        resolutionComplianceRate,
        avgResponseMinutes: Math.round(parseFloat(row.avg_response_elapsed || '0')),
        avgResolutionMinutes: Math.round(parseFloat(row.avg_resolution_elapsed || '0')),
      },
      alerts: {
        totalActive: parseInt(alertRow.active_alerts_count || '0', 10),
        critical: parseInt(alertRow.critical_alerts || '0', 10),
        high: parseInt(alertRow.high_alerts || '0', 10),
        medium: parseInt(alertRow.medium_alerts || '0', 10),
        responseAlerts: parseInt(alertRow.response_alerts || '0', 10),
        resolutionAlerts: parseInt(alertRow.resolution_alerts || '0', 10),
        staleWorkAlerts: parseInt(alertRow.stale_work_alerts || '0', 10),
      },
    };
  }
}
