import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import {
  EntityManager,
  type Entity,
  RecordForm,
  Row,
  allRows,
  errorText,
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
} from './config';
import { useAuth } from '../../context/AuthContext';
import type { AdminScreen, PortfolioScreen } from './screens';
import { DataGrid } from '../common/DataGrid';
import { useListing } from '../../hooks/useListing';
import { Pencil, Trash2, Power, UserCheck } from 'lucide-react';

function RelatedRecords({
  row,
  kind,
}: {
  row: Row;
  kind: 'projects' | 'products';
}) {
  const [form, setForm] = useState<Row | null>(null);
  const [error, setError] = useState('');
  const [financial, setFinancial] = useState<Row | null>(null);
  const { hasPermission } = useAuth();
  const endpoint = `/${kind}/${row.id}/${kind === 'projects' ? 'members' : 'clients'}`;
  const {
    rows: records,
    loading,
    error: loadError,
    reload: load,
  } = useListing<Row>(endpoint);
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
      <DataGrid
        title={kind === 'projects' ? 'Team allocation' : 'Client licenses'}
        data={records}
        loading={loading}
        error={loadError}
        onRetry={load}
        columns={
          kind === 'projects'
            ? [
                { id: 'full_name', label: 'Employee' },
                { id: 'project_role', label: 'Project role' },
                {
                  id: 'allocation_percentage',
                  label: 'Allocation %',
                  type: 'number',
                },
              ]
            : [
                { id: 'company_name', label: 'Client' },
                { id: 'license_type', label: 'License' },
                {
                  id: 'contract_value',
                  label: 'Contract value',
                  type: 'number',
                },
                { id: 'currency', label: 'Currency' },
                {
                  id: 'license_end_date',
                  label: 'Ends',
                  value: (r) => r.license_end_date?.slice(0, 10),
                },
              ]
        }
        onAdd={canEdit ? () => setForm({}) : undefined}
        addLabel={`Add ${kind === 'projects' ? 'team member' : 'license'}`}
        actions={
          canEdit
            ? [
                { label: 'Edit', icon: Pencil, onClick: (r) => setForm(r) },
                {
                  label: 'Remove',
                  icon: Trash2,
                  danger: true,
                  onClick: async (r) => {
                    if (
                      !window.confirm(
                        `Remove this ${kind === 'projects' ? 'team member' : 'license'}?`,
                      )
                    )
                      return;
                    await api.delete(
                      kind === 'projects'
                        ? `${endpoint}/${r.user_id}`
                        : `/products/clients/${r.id}`,
                    );
                    await load();
                  },
                },
              ]
            : []
        }
      />
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
export function PortfolioPage({ screen }: { screen: PortfolioScreen }) {
  const config =
    screen.title === 'Projects'
      ? {
          ...projectConfig,
          children: (r: Row) => <RelatedRecords row={r} kind="projects" />,
        }
      : screen.title === 'Products'
        ? {
            ...productConfig,
            children: (r: Row) => <RelatedRecords row={r} kind="products" />,
          }
        : versionConfig;
  return (
    <div className="space-y-6">
      <div className="page-intro">
        <div>
          <p className="page-eyebrow mb-2">Portfolio</p>
          <h1>{screen.title}</h1>
          <p className="page-description">{screen.description}</p>
        </div>
      </div>
      <EntityManager key={screen.path} config={config} />
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
              className="grid-action"
              onClick={async () => {
                try {
                  await api.post(`/clients/${r.id}/convert-to-active`);
                  reload();
                } catch (e) {
                  alert(errorText(e));
                }
              }}
            >
              <UserCheck size={15} aria-hidden="true" /> Convert to active
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
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const { hasPermission } = useAuth();
  useEffect(() => {
    allRows('/task-types')
      .then(setTypes)
      .catch((e) => setError(errorText(e)));
  }, []);
  const {
    rows,
    loading,
    error: loadError,
    reload: load,
  } = useListing<Row>(type ? `/task-workflows/transitions/${type}` : null);
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
      <DataGrid
        key={type}
        title="Workflow transitions"
        data={rows}
        loading={loading}
        error={loadError}
        onRetry={load}
        columns={[
          { id: 'from_status_name', label: 'From status' },
          { id: 'to_status_name', label: 'To status' },
        ]}
        onAdd={
          hasPermission('TASKS:UPDATE') ? () => setAdding(true) : undefined
        }
        addLabel="Add transition"
        actions={
          hasPermission('TASKS:UPDATE')
            ? [
                {
                  label: 'Delete',
                  icon: Trash2,
                  danger: true,
                  onClick: async (r) => {
                    if (!window.confirm('Delete this workflow transition?'))
                      return;
                    await api.delete(`/task-workflows/transitions/${r.id}`);
                    await load();
                  },
                },
              ]
            : []
        }
      />
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
  const { hasPermission } = useAuth();
  const [id, setId] = useState('');
  const [error, setError] = useState('');
  const { rows: subjects, error: subjectError } = useListing<Row>(
    mode === 'roles' ? '/rbac/roles' : `/${mode}`,
  );
  const {
    rows: permissions,
    loading: permissionsLoading,
    error: permissionError,
  } = useListing<Row>('/rbac/permissions');
  const {
    rows: grants,
    loading,
    error: grantError,
    reload: load,
  } = useListing<Row>(id ? `/rbac/${mode}/${id}/permissions` : null);
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Role permissions and overrides</h2>
      {error && (
        <p role="alert" className="text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <Tabs
        tabs={['roles', 'branches', 'users']}
        active={mode}
        set={(next) => {
          setMode(next);
          setId('');
          setError('');
        }}
      />
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
        <DataGrid<Row>
          key={`${mode}/${id}`}
          title="Permissions"
          loading={loading || permissionsLoading}
          error={subjectError || permissionError || grantError}
          onRetry={load}
          data={permissions.map((p) => {
            const grant = grants.find((g) => g.permission_id === p.id);
            return {
              ...p,
              effect: !grant
                ? 'inherit'
                : (grant.is_granted ?? grant.is_allowed ?? true)
                  ? 'grant'
                  : 'deny',
            };
          })}
          columns={[
            { id: 'permission_code', label: 'Permission' },
            { id: 'module', label: 'Module' },
            { id: 'description', label: 'Description' },
            {
              id: 'effect',
              label: 'Access',
              render: (p) => (
                <select
                  disabled={!hasPermission('USERS:MANAGE')}
                  aria-label={p.permission_code}
                  className="form-control"
                  value={p.effect}
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
              ),
            },
          ]}
        />
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
export function AdminPage({ screen }: { screen: AdminScreen }) {
  const { hasPermission } = useAuth();
  const configs: Record<
    Exclude<AdminScreen['title'], 'Transitions' | 'Permissions'>,
    Entity
  > = {
    Branches: branchConfig,
    Departments: departmentConfig,
    Designations: designationConfig,
    Employees: userConfig,
    'Task types': typeConfig,
    Statuses: statusConfig,
    Roles: roleConfig,
    'Assignment rules': {
      ...assignmentConfig,
      detail: false,
      actions: (r: Row, reload: () => void) =>
        hasPermission('TASKS:ASSIGN') && (
          <button
            className="grid-action"
            onClick={async () => {
              try {
                if (!window.confirm('Deactivate this assignment rule?')) return;
                await api.delete(`/auto-assignment/rules/${r.id}`);
                reload();
              } catch (e) {
                alert(errorText(e));
              }
            }}
          >
            <Power size={15} aria-hidden="true" /> Deactivate
          </button>
        ),
    },
  };
  return (
    <div className="space-y-6">
      <div className="page-intro">
        <div>
          <p className="page-eyebrow mb-2">Organization</p>
          <h1>{screen.title}</h1>
          <p className="page-description">{screen.description}</p>
        </div>
      </div>
      {screen.title === 'Transitions' ? (
        <Transitions />
      ) : screen.title === 'Permissions' ? (
        <PermissionMatrix />
      ) : (
        <EntityManager key={screen.path} config={configs[screen.title]} />
      )}
    </div>
  );
}
export function ReleaseCalendar() {
  const { rows, loading, error, reload } = useListing<Row>('/versions');
  return (
    <div className="space-y-5">
      <div className="page-intro">
        <div>
          <p className="page-eyebrow mb-2">Portfolio</p>
          <h1>Release timeline</h1>
          <p className="page-description">
            Plan upcoming versions and keep release dates in sight.
          </p>
        </div>
      </div>
      <DataGrid
        title="Release timeline"
        data={rows}
        loading={loading}
        error={error}
        onRetry={reload}
        initialSorting={[{ id: 'target_release_date', desc: false }]}
        columns={[
          {
            id: 'target_release_date',
            label: 'Target release',
            value: (r) => r.target_release_date?.slice(0, 10) || 'Unscheduled',
          },
          { id: 'version_code', label: 'Version' },
          { id: 'version_name', label: 'Name' },
          {
            id: 'scope',
            label: 'Project / product',
            value: (r) => r.project_name || r.product_name,
          },
          { id: 'status', label: 'Status' },
          { id: 'description', label: 'Description' },
        ]}
      />
    </div>
  );
}
