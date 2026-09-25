import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateTaskTypeDto } from './dto/create-task-type.dto';
import { UpdateTaskTypeDto } from './dto/update-task-type.dto';

@Injectable()
export class TaskTypesService {
  constructor(private readonly db: DatabaseService) {}

  async create(dto: CreateTaskTypeDto, userId: string) {
    const checkQuery = `SELECT id FROM task_types WHERE type_code = $1;`;
    const checkResult = await this.db.query(checkQuery, [dto.typeCode]);
    if (checkResult.rowCount > 0) {
      throw new BadRequestException(
        `Task type code '${dto.typeCode}' already exists.`,
      );
    }

    const insertQuery = `
      INSERT INTO task_types (
        type_code, type_name, description, color_hex,
        icon_name, is_chargeable_default, is_active,
        created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, $7)
      RETURNING *;
    `;
    const result = await this.db.writeWithFields(
      insertQuery,
      [
        dto.typeCode,
        dto.typeName,
        dto.description || null,
        dto.colorHex || '#3B82F6',
        dto.iconName || 'check-square',
        dto.isChargeableDefault || false,
        userId,
      ],
      'task_types',
      {
        default_severity: dto.defaultSeverity,
        custom_fields: dto.customFields,
      },
    );

    return result.rows[0];
  }

  async findAll(includeInactive = false) {
    const query = `
      SELECT 
        tt.*,
        COUNT(DISTINCT t.id) AS total_tasks_created
      FROM task_types tt
      LEFT JOIN tasks t ON tt.id = t.task_type_id
      WHERE ($1::BOOLEAN = TRUE OR tt.is_active = TRUE)
      GROUP BY tt.id
      ORDER BY tt.type_name ASC;
    `;
    const result = await this.db.query(query, [includeInactive]);
    return result.rows;
  }

  async findOne(id: string) {
    const query = `
      SELECT 
        tt.*,
        COUNT(DISTINCT t.id) AS total_tasks_created
      FROM task_types tt
      LEFT JOIN tasks t ON tt.id = t.task_type_id
      WHERE tt.id = $1
      GROUP BY tt.id;
    `;
    const result = await this.db.query(query, [id]);
    if (result.rowCount === 0) {
      throw new NotFoundException(`Task type with ID ${id} not found.`);
    }
    return result.rows[0];
  }

  async update(id: string, dto: UpdateTaskTypeDto, userId: string) {
    await this.findOne(id);

    const updateQuery = `
      UPDATE task_types SET
        type_name = COALESCE($1, type_name),
        description = COALESCE($2, description),
        color_hex = COALESCE($3, color_hex),
        icon_name = COALESCE($4, icon_name),
        is_chargeable_default = COALESCE($5, is_chargeable_default),
        is_active = COALESCE($6, is_active),
        updated_by = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *;
    `;
    const result = await this.db.writeWithFields(
      updateQuery,
      [
        dto.typeName,
        dto.description,
        dto.colorHex,
        dto.iconName,
        dto.isChargeableDefault,
        dto.isActive,
        userId,
        id,
      ],
      'task_types',
      {
        default_severity: dto.defaultSeverity,
        custom_fields: dto.customFields,
      },
    );

    return result.rows[0];
  }

  async toggleActive(id: string, isActive: boolean, userId: string) {
    await this.findOne(id);
    const query = `
      UPDATE task_types SET
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
