import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import { CreateBlockerDto } from "./dto/create-blocker.dto";
import { UpdateBlockerDto } from "./dto/update-blocker.dto";
import { ResolveBlockerDto } from "./dto/resolve-blocker.dto";
import { QueryBlockerRadarDto } from "./dto/query-blocker-radar.dto";

export interface BlockerInterval {
  started_at: Date | string;
  resolved_at: Date | string | null;
}

/**
 * Calculates non-overlapping blocked duration in minutes from an array of episodes
 */
export function calculateNonOverlappingBlockedMinutes(
  episodes: BlockerInterval[],
  now: Date = new Date(),
): number {
  if (!episodes || episodes.length === 0) return 0;

  const intervals = episodes
    .map((ep) => ({
      start: new Date(ep.started_at).getTime(),
      end: ep.resolved_at ? new Date(ep.resolved_at).getTime() : now.getTime(),
    }))
    .filter(
      (iv) =>
        !Number.isNaN(iv.start) &&
        !Number.isNaN(iv.end) &&
        iv.end >= iv.start,
    )
    .sort((a, b) => a.start - b.start);

  if (!intervals.length) return 0;

  // Merge overlapping or contiguous intervals
  const merged: Array<{ start: number; end: number }> = [intervals[0]];
  for (let i = 1; i < intervals.length; i++) {
    const current = intervals[i];
    const last = merged[merged.length - 1];
    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push({ ...current });
    }
  }

  const totalMs = merged.reduce((sum, iv) => sum + (iv.end - iv.start), 0);
  return Math.round(totalMs / (1000 * 60));
}

@Injectable()
export class BlockersService {
  private readonly logger = new Logger(BlockersService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Log a new blocker episode against a task
   */
  async createBlocker(dto: CreateBlockerDto, userId: string) {
    const taskRes = await this.db.query(
      `SELECT id, title, task_code FROM tasks WHERE id = $1`,
      [dto.taskId],
    );
    if (!taskRes.rows.length) {
      throw new NotFoundException("Target task not found");
    }

    if (dto.blockingTaskId) {
      if (dto.blockingTaskId === dto.taskId) {
        throw new BadRequestException("Task cannot be blocked by itself");
      }
      const blockingTaskRes = await this.db.query(
        `SELECT id FROM tasks WHERE id = $1`,
        [dto.blockingTaskId],
      );
      if (!blockingTaskRes.rows.length) {
        throw new NotFoundException("Linked blocking task not found");
      }
    }

    const insertQuery = `
      INSERT INTO task_blocker_episodes (
        task_id, owner_user_id, blocking_task_id, reason, next_action,
        follow_up_date, expected_resolution_date, category, priority, notes,
        status, is_active, created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        'ACTIVE', TRUE, $11, $11
      )
      RETURNING *;
    `;

    const result = await this.db.query(insertQuery, [
      dto.taskId,
      dto.ownerUserId || null,
      dto.blockingTaskId || null,
      dto.reason,
      dto.nextAction || null,
      dto.followUpDate || null,
      dto.expectedResolutionDate || null,
      dto.category || "TECHNICAL",
      dto.priority || "MEDIUM",
      dto.notes || null,
      userId,
    ]);

    // Mark task as blocked
    await this.db.query(
      `UPDATE tasks SET is_blocked = TRUE WHERE id = $1`,
      [dto.taskId],
    );

    return this.findOne(result.rows[0].id);
  }

  /**
   * Fetch single blocker episode by ID
   */
  async findOne(id: string) {
    const query = `
      SELECT 
        be.*,
        t.task_code, t.title AS task_code_title,
        CONCAT(u.first_name, ' ', u.last_name) AS owner_name,
        u.avatar_s3_key AS owner_avatar,
        bt.task_code AS blocking_task_code, bt.title AS blocking_task_title,
        CONCAT(ru.first_name, ' ', ru.last_name) AS resolved_by_name
      FROM task_blocker_episodes be
      INNER JOIN tasks t ON be.task_id = t.id
      LEFT JOIN users u ON be.owner_user_id = u.id
      LEFT JOIN tasks bt ON be.blocking_task_id = bt.id
      LEFT JOIN users ru ON be.resolved_by = ru.id
      WHERE be.id = $1
    `;
    const res = await this.db.query(query, [id]);
    if (!res.rows.length) {
      throw new NotFoundException("Blocker episode record not found");
    }
    return res.rows[0];
  }

  /**
   * Resolve or Dismiss a blocker episode
   */
  async resolveBlocker(id: string, dto: ResolveBlockerDto, userId: string) {
    const episode = await this.findOne(id);
    if (episode.status !== "ACTIVE") {
      throw new BadRequestException("This blocker episode has already been resolved or dismissed");
    }

    const status = dto.status || "RESOLVED";

    const updateQuery = `
      UPDATE task_blocker_episodes
      SET status = $1,
          resolved_at = CURRENT_TIMESTAMP,
          resolved_by = $2,
          resolution_notes = $3,
          updated_by = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *;
    `;
    const result = await this.db.query(updateQuery, [
      status,
      userId,
      dto.resolutionNotes || null,
      id,
    ]);

    // Recompute task blocked status
    await this.recalculateTaskBlockedStatus(episode.task_id);

    return this.findOne(id);
  }

  /**
   * Update details of an existing blocker episode
   */
  async updateBlocker(id: string, dto: UpdateBlockerDto, userId: string) {
    const episode = await this.findOne(id);

    const updateQuery = `
      UPDATE task_blocker_episodes
      SET owner_user_id = COALESCE($1, owner_user_id),
          blocking_task_id = COALESCE($2, blocking_task_id),
          reason = COALESCE($3, reason),
          next_action = COALESCE($4, next_action),
          follow_up_date = COALESCE($5, follow_up_date),
          expected_resolution_date = COALESCE($6, expected_resolution_date),
          category = COALESCE($7, category),
          priority = COALESCE($8, priority),
          notes = COALESCE($9, notes),
          updated_by = $10,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *;
    `;

    await this.db.query(updateQuery, [
      dto.ownerUserId !== undefined ? dto.ownerUserId : null,
      dto.blockingTaskId !== undefined ? dto.blockingTaskId : null,
      dto.reason,
      dto.nextAction,
      dto.followUpDate,
      dto.expectedResolutionDate,
      dto.category,
      dto.priority,
      dto.notes,
      userId,
      id,
    ]);

    return this.findOne(id);
  }

  /**
   * Delete a blocker episode
   */
  async deleteBlocker(id: string, userId: string) {
    const episode = await this.findOne(id);
    await this.db.query(`DELETE FROM task_blocker_episodes WHERE id = $1`, [id]);
    await this.recalculateTaskBlockedStatus(episode.task_id);
    return { success: true, message: "Blocker episode deleted", id };
  }

  /**
   * Get all blocker episodes for a specific task and non-overlapping duration
   */
  async getBlockersForTask(taskId: string) {
    const query = `
      SELECT 
        be.*,
        CONCAT(u.first_name, ' ', u.last_name) AS owner_name,
        u.avatar_s3_key AS owner_avatar,
        bt.task_code AS blocking_task_code, bt.title AS blocking_task_title,
        CONCAT(ru.first_name, ' ', ru.last_name) AS resolved_by_name,
        ROUND(EXTRACT(EPOCH FROM (COALESCE(be.resolved_at, CURRENT_TIMESTAMP) - be.started_at)) / 60) AS duration_minutes
      FROM task_blocker_episodes be
      LEFT JOIN users u ON be.owner_user_id = u.id
      LEFT JOIN tasks bt ON be.blocking_task_id = bt.id
      LEFT JOIN users ru ON be.resolved_by = ru.id
      WHERE be.task_id = $1 AND be.is_active = TRUE
      ORDER BY be.started_at DESC
    `;
    const res = await this.db.query(query, [taskId]);
    const episodes = res.rows;

    const totalBlockedMinutes = calculateNonOverlappingBlockedMinutes(episodes);
    const activeEpisodes = episodes.filter((ep) => ep.status === "ACTIVE");

    return {
      taskId,
      totalEpisodesCount: episodes.length,
      activeEpisodesCount: activeEpisodes.length,
      isCurrentlyBlocked: activeEpisodes.length > 0,
      totalNonOverlappingBlockedMinutes: totalBlockedMinutes,
      episodes,
    };
  }

  /**
   * Query the Blocker Radar dashboard
   */
  async getBlockerRadar(query: QueryBlockerRadarDto) {
    const params: any[] = [];
    const whereClauses: string[] = [`be.status = 'ACTIVE'`, `be.is_active = TRUE`];

    if (query.projectId) {
      params.push(query.projectId);
      whereClauses.push(`t.project_id = $${params.length}`);
    }

    if (query.productId) {
      params.push(query.productId);
      whereClauses.push(`t.product_id = $${params.length}`);
    }

    if (query.sprintId) {
      params.push(query.sprintId);
      whereClauses.push(`t.sprint_id = $${params.length}`);
    }

    if (query.category) {
      params.push(query.category);
      whereClauses.push(`be.category = $${params.length}`);
    }

    if (query.priority) {
      params.push(query.priority);
      whereClauses.push(`be.priority = $${params.length}`);
    }

    if (query.minAgeDays) {
      params.push(query.minAgeDays);
      whereClauses.push(
        `EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - be.started_at)) / 86400 >= $${params.length}`,
      );
    }

    const sql = `
      SELECT 
        be.*,
        t.task_code, t.title AS task_title, t.priority AS task_priority,
        t.project_id, t.product_id, t.sprint_id,
        p.project_name, prd.product_name, s.sprint_name,
        CONCAT(u.first_name, ' ', u.last_name) AS owner_name,
        u.avatar_s3_key AS owner_avatar,
        bt.task_code AS blocking_task_code, bt.title AS blocking_task_title,
        FLOOR(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - be.started_at)) / 86400) AS age_days,
        ROUND(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - be.started_at)) / 3600, 1) AS age_hours,
        (
          FLOOR(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - be.started_at)) / 86400) >= 3 
          OR (be.expected_resolution_date IS NOT NULL AND be.expected_resolution_date < CURRENT_TIMESTAMP)
        ) AS is_age_breached,
        (be.follow_up_date IS NOT NULL AND be.follow_up_date < CURRENT_TIMESTAMP) AS is_follow_up_due
      FROM task_blocker_episodes be
      INNER JOIN tasks t ON be.task_id = t.id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN products prd ON t.product_id = prd.id
      LEFT JOIN sprints s ON t.sprint_id = s.id
      LEFT JOIN users u ON be.owner_user_id = u.id
      LEFT JOIN tasks bt ON be.blocking_task_id = bt.id
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY 
        CASE be.priority 
          WHEN 'CRITICAL' THEN 1 
          WHEN 'HIGH' THEN 2 
          WHEN 'MEDIUM' THEN 3 
          ELSE 4 
        END ASC,
        be.started_at ASC
    `;

    const res = await this.db.query(sql, params);
    const activeBlockers = res.rows;

    // Aggregates
    const criticalCount = activeBlockers.filter(
      (b) => b.priority === "CRITICAL",
    ).length;
    const breachedCount = activeBlockers.filter(
      (b) => b.is_age_breached,
    ).length;
    const oldestAgeDays = activeBlockers.length
      ? Math.max(...activeBlockers.map((b) => Number(b.age_days || 0)))
      : 0;

    // Grouping by category
    const groupedByCategory: Record<string, number> = {};
    // Grouping by priority
    const groupedByPriority: Record<string, number> = {};

    for (const b of activeBlockers) {
      groupedByCategory[b.category] = (groupedByCategory[b.category] || 0) + 1;
      groupedByPriority[b.priority] = (groupedByPriority[b.priority] || 0) + 1;
    }

    return {
      totalActiveBlockers: activeBlockers.length,
      criticalCount,
      breachedCount,
      oldestAgeDays,
      groupedByCategory,
      groupedByPriority,
      activeBlockers,
    };
  }

  /**
   * Recalculate whether a task is still blocked:
   * A task is unblocked if and only if:
   * 1. There are 0 ACTIVE blocker episodes (status = 'ACTIVE' and resolved_at IS NULL).
   * 2. There are 0 unresolved incoming blocking links (source task is not in terminal/DONE status).
   */
  async recalculateTaskBlockedStatus(taskId: string): Promise<boolean> {
    const activeEpisodesRes = await this.db.query(
      `SELECT COUNT(*) AS count FROM task_blocker_episodes 
       WHERE task_id = $1 AND status = 'ACTIVE' AND resolved_at IS NULL AND is_active = TRUE`,
      [taskId],
    );
    const activeEpisodesCount = Number(activeEpisodesRes.rows[0]?.count || 0);

    const activePrereqRes = await this.db.query(
      `SELECT COUNT(*) AS count 
       FROM task_dependencies td
       INNER JOIN tasks st ON td.source_task_id = st.id
       INNER JOIN task_statuses sts ON st.status_id = sts.id
       WHERE td.target_task_id = $1 
         AND td.link_type IN ('BLOCKS', 'FINISH_TO_START')
         AND sts.is_terminal = FALSE 
         AND sts.status_category <> 'DONE'`,
      [taskId],
    );
    const activePrereqCount = Number(activePrereqRes.rows[0]?.count || 0);

    const isBlocked = activeEpisodesCount > 0 || activePrereqCount > 0;

    await this.db.query(`UPDATE tasks SET is_blocked = $1 WHERE id = $2`, [
      isBlocked,
      taskId,
    ]);

    return isBlocked;
  }
}
