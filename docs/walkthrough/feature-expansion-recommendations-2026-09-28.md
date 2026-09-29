# KS-PMT Feature Expansion Recommendations

> Historical record of the 2026-09-28 proposal/update. The accepted roadmap was revised on 2026-09-29 in [requirements](../requirements.md), [plan](../plan.md) and [checklist](../tasks-checklist.md). Those documents supersede this record's scope, sequencing, metric definitions and status claims. See [the update report](roadmap-documentation-update-2026-09-29.md).

**Date**: 2026-09-28 (IST)  
**Document**: Feature Expansion & Architecture Enhancement Proposal  
**Context**: Reconciled against all repository documentation (`requirements.md`, `tasks-checklist.md`, `plan.md`, `tech-stack.md`, `AGENTS.md`, and all walkthrough reports) and the implemented backend/web codebase.

---

## 1. Executive Context & Current Baseline Audit

KS-PMT currently possesses an enterprise foundation covering:
- **Core Entities & Masters**: Multi-branch organizations with geofencing coordinates, departments, hierarchical designations, users with dual authentication (password / mobile OTP) and session tracking, and dynamic granular RBAC with user and branch-level overrides.
- **Business Modules**: Clients and CRM conversion, proprietary software products with licensing/AMC models, custom development projects with team allocation percentages, and release/version scheduling.
- **Task Engine**: Dynamic task types and configurable workflow state machines, rich-text markdown descriptions, multi-assignees with primary ownership, task revision locking (`expectedRevision`), JSONB custom-field values, hierarchical parent-child subtasks, and auto-assignment matrix routing.
- **Effort & Collaboration**: Worklog entries with billable/overtime/weekend flags and review workflow, threaded `@mention` comments, AWS S3 file attachments, in-app notifications, and comprehensive JSONB audit logging.
- **User Interface**: Kanban board with drag-and-drop transitions, shared listing grid with search/filtering/exports, task drawer and full-page route with inline editing, and bento-grid dashboard.

### Out of Scope (Maintained)
Source control integrations (GitHub, GitLab, Bitbucket) and DevOps/CI/CD pipeline automation remain excluded. All proposed features focus strictly on **operational project management, issue tracking, time & effort tracking, deadline management, bottleneck detection, and employee/team performance intelligence**.

---

## 2. High-Impact Feature Recommendations

### Module 1: Advanced Issue & Project Tracking Engine

#### 1.1 Task Dependency Graph & Critical Path Analysis
- **Current State**: Tasks only support a 1-level or recursive `parent_task_id` hierarchy. There are no relational dependencies between independent tasks.
- **Proposed Feature**:
  - Implement a `task_dependencies` relational entity supporting dependency types:
    - `FINISH_TO_START` (FS): Task B cannot start until Task A finishes (Standard prerequisite).
    - `START_TO_START` (SS): Task B cannot start until Task A starts.
    - `FINISH_TO_FINISH` (FF): Task B cannot finish until Task A finishes.
    - `BLOCKS` / `IS_BLOCKED_BY`: Soft blockers and hard blockers.
    - `RELATES_TO` / `DUPLICATES`: Cross-referencing duplicates and related tasks.
  - **Circular Dependency Guard**: Server-side Directed Acyclic Graph (DAG) validation preventing circular loops (A -> B -> C -> A).
  - **Cascading Schedule Recalculation**: When Task A's `planned_end_date` slips, automatically flag dependent tasks with a warning and offer an auto-adjust schedule preview.
  - **Visual Interactive Gantt / Dependency Chart**: Interactive Gantt view allowing project managers to draw connection lines between tasks and highlight the **Critical Path** (the longest sequence of dependent activities determining the minimum project duration).

#### 1.2 Sprint & Milestone Lifecycle Management
- **Current State**: `versions` represent release milestones, but there is no agile sprint cycle mechanism.
- **Proposed Feature**:
  - Add dedicated **Sprints** entity within projects (`sprint_number`, `sprint_goal`, `start_date`, `end_date`, `status: PLANNING, ACTIVE, COMPLETED`).
  - **Sprint Backlog & Planning Board**: Backlog grooming screen with drag-and-drop ranking of tasks from the Product/Project Backlog into upcoming Sprints.
  - **Story Points / Complexity Estimation**: Support Fibonacci (`1, 2, 3, 5, 8, 13, 21`) or T-shirt sizing (`XS, S, M, L, XL`) alongside hourly estimates.
  - **Sprint Close Workflow**: Automated rollover wizard when closing a sprint—prompting whether to move incomplete tasks to the next sprint or back to the backlog.

#### 1.3 Dedicated Blocker Radar & Impediment Management
- **Current State**: Blocked work is only represented if a custom status like "On Hold" is chosen.
- **Proposed Feature**:
  - Add an explicit **"Flag as Blocked"** toggle on any task regardless of its current workflow status.
  - Require a structured **Blocker Reason Category** (e.g., *Client Dependency / Missing Asset*, *Pending Clarification / Specs*, *Technical / Architectural Impediment*, *External Third-Party Service Down*, *Environment Issue*).
  - **Blocker Stopwatch**: Automatically track total blocked duration (`blocked_at`, `unblocked_at`, `cumulative_blocked_minutes`).
  - **Blocker Radar Widget**: High-visibility dashboard strip displaying all currently blocked tasks, who is blocking them, and elapsed blocked time.

#### 1.4 Structured Issue / Bug Tracking Templates
- **Current State**: General task description is freeform markdown.
- **Proposed Feature**:
  - Standardized structured bug reporting fields: **Steps to Reproduce (numbered list)**, **Expected Behavior**, **Actual Behavior**, **Environment / Device / OS / Browser**, **Impacted User Count**, and **Workaround Available (Yes/No + Description)**.
  - **Resolution Classification**: Upon closing a bug or issue, enforce a `resolution_type`: *Fixed*, *Won't Fix / By Design*, *Duplicate*, *Cannot Reproduce*, *Declined / Out of Scope*.

---

### Module 2: Effort Spent, Timesheets & Budget Variance

#### 2.1 Grouped Weekly Timesheet Periods & Batch Approvals
- **Current State**: Worklogs (`task_time_logs`) are created and approved individually.
- **Proposed Feature**:
  - **Timesheet Periods Master**: Standardized weekly timesheets (`period_start_date`, `period_end_date`, `user_id`, `total_hours`, `submission_status: DRAFT, SUBMITTED, APPROVED, REJECTED`).
  - **Weekly Timesheet Matrix UI**: Grid view showing Monday through Sunday columns where employees quickly enter hours across their assigned tasks in one table.
  - **Timesheet Missing Alerts**: Automated Friday afternoon / Monday morning alerts for employees who have logged fewer than standard expected weekly hours (e.g., < 40 hrs).
  - **One-Click Batch Approval**: Department heads and PMs can review and approve an employee's entire week with a single click, with inline drill-down into specific task logs.

#### 2.2 Live Global Stopwatch & Work Session Tracker
- **Current State**: Manual entry or static start/stop fields on task drawers.
- **Proposed Feature**:
  - Persistent sticky timer widget in the global top navigation bar.
  - Single-active timer constraint: Clicking "Start Work" on Task B automatically pauses Task A and drafts an uncommitted worklog entry.
  - Automatic desktop inactivity detection (browser blur or idle detection) offering to discard or adjust logged idle time.

#### 2.3 Effort Variance, Burn Rate & Cost Tracking
- **Current State**: `vw_project_financial_summary` exists, but there is no real-time task or project variance warning system.
- **Proposed Feature**:
  - **Task-Level Effort Variance**:
    $$\text{Effort Variance} = \text{Actual Hours Logged} - \text{Estimated Hours}$$
    Visual color-coded indicators: Green ($<90\%$), Amber ($90\% - 100\%$), Red ($>100\%$ over-budget).
  - **Project Budget Burn Rate**:
    - Tracking Planned Burn vs. Actual Burn curves.
    - Proactive threshold triggers: Send automated alerts to PM and Branch Manager when a project reaches $75\%$, $90\%$, and $100\%$ of its allocated hours or budget.
  - **Non-Billable Costing & Internal Overhead**:
    - Tracking internal cost per employee hour vs billable client rate.
    - Calculating Project Profitability Margin:
      $$\text{Profit Margin} = \text{Total Client Billed Amount} - \sum (\text{Logged Hours} \times \text{Employee Internal Cost Rate})$$

---

### Module 3: Deadline Management, SLA Engine & Early Warnings

#### 3.1 Service Level Agreement (SLA) & Resolution Timer Engine
- **Current State**: Static priority and dates without SLA countdowns.
- **Proposed Feature**:
  - Configurable **SLA Policies Matrix** mapped by Priority, Severity, Task Type, Client Tier, and Project:
    - *First Response SLA*: Time limit to move task from `Open` to `WIP` or add first acknowledgment comment.
    - *Resolution SLA*: Time limit to transition task to `Testing` or `Closed`.
    - *Business Hours Calculation*: SLA clocks pause outside office working hours (e.g. 9:00 AM - 6:00 PM) and public/branch holidays.
  - **SLA Breach Visual Badges**: Live dynamic countdown pill on tasks (e.g., `SLA: 2h 15m remaining` in amber, `SLA Breached by 45m` in pulsing red).

#### 3.2 Proactive Delay Early Warning System (EWS)
- **Current State**: System only records when dates have already passed.
- **Proposed Feature**:
  - **Pre-Deadline Health Algorithm**: Identify "At-Risk" tasks before they miss deadlines using predictive criteria:
    - Planned end date is within 48 hours, but task is still in `TODO` / `Open`.
    - Remaining estimated hours exceed the remaining working hours available between now and the deadline.
    - Task has had no activity or worklog logged for over 3 business days while in `WIP`.
  - **"At-Risk" Radar Tab**: Dedicated view for Project Managers highlighting impending breaches to take corrective action before deadlines are missed.

#### 3.3 Multi-Tier Automated Escalation Matrix
- **Current State**: Notifications only fire on direct events (created, assigned, commented).
- **Proposed Feature**:
  - Cron-driven escalation background scheduler:
    - **Tier 1 (4 hours before breach / 2 hours after breach)**: Notify Primary Assignee and Tech Lead.
    - **Tier 2 (24 hours overdue)**: Escalate to Project Manager and Department Head.
    - **Tier 3 (48 hours overdue)**: Escalate to Branch Manager / Operations Director.

#### 3.4 Mandatory Delay Root-Cause Attribution
- **Current State**: Actual end date can be updated or task closed overdue without explanation.
- **Proposed Feature**:
  - Whenever a task is marked completed past its `planned_end_date`, or when `planned_end_date` is extended, prompt the user for a **Mandatory Reason for Delay**:
    - *Scope Creep / Unplanned Requirements*
    - *Client Dependency / Delayed Approvals*
    - *Inaccurate Initial Estimation*
    - *Technical Complexity / Architecture Rework*
    - *Resource Unavailability / Leave*
    - *Priority Preempted by Urgent Production Issue*
  - Feeds directly into retrospective reporting to identify systemic reasons for delays.

---

### Module 4: Bottleneck Identification & Workflow Flow Metrics

#### 4.1 Work In Progress (WIP) Limits on Workflow Stages
- **Current State**: Any column or status can hold an unlimited number of tasks.
- **Proposed Feature**:
  - Set maximum WIP thresholds per status column on the Kanban board (e.g., maximum 5 tasks in "Code Review", maximum 8 tasks in "QA Testing").
  - Visual soft-warnings and optional hard-guards when a status exceeds its capacity, forcing teams to resolve existing bottlenecks before pulling new work.

#### 4.2 Status Dwell Time & Bottleneck Heatmap
- **Current State**: Audit logs record timestamps, but duration spent inside each status is not indexed or aggregated.
- **Proposed Feature**:
  - Maintain a denormalized `task_status_durations` summary or analytical view:
    - Calculates exact business hours spent in each workflow stage: `Time in WIP`, `Time in Code Review`, `Time in Testing`, `Time in Client UAT`.
  - **Bottleneck Heatmap**: Visual dashboard showing where tasks spend the majority of their lifecycle. For example, if tasks spend an average of 1.5 days in development but 6.2 days waiting in testing, the bottleneck is immediately visible in QA capacity.

#### 4.3 Cumulative Flow Diagram (CFD), Lead Time & Cycle Time
- **Current State**: Only static totals and status counts exist.
- **Proposed Feature**:
  - **Cumulative Flow Diagram (CFD)**: Area chart tracking task volume across statuses over time. An expanding band visually reveals an acute process bottleneck.
  - **Lead Time**: Duration from task creation to verified closure.
  - **Cycle Time**: Duration from active work started (`planned_start_date` or first status transition) to closure.
  - **Cycle Time Scatterplot**: Spot outliers and distribution clusters to establish predictable delivery timelines.

---

### Module 5: Team & Employee Performance, Workload & Capacity

#### 5.1 Resource Allocation & Capacity Heatmap
- **Current State**: `project_members` stores `allocation_percentage`, but does not provide dynamic weekly workload visibility.
- **Proposed Feature**:
  - Interactive **Team Capacity Matrix** (Weeks / Months across X-axis, Team Members across Y-axis):
    - Red (>100% capacity): Over-allocated / Burnout risk.
    - Green (75% - 100% capacity): Healthy utilization.
    - Blue (<75% capacity): Under-utilized / Available bandwidth for new tasks.
  - Aggregates assigned task planned effort and project allocation percentages against the employee's standard working schedule.

#### 5.2 Estimation Accuracy Index (EAI) & Reliability Scoring
- **Current State**: No comparison metrics between estimates and actuals per user.
- **Proposed Feature**:
  - Employee and team-level **Estimation Accuracy Metric**:
    $$\text{EAI} = 1 - \frac{|\text{Estimated Hours} - \text{Actual Hours}|}{\max(\text{Estimated Hours}, \text{Actual Hours})}$$
  - Trend reporting over sprints/months: highlights whether an engineer consistently under-estimates (leading to missed deadlines) or over-estimates tasks.

#### 5.3 Engineering Quality & Rework / Reopen Rate
- **Current State**: Task transitions do not differentiate forward progress from backward rejection.
- **Proposed Feature**:
  - Track **Reopen / Rejection Count**: Number of times a task was returned from `Testing` back to `WIP` or reopened after closure.
  - **First-Time-Right (FTR) Rate**: Percentage of tasks completed and verified without being bounced back for bug fixes.
  - **Bug Leakage Ratio**: Bugs discovered post-release vs. bugs caught during internal QA testing per release.

#### 5.4 Employee 360° Operational Performance Scorecard
- **Current State**: Basic workload view (`vw_employee_workload`).
- **Proposed Feature**:
  - Comprehensive, balanced performance profile for managerial reviews:
    - *Delivery Rate*: Total tasks completed vs assigned.
    - *On-Time Delivery (OTD %)*: Percentage of assigned tasks completed on or before `planned_end_date`.
    - *Billable Efficiency*: Ratio of billable hours to total logged hours.
    - *Velocity Trend*: Story points or hours delivered per sprint/month over time.
    - *Quality Score*: Low bug reopen rate and adherence to task documentation.

#### 5.5 Skill Matrix & Smart Assignment Recommendations
- **Current State**: Auto-assignment matrix routes by department, designation, or fixed user.
- **Proposed Feature**:
  - Define user skill tags (e.g., `PostgreSQL`, `React`, `Flutter`, `NestJS`, `Security Audit`) with proficiency ratings (`Beginner`, `Intermediate`, `Expert`).
  - When creating or reassigning a task tagged with specific skills, display a **"Smart Assign"** recommendation ranking eligible team members by matching skill tags, current bandwidth/workload, and branch proximity.

---

### Module 6: Executive & Operational Reporting Dashboards

#### 6.1 Project Health Index (PHI)
- **Current State**: Individual metrics (tasks, budget hours) exist in disconnected tables.
- **Proposed Feature**:
  - Composite algorithmic score ($0 - 100$) reflecting project health:
    - Weight 1: Schedule Health (ratio of on-time tasks vs delayed tasks).
    - Weight 2: Budget Health (ratio of actual logged hours vs budgeted hours).
    - Weight 3: Issue Severity (number of open Critical/Urgent defects).
    - Weight 4: Blocker Count (number of currently active blockers).
  - Status categorized automatically as: **Healthy (Green)**, **Needs Attention (Yellow)**, or **At Risk (Red)**.

#### 6.2 Cross-Branch Productivity Benchmarking
- **Current State**: Multi-branch filtering exists, but no cross-branch comparative analytics.
- **Proposed Feature**:
  - Executive benchmarking dashboard comparing branch metrics:
    - Average task turnaround time per branch.
    - Total billable hours logged and utilization percentage per branch.
    - Project delivery on-time rate per branch.
    - Helps executive leadership identify high-performing locations and resource bottlenecks.

---

## 3. Recommended Phased Implementation Roadmap

```mermaid
flowchart LR
    subgraph Phase 1: Core Controls & Variance
        F1["Task Dependencies & Critical Path"]
        F2["Grouped Weekly Timesheet Grid"]
        F3["Effort Variance & Burn Alerts"]
    end

    subgraph Phase 2: SLA & Flow Management
        F4["SLA Engine & Countdown"]
        F5["Delay Early Warning & Root-Causes"]
        F6["Blocker Radar & Status Dwell Time"]
    end

    subgraph Phase 3: Capacity & Performance
        F7["Resource Capacity Heatmap"]
        F8["Estimation Accuracy & OTD %"]
        F9["Project Health Index (PHI)"]
    end

    Phase 1 --> Phase 2
    Phase 2 --> Phase 3
```

| Phase | Module Focus | Estimated Impact | Key Deliverables |
| :--- | :--- | :--- | :--- |
| **Phase A** (Immediate Priority) | **Effort & Schedule Variance** | High | Grouped weekly timesheets, task dependencies (prerequisites/blockers), task effort variance indicators, project budget burn alerts. |
| **Phase B** (Near-Term Priority) | **Deadlines, SLAs & Bottlenecks** | Very High | SLA policies and breach countdown, Delay Early Warning Radar, Blocker Radar with duration tracking, status dwell time heatmap. |
| **Phase C** (Strategic Priority) | **Capacity & Team Performance** | High | Resource allocation capacity heatmap, Estimation Accuracy Index, Rework/Reopen quality rates, Project Health Index (PHI). |

---

## 4. Architectural & Schema Blueprint for Proposed Features

In adherence to project rules (`AGENTS.md` / `GEMINI.md`):
- All new database entities will be defined in canonical `CREATE TABLE` scripts in `dbscripts/tables/tables.sql` with universal audit columns (`created_by`, `created_at`, `updated_by`, `updated_at`) and `is_active` flags where applicable.
- No direct database execution or migrations will be run by agents; execution will remain a manual DBA/developer step against a blank development database.
- REST API endpoints will follow standard RESTful conventions with semantic HTTP status codes, structured JSON envelopes, and dynamic RBAC checks.
