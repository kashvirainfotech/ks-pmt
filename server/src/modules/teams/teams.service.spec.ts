import { TeamsService } from './teams.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('TeamsService (PLAN-004)', () => {
  let service: TeamsService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
      transaction: jest.fn((callback) => callback(mockDb)),
    };
    service = new TeamsService(mockDb);
  });

  describe('Delivery Teams Management', () => {
    it('creates a new delivery team and links projects and products', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // duplicate check: none
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'team-1',
              team_code: 'TEAM-BACKEND',
              team_name: 'Core Backend Team',
              lead_user_id: 'user-lead-1',
            },
          ],
        }) // insert team
        .mockResolvedValueOnce({ rows: [] }) // insert team_projects
        .mockResolvedValueOnce({ rows: [] }); // insert team_members for lead

      const result = await service.createTeam(
        {
          teamCode: 'TEAM-BACKEND',
          teamName: 'Core Backend Team',
          leadUserId: 'user-lead-1',
          projectIds: ['proj-1'],
        },
        'admin-user',
      );

      expect(result.id).toBe('team-1');
      expect(result.team_code).toBe('TEAM-BACKEND');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO teams'),
        expect.any(Array),
      );
    });

    it('rejects duplicate team code', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [{ id: 'existing-id' }] });

      await expect(
        service.createTeam(
          { teamCode: 'TEAM-BACKEND', teamName: 'Backend 2' },
          'admin-user',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('adds effective-dated team member', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 'team-1' }] }) // get team
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'tm-1',
              team_id: 'team-1',
              user_id: 'user-2',
              role_in_team: 'DEVELOPER',
              allocation_percentage: '100.00',
              is_active: true,
            },
          ],
        });

      const member = await service.addMember(
        'team-1',
        {
          userId: 'user-2',
          roleInTeam: 'DEVELOPER',
          allocationPercentage: 100,
        },
        'admin-user',
      );

      expect(member.user_id).toBe('user-2');
      expect(member.role_in_team).toBe('DEVELOPER');
    });

    it('removes member by setting left_date and is_active = false', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const res = await service.removeMember('team-1', 'user-2', 'admin-user');
      expect(res.success).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE team_members'),
        expect.arrayContaining(['admin-user', 'team-1', 'user-2']),
      );
    });
  });

  describe('Software Components Catalog', () => {
    it('creates software component with entityType validation', async () => {
      // PRODUCT missing productId
      await expect(
        service.createComponent(
          {
            componentCode: 'CMP-AUTH',
            componentName: 'Auth Service',
            entityType: 'PRODUCT',
          },
          'admin-user',
        ),
      ).rejects.toThrow(BadRequestException);

      // Valid project component
      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // code uniqueness check
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'comp-1',
              component_code: 'CMP-AUTH',
              component_name: 'Auth Service',
              criticality: 'TIER_1_CRITICAL',
            },
          ],
        });

      const comp = await service.createComponent(
        {
          componentCode: 'CMP-AUTH',
          componentName: 'Auth Service',
          entityType: 'PROJECT',
          projectId: 'proj-1',
          criticality: 'TIER_1_CRITICAL',
        },
        'admin-user',
      );

      expect(comp.id).toBe('comp-1');
      expect(comp.criticality).toBe('TIER_1_CRITICAL');
    });

    it('rejects self-dependency in architecture dependencies', async () => {
      await expect(
        service.addComponentDependency(
          'comp-1',
          { dependsOnComponentId: 'comp-1', dependencyType: 'CONSUMES_API' },
          'admin-user',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows reciprocal architecture dependencies (A calls B, B calls A)', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 'comp-A' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'comp-B' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'dep-1',
              component_id: 'comp-A',
              depends_on_component_id: 'comp-B',
              dependency_type: 'EVENT_PUBSUB',
            },
          ],
        });

      const dep = await service.addComponentDependency(
        'comp-A',
        { dependsOnComponentId: 'comp-B', dependencyType: 'EVENT_PUBSUB' },
        'admin-user',
      );

      expect(dep.dependency_type).toBe('EVENT_PUBSUB');
    });
  });

  describe('Component Drill-Down Dashboard (Authorized Scope)', () => {
    it('strictly denies unauthorized user when not in project membership', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'comp-1',
              project_id: 'proj-private-client-1',
              component_name: 'Billing API',
            },
          ],
        }) // getComponentById
        .mockResolvedValueOnce({ rows: [] }) // outbound
        .mockResolvedValueOnce({ rows: [] }) // inbound
        .mockResolvedValueOnce({ rows: [] }); // project_members check: not a member

      await expect(
        service.getComponentDashboard('comp-1', {
          id: 'user-unauthorized',
          role_code: 'ROLE_DEVELOPER',
          permissions: [],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('correctly aggregates active work, defects, and technical debt for authorized user', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'comp-1',
              project_id: 'proj-1',
              component_name: 'Core API',
              criticality: 'TIER_1_CRITICAL',
            },
          ],
        }) // getComponentById
        .mockResolvedValueOnce({ rows: [] }) // outbound
        .mockResolvedValueOnce({ rows: [] }) // inbound
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'task-1',
              task_code: 'TSK-101',
              title: 'Build auth endpoints',
              type_code: 'STORY',
              stage_category: 'IN_PROGRESS',
              priority: 'HIGH',
            },
            {
              id: 'task-2',
              task_code: 'TSK-102',
              title: 'Fix token expiry bug',
              type_code: 'BUG',
              stage_category: 'IN_PROGRESS',
              priority: 'CRITICAL',
              severity: 'CRITICAL',
            },
            {
              id: 'task-3',
              task_code: 'TSK-103',
              title: 'Refactor legacy database query (tech debt)',
              type_code: 'TECH_DEBT',
              stage_category: 'OPEN',
              priority: 'MEDIUM',
            },
            {
              id: 'task-4',
              task_code: 'TSK-104',
              title: 'Old completed task',
              type_code: 'TASK',
              stage_category: 'DONE',
              priority: 'LOW',
            },
          ],
        }); // tasks linked to component

      const result = await service.getComponentDashboard('comp-1', {
        id: 'super-admin-id',
        role_code: 'ROLE_SUPER_ADMIN',
      });

      expect(result.summary.totalTasksCount).toBe(4);
      expect(result.summary.activeTasksCount).toBe(3); // excludes DONE
      expect(result.summary.defectsCount).toBe(1); // task-2
      expect(result.summary.techDebtCount).toBe(1); // task-3
      expect(result.summary.criticalIssuesCount).toBe(2); // task-1 (HIGH) & task-2 (CRITICAL)
      expect(result.activeTasks).toHaveLength(3);
      expect(result.defects).toHaveLength(1);
      expect(result.techDebt).toHaveLength(1);
    });
  });

  describe('Task-to-Component Mapping', () => {
    it('links multiple components to a task and designates primary component', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 'task-1' }] }) // task check
        .mockResolvedValueOnce({ rows: [] }) // delete existing
        .mockResolvedValueOnce({ rows: [] }) // insert comp-1 (primary)
        .mockResolvedValueOnce({ rows: [] }) // insert comp-2
        .mockResolvedValueOnce({
          rows: [
            { task_id: 'task-1', component_id: 'comp-1', is_primary: true },
            { task_id: 'task-1', component_id: 'comp-2', is_primary: false },
          ],
        });

      const result = await service.linkTaskComponents(
        'task-1',
        {
          componentIds: ['comp-1', 'comp-2'],
          primaryComponentId: 'comp-1',
        },
        'user-1',
      );

      expect(result).toHaveLength(2);
      expect(result[0].is_primary).toBe(true);
      expect(result[1].is_primary).toBe(false);
    });
  });
});
