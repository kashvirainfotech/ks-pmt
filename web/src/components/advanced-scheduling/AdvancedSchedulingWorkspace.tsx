import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  GitBranch,
  Layers,
  TrendingUp,
  Activity,
  Sliders,
  Play,
  RotateCcw,
  Zap,
  Check,
  ChevronRight,
  ShieldAlert,
  HelpCircle,
  Plus,
  RefreshCw,
  FolderGit2,
} from 'lucide-react';
import { projectsApi, advancedSchedulingApi } from '../../api/endpoints';
import {
  Project,
  CPMAnalysisResult,
  CPMTaskNode,
  ScheduleScenario,
  ScheduleScenarioOverride,
  ProjectHealthEvaluation,
  ProjectHealthConfig,
} from '../../types';
import { useAuth } from '../../context/AuthContext';

export const AdvancedSchedulingWorkspace: React.FC = () => {
  const { hasPermission, user } = useAuth();
  const isSuperAdmin = user?.role_code === 'ROLE_SUPER_ADMIN';
  const canManageScenarios = isSuperAdmin || hasPermission('SCHEDULE_SCENARIOS:MANAGE');
  const canApplyScenarios = isSuperAdmin || hasPermission('SCHEDULE_SCENARIOS:APPLY');
  const canManageHealth = isSuperAdmin || hasPermission('PROJECT_HEALTH:MANAGE');

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'cpm' | 'scenarios' | 'health' | 'config'>('cpm');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // CPM State
  const [cpmData, setCpmData] = useState<CPMAnalysisResult | null>(null);
  const [cpmLoading, setCpmLoading] = useState<boolean>(false);

  // Scenarios State
  const [scenarios, setScenarios] = useState<ScheduleScenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<ScheduleScenario | null>(null);
  const [isNewScenarioModalOpen, setIsNewScenarioModalOpen] = useState<boolean>(false);
  const [newScenarioForm, setNewScenarioForm] = useState({
    scenarioCode: '',
    name: '',
    description: '',
    scenarioType: 'CRITICAL_PATH_OPTIMIZATION' as const,
  });

  // Health State
  const [healthData, setHealthData] = useState<ProjectHealthEvaluation | null>(null);
  const [healthHistory, setHealthHistory] = useState<any[]>([]);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState<boolean>(false);
  const [overrideForm, setOverrideForm] = useState({
    overrideState: 'AMBER' as 'GREEN' | 'AMBER' | 'RED' | '',
    overrideReason: '',
  });

  // Config State
  const [healthConfigForm, setHealthConfigForm] = useState<ProjectHealthConfig>({
    weight_schedule: 30,
    weight_scope: 20,
    weight_quality: 20,
    weight_blockers: 15,
    weight_budget_flow: 15,
    schedule_slip_warning_days: 3,
    schedule_slip_critical_days: 7,
    defect_density_critical_ratio: 0.25,
    blocker_age_critical_hours: 48,
    missing_data_strategy: 'NEUTRAL_SCORE',
  });
  const [configSaving, setConfigSaving] = useState<boolean>(false);

  // Load Projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  // When project changes, refresh data for the active view
  useEffect(() => {
    if (selectedProjectId) {
      refreshActiveTabData();
    }
  }, [selectedProjectId, activeTab]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const res = await projectsApi.getProjects();
      const projs = Array.isArray(res.data) ? res.data : (res.data as any)?.data || [];
      setProjects(projs);
      if (projs.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projs[0].id);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const refreshActiveTabData = async () => {
    if (!selectedProjectId) return;
    try {
      if (activeTab === 'cpm') {
        loadCpmData();
      } else if (activeTab === 'scenarios') {
        loadScenarios();
      } else if (activeTab === 'health') {
        loadHealthData();
      } else if (activeTab === 'config') {
        loadHealthConfig();
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load scheduling data');
    }
  };

  const loadCpmData = async () => {
    setCpmLoading(true);
    try {
      const res = await advancedSchedulingApi.calculateCPM(selectedProjectId);
      setCpmData(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to calculate CPM');
    } finally {
      setCpmLoading(false);
    }
  };

  const loadScenarios = async () => {
    try {
      const res = await advancedSchedulingApi.getScenarios({ projectId: selectedProjectId });
      setScenarios(res.data);
      if (res.data.length > 0) {
        const full = await advancedSchedulingApi.getScenarioById(res.data[0].id);
        setSelectedScenario(full.data);
      } else {
        setSelectedScenario(null);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load scenarios');
    }
  };

  const loadHealthData = async () => {
    try {
      const [evalRes, histRes] = await Promise.all([
        advancedSchedulingApi.getProjectHealth(selectedProjectId),
        advancedSchedulingApi.getHealthHistory(selectedProjectId),
      ]);
      setHealthData(evalRes.data);
      setHealthHistory(histRes.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load health evaluation');
    }
  };

  const loadHealthConfig = async () => {
    try {
      const res = await advancedSchedulingApi.getHealthConfig(selectedProjectId);
      if (res.data) {
        setHealthConfigForm(res.data);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load health configuration');
    }
  };

  const handleCreateScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    try {
      const res = await advancedSchedulingApi.createScenario({
        projectId: selectedProjectId,
        ...newScenarioForm,
      });
      setIsNewScenarioModalOpen(false);
      setNewScenarioForm({
        scenarioCode: '',
        name: '',
        description: '',
        scenarioType: 'CRITICAL_PATH_OPTIMIZATION',
      });
      await loadScenarios();
      setSelectedScenario(res.data);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to create scenario');
    }
  };

  const handleApplyScenario = async (scenarioId: string) => {
    if (!window.confirm('Are you sure you want to explicitly apply this scenario? Simulated dates will overwrite live task schedules in the active project.')) {
      return;
    }
    try {
      await advancedSchedulingApi.applyScenario(scenarioId);
      alert('Scenario applied successfully! Live task schedules have been updated.');
      await loadScenarios();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to apply scenario');
    }
  };

  const handleSaveHealthConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigSaving(true);
    try {
      await advancedSchedulingApi.upsertHealthConfig({
        ...healthConfigForm,
        project_id: selectedProjectId,
      });
      alert('Health score configuration saved successfully!');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save health configuration');
    } finally {
      setConfigSaving(false);
    }
  };

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideForm.overrideReason.trim()) {
      alert('A valid reason is required for manual health overrides.');
      return;
    }
    try {
      await advancedSchedulingApi.recordHealthOverride({
        projectId: selectedProjectId,
        overrideState: (overrideForm.overrideState || null) as any,
        overrideReason: overrideForm.overrideReason,
      });
      setIsOverrideModalOpen(false);
      setOverrideForm({ overrideState: 'AMBER', overrideReason: '' });
      await loadHealthData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to record health override');
    }
  };

  const currentProject = projects.find((p) => p.id === selectedProjectId);

  const getHealthBadge = (state: 'GREEN' | 'AMBER' | 'RED') => {
    switch (state) {
      case 'GREEN':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"><CheckCircle className="w-3.5 h-3.5" /> Healthy (Green)</span>;
      case 'AMBER':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"><AlertTriangle className="w-3.5 h-3.5" /> Needs Attention (Amber)</span>;
      case 'RED':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"><ShieldAlert className="w-3.5 h-3.5" /> At Risk (Red)</span>;
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Advanced Scheduling & Critical Path
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800">
              LATER-001
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Critical Path Method (CPM), What-If schedule scenario simulations, float slack analysis, and calibrated composite project health scoring.
          </p>
        </div>

        {/* Project Selector */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
            Project:
          </label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-64 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-xs focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_name || p.project_code} ({p.project_code || 'PRJ'})
              </option>
            ))}
          </select>
          <button
            onClick={refreshActiveTabData}
            className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-600 dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-300"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('cpm')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'cpm'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <GitBranch className="w-4 h-4" />
          Critical Path (CPM)
        </button>
        <button
          onClick={() => setActiveTab('scenarios')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'scenarios'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          What-If Scenarios ({scenarios.length})
        </button>
        <button
          onClick={() => setActiveTab('health')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'health'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          Composite Health Score
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'config'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Health Calibration & Weights
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: CRITICAL PATH METHOD (CPM)                             */}
      {/* ============================================================== */}
      {activeTab === 'cpm' && (
        <div className="space-y-6">
          {cpmLoading ? (
            <div className="flex items-center justify-center p-12 text-slate-500">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Computing CPM Network Analysis...
            </div>
          ) : cpmData ? (
            <>
              {/* CPM KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="text-xs font-medium uppercase tracking-wider">Critical Path Length</span>
                    <Clock className="w-4 h-4 text-rose-500" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">
                      {cpmData.criticalPathLengthHours} hrs
                    </span>
                    <span className="text-xs text-slate-500">({cpmData.projectDurationDays} working days)</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Minimum theoretical duration to project completion</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="text-xs font-medium uppercase tracking-wider">Critical Tasks Count</span>
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                      {cpmData.criticalTasksCount}
                    </span>
                    <span className="text-xs text-slate-500">/ {cpmData.totalTasksCount} total tasks</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Zero-float tasks directly dictating the delivery deadline</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="text-xs font-medium uppercase tracking-wider">Dependency Relationships</span>
                    <GitBranch className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">
                      {cpmData.nodes.reduce((acc, n) => acc + n.predecessors.length, 0)}
                    </span>
                    <span className="text-xs text-slate-500">active links</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Precedence constraints (FS, SS, FF, SF with lag)</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="text-xs font-medium uppercase tracking-wider">Schedule Flexibility</span>
                    <Zap className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {Math.max(...cpmData.nodes.map((n) => n.totalSlack), 0)} hrs
                    </span>
                    <span className="text-xs text-slate-500">max float slack</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Maximum delay non-critical tasks can incur without slipping delivery</p>
                </div>
              </div>

              {/* Critical Chain Sequence Banner */}
              {cpmData.criticalChain.length > 0 && (
                <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 dark:border-rose-900/50 dark:bg-rose-950/20">
                  <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-semibold text-sm mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    Driving Critical Path Chain (Zero-Float Sequence):
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {cpmData.criticalChain.map((taskCode, idx) => (
                      <React.Fragment key={taskCode}>
                        <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-white text-rose-700 border border-rose-300 shadow-2xs dark:bg-slate-900 dark:text-rose-400 dark:border-rose-800">
                          {taskCode}
                        </span>
                        {idx < cpmData.criticalChain.length - 1 && (
                          <ChevronRight className="w-4 h-4 text-rose-400" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {/* Network Schedule Table */}
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Task Precedence, CPM Forward/Backward Schedule & Slack
                  </h3>
                  <span className="text-xs text-slate-500">
                    ES = Earliest Start | EF = Earliest Finish | LS = Latest Start | LF = Latest Finish
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/75 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-3.5 py-3">Task</th>
                        <th className="px-3 py-3">Duration</th>
                        <th className="px-3 py-3">Predecessors (Link & Lag)</th>
                        <th className="px-3 py-3">ES / EF</th>
                        <th className="px-3 py-3">LS / LF</th>
                        <th className="px-3 py-3">Total Slack</th>
                        <th className="px-3.5 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {cpmData.nodes.map((n) => (
                        <tr
                          key={n.taskId}
                          className={n.isCritical ? 'bg-rose-50/30 dark:bg-rose-950/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}
                        >
                          <td className="px-3.5 py-3">
                            <div className="font-mono font-bold text-slate-900 dark:text-white">
                              {n.taskCode}
                            </div>
                            <div className="text-slate-500 truncate max-w-xs">{n.title}</div>
                          </td>
                          <td className="px-3 py-3 font-medium text-slate-700 dark:text-slate-300">
                            {n.durationHours}h ({n.durationDays}d)
                          </td>
                          <td className="px-3 py-3">
                            {n.predecessors.length === 0 ? (
                              <span className="text-slate-400 italic">None (Root)</span>
                            ) : (
                              <div className="space-y-1">
                                {n.predecessors.map((p, idx) => (
                                  <div key={idx} className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                      {cpmData.nodes.find((x) => x.taskId === p.sourceTaskId)?.taskCode || p.sourceTaskId.slice(0, 8)}
                                    </span>
                                    <span className="ml-1 text-[10px] text-indigo-600 dark:text-indigo-400">[{p.linkType}{p.lagHours ? ` +${p.lagHours}h` : ''}]</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 font-mono text-slate-700 dark:text-slate-300">
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">{n.es}h</span> &rarr; {n.ef}h
                          </td>
                          <td className="px-3 py-3 font-mono text-slate-700 dark:text-slate-300">
                            <span className="font-medium text-blue-600 dark:text-blue-400">{n.ls}h</span> &rarr; {n.lf}h
                          </td>
                          <td className="px-3 py-3 font-mono font-bold">
                            <span className={n.totalSlack <= 0.01 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                              {n.totalSlack}h
                            </span>
                          </td>
                          <td className="px-3.5 py-3">
                            {n.isCritical ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                                <Zap className="w-3 h-3" /> CRITICAL
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                Float Available
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-slate-500">No task data available for CPM analysis.</div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: WHAT-IF SCENARIOS                                      */}
      {/* ============================================================== */}
      {activeTab === 'scenarios' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                What-If Schedule Scenarios
              </h2>
              <p className="text-xs text-slate-500">
                Simulate date shifts, priority reshuffling, and critical path optimizations in an isolated sandbox before applying to live work.
              </p>
            </div>
            {canManageScenarios && (
              <button
                onClick={() => setIsNewScenarioModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs"
              >
                <Plus className="w-4 h-4" /> New What-If Scenario
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Scenarios List */}
            <div className="lg:col-span-1 space-y-3">
              {scenarios.length === 0 ? (
                <div className="p-6 rounded-xl border border-slate-200 bg-white text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                  No scenarios created yet. Create a What-If scenario to model schedule shifts.
                </div>
              ) : (
                scenarios.map((s) => (
                  <div
                    key={s.id}
                    onClick={async () => {
                      const full = await advancedSchedulingApi.getScenarioById(s.id);
                      setSelectedScenario(full.data);
                    }}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedScenario?.id === s.id
                        ? 'border-indigo-500 bg-indigo-50/40 dark:border-indigo-400 dark:bg-indigo-950/30'
                        : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                        {s.scenario_code}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        s.status === 'APPLIED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                        s.status === 'SIMULATED' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' :
                        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {s.status}
                      </span>
                    </div>
                    <h4 className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">{s.name}</h4>
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">{s.description || 'No description'}</p>
                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-[11px] text-slate-500">
                      <span>Variance: <strong className={s.schedule_variance_days < 0 ? 'text-emerald-600' : 'text-rose-600'}>{s.schedule_variance_days}d</strong></span>
                      <span>CP Length: <strong>{s.critical_path_length_hours}h</strong></span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Selected Scenario Details & Overrides */}
            <div className="lg:col-span-2">
              {selectedScenario ? (
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                          {selectedScenario.name}
                        </h3>
                        <span className="font-mono text-xs text-slate-500">({selectedScenario.scenario_code})</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{selectedScenario.description}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedScenario.status !== 'APPLIED' && canApplyScenarios && (
                        <button
                          onClick={() => handleApplyScenario(selectedScenario.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs"
                        >
                          <Play className="w-3.5 h-3.5" /> Apply to Live Tasks
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Summary Metric Strip */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                      <span className="text-[10px] text-slate-500 font-medium uppercase">Baseline End Date</span>
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                        {selectedScenario.baseline_end_date ? new Date(selectedScenario.baseline_end_date).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                      <span className="text-[10px] text-slate-500 font-medium uppercase">Simulated End Date</span>
                      <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                        {selectedScenario.simulated_end_date ? new Date(selectedScenario.simulated_end_date).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                      <span className="text-[10px] text-slate-500 font-medium uppercase">Schedule Variance</span>
                      <div className={`text-sm font-bold mt-0.5 ${selectedScenario.schedule_variance_days <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {selectedScenario.schedule_variance_days > 0 ? `+${selectedScenario.schedule_variance_days}` : selectedScenario.schedule_variance_days} Days
                      </div>
                    </div>
                  </div>

                  {/* Overrides Table */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-3">
                      Simulated Task Overrides & CPM Impact
                    </h4>
                    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="px-3 py-2.5">Task</th>
                            <th className="px-3 py-2.5">Original Start &rarr; Due</th>
                            <th className="px-3 py-2.5">Simulated Start &rarr; Due</th>
                            <th className="px-3 py-2.5">Total Slack</th>
                            <th className="px-3 py-2.5">Critical</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {selectedScenario.overrides?.map((ov) => (
                            <tr key={ov.id} className={ov.is_critical_path ? 'bg-rose-50/20 dark:bg-rose-950/20' : ''}>
                              <td className="px-3 py-2.5 font-medium">
                                <div className="font-mono font-bold text-slate-900 dark:text-white">{ov.task_code}</div>
                                <div className="text-[11px] text-slate-500 truncate max-w-xs">{ov.title}</div>
                              </td>
                              <td className="px-3 py-2.5 text-slate-500">
                                {ov.original_start_date ? new Date(ov.original_start_date).toLocaleDateString() : '—'} &rarr;{' '}
                                {ov.original_due_date ? new Date(ov.original_due_date).toLocaleDateString() : '—'}
                              </td>
                              <td className="px-3 py-2.5 font-medium text-indigo-700 dark:text-indigo-300">
                                {ov.simulated_start_date ? new Date(ov.simulated_start_date).toLocaleDateString() : '—'} &rarr;{' '}
                                {ov.simulated_due_date ? new Date(ov.simulated_due_date).toLocaleDateString() : '—'}
                              </td>
                              <td className="px-3 py-2.5 font-mono font-bold">
                                <span className={ov.total_slack_hours <= 0 ? 'text-rose-600' : 'text-emerald-600'}>
                                  {ov.total_slack_hours}h
                                </span>
                              </td>
                              <td className="px-3 py-2.5">
                                {ov.is_critical_path ? (
                                  <span className="text-[10px] font-bold text-rose-600">CRITICAL</span>
                                ) : (
                                  <span className="text-[10px] text-slate-400">Float OK</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500">Select a scenario to view details.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: COMPOSITE HEALTH SCORE                                 */}
      {/* ============================================================== */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          {healthData ? (
            <>
              {/* Overall Health Score Card */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center justify-center w-16 h-16 rounded-2xl text-2xl font-black ${
                      healthData.effectiveState === 'GREEN' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                      healthData.effectiveState === 'AMBER' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                      'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}>
                      {healthData.compositeScore}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                          Project Composite Health: {healthData.effectiveState}
                        </h2>
                        {healthData.isOverridden && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                            Manual PM Override
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Calibrated objective composite score evaluated across 5 weighted governance dimensions.
                      </p>
                    </div>
                  </div>

                  {canManageHealth && (
                    <button
                      onClick={() => setIsOverrideModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-slate-300 hover:bg-slate-50 text-slate-700 dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-200"
                    >
                      <Sliders className="w-3.5 h-3.5" /> Set PM Health Override
                    </button>
                  )}
                </div>

                {healthData.isOverridden && healthData.activeOverride && (
                  <div className="mt-4 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-xs">
                    <span className="font-bold text-purple-900 dark:text-purple-200">Active PM Override Justification: </span>
                    <span className="text-purple-800 dark:text-purple-300">{healthData.activeOverride.override_reason}</span>
                    <span className="ml-2 text-purple-600 dark:text-purple-400 font-mono">
                      (by {healthData.activeOverride.overridden_by_name || 'PM'} on {new Date(healthData.activeOverride.overridden_at).toLocaleDateString()})
                    </span>
                  </div>
                )}
              </div>

              {/* 5 Dimensional Breakdown Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Schedule Dimension */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span className="font-semibold uppercase tracking-wider">Schedule</span>
                    <span className="font-mono">{healthData.dimensionDetails.schedule.weight}% weight</span>
                  </div>
                  <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                    {healthData.dimensionScores.schedule} / 100
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500 space-y-0.5">
                    <div>Max Slip: <strong>{healthData.dimensionDetails.schedule.maxSlipDays} days</strong></div>
                    <div>Overdue: <strong>{healthData.dimensionDetails.schedule.overdueTasks} tasks</strong></div>
                  </div>
                </div>

                {/* Scope Dimension */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span className="font-semibold uppercase tracking-wider">Scope</span>
                    <span className="font-mono">{healthData.dimensionDetails.scope.weight}% weight</span>
                  </div>
                  <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                    {healthData.dimensionScores.scope} / 100
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500 space-y-0.5">
                    <div>Active CRs: <strong>{healthData.dimensionDetails.scope.crCount}</strong></div>
                    <div>Scope churn: <strong>Stable</strong></div>
                  </div>
                </div>

                {/* Quality Dimension */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span className="font-semibold uppercase tracking-wider">Quality</span>
                    <span className="font-mono">{healthData.dimensionDetails.quality.weight}% weight</span>
                  </div>
                  <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                    {healthData.dimensionScores.quality} / 100
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500 space-y-0.5">
                    <div>Open Bugs: <strong>{healthData.dimensionDetails.quality.openBugs}</strong></div>
                    <div>Defect Ratio: <strong>{healthData.dimensionDetails.quality.defectRatio}</strong></div>
                  </div>
                </div>

                {/* Blockers Dimension */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span className="font-semibold uppercase tracking-wider">Blockers</span>
                    <span className="font-mono">{healthData.dimensionDetails.blockers.weight}% weight</span>
                  </div>
                  <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                    {healthData.dimensionScores.blockers} / 100
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500 space-y-0.5">
                    <div>Active: <strong>{healthData.dimensionDetails.blockers.activeBlockers}</strong></div>
                    <div>Max Age: <strong>{healthData.dimensionDetails.blockers.maxBlockerAgeHours}h</strong></div>
                  </div>
                </div>

                {/* Budget & Flow Dimension */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span className="font-semibold uppercase tracking-wider">Budget & Flow</span>
                    <span className="font-mono">{healthData.dimensionDetails.budgetFlow.weight}% weight</span>
                  </div>
                  <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                    {healthData.dimensionScores.budgetFlow} / 100
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500 space-y-0.5">
                    <div>Budget Burn: <strong>{healthData.dimensionDetails.budgetFlow.budgetConsumptionPct}%</strong></div>
                    <div>WIP Overrun: <strong>None</strong></div>
                  </div>
                </div>
              </div>

              {/* Historical Evaluations Ledger */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                  Historical Evaluation Snapshots
                </h3>
                {healthHistory.length === 0 ? (
                  <p className="text-xs text-slate-500">No historical health records captured yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {healthHistory.map((h) => (
                      <div key={h.id} className="py-2.5 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-slate-500">{new Date(h.evaluation_date).toLocaleDateString()}</span>
                          {getHealthBadge(h.manual_override_state || h.health_state)}
                          {h.manual_override_state && (
                            <span className="text-[11px] text-purple-700 dark:text-purple-300 italic">
                              Override: {h.override_reason}
                            </span>
                          )}
                        </div>
                        <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          Score: {h.composite_score}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-slate-500">Loading project health evaluation...</div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: HEALTH CONFIGURATION & WEIGHTS                         */}
      {/* ============================================================== */}
      {activeTab === 'config' && (
        <form onSubmit={handleSaveHealthConfig} className="max-w-3xl space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Project Health Dimension Weights
              </h3>
              <p className="text-xs text-slate-500">
                Calibrate the relative importance of each governance dimension. Weights must sum to exactly 100.00%.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Schedule Weight (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={healthConfigForm.weight_schedule}
                  onChange={(e) => setHealthConfigForm({ ...healthConfigForm, weight_schedule: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Scope Weight (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={healthConfigForm.weight_scope}
                  onChange={(e) => setHealthConfigForm({ ...healthConfigForm, weight_scope: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Quality Weight (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={healthConfigForm.weight_quality}
                  onChange={(e) => setHealthConfigForm({ ...healthConfigForm, weight_quality: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Blockers Weight (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={healthConfigForm.weight_blockers}
                  onChange={(e) => setHealthConfigForm({ ...healthConfigForm, weight_blockers: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Budget & Flow Weight (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={healthConfigForm.weight_budget_flow}
                  onChange={(e) => setHealthConfigForm({ ...healthConfigForm, weight_budget_flow: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            </div>

            {/* Sum indicator */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs font-semibold">
              <span>Total Weight Sum:</span>
              <span className={
                Math.abs(healthConfigForm.weight_schedule + healthConfigForm.weight_scope + healthConfigForm.weight_quality + healthConfigForm.weight_blockers + healthConfigForm.weight_budget_flow - 100) < 0.01
                  ? 'text-emerald-600'
                  : 'text-rose-600'
              }>
                {healthConfigForm.weight_schedule + healthConfigForm.weight_scope + healthConfigForm.weight_quality + healthConfigForm.weight_blockers + healthConfigForm.weight_budget_flow}%
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Thresholds & Alert Boundaries
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Schedule Slip Warning Days
                </label>
                <input
                  type="number"
                  value={healthConfigForm.schedule_slip_warning_days}
                  onChange={(e) => setHealthConfigForm({ ...healthConfigForm, schedule_slip_warning_days: parseInt(e.target.value, 10) || 0 })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Schedule Slip Critical Days
                </label>
                <input
                  type="number"
                  value={healthConfigForm.schedule_slip_critical_days}
                  onChange={(e) => setHealthConfigForm({ ...healthConfigForm, schedule_slip_critical_days: parseInt(e.target.value, 10) || 0 })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Defect Density Critical Ratio (e.g. 0.25)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={healthConfigForm.defect_density_critical_ratio}
                  onChange={(e) => setHealthConfigForm({ ...healthConfigForm, defect_density_critical_ratio: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Blocker Age Critical Hours
                </label>
                <input
                  type="number"
                  value={healthConfigForm.blocker_age_critical_hours}
                  onChange={(e) => setHealthConfigForm({ ...healthConfigForm, blocker_age_critical_hours: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            </div>

            {canManageHealth && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <button
                  type="submit"
                  disabled={configSaving}
                  className="px-5 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs"
                >
                  {configSaving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            )}
          </div>
        </form>
      )}

      {/* Modal: Create Scenario */}
      {isNewScenarioModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              Create What-If Scenario
            </h3>
            <form onSubmit={handleCreateScenario} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Scenario Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SCEN-FAST-TRACK"
                  value={newScenarioForm.scenarioCode}
                  onChange={(e) => setNewScenarioForm({ ...newScenarioForm, scenarioCode: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Scenario Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fast-Track Sprint 5 Delivery"
                  value={newScenarioForm.name}
                  onChange={(e) => setNewScenarioForm({ ...newScenarioForm, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Simulation Strategy
                </label>
                <select
                  value={newScenarioForm.scenarioType}
                  onChange={(e) => setNewScenarioForm({ ...newScenarioForm, scenarioType: e.target.value as any })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="CRITICAL_PATH_OPTIMIZATION">Critical Path Optimization</option>
                  <option value="DATE_SHIFT">Date Shift & Buffer Compression</option>
                  <option value="CAPACITY_REDUCTION">Capacity Reduction (Leaves/Absence)</option>
                  <option value="SCOPE_EXPANSION">Scope Expansion</option>
                  <option value="PRIORITY_RESHUFFLE">Priority Reshuffling</option>
                  <option value="CUSTOM">Custom What-If Simulation</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Simulation Notes / Assumptions
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Assumes 2 additional developers allocated to backend API tasks."
                  value={newScenarioForm.description}
                  onChange={(e) => setNewScenarioForm({ ...newScenarioForm, description: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewScenarioModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700"
                >
                  Initialize Scenario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Set PM Health Override */}
      {isOverrideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Record PM Health Override
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Override the algorithmic composite health score with an attributable narrative justification.
            </p>
            <form onSubmit={handleSaveOverride} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Override State
                </label>
                <select
                  value={overrideForm.overrideState}
                  onChange={(e) => setOverrideForm({ ...overrideForm, overrideState: e.target.value as any })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="GREEN">GREEN (Healthy)</option>
                  <option value="AMBER">AMBER (Needs Attention)</option>
                  <option value="RED">RED (At Risk)</option>
                  <option value="">Clear Override (Return to Algorithm)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Attributable Justification / Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Scope changes have been informally accepted by client sponsor; formal sign-off scheduled for tomorrow."
                  value={overrideForm.overrideReason}
                  onChange={(e) => setOverrideForm({ ...overrideForm, overrideReason: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOverrideModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700"
                >
                  Save Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
