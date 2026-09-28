<div align="center">

# 🚀 KS-PMT (Kashvira Infotech - Project & Product Management Tool)

### *Enterprise-Grade Multi-Branch Task, Project & Product Management Ecosystem*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Backend: NestJS](https://img.shields.io/badge/Backend-NestJS%2010-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Frontend: React + Vite](https://img.shields.io/badge/Frontend-React%2018%20%7C%20Vite-61DAFB?logo=react&logoColor=black)](https://vitejs.dev/)
[![Mobile: Flutter](https://img.shields.io/badge/Mobile-Flutter%203%20(Android%20%26%20iOS)-02569B?logo=flutter&logoColor=white)](https://flutter.dev/)
[![Database: PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2015+-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Storage: AWS S3](https://img.shields.io/badge/Storage-AWS%20S3%20Pre--Signed-FF9900?logo=amazons3&logoColor=white)](https://aws.amazon.com/s3/)
[![Tailwind CSS: v4](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

---

**KS-PMT** is an enterprise-ready task and product lifecycle management platform designed for **one company with multiple locations and branches**, supporting both **commercial software products** and **custom client development services**. It is deployed for the company's own use and is not a SaaS offering.

Built with a **NestJS REST API backend**, a modern **React 18 + Tailwind CSS web dashboard**, and a cross-platform **Flutter mobile app (Android & iOS)** with native hardware capabilities (GPS Geofencing, Camera/Gallery S3 Uploads, Live Timers, and FCM Push Notifications).

</div>

---

## 📑 Table of Contents

- [Architectural Overview](#-architectural-overview)
- [Feature Matrix & Implementation Status](#-feature-matrix--implementation-status)
  - [1. Multi-Branch & Dynamic RBAC Engine](#1-multi-branch--dynamic-rbac-engine)
  - [2. Dual Authentication & Access Control](#2-dual-authentication--access-control)
  - [3. Dynamic Task Engine & State Machine Workflows](#3-dynamic-task-engine--state-machine-workflows)
  - [4. Agile Sprints, Milestones & Backlog Management](#4-agile-sprints-milestones--backlog-management)
  - [5. Task Dependencies, Critical Path & Blocker Radar](#5-task-dependencies-critical-path--blocker-radar)
  - [6. Effort Tracking, Timesheets & Budget Variance](#6-effort-tracking-timesheets--budget-variance)
  - [7. Deadline Management, SLA Engine & Early Warnings](#7-deadline-management-sla-engine--early-warnings)
  - [8. Bottleneck Detection & Flow Analytics](#8-bottleneck-detection--flow-analytics)
  - [9. Team & Employee Performance, Workload & Capacity](#9-team--employee-performance-workload--capacity)
  - [10. Auto-Assignment Rule Matrix](#10-auto-assignment-rule-matrix)
  - [11. Financial, Client & Commercial Tracking](#11-financial-client--commercial-tracking)
  - [12. Cloud Storage (AWS S3 Direct Uploads)](#12-cloud-storage-aws-s3-direct-uploads)
  - [13. Central Tamper-Evident Audit Trail](#13-central-tamper-evident-audit-trail)
  - [14. Responsive Web Application (`web/`)](#14-responsive-web-application-web)
  - [15. Cross-Platform Mobile Application (`mobile/`)](#15-cross-platform-mobile-application-mobile)
  - [16. Executive & Portfolio Intelligence](#16-executive--portfolio-intelligence)
  - [17. Customer Portal (Client Self-Service & Issue Tracking)](#17-customer-portal-client-self-service--issue-tracking)
  - [18. Product Feature Request & Customer Voting Engine](#18-product-feature-request--customer-voting-engine)
- [Technology Stack](#-technology-stack)
- [Directory Structure](#-directory-structure)
- [Quick Start & Installation Guide](#-quick-start--installation-guide)
  - [Prerequisites](#prerequisites)
  - [Step 1: Database Setup (Static SQL Scripts)](#step-1-database-setup-static-sql-scripts)
  - [Step 2: Backend REST API Setup (`server/`)](#step-2-backend-rest-api-setup-server)
  - [Step 3: Web Dashboard Setup (`web/`)](#step-3-web-dashboard-setup-web)
  - [Step 4: Mobile App Setup (`mobile/`)](#step-4-mobile-app-setup-mobile)
- [Default Super Admin Credentials](#-default-super-admin-credentials)
- [Community, Feedback & Support](#-community-feedback--support)

---

## 🏛 Architectural Overview

```
                               +---------------------------+
                               |      End Users & Apps     |
                               +-------------+-------------+
                                             |
                    +------------------------+------------------------+
                    |                                                 |
        [Modern Web Application]                             [Mobile Application]
        (React 18 + Vite + Tailwind)                         (Flutter Android & iOS)
                    |                                                 |
                    +------------------------+------------------------+
                                             | HTTPS (REST API)
                                             v
                             +-------------------------------+
                             |    Nginx Reverse Proxy / SSL  |
                             +---------------+---------------+
                                             |
                                             v
                             +-------------------------------+
                             |     NestJS Backend API        |
                             |    (Modular REST Server)      |
                             +---+---------------+-------+---+
                                 |               |       |
                +----------------+               |       +----------------+
                |                                |                        |
                v                                v                        v
    +-----------------------+        +-----------------------+   +-------------------+
    | PostgreSQL 15+ (DB)   |        | AWS S3 Cloud Storage  |   | Firebase Cloud    |
    | - Multi-branch RBAC   |        | - Pre-signed PUT/GET  |   | Messaging (FCM)   |
    | - Central Audit Log   |        | - Zero server storage |   | - Push Alerts     |
    | - Workflows & Tasks   |        | - Encrypted at rest   |   +-------------------+
    +-----------------------+        +-----------------------+
```

---

## ✨ Feature Matrix & Implementation Status

> Legend: `[x]` Implemented / Available in current build | `[ ]` Planned Roadmap Feature

### 1. Multi-Branch & Dynamic RBAC Engine
- [x] **Multi-Location Hubs**: Native support for multiple physical branches and regional tech centers with GPS coordinates and geofence radii.
- [x] **Hierarchical Access Model**: Dynamic permissions computed from $\text{Effective Permissions} = \text{Base Role} - \text{Branch Revocations} + \text{User Explicit Overrides}$.
- [x] **Granular Override Controls**: Instantly grant or revoke module permissions at the specific branch or individual employee level.
- [x] **Super Admin Bypass**: Built-in system override for top-level corporate administrators.
- [x] **Department & Designation Hierarchy**: Department master with HOD mapping and designation seniority ranking.

### 2. Dual Authentication & Access Control
- [x] **Zero Public Registration**: Open self-registration disabled; employee accounts are provisioned exclusively by authorized administrators.
- [x] **Email & Password Authentication**: Secure authentication with Argon2id / bcrypt hashing (12 rounds) and password complexity validation.
- [x] **Mobile Number & 6-Digit OTP**: OTP-based authentication with expiration countdowns and rate-limiting.
- [x] **Session Tracking & Remote Revocation**: View active sessions with device platform, IP address, and remote session termination.
- [ ] **MFA Challenge & Password Expiration Policies**: Mandatory password rotation cycles and multi-factor verification prompts.

### 3. Dynamic Task Engine & State Machine Workflows
- [x] **Dynamic Task Types**: Configurable task types (*New Development, Bug, Issue, Enhancement, Support Ticket*) with individual color codes and default chargeability.
- [x] **Workflow State Machine**: Strictly enforces allowed status transitions per task type, preventing illegal workflow skipping.
- [x] **Jira-Style Inline Editing**: Click-to-edit for title, description, priority, severity, dates, release, and billable amounts with optimistic conflict checking.
- [x] **Revision Concurrency Locking**: Atomic `revision` checks on task updates to prevent concurrent overwrite collisions (HTTP 409 Conflict).
- [x] **Custom Fields per Task Type**: JSONB custom fields (*text, textarea, number, boolean, date, select, multiselect, user*) with server-side schema validation.
- [x] **Rich Markdown Descriptions**: Formatted descriptions with toolbar support (headings, bold, lists, code blocks) and real-time preview.
- [x] **Multi-Assignee Support**: Assign primary owners alongside secondary collaborators with searchable user pickers.
- [x] **Hierarchical Subtasks**: Parent-child subtask checklist with quick-add and full-detail creation modes.
- [ ] **Structured Defect Fields**: Standardized numbered Steps to Reproduce, Expected vs. Actual behavior, and Workaround details.
- [ ] **Defect Resolution Classification**: Formal resolution categorizations (*Fixed, Won't Fix, Duplicate, Cannot Reproduce, By Design*).

### 4. Agile Sprints, Milestones & Backlog Management
- [x] **Version & Release Milestones**: Scheduling and tracking product and project releases with target vs. actual delivery dates.
- [ ] **Sprint Lifecycle Management**: Dedicated agile sprints within projects (`sprint_number`, `sprint_goal`, `PLANNING`, `ACTIVE`, `COMPLETED`).
- [ ] **Backlog Grooming & Sprint Planning**: Interactive drag-and-drop planning board to rank and move tasks from project backlog to active sprints.
- [ ] **Story Points & Complexity Sizing**: Support Fibonacci sizing (`1, 2, 3, 5, 8, 13`) and T-shirt sizing (`XS, S, M, L, XL`) alongside hourly estimates.
- [ ] **Sprint Rollover Wizard**: Automated wizard on sprint completion to rollover incomplete tasks to the next sprint or backlog.

### 5. Task Dependencies, Critical Path & Blocker Radar
- [ ] **Relational Task Dependencies**: Support `Finish-to-Start` (FS), `Start-to-Start` (SS), `Finish-to-Finish` (FF), `Blocks / Is Blocked By`, and `Relates To`.
- [ ] **Circular Dependency Prevention**: Server-side Directed Acyclic Graph (DAG) cycle validation ($A \rightarrow B \rightarrow C \rightarrow A$).
- [ ] **Interactive Critical Path Gantt**: Visual Gantt chart showing dependency lines, critical path calculations, and cascading schedule shift alerts.
- [ ] **Explicit Blocker Flagging**: "Flag as Blocked" toggle with categorized reasons (*Client Dependency, Missing Specs, Technical Blocker, Environment Down*).
- [ ] **Blocker Radar & Elapsed Timers**: Automated tracking of cumulative blocked hours and a dashboard Blocker Radar strip for rapid impediment triage.

### 6. Effort Tracking, Timesheets & Budget Variance
- [x] **Per-Task Worklogs**: Manual effort logging with date, hours spent, billable/non-billable flag, and summary descriptions.
- [x] **Overtime & Weekend Classification**: Track standard hours vs. overtime and weekend effort.
- [x] **Individual Worklog Approval Workflow**: Draft, submit, approve, and reject pipeline with manager review remarks.
- [ ] **Grouped Weekly Timesheet Grid**: Unified Monday-to-Sunday matrix view for batch effort logging across assigned projects and tasks.
- [ ] **Missing Hours Automated Reminders**: Automated Friday afternoon and Monday morning alerts for employees logging $<40$ hours/week.
- [ ] **One-Click Batch Timesheet Approvals**: Single-click approval for an employee's full weekly timesheet with inline task audit drill-downs.
- [ ] **Persistent Live Global Stopwatch**: Sticky header timer with automatic task switching, pause on switch, and idle-time detection.
- [ ] **Task Effort Variance Badges**: Real-time $\text{Actual} - \text{Estimated}$ variance badges (Green $<90\%$, Amber $90-100\%$, Red $>100\%$).
- [ ] **Project Budget Burn Rate Curves**: Planned vs. actual hours burn curves with automated alerts at 75%, 90%, and 100% of budgeted hours.
- [ ] **Project Profitability Margins**: Calculate internal employee cost rate vs. billable client rate to evaluate gross project margins.

### 7. Deadline Management, SLA Engine & Early Warnings
- [x] **Static Due Date Tracking**: Planned and actual start/end dates with overdue task flagging.
- [ ] **Configurable SLA Policies Matrix**: First Response Time and Resolution Time targets mapped by Priority, Severity, Task Type, and Client Tier.
- [ ] **Business Hours Calculation Engine**: Automatic pause of SLA clocks outside office working hours and on regional branch holidays.
- [ ] **Dynamic SLA Countdown Badges**: Real-time countdown badges on tasks with warning and breach indicators.
- [ ] **Delay Early Warning System (EWS)**: Predictive algorithm identifying at-risk tasks prior to deadline breach (e.g. deadline within 48h while in `TODO`).
- [ ] **Multi-Tier Automated Escalation Matrix**: Progressive notifications on impending and breached deadlines (Assignee $\rightarrow$ PM $\rightarrow$ Branch Leadership).
- [ ] **Mandatory Delay Root-Cause Attribution**: Enforced selection of delay reasons upon overdue closure or deadline extension (*Scope Creep, Client Delay, Tech Complexity, Estimation, Leave*).

### 8. Bottleneck Detection & Flow Analytics
- [ ] **Kanban Work In Progress (WIP) Limits**: Configurable min/max task thresholds per status column with soft warnings and hard guards.
- [ ] **Status Dwell Time Heatmap**: Track exact business hours spent in each stage to pinpoint pipeline bottlenecks (e.g., development vs. code review vs. testing).
- [ ] **Cumulative Flow Diagram (CFD)**: Area charts visualizing work volume distribution across stages over time to highlight expanding bottlenecks.
- [ ] **Lead Time & Cycle Time Scatterplots**: Measure elapsed duration from creation to closure (Lead Time) and work started to closure (Cycle Time).

### 9. Team & Employee Performance, Workload & Capacity
- [x] **Basic Employee Workload Summary**: Active assigned task counts and aggregated logged hours per user (`vw_employee_workload`).
- [ ] **Resource Allocation & Capacity Heatmap**: Team member bandwidth matrix (Sprints/Weeks) highlighting over-allocated (>100%) and under-utilized (<75%) staff.
- [ ] **Estimation Accuracy Index (EAI)**: Track variance between estimated and actual logged hours over time to identify chronic estimation bias.
- [ ] **Engineering Quality & Rework Rates**: Track task reopen/rejection counts from QA back to dev and calculate First-Time-Right (FTR %) rate.
- [ ] **Post-Release Defect Leakage**: Ratio of customer-reported defects vs. internally detected defects per release version.
- [ ] **Employee 360° Operational Performance Scorecard**: Managerial performance scorecard tracking On-Time Delivery (OTD %), billable efficiency %, velocity, and quality.
- [ ] **Skill Matrix & Smart Task Allocation**: Employee skill taxonomy with proficiency tiers and smart assignment recommendations matching skills and available bandwidth.

### 10. Auto-Assignment Rule Matrix
- [x] **Event-Driven Triggers**: Evaluate routing rules automatically `ON_CREATION` or `ON_STATUS_CHANGE`.
- [x] **Department HOD Routing**: Automatically route tasks to the designated department head (e.g., dev complete $\rightarrow$ QA HOD).
- [x] **Round-Robin Distribution**: Dynamically distribute tasks to the least-loaded active team member in a department or branch.
- [x] **Designation Hierarchy Routing**: Route based on seniority hierarchy ranking.
- [x] **Specific User Assignment**: Direct assignment to designated specialist users.

### 11. Financial, Client & Commercial Tracking
- [x] **Dual Business Models**: Supports both **Client Development Projects** (Fixed Price, Time & Materials, Retainers) and **In-House Software Products**.
- [x] **Client & Prospect CRM**: Manage leads, active client accounts, and lifecycle conversion with tax/billing details.
- [x] **Software Product Licensing**: Manage license models (SaaS, On-Premise, Perpetual), standard pricing, and annual maintenance contract (AMC) renewals.
- [x] **Task-Level Chargeables**: Toggle individual tasks as chargeable/billable with custom amounts, rolling up into project financial summaries.
- [x] **Project Team Member Allocations**: Assign employees to projects with explicit allocation percentages and date spans.

### 12. Cloud Storage (AWS S3 Direct Uploads)
- [x] **Direct-to-S3 Pre-Signed URLs**: Pre-signed PUT URLs for direct client uploads of binary files (photos, documents, logs, zip archives) to Amazon S3.
- [x] **Zero Server Memory Bottlenecks**: Prevents server memory exhaustion and eliminates proxy bandwidth overhead.
- [x] **Expiring Secure Downloads**: Pre-signed GET URLs with time limits for private, secure file access.
- [ ] **Verified End-to-End Cloud S3 Acceptance**: Verification of production S3 bucket policies and CORS configuration in live cloud deployments.

### 13. Central Tamper-Evident Audit Trail
- [x] **Comprehensive Activity Logging**: Tracks user authentication, task status shifts, financial changes, and file uploads.
- [x] **Before / After JSON Snapshots**: Stores `old_values` and `new_values` JSONB diffs with automated triggers.
- [x] **Forensic Metadata**: Captures IP address, user agent, client device platform (`WEB`, `ANDROID`, `IOS`), and GPS coordinates.
- [x] **Task-Scoped History Tab**: Readable timeline in task drawers displaying field mutations, actor names, and timestamps.
- [ ] **Automated Audit Partitioning & Archival**: Monthly/quarterly table partitioning for high-volume audit logs older than 12 months.

### 14. Responsive Web Application (`web/`)
- [x] **Modern Tech Stack**: React 18, Vite, Tailwind CSS, Lucide Icons.
- [x] **Interactive Kanban Board**: Drag-and-drop status transitions with workflow guardrails.
- [x] **Shared Listing Grid**: Built with MIT-licensed TanStack Table, with search, column filters, pagination, multi-column sorting, grouping, print, and CSV exports.
- [x] **Task Drawer & Full-Page Workspace**: Drawer view with inline field editors and a dedicated full-page route (`/tasks?taskId=<id>&viewTask=full`).
- [x] **Command Palette (`Ctrl+K`)**: Instant debounced search across all tasks, projects, and clients.
- [x] **Bento-Grid Dashboard**: Executive metrics for active tasks, billable values, and recent activities.
- [x] **Adaptive Dark & Light Theme**: System preference detection, explicit toggle, and cross-tab synchronization.

### 15. Cross-Platform Mobile Application (`mobile/`)
- [x] **Flutter Multiplatform Architecture**: Clean modular architecture for Android and iOS.
- [x] **Secure Token Storage**: Encrypted credential storage via `flutter_secure_storage`.
- [x] **5-Tab Navigation Shell**: Dashboard, Tasks, Timesheets, Alerts, and Profile.
- [x] **Task Detail & Workflow Screen**: Status transition picker and subtask checklists.
- [ ] **Camera & Gallery S3 Uploader**: Snap photos or attach documents with direct progress streaming to AWS S3.
- [ ] **GPS Location Check-in & Geofencing**: Real-time proximity calculation against branch coordinates on field check-ins.
- [ ] **Mobile Live Stopwatch**: Notification drawer timer controls with quick worklog logging.
- [ ] **FCM Push Notification Integration**: Push alert handler with deep-linking directly into referenced tasks.
- [ ] **Offline Task Caching & Sync**: Local SQLite / Hive caching for offline viewing with reconnect synchronization.

### 16. Executive & Portfolio Intelligence
- [x] **Multi-Branch Filtering**: Corporate overview with instant branch switching for multi-location oversight.
- [ ] **Project Health Index (PHI)**: Composite 0-100 score combining schedule health, budget burn, defect density, and active blockers.
- [ ] **Cross-Branch Productivity Benchmarking**: Comparative analytics across locations comparing velocity, billable efficiency %, and on-time delivery rates.

### 17. Customer Portal (Client Self-Service & Issue Tracking)
- [ ] **Customer Authentication & Provisioning**: Secure customer user logins (`user_type = 'CLIENT'`) mapped directly to client company records.
- [ ] **Dual Client Support**: Native portal support for both **Custom Project Clients** and **Software Product Licensees**.
- [ ] **Strict Multi-Tenant Boundary Isolation**: Customers can ONLY view projects, products, releases, and tasks belonging to their organization.
- [ ] **Internal Data Redaction Layer**: Strictly hides internal notes (`is_internal_only = TRUE`), employee costings, billing rates, and internal assignees.
- [ ] **Customer Task & Bug Reporting**: Self-service interface for logging bugs, change requests, and support tickets with environment info and S3 file attachments.
- [ ] **Milestone Delivery Timeline**: Client-facing Gantt/timeline view showing planned releases, versions, and sprint delivery dates.
- [ ] **Direct Customer Collaboration**: Threaded discussions between client representatives and internal project leads on public task comments.

### 18. Product Feature Request & Customer Voting Engine
- [ ] **Crowdsourced Product Ideation**: Shared feature request forum where licensed customers of the same software product can submit and discuss enhancements.
- [ ] **Module Categorization**: Organize enhancement requests by product module (e.g. Reporting, UI, Integration, Performance, Mobile).
- [ ] **Customer Upvoting Mechanism**: Enforce 1 vote per customer organization with optional business impact justification statements.
- [ ] **Product Demand Analytics Dashboard**: Prioritization report for Product Managers ranking feature requests by raw vote counts and revenue-weighted impact (client ACV/ARR).
- [ ] **Customer-Facing Roadmap Transparency**: Live feature lifecycle stages (`PROPOSED` -> `UNDER_EVALUATION` -> `PLANNED` -> `IN_DEVELOPMENT` -> `RELEASED` / `DECLINED`).
- [ ] **Automated Status Notifications**: Automatic email and in-app alerts sent to all voting customers when an upvoted feature is planned or released in a new version.

---

## 🛠 Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend Framework** | [NestJS 10](https://nestjs.com/) (Node.js 20+, TypeScript) |
| **Database** | [PostgreSQL 15+](https://www.postgresql.org/) (pgcrypto, PL/pgSQL functions & triggers) |
| **Database Access** | Native `pg.Pool` connection pooling (No ORM auto-migrations; strict SQL script compliance) |
| **Cloud Storage** | [AWS S3](https://aws.amazon.com/s3/) via `@aws-sdk/client-s3` & `@aws-sdk/s3-request-presigner` |
| **Security & Auth** | Dual login (Email+Password & Mobile+OTP), JWT, Passport, Helmet, Rate-limiting |
| **Web Frontend** | [React 18](https://react.dev/), [Vite](https://vitejs.dev/), [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/), Axios |
| **Mobile App** | [Flutter 3.x](https://flutter.dev/) (Dart), Dio with queued interceptors, Geolocator, ImagePicker, SecureStorage |
| **Testing** | [Jest](https://jestjs.io/), `ts-jest` (100% pass rate on unit & integration test suites) |

---

## 📂 Directory Structure

```
ks-pmt/
├── dbscripts/                        # Static PostgreSQL DDL/DML scripts (Static review only)
│   ├── install.psql                  # Run all object scripts and seeds with psql
│   ├── build-install.mjs             # Generate install.sql for pgAdmin (no DB connection)
│   ├── install.sql                   # Generated, Git-ignored bundle; regenerate after SQL changes
│   ├── tables/                       # tables.sql (current blank-database schema)
│   ├── views/                        # vw_project_financial_summary.sql, etc.
│   ├── functions/                    # fn_calculate_task_effort.sql, fn_set_updated_at.sql, etc.
│   ├── triggers/                     # trg_tasks_updated_at.sql, trg_tasks_audit.sql, etc.
│   ├── indexes/                      # indexes.sql (Optimized composite indexes)
│   └── inserts/                      # inserts.sql (Roles, permissions, Super Admin seed)
│
├── server/                           # NestJS REST API Backend
│   ├── src/
│   │   ├── common/                   # Guards, interceptors, filters, decorators
│   │   ├── database/                 # DatabaseService connection pool
│   │   └── modules/                  # Auth, RBAC, Branches, Users, Tasks, TimeLogs,
│   │                                 # Attachments (S3), Notifications, AuditLogs, Projects
│   └── test/                         # Unit and integration test suites
│
├── web/                              # Modern Responsive Web Application (React + Vite + Tailwind)
│   ├── src/
│   │   ├── api/                      # Axios client with auto-refresh & typed endpoints
│   │   ├── context/                  # AuthContext (RBAC evaluator) & ThemeContext
│   │   ├── components/               # Bento Dashboard, Kanban Board, Task Drawer, Modals
│   │   └── types/                    # TypeScript interfaces
│   └── vite.config.ts
│
├── mobile/                           # Cross-Platform Mobile Application (Flutter Android & iOS)
│   ├── android/                      # Native AndroidManifest with GPS, Camera, S3 permissions
│   ├── ios/                          # iOS Info.plist with Location, Camera, Photo Library strings
│   ├── lib/
│   │   ├── core/                     # Constants, Theme, Dio client with 401 token refresh queue
│   │   ├── data/                     # Models, repositories, S3 media uploader, Geolocator service
│   │   └── presentation/             # AuthProvider, TaskProvider, 5-tab screens
│   └── pubspec.yaml
│
└── docs/                             # Full Architecture, Requirements, and Deployment Guides
    ├── requirements.md               # Functional & technical specifications
    ├── tech-stack.md                 # Technology stack documentation
    ├── plan.md                       # Architecture design plan
    ├── deployment-guide.md           # Production deployment & operations guide
    └── walkthrough/                  # Step-by-step walkthroughs for all 9 phases
```

---

## 🚀 Quick Start & Installation Guide

### Prerequisites
- **Node.js**: `v20.x` or `v22.x` (LTS)
- **PostgreSQL**: `v15+` running on port `5432`
- **AWS S3 Bucket**: Configured for pre-signed uploads
- **Flutter SDK**: `v3.x` (for building mobile applications)

---

### Step 1: Database Setup (Static SQL Scripts)

> [!IMPORTANT]
> **This project is under development.** After every major change, the developer / DBA will run and test it against a blank database. Maintain schema changes directly in the canonical `CREATE` definitions instead of adding `ALTER`, `DROP`, `UPDATE`, or `DELETE` migration statements. Required seed inserts and application logic inside SQL functions/procedures are retained. Incremental migrations will be used once the project is declared live. See [database script guidelines](AGENTS.md#1-database-script-generation--management-rules).

**1. Prepare a blank database.** The developer / DBA performs these steps manually. Install the `psql` client for the terminal option, and ensure the database user can create objects in `public` and install the `uuid-ossp` and `pgcrypto` extensions. The installer creates these extensions; their packages must be available on the PostgreSQL server.

Create a new database in pgAdmin, or use the PostgreSQL `createdb` command:

```bash
createdb -U postgres kspmt_db
```

Use the same database name in the installation command and `DB_NAME` in `server/.env`. The commands below assume `kspmt_db`; change it if your blank database has a different name. Existing development databases must be rebuilt by the developer / DBA before using the redesigned schema.

**2. Choose one installation option.** Run commands from the project root.

**Option A — Terminal:** run all separate object scripts and seed data with one command:

```bash
psql -X -v ON_ERROR_STOP=1 -U postgres -d kspmt_db -f dbscripts/install.psql
```

The installer runs tables/extensions, functions, triggers, views, indexes, and seed data in dependency order within one transaction, stopping on errors. It is for a blank database, not an upgrade of an existing installation.

**Option B — pgAdmin Query Tool:** generate the combined plain SQL file first (Node.js 20+; generation does not connect to a database or execute SQL):

```bash
node dbscripts/build-install.mjs
```

On Windows, you can instead double-click **`build-db-install.bat`** in the project root. It generates the same file and keeps the window open to display the result. From a terminal, use `build-db-install.bat --no-pause` to exit immediately after generation.

Open **Query Tool** on the blank database, open `dbscripts/install.sql`, clear any text selection, and choose **Execute script** to run the entire file. Use this generated file in Query Tool; `install.psql` contains commands intended for the `psql` client. Check the Messages panel for completion. If an error leaves the transaction aborted, run `ROLLBACK;` before retrying the corrected script.

**3. Keep the source files separate.** Edit object definitions in their dedicated folders. Add new object files to `dbscripts/install.psql` in dependency order, and regenerate the Git-ignored `install.sql` after every SQL change. The former `alter_tables.sql` is no longer required: its changes are part of the table definitions, and `department_heads` replaces the circular department/user relationship.

Both options include the seed data and [default Super Admin account](#-default-super-admin-credentials); do not run the seed file again separately. See [database installation instructions](dbscripts/README.md) for more details.

---

### Step 2: Backend REST API Setup (`server/`)

1. **Navigate to the server directory**:
   ```bash
   cd server
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   Configure your database and AWS credentials in `.env`:
   ```env
   PORT=4000
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=your_postgres_password
   DB_NAME=kspmt_db

   JWT_ACCESS_SECRET=super_secret_access_key_change_in_production_32_chars
   JWT_ACCESS_EXPIRATION=900s
   JWT_REFRESH_SECRET=super_secret_refresh_key_change_in_production_32_chars
   JWT_REFRESH_EXPIRATION=7d

   AWS_REGION=ap-south-1
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_S3_BUCKET_NAME=your_s3_bucket_name
   ```

4. **Run Unit Tests**:
   ```bash
   npm test
   ```

5. **Start Development Server**:
   ```bash
   npm run start:dev
   ```
   The REST API will be accessible at `http://localhost:4000/api/v1`.  
   Interactive Swagger documentation will be available at `http://localhost:4000/api/docs`.

---

### Step 3: Web Dashboard Setup (`web/`)

1. **Navigate to the web directory**:
   ```bash
   cd web
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start Vite Development Server**:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:3000`.

4. **Build for Production**:
   ```bash
   npm run build
   # Production build output ready in web/dist/
   ```

---

### Step 4: Mobile App Setup (`mobile/`)

1. **Navigate to the mobile directory**:
   ```bash
   cd mobile
   ```

2. **Install Flutter packages**:
   ```bash
   flutter pub get
   ```

3. **Run on Connected Device or Emulator**:
   ```bash
   # Launch on connected Android device/emulator
   flutter run -d android

   # Launch on iOS Simulator (macOS only)
   flutter run -d ios
   ```

---

## 🔑 Default Super Admin Credentials

The database installer includes `dbscripts/inserts/inserts.sql` and provisions the root Super Admin account:

| Parameter | Default Value | Notes |
| :--- | :--- | :--- |
| **Employee Code** | `EMP-0001` | System Administrator |
| **Email Address** | `admin@kashvirainfotech.com` | Primary login email |
| **Mobile Number** | `+919999900000` | For OTP authentication |
| **Password** | `Admin@123456` | *Change immediately upon first login* |
| **OTP Code (Dev)** | `123456` | Default verification code |

---

## 💬 Community, Feedback & Support

This project is **100% open source** released under the [MIT License](LICENSE). We built **KS-PMT** with passion to help a software development or product company manage its projects across all its locations and branches, with full control over its deployment and data.

### 📬 Get in Touch
- **Contact Email**: `kashvirainfotech@gmail.com`

### 🌟 Let Us Know If You Are Using KS-PMT!
If you or your organization are using this project, **please drop us a short email at `kashvirainfotech@gmail.com`**.  
Hearing how KS-PMT helps your team gives us immense confidence, motivation, and a boost to keep adding more and more advanced enterprise features!

### 💡 Stopped Using KS-PMT? Help Us Improve!
If you tested, installed, or previously used KS-PMT but decided to stop using it, **we would genuinely love to know why**.  
Please email us with your honest feedback, pain points, or missing features. We welcome all feedback with open arms and will use it to continuously improve the tool for the entire developer community.

### 🤝 Feedback, Suggestions & Bug Reports
Feedback, feature suggestions, and bug reports are warmly welcomed! Please open an issue to share your ideas or report a problem, or email us at `kashvirainfotech@gmail.com`.

---

<div align="center">
  <sub>Engineered with ❤️ by <b>Kashvira Infotech</b></sub>
</div>
