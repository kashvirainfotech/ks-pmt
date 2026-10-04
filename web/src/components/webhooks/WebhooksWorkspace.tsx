import React, { useState, useEffect } from 'react';
import {
  Webhook,
  Send,
  Key,
  RefreshCw,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  Eye,
  Activity,
  Layers,
  Check,
  ArrowRight,
} from 'lucide-react';
import { webhooksApi, projectsApi } from '../../api/endpoints';
import { WebhookSubscription, WebhookDelivery, Project } from '../../types';

const ALLOWED_EVENTS = [
  { code: 'task.created', label: 'Task Created', desc: 'Fires when a new task or work item is created' },
  { code: 'task.transitioned', label: 'Task Transitioned', desc: 'Fires when a task status moves across workflow stages' },
  { code: 'task.assigned', label: 'Task Assigned', desc: 'Fires when assignees are added or updated on a task' },
  { code: 'blocker.opened', label: 'Blocker Opened', desc: 'Fires when an impediment or blocker is raised' },
  { code: 'blocker.resolved', label: 'Blocker Resolved', desc: 'Fires when an impediment is marked as unblocked' },
  { code: 'release.published', label: 'Release Published', desc: 'Fires when a product version is officially released' },
  { code: 'sla.breached', label: 'SLA Breached', desc: 'Fires when response or resolution SLA is breached' },
  { code: 'cr.approved', label: 'Change Request Approved', desc: 'Fires when scope change request is signed off' },
  { code: 'uat.accepted', label: 'UAT Accepted', desc: 'Fires when client sign-off is recorded on UAT package' },
  { code: 'milestone.completed', label: 'Milestone Completed', desc: 'Fires when a project milestone hits 100%' },
];

export const WebhooksWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'deliveries' | 'simulator'>('subscriptions');
  const [subscriptions, setSubscriptions] = useState<WebhookSubscription[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [eventFilter, setEventFilter] = useState<string>('ALL');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingSub, setEditingSub] = useState<WebhookSubscription | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<WebhookDelivery | null>(null);
  const [newlyGeneratedSecret, setNewlyGeneratedSecret] = useState<{ code: string; secret: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState({
    subscriptionCode: '',
    name: '',
    targetUrl: '',
    eventTypes: ['task.created', 'task.transitioned'],
    scopeProjectIds: [] as string[],
    isEnabled: true,
    maxRetries: 3,
    timeoutSeconds: 10,
    description: '',
  });

  // Simulator State
  const [simEventType, setSimEventType] = useState<string>('task.created');
  const [simSubId, setSimSubId] = useState<string>('');
  const [simulating, setSimulating] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<any>(null);

  // Load Data
  useEffect(() => {
    loadSubscriptions();
    loadDeliveries();
    loadProjects();
  }, []);

  const loadSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await webhooksApi.getSubscriptions();
      setSubscriptions(res.data || []);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load webhook subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const loadDeliveries = async () => {
    try {
      const params: any = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (eventFilter !== 'ALL') params.eventType = eventFilter;
      const res = await webhooksApi.getDeliveries(params);
      setDeliveries(res.data || []);
    } catch (err: any) {
      console.error('Failed to load deliveries', err);
    }
  };

  const loadProjects = async () => {
    try {
      const res = await projectsApi.getProjects();
      setProjects(res.data || []);
    } catch (err: any) {
      console.error('Failed to load projects', err);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingSub(null);
    setFormData({
      subscriptionCode: `WH-${Math.floor(1000 + Math.random() * 9000)}`,
      name: '',
      targetUrl: 'https://',
      eventTypes: ['task.created', 'task.transitioned'],
      scopeProjectIds: [],
      isEnabled: true,
      maxRetries: 3,
      timeoutSeconds: 10,
      description: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (sub: WebhookSubscription) => {
    setEditingSub(sub);
    setFormData({
      subscriptionCode: sub.subscription_code,
      name: sub.name,
      targetUrl: sub.target_url,
      eventTypes: sub.event_types || [],
      scopeProjectIds: sub.scope_project_ids || [],
      isEnabled: sub.is_enabled,
      maxRetries: sub.max_retries || 3,
      timeoutSeconds: sub.timeout_seconds || 10,
      description: sub.description || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      if (editingSub) {
        await webhooksApi.updateSubscription(editingSub.id, {
          name: formData.name,
          targetUrl: formData.targetUrl,
          eventTypes: formData.eventTypes,
          scopeProjectIds: formData.scopeProjectIds,
          isEnabled: formData.isEnabled,
          maxRetries: formData.maxRetries,
          timeoutSeconds: formData.timeoutSeconds,
          description: formData.description,
        });
        setSuccessMsg(`Subscription "${formData.name}" updated successfully.`);
      } else {
        const res = await webhooksApi.createSubscription({
          subscriptionCode: formData.subscriptionCode,
          name: formData.name,
          targetUrl: formData.targetUrl,
          eventTypes: formData.eventTypes,
          scopeProjectIds: formData.scopeProjectIds,
          isEnabled: formData.isEnabled,
          maxRetries: formData.maxRetries,
          timeoutSeconds: formData.timeoutSeconds,
          description: formData.description,
        });
        if (res.data.raw_secret_key) {
          setNewlyGeneratedSecret({
            code: res.data.subscription_code,
            secret: res.data.raw_secret_key,
          });
        }
        setSuccessMsg(`Outbound webhook subscription "${formData.name}" created!`);
      }
      setIsModalOpen(false);
      loadSubscriptions();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Operation failed');
    }
  };

  const handleRotateSecret = async (sub: WebhookSubscription) => {
    if (!window.confirm(`Rotate signing secret for "${sub.name}"? Previous secret will remain accepted during consumer migration.`)) {
      return;
    }
    try {
      const res = await webhooksApi.rotateSecret(sub.id);
      setNewlyGeneratedSecret({
        code: res.data.subscription_code,
        secret: res.data.raw_secret_key,
      });
      setSuccessMsg(`Secret rotated successfully for ${sub.subscription_code}.`);
      loadSubscriptions();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to rotate secret');
    }
  };

  const handleDeleteSubscription = async (sub: WebhookSubscription) => {
    if (!window.confirm(`Are you sure you want to deactivate webhook subscription "${sub.name}" (${sub.subscription_code})?`)) {
      return;
    }
    try {
      await webhooksApi.deleteSubscription(sub.id);
      setSuccessMsg(`Webhook subscription "${sub.name}" removed.`);
      loadSubscriptions();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to delete subscription');
    }
  };

  const handleReplayDelivery = async (deliveryId: string) => {
    try {
      setSuccessMsg(null);
      await webhooksApi.replayDelivery(deliveryId);
      setSuccessMsg('Manual delivery replay initiated successfully.');
      loadDeliveries();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Delivery replay failed');
    }
  };

  const handleRunSimulation = async () => {
    setSimulating(true);
    setSimResult(null);
    try {
      const res = await webhooksApi.simulateEvent({
        eventType: simEventType,
        subscriptionId: simSubId || undefined,
      });
      setSimResult(res.data);
      setSuccessMsg(`Simulated event ${simEventType} dispatched to ${res.data.dispatched} endpoint(s).`);
      loadDeliveries();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Simulation dispatch failed');
    } finally {
      setSimulating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"><CheckCircle2 className="w-3 h-3 mr-1" /> Success</span>;
      case 'RETRYING':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"><Clock className="w-3 h-3 mr-1" /> Retrying</span>;
      case 'FAILED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400"><XCircle className="w-3 h-3 mr-1" /> Failed</span>;
      case 'MANUAL_REPLAY':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Replaying</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"><Clock className="w-3 h-3 mr-1" /> Pending</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
              <Webhook className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Webhooks & Event Integration</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Secure outbound event distribution with HMAC-SHA256 signatures, SSRF protection, and delivery audit ledger
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => { loadSubscriptions(); loadDeliveries(); }}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className="inline-flex items-center px-3 py-2 border border-indigo-200 dark:border-indigo-800 rounded-lg text-sm font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100"
          >
            <Play className="w-4 h-4 mr-2" />
            Test Simulator
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Subscription
          </button>
        </div>
      </div>

      {/* Alert Banners */}
      {error && (
        <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-rose-900 dark:text-rose-300">Action Failed</h4>
            <p className="text-sm text-rose-700 dark:text-rose-400 mt-0.5">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">&times;</button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-start space-x-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-emerald-800 dark:text-emerald-300">{successMsg}</p>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">&times;</button>
        </div>
      )}

      {/* Secret Key Display Alert (Shown once after creation/rotation) */}
      {newlyGeneratedSecret && (
        <div className="p-5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 shadow-sm">
          <div className="flex items-center space-x-3 text-amber-900 dark:text-amber-300 font-semibold mb-2">
            <Key className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span>Copy Signing Secret for {newlyGeneratedSecret.code}</span>
          </div>
          <p className="text-xs text-amber-800 dark:text-amber-400 mb-3">
            Please copy this secret now. It will never be displayed in plain text again. Verify incoming payloads using <code className="bg-amber-100 dark:bg-amber-900/50 px-1 py-0.5 rounded">HMAC-SHA256(secret, t.payload)</code>.
          </p>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={newlyGeneratedSecret.secret}
              className="flex-1 font-mono text-sm px-3 py-2 bg-white dark:bg-gray-900 border border-amber-300 dark:border-amber-800 rounded-lg text-gray-900 dark:text-gray-100 select-all"
            />
            <button
              onClick={() => copyToClipboard(newlyGeneratedSecret.secret)}
              className="inline-flex items-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition"
            >
              {copiedKey ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
              {copiedKey ? 'Copied' : 'Copy Secret'}
            </button>
            <button
              onClick={() => setNewlyGeneratedSecret(null)}
              className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 space-x-6">
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`py-3 px-1 text-sm font-medium border-b-2 flex items-center space-x-2 ${
            activeTab === 'subscriptions'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Subscriptions ({subscriptions.length})</span>
        </button>
        <button
          onClick={() => { setActiveTab('deliveries'); loadDeliveries(); }}
          className={`py-3 px-1 text-sm font-medium border-b-2 flex items-center space-x-2 ${
            activeTab === 'deliveries'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Delivery Ledger ({deliveries.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('simulator')}
          className={`py-3 px-1 text-sm font-medium border-b-2 flex items-center space-x-2 ${
            activeTab === 'simulator'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          <Play className="w-4 h-4" />
          <span>Test Simulator & Security Spec</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: SUBSCRIPTIONS */}
      {/* ===================================================================== */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-4">
          {subscriptions.length === 0 && !loading ? (
            <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
              <Webhook className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">No outbound webhooks registered</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mt-1 mb-5">
                Subscribe external systems such as Slack, ERP, Zapier, or CI/CD pipelines to receive automated events.
              </p>
              <button
                onClick={handleOpenCreateModal}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Subscription
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/80 rounded-xl p-5 shadow-sm hover:shadow transition"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          {sub.subscription_code}
                        </span>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                          {sub.name}
                        </h3>
                        {sub.is_enabled ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                            Disabled
                          </span>
                        )}
                      </div>

                      <div className="flex items-center text-sm font-mono text-gray-600 dark:text-gray-300 space-x-2">
                        <span className="text-xs text-gray-400 uppercase tracking-wider font-sans">Endpoint:</span>
                        <span className="truncate max-w-xl">{sub.target_url}</span>
                      </div>

                      {sub.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{sub.description}</p>
                      )}

                      {/* Event Badges */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(sub.event_types || []).map((evt) => (
                          <span
                            key={evt}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40"
                          >
                            {evt}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Right column: signing key, retries, stats & actions */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 border-t lg:border-t-0 pt-3 lg:pt-0 border-gray-100 dark:border-gray-800">
                      <div className="text-right space-y-1">
                        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                          <Key className="w-3.5 h-3.5 text-gray-400" />
                          <span>Secret:</span>
                          <span className="font-mono text-gray-700 dark:text-gray-300">{sub.masked_secret}</span>
                        </div>
                        <div className="text-xs text-gray-400">
                          Retries: <span className="font-semibold text-gray-600 dark:text-gray-300">{sub.max_retries || 3}</span> &bull; Timeout: <span className="font-semibold text-gray-600 dark:text-gray-300">{sub.timeout_seconds || 10}s</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleRotateSecret(sub)}
                          className="px-2.5 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-lg border border-amber-200 dark:border-amber-800/50 flex items-center space-x-1"
                          title="Rotate HMAC signing secret"
                        >
                          <Key className="w-3 h-3" />
                          <span>Rotate Secret</span>
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(sub)}
                          className="px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg flex items-center space-x-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteSubscription(sub)}
                          className="px-2 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg"
                          title="Delete subscription"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: DELIVERIES LEDGER */}
      {/* ===================================================================== */}
      {activeTab === 'deliveries' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setTimeout(loadDeliveries, 50); }}
                className="text-xs bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-gray-900 dark:text-white"
              >
                <option value="ALL">All Statuses</option>
                <option value="SUCCESS">Success (2xx)</option>
                <option value="FAILED">Failed</option>
                <option value="RETRYING">Retrying</option>
              </select>

              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Event:</span>
              <select
                value={eventFilter}
                onChange={(e) => { setEventFilter(e.target.value); setTimeout(loadDeliveries, 50); }}
                className="text-xs bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-gray-900 dark:text-white"
              >
                <option value="ALL">All Events</option>
                {ALLOWED_EVENTS.map(e => <option key={e.code} value={e.code}>{e.code}</option>)}
              </select>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400">
              Showing last 50 outbound delivery attempts
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/60 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3">Event ID & Type</th>
                    <th className="px-4 py-3">Subscription</th>
                    <th className="px-4 py-3">Destination URL</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">HTTP Code</th>
                    <th className="px-4 py-3">Attempt</th>
                    <th className="px-4 py-3">Latency</th>
                    <th className="px-4 py-3">Dispatched At</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {deliveries.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        No delivery logs recorded yet. Use the Test Simulator to trigger sample events.
                      </td>
                    </tr>
                  ) : (
                    deliveries.map((del) => (
                      <tr key={del.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/40 transition">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-mono text-xs font-semibold text-gray-900 dark:text-white">
                            {del.event_id}
                          </div>
                          <div className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                            {del.event_type}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-xs font-medium text-gray-900 dark:text-white">
                            {del.subscription_name || 'System'}
                          </div>
                          <div className="font-mono text-[10px] text-gray-400">
                            {del.subscription_code}
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-xs truncate font-mono text-xs text-gray-600 dark:text-gray-300">
                          {del.destination_url}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {getStatusBadge(del.status)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">
                          {del.response_status_code ? (
                            <span className={del.response_status_code >= 200 && del.response_status_code < 300 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                              {del.response_status_code}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-gray-600 dark:text-gray-400">
                          {del.attempt_number} / {del.max_attempts}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-gray-600 dark:text-gray-400">
                          {del.execution_duration_ms ? `${del.execution_duration_ms}ms` : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                          {new Date(del.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-xs space-x-2">
                          <button
                            onClick={() => setSelectedDelivery(del)}
                            className="inline-flex items-center px-2 py-1 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded"
                            title="Inspect Payload & Response"
                          >
                            <Eye className="w-3 h-3 mr-1" /> Inspect
                          </button>
                          <button
                            onClick={() => handleReplayDelivery(del.id)}
                            className="inline-flex items-center px-2 py-1 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 rounded"
                            title="1-Click Replay Delivery"
                          >
                            <RefreshCw className="w-3 h-3 mr-1" /> Replay
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: SIMULATOR & SECURITY SPEC */}
      {/* ===================================================================== */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Simulator Console */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5 shadow-sm">
            <div className="flex items-center space-x-3 pb-3 border-b border-gray-200 dark:border-gray-700">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                <Play className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Outbound Event Simulator</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Generate a synthetic payload and test live destination endpoints</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Select Event Type:
                </label>
                <select
                  value={simEventType}
                  onChange={(e) => setSimEventType(e.target.value)}
                  className="w-full text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                >
                  {ALLOWED_EVENTS.map(evt => (
                    <option key={evt.code} value={evt.code}>
                      {evt.code} — {evt.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {ALLOWED_EVENTS.find(e => e.code === simEventType)?.desc}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Target Specific Subscription (Optional):
                </label>
                <select
                  value={simSubId}
                  onChange={(e) => setSimSubId(e.target.value)}
                  className="w-full text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                >
                  <option value="">Dispatch to all subscribed & active endpoints</option>
                  {subscriptions.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.subscription_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-gray-900 rounded-lg p-3 font-mono text-xs text-emerald-400 overflow-x-auto">
                <div className="text-gray-400 text-[10px] uppercase mb-1">// Sample Payload Preview</div>
                <pre>{JSON.stringify({
                  event_id: "evt_sim_preview",
                  event_type: simEventType,
                  timestamp: new Date().toISOString(),
                  data: {
                    task_code: "TSK-SIM-001",
                    title: "Simulated Test Webhook Event",
                    priority: "HIGH",
                    status: "READY_FOR_DEV"
                  }
                }, null, 2)}</pre>
              </div>

              <button
                onClick={handleRunSimulation}
                disabled={simulating}
                className="w-full inline-flex items-center justify-center px-4 py-2.5 border border-transparent rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
              >
                <Send className={`w-4 h-4 mr-2 ${simulating ? 'animate-pulse' : ''}`} />
                {simulating ? 'Dispatching Simulation...' : 'Dispatch Simulation Now'}
              </button>

              {simResult && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-800 dark:text-emerald-300">
                  Dispatched to <strong>{simResult.dispatched}</strong> subscriber(s). Event ID: <code className="font-mono">{simResult.eventId}</code>. View ledger for HTTP statuses.
                </div>
              )}
            </div>
          </div>

          {/* Security & Cryptography Spec */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5 shadow-sm">
            <div className="flex items-center space-x-3 pb-3 border-b border-gray-200 dark:border-gray-700">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Security & SSRF Verification</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Enterprise outbound webhook security standards</p>
              </div>
            </div>

            <div className="space-y-4 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              <div className="p-3 bg-gray-50 dark:bg-gray-900/70 rounded-lg border border-gray-200 dark:border-gray-800 space-y-1.5">
                <div className="font-semibold text-gray-900 dark:text-white flex items-center">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 mr-1.5" />
                  Cryptographic HMAC-SHA256 Signatures
                </div>
                <p>
                  Every request carries header <code className="bg-gray-200 dark:bg-gray-800 px-1 py-0.5 rounded text-gray-800 dark:text-gray-200">X-PMT-Signature: t=1690000000,v1=...</code>.
                  Payload is computed as <code className="font-mono">HMAC_SHA256(secret, "$&#123;t&#125;.$&#123;rawPayload&#125;")</code>.
                </p>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-900/70 rounded-lg border border-gray-200 dark:border-gray-800 space-y-1.5">
                <div className="font-semibold text-gray-900 dark:text-white flex items-center">
                  <ShieldAlert className="w-4 h-4 text-rose-500 mr-1.5" />
                  Strict SSRF Destination Protection
                </div>
                <p>
                  Destination URLs pointing to loopback addresses (<code className="font-mono">127.0.0.1</code>, <code className="font-mono">localhost</code>), private RFC1918 subnets (<code className="font-mono">10.0.0.0/8</code>, <code className="font-mono">172.16.0.0/12</code>, <code className="font-mono">192.168.0.0/16</code>), or cloud instance metadata (<code className="font-mono">169.254.169.254</code>) are immediately rejected by destination validator.
                </p>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-900/70 rounded-lg border border-gray-200 dark:border-gray-800 space-y-1.5">
                <div className="font-semibold text-gray-900 dark:text-white flex items-center">
                  <Clock className="w-4 h-4 text-indigo-500 mr-1.5" />
                  Bounded Exponential Backoff
                </div>
                <p>
                  Failures trigger retries with exponential backoff (+60s, +300s, +900s) up to the subscription's configured maximum retries.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: CREATE / EDIT SUBSCRIPTION */}
      {/* ===================================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-xl w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingSub ? `Edit Subscription: ${editingSub.name}` : 'New Outbound Webhook Subscription'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
            </div>

            <form onSubmit={handleSaveSubscription} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Subscription Code *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingSub}
                    value={formData.subscriptionCode}
                    onChange={(e) => setFormData({ ...formData, subscriptionCode: e.target.value.toUpperCase() })}
                    className="w-full text-xs font-mono bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Name / Consumer *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Slack Incident Bot"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full text-xs bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Target Destination URL (HTTPS Recommended) *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://hooks.slack.com/services/..."
                  value={formData.targetUrl}
                  onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
                  className="w-full text-xs font-mono bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                />
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  Protected against SSRF: Private IPs (10.*, 192.168.*, 127.*) and AWS/GCP metadata endpoints will be blocked.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Subscribed Event Types ({formData.eventTypes.length} selected):
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  {ALLOWED_EVENTS.map(evt => {
                    const isChecked = formData.eventTypes.includes(evt.code);
                    return (
                      <label key={evt.code} className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, eventTypes: [...formData.eventTypes, evt.code] });
                            } else {
                              setFormData({ ...formData, eventTypes: formData.eventTypes.filter(x => x !== evt.code) });
                            }
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-mono text-[11px]">{evt.code}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Max Retries (1-5)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={formData.maxRetries}
                    onChange={(e) => setFormData({ ...formData, maxRetries: parseInt(e.target.value) || 3 })}
                    className="w-full text-xs bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Timeout (Seconds)
                  </label>
                  <input
                    type="number"
                    min={3}
                    max={30}
                    value={formData.timeoutSeconds}
                    onChange={(e) => setFormData({ ...formData, timeoutSeconds: parseInt(e.target.value) || 10 })}
                    className="w-full text-xs bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Description / Documentation
                </label>
                <textarea
                  rows={2}
                  placeholder="Notes on integrations, payload requirements..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full text-xs bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="isEnabled"
                  checked={formData.isEnabled}
                  onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="isEnabled" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Enable active event delivery immediately
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  {editingSub ? 'Save Changes' : 'Create Subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: DELIVERY INSPECTION */}
      {/* ===================================================================== */}
      {selectedDelivery && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Delivery Inspection</h3>
                <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">{selectedDelivery.event_id}</span>
              </div>
              <button onClick={() => setSelectedDelivery(null)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-gray-50 dark:bg-gray-900/60 p-3 rounded-lg">
                <div>Status: <span className="font-semibold">{selectedDelivery.status}</span></div>
                <div>HTTP Status: <span className="font-mono font-semibold">{selectedDelivery.response_status_code || 'None'}</span></div>
                <div>Attempt: <span className="font-mono font-semibold">{selectedDelivery.attempt_number} of {selectedDelivery.max_attempts}</span></div>
                <div>Duration: <span className="font-mono font-semibold">{selectedDelivery.execution_duration_ms ? `${selectedDelivery.execution_duration_ms}ms` : '-'}</span></div>
              </div>

              {selectedDelivery.error_message && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-800 dark:text-rose-300">
                  <span className="font-semibold">Error Message:</span> {selectedDelivery.error_message}
                </div>
              )}

              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Outbound Payload Sent:</label>
                <div className="bg-gray-900 text-emerald-400 font-mono text-[11px] p-3 rounded-lg max-h-48 overflow-y-auto">
                  <pre>{typeof selectedDelivery.payload === 'string' ? selectedDelivery.payload : JSON.stringify(selectedDelivery.payload, null, 2)}</pre>
                </div>
              </div>

              {selectedDelivery.response_body && (
                <div>
                  <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Destination Response Body:</label>
                  <div className="bg-gray-900 text-gray-200 font-mono text-[11px] p-3 rounded-lg max-h-32 overflow-y-auto">
                    <pre>{selectedDelivery.response_body}</pre>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => { handleReplayDelivery(selectedDelivery.id); setSelectedDelivery(null); }}
                className="px-3 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950 rounded-lg flex items-center space-x-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Replay this delivery</span>
              </button>
              <button
                onClick={() => setSelectedDelivery(null)}
                className="px-4 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
