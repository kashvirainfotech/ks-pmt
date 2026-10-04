import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import { CreateSubscriptionDto } from "./dto/create-subscription.dto";
import { UpdateSubscriptionDto } from "./dto/update-subscription.dto";
import {
  QueryDeliveriesDto,
  QuerySubscriptionsDto,
  SimulateEventDto,
} from "./dto/query-webhooks.dto";
import { validateWebhookDestinationUrl } from "./ssrf-validator";
import {
  computeWebhookSignature,
  generateWebhookSecret,
} from "./webhook-signer";

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * List all active webhook subscriptions
   */
  async getSubscriptions(query: QuerySubscriptionsDto) {
    let sql = `
      SELECT id, subscription_code, name, target_url, 
             SUBSTRING(secret_key FROM 1 FOR 12) || '...' as masked_secret,
             secret_rotated_at, event_types, scope_project_ids, is_enabled,
             max_retries, timeout_seconds, description, is_active,
             created_at, updated_at
      FROM webhook_subscriptions
      WHERE is_active = TRUE
    `;
    const params: any[] = [];

    if (query.isEnabled !== undefined) {
      params.push(query.isEnabled === "true");
      sql += ` AND is_enabled = $${params.length}`;
    }
    if (query.eventType) {
      params.push(query.eventType);
      sql += ` AND $${params.length} = ANY(event_types)`;
    }
    if (query.projectId) {
      params.push(query.projectId);
      sql += ` AND ($${params.length}::uuid = ANY(scope_project_ids) OR scope_project_ids = '{}' OR scope_project_ids IS NULL)`;
    }

    sql += ` ORDER BY created_at DESC`;
    const res = await this.db.query(sql, params);
    return res.rows;
  }

  /**
   * Get single webhook subscription by ID (includes delivery stats)
   */
  async getSubscriptionById(id: string) {
    const subRes = await this.db.query(
      `
      SELECT id, subscription_code, name, target_url,
             SUBSTRING(secret_key FROM 1 FOR 12) || '...' as masked_secret,
             secret_rotated_at, event_types, scope_project_ids, is_enabled,
             max_retries, timeout_seconds, description, is_active,
             created_at, updated_at
      FROM webhook_subscriptions
      WHERE id = $1 AND is_active = TRUE
    `,
      [id],
    );

    if (subRes.rows.length === 0) {
      throw new NotFoundException(`Webhook subscription with ID ${id} not found`);
    }

    const statsRes = await this.db.query(
      `
      SELECT 
        COUNT(*) as total_deliveries,
        COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END) as successful_deliveries,
        COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_deliveries,
        COUNT(CASE WHEN status = 'RETRYING' THEN 1 END) as retrying_deliveries,
        MAX(delivered_at) as last_delivered_at
      FROM webhook_deliveries
      WHERE subscription_id = $1
    `,
      [id],
    );

    return {
      ...subRes.rows[0],
      stats: statsRes.rows[0],
    };
  }

  /**
   * Create a new outbound webhook subscription
   */
  async createSubscription(dto: CreateSubscriptionDto, userId: string) {
    validateWebhookDestinationUrl(dto.targetUrl);

    const secretKey = generateWebhookSecret();

    const insertSql = `
      INSERT INTO webhook_subscriptions (
        subscription_code, name, target_url, secret_key, event_types,
        scope_project_ids, is_enabled, max_retries, timeout_seconds, description,
        created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
      RETURNING id, subscription_code, name, target_url,
                SUBSTRING(secret_key FROM 1 FOR 12) || '...' as masked_secret,
                secret_key as raw_secret_key,
                event_types, scope_project_ids, is_enabled, max_retries,
                timeout_seconds, description, created_at;
    `;

    const res = await this.db.query(insertSql, [
      dto.subscriptionCode,
      dto.name,
      dto.targetUrl,
      secretKey,
      dto.eventTypes,
      dto.scopeProjectIds || [],
      dto.isEnabled ?? true,
      dto.maxRetries ?? 3,
      dto.timeoutSeconds ?? 10,
      dto.description || null,
      userId,
    ]);

    this.logger.log(
      `Created outbound webhook subscription ${dto.subscriptionCode} targeting ${dto.targetUrl}`,
    );

    return res.rows[0];
  }

  /**
   * Update an existing webhook subscription
   */
  async updateSubscription(
    id: string,
    dto: UpdateSubscriptionDto,
    userId: string,
  ) {
    if (dto.targetUrl) {
      validateWebhookDestinationUrl(dto.targetUrl);
    }

    const checkRes = await this.db.query(
      `SELECT id FROM webhook_subscriptions WHERE id = $1 AND is_active = TRUE`,
      [id],
    );
    if (checkRes.rows.length === 0) {
      throw new NotFoundException(`Webhook subscription with ID ${id} not found`);
    }

    const updateSql = `
      UPDATE webhook_subscriptions
      SET name = COALESCE($1, name),
          target_url = COALESCE($2, target_url),
          event_types = COALESCE($3, event_types),
          scope_project_ids = COALESCE($4, scope_project_ids),
          is_enabled = COALESCE($5, is_enabled),
          max_retries = COALESCE($6, max_retries),
          timeout_seconds = COALESCE($7, timeout_seconds),
          description = COALESCE($8, description),
          updated_by = $9,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *;
    `;

    const res = await this.db.query(updateSql, [
      dto.name || null,
      dto.targetUrl || null,
      dto.eventTypes || null,
      dto.scopeProjectIds || null,
      dto.isEnabled !== undefined ? dto.isEnabled : null,
      dto.maxRetries ?? null,
      dto.timeoutSeconds ?? null,
      dto.description || null,
      userId,
      id,
    ]);

    return res.rows[0];
  }

  /**
   * Rotate webhook signing secret key (preserves previous secret for grace verification)
   */
  async rotateSecret(id: string, userId: string) {
    const subRes = await this.db.query(
      `SELECT id, secret_key FROM webhook_subscriptions WHERE id = $1 AND is_active = TRUE`,
      [id],
    );
    if (subRes.rows.length === 0) {
      throw new NotFoundException(`Webhook subscription with ID ${id} not found`);
    }

    const currentSecret = subRes.rows[0].secret_key;
    const newSecret = generateWebhookSecret();

    const updateRes = await this.db.query(
      `
      UPDATE webhook_subscriptions
      SET previous_secret_key = $1,
          secret_key = $2,
          secret_rotated_at = CURRENT_TIMESTAMP,
          updated_by = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING id, subscription_code, secret_key as raw_secret_key,
                SUBSTRING(secret_key FROM 1 FOR 12) || '...' as masked_secret,
                secret_rotated_at;
    `,
      [currentSecret, newSecret, userId, id],
    );

    this.logger.log(`Rotated secret key for webhook subscription ${id}`);
    return updateRes.rows[0];
  }

  /**
   * Soft-delete a webhook subscription
   */
  async deleteSubscription(id: string, userId: string) {
    const res = await this.db.query(
      `
      UPDATE webhook_subscriptions
      SET is_active = FALSE,
          is_enabled = FALSE,
          updated_by = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND is_active = TRUE
      RETURNING id;
    `,
      [userId, id],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException(`Webhook subscription with ID ${id} not found`);
    }

    return { success: true, id };
  }

  // =========================================================================
  // DISPATCH & DELIVERY ENGINE
  // =========================================================================

  /**
   * Dispatch an allowlisted PMT event to all registered, enabled subscriptions
   */
  async dispatchEvent(eventType: string, eventData: any, projectId?: string) {
    let sql = `
      SELECT id, subscription_code, target_url, secret_key, max_retries, timeout_seconds, custom_headers
      FROM webhook_subscriptions
      WHERE is_active = TRUE AND is_enabled = TRUE
        AND $1 = ANY(event_types)
    `;
    const params: any[] = [eventType];

    if (projectId) {
      params.push(projectId);
      sql += ` AND ($${params.length}::uuid = ANY(scope_project_ids) OR scope_project_ids = '{}' OR scope_project_ids IS NULL)`;
    }

    const subsRes = await this.db.query(sql, params);
    if (subsRes.rows.length === 0) {
      return { dispatched: 0 };
    }

    const eventId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const fullPayload = {
      event_id: eventId,
      event_type: eventType,
      timestamp: new Date().toISOString(),
      project_id: projectId || null,
      data: eventData,
    };

    const deliveryPromises = subsRes.rows.map(async (sub) => {
      // Record pending delivery in database
      const insertDeliveryRes = await this.db.query(
        `
        INSERT INTO webhook_deliveries (
          subscription_id, event_id, event_type, payload, destination_url,
          attempt_number, max_attempts, status
        ) VALUES ($1, $2, $3, $4, $5, 1, $6, 'PENDING')
        RETURNING id;
      `,
        [
          sub.id,
          eventId,
          eventType,
          JSON.stringify(fullPayload),
          sub.target_url,
          sub.max_retries,
        ],
      );

      const deliveryId = insertDeliveryRes.rows[0].id;
      // Execute delivery asynchronously without blocking caller
      this.executeDelivery(deliveryId, sub, fullPayload, 1).catch((err) =>
        this.logger.error(`Failed async delivery ${deliveryId}: ${err.message}`),
      );
    });

    await Promise.all(deliveryPromises);
    return { dispatched: subsRes.rows.length, eventId };
  }

  /**
   * Executes HTTP POST dispatch to destination URL with signature and latency tracking
   */
  async executeDelivery(
    deliveryId: string,
    sub: any,
    payload: any,
    attempt: number,
  ) {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = computeWebhookSignature(sub.secret_key, timestamp, payload);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "KS-PMT-Webhook-Dispatcher/1.0",
      "X-PMT-Event-Id": payload.event_id,
      "X-PMT-Event-Type": payload.event_type,
      "X-PMT-Delivery-Id": deliveryId,
      "X-PMT-Timestamp": timestamp.toString(),
      "X-PMT-Signature": signature,
      ...(sub.custom_headers || {}),
    };

    const startTime = Date.now();
    let responseStatus: number | null = null;
    let responseBody = "";
    let responseHeaders: any = {};
    let isSuccess = false;
    let errorMsg: string | null = null;

    try {
      const controller = new AbortController();
      const timeoutMs = (sub.timeout_seconds || 10) * 1000;
      const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(sub.target_url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutHandle);
      responseStatus = response.status;
      isSuccess = response.ok; // 2xx status codes

      const rawText = await response.text();
      responseBody = rawText.slice(0, 1000); // capped at 1KB for storage hygiene

      response.headers.forEach((val, key) => {
        responseHeaders[key] = val;
      });
    } catch (err: any) {
      errorMsg = err.name === "AbortError" ? "Request timed out" : err.message;
      this.logger.warn(`Webhook delivery ${deliveryId} attempt ${attempt} failed: ${errorMsg}`);
    }

    const durationMs = Date.now() - startTime;
    const finalStatus = isSuccess
      ? "SUCCESS"
      : attempt < sub.max_retries
        ? "RETRYING"
        : "FAILED";

    // Exponential backoff for retry: attempt 1 -> +60s, attempt 2 -> +300s, attempt 3 -> +900s
    let nextRetryAt: Date | null = null;
    if (finalStatus === "RETRYING") {
      const backoffSeconds = Math.pow(attempt, 2) * 60;
      nextRetryAt = new Date(Date.now() + backoffSeconds * 1000);
    }

    await this.db.query(
      `
      UPDATE webhook_deliveries
      SET status = $1,
          response_status_code = $2,
          response_headers = $3,
          response_body = $4,
          execution_duration_ms = $5,
          error_message = $6,
          delivered_at = CASE WHEN $1 = 'SUCCESS' THEN CURRENT_TIMESTAMP ELSE delivered_at END,
          attempt_number = $7,
          next_retry_at = $8
      WHERE id = $9;
    `,
      [
        finalStatus,
        responseStatus,
        JSON.stringify(responseHeaders),
        responseBody || null,
        durationMs,
        errorMsg,
        attempt,
        nextRetryAt,
        deliveryId,
      ],
    );

    return {
      deliveryId,
      status: finalStatus,
      responseStatus,
      durationMs,
    };
  }

  /**
   * Manually replay a delivery
   */
  async replayDelivery(deliveryId: string, userId: string) {
    const delRes = await this.db.query(
      `
      SELECT d.*, s.target_url, s.secret_key, s.max_retries, s.timeout_seconds, s.custom_headers, s.is_enabled
      FROM webhook_deliveries d
      JOIN webhook_subscriptions s ON s.id = d.subscription_id
      WHERE d.id = $1
    `,
      [deliveryId],
    );

    if (delRes.rows.length === 0) {
      throw new NotFoundException(`Delivery with ID ${deliveryId} not found`);
    }

    const delivery = delRes.rows[0];
    const attempt = (delivery.attempt_number || 1) + 1;

    await this.db.query(
      `
      UPDATE webhook_deliveries
      SET status = 'MANUAL_REPLAY',
          attempt_number = $1,
          updated_by = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3;
    `,
      [attempt, userId, deliveryId],
    );

    return this.executeDelivery(
      deliveryId,
      delivery,
      delivery.payload,
      attempt,
    );
  }

  /**
   * Test/Simulate an outbound event ping
   */
  async simulateEvent(dto: SimulateEventDto, userId: string) {
    const eventType = dto.eventType || "task.created";
    const samplePayload = {
      event_type: eventType,
      sample: true,
      simulated_at: new Date().toISOString(),
      user: {
        id: userId,
        simulated: true,
      },
      task: {
        task_code: "TSK-SIM-001",
        title: "Simulated Test Webhook Event",
        priority: "HIGH",
        status: "READY_FOR_DEV",
      },
    };

    if (dto.subscriptionId) {
      const sub = await this.getSubscriptionById(dto.subscriptionId);
      return this.dispatchEvent(eventType, samplePayload, undefined);
    }

    return this.dispatchEvent(eventType, samplePayload, undefined);
  }

  /**
   * Get deliveries ledger
   */
  async getDeliveries(query: QueryDeliveriesDto) {
    let sql = `
      SELECT d.*, s.name as subscription_name, s.subscription_code
      FROM webhook_deliveries d
      JOIN webhook_subscriptions s ON s.id = d.subscription_id
      WHERE d.is_active = TRUE
    `;
    const params: any[] = [];

    if (query.subscriptionId) {
      params.push(query.subscriptionId);
      sql += ` AND d.subscription_id = $${params.length}`;
    }
    if (query.status) {
      params.push(query.status);
      sql += ` AND d.status = $${params.length}`;
    }
    if (query.eventType) {
      params.push(query.eventType);
      sql += ` AND d.event_type = $${params.length}`;
    }
    if (query.eventId) {
      params.push(query.eventId);
      sql += ` AND d.event_id = $${params.length}`;
    }

    sql += ` ORDER BY d.created_at DESC LIMIT 50`;
    const res = await this.db.query(sql, params);
    return res.rows;
  }
}
