import React, { useState, useEffect } from 'react';
import { mastersApi } from '../../api/endpoints';
import {
  Branch,
  Department,
  Designation,
  User,
  TaskType,
  TaskWorkflowStatus,
} from '../../types';
import {
  Building2,
  Users,
  Briefcase,
  GitBranch,
  Plus,
  ShieldCheck,
  MapPin,
  Lock,
} from 'lucide-react';

export const AdminMastersView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'branches' | 'departments' | 'users' | 'workflows'>('branches');

  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [statuses, setStatuses] = useState<TaskWorkflowStatus[]>([]);
  const [loading, setLoading] = useState(true);

  // New Branch Form
  const [newBranchOpen, setNewBranchOpen] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [city, setCity] = useState('');
  const [radiusMeters, setRadiusMeters] = useState('200');

  // New Employee Form
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [empCode, setEmpCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('User@123456');
  const [userBranchId, setUserBranchId] = useState('');
  const [userDeptId, setUserDeptId] = useState('');
  const [userDesigId, setUserDesigId] = useState('');
  const [roleId, setRoleId] = useState('00000000-0000-0000-0000-000000000104'); // Dev role
  const [isEmailLogin, setIsEmailLogin] = useState(true);
  const [isOtpLogin, setIsOtpLogin] = useState(true);

  const fetchAllMasters = async () => {
    setLoading(true);
    try {
      const [bRes, dRes, desRes, uRes, ttRes, stRes]: any = await Promise.all([
        mastersApi.getBranches(),
        mastersApi.getDepartments(),
        mastersApi.getDesignations(),
        mastersApi.getUsers(),
        mastersApi.getTaskTypes(),
        mastersApi.getWorkflowStatuses(),
      ]);

      const branchList = bRes?.data || bRes || [];
      setBranches(branchList);
      if (branchList.length > 0 && !userBranchId) {
        setUserBranchId(branchList[0].id);
      }

      const deptList = dRes?.data || dRes || [];
      setDepartments(deptList);
      if (deptList.length > 0 && !userDeptId) {
        setUserDeptId(deptList[0].id);
      }

      const desigList = desRes?.data || desRes || [];
      setDesignations(desigList);
      if (desigList.length > 0 && !userDesigId) {
        setUserDesigId(desigList[0].id);
      }

      setUsers(uRes?.data?.users || uRes?.data || []);
      setTaskTypes(ttRes?.data || ttRes || []);
      setStatuses(stRes?.data || stRes || []);
    } catch (err) {
      console.error('Failed to load masters:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllMasters();
  }, []);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await mastersApi.createBranch({
        branchName,
        branchCode,
        city,
        geofenceRadiusMeters: parseInt(radiusMeters, 10) || 200,
      });
      setNewBranchOpen(false);
      setBranchName('');
      setBranchCode('');
      setCity('');
      fetchAllMasters();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create branch');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await mastersApi.createUser({
        employeeCode: empCode,
        firstName,
        lastName,
        email,
        mobileNumber: mobileNumber || undefined,
        password,
        primaryBranchId: userBranchId,
        departmentId: userDeptId || undefined,
        designationId: userDesigId || undefined,
        roleId,
        isEmailLoginAllowed: isEmailLogin,
        isOtpLoginAllowed: isOtpLogin,
      });
      setNewUserOpen(false);
      setEmpCode('');
      setFirstName('');
      setLastName('');
      setEmail('');
      setMobileNumber('');
      fetchAllMasters();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to provision user');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Organizational Masters & Setup
          </h1>
          <p className="text-xs text-slate-400">
            Multi-branch management, hierarchy levels, employee provisioning and dynamic task workflows
          </p>
        </div>

        <div className="flex gap-2">
          {activeTab === 'branches' && (
            <button
              onClick={() => setNewBranchOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> Add Branch
            </button>
          )}

          {activeTab === 'users' && (
            <button
              onClick={() => setNewUserOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> Provision Employee
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('branches')}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-semibold transition ${
            activeTab === 'branches'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Building2 className="h-4 w-4" /> Branches ({branches.length})
        </button>
        <button
          onClick={() => setActiveTab('departments')}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-semibold transition ${
            activeTab === 'departments'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Briefcase className="h-4 w-4" /> Depts & Designations ({departments.length}/{designations.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-semibold transition ${
            activeTab === 'users'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Users className="h-4 w-4" /> Employees & RBAC ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('workflows')}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-semibold transition ${
            activeTab === 'workflows'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <GitBranch className="h-4 w-4" /> Dynamic Workflows ({statuses.length})
        </button>
      </div>

      {/* Tab 1: Branches */}
      {activeTab === 'branches' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((b) => (
            <div
              key={b.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400">
                    {b.branch_code}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {b.branch_name}
                  </h3>
                </div>
                {b.is_head_office && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-bold text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                    Head Office
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                <span>{b.city || 'Operational Hub'} • Geofence: {b.geofence_radius_meters || 200}m</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Departments & Designations */}
      {activeTab === 'departments' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Departments */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Departments</h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {departments.map((d) => (
                <div key={d.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 mr-2">
                      {d.department_code}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {d.department_name}
                    </span>
                  </div>
                  <span className="text-slate-400 text-[11px]">
                    HOD: {d.hod_name || 'Assigned via Matrix'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Designations */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Designation Hierarchy (Levels 1-20)</h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {designations.map((des) => (
                <div key={des.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 mr-2">
                      {des.designation_code}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {des.designation_name}
                    </span>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    Level {des.level}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Employees & RBAC */}
      {activeTab === 'users' && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/70 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3">Employee Code</th>
                <th className="px-4 py-3">Full Name</th>
                <th className="px-4 py-3">Corporate Email</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Designation / Role</th>
                <th className="px-4 py-3">Auth Methods</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                    {u.employee_code}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                    {u.first_name} {u.last_name}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{u.email}</td>
                  <td className="px-4 py-3">{u.branch_name || 'Primary'}</td>
                  <td className="px-4 py-3">
                    <span className="block font-medium text-slate-700 dark:text-slate-300">
                      {u.designation_name || 'Staff'}
                    </span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400">{u.role_name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 text-[10px]">
                      {u.is_email_login_allowed && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.2 dark:bg-slate-800">Email</span>
                      )}
                      {u.is_otp_login_allowed && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.2 dark:bg-slate-800">OTP</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 4: Dynamic Workflows */}
      {activeTab === 'workflows' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Task Types */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Dynamic Task Types</h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {taskTypes.map((tt) => (
                <div key={tt.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: tt.color_code || '#3b82f6' }}
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {tt.type_name}
                    </span>
                  </div>
                  <span className="text-slate-400 text-[11px]">
                    {tt.is_chargeable_default ? 'Chargeable by default' : 'Non-billable by default'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Workflow Statuses */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Workflow Status Stages</h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {statuses.map((s) => (
                <div key={s.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: s.color_code || '#3b82f6' }}
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {s.status_name}
                    </span>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    Stage {s.stage_order}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Branch */}
      {newBranchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Company Branch</h3>
            <form onSubmit={handleCreateBranch} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Branch Code *</label>
                <input
                  type="text"
                  required
                  value={branchCode}
                  onChange={(e) => setBranchCode(e.target.value.toUpperCase())}
                  placeholder="e.g. BR-PUNE"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Branch Name *</label>
                <input
                  type="text"
                  required
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="e.g. Pune Tech Center"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Pune"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Geofence Radius (meters)</label>
                <input
                  type="number"
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setNewBranchOpen(false)}
                  className="rounded-xl px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
                >
                  Save Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Provision Employee */}
      {newUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 my-8">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Provision New Employee Account</h3>
            <p className="text-[11px] text-slate-400 mt-1">Admin provisioning with dual login and role assignment</p>
            <form onSubmit={handleCreateUser} className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Emp Code *</label>
                  <input
                    type="text"
                    required
                    value={empCode}
                    onChange={(e) => setEmpCode(e.target.value.toUpperCase())}
                    placeholder="EMP-0010"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">First Name *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Rahul"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Sharma"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Corporate Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rahul@kashvirainfotech.com"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Mobile Number (for OTP)</label>
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="+919876543210"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Initial Password *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Branch *</label>
                  <select
                    value={userBranchId}
                    onChange={(e) => setUserBranchId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-2 py-2 dark:border-slate-700 dark:bg-slate-800"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.branch_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Department</label>
                  <select
                    value={userDeptId}
                    onChange={(e) => setUserDeptId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-2 py-2 dark:border-slate-700 dark:bg-slate-800"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.department_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Designation</label>
                  <select
                    value={userDesigId}
                    onChange={(e) => setUserDesigId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-2 py-2 dark:border-slate-700 dark:bg-slate-800"
                  >
                    {designations.map((des) => (
                      <option key={des.id} value={des.id}>
                        {des.designation_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEmailLogin}
                    onChange={(e) => setIsEmailLogin(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Allow Email Login</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isOtpLogin}
                    onChange={(e) => setIsOtpLogin(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Allow Mobile OTP Login</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setNewUserOpen(false)}
                  className="rounded-xl px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
