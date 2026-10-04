import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CalendarsService } from '../calendars/calendars.service';
import { CreateSkillDto, AssignUserSkillDto, SetTaskRequiredSkillDto } from './dto/create-skill.dto';
import { CreateCapacityReservationDto } from './dto/capacity-reservation.dto';
import { SplitCoAssigneeEffortDto } from './dto/split-effort.dto';
import { CapacityWorkloadQueryDto } from './dto/capacity-query.dto';

@Injectable()
export class CapacityInsightsService {
  private readonly logger = new Logger(CapacityInsightsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly calendarsService: CalendarsService,
  ) {}

  // ========================================================
  // 1. Capacity & Workload Views (Calendar-Aware, Non-Additive)
  // ========================================================

  async getCapacityWorkload(query: CapacityWorkloadQueryDto) {
    const today = new Date();
    const startDateStr = query.startDate || today.toISOString().split('T')[0];
    const twoWeeksLater = new Date(today.getTime() + 14 * 24 * 3600 * 1000);
    const endDateStr = query.endDate || twoWeeksLater.toISOString().split('T')[0];

    // 1. Query candidate users
    let userSql = `
      SELECT DISTINCT 
        u.id, 
        u.full_name, 
        u.email, 
        u.timezone,
        d.desig_name,
        dept.dept_name,
        t.team_name,
        t.id AS team_id
      FROM users u
      LEFT JOIN designations d ON d.id = u.designation_id
      LEFT JOIN departments dept ON dept.id = u.department_id
      LEFT JOIN team_members tm ON tm.user_id = u.id AND tm.is_active = TRUE
      LEFT JOIN teams t ON t.id = tm.team_id
      WHERE u.is_active = TRUE
    `;
    const userParams: any[] = [];

    if (query.teamId) {
      userParams.push(query.teamId);
      userSql += ` AND tm.team_id = $${userParams.length}`;
    }
    if (query.projectId) {
      userParams.push(query.projectId);
      userSql += ` AND EXISTS (SELECT 1 FROM project_members pm WHERE pm.user_id = u.id AND pm.project_id = $${userParams.length} AND pm.is_active = TRUE)`;
    }

    userSql += ` ORDER BY u.full_name ASC;`;
    const usersRes = await this.db.query(userSql, userParams);

    const members: any[] = [];
    let teamAvailableHoursTotal = 0;
    let teamReservedHoursTotal = 0;
    let teamDemandHoursTotal = 0;

    for (const user of usersRes.rows) {
      // 1. Base calendar capacity
      let baseWorkingHours = 80;
      let holidaysCount = 0;
      let leaveDaysCount = 0;
      try {
        const cap = await this.calendarsService.calculateWorkingCapacity(user.id, startDateStr, endDateStr);
        baseWorkingHours = cap.totalExpectedHours;
        holidaysCount = cap.holidaysCount;
        leaveDaysCount = cap.leaveDaysCount;
      } catch (err) {
        this.logger.warn(`Failed to calculate calendar capacity for user ${user.id}: ${err.message}`);
      }

      // 2. Capacity reservations (support, mentoring, meetings, etc.)
      const resSql = `
        SELECT * FROM capacity_reservations
        WHERE user_id = $1 AND is_active = TRUE
          AND start_date <= $3::date AND end_date >= $2::date;
      `;
      const resRows = await this.db.query(resSql, [user.id, startDateStr, endDateStr]);

      let reservedHours = 0;
      const reservationsBreakdown: any[] = [];
      const daysInRange = Math.max(1, (new Date(endDateStr).getTime() - new Date(startDateStr).getTime()) / (1000 * 3600 * 24));
      const weeksInRange = daysInRange / 7;

      for (const r of resRows.rows) {
        const hrs = Math.round(parseFloat(r.reserved_hours_per_week) * weeksInRange * 10) / 10;
        reservedHours += hrs;
        reservationsBreakdown.push({
          id: r.id,
          type: r.reservation_type,
          title: r.title,
          reservedHours: hrs,
        });
      }

      // 3. Net available delivery hours
      const netAvailableHours = Math.max(0, Math.round((baseWorkingHours - reservedHours) * 10) / 10);

      // 4. Committed Project Allocation % (from project_members)
      const allocSql = `
        SELECT COALESCE(SUM(pm.allocation_percentage), 0)::numeric(5,2) AS total_alloc_pct
        FROM project_members pm
        JOIN projects p ON p.id = pm.project_id AND p.is_active = TRUE
        WHERE pm.user_id = $1 AND pm.is_active = TRUE;
      `;
      const allocRes = await this.db.query(allocSql, [user.id]);
      const committedAllocationPercentage = parseFloat(allocRes.rows[0]?.total_alloc_pct || '0');

      // 5. Active Task Demand (with split co-assignee effort shares)
      const taskDemandSql = `
        SELECT 
          t.id AS task_id,
          t.task_code,
          t.title,
          t.estimated_hours,
          ta.effort_share_percentage,
          (SELECT COUNT(*)::int FROM task_assignees sub_ta WHERE sub_ta.task_id = t.id) AS total_assignees
        FROM tasks t
        JOIN task_assignees ta ON ta.task_id = t.id AND ta.user_id = $1
        JOIN task_statuses ts ON ts.id = t.status_id AND ts.is_terminal = FALSE
        WHERE ($2::uuid IS NULL OR t.project_id = $2);
      `;
      const taskRes = await this.db.query(taskDemandSql, [user.id, query.projectId || null]);

      let userTaskDemandHours = 0;
      const assignedTasksBreakdown: any[] = [];

      for (const t of taskRes.rows) {
        const totalEst = parseFloat(t.estimated_hours) || 0;
        let userShare = 0;

        if (t.effort_share_percentage !== null && t.effort_share_percentage !== undefined) {
          userShare = (totalEst * parseFloat(t.effort_share_percentage)) / 100;
        } else {
          // Equal distribution across co-assignees
          const totalAssignees = Math.max(1, t.total_assignees);
          userShare = totalEst / totalAssignees;
        }

        userShare = Math.round(userShare * 10) / 10;
        userTaskDemandHours += userShare;

        assignedTasksBreakdown.push({
          taskId: t.task_id,
          taskCode: t.task_code,
          title: t.title,
          totalEstimatedHours: totalEst,
          userShareHours: userShare,
          effortSharePercentage: t.effort_share_percentage ? parseFloat(t.effort_share_percentage) : null,
          isSplit: t.total_assignees > 1,
        });
      }

      userTaskDemandHours = Math.round(userTaskDemandHours * 10) / 10;

      // 6. Utilization ratio
      const utilizationRatio = netAvailableHours > 0
        ? Math.round((userTaskDemandHours / netAvailableHours) * 100)
        : 100;

      let capacityStatus: 'AVAILABLE' | 'OPTIMAL' | 'OVER_ALLOCATED' = 'OPTIMAL';
      if (utilizationRatio < 75) {
        capacityStatus = 'AVAILABLE';
      } else if (utilizationRatio > 100) {
        capacityStatus = 'OVER_ALLOCATED';
      }

      teamAvailableHoursTotal += netAvailableHours;
      teamReservedHoursTotal += reservedHours;
      teamDemandHoursTotal += userTaskDemandHours;

      members.push({
        userId: user.id,
        fullName: user.full_name,
        email: user.email,
        designation: user.desig_name || 'Engineer',
        department: user.dept_name || 'Engineering',
        teamName: user.team_name || 'General Team',
        timezone: user.timezone || 'Asia/Kolkata',
        calendarMetrics: {
          baseWorkingHours,
          holidaysCount,
          leaveDaysCount,
        },
        reservedOverheadHours: reservedHours,
        reservationsBreakdown,
        netAvailableHours,
        committedAllocationPercentage,
        taskDemandHours: userTaskDemandHours,
        assignedTasksCount: assignedTasksBreakdown.length,
        assignedTasks: assignedTasksBreakdown,
        utilizationPercentage: utilizationRatio,
        capacityStatus,
      });
    }

    return {
      window: {
        startDate: startDateStr,
        endDate: endDateStr,
      },
      teamSummary: {
        totalMembers: members.length,
        totalNetAvailableHours: Math.round(teamAvailableHoursTotal * 10) / 10,
        totalReservedOverheadHours: Math.round(teamReservedHoursTotal * 10) / 10,
        totalTaskDemandHours: Math.round(teamDemandHoursTotal * 10) / 10,
        teamCapacityUtilizationPercent: teamAvailableHoursTotal > 0
          ? Math.round((teamDemandHoursTotal / teamAvailableHoursTotal) * 100)
          : 0,
      },
      members,
      notice: 'Committed allocation percentages and active task demand are separate, non-additive views. Co-assignee efforts are cleanly split without duplicating task estimates.',
    };
  }

  // ========================================================
  // 2. Split Co-Assignee Effort Allocation
  // ========================================================

  async splitCoAssigneeEffort(taskId: string, dto: SplitCoAssigneeEffortDto, userId: string) {
    const task = await this.db.query(`SELECT id, task_code, estimated_hours FROM tasks WHERE id = $1;`, [taskId]);
    if (task.rowCount === 0) {
      throw new NotFoundException(`Task not found`);
    }

    // Verify sum of shares equals 100%
    const totalPercentage = dto.shares.reduce((acc, curr) => acc + curr.effortSharePercentage, 0);
    if (Math.abs(totalPercentage - 100.0) > 0.01) {
      throw new BadRequestException(
        `Co-assignee effort shares must sum exactly to 100.0% (Current sum: ${totalPercentage}%).`,
      );
    }

    // Update each assignee's share
    for (const share of dto.shares) {
      await this.db.query(
        `UPDATE task_assignees 
         SET effort_share_percentage = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
         WHERE task_id = $3 AND user_id = $4;`,
        [share.effortSharePercentage, userId, taskId, share.userId],
      );
    }

    return {
      success: true,
      message: 'Co-assignee effort shares successfully allocated and verified to 100%.',
      taskId,
      shares: dto.shares,
    };
  }

  // ========================================================
  // 3. Explainable Skill Matching Suggestions
  // ========================================================

  async getSkillSuggestions(taskId: string) {
    const taskRes = await this.db.query(
      `SELECT t.*, p.project_name FROM tasks t LEFT JOIN projects p ON p.id = t.project_id WHERE t.id = $1;`,
      [taskId],
    );
    if (taskRes.rowCount === 0) {
      throw new NotFoundException(`Task not found`);
    }
    const task = taskRes.rows[0];

    // Fetch required skills for this task
    const reqSkillsRes = await this.db.query(
      `SELECT trs.*, s.skill_name, s.skill_code, s.category
       FROM task_required_skills trs
       JOIN skills s ON s.id = trs.skill_id
       WHERE trs.task_id = $1;`,
      [taskId],
    );
    const requiredSkills = reqSkillsRes.rows;

    // Fetch candidate users with their skills
    const candidatesRes = await this.db.query(
      `SELECT 
        u.id, 
        u.full_name, 
        u.email, 
        u.timezone,
        d.desig_name
       FROM users u
       LEFT JOIN designations d ON d.id = u.designation_id
       WHERE u.is_active = TRUE
       ORDER BY u.full_name ASC;`,
    );

    const candidates: any[] = [];
    const profWeights: Record<string, number> = {
      BEGINNER: 25,
      INTERMEDIATE: 50,
      ADVANCED: 75,
      EXPERT: 100,
    };

    for (const user of candidatesRes.rows) {
      const userSkillsRes = await this.db.query(
        `SELECT us.*, s.skill_name, s.skill_code
         FROM user_skills us
         JOIN skills s ON s.id = us.skill_id
         WHERE us.user_id = $1 AND us.is_active = TRUE;`,
        [user.id],
      );
      const userSkills = userSkillsRes.rows;

      // 1. Skill Match Calculation
      let matchedCount = 0;
      let skillMatchScore = 100; // Default 100 if no required skills specified
      const explanations: string[] = [];

      if (requiredSkills.length > 0) {
        let totalWeight = 0;
        let earnedWeight = 0;

        for (const req of requiredSkills) {
          const reqWeight = req.importance === 'REQUIRED' ? 1.5 : 1.0;
          totalWeight += reqWeight * 100;

          const match = userSkills.find((us) => us.skill_id === req.skill_id);
          if (match) {
            matchedCount++;
            const earnedProf = profWeights[match.proficiency_level] || 50;
            earnedWeight += reqWeight * earnedProf;
            explanations.push(
              `Has ${req.skill_name} at ${match.proficiency_level} level (${match.years_experience || 1} yrs exp)`,
            );
          } else {
            explanations.push(`Missing ${req.skill_name} (${req.importance.toLowerCase()})`);
          }
        }

        skillMatchScore = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
      } else {
        explanations.push(`General candidate (no specific skills tagged on task)`);
      }

      // 2. Availability score
      let bandwidthHours = 30;
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const nextWeekStr = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0];
        const cap = await this.calendarsService.calculateWorkingCapacity(user.id, todayStr, nextWeekStr);
        bandwidthHours = cap.totalExpectedHours;
      } catch (err) {
        bandwidthHours = 35;
      }
      explanations.push(`Estimated ${bandwidthHours}h available working schedule in next 7 days`);

      // 3. Timezone overlap
      const timezoneOverlap = user.timezone === 'Asia/Kolkata' ? 100 : 80;
      explanations.push(`Timezone: ${user.timezone || 'Asia/Kolkata'}`);

      // Composite match score: 60% Skill Match, 30% Bandwidth, 10% Timezone
      const compositeScore = Math.round(
        skillMatchScore * 0.6 + Math.min(100, (bandwidthHours / 40) * 100) * 0.3 + timezoneOverlap * 0.1,
      );

      candidates.push({
        userId: user.id,
        fullName: user.full_name,
        email: user.email,
        designation: user.desig_name || 'Engineer',
        compositeScore,
        skillMatchScore,
        matchedSkillsCount: matchedCount,
        totalRequiredSkills: requiredSkills.length,
        bandwidthHours,
        timezone: user.timezone || 'Asia/Kolkata',
        explanations,
      });
    }

    candidates.sort((a, b) => b.compositeScore - a.compositeScore);

    return {
      taskId: task.id,
      taskCode: task.task_code,
      taskTitle: task.title,
      requiredSkills,
      suggestions: candidates.slice(0, 10),
      disclosure: 'Skill suggestions provide explainable ranking factors for human PM/lead review. Blind automatic reassignments are prohibited.',
    };
  }

  // ========================================================
  // 4. Team Estimation Reliability & Metrics
  // ========================================================

  async getTeamEstimationMetrics(teamId?: string, projectId?: string, sprintId?: string) {
    let sql = `
      SELECT 
        t.id,
        t.task_code,
        t.title,
        t.estimated_hours,
        COALESCE(
          (SELECT SUM(ttl.hours_spent)::numeric(8,2) FROM task_time_logs ttl WHERE ttl.task_id = t.id AND ttl.approval_status = 'APPROVED'),
          0.00
        ) AS logged_hours,
        t.planned_end_date,
        t.resolved_at,
        t.actual_end_date,
        EXISTS(
          SELECT 1 FROM task_status_durations tsd WHERE tsd.task_id = t.id AND tsd.is_rework = TRUE
        ) AS has_rework
      FROM tasks t
      JOIN task_statuses ts ON ts.id = t.status_id AND ts.is_terminal = TRUE AND ts.status_category = 'DONE'
      WHERE 1=1
    `;
    const params: any[] = [];
    if (teamId) {
      params.push(teamId);
      sql += ` AND t.responsible_team_id = $${params.length}`;
    }
    if (projectId) {
      params.push(projectId);
      sql += ` AND t.project_id = $${params.length}`;
    }
    if (sprintId) {
      params.push(sprintId);
      sql += ` AND t.sprint_id = $${params.length}`;
    }

    const res = await this.db.query(sql, params);

    let totalEstimated = 0;
    let totalActual = 0;
    let sumEai = 0;
    let onTimeCount = 0;
    let reworkCount = 0;

    const taskItems: any[] = [];

    for (const r of res.rows) {
      const est = parseFloat(r.estimated_hours) || 0;
      const act = parseFloat(r.logged_hours) || 0;

      totalEstimated += est;
      totalActual += act;

      // Estimation Accuracy Index
      let eai = 1.0;
      if (est > 0 || act > 0) {
        const maxVal = Math.max(est, act);
        const diff = Math.abs(est - act);
        eai = Math.max(0, 1.0 - diff / maxVal);
      }
      sumEai += eai;

      // On-time check
      let isOnTime = true;
      if (r.planned_end_date) {
        const completionTime = new Date(r.resolved_at || r.actual_end_date || r.planned_end_date).getTime();
        const targetTime = new Date(r.planned_end_date).getTime();
        if (completionTime > targetTime) {
          isOnTime = false;
        }
      }
      if (isOnTime) onTimeCount++;

      if (r.has_rework) reworkCount++;

      taskItems.push({
        taskId: r.id,
        taskCode: r.task_code,
        title: r.title,
        estimatedHours: est,
        actualHours: act,
        eai: Math.round(eai * 1000) / 1000,
        isOnTime,
        hasRework: r.has_rework,
      });
    }

    const sampleSize = res.rowCount;
    const avgEai = sampleSize > 0 ? Math.round((sumEai / sampleSize) * 1000) / 1000 : 1.0;
    const otdRate = sampleSize > 0 ? Math.round((onTimeCount / sampleSize) * 1000) / 10 : 100;
    const ftrRate = sampleSize > 0 ? Math.round(((sampleSize - reworkCount) / sampleSize) * 1000) / 10 : 100;

    let bias = 'BALANCED';
    if (totalActual > totalEstimated * 1.1) {
      bias = 'UNDER_ESTIMATING'; // Team tends to under-estimate effort (actual > estimated)
    } else if (totalEstimated > totalActual * 1.1) {
      bias = 'OVER_ESTIMATING';
    }

    return {
      sampleSize,
      totals: {
        totalEstimatedHours: Math.round(totalEstimated * 10) / 10,
        totalActualLoggedHours: Math.round(totalActual * 10) / 10,
        differenceHours: Math.round((totalActual - totalEstimated) * 10) / 10,
      },
      metrics: {
        estimationAccuracyIndex: avgEai,
        estimationAccuracyPercent: Math.round(avgEai * 1000) / 10,
        estimationBias: bias,
        onTimeDeliveryRatePercent: otdRate,
        firstTimeRightRatePercent: ftrRate,
        reworkEpisodesCount: reworkCount,
      },
      completedTasks: taskItems.slice(0, 50),
      disclosure: 'Estimation metrics reflect team-level delivery reliability for sprint planning and coaching. Individual employee productivity rankings are deferred.',
    };
  }

  // ========================================================
  // 5. Skills & Competencies Management
  // ========================================================

  async getSkills() {
    const res = await this.db.query(
      `SELECT * FROM skills WHERE is_active = TRUE ORDER BY category ASC, skill_name ASC;`,
    );
    return res.rows;
  }

  async createSkill(dto: CreateSkillDto, userId: string) {
    const code = dto.skill_code || `SKILL-${Date.now().toString(36).toUpperCase()}`;
    const res = await this.db.query(
      `INSERT INTO skills (skill_code, skill_name, category, description, is_active, created_by)
       VALUES ($1, $2, $3, $4, TRUE, $5) RETURNING *;`,
      [code, dto.skill_name, dto.category, dto.description || null, userId],
    );
    return res.rows[0];
  }

  async getUserSkills(userId: string) {
    const res = await this.db.query(
      `SELECT us.*, s.skill_code, s.skill_name, s.category, u.full_name AS verifier_name
       FROM user_skills us
       JOIN skills s ON s.id = us.skill_id
       LEFT JOIN users u ON u.id = us.verified_by
       WHERE us.user_id = $1 AND us.is_active = TRUE
       ORDER BY us.proficiency_level DESC;`,
      [userId],
    );
    return res.rows;
  }

  async assignUserSkill(userId: string, dto: AssignUserSkillDto, authorId: string) {
    const res = await this.db.query(
      `INSERT INTO user_skills (user_id, skill_id, proficiency_level, years_experience, is_verified, verified_by, is_active, created_by)
       VALUES ($1, $2, $3, $4, TRUE, $5, TRUE, $5)
       ON CONFLICT (user_id, skill_id) DO UPDATE SET
         proficiency_level = EXCLUDED.proficiency_level,
         years_experience = EXCLUDED.years_experience,
         updated_by = EXCLUDED.created_by,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *;`,
      [userId, dto.skill_id, dto.proficiency_level, dto.years_experience || 1.0, authorId],
    );
    return res.rows[0];
  }

  async setTaskRequiredSkill(taskId: string, dto: SetTaskRequiredSkillDto, authorId: string) {
    const res = await this.db.query(
      `INSERT INTO task_required_skills (task_id, skill_id, min_proficiency_level, importance, created_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (task_id, skill_id) DO UPDATE SET
         min_proficiency_level = EXCLUDED.min_proficiency_level,
         importance = EXCLUDED.importance,
         updated_by = EXCLUDED.created_by,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *;`,
      [taskId, dto.skill_id, dto.min_proficiency_level, dto.importance, authorId],
    );
    return res.rows[0];
  }

  async removeTaskRequiredSkill(taskId: string, skillId: string) {
    await this.db.query(
      `DELETE FROM task_required_skills WHERE task_id = $1 AND skill_id = $2;`,
      [taskId, skillId],
    );
    return { success: true };
  }

  // ========================================================
  // 6. Capacity Reservations (Overhead, Mentoring, Rotations)
  // ========================================================

  async getCapacityReservations(userId?: string, projectId?: string) {
    let sql = `
      SELECT cr.*, u.full_name, p.project_name
      FROM capacity_reservations cr
      JOIN users u ON u.id = cr.user_id
      LEFT JOIN projects p ON p.id = cr.project_id
      WHERE cr.is_active = TRUE
    `;
    const params: any[] = [];
    if (userId) {
      params.push(userId);
      sql += ` AND cr.user_id = $${params.length}`;
    }
    if (projectId) {
      params.push(projectId);
      sql += ` AND (cr.project_id = $${params.length} OR cr.project_id IS NULL)`;
    }
    sql += ` ORDER BY cr.start_date DESC;`;
    const res = await this.db.query(sql, params);
    return res.rows;
  }

  async createCapacityReservation(dto: CreateCapacityReservationDto, authorId: string) {
    const code = dto.reservation_code || `RES-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;
    const res = await this.db.query(
      `INSERT INTO capacity_reservations (
        reservation_code, user_id, project_id, reservation_type, title, description,
        start_date, end_date, reserved_hours_per_week, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10) RETURNING *;`,
      [
        code,
        dto.user_id,
        dto.project_id || null,
        dto.reservation_type,
        dto.title,
        dto.description || null,
        dto.start_date,
        dto.end_date,
        dto.reserved_hours_per_week,
        authorId,
      ],
    );
    return res.rows[0];
  }

  async deleteCapacityReservation(id: string, authorId: string) {
    await this.db.query(
      `UPDATE capacity_reservations SET is_active = FALSE, updated_by = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2;`,
      [authorId, id],
    );
    return { success: true };
  }
}
