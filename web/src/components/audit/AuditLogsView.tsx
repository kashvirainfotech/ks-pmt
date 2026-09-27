import React, { useState } from 'react';
import { AuditLogItem } from '../../types';
import { useListing } from '../../hooks/useListing';
import { DataGrid } from '../common/DataGrid';
import { Eye, X } from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const [actionType, setActionType] = useState('');
  const [entityName, setEntityName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const {
    rows: logs,
    loading,
    error,
    reload: fetchLogs,
  } = useListing<AuditLogItem>('/audit-logs', {
    actionType: actionType || undefined,
    entityName: entityName || undefined,
    startDate: startDate || undefined,
    endDate: endDate ? `${endDate}T23:59:59.999` : undefined,
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Security & Central Audit Trail
        </h1>
        <p className="text-xs text-slate-400">
          Immutable system-wide event logs, access tracking and state transition
          history
        </p>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <select
          value={actionType}
          aria-label="Action type"
          onChange={(e) => {
            setActionType(e.target.value);
          }}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="">All Action Types</option>
          {[
            'INSERT',
            'UPDATE',
            'DELETE',
            'LOGIN',
            'LOGOUT',
            'DOWNLOAD',
            'LOGIN_SUCCESS',
            'LOGIN_FAILED',
          ].map((action) => (
            <option key={action} value={action}>
              {action.replace(/_/g, ' ')}
            </option>
          ))}
        </select>

        <select
          value={entityName}
          aria-label="Entity"
          onChange={(e) => {
            setEntityName(e.target.value);
          }}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="">All Entities</option>
          <option value="users">Users</option>
          <option value="tasks">Tasks</option>
          <option value="projects">Projects</option>
          <option value="attachments">Attachments</option>
          <option value="task_time_logs">Time Logs</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-3">
        <label>
          From{' '}
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
            }}
          />
        </label>
        <label>
          To{' '}
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
            }}
          />
        </label>
      </div>
      <DataGrid
        title="Audit trail"
        data={logs}
        loading={loading}
        error={error}
        onRetry={fetchLogs}
        columns={[
          {
            id: 'created_at',
            label: 'Timestamp',
            render: (log) => new Date(log.created_at).toLocaleString(),
          },
          {
            id: 'user_name',
            label: 'User',
            value: (log) => log.user_name || 'System Actor',
          },
          { id: 'action_type', label: 'Action' },
          { id: 'entity_name', label: 'Entity' },
          {
            id: 'device_platform',
            label: 'Platform',
            value: (log) => log.device_platform || 'WEB',
          },
          { id: 'ip_address', label: 'IP address' },
        ]}
        actions={[
          { label: 'View', icon: Eye, onClick: (log) => setSelectedLog(log) },
        ]}
      />
      {/* JSON Diff & Audit Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Audit Event Details: {selectedLog.action_type}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Record ID: {selectedLog.record_id || 'N/A'}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 p-2.5 dark:border-slate-800">
                  <span className="text-slate-400">User / Actor</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedLog.user_name || 'System / Anonymous'} (
                    {selectedLog.user_email || 'N/A'})
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-2.5 dark:border-slate-800">
                  <span className="text-slate-400">Timestamp</span>
                  <p className="font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                    {new Date(selectedLog.created_at).toISOString()}
                  </p>
                </div>
              </div>

              {selectedLog.remarks && (
                <div className="rounded-xl border border-slate-200 p-2.5 dark:border-slate-800">
                  <span className="text-slate-400">Remarks</span>
                  <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                    {selectedLog.remarks}
                  </p>
                </div>
              )}

              {/* JSON Diff: Old vs New Values */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <h4 className="font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Previous State (Old Values)
                  </h4>
                  <pre className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] font-mono text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 max-h-48 overflow-y-auto">
                    {selectedLog.old_values
                      ? JSON.stringify(selectedLog.old_values, null, 2)
                      : 'null'}
                  </pre>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Updated State (New Values)
                  </h4>
                  <pre className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] font-mono text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 max-h-48 overflow-y-auto">
                    {selectedLog.new_values
                      ? JSON.stringify(selectedLog.new_values, null, 2)
                      : 'null'}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
