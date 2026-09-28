import { TaskDescription } from './TaskDescription';
import { CustomTaskEditor } from './CustomTaskFields';
import { useEffect, useRef, useState } from 'react';
import { Pencil } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { errorText } from '../management/EntityManager';
import {
  AssigneeInput,
  Choice,
  options,
  priorities,
  releaseOptions,
  TaskInput,
  taskLabels,
  TaskValues,
  useTaskChoices,
} from './TaskFields';

export function InlineTaskField({
  name,
  value,
  display,
  choices,
  editable,
  disabled,
  save,
  reload,
  onEditing,
  initiallyEditing = false,
  revision,
}: {
  name: string;
  value: any;
  display?: string;
  choices?: Choice[];
  editable: boolean;
  disabled: boolean;
  save: (patch: TaskValues) => Promise<void>;
  reload: () => Promise<number | undefined>;
  onEditing: (editing: boolean) => void;
  initiallyEditing?: boolean;
  revision?: number;
}) {
  const [editing, setEditing] = useState(initiallyEditing);
  const [draft, setDraft] = useState(value);
  const [editRevision, setEditRevision] = useState(revision);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [message, setMessage] = useState('');
  const control = useRef<HTMLFormElement>(null);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (editing)
      control.current
        ?.querySelector<HTMLElement>('input,textarea,select')
        ?.focus();
  }, [editing]);
  useEffect(() => {
    if (initiallyEditing) onEditing(true);
  }, []);
  const close = () => {
    setEditing(false);
    onEditing(false);
    setError('');
    setConflict(false);
    requestAnimationFrame(() =>
      root.current?.querySelector<HTMLElement>('button')?.focus(),
    );
  };
  const commit = async (next = draft) => {
    if (disabled || conflict) return;
    setError('');
    setMessage('');
    if (name === 'title' && !String(next || '').trim()) {
      setError('Title is required.');
      return;
    }
    if (
      ['estimatedHours', 'chargeAmount'].includes(name) &&
      (next === '' || !Number.isFinite(Number(next)) || Number(next) < 0)
    ) {
      setError('Enter a number of zero or more.');
      return;
    }
    if (name === 'currency' && !String(next || '').trim()) {
      setError('Currency is required.');
      return;
    }
    try {
      await save({
        expectedRevision: editRevision,
        [name]:
          next === '' && !['title', 'currency'].includes(name) ? null : next,
      });
      close();
      setMessage('Saved');
    } catch (e: any) {
      setError(errorText(e));
      setConflict(e.response?.status === 409);
    }
  };
  return (
    <div ref={root} className="min-w-0" data-task-field={name}>
      {editing ? (
        <form
          data-inline-editor
          ref={control}
          className="space-y-2 rounded-xl border border-blue-300 p-3 dark:border-blue-800"
          onSubmit={(e) => {
            e.preventDefault();
            void commit();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              e.preventDefault();
              if (!disabled) close();
            }
          }}
        >
          <TaskInput
            name={name}
            value={draft}
            choices={choices}
            disabled={disabled}
            onChange={(v) => {
              setDraft(v);
              if (choices || name === 'isChargeable') void commit(v);
            }}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={disabled || conflict}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {disabled ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={close}
              className="px-3 py-1.5 text-xs"
            >
              Cancel
            </button>
          </div>
          {error && (
            <p role="alert" className="text-xs text-red-600 dark:text-red-300">
              {error}
            </p>
          )}
          {conflict && (
            <button
              type="button"
              className="text-xs text-blue-600"
              disabled={disabled}
              onClick={async () => {
                try {
                  setEditRevision(await reload());
                  setConflict(false);
                  setError(
                    'Latest values loaded. Your draft is preserved; review it before saving again.',
                  );
                } catch (e) {
                  setError(errorText(e));
                }
              }}
            >
              Load latest and keep draft
            </button>
          )}
        </form>
      ) : (
        <>
          <div className="mb-1 text-xs font-semibold text-slate-500">
            {taskLabels[name]}
          </div>
          {name === 'description' ? (
            <div>
              <TaskDescription value={value || 'Add a description...'} />
              {editable && (
                <button
                  type="button"
                  aria-label="Edit Description"
                  disabled={disabled}
                  className="text-xs font-semibold text-blue-600"
                  onClick={() => {
                    setEditRevision(revision);
                    setDraft(value);
                    setEditing(true);
                    onEditing(true);
                  }}
                >
                  Edit description
                </button>
              )}
            </div>
          ) : editable ? (
            <button
              type="button"
              aria-label={`Edit ${taskLabels[name]}`}
              disabled={disabled}
              onClick={() => {
                setEditRevision(revision);
                setDraft(value);
                setEditing(true);
                onEditing(true);
                setMessage('');
              }}
              className={`group flex w-full items-start justify-between gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800 ${name === 'title' ? 'text-xl font-semibold' : 'text-sm'}`}
            >
              <span className="min-w-0 whitespace-pre-wrap break-words">
                {display ||
                  (value === false
                    ? 'No'
                    : value === true
                      ? 'Yes'
                      : value === 0
                        ? '0'
                        : value) || (
                    <span className="text-slate-400">
                      Add {taskLabels[name].toLowerCase()}...
                    </span>
                  )}
              </span>
              <Pencil
                size={14}
                className="mt-1 shrink-0 text-slate-400 opacity-0 group-hover:opacity-100 group-focus:opacity-100"
              />
            </button>
          ) : (
            <p
              className={`whitespace-pre-wrap break-words px-2 py-2 ${name === 'title' ? 'text-xl font-semibold' : 'text-sm'}`}
            >
              {display ||
                (value === false
                  ? 'No'
                  : value === true
                    ? 'Yes'
                    : (value ?? 'Not set')) ||
                'Not set'}
            </p>
          )}
          {message && (
            <span role="status" className="text-xs text-emerald-600">
              {message}
            </span>
          )}
        </>
      )}
    </div>
  );
}

export function TaskEditor({
  task,
  save,
  assign,
  reload,
  busy,
  onEditing,
  startEditing = false,
}: {
  task: TaskValues;
  save: (patch: TaskValues) => Promise<void>;
  assign: (patch: TaskValues) => Promise<void>;
  reload: () => Promise<number | undefined>;
  busy: boolean;
  onEditing: (field: string, editing: boolean) => void;
  startEditing?: boolean;
}) {
  const { hasPermission, user } = useAuth();
  const { choices, loading, error, retry } = useTaskChoices(task.branch_id);
  const [assigning, setAssigning] = useState(false);
  const [assignment, setAssignment] = useState<TaskValues>({});
  const [assignmentError, setAssignmentError] = useState('');
  const [assignmentConflict, setAssignmentConflict] = useState(false);
  const editable = hasPermission('TASKS:UPDATE');
  const financial = hasPermission('PROJECTS:VIEW_FINANCIALS');
  const releases = releaseOptions(choices, task.project_id, task.product_id);
  const field = (name: string, opts?: Choice[]) => {
    const column = name.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
    const value = task[column];
    let display = opts?.find((o) => o.value === value)?.label;
    if (name === 'taskTypeId')
      display ||= task.type_name || task.task_type_name;
    if (name === 'versionId')
      display ||= task.version_code || task.version_name;
    if (name.endsWith('Date') && value)
      display = new Date(value).toLocaleString();
    return (
      <InlineTaskField
        key={name}
        revision={task.revision}
        name={name}
        value={value}
        display={display}
        choices={opts}
        editable={editable}
        disabled={busy || (!!opts && (loading || !!error))}
        save={save}
        reload={reload}
        onEditing={(open) => onEditing(name, open)}
        initiallyEditing={name === 'title' && startEditing && editable}
      />
    );
  };
  const finishAssignment = () => {
    setAssigning(false);
    onEditing('assignees', false);
    setAssignmentError('');
    setAssignmentConflict(false);
  };
  return (
    <div className="space-y-6">
      {field('title')}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <main className="min-w-0 space-y-5">
          {field('description')}
          <CustomTaskEditor
            task={task}
            choices={choices}
            disabled={busy || loading || !!error}
            editable={editable}
            save={save}
            reload={reload}
            onEditing={(open) => onEditing('customFields', open)}
          />
          <div className="rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/50">
            <p className="font-semibold">
              {task.project_name || task.product_name || 'General task'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {task.branch_name || 'No branch'}
              {task.parent_task_code
                ? ` - Subtask of ${task.parent_task_code}`
                : ''}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Created {new Date(task.created_at).toLocaleString()} - Updated{' '}
              {new Date(task.updated_at || task.created_at).toLocaleString()}
            </p>
          </div>
          <p className="text-xs text-slate-500">
            Use the tabs above for subtasks, attachments, comments and worklogs.
          </p>
        </main>
        <aside
          className="min-w-0 space-y-5 border-t border-slate-200 pt-5 dark:border-slate-800 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0"
          aria-label="Task fields"
        >
          {error && (
            <p role="alert" className="text-xs">
              {error}{' '}
              <button type="button" onClick={retry} className="text-blue-600">
                Retry choices
              </button>
            </p>
          )}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-500">Assignees</h3>
            {assigning ? (
              <form
                data-inline-editor
                className="space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (busy || assignmentConflict) return;
                  setAssignmentError('');
                  try {
                    await assign({
                      ...assignment,
                      primaryAssigneeId:
                        assignment.primaryAssigneeId || undefined,
                    });
                    finishAssignment();
                  } catch (err: any) {
                    setAssignmentError(errorText(err));
                    setAssignmentConflict(err.response?.status === 409);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.stopPropagation();
                    if (!busy) finishAssignment();
                  }
                }}
              >
                <AssigneeInput
                  values={assignment}
                  choices={choices.users || []}
                  currentUserId={user?.id}
                  onChange={(v) => setAssignment((a) => ({ ...a, ...v }))}
                  disabled={busy}
                />
                <div className="flex gap-3">
                  <button
                    disabled={busy || assignmentConflict}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white"
                  >
                    Save assignees
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={finishAssignment}
                    className="text-xs"
                  >
                    Cancel
                  </button>
                </div>
                {assignmentError && (
                  <p role="alert" className="text-xs text-red-600">
                    {assignmentError}
                  </p>
                )}
                {assignmentConflict && (
                  <button
                    type="button"
                    className="text-xs text-blue-600"
                    onClick={async () => {
                      try {
                        const latestRevision = await reload();
                        setAssignment((current) => ({
                          ...current,
                          expectedRevision: latestRevision,
                        }));
                        setAssignmentConflict(false);
                        setAssignmentError(
                          'Latest values loaded. Review your assignment draft before saving.',
                        );
                      } catch (e) {
                        setAssignmentError(errorText(e));
                      }
                    }}
                  >
                    Load latest and keep draft
                  </button>
                )}
              </form>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {(task.assignees || []).map((a: any) => (
                    <span
                      key={a.user_id || a.userId}
                      className="rounded-lg bg-slate-100 px-2 py-1.5 text-xs dark:bg-slate-800"
                    >
                      {a.full_name ||
                        a.name ||
                        [a.first_name, a.last_name].filter(Boolean).join(' ')}
                      {(a.is_primary_assignee || a.is_primary || a.isPrimary) &&
                        ' - Primary'}
                    </span>
                  ))}
                  {!task.assignees?.length && (
                    <span className="text-sm text-slate-400">Unassigned</span>
                  )}
                </div>
                {hasPermission('TASKS:ASSIGN') && (
                  <button
                    type="button"
                    disabled={busy || loading || !!error}
                    className="text-xs font-semibold text-blue-600"
                    onClick={() => {
                      setAssignment({
                        expectedRevision: task.revision,
                        assigneeIds:
                          task.assignees?.map(
                            (a: any) => a.user_id || a.userId,
                          ) || [],
                        primaryAssigneeId:
                          task.assignees?.find(
                            (a: any) =>
                              a.is_primary_assignee ||
                              a.is_primary ||
                              a.isPrimary,
                          )?.user_id || '',
                      });
                      setAssigning(true);
                      onEditing('assignees', true);
                    }}
                  >
                    Edit assignees
                  </button>
                )}
              </>
            )}
          </section>

          {field(
            'priority',
            priorities.map((value) => ({ value, label: value })),
          )}
          {field('severity')}
          {field('versionId', releases)}
          {field('plannedStartDate')}
          {field('plannedEndDate')}
          {field('estimatedHours')}
          <details>
            <summary className="cursor-pointer text-xs font-semibold text-slate-500">
              More fields
            </summary>
            <div className="mt-4 space-y-4">
              {field('actualStartDate')}
              {field('actualEndDate')}
              {financial && (
                <>
                  {field('isChargeable')}
                  {field('chargeAmount')}
                  {field('currency')}
                </>
              )}
            </div>
          </details>
        </aside>
      </div>
    </div>
  );
}
