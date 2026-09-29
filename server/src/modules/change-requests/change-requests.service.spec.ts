import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { ChangeRequestsService } from './change-requests.service';

describe('ChangeRequestsService (CLIENT-004)', () => {
  let service: ChangeRequestsService;
  let db: { query: jest.Mock; transaction: jest.Mock };

  beforeEach(() => {
    db = {
      query: jest.fn(),
      transaction: jest.fn(async (cb) => {
        const client = { query: jest.fn() };
        return cb(client);
      }),
    };
    service = new ChangeRequestsService(db as unknown as DatabaseService);
  });

  describe('createChangeRequest', () => {
    it('should throw BadRequestException if both project and product are missing', async () => {
      await expect(
        service.createChangeRequest(
          {
            title: 'Add export to CSV',
            description: 'Export all tables',
            businessJustification: 'Customer request',
            accountablePmUserId: 'pm-1',
            scopeDescription: 'Build CSV export module',
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if both project and product are provided', async () => {
      await expect(
        service.createChangeRequest(
          {
            projectId: 'proj-1',
            productId: 'prod-1',
            title: 'Add export to CSV',
            description: 'Export all tables',
            businessJustification: 'Customer request',
            accountablePmUserId: 'pm-1',
            scopeDescription: 'Build CSV export module',
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if accountable PM does not exist', async () => {
      db.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'proj-1' }] }) // project check
        .mockResolvedValueOnce({ rowCount: 0, rows: [] }); // PM check

      await expect(
        service.createChangeRequest(
          {
            projectId: 'proj-1',
            title: 'Add export to CSV',
            description: 'Export all tables',
            businessJustification: 'Customer request',
            accountablePmUserId: 'pm-nonexistent',
            scopeDescription: 'Build CSV export module',
          },
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should successfully create change request and revision 1 in DRAFT status', async () => {
      db.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'proj-1' }] }) // project check
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'pm-1' }] }); // PM check

      db.transaction = jest.fn(async (cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({
              rowCount: 1,
              rows: [{ id: 'cr-1', cr_number: 'CR-1001', status: 'DRAFT', current_revision: 1 }],
            })
            .mockResolvedValueOnce({
              rowCount: 1,
              rows: [{ id: 'rev-1', change_request_id: 'cr-1', revision_number: 1, status: 'DRAFT' }],
            }),
        };
        return cb(client as any);
      });

      const res = await service.createChangeRequest(
        {
          projectId: 'proj-1',
          title: 'Add export to CSV',
          description: 'Export all tables',
          businessJustification: 'Customer request',
          accountablePmUserId: 'pm-1',
          scopeDescription: 'Build CSV export module',
          estimatedHours: 40,
          quotedPrice: 150000,
        },
        'user-1',
      );

      expect(res.id).toBe('cr-1');
      expect(res.status).toBe('DRAFT');
      expect(res.currentRevision.revision_number).toBe(1);
    });
  });

  describe('submitForInternalReview & reviewRevision', () => {
    it('should reject submission if revision is not in DRAFT or CHANGES_REQUESTED', async () => {
      jest.spyOn(service, 'getChangeRequestById').mockResolvedValueOnce({
        id: 'cr-1',
        current_revision: 1,
        revisions: [{ revision_number: 1, status: 'AWAITING_CLIENT' }],
      } as any);

      await expect(service.submitForInternalReview('cr-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should advance revision to INTERNAL_REVIEW', async () => {
      jest.spyOn(service, 'getChangeRequestById').mockResolvedValueOnce({
        id: 'cr-1',
        current_revision: 1,
        revisions: [{ revision_number: 1, status: 'DRAFT' }],
      } as any);

      db.transaction = jest.fn(async (cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({}).mockResolvedValueOnce({
            rowCount: 1,
            rows: [{ id: 'cr-1', status: 'INTERNAL_REVIEW' }],
          }),
        };
        return cb(client as any);
      });

      const res = await service.submitForInternalReview('cr-1', 'user-1');
      expect(res.status).toBe('INTERNAL_REVIEW');
    });

    it('should review revision and publish to client as AWAITING_CLIENT', async () => {
      jest.spyOn(service, 'getChangeRequestById').mockResolvedValueOnce({
        id: 'cr-1',
        current_revision: 1,
        revisions: [{ revision_number: 1, status: 'INTERNAL_REVIEW' }],
      } as any);

      db.transaction = jest.fn(async (cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({
            rowCount: 1,
            rows: [{ id: 'rev-1', revision_number: 1, status: 'AWAITING_CLIENT' }],
          }),
        };
        return cb(client as any);
      });

      const res = await service.reviewRevision(
        'cr-1',
        1,
        { status: 'AWAITING_CLIENT', internalReviewNotes: 'Approved for client quote' },
        'pm-1',
      );

      expect(res.status).toBe('AWAITING_CLIENT');
    });
  });

  describe('material revisions (N+1 reapproval requirement)', () => {
    it('should create revision N+1 and supersede previous revision', async () => {
      jest.spyOn(service, 'getChangeRequestById').mockResolvedValueOnce({
        id: 'cr-1',
        current_revision: 2,
        revisions: [
          { revision_number: 2, status: 'AWAITING_CLIENT', quoted_price: 10000 },
          { revision_number: 1, status: 'CHANGES_REQUESTED', quoted_price: 8000 },
        ],
      } as any);

      db.transaction = jest.fn(async (cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({}) // supersede
            .mockResolvedValueOnce({
              rowCount: 1,
              rows: [{ id: 'rev-3', revision_number: 3, quoted_price: 15000, status: 'INTERNAL_REVIEW' }],
            })
            .mockResolvedValueOnce({
              rowCount: 1,
              rows: [{ id: 'cr-1', current_revision: 3, status: 'INTERNAL_REVIEW' }],
            }),
        };
        return cb(client as any);
      });

      const res = await service.createMaterialRevision(
        'cr-1',
        {
          scopeDescription: 'Expanded scope including mobile view',
          quotedPrice: 15000,
          revisionReason: 'Client requested additional screens',
          submitForInternalReview: true,
        },
        'pm-1',
      );

      expect(res.current_revision).toBe(3);
      expect(res.newRevision.revision_number).toBe(3);
      expect(res.newRevision.quoted_price).toBe(15000);
    });
  });

  describe('recordClientDecision', () => {
    it('should throw BadRequestException if client attempts to decide on a superseded revision', async () => {
      jest.spyOn(service, 'getChangeRequestById').mockResolvedValueOnce({
        id: 'cr-1',
        current_revision: 3,
        revisions: [{ revision_number: 2, status: 'SUPERSEDED' }],
      } as any);

      await expect(
        service.recordClientDecision(
          'cr-1',
          2,
          { decision: 'APPROVED', remarks: 'Looks good' },
          { contactId: 'c-1', isApprover: true } as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if contact does not have scope approval authority', async () => {
      jest.spyOn(service, 'getChangeRequestById').mockResolvedValueOnce({
        id: 'cr-1',
        project_id: 'proj-1',
        current_revision: 2,
        revisions: [{ revision_number: 2, status: 'AWAITING_CLIENT' }],
      } as any);

      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ can_approve_scope: false }],
      });

      await expect(
        service.recordClientDecision(
          'cr-1',
          2,
          { decision: 'APPROVED' },
          { contactId: 'c-unauthorized', isApprover: false } as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should successfully record client APPROVED decision and update status', async () => {
      jest.spyOn(service, 'getChangeRequestById').mockResolvedValueOnce({
        id: 'cr-1',
        project_id: 'proj-1',
        originating_intake_request_id: 'req-99',
        current_revision: 2,
        revisions: [{ revision_number: 2, status: 'AWAITING_CLIENT' }],
      } as any);

      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ can_approve_scope: true }],
      });

      db.transaction = jest.fn(async (cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({
              rowCount: 1,
              rows: [{ id: 'rev-2', revision_number: 2, client_decision: 'APPROVED', status: 'APPROVED' }],
            })
            .mockResolvedValueOnce({
              rowCount: 1,
              rows: [{ id: 'cr-1', status: 'APPROVED' }],
            })
            .mockResolvedValueOnce({}), // update intake request
        };
        return cb(client as any);
      });

      const res = await service.recordClientDecision(
        'cr-1',
        2,
        { decision: 'APPROVED', remarks: 'Approved as quoted' },
        { contactId: 'c-1', isApprover: true } as any,
      );

      expect(res.status).toBe('APPROVED');
      expect(res.decidedRevision.client_decision).toBe('APPROVED');
    });
  });

  describe('linkDeliveryTasks', () => {
    it('should throw BadRequestException if change request is not APPROVED', async () => {
      jest.spyOn(service, 'getChangeRequestById').mockResolvedValueOnce({
        id: 'cr-1',
        status: 'AWAITING_CLIENT',
      } as any);

      await expect(
        service.linkDeliveryTasks('cr-1', { taskIds: ['t-1', 't-2'] }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should link tasks when change request is APPROVED', async () => {
      jest.spyOn(service, 'getChangeRequestById').mockResolvedValueOnce({
        id: 'cr-1',
        project_id: 'proj-1',
        status: 'APPROVED',
        cr_number: 'CR-101',
      } as any);

      db.transaction = jest.fn(async (cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 't-1' }] }) // task check
            .mockResolvedValueOnce({}) // insert mapping
            .mockResolvedValueOnce({
              rowCount: 1,
              rows: [{ task_id: 't-1', task_code: 'TSK-100', task_title: 'API Endpoint' }],
            }),
        };
        return cb(client as any);
      });

      const res = await service.linkDeliveryTasks('cr-1', { taskIds: ['t-1'] }, 'user-1');
      expect(res.linkedTasks.length).toBe(1);
      expect(res.linkedTasks[0].task_code).toBe('TSK-100');
    });
  });
});
