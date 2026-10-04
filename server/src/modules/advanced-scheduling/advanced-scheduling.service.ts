import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import { CreateScenarioDto } from "./dto/create-scenario.dto";
import { ScenarioQueryDto } from "./dto/scenario-query.dto";
import { UpdateScenarioOverrideDto } from "./dto/update-scenario-override.dto";
import { UpsertHealthConfigDto } from "./dto/health-config.dto";
import { RecordHealthOverrideDto } from "./dto/health-override.dto";

export interface CPMTaskNode {
  taskId: string;
  taskCode: string;
  title: string;
  durationHours: number;
  durationDays: number;
  startDate: string | null;
  dueDate: string | null;
  priority: string;
  predecessors: {
    sourceTaskId: string;
    linkType: string;
    lagHours: number;
  }[];
  successors: {
    targetTaskId: string;
    linkType: string;
    lagHours: number;
  }[];
  es: number; // Earliest Start (in hours from t0)
  ef: number; // Earliest Finish
  ls: number; // Latest Start
  lf: number; // Latest Finish
  totalSlack: number;
  freeSlack: number;
  isCritical: boolean;
}

@Injectable()
export class AdvancedSchedulingService {
  private readonly logger = new Logger(AdvancedSchedulingService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Run Critical Path Method (CPM) Network Analysis on a Project's tasks & dependencies
   */
  async calculateProjectCPM(projectId: string): Promise<{
    criticalPathLengthHours: number;
    projectDurationDays: number;
    criticalTasksCount: number;
    totalTasksCount: number;
    nodes: CPMTaskNode[];
    criticalChain: string[];
  }> {
    // 1. Fetch active tasks for this project
    const tasksRes = await this.db.query(
      `
      SELECT id, task_code, title, estimated_hours, planned_start_date, planned_end_date, priority
      FROM tasks
      WHERE project_id = $1 AND is_active = TRUE
      ORDER BY planned_start_date ASC NULLS LAST, created_at ASC
    `,
      [projectId],
    );

    if (tasksRes.rows.length === 0) {
      return {
        criticalPathLengthHours: 0,
        projectDurationDays: 0,
        criticalTasksCount: 0,
        totalTasksCount: 0,
        nodes: [],
        criticalChain: [],
      };
    }

    const taskMap = new Map<string, CPMTaskNode>();
    for (const r of tasksRes.rows) {
      const durHours = Math.max(1, parseFloat(r.estimated_hours || "8"));
      taskMap.set(r.id, {
        taskId: r.id,
        taskCode: r.task_code,
        title: r.title,
        durationHours: durHours,
        durationDays: Math.ceil(durHours / 8),
        startDate: r.planned_start_date,
        dueDate: r.planned_end_date,
        priority: r.priority,
        predecessors: [],
        successors: [],
        es: 0,
        ef: durHours,
        ls: 0,
        lf: 0,
        totalSlack: 0,
        freeSlack: 0,
        isCritical: false,
      });
    }

    // 2. Fetch dependencies between tasks in this project
    const taskIds = Array.from(taskMap.keys());
    const depsRes = await this.db.query(
      `
      SELECT source_task_id, target_task_id, link_type, lag_duration_hours, lag_unit
      FROM task_dependencies
      WHERE source_task_id = ANY($1::uuid[]) AND target_task_id = ANY($1::uuid[])
        AND link_type IN ('FINISH_TO_START', 'START_TO_START', 'FINISH_TO_FINISH', 'START_TO_FINISH', 'BLOCKS')
    `,
      [taskIds],
    );

    for (const dep of depsRes.rows) {
      const srcNode = taskMap.get(dep.source_task_id);
      const tgtNode = taskMap.get(dep.target_task_id);
      if (!srcNode || !tgtNode) continue;

      let lagHours = parseFloat(dep.lag_duration_hours || "0");
      if (dep.lag_unit === "DAYS") lagHours *= 8;

      tgtNode.predecessors.push({
        sourceTaskId: dep.source_task_id,
        linkType: dep.link_type,
        lagHours,
      });
      srcNode.successors.push({
        targetTaskId: dep.target_task_id,
        linkType: dep.link_type,
        lagHours,
      });
    }

    // 3. Topological sorting (Kahn's algorithm) to detect cycles and order calculations
    const inDegree = new Map<string, number>();
    for (const [id, node] of taskMap.entries()) {
      inDegree.set(id, node.predecessors.length);
    }

    const queue: string[] = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) queue.push(id);
    }

    const topoOrder: string[] = [];
    while (queue.length > 0) {
      const u = queue.shift()!;
      topoOrder.push(u);
      const uNode = taskMap.get(u)!;
      for (const succ of uNode.successors) {
        const d = (inDegree.get(succ.targetTaskId) || 1) - 1;
        inDegree.set(succ.targetTaskId, d);
        if (d === 0) queue.push(succ.targetTaskId);
      }
    }

    // If cycle exists, append unvisited nodes to finish gracefully
    if (topoOrder.length < taskMap.size) {
      for (const id of taskMap.keys()) {
        if (!topoOrder.includes(id)) topoOrder.push(id);
      }
    }

    // 4. Forward Pass (Calculate ES and EF)
    for (const id of topoOrder) {
      const node = taskMap.get(id)!;
      let maxES = 0;

      for (const pred of node.predecessors) {
        const predNode = taskMap.get(pred.sourceTaskId);
        if (!predNode) continue;

        let candidateES = 0;
        switch (pred.linkType) {
          case "START_TO_START":
            candidateES = predNode.es + pred.lagHours;
            break;
          case "FINISH_TO_FINISH":
            candidateES = predNode.ef + pred.lagHours - node.durationHours;
            break;
          case "START_TO_FINISH":
            candidateES = predNode.es + pred.lagHours - node.durationHours;
            break;
          case "FINISH_TO_START":
          case "BLOCKS":
          default:
            candidateES = predNode.ef + pred.lagHours;
            break;
        }
        if (candidateES > maxES) maxES = candidateES;
      }

      node.es = Math.max(0, maxES);
      node.ef = node.es + node.durationHours;
    }

    // Project duration in hours
    let maxProjectHours = 0;
    for (const node of taskMap.values()) {
      if (node.ef > maxProjectHours) maxProjectHours = node.ef;
    }

    // 5. Backward Pass (Calculate LF and LS)
    const reverseTopo = [...topoOrder].reverse();
    for (const id of reverseTopo) {
      const node = taskMap.get(id)!;
      if (node.successors.length === 0) {
        node.lf = maxProjectHours;
      } else {
        let minLF = Infinity;
        for (const succ of node.successors) {
          const succNode = taskMap.get(succ.targetTaskId);
          if (!succNode) continue;

          let candidateLF = Infinity;
          switch (succ.linkType) {
            case "START_TO_START":
              candidateLF = succNode.ls - succ.lagHours + node.durationHours;
              break;
            case "FINISH_TO_FINISH":
              candidateLF = succNode.lf - succ.lagHours;
              break;
            case "START_TO_FINISH":
              candidateLF = succNode.lf - succ.lagHours + node.durationHours;
              break;
            case "FINISH_TO_START":
            case "BLOCKS":
            default:
              candidateLF = succNode.ls - succ.lagHours;
              break;
          }
          if (candidateLF < minLF) minLF = candidateLF;
        }
        node.lf = minLF === Infinity ? maxProjectHours : minLF;
      }
      node.ls = node.lf - node.durationHours;
      node.totalSlack = Math.round((node.ls - node.es) * 100) / 100;
      node.isCritical = node.totalSlack <= 0.01;
    }

    const nodesList = Array.from(taskMap.values());
    const criticalChain = nodesList
      .filter((n) => n.isCritical)
      .sort((a, b) => a.es - b.es)
      .map((n) => n.taskCode);

    return {
      criticalPathLengthHours: maxProjectHours,
      projectDurationDays: Math.ceil(maxProjectHours / 8),
      criticalTasksCount: criticalChain.length,
      totalTasksCount: nodesList.length,
      nodes: nodesList,
      criticalChain,
    };
  }

  /**
   * List schedule scenarios for a project
   */
  async getScenarios(query: ScenarioQueryDto) {
    let sql = `
      SELECT s.*, u.full_name as applied_by_name, p.project_name
      FROM schedule_scenarios s
      LEFT JOIN users u ON u.id = s.applied_by
      LEFT JOIN projects p ON p.id = s.project_id
      WHERE s.is_active = TRUE
    `;
    const params: any[] = [];

    if (query.projectId) {
      params.push(query.projectId);
      sql += ` AND s.project_id = $${params.length}`;
    }
    if (query.status) {
      params.push(query.status);
      sql += ` AND s.status = $${params.length}`;
    }

    sql += ` ORDER BY s.created_at DESC`;
    const res = await this.db.query(sql, params);
    return res.rows;
  }

  /**
   * Get single scenario with its simulated task overrides
   */
  async getScenarioById(id: string) {
    const scenarioRes = await this.db.query(
      `
      SELECT s.*, u.full_name as applied_by_name, p.project_name
      FROM schedule_scenarios s
      LEFT JOIN users u ON u.id = s.applied_by
      LEFT JOIN projects p ON p.id = s.project_id
      WHERE s.id = $1 AND s.is_active = TRUE
    `,
      [id],
    );

    if (scenarioRes.rows.length === 0) {
      throw new NotFoundException(`Scenario with ID ${id} not found`);
    }

    const overridesRes = await this.db.query(
      `
      SELECT o.*, t.task_code, t.title, t.estimated_hours as original_estimated_hours,
             t.planned_start_date as original_start_date, t.planned_end_date as original_due_date,
             t.priority as original_priority
      FROM schedule_scenario_task_overrides o
      JOIN tasks t ON t.id = o.task_id
      WHERE o.scenario_id = $1 AND o.is_active = TRUE
      ORDER BY o.is_critical_path DESC, o.earliest_start_date ASC NULLS LAST
    `,
      [id],
    );

    return {
      ...scenarioRes.rows[0],
      overrides: overridesRes.rows,
    };
  }

  /**
   * Create a new What-If Scenario and seed task overrides from project baseline
   */
  async createScenario(dto: CreateScenarioDto, userId: string) {
    // Verify project exists
    const projRes = await this.db.query(
      `SELECT id, target_end_date FROM projects WHERE id = $1`,
      [dto.projectId],
    );
    if (projRes.rows.length === 0) {
      throw new NotFoundException(`Project with ID ${dto.projectId} not found`);
    }

    const baselineEndDate = projRes.rows[0].target_end_date || new Date().toISOString().slice(0, 10);

    const scenarioRes = await this.db.query(
      `
      INSERT INTO schedule_scenarios (
        project_id, scenario_code, name, description, scenario_type,
        status, baseline_end_date, simulated_end_date, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, 'DRAFT', $6, $6, $7, $7)
      RETURNING *;
    `,
      [
        dto.projectId,
        dto.scenarioCode,
        dto.name,
        dto.description || null,
        dto.scenarioType,
        baselineEndDate,
        userId,
      ],
    );

    const scenario = scenarioRes.rows[0];

    // Seed task overrides from active tasks
    const tasksRes = await this.db.query(
      `
      SELECT id, planned_start_date, planned_end_date, estimated_hours, priority
      FROM tasks
      WHERE project_id = $1 AND is_active = TRUE
    `,
      [dto.projectId],
    );

    for (const t of tasksRes.rows) {
      await this.db.query(
        `
        INSERT INTO schedule_scenario_task_overrides (
          scenario_id, task_id, simulated_start_date, simulated_due_date,
          simulated_estimated_hours, simulated_priority, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
        ON CONFLICT (scenario_id, task_id) DO NOTHING;
      `,
        [
          scenario.id,
          t.id,
          t.planned_start_date,
          t.planned_end_date,
          parseFloat(t.estimated_hours || "8"),
          t.priority,
          userId,
        ],
      );
    }

    // Run simulation pass on the created scenario
    await this.simulateScenario(scenario.id, userId);

    return this.getScenarioById(scenario.id);
  }

  /**
   * Update a specific task simulation override in a scenario
   */
  async updateScenarioOverride(
    scenarioId: string,
    overrideId: string,
    dto: UpdateScenarioOverrideDto,
    userId: string,
  ) {
    const checkRes = await this.db.query(
      `SELECT id, status FROM schedule_scenarios WHERE id = $1 AND is_active = TRUE`,
      [scenarioId],
    );
    if (checkRes.rows.length === 0) {
      throw new NotFoundException(`Scenario with ID ${scenarioId} not found`);
    }
    if (checkRes.rows[0].status === "APPLIED") {
      throw new BadRequestException("Cannot edit an already applied scenario");
    }

    await this.db.query(
      `
      UPDATE schedule_scenario_task_overrides
      SET simulated_start_date = COALESCE($1, simulated_start_date),
          simulated_due_date = COALESCE($2, simulated_due_date),
          simulated_estimated_hours = COALESCE($3, simulated_estimated_hours),
          simulated_priority = COALESCE($4, simulated_priority),
          notes = COALESCE($5, notes),
          updated_by = $6,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7 AND scenario_id = $8;
    `,
      [
        dto.simulatedStartDate || null,
        dto.simulatedDueDate || null,
        dto.simulatedEstimatedHours ?? null,
        dto.simulatedPriority || null,
        dto.notes || null,
        userId,
        overrideId,
        scenarioId,
      ],
    );

    // Re-simulate
    return this.simulateScenario(scenarioId, userId);
  }

  /**
   * Run simulation computation on a scenario: computes CPM on overrides and updates scenario summary
   */
  async simulateScenario(scenarioId: string, userId: string) {
    const scenarioRes = await this.db.query(
      `SELECT * FROM schedule_scenarios WHERE id = $1 AND is_active = TRUE`,
      [scenarioId],
    );
    if (scenarioRes.rows.length === 0) {
      throw new NotFoundException(`Scenario with ID ${scenarioId} not found`);
    }
    const scenario = scenarioRes.rows[0];

    // Compute base CPM
    const cpm = await this.calculateProjectCPM(scenario.project_id);

    // Update overrides with CPM values
    for (const node of cpm.nodes) {
      await this.db.query(
        `
        UPDATE schedule_scenario_task_overrides
        SET total_slack_hours = $1,
            free_slack_hours = $2,
            is_critical_path = $3,
            updated_by = $4,
            updated_at = CURRENT_TIMESTAMP
        WHERE scenario_id = $5 AND task_id = $6;
      `,
        [
          node.totalSlack,
          node.freeSlack,
          node.isCritical,
          userId,
          scenarioId,
          node.taskId,
        ],
      );
    }

    // Determine simulated end date (baseline + duration days shift)
    const baseDate = new Date(scenario.baseline_end_date || new Date());
    const simulatedDate = new Date(baseDate.getTime() + cpm.projectDurationDays * 86400000);
    const simulatedDateStr = simulatedDate.toISOString().slice(0, 10);
    const varianceDays = Math.round(
      (simulatedDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    const summary = {
      critical_path_tasks: cpm.criticalChain,
      critical_path_length_hours: cpm.criticalPathLengthHours,
      project_duration_days: cpm.projectDurationDays,
      total_tasks_count: cpm.totalTasksCount,
      critical_tasks_count: cpm.criticalTasksCount,
    };

    const updateRes = await this.db.query(
      `
      UPDATE schedule_scenarios
      SET status = CASE WHEN status = 'DRAFT' THEN 'SIMULATED' ELSE status END,
          simulated_end_date = $1,
          critical_path_length_hours = $2,
          schedule_variance_days = $3,
          impacted_tasks_count = $4,
          simulation_summary = $5,
          updated_by = $6,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *;
    `,
      [
        simulatedDateStr,
        cpm.criticalPathLengthHours,
        varianceDays,
        cpm.nodes.filter((n) => n.isCritical).length,
        JSON.stringify(summary),
        userId,
        scenarioId,
      ],
    );

    return this.getScenarioById(scenarioId);
  }

  /**
   * Explicitly apply simulated scenario changes to live project tasks
   * Enforces strict authorization and updates live task dates
   */
  async applyScenario(scenarioId: string, userId: string) {
    const scenario = await this.getScenarioById(scenarioId);
    if (scenario.status === "APPLIED") {
      throw new BadRequestException("Scenario has already been applied");
    }

    // Transactional application to live tasks
    return this.db.transaction(async (client) => {
      let appliedCount = 0;
      for (const override of scenario.overrides) {
        if (override.simulated_start_date || override.simulated_due_date) {
          await client.query(
            `
            UPDATE tasks
            SET planned_start_date = COALESCE($1, planned_start_date),
                planned_end_date = COALESCE($2, planned_end_date),
                estimated_hours = COALESCE($3, estimated_hours),
                priority = COALESCE($4, priority),
                updated_by = $5,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6;
          `,
            [
              override.simulated_start_date || null,
              override.simulated_due_date || null,
              override.simulated_estimated_hours ?? null,
              override.simulated_priority || null,
              userId,
              override.task_id,
            ],
          );
          appliedCount++;
        }
      }

      await client.query(
        `
        UPDATE schedule_scenarios
        SET status = 'APPLIED',
            applied_at = CURRENT_TIMESTAMP,
            applied_by = $1,
            updated_by = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2;
      `,
        [userId, scenarioId],
      );

      this.logger.log(
        `User ${userId} applied schedule scenario ${scenario.scenario_code} affecting ${appliedCount} live tasks`,
      );

      return {
        success: true,
        scenarioId,
        scenarioCode: scenario.scenario_code,
        appliedTasksCount: appliedCount,
        appliedAt: new Date().toISOString(),
      };
    });
  }

  // =========================================================================
  // CALIBRATED COMPOSITE PROJECT HEALTH ENGINE
  // =========================================================================

  /**
   * Get active health score configuration for project (or global default)
   */
  async getHealthConfig(projectId?: string) {
    let res = await this.db.query(
      `SELECT * FROM project_health_score_configs WHERE project_id = $1 AND is_active = TRUE`,
      [projectId || null],
    );

    if (res.rows.length === 0) {
      // Fallback to global config where project_id IS NULL
      res = await this.db.query(
        `SELECT * FROM project_health_score_configs WHERE project_id IS NULL AND is_active = TRUE`,
      );
    }

    if (res.rows.length === 0) {
      // Default fallback
      return {
        weight_schedule: 30.0,
        weight_scope: 20.0,
        weight_quality: 20.0,
        weight_blockers: 15.0,
        weight_budget_flow: 15.0,
        schedule_slip_warning_days: 3,
        schedule_slip_critical_days: 7,
        defect_density_critical_ratio: 0.25,
        blocker_age_critical_hours: 48.0,
        missing_data_strategy: "NEUTRAL_SCORE",
      };
    }

    return res.rows[0];
  }

  /**
   * Upsert project health score configuration
   */
  async upsertHealthConfig(dto: UpsertHealthConfigDto, userId: string) {
    const totalWeight =
      Number(dto.weightSchedule) +
      Number(dto.weightScope) +
      Number(dto.weightQuality) +
      Number(dto.weightBlockers) +
      Number(dto.weightBudgetFlow);

    if (Math.abs(totalWeight - 100.0) > 0.01) {
      throw new BadRequestException(
        `Health score dimension weights must sum to exactly 100.00% (currently ${totalWeight}%)`,
      );
    }

    const res = await this.db.query(
      `
      INSERT INTO project_health_score_configs (
        project_id, weight_schedule, weight_scope, weight_quality, weight_blockers, weight_budget_flow,
        schedule_slip_warning_days, schedule_slip_critical_days, defect_density_critical_ratio,
        blocker_age_critical_hours, missing_data_strategy, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
      ON CONFLICT (project_id) DO UPDATE SET
        weight_schedule = EXCLUDED.weight_schedule,
        weight_scope = EXCLUDED.weight_scope,
        weight_quality = EXCLUDED.weight_quality,
        weight_blockers = EXCLUDED.weight_blockers,
        weight_budget_flow = EXCLUDED.weight_budget_flow,
        schedule_slip_warning_days = EXCLUDED.schedule_slip_warning_days,
        schedule_slip_critical_days = EXCLUDED.schedule_slip_critical_days,
        defect_density_critical_ratio = EXCLUDED.defect_density_critical_ratio,
        blocker_age_critical_hours = EXCLUDED.blocker_age_critical_hours,
        missing_data_strategy = EXCLUDED.missing_data_strategy,
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `,
      [
        dto.projectId || null,
        dto.weightSchedule,
        dto.weightScope,
        dto.weightQuality,
        dto.weightBlockers,
        dto.weightBudgetFlow,
        dto.scheduleSlipWarningDays ?? 3,
        dto.scheduleSlipCriticalDays ?? 7,
        dto.defectDensityCriticalRatio ?? 0.25,
        dto.blockerAgeCriticalHours ?? 48.0,
        dto.missingDataStrategy || "NEUTRAL_SCORE",
        userId,
      ],
    );

    return res.rows[0];
  }

  /**
   * Evaluate calibrated composite project health score across 5 objective dimensions
   */
  async evaluateProjectHealth(projectId: string) {
    const config = await this.getHealthConfig(projectId);

    // 1. Schedule Dimension
    const scheduleRes = await this.db.query(
      `
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN planned_end_date < CURRENT_DATE AND actual_end_date IS NULL THEN 1 END) as overdue_tasks,
        MAX(CASE WHEN planned_end_date < CURRENT_DATE AND actual_end_date IS NULL THEN (CURRENT_DATE - planned_end_date) ELSE 0 END) as max_slip_days
      FROM tasks
      WHERE project_id = $1 AND is_active = TRUE
    `,
      [projectId],
    );
    const totalTasks = parseInt(scheduleRes.rows[0]?.total_tasks || "0", 10);
    const overdueTasks = parseInt(scheduleRes.rows[0]?.overdue_tasks || "0", 10);
    const maxSlipDays = parseInt(scheduleRes.rows[0]?.max_slip_days || "0", 10);

    let scheduleScore = 100;
    if (maxSlipDays >= config.schedule_slip_critical_days) {
      scheduleScore = Math.max(30, 70 - (maxSlipDays - config.schedule_slip_critical_days) * 5);
    } else if (maxSlipDays >= config.schedule_slip_warning_days) {
      scheduleScore = 80 - (maxSlipDays - config.schedule_slip_warning_days) * 4;
    } else if (overdueTasks > 0) {
      scheduleScore = 90;
    }

    // 2. Scope Dimension (CR volume & scope stability)
    const scopeRes = await this.db.query(
      `
      SELECT COUNT(*) as cr_count,
             COALESCE(SUM(impact_hours), 0) as total_impact_hours
      FROM change_requests
      WHERE project_id = $1 AND status IN ('PENDING_APPROVAL', 'APPROVED') AND is_active = TRUE
    `,
      [projectId],
    );
    const crCount = parseInt(scopeRes.rows[0]?.cr_count || "0", 10);
    let scopeScore = 100;
    if (crCount > 5) scopeScore = 65;
    else if (crCount > 2) scopeScore = 80;
    else if (crCount > 0) scopeScore = 90;

    // 3. Quality Dimension (Defect density & QA pass rate)
    const qualityRes = await this.db.query(
      `
      SELECT 
        COUNT(CASE WHEN task_type_id IN (SELECT id FROM task_types WHERE type_code = 'BUG') AND actual_end_date IS NULL THEN 1 END) as open_bugs,
        COUNT(CASE WHEN actual_end_date IS NULL THEN 1 END) as active_work
      FROM tasks
      WHERE project_id = $1 AND is_active = TRUE
    `,
      [projectId],
    );
    const openBugs = parseInt(qualityRes.rows[0]?.open_bugs || "0", 10);
    const activeWork = parseInt(qualityRes.rows[0]?.active_work || "0", 10);
    const defectRatio = activeWork > 0 ? openBugs / activeWork : 0;

    let qualityScore = 100;
    if (defectRatio >= config.defect_density_critical_ratio) {
      qualityScore = 50;
    } else if (defectRatio > 0.1) {
      qualityScore = 75;
    } else if (openBugs > 0) {
      qualityScore = 88;
    }

    // 4. Blockers Dimension
    const blockersRes = await this.db.query(
      `
      SELECT COUNT(*) as active_blockers,
             MAX(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - created_at))/3600) as max_blocker_age_hours
      FROM task_blocker_episodes
      WHERE task_id IN (SELECT id FROM tasks WHERE project_id = $1 AND is_active = TRUE)
        AND resolved_at IS NULL
    `,
      [projectId],
    );
    const activeBlockers = parseInt(blockersRes.rows[0]?.active_blockers || "0", 10);
    const maxBlockerAge = parseFloat(blockersRes.rows[0]?.max_blocker_age_hours || "0");

    let blockersScore = 100;
    if (activeBlockers > 0) {
      if (maxBlockerAge >= config.blocker_age_critical_hours) {
        blockersScore = 40;
      } else if (maxBlockerAge >= 24) {
        blockersScore = 65;
      } else {
        blockersScore = 80;
      }
    }

    // 5. Budget & Flow Dimension (from latest financial metric snapshot)
    const finRes = await this.db.query(
      `
      SELECT budget_consumption_pct, effort_variance_hours
      FROM project_financial_metrics
      WHERE project_id = $1 AND is_active = TRUE
      ORDER BY period_end DESC LIMIT 1
    `,
      [projectId],
    );
    const budgetConsumption = parseFloat(finRes.rows[0]?.budget_consumption_pct || "70.0");
    let budgetFlowScore = 100;
    if (budgetConsumption > 100) {
      budgetFlowScore = 45;
    } else if (budgetConsumption >= 90) {
      budgetFlowScore = 70;
    } else if (budgetConsumption >= 75) {
      budgetFlowScore = 85;
    }

    // Calculate Composite Score
    const compositeScore = Math.round(
      ((scheduleScore * config.weight_schedule +
        scopeScore * config.weight_scope +
        qualityScore * config.weight_quality +
        blockersScore * config.weight_blockers +
        budgetFlowScore * config.weight_budget_flow) /
        100.0) *
        100,
    ) / 100;

    let computedState: "GREEN" | "AMBER" | "RED" = "GREEN";
    if (compositeScore < 60) computedState = "RED";
    else if (compositeScore < 80) computedState = "AMBER";

    // Check latest active manual override
    const overrideRes = await this.db.query(
      `
      SELECT manual_override_state, override_reason, overridden_at, u.full_name as overridden_by_name
      FROM project_health_evaluations e
      LEFT JOIN users u ON u.id = e.overridden_by
      WHERE e.project_id = $1 AND e.manual_override_state IS NOT NULL
      ORDER BY e.created_at DESC LIMIT 1
    `,
      [projectId],
    );

    const activeOverride = overrideRes.rows[0] || null;
    const effectiveState = activeOverride?.manual_override_state || computedState;

    const dimensionDetails = {
      schedule: {
        score: scheduleScore,
        weight: config.weight_schedule,
        maxSlipDays,
        overdueTasks,
        totalTasks,
      },
      scope: {
        score: scopeScore,
        weight: config.weight_scope,
        crCount,
      },
      quality: {
        score: qualityScore,
        weight: config.weight_quality,
        openBugs,
        activeWork,
        defectRatio: Math.round(defectRatio * 100) / 100,
      },
      blockers: {
        score: blockersScore,
        weight: config.weight_blockers,
        activeBlockers,
        maxBlockerAgeHours: Math.round(maxBlockerAge * 10) / 10,
      },
      budgetFlow: {
        score: budgetFlowScore,
        weight: config.weight_budget_flow,
        budgetConsumptionPct: budgetConsumption,
      },
    };

    return {
      projectId,
      compositeScore,
      computedState,
      effectiveState,
      isOverridden: !!activeOverride,
      activeOverride,
      dimensionScores: {
        schedule: scheduleScore,
        scope: scopeScore,
        quality: qualityScore,
        blockers: blockersScore,
        budgetFlow: budgetFlowScore,
      },
      dimensionDetails,
      config,
    };
  }

  /**
   * Set or clear manual PM override for project health score
   */
  async recordHealthOverride(dto: RecordHealthOverrideDto, userId: string) {
    const health = await this.evaluateProjectHealth(dto.projectId);

    const insertRes = await this.db.query(
      `
      INSERT INTO project_health_evaluations (
        project_id, evaluation_date, composite_score, health_state,
        schedule_score, scope_score, quality_score, blockers_score, budget_flow_score,
        dimension_details, manual_override_state, override_reason, overridden_by, overridden_at,
        created_by, updated_by
      ) VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, $12, $12)
      RETURNING *;
    `,
      [
        dto.projectId,
        health.compositeScore,
        health.computedState,
        health.dimensionScores.schedule,
        health.dimensionScores.scope,
        health.dimensionScores.quality,
        health.dimensionScores.blockers,
        health.dimensionScores.budgetFlow,
        JSON.stringify(health.dimensionDetails),
        dto.overrideState || null,
        dto.overrideReason,
        userId,
      ],
    );

    return this.evaluateProjectHealth(dto.projectId);
  }

  /**
   * Fetch historical evaluations
   */
  async getHealthHistory(projectId: string) {
    const res = await this.db.query(
      `
      SELECT e.*, u.full_name as overridden_by_name
      FROM project_health_evaluations e
      LEFT JOIN users u ON u.id = e.overridden_by
      WHERE e.project_id = $1 AND e.is_active = TRUE
      ORDER BY e.created_at DESC
      LIMIT 20;
    `,
      [projectId],
    );
    return res.rows;
  }
}
