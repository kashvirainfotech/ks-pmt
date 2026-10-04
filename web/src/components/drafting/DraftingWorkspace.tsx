import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sliders,
  RefreshCw,
  Search,
  Filter,
  Check,
  Eye,
  Edit3,
  Copy,
  ArrowRight,
  Shield,
  Layers,
  Code2,
  FolderGit2,
  Plus,
  Trash2,
  BookOpen,
} from 'lucide-react';
import { draftingApi, tasksApi, requirementsApi, projectsApi } from '../../api/endpoints';
import {
  DraftSuggestion,
  DraftRuleConfig,
  DraftType,
  DraftStatus,
  AudienceScope,
  Task,
  Version,
} from '../../types';

export const DraftingWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'queue' | 'generate' | 'radar' | 'rules'>('queue');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Draft suggestions
  const [drafts, setDrafts] = useState<DraftSuggestion[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [audienceFilter, setAudienceFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Rules
  const [rules, setRules] = useState<DraftRuleConfig[]>([]);

  // Selected draft for review modal
  const [selectedDraft, setSelectedDraft] = useState<DraftSuggestion | null>(null);
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [applyToSource, setApplyToSource] = useState<boolean>(true);
  const [editableContent, setEditableContent] = useState<any>(null);

  // Generator form state
  const [generatorType, setGeneratorType] = useState<
    'SUBTASKS' | 'ACCEPTANCE_CRITERIA' | 'RELEASE_NOTES' | 'GAP_AUDIT' | 'DUPLICATE_CHECK'
  >('SUBTASKS');
  const [sourceEntityId, setSourceEntityId] = useState<string>('');
  const [sourceEntityType, setSourceEntityType] = useState<
    'TASK' | 'REQUIREMENT' | 'VERSION' | 'SPRINT' | 'PROJECT'
  >('TASK');
  const [audienceScope, setAudienceScope] = useState<AudienceScope>('INTERNAL_ONLY');

  // Candidate source entities
  const [tasksList, setTasksList] = useState<Task[]>([]);
  const [reqsList, setReqsList] = useState<any[]>([]);
  const [versionsList, setVersionsList] = useState<Version[]>([]);

  // Radar audit results
  const [auditResult, setAuditResult] = useState<any>(null);

  const fetchDrafts = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (typeFilter !== 'ALL') params.draftType = typeFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (audienceFilter !== 'ALL') params.audienceScope = audienceFilter;

      const res = await draftingApi.getDrafts(params);
      setDrafts(res.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to fetch draft suggestions');
    } finally {
      setLoading(false);
    }
  };

  const fetchRules = async () => {
    try {
      const res = await draftingApi.getRules();
      setRules(res.data || []);
    } catch (err: any) {
      console.error('Failed to load drafting rules', err);
    }
  };

  const fetchSourceOptions = async () => {
    try {
      const [tRes, rRes, vRes] = await Promise.allSettled([
        tasksApi.getTasks({ limit: 50 }),
        requirementsApi.getRequirements({ limit: 50 }),
        projectsApi.getVersions(),
      ]);

      if (tRes.status === 'fulfilled' && tRes.value?.data?.data) {
        setTasksList(tRes.value.data.data);
      }
      if (rRes.status === 'fulfilled' && Array.isArray(rRes.value?.data)) {
        setReqsList(rRes.value.data);
      }
      if (vRes.status === 'fulfilled' && vRes.value?.data) {
        setVersionsList(vRes.value.data);
      }
    } catch (err) {
      console.warn('Non-fatal error loading source entities', err);
    }
  };

  useEffect(() => {
    fetchDrafts();
    fetchRules();
    fetchSourceOptions();
  }, [typeFilter, statusFilter, audienceFilter]);

  const handleOpenReview = (draft: DraftSuggestion) => {
    setSelectedDraft(draft);
    setReviewNotes(draft.review_notes || '');
    setApplyToSource(true);
    setEditableContent(JSON.parse(JSON.stringify(draft.reviewed_content || draft.suggested_content || {})));
  };

  const handleReviewAction = async (status: 'ACCEPTED' | 'REJECTED' | 'DISCARDED') => {
    if (!selectedDraft) return;
    try {
      setLoading(true);
      setError(null);

      const isModified =
        status === 'ACCEPTED' &&
        JSON.stringify(editableContent) !== JSON.stringify(selectedDraft.suggested_content);

      const finalStatus: 'ACCEPTED' | 'MODIFIED_AND_ACCEPTED' | 'REJECTED' | 'DISCARDED' = isModified
        ? 'MODIFIED_AND_ACCEPTED'
        : status;

      await draftingApi.reviewDraft(selectedDraft.id, {
        status: finalStatus,
        reviewNotes,
        reviewedContent: editableContent,
        applyToSource: finalStatus === 'ACCEPTED' || finalStatus === 'MODIFIED_AND_ACCEPTED' ? applyToSource : false,
      });

      setSuccessMsg(
        `Draft ${selectedDraft.draft_code} marked as ${finalStatus}${
          applyToSource && (finalStatus === 'ACCEPTED' || finalStatus === 'MODIFIED_AND_ACCEPTED')
            ? ' and applied to source entity!'
            : '.'
        }`,
      );
      setSelectedDraft(null);
      fetchDrafts();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to review draft');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerGenerate = async () => {
    if (!sourceEntityId && generatorType !== 'GAP_AUDIT') {
      setError('Please select or specify a source entity ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await draftingApi.generateDraft({
        generatorType,
        entityId: sourceEntityId || '00000000-0000-0000-0000-000000000000',
        entityType: sourceEntityType,
        audienceScope,
      });

      setSuccessMsg(`Draft generation completed successfully.`);
      if (generatorType === 'GAP_AUDIT') {
        setAuditResult(res.data);
        setActiveTab('radar');
      } else {
        setActiveTab('queue');
      }
      fetchDrafts();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Draft generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRule = async (ruleId: string, isEnabled: boolean, threshold?: number) => {
    try {
      setLoading(true);
      setError(null);
      await draftingApi.updateRule(ruleId, {
        isEnabled,
        similarityThreshold: threshold,
      });
      setSuccessMsg('Drafting rule updated successfully.');
      fetchRules();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to update rule');
    } finally {
      setLoading(false);
    }
  };

  // Filter drafts by query
  const filteredDrafts = drafts.filter((d) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.draft_code.toLowerCase().includes(q) ||
      d.title.toLowerCase().includes(q) ||
      (d.source_entity_code && d.source_entity_code.toLowerCase().includes(q))
    );
  });

  const pendingCount = drafts.filter((d) => d.status === 'PENDING_REVIEW').length;
  const acceptedCount = drafts.filter((d) => d.status === 'ACCEPTED' || d.status === 'MODIFIED_AND_ACCEPTED').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Source-Linked Drafting & Review Ledger
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                LATER-002: Deterministic assistance, human verification, coverage gap audit, and release summaries
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchDrafts();
              fetchRules();
            }}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/60 shadow-sm transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setActiveTab('generate')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Generate New Draft
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Suggestions</span>
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{drafts.length}</span>
            <span className="text-xs text-gray-500">recorded</span>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Pending Review</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingCount}</span>
            <span className="text-xs text-gray-500">awaiting lead</span>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Accepted & Applied</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{acceptedCount}</span>
            <span className="text-xs text-gray-500">into system</span>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Active Rules</span>
            <Sliders className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {rules.filter((r) => r.is_enabled).length} / {rules.length}
            </span>
            <span className="text-xs text-gray-500">configured</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 gap-6">
        <button
          onClick={() => setActiveTab('queue')}
          className={`pb-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
            activeTab === 'queue'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <FileText className="w-4 h-4" />
          Suggestions Review Queue
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 rounded-full font-bold">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('generate')}
          className={`pb-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
            activeTab === 'generate'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Drafting Generator
        </button>

        <button
          onClick={() => setActiveTab('radar')}
          className={`pb-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
            activeTab === 'radar'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Shield className="w-4 h-4" />
          Coverage Gap Radar
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`pb-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
            activeTab === 'rules'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Rule Configurations
        </button>
      </div>

      {/* TAB 1: SUGGESTIONS QUEUE */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search code, title, source..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200"
              >
                <option value="ALL">All Types</option>
                <option value="DRAFT_SUBTASKS">WBS Subtasks</option>
                <option value="DRAFT_ACCEPTANCE_CRITERIA">Acceptance Criteria</option>
                <option value="DRAFT_RELEASE_NOTES">Release Notes</option>
                <option value="GAP_SUGGESTION">Gap Suggestion</option>
                <option value="DUPLICATE_SUGGESTION">Duplicate Suggestion</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING_REVIEW">Pending Review</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="MODIFIED_AND_ACCEPTED">Modified & Accepted</option>
                <option value="REJECTED">Rejected</option>
                <option value="DISCARDED">Discarded</option>
              </select>

              <select
                value={audienceFilter}
                onChange={(e) => setAudienceFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200"
              >
                <option value="ALL">All Audiences</option>
                <option value="INTERNAL_ONLY">Internal Only</option>
                <option value="CLIENT_SAFE">Client Safe</option>
                <option value="PUBLIC_COMMUNITY">Public Community</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/60 text-gray-600 dark:text-gray-400 uppercase text-xs">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">Draft Code</th>
                    <th className="px-5 py-3.5 font-semibold">Type</th>
                    <th className="px-5 py-3.5 font-semibold">Title & Source</th>
                    <th className="px-5 py-3.5 font-semibold">Audience</th>
                    <th className="px-5 py-3.5 font-semibold">Status</th>
                    <th className="px-5 py-3.5 font-semibold">Reviewer</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredDrafts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">
                        No draft suggestions found. Generate a new draft or run a coverage gap audit.
                      </td>
                    </tr>
                  ) : (
                    filteredDrafts.map((draft) => (
                      <tr key={draft.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                        <td className="px-5 py-4 font-mono font-medium text-blue-600 dark:text-blue-400">
                          {draft.draft_code}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`px-2 py-1 text-xs rounded-md font-medium ${
                              draft.draft_type === 'DRAFT_SUBTASKS'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                                : draft.draft_type === 'DRAFT_ACCEPTANCE_CRITERIA'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                                : draft.draft_type === 'DRAFT_RELEASE_NOTES'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                                : draft.draft_type === 'GAP_SUGGESTION'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
                            }`}
                          >
                            {draft.draft_type.replace('DRAFT_', '')}
                          </span>
                        </td>
                        <td className="px-5 py-4 max-w-sm">
                          <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">{draft.title}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            Source: <span className="font-mono text-gray-700 dark:text-gray-300">{draft.source_entity_type} {draft.source_entity_code || ''}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                              draft.audience_scope === 'CLIENT_SAFE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400'
                                : draft.audience_scope === 'PUBLIC_COMMUNITY'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-400'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                            }`}
                          >
                            {draft.audience_scope}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`px-2.5 py-1 text-xs rounded-full font-semibold ${
                              draft.status === 'PENDING_REVIEW'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                : draft.status === 'ACCEPTED' || draft.status === 'MODIFIED_AND_ACCEPTED'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                            }`}
                          >
                            {draft.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs text-gray-500">
                          {draft.reviewer_name ? (
                            <div>
                              <div className="font-medium text-gray-800 dark:text-gray-200">{draft.reviewer_name}</div>
                              <div>{new Date(draft.reviewed_at!).toLocaleDateString()}</div>
                            </div>
                          ) : (
                            <span className="italic text-gray-400">Unreviewed</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => handleOpenReview(draft)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-lg transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            {draft.status === 'PENDING_REVIEW' ? 'Review & Apply' : 'Inspect'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DRAFT GENERATOR */}
      {activeTab === 'generate' && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Deterministic Source-Linked Generator
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Produce structured draft subtasks, acceptance criteria, or release notes linked directly to primary entities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              onClick={() => {
                setGeneratorType('SUBTASKS');
                setSourceEntityType('TASK');
              }}
              className={`p-4 border rounded-xl cursor-pointer transition ${
                generatorType === 'SUBTASKS'
                  ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 shadow-sm'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold mb-1">
                <Layers className="w-4 h-4" />
                4-Phase WBS Subtasks
              </div>
              <p className="text-xs text-gray-500">
                Breaks down tasks into Architecture, Backend, Frontend, and QA testing subtasks with proportional hour estimates.
              </p>
            </div>

            <div
              onClick={() => {
                setGeneratorType('ACCEPTANCE_CRITERIA');
                setSourceEntityType('REQUIREMENT');
              }}
              className={`p-4 border rounded-xl cursor-pointer transition ${
                generatorType === 'ACCEPTANCE_CRITERIA'
                  ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 shadow-sm'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold mb-1">
                <BookOpen className="w-4 h-4" />
                Given-When-Then Criteria
              </div>
              <p className="text-xs text-gray-500">
                Derives boundary conditions, invalid payload handling, and RBAC authorization criteria for requirement specifications.
              </p>
            </div>

            <div
              onClick={() => {
                setGeneratorType('RELEASE_NOTES');
                setSourceEntityType('VERSION');
              }}
              className={`p-4 border rounded-xl cursor-pointer transition ${
                generatorType === 'RELEASE_NOTES'
                  ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 shadow-sm'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold mb-1">
                <FolderGit2 className="w-4 h-4" />
                Release Notes & Changelog
              </div>
              <p className="text-xs text-gray-500">
                Compiles verified bug fixes and feature enhancements, with audience filters stripping developer refactors for Client Safe mode.
              </p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4 max-w-2xl pt-2">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Select Source Entity ({sourceEntityType})
              </label>
              {generatorType === 'SUBTASKS' && (
                <select
                  value={sourceEntityId}
                  onChange={(e) => setSourceEntityId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"
                >
                  <option value="">-- Select a Task --</option>
                  {tasksList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.task_code}: {t.title} ({t.estimated_hours || 0} hrs)
                    </option>
                  ))}
                </select>
              )}

              {generatorType === 'ACCEPTANCE_CRITERIA' && (
                <select
                  value={sourceEntityId}
                  onChange={(e) => setSourceEntityId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"
                >
                  <option value="">-- Select a Requirement Specification --</option>
                  {reqsList.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.req_code}: {r.title} ({r.status})
                    </option>
                  ))}
                </select>
              )}

              {generatorType === 'RELEASE_NOTES' && (
                <select
                  value={sourceEntityId}
                  onChange={(e) => setSourceEntityId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"
                >
                  <option value="">-- Select Software Version --</option>
                  {versionsList.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.version_code}: {v.version_name || 'Release'}
                    </option>
                  ))}
                </select>
              )}

              <p className="text-xs text-gray-500 mt-1">Or paste UUID directly:</p>
              <input
                type="text"
                placeholder="UUID of source entity"
                value={sourceEntityId}
                onChange={(e) => setSourceEntityId(e.target.value)}
                className="mt-1 w-full px-3 py-1.5 text-xs font-mono border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Audience Scope Boundary
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="radio"
                    name="audienceScope"
                    value="INTERNAL_ONLY"
                    checked={audienceScope === 'INTERNAL_ONLY'}
                    onChange={() => setAudienceScope('INTERNAL_ONLY')}
                  />
                  Internal Only (includes technical refactors & dev logs)
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="radio"
                    name="audienceScope"
                    value="CLIENT_SAFE"
                    checked={audienceScope === 'CLIENT_SAFE'}
                    onChange={() => setAudienceScope('CLIENT_SAFE')}
                  />
                  Client Safe (redacts refactors & private technical details)
                </label>
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={handleTriggerGenerate}
                disabled={loading || !sourceEntityId}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm disabled:opacity-50 transition"
              >
                <Sparkles className="w-4 h-4" />
                Generate Source-Linked Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COVERAGE GAP RADAR */}
      {activeTab === 'radar' && (
        <div className="space-y-6">
          <div className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  Automated Requirement & QA Coverage Radar
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Enforces RULE-GAP-TESTING and RULE-GAP-ACCEPTANCE across all project requirements.
                </p>
              </div>
              <button
                onClick={async () => {
                  try {
                    setLoading(true);
                    const res = await draftingApi.generateDraft({
                      generatorType: 'GAP_AUDIT',
                      entityId: '00000000-0000-0000-0000-000000000000',
                      entityType: 'REQUIREMENT',
                    });
                    setAuditResult(res.data);
                    setSuccessMsg(`Coverage audit completed: ${res.data.gaps_detected} gap(s) identified.`);
                    fetchDrafts();
                  } catch (err: any) {
                    setError('Audit scan failed');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg shadow-sm transition"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Run Live Coverage Audit
              </button>
            </div>

            {auditResult && (
              <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl">
                <div className="flex items-center justify-between text-sm font-semibold text-indigo-900 dark:text-indigo-200">
                  <span>Audited Specifications: {auditResult.audited_requirements}</span>
                  <span>Gaps Detected: {auditResult.gaps_detected}</span>
                </div>
              </div>
            )}
          </div>

          {/* Existing Gap Suggestions */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3">
              Identified Coverage Gaps Awaiting Resolution
            </h3>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {drafts.filter((d) => d.draft_type === 'GAP_SUGGESTION').length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-500">
                  No active coverage gaps logged. Run Live Coverage Audit to scan for orphaned specifications.
                </div>
              ) : (
                drafts
                  .filter((d) => d.draft_type === 'GAP_SUGGESTION')
                  .map((gap) => (
                    <div key={gap.id} className="py-3.5 flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded">
                            {gap.suggested_content?.rule_code || 'COVERAGE_GAP'}
                          </span>
                          <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{gap.title}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {gap.suggested_content?.issue} - Recommendation: {gap.suggested_content?.recommendation}
                        </p>
                      </div>
                      <button
                        onClick={() => handleOpenReview(gap)}
                        className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-900/40 rounded-lg hover:bg-blue-100 transition"
                      >
                        Inspect Gap
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: RULE CONFIGS */}
      {activeTab === 'rules' && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Drafting & Duplicate Analysis Rules
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Configure deterministic thresholds and rule activations for coverage gap detection and task duplicate checks.
            </p>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {rules.map((rule) => (
              <div key={rule.id} className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md">
                      {rule.rule_code}
                    </span>
                    <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{rule.rule_name}</span>
                    <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded">
                      {rule.rule_type}
                    </span>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rule.is_enabled}
                      onChange={(e) => handleUpdateRule(rule.id, e.target.checked, rule.similarity_threshold)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <p className="text-xs text-gray-600 dark:text-gray-400">{rule.description}</p>

                {rule.rule_type === 'DUPLICATE_DETECTION' && (
                  <div className="pt-2 flex items-center gap-4 text-xs text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Jaccard Token Similarity Threshold:</span>
                    <input
                      type="range"
                      min="0.40"
                      max="0.95"
                      step="0.05"
                      value={rule.similarity_threshold || 0.7}
                      onChange={(e) =>
                        setRules(
                          rules.map((r) =>
                            r.id === rule.id ? { ...r, similarity_threshold: parseFloat(e.target.value) } : r,
                          ),
                        )
                      }
                      className="w-32"
                    />
                    <span className="font-mono font-bold text-blue-600">{rule.similarity_threshold || 0.7}</span>
                    <button
                      onClick={() => handleUpdateRule(rule.id, rule.is_enabled, rule.similarity_threshold)}
                      className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded font-medium transition"
                    >
                      Save Threshold
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REVIEW & DETAIL MODAL */}
      {selectedDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
            <div className="flex justify-between items-start border-b border-gray-200 dark:border-gray-700 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                    {selectedDraft.draft_code}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 font-semibold text-gray-700 dark:text-gray-300">
                    {selectedDraft.audience_scope}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-bold">
                    {selectedDraft.status}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">{selectedDraft.title}</h3>
                <p className="text-xs text-gray-500">
                  Source: {selectedDraft.source_entity_type} {selectedDraft.source_entity_code || ''} (ID: {selectedDraft.source_entity_id})
                </p>
              </div>
              <button
                onClick={() => setSelectedDraft(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Content Preview & Editor */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Draft Content Payload</span>
                <span className="text-xs text-gray-500">Editable before human approval</span>
              </div>

              {/* DRAFT SUBTASKS VIEWER */}
              {selectedDraft.draft_type === 'DRAFT_SUBTASKS' && editableContent?.subtasks && (
                <div className="space-y-2.5">
                  {editableContent.subtasks.map((st: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-between gap-3 text-sm"
                    >
                      <input
                        type="text"
                        value={st.title}
                        onChange={(e) => {
                          const updated = [...editableContent.subtasks];
                          updated[idx].title = e.target.value;
                          setEditableContent({ ...editableContent, subtasks: updated });
                        }}
                        className="flex-1 bg-transparent border-none text-gray-900 dark:text-gray-100 font-medium focus:outline-none"
                      />
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <input
                          type="number"
                          value={st.estimated_hours}
                          onChange={(e) => {
                            const updated = [...editableContent.subtasks];
                            updated[idx].estimated_hours = Number(e.target.value);
                            setEditableContent({ ...editableContent, subtasks: updated });
                          }}
                          className="w-16 px-1.5 py-1 text-right bg-white dark:bg-gray-800 border rounded"
                        />
                        <span>hrs</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* DRAFT ACCEPTANCE CRITERIA VIEWER */}
              {selectedDraft.draft_type === 'DRAFT_ACCEPTANCE_CRITERIA' && editableContent?.criteria && (
                <div className="space-y-3">
                  {editableContent.criteria.map((crit: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg space-y-1.5 text-xs"
                    >
                      <div className="font-mono font-bold text-blue-600">{crit.criterion_code}</div>
                      <div>
                        <span className="font-semibold text-gray-600 dark:text-gray-400">Given:</span>{' '}
                        <input
                          type="text"
                          value={crit.given_condition}
                          onChange={(e) => {
                            const updated = [...editableContent.criteria];
                            updated[idx].given_condition = e.target.value;
                            setEditableContent({ ...editableContent, criteria: updated });
                          }}
                          className="w-full mt-0.5 bg-white dark:bg-gray-800 p-1.5 border rounded"
                        />
                      </div>
                      <div>
                        <span className="font-semibold text-gray-600 dark:text-gray-400">When:</span>{' '}
                        <input
                          type="text"
                          value={crit.when_action}
                          onChange={(e) => {
                            const updated = [...editableContent.criteria];
                            updated[idx].when_action = e.target.value;
                            setEditableContent({ ...editableContent, criteria: updated });
                          }}
                          className="w-full mt-0.5 bg-white dark:bg-gray-800 p-1.5 border rounded"
                        />
                      </div>
                      <div>
                        <span className="font-semibold text-gray-600 dark:text-gray-400">Then:</span>{' '}
                        <input
                          type="text"
                          value={crit.then_expected}
                          onChange={(e) => {
                            const updated = [...editableContent.criteria];
                            updated[idx].then_expected = e.target.value;
                            setEditableContent({ ...editableContent, criteria: updated });
                          }}
                          className="w-full mt-0.5 bg-white dark:bg-gray-800 p-1.5 border rounded"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* DRAFT RELEASE NOTES VIEWER */}
              {selectedDraft.draft_type === 'DRAFT_RELEASE_NOTES' && editableContent && (
                <div className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3 text-xs">
                  <div>
                    <span className="font-bold text-gray-700 dark:text-gray-300">Highlights:</span>
                    <p className="mt-1 text-gray-800 dark:text-gray-200">{editableContent.highlights}</p>
                  </div>
                  <div>
                    <span className="font-bold text-emerald-600">Features Included:</span>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      {editableContent.features?.map((f: string, i: number) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span className="font-bold text-rose-600">Bug Fixes Resolved:</span>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      {editableContent.bug_fixes?.map((b: string, i: number) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* GENERIC JSON FALLBACK FOR GAP / DUPLICATE */}
              {selectedDraft.draft_type !== 'DRAFT_SUBTASKS' &&
                selectedDraft.draft_type !== 'DRAFT_ACCEPTANCE_CRITERIA' &&
                selectedDraft.draft_type !== 'DRAFT_RELEASE_NOTES' && (
                  <pre className="p-3 bg-gray-50 dark:bg-gray-900 border rounded-lg text-xs font-mono overflow-x-auto max-h-48">
                    {JSON.stringify(editableContent, null, 2)}
                  </pre>
                )}
            </div>

            {/* Review Notes */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Lead Review Notes & Decision Rationale
              </label>
              <textarea
                rows={2}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="e.g., Reviewed with Tech Lead; approved work breakdown structure."
                className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Apply To Source Entity Option */}
            {(selectedDraft.draft_type === 'DRAFT_SUBTASKS' ||
              selectedDraft.draft_type === 'DRAFT_ACCEPTANCE_CRITERIA') && (
              <label className="flex items-center gap-2.5 text-xs font-semibold text-gray-800 dark:text-gray-200 cursor-pointer p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg">
                <input
                  type="checkbox"
                  checked={applyToSource}
                  onChange={(e) => setApplyToSource(e.target.checked)}
                  className="rounded text-blue-600 w-4 h-4"
                />
                <span>
                  Automatically instantiate accepted items into live database records (e.g. child tasks or criteria)
                </span>
              </label>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleReviewAction('REJECTED')}
                  disabled={loading}
                  className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 rounded-lg transition"
                >
                  Reject Draft
                </button>
                <button
                  onClick={() => handleReviewAction('DISCARDED')}
                  disabled={loading}
                  className="px-3.5 py-2 text-xs font-semibold text-gray-600 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-lg transition"
                >
                  Discard
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleReviewAction('ACCEPTED')}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition"
                >
                  <Check className="w-3.5 h-3.5" />
                  Accept & Complete Review
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default DraftingWorkspace;
