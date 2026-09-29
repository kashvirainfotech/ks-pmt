import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { UatPackagesService } from './uat-packages.service';

describe('UatPackagesService (CLIENT-005)', () => {
  let service: UatPackagesService;
  let db: { query: jest.Mock; transaction: jest.Mock };

  beforeEach(() => {
    db = {
      query: jest.fn(),
      transaction: jest.fn(async (cb) => {
        const client = { query: jest.fn() };
        return cb(client);
      }),
    };
    service = new UatPackagesService(db as unknown as DatabaseService);
  });

  describe('createUatPackage', () => {
    it('should throw BadRequestException if both project and product are missing', async () => {
      await expect(
        service.createUatPackage(
          {
            title: 'Release Candidate 1 UAT',
            description: 'Customer test build',
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if both project and product are provided', async () => {
      await expect(
        service.createUatPackage(
          {
            projectId: 'proj-1',
            productId: 'prod-1',
            title: 'Release Candidate 1 UAT',
            description: 'Customer test build',
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if referenced project does not exist', async () => {
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] }); // project check

      await expect(
        service.createUatPackage(
          {
            projectId: 'proj-nonexistent',
            title: 'Release Candidate 1 UAT',
            description: 'Customer test build',
          },
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should successfully create UAT package and revision 1 with checklist items', async () => {
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'proj-1' }] }); // project check

      db.transaction = jest.fn(async (cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({
              rowCount: 1,
              rows: [{ id: 'pkg-1', package_code: 'UAT-1001', status: 'DRAFT', current_revision: 1 }],
            })
            .mockResolvedValueOnce({
              rowCount: 1,
              rows: [{ id: 'rev-1', package_id: 'pkg-1', revision_number: 1, status: 'DRAFT' }],
            })
            .mockResolvedValueOnce({
              rowCount: 1,
              rows: [{ id: 'item-1', item_code: 'CHK-01', title: 'Verify Login' }],
            }),
        };
        return cb(client as any);
      });

      const res = await service.createUatPackage(
        {
          projectId: 'proj-1',
          title: 'Release Candidate 1 UAT',
          description: 'Customer test build',
          checklistItems: [
            {
              itemCode: 'CHK-01',
              title: 'Verify Login',
              instructions: 'Login with OTP',
              expectedOutcome: 'Dashboard renders',
            },
          ],
        },
        'user-1',
      );

      expect(res.id).toBe('pkg-1');
      expect(res.status).toBe('DRAFT');
      expect(res.currentRevision.checklistItems.length).toBe(1);
    });
  });

  describe('submitForQaReview & reviewRevisionQa', () => {
    it('should reject QA submission if revision is not in DRAFT or CHANGES_REQUESTED', async () => {
      jest.spyOn(service, 'getUatPackageById').mockResolvedValueOnce({
        id: 'pkg-1',
        current_revision: 1,
        revisions: [{ revision_number: 1, status: 'READY_FOR_CLIENT' }],
      } as any);

      await expect(service.submitForQaReview('pkg-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should advance package to INTERNAL_QA', async () => {
      jest.spyOn(service, 'getUatPackageById').mockResolvedValueOnce({
        id: 'pkg-1',
        current_revision: 1,
        revisions: [{ revision_number: 1, status: 'DRAFT' }],
      } as any);

      db.transaction = jest.fn(async (cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({}).mockResolvedValueOnce({
            rowCount: 1,
            rows: [{ id: 'pkg-1', status: 'INTERNAL_QA' }],
          }),
        };
        return cb(client as any);
      });

      const res = await service.submitForQaReview('pkg-1', 'user-1');
      expect(res.status).toBe('INTERNAL_QA');
    });

    it('should record QA review and publish to client as READY_FOR_CLIENT', async () => {
      jest.spyOn(service, 'getUatPackageById').mockResolvedValueOnce({
        id: 'pkg-1',
        current_revision: 1,
        revisions: [{ revision_number: 1, status: 'INTERNAL_QA' }],
      } as any);

      db.transaction = jest.fn(async (cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({
            rowCount: 1,
            rows: [{ id: 'rev-1', revision_number: 1, status: 'READY_FOR_CLIENT' }],
          }),
        };
        return cb(client as any);
      });

      const res = await service.reviewRevisionQa(
        'pkg-1',
        1,
        { status: 'READY_FOR_CLIENT', qaNotes: 'All test cases executed and passed' },
        'qa-1',
      );

      expect(res.status).toBe('READY_FOR_CLIENT');
    });
  });

  describe('material revisions (N+1 fresh sign-off)', () => {
    it('should create revision N+1, supersede prior revision, and reset client status', async () => {
      jest.spyOn(service, 'getUatPackageById').mockResolvedValueOnce({
        id: 'pkg-1',
        current_revision: 1,
        revisions: [
          {
            revision_number: 1,
            status: 'CHANGES_REQUESTED',
            checklistItems: [
              {
                item_code: 'CHK-01',
                title: 'Export to Excel',
                instructions: 'Click export',
                expected_outcome: 'File downloads',
                developer_done: true,
                qa_verified: true,
                client_status: 'FAILED',
              },
            ],
          },
        ],
      } as any);

      db.transaction = jest.fn(async (cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({}) // supersede
            .mockResolvedValueOnce({
              rowCount: 1,
              rows: [{ id: 'rev-2', revision_number: 2, status: 'INTERNAL_QA' }],
            })
            .mockResolvedValueOnce({
              rowCount: 1,
              rows: [{ id: 'item-2', item_code: 'CHK-01', client_status: 'PENDING' }],
            })
            .mockResolvedValueOnce({
              rowCount: 1,
              rows: [{ id: 'pkg-1', current_revision: 2, status: 'INTERNAL_QA' }],
            }),
        };
        return cb(client as any);
      });

      const res = await service.createMaterialRevision(
        'pkg-1',
        {
          revisionNotes: 'Fixed Excel export memory leak',
          submitForInternalQa: true,
        },
        'pm-1',
      );

      expect(res.current_revision).toBe(2);
      expect(res.newRevision.revision_number).toBe(2);
      expect(res.newRevision.checklistItems[0].client_status).toBe('PENDING');
    });
  });

  describe('tri-state checklist item progress', () => {
    it('should update developer done and QA verified status', async () => {
      db.query
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: 'item-1', developer_done: false }],
        })
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: 'item-1', developer_done: true, qa_verified: true }],
        });

      const res = await service.updateChecklistItem(
        'item-1',
        { developerDone: true, qaVerified: true, qaEvidenceNotes: 'Tested in staging' },
        'qa-1',
      );

      expect(res.developer_done).toBe(true);
      expect(res.qa_verified).toBe(true);
    });

    it('should link defect task when client fails an item', async () => {
      db.query
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: 'item-1', client_status: 'PENDING' }],
        })
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: 'item-1',
              client_status: 'FAILED',
              client_feedback: 'CSV gives 500 error on 10k rows',
              linked_defect_task_id: 'task-bug-1',
            },
          ],
        });

      const res = await service.updateChecklistItem(
        'item-1',
        {
          clientStatus: 'FAILED',
          clientFeedback: 'CSV gives 500 error on 10k rows',
          linkedDefectTaskId: 'task-bug-1',
        },
        undefined,
        'contact-1',
      );

      expect(res.client_status).toBe('FAILED');
      expect(res.linked_defect_task_id).toBe('task-bug-1');
    });
  });

  describe('recordClientDecision', () => {
    it('should throw BadRequestException if client attempts to sign off on a superseded revision', async () => {
      jest.spyOn(service, 'getUatPackageById').mockResolvedValueOnce({
        id: 'pkg-1',
        current_revision: 2,
        revisions: [{ revision_number: 1, status: 'SUPERSEDED' }],
      } as any);

      await expect(
        service.recordClientDecision(
          'pkg-1',
          1,
          { decision: 'APPROVED', remarks: 'Approved' },
          { contactId: 'c-1', isApprover: true } as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if contact lacks UAT approval authority', async () => {
      jest.spyOn(service, 'getUatPackageById').mockResolvedValueOnce({
        id: 'pkg-1',
        project_id: 'proj-1',
        current_revision: 1,
        revisions: [{ revision_number: 1, status: 'READY_FOR_CLIENT' }],
      } as any);

      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ can_approve_uat: false }],
      });

      await expect(
        service.recordClientDecision(
          'pkg-1',
          1,
          { decision: 'APPROVED' },
          { contactId: 'c-unauth', isApprover: false } as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should record APPROVED decision and set package status to ACCEPTED', async () => {
      jest.spyOn(service, 'getUatPackageById').mockResolvedValueOnce({
        id: 'pkg-1',
        project_id: 'proj-1',
        current_revision: 1,
        revisions: [{ revision_number: 1, status: 'READY_FOR_CLIENT' }],
      } as any);

      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ can_approve_uat: true }],
      });

      db.transaction = jest.fn(async (cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({
              rowCount: 1,
              rows: [{ id: 'rev-1', revision_number: 1, client_decision: 'APPROVED', status: 'ACCEPTED' }],
            })
            .mockResolvedValueOnce({
              rowCount: 1,
              rows: [{ id: 'pkg-1', status: 'ACCEPTED' }],
            }),
        };
        return cb(client as any);
      });

      const res = await service.recordClientDecision(
        'pkg-1',
        1,
        { decision: 'APPROVED', remarks: 'Formally accepted for production deploy' },
        { contactId: 'c-1', isApprover: true } as any,
      );

      expect(res.status).toBe('ACCEPTED');
      expect(res.decidedRevision.client_decision).toBe('APPROVED');
    });
  });

  describe('recordInstalledVersion (SRS §3.24)', () => {
    it('should record client installed version manually without automatic assumption', async () => {
      db.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'client-1' }] }) // client check
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'ver-1' }] }); // version check

      db.transaction = jest.fn(async (cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({}) // reset current active
            .mockResolvedValueOnce({
              rowCount: 1,
              rows: [
                {
                  id: 'inst-1',
                  client_id: 'client-1',
                  version_id: 'ver-1',
                  environment_name: 'PRODUCTION',
                  is_current_active: true,
                },
              ],
            }),
        };
        return cb(client as any);
      });

      const res = await service.recordInstalledVersion(
        {
          clientId: 'client-1',
          versionId: 'ver-1',
          environmentName: 'PRODUCTION',
          notes: 'Deployed by release engineer',
        },
        'user-1',
      );

      expect(res.id).toBe('inst-1');
      expect(res.environment_name).toBe('PRODUCTION');
      expect(res.is_current_active).toBe(true);
    });
  });
});
