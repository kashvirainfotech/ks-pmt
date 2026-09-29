# Walkthrough: PLAN-001 — Work Hierarchy, Sprints & Milestones

**Date**: 2026-09-29  
**Implementer**: Senior Full-Stack Developer (Node.js, React, PostgreSQL)  
**Standard**: AGENTS.md & GEMINI.md Guidelines (Canonical blank-database schema, zero skipped fields, strict non-execution of live DB scripts, no automatic git commits)

---

## 1. Executive Summary

In adherence to SRS section 3.31 and roadmap requirement **PLAN-001**, we have engineered a robust delivery planning architecture:
1. **Four-Tier Hierarchy**: `INITIATIVE` → `EPIC` → `TASK` → `SUBTASK` with parent validation and ranked backlog ordering (`backlog_order`).
2. **First-Class Sprints**: Cadenced iteration cycles with explicit goal setting, team capacity calculation, initial commitment snapshotting, mid-sprint scope change ledger tracking (additions and ejections with reasons), and sprint closing with rollover of incomplete items.
3. **Delivery Milestones**: High-level target milestones (`PRODUCT` or `PROJECT` level) linking deliverable tasks, tracking target vs actual completion dates and progress.
4. **Estimation Metrics**: Support for both numeric story points and T-shirt sizing (`XS`, `S`, `M`, `L`, `XL`, `XXL`), permitting Kanban workflows without forcing sprints.
5. **Team Working Capacity Integration**: Seamlessly pulls working calendar and public holiday calculations from **FND-001** (`calendarsService.calculateWorkingCapacity`) factored by member allocation percentages.

---

## 2. Database Artifacts

Following our canonical blank-database installation policy, all DDL definitions were added directly into `dbscripts/tables/tables.sql` with audit tracking columns (`created_by`, `created_at`, `updated_by`, `updated_at`, `is_active`):

1. **`milestones` Table** (`dbscripts/tables/tables.sql`):
   - Scope: `entity_type` (`PRODUCT` / `PROJECT`), `entity_id`, `milestone_name`, `target_date`, `actual_date`, `status` (`PLANNED`, `ACTIVE`, `ACHIEVED`, `MISSED`, `CANCELLED`).
2. **`sprints` Table** (`dbscripts/tables/tables.sql`):
   - Columns: `sprint_name`, `sprint_goal`, `project_id`, `product_id`, `start_date`, `end_date`, `status` (`PLANNING`, `ACTIVE`, `COMPLETED`, `CANCELLED`).
   - Commitment Snapshot metrics: `committed_tasks_count`, `committed_story_points`, `committed_hours`.
   - Completion metrics: `completed_tasks_count`, `completed_story_points`, `completed_hours`, `total_capacity_hours`.
3. **`tasks` Table Enhancement** (`dbscripts/tables/tables.sql`):
   - Added: `hierarchy_level` (`INITIATIVE`, `EPIC`, `TASK`, `SUBTASK`), `sprint_id`, `milestone_id`, `backlog_order`, `story_points`, `t_shirt_size`.
4. **`sprint_tasks` Table (Scope Change Ledger)** (`dbscripts/tables/tables.sql`):
   - Tracks audit events: `is_initial_commitment`, `added_at`, `added_by`, `removed_at`, `removed_by`, `scope_change_reason`, and `rollover_from_sprint_id`.
5. **Indexes & Permissions**:
   - Added composite performance indexes in `dbscripts/indexes/indexes.sql`.
   - Seeded permissions in `dbscripts/inserts/inserts.sql`: `SPRINTS:READ`, `SPRINTS:MANAGE`, `MILESTONES:READ`, `MILESTONES:MANAGE`.
   - Rebuilt pgAdmin installer manifest: `node dbscripts/build-install.mjs` cleanly rebuilt `dbscripts/install.sql`.

---

## 3. Backend Implementation (NestJS)

1. **`SprintsModule`** (`server/src/modules/sprints/`):
   - `sprints.service.ts`:
     - `create`, `findAll`, `findOne`, `update`, `remove`.
     - `startSprint(id, user)`: Validates dates, snapshots initial tasks, sets `is_initial_commitment = TRUE`, computes initial committed metrics, and marks status `ACTIVE`.
     - `closeSprint(id, dto, user)`: Summarizes completed vs incomplete items, rolls incomplete tasks to a designated next sprint or backlog, records rollover audit history, computes capacity, and marks status `COMPLETED`.
     - `addTasks(id, dto, user)` & `removeTask(id, taskId, reason, user)`: Audited scope change management with reasons when altered during active sprint status.
     - `calculateSprintCapacity(id)`: Invokes `CalendarsService.calculateWorkingCapacity` over sprint dates for all project team members multiplied by their allocation percentage.
     - `getScopeLedger(id)`: Detailed audit ledger of sprint scope movements.
   - `sprints.controller.ts`: RBAC guarded endpoints with permission checks.
2. **`MilestonesModule`** (`server/src/modules/milestones/`):
   - `milestones.service.ts`: Full CRUD with linked tasks projection and progress metrics.
   - `milestones.controller.ts`: Protected with `MILESTONES:MANAGE` and `MILESTONES:READ`.
3. **`TasksModule` Extensions** (`server/src/modules/tasks/`):
   - Extended `create-task.dto.ts` and `query-task.dto.ts` with hierarchy, sprint, milestone, and sizing attributes.
   - Added `PATCH /tasks/reorder` endpoint and `reorderTasks` method in `tasks.service.ts` for ranked backlog reordering.

---

## 4. Frontend Implementation (React & TypeScript)

1. **Type Definitions & API Client**:
   - Added `Sprint`, `Milestone`, `SprintTaskScopeLedger`, and extended `Task` in `web/src/types/index.ts`.
   - Created `sprintsApi`, `milestonesApi`, and `tasksApi.reorderTasks` in `web/src/api/endpoints.ts`.
2. **Screens & Metadata**:
   - Registered `Sprints` and `Milestones` screens under Portfolio in `web/src/components/management/screens.ts`.
   - Configured form schemas and column renderers in `web/src/components/management/config.ts` (with status color pills, hierarchy badges, and estimation fields).
3. **Interactive Components (`ManagementPages.tsx`)**:
   - `SprintRelatedRecords`:
     - Dynamic KPI Summary Bar: Committed Points vs Current Points, Committed Tasks vs Current Tasks, Total Team Capacity Hours (calculated via FND-001 calendar API).
     - "Start Sprint" Action: Initiates commitment snapshotting.
     - "Complete Sprint" Modal: Prompts for incomplete task destination (Rollover to next sprint or Backlog).
     - Sub-grids for: Active Sprint Task list (with quick "+ Add Tasks from Backlog" modal) and Scope Change Ledger (showing who added/removed tasks mid-sprint and why).
   - `MilestoneRelatedRecords`:
     - Displays delivery milestones with target vs actual dates and linked deliverable tasks.

---

## 5. Verification & Test Evidence

- **Unit Testing**:
  - `npm test` executed across all backend test suites:
    ```
    PASS src/modules/milestones/milestones.service.spec.ts
    PASS src/modules/sprints/sprints.service.spec.ts
    PASS src/modules/tasks/tasks.regression.spec.ts
    PASS src/modules/tasks/task-editing.spec.ts
    PASS src/modules/projects/dto/create-project.dto.spec.ts
    PASS src/modules/tasks/custom-task-fields.spec.ts
    PASS src/modules/rbac/rbac.service.spec.ts
    PASS src/modules/task-workflows/task-workflows.service.spec.ts
    PASS src/modules/departments/departments.service.spec.ts
    PASS src/database/extended-fields.spec.ts
    PASS src/modules/calendars/calendars.service.spec.ts
    PASS src/modules/assignment/assignment.service.spec.ts

    Test Suites: 12 passed, 12 total
    Tests:       65 passed, 65 total
    ```
- **Frontend Production Build**:
  - `npm run build` executed in `web/`:
    ```
    vite v8.3.1 building client environment for production...
    transforming...
    ✓ 2139 modules transformed.
    dist/index.html                      1.49 kB
    dist/assets/index-DnXOkvJz.css      66.28 kB
    dist/assets/TasksView-ORMIAtS8.js  175.93 kB
    dist/assets/index-BMF_TY4s.js      522.41 kB
    ✓ built in 1.39s with 0 errors
    ```

---

## 6. Next Recommended Roadmap Item

- **PLAN-002: Dependencies, Blocker Episodes & Defect Templates**:
  - Finish-to-Start (FS) and directed Blocks links with inverse displays and directed acyclic graph (DAG) cycle validation.
  - Blocker episodes with owner, reason, next action, and overlapping-duration tracking.
  - Standardized defect template reuse using custom fields (steps to reproduce, expected vs actual behavior, environment, and workaround).
