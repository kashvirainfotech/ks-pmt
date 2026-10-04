# ANALYTICS-002: Flow Analytics & Bottlenecks Walkthrough

## 1. Overview & Objectives

**ANALYTICS-002** implements Flow Analytics and Bottleneck Detection within **Tier E: Delivery Intelligence** of the KS-PMT platform. It provides quantitative, reproducible insight into work in progress, stage dwell times, queuing delays, active vs. waiting intervals, cumulative flow, and lead/cycle time distributions across software delivery teams.

### Core Acceptance Criteria
1. **WIP Limits & Authorized Expedited Exceptions**:
   - Configurable maximum WIP limits scoped by Stage (`status_id`), User (`user_id`), Team (`team_id`), or Project (`project_id`).
   - Two enforcement modes:
     - `SOFT_WARNING`: Warns users when the threshold is reached or exceeded, allowing authorized transitions.
     - `HARD_GUARD`: Strictly blocks task entry into the stage or assignment to the user unless authorized.
   - **Authorized Expedited Exceptions**: Records explicit override justifications attributed to accountable PMs or Tech Leads with expiration timestamps.
   - **Distinct Work Item Counting**: Stage totals count distinct work items once. Blocked tasks are tracked as an overlay attribute (`is_blocked = TRUE`), never double-counted into WIP totals.
   - Primary owner vs. collaborator views to prevent inflated team totals.
2. **Operational Aging & Queue Timing**:
   - Tracks total item age (from `created_at`), current status tenure, primary owner tenure, blocked age (from `task_blocker_episodes`), and queue waiting age.
   - Configurable non-overlapping aging warning (`warning_threshold_hours`, e.g. 48h) and critical stale (`critical_threshold_hours`, e.g. 96h) thresholds by project, priority, and status with explicit precedence.
   - Terminal work freezes clocks; status changes start new tenure intervals while preserving prior historical intervals.
   - Explicit architectural declaration: **Aging is a process diagnostic signal to unblock queues, strictly never an individual employee performance score**.
3. **Active versus Waiting Flow Time Partitioning**:
   - Classifies each task duration interval into `ACTIVE`, `WAITING`, or `UNCLASSIFIED`.
   - Categorized waiting reasons: `CUSTOMER`, `DEPENDENCY`, `APPROVAL`, `REVIEW_QA_QUEUE`, `ENVIRONMENT`, `VENDOR`, `TEAM_AVAILABILITY`, `OTHER`.
   - Complete disjoint partition guarantee: `active + waiting + unclassified = totalCycleTime`.
   - Explicit architectural declaration: **Flow durations measure process wait and lead times; they are strictly independent from logged timesheet effort (worklogs)**.
4. **Lead Time & Cycle Time Distributions**:
   - **Lead Time**: Duration from creation to verified closure.
   - **Cycle Time**: Duration from actual start (`actual_start_date` / first active transition) to verified closure.
   - Percentile calculations: 50th (median), 85th (SLA baseline), and 95th (tail risk) percentiles.
   - Reopened tasks tracked with First-Time-Right (FTR) quality metrics.
   - Separate accounting of cancelled tasks (`CANCELLED` status category) so cancellations do not distort completed-work cycle time or inflate delivery throughput.
5. **Cumulative Flow Diagrams (CFD) & Dwell Time Heatmap**:
   - Banded daily volume progression across statuses (`DONE`, `REVIEW_TEST`, `IN_PROGRESS`, `TODO`).
   - Visual stage dwell time heatmap highlighting acute bottlenecks (>48h average dwell).
   - Snapshot rebuild capability from canonical source events.

---

## 2. Database Schema Artifacts

### 2.1 Schema Tables (`dbscripts/tables/tables.sql`)

Five canonical tables were appended to `dbscripts/tables/tables.sql` (Tables 96 through 100):

1. **Table 96: `wip_limits`**:
   - `id`: UUID primary key.
   - `limit_code`: Unique identifier (`WIP-STAGE-XXXX`, etc.).
   - `name`, `description`.
   - `limit_type`: Scope enum (`STAGE`, `USER`, `TEAM`, `PROJECT`).
   - `project_id`, `team_id`, `user_id`, `status_id`.
   - `max_wip_count`: Integer ceiling (> 0).
   - `enforcement_mode`: `SOFT_WARNING` | `HARD_GUARD`.
   - Standard audit columns: `is_active`, `created_by`, `created_at`, `updated_by`, `updated_at`.

2. **Table 97: `wip_override_exceptions`**:
   - `id`: UUID primary key.
   - `exception_code`: Unique identifier (`EXC-YYYY-XXXX`).
   - `wip_limit_id`: FK to `wip_limits(id)`.
   - `task_id`: FK to `tasks(id)`.
   - `user_id`, `team_id`, `status_id`, `project_id`.
   - `current_wip_count`, `limit_value`.
   - `reason`: Mandatory text justification.
   - `is_expedited`: Boolean flag.
   - `authorized_by`: FK to `users(id)`.
   - `authorized_at`, `expires_at`.
   - Standard audit columns.

3. **Table 98: `task_status_durations`**:
   - `id`: UUID primary key.
   - `task_id`: FK to `tasks(id)`.
   - `status_id`, `previous_status_id`: FKs to `task_statuses(id)`.
   - `assigned_user_id`: FK to `users(id)` (primary owner during interval).
   - `responsible_team_id`: FK to `teams(id)`.
   - `flow_interval_type`: `ACTIVE` | `WAITING` | `UNCLASSIFIED`.
   - `waiting_reason`: Enum (`CUSTOMER`, `DEPENDENCY`, `APPROVAL`, `REVIEW_QA_QUEUE`, `ENVIRONMENT`, `VENDOR`, `TEAM_AVAILABILITY`, `OTHER`).
   - `started_at`, `ended_at`.
   - `elapsed_duration_minutes`, `business_duration_minutes`.
   - `is_current`: Boolean flag.
   - `is_rework`: Boolean flag.
   - `rework_type`: Enum (`REOPENED_DEFECT`, `QA_REJECT`, `SCOPE_CHANGE`, `OTHER`).
   - Standard audit columns.

4. **Table 99: `flow_aging_configurations`**:
   - `id`: UUID primary key.
   - `config_code`: Unique identifier (`AGING-XXXX`).
   - `name`, `description`.
   - Scoping: `project_id`, `team_id`, `task_type_id`, `priority`, `status_id`.
   - `warning_threshold_hours`: Numeric (e.g. 48.00).
   - `critical_threshold_hours`: Numeric (e.g. 96.00).
   - `time_basis`: `BUSINESS_HOURS` | `ELAPSED_HOURS`.
   - `calendar_id`: FK to `working_calendars(id)`.
   - `precedence_rank`: Integer for deterministic matching.
   - Standard audit columns.

5. **Table 100: `daily_cumulative_flow_snapshots`**:
   - `id`: UUID primary key.
   - `project_id`, `product_id`, `sprint_id`.
   - `snapshot_date`: Date.
   - `status_category`: Category string (`TODO`, `IN_PROGRESS`, `REVIEW_TEST`, `DONE`, `CANCELLED`).
   - `status_id`: FK to `task_statuses(id)`.
   - `task_count`: Integer count.
   - `story_points`: Numeric total points.
   - `is_rebuilt`: Boolean flag indicating on-demand reconstruction.
   - Standard audit columns.

### 2.2 Indexes (`dbscripts/indexes/indexes.sql`)
- Scoped indexes on `wip_limits` (`idx_wip_limits_scope`, `idx_wip_limits_project`, `idx_wip_limits_team`, `idx_wip_limits_user`, `idx_wip_limits_status`, `idx_wip_limits_code`).
- Audited exception indexes on `wip_override_exceptions` (`idx_wip_exceptions_task`, `idx_wip_exceptions_limit`, `idx_wip_exceptions_authorized`, `idx_wip_exceptions_project`, `idx_wip_exceptions_code`).
- Duration and tenure indexes on `task_status_durations` (`idx_task_durations_task`, `idx_task_durations_status`, `idx_task_durations_user`, `idx_task_durations_team`, `idx_task_durations_dates`, `idx_task_durations_rework`).
- Precedence ranking index on `flow_aging_configurations` (`idx_flow_aging_project`, `idx_flow_aging_precedence`, `idx_flow_aging_code`).
- CFD snapshot lookup index on `daily_cumulative_flow_snapshots` (`idx_cfd_snapshots_lookup`, `idx_cfd_snapshots_date_cat`, `idx_cfd_snapshots_prod`).

### 2.3 RBAC Permissions (`dbscripts/inserts/inserts.sql`)
- `FLOW:READ`: Permission to view flow analytics, cumulative flow diagrams, dwell heatmaps, cycle time distributions, and WIP metrics.
- `FLOW:MANAGE`: Permission to configure WIP limits, flow aging thresholds, and rebuild flow snapshots.
- `FLOW:OVERRIDE`: Permission to authorize expedited WIP limit override exceptions.
- Mapped to standard operational roles (`ROLE_SUPER_ADMIN`, `ROLE_PM`, `ROLE_TECH_LEAD`, `ROLE_QA_LEAD`, `ROLE_BRANCH_MGR`, `ROLE_DEV`).

---

## 3. Backend Engine (`server/src/modules/flow-analytics/`)

- **`FlowAnalyticsService`**:
  - `getWipLimits`, `createWipLimit`, `updateWipLimit`, `deleteWipLimit`: Full CRUD on WIP limits.
  - `checkWipLimits`: Real-time evaluation against active tasks; detects soft warnings and enforces hard guards.
  - `createOverrideException`, `getOverrideExceptions`: Attributed override authorization with audit log trail.
  - `getCurrentWipBoard`: Aggregates active WIP by status and user, separating primary owners from collaborators, tracking blocked items as an overlay without double-counting.
  - `getOperationalAging`: Diagnoses active task tenures against configurable warning and critical thresholds.
  - `getFlowTimePartition`: Partitions cycle time into Active, Waiting (with sub-reasons), and Unclassified intervals.
  - `getCycleTimeMetrics`: Calculates 50th, 85th, and 95th percentiles for completed tasks; isolates cancelled work.
  - `getCumulativeFlowData`, `rebuildCfdSnapshots`: Daily snapshot retrieval and on-demand reconstruction from canonical task events.
  - `getDwellTimeHeatmap`: Computes average and business dwell time per status, flagging stages where dwell time exceeds 48 hours.
  - `getFlowAgingConfigs`, `createFlowAgingConfig`: Custom threshold configuration per project and priority.
- **`FlowAnalyticsController`**:
  - Protected with `JwtAuthGuard`, `DynamicRbacGuard`, and `@Permissions(...)`.
- **`FlowAnalyticsModule`**: Registered in `server/src/app.module.ts`.

---

## 4. Frontend Console (`web/src/components/flow-analytics/FlowAnalyticsWorkspace.tsx`)

- **Executive Overview & Bottlenecks**:
  - Scorecard metrics: Active WIP, Flow Efficiency %, Median Cycle Time (p50), First-Time-Right % rate.
  - Stage Dwell Time Heatmap with bottleneck indicator badges and visual progress bars.
  - Active vs. Waiting Flow Time Partitioning with segmented color bar and waiting reasons table.
- **WIP Limits & Live Kanban Board**:
  - Stage columns showing task counts, limits, enforcement modes, and blocked task overlays.
  - Engineer workload table comparing Primary Owner WIP vs Collaborator WIP.
  - Modal workflows: "Configure WIP Limit" and "Authorize Expedited Bypass".
- **Cumulative Flow & Distributions**:
  - Banded daily CFD visualization with "Rebuild CFD Snapshots" action.
  - Lead Time and Cycle Time percentile cards (50th, 85th, 95th percentiles).
  - Explicit disclosure of cancelled task segregation.
- **Work Aging Radar**:
  - Color-coded aging severity table (Green: Normal, Amber: Warning, Red: Critical Stale).
  - Search and priority filter controls.
  - Prominent process diagnostic disclaimer.
- Registered under route `/flow-analytics` and accessible in the main sidebar under **Client Delivery**.

---

## 5. Verification & Test Outcomes

1. **Database Manifest**:
   - `node dbscripts/build-install.mjs`: Successfully generated `install.sql`.
   - `node --test dbscripts/build-install.test.mjs`: 2/2 tests passed with 0 failures.
2. **Backend Compilation**:
   - `npm run build` in `server/`: Completed with exit code 0 (`nest build` clean).
3. **Frontend Compilation**:
   - `npx tsc --noEmit` in `web/`: Completed with exit code 0.
   - `npm run build` in `web/`: Production build generated clean bundles in `dist/`.
