import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(private readonly db: DatabaseService) {}

  async create(dto: CreateBranchDto, userId: string) {
    const checkQuery = `SELECT id FROM branches WHERE branch_code = $1;`;
    const checkResult = await this.db.query(checkQuery, [dto.branchCode]);
    if (checkResult.rowCount > 0) {
      throw new BadRequestException(
        `Branch code '${dto.branchCode}' already exists.`,
      );
    }

    const insertQuery = `
      INSERT INTO branches (
        branch_code, branch_name, address_line1, address_line2,
        city, state, country, postal_code, phone, email,
        latitude, longitude, geofence_radius_meters, is_head_office,
        is_active, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, TRUE, $15, $15)
      RETURNING *;
    `;
    const result = await this.db.query(insertQuery, [
      dto.branchCode,
      dto.branchName,
      dto.addressLine1,
      dto.addressLine2 || null,
      dto.city,
      dto.state,
      dto.country || 'India',
      dto.postalCode,
      dto.phone || null,
      dto.email || null,
      dto.latitude ?? null,
      dto.longitude ?? null,
      dto.geofenceRadiusMeters || 200,
      dto.isHeadOffice || false,
      userId,
    ]);

    return result.rows[0];
  }

  async findAll(includeInactive = false) {
    const query = `
      SELECT 
        b.*,
        COUNT(DISTINCT u.id) AS total_employees,
        COUNT(DISTINCT p.id) AS total_active_projects
      FROM branches b
      LEFT JOIN users u ON b.id = u.primary_branch_id AND u.is_active = TRUE
      LEFT JOIN projects p ON b.id = p.branch_id AND p.is_active = TRUE
      WHERE ($1::BOOLEAN = TRUE OR b.is_active = TRUE)
      GROUP BY b.id
      ORDER BY b.is_head_office DESC, b.branch_name ASC;
    `;
    const result = await this.db.query(query, [includeInactive]);
    return result.rows;
  }

  async findOne(id: string) {
    const query = `
      SELECT 
        b.*,
        COUNT(DISTINCT u.id) AS total_employees,
        COUNT(DISTINCT p.id) AS total_active_projects
      FROM branches b
      LEFT JOIN users u ON b.id = u.primary_branch_id AND u.is_active = TRUE
      LEFT JOIN projects p ON b.id = p.branch_id AND p.is_active = TRUE
      WHERE b.id = $1
      GROUP BY b.id;
    `;
    const result = await this.db.query(query, [id]);
    if (result.rowCount === 0) {
      throw new NotFoundException(`Branch with ID ${id} not found.`);
    }
    return result.rows[0];
  }

  async update(id: string, dto: UpdateBranchDto, userId: string) {
    await this.findOne(id);

    const updateQuery = `
      UPDATE branches SET
        branch_name = COALESCE($1, branch_name),
        address_line1 = COALESCE($2, address_line1),
        address_line2 = COALESCE($3, address_line2),
        city = COALESCE($4, city),
        state = COALESCE($5, state),
        country = COALESCE($6, country),
        postal_code = COALESCE($7, postal_code),
        phone = COALESCE($8, phone),
        email = COALESCE($9, email),
        latitude = COALESCE($10, latitude),
        longitude = COALESCE($11, longitude),
        geofence_radius_meters = COALESCE($12, geofence_radius_meters),
        is_head_office = COALESCE($13, is_head_office),
        is_active = COALESCE($14, is_active),
        updated_by = $15,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $16
      RETURNING *;
    `;

    const result = await this.db.query(updateQuery, [
      dto.branchName,
      dto.addressLine1,
      dto.addressLine2,
      dto.city,
      dto.state,
      dto.country,
      dto.postalCode,
      dto.phone,
      dto.email,
      dto.latitude,
      dto.longitude,
      dto.geofenceRadiusMeters,
      dto.isHeadOffice,
      dto.isActive,
      userId,
      id,
    ]);

    return result.rows[0];
  }

  async toggleActive(id: string, isActive: boolean, userId: string) {
    await this.findOne(id);
    const query = `
      UPDATE branches SET
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
