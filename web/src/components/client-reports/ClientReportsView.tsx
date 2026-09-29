import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ChevronRight,
  X,
  History,
  Send,
  Eye,
  Copy,
  Check,
  Building,
  Target,
  Clock,
  Layers,
  Calendar,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Download,
  Share2,
} from 'lucide-react';
import {
  clientReportsApi,
  projectsApi,
  productsApi,
  mastersApi,
} from '../../api/endpoints';
import {
  ClientProgressReport,
  ClientProgressReportRevision,
  ClientActionItem,
  MilestoneForecast,
  SanitizedRisk,
  CommercialSummary,
  Project,
  Product,
  ReportOverallHealth,
  ReportStatus,
  ReportAudienceScope,
} from '../../types';

export const ClientReportsView: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<ClientProgressReport[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Filters
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [healthFilter, setHealthFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected report detail
  const [selectedReport, setSelectedReport] = useState<ClientProgressReport | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishReason, setPublishReason] = useState('');
  const [publishAudience, setPublishAudience] = useState<ReportAudienceScope>('CLIENT_ALL');
  const [showDigestModal, setShowDigestModal] = useState(false);
  const [digestContent, setDigestContent] = useState('');
  const [digestCopied, setDigestCopied] = useState(false);

  // Form State for Create / Edit
  const [formData, setFormData] = useState<{
    projectId: string;
    productId: string;
    title: string;
    periodStartDate: string;
    periodEndDate: string;
    overallHealth: ReportOverallHealth;
    healthNarrative: string;
    executiveSummary: string;
    deliveredWorkSummary: string;
    nextStepsSummary: string;
    decisionsNeededSummary: string;
    clientActionItems: ClientActionItem[];
    milestoneForecasts: MilestoneForecast[];
    sanitizedRisks: SanitizedRisk[];
    includeCommercials: boolean;
    commercialSummary: CommercialSummary;
    audienceScope: ReportAudienceScope;
    internalNotes: string;
  }>({
    projectId: '',
    productId: '',
    title: '',
    periodStartDate: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
    periodEndDate: new Date().toISOString().split('T')[0],
    overallHealth: 'ON_TRACK',
    healthNarrative: '',
    executiveSummary: '',
    deliveredWorkSummary: '',
    nextStepsSummary: '',
    decisionsNeededSummary: '',
    clientActionItems: [],
    milestoneForecasts: [],
    sanitizedRisks: [],
    includeCommercials: false,
    commercialSummary: {
      currency: 'USD',
      contractValue: 0,
      approvedCrValue: 0,
      invoicedToDate: 0,
      currentMilestoneBilled: 0,
    },
    audienceScope: 'CLIENT_ALL',
    internalNotes: '',
  });

  useEffect(() => {
    loadReports();
    loadPrerequisites();
  }, [selectedProjectId, selectedProductId, statusFilter, healthFilter]);

  const loadPrerequisites = async () => {
    try {
      const [projRes, prodRes] = await Promise.all([
        projectsApi.getProjects(),
        productsApi.getProducts(),
      ]);
      setProjects(projRes.data || []);
      setProducts(prodRes.data || []);
    } catch (err) {
      console.error('Failed to load prerequisites', err);
    }
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      const res = await clientReportsApi.getAll({
        projectId: selectedProjectId || undefined,
        productId: selectedProductId || undefined,
        reportStatus: statusFilter || undefined,
        overallHealth: healthFilter || undefined,
      });
      setReports(res.data.data || []);
      if (res.data.data?.length > 0 && !selectedReport) {
        handleOpenDetail(res.data.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load client reports', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = async (id: string) => {
    try {
      const res = await clientReportsApi.getById(id);
      setSelectedReport(res.data);
    } catch (err) {
      console.error('Failed to load report detail', err);
    }
  };

  const handleOpenCreate = () => {
    setEditingReportId(null);
    setFormData({
      projectId: selectedProjectId || (projects[0]?.id || ''),
      productId: selectedProductId || '',
      title: 'Weekly Progress & Delivery Status',
      periodStartDate: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
      periodEndDate: new Date().toISOString().split('T')[0],
      overallHealth: 'ON_TRACK',
      healthNarrative: 'All key deliverables are tracking to the agreed schedule and milestone dates.',
      executiveSummary: '',
      deliveredWorkSummary: '',
      nextStepsSummary: '',
      decisionsNeededSummary: '',
      clientActionItems: [
        { title: 'Provide final confirmation on UAT environment credentials', owner: 'Client Lead', dueDate: '', status: 'PENDING' },
      ],
      milestoneForecasts: [
        { milestoneName: 'Milestone 1 - Core MVP', committedDate: '', indicativeForecastDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0], status: 'On Track' },
      ],
      sanitizedRisks: [],
      includeCommercials: false,
      commercialSummary: {
        currency: 'USD',
        contractValue: 0,
        approvedCrValue: 0,
        invoicedToDate: 0,
        currentMilestoneBilled: 0,
      },
      audienceScope: 'CLIENT_ALL',
      internalNotes: '',
    });
    setShowCreateModal(true);
  };

  const handleOpenEdit = (report: ClientProgressReport) => {
    setEditingReportId(report.id);
    setFormData({
      projectId: report.project_id || '',
      productId: report.product_id || '',
      title: report.title,
      periodStartDate: report.period_start_date?.split('T')[0] || '',
      periodEndDate: report.period_end_date?.split('T')[0] || '',
      overallHealth: report.overall_health,
      healthNarrative: report.health_narrative || '',
      executiveSummary: report.executive_summary,
      deliveredWorkSummary: report.delivered_work_summary || '',
      nextStepsSummary: report.next_steps_summary || '',
      decisionsNeededSummary: report.decisions_needed_summary || '',
      clientActionItems: report.client_action_items || [],
      milestoneForecasts: report.milestone_forecasts || [],
      sanitizedRisks: report.sanitized_risks || [],
      includeCommercials: report.include_commercials || false,
      commercialSummary: report.commercial_summary || {
        currency: 'USD',
        contractValue: 0,
        approvedCrValue: 0,
        invoicedToDate: 0,
        currentMilestoneBilled: 0,
      },
      audienceScope: report.audience_scope,
      internalNotes: report.internal_notes || '',
    });
    setShowCreateModal(true);
  };

  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingReportId) {
        await clientReportsApi.update(editingReportId, formData);
        alert('Progress report updated successfully');
      } else {
        const res = await clientReportsApi.create(formData);
        alert(`Report ${res.data.report_code} created as Draft`);
        setSelectedReport(res.data);
      }
      setShowCreateModal(false);
      loadReports();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save progress report');
    }
  };

  const handleSubmitForReview = async () => {
    if (!selectedReport) return;
    try {
      const res = await clientReportsApi.submitForReview(selectedReport.id);
      setSelectedReport(res.data);
      loadReports();
      alert(`Report ${res.data.report_code} is now Under Review`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit report for review');
    }
  };

  const handlePublishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;
    try {
      const res = await clientReportsApi.publish(selectedReport.id, {
        revisionReason: publishReason,
        audienceScope: publishAudience,
      });
      setSelectedReport(res.data);
      setShowPublishModal(false);
      setPublishReason('');
      loadReports();
      alert(`Report ${res.data.report_code} published (Rev ${res.data.current_revision})`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to publish report');
    }
  };

  const handleArchiveReport = async () => {
    if (!selectedReport || !confirm('Are you sure you want to archive this progress report?')) return;
    try {
      const res = await clientReportsApi.archive(selectedReport.id);
      setSelectedReport(res.data);
      loadReports();
      alert(`Report ${res.data.report_code} has been archived`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to archive report');
    }
  };

  const handleOpenDigest = async (reportId: string) => {
    try {
      const res = await clientReportsApi.getDigest(reportId);
      setDigestContent(res.data.digest);
      setDigestCopied(false);
      setShowDigestModal(true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to generate digest');
    }
  };

  const handleCopyDigest = () => {
    navigator.clipboard.writeText(digestContent);
    setDigestCopied(true);
    setTimeout(() => setDigestCopied(false), 2500);
  };

  // KPI Calculations
  const totalReports = reports.length;
  const onTrackCount = reports.filter((r) => r.overall_health === 'ON_TRACK').length;
  const needsAttentionCount = reports.filter((r) => r.overall_health === 'NEEDS_ATTENTION').length;
  const atRiskCount = reports.filter((r) => r.overall_health === 'AT_RISK').length;
  const publishedCount = reports.filter((r) => r.report_status === 'PUBLISHED').length;

  const filteredReports = reports.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.report_code.toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q) ||
      r.project_name?.toLowerCase().includes(q) ||
      r.product_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-emerald-800 to-indigo-900 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold backdrop-blur-xs mb-2">
              <FileText className="w-3.5 h-3.5" />
              Client Communication & Delivery Governance (CLIENT-006)
            </div>
            <h1 className="text-2xl font-bold">Client Progress Updates & Periodic Reporting</h1>
            <p className="text-sm text-teal-100 mt-1">
              Prepare PM-reviewed client-safe updates, track milestone forecasts, communicate pending client actions, and ensure zero internal note leakage.
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-teal-900 hover:bg-teal-50 font-bold rounded-xl text-sm shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            Create Progress Report
          </button>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 border-t border-white/20 pt-4">
          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs">
            <span className="text-[11px] text-teal-200 block">Total Reports</span>
            <span className="text-xl font-bold">{totalReports}</span>
          </div>
          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs">
            <span className="text-[11px] text-teal-200 block">🟢 On Track</span>
            <span className="text-xl font-bold text-emerald-300">{onTrackCount}</span>
          </div>
          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs">
            <span className="text-[11px] text-teal-200 block">🟡 Needs Attention</span>
            <span className="text-xl font-bold text-amber-300">{needsAttentionCount}</span>
          </div>
          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs">
            <span className="text-[11px] text-teal-200 block">🔴 At Risk</span>
            <span className="text-xl font-bold text-rose-300">{atRiskCount}</span>
          </div>
          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs">
            <span className="text-[11px] text-teal-200 block">Published to Clients</span>
            <span className="text-xl font-bold text-white">{publishedCount}</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search reports by code, title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>

          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.project_name} ({p.project_code})</option>
            ))}
          </select>

          <select
            value={healthFilter}
            onChange={(e) => setHealthFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
          >
            <option value="">All Health Statuses</option>
            <option value="ON_TRACK">On Track</option>
            <option value="NEEDS_ATTENTION">Needs Attention</option>
            <option value="AT_RISK">At Risk</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
          >
            <option value="">All Report Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Master List on Left, Detail Workspace on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[650px]">
        {/* Left Column: Reports List */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3 overflow-y-auto max-h-[800px]">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Progress Reports ({filteredReports.length})</span>
            <span className="text-[10px] text-teal-600 font-mono">CLIENT-006</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading progress reports...</div>
          ) : filteredReports.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs space-y-2">
              <FileText className="w-8 h-8 mx-auto text-slate-300" />
              <p>No progress reports match the current filters.</p>
            </div>
          ) : (
            filteredReports.map((r) => {
              const isSelected = selectedReport?.id === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => handleOpenDetail(r.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition text-xs space-y-2.5 ${
                    isSelected
                      ? 'border-teal-600 bg-teal-50/50 dark:bg-teal-950/30 ring-1 ring-teal-600'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-teal-700 dark:text-teal-400">
                      {r.report_code}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          r.overall_health === 'ON_TRACK'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.overall_health === 'NEEDS_ATTENTION'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {r.overall_health.replace('_', ' ')}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          r.report_status === 'PUBLISHED'
                            ? 'bg-blue-100 text-blue-800'
                            : r.report_status === 'UNDER_REVIEW'
                            ? 'bg-purple-100 text-purple-800'
                            : r.report_status === 'ARCHIVED'
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {r.report_status}
                      </span>
                    </div>
                  </div>

                  <div className="font-bold text-slate-900 dark:text-white line-clamp-1">
                    {r.title}
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>{r.project_name || r.product_name || 'Organization'}</span>
                    <span className="font-semibold text-slate-600 dark:text-slate-400">
                      Rev {r.current_revision}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <Calendar className="w-3 h-3 shrink-0" />
                    <span>
                      {r.period_start_date?.split('T')[0]} &rarr; {r.period_end_date?.split('T')[0]}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Detailed Report Workspace */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 overflow-y-auto max-h-[800px]">
          {selectedReport ? (
            <div className="space-y-6">
              {/* Report Header Bar */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-teal-700 dark:text-teal-400">
                      {selectedReport.report_code}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded">
                      Revision {selectedReport.current_revision}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs font-bold rounded ${
                        selectedReport.overall_health === 'ON_TRACK'
                          ? 'bg-emerald-100 text-emerald-800'
                          : selectedReport.overall_health === 'NEEDS_ATTENTION'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {selectedReport.overall_health.replace('_', ' ')}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs font-bold rounded ${
                        selectedReport.report_status === 'PUBLISHED'
                          ? 'bg-blue-100 text-blue-800'
                          : selectedReport.report_status === 'UNDER_REVIEW'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {selectedReport.report_status}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1.5">
                    {selectedReport.title}
                  </h2>
                  <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    <span>Scope: <strong>{selectedReport.project_name || selectedReport.product_name}</strong></span>
                    <span>Period: <strong>{selectedReport.period_start_date?.split('T')[0]} to {selectedReport.period_end_date?.split('T')[0]}</strong></span>
                    <span>Audience: <strong>{selectedReport.audience_scope}</strong></span>
                  </div>
                </div>

                {/* PM Action Bar */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleOpenDigest(selectedReport.id)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-lg inline-flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Digest Summary
                  </button>

                  {selectedReport.report_status === 'DRAFT' && (
                    <>
                      <button
                        onClick={() => handleOpenEdit(selectedReport)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                      >
                        Edit
                      </button>
                      <button
                        onClick={handleSubmitForReview}
                        className="px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200"
                      >
                        Submit for Review
                      </button>
                    </>
                  )}

                  {['DRAFT', 'UNDER_REVIEW', 'PUBLISHED'].includes(selectedReport.report_status) && (
                    <button
                      onClick={() => {
                        setPublishAudience(selectedReport.audience_scope);
                        setShowPublishModal(true);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs inline-flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {selectedReport.report_status === 'PUBLISHED' ? 'Publish Revision' : 'Publish Report'}
                    </button>
                  )}

                  {selectedReport.report_status !== 'ARCHIVED' && (
                    <button
                      onClick={handleArchiveReport}
                      className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-600"
                    >
                      Archive
                    </button>
                  )}
                </div>
              </div>

              {/* Executive Summary & Health Narrative Card */}
              <div
                className={`p-4 rounded-xl border text-xs space-y-2 ${
                  selectedReport.overall_health === 'ON_TRACK'
                    ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800'
                    : selectedReport.overall_health === 'NEEDS_ATTENTION'
                    ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800'
                    : 'bg-rose-50/50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-800'
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span className="text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                    Executive Summary & Project Health
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Health: {selectedReport.overall_health.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                  {selectedReport.executive_summary}
                </p>
                {selectedReport.health_narrative && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 italic text-slate-600 dark:text-slate-400">
                    <strong>Health Narrative:</strong> {selectedReport.health_narrative}
                  </div>
                )}
              </div>

              {/* Delivered Work & Next Steps Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Delivered Work (This Period)
                  </h3>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {selectedReport.delivered_work_summary || 'No delivered items summarized.'}
                  </p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    Planned Next Steps (Upcoming)
                  </h3>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {selectedReport.next_steps_summary || 'No next steps outlined.'}
                  </p>
                </div>
              </div>

              {/* Pending Client Actions / Decisions Needed */}
              {selectedReport.decisions_needed_summary && (
                <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl text-xs space-y-1.5">
                  <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Key Decisions Needed / Client Actions
                  </div>
                  <p className="text-amber-800 dark:text-amber-300 whitespace-pre-wrap">
                    {selectedReport.decisions_needed_summary}
                  </p>
                </div>
              )}

              {/* Milestone Forecasts Table (Committed vs Indicative) */}
              <div className="space-y-2">
                <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-teal-600" />
                  Milestone Schedule Forecast (Committed vs Indicative)
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 border-b text-slate-500 font-semibold">
                      <tr>
                        <th className="p-3">Milestone Name</th>
                        <th className="p-3">Baseline Committed</th>
                        <th className="p-3">Indicative Forecast</th>
                        <th className="p-3">Status / Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {selectedReport.milestone_forecasts && selectedReport.milestone_forecasts.length > 0 ? (
                        selectedReport.milestone_forecasts.map((m, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                            <td className="p-3 font-semibold text-slate-900 dark:text-white">
                              {m.milestoneName}
                            </td>
                            <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                              {m.committedDate || 'Uncommitted'}
                            </td>
                            <td className="p-3 font-mono font-bold text-teal-700 dark:text-teal-400">
                              {m.indicativeForecastDate}
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-400">
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-medium mr-2">
                                {m.status || 'Active'}
                              </span>
                              {m.remarks}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-slate-400 italic">
                            No milestone forecasts attached to this report.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Client Action Items Checklist */}
              {selectedReport.client_action_items && selectedReport.client_action_items.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-purple-600" />
                    Action Items Awaiting Client Response ({selectedReport.client_action_items.length})
                  </h3>
                  <div className="space-y-1.5">
                    {selectedReport.client_action_items.map((act, i) => (
                      <div
                        key={i}
                        className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white">{act.title}</span>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Assigned Owner: <strong>{act.owner || 'Client Team'}</strong>
                            {act.dueDate && <span> &bull; Due: {act.dueDate}</span>}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-purple-100 text-purple-800">
                          {act.status || 'PENDING'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Commercial Summary (Only if Enabled) */}
              {selectedReport.include_commercials && selectedReport.commercial_summary && (
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-slate-900 dark:text-white flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      Agreed Commercial Summary (Approvers Only)
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Currency: {selectedReport.commercial_summary.currency || 'USD'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Contract Value:</span>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {selectedReport.commercial_summary.contractValue?.toLocaleString() || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Approved CRs:</span>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        +{selectedReport.commercial_summary.approvedCrValue?.toLocaleString() || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Invoiced to Date:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {selectedReport.commercial_summary.invoicedToDate?.toLocaleString() || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Milestone Billed:</span>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {selectedReport.commercial_summary.currentMilestoneBilled?.toLocaleString() || 0}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Internal Notes Card (STRICTLY REDACTED in Client Portal) */}
              <div className="p-4 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-xl text-xs space-y-1.5">
                <div className="font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  Internal PM Commentary & Team Deliberations (STRICTLY REDACTED from Client Portal)
                </div>
                <p className="text-rose-800 dark:text-rose-300 whitespace-pre-wrap">
                  {selectedReport.internal_notes || 'No internal team notes recorded.'}
                </p>
              </div>

              {/* Revision History */}
              {selectedReport.revisions && selectedReport.revisions.length > 0 && (
                <div className="pt-4 border-t space-y-3">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                    <History className="w-4 h-4 text-teal-600" />
                    Published Revision Audit Trail ({selectedReport.revisions.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedReport.revisions.map((rev) => (
                      <div
                        key={rev.id}
                        className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-900/40 text-xs flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            Revision {rev.revision_number} &bull; {rev.revision_reason || 'Published update'}
                          </span>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Published by {rev.published_by_name || 'Project Manager'} &bull; {new Date(rev.published_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-16 text-center text-slate-400 text-xs">
              Select a progress report on the left or create a new periodic report.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create / Edit Report */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {editingReportId ? 'Edit Draft Progress Report' : 'Prepare Client Progress Report'}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveReport} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Target Project *</label>
                  <select
                    required
                    value={formData.projectId}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-lg"
                  >
                    <option value="">Select Project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.project_name} ({p.project_code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Report Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Sprint 24 Milestone Progress & Delivery Status"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Period Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.periodStartDate}
                    onChange={(e) => setFormData({ ...formData, periodStartDate: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Period End Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.periodEndDate}
                    onChange={(e) => setFormData({ ...formData, periodEndDate: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Overall Project Health *</label>
                  <select
                    value={formData.overallHealth}
                    onChange={(e) => setFormData({ ...formData, overallHealth: e.target.value as ReportOverallHealth })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-lg font-bold"
                  >
                    <option value="ON_TRACK">🟢 On Track</option>
                    <option value="NEEDS_ATTENTION">🟡 Needs Attention</option>
                    <option value="AT_RISK">🔴 At Risk</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Executive Summary *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Key accomplishments and high-level health message for client stakeholders..."
                  value={formData.executiveSummary}
                  onChange={(e) => setFormData({ ...formData, executiveSummary: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Delivered Work Summary</label>
                  <textarea
                    rows={3}
                    placeholder="Specific modules, features, or bugfixes completed this period..."
                    value={formData.deliveredWorkSummary}
                    onChange={(e) => setFormData({ ...formData, deliveredWorkSummary: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Planned Next Steps</label>
                  <textarea
                    rows={3}
                    placeholder="Focus items and development goals for next reporting cycle..."
                    value={formData.nextStepsSummary}
                    onChange={(e) => setFormData({ ...formData, nextStepsSummary: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Decisions Needed / Client Actions Summary</label>
                <textarea
                  rows={2}
                  placeholder="Dependencies on client (approvals, API keys, credentials, UAT sign-offs)..."
                  value={formData.decisionsNeededSummary}
                  onChange={(e) => setFormData({ ...formData, decisionsNeededSummary: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-lg"
                />
              </div>

              {/* Commercial Summary Toggle */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Include Agreed Commercials in Report</span>
                  <input
                    type="checkbox"
                    checked={formData.includeCommercials}
                    onChange={(e) => setFormData({ ...formData, includeCommercials: e.target.checked })}
                    className="w-4 h-4 rounded text-teal-600"
                  />
                </div>
                {formData.includeCommercials && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t">
                    <div>
                      <label className="text-[10px] text-slate-500">Contract Value</label>
                      <input
                        type="number"
                        value={formData.commercialSummary.contractValue}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            commercialSummary: { ...formData.commercialSummary, contractValue: Number(e.target.value) },
                          })
                        }
                        className="w-full p-1.5 bg-white dark:bg-slate-800 border rounded"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500">Approved CRs</label>
                      <input
                        type="number"
                        value={formData.commercialSummary.approvedCrValue}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            commercialSummary: { ...formData.commercialSummary, approvedCrValue: Number(e.target.value) },
                          })
                        }
                        className="w-full p-1.5 bg-white dark:bg-slate-800 border rounded"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500">Invoiced to Date</label>
                      <input
                        type="number"
                        value={formData.commercialSummary.invoicedToDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            commercialSummary: { ...formData.commercialSummary, invoicedToDate: Number(e.target.value) },
                          })
                        }
                        className="w-full p-1.5 bg-white dark:bg-slate-800 border rounded"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500">Milestone Billed</label>
                      <input
                        type="number"
                        value={formData.commercialSummary.currentMilestoneBilled}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            commercialSummary: { ...formData.commercialSummary, currentMilestoneBilled: Number(e.target.value) },
                          })
                        }
                        className="w-full p-1.5 bg-white dark:bg-slate-800 border rounded"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Internal Commentary (Strictly Redacted) */}
              <div>
                <label className="block font-semibold mb-1 text-rose-700 dark:text-rose-400">
                  Internal Notes & Commentary (Zero-Leakage: Never Exposed to Client)
                </label>
                <textarea
                  rows={2}
                  placeholder="Confidential PM notes, developer allocations, blockers, internal margins..."
                  value={formData.internalNotes}
                  onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
                  className="w-full p-2 bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg"
                >
                  {editingReportId ? 'Save Changes' : 'Create Draft Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Publish Report */}
      {showPublishModal && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full border p-6 space-y-4 text-xs">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Publish Progress Report to Customer Portal
            </h3>
            <p className="text-slate-500">
              Report: <strong className="font-mono">{selectedReport.report_code}</strong> (Will publish Revision {selectedReport.report_status === 'PUBLISHED' ? selectedReport.current_revision + 1 : selectedReport.current_revision})
            </p>

            <form onSubmit={handlePublishSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Target Client Audience *</label>
                <select
                  value={publishAudience}
                  onChange={(e) => setPublishAudience(e.target.value as ReportAudienceScope)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-lg"
                >
                  <option value="CLIENT_ALL">All Permitted Client Contacts</option>
                  <option value="CLIENT_APPROVERS_ONLY">Designated Client Approvers Only</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Revision Release Notes / Reason</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe highlights or reason for publishing this progress revision..."
                  value={publishReason}
                  onChange={(e) => setPublishReason(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-lg"
                />
              </div>

              <div className="p-3 bg-teal-50 dark:bg-teal-950/30 rounded-lg text-teal-800 dark:text-teal-200">
                All internal commentary and sensitive cost notes will be automatically stripped before publishing to the customer portal.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowPublishModal(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg"
                >
                  Confirm & Publish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Text Digest Summary */}
      {showDigestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Progress Update Digest (Markdown / Plaintext)
              </h3>
              <button
                onClick={() => setShowDigestModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Formatted clean text suitable for email distribution, stakeholder circulars, or team chat announcements.
            </p>

            <pre className="p-4 bg-slate-900 text-emerald-300 rounded-xl text-xs overflow-x-auto max-h-96 whitespace-pre-wrap font-mono">
              {digestContent}
            </pre>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={handleCopyDigest}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg inline-flex items-center gap-1.5"
              >
                {digestCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {digestCopied ? 'Copied to Clipboard!' : 'Copy Digest'}
              </button>
              <button
                type="button"
                onClick={() => setShowDigestModal(false)}
                className="px-4 py-2 border rounded-lg text-xs"
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
export default ClientReportsView;
