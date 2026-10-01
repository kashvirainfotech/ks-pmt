# Walkthrough - COLLAB-002: Project/Task Templates, Relative Dates & Recurring Work with Unique Occurrences

## Executive Summary

**COLLAB-002** introduces enterprise project blueprints, relative-date task libraries, and an idempotent recurring work engine into the KS-PMT application. It provides delivery teams, project managers, and operations leads with standard templates for client onboarding, fixed-price delivery, maintenance retainers, and security audits, while maintaining strict isolation of client data, approvals, and confidential attachments.

---

## 1. Core Requirements & Architecture Principles

1. **Reusable Project & Task Templates**:
   - Master project templates define standard milestone sequences, target engagement models (`TIME_AND_MATERIALS`, `FIXED_COST`, `RETAINER`), and default estimated duration.
   - Task templates define hierarchy levels (`EPIC`, `TASK`, `SUBTASK`), default priority, estimated hours, and structured checklists.
2. **Relative Dates Computation**:
   - Tasks and milestones compute planned start and finish dates strictly relative to an `anchorStartDate` using `start_offset_days` and `duration_days`.
   - Instantiation dynamically generates real task rows (`tasks` table) and milestone rows (`milestones` table) without manual date math.
3. **Idempotent Recurring Work Engine**:
   - Recurrence rules support `DAILY`, `WEEKLY`, `BIWEEKLY`, `MONTHLY`, `QUARTERLY`, and `ANNUALLY` cadences.
   - Scope is explicitly tied to either a `project_id` or a `product_id`.
   - Occurrences are logged in `recurring_task_occurrences` with a database unique constraint `uq_recurrence_scheduled_date UNIQUE (rule_id, scheduled_date)`.
   - Retries or repeated triggers will never duplicate task occurrences for the same period.
4. **Security & Isolation Boundary**:
   - **Zero Implicit Leakage**: Instantiation never copies client memberships, past comments, time logs, confidential attachments, votes, or sign-offs. Each instantiated task begins as a fresh, clean execution record.

---

## 2. Database Schema Artifacts (`dbscripts/`)

All database artifacts follow the development lifecycle guidelines in `AGENTS.md` and `GEMINI.md`: static SQL definitions with audit columns, active flags, and zero direct execution against databases.

### 2.1 Canonical Tables (`dbscripts/tables/tables.sql`)
- **Table 74: `project_templates`**: Container for project blueprints, categories (`CLIENT_ONBOARDING`, `FIXED_PRICE_DELIVERY`, etc.), and JSONB milestone templates.
- **Table 75: `task_templates`**: Library of task templates (either standalone or linked to project blueprints) with `start_offset_days`, `duration_days`, and JSONB checklists.
- **Table 76: `recurring_work_rules`**: Recurrence rules with frequency, interval, next run date, and scope constraint (`chk_recurrence_scope`).
- **Table 77: `recurring_task_occurrences`**: Execution registry tracking generated tasks, execution status, and unique scheduled dates (`uq_recurrence_scheduled_date`).

### 2.2 Indexes (`dbscripts/indexes/indexes.sql`)
- `idx_proj_templates_code`, `idx_proj_templates_cat`
- `idx_task_templates_proj`, `idx_task_templates_parent`, `idx_task_templates_code`
- `idx_recurrence_rules_code`, `idx_recurrence_rules_scope`, `idx_recurrence_rules_next_run`
- `idx_recurrence_occurrences_rule`, `idx_recurrence_occurrences_task`

### 2.3 Master Permissions & Seed Data (`dbscripts/inserts/`)
- In `dbscripts/inserts/inserts.sql`:
  - `TEMPLATES:READ` - View project and task templates
  - `TEMPLATES:MANAGE` - Create and manage project and task templates
  - `TEMPLATES:INSTANTIATE` - Instantiate projects and tasks from templates
  - `RECURRENCE:MANAGE` - Configure recurrence rules and trigger manual runs
  - Role mappings for Super Admin, Project Manager, Branch Manager, and Developer.
- In `dbscripts/inserts/sample_data.sql`:
  - Blueprints: `TPL-PRJ-CLIENT-ONBOARD`, `TPL-PRJ-FIXED-DELIVERY`.
  - Task templates: `TPL-TSK-ONB-01` through `04`, plus standalone templates `TPL-TSK-SEC-AUDIT` and `TPL-TSK-REL-CHECKLIST`.
  - Recurrence rules: `REC-SEC-AUDIT-Q` (Quarterly SOC2 audit) and `REC-DB-MAINT-WK` (Weekly PostgreSQL maintenance).
  - Sample occurrence history verifying deduplication and registry linkage.

### 2.4 Verification of Database Bundle
- Generated `dbscripts/install.sql` from 15 canonical source files.
- Executed `node --test dbscripts/build-install.test.mjs`:
  ```
  TAP version 13
  ok 1 - bundle includes all canonical SQL once, in manifest order, in one transaction
  ok 2 - bundle rejects omitted, duplicate, missing, and escaping source files
  1..2
  # tests 2 # pass 2 # fail 0
  ```

---

## 3. Backend Implementation (`server/`)

### 3.1 Module Structure (`server/src/modules/templates/`)
- `templates.module.ts`: Registered in `app.module.ts`.
- `templates.controller.ts`: Secured with `JwtAuthGuard`, `DynamicRbacGuard`, and `@Permissions()`.
- `templates.service.ts`:
  - Project blueprint lifecycle & task template library CRUD.
  - `instantiateProject(id, dto, userId)`: Generates project, computes target milestone dates (`anchorStartDate + target_offset_days`), maps task start/end dates (`anchorStartDate + start_offset_days` and `duration_days`), and seeds checklists into `custom_field_values`.
  - `instantiateTask(id, dto, userId)`: Instantiates a standalone task into a target project or product scope with relative dates.
  - `triggerRecurrenceRule(ruleId, targetDate, userId)`: Performs idempotency check against `recurring_task_occurrences`, creates the task instance, records the occurrence, advances `next_run_date`, and increments `total_occurrences_count`.
- DTOs in `dto/`:
  - `create-project-template.dto.ts`
  - `create-task-template.dto.ts`
  - `instantiate-template.dto.ts`
  - `create-recurrence-rule.dto.ts`
  - `query-templates.dto.ts`

### 3.2 Build Verification
- `nest build` passed with zero errors.

---

## 4. Web UI Implementation (`web/`)

### 4.1 Types & API Endpoints
- `web/src/types/index.ts`: Added `ProjectTemplate`, `TaskTemplate`, `RecurringWorkRule`, `RecurringTaskOccurrence`, `MilestoneTemplateItem`, `ChecklistTemplateItem`.
- `web/src/api/endpoints.ts`: Added `templatesApi` covering project/task template CRUD, instantiation endpoints, recurring rule CRUD, occurrence history, and manual trigger action.

### 4.2 Workspace Component (`web/src/components/templates/TemplatesWorkspaceView.tsx`)
The workspace provides three cohesive tabs:
1. **Project Templates**:
   - Blueprint cards with category badges, duration, engagement model, and milestone counts.
   - "Structure" modal displaying the planned milestone stages and relative task offsets.
   - "Instantiate Project" modal with anchor date picker, project code, name, client selection, and PM assignment.
2. **Task Templates Library**:
   - Filterable library showing priority badges, relative offsets (`+X days`, `Duration: Y days`), and checklists preview.
   - "Instantiate Task into Scope" modal supporting project and product targets.
   - "New Task Template" modal supporting checklists and estimated hours.
3. **Recurring Schedules & Deduplication**:
   - Recurrence table displaying frequency badges, scope badges, next run date, and assignee.
   - Deduplication banner highlighting exact-once occurrence guarantees.
   - "Run Now" modal allowing immediate execution with date override.
   - "Occurrence History" modal providing audit logs of past executions, scheduled dates, and generated task codes.

### 4.3 Navigation & Routing
- Route `/templates` registered in `web/src/App.tsx`.
- Navigation item `Templates & Recurrence` with `Copy` icon added to `web/src/components/layout/Sidebar.tsx` under Workspace.

### 4.4 Build Verification
- `tsc && vite build` passed cleanly:
  ```
  dist/index.html                     0.71 kB │ gzip:   0.41 kB
  dist/assets/index-DXK6Z-q7.css     72.04 kB │ gzip:  12.06 kB
  dist/assets/index-D77c-jS4.js   1,850.59 kB │ gzip: 494.67 kB
  ✓ built in 3.63s
  ```

---

## 5. Checklist Update

In [`docs/tasks-checklist.md`](../tasks-checklist.md), section **11.4 Increment D — Product Management and Repeatable Delivery**:
- Marked `[x] **COLLAB-002**: Project/task templates, relative dates and recurring work with unique occurrences; never copy approvals, client permissions or confidential artifacts implicitly.`
