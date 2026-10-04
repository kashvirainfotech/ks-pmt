import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateContractDto, ContractType, RolloverRule } from './dto/create-contract.dto';
import { QueryContractsDto } from './dto/query-contracts.dto';
import { CreateContractPeriodDto, PeriodStatus } from './dto/create-contract-period.dto';
import { ConsumeWorklogDto } from './dto/consume-worklog.dto';
import { CreateOverageRequestDto } from './dto/create-overage-request.dto';
import { DecideOverageRequestDto, OverageDecision } from './dto/decide-overage-request.dto';

@Injectable()
export class CommercialService {
  private readonly logger = new Logger(CommercialService.name);

  constructor(private readonly db: DatabaseService) {}

  // ========================================================
  // 1. Contracts CRUD
  // ========================================================

  async createContract(dto: CreateContractDto, userId: string) {
    let contractNumber = dto.contractNumber;
    if (!contractNumber) {
      const prefix = dto.contractType === ContractType.AMC ? 'AMC' : 'RET';
      const year = new Date().getFullYear();
      const countRes = await this.db.query(
        `SELECT COUNT(*)::int as count FROM commercial_contracts WHERE contract_number LIKE $1`,
        [`${prefix}-${year}-%`],
      );
      const seq = (countRes.rows[0]?.count || 0) + 1;
      contractNumber = `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
    }

    const res = await this.db.query(
      `INSERT INTO commercial_contracts (
        contract_number, client_id, project_id, product_id, title,
        contract_type, periodicity, included_hours_per_period, hourly_rate, overage_hourly_rate,
        currency, rollover_rule, max_rollover_hours, rollover_expiry_periods,
        start_date, end_date, status, accountable_pm_user_id, terms_and_conditions, notes, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, TRUE, $21)
      RETURNING *`,
      [
        contractNumber,
        dto.clientId,
        dto.projectId || null,
        dto.productId || null,
        dto.title,
        dto.contractType,
        dto.periodicity,
        dto.includedHoursPerPeriod,
        dto.hourlyRate || 0.0,
        dto.overageHourlyRate || 0.0,
        dto.currency || 'INR',
        dto.rolloverRule || RolloverRule.NO_ROLLOVER,
        dto.maxRolloverHours || 0.0,
        dto.rolloverExpiryPeriods || 1,
        dto.startDate,
        dto.endDate,
        dto.status || 'ACTIVE',
        dto.accountablePmUserId || null,
        dto.termsAndConditions || null,
        dto.notes || null,
        userId,
      ],
    );

    const contract = res.rows[0];

    // Optionally auto-create Period 1
    if (dto.autoCreateFirstPeriod !== false) {
      try {
        const periodStart = new Date(dto.startDate);
        const periodEnd = new Date(periodStart);
        if (dto.periodicity === 'MONTHLY') {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
          periodEnd.setDate(0); // Last day of that month
        } else if (dto.periodicity === 'QUARTERLY') {
          periodEnd.setMonth(periodEnd.getMonth() + 3);
          periodEnd.setDate(0);
        } else if (dto.periodicity === 'ANNUALLY') {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
          periodEnd.setDate(0);
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        const periodCode = `PER-${contract.contract_number}-01`;
        await this.db.query(
          `INSERT INTO contract_periods (
            contract_id, period_code, period_sequence, start_date, end_date,
            included_hours, rolled_over_hours_in, total_allowance_hours,
            approved_consumed_hours, remaining_allowance_hours, overage_hours, rolled_over_hours_out,
            hourly_rate, overage_hourly_rate, currency, status, is_active, created_by
          ) VALUES ($1, $2, 1, $3, $4, $5, 0.00, $5, 0.00, $5, 0.00, 0.00, $6, $7, $8, 'OPEN', TRUE, $9)
          ON CONFLICT (period_code) DO NOTHING`,
          [
            contract.id,
            periodCode,
            periodStart.toISOString().split('T')[0],
            periodEnd.toISOString().split('T')[0],
            contract.included_hours_per_period,
            contract.hourly_rate,
            contract.overage_hourly_rate,
            contract.currency,
            userId,
          ],
        );
      } catch (err) {
        this.logger.warn(`Auto-period generation skipped: ${err.message}`);
      }
    }

    return this.findContractById(contract.id, { id: userId });
  }

  async findAllContracts(query: QueryContractsDto, user?: any) {
    const params: any[] = [];
    const conditions: string[] = ['c.is_active = TRUE'];

    // Tenant privacy isolation: client users can only see their own client contracts
    if (user?.role === 'ROLE_CLIENT_USER' || user?.client_id) {
      params.push(user.client_id);
      conditions.push(`c.client_id = $${params.length}`);
    } else if (query.clientId) {
      params.push(query.clientId);
      conditions.push(`c.client_id = $${params.length}`);
    }

    if (query.projectId) {
      params.push(query.projectId);
      conditions.push(`c.project_id = $${params.length}`);
    }

    if (query.productId) {
      params.push(query.productId);
      conditions.push(`c.product_id = $${params.length}`);
    }

    if (query.contractType) {
      params.push(query.contractType);
      conditions.push(`c.contract_type = $${params.length}`);
    }

    if (query.status) {
      params.push(query.status);
      conditions.push(`c.status = $${params.length}`);
    }

    if (query.search) {
      params.push(`%${query.search}%`);
      conditions.push(`(c.contract_number ILIKE $${params.length} OR c.title ILIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        c.*,
        cl.company_name AS client_name,
        cl.client_code,
        p.project_name,
        p.project_code,
        pr.product_name,
        pr.product_code,
        u.first_name || ' ' || u.last_name AS accountable_pm_name,
        (
          SELECT json_build_object(
            'id', cp.id,
            'periodCode', cp.period_code,
            'sequence', cp.period_sequence,
            'startDate', cp.start_date,
            'endDate', cp.end_date,
            'totalAllowanceHours', cp.total_allowance_hours,
            'approvedConsumedHours', cp.approved_consumed_hours,
            'remainingAllowanceHours', cp.remaining_allowance_hours,
            'overageHours', cp.overage_hours,
            'status', cp.status
          )
          FROM contract_periods cp
          WHERE cp.contract_id = c.id AND cp.status = 'OPEN' AND cp.is_active = TRUE
          ORDER BY cp.period_sequence DESC
          LIMIT 1
        ) AS current_period,
        (
          SELECT COUNT(*)::int
          FROM contract_periods cp
          WHERE cp.contract_id = c.id AND cp.is_active = TRUE
        ) AS total_periods_count
      FROM commercial_contracts c
      JOIN clients cl ON c.client_id = cl.id
      LEFT JOIN projects p ON c.project_id = p.id
      LEFT JOIN products pr ON c.product_id = pr.id
      LEFT JOIN users u ON c.accountable_pm_user_id = u.id
      ${whereClause}
      ORDER BY c.created_at DESC
    `;

    const res = await this.db.query(sql, params);
    return res.rows;
  }

  async findContractById(id: string, user?: any) {
    const res = await this.db.query(
      `SELECT 
        c.*,
        cl.company_name AS client_name,
        cl.client_code,
        p.project_name,
        p.project_code,
        pr.product_name,
        pr.product_code,
        u.first_name || ' ' || u.last_name AS accountable_pm_name
      FROM commercial_contracts c
      JOIN clients cl ON c.client_id = cl.id
      LEFT JOIN projects p ON c.project_id = p.id
      LEFT JOIN products pr ON c.product_id = pr.id
      LEFT JOIN users u ON c.accountable_pm_user_id = u.id
      WHERE c.id = $1 AND c.is_active = TRUE`,
      [id],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException(`Commercial contract with ID ${id} not found`);
    }

    const contract = res.rows[0];

    // Privacy boundary
    if ((user?.role === 'ROLE_CLIENT_USER' || user?.client_id) && contract.client_id !== user.client_id) {
      throw new ForbiddenException('Access denied to commercial contract');
    }

    // Fetch periods
    const periodsRes = await this.db.query(
      `SELECT cp.*,
        u.first_name || ' ' || u.last_name AS closed_by_user_name,
        (
          SELECT COUNT(*)::int FROM contract_worklog_consumptions cwc
          WHERE cwc.contract_period_id = cp.id AND cwc.is_active = TRUE
        ) AS consumed_worklogs_count,
        (
          SELECT COUNT(*)::int FROM contract_overage_requests cor
          WHERE cor.contract_period_id = cp.id AND cor.is_active = TRUE
        ) AS overage_requests_count
      FROM contract_periods cp
      LEFT JOIN users u ON cp.closed_by = u.id
      WHERE cp.contract_id = $1 AND cp.is_active = TRUE
      ORDER BY cp.period_sequence ASC`,
      [id],
    );

    contract.periods = periodsRes.rows;
    return contract;
  }

  async updateContract(id: string, dto: Partial<CreateContractDto>, userId: string) {
    const existing = await this.db.query(`SELECT * FROM commercial_contracts WHERE id = $1 AND is_active = TRUE`, [id]);
    if (existing.rows.length === 0) {
      throw new NotFoundException(`Contract with ID ${id} not found`);
    }

    const current = existing.rows[0];
    const res = await this.db.query(
      `UPDATE commercial_contracts SET
        title = COALESCE($1, title),
        included_hours_per_period = COALESCE($2, included_hours_per_period),
        hourly_rate = COALESCE($3, hourly_rate),
        overage_hourly_rate = COALESCE($4, overage_hourly_rate),
        currency = COALESCE($5, currency),
        rollover_rule = COALESCE($6, rollover_rule),
        max_rollover_hours = COALESCE($7, max_rollover_hours),
        rollover_expiry_periods = COALESCE($8, rollover_expiry_periods),
        status = COALESCE($9, status),
        accountable_pm_user_id = COALESCE($10, accountable_pm_user_id),
        terms_and_conditions = COALESCE($11, terms_and_conditions),
        notes = COALESCE($12, notes),
        updated_by = $13,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $14
      RETURNING *`,
      [
        dto.title || null,
        dto.includedHoursPerPeriod ?? null,
        dto.hourlyRate ?? null,
        dto.overageHourlyRate ?? null,
        dto.currency || null,
        dto.rolloverRule || null,
        dto.maxRolloverHours ?? null,
        dto.rolloverExpiryPeriods ?? null,
        dto.status || null,
        dto.accountablePmUserId || null,
        dto.termsAndConditions || null,
        dto.notes || null,
        userId,
        id,
      ],
    );

    return res.rows[0];
  }

  // ========================================================
  // 2. Periods & Rollover Engine
  // ========================================================

  async createPeriod(contractId: string, dto: CreateContractPeriodDto, userId: string) {
    const contractRes = await this.db.query(
      `SELECT * FROM commercial_contracts WHERE id = $1 AND is_active = TRUE`,
      [contractId],
    );
    if (contractRes.rows.length === 0) {
      throw new NotFoundException(`Commercial contract with ID ${contractId} not found`);
    }
    const contract = contractRes.rows[0];

    // Determine sequence
    let seq = dto.periodSequence;
    if (!seq) {
      const maxSeqRes = await this.db.query(
        `SELECT COALESCE(MAX(period_sequence), 0)::int + 1 AS next_seq FROM contract_periods WHERE contract_id = $1`,
        [contractId],
      );
      seq = maxSeqRes.rows[0]?.next_seq || 1;
    }

    const periodCode = dto.periodCode || `PER-${contract.contract_number}-${String(seq).padStart(2, '0')}`;
    const includedHours = dto.includedHours ?? Number(contract.included_hours_per_period);
    const rolledOverIn = dto.rolledOverHoursIn ?? 0.0;
    const totalAllowance = includedHours + rolledOverIn;

    const res = await this.db.query(
      `INSERT INTO contract_periods (
        contract_id, period_code, period_sequence, start_date, end_date,
        included_hours, rolled_over_hours_in, total_allowance_hours,
        approved_consumed_hours, remaining_allowance_hours, overage_hours, rolled_over_hours_out,
        hourly_rate, overage_hourly_rate, currency, status, reconciled_notes, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0.00, $8, 0.00, 0.00, $9, $10, $11, $12, $13, TRUE, $14)
      RETURNING *`,
      [
        contractId,
        periodCode,
        seq,
        dto.startDate,
        dto.endDate,
        includedHours,
        rolledOverIn,
        totalAllowance,
        dto.hourlyRate ?? Number(contract.hourly_rate),
        dto.overageHourlyRate ?? Number(contract.overage_hourly_rate),
        dto.currency || contract.currency,
        dto.status || PeriodStatus.OPEN,
        dto.reconciledNotes || null,
        userId,
      ],
    );

    return res.rows[0];
  }

  async findPeriodById(id: string, user?: any) {
    const res = await this.db.query(
      `SELECT cp.*,
        c.contract_number,
        c.title AS contract_title,
        c.contract_type,
        c.rollover_rule,
        c.max_rollover_hours,
        c.client_id,
        c.project_id,
        c.product_id,
        cl.company_name AS client_name,
        p.project_name,
        pr.product_name,
        u.first_name || ' ' || u.last_name AS closed_by_user_name
      FROM contract_periods cp
      JOIN commercial_contracts c ON cp.contract_id = c.id
      JOIN clients cl ON c.client_id = cl.id
      LEFT JOIN projects p ON c.project_id = p.id
      LEFT JOIN products pr ON c.product_id = pr.id
      LEFT JOIN users u ON cp.closed_by = u.id
      WHERE cp.id = $1 AND cp.is_active = TRUE`,
      [id],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException(`Contract period with ID ${id} not found`);
    }

    const period = res.rows[0];

    // Privacy boundary
    if ((user?.role === 'ROLE_CLIENT_USER' || user?.client_id) && period.client_id !== user.client_id) {
      throw new ForbiddenException('Access denied to contract period');
    }

    // Fetch consumptions
    const consumptionsRes = await this.db.query(
      `SELECT 
        cwc.*,
        ttl.log_date,
        ttl.hours_spent AS worklog_hours,
        ttl.description AS worklog_description,
        ttl.approval_status,
        t.task_code,
        t.title AS task_title,
        tt.type_name AS task_type_name,
        u.first_name || ' ' || u.last_name AS logged_by_user_name
      FROM contract_worklog_consumptions cwc
      JOIN task_time_logs ttl ON cwc.time_log_id = ttl.id
      JOIN tasks t ON ttl.task_id = t.id
      LEFT JOIN task_types tt ON t.task_type_id = tt.id
      LEFT JOIN users u ON ttl.user_id = u.id
      WHERE cwc.contract_period_id = $1 AND cwc.is_active = TRUE
      ORDER BY ttl.log_date ASC, cwc.consumed_at ASC`,
      [id],
    );

    // Fetch overage requests
    const overagesRes = await this.db.query(
      `SELECT 
        cor.*,
        cr.cr_number,
        cr.title AS cr_title,
        cc.first_name || ' ' || cc.last_name AS approved_by_contact_name
      FROM contract_overage_requests cor
      LEFT JOIN change_requests cr ON cor.change_request_id = cr.id
      LEFT JOIN client_contacts cc ON cor.approved_by_contact_id = cc.id
      WHERE cor.contract_period_id = $1 AND cor.is_active = TRUE
      ORDER BY cor.created_at DESC`,
      [id],
    );

    period.consumptions = consumptionsRes.rows;
    period.overage_requests = overagesRes.rows;
    return period;
  }

  // ========================================================
  // 3. Worklog Consumption & Reconcile Engine
  // Acceptance guarantee:
  // "rejecting a worklog does not consume allowance;
  //  approval retries do not consume it twice"
  // ========================================================

  async reconcilePeriod(periodId: string, userId: string) {
    const periodRes = await this.db.query(
      `SELECT cp.*, c.project_id, c.product_id, c.rollover_rule, c.max_rollover_hours
      FROM contract_periods cp
      JOIN commercial_contracts c ON cp.contract_id = c.id
      WHERE cp.id = $1 AND cp.is_active = TRUE`,
      [periodId],
    );

    if (periodRes.rows.length === 0) {
      throw new NotFoundException(`Period ${periodId} not found`);
    }

    const period = periodRes.rows[0];

    // 1. Remove consumptions for any worklogs that are NO LONGER approved or are non-billable
    // Guarantees: "rejecting a worklog does not consume allowance"
    await this.db.query(
      `DELETE FROM contract_worklog_consumptions
      WHERE contract_period_id = $1
      AND time_log_id IN (
        SELECT ttl.id FROM task_time_logs ttl
        WHERE ttl.approval_status != 'APPROVED' OR ttl.is_billable = FALSE
      )`,
      [periodId],
    );

    // 2. Scan eligible approved billable worklogs within the period dates for the contract's scope
    const scopeCond = period.project_id
      ? `t.project_id = '${period.project_id}'`
      : period.product_id
      ? `t.product_id = '${period.product_id}'`
      : '1=1';

    const eligibleLogsRes = await this.db.query(
      `SELECT ttl.id, ttl.hours_spent
      FROM task_time_logs ttl
      JOIN tasks t ON ttl.task_id = t.id
      WHERE ${scopeCond}
        AND ttl.log_date >= $1 AND ttl.log_date <= $2
        AND ttl.approval_status = 'APPROVED'
        AND ttl.is_billable = TRUE
      ORDER BY ttl.log_date ASC, ttl.created_at ASC`,
      [period.start_date, period.end_date],
    );

    // 3. Insert missing consumptions. UNIQUE constraint ensures "approval retries do not consume twice"
    let newlyConsumedCount = 0;
    for (const log of eligibleLogsRes.rows) {
      const insRes = await this.db.query(
        `INSERT INTO contract_worklog_consumptions (
          contract_period_id, time_log_id, hours_consumed, is_overage, is_active, created_by
        ) VALUES ($1, $2, $3, FALSE, TRUE, $4)
        ON CONFLICT (time_log_id) DO NOTHING
        RETURNING id`,
        [periodId, log.id, log.hours_spent, userId],
      );
      if (insRes.rows.length > 0) {
        newlyConsumedCount++;
      }
    }

    // 4. Recalculate period aggregates
    const sumRes = await this.db.query(
      `SELECT COALESCE(SUM(hours_consumed), 0)::numeric(10,2) AS total_consumed
      FROM contract_worklog_consumptions
      WHERE contract_period_id = $1 AND is_active = TRUE`,
      [periodId],
    );

    const totalConsumed = Number(sumRes.rows[0]?.total_consumed || 0);
    const totalAllowance = Number(period.total_allowance_hours || 0);
    const remaining = Math.max(0, totalAllowance - totalConsumed);
    const overage = Math.max(0, totalConsumed - totalAllowance);

    // Update is_overage flag on consumptions that exceeded total allowance
    // (Informational flag marking hours beyond bucket)
    await this.db.query(
      `UPDATE contract_periods SET
        approved_consumed_hours = $1,
        remaining_allowance_hours = $2,
        overage_hours = $3,
        updated_by = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5`,
      [totalConsumed, remaining, overage, userId, periodId],
    );

    return {
      periodId,
      totalAllowanceHours: totalAllowance,
      approvedConsumedHours: totalConsumed,
      remainingAllowanceHours: remaining,
      overageHours: overage,
      newlyConsumedCount,
      totalEligibleLogs: eligibleLogsRes.rows.length,
    };
  }

  async consumeWorklog(periodId: string, dto: ConsumeWorklogDto, userId: string) {
    const periodRes = await this.db.query(
      `SELECT cp.*, c.project_id, c.product_id
      FROM contract_periods cp
      JOIN commercial_contracts c ON cp.contract_id = c.id
      WHERE cp.id = $1 AND cp.is_active = TRUE`,
      [periodId],
    );
    if (periodRes.rows.length === 0) {
      throw new NotFoundException(`Period ${periodId} not found`);
    }
    const period = periodRes.rows[0];

    const logRes = await this.db.query(
      `SELECT ttl.*, t.project_id, t.product_id
      FROM task_time_logs ttl
      JOIN tasks t ON ttl.task_id = t.id
      WHERE ttl.id = $1`,
      [dto.timeLogId],
    );
    if (logRes.rows.length === 0) {
      throw new NotFoundException(`Task time log ${dto.timeLogId} not found`);
    }
    const log = logRes.rows[0];

    if (log.approval_status !== 'APPROVED') {
      throw new BadRequestException(
        `Cannot consume worklog with status '${log.approval_status}'. Only APPROVED worklogs may consume commercial allowance.`,
      );
    }
    if (!log.is_billable) {
      throw new BadRequestException('Cannot consume non-billable worklog against commercial contract.');
    }

    // Verify scope match
    if (period.project_id && log.project_id !== period.project_id) {
      throw new BadRequestException('Worklog does not belong to the contract project scope.');
    }
    if (period.product_id && log.product_id !== period.product_id) {
      throw new BadRequestException('Worklog does not belong to the contract product scope.');
    }

    const hoursToConsume = dto.hoursConsumed ?? Number(log.hours_spent);

    try {
      const insRes = await this.db.query(
        `INSERT INTO contract_worklog_consumptions (
          contract_period_id, time_log_id, hours_consumed, is_overage, is_active, created_by
        ) VALUES ($1, $2, $3, FALSE, TRUE, $4)
        RETURNING *`,
        [periodId, dto.timeLogId, hoursToConsume, userId],
      );

      // Reconcile totals
      await this.reconcilePeriod(periodId, userId);
      return insRes.rows[0];
    } catch (err) {
      if (err.code === '23505') {
        throw new BadRequestException('This worklog has already been consumed in a contract period (no duplicate consumption permitted).');
      }
      throw err;
    }
  }

  async removeConsumption(consumptionId: string, userId: string) {
    const res = await this.db.query(
      `DELETE FROM contract_worklog_consumptions WHERE id = $1 RETURNING contract_period_id`,
      [consumptionId],
    );
    if (res.rows.length === 0) {
      throw new NotFoundException(`Consumption record ${consumptionId} not found`);
    }

    const periodId = res.rows[0].contract_period_id;
    await this.reconcilePeriod(periodId, userId);
    return { success: true, removedId: consumptionId, periodId };
  }

  // ========================================================
  // 4. Period Closing & Rollover Policy Execution
  // Acceptance guarantee:
  // "a new contract period follows the agreed rollover policy"
  // ========================================================

  async closeAndRolloverPeriod(periodId: string, userId: string) {
    // 1. Reconcile current period to ensure final numbers
    await this.reconcilePeriod(periodId, userId);

    const periodRes = await this.db.query(
      `SELECT cp.*, c.contract_number, c.included_hours_per_period, c.rollover_rule,
              c.max_rollover_hours, c.periodicity, c.hourly_rate, c.overage_hourly_rate, c.currency, c.end_date as contract_end_date
      FROM contract_periods cp
      JOIN commercial_contracts c ON cp.contract_id = c.id
      WHERE cp.id = $1 AND cp.is_active = TRUE`,
      [periodId],
    );

    if (periodRes.rows.length === 0) {
      throw new NotFoundException(`Period ${periodId} not found`);
    }

    const period = periodRes.rows[0];
    if (period.status === PeriodStatus.CLOSED) {
      throw new BadRequestException(`Period ${period.period_code} is already CLOSED`);
    }

    // 2. Evaluate rollover policy
    const totalAllowance = Number(period.total_allowance_hours || 0);
    const approvedConsumed = Number(period.approved_consumed_hours || 0);
    const unusedHours = Math.max(0, totalAllowance - approvedConsumed);

    let rolledOut = 0.0;
    if (period.rollover_rule === RolloverRule.NO_ROLLOVER) {
      rolledOut = 0.0;
    } else if (period.rollover_rule === RolloverRule.FULL_ROLLOVER) {
      rolledOut = unusedHours;
    } else if (period.rollover_rule === RolloverRule.CAPPED_ROLLOVER || period.rollover_rule === RolloverRule.EXPIRE_AFTER_N_PERIODS) {
      const cap = Number(period.max_rollover_hours || 0);
      rolledOut = Math.min(unusedHours, cap > 0 ? cap : unusedHours);
    }

    // 3. Mark current period CLOSED
    await this.db.query(
      `UPDATE contract_periods SET
        status = 'CLOSED',
        rolled_over_hours_out = $1,
        closed_at = CURRENT_TIMESTAMP,
        closed_by = $2,
        updated_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3`,
      [rolledOut, userId, periodId],
    );

    // 4. Calculate next period start and end dates
    const currentEnd = new Date(period.end_date);
    const nextStart = new Date(currentEnd);
    nextStart.setDate(nextStart.getDate() + 1);

    const nextEnd = new Date(nextStart);
    if (period.periodicity === 'MONTHLY') {
      nextEnd.setMonth(nextEnd.getMonth() + 1);
      nextEnd.setDate(0);
    } else if (period.periodicity === 'QUARTERLY') {
      nextEnd.setMonth(nextEnd.getMonth() + 3);
      nextEnd.setDate(0);
    } else if (period.periodicity === 'ANNUALLY') {
      nextEnd.setFullYear(nextEnd.getFullYear() + 1);
      nextEnd.setDate(0);
    } else {
      nextEnd.setMonth(nextEnd.getMonth() + 1);
    }

    const nextSeq = Number(period.period_sequence) + 1;
    const nextPeriodCode = `PER-${period.contract_number}-${String(nextSeq).padStart(2, '0')}`;
    const baseIncluded = Number(period.included_hours_per_period);
    const newTotalAllowance = baseIncluded + rolledOut;

    // 5. Insert new next period
    const nextRes = await this.db.query(
      `INSERT INTO contract_periods (
        contract_id, period_code, period_sequence, start_date, end_date,
        included_hours, rolled_over_hours_in, total_allowance_hours,
        approved_consumed_hours, remaining_allowance_hours, overage_hours, rolled_over_hours_out,
        hourly_rate, overage_hourly_rate, currency, status, reconciled_notes, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0.00, $8, 0.00, 0.00, $9, $10, $11, 'OPEN', $12, TRUE, $13)
      RETURNING *`,
      [
        period.contract_id,
        nextPeriodCode,
        nextSeq,
        nextStart.toISOString().split('T')[0],
        nextEnd.toISOString().split('T')[0],
        baseIncluded,
        rolledOut,
        newTotalAllowance,
        period.hourly_rate,
        period.overage_hourly_rate,
        period.currency,
        `Rolled in ${rolledOut.toFixed(2)} hours from previous period ${period.period_code} under ${period.rollover_rule} policy.`,
        userId,
      ],
    );

    const closedPeriod = await this.findPeriodById(periodId, { id: userId });
    return {
      closedPeriod,
      nextPeriod: nextRes.rows[0],
      rolloverSummary: {
        unusedHours,
        rolledOverHours: rolledOut,
        ruleApplied: period.rollover_rule,
        cap: period.max_rollover_hours,
      },
    };
  }

  // ========================================================
  // 5. Overage Authorization Requests (CLIENT-004 Integration)
  // ========================================================

  async createOverageRequest(periodId: string, dto: CreateOverageRequestDto, userId: string) {
    const periodRes = await this.db.query(
      `SELECT cp.*, c.overage_hourly_rate, c.currency
      FROM contract_periods cp
      JOIN commercial_contracts c ON cp.contract_id = c.id
      WHERE cp.id = $1 AND cp.is_active = TRUE`,
      [periodId],
    );
    if (periodRes.rows.length === 0) {
      throw new NotFoundException(`Period ${periodId} not found`);
    }
    const period = periodRes.rows[0];

    const year = new Date().getFullYear();
    const countRes = await this.db.query(
      `SELECT COUNT(*)::int as count FROM contract_overage_requests WHERE request_code LIKE $1`,
      [`OVR-${year}-%`],
    );
    const seq = (countRes.rows[0]?.count || 0) + 1;
    const requestCode = `OVR-${year}-${String(seq).padStart(4, '0')}`;

    const rate = Number(period.overage_hourly_rate || 0);
    const estimatedAmount = dto.estimatedAmount ?? Number(dto.requestedOverageHours) * rate;

    const res = await this.db.query(
      `INSERT INTO contract_overage_requests (
        request_code, contract_period_id, change_request_id, requested_overage_hours,
        estimated_amount, currency, justification, status, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING_CLIENT_APPROVAL', TRUE, $8)
      RETURNING *`,
      [
        requestCode,
        periodId,
        dto.changeRequestId || null,
        dto.requestedOverageHours,
        estimatedAmount,
        dto.currency || period.currency,
        dto.justification,
        userId,
      ],
    );

    return res.rows[0];
  }

  async decideOverageRequest(requestId: string, dto: DecideOverageRequestDto, userId: string) {
    const existing = await this.db.query(
      `SELECT * FROM contract_overage_requests WHERE id = $1 AND is_active = TRUE`,
      [requestId],
    );
    if (existing.rows.length === 0) {
      throw new NotFoundException(`Overage request ${requestId} not found`);
    }

    const current = existing.rows[0];
    const approvedHours = dto.decision === OverageDecision.APPROVED
      ? dto.approvedHours ?? Number(current.requested_overage_hours)
      : 0.0;

    const res = await this.db.query(
      `UPDATE contract_overage_requests SET
        status = $1,
        approved_hours = $2,
        approved_by_contact_id = $3,
        approved_at = CURRENT_TIMESTAMP,
        client_remarks = $4,
        updated_by = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *`,
      [
        dto.decision,
        approvedHours,
        dto.approvedByContactId || null,
        dto.clientRemarks || null,
        userId,
        requestId,
      ],
    );

    return res.rows[0];
  }

  // ========================================================
  // 6. Client Statement (Zero Confidential Margin Leakage)
  // Acceptance guarantee:
  // "Client statements disclose only authorized approved usage and quotations"
  // ========================================================

  async getClientStatement(contractId: string, periodId?: string, user?: any) {
    const contract = await this.findContractById(contractId, user);

    let targetPeriodId = periodId;
    if (!targetPeriodId) {
      const activePeriod = contract.periods?.find((p: any) => p.status === 'OPEN') || contract.periods?.[0];
      targetPeriodId = activePeriod?.id;
    }

    if (!targetPeriodId) {
      throw new NotFoundException(`No active or specified period found for contract ${contract.contract_number}`);
    }

    const period = await this.findPeriodById(targetPeriodId, user);

    // Filter itemized usage for client presentation:
    // Only approved worklogs, stripped of internal developer pay, cost margins, internal notes
    const sanitizedUsage = (period.consumptions || []).map((c: any) => ({
      consumptionId: c.id,
      date: c.log_date,
      taskCode: c.task_code,
      taskTitle: c.task_title,
      taskType: c.task_type_name,
      hoursConsumed: Number(c.hours_consumed),
      isOverage: c.is_overage,
      workDescription: c.worklog_description,
      approvalStatus: c.approval_status,
      consumedAt: c.consumed_at,
    }));

    const sanitizedOverages = (period.overage_requests || []).map((o: any) => ({
      requestId: o.id,
      requestCode: o.request_code,
      crNumber: o.cr_number,
      requestedHours: Number(o.requested_overage_hours),
      approvedHours: Number(o.approved_hours),
      status: o.status,
      estimatedAmount: Number(o.estimated_amount),
      currency: o.currency,
      justification: o.justification,
      clientRemarks: o.client_remarks,
      approvedAt: o.approved_at,
    }));

    return {
      statementDate: new Date().toISOString(),
      contract: {
        id: contract.id,
        contractNumber: contract.contract_number,
        title: contract.title,
        contractType: contract.contract_type,
        periodicity: contract.periodicity,
        clientName: contract.client_name,
        projectName: contract.project_name,
        productName: contract.product_name,
        currency: contract.currency,
        hourlyRate: Number(contract.hourly_rate),
        overageHourlyRate: Number(contract.overage_hourly_rate),
        rolloverRule: contract.rollover_rule,
        maxRolloverHours: Number(contract.max_rollover_hours),
      },
      period: {
        id: period.id,
        periodCode: period.period_code,
        periodSequence: period.period_sequence,
        startDate: period.start_date,
        endDate: period.end_date,
        status: period.status,
        includedHours: Number(period.included_hours),
        rolledOverHoursIn: Number(period.rolled_over_hours_in),
        totalAllowanceHours: Number(period.total_allowance_hours),
        approvedConsumedHours: Number(period.approved_consumed_hours),
        remainingAllowanceHours: Number(period.remaining_allowance_hours),
        overageHours: Number(period.overage_hours),
        rolledOverHoursOut: Number(period.rolled_over_hours_out),
      },
      summary: {
        allowanceBurnPercentage:
          Number(period.total_allowance_hours) > 0
            ? Math.min(100, Math.round((Number(period.approved_consumed_hours) / Number(period.total_allowance_hours)) * 100))
            : 0,
        authorizedOverageHours: sanitizedOverages
          .filter((o: any) => o.status === 'APPROVED')
          .reduce((acc: number, curr: any) => acc + curr.approvedHours, 0),
        isOveragePresent: Number(period.overage_hours) > 0,
      },
      approvedUsage: sanitizedUsage,
      overageAuthorizations: sanitizedOverages,
    };
  }
}
