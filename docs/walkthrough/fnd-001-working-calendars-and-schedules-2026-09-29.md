# Walkthrough: FND-001 Working Calendars, Shifts, Holidays, Schedules & Leaves

**Date**: 2026-09-29  
**Feature**: FND-001 (Shared Planning Foundations — Company Working Calendars, Shifts, Holidays, Schedules & Leaves)  
**Status**: Completed  
**Role**: Senior Full-Stack Engineer (Node.js / React / PostgreSQL)

---

## 1. Overview & Objectives

In accordance with [SRS 3.31](file:///c:/Projects/KashviraInfotech/ks-pmt/docs/requirements.md#331-shared-planning-foundations---fnd-001) and [delivery roadmap](file:///c:/Projects/KashviraInfotech/ks-pmt/docs/plan.md#tier-a--trustworthy-foundation), delivery intelligence, estimation tracking, and sprint planning depend directly on a mathematically sound, reproducible foundation of employee availability and working calendars.

Under **FND-001**, we implemented an end-to-end working calendar and schedule engine covering:
1. **Configurable Working Calendars**:
   - Timezone specification (e.g. `Asia/Kolkata`, `UTC`, `America/New_York`).
   - Standard working hours per day (default 8.00 hours).
   - 7-character binary workweek mask (`working_days_mask`, e.g. `'1111100'` for Mon–Fri standard workweek, `'1111110'` for 6-day weeks).
   - Global default corporate fallback and branch-level calendar associations.
2. **Public Holiday Calendars**:
   - Company day-off scheduling per calendar with recurring annual holiday support.
3. **Effective Employee Calendar Assignments**:
   - Effective date intervals (`effective_from`, `effective_to`).
   - Part-time and contractor support with custom daily hours (`custom_hours_per_day`) overriding standard calendar hours.
   - Billable target hours per week (`billable_target_hours_per_week`) for utilization metrics.
   - Contractor/vendor distinction (`is_contractor`).
   - Fallback hierarchy: Direct Assignment &rarr; Branch Calendar &rarr; Corporate Default &rarr; System Fallback.
4. **Employee Leave & Time-off Management**:
   - Category-based absences (`ANNUAL`, `SICK`, `CASUAL`, `MATERNITY`, `PATERNITY`, `UNPAID`, `OTHER`).
   - Approval workflows (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`) with audit trails.
5. **Algorithmic Capacity & Working Day Evaluator**:
   - Real-time `isWorkingDay(userId, date)` checking workweek mask, public holidays, and approved leaves.
   - Date-range capacity calculation `calculateWorkingCapacity(userId, startDate, endDate)` returning net available days and total expected delivery hours.

---

## 2. Changes Implemented

### 2.1 Database Layer (PostgreSQL)
- **Tables Added** in [dbscripts/tables/tables.sql](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/tables/tables.sql):
  - `working_calendars`
  - `calendar_holidays`
  - `employee_calendar_assignments`
  - `employee_leave_records`
  - All tables adhere strictly to company standards: audit tracking (`created_by`, `created_at`, `updated_by`, `updated_at`) and `is_active` flags.
- **Indexes Added** in [dbscripts/indexes/indexes.sql](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/indexes/indexes.sql):
  - `idx_working_calendars_branch`, `idx_calendar_holidays_cal_date`, `idx_emp_cal_assign_user_dates`, `idx_emp_leave_user_dates`.
- **Seed Data Added** in [dbscripts/inserts/inserts.sql](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/inserts/inserts.sql):
  - Corporate Default Calendar (`CAL-CORP-STD`).
  - Standard national holidays (Republic Day, Independence Day, Gandhi Jayanti).
  - RBAC permissions: `CALENDARS:READ`, `CALENDARS:MANAGE`, `LEAVES:MANAGE`.
  - Default assignment for Super Admin.
- **Installer Regeneration**:
  - Run `node dbscripts/build-install.mjs` cleanly updating `dbscripts/install.sql`.

### 2.2 Backend Layer (NestJS)
- **Module**: Created [CalendarsModule](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/modules/calendars/calendars.module.ts) and registered in [AppModule](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/app.module.ts).
- **DTOs**:
  - `CreateCalendarDto` & `UpdateCalendarDto` with regex validation for `workingDaysMask` (`/^[01]{7}$/`).
  - `CreateHolidayDto` with recurring flag.
  - `AssignCalendarDto` with custom hours, billable targets, contractor flag, and effective dates.
  - `CreateLeaveDto` & `ReviewLeaveDto`.
  - `QueryCalendarDto` & `QueryLeaveDto` with pagination.
- **Service** ([calendars.service.ts](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/modules/calendars/calendars.service.ts)):
  - Complete parameterized queries with zero migration hacks.
  - Effective calendar resolution and day-of-week mask evaluation.
  - Holiday and leave collision checks.
  - Working capacity range calculator.
- **Controller** ([calendars.controller.ts](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/modules/calendars/calendars.controller.ts)):
  - REST endpoints for Calendars, Holidays, Assignments, Schedule checks, and Leaves.
  - Guarded with `@RequirePermissions('CALENDARS:MANAGE')`, `@RequirePermissions('CALENDARS:READ')`, and `@RequirePermissions('LEAVES:MANAGE')`.

### 2.3 Frontend Layer (React / Vite / TypeScript)
- **Types**: Added `WorkingCalendar`, `CalendarHoliday`, `EmployeeCalendarAssignment`, `EmployeeLeaveRecord` in [web/src/types/index.ts](file:///c:/Projects/KashviraInfotech/ks-pmt/web/src/types/index.ts).
- **API Endpoints**: Added `calendarsApi` in [web/src/api/endpoints.ts](file:///c:/Projects/KashviraInfotech/ks-pmt/web/src/api/endpoints.ts).
- **Navigation**: Registered `Working calendars` and `Employee leaves` in [web/src/components/management/screens.ts](file:///c:/Projects/KashviraInfotech/ks-pmt/web/src/components/management/screens.ts).
- **Entities & Forms**: Added `calendarConfig`, `holidayFields`, `assignmentFields`, and `leaveConfig` in [web/src/components/management/config.ts](file:///c:/Projects/KashviraInfotech/ks-pmt/web/src/components/management/config.ts).
- **Management UI**:
  - Added `CalendarRelatedRecords` in [web/src/components/management/ManagementPages.tsx](file:///c:/Projects/KashviraInfotech/ks-pmt/web/src/components/management/ManagementPages.tsx) featuring:
    - Tabbed view for Public Holidays and Employee Schedule Assignments.
    - Inline modal form to add holidays (with annual recurrence toggle).
    - Inline modal form to assign employees to calendars with custom daily hours (part-time/contractor overrides).
    - Quick Approve / Reject action buttons directly inside the Employee Leaves table.

---

## 3. Verification & Test Evidence

1. **Backend Unit Tests**:
   - Added [calendars.service.spec.ts](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/modules/calendars/calendars.service.spec.ts).
   - Tested: Calendar creation, duplicate code validation, holiday addition, direct assignment resolution, weekend mask validation, public holiday collision, approved leave collision, and leave review.
   - Result: 9/9 tests passed (9.5s).
2. **Regression Test Suite**:
   - Ran complete Jest test suite across `server/`:
   - Result: **10/10 test suites passed, 55/55 unit tests passed**.
3. **Frontend Build Verification**:
   - Executed `npm run build` in `web/` (`tsc && vite build`).
   - Result: **0 TypeScript errors, built in 1.13s**.
4. **Installer Generation**:
   - Executed `node dbscripts/build-install.mjs`.
   - Result: Generated `dbscripts/install.sql` from 14 canonical SQL object files. No SQL executed directly.

---

## 4. Architectural Summary for Subsequent Increments

| Dependent Feature | Benefit from FND-001 |
| :--- | :--- |
| **PLAN-001 (Sprints & Milestones)** | Net capacity per sprint can now be computed automatically by querying `calculateWorkingCapacity(assigneeId, sprintStart, sprintEnd)`. |
| **TIME-001 (Timesheets & Timer)** | Timesheet expected hours grid can evaluate against employee's standard or custom daily hours. |
| **ANALYTICS-001–004 (SLAs & Burndown)** | Working days calculation excludes weekends, company holidays, and approved leaves rather than naive calendar day arithmetic. |
