import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  Calendar,
  Layers,
  Lock,
  Eye,
  EyeOff,
  BarChart3,
  Percent,
  Sliders,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  X,
  Compass,
  Briefcase,
  HelpCircle,
  Globe,
} from 'lucide-react';
import {
  financialAnalyticsApi,
  projectsApi,
} from '../../api/endpoints';
import {
  Project,
  ProjectFinancialOverview,
  ProjectFinancialBaseline,
  ProjectFinancialRateCard,
  ProjectFinancialPeriodicMetric,
  CurrencyExchangeRate,
} from '../../types';

export const FinancialAnalyticsWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'baselines' | 'rate-cards' | 'periodic-ledger' | 'currencies'
  >('overview');

  // Projects & Selected Scope
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Data states
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [overview, setOverview] = useState<ProjectFinancialOverview | null>(null);
  const [baselines, setBaselines] = useState<ProjectFinancialBaseline[]>([]);
  const [rateCards, setRateCards] = useState<ProjectFinancialRateCard[]>([]);
  const [periodicMetrics, setPeriodicMetrics] = useState<ProjectFinancialPeriodicMetric[]>([]);
  const [exchangeRates, setExchangeRates] = useState<CurrencyExchangeRate[]>([]);

  // Modals
  const [showCreateBaselineModal, setShowCreateBaselineModal] = useState<boolean>(false);
  const [showCreateRateCardModal, setShowCreateRateCardModal] = useState<boolean>(false);
  const [showCreateExchangeRateModal, setShowCreateExchangeRateModal] = useState<boolean>(false);

  // Forms
  const [baselineForm, setBaselineForm] = useState({
    baseline_code: '',
    name: '',
    description: '',
    budgeted_hours: 200,
    budgeted_cost: 80000,
    budgeted_revenue: 190000,
    warning_threshold_pct: 75,
    critical_threshold_pct: 90,
  });

  const [rateCardForm, setRateCardForm] = useState({
    rate_code: '',
    role_id: '',
    currency: 'INR',
    hourly_billing_rate: 1200,
    hourly_cost_rate: 450,
    effective_start_date: new Date().toISOString().split('T')[0],
    description: '',
  });

  const [exchangeRateForm, setExchangeRateForm] = useState({
    from_currency: 'USD',
    to_currency: 'INR',
    exchange_rate: 84.25,
    source: 'RBI_REFERENCE',
  });

  // Load project list on mount
  useEffect(() => {
    loadProjects();
    loadExchangeRates();
  }, []);

  // When selected project changes, load financial overview & details
  useEffect(() => {
    if (selectedProjectId) {
      loadProjectFinancialData(selectedProjectId);
    }
  }, [selectedProjectId]);

  const loadProjects = async () => {
    try {
      const res = await projectsApi.getProjects();
      const list = res.data || [];
      setProjects(list);
      if (list.length > 0 && !selectedProjectId) {
        setSelectedProjectId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load projects', err);
    }
  };

  const loadProjectFinancialData = async (projectId: string) => {
    try {
      setLoading(true);
      const [overviewRes, baseRes, rateRes, metricRes] = await Promise.all([
        financialAnalyticsApi.getOverview(projectId),
        financialAnalyticsApi.getBaselines(projectId),
        financialAnalyticsApi.getRateCards(projectId),
        financialAnalyticsApi.getMetrics(projectId),
      ]);
      setOverview(overviewRes.data);
      setBaselines(baseRes.data || []);
      setRateCards(rateRes.data || []);
      setPeriodicMetrics(metricRes.data || []);
    } catch (err) {
      console.error('Failed to load project financial data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadExchangeRates = async () => {
    try {
      const res = await financialAnalyticsApi.getExchangeRates();
      setExchangeRates(res.data || []);
    } catch (err) {
      console.error('Failed to load exchange rates', err);
    }
  };

  const handleRefresh = () => {
    if (selectedProjectId) {
      setRefreshing(true);
      loadProjectFinancialData(selectedProjectId);
      loadExchangeRates();
    }
  };

  // Create Baseline
  const handleCreateBaseline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !baselineForm.name) return;
    try {
      const code = baselineForm.baseline_code.trim() || `BASE-${Date.now().toString().slice(-5)}`;
      await financialAnalyticsApi.createBaseline({
        ...baselineForm,
        project_id: selectedProjectId,
        baseline_code: code,
        budgeted_hours: Number(baselineForm.budgeted_hours),
        budgeted_cost: Number(baselineForm.budgeted_cost),
        budgeted_revenue: Number(baselineForm.budgeted_revenue),
        warning_threshold_pct: Number(baselineForm.warning_threshold_pct),
        critical_threshold_pct: Number(baselineForm.critical_threshold_pct),
      });
      setShowCreateBaselineModal(false);
      loadProjectFinancialData(selectedProjectId);
    } catch (err: any) {
      console.error('Failed to create baseline', err);
      alert(err.response?.data?.message || 'Failed to create financial baseline.');
    }
  };

  // Toggle Baseline Freeze
  const handleToggleFreeze = async (baselineId: string) => {
    try {
      await financialAnalyticsApi.toggleFreezeBaseline(baselineId);
      loadProjectFinancialData(selectedProjectId);
    } catch (err: any) {
      console.error('Failed to toggle freeze', err);
      alert('Failed to update baseline status.');
    }
  };

  // Create Rate Card
  const handleCreateRateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const code = rateCardForm.rate_code.trim() || `RATE-${Date.now().toString().slice(-5)}`;
      await financialAnalyticsApi.createRateCard({
        ...rateCardForm,
        project_id: selectedProjectId || undefined,
        rate_code: code,
        hourly_billing_rate: Number(rateCardForm.hourly_billing_rate),
        hourly_cost_rate: Number(rateCardForm.hourly_cost_rate),
      });
      setShowCreateRateCardModal(false);
      loadProjectFinancialData(selectedProjectId);
    } catch (err: any) {
      console.error('Failed to create rate card', err);
      alert(err.response?.data?.message || 'Failed to create rate card.');
    }
  };

  // Create Exchange Rate
  const handleCreateExchangeRate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await financialAnalyticsApi.createExchangeRate({
        ...exchangeRateForm,
        exchange_rate: Number(exchangeRateForm.exchange_rate),
      });
      setShowCreateExchangeRateModal(false);
      loadExchangeRates();
    } catch (err: any) {
      console.error('Failed to save exchange rate', err);
      alert('Failed to save currency exchange rate.');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 rounded-xl text-white shadow-sm">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Project Financials, Variance & Reconciliation</h1>
              <p className="text-sm text-gray-500">
                Baseline effort variance, budget consumption thresholds, estimate at completion (EAC), burn curves, and contribution margins
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 -mb-px">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition ${
              activeTab === 'overview'
                ? 'border-emerald-600 text-emerald-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Financial Overview & Thresholds
          </button>

          <button
            onClick={() => setActiveTab('baselines')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition ${
              activeTab === 'baselines'
                ? 'border-emerald-600 text-emerald-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            Baselines & Thresholds ({baselines.length})
          </button>

          <button
            onClick={() => setActiveTab('rate-cards')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition ${
              activeTab === 'rate-cards'
                ? 'border-emerald-600 text-emerald-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Effective Rate Cards ({rateCards.length})
          </button>

          <button
            onClick={() => setActiveTab('periodic-ledger')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition ${
              activeTab === 'periodic-ledger'
                ? 'border-emerald-600 text-emerald-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            Periodic Metric Ledger ({periodicMetrics.length})
          </button>

          <button
            onClick={() => setActiveTab('currencies')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition ${
              activeTab === 'currencies'
                ? 'border-emerald-600 text-emerald-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Globe className="w-4 h-4" />
            Currencies & FX ({exchangeRates.length})
          </button>
        </nav>
      </div>

      {/* Project Selector Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Target Project:</span>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="text-sm font-semibold bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-emerald-500 focus:border-emerald-500 min-w-[280px]"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_name} ({p.project_code})
              </option>
            ))}
          </select>

          {overview?.project && (
            <div className="flex items-center gap-2 ml-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                {overview.project.billingType.replace('_', ' ')}
              </span>
              <span className="text-xs font-medium text-gray-500">
                Client: <strong>{overview.project.clientName || 'Direct'}</strong>
              </span>
            </div>
          )}
        </div>

        {overview?.baseline && (
          <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg border">
            <span className="font-semibold text-gray-800">Active Baseline:</span>
            <span className="font-mono text-emerald-700 font-bold">{overview.baseline.baselineCode}</span>
            <span className="text-gray-400">•</span>
            <span>Budget: {overview.baseline.budgetedHours}h</span>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: FINANCIAL OVERVIEW & THRESHOLDS */}
      {/* ======================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {loading ? (
            <div className="p-12 text-center text-gray-500">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-3" />
              Reconciling worklog entries, baseline hours, and financial rate cards...
            </div>
          ) : overview ? (
            <>
              {/* Executive Financial Scorecards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Effort Variance */}
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Effort Variance</p>
                    <h3
                      className={`text-2xl font-bold mt-1 ${
                        overview.effortMetrics.effortVarianceHours > 0
                          ? 'text-rose-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {overview.effortMetrics.effortVarianceHours > 0 ? '+' : ''}
                      {overview.effortMetrics.effortVarianceHours.toFixed(1)}h
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Actual {overview.effortMetrics.actualLoggedHours.toFixed(1)}h vs Baseline{' '}
                      {overview.effortMetrics.totalBaselineEstimatedHours.toFixed(1)}h
                    </p>
                  </div>
                  <div
                    className={`p-3 rounded-lg ${
                      overview.effortMetrics.effortVarianceHours > 0
                        ? 'bg-rose-50 text-rose-600'
                        : 'bg-emerald-50 text-emerald-600'
                    }`}
                  >
                    {overview.effortMetrics.effortVarianceHours > 0 ? (
                      <ArrowUpRight className="w-6 h-6" />
                    ) : (
                      <ArrowDownRight className="w-6 h-6" />
                    )}
                  </div>
                </div>

                {/* 2. Budget Consumption */}
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Budget Consumption</p>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          overview.effortMetrics.thresholdStatus === 'OVERRUN'
                            ? 'bg-rose-100 text-rose-800'
                            : overview.effortMetrics.thresholdStatus === 'CRITICAL'
                            ? 'bg-amber-100 text-amber-800'
                            : overview.effortMetrics.thresholdStatus === 'WARNING'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {overview.effortMetrics.thresholdStatus}
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">
                      {overview.effortMetrics.budgetConsumptionPct != null
                        ? `${overview.effortMetrics.budgetConsumptionPct.toFixed(1)}%`
                        : 'N/A'}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Budget: {overview.effortMetrics.budgetedHours.toFixed(0)}h
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                    <Percent className="w-6 h-6" />
                  </div>
                </div>

                {/* 3. Estimate at Completion (EAC) */}
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Estimate at Completion (EAC)</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">
                      {overview.effortMetrics.eacHours.toFixed(1)}h
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Actual {overview.effortMetrics.actualLoggedHours.toFixed(0)}h + Remaining{' '}
                      {overview.effortMetrics.remainingHours.toFixed(0)}h
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                    <Clock className="w-6 h-6" />
                  </div>
                </div>

                {/* 4. Contribution Margin */}
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Contribution Margin</p>
                    {overview.financialMetrics.isCostRedacted ? (
                      <div className="mt-1 flex items-center gap-1.5 text-gray-400 text-sm font-semibold">
                        <Lock className="w-4 h-4" />
                        <span>Confidential</span>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                          {overview.financialMetrics.contributionMarginPct != null
                            ? `${overview.financialMetrics.contributionMarginPct.toFixed(1)}%`
                            : 'N/A'}
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Contrib: {overview.financialMetrics.currency}{' '}
                          {overview.financialMetrics.directContribution?.toLocaleString()}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                    <DollarSign className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Effort Reconciliation Panel */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">Effort Reconciliation & Time Log Accounting</h3>
                    <p className="text-xs text-gray-500">
                      Unapproved draft worklogs are reconciled separately from approved billable time without double-counting.
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 rounded text-gray-700">
                    {overview.effortMetrics.worklogEntriesCount} total worklogs recorded
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Total Logged Time</span>
                    <p className="text-xl font-bold text-gray-900 mt-1">{overview.effortMetrics.actualLoggedHours.toFixed(1)}h</p>
                    <span className="text-[11px] text-gray-500">All worklog entries</span>
                  </div>

                  <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200">
                    <span className="text-xs font-semibold text-emerald-800 uppercase">Approved Billable</span>
                    <p className="text-xl font-bold text-emerald-700 mt-1">{overview.effortMetrics.approvedBillableHours.toFixed(1)}h</p>
                    <span className="text-[11px] text-emerald-600">Client-recognized time</span>
                  </div>

                  <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200">
                    <span className="text-xs font-semibold text-blue-800 uppercase">Approved Non-Billable</span>
                    <p className="text-xl font-bold text-blue-700 mt-1">{overview.effortMetrics.approvedNonBillableHours.toFixed(1)}h</p>
                    <span className="text-[11px] text-blue-600">Approved internal overhead</span>
                  </div>

                  <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200">
                    <span className="text-xs font-semibold text-amber-800 uppercase">Unapproved Draft</span>
                    <p className="text-xl font-bold text-amber-700 mt-1">{overview.effortMetrics.unapprovedDraftHours.toFixed(1)}h</p>
                    <span className="text-[11px] text-amber-600">Pending timesheet review</span>
                  </div>
                </div>
              </div>

              {/* Commercials Summary Panel (Direct Revenue & Cost) */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">Direct Delivery Financials & Commercial Contribution</h3>
                    <p className="text-xs text-gray-500">
                      Calculated using effective-dated rate cards. Internal labor cost rates are strictly protected by RBAC.
                    </p>
                  </div>
                  {overview.financialMetrics.isCostRedacted && (
                    <span className="text-xs font-semibold px-2 py-0.5 bg-amber-100 text-amber-800 rounded flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Cost rates hidden
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Recognized Revenue</span>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {overview.financialMetrics.currency} {overview.financialMetrics.totalRecognizedRevenue.toLocaleString()}
                    </p>
                    <span className="text-xs text-gray-400">
                      {overview.project.billingType === 'FIXED_PRICE' ? 'Contract amount' : 'Billable hours × rate'}
                    </span>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Direct Delivery Cost</span>
                    {overview.financialMetrics.isCostRedacted ? (
                      <p className="text-sm font-semibold text-gray-400 mt-2 italic">[Restricted to Finance & PM]</p>
                    ) : (
                      <>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {overview.financialMetrics.currency} {overview.financialMetrics.totalDirectCost?.toLocaleString()}
                        </p>
                        <span className="text-xs text-gray-400">Direct labor cost at rate-card rates</span>
                      </>
                    )}
                  </div>

                  <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200">
                    <span className="text-xs font-semibold text-emerald-800 uppercase">Direct Contribution</span>
                    {overview.financialMetrics.isCostRedacted ? (
                      <p className="text-sm font-semibold text-gray-400 mt-2 italic">[Restricted to Finance & PM]</p>
                    ) : (
                      <>
                        <p className="text-2xl font-bold text-emerald-700 mt-1">
                          {overview.financialMetrics.currency} {overview.financialMetrics.directContribution?.toLocaleString()}
                        </p>
                        <span className="text-xs text-emerald-600">Revenue minus direct delivery costs</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Cumulative Weekly Burn Curve */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">Cumulative Weekly Effort Burn Curve</h3>
                    <p className="text-xs text-gray-500">
                      Weekly logged effort progression vs. planned baseline spend.
                    </p>
                  </div>
                </div>

                {overview.burnCurve.length === 0 ? (
                  <p className="text-sm text-gray-500 italic text-center py-8">
                    No time logs recorded for this project yet. Burn curve will render once hours are logged.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
                            <th className="py-2.5 px-4">Week Starting</th>
                            <th className="py-2.5 px-4">Weekly Logged</th>
                            <th className="py-2.5 px-4">Approved Billable</th>
                            <th className="py-2.5 px-4">Cumulative Actual</th>
                            <th className="py-2.5 px-4">Cumulative Progress Bar</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {overview.burnCurve.map((pt, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="py-2.5 px-4 font-medium text-gray-900">{pt.date}</td>
                              <td className="py-2.5 px-4 text-gray-700 font-semibold">{pt.weeklyHours.toFixed(1)}h</td>
                              <td className="py-2.5 px-4 text-emerald-600 font-medium">{pt.approvedHours.toFixed(1)}h</td>
                              <td className="py-2.5 px-4 font-bold text-indigo-700">{pt.cumulativeActualHours.toFixed(1)}h</td>
                              <td className="py-2.5 px-4">
                                <div className="w-48 bg-gray-200 h-2 rounded-full overflow-hidden">
                                  <div
                                    className="bg-emerald-600 h-full rounded-full"
                                    style={{
                                      width: `${Math.min(
                                        100,
                                        overview.effortMetrics.budgetedHours > 0
                                          ? (pt.cumulativeActualHours / overview.effortMetrics.budgetedHours) * 100
                                          : 50
                                      )}%`,
                                    }}
                                  />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Disclosure Note */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-xl flex items-start gap-3">
                <Compass className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-950 leading-relaxed">
                  <strong className="font-semibold">Measurement Contract Compliance:</strong> {overview.disclosure}
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-gray-500">Please select a project to view financials.</div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: BASELINES & THRESHOLD GOVERNANCE */}
      {/* ======================================================== */}
      {activeTab === 'baselines' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="text-base font-bold text-gray-900">Project Financial Baselines & Scope Snapshots</h2>
              <p className="text-xs text-gray-500">
                Frozen baselines lock budget hours, revenue, and cost targets for variance analysis.
              </p>
            </div>
            <button
              onClick={() => setShowCreateBaselineModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Baseline
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {baselines.length === 0 ? (
              <p className="p-8 text-center text-gray-500 text-sm">
                No formal baselines recorded yet. Click "New Baseline" to establish a scope and budget anchor.
              </p>
            ) : (
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Baseline Name</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Budgeted Hours</th>
                    <th className="py-3 px-4">Budgeted Revenue</th>
                    <th className="py-3 px-4">Thresholds</th>
                    <th className="py-3 px-4">Frozen</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {baselines.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono text-xs font-bold text-emerald-700">{b.baseline_code}</td>
                      <td className="py-3 px-4 font-semibold text-gray-900">{b.name}</td>
                      <td className="py-3 px-4 text-gray-600 text-xs">{b.baseline_date}</td>
                      <td className="py-3 px-4 font-bold text-gray-800">{b.budgeted_hours}h</td>
                      <td className="py-3 px-4 font-semibold text-gray-700">
                        {b.currency} {Number(b.budgeted_revenue).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <span className="text-amber-700 font-semibold">{b.warning_threshold_pct}%</span> /{' '}
                        <span className="text-rose-700 font-semibold">{b.critical_threshold_pct}%</span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            b.is_frozen
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {b.is_frozen ? 'Frozen' : 'Draft'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleToggleFreeze(b.id)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          {b.is_frozen ? 'Unfreeze' : 'Freeze'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: EFFECTIVE-DATED RATE CARDS */}
      {/* ======================================================== */}
      {activeTab === 'rate-cards' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="text-base font-bold text-gray-900">Effective-Dated Rate Cards</h2>
              <p className="text-xs text-gray-500">
                Billing rates and labor cost rates by role, employee, or project. Internal cost rates are restricted by RBAC.
              </p>
            </div>
            <button
              onClick={() => setShowCreateRateCardModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Rate Card
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Scope / Role</th>
                  <th className="py-3 px-4">Billing Rate</th>
                  <th className="py-3 px-4">Labor Cost Rate</th>
                  <th className="py-3 px-4">Effective Dates</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rateCards.map((rc) => (
                  <tr key={rc.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono text-xs font-bold text-gray-700">{rc.rate_code}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900">
                        {rc.user_name || rc.desig_name || 'Standard Organization Rate'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {rc.project_name ? `Project: ${rc.project_name}` : 'Global Standard'}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-700">
                      {rc.currency} {rc.hourly_billing_rate} / hr
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-800">
                      {rc.hourly_cost_rate != null ? (
                        `${rc.currency} ${rc.hourly_cost_rate} / hr`
                      ) : (
                        <span className="text-xs text-gray-400 italic">[Restricted]</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500">
                      {rc.effective_start_date} {rc.effective_end_date ? `to ${rc.effective_end_date}` : '(Ongoing)'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={async () => {
                          if (confirm('Delete this rate card?')) {
                            await financialAnalyticsApi.deleteRateCard(rc.id);
                            loadProjectFinancialData(selectedProjectId);
                          }
                        }}
                        className="text-xs text-rose-600 hover:text-rose-800 font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: PERIODIC METRIC LEDGER */}
      {/* ======================================================== */}
      {activeTab === 'periodic-ledger' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="text-base font-bold text-gray-900">Periodic Financial Metrics Ledger</h2>
              <p className="text-xs text-gray-500">
                Sprint-by-sprint and monthly financial snapshots recording actuals, variance, revenue, and margins.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {periodicMetrics.length === 0 ? (
              <p className="p-8 text-center text-gray-500 text-sm">
                No periodic metrics recorded yet for this project. Snapshots are archived as sprints and months close.
              </p>
            ) : (
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
                    <th className="py-3 px-4">Period</th>
                    <th className="py-3 px-4">Budget / Actual</th>
                    <th className="py-3 px-4">EAC</th>
                    <th className="py-3 px-4">Effort Variance</th>
                    <th className="py-3 px-4">Consumption</th>
                    <th className="py-3 px-4">Revenue</th>
                    <th className="py-3 px-4">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {periodicMetrics.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-semibold text-gray-900">
                        {m.period_label}
                        <div className="text-[10px] text-gray-400">{m.period_start} to {m.period_end}</div>
                      </td>
                      <td className="py-3 px-4 text-xs font-medium">
                        <div>Budget: <strong>{m.budgeted_hours}h</strong></div>
                        <div className="text-emerald-700">Actual: <strong>{m.actual_logged_hours}h</strong></div>
                      </td>
                      <td className="py-3 px-4 font-bold text-purple-700">{m.eac_hours}h</td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-semibold ${
                            m.effort_variance_hours > 0 ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          {m.effort_variance_hours > 0 ? '+' : ''}{m.effort_variance_hours}h
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-800">{m.budget_consumption_pct}%</td>
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {m.currency} {Number(m.total_recognized_revenue).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-emerald-700">
                          {m.contribution_margin_pct != null ? `${m.contribution_margin_pct}%` : 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: MULTI-CURRENCY EXCHANGE RATES */}
      {/* ======================================================== */}
      {activeTab === 'currencies' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="text-base font-bold text-gray-900">Multi-Currency Exchange Rates</h2>
              <p className="text-xs text-gray-500">
                Effective-dated currency conversion rates for cross-currency financial consolidation.
              </p>
            </div>
            <button
              onClick={() => setShowCreateExchangeRateModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add FX Rate
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
                  <th className="py-3 px-4">Pair</th>
                  <th className="py-3 px-4">Exchange Rate</th>
                  <th className="py-3 px-4">Effective Date</th>
                  <th className="py-3 px-4">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {exchangeRates.map((fx) => (
                  <tr key={fx.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-bold text-gray-900">
                      {fx.from_currency} &rarr; {fx.to_currency}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-700 text-base">
                      {Number(fx.exchange_rate).toFixed(4)}
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-xs">{fx.effective_date}</td>
                    <td className="py-3 px-4 text-gray-500 text-xs">{fx.source || 'MANUAL'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create Baseline */}
      {showCreateBaselineModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900">Establish Financial Baseline</h3>
              <button onClick={() => setShowCreateBaselineModal(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <form onSubmit={handleCreateBaseline} className="space-y-3 text-sm">
              <div>
                <label className="text-xs font-semibold text-gray-700">Baseline Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Q4 SOW Delivery Baseline"
                  value={baselineForm.name}
                  onChange={(e) => setBaselineForm({ ...baselineForm, name: e.target.value })}
                  required
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Budgeted Hours</label>
                  <input
                    type="number"
                    min="0"
                    value={baselineForm.budgeted_hours}
                    onChange={(e) => setBaselineForm({ ...baselineForm, budgeted_hours: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Budgeted Revenue</label>
                  <input
                    type="number"
                    min="0"
                    value={baselineForm.budgeted_revenue}
                    onChange={(e) => setBaselineForm({ ...baselineForm, budgeted_revenue: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Warning Threshold %</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={baselineForm.warning_threshold_pct}
                    onChange={(e) => setBaselineForm({ ...baselineForm, warning_threshold_pct: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Critical Threshold %</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={baselineForm.critical_threshold_pct}
                    onChange={(e) => setBaselineForm({ ...baselineForm, critical_threshold_pct: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700">Description</label>
                <textarea
                  rows={2}
                  value={baselineForm.description}
                  onChange={(e) => setBaselineForm({ ...baselineForm, description: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateBaselineModal(false)}
                  className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm"
                >
                  Save Baseline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Rate Card */}
      {showCreateRateCardModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900">Add Effective-Dated Rate Card</h3>
              <button onClick={() => setShowCreateRateCardModal(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <form onSubmit={handleCreateRateCard} className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Hourly Billing Rate *</label>
                  <input
                    type="number"
                    min="0"
                    value={rateCardForm.hourly_billing_rate}
                    onChange={(e) => setRateCardForm({ ...rateCardForm, hourly_billing_rate: Number(e.target.value) })}
                    required
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Hourly Cost Rate *</label>
                  <input
                    type="number"
                    min="0"
                    value={rateCardForm.hourly_cost_rate}
                    onChange={(e) => setRateCardForm({ ...rateCardForm, hourly_cost_rate: Number(e.target.value) })}
                    required
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700">Effective Start Date *</label>
                <input
                  type="date"
                  value={rateCardForm.effective_start_date}
                  onChange={(e) => setRateCardForm({ ...rateCardForm, effective_start_date: e.target.value })}
                  required
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700">Notes / Agreement</label>
                <input
                  type="text"
                  placeholder="e.g., Contract schedule A annexure"
                  value={rateCardForm.description}
                  onChange={(e) => setRateCardForm({ ...rateCardForm, description: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateRateCardModal(false)}
                  className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm"
                >
                  Save Rate Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create FX Rate */}
      {showCreateExchangeRateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900">Add Currency Exchange Rate</h3>
              <button onClick={() => setShowCreateExchangeRateModal(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <form onSubmit={handleCreateExchangeRate} className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">From Currency</label>
                  <input
                    type="text"
                    value={exchangeRateForm.from_currency}
                    onChange={(e) => setExchangeRateForm({ ...exchangeRateForm, from_currency: e.target.value })}
                    required
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg uppercase"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">To Currency</label>
                  <input
                    type="text"
                    value={exchangeRateForm.to_currency}
                    onChange={(e) => setExchangeRateForm({ ...exchangeRateForm, to_currency: e.target.value })}
                    required
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg uppercase"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700">Exchange Rate *</label>
                <input
                  type="number"
                  step="0.0001"
                  value={exchangeRateForm.exchange_rate}
                  onChange={(e) => setExchangeRateForm({ ...exchangeRateForm, exchange_rate: Number(e.target.value) })}
                  required
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg focus:ring-emerald-500"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateExchangeRateModal(false)}
                  className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm"
                >
                  Save FX Rate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
