# Phase 1 Walkthrough: Database Schema Generation

**Execution Date**: 2026-09-25  
**Component**: Database Architecture (`dbscripts/`)  
**Status**: Completed & Verified  

---

## 1. Overview & Operational Compliance

All database artifacts for PostgreSQL 14+/16+ have been generated inside the `dbscripts/` directory following the operational rules:
- **No Direct Database Execution**: All scripts are static artifacts ready for manual DBA and developer review and execution.
- **No Automated Git Commits**: All files remain unstaged for manual developer inspection and commitment.
- **Mandatory Columns Enforced**:
  - Every single table includes audit tracking columns: `created_by`, `created_at`, `updated_by`, `updated_at`.
  - Every master table includes `is_active BOOLEAN DEFAULT TRUE NOT NULL`.
- **Script Organization**:
  - Individual `.sql` files for functions, views, and triggers.
  - Cumulative single `.sql` files with standardized datetime comment headers for `tables.sql`, `alter_tables.sql`, `indexes.sql`, and `inserts.sql`.

---

## 2. Generated Database Schema Objects

### 2.1 Core Tables (`dbscripts/tables/tables.sql`)
1. **Organizational Masters**:
   - `branches`: Multi-branch office locations with GPS coordinates (`latitude`, `longitude`), geofencing radius (`geofence_radius_meters`), and head office flag.
   - `departments`: Corporate departments (Engineering, Mobile, QA, Support, DevOps, etc.) with HOD mapping.
   - `designations`: Job designations with `hierarchy_level` (seniority rank used for escalation and auto-assignment).
2. **Access Control & Dual Authentication**:
   - `roles`: Base system roles (Super Admin, Branch Manager, Project Manager, Developer, QA, Support).
   - `permissions`: Fine-grained module + action permission registry (e.g., `TASKS:CREATE`, `PROJECTS:VIEW_FINANCIALS`).
   - `role_permissions`: Role to permission mapping table.
   - `users`: Employee credentials supporting dual login (Email + Password with Argon2/bcrypt hash, and Mobile + OTP), branch mapping, department, and designation.
   - `user_branches`: Multi-branch access for employees operating across several locations.
   - `user_permission_overrides`: Direct user-level permission grants (`is_granted = TRUE`) and revocations (`is_granted = FALSE`).
   - `branch_permission_overrides`: Branch-specific permission policy overrides (`is_allowed = FALSE` blocks permissions branch-wide).
3. **CRM & Business Entities**:
   - `clients`: Prospects and active clients with contact information, tax ID/GST, and account manager.
   - `products`: Software products with base license pricing, standard AMC percentages, and currency.
   - `product_client_mappings`: Client licenses, contract values, AMC fees, and renewal dates.
   - `projects`: Custom development projects with billing models (Fixed Cost, T&M, Retainer), contract amounts, hourly rates, and budgeted hours.
   - `project_members`: Project team allocations with roles and date spans.
   - `versions`: Product releases and project milestones (`chk_version_entity` integrity check).
4. **Dynamic Task Management**:
   - `task_types`: Dynamic task types (New Development, Bug, Issue, Enhancement, Training, Support).
   - `task_statuses`: Dynamic status master (Open, WIP, Pending Review, Pending Testing, Testing, Closed, Cancelled).
   - `task_type_workflow_statuses`: Permissible status transition matrix mapped per task type.
   - `tasks`: Core tasks supporting nested subtasks (`parent_task_id`), estimated hours, planned/actual dates, chargeable flag (`is_chargeable`), and charge amount.
   - `task_assignees`: Multi-user task assignment table with primary assignee indicator.
   - `task_time_logs`: Daily effort logs, hours spent, billable flag, and timer timestamps.
   - `task_comments`: Threaded discussions with parent comment linking and internal-only flags.
   - `attachments`: AWS S3 file metadata (bucket, key, MIME type, file size, polymorphic entity mapping).
   - `auto_assignment_rules`: Matrix routing rules based on task type, status change, department, designation, or round-robin.
   - `notifications`: In-app notification queue with read receipts.
   - `user_push_tokens`: Device FCM tokens for Android and iOS mobile notifications.
   - `audit_logs`: Detailed activity tracking (entity, action, old/new JSONB diffs, IP, user agent, GPS location).

### 2.2 Performance Indexes (`dbscripts/indexes/indexes.sql`)
- Foreign key lookup indexes across all relationship columns.
- Composite indexes: `tasks(project_id, status_id, priority)` and `tasks(product_id, version_id, status_id)`.
- Partial index on chargeable tasks: `WHERE is_chargeable = TRUE`.
- Date range and effort indexes on `task_time_logs(user_id, log_date)`.
- GIN indexes on `audit_logs(old_values)` and `audit_logs(new_values)` for JSONB search performance.

### 2.3 Stored Functions & Triggers
- `dbscripts/functions/fn_set_updated_at.sql`: Reusable trigger function updating `updated_at = CURRENT_TIMESTAMP`.
- `dbscripts/functions/fn_calculate_task_effort.sql`: Computes total, billable, and non-billable hours recursively across subtasks.
- `dbscripts/functions/fn_log_task_audit.sql`: Captures task lifecycle changes and status transitions into `audit_logs`.
- `dbscripts/triggers/trg_tasks_updated_at.sql`: Auto-update trigger for `tasks`.
- `dbscripts/triggers/trg_projects_updated_at.sql`: Auto-update trigger for `projects`.
- `dbscripts/triggers/trg_users_updated_at.sql`: Auto-update trigger for `users`.
- `dbscripts/triggers/trg_tasks_audit.sql`: Audit logging trigger for `tasks`.

### 2.4 Analytics Views
- `dbscripts/views/vw_project_financial_summary.sql`: Project contract values, logged hours, billable amounts, and chargeable task totals.
- `dbscripts/views/vw_product_license_summary.sql`: Licensed clients, active subscriptions, and recurring annual AMC values.
- `dbscripts/views/vw_employee_workload.sql`: Active task counts, estimated hours, and 30-day billable hours per user.
- `dbscripts/views/vw_task_hierarchy.sql`: Recursive tree of parent tasks and nested subtasks with breadcrumb paths.

### 2.5 Seed Data (`dbscripts/inserts/inserts.sql`)
- Head Office branch (`HO-AHM-01`).
- Default departments (Engineering, Mobile Apps, QA, Support, DevOps).
- Designations with hierarchical ranking levels.
- System roles (Super Admin, Branch Manager, Project Manager, Developer, QA Tester, Support Executive).
- System permission registry with full assignment to Super Admin.
- Initial Administrator user account (`admin@kashvirainfotech.com`).
- Dynamic task types (`NEW_DEV`, `BUG`, `ISSUE`, `ENHANCEMENT`, `TRAINING`, `SUPPORT`).
- Dynamic task statuses (`OPEN`, `WIP`, `CODE_REVIEW`, `PENDING_TEST`, `TESTING`, `PENDING_DEPLOY`, `CLOSED`, `CANCELLED`).
- Standard workflow transitions for New Development tasks.
- Sample auto-assignment rule routing tasks in `PENDING_TEST` directly to QA department leadership.

---

## 3. Developer Verification & Next Step
All SQL scripts in `dbscripts/` are ready for manual developer review and execution on the PostgreSQL database.
Next Phase: **Phase 2: Backend REST API Core & Authentication Setup**.
