# Walkthrough: CONFIG-001 — Workflow Overrides, Schemes & Transition Gates

**Date:** 2026-09-29  
**Specification Reference:** `CONFIG-001` (Software Requirements Specification, Section 4.5 & Increment B)  
**Author:** Senior Full-Stack Engineering Team (8–10 Years Experience Standard)

---

## 1. Executive Summary

Standard issue-tracking platforms enforce rigid, global workflow state machines that fail when applied to diverse client contracts and commercial product lines. In a multi-service enterprise, a standard maintenance project may only need `TODO -> IN_PROGRESS -> DONE`, whereas a safety-critical client project or commercial SaaS product demands strict verification gates: QA sign-off, release milestone tagging, mandatory resolution classifications, or role-restricted transitions.

**CONFIG-001** introduces enterprise-grade workflow schemes and transition gate engines:
1. **Hierarchical Versioned Workflow Schemes:** Supports `GLOBAL`, `PROJECT`, and `PRODUCT` scoped workflow schemes with versioned lifecycle states (`DRAFT` → `PUBLISHED` → `ARCHIVED`). Schemes fall back hierarchically: Project override → Product override → Global default → Global system fallback.
2. **Transition Gate Rules & Mandatory Fields:** Each transition between statuses can specify:
   - `allowed_roles`: List of specific role codes permitted to trigger the transition.
   - `required_fields`: Task fields that must be populated before transitioning (e.g., `estimated_hours`, `due_date`, `description`).
   - `requires_release_association`: Requires the task to be mapped to a release/milestone version before moving to release candidate or QA.
   - `requires_qa_signoff`: Enforces QA verification sign-off.
   - `requires_resolution`: Mandates resolution classification (e.g., `FIXED`, `WONT_FIX`, `DUPLICATE`) when transitioning to completed or closed states.
   - `manual_gate_name` & `transition_notes_prompt`: Explicit sign-off labels and mandatory transition notes prompt.
3. **Graph Soundness & Reachability Diagnostics:** Static validation algorithm verifies state-machine graph integrity prior to publishing:
   - Identifies initial statuses (`TODO` category or 0 in-degree).
   - Detects unreachable statuses (non-initial states with 0 in-degree).
   - Detects dead-end non-terminal statuses (intermediate states with 0 out-degree).
   - Flags missing terminal states.
4. **Active Task Remapping on Publish (Zero-Stranded-Work Guarantee):** Publishing a project or product scheme override cannot strand active tasks in deprecated or removed statuses. The publish operation detects active tasks in unmapped statuses, requires an explicit status remapping dictionary (`activeTaskRemapping`), and atomically migrates active tasks within the database transaction.
5. **Unified Multi-Touchpoint Enforcement:** Identical transition gate validation is enforced across all client touchpoints: single status update API (`PATCH /tasks/:id/status`), slide-over task drawer, quick inline cell dropdowns, and batch operations (`TasksService.bulkUpdateTasks`).

---

## 2. Database Schema Architecture

In accordance with [AGENTS.md](../../AGENTS.md) and [GEMINI.md](../../GEMINI.md), canonical schema definitions were created in `dbscripts/` and consolidated into `dbscripts/install.psql` without executing DDL directly on live databases.

### 2.1 Table Definitions (`dbscripts/tables/tables.sql`)

```sql
-- 38. Workflow Schemes (CONFIG-001)
CREATE TABLE IF NOT EXISTS workflow_schemes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    scope VARCHAR(30) NOT NULL DEFAULT 'GLOBAL' CHECK (scope IN ('GLOBAL', 'PROJECT', 'PRODUCT')),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    version INT NOT NULL DEFAULT 1,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_workflow_scheme_scope CHECK (
        (scope = 'GLOBAL' AND project_id IS NULL AND product_id IS NULL) OR
        (scope = 'PROJECT' AND project_id IS NOT NULL AND product_id IS NULL) OR
        (scope = 'PRODUCT' AND product_id IS NOT NULL AND project_id IS NULL)
    )
);

-- 39. Workflow Scheme Transitions & Gate Rules (CONFIG-001)
CREATE TABLE IF NOT EXISTS workflow_scheme_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheme_id UUID NOT NULL REFERENCES workflow_schemes(id) ON DELETE CASCADE,
    from_status_id UUID NOT NULL REFERENCES task_statuses(id) ON DELETE RESTRICT,
    to_status_id UUID NOT NULL REFERENCES task_statuses(id) ON DELETE RESTRICT,
    transition_name VARCHAR(100),
    allowed_roles JSONB DEFAULT '[]'::jsonb,
    required_fields JSONB DEFAULT '[]'::jsonb,
    requires_release_association BOOLEAN NOT NULL DEFAULT FALSE,
    requires_qa_signoff BOOLEAN NOT NULL DEFAULT FALSE,
    requires_resolution BOOLEAN NOT NULL DEFAULT FALSE,
    manual_gate_name VARCHAR(100),
    transition_notes_prompt TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_scheme_transition UNIQUE (scheme_id, from_status_id, to_status_id)
);
```

### 2.2 Performance Indexes (`dbscripts/indexes/indexes.sql`)

```sql
CREATE INDEX IF NOT EXISTS idx_workflow_schemes_scope_status ON workflow_schemes(scope, status);
CREATE INDEX IF NOT EXISTS idx_workflow_schemes_project ON workflow_schemes(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workflow_schemes_product ON workflow_schemes(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workflow_scheme_transitions_scheme ON workflow_scheme_transitions(scheme_id);
CREATE INDEX IF NOT EXISTS idx_workflow_scheme_transitions_lookup ON workflow_scheme_transitions(scheme_id, from_status_id, to_status_id);
```

### 2.3 Permissions Seed Data (`dbscripts/inserts/inserts.sql`)

```sql
-- Permissions for Workflow Schemes (CONFIG-001)
INSERT INTO permissions (name, description, category, created_by)
VALUES 
    ('WORKFLOWS:READ', 'View workflow schemes, transitions, and gate validation rules', 'PROJECTS', (SELECT id FROM users WHERE email = 'admin@kashvirainfotech.com' LIMIT 1)),
    ('WORKFLOWS:MANAGE', 'Create, update, clone, configure gates, and publish workflow schemes', 'PROJECTS', (SELECT id FROM users WHERE email = 'admin@kashvirainfotech.com' LIMIT 1))
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'ROLE_SUPER_ADMIN' AND p.name IN ('WORKFLOWS:READ', 'WORKFLOWS:MANAGE')
ON CONFLICT DO NOTHING;
```

---

## 3. Backend NestJS Implementation

The implementation is encapsulated within `server/src/modules/task-workflows/` and seamlessly integrated with `server/src/modules/tasks/`:

### 3.1 DTOs (`server/src/modules/task-workflows/dto/workflow-scheme.dto.ts`)
- `CreateWorkflowSchemeDto`: Validates `name`, `description`, `scope` (`GLOBAL` | `PROJECT` | `PRODUCT`), `projectId`, and `productId`.
- `UpdateWorkflowSchemeDto`: Partial updates for draft schemes.
- `ConfigureSchemeTransitionsDto`: Array of transition rules containing `fromStatusId`, `toStatusId`, `transitionName`, `allowedRoles`, `requiredFields`, `requiresReleaseAssociation`, `requiresQaSignoff`, `requiresResolution`, `manualGateName`, and `transitionNotesPrompt`.
- `PublishWorkflowSchemeDto`: Encapsulates optional `activeTaskRemapping` (`Record<string, string>`) mapping deprecated status IDs to target valid status IDs.
- `CloneWorkflowSchemeDto`: Creates an isolated new scheme draft cloned from an existing published baseline.

### 3.2 Service Layer (`server/src/modules/task-workflows/task-workflows.service.ts`)
Key capabilities implemented:
- **`getEffectiveWorkflow(projectId?, productId?)`**: Evaluates effective scheme hierarchy:
  1. Active `PUBLISHED` scheme with `scope = 'PROJECT'` for the given project.
  2. Active `PUBLISHED` scheme with `scope = 'PRODUCT'` for the project's product.
  3. Active `PUBLISHED` scheme with `scope = 'GLOBAL'` and `is_default = TRUE`.
  4. Global un-scoped `task_workflows` legacy table fallback.
- **`getAllowedNextStatuses(currentStatusId, projectId?, productId?)`**: Returns the list of permitted destination statuses along with their gate requirements (`allowedRoles`, `requiredFields`, `requiresReleaseAssociation`, etc.).
- **`validateTransition(params)`**: Evaluates transition validity:
  1. Checks if transition path exists in effective scheme.
  2. Verifies actor role against `allowedRoles`.
  3. Verifies `requiredFields` are populated on task (or supplied in mutation payload).
  4. Verifies `requiresReleaseAssociation` (task `release_id` or `version_id` must be set).
  5. Verifies `requiresResolution` when transitioning to completed/closed categories.
- **`validateWorkflowDraft(schemeId)`**: Analyzes graph structure:
  - Finds all statuses in transitions.
  - Computes in-degrees and out-degrees.
  - Flags unreachable statuses (in-degree = 0, non-TODO).
  - Flags dead-ends (out-degree = 0, non-terminal category).
  - Verifies presence of initial and terminal states.
- **`publishWorkflowScheme(schemeId, activeTaskRemapping, userId)`**:
  - Validates graph soundness.
  - Checks if active tasks in project/product exist in statuses outside the new scheme.
  - Blocks publish if unmapped stranded tasks are found.
  - Migrates stranded tasks atomically via `UPDATE tasks SET status_id = ...`.
  - Marks previous published scheme for that scope as `ARCHIVED`.
  - Sets scheme status to `PUBLISHED`.
- **`cloneScheme(schemeId, dto, userId)`**: Copies transitions and gate rules into a new `DRAFT` scheme with incremented version.

### 3.3 Tasks Service Integration (`server/src/modules/tasks/tasks.service.ts`)
- **`changeStatus`**: Calls `validateTransition` before updating status. Throws `BadRequestException` or `ForbiddenException` with specific gate failure details if gate conditions are unsatisfied.
- **`bulkUpdateTasks`**: Validates each item's transition against effective workflow gates. Reports failed transitions under `INVALID_TRANSITION` error code with the explicit gate rule explanation.

---

## 4. Frontend Implementation

### 4.1 TypeScript Definitions (`web/src/types/index.ts`)
- Added `WorkflowScope`, `WorkflowSchemeStatus`, `WorkflowScheme`, `WorkflowSchemeTransition`, and `WorkflowValidationResult`.

### 4.2 API Client Layer (`web/src/api/endpoints.ts`)
- Added `workflowSchemesApi`: `getAll`, `getById`, `create`, `update`, `delete`, `configureTransitions`, `validateDraft`, `publish`, `archive`, `clone`, `getEffective`.

### 4.3 Visual Scheme Editor & Gates View (`web/src/components/workflows/WorkflowSchemesEditorView.tsx`)
A comprehensive, responsive management view featuring:
- **Scope & Status Filtering:** Filter by `GLOBAL`, `PROJECT`, `PRODUCT` and status badges (`DRAFT`, `PUBLISHED`, `ARCHIVED`).
- **Interactive Schemes Card Grid:** Displays scheme scope, version, transition count, active projects/products, and action buttons (`Edit Transitions`, `Validate Soundness`, `Publish`, `Clone`, `Archive`).
- **Transitions & Gate Rules Builder Drawer:**
  - Visual matrix of configured transitions.
  - Interactive "Add Transition" builder selecting `From Status`, `To Status`, `Transition Name`.
  - Granular gate toggles: `Allowed Roles` multi-select, `Required Fields` multi-select, `Requires Release / Milestone`, `Requires QA Sign-off`, `Requires Resolution Classification`, and `Manual Sign-off Gate Name`.
- **Graph Reachability Diagnostics Modal:** Runs graph soundness check displaying green indicators for sound graphs, or detailed diagnostic warnings for unreachable states or non-terminal dead ends.
- **Safe Publish & Active Task Remapping Modal:** Warns if active tasks will be affected, provides dropdown mapping per unmapped status, and executes atomic migration on publish.
- **Clone Scheme Modal:** Enables rapid cloning of standard baselines to project-specific variations.

### 4.4 Navigation & App Integration (`web/src/App.tsx` & `web/src/components/layout/Sidebar.tsx`)
- Registered route: `/workflow-schemes`.
- Added `Workflow schemes` navigation entry under Organization menu with `GitMerge` icon.

---

## 5. Automated Verification Results

### 5.1 Backend Automated Test Suite
- Executed: `npm test` across the NestJS backend.
- Result: **19 out of 19 test suites passed** (124/124 tests passing).
- Includes 13 dedicated unit tests in `task-workflows.service.spec.ts` covering CRUD, cloning, graph reachability validation, gate checks, and effective scheme resolution.

```
PASS src/modules/task-workflows/task-workflows.service.spec.ts
PASS src/modules/tasks/tasks.regression.spec.ts
PASS src/modules/teams/teams.service.spec.ts
PASS src/modules/task-handoffs/task-handoffs.service.spec.ts
PASS src/modules/time-logs/time-logs.service.spec.ts
PASS src/modules/saved-views/saved-views.service.spec.ts
PASS src/modules/task-blockers/task-blockers.service.spec.ts
PASS src/modules/calendars/calendars.service.spec.ts
PASS src/modules/sprints/sprints.service.spec.ts
...
Test Suites: 19 passed, 19 total
Tests:       124 passed, 124 total
Snapshots:   0 total
Time:        4.572 s
```

### 5.2 Frontend Production Build
- Executed: `npm run build` in `web/`.
- Result: Clean TypeScript compilation and Vite production bundle generated in 1.43s with 0 errors.

```
✓ 1836 modules transformed.
dist/index.html                   0.89 kB │ gzip:   0.45 kB
dist/assets/index-B_K3G4yV.css   68.52 kB │ gzip:  11.83 kB
dist/assets/index-CW2V8j_r.js   938.14 kB │ gzip: 254.49 kB
✓ built in 1432ms
```

---

## 6. Milestone Conclusion

With **CONFIG-001** completed, **Increment B — Daily Development Planning** is now **100% complete**:
- `PLAN-001`: Work Hierarchy, Backlogs & Sprints
- `PLAN-002`: Dependencies, Blocker Radar & Defect Templates
- `PLAN-003`: Saved Views, Inline Editing & Bulk Operations
- `TIME-001`: Schedule-Aware Timesheets & Persistent Global Timer
- `PLAN-004`: Delivery Teams & Software Components
- `FLOW-001`: Work Handoff Tracking & Waiting Queues
- `CONFIG-001`: Project-Specific Workflow Overrides & Transition Gates

The platform is primed to advance to **Increment C — Client Delivery**, starting with `CLIENT-001` & `CLIENT-002` (Customer Portal, Contacts & Support Intake).
