import { TasksService } from './tasks.service';
import { DatabaseService } from '../../database/database.service';
import { TaskWorkflowsService } from '../task-workflows/task-workflows.service';
import { AssignmentService } from '../assignment/assignment.service';

describe('TasksService - Bulk Updates & Partial Failures (PLAN-003)', () => {
  let service: TasksService;
  let mockDb: any;
  let mockWorkflows: any;
  let mockAssignment: any;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(async (sql: string, values: any[] = []) => {
        if (sql.includes('FROM tasks t') && values[0] === 'task-1') {
          return {
            rows: [
              {
                id: 'task-1',
                task_code: 'TSK-001',
                title: 'Task One',
                revision: 3,
                status_id: 'st-todo',
                task_type_id: 'tt-story',
                type_name: 'Story',
                branch_id: 'b-1',
              },
            ],
          };
        }
        if (sql.includes('FROM tasks t') && values[0] === 'task-2') {
          return {
            rows: [
              {
                id: 'task-2',
                task_code: 'TSK-002',
                title: 'Task Two',
                revision: 5, // actual revision is 5!
                status_id: 'st-todo',
                task_type_id: 'tt-story',
                type_name: 'Story',
                branch_id: 'b-1',
              },
            ],
          };
        }
        if (sql.includes('FROM tasks t') && values[0] === 'task-3') {
          return {
            rows: [
              {
                id: 'task-3',
                task_code: 'TSK-003',
                title: 'Task Three',
                revision: 1,
                status_id: 'st-done',
                task_type_id: 'tt-task',
                type_name: 'Task',
              },
            ],
          };
        }
        if (sql.includes('UPDATE tasks')) {
          return { rows: [{ id: values[0], revision: 4 }] };
        }
        return { rows: [] };
      }),
      transaction: jest.fn((callback) => callback(mockDb)),
    };

    mockWorkflows = {
      getAllowedNextStatuses: jest.fn(),
      findOneStatus: jest.fn(),
    };

    mockAssignment = {
      evaluateAutoAssignment: jest.fn(),
    };

    service = new TasksService(
      mockDb as unknown as DatabaseService,
      mockWorkflows as unknown as TaskWorkflowsService,
      mockAssignment as unknown as AssignmentService,
    );
  });

  describe('bulkUpdateTasks', () => {
    it('should report revision conflict as partial failure without failing other tasks', async () => {
      // Task 1 has revision 3 (matches expectedRevision: 3)
      // Task 2 has revision 5 (mismatches expectedRevision: 4)
      const response = await service.bulkUpdateTasks(
        {
          items: [
            { id: 'task-1', expectedRevision: 3, priority: 'HIGH' },
            { id: 'task-2', expectedRevision: 4, priority: 'HIGH' }, // will conflict!
          ],
        },
        'user-admin',
      );

      expect(response.total).toBe(2);
      expect(response.succeededCount).toBe(1);
      expect(response.failedCount).toBe(1);

      expect(response.succeeded[0].id).toBe('task-1');
      expect(response.failed[0].id).toBe('task-2');
      expect(response.failed[0].code).toBe('REVISION_CONFLICT');
      expect(response.failed[0].reason).toContain('Revision conflict');
    });

    it('should reject invalid workflow transition as partial failure', async () => {
      mockWorkflows.getAllowedNextStatuses.mockResolvedValueOnce([
        { id: 'st-archived', status_name: 'Archived' },
      ]);

      const response = await service.bulkUpdateTasks(
        {
          items: [
            {
              id: 'task-3',
              expectedRevision: 1,
              statusId: 'st-in-progress', // not in allowed statuses!
            },
          ],
        },
        'user-admin',
      );

      expect(response.total).toBe(1);
      expect(response.succeededCount).toBe(0);
      expect(response.failedCount).toBe(1);
      expect(response.failed[0].code).toBe('INVALID_TRANSITION');
    });
  });

  describe('exportTasks', () => {
    it('should coordinate query and return formatted CSV with proper headers', async () => {
      mockDb.query = jest.fn().mockResolvedValueOnce({
        rows: [
          {
            task_code: 'TSK-100',
            title: 'Implement Authentication',
            hierarchy_level: 'TASK',
            type_name: 'Feature',
            status_name: 'In Progress',
            priority: 'HIGH',
            severity: 'MAJOR',
            project_name: 'KS PMT',
            product_name: 'PMT Suite',
            sprint_name: 'Sprint 1',
            milestone_name: 'MVP Release',
            estimated_hours: 16.0,
            story_points: 5,
            t_shirt_size: 'M',
            planned_end_date: '2026-10-15',
            is_blocked: false,
            resolution: null,
            assignees_text: 'Alice Dev; Bob Lead',
            created_at: '2026-09-29T10:00:00Z',
          },
        ],
      });

      const res = await service.exportTasks({ projectId: 'proj-1' }, 'csv');

      expect(res.totalRecords).toBe(1);
      expect(res.filename).toContain('tasks_export_');
      expect(res.csv).toContain('Task Code,Title,Hierarchy');
      expect(res.csv).toContain('TSK-100,Implement Authentication,TASK');
      expect(res.csv).toContain('Alice Dev; Bob Lead');
    });
  });
});
