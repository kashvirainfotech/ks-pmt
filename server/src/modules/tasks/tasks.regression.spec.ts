import { TasksService } from './tasks.service';
import { BadRequestException } from '@nestjs/common';

describe('Task workflow regressions', () => {
  const db = { query: jest.fn(), transaction: jest.fn() };
  const workflows = {
    getAllowedNextStatuses: jest.fn(),
    findOneStatus: jest.fn(),
  };
  const assignment = { evaluateAutoAssignment: jest.fn() };
  let service: TasksService;
  beforeEach(() => {
    jest.resetAllMocks();
    service = new TasksService(db as any, workflows as any, assignment as any);
  });
  it('rejects status changes when no transitions are configured', async () => {
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValue({ task_type_id: 'type', status_id: 'old' } as any);
    workflows.getAllowedNextStatuses.mockResolvedValue([]);
    await expect(
      service.changeStatus('task', { toStatusId: 'new' }, 'actor'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.query).not.toHaveBeenCalled();
  });
  it('does not allow the subtask checkbox to skip workflow stages', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue({
      parent_task_id: 'parent',
      task_type_id: 'type',
      status_id: 'old',
    } as any);
    workflows.getAllowedNextStatuses.mockResolvedValue([
      { id: 'wip', status_category: 'IN_PROGRESS' },
    ]);
    await expect(service.toggleSubtask('child', true, 'actor')).rejects.toThrow(
      'No permitted',
    );
    expect(db.query).not.toHaveBeenCalled();
  });
  it('rejects a primary assignee absent from the assignment list', async () => {
    await expect(
      service.create(
        {
          title: 'Test',
          taskTypeId: 'type',
          assigneeIds: ['a'],
          primaryAssigneeId: 'b',
        },
        'actor',
      ),
    ).rejects.toThrow('Primary assignee');
    expect(db.transaction).not.toHaveBeenCalled();
  });
});
