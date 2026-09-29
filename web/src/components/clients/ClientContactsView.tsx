import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Mail,
  Send,
  Plus,
  Search,
  Filter,
  ShieldCheck,
  Building2,
  FolderGit2,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { clientPortalApi, clientsApi, projectsApi } from '../../api/endpoints';
import { ClientContact, ClientContactProjectGrant } from '../../types';

export const ClientContactsView: React.FC = () => {
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [showGrantsModal, setShowGrantsModal] = useState<boolean>(false);
  const [selectedContact, setSelectedContact] = useState<ClientContact | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<{ token: string; link: string } | null>(null);

  // Invite Form State
  const [inviteForm, setInviteForm] = useState({
    clientId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    jobTitle: '',
    portalRole: 'CLIENT_USER' as 'CLIENT_USER' | 'CLIENT_ADMIN',
    isApprover: false,
    selectedProjectIds: [] as string[],
  });

  // Grants Form State
  const [contactGrants, setContactGrants] = useState<ClientContactProjectGrant[]>([]);

  useEffect(() => {
    loadData();
  }, [selectedClientId, statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [contactsRes, clientsRes, projectsRes] = await Promise.all([
        clientPortalApi.getContacts({
          clientId: selectedClientId || undefined,
          status: statusFilter || undefined,
          search: searchQuery || undefined,
        }),
        clientsApi.getAll({ limit: 100 }),
        projectsApi.getProjects({ limit: 100 }),
      ]);
      setContacts(contactsRes.data || []);
      setClients(clientsRes.data || []);
      setProjects(projectsRes.data || []);
    } catch (err) {
      console.error('Failed to load client contacts data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleOpenInvite = () => {
    setInviteForm({
      clientId: clients[0]?.id || '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      jobTitle: '',
      portalRole: 'CLIENT_USER',
      isApprover: false,
      selectedProjectIds: [],
    });
    setInviteResult(null);
    setShowInviteModal(true);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const grants = inviteForm.selectedProjectIds.map((pid) => ({
        projectId: pid,
        canViewMilestones: true,
        canCreateRequests: true,
        canApproveScope: inviteForm.isApprover,
        canApproveUat: inviteForm.isApprover,
      }));

      const res = await clientPortalApi.inviteContact({
        clientId: inviteForm.clientId,
        firstName: inviteForm.firstName,
        lastName: inviteForm.lastName,
        email: inviteForm.email,
        phone: inviteForm.phone || undefined,
        jobTitle: inviteForm.jobTitle || undefined,
        portalRole: inviteForm.portalRole,
        isApprover: inviteForm.isApprover,
        projectGrants: grants,
      });

      setInviteResult({
        token: res.data.invitationToken,
        link: `${window.location.origin}${res.data.invitationLink}`,
      });
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to invite client contact');
    }
  };

  const handleResendInvite = async (contactId: string) => {
    try {
      const res = await clientPortalApi.resendInvite(contactId);
      alert(`Invitation resent! Token: ${res.data.invitationToken}`);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to resend invitation');
    }
  };

  const handleRevoke = async (contactId: string) => {
    if (!window.confirm('Are you sure you want to revoke portal access for this contact?')) return;
    try {
      await clientPortalApi.revokeContact(contactId);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to revoke access');
    }
  };

  const handleOpenGrants = async (contact: ClientContact) => {
    setSelectedContact(contact);
    try {
      const res = await clientPortalApi.getContactById(contact.id);
      const existing = res.data.projectGrants || [];
      setContactGrants(existing);
      setShowGrantsModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveGrants = async () => {
    if (!selectedContact) return;
    try {
      await clientPortalApi.updateProjectGrants(selectedContact.id, {
        grants: contactGrants,
      });
      setShowGrantsModal(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update project grants');
    }
  };

  const toggleProjectGrant = (projectId: string) => {
    const exists = contactGrants.find((g) => g.project_id === projectId);
    if (exists) {
      setContactGrants(contactGrants.filter((g) => g.project_id !== projectId));
    } else {
      setContactGrants([
        ...contactGrants,
        {
          project_id: projectId,
          can_view_milestones: true,
          can_create_requests: true,
          can_approve_scope: selectedContact?.is_approver || false,
          can_approve_uat: selectedContact?.is_approver || false,
        },
      ]);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(id);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const clientProjects = selectedContact
    ? projects.filter((p) => p.client_id === selectedContact.client_id)
    : projects;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Client Contacts & Portal Access
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage customer organization contacts, invitation-only portal access, and project boundaries (CLIENT-001)
          </p>
        </div>
        <button
          onClick={handleOpenInvite}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Invite Client Contact
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Contacts</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{contacts.length}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Active Users</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            {contacts.filter((c) => c.status === 'ACTIVE').length}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Pending Invites</span>
          <div className="text-2xl font-bold text-amber-500 mt-1">
            {contacts.filter((c) => c.status === 'INVITED').length}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Authorized Approvers</span>
          <div className="text-2xl font-bold text-purple-600 mt-1">
            {contacts.filter((c) => c.is_approver).length}
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-sm font-medium rounded-lg text-slate-700 dark:text-slate-200"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-3">
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
          >
            <option value="">All Client Companies</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company_name} ({c.client_code})
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INVITED">Invited</option>
            <option value="REVOKED">Revoked</option>
          </select>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-5 py-3.5">Contact Person</th>
                <th className="px-5 py-3.5">Client Company</th>
                <th className="px-5 py-3.5">Portal Role & Rights</th>
                <th className="px-5 py-3.5">Project Scope</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Last Login</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    Loading client contacts...
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    No client contacts found matching your filters.
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {contact.first_name} {contact.last_name}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3" />
                        {contact.email}
                      </div>
                      {contact.job_title && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {contact.job_title}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {contact.company_name}
                      </div>
                      <span className="text-xs text-slate-400 font-mono">{contact.client_code}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            contact.portal_role === 'CLIENT_ADMIN'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          }`}
                        >
                          {contact.portal_role === 'CLIENT_ADMIN' ? 'Client Admin' : 'Client User'}
                        </span>
                        {contact.is_approver && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            Approver
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleOpenGrants(contact)}
                        className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5"
                      >
                        <FolderGit2 className="w-3.5 h-3.5" />
                        {contact.granted_project_count || 0} Projects Assigned
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                          contact.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : contact.status === 'INVITED'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                        }`}
                      >
                        {contact.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {contact.last_login_at
                        ? new Date(contact.last_login_at).toLocaleDateString()
                        : 'Never logged in'}
                    </td>
                    <td className="px-5 py-4 text-right space-x-2">
                      {contact.status === 'INVITED' && (
                        <button
                          onClick={() => handleResendInvite(contact.id)}
                          className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded transition"
                          title="Resend invitation email"
                        >
                          Resend
                        </button>
                      )}
                      {contact.status !== 'REVOKED' && (
                        <button
                          onClick={() => handleRevoke(contact.id)}
                          className="px-2.5 py-1 text-xs font-medium bg-red-50 hover:bg-red-100 text-red-600 rounded transition"
                          title="Revoke access"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-indigo-600" />
                Invite Client Contact
              </h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            {inviteResult ? (
              <div className="p-6 space-y-4">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    Invitation Link Generated Successfully!
                  </div>
                  <p className="text-xs mt-1">
                    An activation email has been scheduled. You can also directly provide this activation link to the client contact:
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={inviteResult.link}
                      className="text-xs w-full bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded px-2.5 py-1.5 font-mono"
                    />
                    <button
                      onClick={() => copyToClipboard(inviteResult.link, 'modal-link')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1 whitespace-nowrap"
                    >
                      {copiedToken === 'modal-link' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      Copy
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg text-sm font-medium"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendInvite} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Client Organization *
                  </label>
                  <select
                    required
                    value={inviteForm.clientId}
                    onChange={(e) =>
                      setInviteForm({
                        ...inviteForm,
                        clientId: e.target.value,
                        selectedProjectIds: [],
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.company_name} ({c.client_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={inviteForm.firstName}
                      onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={inviteForm.lastName}
                      onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Corporate Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                    placeholder="contact@clientdomain.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={inviteForm.phone}
                      onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Job Title / Designation
                    </label>
                    <input
                      type="text"
                      value={inviteForm.jobTitle}
                      onChange={(e) => setInviteForm({ ...inviteForm, jobTitle: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                      placeholder="e.g. Lead Project Manager"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Portal Role
                    </label>
                    <select
                      value={inviteForm.portalRole}
                      onChange={(e) =>
                        setInviteForm({
                          ...inviteForm,
                          portalRole: e.target.value as 'CLIENT_USER' | 'CLIENT_ADMIN',
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                    >
                      <option value="CLIENT_USER">Client User</option>
                      <option value="CLIENT_ADMIN">Client Admin (Can Invite Team)</option>
                    </select>
                  </div>
                  <div className="flex items-center pt-5">
                    <label className="relative flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={inviteForm.isApprover}
                        onChange={(e) => setInviteForm({ ...inviteForm, isApprover: e.target.checked })}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <span>Authorized Approver (Scope & UAT)</span>
                    </label>
                  </div>
                </div>

                {/* Project Access Multi-check */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Grant Access to Projects:
                  </label>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                    {projects
                      .filter((p) => p.client_id === inviteForm.clientId)
                      .map((p) => (
                        <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={inviteForm.selectedProjectIds.includes(p.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setInviteForm({
                                  ...inviteForm,
                                  selectedProjectIds: [...inviteForm.selectedProjectIds, p.id],
                                });
                              } else {
                                setInviteForm({
                                  ...inviteForm,
                                  selectedProjectIds: inviteForm.selectedProjectIds.filter((id) => id !== p.id),
                                });
                              }
                            }}
                            className="rounded border-slate-300 text-indigo-600 w-3.5 h-3.5"
                          />
                          <span className="font-medium text-slate-800 dark:text-slate-200">{p.project_name}</span>
                          <span className="text-slate-400 font-mono">({p.project_code})</span>
                        </label>
                      ))}
                    {projects.filter((p) => p.client_id === inviteForm.clientId).length === 0 && (
                      <div className="text-slate-400 italic">No projects found for this client company.</div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm"
                  >
                    Send Invitation
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Project Grants Modal */}
      {showGrantsModal && selectedContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-xl w-full border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FolderGit2 className="w-5 h-5 text-indigo-600" />
                  Project Grants for {selectedContact.first_name} {selectedContact.last_name}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Client: {selectedContact.company_name} | Role: {selectedContact.portal_role}
                </p>
              </div>
              <button
                onClick={() => setShowGrantsModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure explicit project boundaries. Client contacts can only view milestones and submit intake requests for checked projects.
              </p>

              {clientProjects.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No projects are registered under this client organization.
                </div>
              ) : (
                <div className="space-y-3">
                  {clientProjects.map((p) => {
                    const grant = contactGrants.find((g) => g.project_id === p.id);
                    const isGranted = !!grant;
                    return (
                      <div
                        key={p.id}
                        className={`p-3 rounded-lg border text-sm transition ${
                          isGranted
                            ? 'border-indigo-300 bg-indigo-50/50 dark:border-indigo-800 dark:bg-indigo-950/20'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2.5 font-semibold text-slate-900 dark:text-white cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isGranted}
                              onChange={() => toggleProjectGrant(p.id)}
                              className="rounded border-slate-300 text-indigo-600 w-4 h-4"
                            />
                            <span>{p.project_name}</span>
                            <span className="text-xs font-mono text-slate-400">({p.project_code})</span>
                          </label>
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {p.project_status}
                          </span>
                        </div>

                        {isGranted && grant && (
                          <div className="mt-3 pl-6 grid grid-cols-2 gap-2 text-xs border-t border-indigo-100 dark:border-indigo-900/50 pt-2 text-slate-600 dark:text-slate-400">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={grant.can_create_requests}
                                onChange={(e) => {
                                  setContactGrants(
                                    contactGrants.map((g) =>
                                      g.project_id === p.id
                                        ? { ...g, can_create_requests: e.target.checked }
                                        : g,
                                    ),
                                  );
                                }}
                                className="rounded text-indigo-600 w-3.5 h-3.5"
                              />
                              <span>Can Submit Requests</span>
                            </label>

                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={grant.can_view_milestones}
                                onChange={(e) => {
                                  setContactGrants(
                                    contactGrants.map((g) =>
                                      g.project_id === p.id
                                        ? { ...g, can_view_milestones: e.target.checked }
                                        : g,
                                    ),
                                  );
                                }}
                                className="rounded text-indigo-600 w-3.5 h-3.5"
                              />
                              <span>Can View Milestones</span>
                            </label>

                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={grant.can_approve_scope}
                                onChange={(e) => {
                                  setContactGrants(
                                    contactGrants.map((g) =>
                                      g.project_id === p.id
                                        ? { ...g, can_approve_scope: e.target.checked }
                                        : g,
                                    ),
                                  );
                                }}
                                className="rounded text-indigo-600 w-3.5 h-3.5"
                              />
                              <span>Can Approve Scope</span>
                            </label>

                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={grant.can_approve_uat}
                                onChange={(e) => {
                                  setContactGrants(
                                    contactGrants.map((g) =>
                                      g.project_id === p.id
                                        ? { ...g, can_approve_uat: e.target.checked }
                                        : g,
                                    ),
                                  );
                                }}
                                className="rounded text-indigo-600 w-3.5 h-3.5"
                              />
                              <span>Can Sign-off UAT</span>
                            </label>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowGrantsModal(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGrants}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm"
              >
                Save Project Grants
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ClientContactsView;
