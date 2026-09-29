import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CalendarsService } from '../calendars/calendars.service';
import { CreateHandoffDto } from './dto/create-handoff.dto';
import {
  AcknowledgeHandoffDto,
  CompleteHandoffDto,
  QueryHandoffsDto,
  RedirectHandoffDto,
  ReturnHandoffDto,
  StartHandoffWorkDto,
} from './dto/handoff-actions.dto';

export interface DurationMetric {
  elapsedSeconds: number;
  elapsedFormatted: string;
  businessSeconds: number;
  businessFormatted: string;
}

@Injectable()
export class HandoffsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly calendarsService: CalendarsService,
  ) {}

  // ==========================================
  // HELPER: CALCULATE ELAPSED & BUSINESS DURATION
  // ==========================================
  calculateDurations(
    startDate: Date | string,
    endDate: Date | string,
    workDayStartHour = 9.5, // 09:30
    workDayEndHour = 18.0, // 18:00 (8.5h window)
  ): DurationMetric {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return {
        elapsedSeconds: 0,
        elapsedFormatted: '0m',
        businessSeconds: 0,
        businessFormatted: '0m',
      };
    }

    const elapsedMs = end.getTime() - start.getTime();
    const elapsedSeconds = Math.floor(elapsedMs / 1000);

    // Business seconds calculation
    let businessSeconds = 0;
    const current = new Date(start);

    // Walk minute by minute or interval for accurate business window
    while (current < end) {
      const dayOfWeek = current.getDay(); // 0 is Sunday, 6 is Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      if (!isWeekend) {
        const hour = current.getHours() + current.getMinutes() / 60;
        if (hour >= workDayStartHour && hour < workDayEndHour) {
          businessSeconds += 60;
        }
      }
      current.setMinutes(current.getMinutes() + 1);
    }

    return {
      elapsedSeconds,
      elapsedFormatted: this.formatSeconds(elapsedSeconds),
      businessSeconds,
      businessFormatted: this.formatSeconds(businessSeconds),
    };
  }

  formatSeconds(totalSeconds: number): string {
    if (totalSeconds <= 0) return '0m';
    const days = Math.floor(totalSeconds / 86400);
    const remainingSeconds = totalSeconds % 86400;
    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

    return parts.join(' ');
  }

  // ==========================================
  // 1. CREATE / INITIATE HANDOFF
  // ==========================================
  async createHandoff(dto: CreateHandoffDto, userId: string) {
    if (!dto.toTeamId && !dto.toUserId) {
      throw new BadRequestException(
        'A handoff recipient must be specified: please provide either a receiving team or a receiving user.',
      );
    }

    // Verify task exists
    const taskRes = await this.db.query(
      `SELECT id, task_code, title, project_id, status FROM tasks WHERE id = $1 AND is_active = TRUE;`,
      [dto.taskId],
    );
    if (taskRes.rowCount === 0) {
      throw new NotFoundException(`Task with ID '${dto.taskId}' not found.`);
    }

    // Check for open active handoff
    const activeHandoffRes = await this.db.query(
      `SELECT id, status FROM task_handoffs 
       WHERE task_id = $1 AND status IN ('PENDING', 'ACCEPTED', 'IN_PROGRESS') AND is_active = TRUE
       LIMIT 1;`,
      [dto.taskId],
    );
    if (activeHandoffRes.rowCount > 0) {
      throw new BadRequestException(
        `Task already has an active handoff (ID: ${activeHandoffRes.rows[0].id}) in '${activeHandoffRes.rows[0].status}' status. Complete, redirect, or return it before initiating a new handoff.`,
      );
    }

    // Resolve sender's team if not provided
    let fromTeamId = dto.fromTeamId;
    if (!fromTeamId) {
      const teamRes = await this.db.query(
        `SELECT team_id FROM team_members WHERE user_id = $1 AND is_active = TRUE ORDER BY created_at ASC LIMIT 1;`,
        [userId],
      );
      if (teamRes.rowCount > 0) {
        fromTeamId = teamRes.rows[0].team_id;
      }
    }

    const insertSql = `
      INSERT INTO task_handoffs (
        task_id,
        from_team_id,
        from_user_id,
        to_team_id,
        to_user_id,
        handoff_type,
        status,
        sent_at,
        required_context,
        notes,
        is_active,
        created_by,
        updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', CURRENT_TIMESTAMP, $7, $8, TRUE, $3, $3)
      RETURNING *;
    `;

    const res = await this.db.query(insertSql, [
      dto.taskId,
      fromTeamId || null,
      userId,
      dto.toTeamId || null,
      dto.toUserId || null,
      dto.handoffType || 'GENERAL',
      dto.requiredContext || null,
      dto.notes || null,
    ]);

    return this.getHandoffById(res.rows[0].id);
  }

  // ==========================================
  // 2. ACKNOWLEDGE HANDOFF
  // ==========================================
  async acknowledgeHandoff(
    handoffId: string,
    dto: AcknowledgeHandoffDto,
    userId: string,
  ) {
    const handoff = await this.findRawHandoff(handoffId);

    if (handoff.status !== 'PENDING') {
      throw new BadRequestException(
        `Only handoffs in 'PENDING' status can be acknowledged. Current status: '${handoff.status}'.`,
      );
    }

    // Update to ACCEPTED, record acknowledge timestamp and claim owner if unassigned
    const notesCombined = dto.notes
      ? `${handoff.notes ? handoff.notes + '\n' : ''}[Ack note]: ${dto.notes}`
      : handoff.notes;

    const claimUserId = handoff.to_user_id || userId;

    const updateSql = `
      UPDATE task_handoffs
      SET 
        status = 'ACCEPTED',
        acknowledged_at = CURRENT_TIMESTAMP,
        acknowledged_by = $1,
        to_user_id = $2,
        notes = $3,
        updated_by = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *;
    `;

    await this.db.query(updateSql, [userId, claimUserId, notesCombined, handoffId]);
    return this.getHandoffById(handoffId);
  }

  // ==========================================
  // 3. START WORK ON HANDOFF
  // ==========================================
  async startWork(
    handoffId: string,
    dto: StartHandoffWorkDto,
    userId: string,
  ) {
    const handoff = await this.findRawHandoff(handoffId);

    if (handoff.status !== 'PENDING' && handoff.status !== 'ACCEPTED') {
      throw new BadRequestException(
        `Cannot start work on a handoff with status '${handoff.status}'. Handoff must be 'PENDING' or 'ACCEPTED'.`,
      );
    }

    const notesCombined = dto.notes
      ? `${handoff.notes ? handoff.notes + '\n' : ''}[Work start note]: ${dto.notes}`
      : handoff.notes;

    const claimUserId = handoff.to_user_id || userId;
    const isAutoAck = handoff.status === 'PENDING';

    const updateSql = `
      UPDATE task_handoffs
      SET 
        status = 'IN_PROGRESS',
        acknowledged_at = COALESCE(acknowledged_at, CURRENT_TIMESTAMP),
        acknowledged_by = COALESCE(acknowledged_by, $1),
        work_started_at = CURRENT_TIMESTAMP,
        work_started_by = $1,
        to_user_id = $2,
        notes = $3,
        updated_by = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *;
    `;

    await this.db.query(updateSql, [userId, claimUserId, notesCombined, handoffId]);
    return this.getHandoffById(handoffId);
  }

  // ==========================================
  // 4. RETURN FOR REWORK
  // ==========================================
  async returnForRework(
    handoffId: string,
    dto: ReturnHandoffDto,
    userId: string,
  ) {
    if (!dto.reason || !dto.reason.trim()) {
      throw new BadRequestException('A reason for rework return is required.');
    }

    const handoff = await this.findRawHandoff(handoffId);

    if (
      handoff.status !== 'PENDING' &&
      handoff.status !== 'ACCEPTED' &&
      handoff.status !== 'IN_PROGRESS'
    ) {
      throw new BadRequestException(
        `Cannot return handoff with status '${handoff.status}' for rework.`,
      );
    }

    // 1. Close current handoff as RETURNED_FOR_REWORK
    const closeSql = `
      UPDATE task_handoffs
      SET 
        status = 'RETURNED_FOR_REWORK',
        completed_at = CURRENT_TIMESTAMP,
        rejection_or_return_reason = $1,
        updated_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *;
    `;
    await this.db.query(closeSql, [dto.reason.trim(), userId, handoffId]);

    // 2. Open successor handoff back to the original sender
    const successorSql = `
      INSERT INTO task_handoffs (
        task_id,
        from_team_id,
        from_user_id,
        to_team_id,
        to_user_id,
        handoff_type,
        status,
        sent_at,
        predecessor_handoff_id,
        required_context,
        notes,
        is_active,
        created_by,
        updated_by
      ) VALUES ($1, $2, $3, $4, $5, 'QA_TO_DEV_REWORK', 'PENDING', CURRENT_TIMESTAMP, $6, $7, $8, TRUE, $3, $3)
      RETURNING *;
    `;

    const successorRes = await this.db.query(successorSql, [
      handoff.task_id,
      handoff.to_team_id || null,
      userId,
      handoff.from_team_id || null,
      handoff.from_user_id,
      handoffId,
      `Returned for Rework: ${dto.reason.trim()}`,
      dto.notes || null,
    ]);

    return {
      returnedHandoff: await this.getHandoffById(handoffId),
      successorHandoff: await this.getHandoffById(successorRes.rows[0].id),
    };
  }

  // ==========================================
  // 5. REDIRECT HANDOFF
  // ==========================================
  async redirectHandoff(
    handoffId: string,
    dto: RedirectHandoffDto,
    userId: string,
  ) {
    if (!dto.toTeamId && !dto.toUserId) {
      throw new BadRequestException(
        'Redirect recipient missing: specify either a receiving team or user.',
      );
    }

    const handoff = await this.findRawHandoff(handoffId);

    if (
      handoff.status !== 'PENDING' &&
      handoff.status !== 'ACCEPTED' &&
      handoff.status !== 'IN_PROGRESS'
    ) {
      throw new BadRequestException(
        `Cannot redirect handoff with status '${handoff.status}'.`,
      );
    }

    // 1. Close current handoff as REDIRECTED
    const closeSql = `
      UPDATE task_handoffs
      SET 
        status = 'REDIRECTED',
        completed_at = CURRENT_TIMESTAMP,
        rejection_or_return_reason = $1,
        updated_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *;
    `;
    await this.db.query(closeSql, [
      dto.reason || 'Redirected / Forwarded to another team or owner',
      userId,
      handoffId,
    ]);

    // 2. Open linked successor handoff
    const successorSql = `
      INSERT INTO task_handoffs (
        task_id,
        from_team_id,
        from_user_id,
        to_team_id,
        to_user_id,
        handoff_type,
        status,
        sent_at,
        predecessor_handoff_id,
        required_context,
        notes,
        is_active,
        created_by,
        updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', CURRENT_TIMESTAMP, $7, $8, $9, TRUE, $3, $3)
      RETURNING *;
    `;

    const successorRes = await this.db.query(successorSql, [
      handoff.task_id,
      handoff.to_team_id || null,
      userId,
      dto.toTeamId || handoff.to_team_id || null,
      dto.toUserId || null,
      handoff.handoff_type,
      handoffId,
      handoff.required_context,
      dto.notes || null,
    ]);

    return {
      redirectedHandoff: await this.getHandoffById(handoffId),
      successorHandoff: await this.getHandoffById(successorRes.rows[0].id),
    };
  }

  // ==========================================
  // 6. COMPLETE HANDOFF
  // ==========================================
  async completeHandoff(
    handoffId: string,
    dto: CompleteHandoffDto,
    userId: string,
  ) {
    const handoff = await this.findRawHandoff(handoffId);

    if (handoff.status !== 'IN_PROGRESS' && handoff.status !== 'ACCEPTED') {
      throw new BadRequestException(
        `Cannot complete handoff in '${handoff.status}' status. Work must be active or accepted.`,
      );
    }

    const notesCombined = dto.notes
      ? `${handoff.notes ? handoff.notes + '\n' : ''}[Completion note]: ${dto.notes}`
      : handoff.notes;

    const updateSql = `
      UPDATE task_handoffs
      SET 
        status = 'COMPLETED',
        completed_at = CURRENT_TIMESTAMP,
        notes = $1,
        updated_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *;
    `;

    await this.db.query(updateSql, [notesCombined, userId, handoffId]);
    return this.getHandoffById(handoffId);
  }

  // ==========================================
  // 7. INBOUND QUEUE: WAITING FOR ME
  // ==========================================
  async getWaitingForMe(userId: string) {
    // 1. Get user's active team IDs
    const teamsRes = await this.db.query(
      `SELECT team_id FROM team_members WHERE user_id = $1 AND is_active = TRUE;`,
      [userId],
    );
    const userTeamIds = teamsRes.rows.map((r) => r.team_id);

    const query = `
      SELECT 
        h.*,
        t.task_code,
        t.title AS task_title,
        t.priority AS task_priority,
        p.name AS project_name,
        CONCAT(fu.first_name, ' ', fu.last_name) AS from_user_name,
        fu.email AS from_user_email,
        CONCAT(tu.first_name, ' ', tu.last_name) AS to_user_name,
        tu.email AS to_user_email,
        ft.team_name AS from_team_name,
        tt.team_name AS to_team_name,
        (h.to_user_id IS NULL) AS is_ownerless,
        (CURRENT_TIMESTAMP - h.sent_at > INTERVAL '24 hours') AS is_overdue
      FROM task_handoffs h
      JOIN tasks t ON h.task_id = t.id
      JOIN projects p ON t.project_id = p.id
      JOIN users fu ON h.from_user_id = fu.id
      LEFT JOIN users tu ON h.to_user_id = tu.id
      LEFT JOIN teams ft ON h.from_team_id = ft.id
      LEFT JOIN teams tt ON h.to_team_id = tt.id
      WHERE h.is_active = TRUE
        AND h.status IN ('PENDING', 'ACCEPTED')
        AND (
          h.to_user_id = $1
          OR (h.to_user_id IS NULL AND h.to_team_id = ANY($2::uuid[]))
        )
      ORDER BY h.sent_at ASC;
    `;

    const res = await this.db.query(query, [userId, userTeamIds]);

    return res.rows.map((row) => this.enrichHandoffRow(row));
  }

  // ==========================================
  // 8. OUTBOUND QUEUE: WAITING FOR OTHERS
  // ==========================================
  async getWaitingForOthers(userId: string) {
    const query = `
      SELECT 
        h.*,
        t.task_code,
        t.title AS task_title,
        t.priority AS task_priority,
        p.name AS project_name,
        CONCAT(fu.first_name, ' ', fu.last_name) AS from_user_name,
        fu.email AS from_user_email,
        CONCAT(tu.first_name, ' ', tu.last_name) AS to_user_name,
        tu.email AS to_user_email,
        ft.team_name AS from_team_name,
        tt.team_name AS to_team_name,
        (h.to_user_id IS NULL) AS is_ownerless,
        (CURRENT_TIMESTAMP - h.sent_at > INTERVAL '24 hours') AS is_overdue
      FROM task_handoffs h
      JOIN tasks t ON h.task_id = t.id
      JOIN projects p ON t.project_id = p.id
      JOIN users fu ON h.from_user_id = fu.id
      LEFT JOIN users tu ON h.to_user_id = tu.id
      LEFT JOIN teams ft ON h.from_team_id = ft.id
      LEFT JOIN teams tt ON h.to_team_id = tt.id
      WHERE h.is_active = TRUE
        AND h.from_user_id = $1
        AND h.status IN ('PENDING', 'ACCEPTED', 'IN_PROGRESS')
      ORDER BY h.sent_at DESC;
    `;

    const res = await this.db.query(query, [userId]);
    return res.rows.map((row) => this.enrichHandoffRow(row));
  }

  // ==========================================
  // 9. TASK HANDOFF HISTORY / EPISODE CHAIN
  // ==========================================
  async getTaskHandoffHistory(taskId: string) {
    const query = `
      SELECT 
        h.*,
        t.task_code,
        t.title AS task_title,
        p.name AS project_name,
        CONCAT(fu.first_name, ' ', fu.last_name) AS from_user_name,
        fu.email AS from_user_email,
        CONCAT(tu.first_name, ' ', tu.last_name) AS to_user_name,
        tu.email AS to_user_email,
        CONCAT(au.first_name, ' ', au.last_name) AS acknowledged_by_name,
        CONCAT(wu.first_name, ' ', wu.last_name) AS work_started_by_name,
        ft.team_name AS from_team_name,
        tt.team_name AS to_team_name,
        (h.to_user_id IS NULL) AS is_ownerless
      FROM task_handoffs h
      JOIN tasks t ON h.task_id = t.id
      JOIN projects p ON t.project_id = p.id
      JOIN users fu ON h.from_user_id = fu.id
      LEFT JOIN users tu ON h.to_user_id = tu.id
      LEFT JOIN users au ON h.acknowledged_by = au.id
      LEFT JOIN users wu ON h.work_started_by = wu.id
      LEFT JOIN teams ft ON h.from_team_id = ft.id
      LEFT JOIN teams tt ON h.to_team_id = tt.id
      WHERE h.task_id = $1 AND h.is_active = TRUE
      ORDER BY h.sent_at ASC;
    `;

    const res = await this.db.query(query, [taskId]);
    return res.rows.map((row) => this.enrichHandoffRow(row));
  }

  // ==========================================
  // 10. GET HANDOFF BY ID
  // ==========================================
  async getHandoffById(handoffId: string) {
    const query = `
      SELECT 
        h.*,
        t.task_code,
        t.title AS task_title,
        t.priority AS task_priority,
        p.name AS project_name,
        CONCAT(fu.first_name, ' ', fu.last_name) AS from_user_name,
        fu.email AS from_user_email,
        CONCAT(tu.first_name, ' ', tu.last_name) AS to_user_name,
        tu.email AS to_user_email,
        CONCAT(au.first_name, ' ', au.last_name) AS acknowledged_by_name,
        CONCAT(wu.first_name, ' ', wu.last_name) AS work_started_by_name,
        ft.team_name AS from_team_name,
        tt.team_name AS to_team_name,
        (h.to_user_id IS NULL) AS is_ownerless,
        (CURRENT_TIMESTAMP - h.sent_at > INTERVAL '24 hours') AS is_overdue
      FROM task_handoffs h
      JOIN tasks t ON h.task_id = t.id
      JOIN projects p ON t.project_id = p.id
      JOIN users fu ON h.from_user_id = fu.id
      LEFT JOIN users tu ON h.to_user_id = tu.id
      LEFT JOIN users au ON h.acknowledged_by = au.id
      LEFT JOIN users wu ON h.work_started_by = wu.id
      LEFT JOIN teams ft ON h.from_team_id = ft.id
      LEFT JOIN teams tt ON h.to_team_id = tt.id
      WHERE h.id = $1 AND h.is_active = TRUE;
    `;

    const res = await this.db.query(query, [handoffId]);
    if (res.rowCount === 0) {
      throw new NotFoundException(`Handoff with ID '${handoffId}' not found.`);
    }

    return this.enrichHandoffRow(res.rows[0]);
  }

  // ==========================================
  // 11. AGGREGATE WAITING DURATION & REWORK ANALYTICS
  // ==========================================
  async getHandoffAnalytics(teamId?: string) {
    // Collect closed or active episodes to aggregate duration and rework frequency
    const teamFilter = teamId ? `AND (h.to_team_id = $1 OR h.from_team_id = $1)` : '';
    const params = teamId ? [teamId] : [];

    const query = `
      SELECT 
        h.id,
        h.handoff_type,
        h.status,
        h.sent_at,
        h.acknowledged_at,
        h.work_started_at,
        h.completed_at,
        h.from_team_id,
        h.to_team_id,
        ft.team_name AS from_team_name,
        tt.team_name AS to_team_name
      FROM task_handoffs h
      LEFT JOIN teams ft ON h.from_team_id = ft.id
      LEFT JOIN teams tt ON h.to_team_id = tt.id
      WHERE h.is_active = TRUE ${teamFilter}
      ORDER BY h.sent_at DESC;
    `;

    const res = await this.db.query(query, params);
    const rows = res.rows;

    // Aggregations
    let totalEpisodes = rows.length;
    let reworkCount = 0;
    let redirectedCount = 0;
    let totalAckElapsedSec = 0;
    let ackSamples = 0;
    let totalWorkStartElapsedSec = 0;
    let workStartSamples = 0;

    const byStage: Record<
      string,
      {
        stage: string;
        count: number;
        ackSecondsSum: number;
        ackCount: number;
        workStartSecondsSum: number;
        workStartCount: number;
        reworkCount: number;
      }
    > = {};

    for (const r of rows) {
      if (r.status === 'RETURNED_FOR_REWORK') reworkCount++;
      if (r.status === 'REDIRECTED') redirectedCount++;

      const stage = r.handoff_type || 'GENERAL';
      if (!byStage[stage]) {
        byStage[stage] = {
          stage,
          count: 0,
          ackSecondsSum: 0,
          ackCount: 0,
          workStartSecondsSum: 0,
          workStartCount: 0,
          reworkCount: 0,
        };
      }
      byStage[stage].count++;
      if (r.status === 'RETURNED_FOR_REWORK') byStage[stage].reworkCount++;

      // Time to ack
      if (r.acknowledged_at && r.sent_at) {
        const durations = this.calculateDurations(r.sent_at, r.acknowledged_at);
        totalAckElapsedSec += durations.elapsedSeconds;
        ackSamples++;
        byStage[stage].ackSecondsSum += durations.elapsedSeconds;
        byStage[stage].ackCount++;
      }

      // Time to work start
      if (r.work_started_at && r.sent_at) {
        const durations = this.calculateDurations(r.sent_at, r.work_started_at);
        totalWorkStartElapsedSec += durations.elapsedSeconds;
        workStartSamples++;
        byStage[stage].workStartSecondsSum += durations.elapsedSeconds;
        byStage[stage].workStartCount++;
      }
    }

    const avgAckSeconds = ackSamples > 0 ? Math.round(totalAckElapsedSec / ackSamples) : 0;
    const avgWorkStartSeconds =
      workStartSamples > 0 ? Math.round(totalWorkStartElapsedSec / workStartSamples) : 0;

    const stagesList = Object.values(byStage).map((st) => ({
      stage: st.stage,
      totalCount: st.count,
      reworkCount: st.reworkCount,
      reworkRatePct: st.count > 0 ? Number(((st.reworkCount / st.count) * 100).toFixed(1)) : 0,
      avgTimeToAckFormatted:
        st.ackCount > 0 ? this.formatSeconds(Math.round(st.ackSecondsSum / st.ackCount)) : 'N/A',
      avgTimeToWorkStartFormatted:
        st.workStartCount > 0
          ? this.formatSeconds(Math.round(st.workStartSecondsSum / st.workStartCount))
          : 'N/A',
    }));

    return {
      summary: {
        totalHandoffs: totalEpisodes,
        totalReworkCount: reworkCount,
        reworkRatePct:
          totalEpisodes > 0 ? Number(((reworkCount / totalEpisodes) * 100).toFixed(1)) : 0,
        redirectedCount,
        avgTimeToAckElapsed: this.formatSeconds(avgAckSeconds),
        avgTimeToWorkStartElapsed: this.formatSeconds(avgWorkStartSeconds),
        ackSampleCount: ackSamples,
        workStartSampleCount: workStartSamples,
      },
      byStage: stagesList,
    };
  }

  // ==========================================
  // ROW ENRICHMENT HELPER
  // ==========================================
  private enrichHandoffRow(row: any) {
    const timeToAck = row.acknowledged_at
      ? this.calculateDurations(row.sent_at, row.acknowledged_at)
      : null;

    const timeToWorkStart = row.work_started_at
      ? this.calculateDurations(row.sent_at, row.work_started_at)
      : null;

    const currentWaitingDuration = this.calculateDurations(
      row.sent_at,
      row.completed_at || new Date(),
    );

    return {
      ...row,
      timeToAck,
      timeToWorkStart,
      waitingDuration: currentWaitingDuration,
    };
  }

  private async findRawHandoff(id: string) {
    const res = await this.db.query(
      `SELECT * FROM task_handoffs WHERE id = $1 AND is_active = TRUE;`,
      [id],
    );
    if (res.rowCount === 0) {
      throw new NotFoundException(`Task handoff with ID '${id}' not found.`);
    }
    return res.rows[0];
  }
}
