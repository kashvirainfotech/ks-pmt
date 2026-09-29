import { TaskWorkflowsService } from './task-workflows.service';
import { DatabaseService } from '../../database/database.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WorkflowScope } from './dto/workflow-scheme.dto';

describe('TaskWorkflowsService (CONFIG-001)', () => {
  let service: TaskWorkflowsService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
      transaction: jest.fn((cb) => cb(mockDb)),
    };
    service = new TaskWorkflowsService(mockDb as unknown as DatabaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Workflow Schemes CRUD', () => {
    it('should reject scheme creation if scope is PROJECT but projectId is omitted', async () => {
      await expect(
        service.createScheme(
          {
            schemeCode: 'WF-PROJ-INVALID',
            schemeName: 'Invalid Project Scheme',
            scope: WorkflowScope.PROJECT,
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject scheme creation if scheme code already exists', async () => {
      mockDb.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'existing-scheme' }],
      });

      await expect(
        service.createScheme(
          {
            schemeCode: 'WF-DUPLICATE',
            schemeName: 'Duplicate Scheme',
            scope: WorkflowScope.GLOBAL,
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create scheme in DRAFT status when valid', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // duplicate check: none
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: 'new-scheme-1',
              scheme_code: 'WF-GLOBAL-STD',
              scheme_name: 'Global Standard Workflow',
              scope: 'GLOBAL',
              status: 'DRAFT',
              version: 1,
            },
          ],
        });

      const res = await service.createScheme(
        {
          schemeCode: 'WF-GLOBAL-STD',
          schemeName: 'Global Standard Workflow',
          scope: WorkflowScope.GLOBAL,
        },
        'user-1',
      );

      expect(res.id).toBe('new-scheme-1');
      expect(res.status).toBe('DRAFT');
    });
  });

  describe('Workflow Draft Graph Soundness Validation', () => {
    it('should flag errors when a draft has dead-end non-terminal statuses', async () => {
      // Mock getSchemeById
      jest.spyOn(service, 'getSchemeById').mockResolvedValueOnce({
        id: 'scheme-1',
        transitions: [
          {
            from_status_id: 'status-todo',
            from_status_name: 'To Do',
            from_status_category: 'TODO',
            to_status_id: 'status-wip',
            to_status_name: 'WIP',
            to_status_category: 'IN_PROGRESS',
            to_status_is_terminal: false, // Dead end! No outgoing transition and not terminal!
          },
        ],
      } as any);

      const validation = await service.validateWorkflowDraft('scheme-1');
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('dead-end'))).toBe(true);
    });

    it('should pass validation when graph has initial TODO state and terminal Closed state', async () => {
      jest.spyOn(service, 'getSchemeById').mockResolvedValueOnce({
        id: 'scheme-1',
        transitions: [
          {
            from_status_id: 'status-todo',
            from_status_name: 'To Do',
            from_status_category: 'TODO',
            to_status_id: 'status-wip',
            to_status_name: 'WIP',
            to_status_category: 'IN_PROGRESS',
            to_status_is_terminal: false,
          },
          {
            from_status_id: 'status-wip',
            from_status_name: 'WIP',
            from_status_category: 'IN_PROGRESS',
            to_status_id: 'status-done',
            to_status_name: 'Done',
            to_status_category: 'DONE',
            to_status_is_terminal: true,
          },
        ],
      } as any);

      const validation = await service.validateWorkflowDraft('scheme-1');
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.totalTransitions).toBe(2);
    });
  });

  describe('Publish Workflow Scheme with Active Task Remapping (Acceptance Rule)', () => {
    it('should reject publishing if active tasks exist in deprecated status and no remapping is provided', async () => {
      jest.spyOn(service, 'getSchemeById').mockResolvedValue({
        id: 'scheme-proj-1',
        scope: 'PROJECT',
        project_id: 'proj-1',
        transitions: [
          {
            from_status_id: 'status-todo',
            from_status_name: 'To Do',
            from_status_category: 'TODO',
            to_status_id: 'status-done',
            to_status_name: 'Done',
            to_status_category: 'DONE',
            to_status_is_terminal: true,
          },
        ],
      } as any);

      jest.spyOn(service, 'validateWorkflowDraft').mockResolvedValueOnce({
        isValid: true,
        errors: [],
        warnings: [],
        totalTransitions: 1,
        statusCount: 2,
      } as any);

      // Mock finding active tasks in project in 'status-qa' which is NOT in new scheme
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            status_id: 'status-qa',
            status_name: 'Under QA Testing',
            task_count: 5,
          },
        ],
      });

      await expect(
        service.publishWorkflowScheme('scheme-proj-1', {}, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should remap active tasks and successfully publish when valid remapping is provided', async () => {
      jest.spyOn(service, 'getSchemeById').mockResolvedValue({
        id: 'scheme-proj-1',
        scope: 'PROJECT',
        project_id: 'proj-1',
        transitions: [
          {
            from_status_id: 'status-todo',
            from_status_name: 'To Do',
            from_status_category: 'TODO',
            to_status_id: 'status-done',
            to_status_name: 'Done',
            to_status_category: 'DONE',
            to_status_is_terminal: true,
          },
        ],
      } as any);

      jest.spyOn(service, 'validateWorkflowDraft').mockResolvedValueOnce({
        isValid: true,
        errors: [],
        warnings: [],
        totalTransitions: 1,
        statusCount: 2,
      } as any);

      // Active tasks found in deprecated status-qa
      mockDb.query
        .mockResolvedValueOnce({
          rows: [
            {
              status_id: 'status-qa',
              status_name: 'Under QA Testing',
              task_count: 3,
            },
          ],
        }) // query deprecated tasks
        .mockResolvedValueOnce({ rowCount: 3 }) // UPDATE tasks SET status_id = status-done (remapped!)
        .mockResolvedValueOnce({ rowCount: 0 }) // archive prior published schemes
        .mockResolvedValueOnce({
          rows: [{ id: 'scheme-proj-1', status: 'PUBLISHED' }],
        }); // publish

      const res = await service.publishWorkflowScheme(
        'scheme-proj-1',
        {
          activeTaskRemapping: {
            'status-qa': 'status-done',
          },
        },
        'user-1',
      );

      expect(res.status).toBe('PUBLISHED');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE tasks'),
        expect.arrayContaining(['status-done', 'user-1', 'proj-1', 'status-qa']),
      );
    });
  });

  describe('Project-Specific Overrides vs Global Resolution', () => {
    it('should return project override transitions when published project scheme exists', async () => {
      // Mock getEffectiveWorkflow returning project override
      jest.spyOn(service, 'getEffectiveWorkflow').mockResolvedValueOnce({
        scheme: {
          id: 'proj-scheme-1',
          scheme_name: 'Project Alpha Custom Flow',
          transitions: [
            {
              from_status_id: 'status-open',
              to_status_id: 'status-peer-review',
              to_status_name: 'Peer Review',
              to_status_category: 'REVIEW',
              allowed_roles: ['ROLE_DEVELOPER'],
              required_fields: ['description'],
            },
          ],
        },
        effectiveSource: 'PROJECT_OVERRIDE',
      } as any);

      const next = await service.getAllowedNextStatuses(
        'tt-dev',
        'status-open',
        'proj-alpha',
      );

      expect(next).toHaveLength(1);
      expect(next[0].id).toBe('status-peer-review');
      expect(next[0].effectiveSource).toBe('PROJECT_OVERRIDE');
      expect(next[0].gateRules.requiredFields).toContain('description');
    });
  });

  describe('validateTransition Gate Enforcement', () => {
    it('should reject transition when required field is missing', async () => {
      jest.spyOn(service, 'getAllowedNextStatuses').mockResolvedValueOnce([
        {
          id: 'status-qa',
          status_name: 'Ready for QA',
          gateRules: {
            allowedRoles: [],
            requiredFields: ['staging_url', 'acceptance_criteria'],
          },
        },
      ] as any);

      const task = {
        id: 'task-1',
        status_id: 'status-wip',
        task_type_id: 'tt-1',
        custom_field_values: { staging_url: 'https://staging.test' },
        // missing acceptance_criteria
      };

      await expect(
        service.validateTransition(
          task,
          'status-qa',
          { id: 'user-1', role_code: 'ROLE_DEVELOPER' },
          {},
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject transition when user role is not authorized', async () => {
      jest.spyOn(service, 'getAllowedNextStatuses').mockResolvedValueOnce([
        {
          id: 'status-verified',
          status_name: 'QA Verified',
          gateRules: {
            allowedRoles: ['ROLE_QA_ENGINEER', 'ROLE_ADMIN'],
            requiredFields: [],
          },
        },
      ] as any);

      const task = {
        id: 'task-1',
        status_id: 'status-testing',
        task_type_id: 'tt-1',
      };

      await expect(
        service.validateTransition(
          task,
          'status-verified',
          { id: 'user-dev', role_code: 'ROLE_DEVELOPER' }, // Developer trying to sign off QA
          {},
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow Super Admin to bypass role restrictions', async () => {
      jest.spyOn(service, 'getAllowedNextStatuses').mockResolvedValueOnce([
        {
          id: 'status-verified',
          status_name: 'QA Verified',
          gateRules: {
            allowedRoles: ['ROLE_QA_ENGINEER'],
            requiredFields: [],
          },
        },
      ] as any);

      const task = {
        id: 'task-1',
        status_id: 'status-testing',
        task_type_id: 'tt-1',
      };

      const result = await service.validateTransition(
        task,
        'status-verified',
        { id: 'admin-1', role_code: 'ROLE_SUPER_ADMIN' },
        {},
      );

      expect(result.isValid).toBe(true);
    });

    it('should reject transition if release association is required but versionId is null', async () => {
      jest.spyOn(service, 'getAllowedNextStatuses').mockResolvedValueOnce([
        {
          id: 'status-release-ready',
          status_name: 'Ready for Release',
          gateRules: {
            requiresReleaseAssociation: true,
          },
        },
      ] as any);

      const task = {
        id: 'task-1',
        status_id: 'status-verified',
        task_type_id: 'tt-1',
        version_id: null,
      };

      await expect(
        service.validateTransition(
          task,
          'status-release-ready',
          { id: 'user-1', role_code: 'ROLE_ADMIN' },
          {},
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
