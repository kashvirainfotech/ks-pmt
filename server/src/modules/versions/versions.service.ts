import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateVersionDto } from './dto/create-version.dto';
import { UpdateVersionDto } from './dto/update-version.dto';

@Injectable()
export class VersionsService {
  constructor(private readonly db: DatabaseService) {}

  async create(dto: CreateVersionDto, userId: string) {
    if (dto.entityType === 'PRODUCT' && !dto.productId) {
      throw new BadRequestException('productId is mandatory when entityType is PRODUCT.');
    }
    if (dto.entityType === 'PROJECT' && !dto.projectId) {
      throw new BadRequestException('projectId is mandatory when entityType is PROJECT.');
    }

    const insertQuery = `
      INSERT INTO versions (
        version_code, version_name, description, entity_type,
        product_id, project_id, planned_start_date, target_release_date,
        status, is_active, created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10, $10
      )
      RETURNING *;
    `;

    const result = await this.db.query(insertQuery, [
      dto.versionCode,
      dto.versionName || null,
      dto.description || null,
      dto.entityType,
      dto.entityType === 'PRODUCT' ? dto.productId : null,
      dto.entityType === 'PROJECT' ? dto.projectId : null,
      dto.plannedStartDate || null,
      dto.targetReleaseDate || null,
      dto.status || 'PLANNING',
      userId,
    ]);

    return result.rows[0];
  }

  async findByProduct(productId: string) {
    const query = `
      SELECT 
        v.*,
        COUNT(DISTINCT t.id) AS total_tasks_count,
        COUNT(DISTINCT CASE WHEN ts.is_terminal THEN t.id END) AS completed_tasks_count
      FROM versions v
      LEFT JOIN tasks t ON v.id = t.version_id
      LEFT JOIN task_statuses ts ON t.status_id = ts.id
      WHERE v.product_id = $1 AND v.is_active = TRUE
      GROUP BY v.id
      ORDER BY v.created_at DESC;
    `;
    const result = await this.db.query(query, [productId]);
    return result.rows;
  }

  async findByProject(projectId: string) {
    const query = `
      SELECT 
        v.*,
        COUNT(DISTINCT t.id) AS total_tasks_count,
        COUNT(DISTINCT CASE WHEN ts.is_terminal THEN t.id END) AS completed_tasks_count
      FROM versions v
      LEFT JOIN tasks t ON v.id = t.version_id
      LEFT JOIN task_statuses ts ON t.status_id = ts.id
      WHERE v.project_id = $1 AND v.is_active = TRUE
      GROUP BY v.id
      ORDER BY v.created_at DESC;
    `;
    const result = await this.db.query(query, [projectId]);
    return result.rows;
  }

  async findOne(id: string) {
    const query = `
      SELECT 
        v.*,
        pr.product_name,
        p.project_name,
        COUNT(DISTINCT t.id) AS total_tasks_count,
        COUNT(DISTINCT CASE WHEN ts.is_terminal THEN t.id END) AS completed_tasks_count
      FROM versions v
      LEFT JOIN products pr ON v.product_id = pr.id
      LEFT JOIN projects p ON v.project_id = p.id
      LEFT JOIN tasks t ON v.id = t.version_id
      LEFT JOIN task_statuses ts ON t.status_id = ts.id
      WHERE v.id = $1
      GROUP BY v.id, pr.product_name, p.project_name;
    `;
    const result = await this.db.query(query, [id]);
    if (result.rowCount === 0) {
      throw new NotFoundException(`Version with ID ${id} not found.`);
    }

    const version = result.rows[0];

    // Tasks scheduled for this version
    const tasksQuery = `
      SELECT 
        t.id, t.task_code, t.title, t.priority, t.estimated_hours,
        ts.status_name, ts.color_hex AS status_color, tt.type_name AS task_type
      FROM tasks t
      INNER JOIN task_statuses ts ON t.status_id = ts.id
      INNER JOIN task_types tt ON t.task_type_id = tt.id
      WHERE t.version_id = $1
      ORDER BY t.created_at DESC;
    `;
    const tasksResult = await this.db.query(tasksQuery, [id]);

    return {
      ...version,
      tasks: tasksResult.rows,
    };
  }

  async update(id: string, dto: UpdateVersionDto, userId: string) {
    await this.findOne(id);

    const updateQuery = `
      UPDATE versions SET
        version_code = COALESCE($1, version_code),
        version_name = COALESCE($2, version_name),
        description = COALESCE($3, description),
        planned_start_date = COALESCE($4, planned_start_date),
        target_release_date = COALESCE($5, target_release_date),
        actual_release_date = COALESCE($6, actual_release_date),
        status = COALESCE($7, status),
        is_active = COALESCE($8, is_active),
        updated_by = $9,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *;
    `;

    const result = await this.db.query(updateQuery, [
      dto.versionCode,
      dto.versionName,
      dto.description,
      dto.plannedStartDate,
      dto.targetReleaseDate,
      dto.actualReleaseDate,
      dto.status,
      dto.isActive,
      userId,
      id,
    ]);

    return result.rows[0];
  }

  async toggleActive(id: string, isActive: boolean, userId: string) {
    await this.findOne(id);
    const query = `
      UPDATE versions SET
        is_active = $1,
        updated_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *;
    `;
    const result = await this.db.query(query, [isActive, userId, id]);
    return result.rows[0];
  }
}
