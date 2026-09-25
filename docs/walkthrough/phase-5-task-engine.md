# Phase 5 Walkthrough: Dynamic Task Engine, Multi-Assignees, Subtasks, Time Tracking & Auto-Assignment Matrix

**Execution Date**: 2026-09-25  
**Component**: Task Execution Engine (`server/src/modules/`)  
**Status**: Completed, Compiled & Verified  

---

## 1. Overview & Architecture

Phase 5 delivers the core operational heartbeat of KS-PMT: the **Dynamic Task Engine**, multi-employee task assignment, hierarchical subtasks, effort logging, threaded collaboration, and intelligent auto-assignment routing.

```
                                  +---------------------------------------+
                                  |         Task Lifecycle Event          |
                                  |     (Task Created / Status Changed)   |
                                  +---------------------------------------+
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |      Auto-Assignment Matrix Engine    |
                                  |  (Evaluates Trigger Event, Task Type, |
                                  |   Department HOD, Hierarchy, R-Robin) |
                                  +---------------------------------------+
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |    Multi-User Assignees Allocated     |
                                  |     (Primary & Co-Workers Linked)     |
                                  +---------------------------------------+
                                                      |
                         +----------------------------+----------------------------+
                         |                                                         |
                         v                                                         v
      +-------------------------------------+                   +-------------------------------------+
      |   Time Tracking & Effort Logging    |                   |    Threaded Comments & Mentions     |
      | (Hours spent, Billable/Non-billable,|                   | (Sub-comment nesting, @mentions,    |
      |  fn_calculate_task_effort totals)   |                   |  internal-only privacy toggling)    |
      +-------------------------------------+                   +-------------------------------------+
```

---

## 2. Implemented Modules & Endpoints

### 2.1 Auto-Assignment Matrix Engine (`/api/v1/auto-assignment`)
Eliminates manual task dispatching by automatically assigning tasks to users upon creation or when transitioning between statuses based on configurable corporate policies.

| Method | Endpoint | Permission | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auto-assignment/rules` | `TASKS:ASSIGN` | Create assignment rule: `trigger_event` (`ON_CREATION`, `ON_STATUS_CHANGE`), `task_type_id`, `from_status_id`, `to_status_id`, `branch_id`, and `target_assignment_type`. |
| `GET` | `/api/v1/auto-assignment/rules` | Authenticated | List all active auto-assignment rules with resolved department and role names. |
| `DELETE` | `/api/v1/auto-assignment/rules/:id` | `TASKS:ASSIGN` | Deactivate an auto-assignment rule. |

**Supported Routing Strategies**:
- `SPECIFIC_USER`: Directly routes task to a designated employee.
- `DEPARTMENT_HOD`: Automatically routes to the Head of Department (HOD) of the specified department.
- `DESIGNATION_HIERARCHY`: Assigns to the employee with the required seniority rank/designation within the target department.
- `PROJECT_MANAGER`: Automatically assigns project-scoped tasks to the assigned Project Manager.
- `ROUND_ROBIN`: Dynamically distributes tasks to the least-loaded employee in the department based on active task workload.

---

### 2.2 Core Tasks Engine (`/api/v1/tasks`)
Supports project-based development, software product bugs/enhancements, subtasks, multi-assignees, and commercial amounts.

| Method | Endpoint | Permission | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/tasks` | `TASKS:CREATE` | Create task with auto-generated task code (e.g., `PRJ-FINTECH-02-1001`), title, description, priority (`LOW` to `CRITICAL`), planned dates, estimated hours, `is_chargeable`, `charge_amount`, and multi-assignees. If no assignees provided, auto-evaluates `ON_CREATION` assignment matrix. |
| `GET` | `/api/v1/tasks` | `TASKS:READ` | Advanced filterable and paginated list (filter by `projectId`, `productId`, `versionId`, `taskTypeId`, `statusId`, `priority`, `assigneeUserId`, `branchId`, `isChargeable`, `search`). |
| `GET` | `/api/v1/tasks/:id` | `TASKS:READ` | Comprehensive task details with assignees roster, total subtasks count, and logged effort totals. |
| `GET` | `/api/v1/tasks/:id/subtasks` | `TASKS:READ` | **Subtask Tree**: Retrieves all direct subtasks under this parent task with assignees and status badges. |
| `PATCH` | `/api/v1/tasks/:id/status` | `TASKS:STATUS_CHANGE` | **Workflow State Machine Progression**: Validates that the requested transition is allowed via `TaskWorkflowsService`. Automatically sets `actual_start_date` on `IN_PROGRESS` and `actual_end_date` on terminal statuses. Evaluates `ON_STATUS_CHANGE` auto-reassignment rules. |
| `PUT` | `/api/v1/tasks/:id/assignees` | `TASKS:ASSIGN` | Assign or reassign multiple employees to a task with a designated primary assignee. |
| `PUT` | `/api/v1/tasks/:id` | `TASKS:UPDATE` | Update task properties, estimates, dates, or chargeable amount. |

---

### 2.3 Time Tracking & Effort Logging (`/api/v1/time-logs`)
Allows employees to capture time spent working on tasks, supporting client billing and capacity reporting.

| Method | Endpoint | Permission | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/time-logs` | `TIMELOGS:LOG_OWN` | Log work effort: `task_id`, `log_date`, `hours_spent`, `is_billable`, `description`, `timer_start_time`, and `timer_end_time`. |
| `GET` | `/api/v1/time-logs/task/:taskId` | Authenticated | Retrieve all worklogs for a task. Invokes PostgreSQL stored function `fn_calculate_task_effort` to calculate total, billable, and non-billable hours recursively across subtasks. |
| `GET` | `/api/v1/time-logs/my-logs` | Authenticated | Personal worklog history with date range filtering (`startDate`, `endDate`, `taskId`) and billable vs. non-billable summaries. |
| `GET` | `/api/v1/time-logs/employee-workload` | Authenticated | **Workload Dashboard**: Queries PostgreSQL view `vw_employee_workload` displaying active tasks count, estimated hours, and 30-day billables. |
| `DELETE` | `/api/v1/time-logs/:id` | Authenticated | Delete worklog (restricted to owner or Super Admin). |

---

### 2.4 Task Comments & Discussions (`/api/v1/comments`)
Enables real-time contextual collaboration and threaded discussions directly on tasks.

| Method | Endpoint | Permission | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/comments` | Authenticated | Add comment to a task with support for parent comment ID (nested replies), `@mentions`, and `is_internal_only` flag. |
| `GET` | `/api/v1/comments/task/:taskId` | Authenticated | Retrieves the full discussion stream with nested replies grouped under their parent comments. |
| `DELETE` | `/api/v1/comments/:id` | Authenticated | Delete comment (restricted to author or Super Admin). |

---

## 3. Verification & Compliance Checklist

- [x] **Dynamic Workflow State Machine**:
  - Validates all status transitions using `task_type_workflow_statuses`.
  - Blocks invalid status jumps and returns permitted next statuses.
- [x] **Effort Calculation via Stored Procedures**:
  - `fn_calculate_task_effort` invoked to calculate aggregate effort across parent and child subtasks.
- [x] **No Direct DB Execution**: Queries executed safely via `DatabaseService` using parameterized SQL.
- [x] **No Git Commits or Pushes**: All files remain unstaged for manual developer review and commitment.
- [x] **Clean Compilation**: `npm run build` executed and passed with 0 errors.

---

## 4. Next Step
Proceed to **Phase 6: Cloud Storage (AWS S3 Integration), Real-Time Notifications & Audit Trail** (`server/src/modules/attachments`, `server/src/modules/notifications`, `server/src/modules/audit-logs`).
