# Project Tasks & Verification Checklist
## KS-PMT: Multi-Branch Project & Product Management System

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
- [x] `versions`: Release milestones and sprint versions for products and projects
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

### 2.2 Alter Statements (`dbscripts/tables/alter_tables.sql`)
- [x] Add cumulative alter statements with datetime comment blocks when modifying tables (Template initialized)

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
- [x] Initialize NestJS project with TypeScript, ESLint, and Prettier
- [x] Configure PostgreSQL database connection pool (`pg` / TypeORM / Kysely)
- [x] Setup Redis client for OTP caching, rate-limiting, and session management
- [x] Implement global Exception Filter, Logging Interceptor, and Response Envelope Interceptor
- [x] Implement validation pipes with `class-validator` and `class-transformer`
- [x] Setup Swagger / OpenAPI documentation UI at `/api/docs`

### 3.2 Authentication & Dynamic RBAC Module
- [x] `POST /api/v1/auth/login-password`: Authenticate with email and password
- [x] `POST /api/v1/auth/request-otp`: Request 6-digit OTP to registered mobile number
- [x] `POST /api/v1/auth/login-otp`: Verify mobile OTP and issue tokens
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
- [ ] Clients & Prospects CRUD (`/api/v1/clients`)
- [ ] Client conversion endpoint (Prospect -> Active Client)
- [ ] Products CRUD (`/api/v1/products`) with license pricing and AMC rates
- [ ] Client-Product License Mapping (`/api/v1/products/:id/clients`)
- [ ] Projects CRUD (`/api/v1/projects`) with budgets, billing rates, and dates
- [ ] Project Team Allocation (`/api/v1/projects/:id/members`)
- [ ] Versions & Milestones CRUD (`/api/v1/versions`) for both products and projects

### 3.5 Dynamic Task Management Engine
- [ ] Tasks CRUD (`/api/v1/tasks`) with multi-assignee payload
- [ ] Sub-task creation and hierarchical tree retrieval
- [ ] Task Status Transition endpoint (`PATCH /api/v1/tasks/:id/status`) with workflow validation
- [ ] Multi-assignee assignment / reassignment endpoints
- [ ] Chargeable toggle & charge amount update endpoints
- [ ] Effort / Worklog endpoints (`POST /api/v1/tasks/:id/time-logs`)
- [ ] Task Comments endpoints (`POST /api/v1/tasks/:id/comments`) with `@mention` parser
- [ ] Auto-assignment rule evaluation engine on task create and status change

### 3.6 Cloud Storage (AWS S3) & Media Service
- [ ] Configure AWS SDK v3 S3 client
- [ ] `POST /api/v1/attachments/presigned-upload-url`: Generate time-limited pre-signed PUT URL
- [ ] `GET /api/v1/attachments/:id/presigned-download-url`: Generate secure pre-signed GET URL
- [ ] Attachment metadata registration and association with Tasks / Comments / User Avatars

### 3.7 Notifications & Audit Service
- [ ] In-App notification list and mark-as-read endpoints (`/api/v1/notifications`)
- [ ] Firebase Cloud Messaging (FCM) integration service for push notifications
- [ ] AWS SES / SendGrid email notification dispatch service
- [ ] Central Audit Log querying endpoint (`/api/v1/audit-logs`) with date/entity filters

---

## 4. Modern Web Application (`web/`)

### 4.1 UI Framework & Layout
- [ ] Initialize React + Vite with TypeScript and Tailwind CSS
- [ ] Configure Shadcn UI component library and Lucide Icons
- [ ] Build responsive shell layout:
  - Collapsible desktop sidebar and mobile sliding drawer
  - Top navigation bar with branch switcher, notifications badge, search palette (`Ctrl+K`), and user profile
- [ ] Setup Dark / Light mode theme provider

### 4.2 Screens & User Flows
- [ ] Authentication Screens: Email/Password login & Mobile/OTP login
- [ ] Executive & Branch Bento-Grid Dashboard (KPI cards, active projects, sprint velocity, workload charts)
- [ ] Task Management Workspace:
  - Interactive Kanban Board with drag-and-drop status progression
  - Filterable Data Table (List View) with multi-column sorting and search
  - Calendar / Timeline view for Version milestones
- [ ] Task Detail View (Side Drawer):
  - Inline editing of title, priority, planned/actual dates, estimated hours
  - Multi-assignee avatar chips and selector
  - Subtask checklist with quick-add
  - File attachments gallery with image preview and S3 upload progress bar
  - Interactive Time Tracker widget (Start/Pause timer + manual log entry)
  - Threaded comment section with markdown support and user mentions
- [ ] Master Management Interfaces (Branches, Departments, Designations, Users, Dynamic Task Types)
- [ ] Dynamic RBAC Permission Matrix UI with User and Branch override toggles
- [ ] Clients & Projects Management with financial amount tracking (contract value, AMC, hourly billables)
- [ ] Timesheet Review & Approval screen for Managers

---

## 5. Cross-Platform Mobile Application (`mobile/` - Android & iOS)

### 5.1 Core Architecture & Device Integrations
- [ ] Initialize Flutter project with clean modular architecture
- [ ] Setup secure token storage (`flutter_secure_storage`)
- [ ] Configure Dio HTTP client with interceptors for auth tokens and error handling
- [ ] Setup State Management (Riverpod / Bloc)
- [ ] Integrate Firebase Cloud Messaging (`firebase_messaging`) for push alerts

### 5.2 Screens & Native Capabilities
- [ ] Login screen with Email/Password and Mobile/OTP (SMS auto-fill)
- [ ] Bottom navigation bar (Home/Dashboard, Tasks, Timesheet, Notifications, Profile)
- [ ] Task List view with search, filter by project/product, and status chips
- [ ] Task Detail screen with status transition selector and subtask checklist
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
- [ ] Unit testing for dynamic RBAC permission evaluation and auto-assignment rules
- [ ] Integration testing for task workflow status transitions
- [ ] Validation of SQL scripts in `dbscripts/` (schema syntax, foreign keys, triggers)
- [ ] Security review: rate-limiting verification, CORS policy, AWS S3 bucket least privilege
- [ ] Manual review and execution of all SQL scripts by human developer
- [ ] Manual review and git commitment by human developer
