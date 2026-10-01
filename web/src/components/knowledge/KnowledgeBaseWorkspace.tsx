import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  FileText,
  GitCommit,
  Link as LinkIcon,
  Paperclip,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Tag,
  Globe,
  Building,
  Briefcase,
  Eye,
  Edit3,
  Trash2,
  Columns,
  Layers,
  ExternalLink,
  ChevronRight,
  Shield,
  X,
  History,
  Check,
  FileCode,
  SlidersHorizontal,
} from 'lucide-react';
import { knowledgeApi, productsApi, projectsApi } from '../../api/endpoints';
import {
  KnowledgeDocument,
  KnowledgeCategory,
  KnowledgeEntityType,
  KnowledgeAudience,
  KnowledgeDocStatus,
  DecisionOutcome,
  KnowledgeDocumentRevision,
  KnowledgeDocumentLink,
  KnowledgeDocumentAttachment,
  Product,
  Project,
} from '../../types';

export const KnowledgeBaseWorkspace: React.FC = () => {
  // State
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeDocument | null>(null);
  const [activeTab, setActiveTab] = useState<'reader' | 'revisions' | 'links' | 'attachments'>('reader');
  const [loading, setLoading] = useState<boolean>(true);
  const [docLoading, setDocLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedScope, setSelectedScope] = useState<string>('ALL');
  const [selectedAudience, setSelectedAudience] = useState<string>('ALL');
  const [selectedTag, setSelectedTag] = useState<string>('');

  // Dropdown reference lists
  const [products, setProducts] = useState<Product[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  // Revision viewer & diff state
  const [viewRevisionNum, setViewRevisionNum] = useState<number | null>(null);
  const [baseRevNum, setBaseRevNum] = useState<number>(1);
  const [targetRevNum, setTargetRevNum] = useState<number>(1);
  const [diffResult, setDiffResult] = useState<{
    baseRevision: KnowledgeDocumentRevision;
    targetRevision: KnowledgeDocumentRevision;
  } | null>(null);
  const [diffLoading, setDiffLoading] = useState<boolean>(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showRevisionModal, setShowRevisionModal] = useState<boolean>(false);
  const [showLinkModal, setShowLinkModal] = useState<boolean>(false);
  const [showAttachModal, setShowAttachModal] = useState<boolean>(false);

  // Form states
  const [createForm, setCreateForm] = useState({
    title: '',
    category: 'SPECIFICATION' as KnowledgeCategory,
    entityType: 'GLOBAL' as KnowledgeEntityType,
    productId: '',
    projectId: '',
    audience: 'INTERNAL_ONLY' as KnowledgeAudience,
    status: 'APPROVED' as KnowledgeDocStatus,
    decisionOutcome: '' as DecisionOutcome | '',
    tags: '',
    contentMarkdown: '',
    changeSummary: 'Initial document draft',
  });

  const [revisionForm, setRevisionForm] = useState({
    title: '',
    contentMarkdown: '',
    changeSummary: '',
  });

  const [linkForm, setLinkForm] = useState({
    linkedEntityType: 'TASK' as 'TASK' | 'VERSION' | 'MILESTONE' | 'REQUIREMENT_CRITERION' | 'CHANGE_REQUEST',
    linkedEntityId: '',
    linkNotes: '',
  });

  const [attachForm, setAttachForm] = useState({
    fileName: '',
    s3Key: '',
    s3Bucket: 'ks-pmt-documents',
    mimeType: 'application/pdf',
    fileSizeBytes: 1048576,
  });

  // Load initial documents and lookup data
  useEffect(() => {
    fetchDocuments();
    fetchMetadata();
  }, [selectedCategory, selectedScope, selectedAudience, selectedTag]);

  const fetchMetadata = async () => {
    try {
      const [prodRes, projRes] = await Promise.all([
        productsApi.getProducts().catch(() => ({ data: [] })),
        projectsApi.getProjects().catch(() => ({ data: [] })),
      ]);
      setProducts(prodRes.data || []);
      setProjects(projRes.data || []);
    } catch (err) {
      console.error('Failed to load metadata', err);
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (selectedCategory !== 'ALL') params.category = selectedCategory;
      if (selectedScope !== 'ALL') params.entityType = selectedScope;
      if (selectedAudience !== 'ALL') params.audience = selectedAudience;
      if (selectedTag) params.tag = selectedTag;
      if (searchQuery) params.search = searchQuery;

      const res = await knowledgeApi.getDocuments(params);
      const docs = res.data?.data || [];
      setDocuments(docs);
      if (docs.length > 0 && !selectedDocId) {
        setSelectedDocId(docs[0].id);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to fetch knowledge documents');
    } finally {
      setLoading(false);
    }
  };

  // Load single document details when selected
  useEffect(() => {
    if (selectedDocId) {
      loadDocDetails(selectedDocId);
    } else {
      setSelectedDoc(null);
    }
  }, [selectedDocId]);

  const loadDocDetails = async (id: string) => {
    try {
      setDocLoading(true);
      const res = await knowledgeApi.getDocumentById(id);
      const doc = res.data;
      setSelectedDoc(doc);
      setViewRevisionNum(doc.current_version);
      if (doc.revisions && doc.revisions.length >= 2) {
        setBaseRevNum(doc.revisions[doc.revisions.length - 1].revision_number);
        setTargetRevNum(doc.current_version);
      } else {
        setBaseRevNum(doc.current_version);
        setTargetRevNum(doc.current_version);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load document details');
    } finally {
      setDocLoading(false);
    }
  };

  // Fetch diff comparison
  const handleLoadDiff = async () => {
    if (!selectedDocId || baseRevNum === targetRevNum) return;
    try {
      setDiffLoading(true);
      const res = await knowledgeApi.getRevisionDiff(selectedDocId, baseRevNum, targetRevNum);
      setDiffResult(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to compare revisions');
    } finally {
      setDiffLoading(false);
    }
  };

  // Handle Create Document
  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const tagsArray = createForm.tags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);

      const payload: any = {
        title: createForm.title,
        category: createForm.category,
        entityType: createForm.entityType,
        audience: createForm.audience,
        status: createForm.status,
        contentMarkdown: createForm.contentMarkdown,
        changeSummary: createForm.changeSummary,
        tags: tagsArray,
      };

      if (createForm.entityType === 'PRODUCT') payload.productId = createForm.productId;
      if (createForm.entityType === 'PROJECT') payload.projectId = createForm.projectId;
      if (createForm.category === 'ARCHITECTURE_DECISION' && createForm.decisionOutcome) {
        payload.decisionOutcome = createForm.decisionOutcome;
      }

      const res = await knowledgeApi.createDocument(payload);
      setShowCreateModal(false);
      setCreateForm({
        title: '',
        category: 'SPECIFICATION',
        entityType: 'GLOBAL',
        productId: '',
        projectId: '',
        audience: 'INTERNAL_ONLY',
        status: 'APPROVED',
        decisionOutcome: '',
        tags: '',
        contentMarkdown: '',
        changeSummary: 'Initial document draft',
      });
      await fetchDocuments();
      setSelectedDocId(res.data.id);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to create document');
    }
  };

  // Handle Add Revision
  const handleAddRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocId) return;
    try {
      await knowledgeApi.addRevision(selectedDocId, revisionForm);
      setShowRevisionModal(false);
      setRevisionForm({ title: '', contentMarkdown: '', changeSummary: '' });
      await loadDocDetails(selectedDocId);
      await fetchDocuments();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to add revision');
    }
  };

  // Handle Add Work Item Link
  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocId) return;
    try {
      await knowledgeApi.addLink(selectedDocId, linkForm);
      setShowLinkModal(false);
      setLinkForm({ linkedEntityType: 'TASK', linkedEntityId: '', linkNotes: '' });
      await loadDocDetails(selectedDocId);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to link work item');
    }
  };

  // Handle Remove Link
  const handleRemoveLink = async (linkId: string) => {
    if (!selectedDocId || !confirm('Remove link to this work item?')) return;
    try {
      await knowledgeApi.removeLink(selectedDocId, linkId);
      await loadDocDetails(selectedDocId);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to remove link');
    }
  };

  // Handle Add Attachment
  const handleAddAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocId) return;
    try {
      await knowledgeApi.addAttachment(selectedDocId, {
        ...attachForm,
        revisionNumber: selectedDoc?.current_version || 1,
      });
      setShowAttachModal(false);
      setAttachForm({
        fileName: '',
        s3Key: '',
        s3Bucket: 'ks-pmt-documents',
        mimeType: 'application/pdf',
        fileSizeBytes: 1048576,
      });
      await loadDocDetails(selectedDocId);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to attach asset');
    }
  };

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = doc.title.toLowerCase().includes(q);
        const matchesCode = doc.document_code.toLowerCase().includes(q);
        const matchesTag = doc.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesCode && !matchesTag) return false;
      }
      return true;
    });
  }, [documents, searchQuery]);

  // Current view markdown content
  const activeContentMarkdown = useMemo(() => {
    if (!selectedDoc) return '';
    if (viewRevisionNum && selectedDoc.revisions) {
      const match = selectedDoc.revisions.find((r) => r.revision_number === viewRevisionNum);
      if (match) return match.content_markdown;
    }
    return selectedDoc.latest_revision?.content_markdown || '';
  }, [selectedDoc, viewRevisionNum]);

  // Category Pill Styler
  const getCategoryBadge = (cat: KnowledgeCategory) => {
    switch (cat) {
      case 'ARCHITECTURE_DECISION':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800';
      case 'SPECIFICATION':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
      case 'RUNBOOK':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
      case 'POLICY':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
    }
  };

  const getAudienceBadge = (aud: KnowledgeAudience) => {
    switch (aud) {
      case 'INTERNAL_ONLY':
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
      case 'CLIENT_VISIBLE':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
      case 'PRODUCT_COMMUNITY':
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300';
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-slate-50 dark:bg-slate-950">
      {/* Top Header & Metrics Bar */}
      <div className="border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900 shadow-xs shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Knowledge Base & Decision Docs (ADRs)
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Single source of truth for Architecture Decisions, Technical Specs, Runbooks & Traceability
              </p>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 border-r border-slate-200 pr-4 dark:border-slate-800">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                <FileCode className="h-3.5 w-3.5" />
                ADRs: {documents.filter((d) => d.category === 'ARCHITECTURE_DECISION').length}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                <FileText className="h-3.5 w-3.5" />
                Specs: {documents.filter((d) => d.category === 'SPECIFICATION').length}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <Clock className="h-3.5 w-3.5" />
                Runbooks: {documents.filter((d) => d.category === 'RUNBOOK').length}
              </span>
            </div>

            <button
              onClick={() => {
                setCreateForm({
                  title: '',
                  category: 'SPECIFICATION',
                  entityType: 'GLOBAL',
                  productId: products[0]?.id || '',
                  projectId: projects[0]?.id || '',
                  audience: 'INTERNAL_ONLY',
                  status: 'APPROVED',
                  decisionOutcome: '',
                  tags: '',
                  contentMarkdown: '# Overview\n\nProvide technical details here...',
                  changeSummary: 'Initial document draft',
                });
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-blue-500 transition-colors focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
            >
              <Plus className="h-4 w-4" />
              New Document
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
          <div className="relative min-w-[220px] flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by code, title, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/60 dark:text-white"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="ALL">All Categories</option>
            <option value="SPECIFICATION">Specifications</option>
            <option value="ARCHITECTURE_DECISION">Architecture Decisions (ADRs)</option>
            <option value="RUNBOOK">Runbooks</option>
            <option value="MEETING_NOTES">Meeting Notes</option>
            <option value="RELEASE_NOTES">Release Notes</option>
            <option value="USER_GUIDE">User Guides</option>
            <option value="POLICY">Policies</option>
          </select>

          {/* Scope Filter */}
          <select
            value={selectedScope}
            onChange={(e) => setSelectedScope(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="ALL">All Scopes</option>
            <option value="GLOBAL">Global Architecture</option>
            <option value="PRODUCT">Product Scoped</option>
            <option value="PROJECT">Project Scoped</option>
          </select>

          {/* Audience Filter */}
          <select
            value={selectedAudience}
            onChange={(e) => setSelectedAudience(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="ALL">All Audiences</option>
            <option value="INTERNAL_ONLY">Internal Only</option>
            <option value="CLIENT_VISIBLE">Client Visible</option>
            <option value="PRODUCT_COMMUNITY">Product Community</option>
          </select>

          {selectedTag && (
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-1 text-xs text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
              <Tag className="h-3 w-3" />
              Tag: {selectedTag}
              <button onClick={() => setSelectedTag('')} className="ml-1 hover:text-blue-950">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Main Split Panel Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side: Document List Explorer */}
        <div className="w-80 md:w-96 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 flex flex-col shrink-0">
          <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50 dark:border-slate-800/80 dark:bg-slate-800/30 flex items-center justify-between text-xs text-slate-500">
            <span>Documents ({filteredDocuments.length})</span>
            <span>Sorted by recent updates</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                Loading knowledge documents...
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No documents match the selected filter.
              </div>
            ) : (
              filteredDocuments.map((doc) => {
                const isSelected = doc.id === selectedDocId;
                return (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDocId(doc.id)}
                    className={`w-full text-left p-3.5 transition-colors flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-blue-50/80 border-l-4 border-blue-600 dark:bg-blue-950/40 dark:border-blue-500'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {doc.document_code}
                      </span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${getCategoryBadge(doc.category)}`}>
                        {doc.category.replace('_', ' ')}
                      </span>
                    </div>

                    <h4 className={`text-xs font-semibold line-clamp-2 ${isSelected ? 'text-blue-900 dark:text-blue-200' : 'text-slate-800 dark:text-slate-200'}`}>
                      {doc.title}
                    </h4>

                    {/* Metadata tags */}
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        {doc.entity_type === 'GLOBAL' && <Globe className="h-3 w-3" />}
                        {doc.entity_type === 'PRODUCT' && <Briefcase className="h-3 w-3" />}
                        {doc.entity_type === 'PROJECT' && <Building className="h-3 w-3" />}
                        {doc.entity_type === 'GLOBAL' ? 'Global' : doc.product_name || doc.project_name || doc.entity_type}
                      </span>
                      <span>•</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        v{doc.current_version}
                      </span>
                      {doc.decision_outcome && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-600 font-semibold dark:text-emerald-400">
                            {doc.decision_outcome}
                          </span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Active Document Viewer & Inspector */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
          {docLoading ? (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mr-2" />
              Loading document content...
            </div>
          ) : !selectedDoc ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
              <BookOpen className="h-12 w-12 stroke-[1.5] mb-3 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium">Select a document from the explorer to read or edit</p>
              <p className="text-xs text-slate-400 mt-1">Or create a new architecture decision record, spec, or runbook</p>
            </div>
          ) : (
            <>
              {/* Document Header Bar */}
              <div className="border-b border-slate-200 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/60 shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                        {selectedDoc.document_code}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getCategoryBadge(selectedDoc.category)}`}>
                        {selectedDoc.category.replace('_', ' ')}
                      </span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${getAudienceBadge(selectedDoc.audience)}`}>
                        {selectedDoc.audience.replace('_', ' ')}
                      </span>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        Version {selectedDoc.current_version}
                      </span>
                      {selectedDoc.decision_outcome && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          Outcome: {selectedDoc.decision_outcome}
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {selectedDoc.title}
                    </h2>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setRevisionForm({
                          title: selectedDoc.title,
                          contentMarkdown: activeContentMarkdown,
                          changeSummary: '',
                        });
                        setShowRevisionModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Add Revision
                    </button>
                    <button
                      onClick={() => setShowLinkModal(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <LinkIcon className="h-3.5 w-3.5" />
                      Link Work Item
                    </button>
                    <button
                      onClick={() => setShowAttachModal(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      Add Attachment
                    </button>
                  </div>
                </div>

                {/* Sub-header meta */}
                <div className="mt-2.5 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Owner:</span>{' '}
                    {selectedDoc.owner_name || selectedDoc.owner_email || 'System'}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Scope:</span>{' '}
                    {selectedDoc.entity_type === 'GLOBAL' ? 'Global Architecture' : selectedDoc.product_name || selectedDoc.project_name}
                  </div>
                  {selectedDoc.tags && selectedDoc.tags.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5 text-slate-400" />
                      {selectedDoc.tags.map((t) => (
                        <span
                          key={t}
                          onClick={() => setSelectedTag(t)}
                          className="cursor-pointer rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 hover:bg-blue-100 hover:text-blue-800 dark:bg-slate-800 dark:text-slate-300"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Navigation Tabs */}
                <div className="mt-4 flex items-center gap-6 border-b border-slate-200 dark:border-slate-800 text-xs">
                  <button
                    onClick={() => setActiveTab('reader')}
                    className={`pb-2 font-medium transition-colors border-b-2 ${
                      activeTab === 'reader'
                        ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Document Content
                  </button>
                  <button
                    onClick={() => setActiveTab('revisions')}
                    className={`pb-2 font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
                      activeTab === 'revisions'
                        ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <History className="h-3.5 w-3.5" />
                    Revisions & Diffs ({selectedDoc.revisions?.length || 1})
                  </button>
                  <button
                    onClick={() => setActiveTab('links')}
                    className={`pb-2 font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
                      activeTab === 'links'
                        ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <LinkIcon className="h-3.5 w-3.5" />
                    Work Item Links ({selectedDoc.links?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab('attachments')}
                    className={`pb-2 font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
                      activeTab === 'attachments'
                        ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    Attachments ({selectedDoc.attachments?.length || 0})
                  </button>
                </div>
              </div>

              {/* Tab 1: Document Reader */}
              {activeTab === 'reader' && (
                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                  {/* Revision picker toolbar */}
                  {selectedDoc.revisions && selectedDoc.revisions.length > 1 && (
                    <div className="mb-6 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-800/40 text-xs">
                      <div className="flex items-center gap-2">
                        <History className="h-4 w-4 text-slate-500" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          Viewing Revision:
                        </span>
                        <select
                          value={viewRevisionNum || selectedDoc.current_version}
                          onChange={(e) => setViewRevisionNum(Number(e.target.value))}
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                        >
                          {selectedDoc.revisions.map((r) => (
                            <option key={r.id} value={r.revision_number}>
                              Rev {r.revision_number} - {r.change_summary || 'No summary'} ({new Date(r.created_at).toLocaleDateString()})
                            </option>
                          ))}
                        </select>
                      </div>

                      {viewRevisionNum !== selectedDoc.current_version && (
                        <button
                          onClick={() => setViewRevisionNum(selectedDoc.current_version)}
                          className="text-blue-600 hover:underline dark:text-blue-400 font-medium"
                        >
                          Jump to latest (v{selectedDoc.current_version})
                        </button>
                      )}
                    </div>
                  )}

                  {/* Rendered Markdown Body */}
                  <article className="prose prose-slate dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap font-sans">
                    {activeContentMarkdown || 'No markdown content available for this revision.'}
                  </article>
                </div>
              )}

              {/* Tab 2: Revisions & Diff Inspector */}
              {activeTab === 'revisions' && (
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Diff Comparison Selector */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          Side-by-Side Revision Diff Inspector
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Compare changes between any two recorded revisions of this document
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-slate-500">Base:</span>
                          <select
                            value={baseRevNum}
                            onChange={(e) => setBaseRevNum(Number(e.target.value))}
                            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
                          >
                            {selectedDoc.revisions?.map((r) => (
                              <option key={r.id} value={r.revision_number}>
                                Rev {r.revision_number}
                              </option>
                            ))}
                          </select>
                        </div>

                        <span className="text-slate-400">vs</span>

                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-slate-500">Target:</span>
                          <select
                            value={targetRevNum}
                            onChange={(e) => setTargetRevNum(Number(e.target.value))}
                            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
                          >
                            {selectedDoc.revisions?.map((r) => (
                              <option key={r.id} value={r.revision_number}>
                                Rev {r.revision_number}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          onClick={handleLoadDiff}
                          disabled={baseRevNum === targetRevNum || diffLoading}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                        >
                          {diffLoading ? 'Comparing...' : 'Compare Diffs'}
                        </button>
                      </div>
                    </div>

                    {/* Diff comparison display */}
                    {diffResult && (
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 pt-4 dark:border-slate-700">
                        <div className="rounded-lg border border-rose-200 bg-rose-50/40 p-3 dark:border-rose-900/60 dark:bg-rose-950/20">
                          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-rose-800 dark:text-rose-300">
                            <span>Base (Revision {diffResult.baseRevision.revision_number})</span>
                            <span className="text-[10px] font-normal">
                              {new Date(diffResult.baseRevision.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <pre className="text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap overflow-x-auto max-h-96">
                            {diffResult.baseRevision.content_markdown}
                          </pre>
                        </div>

                        <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                            <span>Target (Revision {diffResult.targetRevision.revision_number})</span>
                            <span className="text-[10px] font-normal">
                              {new Date(diffResult.targetRevision.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <pre className="text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap overflow-x-auto max-h-96">
                            {diffResult.targetRevision.content_markdown}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Revision History Timeline */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                      Revision Log
                    </h4>
                    <div className="space-y-3">
                      {selectedDoc.revisions?.map((rev) => (
                        <div
                          key={rev.id}
                          className="flex items-start gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-bold text-xs shrink-0">
                            v{rev.revision_number}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {rev.title}
                              </h5>
                              <span className="text-[11px] text-slate-400">
                                {new Date(rev.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                              {rev.change_summary || 'No change summary logged.'}
                            </p>
                            <p className="mt-1.5 text-[10px] text-slate-400">
                              Author: {rev.author_name || 'System User'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Work Item Links */}
              {activeTab === 'links' && (
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Linked Delivery Work Items
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Traceability connecting this document to tasks, release versions, milestones, and specs
                      </p>
                    </div>
                    <button
                      onClick={() => setShowLinkModal(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Work Item Link
                    </button>
                  </div>

                  {(!selectedDoc.links || selectedDoc.links.length === 0) ? (
                    <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500 dark:border-slate-800">
                      No work items currently linked to this document. Click "Add Work Item Link" to trace delivery artifacts.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900 shadow-2xs">
                      {selectedDoc.links.map((link) => (
                        <div key={link.id} className="flex items-center justify-between p-4 gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                              {link.linked_entity_type}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                {link.linked_entity_label || link.linked_entity_id}
                              </p>
                              {link.link_notes && (
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {link.link_notes}
                                </p>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => handleRemoveLink(link.id)}
                            className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                            title="Remove Link"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Attachments */}
              {activeTab === 'attachments' && (
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Document S3 Asset Attachments
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Immutable asset records and architecture diagrams hosted in Amazon S3
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAttachModal(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Attachment Record
                    </button>
                  </div>

                  {(!selectedDoc.attachments || selectedDoc.attachments.length === 0) ? (
                    <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500 dark:border-slate-800">
                      No attachments recorded for this document yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedDoc.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                            <Paperclip className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {att.file_name}
                            </p>
                            <p className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                              s3://{att.s3_bucket}/{att.s3_key}
                            </p>
                            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                              <span>
                                {(att.file_size_bytes / 1024).toFixed(1)} KB • Rev {att.revision_number}
                              </span>
                              <span className="font-mono">{att.mime_type}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* Modal 1: Create Document Modal */}
      {/* ======================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                Create Knowledge Document / ADR
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDocument} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ADR 002: Distributed Event Bus Architecture"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category *
                  </label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value as KnowledgeCategory })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="SPECIFICATION">Specification</option>
                    <option value="ARCHITECTURE_DECISION">Architecture Decision (ADR)</option>
                    <option value="RUNBOOK">Runbook</option>
                    <option value="MEETING_NOTES">Meeting Notes</option>
                    <option value="RELEASE_NOTES">Release Notes</option>
                    <option value="USER_GUIDE">User Guide</option>
                    <option value="POLICY">Policy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Scope *
                  </label>
                  <select
                    value={createForm.entityType}
                    onChange={(e) => setCreateForm({ ...createForm, entityType: e.target.value as KnowledgeEntityType })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="GLOBAL">Global Architecture</option>
                    <option value="PRODUCT">Product Scoped</option>
                    <option value="PROJECT">Project Scoped</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Audience *
                  </label>
                  <select
                    value={createForm.audience}
                    onChange={(e) => setCreateForm({ ...createForm, audience: e.target.value as KnowledgeAudience })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="INTERNAL_ONLY">Internal Only</option>
                    <option value="CLIENT_VISIBLE">Client Visible</option>
                    <option value="PRODUCT_COMMUNITY">Product Community</option>
                  </select>
                </div>
              </div>

              {createForm.entityType === 'PRODUCT' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Product *
                  </label>
                  <select
                    required
                    value={createForm.productId}
                    onChange={(e) => setCreateForm({ ...createForm, productId: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">-- Choose Product --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.product_name} ({p.product_code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {createForm.entityType === 'PROJECT' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Project *
                  </label>
                  <select
                    required
                    value={createForm.projectId}
                    onChange={(e) => setCreateForm({ ...createForm, projectId: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">-- Choose Project --</option>
                    {projects.map((pr) => (
                      <option key={pr.id} value={pr.id}>
                        {pr.project_name} ({pr.project_code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {createForm.category === 'ARCHITECTURE_DECISION' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Decision Outcome
                  </label>
                  <select
                    value={createForm.decisionOutcome}
                    onChange={(e) => setCreateForm({ ...createForm, decisionOutcome: e.target.value as DecisionOutcome })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">-- No Decision Yet --</option>
                    <option value="PROPOSED">Proposed</option>
                    <option value="ACCEPTED">Accepted</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="DEPRECATED">Deprecated</option>
                    <option value="SUPERSEDED">Superseded</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. database, redis, architecture, p1"
                  value={createForm.tags}
                  onChange={(e) => setCreateForm({ ...createForm, tags: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Initial Markdown Content *
                </label>
                <textarea
                  rows={8}
                  required
                  value={createForm.contentMarkdown}
                  onChange={(e) => setCreateForm({ ...createForm, contentMarkdown: e.target.value })}
                  className="w-full font-mono text-xs rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Initial Revision Change Summary
                </label>
                <input
                  type="text"
                  value={createForm.changeSummary}
                  onChange={(e) => setCreateForm({ ...createForm, changeSummary: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-500 shadow-sm"
                >
                  Create Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Modal 2: Add Revision Modal */}
      {/* ======================================================== */}
      {showRevisionModal && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-blue-600" />
                Add Document Revision (v{selectedDoc.current_version + 1})
              </h3>
              <button
                onClick={() => setShowRevisionModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddRevision} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Revision Title
                </label>
                <input
                  type="text"
                  value={revisionForm.title}
                  onChange={(e) => setRevisionForm({ ...revisionForm, title: e.target.value })}
                  placeholder={selectedDoc.title}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Change Summary / Changelog Note *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Updated Section 3 with reverse charge tax validation rules"
                  value={revisionForm.changeSummary}
                  onChange={(e) => setRevisionForm({ ...revisionForm, changeSummary: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Markdown Content *
                </label>
                <textarea
                  rows={10}
                  required
                  value={revisionForm.contentMarkdown}
                  onChange={(e) => setRevisionForm({ ...revisionForm, contentMarkdown: e.target.value })}
                  className="w-full font-mono text-xs rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRevisionModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-500 shadow-sm"
                >
                  Publish Revision v{selectedDoc.current_version + 1}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Modal 3: Add Work Item Link Modal */}
      {/* ======================================================== */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-blue-600" />
                Link Work Item
              </h3>
              <button
                onClick={() => setShowLinkModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddLink} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Entity Type *
                </label>
                <select
                  value={linkForm.linkedEntityType}
                  onChange={(e) => setLinkForm({ ...linkForm, linkedEntityType: e.target.value as any })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="TASK">Delivery Task</option>
                  <option value="VERSION">Release Version</option>
                  <option value="MILESTONE">Project Milestone</option>
                  <option value="REQUIREMENT_CRITERION">Requirement Criterion</option>
                  <option value="CHANGE_REQUEST">Change Request</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Entity UUID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 20000000-0000-0000-0000-0000000003ec"
                  value={linkForm.linkedEntityId}
                  onChange={(e) => setLinkForm({ ...linkForm, linkedEntityId: e.target.value })}
                  className="w-full font-mono rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Traceability Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Implementing GST rule engine calculation logic"
                  value={linkForm.linkNotes}
                  onChange={(e) => setLinkForm({ ...linkForm, linkNotes: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-500 shadow-sm"
                >
                  Create Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Modal 4: Add Attachment Modal */}
      {/* ======================================================== */}
      {showAttachModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Paperclip className="h-5 w-5 text-blue-600" />
                Add S3 Attachment Record
              </h3>
              <button
                onClick={() => setShowAttachModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddAttachment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  File Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. system_architecture_diagram.png"
                  value={attachForm.fileName}
                  onChange={(e) => setAttachForm({ ...attachForm, fileName: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  S3 Key Path *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. knowledge/adr-001/architecture_diagram.png"
                  value={attachForm.s3Key}
                  onChange={(e) => setAttachForm({ ...attachForm, s3Key: e.target.value })}
                  className="w-full font-mono rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    MIME Type
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="image/png"
                    value={attachForm.mimeType}
                    onChange={(e) => setAttachForm({ ...attachForm, mimeType: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Size (Bytes)
                  </label>
                  <input
                    type="number"
                    required
                    value={attachForm.fileSizeBytes}
                    onChange={(e) => setAttachForm({ ...attachForm, fileSizeBytes: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAttachModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-500 shadow-sm"
                >
                  Save Attachment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
