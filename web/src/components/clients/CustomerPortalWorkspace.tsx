import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  Bug,
  FileText,
  Send,
  Plus,
  Search,
  MessageSquare,
  Building2,
  FolderGit2,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  ChevronRight,
  User,
  DollarSign,
  History,
  ClipboardCheck,
  ExternalLink,
  Check,
  Copy,
  TrendingUp,
  AlertTriangle,
  Target,
  Lock,
  FileCheck,
  GitMerge,
  ArrowRight,
  ThumbsUp,
  Compass,
  Bookmark,
  Sparkles,
} from 'lucide-react';
import { clientPortalApi } from '../../api/endpoints';
import {
  ClientIntakeRequest,
  ChangeRequest,
  UatPackage,
  UatChecklistItem,
  ClientProgressReport,
  ClientActionRequest,
  RaidItem,
  ClientProductIdea,
  RoadmapBoard,
} from '../../types';

export const CustomerPortalWorkspace: React.FC = () => {
  const [portalContext, setPortalContext] = useState<any>(null);
  const [requests, setRequests] = useState<ClientIntakeRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<
    | 'REQUESTS'
    | 'PROJECTS'
    | 'PRODUCTS'
    | 'REQUIREMENTS'
    | 'CHANGE_REQUESTS'
    | 'UAT_PACKAGES'
    | 'PROGRESS_REPORTS'
    | 'ACTION_REQUESTS'
    | 'DECISIONS'
    | 'COMMUNITY_IDEAS'
    | 'ROADMAP'
  >('REQUESTS');

  // Requirements & Acceptance state (CLIENT-003)
  const [portalRequirements, setPortalRequirements] = useState<any[]>([]);
  const [selectedReqDetail, setSelectedReqDetail] = useState<any | null>(null);
  const [loadingReqs, setLoadingReqs] = useState<boolean>(false);
  const [signoffModal, setSignoffModal] = useState<{
    show: boolean;
    criterion: any | null;
    decision: 'ACCEPTED' | 'REJECTED';
    notes: string;
  }>({
    show: false,
    criterion: null,
    decision: 'ACCEPTED',
    notes: '',
  });

  // Change Requests & Quotations state (CLIENT-004)
  const [portalChangeRequests, setPortalChangeRequests] = useState<ChangeRequest[]>([]);
  const [selectedCrDetail, setSelectedCrDetail] = useState<ChangeRequest | null>(null);
  const [loadingCrs, setLoadingCrs] = useState<boolean>(false);
  const [crDecisionModal, setCrDecisionModal] = useState<{
    show: boolean;
    cr: ChangeRequest | null;
    decision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';
    remarks: string;
  }>({
    show: false,
    cr: null,
    decision: 'APPROVED',
    remarks: '',
  });

  // UAT Packages & Milestone Acceptance state (CLIENT-005)
  const [portalUatPackages, setPortalUatPackages] = useState<UatPackage[]>([]);
  const [selectedUatPkg, setSelectedUatPkg] = useState<UatPackage | null>(null);
  const [loadingUats, setLoadingUats] = useState<boolean>(false);
  const [uatDecisionModal, setUatDecisionModal] = useState<{
    show: boolean;
    pkg: UatPackage | null;
    decision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';
    remarks: string;
  }>({
    show: false,
    pkg: null,
    decision: 'APPROVED',
    remarks: '',
  });
  const [uatItemTestModal, setUatItemTestModal] = useState<{
    show: boolean;
    item: UatChecklistItem | null;
    status: 'PASSED' | 'FAILED';
    feedback: string;
  }>({
    show: false,
    item: null,
    status: 'PASSED',
    feedback: '',
  });

  // Progress Reports state (CLIENT-006)
  const [portalReports, setPortalReports] = useState<ClientProgressReport[]>([]);
  const [selectedPortalReport, setSelectedPortalReport] = useState<ClientProgressReport | null>(null);
  const [loadingReports, setLoadingReports] = useState<boolean>(false);
  const [portalDigestModal, setPortalDigestModal] = useState<{ show: boolean; digest: string }>({ show: false, digest: '' });
  const [portalDigestCopied, setPortalDigestCopied] = useState(false);

  // Client Actions & Decisions state (DEL-001)
  const [portalActions, setPortalActions] = useState<ClientActionRequest[]>([]);
  const [loadingActions, setLoadingActions] = useState<boolean>(false);
  const [portalDecisions, setPortalDecisions] = useState<RaidItem[]>([]);
  const [loadingDecisions, setLoadingDecisions] = useState<boolean>(false);
  const [actionResponseModal, setActionResponseModal] = useState<{
    show: boolean;
    action: ClientActionRequest | null;
    responseText: string;
    decision: 'APPROVED' | 'REJECTED' | 'INFO_PROVIDED' | 'SCOPE_CHANGE_REQUESTED';
  }>({
    show: false,
    action: null,
    responseText: '',
    decision: 'APPROVED',
  });

  // PROD-001: Community Ideas & Voting state
  const [portalIdeas, setPortalIdeas] = useState<ClientProductIdea[]>([]);
  const [selectedIdeaDetail, setSelectedIdeaDetail] = useState<ClientProductIdea | null>(null);
  const [loadingIdeas, setLoadingIdeas] = useState<boolean>(false);
  const [ideaSearchQuery, setIdeaSearchQuery] = useState<string>('');
  const [selectedIdeaProductId, setSelectedIdeaProductId] = useState<string>('');
  const [showIdeaSubmitModal, setShowIdeaSubmitModal] = useState<boolean>(false);
  const [ideaSubmitForm, setIdeaSubmitForm] = useState({
    productId: '',
    title: '',
    customerProblem: '',
    expectedOutcome: '',
  });

  // PROD-001: Customer Roadmap state
  const [portalRoadmap, setPortalRoadmap] = useState<RoadmapBoard>({ now: [], next: [], later: [] });
  const [loadingRoadmap, setLoadingRoadmap] = useState<boolean>(false);

  // Submit Modal
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [submitForm, setSubmitForm] = useState({
    requestType: 'SUPPORT' as 'BUG' | 'SUPPORT' | 'CHANGE_REQUEST',
    title: '',
    description: '',
    clientPriority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    businessImpact: 'OPERATIONS',
    impactBreadth: 'SINGLE_USER',
    projectId: '',
    productId: '',
    environmentDetails: {
      browser: '',
      os: '',
      device: '',
      appVersion: '',
    },
  });

  // Request Detail Modal
  const [selectedRequest, setSelectedRequest] = useState<ClientIntakeRequest | null>(null);
  const [replyMessage, setReplyMessage] = useState<string>('');
  const [sendingReply, setSendingReply] = useState<boolean>(false);

  useEffect(() => {
    loadPortalData();
  }, []);

  const loadPortalData = async () => {
    try {
      setLoading(true);
      const [contextRes, reqRes] = await Promise.all([
        clientPortalApi.getPortalContext(),
        clientPortalApi.getClientRequests(),
      ]);
      setPortalContext(contextRes.data);
      setRequests(reqRes.data || []);
      if (contextRes.data?.permittedProjects?.length > 0) {
        setSubmitForm((prev) => ({
          ...prev,
          projectId: contextRes.data.permittedProjects[0].id,
        }));
      }
    } catch (err) {
      console.error('Failed to load customer portal data', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPortalRequirements = async () => {
    try {
      setLoadingReqs(true);
      const res = await clientPortalApi.getRequirements();
      setPortalRequirements(res.data || []);
    } catch (err) {
      console.error('Failed to load portal requirements', err);
    } finally {
      setLoadingReqs(false);
    }
  };

  const handleOpenReqDetail = async (reqId: string) => {
    try {
      const res = await clientPortalApi.getRequirementDetail(reqId);
      setSelectedReqDetail(res.data);
    } catch (err) {
      console.error('Failed to load requirement details', err);
    }
  };

  const handleSignoffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signoffModal.criterion) return;
    try {
      await clientPortalApi.signoffCriterion(signoffModal.criterion.id, {
        signoffStatus: signoffModal.decision,
        notes: signoffModal.notes,
      });
      alert(`Criterion sign-off recorded as ${signoffModal.decision}`);
      setSignoffModal({ show: false, criterion: null, decision: 'ACCEPTED', notes: '' });
      if (selectedReqDetail) {
        handleOpenReqDetail(selectedReqDetail.id);
      }
      loadPortalRequirements();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record sign-off');
    }
  };

  const loadPortalChangeRequests = async () => {
    try {
      setLoadingCrs(true);
      const res = await clientPortalApi.getChangeRequests();
      setPortalChangeRequests(res.data || []);
    } catch (err) {
      console.error('Failed to load portal change requests', err);
    } finally {
      setLoadingCrs(false);
    }
  };

  const handleOpenCrDetail = async (crId: string) => {
    try {
      const res = await clientPortalApi.getChangeRequestDetail(crId);
      setSelectedCrDetail(res.data);
    } catch (err) {
      console.error('Failed to load change request details', err);
    }
  };

  const handleCrDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crDecisionModal.cr) return;
    try {
      await clientPortalApi.submitChangeRequestDecision(
        crDecisionModal.cr.id,
        crDecisionModal.cr.current_revision,
        {
          decision: crDecisionModal.decision,
          remarks: crDecisionModal.remarks,
        },
      );
      alert(`Decision recorded as ${crDecisionModal.decision} for ${crDecisionModal.cr.cr_number} (Rev ${crDecisionModal.cr.current_revision})`);
      setCrDecisionModal({ show: false, cr: null, decision: 'APPROVED', remarks: '' });
      if (selectedCrDetail) {
        handleOpenCrDetail(selectedCrDetail.id);
      }
      loadPortalChangeRequests();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit decision');
    }
  };

  const loadPortalUatPackages = async () => {
    try {
      setLoadingUats(true);
      const res = await clientPortalApi.getUatPackages();
      setPortalUatPackages(res.data || []);
      if (res.data && res.data.length > 0 && !selectedUatPkg) {
        handleOpenUatDetail(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load portal UAT packages', err);
    } finally {
      setLoadingUats(false);
    }
  };

  const handleOpenUatDetail = async (pkgId: string) => {
    try {
      const res = await clientPortalApi.getUatPackageDetail(pkgId);
      setSelectedUatPkg(res.data);
    } catch (err) {
      console.error('Failed to load UAT package details', err);
    }
  };

  const handleUatDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uatDecisionModal.pkg) return;
    try {
      await clientPortalApi.submitUatDecision(
        uatDecisionModal.pkg.id,
        uatDecisionModal.pkg.current_revision,
        {
          decision: uatDecisionModal.decision,
          remarks: uatDecisionModal.remarks,
        },
      );
      alert(`Milestone / UAT Decision recorded as ${uatDecisionModal.decision} for ${uatDecisionModal.pkg.package_code} (Rev ${uatDecisionModal.pkg.current_revision})`);
      setUatDecisionModal({ show: false, pkg: null, decision: 'APPROVED', remarks: '' });
      if (selectedUatPkg) {
        handleOpenUatDetail(selectedUatPkg.id);
      }
      loadPortalUatPackages();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit UAT decision');
    }
  };

  const handleItemTestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uatItemTestModal.item || !selectedUatPkg) return;
    try {
      await clientPortalApi.testChecklistItem(
        uatItemTestModal.item.id,
        {
          clientStatus: uatItemTestModal.status,
          clientFeedback: uatItemTestModal.feedback,
        },
      );
      alert(`Item test result recorded as ${uatItemTestModal.status}`);
      setUatItemTestModal({ show: false, item: null, status: 'PASSED', feedback: '' });
      handleOpenUatDetail(selectedUatPkg.id);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record test feedback');
    }
  };

  const loadPortalReports = async () => {
    try {
      setLoadingReports(true);
      const res = await clientPortalApi.getProgressReports();
      setPortalReports(res.data || []);
      if (res.data && res.data.length > 0 && !selectedPortalReport) {
        handleOpenPortalReportDetail(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load portal progress reports', err);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleOpenPortalReportDetail = async (reportId: string) => {
    try {
      const res = await clientPortalApi.getProgressReportDetail(reportId);
      setSelectedPortalReport(res.data);
    } catch (err) {
      console.error('Failed to load progress report details', err);
    }
  };

  const handleOpenPortalDigestModal = async (reportId: string) => {
    try {
      const res = await clientPortalApi.getProgressReportDigest(reportId);
      setPortalDigestModal({ show: true, digest: res.data.digest });
      setPortalDigestCopied(false);
    } catch (err) {
      console.error('Failed to load report digest', err);
    }
  };

  const loadPortalActions = async () => {
    try {
      setLoadingActions(true);
      const res = await clientPortalApi.getActionRequests();
      setPortalActions(res.data || []);
    } catch (err) {
      console.error('Failed to load portal actions', err);
    } finally {
      setLoadingActions(false);
    }
  };

  const loadPortalDecisions = async () => {
    try {
      setLoadingDecisions(true);
      const res = await clientPortalApi.getDecisions();
      setPortalDecisions(res.data || []);
    } catch (err) {
      console.error('Failed to load portal decisions', err);
    } finally {
      setLoadingDecisions(false);
    }
  };

  const loadPortalIdeas = async () => {
    try {
      setLoadingIdeas(true);
      const res = await clientPortalApi.getProductIdeas({
        productId: selectedIdeaProductId || undefined,
        search: ideaSearchQuery || undefined,
      });
      setPortalIdeas(res.data || []);
    } catch (err) {
      console.error('Failed to load community ideas', err);
    } finally {
      setLoadingIdeas(false);
    }
  };

  const handleToggleVote = async (ideaId: string) => {
    try {
      const res = await clientPortalApi.toggleProductIdeaVote(ideaId);
      alert(res.message);
      loadPortalIdeas();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to toggle organization vote');
    }
  };

  const handleToggleFollow = async (ideaId: string) => {
    try {
      const res = await clientPortalApi.toggleProductIdeaFollow(ideaId);
      alert(res.message);
      loadPortalIdeas();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to toggle follow');
    }
  };

  const handleClientSubmitIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ideaSubmitForm.productId || !ideaSubmitForm.title || !ideaSubmitForm.customerProblem) {
      alert('Please fill in Product, Title, and Customer Problem');
      return;
    }
    try {
      await clientPortalApi.submitProductIdea(ideaSubmitForm);
      alert('Your improvement proposal has been submitted to the product team for review and triage.');
      setShowIdeaSubmitModal(false);
      setIdeaSubmitForm({
        productId: '',
        title: '',
        customerProblem: '',
        expectedOutcome: '',
      });
      loadPortalIdeas();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit proposal');
    }
  };

  const loadPortalRoadmap = async () => {
    try {
      setLoadingRoadmap(true);
      const res = await clientPortalApi.getRoadmap({
        productId: selectedIdeaProductId || undefined,
      });
      setPortalRoadmap(res.data || { now: [], next: [], later: [] });
    } catch (err) {
      console.error('Failed to load roadmap', err);
    } finally {
      setLoadingRoadmap(false);
    }
  };

  const handleRespondActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionResponseModal.action) return;
    try {
      await clientPortalApi.respondActionRequest(actionResponseModal.action.id, {
        responseText: actionResponseModal.responseText,
        resultingDecision: actionResponseModal.decision,
      });
      alert('Your response and decision have been submitted successfully.');
      setActionResponseModal({ show: false, action: null, responseText: '', decision: 'APPROVED' });
      loadPortalActions();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit response');
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await clientPortalApi.createRequest(submitForm);
      alert('Your request has been received. Our team will review it shortly.');
      setShowSubmitModal(false);
      setSubmitForm({
        requestType: 'SUPPORT',
        title: '',
        description: '',
        clientPriority: 'MEDIUM',
        businessImpact: 'OPERATIONS',
        impactBreadth: 'SINGLE_USER',
        projectId: portalContext?.permittedProjects?.[0]?.id || '',
        productId: '',
        environmentDetails: { browser: '', os: '', device: '', appVersion: '' },
      });
      loadPortalData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit request');
    }
  };

  const handleOpenDetail = async (req: ClientIntakeRequest) => {
    try {
      const res = await clientPortalApi.getClientRequestById(req.id);
      setSelectedRequest(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !replyMessage.trim()) return;
    try {
      setSendingReply(true);
      await clientPortalApi.addClientMessage(selectedRequest.id, {
        message: replyMessage,
      });
      setReplyMessage('');
      const updated = await clientPortalApi.getClientRequestById(selectedRequest.id);
      setSelectedRequest(updated.data);
      loadPortalData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSendingReply(false);
    }
  };

  const getStatusColor = (color?: string) => {
    switch (color) {
      case 'blue':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300';
      case 'amber':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300';
      case 'orange':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300';
      case 'emerald':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
      case 'purple':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300';
      case 'indigo':
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300';
      case 'sky':
        return 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300';
      case 'red':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Portal Branding Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-800 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold backdrop-blur-xs mb-2">
              <Building2 className="w-3.5 h-3.5" />
              {portalContext?.client?.company_name || 'Client Customer Portal'}
            </div>
            <h1 className="text-2xl font-bold">Customer Services & Support Workspace</h1>
            <p className="text-sm text-indigo-100 mt-1">
              Submit support tickets, report bugs, review project milestones, and track delivery progress in real time.
            </p>
          </div>
          <button
            onClick={() => setShowSubmitModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-900 hover:bg-indigo-50 font-bold rounded-xl text-sm shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            Submit New Request
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-3 mt-6 border-t border-white/20 pt-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('REQUESTS')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'REQUESTS' ? 'bg-white text-indigo-900' : 'text-white/80 hover:bg-white/10'
            }`}
          >
            My Requests ({requests.length})
          </button>
          <button
            onClick={() => setActiveTab('PROJECTS')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'PROJECTS' ? 'bg-white text-indigo-900' : 'text-white/80 hover:bg-white/10'
            }`}
          >
            Permitted Projects ({portalContext?.permittedProjects?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('PRODUCTS')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'PRODUCTS' ? 'bg-white text-indigo-900' : 'text-white/80 hover:bg-white/10'
            }`}
          >
            Licensed Products ({portalContext?.licensedProducts?.length || 0})
          </button>
          <button
            onClick={() => {
              setActiveTab('REQUIREMENTS');
              loadPortalRequirements();
            }}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'REQUIREMENTS' ? 'bg-white text-indigo-900' : 'text-white/80 hover:bg-white/10'
            }`}
          >
            Requirements & Acceptance ({portalRequirements.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('CHANGE_REQUESTS');
              loadPortalChangeRequests();
            }}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'CHANGE_REQUESTS' ? 'bg-white text-indigo-900' : 'text-white/80 hover:bg-white/10'
            }`}
          >
            Change Requests & Quotations ({portalChangeRequests.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('UAT_PACKAGES');
              loadPortalUatPackages();
            }}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'UAT_PACKAGES' ? 'bg-white text-indigo-900' : 'text-white/80 hover:bg-white/10'
            }`}
          >
            UAT & Milestone Acceptance ({portalUatPackages.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('PROGRESS_REPORTS');
              loadPortalReports();
            }}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'PROGRESS_REPORTS' ? 'bg-white text-indigo-900' : 'text-white/80 hover:bg-white/10'
            }`}
          >
            Progress Reports ({portalReports.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('ACTION_REQUESTS');
              loadPortalActions();
            }}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'ACTION_REQUESTS' ? 'bg-white text-indigo-900' : 'text-white/80 hover:bg-white/10'
            }`}
          >
            Actions Needed ({portalActions.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('DECISIONS');
              loadPortalDecisions();
            }}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'DECISIONS' ? 'bg-white text-indigo-900' : 'text-white/80 hover:bg-white/10'
            }`}
          >
            Decisions Log ({portalDecisions.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('COMMUNITY_IDEAS');
              loadPortalIdeas();
            }}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'COMMUNITY_IDEAS' ? 'bg-white text-indigo-900' : 'text-white/80 hover:bg-white/10'
            }`}
          >
            Ideas & Voting ({portalIdeas.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('ROADMAP');
              loadPortalRoadmap();
            }}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'ROADMAP' ? 'bg-white text-indigo-900' : 'text-white/80 hover:bg-white/10'
            }`}
          >
            Product Roadmap
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'REQUESTS' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <LifeBuoy className="w-5 h-5 text-indigo-600" />
              Intake & Support Requests
            </h2>
            <span className="text-xs text-slate-500">
              Customer status reflects internal verification and delivery progress
            </span>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {loading ? (
              <div className="p-8 text-center text-slate-400">Loading requests...</div>
            ) : requests.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <LifeBuoy className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="text-sm font-medium">No requests submitted yet.</p>
                <button
                  onClick={() => setShowSubmitModal(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Submit Your First Request
                </button>
              </div>
            ) : (
              requests.map((req) => (
                <div
                  key={req.id}
                  onClick={() => handleOpenDetail(req)}
                  className="p-5 hover:bg-slate-50/80 dark:hover:bg-slate-900/40 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 transition"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {req.request_number}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {req.request_type}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${getStatusColor(
                          req.customerStatusColor,
                        )}`}
                      >
                        {req.customerStatus}
                      </span>
                    </div>

                    <h3 className="font-semibold text-slate-900 dark:text-white text-base">
                      {req.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-1">{req.description}</p>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    {req.project_name && (
                      <span className="flex items-center gap-1">
                        <FolderGit2 className="w-3.5 h-3.5" />
                        {req.project_name}
                      </span>
                    )}
                    <span>{new Date(req.created_at).toLocaleDateString()}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Permitted Projects Tab */}
      {activeTab === 'PROJECTS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {portalContext?.permittedProjects?.map((p: any) => (
            <div
              key={p.id}
              className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                  {p.project_code}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 font-semibold text-slate-700 dark:text-slate-300">
                  {p.project_status}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{p.project_name}</h3>
              <p className="text-xs text-slate-500 line-clamp-2">{p.description || 'Custom client project'}</p>

              <div className="text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700 pt-3 space-y-1">
                <div>Project Manager: {p.project_manager_name || 'Designated PM'}</div>
                {p.project_manager_email && <div>Contact: {p.project_manager_email}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Licensed Products Tab */}
      {activeTab === 'PRODUCTS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {portalContext?.licensedProducts?.map((pr: any) => (
            <div
              key={pr.id}
              className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-purple-600 dark:text-purple-400 font-bold">
                  {pr.product_code}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold">
                  {pr.license_status || 'ACTIVE'}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{pr.product_name}</h3>
              <p className="text-xs text-slate-500">{pr.description}</p>
              <div className="text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700 pt-3 grid grid-cols-2 gap-2">
                <div>Current Version: {pr.current_version || 'Latest'}</div>
                <div>Support Tier: {pr.support_tier || 'Standard'}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Requirements & Acceptance Tab (CLIENT-003) */}
      {activeTab === 'REQUIREMENTS' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                Agreed Requirements & Acceptance Sign-Off
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review baselined project specifications, QA verification evidence, and submit formal client sign-off decisions.
              </p>
            </div>
            {portalContext?.contact?.isApprover && (
              <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Designated Client Approver
              </span>
            )}
          </div>

          {loadingReqs ? (
            <div className="p-12 text-center text-slate-400">Loading requirements...</div>
          ) : portalRequirements.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center border border-slate-200 dark:border-slate-700">
              <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-700 dark:text-slate-300 font-semibold text-sm">No baselined requirements published yet.</p>
              <p className="text-xs text-slate-500 mt-1">Your project manager will publish baselined specifications here for formal review.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {portalRequirements.map((r) => (
                <div
                  key={r.id}
                  onClick={() => handleOpenReqDetail(r.id)}
                  className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-indigo-500/50 transition cursor-pointer space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                      {r.reqCode}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">
                      Baselined v{r.version}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">{r.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">{r.businessObjective}</p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-700">
                    <span>{r.projectName}</span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      {r.acceptedCriteria}/{r.totalCriteria} Accepted
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Requirement Detail Slide-over / Modal for Client Review */}
      {selectedReqDetail && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{selectedReqDetail.reqCode}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  Baselined v{selectedReqDetail.version}
                </span>
              </div>
              <button onClick={() => setSelectedReqDetail(null)} className="text-slate-400 hover:text-slate-600">
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{selectedReqDetail.title}</h2>
                <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="font-bold text-slate-400 uppercase text-[10px]">Business Objective</span>
                  <p className="text-slate-800 dark:text-slate-200 mt-1">{selectedReqDetail.businessObjective}</p>
                </div>
              </div>

              {selectedReqDetail.inScope && (
                <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 uppercase text-[10px]">In Scope</span>
                  <p className="text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-wrap">{selectedReqDetail.inScope}</p>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  Acceptance Criteria ({selectedReqDetail.criteria?.length || 0})
                </h3>

                <div className="space-y-3">
                  {selectedReqDetail.criteria?.map((c: any) => (
                    <div
                      key={c.id}
                      className="p-4 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{c.criteriaCode}</span>
                            <span className="font-semibold text-slate-900 dark:text-white">{c.title}</span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-wrap">{c.description}</p>
                        </div>

                        <div>
                          {c.clientSignoffStatus === 'ACCEPTED' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Accepted
                            </span>
                          ) : c.clientSignoffStatus === 'REJECTED' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                              Changes Requested
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              Awaiting Sign-off
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-slate-500">
                        <div className="flex items-center gap-3">
                          <span className="font-mono uppercase text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                            {c.verificationMethod}
                          </span>
                          {c.isQaVerified && (
                            <span className="text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5" /> QA Verified
                            </span>
                          )}
                        </div>

                        {portalContext?.contact?.isApprover && c.clientSignoffStatus !== 'ACCEPTED' && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                setSignoffModal({ show: true, criterion: c, decision: 'REJECTED', notes: '' })
                              }
                              className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 rounded"
                            >
                              Request Changes
                            </button>
                            <button
                              onClick={() =>
                                setSignoffModal({ show: true, criterion: c, decision: 'ACCEPTED', notes: '' })
                              }
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-sm"
                            >
                              Approve Criterion
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Requests & Quotations (CLIENT-004) */}
      {activeTab === 'CHANGE_REQUESTS' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between shadow-sm">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-indigo-600" />
                Scope Quotations & Change Requests
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review formal change quotations, scope revisions, deliverables, and record authoritative client sign-offs.
              </p>
            </div>
            {portalContext?.contact?.isApprover && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5" />
                Authorized Scope Approver
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Change Requests List */}
            <div className="lg:col-span-5 space-y-3">
              {loadingCrs ? (
                <div className="p-8 text-center text-slate-400 bg-white dark:bg-slate-800 rounded-xl border">
                  Loading quotations...
                </div>
              ) : portalChangeRequests.length === 0 ? (
                <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-800 rounded-xl border space-y-2">
                  <DollarSign className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-medium">No change requests currently pending client review.</p>
                </div>
              ) : (
                portalChangeRequests.map((cr) => {
                  const isSelected = selectedCrDetail?.id === cr.id;
                  return (
                    <div
                      key={cr.id}
                      onClick={() => handleOpenCrDetail(cr.id)}
                      className={`p-4 rounded-xl border transition cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-400 dark:border-indigo-600 shadow-sm'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {cr.cr_number}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                            Rev {cr.current_revision}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-xs font-bold rounded ${
                              cr.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                                : cr.status === 'AWAITING_CLIENT'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 animate-pulse'
                                : cr.status === 'CHANGES_REQUESTED'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {cr.status}
                          </span>
                        </div>
                      </div>

                      <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-1.5">{cr.title}</h3>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Project: {cr.project_name || cr.product_name} &bull; PM: {cr.accountable_pm_name}
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {cr.currency} {Number(cr.quoted_price || 0).toLocaleString()}
                        </div>
                        <div className="text-slate-500">
                          {cr.schedule_delay_days && cr.schedule_delay_days > 0 ? (
                            <span className="text-amber-600 font-medium">+{cr.schedule_delay_days}d delay</span>
                          ) : (
                            <span className="text-emerald-600">On schedule</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right: Selected Change Request Quotation & Revisions */}
            <div className="lg:col-span-7">
              {selectedCrDetail ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-6 shadow-sm">
                  {/* Header */}
                  <div className="flex items-start justify-between border-b pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-0.5 rounded">
                          {selectedCrDetail.cr_number}
                        </span>
                        <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                          Revision {selectedCrDetail.current_revision}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs font-bold rounded ${
                            selectedCrDetail.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : selectedCrDetail.status === 'AWAITING_CLIENT'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {selectedCrDetail.status}
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-2">
                        {selectedCrDetail.title}
                      </h2>
                      <div className="text-xs text-slate-500 mt-1">
                        Scope Container: <strong>{selectedCrDetail.project_name || selectedCrDetail.product_name}</strong> &bull; Lead PM: {selectedCrDetail.accountable_pm_name}
                      </div>
                    </div>

                    {/* Approver Action Bar */}
                    {portalContext?.contact?.isApprover && selectedCrDetail.status === 'AWAITING_CLIENT' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setCrDecisionModal({
                              show: true,
                              cr: selectedCrDetail,
                              decision: 'CHANGES_REQUESTED',
                              remarks: '',
                            })
                          }
                          className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 rounded-lg border border-amber-200"
                        >
                          Request Changes
                        </button>
                        <button
                          onClick={() =>
                            setCrDecisionModal({
                              show: true,
                              cr: selectedCrDetail,
                              decision: 'APPROVED',
                              remarks: '',
                            })
                          }
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                        >
                          Approve Quotation
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Active Revision Commercial Quotation Box */}
                  {selectedCrDetail.revisions && selectedCrDetail.revisions.length > 0 && (
                    (() => {
                      const currentRev = selectedCrDetail.revisions[0]; // ordered desc
                      return (
                        <div className="space-y-4">
                          <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                            <div>
                              <span className="text-slate-500 block">Quoted Price:</span>
                              <span className="text-base font-bold text-slate-900 dark:text-white">
                                {currentRev.currency} {Number(currentRev.quoted_price).toLocaleString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Estimated Hours:</span>
                              <span className="text-base font-bold text-slate-900 dark:text-white">
                                {currentRev.estimated_hours} hrs
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Schedule Impact:</span>
                              <span className="text-base font-bold text-slate-900 dark:text-white">
                                {currentRev.schedule_delay_days > 0 ? `+${currentRev.schedule_delay_days} days` : 'No delay'}
                              </span>
                              {currentRev.revised_delivery_date && (
                                <div className="text-[11px] text-slate-400">
                                  Target: {currentRev.revised_delivery_date}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Scope description */}
                          <div className="text-xs space-y-1">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">Scope Description (Rev {currentRev.revision_number}):</span>
                            <p className="p-3 bg-white dark:bg-slate-900 rounded-lg border text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                              {currentRev.scope_description}
                            </p>
                          </div>

                          {/* Deliverables checklist */}
                          {currentRev.deliverables && currentRev.deliverables.length > 0 && (
                            <div className="text-xs space-y-2">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">Deliverables:</span>
                              <div className="space-y-1.5">
                                {currentRev.deliverables.map((d, i) => (
                                  <div key={i} className="p-2.5 rounded-lg border bg-white dark:bg-slate-900 flex items-center justify-between">
                                    <div>
                                      <div className="font-medium text-slate-900 dark:text-white">{d.title}</div>
                                      {d.description && <div className="text-slate-400 text-[11px]">{d.description}</div>}
                                    </div>
                                    {d.targetDate && (
                                      <span className="font-mono text-[11px] text-slate-500">Target: {d.targetDate}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Revision Sign-off status banner */}
                          {currentRev.client_decision && (
                            <div
                              className={`p-3 rounded-lg border text-xs ${
                                currentRev.client_decision === 'APPROVED'
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  : 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300'
                              }`}
                            >
                              <div className="flex items-center justify-between font-bold">
                                <span>Client Sign-off: {currentRev.client_decision}</span>
                                {currentRev.decided_at && (
                                  <span className="font-normal text-[11px]">
                                    {new Date(currentRev.decided_at).toLocaleString()}
                                  </span>
                                )}
                              </div>
                              {currentRev.decided_by_contact_name && (
                                <div className="text-[11px] mt-0.5">Signed by: {currentRev.decided_by_contact_name}</div>
                              )}
                              {currentRev.client_remarks && (
                                <div className="mt-1 italic font-normal">"{currentRev.client_remarks}"</div>
                              )}
                            </div>
                          )}

                          {/* Material Revisions History */}
                          {selectedCrDetail.revisions.length > 1 && (
                            <div className="pt-4 border-t space-y-3">
                              <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                                <History className="w-4 h-4 text-indigo-600" />
                                Revision History ({selectedCrDetail.revisions.length})
                              </h4>
                              <div className="space-y-2">
                                {selectedCrDetail.revisions.slice(1).map((hist) => (
                                  <div key={hist.id} className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-900/40 text-xs">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-slate-700 dark:text-slate-300">
                                        Revision {hist.revision_number} &bull; {hist.status}
                                      </span>
                                      <span className="text-slate-400 text-[11px]">
                                        {hist.currency} {Number(hist.quoted_price).toLocaleString()} &bull; {hist.estimated_hours}h
                                      </span>
                                    </div>
                                    {hist.revision_reason && (
                                      <div className="text-slate-500 mt-1">Reason: {hist.revision_reason}</div>
                                    )}
                                    {hist.client_remarks && (
                                      <div className="text-slate-600 italic mt-0.5">Client Remarks: "{hist.client_remarks}"</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  )}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center text-slate-400">
                  Select a change request quotation on the left to review its scope and financials.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* UAT & Acceptance Packages Tab (CLIENT-005) */}
      {activeTab === 'UAT_PACKAGES' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-indigo-600" />
              Client Acceptance & Milestone Sign-Off (UAT)
            </h2>
            <span className="text-xs text-slate-500">
              Tri-state verification (Dev-Done &rarr; QA-Verified &rarr; Client-Accepted) with formal milestone sign-off
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
            {/* Left Column: Package List */}
            <div className="lg:col-span-4 border-r border-slate-200 dark:border-slate-700 p-4 space-y-3 overflow-y-auto max-h-[750px]">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Available Acceptance Packages ({portalUatPackages.length})
              </div>
              {loadingUats ? (
                <div className="p-8 text-center text-slate-400 text-xs">Loading acceptance packages...</div>
              ) : portalUatPackages.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No UAT packages published for acceptance testing yet.
                </div>
              ) : (
                portalUatPackages.map((pkg) => {
                  const isSelected = selectedUatPkg?.id === pkg.id;
                  return (
                    <div
                      key={pkg.id}
                      onClick={() => handleOpenUatDetail(pkg.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition text-xs space-y-2 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-600'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {pkg.package_code}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                            pkg.status === 'ACCEPTED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : pkg.status === 'READY_FOR_CLIENT'
                              ? 'bg-blue-100 text-blue-800'
                              : pkg.status === 'CHANGES_REQUESTED'
                              ? 'bg-amber-100 text-amber-800'
                              : pkg.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {pkg.status}
                        </span>
                      </div>
                      <div className="font-bold text-slate-900 dark:text-white line-clamp-1">
                        {pkg.title}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center justify-between">
                        <span>{pkg.project_name || pkg.product_name}</span>
                        <span className="font-semibold">Rev {pkg.current_revision}</span>
                      </div>
                      {pkg.environment_url && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <span>Env: {pkg.environment_url}</span>
                          {pkg.milestone_name && <span>&bull; {pkg.milestone_name}</span>}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Right Column: Package Detail & Checklist */}
            <div className="lg:col-span-8 p-6 overflow-y-auto max-h-[750px]">
              {selectedUatPkg ? (
                <div className="space-y-6">
                  {/* Header Bar */}
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">
                          {selectedUatPkg.package_code}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded">
                          Rev {selectedUatPkg.current_revision}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs font-bold rounded ${
                            selectedUatPkg.status === 'ACCEPTED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : selectedUatPkg.status === 'READY_FOR_CLIENT'
                              ? 'bg-blue-100 text-blue-800'
                              : selectedUatPkg.status === 'CHANGES_REQUESTED'
                              ? 'bg-amber-100 text-amber-800'
                              : selectedUatPkg.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {selectedUatPkg.status}
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1.5">
                        {selectedUatPkg.title}
                      </h2>
                      <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                        <span>Project/Product: <strong>{selectedUatPkg.project_name || selectedUatPkg.product_name}</strong></span>
                        {selectedUatPkg.milestone_name && <span>Milestone: <strong>{selectedUatPkg.milestone_name}</strong></span>}
                        {selectedUatPkg.environment_url && <span>Target Env: <strong>{selectedUatPkg.environment_url}</strong></span>}
                      </div>
                    </div>

                    {/* Approver Action Buttons */}
                    {portalContext?.contact?.isApprover && selectedUatPkg.status === 'READY_FOR_CLIENT' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setUatDecisionModal({
                              show: true,
                              pkg: selectedUatPkg,
                              decision: 'CHANGES_REQUESTED',
                              remarks: '',
                            })
                          }
                          className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 rounded-lg border border-amber-200"
                        >
                          Request Changes
                        </button>
                        <button
                          onClick={() =>
                            setUatDecisionModal({
                              show: true,
                              pkg: selectedUatPkg,
                              decision: 'APPROVED',
                              remarks: '',
                            })
                          }
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                        >
                          Sign-Off & Accept
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Active Revision Details & Testing Credentials Box */}
                  {selectedUatPkg.revisions && selectedUatPkg.revisions.length > 0 && (
                    (() => {
                      const currentRev = selectedUatPkg.revisions[0];
                      return (
                        <div className="space-y-4">
                          {/* Test Environment & Build Meta */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                            <div>
                              <span className="text-slate-500 block">Test Environment URL:</span>
                              {selectedUatPkg.environment_url ? (
                                <a
                                  href={selectedUatPkg.environment_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline inline-flex items-center gap-1 mt-0.5 break-all"
                                >
                                  {selectedUatPkg.environment_url}
                                  <ExternalLink className="w-3 h-3 shrink-0" />
                                </a>
                              ) : (
                                <span className="text-slate-400">Not specified</span>
                              )}
                            </div>
                            <div>
                              <span className="text-slate-500 block">Build / Version:</span>
                              <span className="font-mono text-slate-800 dark:text-slate-200">
                                {selectedUatPkg.build_number || selectedUatPkg.version_name || 'Latest Release Candidate'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Sign-Off Decision:</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {currentRev.client_decision || 'Pending Review'}
                              </span>
                              {currentRev.decided_at && (
                                <div className="text-[11px] text-slate-400">
                                  {new Date(currentRev.decided_at).toLocaleString()}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Revision Notes */}
                          {currentRev.revision_notes && (
                            <div className="text-xs space-y-1">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                Revision Notes (Rev {currentRev.revision_number}):
                              </span>
                              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                {currentRev.revision_notes}
                              </div>
                            </div>
                          )}

                          {/* Disclosed Known Issues */}
                          {currentRev.known_issues && currentRev.known_issues.length > 0 && (
                            <div className="text-xs space-y-2">
                              <span className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                Disclosed Known Issues ({currentRev.known_issues.length}):
                              </span>
                              <div className="space-y-1.5">
                                {currentRev.known_issues.map((ki, i) => (
                                  <div key={i} className="p-2.5 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg text-amber-900 dark:text-amber-200">
                                    <div className="font-bold flex items-center justify-between">
                                      <span>{ki.title}</span>
                                      {ki.severity && (
                                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-amber-200/50 rounded">
                                          {ki.severity}
                                        </span>
                                      )}
                                    </div>
                                    {ki.workaround && (
                                      <div className="text-[11px] mt-0.5 text-amber-800 dark:text-amber-300">
                                        Workaround: {ki.workaround}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Interactive Acceptance Checklist */}
                          <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between">
                              <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                                Acceptance Checklist Items ({currentRev.checklistItems?.length || 0})
                              </h3>
                              <span className="text-[11px] text-slate-500">
                                Verify each test scenario below
                              </span>
                            </div>

                            <div className="space-y-2">
                              {currentRev.checklistItems && currentRev.checklistItems.length > 0 ? (
                                currentRev.checklistItems.map((item: UatChecklistItem, idx: number) => (
                                  <div
                                    key={item.id}
                                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs space-y-2"
                                  >
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono text-slate-400 font-bold">
                                          #{idx + 1}
                                        </span>
                                        <span className="font-bold text-slate-900 dark:text-white">
                                          {item.title}
                                        </span>
                                        {item.criteria_code && (
                                          <span className="font-mono text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">
                                            {item.criteria_code}
                                          </span>
                                        )}
                                      </div>

                                      {/* Tri-State Indicators & Test Action */}
                                      <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1.5 text-[11px]">
                                          <span className="text-slate-400">Dev:</span>
                                          <span className={item.developer_done ? 'text-emerald-600 font-bold' : 'text-slate-300'}>
                                            {item.developer_done ? 'Done' : 'Pending'}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[11px]">
                                          <span className="text-slate-400">QA:</span>
                                          <span className={item.qa_verified ? 'text-emerald-600 font-bold' : 'text-slate-300'}>
                                            {item.qa_verified ? 'Verified' : 'Pending'}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <span
                                            className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                                              item.client_status === 'PASSED'
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : item.client_status === 'FAILED'
                                                ? 'bg-rose-100 text-rose-800'
                                                : item.client_status === 'WAIVED'
                                                ? 'bg-purple-100 text-purple-800'
                                                : 'bg-amber-100 text-amber-800'
                                            }`}
                                          >
                                            {item.client_status}
                                          </span>
                                        </div>

                                        {/* Feedback Buttons */}
                                        {selectedUatPkg.status === 'READY_FOR_CLIENT' && (
                                          <div className="flex items-center gap-1 pl-2 border-l border-slate-200 dark:border-slate-700">
                                            <button
                                              onClick={() =>
                                                setUatItemTestModal({
                                                  show: true,
                                                  item,
                                                  status: 'PASSED',
                                                  feedback: item.client_feedback || '',
                                                })
                                              }
                                              title="Mark Passed"
                                              className="p-1 hover:bg-emerald-50 text-emerald-600 rounded transition"
                                            >
                                              <Check className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={() =>
                                                setUatItemTestModal({
                                                  show: true,
                                                  item,
                                                  status: 'FAILED',
                                                  feedback: item.client_feedback || '',
                                                })
                                              }
                                              title="Mark Failed / Report Defect"
                                              className="p-1 hover:bg-rose-50 text-rose-600 rounded transition"
                                            >
                                              <AlertCircle className="w-4 h-4" />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {item.instructions && (
                                      <p className="text-slate-600 dark:text-slate-400 pl-6">
                                        {item.instructions}
                                      </p>
                                    )}

                                    {item.expected_outcome && (
                                      <div className="pl-6 text-[11px] text-slate-500">
                                        <span className="font-semibold text-slate-600 dark:text-slate-400">Expected: </span>
                                        {item.expected_outcome}
                                      </div>
                                    )}

                                    {item.client_feedback && (
                                      <div className="pl-6 text-[11px] italic text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20 p-2 rounded">
                                        <strong>Client Feedback: </strong>"{item.client_feedback}"
                                      </div>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <div className="text-xs text-slate-400 italic p-4 text-center">
                                  No checklist items defined in this package revision.
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Historical Revisions */}
                          {selectedUatPkg.revisions.length > 1 && (
                            <div className="pt-4 border-t space-y-3">
                              <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                                <History className="w-4 h-4 text-indigo-600" />
                                Material Revision Audit History ({selectedUatPkg.revisions.length})
                              </h4>
                              <div className="space-y-2">
                                {selectedUatPkg.revisions.slice(1).map((hist) => (
                                  <div key={hist.id} className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-900/40 text-xs">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-slate-700 dark:text-slate-300">
                                        Revision {hist.revision_number} &bull; {hist.status}
                                      </span>
                                      <span className="text-slate-400 text-[11px]">
                                        Decision: {hist.client_decision || 'N/A'}
                                      </span>
                                    </div>
                                    {hist.revision_notes && (
                                      <div className="text-slate-500 mt-1">Notes: {hist.revision_notes}</div>
                                    )}
                                    {hist.client_signoff_remarks && (
                                      <div className="text-slate-600 italic mt-0.5">Client Remarks: "{hist.client_signoff_remarks}"</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  )}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center text-slate-400">
                  Select an acceptance package on the left to review its scope, checklist items, and sign-off options.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Progress Reports Tab (CLIENT-006) */}
      {activeTab === 'PROGRESS_REPORTS' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Project Progress Updates & Delivery Reports
            </h2>
            <span className="text-xs text-slate-500">
              PM-reviewed client-safe status updates, milestone forecasts, and pending client actions
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
            {/* Left Column: Report List */}
            <div className="lg:col-span-4 border-r border-slate-200 dark:border-slate-700 p-4 space-y-3 overflow-y-auto max-h-[750px]">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Published Reports ({portalReports.length})
              </div>
              {loadingReports ? (
                <div className="p-8 text-center text-slate-400 text-xs">Loading progress reports...</div>
              ) : portalReports.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No progress reports published for your projects yet.
                </div>
              ) : (
                portalReports.map((rep) => {
                  const isSelected = selectedPortalReport?.id === rep.id;
                  return (
                    <div
                      key={rep.id}
                      onClick={() => handleOpenPortalReportDetail(rep.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition text-xs space-y-2 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-600'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {rep.report_code}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                            rep.overall_health === 'ON_TRACK'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rep.overall_health === 'NEEDS_ATTENTION'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {rep.overall_health.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="font-bold text-slate-900 dark:text-white line-clamp-1">
                        {rep.title}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center justify-between">
                        <span>{rep.project_name || rep.product_name}</span>
                        <span className="font-semibold">Rev {rep.current_revision}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Period: {rep.period_start_date?.split('T')[0]} &rarr; {rep.period_end_date?.split('T')[0]}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right Column: Report Detail */}
            <div className="lg:col-span-8 p-6 overflow-y-auto max-h-[750px]">
              {selectedPortalReport ? (
                <div className="space-y-6">
                  {/* Header Bar */}
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">
                          {selectedPortalReport.report_code}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded">
                          Rev {selectedPortalReport.current_revision}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs font-bold rounded ${
                            selectedPortalReport.overall_health === 'ON_TRACK'
                              ? 'bg-emerald-100 text-emerald-800'
                              : selectedPortalReport.overall_health === 'NEEDS_ATTENTION'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {selectedPortalReport.overall_health.replace('_', ' ')}
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1.5">
                        {selectedPortalReport.title}
                      </h2>
                      <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                        <span>Project: <strong>{selectedPortalReport.project_name || selectedPortalReport.product_name}</strong></span>
                        <span>Reporting Period: <strong>{selectedPortalReport.period_start_date?.split('T')[0]} to {selectedPortalReport.period_end_date?.split('T')[0]}</strong></span>
                        {selectedPortalReport.published_at && (
                          <span>Published: {new Date(selectedPortalReport.published_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenPortalDigestModal(selectedPortalReport.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 rounded-lg border border-indigo-200 inline-flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Digest Summary
                    </button>
                  </div>

                  {/* Executive Summary Card */}
                  <div
                    className={`p-4 rounded-xl border text-xs space-y-2 ${
                      selectedPortalReport.overall_health === 'ON_TRACK'
                        ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800'
                        : selectedPortalReport.overall_health === 'NEEDS_ATTENTION'
                        ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800'
                        : 'bg-rose-50/50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-800'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span className="uppercase tracking-wider text-[11px] text-slate-900 dark:text-white">
                        Executive Summary & Health
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Status: {selectedPortalReport.overall_health.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                      {selectedPortalReport.executive_summary}
                    </p>
                    {selectedPortalReport.health_narrative && (
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 italic text-slate-600 dark:text-slate-400">
                        {selectedPortalReport.health_narrative}
                      </div>
                    )}
                  </div>

                  {/* Delivered Work & Next Steps Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                      <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Delivered Work (This Cycle)
                      </h3>
                      <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {selectedPortalReport.delivered_work_summary || 'No delivered items summarized.'}
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                      <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-indigo-600" />
                        Planned Next Steps
                      </h3>
                      <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {selectedPortalReport.next_steps_summary || 'No next steps outlined.'}
                      </p>
                    </div>
                  </div>

                  {/* Decisions Needed */}
                  {selectedPortalReport.decisions_needed_summary && (
                    <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl text-xs space-y-1.5">
                      <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        Key Decisions Needed / Client Dependencies
                      </div>
                      <p className="text-amber-800 dark:text-amber-300 whitespace-pre-wrap">
                        {selectedPortalReport.decisions_needed_summary}
                      </p>
                    </div>
                  )}

                  {/* Milestone Schedule Forecast Table */}
                  {selectedPortalReport.milestone_forecasts && selectedPortalReport.milestone_forecasts.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Target className="w-4 h-4 text-indigo-600" />
                        Milestone Delivery Forecast
                      </h3>
                      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-900/50 border-b text-slate-500 font-semibold">
                            <tr>
                              <th className="p-3">Milestone</th>
                              <th className="p-3">Committed Date</th>
                              <th className="p-3">Forecast Date</th>
                              <th className="p-3">Status / Remarks</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {selectedPortalReport.milestone_forecasts.map((m, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                                <td className="p-3 font-semibold text-slate-900 dark:text-white">
                                  {m.milestoneName}
                                </td>
                                <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                                  {m.committedDate || 'Uncommitted'}
                                </td>
                                <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                  {m.indicativeForecastDate}
                                </td>
                                <td className="p-3 text-slate-600 dark:text-slate-400">
                                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-medium mr-2">
                                    {m.status || 'Active'}
                                  </span>
                                  {m.remarks}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Action Items Awaiting Response */}
                  {selectedPortalReport.client_action_items && selectedPortalReport.client_action_items.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-purple-600" />
                        Pending Client Actions ({selectedPortalReport.client_action_items.length})
                      </h3>
                      <div className="space-y-1.5">
                        {selectedPortalReport.client_action_items.map((act, i) => (
                          <div
                            key={i}
                            className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white">{act.title}</span>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                Assigned: {act.owner || 'Client Team'}
                                {act.dueDate && <span> &bull; Target: {act.dueDate}</span>}
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

                  {/* Commercial Summary (Only for Approvers if Included) */}
                  {selectedPortalReport.commercial_summary && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-slate-900 dark:text-white flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-emerald-600" />
                          Agreed Commercial Summary (Approvers Only)
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {selectedPortalReport.commercial_summary.currency || 'USD'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Contract Value:</span>
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {selectedPortalReport.commercial_summary.contractValue?.toLocaleString() || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Approved CRs:</span>
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            +{selectedPortalReport.commercial_summary.approvedCrValue?.toLocaleString() || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Invoiced to Date:</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                            {selectedPortalReport.commercial_summary.invoicedToDate?.toLocaleString() || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Milestone Billed:</span>
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {selectedPortalReport.commercial_summary.currentMilestoneBilled?.toLocaleString() || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Revisions History */}
                  {selectedPortalReport.revisions && selectedPortalReport.revisions.length > 1 && (
                    <div className="pt-4 border-t space-y-3">
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                        <History className="w-4 h-4 text-indigo-600" />
                        Report Revision History ({selectedPortalReport.revisions.length})
                      </h4>
                      <div className="space-y-2">
                        {selectedPortalReport.revisions.slice(1).map((rev) => (
                          <div
                            key={rev.id}
                            className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-900/40 text-xs flex items-center justify-between"
                          >
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              Revision {rev.revision_number} &bull; {rev.revision_reason || 'Published update'}
                            </span>
                            <span className="text-slate-400 text-[11px]">
                              {new Date(rev.published_at).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center text-slate-400">
                  Select a progress report on the left to review executive updates, delivered items, and milestone forecasts.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Client Action Requests Tab (DEL-001) */}
      {activeTab === 'ACTION_REQUESTS' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                Actions & Decisions Awaiting Client Response
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Explicit decisions, approvals, and inputs requested by the project management team with SLA deadlines.
              </p>
            </div>
            <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
              {portalActions.filter((a) => a.status === 'PENDING').length} Pending Decisions
            </div>
          </div>

          <div className="p-4 space-y-4">
            {loadingActions ? (
              <div className="p-12 text-center text-slate-400 text-xs">Loading action requests...</div>
            ) : portalActions.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No action requests or decisions awaiting your input at this time.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {portalActions.map((action) => {
                  const isApprover = portalContext?.contact?.is_approver === true;
                  const canRespond = !action.requires_approver || isApprover;
                  const isPending = action.status === 'PENDING' || action.status === 'IN_REVIEW';

                  return (
                    <div
                      key={action.id}
                      className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-3 shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider block">
                            {action.action_code} &bull; {action.project_name}
                          </span>
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">
                            {action.title}
                          </h3>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                            action.status === 'RESPONDED' || action.status === 'RESOLVED'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                          }`}
                        >
                          {action.status}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs text-slate-700 dark:text-slate-300">
                        {action.context_for_client}
                      </div>

                      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800 gap-2">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 font-medium">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            Due: {action.due_date ? action.due_date.slice(0, 10) : 'N/A'}
                          </span>
                          {action.requires_approver && (
                            <span className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                              <Lock className="w-3 h-3" /> Approver Authority Required
                            </span>
                          )}
                        </div>

                        {isPending ? (
                          canRespond ? (
                            <button
                              onClick={() => {
                                setActionResponseModal({
                                  show: true,
                                  action,
                                  responseText: '',
                                  decision: 'APPROVED',
                                });
                              }}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1"
                            >
                              <Send className="w-3.5 h-3.5" />
                              Submit Response / Decision
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              Requires authorized approver contact to sign off
                            </span>
                          )
                        ) : (
                          <div className="text-right text-[11px]">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400 block">
                              Decision: {action.resulting_decision}
                            </span>
                            <span className="text-slate-400">
                              By {action.responded_by_name || 'Contact'} on{' '}
                              {action.responded_at ? action.responded_at.slice(0, 10) : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Decisions Log Tab (DEL-001) */}
      {activeTab === 'DECISIONS' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-indigo-600" />
                Agreed Architecture & Delivery Decisions (ADR)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Official decisions, architectural trade-offs, and agreed technical direction shared with client stakeholders.
              </p>
            </div>
            <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              {portalDecisions.length} Decisions Recorded
            </div>
          </div>

          <div className="p-4 space-y-4">
            {loadingDecisions ? (
              <div className="p-12 text-center text-slate-400 text-xs">Loading decisions log...</div>
            ) : portalDecisions.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No client-shared decisions published for your projects yet.
              </div>
            ) : (
              <div className="space-y-4">
                {portalDecisions.map((dec) => (
                  <div
                    key={dec.id}
                    className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {dec.item_code}
                          </span>
                          <span className="text-slate-400">&bull;</span>
                          <span className="text-xs text-slate-500 font-medium">{dec.project_name}</span>
                          {dec.superseded_by_code && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 flex items-center gap-1">
                              <GitMerge className="w-3 h-3" /> Superseded by {dec.superseded_by_code}
                            </span>
                          )}
                          {dec.supersedes_code && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 flex items-center gap-1">
                              <ArrowRight className="w-3 h-3" /> Successor of {dec.supersedes_code}
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-1">{dec.title}</h3>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          dec.status === 'ACCEPTED'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : dec.status === 'SUPERSEDED'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {dec.status}
                      </span>
                    </div>

                    {dec.context && (
                      <div className="text-xs text-slate-600 dark:text-slate-300">
                        <strong className="text-slate-800 dark:text-slate-200">Context: </strong>
                        {dec.context}
                      </div>
                    )}

                    {dec.rationale && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs text-slate-700 dark:text-slate-300">
                        <strong className="text-slate-900 dark:text-white block mb-0.5">Agreed Rationale:</strong>
                        {dec.rationale}
                      </div>
                    )}

                    {dec.consequences && (
                      <div className="text-xs text-slate-500">
                        <strong>Anticipated Trade-offs & Outcomes: </strong>
                        {dec.consequences}
                      </div>
                    )}

                    {dec.alternatives_considered && dec.alternatives_considered.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                          Alternatives Considered ({dec.alternatives_considered.length})
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {dec.alternatives_considered.map((alt, idx) => (
                            <div key={idx} className="p-2.5 rounded-lg border bg-slate-50/50 dark:bg-slate-800/30 text-xs">
                              <div className="font-semibold text-slate-800 dark:text-slate-200">{alt.title}</div>
                              {alt.rejectedReason && (
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  <strong>Reason Declined: </strong>
                                  {alt.rejectedReason}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Community Ideas & Voting (PROD-001) */}
      {activeTab === 'COMMUNITY_IDEAS' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm space-y-4 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Compass className="w-5 h-5 text-indigo-600" />
                Community Feature Voting & Ideas
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review moderated enhancement proposals for your licensed products. Each client organization holds exactly one vote per idea.
              </p>
            </div>
            <button
              onClick={() => {
                setIdeaSubmitForm({
                  productId: portalContext?.licensedProducts?.[0]?.id || '',
                  title: '',
                  customerProblem: '',
                  expectedOutcome: '',
                });
                setShowIdeaSubmitModal(true);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 self-start"
            >
              <Plus className="w-4 h-4" />
              Submit Feedback Proposal
            </button>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search moderated ideas..."
                value={ideaSearchQuery}
                onChange={(e) => setIdeaSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') loadPortalIdeas();
                }}
                className="w-full pl-9 text-xs border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            {portalContext?.licensedProducts && portalContext.licensedProducts.length > 1 && (
              <select
                value={selectedIdeaProductId}
                onChange={(e) => {
                  setSelectedIdeaProductId(e.target.value);
                  setTimeout(loadPortalIdeas, 0);
                }}
                className="text-xs border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="">All Licensed Products</option>
                {portalContext.licensedProducts.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.product_name}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={loadPortalIdeas}
              className="px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium"
            >
              Filter
            </button>
          </div>

          {/* Ideas List */}
          {loadingIdeas ? (
            <div className="p-8 text-center text-slate-400">Loading community ideas...</div>
          ) : portalIdeas.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <Compass className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-medium">No published community ideas yet for your licensed products.</p>
              <p className="text-xs">Have a feature request or improvement? Propose one to the product team!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {portalIdeas.map((idea) => (
                <div
                  key={idea.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 transition-all bg-white dark:bg-slate-800/80 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-300 px-2 py-0.5 rounded">
                        {idea.idea_code}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">{idea.product_name}</span>
                      {idea.roadmap_bucket && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            idea.roadmap_bucket === 'NOW'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : idea.roadmap_bucket === 'NEXT'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                              : 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300'
                          }`}
                        >
                          Roadmap: {idea.roadmap_bucket}
                        </span>
                      )}
                    </div>

                    {/* Voting & Following Action Controls */}
                    <div className="flex items-center gap-2">
                      {/* One Vote Per Org button */}
                      <button
                        onClick={() => handleToggleVote(idea.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition ${
                          idea.has_client_voted
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                            : 'border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                        title={
                          idea.has_client_voted
                            ? 'Your organization has voted for this idea. Click to retract vote.'
                            : 'Cast your organization vote for this idea.'
                        }
                      >
                        <ThumbsUp className={`w-3.5 h-3.5 ${idea.has_client_voted ? 'fill-current' : ''}`} />
                        <span>{idea.has_client_voted ? 'Voted (Org)' : 'Vote'}</span>
                        <span
                          className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                            idea.has_client_voted
                              ? 'bg-emerald-700 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {idea.vote_count}
                        </span>
                      </button>

                      {/* Follow Button */}
                      <button
                        onClick={() => handleToggleFollow(idea.id)}
                        className={`p-1.5 rounded-lg border text-xs transition ${
                          idea.is_following
                            ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                            : 'border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-slate-50'
                        }`}
                        title={idea.is_following ? 'Following for updates' : 'Follow this idea'}
                      >
                        <Bookmark className={`w-4 h-4 ${idea.is_following ? 'fill-current text-indigo-600' : ''}`} />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">{idea.title}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{idea.sanitized_description}</p>

                  {idea.expected_outcome && (
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs text-slate-600 dark:text-slate-400">
                      <strong>Expected Outcome: </strong> {idea.expected_outcome}
                    </div>
                  )}

                  {idea.indicative_target && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Target: {idea.indicative_target} (Indicative estimate)</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Customer Roadmap (PROD-001) */}
      {activeTab === 'ROADMAP' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm space-y-4 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                Product Roadmap (Now / Next / Later)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Overview of planned product direction for your licensed solutions.
              </p>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>
              <strong>Contractual Notice:</strong> Targets and delivery horizons displayed here are indicative estimates for planning purposes and do not alter contractual commitments or SLAs.
            </span>
          </div>

          {loadingRoadmap ? (
            <div className="p-8 text-center text-slate-400">Loading product roadmap...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              {/* NOW Column */}
              <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                      NOW (Active / Immediate)
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {portalRoadmap.now.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {portalRoadmap.now.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400">No items in active release</div>
                  ) : (
                    portalRoadmap.now.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white dark:bg-slate-800 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">
                            {item.idea_code}
                          </span>
                          {item.indicative_target && (
                            <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {item.indicative_target}
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white">{item.title}</h4>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">
                          {item.sanitized_description}
                        </p>
                        {item.changelog_summary && (
                          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded text-[11px] text-emerald-800 dark:text-emerald-300">
                            <strong>Release Notes: </strong> {item.changelog_summary}
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                          <span>{item.product_name}</span>
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3 text-slate-400" /> {item.vote_count} votes
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* NEXT Column */}
              <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                      NEXT (Planned Releases)
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    {portalRoadmap.next.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {portalRoadmap.next.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400">No items scheduled next</div>
                  ) : (
                    portalRoadmap.next.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white dark:bg-slate-800 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">
                            {item.idea_code}
                          </span>
                          {item.indicative_target && (
                            <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {item.indicative_target}
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white">{item.title}</h4>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">
                          {item.sanitized_description}
                        </p>
                        <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                          <span>{item.product_name}</span>
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3 text-slate-400" /> {item.vote_count} votes
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* LATER Column */}
              <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                    <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                      LATER (Future Horizon)
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                    {portalRoadmap.later.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {portalRoadmap.later.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400">No items on later horizon</div>
                  ) : (
                    portalRoadmap.later.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white dark:bg-slate-800 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">
                            {item.idea_code}
                          </span>
                          {item.indicative_target && (
                            <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {item.indicative_target}
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white">{item.title}</h4>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">
                          {item.sanitized_description}
                        </p>
                        <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                          <span>{item.product_name}</span>
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3 text-slate-400" /> {item.vote_count} votes
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Client Submit Feedback Proposal */}
      {showIdeaSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Compass className="w-5 h-5 text-indigo-600" />
                Submit Product Improvement Proposal
              </h3>
              <button
                onClick={() => setShowIdeaSubmitModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Submit an enhancement proposal directly to the product management team. Our team will review, evaluate, and moderate it for community voting.
            </p>

            <form onSubmit={handleClientSubmitIdea} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-800 dark:text-slate-200">
                  Licensed Product *
                </label>
                <select
                  required
                  value={ideaSubmitForm.productId}
                  onChange={(e) => setIdeaSubmitForm({ ...ideaSubmitForm, productId: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="">Select Product</option>
                  {portalContext?.licensedProducts?.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.product_name} ({p.product_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-800 dark:text-slate-200">
                  Proposal Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Export Transaction Audit Trail to CSV"
                  value={ideaSubmitForm.title}
                  onChange={(e) => setIdeaSubmitForm({ ...ideaSubmitForm, title: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-800 dark:text-slate-200">
                  Customer Problem Statement *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe the operational challenge or friction point your organization experiences today..."
                  value={ideaSubmitForm.customerProblem}
                  onChange={(e) => setIdeaSubmitForm({ ...ideaSubmitForm, customerProblem: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-800 dark:text-slate-200">
                  Expected Outcome (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="What is the ideal workflow or capability you would like to see?"
                  value={ideaSubmitForm.expectedOutcome}
                  onChange={(e) => setIdeaSubmitForm({ ...ideaSubmitForm, expectedOutcome: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowIdeaSubmitModal(false)}
                  className="px-4 py-2 border rounded-lg font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold"
                >
                  Submit Proposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Client Action Request Response */}
      {actionResponseModal.show && actionResponseModal.action && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-indigo-600" />
              Submit Response to Action Request
            </h3>
            <p className="text-xs text-slate-500">
              <strong>{actionResponseModal.action.action_code}: </strong>
              {actionResponseModal.action.title}
            </p>

            <form onSubmit={handleRespondActionSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-800 dark:text-slate-200">
                  Decision Outcome *
                </label>
                <select
                  required
                  value={actionResponseModal.decision}
                  onChange={(e) =>
                    setActionResponseModal({
                      ...actionResponseModal,
                      decision: e.target.value as any,
                    })
                  }
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-lg"
                >
                  <option value="APPROVED">Accept / Approve Recommendation</option>
                  <option value="REJECTED">Decline / Object to Recommendation</option>
                  <option value="INFO_PROVIDED">Provide Required Clarification</option>
                  <option value="SCOPE_CHANGE_REQUESTED">Request Scope Change / Quotation</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-800 dark:text-slate-200">
                  Response Details & Remarks *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide your rationale, decisions, or clarification..."
                  value={actionResponseModal.responseText}
                  onChange={(e) =>
                    setActionResponseModal({
                      ...actionResponseModal,
                      responseText: e.target.value,
                    })
                  }
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() =>
                    setActionResponseModal({
                      show: false,
                      action: null,
                      responseText: '',
                      decision: 'APPROVED',
                    })
                  }
                  className="px-4 py-2 border rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold"
                >
                  Submit Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Customer Portal Digest View */}
      {portalDigestModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Progress Update Digest Summary
              </h3>
              <button
                onClick={() => setPortalDigestModal({ show: false, digest: '' })}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>
            <pre className="p-4 bg-slate-900 text-emerald-300 rounded-xl text-xs overflow-x-auto max-h-96 whitespace-pre-wrap font-mono">
              {portalDigestModal.digest}
            </pre>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(portalDigestModal.digest);
                  setPortalDigestCopied(true);
                  setTimeout(() => setPortalDigestCopied(false), 2500);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg inline-flex items-center gap-1.5"
              >
                {portalDigestCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {portalDigestCopied ? 'Copied!' : 'Copy Summary'}
              </button>
              <button
                type="button"
                onClick={() => setPortalDigestModal({ show: false, digest: '' })}
                className="px-4 py-2 border rounded-lg text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Client CR Decision */}
      {crDecisionModal.show && crDecisionModal.cr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {crDecisionModal.decision === 'APPROVED' ? 'Approve Scope & Quotation' : 'Request Changes on Quotation'}
            </h3>
            <p className="text-xs text-slate-500">
              Quotation: <strong className="font-mono">{crDecisionModal.cr.cr_number}</strong> (Rev {crDecisionModal.cr.current_revision})
            </p>

            <form onSubmit={handleCrDecisionSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Remarks / Conditions *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder={
                    crDecisionModal.decision === 'APPROVED'
                      ? 'e.g. Scope and commercials approved. Please commence work per agreed schedule.'
                      : 'Please explain what needs to be changed in scope, timeline, or price.'
                  }
                  value={crDecisionModal.remarks}
                  onChange={(e) => setCrDecisionModal({ ...crDecisionModal, remarks: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setCrDecisionModal({ show: false, cr: null, decision: 'APPROVED', remarks: '' })}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-white font-medium rounded-lg ${
                    crDecisionModal.decision === 'APPROVED'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  Submit Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Client UAT Milestone Decision */}
      {uatDecisionModal.show && uatDecisionModal.pkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {uatDecisionModal.decision === 'APPROVED' ? 'Sign-Off & Accept Milestone' : 'Request Changes on UAT Package'}
            </h3>
            <p className="text-xs text-slate-500">
              Package: <strong className="font-mono">{uatDecisionModal.pkg.package_code}</strong> (Rev {uatDecisionModal.pkg.current_revision})
            </p>

            <form onSubmit={handleUatDecisionSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Sign-Off Remarks / Justification *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder={
                    uatDecisionModal.decision === 'APPROVED'
                      ? 'e.g. All critical acceptance scenarios have been verified and approved for milestone release.'
                      : 'Please specify the defects or missing acceptance criteria requiring resolution.'
                  }
                  value={uatDecisionModal.remarks}
                  onChange={(e) => setUatDecisionModal({ ...uatDecisionModal, remarks: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setUatDecisionModal({ show: false, pkg: null, decision: 'APPROVED', remarks: '' })}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-white font-medium rounded-lg ${
                    uatDecisionModal.decision === 'APPROVED'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  Confirm Sign-Off Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Client Item Feedback / Test Verification */}
      {uatItemTestModal.show && uatItemTestModal.item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Record Item Test Verification
            </h3>
            <p className="text-xs text-slate-500">
              Item: <strong>{uatItemTestModal.item.title}</strong>
            </p>

            <form onSubmit={handleItemTestSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Verification Status *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUatItemTestModal({ ...uatItemTestModal, status: 'PASSED' })}
                    className={`py-2 px-3 rounded-lg border font-bold text-center ${
                      uatItemTestModal.status === 'PASSED'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    Passed
                  </button>
                  <button
                    type="button"
                    onClick={() => setUatItemTestModal({ ...uatItemTestModal, status: 'FAILED' })}
                    className={`py-2 px-3 rounded-lg border font-bold text-center ${
                      uatItemTestModal.status === 'FAILED'
                        ? 'border-rose-600 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    Failed
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Feedback / Defect Notes {uatItemTestModal.status === 'FAILED' ? '*' : '(Optional)'}
                </label>
                <textarea
                  rows={3}
                  required={uatItemTestModal.status === 'FAILED'}
                  placeholder={
                    uatItemTestModal.status === 'PASSED'
                      ? 'Optional notes confirming scenario passed'
                      : 'Describe what failed, actual vs expected result'
                  }
                  value={uatItemTestModal.feedback}
                  onChange={(e) => setUatItemTestModal({ ...uatItemTestModal, feedback: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setUatItemTestModal({ show: false, item: null, status: 'PASSED', feedback: '' })}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg"
                >
                  Save Verification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Signoff Decision */}
      {signoffModal.show && signoffModal.criterion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {signoffModal.decision === 'ACCEPTED' ? 'Approve Criterion' : 'Request Changes on Criterion'}
            </h3>
            <p className="text-xs text-slate-500">
              Criterion: <strong className="font-mono">{signoffModal.criterion.criteriaCode}</strong> &bull; {signoffModal.criterion.title}
            </p>

            <form onSubmit={handleSignoffSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Remarks / Sign-off Notes
                </label>
                <textarea
                  rows={3}
                  required={signoffModal.decision === 'REJECTED'}
                  placeholder={
                    signoffModal.decision === 'ACCEPTED'
                      ? 'e.g. Verified and approved following staging walkthrough.'
                      : 'Detail what changes or corrections are needed before sign-off.'
                  }
                  value={signoffModal.notes}
                  onChange={(e) => setSignoffModal({ ...signoffModal, notes: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setSignoffModal({ show: false, criterion: null, decision: 'ACCEPTED', notes: '' })}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-white font-medium rounded-lg ${
                    signoffModal.decision === 'ACCEPTED'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Submit Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submit Request Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                Submit Intake Request
              </h2>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Request Type *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'SUPPORT', label: 'Support Ticket', icon: LifeBuoy },
                    { id: 'BUG', label: 'Bug Report', icon: Bug },
                    { id: 'CHANGE_REQUEST', label: 'Change Request', icon: FileText },
                  ].map((t) => {
                    const Icon = t.icon;
                    return (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => setSubmitForm({ ...submitForm, requestType: t.id as any })}
                        className={`p-2.5 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1.5 transition ${
                          submitForm.requestType === t.id
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subject / Summary *
                </label>
                <input
                  type="text"
                  required
                  value={submitForm.title}
                  onChange={(e) => setSubmitForm({ ...submitForm, title: e.target.value })}
                  placeholder="Brief summary of the issue or requirement"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Associated Project
                </label>
                <select
                  value={submitForm.projectId}
                  onChange={(e) => setSubmitForm({ ...submitForm, projectId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                >
                  <option value="">General (No specific project)</option>
                  {portalContext?.permittedProjects?.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.project_name} ({p.project_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Your Urgency / Priority
                  </label>
                  <select
                    value={submitForm.clientPriority}
                    onChange={(e) =>
                      setSubmitForm({ ...submitForm, clientPriority: e.target.value as any })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical (System Down)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Impact Scope
                  </label>
                  <select
                    value={submitForm.impactBreadth}
                    onChange={(e) =>
                      setSubmitForm({ ...submitForm, impactBreadth: e.target.value as any })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                  >
                    <option value="SINGLE_USER">Single User Affected</option>
                    <option value="ORGANIZATION">Multiple Users in My Org</option>
                    <option value="ALL_CLIENTS">All End Customers Blocked</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Detailed Description & Steps *
                </label>
                <textarea
                  required
                  rows={4}
                  value={submitForm.description}
                  onChange={(e) => setSubmitForm({ ...submitForm, description: e.target.value })}
                  placeholder="Provide clear steps to reproduce, actual vs expected behavior, and business impact..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Detail & Clarifications Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {selectedRequest.request_number}
                </span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${getStatusColor(
                    selectedRequest.customerStatusColor,
                  )}`}
                >
                  {selectedRequest.customerStatus}
                </span>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold leading-none"
              >
                &times;
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedRequest.title}
                </h2>
                <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {selectedRequest.description}
                </div>
              </div>

              {selectedRequest.rejection_or_decline_reason && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-700 dark:text-rose-300">
                  <span className="font-bold">Decline Explanation: </span>
                  {selectedRequest.rejection_or_decline_reason}
                </div>
              )}

              {/* Messages Thread */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Clarification Messages
                </h3>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {selectedRequest.messages && selectedRequest.messages.length > 0 ? (
                    selectedRequest.messages.map((m) => (
                      <div
                        key={m.id}
                        className={`p-3 rounded-lg text-xs ${
                          m.sender_type === 'CLIENT_CONTACT'
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800'
                            : 'bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold mb-1">
                          <span>{m.authorName || (m.sender_type === 'CLIENT_CONTACT' ? 'You' : 'Support Team')}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap">{m.message}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 italic">No messages yet.</div>
                  )}
                </div>

                <form onSubmit={handleSendReply} className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <input
                    type="text"
                    required
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type your response to the support team..."
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                  />
                  <button
                    type="submit"
                    disabled={sendingReply || !replyMessage.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Reply
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CustomerPortalWorkspace;
