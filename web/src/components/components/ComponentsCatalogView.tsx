import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { componentsApi, teamsApi, projectsApi, productsApi } from '../../api/endpoints';
import {
  SoftwareComponent,
  ComponentDashboardResponse,
  DeliveryTeam,
  Project,
  Product,
  User,
} from '../../types';
import {
  Cpu,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Code2,
  AlertTriangle,
  Bug,
  Flame,
  CheckCircle2,
  Network,
  Search,
  Filter,
  Layers,
  ArrowRight,
  ArrowLeft,
  X,
  Check,
  Briefcase,
  FolderGit2,
  ShieldAlert,
} from 'lucide-react';
import api from '../../api/client';

export const ComponentsCatalogView: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [components, setComponents] = useState<SoftwareComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [criticalityFilter, setCriticalityFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');

  // Modals
  const [isComponentModalOpen, setIsComponentModalOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<SoftwareComponent | null>(null);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [selectedDashboard, setSelectedDashboard] = useState<ComponentDashboardResponse | null>(null);
  const [dashboardTab, setDashboardTab] = useState<'active' | 'bugs' | 'debt' | 'deps'>('active');

  // Architecture Map Modal
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [mapData, setMapData] = useState<{ nodes: any[]; links: any[] } | null>(null);

  // Masters
  const [teams, setTeams] = useState<DeliveryTeam[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Form states
  const [componentCode, setComponentCode] = useState('');
  const [componentName, setComponentName] = useState('');
  const [description, setDescription] = useState('');
  const [entityType, setEntityType] = useState<'PRODUCT' | 'PROJECT'>('PROJECT');
  const [projectId, setProjectId] = useState('');
  const [productId, setProductId] = useState('');
  const [ownerTeamId, setOwnerTeamId] = useState('');
  const [techLeadUserId, setTechLeadUserId] = useState('');
  const [technologyStack, setTechnologyStack] = useState('');
  const [documentationUrl, setDocumentationUrl] = useState('');
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [criticality, setCriticality] = useState<'TIER_1_CRITICAL' | 'TIER_2_CORE' | 'TIER_3_SUPPORTING'>('TIER_2_CORE');

  // Add Dependency Form in Dashboard
  const [newDepTargetId, setNewDepTargetId] = useState('');
  const [newDepType, setNewDepType] = useState<'CONSUMES_API' | 'CALLS_SERVICE' | 'SHARED_DATABASE' | 'EVENT_PUBSUB' | 'CLIENT_SDK'>('CONSUMES_API');
  const [newDepDesc, setNewDepDesc] = useState('');

  const canManage = hasPermission('COMPONENTS:MANAGE') || user?.role_code === 'ROLE_SUPER_ADMIN';

  const loadComponents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await componentsApi.getAll({
        criticality: criticalityFilter || undefined,
        ownerTeamId: teamFilter || undefined,
      });
      setComponents((res as any)?.data || res || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to load software components');
    } finally {
      setLoading(false);
    }
  }, [criticalityFilter, teamFilter]);

  const loadMasters = useCallback(async () => {
    try {
      const [tRes, pRes, prRes, uRes] = await Promise.all([
        teamsApi.getAll(),
        projectsApi.getProjects(),
        productsApi.getProducts(),
        api.get('/users'),
      ]);
      setTeams((tRes as any)?.data || tRes || []);
      setProjects((pRes as any)?.data?.items || (pRes as any)?.data || []);
      setProducts((prRes as any)?.data?.items || (prRes as any)?.data || []);
      setUsers((uRes as any)?.data?.users || (uRes as any)?.data || []);
    } catch (e) {
      console.error('Failed to load masters:', e);
    }
  }, []);

  useEffect(() => {
    loadComponents();
    loadMasters();
  }, [loadComponents, loadMasters]);

  const openCreateModal = () => {
    setEditingComponent(null);
    setComponentCode('');
    setComponentName('');
    setDescription('');
    setEntityType('PROJECT');
    setProjectId(projects[0]?.id || '');
    setProductId('');
    setOwnerTeamId('');
    setTechLeadUserId('');
    setTechnologyStack('');
    setDocumentationUrl('');
    setRepositoryUrl('');
    setCriticality('TIER_2_CORE');
    setIsComponentModalOpen(true);
  };

  const openEditModal = (c: SoftwareComponent) => {
    setEditingComponent(c);
    setComponentCode(c.component_code);
    setComponentName(c.component_name);
    setDescription(c.description || '');
    setEntityType(c.entity_type);
    setProjectId(c.project_id || '');
    setProductId(c.product_id || '');
    setOwnerTeamId(c.owner_team_id || '');
    setTechLeadUserId(c.tech_lead_user_id || '');
    setTechnologyStack(c.technology_stack || '');
    setDocumentationUrl(c.documentation_url || '');
    setRepositoryUrl(c.repository_url || '');
    setCriticality(c.criticality);
    setIsComponentModalOpen(true);
  };

  const handleSaveComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editingComponent) {
        await componentsApi.update(editingComponent.id, {
          componentName,
          description,
          ownerTeamId: ownerTeamId || undefined,
          techLeadUserId: techLeadUserId || undefined,
          technologyStack: technologyStack || undefined,
          documentationUrl: documentationUrl || undefined,
          repositoryUrl: repositoryUrl || undefined,
          criticality,
        });
      } else {
        await componentsApi.create({
          componentCode,
          componentName,
          description,
          entityType,
          projectId: entityType === 'PROJECT' ? projectId : undefined,
          productId: entityType === 'PRODUCT' ? productId : undefined,
          ownerTeamId: ownerTeamId || undefined,
          techLeadUserId: techLeadUserId || undefined,
          technologyStack: technologyStack || undefined,
          documentationUrl: documentationUrl || undefined,
          repositoryUrl: repositoryUrl || undefined,
          criticality,
        });
      }
      setIsComponentModalOpen(false);
      await loadComponents();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to save component');
    }
  };

  const handleDeleteComponent = async (id: string) => {
    if (!window.confirm('Are you sure you want to deactivate this software component?')) return;
    try {
      await componentsApi.delete(id);
      await loadComponents();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to deactivate component');
    }
  };

  const openDashboard = async (comp: SoftwareComponent) => {
    try {
      const res = await componentsApi.getDashboard(comp.id);
      setSelectedDashboard((res as any)?.data || res);
      setDashboardTab('active');
      setIsDashboardOpen(true);
    } catch (err: any) {
      alert(err?.response?.data?.message || err.message || 'Failed to open component dashboard');
    }
  };

  const handleAddDependency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDashboard || !newDepTargetId) return;
    try {
      await componentsApi.addDependency(selectedDashboard.component.id, {
        dependsOnComponentId: newDepTargetId,
        dependencyType: newDepType,
        description: newDepDesc || undefined,
      });
      // Refresh dashboard
      const res = await componentsApi.getDashboard(selectedDashboard.component.id);
      setSelectedDashboard((res as any)?.data || res);
      setNewDepTargetId('');
      setNewDepDesc('');
      await loadComponents();
    } catch (err: any) {
      alert(err?.response?.data?.message || err.message || 'Failed to add dependency');
    }
  };

  const handleRemoveDependency = async (depId: string) => {
    if (!selectedDashboard) return;
    try {
      await componentsApi.removeDependency(depId);
      const res = await componentsApi.getDashboard(selectedDashboard.component.id);
      setSelectedDashboard((res as any)?.data || res);
      await loadComponents();
    } catch (err: any) {
      alert('Failed to remove dependency link');
    }
  };

  const openArchitectureMap = async (entityType: string, entityId: string) => {
    try {
      const res = await componentsApi.getArchitectureMap(entityType, entityId);
      setMapData((res as any)?.data || res);
      setIsMapOpen(true);
    } catch (err: any) {
      alert('Failed to load architecture dependency map');
    }
  };

  const getCriticalityBadge = (crit: string) => {
    switch (crit) {
      case 'TIER_1_CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            <ShieldAlert className="h-3 w-3" /> Tier 1 Critical
          </span>
        );
      case 'TIER_2_CORE':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            Tier 2 Core
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Tier 3 Supporting
          </span>
        );
    }
  };

  const filtered = components.filter(
    (c) =>
      c.component_name.toLowerCase().includes(search.toLowerCase()) ||
      c.component_code.toLowerCase().includes(search.toLowerCase()) ||
      c.technology_stack?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Cpu className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Software Components Catalog
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Scoped component catalog, architecture dependency maps, and authorized work/defect/debt drill-downs.
          </p>
        </div>

        {canManage && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition"
          >
            <Plus className="h-4 w-4" />
            New Component
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search components by code, name, tech stack..."
            className="w-full bg-transparent text-xs text-slate-800 focus:outline-hidden dark:text-slate-200"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={criticalityFilter}
            onChange={(e) => setCriticalityFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <option value="">All Criticalities</option>
            <option value="TIER_1_CRITICAL">Tier 1 Critical</option>
            <option value="TIER_2_CORE">Tier 2 Core</option>
            <option value="TIER_3_SUPPORTING">Tier 3 Supporting</option>
          </select>

          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <option value="">All Owner Teams</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.team_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Components Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">
          Loading software components catalog...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-800">
          <Cpu className="h-8 w-8 mx-auto text-slate-400" />
          <p className="mt-2 font-medium text-sm text-slate-700 dark:text-slate-300">
            No software components registered
          </p>
          <p className="text-xs text-slate-400">
            Define backend services, frontend apps, shared modules, and SDKs.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((comp) => (
            <div
              key={comp.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-blue-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400">
                        {comp.component_code}
                      </span>
                      {getCriticalityBadge(comp.criticality)}
                    </div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white mt-1">
                      {comp.component_name}
                    </h3>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(comp)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Edit component"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteComponent(comp.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                        title="Deactivate component"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <p className="mt-2 text-xs text-slate-500 line-clamp-2 dark:text-slate-400">
                  {comp.description || 'No description recorded.'}
                </p>

                {/* Tech Stack & Scope */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
                  {comp.technology_stack && (
                    <span className="flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <Code2 className="h-3 w-3 text-slate-500" />
                      {comp.technology_stack}
                    </span>
                  )}
                  <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                    {comp.project_name ? `Project: ${comp.project_name}` : `Product: ${comp.product_name}`}
                  </span>
                </div>

                {/* Team & Lead */}
                <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 p-2.5 text-xs dark:bg-slate-800/40">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Owner Team</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {comp.owner_team_name || 'Unassigned'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Tech Lead</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {comp.tech_lead_name || 'Unassigned'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer KPI & Actions */}
              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span><strong>{comp.task_count || 0}</strong> tasks</span>
                  <span>•</span>
                  <span><strong>{(comp.outbound_dep_count || 0) + (comp.inbound_dep_count || 0)}</strong> deps</span>
                </div>

                <div className="flex items-center gap-2">
                  {comp.project_id && (
                    <button
                      onClick={() => openArchitectureMap('PROJECT', comp.project_id!)}
                      title="Architecture dependency map"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-800"
                    >
                      <Network className="h-4 w-4" />
                    </button>
                  )}

                  <button
                    onClick={() => openDashboard(comp)}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    Drill-Down
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Component Create / Edit Modal */}
      {isComponentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {editingComponent ? 'Edit Software Component' : 'Register Software Component'}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Module catalog with ownership, technology stack, and architecture links.
            </p>

            <form onSubmit={handleSaveComponent} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Scope Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    disabled={Boolean(editingComponent)}
                    value={entityType}
                    onChange={(e) => setEntityType(e.target.value as any)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-50"
                  >
                    <option value="PROJECT">Project Component</option>
                    <option value="PRODUCT">Product Component</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {entityType === 'PROJECT' ? 'Project' : 'Product'} <span className="text-rose-500">*</span>
                  </label>
                  {entityType === 'PROJECT' ? (
                    <select
                      required
                      disabled={Boolean(editingComponent)}
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-50"
                    >
                      <option value="">Select Project</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.project_name}</option>
                      ))}
                    </select>
                  ) : (
                    <select
                      required
                      disabled={Boolean(editingComponent)}
                      value={productId}
                      onChange={(e) => setProductId(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-50"
                    >
                      <option value="">Select Product</option>
                      {products.map((pr) => (
                        <option key={pr.id} value={pr.id}>{pr.product_name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Component Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingComponent)}
                    value={componentCode}
                    onChange={(e) => setComponentCode(e.target.value.toUpperCase())}
                    placeholder="e.g. CMP-AUTH-SRV"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-mono uppercase focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Component Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={componentName}
                    onChange={(e) => setComponentName(e.target.value)}
                    placeholder="e.g. Authentication Service"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Architectural boundary and responsibilities..."
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Criticality
                  </label>
                  <select
                    value={criticality}
                    onChange={(e) => setCriticality(e.target.value as any)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="TIER_1_CRITICAL">Tier 1 Critical</option>
                    <option value="TIER_2_CORE">Tier 2 Core</option>
                    <option value="TIER_3_SUPPORTING">Tier 3 Supporting</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Owner Team
                  </label>
                  <select
                    value={ownerTeamId}
                    onChange={(e) => setOwnerTeamId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="">Unassigned</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.team_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Technical Lead
                  </label>
                  <select
                    value={techLeadUserId}
                    onChange={(e) => setTechLeadUserId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.first_name} {u.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Technology Stack
                </label>
                <input
                  type="text"
                  value={technologyStack}
                  onChange={(e) => setTechnologyStack(e.target.value)}
                  placeholder="e.g. Node.js, TypeScript, PostgreSQL, Redis"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Documentation URL
                  </label>
                  <input
                    type="url"
                    value={documentationUrl}
                    onChange={(e) => setDocumentationUrl(e.target.value)}
                    placeholder="https://docs.example.com/architecture"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Repository URL
                  </label>
                  <input
                    type="url"
                    value={repositoryUrl}
                    onChange={(e) => setRepositoryUrl(e.target.value)}
                    placeholder="https://github.com/org/repo"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsComponentModalOpen(false)}
                  className="rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
                >
                  <Check className="h-3.5 w-3.5" />
                  Save Component
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Component Drill-Down Dashboard Modal */}
      {isDashboardOpen && selectedDashboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                      {selectedDashboard.component.component_code}
                    </span>
                    {getCriticalityBadge(selectedDashboard.component.criticality)}
                  </div>
                  <h2 className="font-bold text-xl text-slate-900 dark:text-white mt-1">
                    {selectedDashboard.component.component_name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Owner Team: <strong>{selectedDashboard.component.owner_team_name || 'Unassigned'}</strong> • Lead: <strong>{selectedDashboard.component.tech_lead_name || 'Unassigned'}</strong> • Stack: <strong>{selectedDashboard.component.technology_stack || 'N/A'}</strong>
                  </p>
                </div>

                <button
                  onClick={() => setIsDashboardOpen(false)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 mt-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Total Work</span>
                  <p className="mt-1 text-xl font-bold text-slate-800 dark:text-slate-100">
                    {selectedDashboard.summary.totalTasksCount}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-blue-50/60 p-3 dark:border-blue-900/40 dark:bg-blue-950/20">
                  <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400">Active Work</span>
                  <p className="mt-1 text-xl font-bold text-blue-700 dark:text-blue-300">
                    {selectedDashboard.summary.activeTasksCount}
                  </p>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 dark:border-rose-900/40 dark:bg-rose-950/20">
                  <span className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400">Defects</span>
                  <p className="mt-1 text-xl font-bold text-rose-700 dark:text-rose-300">
                    {selectedDashboard.summary.defectsCount}
                  </p>
                </div>
                <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-3 dark:border-purple-900/40 dark:bg-purple-950/20">
                  <span className="text-[10px] font-bold uppercase text-purple-600 dark:text-purple-400">Tech Debt</span>
                  <p className="mt-1 text-xl font-bold text-purple-700 dark:text-purple-300">
                    {selectedDashboard.summary.techDebtCount}
                  </p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                  <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">Critical Issues</span>
                  <p className="mt-1 text-xl font-bold text-amber-700 dark:text-amber-300">
                    {selectedDashboard.summary.criticalIssuesCount}
                  </p>
                </div>
              </div>

              {/* View Switcher Tabs */}
              <div className="flex border-b border-slate-200 mt-4 gap-2 dark:border-slate-800">
                <button
                  onClick={() => setDashboardTab('active')}
                  className={`border-b-2 px-3 py-2 text-xs font-semibold transition ${
                    dashboardTab === 'active'
                      ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  Active Work ({selectedDashboard.activeTasks.length})
                </button>
                <button
                  onClick={() => setDashboardTab('bugs')}
                  className={`border-b-2 px-3 py-2 text-xs font-semibold transition ${
                    dashboardTab === 'bugs'
                      ? 'border-rose-600 text-rose-600 dark:border-rose-400 dark:text-rose-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  Bugs & Defects ({selectedDashboard.defects.length})
                </button>
                <button
                  onClick={() => setDashboardTab('debt')}
                  className={`border-b-2 px-3 py-2 text-xs font-semibold transition ${
                    dashboardTab === 'debt'
                      ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  Technical Debt ({selectedDashboard.techDebt.length})
                </button>
                <button
                  onClick={() => setDashboardTab('deps')}
                  className={`border-b-2 px-3 py-2 text-xs font-semibold transition ${
                    dashboardTab === 'deps'
                      ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  Architecture Dependencies ({((selectedDashboard.component.outboundDependencies?.length || 0) + (selectedDashboard.component.inboundDependencies?.length || 0))})
                </button>
              </div>
            </div>

            {/* Tab Contents */}
            <div className="p-6 overflow-y-auto flex-1">
              {dashboardTab === 'active' && (
                <div className="space-y-2">
                  {selectedDashboard.activeTasks.length === 0 ? (
                    <p className="py-8 text-center text-xs text-slate-400">No active work items linked to this component.</p>
                  ) : (
                    selectedDashboard.activeTasks.map((task) => (
                      <div key={task.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{task.task_code}</span>
                            <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">{task.title}</span>
                          </div>
                          <p className="text-[10px] text-slate-400">
                            Type: {task.type_name || 'Task'} • Priority: {task.priority} • Status: {task.status_name}
                          </p>
                        </div>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {task.status_name}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {dashboardTab === 'bugs' && (
                <div className="space-y-2">
                  {selectedDashboard.defects.length === 0 ? (
                    <p className="py-8 text-center text-xs text-slate-400">No defect items linked to this component.</p>
                  ) : (
                    selectedDashboard.defects.map((task) => (
                      <div key={task.id} className="flex items-center justify-between rounded-xl border border-rose-100 bg-rose-50/30 p-3 dark:border-rose-950/40 dark:bg-rose-950/10">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-rose-600">{task.task_code}</span>
                            <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">{task.title}</span>
                          </div>
                          <p className="text-[10px] text-slate-400">
                            Severity: <strong className="text-rose-600">{task.severity || 'Medium'}</strong> • Resolution: {task.resolution || 'Unresolved'}
                          </p>
                        </div>
                        <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                          {task.status_name}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {dashboardTab === 'debt' && (
                <div className="space-y-2">
                  {selectedDashboard.techDebt.length === 0 ? (
                    <p className="py-8 text-center text-xs text-slate-400">No technical debt items linked to this component.</p>
                  ) : (
                    selectedDashboard.techDebt.map((task) => (
                      <div key={task.id} className="flex items-center justify-between rounded-xl border border-purple-100 bg-purple-50/30 p-3 dark:border-purple-950/40 dark:bg-purple-950/10">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-purple-600">{task.task_code}</span>
                            <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">{task.title}</span>
                          </div>
                          <p className="text-[10px] text-slate-400">
                            Priority: {task.priority} • Status: {task.status_name}
                          </p>
                        </div>
                        <span className="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                          Tech Debt
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {dashboardTab === 'deps' && (
                <div className="space-y-6">
                  {/* Outbound Dependencies */}
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">
                      Depends On (Outbound Dependencies)
                    </h4>
                    {selectedDashboard.component.outboundDependencies?.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">This component has no outbound dependencies.</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedDashboard.component.outboundDependencies?.map((dep) => (
                          <div key={dep.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-2.5 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                              <ArrowRight className="h-4 w-4 text-blue-500" />
                              <div>
                                <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{dep.component_code}</span>
                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 ml-2">{dep.component_name}</span>
                                <span className="ml-2 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                                  {dep.dependency_type}
                                </span>
                              </div>
                            </div>
                            {canManage && (
                              <button
                                onClick={() => handleRemoveDependency(dep.id)}
                                className="text-slate-400 hover:text-rose-600 p-1"
                                title="Remove dependency link"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Inbound Dependencies */}
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">
                      Depended On By (Inbound Dependencies)
                    </h4>
                    {selectedDashboard.component.inboundDependencies?.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No components depend on this component.</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedDashboard.component.inboundDependencies?.map((dep) => (
                          <div key={dep.id} className="flex items-center gap-2 rounded-xl border border-slate-100 p-2.5 dark:border-slate-800">
                            <ArrowLeft className="h-4 w-4 text-emerald-500" />
                            <div>
                              <span className="font-mono text-xs font-bold text-emerald-600">{dep.component_code}</span>
                              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 ml-2">{dep.component_name}</span>
                              <span className="ml-2 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                {dep.dependency_type}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add Architecture Dependency Form */}
                  {canManage && (
                    <form onSubmit={handleAddDependency} className="rounded-xl bg-slate-50 p-4 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800 space-y-3">
                      <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        Add Architecture Dependency Edge
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Links represent architectural relationships (APIs, shared DB, events). Reciprocal links are fully supported.
                      </p>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            Target Component
                          </label>
                          <select
                            required
                            value={newDepTargetId}
                            onChange={(e) => setNewDepTargetId(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          >
                            <option value="">Select Target Component</option>
                            {components
                              .filter((c) => c.id !== selectedDashboard.component.id)
                              .map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.component_code} — {c.component_name}
                                </option>
                              ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            Relationship Type
                          </label>
                          <select
                            value={newDepType}
                            onChange={(e) => setNewDepType(e.target.value as any)}
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          >
                            <option value="CONSUMES_API">Consumes API (REST / gRPC)</option>
                            <option value="CALLS_SERVICE">Calls Service</option>
                            <option value="SHARED_DATABASE">Shared Database / Schema</option>
                            <option value="EVENT_PUBSUB">Event Pub/Sub (Kafka / RabbitMQ)</option>
                            <option value="CLIENT_SDK">Client SDK</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Link Dependency
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Architecture Map Modal */}
      {isMapOpen && mapData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Network className="h-5 w-5 text-blue-600" />
                  Component Architecture Map
                </h3>
                <p className="text-xs text-slate-500">
                  {mapData.nodes.length} components • {mapData.links.length} architectural dependency edges
                </p>
              </div>
              <button
                onClick={() => setIsMapOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-1">
              {mapData.nodes.map((node) => {
                const outbound = mapData.links.filter((l) => l.source_id === node.id);
                const inbound = mapData.links.filter((l) => l.target_id === node.id);
                return (
                  <div key={node.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                    <span className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400">
                      {node.component_code}
                    </span>
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">{node.component_name}</h4>
                    <p className="text-[10px] text-slate-400 mt-1">{node.technology_stack || 'Stack unspecified'}</p>

                    <div className="mt-3 flex items-center justify-between text-[10px] border-t border-slate-200/60 pt-2 dark:border-slate-700/60">
                      <span className="text-blue-600">→ Calls {outbound.length}</span>
                      <span className="text-emerald-600">← Called by {inbound.length}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex justify-end border-t border-slate-100 pt-3 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsMapOpen(false)}
                className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
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
