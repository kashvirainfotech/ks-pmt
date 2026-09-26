import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { tasksApi, projectsApi, timeLogsApi } from '../../api/endpoints';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  FolderKanban,
  DollarSign,
  TrendingUp,
  Building,
  ArrowUpRight,
  Plus,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const BentoGridDashboard: React.FC = () => {
  const { user, selectedBranchId, branches } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTasks: 0,
    urgentTasks: 0,
    completedTasks: 0,
    billableAmount: '',
    totalBudgetHours: 0,
    loggedMinutes: 0,
  });

  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [tasksRes, projectsRes, timeRes]: any = await Promise.allSettled([
          tasksApi.getTasks({
            branchId: selectedBranchId || undefined,
            limit: 50,
          }),
          projectsApi.getProjects({ branchId: selectedBranchId || undefined }),
          timeLogsApi.getTimeLogs({ limit: 20 }),
        ]);

        const tasksList =
          tasksRes.status === 'fulfilled'
            ? tasksRes.value?.data?.tasks ||
              tasksRes.value?.tasks ||
              tasksRes.value?.data ||
              []
            : [];
        const projectsList =
          projectsRes.status === 'fulfilled'
            ? projectsRes.value?.data || projectsRes.value || []
            : [];
        const timeLogsList =
          timeRes.status === 'fulfilled'
            ? timeRes.value?.data?.timeLogs || timeRes.value?.timeLogs || []
            : [];

        // Calculate KPI values
        const urgent = tasksList.filter((t: any) =>
          ['URGENT', 'HIGH', 'CRITICAL'].includes(t.priority),
        ).length;
        const completed = tasksList.filter(
          (t: any) => t.status_category === 'DONE',
        ).length;
        const amounts: Record<string, number> = {};
        tasksList
          .filter((t: any) => t.is_chargeable && t.charge_amount !== undefined)
          .forEach((t: any) => {
            const currency = t.currency || 'INR';
            amounts[currency] =
              (amounts[currency] || 0) + Number(t.charge_amount || 0);
          });
        const billableTotal =
          Object.entries(amounts)
            .map(
              ([currency, amount]) => `${currency} ${amount.toLocaleString()}`,
            )
            .join(' / ') || 'No visible charges';
        const budgetHours = projectsList.reduce(
          (sum: number, p: any) => sum + (parseFloat(p.budgeted_hours) || 0),
          0,
        );
        const loggedMins = timeLogsList.reduce(
          (sum: number, tl: any) =>
            sum + (parseInt(tl.duration_minutes, 10) || 0),
          0,
        );

        setStats({
          totalTasks: tasksRes.value?.meta?.total_count ?? tasksList.length,
          urgentTasks: urgent,
          completedTasks: completed,
          billableAmount: billableTotal,
          totalBudgetHours: budgetHours,
          loggedMinutes: loggedMins,
        });

        setRecentTasks(tasksList.slice(0, 5));
        setRecentProjects(projectsList.slice(0, 4));

        // Group status counts
        const statusMap = new Map<
          string,
          { name: string; count: number; color: string }
        >();
        tasksList.forEach((t: any) => {
          const sName = t.status_name || 'Open';
          const sColor = t.status_color || '#3b82f6';
          if (!statusMap.has(sName)) {
            statusMap.set(sName, { name: sName, count: 0, color: sColor });
          }
          statusMap.get(sName)!.count += 1;
        });
        setStatusDistribution(Array.from(statusMap.values()));
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [selectedBranchId]);

  const currentBranchName =
    branches.find((b) => b.id === selectedBranchId)?.branch_name ||
    'All Company Branches';

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="page-intro">
        <div>
          <p className="page-eyebrow mb-2">Workspace overview</p>
          <h1 className="text-slate-900 dark:text-white">
            Welcome back{user?.first_name ? `, ${user.first_name}` : ''}.
          </h1>
          <p className="page-description">
            Here is where your team stands. Activity across{' '}
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              {currentBranchName}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/tasks')}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition"
          >
            <ArrowUpRight className="h-4 w-4" /> Open tasks
          </button>
        </div>
      </div>

      {/* KPI Bento Row */}
      <div className="dashboard-grid grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* KPI 1: Active Tasks */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Tasks
            </span>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <FolderKanban className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {stats.totalTasks}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center font-medium">
              <TrendingUp className="h-3 w-3 mr-0.5" /> {stats.completedTasks}{' '}
              closed in latest 50
            </span>
          </div>
        </div>

        {/* KPI 2: Urgent / High Priority */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              High / Urgent (latest 50)
            </span>
            <div className="rounded-xl bg-rose-50 p-2 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {stats.urgentTasks}
            </span>
            <span className="text-xs text-slate-400">Requires attention</span>
          </div>
        </div>

        {/* KPI 3: Logged Hours */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Recent Effort Logged
            </span>
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {(stats.loggedMinutes / 60).toFixed(1)}h
            </span>
            <span className="text-xs text-slate-400">latest 20 worklogs</span>
          </div>
        </div>

        {/* KPI 4: Billable Value */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Recent Chargeable Value
            </span>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {stats.billableAmount}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              Latest 50 tasks
            </span>
          </div>
        </div>
      </div>

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Bento 1: Status Distribution (2 Columns) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Workflow Status Breakdown
              </h2>
              <p className="text-xs text-slate-400">
                Distribution of the latest 50 tasks
              </p>
            </div>
            <button
              onClick={() => navigate('/tasks')}
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              Open Kanban <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-6 space-y-4">
            {statusDistribution.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">
                No active tasks in this branch yet
              </p>
            ) : (
              statusDistribution.map((item, idx) => {
                const pct =
                  statusDistribution.reduce((sum, status) => sum + status.count, 0) > 0
                    ? Math.round((item.count / statusDistribution.reduce((sum, status) => sum + status.count, 0)) * 100)
                    : 0;
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: item.color || '#3b82f6' }}
                        />
                        {item.name}
                      </span>
                      <span className="text-slate-400">
                        {item.count} tasks ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: item.color || '#3b82f6',
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Bento 2: Branch Network Widget (1 Column) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Branches & Locations
              </h2>
              <p className="text-xs text-slate-400">
                Multi-location operational hubs
              </p>
            </div>
            <Building className="h-4 w-4 text-slate-400" />
          </div>

          <div className="mt-4 space-y-3">
            {branches.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 p-3 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40 transition"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {b.branch_name}
                    </p>
                    {b.is_head_office && (
                      <span className="rounded bg-blue-100 px-1.5 py-0.2 text-[9px] font-bold text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                        HQ
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {b.city
                      ? `${b.city}, ${b.state || ''}`
                      : 'Operational Branch'}
                  </p>
                </div>

                <div className="text-right">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                    Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Projects & Quick Action Tasks */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Active Projects Widget */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Active Projects & Products
            </h2>
            <button
              onClick={() => navigate('/projects')}
              className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              View all
            </button>
          </div>

          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {recentProjects.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">
                No projects added yet
              </p>
            ) : (
              recentProjects.map((p) => (
                <div
                  key={p.id}
                  className="py-3 flex items-center justify-between gap-4"
                >
                  <div className="truncate">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {p.project_name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Client: {p.client_name || 'Internal Product'} •{' '}
                      {p.billing_type?.replace('_', ' ')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {p.budgeted_hours
                        ? `${p.budgeted_hours} hrs`
                        : 'Open Budget'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Priority Tasks List Widget */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Recent Task Activity
            </h2>
            <button
              onClick={() => navigate('/tasks')}
              className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              View all
            </button>
          </div>

          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {recentTasks.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">
                No tasks created yet
              </p>
            ) : (
              recentTasks.map((t) => (
                <div
                  key={t.id}
                  onClick={() => navigate(`/tasks?taskId=${t.id}`)}
                  className="py-3 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl px-2 transition"
                >
                  <div className="truncate">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">
                        {t.task_code}
                      </span>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {t.title}
                      </p>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Type: {t.task_type_name || 'Task'} • Priority:{' '}
                      {t.priority}
                    </p>
                  </div>
                  <span
                    className="shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-semibold"
                    style={{
                      backgroundColor: `${t.status_color || '#3b82f6'}20`,
                      color: t.status_color || '#3b82f6',
                    }}
                  >
                    {t.status_name || 'Active'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
