import { useEffect, useState } from "react";
import api from "../../api/client";
import { errorText } from "../management/EntityManager";
import { taskLabels, TaskValues } from "./TaskFields";

export function TaskHistory({ task }: { task: TaskValues }) {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<TaskValues[]>([]);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    setLoading(true);
    setError("");
    api
      .get(`/tasks/${task.id}/history`, { params: { page } })
      .then((response: any) => {
        if (current) {
          setRows(response.data || []);
          setPages(Math.max(1, response.meta?.total_pages || 1));
        }
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
  }, [task.id, task.revision, page, attempt]);
  const label = (key: string) =>
    taskLabels[key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] ||
    key.replace(/_/g, " ");
  const display = (value: any) =>
    value == null || value === ""
      ? "Not set"
      : value === true
        ? "Yes"
        : value === false
          ? "No"
          : Array.isArray(value) && value.every((v) => v.name)
            ? value
                .map((v) => v.name + (v.primary ? " (Primary)" : ""))
                .join(", ")
            : typeof value === "object"
              ? JSON.stringify(value)
              : String(value);
  const excluded = new Set([
    "id",
    "revision",
    "created_at",
    "updated_at",
    "created_by",
    "updated_by",
  ]);
  return (
    <section aria-label="Task history" className="space-y-4">
      <h3 className="font-semibold">Field history</h3>
      {loading ? (
        <p role="status">Loading history...</p>
      ) : error ? (
        <p role="alert">
          {error}{" "}
          <button
            className="text-blue-600"
            onClick={() => setAttempt((a) => a + 1)}
          >
            Retry
          </button>
        </p>
      ) : !rows.length ? (
        <p className="text-sm text-slate-500">No recorded changes yet.</p>
      ) : (
        rows.map((row) => {
          const old = row.old_values || {},
            next = row.new_values || {};
          const changed = Object.keys(next).filter(
            (key) =>
              !excluded.has(key) &&
              JSON.stringify(old[key]) !== JSON.stringify(next[key]),
          );
          return (
            <article
              key={row.id}
              className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
            >
              <p className="text-sm font-semibold">
                {row.actor_name?.trim() || "System"}{" "}
                <time className="ml-2 text-xs font-normal text-slate-500">
                  {new Date(row.created_at).toLocaleString()}
                </time>
              </p>
              {row.action_type === "TASK_CREATED" ? (
                <p className="mt-2 text-sm">Created this task</p>
              ) : changed.length ? (
                <dl className="mt-3 space-y-2">
                  {changed.map((key) => (
                    <div key={key} className="text-sm">
                      <dt className="font-semibold capitalize">{label(key)}</dt>
                      <dd className="whitespace-pre-wrap break-words text-slate-500">
                        {display(old[key])}{" "}
                        <span aria-label="changed to"> → </span>{" "}
                        {display(next[key])}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  Updated task details or assignments
                </p>
              )}
            </article>
          );
        })
      )}
      <div className="flex items-center gap-4 text-sm">
        <button
          disabled={loading || page === 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </button>
        <span>
          Page {page} of {pages}
        </span>
        <button
          disabled={loading || page >= pages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </section>
  );
}
