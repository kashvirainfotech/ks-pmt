# Technology Stack & Architecture Specification

## KS-PMT: Multi-Branch Project & Product Management System

---

## 1. System Architectural Overview

Updated: 2026-09-29 (IST). KS-PMT uses a **modular monolith** for one company with branch-level access and planned client/project sharing boundaries. This document separates current implementation from target architecture; the [checklist](tasks-checklist.md) records evidence. [Requirements](requirements.md) define the accepted feature behavior and [the plan](plan.md) orders delivery. Performance and availability are targets, not measured guarantees.

Current foundations: NestJS 10, native pg pool, React 19/Vite 8/Tailwind 4 (per package manifests), custom web components, React contexts, Axios and TanStack Table. Flutter source exists; native-device acceptance remains pending. Redis, email/FCM dispatch and WebSocket/SSE delivery are target capabilities, not established current infrastructure. The diagram includes target infrastructure.

```
                              +---------------------------------------+
                              |        Client Tier Interfaces         |
                              +---------------------------------------+
                                  |                               |
                   +--------------+--------------+                |
                   |                             |                |
         +-------------------+         +-------------------+      |
         | Modern Web App    |         | Cross-Platform    |      |
         | (React + TS +     |         | Mobile Apps       |      |
         |  Tailwind/Shadcn) |         | (Flutter iOS/And) |      |
         +-------------------+         +-------------------+      |
                   |                             |                |
                   +--------------+--------------+                |
                                  | HTTPS / WSS                   |
                                  v                               |
                   +-----------------------------+                |
                   |   API Gateway / Reverse     |                |
                   |       Proxy (Nginx)         |                |
                   +-----------------------------+                |
                                  |                               |
                                  v                               |
                   +-----------------------------+                | Direct S3 Upload
                   |    REST API Backend Core    |                | via Pre-signed URL
                   | (Node.js / NestJS + TS)     |                |
                   +-----------------------------+                |
                    |       |              |                      |
      +-------------+       |              +-------------+        |
      |                     |                            |        |
      v                     v                            v        v
+------------+       +-------------+             +-------------------+
| PostgreSQL |       | Redis Cache |             | AWS S3 Object St. |
| Database   |       | & Pub/Sub   |             | (Docs, Images,    |
| (Relational|       | (Session/   |             |  Attachments)     |
| Data Store)|       |  Rate-Limit)|             +-------------------+
+------------+       +-------------+
```

---

## 2. Technology Stack Selection & Rationales

### 2.1 Backend REST API Framework

- **Primary Framework**: **Node.js with NestJS (TypeScript)**
- **Rationale**:
  - Enterprise-grade modular structure out of the box (Controllers, Providers, Services, Modules).
  - First-class TypeScript support with compile-time type safety.
  - Built-in Dependency Injection (DI) enabling clean separation between business logic, data access, and transport layers.
  - Native integration with `class-validator` and `class-transformer` for robust DTO payload validation.
  - Automated Swagger / OpenAPI 3.0 generation via decorators (`@ApiProperty()`, `@ApiOperation()`).
  - Native Guards and Interceptors for dynamic RBAC permission evaluation and request audit logging.

### 2.2 Database Management System

- **Database**: **PostgreSQL 15+** (documented installer baseline; target-version acceptance remains required)
- **Rationale**:
  - ACID-compliant transactional guarantees for financial amounts (contract values, billable charges) and time tracking.
  - Rich JSONB support for flexible metadata, permission override structures, and audit trail diffs.
  - Superior indexing capabilities (B-tree, GIN for JSONB and text search, BRIN for timeseries audit logs).
  - Strong stored procedure and trigger engine supporting automated timestamps and integrity constraints.
- **Database Management & Script Policy**:
  - All database objects are managed via raw SQL scripts inside the `dbscripts/` directory:
    - Tables: `dbscripts/tables/tables.sql`
    - Development schema changes: edit canonical `CREATE` definitions for blank-database installs; incremental migrations begin after go-live.
    - Installer: `dbscripts/install.psql`; pgAdmin bundle generated with `node dbscripts/build-install.mjs`.
    - Views: Individual files in `dbscripts/views/`
    - Functions: Individual files in `dbscripts/functions/`
    - Procedures: Individual files in `dbscripts/procedures/`
    - Triggers: Individual files in `dbscripts/triggers/`
    - Indexes: `dbscripts/indexes/indexes.sql`
    - Inserts: `dbscripts/inserts/inserts.sql`
  - Zero auto-execution by AI tools; manual review and run by human developer.
  - Application data access layer uses a type-safe query builder / database client (e.g., Kysely, Knex, or pg driver) matching the raw SQL schema.

### 2.3 Cloud Storage Service

- **Provider**: **Amazon Web Services (AWS) Simple Storage Service (S3)**
- **Upload Pattern**: **Pre-Signed URLs (Direct Client-to-S3 Upload)**
- **Rationale**:
  - Eliminates server memory and network bandwidth bottlenecks by allowing Web and Mobile clients to upload large attachments directly to S3.
  - Secure, time-limited presigned PUT/GET URLs generated by the backend API.
  - Automated lifecycle policies for archival, and AWS CloudFront CDN integration for fast global asset delivery.

### 2.4 Web Application Frontend

- **Framework**: **React 19 with Vite 8 (TypeScript)**
- **Styling**: **Tailwind CSS 4 and custom components**; adopting Shadcn is optional, not a roadmap dependency
- **State & Data Fetching**:
  - **Current**: Axios API modules and React state/contexts for authentication, theme and screen data. TanStack Table supplies shared grid processing.
  - **Optional future choices**: TanStack Query/Zustand are not current dependencies and are not required for the accepted roadmap.
  - **Scale**: Current listings fetch all authorized pages for browser processing. PLAN-003 must coordinate server-side filters/sort/grouping/pagination/export; paginating alone must not make sort/group/export operate on an incomplete result.
- **Design System & Trends**:
  - Modern, responsive, clean aesthetic conforming to 2026 enterprise standards:
    - Clean typography (Inter / Geist font).
    - Bento-grid layouts for executive and branch dashboards.
    - Floating action bars, responsive sliding drawers, and command palette (`Ctrl + K`).
    - Full mobile responsiveness (collapsible sidebar navigation, swipeable drawers, bottom action sheets).
    - Accessible Dark / Light mode toggling.

### 2.5 Mobile Applications (Android & iOS)

- **Framework**: **Flutter (Dart 3.x)**
- **Target capabilities; not device-verified**:
  - High-performance, native 60fps/120fps compiled code for both iOS and Android from a single shared codebase.
  - Consistent UI rendering across all screen sizes and manufacturer variations.
  - Mature hardware abstraction packages:
    - **Camera & Media**: `image_picker`, `camera`, `file_picker` for photo capture, document scanning, and local image compression before upload.
    - **Geolocation**: `geolocator` and `permission_handler` for GPS coordinate tagging and branch geofencing.
    - **Push Notifications**: `firebase_messaging` and `flutter_local_notifications` for background and foreground task updates.
    - **Offline Storage**: `drift` (SQLite) or `hive_ce` for task caching and offline time logs.

### 2.6 Authentication & Security Architecture

- **Dual Authentication**:
  - **Email + Password**: Current implementation uses bcrypt; do not infer Argon2 adoption or a uniform cost factor across historical seed hashes. Hash-policy changes require implementation and acceptance.
  - **Mobile + OTP**: Current generated codes use process-local state and mock dispatch. Target: shared Redis state, rate limits and configured live SMS provider with verified expiry/resend/attempt behavior. There is no universal fixed development OTP.
- **Session Tokens**:
  - JWT access/refresh tokens with tracked sessions and revocation. Current web tokens use localStorage; the intended HTTP-only-cookie design is a pending architecture/implementation reconciliation, not an implemented claim. Mobile uses secure storage. Expiry is configuration-controlled.
- **Security Hardening**:
  - Shared/distributed rate limiting is pending; local OTP limits are not proof of distributed protection.
  - HTTP headers security via Helmet.
  - Strict CORS policy restricting origins to approved web domains.

### 2.7 Target Real-Time & Notification Infrastructure

Current in-app persistence/preferences and polling do not establish email, FCM or real-time transport delivery. Basic provider acceptance precedes dependent client features; COLLAB-003 adds preference/digest behavior. Use durable delivery records, idempotent event keys and authorization checks at dispatch; retries must not leak content after revocation.

- **Mobile Push**: **Firebase Cloud Messaging (FCM)** for APNs (iOS) and Android push delivery.
- **Web Real-Time**: **WebSockets (Socket.io) or Server-Sent Events (SSE)** for instant in-app task status changes, badge counter updates, and comment alerts.
- **Transactional Email**: **AWS Simple Email Service (SES)** or SendGrid with responsive HTML email templates for task assignments and SLA notifications.

---

## 3. Directory Structure Specification

```
ks-pmt/
|-- .agent/
|   `-- rules/
|       `-- agent-rules.md
|-- AGENTS.md
|-- GEMINI.md
|-- docs/
|   |-- requirements.md
|   |-- tech-stack.md
|   |-- plan.md
|   |-- tasks-checklist.md
|   `-- walkthrough.md
|-- dbscripts/
|   |-- install.psql          # Ordered psql installer
|   |-- build-install.mjs     # Generate ignored install.sql for pgAdmin
|   |-- tables/
|   |   `-- tables.sql
|   |-- views/
|   |-- sequences/
|   |-- functions/
|   |-- procedures/
|   |-- triggers/
|   |-- indexes/
|   |   `-- indexes.sql
|   `-- inserts/
|       `-- inserts.sql
|-- server/                  # Backend REST API (NestJS + TypeScript)
|   |-- src/
|   |   |-- common/          # Filters, Guards, Interceptors, Decorators, Utils
|   |   |-- config/          # Environment and AWS S3 configuration
|   |   |-- database/        # DB connection provider; manual canonical SQL installation
|   |   |-- modules/
|   |   |   |-- auth/        # Dual Login (Email/Password, Mobile/OTP), Tokens
|   |   |   |-- branches/    # Branch & Location Master
|   |   |   |-- departments/ # Department Master
|   |   |   |-- designations/# Designation Master & Hierarchy
|   |   |   |-- users/       # Employee records, Profiles, Avatars
|   |   |   |-- rbac/        # Roles, Permissions, Branch/User Overrides
|   |   |   |-- clients/     # Prospects & Clients Management
|   |   |   |-- products/    # Product Master, Pricing, Client Licenses
|   |   |   |-- projects/    # Project Master, Budgets, Team Allocations
|   |   |   |-- versions/    # Product/Project releases; sprints planned separately
|   |   |   |-- task-types/  # Dynamic Task Type & Workflow definitions
|   |   |   |-- tasks/       # Task Core, Sub-tasks, Assignments, Dates
|   |   |   |-- time-logs/   # Worklogs, Timesheets, Effort Tracking
|   |   |   |-- comments/    # Threaded Discussions & Attachments
|   |   |   |-- attachments/ # AWS S3 Presigned URL Generator & File Metadata
|   |   |   |-- assignment/  # Auto-assignment Engine & Routing Rules
|   |   |   |-- notifications# In-App, Push (FCM), Email (SES)
|   |   |   `-- audit-logs/  # Central Activity & Change Tracking
|   |   |-- app.module.ts
|   |   `-- main.ts
|   |-- package.json
|   `-- tsconfig.json
|-- web/                     # Web Application (React + Vite + Tailwind)
|   |-- src/
|   |   |-- assets/
|   |   |-- components/      # UI Library (Buttons, Modals, Bento Cards, Tables)
|   |   |-- hooks/           # Custom React hooks (useAuth, useTasks, etc.)
|   |   |-- layouts/         # App Layout with Responsive Sidebar & Navbar
|   |   |-- pages/           # Dashboard, Tasks, Projects, Products, Clients, etc.
|   |   |-- services/        # Axios API Client & S3 Direct Uploader
|   |   |-- store/           # Zustand state slices
|   |   `-- App.tsx
|   |-- package.json
|   `-- tailwind.config.js
|-- mobile/                  # Mobile Application (Flutter Cross-Platform)
|   |-- lib/
|   |   |-- core/            # Theme, Constants, Network Client, S3 Uploader
|   |   |-- features/
|   |   |   |-- auth/        # Login (Email/Password, Mobile/OTP)
|   |   |   |-- tasks/       # Task List, Detail, Subtasks, Status Progression
|   |   |   |-- camera/      # Photo Capture & S3 Attachment Upload
|   |   |   |-- location/    # GPS Location Access & Branch Verification
|   |   |   |-- timelog/     # Mobile Timesheet & Start/Stop Timer
|   |   |   `-- notifications# Push Notification Receiver & Handler
|   |   `-- main.dart
|   |-- pubspec.yaml
|   `-- android/ & ios/
`-- docker-compose.yml       # Local Dev Environment (Postgres, Redis, Mock S3/Localstack)
```

---

## 4. Standard REST API Conventions

- **Base URL**: `/api/v1`
- **Response Structure (Envelope)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Resource retrieved successfully",
    "data": {},
    "meta": {
      "page": 1,
      "limit": 20,
      "total_count": 154,
      "total_pages": 8
    },
    "timestamp": "2026-09-25T13:00:00.000Z"
  }
  ```
- **Error Structure**:
  ```json
  {
    "success": false,
    "statusCode": 400,
    "error": "Bad Request",
    "message": [
      "planned_end_date must be greater than planned_start_date"
    ],
    "timestamp": "2026-09-25T13:00:00.000Z"
  }
  ```


## 5. Planned Domain and Access Architecture

These boundaries support feature IDs in the SRS. They describe design obligations, not tables/APIs already implemented. New SQL remains in canonical CREATE definitions under dbscripts with universal audit columns and master active flags; agents never execute it.

| Domain | Planned relationships and rules |
| --- | --- |
| Client identity (CLIENT-001) | Separate client contact membership, explicit project access, product-community entitlement and action grants. Client administrator is not an employee administrator. Derive scope from the authenticated actor and server-side memberships. |
| Audiences (CLIENT-001, PROD-001) | Internal-only is the default. Client-shared records require explicit audience; product-community ideas require moderation/publication. Product licensing does not grant all-product-task access. Response DTOs allowlist client-visible fields. |
| Intake and delivery (CLIENT-002) | Private client requests link to internal tasks/defects. Many requests can link to one fix; source conversations/files remain separately authorized. Related-record counts/search/export/history must honor the same boundaries. |
| Planning (PLAN-001, PLAN-002) | Initiative/epic/task/subtask hierarchy is independent of sprint/release/milestone links. Preserve sprint-membership changes, initial commitment and baseline dates. Scheduling/blocking links are distinct from ordinary related-item links; cycle guards apply only to directed dependencies. |
| Agreements (CLIENT-003–005) | Version requirements, change requests and UAT packages; decisions point to an exact revision and authorized approver. Material edits produce new approval requirements. A new client-visible forecast does not alter the contractual baseline. |
| Product discovery (PROD-001/002) | Private evidence links to published ideas, scoring decisions, goals and delivery. Enforce one vote per client/idea atomically. Merge with deduplication and history, without propagating private attachments or identities. |
| Calendars/events (FND-001, ANALYTICS-001–004) | Effective-dated employee/contract calendars, baselines, status transitions and blocker episodes provide reproducible source data. Derived duration/flow reports can be rebuilt. Snapshot contract/rate/calendar versions needed for historic calculations. |
| Time and commercial usage (TIME-001, COMM-001) | One durable active timer per user; approval states/reviewer portions protect periods and worklogs. Count approved entitlement consumption once, including retries/amendments. Keep actual effort separate from approved billable usage. |
| Documents and delivery (COLLAB-001–003) | Versioned content and published summaries retain audiences. Binary files stay in S3. Template copies exclude memberships/approvals/private references; recurring occurrences and notification delivery use idempotent identities. |

Membership/scope checks precede field/action permissions. Internal user/branch override precedence does not let a client role escape its client/project boundary. Apply authorization to lists, details, lookup choices, counts, aggregate reports, exports, task history, notification previews, attachments and download signing. Client-facing comments cannot automatically include internal quoted text.

Presigned uploads require ownership/scope validation; confirmed attachments and downloads inherit the parent audience. Revocation prevents issuing new download URLs, while existing presigned URLs retain bounded expiry. Do not promise instantaneous revocation of an already issued bearer URL.

A transaction must couple material state changes with revision checks, audit history and durable delivery intent where notifications are required. Dispatch retries deduplicate and recheck current authorization. Bulk operations return per-item outcomes without bypassing workflow or commercial approval checks.

## 6. Roadmap Acceptance Architecture

- Maintain reusable authorization, calendar and event foundations before exposing client flows or aggregate metrics. Stable IDs connect API, web, applicable mobile and acceptance evidence.
- Validate cross-client denial using two organizations licensed to the same product and multiple project memberships. Cover secondary surfaces and revoked contacts, not just direct-record routes.
- Validate stale approval revisions, concurrent votes, merge deduplication, repeated notification/recurrence delivery and duplicate timesheet approval.
- Validate metric fixtures covering holidays/absence, reopened/cancelled work, split co-assignee estimates, changed baselines, unknown estimates, overlapping blockers, historic rates and separate currencies.
- Manual test-case management is a product feature; automated source-control, DevOps and CI/CD integrations remain excluded. Application implementation can still use ordinary local tests.
- Current pagination adapters may accept legacy envelopes; the canonical published contract uses page, limit, total_count and total_pages. Existing callers need compatibility verification when implementations are standardized.
