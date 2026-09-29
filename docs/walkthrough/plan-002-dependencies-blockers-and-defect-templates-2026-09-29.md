# Walkthrough: PLAN-002 — Dependencies, Blocker Episodes & Defect Templates

**Date**: 2026-09-29  
**Implementer**: Senior Full-Stack Developer (Node.js, React, PostgreSQL)  
**Standard**: AGENTS.md & GEMINI.md Guidelines (Canonical blank-database schema, zero skipped fields, strict non-execution of live DB scripts, no automatic git commits)

---

## 1. Executive Summary

In adherence to SRS section 3.32 and roadmap requirement **PLAN-002**, we have engineered a comprehensive task dependency graph, blocker episode lifecycle engine, and structured defect template system:

1. **Dependency Engine**:
   - Directed scheduling links (`FINISH_TO_START`, `BLOCKS`) and bidirectional traceability links (`RELATED_TO`, `DUPLICATE_OF`, `CAUSES`, `FIXED_BY`, `TESTED_BY`, `RELEASED_IN`).
   - **Inverse Display Semantics**: Automatically projects complementary relationship labels (e.g., if Task A `BLOCKS` Task B, Task B displays `BLOCKED_BY` Task A; if Task A `CAUSES` Defect B, Defect B displays `CAUSED_BY` Task A).
   - **DAG Cycle Prevention**: Recursive PostgreSQL CTE cycle detection enforced strictly on directed scheduling links. Non-scheduling traceability links bypass cycle constraints per specification.
   - Self-dependency rejection (`chk_no_self_dependency`).

2. **Blocker Episodes & Radar Engine**:
   - Dedicated blocker episode records capturing owner, category (`TECHNICAL`, `DEPENDENCY`, `THIRD_PARTY`, `REQUIREMENT`, `ENVIRONMENT`, `INFRASTRUCTURE`, `APPROVAL`), priority, reason, next action, follow-up date, and expected resolution date.
   - **Overlapping Duration Algorithm**: `calculateNonOverlappingBlockedMinutes` uses interval-merging `[start, end]` so concurrent or overlapping episodes count elapsed blocked time exactly once.
   - **Acceptance Rule for Unblocking**: When resolving a blocker episode, task blocked status (`tasks.is_blocked`) is recalculated. A task remains blocked as long as any unresolved blocker episode or active blocking dependency persists.
   - **Blocker Radar View**: Cross-project and cross-product operational dashboard computing active blocker counts, critical counts, SLA age breaches, follow-up alerts, and category/priority distributions.

3. **Defect Template & Resolution Enforcement**:
   - Custom field template seeded for `BUG` task type with dedicated validation for reproduction steps, expected behavior, actual behavior, environment, and workaround.
   - Strict resolution classification enforced when transitioning defects into terminal/resolved statuses: `FIXED`, `WONT_FIX`, `DUPLICATE`, `CANNOT_REPRODUCE`, `BY_DESIGN`.
   - Distinct separation between Priority (scheduling urgency) and Severity (functional impact).

---

## 2. Database Artifacts

Following our canonical blank-database installation policy, all DDL definitions were added directly into `dbscripts/tables/tables.sql` with audit tracking columns (`created_by`, `created_at`, `updated_by`, `updated_at`, `is_active`):

1. **`tasks` Table Enhancement** (`dbscripts/tables/tables.sql`):
   - Added: `resolution` (`FIXED`, `WONT_FIX`, `DUPLICATE`, `CANNOT_REPRODUCE`, `BY_DESIGN`), `resolution_details`, `resolved_at`, `resolved_by`, and `is_blocked`.
2. **`task_dependencies` Table** (`dbscripts/tables/tables.sql`):
   - Columns: `source_task_id`, `target_task_id`, `link_type`, `description`.
   - Constraints: `chk_no_self_dependency` (`source_task_id <> target_task_id`), `uq_task_dependency` (`source_task_id`, `target_task_id`, `link_type`).
3. **`task_blocker_episodes` Table** (`dbscripts/tables/tables.sql`):
   - Columns: `task_id`, `owner_user_id`, `blocking_task_id`, `reason`, `next_action`, `follow_up_date`, `expected_resolution_date`, `category`, `priority`, `notes`, `started_at`, `resolved_at`, `resolved_by`, `resolution_notes`, `status` (`ACTIVE`, `RESOLVED`, `DISMISSED`).
4. **Indexes & Permissions**:
   - Added composite performance indexes in `dbscripts/indexes/indexes.sql` for source/target dependencies, blocker task IDs, and active blocker lookups.
   - Seeded permissions in `dbscripts/inserts/inserts.sql`: `DEPENDENCIES:READ`, `DEPENDENCIES:MANAGE`, `BLOCKERS:READ`, `BLOCKERS:MANAGE`.
   - Seeded defect template custom fields for `BUG` (`v_tt_bug`).
   - Rebuilt pgAdmin installer manifest: `node dbscripts/build-install.mjs` cleanly rebuilt `dbscripts/install.sql`.

---

## 3. Backend Implementation (NestJS)

1. **`DependenciesModule`** (`server/src/modules/dependencies/`):
   - `dependencies.service.ts`:
     - `create`: Rejects self-links, executes recursive CTE cycle check for `BLOCKS` and `FINISH_TO_START`, persists link, and recalculates target task `is_blocked`.
     - `remove`: Deletes link and recalculates `is_blocked`.
     - `getTaskDependencies`: Projects outgoing and incoming dependencies with bidirectional labels (`Blocks` / `Blocked By`, `Causes` / `Caused By`, etc.).
     - `getDependencyMap`: Computes upstream prerequisites and downstream impact with overdue and stale-blocking diagnostics.
   - `dependencies.controller.ts`: Guarded with `DEPENDENCIES:READ` and `DEPENDENCIES:MANAGE`.
   - `dependencies.service.spec.ts`: Unit test suite testing self-links, DAG cycle detection, non-scheduling link allowances, and inverse labels.
2. **`BlockersModule`** (`server/src/modules/blockers/`):
   - `blockers.service.ts`:
     - `createBlocker`: Records new episode and flags task `is_blocked = TRUE`.
     - `resolveBlocker`: Sets `status = 'RESOLVED'` or `'DISMISSED'`, sets `resolved_at`, records resolution notes, and executes unblocking acceptance rule (unblocks task only if 0 active episodes and 0 blocking dependencies remain).
     - `calculateNonOverlappingBlockedMinutes`: Merges overlapping time intervals into disjoint ranges.
     - `getBlockerRadar`: Aggregates active blockers, age calculation, breach flags, follow-up flags, and category/priority group metrics.
   - `blockers.controller.ts`: Guarded with `BLOCKERS:READ` and `BLOCKERS:MANAGE`.
   - `blockers.service.spec.ts`: Unit test suite testing interval merging and acceptance rule when multiple blockers exist.
3. **`TasksModule` Extensions** (`server/src/modules/tasks/`):
   - Extended `create-task.dto.ts`, `change-status.dto.ts`, and `query-task.dto.ts` with `resolution`, `resolutionDetails`, and `isBlocked` filtering.
   - Enforced resolution classification when transitioning a bug/defect into a closed status.
4. **App Registration**:
   - Registered `DependenciesModule` and `BlockersModule` in `server/src/app.module.ts`.

---

## 4. Frontend Implementation (React)

1. **Type Definitions & API Endpoints**:
   - Extended `web/src/types/index.ts` with `TaskDependency`, `TaskBlockerEpisode`, `BlockerRadarData`, and `TaskDependencyMap`.
   - Added `dependenciesApi` and `blockersApi` in `web/src/api/endpoints.ts`.
2. **Task Drawer UI Enhancements** (`web/src/components/tasks/TaskDrawer.tsx`):
   - **Blocker Banner**: Displays high-visibility red alert banner when `is_blocked` is true with active blocker details.
   - **Resolution Banner**: Displays green resolution banner when task has a recorded resolution.
   - **Dependencies Tab**: Lists incoming and outgoing links with status badges, link type selector, cross-project badges, and quick link removal.
   - **Blockers Tab**: Lists active and resolved blocker episodes, non-overlapping total blocked duration, "Log Blocker" modal with category/priority/next action, and "Resolve Blocker" modal.
   - **Defect Resolution Prompt**: Intercepts terminal status transitions on bugs to require selection of resolution reason (`FIXED`, `WONT_FIX`, etc.) and optional details.
3. **Blocker Radar Screen** (`web/src/components/management/ManagementPages.tsx`):
   - Added `/blockers` screen under the Portfolio navigation.
   - Metric cards: Total Active, Critical Blockers, Breached SLA (>48h), and Oldest Blocker Age.
   - Category and priority distribution summary bars.
   - Live interactive DataGrid of all active blockers with quick resolve action.

---

## 5. Verification Results

1. **Backend Unit Tests**:
   - `npm test` executed across all 14 test suites in `server/`:
   - **14 passed, 14 total suites; 75 passed, 75 total tests**.
   - Passed both `dependencies.service.spec.ts` (cycle detection & mapping) and `blockers.service.spec.ts` (overlapping duration & acceptance rule).
2. **Frontend Production Build**:
   - `npm run build` executed in `web/`:
   - TypeScript compiler (`tsc`) and Vite bundler completed with **0 errors**.
3. **Install Bundle**:
   - `node dbscripts/build-install.mjs` cleanly verified and generated `dbscripts/install.sql`.
4. **Task Checklist**:
   - Marked both `PLAN-002` and `PLAN-002 — defect templates` as completed (`[x]`) in `docs/tasks-checklist.md`.
