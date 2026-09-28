import { CustomTaskFields, customDefaults } from "./CustomTaskFields";
import { useCallback, useEffect, useRef, useState } from "react";
import { X, Plus } from "lucide-react";
import { useDialogFocus } from "../../hooks/useDialogFocus";
import { errorText } from "../management/EntityManager";
import { tasksApi } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";
import {
  AssigneeInput,
  options,
  priorities,
  releaseOptions,
  TaskInput,
  TaskSelect,
  TaskValues,
  useTaskChoices,
} from "./TaskFields";

export function CreateTaskModal({
  initialStatusId,
  initial = {},
  onClose,
  onCreated,
}: {
  initialStatusId?: string;
  initial?: TaskValues;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { selectedBranchId, branches, user, hasPermission } = useAuth();
  const baseline = {
    branchId: selectedBranchId || "",
    priority: "MEDIUM",
    title: "",
    description: "",
    ...initial,
  };
  const [values, setValues] = useState<TaskValues>(baseline);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [another, setAnother] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const {
    choices,
    loading,
    error: lookupError,
    retry,
  } = useTaskChoices(values.branchId);
  const state = useRef({ dirty, saving, onClose });
  state.current = { dirty, saving, onClose };
  const close = useCallback(() => {
    if (state.current.saving) return;
    if (!state.current.dirty || window.confirm("Discard this unsaved task?"))
      state.current.onClose();
  }, []);
  useDialogFocus(true, "[data-create-task-dialog]", close);
  useEffect(() => {
    const prevent = (e: BeforeUnloadEvent) => {
      if (state.current.dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, []);
  const change = (patch: TaskValues) => {
    setDirty(true);
    setValues((v) => ({ ...v, ...patch }));
    setSuccess("");
  };
  const financial = hasPermission("PROJECTS:VIEW_FINANCIALS");
  const assign = hasPermission("TASKS:ASSIGN");
  const types = choices["task-types"] || [];
  const selectType = (id: string) => {
    const type = types.find((t) => t.id === id);
    change({
      taskTypeId: id,
      customFieldValues: customDefaults(type?.custom_fields),
      severity: type?.default_severity || "",
      ...(financial
        ? { isChargeable: type?.is_chargeable_default || false }
        : {}),
    });
  };
  const schema =
    types.find((t) => t.id === values.taskTypeId)?.custom_fields || {};
  const input = (name: string) => (
    <TaskInput
      key={name}
      name={name}
      value={values[name]}
      onChange={(value) => change({ [name]: value })}
      disabled={saving}
    />
  );
  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setError("");
    setSuccess("");
    if (!values.title?.trim()) {
      setError("Enter a task title.");
      return;
    }
    if (
      values.plannedStartDate &&
      values.plannedEndDate &&
      new Date(values.plannedEndDate) < new Date(values.plannedStartDate)
    ) {
      setError("Planned end must be on or after planned start.");
      return;
    }
    setSaving(true);
    try {
      const payload = Object.fromEntries(
        Object.entries(values).filter(
          ([, v]) => v !== "" && v !== null && v !== undefined,
        ),
      );
      delete payload.scope;
      payload.customFieldValues = {
        ...customDefaults(schema),
        ...values.customFieldValues,
      };
      payload.title = values.title.trim();
      if (!assign) {
        delete payload.assigneeIds;
        delete payload.primaryAssigneeId;
      }
      if (!financial) {
        delete payload.isChargeable;
        delete payload.chargeAmount;
        delete payload.currency;
      }
      const result = await tasksApi.createTask(payload);
      onCreated();
      if (another) {
        setValues({
          branchId: values.branchId,
          projectId: values.projectId,
          productId: values.productId,
          versionId: values.versionId,
          parentTaskId: values.parentTaskId,
          taskTypeId: values.taskTypeId,
          priority: "MEDIUM",
          title: "",
          description: "",
          severity:
            types.find((t) => t.id === values.taskTypeId)?.default_severity ||
            "",
          ...(financial
            ? {
                isChargeable:
                  types.find((t) => t.id === values.taskTypeId)
                    ?.is_chargeable_default || false,
              }
            : {}),
        });
        setDirty(false);
        setSuccess(
          `${result.data?.task_code || "Task"} created. Ready for another.`,
        );
        document
          .querySelector<HTMLInputElement>(
            '[data-create-task-dialog] input[required][type="text"]',
          )
          ?.focus();
      } else {
        setDirty(false);
        onClose();
      }
    } catch (e) {
      setError(errorText(e));
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-2 backdrop-blur-sm sm:p-6">
      <section
        data-create-task-dialog
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-task-title"
        className="flex max-h-[94vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 id="create-task-title" className="text-xl font-semibold">
              Create task
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Capture the work now. Add more detail as it develops.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close create task"
            disabled={saving}
            onClick={close}
            className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </header>
        <form onSubmit={create} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-5 overflow-y-auto px-6 py-5">
            {lookupError && (
              <div role="alert">
                {lookupError}{" "}
                <button type="button" onClick={retry} className="text-blue-600">
                  Retry choices
                </button>
              </div>
            )}
            {loading && (
              <p role="status" className="text-sm text-slate-500">
                Loading task choices...
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <TaskSelect
                label="Scope"
                value={
                  values.projectId
                    ? "project"
                    : values.productId
                      ? "product"
                      : values.scope || ""
                }
                choices={[
                  { value: "project", label: "Project" },
                  { value: "product", label: "Product" },
                ]}
                empty="General task"
                disabled={saving || !!initial.parentTaskId}
                onChange={(scope) =>
                  change({ scope, projectId: "", productId: "", versionId: "" })
                }
              />
              <TaskSelect
                label="Task type"
                required
                value={values.taskTypeId}
                choices={options(types, "type_name")}
                onChange={selectType}
                disabled={saving || loading}
                empty="Choose type"
              />
              {(values.scope === "project" || values.projectId) && (
                <TaskSelect
                  label="Project"
                  required
                  value={values.projectId}
                  choices={options(choices.projects, "project_name")}
                  onChange={(id) =>
                    change({ projectId: id, productId: "", versionId: "" })
                  }
                  disabled={saving || !!initial.parentTaskId}
                />
              )}
              {(values.scope === "product" || values.productId) && (
                <TaskSelect
                  label="Product"
                  required
                  value={values.productId}
                  choices={options(choices.products, "product_name")}
                  onChange={(id) =>
                    change({ productId: id, projectId: "", versionId: "" })
                  }
                  disabled={saving || !!initial.parentTaskId}
                />
              )}
            </div>
            {input("title")}
            {input("description")}
            <CustomTaskFields
              schema={schema}
              values={{
                ...customDefaults(schema),
                ...values.customFieldValues,
              }}
              change={(v) => change({ customFieldValues: v })}
              users={choices.users}
              disabled={saving}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TaskInput
                name="priority"
                value={values.priority}
                choices={priorities.map((value) => ({ value, label: value }))}
                onChange={(value) => change({ priority: value })}
                disabled={saving}
              />
              {input("severity")}
            </div>
            {assign && (
              <AssigneeInput
                values={values}
                choices={choices.users || []}
                currentUserId={user?.id}
                onChange={change}
                disabled={saving || loading}
              />
            )}
            <details className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <summary className="cursor-pointer text-sm font-semibold">
                Scheduling and release
              </summary>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {input("plannedStartDate")}
                {input("plannedEndDate")}
                {input("estimatedHours")}
                <TaskSelect
                  label="Release"
                  value={values.versionId}
                  choices={releaseOptions(
                    choices,
                    values.projectId,
                    values.productId,
                  )}
                  onChange={(id) => change({ versionId: id })}
                  disabled={saving}
                />
              </div>
            </details>
            {financial && (
              <details className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <summary className="cursor-pointer text-sm font-semibold">
                  Billing
                </summary>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {input("isChargeable")}
                  {input("chargeAmount")}
                  <TaskInput
                    name="currency"
                    value={values.currency ?? "INR"}
                    onChange={(v) => change({ currency: v })}
                    disabled={saving}
                  />
                </div>
              </details>
            )}
            <details className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <summary className="cursor-pointer text-sm font-semibold">
                Organization
              </summary>
              <div className="mt-4">
                <TaskSelect
                  label="Branch"
                  value={values.branchId}
                  choices={branches.map((b) => ({
                    value: b.id,
                    label: b.branch_name,
                  }))}
                  required
                  disabled={saving || !!initial.parentTaskId}
                  onChange={(id) =>
                    change({
                      branchId: id,
                      projectId: "",
                      versionId: "",
                      assigneeIds: [],
                      primaryAssigneeId: "",
                    })
                  }
                />
              </div>
            </details>
            {initialStatusId && (
              <p className="text-xs text-slate-500">
                New tasks start in their workflow's first To do status. Move the
                task through its allowed transitions after creation.
              </p>
            )}
            {error && (
              <p
                role="alert"
                className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200"
              >
                {error}
              </p>
            )}
            {success && (
              <p role="status" className="text-sm text-emerald-600">
                {success}
              </p>
            )}
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={another}
                disabled={saving}
                onChange={(e) => setAnother(e.target.checked)}
              />
              Create another
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={close}
                className="rounded-lg px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || loading || !!lookupError}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Plus size={16} />
                {saving ? "Creating..." : "Create task"}
              </button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  );
}
