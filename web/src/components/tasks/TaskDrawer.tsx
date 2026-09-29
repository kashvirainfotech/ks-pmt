import api from '../../api/client';
import { CreateTaskModal } from './CreateTaskModal';
import { TaskHistory } from './TaskHistory';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { TaskEditor } from './TaskEditor';
import { TaskValues } from './TaskFields';
import { errorText } from '../management/EntityManager';
import {
  Task,
  TaskWorkflowStatus,
  SubTask,
  TaskComment,
  Attachment,
  TimeLog,
  User,
  TaskDependency,
  TaskBlockerEpisode,
  TaskDependencyMap,
} from '../../types';
import {
  tasksApi,
  timeLogsApi,
  commentsApi,
  attachmentsApi,
  mastersApi,
  dependenciesApi,
  blockersApi,
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
  Link2,
  AlertOctagon,
  ShieldAlert,
  GitFork,
  CheckCircle2,
} from 'lucide-react';
import axios from 'axios';
import { DataGrid } from '../common/DataGrid';
import { fetchListing } from '../../api/listings';

interface TaskDrawerProps {
  task: Task | null;
  onClose: () => void;
  onTaskUpdated: () => void;
  startEditing?: boolean;
  fullPage?: boolean;
  onExpand?: () => void;
}

export const TaskDrawer: React.FC<TaskDrawerProps> = ({
  task: incomingTask,
  onClose,
  onTaskUpdated,
  startEditing = false,
  fullPage = false,
  onExpand,
}) => {
  const [task, setTask] = useState(incomingTask!);
  const { hasPermission } = useAuth();
  const [busy, setBusy] = useState(false);
  const savingRef = useRef(false);
  const edits = useRef(new Set<string>());
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const close = useCallback(() => {
    if (savingRef.current) return;
    if (!edits.current.size || window.confirm('Discard unsaved task edits?'))
      closeRef.current();
  }, []);
  useDialogFocus(true, '[data-task-dialog]', close);
  useEffect(() => {
    if (incomingTask) setTask(incomingTask);
  }, [incomingTask]);
  useEffect(() => {
    const prevent = (e: BeforeUnloadEvent) => {
      if (edits.current.size) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, []);
  const reload = async () => {
    const response = await tasksApi.getTaskById(task.id);
    setTask(response.data);
    return response.data.revision;
  };
  const mutate = async (values: TaskValues, assignment = false) => {
    if (savingRef.current)
      throw new Error('Wait for the current save to finish.');
    savingRef.current = true;
    setBusy(true);
    try {
      const payload = { expectedRevision: task.revision, ...values };
      const response = assignment
        ? await tasksApi.saveAssignees(task.id, payload)
        : await tasksApi.patchTask(task.id, payload);
      setTask(
        (current) =>
          ({
            ...current,
            ...response.data,
            ...(assignment
              ? {
                  assignees: values.assigneeIds.map((id: string) => ({
                    user_id: id,
                    full_name: 'Assigned teammate',
                    is_primary_assignee:
                      id ===
                      (values.primaryAssigneeId || values.assigneeIds[0]),
                  })),
                }
              : {}),
          }) as Task,
      );
      // The write is already committed; a refresh failure must not look like a failed save.
      try {
        await reload();
      } catch {
        /* Saved fields remain visible; parent refresh can retry. */
      }
      onTaskUpdated();
    } finally {
      savingRef.current = false;
      setBusy(false);
    }
  };

  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'subtasks'
    | 'dependencies'
    | 'blockers'
    | 'timetracker'
    | 'attachments'
    | 'comments'
    | 'history'
  >('overview');
  const [allowedStatuses, setAllowedStatuses] = useState<TaskWorkflowStatus[]>(
    [],
  );
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);

  // PLAN-002: Dependencies state
  const [outgoingDeps, setOutgoingDeps] = useState<TaskDependency[]>([]);
  const [incomingDeps, setIncomingDeps] = useState<TaskDependency[]>([]);
  const [depMap, setDepMap] = useState<TaskDependencyMap | null>(null);
  const [showDepMap, setShowDepMap] = useState(false);
  const [addDepModalOpen, setAddDepModalOpen] = useState(false);
  const [targetDepTaskId, setTargetDepTaskId] = useState('');
  const [depLinkType, setDepLinkType] = useState('BLOCKS');
  const [depDescription, setDepDescription] = useState('');
  const [depLoading, setDepLoading] = useState(false);
  const [depError, setDepError] = useState('');
  const [allOtherTasks, setAllOtherTasks] = useState<any[]>([]);

  // PLAN-002: Blockers state
  const [blockers, setBlockers] = useState<TaskBlockerEpisode[]>([]);
  const [totalBlockedMinutes, setTotalBlockedMinutes] = useState(0);
  const [isCurrentlyBlocked, setIsCurrentlyBlocked] = useState(false);
  const [addBlockerModalOpen, setAddBlockerModalOpen] = useState(false);
  const [blockerReason, setBlockerReason] = useState('');
  const [blockerCategory, setBlockerCategory] = useState('TECHNICAL');
  const [blockerPriority, setBlockerPriority] = useState('MEDIUM');
  const [blockerNextAction, setBlockerNextAction] = useState('');
  const [blockerExpectedDate, setBlockerExpectedDate] = useState('');
  const [blockerFollowUpDate, setBlockerFollowUpDate] = useState('');
  const [resolveBlockerTarget, setResolveBlockerTarget] = useState<TaskBlockerEpisode | null>(null);
  const [resolveBlockerOutcome, setResolveBlockerOutcome] = useState<'RESOLVED' | 'DISMISSED'>('RESOLVED');
  const [resolveBlockerNotes, setResolveBlockerNotes] = useState('');

  // PLAN-002: Defect Resolution state
  const [defectResolutionModalOpen, setDefectResolutionModalOpen] = useState(false);
  const [pendingToStatusId, setPendingToStatusId] = useState('');
  const [defectResolution, setDefectResolution] = useState('FIXED');
  const [defectResolutionDetails, setDefectResolutionDetails] = useState('');

  // Subtask form
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [createSubtaskOpen, setCreateSubtaskOpen] = useState(false);

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
  const [statusError, setStatusError] = useState('');

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
      setTimeLogs(
        (await fetchListing('/time-logs', { taskId: task.id })) as TimeLog[],
      );
    } catch (e) {
      alert(errorText(e));
    }
  };

  // PLAN-002: Load Dependencies
  const fetchDependencies = async () => {
    try {
      const res = await dependenciesApi.getByTaskId(task.id);
      setOutgoingDeps(res.data?.outgoing || []);
      setIncomingDeps(res.data?.incoming || []);
    } catch (e) {
      console.warn('Could not load dependencies', e);
    }
  };

  // PLAN-002: Load Dependency Map
  const fetchDependencyMap = async () => {
    try {
      const res = await dependenciesApi.getDependencyMap(task.id);
      setDepMap(res.data);
    } catch (e) {
      console.warn('Could not load dependency map', e);
    }
  };

  // PLAN-002: Load Blockers & Non-Overlapping Duration
  const fetchBlockers = async () => {
    try {
      const res = await blockersApi.getByTaskId(task.id);
      setBlockers(res.data?.episodes || []);
      setTotalBlockedMinutes(res.data?.totalNonOverlappingBlockedMinutes || 0);
      setIsCurrentlyBlocked(res.data?.isCurrentlyBlocked || false);
    } catch (e) {
      console.warn('Could not load blockers', e);
    }
  };

  const loadOtherTasks = async () => {
    try {
      const res = await api.get('/tasks', { params: { limit: 100 } });
      const tasksList = (res.data?.data || []).filter((t: any) => t.id !== task.id);
      setAllOtherTasks(tasksList);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSubtasks();
    fetchComments();
    fetchAttachments();
    fetchTimeLogs();
    fetchDependencies();
    fetchBlockers();
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

  // Handle Status Transition with Defect Resolution check
  const handleStatusChange = async (toStatusId: string) => {
    if (!toStatusId || toStatusId === task.status_id) return;
    const dest = allowedStatuses.find((s) => s.id === toStatusId);
    if (
      dest?.is_terminal &&
      ((task as any).type_code === 'BUG' || task.task_type_name === 'Bug / Defect')
    ) {
      setPendingToStatusId(toStatusId);
      setDefectResolution('FIXED');
      setDefectResolutionDetails('');
      setDefectResolutionModalOpen(true);
      return;
    }
    await executeStatusTransition(toStatusId);
  };

  const executeStatusTransition = async (
    toStatusId: string,
    extra?: { resolution?: string; resolutionDetails?: string },
  ) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setStatusUpdating(true);
    setStatusError('');
    try {
      const result = await tasksApi.updateStatus(
        task.id,
        toStatusId,
        undefined,
        task.revision,
        extra,
      );
      setTask((current) => ({ ...current, ...(result as any).data }));
      setDefectResolutionModalOpen(false);
      onTaskUpdated();
    } catch (err: any) {
      setStatusError(errorText(err));
    } finally {
      savingRef.current = false;
      setStatusUpdating(false);
    }
  };

  // PLAN-002: Dependency Handlers
  const handleAddDependency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDepTaskId) return;
    setDepLoading(true);
    setDepError('');
    try {
      await dependenciesApi.create({
        sourceTaskId: task.id,
        targetTaskId: targetDepTaskId,
        linkType: depLinkType,
        description: depDescription.trim() || undefined,
      });
      setAddDepModalOpen(false);
      setTargetDepTaskId('');
      setDepDescription('');
      fetchDependencies();
      reload();
      onTaskUpdated();
    } catch (err: any) {
      setDepError(errorText(err));
    } finally {
      setDepLoading(false);
    }
  };

  const handleRemoveDependency = async (depId: string) => {
    if (!window.confirm('Remove this dependency link?')) return;
    try {
      await dependenciesApi.remove(depId);
      fetchDependencies();
      reload();
      onTaskUpdated();
    } catch (err: any) {
      alert(errorText(err));
    }
  };

  // PLAN-002: Blocker Handlers
  const handleAddBlocker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockerReason.trim()) return;
    try {
      await blockersApi.create({
        taskId: task.id,
        reason: blockerReason.trim(),
        category: blockerCategory,
        priority: blockerPriority,
        nextAction: blockerNextAction.trim() || undefined,
        expectedResolutionDate: blockerExpectedDate
          ? new Date(blockerExpectedDate).toISOString()
          : undefined,
        followUpDate: blockerFollowUpDate
          ? new Date(blockerFollowUpDate).toISOString()
          : undefined,
      });
      setAddBlockerModalOpen(false);
      setBlockerReason('');
      setBlockerNextAction('');
      setBlockerExpectedDate('');
      setBlockerFollowUpDate('');
      fetchBlockers();
      reload();
      onTaskUpdated();
    } catch (err: any) {
      alert(errorText(err));
    }
  };

  const handleResolveBlocker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveBlockerTarget) return;
    try {
      await blockersApi.resolve(resolveBlockerTarget.id, {
        status: resolveBlockerOutcome,
        resolutionNotes: resolveBlockerNotes.trim() || undefined,
      });
      setResolveBlockerTarget(null);
      setResolveBlockerNotes('');
      fetchBlockers();
      reload();
      onTaskUpdated();
    } catch (err: any) {
      alert(errorText(err));
    }
  };

  // Quick Add Subtask
  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    if (
      Object.values((task as any).custom_field_definitions || {}).some(
        (field: any) => field.required && field.default == null,
      )
    ) {
      setCreateSubtaskOpen(true);
      return;
    }
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

  return (
    <>
      {!fullPage && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-slate-950/30"
          onClick={close}
        />
      )}
      <div
        data-task-dialog
        role="dialog"
        aria-modal="true"
        aria-label={`Task ${task.task_code}`}
        className={`fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 ${fullPage ? 'max-w-none' : 'max-w-6xl'}`}
      >
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-800">
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
          <div className="flex max-w-full flex-wrap items-center gap-2">
            <select
              aria-label="Task status"
              disabled={
                statusUpdating || busy || !hasPermission('TASKS:STATUS_CHANGE')
              }
              value={task.status_id}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="max-w-[180px] rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value={task.status_id}>
                {task.status_name} (Current)
              </option>
              {allowedStatuses.map((s) => (
                <option key={s.id} value={s.id}>
                  Transition to: {s.status_name}
                </option>
              ))}
            </select>

            {onExpand && (
              <button
                type="button"
                disabled={busy}
                onClick={onExpand}
                className="rounded-lg px-2 py-1 text-xs text-blue-600"
              >
                {fullPage ? 'Return to drawer' : 'Open full page'}
              </button>
            )}
            <button
              onClick={close}
              aria-label="Close task"
              disabled={busy}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {statusError && (
          <div role="alert" className="px-6 py-3 text-sm text-red-600">
            {statusError}{' '}
            <button
              onClick={() =>
                reload()
                  .then(() => setStatusError(''))
                  .catch((e) => setStatusError(errorText(e)))
              }
              className="underline"
            >
              Reload task
            </button>
          </div>
        )}
        {/* Blocker Alert Banner */}
        {(task.is_blocked || isCurrentlyBlocked) && (
          <div className="flex items-center justify-between bg-rose-50 px-6 py-2.5 text-xs text-rose-700 dark:bg-rose-950/80 dark:text-rose-200 border-b border-rose-200 dark:border-rose-900">
            <div className="flex items-center gap-2">
              <AlertOctagon className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span className="font-bold uppercase tracking-wider">Task Currently Blocked</span>
              <span className="text-slate-500 dark:text-slate-400">
                — {blockers.filter((b) => b.status === 'ACTIVE').length} active blocker episode(s)
              </span>
            </div>
            <button
              type="button"
              className="text-xs font-semibold underline hover:no-underline"
              onClick={() => setActiveTab('blockers')}
            >
              Manage Blockers
            </button>
          </div>
        )}

        {/* Defect Resolution Banner */}
        {task.resolution && (
          <div className="flex items-center justify-between bg-emerald-50 px-6 py-2 text-xs text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-b border-emerald-200 dark:border-emerald-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span className="font-bold">Resolution: {task.resolution}</span>
              {task.resolution_details && <span>— {task.resolution_details}</span>}
            </div>
            {task.resolved_at && (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                Resolved on {new Date(task.resolved_at).toLocaleDateString()}
              </span>
            )}
          </div>
        )}

        {/* Drawer Tabs */}
        <div className="flex shrink-0 overflow-x-auto border-b border-slate-200 px-3 dark:border-slate-800">
          {[
            { key: 'overview', label: 'Overview', icon: FileText },
            { key: 'history', label: 'History', icon: Clock },
            {
              key: 'subtasks',
              label: `Subtasks (${subtasks.length})`,
              icon: CheckSquare,
            },
            {
              key: 'dependencies',
              label: `Dependencies (${outgoingDeps.length + incomingDeps.length})`,
              icon: Link2,
            },
            {
              key: 'blockers',
              label: `Blockers (${blockers.filter((b) => b.status === 'ACTIVE').length})`,
              icon: AlertOctagon,
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
                className={`flex shrink-0 whitespace-nowrap items-center gap-1.5 border-b-2 py-3 px-3 text-xs font-semibold transition ${
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
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <div hidden={activeTab !== 'overview'}>
            <TaskEditor
              task={task}
              save={(patch) => mutate(patch)}
              assign={(patch) => mutate(patch, true)}
              reload={reload}
              busy={busy || statusUpdating}
              startEditing={startEditing}
              onEditing={(field, open) => {
                if (open) edits.current.add(field);
                else edits.current.delete(field);
              }}
            />
          </div>

          {activeTab === 'history' && <TaskHistory task={task} />}
          {/* Tab 2: Subtasks */}
          {activeTab === 'subtasks' && (
            <div className="space-y-4">
              {hasPermission('TASKS:CREATE') && (
                <button
                  type="button"
                  className="text-sm font-semibold text-blue-600"
                  onClick={() => setCreateSubtaskOpen(true)}
                >
                  Create subtask with details
                </button>
              )}
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

              <DataGrid
                title="Subtasks"
                data={subtasks}
                columns={[
                  { id: 'title', label: 'Title' },
                  {
                    id: 'is_completed',
                    label: 'Completed',
                    render: (st) => (
                      <input
                        type="checkbox"
                        aria-label={`Complete ${st.title}`}
                        checked={st.is_completed}
                        onChange={() =>
                          handleToggleSubtask(st.id, st.is_completed)
                        }
                      />
                    ),
                  },
                ]}
              />
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
                    <label className="text-[10px] text-slate-400">
                      Minutes
                    </label>
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

              <DataGrid
                title="Worklog history"
                data={timeLogs}
                columns={[
                  { id: 'user_name', label: 'Employee' },
                  { id: 'description', label: 'Summary' },
                  {
                    id: 'hours',
                    label: 'Hours',
                    type: 'number',
                    value: (tl) =>
                      Number(
                        (tl as any).hours_spent ?? tl.duration_minutes / 60,
                      ),
                  },
                  {
                    id: 'log_date',
                    label: 'Date',
                    value: (tl) => tl.log_date?.slice(0, 10),
                  },
                  { id: 'is_billable', label: 'Billable' },
                ]}
              />
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
                  Direct pre-signed binary upload (PNG, JPG, PDF, ZIP up to
                  50MB)
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

              <DataGrid
                title="Attachments"
                data={attachments}
                columns={[
                  { id: 'original_name', label: 'File name' },
                  {
                    id: 'file_size_bytes',
                    label: 'Size (bytes)',
                    type: 'number',
                  },
                  {
                    id: 'created_at',
                    label: 'Uploaded',
                    render: (att) =>
                      new Date(att.created_at).toLocaleDateString(),
                  },
                ]}
                actions={[
                  {
                    label: 'Download',
                    icon: Download,
                    onClick: (att) => handleDownload(att.id, att.original_name),
                  },
                ]}
              />
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

          {/* PLAN-002: Dependencies Tab Content */}
          {activeTab === 'dependencies' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Task Dependencies & Relationships
                  </h4>
                  <p className="text-xs text-slate-500">
                    Finish-to-Start (FS) and directed Blocks links with DAG cycle checks, inverse lookups, and traceability links.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn-secondary flex items-center gap-1.5 text-xs"
                    onClick={() => {
                      if (!showDepMap && !depMap) fetchDependencyMap();
                      setShowDepMap(!showDepMap);
                    }}
                  >
                    <GitFork size={13} aria-hidden="true" />
                    {showDepMap ? 'Hide Graph Map' : 'View Dependency Map'}
                  </button>
                  <button
                    type="button"
                    className="btn-primary flex items-center gap-1.5 text-xs"
                    onClick={() => {
                      loadOtherTasks();
                      setAddDepModalOpen(true);
                    }}
                  >
                    <Plus size={13} aria-hidden="true" />
                    Add Link
                  </button>
                </div>
              </div>

              {/* Dependency Map Graph View */}
              {showDepMap && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 dark:border-blue-900/40 dark:bg-blue-950/20 space-y-4">
                  <div className="flex items-center justify-between border-b border-blue-100 pb-2 dark:border-blue-900/40">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-200">
                      Dependency Impact Map
                    </span>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span>Prerequisites: {depMap?.prerequisiteCount ?? 0}</span>
                      <span>Downstream: {depMap?.downstreamCount ?? 0}</span>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Upstream Prerequisites */}
                    <div className="space-y-2">
                      <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Upstream Prerequisites (Must finish first)
                      </h5>
                      {!depMap?.prerequisites?.length ? (
                        <p className="text-xs text-slate-400 italic">No upstream prerequisites</p>
                      ) : (
                        depMap.prerequisites.map((p) => (
                          <div
                            key={p.link_id}
                            className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-2xs dark:border-slate-800 dark:bg-slate-800"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {p.task_code} — {p.title}
                              </span>
                              <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `${p.status_color}20`, color: p.status_color }}>
                                {p.status_name}
                              </span>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                {p.link_type}
                              </span>
                              {p.is_overdue && (
                                <span className="rounded bg-rose-100 px-1.5 py-0.5 font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                                  OVERDUE
                                </span>
                              )}
                              {p.stale_blocking_flag && (
                                <span className="rounded bg-amber-100 px-1.5 py-0.5 font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                  PREREQUISITE COMPLETED (FLAG STALE)
                                </span>
                              )}
                              {p.is_cross_project && (
                                <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                  CROSS-PROJECT
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Downstream Impact */}
                    <div className="space-y-2">
                      <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Downstream Impact (Blocked by this task)
                      </h5>
                      {!depMap?.downstreamImpact?.length ? (
                        <p className="text-xs text-slate-400 italic">No downstream dependents</p>
                      ) : (
                        depMap.downstreamImpact.map((d) => (
                          <div
                            key={d.link_id}
                            className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-2xs dark:border-slate-800 dark:bg-slate-800"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {d.task_code} — {d.title}
                              </span>
                              <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `${d.status_color}20`, color: d.status_color }}>
                                {d.status_name}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center gap-1.5 text-[10px]">
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                {d.link_type}
                              </span>
                              {d.is_cross_project && (
                                <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                  CROSS-PROJECT
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Outgoing & Incoming Dependencies Lists */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Outgoing Links */}
                <div className="space-y-3">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Outgoing Links ({outgoingDeps.length})
                  </h5>
                  {outgoingDeps.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No outgoing links configured</p>
                  ) : (
                    <div className="space-y-2">
                      {outgoingDeps.map((dep) => (
                        <div
                          key={dep.id}
                          className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-2xs dark:border-slate-800 dark:bg-slate-800"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                {dep.display_label || dep.link_type}
                              </span>
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {dep.related_task_code}
                              </span>
                            </div>
                            <p className="mt-1 max-w-xs truncate text-[11px] text-slate-500">
                              {dep.related_task_title}
                            </p>
                            {dep.description && (
                              <p className="mt-0.5 text-[10px] text-slate-400 italic">
                                "{dep.description}"
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                              style={{
                                backgroundColor: `${dep.status_color}20`,
                                color: dep.status_color,
                              }}
                            >
                              {dep.status_name}
                            </span>
                            <button
                              type="button"
                              className="text-slate-400 hover:text-rose-600 p-1"
                              onClick={() => handleRemoveDependency(dep.id)}
                            >
                              <Trash2 size={13} aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Incoming Links (Inverse Display) */}
                <div className="space-y-3">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Incoming Links / Inverses ({incomingDeps.length})
                  </h5>
                  {incomingDeps.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No incoming links targeting this task</p>
                  ) : (
                    <div className="space-y-2">
                      {incomingDeps.map((dep) => (
                        <div
                          key={dep.id}
                          className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-2xs dark:border-slate-800 dark:bg-slate-800"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                {dep.display_label || dep.link_type}
                              </span>
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {dep.related_task_code}
                              </span>
                            </div>
                            <p className="mt-1 max-w-xs truncate text-[11px] text-slate-500">
                              {dep.related_task_title}
                            </p>
                            {dep.description && (
                              <p className="mt-0.5 text-[10px] text-slate-400 italic">
                                "{dep.description}"
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                              style={{
                                backgroundColor: `${dep.status_color}20`,
                                color: dep.status_color,
                              }}
                            >
                              {dep.status_name}
                            </span>
                            <button
                              type="button"
                              className="text-slate-400 hover:text-rose-600 p-1"
                              onClick={() => handleRemoveDependency(dep.id)}
                            >
                              <Trash2 size={13} aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PLAN-002: Blockers Tab Content */}
          {activeTab === 'blockers' && (
            <div className="space-y-6">
              {/* Blocker Summary Header Card */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      Blocker Episodes & Timeline
                    </span>
                    {isCurrentlyBlocked && (
                      <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                        ACTIVE BLOCKED
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Total Elapsed Blocked Flow Time:{' '}
                    <span className="font-bold text-slate-900 dark:text-white">
                      {Math.floor(totalBlockedMinutes / 60)}h {totalBlockedMinutes % 60}m
                    </span>{' '}
                    (overlapping intervals counted strictly once)
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-primary flex items-center gap-1.5 text-xs"
                  onClick={() => setAddBlockerModalOpen(true)}
                >
                  <Plus size={13} aria-hidden="true" />
                  Log Blocker Episode
                </button>
              </div>

              {/* Active Blocker Episodes */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Active Impediments ({blockers.filter((b) => b.status === 'ACTIVE').length})
                </h5>
                {blockers.filter((b) => b.status === 'ACTIVE').length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No active blockers logged for this task.</p>
                ) : (
                  <div className="space-y-3">
                    {blockers
                      .filter((b) => b.status === 'ACTIVE')
                      .map((b) => (
                        <div
                          key={b.id}
                          className="rounded-xl border border-rose-200/80 bg-rose-50/20 p-4 dark:border-rose-900/40 dark:bg-rose-950/20 space-y-2 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                  b.priority === 'CRITICAL'
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-amber-500 text-white'
                                }`}
                              >
                                {b.priority}
                              </span>
                              <span className="font-bold text-slate-900 dark:text-white">
                                {b.category.replace(/_/g, ' ')}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                Logged {new Date(b.started_at).toLocaleDateString()}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                              onClick={() => {
                                setResolveBlockerTarget(b);
                                setResolveBlockerOutcome('RESOLVED');
                                setResolveBlockerNotes('');
                              }}
                            >
                              Resolve Blocker
                            </button>
                          </div>

                          <p className="text-slate-800 dark:text-slate-200 font-medium">
                            {b.reason}
                          </p>

                          {b.next_action && (
                            <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                              Next action: {b.next_action}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
                            {b.owner_name && <span>Accountable: <span className="font-semibold text-slate-700 dark:text-slate-300">{b.owner_name}</span></span>}
                            {b.expected_resolution_date && (
                              <span>Expected: {new Date(b.expected_resolution_date).toLocaleDateString()}</span>
                            )}
                            {b.follow_up_date && (
                              <span>Follow-up: {new Date(b.follow_up_date).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Resolved Blocker History */}
              {blockers.filter((b) => b.status !== 'ACTIVE').length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Blocker Resolution History ({blockers.filter((b) => b.status !== 'ACTIVE').length})
                  </h5>
                  <div className="space-y-2">
                    {blockers
                      .filter((b) => b.status !== 'ACTIVE')
                      .map((b) => (
                        <div
                          key={b.id}
                          className="rounded-lg border border-slate-200 bg-white p-3 text-xs dark:border-slate-800 dark:bg-slate-800/40"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                {b.status}
                              </span>
                              <span className="font-medium text-slate-800 dark:text-slate-200">
                                {b.reason}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500">
                              Duration: {b.duration_minutes ? `${b.duration_minutes}m` : 'N/A'}
                            </span>
                          </div>
                          {b.resolution_notes && (
                            <p className="mt-1 text-[11px] text-slate-500 italic">
                              Resolution notes: "{b.resolution_notes}"
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Dependency Modal */}
      {addDepModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 text-slate-900 dark:bg-slate-900 dark:text-white">
            <h3 className="mb-2 text-lg font-bold">Add Task Relationship</h3>
            <p className="mb-4 text-xs text-slate-500">
              Create a directed scheduling link or traceability link. Directed links enforce DAG cycle validation.
            </p>

            {depError && (
              <div role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                {depError}
              </div>
            )}

            <form onSubmit={handleAddDependency} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Target Task *
                </label>
                <select
                  className="form-control mt-1 w-full text-xs"
                  required
                  value={targetDepTaskId}
                  onChange={(e) => setTargetDepTaskId(e.target.value)}
                >
                  <option value="">Select target task...</option>
                  {allOtherTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.task_code} — {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Relationship Type *
                </label>
                <select
                  className="form-control mt-1 w-full text-xs"
                  value={depLinkType}
                  onChange={(e) => setDepLinkType(e.target.value)}
                >
                  <option value="BLOCKS">Blocks (Target will be blocked by this task)</option>
                  <option value="FINISH_TO_START">Finish-to-Start (Must finish before target starts)</option>
                  <option value="RELATED_TO">Related to (Symmetric link)</option>
                  <option value="DUPLICATE_OF">Duplicate of</option>
                  <option value="CAUSES">Causes</option>
                  <option value="FIXED_BY">Fixed by</option>
                  <option value="TESTED_BY">Tested by</option>
                  <option value="RELEASED_IN">Released in</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Link Description / Notes
                </label>
                <input
                  type="text"
                  className="form-control mt-1 w-full text-xs"
                  placeholder="Optional context for this relationship..."
                  value={depDescription}
                  onChange={(e) => setDepDescription(e.target.value)}
                />
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setAddDepModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={depLoading}
                >
                  {depLoading ? 'Linking...' : 'Create Relationship'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Blocker Episode Modal */}
      {addBlockerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 text-slate-900 dark:bg-slate-900 dark:text-white">
            <h3 className="mb-2 text-lg font-bold">Log Blocker Episode</h3>
            <p className="mb-4 text-xs text-slate-500">
              Mark this task as blocked and track ownership, next steps, and duration.
            </p>

            <form onSubmit={handleAddBlocker} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Blocker Reason *
                </label>
                <textarea
                  className="form-control mt-1 w-full text-xs"
                  rows={3}
                  required
                  placeholder="Explain why this task is blocked..."
                  value={blockerReason}
                  onChange={(e) => setBlockerReason(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Category
                  </label>
                  <select
                    className="form-control mt-1 w-full text-xs"
                    value={blockerCategory}
                    onChange={(e) => setBlockerCategory(e.target.value)}
                  >
                    <option value="TECHNICAL">Technical</option>
                    <option value="DEPENDENCY">Dependency</option>
                    <option value="CLIENT">Client</option>
                    <option value="ENVIRONMENT">Environment</option>
                    <option value="SPECIFICATION">Specification</option>
                    <option value="THIRD_PARTY">Third Party</option>
                    <option value="RESOURCE">Resource</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Priority
                  </label>
                  <select
                    className="form-control mt-1 w-full text-xs"
                    value={blockerPriority}
                    onChange={(e) => setBlockerPriority(e.target.value)}
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Next Action / Mitigation
                </label>
                <input
                  type="text"
                  className="form-control mt-1 w-full text-xs"
                  placeholder="Immediate next step..."
                  value={blockerNextAction}
                  onChange={(e) => setBlockerNextAction(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Expected Date
                  </label>
                  <input
                    type="date"
                    className="form-control mt-1 w-full text-xs"
                    value={blockerExpectedDate}
                    onChange={(e) => setBlockerExpectedDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Follow-Up Date
                  </label>
                  <input
                    type="date"
                    className="form-control mt-1 w-full text-xs"
                    value={blockerFollowUpDate}
                    onChange={(e) => setBlockerFollowUpDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setAddBlockerModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Log Blocker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Blocker Episode Modal */}
      {resolveBlockerTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 text-slate-900 dark:bg-slate-900 dark:text-white">
            <h3 className="mb-2 text-lg font-bold">Resolve Blocker Episode</h3>
            <p className="mb-4 text-xs text-slate-500">
              Clear this impediment. Note: task remains blocked if other active blocker episodes or blocking links persist.
            </p>

            <form onSubmit={handleResolveBlocker} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Resolution Outcome
                </label>
                <select
                  className="form-control mt-1 w-full text-xs"
                  value={resolveBlockerOutcome}
                  onChange={(e: any) => setResolveBlockerOutcome(e.target.value)}
                >
                  <option value="RESOLVED">Resolved (Impediment cleared)</option>
                  <option value="DISMISSED">Dismissed (No longer applicable)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Resolution Notes
                </label>
                <textarea
                  className="form-control mt-1 w-full text-xs"
                  rows={3}
                  placeholder="Explain how this impediment was resolved..."
                  value={resolveBlockerNotes}
                  onChange={(e) => setResolveBlockerNotes(e.target.value)}
                />
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setResolveBlockerTarget(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary bg-emerald-600 hover:bg-emerald-700">
                  Confirm Resolution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Defect Resolution Modal (PLAN-002) */}
      {defectResolutionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 text-slate-900 dark:bg-slate-900 dark:text-white">
            <h3 className="mb-2 text-lg font-bold">Defect Resolution Classification</h3>
            <p className="mb-4 text-xs text-slate-500">
              Closing a Bug / Defect requires a formal resolution classification for audit and QA traceability.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeStatusTransition(pendingToStatusId, {
                  resolution: defectResolution,
                  resolutionDetails: defectResolutionDetails.trim() || undefined,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Formal Resolution *
                </label>
                <select
                  className="form-control mt-1 w-full text-xs font-semibold"
                  required
                  value={defectResolution}
                  onChange={(e) => setDefectResolution(e.target.value)}
                >
                  <option value="FIXED">Fixed (Code change verified)</option>
                  <option value="WONT_FIX">Won't Fix (Out of scope / rejected)</option>
                  <option value="DUPLICATE">Duplicate (Covered by another ticket)</option>
                  <option value="CANNOT_REPRODUCE">Cannot Reproduce (Unable to duplicate behavior)</option>
                  <option value="BY_DESIGN">By Design (Intended behavior)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Resolution Details / Commit Hash
                </label>
                <textarea
                  className="form-control mt-1 w-full text-xs"
                  rows={3}
                  placeholder="Root cause, fix details, or justification..."
                  value={defectResolutionDetails}
                  onChange={(e) => setDefectResolutionDetails(e.target.value)}
                />
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setDefectResolutionModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary bg-emerald-600 hover:bg-emerald-700">
                  Confirm &amp; Close Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {createSubtaskOpen && (
        <CreateTaskModal
          initial={{
            title: newSubtaskTitle,
            parentTaskId: task.id,
            projectId: task.project_id || '',
            productId: task.product_id || '',
            branchId: task.branch_id,
            versionId: task.version_id || '',
            taskTypeId: task.task_type_id,
          }}
          onClose={() => setCreateSubtaskOpen(false)}
          onCreated={() => {
            setNewSubtaskTitle('');
            fetchSubtasks();
            onTaskUpdated();
          }}
        />
      )}
    </>
  );
};

