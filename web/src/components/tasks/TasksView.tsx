import { allRows, Row } from '../management/EntityManager';
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { tasksApi, mastersApi } from '../../api/endpoints';
import { Task, TaskWorkflowStatus, TaskType } from '../../types';
import { KanbanBoard } from './KanbanBoard';
import { TaskDrawer } from './TaskDrawer';
import { CreateTaskModal } from './CreateTaskModal';
import {
  Kanban,
  List,
  Plus,
  Filter,
  Search,
  Clock,
  CheckCircle2,
  DollarSign,
} from 'lucide-react';

export const TasksView: React.FC = () => {
  const { selectedBranchId } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [statuses, setStatuses] = useState<TaskWorkflowStatus[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [facets, setFacets] = useState<Record<string, string>>({});
  const [choices, setChoices] = useState<Record<string, Row[]>>({});
  useEffect(() => {
    Promise.all(
      ['projects', 'products', 'users'].map(
        async (name) => [name, await allRows('/' + name)] as const,
      ),
    )
      .then((items) => setChoices(Object.fromEntries(items)))
      .catch(console.error);
  }, []);

  // Filters
  const [selectedTaskTypeId, setSelectedTaskTypeId] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Drawer
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalInitialStatus, setCreateModalInitialStatus] = useState<
    string | undefined
  >(undefined);

  // Fetch initial workflow statuses & task types
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [stRes, ttRes]: any = await Promise.all([
          mastersApi.getWorkflowStatuses(),
          mastersApi.getTaskTypes(),
        ]);
        setStatuses(stRes?.data || stRes || []);
        setTaskTypes(ttRes?.data || ttRes || []);
      } catch (err) {}
    };
    fetchMetadata();
  }, []);

  // Fetch Tasks with filters
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res: any = await tasksApi.getTasks({
        branchId: selectedBranchId || undefined,
        taskTypeId: selectedTaskTypeId || undefined,
        priority: selectedPriority || undefined,
        search: searchQuery || undefined,
        ...facets,
        page,
        limit: 30,
      });

      setPages(res.meta?.total_pages || res.meta?.totalPages || 1);
      const list = res?.data?.tasks || res?.tasks || res?.data || [];
      setTasks(Array.isArray(list) ? list : []);

      // If URL param taskId is present, open that task drawer
      const urlTaskId = searchParams.get('taskId');
      if (urlTaskId) {
        const found = list.find((t: any) => t.id === urlTaskId);
        if (found) {
          const detail: any = await tasksApi.getTaskById(urlTaskId);
          setSelectedTask(detail.data);
        }
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [
    selectedBranchId,
    selectedTaskTypeId,
    selectedPriority,
    searchQuery,
    facets,
    page,
  ]);

  // Open drawer for a task and sync URL
  const handleOpenDetail = async (task: Task) => {
    try {
      const detail: any = await tasksApi.getTaskById(task.id);
      setSelectedTask(detail.data);
    } catch (e: any) {
      alert(e.response?.data?.message || 'Unable to load task');
      return;
    }
    setSearchParams({ taskId: task.id });
  };

  const handleCloseDetail = () => {
    setSelectedTask(null);
    setSearchParams({});
  };

  const handleQuickCreate = (statusId: string) => {
    setCreateModalInitialStatus(statusId);
    setCreateModalOpen(true);
  };

  return (
    <div className="flex h-full flex-col space-y-4">
      {/* Top Action Bar */}
      <div className="page-intro">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Tasks
          </h1>
          <p className="text-xs text-slate-400">
            Organize priorities, share ownership and move work forward.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                viewMode === 'kanban'
                  ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <Kanban className="h-3.5 w-3.5" /> Board
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                viewMode === 'list'
                  ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <List className="h-3.5 w-3.5" /> Table
            </button>
          </div>

          <button
            onClick={() => {
              setCreateModalInitialStatus(undefined);
              setCreateModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition"
          >
            <Plus className="h-4 w-4" /> New Task
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {[
          ['projectId', 'projects', 'project_name'],
          ['productId', 'products', 'product_name'],
          ['assigneeUserId', 'users', 'first_name'],
        ].map(([key, source, label]) => (
          <select
            aria-label={source}
            key={key}
            className="form-control max-w-full text-xs"
            value={facets[key] || ''}
            onChange={(e) => {
              setPage(1);
              setFacets((prev) => {
                const next = { ...prev };
                if (e.target.value) next[key] = e.target.value;
                else delete next[key];
                return next;
              });
            }}
          >
            <option value="">All {source}</option>
            {(choices[source] || []).map((r) => (
              <option key={r.id} value={r.id}>
                {r[label]}
              </option>
            ))}
          </select>
        ))}
        <select
          aria-label="Status filter"
          className="form-control max-w-full text-xs"
          value={facets.statusId || ''}
          onChange={(e) => {
            setPage(1);
            setFacets((prev) => {
              const next = { ...prev };
              if (e.target.value) next.statusId = e.target.value;
              else delete next.statusId;
              return next;
            });
          }}
        >
          <option value="">All statuses</option>
          {statuses.map((s) => (
            <option key={s.id} value={s.id}>
              {s.status_name}
            </option>
          ))}
        </select>
      </div>
      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter tasks by code or title..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        {/* Task Type Filter */}
        <select
          value={selectedTaskTypeId}
          onChange={(e) => setSelectedTaskTypeId(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          <option value="">All Task Types</option>
          {taskTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.type_name}
            </option>
          ))}
        </select>

        {/* Priority Filter */}
        <select
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          <option value="">All Priorities</option>
          <option value="CRITICAL">Critical</option>
          <option value="URGENT">Urgent</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      {/* Main Board or List Content */}
      <div className="flex-1 min-h-[500px]">
        {loading ? (
          <div className="flex h-64 items-center justify-center text-xs text-slate-400">
            Loading tasks...
          </div>
        ) : viewMode === 'kanban' ? (
          <KanbanBoard
            onMoved={fetchTasks}
            tasks={tasks}
            statuses={statuses}
            onOpenDetail={handleOpenDetail}
            onQuickCreate={handleQuickCreate}
          />
        ) : (
          /* Table / List View */
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/70 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Task Title</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Effort</th>
                  <th className="px-4 py-3">Chargeable</th>
                  <th className="px-4 py-3">Assignees</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No tasks found
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => (
                    <tr
                      key={task.id}
                      onClick={() => handleOpenDetail(task)}
                      className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {task.task_code}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                        {task.title}
                        {task.project_name && (
                          <span className="block text-[10px] text-slate-400">
                            📁 {task.project_name}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="rounded px-2 py-0.5 text-[10px] font-semibold"
                          style={{
                            backgroundColor: `${task.task_type_color || '#3b82f6'}20`,
                            color: task.task_type_color || '#3b82f6',
                          }}
                        >
                          {task.task_type_name || 'Task'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="rounded-lg px-2 py-0.5 text-[10px] font-semibold"
                          style={{
                            backgroundColor: `${task.status_color || '#3b82f6'}20`,
                            color: task.status_color || '#3b82f6',
                          }}
                        >
                          {task.status_name}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-[10px]">
                        {task.priority}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                        {task.spent_hours || 0}/{task.estimated_hours || 0}h
                      </td>
                      <td className="px-4 py-3">
                        {task.is_chargeable ? (
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            ₹
                            {parseFloat(
                              (task.charge_amount as any) || 0,
                            ).toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-slate-400">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex -space-x-1">
                          {task.assignees && task.assignees.length > 0 ? (
                            task.assignees.map((a) => (
                              <div
                                key={a.id || a.user_id}
                                title={`${a.first_name} ${a.last_name}`}
                                className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white ring-1 ring-white"
                              >
                                {a.first_name ? a.first_name[0] : 'U'}
                              </div>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              —
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex gap-4 text-sm">
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>
        <span>
          Page {page} of {pages}
        </span>
        <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
          Next
        </button>
      </div>
      {/* Task Detail Drawer */}
      {selectedTask && (
        <TaskDrawer
          key={selectedTask?.id}
          task={selectedTask}
          onClose={handleCloseDetail}
          onTaskUpdated={() => {
            fetchTasks();
            // Refresh currently selected task detail
            tasksApi.getTaskById(selectedTask.id).then((res: any) => {
              setSelectedTask(res?.data || res);
            });
          }}
        />
      )}

      {/* Create Task Modal */}
      {createModalOpen && (
        <CreateTaskModal
          initialStatusId={createModalInitialStatus}
          onClose={() => setCreateModalOpen(false)}
          onCreated={fetchTasks}
        />
      )}
    </div>
  );
};
