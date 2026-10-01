import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { QueryActivityDto, ActivityTimeFilter } from './dto/query-activity.dto';
import { CreateBaselineDto } from './dto/create-baseline.dto';
import { SaveActivityQueryDto } from './dto/saved-query.dto';

export interface WhatChangedResponse {
  timeWindow: {
    filterType: string;
    windowStart: string;
    windowEnd: string;
    baseline?: any;
    fallbackUsed?: boolean;
  };
  metrics: {
    sourceLinkedEventCount: number;
    distinctItemCount: number;
    scopeAdditionsCount: number;
    scopeRemovalsCount: number;
    statusTransitionsCount: number;
    blockerEventsCount: number;
    requirementChangesCount: number;
    documentRevisionsCount: number;
  };
  missingHistory: {
    detected: boolean;
    earliestTrackedAt?: string;
    note?: string;
  };
  summaryNarrative: string;
  categories: {
    scopeAdditions: any[];
    scopeRemovals: any[];
    statusTransitions: any[];
    blockerEvents: any[];
    requirementChanges: any[];
    documentRevisions: any[];
  };
  isClientSafe: boolean;
}

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(private readonly db: DatabaseService) {}

  // ==========================================
  // COLLAB-004: "What Changed?" Engine
  // ==========================================

  async getWhatChangedSummary(userId: string, dto: QueryActivityDto): Promise<WhatChangedResponse> {
    const isClientSafe = dto.isClientSafe || false;

    // 1. Resolve Time Window
    let windowStart: Date;
    const windowEnd = dto.endDate ? new Date(dto.endDate) : new Date();
    let baselineData: any = null;
    let fallbackUsed = false;

    const filterType = dto.timeFilterType || ActivityTimeFilter.LAST_LOGIN;

    if (filterType === ActivityTimeFilter.LAST_LOGIN) {
      const userRes = await this.db.query(
        `SELECT last_login_at FROM users WHERE id = $1;`,
        [userId],
      );
      if (userRes.rows.length > 0 && userRes.rows[0].last_login_at) {
        windowStart = new Date(userRes.rows[0].last_login_at);
      } else {
        // Fallback to last 24h if user has no prior recorded login
        windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
        fallbackUsed = true;
      }
    } else if (filterType === ActivityTimeFilter.HOURS_24) {
      windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
    } else if (filterType === ActivityTimeFilter.DAYS_7) {
      windowStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (filterType === ActivityTimeFilter.DAYS_14) {
      windowStart = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    } else if (filterType === ActivityTimeFilter.DAYS_30) {
      windowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    } else if (filterType === ActivityTimeFilter.SINCE_BASELINE) {
      if (!dto.baselineId) {
        throw new BadRequestException('baselineId is required when timeFilterType is SINCE_BASELINE');
      }
      const bRes = await this.db.query(
        `SELECT * FROM change_activity_baselines WHERE id = $1;`,
        [dto.baselineId],
      );
      if (bRes.rows.length === 0) {
        throw new NotFoundException(`Baseline not found: ${dto.baselineId}`);
      }
      baselineData = bRes.rows[0];
      windowStart = new Date(baselineData.baseline_timestamp);
    } else if (filterType === ActivityTimeFilter.CUSTOM_RANGE) {
      if (!dto.startDate) {
        throw new BadRequestException('startDate is required for CUSTOM_RANGE filter');
      }
      windowStart = new Date(dto.startDate);
    } else {
      windowStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    // 2. Missing-History Disclosure Check
    const earliestAuditRes = await this.db.query(
      `SELECT MIN(created_at) AS earliest_at FROM audit_logs;`,
    );
    const earliestRecordedAt = earliestAuditRes.rows[0]?.earliest_at
      ? new Date(earliestAuditRes.rows[0].earliest_at)
      : null;

    let missingHistoryDetected = false;
    let missingHistoryNote: string | undefined = undefined;

    if (earliestRecordedAt && windowStart < earliestRecordedAt) {
      missingHistoryDetected = true;
      missingHistoryNote = `The requested window starts on ${windowStart.toISOString().split('T')[0]}, but the earliest retained audit activity began on ${earliestRecordedAt.toISOString().split('T')[0]}. Prior events are unrecorded or pruned.`;
    }

    // 3. Scope Filters
    const scopeConditions: string[] = [];
    const scopeParams: any[] = [];

    if (dto.scopeType === 'PROJECT' && dto.scopeId) {
      scopeParams.push(dto.scopeId);
      scopeConditions.push(`t.project_id = $${scopeParams.length}`);
    } else if (dto.scopeType === 'PRODUCT' && dto.scopeId) {
      scopeParams.push(dto.scopeId);
      scopeConditions.push(`t.product_id = $${scopeParams.length}`);
    } else if (dto.scopeType === 'SPRINT' && dto.scopeId) {
      scopeParams.push(dto.scopeId);
      scopeConditions.push(`t.sprint_id = $${scopeParams.length}`);
    }

    const taskScopeWhere = scopeConditions.length > 0 ? `AND ${scopeConditions.join(' AND ')}` : '';

    // 4. Query Events:
    // A. Scope Additions (Tasks created in window)
    const additionsRes = await this.db.query(`
      SELECT 
        t.id, t.task_code, t.title, t.hierarchy_level, t.priority,
        t.created_at, t.created_by,
        CONCAT(u.first_name, ' ', u.last_name) AS creator_name,
        ts.status_name,
        'SCOPE_ADDITION' AS event_category
      FROM tasks t
      LEFT JOIN users u ON u.id = t.created_by
      LEFT JOIN task_statuses ts ON ts.id = t.status_id
      WHERE t.created_at >= $1 AND t.created_at <= $2
        ${taskScopeWhere}
      ORDER BY t.created_at DESC
      LIMIT 100;
    `, [windowStart, windowEnd, ...scopeParams]);
    const scopeAdditions = additionsRes.rows;

    // B. Scope Removals (Tasks removed from sprint / deleted)
    const removalsRes = await this.db.query(`
      SELECT 
        l.task_id AS id,
        t.task_code,
        t.title,
        l.action_type,
        l.reason,
        l.created_at,
        CONCAT(u.first_name, ' ', u.last_name) AS actor_name,
        'SCOPE_REMOVAL' AS event_category
      FROM sprint_task_scope_ledgers l
      LEFT JOIN tasks t ON t.id = l.task_id
      LEFT JOIN users u ON u.id = l.created_by
      WHERE l.action_type IN ('REMOVED', 'DEFERRED', 'ROLLED_OVER')
        AND l.created_at >= $1 AND l.created_at <= $2
      ORDER BY l.created_at DESC
      LIMIT 50;
    `, [windowStart, windowEnd]);
    const scopeRemovals = removalsRes.rows;

    // C. Status Transitions
    const statusTransitionsRes = await this.db.query(`
      SELECT 
        a.id AS event_id,
        a.record_id AS id,
        a.created_at,
        a.user_id,
        CONCAT(u.first_name, ' ', u.last_name) AS actor_name,
        t.task_code,
        t.title,
        a.old_values->>'status_name' AS from_status,
        a.new_values->>'status_name' AS to_status,
        'STATUS_TRANSITION' AS event_category
      FROM audit_logs a
      LEFT JOIN tasks t ON t.id = a.record_id
      LEFT JOIN users u ON u.id = a.user_id
      WHERE a.action_type IN ('STATUS_CHANGED', 'TASK_STATUS_CHANGED')
        AND a.created_at >= $1 AND a.created_at <= $2
        ${taskScopeWhere}
      ORDER BY a.created_at DESC
      LIMIT 150;
    `, [windowStart, windowEnd, ...scopeParams]);
    const statusTransitions = statusTransitionsRes.rows;

    // D. Blocker Events
    let blockerEvents: any[] = [];
    if (!isClientSafe) {
      const blockersRes = await this.db.query(`
        SELECT 
          b.id AS episode_id,
          b.task_id AS id,
          t.task_code,
          t.title,
          b.reason_category,
          b.blocker_description,
          b.status AS blocker_status,
          b.declared_at,
          b.cleared_at,
          CONCAT(u.first_name, ' ', u.last_name) AS declared_by_name,
          'BLOCKER_EVENT' AS event_category
        FROM task_blocker_episodes b
        LEFT JOIN tasks t ON t.id = b.task_id
        LEFT JOIN users u ON u.id = b.created_by
        WHERE (b.declared_at >= $1 AND b.declared_at <= $2)
           OR (b.cleared_at IS NOT NULL AND b.cleared_at >= $1 AND b.cleared_at <= $2)
        ORDER BY b.declared_at DESC
        LIMIT 50;
      `, [windowStart, windowEnd]);
      blockerEvents = blockersRes.rows;
    }

    // E. Requirement & Spec Changes
    const reqRes = await this.db.query(`
      SELECT 
        r.id,
        r.requirement_code,
        r.title,
        r.version_number,
        r.status,
        r.updated_at AS created_at,
        CONCAT(u.first_name, ' ', u.last_name) AS actor_name,
        'REQUIREMENT_CHANGE' AS event_category
      FROM requirements r
      LEFT JOIN users u ON u.id = r.updated_by
      WHERE r.updated_at >= $1 AND r.updated_at <= $2
      ORDER BY r.updated_at DESC
      LIMIT 50;
    `, [windowStart, windowEnd]);
    const requirementChanges = reqRes.rows;

    // F. Knowledge Document / ADR Revisions
    let docCondition = `WHERE r.created_at >= $1 AND r.created_at <= $2`;
    if (isClientSafe) {
      docCondition += ` AND d.audience IN ('CLIENT_SHARED', 'PUBLIC_COMMUNITY')`;
    }
    const docRes = await this.db.query(`
      SELECT 
        r.id,
        r.document_id,
        d.document_code,
        d.title,
        r.revision_number,
        r.summary_of_changes,
        r.created_at,
        CONCAT(u.first_name, ' ', u.last_name) AS author_name,
        d.audience,
        'DOCUMENT_REVISION' AS event_category
      FROM knowledge_document_revisions r
      JOIN knowledge_documents d ON d.id = r.document_id
      LEFT JOIN users u ON u.id = r.author_user_id
      ${docCondition}
      ORDER BY r.created_at DESC
      LIMIT 50;
    `, [windowStart, windowEnd]);
    const documentRevisions = docRes.rows;

    // 5. Compute Source-Linked Event Count vs Distinct Affected Item Count
    const allEvents = [
      ...scopeAdditions,
      ...scopeRemovals,
      ...statusTransitions,
      ...blockerEvents,
      ...requirementChanges,
      ...documentRevisions,
    ];

    const sourceLinkedEventCount = allEvents.length;
    const distinctItemIds = new Set<string>();
    allEvents.forEach((e) => {
      if (e.id) distinctItemIds.add(String(e.id));
      if (e.document_id) distinctItemIds.add(String(e.document_id));
    });
    const distinctItemCount = distinctItemIds.size;

    // 6. Generate Deterministic Client-Safe Summary Narrative (Without AI)
    const summaryNarrative = this.generateDeterministicSummary({
      isClientSafe,
      windowStart,
      windowEnd,
      distinctItemCount,
      sourceLinkedEventCount,
      additionsCount: scopeAdditions.length,
      removalsCount: scopeRemovals.length,
      transitionsCount: statusTransitions.length,
      blockersCount: blockerEvents.length,
      reqChangesCount: requirementChanges.length,
      docRevisionsCount: documentRevisions.length,
      baselineTitle: baselineData?.title,
    });

    return {
      timeWindow: {
        filterType,
        windowStart: windowStart.toISOString(),
        windowEnd: windowEnd.toISOString(),
        baseline: baselineData,
        fallbackUsed,
      },
      metrics: {
        sourceLinkedEventCount,
        distinctItemCount,
        scopeAdditionsCount: scopeAdditions.length,
        scopeRemovalsCount: scopeRemovals.length,
        statusTransitionsCount: statusTransitions.length,
        blockerEventsCount: blockerEvents.length,
        requirementChangesCount: requirementChanges.length,
        documentRevisionsCount: documentRevisions.length,
      },
      missingHistory: {
        detected: missingHistoryDetected,
        earliestTrackedAt: earliestRecordedAt?.toISOString(),
        note: missingHistoryNote,
      },
      summaryNarrative,
      categories: {
        scopeAdditions,
        scopeRemovals,
        statusTransitions,
        blockerEvents,
        requirementChanges,
        documentRevisions,
      },
      isClientSafe,
    };
  }

  private generateDeterministicSummary(params: {
    isClientSafe: boolean;
    windowStart: Date;
    windowEnd: Date;
    distinctItemCount: number;
    sourceLinkedEventCount: number;
    additionsCount: number;
    removalsCount: number;
    transitionsCount: number;
    blockersCount: number;
    reqChangesCount: number;
    docRevisionsCount: number;
    baselineTitle?: string;
  }): string {
    const formattedStart = params.windowStart.toLocaleDateString();
    const formattedEnd = params.windowEnd.toLocaleDateString();
    const contextPrefix = params.baselineTitle
      ? `Compared against baseline "${params.baselineTitle}"`
      : `From ${formattedStart} to ${formattedEnd}`;

    if (params.isClientSafe) {
      return (
        `${contextPrefix}, a total of ${params.distinctItemCount} distinct deliverables were progressed across ${params.sourceLinkedEventCount} tracked milestone events. ` +
        `Deliverable status advancements accounted for ${params.transitionsCount} transitions. ` +
        `${params.reqChangesCount} requirement criteria updates and ${params.docRevisionsCount} published specification documents were finalized for review.`
      );
    }

    return (
      `${contextPrefix}, ${params.distinctItemCount} distinct work items experienced ${params.sourceLinkedEventCount} recorded lifecycle events. ` +
      `Breakdown: ${params.additionsCount} scope additions, ${params.removalsCount} scope removals, ` +
      `${params.transitionsCount} workflow transitions, ${params.blockersCount} blocker episode changes, ` +
      `${params.reqChangesCount} requirement revisions, and ${params.docRevisionsCount} knowledge document revisions.`
    );
  }

  // ==========================================
  // COLLAB-004: Baselines Management
  // ==========================================

  async createBaseline(userId: string, dto: CreateBaselineDto) {
    // 1. Capture current snapshot of scope
    let snapshotData: any = {};
    if (dto.scopeType === 'SPRINT') {
      const taskStatsRes = await this.db.query(`
        SELECT COUNT(*) AS task_count, COALESCE(SUM(story_points), 0) AS total_points,
               ARRAY_AGG(id) AS task_ids
        FROM tasks
        WHERE sprint_id = $1 AND is_active = TRUE;
      `, [dto.scopeId]);
      snapshotData = {
        taskCount: parseInt(taskStatsRes.rows[0].task_count, 10),
        totalPoints: parseFloat(taskStatsRes.rows[0].total_points),
        committedTaskIds: taskStatsRes.rows[0].task_ids || [],
      };
    } else if (dto.scopeType === 'PROJECT') {
      const projStatsRes = await this.db.query(`
        SELECT COUNT(*) AS task_count, COALESCE(SUM(estimated_hours), 0) AS total_hours
        FROM tasks
        WHERE project_id = $1 AND is_active = TRUE;
      `, [dto.scopeId]);
      snapshotData = {
        taskCount: parseInt(projStatsRes.rows[0].task_count, 10),
        totalHours: parseFloat(projStatsRes.rows[0].total_hours),
      };
    }

    const query = `
      INSERT INTO change_activity_baselines (
        baseline_code, title, description, scope_type, scope_id,
        snapshot_data, is_frozen, is_active, created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE, $7, $7)
      RETURNING *;
    `;

    const res = await this.db.query(query, [
      dto.baselineCode,
      dto.title,
      dto.description || null,
      dto.scopeType,
      dto.scopeId,
      JSON.stringify(snapshotData),
      userId,
    ]);

    return res.rows[0];
  }

  async getBaselines(scopeType?: string, scopeId?: string) {
    const conditions: string[] = ['is_active = TRUE'];
    const params: any[] = [];

    if (scopeType) {
      params.push(scopeType);
      conditions.push(`scope_type = $${params.length}`);
    }
    if (scopeId) {
      params.push(scopeId);
      conditions.push(`scope_id = $${params.length}`);
    }

    const query = `
      SELECT b.*, CONCAT(u.first_name, ' ', u.last_name) AS creator_name
      FROM change_activity_baselines b
      LEFT JOIN users u ON u.id = b.created_by
      WHERE ${conditions.join(' AND ')}
      ORDER BY b.baseline_timestamp DESC;
    `;

    const res = await this.db.query(query, params);
    return res.rows;
  }

  // ==========================================
  // COLLAB-004: Saved Activity Queries
  // ==========================================

  async saveQuery(userId: string, dto: SaveActivityQueryDto) {
    const query = `
      INSERT INTO user_activity_saved_queries (
        user_id, query_name, time_filter_type, baseline_id, scope_type,
        scope_id, is_client_safe, category_filters, is_active, created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $1, $1)
      RETURNING *;
    `;

    const res = await this.db.query(query, [
      userId,
      dto.queryName,
      dto.timeFilterType,
      dto.baselineId || null,
      dto.scopeType || null,
      dto.scopeId || null,
      dto.isClientSafe || false,
      JSON.stringify(dto.categoryFilters || []),
    ]);

    return res.rows[0];
  }

  async getSavedQueries(userId: string) {
    const res = await this.db.query(`
      SELECT q.*, b.title AS baseline_title
      FROM user_activity_saved_queries q
      LEFT JOIN change_activity_baselines b ON b.id = q.baseline_id
      WHERE q.user_id = $1 AND q.is_active = TRUE
      ORDER BY q.created_at DESC;
    `, [userId]);
    return res.rows;
  }

  async deleteSavedQuery(userId: string, queryId: string) {
    const res = await this.db.query(`
      DELETE FROM user_activity_saved_queries
      WHERE id = $1 AND user_id = $2
      RETURNING *;
    `, [queryId, userId]);
    return { success: true, deleted: res.rowCount > 0 };
  }
}
