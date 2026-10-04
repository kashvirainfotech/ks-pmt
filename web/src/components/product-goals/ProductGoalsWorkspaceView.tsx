import React, { useState, useEffect } from 'react';
import {
  Target,
  TrendingUp,
  Award,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Search,
  Filter,
  Plus,
  RefreshCw,
  FileText,
  Sparkles,
  BarChart3,
  Calendar,
  User,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Sliders,
  DollarSign,
  X,
  Check,
} from 'lucide-react';
import {
  productGoalsApi,
  productsApi,
  projectsApi,
  productIdeasApi,
  mastersApi,
} from '../../api/endpoints';
import {
  ProductGoal,
  ProductOutcomeReview,
  ProductGoalsSummary,
  ProductGoalCategory,
  ProductGoalStatus,
  OutcomeVerdict,
} from '../../types';

export const ProductGoalsWorkspaceView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'GOALS' | 'REVIEWS'>('GOALS');
  const [loading, setLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter States
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [verdictFilter, setVerdictFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data States
  const [goals, setGoals] = useState<ProductGoal[]>([]);
  const [reviews, setReviews] = useState<ProductOutcomeReview[]>([]);
  const [summary, setSummary] = useState<ProductGoalsSummary | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [ideas, setIdeas] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Detailed View State
  const [selectedGoal, setSelectedGoal] = useState<ProductGoal | null>(null);

  // Modals
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);

  // Form State: Goal
  const [goalForm, setGoalForm] = useState({
    product_id: '',
    title: '',
    description: '',
    category: 'ADOPTION' as ProductGoalCategory,
    metric_name: '',
    metric_unit: 'PERCENT',
    baseline_value: 0,
    target_value: 100,
    current_value: 0,
    target_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    owner_user_id: '',
    status: 'IN_PROGRESS' as ProductGoalStatus,
  });

  // Form State: Outcome Review
  const [reviewForm, setReviewForm] = useState({
    product_id: '',
    goal_id: '',
    version_id: '',
    idea_id: '',
    review_title: '',
    review_date: new Date().toISOString().split('T')[0],
    reviewer_user_id: '',
    actual_metric_value: 0,
    outcome_verdict: 'MET_EXPECTATIONS' as OutcomeVerdict,
    adoption_observations: '',
    customer_evidence: '',
    feedback_summary: '',
    learnings_and_next_steps: '',
    reconciled_allowance_used: 0,
  });

  // Form State: Quick Progress
  const [progressForm, setProgressForm] = useState({
    goal_id: '',
    current_value: 0,
    status: 'IN_PROGRESS' as ProductGoalStatus,
  });

  useEffect(() => {
    loadLookupData();
  }, []);

  useEffect(() => {
    loadWorkspaceData();
  }, [selectedProductId, categoryFilter, statusFilter, verdictFilter, searchQuery]);

  // Load versions & ideas when review modal opens or product changes
  useEffect(() => {
    if (reviewForm.product_id) {
      loadProductContext(reviewForm.product_id);
    }
  }, [reviewForm.product_id]);

  const loadLookupData = async () => {
    try {
      const [prodRes, userRes] = await Promise.all([
        productsApi.getProducts(),
        mastersApi.getUsers({ limit: 100 }),
      ]);
      setProducts(prodRes.data || []);
      const userList = (userRes.data as any)?.items || userRes.data || [];
      setUsers(userList);
    } catch (err: any) {
      console.error('Failed to load lookup data', err);
    }
  };

  const loadProductContext = async (productId: string) => {
    try {
      const [verRes, ideaRes] = await Promise.all([
        projectsApi.getVersions({ productId }),
        productIdeasApi.getIdeas({ product_id: productId, limit: 100 }),
      ]);
      setVersions(verRes.data || []);
      const ideaList = (ideaRes.data as any)?.data?.items || (ideaRes.data as any)?.items || [];
      setIdeas(ideaList);
    } catch (err: any) {
      console.error('Failed to load product versions or ideas', err);
    }
  };

  const loadWorkspaceData = async () => {
    setLoading(true);
    try {
      const goalParams: any = {
        limit: 100,
      };
      if (selectedProductId) goalParams.product_id = selectedProductId;
      if (categoryFilter !== 'ALL') goalParams.category = categoryFilter;
      if (statusFilter !== 'ALL') goalParams.status = statusFilter;
      if (searchQuery.trim()) goalParams.search = searchQuery.trim();

      const reviewParams: any = {
        limit: 100,
      };
      if (selectedProductId) reviewParams.product_id = selectedProductId;
      if (verdictFilter !== 'ALL') reviewParams.verdict = verdictFilter;

      const [goalsRes, reviewsRes, summaryRes] = await Promise.all([
        productGoalsApi.getGoals(goalParams),
        productGoalsApi.getOutcomeReviews(reviewParams),
        productGoalsApi.getSummary(selectedProductId || undefined),
      ]);

      const goalItems = (goalsRes.data as any)?.data?.items || (goalsRes.data as any)?.items || [];
      const reviewItems = (reviewsRes.data as any)?.data?.items || (reviewsRes.data as any)?.items || [];
      const summaryData = (summaryRes.data as any)?.data || summaryRes.data || null;

      setGoals(goalItems);
      setReviews(reviewItems);
      setSummary(summaryData);
    } catch (err: any) {
      console.error('Failed to load goals or outcome reviews', err);
      setFeedbackMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to load workspace data.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalForm.product_id || !goalForm.title || !goalForm.metric_name) {
      setFeedbackMessage({ type: 'error', text: 'Please fill in all mandatory goal fields.' });
      return;
    }

    try {
      await productGoalsApi.createGoal({
        ...goalForm,
        baseline_value: Number(goalForm.baseline_value),
        target_value: Number(goalForm.target_value),
        current_value: Number(goalForm.current_value),
        owner_user_id: goalForm.owner_user_id || undefined,
      });

      setShowGoalModal(false);
      setFeedbackMessage({ type: 'success', text: 'Product goal created successfully!' });
      setGoalForm({
        product_id: '',
        title: '',
        description: '',
        category: 'ADOPTION',
        metric_name: '',
        metric_unit: 'PERCENT',
        baseline_value: 0,
        target_value: 100,
        current_value: 0,
        target_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        owner_user_id: '',
        status: 'IN_PROGRESS',
      });
      loadWorkspaceData();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to create product goal.',
      });
    }
  };

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewForm.product_id || !reviewForm.review_title) {
      setFeedbackMessage({ type: 'error', text: 'Please fill in product and review title.' });
      return;
    }

    try {
      await productGoalsApi.createOutcomeReview({
        ...reviewForm,
        goal_id: reviewForm.goal_id || undefined,
        version_id: reviewForm.version_id || undefined,
        idea_id: reviewForm.idea_id || undefined,
        reviewer_user_id: reviewForm.reviewer_user_id || undefined,
        actual_metric_value: Number(reviewForm.actual_metric_value),
        reconciled_allowance_used: Number(reviewForm.reconciled_allowance_used),
      });

      setShowReviewModal(false);
      setFeedbackMessage({
        type: 'success',
        text: 'Post-release outcome evaluation review recorded and reconciled!',
      });
      setReviewForm({
        product_id: '',
        goal_id: '',
        version_id: '',
        idea_id: '',
        review_title: '',
        review_date: new Date().toISOString().split('T')[0],
        reviewer_user_id: '',
        actual_metric_value: 0,
        outcome_verdict: 'MET_EXPECTATIONS',
        adoption_observations: '',
        customer_evidence: '',
        feedback_summary: '',
        learnings_and_next_steps: '',
        reconciled_allowance_used: 0,
      });
      loadWorkspaceData();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to publish outcome review.',
      });
    }
  };

  const handleUpdateProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await productGoalsApi.updateGoalProgress(progressForm.goal_id, {
        current_value: Number(progressForm.current_value),
        status: progressForm.status,
      });

      setShowProgressModal(false);
      setFeedbackMessage({ type: 'success', text: 'Metric progress updated successfully!' });
      loadWorkspaceData();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update progress.',
      });
    }
  };

  const openReviewForGoal = (goal: ProductGoal) => {
    setReviewForm({
      product_id: goal.product_id,
      goal_id: goal.id,
      version_id: '',
      idea_id: '',
      review_title: `${goal.title} - Post-Release Evaluation`,
      review_date: new Date().toISOString().split('T')[0],
      reviewer_user_id: '',
      actual_metric_value: goal.current_value,
      outcome_verdict: 'MET_EXPECTATIONS',
      adoption_observations: '',
      customer_evidence: '',
      feedback_summary: '',
      learnings_and_next_steps: '',
      reconciled_allowance_used: 0,
    });
    loadProductContext(goal.product_id);
    setShowReviewModal(true);
  };

  const openProgressForGoal = (goal: ProductGoal) => {
    setProgressForm({
      goal_id: goal.id,
      current_value: goal.current_value,
      status: goal.status,
    });
    setShowProgressModal(true);
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'ADOPTION':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'PERFORMANCE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'REVENUE_GROWTH':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'QUALITY_RELIABILITY':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'USER_SATISFACTION':
        return 'bg-pink-50 text-pink-700 border-pink-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'ACHIEVED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'MISSED':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'ABANDONED':
        return 'bg-slate-200 text-slate-700 border-slate-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getVerdictBadgeClass = (verdict: string) => {
    switch (verdict) {
      case 'EXCEEDED_EXPECTATIONS':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'MET_EXPECTATIONS':
        return 'bg-teal-100 text-teal-800 border-teal-300';
      case 'BELOW_EXPECTATIONS':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'INCONCLUSIVE':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Alert Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-lg flex items-center justify-between text-sm ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Product Goals & Outcome Reviews
              </h1>
              <p className="text-sm text-slate-500">
                Define measurable operational metrics, track progress, and conduct post-release outcome evaluation reviews (PROD-002)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (selectedProductId) {
                setGoalForm((prev) => ({ ...prev, product_id: selectedProductId }));
              }
              setShowGoalModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Define Product Goal
          </button>
          <button
            onClick={() => {
              if (selectedProductId) {
                setReviewForm((prev) => ({ ...prev, product_id: selectedProductId }));
                loadProductContext(selectedProductId);
              }
              setShowReviewModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg shadow-sm transition"
          >
            <Award className="w-4 h-4 text-emerald-600" />
            Conduct Outcome Review
          </button>
          <button
            onClick={loadWorkspaceData}
            title="Refresh workspace"
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Total Product Goals</span>
            <Target className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {summary?.goals?.total_goals || 0}
            </span>
            <span className="text-xs text-slate-500">
              ({summary?.goals?.in_progress_count || 0} in progress)
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
              {summary?.goals?.achieved_count || 0} Achieved
            </span>
            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-medium">
              {summary?.goals?.missed_count || 0} Missed
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Goal Categories</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {(summary?.goals?.adoption_count || 0) + (summary?.goals?.performance_count || 0) + (summary?.goals?.revenue_count || 0)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {summary?.goals?.adoption_count || 0} Adoption, {summary?.goals?.performance_count || 0} Performance, {summary?.goals?.revenue_count || 0} Revenue
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Outcome Reviews</span>
            <Award className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {summary?.reviews?.total_reviews || 0}
            </span>
            <span className="text-xs text-emerald-600 font-medium">
              ({(summary?.reviews?.exceeded_count || 0) + (summary?.reviews?.met_count || 0)} positive)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {summary?.reviews?.exceeded_count || 0} Exceeded, {summary?.reviews?.met_count || 0} Met, {summary?.reviews?.below_count || 0} Below
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Reconciled Allowance</span>
            <DollarSign className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {Number(summary?.reviews?.total_reconciled_allowance || 0).toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            No double consumption of customer allowances
          </p>
        </div>
      </div>

      {/* Product & Scope Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
            Software Product:
          </label>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="w-full md:w-72 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.product_code} - {p.product_name}
              </option>
            ))}
          </select>
        </div>

        {/* View Tabs */}
        <div className="flex items-center p-1 bg-slate-100 rounded-lg w-full md:w-auto">
          <button
            onClick={() => setActiveTab('GOALS')}
            className={`flex-1 md:flex-initial px-4 py-1.5 text-sm font-medium rounded-md transition ${
              activeTab === 'GOALS'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Target className="w-4 h-4" />
              <span>Measurable Goals ({goals.length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('REVIEWS')}
            className={`flex-1 md:flex-initial px-4 py-1.5 text-sm font-medium rounded-md transition ${
              activeTab === 'REVIEWS'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Award className="w-4 h-4" />
              <span>Outcome Reviews ({reviews.length})</span>
            </div>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'GOALS' ? (
        <div className="space-y-4">
          {/* Filters Row */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search goals or metrics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Categories</option>
                <option value="ADOPTION">Adoption</option>
                <option value="PERFORMANCE">Performance</option>
                <option value="REVENUE_GROWTH">Revenue Growth</option>
                <option value="QUALITY_RELIABILITY">Quality & Reliability</option>
                <option value="USER_SATISFACTION">User Satisfaction</option>
                <option value="STRATEGIC">Strategic</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="ACHIEVED">Achieved</option>
                <option value="MISSED">Missed</option>
                <option value="DRAFT">Draft</option>
              </select>
            </div>
          </div>

          {/* Goals Grid */}
          {goals.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-3">
              <Target className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-semibold text-slate-800">No Product Goals Found</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                No measurable goals match the current filters. Create strategic product goals with baseline and target thresholds to drive outcomes.
              </p>
              <button
                onClick={() => setShowGoalModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
              >
                <Plus className="w-4 h-4" />
                Define First Goal
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {goals.map((goal) => {
                const progress = goal.progress_percentage ?? 0;
                return (
                  <div
                    key={goal.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {goal.goal_code}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded border font-medium ${getCategoryBadgeClass(
                                goal.category,
                              )}`}
                            >
                              {goal.category}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded border font-medium ${getStatusBadgeClass(
                                goal.status,
                              )}`}
                            >
                              {goal.status}
                            </span>
                          </div>
                          <h3 className="text-base font-semibold text-slate-900 mt-1">
                            {goal.title}
                          </h3>
                          <div className="text-xs text-slate-500 mt-0.5">
                            Product: <span className="font-medium text-slate-700">{goal.product_name}</span>
                          </div>
                        </div>

                        {goal.owner_name && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{goal.owner_name}</span>
                          </div>
                        )}
                      </div>

                      {goal.description && (
                        <p className="text-sm text-slate-600 line-clamp-2">
                          {goal.description}
                        </p>
                      )}

                      {/* Metric Tracker Progress Card */}
                      <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-700">
                            Metric: {goal.metric_name} ({goal.metric_unit})
                          </span>
                          <span className="font-bold text-indigo-600">
                            {progress}% Progress
                          </span>
                        </div>

                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              progress >= 100
                                ? 'bg-emerald-500'
                                : progress >= 50
                                ? 'bg-indigo-600'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                          <span>Baseline: {goal.baseline_value}</span>
                          <span className="font-semibold text-slate-800">
                            Current: {goal.current_value}
                          </span>
                          <span className="font-semibold text-slate-900">
                            Target: {goal.target_value}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Target Date: {goal.target_date}</span>
                        </div>

                        {goal.latest_review ? (
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400">Latest Review:</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[11px] font-medium border ${getVerdictBadgeClass(
                                goal.latest_review.outcome_verdict,
                              )}`}
                            >
                              {goal.latest_review.outcome_verdict.replace('_', ' ')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No reviews yet</span>
                        )}
                      </div>
                    </div>

                    {/* Action Footer */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => openProgressForGoal(goal)}
                        className="inline-flex items-center gap-1.5 text-xs text-slate-700 hover:text-indigo-600 font-medium px-2 py-1 rounded hover:bg-slate-100 transition"
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                        Update Progress
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openReviewForGoal(goal)}
                          className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 font-medium px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition"
                        >
                          <Award className="w-3.5 h-3.5" />
                          Conduct Review
                        </button>
                        <button
                          onClick={() => setSelectedGoal(goal)}
                          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 p-1 rounded hover:bg-slate-100 transition"
                          title="View Details"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Tab 2: Post-Release Outcome Reviews */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <select
                value={verdictFilter}
                onChange={(e) => setVerdictFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Outcome Verdicts</option>
                <option value="EXCEEDED_EXPECTATIONS">Exceeded Expectations</option>
                <option value="MET_EXPECTATIONS">Met Expectations</option>
                <option value="BELOW_EXPECTATIONS">Below Expectations</option>
                <option value="INCONCLUSIVE">Inconclusive</option>
              </select>
            </div>
          </div>

          {reviews.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-3">
              <Award className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-semibold text-slate-800">No Outcome Reviews Recorded</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Post-release outcome evaluation reviews measure actual customer metrics against expected goals and reconcile approved allowance usage.
              </p>
              <button
                onClick={() => setShowReviewModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
              >
                <Plus className="w-4 h-4" />
                Conduct Outcome Review
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {rev.review_code}
                        </span>
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${getVerdictBadgeClass(
                            rev.outcome_verdict,
                          )}`}
                        >
                          {rev.outcome_verdict.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-slate-500">
                          Reviewed on {rev.review_date}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mt-1">
                        {rev.review_title}
                      </h3>
                      <div className="text-xs text-slate-500 flex items-center gap-3 mt-1">
                        <span>
                          Product: <strong className="text-slate-700">{rev.product_name}</strong>
                        </span>
                        {rev.version_code && (
                          <span>
                            Release: <strong className="text-slate-700">{rev.version_code}</strong>
                          </span>
                        )}
                        {rev.reviewer_name && (
                          <span>
                            Evaluator: <strong className="text-slate-700">{rev.reviewer_name}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      {rev.actual_metric_value !== null && rev.actual_metric_value !== undefined && (
                        <div className="text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 inline-block text-left">
                          <div className="text-[11px] text-slate-400">Actual Metric Observed</div>
                          <div className="text-base font-bold text-slate-900">
                            {rev.actual_metric_value} {rev.metric_unit || ''}
                          </div>
                        </div>
                      )}
                      {rev.reconciled_allowance_used !== undefined && Number(rev.reconciled_allowance_used) > 0 && (
                        <div className="mt-1 text-xs text-emerald-700 font-medium">
                          Reconciled Allowance: {rev.reconciled_allowance_used} units
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Linked Context Pill Bar */}
                  {(rev.goal_title || rev.idea_title) && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      {rev.goal_title && (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100">
                          <Target className="w-3.5 h-3.5" />
                          <span>Goal: {rev.goal_code} - {rev.goal_title}</span>
                        </div>
                      )}
                      {rev.idea_title && (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 rounded-md border border-purple-100">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Idea: {rev.idea_code} - {rev.idea_title}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Narrative Findings Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {rev.adoption_observations && (
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                        <span className="font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
                          Adoption Observations & Telemetry
                        </span>
                        <p className="text-slate-600 whitespace-pre-line">
                          {rev.adoption_observations}
                        </p>
                      </div>
                    )}

                    {rev.customer_evidence && (
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                        <span className="font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
                          Customer Evidence & Metric Proof
                        </span>
                        <p className="text-slate-600 whitespace-pre-line">
                          {rev.customer_evidence}
                        </p>
                      </div>
                    )}

                    {rev.feedback_summary && (
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                        <span className="font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
                          Qualitative Feedback Summary
                        </span>
                        <p className="text-slate-600 whitespace-pre-line">
                          {rev.feedback_summary}
                        </p>
                      </div>
                    )}

                    {rev.learnings_and_next_steps && (
                      <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 space-y-1">
                        <span className="font-semibold text-indigo-900 uppercase tracking-wider text-[11px]">
                          Retrospective Learnings & Next Steps
                        </span>
                        <p className="text-indigo-800 whitespace-pre-line">
                          {rev.learnings_and_next_steps}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Goal Details Drawer / Modal */}
      {selectedGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                  {selectedGoal.goal_code}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded border font-medium ${getStatusBadgeClass(
                    selectedGoal.status,
                  )}`}
                >
                  {selectedGoal.status}
                </span>
              </div>
              <button
                onClick={() => setSelectedGoal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">{selectedGoal.title}</h2>
              <p className="text-sm text-slate-600 mt-2">{selectedGoal.description || 'No detailed description provided.'}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block">Category</span>
                <span className="font-semibold text-slate-800">{selectedGoal.category}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Target Date</span>
                <span className="font-semibold text-slate-800">{selectedGoal.target_date}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Goal Owner</span>
                <span className="font-semibold text-slate-800">{selectedGoal.owner_name || 'Unassigned'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Product</span>
                <span className="font-semibold text-slate-800">{selectedGoal.product_name}</span>
              </div>
            </div>

            {/* Metric Details */}
            <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-indigo-900">
                <span>Metric: {selectedGoal.metric_name} ({selectedGoal.metric_unit})</span>
                <span>{selectedGoal.progress_percentage}% Target Achieved</span>
              </div>

              <div className="w-full bg-indigo-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, selectedGoal.progress_percentage || 0))}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-indigo-950 font-medium">
                <span>Baseline: {selectedGoal.baseline_value}</span>
                <span>Current: {selectedGoal.current_value}</span>
                <span>Target: {selectedGoal.target_value}</span>
              </div>
            </div>

            {/* Linked Outcome Reviews Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-emerald-600" />
                  Linked Outcome Reviews ({selectedGoal.outcome_reviews?.length || 0})
                </h3>
                <button
                  onClick={() => {
                    openReviewForGoal(selectedGoal);
                    setSelectedGoal(null);
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                  + Add Review
                </button>
              </div>

              {selectedGoal.outcome_reviews && selectedGoal.outcome_reviews.length > 0 ? (
                <div className="space-y-3">
                  {selectedGoal.outcome_reviews.map((r) => (
                    <div
                      key={r.id}
                      className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">{r.review_title}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-medium border ${getVerdictBadgeClass(
                            r.outcome_verdict,
                          )}`}
                        >
                          {r.outcome_verdict.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="text-slate-500 flex items-center gap-2">
                        <span>Date: {r.review_date}</span>
                        {r.actual_metric_value !== null && (
                          <span>| Actual Metric: {r.actual_metric_value}</span>
                        )}
                      </div>
                      {r.learnings_and_next_steps && (
                        <p className="text-slate-600 italic">{r.learnings_and_next_steps}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  No post-release outcome evaluation reviews recorded for this goal yet.
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setSelectedGoal(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Define Product Goal Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-600" />
                Define Measurable Product Goal
              </h2>
              <button
                onClick={() => setShowGoalModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Software Product *
                  </label>
                  <select
                    value={goalForm.product_id}
                    onChange={(e) => setGoalForm({ ...goalForm, product_id: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Target Product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.product_code} - {p.product_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Goal Category *
                  </label>
                  <select
                    value={goalForm.category}
                    onChange={(e) =>
                      setGoalForm({ ...goalForm, category: e.target.value as ProductGoalCategory })
                    }
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ADOPTION">Adoption</option>
                    <option value="PERFORMANCE">Performance</option>
                    <option value="REVENUE_GROWTH">Revenue Growth</option>
                    <option value="QUALITY_RELIABILITY">Quality & Reliability</option>
                    <option value="USER_SATISFACTION">User Satisfaction</option>
                    <option value="STRATEGIC">Strategic</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Goal Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Enterprise Multi-GST Onboarding Adoption"
                  value={goalForm.title}
                  onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Description & Operational Context
                </label>
                <textarea
                  rows={2}
                  placeholder="Context, strategic intent, and customer impact rationale..."
                  value={goalForm.description}
                  onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Metric Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. E-Invoice Adoption Rate"
                    value={goalForm.metric_name}
                    onChange={(e) => setGoalForm({ ...goalForm, metric_name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Metric Unit *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PERCENT, MILLISECONDS, COUNT, INR"
                    value={goalForm.metric_unit}
                    onChange={(e) => setGoalForm({ ...goalForm, metric_unit: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Baseline Value *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={goalForm.baseline_value}
                    onChange={(e) =>
                      setGoalForm({ ...goalForm, baseline_value: parseFloat(e.target.value) || 0 })
                    }
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Target Value *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={goalForm.target_value}
                    onChange={(e) =>
                      setGoalForm({ ...goalForm, target_value: parseFloat(e.target.value) || 0 })
                    }
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Current Observed
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={goalForm.current_value}
                    onChange={(e) =>
                      setGoalForm({ ...goalForm, current_value: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Target Evaluation Date *
                  </label>
                  <input
                    type="date"
                    value={goalForm.target_date}
                    onChange={(e) => setGoalForm({ ...goalForm, target_date: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Assigned Goal Owner
                  </label>
                  <select
                    value={goalForm.owner_user_id}
                    onChange={(e) => setGoalForm({ ...goalForm, owner_user_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.display_name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition"
                >
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Conduct Post-Release Outcome Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-600" />
                Conduct Post-Release Outcome Evaluation Review
              </h2>
              <button
                onClick={() => setShowReviewModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReview} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Software Product *
                  </label>
                  <select
                    value={reviewForm.product_id}
                    onChange={(e) => {
                      setReviewForm({ ...reviewForm, product_id: e.target.value });
                      loadProductContext(e.target.value);
                    }}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Software Product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.product_code} - {p.product_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Link Product Goal (Optional)
                  </label>
                  <select
                    value={reviewForm.goal_id}
                    onChange={(e) => setReviewForm({ ...reviewForm, goal_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">No Direct Goal Linked</option>
                    {goals
                      .filter((g) => !reviewForm.product_id || g.product_id === reviewForm.product_id)
                      .map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.goal_code} - {g.title} (Target: {g.target_value} {g.metric_unit})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Released Version / Release (Optional)
                  </label>
                  <select
                    value={reviewForm.version_id}
                    onChange={(e) => setReviewForm({ ...reviewForm, version_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">No Release Linked</option>
                    {versions.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.version_code} - {v.version_name || 'Release'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Linked Product Idea (Discovery Outcome Closure)
                  </label>
                  <select
                    value={reviewForm.idea_id}
                    onChange={(e) => setReviewForm({ ...reviewForm, idea_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">No Idea Linked</option>
                    {ideas.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.idea_code} - {i.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Review Title *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 30-Day Post-Release Metric Evaluation"
                    value={reviewForm.review_title}
                    onChange={(e) => setReviewForm({ ...reviewForm, review_title: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Review Date *
                  </label>
                  <input
                    type="date"
                    value={reviewForm.review_date}
                    onChange={(e) => setReviewForm({ ...reviewForm, review_date: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Actual Observed Metric Value
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={reviewForm.actual_metric_value}
                    onChange={(e) =>
                      setReviewForm({
                        ...reviewForm,
                        actual_metric_value: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Outcome Verdict *
                  </label>
                  <select
                    value={reviewForm.outcome_verdict}
                    onChange={(e) =>
                      setReviewForm({
                        ...reviewForm,
                        outcome_verdict: e.target.value as OutcomeVerdict,
                      })
                    }
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="EXCEEDED_EXPECTATIONS">Exceeded Expectations</option>
                    <option value="MET_EXPECTATIONS">Met Expectations</option>
                    <option value="BELOW_EXPECTATIONS">Below Expectations</option>
                    <option value="INCONCLUSIVE">Inconclusive</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Reconciled Allowance Used
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 150.00"
                    value={reviewForm.reconciled_allowance_used}
                    onChange={(e) =>
                      setReviewForm({
                        ...reviewForm,
                        reconciled_allowance_used: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Adoption Observations & Telemetry
                </label>
                <textarea
                  rows={2}
                  placeholder="How many customers activated the feature, traffic surge, or user funnel metrics..."
                  value={reviewForm.adoption_observations}
                  onChange={(e) =>
                    setReviewForm({ ...reviewForm, adoption_observations: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Customer Evidence & Metric Proof
                </label>
                <textarea
                  rows={2}
                  placeholder="Concrete customer quotes, analytics dashboard logs, time saved metrics..."
                  value={reviewForm.customer_evidence}
                  onChange={(e) => setReviewForm({ ...reviewForm, customer_evidence: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Qualitative Feedback Summary
                </label>
                <textarea
                  rows={2}
                  placeholder="Feedback sentiments, customer satisfaction feedback, recurring friction points..."
                  value={reviewForm.feedback_summary}
                  onChange={(e) => setReviewForm({ ...reviewForm, feedback_summary: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Retrospective Learnings & Next Steps
                </label>
                <textarea
                  rows={2}
                  placeholder="Engineering/product takeaways, follow-on enhancements, roadmap updates..."
                  value={reviewForm.learnings_and_next_steps}
                  onChange={(e) =>
                    setReviewForm({ ...reviewForm, learnings_and_next_steps: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm transition"
                >
                  Publish Outcome Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Progress Update Modal */}
      {showProgressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                Update Metric Progress
              </h3>
              <button
                onClick={() => setShowProgressModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateProgress} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Current Observed Metric Value
                </label>
                <input
                  type="number"
                  step="any"
                  value={progressForm.current_value}
                  onChange={(e) =>
                    setProgressForm({
                      ...progressForm,
                      current_value: parseFloat(e.target.value) || 0,
                    })
                  }
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Execution Status
                </label>
                <select
                  value={progressForm.status}
                  onChange={(e) =>
                    setProgressForm({
                      ...progressForm,
                      status: e.target.value as ProductGoalStatus,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="ACHIEVED">Achieved</option>
                  <option value="MISSED">Missed</option>
                  <option value="DRAFT">Draft</option>
                  <option value="ABANDONED">Abandoned</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowProgressModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded shadow-sm"
                >
                  Save Progress
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default ProductGoalsWorkspaceView;
