import React, { useState, useEffect, useMemo } from 'react';
import {
  FolderKanban,
  FileText,
  Repeat,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  History,
  Layers,
  ChevronRight,
  Eye,
  Trash2,
  Edit3,
  Copy,
  ArrowRight,
  Building,
  Briefcase,
  CheckSquare,
  ShieldAlert,
  X,
  Sparkles,
} from 'lucide-react';
import {
  templatesApi,
  projectsApi,
  productsApi,
  mastersApi,
} from '../../api/endpoints';
import {
  ProjectTemplate,
  TaskTemplate,
  RecurringWorkRule,
  RecurringTaskOccurrence,
  ProjectTemplateCategory,
  RecurrenceFrequency,
  Client,
  Project,
  Product,
  User,
} from '../../types';

export const TemplatesWorkspaceView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'project-templates' | 'task-templates' | 'recurring-rules'
  >('project-templates');

  // Data states
  const [projectTemplates, setProjectTemplates] = useState<ProjectTemplate[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [recurringRules, setRecurringRules] = useState<RecurringWorkRule[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [bannerMessage, setBannerMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [previewTemplate, setPreviewTemplate] = useState<ProjectTemplate | null>(null);
  const [instantiateProjectModal, setInstantiateProjectModal] = useState<ProjectTemplate | null>(null);
  const [instantiateTaskModal, setInstantiateTaskModal] = useState<TaskTemplate | null>(null);
  const [createProjectModal, setCreateProjectModal] = useState<boolean>(false);
  const [createTaskModal, setCreateTaskModal] = useState<boolean>(false);
  const [createRuleModal, setCreateRuleModal] = useState<boolean>(false);
  const [occurrenceHistoryModal, setOccurrenceHistoryModal] = useState<RecurringWorkRule | null>(null);
  const [occurrences, setOccurrences] = useState<RecurringTaskOccurrence[]>([]);
  const [triggerRuleModal, setTriggerRuleModal] = useState<RecurringWorkRule | null>(null);

  // Form states
  const [instantiateProjectForm, setInstantiateProjectForm] = useState({
    anchorStartDate: new Date().toISOString().split('T')[0],
    projectCode: '',
    projectName: '',
    clientId: '',
    projectManagerId: '',
    description: '',
  });

  const [instantiateTaskForm, setInstantiateTaskForm] = useState({
    anchorStartDate: new Date().toISOString().split('T')[0],
    targetType: 'PROJECT',
    projectId: '',
    productId: '',
    assigneeUserId: '',
  });

  const [newProjectTemplateForm, setNewProjectTemplateForm] = useState({
    templateCode: '',
    templateName: '',
    description: '',
    category: 'CLIENT_ONBOARDING' as ProjectTemplateCategory,
    targetEngagementModel: 'TIME_AND_MATERIALS',
    defaultEstimatedDurationDays: 30,
    milestones: [
      { name: 'Kickoff & Discovery', target_offset_days: 7, display_order: 1 },
      { name: 'Core Delivery & Integration', target_offset_days: 20, display_order: 2 },
      { name: 'UAT & Production Handoff', target_offset_days: 30, display_order: 3 },
    ],
  });

  const [newTaskTemplateForm, setNewTaskTemplateForm] = useState({
    projectTemplateId: '',
    taskTemplateCode: '',
    title: '',
    description: '',
    priority: 'MEDIUM',
    startOffsetDays: 0,
    durationDays: 3,
    estimatedHours: 8,
    defaultRoleCode: 'ROLE_DEVELOPER',
    checklists: [{ item: 'Initial setup & review', is_required: true }],
  });

  const [newRuleForm, setNewRuleForm] = useState({
    ruleCode: '',
    title: '',
    description: '',
    targetType: 'PROJECT',
    projectId: '',
    productId: '',
    taskTemplateId: '',
    frequency: 'WEEKLY' as RecurrenceFrequency,
    intervalCount: 1,
    dayOfWeek: 1,
    dayOfMonth: 1,
    nextRunDate: new Date().toISOString().split('T')[0],
    defaultPriority: 'MEDIUM',
  });

  const [triggerDateOverride, setTriggerDateOverride] = useState<string>(
    new Date().toISOString().split('T')[0],
  );

  // Load initial reference data
  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    loadTabData();
  }, [activeTab]);

  const loadLookups = async () => {
    try {
      const [cRes, pRes, prodRes, uRes] = await Promise.all([
        projectsApi.getClients().catch(() => ({ data: [] })),
        projectsApi.getProjects().catch(() => ({ data: [] })),
        productsApi.getProducts().catch(() => ({ data: [] })),
        mastersApi.getUsers().catch(() => ({ data: { items: [] } })),
      ]);
      setClients(cRes.data || []);
      setProjects((pRes.data as any)?.items || pRes.data || []);
      setProducts(prodRes.data || []);
      setUsers((uRes.data as any)?.items || (uRes.data as any) || []);
    } catch (err) {
      console.error('Failed to load lookup data:', err);
    }
  };

  const loadTabData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'project-templates') {
        const res = await templatesApi.getProjectTemplates();
        setProjectTemplates(res.data?.data || []);
      } else if (activeTab === 'task-templates') {
        const res = await templatesApi.getTaskTemplates();
        setTaskTemplates(res.data?.data || []);
      } else if (activeTab === 'recurring-rules') {
        const res = await templatesApi.getRecurrenceRules();
        setRecurringRules(res.data?.data || []);
      }
    } catch (err) {
      console.error('Error fetching tab data:', err);
    } finally {
      setLoading(false);
    }
  };

  const showBanner = (type: 'success' | 'error', text: string) => {
    setBannerMessage({ type, text });
    setTimeout(() => setBannerMessage(null), 6000);
  };

  // ==========================================
  // Handlers: Project Templates
  // ==========================================

  const handleOpenInstantiateProject = async (template: ProjectTemplate) => {
    // Fetch full detail with task templates
    try {
      const full = await templatesApi.getProjectTemplateById(template.id);
      setInstantiateProjectModal(full.data || template);
      setInstantiateProjectForm({
        anchorStartDate: new Date().toISOString().split('T')[0],
        projectCode: `PRJ-${Date.now().toString().slice(-4)}`,
        projectName: `${template.template_name} (${new Date().toLocaleDateString()})`,
        clientId: clients[0]?.id || '',
        projectManagerId: users[0]?.id || '',
        description: template.description || '',
      });
    } catch (err) {
      setInstantiateProjectModal(template);
    }
  };

  const handleExecuteProjectInstantiation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instantiateProjectModal) return;

    try {
      setLoading(true);
      const res = await templatesApi.instantiateProject(
        instantiateProjectModal.id,
        {
          anchorStartDate: instantiateProjectForm.anchorStartDate,
          projectCode: instantiateProjectForm.projectCode,
          projectName: instantiateProjectForm.projectName,
          clientId: instantiateProjectForm.clientId,
          projectManagerId: instantiateProjectForm.projectManagerId || undefined,
          description: instantiateProjectForm.description,
        },
      );
      setInstantiateProjectModal(null);
      showBanner(
        'success',
        `Successfully instantiated Project "${instantiateProjectForm.projectCode}"! Created ${res.data.milestones_created} milestone(s) and ${res.data.tasks_created} relative-date task(s).`,
      );
    } catch (err: any) {
      showBanner(
        'error',
        err.response?.data?.message || 'Failed to instantiate project template.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProjectTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await templatesApi.createProjectTemplate({
        templateCode: newProjectTemplateForm.templateCode || undefined,
        templateName: newProjectTemplateForm.templateName,
        description: newProjectTemplateForm.description,
        category: newProjectTemplateForm.category,
        targetEngagementModel: newProjectTemplateForm.targetEngagementModel,
        defaultEstimatedDurationDays: Number(newProjectTemplateForm.defaultEstimatedDurationDays),
        milestoneTemplates: newProjectTemplateForm.milestones,
      });
      setCreateProjectModal(false);
      showBanner('success', 'Project blueprint created successfully!');
      loadTabData();
    } catch (err: any) {
      showBanner('error', err.response?.data?.message || 'Failed to create template.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // Handlers: Task Templates
  // ==========================================

  const handleOpenInstantiateTask = (template: TaskTemplate) => {
    setInstantiateTaskModal(template);
    setInstantiateTaskForm({
      anchorStartDate: new Date().toISOString().split('T')[0],
      targetType: 'PROJECT',
      projectId: projects[0]?.id || '',
      productId: products[0]?.id || '',
      assigneeUserId: users[0]?.id || '',
    });
  };

  const handleExecuteTaskInstantiation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instantiateTaskModal) return;

    try {
      setLoading(true);
      await templatesApi.instantiateTask(instantiateTaskModal.id, {
        anchorStartDate: instantiateTaskForm.anchorStartDate,
        projectId:
          instantiateTaskForm.targetType === 'PROJECT'
            ? instantiateTaskForm.projectId
            : undefined,
        productId:
          instantiateTaskForm.targetType === 'PRODUCT'
            ? instantiateTaskForm.productId
            : undefined,
        assigneeUserId: instantiateTaskForm.assigneeUserId || undefined,
      });
      setInstantiateTaskModal(null);
      showBanner(
        'success',
        `Generated task from template "${instantiateTaskModal.title}" with relative offsets applied!`,
      );
    } catch (err: any) {
      showBanner('error', err.response?.data?.message || 'Failed to instantiate task.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTaskTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await templatesApi.createTaskTemplate({
        projectTemplateId: newTaskTemplateForm.projectTemplateId || undefined,
        taskTemplateCode: newTaskTemplateForm.taskTemplateCode || undefined,
        title: newTaskTemplateForm.title,
        description: newTaskTemplateForm.description,
        priority: newTaskTemplateForm.priority as any,
        startOffsetDays: Number(newTaskTemplateForm.startOffsetDays),
        durationDays: Number(newTaskTemplateForm.durationDays),
        estimatedHours: Number(newTaskTemplateForm.estimatedHours),
        defaultRoleCode: newTaskTemplateForm.defaultRoleCode,
        checklistsTemplate: newTaskTemplateForm.checklists,
      });
      setCreateTaskModal(false);
      showBanner('success', 'Task template added to library!');
      loadTabData();
    } catch (err: any) {
      showBanner('error', err.response?.data?.message || 'Failed to create task template.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // Handlers: Recurring Rules & Occurrences
  // ==========================================

  const handleOpenOccurrenceHistory = async (rule: RecurringWorkRule) => {
    setOccurrenceHistoryModal(rule);
    try {
      const res = await templatesApi.getRuleOccurrences(rule.id);
      setOccurrences(res.data || []);
    } catch (err) {
      console.error('Failed to load occurrences:', err);
    }
  };

  const handleOpenTriggerModal = (rule: RecurringWorkRule) => {
    setTriggerRuleModal(rule);
    setTriggerDateOverride(
      rule.next_run_date ? rule.next_run_date.split('T')[0] : new Date().toISOString().split('T')[0],
    );
  };

  const handleExecuteManualTrigger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!triggerRuleModal) return;

    try {
      setLoading(true);
      const res = await templatesApi.triggerRule(triggerRuleModal.id, {
        targetDate: triggerDateOverride,
      });
      setTriggerRuleModal(null);
      showBanner(
        'success',
        `Occurrence executed! Generated task "${res.data.generated_task?.task_code || 'Task'}". Next run advanced to ${res.data.next_run_date}.`,
      );
      loadTabData();
    } catch (err: any) {
      showBanner(
        'error',
        err.response?.data?.message || 'Failed to execute recurring occurrence.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRecurringRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await templatesApi.createRecurrenceRule({
        ruleCode: newRuleForm.ruleCode || undefined,
        title: newRuleForm.title,
        description: newRuleForm.description,
        projectId: newRuleForm.targetType === 'PROJECT' ? newRuleForm.projectId : undefined,
        productId: newRuleForm.targetType === 'PRODUCT' ? newRuleForm.productId : undefined,
        taskTemplateId: newRuleForm.taskTemplateId || undefined,
        frequency: newRuleForm.frequency,
        intervalCount: Number(newRuleForm.intervalCount),
        dayOfWeek: newRuleForm.frequency === 'WEEKLY' ? Number(newRuleForm.dayOfWeek) : undefined,
        dayOfMonth:
          ['MONTHLY', 'QUARTERLY', 'ANNUALLY'].includes(newRuleForm.frequency)
            ? Number(newRuleForm.dayOfMonth)
            : undefined,
        nextRunDate: newRuleForm.nextRunDate,
        defaultPriority: newRuleForm.defaultPriority,
      });
      setCreateRuleModal(false);
      showBanner('success', 'Recurring schedule rule registered successfully!');
      loadTabData();
    } catch (err: any) {
      showBanner('error', err.response?.data?.message || 'Failed to register recurring rule.');
    } finally {
      setLoading(false);
    }
  };

  // Filtered views
  const filteredProjectTemplates = useMemo(() => {
    return projectTemplates.filter((t) => {
      const matchSearch =
        !search ||
        t.template_name.toLowerCase().includes(search.toLowerCase()) ||
        t.template_code.toLowerCase().includes(search.toLowerCase());
      const matchCategory =
        selectedCategory === 'ALL' || t.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [projectTemplates, search, selectedCategory]);

  const filteredTaskTemplates = useMemo(() => {
    return taskTemplates.filter((t) => {
      return (
        !search ||
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.task_template_code.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [taskTemplates, search]);

  const filteredRecurringRules = useMemo(() => {
    return recurringRules.filter((r) => {
      return (
        !search ||
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.rule_code.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [recurringRules, search]);

  return (
    <div className="space-y-6 p-6">
      {/* Top Banner Message */}
      {bannerMessage && (
        <div
          className={`flex items-center justify-between rounded-xl p-4 text-sm font-medium shadow-sm transition-all ${
            bannerMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {bannerMessage.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
            )}
            <span>{bannerMessage.text}</span>
          </div>
          <button
            onClick={() => setBannerMessage(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header & Subtitle */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            Templates & Recurring Work
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Reusable engagement blueprints, relative-date task libraries & idempotent recurring schedules.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'project-templates' && (
            <button
              onClick={() => setCreateProjectModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <Plus className="h-4 w-4" />
              New Project Blueprint
            </button>
          )}

          {activeTab === 'task-templates' && (
            <button
              onClick={() => {
                // Populate project template selector in task template form
                templatesApi.getProjectTemplates().then((res) => {
                  setProjectTemplates(res.data?.data || []);
                });
                setCreateTaskModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" />
              New Task Template
            </button>
          )}

          {activeTab === 'recurring-rules' && (
            <button
              onClick={() => {
                templatesApi.getTaskTemplates().then((res) => {
                  setTaskTemplates(res.data?.data || []);
                });
                setCreateRuleModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" />
              New Recurring Schedule
            </button>
          )}
        </div>
      </div>

      {/* Workspace Navigation Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="-mb-px flex space-x-6">
          <button
            onClick={() => setActiveTab('project-templates')}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-medium transition-colors ${
              activeTab === 'project-templates'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <FolderKanban className="h-4 w-4" />
            Project Templates
            <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300 font-semibold">
              {projectTemplates.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('task-templates')}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-medium transition-colors ${
              activeTab === 'task-templates'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <FileText className="h-4 w-4" />
            Task Templates Library
            <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300 font-semibold">
              {taskTemplates.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('recurring-rules')}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-medium transition-colors ${
              activeTab === 'recurring-rules'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <Repeat className="h-4 w-4" />
            Recurring Schedules & Deduplication
            <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300 font-semibold">
              {recurringRules.length}
            </span>
          </button>
        </nav>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${
              activeTab === 'project-templates'
                ? 'project templates by title or code...'
                : activeTab === 'task-templates'
                ? 'task templates by title...'
                : 'recurring rules...'
            }`}
            className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        {activeTab === 'project-templates' && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="ALL">All Categories</option>
              <option value="CLIENT_ONBOARDING">Client Onboarding</option>
              <option value="FIXED_PRICE_DELIVERY">Fixed Price Delivery</option>
              <option value="MAINTENANCE_RETAINER">Maintenance Retainer</option>
              <option value="SECURITY_AUDIT">Security Audit</option>
              <option value="RELEASE_CHECKLIST">Release Checklist</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: PROJECT TEMPLATES */}
      {/* ======================================================== */}
      {activeTab === 'project-templates' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400 text-sm">
              Loading project blueprints...
            </div>
          ) : filteredProjectTemplates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-800">
              <FolderKanban className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                No project templates found
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Get started by creating a client onboarding or fixed-price blueprint.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProjectTemplates.map((template) => (
                <div
                  key={template.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-mono font-semibold text-blue-700 dark:bg-blue-950/70 dark:text-blue-300">
                        {template.template_code}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {template.category.replace('_', ' ')}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white line-clamp-1">
                        {template.template_name}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {template.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-2.5 text-xs dark:bg-slate-800/60">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                          Duration
                        </span>
                        <span className="font-medium text-slate-700 dark:text-slate-200">
                          {template.default_estimated_duration_days} days
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                          Engagement
                        </span>
                        <span className="font-medium text-slate-700 dark:text-slate-200">
                          {template.target_engagement_model}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                          Milestones
                        </span>
                        <span className="font-medium text-slate-700 dark:text-slate-200">
                          {template.milestone_templates?.length || 0} stages
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                          Task Templates
                        </span>
                        <span className="font-medium text-slate-700 dark:text-slate-200">
                          {template.task_templates_count ?? 0} tasks
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                    <button
                      onClick={async () => {
                        const full = await templatesApi.getProjectTemplateById(template.id);
                        setPreviewTemplate(full.data || template);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Structure
                    </button>

                    <button
                      onClick={() => handleOpenInstantiateProject(template)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-500"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Instantiate Project
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: TASK TEMPLATES LIBRARY */}
      {/* ======================================================== */}
      {activeTab === 'task-templates' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400 text-sm">
              Loading task templates...
            </div>
          ) : filteredTaskTemplates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-800">
              <FileText className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                No task templates in library
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Create reusable task checklists or release verification blueprints.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredTaskTemplates.map((tt) => (
                <div
                  key={tt.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="rounded-md bg-purple-50 px-2 py-0.5 text-xs font-mono font-semibold text-purple-700 dark:bg-purple-950/70 dark:text-purple-300">
                        {tt.task_template_code}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          tt.priority === 'URGENT'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300'
                            : tt.priority === 'HIGH'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {tt.priority}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white line-clamp-1">
                        {tt.title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {tt.description || 'No description provided.'}
                      </p>
                    </div>

                    {/* Relative offset pills */}
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300 font-mono">
                        <Calendar className="h-3 w-3" />
                        Start: +{tt.start_offset_days}d
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300 font-mono">
                        <Clock className="h-3 w-3" />
                        Duration: {tt.duration_days}d
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300 font-mono">
                        Est: {tt.estimated_hours}h
                      </span>
                    </div>

                    {tt.project_template_name ? (
                      <div className="text-[11px] text-slate-400">
                        Blueprint: <span className="font-medium text-slate-600 dark:text-slate-300">{tt.project_template_name}</span>
                      </div>
                    ) : (
                      <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        Standalone Template
                      </div>
                    )}

                    {/* Checklists preview */}
                    {tt.checklists_template?.length > 0 && (
                      <div className="rounded-lg bg-slate-50 p-2 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                          Checklist Items ({tt.checklists_template.length})
                        </span>
                        <ul className="space-y-1">
                          {tt.checklists_template.slice(0, 2).map((item, idx) => (
                            <li key={idx} className="flex items-center gap-1.5 text-xs truncate">
                              <CheckSquare className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="truncate">{item.item}</span>
                            </li>
                          ))}
                          {tt.checklists_template.length > 2 && (
                            <li className="text-[10px] text-slate-400 italic">
                              +{tt.checklists_template.length - 2} more checklist items
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <button
                      onClick={() => handleOpenInstantiateTask(tt)}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Instantiate Task into Scope
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: RECURRING SCHEDULES & DEDUPLICATION */}
      {/* ======================================================== */}
      {activeTab === 'recurring-rules' && (
        <div className="space-y-4">
          {/* Deduplication Guarantee Callout */}
          <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900/60 dark:bg-blue-950/40">
            <Repeat className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div className="text-xs text-blue-900 dark:text-blue-200">
              <span className="font-semibold block text-sm">
                Idempotent Recurring Work Engine Active
              </span>
              Schedules guarantee exact-once task generation per scheduled date. Retries or manual triggers will never duplicate occurrences for the same period. Private attachments, client data, and worklogs are strictly isolated.
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400 text-sm">
              Loading recurring schedules...
            </div>
          ) : filteredRecurringRules.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-800">
              <Repeat className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                No recurring rules scheduled
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Set up recurring maintenance, quarterly SOC2 audits, or database vacuum jobs.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                    <tr>
                      <th className="py-3 px-4">Rule Code & Title</th>
                      <th className="py-3 px-4">Scope</th>
                      <th className="py-3 px-4">Frequency</th>
                      <th className="py-3 px-4">Next Run Date</th>
                      <th className="py-3 px-4">Assignee & Priority</th>
                      <th className="py-3 px-4">History</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredRecurringRules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {rule.title}
                          </div>
                          <div className="font-mono text-xs text-slate-400 mt-0.5">
                            {rule.rule_code}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          {rule.product_name ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 font-medium">
                              <Building className="h-3 w-3" />
                              {rule.product_name}
                            </span>
                          ) : rule.project_name ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 font-medium">
                              <Briefcase className="h-3 w-3" />
                              {rule.project_name}
                            </span>
                          ) : (
                            <span className="text-slate-400">Global</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                            {rule.frequency} (x{rule.interval_count})
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-700 dark:text-slate-200">
                          {rule.next_run_date ? rule.next_run_date.split('T')[0] : 'None'}
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          <div>{rule.default_assignee_name || 'Unassigned'}</div>
                          <span className="text-[11px] font-semibold text-slate-400">
                            {rule.default_priority}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => handleOpenOccurrenceHistory(rule)}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
                          >
                            <History className="h-3.5 w-3.5" />
                            {rule.executed_occurrences_count ?? rule.total_occurrences_count} runs
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleOpenTriggerModal(rule)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500"
                          >
                            <Play className="h-3 w-3" />
                            Run Now
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: PREVIEW PROJECT TEMPLATE STRUCTURE */}
      {/* ======================================================== */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">
                  {previewTemplate.template_code}
                </span>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {previewTemplate.template_name}
                </h2>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Milestones Structure */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Planned Milestone Stages
              </h4>
              <div className="space-y-2">
                {previewTemplate.milestone_templates?.length ? (
                  previewTemplate.milestone_templates.map((m, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg bg-slate-50 px-3.5 py-2 text-xs dark:bg-slate-800/60"
                    >
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {idx + 1}. {m.name}
                      </div>
                      <span className="font-mono text-slate-500 dark:text-slate-400">
                        Target: Anchor + {m.target_offset_days ?? (idx + 1) * 10} days
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">No milestones defined.</p>
                )}
              </div>
            </div>

            {/* Task Templates Structure */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Linked Task Templates (Relative Offsets)
              </h4>
              <div className="space-y-2">
                {previewTemplate.task_templates?.length ? (
                  previewTemplate.task_templates.map((t, idx) => (
                    <div
                      key={t.id || idx}
                      className="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-xs dark:border-slate-800"
                    >
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {t.title}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {t.task_template_code} • Est {t.estimated_hours}h • {t.priority}
                        </div>
                      </div>
                      <div className="text-right font-mono text-[11px] text-slate-500">
                        Start: +{t.start_offset_days}d • Duration: {t.duration_days}d
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">No task templates attached yet.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: INSTANTIATE PROJECT TEMPLATE */}
      {/* ======================================================== */}
      {instantiateProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleExecuteProjectInstantiation}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
                Instantiate Project Blueprint
              </h2>
              <button
                type="button"
                onClick={() => setInstantiateProjectModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Anchor Start Date (All tasks & milestones calculate from here) *
                </label>
                <input
                  type="date"
                  required
                  value={instantiateProjectForm.anchorStartDate}
                  onChange={(e) =>
                    setInstantiateProjectForm({
                      ...instantiateProjectForm,
                      anchorStartDate: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Project Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={instantiateProjectForm.projectCode}
                    onChange={(e) =>
                      setInstantiateProjectForm({
                        ...instantiateProjectForm,
                        projectCode: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm font-mono dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Client *
                  </label>
                  <select
                    required
                    value={instantiateProjectForm.clientId}
                    onChange={(e) =>
                      setInstantiateProjectForm({
                        ...instantiateProjectForm,
                        clientId: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">Select client...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.company_name} ({c.client_code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={instantiateProjectForm.projectName}
                  onChange={(e) =>
                    setInstantiateProjectForm({
                      ...instantiateProjectForm,
                      projectName: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Project Manager / Delivery Lead
                </label>
                <select
                  value={instantiateProjectForm.projectManagerId}
                  onChange={(e) =>
                    setInstantiateProjectForm({
                      ...instantiateProjectForm,
                      projectManagerId: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Default current user</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Custom Scope Notes
                </label>
                <textarea
                  rows={2}
                  value={instantiateProjectForm.description}
                  onChange={(e) =>
                    setInstantiateProjectForm({
                      ...instantiateProjectForm,
                      description: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setInstantiateProjectModal(null)}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
              >
                {loading ? 'Instantiating...' : 'Generate Project & Tasks'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: INSTANTIATE TASK TEMPLATE INTO SCOPE */}
      {/* ======================================================== */}
      {instantiateTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleExecuteTaskInstantiation}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <span className="text-xs font-mono font-semibold text-purple-600">
                  {instantiateTaskModal.task_template_code}
                </span>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Instantiate Task: {instantiateTaskModal.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setInstantiateTaskModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Anchor Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={instantiateTaskForm.anchorStartDate}
                  onChange={(e) =>
                    setInstantiateTaskForm({
                      ...instantiateTaskForm,
                      anchorStartDate: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Scope *
                </label>
                <div className="flex gap-4 mb-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={instantiateTaskForm.targetType === 'PROJECT'}
                      onChange={() =>
                        setInstantiateTaskForm({ ...instantiateTaskForm, targetType: 'PROJECT' })
                      }
                    />
                    <span>Project Scope</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={instantiateTaskForm.targetType === 'PRODUCT'}
                      onChange={() =>
                        setInstantiateTaskForm({ ...instantiateTaskForm, targetType: 'PRODUCT' })
                      }
                    />
                    <span>Product Scope</span>
                  </label>
                </div>

                {instantiateTaskForm.targetType === 'PROJECT' ? (
                  <select
                    required
                    value={instantiateTaskForm.projectId}
                    onChange={(e) =>
                      setInstantiateTaskForm({
                        ...instantiateTaskForm,
                        projectId: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">Select target project...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.project_name} ({p.project_code})
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    required
                    value={instantiateTaskForm.productId}
                    onChange={(e) =>
                      setInstantiateTaskForm({
                        ...instantiateTaskForm,
                        productId: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">Select target product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.product_name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assignee
                </label>
                <select
                  value={instantiateTaskForm.assigneeUserId}
                  onChange={(e) =>
                    setInstantiateTaskForm({
                      ...instantiateTaskForm,
                      assigneeUserId: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Leave unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setInstantiateTaskModal(null)}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREATE PROJECT BLUEPRINT */}
      {/* ======================================================== */}
      {createProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleCreateProjectTemplate}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-blue-600" />
                New Project Blueprint
              </h2>
              <button
                type="button"
                onClick={() => setCreateProjectModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Template Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TPL-PRJ-RETAINER"
                    value={newProjectTemplateForm.templateCode}
                    onChange={(e) =>
                      setNewProjectTemplateForm({
                        ...newProjectTemplateForm,
                        templateCode: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm font-mono dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category *
                  </label>
                  <select
                    value={newProjectTemplateForm.category}
                    onChange={(e) =>
                      setNewProjectTemplateForm({
                        ...newProjectTemplateForm,
                        category: e.target.value as any,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="CLIENT_ONBOARDING">Client Onboarding</option>
                    <option value="FIXED_PRICE_DELIVERY">Fixed Price Delivery</option>
                    <option value="MAINTENANCE_RETAINER">Maintenance Retainer</option>
                    <option value="SECURITY_AUDIT">Security Audit</option>
                    <option value="RELEASE_CHECKLIST">Release Checklist</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maintenance Retainer Standard Setup"
                  value={newProjectTemplateForm.templateName}
                  onChange={(e) =>
                    setNewProjectTemplateForm({
                      ...newProjectTemplateForm,
                      templateName: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newProjectTemplateForm.description}
                  onChange={(e) =>
                    setNewProjectTemplateForm({
                      ...newProjectTemplateForm,
                      description: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Default Duration (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newProjectTemplateForm.defaultEstimatedDurationDays}
                    onChange={(e) =>
                      setNewProjectTemplateForm({
                        ...newProjectTemplateForm,
                        defaultEstimatedDurationDays: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Engagement Model
                  </label>
                  <select
                    value={newProjectTemplateForm.targetEngagementModel}
                    onChange={(e) =>
                      setNewProjectTemplateForm({
                        ...newProjectTemplateForm,
                        targetEngagementModel: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="TIME_AND_MATERIALS">Time & Materials</option>
                    <option value="FIXED_COST">Fixed Cost</option>
                    <option value="RETAINER">Retainer</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCreateProjectModal(false)}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
              >
                Save Blueprint
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREATE TASK TEMPLATE */}
      {/* ======================================================== */}
      {createTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleCreateTaskTemplate}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                New Task Template
              </h2>
              <button
                type="button"
                onClick={() => setCreateTaskModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Belongs to Project Blueprint (Optional)
                </label>
                <select
                  value={newTaskTemplateForm.projectTemplateId}
                  onChange={(e) =>
                    setNewTaskTemplateForm({
                      ...newTaskTemplateForm,
                      projectTemplateId: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Standalone Template (Reusable anywhere)</option>
                  {projectTemplates.map((pt) => (
                    <option key={pt.id} value={pt.id}>
                      {pt.template_name} ({pt.template_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Multi-AZ Failover Testing & Health Check"
                  value={newTaskTemplateForm.title}
                  onChange={(e) =>
                    setNewTaskTemplateForm({
                      ...newTaskTemplateForm,
                      title: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Start Offset (Days)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newTaskTemplateForm.startOffsetDays}
                    onChange={(e) =>
                      setNewTaskTemplateForm({
                        ...newTaskTemplateForm,
                        startOffsetDays: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Duration (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newTaskTemplateForm.durationDays}
                    onChange={(e) =>
                      setNewTaskTemplateForm({
                        ...newTaskTemplateForm,
                        durationDays: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Estimated Hours
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newTaskTemplateForm.estimatedHours}
                    onChange={(e) =>
                      setNewTaskTemplateForm({
                        ...newTaskTemplateForm,
                        estimatedHours: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description & Checklist Instructions
                </label>
                <textarea
                  rows={2}
                  value={newTaskTemplateForm.description}
                  onChange={(e) =>
                    setNewTaskTemplateForm({
                      ...newTaskTemplateForm,
                      description: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCreateTaskModal(false)}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 disabled:opacity-50"
              >
                Save Task Template
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREATE RECURRING SCHEDULE */}
      {/* ======================================================== */}
      {createRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleCreateRecurringRule}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Repeat className="h-5 w-5 text-emerald-600" />
                Schedule Recurring Work Rule
              </h2>
              <button
                type="button"
                onClick={() => setCreateRuleModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Schedule Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly S3 Backup & IAM Key Rotation"
                  value={newRuleForm.title}
                  onChange={(e) => setNewRuleForm({ ...newRuleForm, title: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Scope *
                </label>
                <div className="flex gap-4 mb-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={newRuleForm.targetType === 'PROJECT'}
                      onChange={() => setNewRuleForm({ ...newRuleForm, targetType: 'PROJECT' })}
                    />
                    <span>Project Scope</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={newRuleForm.targetType === 'PRODUCT'}
                      onChange={() => setNewRuleForm({ ...newRuleForm, targetType: 'PRODUCT' })}
                    />
                    <span>Product Scope</span>
                  </label>
                </div>

                {newRuleForm.targetType === 'PROJECT' ? (
                  <select
                    required
                    value={newRuleForm.projectId}
                    onChange={(e) => setNewRuleForm({ ...newRuleForm, projectId: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">Select project...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.project_name} ({p.project_code})
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    required
                    value={newRuleForm.productId}
                    onChange={(e) => setNewRuleForm({ ...newRuleForm, productId: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">Select product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.product_name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Frequency *
                  </label>
                  <select
                    value={newRuleForm.frequency}
                    onChange={(e) =>
                      setNewRuleForm({
                        ...newRuleForm,
                        frequency: e.target.value as any,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="BIWEEKLY">Biweekly (14 days)</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="ANNUALLY">Annually</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    First Execution / Next Run Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newRuleForm.nextRunDate}
                    onChange={(e) =>
                      setNewRuleForm({ ...newRuleForm, nextRunDate: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Task Blueprint Template (Optional)
                </label>
                <select
                  value={newRuleForm.taskTemplateId}
                  onChange={(e) =>
                    setNewRuleForm({ ...newRuleForm, taskTemplateId: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Generic task (Title + Description)</option>
                  {taskTemplates.map((tt) => (
                    <option key={tt.id} value={tt.id}>
                      {tt.title} ({tt.task_template_code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCreateRuleModal(false)}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
              >
                Activate Schedule
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: OCCURRENCE EXECUTION HISTORY (DEDUPLICATION AUDIT) */}
      {/* ======================================================== */}
      {occurrenceHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <span className="text-xs font-mono font-semibold text-emerald-600">
                  {occurrenceHistoryModal.rule_code}
                </span>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Occurrence History: {occurrenceHistoryModal.title}
                </h2>
              </div>
              <button
                onClick={() => setOccurrenceHistoryModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {occurrences.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No past executions logged yet for this recurrence rule.
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <tr>
                      <th className="py-2.5 px-3">Scheduled Date</th>
                      <th className="py-2.5 px-3">Executed At</th>
                      <th className="py-2.5 px-3">Generated Task</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {occurrences.map((occ) => (
                      <tr key={occ.id}>
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 dark:text-white">
                          {occ.scheduled_date ? occ.scheduled_date.split('T')[0] : 'N/A'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {occ.executed_at ? new Date(occ.executed_at).toLocaleString() : 'N/A'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-blue-600 dark:text-blue-400">
                          {occ.task_code || occ.generated_task_id.slice(0, 8)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                            {occ.execution_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setOccurrenceHistoryModal(null)}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: MANUAL RECURRENCE TRIGGER */}
      {/* ======================================================== */}
      {triggerRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleExecuteManualTrigger}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Play className="h-4 w-4 text-emerald-600" />
                Trigger Occurrence Now
              </h2>
              <button
                type="button"
                onClick={() => setTriggerRuleModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 dark:text-slate-300">
                Trigger execution for <strong>{triggerRuleModal.title}</strong>. If an occurrence has already been executed for this date, deduplication will reject the run to prevent duplicate tasks.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Scheduled Occurrence Date
                </label>
                <input
                  type="date"
                  required
                  value={triggerDateOverride}
                  onChange={(e) => setTriggerDateOverride(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setTriggerRuleModal(null)}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
              >
                {loading ? 'Executing...' : 'Run & Generate Task'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default TemplatesWorkspaceView;
