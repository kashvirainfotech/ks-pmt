import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import { CreateDependencyDto } from "./dto/create-dependency.dto";
import { QueryDependencyDto } from "./dto/query-dependency.dto";

@Injectable()
export class DependenciesService {
  private readonly logger = new Logger(DependenciesService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Create a directed dependency or relationship link with DAG cycle validation
   */
  async createDependency(dto: CreateDependencyDto, userId: string) {
    if (dto.sourceTaskId === dto.targetTaskId) {
      throw new BadRequestException("Cannot create a self-dependency link");
    }

    const tasksExistQuery = `
      SELECT id, title, task_code, project_id, product_id, status_id
      FROM tasks
      WHERE id IN ($1, $2)
    `;
    const tasksRes = await this.db.query(tasksExistQuery, [
      dto.sourceTaskId,
      dto.targetTaskId,
    ]);

    if (tasksRes.rows.length < 2) {
      throw new NotFoundException("One or both tasks could not be found");
    }

    // Directed scheduling links (FINISH_TO_START, BLOCKS) enforce DAG cycle validation
    const isSchedulingLink =
      dto.linkType === "FINISH_TO_START" || dto.linkType === "BLOCKS";

    if (isSchedulingLink) {
      // Check if a path from targetTaskId to sourceTaskId already exists via scheduling links
      const cycleCheckQuery = `
        WITH RECURSIVE dependency_chain AS (
          SELECT target_task_id
          FROM task_dependencies
          WHERE source_task_id = $1 AND link_type IN ('FINISH_TO_START', 'BLOCKS')
          UNION
          SELECT td.target_task_id
          FROM task_dependencies td
          INNER JOIN dependency_chain dc ON dc.target_task_id = td.source_task_id
          WHERE td.link_type IN ('FINISH_TO_START', 'BLOCKS')
        )
        SELECT 1 FROM dependency_chain WHERE target_task_id = $2 LIMIT 1;
      `;
      const cycleRes = await this.db.query(cycleCheckQuery, [
        dto.targetTaskId,
        dto.sourceTaskId,
      ]);

      if (cycleRes.rows.length > 0) {
        throw new BadRequestException(
          "Circular dependency detected: adding this relationship would create a directed cycle",
        );
      }
    }

    // Insert relationship
    const insertQuery = `
      INSERT INTO task_dependencies (
        source_task_id, target_task_id, link_type, description, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $5)
      ON CONFLICT (source_task_id, target_task_id, link_type)
      DO UPDATE SET description = EXCLUDED.description, updated_by = EXCLUDED.updated_by, updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;
    const result = await this.db.query(insertQuery, [
      dto.sourceTaskId,
      dto.targetTaskId,
      dto.linkType,
      dto.description || null,
      userId,
    ]);

    // If scheduling link, evaluate whether target task should be marked is_blocked
    if (isSchedulingLink) {
      const sourceStatusQuery = `
        SELECT ts.is_terminal, ts.status_category
        FROM tasks t
        INNER JOIN task_statuses ts ON t.status_id = ts.id
        WHERE t.id = $1
      `;
      const statusRes = await this.db.query(sourceStatusQuery, [
        dto.sourceTaskId,
      ]);
      const sourceStatus = statusRes.rows[0];

      if (
        sourceStatus &&
        !sourceStatus.is_terminal &&
        sourceStatus.status_category !== "DONE"
      ) {
        await this.db.query(
          `UPDATE tasks SET is_blocked = TRUE WHERE id = $1`,
          [dto.targetTaskId],
        );
      }
    }

    return this.findOne(result.rows[0].id);
  }

  /**
   * Find single dependency by ID with enriched task details
   */
  async findOne(id: string) {
    const query = `
      SELECT 
        td.*,
        st.task_code AS source_task_code, st.title AS source_task_title,
        sts.status_name AS source_status_name, sts.color_hex AS source_status_color,
        tt.task_code AS target_task_code, tt.title AS target_task_title,
        tts.status_name AS target_status_name, tts.color_hex AS target_status_color
      FROM task_dependencies td
      INNER JOIN tasks st ON td.source_task_id = st.id
      INNER JOIN task_statuses sts ON st.status_id = sts.id
      INNER JOIN tasks tt ON td.target_task_id = tt.id
      INNER JOIN task_statuses tts ON tt.status_id = tts.id
      WHERE td.id = $1
    `;
    const res = await this.db.query(query, [id]);
    if (!res.rows.length) {
      throw new NotFoundException("Task dependency record not found");
    }
    return res.rows[0];
  }

  /**
   * Query dependencies with optional task filter
   */
  async findAll(query: QueryDependencyDto) {
    const params: any[] = [];
    const whereClauses: string[] = [];

    if (query.taskId) {
      params.push(query.taskId);
      whereClauses.push(
        `(td.source_task_id = $${params.length} OR td.target_task_id = $${params.length})`,
      );
    }

    if (query.linkType) {
      params.push(query.linkType);
      whereClauses.push(`td.link_type = $${params.length}`);
    }

    const where = whereClauses.length
      ? `WHERE ${whereClauses.join(" AND ")}`
      : "";

    const sql = `
      SELECT 
        td.*,
        st.task_code AS source_task_code, st.title AS source_task_title,
        sts.status_name AS source_status_name, sts.color_hex AS source_status_color,
        tt.task_code AS target_task_code, tt.title AS target_task_title,
        tts.status_name AS target_status_name, tts.color_hex AS target_status_color
      FROM task_dependencies td
      INNER JOIN tasks st ON td.source_task_id = st.id
      INNER JOIN task_statuses sts ON st.status_id = sts.id
      INNER JOIN tasks tt ON td.target_task_id = tt.id
      INNER JOIN task_statuses tts ON tt.status_id = tts.id
      ${where}
      ORDER BY td.created_at DESC
    `;
    const res = await this.db.query(sql, params);
    return res.rows;
  }

  /**
   * Get all outgoing and incoming (inverse) links for a given task
   */
  async findByTaskId(taskId: string) {
    // 1. Outgoing links (Task is source)
    const outgoingQuery = `
      SELECT 
        td.id, td.link_type, td.description, td.created_at,
        tt.id AS related_task_id, tt.task_code AS related_task_code, tt.title AS related_task_title,
        tt.priority AS related_task_priority, tt.planned_end_date,
        tts.status_name, tts.color_hex AS status_color, tts.is_terminal, tts.status_category,
        'OUTGOING' AS direction,
        CASE td.link_type
          WHEN 'BLOCKS' THEN 'Blocks'
          WHEN 'FINISH_TO_START' THEN 'Must finish before (FS)'
          WHEN 'RELATED_TO' THEN 'Related to'
          WHEN 'DUPLICATE_OF' THEN 'Duplicates'
          WHEN 'CAUSES' THEN 'Causes'
          WHEN 'FIXED_BY' THEN 'Fixed by'
          WHEN 'TESTED_BY' THEN 'Tested by'
          WHEN 'RELEASED_IN' THEN 'Released in'
          ELSE td.link_type
        END AS display_label
      FROM task_dependencies td
      INNER JOIN tasks tt ON td.target_task_id = tt.id
      INNER JOIN task_statuses tts ON tt.status_id = tts.id
      WHERE td.source_task_id = $1
      ORDER BY td.created_at ASC
    `;

    // 2. Incoming links (Task is target -> Inverse display)
    const incomingQuery = `
      SELECT 
        td.id, td.link_type, td.description, td.created_at,
        st.id AS related_task_id, st.task_code AS related_task_code, st.title AS related_task_title,
        st.priority AS related_task_priority, st.planned_end_date,
        sts.status_name, sts.color_hex AS status_color, sts.is_terminal, sts.status_category,
        'INCOMING' AS direction,
        CASE td.link_type
          WHEN 'BLOCKS' THEN 'Blocked by'
          WHEN 'FINISH_TO_START' THEN 'Depends on (FS)'
          WHEN 'RELATED_TO' THEN 'Related to'
          WHEN 'DUPLICATE_OF' THEN 'Duplicated by'
          WHEN 'CAUSES' THEN 'Caused by'
          WHEN 'FIXED_BY' THEN 'Fixes'
          WHEN 'TESTED_BY' THEN 'Tests'
          WHEN 'RELEASED_IN' THEN 'Releases'
          ELSE td.link_type
        END AS display_label
      FROM task_dependencies td
      INNER JOIN tasks st ON td.source_task_id = st.id
      INNER JOIN task_statuses sts ON st.status_id = sts.id
      WHERE td.target_task_id = $1
      ORDER BY td.created_at ASC
    `;

    const [outgoingRes, incomingRes] = await Promise.all([
      this.db.query(outgoingQuery, [taskId]),
      this.db.query(incomingQuery, [taskId]),
    ]);

    return {
      taskId,
      outgoing: outgoingRes.rows,
      incoming: incomingRes.rows,
      totalCount: outgoingRes.rows.length + incomingRes.rows.length,
    };
  }

  /**
   * Delete dependency and re-evaluate target task blocked status
   */
  async removeDependency(id: string, userId: string) {
    const depRes = await this.db.query(
      `SELECT * FROM task_dependencies WHERE id = $1`,
      [id],
    );
    if (!depRes.rows.length) {
      throw new NotFoundException("Dependency link not found");
    }
    const dep = depRes.rows[0];

    await this.db.query(`DELETE FROM task_dependencies WHERE id = $1`, [id]);

    // Recompute is_blocked on target task if it was a scheduling link
    if (
      dep.link_type === "FINISH_TO_START" ||
      dep.link_type === "BLOCKS"
    ) {
      await this.recalculateTaskBlockedStatus(dep.target_task_id);
    }

    return { success: true, message: "Dependency removed successfully", id };
  }

  /**
   * Get dependency map with upstream prerequisites, downstream impact, and anomaly flags
   */
  async getDependencyMap(taskId: string) {
    const taskRes = await this.db.query(
      `SELECT t.id, t.task_code, t.title, t.project_id, t.product_id, t.is_blocked,
              ts.status_name, ts.color_hex AS status_color, ts.is_terminal, ts.status_category,
              t.planned_end_date
       FROM tasks t
       INNER JOIN task_statuses ts ON t.status_id = ts.id
       WHERE t.id = $1`,
      [taskId],
    );

    if (!taskRes.rows.length) {
      throw new NotFoundException("Task not found");
    }
    const rootTask = taskRes.rows[0];

    // Upstream prerequisites (Tasks that this task depends on / is blocked by)
    const upstreamQuery = `
      SELECT 
        td.id AS link_id, td.link_type,
        st.id, st.task_code, st.title, st.project_id, st.product_id, st.is_blocked,
        st.planned_end_date, sts.status_name, sts.color_hex AS status_color,
        sts.is_terminal, sts.status_category,
        (sts.is_terminal OR sts.status_category = 'DONE') AS is_completed,
        (st.planned_end_date IS NOT NULL AND st.planned_end_date < CURRENT_TIMESTAMP AND NOT (sts.is_terminal OR sts.status_category = 'DONE')) AS is_overdue,
        (td.link_type IN ('BLOCKS', 'FINISH_TO_START') AND (sts.is_terminal OR sts.status_category = 'DONE')) AS stale_blocking_flag,
        (st.project_id IS DISTINCT FROM $2 OR st.product_id IS DISTINCT FROM $3) AS is_cross_project
      FROM task_dependencies td
      INNER JOIN tasks st ON td.source_task_id = st.id
      INNER JOIN task_statuses sts ON st.status_id = sts.id
      WHERE td.target_task_id = $1
    `;

    // Downstream impact (Tasks that depend on this task / are blocked by this task)
    const downstreamQuery = `
      SELECT 
        td.id AS link_id, td.link_type,
        tt.id, tt.task_code, tt.title, tt.project_id, tt.product_id, tt.is_blocked,
        tt.planned_end_date, tts.status_name, tts.color_hex AS status_color,
        tts.is_terminal, tts.status_category,
        (tts.is_terminal OR tts.status_category = 'DONE') AS is_completed,
        (tt.planned_end_date IS NOT NULL AND tt.planned_end_date < CURRENT_TIMESTAMP AND NOT (tts.is_terminal OR tts.status_category = 'DONE')) AS is_overdue,
        (tt.project_id IS DISTINCT FROM $2 OR tt.product_id IS DISTINCT FROM $3) AS is_cross_project
      FROM task_dependencies td
      INNER JOIN tasks tt ON td.target_task_id = tt.id
      INNER JOIN task_statuses tts ON tt.status_id = tts.id
      WHERE td.source_task_id = $1
    `;

    const [upstreamRes, downstreamRes] = await Promise.all([
      this.db.query(upstreamQuery, [
        taskId,
        rootTask.project_id,
        rootTask.product_id,
      ]),
      this.db.query(downstreamQuery, [
        taskId,
        rootTask.project_id,
        rootTask.product_id,
      ]),
    ]);

    return {
      rootTask,
      prerequisites: upstreamRes.rows,
      downstreamImpact: downstreamRes.rows,
      prerequisiteCount: upstreamRes.rows.length,
      downstreamCount: downstreamRes.rows.length,
      hasOverduePrerequisites: upstreamRes.rows.some((p) => p.is_overdue),
      hasStaleBlockingFlags: upstreamRes.rows.some(
        (p) => p.stale_blocking_flag,
      ),
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
