import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { RecordForm, Row, errorText, rowsOf } from './EntityManager';
import { f, ref } from './config';
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
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [startDate, setStart] = useState('');
  const [endDate, setEnd] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [reviewing, setReviewing] = useState<Row | null>(null);
  const load = async () => {
    try {
      const res: any = await api.get('/time-logs', {
        params: {
          page,
          limit: 20,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      });
      setRows(rowsOf(res));
      setPages(res.data.totalPages);
      setError('');
    } catch (e) {
      setError(errorText(e));
    }
  };
  useEffect(() => {
    load();
  }, [page, startDate, endDate]);
  return (
    <section className="entity-panel space-y-5">
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
              setPage(1);
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
              setPage(1);
            }}
          />
        </label>
        {hasPermission('TIMELOGS:LOG_OWN') && (
          <button
            className="rounded bg-blue-600 px-3 py-2 text-white"
            onClick={() => setAdding(true)}
          >
            Log work
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="data-table w-full text-left text-sm">
          <thead>
            <tr>
              {[
                'Date',
                'Employee',
                'Task',
                'Summary',
                'Hours',
                'Billable',
                'Status',
                'Actions',
              ].map((h) => (
                <th className="p-3" key={h}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-200 dark:border-slate-700">
                <td className="p-3">{String(r.log_date).slice(0, 10)}</td>
                <td className="p-3">{r.user_name}</td>
                <td className="p-3">{r.task_title}</td>
                <td className="p-3">{r.description}</td>
                <td className="p-3">{r.hours_spent}</td>
                <td className="p-3">{r.is_billable ? 'Yes' : 'No'}</td>
                <td className="p-3">
                  {r.approval_status || 'DRAFT'}
                  {r.review_remarks && <p>{r.review_remarks}</p>}
                </td>
                <td className="p-3">
                  {r.user_id === user?.id &&
                    ['DRAFT', 'REJECTED'].includes(
                      r.approval_status || 'DRAFT',
                    ) && (
                      <button
                        onClick={async () => {
                          try {
                            await api.patch(`/time-logs/${r.id}/submit`);
                            await load();
                          } catch (e) {
                            setError(errorText(e));
                          }
                        }}
                      >
                        Submit
                      </button>
                    )}
                  {hasPermission('TIMELOGS:APPROVE') &&
                    r.user_id !== user?.id &&
                    r.approval_status === 'SUBMITTED' && (
                      <button onClick={() => setReviewing(r)}>Review</button>
                    )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-4">
        <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>
        <span>
          Page {page} of {pages || 1}
        </span>
        <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
          Next
        </button>
      </div>
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
