import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Filter,
  ArrowRight,
  GitMerge,
  Eye,
  Send,
  Calendar,
  Lock,
  ExternalLink,
  ChevronRight,
  History,
  Info,
  Check,
  X,
  FileCheck,
  Building2,
  User,
} from 'lucide-react';
import { raidApi, projectsApi, productsApi, clientsApi } from '../../api/endpoints';
import {
  RaidItem,
  ClientActionRequest,
  RaidCategory,
  RaidLikelihood,
  RaidImpact,
  ClientVisibility,
  Project,
  Product,
  Client,
  AlternativeConsidered,
} from '../../types';

export const RaidWorkspaceView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'RISK' | 'ASSUMPTION' | 'DECISION' | 'ACTION_REQUESTS'>('RISK');
  const [items, setItems] = useState<RaidItem[]>([]);
  const [actionRequests, setActionRequests] = useState<ClientActionRequest[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Drawers
  const [selectedItem, setSelectedItem] = useState<RaidItem | null>(null);
  const [showItemModal, setShowItemModal] = useState<boolean>(false);
  const [showActionModal, setShowActionModal] = useState<boolean>(false);
  const [showSupersedeModal, setShowSupersedeModal] = useState<boolean>(false);

  // Form State for RAID Item
  const [formData, setFormData] = useState<{
    category: RaidCategory;
    projectId?: string;
    productId?: string;
    title: string;
    description: string;
    ownerUserId?: string;
    reviewDate?: string;
    status: string;
    likelihood?: RaidLikelihood;
    impact?: RaidImpact;
    riskScore?: number;
    mitigationPlan?: string;
    contingencyPlan?: string;
    internalDiscussion?: string;
    context?: string;
    rationale?: string;
    consequences?: string;
    technicalImpact?: string;
    businessImpact?: string;
    isClientShared: boolean;
    clientVisibility: ClientVisibility;
    clientSummary?: string;
    alternativesConsidered: AlternativeConsidered[];
  }>({
    category: 'RISK',
    title: '',
    description: '',
    status: 'IDENTIFIED',
    isClientShared: false,
    clientVisibility: 'INTERNAL_ONLY',
    alternativesConsidered: [],
  });

  // Form State for Client Action Request
  const [actionFormData, setActionFormData] = useState<{
    raidItemId?: string;
    projectId: string;
    clientId: string;
    title: string;
    description: string;
    contextForClient: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    dueDate: string;
    requiresApprover: boolean;
  }>({
    projectId: '',
    clientId: '',
    title: '',
    description: '',
    contextForClient: '',
    priority: 'MEDIUM',
    dueDate: '',
    requiresApprover: false,
  });

  // Supersede Form State
  const [supersedeData, setSupersedeData] = useState<{
    newTitle: string;
    rationale: string;
    consequences?: string;
    technicalImpact?: string;
    businessImpact?: string;
    changeSummary: string;
  }>({
    newTitle: '',
    rationale: '',
    changeSummary: '',
  });

  useEffect(() => {
    loadPrerequisites();
  }, []);

  useEffect(() => {
    if (activeTab === 'ACTION_REQUESTS') {
      loadActionRequests();
    } else {
      loadRaidItems();
    }
  }, [activeTab, selectedProjectId, selectedProductId, statusFilter, searchQuery]);

  const loadPrerequisites = async () => {
    try {
      const [projRes, prodRes, clientRes] = await Promise.all([
        projectsApi.getProjects(),
        productsApi.getProducts(),
        clientsApi.getAll(),
      ]);
      setProjects(projRes.data || []);
      setProducts(prodRes.data || []);
      setClients(clientRes.data || []);
    } catch (err) {
      console.error('Failed to load prerequisites', err);
    }
  };

  const loadRaidItems = async () => {
    try {
      setLoading(true);
      const res = await raidApi.getItems({
        category: activeTab !== 'ACTION_REQUESTS' ? activeTab : undefined,
        projectId: selectedProjectId || undefined,
        productId: selectedProductId || undefined,
        status: statusFilter || undefined,
        search: searchQuery || undefined,
      });
      setItems(res.data || []);
    } catch (err) {
      console.error('Failed to load RAID items', err);
    } finally {
      setLoading(false);
    }
  };

  const loadActionRequests = async () => {
    try {
      setLoading(true);
      const res = await raidApi.getActionRequests({
        projectId: selectedProjectId || undefined,
        status: statusFilter || undefined,
      });
      setActionRequests(res.data || []);
    } catch (err) {
      console.error('Failed to load action requests', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateItem = (category: RaidCategory) => {
    setSelectedItem(null);
    let initialStatus = 'IDENTIFIED';
    if (category === 'ASSUMPTION') initialStatus = 'VALIDATING';
    if (category === 'DECISION') initialStatus = 'PROPOSED';
    if (category === 'ISSUE') initialStatus = 'OPEN';

    setFormData({
      category,
      projectId: selectedProjectId || (projects[0]?.id ?? ''),
      title: '',
      description: '',
      status: initialStatus,
      isClientShared: false,
      clientVisibility: 'INTERNAL_ONLY',
      alternativesConsidered: [],
      likelihood: 'MEDIUM',
      impact: 'MEDIUM',
    });
    setShowItemModal(true);
  };

  const handleOpenEditItem = async (item: RaidItem) => {
    try {
      const res = await raidApi.getItemById(item.id);
      const fullItem = res.data;
      setSelectedItem(fullItem);
      setFormData({
        category: fullItem.category,
        projectId: fullItem.project_id || '',
        productId: fullItem.product_id || '',
        title: fullItem.title,
        description: fullItem.description || '',
        ownerUserId: fullItem.owner_user_id || '',
        reviewDate: fullItem.review_date ? fullItem.review_date.slice(0, 10) : '',
        status: fullItem.status,
        likelihood: fullItem.likelihood,
        impact: fullItem.impact,
        riskScore: fullItem.risk_score,
        mitigationPlan: fullItem.mitigation_plan || '',
        contingencyPlan: fullItem.contingency_plan || '',
        internalDiscussion: fullItem.internal_discussion || '',
        context: fullItem.context || '',
        rationale: fullItem.rationale || '',
        consequences: fullItem.consequences || '',
        technicalImpact: fullItem.technical_impact || '',
        businessImpact: fullItem.business_impact || '',
        isClientShared: fullItem.is_client_shared,
        clientVisibility: fullItem.client_visibility,
        clientSummary: fullItem.client_summary || '',
        alternativesConsidered: fullItem.alternatives_considered || [],
      });
      setShowItemModal(true);
    } catch (err) {
      console.error('Failed to fetch item details', err);
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedItem) {
        await raidApi.updateItem(selectedItem.id, {
          ...formData,
          projectId: formData.projectId || undefined,
          productId: formData.productId || undefined,
        });
      } else {
        await raidApi.createItem({
          ...formData,
          projectId: formData.projectId || undefined,
          productId: formData.productId || undefined,
        });
      }
      setShowItemModal(false);
      loadRaidItems();
    } catch (err) {
      console.error('Failed to save RAID item', err);
    }
  };

  const handleOpenSupersede = (item: RaidItem) => {
    setSelectedItem(item);
    setSupersedeData({
      newTitle: `${item.title} (Revised)`,
      rationale: '',
      changeSummary: `Superseding ${item.item_code} due to architecture evolution`,
    });
    setShowSupersedeModal(true);
  };

  const handleExecuteSupersede = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      await raidApi.supersedeDecision(selectedItem.id, supersedeData);
      setShowSupersedeModal(false);
      loadRaidItems();
    } catch (err) {
      console.error('Failed to supersede decision', err);
    }
  };

  const handleSaveActionRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await raidApi.createActionRequest({
        ...actionFormData,
        raidItemId: actionFormData.raidItemId || undefined,
      });
      setShowActionModal(false);
      if (activeTab === 'ACTION_REQUESTS') {
        loadActionRequests();
      }
    } catch (err) {
      console.error('Failed to create action request', err);
    }
  };

  // KPI Calculations
  const totalRisks = items.filter((i) => i.category === 'RISK').length;
  const highExposureRisks = items.filter(
    (i) => i.category === 'RISK' && (i.impact === 'HIGH' || i.impact === 'CRITICAL'),
  ).length;
  const activeDecisions = items.filter((i) => i.category === 'DECISION' && i.status === 'ACCEPTED').length;
  const pendingActions = actionRequests.filter((a) => a.status === 'PENDING').length;

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-amber-500" />
            RAID Register & Decision Radar
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Maintain project risks, assumptions, architecture decisions (ADR), and publish authorized client action requests.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setActionFormData({
                projectId: selectedProjectId || (projects[0]?.id ?? ''),
                clientId: clients[0]?.id ?? '',
                title: '',
                description: '',
                contextForClient: '',
                priority: 'MEDIUM',
                dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
                requiresApprover: false,
              });
              setShowActionModal(true);
            }}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50"
          >
            <Send className="h-4 w-4 text-blue-500" />
            Publish Client Action
          </button>

          <button
            onClick={() => handleOpenCreateItem(activeTab === 'ACTION_REQUESTS' ? 'RISK' : activeTab)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Record {activeTab === 'ACTION_REQUESTS' ? 'Item' : activeTab}
          </button>
        </div>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Open Risks</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{totalRisks}</div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-medium">
            {highExposureRisks} High / Critical exposure
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Assumptions</span>
            <Lightbulb className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {items.filter((i) => i.category === 'ASSUMPTION').length}
          </div>
          <div className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-1">Under continuous validation</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Accepted Decisions (ADR)</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{activeDecisions}</div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
            {items.filter((i) => i.category === 'DECISION' && i.is_client_shared).length} Client shared
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Pending Client Actions</span>
            <Clock className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{pendingActions}</div>
          <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-1">Awaiting client decision/response</div>
        </div>
      </div>

      {/* Tabs & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          {(['RISK', 'ASSUMPTION', 'DECISION', 'ACTION_REQUESTS'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setStatusFilter('');
              }}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab === 'ACTION_REQUESTS' ? 'Client Action Requests' : `${tab}S`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden w-44"
            />
          </div>

          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_name} ({p.project_code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex justify-center items-center py-20 text-slate-400 text-sm">
          <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent animate-spin rounded-full mr-3" />
          Loading register...
        </div>
      ) : activeTab === 'ACTION_REQUESTS' ? (
        /* Action Requests Table */
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Code / Title</th>
                <th className="px-4 py-3">Project & Client</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Approver Req.</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Response / Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {actionRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No client action requests found for this filter.
                  </td>
                </tr>
              ) : (
                actionRequests.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-white">{a.title}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{a.action_code}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{a.project_name || 'N/A'}</div>
                      <div className="text-[10px] text-slate-400">{a.client_name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 font-medium">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        {a.due_date ? a.due_date.slice(0, 10) : 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          a.priority === 'URGENT'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                            : a.priority === 'HIGH'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {a.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {a.requires_approver ? (
                        <span className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                          <Lock className="h-3 w-3" /> Approver Only
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Any Contact</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          a.status === 'RESPONDED' || a.status === 'RESOLVED'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : a.status === 'IN_REVIEW'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {a.response_text ? (
                        <div className="max-w-xs">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {a.resulting_decision}: {a.response_text}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            By {a.responded_by_name || 'Client Contact'} on{' '}
                            {a.responded_at ? a.responded_at.slice(0, 10) : ''}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Awaiting response</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* RAID Items Table */
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Code / Title</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Status</th>
                {activeTab === 'RISK' && <th className="px-4 py-3">Likelihood × Impact</th>}
                {activeTab === 'DECISION' && <th className="px-4 py-3">Supersession / Successor</th>}
                <th className="px-4 py-3">Client Visibility</th>
                <th className="px-4 py-3">Review Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeTab === 'RISK' || activeTab === 'DECISION' ? 7 : 6}
                    className="px-4 py-8 text-center text-slate-400"
                  >
                    No {activeTab.toLowerCase()} items recorded yet.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        {item.title}
                        {item.current_revision > 1 && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                            v{item.current_revision}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{item.item_code}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{item.project_name || 'Global'}</div>
                      {item.project_code && (
                        <div className="text-[10px] text-slate-400 font-mono">{item.project_code}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          item.status === 'ACCEPTED' || item.status === 'CONFIRMED' || item.status === 'CLOSED'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : item.status === 'SUPERSEDED'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400'
                            : item.status === 'IDENTIFIED' || item.status === 'VALIDATING'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    {activeTab === 'RISK' && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 font-medium">
                          <span>{item.likelihood || 'MED'}</span>
                          <span className="text-slate-400">×</span>
                          <span>{item.impact || 'MED'}</span>
                          {item.risk_score && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded font-mono text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              Score: {item.risk_score}
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                    {activeTab === 'DECISION' && (
                      <td className="px-4 py-3">
                        {item.superseded_by_code ? (
                          <span className="text-[11px] text-purple-600 dark:text-purple-400 flex items-center gap-1 font-medium">
                            <GitMerge className="h-3 w-3" />
                            Superseded by {item.superseded_by_code}
                          </span>
                        ) : item.supersedes_code ? (
                          <span className="text-[11px] text-blue-600 dark:text-blue-400 flex items-center gap-1 font-medium">
                            <ArrowRight className="h-3 w-3" />
                            Successor of {item.supersedes_code}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      {item.is_client_shared ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 flex items-center gap-1 w-fit">
                          <Eye className="h-3 w-3" />
                          {item.client_visibility}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Lock className="h-3 w-3" /> Internal Only
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-slate-500 font-medium">
                        {item.review_date ? item.review_date.slice(0, 10) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {activeTab === 'DECISION' && item.status !== 'SUPERSEDED' && (
                          <button
                            onClick={() => handleOpenSupersede(item)}
                            title="Supersede Decision"
                            className="p-1 rounded text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                          >
                            <GitMerge className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEditItem(item)}
                          className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* RAID Item Modal (Create & Edit) */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-blue-600" />
                {selectedItem ? `Edit ${formData.category} (${selectedItem.item_code})` : `Record New ${formData.category}`}
              </h2>
              <button
                onClick={() => setShowItemModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Project *</label>
                  <select
                    value={formData.projectId || ''}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                  >
                    <option value="">No Project (Global)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.project_name} ({p.project_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Status *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                  >
                    {formData.category === 'RISK' && (
                      <>
                        <option value="IDENTIFIED">Identified</option>
                        <option value="MONITORING">Monitoring</option>
                        <option value="MITIGATING">Mitigating</option>
                        <option value="CLOSED">Closed</option>
                        <option value="REALIZED">Realized (Event Occurred)</option>
                      </>
                    )}
                    {formData.category === 'ASSUMPTION' && (
                      <>
                        <option value="VALIDATING">Validating</option>
                        <option value="CONFIRMED">Confirmed True</option>
                        <option value="INVALIDATED">Invalidated</option>
                      </>
                    )}
                    {formData.category === 'DECISION' && (
                      <>
                        <option value="PROPOSED">Proposed</option>
                        <option value="ACCEPTED">Accepted</option>
                        <option value="REJECTED">Rejected</option>
                        <option value="SUPERSEDED">Superseded</option>
                      </>
                    )}
                    {formData.category === 'ISSUE' && (
                      <>
                        <option value="OPEN">Open</option>
                        <option value="RESOLVED">Resolved</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder={`Summary of this ${formData.category.toLowerCase()}...`}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Description / Problem Statement</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                />
              </div>

              {/* Risk Specific Matrix */}
              {formData.category === 'RISK' && (
                <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl space-y-3">
                  <div className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" /> Risk Exposure Assessment
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium mb-1">Likelihood</label>
                      <select
                        value={formData.likelihood || 'MEDIUM'}
                        onChange={(e) => setFormData({ ...formData, likelihood: e.target.value as RaidLikelihood })}
                        className="w-full p-2 bg-white dark:bg-slate-900 border rounded-lg"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="VERY_HIGH">Very High</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Impact</label>
                      <select
                        value={formData.impact || 'MEDIUM'}
                        onChange={(e) => setFormData({ ...formData, impact: e.target.value as RaidImpact })}
                        className="w-full p-2 bg-white dark:bg-slate-900 border rounded-lg"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="CRITICAL">Critical</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium mb-1">Mitigation Plan</label>
                    <textarea
                      rows={2}
                      placeholder="Proactive actions to prevent this risk..."
                      value={formData.mitigationPlan}
                      onChange={(e) => setFormData({ ...formData, mitigationPlan: e.target.value })}
                      className="w-full p-2 bg-white dark:bg-slate-900 border rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* Decision / Architecture ADR Fields */}
              {formData.category === 'DECISION' && (
                <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-xl space-y-3">
                  <div className="font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                    <FileCheck className="h-4 w-4" /> Architecture Decision Record (ADR)
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium mb-1">Decision Context</label>
                      <textarea
                        rows={2}
                        placeholder="Context and drivers influencing this decision..."
                        value={formData.context}
                        onChange={(e) => setFormData({ ...formData, context: e.target.value })}
                        className="w-full p-2 bg-white dark:bg-slate-900 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Chosen Rationale</label>
                      <textarea
                        rows={2}
                        placeholder="Why this option was chosen..."
                        value={formData.rationale}
                        onChange={(e) => setFormData({ ...formData, rationale: e.target.value })}
                        className="w-full p-2 bg-white dark:bg-slate-900 border rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Consequences & Trade-offs</label>
                    <textarea
                      rows={2}
                      placeholder="Positive and negative trade-offs resulting from this decision..."
                      value={formData.consequences}
                      onChange={(e) => setFormData({ ...formData, consequences: e.target.value })}
                      className="w-full p-2 bg-white dark:bg-slate-900 border rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* Client Sharing Governance */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isClientShared}
                      onChange={(e) => setFormData({ ...formData, isClientShared: e.target.checked })}
                      className="rounded"
                    />
                    Share this decision/summary on Customer Portal
                  </label>
                  {formData.isClientShared && (
                    <select
                      value={formData.clientVisibility}
                      onChange={(e) => setFormData({ ...formData, clientVisibility: e.target.value as ClientVisibility })}
                      className="p-1 text-xs border rounded bg-white dark:bg-slate-900"
                    >
                      <option value="CLIENT_SUMMARY">Sanitized Summary Only</option>
                      <option value="CLIENT_FULL">Full ADR (Context & Trade-offs)</option>
                    </select>
                  )}
                </div>

                {formData.isClientShared && (
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Sanitized Client Summary</label>
                    <input
                      type="text"
                      placeholder="Client-safe executive wording..."
                      value={formData.clientSummary || ''}
                      onChange={(e) => setFormData({ ...formData, clientSummary: e.target.value })}
                      className="w-full p-2 bg-white dark:bg-slate-900 border rounded-lg text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Internal Confidential Discussion */}
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Lock className="h-3 w-3 text-rose-500" /> Private Internal Discussion (Strict Zero-Leakage)
                </label>
                <textarea
                  rows={2}
                  placeholder="Private internal commentary, team deliberations, or vendor critique (never disclosed to client)..."
                  value={formData.internalDiscussion}
                  onChange={(e) => setFormData({ ...formData, internalDiscussion: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-slate-700 dark:text-slate-300"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  {selectedItem ? 'Update Record' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Publish Client Action Request Modal */}
      {showActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Send className="h-5 w-5 text-blue-600" />
                Publish Client Action / Decision Request
              </h2>
              <button
                onClick={() => setShowActionModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveActionRequest} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 rounded-xl text-blue-700 dark:text-blue-300">
                <Info className="h-4 w-4 inline mr-1.5" />
                This action request will appear on the customer portal for client stakeholders to review and respond.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Project *</label>
                  <select
                    required
                    value={actionFormData.projectId}
                    onChange={(e) => setActionFormData({ ...actionFormData, projectId: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                  >
                    <option value="">Select Project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.project_name} ({p.project_code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Client Organization *</label>
                  <select
                    required
                    value={actionFormData.clientId}
                    onChange={(e) => setActionFormData({ ...actionFormData, clientId: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                  >
                    <option value="">Select Client</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.company_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Action Request Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Approve Identity Provider Integration Specification..."
                  value={actionFormData.title}
                  onChange={(e) => setActionFormData({ ...actionFormData, title: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Client-Safe Context & Options *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide background context and clear options for the client..."
                  value={actionFormData.contextForClient}
                  onChange={(e) => setActionFormData({ ...actionFormData, contextForClient: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={actionFormData.dueDate}
                    onChange={(e) => setActionFormData({ ...actionFormData, dueDate: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Priority</label>
                  <select
                    value={actionFormData.priority}
                    onChange={(e) => setActionFormData({ ...actionFormData, priority: e.target.value as any })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                <label className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={actionFormData.requiresApprover}
                    onChange={(e) => setActionFormData({ ...actionFormData, requiresApprover: e.target.checked })}
                    className="rounded"
                  />
                  Requires designated client approver authority (contact.is_approver)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowActionModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  Publish Action Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supersede Decision Modal */}
      {showSupersedeModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <GitMerge className="h-5 w-5 text-purple-600" />
                Supersede Architecture Decision ({selectedItem.item_code})
              </h2>
              <button
                onClick={() => setShowSupersedeModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteSupersede} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 rounded-xl text-purple-700 dark:text-purple-300">
                <Info className="h-4 w-4 inline mr-1.5" />
                <strong>Architecture Governance:</strong> This creates a successor decision linked to{' '}
                {selectedItem.item_code}, marking the predecessor as SUPERSEDED. A superseded technical decision does not
                itself approve commercial scope changes.
              </div>

              <div>
                <label className="block font-semibold mb-1">Successor Decision Title *</label>
                <input
                  type="text"
                  required
                  value={supersedeData.newTitle}
                  onChange={(e) => setSupersedeData({ ...supersedeData, newTitle: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Rationale for Supersession *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain what circumstances, benchmarks, or requirements changed..."
                  value={supersedeData.rationale}
                  onChange={(e) => setSupersedeData({ ...supersedeData, rationale: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSupersedeModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg"
                >
                  Confirm Supersession
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
