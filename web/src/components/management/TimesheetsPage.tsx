import React, { useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { RecordForm, Row, errorText } from './EntityManager';
import { f, ref } from './config';
import { useListing } from '../../hooks/useListing';
import { DataGrid } from '../common/DataGrid';
import { Send, ClipboardCheck } from 'lucide-react';
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
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [startDate, setStart] = useState('');
  const [endDate, setEnd] = useState('');
  const [reviewing, setReviewing] = useState<Row | null>(null);
  const {
    rows,
    loading,
    error: loadError,
    reload: load,
  } = useListing<Row>('/time-logs', {
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });
  return (
    <section className="space-y-5">
      <h1 className="text-xl font-bold">Timesheets and approvals</h1>
      <div className="flex flex-wrap gap-4">
        <label>
          From{' '}
          <input
            aria-label="From date"
            className="form-control"
            type="date"
            value={startDate}
            onChange={(e) => {
              setStart(e.target.value);
            }}
          />
        </label>
        <label>
          To{' '}
          <input
            aria-label="To date"
            className="form-control"
            type="date"
            value={endDate}
            onChange={(e) => {
              setEnd(e.target.value);
            }}
          />
        </label>
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
          { id: 'is_billable', label: 'Billable' },
          {
            id: 'approval_status',
            label: 'Status',
            value: (r) => r.approval_status || 'DRAFT',
          },
          { id: 'review_remarks', label: 'Review remarks' },
        ]}
        onAdd={
          hasPermission('TIMELOGS:LOG_OWN') ? () => setAdding(true) : undefined
        }
        addLabel="Log work"
        actions={[
          {
            label: 'Submit',
            icon: Send,
            hidden: (r) =>
              r.user_id !== user?.id ||
              !['DRAFT', 'REJECTED'].includes(r.approval_status || 'DRAFT'),
            onClick: async (r) => {
              await api.patch(`/time-logs/${r.id}/submit`);
              await load();
            },
          },
          {
            label: 'Review',
            icon: ClipboardCheck,
            hidden: (r) =>
              !hasPermission('TIMELOGS:APPROVE') ||
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
            f('remarks', 'Review remarks', { type: 'textarea' }),
          ]}
          onCancel={() => setReviewing(null)}
          onSave={async (values) => {
            await api.patch(`/time-logs/${reviewing.id}/review`, values);
            setReviewing(null);
            await load();
          }}
        />
      )}
    </section>
  );
}
