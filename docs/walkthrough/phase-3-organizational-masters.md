# Phase 3 Walkthrough: Organizational Masters & Dynamic Workflows REST API

**Execution Date**: 2026-09-25  
**Component**: REST API Modules (`server/src/modules/`)  
**Status**: Completed, Compiled & Verified  

---

## 1. Overview & Purpose

Phase 3 delivers the foundational business masters and dynamic configuration engines that power the multi-branch hierarchy, employee provisioning (admin-only, no open registration), and dynamic task workflows:

```
+-----------------------------------------------------------------------------------+
|                        Organizational Masters & Workflows                         |
+-----------------------------------------------------------------------------------+
  |                  |                     |                    |                |
  v                  v                     v                    v                v
+----------+   +-------------+   +-------------------+   +-------------+   +-------------------+
| Branches |   | Departments |   |   Designations    |   | Users/Emps  |   | Dynamic Workflows |
| (GPS &   |   | (HOD &      |   | (Hierarchy Rank & |   | (Dual Login,|   | (Task Types,      |
| Geofence)|   |  Teams)     |   |  Dept Association)|   | Overrides)  |   |  State Machine)   |
+----------+   +-------------+   +-------------------+   +-------------+   +-------------------+
```

---

## 2. Implemented Modules & Endpoints

### 2.1 Branches / Locations Master (`/api/v1/branches`)
Enables the IT company to manage multi-location offices with geofencing coordinates used by mobile clients for location tagging and attendance verification.

| Method | Endpoint | Permission | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/branches` | `BRANCHES:MANAGE` | Create new branch with GPS latitude/longitude, geofence radius, and head office flag. |
| `GET` | `/api/v1/branches` | `BRANCHES:READ` | List all branches with aggregated active employee and active project counts. |
| `GET` | `/api/v1/branches/:id` | `BRANCHES:READ` | Get details of a branch by UUID. |
| `PUT` | `/api/v1/branches/:id` | `BRANCHES:MANAGE` | Update branch address, contact details, or GPS coordinates. |
| `PATCH` | `/api/v1/branches/:id/status` | `BRANCHES:MANAGE` | Toggle active/inactive status. |

---

### 2.2 Corporate Departments (`/api/v1/departments`)
Manages functional departments (Engineering, Mobile Apps, QA, Support, DevOps, etc.) and links Department Heads (HOD).

| Method | Endpoint | Permission | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/departments` | `USERS:MANAGE` | Create new department with optional HOD user assignment. |
| `GET` | `/api/v1/departments` | Authenticated | List all departments with HOD details, total employees, and designations. |
| `GET` | `/api/v1/departments/:id` | Authenticated | Get department details and its associated designations list. |
| `PUT` | `/api/v1/departments/:id` | `USERS:MANAGE` | Update department name, description, or HOD. |
| `PATCH` | `/api/v1/departments/:id/status` | `USERS:MANAGE` | Toggle active/inactive status. |

---

### 2.3 Job Designations (`/api/v1/designations`)
Maintains hierarchical designations with `hierarchy_level` (seniority rank), which directly drives escalation matrices and auto-assignment rules.

| Method | Endpoint | Permission | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/designations` | `USERS:MANAGE` | Create designation with department association and hierarchy level (1-20). |
| `GET` | `/api/v1/designations` | Authenticated | List designations (optional filter by `departmentId`), ordered by seniority. |
| `GET` | `/api/v1/designations/:id` | Authenticated | Get designation by ID with employee count. |
| `PUT` | `/api/v1/designations/:id` | `USERS:MANAGE` | Update designation name, department, or hierarchy level. |
| `PATCH` | `/api/v1/designations/:id/status` | `USERS:MANAGE` | Toggle active/inactive status. |

---

### 2.4 User & Employee Provisioning (`/api/v1/users`)
Enforces the mandatory rule: **No public self-registration**. All employee accounts are provisioned exclusively by authorized administrators.

| Method | Endpoint | Permission | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/users` | `USERS:MANAGE` | Provision new employee: generates bcrypt password hash if provided, configures dual login flags (`is_email_login_allowed`, `is_otp_login_allowed`), links primary branch and secondary branches (`user_branches`), department, designation, and reporting manager. |
| `GET` | `/api/v1/users` | Authenticated | Filterable and paginated list of employees (filter by `branchId`, `departmentId`, `designationId`, `roleId`, `search`). |
| `GET` | `/api/v1/users/:id` | Authenticated | Detailed employee profile including secondary branches and active permission overrides. |
| `PUT` | `/api/v1/users/:id` | `USERS:MANAGE` | Update employee profile, rehash password if reset, and update secondary branches. |
| `PATCH` | `/api/v1/users/:id/status` | `USERS:MANAGE` | Toggle employee active/inactive status. |
| `POST` | `/api/v1/users/:id/permission-overrides` | `USERS:MANAGE` | Explicitly grant (`is_granted = TRUE`) or revoke (`is_granted = FALSE`) a permission for this specific user. |
| `DELETE` | `/api/v1/users/:id/permission-overrides/:permissionId` | `USERS:MANAGE` | Remove user-level permission override. |

---

### 2.5 Dynamic Task Types (`/api/v1/task-types`)
Configurable task categories with custom badges, icons, and default billable/chargeable rules.

| Method | Endpoint | Permission | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/task-types` | `TASKS:CREATE` | Create task type (`type_code`, `type_name`, `color_hex`, `icon_name`, `is_chargeable_default`). |
| `GET` | `/api/v1/task-types` | Authenticated | List all dynamic task types with total tasks count. |
| `GET` | `/api/v1/task-types/:id` | Authenticated | Get task type by ID. |
| `PUT` | `/api/v1/task-types/:id` | `TASKS:UPDATE` | Update task type attributes. |
| `PATCH` | `/api/v1/task-types/:id/status` | `TASKS:UPDATE` | Toggle active/inactive status. |

---

### 2.6 Dynamic Workflows & Status Transitions (`/api/v1/task-workflows`)
Implements the dynamic state machine ensuring tasks only progress through allowed statuses defined for their specific task type.

| Method | Endpoint | Permission | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/task-workflows/statuses` | `TASKS:CREATE` | Create a new status (`status_code`, `status_name`, `status_category`, `sequence_order`, `is_terminal`). |
| `GET` | `/api/v1/task-workflows/statuses` | Authenticated | List all statuses ordered by sequence. |
| `GET` | `/api/v1/task-workflows/statuses/:id` | Authenticated | Get status details. |
| `PUT` | `/api/v1/task-workflows/statuses/:id` | `TASKS:UPDATE` | Update status properties. |
| `POST` | `/api/v1/task-workflows/transitions` | `TASKS:UPDATE` | Add an allowed status transition rule (`task_type_id`, `from_status_id`, `to_status_id`). |
| `GET` | `/api/v1/task-workflows/transitions/:taskTypeId` | Authenticated | Get all configured workflow transition paths for a task type. |
| `GET` | `/api/v1/task-workflows/allowed-next-statuses` | Authenticated | **State Machine Evaluator**: Returns only the permissible next statuses for a task based on its `taskTypeId` and current `fromStatusId`. |
| `DELETE` | `/api/v1/task-workflows/transitions/:id` | `TASKS:UPDATE` | Delete a workflow transition rule. |

---

## 3. Verification & Compliance Checklist

- [x] **No Direct DB Execution**: PostgreSQL queries use parameterized SQL through `DatabaseService`. No DDL ran against the database.
- [x] **No Git Commits or Pushes**: All files remain unstaged for manual developer review and commitment.
- [x] **Mandatory Columns Verified**: All database inserts include `created_by`, `created_at`, `updated_by`, `updated_at`, and `is_active`.
- [x] **Clean Compilation**: `npm run build` executed successfully with 0 errors.

---

## 4. Next Step
Proceed to **Phase 4: Business Modules (Clients/Prospects CRM, Products with Pricing/AMC, Projects with Budgets/Hours, and Versions/Milestones Management)**.
