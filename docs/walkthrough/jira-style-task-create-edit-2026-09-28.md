# Jira-style task creation and editing

Implemented the create/edit portion of the [task experience proposal](jira-style-task-experience-recommendations-2026-09-27.md). Work started on 2026-09-27 and completed on 2026-09-28 (IST). Repository Markdown documentation was reviewed before implementation.

## Delivered behavior

- A task-specific creation dialog replaces the general record form. Scope, type, title, description, priority, severity and assignment are prominent; scheduling/release, billing and branch settings are grouped separately.
- Project/product filters and the selected branch supply creation context. Releases are restricted to the selected project/product. Task-type severity, chargeability and custom-field defaults are applied. Long selectors offer search.
- Create another retains scope, type and release while clearing task-specific input. Validation errors retain entered values. Closing a dirty task form asks whether to discard it; page unload warns while a draft is open. Saving disables duplicate submission and dismissal.
- Board creation explicitly starts at the task type's first active To do workflow status. It does not create directly in arbitrary In progress or Done columns. For legacy types with no configured workflow, the first active To do status is used.
- Task details use a wide drawer with a full-page mode at `/tasks?taskId=<id>&viewTask=full`. Expanding/collapsing keeps the same editor mounted. Closing details preserves the current task list's filter state. Background save refreshes retain grid search, sort and pagination state.
- Title, description, priority, severity, release, planned/actual dates, estimates and authorized billing fields support inline editing. Dropdowns save on selection; text/numbers/dates have Save/Cancel. Escape cancels the current field. Focus returns to the field control after editing.
- Multi-assignees have searchable choices, removal, Assign to me and an explicit primary owner. Assignment-only permissions remain usable independently of ordinary task editing.
- Descriptions have a formatting toolbar and Write/Preview modes supporting headings, emphasis, lists and code blocks. Formatted output uses [react-markdown](https://github.com/remarkjs/react-markdown), with raw HTML disabled and its default URL filtering retained. Binary uploads continue through the existing S3 attachment flow; description images are represented as text directing users to attachments. This is a Markdown-based editor, not a WYSIWYG HTML editor.
- Custom values can be entered during creation and edited alongside the task type. Required fields are exposed on the creation form. Type changes validate the current workflow status and required custom values together.
- A History tab exposes paginated task-scoped audit records with actor, time and before/after values. Assignment changes record the previous/new people and primary owner in the same transaction. Financial amounts follow existing response redaction. This does not claim a complete audit of every comment, file or worklog operation.
- Existing subtask, comment, attachment and time-tracking tabs remain available. Create subtask with details opens the focused creation dialog with parent scope. Quick subtask entry opens this dialog when required type-specific fields need input.
- Read-only users receive read-only task fields and a disabled status selector. Financial fields and assignment controls follow their respective permissions.
- The task route loads separately, keeping description/editor dependencies out of the initial application bundle.

## API and persistence

`PATCH /api/v1/tasks/:id` accepts changed fields and requires `expectedRevision`. Omitted fields remain unchanged; explicit null clears supported optional fields. Zero and false remain valid values. Existing PUT clients remain supported with optional revision checking.

Task revisions are incremented by the existing update trigger, including changes from legacy callers. Updates lock the task row and compare the expected revision before writing. A stale edit returns HTTP 409. Each open editor retains the revision it started from, even if the surrounding task refreshes. Load latest and keep draft explicitly refreshes the revision so the user can review and retry.

Task fields, assignment replacement, assignment audit and notification writes use the same transaction. Status changes and automatic reassignment are transactional. Assignment/status endpoints accept optional expected revisions for compatibility; the web editor supplies them.

Generic task updates enforce separate assignment and financial permissions. Create validates active project/product selection and project/branch consistency. Updates reject scope changes through the ordinary field editor. Releases must belong to the task scope; assigned users and custom user references must be active and have access to the task branch.

Custom values are server-validated against the selected task type. Null clears an optional key; unknown submitted keys and invalid values are rejected. Existing values for fields removed from a definition or a previous type are retained in storage, rather than silently discarded. Current type fields are displayed in the editor.

## Configuring custom fields

Use the existing Task types administration screen's Custom field definitions (JSON) field. Definitions are keyed by stable lowercase names. Supported types are `text`, `textarea`, `number`, `boolean`, `date`, `select`, `multiselect` and `user`. Optional properties include `required`, `default`, `order`, and string `options` for selection fields.

Example for a Bug task type:

```json
{
  "environment": {
    "label": "Environment",
    "type": "select",
    "required": true,
    "options": ["Test", "Staging", "Production"],
    "order": 1
  },
  "reproduction_steps": {
    "label": "Reproduction steps",
    "type": "textarea",
    "required": true,
    "order": 2
  },
  "verified": {
    "label": "Verified",
    "type": "boolean",
    "default": false,
    "order": 3
  }
}
```

`date` values use `YYYY-MM-DD`; user values use employee UUIDs. Numeric zero and boolean false satisfy required-value checks. The existing JSON configuration remains the administration surface; a visual field-layout designer and project/product-specific layout overrides are separate future work.

## Required developer / DBA step

The canonical `tasks` CREATE definition now includes `revision` and `custom_field_values`. The existing `fn_set_updated_at` definition increments task revisions while retaining timestamp behavior for other tables. No incremental migrations were added.

**Before running the updated application, install the regenerated schema against a blank development database using the documented manual workflow in [dbscripts/README.md](../../dbscripts/README.md).** The ignored pgAdmin bundle `dbscripts/install.sql` has been regenerated. The agent did not execute SQL, create a database, or perform live API writes.

Existing databases do not have the new columns. Under the project's development policy, their replacement/rebuild and database integration validation are human responsibilities.

## Verification

- Backend production build passed.
- Web TypeScript and production build passed. Final main JavaScript chunk is approximately 481 kB; the task workspace is approximately 176 kB. The earlier chunk-size warning is no longer emitted.
- Backend Jest: 9 suites, 46 tests passed. Coverage includes null clearing, zero/false preservation, stale edits, dates, release scope, type/status compatibility, assignment eligibility, field permissions and custom-field validation.
- `web/tests/task-editing.cjs`: six browser acceptance groups passed with all API calls intercepted. Checks include contextual creation, type defaults, required custom fields, scoped releases, Create another, inline saving/cancellation, null/zero values, conflict review, revisions retained across background refreshes, failed-save draft retention, custom values, formatted-text safety, assignment/primary owner, history rendering, full-page mode, grid context, read-only access and mobile dark layout.
- Existing `web/tests/data-grid.cjs` passed its ten regression groups, including shared listing controls, forms, task editing, exports, permissions and responsive themes.
- Two installer-bundle tests passed. All 14 canonical SQL files and the generated bundle parsed with a PostgreSQL parser without a database connection. Parsing and mocked tests do not establish live database integration correctness.
- `git diff --check` passed. No commits or pushes were made.

Browser evidence: [results](task-editing-browser-results.json), [desktop](task-editor-desktop.png), [mobile dark](task-editor-mobile-dark.png). Screenshots contain synthetic fixture data.

## Scope boundaries

This delivery covers task creation, viewing and editing. Saved list views, bulk task updates, inline grid cells, server-side grid processing, configurable transition forms and a combined activity feed remain separate work from the proposal. Rich comment composition, embedded S3 media in descriptions, visual field-layout administration, real-time delivery and native mobile feature parity are not part of this change. Existing S3/provider acceptance gaps remain as documented in earlier audits.

## Completion summary

Implemented Jira-style task creation and inline editing, formatted descriptions, custom task values, assignment controls, history and conflict handling. Backend/web builds, 46 backend tests, browser checks and static SQL checks passed. The updated schema must be installed manually against a blank development database before testing the application. Changes remain uncommitted.
