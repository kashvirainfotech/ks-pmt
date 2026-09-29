import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { RequirementsService } from './requirements.service';

describe('RequirementsService (CLIENT-003)', () => {
  let service: RequirementsService;
  let db: { query: jest.Mock };

  beforeEach(() => {
    db = { query: jest.fn() };
    service = new RequirementsService(db as unknown as DatabaseService);
  });

  describe('createRequirement', () => {
    it('should throw BadRequestException if both project and product are missing', async () => {
      await expect(
        service.createRequirement(
          {
            title: 'User Authentication',
            businessObjective: 'Provide secure dual login',
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if both project and product are provided', async () => {
      await expect(
        service.createRequirement(
          {
            title: 'User Authentication',
            businessObjective: 'Provide secure dual login',
            projectId: 'proj-1',
            productId: 'prod-1',
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if referenced project does not exist', async () => {
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await expect(
        service.createRequirement(
          {
            title: 'User Authentication',
            businessObjective: 'Provide secure dual login',
            projectId: 'proj-1',
          },
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should successfully create requirement specification', async () => {
      db.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'proj-1' }] }) // project check
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: 'req-1',
              req_code: 'REQ-101',
              title: 'User Authentication',
              project_id: 'proj-1',
              business_objective: 'Provide secure dual login',
              version: 1,
              status: 'DRAFT',
              is_baselined: false,
            },
          ],
        });

      const res = await service.createRequirement(
        {
          reqCode: 'REQ-101',
          title: 'User Authentication',
          businessObjective: 'Provide secure dual login',
          projectId: 'proj-1',
        },
        'user-1',
      );

      expect(res.id).toBe('req-1');
      expect(res.status).toBe('DRAFT');
    });
  });

  describe('baselineRequirement & proposeAmendment', () => {
    it('should throw BadRequestException when baselining without criteria', async () => {
      db.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'req-1', version: 1 }] }) // req check
        .mockResolvedValueOnce({ rowCount: 0, rows: [] }); // criteria check

      await expect(
        service.baselineRequirement('req-1', { baselineName: 'Initial Scope v1' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should freeze immutable snapshot and mark requirement as BASELINED', async () => {
      db.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'req-1', version: 1, title: 'Auth' }] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'crit-1', criteria_code: 'AC-1' }] })
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: 'base-1', baseline_name: 'Initial Scope v1', version: 1 }],
        }) // insert baseline
        .mockResolvedValueOnce({ rowCount: 1, rows: [] }); // update req

      const res = await service.baselineRequirement(
        'req-1',
        { baselineName: 'Initial Scope v1' },
        'user-1',
      );

      expect(res.baseline_name).toBe('Initial Scope v1');
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO requirement_baselines'),
        expect.any(Array),
      );
    });

    it('should propose amendment by incrementing version without modifying earlier baseline', async () => {
      db.query
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: 'req-1', version: 1, is_baselined: true }],
        })
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: 'req-1', version: 2, status: 'AMENDED', is_baselined: false }],
        });

      const res = await service.proposeAmendment('req-1', 'user-1');
      expect(res.version).toBe(2);
      expect(res.status).toBe('AMENDED');
      expect(res.is_baselined).toBe(false);
    });
  });

  describe('Acceptance Criteria & Task Linking', () => {
    it('should add acceptance criterion with generated code', async () => {
      db.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'req-1', req_code: 'REQ-101' }] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ total: 0 }] })
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: 'crit-1',
              criteria_code: 'REQ-101-AC1',
              title: 'Login with OTP',
              implementation_status: 'NOT_STARTED',
            },
          ],
        });

      const res = await service.addCriterion(
        'req-1',
        {
          title: 'Login with OTP',
          description: 'Given valid mobile, When OTP entered, Then JWT issued',
        },
        'user-1',
      );

      expect(res.criteria_code).toBe('REQ-101-AC1');
    });

    it('should link tasks and auto-advance status to IN_PROGRESS', async () => {
      db.query
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: 'crit-1', implementation_status: 'NOT_STARTED' }],
        })
        .mockResolvedValueOnce({ rowCount: 1, rows: [] }) // insert rct
        .mockResolvedValueOnce({ rowCount: 1, rows: [] }); // update rac to IN_PROGRESS

      const res = await service.linkTasksToCriterion('crit-1', { taskIds: ['t-1'] }, 'user-1');
      expect(res.message).toContain('1 task(s) linked');
    });

    it('should record QA verification and evidence URLs', async () => {
      db.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'crit-1' }] })
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: 'crit-1',
              implementation_status: 'VERIFIED_QA',
              qa_evidence_notes: 'All test cases passed in Staging',
            },
          ],
        });

      const res = await service.recordQaVerification(
        'crit-1',
        {
          status: 'VERIFIED_QA',
          evidenceNotes: 'All test cases passed in Staging',
          evidenceUrls: [{ title: 'QA Run Report', url: 'https://s3.example.com/report.pdf' }],
        },
        'qa-user-1',
      );

      expect(res.implementation_status).toBe('VERIFIED_QA');
    });
  });

  describe('Client Sign-Off Security & Governance', () => {
    it('should reject sign-off if requirement is not client-visible or baselined', async () => {
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'crit-1',
            is_client_visible: false,
            is_baselined: false,
          },
        ],
      });

      await expect(
        service.recordClientSignoff(
          'crit-1',
          { signoffStatus: 'ACCEPTED' },
          { contactId: 'c-1', clientId: 'cli-1', isApprover: true },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject sign-off if client contact lacks approver permissions', async () => {
      db.query
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: 'crit-1',
              project_id: 'proj-1',
              is_client_visible: true,
              is_baselined: true,
            },
          ],
        })
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ can_approve_scope: false, can_approve_uat: false }],
        });

      await expect(
        service.recordClientSignoff(
          'crit-1',
          { signoffStatus: 'ACCEPTED' },
          { contactId: 'c-1', clientId: 'cli-1', isApprover: false },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should successfully record client sign-off when authorized', async () => {
      db.query
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: 'crit-1',
              project_id: 'proj-1',
              is_client_visible: true,
              is_baselined: true,
              implementation_status: 'VERIFIED_QA',
            },
          ],
        })
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ can_approve_scope: true, can_approve_uat: true }],
        })
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: 'crit-1',
              client_signoff_status: 'ACCEPTED',
              implementation_status: 'ACCEPTED_CLIENT',
            },
          ],
        });

      const res = await service.recordClientSignoff(
        'crit-1',
        { signoffStatus: 'ACCEPTED', notes: 'Approved after UAT demo' },
        { contactId: 'c-1', clientId: 'cli-1', isApprover: true },
      );

      expect(res.client_signoff_status).toBe('ACCEPTED');
      expect(res.implementation_status).toBe('ACCEPTED_CLIENT');
    });
  });

  describe('Traceability Matrix & Coverage Analytics', () => {
    it('should compute coverage statistics and identify unimplemented/unverified gaps', async () => {
      db.query.mockResolvedValueOnce({
        rowCount: 2,
        rows: [
          {
            requirement_id: 'req-1',
            req_code: 'REQ-1',
            requirement_title: 'Auth',
            is_baselined: true,
            criterion_id: 'c-1',
            criteria_code: 'AC-1',
            criterion_title: 'Login',
            implementation_status: 'VERIFIED_QA',
            qa_verified_at: '2026-09-29T10:00:00Z',
            client_signoff_status: 'ACCEPTED',
            linked_tasks: [{ id: 't-1', taskCode: 'TSK-1' }],
          },
          {
            requirement_id: 'req-1',
            req_code: 'REQ-1',
            requirement_title: 'Auth',
            is_baselined: true,
            criterion_id: 'c-2',
            criteria_code: 'AC-2',
            criterion_title: 'Logout',
            implementation_status: 'NOT_STARTED',
            qa_verified_at: null,
            client_signoff_status: 'PENDING',
            linked_tasks: [],
          },
        ],
      });

      const matrix = await service.getTraceabilityMatrix({ projectId: 'p-1' });

      expect(matrix.summary.totalRequirements).toBe(1);
      expect(matrix.summary.totalCriteria).toBe(2);
      expect(matrix.summary.implementedCount).toBe(1);
      expect(matrix.summary.implementationCoveragePct).toBe(50);
      expect(matrix.summary.qaCoveragePct).toBe(50);
      expect(matrix.summary.clientAcceptedPct).toBe(50);
      expect(matrix.gaps.unimplementedCriteria).toHaveLength(1);
      expect(matrix.gaps.unimplementedCriteria[0].criteriaCode).toBe('AC-2');
    });
  });
});
