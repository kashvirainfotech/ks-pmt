import { useId, useState } from 'react';
import { errorText } from '../management/EntityManager';
import { options, TaskChoices, TaskSelect, TaskValues } from './TaskFields';

type Definition = {
  label: string;
  type: string;
  required?: boolean;
  default?: any;
  options?: string[];
  order?: number;
};
export function definitions(
  schema: TaskValues = {},
): Array<[string, Definition]> {
  return Object.entries(schema || {})
    .map(
      ([key, field]) =>
        [
          key,
          typeof field === 'string' ? { label: key, type: field } : field,
        ] as [string, Definition],
    )
    .filter(
      ([, field]) =>
        field &&
        typeof field.label === 'string' &&
        typeof field.type === 'string',
    )
    .sort((a, b) => (a[1].order || 0) - (b[1].order || 0));
}
export function customDefaults(schema: TaskValues = {}) {
  return Object.fromEntries(
    definitions(schema)
      .filter(([, field]) => field.default !== undefined)
      .map(([key, field]) => [key, field.default]),
  );
}

export function CustomTaskFields({
  schema,
  values,
  change,
  users = [],
  disabled = false,
}: {
  schema: TaskValues;
  values: TaskValues;
  change: (values: TaskValues) => void;
  users?: TaskValues[];
  disabled?: boolean;
}) {
  const prefix = useId();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {definitions(schema).map(([key, field]) => {
        const label = field.label + (field.required ? ' *' : '');
        const value = values[key];
        const update = (v: any) => change({ ...values, [key]: v });
        if (['select', 'user', 'boolean'].includes(field.type))
          return (
            <TaskSelect
              key={key}
              label={field.label}
              value={value == null ? '' : String(value)}
              choices={
                field.type === 'user'
                  ? options(users, 'person')
                  : field.type === 'boolean'
                    ? [
                        { value: 'true', label: 'Yes' },
                        { value: 'false', label: 'No' },
                      ]
                    : (field.options || []).map((v) => ({ value: v, label: v }))
              }
              onChange={(v) =>
                update(
                  v === '' ? null : field.type === 'boolean' ? v === 'true' : v,
                )
              }
              required={field.required}
              disabled={disabled}
            />
          );
        return (
          <div key={key} className="space-y-1.5">
            <label
              htmlFor={`${prefix}-${key}`}
              className="text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              {label}
            </label>
            {field.type === 'multiselect' ? (
              <select
                multiple
                id={`${prefix}-${key}`}
                className="form-control w-full text-sm"
                required={field.required}
                disabled={disabled}
                value={Array.isArray(value) ? value : []}
                onChange={(e) =>
                  update(
                    Array.from(e.target.selectedOptions).map((o) => o.value),
                  )
                }
              >
                {(field.options || []).map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            ) : field.type === 'textarea' ? (
              <textarea
                id={`${prefix}-${key}`}
                className="form-control w-full text-sm"
                value={value || ''}
                required={field.required}
                disabled={disabled}
                maxLength={10000}
                onChange={(e) => update(e.target.value || null)}
              />
            ) : (
              <input
                id={`${prefix}-${key}`}
                className="form-control w-full text-sm"
                type={
                  field.type === 'number'
                    ? 'number'
                    : field.type === 'date'
                      ? 'date'
                      : 'text'
                }
                step={field.type === 'number' ? 'any' : undefined}
                value={value ?? ''}
                maxLength={10000}
                required={field.required}
                disabled={disabled}
                onChange={(e) =>
                  update(
                    e.target.value === ''
                      ? null
                      : field.type === 'number'
                        ? Number(e.target.value)
                        : e.target.value,
                  )
                }
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function CustomTaskEditor({
  task,
  choices,
  disabled,
  editable,
  save,
  reload,
  onEditing,
}: {
  task: TaskValues;
  choices: TaskChoices;
  disabled: boolean;
  editable: boolean;
  save: (patch: TaskValues) => Promise<void>;
  reload: () => Promise<number | undefined>;
  onEditing: (open: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editRevision, setEditRevision] = useState(task.revision);
  const [typeId, setTypeId] = useState(task.task_type_id);
  const [values, setValues] = useState<TaskValues>({});
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const types = choices['task-types'] || [];
  const schema = editing
    ? types.find((t) => t.id === typeId)?.custom_fields ||
      task.custom_field_definitions ||
      {}
    : task.custom_field_definitions || {};
  const fields = definitions(schema);
  const close = () => {
    setEditing(false);
    onEditing(false);
    setError('');
    setConflict(false);
  };
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      {editing ? (
        <form
          data-inline-editor
          className="space-y-4"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              if (!disabled) close();
            }
          }}
          onSubmit={async (e) => {
            e.preventDefault();
            if (disabled || conflict) return;
            setError('');
            try {
              await save({
                expectedRevision: editRevision,
                taskTypeId: typeId,
                customFieldValues: Object.fromEntries(
                  fields.map(([key]) => [key, values[key] ?? null]),
                ),
              });
              close();
            } catch (err: any) {
              setError(errorText(err));
              setConflict(err.response?.status === 409);
            }
          }}
        >
          <TaskSelect
            label="Task type"
            required
            value={typeId}
            choices={options(types, 'type_name')}
            disabled={disabled}
            onChange={(id) => {
              setTypeId(id);
              setValues((v) => ({
                ...customDefaults(
                  types.find((t) => t.id === id)?.custom_fields,
                ),
                ...v,
              }));
            }}
          />
          <CustomTaskFields
            schema={schema}
            values={values}
            change={setValues}
            users={choices.users}
            disabled={disabled}
          />
          <div className="flex gap-3">
            <button
              disabled={disabled || conflict}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white"
            >
              Save type and fields
            </button>
            <button
              type="button"
              disabled={disabled}
              className="text-xs"
              onClick={close}
            >
              Cancel
            </button>
          </div>
          {error && (
            <p role="alert" className="text-xs text-red-600">
              {error}
            </p>
          )}
          {conflict && (
            <button
              type="button"
              className="text-xs text-blue-600"
              onClick={async () => {
                try {
                  setEditRevision(await reload());
                  setConflict(false);
                  setError(
                    'Latest values loaded. Review your draft before saving.',
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
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">
              {task.type_name || task.task_type_name || 'Task'} fields
            </h3>
            {editable && (
              <button
                type="button"
                aria-label="Edit Task type and custom fields"
                disabled={disabled}
                className="text-xs font-semibold text-blue-600"
                onClick={() => {
                  setEditRevision(task.revision);
                  setTypeId(task.task_type_id);
                  setValues({
                    ...customDefaults(task.custom_field_definitions),
                    ...task.custom_field_values,
                  });
                  setEditing(true);
                  onEditing(true);
                }}
              >
                Edit type and fields
              </button>
            )}
          </div>
          {fields.length ? (
            <dl className="grid gap-4 sm:grid-cols-2">
              {fields.map(([key, field]) => {
                const value = task.custom_field_values?.[key];
                const display =
                  field.type === 'user'
                    ? options(choices.users, 'person').find(
                        (u) => u.value === value,
                      )?.label || value
                    : Array.isArray(value)
                      ? value.join(', ')
                      : value === false
                        ? 'No'
                        : value === true
                          ? 'Yes'
                          : value;
                return (
                  <div key={key}>
                    <dt className="text-xs text-slate-500">{field.label}</dt>
                    <dd className="mt-1 whitespace-pre-wrap break-words text-sm">
                      {display ?? 'Not set'}
                    </dd>
                  </div>
                );
              })}
            </dl>
          ) : (
            <p className="text-xs text-slate-500">
              No custom fields configured for this task type.
            </p>
          )}
        </>
      )}
    </section>
  );
}
