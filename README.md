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
- [Key Features](#-key-features)
  - [1. Multi-Branch & Dynamic RBAC Engine](#1-multi-branch--dynamic-rbac-engine)
  - [2. Dual Authentication & Zero Public Registration](#2-dual-authentication--zero-public-registration)
  - [3. Dynamic Task Engine & State Machine Workflows](#3-dynamic-task-engine--state-machine-workflows)
  - [4. Auto-Assignment Rule Matrix](#4-auto-assignment-rule-matrix)
  - [5. Financial & Commercial Tracking](#5-financial--commercial-tracking)
  - [6. Cloud Storage (AWS S3 Direct Uploads)](#6-cloud-storage-aws-s3-direct-uploads)
  - [7. Time Tracking & Worklogs](#7-time-tracking--worklogs)
  - [8. Central Tamper-Evident Audit Trail](#8-central-tamper-evident-audit-trail)
  - [9. Responsive Web Application (`web/`)](#9-responsive-web-application-web)
  - [10. Cross-Platform Mobile Application (`mobile/`)](#10-cross-platform-mobile-application-mobile)
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

## ✨ Key Features

### 1. Multi-Branch & Dynamic RBAC Engine
- **Multi-Location Hubs**: Native support for a single company operating across multiple physical branches and regional tech centers with GPS coordinates and geofence radii.
- **Hierarchical Access Model**: 
  $$\text{Effective Permissions} = \text{Base Role} - \text{Branch Revocations} + \text{User Explicit Overrides}$$
- **Granular Override Controls**: Instantly grant or revoke permissions at the specific branch or individual employee level without modifying global system roles.
- **Super Admin Bypass**: Built-in system override for top-level corporate administrators.

### 2. Dual Authentication & Zero Public Registration
- **Strict Corporate Security**: Open public registration is disabled; employee accounts are strictly provisioned by authorized administrators.
- **Dual Login Methods**:
  1. Corporate Email & Password (with bcrypt hashing, 12 rounds).
  2. Registered Mobile Number & 6-Digit OTP (with auto-expiring tokens and resend countdown timers).
- **Session Protection**: Stateless JWT access tokens + rotating refresh tokens with automatic client-side silent renewal.

### 3. Dynamic Task Engine & State Machine Workflows
- **Dynamic Task Types**: Configure customized task types (e.g., *Feature, Bug Fix, Code Review, Security Patch, AMC Support*) with individual color codes and default billing flags.
- **Workflow State Machine**: Strictly enforces allowed status transitions (e.g., `OPEN` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `CODE_REVIEW` $\rightarrow$ `READY_FOR_TEST` $\rightarrow$ `CLOSED`). Prohibits illegal state skipping.
- **Subtasks & Hierarchical Checklists**: Create child subtasks with individual completion states and assignees.
- **Multi-Assignee Support**: Assign primary owners alongside secondary collaborators.

### 4. Auto-Assignment Rule Matrix
- **Configurable Event Triggers**: Evaluate routing rules automatically `ON_CREATION` or `ON_STATUS_CHANGE`.
- **Intelligent Assignment Strategies**:
  - `DEPARTMENT_HOD`: Automatically routes tasks to the department head (e.g., route completed dev tasks to the QA HOD).
  - `ROUND_ROBIN`: Dynamically assigns tasks to the least-loaded active team member in the department.
  - `DESIGNATION_HIERARCHY`: Routes to specific designation seniority tiers.
  - `SPECIFIC_USER`: Directly routes to designated specialists.

### 5. Financial & Commercial Tracking
- **Dual Business Models**: Supports both **Client Development Projects** (Fixed Price, Time & Materials, Retainers) and **In-House Software Products**.
- **Software Product Licensing**: Manages standard licensing fees, annual maintenance contract (AMC) dates, and client subscription renewals.
- **Task-Level Chargeables**: Toggle individual tasks as chargeable/billable with custom financial amounts, auto-rolled up into project financial summaries.
- **Milestones & Versions**: Release roadmaps linked to product semantic versions and sprint deadlines.

### 6. Cloud Storage (AWS S3 Direct Uploads)
- **Direct-to-S3 Pre-Signed URLs**: The client requests a secure pre-signed PUT URL from the server and uploads binary files (photos, documents, logs, zip archives) directly to Amazon S3.
- **Zero Server Memory Bottlenecks**: Prevents server RAM exhaustion and eliminates proxy bandwidth overhead.
- **Private & Time-Limited Downloads**: All files remain private in S3; downloads are generated via expiring pre-signed GET URLs.

### 7. Time Tracking & Worklogs
- **Live Interactive Timer**: Built-in stopwatch timer on web and mobile with start, pause, and elapsed counters.
- **Manual Worklog Submission**: Log daily effort with hours, minutes, billable classification, and descriptions.
- **Manager Approval Pipeline**: Timesheet review screen for department managers to audit and approve team hours.

### 8. Central Tamper-Evident Audit Trail
- **Comprehensive Activity Logging**: Tracks user authentication, task status shifts, financial changes, and file uploads.
- **Before / After JSON Snapshots**: Automatically stores `old_values` and `new_values` JSONB diffs.
- **Forensic Metadata**: Captures IP address, user agent, client device platform (`WEB`, `ANDROID`, `IOS`), and GPS coordinates.

### 9. Responsive Web Application (`web/`)
- Built with **React 18**, **Vite**, **Tailwind CSS**, and **Lucide Icons**.
- **Interactive Kanban Board**: Dynamic status columns with quick status movement.
- **Filterable Table View**: Multi-column sorting, priority filters, and branch filters.
- **Comprehensive Task Drawer**: Slide-over drawer with subtasks, live timer, AWS S3 upload progress bar, and threaded comments.
- **Command Palette (`Ctrl+K`)**: Instant debounced search across all tasks, projects, and clients.
- **Bento-Grid Dashboard**: Executive metrics for active tasks, billable rupee values, sprint velocity, and branch status.
- **Light & Dark Mode**: Persistent theme toggle.

### 10. Cross-Platform Mobile Application (`mobile/`)
- Built with **Flutter (Dart)** for **Android** and **iOS**.
- **GPS Location Check-in & Geofencing**: High-accuracy positioning calculating real-time distance from the branch coordinates.
- **Camera & Photo Gallery S3 Uploader**: Snap photos or attach documents with direct progress streaming to AWS S3.
- **Mobile Effort Tracker**: Live timer widget with quick worklog logging.
- **5-Tab Navigation**: Dashboard, Tasks, Timesheets, Alerts, and Profile.

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
