import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(private readonly db: DatabaseService) {}

  async log(dto: CreateAuditLogDto, actorUserId?: string) {
    try {
      const query = `
        INSERT INTO audit_logs (
          user_id, action_type, entity_name, record_id,
          old_values, new_values, ip_address, user_agent,
          device_platform, location_coordinates, remarks,
          created_by, updated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
        RETURNING *;
      `;

      const res = await this.db.query(query, [
        dto.userId || actorUserId || null,
        dto.actionType,
        dto.entityName,
        dto.recordId || null,
        dto.oldValues ? JSON.stringify(dto.oldValues) : null,
        dto.newValues ? JSON.stringify(dto.newValues) : null,
        dto.ipAddress || null,
        dto.userAgent || null,
        dto.devicePlatform || null,
        dto.locationCoordinates || null,
        dto.remarks || null,
        actorUserId || dto.userId || null,
      ]);

      return res.rows[0];
    } catch (err) {
      this.logger.error(`Failed to record audit log: ${err.message}`, err.stack);
      return null;
    }
  }

  async findAll(query: QueryAuditLogDto) {
    const {
      userId,
      actionType,
      entityName,
      recordId,
      startDate,
      endDate,
      devicePlatform,
      page = 1,
      limit = 50,
    } = query;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];

    if (userId) {
      params.push(userId);
      conditions.push(`al.user_id = $${params.length}`);
    }

    if (actionType) {
      params.push(actionType);
      conditions.push(`al.action_type = $${params.length}`);
    }

    if (entityName) {
      params.push(entityName);
      conditions.push(`al.entity_name = $${params.length}`);
    }

    if (recordId) {
      params.push(recordId);
      conditions.push(`al.record_id = $${params.length}`);
    }

    if (devicePlatform) {
      params.push(devicePlatform);
      conditions.push(`al.device_platform = $${params.length}`);
    }

    if (startDate) {
      params.push(startDate);
      conditions.push(`al.created_at >= $${params.length}`);
    }

    if (endDate) {
      params.push(endDate);
      conditions.push(`al.created_at <= $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) FROM audit_logs al ${whereClause};`;
    const countRes = await this.db.query(countQuery, params);
    const totalCount = parseInt(countRes.rows[0].count, 10);

    const dataQuery = `
      SELECT
        al.id,
        al.user_id,
        CONCAT(u.first_name, ' ', u.last_name) AS user_name,
        u.email AS user_email,
        u.employee_code AS employee_id,
        u.employee_code,
        al.action_type,
        al.entity_name,
        al.record_id,
        al.old_values,
        al.new_values,
        al.ip_address,
        al.user_agent,
        al.device_platform,
        al.location_coordinates,
        al.remarks,
        al.created_at
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2};
    `;

    params.push(limit, offset);
    const dataRes = await this.db.query(dataQuery, params);

    return {
      auditLogs: dataRes.rows,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    };
  }

  async findById(id: string) {
    const query = `
      SELECT
        al.*,
        CONCAT(u.first_name, ' ', u.last_name) AS user_name,
        u.email AS user_email,
        u.employee_code AS employee_id,
        u.employee_code
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      WHERE al.id = $1;
    `;
    const res = await this.db.query(query, [id]);
    if (!res.rows[0]) {
      throw new NotFoundException(`Audit log with ID ${id} not found`);
    }
    return res.rows[0];
  }
}
