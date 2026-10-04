# Project Tasks & Verification Checklist

## KS-PMT: Multi-Branch Project & Product Management System

Roadmap reconciled on 2026-09-29; implementation evidence remains dated in the linked audits and walkthroughs. This documentation update does not rerun tests or complete planned features. `[x]` means the stated scope is implemented or documented; `[ ]` means unfinished, partially implemented, blocked, or awaiting verification. A checked implementation item is not production certification. Earlier phase walkthroughs are historical and may overstate completion.

Status labels: **Planned** = no completed delivery; **Partial** = some scope exists; **Implemented — acceptance pending** = implementation evidence exists but a required acceptance gate remains; **Verified** = the explicitly named scope passed dated checks. Historical `[x]` entries retain their stated scope, not a blanket Verified label.

Evidence: [completion review](walkthrough/completion-status-review-2026-09-26.md) and [requirements audit](walkthrough/requirements-screen-audit.md). Existing build/test evidence is historical unless a newer walkthrough explicitly records a rerun.

---

## 1. Documentation & Architecture Foundations

- [x] Initial Requirements Analysis & Domain Scope Formulation
- [x] Create project agent rule guidelines (`AGENTS.md`, `GEMINI.md`, `.agent/rules/agent-rules.md`)
- [x] Author Software Requirements Specification (`docs/requirements.md`)
- [x] Author Technology Stack & Architecture Document (`docs/tech-stack.md`)
- [x] Author Master Implementation Plan (`docs/plan.md`)
- [x] Author Granular Tasks Checklist (`docs/tasks-checklist.md`)
- [x] Author End-to-End System Walkthrough (`docs/walkthrough.md`)

---

## 2. Database Scripts (`dbscripts/`)

### 2.1 Table Definitions (`dbscripts/tables/tables.sql`)

- [x] Enforce standard audit columns (`created_by`, `created_at`, `updated_by`, `updated_at`) across all tables
- [x] Enforce `is_active` boolean column on all master tables
- [x] `branches`: Multi-branch office master with geofencing coordinates (lat, long, radius)
- [x] `departments`: Department master with HOD reference
- [x] `designations`: Designation master with hierarchy rank ordering
- [x] `users`: Employee/User credentials, contact info, branch mapping, department, designation
- [x] `roles`: Base system roles (Super Admin, Branch Manager, PM, Dev, QA, etc.)
- [x] `permissions`: Granular permission registry (module + action)
- [x] `role_permissions`: Mapping base permissions to roles
- [x] `user_permission_overrides`: Direct user-level permission grants and revocations
- [x] `branch_permission_overrides`: Branch-specific permission enforcement policies
- [x] `clients`: Prospects and active clients with CRM attributes
- [x] `products`: Proprietary software products with pricing and license models
- [x] `product_client_licenses`: Client-to-product mapping (licenses, subscriptions, AMC terms)
- [x] `projects`: Custom development projects with client mapping, budgets, and dates
- [x] `project_members`: Project team allocation with roles and date spans
- [x] `versions`: Product/project release records; separate sprints and milestone semantics are PLAN-001
- [x] `task_types`: Dynamic task types (New Development, Bug, Issue, Enhancement, Training, Support)
- [x] `task_statuses`: Dynamic workflow statuses with sequence and completion flags
- [x] `task_type_workflow`: Allowed status transitions per task type
- [x] `tasks`: Core task master (title, description, priority, planned/actual dates, estimated hours, `is_chargeable`, `charge_amount`, parent task ID)
- [x] `task_assignees`: Multi-user assignment mapping table
- [x] `task_time_logs`: Daily effort logs, hours spent, billable flag, summary
- [x] `task_comments`: Threaded comments with rich text and user mentions
- [x] `attachments`: File metadata, S3 bucket/key, MIME type, file size, entity association
- [x] `auto_assignment_rules`: Matrix routing rules based on task type, department, designation, branch
- [x] `notifications`: In-app notification queue and read receipts
- [x] `user_push_tokens`: FCM registration tokens for Android and iOS devices
- [x] `audit_logs`: Detailed activity tracking (entity, action, old/new values, IP, user-agent, location)

### 2.2 Blank-Database Development Schema

- [x] Fold development schema changes into canonical `CREATE TABLE` definitions.
- [x] Use `department_heads` to avoid circular table dependencies while enforcing head assignments with foreign keys.
- [x] Provide an ordered terminal installer and generated plain SQL bundle for pgAdmin.
- Incremental migrations apply only after the project is declared live.

### 2.3 Indexes (`dbscripts/indexes/indexes.sql`)

- [x] Foreign key indexes on all relation columns
- [x] Composite indexes on `tasks(project_id, status_id, priority)`
- [x] Composite indexes on `tasks(product_id, version_id, status_id)`
- [x] Performance indexes on `task_time_logs(user_id, log_date)`
- [x] Search indexes (B-Tree & GIN) on client names, task titles, and task codes
- [x] Index on `audit_logs(entity_name, record_id, created_at)`

### 2.4 Views (`dbscripts/views/`)

- [x] `vw_project_financial_summary.sql`: Project contract values, billed hours, and remaining budget
- [x] `vw_product_license_summary.sql`: Active licenses, expiring AMCs, and client counts per product
- [x] `vw_employee_workload.sql`: Open tasks count, estimated hours, and actual hours logged per user
- [x] `vw_task_hierarchy.sql`: Recursive view of parent tasks and nested sub-tasks with progress

### 2.5 Functions & Triggers (`dbscripts/functions/` & `dbscripts/triggers/`)

- [x] `fn_set_updated_at.sql`: Reusable trigger function updating `updated_at = CURRENT_TIMESTAMP`
- [x] `trg_tasks_updated_at.sql`: Apply update timestamp trigger on `tasks` table
- [x] `fn_calculate_task_effort.sql`: Computes aggregated effort (billable and non-billable hours)
- [x] `fn_log_task_audit.sql`: Trigger function logging task changes automatically into `audit_logs`
- [x] `trg_tasks_audit.sql`: Apply audit log trigger on `tasks` table
- [x] `trg_projects_updated_at.sql`: Apply update timestamp trigger on `projects` table
- [x] `trg_users_updated_at.sql`: Apply update timestamp trigger on `users` table

### 2.6 Seed Data (`dbscripts/inserts/inserts.sql`)

- [x] Seed base system permissions (CRUD across all modules)
- [x] Seed default roles (Super Admin, Branch Manager, Project Manager, Tech Lead, Developer, QA, Support)
- [x] Seed default departments and designations
- [x] Seed standard task types and status workflows
- [x] Seed initial head office branch and default administrator account

---

## 3. Backend REST API Implementation (`server/`)

### 3.1 Core Architecture & Security

- [x] Initialize NestJS project with TypeScript and Prettier
- [ ] Complete and verify ESLint configuration (including required tooling)
- [x] Configure PostgreSQL database connection pool (`pg` / TypeORM / Kysely)
- [ ] Setup Redis client for OTP caching, rate-limiting, and session management
- [x] Implement global Exception Filter, Logging Interceptor, and Response Envelope Interceptor
- [x] Implement validation pipes with `class-validator` and `class-transformer`
- [x] Setup Swagger / OpenAPI documentation UI at `/api/docs`

### 3.2 Authentication & Dynamic RBAC Module

- [x] `POST /api/v1/auth/login-password`: Authenticate with email and password
- [ ] `POST /api/v1/auth/request-otp`: Request 6-digit OTP to registered mobile number
- [x] `POST /api/v1/auth/login-otp`: Verify generated OTP and issue tokens (mock flow; live SMS acceptance pending)
- [x] `POST /api/v1/auth/refresh-token`: Refresh short-lived access token
- [x] `POST /api/v1/auth/logout`: Invalidate session and revoke refresh token
- [x] Implement `@Roles()` and `@Permissions()` decorators
- [x] Dynamic RBAC Guard evaluating:
  - Base role permissions
  - Branch-specific permission overrides
  - Individual user-level permission overrides

### 3.3 Masters & Organizational Modules

- [x] Branches CRUD (`/api/v1/branches`) with geofencing coordinates
- [x] Departments CRUD (`/api/v1/departments`)
- [x] Designations CRUD (`/api/v1/designations`) with hierarchy sorting
- [x] Users / Employees CRUD (`/api/v1/users`) - Admin-only user provisioning
- [x] Dynamic Task Types CRUD (`/api/v1/task-types`)
- [x] Workflow Status Transitions CRUD (`/api/v1/task-workflows`)

### 3.4 Business & CRM Modules

- [x] Clients & Prospects CRUD (`/api/v1/clients`)
- [x] Client conversion endpoint (Prospect -> Active Client)
- [x] Products CRUD (`/api/v1/products`) with license pricing and AMC rates
- [x] Client-Product License Mapping (`/api/v1/products/:id/clients`)
- [x] Projects CRUD (`/api/v1/projects`) with budgets, billing rates, and dates
- [x] Project Team Allocation (`/api/v1/projects/:id/members`)
- [x] Versions & Milestones CRUD (`/api/v1/versions`) for both products and projects

### 3.5 Dynamic Task Management Engine

- [x] Tasks CRUD (`/api/v1/tasks`) with multi-assignee payload
- [x] Sub-task creation and hierarchical tree retrieval
- [x] Task Status Transition endpoint (`PATCH /api/v1/tasks/:id/status`) with workflow validation
- [x] Multi-assignee assignment / reassignment endpoints
- [x] Chargeable toggle & charge amount update endpoints
- [x] Effort / Worklog endpoints (`POST /api/v1/time-logs`)
- [x] Task Comments endpoints (`POST /api/v1/comments`) with `@mention` parser
- [x] Auto-assignment rule evaluation engine on task create and status change

### 3.6 Cloud Storage (AWS S3) & Media Service

- [x] Configure AWS SDK v3 S3 client
- [x] `POST /api/v1/attachments/presigned-upload-url`: Generate time-limited pre-signed PUT URL
- [x] `GET /api/v1/attachments/:id/presigned-download-url`: Generate secure pre-signed GET URL
- [x] Attachment metadata registration and association with Tasks / Comments / User Avatars

### 3.7 Notifications & Audit Service

- [x] In-App notification list and mark-as-read endpoints (`/api/v1/notifications`)
- [ ] Firebase Cloud Messaging (FCM) integration service for push notifications
- [ ] AWS SES / SendGrid email notification dispatch service
- [x] Central Audit Log querying endpoint (`/api/v1/audit-logs`) with date/entity filters

---

## 4. Modern Web Application (`web/`)

### 4.1 UI Framework & Layout

- [x] Initialize React + Vite with TypeScript and Tailwind CSS
- [x] Document current custom-component architecture; adopting Shadcn is not a roadmap prerequisite
- [x] Integrate Lucide Icons
- [x] Build responsive shell layout:
  - Collapsible desktop sidebar and mobile sliding drawer
  - Top navigation bar with branch switcher, notifications badge, search palette (`Ctrl+K`), and user profile
- [x] Setup Dark / Light mode theme provider

### 4.2 Screens & User Flows

- [x] Authentication Screens: Email/Password login & Mobile/OTP form (live SMS delivery pending)
- [x] Dashboard with task totals, recent activity and explicitly labeled sample metrics
- [ ] Complete aggregate executive/branch reporting, sprint velocity and workload charts
- [x] Task Management Workspace (board, paginated list and release timeline):
  - Interactive Kanban Board with drag-and-drop status progression
  - Filterable Data Table (List View) with search
  - Calendar / Timeline view for Version milestones
- [x] Shared grid multi-column sorting within its client-loaded result scope (see [grid evidence](walkthrough/shared-listing-grid.md)); server-side scale acceptance remains PLAN-003
- [ ] Complete all advanced Task Detail View features (core drawer is implemented):
  - Core inline field editing, focused creation, revision conflicts and fixture-based browser acceptance are implemented; live database acceptance remains pending
  - Multi-assignee avatar chips and selector
  - Subtask checklist with quick-add
  - File attachments gallery with image preview and S3 upload progress bar
  - Interactive Time Tracker widget (Start/Pause timer + manual log entry)
  - Threaded comment section with markdown support and user mentions
- [x] Master Management Interfaces (Branches, Departments, Designations, Users, Dynamic Task Types)
- [x] Dynamic RBAC Permission Matrix UI with User and Branch override toggles
- [x] Clients & Projects Management with financial amount tracking (contract value, AMC, hourly billables)
- [x] Individual worklog submission, rejection, resubmission and manager approval screen
- Grouped weekly approval and later monthly summary scope are tracked once under TIME-001 in section 11.

---

## 5. Cross-Platform Mobile Application (`mobile/` - Android & iOS)

### 5.1 Core Architecture & Device Integrations

- [x] Create Flutter application source with modular architecture
- [ ] Complete/verify native Android and iOS build scaffolding and successful builds
- [x] Setup secure token storage (`flutter_secure_storage`)
- [x] Configure Dio HTTP client with interceptors for auth tokens and error handling
- [x] Setup State Management (Riverpod / Bloc / Provider)
- [ ] Integrate Firebase Cloud Messaging (`firebase_messaging`) for push alerts

### 5.2 Screens & Native Capabilities

- [ ] Login screen with Email/Password and Mobile/OTP (SMS auto-fill)
- [x] Bottom navigation bar (Home/Dashboard, Tasks, Timesheet, Notifications, Profile)
- [ ] Task List view with search, filter by project/product, and status chips
- [x] Task Detail screen with status transition selector and subtask checklist
- [ ] Camera & File Upload Integration:
  - Snap photo or select document from gallery/file system
  - Image compression and direct upload to AWS S3 via pre-signed URL
- [ ] GPS Location Access:
  - Capture current geo-coordinates on check-in or field task completion
  - Branch proximity / geofencing indicator
- [ ] Mobile Time Tracker:
  - Foreground live timer widget with notification drawer controls
  - Quick worklog submission
- [ ] In-App Notification Center with deep-linking to tasks

---

## 6. Quality Assurance & Production Readiness

- [ ] Static code analysis and linting across backend, web, and mobile repositories
- [x] Unit testing for dynamic RBAC permission evaluation and auto-assignment rules
- [x] Selected workflow API regressions and unit tests recorded in requirements audit
- [ ] Comprehensive integration and authorization regression coverage
- [ ] Validation of SQL scripts in `dbscripts/` (schema syntax, foreign keys, triggers)
- [ ] Security review: rate-limiting verification, CORS policy, AWS S3 bucket least privilege
- [x] Development schema changes manually applied by developer, as recorded in requirements audit
- [ ] Target production database scripts reviewed/applied and deployment validated by human developer
- [ ] Human review and commit of current changes (historical implementation commits already exist)

---

## 7. Additional Completed Scope From Requirements Audit

- [x] Expanded organization, employee, product, project and license fields with persistence checks
- [x] Role CRUD and role/branch/user permission matrix screens
- [x] Project team allocation and product-client license management screens
- [x] Version/release management and release timeline
- [x] Task severity, dates, primary assignee and inherited task-type defaults
- [x] Task-type custom-field definitions and validated per-task values with create/edit rendering
- [x] Threaded comment replies and workflow-aware subtask actions
- [x] Overtime/weekend worklog classification and per-worklog approval protection
- [x] Notification preferences and in-app task/assignment/status/comment events
- [x] Profile password change, tracked sessions, refresh rotation and remote revocation
- [x] Tested core branch checks and financial redaction (not exhaustive authorization certification)
- [x] Audit filters, dates, detail view, pagination and error feedback
- [x] Login DTO/envelope, proxy, UUID validation and seed-data fixes
- [x] Company branding, README and Windows service-control scripts

## 8. Remaining Requirements and Acceptance Gates

### External services and infrastructure

- [ ] Successful real S3 upload/confirmation/download/avatar test: last recorded PUT failed with HTTP 403 `InvalidAccessKeyId`; credentials and browser CORS need verification
- [ ] Implement/configure actual SMS provider and verify OTP delivery/login end to end
- [ ] Shared Redis OTP cache and distributed request throttling; current OTP state is process-local
- [ ] Actual email and FCM dispatch with delivery verification (token/preferences storage exists)
- [ ] Scheduled deadline/SLA alerts and WebSocket/SSE transport
- [ ] Planned asynchronous delivery queues, audit archival/partitioning and operational infrastructure

### Task collaboration and reporting

- [x] Dynamic per-task custom-field value storage and rendering (manual blank-database installation acceptance pending)
- [x] Formatted task descriptions with toolbar and preview (Markdown-based, raw HTML disabled)
- [ ] Rich-text comment composition and comment-specific attachment composition
- [ ] Responsibility flags beyond primary-assignee selection
- TIME-001 and ANALYTICS-004 in section 11 track grouped timesheets, summary/export scope and aggregate reports.

### Mobile

- [ ] Flutter/Dart analysis, Android/iOS builds and device acceptance tests
- [ ] Offline task/draft cache and conflict-aware reconnect synchronization
- [ ] Integrated GPS/geofence check-in, field activity and location audit workflows
- [ ] Native push initialization, notification deep links and SMS autofill
- [ ] Notification timer controls and remaining web/mobile feature parity
- [ ] Signing, release artifacts and store/TestFlight release validation

### Security, operations and documentation

- [ ] Password expiry and MFA challenge flow
- [ ] External API-key/OAuth provisioning and IP allowlists
- [ ] Full authorization review including secondary lookups and report routes
- [ ] Reconcile current web localStorage tokens with documented HTTP-only-cookie architecture
- [ ] Complete authentication/change/download audit coverage and actor/IP/device/location metadata
- [ ] OWASP/penetration testing and production rate-limit verification
- [ ] Load tests for latency, branches, users and task-volume targets
- [ ] Backup/restore, encryption/TLS, monitoring and availability acceptance
- [ ] Production deployment acceptance, rather than deployment instructions alone
- [ ] Align older README/phase claims, framework versions, CORS environment names, ports, pagination and architecture descriptions

## 9. Web UI Refresh and Theme Verification (2026-09-26)

- [x] Refresh shared navigation, dashboard, login and management surfaces
- [x] Connect Tailwind dark variants to the application's explicit theme selection
- [x] Apply saved appearance before first paint, validate stored preference and synchronize tabs
- [x] Add login theme control, keyboard focus styling, skip link and reduced-motion handling
- [x] Browser verification of ten routes in both themes, record dialog focus, persistence/cross-tab sync, sidebar collapse and 320/390/768px layouts using intercepted API fixtures
- [x] Web TypeScript and production build pass

UI evidence: [refresh walkthrough](walkthrough/web-ui-refresh-and-checklist-2026-09-26.md) and [browser results](walkthrough/ui-theme-results.json). These checks do not replace live backend/provider or native mobile acceptance tests.


## 10. Jira-style Task Creation and Editing (2026-09-28)

- [x] Focused task creation, context/defaults, Create another and full subtask form
- [x] Inline task fields, wide drawer/full-page mode, assignment/primary owner controls
- [x] Null clearing, zero/false preservation, transactional updates and revision conflict handling
- [x] Formatted descriptions, typed custom values and task-scoped history
- [x] Backend/web builds, 46 backend tests, fixture browser acceptance and SQL artifact checks
- [ ] Developer/DBA blank-database installation and live task-workflow acceptance for the new schema

Evidence: [create/edit walkthrough](walkthrough/jira-style-task-create-edit-2026-09-28.md). Advanced list productivity, visual field-layout administration and native mobile parity remain separate work.

## 11. Accepted Roadmap and Acceptance Gates (2026-09-29)

All boxes in this section remain unchecked. Feature IDs reference [requirements](requirements.md) and [delivery increments](plan.md). Existing components may support these features, but none is marked complete by this documentation change. For each feature, implementation work must record backend, web, mobile applicability, automated evidence and manual/live acceptance separately. Cross-references elsewhere are not additional progress items.

### 11.1 Increment A — Trustworthy Foundation

- [ ] **FND-001 — permissions and evidence**: Reconcile documented status; define invitation/client/project/action boundaries and internal, client-shared and product-community audiences; test details, lookups, counts, search, export, history, notifications and S3 downloads.
- [x] **FND-001 — calendars and events**: Implemented configurable employee/contract calendars, public holidays, schedule assignments, leave requests/approvals, and effective working capacity calculation across database, NestJS backend, and React web UI.
- [ ] **FND-001 — acceptance**: Complete provider checks needed by the release and human blank-database acceptance; preserve pending SMS/S3/email/FCM/native gates in section 8 until actual evidence exists.

### 11.2 Increment B — Daily Development Planning

- [x] **PLAN-001**: Initiative/epic/task/subtask hierarchy, ranked product/project backlogs, separate sprints/releases/milestones, team ownership and sprint permissions.
- [x] **PLAN-001 — acceptance**: Record initial sprint commitment, scope changes and rollover history; support story points/T-shirt sizes and Kanban without mandatory sprints.
- [x] **PLAN-002**: FS and directed Blocks links, inverse display, dependency-only cycle checks; blocker episodes with owner/reason/next action and overlapping-duration handling.
- [x] **PLAN-002 — defect templates**: Reuse custom fields for reproduction, expected/actual behavior, environment and workaround; distinguish priority/severity and enforce resolution classifications.
- [x] **PLAN-003**: Personal/team saved views, inline cells and permission-aware bulk operations with revision checks/partial failures; coordinated server-side queries and exports for large results.
- [x] **TIME-001**: Configurable weekly grid and reminders based on expected hours (integrated with `CalendarsService.calculateWorkingCapacity`); cross-project reviewer portions, submit/reject/resubmit/approve and audited amendments without duplicate approval.
- [x] **TIME-001 — timer**: Persist one active timer across tabs/devices in database (`user_active_timers`) with recovery and correction; task switching auto-logs prior timer; browser blur never stops/discards time automatically.
- [x] **TIME-001 — acceptance**: Full verification across leave/holiday expected hours calculations, cross-project portion approvals with self-approval prevention, rejection re-submission workflows, and global navbar timer widget.

- [x] **PLAN-004**: Teams independent of branch/department; scoped component ownership/dependency maps and authorized work/defect/debt drill-downs; membership grants no additional access.
- [x] **FLOW-001**: Explicit send/acknowledge/start/return/redirect/complete events and receiving queues; retain episodes, reminders and distinct acceptance versus work-start waiting durations.
- [x] **CONFIG-001**: Visual project/product overrides, versioned defaults, required-field/role/manual-gate rules, preview and active-state mapping; identical API/inline/bulk enforcement.
- [ ] **PLAN-001/002/003 — detail acceptance**: Scope ledger with baseline/reasons, release-readiness workspace, blocker radar and lifecycle alerts, authorized dependency maps, enriched bug context and My Work queues; manual review only.

### 11.3 Increment C — Client Delivery

- [x] **CLIENT-001**: Invitation, recovery, restricted delegated administration and revocation; explicit sharing, allowlisted responses, bounded download access and contract-specific closeout/history rights.
- [x] **CLIENT-002**: Private bug/support/change requests with clarification, triage, reasons and duplicate/delivery linking; submission grants no commercial/date commitment.
- [x] **CLIENT-003**: Versioned requirements, baseline scope and acceptance criteria linked to work, QA evidence and client decisions; coverage gaps view.
- [x] **CLIENT-004**: PM review and authorized client approval of a specific scope/price/date revision; material edits require new approval and preserve prior decisions.
- [x] **CLIENT-005**: Versioned UAT packages, defects, evidence and explicit approve/request-changes/reject; separate developer done, QA verified and client accepted.
- [x] **CLIENT-006**: PM-reviewed client-safe progress updates, health narrative, decisions needed, target/committed dates and report history.
- [x] **DEL-001**: Risks/assumptions/decisions with owners, mitigation and review dates; client action list distinct from internal risk discussion and active blockers.
- [ ] **Client journey acceptance**: Request → triage → approved scope → development → QA → UAT → sign-off. Test client-to-client denial, hidden internal content and reapproval after material edits.

- [x] **CLIENT-002 / DEL-001 — detail acceptance**: Customer impact separate from urgency/severity/internal priority; dated affected-client/component/version evidence; decisions retain context, alternatives and supersession without exposing private source requests.

### 11.4 Increment D — Product Management and Repeatable Delivery

- [x] **PROD-001 — discovery**: Problems/evidence/segments, impact/confidence/effort/strategic fit and recorded product decisions; moderated sanitized publication.
- [x] **PROD-001 — voting**: Authorized organization representatives, one vote per client/idea, conflict handling, retraction and duplicate merging with deduplication; private identities/impact/commercials.
- [x] **PROD-001 — roadmap**: Authenticated Now/Next/Later views, indicative versus committed dates, deferred/merged outcomes, delivery/release links and approved changelogs.
- [x] **PROD-002**: Product goals, baselines/targets, owners and dated outcome reviews linked to released features.
- [x] **QA-001**: Reusable manual test cases/runs, evidence, affected/fix versions, known issues and reviewed release readiness; no CI/CD or automated test execution integration.
- [x] **COLLAB-001**: Versioned knowledge/decision documents with explicit audiences and permission-preserving task links; rich comments and comment-specific S3 composition.
- [x] **COLLAB-002**: Project/task templates, relative dates and recurring work with unique occurrences; never copy approvals, client permissions or confidential artifacts implicitly.
- [x] **COLLAB-003**: Watchers, independent follows, channel/digest/quiet-hour settings and urgent exceptions; retries deduplicate and queued delivery rechecks authorization.
- [x] **COMM-001**: Retainer/AMC periods, included/approved/remaining hours, historical terms, rollover and overage approval using CLIENT-004.
- [x] **Product acceptance**: Merge duplicate ideas without privacy leaks or duplicate votes, link idea to outcome review, and reconcile approved allowance usage without double consumption.

- [x] **QA-002**: Scoped environment labels and version-specific observations/retests; internal QA pass leaves failing client UAT and older client versions unresolved.
- [x] **COLLAB-004**: What changed filters by recorded baseline/login/time window; source-linked event versus distinct-item counts, missing-history disclosure and client-safe summaries without AI.
- [x] **DATA-001**: CSV templates/mapping, dry-run, validated references, create/update conflicts, batch/row results and retry identities; formula-safe exports and no approval bypass or arbitrary attachment fetching.
- [ ] **COLLAB-001 / QA-001 — detail acceptance**: Permission-aware knowledge search, S3 attachment revisions and manual readiness evidence with partial-release context.

### 11.5 Increment E — Delivery Intelligence

- [x] **ANALYTICS-001**: Deterministic SLA policy selection, calendar snapshots and response/resolution/start/pause/reopen rules; rule-based warnings and nonduplicating escalation with stated business/elapsed units.
- [x] **ANALYTICS-002**: Maximum WIP/authorized exceptions, stage dwell, cumulative flow, lead/cycle distributions and quality trends reconciled to source events; correct reopened/cancelled populations.
- [x] **ANALYTICS-003**: Availability/allocated/demand views, split co-assignee effort, contextual team trends and explainable skill suggestions; no automatic employee/branch rankings.
- [x] **ANALYTICS-004**: Baseline variance, consumption thresholds, independent remaining estimates, burn/forecast curves, dated rate snapshots, currency-aware contribution and margin with N/A handling.
- [x] **Analytics acceptance**: Reconcile holidays, absence, scope/date changes, reopened work, overlapping blockers, missing estimates, mixed approval states and multiple currencies; show sample sizes/freshness.

- [x] **ANALYTICS-002/004 — detail acceptance**: Configurable owner/status aging thresholds, person/team WIP without double-counting blocked work, handoff delays, active/waiting/unclassified partition, net scope change and mean/median estimate accuracy with disclosed samples.

### 11.6 Later and Deferred Options

- [x] **LATER-001**: SS/FF/lag, critical path and capacity/date scenarios with previews and explicit application; calibrated composite health only after defining weights, missing-data behavior and overrides.
- [x] **LATER-002**: Optional source-linked drafting with human review, audience checks and approved data handling.
- [x] **API-001**: Scoped signed outbound PMT webhooks, stable IDs, bounded retries, rotation, revocation and safe destinations; at-least-once delivery with consumer deduplication, no Git/DevOps connectors.
- [x] **ADMIN-001**: Single-company setup wizard and configuration packages; compatible versions, dependency mapping, preview/diff, conflict handling and audited application without secrets, memberships or elevated grants.
- [x] **LATER-002 — focused actions**: Source-linked gap/duplicate suggestions, acceptance/work-breakdown drafts and bug/release/activity summaries; human review before creation/publication.
- Deferred: partner installation/hosting/upgrade management, executable plugins and in-product backup/restore administration.
- Deferred: automatic employee/branch leaderboards, internet-public roadmaps, universal automation designer and separate monthly timesheet approval.
- Lower priority: native field/geofencing expansion and broad CRM/HR/payroll/accounting scope; Git integration, DevOps and CI/CD remain out of scope.
