import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateStatusDto } from './dto/create-status.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { CreateWorkflowTransitionDto } from './dto/create-workflow-transition.dto';

@Injectable()
export class TaskWorkflowsService {
  constructor(private readonly db: DatabaseService) {}

  // ----------------------------------------------------
  // Task Statuses Management
  // ----------------------------------------------------

  async createStatus(dto: CreateStatusDto, userId: string) {
    const checkQuery = `SELECT id FROM task_statuses WHERE status_code = $1;`;
    const checkResult = await this.db.query(checkQuery, [dto.statusCode]);
    if (checkResult.rowCount > 0) {
      throw new BadRequestException(`Status code '${dto.statusCode}' already exists.`);
    }

    const insertQuery = `
      INSERT INTO task_statuses (
        status_code, status_name, description, status_category,
        sequence_order, color_hex, is_terminal, is_active,
        created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8, $8)
      RETURNING *;
    `;
    const result = await this.db.query(insertQuery, [
      dto.statusCode,
      dto.statusName,
      dto.description || null,
      dto.statusCategory,
      dto.sequenceOrder || 1,
      dto.colorHex || '#6B7280',
      dto.isTerminal || false,
      userId,
    ]);

    return result.rows[0];
  }

  async findAllStatuses(includeInactive = false) {
    const query = `
      SELECT 
        ts.*,
        COUNT(DISTINCT t.id) AS current_tasks_count
      FROM task_statuses ts
      LEFT JOIN tasks t ON ts.id = t.status_id
      WHERE ($1::BOOLEAN = TRUE OR ts.is_active = TRUE)
      GROUP BY ts.id
      ORDER BY ts.sequence_order ASC;
    `;
    const result = await this.db.query(query, [includeInactive]);
    return result.rows;
  }

  async findOneStatus(id: string) {
    const query = `SELECT * FROM task_statuses WHERE id = $1;`;
    const result = await this.db.query(query, [id]);
    if (result.rowCount === 0) {
      throw new NotFoundException(`Task status with ID ${id} not found.`);
    }
    return result.rows[0];
  }

  async updateStatus(id: string, dto: UpdateStatusDto, userId: string) {
    await this.findOneStatus(id);

    const updateQuery = `
      UPDATE task_statuses SET
        status_name = COALESCE($1, status_name),
        description = COALESCE($2, description),
        status_category = COALESCE($3, status_category),
        sequence_order = COALESCE($4, sequence_order),
        color_hex = COALESCE($5, color_hex),
        is_terminal = COALESCE($6, is_terminal),
        is_active = COALESCE($7, is_active),
        updated_by = $8,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *;
    `;
    const result = await this.db.query(updateQuery, [
      dto.statusName,
      dto.description,
      dto.statusCategory,
      dto.sequenceOrder,
      dto.colorHex,
      dto.isTerminal,
      dto.isActive,
      userId,
      id,
    ]);

    return result.rows[0];
  }

  async toggleStatusActive(id: string, isActive: boolean, userId: string) {
    await this.findOneStatus(id);
    const query = `
      UPDATE task_statuses SET
        is_active = $1,
        updated_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *;
    `;
    const result = await this.db.query(query, [isActive, userId, id]);
    return result.rows[0];
  }

  // ----------------------------------------------------
  // Dynamic Workflow Transitions Management
  // ----------------------------------------------------

  async createTransition(dto: CreateWorkflowTransitionDto, userId: string) {
    if (dto.fromStatusId === dto.toStatusId) {
      throw new BadRequestException('from_status and to_status cannot be identical.');
    }

    const checkQuery = `
      SELECT id FROM task_type_workflow_statuses
      WHERE task_type_id = $1 AND from_status_id = $2 AND to_status_id = $3;
    `;
    const checkResult = await this.db.query(checkQuery, [
      dto.taskTypeId,
      dto.fromStatusId,
      dto.toStatusId,
    ]);
    if (checkResult.rowCount > 0) {
      throw new BadRequestException('This workflow transition is already defined.');
    }

    const insertQuery = `
      INSERT INTO task_type_workflow_statuses (
        task_type_id, from_status_id, to_status_id, is_active, created_by, updated_by
      ) VALUES ($1, $2, $3, TRUE, $4, $4)
      RETURNING *;
    `;
    const result = await this.db.query(insertQuery, [
      dto.taskTypeId,
      dto.fromStatusId,
      dto.toStatusId,
      userId,
    ]);

    return result.rows[0];
  }

  async findTransitionsByTaskType(taskTypeId: string) {
    const query = `
      SELECT 
        w.id,
        w.task_type_id,
        tt.type_name,
        w.from_status_id,
        fs.status_name AS from_status_name,
        fs.color_hex AS from_status_color,
        w.to_status_id,
        ts.status_name AS to_status_name,
        ts.color_hex AS to_status_color,
        ts.is_terminal AS to_status_is_terminal,
        w.is_active
      FROM task_type_workflow_statuses w
      INNER JOIN task_types tt ON w.task_type_id = tt.id
      INNER JOIN task_statuses fs ON w.from_status_id = fs.id
      INNER JOIN task_statuses ts ON w.to_status_id = ts.id
      WHERE w.task_type_id = $1 AND w.is_active = TRUE
      ORDER BY fs.sequence_order ASC, ts.sequence_order ASC;
    `;
    const result = await this.db.query(query, [taskTypeId]);
    return result.rows;
  }

  /**
   * Evaluates dynamic workflow: Returns permitted next statuses for an active task
   */
  async getAllowedNextStatuses(taskTypeId: string, fromStatusId: string) {
    const query = `
      SELECT 
        ts.id,
        ts.status_code,
        ts.status_name,
        ts.status_category,
        ts.sequence_order,
        ts.color_hex,
        ts.is_terminal
      FROM task_type_workflow_statuses w
      INNER JOIN task_statuses ts ON w.to_status_id = ts.id
      WHERE w.task_type_id = $1 
        AND w.from_status_id = $2 
        AND w.is_active = TRUE 
        AND ts.is_active = TRUE
      ORDER BY ts.sequence_order ASC;
    `;
    const result = await this.db.query(query, [taskTypeId, fromStatusId]);
    return result.rows;
  }

  async deleteTransition(id: string) {
    const query = `
      DELETE FROM task_type_workflow_statuses
      WHERE id = $1
      RETURNING *;
    `;
    const result = await this.db.query(query, [id]);
    if (result.rowCount === 0) {
      throw new NotFoundException(`Transition with ID ${id} not found.`);
    }
    return { success: true };
  }
}
