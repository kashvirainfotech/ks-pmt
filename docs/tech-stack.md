# Technology Stack & Architecture Specification
## KS-PMT: Multi-Branch Project & Product Management System

---

## 1. System Architectural Overview

KS-PMT is architected following the **Clean Architecture / Modular Monolith** paradigm, optimized for high throughput, robust security, multi-tenant branch partitioning, and zero-latency cross-platform synchronization between Web and Mobile clients.

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
- **Database**: **PostgreSQL 16+**
- **Rationale**:
  - ACID-compliant transactional guarantees for financial amounts (contract values, billable charges) and time tracking.
  - Rich JSONB support for flexible metadata, permission override structures, and audit trail diffs.
  - Superior indexing capabilities (B-tree, GIN for JSONB and text search, BRIN for timeseries audit logs).
  - Strong stored procedure and trigger engine supporting automated timestamps and integrity constraints.
- **Database Management & Script Policy**:
  - All database objects are managed via raw SQL scripts inside the `dbscripts/` directory:
    - Tables: `dbscripts/tables/tables.sql`
    - Alters: `dbscripts/tables/alter_tables.sql`
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
- **Framework**: **React 18+ with Vite (TypeScript)**
- **Styling**: **Tailwind CSS + Shadcn UI (Radix UI Primitives)**
- **State & Data Fetching**:
  - **Server State**: TanStack Query (React Query) for automatic caching, background refetching, and optimistic updates.
  - **Client State**: Zustand for lightweight authentication and UI preference state.
- **Design System & Trends**:
  - Modern, responsive, clean aesthetic conforming to 2026 enterprise standards:
    - Clean typography (Inter / Geist font).
    - Bento-grid layouts for executive and branch dashboards.
    - Floating action bars, responsive sliding drawers, and command palette (`Ctrl + K`).
    - Full mobile responsiveness (collapsible sidebar navigation, swipeable drawers, bottom action sheets).
    - Accessible Dark / Light mode toggling.

### 2.5 Mobile Applications (Android & iOS)
- **Framework**: **Flutter (Dart 3.x)**
- **Rationale**:
  - High-performance, native 60fps/120fps compiled code for both iOS and Android from a single shared codebase.
  - Consistent UI rendering across all screen sizes and manufacturer variations.
  - Mature hardware abstraction packages:
    - **Camera & Media**: `image_picker`, `camera`, `file_picker` for photo capture, document scanning, and local image compression before upload.
    - **Geolocation**: `geolocator` and `permission_handler` for GPS coordinate tagging and branch geofencing.
    - **Push Notifications**: `firebase_messaging` and `flutter_local_notifications` for background and foreground task updates.
    - **Offline Storage**: `drift` (SQLite) or `hive_ce` for task caching and offline time logs.

### 2.6 Authentication & Security Architecture
- **Dual Authentication**:
  - **Email + Password**: Hashed using Argon2id or Bcrypt with cost factor 12.
  - **Mobile + OTP**: 6-digit numeric OTP generated via cryptographically secure pseudo-random number generator (CSPRNG), stored in Redis with 5-minute TTL, transmitted via SMS Gateway (Twilio, AWS SNS, or MSG91).
- **Session Tokens**:
  - Stateless JSON Web Tokens (JWT): Short-lived Access Token (15 mins) + Long-lived Refresh Token (7 days) stored securely (HTTP-only cookies on Web, Secure Storage / KeyChain on Mobile).
- **Security Hardening**:
  - Rate Limiting via `express-rate-limit` / Redis.
  - HTTP headers security via Helmet.
  - Strict CORS policy restricting origins to approved web domains.

### 2.7 Real-Time & Notification Infrastructure
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
|   |-- tables/
|   |   |-- tables.sql
|   |   `-- alter_tables.sql
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
|   |   |-- database/        # DB Connection provider & migrations interface
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
|   |   |   |-- versions/    # Product/Project Releases & Sprints
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
      "totalRecords": 154,
      "totalPages": 8
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
