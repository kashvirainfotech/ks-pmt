# Walkthrough: CLIENT-004 Scope & Change-Request Approval

**Date**: 2026-09-29  
**Feature**: `CLIENT-004: Scope & Change-Request Approval`  
**Engineer Standard**: Senior Full-Stack Developer (8–10 Years Experience)  
**Lifecycle Phase**: Under Development (Blank-Database Canonical DDL Standard)

---

## 1. Executive Summary & Business Objective

In enterprise IT client contracts and proprietary software delivery, out-of-scope work requested by clients must never be performed without formal commercial and scope agreement. At the same time, informal changes must not leak uncommitted dates, unauthorized revisions, or internal margin discussions to client stakeholders.

`CLIENT-004: Scope & Change-Request Approval` introduces a formal commercial quotation and scope governance pipeline:
1. **Commercial & Scope Quotations**: Accountable Project Managers (PMs) formulate change requests specifying effort (hours), commercial price and currency, schedule delay impacts (+days or revised target delivery dates), business justification, and structured deliverables.
2. **Immutable Material Revision Engine ($N+1$)**: Any modification to proposed scope, deliverables, pricing, or timelines creates a new revision ($N+1$) and requires fresh client approval. Prior revisions remain preserved for audit traceability, and an approval granted on Revision 3 can never approve Revision 4.
3. **Authorized Client Approver Governance**: Client approvers are verified against `client_contacts.is_approver = TRUE` or project-scoped `client_contact_projects.can_approve_scope = TRUE`. Attributable decision timestamps and remarks are recorded for legal and delivery certainty.
4. **Zero-Leakage Confidentiality**: Internal reviewer notes, PM feasibility discussions, and cost margins are strictly confidential and stripped from customer-facing API responses.
5. **Approved Task Linkage**: Approved change requests link to delivery tasks in `tasks` with explicit `is_scope_addition` flags, preventing scope creep and enabling exact budget consumption tracking.

---

## 2. Database Schema Architecture

Per our development policy, canonical `CREATE TABLE` definitions and indexes were appended with datetime comment headers:

### Table 48: `change_requests`
Maintains the master change request container, linked project/product scope, accountable PM, current revision pointer, and status:
- `id` (UUID PK)
- `cr_number` (VARCHAR(50) UNIQUE, e.g. `CR-1001`)
- `project_id` / `product_id` (Exclusive scope container with CHECK constraint)
- `originating_intake_request_id` (Link to CLIENT-002 intake request)
- `requirement_id` (Optional link to CLIENT-003 requirement)
- `title`, `description`, `business_justification`, `impact_summary`
- `accountable_pm_user_id` (Accountable PM user in `users`)
- `current_revision` (Integer, defaults to 1)
- `status` (`DRAFT`, `INTERNAL_REVIEW`, `AWAITING_CLIENT`, `APPROVED`, `CHANGES_REQUESTED`, `REJECTED`, `DEFERRED`, `WITHDRAWN`)
- `linked_milestone_id` (Target milestone link)
- Standard audit columns: `is_active`, `created_by`, `created_at`, `updated_by`, `updated_at`.

### Table 49: `change_request_revisions`
Maintains individual commercial quotations and scope versions:
- `id` (UUID PK)
- `change_request_id` (FK `change_requests.id` ON DELETE CASCADE)
- `revision_number` (Integer > 0)
- `scope_description` (TEXT)
- `deliverables` (JSONB array of `{ title, description, targetDate }`)
- `estimated_hours` (NUMERIC(10,2) >= 0)
- `quoted_price` (NUMERIC(15,2) >= 0)
- `currency` (VARCHAR(10) default `'INR'`)
- `schedule_delay_days` (INTEGER default 0)
- `revised_delivery_date` (DATE)
- `revision_reason` (TEXT explanation for material revision)
- `status` (`DRAFT`, `INTERNAL_REVIEW`, `AWAITING_CLIENT`, `APPROVED`, `CHANGES_REQUESTED`, `REJECTED`, `SUPERSEDED`)
- `submitted_by_user_id`, `submitted_at`
- `internal_reviewed_by`, `internal_reviewed_at`, `internal_review_notes` (Strictly confidential)
- `client_decision` (`APPROVED`, `CHANGES_REQUESTED`, `REJECTED`)
- `decided_by_contact_id` (FK `client_contacts.id`)
- `decided_at` (TIMESTAMP WITH TIME ZONE)
- `client_remarks` (TEXT)
- Unique constraint: `uq_cr_revision (change_request_id, revision_number)`.

### Table 50: `change_request_tasks`
Maps approved change requests to execution delivery tasks:
- `id` (UUID PK)
- `change_request_id` (FK `change_requests.id` ON DELETE CASCADE)
- `task_id` (FK `tasks.id` ON DELETE CASCADE)
- `is_scope_addition` (BOOLEAN default TRUE)
- `notes` (TEXT)
- Unique constraint: `uq_cr_task (change_request_id, task_id)`.

### Security & Seed Permissions
Seeded in `dbscripts/inserts/inserts.sql`:
- `CHANGE_REQUESTS:READ`
- `CHANGE_REQUESTS:MANAGE`
- `CHANGE_REQUESTS:APPROVE`
Granted to `ROLE_SUPER_ADMIN`, `ROLE_PROJECT_MANAGER`, and `ROLE_SUPPORT_EXEC`.

---

## 3. Backend Architecture (`server/`)

### DTOs (`server/src/modules/change-requests/dto/`)
- `create-change-request.dto.ts`: Validates project/product XOR, PM ID, title, justification, initial scope description, price, hours, delay days, and deliverables.
- `create-revision.dto.ts`: Captures material revision fields ($N+1$), required `revisionReason`, and optional `submitForInternalReview` flag.
- `review-revision.dto.ts`: Captures PM review outcome (`AWAITING_CLIENT` or `CHANGES_REQUESTED`) and internal review notes.
- `client-decision.dto.ts`: Captures client approver decision (`APPROVED`, `CHANGES_REQUESTED`, `REJECTED`) and remarks.
- `link-cr-tasks.dto.ts`: Validates task ID UUIDs and `isScopeAddition` flag.
- `query-change-requests.dto.ts`: Supports filtering by project, product, status, search, and pagination.

### Service (`ChangeRequestsService`)
- `createChangeRequest`: Runs within a transaction to initialize the CR header and Revision 1 in `DRAFT` status.
- `submitForInternalReview`: Validates current revision is `DRAFT` or `CHANGES_REQUESTED` and transitions to `INTERNAL_REVIEW`.
- `reviewRevision`: Checks PM authority, saves confidential internal review notes, and either publishes to client (`AWAITING_CLIENT`) or sends back for delivery adjustments (`CHANGES_REQUESTED`).
- `createMaterialRevision`: Increments revision count ($N+1$), supersedes previous pending revision, archives prior decision records, and establishes a fresh re-approval requirement.
- `recordClientDecision`: Verifies that decisions are strictly recorded against the **active current revision**, validates client contact scope approval authority, records attributable contact ID and timestamp, updates CR status, and transitions linked intake requests to `IN_DELIVERY` upon approval.
- `linkDeliveryTasks`: Enforces that only `APPROVED` change requests can be associated with delivery tasks, validating project boundary integrity.
- `getClientPortalChangeRequests` & `getClientPortalChangeRequestDetail`: Filters change requests to authorized client projects/products, filters out unreleased internal drafts, and **strictly redacts internal PM review notes**.

### Controllers & Modules
- Registered `ChangeRequestsController` with `@UseGuards(JwtAuthGuard, DynamicRbacGuard)` and `@Permissions(...)`.
- Exported `ChangeRequestsService` from `ChangeRequestsModule` and imported into `AppModule` and `ClientPortalModule`.
- Added customer-safe endpoints to `ClientPortalController`:
  - `GET /client-portal/change-requests`
  - `GET /client-portal/change-requests/:id`
  - `POST /client-portal/change-requests/:id/revisions/:rev/decision`

---

## 4. Frontend Implementation (`web/`)

### 1. Types & API Client
- Added `ChangeRequest`, `ChangeRequestRevision`, `ChangeRequestTask`, `ChangeRequestDeliverable` to `web/src/types/index.ts`.
- Implemented `changeRequestsApi` in `web/src/api/endpoints.ts` with complete CRUD, lifecycle, review, revision, and task linkage methods.
- Added `getChangeRequests`, `getChangeRequestDetail`, and `submitChangeRequestDecision` to `clientPortalApi`.

### 2. Internal Management Interface (`ChangeRequestsView.tsx`)
- **KPI Summary Cards**: Real-time stats on Total CRs, Pending Client Decision, Approved Proposals, and Total Approved Value (₹).
- **Listing & Search**: Faceted filtering by Project, Status, and full-text search.
- **Slide-Over Detail Drawer**:
  - Detailed overview with PM, container, justification, and impact summary.
  - **Lifecycle Action Bar**: Dynamic action buttons (`Submit for PM Review`, `Complete PM Review`, `Record Client Decision`, `Propose Material Revision`, `Link Delivery Tasks`).
  - **Revision History Timeline**: Visual timeline cards showing active current revision vs historical superseded revisions, with deliverables checklist and decision audit stamps.
  - **Linked Delivery Tasks**: Task code badges, assignees, hours, and scope addition chips with unlinking support.
- **Interactive Modals**:
  - New Change Request Modal (with commercial fields & deliverables builder).
  - Material Revision Proposal Modal ($N+1$).
  - Confidential PM Review Modal.
  - Client Decision Recording Modal.
  - Delivery Task Linking Modal.

### 3. Customer Portal Integration (`CustomerPortalWorkspace.tsx`)
- Added **"Change Requests & Quotations"** tab to the client workspace.
- Permitted project isolation ensures clients only see their own quotations.
- Customer-safe view displays active revision scope, deliverables checklist, quoted price, and schedule delay (+days / target date).
- Authorized client approvers (`is_approver = true` or `can_approve_scope = true`) can directly click **"Approve Quotation"** or **"Request Changes"** with mandatory remarks.
- Revision history allows clients to inspect what changed from prior proposals without ever seeing internal PM notes.

### 4. Navigation
- Added route `/change-requests` in `App.tsx`.
- Added **"Change Requests & Scope"** (`DollarSign` icon) under the `Client Delivery` section in `Sidebar.tsx`.

---

## 5. Verification & Acceptance Results

### Unit Test Suite
Ran backend unit test suite via Jest:
```bash
PASS src/modules/change-requests/change-requests.service.spec.ts (17.154 s)
  ChangeRequestsService (CLIENT-004)
    createChangeRequest
      ✓ should throw BadRequestException if both project and product are missing
      ✓ should throw BadRequestException if both project and product are provided
      ✓ should throw NotFoundException if accountable PM does not exist
      ✓ should successfully create change request and revision 1 in DRAFT status
    submitForInternalReview & reviewRevision
      ✓ should reject submission if revision is not in DRAFT or CHANGES_REQUESTED
      ✓ should advance revision to INTERNAL_REVIEW
      ✓ should review revision and publish to client as AWAITING_CLIENT
    material revisions (N+1 reapproval requirement)
      ✓ should create revision N+1 and supersede previous revision
    recordClientDecision
      ✓ should throw BadRequestException if client attempts to decide on a superseded revision
      ✓ should throw ForbiddenException if contact does not have scope approval authority
      ✓ should successfully record client APPROVED decision and update status
    linkDeliveryTasks
      ✓ should throw BadRequestException if change request is not APPROVED
      ✓ should link tasks when change request is APPROVED

Test Suites: 22 passed, 22 total
Tests:       163 passed, 163 total
```

### Web Application Production Build
Built web client via Vite:
```bash
vite v8.3.1 building client environment for production...
✓ 2152 modules transformed.
rendering chunks...
dist/index.html                      1.49 kB │ gzip:   0.73 kB
dist/assets/index-CI2MHqkp.css     104.75 kB │ gzip:  16.37 kB
dist/assets/TasksView-IPeSVI86.js  219.67 kB │ gzip:  59.51 kB
dist/assets/index-Dc3fjnGF.js      903.94 kB │ gzip: 214.67 kB
✓ built in 1.43s
```

### Database Manifest Rebuild
Regenerated `dbscripts/install.sql` (0 SQL executed per development guidelines):
```bash
node dbscripts/build-install.mjs
Generated C:\Projects\KashviraInfotech\ks-pmt\dbscripts\install.sql from 14 object files. No SQL was executed.
```

### Git Status
All modifications remain clean and unstaged for manual review. No commits or pushes were executed.
