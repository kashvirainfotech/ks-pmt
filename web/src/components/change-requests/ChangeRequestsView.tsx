import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  DollarSign,
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ChevronRight,
  X,
  History,
  ShieldAlert,
  ArrowRight,
  Link2,
  Trash2,
  UserCheck,
  Send,
  Building,
  Target,
  RefreshCw,
} from 'lucide-react';
import {
  changeRequestsApi,
  projectsApi,
  productsApi,
  mastersApi,
  tasksApi,
} from '../../api/endpoints';
import {
  ChangeRequest,
  ChangeRequestRevision,
  Project,
  Product,
  User,
  Task,
} from '../../types';

export const ChangeRequestsView: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Filters
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Drawer / Selection
  const [selectedCr, setSelectedCr] = useState<ChangeRequest | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [showLinkTasksModal, setShowLinkTasksModal] = useState(false);

  // Available tasks for linking
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [isScopeAddition, setIsScopeAddition] = useState(true);

  // Form states - Create
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    businessJustification: '',
    impactSummary: '',
    projectId: '',
    productId: '',
    accountablePmUserId: '',
    scopeDescription: '',
    deliverables: [{ title: '', description: '', targetDate: '' }],
    estimatedHours: 0,
    quotedPrice: 0,
    currency: 'INR',
    scheduleDelayDays: 0,
    revisedDeliveryDate: '',
    revisionReason: 'Initial scope & commercial quotation',
  });

  // Form states - Material Revision
  const [revisionForm, setRevisionForm] = useState({
    scopeDescription: '',
    deliverables: [{ title: '', description: '', targetDate: '' }],
    estimatedHours: 0,
    quotedPrice: 0,
    currency: 'INR',
    scheduleDelayDays: 0,
    revisedDeliveryDate: '',
    revisionReason: '',
    submitForInternalReview: true,
  });

  // Form states - PM Review
  const [reviewForm, setReviewForm] = useState<{
    status: 'AWAITING_CLIENT' | 'CHANGES_REQUESTED';
    internalReviewNotes: string;
  }>({
    status: 'AWAITING_CLIENT',
    internalReviewNotes: '',
  });

  // Form states - Client Decision (Override/attributable)
  const [decisionForm, setDecisionForm] = useState<{
    decision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';
    remarks: string;
  }>({
    decision: 'APPROVED',
    remarks: '',
  });

  useEffect(() => {
    loadMetadata();
    loadChangeRequests();
  }, [selectedProjectId, selectedProductId, statusFilter, searchQuery]);

  const loadMetadata = async () => {
    try {
      const [projRes, prodRes, usersRes] = await Promise.all([
        projectsApi.getProjects(),
        productsApi.getProducts(),
        mastersApi.getUsers({ limit: 100 }),
      ]);
      setProjects(projRes.data || []);
      setProducts(prodRes.data || []);
      const loadedUsers = (usersRes.data as any)?.data || usersRes.data || [];
      setUsers(Array.isArray(loadedUsers) ? loadedUsers : []);
    } catch (err) {
      console.error('Failed to load metadata', err);
    }
  };

  const loadChangeRequests = async () => {
    setLoading(true);
    try {
      const res = await changeRequestsApi.getAll({
        projectId: selectedProjectId || undefined,
        productId: selectedProductId || undefined,
        status: statusFilter || undefined,
        search: searchQuery || undefined,
      });
      setChangeRequests(res.data.data || []);
    } catch (err) {
      console.error('Failed to load change requests', err);
    } finally {
      setLoading(false);
    }
  };

  const openDrawer = async (crId: string) => {
    setDrawerLoading(true);
    try {
      const res = await changeRequestsApi.getById(crId);
      setSelectedCr(res.data);
    } catch (err) {
      console.error('Failed to load change request details', err);
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title || !createForm.businessJustification || !createForm.scopeDescription) {
      alert('Please fill out all required fields');
      return;
    }
    if (!createForm.projectId && !createForm.productId) {
      alert('Please select either a Project or a Product');
      return;
    }
    if (!createForm.accountablePmUserId) {
      alert('Please designate an accountable Project Manager');
      return;
    }

    try {
      await changeRequestsApi.create({
        ...createForm,
        deliverables: createForm.deliverables.filter((d) => d.title.trim().length > 0),
        estimatedHours: Number(createForm.estimatedHours) || 0,
        quotedPrice: Number(createForm.quotedPrice) || 0,
        scheduleDelayDays: Number(createForm.scheduleDelayDays) || 0,
      });
      setShowCreateModal(false);
      resetCreateForm();
      loadChangeRequests();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create change request');
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      title: '',
      description: '',
      businessJustification: '',
      impactSummary: '',
      projectId: '',
      productId: '',
      accountablePmUserId: '',
      scopeDescription: '',
      deliverables: [{ title: '', description: '', targetDate: '' }],
      estimatedHours: 0,
      quotedPrice: 0,
      currency: 'INR',
      scheduleDelayDays: 0,
      revisedDeliveryDate: '',
      revisionReason: 'Initial scope & commercial quotation',
    });
  };

  const openRevisionModal = () => {
    if (!selectedCr) return;
    const currentRev = selectedCr.revisions?.find(
      (r) => r.revision_number === selectedCr.current_revision,
    );
    setRevisionForm({
      scopeDescription: currentRev?.scope_description || selectedCr.description,
      deliverables: currentRev?.deliverables?.length
        ? currentRev.deliverables.map((d) => ({
            title: d.title,
            description: d.description || '',
            targetDate: d.targetDate || '',
          }))
        : [{ title: '', description: '', targetDate: '' }],
      estimatedHours: currentRev?.estimated_hours || 0,
      quotedPrice: currentRev?.quoted_price || 0,
      currency: currentRev?.currency || 'INR',
      scheduleDelayDays: currentRev?.schedule_delay_days || 0,
      revisedDeliveryDate: currentRev?.revised_delivery_date || '',
      revisionReason: '',
      submitForInternalReview: true,
    });
    setShowRevisionModal(true);
  };

  const handleRevisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCr) return;
    if (!revisionForm.revisionReason) {
      alert('Please specify the justification / reason for this material revision');
      return;
    }

    try {
      await changeRequestsApi.createRevision(selectedCr.id, {
        ...revisionForm,
        deliverables: revisionForm.deliverables.filter((d) => d.title.trim().length > 0),
        estimatedHours: Number(revisionForm.estimatedHours) || 0,
        quotedPrice: Number(revisionForm.quotedPrice) || 0,
        scheduleDelayDays: Number(revisionForm.scheduleDelayDays) || 0,
      });
      setShowRevisionModal(false);
      openDrawer(selectedCr.id);
      loadChangeRequests();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit revision');
    }
  };

  const handleSubmitForReview = async () => {
    if (!selectedCr) return;
    try {
      await changeRequestsApi.submitForReview(selectedCr.id);
      openDrawer(selectedCr.id);
      loadChangeRequests();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit for internal review');
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCr) return;
    try {
      await changeRequestsApi.reviewRevision(
        selectedCr.id,
        selectedCr.current_revision,
        reviewForm,
      );
      setShowReviewModal(false);
      openDrawer(selectedCr.id);
      loadChangeRequests();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit internal review');
    }
  };

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCr) return;
    try {
      await changeRequestsApi.recordDecision(
        selectedCr.id,
        selectedCr.current_revision,
        decisionForm,
      );
      setShowDecisionModal(false);
      openDrawer(selectedCr.id);
      loadChangeRequests();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record decision');
    }
  };

  const openLinkTasks = async () => {
    if (!selectedCr || !selectedCr.project_id) return;
    try {
      const res = await tasksApi.getTasks({ projectId: selectedCr.project_id });
      const loadedTasks = (res.data as any)?.tasks || (res.data as any)?.data || [];
      setProjectTasks(Array.isArray(loadedTasks) ? loadedTasks : []);
      setSelectedTaskIds([]);
      setShowLinkTasksModal(true);
    } catch (err) {
      console.error('Failed to load project tasks', err);
    }
  };

  const handleLinkTasksSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCr || selectedTaskIds.length === 0) return;
    try {
      await changeRequestsApi.linkTasks(selectedCr.id, {
        taskIds: selectedTaskIds,
        isScopeAddition,
      });
      setShowLinkTasksModal(false);
      openDrawer(selectedCr.id);
      loadChangeRequests();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to link tasks');
    }
  };

  const handleUnlinkTask = async (taskId: string) => {
    if (!selectedCr) return;
    if (!window.confirm('Are you sure you want to unlink this task from this change request?')) return;
    try {
      await changeRequestsApi.unlinkTask(selectedCr.id, taskId);
      openDrawer(selectedCr.id);
      loadChangeRequests();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to unlink task');
    }
  };

  // KPIs
  const totalCrs = changeRequests.length;
  const awaitingClientCount = changeRequests.filter((cr) => cr.status === 'AWAITING_CLIENT').length;
  const approvedCount = changeRequests.filter((cr) => cr.status === 'APPROVED').length;
  const approvedValue = changeRequests
    .filter((cr) => cr.status === 'APPROVED')
    .reduce((sum, cr) => sum + (Number(cr.quoted_price) || 0), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-gray-100 text-gray-700">Draft</span>;
      case 'INTERNAL_REVIEW':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-100 text-amber-800">Internal Review</span>;
      case 'AWAITING_CLIENT':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-800 animate-pulse">Awaiting Client</span>;
      case 'APPROVED':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-green-100 text-green-800 font-bold">Approved</span>;
      case 'CHANGES_REQUESTED':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-orange-100 text-orange-800">Changes Requested</span>;
      case 'REJECTED':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-red-100 text-red-800">Rejected</span>;
      case 'DEFERRED':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-purple-100 text-purple-800">Deferred</span>;
      case 'WITHDRAWN':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-gray-200 text-gray-600">Withdrawn</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-indigo-600" />
            Scope & Change-Request Approval
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Formal change quotations, material revision history, client approver audit trail, and delivery task linkage.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              loadChangeRequests();
              if (selectedCr) openDrawer(selectedCr.id);
            }}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm font-medium transition"
          >
            <Plus className="w-4 h-4" />
            New Change Request
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500 font-medium">Total Change Requests</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{totalCrs}</div>
          <div className="text-xs text-gray-400 mt-1">Across all projects & products</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm bg-blue-50/20">
          <div className="text-sm text-blue-700 font-medium">Awaiting Client Decision</div>
          <div className="text-2xl font-bold text-blue-900 mt-1">{awaitingClientCount}</div>
          <div className="text-xs text-blue-500 mt-1">Published quotations pending sign-off</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-green-200 shadow-sm bg-green-50/20">
          <div className="text-sm text-green-700 font-medium">Approved Proposals</div>
          <div className="text-2xl font-bold text-green-900 mt-1">{approvedCount}</div>
          <div className="text-xs text-green-600 mt-1">Committed to delivery scope</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-indigo-200 shadow-sm bg-indigo-50/20">
          <div className="text-sm text-indigo-700 font-medium">Approved Value</div>
          <div className="text-2xl font-bold text-indigo-900 mt-1">
            ₹{approvedValue.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-indigo-500 mt-1">Authorized commercial add-ons</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by CR number, title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_name} ({p.project_code})
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="INTERNAL_REVIEW">Internal Review</option>
            <option value="AWAITING_CLIENT">Awaiting Client</option>
            <option value="APPROVED">Approved</option>
            <option value="CHANGES_REQUESTED">Changes Requested</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Change Requests Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading change requests...</div>
        ) : changeRequests.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <div className="text-base font-medium text-gray-700">No Change Requests Found</div>
            <p className="text-sm text-gray-400 mt-1">Create your first formal change request quotation.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="py-3 px-4">CR # / Title</th>
                  <th className="py-3 px-4">Project / Product</th>
                  <th className="py-3 px-4">PM Lead</th>
                  <th className="py-3 px-4">Active Revision</th>
                  <th className="py-3 px-4">Effort & Cost</th>
                  <th className="py-3 px-4">Schedule Impact</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {changeRequests.map((cr) => (
                  <tr
                    key={cr.id}
                    className="hover:bg-indigo-50/40 transition cursor-pointer"
                    onClick={() => openDrawer(cr.id)}
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-indigo-600">{cr.cr_number}</div>
                      <div className="font-medium text-gray-900 mt-0.5">{cr.title}</div>
                      {cr.originating_request_number && (
                        <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <Link2 className="w-3 h-3 text-gray-400" />
                          From Intake #{cr.originating_request_number}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {cr.project_name ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          <Building className="w-3.5 h-3.5" />
                          {cr.project_name}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                          <Target className="w-3.5 h-3.5" />
                          {cr.product_name}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {cr.accountable_pm_name || 'Unassigned'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded font-semibold text-xs border">
                        Rev {cr.current_revision}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900">
                        {cr.currency} {Number(cr.quoted_price || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {cr.estimated_hours || 0} hrs estimated
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {cr.schedule_delay_days && cr.schedule_delay_days > 0 ? (
                        <span className="text-amber-700 font-medium">+{cr.schedule_delay_days} days</span>
                      ) : (
                        <span className="text-green-700">No delay</span>
                      )}
                      {cr.revised_delivery_date && (
                        <div className="text-xs text-gray-400">
                          Target: {new Date(cr.revised_delivery_date).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(cr.status)}</td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openDrawer(cr.id)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-over Detail Drawer */}
      {selectedCr && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200">
                    {selectedCr.cr_number}
                  </span>
                  {getStatusBadge(selectedCr.status)}
                  <span className="text-xs font-semibold bg-gray-200 text-gray-800 px-2 py-0.5 rounded">
                    Rev {selectedCr.current_revision}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-gray-900 mt-1">{selectedCr.title}</h2>
              </div>
              <button
                onClick={() => setSelectedCr(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {drawerLoading ? (
                <div className="text-center py-12 text-gray-500">Loading details...</div>
              ) : (
                <>
                  {/* Action Bar */}
                  <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl flex flex-wrap gap-2 items-center justify-between">
                    <div className="text-xs text-indigo-900 font-medium">
                      Lifecycle Actions for Rev {selectedCr.current_revision}:
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {(selectedCr.status === 'DRAFT' || selectedCr.status === 'CHANGES_REQUESTED') && (
                        <button
                          onClick={handleSubmitForReview}
                          className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-semibold hover:bg-indigo-700 shadow-xs flex items-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Submit for PM Review
                        </button>
                      )}

                      {selectedCr.status === 'INTERNAL_REVIEW' && (
                        <button
                          onClick={() => setShowReviewModal(true)}
                          className="px-3 py-1.5 bg-amber-600 text-white rounded text-xs font-semibold hover:bg-amber-700 shadow-xs flex items-center gap-1.5"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          Complete PM Review
                        </button>
                      )}

                      {selectedCr.status === 'AWAITING_CLIENT' && (
                        <button
                          onClick={() => setShowDecisionModal(true)}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 shadow-xs flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Record Client Decision (Override)
                        </button>
                      )}

                      <button
                        onClick={openRevisionModal}
                        className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded text-xs font-semibold hover:bg-gray-50 shadow-xs flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5 text-indigo-600" />
                        Propose Material Revision (Rev {selectedCr.current_revision + 1})
                      </button>

                      {selectedCr.status === 'APPROVED' && (
                        <button
                          onClick={openLinkTasks}
                          className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-semibold hover:bg-green-700 shadow-xs flex items-center gap-1.5"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                          Link Delivery Tasks
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Overview details */}
                  <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div>
                      <span className="text-gray-400 block">Accountable PM:</span>
                      <span className="font-semibold text-gray-800">
                        {selectedCr.accountable_pm_name} ({selectedCr.accountable_pm_email})
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Target Scope Container:</span>
                      <span className="font-semibold text-gray-800">
                        {selectedCr.project_name || selectedCr.product_name}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-400 block">Business Justification:</span>
                      <p className="text-gray-700 mt-1 whitespace-pre-wrap">{selectedCr.business_justification}</p>
                    </div>
                    {selectedCr.impact_summary && (
                      <div className="col-span-2">
                        <span className="text-gray-400 block">Impact Summary:</span>
                        <p className="text-gray-700 mt-1 whitespace-pre-wrap">{selectedCr.impact_summary}</p>
                      </div>
                    )}
                  </div>

                  {/* Revisions History Timeline */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                        <History className="w-4 h-4 text-indigo-600" />
                        Quotation & Scope Revisions ({selectedCr.revisions?.length || 0})
                      </h3>
                      <span className="text-xs text-gray-500">
                        Material changes create new revisions requiring full client sign-off.
                      </span>
                    </div>

                    <div className="space-y-4">
                      {selectedCr.revisions?.map((rev) => {
                        const isCurrent = rev.revision_number === selectedCr.current_revision;
                        return (
                          <div
                            key={rev.id}
                            className={`p-4 rounded-xl border transition ${
                              isCurrent
                                ? 'border-indigo-300 bg-white ring-2 ring-indigo-500/10 shadow-xs'
                                : 'border-gray-200 bg-gray-50/60 opacity-80'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2.5 py-0.5 text-xs font-bold rounded ${
                                    isCurrent
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-gray-200 text-gray-700'
                                  }`}
                                >
                                  Revision {rev.revision_number}
                                </span>
                                {isCurrent && (
                                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                                    [Active Current]
                                  </span>
                                )}
                                {getStatusBadge(rev.status)}
                              </div>
                              <div className="text-xs text-gray-400">
                                Submitted {new Date(rev.submitted_at).toLocaleDateString()} by{' '}
                                {rev.submitted_by_name || 'PM'}
                              </div>
                            </div>

                            {rev.revision_reason && (
                              <div className="mt-2 text-xs text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded border border-amber-200">
                                <span className="font-bold">Revision Rationale: </span>
                                {rev.revision_reason}
                              </div>
                            )}

                            {/* Commercial Quote */}
                            <div className="grid grid-cols-3 gap-2 mt-3 p-3 bg-gray-50 rounded-lg text-xs">
                              <div>
                                <span className="text-gray-400 block">Quoted Price:</span>
                                <span className="text-sm font-bold text-gray-900">
                                  {rev.currency} {Number(rev.quoted_price).toLocaleString()}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400 block">Effort:</span>
                                <span className="text-sm font-semibold text-gray-800">
                                  {rev.estimated_hours} Hours
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400 block">Schedule Impact:</span>
                                <span className="text-sm font-semibold text-gray-800">
                                  +{rev.schedule_delay_days} days
                                </span>
                              </div>
                            </div>

                            {/* Scope Description */}
                            <div className="mt-3 text-xs">
                              <span className="font-semibold text-gray-700 block">Proposed Scope:</span>
                              <p className="text-gray-600 mt-1 whitespace-pre-wrap bg-white p-2.5 rounded border border-gray-200">
                                {rev.scope_description}
                              </p>
                            </div>

                            {/* Deliverables Checklist */}
                            {rev.deliverables && rev.deliverables.length > 0 && (
                              <div className="mt-3 text-xs">
                                <span className="font-semibold text-gray-700 block mb-1">
                                  Deliverables ({rev.deliverables.length}):
                                </span>
                                <div className="space-y-1">
                                  {rev.deliverables.map((d, i) => (
                                    <div
                                      key={i}
                                      className="p-2 bg-white rounded border border-gray-100 flex items-center justify-between"
                                    >
                                      <div>
                                        <div className="font-medium text-gray-800">{d.title}</div>
                                        {d.description && (
                                          <div className="text-gray-400">{d.description}</div>
                                        )}
                                      </div>
                                      {d.targetDate && (
                                        <div className="text-gray-500 font-mono text-[11px]">
                                          Target: {d.targetDate}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Internal Review Notes */}
                            {rev.internal_review_notes && (
                              <div className="mt-3 p-2.5 bg-yellow-50/70 border border-yellow-200 rounded text-xs">
                                <span className="font-bold text-yellow-900">Internal PM Review Notes:</span>
                                <p className="text-yellow-800 mt-0.5">{rev.internal_review_notes}</p>
                                <div className="text-[11px] text-yellow-600 mt-1">
                                  Reviewed by {rev.internal_reviewed_by_name} at{' '}
                                  {rev.internal_reviewed_at
                                    ? new Date(rev.internal_reviewed_at).toLocaleString()
                                    : ''}
                                </div>
                              </div>
                            )}

                            {/* Client Decision */}
                            {rev.client_decision && (
                              <div
                                className={`mt-3 p-3 rounded-lg border text-xs ${
                                  rev.client_decision === 'APPROVED'
                                    ? 'bg-green-50 border-green-200 text-green-900'
                                    : rev.client_decision === 'CHANGES_REQUESTED'
                                    ? 'bg-orange-50 border-orange-200 text-orange-900'
                                    : 'bg-red-50 border-red-200 text-red-900'
                                }`}
                              >
                                <div className="flex items-center justify-between font-bold">
                                  <span>Client Sign-Off Decision: {rev.client_decision}</span>
                                  {rev.decided_at && (
                                    <span className="text-[11px] font-normal">
                                      {new Date(rev.decided_at).toLocaleString()}
                                    </span>
                                  )}
                                </div>
                                {rev.decided_by_contact_name && (
                                  <div className="text-[11px] mt-0.5">
                                    Signed by: {rev.decided_by_contact_name} ({rev.decided_by_contact_email})
                                  </div>
                                )}
                                {rev.client_remarks && (
                                  <p className="mt-1 font-normal italic">"{rev.client_remarks}"</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Linked Delivery Tasks Section */}
                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                        <Link2 className="w-4 h-4 text-indigo-600" />
                        Linked Delivery Tasks ({selectedCr.tasks?.length || 0})
                      </h3>
                      {selectedCr.status === 'APPROVED' && (
                        <button
                          onClick={openLinkTasks}
                          className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 rounded"
                        >
                          + Link More Tasks
                        </button>
                      )}
                    </div>

                    {selectedCr.tasks && selectedCr.tasks.length > 0 ? (
                      <div className="divide-y divide-gray-100 border rounded-lg overflow-hidden bg-white">
                        {selectedCr.tasks.map((task) => (
                          <div
                            key={task.task_id}
                            className="p-3 flex items-center justify-between text-xs hover:bg-gray-50"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                                {task.task_code}
                              </span>
                              <div>
                                <span className="font-medium text-gray-900">{task.task_title}</span>
                                <div className="text-gray-400 text-[11px] flex items-center gap-2 mt-0.5">
                                  <span>Status: {task.task_status}</span>
                                  <span>•</span>
                                  <span>Assignee: {task.assignee_name || 'Unassigned'}</span>
                                  <span>•</span>
                                  <span>
                                    Hours: {task.actual_hours || 0} / {task.estimated_hours || 0}h
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {task.is_scope_addition && (
                                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  Scope Addition
                                </span>
                              )}
                              <button
                                onClick={() => handleUnlinkTask(task.task_id)}
                                className="p-1 text-gray-400 hover:text-red-600 rounded"
                                title="Unlink Task"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 bg-gray-50 p-4 rounded text-center">
                        No delivery tasks currently linked. Once approved, associate tasks to trace implementation effort against this quotation.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Change Request */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                Create Change Request (Revision 1 Quotation)
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="font-semibold text-gray-700 block mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={createForm.title}
                    onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="e.g. Export Reports to CSV & Custom Date Filtering"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Target Project</label>
                  <select
                    value={createForm.projectId}
                    onChange={(e) => setCreateForm({ ...createForm, projectId: e.target.value, productId: '' })}
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="">-- Select Project --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.project_name} ({p.project_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Or Licensed Product</label>
                  <select
                    value={createForm.productId}
                    onChange={(e) => setCreateForm({ ...createForm, productId: e.target.value, projectId: '' })}
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="">-- Select Product --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.product_name} ({p.product_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="font-semibold text-gray-700 block mb-1">Accountable PM Lead *</label>
                  <select
                    required
                    value={createForm.accountablePmUserId}
                    onChange={(e) => setCreateForm({ ...createForm, accountablePmUserId: e.target.value })}
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="">-- Designate Project Manager --</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.first_name} {u.last_name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="font-semibold text-gray-700 block mb-1">Business Justification *</label>
                  <textarea
                    required
                    rows={2}
                    value={createForm.businessJustification}
                    onChange={(e) => setCreateForm({ ...createForm, businessJustification: e.target.value })}
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="Why is this change necessary? What business problem does it solve?"
                  />
                </div>

                <div className="col-span-2">
                  <label className="font-semibold text-gray-700 block mb-1">Scope Description (Rev 1) *</label>
                  <textarea
                    required
                    rows={3}
                    value={createForm.scopeDescription}
                    onChange={(e) => setCreateForm({ ...createForm, scopeDescription: e.target.value })}
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="Detailed breakdown of work to be performed..."
                  />
                </div>

                {/* Commercials */}
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Quoted Price (Price)</label>
                  <input
                    type="number"
                    min="0"
                    value={createForm.quotedPrice}
                    onChange={(e) => setCreateForm({ ...createForm, quotedPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Currency</label>
                  <input
                    type="text"
                    value={createForm.currency}
                    onChange={(e) => setCreateForm({ ...createForm, currency: e.target.value })}
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Estimated Hours</label>
                  <input
                    type="number"
                    min="0"
                    value={createForm.estimatedHours}
                    onChange={(e) => setCreateForm({ ...createForm, estimatedHours: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Schedule Delay (Days)</label>
                  <input
                    type="number"
                    min="0"
                    value={createForm.scheduleDelayDays}
                    onChange={(e) => setCreateForm({ ...createForm, scheduleDelayDays: parseInt(e.target.value) || 0 })}
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium shadow-sm"
                >
                  Create Change Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Propose Material Revision (N+1) */}
      {showRevisionModal && selectedCr && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-600" />
                  Propose Material Revision {selectedCr.current_revision + 1}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Material edits supersede earlier revisions and require fresh client approver sign-off.
                </p>
              </div>
              <button onClick={() => setShowRevisionModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRevisionSubmit} className="space-y-4 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                <span className="font-bold">Notice: </span>
                Modifying scope or commercials creates a legally binding new revision. Revision{' '}
                {selectedCr.current_revision} will remain archived for full audit traceability.
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Reason for Revision *</label>
                <input
                  type="text"
                  required
                  value={revisionForm.revisionReason}
                  onChange={(e) => setRevisionForm({ ...revisionForm, revisionReason: e.target.value })}
                  className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. Client requested 2 additional dashboard widgets and faster delivery"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Updated Scope Description *</label>
                <textarea
                  required
                  rows={3}
                  value={revisionForm.scopeDescription}
                  onChange={(e) => setRevisionForm({ ...revisionForm, scopeDescription: e.target.value })}
                  className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Quoted Price</label>
                  <input
                    type="number"
                    min="0"
                    value={revisionForm.quotedPrice}
                    onChange={(e) => setRevisionForm({ ...revisionForm, quotedPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Estimated Hours</label>
                  <input
                    type="number"
                    min="0"
                    value={revisionForm.estimatedHours}
                    onChange={(e) => setRevisionForm({ ...revisionForm, estimatedHours: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Schedule Delay (Days)</label>
                  <input
                    type="number"
                    min="0"
                    value={revisionForm.scheduleDelayDays}
                    onChange={(e) => setRevisionForm({ ...revisionForm, scheduleDelayDays: parseInt(e.target.value) || 0 })}
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Revised Target Date</label>
                  <input
                    type="date"
                    value={revisionForm.revisedDeliveryDate}
                    onChange={(e) => setRevisionForm({ ...revisionForm, revisedDeliveryDate: e.target.value })}
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={revisionForm.submitForInternalReview}
                    onChange={(e) => setRevisionForm({ ...revisionForm, submitForInternalReview: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-gray-700">Submit directly for PM internal review upon creation</span>
                </label>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRevisionModal(false)}
                  className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium shadow-sm"
                >
                  Publish Revision {selectedCr.current_revision + 1}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: PM Internal Review */}
      {showReviewModal && selectedCr && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-600" />
                Internal PM Review (Rev {selectedCr.current_revision})
              </h3>
              <button onClick={() => setShowReviewModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Review Outcome *</label>
                <select
                  value={reviewForm.status}
                  onChange={(e) => setReviewForm({ ...reviewForm, status: e.target.value as any })}
                  className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="AWAITING_CLIENT">Approve & Publish to Client Portal (Awaiting Client)</option>
                  <option value="CHANGES_REQUESTED">Request Internal Changes from Delivery Team</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Internal Review Notes (Confidential)</label>
                <textarea
                  rows={3}
                  value={reviewForm.internalReviewNotes}
                  onChange={(e) => setReviewForm({ ...reviewForm, internalReviewNotes: e.target.value })}
                  className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Internal rationale, margins, delivery feasibility..."
                />
                <span className="text-[11px] text-gray-400 mt-1 block">
                  * Note: Internal review notes are NEVER leaked to the client portal.
                </span>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium shadow-sm"
                >
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Client Decision (Override/On Behalf) */}
      {showDecisionModal && selectedCr && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                Record Client Decision (Rev {selectedCr.current_revision})
              </h3>
              <button onClick={() => setShowDecisionModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDecisionSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Decision *</label>
                <select
                  value={decisionForm.decision}
                  onChange={(e) => setDecisionForm({ ...decisionForm, decision: e.target.value as any })}
                  className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="APPROVED">Approve (Formal Client Acceptance)</option>
                  <option value="CHANGES_REQUESTED">Changes Requested by Client</option>
                  <option value="REJECTED">Reject Change Request</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Client Remarks / Conditions</label>
                <textarea
                  rows={3}
                  value={decisionForm.remarks}
                  onChange={(e) => setDecisionForm({ ...decisionForm, remarks: e.target.value })}
                  className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Record client comments or written confirmation reference..."
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDecisionModal(false)}
                  className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium shadow-sm"
                >
                  Save Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Link Delivery Tasks */}
      {showLinkTasksModal && selectedCr && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Link2 className="w-5 h-5 text-green-600" />
                Link Delivery Tasks ({selectedCr.cr_number})
              </h3>
              <button onClick={() => setShowLinkTasksModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLinkTasksSubmit} className="space-y-4 text-xs">
              <p className="text-gray-500">
                Select tasks from {selectedCr.project_name} that fulfill this approved change request.
              </p>

              <div className="max-h-60 overflow-y-auto border rounded-lg divide-y">
                {projectTasks.map((t) => (
                  <label key={t.id} className="p-2.5 flex items-center gap-3 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTaskIds.includes(t.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTaskIds([...selectedTaskIds, t.id]);
                        } else {
                          setSelectedTaskIds(selectedTaskIds.filter((id) => id !== t.id));
                        }
                      }}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <div className="font-medium text-gray-900">
                        {t.task_code} - {t.title}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        Status: {t.status_name} • Priority: {t.priority}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isScopeAddition}
                    onChange={(e) => setIsScopeAddition(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-gray-700 font-medium">Mark as Scope Addition (Billable Extension)</span>
                </label>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLinkTasksModal(false)}
                  className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selectedTaskIds.length === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium shadow-sm disabled:opacity-50"
                >
                  Link {selectedTaskIds.length} Tasks
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
