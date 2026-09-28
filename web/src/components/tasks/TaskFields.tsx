import { TaskDescriptionInput } from "./TaskDescription";
import { useEffect, useId, useState } from "react";
import { fetchListing } from "../../api/listings";
import { errorText } from "../management/EntityManager";

export type TaskValues = Record<string, any>;
export type Choice = { value: string; label: string };
export type TaskChoices = Record<string, TaskValues[]>;
export const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT", "CRITICAL"];
export const taskLabels: Record<string, string> = {
  title: "Title",
  description: "Description",
  taskTypeId: "Task type",
  priority: "Priority",
  severity: "Severity",
  versionId: "Release",
  plannedStartDate: "Planned start",
  plannedEndDate: "Planned end",
  actualStartDate: "Actual start",
  actualEndDate: "Actual end",
  estimatedHours: "Estimated hours",
  isChargeable: "Chargeable",
  chargeAmount: "Charge amount",
  currency: "Currency",
};

export function useTaskChoices(branchId?: string | null) {
  const [choices, setChoices] = useState<TaskChoices>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    setLoading(true);
    setError("");
    const names = ["task-types", "projects", "products", "versions", "users"];
    Promise.all(
      names.map(
        async (name) =>
          [
            name,
            await fetchListing(
              "/" + name,
              ["projects", "users"].includes(name) && branchId
                ? { branchId }
                : {},
            ),
          ] as const,
      ),
    )
      .then((result) => {
        if (current) setChoices(Object.fromEntries(result));
      })
      .catch((e) => {
        if (current) setError(errorText(e));
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [branchId, attempt]);
  return { choices, error, loading, retry: () => setAttempt((a) => a + 1) };
}

export function options(rows: TaskValues[] = [], label: string): Choice[] {
  return rows
    .filter((r) => r.is_active !== false)
    .map((r) => ({
      value: r.id,
      label:
        label === "person"
          ? r.full_name || [r.first_name, r.last_name].filter(Boolean).join(" ")
          : r[label] || r.version_code || r.id,
    }));
}

/** Native selection keeps keyboard and touch behavior predictable; search narrows long lists. */
export function TaskSelect({
  label,
  value,
  choices,
  onChange,
  required = false,
  disabled = false,
  empty = "None",
}: {
  label: string;
  value: string;
  choices: Choice[];
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  empty?: string;
}) {
  const id = useId();
  const [search, setSearch] = useState("");
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="text-xs font-semibold text-slate-600 dark:text-slate-300"
      >
        {label}
        {required && " *"}
      </label>
      {choices.length > 8 && (
        <input
          className="form-control w-full text-sm"
          aria-label={`Search ${label}`}
          placeholder={`Search ${label.toLowerCase()}...`}
          value={search}
          disabled={disabled}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}
      <select
        id={id}
        className="form-control w-full text-sm"
        value={value || ""}
        required={required}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{empty}</option>
        {value && !choices.some((c) => c.value === value) && (
          <option value={value}>Current selection (unavailable)</option>
        )}
        {choices
          .filter(
            (c) =>
              c.value === value ||
              c.label.toLowerCase().includes(search.toLowerCase()),
          )
          .map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
      </select>
    </div>
  );
}

export function releaseOptions(
  choices: TaskChoices,
  projectId?: string,
  productId?: string,
) {
  return options(
    (choices.versions || []).filter((v) =>
      projectId
        ? v.project_id === projectId
        : productId
          ? v.product_id === productId
          : false,
    ),
    "version_name",
  );
}

export function localDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export function TaskInput({
  name,
  value,
  onChange,
  choices,
  disabled = false,
}: {
  name: string;
  value: any;
  onChange: (value: any) => void;
  choices?: Choice[];
  disabled?: boolean;
}) {
  const id = useId();
  const label = taskLabels[name] || name;
  if (choices)
    return (
      <TaskSelect
        label={label}
        value={value}
        choices={choices}
        onChange={onChange}
        required={name === "taskTypeId" || name === "priority"}
        disabled={disabled}
      />
    );
  if (name === "isChargeable")
    return (
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={!!value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        Chargeable
      </label>
    );
  const date = name.endsWith("Date");
  const number = ["estimatedHours", "chargeAmount"].includes(name);
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="text-xs font-semibold text-slate-600 dark:text-slate-300"
      >
        {label}
        {name === "title" && " *"}
      </label>
      {name === "description" ? (
        <TaskDescriptionInput
          id={id}
          value={value || ""}
          disabled={disabled}
          onChange={onChange}
        />
      ) : (
        <input
          id={id}
          className="form-control w-full text-sm"
          type={date ? "datetime-local" : number ? "number" : "text"}
          value={date ? localDate(value) : (value ?? "")}
          disabled={disabled}
          required={name === "title" || name === "currency"}
          maxLength={
            name === "title"
              ? 255
              : name === "severity"
                ? 100
                : name === "currency"
                  ? 10
                  : undefined
          }
          min={number ? 0 : undefined}
          step={number ? "0.01" : undefined}
          onChange={(e) =>
            onChange(
              date
                ? e.target.value
                  ? new Date(e.target.value).toISOString()
                  : null
                : number
                  ? e.target.value === ""
                    ? ""
                    : Number(e.target.value)
                  : e.target.value,
            )
          }
        />
      )}
    </div>
  );
}

export function AssigneeInput({
  values,
  onChange,
  choices,
  currentUserId,
  disabled = false,
}: {
  values: TaskValues;
  onChange: (values: TaskValues) => void;
  choices: TaskValues[];
  currentUserId?: string;
  disabled?: boolean;
}) {
  const ids: string[] = values.assigneeIds || [];
  const people = options(choices, "person");
  const add = (id: string) => {
    if (id && !ids.includes(id))
      onChange({
        assigneeIds: [...ids, id],
        primaryAssigneeId: values.primaryAssigneeId || id,
      });
  };
  return (
    <div className="space-y-3">
      <TaskSelect
        label="Add assignee"
        value=""
        choices={people.filter((p) => !ids.includes(p.value))}
        onChange={add}
        empty="Choose a teammate"
        disabled={disabled}
      />
      {currentUserId &&
        people.some((p) => p.value === currentUserId) &&
        !ids.includes(currentUserId) && (
          <button
            type="button"
            className="text-xs font-semibold text-blue-600"
            disabled={disabled}
            onClick={() => add(currentUserId)}
          >
            Assign to me
          </button>
        )}
      <div className="flex flex-wrap gap-2">
        {ids.map((id) => (
          <span
            key={id}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800"
          >
            {people.find((p) => p.value === id)?.label || "Current assignee"}
            <button
              type="button"
              disabled={disabled}
              aria-label={`Remove ${people.find((p) => p.value === id)?.label || "assignee"}`}
              onClick={() =>
                onChange({
                  assigneeIds: ids.filter((x) => x !== id),
                  primaryAssigneeId:
                    values.primaryAssigneeId === id
                      ? ids.find((x) => x !== id) || ""
                      : values.primaryAssigneeId,
                })
              }
            >
              x
            </button>
          </span>
        ))}
      </div>
      {ids.length > 0 && (
        <TaskSelect
          label="Primary owner"
          value={values.primaryAssigneeId || ids[0]}
          choices={ids.map(
            (id) =>
              people.find((p) => p.value === id) || {
                value: id,
                label: "Current assignee",
              },
          )}
          required
          onChange={(id) => onChange({ primaryAssigneeId: id })}
          disabled={disabled}
        />
      )}
    </div>
  );
}
