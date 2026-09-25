import React, { useState, useEffect } from 'react';
import { timeLogsApi } from '../../api/endpoints';
import { TimeLog } from '../../types';
import { Clock, Plus, CheckCircle2, Calendar, FileText } from 'lucide-react';

export const TimesheetView: React.FC = () => {
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res: any = await timeLogsApi.getTimeLogs({ limit: 100 });
      setTimeLogs(res?.data?.timeLogs || res?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const totalMinutes = timeLogs.reduce((sum, tl) => sum + (parseInt(tl.duration_minutes as any, 10) || 0), 0);
  const totalBillableMinutes = timeLogs
    .filter((tl) => tl.is_billable)
    .reduce((sum, tl) => sum + (parseInt(tl.duration_minutes as any, 10) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Timesheets & Effort Logs
          </h1>
          <p className="text-xs text-slate-400">
            Personal and team working hour audit logs with billable effort classification
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-500">Total Logged Hours</span>
          <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            {(totalMinutes / 60).toFixed(1)} hrs
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-500">Billable Hours</span>
          <p className="mt-2 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {(totalBillableMinutes / 60).toFixed(1)} hrs
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-500">Timesheet Entries</span>
          <p className="mt-2 text-2xl font-extrabold text-blue-600 dark:text-blue-400">
            {timeLogs.length} logs
          </p>
        </div>
      </div>

      {/* Timesheet Entries Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50/70 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Task</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Billable</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {timeLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  No worklogs recorded yet
                </td>
              </tr>
            ) : (
              timeLogs.map((tl) => (
                <tr key={tl.id}>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                    {tl.log_date}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">
                    {tl.user_name || 'Current User'}
                  </td>
                  <td className="px-4 py-3 text-blue-600 dark:text-blue-400 truncate max-w-xs">
                    {tl.task_title || 'General Task'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 truncate max-w-sm">
                    {tl.description || '—'}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                    {(tl.duration_minutes / 60).toFixed(1)}h
                  </td>
                  <td className="px-4 py-3">
                    {tl.is_billable ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                        Billable
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[10px]">Non-billable</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {tl.is_approved ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" /> Approved
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800">
                        Submitted
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
