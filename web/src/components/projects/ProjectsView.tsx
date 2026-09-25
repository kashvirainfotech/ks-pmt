import React, { useState, useEffect } from 'react';
import { projectsApi, mastersApi } from '../../api/endpoints';
import { Project, Product, Client, Version, User } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  FolderKanban,
  Package,
  Layers,
  Plus,
  DollarSign,
  Clock,
  Calendar,
  Building,
  CheckCircle2,
} from 'lucide-react';

export const ProjectsView: React.FC = () => {
  const { user, selectedBranchId, branches } = useAuth();
  const [activeTab, setActiveTab] = useState<'projects' | 'products' | 'versions'>('projects');
  const [projects, setProjects] = useState<Project[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // New Project Modal
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectCode, setProjectCode] = useState('');
  const [clientId, setClientId] = useState('');
  const [projectBranchId, setProjectBranchId] = useState('');
  const [projectManagerId, setProjectManagerId] = useState('');
  const [billingType, setBillingType] = useState('FIXED_COST');
  const [contractAmount, setContractAmount] = useState('500000');
  const [budgetHours, setBudgetHours] = useState('200');

  // Synchronize modal branch when selectedBranchId changes or modal opens
  useEffect(() => {
    if (selectedBranchId) {
      setProjectBranchId(selectedBranchId);
    } else if (user?.primary_branch_id) {
      setProjectBranchId(user.primary_branch_id);
    } else if (branches.length > 0) {
      setProjectBranchId(branches[0].id);
    }
  }, [selectedBranchId, user, branches, createProjectOpen]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [projRes, prodRes, verRes, clientRes, usersRes]: any = await Promise.all([
        projectsApi.getProjects(selectedBranchId ? { branchId: selectedBranchId } : undefined),
        projectsApi.getProducts(),
        projectsApi.getVersions(),
        projectsApi.getClients(),
        mastersApi.getUsers({ limit: 100 }),
      ]);

      setProjects(projRes?.data || projRes || []);
      setProducts(prodRes?.data || prodRes || []);
      setVersions(verRes?.data || verRes || []);
      setClients(clientRes?.data || clientRes || []);
      setUsers(usersRes?.data?.users || usersRes?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedBranchId]);

  const isUUID = (val?: string | null): val is string =>
    typeof val === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const branchIdToSend = projectBranchId || selectedBranchId || user?.primary_branch_id;
      const pmIdToSend = projectManagerId || user?.id;

      const payload: any = {
        projectName,
        projectCode,
        billingType,
        contractAmount: parseFloat(contractAmount) || 0,
        budgetedHours: parseFloat(budgetHours) || 0,
      };

      if (isUUID(clientId)) {
        payload.clientId = clientId.trim();
      }
      if (isUUID(branchIdToSend)) {
        payload.branchId = branchIdToSend.trim();
      }
      if (isUUID(pmIdToSend)) {
        payload.projectManagerUserId = pmIdToSend.trim();
      }

      await projectsApi.createProject(payload);
      setCreateProjectOpen(false);
      setProjectName('');
      setProjectCode('');
      setClientId('');
      fetchData();
    } catch (err: any) {
      const msg = Array.isArray(err.response?.data?.message)
        ? err.response.data.message.join(', ')
        : err.response?.data?.message || 'Failed to create project';
      alert(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Projects & Software Products
          </h1>
          <p className="text-xs text-slate-400">
            Enterprise custom development projects, product licensing and sprint milestones
          </p>
        </div>

        <div className="flex gap-2">
          {activeTab === 'projects' && (
            <button
              onClick={() => setCreateProjectOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> Add Project
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('projects')}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-semibold transition ${
            activeTab === 'projects'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <FolderKanban className="h-4 w-4" /> Client Projects ({projects.length})
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-semibold transition ${
            activeTab === 'products'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Package className="h-4 w-4" /> Software Products ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('versions')}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-semibold transition ${
            activeTab === 'versions'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Layers className="h-4 w-4" /> Releases & Versions ({versions.length})
        </button>
      </div>

      {/* Tab 1: Client Projects */}
      {activeTab === 'projects' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-slate-400">
              No projects added yet
            </div>
          ) : (
            projects.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400">
                      {p.project_code}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {p.project_name}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Client: {p.client_name || 'Internal Product'}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
                        <Building className="h-3 w-3 text-blue-500" />
                        {p.branch_name || 'Head Office'}
                      </span>
                      {p.project_manager_name && (
                        <span className="text-slate-400">
                          PM: {p.project_manager_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                    {p.billing_type?.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-3 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400">Contract Amount</span>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{parseFloat(p.contract_amount as any || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Budget Hours</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      {p.total_budget_hours || 0} hrs
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Software Products */}
      {activeTab === 'products' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                    {p.product_code}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {p.product_name}
                  </h3>
                </div>
                <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {p.license_type}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                {p.description || 'Enterprise software product package'}
              </p>
              <div className="border-t border-slate-100 pt-2 dark:border-slate-800 flex justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-400">Standard License</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    ₹{parseFloat(p.standard_license_price as any || 0).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400">Annual AMC</span>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{parseFloat(p.annual_amc_price as any || 0).toLocaleString('en-IN')}/yr
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Versions & Milestones */}
      {activeTab === 'versions' && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/70 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3">Version Tag</th>
                <th className="px-4 py-3">Release Title</th>
                <th className="px-4 py-3">Target Date</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {versions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400">
                    No release versions defined
                  </td>
                </tr>
              ) : (
                versions.map((v) => (
                  <tr key={v.id}>
                    <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {v.version_code}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                      {v.version_name}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {v.release_date ? new Date(v.release_date).toLocaleDateString() : 'Pending'}
                    </td>
                    <td className="px-4 py-3">
                      {v.is_released ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                          Released
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                          In Development
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Create Project */}
      {createProjectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Add New Project</h3>
            <form onSubmit={handleCreateProject} className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Operating Branch *</label>
                  <select
                    value={projectBranchId}
                    onChange={(e) => setProjectBranchId(e.target.value)}
                    required
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.branch_name} {b.is_head_office ? '(HQ)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Project Manager</label>
                  <select
                    value={projectManagerId}
                    onChange={(e) => setProjectManagerId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="">Current User ({user?.first_name || 'Admin'})</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.first_name} {u.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Project Code *</label>
                <input
                  type="text"
                  required
                  value={projectCode}
                  onChange={(e) => setProjectCode(e.target.value.toUpperCase())}
                  placeholder="e.g. PRJ-FINTECH"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Project Name *</label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Banking Portal Overhaul"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Client</label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="">Internal / In-House</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Billing Model</label>
                <select
                  value={billingType}
                  onChange={(e) => setBillingType(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="FIXED_COST">Fixed Cost (Milestone Delivery)</option>
                  <option value="TIME_AND_MATERIAL">Time & Material (Hourly Rate)</option>
                  <option value="RETAINER">Monthly Retainer</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Contract (₹)</label>
                  <input
                    type="number"
                    value={contractAmount}
                    onChange={(e) => setContractAmount(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Budget (Hours)</label>
                  <input
                    type="number"
                    value={budgetHours}
                    onChange={(e) => setBudgetHours(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateProjectOpen(false)}
                  className="rounded-xl px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
                >
                  Save Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
