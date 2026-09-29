# Walkthrough: CLIENT-003 — Requirements & Acceptance Traceability

**Date:** 2026-09-29  
**Specification Reference:** `CLIENT-003` (Software Requirements Specification, Section 4.6 & Increment C)  
**Author:** Senior Full-Stack Engineering Team (8–10 Years Experience Standard)

---

## 1. Executive Summary

In enterprise software delivery, requirement drift and misaligned expectations between client stakeholders, project managers, developers, and QA engineers cause delivery failure. Most issue trackers conflate developer implementation tasks with client requirements, leading to:
- Requirements being casually rewritten or deleted mid-flight without client consent.
- Inability to prove whether every agreed acceptance criterion has been implemented, verified by QA, or accepted by the client.
- Lack of immutable historical baselines: amending a feature overwrites the original contracted scope.

**CLIENT-003** delivers an enterprise-grade Requirements & Acceptance Traceability engine:
1. **Versioned Requirement Specifications:** Project Managers and Business Analysts maintain formal briefs, business objectives, and explicit scope boundaries (`in_scope`, `out_of_scope`, `assumptions`) linked to either client projects or commercial software products.
2. **Measurable Acceptance Criteria:** Functional requirements are broken down into granular criteria with verification methods (`MANUAL_TEST`, `DEMO`, `DOCUMENTATION`, `AUTOMATED`) and lifecycle states (`NOT_STARTED` &rarr; `IN_PROGRESS` &rarr; `IMPLEMENTED` &rarr; `VERIFIED_QA` &rarr; `ACCEPTED_CLIENT`).
3. **Immutable Scope Baselines (`requirement_baselines`):** Freezing a baseline creates a permanent, immutable snapshot of the requirement and its criteria. Amending a baselined requirement increments the revision version to `AMENDED` without rewriting or destroying the historical baseline.
4. **Explicit Delivery Task Linking:** Acceptance criteria link directly to Jira-style delivery tasks (`tasks` table) via `requirement_criterion_tasks`, tracking implementation without forcing client stakeholders to decipher raw backlog tickets.
5. **QA Verification Evidence:** QA Leads attach test notes, execution evidence URLs, and verified build metadata directly to criteria.
6. **Client Sign-Off Governance:** Authorized client approvers (`is_approver = true` or project approvers) review baselined requirements in their customer workspace and record formal attributable decisions (`ACCEPTED` / `REJECTED` / `WAIVED`) with feedback notes.
7. **Traceability Matrix & Coverage Gaps Radar:** Automated real-time matrix calculating delivery coverage %, QA verification %, and client acceptance %, while instantly highlighting unimplemented criteria, unverified criteria, and unaccepted criteria.

---

## 2. Database Schema Architecture

Canonical schema definitions were added to `dbscripts/tables/tables.sql` and `dbscripts/indexes/indexes.sql`, and consolidated into the installer bundle via `node dbscripts/build-install.mjs`.

### 2.1 Table Definitions (`dbscripts/tables/tables.sql`)

```sql
-- 44. Requirement Specifications (CLIENT-003)
CREATE TABLE IF NOT EXISTS requirement_specifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    req_code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    module_name VARCHAR(100),
    business_objective TEXT NOT NULL,
    in_scope TEXT,
    out_of_scope TEXT,
    assumptions TEXT,
    originating_request_id UUID REFERENCES client_intake_requests(id) ON DELETE SET NULL,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PROPOSED', 'REVIEWED', 'BASELINED', 'AMENDED', 'ARCHIVED')),
    is_baselined BOOLEAN NOT NULL DEFAULT FALSE,
    baselined_at TIMESTAMP WITH TIME ZONE,
    baselined_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_client_visible BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_req_spec_scope CHECK (
        (project_id IS NOT NULL AND product_id IS NULL) OR
        (product_id IS NOT NULL AND project_id IS NULL)
    )
);

-- 45. Requirement Baselines (CLIENT-003)
CREATE TABLE IF NOT EXISTS requirement_baselines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requirement_id UUID NOT NULL REFERENCES requirement_specifications(id) ON DELETE CASCADE,
    version INTEGER NOT NULL CHECK (version > 0),
    baseline_name VARCHAR(150) NOT NULL,
    snapshot_data JSONB NOT NULL,
    baselined_by UUID NOT NULL REFERENCES users(id),
    baselined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_by_contact_id UUID REFERENCES client_contacts(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_req_baseline_version UNIQUE (requirement_id, version)
);

-- 46. Requirement Acceptance Criteria (CLIENT-003)
CREATE TABLE IF NOT EXISTS requirement_acceptance_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requirement_id UUID NOT NULL REFERENCES requirement_specifications(id) ON DELETE CASCADE,
    criteria_code VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    verification_method VARCHAR(30) NOT NULL DEFAULT 'MANUAL_TEST' CHECK (verification_method IN ('MANUAL_TEST', 'DEMO', 'DOCUMENTATION', 'AUTOMATED')),
    implementation_status VARCHAR(30) NOT NULL DEFAULT 'NOT_STARTED' CHECK (implementation_status IN ('NOT_STARTED', 'IN_PROGRESS', 'IMPLEMENTED', 'VERIFIED_QA', 'ACCEPTED_CLIENT', 'WAIVED')),
    order_index INTEGER NOT NULL DEFAULT 1,
    qa_evidence_notes TEXT,
    qa_evidence_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    qa_verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    qa_verified_at TIMESTAMP WITH TIME ZONE,
    client_signoff_status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (client_signoff_status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'WAIVED')),
    client_signoff_by_contact_id UUID REFERENCES client_contacts(id) ON DELETE SET NULL,
    client_signoff_at TIMESTAMP WITH TIME ZONE,
    client_signoff_notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_req_criteria_code UNIQUE (requirement_id, criteria_code)
);

-- 47. Requirement Criterion to Delivery Tasks Mapping (CLIENT-003)
CREATE TABLE IF NOT EXISTS requirement_criterion_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    criterion_id UUID NOT NULL REFERENCES requirement_acceptance_criteria(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_criterion_task UNIQUE (criterion_id, task_id)
);
```

### 2.2 Permissions Seed Data (`dbscripts/inserts/inserts.sql`)

Added permissions:
- `REQUIREMENTS:READ`: View requirements, criteria, baselines, and traceability matrix.
- `REQUIREMENTS:MANAGE`: Create and edit specifications, add criteria, link delivery tasks, freeze baselines, and propose amendments.
- `REQUIREMENTS:SIGNOFF`: Record QA verification and client sign-offs.

Granted permissions to `ROLE_SUPER_ADMIN` and `ROLE_PROJECT_MANAGER`.

---

## 3. Backend Implementation & Security (NestJS)

### 3.1 Requirements Service (`RequirementsService`)
Located at `server/src/modules/requirements/requirements.service.ts`:
- `createRequirement`: Validates strict mutual exclusivity between `projectId` and `productId`. Auto-generates unique `REQ-XXXXXX` code if omitted.
- `getRequirements`: Aggregates criteria counts, implemented counts, QA verified counts, and client accepted counts.
- `getRequirementById`: Returns specification with full criteria breakdown, linked task objects, and baseline history.
- `baselineRequirement`: Freezes an immutable JSON snapshot of the requirement and its criteria into `requirement_baselines` and transitions status to `BASELINED`.
- `proposeAmendment`: Increments version (`v = v + 1`) and transitions status to `AMENDED` while keeping historical baselines intact.
- `addCriterion` & `updateCriterion`: Manages measurable acceptance criteria.
- `linkTasksToCriterion` & `unlinkTaskFromCriterion`: Maps delivery tasks and advances implementation status from `NOT_STARTED` to `IN_PROGRESS`.
- `recordQaVerification`: Attaches QA notes and evidence links, advancing status to `VERIFIED_QA`.
- `recordClientSignoff`: Validates approver authority and records client sign-off decision (`ACCEPTED`, `REJECTED`, `WAIVED`).
- `getTraceabilityMatrix`: Calculates delivery coverage %, QA verification %, and client acceptance %, compiling end-to-end traceability chains and identifying coverage gap items.

### 3.2 Client Portal Allowlisted Read & Sign-off
Implemented in `ClientPortalService` & `ClientPortalController`:
- `GET /client-portal/requirements`: Filtered strictly to `is_client_visible = true AND is_baselined = true AND project_id = ANY(grantedProjects)`.
- `GET /client-portal/requirements/:id`: Allowlisted response hiding internal staff cost rates, margins, and raw hours.
- `POST /client-portal/requirements/criteria/:criterionId/sign-off`: Allows designated client approvers to submit formal sign-offs.

---

## 4. Frontend Workspace Architecture (React + Tailwind)

### 4.1 Internal Requirements & Traceability Workspace (`RequirementsTraceabilityView.tsx`)
- **Dual Tab Architecture:**
  - **Tab 1: Requirement Specifications:** Filterable list of specifications with progress bars for QA % and Client % acceptance. Slide-over drawer provides full CRUD, baseline freezing, amendment proposing, criteria management, task linking picker, and QA verification dialogs.
  - **Tab 2: Traceability Matrix & Coverage Gaps:** 6 KPI metric widgets, an alert radar for missing delivery tasks and missing QA evidence, and a comprehensive end-to-end matrix table tracing:
    $$\text{Client Intake Request} \longrightarrow \text{Requirement} \longrightarrow \text{Criteria} \longrightarrow \text{Delivery Tasks} \longrightarrow \text{QA Verification} \longrightarrow \text{Client Acceptance}$$

### 4.2 Customer Portal Workspace Integration (`CustomerPortalWorkspace.tsx`)
- Added a dedicated **"Requirements & Acceptance"** tab to the Customer Portal.
- Client contacts view published, baselined requirements and criteria.
- Designated Client Approvers can click **"Approve Criterion"** or **"Request Changes"** with attributable decision remarks.

---

## 5. Verification & Test Execution

### 5.1 Unit Tests (`requirements.service.spec.ts`)
14 automated unit tests passing:
- Scope exclusivity checks (project vs. product)
- Entity foreign key checks
- Baseline creation and snapshot freezing
- Amendment version incrementation without baseline rewriting
- Criteria auto-code generation
- Delivery task linking and auto-status advance
- QA verification and evidence tracking
- Client sign-off permission validation and decision recording
- Traceability matrix coverage calculation and gap identification

**Full Backend Suite:** 21 test suites passed, 150/150 tests passed in 25.59s.

### 5.2 Frontend Production Build
Vite production build verified:
```bash
npm run build
```
Output:
```
vite v8.3.1 building client environment for production...
✓ 2151 modules transformed.
dist/index.html                      1.49 kB │ gzip:   0.73 kB
dist/assets/index-BTrO5x7G.css     100.34 kB │ gzip:  15.72 kB
dist/assets/TasksView-DOEQZy5O.js  219.67 kB │ gzip:  59.51 kB
dist/assets/index-Dgm7eunC.js      846.96 kB │ gzip: 205.17 kB
✓ built in 2.23s
```

---

## 6. Summary of Delivered Features

| Capability | Specification | Implementation Status |
| :--- | :---: | :--- |
| **Versioned Requirement Specifications** | `CLIENT-003` | ✅ Implemented |
| **Measurable Acceptance Criteria** | `CLIENT-003` | ✅ Implemented |
| **Immutable Scope Baselines** | `CLIENT-003` | ✅ Implemented |
| **Amendment Workflow (No Baseline Loss)** | `CLIENT-003` | ✅ Implemented |
| **Delivery Task Linking** | `CLIENT-003` | ✅ Implemented |
| **QA Verification & Evidence URLs** | `CLIENT-003` | ✅ Implemented |
| **Client Sign-Off Governance** | `CLIENT-003` | ✅ Implemented |
| **Traceability Matrix & Coverage Radar** | `CLIENT-003` | ✅ Implemented |
| **Customer Portal Sign-Off Tab** | `CLIENT-003` | ✅ Implemented |
