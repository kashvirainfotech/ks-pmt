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
  calendarConfig,
  holidayFields,
  assignmentFields,
  leaveConfig,
  sprintConfig,
  milestoneConfig,
  blockerConfig,
  f,
} from './config';
import { blockersApi } from '../../api/endpoints';
import type { BlockerRadarData, TaskBlockerEpisode } from '../../types';
import { useAuth } from '../../context/AuthContext';
import type { AdminScreen, PortfolioScreen } from './screens';
import { DataGrid } from '../common/DataGrid';
import { useListing } from '../../hooks/useListing';
import {
  Pencil,
  Trash2,
  Power,
  UserCheck,
  Plus,
  Play,
  CheckCircle2,
  History,
  Gauge,
  ArrowRight,
  AlertTriangle,
  ShieldAlert,
  AlertOctagon,
  Check,
  Clock,
} from 'lucide-react';

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
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Financial & Budget Performance
            </h4>
            <button
              type="button"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400"
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
              {financial ? 'Refresh Financials' : 'View Financial Metrics'}
            </button>
          </div>

          {financial && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg bg-white p-3 shadow-2xs dark:bg-slate-800">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Contract Amount</span>
                  <p className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {financial.currency || 'INR'} {Number(financial.contract_amount || 0).toLocaleString()}
                  </p>
                  <span className="text-[10px] text-slate-500">Model: {financial.billing_type?.replace(/_/g, ' ')}</span>
                </div>

                <div className="rounded-lg bg-white p-3 shadow-2xs dark:bg-slate-800">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Hourly Rate</span>
                  <p className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {financial.currency || 'INR'} {Number(financial.hourly_rate || 0).toLocaleString()}
                  </p>
                  <span className="text-[10px] text-slate-500">T&M Rate</span>
                </div>

                <div className="rounded-lg bg-white p-3 shadow-2xs dark:bg-slate-800">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Budget Hours</span>
                  <p className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {Number(financial.budgeted_hours || 0).toFixed(1)} <span className="text-xs font-normal text-slate-500">hrs</span>
                  </p>
                  <span className="text-[10px] text-slate-500">Allocated budget</span>
                </div>

                <div className="rounded-lg bg-white p-3 shadow-2xs dark:bg-slate-800">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Actual Logged</span>
                  <p className={`text-base font-bold mt-1 ${
                    Number(financial.total_actual_hours_logged || 0) > Number(financial.budgeted_hours || 0) && Number(financial.budgeted_hours || 0) > 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {Number(financial.total_actual_hours_logged || 0).toFixed(1)} <span className="text-xs font-normal text-slate-500">hrs</span>
                  </p>
                  <span className="text-[10px] text-slate-500">
                    Billable: {Number(financial.total_billable_hours_logged || 0).toFixed(1)} hrs
                  </span>
                </div>
              </div>

              {Number(financial.budgeted_hours || 0) > 0 && (
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-slate-600 dark:text-slate-400">Budget Hour Consumption</span>
                    <span className={
                      (Number(financial.total_actual_hours_logged || 0) / Number(financial.budgeted_hours)) * 100 > 100
                        ? 'text-red-600 font-bold'
                        : 'text-slate-700 dark:text-slate-300'
                    }>
                      {((Number(financial.total_actual_hours_logged || 0) / Number(financial.budgeted_hours)) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 dark:bg-slate-700 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        (Number(financial.total_actual_hours_logged || 0) / Number(financial.budgeted_hours)) * 100 > 100
                          ? 'bg-red-500'
                          : (Number(financial.total_actual_hours_logged || 0) / Number(financial.budgeted_hours)) * 100 > 80
                          ? 'bg-amber-500'
                          : 'bg-blue-600'
                      }`}
                      style={{
                        width: `${Math.min(100, (Number(financial.total_actual_hours_logged || 0) / Number(financial.budgeted_hours)) * 100)}%`
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ClientRelatedRecords({ row }: { row: Row }) {
  const [detail, setDetail] = useState<Row | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.get(`/clients/${row.id}`)
      .then((res: any) => {
        if (alive) setDetail(res.data?.data || res.data);
      })
      .catch((err) => {
        if (alive) setError(errorText(err));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [row.id]);

  if (loading) {
    return <p className="text-xs text-slate-500 py-2">Loading client portfolio...</p>;
  }

  if (error) {
    return <p role="alert" className="text-xs text-red-600 py-2">{error}</p>;
  }

  const projects = detail?.projects || [];
  const products = detail?.mappedProducts || [];

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            {detail?.company_name} — Client Portfolio
          </h4>
          <p className="text-xs text-slate-500">
            Account Manager: {detail?.account_manager_name || 'Unassigned'} • Branch: {detail?.branch_name}
          </p>
        </div>
        <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          {detail?.client_type}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Active Projects */}
        <div className="space-y-2">
          <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider dark:text-slate-300">
            Active Projects ({projects.length})
          </h5>
          {projects.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No custom projects assigned</p>
          ) : (
            <div className="space-y-2">
              {projects.map((p: any) => (
                <div key={p.project_id} className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-2xs dark:border-slate-800 dark:bg-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 dark:text-white">{p.project_name}</span>
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      {p.project_status}
                    </span>
                  </div>
                  <div className="mt-1 flex justify-between text-slate-500 text-[11px]">
                    <span>Code: {p.project_code}</span>
                    <span>Value: {p.currency} {Number(p.contract_amount || 0).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Licenses & AMC */}
        <div className="space-y-2">
          <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider dark:text-slate-300">
            Licensed Products & AMC ({products.length})
          </h5>
          {products.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No product licenses purchased</p>
          ) : (
            <div className="space-y-2">
              {products.map((pr: any) => (
                <div key={pr.mapping_id} className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-2xs dark:border-slate-800 dark:bg-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 dark:text-white">{pr.product_name}</span>
                    <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      {pr.license_status}
                    </span>
                  </div>
                  <div className="mt-1 flex justify-between text-slate-500 text-[11px]">
                    <span>Type: {pr.license_type?.replace(/_/g, ' ')}</span>
                    <span>AMC Renewal: {pr.amc_renewal_date ? String(pr.amc_renewal_date).slice(0, 10) : 'N/A'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SprintRelatedRecords({ row }: { row: Row }) {
  const [activeTab, setActiveTab] = useState<'tasks' | 'ledger' | 'capacity'>('tasks');
  const [addTasksModal, setAddTasksModal] = useState(false);
  const [closeSprintModal, setCloseSprintModal] = useState(false);
  const [targetSprintId, setTargetSprintId] = useState('');
  const [rolloverReason, setRolloverReason] = useState('');
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [scopeReason, setScopeReason] = useState('');
  const [capacityData, setCapacityData] = useState<any>(null);
  const [capacityLoading, setCapacityLoading] = useState(false);
  const [error, setError] = useState('');
  const { hasPermission } = useAuth();
  const canManage = hasPermission('SPRINTS:MANAGE');

  // Load sprint tasks
  const {
    rows: tasks,
    loading: tasksLoading,
    error: tasksError,
    reload: reloadTasks,
  } = useListing<Row>(`/tasks?sprintId=${row.id}&limit=100`);

  // Load candidate backlog tasks for adding into this sprint
  const backlogEndpoint = row.project_id
    ? `/tasks?projectId=${row.project_id}&isBacklog=true&limit=100`
    : row.product_id
      ? `/tasks?productId=${row.product_id}&isBacklog=true&limit=100`
      : null;
  const { rows: backlogTasks, reload: reloadBacklog } = useListing<Row>(backlogEndpoint);

  // Load future sprints for rollover target
  const futureSprintsEndpoint = row.project_id
    ? `/sprints?projectId=${row.project_id}&status=PLANNING`
    : row.product_id
      ? `/sprints?productId=${row.product_id}&status=PLANNING`
      : null;
  const { rows: futureSprints } = useListing<Row>(futureSprintsEndpoint);

  // Load scope ledger
  const {
    rows: scopeLedger,
    loading: ledgerLoading,
    reload: reloadLedger,
  } = useListing<Row>(`/sprints/${row.id}/scope-ledger`);

  const handleStartSprint = async () => {
    if (!window.confirm(`Start sprint "${row.sprint_name}"? This will snapshot the initial commitment baseline.`)) return;
    try {
      await api.post(`/sprints/${row.id}/start`, {});
      window.location.reload();
    } catch (e) {
      setError(errorText(e));
    }
  };

  const handleCloseSprint = async () => {
    try {
      await api.post(`/sprints/${row.id}/close`, {
        targetSprintId: targetSprintId || undefined,
        rolloverReason: rolloverReason || undefined,
      });
      setCloseSprintModal(false);
      window.location.reload();
    } catch (e) {
      setError(errorText(e));
    }
  };

  const handleCalculateCapacity = async () => {
    setCapacityLoading(true);
    try {
      const res = await api.get(`/sprints/${row.id}/capacity`);
      setCapacityData(res.data?.data || res.data);
      setActiveTab('capacity');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setCapacityLoading(false);
    }
  };

  const handleAddTasks = async () => {
    if (selectedTaskIds.length === 0) return;
    try {
      await api.post(`/sprints/${row.id}/tasks`, {
        taskIds: selectedTaskIds,
        scopeChangeReason: scopeReason || undefined,
      });
      setAddTasksModal(false);
      setSelectedTaskIds([]);
      setScopeReason('');
      await reloadTasks();
      if (reloadBacklog) await reloadBacklog();
      if (reloadLedger) await reloadLedger();
    } catch (e) {
      setError(errorText(e));
    }
  };

  const handleRemoveTask = async (taskId: string) => {
    const reason =
      row.status === 'ACTIVE'
        ? window.prompt('Reason for removing task from active sprint (PLAN-001 audit):')
        : null;
    if (row.status === 'ACTIVE' && reason === null) return;
    try {
      await api.delete(`/sprints/${row.id}/tasks/${taskId}`, {
        data: { scopeChangeReason: reason || undefined },
      });
      await reloadTasks();
      if (reloadBacklog) await reloadBacklog();
      if (reloadLedger) await reloadLedger();
    } catch (e) {
      setError(errorText(e));
    }
  };

  const totalPoints = tasks.reduce((sum, t) => sum + Number(t.story_points || 0), 0);
  const totalHours = tasks.reduce((sum, t) => sum + Number(t.estimated_hours || 0), 0);

  return (
    <div className="space-y-6 pt-4 border-t border-slate-200 dark:border-slate-800">
      {/* Sprint Header & KPI Cards */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${
                row.status === 'ACTIVE'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : row.status === 'COMPLETED'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}>
                {row.status}
              </span>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                {row.sprint_name} ({row.sprint_code})
              </h4>
            </div>
            {row.sprint_goal && (
              <p className="mt-1 text-xs italic text-slate-600 dark:text-slate-400">
                "{row.sprint_goal}"
              </p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              Period: {String(row.start_date).slice(0, 10)} to {String(row.end_date).slice(0, 10)}
            </p>
          </div>

          {/* Quick Management Actions */}
          {canManage && (
            <div className="flex flex-wrap items-center gap-2">
              {row.status === 'PLANNING' && (
                <button
                  type="button"
                  className="btn-primary flex items-center gap-1.5"
                  onClick={handleStartSprint}
                >
                  <Play size={14} aria-hidden="true" />
                  Start sprint
                </button>
              )}
              {row.status === 'ACTIVE' && (
                <button
                  type="button"
                  className="btn-primary bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5"
                  onClick={() => setCloseSprintModal(true)}
                >
                  <CheckCircle2 size={14} aria-hidden="true" />
                  Complete sprint
                </button>
              )}
              <button
                type="button"
                className="btn-secondary flex items-center gap-1.5"
                onClick={handleCalculateCapacity}
                disabled={capacityLoading}
              >
                <Gauge size={14} aria-hidden="true" />
                {capacityLoading ? 'Calculating...' : 'Team capacity'}
              </button>
            </div>
          )}
        </div>

        {/* Sprint Metrics Bar */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-800">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Tasks Scope</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-slate-900 dark:text-white">{tasks.length}</span>
              {row.status !== 'PLANNING' && (
                <span className="text-xs text-slate-500">/ {row.committed_tasks_count} committed</span>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-800">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Story Points</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{totalPoints}</span>
              {row.status !== 'PLANNING' && (
                <span className="text-xs text-slate-500">/ {Number(row.committed_story_points || 0)} committed</span>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-800">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Estimated Effort</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-slate-900 dark:text-white">{totalHours}h</span>
              {row.status !== 'PLANNING' && (
                <span className="text-xs text-slate-500">/ {Number(row.committed_hours || 0)}h committed</span>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-800">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Capacity (FND-001)</span>
            <div className="mt-1">
              <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                {row.total_capacity_hours ? `${Number(row.total_capacity_hours)}h` : 'Click Calculate'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}

      {/* Tabs */}
      <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800 w-fit">
        <button
          type="button"
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
            activeTab === 'tasks'
              ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-700 dark:text-white'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
          onClick={() => setActiveTab('tasks')}
        >
          Sprint Tasks ({tasks.length})
        </button>
        <button
          type="button"
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
            activeTab === 'ledger'
              ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-700 dark:text-white'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
          onClick={() => setActiveTab('ledger')}
        >
          Scope Change Ledger ({scopeLedger.length})
        </button>
        {capacityData && (
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === 'capacity'
                ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
            onClick={() => setActiveTab('capacity')}
          >
            Capacity Breakdown
          </button>
        )}
      </div>

      {/* Tab 1: Current Sprint Tasks */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <DataGrid
            title="Sprint Tasks"
            data={tasks}
            loading={tasksLoading}
            error={tasksError}
            onRetry={reloadTasks}
            columns={[
              { id: 'task_code', label: 'Code' },
              { id: 'title', label: 'Title' },
              {
                id: 'hierarchy_level',
                label: 'Tier',
                render: (t) => (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {t.hierarchy_level || 'TASK'}
                  </span>
                ),
              },
              { id: 'status_name', label: 'Status' },
              { id: 'priority', label: 'Priority' },
              { id: 'story_points', label: 'Points', type: 'number' },
              { id: 'estimated_hours', label: 'Est. Hours', type: 'number' },
              {
                id: 'primary_assignee_first_name',
                label: 'Assignee',
                value: (t) =>
                  t.primary_assignee_first_name
                    ? `${t.primary_assignee_first_name} ${t.primary_assignee_last_name || ''}`
                    : 'Unassigned',
              },
            ]}
            onAdd={canManage && row.status !== 'COMPLETED' ? () => setAddTasksModal(true) : undefined}
            addLabel="Add from Backlog"
            actions={
              canManage && row.status !== 'COMPLETED'
                ? [
                    {
                      label: 'Eject',
                      icon: Trash2,
                      danger: true,
                      onClick: (t) => handleRemoveTask(t.id),
                    },
                  ]
                : undefined
            }
          />
        </div>
      )}

      {/* Tab 2: Scope Change Ledger */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="rounded-lg bg-blue-50/50 p-3 text-xs text-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
            <strong>PLAN-001 Scope Ledger:</strong> Preserves baseline commitment and records all additions, removals, and incomplete-task rollovers with audit attributable reasons.
          </div>
          <DataGrid
            title="Sprint Scope Ledger"
            data={scopeLedger}
            loading={ledgerLoading}
            onRetry={reloadLedger}
            columns={[
              { id: 'task_code', label: 'Task Code' },
              { id: 'task_title', label: 'Title' },
              {
                id: 'is_initial_commitment',
                label: 'Entry Type',
                render: (l) => (
                  <span className={`inline-flex rounded px-2 py-0.5 text-[10px] font-bold ${
                    l.is_initial_commitment
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      : l.rollover_from_sprint_id
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                        : l.removed_at
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}>
                    {l.is_initial_commitment
                      ? 'INITIAL COMMITMENT'
                      : l.rollover_from_sprint_id
                        ? `ROLLOVER (${l.rollover_from_sprint_code || 'PREV'})`
                        : l.removed_at
                          ? 'REMOVED'
                          : 'MID-SPRINT ADDITION'}
                  </span>
                ),
              },
              { id: 'story_points', label: 'Points', type: 'number' },
              { id: 'estimated_hours', label: 'Hours', type: 'number' },
              { id: 'scope_change_reason', label: 'Reason / Justification' },
              {
                id: 'added_at',
                label: 'Timestamp',
                value: (l) => String(l.added_at).slice(0, 19).replace('T', ' '),
              },
              {
                id: 'added_by_first_name',
                label: 'Recorded By',
                value: (l) => `${l.added_by_first_name} ${l.added_by_last_name}`,
              },
            ]}
          />
        </div>
      )}

      {/* Tab 3: Team Capacity Breakdown */}
      {activeTab === 'capacity' && capacityData && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h5 className="font-bold text-sm text-slate-900 dark:text-white">
              Team Working Capacity: {capacityData.totalCapacityHours} Hours Total
            </h5>
            <p className="text-xs text-slate-500 mb-4">
              Calculated using each employee's company working calendar (FND-001) minus public holidays and approved leaves.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800">
                    <th className="pb-2">Team Member</th>
                    <th className="pb-2">Project Role</th>
                    <th className="pb-2">Allocation</th>
                    <th className="pb-2">Working Days</th>
                    <th className="pb-2">Holidays</th>
                    <th className="pb-2">Leaves</th>
                    <th className="pb-2">Raw Hours</th>
                    <th className="pb-2 font-bold text-slate-900 dark:text-white">Net Delivery Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {capacityData.members?.map((m: any) => (
                    <tr key={m.userId} className="py-2">
                      <td className="py-2 font-semibold text-slate-900 dark:text-white">{m.name}</td>
                      <td className="py-2 text-slate-600 dark:text-slate-400">{m.projectRole || 'Team Member'}</td>
                      <td className="py-2">{m.allocationPercentage}%</td>
                      <td className="py-2">{m.totalWorkingDays}</td>
                      <td className="py-2 text-amber-600">{m.holidaysCount}</td>
                      <td className="py-2 text-rose-600">{m.leaveDaysCount}</td>
                      <td className="py-2">{m.rawWorkingHours}h</td>
                      <td className="py-2 font-bold text-indigo-600 dark:text-indigo-400">{m.effectiveDeliveryHours}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Tasks from Backlog Modal */}
      {addTasksModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Add Tasks from Backlog"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 text-slate-900 dark:bg-slate-900 dark:text-white"
          >
            <h3 className="mb-2 text-lg font-bold">Add Tasks from Backlog</h3>
            <p className="mb-4 text-xs text-slate-500">
              Select unassigned backlog tasks to pull into {row.sprint_name}.
            </p>

            {row.status === 'ACTIVE' && (
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Scope Change Reason (Required for Active Sprint)
                </label>
                <input
                  type="text"
                  className="form-control mt-1 w-full text-xs"
                  placeholder="e.g. Urgent customer escalation prioritized by PM"
                  value={scopeReason}
                  onChange={(e) => setScopeReason(e.target.value)}
                />
              </div>
            )}

            {backlogTasks.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No available backlog tasks found for this scope.</p>
            ) : (
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {backlogTasks.map((t: any) => {
                  const isChecked = selectedTaskIds.includes(t.id);
                  return (
                    <label key={t.id} className="flex cursor-pointer items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedTaskIds([...selectedTaskIds, t.id]);
                            else setSelectedTaskIds(selectedTaskIds.filter((id) => id !== t.id));
                          }}
                        />
                        <div>
                          <span className="font-semibold text-xs text-slate-900 dark:text-white">{t.task_code}: {t.title}</span>
                          <span className="ml-2 rounded bg-slate-100 px-1 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            {t.status_name}
                          </span>
                        </div>
                      </div>
                      <div className="text-right text-[11px] text-slate-500">
                        <span>{t.story_points ? `${t.story_points} pts` : ''} {t.estimated_hours ? `${t.estimated_hours}h` : ''}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setAddTasksModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={selectedTaskIds.length === 0}
                onClick={handleAddTasks}
              >
                Add {selectedTaskIds.length} Tasks
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Sprint & Rollover Modal */}
      {closeSprintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Complete Sprint"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 text-slate-900 dark:bg-slate-900 dark:text-white"
          >
            <h3 className="mb-2 text-lg font-bold">Complete Sprint: {row.sprint_name}</h3>
            <p className="mb-4 text-xs text-slate-500">
              Completed tasks will be recorded in sprint statistics. Any incomplete tasks can be rolled over to the next sprint or returned to the backlog.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Rollover Incomplete Tasks To (Optional)
                </label>
                <select
                  className="form-control mt-1 w-full text-xs"
                  value={targetSprintId}
                  onChange={(e) => setTargetSprintId(e.target.value)}
                >
                  <option value="">Move back to product/project backlog</option>
                  {futureSprints?.filter((s: any) => s.id !== row.id).map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.sprint_code} — {s.sprint_name}
                    </option>
                  ))}
                </select>
              </div>

              {targetSprintId && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Rollover Justification / Notes
                  </label>
                  <input
                    type="text"
                    className="form-control mt-1 w-full text-xs"
                    placeholder="e.g. Rollover due to delayed external API readiness"
                    value={rolloverReason}
                    onChange={(e) => setRolloverReason(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setCloseSprintModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary bg-emerald-600 hover:bg-emerald-700"
                onClick={handleCloseSprint}
              >
                Confirm & Complete Sprint
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MilestoneRelatedRecords({ row }: { row: Row }) {
  const {
    rows: tasks,
    loading,
    error,
    reload,
  } = useListing<Row>(`/tasks?milestoneId=${row.id}&limit=100`);

  return (
    <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-base font-bold text-slate-900 dark:text-white">
            {row.milestone_name} ({row.milestone_code})
          </h4>
          <p className="text-xs text-slate-500">
            Target Date: {row.target_date ? String(row.target_date).slice(0, 10) : 'Not set'} • Actual Date: {row.actual_date ? String(row.actual_date).slice(0, 10) : 'Pending'} • Status: {row.status}
          </p>
        </div>
      </div>
      <DataGrid
        title="Milestone Delivery Tasks"
        data={tasks}
        loading={loading}
        error={error}
        onRetry={reload}
        columns={[
          { id: 'task_code', label: 'Code' },
          { id: 'title', label: 'Title' },
          { id: 'hierarchy_level', label: 'Tier' },
          { id: 'priority', label: 'Priority' },
          { id: 'status_name', label: 'Status' },
          { id: 'story_points', label: 'Points', type: 'number' },
          { id: 'estimated_hours', label: 'Est. Hours', type: 'number' },
        ]}
      />
    </div>
  );
}

function BlockerRadarView() {
  const [radar, setRadar] = useState<BlockerRadarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [minAgeDays, setMinAgeDays] = useState<number | ''>('');

  // Resolve Blocker Modal State
  const [resolveTarget, setResolveTarget] = useState<TaskBlockerEpisode | null>(null);
  const [resolveOutcome, setResolveOutcome] = useState<'RESOLVED' | 'DISMISSED'>('RESOLVED');
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  // New Blocker Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [availableTasks, setAvailableTasks] = useState<any[]>([]);
  const [createTaskId, setCreateTaskId] = useState('');
  const [createReason, setCreateReason] = useState('');
  const [createCategory, setCreateCategory] = useState('TECHNICAL');
  const [createPriority, setCreatePriority] = useState('MEDIUM');
  const [createNextAction, setCreateNextAction] = useState('');
  const [createExpectedDate, setCreateExpectedDate] = useState('');
  const [createFollowUpDate, setCreateFollowUpDate] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchRadar = async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = {};
      if (categoryFilter) params.category = categoryFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (minAgeDays !== '') params.minAgeDays = Number(minAgeDays);
      const res = await blockersApi.getRadar(params);
      setRadar(res.data);
    } catch (e: any) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRadar();
  }, [categoryFilter, priorityFilter, minAgeDays]);

  const loadTasks = async () => {
    try {
      const res = await api.get('/tasks', { params: { limit: 100 } });
      setAvailableTasks(res.data?.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenCreateModal = () => {
    loadTasks();
    setShowCreateModal(true);
  };

  const handleCreateBlocker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTaskId || !createReason.trim()) return;
    setCreating(true);
    try {
      await blockersApi.create({
        taskId: createTaskId,
        reason: createReason.trim(),
        category: createCategory,
        priority: createPriority,
        nextAction: createNextAction.trim() || undefined,
        expectedResolutionDate: createExpectedDate ? new Date(createExpectedDate).toISOString() : undefined,
        followUpDate: createFollowUpDate ? new Date(createFollowUpDate).toISOString() : undefined,
      });
      setShowCreateModal(false);
      setCreateTaskId('');
      setCreateReason('');
      setCreateNextAction('');
      setCreateExpectedDate('');
      setCreateFollowUpDate('');
      fetchRadar();
    } catch (e: any) {
      alert(errorText(e));
    } finally {
      setCreating(false);
    }
  };

  const handleResolveBlocker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveTarget) return;
    setResolving(true);
    try {
      await blockersApi.resolve(resolveTarget.id, {
        status: resolveOutcome,
        resolutionNotes: resolveNotes.trim() || undefined,
      });
      setResolveTarget(null);
      setResolveNotes('');
      fetchRadar();
    } catch (e: any) {
      alert(errorText(e));
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Blocker Radar KPI Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Blockers</span>
            <AlertOctagon className="h-5 w-5 text-rose-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {radar?.totalActiveBlockers ?? 0}
          </p>
          <span className="text-[11px] text-slate-500">Impacting active delivery</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Critical Blockers</span>
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {radar?.criticalCount ?? 0}
          </p>
          <span className="text-[11px] text-slate-500">Immediate attention needed</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Age Breaches</span>
            <ShieldAlert className="h-5 w-5 text-red-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">
            {radar?.breachedCount ?? 0}
          </p>
          <span className="text-[11px] text-slate-500">&gt;3 days or SLA overdue</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Oldest Blocker</span>
            <Clock className="h-5 w-5 text-indigo-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {radar?.oldestAgeDays ?? 0} <span className="text-xs font-normal text-slate-500">days</span>
          </p>
          <span className="text-[11px] text-slate-500">Longest unresolved</span>
        </div>
      </div>

      {/* Control Bar: Filters & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="form-control text-xs"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="TECHNICAL">Technical</option>
            <option value="DEPENDENCY">Dependency</option>
            <option value="CLIENT">Client</option>
            <option value="ENVIRONMENT">Environment</option>
            <option value="SPECIFICATION">Specification</option>
            <option value="THIRD_PARTY">Third Party</option>
            <option value="RESOURCE">Resource</option>
            <option value="OTHER">Other</option>
          </select>

          <select
            className="form-control text-xs"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <input
            type="number"
            placeholder="Min age (days)"
            className="form-control w-28 text-xs"
            value={minAgeDays}
            onChange={(e) => setMinAgeDays(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>

        <button
          type="button"
          className="btn-primary flex items-center gap-1.5"
          onClick={handleOpenCreateModal}
        >
          <Plus size={14} aria-hidden="true" />
          Log Blocker Episode
        </button>
      </div>

      {/* Category Distribution Chips */}
      {radar?.groupedByCategory && Object.keys(radar.groupedByCategory).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(radar.groupedByCategory).map(([cat, count]) => (
            <span
              key={cat}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
            >
              <span>{cat.replace(/_/g, ' ')}</span>
              <span className="rounded-full bg-slate-200 px-1.5 py-0.2 text-[10px] font-bold dark:bg-slate-700">
                {count}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Active Blockers Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Active Blocker Radar ({radar?.activeBlockers?.length ?? 0})
          </h3>
          <p className="text-xs text-slate-500">
            Real-time queue of all active delivery impediments with SLA age breaches and ownership.
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading blocker radar data...</div>
        ) : error ? (
          <div role="alert" className="p-6 text-center text-xs font-semibold text-rose-600">{error}</div>
        ) : !radar?.activeBlockers || radar.activeBlockers.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 italic">
            Zero active blockers detected! All delivery tracks running smoothly.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Task</th>
                  <th className="px-4 py-3">Blocker Reason & Next Action</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Age / Breach</th>
                  <th className="px-4 py-3">Expected Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {radar.activeBlockers.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-semibold">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] uppercase ${
                          b.priority === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-bold'
                            : b.priority === 'HIGH'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {b.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {b.task_code}
                      </div>
                      <div className="max-w-[180px] truncate text-[11px] text-slate-500">
                        {b.task_title}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-xs font-medium text-slate-800 dark:text-slate-200">
                        {b.reason}
                      </div>
                      {b.next_action && (
                        <div className="mt-0.5 max-w-xs text-[11px] text-indigo-600 dark:text-indigo-400">
                          Next: {b.next_action}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {b.category.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {b.owner_name || <span className="text-slate-400 italic">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold">{b.age_days}d ({b.age_hours}h)</span>
                        {b.is_age_breached && (
                          <span className="rounded bg-rose-100 px-1 py-0.2 text-[9px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                            BREACH
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {b.expected_resolution_date ? String(b.expected_resolution_date).slice(0, 10) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300"
                        onClick={() => {
                          setResolveTarget(b);
                          setResolveOutcome('RESOLVED');
                          setResolveNotes('');
                        }}
                      >
                        Resolve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Blocker Episode Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 text-slate-900 dark:bg-slate-900 dark:text-white">
            <h3 className="mb-2 text-lg font-bold">Log New Blocker Episode</h3>
            <p className="mb-4 text-xs text-slate-500">
              Record a delivery blockage. The selected task will automatically transition to blocked status.
            </p>

            <form onSubmit={handleCreateBlocker} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Target Task *
                </label>
                <select
                  className="form-control mt-1 w-full text-xs"
                  required
                  value={createTaskId}
                  onChange={(e) => setCreateTaskId(e.target.value)}
                >
                  <option value="">Select task...</option>
                  {availableTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.task_code} — {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Blocker Reason *
                </label>
                <textarea
                  className="form-control mt-1 w-full text-xs"
                  rows={3}
                  required
                  placeholder="Describe the exact blocker or impediment..."
                  value={createReason}
                  onChange={(e) => setCreateReason(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Category
                  </label>
                  <select
                    className="form-control mt-1 w-full text-xs"
                    value={createCategory}
                    onChange={(e) => setCreateCategory(e.target.value)}
                  >
                    <option value="TECHNICAL">Technical</option>
                    <option value="DEPENDENCY">Dependency</option>
                    <option value="CLIENT">Client</option>
                    <option value="ENVIRONMENT">Environment</option>
                    <option value="SPECIFICATION">Specification</option>
                    <option value="THIRD_PARTY">Third Party</option>
                    <option value="RESOURCE">Resource</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Priority
                  </label>
                  <select
                    className="form-control mt-1 w-full text-xs"
                    value={createPriority}
                    onChange={(e) => setCreatePriority(e.target.value)}
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Next Action / Mitigation
                </label>
                <input
                  type="text"
                  className="form-control mt-1 w-full text-xs"
                  placeholder="Immediate next step to resolve..."
                  value={createNextAction}
                  onChange={(e) => setCreateNextAction(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Expected Resolution Date
                  </label>
                  <input
                    type="date"
                    className="form-control mt-1 w-full text-xs"
                    value={createExpectedDate}
                    onChange={(e) => setCreateExpectedDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Follow-Up Date
                  </label>
                  <input
                    type="date"
                    className="form-control mt-1 w-full text-xs"
                    value={createFollowUpDate}
                    onChange={(e) => setCreateFollowUpDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={creating}
                >
                  {creating ? 'Logging...' : 'Log Blocker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Blocker Modal */}
      {resolveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 text-slate-900 dark:bg-slate-900 dark:text-white">
            <h3 className="mb-2 text-lg font-bold">Resolve Blocker Episode</h3>
            <p className="mb-4 text-xs text-slate-500">
              For: <span className="font-semibold">{resolveTarget.task_code}</span> — {resolveTarget.reason}
            </p>

            <form onSubmit={handleResolveBlocker} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Resolution Outcome
                </label>
                <select
                  className="form-control mt-1 w-full text-xs"
                  value={resolveOutcome}
                  onChange={(e: any) => setResolveOutcome(e.target.value)}
                >
                  <option value="RESOLVED">Resolved (Impediment cleared)</option>
                  <option value="DISMISSED">Dismissed (No longer applicable / false alarm)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Resolution Notes
                </label>
                <textarea
                  className="form-control mt-1 w-full text-xs"
                  rows={3}
                  placeholder="Explain how this blocker was cleared..."
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                />
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setResolveTarget(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary bg-emerald-600 hover:bg-emerald-700"
                  disabled={resolving}
                >
                  {resolving ? 'Submitting...' : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function PortfolioPage({ screen }: { screen: PortfolioScreen }) {
  if (screen.title === 'Blocker radar') {
    return (
      <div className="space-y-6">
        <div className="page-intro">
          <div>
            <p className="page-eyebrow mb-2">Portfolio</p>
            <h1>{screen.title}</h1>
            <p className="page-description">{screen.description}</p>
          </div>
        </div>
        <BlockerRadarView />
      </div>
    );
  }

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
        : screen.title === 'Sprints'
          ? {
              ...sprintConfig,
              children: (r: Row) => <SprintRelatedRecords row={r} />,
            }
          : screen.title === 'Milestones'
            ? {
                ...milestoneConfig,
                children: (r: Row) => <MilestoneRelatedRecords row={r} />,
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
        children: (r: Row) => <ClientRelatedRecords row={r} />,
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

function CalendarRelatedRecords({ row }: { row: Row }) {
  const [activeTab, setActiveTab] = useState<'holidays' | 'assignments'>('holidays');
  const [holidayForm, setHolidayForm] = useState<Row | null>(null);
  const [assignForm, setAssignForm] = useState<Row | null>(null);
  const [error, setError] = useState('');
  const { hasPermission } = useAuth();
  const canManage = hasPermission('CALENDARS:MANAGE');

  const {
    rows: holidays,
    loading: holidaysLoading,
    error: holidaysError,
    reload: reloadHolidays,
  } = useListing<Row>(`/calendars/${row.id}/holidays`);

  return (
    <div className="space-y-6 pt-4 border-t border-slate-200 dark:border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h4 className="text-base font-bold text-slate-900 dark:text-white">
            {row.calendar_name} ({row.calendar_code})
          </h4>
          <p className="text-xs text-slate-500">
            Timezone: {row.timezone} • Standard: {row.standard_hours_per_day} hrs/day • Mask: {row.working_days_mask}
          </p>
        </div>
        <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === 'holidays'
                ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
            onClick={() => setActiveTab('holidays')}
          >
            Public Holidays ({holidays.length})
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === 'assignments'
                ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
            onClick={() => setActiveTab('assignments')}
          >
            Employee Schedule Assignments
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}

      {activeTab === 'holidays' && (
        <div className="space-y-4">
          <DataGrid
            title="Public Holidays"
            data={holidays}
            loading={holidaysLoading}
            error={holidaysError}
            onRetry={reloadHolidays}
            columns={[
              { id: 'holiday_name', label: 'Holiday' },
              {
                id: 'holiday_date',
                label: 'Date',
                value: (r) => (r.holiday_date ? String(r.holiday_date).slice(0, 10) : ''),
              },
              {
                id: 'is_recurring',
                label: 'Recurring',
                render: (r) => (
                  <span
                    className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${
                      r.is_recurring
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {r.is_recurring ? 'Annual (Recurring)' : 'One-time'}
                  </span>
                ),
              },
              { id: 'description', label: 'Description' },
            ]}
            onAdd={canManage ? () => setHolidayForm({ calendarId: row.id }) : undefined}
            addLabel="Add holiday"
            actions={
              canManage
                ? [
                    {
                      label: 'Delete',
                      icon: Trash2,
                      danger: true,
                      onClick: async (h) => {
                        if (!window.confirm(`Delete holiday "${h.holiday_name}"?`)) return;
                        try {
                          await api.delete(`/calendars/holidays/${h.id}`);
                          await reloadHolidays();
                        } catch (e) {
                          setError(errorText(e));
                        }
                      },
                    },
                  ]
                : undefined
            }
          />
        </div>
      )}

      {activeTab === 'assignments' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h5 className="text-sm font-bold text-slate-900 dark:text-white">
                Assign Working Calendar to Employee
              </h5>
              <p className="text-xs text-slate-500">
                Configure effective date ranges, custom daily hours (part-time), contractor status, and billable targets.
              </p>
            </div>
            {canManage && (
              <button
                type="button"
                className="btn-primary flex items-center gap-1.5"
                onClick={() => setAssignForm({ calendarId: row.id, billableTargetHoursPerWeek: 40 })}
              >
                <Plus size={15} aria-hidden="true" />
                Assign employee
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Tip: Active employees without a custom direct assignment inherit their Branch standard calendar or Corporate Default ({row.calendar_code}).
          </p>
        </div>
      )}

      {/* Holiday Modal */}
      {holidayForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Add Public Holiday"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 text-slate-900 dark:bg-slate-900 dark:text-white"
          >
            <h3 className="mb-4 text-lg font-bold">Add Public Holiday</h3>
            <RecordForm
              fields={holidayFields}
              initial={holidayForm}
              onCancel={() => setHolidayForm(null)}
              onSave={async (values) => {
                try {
                  await api.post('/calendars/holidays', {
                    ...values,
                    calendarId: row.id,
                  });
                  setHolidayForm(null);
                  await reloadHolidays();
                } catch (e) {
                  setError(errorText(e));
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {assignForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Assign Working Calendar to Employee"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 text-slate-900 dark:bg-slate-900 dark:text-white"
          >
            <h3 className="mb-4 text-lg font-bold">Assign Calendar to Employee</h3>
            <RecordForm
              fields={assignmentFields}
              initial={assignForm}
              onCancel={() => setAssignForm(null)}
              onSave={async (values) => {
                try {
                  await api.post('/calendars/assignments', {
                    ...values,
                    calendarId: row.id,
                  });
                  setAssignForm(null);
                  alert('Schedule assigned successfully to employee!');
                } catch (e) {
                  setError(errorText(e));
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminPage({ screen }: { screen: AdminScreen }) {
  const { hasPermission, user } = useAuth();
  const isSuperAdmin = user?.role_code === 'ROLE_SUPER_ADMIN';

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
    'Working calendars': {
      ...calendarConfig,
      detail: true,
      children: (r: Row) => <CalendarRelatedRecords row={r} />,
    },
    'Employee leaves': {
      ...leaveConfig,
      detail: false,
      actions: (r: Row, reload: () => void) => (
        <div className="flex items-center gap-1">
          {r.status === 'PENDING' && (isSuperAdmin || hasPermission('LEAVES:MANAGE')) && (
            <>
              <button
                type="button"
                className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300"
                onClick={async () => {
                  try {
                    await api.patch(`/calendars/leaves/${r.id}/review`, { status: 'APPROVED' });
                    reload();
                  } catch (e) {
                    alert(errorText(e));
                  }
                }}
              >
                Approve
              </button>
              <button
                type="button"
                className="rounded bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800 hover:bg-rose-200 dark:bg-rose-950/60 dark:text-rose-300"
                onClick={async () => {
                  try {
                    await api.patch(`/calendars/leaves/${r.id}/review`, { status: 'REJECTED' });
                    reload();
                  } catch (e) {
                    alert(errorText(e));
                  }
                }}
              >
                Reject
              </button>
            </>
          )}
        </div>
      ),
    },
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
