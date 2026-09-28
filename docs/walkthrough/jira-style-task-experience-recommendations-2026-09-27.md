# Jira-style task experience recommendations

Date: 2026-09-27 (IST).

Reviewed all repository Markdown documents discovered outside dependencies, Git internals and build output before inspecting task implementation. This includes root instructions and README, requirements, architecture, plan, checklist, database documentation, shared grid guide and all existing walkthroughs. The reconciled checklist and recent audits take precedence over historical claims of full completion.

This is a recommendation report in response to the request for suggested changes. Application code and SQL were not changed. No database commands, commits or pushes were executed. No application tests were run for this documentation-only review.

## Recommendation

Build a task-focused create dialog and a shared task detail workspace with inline field editing. Keep KS-PMT's project/product scope, multi-assignees, branch permissions, billing and dynamic workflows. Start with the everyday task experience, followed by configurable fields and advanced list operations.

Atlassian documents direct editing in its work item view and configurable field placement/visibility. Those interaction patterns inform this proposal; the detailed behavior below is a proposed KS-PMT design.

- [Atlassian: Update a work item's details](https://support.atlassian.com/jira-software-cloud/docs/update-a-work-items-details/)
- [Atlassian: Configure field layout](https://support.atlassian.com/jira-software-cloud/docs/configure-field-layout-in-the-work-item/)
- [Atlassian: Create a work item and a subtask](https://support.atlassian.com/jira-software-cloud/docs/create-a-work-item-and-a-subtask/)

## Current implementation

- `CreateTaskModal.tsx` uses the generic management `RecordForm` and shared `taskFields`. It accepts `initialStatusId`, supplied by board quick-create, but does not consume it.
- `TaskDrawer.tsx` opens the same general form above the task content for editing. It has a status selector and separate overview, subtasks, time, files and comments tabs. The description preview is clamped to three lines.
- `TasksView.tsx` already supports board/list views, filters and task links through `?taskId=...`. Extend that behavior to preserve list context and support a full-page task route.
- The shared grid already provides search, filters, sorting, grouping, export and print. It retrieves all authorized pages before processing in the browser; large task datasets need coordinated server-side query support.
- The checklist and audit explicitly identify missing per-task custom-field values and rich-text editing. Task-type definitions already have a custom-fields JSONB property.
- `TasksService.update()` uses `COALESCE` for many fields. This prevents explicit nulls from clearing dates, version and other nullable values. Core updates and subsequent assignee replacement are separate operations. No revision check appears in this update method.

## Proposed user experience

| Area | Suggested change |
| --- | --- |
| Creation | Show project or product, task type and title first. Offer description, priority and assignees nearby; put scheduling, release and billing in expandable sections. Display all required fields, including type-specific requirements. |
| Context | Prefill selected project/product, branch, parent and release when available. Filter dependent choices to the selected scope. Use the workflow's permitted starting status; board quick-create must never bypass workflow rules. |
| Repeated creation | Add Create and Create another. Preserve context after Create another while clearing task-specific content. Keep drafts on validation failures and protect unsaved work on dismissal. |
| Viewing | Use a wide detail overlay from board/list, with an Open full page action and a stable task URL. Reuse one detail component in both modes. Preserve filters, sort and scroll position on return. |
| Layout | Header: task key, type, editable title, status and actions. Main area: full description, attachments, subtasks and activity. Side panel: people, priority, severity, release, dates, effort and permission-controlled billing. Stack sections on narrow screens. |
| Field editing | Click a field value to edit it in place. Dropdowns save after selection. Text, dates and numbers provide Save/Cancel; Enter saves single-line input and Escape cancels. Description uses explicit Save/Cancel. Show saving, saved and failure feedback next to the field. |
| Empty values | Display a clear Add value affordance for optional fields. Allow clearing nullable values. Offer More fields for less-used optional fields; required fields must remain discoverable. |
| Assignment | Retain multiple assignees and visibly distinguish the primary owner. Use searchable people pickers, scoped to eligible users, with Assign to me. |
| Workflow | Show only authorized transitions. Keep status updates on the workflow path. Later, allow transition dialogs to collect required resolution or handoff details. Validate type changes against the current status and new field requirements. |
| Activity | Add All, Comments, History and Worklogs views. Render readable changes such as Priority: Medium to High, with actor and time. Task history needs task-scoped access and financial redaction, independent of global audit-view permissions. |
| List editing | Add inline cells for priority, owner, planned end date and status through the same editors and mutation rules. Add saved views and bulk updates later, with per-task permission/workflow checks and clear partial-failure results. |

Suggested desktop structure:

```text
Project / TASK-1042                   Status   Actions   Open full page
Editable task title
---------------------------------------------------------------
Description / rich-text editor       Primary owner + collaborators
Attachments                          Priority / Severity
Subtasks                             Version / Planned dates
                                     Estimated / Logged hours
Activity                             Billing (when authorized)
All | Comments | History | Worklogs  More fields
```

## Field configuration

Use shared field definitions across create, detail and list editors so labels, validation and permissions stay consistent. Define field type, options, default, required state, display order, section and create/edit/view visibility. Begin with task-type configuration, then introduce project/product overrides if needed.

Support text, multiline text, numbers, dates, booleans, single/multiple selections and user references. Bug fields could include reproduction steps, expected/actual behavior and environment; development fields could include acceptance criteria. These are proposals, not existing fields.

Reuse the existing type-definition foundation and add validated per-task values. Choose the storage design based on filtering/reporting needs: JSONB is a reasonable initial option, but requires stable field IDs, explicit per-key update/removal semantics, server validation and selective indexes. Preserve historical values when definitions are deactivated; do not silently discard values on type changes. Keep searchable core fields in their existing typed columns.

## Supporting API work

1. Introduce a narrowly validated partial-update contract, such as `PATCH /tasks/:id`. Omitted fields remain unchanged; explicit null clears an allowed nullable field; zero and false remain valid values. Keep compatibility with existing callers while consolidating mutation logic.
2. Enforce update, assignment, transition and financial permissions independently on every path. A generic edit endpoint must not bypass specialized authorization. Scope validation applies to lookup results and submitted values.
3. Add a record revision checked atomically during updates. Reject stale writes with a conflict response and preserve the user's draft while offering refresh/reapply. Apply equivalent protection to assignment and workflow mutations.
4. Make related changes atomic and coordinate audit events and notification generation after successful persistence. Avoid duplicate history entries if both triggers and services record events.
5. Return the saved canonical values and refresh affected detail/list/board data. Optimistic feedback must roll back on failure without losing the draft.
6. Reuse S3 upload services for attachments and embedded media. Rich text needs a consistent sanitized format. Real S3 acceptance remains pending in the existing audit and must be verified by a configured environment.

Any schema implementation must edit canonical CREATE definitions, retain audit columns and master active flags, and follow the blank-database installation policy. The developer/DBA executes and validates SQL manually.

## Delivery order and acceptance

1. **First release:** focused creation, shared drawer/full-page detail, inline core fields, scoped searchable selectors, clear save/error states, null-clearing semantics, permission checks and conflict protection. Include focused API and mocked-browser regressions.
2. **Second release:** rich descriptions/comments, validated custom-field values, field layouts and readable task history.
3. **Third release:** inline list cells, saved views, bulk editing and server-side filtering/sorting/pagination for large datasets. Reuse the existing grid capabilities.

Acceptance should cover keyboard/touch operation, both themes, narrow screens, lost network responses, invalid dates, clearing optional fields, zero/false values, stale edits, forbidden transitions, assignment/financial permissions and branch isolation. Creation must retain context and expose all required fields. Closing details must restore the list context. Existing mobile callers must remain compatible; native mobile parity requires separate implementation and device validation.

## Completion summary

Reviewed repository Markdown documentation and relevant task code. Recommend a task-focused create dialog, shared drawer/full-page detail view, inline field editing, richer content and activity, and configurable fields. Deliver core editing and reliable API updates first, custom fields and rich text second, and list productivity features third. Only this recommendation document was added.
