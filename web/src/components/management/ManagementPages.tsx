import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import {
  EntityManager,
  RecordForm,
  Row,
  allRows,
  errorText,
  rowsOf,
} from './EntityManager';
import {
  branchConfig,
  departmentConfig,
  designationConfig,
  userConfig,
  typeConfig,
  statusConfig,
  assignmentConfig,
  transitionFields,
  clientConfig,
  productConfig,
  projectConfig,
  versionConfig,
  licenseFields,
  memberFields,
  f,
  ref,
} from './config';
import { useAuth } from '../../context/AuthContext';

function RelatedRecords({
  row,
  kind,
}: {
  row: Row;
  kind: 'projects' | 'products';
}) {
  const [records, setRecords] = useState<Row[]>([]);
  const [form, setForm] = useState<Row | null>(null);
  const [error, setError] = useState('');
  const [financial, setFinancial] = useState<Row | null>(null);
  const { hasPermission } = useAuth();
  const endpoint = `/${kind}/${row.id}/${kind === 'projects' ? 'members' : 'clients'}`;
  const load = async () => {
    try {
      setRecords(rowsOf(await api.get(endpoint)));
    } catch (e) {
      setError(errorText(e));
    }
  };
  useEffect(() => {
    load();
  }, [endpoint]);
  const canEdit = hasPermission(
    kind === 'projects' ? 'PROJECTS:UPDATE' : 'PRODUCTS:MANAGE',
  );
  return (
    <div className="space-y-4">
      <h3 className="font-bold">
        {row.project_name || row.product_name} —{' '}
        {kind === 'projects' ? 'Team allocation' : 'Client licenses'}
      </h3>
      {error && (
        <p role="alert" className="text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {canEdit && (
        <button className="text-blue-600 dark:text-blue-400" onClick={() => setForm({})}>
          Add {kind === 'projects' ? 'team member' : 'license'}
        </button>
      )}
      {records.map((r) => (
        <div
          key={r.id || r.allocation_id}
          className="flex flex-wrap justify-between gap-3 border-b py-3"
        >
          <span>
            {r.full_name || r.company_name} — {r.project_role || r.license_type}{' '}
            —{' '}
            {r.allocation_percentage
              ? `${r.allocation_percentage}%`
              : `${r.currency} ${r.contract_value}`}{' '}
            {r.license_end_date &&
              ` · Ends ${String(r.license_end_date).slice(0, 10)}`}
          </span>
          {canEdit && (
            <div className="flex gap-4">
              <button onClick={() => setForm(r)}>Edit</button>
              <button
                onClick={async () => {
                  try {
                    await api.delete(
                      kind === 'projects'
                        ? `${endpoint}/${r.user_id}`
                        : `/products/clients/${r.id}`,
                    );
                    await load();
                  } catch (e) {
                    setError(errorText(e));
                  }
                }}
              >
                Remove
              </button>
            </div>
          )}
        </div>
      ))}
      {form && (
        <RecordForm
          fields={kind === 'projects' ? memberFields : licenseFields}
          initial={form}
          onCancel={() => setForm(null)}
          onSave={async (values) => {
            if (kind === 'products' && form.id)
              await api.put(`/products/clients/${form.id}`, values);
            else await api.post(endpoint, values);
            setForm(null);
            await load();
          }}
        />
      )}
      {kind === 'projects' && hasPermission('PROJECTS:VIEW_FINANCIALS') && (
        <>
          <button
            onClick={async () => {
              try {
                const res: any = await api.get(
                  `/projects/${row.id}/financial-summary`,
                );
                setFinancial(res.data);
              } catch (e) {
                setError(errorText(e));
              }
            }}
          >
            View financial summary
          </button>
          {financial && (
            <dl className="grid gap-2 sm:grid-cols-2">
              {Object.entries(financial)
                .filter(([k]) => !k.endsWith('_id'))
                .map(([k, v]) => (
                  <div key={k}>
                    <dt className="capitalize text-xs">
                      {k.replace(/_/g, ' ')}
                    </dt>
                    <dd>{String(v ?? '—')}</dd>
                  </div>
                ))}
            </dl>
          )}
        </>
      )}
    </div>
  );
}
export function PortfolioPage() {
  const [tab, setTab] = useState('Projects');
  const config =
    tab === 'Projects'
      ? {
          ...projectConfig,
          children: (r: Row) => <RelatedRecords row={r} kind="projects" />,
        }
      : tab === 'Products'
        ? {
            ...productConfig,
            children: (r: Row) => <RelatedRecords row={r} kind="products" />,
          }
        : versionConfig;
  return (
    <div className="space-y-6">
      <div className="page-intro"><div><p className="page-eyebrow mb-2">Portfolio</p><h1>Projects & products</h1><p className="page-description">Plan delivery, manage your team and keep releases on track.</p></div></div>
      <Tabs
        tabs={['Projects', 'Products', 'Versions']}
        active={tab}
        set={setTab}
      />
      <EntityManager key={tab} config={config} />
    </div>
  );
}
export function ClientsPage() {
  return (
    <EntityManager
      config={{
        ...clientConfig,
        actions: (r, reload) =>
          r.client_type === 'PROSPECT' && (
            <button
              className="text-blue-600 dark:text-blue-400"
              onClick={async () => {
                try {
                  await api.post(`/clients/${r.id}/convert-to-active`);
                  reload();
                } catch (e) {
                  alert(errorText(e));
                }
              }}
            >
              Convert to active
            </button>
          ),
      }}
    />
  );
}
function Tabs({
  tabs,
  active,
  set,
}: {
  tabs: string[];
  active: string;
  set: (s: string) => void;
}) {
  return (
    <div className="workspace-tabs flex flex-wrap gap-2" role="tablist">
      {tabs.map((t) => (
        <button
          role="tab"
          aria-selected={active === t}
          key={t}
          className={`rounded-lg px-3 py-2 text-sm ${active === t ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-white'}`}
          onClick={() => set(t)}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
function Transitions() {
  const [types, setTypes] = useState<Row[]>([]);
  const [type, setType] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const { hasPermission } = useAuth();
  useEffect(() => {
    allRows('/task-types')
      .then(setTypes)
      .catch((e) => setError(errorText(e)));
  }, []);
  const load = async () => {
    if (!type) return;
    try {
      setRows(rowsOf(await api.get(`/task-workflows/transitions/${type}`)));
    } catch (e) {
      setError(errorText(e));
    }
  };
  useEffect(() => {
    load();
  }, [type]);
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Workflow transitions</h2>
      {error && <p role="alert">{error}</p>}
      <select
        aria-label="Task type"
        className="rounded border p-2 dark:bg-slate-800"
        value={type}
        onChange={(e) => setType(e.target.value)}
      >
        <option value="">Select task type</option>
        {types.map((t) => (
          <option key={t.id} value={t.id}>
            {t.type_name}
          </option>
        ))}
      </select>
      {hasPermission('TASKS:UPDATE') && (
        <button className="ml-4 text-blue-600 dark:text-blue-400" onClick={() => setAdding(true)}>
          Add transition
        </button>
      )}
      {rows.map((r) => (
        <div key={r.id} className="flex gap-5 border-b py-2">
          {r.from_status_name} → {r.to_status_name}
          {hasPermission('TASKS:UPDATE') && (
            <button
              onClick={async () => {
                try {
                  await api.delete(`/task-workflows/transitions/${r.id}`);
                  load();
                } catch (e) {
                  setError(errorText(e));
                }
              }}
            >
              Remove
            </button>
          )}
        </div>
      ))}
      {adding && (
        <RecordForm
          fields={transitionFields}
          initial={{ taskTypeId: type }}
          onCancel={() => setAdding(false)}
          onSave={async (values) => {
            await api.post('/task-workflows/transitions', values);
            setAdding(false);
            setType(values.taskTypeId);
            await load();
          }}
        />
      )}
    </div>
  );
}
function PermissionMatrix() {
  const [mode, setMode] = useState('roles');
  const [subjects, setSubjects] = useState<Row[]>([]);
  const [permissions, setPermissions] = useState<Row[]>([]);
  const [id, setId] = useState('');
  const [grants, setGrants] = useState<Row[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    setId('');
    setGrants([]);
    Promise.all([
      allRows(mode === 'roles' ? '/rbac/roles' : `/${mode}`),
      allRows('/rbac/permissions'),
    ])
      .then(([s, p]) => {
        setSubjects(s);
        setPermissions(p);
      })
      .catch((e) => setError(errorText(e)));
  }, [mode]);
  const load = async () => {
    if (!id) return;
    try {
      setGrants(rowsOf(await api.get(`/rbac/${mode}/${id}/permissions`)));
    } catch (e) {
      setError(errorText(e));
    }
  };
  useEffect(() => {
    load();
  }, [id, mode]);
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Role permissions and overrides</h2>
      {error && (
        <p role="alert" className="text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <Tabs tabs={['roles', 'branches', 'users']} active={mode} set={setMode} />
      <select
        aria-label="Permission subject"
        className="rounded border p-2 dark:bg-slate-800"
        value={id}
        onChange={(e) => setId(e.target.value)}
      >
        <option value="">Choose {mode}</option>
        {subjects.map((s) => (
          <option key={s.id} value={s.id}>
            {s.role_name || s.branch_name || `${s.first_name} ${s.last_name}`}
          </option>
        ))}
      </select>
      {id && (
        <div className="grid gap-3 md:grid-cols-2">
          {permissions.map((p) => {
            const grant = grants.find((g) => g.permission_id === p.id);
            const value = !grant
              ? 'inherit'
              : (grant.is_granted ?? grant.is_allowed ?? true)
                ? 'grant'
                : 'deny';
            return (
              <label
                className="flex items-center justify-between gap-2 rounded border p-3 text-sm"
                key={p.id}
              >
                {p.permission_code}
                <select
                  aria-label={p.permission_code}
                  className="rounded border p-1 dark:bg-slate-800"
                  value={value}
                  onChange={async (e) => {
                    try {
                      await api.put(`/rbac/${mode}/${id}/permissions/${p.id}`, {
                        effect: e.target.value,
                      });
                      await load();
                    } catch (err) {
                      setError(errorText(err));
                    }
                  }}
                >
                  <option value="inherit">
                    {mode === 'roles' ? 'Not granted' : 'Inherit'}
                  </option>
                  <option value="grant">
                    {mode === 'branches' ? 'Allow role permission' : 'Grant'}
                  </option>
                  {mode !== 'roles' && <option value="deny">Deny</option>}
                </select>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
const roleConfig = {
  title: 'Roles',
  endpoint: '/rbac/roles',
  permission: 'USERS:MANAGE',
  detail: false,
  columns: ['role_code', 'role_name', 'description', 'is_active'],
  fields: [
    f('roleCode', 'Role code', { required: true, createOnly: true }),
    f('roleName', 'Role name', { required: true }),
    f('description', 'Description'),
    f('isActive', 'Active', {
      type: 'checkbox',
      default: true,
      editOnly: true,
    }),
  ],
};
export function AdminPage() {
  const [tab, setTab] = useState('Branches');
  const configs: Record<string, any> = {
    Branches: branchConfig,
    Departments: departmentConfig,
    Designations: designationConfig,
    Employees: userConfig,
    'Task types': typeConfig,
    Statuses: statusConfig,
    Roles: roleConfig,
    'Assignment rules': {
      ...assignmentConfig,
      actions: (r: Row, reload: () => void) => (
        <button
          onClick={async () => {
            try {
              await api.delete(`/auto-assignment/rules/${r.id}`);
              reload();
            } catch (e) {
              alert(errorText(e));
            }
          }}
        >
          Deactivate
        </button>
      ),
    },
  };
  return (
    <div className="space-y-6">
      <div className="page-intro"><div><p className="page-eyebrow mb-2">Organization</p><h1>Masters & setup</h1><p className="page-description">Manage the people, structure and workflows behind your workspace.</p></div></div>
      <Tabs
        tabs={[...Object.keys(configs), 'Transitions', 'Permissions']}
        active={tab}
        set={setTab}
      />
      {tab === 'Transitions' ? (
        <Transitions />
      ) : tab === 'Permissions' ? (
        <PermissionMatrix />
      ) : (
        <EntityManager key={tab} config={configs[tab]} />
      )}
    </div>
  );
}
export function ReleaseCalendar() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    allRows('/versions')
      .then(setRows)
      .catch((e) => setError(errorText(e)));
  }, []);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Release timeline</h1>
      {error && <p role="alert">{error}</p>}
      {rows
        .sort((a, b) =>
          String(a.target_release_date || '9999').localeCompare(
            String(b.target_release_date || '9999'),
          ),
        )
        .map((v) => (
          <article
            key={v.id}
            className="rounded-lg border-l-4 border-blue-500 bg-white p-4 dark:bg-slate-900"
          >
            <time>
              {v.target_release_date
                ? String(v.target_release_date).slice(0, 10)
                : 'Unscheduled'}
            </time>
            <h2 className="font-bold">
              {v.version_code} · {v.version_name}
            </h2>
            <p>
              {v.project_name || v.product_name} · {v.status}
            </p>
            <p>{v.description}</p>
          </article>
        ))}
    </div>
  );
}
