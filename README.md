<div align="center">

# 🚀 KS-PMT (Kashvira Infotech - Project & Product Management Tool)

### *Project & Product Management for Development Teams and Clients*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Backend: NestJS](https://img.shields.io/badge/Backend-NestJS%2010-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Frontend: React + Vite](https://img.shields.io/badge/Frontend-React%2019%20%7C%20Vite-61DAFB?logo=react&logoColor=black)](https://vitejs.dev/)
[![Mobile: Flutter](https://img.shields.io/badge/Mobile-Flutter%203%20(Android%20%26%20iOS)-02569B?logo=flutter&logoColor=white)](https://flutter.dev/)
[![Database: PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2015+-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Storage: AWS S3](https://img.shields.io/badge/Storage-AWS%20S3%20Pre--Signed-FF9900?logo=amazons3&logoColor=white)](https://aws.amazon.com/s3/)
[![Tailwind CSS: v4](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

---

**KS-PMT** is an project and product management platform under development designed for **one company with multiple locations and branches**, supporting both **commercial software products** and **custom client development services**. It is deployed for the company's own use and is not a SaaS offering.

Built with a **NestJS REST API backend**, a modern **React 19 + Tailwind CSS web dashboard**, and a cross-platform **Flutter mobile app (Android & iOS)** with native capability development and device acceptance still in progress. See the status matrix below for implementation limits.

</div>

---

## 📑 Table of Contents

- [Architectural Overview](#-architectural-overview)
- [Feature Matrix & Implementation Status](#-feature-matrix--implementation-status)
- [Roadmap for Development Teams and Clients](#roadmap-for-development-teams-and-clients)
- [Documentation and Evidence](#documentation-and-evidence)
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
        (React 19 + Vite + Tailwind)                         (Flutter Android & iOS)
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

Documentation reconciled **2026-09-29**. These labels describe scope and evidence; this roadmap update does not implement or verify new application features.

| Status | Meaning |
| --- | --- |
| **Planned** | Required future delivery. |
| **Partial** | Some capability exists; material implementation remains. |
| **Implemented — acceptance pending** | Implementation evidence exists; required live/database/provider/device acceptance is still pending. |
| **Verified** | Only the named scope passed dated checks linked in the checklist/walkthroughs; never a blanket production certification. |

| Current capability | Status | Evidence and limits |
| --- | --- | --- |
| Branches, departments, designations, employees, dynamic roles and branch/user overrides | Implemented — acceptance pending | Management and selected authorization checks recorded in the requirements audit; exhaustive authorization acceptance remains open. |
| Password login, refresh/session tracking and remote revocation | Implemented — acceptance pending | Historical session tests exist; full security acceptance remains pending. Current password implementation uses bcrypt. |
| Mobile OTP login | Partial | Verification/mock flow exists; live SMS delivery, shared OTP state and distributed throttling remain pending. |
| Clients/prospects, products, licenses/AMC, projects, team allocations and release records | Implemented — acceptance pending | Core CRUD and field-persistence evidence exists; grouped reporting and new client workflows are separate roadmap work. |
| Dynamic task types/workflows, primary owner and collaborators, subtasks and auto-assignment | Implemented — acceptance pending | Core workflow evidence exists. The legacy ROUND_ROBIN strategy selects least-loaded eligible staff; it is not cyclic round-robin scheduling. |
| Focused task creation, inline editing, Markdown descriptions, typed custom values and revision conflicts | Implemented — acceptance pending | Builds, 46 backend tests and fixture browser checks recorded on 2026-09-28; new schema still requires developer/DBA blank-database and live-workflow acceptance. |
| Worklogs, billable/overtime/weekend classification and individual review | Implemented — acceptance pending | Per-worklog submit/reject/resubmit/approve evidence exists; grouped weeks and a durable global timer are planned. |
| Threaded comments, in-app events and notification preferences | Partial | Rich comment/S3 composition, live email/FCM and real-time transport remain pending. |
| S3 upload/download APIs and client flows | Implemented — acceptance pending | Last recorded real upload failed with InvalidAccessKeyId; successful upload/confirmation/download/avatar acceptance remains open. |
| Activity history and audit viewer | Partial | Selected task mutations/history exist; comprehensive authentication/change/download and metadata coverage remains pending. Tamper-evidence is not established. |
| Kanban, shared grid, task drawer/full-page view, command palette and light/dark web shell | Implemented — acceptance pending | Dated fixture/browser and build evidence exists. The grid loads all authorized pages into the browser; saved views, bulk operations and server-side scale work remain planned. |
| Dashboard and basic workload summaries | Partial | Task counts and labelled recent-sample metrics exist; full portfolio/financial/flow aggregates remain planned. |
| Flutter mobile source, secure token handling and five-tab navigation | Partial | Native builds/device acceptance, push/deep links, offline sync, field/geofencing flows and remaining parity are pending. |

MFA, password-policy completion, external API-key/OAuth provisioning, full authorization/security review and production/performance acceptance remain open in the [checklist](docs/tasks-checklist.md). The most recent task delivery does not establish full SRS completion.

## Roadmap for Development Teams and Clients

The primary journey is **request → clarification → approved scope → development → QA → client UAT → accepted delivery**. Product work also connects customer feedback to prioritization, releases and outcome reviews.

**Out of scope:** Git/source-control integrations, DevOps and CI/CD automation. Manual test evidence, release planning and client sign-off remain in scope. KS-PMT's deployment documentation describes operating this application.

All entries below are **Planned** expansions/completion work. Feature IDs link behavior in the [SRS](docs/requirements.md) to delivery gates in the [plan](docs/plan.md) and [checklist section 11](docs/tasks-checklist.md#11-accepted-roadmap-and-acceptance-gates-2026-09-29).

| Order | Focus | Planned outcomes |
| --- | --- | --- |
| **A** | Trustworthy foundation | Client boundaries, working calendars, baseline/event history, status evidence and release-specific provider acceptance. |
| **B** | Daily development planning | Backlog/sprints, basic blockers/dependencies, saved views and schedule-aware weekly timesheets. |
| **C** | Client delivery | Portal intake, agreed requirements, change approval, UAT/sign-off and client progress reports. |
| **D** | Product management and repeatable delivery | Discovery/voting, goals, QA checklists, knowledge, templates, notification preferences and retainers. |
| **E** | Delivery intelligence | Contractual SLA, flow metrics, capacity, effort/budget forecasts and explainable alerts. |
| **Later** | Advanced options | Scheduling scenarios/critical path and optional reviewed drafting assistance. |

### A. Trustworthy foundation

- **FND-001:** Invitation-based client access, explicit internal/client-shared/product-community audiences, configurable employee/contract calendars and reproducible baseline/event history. Complete required SMS/S3/email checks before dependent releases; native field capabilities do not block web/client value.

### B. Daily development planning

- **PLAN-001:** Ranked project/product backlogs; Initiative → Epic/Feature → Story/Task/Bug → Subtask; sprints independent of releases/milestones, goals, team ownership, optional points/sizing and retained commitment/rollover history. Kanban remains available.
- **PLAN-002:** Finish-to-Start and Blocks/Blocked by links, dependency cycle checks, blocker owners/reasons/actions and accurate elapsed episodes; reusable bug templates and resolution categories.
- **PLAN-003:** Personal/team saved views, favorites, inline cells and permission-aware bulk actions with conflict/partial-failure handling; server-side queries and exports for scale.
- **TIME-001:** Weekly entry, cross-project approval, audited amendments and reminders based on work schedules/leave. One persistent timer across tabs/devices; browser blur does not stop productive time. Monthly summaries/exports follow weekly acceptance; separate monthly approval is deferred.

### C. Client delivery

- **CLIENT-001 / CLIENT-002:** Invited customer contacts, explicit project access and private intake/triage. A product license never exposes all product tasks; submission promises neither price nor delivery date.
- **CLIENT-003:** Versioned requirements and acceptance criteria linked to tasks, QA evidence and client decisions.
- **CLIENT-004:** Scope/change quotations with effort, cost and delivery impact; authorized approval of a specific revision, with reapproval after material changes.
- **CLIENT-005:** UAT packages, known issues, evidence and Approve / Request changes / Reject decisions. Developer completion, QA verification and client acceptance stay separate.
- **CLIENT-006 / DEL-001:** PM-reviewed client progress reports, milestone forecasts, risks/assumptions/decisions and client actions awaiting response. Reports distinguish indicative targets from approved commitments.

### D. Product management and repeatable delivery

- **PROD-001:** Moderated product feedback and organization voting, duplicate merging, private impact evidence, impact/confidence/effort scoring and decision rationale. Authenticated customer roadmaps use Now / Next / Later with delivery/changelog links; votes and ACV are inputs, not promises.
- **PROD-002:** Product goals, baselines/targets and dated post-release outcome reviews.
- **QA-001:** Manual test cases/runs, affected/fix versions, evidence, known issues and release-readiness checklists; no CI/CD integration.
- **COLLAB-001 / COLLAB-002:** Versioned specifications/FAQs/decision documents, rich comments with S3 files, reusable project/task templates and recurring work without copying private access or approvals.
- **COLLAB-003:** Watchers/follows, channel preferences, digests, quiet hours and deduplicated delivery with authorization rechecked at dispatch.
- **COMM-001:** Retainer/AMC included hours, approved usage, remaining allowance, rollover and overage approval; historical terms and authorized client statements.

### E. Delivery intelligence

- **ANALYTICS-001:** Contract-defined response/resolution SLA, calendar/pause/reopen rules, rule-based deadline warnings, reason attribution and configurable escalation.
- **ANALYTICS-002:** Maximum WIP limits, stage dwell heatmaps, cumulative flow, lead/cycle distributions, rework and release-defect trends based on source events.
- **ANALYTICS-003:** Calendar-aware capacity and explainable skill suggestions; split co-assignee demand and contextual team trends. Automatic employee/branch leaderboards are deferred.
- **ANALYTICS-004:** Baseline effort variance, consumption alerts, independent remaining estimates, burn/forecast curves and currency-aware contribution/margin reporting. Missing estimates/zero denominators show N/A; internal costs and margins remain private.

### Later and deferred scope

- **LATER-001:** SS/FF dependencies, lag, critical path and scheduling scenario previews after calendar/estimate quality is established; composite health scores require transparent weights and calibration.
- **LATER-002:** Optional source-linked drafts of summaries/acceptance criteria with human review and approved data handling.
- Lower priority: native field/geofencing expansion and broad CRM/HR/payroll/accounting features. Internet-public roadmaps and a universal automation designer remain deferred.

## Documentation and Evidence

- [Requirements](docs/requirements.md): behavioral contract, stable feature IDs, client visibility rules, metric definitions and acceptance examples.
- [Implementation plan](docs/plan.md): dependencies, delivery order and acceptance gates.
- [Tasks checklist](docs/tasks-checklist.md): implementation status and outstanding verification; a checked item is not production certification.
- [Architecture](docs/tech-stack.md) and [user journeys](docs/walkthrough.md): current foundations and explicitly planned flows.
- [Latest task implementation evidence](docs/walkthrough/jira-style-task-create-edit-2026-09-28.md), [shared grid evidence](docs/walkthrough/shared-listing-grid.md) and [requirements audit](docs/walkthrough/requirements-screen-audit.md): dated checks and limits.
- [Roadmap review](docs/walkthrough/roadmap-review-and-market-recommendations-2026-09-28.md): rationale and official market references. Walkthroughs are historical records; current canonical requirements and checklist supersede older broad completion claims.

---

## 🛠 Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend Framework** | [NestJS 10](https://nestjs.com/) (Node.js 20+, TypeScript) |
| **Database** | [PostgreSQL 15+](https://www.postgresql.org/) (pgcrypto, PL/pgSQL functions & triggers) |
| **Database Access** | Native `pg.Pool` connection pooling (No ORM auto-migrations; strict SQL script compliance) |
| **Cloud Storage** | [AWS S3](https://aws.amazon.com/s3/) via `@aws-sdk/client-s3` & `@aws-sdk/s3-request-presigner` |
| **Security & Auth** | Dual login (Email+Password & Mobile+OTP), JWT, Passport, Helmet; shared throttling pending |
| **Web Frontend** | [React 19](https://react.dev/), [Vite](https://vitejs.dev/), [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/), Axios |
| **Mobile App** | [Flutter 3.x](https://flutter.dev/) (Dart), Dio with queued interceptors, Geolocator, ImagePicker, SecureStorage |
| **Testing** | [Jest](https://jestjs.io/), `ts-jest`; dated test scope and results in linked walkthroughs |

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
    └── walkthrough/                  # Dated implementation, review and roadmap reports
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
   PORT=5000
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
   The REST API will be accessible at `http://localhost:5000/api/v1`.
   Interactive Swagger documentation will be available at `http://localhost:5000/api/docs`.

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
| **OTP (development only)** | Request a generated code in explicitly configured mock mode | Live SMS delivery remains pending; no universal fixed code is promised |

---

## 💬 Community, Feedback & Support

This project is **100% open source** released under the [MIT License](https://opensource.org/licenses/MIT). We built **KS-PMT** with passion to help a software development or product company manage its projects across all its locations and branches, with full control over its deployment and data.

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
