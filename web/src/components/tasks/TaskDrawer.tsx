import React, { useState, useEffect } from 'react';
import { RecordForm, errorText } from '../management/EntityManager';
import { taskFields } from '../management/config';
import {
  Task,
  TaskWorkflowStatus,
  SubTask,
  TaskComment,
  Attachment,
  TimeLog,
  User,
} from '../../types';
import {
  tasksApi,
  timeLogsApi,
  commentsApi,
  attachmentsApi,
  mastersApi,
} from '../../api/endpoints';
import {
  X,
  CheckSquare,
  Clock,
  MessageSquare,
  Paperclip,
  Play,
  Pause,
  Send,
  Upload,
  Download,
  DollarSign,
  Plus,
  Trash2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import axios from 'axios';

interface TaskDrawerProps {
  task: Task | null;
  onClose: () => void;
  onTaskUpdated: () => void;
}

export const TaskDrawer: React.FC<TaskDrawerProps> = ({
  task,
  onClose,
  onTaskUpdated,
}) => {
  if (!task) return null;

  const [activeTab, setActiveTab] = useState<
    'overview' | 'subtasks' | 'timetracker' | 'attachments' | 'comments'
  >('overview');
  const [allowedStatuses, setAllowedStatuses] = useState<TaskWorkflowStatus[]>(
    [],
  );
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);

  const [editing, setEditing] = useState(false);

  // Subtask form
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Comment form
  const [newCommentText, setNewCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<string | undefined>();

  // Live Timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Manual Time Log form
  const [logHours, setLogHours] = useState('1');
  const [logMinutes, setLogMinutes] = useState('0');
  const [logDescription, setLogDescription] = useState('');
  const [isBillable, setIsBillable] = useState(task.is_chargeable);

  // Attachment upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Status transition state
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Financial edit state
  const [isChargeable, setIsChargeable] = useState(task.is_chargeable);
  const [chargeAmount, setChargeAmount] = useState(task.charge_amount || 0);

  // Load allowed next statuses from dynamic workflow engine
  useEffect(() => {
    const fetchWorkflowData = async () => {
      try {
        const res: any = await mastersApi.getAllowedNextStatuses(
          task.task_type_id,
          task.status_id,
        );
        const data = res?.data || res || [];
        setAllowedStatuses(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn('Could not fetch allowed next statuses:', err);
      }
    };
    fetchWorkflowData();
  }, [task.id, task.status_id, task.task_type_id]);

  // Load Subtasks
  const fetchSubtasks = async () => {
    try {
      const res: any = await tasksApi.getSubtasks(task.id);
      setSubtasks(res?.data || res || []);
    } catch (e) {
      alert(errorText(e));
    }
  };

  // Load Comments
  const fetchComments = async () => {
    try {
      const res: any = await commentsApi.getComments(task.id);
      setComments(res?.data || res || []);
    } catch (e) {
      alert(errorText(e));
    }
  };

  // Load Attachments
  const fetchAttachments = async () => {
    try {
      const res: any = await attachmentsApi.getEntityAttachments(
        'TASK',
        task.id,
      );
      setAttachments(res?.data || res || []);
    } catch (e) {
      alert(errorText(e));
    }
  };

  // Load Time Logs
  const fetchTimeLogs = async () => {
    try {
      const res: any = await timeLogsApi.getTimeLogs({ taskId: task.id });
      setTimeLogs(res?.data?.timeLogs || res?.data || []);
    } catch (e) {
      alert(errorText(e));
    }
  };

  useEffect(() => {
    fetchSubtasks();
    fetchComments();
    fetchAttachments();
    fetchTimeLogs();
  }, [task.id]);

  // Timer Tick
  useEffect(() => {
    let interval: any = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  // Format Timer
  const formatTimer = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle Status Transition
  const handleStatusChange = async (toStatusId: string) => {
    if (!toStatusId || toStatusId === task.status_id) return;
    setStatusUpdating(true);
    try {
      await tasksApi.updateStatus(task.id, toStatusId);
      onTaskUpdated();
    } catch (err: any) {
      alert(
        err.response?.data?.message ||
          'Status transition not allowed by workflow state machine.',
      );
    } finally {
      setStatusUpdating(false);
    }
  };

  // Quick Add Subtask
  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    try {
      await tasksApi.createSubtask(task.id, { title: newSubtaskTitle.trim() });
      setNewSubtaskTitle('');
      fetchSubtasks();
      onTaskUpdated();
    } catch (e) {
      alert(errorText(e));
    }
  };

  // Toggle Subtask
  const handleToggleSubtask = async (
    subtaskId: string,
    isCompleted: boolean,
  ) => {
    try {
      await tasksApi.toggleSubtask(subtaskId, !isCompleted);
      setSubtasks((prev) =>
        prev.map((s) =>
          s.id === subtaskId ? { ...s, is_completed: !isCompleted } : s,
        ),
      );
      onTaskUpdated();
    } catch (e) {
      alert(errorText(e));
    }
  };

  // Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    try {
      await commentsApi.addComment({
        taskId: task.id,
        commentText: newCommentText.trim(),
        parentCommentId: replyTo,
      });
      setReplyTo(undefined);
      setNewCommentText('');
      fetchComments();
    } catch (e) {
      alert(errorText(e));
    }
  };

  // Save Timer as Time Log
  const handleSaveTimer = async () => {
    const totalMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    try {
      await timeLogsApi.logTime({
        taskId: task.id,
        logDate: new Date().toISOString().split('T')[0],
        durationMinutes: totalMinutes,
        description: 'Logged via live task timer',
        isBillable,
      });
      setElapsedSeconds(0);
      setTimerRunning(false);
      fetchTimeLogs();
      onTaskUpdated();
    } catch (e) {
      alert(errorText(e));
    }
  };

  // Save Manual Time Log
  const handleManualLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const duration =
      parseInt(logHours || '0', 10) * 60 + parseInt(logMinutes || '0', 10);
    if (duration <= 0) return;
    try {
      await timeLogsApi.logTime({
        taskId: task.id,
        logDate: new Date().toISOString().split('T')[0],
        durationMinutes: duration,
        description: logDescription || undefined,
        isBillable,
      });
      setLogDescription('');
      fetchTimeLogs();
      onTaskUpdated();
    } catch (e) {
      alert(errorText(e));
    }
  };

  // AWS S3 Direct Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      // 1. Request S3 Pre-Signed Upload URL
      const presignedRes: any = await attachmentsApi.getPresignedUploadUrl({
        entityType: 'TASK',
        entityId: task.id,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        fileSizeBytes: file.size,
      });

      const { uploadUrl, attachmentId } = presignedRes?.data || presignedRes;

      // 2. Direct PUT binary upload to S3
      await axios.put(uploadUrl, file, {
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total,
            );
            setUploadProgress(percent);
          }
        },
      });

      // 3. Confirm upload and save metadata to PostgreSQL
      await attachmentsApi.confirmUpload({ attachmentId });

      fetchAttachments();
      setUploading(false);
    } catch (err: any) {
      setUploadError(
        'Failed to upload file to AWS S3. Please verify network access.',
      );
      setUploading(false);
    }
  };

  // Download Attachment
  const handleDownload = async (attachmentId: string, originalName: string) => {
    try {
      const res: any = await attachmentsApi.getDownloadUrl(attachmentId);
      const downloadUrl = res?.data?.downloadUrl || res?.downloadUrl;
      if (downloadUrl) {
        window.open(downloadUrl, '_blank');
      }
    } catch (err) {
      alert('Could not generate download URL');
    }
  };

  // Save Financial Chargeable update
  const handleSaveChargeable = async () => {
    try {
      await tasksApi.updateChargeable(task.id, isChargeable, chargeAmount);
      onTaskUpdated();
    } catch (e) {
      alert(errorText(e));
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 transition-transform">
      {editing && (
        <div className="overflow-y-auto border-b p-4">
          <RecordForm
            fields={taskFields}
            editing
            initial={{
              ...task,
              assigneeIds: task.assignees?.map((a) => a.user_id),
            }}
            onCancel={() => setEditing(false)}
            onSave={async (values) => {
              await tasksApi.updateTask(task.id, values);
              setEditing(false);
              onTaskUpdated();
            }}
          />
        </div>
      )}
      <button
        className="p-3 text-left text-blue-600"
        onClick={() => setEditing(!editing)}
      >
        Edit task details and assignees
      </button>
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
            {task.task_code}
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{
              backgroundColor: `${task.task_type_color || '#3b82f6'}20`,
              color: task.task_type_color || '#3b82f6',
            }}
          >
            {task.task_type_name || 'Task'}
          </span>
        </div>

        {/* Workflow Status Selector */}
        <div className="flex items-center gap-2">
          <select
            disabled={statusUpdating}
            value={task.status_id}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value={task.status_id}>{task.status_name} (Current)</option>
            {allowedStatuses.map((s) => (
              <option key={s.id} value={s.id}>
                → Transition to: {s.status_name}
              </option>
            ))}
          </select>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Title & Description Brief */}
      <div className="px-6 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800/60">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          {task.title}
        </h2>
        {task.description && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-3">
            {task.description}
          </p>
        )}
      </div>

      {/* Drawer Tabs */}
      <div className="flex border-b border-slate-200 px-6 dark:border-slate-800">
        {[
          { key: 'overview', label: 'Overview', icon: FileText },
          {
            key: 'subtasks',
            label: `Subtasks (${subtasks.length})`,
            icon: CheckSquare,
          },
          { key: 'timetracker', label: 'Time & Effort', icon: Clock },
          {
            key: 'attachments',
            label: `Files (${attachments.length})`,
            icon: Paperclip,
          },
          {
            key: 'comments',
            label: `Comments (${comments.length})`,
            icon: MessageSquare,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-1.5 border-b-2 py-3 px-3 text-xs font-semibold transition ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <span className="text-slate-400">Branch</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {task.branch_name || 'Default Branch'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <span className="text-slate-400">Project / Product</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                  {task.project_name ||
                    task.product_name ||
                    'General / Unassigned'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <span className="text-slate-400">Priority</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {task.priority}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <span className="text-slate-400">Planned Due Date</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {task.planned_due_date
                    ? new Date(task.planned_due_date).toLocaleDateString()
                    : 'None'}
                </p>
              </div>
            </div>

            {/* Financial Tracking Widget */}
            <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-emerald-500" /> Financial
                  & Billing
                </span>
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={isChargeable}
                    onChange={(e) => setIsChargeable(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Chargeable Task</span>
                </label>
              </div>

              {isChargeable && (
                <div className="flex items-center gap-3 pt-2">
                  <span className="text-xs text-slate-500">
                    Charge Amount (₹):
                  </span>
                  <input
                    type="number"
                    value={chargeAmount}
                    onChange={(e) =>
                      setChargeAmount(parseFloat(e.target.value) || 0)
                    }
                    className="w-32 rounded-lg border border-slate-200 px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                  <button
                    onClick={handleSaveChargeable}
                    className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>

            {/* Assignees */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                Assigned Team Members ({task.assignees?.length || 0})
              </h4>
              <div className="flex flex-wrap gap-2">
                {task.assignees && task.assignees.length > 0 ? (
                  task.assignees.map((a) => (
                    <div
                      key={a.id || a.user_id}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs dark:border-slate-800 dark:bg-slate-800"
                    >
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                        {a.first_name ? a.first_name[0] : 'U'}
                      </div>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {a.first_name} {a.last_name}
                      </span>
                      {a.is_primary && (
                        <span className="rounded bg-blue-100 px-1 text-[9px] font-bold text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                          Primary
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    No assignees yet
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Subtasks */}
        {activeTab === 'subtasks' && (
          <div className="space-y-4">
            <form onSubmit={handleAddSubtask} className="flex gap-2">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                placeholder="Add new subtask item..."
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <button
                type="submit"
                className="flex items-center gap-1 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" /> Add
              </button>
            </form>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 space-y-1">
              {subtasks.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">
                  No subtasks created yet
                </p>
              ) : (
                subtasks.map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between py-2.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg transition"
                  >
                    <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={st.is_completed}
                        onChange={() =>
                          handleToggleSubtask(st.id, st.is_completed)
                        }
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span
                        className={`text-xs ${
                          st.is_completed
                            ? 'line-through text-slate-400'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {st.title}
                      </span>
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Time & Effort */}
        {activeTab === 'timetracker' && (
          <div className="space-y-6">
            {/* Live Interactive Timer Widget */}
            <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 dark:border-blue-900 dark:bg-blue-950/30">
              <span className="text-xs font-bold text-blue-900 dark:text-blue-300">
                Live Effort Timer
              </span>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-mono text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                  {formatTimer(elapsedSeconds)}
                </span>
                <div className="flex gap-2">
                  {!timerRunning ? (
                    <button
                      onClick={() => setTimerRunning(true)}
                      className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-blue-700"
                    >
                      <Play className="h-4 w-4" /> Start
                    </button>
                  ) : (
                    <button
                      onClick={() => setTimerRunning(false)}
                      className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-amber-700"
                    >
                      <Pause className="h-4 w-4" /> Pause
                    </button>
                  )}

                  {elapsedSeconds > 0 && (
                    <button
                      onClick={handleSaveTimer}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-emerald-700"
                    >
                      Save Log
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Manual Time Log Form */}
            <form
              onSubmit={handleManualLog}
              className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 space-y-3"
            >
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Log Working Effort Manually
              </h4>
              <div className="flex gap-3">
                <div>
                  <label className="text-[10px] text-slate-400">Hours</label>
                  <input
                    type="number"
                    min="0"
                    value={logHours}
                    onChange={(e) => setLogHours(e.target.value)}
                    className="w-20 rounded-lg border border-slate-200 px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Minutes</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={logMinutes}
                    onChange={(e) => setLogMinutes(e.target.value)}
                    className="w-20 rounded-lg border border-slate-200 px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <input
                  type="text"
                  value={logDescription}
                  onChange={(e) => setLogDescription(e.target.value)}
                  placeholder="Summary of work performed..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <button
                type="submit"
                className="rounded-xl bg-slate-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                Submit Effort Log
              </button>
            </form>

            {/* Past Time Logs */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                Worklog History ({timeLogs.length})
              </h4>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {timeLogs.map((tl) => (
                  <div
                    key={tl.id}
                    className="py-2.5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {tl.user_name || 'Team Member'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {tl.description || 'Logged effort'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        {(tl.duration_minutes / 60).toFixed(1)} hrs
                      </span>
                      <p className="text-[10px] text-slate-400">
                        {tl.log_date}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Attachments (AWS S3) */}
        {activeTab === 'attachments' && (
          <div className="space-y-4">
            {/* Direct AWS S3 Upload Box */}
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center dark:border-slate-800">
              <Upload className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                Upload Attachments to AWS S3
              </p>
              <p className="text-[11px] text-slate-400">
                Direct pre-signed binary upload (PNG, JPG, PDF, ZIP up to 50MB)
              </p>

              <label className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 cursor-pointer">
                <span>Select Document</span>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>

              {uploading && (
                <div className="mt-4 space-y-1">
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden dark:bg-slate-800">
                    <div
                      className="h-full bg-blue-600 transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {uploadProgress}% uploaded to S3
                  </span>
                </div>
              )}

              {uploadError && (
                <p className="mt-2 text-xs text-rose-600">{uploadError}</p>
              )}
            </div>

            {/* Attachments List */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {attachments.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">
                  No attachments found
                </p>
              ) : (
                attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between py-3 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Paperclip className="h-4 w-4 text-blue-500 shrink-0" />
                      <div className="truncate">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {att.original_name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {(att.file_size_bytes / 1024).toFixed(1)} KB •{' '}
                          {new Date(att.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownload(att.id, att.original_name)}
                      className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                      title="Download File"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Threaded Comments */}
        {activeTab === 'comments' && (
          <div className="space-y-4">
            <form onSubmit={handleAddComment} className="space-y-2">
              {replyTo && (
                <button type="button" onClick={() => setReplyTo(undefined)}>
                  Cancel reply
                </button>
              )}
              <textarea
                rows={3}
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Write a comment... (Type @ to mention teammates)"
                className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
                >
                  <Send className="h-3.5 w-3.5" /> Post Comment
                </button>
              </div>
            </form>

            <div className="space-y-3 pt-2">
              {comments.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">
                  No comments yet
                </p>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                          {c.user_name ? c.user_name[0] : 'U'}
                        </div>
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {c.user_name}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(c.created_at).toLocaleString([], {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {c.comment_text}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
