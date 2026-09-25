import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateDesignationDto } from './dto/create-designation.dto';
import { UpdateDesignationDto } from './dto/update-designation.dto';

@Injectable()
export class DesignationsService {
  constructor(private readonly db: DatabaseService) {}

  async create(dto: CreateDesignationDto, userId: string) {
    const checkQuery = `SELECT id FROM designations WHERE desig_code = $1;`;
    const checkResult = await this.db.query(checkQuery, [dto.desigCode]);
    if (checkResult.rowCount > 0) {
      throw new BadRequestException(`Designation code '${dto.desigCode}' already exists.`);
    }

    const insertQuery = `
      INSERT INTO designations (
        desig_code, desig_name, department_id, hierarchy_level,
        description, is_active, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, TRUE, $6, $6)
      RETURNING *;
    `;
    const result = await this.db.query(insertQuery, [
      dto.desigCode,
      dto.desigName,
      dto.departmentId,
      dto.hierarchyLevel,
      dto.description || null,
      userId,
    ]);

    return result.rows[0];
  }

  async findAll(departmentId?: string, includeInactive = false) {
    const query = `
      SELECT 
        des.*,
        d.dept_name,
        d.dept_code,
        COUNT(DISTINCT u.id) AS total_employees
      FROM designations des
      INNER JOIN departments d ON des.department_id = d.id
      LEFT JOIN users u ON des.id = u.designation_id AND u.is_active = TRUE
      WHERE ($1::UUID IS NULL OR des.department_id = $1)
        AND ($2::BOOLEAN = TRUE OR des.is_active = TRUE)
      GROUP BY des.id, d.dept_name, d.dept_code
      ORDER BY des.hierarchy_level DESC, des.desig_name ASC;
    `;
    const result = await this.db.query(query, [departmentId || null, includeInactive]);
    return result.rows;
  }

  async findOne(id: string) {
    const query = `
      SELECT 
        des.*,
        d.dept_name,
        d.dept_code,
        COUNT(DISTINCT u.id) AS total_employees
      FROM designations des
      INNER JOIN departments d ON des.department_id = d.id
      LEFT JOIN users u ON des.id = u.designation_id AND u.is_active = TRUE
      WHERE des.id = $1
      GROUP BY des.id, d.dept_name, d.dept_code;
    `;
    const result = await this.db.query(query, [id]);
    if (result.rowCount === 0) {
      throw new NotFoundException(`Designation with ID ${id} not found.`);
    }
    return result.rows[0];
  }

  async update(id: string, dto: UpdateDesignationDto, userId: string) {
    await this.findOne(id);

    const updateQuery = `
      UPDATE designations SET
        desig_name = COALESCE($1, desig_name),
        department_id = COALESCE($2, department_id),
        hierarchy_level = COALESCE($3, hierarchy_level),
        description = COALESCE($4, description),
        is_active = COALESCE($5, is_active),
        updated_by = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *;
    `;
    const result = await this.db.query(updateQuery, [
      dto.desigName,
      dto.departmentId,
      dto.hierarchyLevel,
      dto.description,
      dto.isActive,
      userId,
      id,
    ]);

    return result.rows[0];
  }

  async toggleActive(id: string, isActive: boolean, userId: string) {
    await this.findOne(id);
    const query = `
      UPDATE designations SET
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
