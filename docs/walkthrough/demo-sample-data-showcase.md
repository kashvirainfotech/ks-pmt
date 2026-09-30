# Walkthrough: Comprehensive Enterprise Demo Data Showcase

## 1. Overview & Objective

To enable complete evaluation, client demos, and feature exploration of **KS-PMT (Kashvira Infotech - Project & Product Management Tool)** across web and mobile platforms, comprehensive demo data has been generated and integrated into [`dbscripts/inserts/inserts.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/inserts/inserts.sql).

All data adheres to PostgreSQL relational constraints, foreign keys, check constraints, audit columns (`created_by`, `created_at`, `updated_by`, `updated_at`), active flags (`is_active`), and dynamic workflow transition rules.

---

## 2. Authentication & User Personas

### 2.1 Preserved Super Administrator
- **Employee Code**: `EMP-0001`
- **Email**: `admin@kashvirainfotech.com`
- **Password**: `Admin@123456`
- **Role**: `ROLE_SUPER_ADMIN`
- **Branch**: Head Office - Ahmedabad
- *Note: Admin credentials and password hash remain completely unchanged as requested.*

### 2.2 Operational Employee Accounts (12 Personas)
All demo employee accounts have been provisioned with the bcrypt password hash for **`Admin@123456`** to make persona-switching and testing immediate and frictionless.

| Emp Code | Name | Email | Password | Role | Designation | Primary Branch |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **EMP-0001** | System Administrator | `admin@kashvirainfotech.com` | `Admin@123456` | Super Administrator | Principal Solution Architect | Ahmedabad (HQ) |
| **EMP-0002** | Rajesh Sharma | `rajesh.sharma@kashvirainfotech.com` | `Admin@123456` | Branch Manager | Senior Project Manager | Pune |
| **EMP-0003** | Priya Desai | `priya.desai@kashvirainfotech.com` | `Admin@123456` | Project Manager | Senior Project Manager | Ahmedabad (HQ) |
| **EMP-0004** | Vikram Malhotra | `vikram.malhotra@kashvirainfotech.com` | `Admin@123456` | Developer (Tech Lead) | Tech Lead | Bangalore |
| **EMP-0005** | Sneha Iyer | `sneha.iyer@kashvirainfotech.com` | `Admin@123456` | QA Tester | Lead QA Engineer | Ahmedabad (HQ) |
| **EMP-0006** | Amit Patel | `amit.patel@kashvirainfotech.com` | `Admin@123456` | Developer | Senior Software Engineer | Ahmedabad (HQ) |
| **EMP-0007** | Neha Joshi | `neha.joshi@kashvirainfotech.com` | `Admin@123456` | Developer | Associate Software Engineer | Pune |
| **EMP-0008** | Rahul Verma | `rahul.verma@kashvirainfotech.com` | `Admin@123456` | Developer | Senior Software Engineer | Pune |
| **EMP-0009** | Ananya Sen | `ananya.sen@kashvirainfotech.com` | `Admin@123456` | Developer (Mobile) | Mobile Solutions Architect | Bangalore |
| **EMP-0010** | Karan Mehta | `karan.mehta@kashvirainfotech.com` | `Admin@123456` | QA Tester | QA Automation Specialist | Bangalore |
| **EMP-0011** | Pooja Reddy | `pooja.reddy@kashvirainfotech.com` | `Admin@123456` | Support Executive | Technical Support Executive | Pune |
| **EMP-0012** | Suresh Nair | `suresh.nair@kashvirainfotech.com` | `Admin@123456` | Developer (DevOps) | DevOps & Cloud Lead | Ahmedabad (HQ) |
| **EMP-0013** | Kavita Shah | `kavita.shah@kashvirainfotech.com` | `Admin@123456` | Project Manager | Senior Project Manager | Ahmedabad (HQ) |

---

## 3. Organizational Structure & Access Governance

### 3.1 Branches / Locations (3 Branches)
1. **`HO-AHM-01`**: Head Office - Ahmedabad (Kashvira Tower, SG Highway, Prahlad Nagar, Ahmedabad, Gujarat)
2. **`BR-PUN-02`**: Development Center - Pune (Cyber City Magarpatta, Tower 7, Hadapsar, Pune, Maharashtra)
3. **`BR-BLR-03`**: Innovation Hub - Bangalore (Indiranagar 100ft Road, HAL 2nd Stage, Bangalore, Karnataka)

### 3.2 Dynamic Multi-Branch & Granular Overrides
- **Multi-Branch Access (`user_branches`)**:
  - Priya Desai (`EMP-0003`) has roaming management access across Ahmedabad, Pune, and Bangalore.
  - Vikram Malhotra (`EMP-0004`) has dual access across Bangalore and Pune.
  - Sneha Iyer (`EMP-0005`) has cross-branch QA oversight for Ahmedabad and Pune.
- **Permission Overrides (`user_permission_overrides`)**:
  - Vikram Malhotra is explicitly granted `COMPONENTS:MANAGE` and `WORKFLOWS:MANAGE` to configure architecture DAGs and transition gates.
- **Department Heads (`department_heads`)**:
  - Software Engineering: Vikram Malhotra
  - QA & Testing: Sneha Iyer
  - Client Support: Pooja Reddy
  - Mobile App Dev: Ananya Sen
  - DevOps & Cloud: Suresh Nair
- **Working Calendars & Shifts**:
  - All users assigned to `CAL-CORP-STD` (Standard Corporate 5-Day Calendar, 40 hrs/week, Asia/Kolkata timezone).

---

## 4. Software Products & Commercial Licencing

### 4.1 Products Master (3 Products)
1. **`PRD-ERP-CORE`**: **KashCloud Enterprise ERP**
   - Cloud-native ERP covering multi-currency general ledger, inventory aging, automated GST e-invoicing, and supply chain.
   - Category: `ENTERPRISE_ERP` | Version: `v3.2.0` | Base Price: ₹4,50,000 | AMC: 18% | PM: Kavita Shah
2. **`PRD-FLEET-LOGIX`**: **LogiTrack Fleet & Logistics Suite**
   - Real-time GPS telematics, AI dispatching, dynamic route optimization, cold-chain temperature monitoring, and driver mobile apps.
   - Category: `LOGISTICS_IOT` | Version: `v2.1.0` | Base Price: ₹3,20,000 | AMC: 18% | PM: Priya Desai
3. **`PRD-FIN-PAYGATE`**: **PayPulse Omni-channel Gateway**
   - High-throughput payment orchestration engine, bank recon switch, UPI intent processing, and merchant settlement escrow ledger.
   - Category: `FINTECH_PAYMENTS` | Version: `v1.4.0` | Base Price: ₹5,50,000 | AMC: 18% | PM: Priya Desai

### 4.2 Clients Master (5 Clients) & Product Licencing
| Client Code | Client Name | City / Branch | License Type | Product | AMC / Fee |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CLI-INTERNAL** | Kashvira Infotech (Internal) | Ahmedabad | Internal Operations | Internal Tools | N/A |
| **CLI-ACME** | Acme FinTech Solutions Ltd | Mumbai (Ahmedabad HQ) | `SAAS_SUBSCRIPTION` | PayPulse Gateway | ₹6,00,000 / yr |
| **CLI-NEXGEN** | NexGen Digital Logistics | Bangalore Hub | `ON_PREMISE_PERPETUAL` | LogiTrack Fleet Suite | ₹8,50,000 (AMC ₹1.53L) |
| **CLI-ZENITH** | Zenith Retail & E-Commerce | Pune DC | `ANNUAL_LEASE` | KashCloud ERP | ₹4,50,000 / yr |
| **CLI-HEALTH** | HealthWave Care Systems | Ahmedabad HQ | `SAAS_SUBSCRIPTION` | PayPulse Gateway | ₹3,50,000 / yr |

### 4.3 Client Portal Contacts (CLIENT-001)
- **Acme FinTech**: Robert Miller (`robert.client@acmefintech.com`, CTO, Approver)
- **NexGen Logistics**: Sarah Chen (`sarah.client@nexgenlogistics.com`, Product Director, Approver)
- **Zenith Retail**: David Wong (`david.client@zenithretail.com`, Head of Omnichannel, Approver)
- **HealthWave Care**: Dr. Meera Nambiar (`meera.client@healthwavecare.org`, CMO, Approver)
- *All client portal contacts configured with password `Admin@123456`.*

---

## 5. Projects & Delivery Squads

### 5.1 Projects Master (5 Projects)
1. **`PRJ-ACME-PAY`**: **Acme Neo-Bank Mobile Integration** (Fixed Cost: ₹12,50,000 | Budgeted: 800h | PM: Priya Desai)
2. **`PRJ-NEXGEN-RT`**: **NexGen Real-time Cold-Chain Tracking** (Time & Material: ₹1,800/h | Budgeted: 650h | PM: Priya Desai)
3. **`PRJ-ZENITH-OMNI`**: **Zenith Multi-Store Inventory & POS Rollout** (Fixed Cost: ₹18,00,000 | Budgeted: 1,100h | PM: Kavita Shah)
4. **`PRJ-HEALTH-EHR`**: **HealthWave Patient Portal & Telemedicine** (Fixed Cost: ₹14,00,000 | Budgeted: 900h | PM: Priya Desai)
5. **`PRJ-INT-AI-OPS`**: **Internal AIOps Monitoring & Task Dispatcher** (Retainer: ₹5,00,000 | Budgeted: 400h | PM: Vikram Malhotra)

### 5.2 Delivery Teams & Cross-functional Squads (PLAN-004)
- **`TEAM-PLATFORM`** (Core Platform & Architecture): Lead: Vikram Malhotra; Members: Suresh Nair, Rahul Verma, Sneha Iyer.
- **`TEAM-FINTECH`** (FinTech & Payment Solutions): Lead: Amit Patel; Members: Neha Joshi, Rahul Verma, Sneha Iyer.
- **`TEAM-LOGIX`** (Logistics, IoT & Mobile Squad): Lead: Ananya Sen; Members: Neha Joshi, Karan Mehta, Pooja Reddy.

---

## 6. Software Components & Architecture DAG (PLAN-004)

- `CMP-ERP-CORE` (General Ledger Engine) $\leftarrow$ `CMP-ERP-WEB` (ERP Frontend)
- `CMP-FLEET-TEL` (Telematics Processor) $\leftarrow$ `CMP-FLEET-APP` (Driver Mobile App)
- `CMP-PAY-SWITCH` (PayPulse Switch & Ledger) $\leftarrow$ `CMP-PAY-PORTAL` (Merchant Portal)
- `CMP-PAY-SWITCH` $\leftarrow$ `CMP-ACME-SDK` (Acme Banking Bridge SDK)
- `CMP-FLEET-TEL` $\leftarrow$ `CMP-NEX-COLD` (NexGen Cold-Chain Sensor Pipeline)
- `CMP-ERP-CORE` $\leftarrow$ `CMP-ZEN-POS` (Zenith Offline POS Desktop Bridge)

---

## 7. Tasks, Subtasks & Sprint Delivery (~210 Tasks)

Each product and project has been seeded with **35 dedicated tasks** (210 tasks total) exhibiting realistic distribution:
- **Task Types**: `NEW_DEV`, `BUG` (with structured JSON steps to reproduce, actual/expected behavior, environment), `ISSUE`, `ENHANCEMENT`, `TRAINING`, `SUPPORT`.
- **Hierarchies**: `EPIC`, `TASK`, `SUBTASK` with accurate `parent_task_id` bindings.
- **Statuses**: `OPEN`, `WIP`, `CODE_REVIEW`, `PENDING_TEST`, `TESTING`, `PENDING_DEPLOY`, `CLOSED`, `CANCELLED`.
- **Priorities**: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`.
- **Agile Estimations**: Story Points (1 to 21), T-Shirt Sizes (`XS`, `S`, `M`, `L`, `XL`), Estimated Hours (2 to 60h).
- **Date Spreads**: Realistic planned start and due dates spanning September, October, and November 2026.
- **Assignees & Sprints**: Primary assignees (`task_assignees`), sprint membership (`sprint_tasks`), and component links (`task_components`).
- **Dependencies (`task_dependencies`)**: `FINISH_TO_START` DAG links between prerequisite items.
- **Blockers (`task_blocker_episodes`)**: Active blockers showing reason, resolution plan, category (`THIRD_PARTY`, `ENVIRONMENT`), and priority.
- **Worklogs (`task_time_logs`)**: Effort logs recorded across closed and in-progress tasks.
- **Comments (`task_comments`)**: Collaboration notes between PMs, developers, and QA leads.

---

## 8. Enterprise Governance Modules Seeded

1. **Agile Sprints & Milestones (PLAN-001)**:
   - Sprints: `SPR-ERP-40`, `SPR-FLT-22`, `SPR-PAY-18`, `SPR-ACM-06`, `SPR-NEX-05`, `SPR-ZEN-08`.
   - Milestones: `MLS-ERP-Q3`, `MLS-FLEET-COLD`, `MLS-PAY-NPCI`, `MLS-ACME-BETA`, `MLS-NEX-PROBES`, `MLS-ZEN-STORES`.
2. **Weekly Timesheets (TIME-001)**:
   - Submitted and approved 40-hour weekly timesheets with cross-project portion approvals (`timesheet_project_portions`).
3. **Task Handoffs (FLOW-001)**:
   - Developer-to-QA and QA-to-Deployment handoffs with required context and status updates (`task_handoffs`).
4. **Client Intake Requests (CLIENT-002)**:
   - `REQ-ACME-2026-001` (Biometric Re-authentication on High-Value Wire Transfers) with client-internal message threads.
5. **Requirements & Acceptance Traceability (CLIENT-003)**:
   - `BRD-ACME-AUTH-01` baselined requirement specification with acceptance criteria `AC-01` linked directly to delivery tasks.
6. **Change Requests (CLIENT-004)**:
   - `CR-ACME-001` approved change request with revision pricing (₹36,000 / 24 hours).
7. **UAT Packages & Checklists (CLIENT-005)**:
   - `UAT-ACME-OCT-01` (v1.0.0-rc1) with interactive checklist items passed by QA and awaiting client signoff.
8. **RAID Register & Client Actions (DEL-001)**:
   - `RSK-PAY-001` (NPCI Sandbox Downtime Risk, score 15, with mitigation plan).
   - `ACT-ACME-001` (Action Request published to client for Certificate Authority keys).
9. **Product Ideas & Community Voting (PROD-001)**:
   - `IDEA-PAY-001` (WhatsApp Embedded Conversational Payment Flow, RICE score 39,375) with client votes from Acme, Zenith, and HealthWave.
10. **Saved Views (PLAN-003)**:
    - Global Kanban and List views pre-configured for sprint execution and defect triage.

---

## 9. Verification & Build Manifest

1. **Manifest File**: [`dbscripts/install.psql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/install.psql)
2. **Single Cumulative Seed File**: [`dbscripts/inserts/inserts.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/inserts/inserts.sql)
3. **Generated pgAdmin Bundle**: [`dbscripts/install.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/install.sql)
4. **Bundle Generation Command**:
   ```bash
   node dbscripts/build-install.mjs
   ```
5. **Bundle Test Verification**:
   ```bash
   node --test dbscripts/build-install.test.mjs
   ```
   *Result: 2/2 tests passed (order preserved, single transaction, deterministic).*
6. **Schema Validation Verification**:
   - Every `INSERT INTO <table> (<columns>)` statement was programmatically validated against canonical `CREATE TABLE` definitions in [`dbscripts/tables/tables.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/tables/tables.sql).
   - Resolved column naming in `task_comments` to `is_internal_only` matching table definition.
   - Enforced valid `hierarchy_level` enum values (`'EPIC'`, `'TASK'`, `'SUBTASK'`) across all task records complying with `tasks_hierarchy_level_check`.
   - Result: 0 errors across 77 tables and 210+ records.

---

## 10. Developer / DBA Execution Guide

As strictly mandated by project governance rules, database scripts are static artifacts and have **not** been executed directly against any live database instance.

### Step A: Reset or Recreate the Database (pgAdmin)
Use the dedicated helper script [`dbscripts/recreate_database.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/recreate_database.sql):
- **Option 1 (Full Drop & Recreate)**: In pgAdmin, connect to the default `postgres` database, open Query Tool, and run `dbscripts/recreate_database.sql`. This terminates active sessions and creates a fresh `kspmt` database.
- **Option 2 (Schema Reset while connected to `kspmt`)**: If you already have Query Tool open directly on `kspmt`, run:
  ```sql
  DROP SCHEMA IF EXISTS public CASCADE;
  CREATE SCHEMA public;
  GRANT ALL ON SCHEMA public TO postgres;
  GRANT ALL ON SCHEMA public TO public;
  ```

### Step B: Install Schema and Demo Data
1. In pgAdmin, open Query Tool on the fresh/blank `kspmt` database.
2. Open [`dbscripts/install.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/install.sql) and press **F5** (or run `\i dbscripts/install.psql` in psql).
3. Start backend services (`start.bat`) and log in as Super Admin (`admin@kashvirainfotech.com` / `Admin@123456`) or any of the 12 employee personas to showcase all features.
