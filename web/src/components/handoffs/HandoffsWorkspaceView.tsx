import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { handoffsApi, teamsApi, tasksApi } from '../../api/endpoints';
import api from '../../api/client';
import {
  TaskHandoff,
  HandoffAnalyticsResponse,
  DeliveryTeam,
  User,
  Task,
} from '../../types';
import {
  ArrowRightLeft,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  CornerUpRight,
  Plus,
  Search,
  Filter,
  Users,
  User as UserIcon,
  Layers,
  FileText,
  Calendar,
  Activity,
  History,
  Info,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  X,
  Play,
  Check,
} from 'lucide-react';

export const HandoffsWorkspaceView: React.FC = () => {
  const { user, hasPermission } = useAuth();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'waiting-me' | 'waiting-others' | 'analytics'>('waiting-me');

  // Queue Data
  const [inboundQueue, setInboundQueue] = useState<TaskHandoff[]>([]);
  const [outboundQueue, setOutboundQueue] = useState<TaskHandoff[]>([]);
  const [analytics, setAnalytics] = useState<HandoffAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Master options
  const [teams, setTeams] = useState<DeliveryTeam[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isRedirectModalOpen, setIsRedirectModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedHandoff, setSelectedHandoff] = useState<TaskHandoff | null>(null);
  const [taskHistory, setTaskHistory] = useState<TaskHandoff[]>([]);

  // Form states
  const [createTaskId, setCreateTaskId] = useState('');
  const [createFromTeamId, setCreateFromTeamId] = useState('');
  const [createToTeamId, setCreateToTeamId] = useState('');
  const [createToUserId, setCreateToUserId] = useState('');
  const [createHandoffType, setCreateHandoffType] = useState('DEV_TO_QA');
  const [createRequiredContext, setCreateRequiredContext] = useState('');
  const [createNotes, setCreateNotes] = useState('');

  const [returnReason, setReturnReason] = useState('');
  const [returnNotes, setReturnNotes] = useState('');

  const [redirectToTeamId, setRedirectToTeamId] = useState('');
  const [redirectToUserId, setRedirectToUserId] = useState('');
  const [redirectReason, setRedirectReason] = useState('');
  const [redirectNotes, setRedirectNotes] = useState('');

  const canCreate = hasPermission('HANDOFFS:CREATE') || user?.role_code === 'ROLE_SUPER_ADMIN';
  const canAck = hasPermission('HANDOFFS:ACKNOWLEDGE') || user?.role_code === 'ROLE_SUPER_ADMIN';
  const canManage = hasPermission('HANDOFFS:MANAGE') || user?.role_code === 'ROLE_SUPER_ADMIN';

  // Load Queues
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [inboundRes, outboundRes, analyticsRes] = await Promise.all([
        handoffsApi.getWaitingForMe(),
        handoffsApi.getWaitingForOthers(),
        handoffsApi.getAnalytics(),
      ]);

      setInboundQueue(inboundRes.data || []);
      setOutboundQueue(outboundRes.data || []);
      setAnalytics(analyticsRes.data || null);
    } catch (err: any) {
      console.error('Failed to load handoffs queue:', err);
      setError(err?.response?.data?.message || 'Failed to load handoff queues');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Master Data (Teams, Users, Tasks)
  useEffect(() => {
    loadData();

    // Load master reference items for modals
    const fetchMasters = async () => {
      try {
        const [teamsRes, usersRes, tasksRes] = await Promise.all([
          teamsApi.getAll(),
          api.get('/users?limit=200'),
          tasksApi.getTasks({ limit: 100 }),
        ]);
        setTeams(teamsRes.data || []);
        const userItems = Array.isArray(usersRes.data)
          ? usersRes.data
          : (usersRes.data as any)?.items || (usersRes.data as any)?.data || [];
        setUsers(userItems);
        const taskItems = Array.isArray(tasksRes.data)
          ? tasksRes.data
          : (tasksRes.data as any)?.data || (tasksRes.data as any)?.items || [];
        setTasks(taskItems);
      } catch (e) {
        console.error('Failed to load master references:', e);
      }
    };
    fetchMasters();
  }, [loadData]);

  // Actions
  const handleAcknowledge = async (handoff: TaskHandoff) => {
    try {
      await handoffsApi.acknowledge(handoff.id, { notes: 'Acknowledged receipt from waiting queue' });
      setSuccessMsg(`Handoff for ${handoff.task_code || 'Task'} acknowledged successfully.`);
      loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to acknowledge handoff');
    }
  };

  const handleStartWork = async (handoff: TaskHandoff) => {
    try {
      await handoffsApi.startWork(handoff.id, { notes: 'Started active execution' });
      setSuccessMsg(`Work started on ${handoff.task_code || 'Task'}.`);
      loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to start work on handoff');
    }
  };

  const handleComplete = async (handoff: TaskHandoff) => {
    try {
      await handoffsApi.complete(handoff.id, { notes: 'Stage work completed successfully' });
      setSuccessMsg(`Handoff completed for ${handoff.task_code || 'Task'}.`);
      loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to complete handoff');
    }
  };

  const openReturnModal = (handoff: TaskHandoff) => {
    setSelectedHandoff(handoff);
    setReturnReason('');
    setReturnNotes('');
    setIsReturnModalOpen(true);
  };

  const submitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHandoff || !returnReason.trim()) return;

    try {
      await handoffsApi.returnForRework(selectedHandoff.id, {
        reason: returnReason.trim(),
        notes: returnNotes.trim() || undefined,
      });
      setIsReturnModalOpen(false);
      setSelectedHandoff(null);
      setSuccessMsg('Handoff returned for rework. Linked successor episode opened for original sender.');
      loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to return handoff for rework');
    }
  };

  const openRedirectModal = (handoff: TaskHandoff) => {
    setSelectedHandoff(handoff);
    setRedirectToTeamId(handoff.to_team_id || '');
    setRedirectToUserId('');
    setRedirectReason('');
    setRedirectNotes('');
    setIsRedirectModalOpen(true);
  };

  const submitRedirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHandoff) return;

    try {
      await handoffsApi.redirect(selectedHandoff.id, {
        toTeamId: redirectToTeamId || undefined,
        toUserId: redirectToUserId || undefined,
        reason: redirectReason.trim() || undefined,
        notes: redirectNotes.trim() || undefined,
      });
      setIsRedirectModalOpen(false);
      setSelectedHandoff(null);
      setSuccessMsg('Handoff successfully redirected to new recipient.');
      loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to redirect handoff');
    }
  };

  const openHistoryModal = async (handoff: TaskHandoff) => {
    setSelectedHandoff(handoff);
    setIsHistoryModalOpen(true);
    try {
      const res = await handoffsApi.getTaskHistory(handoff.task_id);
      setTaskHistory(res.data || []);
    } catch (err) {
      console.error('Failed to load task history:', err);
    }
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTaskId) {
      setError('Please select a task to hand off.');
      return;
    }
    if (!createToTeamId && !createToUserId) {
      setError('Please choose either a receiving team or user.');
      return;
    }

    try {
      await handoffsApi.create({
        taskId: createTaskId,
        fromTeamId: createFromTeamId || undefined,
        toTeamId: createToTeamId || undefined,
        toUserId: createToUserId || undefined,
        handoffType: createHandoffType,
        requiredContext: createRequiredContext.trim() || undefined,
        notes: createNotes.trim() || undefined,
      });
      setIsCreateModalOpen(false);
      setCreateTaskId('');
      setCreateRequiredContext('');
      setCreateNotes('');
      setSuccessMsg('Handoff initiated successfully and placed in recipient queue.');
      loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to initiate handoff');
    }
  };

  // Filter queues based on search and filters
  const filterList = (items: TaskHandoff[]) => {
    return items.filter((h) => {
      const matchSearch =
        searchQuery === '' ||
        (h.task_code && h.task_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (h.task_title && h.task_title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (h.from_user_name && h.from_user_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (h.to_user_name && h.to_user_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (h.from_team_name && h.from_team_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (h.to_team_name && h.to_team_name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStage = stageFilter === 'ALL' || h.handoff_type === stageFilter;
      const matchStatus = statusFilter === 'ALL' || h.status === statusFilter;

      return matchSearch && matchStage && matchStatus;
    });
  };

  const filteredInbound = filterList(inboundQueue);
  const filteredOutbound = filterList(outboundQueue);

  // Status Badge Component
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <Clock className="w-3 h-3 mr-1" />
            Pending Ack
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Accepted
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
            <Activity className="w-3 h-3 mr-1" />
            In Progress
          </span>
        );
      case 'RETURNED_FOR_REWORK':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
            <RotateCcw className="w-3 h-3 mr-1" />
            Rework
          </span>
        );
      case 'REDIRECTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
            <CornerUpRight className="w-3 h-3 mr-1" />
            Redirected
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <Check className="w-3 h-3 mr-1" />
            Completed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-sm">
              <ArrowRightLeft className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Work Handoff Tracking & Waiting Queues
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Cross-role transitions, unbroken queue duration episodes, and team waiting analytics
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {canCreate && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Initiate Handoff
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between text-rose-800 text-sm dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
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

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('waiting-me')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'waiting-me'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          Waiting for Me (Inbound)
          <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
            {inboundQueue.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('waiting-others')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'waiting-others'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          Waiting for Others (Outbound)
          <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {outboundQueue.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'analytics'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Waiting & Rework Analytics
        </button>
      </div>

      {/* Search and Filters Bar (Tabs 1 & 2) */}
      {activeTab !== 'analytics' && (
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by task code, title, colleague or team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Stages</option>
                <option value="BA_TO_DEV">BA → Dev</option>
                <option value="DEV_TO_REVIEW">Dev → Review</option>
                <option value="DEV_TO_QA">Dev → QA</option>
                <option value="QA_TO_DEV_REWORK">QA → Rework</option>
                <option value="DEV_TO_UAT">Dev → UAT</option>
                <option value="CLIENT_REVIEW">Client Review</option>
                <option value="GENERAL">General</option>
              </select>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Ack</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RETURNED_FOR_REWORK">Returned Rework</option>
              <option value="REDIRECTED">Redirected</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </div>
      )}

      {/* Tab 1: Waiting for Me */}
      {activeTab === 'waiting-me' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-slate-500 text-sm">Loading queue...</div>
          ) : filteredInbound.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                Inbound Queue is Clear!
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
                You have no tasks awaiting your acknowledgment or initiation across your personal or delivery team queues.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredInbound.map((handoff) => (
                <div
                  key={handoff.id}
                  className={`bg-white dark:bg-slate-900 rounded-xl border p-5 transition-shadow hover:shadow-md ${
                    handoff.is_overdue
                      ? 'border-rose-300 dark:border-rose-900 bg-rose-50/20'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: Task & Handoff Info */}
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                          {handoff.task_code || 'TSK'}
                        </span>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                          {handoff.task_title || 'Untitled Task'}
                        </h3>
                        {renderStatusBadge(handoff.status)}

                        {handoff.is_ownerless && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-500 text-white animate-pulse">
                            Team Queue (Unassigned)
                          </span>
                        )}

                        {handoff.is_overdue && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-600 text-white">
                            Overdue (&gt;24h)
                          </span>
                        )}

                        <span className="text-xs px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium">
                          {handoff.handoff_type}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          From: <strong className="text-slate-700 dark:text-slate-200">{handoff.from_user_name}</strong>
                          {handoff.from_team_name && ` (${handoff.from_team_name})`}
                        </span>

                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Sent: {new Date(handoff.sent_at).toLocaleString()}
                        </span>

                        {handoff.project_name && (
                          <span className="flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-slate-400" />
                            {handoff.project_name}
                          </span>
                        )}
                      </div>

                      {/* Dual Metric Waiting Duration Badge */}
                      <div className="inline-flex items-center gap-3 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Elapsed Waiting:</span>
                          <strong className="text-indigo-600 dark:text-indigo-400">
                            {handoff.waitingDuration?.elapsedFormatted || '0m'}
                          </strong>
                        </div>
                        <span className="text-slate-300 dark:text-slate-600">|</span>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Business Hours:</span>
                          <strong className="text-emerald-600 dark:text-emerald-400">
                            {handoff.waitingDuration?.businessFormatted || '0m'}
                          </strong>
                        </div>
                      </div>

                      {/* Required Context & Notes */}
                      {handoff.required_context && (
                        <div className="text-xs bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                          <strong>Context / Evidence:</strong> {handoff.required_context}
                        </div>
                      )}
                    </div>

                    {/* Right: Stage Action Buttons */}
                    <div className="flex flex-wrap md:flex-col gap-2 justify-end min-w-[160px]">
                      {handoff.status === 'PENDING' && canAck && (
                        <button
                          onClick={() => handleAcknowledge(handoff)}
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                          {handoff.is_ownerless ? 'Claim & Acknowledge' : 'Acknowledge'}
                        </button>
                      )}

                      {handoff.status === 'ACCEPTED' && canAck && (
                        <button
                          onClick={() => handleStartWork(handoff)}
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                        >
                          <Play className="w-3.5 h-3.5" />
                          Start Work
                        </button>
                      )}

                      {handoff.status === 'IN_PROGRESS' && canAck && (
                        <button
                          onClick={() => handleComplete(handoff)}
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Complete Stage
                        </button>
                      )}

                      {canManage && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => openReturnModal(handoff)}
                            className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950 dark:hover:bg-rose-900 text-xs font-medium rounded border border-rose-200 dark:border-rose-800 transition-colors"
                            title="Return for Rework"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Return
                          </button>

                          <button
                            onClick={() => openRedirectModal(handoff)}
                            className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950 dark:hover:bg-purple-900 text-xs font-medium rounded border border-purple-200 dark:border-purple-800 transition-colors"
                            title="Redirect / Forward"
                          >
                            <CornerUpRight className="w-3 h-3" />
                            Redirect
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => openHistoryModal(handoff)}
                        className="flex items-center justify-center gap-1 px-2.5 py-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-medium transition-colors"
                      >
                        <History className="w-3.5 h-3.5" />
                        History Timeline
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Waiting for Others */}
      {activeTab === 'waiting-others' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-slate-500 text-sm">Loading queue...</div>
          ) : filteredOutbound.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <CheckCircle2 className="w-12 h-12 text-blue-500 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                No Outbound Handoffs Pending
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
                You have not initiated any handoffs currently pending on other team members or departments.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredOutbound.map((handoff) => (
                <div
                  key={handoff.id}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                          {handoff.task_code || 'TSK'}
                        </span>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                          {handoff.task_title || 'Untitled Task'}
                        </h3>
                        {renderStatusBadge(handoff.status)}

                        <span className="text-xs px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium">
                          {handoff.handoff_type}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          Waiting on:{' '}
                          <strong className="text-slate-700 dark:text-slate-200">
                            {handoff.to_user_name || handoff.to_team_name || 'Unassigned Team Queue'}
                          </strong>
                        </span>

                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Sent: {new Date(handoff.sent_at).toLocaleString()}
                        </span>
                      </div>

                      {/* Duration metrics */}
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Waiting Duration: <strong className="text-indigo-600">{handoff.waitingDuration?.elapsedFormatted}</strong>
                        </div>

                        {handoff.timeToAck && (
                          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            Time to Ack: <strong>{handoff.timeToAck.elapsedFormatted}</strong>
                          </div>
                        )}

                        {handoff.timeToWorkStart && (
                          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                            <Activity className="w-3.5 h-3.5 text-indigo-500" />
                            Time to Start: <strong>{handoff.timeToWorkStart.elapsedFormatted}</strong>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <button
                        onClick={() => openHistoryModal(handoff)}
                        className="flex items-center gap-1 px-3 py-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
                      >
                        <History className="w-3.5 h-3.5" />
                        View Episode History
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Analytics */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-medium text-slate-500">Total Handoff Episodes</span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {analytics.summary.totalHandoffs}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-medium text-slate-500">Rework Frequency</span>
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                {analytics.summary.reworkRatePct}%
              </div>
              <span className="text-xs text-slate-400 mt-0.5 block">
                {analytics.summary.totalReworkCount} returned for rework
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-medium text-slate-500">Redirected Episodes</span>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {analytics.summary.redirectedCount}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-medium text-slate-500">Avg Time-to-Acknowledgment</span>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                {analytics.summary.avgTimeToAckElapsed}
              </div>
              <span className="text-xs text-slate-400 mt-0.5 block">
                {analytics.summary.ackSampleCount} samples
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-medium text-slate-500">Avg Time-to-Work-Start</span>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {analytics.summary.avgTimeToWorkStartElapsed}
              </div>
              <span className="text-xs text-slate-400 mt-0.5 block">
                {analytics.summary.workStartSampleCount} samples
              </span>
            </div>
          </div>

          {/* Zero Blame Process Notice */}
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-3 text-indigo-900 text-xs dark:bg-indigo-950/40 dark:border-indigo-900 dark:text-indigo-200">
            <Info className="w-5 h-5 flex-shrink-0 text-indigo-600" />
            <div>
              <strong>Zero Individual Blame Standard:</strong> All handoff waiting durations and rework rates are aggregated strictly by workflow stage and delivery team. This prevents individual blame and pinpoints systemic friction, handover gaps, and queue delays.
            </div>
          </div>

          {/* Stage Breakdown Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Waiting Durations & Rework by Workflow Stage
              </h3>
            </div>
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 text-xs uppercase font-semibold">
                  <th className="py-3 px-6">Workflow Stage</th>
                  <th className="py-3 px-6">Sample Size</th>
                  <th className="py-3 px-6">Rework Count</th>
                  <th className="py-3 px-6">Rework Rate (%)</th>
                  <th className="py-3 px-6">Avg Time to Ack</th>
                  <th className="py-3 px-6">Avg Time to Work Start</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {analytics.byStage.map((st) => (
                  <tr key={st.stage} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3.5 px-6 font-semibold text-slate-900 dark:text-white">
                      {st.stage}
                    </td>
                    <td className="py-3.5 px-6 text-slate-600 dark:text-slate-300">
                      {st.totalCount} episodes
                    </td>
                    <td className="py-3.5 px-6 text-slate-600 dark:text-slate-300">
                      {st.reworkCount}
                    </td>
                    <td className="py-3.5 px-6">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${
                          st.reworkRatePct > 20
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {st.reworkRatePct}%
                      </span>
                    </td>
                    <td className="py-3.5 px-6 font-mono text-xs text-indigo-600 dark:text-indigo-400">
                      {st.avgTimeToAckFormatted}
                    </td>
                    <td className="py-3.5 px-6 font-mono text-xs text-emerald-600 dark:text-emerald-400">
                      {st.avgTimeToWorkStartFormatted}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Initiate Handoff */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                Initiate Work Handoff
              </h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Task to Hand Off *
                </label>
                <select
                  value={createTaskId}
                  onChange={(e) => setCreateTaskId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">-- Choose a task --</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      [{t.task_code || 'TSK'}] {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Handoff Stage / Type *
                  </label>
                  <select
                    value={createHandoffType}
                    onChange={(e) => setCreateHandoffType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="BA_TO_DEV">BA → Development</option>
                    <option value="DEV_TO_REVIEW">Development → Code Review</option>
                    <option value="DEV_TO_QA">Development → QA</option>
                    <option value="QA_TO_DEV_REWORK">QA → Dev Rework</option>
                    <option value="DEV_TO_UAT">Development → UAT</option>
                    <option value="CLIENT_REVIEW">Client Review</option>
                    <option value="GENERAL">General Handover</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Sender Team (Optional)
                  </label>
                  <select
                    value={createFromTeamId}
                    onChange={(e) => setCreateFromTeamId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                  >
                    <option value="">-- Auto-resolve from membership --</option>
                    {teams.map((tm) => (
                      <option key={tm.id} value={tm.id}>
                        {tm.team_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Receiving Team
                  </label>
                  <select
                    value={createToTeamId}
                    onChange={(e) => setCreateToTeamId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                  >
                    <option value="">-- Select receiving team queue --</option>
                    {teams.map((tm) => (
                      <option key={tm.id} value={tm.id}>
                        {tm.team_name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">Can sit in team queue without user assigned</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Receiving Individual (Optional)
                  </label>
                  <select
                    value={createToUserId}
                    onChange={(e) => setCreateToUserId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                  >
                    <option value="">-- Unassigned (Team Queue) --</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.first_name} {u.last_name} ({u.role_name || u.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Required Context / Test Evidence / Environment Links
                </label>
                <textarea
                  rows={3}
                  value={createRequiredContext}
                  onChange={(e) => setCreateRequiredContext(e.target.value)}
                  placeholder="e.g. Staging branch URL, credentials, test accounts, PR links, acceptance criteria checklist..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Additional Notes
                </label>
                <input
                  type="text"
                  value={createNotes}
                  onChange={(e) => setCreateNotes(e.target.value)}
                  placeholder="Optional notes or instructions..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm"
                >
                  Send Handoff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Return for Rework */}
      {isReturnModalOpen && selectedHandoff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <RotateCcw className="w-5 h-5" />
                Return for Rework
              </h2>
              <button onClick={() => setIsReturnModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Returning this handoff will close this episode and automatically link a new rework episode assigned back to the original sender ({selectedHandoff.from_user_name}), preserving full queue history.
            </p>

            <form onSubmit={submitReturn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Defect / Return Reason *
                </label>
                <textarea
                  rows={3}
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Detail the defect, unmet acceptance criteria, or issues requiring rework..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Additional Notes (Optional)
                </label>
                <input
                  type="text"
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="Steps to reproduce or attachments notes..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg shadow-sm"
                >
                  Confirm Return for Rework
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Redirect Handoff */}
      {isRedirectModalOpen && selectedHandoff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-purple-600 dark:text-purple-400 flex items-center gap-2">
                <CornerUpRight className="w-5 h-5" />
                Redirect / Forward Handoff
              </h2>
              <button onClick={() => setIsRedirectModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Redirecting closes your queue custody and creates a linked successor episode for the target team or user without overlapping queue durations.
            </p>

            <form onSubmit={submitRedirect} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Forward to Team
                </label>
                <select
                  value={redirectToTeamId}
                  onChange={(e) => setRedirectToTeamId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                >
                  <option value="">-- Choose Team --</option>
                  {teams.map((tm) => (
                    <option key={tm.id} value={tm.id}>
                      {tm.team_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Forward to Individual User (Optional)
                </label>
                <select
                  value={redirectToUserId}
                  onChange={(e) => setRedirectToUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                >
                  <option value="">-- Unassigned (Team Queue) --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} ({u.role_name || u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Redirect Reason
                </label>
                <input
                  type="text"
                  value={redirectReason}
                  onChange={(e) => setRedirectReason(e.target.value)}
                  placeholder="e.g. Belongs to infrastructure team, reassigned QA owner..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRedirectModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg shadow-sm"
                >
                  Confirm Redirect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Episode Chain / History Timeline */}
      {isHistoryModalOpen && selectedHandoff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600" />
                  Handoff Episode Chain
                </h2>
                <p className="text-xs text-slate-500">
                  Task: {selectedHandoff.task_code} - {selectedHandoff.task_title}
                </p>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1 flex-1">
              {taskHistory.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">Loading episodes...</div>
              ) : (
                taskHistory.map((ep, idx) => (
                  <div key={ep.id} className="relative pl-6 border-l-2 border-indigo-200 dark:border-indigo-900 pb-4">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-indigo-600 border-2 border-white dark:border-slate-900" />

                    <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                          Episode #{idx + 1}: {ep.handoff_type}
                        </span>
                        {renderStatusBadge(ep.status)}
                      </div>

                      <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
                        <span>
                          From: <strong>{ep.from_user_name}</strong> {ep.from_team_name && `(${ep.from_team_name})`}
                        </span>
                        <span>
                          To: <strong>{ep.to_user_name || ep.to_team_name || 'Team Queue'}</strong>
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center gap-4">
                        <span>Sent: {new Date(ep.sent_at).toLocaleString()}</span>
                        {ep.acknowledged_at && (
                          <span>Ack: {new Date(ep.acknowledged_at).toLocaleTimeString()}</span>
                        )}
                        {ep.work_started_at && (
                          <span>Started: {new Date(ep.work_started_at).toLocaleTimeString()}</span>
                        )}
                      </div>

                      {/* Durations */}
                      <div className="flex items-center gap-3 text-xs pt-1 border-t border-slate-200 dark:border-slate-700">
                        {ep.timeToAck && (
                          <span className="text-slate-500">
                            Time-to-Ack: <strong className="text-indigo-600">{ep.timeToAck.elapsedFormatted}</strong>
                          </span>
                        )}
                        {ep.timeToWorkStart && (
                          <span className="text-slate-500">
                            Time-to-Start:{' '}
                            <strong className="text-emerald-600">{ep.timeToWorkStart.elapsedFormatted}</strong>
                          </span>
                        )}
                      </div>

                      {ep.rejection_or_return_reason && (
                        <div className="p-2 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 text-xs">
                          <strong>Reason / Defect:</strong> {ep.rejection_or_return_reason}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg"
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
