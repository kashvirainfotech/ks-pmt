import React from 'react';
import { Task, TaskWorkflowStatus } from '../../types';
import { TaskCard } from './TaskCard';
import { tasksApi } from '../../api/endpoints';
import { Plus } from 'lucide-react';

interface KanbanBoardProps {
  tasks: Task[];
  statuses: TaskWorkflowStatus[];
  onOpenDetail: (task: Task) => void;
  onMoved?: () => void;
  onQuickCreate?: (statusId: string) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  statuses,
  onOpenDetail,
  onQuickCreate,
  onMoved,
}) => {
  return (
    <div className="flex h-full w-full gap-4 overflow-x-auto pb-4 pt-1">
      {statuses.map((status) => {
        const columnTasks = tasks.filter((t) => t.status_id === status.id);

        return (
          <div
            key={status.id}
            onDragOver={(event) => event.preventDefault()}
            onDrop={async (event) => {
              event.preventDefault();
              const id = event.dataTransfer.getData('text/task-id');
              if (!id) return;
              try {
                await tasksApi.updateStatus(id, status.id);
                onMoved?.();
              } catch (e: any) {
                alert(e.response?.data?.message || 'Transition not permitted');
              }
            }}
            className="flex w-72 sm:w-80 shrink-0 flex-col rounded-2xl border border-slate-200/80 bg-slate-100/60 p-3 dark:border-slate-800 dark:bg-slate-900/50"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 px-1">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-slate-900"
                  style={{ backgroundColor: status.color_code || '#3b82f6' }}
                />
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {status.status_name}
                </h3>
                <span className="rounded-full bg-slate-200 px-2 py-0.2 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {columnTasks.length}
                </span>
              </div>

              {onQuickCreate && status.is_initial && (
                <button
                  onClick={() => onQuickCreate(status.id)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  title="Add task in this column"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Tasks Container */}
            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {columnTasks.length === 0 ? (
                <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400 dark:border-slate-800">
                  No tasks
                </div>
              ) : (
                columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onOpenDetail={onOpenDetail}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
