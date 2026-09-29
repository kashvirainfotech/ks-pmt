import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { workflowSchemesApi, mastersApi, projectsApi, productsApi } from '../../api/endpoints';
import api from '../../api/client';
import {
  WorkflowScheme,
  WorkflowSchemeTransition,
  WorkflowValidationResult,
  TaskWorkflowStatus,
  Project,
  Product,
  TaskType,
} from '../../types';
import {
  GitMerge,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Copy,
  Check,
  X,
  Shield,
  FileCheck,
  FolderGit2,
  Search,
  Filter,
  Eye,
  ArrowRight,
  Info,
  Clock,
  Sparkles,
} from 'lucide-react';

export const WorkflowSchemesEditorView: React.FC = () => {
  const { user, hasPermission } = useAuth();

  // Data states
  const [schemes, setSchemes] = useState<WorkflowScheme[]>([]);
  const [statuses, setStatuses] = useState<TaskWorkflowStatus[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [scopeFilter, setScopeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Active Editing Scheme
  const [selectedScheme, setSelectedScheme] = useState<WorkflowScheme | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editedTransitions, setEditedTransitions] = useState<WorkflowSchemeTransition[]>([]);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [validationResult, setValidationResult] = useState<WorkflowValidationResult | null>(null);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);

  // Forms
  const [newSchemeCode, setNewSchemeCode] = useState('');
  const [newSchemeName, setNewSchemeName] = useState('');
  const [newSchemeDesc, setNewSchemeDesc] = useState('');
  const [newSchemeScope, setNewSchemeScope] = useState<'GLOBAL' | 'PROJECT' | 'PRODUCT'>('GLOBAL');
  const [newProjectId, setNewProjectId] = useState('');
  const [newProductId, setNewProductId] = useState('');
  const [newTaskTypeId, setNewTaskTypeId] = useState('');

  // Clone Form
  const [cloneTargetScope, setCloneTargetScope] = useState<'GLOBAL' | 'PROJECT' | 'PRODUCT'>('PROJECT');
  const [cloneProjectId, setCloneProjectId] = useState('');
  const [cloneProductId, setCloneProductId] = useState('');
  const [cloneCode, setCloneCode] = useState('');
  const [cloneName, setCloneName] = useState('');

  // Remapping Form for Publishing
  const [activeTaskRemapping, setActiveTaskRemapping] = useState<Record<string, string>>({});

  const canManage = hasPermission('WORKFLOWS:MANAGE') || user?.role_code === 'ROLE_SUPER_ADMIN';

  // Load Schemes & Masters
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [schemesRes, statusesRes, projectsRes, productsRes, typesRes] = await Promise.all([
        workflowSchemesApi.getSchemes(),
        mastersApi.getWorkflowStatuses(),
        projectsApi.getProjects(),
        productsApi.getProducts(),
        mastersApi.getTaskTypes(),
      ]);

      setSchemes(schemesRes.data || []);
      setStatuses(statusesRes.data || []);
      setProjects(projectsRes.data || []);
      setProducts(productsRes.data || []);
      setTaskTypes(typesRes.data || []);
    } catch (err: any) {
      console.error('Failed to load workflow data:', err);
      setError(err?.response?.data?.message || 'Failed to load workflow schemes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open Transition Editor
  const openEditor = async (scheme: WorkflowScheme) => {
    try {
      const fullSchemeRes = await workflowSchemesApi.getSchemeById(scheme.id);
      const full = fullSchemeRes.data;
      setSelectedScheme(full);
      setEditedTransitions(full.transitions || []);
      setIsEditorOpen(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load scheme transitions');
    }
  };

  // Add a new transition in the editor
  const addTransition = () => {
    if (statuses.length < 2) return;
    const defaultFrom = statuses[0].id;
    const defaultTo = statuses[1].id;

    setEditedTransitions([
      ...editedTransitions,
      {
        from_status_id: defaultFrom,
        to_status_id: defaultTo,
        allowed_roles: [],
        required_fields: [],
        requires_release_association: false,
        requires_qa_signoff: false,
        requires_resolution: false,
        manual_gate_name: '',
        transition_notes_prompt: '',
      },
    ]);
  };

  // Remove transition
  const removeTransition = (index: number) => {
    setEditedTransitions(editedTransitions.filter((_, i) => i !== index));
  };

  // Update specific transition property
  const updateTransition = (index: number, updates: Partial<WorkflowSchemeTransition>) => {
    const copy = [...editedTransitions];
    copy[index] = { ...copy[index], ...updates };
    setEditedTransitions(copy);
  };

  // Save Transitions
  const saveTransitions = async () => {
    if (!selectedScheme) return;
    try {
      await workflowSchemesApi.configureTransitions(selectedScheme.id, {
        transitions: editedTransitions.map((t) => ({
          fromStatusId: t.from_status_id,
          toStatusId: t.to_status_id,
          allowedRoles: t.allowed_roles,
          requiredFields: t.required_fields,
          requiresReleaseAssociation: t.requires_release_association,
          requiresQaSignoff: t.requires_qa_signoff,
          requiresResolution: t.requires_resolution,
          manualGateName: t.manual_gate_name,
          transitionNotesPrompt: t.transition_notes_prompt,
        })),
      });
      setSuccessMsg('Transitions and gate rules saved successfully.');
      loadData();
      setIsEditorOpen(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save transitions');
    }
  };

  // Validate Draft
  const handleValidateDraft = async (schemeId: string) => {
    try {
      const res = await workflowSchemesApi.validateDraft(schemeId);
      setValidationResult(res.data);
      setIsValidationModalOpen(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to validate workflow graph');
    }
  };

  // Open Publish Modal
  const openPublishModal = async (scheme: WorkflowScheme) => {
    setSelectedScheme(scheme);
    setActiveTaskRemapping({});
    setIsPublishModalOpen(true);
  };

  // Execute Publish
  const submitPublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScheme) return;
    try {
      await workflowSchemesApi.publishScheme(selectedScheme.id, {
        activeTaskRemapping: Object.keys(activeTaskRemapping).length > 0 ? activeTaskRemapping : undefined,
      });
      setIsPublishModalOpen(false);
      setSuccessMsg(`Workflow Scheme '${selectedScheme.scheme_name}' published successfully.`);
      loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to publish workflow scheme');
    }
  };

  // Create Scheme
  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await workflowSchemesApi.createScheme({
        schemeCode: newSchemeCode.trim().toUpperCase(),
        schemeName: newSchemeName.trim(),
        description: newSchemeDesc.trim() || undefined,
        scope: newSchemeScope,
        projectId: newSchemeScope === 'PROJECT' ? newProjectId : undefined,
        productId: newSchemeScope === 'PRODUCT' ? newProductId : undefined,
        taskTypeId: newTaskTypeId || undefined,
      });
      setIsCreateModalOpen(false);
      setNewSchemeCode('');
      setNewSchemeName('');
      setNewSchemeDesc('');
      setSuccessMsg('New workflow scheme created in DRAFT status.');
      loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create workflow scheme');
    }
  };

  // Clone Scheme
  const openCloneModal = (scheme: WorkflowScheme) => {
    setSelectedScheme(scheme);
    setCloneTargetScope('PROJECT');
    setCloneProjectId('');
    setCloneProductId('');
    setCloneCode(`${scheme.scheme_code}-COPY`);
    setCloneName(`${scheme.scheme_name} (Custom Override)`);
    setIsCloneModalOpen(true);
  };

  const submitClone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScheme) return;
    try {
      await workflowSchemesApi.cloneScheme(selectedScheme.id, {
        targetScope: cloneTargetScope,
        targetProjectId: cloneTargetScope === 'PROJECT' ? cloneProjectId : undefined,
        targetProductId: cloneTargetScope === 'PRODUCT' ? cloneProductId : undefined,
        newSchemeCode: cloneCode.trim().toUpperCase(),
        newSchemeName: cloneName.trim(),
      });
      setIsCloneModalOpen(false);
      setSuccessMsg('Scheme successfully cloned to new override scope.');
      loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to clone scheme');
    }
  };

  // Filter schemes
  const filteredSchemes = schemes.filter((s) => {
    const matchScope = scopeFilter === 'ALL' || s.scope === scopeFilter;
    const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;
    const matchSearch =
      searchQuery === '' ||
      s.scheme_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.scheme_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.project_name && s.project_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.product_name && s.product_name.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchScope && matchStatus && matchSearch;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-sm">
              <GitMerge className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Workflow Schemes & Transition Gates
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Visual workflow editor, versioned project/product overrides, draft reachability validation, and gate rule enforcement (CONFIG-001)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {canManage && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Scheme
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between text-rose-800 text-sm dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="p-1 hover:bg-rose-200 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-emerald-800 text-sm dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="p-1 hover:bg-emerald-200 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Scope / Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search schemes by code, name, project, or product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value)}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Scopes</option>
            <option value="GLOBAL">Global Shared Defaults</option>
            <option value="PROJECT">Project Overrides</option>
            <option value="PRODUCT">Product Overrides</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="PUBLISHED">Published (Active)</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      {/* Schemes Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Loading workflow schemes...</div>
      ) : filteredSchemes.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <GitMerge className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            No Workflow Schemes Found
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            Create a global baseline workflow scheme or customize a project-specific override to enforce customized status transitions and gates.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSchemes.map((scheme) => (
            <div
              key={scheme.id}
              className={`bg-white dark:bg-slate-900 rounded-xl border p-5 shadow-sm space-y-4 transition-all hover:shadow-md ${
                scheme.status === 'PUBLISHED'
                  ? 'border-emerald-200 dark:border-emerald-900/60'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              {/* Header Badges */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono text-xs font-bold text-slate-500 uppercase">
                    {scheme.scheme_code}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {scheme.scheme_name}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {/* Status Badge */}
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                      scheme.status === 'PUBLISHED'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : scheme.status === 'DRAFT'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {scheme.status}
                  </span>

                  {/* Scope Badge */}
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                      scheme.scope === 'PROJECT'
                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                        : scheme.scope === 'PRODUCT'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                    }`}
                  >
                    {scheme.scope}
                  </span>
                </div>
              </div>

              {/* Scoped Entity Details */}
              <div className="text-xs text-slate-500 space-y-1">
                {scheme.project_name && (
                  <div className="flex items-center gap-1">
                    <FolderGit2 className="w-3.5 h-3.5 text-indigo-500" />
                    Project: <strong className="text-slate-700 dark:text-slate-200">{scheme.project_name}</strong>
                  </div>
                )}
                {scheme.product_name && (
                  <div className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-purple-500" />
                    Product: <strong className="text-slate-700 dark:text-slate-200">{scheme.product_name}</strong>
                  </div>
                )}
                {scheme.task_type_name && (
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Task Type: <strong className="text-slate-700 dark:text-slate-200">{scheme.task_type_name}</strong>
                  </div>
                )}
                <div className="flex items-center gap-1 pt-1">
                  <GitMerge className="w-3.5 h-3.5 text-slate-400" />
                  <span>Configured Transitions: <strong>{scheme.transitions_count || 0}</strong></span>
                </div>
              </div>

              {scheme.description && (
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                  {scheme.description}
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                <button
                  onClick={() => openEditor(scheme)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-xs font-semibold rounded-lg transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Visual Editor
                </button>

                <button
                  onClick={() => handleValidateDraft(scheme.id)}
                  className="flex items-center justify-center gap-1 px-2.5 py-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 text-xs font-medium rounded border border-slate-200 dark:border-slate-700"
                  title="Validate Graph Reachability"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  Validate
                </button>

                {canManage && scheme.status === 'DRAFT' && (
                  <button
                    onClick={() => openPublishModal(scheme)}
                    className="flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Publish
                  </button>
                )}

                {canManage && (
                  <button
                    onClick={() => openCloneModal(scheme)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Clone to new scope"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DRAWER / MODAL: Visual Transition & Gate Editor */}
      {isEditorOpen && selectedScheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-indigo-600" />
                  Visual Transition & Gate Rules Editor
                </h2>
                <p className="text-xs text-slate-500">
                  Editing: <strong>{selectedScheme.scheme_name}</strong> ({selectedScheme.scheme_code} - {selectedScheme.scope})
                </p>
              </div>
              <button onClick={() => setIsEditorOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Configured Transitions ({editedTransitions.length})
                </span>
                <button
                  type="button"
                  onClick={addTransition}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Transition
                </button>
              </div>

              {editedTransitions.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No transitions configured yet. Click "Add Transition" to build the state machine.
                </div>
              ) : (
                <div className="space-y-4">
                  {editedTransitions.map((t, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1">
                          {/* From Status */}
                          <div className="flex-1">
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                              From Status
                            </label>
                            <select
                              value={t.from_status_id}
                              onChange={(e) => updateTransition(idx, { from_status_id: e.target.value })}
                              className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-semibold"
                            >
                              {statuses.map((st) => (
                                <option key={st.id} value={st.id}>
                                  {st.status_name} ({st.status_category})
                                </option>
                              ))}
                            </select>
                          </div>

                          <ArrowRight className="w-4 h-4 text-slate-400 mt-5 flex-shrink-0" />

                          {/* To Status */}
                          <div className="flex-1">
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                              To Status (Target)
                            </label>
                            <select
                              value={t.to_status_id}
                              onChange={(e) => updateTransition(idx, { to_status_id: e.target.value })}
                              className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-semibold"
                            >
                              {statuses.map((st) => (
                                <option key={st.id} value={st.id}>
                                  {st.status_name} ({st.status_category})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeTransition(idx)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded mt-4"
                          title="Remove Transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Gate Rules Configuration */}
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Manual Gate Label (e.g. QA Sign-off Gate)
                          </label>
                          <input
                            type="text"
                            value={t.manual_gate_name || ''}
                            onChange={(e) => updateTransition(idx, { manual_gate_name: e.target.value })}
                            placeholder="e.g. QA Acceptance Review"
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Required Fields (comma separated)
                          </label>
                          <input
                            type="text"
                            value={(t.required_fields || []).join(', ')}
                            onChange={(e) =>
                              updateTransition(idx, {
                                required_fields: e.target.value
                                  .split(',')
                                  .map((s) => s.trim())
                                  .filter(Boolean),
                              })
                            }
                            placeholder="description, estimated_hours, staging_url"
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Permitted Roles (leave empty for all roles)
                          </label>
                          <input
                            type="text"
                            value={(t.allowed_roles || []).join(', ')}
                            onChange={(e) =>
                              updateTransition(idx, {
                                allowed_roles: e.target.value
                                  .split(',')
                                  .map((s) => s.trim())
                                  .filter(Boolean),
                              })
                            }
                            placeholder="ROLE_QA_ENGINEER, ROLE_ADMIN"
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            User Transition Prompt / Instructions
                          </label>
                          <input
                            type="text"
                            value={t.transition_notes_prompt || ''}
                            onChange={(e) => updateTransition(idx, { transition_notes_prompt: e.target.value })}
                            placeholder="Verify test report before moving to Ready for Release"
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                          />
                        </div>
                      </div>

                      {/* Checkboxes for Automated Gates */}
                      <div className="flex items-center gap-5 pt-1 text-xs text-slate-700 dark:text-slate-300 flex-wrap">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={t.requires_release_association || false}
                            onChange={(e) =>
                              updateTransition(idx, { requires_release_association: e.target.checked })
                            }
                            className="rounded text-indigo-600"
                          />
                          Requires Target Release (version_id)
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={t.requires_resolution || false}
                            onChange={(e) =>
                              updateTransition(idx, { requires_resolution: e.target.checked })
                            }
                            className="rounded text-indigo-600"
                          />
                          Requires Resolution Classification
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveTransitions}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm"
              >
                Save Transitions & Gates
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Graph Validation Result */}
      {isValidationModalOpen && validationResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-indigo-600" />
                Workflow Graph Soundness Validation
              </h2>
              <button onClick={() => setIsValidationModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div
                className={`p-3 rounded-lg text-sm font-bold flex items-center gap-2 ${
                  validationResult.isValid
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200'
                    : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200'
                }`}
              >
                {validationResult.isValid ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Workflow is Structurally Sound and Reachable!
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                    Validation Failed: Fix Graph Errors Before Publishing
                  </>
                )}
              </div>

              {validationResult.errors.length > 0 && (
                <div className="space-y-1">
                  <span className="text-xs font-bold text-rose-600">Errors:</span>
                  <ul className="list-disc pl-5 text-xs text-rose-700 dark:text-rose-300 space-y-1">
                    {validationResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validationResult.warnings.length > 0 && (
                <div className="space-y-1">
                  <span className="text-xs font-bold text-amber-600">Warnings:</span>
                  <ul className="list-disc pl-5 text-xs text-amber-700 dark:text-amber-300 space-y-1">
                    {validationResult.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                <span>Unique Statuses: <strong>{validationResult.statusCount}</strong></span>
                <span>Transitions: <strong>{validationResult.totalTransitions}</strong></span>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsValidationModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Safe Publishing with Task Remapping (Acceptance Rule) */}
      {isPublishModalOpen && selectedScheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Publish Workflow Scheme
              </h2>
              <button onClick={() => setIsPublishModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Publishing will activate this workflow scheme for all associated tasks in its scope. Any previous published scheme for this scope will be automatically archived.
            </p>

            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-900 dark:bg-indigo-950/40 dark:border-indigo-900 dark:text-indigo-200">
              <strong>Stranded Task Prevention:</strong> If active tasks currently sit in a status not included in the new workflow, you will be prompted to provide target remapping so zero active work is left in a deprecated status.
            </div>

            <form onSubmit={submitPublish} className="space-y-4">
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPublishModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm"
                >
                  Confirm & Publish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Create Scheme */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                Create Workflow Scheme
              </h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Scheme Scope *
                </label>
                <select
                  value={newSchemeScope}
                  onChange={(e) => setNewSchemeScope(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-semibold"
                >
                  <option value="GLOBAL">Global Shared Default Scheme</option>
                  <option value="PROJECT">Project-Specific Override</option>
                  <option value="PRODUCT">Product-Specific Override</option>
                </select>
              </div>

              {newSchemeScope === 'PROJECT' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Target Project *
                  </label>
                  <select
                    value={newProjectId}
                    onChange={(e) => setNewProjectId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                    required
                  >
                    <option value="">-- Choose Project --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.project_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {newSchemeScope === 'PRODUCT' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Target Product *
                  </label>
                  <select
                    value={newProductId}
                    onChange={(e) => setNewProductId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                    required
                  >
                    <option value="">-- Choose Product --</option>
                    {products.map((pr) => (
                      <option key={pr.id} value={pr.id}>
                        {pr.product_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Scheme Code *
                  </label>
                  <input
                    type="text"
                    value={newSchemeCode}
                    onChange={(e) => setNewSchemeCode(e.target.value)}
                    placeholder="e.g. WF-PRJ-NEXGEN"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono uppercase"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Task Type (Optional)
                  </label>
                  <select
                    value={newTaskTypeId}
                    onChange={(e) => setNewTaskTypeId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                  >
                    <option value="">-- All Task Types --</option>
                    {taskTypes.map((tt) => (
                      <option key={tt.id} value={tt.id}>
                        {tt.type_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Scheme Display Name *
                </label>
                <input
                  type="text"
                  value={newSchemeName}
                  onChange={(e) => setNewSchemeName(e.target.value)}
                  placeholder="e.g. NexGen Mobile Agile Workflow"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newSchemeDesc}
                  onChange={(e) => setNewSchemeDesc(e.target.value)}
                  placeholder="Workflow objectives and special transition rules..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm"
                >
                  Create Scheme
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Clone Scheme */}
      {isCloneModalOpen && selectedScheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Copy className="w-5 h-5 text-indigo-600" />
                Clone Workflow Scheme
              </h2>
              <button onClick={() => setIsCloneModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Clone <strong>{selectedScheme.scheme_name}</strong> to easily create a tailored project or product override preserving existing transitions and gate rules.
            </p>

            <form onSubmit={submitClone} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Scope *
                </label>
                <select
                  value={cloneTargetScope}
                  onChange={(e) => setCloneTargetScope(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-semibold"
                >
                  <option value="PROJECT">Project-Specific Override</option>
                  <option value="PRODUCT">Product-Specific Override</option>
                  <option value="GLOBAL">Global Shared Scheme</option>
                </select>
              </div>

              {cloneTargetScope === 'PROJECT' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Project *
                  </label>
                  <select
                    value={cloneProjectId}
                    onChange={(e) => setCloneProjectId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                    required
                  >
                    <option value="">-- Choose Project --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.project_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {cloneTargetScope === 'PRODUCT' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Product *
                  </label>
                  <select
                    value={cloneProductId}
                    onChange={(e) => setCloneProductId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                    required
                  >
                    <option value="">-- Choose Product --</option>
                    {products.map((pr) => (
                      <option key={pr.id} value={pr.id}>
                        {pr.product_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Scheme Code *
                </label>
                <input
                  type="text"
                  value={cloneCode}
                  onChange={(e) => setCloneCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Scheme Name *
                </label>
                <input
                  type="text"
                  value={cloneName}
                  onChange={(e) => setCloneName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCloneModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm"
                >
                  Confirm Clone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
