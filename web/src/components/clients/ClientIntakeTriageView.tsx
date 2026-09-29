import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  Bug,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  Search,
  ChevronRight,
  Link2,
  ExternalLink,
  Building2,
  Send,
  Lock,
  MessageSquare,
  ShieldAlert,
  ArrowRight,
  Layers,
  BarChart3,
  User,
  PlusCircle,
} from 'lucide-react';
import { clientIntakeApi, projectsApi, clientsApi } from '../../api/endpoints';
import { ClientIntakeRequest, ImpactSummaryStats, ClientRequestMessage } from '../../types';

export const ClientIntakeTriageView: React.FC = () => {
  const [requests, setRequests] = useState<ClientIntakeRequest[]>([]);
  const [impactStats, setImpactStats] = useState<ImpactSummaryStats | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [clientFilter, setClientFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected for Drawer
  const [selectedRequest, setSelectedRequest] = useState<ClientIntakeRequest | null>(null);
  const [drawerLoading, setDrawerLoading] = useState<boolean>(false);

  // Triage Form State
  const [triageForm, setTriageForm] = useState({
    status: '',
    internalPriority: 'MEDIUM',
    technicalSeverity: 'MAJOR',
    businessImpact: 'OPERATIONS',
    impactBreadth: 'SINGLE_USER',
    rejectionOrDeclineReason: '',
    duplicateOfRequestId: '',
    affectedVersion: '',
    targetFixVersion: '',
  });

  // Message Form State
  const [newMessage, setNewMessage] = useState('');
  const [isInternalOnly, setIsInternalOnly] = useState(false);
  const [submittingMessage, setSubmittingMessage] = useState(false);

  // Convert/Link Task State
  const [linkTaskId, setLinkTaskId] = useState('');
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertForm, setConvertForm] = useState({
    projectId: '',
    priority: 'MEDIUM',
  });

  useEffect(() => {
    loadData();
  }, [statusFilter, typeFilter, clientFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reqRes, statsRes, clientsRes, projectsRes] = await Promise.all([
        clientIntakeApi.getRequests({
          status: statusFilter || undefined,
          requestType: typeFilter || undefined,
          clientId: clientFilter || undefined,
          search: searchQuery || undefined,
        }),
        clientIntakeApi.getImpactSummary(),
        clientsApi.getAll({ limit: 100 }),
        projectsApi.getProjects({ limit: 100 }),
      ]);
      setRequests(reqRes.data || []);
      setImpactStats(statsRes.data || null);
      setClients(clientsRes.data || []);
      setProjects(projectsRes.data || []);
    } catch (err) {
      console.error('Failed to load intake requests', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDrawer = async (req: ClientIntakeRequest) => {
    try {
      setDrawerLoading(true);
      const detail = await clientIntakeApi.getRequestById(req.id);
      setSelectedRequest(detail.data);
      setTriageForm({
        status: detail.data.status,
        internalPriority: detail.data.internal_priority || 'MEDIUM',
        technicalSeverity: detail.data.technical_severity || 'MAJOR',
        businessImpact: detail.data.business_impact || 'OPERATIONS',
        impactBreadth: detail.data.impact_breadth || 'SINGLE_USER',
        rejectionOrDeclineReason: detail.data.rejection_or_decline_reason || '',
        duplicateOfRequestId: detail.data.duplicate_of_request_id || '',
        affectedVersion: detail.data.affected_version || '',
        targetFixVersion: detail.data.target_fix_version || '',
      });
      setConvertForm({
        projectId: detail.data.project_id || (projects[0]?.id || ''),
        priority: detail.data.internal_priority || detail.data.client_priority || 'MEDIUM',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleSaveTriage = async () => {
    if (!selectedRequest) return;
    try {
      const updated = await clientIntakeApi.triageRequest(selectedRequest.id, {
        status: triageForm.status,
        internalPriority: triageForm.internalPriority,
        technicalSeverity: triageForm.technicalSeverity,
        businessImpact: triageForm.businessImpact,
        impactBreadth: triageForm.impactBreadth,
        rejectionOrDeclineReason: triageForm.rejectionOrDeclineReason || undefined,
        duplicateOfRequestId: triageForm.duplicateOfRequestId || undefined,
        affectedVersion: triageForm.affectedVersion || undefined,
        targetFixVersion: triageForm.targetFixVersion || undefined,
      });
      alert('Request triaged successfully!');
      handleOpenDrawer(updated.data);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to triage request');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !newMessage.trim()) return;
    try {
      setSubmittingMessage(true);
      await clientIntakeApi.addMessage(selectedRequest.id, {
        message: newMessage,
        isInternalOnly,
      });
      setNewMessage('');
      // Reload drawer
      const detail = await clientIntakeApi.getRequestById(selectedRequest.id);
      setSelectedRequest(detail.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSubmittingMessage(false);
    }
  };

  const handleLinkTask = async () => {
    if (!selectedRequest || !linkTaskId) return;
    try {
      await clientIntakeApi.linkTask(selectedRequest.id, linkTaskId);
      alert('Task linked successfully!');
      setLinkTaskId('');
      handleOpenDrawer(selectedRequest);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to link task');
    }
  };

  const handleConvertToTask = async () => {
    if (!selectedRequest) return;
    try {
      const res = await clientIntakeApi.createTaskFromRequest(selectedRequest.id, {
        projectId: convertForm.projectId,
        priority: convertForm.priority,
      });
      alert(res.message || 'Task created successfully');
      setShowConvertModal(false);
      handleOpenDrawer(selectedRequest);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create task from request');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'BUG':
        return <Bug className="w-4 h-4 text-rose-500" />;
      case 'CHANGE_REQUEST':
        return <FileText className="w-4 h-4 text-purple-500" />;
      default:
        return <LifeBuoy className="w-4 h-4 text-blue-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300';
      case 'UNDER_REVIEW':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300';
      case 'NEEDS_INFORMATION':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300';
      case 'ACCEPTED':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
      case 'DECLINED':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300';
      case 'DUPLICATE':
        return 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <LifeBuoy className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Client Intake & Triage Radar
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Private intake queue for client bug reports, support tickets, and change requests (CLIENT-002)
          </p>
        </div>
      </div>

      {/* Impact Summary Widgets */}
      {impactStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Awaiting Triage</span>
            <div className="text-2xl font-bold text-amber-500 mt-1">
              {impactStats.byStatus.find((s) => s.status === 'SUBMITTED')?.count || 0}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Freshly submitted requests</div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <span className="text-xs font-semibold text-rose-500 uppercase tracking-wider">High/Critical Severity</span>
            <div className="text-2xl font-bold text-rose-600 mt-1">
              {requests.filter((r) => r.technical_severity === 'CRITICAL' || r.technical_severity === 'BLOCKER').length}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Assessed technical impact</div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <span className="text-xs font-semibold text-indigo-500 uppercase tracking-wider">Accepted in Delivery</span>
            <div className="text-2xl font-bold text-indigo-600 mt-1">
              {impactStats.byStatus.find((s) => s.status === 'ACCEPTED')?.count || 0}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Linked to sprint/task work</div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">Total Received</span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {requests.length}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Across all client portals</div>
          </div>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
          {[
            { label: 'All Requests', val: '' },
            { label: 'Needs Triage', val: 'SUBMITTED' },
            { label: 'Under Review', val: 'UNDER_REVIEW' },
            { label: 'Needs Information', val: 'NEEDS_INFORMATION' },
            { label: 'Accepted in Work', val: 'ACCEPTED' },
            { label: 'Declined', val: 'DECLINED' },
            { label: 'Duplicate', val: 'DUPLICATE' },
          ].map((tab) => (
            <button
              key={tab.val}
              onClick={() => setStatusFilter(tab.val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === tab.val
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dropdown Filters & Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search title, request number, or client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadData()}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200"
            >
              <option value="">All Types</option>
              <option value="BUG">Bug Report</option>
              <option value="SUPPORT">Support Ticket</option>
              <option value="CHANGE_REQUEST">Change Request</option>
            </select>

            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200"
            >
              <option value="">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-5 py-3.5">Request #</th>
                <th className="px-5 py-3.5">Type & Title</th>
                <th className="px-5 py-3.5">Client & Contact</th>
                <th className="px-5 py-3.5">Project / Product</th>
                <th className="px-5 py-3.5">Client Priority</th>
                <th className="px-5 py-3.5">Triage Severity</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                    Loading intake requests...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                    No intake requests found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr
                    key={req.id}
                    onClick={() => handleOpenDrawer(req)}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 cursor-pointer transition"
                  >
                    <td className="px-5 py-4 font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      {req.request_number}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                        {getTypeIcon(req.request_type)}
                        <span>{req.title}</span>
                      </div>
                      <div className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                        {req.description}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {req.company_name}
                      </div>
                      <div className="text-xs text-slate-400">{req.contact_name}</div>
                    </td>
                    <td className="px-5 py-4 text-xs">
                      {req.project_name ? (
                        <div className="font-medium text-slate-700 dark:text-slate-300">
                          {req.project_name}
                        </div>
                      ) : req.product_name ? (
                        <div className="font-medium text-indigo-600 dark:text-indigo-400">
                          {req.product_name}
                        </div>
                      ) : (
                        <span className="text-slate-400">General Support</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-semibold ${
                          req.client_priority === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-700'
                            : req.client_priority === 'HIGH'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {req.client_priority}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {req.technical_severity ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                          {req.technical_severity}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Unassessed</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${getStatusBadge(req.status)}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <ChevronRight className="w-4 h-4 text-slate-400 inline" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Triage Drawer */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-800 shadow-2xl h-full flex flex-col border-l border-slate-200 dark:border-slate-700 overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold px-2 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded">
                  {selectedRequest.request_number}
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${getStatusBadge(selectedRequest.status)}`}>
                  {selectedRequest.status}
                </span>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold leading-none"
              >
                &times;
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Title & Description */}
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  {getTypeIcon(selectedRequest.request_type)}
                  {selectedRequest.title}
                </h2>
                <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                  {selectedRequest.description}
                </div>
              </div>

              {/* Submitter & Client Metadata */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                <div>
                  <span className="text-slate-400">Client Organization:</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    {selectedRequest.company_name}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Submitter Contact:</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    {selectedRequest.contact_name} ({selectedRequest.contact_email})
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Client-Requested Priority:</span>
                  <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedRequest.client_priority}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Submitted Date:</span>
                  <div className="text-slate-700 dark:text-slate-300 mt-0.5">
                    {new Date(selectedRequest.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Environment Observation Details */}
              {selectedRequest.environment_details && Object.keys(selectedRequest.environment_details).length > 0 && (
                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                  <span className="font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Environment Metadata
                  </span>
                  <pre className="text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {JSON.stringify(selectedRequest.environment_details, null, 2)}
                  </pre>
                </div>
              )}

              {/* Triage & Assessment Controls */}
              <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-xl border border-indigo-200 dark:border-indigo-800 space-y-4">
                <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-indigo-600" />
                  Engineering Triage Assessment
                </h3>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Triage Status
                    </label>
                    <select
                      value={triageForm.status}
                      onChange={(e) => setTriageForm({ ...triageForm, status: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                    >
                      <option value="SUBMITTED">SUBMITTED (Awaiting Triage)</option>
                      <option value="UNDER_REVIEW">UNDER_REVIEW (Active Investigation)</option>
                      <option value="NEEDS_INFORMATION">NEEDS_INFORMATION (Awaiting Customer Info)</option>
                      <option value="ACCEPTED">ACCEPTED (Accepted for Delivery)</option>
                      <option value="DECLINED">DECLINED (Declined / Out of Scope)</option>
                      <option value="DUPLICATE">DUPLICATE (Already Reported)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Technical Severity (QA/Dev)
                    </label>
                    <select
                      value={triageForm.technicalSeverity}
                      onChange={(e) => setTriageForm({ ...triageForm, technicalSeverity: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                    >
                      <option value="TRIVIAL">TRIVIAL</option>
                      <option value="MINOR">MINOR</option>
                      <option value="MAJOR">MAJOR</option>
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="BLOCKER">BLOCKER</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Internal Delivery Priority (PM)
                    </label>
                    <select
                      value={triageForm.internalPriority}
                      onChange={(e) => setTriageForm({ ...triageForm, internalPriority: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Business Impact Category
                    </label>
                    <select
                      value={triageForm.businessImpact}
                      onChange={(e) => setTriageForm({ ...triageForm, businessImpact: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                    >
                      <option value="OPERATIONS">OPERATIONS</option>
                      <option value="REVENUE">REVENUE</option>
                      <option value="COMPLIANCE">COMPLIANCE</option>
                      <option value="SECURITY">SECURITY</option>
                      <option value="USABILITY">USABILITY</option>
                      <option value="PERFORMANCE">PERFORMANCE</option>
                      <option value="REPORTING">REPORTING</option>
                      <option value="OTHER">OTHER</option>
                    </select>
                  </div>
                </div>

                {triageForm.status === 'DECLINED' && (
                  <div>
                    <label className="block font-semibold text-red-600 text-xs mb-1">
                      Reason for Declining *
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={triageForm.rejectionOrDeclineReason}
                      onChange={(e) =>
                        setTriageForm({ ...triageForm, rejectionOrDeclineReason: e.target.value })
                      }
                      placeholder="Explain to client why this request cannot be accepted..."
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-red-300 dark:border-red-700 rounded-lg text-xs"
                    />
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleSaveTriage}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                  >
                    Save Triage Updates
                  </button>
                </div>
              </div>

              {/* Delivery Work Linking */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-indigo-600" />
                    Internal Delivery Task Linking
                  </h3>
                  {!selectedRequest.linked_task_id && (
                    <button
                      onClick={() => setShowConvertModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Create Delivery Task
                    </button>
                  )}
                </div>

                {selectedRequest.linked_task_id ? (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                        Linked Task: {selectedRequest.linked_task_number}
                      </span>
                      <div className="text-slate-600 dark:text-slate-300 mt-0.5">
                        {selectedRequest.linked_task_title}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Internal Status: {selectedRequest.linked_task_status_name}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 rounded font-semibold text-xs">
                      Active Link
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Paste internal task UUID to link..."
                      value={linkTaskId}
                      onChange={(e) => setLinkTaskId(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                    />
                    <button
                      onClick={handleLinkTask}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold"
                    >
                      Link
                    </button>
                  </div>
                )}
              </div>

              {/* Discussion & Messages Stream */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-600" />
                  Clarifications & Messages
                </h3>

                <div className="space-y-2.5 max-h-60 overflow-y-auto p-1">
                  {selectedRequest.messages && selectedRequest.messages.length > 0 ? (
                    selectedRequest.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg text-xs ${
                          msg.is_internal_only
                            ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'
                            : msg.sender_type === 'CLIENT_CONTACT'
                            ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800'
                            : 'bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold mb-1">
                          <span className="flex items-center gap-1.5">
                            {msg.sender_type === 'CLIENT_CONTACT' ? (
                              <User className="w-3.5 h-3.5 text-blue-500" />
                            ) : (
                              <Building2 className="w-3.5 h-3.5 text-slate-500" />
                            )}
                            {msg.sender_type === 'CLIENT_CONTACT'
                              ? msg.contact_author_name
                              : msg.staff_author_name || 'Staff'}
                          </span>
                          <div className="flex items-center gap-2 text-slate-400">
                            {msg.is_internal_only && (
                              <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                Internal Only
                              </span>
                            )}
                            <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                        <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-300">{msg.message}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-slate-400 text-xs italic">
                      No clarification messages recorded yet.
                    </div>
                  )}
                </div>

                {/* Message Composer */}
                <form onSubmit={handleSendMessage} className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <textarea
                    rows={2}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Write a message to the client, or check 'Internal only' for staff notes..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-amber-600 dark:text-amber-400">
                      <input
                        type="checkbox"
                        checked={isInternalOnly}
                        onChange={(e) => setIsInternalOnly(e.target.checked)}
                        className="rounded border-amber-300 text-amber-600 w-3.5 h-3.5"
                      />
                      <span>Internal staff note only (invisible to client)</span>
                    </label>
                    <button
                      type="submit"
                      disabled={submittingMessage || !newMessage.trim()}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Send Message
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Convert to Task Modal */}
      {showConvertModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-emerald-600" />
              Create Delivery Task from Request
            </h3>
            <p className="text-xs text-slate-500">
              This will create a new backlog task with the title & description from request {selectedRequest.request_number} and atomically link it.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Project *
              </label>
              <select
                value={convertForm.projectId}
                onChange={(e) => setConvertForm({ ...convertForm, projectId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.project_name} ({p.project_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Task Priority
              </label>
              <select
                value={convertForm.priority}
                onChange={(e) => setConvertForm({ ...convertForm, priority: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setShowConvertModal(false)}
                className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleConvertToTask}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm"
              >
                Confirm & Create Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ClientIntakeTriageView;
