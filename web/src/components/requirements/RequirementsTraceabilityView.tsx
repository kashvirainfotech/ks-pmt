import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Layers,
  Link2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ChevronRight,
  X,
  History,
  Lock,
  ExternalLink,
  RefreshCw,
  Eye,
  Check,
  Building,
  Target,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import {
  requirementsApi,
  projectsApi,
  productsApi,
  clientIntakeApi,
  tasksApi,
} from '../../api/endpoints';
import {
  RequirementSpecification,
  RequirementAcceptanceCriterion,
  RequirementBaseline,
  TraceabilityMatrixResponse,
  Project,
  Product,
  ClientIntakeRequest,
  Task,
} from '../../types';

export const RequirementsTraceabilityView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'requirements' | 'matrix'>('requirements');
  const [loading, setLoading] = useState(false);
  const [requirements, setRequirements] = useState<RequirementSpecification[]>([]);
  const [matrixData, setMatrixData] = useState<TraceabilityMatrixResponse | null>(null);

  // Filters
  const [projects, setProjects] = useState<Project[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [baselinedFilter, setBaselinedFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Detail Drawer
  const [selectedReq, setSelectedReq] = useState<RequirementSpecification | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBaselineModal, setShowBaselineModal] = useState(false);
  const [showAddCriteriaModal, setShowAddCriteriaModal] = useState(false);
  const [showLinkTasksModal, setShowLinkTasksModal] = useState(false);
  const [showQaModal, setShowQaModal] = useState(false);
  const [activeCriterion, setActiveCriterion] = useState<RequirementAcceptanceCriterion | null>(null);

  // Form states
  const [newReq, setNewReq] = useState({
    scopeType: 'PROJECT' as 'PROJECT' | 'PRODUCT',
    projectId: '',
    productId: '',
    title: '',
    moduleName: '',
    businessObjective: '',
    inScope: '',
    outOfScope: '',
    assumptions: '',
    originatingRequestId: '',
    isClientVisible: true,
  });

  const [baselineForm, setBaselineForm] = useState({
    baselineName: '',
    notes: '',
  });

  const [criteriaForm, setCriteriaForm] = useState({
    criteriaCode: '',
    title: '',
    description: '',
    verificationMethod: 'MANUAL_TEST' as 'MANUAL_TEST' | 'DEMO' | 'DOCUMENTATION' | 'AUTOMATED',
    orderIndex: 1,
  });

  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [intakeRequests, setIntakeRequests] = useState<ClientIntakeRequest[]>([]);

  const [qaForm, setQaForm] = useState({
    status: 'VERIFIED_QA' as 'VERIFIED_QA' | 'IMPLEMENTED' | 'WAIVED',
    evidenceNotes: '',
    evidenceUrlTitle: '',
    evidenceUrl: '',
    verificationMethod: 'MANUAL_TEST' as 'MANUAL_TEST' | 'DEMO' | 'DOCUMENTATION' | 'AUTOMATED',
  });

  useEffect(() => {
    loadProjectsAndProducts();
  }, []);

  useEffect(() => {
    if (activeTab === 'requirements') {
      loadRequirements();
    } else {
      loadMatrix();
    }
  }, [activeTab, selectedProjectId, selectedProductId, statusFilter, baselinedFilter]);

  const loadProjectsAndProducts = async () => {
    try {
      const [projRes, prodRes] = await Promise.all([
        projectsApi.getProjects(),
        productsApi.getProducts(),
      ]);
      setProjects(projRes.data || []);
      setProducts(prodRes.data || []);
    } catch (err) {
      console.error('Failed to load projects/products', err);
    }
  };

  const loadRequirements = async () => {
    setLoading(true);
    try {
      const res = await requirementsApi.getRequirements({
        projectId: selectedProjectId || undefined,
        productId: selectedProductId || undefined,
        status: statusFilter || undefined,
        isBaselined: baselinedFilter === 'true' ? true : baselinedFilter === 'false' ? false : undefined,
        search: searchQuery || undefined,
      });
      setRequirements(res.data || []);
    } catch (err) {
      console.error('Failed to load requirements', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMatrix = async () => {
    setLoading(true);
    try {
      const res = await requirementsApi.getTraceabilityMatrix({
        projectId: selectedProjectId || undefined,
        productId: selectedProductId || undefined,
      });
      setMatrixData(res.data);
    } catch (err) {
      console.error('Failed to load traceability matrix', err);
    } finally {
      setLoading(false);
    }
  };

  const openDrawer = async (reqId: string) => {
    setDrawerLoading(true);
    try {
      const res = await requirementsApi.getById(reqId);
      setSelectedReq(res.data);
    } catch (err) {
      console.error('Failed to load requirement details', err);
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleCreateRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReq.title || !newReq.businessObjective) return;
    if (newReq.scopeType === 'PROJECT' && !newReq.projectId) return;
    if (newReq.scopeType === 'PRODUCT' && !newReq.productId) return;

    try {
      await requirementsApi.create({
        title: newReq.title,
        businessObjective: newReq.businessObjective,
        projectId: newReq.scopeType === 'PROJECT' ? newReq.projectId : undefined,
        productId: newReq.scopeType === 'PRODUCT' ? newReq.productId : undefined,
        moduleName: newReq.moduleName || undefined,
        inScope: newReq.inScope || undefined,
        outOfScope: newReq.outOfScope || undefined,
        assumptions: newReq.assumptions || undefined,
        originatingRequestId: newReq.originatingRequestId || undefined,
        isClientVisible: newReq.isClientVisible,
      });
      setShowCreateModal(false);
      setNewReq({
        scopeType: 'PROJECT',
        projectId: '',
        productId: '',
        title: '',
        moduleName: '',
        businessObjective: '',
        inScope: '',
        outOfScope: '',
        assumptions: '',
        originatingRequestId: '',
        isClientVisible: true,
      });
      loadRequirements();
    } catch (err) {
      console.error('Failed to create requirement', err);
    }
  };

  const handleBaseline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq || !baselineForm.baselineName) return;

    try {
      await requirementsApi.baseline(selectedReq.id, baselineForm);
      setShowBaselineModal(false);
      setBaselineForm({ baselineName: '', notes: '' });
      openDrawer(selectedReq.id);
      loadRequirements();
    } catch (err) {
      console.error('Failed to baseline requirement', err);
    }
  };

  const handleProposeAmendment = async () => {
    if (!selectedReq) return;
    if (!window.confirm('Propose a new amendment? This will increment the revision and mark it as AMENDED while preserving the current baseline snapshot.')) {
      return;
    }

    try {
      await requirementsApi.proposeAmendment(selectedReq.id);
      openDrawer(selectedReq.id);
      loadRequirements();
    } catch (err) {
      console.error('Failed to propose amendment', err);
    }
  };

  const handleAddCriteria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq || !criteriaForm.title || !criteriaForm.description) return;

    try {
      await requirementsApi.addCriterion(selectedReq.id, {
        criteriaCode: criteriaForm.criteriaCode || undefined,
        title: criteriaForm.title,
        description: criteriaForm.description,
        verificationMethod: criteriaForm.verificationMethod,
        orderIndex: criteriaForm.orderIndex,
      });
      setShowAddCriteriaModal(false);
      setCriteriaForm({
        criteriaCode: '',
        title: '',
        description: '',
        verificationMethod: 'MANUAL_TEST',
        orderIndex: 1,
      });
      openDrawer(selectedReq.id);
      loadRequirements();
    } catch (err) {
      console.error('Failed to add criterion', err);
    }
  };

  const openLinkTasks = async (criterion: RequirementAcceptanceCriterion) => {
    setActiveCriterion(criterion);
    setSelectedTaskIds(criterion.linked_tasks?.map((t) => t.id) || []);
    setShowLinkTasksModal(true);

    try {
      const res = await tasksApi.getTasks({
        projectId: selectedReq?.project_id,
        productId: selectedReq?.product_id,
        limit: 100,
      });
      setAvailableTasks(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load project tasks', err);
    }
  };

  const handleSaveLinkedTasks = async () => {
    if (!activeCriterion) return;
    try {
      await requirementsApi.linkTasks(activeCriterion.id, { taskIds: selectedTaskIds });
      setShowLinkTasksModal(false);
      if (selectedReq) openDrawer(selectedReq.id);
    } catch (err) {
      console.error('Failed to link tasks', err);
    }
  };

  const handleUnlinkTask = async (criterionId: string, taskId: string) => {
    try {
      await requirementsApi.unlinkTask(criterionId, taskId);
      if (selectedReq) openDrawer(selectedReq.id);
    } catch (err) {
      console.error('Failed to unlink task', err);
    }
  };

  const openQaVerification = (criterion: RequirementAcceptanceCriterion) => {
    setActiveCriterion(criterion);
    setQaForm({
      status: 'VERIFIED_QA',
      evidenceNotes: criterion.qa_evidence_notes || '',
      evidenceUrlTitle: '',
      evidenceUrl: '',
      verificationMethod: criterion.verification_method || 'MANUAL_TEST',
    });
    setShowQaModal(true);
  };

  const handleSaveQaVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCriterion) return;

    try {
      const urls = activeCriterion.qa_evidence_urls || [];
      if (qaForm.evidenceUrl) {
        urls.push({
          title: qaForm.evidenceUrlTitle || 'QA Evidence',
          url: qaForm.evidenceUrl,
          uploadedAt: new Date().toISOString(),
        });
      }

      await requirementsApi.recordQaVerification(activeCriterion.id, {
        status: qaForm.status,
        evidenceNotes: qaForm.evidenceNotes,
        evidenceUrls: urls,
        verificationMethod: qaForm.verificationMethod,
      });

      setShowQaModal(false);
      if (selectedReq) openDrawer(selectedReq.id);
      loadRequirements();
    } catch (err) {
      console.error('Failed to record QA verification', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'BASELINED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"><Lock className="w-3 h-3 mr-1" /> Baselined</span>;
      case 'PROPOSED':
      case 'AMENDED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"><History className="w-3 h-3 mr-1" /> Amended (v{selectedReq?.version})</span>;
      case 'REVIEWED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">Reviewed</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">Draft</span>;
    }
  };

  const getImplBadge = (impl: string) => {
    switch (impl) {
      case 'ACCEPTED_CLIENT':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"><CheckCircle2 className="w-3 h-3 mr-1" /> Accepted</span>;
      case 'VERIFIED_QA':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"><ShieldCheck className="w-3 h-3 mr-1" /> QA Verified</span>;
      case 'IMPLEMENTED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300">Implemented</span>;
      case 'IN_PROGRESS':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"><Clock className="w-3 h-3 mr-1" /> In Progress</span>;
      case 'WAIVED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400">Waived</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">Not Started</span>;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Requirements & Traceability
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300">
              CLIENT-003
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Maintain versioned briefs, measurable acceptance criteria, frozen baselines, delivery task linking, QA evidence, and client acceptance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Requirement
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('requirements')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'requirements'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Requirement Specifications ({requirements.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'matrix'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Traceability Matrix & Coverage Gaps
            </div>
          </button>
        </nav>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Project Filter */}
          <select
            value={selectedProjectId}
            onChange={(e) => {
              setSelectedProjectId(e.target.value);
              setSelectedProductId('');
            }}
            className="text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_name} ({p.project_code})
              </option>
            ))}
          </select>

          {/* Product Filter */}
          <select
            value={selectedProductId}
            onChange={(e) => {
              setSelectedProductId(e.target.value);
              setSelectedProjectId('');
            }}
            className="text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.product_name} ({p.product_code})
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PROPOSED">Proposed</option>
            <option value="REVIEWED">Reviewed</option>
            <option value="BASELINED">Baselined</option>
            <option value="AMENDED">Amended</option>
          </select>

          {/* Baselined Filter */}
          <select
            value={baselinedFilter}
            onChange={(e) => setBaselinedFilter(e.target.value)}
            className="text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100"
          >
            <option value="">Baseline State (Any)</option>
            <option value="true">Baselined Only</option>
            <option value="false">Unbaselined / Draft Only</option>
          </select>

          {activeTab === 'requirements' && (
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search code, title, objective..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadRequirements()}
                className="w-full text-xs pl-8 pr-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100"
              />
            </div>
          )}
        </div>

        <button
          onClick={activeTab === 'requirements' ? loadRequirements : loadMatrix}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tab 1: Requirements Listing */}
      {activeTab === 'requirements' && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-sm text-gray-500">Loading requirements...</div>
          ) : requirements.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-10 h-10 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-700 dark:text-gray-300 font-medium">No requirement specifications found</p>
              <p className="text-xs text-gray-500 mt-1">Create a new requirement to define scope, criteria, and baselines.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <th className="py-3 px-4">Req Code</th>
                    <th className="py-3 px-4">Title & Objective</th>
                    <th className="py-3 px-4">Context</th>
                    <th className="py-3 px-4">Version / Status</th>
                    <th className="py-3 px-4 text-center">Criteria</th>
                    <th className="py-3 px-4 text-center">Tasks</th>
                    <th className="py-3 px-4 text-center">QA %</th>
                    <th className="py-3 px-4 text-center">Client %</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {requirements.map((r) => {
                    const totalCrit = r.total_criteria || 0;
                    const qaCrit = r.qa_verified_criteria || 0;
                    const clientCrit = r.client_accepted_criteria || 0;
                    const qaPct = totalCrit > 0 ? Math.round((qaCrit / totalCrit) * 100) : 0;
                    const clientPct = totalCrit > 0 ? Math.round((clientCrit / totalCrit) * 100) : 0;

                    return (
                      <tr
                        key={r.id}
                        onClick={() => openDrawer(r.id)}
                        className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {r.req_code}
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">{r.title}</p>
                          <p className="text-gray-500 dark:text-gray-400 line-clamp-1">{r.business_objective}</p>
                          {r.originating_request_number && (
                            <span className="inline-block mt-1 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">
                              Intake: {r.originating_request_number}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {r.project_name ? (
                            <div>
                              <span className="font-medium text-gray-800 dark:text-gray-200">{r.project_name}</span>
                              <span className="block text-[10px] text-gray-400 font-mono">{r.project_code}</span>
                            </div>
                          ) : (
                            <div>
                              <span className="font-medium text-emerald-700 dark:text-emerald-300">{r.product_name}</span>
                              <span className="block text-[10px] text-gray-400 font-mono">{r.product_code}</span>
                            </div>
                          )}
                          {r.module_name && (
                            <span className="text-[10px] text-gray-500">Module: {r.module_name}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 space-y-1">
                          <div>{getStatusBadge(r.status)}</div>
                          <span className="text-[10px] text-gray-400 font-mono block">Revision v{r.version}</span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold">
                          {r.total_criteria || 0}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-indigo-600 dark:text-indigo-400">
                          {r.linked_tasks_count || 0}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            qaPct === 100
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                          }`}>
                            {qaPct}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            clientPct === 100
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                          }`}>
                            {clientPct}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <ChevronRight className="w-4 h-4 text-gray-400 inline" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Traceability Matrix & Coverage Gaps */}
      {activeTab === 'matrix' && matrixData && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
              <span className="text-xs text-gray-500 font-medium">Requirements</span>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                {matrixData.summary.totalRequirements}
              </p>
              <span className="text-[10px] text-emerald-600 font-medium">
                {matrixData.summary.baselinedRequirements} baselined
              </span>
            </div>

            <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
              <span className="text-xs text-gray-500 font-medium">Acceptance Criteria</span>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                {matrixData.summary.totalCriteria}
              </p>
              <span className="text-[10px] text-gray-400">Total measurable goals</span>
            </div>

            <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
              <span className="text-xs text-gray-500 font-medium">Delivery Coverage</span>
              <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                {matrixData.summary.implementationCoveragePct}%
              </p>
              <span className="text-[10px] text-gray-400">
                {matrixData.summary.implementedCount}/{matrixData.summary.totalCriteria} with tasks
              </span>
            </div>

            <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
              <span className="text-xs text-gray-500 font-medium">QA Verification</span>
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {matrixData.summary.qaCoveragePct}%
              </p>
              <span className="text-[10px] text-gray-400">
                {matrixData.summary.qaVerifiedCount}/{matrixData.summary.totalCriteria} tested
              </span>
            </div>

            <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
              <span className="text-xs text-gray-500 font-medium">Client Acceptance</span>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {matrixData.summary.clientAcceptedPct}%
              </p>
              <span className="text-[10px] text-gray-400">
                {matrixData.summary.clientAcceptedCount}/{matrixData.summary.totalCriteria} signed-off
              </span>
            </div>

            <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
              <span className="text-xs text-gray-500 font-medium">Traceability Gaps</span>
              <p className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                {matrixData.gaps.unimplementedCriteria.length + matrixData.gaps.unverifiedCriteria.length}
              </p>
              <span className="text-[10px] text-rose-500">Unimplemented or unverified</span>
            </div>
          </div>

          {/* Gaps Alert Radar */}
          {(matrixData.gaps.unimplementedCriteria.length > 0 || matrixData.gaps.unverifiedCriteria.length > 0) && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-xs">
                <AlertTriangle className="w-4 h-4" />
                Coverage Gaps Identified ({matrixData.gaps.unimplementedCriteria.length} missing delivery tasks, {matrixData.gaps.unverifiedCriteria.length} missing QA evidence)
              </div>
              <div className="flex flex-wrap gap-2 text-[11px]">
                {matrixData.gaps.unimplementedCriteria.slice(0, 5).map((g) => (
                  <span
                    key={g.criterionId}
                    onClick={() => openDrawer(g.requirementId)}
                    className="cursor-pointer bg-white dark:bg-gray-900 px-2 py-1 rounded border border-amber-300 dark:border-amber-700 text-gray-700 dark:text-gray-300 hover:border-indigo-500"
                  >
                    Missing Task: <strong className="font-mono">{g.criteriaCode}</strong> ({g.reqCode})
                  </span>
                ))}
                {matrixData.gaps.unimplementedCriteria.length > 5 && (
                  <span className="px-2 py-1 text-gray-500">
                    +{matrixData.gaps.unimplementedCriteria.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* End-to-End Matrix Table */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                  Complete End-to-End Traceability Matrix
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Trace intake request &rarr; functional requirement &rarr; acceptance criterion &rarr; delivery tasks &rarr; QA verification &rarr; client sign-off.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <th className="py-3 px-4">Intake</th>
                    <th className="py-3 px-4">Requirement</th>
                    <th className="py-3 px-4">Acceptance Criterion</th>
                    <th className="py-3 px-4">Linked Delivery Tasks</th>
                    <th className="py-3 px-4">QA Status</th>
                    <th className="py-3 px-4">Client Sign-Off</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {matrixData.traceability.map((row, idx) => (
                    <tr key={`${row.requirement_id}-${row.criterion_id || idx}`} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="py-3 px-4 max-w-[120px]">
                        {row.originating_request_number ? (
                          <span className="font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded text-[11px]">
                            {row.originating_request_number}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">Direct brief</span>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <span
                          onClick={() => openDrawer(row.requirement_id)}
                          className="font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                        >
                          {row.req_code}
                        </span>
                        <p className="font-medium text-gray-900 dark:text-white line-clamp-1">{row.requirement_title}</p>
                        <span className="text-[10px] text-gray-400">
                          v{row.requirement_version} &bull; {row.is_baselined ? 'Baselined' : 'Draft'}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        {row.criteria_code ? (
                          <div>
                            <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">
                              {row.criteria_code}
                            </span>
                            <p className="text-gray-600 dark:text-gray-400 line-clamp-2">{row.criterion_title}</p>
                            <span className="text-[10px] text-gray-400 uppercase font-mono">
                              {row.verification_method}
                            </span>
                          </div>
                        ) : (
                          <span className="text-rose-500 italic">No criteria defined</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {row.linked_tasks && row.linked_tasks.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {row.linked_tasks.map((t) => (
                              <span
                                key={t.id}
                                className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                              >
                                <Link2 className="w-2.5 h-2.5" />
                                {t.taskCode}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="inline-flex items-center text-[10px] text-rose-500 font-semibold bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Unimplemented
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {row.qa_verified_at ? (
                          <span className="inline-flex items-center text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded">
                            <ShieldCheck className="w-3 h-3 mr-1" /> Verified
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">Pending QA</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {row.client_signoff_status === 'ACCEPTED' ? (
                          <span className="inline-flex items-center text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Accepted
                          </span>
                        ) : row.client_signoff_status === 'REJECTED' ? (
                          <span className="inline-flex items-center text-[10px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded">
                            Rejected
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                            Awaiting sign-off
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Drawer for Requirement Specification Details */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-3xl bg-white dark:bg-gray-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-850">
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-base text-indigo-600 dark:text-indigo-400">
                  {selectedReq.req_code}
                </span>
                {getStatusBadge(selectedReq.status)}
                <span className="text-xs text-gray-500 font-mono">v{selectedReq.version}</span>
              </div>
              <div className="flex items-center gap-2">
                {!selectedReq.is_baselined && (
                  <button
                    onClick={() => {
                      setBaselineForm({ baselineName: `Scope Baseline v${selectedReq.version}`, notes: '' });
                      setShowBaselineModal(true);
                    }}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                  >
                    <Lock className="w-3.5 h-3.5 mr-1" />
                    Freeze Baseline
                  </button>
                )}

                {selectedReq.is_baselined && (
                  <button
                    onClick={handleProposeAmendment}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/50 hover:bg-amber-200 rounded-lg"
                  >
                    <History className="w-3.5 h-3.5 mr-1" />
                    Propose Amendment
                  </button>
                )}

                <button
                  onClick={() => setSelectedReq(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Title & Objective */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedReq.title}</h2>
                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-800">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Business Objective</span>
                  <p className="text-xs text-gray-800 dark:text-gray-200 mt-1 leading-relaxed">
                    {selectedReq.business_objective}
                  </p>
                </div>
              </div>

              {/* Scope Boundaries */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800/40">
                  <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                    In Scope
                  </span>
                  <p className="text-xs text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap">
                    {selectedReq.in_scope || 'No specific in-scope boundaries specified.'}
                  </p>
                </div>

                <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 rounded-lg border border-rose-200 dark:border-rose-800/40">
                  <span className="text-[11px] font-semibold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                    Out of Scope
                  </span>
                  <p className="text-xs text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap">
                    {selectedReq.out_of_scope || 'No out-of-scope exceptions specified.'}
                  </p>
                </div>
              </div>

              {/* Assumptions */}
              {selectedReq.assumptions && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-800">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Assumptions</span>
                  <p className="text-xs text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap">
                    {selectedReq.assumptions}
                  </p>
                </div>
              )}

              {/* Acceptance Criteria Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-2">
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    Acceptance Criteria ({selectedReq.criteria?.length || 0})
                  </h3>
                  <button
                    onClick={() => {
                      setCriteriaForm({
                        criteriaCode: `${selectedReq.req_code}-AC${(selectedReq.criteria?.length || 0) + 1}`,
                        title: '',
                        description: '',
                        verificationMethod: 'MANUAL_TEST',
                        orderIndex: (selectedReq.criteria?.length || 0) + 1,
                      });
                      setShowAddCriteriaModal(true);
                    }}
                    className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 rounded"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add Criterion
                  </button>
                </div>

                {selectedReq.criteria && selectedReq.criteria.length > 0 ? (
                  <div className="space-y-3">
                    {selectedReq.criteria.map((c) => (
                      <div
                        key={c.id}
                        className="p-4 bg-white dark:bg-gray-850 rounded-xl border border-gray-200 dark:border-gray-800 space-y-3 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                                {c.criteria_code}
                              </span>
                              <span className="text-xs font-semibold text-gray-900 dark:text-white">
                                {c.title}
                              </span>
                              <span className="text-[10px] text-gray-400 font-mono uppercase bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                                {c.verification_method}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 whitespace-pre-wrap">
                              {c.description}
                            </p>
                          </div>
                          <div>{getImplBadge(c.implementation_status)}</div>
                        </div>

                        {/* Linked Tasks */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-100 dark:border-gray-800">
                          <span className="text-[10px] text-gray-400 font-semibold uppercase">Linked Tasks:</span>
                          {c.linked_tasks && c.linked_tasks.length > 0 ? (
                            c.linked_tasks.map((t) => (
                              <span
                                key={t.id}
                                className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700"
                              >
                                {t.taskCode} - {t.title}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUnlinkTask(c.id, t.id);
                                  }}
                                  className="text-gray-400 hover:text-rose-500 ml-1"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-amber-600 dark:text-amber-400 italic">None linked</span>
                          )}

                          <button
                            onClick={() => openLinkTasks(c)}
                            className="inline-flex items-center text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline ml-2"
                          >
                            <Link2 className="w-3 h-3 mr-0.5" />
                            Link Task
                          </button>
                        </div>

                        {/* QA & Client Sign-Off Bar */}
                        <div className="flex items-center justify-between text-[11px] pt-2 border-t border-gray-100 dark:border-gray-800 text-gray-500">
                          <div className="flex items-center gap-4">
                            {/* QA Verified */}
                            {c.qa_verified_at ? (
                              <span className="inline-flex items-center text-purple-700 dark:text-purple-300 font-semibold">
                                <ShieldCheck className="w-3.5 h-3.5 mr-1 text-purple-600" />
                                QA Verified ({c.qa_verified_by_name || 'QA Lead'})
                              </span>
                            ) : (
                              <button
                                onClick={() => openQaVerification(c)}
                                className="inline-flex items-center text-purple-600 dark:text-purple-400 hover:underline font-medium"
                              >
                                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                                Record QA Verification
                              </button>
                            )}

                            {/* Client Sign-off */}
                            {c.client_signoff_status === 'ACCEPTED' ? (
                              <span className="inline-flex items-center text-emerald-700 dark:text-emerald-300 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                Client Accepted ({c.client_signoff_by_name || 'Authorized Approver'})
                              </span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400">
                                Sign-off: {c.client_signoff_status}
                              </span>
                            )}
                          </div>

                          {c.qa_evidence_urls && c.qa_evidence_urls.length > 0 && (
                            <div className="flex items-center gap-1">
                              {c.qa_evidence_urls.map((ev, i) => (
                                <a
                                  key={i}
                                  href={ev.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-[10px] text-indigo-600 hover:underline"
                                >
                                  <ExternalLink className="w-2.5 h-2.5 mr-0.5" />
                                  {ev.title || 'Evidence'}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    No acceptance criteria added yet. Add criteria to make this requirement measurable and verifiable.
                  </p>
                )}
              </div>

              {/* Baselines History Section */}
              {selectedReq.baselines && selectedReq.baselines.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                    <History className="w-4 h-4 text-emerald-600" />
                    Frozen Baseline History ({selectedReq.baselines.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedReq.baselines.map((b) => (
                      <div
                        key={b.id}
                        className="p-3 bg-gray-50 dark:bg-gray-850 rounded-lg border border-gray-200 dark:border-gray-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 dark:text-white">{b.baseline_name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                              Revision v{b.version}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-400 block mt-0.5">
                            Baselined by {b.baselined_by_name || 'System Admin'} &bull; {new Date(b.baselined_at).toLocaleDateString()}
                          </span>
                        </div>
                        <span className="inline-flex items-center text-[11px] text-emerald-600 font-medium">
                          <Lock className="w-3 h-3 mr-1" /> Immutable Snapshot
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Requirement */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-xl w-full p-6 shadow-xl border border-gray-200 dark:border-gray-800 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
              <h3 className="font-bold text-base text-gray-900 dark:text-white">New Requirement Specification</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRequirement} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Scope Type *</label>
                  <select
                    value={newReq.scopeType}
                    onChange={(e) => setNewReq({ ...newReq, scopeType: e.target.value as any })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-gray-900 dark:text-gray-100"
                  >
                    <option value="PROJECT">Client Project</option>
                    <option value="PRODUCT">Commercial Product</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Target Entity *</label>
                  {newReq.scopeType === 'PROJECT' ? (
                    <select
                      value={newReq.projectId}
                      onChange={(e) => setNewReq({ ...newReq, projectId: e.target.value })}
                      required
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">Select Project</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.project_name} ({p.project_code})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={newReq.productId}
                      onChange={(e) => setNewReq({ ...newReq, productId: e.target.value })}
                      required
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">Select Product</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.product_name} ({p.product_code})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Granular Role-Based Permissions Engine"
                  value={newReq.title}
                  onChange={(e) => setNewReq({ ...newReq, title: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Module / Feature Area</label>
                <input
                  type="text"
                  placeholder="e.g. Security & IAM"
                  value={newReq.moduleName}
                  onChange={(e) => setNewReq({ ...newReq, moduleName: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Business Objective *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Why is this requirement needed? What commercial or business value does it unlock?"
                  value={newReq.businessObjective}
                  onChange={(e) => setNewReq({ ...newReq, businessObjective: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">In Scope</label>
                  <textarea
                    rows={2}
                    placeholder="Included capabilities"
                    value={newReq.inScope}
                    onChange={(e) => setNewReq({ ...newReq, inScope: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Out of Scope</label>
                  <textarea
                    rows={2}
                    placeholder="Explicit exclusions"
                    value={newReq.outOfScope}
                    onChange={(e) => setNewReq({ ...newReq, outOfScope: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="clientVisibleToggle"
                  checked={newReq.isClientVisible}
                  onChange={(e) => setNewReq({ ...newReq, isClientVisible: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="clientVisibleToggle" className="text-gray-700 dark:text-gray-300">
                  Publish to Client Portal once baselined (Customer visibility enabled)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm"
                >
                  Create Specification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Baseline Snapshot */}
      {showBaselineModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full p-6 shadow-xl border border-gray-200 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-600" />
                Freeze Scope Baseline
              </h3>
              <button onClick={() => setShowBaselineModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Freezing a baseline creates an immutable snapshot of this requirement and its acceptance criteria. Subsequent edits will require an amendment proposal without rewriting this record.
            </p>

            <form onSubmit={handleBaseline} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Baseline Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sprint 1 Initial Sign-off v1"
                  value={baselineForm.baselineName}
                  onChange={(e) => setBaselineForm({ ...baselineForm, baselineName: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Agreement Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Formally agreed in client governance meeting on 2026-09-29"
                  value={baselineForm.notes}
                  onChange={(e) => setBaselineForm({ ...baselineForm, notes: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowBaselineModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg"
                >
                  Confirm & Baseline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Acceptance Criterion */}
      {showAddCriteriaModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-lg w-full p-6 shadow-xl border border-gray-200 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
              <h3 className="font-bold text-base text-gray-900 dark:text-white">Add Acceptance Criterion</h3>
              <button onClick={() => setShowAddCriteriaModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCriteria} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Criterion Code</label>
                  <input
                    type="text"
                    value={criteriaForm.criteriaCode}
                    onChange={(e) => setCriteriaForm({ ...criteriaForm, criteriaCode: e.target.value })}
                    className="w-full font-mono bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Verification Method *</label>
                  <select
                    value={criteriaForm.verificationMethod}
                    onChange={(e) => setCriteriaForm({ ...criteriaForm, verificationMethod: e.target.value as any })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-gray-900 dark:text-gray-100"
                  >
                    <option value="MANUAL_TEST">Manual Test</option>
                    <option value="DEMO">Live Demo / Walkthrough</option>
                    <option value="AUTOMATED">Automated Test Suite</option>
                    <option value="DOCUMENTATION">Documentation Review</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Session invalidation on password change"
                  value={criteriaForm.title}
                  onChange={(e) => setCriteriaForm({ ...criteriaForm, title: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Description (Given-When-Then) *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Given an authenticated user, When password is changed, Then all previous refresh tokens must be revoked."
                  value={criteriaForm.description}
                  onChange={(e) => setCriteriaForm({ ...criteriaForm, description: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowAddCriteriaModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg"
                >
                  Add Criterion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Link Delivery Tasks */}
      {showLinkTasksModal && activeCriterion && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-lg w-full p-6 shadow-xl border border-gray-200 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
              <h3 className="font-bold text-base text-gray-900 dark:text-white">
                Link Delivery Tasks ({activeCriterion.criteria_code})
              </h3>
              <button onClick={() => setShowLinkTasksModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Select delivery tasks that implement this acceptance criterion. Linking tasks establishes traceability and updates implementation coverage.
            </p>

            <div className="max-h-64 overflow-y-auto space-y-1 text-xs border border-gray-200 dark:border-gray-800 rounded-lg p-2">
              {availableTasks.length === 0 ? (
                <p className="p-4 text-center text-gray-400 italic">No tasks found in project</p>
              ) : (
                availableTasks.map((t) => {
                  const isChecked = selectedTaskIds.includes(t.id);
                  return (
                    <label
                      key={t.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setSelectedTaskIds(selectedTaskIds.filter((id) => id !== t.id));
                          } else {
                            setSelectedTaskIds([...selectedTaskIds, t.id]);
                          }
                        }}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {t.task_code || t.id.slice(0, 8)}
                      </span>
                      <span className="text-gray-800 dark:text-gray-200 flex-1 truncate">{t.title}</span>
                    </label>
                  );
                })
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setShowLinkTasksModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveLinkedTasks}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-xs"
              >
                Save Linked Tasks ({selectedTaskIds.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Record QA Verification */}
      {showQaModal && activeCriterion && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full p-6 shadow-xl border border-gray-200 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                Record QA Verification
              </h3>
              <button onClick={() => setShowQaModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQaVerification} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Verification Status</label>
                <select
                  value={qaForm.status}
                  onChange={(e) => setQaForm({ ...qaForm, status: e.target.value as any })}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-gray-900 dark:text-gray-100"
                >
                  <option value="VERIFIED_QA">Verified by QA</option>
                  <option value="IMPLEMENTED">Implemented (Needs Retest)</option>
                  <option value="WAIVED">Waived with Approval</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">QA Evidence Notes</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detail test execution results, tested build version, and staging environment verification."
                  value={qaForm.evidenceNotes}
                  onChange={(e) => setQaForm({ ...qaForm, evidenceNotes: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Evidence Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Test Run Execution Log"
                    value={qaForm.evidenceUrlTitle}
                    onChange={(e) => setQaForm({ ...qaForm, evidenceUrlTitle: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Evidence URL</label>
                  <input
                    type="url"
                    placeholder="https://s3.amazonaws.com/..."
                    value={qaForm.evidenceUrl}
                    onChange={(e) => setQaForm({ ...qaForm, evidenceUrl: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowQaModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg"
                >
                  Save QA Verification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
