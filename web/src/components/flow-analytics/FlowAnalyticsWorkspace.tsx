import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  Clock,
  Layers,
  BarChart3,
  TrendingUp,
  ShieldAlert,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Users,
  CheckCircle2,
  Calendar,
  AlertOctagon,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info,
  Sliders,
  ChevronRight,
  Maximize2,
  CheckSquare,
} from 'lucide-react';
import { flowAnalyticsApi, projectsApi } from '../../api/endpoints';
import {
  Project,
  WipLimit,
  WipOverrideException,
  WipBoardResponse,
  OperationalAgingResponse,
  FlowTimePartitionResponse,
  CycleTimeMetricsResponse,
  CfdDataPoint,
  DwellTimeResponse,
  FlowAgingConfig,
} from '../../types';

export const FlowAnalyticsWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'wip' | 'cfd' | 'aging'>('overview');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Data states
  const [wipBoard, setWipBoard] = useState<WipBoardResponse | null>(null);
  const [wipLimits, setWipLimits] = useState<WipLimit[]>([]);
  const [overrideExceptions, setOverrideExceptions] = useState<WipOverrideException[]>([]);
  const [agingData, setAgingData] = useState<OperationalAgingResponse | null>(null);
  const [partitionData, setPartitionData] = useState<FlowTimePartitionResponse | null>(null);
  const [cycleTimeData, setCycleTimeData] = useState<CycleTimeMetricsResponse | null>(null);
  const [cfdData, setCfdData] = useState<CfdDataPoint[]>([]);
  const [dwellTimeData, setDwellTimeData] = useState<DwellTimeResponse | null>(null);
  const [agingConfigs, setAgingConfigs] = useState<FlowAgingConfig[]>([]);

  // Modals
  const [showCreateLimitModal, setShowCreateLimitModal] = useState<boolean>(false);
  const [showOverrideModal, setShowOverrideModal] = useState<boolean>(false);
  const [showAgingConfigModal, setShowAgingConfigModal] = useState<boolean>(false);

  // Form states
  const [limitForm, setLimitForm] = useState({
    name: '',
    description: '',
    limit_type: 'STAGE' as 'STAGE' | 'USER' | 'TEAM' | 'PROJECT',
    max_wip_count: 3,
    enforcement_mode: 'SOFT_WARNING' as 'SOFT_WARNING' | 'HARD_GUARD',
    status_id: '',
    user_id: '',
    team_id: '',
  });

  const [overrideForm, setOverrideForm] = useState({
    task_id: '',
    wip_limit_id: '',
    reason: '',
    is_expedited: true,
  });

  const [agingConfigForm, setAgingConfigForm] = useState({
    name: '',
    warning_threshold_hours: 48,
    critical_threshold_hours: 96,
    time_basis: 'BUSINESS_HOURS' as 'BUSINESS_HOURS' | 'ELAPSED_HOURS',
    priority: '',
  });

  // Filter in aging tab
  const [agingFilterPriority, setAgingFilterPriority] = useState<string>('');
  const [agingSearch, setAgingSearch] = useState<string>('');

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    loadAllFlowData();
  }, [selectedProjectId]);

  const loadProjects = async () => {
    try {
      const res = await projectsApi.getProjects();
      setProjects(res.data || []);
      if (res.data && res.data.length > 0) {
        setSelectedProjectId(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  };

  const loadAllFlowData = async () => {
    setLoading(true);
    try {
      const pId = selectedProjectId || undefined;

      const [
        boardRes,
        limitsRes,
        exceptionsRes,
        agingRes,
        partRes,
        cycleRes,
        cfdRes,
        dwellRes,
        configsRes,
      ] = await Promise.all([
        flowAnalyticsApi.getWipBoard({ projectId: pId }),
        flowAnalyticsApi.getWipLimits({ projectId: pId }),
        flowAnalyticsApi.getOverrideExceptions({ projectId: pId }),
        flowAnalyticsApi.getOperationalAging({ projectId: pId }),
        flowAnalyticsApi.getFlowTimePartition({ projectId: pId }),
        flowAnalyticsApi.getCycleTimeMetrics({ projectId: pId }),
        flowAnalyticsApi.getCumulativeFlow({ projectId: pId }),
        flowAnalyticsApi.getDwellTimeHeatmap({ projectId: pId }),
        flowAnalyticsApi.getAgingConfigs({ projectId: pId }),
      ]);

      setWipBoard(boardRes.data);
      setWipLimits(limitsRes.data || []);
      setOverrideExceptions(exceptionsRes.data || []);
      setAgingData(agingRes.data);
      setPartitionData(partRes.data);
      setCycleTimeData(cycleRes.data);
      setCfdData(cfdRes.data || []);
      setDwellTimeData(dwellRes.data);
      setAgingConfigs(configsRes.data || []);
    } catch (err) {
      console.error('Failed to load flow analytics data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAllFlowData();
  };

  const handleCreateLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await flowAnalyticsApi.createWipLimit({
        ...limitForm,
        project_id: selectedProjectId || undefined,
        status_id: limitForm.status_id || undefined,
        user_id: limitForm.user_id || undefined,
        team_id: limitForm.team_id || undefined,
      });
      setShowCreateLimitModal(false);
      loadAllFlowData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create WIP limit');
    }
  };

  const handleCreateOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await flowAnalyticsApi.createOverrideException({
        ...overrideForm,
        project_id: selectedProjectId || undefined,
        wip_limit_id: overrideForm.wip_limit_id || undefined,
      });
      setShowOverrideModal(false);
      loadAllFlowData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record override exception');
    }
  };

  const handleCreateAgingConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await flowAnalyticsApi.createAgingConfig({
        ...agingConfigForm,
        project_id: selectedProjectId || undefined,
        priority: agingConfigForm.priority || undefined,
      });
      setShowAgingConfigModal(false);
      loadAllFlowData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create aging configuration');
    }
  };

  const handleRebuildCfd = async () => {
    if (!window.confirm('Rebuild daily cumulative flow snapshots from canonical tasks?')) return;
    try {
      setRefreshing(true);
      await flowAnalyticsApi.rebuildCfd({ projectId: selectedProjectId || undefined });
      await loadAllFlowData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to rebuild CFD snapshots');
    }
  };

  // Filtered operational aging items
  const filteredAgingItems = (agingData?.items || []).filter((item) => {
    const matchesPriority = !agingFilterPriority || item.priority === agingFilterPriority;
    const matchesSearch =
      !agingSearch ||
      item.taskCode.toLowerCase().includes(agingSearch.toLowerCase()) ||
      item.title.toLowerCase().includes(agingSearch.toLowerCase()) ||
      item.primaryAssignee.toLowerCase().includes(agingSearch.toLowerCase());
    return matchesPriority && matchesSearch;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-7 h-7 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">Flow Analytics & Bottlenecks</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              ANALYTICS-002
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            WIP limits, status dwell heatmaps, cumulative flow, lead/cycle time distributions, and queue tenures
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Project selector */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_name} ({p.project_code})
              </option>
            ))}
          </select>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => setShowCreateLimitModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Set WIP Limit
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white rounded-t-xl px-4 pt-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'overview'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Overview & Bottlenecks
        </button>
        <button
          onClick={() => setActiveTab('wip')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'wip'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          WIP Board & Limits ({wipLimits.length})
        </button>
        <button
          onClick={() => setActiveTab('cfd')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'cfd'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Cumulative Flow & Distributions
        </button>
        <button
          onClick={() => setActiveTab('aging')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'aging'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Clock className="w-4 h-4" />
          Work Aging Radar ({agingData?.items.length || 0})
        </button>
      </div>

      {/* Tab 1: Overview & Bottlenecks */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Executive KPI Scorecards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active WIP</span>
                <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Layers className="w-5 h-5" />
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {wipBoard?.stages.reduce((acc, curr) => acc + (['TODO', 'DONE', 'CANCELLED'].includes(curr.status_category) ? 0 : curr.total_tasks), 0) || 0}
              </p>
              <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
                <span>Blocked overlay:</span>
                <span className="font-semibold text-amber-600">
                  {wipBoard?.stages.reduce((acc, curr) => acc + curr.blocked_overlay_count, 0) || 0} tasks
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Flow Efficiency</span>
                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Zap className="w-5 h-5" />
                </span>
              </div>
              <p className="text-2xl font-bold text-emerald-600 mt-2">
                {partitionData?.flowEfficiencyPercent || 0}%
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Active time ({partitionData?.durationsHours.activeHours || 0}h) vs Waiting ({partitionData?.durationsHours.waitingHours || 0}h)
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Median Cycle Time (p50)</span>
                <span className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <Clock className="w-5 h-5" />
                </span>
              </div>
              <p className="text-2xl font-bold text-purple-600 mt-2">
                {cycleTimeData?.cycleTime.p50 || 0}h
              </p>
              <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
                <span>85th Percentile:</span>
                <span className="font-semibold text-gray-800">{cycleTimeData?.cycleTime.p85 || 0}h</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">First-Time-Right (FTR)</span>
                <span className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                  <CheckCircle2 className="w-5 h-5" />
                </span>
              </div>
              <p className="text-2xl font-bold text-teal-600 mt-2">
                {cycleTimeData?.qualityMetrics.firstTimeRightRatePercent || 100}%
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {cycleTimeData?.qualityMetrics.reworkCount || 0} rework/reopen episodes identified
              </p>
            </div>
          </div>

          {/* Stage Dwell Time Bottleneck Heatmap */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                  Stage Dwell Time & Bottleneck Detection Heatmap
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Elapsed hours vs business hours spent per status stage. Red highlights identify acute delivery bottlenecks (&gt;48h).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
              {dwellTimeData?.stages.map((stage) => (
                <div
                  key={stage.statusId}
                  className={`p-4 rounded-xl border transition-all ${
                    stage.isBottleneck
                      ? 'border-red-300 bg-red-50/60 shadow-sm'
                      : stage.avgDwellHours > 24
                      ? 'border-amber-200 bg-amber-50/40'
                      : 'border-gray-200 bg-gray-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-white border border-gray-200 text-gray-700">
                      {stage.statusCode}
                    </span>
                    {stage.isBottleneck ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                        <AlertTriangle className="w-3 h-3" />
                        Bottleneck
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 font-medium">{stage.sampleSize} tasks</span>
                    )}
                  </div>

                  <h3 className="font-semibold text-gray-900 text-sm">{stage.statusName}</h3>
                  <div className="mt-3 space-y-1 text-xs">
                    <div className="flex justify-between text-gray-600">
                      <span>Avg Elapsed Time:</span>
                      <span className={`font-bold ${stage.isBottleneck ? 'text-red-700' : 'text-gray-900'}`}>
                        {stage.avgDwellHours} hrs
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Business Hours:</span>
                      <span className="font-medium text-gray-700">{stage.avgBusinessDwellHours} hrs</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Max Dwell Time:</span>
                      <span>{stage.maxDwellHours} hrs</span>
                    </div>
                  </div>

                  {/* Progress bar visual */}
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-3 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${
                        stage.isBottleneck ? 'bg-red-500' : stage.avgDwellHours > 24 ? 'bg-amber-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${Math.min(100, (stage.avgDwellHours / 72) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active vs. Waiting Flow Time Partitioning */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  Flow Time Partitioning (Active vs. Waiting Intervals)
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Complete disjoint partition of cycle time. {partitionData?.standardNotice}
                </p>
              </div>
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold">
                Total Cycle: {partitionData?.durationsHours.totalCycleTimeHours || 0} hrs
              </span>
            </div>

            {/* Segmented bar */}
            <div className="space-y-2">
              <div className="w-full bg-gray-100 rounded-lg h-6 flex overflow-hidden p-0.5">
                <div
                  className="bg-emerald-500 h-full rounded-l text-[11px] font-bold text-white flex items-center justify-center transition-all"
                  style={{
                    width: `${
                      partitionData?.durationsHours.totalCycleTimeHours
                        ? (partitionData.durationsHours.activeHours / partitionData.durationsHours.totalCycleTimeHours) * 100
                        : 50
                    }%`,
                  }}
                  title={`Active Time: ${partitionData?.durationsHours.activeHours} hrs`}
                >
                  Active ({partitionData?.flowEfficiencyPercent}%)
                </div>
                <div
                  className="bg-amber-500 h-full text-[11px] font-bold text-white flex items-center justify-center transition-all"
                  style={{
                    width: `${
                      partitionData?.durationsHours.totalCycleTimeHours
                        ? (partitionData.durationsHours.waitingHours / partitionData.durationsHours.totalCycleTimeHours) * 100
                        : 40
                    }%`,
                  }}
                  title={`Waiting Time: ${partitionData?.durationsHours.waitingHours} hrs`}
                >
                  Waiting
                </div>
                <div
                  className="bg-gray-400 h-full rounded-r text-[11px] font-bold text-white flex items-center justify-center transition-all"
                  style={{
                    width: `${
                      partitionData?.durationsHours.totalCycleTimeHours
                        ? (partitionData.durationsHours.unclassifiedHours / partitionData.durationsHours.totalCycleTimeHours) * 100
                        : 10
                    }%`,
                  }}
                  title={`Unclassified: ${partitionData?.durationsHours.unclassifiedHours} hrs`}
                >
                  Unclassified
                </div>
              </div>

              {/* Waiting Subcategories Breakdown Table */}
              <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 text-xs font-bold text-gray-700 border-b border-gray-200">
                  Waiting Queue Breakdown by Reason
                </div>
                <div className="divide-y divide-gray-100">
                  {Object.entries(partitionData?.waitingBreakdown || {}).map(([reason, stats]) => (
                    <div key={reason} className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-gray-50/60">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="font-medium text-gray-800">{reason.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="flex items-center gap-6 text-gray-600">
                        <span>{stats.count} intervals</span>
                        <span>{Math.round((stats.elapsedMinutes / 60) * 10) / 10} elapsed hrs</span>
                        <span className="font-semibold text-gray-900">{Math.round((stats.businessMinutes / 60) * 10) / 10} business hrs</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: WIP Board & Limits */}
      {activeTab === 'wip' && (
        <div className="space-y-6">
          {/* Action bar */}
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200">
            <div>
              <h2 className="text-base font-bold text-gray-900">Work-in-Progress (WIP) Board & Strict Guards</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Stage limits count distinct work items once. Blocked tasks are tracked as an overlay, never double counted.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowOverrideModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-300 rounded-lg hover:bg-amber-100"
              >
                <ShieldAlert className="w-4 h-4" />
                Authorize Expedited Bypass
              </button>
              <button
                onClick={() => setShowCreateLimitModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4" />
                Add WIP Limit
              </button>
            </div>
          </div>

          {/* Kanban Stage WIP Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {wipBoard?.stages.map((stage) => {
              const hasLimit = stage.max_wip_limit > 0;
              const isBreached = hasLimit && stage.total_tasks >= stage.max_wip_limit;
              const isHardGuard = stage.enforcement_mode === 'HARD_GUARD';

              return (
                <div
                  key={stage.status_id}
                  className={`p-3 rounded-xl border bg-white flex flex-col justify-between ${
                    isBreached && isHardGuard
                      ? 'border-red-400 ring-2 ring-red-100'
                      : isBreached
                      ? 'border-amber-300'
                      : 'border-gray-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-800 truncate" title={stage.status_name}>
                        {stage.status_name}
                      </span>
                      {hasLimit && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isBreached
                              ? isHardGuard
                                ? 'bg-red-100 text-red-700 border border-red-300'
                                : 'bg-amber-100 text-amber-700 border border-amber-300'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {stage.total_tasks} / {stage.max_wip_limit}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-gray-900">{stage.total_tasks}</span>
                      <span className="text-xs text-gray-500">items</span>
                    </div>

                    {stage.blocked_overlay_count > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded">
                        <AlertTriangle className="w-3 h-3" />
                        {stage.blocked_overlay_count} blocked overlay
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                    <span>{stage.status_category}</span>
                    {hasLimit && (
                      <span className="font-semibold text-gray-600">
                        {stage.enforcement_mode === 'HARD_GUARD' ? 'Hard Guard' : 'Soft Warning'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Assignee WIP Distribution */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Primary Owner vs. Collaborator WIP Allocation
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase bg-gray-50/50">
                    <th className="py-3 px-4">Engineer / Assignee</th>
                    <th className="py-3 px-4">Primary Active WIP</th>
                    <th className="py-3 px-4">Collaborator Tasks</th>
                    <th className="py-3 px-4">Blocked Primary</th>
                    <th className="py-3 px-4">WIP Ceiling</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {wipBoard?.assignees.map((a) => {
                    const hasLimit = a.max_wip_limit > 0;
                    const isExceeded = hasLimit && a.primary_active_wip >= a.max_wip_limit;
                    return (
                      <tr key={a.user_id} className="hover:bg-gray-50/50">
                        <td className="py-3 px-4 font-medium text-gray-900">
                          <div>{a.full_name}</div>
                          <div className="text-xs text-gray-400">{a.email}</div>
                        </td>
                        <td className="py-3 px-4 font-bold text-indigo-600">{a.primary_active_wip}</td>
                        <td className="py-3 px-4 text-gray-600">{a.collaborator_active_wip}</td>
                        <td className="py-3 px-4">
                          {a.blocked_primary_count > 0 ? (
                            <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                              {a.blocked_primary_count} blocked
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">0</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {hasLimit ? (
                            <span className="font-medium text-gray-700">Max {a.max_wip_limit}</span>
                          ) : (
                            <span className="text-xs text-gray-400">Unrestricted</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {isExceeded ? (
                            <span className="px-2 py-0.5 text-xs font-bold rounded bg-amber-100 text-amber-800">
                              Limit Reached
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-xs font-medium rounded bg-emerald-50 text-emerald-700">
                              Within Capacity
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Historical Override Exceptions Table */}
          {overrideExceptions.length > 0 && (
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
                Audited Expedited Override Exceptions
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase bg-gray-50/50">
                      <th className="py-3 px-4">Code</th>
                      <th className="py-3 px-4">Task</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Authorized By</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Mode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {overrideExceptions.map((exc) => (
                      <tr key={exc.id} className="hover:bg-gray-50/50">
                        <td className="py-3 px-4 font-mono font-bold text-gray-700">{exc.exception_code}</td>
                        <td className="py-3 px-4 font-medium text-gray-900">
                          {exc.task_code} - {exc.task_title}
                        </td>
                        <td className="py-3 px-4 text-gray-600 max-w-xs truncate" title={exc.reason}>
                          {exc.reason}
                        </td>
                        <td className="py-3 px-4 text-gray-700 font-medium">{exc.authorized_by_name}</td>
                        <td className="py-3 px-4 text-gray-500">
                          {new Date(exc.authorized_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Expedited
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Cumulative Flow & Distributions */}
      {activeTab === 'cfd' && (
        <div className="space-y-6">
          {/* CFD Chart & Rebuild Action */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  Cumulative Flow Diagram (CFD)
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Banded daily volume progression across statuses. Expanding bands expose emerging bottlenecks.
                </p>
              </div>
              <button
                onClick={handleRebuildCfd}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Rebuild CFD Snapshots
              </button>
            </div>

            {/* Visual CFD Table / Banded Area representation */}
            {cfdData.length === 0 ? (
              <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                No daily snapshot points available. Click "Rebuild CFD Snapshots" to reconstruct from tasks.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 font-semibold text-gray-500 uppercase bg-gray-50">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3 text-emerald-700">Done (Completed)</th>
                        <th className="py-2.5 px-3 text-amber-700">Review & QA</th>
                        <th className="py-2.5 px-3 text-blue-700">In Progress</th>
                        <th className="py-2.5 px-3 text-gray-700">To Do (Backlog)</th>
                        <th className="py-2.5 px-3">Visual Band Stack</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {cfdData.map((pt) => {
                        const total = pt.DONE + pt.REVIEW_TEST + pt.IN_PROGRESS + pt.TODO;
                        return (
                          <tr key={pt.date} className="hover:bg-gray-50/60">
                            <td className="py-2 px-3 font-medium text-gray-800">{pt.date}</td>
                            <td className="py-2 px-3 font-bold text-emerald-600">{pt.DONE}</td>
                            <td className="py-2 px-3 font-semibold text-amber-600">{pt.REVIEW_TEST}</td>
                            <td className="py-2 px-3 font-semibold text-blue-600">{pt.IN_PROGRESS}</td>
                            <td className="py-2 px-3 font-medium text-gray-600">{pt.TODO}</td>
                            <td className="py-2 px-3 w-64">
                              <div className="w-full bg-gray-100 rounded h-3 flex overflow-hidden">
                                <div
                                  className="bg-emerald-500 h-full"
                                  style={{ width: `${total ? (pt.DONE / total) * 100 : 0}%` }}
                                  title={`Done: ${pt.DONE}`}
                                />
                                <div
                                  className="bg-amber-400 h-full"
                                  style={{ width: `${total ? (pt.REVIEW_TEST / total) * 100 : 0}%` }}
                                  title={`Review/QA: ${pt.REVIEW_TEST}`}
                                />
                                <div
                                  className="bg-blue-500 h-full"
                                  style={{ width: `${total ? (pt.IN_PROGRESS / total) * 100 : 0}%` }}
                                  title={`In Progress: ${pt.IN_PROGRESS}`}
                                />
                                <div
                                  className="bg-gray-300 h-full"
                                  style={{ width: `${total ? (pt.TODO / total) * 100 : 0}%` }}
                                  title={`To Do: ${pt.TODO}`}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Lead & Cycle Time Percentiles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                Cycle Time Percentile Distribution
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-center">
                  <span className="text-[11px] font-bold text-purple-700 uppercase">50th (Median)</span>
                  <p className="text-xl font-bold text-purple-900 mt-1">{cycleTimeData?.cycleTime.p50 || 0} hrs</p>
                </div>
                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-center">
                  <span className="text-[11px] font-bold text-indigo-700 uppercase">85th Percentile</span>
                  <p className="text-xl font-bold text-indigo-900 mt-1">{cycleTimeData?.cycleTime.p85 || 0} hrs</p>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 text-center">
                  <span className="text-[11px] font-bold text-rose-700 uppercase">95th Tail Risk</span>
                  <p className="text-xl font-bold text-rose-900 mt-1">{cycleTimeData?.cycleTime.p95 || 0} hrs</p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-gray-600 pt-2 border-t border-gray-100">
                <div className="flex justify-between">
                  <span>Sample Size (Completed):</span>
                  <span className="font-semibold text-gray-900">{cycleTimeData?.sampleSize || 0} tasks</span>
                </div>
                <div className="flex justify-between">
                  <span>Cancelled Work Items (Excluded):</span>
                  <span className="font-semibold text-gray-500">{cycleTimeData?.cancelledCount || 0} tasks</span>
                </div>
                <div className="flex justify-between">
                  <span>Average Cycle Time:</span>
                  <span className="font-semibold text-gray-900">{cycleTimeData?.cycleTime.avg || 0} hrs</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Lead Time Percentile Distribution
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-center">
                  <span className="text-[11px] font-bold text-blue-700 uppercase">50th (Median)</span>
                  <p className="text-xl font-bold text-blue-900 mt-1">{cycleTimeData?.leadTime.p50 || 0} hrs</p>
                </div>
                <div className="p-3 bg-cyan-50 rounded-xl border border-cyan-100 text-center">
                  <span className="text-[11px] font-bold text-cyan-700 uppercase">85th Percentile</span>
                  <p className="text-xl font-bold text-cyan-900 mt-1">{cycleTimeData?.leadTime.p85 || 0} hrs</p>
                </div>
                <div className="p-3 bg-teal-50 rounded-xl border border-teal-100 text-center">
                  <span className="text-[11px] font-bold text-teal-700 uppercase">95th Tail Risk</span>
                  <p className="text-xl font-bold text-teal-900 mt-1">{cycleTimeData?.leadTime.p95 || 0} hrs</p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-gray-600 pt-2 border-t border-gray-100">
                <div className="flex justify-between">
                  <span>Average Lead Time:</span>
                  <span className="font-semibold text-gray-900">{cycleTimeData?.leadTime.avg || 0} hrs</span>
                </div>
                <div className="flex justify-between">
                  <span>Min Lead Time:</span>
                  <span className="font-semibold text-gray-900">{cycleTimeData?.leadTime.min || 0} hrs</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Lead Time:</span>
                  <span className="font-semibold text-gray-900">{cycleTimeData?.leadTime.max || 0} hrs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Work Aging Radar */}
      {activeTab === 'aging' && (
        <div className="space-y-6">
          {/* Aging Radar Controls & KPIs */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  Operational Work Aging Radar
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {agingData?.notice}
                </p>
              </div>
              <button
                onClick={() => setShowAgingConfigModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                <Sliders className="w-3.5 h-3.5" />
                Configure Aging Thresholds
              </button>
            </div>

            {/* Severity Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-xs text-gray-500 font-semibold">Active Tasks</span>
                <p className="text-xl font-bold text-gray-900 mt-1">{agingData?.summary.totalActiveTasks || 0}</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <span className="text-xs text-emerald-700 font-semibold">Normal Age (&lt;48h)</span>
                <p className="text-xl font-bold text-emerald-800 mt-1">{agingData?.summary.normalCount || 0}</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <span className="text-xs text-amber-700 font-semibold">Warning Tenure (48h - 96h)</span>
                <p className="text-xl font-bold text-amber-800 mt-1">{agingData?.summary.warningCount || 0}</p>
              </div>
              <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
                <span className="text-xs text-rose-700 font-semibold">Critical Stale (&gt;96h)</span>
                <p className="text-xl font-bold text-rose-800 mt-1">{agingData?.summary.criticalCount || 0}</p>
              </div>
            </div>

            {/* Filter inputs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search task code, title, or assignee..."
                  value={agingSearch}
                  onChange={(e) => setAgingSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                value={agingFilterPriority}
                onChange={(e) => setAgingFilterPriority(e.target.value)}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
              >
                <option value="">All Priorities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>

          {/* Aging Items Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 font-semibold text-gray-500 uppercase bg-gray-50/60">
                    <th className="py-3 px-4">Task</th>
                    <th className="py-3 px-4">Current Status</th>
                    <th className="py-3 px-4">Primary Owner</th>
                    <th className="py-3 px-4">Status Tenure</th>
                    <th className="py-3 px-4">Queue Wait Age</th>
                    <th className="py-3 px-4">Blocked Duration</th>
                    <th className="py-3 px-4">Total Age</th>
                    <th className="py-3 px-4">Diagnostics</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAgingItems.map((item) => (
                    <tr key={item.taskId} className="hover:bg-gray-50/50">
                      <td className="py-3 px-4 font-medium text-gray-900">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-indigo-600">{item.taskCode}</span>
                          {item.isBlocked && (
                            <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-red-100 text-red-700">
                              Blocked
                            </span>
                          )}
                        </div>
                        <div className="text-gray-500 max-w-xs truncate" title={item.title}>
                          {item.title}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-700">{item.statusName}</td>
                      <td className="py-3 px-4 text-gray-600">{item.primaryAssignee}</td>
                      <td className="py-3 px-4 font-bold text-gray-900">{item.currentStatusTenureHours}h</td>
                      <td className="py-3 px-4 text-gray-600">{item.queueWaitingAgeHours}h</td>
                      <td className="py-3 px-4">
                        {item.blockedAgeHours > 0 ? (
                          <span className="font-semibold text-amber-600">{item.blockedAgeHours}h</span>
                        ) : (
                          <span className="text-gray-400">0h</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-500">{item.totalItemAgeHours}h</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            item.agingSeverity === 'CRITICAL'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : item.agingSeverity === 'WARNING'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {item.agingSeverity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add WIP Limit */}
      {showCreateLimitModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Configure Work-in-Progress (WIP) Limit</h3>
            <form onSubmit={handleCreateLimit} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Limit Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. In Progress Stage Limit"
                  value={limitForm.name}
                  onChange={(e) => setLimitForm({ ...limitForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Limit Scope Type</label>
                <select
                  value={limitForm.limit_type}
                  onChange={(e) => setLimitForm({ ...limitForm, limit_type: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-lg bg-white text-sm"
                >
                  <option value="STAGE">Stage / Column</option>
                  <option value="USER">User / Assignee</option>
                  <option value="TEAM">Team Ceiling</option>
                  <option value="PROJECT">Project Wide</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Max Concurrent Work Count</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={limitForm.max_wip_count}
                  onChange={(e) => setLimitForm({ ...limitForm, max_wip_count: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Enforcement Mode</label>
                <select
                  value={limitForm.enforcement_mode}
                  onChange={(e) => setLimitForm({ ...limitForm, enforcement_mode: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-lg bg-white text-sm"
                >
                  <option value="SOFT_WARNING">Soft Warning (Notify & Allow Override)</option>
                  <option value="HARD_GUARD">Hard Guard (Strict Transition Block)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateLimitModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  Save Limit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Authorize Expedited Override */}
      {showOverrideModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              Authorize Expedited WIP Override
            </h3>
            <p className="text-xs text-gray-500">
              Overrides allow emergency or expedited tasks to bypass WIP ceilings with full audit attribution.
            </p>
            <form onSubmit={handleCreateOverride} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Task ID / UUID</label>
                <input
                  type="text"
                  required
                  placeholder="Task UUID"
                  value={overrideForm.task_id}
                  onChange={(e) => setOverrideForm({ ...overrideForm, task_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Mandatory Override Reason</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detail business justification (e.g. Critical client payment bug hotfix)"
                  value={overrideForm.reason}
                  onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm text-white bg-amber-600 rounded-lg hover:bg-amber-700"
                >
                  Authorize Bypass
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Configure Aging Threshold */}
      {showAgingConfigModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Configure Flow Aging Thresholds</h3>
            <form onSubmit={handleCreateAgingConfig} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Configuration Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Critical Priority Accelerated Threshold"
                  value={agingConfigForm.name}
                  onChange={(e) => setAgingConfigForm({ ...agingConfigForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Warning (Hours)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={agingConfigForm.warning_threshold_hours}
                    onChange={(e) =>
                      setAgingConfigForm({ ...agingConfigForm, warning_threshold_hours: parseFloat(e.target.value) || 24 })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Critical (Hours)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={agingConfigForm.critical_threshold_hours}
                    onChange={(e) =>
                      setAgingConfigForm({ ...agingConfigForm, critical_threshold_hours: parseFloat(e.target.value) || 48 })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Time Basis</label>
                <select
                  value={agingConfigForm.time_basis}
                  onChange={(e) => setAgingConfigForm({ ...agingConfigForm, time_basis: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-lg bg-white text-sm"
                >
                  <option value="BUSINESS_HOURS">Business Working Hours (Calendar-based)</option>
                  <option value="ELAPSED_HOURS">Elapsed Wall-Clock Hours</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Priority Override (Optional)</label>
                <select
                  value={agingConfigForm.priority}
                  onChange={(e) => setAgingConfigForm({ ...agingConfigForm, priority: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white text-sm"
                >
                  <option value="">All Priorities</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAgingConfigModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
