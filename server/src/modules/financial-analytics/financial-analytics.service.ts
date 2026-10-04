import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateFinancialBaselineDto } from './dto/create-financial-baseline.dto';
import { CreateFinancialRateDto } from './dto/create-financial-rate.dto';
import { RecordFinancialMetricDto } from './dto/record-financial-metric.dto';
import { CreateCurrencyExchangeRateDto } from './dto/currency-exchange.dto';

@Injectable()
export class FinancialAnalyticsService {
  private readonly logger = new Logger(FinancialAnalyticsService.name);

  constructor(private readonly db: DatabaseService) {}

  // ========================================================
  // 1. Comprehensive Project Financial Overview & Reconciliation
  // ========================================================

  async getProjectFinancialOverview(
    projectId: string,
    userPermissions: string[] = [],
  ) {
    const canViewCostRates = userPermissions.includes('FINANCIALS:COST_RATES_VIEW') ||
      userPermissions.includes('SUPER_ADMIN');

    // 1. Fetch project master details
    const prjRes = await this.db.query(
      `SELECT 
         p.id, 
         p.project_code, 
         p.project_name, 
         p.billing_type, 
         p.contract_amount, 
         p.hourly_rate, 
         p.budgeted_hours, 
         p.currency, 
         p.project_status,
         p.planned_start_date,
         p.planned_end_date,
         c.company_name AS client_name
       FROM projects p
       LEFT JOIN clients c ON c.id = p.client_id
       WHERE p.id = $1 AND p.is_active = TRUE`,
      [projectId],
    );

    if (prjRes.rows.length === 0) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    const project = prjRes.rows[0];

    // 2. Fetch active baseline if exists
    const baseRes = await this.db.query(
      `SELECT * FROM project_financial_baselines
       WHERE project_id = $1 AND is_active = TRUE
       ORDER BY baseline_date DESC, created_at DESC
       LIMIT 1`,
      [projectId],
    );

    const baseline = baseRes.rows.length > 0 ? baseRes.rows[0] : null;

    const budgetedHours = baseline
      ? Number(baseline.budgeted_hours)
      : Number(project.budgeted_hours) || 0;

    const budgetedRevenue = baseline
      ? Number(baseline.budgeted_revenue)
      : Number(project.contract_amount) || 0;

    const budgetedCost = baseline && canViewCostRates
      ? Number(baseline.budgeted_cost)
      : null;

    const warningThresholdPct = baseline
      ? Number(baseline.warning_threshold_pct)
      : 75.0;

    const criticalThresholdPct = baseline
      ? Number(baseline.critical_threshold_pct)
      : 90.0;

    // 3. Aggregate Task Effort & Estimates
    const taskAggRes = await this.db.query(
      `SELECT 
         COUNT(t.id)::int AS total_tasks,
         COUNT(CASE WHEN ts.is_terminal = TRUE THEN 1 END)::int AS completed_tasks,
         COALESCE(SUM(COALESCE(t.baseline_estimated_hours, t.estimated_hours)), 0) AS total_baseline_estimated_hours,
         COALESCE(SUM(t.estimated_hours), 0) AS total_current_estimated_hours,
         COALESCE(SUM(COALESCE(t.remaining_hours, GREATEST(0, t.estimated_hours))), 0) AS total_remaining_hours,
         COALESCE(SUM(t.story_points), 0) AS total_story_points
       FROM tasks t
       JOIN task_statuses ts ON ts.id = t.status_id
       WHERE t.project_id = $1`,
      [projectId],
    );

    const taskAgg = taskAggRes.rows[0];
    const totalBaselineEstimatedHours = Number(taskAgg.total_baseline_estimated_hours);
    const totalCurrentEstimatedHours = Number(taskAgg.total_current_estimated_hours);
    const totalRemainingHours = Number(taskAgg.total_remaining_hours);

    // 4. Reconcile Time Logs (Approved billable vs unapproved draft)
    const timeLogAggRes = await this.db.query(
      `SELECT 
         COALESCE(SUM(ttl.hours_spent), 0) AS total_logged_hours,
         COALESCE(SUM(CASE WHEN ttl.approval_status = 'APPROVED' AND ttl.is_billable = TRUE THEN ttl.hours_spent ELSE 0 END), 0) AS approved_billable_hours,
         COALESCE(SUM(CASE WHEN ttl.approval_status = 'APPROVED' AND ttl.is_billable = FALSE THEN ttl.hours_spent ELSE 0 END), 0) AS approved_non_billable_hours,
         COALESCE(SUM(CASE WHEN ttl.approval_status != 'APPROVED' THEN ttl.hours_spent ELSE 0 END), 0) AS unapproved_draft_hours,
         COUNT(ttl.id)::int AS total_worklog_entries
       FROM task_time_logs ttl
       JOIN tasks t ON t.id = ttl.task_id
       WHERE t.project_id = $1`,
      [projectId],
    );

    const timeAgg = timeLogAggRes.rows[0];
    const actualLoggedHours = Number(timeAgg.total_logged_hours);
    const approvedBillableHours = Number(timeAgg.approved_billable_hours);
    const approvedNonBillableHours = Number(timeAgg.approved_non_billable_hours);
    const unapprovedDraftHours = Number(timeAgg.unapproved_draft_hours);

    // 5. Effort Variance & Budget Consumption Metrics
    const effortVarianceHours = totalBaselineEstimatedHours > 0
      ? actualLoggedHours - totalBaselineEstimatedHours
      : actualLoggedHours - budgetedHours;

    const budgetConsumptionPct = budgetedHours > 0
      ? Number(((actualLoggedHours / budgetedHours) * 100).toFixed(2))
      : null;

    // Estimate At Completion (EAC): Actual logged hours + independently maintained remaining estimate
    const eacHours = actualLoggedHours + totalRemainingHours;
    const eacVarianceHours = budgetedHours > 0 ? eacHours - budgetedHours : null;

    // Threshold Alert Status
    let thresholdStatus: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'OVERRUN' = 'NORMAL';
    if (budgetConsumptionPct != null) {
      if (budgetConsumptionPct >= 100) {
        thresholdStatus = 'OVERRUN';
      } else if (budgetConsumptionPct >= criticalThresholdPct) {
        thresholdStatus = 'CRITICAL';
      } else if (budgetConsumptionPct >= warningThresholdPct) {
        thresholdStatus = 'WARNING';
      }
    }

    // 6. Direct Labor Costs & Billing Rates (Commercials)
    let totalDirectCost: number | null = null;
    let directContribution: number | null = null;
    let contributionMarginPct: number | null = null;

    // Calculate Recognized Revenue
    let totalRecognizedRevenue = 0;
    if (project.billing_type === 'TIME_AND_MATERIAL') {
      const defaultHourlyRate = Number(project.hourly_rate) || 0;
      totalRecognizedRevenue = approvedBillableHours * defaultHourlyRate;
    } else {
      totalRecognizedRevenue = budgetedRevenue;
    }

    if (canViewCostRates) {
      // Query effective cost rates for worklogs
      const costCalcRes = await this.db.query(
        `SELECT 
           COALESCE(
             SUM(
               ttl.hours_spent * COALESCE(
                 pfr.hourly_cost_rate,
                 pfr_role.hourly_cost_rate,
                 pfr_def.hourly_cost_rate,
                 350.00 -- Standard company floor fallback
               )
             ), 0
           ) AS total_direct_labor_cost
         FROM task_time_logs ttl
         JOIN tasks t ON t.id = ttl.task_id
         JOIN users u ON u.id = ttl.user_id
         LEFT JOIN project_financial_rates pfr ON pfr.project_id = t.project_id 
           AND pfr.user_id = u.id AND pfr.is_active = TRUE
           AND ttl.log_date >= pfr.effective_start_date 
           AND (pfr.effective_end_date IS NULL OR ttl.log_date <= pfr.effective_end_date)
         LEFT JOIN project_financial_rates pfr_role ON pfr_role.project_id = t.project_id 
           AND pfr_role.role_id = u.designation_id AND pfr_role.is_active = TRUE
           AND ttl.log_date >= pfr_role.effective_start_date 
           AND (pfr_role.effective_end_date IS NULL OR ttl.log_date <= pfr_role.effective_end_date)
         LEFT JOIN project_financial_rates pfr_def ON pfr_def.project_id IS NULL 
           AND pfr_def.role_id = u.designation_id AND pfr_def.is_active = TRUE
           AND ttl.log_date >= pfr_def.effective_start_date 
           AND (pfr_def.effective_end_date IS NULL OR ttl.log_date <= pfr_def.effective_end_date)
         WHERE t.project_id = $1`,
        [projectId],
      );

      totalDirectCost = Number(Number(costCalcRes.rows[0].total_direct_labor_cost).toFixed(2));
      directContribution = Number((totalRecognizedRevenue - totalDirectCost).toFixed(2));
      contributionMarginPct = totalRecognizedRevenue > 0
        ? Number(((directContribution / totalRecognizedRevenue) * 100).toFixed(2))
        : null;
    }

    // 7. Cumulative Weekly Burn Curve
    const burnCurveRes = await this.db.query(
      `SELECT 
         DATE_TRUNC('week', ttl.log_date)::date AS week_start,
         SUM(ttl.hours_spent) AS weekly_hours,
         SUM(CASE WHEN ttl.approval_status = 'APPROVED' THEN ttl.hours_spent ELSE 0 END) AS approved_hours
       FROM task_time_logs ttl
       JOIN tasks t ON t.id = ttl.task_id
       WHERE t.project_id = $1
       GROUP BY DATE_TRUNC('week', ttl.log_date)
       ORDER BY week_start ASC`,
      [projectId],
    );

    let cumulativeHours = 0;
    const burnCurvePoints = burnCurveRes.rows.map((row: any) => {
      const hours = Number(row.weekly_hours);
      cumulativeHours += hours;
      return {
        date: row.week_start,
        weeklyHours: hours,
        cumulativeActualHours: Number(cumulativeHours.toFixed(2)),
        approvedHours: Number(Number(row.approved_hours).toFixed(2)),
      };
    });

    return {
      project: {
        id: project.id,
        projectCode: project.project_code,
        projectName: project.project_name,
        clientName: project.client_name,
        billingType: project.billing_type,
        currency: project.currency,
        status: project.project_status,
      },
      baseline: baseline
        ? {
            id: baseline.id,
            baselineCode: baseline.baseline_code,
            name: baseline.name,
            baselineDate: baseline.baseline_date,
            budgetedHours: Number(baseline.budgeted_hours),
            budgetedRevenue: Number(baseline.budgeted_revenue),
            budgetedCost: canViewCostRates ? Number(baseline.budgeted_cost) : null,
            warningThresholdPct,
            criticalThresholdPct,
            isFrozen: baseline.is_frozen,
          }
        : null,
      effortMetrics: {
        budgetedHours,
        totalBaselineEstimatedHours,
        totalCurrentEstimatedHours,
        actualLoggedHours,
        approvedBillableHours,
        approvedNonBillableHours,
        unapprovedDraftHours,
        remainingHours: totalRemainingHours,
        eacHours,
        effortVarianceHours: Number(effortVarianceHours.toFixed(2)),
        budgetConsumptionPct,
        eacVarianceHours: eacVarianceHours != null ? Number(eacVarianceHours.toFixed(2)) : null,
        thresholdStatus,
        totalTasksCount: taskAgg.total_tasks,
        completedTasksCount: taskAgg.completed_tasks,
        worklogEntriesCount: timeAgg.total_worklog_entries,
      },
      financialMetrics: {
        totalRecognizedRevenue: Number(totalRecognizedRevenue.toFixed(2)),
        totalDirectCost,
        directContribution,
        contributionMarginPct,
        currency: project.currency,
        isCostRedacted: !canViewCostRates,
      },
      burnCurve: burnCurvePoints,
      disclosure:
        'Financial analysis complies with KS-PMT measurement contracts. Unapproved draft effort is tracked separately from approved billable time to preserve accounting auditability. Internal labor cost rates and gross margins are strictly restricted by RBAC.',
    };
  }

  // ========================================================
  // 2. Financial Baselines CRUD
  // ========================================================

  async getBaselines(projectId: string) {
    const res = await this.db.query(
      `SELECT * FROM project_financial_baselines
       WHERE project_id = $1 AND is_active = TRUE
       ORDER BY baseline_date DESC, created_at DESC`,
      [projectId],
    );
    return res.rows;
  }

  async createBaseline(dto: CreateFinancialBaselineDto, userId: string) {
    const res = await this.db.query(
      `INSERT INTO project_financial_baselines (
         project_id, baseline_code, name, description, baseline_date,
         budgeted_hours, budgeted_cost, budgeted_revenue, currency,
         scope_tasks_count, scope_story_points, warning_threshold_pct, critical_threshold_pct,
         is_frozen, is_active, created_by
       ) VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_DATE), $6, $7, $8, COALESCE($9, 'INR'), $10, $11, COALESCE($12, 75.0), COALESCE($13, 90.0), COALESCE($14, TRUE), TRUE, $15)
       RETURNING *`,
      [
        dto.project_id,
        dto.baseline_code,
        dto.name,
        dto.description || null,
        dto.baseline_date || null,
        dto.budgeted_hours || 0,
        dto.budgeted_cost || 0,
        dto.budgeted_revenue || 0,
        dto.currency || 'INR',
        dto.scope_tasks_count || 0,
        dto.scope_story_points || 0,
        dto.warning_threshold_pct || 75.0,
        dto.critical_threshold_pct || 90.0,
        dto.is_frozen ?? true,
        userId,
      ],
    );
    return res.rows[0];
  }

  async toggleFreezeBaseline(baselineId: string, userId: string) {
    const res = await this.db.query(
      `UPDATE project_financial_baselines
       SET is_frozen = NOT is_frozen, updated_by = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND is_active = TRUE
       RETURNING *`,
      [userId, baselineId],
    );
    if (res.rows.length === 0) {
      throw new NotFoundException(`Baseline with ID ${baselineId} not found`);
    }
    return res.rows[0];
  }

  // ========================================================
  // 3. Effective-Dated Rate Cards CRUD
  // ========================================================

  async getRateCards(projectId?: string, userPermissions: string[] = []) {
    const canViewCostRates = userPermissions.includes('FINANCIALS:COST_RATES_VIEW') ||
      userPermissions.includes('SUPER_ADMIN');

    let sql = `
      SELECT 
        pfr.id,
        pfr.rate_code,
        pfr.project_id,
        p.project_name,
        pfr.role_id,
        d.desig_name,
        pfr.user_id,
        u.full_name AS user_name,
        pfr.currency,
        pfr.hourly_billing_rate,
        ${canViewCostRates ? 'pfr.hourly_cost_rate' : 'NULL AS hourly_cost_rate'},
        pfr.effective_start_date,
        pfr.effective_end_date,
        pfr.description,
        pfr.is_active,
        pfr.created_at
      FROM project_financial_rates pfr
      LEFT JOIN projects p ON p.id = pfr.project_id
      LEFT JOIN designations d ON d.id = pfr.role_id
      LEFT JOIN users u ON u.id = pfr.user_id
      WHERE pfr.is_active = TRUE
    `;
    const params: any[] = [];
    if (projectId) {
      params.push(projectId);
      sql += ` AND (pfr.project_id = $${params.length} OR pfr.project_id IS NULL)`;
    }
    sql += ` ORDER BY pfr.effective_start_date DESC`;

    const res = await this.db.query(sql, params);
    return res.rows;
  }

  async createRateCard(dto: CreateFinancialRateDto, userId: string) {
    const res = await this.db.query(
      `INSERT INTO project_financial_rates (
         rate_code, project_id, role_id, user_id, currency,
         hourly_billing_rate, hourly_cost_rate, effective_start_date, effective_end_date,
         description, is_active, created_by
       ) VALUES ($1, $2, $3, $4, COALESCE($5, 'INR'), $6, $7, $8, $9, $10, TRUE, $11)
       RETURNING *`,
      [
        dto.rate_code,
        dto.project_id || null,
        dto.role_id || null,
        dto.user_id || null,
        dto.currency || 'INR',
        dto.hourly_billing_rate,
        dto.hourly_cost_rate,
        dto.effective_start_date,
        dto.effective_end_date || null,
        dto.description || null,
        userId,
      ],
    );
    return res.rows[0];
  }

  async deleteRateCard(id: string) {
    const res = await this.db.query(
      `UPDATE project_financial_rates
       SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING id`,
      [id],
    );
    if (res.rows.length === 0) {
      throw new NotFoundException(`Rate card with ID ${id} not found`);
    }
    return { success: true, deletedId: id };
  }

  // ========================================================
  // 4. Periodic Metric Snapshots
  // ========================================================

  async getPeriodicMetrics(projectId: string) {
    const res = await this.db.query(
      `SELECT * FROM project_financial_metrics
       WHERE project_id = $1 AND is_active = TRUE
       ORDER BY period_start DESC`,
      [projectId],
    );
    return res.rows;
  }

  async recordMetricSnapshot(dto: RecordFinancialMetricDto, userId: string) {
    const res = await this.db.query(
      `INSERT INTO project_financial_metrics (
         project_id, baseline_id, period_label, period_start, period_end,
         budgeted_hours, actual_logged_hours, approved_billable_hours, unapproved_draft_hours,
         remaining_hours, eac_hours, effort_variance_hours, budget_consumption_pct,
         total_recognized_revenue, total_direct_cost, direct_contribution, contribution_margin_pct,
         burn_rate_hours_per_week, projected_completion_date, currency, notes, is_active, created_by
       ) VALUES (
         $1, $2, $3, $4, $5,
         COALESCE($6, 0), COALESCE($7, 0), COALESCE($8, 0), COALESCE($9, 0),
         COALESCE($10, 0), COALESCE($11, 0), COALESCE($12, 0), COALESCE($13, 0),
         COALESCE($14, 0), COALESCE($15, 0), COALESCE($16, 0), $17,
         COALESCE($18, 0), $19, COALESCE($20, 'INR'), $21, TRUE, $22
       ) RETURNING *`,
      [
        dto.project_id,
        dto.baseline_id || null,
        dto.period_label,
        dto.period_start,
        dto.period_end,
        dto.budgeted_hours || 0,
        dto.actual_logged_hours || 0,
        dto.approved_billable_hours || 0,
        dto.unapproved_draft_hours || 0,
        dto.remaining_hours || 0,
        dto.eac_hours || 0,
        dto.effort_variance_hours || 0,
        dto.budget_consumption_pct || 0,
        dto.total_recognized_revenue || 0,
        dto.total_direct_cost || 0,
        dto.direct_contribution || 0,
        dto.contribution_margin_pct ?? null,
        dto.burn_rate_hours_per_week || 0,
        dto.projected_completion_date || null,
        dto.currency || 'INR',
        dto.notes || null,
        userId,
      ],
    );
    return res.rows[0];
  }

  // ========================================================
  // 5. Currency Exchange Rates
  // ========================================================

  async getExchangeRates() {
    const res = await this.db.query(
      `SELECT * FROM currency_exchange_rates
       WHERE is_active = TRUE
       ORDER BY effective_date DESC, from_currency ASC`,
    );
    return res.rows;
  }

  async createExchangeRate(dto: CreateCurrencyExchangeRateDto, userId: string) {
    const res = await this.db.query(
      `INSERT INTO currency_exchange_rates (
         from_currency, to_currency, exchange_rate, effective_date, source, is_active, created_by
       ) VALUES ($1, $2, $3, COALESCE($4, CURRENT_DATE), COALESCE($5, 'MANUAL_ENTRY'), TRUE, $6)
       ON CONFLICT (from_currency, to_currency, effective_date)
       DO UPDATE SET exchange_rate = EXCLUDED.exchange_rate, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        dto.from_currency.toUpperCase(),
        dto.to_currency.toUpperCase(),
        dto.exchange_rate,
        dto.effective_date || null,
        dto.source || 'MANUAL_ENTRY',
        userId,
      ],
    );
    return res.rows[0];
  }
}
