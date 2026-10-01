# Walkthrough: Database Seed & Sample Data Separation

## 1. Overview & Objective

To enable clean blank-slate deployments for both production and test environments without cluttering the database with demonstration records, the monolithic seed data script has been separated into two distinct tiers:

1. **`dbscripts/inserts/inserts.sql` (Required Foundation & Master Setup Data)**:
   - Contains ONLY the foundational records required for the KS-PMT application to boot, authenticate, and function out-of-the-box.
   - Contains 0 dummy tasks, 0 sample projects, 0 dummy clients (except internal company), and 0 dummy employees.
2. **`dbscripts/inserts/sample_data.sql` (Enterprise Demonstration & Showcase Data)**:
   - Contains the comprehensive 210+ task enterprise showcase dataset across multiple branches, products, clients, projects, sprints, requirements, UAT packages, RAID logs, and QA test runs.

---

## 2. File Organization & Contents

### 2.1 `dbscripts/inserts/inserts.sql` (Required Setup Tier)
- **Root Admin User**:
  - Email: `admin@kashvirainfotech.com`
  - Password: `Admin@123456` (bcrypt hash)
  - Role: `ROLE_SUPER_ADMIN`
- **Head Office Branch**: `HO-AHM-01` (Ahmedabad Head Office)
- **Base Departments**:
  - `DEPT-ENG` (Software Engineering)
  - `DEPT-MOB` (Mobile App Development)
  - `DEPT-QA` (Quality Assurance & Testing)
  - `DEPT-SUP` (Client Support & Implementation)
  - `DEPT-OPS` (DevOps & Cloud Infrastructure)
- **Standard Designations**:
  - Principal Solution Architect, Tech Lead, Senior Software Engineer, Associate Software Engineer, Lead QA Engineer, Technical Support Executive, Senior Project/Product Manager, DevOps & Cloud Lead, QA Automation Specialist, Mobile Solutions Architect.
- **Master System Roles**:
  - `ROLE_SUPER_ADMIN`
  - `ROLE_BRANCH_MANAGER`
  - `ROLE_PROJECT_MANAGER`
  - `ROLE_DEVELOPER`
  - `ROLE_QA_TESTER`
  - `ROLE_SUPPORT_EXEC`
- **System-Wide Permissions Across All Modules**:
  - `TASKS` (CREATE, READ, UPDATE, DELETE, ASSIGN, STATUS_CHANGE)
  - `PROJECTS` (CREATE, READ, UPDATE, VIEW_FINANCIALS)
  - `PRODUCTS` (MANAGE)
  - `TIMELOGS` (LOG_OWN, APPROVE)
  - `USERS` (MANAGE), `BRANCHES` (MANAGE)
  - `AUDIT_LOGS` (VIEW), `NOTIFICATIONS` (MANAGE)
  - `CALENDARS` (READ, MANAGE), `LEAVES` (MANAGE)
  - `SPRINTS` (READ, MANAGE), `MILESTONES` (READ, MANAGE)
  - `DEPENDENCIES` (READ, MANAGE), `BLOCKERS` (READ, MANAGE)
  - `SAVED_VIEWS` (READ, MANAGE), `TIMESHEETS` (READ, SUBMIT, APPROVE)
  - `TEAMS` (READ, MANAGE), `COMPONENTS` (READ, MANAGE)
  - `HANDOFFS` (READ, CREATE, ACKNOWLEDGE, MANAGE)
  - `WORKFLOWS` (READ, MANAGE)
  - `CLIENT_PORTAL` (READ, MANAGE), `CLIENT_INTAKE` (READ, TRIAGE)
  - `REQUIREMENTS` (READ, MANAGE, SIGNOFF)
  - `CHANGE_REQUESTS` (READ, MANAGE, APPROVE)
  - `UAT_PACKAGES` (READ, MANAGE, APPROVE)
  - `CLIENT_REPORTS` (READ, MANAGE, PUBLISH)
  - `RAID` (READ, MANAGE), `CLIENT_ACTIONS` (MANAGE)
  - `PRODUCT_IDEAS` (READ, MANAGE, ROADMAP)
  - `TESTING` (READ, MANAGE, EXECUTE, SIGNOFF)
  - `KNOWLEDGE` (READ, MANAGE, PUBLISH, ARCHIVE)
- **Role-Permission Mappings**:
  - Comprehensive baseline permission assignments mapped for all 6 system roles.
- **Task Types & Statuses**:
  - Types: New Development, Bug, Technical Issue, Enhancement, Training, Support.
  - Statuses: Open, WIP, Code Review, Pending Test, Testing, Pending Deploy, Closed, Cancelled.
  - Default Workflow Scheme (`DEFAULT_SCHEME_V1`) and all allowed matrix transitions.
- **Default Corporate Calendar**:
  - `CAL-CORP-STD` (Mon-Fri 8h/day, Asia/Kolkata timezone) and standard public holidays.
- **Internal Company Client**: `CLI-INTERNAL` (`Kashvira Infotech (Internal)`).

---

### 2.2 `dbscripts/inserts/sample_data.sql` (Demo Showcase Tier)
- **2 Additional Branches**: Pune Development Center (`BR-PUN-02`), Bangalore Innovation Hub (`BR-BLR-03`).
- **12 Demo Employee Users**: Complete hierarchy with reporting managers, secondary branch grants, and user-level permission overrides.
- **4 Demo Clients & Contacts**: Acme FinTech, NexGen Logistics, Zenith Retail, HealthWave Care.
- **3 Demo Software Products**: KashCloud Enterprise ERP, LogiTrack Fleet, PayPulse Gateway.
- **Software Components & Architecture DAG**: Primary, downstream, and cross-product components.
- **Delivery Teams**: Squad allocations across projects.
- **5 Demo Projects**: Contract values, AMC, hourly rates, and component mappings.
- **Sprints, Milestones & Versions**: Live milestone schedules and sprint scopes.
- **210+ Delivery Tasks**: Hierarchical subtasks, assignees, components, and time estimates.
- **Worklogs, Timesheets, Comments & Handoffs**: Historical activity and approval logs.
- **Client Delivery Artefacts**: Intake tickets, requirement specs, CR revisions, UAT checklists, progress reports, RAID items.
- **Product Discovery & QA**: Ideas, votes, test suites, execution runs, release checklists.
- **Knowledge Documents**: Architecture Decision Records (ADRs), specifications, runbooks, revisions, links, and S3 attachment records.

---

## 3. How to Execute in Environments

### Option A: Clean Blank Setup (No Sample Data)
To initialize a fresh, production-ready or clean development database:
1. Run all DDL tables (`tables/tables.sql`), functions, triggers, views, and indexes (`indexes/indexes.sql`).
2. Run `inserts/inserts.sql`.
*(Or in `dbscripts/install.psql`, comment out `\ir inserts/sample_data.sql` before running)*.

### Option B: Full Showcase Installation (With Sample Data)
To spin up a full demo sandbox:
- In `psql`:
  ```bash
  psql -X -v ON_ERROR_STOP=1 -U postgres -d kspmt_db -f dbscripts/install.psql
  ```
- In pgAdmin Query Tool:
  - Generate the bundle: `node dbscripts/build-install.mjs`
  - Open and execute `dbscripts/install.sql`.

---

## 4. Verification Evidence

- Executed `node dbscripts/build-install.mjs`:
  - Generated `install.sql` from 15 object files.
- Executed `node --test dbscripts/build-install.test.mjs`:
  - All 2 tests passed with 0 failures:
    - `ok 1 - bundle includes all canonical SQL once, in manifest order, in one transaction`
    - `ok 2 - bundle rejects omitted, duplicate, missing, and escaping source files`
