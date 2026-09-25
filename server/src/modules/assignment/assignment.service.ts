import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateAssignmentRuleDto } from './dto/create-assignment-rule.dto';

@Injectable()
export class AssignmentService {
  private readonly logger = new Logger(AssignmentService.name);

  constructor(private readonly db: DatabaseService) {}

  async createRule(dto: CreateAssignmentRuleDto, userId: string) {
    if (dto.targetAssignmentType === 'SPECIFIC_USER' && !dto.targetUserId) {
      throw new BadRequestException(
        'targetUserId is required when targetAssignmentType is SPECIFIC_USER.',
      );
    }
    if (
      (dto.targetAssignmentType === 'DEPARTMENT_HOD' ||
        dto.targetAssignmentType === 'DESIGNATION_HIERARCHY' ||
        dto.targetAssignmentType === 'ROUND_ROBIN') &&
      !dto.targetDepartmentId
    ) {
      throw new BadRequestException(
        'targetDepartmentId is required for this assignment strategy.',
      );
    }

    if (
      dto.targetAssignmentType === 'DESIGNATION_HIERARCHY' &&
      !dto.targetDesignationId
    )
      throw new BadRequestException('Select a target designation');
    if (dto.triggerEvent === 'ON_STATUS_CHANGE' && !dto.toStatusId)
      throw new BadRequestException('Select a destination status');
    const insertQuery = `
      INSERT INTO auto_assignment_rules (
        rule_name, trigger_event, task_type_id, from_status_id,
        to_status_id, branch_id, target_assignment_type, target_department_id,
        target_designation_id, target_user_id, is_active, created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, $11, $11
      )
      RETURNING *;
    `;

    const result = await this.db.query(insertQuery, [
      dto.ruleName,
      dto.triggerEvent,
      dto.taskTypeId || null,
      dto.fromStatusId || null,
      dto.toStatusId || null,
      dto.branchId || null,
      dto.targetAssignmentType,
      dto.targetDepartmentId || null,
      dto.targetDesignationId || null,
      dto.targetUserId || null,
      userId,
    ]);

    return result.rows[0];
  }

  async findAllRules() {
    const query = `
      SELECT 
        r.*,
        tt.type_name AS task_type_name,
        fs.status_name AS from_status_name,
        ts.status_name AS to_status_name,
        b.branch_name,
        d.dept_name AS target_dept_name,
        des.desig_name AS target_desig_name,
        CONCAT(u.first_name, ' ', u.last_name) AS target_user_name
      FROM auto_assignment_rules r
      LEFT JOIN task_types tt ON r.task_type_id = tt.id
      LEFT JOIN task_statuses fs ON r.from_status_id = fs.id
      LEFT JOIN task_statuses ts ON r.to_status_id = ts.id
      LEFT JOIN branches b ON r.branch_id = b.id
      LEFT JOIN departments d ON r.target_department_id = d.id
      LEFT JOIN designations des ON r.target_designation_id = des.id
      LEFT JOIN users u ON r.target_user_id = u.id
      WHERE r.is_active = TRUE
      ORDER BY r.created_at DESC;
    `;
    const result = await this.db.query(query);
    return result.rows;
  }

  async deleteRule(id: string) {
    const query = `UPDATE auto_assignment_rules SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *;`;
    const result = await this.db.query(query, [id]);
    if (result.rowCount === 0) {
      throw new NotFoundException(`Assignment rule ${id} not found.`);
    }
    return { success: true, message: 'Rule deactivated' };
  }

  /**
   * Evaluates auto-assignment rules for a task event and returns resolved assignee user UUID
   */
  async evaluateAutoAssignment(
    triggerEvent: 'ON_CREATION' | 'ON_STATUS_CHANGE',
    taskTypeId: string,
    branchId?: string,
    projectId?: string,
    fromStatusId?: string,
    toStatusId?: string,
  ): Promise<string | null> {
    const ruleQuery = `
      SELECT *
      FROM auto_assignment_rules
      WHERE is_active = TRUE
        AND trigger_event = $1
        AND (task_type_id IS NULL OR task_type_id = $2)
        AND (branch_id IS NULL OR branch_id = $3)
        AND ($4::UUID IS NULL OR from_status_id IS NULL OR from_status_id = $4)
        AND ($5::UUID IS NULL OR to_status_id IS NULL OR to_status_id = $5)
      ORDER BY 
        (CASE WHEN task_type_id IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN branch_id IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN to_status_id IS NOT NULL THEN 1 ELSE 0 END) DESC
      LIMIT 1;
    `;

    const ruleResult = await this.db.query(ruleQuery, [
      triggerEvent,
      taskTypeId,
      branchId || null,
      fromStatusId || null,
      toStatusId || null,
    ]);

    if (ruleResult.rowCount === 0) {
      return null;
    }

    const rule = ruleResult.rows[0];
    this.logger.log(
      `Matching auto-assignment rule found: ${rule.rule_name} (${rule.target_assignment_type})`,
    );

    // 1. Specific User
    if (
      rule.target_assignment_type === 'SPECIFIC_USER' &&
      rule.target_user_id
    ) {
      return rule.target_user_id;
    }

    // 2. Department Head (HOD)
    if (
      rule.target_assignment_type === 'DEPARTMENT_HOD' &&
      rule.target_department_id
    ) {
      const hodQuery = `SELECT hod_user_id FROM departments WHERE id = $1 AND is_active = TRUE;`;
      const hodResult = await this.db.query(hodQuery, [
        rule.target_department_id,
      ]);
      if (hodResult.rowCount > 0 && hodResult.rows[0].hod_user_id) {
        return hodResult.rows[0].hod_user_id;
      }
    }

    // 3. Designation Hierarchy in Department
    if (rule.target_assignment_type === 'DESIGNATION_HIERARCHY') {
      const desigQuery = `
        SELECT u.id
        FROM users u
        WHERE u.department_id = $1
          AND ($2::UUID IS NULL OR u.designation_id = $2)
          AND u.is_active = TRUE
        ORDER BY u.created_at ASC
        LIMIT 1;
      `;
      const desigResult = await this.db.query(desigQuery, [
        rule.target_department_id,
        rule.target_designation_id || null,
      ]);
      if (desigResult.rowCount > 0) {
        return desigResult.rows[0].id;
      }
    }

    // 4. Project Manager
    if (rule.target_assignment_type === 'PROJECT_MANAGER' && projectId) {
      const pmQuery = `SELECT project_manager_user_id FROM projects WHERE id = $1;`;
      const pmResult = await this.db.query(pmQuery, [projectId]);
      if (pmResult.rowCount > 0) {
        return pmResult.rows[0].project_manager_user_id;
      }
    }

    // 5. Round Robin (Least Loaded Employee in Department)
    if (
      rule.target_assignment_type === 'ROUND_ROBIN' &&
      rule.target_department_id
    ) {
      const rrQuery = `
        SELECT u.id, COUNT(ta.task_id) FILTER (WHERE ts.id IS NOT NULL) AS active_load
        FROM users u
        LEFT JOIN task_assignees ta ON u.id = ta.user_id
        LEFT JOIN tasks t ON ta.task_id = t.id
        LEFT JOIN task_statuses ts ON t.status_id = ts.id AND ts.is_terminal = FALSE
        WHERE u.department_id = $1 AND u.is_active = TRUE
        GROUP BY u.id
        ORDER BY active_load ASC, u.created_at ASC
        LIMIT 1;
      `;
      const rrResult = await this.db.query(rrQuery, [
        rule.target_department_id,
      ]);
      if (rrResult.rowCount > 0) {
        return rrResult.rows[0].id;
      }
    }

    return null;
  }
}
