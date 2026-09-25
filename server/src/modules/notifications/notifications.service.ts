import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { RegisterPushTokenDto, DeregisterPushTokenDto } from './dto/register-push-token.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly db: DatabaseService) {}

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

  async createNotification(senderUserId: string | null, dto: CreateNotificationDto) {
    // 1. Check if recipient has registered active push tokens
    const tokensRes = await this.db.query(
      `SELECT fcm_token, device_type FROM user_push_tokens WHERE user_id = $1 AND is_active = TRUE`,
      [dto.recipientUserId],
    );

    let pushSent = false;
    if (tokensRes.rows.length > 0) {
      // Dispatch push notification to tokens (simulated/FCM provider)
      this.logger.log(
        `[FCM Push] Sending push notification to user ${dto.recipientUserId} (${tokensRes.rows.length} devices): "${dto.title}"`,
      );
      pushSent = true;
    }

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
      dto.isPushSent !== undefined ? dto.isPushSent : pushSent,
      dto.isEmailSent || false,
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

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

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
}
