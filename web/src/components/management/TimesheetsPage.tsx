import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { RecordForm, Row, allRows, errorText } from './EntityManager';
import { f, ref } from './config';
import { useListing } from '../../hooks/useListing';
import { DataGrid } from '../common/DataGrid';
import { Send, ClipboardCheck, Clock, CheckCircle2, AlertCircle, Calendar, TableProperties } from 'lucide-react';
import { WeeklyTimesheetView } from '../timesheets/WeeklyTimesheetView';

const fields = [
  ref('taskId', 'Task', '/tasks', 'title', true),
  f('logDate', 'Work date', { type: 'date', required: true }),
  f('hoursSpent', 'Hours spent', {
    type: 'number',
    min: 1 / 60,
    max: 24,
    required: true,
  }),
  f('description', 'Work summary', { type: 'textarea', required: true }),
  f('isBillable', 'Billable', { type: 'checkbox', default: true }),
  f('isOvertime', 'Overtime', { type: 'checkbox' }),
  f('isWeekend', 'Weekend work', { type: 'checkbox' }),
];

export function TimesheetsPage() {
  const { user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'weekly' | 'logs'>('weekly');
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [startDate, setStart] = useState('');
  const [endDate, setEnd] = useState('');
  const [approvalStatus, setApprovalStatus] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [employees, setEmployees] = useState<Row[]>([]);
  const [reviewing, setReviewing] = useState<Row | null>(null);

  const canApprove = hasPermission('TIMELOGS:APPROVE');

  useEffect(() => {
    if (canApprove) {
      allRows('/users')
        .then(setEmployees)
        .catch(() => {});
    }
  }, [canApprove]);

  const {
    rows,
    loading,
    error: loadError,
    reload: load,
  } = useListing<Row>('/time-logs', {
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    approvalStatus: approvalStatus || undefined,
    userId: selectedUserId || undefined,
  });

  const totalHours = rows.reduce((acc, r) => acc + (Number(r.hours_spent) || 0), 0);
  const billableHours = rows.filter((r) => r.is_billable).reduce((acc, r) => acc + (Number(r.hours_spent) || 0), 0);
  const overtimeHours = rows.filter((r) => r.is_overtime).reduce((acc, r) => acc + (Number(r.hours_spent) || 0), 0);
  const pendingCount = rows.filter((r) => r.approval_status === 'SUBMITTED').length;

  return (
    <section className="space-y-6">
      {/* View Switcher Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('weekly')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
            activeTab === 'weekly'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="h-4 w-4" />
          Weekly Timesheet & Portions
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
            activeTab === 'logs'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <TableProperties className="h-4 w-4" />
          Detailed Worklogs
        </button>
      </div>

      {activeTab === 'weekly' ? (
        <WeeklyTimesheetView />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Detailed Work Logs & Approvals
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Granular worklog entries, billable tags, and individual time log records.
              </p>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Clock className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-medium uppercase tracking-wider">Total Hours</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {totalHours.toFixed(1)} <span className="text-xs font-normal text-slate-500">hrs</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-medium uppercase tracking-wider">Billable Hours</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {billableHours.toFixed(1)} <span className="text-xs font-normal text-slate-500">hrs</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Calendar className="h-4 w-4 text-purple-500" />
            <span className="text-xs font-medium uppercase tracking-wider">Overtime</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-purple-600 dark:text-purple-400">
            {overtimeHours.toFixed(1)} <span className="text-xs font-normal text-slate-500">hrs</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-medium uppercase tracking-wider">Pending Review</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {pendingCount} <span className="text-xs font-normal text-slate-500">logs</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/60">
        <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
          <span>From:</span>
          <input
            aria-label="From date"
            className="form-control text-xs"
            type="date"
            value={startDate}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>

        <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
          <span>To:</span>
          <input
            aria-label="To date"
            className="form-control text-xs"
            type="date"
            value={endDate}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>

        <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
          <span>Status:</span>
          <select
            aria-label="Approval status filter"
            className="form-control text-xs"
            value={approvalStatus}
            onChange={(e) => setApprovalStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft (Not submitted)</option>
            <option value="SUBMITTED">Submitted (Pending review)</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </label>

        {canApprove && (
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            <span>Employee:</span>
            <select
              aria-label="Employee filter"
              className="form-control text-xs"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name} ({emp.employee_code})
                </option>
              ))}
            </select>
          </label>
        )}

        {(startDate || endDate || approvalStatus || selectedUserId) && (
          <button
            type="button"
            onClick={() => {
              setStart('');
              setEnd('');
              setApprovalStatus('');
              setSelectedUserId('');
            }}
            className="text-xs text-blue-600 underline hover:text-blue-800 dark:text-blue-400"
          >
            Clear filters
          </button>
        )}
      </div>

      <DataGrid
        title="Timesheets"
        data={rows}
        loading={loading}
        error={loadError || error}
        onRetry={() => {
          setError('');
          void load();
        }}
        columns={[
          {
            id: 'log_date',
            label: 'Date',
            value: (r) => String(r.log_date).slice(0, 10),
          },
          { id: 'user_name', label: 'Employee' },
          { id: 'task_title', label: 'Task' },
          { id: 'description', label: 'Summary' },
          { id: 'hours_spent', label: 'Hours', type: 'number' },
          {
            id: 'is_billable',
            label: 'Billable',
            render: (r) => (
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  r.is_billable
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {r.is_billable ? 'Billable' : 'Non-billable'}
              </span>
            ),
          },
          {
            id: 'type_tags',
            label: 'Type',
            value: (r) => [r.is_overtime ? 'Overtime' : null, r.is_weekend ? 'Weekend' : null].filter(Boolean).join(', ') || 'Standard',
          },
          {
            id: 'approval_status',
            label: 'Approval Status',
            render: (r) => {
              const status = r.approval_status || 'DRAFT';
              const colors: Record<string, string> = {
                DRAFT: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                SUBMITTED: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
                APPROVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
                REJECTED: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300',
              };
              return (
                <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${colors[status] || colors.DRAFT}`}>
                  {status}
                </span>
              );
            },
          },
          { id: 'review_remarks', label: 'Review Remarks' },
        ]}
        onAdd={hasPermission('TIMELOGS:LOG_OWN') ? () => setAdding(true) : undefined}
        addLabel="Log Work"
        actions={[
          {
            label: 'Submit',
            icon: Send,
            hidden: (r) =>
              r.user_id !== user?.id ||
              !['DRAFT', 'REJECTED'].includes(r.approval_status || 'DRAFT'),
            onClick: async (r) => {
              try {
                await api.patch(`/time-logs/${r.id}/submit`);
                await load();
              } catch (e) {
                setError(errorText(e));
              }
            },
          },
          {
            label: 'Review',
            icon: ClipboardCheck,
            hidden: (r) =>
              !canApprove ||
              r.user_id === user?.id ||
              r.approval_status !== 'SUBMITTED',
            onClick: (r) => setReviewing(r),
          },
        ]}
      />

      {adding && (
        <div className="entity-panel">
          <RecordForm
            fields={fields}
            initial={{ logDate: new Date().toISOString().slice(0, 10) }}
            onCancel={() => setAdding(false)}
            onSave={async (values) => {
              await api.post('/time-logs', values);
              setAdding(false);
              await load();
            }}
          />
        </div>
      )}

          {reviewing && (
            <RecordForm
              fields={[
                f('status', 'Decision', {
                  required: true,
                  options: ['APPROVED', 'REJECTED'],
                }),
                f('remarks', 'Review Remarks', { type: 'textarea' }),
              ]}
              onCancel={() => setReviewing(null)}
              onSave={async (values) => {
                await api.patch(`/time-logs/${reviewing.id}/review`, values);
                setReviewing(null);
                await load();
              }}
            />
          )}
        </div>
      )}
    </section>
  );
}
