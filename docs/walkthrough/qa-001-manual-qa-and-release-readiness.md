# Walkthrough: QA-001 Manual QA Test Cases, Test Runs & Release-Readiness Gatekeeper

**Feature Code**: `QA-001`  
**Implemented Date**: 2026-09-30  
**Status**: Completed & Verified  

---

## 1. Executive Summary

Feature `QA-001` delivers a production-grade Quality Assurance, Test Execution, Defect Tracing, and Release-Readiness Gatekeeper engine for KS-PMT (Kashvira Infotech - Project & Product Management Tool). It addresses the critical gap between sprint development completion and high-confidence production deployment by establishing:

1. **Structured Test Repository**: Scoped test suites and reusable test cases with step-by-step action/expected-result builders, severity/priority classifications, preconditions, and linkages to components and requirement acceptance criteria.
2. **Execution Console & Test Runs**: Target environment test runs (`LOCAL`, `QA`, `STAGING`, `UAT`, `PRODUCTION`) with real-time pass/fail progress bars, execution evidence capture (S3 URLs), and inline actual result logging.
3. **1-Click Defect Logger**: Instant logging of failed test run items into formal `BUG` tasks in the backlog, copying test steps, expected vs. actual behaviors, and maintaining direct two-way references between defects and test run executions.
4. **Release Readiness Gatekeeper & Signoff**: Multi-gate checklist engine evaluating 6 core criteria (`QA_TESTING`, `SECURITY`, `PERFORMANCE`, `DATA_MIGRATION`, `CLIENT_UAT`, `DOCUMENTATION`) with gate verification, waiver recording, and conditional or full release signoff workflows for Lead QA and Project Managers.
5. **Traceability & Defect Radar Matrix**: Complete audit mapping connecting Requirements / Acceptance Criteria → Test Cases → Execution Runs → Linked Defect Tasks.

---

## 2. Database Schema & Architecture (`dbscripts/`)

### A. New Canonical Tables (`dbscripts/tables/tables.sql`)
1. **`test_suites`**: Groups test cases under either a `PRODUCT` or `PROJECT` scope, with component linkages and standard audit columns (`created_by`, `created_at`, `updated_by`, `updated_at`, `is_active`).
2. **`test_cases`**: Test case definitions containing title, preconditions, structured `test_steps` (`JSONB` array of `{step_number, action, expected_result}`), expected result, severity, priority, execution type (`MANUAL` / `AUTOMATED`), estimated minutes, and links to `requirement_acceptance_criteria` and `software_components`.
3. **`test_runs`**: Execution runs scoped to product/project, target version, milestone, environment, and assigned QA engineer, tracking aggregate counters (`total_cases`, `passed_cases`, `failed_cases`, `blocked_cases`, `skipped_cases`).
4. **`test_run_items`**: Individual test execution records (`PENDING`, `PASSED`, `FAILED`, `BLOCKED`, `SKIPPED`), actual result notes, evidence URLs, execution timestamp, and `linked_defect_task_id`.
5. **`release_readiness_checklists`**: Release gatekeeper record scoped to version/milestone, overall status (`NOT_STARTED`, `IN_REVIEW`, `READY_FOR_RELEASE`, `BLOCKED`, `CONDITIONAL_RELEASE`), target release date, Lead QA user, PM signoff user, and signoff/exception notes.
6. **`release_checklist_items`**: Individual gate criteria categorized across `QA_TESTING`, `SECURITY`, `CLIENT_UAT`, `DOCUMENTATION`, `DATA_MIGRATION`, `PERFORMANCE` with mandatory flags, evidence notes, and waiver justifications.

### B. High-Performance Indexes (`dbscripts/indexes/indexes.sql`)
- Foreign key and query optimization indexes for `test_suites`, `test_cases`, `test_runs`, `test_run_items`, `release_readiness_checklists`, and `release_checklist_items`.

### C. Seed Data & RBAC Permissions (`dbscripts/inserts/inserts.sql`)
- **System Permissions**:
  - `TESTING:READ` - View test suites, cases, runs, and checklists.
  - `TESTING:MANAGE` - Create and manage test suites and test cases.
  - `TESTING:EXECUTE` - Execute test runs and verify release checklist items.
  - `TESTING:SIGNOFF` - Authorize release gatekeeper decisions.
- **Role Mappings**:
  - `ROLE_SUPER_ADMIN` & `ROLE_QA_TESTER`: Full testing permissions (`READ`, `MANAGE`, `EXECUTE`, `SIGNOFF`).
  - `ROLE_PROJECT_MANAGER`: `READ` & `SIGNOFF`.
  - `ROLE_DEVELOPER`: `READ`.
- **Demo Seed Data**:
  - 2 Test Suites (`SUITE-ERP-CORE` for KashFlow ERP and `SUITE-ACME-MOB` for Acme Neo-Bank).
  - 4 Test Cases (`TC-ERP-001`, `TC-ERP-002`, `TC-ERP-003`, `TC-ACME-001`) with multi-step validation procedures.
  - 1 Active Test Run (`TRUN-ERP-2026-01`) on `STAGING` environment.
  - 3 Test Run Execution Items (one `PASSED`, one `FAILED` linked to bug `TSK-ERP-005`, one `PENDING`).
  - 1 Release Readiness Checklist (`REL-GATE-ERP-2.4.0`) with 6 standard quality gates.

---

## 3. Backend Implementation (`server/`)

- **Module**: `server/src/modules/qa/qa.module.ts` registered in `server/src/app.module.ts`.
- **Service**: `server/src/modules/qa/qa.service.ts` implementing complete CRUD, run execution recalculation, 1-click defect generation into `tasks`, checklist gate verification, and traceability query.
- **Controller**: `server/src/modules/qa/qa.controller.ts` secured with `JwtAuthGuard` and `DynamicRbacGuard` enforcing granular permissions.
- **Endpoints**:
  - `POST /qa/suites` & `GET /qa/suites`
  - `POST /qa/cases` & `GET /qa/cases`
  - `POST /qa/runs` & `GET /qa/runs` & `GET /qa/runs/:id`
  - `PATCH /qa/run-items/:id/execute`
  - `POST /qa/run-items/:id/log-defect`
  - `POST /qa/release-checklists` & `GET /qa/release-checklists` & `GET /qa/release-checklists/:id`
  - `PATCH /qa/release-checklists/:id/items/:itemId`
  - `POST /qa/release-checklists/:id/signoff`
  - `GET /qa/traceability`

---

## 4. Frontend Workspace (`web/`)

- **Main Component**: `web/src/components/qa/QualityAssuranceWorkspace.tsx`
- **Features & Tabs**:
  - **Scope Filter**: Filter by Product or Project with instant metric recalculation.
  - **Tab 1: Test Repository & Suites**: Split-pane suite explorer with test case list, severity/priority tags, and dynamic multi-step test case builder modal.
  - **Tab 2: Test Runs Execution Console**: Test run cards with visual pass-rate progress bars, quick-execute buttons (Pass/Fail/Block/Skip), execution modal with evidence links, and **1-Click Defect Logger** popover creating formal backlog defects with live linkage.
  - **Tab 3: Release Readiness Gatekeeper**: Quality gates dashboard covering Security, Performance, UAT, QA, Data Migration, and Documentation with evidence recording, waiver dialogs, and PM/QA signoff modal.
  - **Tab 4: Traceability & Defect Radar Matrix**: End-to-end audit table linking acceptance criteria, test cases, execution runs, and defect tasks.
- **Navigation Integration**:
  - Registered route `/qa` in `web/src/App.tsx`.
  - Added "Quality Assurance & Gates" under *Client Delivery* in `web/src/components/layout/Sidebar.tsx`.

---

## 5. Verification & Testing

- `node dbscripts/build-install.mjs` executed cleanly, generating `dbscripts/install.sql`.
- `node --test dbscripts/build-install.test.mjs` passed 100% of tests.
- `server` compiled cleanly (`nest build` exited with code 0).
- `web` compiled cleanly (`tsc && vite build` exited with code 0).
