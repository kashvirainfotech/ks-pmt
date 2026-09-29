import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ClientReportsService } from './client-reports.service';
import { DatabaseService } from '../../database/database.service';
import { ProjectHealthStatus } from './dto/create-client-report.dto';

describe('ClientReportsService (CLIENT-006)', () => {
  let service: ClientReportsService;
  let db: { query: jest.Mock; transaction: jest.Mock };

  beforeEach(() => {
    db = {
      query: jest.fn(),
      transaction: jest.fn(async (cb) => {
        const client = { query: jest.fn() };
        return cb(client);
      }),
    };
    service = new ClientReportsService(db as unknown as DatabaseService);
  });

  describe('create', () => {
    it('should generate report code and insert report in DRAFT status', async () => {
      // 1. generateReportCode count check
      db.query.mockResolvedValueOnce({ rows: [{ cnt: 0 }] });
      // 2. insert query
      const mockReport = {
        id: 'rep-uuid-1',
        report_code: 'CPR-2026-0001',
        title: 'Sprint 24 Progress Update',
        period_start_date: '2026-09-01',
        period_end_date: '2026-09-07',
        report_status: 'DRAFT',
        current_revision: 1,
        overall_health: 'ON_TRACK',
        executive_summary: 'Delivered auth module.',
        is_active: true,
      };
      db.query.mockResolvedValueOnce({ rows: [mockReport] });
      // 3. findById query
      db.query.mockResolvedValueOnce({ rows: [mockReport] });
      // 4. findById revisions query
      db.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.create(
        {
          title: 'Sprint 24 Progress Update',
          periodStartDate: '2026-09-01',
          periodEndDate: '2026-09-07',
          executiveSummary: 'Delivered auth module.',
          overallHealth: ProjectHealthStatus.ON_TRACK,
        },
        'user-uuid-1',
      );

      expect(result.report_code).toBe('CPR-2026-0001');
      expect(result.report_status).toBe('DRAFT');
      expect(db.query).toHaveBeenCalledTimes(4);
    });
  });

  describe('findById - Security & Zero Confidentiality Leakage', () => {
    const internalReport = {
      id: 'rep-uuid-1',
      report_code: 'CPR-2026-0001',
      title: 'Weekly Delivery Report',
      report_status: 'PUBLISHED',
      audience_scope: 'CLIENT_ALL',
      internal_notes: 'CRITICAL: Backend developer resigned, team under pressure.',
      include_commercials: true,
      commercial_summary: {
        currency: 'USD',
        contractValue: 50000,
        invoicedToDate: 25000,
      },
      is_active: true,
    };

    it('should expose internal_notes and commercial_summary for internal team queries', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ ...internalReport }] });
      db.query.mockResolvedValueOnce({ rows: [] });

      const report = await service.findById('rep-uuid-1', true);
      expect(report.internal_notes).toBeDefined();
      expect(report.commercial_summary).toBeDefined();
    });

    it('should strictly REDACT internal_notes for client portal queries', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ ...internalReport }] });
      db.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'rev-1',
            revision_number: 1,
            published_content_snapshot: {
              title: 'Weekly Delivery Report',
              internal_notes: 'CRITICAL: Backend developer resigned',
              commercial_summary: { contractValue: 50000 },
            },
          },
        ],
      });

      const report = await service.findById('rep-uuid-1', false, false); // isInternal=false, isApprover=false
      expect(report.internal_notes).toBeUndefined();
      expect(report.commercial_summary).toBeNull(); // Redacted for non-approver!
      expect(report.revisions[0].published_content_snapshot.internal_notes).toBeUndefined();
      expect(report.revisions[0].published_content_snapshot.commercial_summary).toBeNull();
    });

    it('should reveal commercial_summary only to client approvers when include_commercials is true', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ ...internalReport }] });
      db.query.mockResolvedValueOnce({ rows: [] });

      const report = await service.findById('rep-uuid-1', false, true); // isInternal=false, isApprover=true
      expect(report.internal_notes).toBeUndefined(); // Still redacted!
      expect(report.commercial_summary).toBeDefined();
      expect(report.commercial_summary.contractValue).toBe(50000);
    });

    it('should forbid non-approvers from accessing CLIENT_APPROVERS_ONLY reports', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ ...internalReport, audience_scope: 'CLIENT_APPROVERS_ONLY' }],
      });

      await expect(service.findById('rep-uuid-1', false, false)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    it('should update draft report successfully', async () => {
      const existing = {
        id: 'rep-uuid-1',
        report_status: 'DRAFT',
        is_active: true,
      };
      db.query.mockResolvedValueOnce({ rows: [existing] }); // findById
      db.query.mockResolvedValueOnce({ rows: [] }); // revisions
      db.query.mockResolvedValueOnce({ rows: [{ ...existing, title: 'Updated Title' }] }); // update
      db.query.mockResolvedValueOnce({ rows: [{ ...existing, title: 'Updated Title' }] }); // findById
      db.query.mockResolvedValueOnce({ rows: [] }); // revisions

      const res = await service.update('rep-uuid-1', { title: 'Updated Title' }, 'user-1');
      expect(res.title).toBe('Updated Title');
    });

    it('should throw BadRequestException if attempting to update a PUBLISHED report directly', async () => {
      const existing = {
        id: 'rep-uuid-1',
        report_status: 'PUBLISHED',
        is_active: true,
      };
      db.query.mockResolvedValueOnce({ rows: [existing] });
      db.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.update('rep-uuid-1', { title: 'Updated Title' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('submitForReview', () => {
    it('should transition report from DRAFT to UNDER_REVIEW', async () => {
      const draft = { id: 'rep-1', report_status: 'DRAFT', is_active: true };
      db.query.mockResolvedValueOnce({ rows: [draft] });
      db.query.mockResolvedValueOnce({ rows: [] });
      db.query.mockResolvedValueOnce({ rows: [] }); // update status
      db.query.mockResolvedValueOnce({ rows: [{ ...draft, report_status: 'UNDER_REVIEW' }] });
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await service.submitForReview('rep-1', 'user-1');
      expect(res.report_status).toBe('UNDER_REVIEW');
    });
  });

  describe('publish', () => {
    it('should publish report, save snapshot, and increment revision if already published', async () => {
      const current = {
        id: 'rep-1',
        report_code: 'CPR-2026-0001',
        title: 'Sprint 24 Update',
        period_start_date: '2026-09-01',
        period_end_date: '2026-09-07',
        report_status: 'PUBLISHED',
        current_revision: 1,
        overall_health: 'ON_TRACK',
        executive_summary: 'Summary v1',
        audience_scope: 'CLIENT_ALL',
        is_active: true,
      };
      db.query.mockResolvedValueOnce({ rows: [current] }); // findById
      db.query.mockResolvedValueOnce({ rows: [] }); // revisions
      db.query.mockResolvedValueOnce({ rows: [] }); // update report to revision 2
      db.query.mockResolvedValueOnce({ rows: [] }); // insert revision 2 snapshot
      db.query.mockResolvedValueOnce({ rows: [{ ...current, current_revision: 2 }] }); // findById
      db.query.mockResolvedValueOnce({ rows: [] }); // revisions

      const res = await service.publish(
        'rep-1',
        { revisionReason: 'Updated milestone forecast' },
        'user-1',
      );
      expect(res.current_revision).toBe(2);
    });
  });

  describe('findForClientPortal', () => {
    it('should return published reports and hide commercial_summary for non-approvers', async () => {
      const portalRows = [
        {
          id: 'rep-1',
          report_code: 'CPR-2026-0001',
          title: 'Weekly Report',
          include_commercials: true,
          commercial_summary: null,
        },
      ];
      db.query.mockResolvedValueOnce({ rows: portalRows });

      const result = await service.findForClientPortal(['proj-1'], false);
      expect(result.length).toBe(1);
      expect(result[0].commercial_summary).toBeNull();
    });
  });

  describe('generateDigest', () => {
    it('should format text digest with project health and milestones', async () => {
      const report = {
        id: 'rep-1',
        report_code: 'CPR-2026-0001',
        title: 'Sprint 24 Update',
        period_start_date: '2026-09-01',
        period_end_date: '2026-09-07',
        current_revision: 1,
        overall_health: 'ON_TRACK',
        executive_summary: 'All features delivered.',
        delivered_work_summary: 'Completed OAuth flow.',
        next_steps_summary: 'Begin payment gateway.',
        decisions_needed_summary: 'Client to provide Stripe keys.',
        milestone_forecasts: [
          { milestoneName: 'Alpha Launch', indicativeForecastDate: '2026-10-15', status: 'On Track' },
        ],
        is_active: true,
      };
      db.query.mockResolvedValueOnce({ rows: [report] });
      db.query.mockResolvedValueOnce({ rows: [] });

      const digest = await service.generateDigest('rep-1');
      expect(digest).toContain('PROJECT PROGRESS UPDATE: Sprint 24 Update');
      expect(digest).toContain('🟢 On Track');
      expect(digest).toContain('All features delivered.');
      expect(digest).toContain('Alpha Launch');
      expect(digest).toContain('Client to provide Stripe keys.');
    });
  });
});
