import React, { useEffect, useState, useCallback } from 'react';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import api from '../../api/client';
import { fetchListing } from '../../api/listings';
import { useListing } from '../../hooks/useListing';
import { DataGrid, type GridAction } from '../common/DataGrid';
import { Eye, Pencil, Power, X } from 'lucide-react';
import { displayValue } from '../common/gridExport';
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
  return fetchListing(path);
}
const inputClass = 'form-control mt-1.5 w-full text-slate-900 dark:text-white';
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
      className="record-form space-y-5"
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
        <p
          role="alert"
          className="rounded bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
        >
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
  const {
    rows,
    loading,
    error: loadError,
    reload: load,
  } = useListing<Row>(config.endpoint, { includeInactive: true });
  const [error, setError] = useState('');
  const [form, setForm] = useState<Row | null>(null);
  const closeForm = useCallback(() => setForm(null), []);
  useDialogFocus(!!form, '[data-record-dialog]', closeForm);
  const [selected, setSelected] = useState<Row | null>(null);
  const closeDetails = useCallback(() => setSelected(null), []);
  useDialogFocus(!!selected, '[data-detail-dialog]', closeDetails);
  const canCreate = !config.permission || hasPermission(config.permission);
  const canEdit =
    !config.noEdit &&
    (!config.updatePermission
      ? canCreate
      : hasPermission(config.updatePermission));
  const detail = async (row: Row) =>
    config.detail === false
      ? row
      : ((await api.get(`${config.endpoint}/${row.id}`)) as any).data;
  const actions: GridAction<Row>[] = [
    {
      label: 'View',
      icon: Eye,
      onClick: async (row) => setSelected(await detail(row)),
    },
    ...(canEdit
      ? [
          {
            label: 'Edit',
            icon: Pencil,
            onClick: async (r: Row) => {
              const row = await detail(r);
              setForm({
                ...row,
                secondaryBranchIds: row.secondaryBranches?.map(
                  (b: Row) => b.id,
                ),
                assigneeIds: row.assignees?.map(
                  (a: Row) => a.user_id || a.userId,
                ),
                primaryAssigneeId: row.assignees?.find(
                  (a: Row) => a.is_primary_assignee || a.isPrimary,
                )?.user_id,
              });
            },
          },
        ]
      : []),
    ...(config.status && canEdit
      ? [
          {
            label: 'Deactivate',
            icon: Power,
            hidden: (r: Row) => !r.is_active,
            onClick: async (r: Row) => {
              if (
                !window.confirm(
                  `Deactivate this ${config.title.toLowerCase()} record?`,
                )
              )
                return;
              await api.patch(`${config.endpoint}/${r.id}/status`, {
                isActive: false,
              });
              await load();
            },
          },
          {
            label: 'Activate',
            icon: Power,
            hidden: (r: Row) => !!r.is_active,
            onClick: async (r: Row) => {
              await api.patch(`${config.endpoint}/${r.id}/status`, {
                isActive: true,
              });
              await load();
            },
          },
        ]
      : []),
  ];
  const singular =
    config.title === 'Branches'
      ? 'Branch'
      : config.title.endsWith('statuses')
        ? config.title.replace(/statuses$/, 'status')
        : config.title.replace(/s$/, '');
  return (
    <section className="space-y-5">
      <DataGrid
        title={config.title}
        data={rows}
        loading={loading}
        error={loadError || error}
        onRetry={() => {
          setError('');
          void load();
        }}
        columns={config.columns.map((id) => ({
          id,
          label: id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          ...(id === 'is_active'
            ? {
                value: (r: Row) => (r.is_active ? 'Active' : 'Inactive'),
                render: (r: Row) => (
                  <span
                    className={`grid-status ${r.is_active ? '' : 'grid-status-inactive'}`}
                  >
                    {r.is_active ? 'Active' : 'Inactive'}
                  </span>
                ),
              }
            : {}),
          ...(config.fields.find((f) => (f.key || snake(f.name)) === id)
            ?.type === 'number'
            ? { type: 'number' as const }
            : {}),
        }))}
        onAdd={canCreate ? () => setForm(config.defaults || {}) : undefined}
        addLabel={`Add ${singular}`}
        actions={actions}
        extraActions={
          config.actions ? (r) => config.actions?.(r, load) : undefined
        }
      />
      {selected && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div
            data-detail-dialog
            role="dialog"
            aria-modal="true"
            aria-label={`View ${config.title}`}
            className="entity-panel max-h-[90vh] w-full max-w-5xl overflow-y-auto"
          >
            <button
              className="grid-action mb-4"
              onClick={() => setSelected(null)}
            >
              <X size={15} aria-hidden="true" /> Close details
            </button>
            <h3 className="mb-4 text-lg font-bold">{config.title} details</h3>
            <dl className="mb-5 grid gap-4 sm:grid-cols-2">
              {config.columns.map((key) => (
                <div key={key}>
                  <dt className="text-xs capitalize text-slate-500">
                    {key.replace(/_/g, ' ')}
                  </dt>
                  <dd className="mt-1 text-sm">
                    {displayValue(selected[key])}
                  </dd>
                </div>
              ))}
            </dl>
            {config.children?.(selected)}
          </div>
        </div>
      )}
      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            data-record-dialog
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
