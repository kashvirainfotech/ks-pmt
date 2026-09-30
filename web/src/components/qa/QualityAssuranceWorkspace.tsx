import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Plus,
  Search,
  Filter,
  Layers,
  Play,
  Bug,
  ShieldCheck,
  FileCheck,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  FolderPlus,
  FileText,
  UserCheck,
  Send,
  X,
  Sparkles,
  Server,
  Activity,
  Award,
  Lock,
} from 'lucide-react';
import {
  qaApi,
  productsApi,
  projectsApi,
  milestonesApi,
  mastersApi,
} from '../../api/endpoints';
import {
  TestSuite,
  TestCase,
  TestRun,
  TestRunItem,
  ReleaseReadinessChecklist,
  ReleaseChecklistItem,
  TraceabilityItem,
  TraceabilitySummary,
  Product,
  Project,
  Version,
  Milestone,
  User,
} from '../../types';

export const QualityAssuranceWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'suites' | 'runs' | 'gatekeeper' | 'traceability'>('suites');
  const [loading, setLoading] = useState(false);

  // Global Context / Scopes
  const [products, setProducts] = useState<Product[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Selected Scope Filter
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Tab 1: Test Suites & Cases
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [selectedSuiteId, setSelectedSuiteId] = useState<string>('');
  const [cases, setCases] = useState<TestCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);
  const [showCreateSuiteModal, setShowCreateSuiteModal] = useState(false);
  const [showCreateCaseModal, setShowCreateCaseModal] = useState(false);

  // Form states for Suite
  const [newSuiteName, setNewSuiteName] = useState('');
  const [newSuiteDesc, setNewSuiteDesc] = useState('');
  const [newSuiteScopeType, setNewSuiteScopeType] = useState<'PRODUCT' | 'PROJECT'>('PRODUCT');
  const [newSuiteScopeId, setNewSuiteScopeId] = useState('');

  // Form states for Case
  const [newCaseTitle, setNewCaseTitle] = useState('');
  const [newCaseDesc, setNewCaseDesc] = useState('');
  const [newCasePreconditions, setNewCasePreconditions] = useState('');
  const [newCaseExpectedResult, setNewCaseExpectedResult] = useState('');
  const [newCaseSeverity, setNewCaseSeverity] = useState<'TRIVIAL' | 'MINOR' | 'MAJOR' | 'CRITICAL' | 'BLOCKER'>('MAJOR');
  const [newCasePriority, setNewCasePriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [newCaseExecType, setNewCaseExecType] = useState<'MANUAL' | 'AUTOMATED'>('MANUAL');
  const [newCaseEstMinutes, setNewCaseEstMinutes] = useState(15);
  const [newCaseSteps, setNewCaseSteps] = useState<Array<{ step_number: number; action: string; expected_result: string }>>([
    { step_number: 1, action: '', expected_result: '' },
  ]);

  // Tab 2: Test Runs & Execution
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<TestRun | null>(null);
  const [showCreateRunModal, setShowCreateRunModal] = useState(false);
  const [selectedRunItemForExec, setSelectedRunItemForExec] = useState<TestRunItem | null>(null);
  const [execStatus, setExecStatus] = useState<'PASSED' | 'FAILED' | 'BLOCKED' | 'SKIPPED'>('PASSED');
  const [execActualResult, setExecActualResult] = useState('');
  const [execNotes, setExecNotes] = useState('');
  const [execEvidenceUrl, setExecEvidenceUrl] = useState('');

  // 1-Click Defect modal
  const [selectedItemForDefect, setSelectedItemForDefect] = useState<TestRunItem | null>(null);
  const [defectTitle, setDefectTitle] = useState('');
  const [defectDesc, setDefectDesc] = useState('');
  const [defectPriority, setDefectPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('HIGH');
  const [defectAssigneeId, setDefectAssigneeId] = useState('');

  // Form states for Test Run
  const [newRunTitle, setNewRunTitle] = useState('');
  const [newRunDesc, setNewRunDesc] = useState('');
  const [newRunEnv, setNewRunEnv] = useState<'LOCAL' | 'QA' | 'STAGING' | 'UAT' | 'PRODUCTION'>('STAGING');
  const [newRunAssigneeId, setNewRunAssigneeId] = useState('');
  const [newRunVersionId, setNewRunVersionId] = useState('');
  const [newRunMilestoneId, setNewRunMilestoneId] = useState('');
  const [newRunSelectedSuites, setNewRunSelectedSuites] = useState<string[]>([]);

  // Tab 3: Release Readiness Checklists
  const [checklists, setChecklists] = useState<ReleaseReadinessChecklist[]>([]);
  const [selectedChecklist, setSelectedChecklist] = useState<ReleaseReadinessChecklist | null>(null);
  const [showCreateChecklistModal, setShowCreateChecklistModal] = useState(false);
  const [showSignoffModal, setShowSignoffModal] = useState(false);
  const [signoffDecision, setSignoffDecision] = useState<'READY_FOR_RELEASE' | 'CONDITIONAL_RELEASE' | 'BLOCKED'>('READY_FOR_RELEASE');
  const [signoffNotes, setSignoffNotes] = useState('');
  const [signoffExceptions, setSignoffExceptions] = useState('');

  // Verify item state
  const [verifyingItem, setVerifyingItem] = useState<ReleaseChecklistItem | null>(null);
  const [itemVerifyStatus, setItemVerifyStatus] = useState<'PASSED' | 'FAILED' | 'WAIVED'>('PASSED');
  const [itemEvidenceNotes, setItemEvidenceNotes] = useState('');
  const [itemWaivedReason, setItemWaivedReason] = useState('');

  // Form states for Release Checklist
  const [newClTitle, setNewClTitle] = useState('');
  const [newClVersionId, setNewClVersionId] = useState('');
  const [newClMilestoneId, setNewClMilestoneId] = useState('');
  const [newClTargetDate, setNewClTargetDate] = useState('');
  const [newClLeadQaId, setNewClLeadQaId] = useState('');
  const [newClSignoffPmId, setNewClSignoffPmId] = useState('');

  // Tab 4: Traceability Matrix
  const [traceabilitySummary, setTraceabilitySummary] = useState<TraceabilitySummary | null>(null);
  const [traceabilityItems, setTraceabilityItems] = useState<TraceabilityItem[]>([]);

  // Load scope references on mount
  useEffect(() => {
    loadMasterReferences();
  }, []);

  // Reload data when active tab or scope changes
  useEffect(() => {
    if (activeTab === 'suites') {
      loadSuitesAndCases();
    } else if (activeTab === 'runs') {
      loadRuns();
    } else if (activeTab === 'gatekeeper') {
      loadChecklists();
    } else if (activeTab === 'traceability') {
      loadTraceability();
    }
  }, [activeTab, selectedProductId, selectedProjectId]);

  const loadMasterReferences = async () => {
    try {
      const [prodsRes, projsRes, usersRes] = await Promise.all([
        productsApi.getProducts(),
        projectsApi.getProjects(),
        mastersApi.getUsers(),
      ]);
      setProducts(prodsRes.data || []);
      setProjects(projsRes.data || []);
      const loadedUsers = (usersRes.data as any)?.data || usersRes.data || [];
      setUsers(Array.isArray(loadedUsers) ? loadedUsers : []);
    } catch (err) {
      console.error('Failed to load master references', err);
    }
  };

  const loadVersionsAndMilestonesForScope = async (productId?: string, projectId?: string) => {
    try {
      if (productId) {
        const [vRes, mRes] = await Promise.all([
          projectsApi.getVersions({ productId }),
          milestonesApi.getMilestones({ productId }),
        ]);
        setVersions(vRes.data || []);
        setMilestones(mRes.data || []);
      } else if (projectId) {
        const [vRes, mRes] = await Promise.all([
          projectsApi.getVersions({ projectId }),
          milestonesApi.getMilestones({ projectId }),
        ]);
        setVersions(vRes.data || []);
        setMilestones(mRes.data || []);
      }
    } catch (err) {
      console.error('Failed to load versions and milestones', err);
    }
  };

  const loadSuitesAndCases = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedProductId) params.productId = selectedProductId;
      if (selectedProjectId) params.projectId = selectedProjectId;

      const suitesRes = await qaApi.getSuites(params);
      const fetchedSuites = suitesRes.data || [];
      setSuites(fetchedSuites);

      const targetSuiteId = selectedSuiteId || (fetchedSuites[0]?.id || '');
      setSelectedSuiteId(targetSuiteId);

      const casesParams: any = { ...params };
      if (targetSuiteId) casesParams.suiteId = targetSuiteId;
      const casesRes = await qaApi.getCases(casesParams);
      setCases(casesRes.data?.items || []);
    } catch (err) {
      console.error('Failed to load test suites and cases', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuite = async (suiteId: string) => {
    setSelectedSuiteId(suiteId);
    setLoading(true);
    try {
      const casesRes = await qaApi.getCases({ suiteId });
      setCases(casesRes.data?.items || []);
    } catch (err) {
      console.error('Failed to load cases for suite', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuite = async () => {
    if (!newSuiteName || !newSuiteScopeId) return;
    try {
      await qaApi.createSuite({
        suiteName: newSuiteName,
        description: newSuiteDesc,
        entityType: newSuiteScopeType,
        productId: newSuiteScopeType === 'PRODUCT' ? newSuiteScopeId : undefined,
        projectId: newSuiteScopeType === 'PROJECT' ? newSuiteScopeId : undefined,
      });
      setShowCreateSuiteModal(false);
      setNewSuiteName('');
      setNewSuiteDesc('');
      loadSuitesAndCases();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create test suite');
    }
  };

  const handleCreateCase = async () => {
    if (!newCaseTitle || !selectedSuiteId) return;
    try {
      await qaApi.createCase({
        suiteId: selectedSuiteId,
        title: newCaseTitle,
        description: newCaseDesc,
        preconditions: newCasePreconditions,
        expectedResult: newCaseExpectedResult,
        severity: newCaseSeverity,
        priority: newCasePriority,
        executionType: newCaseExecType,
        estimatedMinutes: Number(newCaseEstMinutes),
        testSteps: newCaseSteps.filter((s) => s.action.trim().length > 0),
      });
      setShowCreateCaseModal(false);
      // Reset form
      setNewCaseTitle('');
      setNewCaseDesc('');
      setNewCasePreconditions('');
      setNewCaseExpectedResult('');
      setNewCaseSteps([{ step_number: 1, action: '', expected_result: '' }]);
      handleSelectSuite(selectedSuiteId);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create test case');
    }
  };

  const loadRuns = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedProductId) params.productId = selectedProductId;
      if (selectedProjectId) params.projectId = selectedProjectId;

      const res = await qaApi.getRuns(params);
      const runsData = res.data || [];
      setRuns(runsData);
      if (runsData.length > 0 && !selectedRun) {
        loadRunDetail(runsData[0].id);
      }
    } catch (err) {
      console.error('Failed to load test runs', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRunDetail = async (runId: string) => {
    try {
      const res = await qaApi.getRunById(runId);
      setSelectedRun(res.data);
    } catch (err) {
      console.error('Failed to load run detail', err);
    }
  };

  const handleCreateRun = async () => {
    if (!newRunTitle || (!selectedProductId && !selectedProjectId)) return;
    try {
      const entityType = selectedProductId ? 'PRODUCT' : 'PROJECT';
      await qaApi.createRun({
        title: newRunTitle,
        description: newRunDesc,
        entityType,
        productId: selectedProductId || undefined,
        projectId: selectedProjectId || undefined,
        versionId: newRunVersionId || undefined,
        milestoneId: newRunMilestoneId || undefined,
        environment: newRunEnv,
        assignedToUserId: newRunAssigneeId || undefined,
        testSuiteIds: newRunSelectedSuites,
      });
      setShowCreateRunModal(false);
      setNewRunTitle('');
      setNewRunDesc('');
      setNewRunSelectedSuites([]);
      loadRuns();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create test run');
    }
  };

  const handleExecuteItem = async () => {
    if (!selectedRunItemForExec) return;
    try {
      const evidence = execEvidenceUrl.trim() ? [execEvidenceUrl.trim()] : undefined;
      await qaApi.executeRunItem(selectedRunItemForExec.id, {
        status: execStatus,
        actualResult: execActualResult,
        executionNotes: execNotes,
        evidenceUrls: evidence,
      });
      setSelectedRunItemForExec(null);
      setExecActualResult('');
      setExecNotes('');
      setExecEvidenceUrl('');
      if (selectedRun) {
        loadRunDetail(selectedRun.id);
      }
      loadRuns();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record execution');
    }
  };

  const handleOpenDefectModal = (item: TestRunItem) => {
    setSelectedItemForDefect(item);
    setDefectTitle(`[${item.case_code}] ${item.case_title}`);
    setDefectDesc(`Test execution failed on ${item.case_code}.\nActual Result: ${item.actual_result || 'N/A'}`);
    setDefectPriority(item.priority === 'CRITICAL' ? 'URGENT' : (item.priority as any));
  };

  const handleLogDefect = async () => {
    if (!selectedItemForDefect || !defectTitle) return;
    try {
      await qaApi.logDefectFromRunItem(selectedItemForDefect.id, {
        title: defectTitle,
        description: defectDesc,
        priority: defectPriority,
        assigneeUserId: defectAssigneeId || undefined,
      });
      setSelectedItemForDefect(null);
      if (selectedRun) {
        loadRunDetail(selectedRun.id);
      }
      alert('Bug defect created and linked successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to log defect');
    }
  };

  const loadChecklists = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedProductId) params.productId = selectedProductId;
      if (selectedProjectId) params.projectId = selectedProjectId;

      const res = await qaApi.getReleaseChecklists(params);
      const clData = res.data || [];
      setChecklists(clData);
      if (clData.length > 0 && !selectedChecklist) {
        loadChecklistDetail(clData[0].id);
      }
    } catch (err) {
      console.error('Failed to load release checklists', err);
    } finally {
      setLoading(false);
    }
  };

  const loadChecklistDetail = async (id: string) => {
    try {
      const res = await qaApi.getReleaseChecklistById(id);
      setSelectedChecklist(res.data);
    } catch (err) {
      console.error('Failed to load checklist detail', err);
    }
  };

  const handleCreateChecklist = async () => {
    if (!newClTitle || (!selectedProductId && !selectedProjectId)) return;
    try {
      const entityType = selectedProductId ? 'PRODUCT' : 'PROJECT';
      await qaApi.createReleaseChecklist({
        title: newClTitle,
        entityType,
        productId: selectedProductId || undefined,
        projectId: selectedProjectId || undefined,
        versionId: newClVersionId || undefined,
        milestoneId: newClMilestoneId || undefined,
        targetReleaseDate: newClTargetDate || undefined,
        leadQaUserId: newClLeadQaId || undefined,
        signoffPmUserId: newClSignoffPmId || undefined,
      });
      setShowCreateChecklistModal(false);
      setNewClTitle('');
      loadChecklists();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create release checklist');
    }
  };

  const handleUpdateChecklistItem = async () => {
    if (!selectedChecklist || !verifyingItem) return;
    try {
      await qaApi.updateChecklistItem(selectedChecklist.id, verifyingItem.id, {
        status: itemVerifyStatus,
        evidenceNotes: itemEvidenceNotes,
        waivedReason: itemVerifyStatus === 'WAIVED' ? itemWaivedReason : undefined,
      });
      setVerifyingItem(null);
      setItemEvidenceNotes('');
      setItemWaivedReason('');
      loadChecklistDetail(selectedChecklist.id);
      loadChecklists();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to verify checklist item');
    }
  };

  const handleSignoffChecklist = async () => {
    if (!selectedChecklist) return;
    try {
      await qaApi.signoffChecklist(selectedChecklist.id, {
        overallStatus: signoffDecision,
        signoffNotes,
        exceptionsNotes: signoffDecision === 'CONDITIONAL_RELEASE' ? signoffExceptions : undefined,
      });
      setShowSignoffModal(false);
      setSignoffNotes('');
      setSignoffExceptions('');
      loadChecklistDetail(selectedChecklist.id);
      loadChecklists();
      alert(`Release checklist successfully updated to ${signoffDecision}!`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to sign off release checklist');
    }
  };

  const loadTraceability = async () => {
    setLoading(true);
    try {
      const res = await qaApi.getTraceabilityMatrix({
        productId: selectedProductId || undefined,
        projectId: selectedProjectId || undefined,
      });
      setTraceabilitySummary(res.data?.summary || null);
      setTraceabilityItems(res.data?.items || []);
    } catch (err) {
      console.error('Failed to load traceability matrix', err);
    } finally {
      setLoading(false);
    }
  };

  // Severity & Priority badges helper
  const renderSeverityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      CRITICAL: 'bg-red-50 text-red-700 border-red-200',
      BLOCKER: 'bg-red-100 text-red-800 border-red-300 font-semibold',
      MAJOR: 'bg-amber-50 text-amber-700 border-amber-200',
      MINOR: 'bg-blue-50 text-blue-700 border-blue-200',
      TRIVIAL: 'bg-gray-50 text-gray-600 border-gray-200',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${colors[severity] || colors.MAJOR}`}>
        {severity}
      </span>
    );
  };

  const renderStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PASSED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      FAILED: 'bg-rose-50 text-rose-700 border-rose-200',
      BLOCKED: 'bg-amber-50 text-amber-700 border-amber-200',
      SKIPPED: 'bg-slate-50 text-slate-600 border-slate-200',
      PENDING: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      READY_FOR_RELEASE: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold',
      CONDITIONAL_RELEASE: 'bg-amber-100 text-amber-800 border-amber-300 font-semibold',
      IN_REVIEW: 'bg-blue-50 text-blue-700 border-blue-200',
      NOT_STARTED: 'bg-gray-50 text-gray-600 border-gray-200',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
        {status === 'PASSED' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
        {status === 'FAILED' && <XCircle className="w-3 h-3 text-rose-600" />}
        {status === 'BLOCKED' && <AlertTriangle className="w-3 h-3 text-amber-600" />}
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Banner & Scope Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <ShieldCheck className="w-6 h-6" />
                </span>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">
                    Quality Assurance & Release Readiness
                  </h1>
                  <p className="text-xs text-slate-500">
                    Test Repository, Execution Runs, Defect Tracing & Production Gatekeeper
                  </p>
                </div>
              </div>
            </div>

            {/* Scope Selectors */}
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-slate-100 rounded-lg p-1 text-xs">
                <select
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    setSelectedProjectId('');
                    loadVersionsAndMilestonesForScope(e.target.value, undefined);
                  }}
                  className="bg-transparent border-0 px-2 py-1 text-slate-700 font-medium focus:ring-0 cursor-pointer"
                >
                  <option value="">All Products</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      Product: {p.product_name}
                    </option>
                  ))}
                </select>

                <span className="text-slate-300">|</span>

                <select
                  value={selectedProjectId}
                  onChange={(e) => {
                    setSelectedProjectId(e.target.value);
                    setSelectedProductId('');
                    loadVersionsAndMilestonesForScope(undefined, e.target.value);
                  }}
                  className="bg-transparent border-0 px-2 py-1 text-slate-700 font-medium focus:ring-0 cursor-pointer"
                >
                  <option value="">All Projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      Project: {p.project_name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => {
                  if (activeTab === 'suites') loadSuitesAndCases();
                  else if (activeTab === 'runs') loadRuns();
                  else if (activeTab === 'gatekeeper') loadChecklists();
                  else loadTraceability();
                }}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                title="Refresh workspace"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-6 border-t border-slate-200">
            <button
              onClick={() => setActiveTab('suites')}
              className={`py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition ${
                activeTab === 'suites'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Layers className="w-4 h-4" />
              Test Repository & Suites
              <span className="ml-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">
                {suites.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('runs')}
              className={`py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition ${
                activeTab === 'runs'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Play className="w-4 h-4" />
              Test Runs Execution
              <span className="ml-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold">
                {runs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('gatekeeper')}
              className={`py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition ${
                activeTab === 'gatekeeper'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Award className="w-4 h-4" />
              Release Readiness Gatekeeper
              <span className="ml-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold">
                {checklists.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('traceability')}
              className={`py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition ${
                activeTab === 'traceability'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Activity className="w-4 h-4" />
              Traceability & Defect Radar
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ======================================================== */}
        {/* TAB 1: TEST REPOSITORY & SUITES                          */}
        {/* ======================================================== */}
        {activeTab === 'suites' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left: Test Suites Sidebar */}
            <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Test Suites
                </h3>
                <button
                  onClick={() => setShowCreateSuiteModal(true)}
                  className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition"
                  title="New Test Suite"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                {suites.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => handleSelectSuite(s.id)}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition ${
                      selectedSuiteId === s.id
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-indigo-600">
                        {s.suite_code}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded-full">
                        {s.total_cases_count || 0} cases
                      </span>
                    </div>
                    <h4 className="text-sm font-medium text-slate-900 mt-1 line-clamp-1">
                      {s.suite_name}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                      {s.description || 'No description provided'}
                    </p>
                    {s.component_name && (
                      <span className="inline-block mt-2 px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded font-medium">
                        {s.component_name}
                      </span>
                    )}
                  </div>
                ))}
                {suites.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    No test suites found for this scope. Create one to get started.
                  </div>
                )}
              </div>
            </div>

            {/* Right: Test Cases Grid & Case Drawer */}
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search test cases..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-indigo-500 w-64"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowCreateCaseModal(true)}
                      disabled={!selectedSuiteId}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-xs transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      New Test Case
                    </button>
                  </div>
                </div>

                {/* Cases Table */}
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                        <th className="py-2.5 px-3">Code</th>
                        <th className="py-2.5 px-3">Title & Expected Outcome</th>
                        <th className="py-2.5 px-3">Severity</th>
                        <th className="py-2.5 px-3">Priority</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3 text-right">Est. Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {cases
                        .filter(
                          (c) =>
                            !searchQuery ||
                            c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            c.case_code.toLowerCase().includes(searchQuery.toLowerCase()),
                        )
                        .map((c) => (
                          <tr
                            key={c.id}
                            onClick={() => setSelectedCase(c)}
                            className="hover:bg-slate-50/80 cursor-pointer transition"
                          >
                            <td className="py-3 px-3 font-mono font-medium text-indigo-600 whitespace-nowrap">
                              {c.case_code}
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-medium text-slate-900">{c.title}</div>
                              <div className="text-slate-500 text-[11px] line-clamp-1 mt-0.5">
                                {c.expected_result}
                              </div>
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              {renderSeverityBadge(c.severity)}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className="font-medium text-slate-700">{c.priority}</span>
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap text-slate-500">
                              {c.execution_type}
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-slate-500 whitespace-nowrap">
                              {c.estimated_minutes}m
                            </td>
                          </tr>
                        ))}
                      {cases.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-10 text-slate-400">
                            No test cases found in this suite. Click "New Test Case" above.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: TEST RUNS EXECUTION CONSOLE                       */}
        {/* ======================================================== */}
        {activeTab === 'runs' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Test Runs List */}
            <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                  <Play className="w-4 h-4 text-indigo-600" />
                  Test Runs
                </h3>
                <button
                  onClick={() => setShowCreateRunModal(true)}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium flex items-center gap-1 shadow-xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Run
                </button>
              </div>

              <div className="space-y-3">
                {runs.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => loadRunDetail(r.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition ${
                      selectedRun?.id === r.id
                        ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-indigo-600">
                        {r.run_code}
                      </span>
                      {renderStatusBadge(r.status)}
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900 mt-1">{r.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono">
                        {r.environment}
                      </span>
                      {r.version_name && <span>{r.version_name}</span>}
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1">
                        <span>Pass Rate: {r.pass_rate_percentage || 0}%</span>
                        <span>
                          {r.passed_cases}/{r.total_cases} passed
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                        <div
                          style={{
                            width: `${(r.passed_cases / (r.total_cases || 1)) * 100}%`,
                          }}
                          className="bg-emerald-500 h-full"
                          title="Passed"
                        />
                        <div
                          style={{
                            width: `${(r.failed_cases / (r.total_cases || 1)) * 100}%`,
                          }}
                          className="bg-rose-500 h-full"
                          title="Failed"
                        />
                        <div
                          style={{
                            width: `${(r.blocked_cases / (r.total_cases || 1)) * 100}%`,
                          }}
                          className="bg-amber-500 h-full"
                          title="Blocked"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {runs.length === 0 && (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    No test runs found. Launch a test run to start executing test cases.
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Execution Workspace */}
            <div className="lg:col-span-2 space-y-4">
              {selectedRun ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-600">
                          {selectedRun.run_code}
                        </span>
                        {renderStatusBadge(selectedRun.status)}
                      </div>
                      <h2 className="text-lg font-bold text-slate-900 mt-1">{selectedRun.title}</h2>
                      <p className="text-xs text-slate-500 mt-0.5">{selectedRun.description}</p>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <div>
                        <span className="block text-[10px] uppercase text-slate-400 font-semibold">
                          Environment
                        </span>
                        <span className="font-medium text-slate-700">{selectedRun.environment}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase text-slate-400 font-semibold">
                          Assignee
                        </span>
                        <span className="font-medium text-slate-700">
                          {selectedRun.assignee_name || 'Unassigned'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Test Run Execution Items */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Execution Test Cases ({selectedRun.items?.length || 0})
                    </h4>

                    {selectedRun.items?.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 rounded-lg border border-slate-200 hover:border-slate-300 bg-white transition space-y-3"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-indigo-600">
                                {item.case_code}
                              </span>
                              {renderSeverityBadge(item.severity)}
                              {renderStatusBadge(item.status)}
                            </div>
                            <h5 className="text-sm font-semibold text-slate-900 mt-1">
                              {item.case_title}
                            </h5>
                          </div>

                          {/* Quick Execution Buttons */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => {
                                setSelectedRunItemForExec(item);
                                setExecStatus('PASSED');
                              }}
                              className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-xs font-medium border border-emerald-200 transition"
                            >
                              Pass
                            </button>
                            <button
                              onClick={() => {
                                setSelectedRunItemForExec(item);
                                setExecStatus('FAILED');
                              }}
                              className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded text-xs font-medium border border-rose-200 transition"
                            >
                              Fail
                            </button>
                            <button
                              onClick={() => {
                                setSelectedRunItemForExec(item);
                                setExecStatus('BLOCKED');
                              }}
                              className="px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded text-xs font-medium border border-amber-200 transition"
                            >
                              Block
                            </button>
                          </div>
                        </div>

                        {/* Test steps mini preview */}
                        {item.test_steps && item.test_steps.length > 0 && (
                          <div className="bg-slate-50 p-2.5 rounded border border-slate-100 text-xs space-y-1">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase">
                              Verification Steps:
                            </span>
                            <ol className="list-decimal list-inside space-y-1 text-slate-700">
                              {item.test_steps.map((st) => (
                                <li key={st.step_number} className="text-xs">
                                  <span className="font-medium">{st.action}</span>
                                  {st.expected_result && (
                                    <span className="text-slate-500"> → {st.expected_result}</span>
                                  )}
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {/* Actual Result & Defects Linking */}
                        {item.actual_result && (
                          <div className="text-xs text-slate-600 bg-slate-50/50 p-2 rounded border border-slate-100">
                            <span className="font-semibold text-slate-700">Actual Result: </span>
                            {item.actual_result}
                          </div>
                        )}

                        {/* Linked Defect Badge or 1-Click Defect Button */}
                        <div className="flex items-center justify-between pt-1">
                          {item.linked_defect_task_id ? (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                                <Bug className="w-3.5 h-3.5 text-rose-600" />
                                {item.defect_task_code || 'BUG DEFECT'}
                              </span>
                              <span className="text-xs text-slate-700 font-medium">
                                {item.defect_title}
                              </span>
                              {item.defect_status_name && (
                                <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                                  {item.defect_status_name}
                                </span>
                              )}
                            </div>
                          ) : (
                            item.status === 'FAILED' && (
                              <button
                                onClick={() => handleOpenDefectModal(item)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
                              >
                                <Bug className="w-3.5 h-3.5 text-rose-600" />
                                1-Click Log Defect Bug Task
                              </button>
                            )
                          )}
                          <div />
                          {item.executed_by_name && (
                            <span className="text-[11px] text-slate-400">
                              Verified by {item.executed_by_name}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center text-slate-400">
                  Select a test run from the list to view and execute test cases.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: RELEASE READINESS GATEKEEPER                      */}
        {/* ======================================================== */}
        {activeTab === 'gatekeeper' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Release Gatekeeper Checklists */}
            <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-600" />
                  Release Checklists
                </h3>
                <button
                  onClick={() => setShowCreateChecklistModal(true)}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium flex items-center gap-1 shadow-xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Gatekeeper
                </button>
              </div>

              <div className="space-y-3">
                {checklists.map((cl) => (
                  <div
                    key={cl.id}
                    onClick={() => loadChecklistDetail(cl.id)}
                    className={`p-3.5 rounded-lg border cursor-pointer transition ${
                      selectedChecklist?.id === cl.id
                        ? 'border-emerald-600 bg-emerald-50/40 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-emerald-700">
                        {cl.checklist_code}
                      </span>
                      {renderStatusBadge(cl.overall_status)}
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900 mt-1">{cl.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      {cl.version_name && <span>{cl.version_name}</span>}
                      {cl.target_release_date && (
                        <span>• Target: {new Date(cl.target_release_date).toLocaleDateString()}</span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-600">
                      <span>Gates Passing:</span>
                      <span className="font-semibold text-emerald-700">
                        {cl.passed_items_count || 0} / {cl.total_items_count || 0}
                      </span>
                    </div>
                  </div>
                ))}
                {checklists.length === 0 && (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    No release checklists found. Create a gatekeeper to govern production cutover.
                  </div>
                )}
              </div>
            </div>

            {/* Right: Selected Checklist Details & Signoff Panel */}
            <div className="lg:col-span-2 space-y-4">
              {selectedChecklist ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-emerald-700">
                          {selectedChecklist.checklist_code}
                        </span>
                        {renderStatusBadge(selectedChecklist.overall_status)}
                      </div>
                      <h2 className="text-lg font-bold text-slate-900 mt-1">
                        {selectedChecklist.title}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowSignoffModal(true)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
                      >
                        <Award className="w-4 h-4" />
                        Gatekeeper Signoff
                      </button>
                    </div>
                  </div>

                  {/* Signoff Audit Summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50 p-3.5 rounded-lg border border-slate-200/80 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                        Lead QA Signoff
                      </span>
                      <span className="font-medium text-slate-800">
                        {selectedChecklist.lead_qa_name || 'Pending Review'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                        PM / Delivery Head
                      </span>
                      <span className="font-medium text-slate-800">
                        {selectedChecklist.signoff_pm_name || 'Pending Decision'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                        Signed Off At
                      </span>
                      <span className="font-medium text-slate-800">
                        {selectedChecklist.signed_off_at
                          ? new Date(selectedChecklist.signed_off_at).toLocaleString()
                          : 'Not signed yet'}
                      </span>
                    </div>
                  </div>

                  {selectedChecklist.signoff_notes && (
                    <div className="text-xs bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 text-indigo-900">
                      <span className="font-semibold block mb-0.5">Signoff Notes:</span>
                      {selectedChecklist.signoff_notes}
                    </div>
                  )}

                  {selectedChecklist.exceptions_notes && (
                    <div className="text-xs bg-amber-50 p-3 rounded-lg border border-amber-200 text-amber-900">
                      <span className="font-semibold block mb-0.5">Release Exceptions / Mitigations:</span>
                      {selectedChecklist.exceptions_notes}
                    </div>
                  )}

                  {/* Gate Items List */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Gate Verification Criteria ({selectedChecklist.items?.length || 0})
                    </h4>

                    {selectedChecklist.items?.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition space-y-2"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-slate-600">
                                {item.item_code}
                              </span>
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] rounded font-semibold uppercase">
                                {item.gate_category.replace(/_/g, ' ')}
                              </span>
                              {item.is_mandatory && (
                                <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] rounded font-medium">
                                  Mandatory Gate
                                </span>
                              )}
                              {renderStatusBadge(item.status)}
                            </div>
                            <h5 className="text-sm font-semibold text-slate-900 mt-1">
                              {item.title}
                            </h5>
                            <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                          </div>

                          <button
                            onClick={() => {
                              setVerifyingItem(item);
                              setItemVerifyStatus(item.status === 'PENDING' ? 'PASSED' : (item.status as any));
                              setItemEvidenceNotes(item.evidence_notes || '');
                              setItemWaivedReason(item.waived_reason || '');
                            }}
                            className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded-lg transition shrink-0"
                          >
                            Verify Gate
                          </button>
                        </div>

                        {item.evidence_notes && (
                          <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 mt-2">
                            <span className="font-semibold text-slate-700">Verification Evidence: </span>
                            {item.evidence_notes}
                          </div>
                        )}

                        {item.waived_reason && (
                          <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 mt-2">
                            <span className="font-semibold">Waiver Justification: </span>
                            {item.waived_reason}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center text-slate-400">
                  Select a release checklist to view quality gate items.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: TRACEABILITY & DEFECT RADAR MATRIX                */}
        {/* ======================================================== */}
        {activeTab === 'traceability' && (
          <div className="space-y-6">
            {/* Summary KPI Cards */}
            {traceabilitySummary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">
                    Total Test Cases
                  </span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    {traceabilitySummary.totalCases}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">
                    Passed Verifications
                  </span>
                  <div className="text-2xl font-bold text-emerald-600 mt-1">
                    {traceabilitySummary.passedCases}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">
                    Failed Cases
                  </span>
                  <div className="text-2xl font-bold text-rose-600 mt-1">
                    {traceabilitySummary.failedCases}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">
                    Blocked Cases
                  </span>
                  <div className="text-2xl font-bold text-amber-600 mt-1">
                    {traceabilitySummary.blockedCases}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">
                    Execution Coverage
                  </span>
                  <div className="text-2xl font-bold text-indigo-600 mt-1">
                    {traceabilitySummary.coveragePercentage}%
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">
                    Active Bug Defects
                  </span>
                  <div className="text-2xl font-bold text-rose-700 mt-1 flex items-center gap-1.5">
                    <Bug className="w-5 h-5 text-rose-600" />
                    {traceabilitySummary.linkedDefectsCount}
                  </div>
                </div>
              </div>
            )}

            {/* Traceability Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Requirements to Test & Defect Traceability Matrix
                  </h3>
                  <p className="text-xs text-slate-500">
                    Full end-to-end audit mapping: Acceptance Criteria → Test Suite → Execution Runs → Defects
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto mt-4">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                      <th className="py-2.5 px-3">Test Case</th>
                      <th className="py-2.5 px-3">Suite & Scope</th>
                      <th className="py-2.5 px-3">Requirement AC</th>
                      <th className="py-2.5 px-3">Latest Status</th>
                      <th className="py-2.5 px-3">Linked Defect Task</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {traceabilityItems.map((item) => (
                      <tr key={item.test_case_id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3">
                          <span className="font-mono text-xs font-semibold text-indigo-600 block">
                            {item.case_code}
                          </span>
                          <span className="font-medium text-slate-900">{item.case_title}</span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-800">{item.suite_name}</div>
                          <span className="text-[10px] text-slate-400">
                            {item.product_name || item.project_name}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {item.criterion_code ? (
                            <div>
                              <span className="font-mono text-xs text-indigo-600 block">
                                {item.criterion_code}
                              </span>
                              <span className="text-slate-600 text-[11px]">
                                {item.criterion_title}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">None linked</span>
                          )}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {item.latest_status ? (
                            <div>
                              {renderStatusBadge(item.latest_status)}
                              {item.latest_run_code && (
                                <span className="block text-[10px] font-mono text-slate-400 mt-0.5">
                                  {item.latest_run_code}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">Not Executed</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {item.linked_defect_code ? (
                            <div className="flex items-center gap-1.5">
                              <Bug className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <div>
                                <span className="font-mono text-xs font-semibold text-rose-700 block">
                                  {item.linked_defect_code}
                                </span>
                                <span className="text-[11px] text-slate-700 font-medium">
                                  {item.linked_defect_title}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-emerald-600 text-xs flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Clean (No Defect)
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {traceabilityItems.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-10 text-slate-400">
                          No traceability records found for this scope.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* MODAL: CREATE TEST SUITE                                 */}
      {/* ======================================================== */}
      {showCreateSuiteModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-indigo-600" />
                Create New Test Suite
              </h3>
              <button
                onClick={() => setShowCreateSuiteModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Scope Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewSuiteScopeType('PRODUCT');
                      setNewSuiteScopeId(products[0]?.id || '');
                    }}
                    className={`py-1.5 px-3 rounded-lg border font-medium transition ${
                      newSuiteScopeType === 'PRODUCT'
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Product Suite
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewSuiteScopeType('PROJECT');
                      setNewSuiteScopeId(projects[0]?.id || '');
                    }}
                    className={`py-1.5 px-3 rounded-lg border font-medium transition ${
                      newSuiteScopeType === 'PROJECT'
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Project Suite
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Target Entity *</label>
                <select
                  value={newSuiteScopeId}
                  onChange={(e) => setNewSuiteScopeId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Select Target...</option>
                  {newSuiteScopeType === 'PRODUCT'
                    ? products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.product_name}
                        </option>
                      ))
                    : projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.project_name}
                        </option>
                      ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Suite Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Core Financial & Ledger Regression Suite"
                  value={newSuiteName}
                  onChange={(e) => setNewSuiteName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Scope of coverage and verification guidelines..."
                  value={newSuiteDesc}
                  onChange={(e) => setNewSuiteDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowCreateSuiteModal(false)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSuite}
                disabled={!newSuiteName || !newSuiteScopeId}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium"
              >
                Create Suite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREATE TEST CASE                                  */}
      {/* ======================================================== */}
      {showCreateCaseModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-indigo-600" />
                Add Test Case to Suite
              </h3>
              <button
                onClick={() => setShowCreateCaseModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Verify Inter-State IGST Calculation on Bulk Invoices"
                  value={newCaseTitle}
                  onChange={(e) => setNewCaseTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Severity</label>
                  <select
                    value={newCaseSeverity}
                    onChange={(e: any) => setNewCaseSeverity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="BLOCKER">BLOCKER</option>
                    <option value="MAJOR">MAJOR</option>
                    <option value="MINOR">MINOR</option>
                    <option value="TRIVIAL">TRIVIAL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Priority</label>
                  <select
                    value={newCasePriority}
                    onChange={(e: any) => setNewCasePriority(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Execution</label>
                  <select
                    value={newCaseExecType}
                    onChange={(e: any) => setNewCaseExecType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                  >
                    <option value="MANUAL">MANUAL</option>
                    <option value="AUTOMATED">AUTOMATED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Est. Minutes</label>
                  <input
                    type="number"
                    value={newCaseEstMinutes}
                    onChange={(e) => setNewCaseEstMinutes(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Preconditions</label>
                <input
                  type="text"
                  placeholder="e.g. Valid GST credentials and multi-state billing entities configured"
                  value={newCasePreconditions}
                  onChange={(e) => setNewCasePreconditions(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                />
              </div>

              {/* Step Builder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-slate-600 font-semibold">Test Steps</label>
                  <button
                    type="button"
                    onClick={() =>
                      setNewCaseSteps([
                        ...newCaseSteps,
                        { step_number: newCaseSteps.length + 1, action: '', expected_result: '' },
                      ])
                    }
                    className="text-indigo-600 hover:text-indigo-700 text-xs font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Step
                  </button>
                </div>

                <div className="space-y-2">
                  {newCaseSteps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <span className="font-bold text-slate-400 py-1 text-xs">#{idx + 1}</span>
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Action step description..."
                          value={step.action}
                          onChange={(e) => {
                            const updated = [...newCaseSteps];
                            updated[idx].action = e.target.value;
                            setNewCaseSteps(updated);
                          }}
                          className="bg-white border border-slate-200 rounded p-1.5 text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Expected result for this step..."
                          value={step.expected_result}
                          onChange={(e) => {
                            const updated = [...newCaseSteps];
                            updated[idx].expected_result = e.target.value;
                            setNewCaseSteps(updated);
                          }}
                          className="bg-white border border-slate-200 rounded p-1.5 text-xs"
                        />
                      </div>
                      {newCaseSteps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setNewCaseSteps(newCaseSteps.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-rose-600 py-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Overall Expected Result *</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Ledger posting balances IGST component without decimal truncation."
                  value={newCaseExpectedResult}
                  onChange={(e) => setNewCaseExpectedResult(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowCreateCaseModal(false)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCase}
                disabled={!newCaseTitle || !newCaseExpectedResult}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium"
              >
                Save Test Case
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREATE TEST RUN                                   */}
      {/* ======================================================== */}
      {showCreateRunModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Play className="w-4 h-4 text-indigo-600" />
                Launch Test Execution Run
              </h3>
              <button
                onClick={() => setShowCreateRunModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Run Title *</label>
                <input
                  type="text"
                  placeholder="e.g. v2.4.0 RC Staging Full Regression"
                  value={newRunTitle}
                  onChange={(e) => setNewRunTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Environment</label>
                  <select
                    value={newRunEnv}
                    onChange={(e: any) => setNewRunEnv(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                  >
                    <option value="LOCAL">LOCAL</option>
                    <option value="QA">QA</option>
                    <option value="STAGING">STAGING</option>
                    <option value="UAT">UAT</option>
                    <option value="PRODUCTION">PRODUCTION</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Lead Assignee</label>
                  <select
                    value={newRunAssigneeId}
                    onChange={(e) => setNewRunAssigneeId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                  >
                    <option value="">Select QA Engineer...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.first_name} {u.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Select Test Suites to Include in Run *
                </label>
                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1 bg-slate-50">
                  {suites.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 p-1 hover:bg-white rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newRunSelectedSuites.includes(s.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewRunSelectedSuites([...newRunSelectedSuites, s.id]);
                          } else {
                            setNewRunSelectedSuites(newRunSelectedSuites.filter((id) => id !== s.id));
                          }
                        }}
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      <span className="font-medium text-slate-800">{s.suite_name}</span>
                      <span className="text-[10px] text-slate-400">({s.total_cases_count || 0} cases)</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowCreateRunModal(false)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRun}
                disabled={!newRunTitle || newRunSelectedSuites.length === 0}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium"
              >
                Launch Run
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: RECORD TEST EXECUTION                             */}
      {/* ======================================================== */}
      {selectedRunItemForExec && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                Record Execution Result
              </h3>
              <button
                onClick={() => setSelectedRunItemForExec(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-mono text-indigo-600 font-semibold">
                  {selectedRunItemForExec.case_code}
                </span>
                <h4 className="font-medium text-slate-900 mt-0.5">
                  {selectedRunItemForExec.case_title}
                </h4>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Execution Status *</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['PASSED', 'FAILED', 'BLOCKED', 'SKIPPED'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setExecStatus(st)}
                      className={`py-1.5 rounded-lg border text-xs font-semibold transition ${
                        execStatus === st
                          ? st === 'PASSED'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : st === 'FAILED'
                            ? 'bg-rose-600 text-white border-rose-600'
                            : st === 'BLOCKED'
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-slate-600 text-white border-slate-600'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Actual Result *</label>
                <textarea
                  rows={3}
                  placeholder="Detail observed system behavior, calculation outputs, or error logs..."
                  value={execActualResult}
                  onChange={(e) => setExecActualResult(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Evidence URL (S3 / Screenshot)</label>
                <input
                  type="text"
                  placeholder="https://s3.ap-south-1.amazonaws.com/evidence/..."
                  value={execEvidenceUrl}
                  onChange={(e) => setExecEvidenceUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedRunItemForExec(null)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteItem}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium"
              >
                Save Execution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: 1-CLICK DEFECT CREATION                           */}
      {/* ======================================================== */}
      {selectedItemForDefect && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-rose-700 text-sm flex items-center gap-2">
                <Bug className="w-4 h-4 text-rose-600" />
                1-Click Log Bug Defect
              </h3>
              <button
                onClick={() => setSelectedItemForDefect(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-500">
                This will create a new BUG task in the backlog, copy test steps, expected/actual behavior, and automatically link it to this test run item.
              </p>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Defect Title *</label>
                <input
                  type="text"
                  value={defectTitle}
                  onChange={(e) => setDefectTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Priority</label>
                  <select
                    value={defectPriority}
                    onChange={(e: any) => setDefectPriority(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Assign Developer</label>
                  <select
                    value={defectAssigneeId}
                    onChange={(e) => setDefectAssigneeId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                  >
                    <option value="">Unassigned...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.first_name} {u.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Description & Findings</label>
                <textarea
                  rows={4}
                  value={defectDesc}
                  onChange={(e) => setDefectDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedItemForDefect(null)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleLogDefect}
                disabled={!defectTitle}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                Create & Link Defect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: VERIFY RELEASE GATE ITEM                          */}
      {/* ======================================================== */}
      {verifyingItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                Verify Quality Gate: {verifyingItem.item_code}
              </h3>
              <button
                onClick={() => setVerifyingItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <h4 className="font-semibold text-slate-900">{verifyingItem.title}</h4>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Decision Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['PASSED', 'FAILED', 'WAIVED'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setItemVerifyStatus(st)}
                      className={`py-1.5 rounded-lg border text-xs font-semibold transition ${
                        itemVerifyStatus === st
                          ? st === 'PASSED'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : st === 'FAILED'
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-amber-600 text-white border-amber-600'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Evidence & Verification Notes</label>
                <textarea
                  rows={3}
                  placeholder="Record verification metrics, report links, or test run codes..."
                  value={itemEvidenceNotes}
                  onChange={(e) => setItemEvidenceNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                />
              </div>

              {itemVerifyStatus === 'WAIVED' && (
                <div>
                  <label className="block text-amber-800 font-semibold mb-1">
                    Waiver Justification *
                  </label>
                  <textarea
                    rows={2}
                    placeholder="State technical reason or mitigation strategy for waiving this gate..."
                    value={itemWaivedReason}
                    onChange={(e) => setItemWaivedReason(e.target.value)}
                    className="w-full bg-amber-50 border border-amber-200 rounded-lg p-2 text-amber-900"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setVerifyingItem(null)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateChecklistItem}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium"
              >
                Submit Gate Verification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: RELEASE GATEKEEPER SIGNOFF                        */}
      {/* ======================================================== */}
      {showSignoffModal && selectedChecklist && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600" />
                Release Gatekeeper Signoff Decision
              </h3>
              <button
                onClick={() => setShowSignoffModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Gatekeeper Decision *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSignoffDecision('READY_FOR_RELEASE')}
                    className={`p-2.5 rounded-lg border font-semibold text-center transition ${
                      signoffDecision === 'READY_FOR_RELEASE'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Ready for Release
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignoffDecision('CONDITIONAL_RELEASE')}
                    className={`p-2.5 rounded-lg border font-semibold text-center transition ${
                      signoffDecision === 'CONDITIONAL_RELEASE'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Conditional Release
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignoffDecision('BLOCKED')}
                    className={`p-2.5 rounded-lg border font-semibold text-center transition ${
                      signoffDecision === 'BLOCKED'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Blocked
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Signoff Notes *</label>
                <textarea
                  rows={3}
                  placeholder="Summary of release review, readiness confirmation, and deployment instructions..."
                  value={signoffNotes}
                  onChange={(e) => setSignoffNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                />
              </div>

              {signoffDecision === 'CONDITIONAL_RELEASE' && (
                <div>
                  <label className="block text-amber-800 font-semibold mb-1">
                    Release Exceptions / Hotfix Commitments *
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Document conditional clauses, post-deploy monitoring or scheduled hotfix deadlines..."
                    value={signoffExceptions}
                    onChange={(e) => setSignoffExceptions(e.target.value)}
                    className="w-full bg-amber-50 border border-amber-200 rounded-lg p-2 text-amber-900"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowSignoffModal(false)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSignoffChecklist}
                disabled={!signoffNotes}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                Confirm Gatekeeper Signoff
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREATE RELEASE GATEKEEPER CHECKLIST              */}
      {/* ======================================================== */}
      {showCreateChecklistModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600" />
                Create Release Gatekeeper
              </h3>
              <button
                onClick={() => setShowCreateChecklistModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Checklist Title *</label>
                <input
                  type="text"
                  placeholder="e.g. KashFlow ERP v2.4.0 Production Cutover Gatekeeper"
                  value={newClTitle}
                  onChange={(e) => setNewClTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Target Version</label>
                  <select
                    value={newClVersionId}
                    onChange={(e) => setNewClVersionId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                  >
                    <option value="">Select Version...</option>
                    {versions.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.version_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Target Date</label>
                  <input
                    type="date"
                    value={newClTargetDate}
                    onChange={(e) => setNewClTargetDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Lead QA User</label>
                  <select
                    value={newClLeadQaId}
                    onChange={(e) => setNewClLeadQaId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                  >
                    <option value="">Select QA Lead...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.first_name} {u.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Signoff PM / Owner</label>
                  <select
                    value={newClSignoffPmId}
                    onChange={(e) => setNewClSignoffPmId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                  >
                    <option value="">Select PM...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.first_name} {u.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 bg-slate-50 p-2 rounded">
                Note: Will automatically pre-populate with the 6 standard quality gates (Regression &gt;= 95%, OWASP Security, Performance SLA, Schema Migration Dry-Run, Client Signoff, Documentation).
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowCreateChecklistModal(false)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateChecklist}
                disabled={!newClTitle}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium"
              >
                Create Gatekeeper
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
