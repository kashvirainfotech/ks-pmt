import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { tasksApi, mastersApi, projectsApi } from '../../api/endpoints';
import { TaskType, Project, Product, TaskWorkflowStatus } from '../../types';
import { X, Plus, AlertCircle } from 'lucide-react';

interface CreateTaskModalProps {
  initialStatusId?: string;
  onClose: () => void;
  onCreated: () => void;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  initialStatusId,
  onClose,
  onCreated,
}) => {
  const { selectedBranchId, branches } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [branchId, setBranchId] = useState(selectedBranchId || branches[0]?.id || '');
  const [taskTypeId, setTaskTypeId] = useState('');
  const [statusId, setStatusId] = useState(initialStatusId || '');
  const [projectId, setProjectId] = useState('');
  const [productId, setProductId] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [estimatedHours, setEstimatedHours] = useState('4');
  const [plannedStartDate, setPlannedStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [plannedDueDate, setPlannedDueDate] = useState('');
  const [isChargeable, setIsChargeable] = useState(false);
  const [chargeAmount, setChargeAmount] = useState('0');

  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [statuses, setStatuses] = useState<TaskWorkflowStatus[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [ttRes, stRes, pRes, prdRes]: any = await Promise.all([
          mastersApi.getTaskTypes(),
          mastersApi.getWorkflowStatuses(),
          projectsApi.getProjects(),
          projectsApi.getProducts(),
        ]);

        const typesList = ttRes?.data || ttRes || [];
        setTaskTypes(typesList);
        if (typesList.length > 0 && !taskTypeId) {
          setTaskTypeId(typesList[0].id);
          setIsChargeable(typesList[0].is_chargeable_default || false);
        }

        const statusesList = stRes?.data || stRes || [];
        setStatuses(statusesList);
        if (!statusId && statusesList.length > 0) {
          const initial = statusesList.find((s: any) => s.is_initial) || statusesList[0];
          setStatusId(initial.id);
        }

        setProjects(pRes?.data || pRes || []);
        setProducts(prdRes?.data || prdRes || []);
      } catch (err) {}
    };
    fetchMetadata();
  }, []);

  const handleTaskTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    setTaskTypeId(selectedId);
    const found = taskTypes.find((t) => t.id === selectedId);
    if (found) {
      setIsChargeable(found.is_chargeable_default || false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !taskTypeId || !statusId || !branchId) {
      setError('Please fill in required fields (Title, Branch, Task Type, Status)');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await tasksApi.createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        branchId,
        taskTypeId,
        statusId,
        projectId: projectId || undefined,
        productId: productId || undefined,
        priority,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
        plannedStartDate: plannedStartDate || undefined,
        plannedDueDate: plannedDueDate || undefined,
        isChargeable,
        chargeAmount: isChargeable ? parseFloat(chargeAmount) : 0,
      });

      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 my-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Create New Task</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300">
              Task Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement AWS S3 Pre-signed URL uploads"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail task requirements, acceptance criteria..."
              className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">Branch *</label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.branch_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">Task Type *</label>
              <select
                value={taskTypeId}
                onChange={handleTaskTypeChange}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
              >
                {taskTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.type_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">Initial Status *</label>
              <select
                value={statusId}
                onChange={(e) => setStatusId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
              >
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.status_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">Priority</label>
              <select
                value={priority}
                onChange={(e: any) => setPriority(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">Project (Optional)</label>
              <select
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  if (e.target.value) setProductId('');
                }}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">None / Independent</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.project_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">Product (Optional)</label>
              <select
                value={productId}
                onChange={(e) => {
                  setProductId(e.target.value);
                  if (e.target.value) setProjectId('');
                }}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">None / Independent</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.product_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">Estimated (Hours)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">Start Date</label>
              <input
                type="date"
                value={plannedStartDate}
                onChange={(e) => setPlannedStartDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">Due Date</label>
              <input
                type="date"
                value={plannedDueDate}
                onChange={(e) => setPlannedDueDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          {/* Chargeable Toggle & Amount */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/40 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isChargeable}
                onChange={(e) => setIsChargeable(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Chargeable / Billable Task
              </span>
            </label>

            {isChargeable && (
              <div className="flex items-center gap-2">
                <span>Amount (₹):</span>
                <input
                  type="number"
                  value={chargeAmount}
                  onChange={(e) => setChargeAmount(e.target.value)}
                  className="w-28 rounded-lg border border-slate-200 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
