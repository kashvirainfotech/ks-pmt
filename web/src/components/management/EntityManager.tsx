import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export type Row = Record<string, any>;
export type Field = {
  name: string;
  label: string;
  key?: string;
  type?: string;
  required?: boolean;
  options?: string[];
  source?: string;
  optionLabel?: string;
  min?: number;
  max?: number;
  default?: any;
  editOnly?: boolean;
  createOnly?: boolean;
};
export type Entity = {
  title: string;
  endpoint: string;
  fields: Field[];
  columns: string[];
  permission?: string;
  updatePermission?: string;
  paginated?: boolean;
  status?: boolean;
  noEdit?: boolean;
  detail?: boolean;
  defaults?: Row;
  actions?: (row: Row, reload: () => void) => React.ReactNode;
  children?: (row: Row) => React.ReactNode;
};
export const snake = (s: string) =>
  s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
export const errorText = (e: any) => {
  const m = e.response?.data?.message || e.message || 'Request failed';
  return Array.isArray(m) ? m.join('; ') : String(m);
};
export function rowsOf(res: any): Row[] {
  const d = res?.data ?? res;
  return Array.isArray(d)
    ? d
    : d?.data || d?.users || d?.tasks || d?.timeLogs || [];
}
export async function allRows(path: string): Promise<Row[]> {
  const output: Row[] = [];
  for (let page = 1; ; page++) {
    const res: any = await api.get(path, { params: { page, limit: 100 } });
    output.push(...rowsOf(res));
    const meta = res.meta || res.data?.meta || res.data;
    if (page >= Number(meta?.total_pages ?? meta?.totalPages ?? 1))
      return output;
  }
}
const inputClass =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white';
export function RecordForm({
  fields,
  initial = {},
  onSave,
  onCancel,
  editing = false,
}: {
  fields: Field[];
  initial?: Row;
  onSave: (values: Row) => Promise<void>;
  onCancel: () => void;
  editing?: boolean;
}) {
  const [values, setValues] = useState<Row>(() =>
    Object.fromEntries(
      fields.map((f) => [
        f.name,
        initial[f.name] ??
          initial[f.key || snake(f.name)] ??
          f.default ??
          (f.type === 'checkbox' ? false : f.type === 'multi' ? [] : ''),
      ]),
    ),
  );
  const [lookups, setLookups] = useState<Record<string, Row[]>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    Promise.all(
      [...new Set(fields.filter((f) => f.source).map((f) => f.source!))].map(
        async (source) => [source, await allRows(source)] as const,
      ),
    )
      .then((entries) => {
        if (alive) setLookups(Object.fromEntries(entries));
      })
      .catch((e) => {
        if (alive) setError(errorText(e));
      });
    return () => {
      alive = false;
    };
  }, [fields]);
  const visible = fields.filter(
    (f) => !(f.editOnly && !editing) && !(f.createOnly && editing),
  );
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
          const payload: Row = {};
          for (const f of visible) {
            const value = values[f.name];
            if (value === '' || value === undefined || value === null) continue;
            payload[f.name] =
              f.type === 'number'
                ? Number(value)
                : f.type === 'json'
                  ? typeof value === 'string'
                    ? JSON.parse(value)
                    : value
                  : value;
          }
          for (const [start, end] of [
            ['plannedStartDate', 'plannedEndDate'],
            ['actualStartDate', 'actualEndDate'],
            ['licenseStartDate', 'licenseEndDate'],
            ['startDate', 'endDate'],
            ['plannedStartDate', 'targetReleaseDate'],
          ])
            if (payload[start] && payload[end] && payload[end] < payload[start])
              throw new Error('End date must be on or after start date.');
          if (payload.projectId && payload.productId)
            throw new Error('Choose either a project or a product.');
          await onSave(payload);
        } catch (err) {
          setError(errorText(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      {error && (
        <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {visible.map((f) => {
          const value = values[f.name];
          const update = (v: any) =>
            setValues((prev) => ({ ...prev, [f.name]: v }));
          const choices = f.source
            ? (lookups[f.source] || []).map((r) => ({
                value: r.id,
                label:
                  r[f.optionLabel || 'name'] ||
                  r.full_name ||
                  [r.first_name, r.last_name].filter(Boolean).join(' ') ||
                  r.id,
              }))
            : (f.options || []).map((v) => ({
                value: v,
                label: v.replace(/_/g, ' '),
              }));
          return (
            <label key={f.name} className="block text-sm font-medium">
              {f.label}
              {f.required && ' *'}
              {f.type === 'checkbox' ? (
                <input
                  aria-label={f.label}
                  type="checkbox"
                  className="ml-3"
                  checked={!!value}
                  onChange={(e) => update(e.target.checked)}
                />
              ) : f.source || f.options ? (
                <select
                  aria-label={f.label}
                  className={inputClass}
                  required={f.required}
                  multiple={f.type === 'multi'}
                  value={value}
                  onChange={(e) =>
                    update(
                      f.type === 'multi'
                        ? Array.from(e.target.selectedOptions, (o) => o.value)
                        : e.target.value,
                    )
                  }
                >
                  {f.type !== 'multi' && (
                    <option value="">Select {f.label.toLowerCase()}</option>
                  )}
                  {choices.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : f.type === 'textarea' || f.type === 'json' ? (
                <textarea
                  aria-label={f.label}
                  className={inputClass}
                  rows={3}
                  value={
                    typeof value === 'object' ? JSON.stringify(value) : value
                  }
                  required={f.required}
                  onChange={(e) => update(e.target.value)}
                />
              ) : (
                <input
                  aria-label={f.label}
                  className={inputClass}
                  type={f.type || 'text'}
                  required={f.required}
                  min={f.min}
                  max={f.max}
                  step={f.type === 'number' ? 'any' : undefined}
                  value={
                    f.type === 'date' && value
                      ? String(value).slice(0, 10)
                      : value
                  }
                  autoComplete={
                    f.type === 'password' ? 'new-password' : undefined
                  }
                  onChange={(e) => update(e.target.value)}
                />
              )}
            </label>
          );
        })}
      </div>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button
          disabled={busy}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white"
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}
export function EntityManager({ config }: { config: Entity }) {
  const { hasPermission } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Row | null>(null);
  const [selected, setSelected] = useState<Row | null>(null);
  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res: any = await api.get(config.endpoint, {
        params: config.paginated
          ? {
              page,
              limit: 20,
              search: search || undefined,
              includeInactive: true,
            }
          : { includeInactive: true },
      });
      setRows(rowsOf(res));
      setPages(res.meta?.total_pages ?? res.meta?.totalPages ?? 1);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [config.endpoint, page, search]);
  const canCreate = !config.permission || hasPermission(config.permission);
  const canEdit =
    !config.noEdit &&
    (!config.updatePermission
      ? canCreate
      : hasPermission(config.updatePermission));
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">{config.title}</h2>
        {canCreate && (
          <button
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"
            onClick={() => setForm(config.defaults || {})}
          >
            Add{' '}
            {config.title === 'Branches'
              ? 'Branch'
              : config.title.endsWith('statuses')
                ? config.title.replace(/statuses$/, 'status')
                : config.title.replace(/s$/, '')}
          </button>
        )}
      </div>
      <input
        aria-label={`Search ${config.title}`}
        placeholder="Search…"
        className={inputClass}
        value={search}
        onChange={(e) => {
          setPage(1);
          setSearch(e.target.value);
        }}
      />
      {error && (
        <p role="alert" className="text-red-600">
          {error} <button onClick={load}>Retry</button>
        </p>
      )}
      {loading ? (
        <p role="status">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                {config.columns.map((c) => (
                  <th className="p-3 capitalize" key={c}>
                    {c.replace(/_/g, ' ')}
                  </th>
                ))}
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .filter(
                  (r) =>
                    config.paginated ||
                    !search ||
                    JSON.stringify(r)
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                )
                .map((r) => (
                  <tr
                    key={r.id || r.allocation_id}
                    className="border-t border-slate-200 dark:border-slate-700"
                  >
                    {config.columns.map((c) => (
                      <td className="p-3" key={c}>
                        {typeof r[c] === 'boolean'
                          ? r[c]
                            ? 'Yes'
                            : 'No'
                          : String(r[c] ?? '—')}
                      </td>
                    ))}
                    <td className="p-3">
                      <div className="flex flex-wrap gap-3">
                        {canEdit && (
                          <button
                            className="text-blue-600"
                            onClick={async () => {
                              try {
                                const detail: any =
                                  config.detail === false
                                    ? { data: r }
                                    : await api.get(
                                        `${config.endpoint}/${r.id}`,
                                      );
                                const row = detail.data;
                                setForm({
                                  ...row,
                                  secondaryBranchIds:
                                    row.secondaryBranches?.map(
                                      (b: Row) => b.id,
                                    ),
                                  assigneeIds: row.assignees?.map(
                                    (a: Row) => a.user_id || a.userId,
                                  ),
                                  primaryAssigneeId: row.assignees?.find(
                                    (a: Row) =>
                                      a.is_primary_assignee || a.isPrimary,
                                  )?.user_id,
                                });
                              } catch (e) {
                                setError(errorText(e));
                              }
                            }}
                          >
                            Edit
                          </button>
                        )}
                        {config.status && canEdit && (
                          <button
                            onClick={async () => {
                              try {
                                await api.patch(
                                  `${config.endpoint}/${r.id}/status`,
                                  { isActive: !r.is_active },
                                );
                                await load();
                              } catch (e) {
                                setError(errorText(e));
                              }
                            }}
                          >
                            {r.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                        {config.children && (
                          <button
                            className="text-blue-600"
                            onClick={() => setSelected(r)}
                          >
                            Details
                          </button>
                        )}
                        {config.actions?.(r, load)}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!rows.length && <p className="p-4">No records found.</p>}
        </div>
      )}
      {config.paginated && (
        <div className="flex items-center gap-4">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {Math.max(1, pages)}
          </span>
          <button
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
      {selected && (
        <div className="rounded-lg border p-4">
          <button
            className="mb-4 text-blue-600"
            onClick={() => setSelected(null)}
          >
            Close details
          </button>
          {config.children?.(selected)}
        </div>
      )}
      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${form.id ? 'Edit' : 'Add'} ${config.title}`}
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 text-slate-900 dark:bg-slate-900 dark:text-white"
          >
            <h3 className="mb-4 text-lg font-bold">
              {form.id ? 'Edit' : 'Add'} {config.title}
            </h3>
            <RecordForm
              fields={config.fields}
              initial={form}
              editing={!!form.id}
              onCancel={() => setForm(null)}
              onSave={async (values) => {
                if (form.id)
                  await api.put(`${config.endpoint}/${form.id}`, values);
                else await api.post(config.endpoint, values);
                setForm(null);
                await load();
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
