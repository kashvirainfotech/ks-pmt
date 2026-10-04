import React, { useState, useEffect } from 'react';
import {
  Users,
  Calendar,
  Percent,
  TrendingUp,
  Brain,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  ChevronRight,
  Sliders,
  Sparkles,
  Award,
  Layers,
  BarChart3,
  CalendarDays,
  UserCheck,
  X,
  Compass,
  ArrowRight,
  HelpCircle,
  Briefcase,
  Info,
} from 'lucide-react';
import {
  capacityInsightsApi,
  projectsApi,
  teamsApi,
  tasksApi,
} from '../../api/endpoints';
import {
  Project,
  DeliveryTeam,
  CapacityWorkloadResponse,
  CapacityWorkloadMember,
  SkillSuggestionsResponse,
  TeamEstimationMetricsResponse,
  Skill,
  CapacityReservation,
} from '../../types';

export const CapacityInsightsWorkspace: React.FC = () => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<
    'workload' | 'split-effort' | 'skill-matching' | 'estimation-metrics' | 'reservations-skills'
  >('workload');

  // Scope filters
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<DeliveryTeam[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [searchMember, setSearchMember] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });

  // Data states
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [workloadData, setWorkloadData] = useState<CapacityWorkloadResponse | null>(null);
  const [selectedMember, setSelectedMember] = useState<CapacityWorkloadMember | null>(null);

  // Split Effort State
  const [splitTaskId, setSplitTaskId] = useState<string>('');
  const [splitTaskDetails, setSplitTaskDetails] = useState<any | null>(null);
  const [effortShares, setEffortShares] = useState<Array<{ userId: string; userName: string; effortSharePercentage: number }>>([]);
  const [splitEffortSubmitting, setSplitEffortSubmitting] = useState<boolean>(false);
  const [splitEffortSuccess, setSplitEffortSuccess] = useState<string | null>(null);

  // Skill Suggestions State
  const [suggestionTaskId, setSuggestionTaskId] = useState<string>('');
  const [skillSuggestions, setSkillSuggestions] = useState<SkillSuggestionsResponse | null>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState<boolean>(false);

  // Team Estimation Metrics State
  const [estimationMetrics, setEstimationMetrics] = useState<TeamEstimationMetricsResponse | null>(null);

  // Skills & Reservations State
  const [skills, setSkills] = useState<Skill[]>([]);
  const [reservations, setReservations] = useState<CapacityReservation[]>([]);
  const [catalogSubTab, setCatalogSubTab] = useState<'reservations' | 'skills'>('reservations');
  const [showCreateReservationModal, setShowCreateReservationModal] = useState<boolean>(false);
  const [showCreateSkillModal, setShowCreateSkillModal] = useState<boolean>(false);

  // Reservation form
  const [resForm, setResForm] = useState({
    reservation_code: '',
    user_id: '',
    reservation_type: 'SUPPORT_ROTATION',
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    daily_hours: 2,
    is_recurring: false,
  });

  // Skill form
  const [skillForm, setSkillForm] = useState({
    skill_code: '',
    name: '',
    category: 'BACKEND',
    description: '',
  });

  // Initial load
  useEffect(() => {
    loadMetadata();
  }, []);

  // Fetch workload whenever scope/date filters change
  useEffect(() => {
    loadWorkload();
    loadEstimationMetrics();
  }, [selectedProjectId, selectedTeamId, startDate, endDate]);

  const loadMetadata = async () => {
    try {
      const [projRes, teamRes, skillRes, resRes] = await Promise.all([
        projectsApi.getProjects(),
        teamsApi.getAll(),
        capacityInsightsApi.getSkills(),
        capacityInsightsApi.getReservations(),
      ]);
      setProjects(projRes.data || []);
      setTeams(teamRes.data || []);
      setSkills(skillRes.data || []);
      setReservations(resRes.data || []);
    } catch (err) {
      console.error('Failed to load metadata', err);
    }
  };

  const loadWorkload = async () => {
    try {
      setLoading(true);
      const res = await capacityInsightsApi.getWorkload({
        startDate,
        endDate,
        projectId: selectedProjectId || undefined,
        teamId: selectedTeamId || undefined,
      });
      setWorkloadData(res.data);
    } catch (err) {
      console.error('Failed to load capacity workload', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadEstimationMetrics = async () => {
    try {
      const res = await capacityInsightsApi.getTeamEstimationMetrics({
        projectId: selectedProjectId || undefined,
        teamId: selectedTeamId || undefined,
      });
      setEstimationMetrics(res.data);
    } catch (err) {
      console.error('Failed to load estimation metrics', err);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadWorkload();
    loadEstimationMetrics();
  };

  // Load task for effort splitting
  const handleSelectTaskForSplit = async (taskId: string) => {
    try {
      setSplitTaskId(taskId);
      setSplitEffortSuccess(null);
      const res = await tasksApi.getTaskById(taskId);
      const task = res.data;
      setSplitTaskDetails(task);

      if (task.assignees && task.assignees.length > 0) {
        const count = task.assignees.length;
        const initialShare = parseFloat((100 / count).toFixed(2));
        setEffortShares(
          task.assignees.map((a: any, idx: number) => ({
            userId: a.id,
            userName: `${a.firstName || ''} ${a.lastName || ''}`.trim() || a.email,
            effortSharePercentage:
              a.effort_share_percentage != null
                ? parseFloat(a.effort_share_percentage)
                : idx === count - 1
                ? 100 - initialShare * (count - 1)
                : initialShare,
          }))
        );
      } else {
        setEffortShares([]);
      }
      setActiveTab('split-effort');
    } catch (err) {
      console.error('Failed to load task details', err);
    }
  };

  // Split effort submit
  const handleSaveEffortSplit = async () => {
    if (!splitTaskId) return;
    const totalPercentage = effortShares.reduce(
      (sum, s) => sum + (Number(s.effortSharePercentage) || 0),
      0
    );
    if (Math.abs(totalPercentage - 100) > 0.05) {
      alert(`The total effort share must sum to exactly 100%. Current sum: ${totalPercentage.toFixed(1)}%`);
      return;
    }

    try {
      setSplitEffortSubmitting(true);
      await capacityInsightsApi.splitEffort({
        taskId: splitTaskId,
        assignees: effortShares.map((s) => ({
          userId: s.userId,
          effortSharePercentage: Number(s.effortSharePercentage),
        })),
      });
      setSplitEffortSuccess('Effort split saved successfully! Task demand is now accurately distributed.');
      loadWorkload();
    } catch (err: any) {
      console.error('Failed to split effort', err);
      alert(err.response?.data?.message || 'Failed to save effort split.');
    } finally {
      setSplitEffortSubmitting(false);
    }
  };

  // Skill Suggestions search
  const handleFetchSkillSuggestions = async (taskId: string) => {
    if (!taskId.trim()) return;
    try {
      setSuggestionsLoading(true);
      const res = await capacityInsightsApi.getSkillSuggestions(taskId.trim());
      setSkillSuggestions(res.data);
    } catch (err) {
      console.error('Failed to get skill suggestions', err);
      alert('Failed to load skill suggestions. Please verify the Task ID.');
    } finally {
      setSuggestionsLoading(false);
    }
  };

  // Create Reservation
  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resForm.user_id || !resForm.title || !resForm.start_date || !resForm.end_date) {
      alert('Please fill in all required fields.');
      return;
    }
    try {
      const code = resForm.reservation_code.trim() || `RES-${Date.now().toString().slice(-5)}`;
      await capacityInsightsApi.createReservation({
        ...resForm,
        reservation_code: code,
        daily_hours: Number(resForm.daily_hours),
      });
      setShowCreateReservationModal(false);
      setResForm({
        reservation_code: '',
        user_id: '',
        reservation_type: 'SUPPORT_ROTATION',
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        daily_hours: 2,
        is_recurring: false,
      });
      const resRes = await capacityInsightsApi.getReservations();
      setReservations(resRes.data || []);
      loadWorkload();
    } catch (err: any) {
      console.error('Failed to create reservation', err);
      alert(err.response?.data?.message || 'Failed to create reservation.');
    }
  };

  // Create Skill
  const handleCreateSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillForm.name || !skillForm.category) {
      alert('Please provide skill name and category.');
      return;
    }
    try {
      const code = skillForm.skill_code.trim() || skillForm.name.toUpperCase().replace(/\s+/g, '_');
      await capacityInsightsApi.createSkill({
        ...skillForm,
        skill_code: code,
      });
      setShowCreateSkillModal(false);
      setSkillForm({
        skill_code: '',
        name: '',
        category: 'BACKEND',
        description: '',
      });
      const skillRes = await capacityInsightsApi.getSkills();
      setSkills(skillRes.data || []);
    } catch (err: any) {
      console.error('Failed to create skill', err);
      alert(err.response?.data?.message || 'Failed to create skill.');
    }
  };

  // Filter members by text search
  const filteredMembers = (workloadData?.members || []).filter((m) => {
    if (!searchMember.trim()) return true;
    const term = searchMember.toLowerCase();
    return (
      m.userName.toLowerCase().includes(term) ||
      m.userEmail.toLowerCase().includes(term) ||
      (m.departmentName && m.departmentName.toLowerCase().includes(term)) ||
      (m.roleName && m.roleName.toLowerCase().includes(term))
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-sm">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Delivery, Workload & Capacity Insights</h1>
              <p className="text-sm text-gray-500">
                Non-additive capacity views, split co-assignee effort shares, explainable skill matching & team reliability metrics
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 -mb-px">
          <button
            onClick={() => setActiveTab('workload')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition ${
              activeTab === 'workload'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            Workload & Capacity Heatmap
          </button>

          <button
            onClick={() => setActiveTab('split-effort')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition ${
              activeTab === 'split-effort'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Percent className="w-4 h-4" />
            Co-Assignee Effort Splitter
          </button>

          <button
            onClick={() => setActiveTab('skill-matching')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition ${
              activeTab === 'skill-matching'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Explainable Skill Matching
          </button>

          <button
            onClick={() => setActiveTab('estimation-metrics')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition ${
              activeTab === 'estimation-metrics'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Team Estimation Reliability
          </button>

          <button
            onClick={() => setActiveTab('reservations-skills')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition ${
              activeTab === 'reservations-skills'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            Reservations & Skills Catalog
          </button>
        </nav>
      </div>

      {/* Scope & Date Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Project Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Project:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="text-sm bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_name}
                </option>
              ))}
            </select>
          </div>

          {/* Team Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Team:</span>
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="text-sm bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.team_name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filters */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Window:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-sm bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <span className="text-gray-400 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-sm bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search member, role..."
            value={searchMember}
            onChange={(e) => setSearchMember(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: WORKLOAD & CAPACITY HEATMAP */}
      {/* ======================================================== */}
      {activeTab === 'workload' && (
        <div className="space-y-6">
          {/* Executive Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Net Available Hours</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">
                  {workloadData?.summary.totalNetAvailableHours.toFixed(1) || '0.0'}h
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Base {workloadData?.summary.totalBaseHours.toFixed(0)}h - Reserved {workloadData?.summary.totalReservedHours.toFixed(0)}h
                </p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active Task Demand</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">
                  {workloadData?.summary.totalActiveDemandHours.toFixed(1) || '0.0'}h
                </h3>
                <p className="text-xs text-indigo-600 mt-0.5 font-medium">
                  Partitioned co-assignee shares
                </p>
              </div>
              <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                <Briefcase className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Capacity Utilization</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">
                  {workloadData?.summary.overallUtilizationPercent.toFixed(1) || '0.0'}%
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Demand vs. Net Available
                </p>
              </div>
              <div
                className={`p-3 rounded-lg ${
                  (workloadData?.summary.overallUtilizationPercent || 0) > 100
                    ? 'bg-rose-50 text-rose-600'
                    : (workloadData?.summary.overallUtilizationPercent || 0) > 85
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                <Percent className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Team Health Distribution</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-100 text-rose-700" title="Overallocated">
                    {workloadData?.summary.membersOverallocated || 0} Over
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-700" title="Near Capacity">
                    {workloadData?.summary.membersNearCapacity || 0} Near
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700" title="Balanced">
                    {workloadData?.summary.membersBalanced || 0} Balanced
                  </span>
                </div>
              </div>
              <div className="p-3 bg-gray-50 text-gray-600 rounded-lg">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Architecture Guideline Callout */}
          <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-start gap-3">
            <Compass className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs text-indigo-900 leading-relaxed">
              <strong className="font-semibold">Non-Additive Capacity Model:</strong> Calendar working hours and
              capacity reservations establish each member's <em>Net Available Hours</em>. Project allocation percentage
              and active task demand are tracked as separate, non-additive dimensions to prevent misleading double-booking
              or artificial capacity inflation.
            </div>
          </div>

          {/* Workload Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                Team Member Capacity & Demand Distribution ({filteredMembers.length})
              </h2>
            </div>

            {loading ? (
              <div className="p-12 text-center text-gray-500">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-3" />
                Calculating working calendar schedules and active task allocations...
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                No team members found matching the selected filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Member</th>
                      <th className="py-3 px-4">Base Hours</th>
                      <th className="py-3 px-4">Reservations</th>
                      <th className="py-3 px-4">Net Available</th>
                      <th className="py-3 px-4">Project Alloc %</th>
                      <th className="py-3 px-4">Task Demand</th>
                      <th className="py-3 px-4">Demand Utilization</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredMembers.map((member) => (
                      <tr key={member.userId} className="hover:bg-gray-50 transition">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-gray-900">{member.userName}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-2">
                            <span>{member.departmentName || member.roleName || 'Team Member'}</span>
                            {member.branchName && (
                              <span className="text-gray-400">• {member.branchName}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-700">
                          {member.baseWorkingHours.toFixed(1)}h
                        </td>
                        <td className="py-3 px-4">
                          {member.reservedOverheadHours > 0 ? (
                            <span className="font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-xs">
                              {member.reservedOverheadHours.toFixed(1)}h
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-semibold text-gray-900">
                          {member.netAvailableHours.toFixed(1)}h
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-800">
                              {member.committedAllocationPercent}%
                            </span>
                            <div className="w-16 bg-gray-200 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-indigo-600 h-full rounded-full"
                                style={{ width: `${Math.min(100, member.committedAllocationPercent)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-gray-900">
                            {member.activeTaskDemandHours.toFixed(1)}h
                          </div>
                          <div className="text-xs text-gray-500">
                            {member.activeAssignedTasksCount} active tasks
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-800">
                              {member.demandUtilizationPercent.toFixed(1)}%
                            </span>
                            <div className="w-20 bg-gray-200 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  member.status === 'OVERALLOCATED'
                                    ? 'bg-rose-500'
                                    : member.status === 'NEAR_CAPACITY'
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(100, member.demandUtilizationPercent)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              member.status === 'OVERALLOCATED'
                                ? 'bg-rose-100 text-rose-800'
                                : member.status === 'NEAR_CAPACITY'
                                ? 'bg-amber-100 text-amber-800'
                                : member.status === 'BALANCED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {member.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedMember(member)}
                            className="px-2.5 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-md transition"
                          >
                            Drilldown
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Member Drilldown Modal */}
          {selectedMember && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{selectedMember.userName}</h3>
                    <p className="text-sm text-gray-500">
                      {selectedMember.userEmail} • {selectedMember.departmentName || selectedMember.roleName}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedMember(null)}
                    className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Capacity Summary Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-xl">
                  <div>
                    <span className="text-xs text-gray-500 uppercase font-semibold">Net Capacity</span>
                    <p className="text-lg font-bold text-gray-900">{selectedMember.netAvailableHours.toFixed(1)}h</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase font-semibold">Reservations</span>
                    <p className="text-lg font-bold text-amber-600">{selectedMember.reservedOverheadHours.toFixed(1)}h</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase font-semibold">Active Demand</span>
                    <p className="text-lg font-bold text-indigo-600">{selectedMember.activeTaskDemandHours.toFixed(1)}h</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase font-semibold">Utilization</span>
                    <p className="text-lg font-bold text-gray-900">{selectedMember.demandUtilizationPercent.toFixed(1)}%</p>
                  </div>
                </div>

                {/* Assigned Tasks with Split Shares */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-indigo-600" />
                    Assigned Active Tasks & Effort Allocations
                  </h4>
                  {selectedMember.assignedTasks.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No active tasks currently assigned.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedMember.assignedTasks.map((task) => (
                        <div
                          key={task.taskId}
                          className="p-3 bg-white border border-gray-200 rounded-lg flex items-center justify-between hover:border-indigo-300 transition"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-indigo-600">{task.taskCode}</span>
                              <span className="text-sm font-medium text-gray-900">{task.title}</span>
                              <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                                {task.status}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Task Estimate: {task.totalRemainingHours}h • Effort Share: {task.userEffortSharePercent}% → Effective Demand:{' '}
                              <strong>{task.userDemandHours.toFixed(1)}h</strong>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedMember(null);
                              handleSelectTaskForSplit(task.taskId);
                            }}
                            className="px-2.5 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded transition"
                          >
                            Adjust Share
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Capacity Reservations */}
                {selectedMember.reservations.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600" />
                      Active Overhead Reservations
                    </h4>
                    <div className="space-y-2">
                      {selectedMember.reservations.map((res) => (
                        <div
                          key={res.id}
                          className="p-3 bg-amber-50/50 border border-amber-200 rounded-lg flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-semibold text-gray-900">{res.title}</span>
                            <span className="text-amber-800 ml-2">({res.reservation_type.replace('_', ' ')})</span>
                          </div>
                          <span className="font-medium text-gray-700">{res.daily_hours} hrs/day</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: CO-ASSIGNEE EFFORT SPLITTER */}
      {/* ======================================================== */}
      {activeTab === 'split-effort' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b pb-4">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <Percent className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Co-Assignee Effort Share Manager</h2>
                <p className="text-xs text-gray-500">
                  Explicitly split task demand among co-assignees. The total share must sum to exactly 100%.
                </p>
              </div>
            </div>

            {/* Task Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700 uppercase">Select Task to Partition:</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Paste Task ID..."
                  value={splitTaskId}
                  onChange={(e) => setSplitTaskId(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => handleSelectTaskForSplit(splitTaskId)}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition"
                >
                  Load Task
                </button>
              </div>
            </div>

            {splitEffortSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-sm text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                {splitEffortSuccess}
              </div>
            )}

            {splitTaskDetails && (
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-indigo-600">{splitTaskDetails.task_number}</span>
                  <span className="text-xs font-medium px-2 py-0.5 bg-gray-200 rounded text-gray-800">
                    Remaining: {splitTaskDetails.remaining_hours || splitTaskDetails.estimated_hours || 0} hrs
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900">{splitTaskDetails.title}</h3>
              </div>
            )}

            {effortShares.length > 0 ? (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-900">Co-Assignee Shares:</h4>
                {effortShares.map((share, idx) => (
                  <div key={share.userId} className="p-3 bg-white border border-gray-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-900">{share.userName}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={share.effortSharePercentage}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const next = [...effortShares];
                            next[idx].effortSharePercentage = val;
                            setEffortShares(next);
                          }}
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded font-semibold text-right"
                        />
                        <span className="text-gray-500 font-semibold">%</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={share.effortSharePercentage}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const next = [...effortShares];
                        next[idx].effortSharePercentage = val;
                        setEffortShares(next);
                      }}
                      className="w-full accent-indigo-600"
                    />
                    {splitTaskDetails && (
                      <div className="text-xs text-gray-500 text-right">
                        Allocated demand:{' '}
                        <strong>
                          {(
                            ((splitTaskDetails.remaining_hours || splitTaskDetails.estimated_hours || 0) *
                              share.effortSharePercentage) /
                            100
                          ).toFixed(1)}{' '}
                          hrs
                        </strong>
                      </div>
                    )}
                  </div>
                ))}

                {/* Total Validation Display */}
                {(() => {
                  const total = effortShares.reduce((s, a) => s + (Number(a.effortSharePercentage) || 0), 0);
                  const isValid = Math.abs(total - 100) < 0.05;
                  return (
                    <div
                      className={`p-4 rounded-xl flex items-center justify-between ${
                        isValid ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-rose-50 text-rose-900 border border-rose-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isValid ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-rose-600" />
                        )}
                        <span className="font-semibold text-sm">
                          {isValid ? 'Effort distribution is balanced (100.0%)' : `Total sum must equal 100.0% (Current: ${total.toFixed(1)}%)`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const equal = parseFloat((100 / effortShares.length).toFixed(2));
                          setEffortShares(
                            effortShares.map((s, i) => ({
                              ...s,
                              effortSharePercentage: i === effortShares.length - 1 ? 100 - equal * (effortShares.length - 1) : equal,
                            }))
                          );
                        }}
                        className="text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        Reset to Equal Shares (1/N)
                      </button>
                    </div>
                  );
                })()}

                <button
                  type="button"
                  disabled={splitEffortSubmitting}
                  onClick={handleSaveEffortSplit}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition shadow-sm disabled:opacity-50"
                >
                  {splitEffortSubmitting ? 'Saving Effort Shares...' : 'Save Effort Shares'}
                </button>
              </div>
            ) : splitTaskDetails ? (
              <p className="text-sm text-gray-500 italic text-center py-6">
                This task has only 1 or 0 assignees. Assign multiple engineers to partition effort shares.
              </p>
            ) : null}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: EXPLAINABLE SKILL MATCHING */}
      {/* ======================================================== */}
      {activeTab === 'skill-matching' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Explainable Skill & Bandwidth Matcher</h2>
                <p className="text-xs text-gray-500">
                  Find optimal candidates matching required skills, bandwidth availability, and timezone overlap with transparent scoring.
                </p>
              </div>
            </div>

            {/* Task lookup */}
            <div className="flex items-center gap-3 max-w-xl">
              <input
                type="text"
                placeholder="Enter Task ID to find suitable assignees..."
                value={suggestionTaskId}
                onChange={(e) => setSuggestionTaskId(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                type="button"
                disabled={suggestionsLoading || !suggestionTaskId}
                onClick={() => handleFetchSkillSuggestions(suggestionTaskId)}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50"
              >
                {suggestionsLoading ? 'Matching...' : 'Evaluate Candidates'}
              </button>
            </div>
          </div>

          {skillSuggestions && (
            <div className="space-y-4">
              {/* Task Requirements Header */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="font-mono text-xs font-bold text-indigo-600">{skillSuggestions.taskCode}</span>
                  <h3 className="font-semibold text-gray-900 text-base">{skillSuggestions.taskTitle}</h3>
                  <div className="text-xs text-gray-500 mt-1">Remaining Hours: {skillSuggestions.remainingHours}h</div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-600 uppercase">Required Skills:</span>
                  {skillSuggestions.requiredSkills.map((req) => (
                    <span
                      key={req.skillId}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        req.isMandatory ? 'bg-purple-100 text-purple-800 font-semibold' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {req.skillName} (Lvl ≥ {req.minimumProficiency}){req.isMandatory && ' *'}
                    </span>
                  ))}
                </div>
              </div>

              {/* Candidate Matches */}
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-gray-900">
                  Recommended Candidates ({skillSuggestions.candidates.length})
                </h3>

                {skillSuggestions.candidates.length === 0 ? (
                  <p className="text-sm text-gray-500 italic p-6 bg-white rounded-xl border border-gray-200 text-center">
                    No candidates found in the pool.
                  </p>
                ) : (
                  skillSuggestions.candidates.map((c, rank) => (
                    <div
                      key={c.userId}
                      className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-indigo-300 transition space-y-4"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                            #{rank + 1}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 text-base">{c.userName}</h4>
                            <p className="text-xs text-gray-500">
                              {c.userEmail} • {c.departmentName} {c.branchName && `• ${c.branchName}`}
                            </p>
                          </div>
                        </div>

                        {/* Total Score Badge */}
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <span className="text-2xl font-black text-indigo-600">{c.totalFitScore}%</span>
                            <p className="text-[10px] text-gray-400 uppercase font-bold">Total Fit Score</p>
                          </div>
                        </div>
                      </div>

                      {/* Transparent Score Breakdown */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-gray-50 p-3 rounded-xl text-xs">
                        <div>
                          <div className="flex justify-between font-semibold mb-1">
                            <span className="text-gray-600">Skill Proficiency (40%)</span>
                            <span className="text-indigo-600">{c.skillMatchScore}%</span>
                          </div>
                          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${c.skillMatchScore}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between font-semibold mb-1">
                            <span className="text-gray-600">Availability (40%)</span>
                            <span className="text-emerald-600">{c.availabilityScore}%</span>
                          </div>
                          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${c.availabilityScore}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between font-semibold mb-1">
                            <span className="text-gray-600">Timezone Overlap (20%)</span>
                            <span className="text-purple-600">{c.timezoneScore}%</span>
                          </div>
                          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-purple-600 h-full rounded-full" style={{ width: `${c.timezoneScore}%` }} />
                          </div>
                        </div>
                      </div>

                      {/* Explanation Callout */}
                      <div className="flex items-start gap-2 text-xs text-gray-700 bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100">
                        <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                        <div>
                          <strong>Scoring Rationale:</strong> {c.explanation}
                        </div>
                      </div>

                      {/* Missing Mandatory Skills warning */}
                      {c.missingMandatorySkills.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200">
                          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                          <span>Missing mandatory skills: {c.missingMandatorySkills.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: TEAM ESTIMATION RELIABILITY & METRICS */}
      {/* ======================================================== */}
      {activeTab === 'estimation-metrics' && (
        <div className="space-y-6">
          {/* Executive Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Estimation Accuracy Index</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">
                  {estimationMetrics ? (estimationMetrics.summary.estimationAccuracyIndex * 100).toFixed(1) : '0.0'}%
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  EAI: 1 - |Est - Act| / max(Est, Act)
                </p>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                <Brain className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Estimation Bias</p>
                <h3 className="text-xl font-bold text-gray-900 mt-1">
                  {estimationMetrics?.summary.estimationBias.replace('_', ' ') || 'BALANCED'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {estimationMetrics?.summary.estimationBiasPercentage || 0}% variance
                </p>
              </div>
              <div
                className={`p-3 rounded-lg ${
                  estimationMetrics?.summary.estimationBias === 'BALANCED'
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-amber-50 text-amber-600'
                }`}
              >
                <Sliders className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">On-Time Delivery (OTD)</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">
                  {estimationMetrics?.summary.onTimeDeliveryRatePercent.toFixed(1) || '0.0'}%
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Completed by due date</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">First-Time-Right (FTR)</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">
                  {estimationMetrics?.summary.firstTimeRightRatePercent.toFixed(1) || '0.0'}%
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Completed without rework</p>
              </div>
              <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Governance & Privacy Notice */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <strong className="font-semibold">Team-Level Aggregation Governance:</strong>{' '}
              {estimationMetrics?.disclosure ||
                'Metrics are strictly aggregated at the team and sprint level to enhance collective forecasting and sizing reliability. Automatic employee productivity rankings or gamification are intentionally deferred.'}
            </div>
          </div>

          {/* Historical Trends Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">Sprint & Period Estimation Trends</h3>
            </div>
            {estimationMetrics?.trends && estimationMetrics.trends.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Period / Sprint</th>
                      <th className="py-3 px-4">Tasks Completed</th>
                      <th className="py-3 px-4">Estimated Hours</th>
                      <th className="py-3 px-4">Actual Hours</th>
                      <th className="py-3 px-4">EAI</th>
                      <th className="py-3 px-4">On-Time Delivery</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {estimationMetrics.trends.map((t, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-semibold text-gray-900">{t.period}</td>
                        <td className="py-3 px-4 text-gray-700">{t.tasksCount}</td>
                        <td className="py-3 px-4 text-gray-700">{t.estimatedHours.toFixed(1)}h</td>
                        <td className="py-3 px-4 text-gray-700">{t.actualHours.toFixed(1)}h</td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-indigo-600">{(t.eai * 100).toFixed(1)}%</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-emerald-600">{t.onTimeDeliveryRate.toFixed(1)}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 text-sm">
                No historical closed sprints recorded yet. Metrics will populate as sprints and tasks reach completion.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: RESERVATIONS & SKILLS CATALOG */}
      {/* ======================================================== */}
      {activeTab === 'reservations-skills' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCatalogSubTab('reservations')}
                className={`text-sm font-semibold pb-2 border-b-2 transition ${
                  catalogSubTab === 'reservations'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Capacity Reservations ({reservations.length})
              </button>
              <button
                onClick={() => setCatalogSubTab('skills')}
                className={`text-sm font-semibold pb-2 border-b-2 transition ${
                  catalogSubTab === 'skills'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Skills Inventory ({skills.length})
              </button>
            </div>

            <div>
              {catalogSubTab === 'reservations' ? (
                <button
                  onClick={() => setShowCreateReservationModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Reservation
                </button>
              ) : (
                <button
                  onClick={() => setShowCreateSkillModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Skill
                </button>
              )}
            </div>
          </div>

          {/* SubTab: Reservations */}
          {catalogSubTab === 'reservations' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Dates</th>
                    <th className="py-3 px-4">Daily Hours</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reservations.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono text-xs font-bold text-gray-600">{r.reservation_code}</td>
                      <td className="py-3 px-4 font-medium text-gray-900">{r.user_name || r.user_id}</td>
                      <td className="py-3 px-4">
                        <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-medium">
                          {r.reservation_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-900">{r.title}</td>
                      <td className="py-3 px-4 text-xs text-gray-500">
                        {r.start_date.split('T')[0]} to {r.end_date.split('T')[0]}
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-800">{r.daily_hours} hrs</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={async () => {
                            if (confirm('Delete this capacity reservation?')) {
                              await capacityInsightsApi.deleteReservation(r.id);
                              const resRes = await capacityInsightsApi.getReservations();
                              setReservations(resRes.data || []);
                              loadWorkload();
                            }
                          }}
                          className="text-xs text-rose-600 hover:text-rose-800 font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* SubTab: Skills */}
          {catalogSubTab === 'skills' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {skills.map((skill) => (
                <div key={skill.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-indigo-600">{skill.skill_code}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 rounded text-gray-700">
                      {skill.category}
                    </span>
                  </div>
                  <h4 className="font-bold text-gray-900">{skill.name}</h4>
                  {skill.description && <p className="text-xs text-gray-500">{skill.description}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Create Reservation Modal */}
          {showCreateReservationModal && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-bold text-gray-900">Add Capacity Reservation</h3>
                  <button onClick={() => setShowCreateReservationModal(false)}>
                    <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                  </button>
                </div>
                <form onSubmit={handleCreateReservation} className="space-y-3 text-sm">
                  <div>
                    <label className="text-xs font-semibold text-gray-700">Team Member *</label>
                    <select
                      value={resForm.user_id}
                      onChange={(e) => setResForm({ ...resForm, user_id: e.target.value })}
                      required
                      className="w-full mt-1 px-3 py-1.5 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Select Member...</option>
                      {(workloadData?.members || []).map((m) => (
                        <option key={m.userId} value={m.userId}>
                          {m.userName} ({m.userEmail})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">Reservation Type *</label>
                    <select
                      value={resForm.reservation_type}
                      onChange={(e) => setResForm({ ...resForm, reservation_type: e.target.value })}
                      className="w-full mt-1 px-3 py-1.5 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="SUPPORT_ROTATION">Support Rotation</option>
                      <option value="MENTORING">Mentoring</option>
                      <option value="INNOVATION_RESEARCH">Innovation / Research</option>
                      <option value="RECURRING_MEETINGS">Recurring Meetings</option>
                      <option value="TRAINING">Training / Upskilling</option>
                      <option value="ADMINISTRATIVE_OVERHEAD">Administrative Overhead</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">Title / Purpose *</label>
                    <input
                      type="text"
                      placeholder="e.g., L2 Production Support Tier"
                      value={resForm.title}
                      onChange={(e) => setResForm({ ...resForm, title: e.target.value })}
                      required
                      className="w-full mt-1 px-3 py-1.5 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-700">Start Date *</label>
                      <input
                        type="date"
                        value={resForm.start_date}
                        onChange={(e) => setResForm({ ...resForm, start_date: e.target.value })}
                        required
                        className="w-full mt-1 px-3 py-1.5 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-700">End Date *</label>
                      <input
                        type="date"
                        value={resForm.end_date}
                        onChange={(e) => setResForm({ ...resForm, end_date: e.target.value })}
                        required
                        className="w-full mt-1 px-3 py-1.5 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">Daily Reserved Hours (1-8)</label>
                    <input
                      type="number"
                      min="0.5"
                      max="8"
                      step="0.5"
                      value={resForm.daily_hours}
                      onChange={(e) => setResForm({ ...resForm, daily_hours: parseFloat(e.target.value) || 1 })}
                      className="w-full mt-1 px-3 py-1.5 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateReservationModal(false)}
                      className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm"
                    >
                      Save Reservation
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Create Skill Modal */}
          {showCreateSkillModal && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-bold text-gray-900">Add Skill to Catalog</h3>
                  <button onClick={() => setShowCreateSkillModal(false)}>
                    <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                  </button>
                </div>
                <form onSubmit={handleCreateSkill} className="space-y-3 text-sm">
                  <div>
                    <label className="text-xs font-semibold text-gray-700">Skill Name *</label>
                    <input
                      type="text"
                      placeholder="e.g., PostgreSQL Performance Tuning"
                      value={skillForm.name}
                      onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })}
                      required
                      className="w-full mt-1 px-3 py-1.5 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">Category *</label>
                    <select
                      value={skillForm.category}
                      onChange={(e) => setSkillForm({ ...skillForm, category: e.target.value })}
                      className="w-full mt-1 px-3 py-1.5 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="BACKEND">Backend</option>
                      <option value="FRONTEND">Frontend</option>
                      <option value="DATABASE">Database</option>
                      <option value="CLOUD_DEVOPS">Cloud / DevOps</option>
                      <option value="ARCHITECTURE">Architecture</option>
                      <option value="QA_TESTING">QA / Testing</option>
                      <option value="SECURITY">Security</option>
                      <option value="DOMAIN">Domain Knowledge</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">Description</label>
                    <textarea
                      rows={2}
                      placeholder="Optional skill description..."
                      value={skillForm.description}
                      onChange={(e) => setSkillForm({ ...skillForm, description: e.target.value })}
                      className="w-full mt-1 px-3 py-1.5 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateSkillModal(false)}
                      className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm"
                    >
                      Save Skill
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
