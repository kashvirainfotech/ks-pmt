# ANALYTICS-001: Contractual SLA & Rule-Based Risk Alerts Walkthrough

## 1. Overview & Objectives

**ANALYTICS-001** launches the foundational module of **Tier E: Delivery Intelligence & Analytics** in KS-PMT. It provides deterministic, reproducible Service Level Agreement (SLA) policy enforcement and automated, rule-based operational risk detection without relying on artificial intelligence claims or arbitrary heuristics.

### Core Acceptance Criteria
1. **Deterministic SLA Policy Selection & Precedence**:
   - Multi-tier matching criteria: Client, Project, Task Type, Priority, Severity, and Tier (`TIER_1_CRITICAL`, `TIER_2_HIGH`, `TIER_3_STANDARD`, `TIER_4_BASIC`).
   - Strict hierarchical match order:
     1. Exact criteria match (Client + Project + Task Type + Priority + Severity).
     2. Scoped criteria match (Project + Task Type + Priority).
     3. Global default fallback policy (`is_default = TRUE`).
   - Immutable snapshot of selected policy & calendar persisted at cycle start to guarantee historical reproducibility.
2. **Customer-Facing Response & Resolution Lifecycle**:
   - **First Response**: Requires an eligible customer-visible reply/message (internal notes and status changes explicitly rejected).
   - **Resolution**: Defined customer-facing terminal outcome (`RESOLVED`, `CLOSED`, `ACCEPTED`), not merely moving to an internal testing stage.
   - Separate time basis tracking: **Business Hours** (working calendar, holiday-aware) vs **Elapsed Hours** (wall-clock real time).
3. **Pauses, Extensions & Reopening Behavior**:
   - Explicit pause reasons (`AWAITING_CLIENT_RESPONSE`, `VENDOR_DEPENDENCY`, `BLOCKED_EXTERNAL`).
   - Resume action calculates pause duration and automatically shifts deadlines outward without losing accumulated tracking time.
   - Date extensions require mandatory reason attribution and link to approved Change Requests (`CLIENT-004`).
   - Reopening a resolved ticket launches a new cycle iteration (`Iteration N+1`) while preserving prior cycle history.
4. **Deterministic Risk Alerts (No AI Hype)**:
   - `SLA_RESPONSE_AT_RISK`: Response elapsed time reaches warning threshold (default 75%).
   - `SLA_RESPONSE_BREACHED`: Response deadline elapsed without customer communication.
   - `SLA_RESOLUTION_AT_RISK`: Resolution time reaches warning threshold.
   - `SLA_RESOLUTION_BREACHED`: Resolution deadline elapsed without terminal status.
   - `STALE_ACTIVE_WORK`: Task has been in active progress for >72 hours without worklogs or updates.
   - `EFFORT_EXCEEDS_CAPACITY`: Remaining task hours exceed assignee available sprint capacity.
   - Automated de-duplication, escalation tiers (1: Tech Lead, 2: PM, 3: Delivery Head), and auto-clearing upon resolution.

---

## 2. Database Schema Artifacts

### 2.1 Schema Tables (`dbscripts/tables/tables.sql`)

Three canonical tables were appended to `dbscripts/tables/tables.sql`:

1. **Table 93: `sla_policies`**:
   - `id`: UUID primary key.
   - `policy_code`: Unique identifier (`SLA-POL-XXXX`).
   - `policy_name`, `description`.
   - Criteria: `client_id`, `project_id`, `task_type_id`, `priority`, `severity`, `tier`.
   - `calendar_id`: FK to `working_calendars(id)`.
   - Targets: `response_time_minutes`, `response_time_basis`, `resolution_time_minutes`, `resolution_time_basis`.
   - Warning thresholds: `response_warning_threshold_pct`, `resolution_warning_threshold_pct`.
   - `escalation_rules`: JSONB array of escalation tiers and notify roles.
   - `precedence_rank`: Integer for deterministic tie-breaking.
   - Audit columns: `is_default`, `is_active`, `created_by`, `created_at`, `updated_by`, `updated_at`.

2. **Table 94: `sla_tracking_cycles`**:
   - `id`: UUID primary key.
   - `cycle_number`: Unique identifier (`SLA-CYC-YYYY-XXXX`).
   - `task_id`, `client_request_id`: Polymorphic references.
   - `sla_policy_id`: FK to `sla_policies(id)`.
   - `cycle_iteration`: Iteration counter (1 for initial, 2+ for reopened).
   - `policy_snapshot`, `calendar_snapshot`: JSONB immutable configuration at cycle start.
   - `status`: Cycle state (`RUNNING`, `PAUSED`, `RESPONSE_MET`, `RESPONSE_BREACHED`, `RESOLVED_MET`, `RESOLVED_BREACHED`, `CANCELLED`).
   - Deadlines: `response_deadline`, `responded_at`, `response_status`, `elapsed_response_minutes`, `business_response_minutes`.
   - Resolutions: `resolution_deadline`, `resolved_at`, `resolution_status`, `elapsed_resolution_minutes`, `business_resolution_minutes`.
   - Pause tracking: `is_paused`, `current_pause_started_at`, `current_pause_reason`, `total_paused_minutes`, `pause_episodes`.
   - Extensions: `original_resolution_deadline`, `extension_count`, `extension_history`, `change_request_id`.
   - Audit columns: `is_active`, `created_by`, `created_at`, `updated_by`, `updated_at`.

3. **Table 95: `risk_alerts`**:
   - `id`: UUID primary key.
   - `alert_code`: Unique identifier (`ALT-YYYY-XXXX`).
   - `alert_type`: Rule category enum.
   - `severity`: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
   - `sla_cycle_id`, `task_id`, `project_id`, `client_id`: Scoped entity references.
   - `title`, `description`, `trigger_reason`, `recommended_action`.
   - `status`: `ACTIVE`, `ACKNOWLEDGED`, `RESOLVED`, `DISMISSED`, `AUTO_CLEARED`.
   - `escalation_tier`: 1, 2, or 3.
   - `assigned_owner_id`, `acknowledged_at`, `acknowledged_by`, `resolved_at`, `resolution_notes`.
   - `freshness_updated_at`: Timestamp for tracking rule freshness.
   - Audit columns: `is_active`, `created_by`, `created_at`, `updated_by`, `updated_at`.

### 2.2 Composite Indexes (`dbscripts/indexes/indexes.sql`)
- `idx_sla_policies_client_project`: `(client_id, project_id)`
- `idx_sla_policies_precedence`: `(precedence_rank, is_active)`
- `idx_sla_policies_code`: `(policy_code)`
- `idx_sla_cycles_task`: `(task_id, status)`
- `idx_sla_cycles_request`: `(client_request_id, status)`
- `idx_sla_cycles_policy`: `(sla_policy_id)`
- `idx_sla_cycles_number`: `(cycle_number)`
- `idx_sla_cycles_deadlines`: `(response_deadline, resolution_deadline)`
- `idx_risk_alerts_status_severity`: `(status, severity)`
- `idx_risk_alerts_cycle`: `(sla_cycle_id)`
- `idx_risk_alerts_task`: `(task_id)`
- `idx_risk_alerts_project`: `(project_id)`
- `idx_risk_alerts_code`: `(alert_code)`
- `idx_risk_alerts_type`: `(alert_type)`

### 2.3 RBAC Permissions (`dbscripts/inserts/inserts.sql`)
- `SLA:READ`: View SLA policies, cycle timers, compliance metrics, and risk alerts.
- `SLA:MANAGE`: Configure SLA policies, target times, pause reasons, and escalation rules.
- `SLA:OPERATE`: Pause/resume SLA cycles, acknowledge/resolve risk alerts, and record date extensions.
- Mapped to Super Admin, Branch Manager, Project Manager, Tech Lead, Developer, and QA roles.

### 2.4 Seed Sample Data (`dbscripts/inserts/sample_data.sql`)
- Policies:
  - `SLA-POL-CRIT-01`: Tier 1 Critical Customer Support (1h response, 4h resolution).
  - `SLA-POL-HIGH-02`: Tier 2 High Priority Enterprise SLA (2h business response, 8h business resolution).
  - `SLA-POL-DEFAULT`: Tier 3 Standard Project Delivery Default SLA (4h response, 24h resolution).
- Cycles:
  - `SLA-CYC-2026-0001`: Active cycle with response met in 35m, resolution pending.
  - `SLA-CYC-2026-0002`: Paused cycle (`AWAITING_CLIENT_RESPONSE`) with recorded extension history.
  - `SLA-CYC-2026-0003`: Breached resolution cycle.
- Alerts:
  - `ALT-2026-0001`: High severity resolution at risk (75% threshold).
  - `ALT-2026-0002`: Medium severity stale active work (>72h).
  - `ALT-2026-0003`: Critical severity effort exceeds assignee sprint capacity.

### 2.5 Installer Verification
- Installer bundle rebuilt: `node dbscripts/build-install.mjs`.
- Tests executed: `node --test dbscripts/build-install.test.mjs` passed cleanly (2/2 tests passed, 0 failures).

---

## 3. Backend REST Implementation (`server/src/modules/sla/`)

### 3.1 DTOs
- `create-sla-policy.dto.ts`: Declares `CreateSlaPolicyDto` with validation constraints.
- `start-sla-cycle.dto.ts`: Declares `StartSlaCycleDto` for initiating tracking cycles.
- `sla-action.dto.ts`: Declares action DTOs (`FirstResponseActionDto`, `ResolutionActionDto`, `PauseCycleDto`, `ExtendDeadlineDto`, `AcknowledgeAlertDto`, `ResolveAlertDto`).

### 3.2 Service Architecture (`SlaService`)
- `createPolicy`, `findAllPolicies`, `findPolicyById`, `updatePolicy`, `deletePolicy`.
- `findApplicablePolicy(params)`: Executes deterministic match ranking based on matching criteria weights and precedence rank.
- `calculateDeadline(startTime, durationMinutes, basis, calendar)`: Stepping calendar working hours algorithm (excluding weekends and non-business hours) or elapsed wall-clock time.
- `startCycle(dto, userId)`: Snapshots policy and calendar, computes response and resolution deadlines.
- `recordFirstResponse(cycleId, dto, userId)`: Validates customer visibility; computes elapsed/business duration; marks `MET` or `BREACHED`.
- `recordResolution(cycleId, dto, userId)`: Validates terminal category; marks `RESOLVED_MET` or `RESOLVED_BREACHED`; auto-clears associated risk alerts.
- `pauseCycle(cycleId, dto, userId)`: Enters paused state, records pause start and reason.
- `resumeCycle(cycleId, userId)`: Re-adjusts deadlines outward by pause duration, appends episode to history.
- `extendDeadline(cycleId, dto, userId)`: Extends deadline with reason attribution and change request linkage.
- `reopenCycle(cycleId, reason, userId)`: Spawns Iteration N+1 tracking cycle while preserving history.
- `evaluateRiskAlerts(filter)`: Scans in-flight cycles and active tasks, generates non-duplicating risk alerts for breached/at-risk targets, stale work, and capacity deficits.
- `getSlaDashboard(projectId, clientId)`: Aggregates real-time compliance rate %, response/resolution averages, and active alert breakdown.

### 3.3 Endpoints
- `POST /api/v1/sla/policies` (`SLA:MANAGE`)
- `GET /api/v1/sla/policies` (`SLA:READ`)
- `GET /api/v1/sla/policies/:id` (`SLA:READ`)
- `PUT /api/v1/sla/policies/:id` (`SLA:MANAGE`)
- `DELETE /api/v1/sla/policies/:id` (`SLA:MANAGE`)
- `POST /api/v1/sla/cycles` (`SLA:OPERATE`)
- `GET /api/v1/sla/cycles` (`SLA:READ`)
- `GET /api/v1/sla/cycles/:id` (`SLA:READ`)
- `POST /api/v1/sla/cycles/:id/first-response` (`SLA:OPERATE`)
- `POST /api/v1/sla/cycles/:id/resolution` (`SLA:OPERATE`)
- `POST /api/v1/sla/cycles/:id/pause` (`SLA:OPERATE`)
- `POST /api/v1/sla/cycles/:id/resume` (`SLA:OPERATE`)
- `POST /api/v1/sla/cycles/:id/extend` (`SLA:OPERATE`)
- `POST /api/v1/sla/cycles/:id/reopen` (`SLA:OPERATE`)
- `POST /api/v1/sla/alerts/evaluate` (`SLA:OPERATE`)
- `GET /api/v1/sla/alerts` (`SLA:READ`)
- `POST /api/v1/sla/alerts/:id/acknowledge` (`SLA:OPERATE`)
- `POST /api/v1/sla/alerts/:id/resolve` (`SLA:OPERATE`)
- `POST /api/v1/sla/alerts/:id/dismiss` (`SLA:OPERATE`)
- `GET /api/v1/sla/dashboard` (`SLA:READ`)

---

## 4. Frontend Implementation (`web/`)

### 4.1 Type Definitions (`web/src/types/index.ts`)
- `SlaTier`, `SlaTimeBasis`, `SlaCycleStatus`, `SlaResponseStatus`.
- `SlaPolicy`, `SlaTrackingCycle`, `RiskAlert`, `SlaDashboardResponse`.

### 4.2 API Client (`web/src/api/endpoints.ts`)
- `slaApi`: Full suite of policy, cycle, alert, and dashboard methods.

### 4.3 UI Component (`web/src/components/sla/SlaAlertsWorkspace.tsx`)
- **Executive SLA Dashboard**:
  - Compliance rate scorecards (Overall, Response %, Resolution %).
  - In-flight running and paused cycle counters.
  - Risk alert distribution (Critical, High, Stale work).
- **Tracking Cycles Console**:
  - Live table of tracking cycles with policy tier, status badges, response/resolution targets, pause time.
  - Interactive action modals: First Response, Resolution, Pause, Extend, Reopen.
- **Risk Alerts & Escalations Hub**:
  - Alert cards with severity badges, escalation tiers (Tier 1/2/3), trigger reasons, recommended actions, owner info, and freshness indicators.
  - Acknowledge and resolve actions.
- **SLA Policies Catalog**:
  - Grid of configured policies with target minutes, business vs elapsed basis, precedence rank, and creation modal.

### 4.4 App Integration
- Route `/sla` added in `web/src/App.tsx`.
- Sidebar navigation item added in `web/src/components/layout/Sidebar.tsx` under Client Delivery.

---

## 5. Verification & Testing

1. **Database Schema & Static Installer**:
   - `node dbscripts/build-install.mjs` executed cleanly.
   - `node --test dbscripts/build-install.test.mjs` passed (2/2 tests passed, 0 failures).
2. **Backend Compilation**:
   - `npm run build` in `server/`: 0 errors.
3. **Frontend Compilation**:
   - `npx tsc --noEmit` in `web/`: 0 errors.
   - `npm run build` in `web/`: Production Vite bundle generated cleanly in 3.42s.
4. **Mandatory Rules & Constraints**:
   - Zero direct SQL execution against any database instance.
   - Zero Git commits or pushes executed.
   - Standard audit columns included on all 3 tables.
