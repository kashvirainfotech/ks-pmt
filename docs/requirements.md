# Software Requirements Specification (SRS)

## KS-PMT: Enterprise Project & Product Management Tool

---

Updated: 2026-09-29 (IST). This SRS defines intended behavior, not implementation status. See [the checklist](tasks-checklist.md) for dated evidence and [the plan](plan.md) for delivery order. Stable feature IDs below connect requirements to roadmap acceptance gates.

## 1. Executive Summary & Purpose

**KS-PMT (Kashvira Infotech - Project & Product Management Tool)** is a centralized, enterprise-grade task and operations management platform designed specifically for an IT software company offering both **proprietary software products** (SaaS / on-premise solutions) and **custom project-based software development services**.

The system connects multiple company branches and locations under a unified operational umbrella, providing granular control over employees, clients, products, projects, versions, task workflows, billable effort tracking, dynamic auto-assignments, and real-time notifications across modern Web and Mobile (Android & iOS) interfaces.

### 1.1 Scope and priorities

KS-PMT is deployed for one IT company with multiple branches, serving its development teams and client organizations. Prioritize reliable planning and the client journey: request, clarification, approved scope, development, QA, UAT and acceptance. Product management connects customer evidence to priorities, releases and outcome reviews.

Git/source-control integration, DevOps and CI/CD automation are out of scope. Manual release planning, QA evidence and client sign-off remain in scope. Deployment guides describe operating KS-PMT itself. Broad HR/payroll, accounting automation, employee leaderboards and native field/geofencing expansion have lower priority; they are not prerequisites for the web/client roadmap.

---

## 2. Key Business Actors & Stakeholders

| Actor / Role | Description |
| :--- | :--- |
| **Super Admin / Executive Leadership** | Full system visibility, branch creation, corporate-wide reports, financial overview, global permission templates. |
| **Branch / Location Manager** | Manages local employees, branch-specific projects, attendance/location oversight, and branch task allocations. |
| **Department Head (HOD)** | Oversees departmental performance (e.g., Engineering, QA, Design, Support, Sales) and sets assignment rules. |
| **Product Manager (PdM)** | Manages product roadmaps, versions, feature releases, client licenses, and AMC support tasks. |
| **Project Manager (PM)** | Manages client project scope, budgets, milestones, sprint schedules, task allocations, and billable hours. |
| **Developer / Engineer** | Executes assigned tasks, updates statuses, logs work hours/efforts, creates subtasks, and attaches technical artifacts. |
| **QA / Test Engineer** | Reports bugs and issues, executes verification passes, updates testing statuses, and attaches bug evidence/logs. |
| **Support / Implementation Executive** | Handles client support tickets, installation/deployment tasks, and on-site support visits (via mobile GPS). |
| **Client / Customer User (Portal & API)** | Invited representative who submits requests and sees explicitly shared project content and eligible published product ideas. |
| **Client Administrator** | Manages approved contacts within their own organization and granted scope; never administers employees or internal roles. |
| **Client Approver** | Explicitly authorized to decide on particular scope changes, quotations or UAT milestones; client membership alone grants no approval authority. |

---

## 3. Functional Requirements

### 3.1 Company Structure & Location Master

- **Multi-Branch Support**: Ability to define multiple office branches/locations (e.g., Head Office, Development Centers, Regional Support Branches).
- **Location Attributes**: Branch Name, Branch Code, Address, City, State, Country, Postal Code, Phone, Official Email, Geofence / Geo-coordinates (Latitude, Longitude, Radius in meters), and Active/Inactive status.
- **Data Isolation & Visibility**: Option to restrict employee views to their assigned branch or grant multi-branch oversight based on role permissions.

### 3.2 Departments & Designations Master

- **Department Management**:
  - Dynamic creation of departments (e.g., Software Development, Mobile Apps, QA & Testing, UI/UX Design, Support & Maintenance, Business Analysis, Sales & Marketing).
  - Department Head mapping, description, and Active/Inactive status.
- **Designation Management**:
  - Hierarchical designation masters (e.g., Associate Software Engineer, Software Engineer, Senior Software Engineer, Tech Lead, Solution Architect, Project Manager, QA Analyst, QA Lead, Support Engineer).
  - Level hierarchy ranking (used in escalation and auto-assignment rules).
  - Association with departments and Active/Inactive status.

### 3.3 User & Employee Management

- **No Public Self-Registration**: Accounts are provisioned exclusively by authorized administrators or HR/Branch managers.
- **Employee Attributes**:
  - Personal & Official Info: Full Name, Employee Code, Official Email, Mobile Number, Emergency Contact.
  - Organizational Placement: Primary Branch, Secondary Branch access (optional), Department, Designation, Reporting Manager.
  - Status: Active / Inactive / Suspended.
  - Avatar / Profile Photo (AWS S3 storage).
- **Authentication**:
  - **Method 1**: Email Address + Secure Password (with Argon2 / bcrypt hashing, password expiry, and complexity validation).
  - **Method 2**: Mobile Number + One-Time Password (OTP) with expiration window (e.g., 5 minutes) and rate-limiting.
  - Multi-Factor / Device session management with remote revocation.

### 3.4 Dynamic Role-Based Access Control (RBAC) & Overrides

- **System Roles**: Standard templates (Super Admin, Branch Manager, Project Manager, Employee, QA, Support).
- **Granular Module Permissions**: Create, Read, Update, Delete, Export, Approve permissions across all entities (Projects, Products, Tasks, Timesheets, Financials, Clients, Users).
- **Dynamic Override Engine**:
  - **User-Level Overrides**: Ability to grant or revoke specific permissions for an individual employee regardless of their role.
  - **Branch-Level Overrides**: Ability to enforce branch-specific permission policies (e.g., Branch A users cannot view financial amounts, while Branch B users with the same designation can).

### 3.5 Client & Prospect Management (CRM-Lite)

- **Entities**: Prospects (Leads/Enquiries) and Active Clients.
- **Client Profile**: Company Name, Contact Person, Designation, Email, Phone, Alternate Phone, Billing Address, Tax/GST Identification, Website, Account Manager (Employee).
- **Lifecycle Transition**: Seamless conversion of a Prospect into an Active Client upon deal closing.
- **Mappings**: Direct association of clients to software products (licenses/subscriptions/AMC) and custom projects.

### 3.6 Product Management

- **Product Definition**: Manage the company's proprietary software products (e.g., ERP, Healthcare Suite, POS, HRMS, FinTech Gateway).
- **Attributes**: Product Name, Product Code, Category, Current Production Version, Tech Stack, Documentation Links, Active/Inactive status.
- **Financial Tracking**: Base License Price, Standard AMC Rate/Percentage, Recurring Subscription Plans, Implementation Service Fees.
- **Client Mapping**:
  - Association of client purchases (License Type: SaaS, On-Premise, Perpetual, Rental).
  - License Start Date, End Date, AMC Renewal Date, Support Tier, Annual Contract Value (ACV).

### 3.7 Project Management (Custom Development Services)

- **Project Definition**: Fixed-cost, Time & Material (T&M), or Dedicated Retainer projects built for clients.
- **Attributes**: Project Name, Project Code, Client Association, Branch Association, Project Manager, Tech Stack, Planned Start Date, Planned End Date, Actual Start Date, Actual End Date, Project Status (Planning, Active, On Hold, Completed, Terminated).
- **Financial Tracking**: Total Contract Value, Budgeted Hours, Hourly Rate (for T&M), Currency, Invoicing Milestones.
- **Team Allocation**: Assigning leads, developers, and QA engineers to specific projects with allocated allocation percentages and date ranges.

### 3.8 Version, Sprint, Milestone and Backlog Management — PLAN-001

- Support both product and project delivery teams. A sprint is a timebox, a release is a deliverable version, and a milestone is a checkpoint; they are separate concepts with independent dates and status.
- A task may have both a sprint assignment and a target release. Releases include target/actual dates, changelog and known issues. Client-specific installed/accepted versions are manually recorded independently of product release status.
- Backlogs support ranked work, sprint goals, an accountable team/owner, dates and PLANNING / ACTIVE / COMPLETED / CANCELLED states. Authorized team leads or PMs start/close sprints.
- Capture committed scope at sprint start and subsequent additions/removals. Closing a sprint explicitly moves unfinished work to a selected sprint or backlog while retaining all sprint membership history.
- Story points or T-shirt sizes complement hourly estimates; they are not converted into individual productivity scores. Support Kanban delivery without mandatory sprints.
- Planned visible hierarchy: Initiative → Epic/Feature → Story/Task/Bug → Subtask. One subtask level beneath a task; no unlimited nesting. Initiatives group outcomes and work; releases/sprints are links rather than extra parent levels. Do not silently flatten existing deeper records when implementing this policy.
- Acceptance: a product team can plan a sprint and a separate release, add scope mid-sprint, close the sprint and inspect its original commitment and rollover history.

- **Scope-change ledger**: Extend sprint commitment history to releases and project baselines. Record additions, removals, deferrals, actor/time, reason (customer request, urgent support issue, clarification, dependency, technical discovery, defect or estimate correction) and any approved change reference. Report original/current/completed scope separately; re-entry of the same item must not inflate net scope. Item counts and point totals are separate units.
- **Release workspace**: Add accountable owner, risk level and drill-down by features/bugs/technical work, open blockers, review/QA/UAT evidence, readiness checklist and scope changes. Manual release progression supports planned, in development, code complete, testing, UAT, ready, released, partially released and cancelled outcomes. Partial release requires an explicit delivered-item subset; cancelled/deferred items are not completed work. This is release planning, not deployment/rollback orchestration.

### 3.9 Dynamic Task Management Engine

- **Work-item vocabulary and workspace**: Use the existing typed task engine as the software work-item foundation; do not create a competing task store or mandate an API/navigation rename. Add configurable Technical Task, Technical Debt, Research/Spike and Improvement templates. An Incident may be a manually tracked support issue; incident monitoring/response orchestration is excluded. Requirements, change approvals and test cases keep their dedicated versioned records and link to work rather than losing their distinct lifecycle.
- Add reporter, responsible team, governed labels and module/component references (PLAN-004), alongside primary owner/collaborators, estimates and watchers. Keep reporter attribution separate from the audit actor, including requests entered on a client's behalf.
- Extend the shared detail workspace with acceptance, testing, customer impact, relationships and a combined activity view with audience filtering. Manual code-review evidence is in scope; branch/commit/PR/build/pipeline/deployment panels are excluded.

- **Dynamic Task Types Master**:
  - Configurable task types: `New Development`, `Bug / Defect`, `Issue`, `Enhancement`, `Training`, `Support Ticket`, `Documentation`, `R&D`.
  - Configurable attributes per task type (e.g., whether billable by default, default severity, custom fields).
- **Dynamic Task Status Workflow**:
  - Configurable status life-cycle per Task Type:
    - *Development Workflow*: `Open` -> `WIP` -> `Code Review` -> `Testing` -> `Ready for Acceptance` -> `Closed`; cancellation is a separately authorized transition. Internal completion does not itself record client acceptance.
    - *Support Workflow*: `Open` -> `Under Investigation` -> `Client Waiting` -> `Resolved` -> `Closed`.
    - *Bug Workflow*: `Logged` -> `Triaged` -> `In Fixing` -> `Retesting` -> `Verified Closed` -> `Reopened`.
- **Task Core Attributes**:
  - Unique Task Code (e.g., `PRJ-1024`, `PRD-512`).
  - Title, Rich-text Description, Priority (`Low`, `Medium`, `High`, `Urgent`, `Critical`), Severity.
  - Project ID or Product ID, optional target Release ID and independent Sprint ID.
  - Parent Task ID (for hierarchical sub-tasks).
  - Multi-User Assignment: Provision to assign a single task to one or multiple employees with individual responsibility flags and primary assignee distinction.
  - Dates: Planned Start Date, Planned End Date, Actual Start Date, Actual End Date.
  - Effort Estimates: Estimated Hours (Planned).
  - Billing & Commercials: `is_chargeable` (Boolean flag) and `charge_amount` (Decimal) with currency.
  - Status ID (linked to dynamic status master).
  - Revision counter (`revision`) for optimistic concurrency conflict detection.
- **Task Dependencies and Blockers — PLAN-002**:
  - Initially support Finish-to-Start scheduling and directed Blocks links, displaying Blocked by as the inverse of a single edge. Related-to and duplicate links are separate from scheduling dependencies.
  - Reject self-links and cycles in directed dependency chains; do not apply DAG validation to symmetric related-item links. Related records must remain within the actor's authorized scope.
  - Blocked state is independent of workflow status. Each blocker episode records owner, reason, next action, follow-up date, start/end and resolution; overlapping episodes count elapsed blocked time once.
  - Expand blocker detail with responsible team/person, linked blocking item, expected resolution date, category, priority and notes. Blocker radar shows active/critical/oldest, configurable age breaches, episode count and filters by team/category/sprint/release. Notify on creation/removal, age breaches and completion of a blocking item; completion requests re-evaluation, not automatic resolution of independent blockers.
  - Provide a permission-filtered dependency map with downstream impact, cross-team/cross-project links and release dependencies. Flag overdue/blocked prerequisites, missing dependency owners and stale blocking flags after prerequisite completion. A completed prerequisite is not inherently an error. Count only authorized edges; do not expose hidden endpoint titles or counts.
  - Add evidence-backed Causes/Caused by, Fixed by, Tested by and Released in relationships. Causes requires an explicit confirmed finding; chronology alone is not causation. Traceability links are not scheduling edges and do not inherit dependency cycle rules.
  - Basic dependency warnings precede advanced scheduling. SS/FF relationships, lag, critical path and schedule-change previews are later work (LATER-001), dependent on calendars and duration rules. Never silently shift a client commitment.
  - Acceptance: resolving one of two active blockers does not mark the task unblocked; unrelated links may form triangles without failing dependency validation.

- **Structured Bug / Defect Tracking**:
  - Reuse validated task-type custom fields for reproduction steps, expected/actual behavior, environment, impact and workaround templates. Keep priority (delivery order) distinct from severity (impact). Structured affected/fix versions and resolution links support QA reporting.
  - Formal resolution classifications (*Fixed*, *Won't Fix*, *Duplicate*, *Cannot Reproduce*, *By Design*).
  - Add reproduction frequency (Always/Often/Sometimes/Rare/Unable to reproduce), browser/version, OS/device, error message and optional request/correlation IDs. Let reporters review and redact suggested timestamps, URLs and application context before submission. S3 evidence may include screenshots, recordings and logs; never silently capture credentials, tokens, request bodies or unrelated device data. No monitoring agent or browser recorder is implied.
- **Sub-Task Support**:
  - Follow the supported hierarchy in PLAN-001. Sum direct worklogs and child worklogs once each; estimates must identify whether they are direct effort or a child roll-up. Do not add a parent total to its already included children.
- **Task Attachments**:
  - Upload multiple files, screenshots, design mockups, error log traces, or test recordings.
  - Stored directly in **AWS S3** with pre-signed secure access and metadata saved in DB.
- **Task Comments & Collaboration**:
  - Threaded Markdown comments and comment-specific S3 attachments remain required; rich comment composition is pending in the checklist.
  - Mentions/followers follow notification preferences and visibility checks (COLLAB-003). Shared replies must never quote internal-only content automatically.
- **Saved Views and List Productivity — PLAN-003**: Personal/team saved filters, columns, sorting, grouping and favorites; My work, Awaiting QA, Awaiting client, Blocked and Unassigned presets; inline cells and bulk updates reuse per-task permissions, workflow and revision checks, and report partial failures. Server-side query/export support is required before large-dataset acceptance.

- **My Work extension (PLAN-003)**: A personal attention workspace combines active work, manual review requests, testing, blockers, Waiting for me, Waiting for others, recently completed and upcoming work. Contextual actions reuse existing start/stop, status, comment, assignment, blocker and worklog permissions. Review means a PMT review task, not a pull request. Filters carry through to the shared task detail.

### 3.10 Effort and Timesheets — TIME-001

- Manual worklogs and a persistent global timer support one active session per user across tabs/devices, task switching, disconnect recovery and explicit correction. Browser blur is not evidence of idle time and must not automatically stop or discard productive time.
- Weekly entry/submission uses configurable workweeks and user/contract timezone. Expected loggable hours account for part-time schedules, holidays, approved absence and employment dates; billable targets are separate.
- Grouped states: DRAFT → SUBMITTED → APPROVED / REJECTED. Rejected periods can be corrected and resubmitted. Approved entries are locked; amendments require an audited reopen/reapproval. Existing per-worklog reviews are retained and reconciled when grouping.
- Cross-project periods route each project portion to eligible reviewers; overall approval requires all required portions. Bulk approval validates authority and revision per portion and reports rejected/conflicting items. No unauthorized self-approval.
- Preserve billable/non-billable, overtime and weekend classification. Monthly summaries/exports remain planned; a separate monthly sign-off workflow is deferred until weekly approval is accepted and must not double-approve time.
- Effort variance, consumption thresholds and forecast contribution use section 6 definitions (ANALYTICS-004). Missing-hours reminders use actual expected hours and configured submission deadlines.
- Acceptance: a 32-hour scheduled week with eight hours approved absence expects 24 loggable hours; a developer can work in an IDE without the timer being stopped by browser focus changes.

### 3.11 Automated Task Assignment Engine

- **Rule-Based Routing**:
  - Auto-assign tasks based on matrix criteria:
    - On Creation: Route `Bug` to QA Lead or Project Tech Lead; route `Support` to Department Support Tier 1.
    - On Status Change: When task moves to `Pending for Testing`, automatically reassign or notify assigned QA Engineer; when ready for client review, notify the assigned PM or UAT coordinator.
  - Hierarchy and least-loaded routing distribute work among eligible available employees. The existing strategy code `ROUND_ROBIN` describes least-loaded selection; do not describe it as cyclic round-robin scheduling. Smart suggestions are defined in ANALYTICS-003.

### 3.12 Notification System — COLLAB-003

- **Trigger Events**:
  - Task Created, Task Assigned / Reassigned, Status Changed, Comment Added, Mentioned in Comment, File Attached, Deadline Approaching (SLA Alert).
- **Delivery Channels**:
  - **In-App**: Real-time badge counter and notification flyout in web and mobile app.
  - **Mobile Push Notifications**: Firebase Cloud Messaging (FCM) on Android & iOS.
  - **Email Alerts**: Templated transactional emails via AWS SES / SendGrid.
- **User Notification Preferences**:
  - Channel toggles, follows independent of votes, digests, quiet hours and configured urgent exceptions. Delivery retries must not duplicate messages. Resolve recipient authorization at dispatch time, including after membership revocation; notifications and previews must not leak private content.
  - Acceptance: a revoked client contact receives no queued private update, and a retried event produces only one visible notification. Provider delivery and real-time transport remain separate acceptance gates.

### 3.13 Activity Tracking & Comprehensive Audit Trail

- **System Event Logging**:
  - User Authentication: Login success, Login failure, OTP generated, Logout, Session expired.
  - Task Lifecycle: Task created, updated, status transition, assignee change, estimation update, file attachment/removal.
  - Financial Updates: Charge amount modified, project budget updated.
- **Audit Attributes**:
  - Entity Name, Record ID, Action Type (`INSERT`, `UPDATE`, `DELETE`, `LOGIN`, `DOWNLOAD`), Old Value (JSON), New Value (JSON), Performed By User ID, Timestamp, IP Address, User-Agent, and Geolocation metadata (from mobile device or IP lookup).

### 3.14 Mobile Applications (Android & iOS)

- **Native Experience & Performance**:
  - Built using Flutter; native build and device acceptance remain separate checklist gates.
  - Responsive, touch-optimized UI conforming to Material 3 (Android) and Cupertino (iOS) guidelines.
- **Camera & File Upload**:
  - Native integration with camera to capture on-the-spot bug photos, whiteboards, or client sign-off documents.
  - Native file picker for PDF, documents, and images with automatic compression before S3 upload.
- **Location Access**:
  - GPS Geolocation capture on mobile login, field visits, or timesheet logging (useful for on-site implementation engineers and branch geofencing).
  - Foreground & optional background location verification with strict privacy controls.
- **Offline / Low-Connectivity Caching**:
  - Local SQLite / Hive caching allowing viewing of assigned tasks and drafts when offline, with auto-sync on reconnect.

### 3.15 Public & External REST APIs

- **Secure Integration Surface**:
  - Expose select REST APIs for external systems (e.g., client portals, HRMS synchronization).
  - Token-based API Key / OAuth2 authentication with rate-limiting and IP whitelisting.
  - Comprehensive Swagger / OpenAPI 3.0 documentation.

### 3.16 Contractual SLA and Rule-Based Risk Alerts — ANALYTICS-001

- Configure first-response and resolution targets by client contract/project, tier, task type, severity and priority; use deterministic most-specific policy precedence with an explicit fallback. Snapshot the selected policy/calendar for each SLA cycle.
- First response requires an eligible customer-visible reply, not an internal status change. Resolution is a defined customer-facing outcome, not merely entry into Testing. Specify start, pause, resume, stop and reopened-cycle behavior; preserve completed-cycle history.
- Contract calendars define working hours, holidays and timezone. Client-waiting pauses require an explicit policy and recorded reason. Every escalation threshold states whether it uses business or elapsed hours.
- Rule-based risk alerts include overdue/near-due work, remaining effort exceeding available capacity and stale active work. Display trigger, freshness, owner and next action; no predictive accuracy claim.
- Configurable escalation tiers avoid duplicate alerts and stop on resolution. Date extensions and overdue closure require reason attribution while preserving original/current dates; approved scope changes retain their decision link.
- Acceptance: weekend pauses, client-waiting periods, internal comments, visible responses, policy changes and reopened tickets yield reproducible deadlines and histories.

### 3.17 Flow Analytics — ANALYTICS-002

- Set maximum WIP limits with soft warnings, optional guards and authorized expedited exceptions. Queue-aging alerts do not require minimum occupied slots.
- Record timestamped status/category transitions and blocker episodes as source events; duration summaries and daily cumulative-flow snapshots must be rebuildable.
- Lead time begins at creation; cycle time begins at actual entry into an active workflow category. Report elapsed and business-time measures separately. Use final verified closure for completed-work cycle time, retain first closure/reopen events, and report cancellations separately.
- Dwell heatmaps, cumulative flow, throughput and cycle-time scatterplots disclose population, observation window, sample size and workflow-category mapping. Quality reporting distinguishes rework, requirement changes and reopened defects.
- Acceptance: reopened/cancelled work, changed workflows and overlapping blockers do not inflate completion counts or durations; reports reconcile to source events.

- **Operational aging**: Display total item age, current status/primary-owner tenure, blocked age, review/QA queue age and waiting age. Configure non-overlapping buckets and warning thresholds by project, team, type, priority and status, with explicit precedence and calendar units. Tables/histograms filter by team, assignee, sprint and release. Owner/status changes start a new tenure interval without erasing prior history; terminal work freezes applicable clocks and reopening begins a new episode. Aging is a process signal, not an employee score.
- **WIP scope**: Add per-person and per-team limits to stage limits; soft warnings are the default and hard guards require explicit project configuration. Report current/average WIP, started/completed trends, item age and breach episodes. Stage totals count distinct work items once; blocked is an overlay and is not added again to total WIP. Define primary-owner versus collaborator views to prevent inflated totals.
- **Active versus waiting flow time**: Map workflow intervals to active, waiting (customer, dependency, approval, review/QA queue, environment, vendor, team availability or other) or unclassified. Handoff events (FLOW-001) refine queue timing. Overlapping waits are counted once using recorded classification precedence, and active/waiting/unclassified intervals must partition the same cycle-time window. These are elapsed/business flow durations, not employee worklog effort or proof of continuous activity.

### 3.18 Delivery, Workload and Capacity Insights — ANALYTICS-003

- Use employee availability calendars (FND-001), holidays/leave, support rotations and reserved meeting/mentoring time. Allocation percentages and task demand are separate views, not additive load.
- Split planned effort across co-assignees or use explicit shares; never allocate a task's full estimate to every collaborator. Show missing estimates and configurable capacity thresholds instead of automatically labelling spare capacity unproductive.
- Show team-level estimation bias/accuracy, on-time trends, rework and first-time-right rates with comparable work types, sample size and original/current baselines. Individual views support workload planning and coaching; automatic employee or branch productivity rankings are deferred.
- Skill suggestions use eligibility, skills, availability and timezone overlap, with explanation and manual choice. Physical proximity is relevant only for on-site work.
- Acceptance: leave reduces availability once, co-assignee shares sum to the task demand, and research/mentoring time is visible without being treated as performance failure.

### 3.19 Portfolio and Project Health

- Deliver PM-authored On track / At risk / Off track updates with evidence and actions first (CLIENT-006).
- Portfolio views compare commitments, capacity, risks and forecasts with filters for branch/team/work type; story points are not compared across teams as a common productivity unit.
- Composite health scores and scenario/critical-path scheduling are later work (LATER-001). Before introducing a score, define weights, missing-data behavior, calibration, overrides and drill-down; prevent false precision.

- **Health drill-down**: Show separate schedule, scope, quality, blockers, WIP, aging, release readiness and customer-impact indicators with configurable rules, reasons and freshness. Each metric opens its permission-filtered contributing records using the same time/filter snapshot. PM narrative health remains distinct from rule-based signals; no opaque composite or deployment status is introduced.

### 3.20 Customer Portal and Intake — CLIENT-001, CLIENT-002

- **CLIENT-001 — identity and visibility**: Invitation-only activation, recovery and revocation for contacts of client organizations. Authorized internal administrators provision initial client admins; any delegated invitations remain within explicitly granted client/project scope. Support Client User, Client Admin and separately granted Client Approver capabilities.
- Distinguish client membership, project membership, product-community entitlement and allowed actions. A product license does not reveal all product tasks. Internal content is private by default; explicitly shared project content and moderated published ideas have separate audiences.
- Server authorization applies to details, lists, searches, counts, exports, audit/history, lookups, notifications, attachments and presigned downloads. Client-supplied scope is never authoritative. Removing access revokes sessions/permissions; previously issued S3 URLs have bounded expiry and no new URLs may be issued.
- Hide internal notes, cost rates, margins, staffing and internal effort. Authorized client approvers may see agreed quotations, approved billable statements and the designated PM/contact. Only allowlisted fields form client responses.
- Separate product-use rights, maintenance/support entitlement and portal access. Contract policy controls historical read-only access after expiry/closeout; perpetual-license customers do not lose all history solely because AMC expires.
- **CLIENT-002 — intake**: Bug, support and change forms create private requests with owner, product/project context, impact, environment and S3 evidence. Lifecycle: SUBMITTED → UNDER_REVIEW / NEEDS_INFORMATION → ACCEPTED / DUPLICATE / DECLINED, with reasons and clarification history.
- Accepted requests link to delivery work; acceptance of a request is not approval of price or a promised date. Multiple clients' requests may link to one internal defect while preserving separate communications and acceptance history.
- Customer-facing progress maps approved internal milestones to Received, In review, In progress, In QA, Awaiting your acceptance and Accepted/Closed; client users do not directly change internal development statuses.
- Acceptance: two clients of the same product can see an eligible published idea but cannot obtain each other's private requests/files through any API, export or notification. A request cannot grant its submitter internal assignment or financial permissions.

- **Customer-impact detail (CLIENT-002)**: Separate technical severity, internal delivery priority, client-requested priority, impact breadth (none/internal, single user/customer, multiple/most/all eligible customers) and business impact categories (operations, revenue, compliance, security, usability, performance, reporting, other). Client priority informs triage but cannot directly override team priority.
- Relate affected clients/contacts/contracts, product components, environment observations, affected version(s) and verified fix version. Record impact count/source/as-of time and unknown scope explicitly; counts cover the defined affected population, not inferred claims about all customers. Internal views trace request → defect → delivery task → test evidence → fixing release → eligible client notification. Client views expose only their own impact and deliberately published aggregate statements, never other clients' identities/counts by default.

### 3.21 Product Discovery, Voting and Roadmaps — PROD-001

- Capture the customer problem, evidence, segment, module, expected outcome, reach, impact, confidence, effort and strategic fit. Product managers retain scoring inputs and decision rationale; popularity/revenue are inputs, never automatic commitments.
- Moderate submissions before community publication. Keep source tickets, identities and business-impact statements private; publish a sanitized idea. Visibility defaults to authenticated, entitled product customers; internet-public roadmaps are deferred.
- Enforce one vote per idea/client organization. Designated voting representatives may cast/retract it; record actor/revision and reject conflicting edits. Merge duplicates with organization-vote deduplication and source history. Follows are independent of votes. Keep ACV/ARR, license tiers and commercial weighting internal; perpetual purchase value is not ARR.
- Lifecycle supports PROPOSED, UNDER_EVALUATION, PLANNED, IN_DEVELOPMENT, RELEASED, DECLINED, DEFERRED and MERGED with reasons. Link approved ideas to epics/tasks and releases.
- Customer roadmaps use Now / Next / Later; dated targets are explicitly indicative unless approved as commitments. PM-approved release communications link sanitized changelogs and honor COLLAB-003 preferences.
- Acceptance: duplicate merging counts each organization once without revealing private submissions; target changes preserve history and do not silently change contractual dates.

### 3.22 Requirements and Acceptance Traceability — CLIENT-003

- PMs/business analysts maintain versioned briefs, objectives, scope boundaries and measurable acceptance criteria; link them to epics/tasks, QA evidence and client acceptance.
- A baseline records the agreed revision. Subsequent edits are visible as proposals until approved; coverage views identify criteria without implementation, evidence or acceptance.
- Client readers see only published revisions and explicitly shared evidence. Authors, internal reviewers and client approvers have distinct permissions.
- Acceptance: an agreed criterion can be traced to delivery and evidence; amending it does not rewrite the previously approved baseline.

### 3.23 Scope and Change-Request Approval — CLIENT-004

- Capture requested change, baseline reference, rationale, effort/cost/currency/date impact and an accountable PM. Proposed extra work remains separate from approved scope.
- Lifecycle: DRAFT → INTERNAL_REVIEW → AWAITING_CLIENT → APPROVED / CHANGES_REQUESTED / REJECTED / DEFERRED / WITHDRAWN. An authorized client approver decides on a specific revision with timestamp and remarks.
- Material edits create a new revision and require reapproval. Preserve previous decisions; approvals do not authorize unrelated work. Link accepted changes to revised scope, tasks and committed milestones.
- Acceptance: changing the cost or scope of approved revision 3 creates revision 4 awaiting approval; revision 3 stays readable and cannot approve revision 4.

### 3.24 Client UAT and Milestone Sign-Off — CLIENT-005

- PM/QA prepares a UAT package with requirement revision, version under test, acceptance checklist, evidence, known issues and linked defects; share only appropriate artifacts.
- Designated client approvers choose Approve, Request changes or Reject with attributable decision history. A material package revision requires a new decision; reminders/escalations never imply automatic acceptance.
- Preserve developer-done, QA-verified and client-accepted states independently. Record client-specific accepted/installed version manually; releasing the product does not update it automatically.
- Acceptance: failed UAT links a defect and retains the earlier package; a revised package cannot inherit an obsolete sign-off.

### 3.25 Client Progress Updates — CLIENT-006

- PMs prepare weekly or configurable updates covering delivered work, next steps, risks, decisions needed, health and milestone forecast. Draft → Reviewed → Published, with audience and revision history.
- Publish an explicit client-safe version separately from internal commentary. Include agreed commercials only for entitled approvers; support downloadable reports and notification digests.
- Acceptance: a client report contains no internal cost/personnel notes; publishing a new forecast does not change an approved delivery commitment.

### 3.26 Manual QA and Release Readiness — QA-001

- QA maintains versioned manual test cases, test runs, pass/fail evidence, linked acceptance criteria/defects, affected and fix versions, known issues and a release-readiness checklist.
- Gate readiness with accountable reviewers and recorded exceptions. QA verification does not substitute for client UAT. Automated test execution, source control and deployment orchestration are excluded.
- Acceptance: a failed case links its evidence and defect to the tested version; the release checklist shows unresolved blockers and the review decision.

- Extend release-readiness templates with critical-defect disposition, manual review evidence, test/UAT decisions, documentation and approved client communication. Checklists record reviewer, evidence and exceptions; missing evidence does not count as a pass. Environment-specific verification is detailed in QA-002; deployment/rollback plans and pipeline checks are excluded.

### 3.27 Product Goals and Outcomes — PROD-002

- Product managers link initiatives/features to a measurable goal, baseline, target, owner and review date. Manually capture adoption, client feedback or business results after release.
- Preserve outcome reviews and decision rationale for continue/change/stop decisions; task completion alone is not proof of value. Share only approved summaries.
- Acceptance: a released idea links to its goal and a dated outcome review showing baseline, result and next decision.

### 3.28 Knowledge, Templates and Recurring Work — COLLAB-001, COLLAB-002

- COLLAB-001: Versioned briefs, specifications, meeting decisions, FAQs and release notes linked to work with explicit internal/client/product-community audiences. Binary documents and embedded files remain in S3; linked content retains its own access controls.
- COLLAB-002: Reusable project/task templates for onboarding, fixed-price work, maintenance and release checklists; relative dates and recurrence respect calendars. Each generated occurrence has its own identity, owner and history; retries do not duplicate it.
- Acceptance: copying a template does not copy client memberships, decisions, votes, confidential attachments or approvals; referenced private documents remain private.

- Knowledge search covers authorized work items and documents together; structured filters extend to projects/products, eligible users, clients, releases and components. Snippets, suggestions and result counts obey the same permissions; binary attachment text extraction is separate optional scope. Knowledge templates may include architecture, setup, coding standards, troubleshooting, API/database guides and runbooks without executing their contents.
- Where attachment revision history is needed, upload a new immutable S3 object and retain metadata/actor/time and parent audience; replacing a file cannot inherit or silently alter an approval bound to an older revision.

### 3.29 Risks, Assumptions and Decisions — DEL-001

- PMs maintain risk/assumption/decision records with owner, likelihood/impact where relevant, mitigation, review date and related requirement/milestone. Separate possible future risks from active blocker episodes.
- Publish client action requests with due dates and authorized responses; preserve decision revisions and resulting scope/date changes.
- Acceptance: an unresolved client decision appears in the client's action list without exposing the internal risk discussion.

- Decision records add participants, context, alternatives considered, rationale, consequences and technical/business impact; link work, components and knowledge. Lifecycle: PROPOSED / ACCEPTED / REJECTED / SUPERSEDED, with a successor link and full history. A superseded technical decision does not itself approve a commercial scope change.

### 3.30 Retainer and AMC Entitlements — COMM-001

- Track contract periods, included hours, approved consumption, remaining allowance, rollover rules and overage requests. Snapshots preserve historical rates/terms; expired periods remain auditable.
- Consume only eligible approved worklogs once, including through grouped approval. Client statements disclose only authorized approved usage and quotations. Overage approval uses CLIENT-004; invoicing/accounting automation is outside the initial scope.
- Acceptance: rejecting a worklog does not consume allowance; approval retries do not consume it twice; a new contract period follows the agreed rollover policy.

### 3.31 Shared Planning Foundations — FND-001

- Define configurable employee and contract calendars with timezone, workweek, holidays, part-time schedules, approved absence and effective dates. Separate loggable working hours, available delivery hours and billable targets.
- Record versioned baselines, workflow-category mappings, status events and blocker episodes before building analytics. Summaries must disclose stale/missing data and remain traceable to source records.
- All roadmap features enforce server-side actions and audience rules, optimistic conflict handling where records are edited concurrently, and the standard audit/S3 requirements. Quality, accessibility and authorization acceptance apply in every increment.
- Acceptance: historical results can be reproduced using the applicable calendar/baseline, and access removal affects secondary surfaces as well as primary records.

### 3.32 Later Scheduling and Optional Assistance — LATER-001, LATER-002

- LATER-001: Capacity/date/priority scenario previews, SS/FF scheduling, lag rules and critical path follow reliable calendars and estimates. Applying a preview requires authorized explicit action; contractual dates retain approval rules. Composite health scores require transparent weights, calibration, missing-data rules and overrides.
- LATER-002: Optional drafts of summaries, acceptance criteria and progress updates must cite accessible source records, respect audience boundaries and require human review before publication. External processing requires an approved data-handling decision; this is not a prerequisite for core delivery.
- Optional focused actions extend LATER-002: requirement-gap suggestions, duplicate candidates with similarity explanations, acceptance criteria, work breakdown across UI/API/data/QA/documentation, bug summaries, release-note drafts and activity summaries. Never create work, execute SQL or publish decisions automatically; users review proposed output and its authorized sources. Rule-based risk detection remains ANALYTICS-001, not an unsupported AI prediction claim.
- Automatic employee/branch leaderboards and a universal automation designer remain deferred.

### 3.33 Teams and Software Components — PLAN-004

- Administrators maintain delivery teams independently of departments and branches, with lead, effective-dated membership and project/product participation. Team membership does not automatically grant project, branch or client access. Work references the responsible team plus an accountable primary owner.
- Maintain scoped modules/components with name, owner team, technical contact, technology, documentation, criticality and dependency links. Work may reference multiple components. Governance/deactivation preserves historical links; technical debt uses the existing configurable work-item types.
- A component map and dashboard show authorized active work, bugs, technical debt, linked decisions/documents and manually reported support issues. Component architecture links are distinct from task scheduling dependencies; reciprocal component communication does not imply an invalid task cycle. No repository, deployment, infrastructure inventory or monitoring integration.
- Acceptance: a team can span two branches without bypassing branch/project permissions; a component drill-down never reveals another client's private support request.

### 3.34 Work Handoff Tracking — FLOW-001

- Capture significant BA → development → manual review → QA → client-review handoffs: sending/receiving team and person, sent time, reason/status, required context/evidence and notes. Sending a handoff and acknowledging/starting work are separate actions; assignment alone is not acceptance.
- Lifecycle supports pending, accepted, in progress, returned for rework, redirected, completed and cancelled. Record sent, acknowledged and work-start times separately, with receiving actor; label time-to-acknowledgment separately from time-to-work-start; redirects close one waiting episode and create a linked successor, avoiding overlapping queue-duration totals.
- Add Waiting for me/others queues and overdue/ownerless handoff reminders. Report count, age, rework frequency and waiting duration by team/workflow with configurable calendars and sample sizes; no individual blame/ranking.
- Acceptance: sending a task to QA at 14:32 and starting next day at 10:15 yields 19h 43m elapsed time to work start, with separately labelled business time; forwarding/reopening retains the original episode. No DevOps/production automation is included.

### 3.35 Environment-Specific Issue Verification — QA-002

- Define lightweight project/product/customer-scoped environment labels (internal QA, staging, client UAT, client production) and region/context metadata. These are manual QA contexts, not provisioned resources, servers or deployment records. Exclude secrets and infrastructure credentials.
- For an issue, retain observations per environment and application version: found/reproduced, fix available, ready for retest, pass/fail, tester, time and evidence. Browser/OS/device and manually supplied build labels may clarify reproduction; no build integration is implied.
- Track affected versions separately from planned fix version, verified fix version and the client's accepted/current version. A fix passing internal QA must not mark another environment or client resolved; version-wide release and per-client acceptance remain independent.
- Acceptance: a bug can pass internal QA in version 2.4.5 while failing client UAT and remaining open for a client on 2.4.3, without leaking either client's details.

### 3.36 What Changed View — COLLAB-004

- Provide deterministic summaries of created/completed work, status/owner changes, new/resolved blockers, defects, handoffs, release stage changes, scope additions/removals and customer-impact updates. Exclude deployment events.
- Filters support project, sprint, release, personal and authorized client scope, with Since yesterday, Since last login, Since sprint/release baseline and custom periods. Show resolved timestamps/timezone; a baseline filter uses a recorded event, not a moving date guess.
- Each count links to contributing authorized records/events. Distinguish event counts from distinct-item counts; summarize repeated changes without losing detail. Missing historical data is disclosed and revoked/private data is omitted from counts and snippets.
- Acceptance: an item with three transitions appears once in distinct changed-items and three times in transition-event detail; a client summary omits internal staffing changes. This feature works without AI.

### 3.37 Project-Specific Workflow Configuration — CONFIG-001

- Extend existing type/status/transition administration with a visual editor and versioned project/product overrides, keeping shared templates and Scrum/Kanban/support defaults. Display the effective workflow and permission source.
- Configure allowed roles/actions, required fields, validators, transition forms and manual review/acceptance gates. For example, Ready for QA can require completed acceptance checks and recorded review; Ready for release can require reviewed QA evidence and a release association. Client UAT authority remains separate.
- Preview and validate drafts, reject unreachable required states and invalid transitions, and explicitly map active records before publishing a changed workflow. Preserve historical version/category mappings for reporting. Generic edits, bulk changes and APIs enforce the same rules.
- Permit bounded internal actions such as assignment or notifying a blocker owner. No arbitrary executable scripts, universal automation platform, PR/pipeline triggers or deployment actions.
- Acceptance: two projects use different transitions for the same work type; publishing an override cannot bypass client approval or strand active work in a removed state.

### 3.38 Data Import and Portable Exports — DATA-001

- Add permission-controlled CSV import for supported master/work-item records with downloadable templates, field/value mapping, preview/dry-run, required-field/reference validation, stable external-ID mapping and row-level errors. Existing CSV export remains available; optional Excel export follows the same audience/field and formula-safety rules.
- Explicitly choose create versus update behavior, detect duplicates and stale revisions, and record an import batch and per-row outcomes. Resuming/retrying must not duplicate successful rows. Cross-project/client references and protected approval/audit fields are rejected or require their own authorized workflow, never silently applied.
- Attachments remain S3 uploads and linked metadata; imports cannot fetch arbitrary remote files or embed binary content in database fields. This is application data onboarding, not schema migration or automatic database-script execution.
- Acceptance: a mixed-validity batch previews without writes, reports rejected references, imports permitted rows and retries without duplicates; restricted data cannot be recovered through exports/error messages.

### 3.39 Scoped Outbound Webhooks — API-001 (Later)

- Authorized administrators configure subscriptions for approved PMT events such as work created/transitioned/assigned, blocker changes and manually published releases. No source-control, deployment, monitoring or CI/CD connectors are introduced.
- Use scoped, allowlisted payloads, signed deliveries, rotatable secrets, stable event/delivery IDs, bounded retries/backoff and audit/delivery history. Recheck current authorization on dispatch/retry; define at-least-once delivery and consumer deduplication, without promising order or exposing full internal audit snapshots.
- Validate destinations and redirects against allowed network policy, block unintended internal/metadata endpoints and do not expose secrets in exports/logs. Disabled subscriptions stop pending delivery; replay requires authorization.
- Acceptance: a retried event retains its identity and signature verification works after the defined rotation window; revoked audience access prevents subsequent payload disclosure.

### 3.40 Configuration Toolkit — ADMIN-001 (Later)

- Provide an administrator setup wizard and versioned configuration packages for project/workflow/role/permission/custom-field/notification/report templates, branding and enabled modules within a single-company installation. Reuse COLLAB-002 and CONFIG-001 instead of adding competing template/workflow engines.
- Export/import supported configuration as data with version compatibility checks, dependency/reference mapping, diff/dry-run, validation, conflict handling and audited explicit application. Branding/email templates are constrained/sanitized, not executable custom code. Active records, workflow history and approval rules remain intact.
- Packages exclude users/passwords, secrets, client data, permission assignments and historical decisions. Role/permission definitions cannot silently elevate the importer or activate new grants. Import DATA-001 separately for permitted business records.
- Acceptance: preview a configuration package from another compatible installation, resolve missing references and apply only authorized changes without copying client memberships or breaking active workflows.
- Multi-installation partner management, managed hosting, deployment/upgrade automation, executable plugin frameworks and in-product backup/restore administration remain deferred; operating backups stay in the existing manual operations guidance.



---

## 4. Universal Data & Database Standards

1. **Audit Columns**: Every table without exception must have:
   - `created_by` (UUID reference to `users.id`)
   - `created_at` (TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)
   - `updated_by` (UUID reference to `users.id`, nullable on insert)
   - `updated_at` (TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)
2. **Master Active Flag**: Every master table must include:
   - `is_active` (BOOLEAN DEFAULT TRUE NOT NULL)
3. **Primary Keys**: UUIDv4 or BIGSERIAL for scalable, collision-free identification.
4. **Soft Deletion**: Sensitive entities (Tasks, Projects, Clients, Users) should utilize `deleted_at` timestamp for audit compliance.
5. **No Direct Execution**: All SQL scripts must reside in `dbscripts/` and must never be auto-applied to any database by AI agents.

---

## 5. Non-Functional Requirements (NFRs)

These are acceptance targets, not claims of achieved performance, security certification or production availability. Large lists/reports/exports require server-side filtering, aggregation and pagination; the current shared grid loads all authorized pages into the browser.

- **Performance**: Sub-200ms API response time for 95% of standard CRUD requests.
- **Scalability**: Support for 50+ branches, 5,000+ active users, and 1,000,000+ task records with PostgreSQL indexing and pagination.
- **Security**: OWASP Top 10 compliance, AES-256 encryption at rest (S3 & DB backups), TLS 1.3 in transit, parameterized SQL queries preventing SQL injection.
- **Availability**: 99.9% uptime target with automated cloud backups and stateless containerized backend services.
- **Mobile Responsiveness**: Web application fully adaptive from 320px mobile screens up to 4K ultra-wide desktop monitors.


## 6. Measurement Contract — ANALYTICS-004

PMs and authorized financial reviewers use these definitions for variance, burn curves and delivery forecasts. Internal cost rates and margin remain private. Store effective-dated rate/contract snapshots, report currencies separately or state the chosen conversion basis, and distinguish draft/submitted effort from approved billable time. Approval state does not erase actual effort.

| Measure | Definition and interpretation |
| --- | --- |
| Effort variance (hours) | Actual hours minus baseline estimated hours. Keep baseline and revised estimate separate. |
| Budget consumption (%) | Actual hours / budgeted hours × 100; apply configurable warning thresholds (e.g. 75%, 90%, 100%) to this measure, not an hours difference. |
| Estimate at completion | Actual hours plus independently maintained remaining estimate. Exhausting the original estimate does not make remaining work zero. |
| Direct delivery contribution | Revenue on a stated basis minus direct delivery costs; a currency amount, not full accounting profit. |
| Contribution margin (%) | Direct delivery contribution / revenue × 100. Forecast, approved billable amounts, invoiced amounts and receipts are distinct. |
| Estimation bias (%) | (Actual minus baseline estimate) / baseline estimate × 100 for completed estimated work; positive means underestimation. Absolute error is a separate accuracy measure. Report mean/median variance by team, type, component and sprint with sample size; no individual productivity score. |
| Available delivery capacity | Scheduled working hours minus holidays/leave minus reserved non-project time; deduct each item once. |
| Defect leakage (%) | External defects / (internal + external defects) × 100 for the same release and observation window; deduplicate defects. |
| Net scope change (%) | (Current distinct scope minus baseline distinct scope) / baseline distinct scope × 100; report additions/removals/deferrals separately and never mix item counts with points. Zero baseline is N/A. |
| Waiting percentage | Waiting duration / cycle-window duration × 100 using the same elapsed or business-time basis; active/waiting/unclassified partition that window. Logged effort is a separate measure. |
| Handoff waiting | Receiving work-start time minus handoff sent time, calendar-adjusted only in the separately labelled business-time measure; retain each redirected/returned episode. |
| On-time delivery | Completion against original committed dates and separately against current approved dates; disclose scope changes, cancellations and reopened work. |

Missing/zero denominators are N/A rather than zero or perfect performance. Disclose population, sample size, observation window, timezone and data freshness. Retain events and snapshots needed to reproduce calculations.

Acceptance: known records with changed estimates, zero budgets, mixed approval states, historic rate changes and multiple currencies reconcile to the stated formulas without double-counting tasks, assignees or timesheet approvals.
