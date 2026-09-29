import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { teamsApi, projectsApi, productsApi } from '../../api/endpoints';
import { DeliveryTeam, TeamMember, User, Project, Product } from '../../types';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Shield,
  Briefcase,
  Layers,
  Search,
  UserPlus,
  UserMinus,
  Check,
  X,
  AlertCircle,
  FolderGit2,
} from 'lucide-react';
import api from '../../api/client';

export const TeamsManagementView: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [teams, setTeams] = useState<DeliveryTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<DeliveryTeam | null>(null);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<DeliveryTeam | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Master options
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Form states
  const [teamCode, setTeamCode] = useState('');
  const [teamName, setTeamName] = useState('');
  const [description, setDescription] = useState('');
  const [leadUserId, setLeadUserId] = useState('');
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Member form state
  const [newMemberUserId, setNewMemberUserId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('DEVELOPER');
  const [newMemberAllocation, setNewMemberAllocation] = useState(100);

  const canManage = hasPermission('TEAMS:MANAGE') || user?.role_code === 'ROLE_SUPER_ADMIN';

  const loadTeams = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await teamsApi.getAll();
      setTeams((res as any)?.data || res || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMasters = useCallback(async () => {
    try {
      const [uRes, pRes, prRes] = await Promise.all([
        api.get('/users'),
        projectsApi.getProjects(),
        productsApi.getProducts(),
      ]);
      setUsers((uRes as any)?.data?.users || (uRes as any)?.data || []);
      setProjects((pRes as any)?.data?.items || (pRes as any)?.data || []);
      setProducts((prRes as any)?.data?.items || (prRes as any)?.data || []);
    } catch (e) {
      console.error('Failed to load masters:', e);
    }
  }, []);

  useEffect(() => {
    loadTeams();
    loadMasters();
  }, [loadTeams, loadMasters]);

  const openCreateModal = () => {
    setEditingTeam(null);
    setTeamCode('');
    setTeamName('');
    setDescription('');
    setLeadUserId('');
    setSelectedProjectIds([]);
    setSelectedProductIds([]);
    setIsTeamModalOpen(true);
  };

  const openEditModal = (t: DeliveryTeam) => {
    setEditingTeam(t);
    setTeamCode(t.team_code);
    setTeamName(t.team_name);
    setDescription(t.description || '');
    setLeadUserId(t.lead_user_id || '');
    setSelectedProjectIds(t.projects?.map((p) => p.id) || []);
    setSelectedProductIds(t.products?.map((p) => p.id) || []);
    setIsTeamModalOpen(true);
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editingTeam) {
        await teamsApi.update(editingTeam.id, {
          teamName,
          description,
          leadUserId: leadUserId || undefined,
          projectIds: selectedProjectIds,
          productIds: selectedProductIds,
        });
      } else {
        await teamsApi.create({
          teamCode,
          teamName,
          description,
          leadUserId: leadUserId || undefined,
          projectIds: selectedProjectIds,
          productIds: selectedProductIds,
        });
      }
      setIsTeamModalOpen(false);
      await loadTeams();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to save delivery team');
    }
  };

  const handleDeleteTeam = async (id: string) => {
    if (!window.confirm('Are you sure you want to deactivate this delivery team?')) return;
    try {
      await teamsApi.delete(id);
      await loadTeams();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to deactivate team');
    }
  };

  const openMembersModal = async (team: DeliveryTeam) => {
    setSelectedTeam(team);
    setIsMembersModalOpen(true);
    try {
      const res = await teamsApi.getById(team.id);
      const data = (res as any)?.data || res;
      setTeamMembers(data?.members || []);
    } catch (err: any) {
      setError('Failed to load team members');
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || !newMemberUserId) return;
    try {
      await teamsApi.addMember(selectedTeam.id, {
        userId: newMemberUserId,
        roleInTeam: newMemberRole,
        allocationPercentage: Number(newMemberAllocation),
      });
      const res = await teamsApi.getById(selectedTeam.id);
      const data = (res as any)?.data || res;
      setTeamMembers(data?.members || []);
      setNewMemberUserId('');
      await loadTeams();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to add team member');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedTeam) return;
    try {
      await teamsApi.removeMember(selectedTeam.id, userId);
      setTeamMembers((prev) => prev.filter((m) => m.user_id !== userId));
      await loadTeams();
    } catch (err: any) {
      setError('Failed to remove team member');
    }
  };

  const filteredTeams = teams.filter(
    (t) =>
      t.team_name.toLowerCase().includes(search.toLowerCase()) ||
      t.team_code.toLowerCase().includes(search.toLowerCase()) ||
      t.lead_name?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Delivery Teams
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cross-branch, independent engineering teams with effective-dated membership and project/product allocations.
          </p>
        </div>

        {canManage && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition"
          >
            <Plus className="h-4 w-4" />
            New Delivery Team
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search teams by code, name, or lead..."
          className="w-full bg-transparent text-xs text-slate-800 focus:outline-hidden dark:text-slate-200"
        />
      </div>

      {/* Teams Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">
          Loading delivery teams...
        </div>
      ) : filteredTeams.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-800">
          <Users className="h-8 w-8 mx-auto text-slate-400" />
          <p className="mt-2 font-medium text-sm text-slate-700 dark:text-slate-300">
            No delivery teams found
          </p>
          <p className="text-xs text-slate-400">
            Create independent teams for backend, frontend, QA, or cross-functional squads.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTeams.map((team) => (
            <div
              key={team.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-blue-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400">
                      {team.team_code}
                    </span>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      {team.team_name}
                    </h3>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(team)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                        title="Edit team"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTeam(team.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                        title="Deactivate team"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <p className="mt-2 text-xs text-slate-500 line-clamp-2 dark:text-slate-400">
                  {team.description || 'No description provided.'}
                </p>

                {/* Team Lead */}
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 font-bold text-[10px] text-white">
                    {team.lead_name ? team.lead_name[0] : 'L'}
                  </div>
                  <div className="text-xs">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {team.lead_name || 'No Lead Assigned'}
                    </p>
                    <p className="text-[10px] text-slate-400">Team Lead</p>
                  </div>
                </div>

                {/* Projects & Products tags */}
                <div className="mt-3 space-y-1.5">
                  {team.projects && team.projects.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 text-[10px]">
                      <Briefcase className="h-3 w-3 text-slate-400 shrink-0" />
                      {team.projects.map((p) => (
                        <span key={p.id} className="rounded bg-blue-50 px-1.5 py-0.5 font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                          {p.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {team.products && team.products.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 text-[10px]">
                      <FolderGit2 className="h-3 w-3 text-slate-400 shrink-0" />
                      {team.products.map((pr) => (
                        <span key={pr.id} className="rounded bg-purple-50 px-1.5 py-0.5 font-medium text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                          {pr.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer KPIs & Manage Members button */}
              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span><strong>{team.member_count}</strong> member{team.member_count === 1 ? '' : 's'}</span>
                  <span>•</span>
                  <span><strong>{team.components_count}</strong> component{team.components_count === 1 ? '' : 's'}</span>
                </div>

                <button
                  onClick={() => openMembersModal(team)}
                  className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  <Users className="h-3.5 w-3.5" />
                  Roster & Roles
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Team Modal */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {editingTeam ? 'Edit Delivery Team' : 'Create Delivery Team'}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Teams are maintained independently of branches and corporate departments.
            </p>

            <form onSubmit={handleSaveTeam} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Team Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingTeam)}
                    value={teamCode}
                    onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                    placeholder="e.g. TEAM-CORE-BE"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-mono uppercase focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Team Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. Core Backend Team"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Primary engineering scope and responsibilities..."
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Team Lead
                </label>
                <select
                  value={leadUserId}
                  onChange={(e) => setLeadUserId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">Select Team Lead (Optional)</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Projects Allocation */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Associated Projects
                </label>
                <div className="mt-1 max-h-32 overflow-y-auto rounded-lg border border-slate-200 p-2 space-y-1 dark:border-slate-700 dark:bg-slate-800/40">
                  {projects.map((p) => {
                    const isChecked = selectedProjectIds.includes(p.id);
                    return (
                      <label key={p.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-50 p-1 rounded dark:hover:bg-slate-800">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProjectIds([...selectedProjectIds, p.id]);
                            } else {
                              setSelectedProjectIds(selectedProjectIds.filter((id) => id !== p.id));
                            }
                          }}
                          className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-medium text-slate-800 dark:text-slate-200">{p.project_name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTeamModalOpen(false)}
                  className="rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
                >
                  <Check className="h-3.5 w-3.5" />
                  Save Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Team Members Roster Modal */}
      {isMembersModalOpen && selectedTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {selectedTeam.team_name} — Member Roster
                </h3>
                <p className="text-xs text-slate-500">
                  Effective-dated member assignments and capacity allocation.
                </p>
              </div>
              <button
                onClick={() => setIsMembersModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Add Member Bar */}
            {canManage && (
              <form onSubmit={handleAddMember} className="mt-4 flex flex-wrap items-end gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Employee
                  </label>
                  <select
                    required
                    value={newMemberUserId}
                    onChange={(e) => setNewMemberUserId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="">Select Employee</option>
                    {users
                      .filter((u) => !teamMembers.some((m) => m.user_id === u.id))
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.first_name} {u.last_name} ({u.employee_code || u.email})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="w-36">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Role in Team
                  </label>
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="DEVELOPER">Developer</option>
                    <option value="LEAD">Tech Lead</option>
                    <option value="QA_ENGINEER">QA Engineer</option>
                    <option value="DEVOPS">DevOps / SRE</option>
                    <option value="PRODUCT_OWNER">Product Owner</option>
                    <option value="UI_DESIGNER">UI/UX Designer</option>
                  </select>
                </div>

                <div className="w-24">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Allocation %
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={newMemberAllocation}
                    onChange={(e) => setNewMemberAllocation(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>

                <button
                  type="submit"
                  className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Add
                </button>
              </form>
            )}

            {/* Members List */}
            <div className="mt-4 max-h-72 overflow-y-auto space-y-2">
              {teamMembers.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No members assigned to this team yet.
                </div>
              ) : (
                teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 font-bold text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                        {member.first_name[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-xs text-slate-800 dark:text-slate-100">
                            {member.first_name} {member.last_name}
                          </p>
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                            {member.role_in_team}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          {member.email} • {member.branch_name || 'All Branches'} • {Number(member.allocation_percentage)}% allocated
                        </p>
                      </div>
                    </div>

                    {canManage && (
                      <button
                        onClick={() => handleRemoveMember(member.user_id)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                        title="Remove member"
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 flex justify-end border-t border-slate-100 pt-3 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsMembersModalOpen(false)}
                className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
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
