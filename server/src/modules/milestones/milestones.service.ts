import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { QueryMilestoneDto } from './dto/query-milestone.dto';

@Injectable()
export class MilestonesService {
  constructor(private readonly db: DatabaseService) {}

  async create(dto: CreateMilestoneDto, userId: string) {
    if (dto.entityType === 'PROJECT' && !dto.projectId) {
      throw new BadRequestException('projectId is required when entityType is PROJECT.');
    }
    if (dto.entityType === 'PRODUCT' && !dto.productId) {
      throw new BadRequestException('productId is required when entityType is PRODUCT.');
    }

    const query = `
      INSERT INTO milestones (
        milestone_code,
        milestone_name,
        description,
        entity_type,
        project_id,
        product_id,
        target_date,
        status,
        is_active,
        created_by,
        updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9, $9)
      RETURNING *;
    `;

    const res = await this.db.query(query, [
      dto.milestoneCode.trim().toUpperCase(),
      dto.milestoneName.trim(),
      dto.description || null,
      dto.entityType,
      dto.projectId || null,
      dto.productId || null,
      dto.targetDate || null,
      dto.status || 'PLANNED',
      userId,
    ]);

    return res.rows[0];
  }

  async findAll(query: QueryMilestoneDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['m.is_active = TRUE'];
    const params: any[] = [];
    let paramIndex = 1;

    if (query.projectId) {
      conditions.push(`m.project_id = $${paramIndex}`);
      params.push(query.projectId);
      paramIndex++;
    }

    if (query.productId) {
      conditions.push(`m.product_id = $${paramIndex}`);
      params.push(query.productId);
      paramIndex++;
    }

    if (query.status) {
      conditions.push(`m.status = $${paramIndex}`);
      params.push(query.status);
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countRes = await this.db.query(
      `SELECT COUNT(*)::int AS total FROM milestones m ${whereClause};`,
      params,
    );
    const total = countRes.rows[0]?.total || 0;

    const sql = `
      SELECT 
        m.*,
        p.project_name,
        p.project_code,
        pr.product_name,
        pr.product_code,
        COUNT(DISTINCT t.id)::int AS linked_tasks_count
      FROM milestones m
      LEFT JOIN projects p ON m.project_id = p.id
      LEFT JOIN products pr ON m.product_id = pr.id
      LEFT JOIN tasks t ON t.milestone_id = m.id
      ${whereClause}
      GROUP BY m.id, p.project_name, p.project_code, pr.product_name, pr.product_code
      ORDER BY m.target_date ASC NULLS LAST, m.milestone_name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
    `;

    const dataRes = await this.db.query(sql, [...params, limit, offset]);

    return {
      items: dataRes.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    const res = await this.db.query(
      `
      SELECT 
        m.*,
        p.project_name,
        p.project_code,
        pr.product_name,
        pr.product_code
      FROM milestones m
      LEFT JOIN projects p ON m.project_id = p.id
      LEFT JOIN products pr ON m.product_id = pr.id
      WHERE m.id = $1;
      `,
      [id],
    );

    if (res.rowCount === 0) {
      throw new NotFoundException(`Milestone with ID '${id}' not found.`);
    }

    // Load tasks linked to milestone
    const tasksRes = await this.db.query(
      `
      SELECT 
        t.id,
        t.task_code,
        t.title,
        t.hierarchy_level,
        t.priority,
        t.story_points,
        t.estimated_hours,
        ts.status_name,
        ts.status_category
      FROM tasks t
      JOIN task_statuses ts ON t.status_id = ts.id
      WHERE t.milestone_id = $1
      ORDER BY t.created_at ASC;
      `,
      [id],
    );

    return {
      ...res.rows[0],
      tasks: tasksRes.rows,
    };
  }

  async update(id: string, dto: UpdateMilestoneDto, userId: string) {
    const existing = await this.db.query(
      `SELECT * FROM milestones WHERE id = $1;`,
      [id],
    );
    if (existing.rowCount === 0) {
      throw new NotFoundException(`Milestone with ID '${id}' not found.`);
    }

    const current = existing.rows[0];
    const milestoneName = dto.milestoneName !== undefined ? dto.milestoneName.trim() : current.milestone_name;
    const description = dto.description !== undefined ? dto.description : current.description;
    const targetDate = dto.targetDate !== undefined ? dto.targetDate : current.target_date;
    const actualDate = dto.actualDate !== undefined ? dto.actualDate : current.actual_date;
    const status = dto.status !== undefined ? dto.status : current.status;
    const isActive = dto.isActive !== undefined ? dto.isActive : current.is_active;

    const query = `
      UPDATE milestones
      SET 
        milestone_name = $1,
        description = $2,
        target_date = $3,
        actual_date = $4,
        status = $5,
        is_active = $6,
        updated_by = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *;
    `;

    const res = await this.db.query(query, [
      milestoneName,
      description,
      targetDate || null,
      actualDate || null,
      status,
      isActive,
      userId,
      id,
    ]);

    return res.rows[0];
  }

  async remove(id: string, userId: string) {
    const res = await this.db.query(
      `UPDATE milestones SET is_active = FALSE, updated_by = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *;`,
      [id, userId],
    );
    if (res.rowCount === 0) {
      throw new NotFoundException(`Milestone with ID '${id}' not found.`);
    }
    return res.rows[0];
  }
}
