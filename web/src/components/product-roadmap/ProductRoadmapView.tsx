import React, { useState, useEffect } from 'react';
import {
  Lightbulb,
  Compass,
  GitMerge,
  Eye,
  Plus,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  ThumbsUp,
  Users,
  CheckCircle2,
  Calendar,
  Layers,
  Lock,
  Globe,
  Sliders,
  AlertCircle,
  FileText,
  Sparkles,
  Link as LinkIcon,
  Tag,
} from 'lucide-react';
import { productIdeasApi, productsApi, projectsApi } from '../../api/endpoints';
import {
  ProductIdea,
  ProductIdeaStatus,
  RoadmapBucket,
  ProductIdeaVisibility,
  Product,
  Version,
} from '../../types';

export const ProductRoadmapView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'DISCOVERY' | 'ROADMAP' | 'MERGED'>('DISCOVERY');
  const [ideas, setIdeas] = useState<ProductIdea[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [roadmapBucketFilter, setRoadmapBucketFilter] = useState<string>('');
  const [publishedFilter, setPublishedFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'rice' | 'votes' | 'created'>('rice');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Drawers
  const [selectedIdea, setSelectedIdea] = useState<ProductIdea | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showScoreModal, setShowScoreModal] = useState<boolean>(false);
  const [showModerateModal, setShowModerateModal] = useState<boolean>(false);
  const [showRoadmapModal, setShowRoadmapModal] = useState<boolean>(false);
  const [showMergeModal, setShowMergeModal] = useState<boolean>(false);

  // Form states
  const [createForm, setCreateForm] = useState({
    productId: '',
    title: '',
    sanitizedDescription: '',
    customerProblem: '',
    expectedOutcome: '',
    targetSegment: '',
    reach: 100,
    impactScore: 2.0,
    confidenceScore: 0.8,
    effortScore: 2.0,
    strategicFit: 3,
    scoringRationale: '',
    privateEvidenceNotes: '',
    internalCommercialImpact: '',
    visibility: 'PRODUCT_COMMUNITY' as ProductIdeaVisibility,
    isPublished: false,
  });

  const [scoreForm, setScoreForm] = useState({
    reach: 100,
    impactScore: 2.0,
    confidenceScore: 0.8,
    effortScore: 2.0,
    strategicFit: 3,
    scoringRationale: '',
  });

  const [moderateForm, setModerateForm] = useState({
    isPublished: false,
    visibility: 'PRODUCT_COMMUNITY' as ProductIdeaVisibility,
    title: '',
    sanitizedDescription: '',
    status: 'UNDER_EVALUATION' as ProductIdeaStatus,
    statusReason: '',
  });

  const [roadmapForm, setRoadmapForm] = useState({
    roadmapBucket: 'NOW' as RoadmapBucket,
    indicativeTarget: '',
    status: 'PLANNED' as ProductIdeaStatus,
    targetVersionId: '',
    changelogSummary: '',
  });

  const [mergeForm, setMergeForm] = useState({
    sourceIdeaId: '',
    canonicalIdeaId: '',
    mergeNotes: '',
  });

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, ideasRes] = await Promise.all([
        productsApi.getProducts(),
        productIdeasApi.getIdeas({
          productId: selectedProductId || undefined,
          status: statusFilter || undefined,
          roadmapBucket: roadmapBucketFilter || undefined,
          isPublished: publishedFilter === 'ALL' ? undefined : publishedFilter === 'YES',
          search: searchQuery || undefined,
          sortBy,
        }),
      ]);

      const prods = (prodRes.data as any)?.items || prodRes.data || [];
      setProducts(prods);
      setIdeas(ideasRes.data || []);

      if (selectedProductId) {
        try {
          const verRes = await projectsApi.getVersions({ productId: selectedProductId });
          setVersions(verRes.data || []);
        } catch (e) {
          console.error(e);
        }
      }
    } catch (err: any) {
      console.error(err);
      showNotification('Failed to load product ideas and metadata', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedProductId, statusFilter, roadmapBucketFilter, publishedFilter, sortBy, searchQuery]);

  // Compute live RICE score
  const calculateLiveRice = (reach: number, impact: number, confidence: number, effort: number) => {
    if (!effort || effort <= 0) return 0;
    return Math.round(((reach * impact * confidence) / effort) * 100) / 100;
  };

  // Create Idea
  const handleCreateIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.productId || !createForm.title || !createForm.sanitizedDescription) {
      showNotification('Please fill in required fields (Product, Title, Description)', 'error');
      return;
    }
    try {
      await productIdeasApi.createIdea(createForm);
      showNotification('Product idea logged in discovery backlog successfully');
      setShowCreateModal(false);
      fetchData();
    } catch (err: any) {
      showNotification(err?.response?.data?.message || 'Error creating idea', 'error');
    }
  };

  // Open Score Drawer
  const handleOpenScore = (idea: ProductIdea) => {
    setSelectedIdea(idea);
    setScoreForm({
      reach: idea.reach ?? 100,
      impactScore: idea.impact_score ? Number(idea.impact_score) : 2.0,
      confidenceScore: idea.confidence_score ? Number(idea.confidence_score) : 0.8,
      effortScore: idea.effort_score ? Number(idea.effort_score) : 2.0,
      strategicFit: idea.strategic_fit ?? 3,
      scoringRationale: idea.scoring_rationale || '',
    });
    setShowScoreModal(true);
  };

  const handleSaveScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIdea) return;
    try {
      await productIdeasApi.scoreIdea(selectedIdea.id, scoreForm);
      showNotification(`RICE score for ${selectedIdea.idea_code} updated`);
      setShowScoreModal(false);
      fetchData();
    } catch (err: any) {
      showNotification(err?.response?.data?.message || 'Error updating RICE score', 'error');
    }
  };

  // Open Moderate Drawer
  const handleOpenModerate = (idea: ProductIdea) => {
    setSelectedIdea(idea);
    setModerateForm({
      isPublished: idea.is_published,
      visibility: idea.visibility,
      title: idea.title,
      sanitizedDescription: idea.sanitized_description,
      status: idea.status,
      statusReason: idea.status_reason || '',
    });
    setShowModerateModal(true);
  };

  const handleSaveModerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIdea) return;
    try {
      await productIdeasApi.moderateIdea(selectedIdea.id, moderateForm);
      showNotification(`Idea ${selectedIdea.idea_code} moderated and published settings saved`);
      setShowModerateModal(false);
      fetchData();
    } catch (err: any) {
      showNotification(err?.response?.data?.message || 'Error moderating idea', 'error');
    }
  };

  // Open Roadmap Drawer
  const handleOpenRoadmap = (idea: ProductIdea) => {
    setSelectedIdea(idea);
    setRoadmapForm({
      roadmapBucket: idea.roadmap_bucket || 'NOW',
      indicativeTarget: idea.indicative_target || '',
      status: idea.status,
      targetVersionId: idea.target_version_id || '',
      changelogSummary: idea.changelog_summary || '',
    });
    setShowRoadmapModal(true);
  };

  const handleSaveRoadmap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIdea) return;
    try {
      await productIdeasApi.updateRoadmap(selectedIdea.id, roadmapForm);
      showNotification(`Roadmap updated for ${selectedIdea.idea_code} (Target is explicitly indicative)`);
      setShowRoadmapModal(false);
      fetchData();
    } catch (err: any) {
      showNotification(err?.response?.data?.message || 'Error updating roadmap', 'error');
    }
  };

  // Duplicate Merging
  const handleOpenMerge = (sourceIdea: ProductIdea) => {
    setSelectedIdea(sourceIdea);
    setMergeForm({
      sourceIdeaId: sourceIdea.id,
      canonicalIdeaId: '',
      mergeNotes: `Duplicate proposal consolidated into canonical idea.`,
    });
    setShowMergeModal(true);
  };

  const handleExecuteMerge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mergeForm.sourceIdeaId || !mergeForm.canonicalIdeaId) {
      showNotification('Please select the canonical idea to merge into', 'error');
      return;
    }
    try {
      const res = await productIdeasApi.mergeDuplicates(mergeForm.sourceIdeaId, {
        canonicalIdeaId: mergeForm.canonicalIdeaId,
        mergeNotes: mergeForm.mergeNotes,
      });
      showNotification(
        `Merged successfully: ${res.migratedVotesCount} votes migrated, ${res.deduplicatedVotesCount} duplicate organization votes deduplicated.`,
      );
      setShowMergeModal(false);
      fetchData();
    } catch (err: any) {
      showNotification(err?.response?.data?.message || 'Error merging duplicate ideas', 'error');
    }
  };

  // Roadmap buckets
  const nowIdeas = ideas.filter((i) => i.roadmap_bucket === 'NOW' && i.status !== 'MERGED');
  const nextIdeas = ideas.filter((i) => i.roadmap_bucket === 'NEXT' && i.status !== 'MERGED');
  const laterIdeas = ideas.filter((i) => i.roadmap_bucket === 'LATER' && i.status !== 'MERGED');
  const mergedIdeas = ideas.filter((i) => i.status === 'MERGED');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-rose-50 text-rose-800 border-rose-300'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <Compass className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Product Discovery, Voting & Roadmaps
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Prioritize with RICE, moderate customer proposals, run one-vote-per-org voting, and publish indicative roadmaps
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setCreateForm({
                productId: selectedProductId || products[0]?.id || '',
                title: '',
                sanitizedDescription: '',
                customerProblem: '',
                expectedOutcome: '',
                targetSegment: '',
                reach: 100,
                impactScore: 2.0,
                confidenceScore: 0.8,
                effortScore: 2.0,
                strategicFit: 3,
                scoringRationale: '',
                privateEvidenceNotes: '',
                internalCommercialImpact: '',
                visibility: 'PRODUCT_COMMUNITY',
                isPublished: false,
              });
              setShowCreateModal(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Discovery Idea
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('DISCOVERY')}
          className={`pb-3 px-2 text-sm font-medium flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === 'DISCOVERY'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Lightbulb className="w-4 h-4" />
          <span>Discovery Backlog ({ideas.filter((i) => i.status !== 'MERGED').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ROADMAP')}
          className={`pb-3 px-2 text-sm font-medium flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === 'ROADMAP'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Customer Roadmap (Now / Next / Later)</span>
        </button>

        <button
          onClick={() => setActiveTab('MERGED')}
          className={`pb-3 px-2 text-sm font-medium flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === 'MERGED'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <GitMerge className="w-4 h-4" />
          <span>Merged & Deduplicated ({mergedIdeas.length})</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Product Filter */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Product</label>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.product_name} ({p.product_code})
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="PROPOSED">Proposed</option>
            <option value="UNDER_EVALUATION">Under Evaluation</option>
            <option value="PLANNED">Planned</option>
            <option value="IN_DEVELOPMENT">In Development</option>
            <option value="RELEASED">Released</option>
            <option value="DEFERRED">Deferred</option>
            <option value="DECLINED">Declined</option>
          </select>
        </div>

        {/* Published Filter */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Moderation</label>
          <select
            value={publishedFilter}
            onChange={(e) => setPublishedFilter(e.target.value)}
            className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="ALL">All Ideas</option>
            <option value="YES">Published to Community</option>
            <option value="NO">Internal / Draft</option>
          </select>
        </div>

        {/* Sort By */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Sort By</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="rice">RICE Score (Highest First)</option>
            <option value="votes">Community Votes (Most Voted)</option>
            <option value="created">Recently Created</option>
          </select>
        </div>

        {/* Search */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Search</label>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search code, title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 text-sm border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* TAB 1: DISCOVERY BACKLOG */}
      {activeTab === 'DISCOVERY' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading discovery backlog...</div>
          ) : ideas.filter((i) => i.status !== 'MERGED').length === 0 ? (
            <div className="p-12 text-center">
              <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900">No discovery ideas found</h3>
              <p className="text-sm text-gray-500 mt-1">
                Log customer problems, score with RICE, or submit proposals from client portal.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-gray-600 font-semibold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left">Code & Title</th>
                    <th className="px-4 py-3 text-left">Product</th>
                    <th className="px-4 py-3 text-center">RICE Score</th>
                    <th className="px-4 py-3 text-center">R / I / C / E</th>
                    <th className="px-4 py-3 text-center">Votes</th>
                    <th className="px-4 py-3 text-center">Roadmap</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Published</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {ideas
                    .filter((i) => i.status !== 'MERGED')
                    .map((idea) => (
                      <tr key={idea.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                              {idea.idea_code}
                            </span>
                            <span className="font-medium text-gray-900">{idea.title}</span>
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                            {idea.sanitized_description}
                          </p>
                        </td>

                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {idea.product_name || 'N/A'}
                        </td>

                        <td className="px-4 py-3 text-center">
                          {idea.rice_score !== undefined && idea.rice_score !== null ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <TrendingUp className="w-3 h-3 mr-1" />
                              {Number(idea.rice_score).toFixed(0)}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Not Scored</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-center text-xs text-gray-500 font-mono">
                          {idea.reach ?? '-'} / {idea.impact_score ?? '-'} /{' '}
                          {idea.confidence_score ?? '-'} / {idea.effort_score ?? '-'}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-800">
                            <ThumbsUp className="w-3 h-3 mr-1 text-gray-500" />
                            {idea.vote_count}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center">
                          {idea.roadmap_bucket ? (
                            <span
                              className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${
                                idea.roadmap_bucket === 'NOW'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : idea.roadmap_bucket === 'NEXT'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}
                            >
                              {idea.roadmap_bucket}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                              idea.status === 'RELEASED'
                                ? 'bg-emerald-50 text-emerald-700'
                                : idea.status === 'IN_DEVELOPMENT'
                                ? 'bg-blue-50 text-blue-700'
                                : idea.status === 'PLANNED'
                                ? 'bg-indigo-50 text-indigo-700'
                                : idea.status === 'DECLINED'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {idea.status}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center">
                          {idea.is_published ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700">
                              <Globe className="w-3 h-3 mr-1" />
                              Published
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                              <Lock className="w-3 h-3 mr-1" />
                              Private
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenScore(idea)}
                            title="RICE Prioritization"
                            className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                          >
                            <Sliders className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenModerate(idea)}
                            title="Sanitize & Publish"
                            className="p-1.5 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenRoadmap(idea)}
                            title="Assign to Roadmap"
                            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Calendar className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenMerge(idea)}
                            title="Merge Duplicate Idea"
                            className="p-1.5 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded"
                          >
                            <GitMerge className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: NOW / NEXT / LATER ROADMAP BOARD */}
      {activeTab === 'ROADMAP' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>
              <strong>Contractual Disclaimer:</strong> Dated targets in Now / Next / Later views are explicitly indicative unless contractually approved. Changes to target dates preserve audit history and do not silently alter contractual commitments.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* NOW Bucket */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex flex-col space-y-3">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  <h3 className="font-bold text-gray-900">NOW (Active Commitments)</h3>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                  {nowIdeas.length}
                </span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto">
                {nowIdeas.map((idea) => (
                  <div
                    key={idea.id}
                    className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:border-emerald-300 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {idea.idea_code}
                      </span>
                      {idea.indicative_target && (
                        <span className="text-xs text-gray-500 flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {idea.indicative_target}
                        </span>
                      )}
                    </div>
                    <h4 className="font-semibold text-gray-900 text-sm">{idea.title}</h4>
                    <p className="text-xs text-gray-600 line-clamp-2">{idea.sanitized_description}</p>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500">
                      <span className="flex items-center">
                        <ThumbsUp className="w-3 h-3 mr-1 text-gray-400" />
                        {idea.vote_count} votes
                      </span>
                      <button
                        onClick={() => handleOpenRoadmap(idea)}
                        className="text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Edit Target →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* NEXT Bucket */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex flex-col space-y-3">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  <h3 className="font-bold text-gray-900">NEXT (Upcoming Releases)</h3>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                  {nextIdeas.length}
                </span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto">
                {nextIdeas.map((idea) => (
                  <div
                    key={idea.id}
                    className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {idea.idea_code}
                      </span>
                      {idea.indicative_target && (
                        <span className="text-xs text-gray-500 flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {idea.indicative_target}
                        </span>
                      )}
                    </div>
                    <h4 className="font-semibold text-gray-900 text-sm">{idea.title}</h4>
                    <p className="text-xs text-gray-600 line-clamp-2">{idea.sanitized_description}</p>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500">
                      <span className="flex items-center">
                        <ThumbsUp className="w-3 h-3 mr-1 text-gray-400" />
                        {idea.vote_count} votes
                      </span>
                      <button
                        onClick={() => handleOpenRoadmap(idea)}
                        className="text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Edit Target →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* LATER Bucket */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex flex-col space-y-3">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                  <h3 className="font-bold text-gray-900">LATER (Future Horizon)</h3>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full">
                  {laterIdeas.length}
                </span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto">
                {laterIdeas.map((idea) => (
                  <div
                    key={idea.id}
                    className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:border-purple-300 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {idea.idea_code}
                      </span>
                      {idea.indicative_target && (
                        <span className="text-xs text-gray-500 flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {idea.indicative_target}
                        </span>
                      )}
                    </div>
                    <h4 className="font-semibold text-gray-900 text-sm">{idea.title}</h4>
                    <p className="text-xs text-gray-600 line-clamp-2">{idea.sanitized_description}</p>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500">
                      <span className="flex items-center">
                        <ThumbsUp className="w-3 h-3 mr-1 text-gray-400" />
                        {idea.vote_count} votes
                      </span>
                      <button
                        onClick={() => handleOpenRoadmap(idea)}
                        className="text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Edit Target →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MERGED & DEDUPLICATED */}
      {activeTab === 'MERGED' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-6 space-y-4">
          <div className="flex items-center space-x-3 border-b border-gray-200 pb-3">
            <GitMerge className="w-6 h-6 text-purple-600" />
            <div>
              <h3 className="font-bold text-gray-900">Consolidated & Merged Proposals</h3>
              <p className="text-xs text-gray-500">
                Audit trail of duplicate community submissions merged into canonical product ideas.
              </p>
            </div>
          </div>

          {mergedIdeas.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              No ideas have been merged yet.
            </div>
          ) : (
            <div className="space-y-4">
              {mergedIdeas.map((idea) => (
                <div
                  key={idea.id}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-gray-700 bg-gray-200 px-2 py-0.5 rounded">
                        {idea.idea_code}
                      </span>
                      <span className="font-semibold text-gray-900 text-sm">{idea.title}</span>
                    </div>
                    <span className="text-xs px-2.5 py-1 bg-purple-100 text-purple-800 font-bold rounded-full">
                      MERGED
                    </span>
                  </div>

                  <div className="text-xs text-gray-600 bg-white p-3 rounded border border-gray-200 flex items-center space-x-2">
                    <ArrowRight className="w-4 h-4 text-purple-600 flex-shrink-0" />
                    <span>
                      Merged into canonical idea:{' '}
                      <strong className="text-indigo-700">{idea.merged_into_code}</strong> - {idea.merged_into_title}
                    </span>
                  </div>

                  {idea.status_reason && (
                    <p className="text-xs text-gray-500 italic">Notes: {idea.status_reason}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: CREATE DISCOVERY IDEA */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 space-y-4 my-8">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <Lightbulb className="w-5 h-5 text-indigo-600 mr-2" />
                Capture Product Discovery Idea
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateIdea} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Product *</label>
                <select
                  value={createForm.productId}
                  onChange={(e) => setCreateForm({ ...createForm, productId: e.target.value })}
                  required
                  className="w-full text-sm border-gray-300 rounded-lg"
                >
                  <option value="">Select Target Product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.product_name} ({p.product_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Idea Title *</label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="e.g. Bulk CSV Export for Financial Reports"
                  required
                  className="w-full text-sm border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Sanitized Customer-Facing Description *
                </label>
                <textarea
                  rows={2}
                  value={createForm.sanitizedDescription}
                  onChange={(e) => setCreateForm({ ...createForm, sanitizedDescription: e.target.value })}
                  placeholder="Safe summary suitable for publishing to licensed client contacts"
                  required
                  className="w-full text-sm border-gray-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Customer Problem</label>
                  <textarea
                    rows={2}
                    value={createForm.customerProblem}
                    onChange={(e) => setCreateForm({ ...createForm, customerProblem: e.target.value })}
                    placeholder="Specific pain point or bottleneck"
                    className="w-full text-sm border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Expected Outcome</label>
                  <textarea
                    rows={2}
                    value={createForm.expectedOutcome}
                    onChange={(e) => setCreateForm({ ...createForm, expectedOutcome: e.target.value })}
                    placeholder="Desired quantifiable or qualitative result"
                    className="w-full text-sm border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              {/* RICE Prioritization Grid */}
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-900 uppercase flex items-center">
                    <TrendingUp className="w-4 h-4 mr-1 text-amber-700" />
                    RICE Prioritization
                  </h4>
                  <span className="text-xs font-bold bg-amber-200 text-amber-900 px-2.5 py-1 rounded-full">
                    Computed RICE:{' '}
                    {calculateLiveRice(
                      createForm.reach,
                      createForm.impactScore,
                      createForm.confidenceScore,
                      createForm.effortScore,
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">Reach (Customers/Users)</label>
                    <input
                      type="number"
                      min={0}
                      value={createForm.reach}
                      onChange={(e) => setCreateForm({ ...createForm, reach: Number(e.target.value) })}
                      className="w-full text-xs border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">Impact (0.1 - 10)</label>
                    <input
                      type="number"
                      step={0.1}
                      min={0.1}
                      max={10}
                      value={createForm.impactScore}
                      onChange={(e) => setCreateForm({ ...createForm, impactScore: Number(e.target.value) })}
                      className="w-full text-xs border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">Confidence (0.1 - 1.0)</label>
                    <input
                      type="number"
                      step={0.1}
                      min={0.1}
                      max={1.0}
                      value={createForm.confidenceScore}
                      onChange={(e) => setCreateForm({ ...createForm, confidenceScore: Number(e.target.value) })}
                      className="w-full text-xs border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">Effort (Person-Months)</label>
                    <input
                      type="number"
                      step={0.5}
                      min={0.1}
                      max={20}
                      value={createForm.effortScore}
                      onChange={(e) => setCreateForm({ ...createForm, effortScore: Number(e.target.value) })}
                      className="w-full text-xs border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>

              {/* Confidential Internal Notes */}
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2">
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-gray-700">
                  <Lock className="w-3.5 h-3.5 text-rose-500" />
                  <span>Confidential Internal Evidence & Deliberations (PM Eyes Only)</span>
                </div>
                <textarea
                  rows={2}
                  value={createForm.privateEvidenceNotes}
                  onChange={(e) => setCreateForm({ ...createForm, privateEvidenceNotes: e.target.value })}
                  placeholder="Sales calls, interview snippets, or competitor comparisons that must never be revealed to clients"
                  className="w-full text-xs border-gray-300 rounded"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  Create Discovery Idea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RICE SCORING DRAWER */}
      {showScoreModal && selectedIdea && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  {selectedIdea.idea_code}
                </span>
                <h3 className="text-base font-bold text-gray-900 mt-1">RICE Prioritization Scoring</h3>
              </div>
              <button onClick={() => setShowScoreModal(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveScore} className="space-y-4">
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-800">Formula: (Reach × Impact × Confidence) / Effort</span>
                <span className="text-base font-bold text-amber-900">
                  RICE Score: {calculateLiveRice(scoreForm.reach, scoreForm.impactScore, scoreForm.confidenceScore, scoreForm.effortScore)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Reach (Customers/mo)</label>
                  <input
                    type="number"
                    min={0}
                    value={scoreForm.reach}
                    onChange={(e) => setScoreForm({ ...scoreForm, reach: Number(e.target.value) })}
                    className="w-full text-sm border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Impact (0.1 - 10.0)</label>
                  <input
                    type="number"
                    step={0.1}
                    min={0.1}
                    max={10.0}
                    value={scoreForm.impactScore}
                    onChange={(e) => setScoreForm({ ...scoreForm, impactScore: Number(e.target.value) })}
                    className="w-full text-sm border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Confidence (0.1 - 1.0)</label>
                  <input
                    type="number"
                    step={0.1}
                    min={0.1}
                    max={1.0}
                    value={scoreForm.confidenceScore}
                    onChange={(e) => setScoreForm({ ...scoreForm, confidenceScore: Number(e.target.value) })}
                    className="w-full text-sm border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Effort (Person-Months)</label>
                  <input
                    type="number"
                    step={0.5}
                    min={0.1}
                    max={20.0}
                    value={scoreForm.effortScore}
                    onChange={(e) => setScoreForm({ ...scoreForm, effortScore: Number(e.target.value) })}
                    className="w-full text-sm border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Strategic Fit (1 - 5)</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={scoreForm.strategicFit}
                  onChange={(e) => setScoreForm({ ...scoreForm, strategicFit: Number(e.target.value) })}
                  className="w-full text-sm border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Scoring Rationale</label>
                <textarea
                  rows={2}
                  value={scoreForm.scoringRationale}
                  onChange={(e) => setScoreForm({ ...scoreForm, scoringRationale: e.target.value })}
                  placeholder="Justification for chosen confidence or effort"
                  className="w-full text-sm border-gray-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowScoreModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  Update RICE Score
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: MODERATE & SANITIZE FOR COMMUNITY */}
      {showModerateModal && selectedIdea && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  {selectedIdea.idea_code}
                </span>
                <h3 className="text-base font-bold text-gray-900 mt-1">Moderate & Publish to Community</h3>
              </div>
              <button onClick={() => setShowModerateModal(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModerate} className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-xs text-blue-900">
                Publishing makes this proposal visible to authenticated client contacts licensed for{' '}
                <strong>{selectedIdea.product_name}</strong>. Internal RICE scores and private commercial notes are strictly withheld.
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Sanitized Public Description</label>
                <textarea
                  rows={3}
                  value={moderateForm.sanitizedDescription}
                  onChange={(e) => setModerateForm({ ...moderateForm, sanitizedDescription: e.target.value })}
                  placeholder="Ensure no confidential customer names or commercial data appear here"
                  className="w-full text-sm border-gray-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={moderateForm.status}
                    onChange={(e) => setModerateForm({ ...moderateForm, status: e.target.value as any })}
                    className="w-full text-sm border-gray-300 rounded-lg"
                  >
                    <option value="PROPOSED">Proposed</option>
                    <option value="UNDER_EVALUATION">Under Evaluation</option>
                    <option value="PLANNED">Planned</option>
                    <option value="IN_DEVELOPMENT">In Development</option>
                    <option value="RELEASED">Released</option>
                    <option value="DECLINED">Declined</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Visibility</label>
                  <select
                    value={moderateForm.visibility}
                    onChange={(e) => setModerateForm({ ...moderateForm, visibility: e.target.value as any })}
                    className="w-full text-sm border-gray-300 rounded-lg"
                  >
                    <option value="PRODUCT_COMMUNITY">Licensed Product Community</option>
                    <option value="INTERNAL_ONLY">Internal Only</option>
                    <option value="PUBLIC">Public</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                <input
                  type="checkbox"
                  id="pub-checkbox"
                  checked={moderateForm.isPublished}
                  onChange={(e) => setModerateForm({ ...moderateForm, isPublished: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                />
                <label htmlFor="pub-checkbox" className="text-xs font-semibold text-gray-900 cursor-pointer">
                  Publish to Licensed Customer Portal (Enable Community Voting)
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowModerateModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
                >
                  Save Moderation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ROADMAP ASSIGNMENT DRAWER */}
      {showRoadmapModal && selectedIdea && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  {selectedIdea.idea_code}
                </span>
                <h3 className="text-base font-bold text-gray-900 mt-1">Assign to Customer Roadmap</h3>
              </div>
              <button onClick={() => setShowRoadmapModal(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRoadmap} className="space-y-4">
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>Dated targets are indicative estimates only and do not alter contractual commitments.</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Roadmap Bucket</label>
                  <select
                    value={roadmapForm.roadmapBucket}
                    onChange={(e) => setRoadmapForm({ ...roadmapForm, roadmapBucket: e.target.value as any })}
                    className="w-full text-sm border-gray-300 rounded-lg"
                  >
                    <option value="NOW">NOW (Active / Immediate)</option>
                    <option value="NEXT">NEXT (Upcoming Releases)</option>
                    <option value="LATER">LATER (Future Horizon)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Indicative Target</label>
                  <input
                    type="text"
                    value={roadmapForm.indicativeTarget}
                    onChange={(e) => setRoadmapForm({ ...roadmapForm, indicativeTarget: e.target.value })}
                    placeholder="e.g. Q4 2026, v3.2"
                    className="w-full text-sm border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Target Version (Optional)</label>
                <select
                  value={roadmapForm.targetVersionId}
                  onChange={(e) => setRoadmapForm({ ...roadmapForm, targetVersionId: e.target.value })}
                  className="w-full text-sm border-gray-300 rounded-lg"
                >
                  <option value="">No version linked</option>
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.version_name} ({v.version_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Changelog Summary (For Released Items)</label>
                <textarea
                  rows={2}
                  value={roadmapForm.changelogSummary}
                  onChange={(e) => setRoadmapForm({ ...roadmapForm, changelogSummary: e.target.value })}
                  placeholder="Approved public release notes summary"
                  className="w-full text-sm border-gray-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowRoadmapModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  Save Roadmap Bucket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: DUPLICATE MERGING */}
      {showMergeModal && selectedIdea && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                  Consolidate Duplicates
                </span>
                <h3 className="text-base font-bold text-gray-900 mt-1">Merge Idea into Canonical Target</h3>
              </div>
              <button onClick={() => setShowMergeModal(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteMerge} className="space-y-4">
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 text-xs text-purple-900 space-y-1">
                <p className="font-semibold">Atomic Organization-Level Deduplication:</p>
                <p>
                  Any client organization that voted on both ideas will only have their vote counted <strong>once</strong> on the canonical idea. Source submissions are marked MERGED and private evidence remains confidential.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Source Duplicate Idea</label>
                <div className="p-2.5 bg-gray-100 rounded-lg text-xs font-mono font-bold text-gray-800">
                  {selectedIdea.idea_code}: {selectedIdea.title} ({selectedIdea.vote_count} votes)
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Canonical Target Idea *</label>
                <select
                  value={mergeForm.canonicalIdeaId}
                  onChange={(e) => setMergeForm({ ...mergeForm, canonicalIdeaId: e.target.value })}
                  required
                  className="w-full text-sm border-gray-300 rounded-lg"
                >
                  <option value="">Select Canonical Target</option>
                  {ideas
                    .filter((i) => i.id !== selectedIdea.id && i.product_id === selectedIdea.product_id && i.status !== 'MERGED')
                    .map((can) => (
                      <option key={can.id} value={can.id}>
                        {can.idea_code}: {can.title} ({can.vote_count} votes)
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Merge Audit Notes</label>
                <textarea
                  rows={2}
                  value={mergeForm.mergeNotes}
                  onChange={(e) => setMergeForm({ ...mergeForm, mergeNotes: e.target.value })}
                  className="w-full text-sm border-gray-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowMergeModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
                >
                  Confirm & Deduplicate Merge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
