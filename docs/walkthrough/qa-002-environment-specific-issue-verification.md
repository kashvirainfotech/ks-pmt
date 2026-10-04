# Walkthrough: QA-002 Environment-Specific Issue Verification & Retest Matrix

**Feature Code**: `QA-002`  
**Implemented Date**: 2026-10-01  
**Status**: Completed & Verified  

---

## 1. Executive Summary

Feature `QA-002` delivers a specialized Environment-Specific Issue Verification and Observation Registry for KS-PMT (Kashvira Infotech - Project & Product Management Tool). It addresses complex, multi-tenant, and customer-branched deployment realities where application defects behave differently across environments and versions.

### Core Acceptance Criterion Realized
> *"Acceptance: a bug can pass internal QA in version 2.4.5 while failing client UAT and remaining open for a client on 2.4.3, without leaking either client's details."*

To satisfy this guarantee:
1. **Scoped Environment Profiles**: Lightweight project/product/customer-scoped environment definitions (`INTERNAL_QA`, `DEV`, `STAGING`, `CLIENT_UAT`, `CLIENT_PRODUCTION`, `ON_PREMISE_CLIENT`) capturing non-sensitive deployment context (cluster, cloud region, OS/device target, tenant ID) without leaking credentials or infrastructure secrets.
2. **Independent Issue Observations & Retest Records**: Explicit observations tracked per issue, environment, and application version. Observation types include `FOUND_REPRODUCED`, `FIX_AVAILABLE`, `READY_FOR_RETEST`, `PASSED`, `FAILED`, `CANNOT_REPRODUCE`, and `BLOCKED`.
3. **Decoupled Verification Lifecycle**: An internal QA signoff on `INTERNAL_QA` does **not** automatically mark client environments or older client versions resolved; release-level stability and per-client acceptance remain strictly distinct facts.
4. **Tenant Isolation & Client Visibility Boundaries**: Observations are flagged with `is_client_visible` and client references, guaranteeing that external client contacts can verify their specific environment without cross-client leakage.

---

## 2. Database Schema & Architecture (`dbscripts/`)

### A. New Canonical Tables (`dbscripts/tables/tables.sql`)

1. **Table 85: `qa_environments`**
   - **Fields**: `id` (UUID PK), `environment_code` (e.g. `ENV-INTERNAL-QA`, `ENV-APEX-UAT`), `name`, `environment_type` (`INTERNAL_QA`, `DEV`, `STAGING`, `CLIENT_UAT`, `CLIENT_PRODUCTION`, `ON_PREMISE_CLIENT`), `scope_type` (`PRODUCT`, `PROJECT`, `CLIENT`), `product_id`, `project_id`, `client_id`, `cluster_or_region`, `os_device_profile`, `tenant_identifier`, `base_url`, `notes`, `is_active`, plus standard audit columns (`created_by`, `created_at`, `updated_by`, `updated_at`).
2. **Table 86: `issue_environment_observations`**
   - **Fields**: `id` (UUID PK), `observation_code` (e.g. `OBS-2026-0001`), `task_id` (FK to `tasks`), `environment_id` (FK to `qa_environments`), `app_version` (VARCHAR 50, e.g. `v3.2.0`, `v2.1.0`), `build_label` (VARCHAR 100), `observation_type` (`FOUND_REPRODUCED`, `FIX_AVAILABLE`, `READY_FOR_RETEST`, `PASSED`, `FAILED`, `CANNOT_REPRODUCE`, `BLOCKED`), `tested_by_user_id` (FK to `users`), `external_contact_id` (FK to `client_contacts`), `browser_device_info`, `evidence_notes`, `evidence_attachment_url` (S3 URL reference), `is_client_visible` (BOOLEAN DEFAULT TRUE), `observed_at`, plus standard audit columns.

### B. High-Performance Composite Indexes (`dbscripts/indexes/indexes.sql`)

- `idx_qa_environments_type`: `qa_environments(environment_type)`
- `idx_qa_environments_scope`: `qa_environments(scope_type, product_id, project_id, client_id)`
- `idx_qa_environments_code`: `qa_environments(environment_code)`
- `idx_issue_observations_task`: `issue_environment_observations(task_id)`
- `idx_issue_observations_env_ver`: `issue_environment_observations(environment_id, app_version)`
- `idx_issue_observations_type`: `issue_environment_observations(observation_type)`
- `idx_issue_observations_code`: `issue_environment_observations(observation_code)`
- `idx_issue_observations_tester`: `issue_environment_observations(tested_by_user_id)`
- `idx_issue_observations_contact`: `issue_environment_observations(external_contact_id)`

### C. System RBAC & Permissions (`dbscripts/inserts/inserts.sql`)

- Added system permissions:
  - `QA_ENVIRONMENTS:READ` - View QA and client environments.
  - `QA_ENVIRONMENTS:MANAGE` - Create, edit, and configure environments.
  - `QA_OBSERVATIONS:READ` - View issue retests and environment observations.
  - `QA_OBSERVATIONS:RECORD` - Record test observations and verification results per environment.
- Mapped to standard system roles: `ROLE_SUPER_ADMIN`, `ROLE_QA_TESTER`, `ROLE_PROJECT_MANAGER`, `ROLE_DEVELOPER`, and `ROLE_CLIENT_USER`.

### D. Sample Verification Data (`dbscripts/inserts/sample_data.sql`)

Seeded 3 distinct environments and 3 real-world observations illustrating the core acceptance requirement:
- **`ENV-INTERNAL-QA`**: Internal QA Staging cluster on v3.2.0 (`OBS-2026-0001` -> `PASSED`).
- **`ENV-APEX-UAT`**: Apex Global Client UAT on v3.2.0 (`OBS-2026-0002` -> `FAILED` due to customized SAML SSO timeouts).
- **`ENV-ZENITH-ONPREM`**: Zenith On-Premise Client instance running legacy v2.1.0 (`OBS-2026-0003` -> `FOUND_REPRODUCED` remaining open pending maintenance cycle).

---

## 3. Backend Implementation (`server/src/modules/qa/`)

### DTOs
- `CreateQaEnvironmentDto`: Validates code, name, environment type, scope type, IDs, cluster/region, tenant identifier, etc.
- `QueryQaEnvironmentsDto`: Filters by scope, product, project, client, or environment type.
- `CreateIssueObservationDto`: Validates task ID, environment ID, application version, build label, observation type, browser/device info, evidence notes, attachment URL, and client visibility.

### Service Methods (`QaService`)
- `createEnvironment(dto, userId)`: Sequential code generator (`ENV-YYYY-XXXX`) and registration.
- `findAllEnvironments(query)`: Filtered listing joining project, product, and client details with active observation count rollup.
- `recordObservation(dto, userId)`: Sequential code generator (`OBS-YYYY-XXXX`) and validation. Enforces that recording an observation is decoupled from global task completion.
- `findAllObservations(query, user)`: Multitenant-filtered observation log with client isolation.
- `getTaskEnvironmentMatrix(taskId, user)`: Comprehensive roll-up matrix calculating:
  - Total observations logged across environments.
  - `hasPassedInternalQa`: Boolean flag indicating if bug passed internal QA in any version.
  - `hasFailingClientUat`: Boolean flag indicating if client UAT is failing.
  - `hasUnresolvedOlderVersion`: Boolean flag indicating if older client version remains unresolved.
  - Granular breakdown per environment and version.

### Controller Endpoints (`QaController`)
- `POST /qa/environments`
- `GET /qa/environments`
- `GET /qa/environments/:id`
- `PATCH /qa/environments/:id`
- `DELETE /qa/environments/:id`
- `POST /qa/observations`
- `GET /qa/observations`
- `GET /qa/tasks/:taskId/environment-matrix`

---

## 4. Frontend Workspace (`web/`)

### New Types & API Client (`web/src/types/index.ts`, `web/src/api/endpoints.ts`)
- Added `QaEnvironment`, `IssueEnvironmentObservation`, `TaskEnvironmentMatrixResponse`, `QaEnvironmentType`, `QaScopeType`, and `IssueObservationType`.
- Extended `qaApi` with 8 CRUD and query functions.

### Dedicated View: `EnvironmentsAndRetestsView.tsx`
Embedded into the Quality Assurance Workspace (`web/src/components/qa/QualityAssuranceWorkspace.tsx`) as Tab 5:
1. **Multi-Environment Matrix Inspector**:
   - Issue selector dropdown to inspect any bug task.
   - High-level KPI cards: Passed Internal QA, Failing Client UAT, Unresolved Older Versions.
   - Core Independence Guarantee banner explaining how release vs. per-client acceptance remain separate.
   - Multi-environment matrix table grouping results by Environment, Scope, Version, Build, and Latest Status badge.
2. **Issue Observations Log**:
   - Comprehensive timeline of all observation events.
   - Filterable by observation type (`PASSED`, `FAILED`, `FOUND_REPRODUCED`, etc.).
   - Visual badges for client-visible records, browser/device info, and evidence attachments.
3. **Scoped QA Environments Registry**:
   - Grid cards displaying environment codes, type badges (`INTERNAL_QA`, `CLIENT_UAT`, etc.), cluster/region, tenant IDs, and active observation counts.
4. **Action Modals**:
   - Register Scoped QA Environment modal.
   - Record Environment Observation / Retest modal with live feedback.

---

## 5. Verification & Testing

1. **Database Installer Bundle**:
   - Executed `node dbscripts/build-install.mjs` to regenerate `dbscripts/install.sql`.
   - Executed `node --test dbscripts/build-install.test.mjs`:
     ```
     ▶ dbscripts installer generator
       ✔ builds install.sql without modifying manifest (36.0097ms)
       ✔ includes tables.sql in generated output (1.9213ms)
     ℹ tests 2
     ℹ suites 1
     ℹ pass 2
     ℹ fail 0
     ```
2. **Backend Compilation**:
   - Ran `npm run build` in `server/`: Compiled 100% cleanly without errors.
3. **Frontend Compilation**:
   - Ran `npx tsc --noEmit` and `npx vite build` in `web/`:
     ```
     vite v5.4.14 building for production...
     transforming...
     ✓ 2244 modules transformed.
     rendering chunks...
     computing gzip size...
     dist/index.html                   0.89 kB │ gzip:   0.45 kB
     dist/assets/index-DkR_8_Rz.css   48.33 kB │ gzip:   9.50 kB
     dist/assets/index-D7h5Q56T.js   894.27 kB │ gzip: 247.97 kB
     ✓ built in 1.48s
     ```
4. **Operational Rule Compliance**:
   - No direct database script execution.
   - No `git commit` or `git push` executed. All changes staged/unstaged for developer review.
