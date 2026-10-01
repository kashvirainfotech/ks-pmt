import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  RegisterPushTokenDto,
  DeregisterPushTokenDto,
} from './dto/register-push-token.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationSettingsDto, DigestMode } from './dto/notification-settings.dto';
import { WatchEntityDto, UnwatchEntityDto } from './dto/watcher.dto';
import { EnqueueNotificationDto, QueryQueueDto } from './dto/queue.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly db: DatabaseService) {}

  // ==========================================
  // Push Tokens Management
  // ==========================================

  async registerPushToken(userId: string, dto: RegisterPushTokenDto) {
    const query = `
      INSERT INTO user_push_tokens (
        user_id, device_type, fcm_token, device_model, os_version, is_active, created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $5, TRUE, $1, $1)
      ON CONFLICT (user_id, fcm_token)
      DO UPDATE SET
        device_type = EXCLUDED.device_type,
        device_model = EXCLUDED.device_model,
        os_version = EXCLUDED.os_version,
        is_active = TRUE,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = EXCLUDED.updated_by
      RETURNING *;
    `;
    const res = await this.db.query(query, [
      userId,
      dto.deviceType,
      dto.fcmToken,
      dto.deviceModel || null,
      dto.osVersion || null,
    ]);
    return res.rows[0];
  }

  async deregisterPushToken(userId: string, dto: DeregisterPushTokenDto) {
    const query = `
      UPDATE user_push_tokens
      SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP, updated_by = $1
      WHERE user_id = $1 AND fcm_token = $2
      RETURNING *;
    `;
    const res = await this.db.query(query, [userId, dto.fcmToken]);
    return { success: true, updated: res.rowCount };
  }

  // ==========================================
  // Direct In-App Notifications
  // ==========================================

  async createNotification(
    senderUserId: string | null,
    dto: CreateNotificationDto,
  ) {
    const pushSent = false;

    const query = `
      INSERT INTO notifications (
        recipient_user_id, sender_user_id, notification_type, title, body,
        entity_type, entity_id, is_read, is_push_sent, is_email_sent,
        created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, $8, $9, $10, $10)
      RETURNING *;
    `;

    const res = await this.db.query(query, [
      dto.recipientUserId,
      senderUserId,
      dto.notificationType,
      dto.title,
      dto.body,
      dto.entityType || null,
      dto.entityId || null,
      pushSent,
      false,
      senderUserId || dto.recipientUserId,
    ]);

    return res.rows[0];
  }

  async findAllForUser(userId: string, query: QueryNotificationDto) {
    const { isRead, notificationType, page = 1, limit = 20 } = query;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['n.recipient_user_id = $1'];
    const params: any[] = [userId];

    if (isRead !== undefined) {
      params.push(isRead);
      conditions.push(`n.is_read = $${params.length}`);
    }

    if (notificationType) {
      params.push(notificationType);
      conditions.push(`n.notification_type = $${params.length}`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) FROM notifications n ${whereClause};`;
    const countRes = await this.db.query(countQuery, params);
    const totalCount = parseInt(countRes.rows[0].count, 10);

    const unreadCountRes = await this.db.query(
      `SELECT COUNT(*) FROM notifications WHERE recipient_user_id = $1 AND is_read = FALSE;`,
      [userId],
    );
    const unreadCount = parseInt(unreadCountRes.rows[0].count, 10);

    const dataQuery = `
      SELECT
        n.id,
        n.recipient_user_id,
        n.sender_user_id,
        CONCAT(u.first_name, ' ', u.last_name) AS sender_name,
        n.notification_type,
        n.title,
        n.body,
        n.entity_type,
        n.entity_id,
        n.is_read,
        n.read_at,
        n.is_push_sent,
        n.is_email_sent,
        n.created_at
      FROM notifications n
      LEFT JOIN users u ON u.id = n.sender_user_id
      ${whereClause}
      ORDER BY n.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2};
    `;

    params.push(limit, offset);
    const dataRes = await this.db.query(dataQuery, params);

    return {
      notifications: dataRes.rows,
      unreadCount,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    };
  }

  async markAsRead(userId: string, notificationId: string) {
    const query = `
      UPDATE notifications
      SET is_read = TRUE, read_at = CURRENT_TIMESTAMP, updated_by = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND recipient_user_id = $1
      RETURNING *;
    `;
    const res = await this.db.query(query, [userId, notificationId]);
    return res.rows[0] || null;
  }

  async markAllAsRead(userId: string) {
    const query = `
      UPDATE notifications
      SET is_read = TRUE, read_at = CURRENT_TIMESTAMP, updated_by = $1, updated_at = CURRENT_TIMESTAMP
      WHERE recipient_user_id = $1 AND is_read = FALSE;
    `;
    const res = await this.db.query(query, [userId]);
    return { success: true, markedCount: res.rowCount };
  }

  async getUnreadCount(userId: string) {
    const res = await this.db.query(
      `SELECT COUNT(*) FROM notifications WHERE recipient_user_id = $1 AND is_read = FALSE;`,
      [userId],
    );
    return { unreadCount: parseInt(res.rows[0].count, 10) };
  }

  // ==========================================
  // COLLAB-003: User Notification Settings & Quiet Hours
  // ==========================================

  async getSettings(userId: string) {
    const res = await this.db.query(
      `SELECT * FROM user_notification_settings WHERE user_id = $1;`,
      [userId],
    );

    if (res.rows.length > 0) {
      return res.rows[0];
    }

    // Default configuration if not configured yet
    return {
      user_id: userId,
      email_notifications_enabled: true,
      in_app_notifications_enabled: true,
      push_notifications_enabled: true,
      digest_mode: DigestMode.INSTANT,
      quiet_hours_enabled: false,
      quiet_hours_start: null,
      quiet_hours_end: null,
      timezone: 'Asia/Kolkata',
      allow_urgent_during_quiet_hours: true,
      event_preferences: {
        TASK_ASSIGNMENT: true,
        STATUS_CHANGE: true,
        COMMENT_AND_MENTION: true,
        BLOCKER_AND_DEPENDENCY: true,
        DOCUMENT_REVISION: true,
        APPROVAL_AND_SIGNOFF: true,
        DEADLINE_AND_SLA: true,
        RECURRING_WORK_RUN: true,
      },
    };
  }

  async updateSettings(userId: string, dto: UpdateNotificationSettingsDto) {
    const existing = await this.getSettings(userId);

    const emailEnabled = dto.emailNotificationsEnabled !== undefined ? dto.emailNotificationsEnabled : existing.email_notifications_enabled;
    const inAppEnabled = dto.inAppNotificationsEnabled !== undefined ? dto.inAppNotificationsEnabled : existing.in_app_notifications_enabled;
    const pushEnabled = dto.pushNotificationsEnabled !== undefined ? dto.pushNotificationsEnabled : existing.push_notifications_enabled;
    const digestMode = dto.digestMode || existing.digest_mode || 'INSTANT';
    const quietHoursEnabled = dto.quietHoursEnabled !== undefined ? dto.quietHoursEnabled : existing.quiet_hours_enabled;
    const quietHoursStart = dto.quietHoursStart !== undefined ? dto.quietHoursStart : existing.quiet_hours_start;
    const quietHoursEnd = dto.quietHoursEnd !== undefined ? dto.quietHoursEnd : existing.quiet_hours_end;
    const timezone = dto.timezone || existing.timezone || 'Asia/Kolkata';
    const allowUrgent = dto.allowUrgentDuringQuietHours !== undefined ? dto.allowUrgentDuringQuietHours : existing.allow_urgent_during_quiet_hours;
    const eventPreferences = dto.eventPreferences || existing.event_preferences || {};

    const query = `
      INSERT INTO user_notification_settings (
        user_id, email_notifications_enabled, in_app_notifications_enabled,
        push_notifications_enabled, digest_mode, quiet_hours_enabled,
        quiet_hours_start, quiet_hours_end, timezone,
        allow_urgent_during_quiet_hours, event_preferences,
        created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $1, $1)
      ON CONFLICT (user_id)
      DO UPDATE SET
        email_notifications_enabled = EXCLUDED.email_notifications_enabled,
        in_app_notifications_enabled = EXCLUDED.in_app_notifications_enabled,
        push_notifications_enabled = EXCLUDED.push_notifications_enabled,
        digest_mode = EXCLUDED.digest_mode,
        quiet_hours_enabled = EXCLUDED.quiet_hours_enabled,
        quiet_hours_start = EXCLUDED.quiet_hours_start,
        quiet_hours_end = EXCLUDED.quiet_hours_end,
        timezone = EXCLUDED.timezone,
        allow_urgent_during_quiet_hours = EXCLUDED.allow_urgent_during_quiet_hours,
        event_preferences = EXCLUDED.event_preferences,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = EXCLUDED.updated_by
      RETURNING *;
    `;

    const res = await this.db.query(query, [
      userId,
      emailEnabled,
      inAppEnabled,
      pushEnabled,
      digestMode,
      quietHoursEnabled,
      quietHoursStart,
      quietHoursEnd,
      timezone,
      allowUrgent,
      JSON.stringify(eventPreferences),
    ]);

    return res.rows[0];
  }

  // ==========================================
  // COLLAB-003: Work Item Watchers & Followers
  // ==========================================

  async watchEntity(userId: string, dto: WatchEntityDto) {
    const contactId = dto.clientContactId || null;

    const query = `
      INSERT INTO work_item_watchers (
        entity_type, entity_id, user_id, client_contact_id,
        notify_on_status_change, notify_on_comments, notify_on_attachments, notify_on_approvals,
        created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
      ON CONFLICT (entity_type, entity_id, user_id) WHERE user_id IS NOT NULL
      DO UPDATE SET
        notify_on_status_change = EXCLUDED.notify_on_status_change,
        notify_on_comments = EXCLUDED.notify_on_comments,
        notify_on_attachments = EXCLUDED.notify_on_attachments,
        notify_on_approvals = EXCLUDED.notify_on_approvals,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = EXCLUDED.updated_by
      RETURNING *;
    `;

    const res = await this.db.query(query, [
      dto.entityType,
      dto.entityId,
      contactId ? null : userId,
      contactId,
      dto.notifyOnStatusChange !== undefined ? dto.notifyOnStatusChange : true,
      dto.notifyOnComments !== undefined ? dto.notifyOnComments : true,
      dto.notifyOnAttachments !== undefined ? dto.notifyOnAttachments : true,
      dto.notifyOnApprovals !== undefined ? dto.notifyOnApprovals : true,
      userId,
    ]);

    return res.rows[0];
  }

  async unwatchEntity(userId: string, dto: UnwatchEntityDto) {
    let query: string;
    let params: any[];

    if (dto.clientContactId) {
      query = `
        DELETE FROM work_item_watchers
        WHERE entity_type = $1 AND entity_id = $2 AND client_contact_id = $3
        RETURNING *;
      `;
      params = [dto.entityType, dto.entityId, dto.clientContactId];
    } else {
      query = `
        DELETE FROM work_item_watchers
        WHERE entity_type = $1 AND entity_id = $2 AND user_id = $3
        RETURNING *;
      `;
      params = [dto.entityType, dto.entityId, userId];
    }

    const res = await this.db.query(query, params);
    return { success: true, removed: res.rowCount > 0 };
  }

  async getEntityWatchers(entityType: string, entityId: string) {
    const query = `
      SELECT
        w.id,
        w.entity_type,
        w.entity_id,
        w.user_id,
        w.client_contact_id,
        w.notify_on_status_change,
        w.notify_on_comments,
        w.notify_on_attachments,
        w.notify_on_approvals,
        w.created_at,
        CONCAT(u.first_name, ' ', u.last_name) AS user_name,
        u.email AS user_email,
        r.role_name AS user_role,
        cc.contact_name AS client_contact_name,
        cc.email AS client_contact_email
      FROM work_item_watchers w
      LEFT JOIN users u ON u.id = w.user_id
      LEFT JOIN roles r ON r.id = u.role_id
      LEFT JOIN client_contacts cc ON cc.id = w.client_contact_id
      WHERE w.entity_type = $1 AND w.entity_id = $2
      ORDER BY w.created_at ASC;
    `;
    const res = await this.db.query(query, [entityType, entityId]);
    return res.rows;
  }

  async getMyWatchedItems(userId: string) {
    const query = `
      SELECT
        w.id AS watcher_id,
        w.entity_type,
        w.entity_id,
        w.notify_on_status_change,
        w.notify_on_comments,
        w.notify_on_attachments,
        w.notify_on_approvals,
        w.created_at AS watched_at,
        CASE
          WHEN w.entity_type = 'TASK' THEN t.title
          WHEN w.entity_type = 'KNOWLEDGE_DOC' THEN kd.title
          WHEN w.entity_type = 'PRODUCT_IDEA' THEN pi.title
          WHEN w.entity_type = 'CHANGE_REQUEST' THEN cr.title
          WHEN w.entity_type = 'UAT_PACKAGE' THEN up.package_name
          ELSE 'Work Item'
        END AS item_title,
        CASE
          WHEN w.entity_type = 'TASK' THEN t.task_code
          WHEN w.entity_type = 'KNOWLEDGE_DOC' THEN kd.document_code
          WHEN w.entity_type = 'PRODUCT_IDEA' THEN pi.idea_code
          WHEN w.entity_type = 'CHANGE_REQUEST' THEN cr.cr_code
          WHEN w.entity_type = 'UAT_PACKAGE' THEN up.package_code
          ELSE NULL
        END AS item_code
      FROM work_item_watchers w
      LEFT JOIN tasks t ON w.entity_type = 'TASK' AND t.id = w.entity_id
      LEFT JOIN knowledge_documents kd ON w.entity_type = 'KNOWLEDGE_DOC' AND kd.id = w.entity_id
      LEFT JOIN product_ideas pi ON w.entity_type = 'PRODUCT_IDEA' AND pi.id = w.entity_id
      LEFT JOIN change_requests cr ON w.entity_type = 'CHANGE_REQUEST' AND cr.id = w.entity_id
      LEFT JOIN uat_packages up ON w.entity_type = 'UAT_PACKAGE' AND up.id = w.entity_id
      WHERE w.user_id = $1
      ORDER BY w.created_at DESC;
    `;
    const res = await this.db.query(query, [userId]);
    return res.rows;
  }

  // ==========================================
  // COLLAB-003: Delivery Queue & Deduplication Engine
  // ==========================================

  async enqueueNotification(actorUserId: string, dto: EnqueueNotificationDto) {
    // 1. Deduplication check: if key already exists, return existing item
    const existing = await this.db.query(
      `SELECT * FROM notification_delivery_queue WHERE deduplication_key = $1;`,
      [dto.deduplicationKey],
    );
    if (existing.rows.length > 0) {
      return { item: existing.rows[0], isDuplicate: true };
    }

    // 2. Resolve recipient settings to determine initial status
    let initialStatus = 'QUEUED';
    const targetUserId = dto.recipientUserId || null;

    if (targetUserId) {
      const settings = await this.getSettings(targetUserId);

      // Check event category preference
      if (settings.event_preferences && dto.eventCategory) {
        if (settings.event_preferences[dto.eventCategory] === false) {
          // Recipient disabled this event category
          initialStatus = 'SUPPRESSED_QUIET_HOURS'; // or suppressed by preferences
        }
      }

      // Check digest mode: non-urgent items for DAILY/WEEKLY recipients are marked DIGEST_PENDING
      if (
        !dto.isUrgent &&
        (settings.digest_mode === DigestMode.DAILY || settings.digest_mode === DigestMode.WEEKLY)
      ) {
        initialStatus = 'DIGEST_PENDING';
      }
    }

    const scheduledTime = dto.scheduledFor ? new Date(dto.scheduledFor) : new Date();

    const query = `
      INSERT INTO notification_delivery_queue (
        deduplication_key, recipient_user_id, recipient_contact_id, delivery_channel,
        event_category, event_title, event_summary, entity_type, entity_id,
        entity_code, is_urgent, delivery_status, scheduled_for, created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14)
      RETURNING *;
    `;

    const res = await this.db.query(query, [
      dto.deduplicationKey,
      targetUserId,
      dto.recipientContactId || null,
      dto.deliveryChannel || 'IN_APP',
      dto.eventCategory,
      dto.eventTitle,
      dto.eventSummary || null,
      dto.entityType || null,
      dto.entityId || null,
      dto.entityCode || null,
      dto.isUrgent || false,
      initialStatus,
      scheduledTime,
      actorUserId,
    ]);

    return { item: res.rows[0], isDuplicate: false };
  }

  // ==========================================
  // COLLAB-003: Dispatch & Authorization Re-check Engine
  // ==========================================

  async processDeliveryQueue(actorUserId: string) {
    // 1. Fetch queued items that are due
    const readyItemsRes = await this.db.query(`
      SELECT q.*, 
             u.is_active AS recipient_active,
             u.role_id AS recipient_role_id
      FROM notification_delivery_queue q
      LEFT JOIN users u ON u.id = q.recipient_user_id
      WHERE q.delivery_status = 'QUEUED'
        AND q.scheduled_for <= CURRENT_TIMESTAMP
      ORDER BY q.is_urgent DESC, q.created_at ASC
      LIMIT 100;
    `);

    const items = readyItemsRes.rows;
    let processed = 0;
    let delivered = 0;
    let suppressed = 0;
    let cancelled = 0;

    for (const item of items) {
      processed++;

      // Authorization Re-check Engine
      const authResult = await this.verifyRecipientAuthorization(item);
      if (!authResult.authorized) {
        cancelled++;
        await this.db.query(
          `UPDATE notification_delivery_queue 
           SET delivery_status = 'CANCELLED_UNAUTHORIZED', 
               delivery_error = $2, 
               updated_at = CURRENT_TIMESTAMP, 
               updated_by = $3
           WHERE id = $1;`,
          [item.id, authResult.reason, actorUserId],
        );
        continue;
      }

      // Quiet hours verification
      const quietCheck = await this.isWithinQuietHours(item.recipient_user_id, item.is_urgent);
      if (quietCheck.inQuietHours && !quietCheck.allowBypass) {
        suppressed++;
        await this.db.query(
          `UPDATE notification_delivery_queue 
           SET delivery_status = 'SUPPRESSED_QUIET_HOURS', 
               delivery_error = 'Deferred during recipient quiet hours window', 
               updated_at = CURRENT_TIMESTAMP, 
               updated_by = $2
           WHERE id = $1;`,
          [item.id, actorUserId],
        );
        continue;
      }

      // Delivery dispatch
      if (item.delivery_channel === 'IN_APP' && item.recipient_user_id) {
        await this.db.query(
          `INSERT INTO notifications (
            recipient_user_id, notification_type, title, body,
            entity_type, entity_id, is_read, created_by, updated_by
          ) VALUES ($1, $2, $3, $4, $5, $6, FALSE, $7, $7);`,
          [
            item.recipient_user_id,
            item.event_category,
            item.event_title,
            item.event_summary,
            item.entity_type,
            item.entity_id,
            actorUserId,
          ],
        );
      }

      // Mark delivered
      delivered++;
      await this.db.query(
        `UPDATE notification_delivery_queue 
         SET delivery_status = 'SENT', 
             delivered_at = CURRENT_TIMESTAMP, 
             updated_at = CURRENT_TIMESTAMP, 
             updated_by = $2
         WHERE id = $1;`,
        [item.id, actorUserId],
      );
    }

    return {
      totalProcessed: processed,
      delivered,
      suppressed,
      cancelledUnauthorized: cancelled,
    };
  }

  private async verifyRecipientAuthorization(item: any): Promise<{ authorized: boolean; reason?: string }> {
    // If recipient is user and inactive
    if (item.recipient_user_id && item.recipient_active === false) {
      return { authorized: false, reason: 'Recipient user account is deactivated or revoked' };
    }

    // Entity-specific authorization re-checks
    if (item.entity_type === 'TASK' && item.entity_id && item.recipient_user_id) {
      const taskRes = await this.db.query(
        `SELECT id, is_active FROM tasks WHERE id = $1;`,
        [item.entity_id],
      );
      if (taskRes.rows.length === 0 || taskRes.rows[0].is_active === false) {
        return { authorized: false, reason: 'Target task has been deleted or archived' };
      }
    }

    if (item.entity_type === 'KNOWLEDGE_DOC' && item.entity_id && item.recipient_user_id) {
      const docRes = await this.db.query(
        `SELECT id, status, audience FROM knowledge_documents WHERE id = $1;`,
        [item.entity_id],
      );
      if (docRes.rows.length === 0 || docRes.rows[0].status === 'ARCHIVED') {
        return { authorized: false, reason: 'Knowledge document is archived or removed' };
      }
    }

    return { authorized: true };
  }

  private async isWithinQuietHours(userId: string, isUrgent: boolean): Promise<{ inQuietHours: boolean; allowBypass: boolean }> {
    if (!userId) return { inQuietHours: false, allowBypass: false };

    const settingsRes = await this.db.query(
      `SELECT quiet_hours_enabled, quiet_hours_start, quiet_hours_end, allow_urgent_during_quiet_hours, timezone 
       FROM user_notification_settings WHERE user_id = $1;`,
      [userId],
    );

    if (settingsRes.rows.length === 0 || !settingsRes.rows[0].quiet_hours_enabled) {
      return { inQuietHours: false, allowBypass: false };
    }

    const { quiet_hours_start, quiet_hours_end, allow_urgent_during_quiet_hours } = settingsRes.rows[0];
    if (!quiet_hours_start || !quiet_hours_end) {
      return { inQuietHours: false, allowBypass: false };
    }

    // Check time window
    const now = new Date();
    const currentHourMin = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;

    let isInWindow = false;
    if (quiet_hours_start <= quiet_hours_end) {
      isInWindow = currentHourMin >= quiet_hours_start && currentHourMin <= quiet_hours_end;
    } else {
      // Overnight window (e.g. 22:00 to 07:00)
      isInWindow = currentHourMin >= quiet_hours_start || currentHourMin <= quiet_hours_end;
    }

    return {
      inQuietHours: isInWindow,
      allowBypass: isUrgent && allow_urgent_during_quiet_hours,
    };
  }

  // ==========================================
  // COLLAB-003: Digest Summary & Preview Engine
  // ==========================================

  async previewDigest(userId: string) {
    const res = await this.db.query(
      `SELECT * FROM notification_delivery_queue
       WHERE recipient_user_id = $1 
         AND delivery_status IN ('DIGEST_PENDING', 'QUEUED')
       ORDER BY event_category ASC, created_at DESC;`,
      [userId],
    );

    const items = res.rows;
    const categoriesMap: Record<string, any[]> = {};

    for (const it of items) {
      const cat = it.event_category || 'GENERAL';
      if (!categoriesMap[cat]) categoriesMap[cat] = [];
      categoriesMap[cat].push(it);
    }

    return {
      totalPendingItems: items.length,
      categories: categoriesMap,
      generatedAt: new Date().toISOString(),
    };
  }

  async getDeliveryQueue(query: QueryQueueDto) {
    const conditions: string[] = [];
    const params: any[] = [];

    if (query.status) {
      params.push(query.status);
      conditions.push(`q.delivery_status = $${params.length}`);
    }

    if (query.eventCategory) {
      params.push(query.eventCategory);
      conditions.push(`q.event_category = $${params.length}`);
    }

    if (query.recipientUserId) {
      params.push(query.recipientUserId);
      conditions.push(`q.recipient_user_id = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const countRes = await this.db.query(`SELECT COUNT(*) FROM notification_delivery_queue q ${whereClause};`, params);
    const totalCount = parseInt(countRes.rows[0].count, 10);

    const listQuery = `
      SELECT q.*, CONCAT(u.first_name, ' ', u.last_name) AS recipient_name, u.email AS recipient_email
      FROM notification_delivery_queue q
      LEFT JOIN users u ON u.id = q.recipient_user_id
      ${whereClause}
      ORDER BY q.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2};
    `;
    params.push(limit, offset);
    const dataRes = await this.db.query(listQuery, params);

    return {
      items: dataRes.rows,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    };
  }
}
