import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { RaidService } from './raid.service';
import { DatabaseService } from '../../database/database.service';
import {
  RaidCategory,
  RaidLikelihood,
  RaidImpact,
  ClientVisibility,
} from './dto/create-raid-item.dto';
import { ActionDecision } from './dto/respond-client-action-request.dto';
import { ClientContactUser } from '../client-portal/client-portal.service';

describe('RaidService (DEL-001)', () => {
  let service: RaidService;
  let db: { query: jest.Mock };

  beforeEach(() => {
    db = {
      query: jest.fn(),
    };
    service = new RaidService(db as unknown as DatabaseService);
  });

  describe('createRaidItem', () => {
    it('should create a RISK with computed risk score and initial revision snapshot', async () => {
      // 1. generateItemCode
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      // 2. insert raid_items
      const mockRisk = {
        id: 'rsk-1',
        item_code: 'RSK-2026-0001',
        category: RaidCategory.RISK,
        title: 'Third-party Payment Gateway Downtime',
        likelihood: RaidLikelihood.HIGH,
        impact: RaidImpact.CRITICAL,
        risk_score: 12,
        status: 'IDENTIFIED',
        current_revision: 1,
      };
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [mockRisk] });
      // 3. insert raid_item_revisions
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });

      const result = await service.createRaidItem(
        {
          category: RaidCategory.RISK,
          title: 'Third-party Payment Gateway Downtime',
          likelihood: RaidLikelihood.HIGH,
          impact: RaidImpact.CRITICAL,
        },
        { userId: 'user-pm-1' },
      );

      expect(result.item_code).toBe('RSK-2026-0001');
      expect(result.status).toBe('IDENTIFIED');
      expect(result.risk_score).toBe(12);
      expect(db.query).toHaveBeenCalledTimes(3);
    });

    it('should create a DECISION with ADR context, alternatives and status PROPOSED', async () => {
      // 1. generateItemCode
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      // 2. insert raid_items
      const mockDecision = {
        id: 'dec-1',
        item_code: 'DEC-2026-0001',
        category: RaidCategory.DECISION,
        title: 'Adopt PostgreSQL JSONB for Dynamic Form Schemas',
        context: 'Need flexible metadata without constant schema migrations.',
        status: 'PROPOSED',
        current_revision: 1,
      };
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [mockDecision] });
      // 3. insert revision
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });

      const result = await service.createRaidItem(
        {
          category: RaidCategory.DECISION,
          title: 'Adopt PostgreSQL JSONB for Dynamic Form Schemas',
          context: 'Need flexible metadata without constant schema migrations.',
          alternativesConsidered: [
            { title: 'MongoDB', rejectedReason: 'Avoid dual-database operational overhead' },
          ],
        },
        { userId: 'user-pm-1' },
      );

      expect(result.item_code).toBe('DEC-2026-0001');
      expect(result.status).toBe('PROPOSED');
      expect(db.query).toHaveBeenCalledTimes(3);
    });
  });

  describe('updateRaidItem', () => {
    it('should increment revision and snapshot changes into raid_item_revisions', async () => {
      // 1. getRaidItemById item
      const existing = {
        id: 'dec-1',
        item_code: 'DEC-2026-0001',
        category: RaidCategory.DECISION,
        status: 'PROPOSED',
        current_revision: 1,
      };
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [existing] });
      // 2. getRaidItemById revisions
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });
      // 3. getRaidItemById action requests
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      // 4. update query
      const updated = { ...existing, status: 'ACCEPTED', current_revision: 2 };
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [updated] });
      // 5. insert revision query
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });

      const result = await service.updateRaidItem(
        'dec-1',
        { status: 'ACCEPTED', changeSummary: 'Formal architecture sign-off' },
        { userId: 'user-pm-1' },
      );

      expect(result.current_revision).toBe(2);
      expect(result.status).toBe('ACCEPTED');
      expect(db.query).toHaveBeenCalledTimes(5);
    });
  });

  describe('supersedeDecision', () => {
    it('should link predecessor and successor decisions and set status SUPERSEDED without altering commercial contracts', async () => {
      const prior = {
        id: 'dec-1',
        item_code: 'DEC-2026-0001',
        category: RaidCategory.DECISION,
        status: 'ACCEPTED',
        project_id: 'proj-1',
        context: 'Initial monolithic file storage',
        current_revision: 2,
      };
      // getRaidItemById for prior
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [prior] });
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      // create successor decision
      // 1. generateItemCode
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ item_code: 'DEC-2026-0001' }] });
      // priorCheck for supersedesId
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [prior] });
      // insert successor
      const successor = {
        id: 'dec-2',
        item_code: 'DEC-2026-0002',
        category: RaidCategory.DECISION,
        status: 'ACCEPTED',
        supersedes_id: 'dec-1',
        current_revision: 1,
      };
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [successor] });
      // update prior with superseded_by_id
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });
      // snapshot revision for successor
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });

      // updateRaidItem for prior -> getRaidItemById (3 calls) + update (1 call) + snapshot (1 call)
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [prior] });
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ ...prior, status: 'SUPERSEDED' }] });
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });

      const res = await service.supersedeDecision(
        'dec-1',
        {
          newTitle: 'Migrate File Storage to AWS S3 Presigned URLs',
          rationale: 'Scalability bottleneck resolved.',
        },
        { userId: 'user-pm-1' },
      );

      expect(res.priorDecisionId).toBe('dec-1');
      expect(res.successorDecision.item_code).toBe('DEC-2026-0002');
    });

    it('should throw BadRequestException if item is not a DECISION', async () => {
      const priorRisk = {
        id: 'rsk-1',
        item_code: 'RSK-2026-0001',
        category: RaidCategory.RISK,
      };
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [priorRisk] });
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await expect(
        service.supersedeDecision(
          'rsk-1',
          { newTitle: 'New Plan', rationale: 'Testing' },
          { userId: 'user-pm-1' },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createClientActionRequest', () => {
    it('should validate client organization and generate ACT-YYYY-XXXX code', async () => {
      // 1. generateActionCode
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      // 2. client check
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'client-1', company_name: 'Acme Corp' }] });
      // 3. insert action request
      const mockAction = {
        id: 'act-1',
        action_code: 'ACT-2026-0001',
        project_id: 'proj-1',
        client_id: 'client-1',
        title: 'Approve Single Sign-On IdP Integration Approach',
        context_for_client: 'Please confirm whether Okta or Azure AD is preferred.',
        due_date: '2026-10-15',
        status: 'PENDING',
      };
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [mockAction] });

      const result = await service.createClientActionRequest(
        {
          projectId: 'proj-1',
          clientId: 'client-1',
          title: 'Approve Single Sign-On IdP Integration Approach',
          description: 'Provide IdP metadata and choose Okta vs Azure AD.',
          contextForClient: 'Please confirm whether Okta or Azure AD is preferred.',
          dueDate: '2026-10-15',
        },
        { userId: 'user-pm-1' },
      );

      expect(result.action_code).toBe('ACT-2026-0001');
      expect(result.status).toBe('PENDING');
    });
  });

  describe('respondToClientActionRequest (Zero Confidentiality Leakage & Approver Enforcement)', () => {
    const mockContact: ClientContactUser = {
      id: 'contact-user-1',
      contactId: 'contact-1',
      clientId: 'client-1',
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@acme.com',
      portalRole: 'CLIENT_USER',
      isApprover: false,
      companyName: 'Acme Corp',
      clientCode: 'CLI-ACME',
      isClientContact: true,
    };

    it('should block non-approver from responding if requires_approver is TRUE', async () => {
      // action detail
      const action = {
        id: 'act-1',
        project_id: 'proj-1',
        requires_approver: true,
        status: 'PENDING',
      };
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [action] });
      // project grant query
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ can_approve_scope: false, can_approve_uat: false }] });

      await expect(
        service.respondToClientActionRequest(
          'act-1',
          { responseText: 'We choose Okta.', resultingDecision: ActionDecision.APPROVED },
          mockContact,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow authorized client approver to submit decision and update status to RESPONDED', async () => {
      const approverContact: ClientContactUser = {
        ...mockContact,
        isApprover: true,
      };

      // action detail
      const action = {
        id: 'act-1',
        project_id: 'proj-1',
        requires_approver: true,
        status: 'PENDING',
      };
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [action] });
      // update query
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ ...action, status: 'RESPONDED', response_text: 'Approved Okta IdP' }],
      });

      const res = await service.respondToClientActionRequest(
        'act-1',
        { responseText: 'Approved Okta IdP', resultingDecision: ActionDecision.APPROVED },
        approverContact,
      );

      expect(res.action.status).toBe('RESPONDED');
      expect(res.action.response_text).toBe('Approved Okta IdP');
    });
  });

  describe('getClientPortalDecisions', () => {
    it('should retrieve only client-shared decisions and exclude internal discussions', async () => {
      const contact: ClientContactUser = {
        id: 'u-1',
        contactId: 'c-1',
        clientId: 'client-1',
        firstName: 'Bob',
        lastName: 'Jones',
        email: 'bob@acme.com',
        portalRole: 'CLIENT_USER',
        isApprover: true,
        companyName: 'Acme Corp',
        clientCode: 'CLI-ACME',
        isClientContact: true,
      };

      const mockDecisions = [
        {
          id: 'dec-1',
          item_code: 'DEC-2026-0001',
          title: 'Selected AWS S3 for Document Storage',
          context: 'Client requires high-durability cloud storage.',
          rationale: 'S3 provides 99.999999999% durability.',
          status: 'ACCEPTED',
          client_visibility: 'CLIENT_FULL',
        },
      ];
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: mockDecisions });

      const res = await service.getClientPortalDecisions(contact, 'proj-1');

      expect(res.length).toBe(1);
      expect(res[0].item_code).toBe('DEC-2026-0001');
      // Verifies internal_discussion is never in the returned object
      expect((res[0] as any).internal_discussion).toBeUndefined();
    });
  });
});
