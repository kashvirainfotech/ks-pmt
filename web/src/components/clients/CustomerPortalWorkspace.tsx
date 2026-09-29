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
} from 'lucide-react';
import { clientPortalApi } from '../../api/endpoints';
import { ClientIntakeRequest } from '../../types';

export const CustomerPortalWorkspace: React.FC = () => {
  const [portalContext, setPortalContext] = useState<any>(null);
  const [requests, setRequests] = useState<ClientIntakeRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'REQUESTS' | 'PROJECTS' | 'PRODUCTS' | 'REQUIREMENTS'>('REQUESTS');

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
