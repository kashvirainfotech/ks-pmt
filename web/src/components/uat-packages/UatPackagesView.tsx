import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ChevronRight,
  X,
  History,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Building,
  Target,
  UserCheck,
  Send,
  Bug,
  Server,
  Layers,
  FileText,
  Clock,
  Check,
} from 'lucide-react';
import {
  uatPackagesApi,
  projectsApi,
  productsApi,
  mastersApi,
  tasksApi,
} from '../../api/endpoints';
import {
  UatPackage,
  UatPackageRevision,
  UatChecklistItem,
  Project,
  Product,
  User,
  Task,
} from '../../types';

export const UatPackagesView: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [packages, setPackages] = useState<UatPackage[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Filters
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Drawer / Selection
  const [selectedPkg, setSelectedPkg] = useState<UatPackage | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showQaReviewModal, setShowQaReviewModal] = useState(false);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);

  // Form states - Create
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    projectId: '',
    productId: '',
    environmentUrl: '',
    buildNumber: '',
    testCredentialsInstructions: '',
    targetSignoffDate: '',
    qaLeadUserId: '',
    revisionNotes: 'Initial UAT package release candidate',
    knownIssues: [{ title: '', workaround: '', severity: 'LOW' }],
    checklistItems: [
      {
        itemCode: 'CHK-01',
        title: '',
        instructions: '',
        expectedOutcome: '',
      },
    ],
  });

  // Form states - Material Revision (N+1)
  const [revisionForm, setRevisionForm] = useState({
    revisionNotes: '',
    knownIssues: [{ title: '', workaround: '', severity: 'LOW' }],
    testEvidenceUrls: [''],
    submitForInternalQa: true,
  });

  // Form states - QA Review
  const [qaReviewForm, setQaReviewForm] = useState<{
    status: 'READY_FOR_CLIENT' | 'CHANGES_REQUESTED';
    qaNotes: string;
  }>({
    status: 'READY_FOR_CLIENT',
    qaNotes: '',
  });

  // Form states - Client Decision
  const [decisionForm, setDecisionForm] = useState<{
    decision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';
    remarks: string;
  }>({
    decision: 'APPROVED',
    remarks: '',
  });

  // Form states - Record Installed Version
  const [installForm, setInstallForm] = useState({
    environmentName: 'PRODUCTION',
    notes: 'Manually verified and accepted version deployed to client environment.',
  });

  useEffect(() => {
    loadMetadata();
    loadPackages();
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

  const loadPackages = async () => {
    setLoading(true);
    try {
      const res = await uatPackagesApi.getAll({
        projectId: selectedProjectId || undefined,
        productId: selectedProductId || undefined,
        status: statusFilter || undefined,
        search: searchQuery || undefined,
      });
      setPackages(res.data.data || []);
    } catch (err) {
      console.error('Failed to load UAT packages', err);
    } finally {
      setLoading(false);
    }
  };

  const openDrawer = async (pkgId: string) => {
    setDrawerLoading(true);
    try {
      const res = await uatPackagesApi.getById(pkgId);
      setSelectedPkg(res.data);
    } catch (err) {
      console.error('Failed to load UAT package details', err);
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title || !createForm.description) {
      alert('Please fill out all required fields');
      return;
    }
    if (!createForm.projectId && !createForm.productId) {
      alert('Please select either a Project or a Product');
      return;
    }

    try {
      await uatPackagesApi.create({
        ...createForm,
        knownIssues: createForm.knownIssues.filter((k) => k.title.trim().length > 0),
        checklistItems: createForm.checklistItems.filter((i) => i.title.trim().length > 0),
      });
      setShowCreateModal(false);
      resetCreateForm();
      loadPackages();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create UAT package');
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      title: '',
      description: '',
      projectId: '',
      productId: '',
      environmentUrl: '',
      buildNumber: '',
      testCredentialsInstructions: '',
      targetSignoffDate: '',
      qaLeadUserId: '',
      revisionNotes: 'Initial UAT package release candidate',
      knownIssues: [{ title: '', workaround: '', severity: 'LOW' }],
      checklistItems: [
        {
          itemCode: 'CHK-01',
          title: '',
          instructions: '',
          expectedOutcome: '',
        },
      ],
    });
  };

  const handleRevisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg) return;
    if (!revisionForm.revisionNotes) {
      alert('Please specify the revision notes / fixes included in this candidate build');
      return;
    }

    try {
      await uatPackagesApi.createRevision(selectedPkg.id, {
        ...revisionForm,
        knownIssues: revisionForm.knownIssues.filter((k) => k.title.trim().length > 0),
        testEvidenceUrls: revisionForm.testEvidenceUrls.filter((u) => u.trim().length > 0),
      });
      setShowRevisionModal(false);
      openDrawer(selectedPkg.id);
      loadPackages();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit revision');
    }
  };

  const handleSubmitForQa = async () => {
    if (!selectedPkg) return;
    try {
      await uatPackagesApi.submitForQa(selectedPkg.id);
      openDrawer(selectedPkg.id);
      loadPackages();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit for QA review');
    }
  };

  const handleQaReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg) return;
    try {
      await uatPackagesApi.reviewRevisionQa(
        selectedPkg.id,
        selectedPkg.current_revision,
        qaReviewForm,
      );
      setShowQaReviewModal(false);
      openDrawer(selectedPkg.id);
      loadPackages();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record QA review');
    }
  };

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg) return;
    try {
      await uatPackagesApi.recordDecision(
        selectedPkg.id,
        selectedPkg.current_revision,
        decisionForm,
      );
      setShowDecisionModal(false);
      openDrawer(selectedPkg.id);
      loadPackages();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record decision');
    }
  };

  const handleItemProgressUpdate = async (
    itemId: string,
    updates: { developerDone?: boolean; qaVerified?: boolean },
  ) => {
    if (!selectedPkg) return;
    try {
      await uatPackagesApi.updateChecklistItem(itemId, updates);
      openDrawer(selectedPkg.id);
      loadPackages();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update checklist item');
    }
  };

  const handleRecordInstalledVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg) return;

    // Resolve client ID from project
    const proj = projects.find((p) => p.id === selectedPkg.project_id);
    const clientId = proj?.client_id;
    if (!clientId) {
      alert('Cannot resolve client organization from project.');
      return;
    }
    if (!selectedPkg.version_id) {
      alert('Please link a formal software version to this package before recording installed deployment.');
      return;
    }

    try {
      await uatPackagesApi.recordInstalledVersion({
        clientId,
        projectId: selectedPkg.project_id,
        productId: selectedPkg.product_id,
        versionId: selectedPkg.version_id,
        environmentName: installForm.environmentName,
        uatPackageId: selectedPkg.id,
        notes: installForm.notes,
      });
      alert('Client installed version successfully recorded!');
      setShowInstallModal(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record installed version');
    }
  };

  // KPIs
  const totalPackages = packages.length;
  const readyForClientCount = packages.filter((p) => p.status === 'READY_FOR_CLIENT').length;
  const acceptedCount = packages.filter((p) => p.status === 'ACCEPTED').length;
  const inQaCount = packages.filter((p) => p.status === 'INTERNAL_QA').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-gray-100 text-gray-700">Draft</span>;
      case 'INTERNAL_QA':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-100 text-amber-800">Internal QA</span>;
      case 'READY_FOR_CLIENT':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-800 animate-pulse">Ready for Client</span>;
      case 'ACCEPTED':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-green-100 text-green-800 font-bold">Accepted</span>;
      case 'CHANGES_REQUESTED':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-orange-100 text-orange-800">Changes Requested</span>;
      case 'REJECTED':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-red-100 text-red-800">Rejected</span>;
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
            <ClipboardCheck className="w-7 h-7 text-indigo-600" />
            Client UAT Packages & Milestone Acceptance
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Tri-state verification (Developer Done $\to$ QA Verified $\to$ Client Accepted), formal UAT packages, known issues, and material revision sign-offs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              loadPackages();
              if (selectedPkg) openDrawer(selectedPkg.id);
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
            New UAT Package
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500 font-medium">Total UAT Packages</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{totalPackages}</div>
          <div className="text-xs text-gray-400 mt-1">Release candidates prepared</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm bg-amber-50/20">
          <div className="text-sm text-amber-700 font-medium">Internal QA Verification</div>
          <div className="text-2xl font-bold text-amber-900 mt-1">{inQaCount}</div>
          <div className="text-xs text-amber-600 mt-1">Gate checks prior to client release</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm bg-blue-50/20">
          <div className="text-sm text-blue-700 font-medium">Active in Client UAT</div>
          <div className="text-2xl font-bold text-blue-900 mt-1">{readyForClientCount}</div>
          <div className="text-xs text-blue-500 mt-1">Awaiting client tester sign-off</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-green-200 shadow-sm bg-green-50/20">
          <div className="text-sm text-green-700 font-medium">Accepted Packages</div>
          <div className="text-2xl font-bold text-green-900 mt-1">{acceptedCount}</div>
          <div className="text-xs text-green-600 mt-1">Formal milestone sign-offs recorded</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by package code, title, build..."
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
            <option value="INTERNAL_QA">Internal QA</option>
            <option value="READY_FOR_CLIENT">Ready for Client</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="CHANGES_REQUESTED">Changes Requested</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* UAT Packages Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading UAT packages...</div>
        ) : packages.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <div className="text-base font-medium text-gray-700">No UAT Packages Found</div>
            <p className="text-sm text-gray-400 mt-1">Prepare your first candidate build UAT package.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Package Code / Title</th>
                  <th className="py-3 px-4">Container & Milestone</th>
                  <th className="py-3 px-4">Version & Build</th>
                  <th className="py-3 px-4">Active Rev</th>
                  <th className="py-3 px-4">Tri-State Progress</th>
                  <th className="py-3 px-4">Target Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {packages.map((pkg) => (
                  <tr
                    key={pkg.id}
                    className="hover:bg-indigo-50/40 transition cursor-pointer"
                    onClick={() => openDrawer(pkg.id)}
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-indigo-600">{pkg.package_code}</div>
                      <div className="font-medium text-gray-900 mt-0.5">{pkg.title}</div>
                    </td>
                    <td className="py-3 px-4">
                      {pkg.project_name ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          <Building className="w-3 h-3" />
                          {pkg.project_name}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                          <Target className="w-3 h-3" />
                          {pkg.product_name}
                        </span>
                      )}
                      {pkg.milestone_name && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          Milestone: {pkg.milestone_name}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      <div className="font-semibold">{pkg.version_name || 'Unversioned'}</div>
                      {pkg.build_number && (
                        <div className="text-xs text-gray-400 font-mono">Build: {pkg.build_number}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded font-semibold text-xs border">
                        Rev {pkg.current_revision}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-xs space-y-1 min-w-[130px]">
                        <div className="flex justify-between text-[11px] text-gray-500">
                          <span>Items: {pkg.total_checklist_items || 0}</span>
                          <span className="text-green-600 font-medium">
                            Passed: {pkg.client_passed_items || 0}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 flex overflow-hidden">
                          <div
                            style={{
                              width: `${
                                pkg.total_checklist_items
                                  ? ((pkg.client_passed_items || 0) / pkg.total_checklist_items) * 100
                                  : 0
                              }%`,
                            }}
                            className="bg-green-500 h-1.5"
                            title="Client Passed"
                          />
                          <div
                            style={{
                              width: `${
                                pkg.total_checklist_items
                                  ? ((pkg.qa_verified_items || 0) / pkg.total_checklist_items) * 100
                                  : 0
                              }%`,
                            }}
                            className="bg-amber-400 h-1.5"
                            title="QA Verified"
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-700 text-xs">
                      {pkg.target_signoff_date
                        ? new Date(pkg.target_signoff_date).toLocaleDateString()
                        : 'No deadline'}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(pkg.status)}</td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openDrawer(pkg.id)}
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

      {/* Slide-Over Package Detail Drawer */}
      {selectedPkg && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200">
                    {selectedPkg.package_code}
                  </span>
                  {getStatusBadge(selectedPkg.status)}
                  <span className="text-xs font-semibold bg-gray-200 text-gray-800 px-2 py-0.5 rounded">
                    Rev {selectedPkg.current_revision}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-gray-900 mt-1">{selectedPkg.title}</h2>
              </div>
              <button
                onClick={() => setSelectedPkg(null)}
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
                      Lifecycle Actions for Rev {selectedPkg.current_revision}:
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {(selectedPkg.status === 'DRAFT' || selectedPkg.status === 'CHANGES_REQUESTED') && (
                        <button
                          onClick={handleSubmitForQa}
                          className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-semibold hover:bg-indigo-700 shadow-xs flex items-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Submit for QA Gate Check
                        </button>
                      )}

                      {selectedPkg.status === 'INTERNAL_QA' && (
                        <button
                          onClick={() => setShowQaReviewModal(true)}
                          className="px-3 py-1.5 bg-amber-600 text-white rounded text-xs font-semibold hover:bg-amber-700 shadow-xs flex items-center gap-1.5"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          Complete QA Readiness Review
                        </button>
                      )}

                      {selectedPkg.status === 'READY_FOR_CLIENT' && (
                        <button
                          onClick={() => setShowDecisionModal(true)}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 shadow-xs flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Record Client Decision (Override)
                        </button>
                      )}

                      <button
                        onClick={() => setShowRevisionModal(true)}
                        className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded text-xs font-semibold hover:bg-gray-50 shadow-xs flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5 text-indigo-600" />
                        Propose Material Revision (Rev {selectedPkg.current_revision + 1})
                      </button>

                      {selectedPkg.status === 'ACCEPTED' && (
                        <button
                          onClick={() => setShowInstallModal(true)}
                          className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700 shadow-xs flex items-center gap-1.5"
                        >
                          <Server className="w-3.5 h-3.5" />
                          Record as Installed Version (SRS §3.24)
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Deployment Environment Box */}
                  <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div>
                      <span className="text-gray-400 block">Test Environment:</span>
                      {selectedPkg.environment_url ? (
                        <a
                          href={selectedPkg.environment_url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-indigo-600 hover:underline flex items-center gap-1 mt-0.5"
                        >
                          {selectedPkg.environment_url}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-gray-500 italic">No URL provided</span>
                      )}
                    </div>
                    <div>
                      <span className="text-gray-400 block">Build / Commit Stamp:</span>
                      <span className="font-mono font-semibold text-gray-800">
                        {selectedPkg.build_number || 'N/A'}
                      </span>
                    </div>
                    {selectedPkg.test_credentials_instructions && (
                      <div className="col-span-2 pt-2 border-t border-gray-200">
                        <span className="text-gray-400 block font-medium">Test Credentials & Instructions:</span>
                        <p className="text-gray-700 mt-1 whitespace-pre-wrap">
                          {selectedPkg.test_credentials_instructions}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Tri-State Checklist Manager */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                        <ClipboardCheck className="w-4 h-4 text-indigo-600" />
                        UAT Acceptance Checklist (Tri-State Verification)
                      </h3>
                      <span className="text-xs text-gray-500">
                        Developer Done $\to$ QA Verified $\to$ Client Accepted
                      </span>
                    </div>

                    {selectedPkg.revisions && selectedPkg.revisions.length > 0 && (
                      (() => {
                        const currentRev = selectedPkg.revisions.find(
                          (r) => r.revision_number === selectedPkg.current_revision,
                        ) || selectedPkg.revisions[0];

                        return (
                          <div className="space-y-3">
                            <div className="divide-y divide-gray-100 border rounded-xl overflow-hidden bg-white">
                              {currentRev.checklistItems && currentRev.checklistItems.length > 0 ? (
                                currentRev.checklistItems.map((item) => (
                                  <div key={item.id} className="p-4 space-y-2 text-xs hover:bg-gray-50">
                                    <div className="flex items-start justify-between">
                                      <div>
                                        <span className="font-mono font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded mr-2">
                                          {item.item_code}
                                        </span>
                                        <span className="font-bold text-gray-900">{item.title}</span>
                                        {item.criteria_code && (
                                          <span className="text-[11px] text-gray-400 ml-2">
                                            (Linked to Criterion: {item.criteria_code})
                                          </span>
                                        )}
                                      </div>
                                      {/* Tri-State Controls */}
                                      <div className="flex items-center gap-3">
                                        {/* 1. Developer Done */}
                                        <button
                                          onClick={() =>
                                            handleItemProgressUpdate(item.id, {
                                              developerDone: !item.developer_done,
                                            })
                                          }
                                          className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition ${
                                            item.developer_done
                                              ? 'bg-blue-100 text-blue-800'
                                              : 'bg-gray-100 text-gray-400 hover:text-gray-700'
                                          }`}
                                          title="Developer Done"
                                        >
                                          <Check className="w-3 h-3" />
                                          Dev Done
                                        </button>

                                        {/* 2. QA Verified */}
                                        <button
                                          onClick={() =>
                                            handleItemProgressUpdate(item.id, {
                                              qaVerified: !item.qa_verified,
                                            })
                                          }
                                          className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition ${
                                            item.qa_verified
                                              ? 'bg-amber-100 text-amber-800'
                                              : 'bg-gray-100 text-gray-400 hover:text-gray-700'
                                          }`}
                                          title="QA Verified"
                                        >
                                          <Check className="w-3 h-3" />
                                          QA Verified
                                        </button>

                                        {/* 3. Client Status */}
                                        <span
                                          className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                                            item.client_status === 'PASSED'
                                              ? 'bg-green-100 text-green-800'
                                              : item.client_status === 'FAILED'
                                              ? 'bg-red-100 text-red-800'
                                              : 'bg-gray-100 text-gray-500'
                                          }`}
                                        >
                                          Client: {item.client_status}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-gray-600 bg-gray-50 p-2.5 rounded border border-gray-100">
                                      <div>
                                        <span className="font-semibold text-gray-500 block">Instructions:</span>
                                        <p>{item.instructions}</p>
                                      </div>
                                      <div>
                                        <span className="font-semibold text-gray-500 block">Expected Outcome:</span>
                                        <p>{item.expected_outcome}</p>
                                      </div>
                                    </div>

                                    {item.client_feedback && (
                                      <div className="p-2 bg-red-50 text-red-900 border border-red-200 rounded text-[11px]">
                                        <span className="font-bold">Client Feedback: </span>
                                        {item.client_feedback}
                                      </div>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <p className="p-6 text-center text-gray-400">No checklist items defined.</p>
                              )}
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </div>

                  {/* Disclosed Known Issues */}
                  <div className="space-y-3 pt-3 border-t">
                    <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                      <Bug className="w-4 h-4 text-amber-600" />
                      Disclosed Known Issues (Transparent Release Disclosure)
                    </h3>
                    {selectedPkg.revisions &&
                    selectedPkg.revisions[0]?.known_issues &&
                    selectedPkg.revisions[0].known_issues.length > 0 ? (
                      <div className="space-y-1.5">
                        {selectedPkg.revisions[0].known_issues.map((ki, i) => (
                          <div key={i} className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs">
                            <div className="flex items-center justify-between font-bold text-amber-900">
                              <span>{ki.title}</span>
                              <span className="text-[11px] bg-amber-200 px-2 py-0.5 rounded">{ki.severity}</span>
                            </div>
                            {ki.workaround && (
                              <div className="text-amber-800 text-[11px] mt-0.5">
                                Workaround: {ki.workaround}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 bg-gray-50 p-3 rounded">
                        No known issues disclosed for this release candidate.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: New UAT Package */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                Create UAT Package (Release Candidate)
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
                    placeholder="e.g. Release 2.4.0 Candidate - Core Billing & Exports"
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
                  <label className="font-semibold text-gray-700 block mb-1">Description *</label>
                  <textarea
                    required
                    rows={2}
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Environment URL</label>
                  <input
                    type="url"
                    value={createForm.environmentUrl}
                    onChange={(e) => setCreateForm({ ...createForm, environmentUrl: e.target.value })}
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="https://uat.client.acmefintech.com"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Build / Commit Stamp</label>
                  <input
                    type="text"
                    value={createForm.buildNumber}
                    onChange={(e) => setCreateForm({ ...createForm, buildNumber: e.target.value })}
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="v2.4.0-rc3"
                  />
                </div>

                <div className="col-span-2">
                  <label className="font-semibold text-gray-700 block mb-1">Test Credentials & Instructions</label>
                  <textarea
                    rows={2}
                    value={createForm.testCredentialsInstructions}
                    onChange={(e) => setCreateForm({ ...createForm, testCredentialsInstructions: e.target.value })}
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="e.g. Login with client.test@example.com / Password123!"
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
                  Create UAT Package
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: QA Review */}
      {showQaReviewModal && selectedPkg && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-600" />
                QA Readiness Review (Rev {selectedPkg.current_revision})
              </h3>
              <button onClick={() => setShowQaReviewModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQaReviewSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">QA Readiness Outcome *</label>
                <select
                  value={qaReviewForm.status}
                  onChange={(e) => setQaReviewForm({ ...qaReviewForm, status: e.target.value as any })}
                  className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="READY_FOR_CLIENT">Pass QA & Publish to Client Portal (Ready for Client)</option>
                  <option value="CHANGES_REQUESTED">Fail QA & Return to Development Team</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">QA Notes (Confidential)</label>
                <textarea
                  rows={3}
                  value={qaReviewForm.qaNotes}
                  onChange={(e) => setQaReviewForm({ ...qaReviewForm, qaNotes: e.target.value })}
                  className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Verification summary, automated suite runs, sanity check results..."
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowQaReviewModal(false)}
                  className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium shadow-sm"
                >
                  Submit QA Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Client Decision (Override/On Behalf) */}
      {showDecisionModal && selectedPkg && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                Record Client Decision (Rev {selectedPkg.current_revision})
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
                  <option value="APPROVED">Approve (Formal Client UAT Acceptance)</option>
                  <option value="CHANGES_REQUESTED">Changes Requested by Client</option>
                  <option value="REJECTED">Reject UAT Package</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Client Remarks / Attributable Notes</label>
                <textarea
                  rows={3}
                  value={decisionForm.remarks}
                  onChange={(e) => setDecisionForm({ ...decisionForm, remarks: e.target.value })}
                  className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Record client comments or written sign-off document reference..."
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

      {/* Modal: Record Installed Version (SRS §3.24) */}
      {showInstallModal && selectedPkg && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Server className="w-5 h-5 text-emerald-600" />
                Record Client Installed Version (SRS §3.24)
              </h3>
              <button onClick={() => setShowInstallModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordInstalledVersion} className="space-y-4 text-xs">
              <p className="text-gray-500">
                Record the client-specific installed/accepted version manually. Releasing a product version does not assume installation until formally recorded here.
              </p>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Environment *</label>
                <select
                  value={installForm.environmentName}
                  onChange={(e) => setInstallForm({ ...installForm, environmentName: e.target.value })}
                  className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="PRODUCTION">Production Environment</option>
                  <option value="STAGING">Staging Environment</option>
                  <option value="UAT">Dedicated UAT Environment</option>
                  <option value="ON_PREMISE">Client On-Premise Installation</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Deployment Notes</label>
                <textarea
                  rows={3}
                  value={installForm.notes}
                  onChange={(e) => setInstallForm({ ...installForm, notes: e.target.value })}
                  className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowInstallModal(false)}
                  className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium shadow-sm"
                >
                  Save Installed Version
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
