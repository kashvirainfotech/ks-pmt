import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTimer } from '../../context/TimerContext';
import { timesheetsApi, tasksApi } from '../../api/endpoints';
import {
  WeeklyTimesheetResponse,
  TimesheetProjectPortion,
  WeeklyTimesheetGridItem,
  User,
} from '../../types';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Send,
  RotateCcw,
  ShieldCheck,
  Check,
  X,
  FileText,
  UserCheck,
} from 'lucide-react';
import api from '../../api/client';

export const WeeklyTimesheetView: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const { startTimer, timer } = useTimer();

  // Current selected Monday date in YYYY-MM-DD format
  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    return monday.toISOString().slice(0, 10);
  };

  const [currentMonday, setCurrentMonday] = useState<string>(() => getMonday(new Date()));
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  const [data, setData] = useState<WeeklyTimesheetResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Modals state
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitRemarks, setSubmitRemarks] = useState('');
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [reviewingPortion, setReviewingPortion] = useState<TimesheetProjectPortion | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const canApprove = hasPermission('TIMESHEETS:APPROVE') || hasPermission('TIMELOGS:APPROVE') || user?.role_code === 'ROLE_SUPER_ADMIN';

  // Load team users if reviewer/manager
  useEffect(() => {
    if (canApprove) {
      api.get('/users')
        .then((res: any) => {
          const list = res.data?.users || res.data || [];
          setUsers(Array.isArray(list) ? list : []);
        })
        .catch(() => {});
    }
  }, [canApprove]);

  const loadTimesheet = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await timesheetsApi.getWeekly({
        startDate: currentMonday,
        userId: selectedUserId || undefined,
      });
      setData((res as any)?.data || res);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to load weekly timesheet');
    } finally {
      setLoading(false);
    }
  }, [currentMonday, selectedUserId]);

  useEffect(() => {
    loadTimesheet();
  }, [loadTimesheet]);

  // Week navigation helpers
  const handlePrevWeek = () => {
    const d = new Date(currentMonday);
    d.setDate(d.getDate() - 7);
    setCurrentMonday(d.toISOString().slice(0, 10));
  };

  const handleNextWeek = () => {
    const d = new Date(currentMonday);
    d.setDate(d.getDate() + 7);
    setCurrentMonday(d.toISOString().slice(0, 10));
  };

  const handleThisWeek = () => {
    setCurrentMonday(getMonday(new Date()));
  };

  // Submission handler
  const handleSubmitTimesheet = async () => {
    if (!data?.timesheet) return;
    setActionLoading(true);
    try {
      await timesheetsApi.submitTimesheet(data.timesheet.id, { remarks: submitRemarks });
      setIsSubmitModalOpen(false);
      setSubmitRemarks('');
      await loadTimesheet();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to submit timesheet');
    } finally {
      setActionLoading(false);
    }
  };

  // Reopen handler
  const handleReopenTimesheet = async () => {
    if (!data?.timesheet) return;
    setActionLoading(true);
    try {
      await timesheetsApi.reopenTimesheet(data.timesheet.id, { reason: reopenReason });
      setIsReopenModalOpen(false);
      setReopenReason('');
      await loadTimesheet();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to reopen timesheet');
    } finally {
      setActionLoading(false);
    }
  };

  // Review Portion handler
  const handleReviewPortion = async () => {
    if (!reviewingPortion) return;
    setActionLoading(true);
    try {
      await timesheetsApi.reviewPortion(reviewingPortion.id, {
        status: reviewDecision,
        remarks: reviewRemarks,
      });
      setReviewingPortion(null);
      setReviewRemarks('');
      await loadTimesheet();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to submit portion review');
    } finally {
      setActionLoading(false);
    }
  };

  // Compute total daily sums across grid
  const days: Array<'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'> = [
    'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun',
  ];

  const dailyTotals = days.reduce((acc, day) => {
    acc[day] = data?.grid.reduce((sum, item) => sum + (Number(item.dailyHours[day]) || 0), 0) || 0;
    return acc;
  }, {} as Record<string, number>);

  // Format week range label
  const getWeekRangeLabel = (mondayStr: string) => {
    const mon = new Date(mondayStr);
    const sun = new Date(mon);
    sun.setDate(sun.getDate() + 6);
    return `${mon.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} – ${sun.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const timesheet = data?.timesheet;
  const summary = data?.summary;
  const portions = data?.portions || [];
  const grid = data?.grid || [];

  const isOwner = !selectedUserId || selectedUserId === user?.id;
  const isDraftOrRejected = timesheet?.status === 'DRAFT' || timesheet?.status === 'REJECTED';
  const canSubmit = isOwner && isDraftOrRejected && (summary?.totalLoggedHours || 0) > 0;
  const canReopen = (canApprove || isOwner) && (timesheet?.status === 'SUBMITTED' || timesheet?.status === 'APPROVED');

  const statusBadgeColors: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    SUBMITTED: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    REJECTED: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Weekly Timesheets
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Monday–Sunday weekly effort ledger, calendar expected hours, and cross-project portion approvals.
          </p>
        </div>

        {/* User filter for managers/approvers */}
        {canApprove && (
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-slate-400" />
            <select
              aria-label="Filter by employee"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">My Timesheet ({user?.first_name} {user?.last_name})</option>
              {users
                .filter((u) => u.id !== user?.id)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.first_name} {u.last_name} ({u.employee_code || u.email})
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>

      {/* Week Selector & Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevWeek}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            title="Previous Week"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={handleThisWeek}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            Current Week
          </button>
          <button
            onClick={handleNextWeek}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            title="Next Week"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <span className="ml-2 font-semibold text-sm text-slate-800 dark:text-slate-100">
            {getWeekRangeLabel(currentMonday)}
          </span>
        </div>

        {/* Status & Primary Actions */}
        <div className="flex items-center gap-2">
          {timesheet && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-bold tracking-wide uppercase ${
                statusBadgeColors[timesheet.status] || statusBadgeColors.DRAFT
              }`}
            >
              {timesheet.status}
              {timesheet.revision > 1 && (
                <span className="text-[10px] opacity-75 font-normal">
                  (Rev {timesheet.revision})
                </span>
              )}
            </span>
          )}

          {canSubmit && (
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition"
            >
              <Send className="h-3.5 w-3.5" />
              Submit Weekly Timesheet
            </button>
          )}

          {canReopen && (
            <button
              onClick={() => setIsReopenModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              title="Reopen timesheet for corrections"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reopen
            </button>
          )}
        </div>
      </div>

      {/* Rejection Banner Alert */}
      {timesheet?.status === 'REJECTED' && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
          <XCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-rose-900 dark:text-rose-200">
              Timesheet Rejected by Reviewer
            </h4>
            <p className="mt-1">
              {timesheet.rejection_reason || 'No specific rejection details provided.'}
            </p>
            <p className="mt-1.5 text-[11px] text-rose-600 dark:text-rose-400">
              Please adjust your work logs or log missing hours, then re-submit.
            </p>
          </div>
        </div>
      )}

      {/* Summary KPI Cards & Calendar Expected Hours Indicator */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <Calendar className="h-4 w-4 text-indigo-500" />
              <span className="text-xs font-semibold uppercase tracking-wider">Expected Capacity</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
              {Number(summary.expectedHours).toFixed(1)} <span className="text-xs font-normal text-slate-500">hrs</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Per working calendar & leaves
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-semibold uppercase tracking-wider">Logged Hours</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
              {Number(summary.totalLoggedHours).toFixed(1)} <span className="text-xs font-normal text-slate-500">hrs</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Total across all projects
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-semibold uppercase tracking-wider">Billable Hours</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {Number(summary.totalBillableHours).toFixed(1)} <span className="text-xs font-normal text-slate-500">hrs</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Client chargeable
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <Clock className="h-4 w-4 text-purple-500" />
              <span className="text-xs font-semibold uppercase tracking-wider">Overtime</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-purple-600 dark:text-purple-400">
              {Number(summary.totalOvertimeHours).toFixed(1)} <span className="text-xs font-normal text-slate-500">hrs</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Beyond shift threshold
            </p>
          </div>

          <div className={`rounded-xl border p-4 shadow-xs ${
            summary.missingHours > 0
              ? 'border-amber-200 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/30'
              : 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/60 dark:bg-emerald-950/30'
          }`}>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              {summary.missingHours > 0 ? (
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              )}
              <span className="text-xs font-semibold uppercase tracking-wider">
                {summary.missingHours > 0 ? 'Missing Capacity' : 'Target Met'}
              </span>
            </div>
            <div className={`mt-2 text-2xl font-bold ${
              summary.missingHours > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'
            }`}>
              {summary.missingHours > 0 ? `${Number(summary.missingHours).toFixed(1)} hrs` : '100%'}
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {summary.missingHours > 0 ? 'Deficit from expected capacity' : 'Full working capacity logged'}
            </p>
          </div>
        </div>
      )}

      {/* Weekly Timesheet Grid (Mon–Sun) */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40">
          <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100 flex items-center justify-between">
            <span>Weekly Effort Matrix (Mon – Sun)</span>
            <span className="text-xs font-normal text-slate-500">
              {grid.length} task{grid.length === 1 ? '' : 's'} recorded
            </span>
          </h3>
        </div>

        {grid.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 space-y-2">
            <Clock className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="font-semibold text-slate-600 dark:text-slate-300">
              No time logged for this week yet
            </p>
            <p className="max-w-md mx-auto text-slate-400">
              Log time from the Task workspace or start the global timer on an active task to automatically populate this weekly sheet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                  <th className="py-3 px-4 min-w-[280px]">Task & Project</th>
                  {days.map((day) => (
                    <th key={day} className="py-3 px-3 text-center min-w-[65px]">
                      {day}
                    </th>
                  ))}
                  <th className="py-3 px-4 text-center font-bold min-w-[80px]">Total</th>
                  <th className="py-3 px-3 text-center min-w-[70px]">Timer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {grid.map((item) => (
                  <tr key={item.taskId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0">
                          {item.taskCode}
                        </span>
                        <span className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1">
                          {item.taskTitle}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {item.projectName}
                        </span>
                        {item.isBillable && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            Billable
                          </span>
                        )}
                      </div>
                    </td>

                    {days.map((day) => {
                      const hrs = Number(item.dailyHours[day]) || 0;
                      return (
                        <td key={day} className="py-3 px-3 text-center font-mono">
                          {hrs > 0 ? (
                            <span className="inline-block rounded-md bg-blue-50 px-1.5 py-0.5 font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                              {hrs.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-700">—</span>
                          )}
                        </td>
                      );
                    })}

                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-900 dark:text-white">
                      {Number(item.totalHours).toFixed(1)}h
                    </td>

                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => startTimer(item.taskId, item.isBillable)}
                        title="Start timer for this task"
                        className={`rounded-lg p-1.5 transition ${
                          timer?.task_id === item.taskId
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Play className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Totals Row */}
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-800 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-100">
                  <td className="py-3 px-4 uppercase tracking-wider text-[11px]">
                    Daily Totals
                  </td>
                  {days.map((day) => (
                    <td key={day} className="py-3 px-3 text-center font-mono font-bold">
                      {dailyTotals[day] > 0 ? `${dailyTotals[day].toFixed(1)}` : '0.0'}
                    </td>
                  ))}
                  <td className="py-3 px-4 text-center font-mono text-sm font-extrabold text-blue-600 dark:text-blue-400">
                    {summary?.totalLoggedHours.toFixed(1)}h
                  </td>
                  <td className="py-3 px-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Cross-Project Reviewer Portions Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div>
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              Cross-Project Reviewer Portions
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Each project portion is independently reviewed by its designated project/product reviewer.
            </p>
          </div>
        </div>

        {portions.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No project portions generated yet. Once the timesheet is submitted, project portions will be routed to respective project leads.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {portions.map((portion) => {
              const portionColors: Record<string, string> = {
                PENDING: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300',
                APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300',
                REJECTED: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300',
              };

              // Prevent self-approval: User cannot approve their own timesheet portion unless Super Admin
              const isOwnTimesheet = timesheet?.user_id === user?.id;
              const canReviewPortion =
                canApprove &&
                (!isOwnTimesheet || user?.role_code === 'ROLE_SUPER_ADMIN') &&
                portion.status === 'PENDING';

              return (
                <div
                  key={portion.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900 dark:text-white">
                        {portion.project_name || portion.product_name || 'Independent Work'}
                      </span>
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          portionColors[portion.status] || portionColors.PENDING
                        }`}
                      >
                        {portion.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <span>Total: <strong className="text-slate-800 dark:text-slate-200">{Number(portion.total_hours).toFixed(1)} hrs</strong></span>
                      <span>Billable: <strong className="text-emerald-600 dark:text-emerald-400">{Number(portion.billable_hours).toFixed(1)} hrs</strong></span>
                      <span>Overtime: <strong className="text-purple-600 dark:text-purple-400">{Number(portion.overtime_hours).toFixed(1)} hrs</strong></span>
                    </div>

                    {portion.reviewed_by && (
                      <p className="text-[11px] text-slate-400">
                        Reviewed by <span className="font-medium text-slate-700 dark:text-slate-300">{portion.reviewer_name || 'Lead'}</span> on{' '}
                        {new Date(portion.reviewed_at || '').toLocaleDateString()}
                      </p>
                    )}

                    {portion.review_remarks && (
                      <p className="text-xs italic text-slate-600 dark:text-slate-300">
                        &ldquo;{portion.review_remarks}&rdquo;
                      </p>
                    )}
                  </div>

                  {canReviewPortion && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setReviewingPortion(portion);
                          setReviewDecision('APPROVED');
                        }}
                        className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Approve
                      </button>

                      <button
                        onClick={() => {
                          setReviewingPortion(portion);
                          setReviewDecision('REJECTED');
                        }}
                        className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
                      >
                        <X className="h-3.5 w-3.5" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Submit Timesheet Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-semibold text-base text-slate-900 dark:text-white">
              Submit Weekly Timesheet
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Week of {getWeekRangeLabel(currentMonday)} ({summary?.totalLoggedHours.toFixed(1)} hrs total)
            </p>

            {summary && summary.isUnderExpected && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <span>
                  Notice: You have logged {summary.totalLoggedHours.toFixed(1)} hrs, which is {summary.missingHours.toFixed(1)} hrs under your expected capacity ({summary.expectedHours.toFixed(1)} hrs).
                </span>
              </div>
            )}

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Submission Notes / Remarks (Optional)
              </label>
              <textarea
                rows={3}
                value={submitRemarks}
                onChange={(e) => setSubmitRemarks(e.target.value)}
                placeholder="Add any contextual notes for project leads or managers..."
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitTimesheet}
                disabled={actionLoading}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {actionLoading ? 'Submitting...' : 'Confirm Submission'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reopen Timesheet Modal */}
      {isReopenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-semibold text-base text-slate-900 dark:text-white">
              Reopen Timesheet for Amendment
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Reopening will transition the timesheet back to Draft so changes can be made.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Reason for Reopening <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="State why this timesheet needs to be amended..."
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsReopenModalOpen(false)}
                className="rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReopenTimesheet}
                disabled={actionLoading || !reopenReason.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {actionLoading ? 'Reopening...' : 'Reopen Timesheet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Portion Review Modal */}
      {reviewingPortion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-semibold text-base text-slate-900 dark:text-white">
              {reviewDecision === 'APPROVED' ? 'Approve' : 'Reject'} Project Portion
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Project: {reviewingPortion.project_name || reviewingPortion.product_name || 'Independent Work'} ({Number(reviewingPortion.total_hours).toFixed(1)} hrs)
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Decision Remarks {reviewDecision === 'REJECTED' && <span className="text-rose-500">*</span>}
              </label>
              <textarea
                required={reviewDecision === 'REJECTED'}
                rows={3}
                value={reviewRemarks}
                onChange={(e) => setReviewRemarks(e.target.value)}
                placeholder={
                  reviewDecision === 'REJECTED'
                    ? 'State the reason for rejection (required so employee can correct it)...'
                    : 'Optional approval notes or praise...'
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReviewingPortion(null)}
                className="rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReviewPortion}
                disabled={actionLoading || (reviewDecision === 'REJECTED' && !reviewRemarks.trim())}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-xs disabled:opacity-50 ${
                  reviewDecision === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {reviewDecision === 'APPROVED' ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    {actionLoading ? 'Approving...' : 'Confirm Approval'}
                  </>
                ) : (
                  <>
                    <X className="h-3.5 w-3.5" />
                    {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
