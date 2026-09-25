import React from 'react';
import { Task, TaskWorkflowStatus } from '../../types';
import {
  CheckSquare,
  Clock,
  AlertCircle,
  Paperclip,
  DollarSign,
  ChevronRight,
} from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onOpenDetail: (task: Task) => void;
  allowedStatuses?: TaskWorkflowStatus[];
  onQuickStatusChange?: (taskId: string, statusId: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onOpenDetail,
  allowedStatuses = [],
  onQuickStatusChange,
}) => {
  const priorityColor =
    {
      URGENT:
        'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border-rose-200',
      HIGH: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200',
      MEDIUM:
        'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border-blue-200',
      LOW: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200',
    }[task.priority] || 'bg-slate-100 text-slate-700';

  return (
    <div
      draggable
      onDragStart={(event) =>
        event.dataTransfer.setData('text/task-id', task.id)
      }
      onClick={() => onOpenDetail(task)}
      className="group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition hover:border-blue-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500 cursor-pointer"
    >
      <div>
        {/* Top Badges: Task Code, Type & Priority */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400">
              {task.task_code}
            </span>
            {task.task_type_name && (
              <span
                className="rounded px-1.5 py-0.2 text-[9px] font-semibold"
                style={{
                  backgroundColor: `${task.task_type_color || '#3b82f6'}20`,
                  color: task.task_type_color || '#3b82f6',
                }}
              >
                {task.task_type_name}
              </span>
            )}
          </div>

          <span
            className={`rounded-md border px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider ${priorityColor}`}
          >
            {task.priority}
          </span>
        </div>

        {/* Title */}
        <h4 className="mt-2 text-xs font-semibold text-slate-900 group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400 line-clamp-2 transition">
          {task.title}
        </h4>

        {/* Project or Product Name */}
        {(task.project_name || task.product_name) && (
          <p className="mt-1 text-[11px] text-slate-400 truncate">
            {task.project_name
              ? `📁 ${task.project_name}`
              : `📦 ${task.product_name}`}
          </p>
        )}
      </div>

      {/* Footer Info: Subtasks, Spent/Est Hours, Financial pill, Assignee avatars */}
      <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          {task.subtasks_count !== undefined && task.subtasks_count > 0 && (
            <span className="flex items-center gap-0.5">
              <CheckSquare className="h-3 w-3" />
              {task.completed_subtasks_count || 0}/{task.subtasks_count}
            </span>
          )}

          {task.estimated_hours !== undefined && (
            <span className="flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              {task.spent_hours || 0}/{task.estimated_hours}h
            </span>
          )}

          {task.is_chargeable && task.charge_amount && (
            <span className="flex items-center text-emerald-600 font-semibold dark:text-emerald-400">
              <DollarSign className="h-3 w-3" />₹
              {parseFloat(task.charge_amount as any).toLocaleString('en-IN')}
            </span>
          )}
        </div>

        {/* Assignees Avatars */}
        <div className="flex -space-x-1.5 overflow-hidden">
          {task.assignees && task.assignees.length > 0 ? (
            task.assignees.slice(0, 3).map((a) => (
              <div
                key={a.id || a.user_id}
                title={`${a.first_name} ${a.last_name}`}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 font-bold text-[9px] text-white ring-1.5 ring-white dark:ring-slate-900"
              >
                {a.first_name ? a.first_name[0] : 'U'}
              </div>
            ))
          ) : (
            <span className="text-[10px] text-slate-400 italic">
              Unassigned
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
