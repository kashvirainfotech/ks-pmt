import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Play,
  Pause,
  RotateCcw,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Layers,
  Calendar,
  ChevronRight,
  TrendingUp,
  AlertOctagon,
  MessageSquare,
  FileCheck,
  CheckSquare,
  User,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { slaApi, projectsApi, clientsApi } from '../../api/endpoints';
import {
  SlaPolicy,
  SlaTrackingCycle,
  RiskAlert,
  SlaDashboardResponse,
  Project,
  Client,
  SlaTier,
  SlaTimeBasis,
} from '../../types';

export const SlaAlertsWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'cycles' | 'alerts' | 'policies'>('dashboard');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter state
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // Data states
  const [dashboardData, setDashboardData] = useState<SlaDashboardResponse | null>(null);
  const [cycles, setCycles] = useState<SlaTrackingCycle[]>([]);
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [policies, setPolicies] = useState<SlaPolicy[]>([]);

  // Modal states
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState<boolean>(false);
  const [selectedCycle, setSelectedCycle] = useState<SlaTrackingCycle | null>(null);
  const [actionModalType, setActionModalType] = useState<'response' | 'resolution' | 'pause' | 'extend' | 'reopen' | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<RiskAlert | null>(null);

  // Form states for modals
  const [responseNotes, setResponseNotes] = useState<string>('');
  const [isCustomerVisible, setIsCustomerVisible] = useState<boolean>(true);
  const [terminalStatusCategory, setTerminalStatusCategory] = useState<string>('RESOLVED');
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [pauseReason, setPauseReason] = useState<string>('AWAITING_CLIENT_RESPONSE');
  const [extendMinutes, setExtendMinutes] = useState<number>(120);
  const [extendReason, setExtendReason] = useState<string>('');
  const [reopenReason, setReopenReason] = useState<string>('');
  const [alertActionNotes, setAlertActionNotes] = useState<string>('');

  // Policy creation form state
  const [policyForm, setPolicyForm] = useState({
    policyCode: '',
    policyName: '',
    description: '',
    tier: 'TIER_3_STANDARD' as SlaTier,
    responseTimeMinutes: 120,
    responseTimeBasis: 'BUSINESS_HOURS' as SlaTimeBasis,
    resolutionTimeMinutes: 480,
    resolutionTimeBasis: 'BUSINESS_HOURS' as SlaTimeBasis,
    responseWarningThresholdPct: 75,
    resolutionWarningThresholdPct: 75,
    precedenceRank: 100,
    priority: '',
    severity: '',
    isDefault: false,
    projectId: '',
    clientId: '',
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadTabContent();
  }, [activeTab, selectedProjectId]);

  const loadInitialData = async () => {
    try {
      const [projRes, clientRes] = await Promise.all([
        projectsApi.getProjects(),
        clientsApi.getAll(),
      ]);
      setProjects(projRes.data || []);
      setClients(clientRes.data || []);
    } catch (err: any) {
      console.error('Failed to load projects/clients', err);
    }
  };

  const loadTabContent = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'dashboard') {
        const res = await slaApi.getDashboard({
          projectId: selectedProjectId || undefined,
        });
        setDashboardData(res.data);
      } else if (activeTab === 'cycles') {
        const res = await slaApi.getCycles({
          projectId: selectedProjectId || undefined,
        });
        setCycles(res.data || []);
      } else if (activeTab === 'alerts') {
        const res = await slaApi.getAlerts({
          projectId: selectedProjectId || undefined,
        });
        setAlerts(res.data || []);
      } else if (activeTab === 'policies') {
        const res = await slaApi.getPolicies({
          projectId: selectedProjectId || undefined,
        });
        setPolicies(res.data || []);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to load SLA data');
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluateAlerts = async () => {
    setLoading(true);
    try {
      const res = await slaApi.evaluateAlerts({
        projectId: selectedProjectId || undefined,
      });
      setSuccessMessage(`SLA rules evaluated: ${res.data.length} active risk alert(s) detected.`);
      if (activeTab === 'alerts' || activeTab === 'dashboard') {
        loadTabContent();
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to evaluate SLA rules');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordResponse = async () => {
    if (!selectedCycle) return;
    try {
      await slaApi.recordFirstResponse(selectedCycle.id, {
        isCustomerVisible,
        notes: responseNotes,
      });
      setSuccessMessage(`First response recorded on ${selectedCycle.cycle_number}.`);
      setActionModalType(null);
      setSelectedCycle(null);
      loadTabContent();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to record response');
    }
  };

  const handleRecordResolution = async () => {
    if (!selectedCycle) return;
    try {
      await slaApi.recordResolution(selectedCycle.id, {
        terminalStatusCategory,
        notes: resolutionNotes,
      });
      setSuccessMessage(`Resolution recorded on ${selectedCycle.cycle_number}. Associated risk alerts auto-cleared.`);
      setActionModalType(null);
      setSelectedCycle(null);
      loadTabContent();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to record resolution');
    }
  };

  const handlePauseCycle = async () => {
    if (!selectedCycle) return;
    try {
      await slaApi.pauseCycle(selectedCycle.id, {
        pauseReason,
      });
      setSuccessMessage(`SLA cycle ${selectedCycle.cycle_number} paused for reason: ${pauseReason}.`);
      setActionModalType(null);
      setSelectedCycle(null);
      loadTabContent();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to pause cycle');
    }
  };

  const handleResumeCycle = async (cycleId: string) => {
    try {
      await slaApi.resumeCycle(cycleId);
      setSuccessMessage(`SLA cycle resumed. Deadlines adjusted outward by paused duration.`);
      loadTabContent();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to resume cycle');
    }
  };

  const handleExtendDeadline = async () => {
    if (!selectedCycle) return;
    try {
      await slaApi.extendDeadline(selectedCycle.id, {
        addedMinutes: Number(extendMinutes),
        reason: extendReason,
      });
      setSuccessMessage(`Resolution deadline extended by ${extendMinutes} minutes.`);
      setActionModalType(null);
      setSelectedCycle(null);
      loadTabContent();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to extend deadline');
    }
  };

  const handleReopenCycle = async () => {
    if (!selectedCycle) return;
    try {
      await slaApi.reopenCycle(selectedCycle.id, {
        reason: reopenReason,
      });
      setSuccessMessage(`New SLA cycle iteration opened. Historical cycle preserved.`);
      setActionModalType(null);
      setSelectedCycle(null);
      loadTabContent();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to reopen cycle');
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await slaApi.acknowledgeAlert(alertId, { notes: alertActionNotes });
      setSuccessMessage('Risk alert acknowledged.');
      setSelectedAlert(null);
      loadTabContent();
    } catch (err: any) {
      setError('Failed to acknowledge alert');
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await slaApi.resolveAlert(alertId, { resolutionNotes: alertActionNotes || 'Resolved' });
      setSuccessMessage('Risk alert marked as resolved.');
      setSelectedAlert(null);
      loadTabContent();
    } catch (err: any) {
      setError('Failed to resolve alert');
    }
  };

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await slaApi.createPolicy({
        ...policyForm,
        clientId: policyForm.clientId || undefined,
        projectId: policyForm.projectId || undefined,
        priority: policyForm.priority || undefined,
        severity: policyForm.severity || undefined,
      });
      setSuccessMessage(`SLA Policy ${policyForm.policyCode} created.`);
      setIsPolicyModalOpen(false);
      loadTabContent();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create policy');
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            <AlertOctagon className="w-3 h-3 mr-1" />
            CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <AlertTriangle className="w-3 h-3 mr-1" />
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
            MEDIUM
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
            LOW
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'MET':
      case 'RESOLVED_MET':
      case 'RESPONSE_MET':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {status}
          </span>
        );
      case 'BREACHED':
      case 'RESOLVED_BREACHED':
      case 'RESPONSE_BREACHED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            <XCircle className="w-3 h-3 mr-1" />
            {status}
          </span>
        );
      case 'PAUSED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <Pause className="w-3 h-3 mr-1" />
            PAUSED
          </span>
        );
      case 'RUNNING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
            <Clock className="w-3 h-3 mr-1 animate-spin" />
            RUNNING
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 rounded-xl text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Contractual SLA & Rule-Based Risk Alerts
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Deterministic SLA policy precedence, calendar-aware pauses, response/resolution verification & non-duplicating escalation alerts.
              </p>
            </div>
          </div>
        </div>

        {/* Global Project Filter & Actions */}
        <div className="flex items-center gap-3">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 dark:text-white shadow-xs"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_name} ({p.project_code})
              </option>
            ))}
          </select>

          <button
            onClick={handleEvaluateAlerts}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Zap className="w-3.5 h-3.5" />
            Scan Rules
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-sm">Error</h4>
            <p className="text-sm mt-0.5">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 text-sm">✕</button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-200 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-sm">Success</h4>
            <p className="text-sm mt-0.5">{successMessage}</p>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700 text-sm">✕</button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-8">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'dashboard'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Executive SLA Dashboard
        </button>
        <button
          onClick={() => setActiveTab('cycles')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'cycles'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Clock className="w-4 h-4" />
          Tracking Cycles Console
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'alerts'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <AlertOctagon className="w-4 h-4" />
          Risk Alerts & Escalations ({alerts.length})
        </button>
        <button
          onClick={() => setActiveTab('policies')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'policies'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Layers className="w-4 h-4" />
          SLA Policies
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: EXECUTIVE SLA DASHBOARD */}
      {/* ======================================================== */}
      {activeTab === 'dashboard' && dashboardData && (
        <div className="space-y-6">
          {/* Top KPI Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
              <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">
                Overall Compliance Rate
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                  {dashboardData.summary.overallComplianceRate}%
                </span>
                <span className="text-xs text-emerald-600 font-semibold">Target: 95%</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {dashboardData.summary.totalCycles} Total Monitored Cycles
              </div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
              <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">
                First-Response SLA Met
              </div>
              <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-2">
                {dashboardData.summary.responseComplianceRate}%
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Avg: {dashboardData.summary.avgResponseMinutes} mins
              </div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
              <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">
                Resolution SLA Met
              </div>
              <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
                {dashboardData.summary.resolutionComplianceRate}%
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Avg: {dashboardData.summary.avgResolutionMinutes} mins
              </div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
              <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">
                Active In-Flight Cycles
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
                {dashboardData.summary.runningCycles}
              </div>
              <div className="text-xs text-amber-600 font-medium mt-1">
                {dashboardData.summary.pausedCycles} Paused (Client/Vendor)
              </div>
            </div>
          </div>

          {/* Risk Alerts Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider">
                  Critical Risk Alerts
                </span>
                <span className="text-2xl font-black text-rose-700 dark:text-rose-400">
                  {dashboardData.alerts.critical}
                </span>
              </div>
              <p className="text-xs text-rose-600 dark:text-rose-300">
                Imminent or occurred breaches requiring delivery leadership intervention.
              </p>
            </div>

            <div className="p-5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                  High Risk Alerts (75% Threshold)
                </span>
                <span className="text-2xl font-black text-amber-700 dark:text-amber-400">
                  {dashboardData.alerts.high}
                </span>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-300">
                Approaching SLA target limits or unassigned work items near due dates.
              </p>
            </div>

            <div className="p-5 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                  Stale Active Work
                </span>
                <span className="text-2xl font-black text-blue-700 dark:text-blue-400">
                  {dashboardData.alerts.staleWorkAlerts}
                </span>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-300">
                In-progress tasks with no worklogs or activity for over 72 hours.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: SLA TRACKING CYCLES CONSOLE */}
      {/* ======================================================== */}
      {activeTab === 'cycles' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active & Historical Tracking Cycles</h3>
              <p className="text-xs text-slate-500">Live wall-clock vs business hour accounting with calendar snapshots</p>
            </div>
            <button
              onClick={loadTabContent}
              className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Cycles
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Cycle #</th>
                  <th className="py-3 px-4">Work Item</th>
                  <th className="py-3 px-4">Policy & Tier</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Response Target</th>
                  <th className="py-3 px-4">Resolution Target</th>
                  <th className="py-3 px-4">Pause Time</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {cycles.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No tracking cycles active for the selected filter.
                    </td>
                  </tr>
                ) : (
                  cycles.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                        {c.cycle_number}
                        {c.cycle_iteration > 1 && (
                          <span className="ml-1 text-[10px] bg-indigo-100 text-indigo-800 px-1 py-0.5 rounded">
                            v{c.cycle_iteration}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {c.task_code || 'Request'}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">{c.task_title || '-'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{c.policy_name}</div>
                        <div className="text-[10px] text-slate-400 uppercase font-mono">{c.tier}</div>
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(c.status)}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold">
                          {c.response_status === 'MET' ? (
                            <span className="text-emerald-600">Met in {c.elapsed_response_minutes}m</span>
                          ) : c.response_status === 'BREACHED' ? (
                            <span className="text-rose-600">Breached</span>
                          ) : (
                            <span className="text-blue-600">Due {new Date(c.response_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold">
                          {c.resolution_status === 'MET' ? (
                            <span className="text-emerald-600">Resolved ({c.elapsed_resolution_minutes}m)</span>
                          ) : c.resolution_status === 'BREACHED' ? (
                            <span className="text-rose-600">Breached</span>
                          ) : (
                            <span className="text-slate-700 dark:text-slate-300">
                              {new Date(c.resolution_deadline).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                              {new Date(c.resolution_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {c.total_paused_minutes > 0 ? `${c.total_paused_minutes}m` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        {c.response_status === 'PENDING' && (
                          <button
                            onClick={() => {
                              setSelectedCycle(c);
                              setActionModalType('response');
                            }}
                            className="inline-flex items-center px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 rounded font-medium text-xs transition-colors"
                          >
                            <MessageSquare className="w-3 h-3 mr-1" />
                            Response
                          </button>
                        )}
                        {c.resolution_status === 'PENDING' && (
                          <button
                            onClick={() => {
                              setSelectedCycle(c);
                              setActionModalType('resolution');
                            }}
                            className="inline-flex items-center px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded font-medium text-xs transition-colors"
                          >
                            <CheckSquare className="w-3 h-3 mr-1" />
                            Resolve
                          </button>
                        )}
                        {!c.is_paused && c.resolution_status === 'PENDING' && (
                          <button
                            onClick={() => {
                              setSelectedCycle(c);
                              setActionModalType('pause');
                            }}
                            className="inline-flex items-center px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 rounded font-medium text-xs transition-colors"
                          >
                            <Pause className="w-3 h-3 mr-1" />
                            Pause
                          </button>
                        )}
                        {c.is_paused && (
                          <button
                            onClick={() => handleResumeCycle(c.id)}
                            className="inline-flex items-center px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 rounded font-medium text-xs transition-colors"
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Resume
                          </button>
                        )}
                        {c.resolution_status === 'PENDING' && (
                          <button
                            onClick={() => {
                              setSelectedCycle(c);
                              setActionModalType('extend');
                            }}
                            className="inline-flex items-center px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded font-medium text-xs transition-colors"
                          >
                            +Extend
                          </button>
                        )}
                        {(c.status === 'RESOLVED_MET' || c.status === 'RESOLVED_BREACHED') && (
                          <button
                            onClick={() => {
                              setSelectedCycle(c);
                              setActionModalType('reopen');
                            }}
                            className="inline-flex items-center px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded font-medium text-xs transition-colors"
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Reopen
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: RULE-BASED RISK ALERTS & ESCALATIONS */}
      {/* ======================================================== */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Risk Alerts</h3>
              <p className="text-xs text-slate-500">Deterministic triggers based on deadline thresholds, stale state, and capacity limits</p>
            </div>
            <button
              onClick={handleEvaluateAlerts}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              Re-Scan Risk Rules
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {alerts.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-400">
                No active risk alerts found. All active tickets are within SLA boundaries.
              </div>
            ) : (
              alerts.map((alt) => (
                <div
                  key={alt.id}
                  className={`p-5 bg-white dark:bg-slate-900 border rounded-xl shadow-xs transition-all ${
                    alt.severity === 'CRITICAL'
                      ? 'border-rose-300 dark:border-rose-800/60 bg-rose-50/20'
                      : alt.severity === 'HIGH'
                      ? 'border-amber-300 dark:border-amber-800/60'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        {getSeverityBadge(alt.severity)}
                        <span className="font-mono text-xs font-semibold text-slate-500">{alt.alert_code}</span>
                        <span className="text-xs font-medium text-slate-400">Tier {alt.escalation_tier} Escalation</span>
                        <span className="text-xs text-slate-400">
                          Freshness: {new Date(alt.freshness_updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">{alt.title}</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{alt.description}</p>

                      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs space-y-1">
                        <div>
                          <strong className="text-slate-700 dark:text-slate-200">Trigger Reason: </strong>
                          <span className="text-slate-600 dark:text-slate-400">{alt.trigger_reason}</span>
                        </div>
                        <div>
                          <strong className="text-slate-700 dark:text-slate-200">Recommended Action: </strong>
                          <span className="text-indigo-600 dark:text-indigo-400 font-medium">{alt.recommended_action}</span>
                        </div>
                      </div>

                      {alt.owner_name && (
                        <div className="text-xs text-slate-500 flex items-center gap-1.5 pt-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>Owner: {alt.owner_name}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex md:flex-col gap-2 flex-shrink-0">
                      {alt.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleAcknowledgeAlert(alt.id)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors"
                        >
                          Acknowledge
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedAlert(alt);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
                      >
                        Resolve Alert
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: SLA POLICIES CATALOG */}
      {/* ======================================================== */}
      {activeTab === 'policies' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Contractual SLA Policies Catalog</h3>
              <p className="text-xs text-slate-500">Deterministic matching based on client, project, task type, priority & severity</p>
            </div>
            <button
              onClick={() => setIsPolicyModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              New SLA Policy
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {policies.map((p) => (
              <div key={p.id} className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 shadow-xs">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                      {p.policy_code}
                    </span>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">{p.policy_name}</h4>
                  </div>
                  {p.is_default && (
                    <span className="text-[10px] font-bold uppercase bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                      Default
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">{p.description || 'Standard SLA policy'}</p>

                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs">
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase font-semibold">Response Target</div>
                    <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                      {p.response_time_minutes} mins ({p.response_time_basis === 'BUSINESS_HOURS' ? 'Biz Hrs' : 'Elapsed'})
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase font-semibold">Resolution Target</div>
                    <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                      {p.resolution_time_minutes} mins ({p.resolution_time_basis === 'BUSINESS_HOURS' ? 'Biz Hrs' : 'Elapsed'})
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Precedence Rank:</span>
                    <span className="font-mono font-semibold">{p.precedence_rank}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tier:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{p.tier}</span>
                  </div>
                  {p.client_name && (
                    <div className="flex justify-between">
                      <span>Client:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{p.client_name}</span>
                    </div>
                  )}
                  {p.project_name && (
                    <div className="flex justify-between">
                      <span>Project:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{p.project_name}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ACTION CONSOLE (RESPONSE / RESOLUTION / PAUSE / EXTEND) */}
      {/* ======================================================== */}
      {selectedCycle && actionModalType && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {actionModalType === 'response' && 'Record Customer First Response'}
                {actionModalType === 'resolution' && 'Record Final Customer Resolution'}
                {actionModalType === 'pause' && 'Pause SLA Tracking Cycle'}
                {actionModalType === 'extend' && 'Extend Resolution Deadline'}
                {actionModalType === 'reopen' && 'Reopen SLA Cycle (Iteration N+1)'}
              </h3>
              <button
                onClick={() => {
                  setActionModalType(null);
                  setSelectedCycle(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-500">
              Cycle: <strong className="text-indigo-600">{selectedCycle.cycle_number}</strong> | Work: {selectedCycle.task_code || 'Request'}
            </div>

            {/* RESPONSE FORM */}
            {actionModalType === 'response' && (
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCustomerVisible}
                    onChange={(e) => setIsCustomerVisible(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  Communication is Customer-Visible (Required to satisfy SLA)
                </label>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Response Notes
                  </label>
                  <textarea
                    rows={3}
                    value={responseNotes}
                    onChange={(e) => setResponseNotes(e.target.value)}
                    placeholder="Initial triage response sent to customer acknowledging ticket..."
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={handleRecordResponse}
                    disabled={!isCustomerVisible}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50"
                  >
                    Commit First Response
                  </button>
                </div>
              </div>
            )}

            {/* RESOLUTION FORM */}
            {actionModalType === 'resolution' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Terminal Outcome Status Category
                  </label>
                  <select
                    value={terminalStatusCategory}
                    onChange={(e) => setTerminalStatusCategory(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="CLOSED">CLOSED</option>
                    <option value="ACCEPTED">ACCEPTED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Resolution Notes
                  </label>
                  <textarea
                    rows={3}
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Hotfix deployed to production and verified by customer..."
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={handleRecordResolution}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                  >
                    Commit Customer Resolution
                  </button>
                </div>
              </div>
            )}

            {/* PAUSE FORM */}
            {actionModalType === 'pause' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Pause Reason Category
                  </label>
                  <select
                    value={pauseReason}
                    onChange={(e) => setPauseReason(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="AWAITING_CLIENT_RESPONSE">Awaiting Customer Response / Feedback</option>
                    <option value="VENDOR_DEPENDENCY">Vendor / Third-Party External Dependency</option>
                    <option value="BLOCKED_EXTERNAL">External Infrastructure / Regulatory Hold</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={handlePauseCycle}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                  >
                    Pause Cycle Clock
                  </button>
                </div>
              </div>
            )}

            {/* EXTEND FORM */}
            {actionModalType === 'extend' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Added Extension (Minutes)
                  </label>
                  <input
                    type="number"
                    value={extendMinutes}
                    onChange={(e) => setExtendMinutes(Number(e.target.value))}
                    min={15}
                    step={15}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Extension Reason Attribution (Required)
                  </label>
                  <input
                    type="text"
                    value={extendReason}
                    onChange={(e) => setExtendReason(e.target.value)}
                    placeholder="e.g. Scope extension authorized by client in CR-2026-0004"
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={handleExtendDeadline}
                    disabled={!extendReason}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50"
                  >
                    Authorize Extension
                  </button>
                </div>
              </div>
            )}

            {/* REOPEN FORM */}
            {actionModalType === 'reopen' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Reopening Reason
                  </label>
                  <textarea
                    rows={3}
                    value={reopenReason}
                    onChange={(e) => setReopenReason(e.target.value)}
                    placeholder="Customer reported recurrence of issue in edge case..."
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={handleReopenCycle}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                  >
                    Initiate Cycle Reopening
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREATE SLA POLICY */}
      {/* ======================================================== */}
      {isPolicyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Create New Contractual SLA Policy</h3>
              <button onClick={() => setIsPolicyModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePolicy} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Policy Code *</label>
                  <input
                    type="text"
                    required
                    value={policyForm.policyCode}
                    onChange={(e) => setPolicyForm({ ...policyForm, policyCode: e.target.value })}
                    placeholder="e.g. SLA-POL-P1-CRIT"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Policy Name *</label>
                  <input
                    type="text"
                    required
                    value={policyForm.policyName}
                    onChange={(e) => setPolicyForm({ ...policyForm, policyName: e.target.value })}
                    placeholder="e.g. P1 Critical Enterprise Support SLA"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">SLA Tier</label>
                  <select
                    value={policyForm.tier}
                    onChange={(e) => setPolicyForm({ ...policyForm, tier: e.target.value as SlaTier })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="TIER_1_CRITICAL">Tier 1 Critical</option>
                    <option value="TIER_2_HIGH">Tier 2 High</option>
                    <option value="TIER_3_STANDARD">Tier 3 Standard</option>
                    <option value="TIER_4_BASIC">Tier 4 Basic</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Precedence Rank</label>
                  <input
                    type="number"
                    value={policyForm.precedenceRank}
                    onChange={(e) => setPolicyForm({ ...policyForm, precedenceRank: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Default Fallback</label>
                  <label className="flex items-center gap-2 pt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={policyForm.isDefault}
                      onChange={(e) => setPolicyForm({ ...policyForm, isDefault: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    Is System Default
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Response Target (Minutes) *</label>
                  <input
                    type="number"
                    required
                    value={policyForm.responseTimeMinutes}
                    onChange={(e) => setPolicyForm({ ...policyForm, responseTimeMinutes: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Response Basis</label>
                  <select
                    value={policyForm.responseTimeBasis}
                    onChange={(e) => setPolicyForm({ ...policyForm, responseTimeBasis: e.target.value as SlaTimeBasis })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="BUSINESS_HOURS">Business Hours (Working Calendar)</option>
                    <option value="ELAPSED_HOURS">Elapsed Hours (24x7 Wall-clock)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Resolution Target (Minutes) *</label>
                  <input
                    type="number"
                    required
                    value={policyForm.resolutionTimeMinutes}
                    onChange={(e) => setPolicyForm({ ...policyForm, resolutionTimeMinutes: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Resolution Basis</label>
                  <select
                    value={policyForm.resolutionTimeBasis}
                    onChange={(e) => setPolicyForm({ ...policyForm, resolutionTimeBasis: e.target.value as SlaTimeBasis })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="BUSINESS_HOURS">Business Hours (Working Calendar)</option>
                    <option value="ELAPSED_HOURS">Elapsed Hours (24x7 Wall-clock)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPolicyModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  Save Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: RESOLVE RISK ALERT */}
      {/* ======================================================== */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Resolve Risk Alert</h3>
              <button onClick={() => setSelectedAlert(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedAlert.title}</p>
              <p className="text-slate-500 mt-1">{selectedAlert.description}</p>
            </div>
            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Resolution Notes *</label>
              <textarea
                rows={3}
                value={alertActionNotes}
                onChange={(e) => setAlertActionNotes(e.target.value)}
                placeholder="Explain the mitigation or completed action taken..."
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => handleResolveAlert(selectedAlert.id)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs"
              >
                Mark as Resolved
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
