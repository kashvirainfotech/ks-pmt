import React, { useState, useEffect } from 'react';
import {
  History,
  GitCommit,
  Calendar,
  Layers,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Copy,
  Plus,
  Bookmark,
  CheckCircle2,
  Trash2,
  Clock,
  ArrowRight,
  FileText,
  AlertOctagon,
  Eye,
  EyeOff,
  Filter,
  Check,
} from 'lucide-react';
import { activityApi, projectsApi, productsApi, sprintsApi } from '../../api/endpoints';
import {
  WhatChangedSummaryResponse,
  ChangeActivityBaseline,
  UserActivitySavedQuery,
} from '../../types';

export const WhatChangedWorkspaceView: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters State
  const [timeFilterType, setTimeFilterType] = useState<string>('LAST_LOGIN');
  const [selectedBaselineId, setSelectedBaselineId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [scopeType, setScopeType] = useState<string>('');
  const [scopeId, setScopeId] = useState<string>('');
  const [isClientSafe, setIsClientSafe] = useState<boolean>(false);
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>('ALL');

  // Data State
  const [activityData, setActivityData] = useState<WhatChangedSummaryResponse | null>(null);
  const [baselines, setBaselines] = useState<ChangeActivityBaseline[]>([]);
  const [savedQueries, setSavedQueries] = useState<UserActivitySavedQuery[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [sprints, setSprints] = useState<any[]>([]);

  // Modals
  const [showBaselineModal, setShowBaselineModal] = useState(false);
  const [baselineForm, setBaselineForm] = useState({
    baselineCode: '',
    title: '',
    description: '',
    scopeType: 'PROJECT' as 'PROJECT' | 'PRODUCT' | 'SPRINT' | 'RELEASE',
    scopeId: '',
  });

  const [showSaveQueryModal, setShowSaveQueryModal] = useState(false);
  const [saveQueryName, setSaveQueryName] = useState('');
  const [copied, setCopied] = useState(false);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  // Load initial options
  useEffect(() => {
    const loadPrerequisites = async () => {
      try {
        const [bRes, qRes, pRes, prRes, spRes] = await Promise.all([
          activityApi.getBaselines().catch(() => ({ data: [] })),
          activityApi.getSavedQueries().catch(() => ({ data: [] })),
          projectsApi.getProjects().catch(() => ({ data: [] })),
          productsApi.getProducts().catch(() => ({ data: [] })),
          sprintsApi.getSprints().catch(() => ({ data: [] })),
        ]);
        setBaselines(bRes.data || []);
        setSavedQueries(qRes.data || []);
        setProjects(pRes.data || []);
        setProducts(prRes.data || []);
        setSprints(spRes.data || []);
      } catch (e: any) {
        console.error('Failed to load prerequisites', e);
      }
    };
    loadPrerequisites();
  }, []);

  // Fetch What Changed Data
  const loadWhatChanged = async () => {
    try {
      setLoading(true);
      const params: any = {
        timeFilterType,
        isClientSafe,
      };

      if (timeFilterType === 'SINCE_BASELINE' && selectedBaselineId) {
        params.baselineId = selectedBaselineId;
      }
      if (timeFilterType === 'CUSTOM_RANGE') {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }
      if (scopeType && scopeId) {
        params.scopeType = scopeType;
        params.scopeId = scopeId;
      }

      const res = await activityApi.getWhatChanged(params);
      setActivityData(res.data);
    } catch (e: any) {
      showNotification('Failed to compute activity changes', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWhatChanged();
  }, [timeFilterType, selectedBaselineId, isClientSafe, scopeType, scopeId]);

  const handleCopySummary = () => {
    if (activityData?.summaryNarrative) {
      navigator.clipboard.writeText(activityData.summaryNarrative);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      showNotification('Executive summary copied to clipboard');
    }
  };

  const handleCreateBaseline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baselineForm.baselineCode || !baselineForm.title || !baselineForm.scopeId) {
      showNotification('Please fill in all required fields for the baseline', 'error');
      return;
    }
    try {
      setLoading(true);
      const res = await activityApi.createBaseline(baselineForm);
      showNotification(`Baseline "${res.data.title}" frozen successfully`);
      setShowBaselineModal(false);
      setBaselineForm({
        baselineCode: '',
        title: '',
        description: '',
        scopeType: 'PROJECT',
        scopeId: '',
      });
      const bRes = await activityApi.getBaselines();
      setBaselines(bRes.data || []);
    } catch (e: any) {
      showNotification('Failed to freeze baseline snapshot', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveQueryName.trim()) {
      showNotification('Please enter a name for the query preset', 'error');
      return;
    }
    try {
      const res = await activityApi.saveQuery({
        queryName: saveQueryName.trim(),
        timeFilterType,
        baselineId: timeFilterType === 'SINCE_BASELINE' ? selectedBaselineId : undefined,
        scopeType: scopeType || undefined,
        scopeId: scopeId || undefined,
        isClientSafe,
      });
      showNotification(`Saved query "${res.data.query_name}" saved`);
      setShowSaveQueryModal(false);
      setSaveQueryName('');
      const qRes = await activityApi.getSavedQueries();
      setSavedQueries(qRes.data || []);
    } catch (e: any) {
      showNotification('Failed to save query preset', 'error');
    }
  };

  const handleApplySavedQuery = (q: UserActivitySavedQuery) => {
    setTimeFilterType(q.time_filter_type || q.timeFilterType || 'LAST_LOGIN');
    if (q.baseline_id || q.baselineId) setSelectedBaselineId(q.baseline_id || q.baselineId || '');
    if (q.scope_type || q.scopeType) setScopeType(q.scope_type || q.scopeType || '');
    if (q.scope_id || q.scopeId) setScopeId(q.scope_id || q.scopeId || '');
    setIsClientSafe(Boolean(q.is_client_safe || q.isClientSafe));
    showNotification(`Applied saved query: ${q.query_name || q.queryName}`);
  };

  const handleDeleteSavedQuery = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await activityApi.deleteSavedQuery(id);
      showNotification('Query preset removed');
      const qRes = await activityApi.getSavedQueries();
      setSavedQueries(qRes.data || []);
    } catch (e: any) {
      showNotification('Failed to remove query preset', 'error');
    }
  };

  // Compile active events stream
  const getFilteredEvents = () => {
    if (!activityData) return [];
    const { categories } = activityData;
    switch (activeCategoryTab) {
      case 'SCOPE':
        return [...categories.scopeAdditions, ...categories.scopeRemovals];
      case 'TRANSITIONS':
        return categories.statusTransitions;
      case 'BLOCKERS':
        return categories.blockerEvents;
      case 'SPECS':
        return [...categories.requirementChanges, ...categories.documentRevisions];
      default:
        return [
          ...categories.scopeAdditions,
          ...categories.scopeRemovals,
          ...categories.statusTransitions,
          ...categories.blockerEvents,
          ...categories.requirementChanges,
          ...categories.documentRevisions,
        ].sort((a, b) => new Date(b.created_at || b.declared_at).getTime() - new Date(a.created_at || a.declared_at).getTime());
    }
  };

  const filteredEvents = getFilteredEvents();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
              COLLAB-004
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Deterministic Baseline Diffing & Change Intelligence
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            "What Changed?" Activity Workspace
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Permission-filtered change summaries since your last login, sprint baseline snapshots, or custom time windows with source-linked event counts.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Client-Safe Toggle */}
          <button
            onClick={() => setIsClientSafe(!isClientSafe)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
              isClientSafe
                ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50'
            }`}
            title="Toggle Client-Safe Summary Mode (strips internal-only items, rate discussions, and private blocker logs)"
          >
            {isClientSafe ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {isClientSafe ? 'Client-Safe Mode: ON' : 'Client-Safe Mode: OFF'}
          </button>

          {/* Freeze Baseline */}
          <button
            onClick={() => setShowBaselineModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 shadow-sm transition-colors"
          >
            <GitCommit className="w-4 h-4 text-indigo-500" />
            Freeze Baseline
          </button>

          {/* Save Query Preset */}
          <button
            onClick={() => setShowSaveQueryModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 shadow-sm transition-colors"
          >
            <Bookmark className="w-4 h-4 text-blue-500" />
            Save Query
          </button>

          {/* Refresh */}
          <button
            onClick={loadWhatChanged}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 shadow-sm transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`p-3.5 rounded-lg flex items-center justify-between text-sm ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button onClick={() => setFeedbackMessage(null)} className="text-xs underline font-medium">
            Dismiss
          </button>
        </div>
      )}

      {/* Client-Safe Mode Alert Banner */}
      {isClientSafe && (
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-center justify-between text-xs text-amber-800 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span>
              <strong>Client-Safe Sanitation Active:</strong> Internal development notes, private technical debt blockers, confidential architecture documents, and hourly rates have been stripped. This summary is verified client-safe for distribution.
            </span>
          </div>
          <button
            onClick={() => setIsClientSafe(false)}
            className="text-amber-700 underline font-semibold"
          >
            Switch to Internal View
          </button>
        </div>
      )}

      {/* Saved Queries Presets Quick-Bar */}
      {savedQueries.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-500 font-semibold flex items-center gap-1 whitespace-nowrap">
            <Bookmark className="w-3.5 h-3.5 text-blue-500" />
            Saved Presets:
          </span>
          {savedQueries.map((q) => (
            <div
              key={q.id}
              onClick={() => handleApplySavedQuery(q)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer transition-colors shadow-xs"
            >
              <span>{q.query_name}</span>
              <button
                onClick={(e) => q.id && handleDeleteSavedQuery(q.id, e)}
                className="text-slate-400 hover:text-rose-500 ml-1"
                title="Remove saved preset"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Time Window & Filter Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">
            Time Window:
          </span>
          {[
            { id: 'LAST_LOGIN', label: 'Since Last Login' },
            { id: 'HOURS_24', label: 'Last 24 Hours' },
            { id: 'DAYS_7', label: 'Last 7 Days' },
            { id: 'DAYS_14', label: 'Last 14 Days' },
            { id: 'DAYS_30', label: 'Last 30 Days' },
            { id: 'SINCE_BASELINE', label: 'Since Baseline' },
            { id: 'CUSTOM_RANGE', label: 'Custom Range' },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setTimeFilterType(pill.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                timeFilterType === pill.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Dynamic Secondary Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          {timeFilterType === 'SINCE_BASELINE' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Frozen Baseline Snapshot
              </label>
              <select
                value={selectedBaselineId}
                onChange={(e) => setSelectedBaselineId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="">-- Choose Baseline --</option>
                {baselines.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} ({b.baseline_code}) - {new Date(b.baseline_timestamp).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          )}

          {timeFilterType === 'CUSTOM_RANGE' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </>
          )}

          {/* Scope Type Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Scope Boundary (Optional)
            </label>
            <select
              value={scopeType}
              onChange={(e) => {
                setScopeType(e.target.value);
                setScopeId('');
              }}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              <option value="">All Scopes (Cross-System)</option>
              <option value="PROJECT">Project</option>
              <option value="PRODUCT">Product</option>
              <option value="SPRINT">Sprint</option>
            </select>
          </div>

          {/* Scope Target Selection */}
          {scopeType && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target {scopeType}
              </label>
              <select
                value={scopeId}
                onChange={(e) => setScopeId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="">-- Choose {scopeType} --</option>
                {scopeType === 'PROJECT' &&
                  projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.project_name} ({p.project_code})
                    </option>
                  ))}
                {scopeType === 'PRODUCT' &&
                  products.map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      {pr.product_name} ({pr.product_code})
                    </option>
                  ))}
                {scopeType === 'SPRINT' &&
                  sprints.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.sprint_name} ({s.status})
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>

        {/* Resolved Window Information */}
        {activityData?.timeWindow && (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>
              Evaluating window: <strong>{new Date(activityData.timeWindow.windowStart).toLocaleString()}</strong> to{' '}
              <strong>{new Date(activityData.timeWindow.windowEnd).toLocaleString()}</strong>
              {activityData.timeWindow.fallbackUsed && ' (Defaulted to 24h fallback)'}
            </span>
            {activityData.timeWindow.baseline && (
              <span className="font-mono text-indigo-600 dark:text-indigo-400">
                Baseline: {activityData.timeWindow.baseline.baseline_code}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Missing-History Disclosure */}
      {activityData?.missingHistory?.detected && (
        <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 flex items-start gap-3 text-xs text-orange-900 dark:text-orange-200">
          <AlertOctagon className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Notice: Incomplete Historical Records Disclosed</h4>
            <p className="mt-0.5 leading-relaxed">{activityData.missingHistory.note}</p>
          </div>
        </div>
      )}

      {/* Top Metrics Cards: Source-Linked Events vs Distinct Affected Items */}
      {activityData && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Change Events
            </span>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {activityData.metrics.sourceLinkedEventCount}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Source-linked mutations</p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Distinct Items Affected
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {activityData.metrics.distinctItemCount}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Unique deliverables</p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Scope Additions
            </span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              +{activityData.metrics.scopeAdditionsCount}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Newly scoped</p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Scope Removals
            </span>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
              -{activityData.metrics.scopeRemovalsCount}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Deferred / removed</p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Status Transitions
            </span>
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
              {activityData.metrics.statusTransitionsCount}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Workflow movements</p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Blocker Events
            </span>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {activityData.metrics.blockerEventsCount}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Impediments handled</p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Specs & ADRs
            </span>
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
              {activityData.metrics.requirementChangesCount + activityData.metrics.documentRevisionsCount}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Revisions & criteria</p>
          </div>
        </div>
      )}

      {/* Deterministic Executive Summary Narrative Card (Without AI) */}
      {activityData && (
        <div className="bg-gradient-to-r from-slate-50 to-indigo-50/40 dark:from-slate-900 dark:to-indigo-950/20 rounded-xl border border-indigo-200/60 dark:border-indigo-800/40 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              Deterministic Change Briefing
              <span className="text-[11px] font-normal text-slate-500">
                (Rule-based generation, 100% verified against source events)
              </span>
            </h3>
            <button
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors border border-indigo-200 dark:border-indigo-800 shadow-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy Briefing'}
            </button>
          </div>
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 font-sans">
            {activityData.summaryNarrative}
          </p>
        </div>
      )}

      {/* Categorized Change Stream Tabs */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
          {[
            { id: 'ALL', label: `All Changes (${filteredEvents.length})` },
            {
              id: 'SCOPE',
              label: `Scope Additions & Removals (${
                (activityData?.metrics.scopeAdditionsCount || 0) +
                (activityData?.metrics.scopeRemovalsCount || 0)
              })`,
            },
            {
              id: 'TRANSITIONS',
              label: `Workflow Transitions (${activityData?.metrics.statusTransitionsCount || 0})`,
            },
            {
              id: 'BLOCKERS',
              label: `Blocker Events (${activityData?.metrics.blockerEventsCount || 0})`,
            },
            {
              id: 'SPECS',
              label: `Specs & Revisions (${
                (activityData?.metrics.requirementChangesCount || 0) +
                (activityData?.metrics.documentRevisionsCount || 0)
              })`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategoryTab(tab.id)}
              className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                activeCategoryTab === tab.id
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Change List */}
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
            <CheckCircle2 className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              No changes recorded in this category
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Try widening the time window filter or selecting a different baseline.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {filteredEvents.map((evt, idx) => (
              <div
                key={evt.event_id || evt.id || idx}
                className="p-3.5 flex items-start justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                      evt.event_category === 'SCOPE_ADDITION'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : evt.event_category === 'SCOPE_REMOVAL'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                        : evt.event_category === 'STATUS_TRANSITION'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                        : evt.event_category === 'BLOCKER_EVENT'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                        : 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
                    }`}
                  >
                    {evt.event_category}
                  </span>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {evt.task_code || evt.requirement_code || evt.document_code || 'ITEM'}
                      </span>
                      <span className="font-semibold text-xs text-slate-900 dark:text-white">
                        {evt.title}
                      </span>
                    </div>

                    {/* Category-Specific Diff Descriptions */}
                    {evt.event_category === 'STATUS_TRANSITION' && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 mt-1">
                        <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-medium">
                          {evt.from_status || 'Initial'}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded font-bold">
                          {evt.to_status}
                        </span>
                      </div>
                    )}

                    {evt.event_category === 'BLOCKER_EVENT' && (
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                        Reason: {evt.reason_category} - {evt.blocker_description}
                      </p>
                    )}

                    {evt.event_category === 'DOCUMENT_REVISION' && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        Rev #{evt.revision_number}: {evt.summary_of_changes || 'Revision published'}
                      </p>
                    )}

                    {evt.event_category === 'SCOPE_REMOVAL' && (
                      <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                        Action: {evt.action_type} - {evt.reason || 'Deferred out of sprint'}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1.5">
                      <span>{new Date(evt.created_at || evt.declared_at).toLocaleString()}</span>
                      {(evt.actor_name || evt.creator_name || evt.author_name || evt.declared_by_name) && (
                        <span>
                          • By {evt.actor_name || evt.creator_name || evt.author_name || evt.declared_by_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Freeze Baseline Modal */}
      {showBaselineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <GitCommit className="w-5 h-5 text-indigo-600" />
                Freeze Baseline Snapshot
              </h3>
              <button onClick={() => setShowBaselineModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBaseline} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Baseline Code
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BASE-S1-COMMIT"
                  value={baselineForm.baselineCode}
                  onChange={(e) => setBaselineForm({ ...baselineForm, baselineCode: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sprint 1 Commitment Baseline"
                  value={baselineForm.title}
                  onChange={(e) => setBaselineForm({ ...baselineForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Scope Type
                </label>
                <select
                  value={baselineForm.scopeType}
                  onChange={(e) =>
                    setBaselineForm({
                      ...baselineForm,
                      scopeType: e.target.value as any,
                      scopeId: '',
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="PROJECT">Project</option>
                  <option value="PRODUCT">Product</option>
                  <option value="SPRINT">Sprint</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Scope ID
                </label>
                <select
                  required
                  value={baselineForm.scopeId}
                  onChange={(e) => setBaselineForm({ ...baselineForm, scopeId: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="">-- Choose Target --</option>
                  {baselineForm.scopeType === 'PROJECT' &&
                    projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.project_name} ({p.project_code})
                      </option>
                    ))}
                  {baselineForm.scopeType === 'PRODUCT' &&
                    products.map((pr) => (
                      <option key={pr.id} value={pr.id}>
                        {pr.product_name} ({pr.product_code})
                      </option>
                    ))}
                  {baselineForm.scopeType === 'SPRINT' &&
                    sprints.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.sprint_name} ({s.status})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Justification
                </label>
                <textarea
                  rows={2}
                  value={baselineForm.description}
                  onChange={(e) => setBaselineForm({ ...baselineForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  placeholder="Reason for freezing baseline snapshot..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBaselineModal(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  Freeze Snapshot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Save Query Preset Modal */}
      {showSaveQueryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-blue-600" />
                Save Query Preset
              </h3>
              <button onClick={() => setShowSaveQueryModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuery} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Preset Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. My Weekly Changes"
                  value={saveQueryName}
                  onChange={(e) => setSaveQueryName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Saves current time window ({timeFilterType}) and scope filters for quick 1-click access.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSaveQueryModal(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                >
                  Save Preset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
