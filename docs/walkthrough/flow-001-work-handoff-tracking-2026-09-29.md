# Walkthrough: FLOW-001 — Work Handoff Tracking & Waiting Queues

**Date:** 2026-09-29  
**Specification Reference:** `FLOW-001` (Software Requirements Specification, Section 4.5 & Increment B)  
**Author:** Senior Full-Stack Engineering Team (8–10 Years Experience Standard)

---

## 1. Executive Summary

In enterprise software engineering and product delivery, significant friction and delivery delays occur during cross-role handoffs (e.g., Business Analyst → Developer, Developer → Code Reviewer, Developer → QA Engineer, QA → Client Review / UAT). Task assignment alone does not constitute acknowledgment or start of work. 

**FLOW-001** introduces structured handoff episode tracking:
1. **Explicit Cross-Role Lifecycle:** `PENDING` (sent, awaiting acknowledgment) → `ACCEPTED` (acknowledged, held by recipient) → `IN_PROGRESS` (active execution) → `RETURNED_FOR_REWORK` / `REDIRECTED` / `COMPLETED` / `CANCELLED`.
2. **Dual Metric Duration Tracking:** Computes **time-to-acknowledgment** distinctly from **time-to-work-start**, calculating both wall-clock elapsed duration and working-calendar business duration (integrating with `FND-001` working schedules and holidays).
3. **Unbroken Successor Chaining:** Returning for rework or redirecting closes the existing waiting episode and automatically creates a linked successor (`predecessor_handoff_id`), preserving queue history without overlapping queue duration totals.
4. **Focused Receiving Queues:** "Waiting for Me" (inbound queue for the user and their delivery teams with ownerless/overdue indicators) and "Waiting for Others" (outbound queue).
5. **Team Waiting Analytics (Zero Individual Blame):** Aggregates count, rework rate (%), and average waiting durations strictly by team and workflow stage with sample sizes to surface process bottlenecks without individual finger-pointing.

---

## 2. Database Schema Architecture

In accordance with [AGENTS.md](../../AGENTS.md) and [GEMINI.md](../../GEMINI.md) blank-database canonical schema guidelines, the schema was defined directly in `dbscripts/` and bundled into the installer manifest without executing any DDL directly against live database instances.

### 2.1 Table Definition: `task_handoffs` (`dbscripts/tables/tables.sql`)

```sql
-- 37. Task Handoffs (FLOW-001)
CREATE TABLE IF NOT EXISTS task_handoffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    from_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    to_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    handoff_type VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'IN_PROGRESS', 'RETURNED_FOR_REWORK', 'REDIRECTED', 'COMPLETED', 'CANCELLED')),
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
    work_started_at TIMESTAMP WITH TIME ZONE,
    work_started_by UUID REFERENCES users(id) ON DELETE SET NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    predecessor_handoff_id UUID REFERENCES task_handoffs(id) ON DELETE SET NULL,
    required_context TEXT,
    rejection_or_return_reason TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_handoff_recipient CHECK (to_team_id IS NOT NULL OR to_user_id IS NOT NULL)
);
```

### 2.2 Performance Indexes (`dbscripts/indexes/indexes.sql`)

```sql
CREATE INDEX IF NOT EXISTS idx_task_handoffs_task ON task_handoffs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_handoffs_to_team ON task_handoffs(to_team_id, status);
CREATE INDEX IF NOT EXISTS idx_task_handoffs_to_user ON task_handoffs(to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_task_handoffs_from_user ON task_handoffs(from_user_id, status);
CREATE INDEX IF NOT EXISTS idx_task_handoffs_predecessor ON task_handoffs(predecessor_handoff_id);
CREATE INDEX IF NOT EXISTS idx_task_handoffs_status ON task_handoffs(status);
```

### 2.3 Seed Data & RBAC Permissions (`dbscripts/inserts/inserts.sql`)

- `HANDOFFS:READ`: Permission to view task handoffs and waiting queues.
- `HANDOFFS:CREATE`: Permission to initiate and send task handoffs.
- `HANDOFFS:ACKNOWLEDGE`: Permission to acknowledge receipt and start work on handoffs.
- `HANDOFFS:MANAGE`: Permission to return for rework, redirect, and manage handoff episodes.
- Granted to `ROLE_SUPER_ADMIN` and regenerated into `dbscripts/install.sql` via `node dbscripts/build-install.mjs`.

---

## 3. Backend Architecture (`server/src/modules/handoffs/`)

### 3.1 Dual Metric Duration Calculation & Acceptance Test Rule

The requirement mandates:
> *Sending a task to QA at 14:32 and starting next day at 10:15 yields 19h 43m elapsed time to work start, with separately labeled business time; redirects/reopening retain the original episode.*

In `HandoffsService.calculateDurations()`:
- **Elapsed Wall-Clock Duration:**
  - Day 1 (Monday) 14:32:00 to Day 2 (Tuesday) 10:15:00:
  - Monday 14:32 to 24:00 = 9h 28m
  - Tuesday 00:00 to 10:15 = 10h 15m
  - Total Elapsed = **19h 43m** (1,183 minutes / 70,980 seconds).
- **Business Schedule Duration:**
  - Standard Business Window: 09:30 to 18:00 (8.5h window) on weekdays.
  - Monday 14:32 to 18:00 = 3h 28m (208 minutes).
  - Tuesday 09:30 to 10:15 = 45m (45 minutes).
  - Total Business Time = **4h 13m** (253 minutes / 15,180 seconds).

### 3.2 State Machine & Chaining Behavior

1. **`createHandoff`:** Verifies task exists, confirms no prior handoff is currently active (`PENDING`, `ACCEPTED`, `IN_PROGRESS`), validates recipient (team or user), resolves sender's team membership, and inserts record with `status: 'PENDING'`.
2. **`acknowledgeHandoff`:** Transitions `PENDING` → `ACCEPTED`. If the item was ownerless (in a team queue), it automatically claims the handoff to the acknowledging user (`to_user_id = userId`).
3. **`startWork`:** Transitions `ACCEPTED` (or `PENDING`) → `IN_PROGRESS`, sets `work_started_at` and `work_started_by`.
4. **`returnForRework`:** Closes current episode as `RETURNED_FOR_REWORK`, sets `rejection_or_return_reason` and `completed_at`, and opens a linked successor handoff (`QA_TO_DEV_REWORK`) pointing back to the original sender with `predecessor_handoff_id = priorHandoffId`.
5. **`redirectHandoff`:** Closes current episode as `REDIRECTED` and opens a linked successor handoff pointing to the forwarded team/user.
6. **`completeHandoff`:** Marks active episode as `COMPLETED`.

### 3.3 REST Endpoints (`server/src/modules/handoffs/handoffs.controller.ts`)

| Method | Endpoint | Guard / Permission | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/handoffs` | `HANDOFFS:CREATE` | Initiate a new cross-role task handoff |
| `GET` | `/handoffs/waiting-for-me` | `HANDOFFS:READ` | Inbound queue (user or user's delivery teams) |
| `GET` | `/handoffs/waiting-for-others` | `HANDOFFS:READ` | Outbound queue initiated by current user |
| `GET` | `/handoffs/analytics` | `HANDOFFS:READ` | Aggregated waiting time and rework analytics |
| `GET` | `/handoffs/tasks/:taskId` | `HANDOFFS:READ` | Full episode chain and timeline for a task |
| `GET` | `/handoffs/:id` | `HANDOFFS:READ` | Single handoff episode details |
| `POST` | `/handoffs/:id/acknowledge` | `HANDOFFS:ACKNOWLEDGE` | Acknowledge receipt and claim ownership |
| `POST` | `/handoffs/:id/start-work` | `HANDOFFS:ACKNOWLEDGE` | Start active execution on handoff |
| `POST` | `/handoffs/:id/return` | `HANDOFFS:MANAGE` | Return for rework with defect explanation |
| `POST` | `/handoffs/:id/redirect` | `HANDOFFS:MANAGE` | Forward / redirect to another team or owner |
| `POST` | `/handoffs/:id/complete` | `HANDOFFS:ACKNOWLEDGE` | Mark stage handoff complete |

---

## 4. Frontend Web Experience (`web/src/components/handoffs/HandoffsWorkspaceView.tsx`)

A dedicated top-level workspace was added at `/handoffs` with a navigation entry in the primary sidebar:

1. **Three-Tab Queue Workspace:**
   - **Waiting for Me (Inbound Queue):** Shows all tasks assigned to the user or unassigned in their delivery teams' queues.
     - **Ownerless Team Queue Badge:** Identifies handoffs sitting in a team queue with no individual owner; clicking "Claim & Acknowledge" assigns the user immediately.
     - **Overdue Indicator:** Highlights handoffs waiting in queue for over 24 hours.
     - **Dual Time Pill:** Real-time display of both Elapsed Waiting Duration ("19h 43m") and Working Calendar Hours ("4h 13m").
     - **Quick Actions:** Acknowledge, Start Work, Complete Stage, Return for Rework, and Redirect.
   - **Waiting for Others (Outbound Queue):** Shows handoffs initiated by the user with real-time tracking of recipient status, time-to-acknowledgment, and time-to-work-start.
   - **Waiting & Rework Analytics Tab:**
     - Overview KPI cards: Total Handoffs, Rework Rate (%), Redirected Episodes, Avg Time to Acknowledge, and Avg Time to Work Start.
     - Stage-by-Stage Breakdown Table (BA → Dev, Dev → Review, Dev → QA, QA → Rework, Dev → UAT, Client Review).
     - **Zero Individual Blame Notice:** Prominently highlights that metrics are strictly team- and stage-aggregated to diagnose process friction rather than individual finger-pointing.
2. **Interactive Modals:**
   - **Initiate Handoff Modal:** Task search, handoff stage, sender team, recipient team, recipient user, context/evidence requirements, and notes.
   - **Return for Rework Modal:** Enforces defect/return explanation and outlines successor episode chaining.
   - **Redirect Modal:** Forwards to a new team/user with audit reasoning.
   - **Episode History Timeline:** Complete visual timeline showing every episode, from/to parties, acknowledge and start timestamps, duration breakdowns, and return reasons.

---

## 5. Verification & Test Suite Results

1. **Backend Unit Testing:**
   - Test File: [server/src/modules/handoffs/handoffs.service.spec.ts](../../server/src/modules/handoffs/handoffs.service.spec.ts)
   - Ran complete Jest test suite across all 19 server test suites:
     ```bash
     PASS src/modules/handoffs/handoffs.service.spec.ts
     PASS src/modules/timesheets/timesheets.service.spec.ts
     PASS src/modules/tasks/tasks.bulk-update.spec.ts
     PASS src/modules/rbac/rbac.service.spec.ts
     PASS src/modules/tasks/task-editing.spec.ts
     PASS src/modules/tasks/tasks.regression.spec.ts
     PASS src/modules/projects/dto/create-project.dto.spec.ts
     PASS src/modules/tasks/custom-task-fields.spec.ts
     PASS src/modules/sprints/sprints.service.spec.ts
     PASS src/modules/calendars/calendars.service.spec.ts
     PASS src/modules/milestones/milestones.service.spec.ts
     PASS src/modules/assignment/assignment.service.spec.ts
     PASS src/modules/teams/teams.service.spec.ts
     PASS src/modules/departments/departments.service.spec.ts
     PASS src/modules/blockers/blockers.service.spec.ts
     PASS src/modules/saved-views/saved-views.service.spec.ts
     PASS src/modules/task-workflows/task-workflows.service.spec.ts
     PASS src/database/extended-fields.spec.ts
     PASS src/modules/dependencies/dependencies.service.spec.ts

     Test Suites: 19 passed, 19 total
     Tests:       114 passed, 114 total
     Snapshots:   0 total
     ```
2. **Frontend Production Build:**
   - Command: `npm run build` in `web/`
   - Result: TypeScript compilation succeeded (`tsc`) and Vite packaged the bundle with zero errors in 4.45s.
3. **Database Manifest Sync:**
   - Installer script regenerated via `node dbscripts/build-install.mjs`.

---

## 6. Summary of Changed / Created Files

- `dbscripts/tables/tables.sql` — Added Table 37 `task_handoffs`.
- `dbscripts/indexes/indexes.sql` — Added indexes for `task_handoffs`.
- `dbscripts/inserts/inserts.sql` — Added `HANDOFFS` permissions and Super Admin role grants.
- `dbscripts/install.sql` — Rebuilt installer script manifest.
- `server/src/modules/handoffs/dto/create-handoff.dto.ts` — DTO for handoff creation.
- `server/src/modules/handoffs/dto/handoff-actions.dto.ts` — DTOs for acknowledge, start work, return, redirect, complete, and query.
- `server/src/modules/handoffs/handoffs.service.ts` — Core service with duration calculator and state transitions.
- `server/src/modules/handoffs/handoffs.controller.ts` — RBAC-guarded REST endpoints.
- `server/src/modules/handoffs/handoffs.module.ts` — NestJS module registration.
- `server/src/modules/handoffs/handoffs.service.spec.ts` — Unit tests covering acceptance rule and lifecycle.
- `server/src/app.module.ts` — Registered `HandoffsModule`.
- `web/src/types/index.ts` — Added `TaskHandoff` and `HandoffAnalyticsResponse` types.
- `web/src/api/endpoints.ts` — Added `handoffsApi` client calls.
- `web/src/components/handoffs/HandoffsWorkspaceView.tsx` — Full React workspace for handoffs, queues, and analytics.
- `web/src/App.tsx` — Registered route `/handoffs`.
- `web/src/components/layout/Sidebar.tsx` — Added Work Handoffs link to primary navigation.
- `docs/tasks-checklist.md` — Marked `FLOW-001` as completed.
- `README.md` — Updated status table and roadmap.
