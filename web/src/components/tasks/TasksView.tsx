import { allRows, Row } from "../management/EntityManager";
import { useListing } from "../../hooks/useListing";
import { DataGrid } from "../common/DataGrid";
import { Eye, Pencil } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { tasksApi, mastersApi } from "../../api/endpoints";
import { Task, TaskWorkflowStatus, TaskType } from "../../types";
import { KanbanBoard } from "./KanbanBoard";
import { TaskDrawer } from "./TaskDrawer";
import { CreateTaskModal } from "./CreateTaskModal";
import { Kanban, List, Plus, Search } from "lucide-react";

export const TasksView: React.FC = () => {
  const { selectedBranchId, hasPermission } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [statuses, setStatuses] = useState<TaskWorkflowStatus[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);

  const [facets, setFacets] = useState<Record<string, string>>({});
  const [choices, setChoices] = useState<Record<string, Row[]>>({});
  useEffect(() => {
    Promise.all(
      ["projects", "products", "users"].map(
        async (name) => [name, await allRows("/" + name)] as const,
      ),
    )
      .then((items) => setChoices(Object.fromEntries(items)))
      .catch(console.error);
  }, []);

  // Filters
  const [selectedTaskTypeId, setSelectedTaskTypeId] = useState<string>("");
  const [selectedPriority, setSelectedPriority] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Drawer
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [startEditing, setStartEditing] = useState(false);
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

  const {
    rows: tasks,
    loading,
    error,
    reload: reloadTasks,
  } = useListing<Task>("/tasks", {
    branchId: selectedBranchId || undefined,
    taskTypeId: selectedTaskTypeId || undefined,
    priority: selectedPriority || undefined,
    ...facets,
    ...(viewMode === "kanban" ? { search: searchQuery || undefined } : {}),
  });
  const fetchTasks = () => reloadTasks({ keepRows: true });
  useEffect(() => {
    const id = searchParams.get("taskId");
    if (!id) {
      setSelectedTask(null);
      setStartEditing(false);
      return;
    }
    let active = true;
    tasksApi
      .getTaskById(id)
      .then((res: any) => {
        if (active) setSelectedTask(res.data);
      })
      .catch(console.error);
    return () => {
      active = false;
    };
  }, [searchParams.get("taskId")]);
  // Open drawer for a task and sync URL
  const handleOpenDetail = async (task: Task, edit = false) => {
    try {
      const detail: any = await tasksApi.getTaskById(task.id);
      setStartEditing(edit);
      setSelectedTask(detail.data);
    } catch (e: any) {
      alert(e.response?.data?.message || "Unable to load task");
      return;
    }
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set("taskId", task.id);
      return next;
    });
  };

  const handleCloseDetail = () => {
    setSelectedTask(null);
    setStartEditing(false);
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.delete("taskId");
      next.delete("viewTask");
      return next;
    });
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
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                viewMode === "kanban"
                  ? "bg-white text-blue-600 shadow-xs dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              <Kanban className="h-3.5 w-3.5" /> Board
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                viewMode === "list"
                  ? "bg-white text-blue-600 shadow-xs dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              <List className="h-3.5 w-3.5" /> Table
            </button>
          </div>

          {hasPermission("TASKS:CREATE") && (
            <button
              onClick={() => {
                setCreateModalInitialStatus(undefined);
                setCreateModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition"
            >
              <Plus className="h-4 w-4" /> New Task
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {[
          ["projectId", "projects", "project_name"],
          ["productId", "products", "product_name"],
          ["assigneeUserId", "users", "first_name"],
        ].map(([key, source, label]) => (
          <select
            aria-label={source}
            key={key}
            className="form-control max-w-full text-xs"
            value={facets[key] || ""}
            onChange={(e) => {
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
          value={facets.statusId || ""}
          onChange={(e) => {
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
        <div
          className={`relative flex-1 min-w-[200px] ${viewMode === "list" ? "hidden" : ""}`}
        >
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
        {viewMode === "kanban" ? (
          <KanbanBoard
            onMoved={fetchTasks}
            tasks={tasks}
            statuses={statuses}
            onOpenDetail={handleOpenDetail}
            onQuickCreate={
              hasPermission("TASKS:CREATE") ? handleQuickCreate : undefined
            }
          />
        ) : (
          <DataGrid
            title="Tasks"
            preservePageOnDataChange
            data={tasks}
            loading={loading}
            error={error}
            onRetry={fetchTasks}
            columns={[
              { id: "task_code", label: "Code" },
              { id: "title", label: "Task title" },
              { id: "project_name", label: "Project" },
              { id: "task_type_name", label: "Type" },
              { id: "status_name", label: "Status" },
              { id: "priority", label: "Priority" },
              {
                id: "estimated_hours",
                label: "Estimated hours",
                type: "number",
              },
              { id: "spent_hours", label: "Logged hours", type: "number" },
              { id: "is_chargeable", label: "Chargeable" },
              {
                id: "assignees",
                label: "Assignees",
                value: (t) =>
                  (t.assignees || [])
                    .map((a) =>
                      [a.first_name, a.last_name].filter(Boolean).join(" "),
                    )
                    .join(", "),
              },
            ]}
            actions={[
              {
                label: "View",
                icon: Eye,
                onClick: (task) => handleOpenDetail(task),
              },
              {
                label: "Edit",
                icon: Pencil,
                hidden: () => !hasPermission("TASKS:UPDATE"),
                onClick: (task) => handleOpenDetail(task, true),
              },
            ]}
          />
        )}
      </div>
      {error && viewMode === "kanban" && (
        <p role="alert">
          {error} <button onClick={fetchTasks}>Retry</button>
        </p>
      )}
      {/* Task Detail Drawer */}
      {selectedTask && (
        <TaskDrawer
          key={selectedTask?.id}
          task={selectedTask}
          startEditing={startEditing}
          fullPage={searchParams.get("viewTask") === "full"}
          onExpand={() =>
            setSearchParams((previous) => {
              const next = new URLSearchParams(previous);
              if (next.get("viewTask") === "full") next.delete("viewTask");
              else next.set("viewTask", "full");
              return next;
            })
          }
          onClose={handleCloseDetail}
          onTaskUpdated={() => {
            fetchTasks();
            // Refresh currently selected task detail
            tasksApi
              .getTaskById(selectedTask.id)
              .then((res: any) => {
                setSelectedTask(res?.data || res);
              })
              .catch(console.error);
          }}
        />
      )}

      {/* Create Task Modal */}
      {createModalOpen && (
        <CreateTaskModal
          initialStatusId={createModalInitialStatus}
          initial={{
            projectId: facets.projectId || "",
            productId: facets.projectId ? "" : facets.productId || "",
            taskTypeId: selectedTaskTypeId || "",
            ...(selectedPriority ? { priority: selectedPriority } : {}),
          }}
          onClose={() => setCreateModalOpen(false)}
          onCreated={fetchTasks}
        />
      )}
    </div>
  );
};
