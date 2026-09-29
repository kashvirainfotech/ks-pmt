# CLIENT-006: Client Progress Updates & Reporting Walkthrough

**Date:** 2026-09-29  
**Status:** ✅ Complete & Verified (Backend & Web UI)  
**Author:** Lead Full-Stack Engineer (KS-PMT Team)  
**Requirement Reference:** [SRS §3.25](file:///c:/Projects/KashviraInfotech/ks-pmt/docs/requirements.md#L309-L314) & [Increment C Plan](file:///c:/Projects/KashviraInfotech/ks-pmt/docs/plan.md#L154)

---

## 1. Executive Summary

`CLIENT-006` introduces comprehensive **Client Progress Updates & Reporting** to KS-PMT, empowering Project Managers to prepare and publish curated, periodic (weekly/bi-weekly/monthly/ad-hoc) progress updates tailored for executive and project-level client stakeholders.

### Core Capabilities
1. **Curated Executive & Milestone Reporting**:
   - Executive progress narrative: highlights accomplished this period, key deliverables, upcoming focus, and client decisions needed.
   - High-level health indicator: `ON_TRACK`, `NEEDS_ATTENTION`, `AT_RISK` with explicit justification narrative.
   - Milestone schedule forecasts: tracking committed baseline completion date alongside PM indicative forecast date, preventing forecast shifts from overwriting contracted baseline commitments.
2. **Action Items & Decision Radar**:
   - Explicit client action items awaiting feedback/decision, with owner contact, priority (`HIGH`, `MEDIUM`, `LOW`), SLA target deadline date, and pending status.
3. **Transparent Sanitized Risk Log**:
   - Client-safe risk summaries, business impact narrative, mitigation plan, and risk severity (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), stripped of internal team finger-pointing or operational embarrassment.
4. **Controlled Commercial Transparency**:
   - Optional commercial summary (`include_commercials = true` flag) with contract value, billed to date, change request totals, and remaining retainer balance.
   - Commercial summaries are strictly restricted to designated client contacts with approval authority (`is_approver = true`); operational contacts cannot view financial summaries.
5. **Zero Confidentiality Leakage**:
   - `internal_notes` (private team deliberations, margin targets, developer discussions) are strictly redacted on the database and service layer before any payload reaches the client portal.
6. **Immutable Revision Audit Snapshotting**:
   - Publishing creates an immutable revision record (`client_progress_report_revisions`) capturing the exact markdown, forecasts, risks, and actions at the moment of publication. Subsequent edits generate new revision drafts.
7. **Plaintext / Markdown Digest Generation**:
   - 1-click generation of formatted Markdown/email digests formatted for Slack, MS Teams, or email broadcasts, with copy-to-clipboard functionality.

---

## 2. Database Schema Additions

Two canonical tables were appended to [`dbscripts/tables/tables.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/tables/tables.sql#L1530), with indexes in [`dbscripts/indexes/indexes.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/indexes/indexes.sql#L260), seed permissions in [`dbscripts/inserts/inserts.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/inserts/inserts.sql#L307), and execution manifest in [`dbscripts/install.psql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/install.psql). The installer bundle was regenerated using `node dbscripts/build-install.mjs` (0 SQL executed):

### Table 55: `client_progress_reports`
- `id` (UUID PK)
- `report_code` (VARCHAR(50) UNIQUE)
- `project_id`, `product_id` (UUID FKs)
- `report_period` (VARCHAR(20) - `WEEKLY`, `BI_WEEKLY`, `MONTHLY`, `MILESTONE`, `AD_HOC`)
- `period_start_date`, `period_end_date` (DATE)
- `title` (VARCHAR(255) NOT NULL)
- `overall_health` (VARCHAR(30) - `ON_TRACK`, `NEEDS_ATTENTION`, `AT_RISK`)
- `health_summary` (TEXT)
- `executive_summary` (TEXT)
- `key_accomplishments` (TEXT)
- `next_period_priorities` (TEXT)
- `blockers_and_risks` (JSONB) - Sanitized client-safe risks
- `action_items_needed_from_client` (JSONB) - Actions/decisions required from client with SLA deadline
- `milestone_forecasts` (JSONB) - Committed vs indicative forecast dates
- `include_commercials` (BOOLEAN DEFAULT FALSE)
- `commercial_summary` (JSONB) - Financial summary for client approvers
- `internal_notes` (TEXT) - Strictly redacted from client portal
- `target_audience` (VARCHAR(30) - `CLIENT_ALL`, `CLIENT_APPROVERS_ONLY`, `INTERNAL_ONLY`)
- `status` (VARCHAR(30) - `DRAFT`, `UNDER_REVIEW`, `PUBLISHED`, `ARCHIVED`)
- `current_revision` (INT DEFAULT 1)
- `published_at` (TIMESTAMPTZ), `published_by_user_id` (UUID FK)
- Standard audit columns (`created_by`, `created_at`, `updated_by`, `updated_at`, `is_active`)

### Table 56: `client_progress_report_revisions`
- `id` (UUID PK), `report_id` (UUID FK)
- `revision_number` (INT NOT NULL)
- `overall_health`, `health_summary`, `executive_summary` (TEXT)
- `key_accomplishments`, `next_period_priorities` (TEXT)
- `blockers_and_risks`, `action_items_needed_from_client`, `milestone_forecasts`, `commercial_summary` (JSONB)
- `change_summary` (TEXT)
- `published_by_user_id` (UUID FK), `published_at` (TIMESTAMPTZ)
- Standard audit columns (`created_by`, `created_at`, `updated_by`, `updated_at`, `is_active`)

---

## 3. Backend Architecture & Zero-Leakage API

- **DTOs** ([`server/src/modules/client-reports/dto/`](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/modules/client-reports/dto/)):
  - `create-client-report.dto.ts`: Validates report period, dates, health enum, milestone forecasts, client actions, and commercial summary.
  - `update-client-report.dto.ts`: Partial update DTO.
  - `publish-client-report.dto.ts`: Change summary and audience scope confirmation.
  - `query-client-reports.dto.ts`: Filtering by project, product, health, status, and date range.
- **Service** ([`ClientReportsService`](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/modules/client-reports/client-reports.service.ts)):
  - Report code sequence generator (`REP-YYYYMM-XXXX`).
  - Report drafting, editing, review submission, and archival.
  - Snapshot publishing creating immutable `client_progress_report_revisions` records.
  - Markdown digest generator formatting report data into email/Slack-ready copy.
  - Customer Portal Zero-Leakage Query Methods:
    - Verifies client contact authorization against project/product assignment.
    - Excludes non-published reports (`status = 'PUBLISHED'`).
    - Respects `target_audience`: hides approver-only reports from non-approver contacts; completely blocks `INTERNAL_ONLY` reports.
    - **Guaranteed Redaction**: Deletes `internal_notes` from results.
    - **Commercials Redaction**: Strips `commercial_summary` unless `include_commercials = true` AND `contact.is_approver = true`.
- **Controller & Endpoints**:
  - Internal endpoints ([`ClientReportsController`](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/modules/client-reports/client-reports.controller.ts)):
    - `POST /client-reports`: Create draft
    - `GET /client-reports`: List with filtering
    - `GET /client-reports/:id`: Get full details (including internal notes)
    - `PUT /client-reports/:id`: Update draft
    - `POST /client-reports/:id/submit-review`: Submit for review
    - `POST /client-reports/:id/publish`: Publish with revision snapshot
    - `POST /client-reports/:id/archive`: Archive report
    - `GET /client-reports/:id/digest`: Generate markdown digest
  - Customer Portal endpoints ([`ClientPortalController`](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/modules/client-portal/client-portal.controller.ts#L525)):
    - `GET /client-portal/progress-reports`: List published reports for client's projects
    - `GET /client-portal/progress-reports/:id`: View sanitized report details
    - `GET /client-portal/progress-reports/:id/digest`: Generate client-safe digest
- **Test Suite**:
  - [`client-reports.service.spec.ts`](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/modules/client-reports/client-reports.service.spec.ts): **11/11 tests passed**, covering creation, publication, revision snapshots, internal note redaction, and commercial permission checks.

---

## 4. Frontend Implementation

1. **Internal PM Management Workspace** ([`ClientReportsView.tsx`](file:///c:/Projects/KashviraInfotech/ks-pmt/web/src/components/client-reports/ClientReportsView.tsx)):
   - **KPI Metric Strip**: Total Reports, Published, Under Review, Drafts, and At-Risk Project Counter.
   - **Report Editor & Builder**:
     - Reporting period, dates, project/product selectors.
     - Health radio with color-coded badges (`ON_TRACK` 🟢, `NEEDS_ATTENTION` 🟡, `AT_RISK` 🔴).
     - Rich narrative fields for Executive Summary, Accomplishments, and Upcoming Priorities.
     - Milestone Schedule Forecast table: Committed Date vs Indicative Forecast Date with variance highlighting.
     - Client Action Items Builder: Owner, priority, and SLA target date.
     - Sanitized Risk Builder: Summary, business impact, and mitigation plan.
     - Commercial Summary Builder with toggle flag.
     - Private Internal Notes editor (prominently labeled with confidential warning banner).
   - **Publish Modal**: Allows specifying change summary and target audience (`CLIENT_ALL`, `CLIENT_APPROVERS_ONLY`, `INTERNAL_ONLY`).
   - **Digest Modal**: Instant Markdown preview with 1-click copy to clipboard for emails or Slack updates.
   - **Revision History Drawer**: Compare previous published revisions and audit timestamps.
2. **Customer Portal Workspace Integration** ([`CustomerPortalWorkspace.tsx`](file:///c:/Projects/KashviraInfotech/ks-pmt/web/src/components/clients/CustomerPortalWorkspace.tsx)):
   - Added **Progress Reports** tab with badge counter.
   - Clean client view displaying overall project health, executive summary, delivered work, upcoming priorities, client actions needed with deadlines, and milestone forecasts.
   - Zero internal notes or private developer discussions displayed.
   - Commercial section displayed only to verified approvers when authorized by the PM.
   - Client-safe copyable digest for corporate client distribution.
3. **Navigation & Routes**:
   - Added `/client-reports` to [`web/src/App.tsx`](file:///c:/Projects/KashviraInfotech/ks-pmt/web/src/App.tsx#L90).
   - Added `Progress Reports` navigation item with `FileText` icon under `Client Delivery` in [`web/src/components/layout/Sidebar.tsx`](file:///c:/Projects/KashviraInfotech/ks-pmt/web/src/components/layout/Sidebar.tsx#L67).

---

## 5. Verification & Quality Assurance

- **Backend Unit Tests**: Ran full test suite across the backend:
  ```bash
  Test Suites: 24 passed, 24 total
  Tests:       188 passed, 188 total
  Snapshots:   0 total
  Time:        23.315 s
  ```
- **Web Frontend Compilation**: Ran production build:
  ```bash
  npm run build
  ✓ 2154 modules transformed.
  ✓ built in 1.47s (0 errors)
  ```
- **Blank Database Script Compilation**:
  - `node dbscripts/build-install.mjs` executed cleanly, updating `install.sql` without executing any SQL on the database instance.
- **Tasks Checklist**: Marked `[x] **CLIENT-006**` in [`docs/tasks-checklist.md`](file:///c:/Projects/KashviraInfotech/ks-pmt/docs/tasks-checklist.md#L368).
- **Roadmap & Documentation**: Updated [`README.md`](file:///c:/Projects/KashviraInfotech/ks-pmt/README.md#L154).
