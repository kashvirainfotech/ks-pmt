import { allRows, Row } from "../management/EntityManager";
import { useListing } from "../../hooks/useListing";
import { DataGrid } from "../common/DataGrid";
import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { tasksApi, mastersApi, savedViewsApi } from "../../api/endpoints";
import {
  Task,
  TaskWorkflowStatus,
  TaskType,
  SavedView,
  SavedViewPreset,
  BulkUpdateTasksResponse,
} from "../../types";
import { KanbanBoard } from "./KanbanBoard";
import { TaskDrawer } from "./TaskDrawer";
import { CreateTaskModal } from "./CreateTaskModal";
import {
  Kanban,
  List,
  Plus,
  Search,
  Eye,
  Pencil,
  Bookmark,
  Star,
  Download,
  CheckSquare,
  Square,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  AlertOctagon,
  UserCheck,
  UserX,
  Layers,
  Settings,
  X,
  Check,
  AlertCircle,
} from "lucide-react";

export const TasksView: React.FC = () => {
  const { user, selectedBranchId, hasPermission } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [viewMode, setViewMode] = useState<"kanban" | "list">("list");
  const [statuses, setStatuses] = useState<TaskWorkflowStatus[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);

  const [facets, setFacets] = useState<Record<string, string>>({});
  const [choices, setChoices] = useState<Record<string, Row[]>>({});

  // Saved Views & Presets State
  const [activeViewId, setActiveViewId] = useState<string>("preset-all");
  const [presets, setPresets] = useState<SavedViewPreset[]>([]);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [manageViewsOpen, setManageViewsOpen] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  const [newViewScope, setNewViewScope] = useState<"PERSONAL" | "PROJECT">("PERSONAL");
  const [newViewIsDefault, setNewViewIsDefault] = useState(false);

  // Filters
  const [selectedTaskTypeId, setSelectedTaskTypeId] = useState<string>("");
  const [selectedPriority, setSelectedPriority] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Preset Filters (My Work, Blocked, Awaiting QA, etc.)
  const [presetFilters, setPresetFilters] = useState<Record<string, any>>({});

  // Modals & Drawer
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [startEditing, setStartEditing] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalInitialStatus, setCreateModalInitialStatus] = useState<
    string | undefined
  >(undefined);

  // Bulk Operations State
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [bulkActionModalOpen, setBulkActionModalOpen] = useState<
    "STATUS" | "PRIORITY" | "ASSIGNEE" | null
  >(null);
  const [bulkTargetValue, setBulkTargetValue] = useState<string>("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkUpdateTasksResponse | null>(null);
  const [exporting, setExporting] = useState(false);

  // Load choices
  useEffect(() => {
    Promise.all(
      ["projects", "products", "users"].map(
        async (name) => [name, await allRows("/" + name)] as const,
      ),
    )
      .then((items) => setChoices(Object.fromEntries(items)))
      .catch(console.error);
  }, []);

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

  // Fetch Saved Views and Presets
  const fetchSavedViews = async () => {
    try {
      const [presetsRes, viewsRes]: any = await Promise.all([
        savedViewsApi.getPresets(),
        savedViewsApi.getAll(),
      ]);
      setPresets(presetsRes?.data || presetsRes || []);
      setSavedViews(viewsRes?.data || viewsRes || []);
    } catch (e) {
      console.error("Failed to load saved views", e);
    }
  };

  useEffect(() => {
    fetchSavedViews();
  }, []);

  // Build aggregated listing params
  const listingParams = useMemo(() => ({
    branchId: selectedBranchId || undefined,
    taskTypeId: selectedTaskTypeId || undefined,
    priority: selectedPriority || undefined,
    ...facets,
    ...presetFilters,
    ...(searchQuery ? { search: searchQuery } : {}),
  }), [selectedBranchId, selectedTaskTypeId, selectedPriority, facets, presetFilters, searchQuery]);

  const {
    rows: tasks,
    loading,
    error,
    reload: reloadTasks,
  } = useListing<Task>("/tasks", listingParams);

  const fetchTasks = () => reloadTasks({ keepRows: true });

  // Handle URL Task ID sync
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

  // View selection handler
  const handleSelectView = (view: SavedViewPreset | SavedView | { id: string; viewName: string }) => {
    setActiveViewId(view.id);
    setSelectedTaskIds(new Set());

    if (view.id === "preset-all") {
      setPresetFilters({});
      setSelectedTaskTypeId("");
      setSelectedPriority("");
      setSearchQuery("");
      return;
    }

    if ("filters" in view && view.filters) {
      setPresetFilters(view.filters);
      if (view.filters.taskTypeId) setSelectedTaskTypeId(view.filters.taskTypeId);
      if (view.filters.priority) setSelectedPriority(view.filters.priority);
      const mode = 'view_mode' in view ? (view as any).view_mode : (view as any).viewMode;
      if (mode) {
        setViewMode(mode.toLowerCase() as "kanban" | "list");
      }
    }
  };

  // Save current view
  const handleSaveViewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newViewName.trim()) return;
    try {
      await savedViewsApi.create({
        view_name: newViewName.trim(),
        scope: newViewScope,
        is_default: newViewIsDefault,
        filters: {
          ...facets,
          ...presetFilters,
          ...(selectedTaskTypeId ? { taskTypeId: selectedTaskTypeId } : {}),
          ...(selectedPriority ? { priority: selectedPriority } : {}),
        },
        view_mode: viewMode.toUpperCase() as any,
      });
      setSaveModalOpen(false);
      setNewViewName("");
      await fetchSavedViews();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save view");
    }
  };

  // Export CSV handler
  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const res = await tasksApi.exportTasks(listingParams, "csv");
      const csvData = (res as any)?.data?.csv || res.data;
      const filename = (res as any)?.data?.filename || `tasks_export_${new Date().toISOString().slice(0, 10)}.csv`;

      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e: any) {
      alert(e.response?.data?.message || "Failed to export tasks");
    } finally {
      setExporting(false);
    }
  };

  // Inline Cell Editing Handlers
  const handleInlineStatusChange = async (task: Task, newStatusId: string) => {
    if (newStatusId === task.status_id) return;
    try {
      await tasksApi.updateStatus(task.id, newStatusId, undefined, task.revision);
      fetchTasks();
    } catch (err: any) {
      alert(err.response?.data?.message || "Unable to update status");
    }
  };

  const handleInlinePriorityChange = async (task: Task, newPriority: any) => {
    if (newPriority === task.priority) return;
    try {
      await tasksApi.patchTask(task.id, {
        priority: newPriority,
        expectedRevision: task.revision,
      });
      fetchTasks();
    } catch (err: any) {
      alert(err.response?.data?.message || "Unable to update priority");
    }
  };

  // Row selection helpers
  const toggleSelectAll = () => {
    if (selectedTaskIds.size === tasks.length && tasks.length > 0) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(tasks.map((t) => t.id)));
    }
  };

  const toggleSelectTask = (id: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Execute Bulk Action with Revision Checks & Partial Failures
  const handleExecuteBulkAction = async () => {
    if (!bulkActionModalOpen || !bulkTargetValue) return;
    setBulkBusy(true);

    const items = tasks
      .filter((t) => selectedTaskIds.has(t.id))
      .map((t) => ({
        id: t.id,
        expectedRevision: t.revision || 1,
        ...(bulkActionModalOpen === "STATUS" ? { statusId: bulkTargetValue } : {}),
        ...(bulkActionModalOpen === "PRIORITY" ? { priority: bulkTargetValue } : {}),
        ...(bulkActionModalOpen === "ASSIGNEE" ? { assigneeIds: [bulkTargetValue] } : {}),
      }));

    try {
      const response = await tasksApi.bulkUpdate({
        items,
        remarks: `Bulk updated ${bulkActionModalOpen.toLowerCase()}`,
      });
      setBulkResults(response.data);
      setBulkActionModalOpen(null);
      setBulkTargetValue("");
      fetchTasks();
    } catch (err: any) {
      alert(err.response?.data?.message || "Bulk action request failed");
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col space-y-4">
      {/* Top Action Bar */}
      <div className="page-intro">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Tasks & Delivery
          </h1>
          <p className="text-xs text-slate-400">
            Work workspaces, inline updates, agile backlog and bulk execution.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export CSV button */}
          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            title="Export all matching tasks to CSV"
          >
            <Download className="h-3.5 w-3.5" />
            {exporting ? "Exporting..." : "Export CSV"}
          </button>

          {/* View Mode Toggle */}
          <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
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

      {/* Saved Views & Presets Bar (PLAN-003) */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* All Tasks Default */}
          <button
            onClick={() => handleSelectView({ id: "preset-all", viewName: "All Tasks" })}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition ${
              activeViewId === "preset-all"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            <Layers className="h-3.5 w-3.5" /> All Tasks
          </button>

          {/* Built-in dynamic presets */}
          {presets.map((preset) => {
            const isActive = activeViewId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handleSelectView(preset)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                }`}
                title={preset.description}
              >
                {preset.viewName === "My Work" && <UserCheck className="h-3.5 w-3.5" />}
                {preset.viewName === "Awaiting QA" && <ShieldAlert className="h-3.5 w-3.5" />}
                {preset.viewName === "Awaiting Client" && <Clock className="h-3.5 w-3.5" />}
                {preset.viewName === "Blocked" && <AlertOctagon className="h-3.5 w-3.5" />}
                {preset.viewName === "Unassigned" && <UserX className="h-3.5 w-3.5" />}
                {preset.viewName}
              </button>
            );
          })}

          {/* Custom Saved Views */}
          {savedViews.map((sv) => {
            const isActive = activeViewId === sv.id;
            return (
              <button
                key={sv.id}
                onClick={() => handleSelectView(sv)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                <Bookmark className="h-3.5 w-3.5" />
                {sv.view_name}
                {sv.is_favorite && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
              </button>
            );
          })}
        </div>

        {/* View Management Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSaveModalOpen(true)}
            className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            <Plus className="h-3.5 w-3.5" /> Save View
          </button>
          <button
            onClick={() => setManageViewsOpen(true)}
            className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400"
            title="Manage saved views"
          >
            <Settings className="h-3.5 w-3.5" /> Manage
          </button>
        </div>
      </div>

      {/* Facet Filters */}
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

        {/* Task Type Filter */}
        <select
          value={selectedTaskTypeId}
          onChange={(e) => setSelectedTaskTypeId(e.target.value)}
          className="form-control max-w-full text-xs"
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
          className="form-control max-w-full text-xs"
        >
          <option value="">All Priorities</option>
          <option value="CRITICAL">Critical</option>
          <option value="URGENT">Urgent</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      {/* Search Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks by code, title..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
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
              {
                id: "select",
                label: "",
                width: 44,
                minWidth: 44,
                className: "text-center w-11",
                headerClassName: "text-center w-11",
                render: (task) => (
                  <input
                    type="checkbox"
                    checked={selectedTaskIds.has(task.id)}
                    onChange={() => toggleSelectTask(task.id)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    aria-label={`Select task ${task.task_code}`}
                  />
                ),
              },
              {
                id: "task_code",
                label: "Code",
                width: 140,
                minWidth: 130,
                className: "whitespace-nowrap font-mono text-xs",
                render: (task) => (
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {task.task_code}
                    </span>
                    {task.is_blocked && (
                      <span className="inline-flex items-center rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900">
                        BLOCKED
                      </span>
                    )}
                  </div>
                ),
              },
              {
                id: "title",
                label: "Task title",
                minWidth: 280,
                className: "font-medium text-slate-900 dark:text-slate-100",
              },
              {
                id: "project_name",
                label: "Project",
                width: 160,
                minWidth: 140,
                className: "whitespace-nowrap text-slate-600 dark:text-slate-300",
                value: (t) => t.project_name || "-",
              },
              {
                id: "task_type_name",
                label: "Type",
                width: 150,
                minWidth: 130,
                className: "whitespace-nowrap text-slate-700 dark:text-slate-300",
                value: (t) => t.task_type_name || "-",
              },
              {
                id: "status_name",
                label: "Status (Inline)",
                width: 170,
                minWidth: 160,
                render: (task) => (
                  <select
                    value={task.status_id}
                    onChange={(e) => handleInlineStatusChange(task, e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {statuses.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.status_name}
                      </option>
                    ))}
                  </select>
                ),
              },
              {
                id: "priority",
                label: "Priority (Inline)",
                width: 130,
                minWidth: 120,
                render: (task) => (
                  <select
                    value={task.priority}
                    onChange={(e) => handleInlinePriorityChange(task, e.target.value)}
                    className={`w-full rounded-lg border px-2 py-1 text-xs font-bold ${
                      task.priority === "CRITICAL" || task.priority === "URGENT"
                        ? "border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                        : task.priority === "HIGH"
                          ? "border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                          : "border-slate-200 bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                ),
              },
              {
                id: "story_points",
                label: "Points",
                width: 80,
                minWidth: 70,
                className: "text-center whitespace-nowrap",
                headerClassName: "text-center",
                value: (t) => t.story_points ?? "-",
              },
              {
                id: "estimated_hours",
                label: "Est. h",
                width: 80,
                minWidth: 70,
                type: "number",
                className: "text-center whitespace-nowrap",
                headerClassName: "text-center",
                value: (t) => t.estimated_hours ?? "-",
              },
              {
                id: "spent_hours",
                label: "Logged h",
                width: 80,
                minWidth: 70,
                type: "number",
                className: "text-center whitespace-nowrap",
                headerClassName: "text-center",
                value: (t) => t.spent_hours ?? "-",
              },
              {
                id: "assignees",
                label: "Assignees",
                width: 170,
                minWidth: 140,
                className: "whitespace-nowrap text-slate-700 dark:text-slate-300",
                value: (t) =>
                  (t.assignees || [])
                    .map((a: any) => a.name || a.first_name)
                    .filter(Boolean)
                    .join(", ") || "Unassigned",
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

      {/* Floating Bulk Operations Bar (PLAN-003) */}
      {selectedTaskIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-2xl border border-slate-300 bg-white/95 px-5 py-3 shadow-2xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95">
          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
            <CheckSquare className="h-4 w-4 text-blue-600" />
            {selectedTaskIds.size} task{selectedTaskIds.size > 1 ? "s" : ""} selected
          </span>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />

          <button
            onClick={() => setBulkActionModalOpen("STATUS")}
            className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition dark:bg-slate-800 dark:text-slate-200"
          >
            Change Status
          </button>

          <button
            onClick={() => setBulkActionModalOpen("PRIORITY")}
            className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition dark:bg-slate-800 dark:text-slate-200"
          >
            Set Priority
          </button>

          <button
            onClick={() => setBulkActionModalOpen("ASSIGNEE")}
            className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition dark:bg-slate-800 dark:text-slate-200"
          >
            Assign Teammate
          </button>

          <button
            onClick={() => setSelectedTaskIds(new Set())}
            className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition dark:hover:text-slate-200"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        </div>
      )}

      {/* Bulk Action Configuration Modal */}
      {bulkActionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Bulk Update: {bulkActionModalOpen}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Applying changes across {selectedTaskIds.size} selected tasks with optimistic revision validation.
            </p>

            <div className="mt-4">
              {bulkActionModalOpen === "STATUS" && (
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Target Workflow Status
                  </label>
                  <select
                    value={bulkTargetValue}
                    onChange={(e) => setBulkTargetValue(e.target.value)}
                    className="form-control mt-1.5 w-full text-xs"
                  >
                    <option value="">Select destination status</option>
                    {statuses.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.status_name} ({s.status_category})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {bulkActionModalOpen === "PRIORITY" && (
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Target Priority
                  </label>
                  <select
                    value={bulkTargetValue}
                    onChange={(e) => setBulkTargetValue(e.target.value)}
                    className="form-control mt-1.5 w-full text-xs"
                  >
                    <option value="">Select priority</option>
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
              )}

              {bulkActionModalOpen === "ASSIGNEE" && (
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Assign to Teammate
                  </label>
                  <select
                    value={bulkTargetValue}
                    onChange={(e) => setBulkTargetValue(e.target.value)}
                    className="form-control mt-1.5 w-full text-xs"
                  >
                    <option value="">Select teammate</option>
                    {(choices.users || []).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.first_name} {u.last_name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setBulkActionModalOpen(null);
                  setBulkTargetValue("");
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!bulkTargetValue || bulkBusy}
                onClick={handleExecuteBulkAction}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-blue-700 disabled:opacity-50"
              >
                {bulkBusy ? "Applying Changes..." : "Apply to Selected"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Results & Partial Failure Report Modal */}
      {bulkResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Bulk Operation Results
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Processed {bulkResults.total} tasks: {bulkResults.succeededCount} succeeded, {bulkResults.failedCount} failed.
            </p>

            <div className="mt-4 max-h-80 overflow-y-auto space-y-2">
              {bulkResults.succeeded.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 rounded-xl bg-emerald-50 p-2.5 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span className="font-bold">{s.taskCode}</span>: {s.title} updated successfully.
                </div>
              ))}

              {bulkResults.failed.map((f) => (
                <div
                  key={f.id}
                  className="flex items-start gap-2 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <div>
                    <span className="font-bold">{f.taskCode || f.id}</span>: {f.reason} ({f.code})
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setBulkResults(null);
                  setSelectedTaskIds(new Set());
                }}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save View Modal (PLAN-003) */}
      {saveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleSaveViewSubmit}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Save Current View
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Save your current filters, layout and sorting for quick personal or team access.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  View Name
                </label>
                <input
                  type="text"
                  required
                  value={newViewName}
                  onChange={(e) => setNewViewName(e.target.value)}
                  placeholder="e.g. High Priority Sprint Tasks"
                  className="form-control mt-1 w-full text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Visibility Scope
                </label>
                <select
                  value={newViewScope}
                  onChange={(e) => setNewViewScope(e.target.value as any)}
                  className="form-control mt-1 w-full text-xs"
                >
                  <option value="PERSONAL">Private (Only Me)</option>
                  <option value="PROJECT">Team / Project (Shared)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="defaultViewCheck"
                  checked={newViewIsDefault}
                  onChange={(e) => setNewViewIsDefault(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                <label htmlFor="defaultViewCheck" className="text-xs text-slate-700 dark:text-slate-300">
                  Set as my default tasks view
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSaveModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-blue-700"
              >
                Save View
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Manage Saved Views Modal */}
      {manageViewsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Manage Saved Views
              </h3>
              <button
                onClick={() => setManageViewsOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 max-h-80 overflow-y-auto space-y-2">
              {savedViews.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  No custom saved views created yet.
                </p>
              ) : (
                savedViews.map((sv) => (
                  <div
                    key={sv.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-slate-800"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {sv.view_name}
                        </span>
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          {sv.scope}
                        </span>
                        {sv.is_default && (
                          <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                            DEFAULT
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Created {new Date(sv.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          await savedViewsApi.toggleFavorite(sv.id);
                          await fetchSavedViews();
                        }}
                        className="p-1 text-slate-400 hover:text-amber-500"
                        title="Toggle Favorite"
                      >
                        <Star
                          className={`h-4 w-4 ${
                            sv.is_favorite ? "fill-amber-400 text-amber-400" : ""
                          }`}
                        />
                      </button>

                      <button
                        onClick={async () => {
                          if (confirm(`Delete view "${sv.view_name}"?`)) {
                            await savedViewsApi.delete(sv.id);
                            await fetchSavedViews();
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-rose-500"
                        title="Delete View"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setManageViewsOpen(false)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
              >
                Done
              </button>
            </div>
          </div>
        </div>
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
