import React, { useState, useEffect } from 'react';
import {
  Server,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Plus,
  Search,
  Filter,
  Layers,
  Bug,
  ShieldCheck,
  RefreshCw,
  FileText,
  User,
  Sliders,
  ExternalLink,
  Laptop,
  Check,
  X,
  ChevronRight,
  ShieldAlert,
  Building,
} from 'lucide-react';
import {
  qaApi,
  productsApi,
  projectsApi,
  clientsApi,
  mastersApi,
} from '../../api/endpoints';
import {
  QaEnvironment,
  IssueEnvironmentObservation,
  TaskEnvironmentMatrixResponse,
  QaEnvironmentType,
  QaScopeType,
  IssueObservationType,
  Product,
  Project,
  Version,
  Client,
} from '../../types';

export const EnvironmentsAndRetestsView: React.FC = () => {
  const [subTab, setSubTab] = useState<'observations' | 'matrix' | 'environments'>('matrix');
  const [loading, setLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Lookup data
  const [environments, setEnvironments] = useState<QaEnvironment[]>([]);
  const [observations, setObservations] = useState<IssueEnvironmentObservation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // Filter States
  const [envFilter, setEnvFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [observationTypeFilter, setObservationTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Matrix Inspector State
  const [inspectTaskId, setInspectTaskId] = useState<string>('20000000-0000-0000-0000-0000000003e8');
  const [matrixData, setMatrixData] = useState<TaskEnvironmentMatrixResponse | null>(null);

  // Modals
  const [showEnvModal, setShowEnvModal] = useState(false);
  const [showObservationModal, setShowObservationModal] = useState(false);

  // Form States: Environment
  const [envForm, setEnvForm] = useState({
    env_name: '',
    env_type: 'INTERNAL_QA' as QaEnvironmentType,
    scope_type: 'GLOBAL' as QaScopeType,
    product_id: '',
    project_id: '',
    client_id: '',
    region: '',
    description: '',
    context_metadata: '',
  });

  // Form States: Observation
  const [obsForm, setObsForm] = useState({
    task_id: '',
    environment_id: '',
    version_id: '',
    observation_type: 'PASSED' as IssueObservationType,
    browser_info: 'Chrome 128.0',
    os_info: 'macOS Sonoma 14.6',
    device_info: 'Desktop Workstation',
    build_label: '',
    evidence_notes: '',
    attachment_url: '',
    is_client_visible: false,
  });

  useEffect(() => {
    loadLookups();
    loadEnvironments();
    loadObservations();
  }, []);

  useEffect(() => {
    if (inspectTaskId) {
      loadTaskMatrix(inspectTaskId);
    }
  }, [inspectTaskId]);

  const loadLookups = async () => {
    try {
      const [prodRes, prjRes, clRes, verRes] = await Promise.all([
        productsApi.getProducts(),
        projectsApi.getProjects(),
        clientsApi.getAll(),
        projectsApi.getVersions(),
      ]);
      setProducts(prodRes.data || []);
      setProjects(prjRes.data || []);
      setClients((clRes.data as any)?.items || clRes.data || []);
      setVersions(verRes.data || []);
    } catch (err: any) {
      console.error('Failed to load lookups', err);
    }
  };

  const loadEnvironments = async () => {
    try {
      const res = await qaApi.getEnvironments();
      setEnvironments(res.data || []);
    } catch (err: any) {
      console.error('Failed to load environments', err);
    }
  };

  const loadObservations = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (envFilter !== 'ALL') params.environment_id = envFilter;
      if (observationTypeFilter !== 'ALL') params.observation_type = observationTypeFilter;
      const res = await qaApi.getIssueObservations(params);
      const items = (res.data as any)?.data?.items || (res.data as any)?.items || [];
      setObservations(items);
    } catch (err: any) {
      console.error('Failed to load observations', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTaskMatrix = async (taskId: string) => {
    try {
      const res = await qaApi.getTaskEnvironmentMatrix(taskId);
      const data = (res.data as any)?.data || res.data;
      setMatrixData(data);
    } catch (err: any) {
      console.error('Failed to load task matrix', err);
      setMatrixData(null);
    }
  };

  const handleCreateEnvironment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!envForm.env_name || !envForm.env_type) {
      setFeedbackMessage({ type: 'error', text: 'Please provide environment name and type.' });
      return;
    }

    try {
      let metaObj = {};
      if (envForm.context_metadata.trim()) {
        try {
          metaObj = JSON.parse(envForm.context_metadata);
        } catch {
          metaObj = { note: envForm.context_metadata };
        }
      }

      await qaApi.createEnvironment({
        ...envForm,
        product_id: envForm.product_id || undefined,
        project_id: envForm.project_id || undefined,
        client_id: envForm.client_id || undefined,
        context_metadata: metaObj,
      });

      setShowEnvModal(false);
      setFeedbackMessage({ type: 'success', text: 'QA environment registered successfully!' });
      setEnvForm({
        env_name: '',
        env_type: 'INTERNAL_QA',
        scope_type: 'GLOBAL',
        product_id: '',
        project_id: '',
        client_id: '',
        region: '',
        description: '',
        context_metadata: '',
      });
      loadEnvironments();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to register environment.',
      });
    }
  };

  const handleCreateObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!obsForm.task_id || !obsForm.environment_id || !obsForm.version_id) {
      setFeedbackMessage({ type: 'error', text: 'Please select task, environment, and version.' });
      return;
    }

    try {
      await qaApi.createIssueObservation({
        ...obsForm,
        evidence_notes: obsForm.evidence_notes || undefined,
        attachment_url: obsForm.attachment_url || undefined,
      });

      setShowObservationModal(false);
      setFeedbackMessage({
        type: 'success',
        text: 'Environment observation recorded. Notice: other environments remain independent!',
      });
      loadObservations();
      if (inspectTaskId === obsForm.task_id) {
        loadTaskMatrix(inspectTaskId);
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to record observation.',
      });
    }
  };

  const getEnvBadgeClass = (envType: string) => {
    switch (envType) {
      case 'INTERNAL_QA':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'DEV':
        return 'bg-slate-50 text-slate-700 border-slate-200';
      case 'STAGING':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'CLIENT_UAT':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'CLIENT_PRODUCTION':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'ON_PREMISE_CLIENT':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getObservationBadgeClass = (type: string) => {
    switch (type) {
      case 'PASSED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'FAILED':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'FOUND_REPRODUCED':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'READY_FOR_RETEST':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'FIX_AVAILABLE':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'CANNOT_REPRODUCE':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      case 'BLOCKED':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-lg flex items-center justify-between text-sm ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sub-Header & Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab('matrix')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
              subTab === 'matrix'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Multi-Environment Matrix Inspector
          </button>
          <button
            onClick={() => setSubTab('observations')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
              subTab === 'observations'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Issue Observations ({observations.length})
          </button>
          <button
            onClick={() => setSubTab('environments')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
              subTab === 'environments'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Scoped Environments ({environments.length})
          </button>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={() => setShowObservationModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Log Retest / Observation
          </button>
          <button
            onClick={() => setShowEnvModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg shadow-sm transition"
          >
            <Server className="w-3.5 h-3.5 text-indigo-600" />
            Register Environment
          </button>
          <button
            onClick={() => {
              loadEnvironments();
              loadObservations();
              if (inspectTaskId) loadTaskMatrix(inspectTaskId);
            }}
            title="Refresh data"
            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* SubTab 1: Multi-Environment Matrix Inspector (The Core QA-002 Demonstration) */}
      {subTab === 'matrix' && (
        <div className="space-y-4">
          {/* Important Rule Callout */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 space-y-1">
              <strong className="block font-semibold">
                QA-002 Environment Independence & Version Boundary Rule:
              </strong>
              <p>
                An issue can pass internal QA on a newer build/version (e.g. <code>v3.2.0</code>) while failing client UAT or remaining open on an older client production / on-premise installation (e.g. <code>v2.1.0</code>).
                Internal verification does <strong>not</strong> automatically resolve client tickets, and cross-client confidentiality is strictly preserved.
              </p>
            </div>
          </div>

          {/* Task Selector Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
            <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
              Inspect Task / Defect ID:
            </label>
            <input
              type="text"
              value={inspectTaskId}
              onChange={(e) => setInspectTaskId(e.target.value)}
              placeholder="Enter Task UUID..."
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg w-full md:w-96 focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={() => loadTaskMatrix(inspectTaskId)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
            >
              Inspect Matrix
            </button>
          </div>

          {/* Matrix Visual Card */}
          {matrixData ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      {matrixData.task.task_code}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 uppercase">
                      {matrixData.task.priority} Priority
                    </span>
                    <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                      Status: {matrixData.task.status_name}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">
                    {matrixData.task.title}
                  </h3>
                  <div className="text-xs text-slate-500 mt-1">
                    Assigned Task Version:{' '}
                    <strong className="text-slate-700">{matrixData.task.task_version_code || 'Unassigned'}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {matrixData.evaluationSummary.hasPassedInternalQa && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      ✓ Internal QA: PASSED
                    </span>
                  )}
                  {matrixData.evaluationSummary.hasFailingClientUat && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
                      ✗ Client UAT: FAILED
                    </span>
                  )}
                  {matrixData.evaluationSummary.hasUnresolvedOlderVersion && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                      ⚠ Older Client Version: OPEN
                    </span>
                  )}
                </div>
              </div>

              {/* Multi-Environment Matrix Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Environment</th>
                      <th className="py-3 px-4">Type & Scope</th>
                      <th className="py-3 px-4">Observed Version</th>
                      <th className="py-3 px-4">Verification Outcome</th>
                      <th className="py-3 px-4">Build / Hardware Context</th>
                      <th className="py-3 px-4">Evidence & Reproduction Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {matrixData.matrix.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{row.env_name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{row.env_code}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-medium border ${getEnvBadgeClass(
                              row.env_type || '',
                            )}`}
                          >
                            {row.env_type}
                          </span>
                          {row.client_name && (
                            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                              <Building className="w-3 h-3 text-slate-400" />
                              {row.client_name}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-slate-800">
                            {row.version_code}
                          </span>
                          <div className="text-[11px] text-slate-400">{row.version_name}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getObservationBadgeClass(
                              row.observation_type,
                            )}`}
                          >
                            {row.observation_type.replace(/_/g, ' ')}
                          </span>
                          <div className="text-[11px] text-slate-400 mt-1">
                            {new Date(row.observed_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {row.build_label && (
                            <div className="font-mono text-[11px] text-slate-700">
                              {row.build_label}
                            </div>
                          )}
                          {(row.browser_info || row.os_info) && (
                            <div className="text-[11px] text-slate-400">
                              {row.browser_info} • {row.os_info}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 max-w-sm text-slate-600">
                          <p className="line-clamp-2">{row.evidence_notes || 'No notes'}</p>
                          {row.is_client_visible && (
                            <span className="inline-block mt-1 text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                              Client Shared
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-3">
              <Bug className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-semibold text-slate-800">No Environment Matrix Data</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                No environment observations recorded for task ID <code>{inspectTaskId}</code> yet. Use "Log Retest / Observation" to add environment-specific verifications.
              </p>
            </div>
          )}
        </div>
      )}

      {/* SubTab 2: All Issue Observations Log */}
      {subTab === 'observations' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={envFilter}
              onChange={(e) => setEnvFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All QA Environments</option>
              {environments.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.env_code} - {e.env_name} ({e.env_type})
                </option>
              ))}
            </select>

            <select
              value={observationTypeFilter}
              onChange={(e) => setObservationTypeFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Observation Types</option>
              <option value="PASSED">Passed</option>
              <option value="FAILED">Failed</option>
              <option value="FOUND_REPRODUCED">Found / Reproduced</option>
              <option value="READY_FOR_RETEST">Ready for Retest</option>
              <option value="FIX_AVAILABLE">Fix Available</option>
              <option value="CANNOT_REPRODUCE">Cannot Reproduce</option>
              <option value="BLOCKED">Blocked</option>
            </select>

            <button
              onClick={loadObservations}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
            >
              Apply Filter
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {observations.map((obs) => (
              <div
                key={obs.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {obs.observation_code}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded border font-semibold ${getObservationBadgeClass(
                          obs.observation_type,
                        )}`}
                      >
                        {obs.observation_type.replace(/_/g, ' ')}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded border font-medium ${getEnvBadgeClass(
                          obs.env_type || '',
                        )}`}
                      >
                        {obs.env_name}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mt-1">
                      {obs.task_code}: {obs.task_title}
                    </h4>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                    {obs.version_code}
                  </span>
                </div>

                {obs.evidence_notes && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    {obs.evidence_notes}
                  </p>
                )}

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                  <span>
                    Observed: {new Date(obs.observed_at).toLocaleString()}
                  </span>
                  {obs.build_label && <span>Build: {obs.build_label}</span>}
                  {obs.tester_name && <span>Tester: {obs.tester_name}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SubTab 3: Scoped QA Environments */}
      {subTab === 'environments' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {environments.map((env) => (
              <div
                key={env.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded border font-semibold ${getEnvBadgeClass(
                        env.env_type,
                      )}`}
                    >
                      {env.env_type}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 mt-1.5">{env.env_name}</h4>
                    <span className="font-mono text-xs text-slate-400">{env.env_code}</span>
                  </div>
                  <span className="text-xs text-slate-500 font-semibold bg-slate-50 px-2 py-1 rounded">
                    Scope: {env.scope_type}
                  </span>
                </div>

                {env.description && (
                  <p className="text-xs text-slate-600 line-clamp-2">{env.description}</p>
                )}

                {env.region && (
                  <div className="text-xs text-slate-500">
                    Region: <strong className="text-slate-700">{env.region}</strong>
                  </div>
                )}

                {env.client_name && (
                  <div className="text-xs text-slate-500">
                    Client: <strong className="text-slate-700">{env.client_name}</strong>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Observations: {env.observations_count || 0}</span>
                  <button
                    onClick={() => {
                      setObsForm((prev) => ({ ...prev, environment_id: env.id }));
                      setShowObservationModal(true);
                    }}
                    className="text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    + Log Retest
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Register QA Environment */}
      {showEnvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-600" />
                Register Scoped QA Environment
              </h3>
              <button
                onClick={() => setShowEnvModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEnvironment} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Environment Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apex Global Retail - Client UAT Sandbox"
                  value={envForm.env_name}
                  onChange={(e) => setEnvForm({ ...envForm, env_name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Environment Type *
                  </label>
                  <select
                    value={envForm.env_type}
                    onChange={(e) =>
                      setEnvForm({ ...envForm, env_type: e.target.value as QaEnvironmentType })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="INTERNAL_QA">Internal QA</option>
                    <option value="DEV">Development</option>
                    <option value="STAGING">Staging</option>
                    <option value="CLIENT_UAT">Client UAT</option>
                    <option value="CLIENT_PRODUCTION">Client Production</option>
                    <option value="ON_PREMISE_CLIENT">On-Premise Client</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Scope Type *
                  </label>
                  <select
                    value={envForm.scope_type}
                    onChange={(e) =>
                      setEnvForm({ ...envForm, scope_type: e.target.value as QaScopeType })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="GLOBAL">Global</option>
                    <option value="PRODUCT">Product Scoped</option>
                    <option value="PROJECT">Project Scoped</option>
                    <option value="CLIENT">Client Scoped</option>
                  </select>
                </div>
              </div>

              {envForm.scope_type === 'CLIENT' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Client Organization *
                  </label>
                  <select
                    value={envForm.client_id}
                    onChange={(e) => setEnvForm({ ...envForm, client_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Client</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.company_name || (c as any).client_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Region / Location</label>
                <input
                  type="text"
                  placeholder="e.g. ap-south-1 (Mumbai) / Customer Datacenter"
                  value={envForm.region}
                  onChange={(e) => setEnvForm({ ...envForm, region: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Manual QA verification context, architecture mode..."
                  value={envForm.description}
                  onChange={(e) => setEnvForm({ ...envForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEnvModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded shadow-sm"
                >
                  Register Environment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Log Issue Observation / Retest */}
      {showObservationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Bug className="w-4 h-4 text-indigo-600" />
                Record Environment Observation / Retest
              </h3>
              <button
                onClick={() => setShowObservationModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateObservation} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Task / Defect UUID *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 20000000-0000-0000-0000-0000000003e8"
                  value={obsForm.task_id}
                  onChange={(e) => setObsForm({ ...obsForm, task_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Target Environment *
                  </label>
                  <select
                    value={obsForm.environment_id}
                    onChange={(e) => setObsForm({ ...obsForm, environment_id: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Environment</option>
                    {environments.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.env_code} - {e.env_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Application Version *
                  </label>
                  <select
                    value={obsForm.version_id}
                    onChange={(e) => setObsForm({ ...obsForm, version_id: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Version</option>
                    {versions.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.version_code} - {v.version_name || 'Release'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Verification Outcome *
                  </label>
                  <select
                    value={obsForm.observation_type}
                    onChange={(e) =>
                      setObsForm({
                        ...obsForm,
                        observation_type: e.target.value as IssueObservationType,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="PASSED">Passed</option>
                    <option value="FAILED">Failed</option>
                    <option value="FOUND_REPRODUCED">Found / Reproduced</option>
                    <option value="READY_FOR_RETEST">Ready for Retest</option>
                    <option value="FIX_AVAILABLE">Fix Available</option>
                    <option value="CANNOT_REPRODUCE">Cannot Reproduce</option>
                    <option value="BLOCKED">Blocked</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Build Label / Changeset
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. build-2026.09.28-rc1"
                    value={obsForm.build_label}
                    onChange={(e) => setObsForm({ ...obsForm, build_label: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Evidence & Reproduction Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Observed behavior, logs snippet, or test scenario steps..."
                  value={obsForm.evidence_notes}
                  onChange={(e) => setObsForm({ ...obsForm, evidence_notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chkClientVis"
                  checked={obsForm.is_client_visible}
                  onChange={(e) => setObsForm({ ...obsForm, is_client_visible: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="chkClientVis" className="text-slate-700">
                  Visible to authorized client representatives (no cross-client leakage)
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowObservationModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded shadow-sm"
                >
                  Save Observation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default EnvironmentsAndRetestsView;
