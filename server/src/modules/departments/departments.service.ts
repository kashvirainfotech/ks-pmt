import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private readonly db: DatabaseService) {}

  async create(dto: CreateDepartmentDto, userId: string) {
    const checkQuery = `SELECT id FROM departments WHERE dept_code = $1;`;
    const checkResult = await this.db.query(checkQuery, [dto.deptCode]);
    if (checkResult.rowCount > 0) {
      throw new BadRequestException(`Department code '${dto.deptCode}' already exists.`);
    }

    const insertQuery = `
      INSERT INTO departments (
        dept_code, dept_name, description, hod_user_id,
        is_active, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, TRUE, $5, $5)
      RETURNING *;
    `;
    const result = await this.db.query(insertQuery, [
      dto.deptCode,
      dto.deptName,
      dto.description || null,
      dto.hodUserId || null,
      userId,
    ]);

    return result.rows[0];
  }

  async findAll(includeInactive = false) {
    const query = `
      SELECT 
        d.*,
        CONCAT(u.first_name, ' ', u.last_name) AS hod_name,
        u.email AS hod_email,
        COUNT(DISTINCT emp.id) AS total_employees,
        COUNT(DISTINCT des.id) AS total_designations
      FROM departments d
      LEFT JOIN users u ON d.hod_user_id = u.id
      LEFT JOIN users emp ON d.id = emp.department_id AND emp.is_active = TRUE
      LEFT JOIN designations des ON d.id = des.department_id AND des.is_active = TRUE
      WHERE ($1::BOOLEAN = TRUE OR d.is_active = TRUE)
      GROUP BY d.id, u.first_name, u.last_name, u.email
      ORDER BY d.dept_name ASC;
    `;
    const result = await this.db.query(query, [includeInactive]);
    return result.rows;
  }

  async findOne(id: string) {
    const query = `
      SELECT 
        d.*,
        CONCAT(u.first_name, ' ', u.last_name) AS hod_name,
        u.email AS hod_email,
        COUNT(DISTINCT emp.id) AS total_employees
      FROM departments d
      LEFT JOIN users u ON d.hod_user_id = u.id
      LEFT JOIN users emp ON d.id = emp.department_id AND emp.is_active = TRUE
      WHERE d.id = $1
      GROUP BY d.id, u.first_name, u.last_name, u.email;
    `;
    const result = await this.db.query(query, [id]);
    if (result.rowCount === 0) {
      throw new NotFoundException(`Department with ID ${id} not found.`);
    }

    const desigQuery = `
      SELECT id, desig_code, desig_name, hierarchy_level, is_active
      FROM designations
      WHERE department_id = $1
      ORDER BY hierarchy_level DESC;
    `;
    const desigResult = await this.db.query(desigQuery, [id]);

    return {
      ...result.rows[0],
      designations: desigResult.rows,
    };
  }

  async update(id: string, dto: UpdateDepartmentDto, userId: string) {
    await this.findOne(id);

    const updateQuery = `
      UPDATE departments SET
        dept_name = COALESCE($1, dept_name),
        description = COALESCE($2, description),
        hod_user_id = COALESCE($3, hod_user_id),
        is_active = COALESCE($4, is_active),
        updated_by = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *;
    `;
    const result = await this.db.query(updateQuery, [
      dto.deptName,
      dto.description,
      dto.hodUserId,
      dto.isActive,
      userId,
      id,
    ]);

    return result.rows[0];
  }

  async toggleActive(id: string, isActive: boolean, userId: string) {
    await this.findOne(id);
    const query = `
      UPDATE departments SET
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
