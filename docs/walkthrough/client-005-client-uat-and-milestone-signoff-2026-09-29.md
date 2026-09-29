# CLIENT-005: Client UAT & Milestone Sign-Off Walkthrough

**Date:** 2026-09-29  
**Status:** ✅ Complete & Verified (Backend & Web UI)  
**Author:** Lead Full-Stack Engineer (KS-PMT Team)  
**Requirement Reference:** [SRS §3.24](file:///c:/Projects/KashviraInfotech/ks-pmt/docs/requirements.md#L302-L308) & [Increment C Plan](file:///c:/Projects/KashviraInfotech/ks-pmt/docs/plan.md#L62-L68)

---

## 1. Executive Summary

`CLIENT-005` establishes formal **Client Acceptance & Milestone Sign-Off (UAT)** for KS-PMT, bridging internal software delivery and customer milestone sign-off. It provides:
1. **Versioned Acceptance Packages (`uat_packages`, `uat_package_revisions`)**:
   - Scope linkage to project/product, release version, and milestone.
   - Target test environment URL, build number / commit hash, and testing credentials/instructions.
   - Transparent known issues disclosure and release notes highlights.
2. **Independent Tri-State Verification**:
   - Tracks `Developer-Done` &rarr; `QA-Verified` &rarr; `Client-Accepted` independently on each checklist item.
   - Client test verification (`PASSED`, `FAILED`, `BLOCKED`, `WAIVED`) with optional defect notes. Failed tests link directly to defect tasks.
3. **Attributable Client Approver Sign-Off**:
   - Only designated client contacts with approval authority (`is_approver = TRUE` or `can_approve_uat = TRUE`) can submit package-level decisions (`APPROVE`, `REQUEST_CHANGES`, `REJECT`).
   - Audit trail capturing approver contact name, email, company, and decision timestamp.
4. **Material Re-Approval Guarantee ($N+1$)**:
   - Material changes (checklist modifications, new scope, environment changes) require publishing revision $N+1$.
   - A revised package cannot inherit an obsolete sign-off; past revisions preserve their decision history immutably.
5. **Client-Installed Version Registry (`client_installed_versions`)**:
   - Explicitly records which version is deployed and accepted across client environments (`STAGING`, `UAT`, `PRODUCTION`, `ON_PREMISE`).
   - Releasing a product version never automatically marks it as installed for a client.
6. **Zero Confidentiality Leakage**:
   - Internal QA notes, blocker deliberations, and developer discussions are strictly excluded from client portal views.

---

## 2. Database Schema Additions

Four canonical tables were appended to [`dbscripts/tables/tables.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/tables/tables.sql#L1418), with indexes in [`dbscripts/indexes/indexes.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/indexes/indexes.sql#L240), seed permissions in [`dbscripts/inserts/inserts.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/inserts/inserts.sql#L305), and execution manifest in [`dbscripts/install.psql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/install.psql). The pgAdmin installer bundle was regenerated via `node dbscripts/build-install.mjs` without direct database execution:

### Table 51: `uat_packages`
Root container for client milestone acceptance.
- `id` (UUID PK)
- `package_code` (VARCHAR(50) UNIQUE)
- `project_id`, `product_id`, `version_id`, `milestone_id` (FKs)
- `title`, `description`
- `environment_url`, `build_number`, `test_credentials_instructions`
- `current_revision` (INT DEFAULT 1)
- `status` (`DRAFT`, `INTERNAL_QA`, `READY_FOR_CLIENT`, `ACCEPTED`, `CHANGES_REQUESTED`, `REJECTED`, `SUPERSEDED`)
- `target_signoff_date` (DATE)
- `prepared_by_user_id`, `qa_lead_user_id` (FKs)
- Standard audit columns (`created_by`, `created_at`, `updated_by`, `updated_at`, `is_active`)

### Table 52: `uat_package_revisions`
Versioned release candidate state with client sign-off audit.
- `id` (UUID PK), `package_id` (FK)
- `revision_number` (INT NOT NULL)
- `revision_notes` (TEXT)
- `status` (`DRAFT`, `INTERNAL_QA`, `READY_FOR_CLIENT`, `ACCEPTED`, `CHANGES_REQUESTED`, `REJECTED`, `SUPERSEDED`)
- `known_issues` (JSONB - transparent bug disclosure)
- `test_evidence_urls` (JSONB - attachments/recordings)
- `qa_approved_by`, `qa_approved_at`, `qa_notes` (Internal QA gate)
- `client_decision` (`APPROVED`, `CHANGES_REQUESTED`, `REJECTED`)
- `decided_by_contact_id`, `decided_at`, `client_signoff_remarks`
- `submitted_to_client_at` (TIMESTAMP)

### Table 53: `uat_checklist_items`
Detailed acceptance test scenarios with independent tri-state flags.
- `id` (UUID PK), `package_revision_id` (FK)
- `item_code` (VARCHAR(50)), `title`, `instructions`, `expected_outcome`
- `criterion_id` (FK to `requirement_acceptance_criteria`)
- `order_index` (INT)
- `developer_done` (BOOLEAN DEFAULT FALSE), `developer_done_at`
- `qa_verified` (BOOLEAN DEFAULT FALSE), `qa_verified_by`, `qa_verified_at`, `qa_evidence_notes`
- `client_status` (`PENDING`, `PASSED`, `FAILED`, `BLOCKED`, `WAIVED`)
- `client_feedback` (TEXT), `client_tested_by_contact_id`, `client_tested_at`
- `linked_defect_task_id` (FK to `tasks` when testing fails)

### Table 54: `client_installed_versions`
Audit registry of client-specific deployed and accepted versions.
- `id` (UUID PK)
- `client_id`, `product_id`, `project_id`, `version_id` (FKs)
- `environment_name` (`STAGING`, `UAT`, `PRODUCTION`, `ON_PREMISE`)
- `accepted_at`, `accepted_by_contact_id`
- `installed_at`, `installed_by_user_id`
- `uat_package_id` (FK)
- `notes` (TEXT), `is_current_active` (BOOLEAN DEFAULT TRUE)

---

## 3. Backend Implementation

1. **Module Structure**:
   - [`server/src/modules/uat-packages/`](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/modules/uat-packages/):
     - `uat-packages.service.ts`: Full lifecycle logic, tri-state tracking, QA review gate, $N+1$ revision management, client sign-off submission, client installed version registry, and customer-safe queries.
     - `uat-packages.controller.ts`: Internal REST endpoints guarded by JWT + Dynamic RBAC permissions (`UAT_PACKAGES:READ`, `UAT_PACKAGES:MANAGE`, `UAT_PACKAGES:APPROVE`).
     - `uat-packages.module.ts`: Exported for consumption in `AppModule` and `ClientPortalModule`.
     - `dto/`: Full validation pipeline (`create-uat-package.dto.ts`, `create-uat-revision.dto.ts`, `review-uat-revision.dto.ts`, `record-checklist-progress.dto.ts`, `client-uat-decision.dto.ts`, `record-installed-version.dto.ts`, `query-uat-packages.dto.ts`).
2. **Customer Portal Integration**:
   - In [`ClientPortalController`](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/modules/client-portal/client-portal.controller.ts#L450):
     - `GET /client-portal/uat-packages`: Returns published packages for client's permitted projects.
     - `GET /client-portal/uat-packages/:id`: Returns package detail with redacted internal QA notes.
     - `PATCH /client-portal/uat-packages/checklist-items/:itemId/test`: Client test verification (`PASSED` or `FAILED`).
     - `POST /client-portal/uat-packages/:id/revisions/:rev/decision`: Attributable client approver sign-off (`APPROVE` / `REQUEST_CHANGES` / `REJECT`).
3. **Automated Unit Tests**:
   - [`uat-packages.service.spec.ts`](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/modules/uat-packages/uat-packages.service.spec.ts): **23/23 test suites passing**, **177/177 unit tests passed**.

---

## 4. Frontend Web Implementation

1. **Internal Management View**:
   - [`UatPackagesView.tsx`](file:///c:/Projects/KashviraInfotech/ks-pmt/web/src/components/uat-packages/UatPackagesView.tsx):
     - Comprehensive master-detail workspace for Project Managers, Developers, and QA Engineers.
     - Overview statistics: Total Packages, Ready for Client, Client Accepted, Must-pass and client progress.
     - Package creation modal with project/product/milestone/version linkage and environment details.
     - Material revision modal ($N+1$) with cloned checklist items and revision justification.
     - Interactive checklist table showing `Dev Done` toggle, `QA Verified` toggle, and `Client Status` badge.
     - Internal QA Review modal to advance package from `INTERNAL_QA` to `READY_FOR_CLIENT`.
     - Client Installed Versions drawer recording deployments across environments.
2. **Customer Portal Workspace**:
   - [`CustomerPortalWorkspace.tsx`](file:///c:/Projects/KashviraInfotech/ks-pmt/web/src/components/clients/CustomerPortalWorkspace.tsx):
     - Added dedicated tab: **UAT & Milestone Acceptance**.
     - Shows all published packages for client's permitted projects.
     - Displays test environment URL, build/version, transparent disclosed known issues, and revision notes.
     - Interactive acceptance checklist where client testers mark items as `Passed` or `Failed` with feedback notes.
     - Authorized Approver Action Bar: "Sign-Off & Accept" and "Request Changes" with attributable justification modals.
     - Complete zero-leak guarantee (internal QA notes are never exposed).
3. **Navigation & Routing**:
   - [`App.tsx`](file:///c:/Projects/KashviraInfotech/ks-pmt/web/src/App.tsx#L87): Added `/uat-packages` route.
   - [`Sidebar.tsx`](file:///c:/Projects/KashviraInfotech/ks-pmt/web/src/components/layout/Sidebar.tsx#L65): Added `UAT & Milestones` navigation link under `Client Delivery`.
4. **Build Verification**:
   - Production Vite build (`npm run build`) succeeded with 0 errors.

---

## 5. Verification Matrix

| Acceptance Gate | Verification Result | Evidence |
|:---|:---:|:---|
| Canonical Schema & Manifest | Passed | Tables 51–54 created in `tables.sql`, bundle generated via `build-install.mjs` |
| Zero Direct DB Execution Rule | Passed | 0 SQL executed against database instance |
| Zero Git Push/Commit Rule | Passed | Clean working tree, changes uncommitted for developer review |
| Tri-State Checklist Tracking | Passed | `developer_done`, `qa_verified`, `client_status` verified in unit tests & UI |
| Material Re-Approval ($N+1$) | Passed | New revision resets client approval, prior decisions preserved in history |
| Client Approver Validation | Passed | Non-approver contacts blocked from submitting overall package decisions |
| Zero Confidentiality Leakage | Passed | `qa_notes` stripped from client portal endpoints |
| Client Installed Version Registry | Passed | Deployed versions explicitly audited without automatic assumptions |
| Backend Unit Tests | Passed | 23/23 suites passing, 177/177 unit tests passing |
| Frontend Web Build | Passed | `tsc && vite build` completed in 1.45s with 0 errors |

---

## 6. Next Recommended Steps

With `CLIENT-005` complete, the client delivery lifecycle now spans **Intake & Triage (`CLIENT-001/002`) &rarr; Requirements Traceability (`CLIENT-003`) &rarr; Change Request Quotations (`CLIENT-004`) &rarr; UAT & Milestone Sign-Off (`CLIENT-005`)**.

Recommended next items from Increment C:
- **`CLIENT-006: Client Progress Updates & Reporting`**: PM-reviewed client-safe progress summaries, milestone forecasts, client actions awaiting response, and committed vs indicative dates.
- **`DEL-001: Risks, Assumptions & Versioned Client Decisions`**: Project RAID log and structured decision register.
