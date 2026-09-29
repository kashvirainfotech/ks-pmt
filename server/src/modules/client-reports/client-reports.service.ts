import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  CreateClientReportDto,
  ReportAudienceScope,
} from './dto/create-client-report.dto';
import { UpdateClientReportDto } from './dto/update-client-report.dto';
import { PublishClientReportDto } from './dto/publish-client-report.dto';
import { QueryClientReportsDto } from './dto/query-client-reports.dto';

@Injectable()
export class ClientReportsService {
  constructor(private readonly db: DatabaseService) {}

  private async generateReportCode(): Promise<string> {
    const year = new Date().getFullYear();
    const countRes = await this.db.query(
      `SELECT COUNT(*)::int AS cnt FROM client_progress_reports WHERE report_code LIKE $1`,
      [`CPR-${year}-%`],
    );
    const nextSeq = ((countRes.rows[0]?.cnt || 0) + 1).toString().padStart(4, '0');
    return `CPR-${year}-${nextSeq}`;
  }

  async create(dto: CreateClientReportDto, userId: string) {
    const reportCode = await this.generateReportCode();

    const insertSql = `
      INSERT INTO client_progress_reports (
        report_code, project_id, product_id, title,
        period_start_date, period_end_date, overall_health, health_narrative,
        executive_summary, delivered_work_summary, next_steps_summary,
        decisions_needed_summary, client_action_items, milestone_forecasts,
        sanitized_risks, include_commercials, commercial_summary,
        audience_scope, internal_notes, report_status, current_revision,
        created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8,
        $9, $10, $11,
        $12, $13, $14,
        $15, $16, $17,
        $18, $19, 'DRAFT', 1,
        $20, $20
      )
      RETURNING *;
    `;

    const res = await this.db.query(insertSql, [
      reportCode,
      dto.projectId || null,
      dto.productId || null,
      dto.title,
      dto.periodStartDate,
      dto.periodEndDate,
      dto.overallHealth || 'ON_TRACK',
      dto.healthNarrative || null,
      dto.executiveSummary,
      dto.deliveredWorkSummary || null,
      dto.nextStepsSummary || null,
      dto.decisionsNeededSummary || null,
      JSON.stringify(dto.clientActionItems || []),
      JSON.stringify(dto.milestoneForecasts || []),
      JSON.stringify(dto.sanitizedRisks || []),
      dto.includeCommercials || false,
      dto.commercialSummary ? JSON.stringify(dto.commercialSummary) : null,
      dto.audienceScope || 'CLIENT_ALL',
      dto.internalNotes || null,
      userId,
    ]);

    return this.findById(res.rows[0].id, true);
  }

  async findAll(query: QueryClientReportsDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['cpr.is_active = TRUE'];
    const params: any[] = [];
    let idx = 1;

    if (query.projectId) {
      conditions.push(`cpr.project_id = $${idx++}`);
      params.push(query.projectId);
    }
    if (query.productId) {
      conditions.push(`cpr.product_id = $${idx++}`);
      params.push(query.productId);
    }
    if (query.reportStatus) {
      conditions.push(`cpr.report_status = $${idx++}`);
      params.push(query.reportStatus);
    }
    if (query.overallHealth) {
      conditions.push(`cpr.overall_health = $${idx++}`);
      params.push(query.overallHealth);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await this.db.query(
      `SELECT COUNT(*)::int AS total FROM client_progress_reports cpr ${whereClause}`,
      params,
    );
    const total = countRes.rows[0]?.total || 0;

    const dataSql = `
      SELECT
        cpr.*,
        p.name AS project_name,
        p.code AS project_code,
        prod.name AS product_name,
        prod.code AS product_code,
        u_pub.full_name AS published_by_name,
        u_creator.full_name AS created_by_name
      FROM client_progress_reports cpr
      LEFT JOIN projects p ON cpr.project_id = p.id
      LEFT JOIN products prod ON cpr.product_id = prod.id
      LEFT JOIN users u_pub ON cpr.published_by_user_id = u_pub.id
      LEFT JOIN users u_creator ON cpr.created_by = u_creator.id
      ${whereClause}
      ORDER BY cpr.period_end_date DESC, cpr.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;

    params.push(limit, offset);
    const dataRes = await this.db.query(dataSql, params);

    return {
      data: dataRes.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string, isInternal: boolean = true, isApprover: boolean = false) {
    const sql = `
      SELECT
        cpr.*,
        p.name AS project_name,
        p.code AS project_code,
        prod.name AS product_name,
        prod.code AS product_code,
        u_pub.full_name AS published_by_name,
        u_creator.full_name AS created_by_name
      FROM client_progress_reports cpr
      LEFT JOIN projects p ON cpr.project_id = p.id
      LEFT JOIN products prod ON cpr.product_id = prod.id
      LEFT JOIN users u_pub ON cpr.published_by_user_id = u_pub.id
      LEFT JOIN users u_creator ON cpr.created_by = u_creator.id
      WHERE cpr.id = $1 AND cpr.is_active = TRUE
    `;

    const res = await this.db.query(sql, [id]);
    if (!res.rows || res.rows.length === 0) {
      throw new NotFoundException(`Client progress report with ID ${id} not found`);
    }

    const report = res.rows[0];

    // Audience & Security Checks for Client Portal
    if (!isInternal) {
      if (report.report_status !== 'PUBLISHED') {
        throw new NotFoundException(`Progress report is not published`);
      }
      if (report.audience_scope === 'INTERNAL_ONLY') {
        throw new ForbiddenException(`This report is internal only`);
      }
      if (report.audience_scope === 'CLIENT_APPROVERS_ONLY' && !isApprover) {
        throw new ForbiddenException(`This report is restricted to designated client approvers`);
      }
      // Zero-leakage redaction
      delete report.internal_notes;
      if (!report.include_commercials || !isApprover) {
        report.commercial_summary = null;
      }
    }

    // Load revisions
    const revSql = `
      SELECT
        r.*,
        u.full_name AS published_by_name
      FROM client_progress_report_revisions r
      LEFT JOIN users u ON r.published_by_user_id = u.id
      WHERE r.report_id = $1 AND r.is_active = TRUE
      ORDER BY r.revision_number DESC
    `;
    const revRes = await this.db.query(revSql, [id]);

    report.revisions = revRes.rows.map((rev) => {
      if (!isInternal) {
        // Redact internal snapshot fields for client portal
        const snapshot = { ...rev.published_content_snapshot };
        delete snapshot.internal_notes;
        if (!report.include_commercials || !isApprover) {
          snapshot.commercial_summary = null;
        }
        return {
          ...rev,
          published_content_snapshot: snapshot,
        };
      }
      return rev;
    });

    return report;
  }

  async update(id: string, dto: UpdateClientReportDto, userId: string) {
    const existing = await this.findById(id, true);

    if (existing.report_status === 'PUBLISHED') {
      throw new BadRequestException(
        `Published reports cannot be modified directly. Transition to 'UNDER_REVIEW' or publish a new revision.`,
      );
    }

    const fields: string[] = ['updated_by = $1', 'updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [userId];
    let idx = 2;

    if (dto.title !== undefined) {
      fields.push(`title = $${idx++}`);
      params.push(dto.title);
    }
    if (dto.periodStartDate !== undefined) {
      fields.push(`period_start_date = $${idx++}`);
      params.push(dto.periodStartDate);
    }
    if (dto.periodEndDate !== undefined) {
      fields.push(`period_end_date = $${idx++}`);
      params.push(dto.periodEndDate);
    }
    if (dto.overallHealth !== undefined) {
      fields.push(`overall_health = $${idx++}`);
      params.push(dto.overallHealth);
    }
    if (dto.healthNarrative !== undefined) {
      fields.push(`health_narrative = $${idx++}`);
      params.push(dto.healthNarrative);
    }
    if (dto.executiveSummary !== undefined) {
      fields.push(`executive_summary = $${idx++}`);
      params.push(dto.executiveSummary);
    }
    if (dto.deliveredWorkSummary !== undefined) {
      fields.push(`delivered_work_summary = $${idx++}`);
      params.push(dto.deliveredWorkSummary);
    }
    if (dto.nextStepsSummary !== undefined) {
      fields.push(`next_steps_summary = $${idx++}`);
      params.push(dto.nextStepsSummary);
    }
    if (dto.decisionsNeededSummary !== undefined) {
      fields.push(`decisions_needed_summary = $${idx++}`);
      params.push(dto.decisionsNeededSummary);
    }
    if (dto.clientActionItems !== undefined) {
      fields.push(`client_action_items = $${idx++}`);
      params.push(JSON.stringify(dto.clientActionItems));
    }
    if (dto.milestoneForecasts !== undefined) {
      fields.push(`milestone_forecasts = $${idx++}`);
      params.push(JSON.stringify(dto.milestoneForecasts));
    }
    if (dto.sanitizedRisks !== undefined) {
      fields.push(`sanitized_risks = $${idx++}`);
      params.push(JSON.stringify(dto.sanitizedRisks));
    }
    if (dto.includeCommercials !== undefined) {
      fields.push(`include_commercials = $${idx++}`);
      params.push(dto.includeCommercials);
    }
    if (dto.commercialSummary !== undefined) {
      fields.push(`commercial_summary = $${idx++}`);
      params.push(dto.commercialSummary ? JSON.stringify(dto.commercialSummary) : null);
    }
    if (dto.audienceScope !== undefined) {
      fields.push(`audience_scope = $${idx++}`);
      params.push(dto.audienceScope);
    }
    if (dto.internalNotes !== undefined) {
      fields.push(`internal_notes = $${idx++}`);
      params.push(dto.internalNotes);
    }

    params.push(id);
    const updateSql = `
      UPDATE client_progress_reports
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING *;
    `;

    await this.db.query(updateSql, params);
    return this.findById(id, true);
  }

  async submitForReview(id: string, userId: string) {
    const existing = await this.findById(id, true);
    if (existing.report_status !== 'DRAFT') {
      throw new BadRequestException(
        `Only reports in 'DRAFT' status can be submitted for review. Current: ${existing.report_status}`,
      );
    }

    await this.db.query(
      `UPDATE client_progress_reports SET report_status = 'UNDER_REVIEW', updated_by = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [userId, id],
    );

    return this.findById(id, true);
  }

  async publish(id: string, dto: PublishClientReportDto, userId: string) {
    const report = await this.findById(id, true);

    const nextRevision =
      report.report_status === 'PUBLISHED'
        ? report.current_revision + 1
        : report.current_revision;

    const audienceScope = dto.audienceScope || report.audience_scope;

    // Snapshot payload for historical audit
    const snapshotPayload = {
      reportCode: report.report_code,
      title: report.title,
      periodStartDate: report.period_start_date,
      periodEndDate: report.period_end_date,
      overallHealth: report.overall_health,
      healthNarrative: report.health_narrative,
      executiveSummary: report.executive_summary,
      deliveredWorkSummary: report.delivered_work_summary,
      nextStepsSummary: report.next_steps_summary,
      decisionsNeededSummary: report.decisions_needed_summary,
      clientActionItems: report.client_action_items,
      milestoneForecasts: report.milestone_forecasts,
      sanitizedRisks: report.sanitized_risks,
      includeCommercials: report.include_commercials,
      commercialSummary: report.commercial_summary,
      audienceScope,
      internalNotes: report.internal_notes, // saved internally in snapshot, but redacted in client queries
    };

    // Update main report
    await this.db.query(
      `
      UPDATE client_progress_reports
      SET
        report_status = 'PUBLISHED',
        current_revision = $1,
        audience_scope = $2,
        published_at = CURRENT_TIMESTAMP,
        published_by_user_id = $3,
        updated_by = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `,
      [nextRevision, audienceScope, userId, id],
    );

    // Insert revision snapshot
    await this.db.query(
      `
      INSERT INTO client_progress_report_revisions (
        report_id, revision_number, published_content_snapshot,
        revision_reason, published_at, published_by_user_id,
        created_by, updated_by
      ) VALUES (
        $1, $2, $3,
        $4, CURRENT_TIMESTAMP, $5,
        $5, $5
      )
    `,
      [
        id,
        nextRevision,
        JSON.stringify(snapshotPayload),
        dto.revisionReason || (nextRevision === 1 ? 'Initial published report' : 'Updated milestone & progress revision'),
        userId,
      ],
    );

    return this.findById(id, true);
  }

  async archive(id: string, userId: string) {
    await this.db.query(
      `UPDATE client_progress_reports SET report_status = 'ARCHIVED', updated_by = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [userId, id],
    );
    return this.findById(id, true);
  }

  async findForClientPortal(
    permittedProjectIds: string[],
    isApprover: boolean,
    projectId?: string,
  ) {
    if (!permittedProjectIds || permittedProjectIds.length === 0) {
      return [];
    }

    const conditions: string[] = [
      `cpr.report_status = 'PUBLISHED'`,
      `cpr.audience_scope != 'INTERNAL_ONLY'`,
      `cpr.is_active = TRUE`,
    ];
    const params: any[] = [];
    let idx = 1;

    if (projectId) {
      if (!permittedProjectIds.includes(projectId)) {
        throw new ForbiddenException(`You do not have access to this project`);
      }
      conditions.push(`cpr.project_id = $${idx++}`);
      params.push(projectId);
    } else {
      conditions.push(`cpr.project_id = ANY($${idx++})`);
      params.push(permittedProjectIds);
    }

    if (!isApprover) {
      conditions.push(`cpr.audience_scope != 'CLIENT_APPROVERS_ONLY'`);
    }

    const sql = `
      SELECT
        cpr.id,
        cpr.report_code,
        cpr.title,
        cpr.period_start_date,
        cpr.period_end_date,
        cpr.overall_health,
        cpr.health_narrative,
        cpr.executive_summary,
        cpr.delivered_work_summary,
        cpr.next_steps_summary,
        cpr.decisions_needed_summary,
        cpr.client_action_items,
        cpr.milestone_forecasts,
        cpr.sanitized_risks,
        cpr.include_commercials,
        CASE
          WHEN cpr.include_commercials = TRUE AND $${idx} = TRUE THEN cpr.commercial_summary
          ELSE NULL
        END AS commercial_summary,
        cpr.audience_scope,
        cpr.current_revision,
        cpr.published_at,
        p.name AS project_name,
        p.code AS project_code,
        prod.name AS product_name,
        prod.code AS product_code,
        u_pub.full_name AS published_by_name
      FROM client_progress_reports cpr
      LEFT JOIN projects p ON cpr.project_id = p.id
      LEFT JOIN products prod ON cpr.product_id = prod.id
      LEFT JOIN users u_pub ON cpr.published_by_user_id = u_pub.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY cpr.period_end_date DESC, cpr.published_at DESC
    `;

    params.push(isApprover);
    const res = await this.db.query(sql, params);
    return res.rows;
  }

  async getClientPortalReports(
    contact: { contactId: string; clientId: string; isApprover?: boolean },
    projectId?: string,
  ) {
    let sql = `
      SELECT
        cpr.id,
        cpr.report_code,
        cpr.title,
        cpr.period_start_date,
        cpr.period_end_date,
        cpr.overall_health,
        cpr.health_narrative,
        cpr.executive_summary,
        cpr.delivered_work_summary,
        cpr.next_steps_summary,
        cpr.decisions_needed_summary,
        cpr.client_action_items,
        cpr.milestone_forecasts,
        cpr.sanitized_risks,
        cpr.include_commercials,
        CASE
          WHEN cpr.include_commercials = TRUE AND $1 = TRUE THEN cpr.commercial_summary
          ELSE NULL
        END AS commercial_summary,
        cpr.audience_scope,
        cpr.current_revision,
        cpr.published_at,
        p.name AS project_name,
        p.code AS project_code,
        prod.name AS product_name,
        prod.code AS product_code,
        u_pub.full_name AS published_by_name
      FROM client_progress_reports cpr
      LEFT JOIN projects p ON cpr.project_id = p.id
      LEFT JOIN products prod ON cpr.product_id = prod.id
      LEFT JOIN users u_pub ON cpr.published_by_user_id = u_pub.id
      WHERE cpr.is_active = TRUE
        AND cpr.report_status = 'PUBLISHED'
        AND cpr.audience_scope != 'INTERNAL_ONLY'
    `;

    const isApprover = Boolean(contact.isApprover);
    const params: any[] = [isApprover];
    let pIdx = 2;

    if (!isApprover) {
      sql += ` AND cpr.audience_scope != 'CLIENT_APPROVERS_ONLY'`;
    }

    sql += ` AND (
      cpr.project_id IN (
        SELECT project_id FROM client_contact_projects WHERE contact_id = $${pIdx} AND is_active = TRUE
      )
      OR cpr.project_id IN (
        SELECT id FROM projects WHERE client_id = $${pIdx + 1}
      )
    )`;
    params.push(contact.contactId, contact.clientId);
    pIdx += 2;

    if (projectId) {
      sql += ` AND cpr.project_id = $${pIdx++}`;
      params.push(projectId);
    }

    sql += ` ORDER BY cpr.period_end_date DESC, cpr.published_at DESC`;

    const res = await this.db.query(sql, params);
    return res.rows;
  }

  async getClientPortalReportDetail(
    id: string,
    contact: { contactId: string; clientId: string; isApprover?: boolean },
  ) {
    const report = await this.findById(id, false, Boolean(contact.isApprover));

    // Verify project belongs to contact
    if (report.project_id) {
      const authCheck = await this.db.query(
        `SELECT 1 FROM projects p
         WHERE p.id = $1 AND (
           p.id IN (SELECT project_id FROM client_contact_projects WHERE contact_id = $2 AND is_active = TRUE)
           OR p.client_id = $3
         )`,
        [report.project_id, contact.contactId, contact.clientId],
      );
      if (authCheck.rowCount === 0) {
        throw new ForbiddenException('You do not have access to this project report');
      }
    }

    return report;
  }

  async generateDigest(id: string): Promise<string> {
    const report = await this.findById(id, true);

    const healthEmoji =
      report.overall_health === 'ON_TRACK'
        ? '🟢 On Track'
        : report.overall_health === 'NEEDS_ATTENTION'
        ? '🟡 Needs Attention'
        : '🔴 At Risk';

    const lines: string[] = [
      `=======================================================`,
      `PROJECT PROGRESS UPDATE: ${report.title}`,
      `Report Code: ${report.report_code} (Rev ${report.current_revision})`,
      `Reporting Period: ${report.period_start_date} to ${report.period_end_date}`,
      `Project: ${report.project_name || report.product_name || 'N/A'}`,
      `Overall Health: ${healthEmoji}`,
      `=======================================================`,
      ``,
      `EXECUTIVE SUMMARY:`,
      `${report.executive_summary}`,
      ``,
    ];

    if (report.delivered_work_summary) {
      lines.push(`WORK DELIVERED THIS PERIOD:`, report.delivered_work_summary, ``);
    }

    if (report.next_steps_summary) {
      lines.push(`PLANNED NEXT STEPS:`, report.next_steps_summary, ``);
    }

    if (report.decisions_needed_summary) {
      lines.push(`DECISIONS NEEDED / CLIENT ACTIONS:`, report.decisions_needed_summary, ``);
    }

    if (report.milestone_forecasts && report.milestone_forecasts.length > 0) {
      lines.push(`MILESTONE FORECAST:`);
      for (const m of report.milestone_forecasts) {
        lines.push(
          `- ${m.milestoneName}: Target ${m.indicativeForecastDate} (Committed: ${m.committedDate || 'N/A'}) - ${m.status || 'Active'}`,
        );
      }
      lines.push(``);
    }

    if (report.client_action_items && report.client_action_items.length > 0) {
      lines.push(`PENDING CLIENT ACTIONS:`);
      for (const a of report.client_action_items) {
        lines.push(`- [${a.status || 'OPEN'}] ${a.title} (Owner: ${a.owner || 'Client Team'}, Due: ${a.dueDate || 'TBD'})`);
      }
      lines.push(``);
    }

    if (report.include_commercials && report.commercial_summary) {
      lines.push(
        `COMMERCIAL STATUS (Confidential to Approvers):`,
        `Contract Value: ${report.commercial_summary.currency || 'USD'} ${report.commercial_summary.contractValue || 0}`,
        `Invoiced to Date: ${report.commercial_summary.currency || 'USD'} ${report.commercial_summary.invoicedToDate || 0}`,
        ``,
      );
    }

    lines.push(`Published on: ${report.published_at ? new Date(report.published_at).toLocaleString() : 'Draft'}`);
    return lines.join('\n');
  }
}
