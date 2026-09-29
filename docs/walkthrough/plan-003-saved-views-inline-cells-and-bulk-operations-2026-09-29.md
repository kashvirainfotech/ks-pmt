# Walkthrough: PLAN-003 — Saved Views, Inline Cells & Bulk Operations

**Date**: 2026-09-29  
**Implementer**: Senior Full-Stack Developer (Node.js, React, PostgreSQL)  
**Standard**: AGENTS.md & GEMINI.md Guidelines (Canonical blank-database schema, zero skipped fields, strict non-execution of live DB scripts, no automatic git commits)

---

## 1. Executive Summary

In adherence to SRS section 3.33 and roadmap requirement **PLAN-003**, we have engineered a comprehensive list productivity, attention workspace, inline editing, and bulk operations engine:

1. **Personal & Team Saved Views**:
   - Customizable saved views capturing complex filters, visible columns, multi-column sorting, and grouping.
   - Dual scoping: `PERSONAL` (private to user) and `PROJECT`/`TEAM` (shared across project collaborators).
   - Favorite pinning (`is_favorite`) and user default view (`is_default`) resolution.
   - Dynamic Attention Workspace Presets:
     - **My Work**: All incomplete tasks assigned to current user across projects.
     - **Awaiting QA**: Tasks in QA, review, or testing status categories.
     - **Awaiting Client**: Tasks awaiting client clarification, review, or approval.
     - **Blocked**: Tasks with active blocker episodes or unmet prerequisite dependencies.
     - **Unassigned**: Active backlog items without assigned teammates.

2. **Inline Cell Editing**:
   - Status cell: Instant dropdown with workflow state-machine validation and optimistic updates.
   - Priority cell: Instant dropdown (`LOW`, `MEDIUM`, `HIGH`, `URGENT`, `CRITICAL`) with visual badge states.
   - Points / Estimates: Instant inline visibility and quick updates without opening modals.

3. **Permission-Aware Bulk Operations & Partial Failure Reporting**:
   - Multi-task checkbox selection with "Select All" and floating bottom action bar.
   - Bulk updates for Status, Priority, and Assignee.
   - **Optimistic Concurrency & Revision Checks**: Validates `expectedRevision === task.revision` per task.
   - **Partial Failure Engine**: Returns a structured envelope reporting succeeded tasks alongside failed tasks with actionable failure codes (`REVISION_CONFLICT`, `INVALID_TRANSITION`, `VALIDATION_ERROR`).
   - Dedicated results dialog presenting clear green success badges and red conflict explanations.

4. **Coordinated Server-Side Queries & Export**:
   - Multi-column sort expressions (e.g. `priority:desc,planned_due_date:asc,created_at:desc`).
   - Server-side filtering (`unassignedOnly`, `isCompleted`, `statusCategory`, `isBlocked`, `sprintId`, `milestoneId`, `search`).
   - `exportTasks` endpoint: Coordinates with active filters to stream/generate complete CSV exports for large result sets rather than truncating to single-page client tables.

---

## 2. Database Artifacts

Following our canonical blank-database installation policy, all DDL definitions were added directly into `dbscripts/tables/tables.sql` with audit tracking columns (`created_by`, `created_at`, `updated_by`, `updated_at`, `is_active`):

1. **`saved_views` Table** (`dbscripts/tables/tables.sql`):
   - Scope: `entity_type` (`TASK`, `DEFECT`, `SPRINT`, `PROJECT`, `PORTFOLIO`, `MY_WORK`), `scope` (`PERSONAL`, `TEAM`, `PROJECT`, `GLOBAL`), `project_id`, `product_id`, `user_id`.
   - Settings: `is_default`, `is_favorite`, `icon`, `color`, `filters` (JSONB), `columns` (JSONB), `sort` (JSONB), `group_by`, `view_mode` (`LIST`, `KANBAN`, `CALENDAR`, `TIMELINE`).
2. **Performance Indexes** (`dbscripts/indexes/indexes.sql`):
   - `idx_saved_views_user`: Fast lookup of personal views for user.
   - `idx_saved_views_project`: Fast lookup of project/team shared views.
   - `idx_saved_views_favorite`: Filtered index for favorite views.
   - `idx_tasks_sorting_priority_due`: Composite index for multi-column sorting performance.
3. **Permissions & Seeds** (`dbscripts/inserts/inserts.sql`):
   - Seeded permissions: `SAVED_VIEWS:READ`, `SAVED_VIEWS:MANAGE`.
   - Mapped to Super Admin role.
4. **Installer Manifest**:
   - Executed `node dbscripts/build-install.mjs` to regenerate `dbscripts/install.sql`.

---

## 3. Backend Implementation (NestJS)

1. **`SavedViewsModule`** (`server/src/modules/saved-views/`):
   - `saved-views.service.ts`:
     - `createView`: Unsets previous default when `isDefault = TRUE`, persists view.
     - `findAllViews`: Returns personal views + shared team/project views with search & project filtering.
     - `findOneView`: Validates ownership or team/project sharing.
     - `updateView` & `deleteView`: Enforces ownership checks and soft deletion.
     - `toggleFavorite`: Star/unstar toggle.
     - `getPresets`: Generates dynamic system presets for the authenticated user.
   - `saved-views.controller.ts`: Guarded with `SAVED_VIEWS:READ` and `SAVED_VIEWS:MANAGE`.
   - `saved-views.service.spec.ts`: Unit tests testing view creation, privacy scoping, preset generation, and favorite toggling.
2. **`TasksModule` Extensions** (`server/src/modules/tasks/`):
   - `tasks.service.ts`:
     - Extended `findAll` with `unassignedOnly`, `isCompleted`, `statusCategory`, and multi-column `sort`.
     - `bulkUpdateTasks`: Executes bulk updates with revision checks, workflow transition verification, bug resolution validation, and partial failure reporting (`succeeded` vs `failed`).
     - `exportTasks`: Coordinated server-side export streaming formatted CSV with escaped fields.
   - `tasks.controller.ts`:
     - Added `POST /tasks/bulk-update` with `TASKS:UPDATE` permission.
     - Added `GET /tasks/export` with `TASKS:READ` permission.
   - `tasks.bulk-update.spec.ts`: Unit test suite testing partial failures, revision mismatch, and workflow checks.
3. **App Registration**:
   - Registered `SavedViewsModule` in `server/src/app.module.ts`.

---

## 4. Frontend Implementation (React)

1. **Type Definitions & API Endpoints**:
   - Extended `web/src/types/index.ts` with `SavedView`, `SavedViewPreset`, `BulkUpdateItem`, `BulkUpdateTasksResponse`, and added `'CRITICAL'` to `Task.priority`.
   - Extended `web/src/api/endpoints.ts` with `savedViewsApi` and added `tasksApi.bulkUpdate` and `tasksApi.exportTasks`.
2. **Tasks View UI** (`web/src/components/tasks/TasksView.tsx`):
   - **Saved Views & Presets Bar**: Quick pills for "All Tasks", "My Work", "Awaiting QA", "Awaiting Client", "Blocked", "Unassigned", and custom saved views with favorite stars.
   - "Save View" modal: Form to name view, choose scope (`PERSONAL` vs `PROJECT`), set default, and capture current filter configuration.
   - "Manage Views" modal: Modal to browse, favorite, and delete saved views.
   - **Inline Cell Editing**: Clickable dropdowns for Status and Priority directly in the table row with instant optimistic feedback.
   - **Multi-Task Selection**: Checkbox column and floating action bar when tasks are selected.
   - **Bulk Operations**: Modals to apply Status, Priority, or Assignee changes in bulk.
   - **Partial Failure Results Report**: Detailed modal showing succeeded tasks vs failed tasks with specific reasons (e.g. revision conflict or invalid transition).
   - **Server-Side Coordinated Export**: "Export CSV" button streaming full result set from backend.

---

## 5. Verification Results

1. **Backend Unit Tests**:
   - `npm test` executed across all 16 test suites in `server/`:
   - **16 passed, 16 total suites; 84 passed, 84 total tests**.
   - Passed both `saved-views.service.spec.ts` and `tasks.bulk-update.spec.ts`.
2. **Frontend Production Build**:
   - `npm run build` executed in `web/`:
   - TypeScript compiler (`tsc`) and Vite bundler completed with **0 errors**.
3. **Install Bundle**:
   - `node dbscripts/build-install.mjs` cleanly verified and generated `dbscripts/install.sql`.
4. **Task Checklist**:
   - Marked `PLAN-003` as completed (`[x]`) in `docs/tasks-checklist.md`.
