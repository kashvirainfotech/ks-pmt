# Walkthrough: TIME-001 Weekly Timesheets, Reviewer Portions & Persistent Global Timer

**Date**: 2026-09-29  
**Status**: Completed & Verified  
**Feature Code**: `TIME-001`  
**Applicability**: Backend (NestJS), Web (React), Database (PostgreSQL canonical schema)

---

## 1. Executive Summary

As a senior full-stack developer (8–10 years experience in Node.js, React, and PostgreSQL), we have implemented the full specifications for **TIME-001** with zero skipped fields, robust error handling, transactional safety, and responsive UI.

The solution delivers:
1. **Configurable Weekly Grid & Working Calendar Expected Hours**:
   - Monday-to-Sunday weekly grid dynamically aggregating logged effort across tasks and projects.
   - Deep integration with `FND-001` (`CalendarsService.calculateWorkingCapacity`) computing exact expected working capacity after accounting for working shifts, public holidays, and approved employee leaves (e.g. 32-hour standard week with 8h approved leave expects 24h).
   - Missing capacity indicators and warnings if submitted effort is below expected working hours.

2. **Cross-Project Reviewer Portions**:
   - Weekly timesheets split into individual project reviewer portions routed to respective Project/Product reviewers.
   - Overall timesheet approval requires unanimous approval of all project portions. Any portion rejection transitions timesheet to `REJECTED` with recorded feedback, enabling correction and re-submission.
   - Strict prevention of unauthorized self-approval: non-super-admin users cannot approve their own timesheet portions.
   - Audited amendment reopening allowing timesheets to be reopened with required justification without duplicate approvals.

3. **Persistent Global Timer**:
   - Database-backed single active timer per user (`user_active_timers`) enforced by unique constraint `uq_user_active_timer UNIQUE (user_id)` persisting seamlessly across browser tabs, page refreshes, and client devices.
   - Clock calculation uses wall-clock timestamps (`started_at` + `accumulated_seconds`), rendering it strictly invariant to browser tab blur / backgrounding while developers code in IDEs or terminals.
   - Seamless task-switching: starting a timer on a new task automatically finalizes and logs previous work (if $\ge 60$ seconds) to prevent loss of effort.
   - Live interactive widget in the top navigation header with play/pause, live `HH:MM:SS` ticking, discard, and stop modal dialog for reviewing duration, work summary, and billable status.

---

## 2. Database Layer Changes (Canonical Blank-Database Schema)

In compliance with [AGENTS.md](../../AGENTS.md) and [GEMINI.md](../../GEMINI.md), no direct SQL execution was performed. All changes were applied in-place to the canonical schema:

1. **`weekly_timesheets`** in `dbscripts/tables/tables.sql`:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `user_id UUID REFERENCES users(id)`
   - `period_start_date DATE NOT NULL`, `period_end_date DATE NOT NULL`
   - `expected_hours NUMERIC(6,2) DEFAULT 0 NOT NULL`
   - `total_logged_hours NUMERIC(6,2) DEFAULT 0 NOT NULL`
   - `total_billable_hours NUMERIC(6,2) DEFAULT 0 NOT NULL`
   - `total_overtime_hours NUMERIC(6,2) DEFAULT 0 NOT NULL`
   - `status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'))`
   - `submission_remarks TEXT`, `submitted_at TIMESTAMP WITH TIME ZONE`
   - `rejection_reason TEXT`, `rejected_at TIMESTAMP WITH TIME ZONE`, `rejected_by UUID REFERENCES users(id)`
   - `approved_at TIMESTAMP WITH TIME ZONE`, `approved_by UUID REFERENCES users(id)`
   - `revision INTEGER DEFAULT 1 NOT NULL`
   - Standard audit columns: `created_by`, `created_at`, `updated_by`, `updated_at`, `is_active`
   - Unique constraint: `uq_user_period UNIQUE(user_id, period_start_date)`

2. **`timesheet_project_portions`** in `dbscripts/tables/tables.sql`:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `timesheet_id UUID REFERENCES weekly_timesheets(id) ON DELETE CASCADE`
   - `project_id UUID REFERENCES projects(id)`, `product_id UUID REFERENCES products(id)`
   - `total_hours NUMERIC(6,2) DEFAULT 0 NOT NULL`
   - `billable_hours NUMERIC(6,2) DEFAULT 0 NOT NULL`
   - `overtime_hours NUMERIC(6,2) DEFAULT 0 NOT NULL`
   - `status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))`
   - `reviewed_by UUID REFERENCES users(id)`, `reviewed_at TIMESTAMP WITH TIME ZONE`, `review_remarks TEXT`
   - Standard audit columns: `created_by`, `created_at`, `updated_by`, `updated_at`, `is_active`

3. **`task_time_logs` Foreign Key Link**:
   - Added `timesheet_id UUID REFERENCES weekly_timesheets(id) ON DELETE SET NULL` to link individual work logs to their parent weekly timesheet.

4. **`user_active_timers`** in `dbscripts/tables/tables.sql`:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `user_id UUID REFERENCES users(id) ON DELETE CASCADE`
   - `task_id UUID REFERENCES tasks(id) ON DELETE CASCADE`
   - `started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL`
   - `accumulated_seconds INTEGER DEFAULT 0 NOT NULL`
   - `is_paused BOOLEAN DEFAULT FALSE NOT NULL`
   - `notes TEXT`, `is_billable BOOLEAN DEFAULT TRUE NOT NULL`
   - Unique constraint: `uq_user_active_timer UNIQUE (user_id)` guaranteeing at most 1 active timer per user.
   - Standard audit columns: `created_at`, `updated_at`

5. **Indexes & Permissions**:
   - Indexes added in `dbscripts/indexes/indexes.sql` for user period lookups and portion timesheets.
   - Permissions seeded in `dbscripts/inserts/inserts.sql`: `TIMESHEETS:READ`, `TIMESHEETS:SUBMIT`, `TIMESHEETS:APPROVE`.
   - Rebuilt installation bundle via `node dbscripts/build-install.mjs` cleanly into `dbscripts/install.sql`.

---

## 3. Backend NestJS Layer

Created module `server/src/modules/timesheets/`:
- **DTOs**:
  - `QueryTimesheetDto`: optional `startDate`, `userId`.
  - `SubmitTimesheetDto`: optional `remarks`.
  - `ReviewTimesheetPortionDto`: `status` (`APPROVED` | `REJECTED`), optional `remarks`.
  - `ReopenTimesheetDto`: required `reason`.
  - `StartTimerDto`: `taskId`, optional `isBillable`, `notes`.
  - `StopTimerDto`: optional `description`, `isBillable`.
- **`TimesheetsService`**:
  - `getWeeklyTimesheet`: Computes Monday–Sunday ISO dates, queries working calendar expected capacity via `CalendarsService.calculateWorkingCapacity`, reconciles daily grid entries and project portions, calculates billable/overtime/missing hours.
  - `submitTimesheet`: Aggregates project portions, verifies logged hours $> 0$, associates time logs, transitions timesheet to `SUBMITTED`.
  - `reviewPortion`: Prohibits self-approval (unless Super Admin), updates portion status, evaluates overall timesheet status (`APPROVED` if all portions approved, `REJECTED` if any rejected).
  - `reopenTimesheet`: Transactionally resets timesheet to `DRAFT` with recorded audit reason and incremented revision.
  - `getActiveTimer`, `startTimer`, `pauseTimer`, `resumeTimer`, `stopAndLogTimer`, `discardTimer`.
- **`TimesheetsController`**:
  - Guarded with `JwtAuthGuard` and `RbacGuard` with granular permission checks.
- **Unit Testing (`timesheets.service.spec.ts`)**:
  - Verified working calendar expected hours integration (24h rule after leave deduction).
  - Verified submission validation (>0 hours).
  - Verified self-approval prevention.
  - Verified cross-project portion approvals and rejection bubbling.
  - Verified persistent timer lifecycle, pause/resume, and task-switching auto-logging.

---

## 4. Frontend React Layer

1. **Type Definitions & API Client**:
   - `web/src/types/index.ts`: Added `WeeklyTimesheet`, `TimesheetProjectPortion`, `WeeklyTimesheetGridItem`, `WeeklyTimesheetResponse`, and `ActiveTimer`.
   - `web/src/api/endpoints.ts`: Added `timesheetsApi`.

2. **`TimerContext` (`web/src/context/TimerContext.tsx`)**:
   - Centralized state provider loaded on user authentication.
   - Calculates elapsed duration using wall clock timestamps (`started_at` + `accumulated_seconds`), rendering timer invariant to tab suspension or backgrounding.
   - Synchronizes cross-tab and cross-device active timer state via polling.

3. **Global Timer Navbar Widget (`web/src/components/common/GlobalTimerWidget.tsx`)**:
   - Integrated into `Header.tsx`.
   - Displays live ticking `HH:MM:SS` clock, task code badge, pulsing status indicator.
   - In-place play/pause toggle, discard with double-click safety, and stop button opening `StopTimerModal.tsx` for entering description and billable choice.

4. **Weekly Timesheet View (`web/src/components/timesheets/WeeklyTimesheetView.tsx`)**:
   - Previous / Next / Current week navigation.
   - KPI summary cards displaying Expected Capacity, Total Logged, Billable, Overtime, and Missing Capacity.
   - Weekly Effort Matrix table (Mon–Sun) with per-day hours, task details, and quick timer start action.
   - Cross-Project Reviewer Portions card with status tags, reviewer info, and Approve / Reject dialogs.
   - Submit Weekly Timesheet modal with warning if hours logged are under expected capacity.
   - Reopen for amendment modal.

5. **Page Navigation (`web/src/components/management/TimesheetsPage.tsx`)**:
   - Tab switcher between "Weekly Timesheet & Portions" (primary default) and "Detailed Worklogs".

---

## 5. Verification & Test Evidence

1. **Backend Automated Tests**:
   - Ran `npm test` in `server`:
   - **17 / 17 Test Suites Passed**
   - **93 / 93 Tests Passed**
   - Including `src/modules/timesheets/timesheets.service.spec.ts`

2. **Frontend Production Build**:
   - Ran `npm run build` in `web`:
   - TypeScript compilation and Vite build completed with **code 0** without any type or bundling errors.

3. **Checklist & Documentation**:
   - Updated `docs/tasks-checklist.md` checking off `TIME-001`, `TIME-001 — timer`, and `TIME-001 — acceptance`.
