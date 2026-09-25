import React, { useState, useEffect } from 'react';
import { auditLogsApi } from '../../api/endpoints';
import { AuditLogItem } from '../../types';
import { ShieldCheck, Search, Filter, Eye, X, Globe, Smartphone, Monitor } from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionType, setActionType] = useState('');
  const [entityName, setEntityName] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res: any = await auditLogsApi.getAuditLogs({
        actionType: actionType || undefined,
        entityName: entityName || undefined,
        limit: 50,
      });
      setLogs(res?.data?.auditLogs || res?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionType, entityName]);

  const getPlatformIcon = (platform?: string) => {
    if (platform === 'ANDROID' || platform === 'IOS') {
      return <Smartphone className="h-3.5 w-3.5 text-blue-500" />;
    }
    return <Monitor className="h-3.5 w-3.5 text-slate-400" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Security & Central Audit Trail
        </h1>
        <p className="text-xs text-slate-400">
          Immutable system-wide event logs, access tracking and state transition history
        </p>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <select
          value={actionType}
          onChange={(e) => setActionType(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="">All Action Types</option>
          <option value="LOGIN_SUCCESS">Login Success</option>
          <option value="LOGIN_FAILED">Login Failed</option>
          <option value="TASK_CREATED">Task Created</option>
          <option value="STATUS_CHANGED">Status Changed</option>
          <option value="FILE_ATTACHED">File Attached</option>
          <option value="TIME_LOGGED">Time Logged</option>
        </select>

        <select
          value={entityName}
          onChange={(e) => setEntityName(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="">All Entities</option>
          <option value="users">Users</option>
          <option value="tasks">Tasks</option>
          <option value="projects">Projects</option>
          <option value="attachments">Attachments</option>
          <option value="time_logs">Time Logs</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50/70 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Platform</th>
              <th className="px-4 py-3">IP Address</th>
              <th className="px-4 py-3 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  No audit logs match current filters
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                >
                  <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                    {log.user_name || 'System Actor'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                      {log.action_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                    {log.entity_name}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      {getPlatformIcon(log.device_platform)}
                      <span>{log.device_platform || 'WEB'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                    {log.ip_address || '127.0.0.1'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="rounded p-1 text-slate-400 hover:text-blue-600">
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* JSON Diff & Audit Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Audit Event Details: {selectedLog.action_type}
                </h3>
                <p className="text-[11px] text-slate-400">Record ID: {selectedLog.record_id || 'N/A'}</p>
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
                    {selectedLog.user_name || 'System / Anonymous'} ({selectedLog.user_email || 'N/A'})
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
                  <p className="text-slate-700 dark:text-slate-300 mt-0.5">{selectedLog.remarks}</p>
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
