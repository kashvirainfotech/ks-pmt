# Walkthrough: PLAN-004 Delivery Teams & Software Component Ownership

**Date**: 2026-09-29  
**Status**: Completed & Verified  
**Feature Code**: `PLAN-004`  
**Applicability**: Backend (NestJS), Web (React), Database (PostgreSQL canonical schema)

---

## 1. Executive Summary

In accordance with **PLAN-004** in [Software Requirements Specification](../../docs/requirements.md#L366-L372) and [Implementation Plan](../../docs/plan.md), we have implemented delivery teams and software component ownership with zero skipped fields, strict authorization boundaries, and automated test coverage.

### Key Architectural Deliverables:
1. **Delivery Teams Management**:
   - Independent delivery teams maintained across branches and departments.
   - Effective-dated member assignments (`team_members`) capturing team role (`LEAD`, `DEVELOPER`, `QA_ENGINEER`, `DEVOPS`, `PRODUCT_OWNER`, `UI_DESIGNER`), join date, leave date, and percentage capacity allocation.
   - Project and Product participation associations (`team_projects`, `team_products`).
   - Work references: Tasks can reference `responsible_team_id` in addition to primary assignees and collaborators.
   - **Strict Security Boundary**: Team membership does not automatically grant project, branch, or client access. All data access continues to be governed by existing RBAC and project membership rules.

2. **Software Components Catalog**:
   - Scoped component catalog with `component_code`, `component_name`, description, `entity_type` (`PRODUCT` vs `PROJECT`), `product_id`, `project_id`, `owner_team_id`, `tech_lead_user_id`, `technology_stack`, `documentation_url`, `repository_url`, and `criticality` (`TIER_1_CRITICAL`, `TIER_2_CORE`, `TIER_3_SUPPORTING`).
   - Many-to-many task-to-components mapping (`task_components`) with designated primary component.

3. **Component Architecture Relationships (Dependencies)**:
   - Architecture dependency edges (`component_dependencies`) with relationship types:
     - `CONSUMES_API` (REST / gRPC)
     - `CALLS_SERVICE`
     - `SHARED_DATABASE`
     - `EVENT_PUBSUB` (Kafka / RabbitMQ)
     - `CLIENT_SDK`
   - Self-dependency rejection (`component_id <> depends_on_component_id`).
   - **Crucial Rule**: Component architecture dependencies are distinct from task scheduling DAGs; reciprocal links (A calls B, B calls A) are supported as valid architecture communication and never fail scheduling DAG validation.
   - Visual architecture map endpoint and modal rendering nodes and directed dependency links.

4. **Component Drill-Down Dashboard (Authorized Scope)**:
   - Aggregates:
     - Active Work items (Tasks, Stories)
     - Bugs & Defects (Tasks with type `BUG` or having `severity` / `resolution`)
     - Technical Debt items (Tasks with type `TECH_DEBT` / `TECHNICAL_DEBT` or tag)
     - Inbound & outbound architecture dependencies
     - Summary KPIs: Total Work, Active Work, Defects, Tech Debt, Critical Issues
   - **Authorization Guarantee**: Non-super-admin users are strictly validated against their authorized project/product scope before accessing work items. A component drill-down never leaks another client's private work or out-of-scope tasks.

---

## 2. Database Schema (Canonical Blank-Database Installation)

In accordance with [AGENTS.md](../../AGENTS.md), schema changes were made directly to the canonical definitions:

1. **`teams`** in [`dbscripts/tables/tables.sql`](../../dbscripts/tables/tables.sql):
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `team_code VARCHAR(50) NOT NULL UNIQUE`
   - `team_name VARCHAR(150) NOT NULL`
   - `description TEXT`
   - `lead_user_id UUID REFERENCES users(id) ON DELETE SET NULL`
   - Standard audit columns: `created_by`, `created_at`, `updated_by`, `updated_at`, `is_active`

2. **`team_members`** in [`dbscripts/tables/tables.sql`](../../dbscripts/tables/tables.sql):
   - `team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE`
   - `user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`
   - `role_in_team VARCHAR(50) NOT NULL DEFAULT 'DEVELOPER'`
   - `joined_date DATE NOT NULL DEFAULT CURRENT_DATE`, `left_date DATE`
   - `allocation_percentage NUMERIC(5, 2) NOT NULL DEFAULT 100.00`
   - Constraint: `uq_team_member UNIQUE (team_id, user_id)`

3. **`team_projects` & `team_products`** in [`dbscripts/tables/tables.sql`](../../dbscripts/tables/tables.sql):
   - Many-to-many relationship tables associating teams with their active projects and products.

4. **`tasks.responsible_team_id`** in [`dbscripts/tables/tables.sql`](../../dbscripts/tables/tables.sql):
   - Foreign key reference to `teams(id) ON DELETE SET NULL`.

5. **`software_components`** in [`dbscripts/tables/tables.sql`](../../dbscripts/tables/tables.sql):
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `component_code VARCHAR(50) NOT NULL`
   - `component_name VARCHAR(150) NOT NULL`
   - `entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('PRODUCT', 'PROJECT'))`
   - `product_id UUID REFERENCES products(id) ON DELETE CASCADE`
   - `project_id UUID REFERENCES projects(id) ON DELETE CASCADE`
   - `owner_team_id UUID REFERENCES teams(id) ON DELETE SET NULL`
   - `tech_lead_user_id UUID REFERENCES users(id) ON DELETE SET NULL`
   - `technology_stack VARCHAR(200)`
   - `criticality VARCHAR(30) NOT NULL DEFAULT 'TIER_2_CORE'`
   - Constraints: `chk_component_entity`, `uq_component_code_entity`

6. **`component_dependencies`** in [`dbscripts/tables/tables.sql`](../../dbscripts/tables/tables.sql):
   - `component_id UUID REFERENCES software_components(id) ON DELETE CASCADE`
   - `depends_on_component_id UUID REFERENCES software_components(id) ON DELETE CASCADE`
   - `dependency_type VARCHAR(50) NOT NULL DEFAULT 'CONSUMES_API'`
   - Constraints: `chk_component_no_self_dep`, `uq_component_dependency`

7. **`task_components`** in [`dbscripts/tables/tables.sql`](../../dbscripts/tables/tables.sql):
   - `task_id UUID REFERENCES tasks(id) ON DELETE CASCADE`
   - `component_id UUID REFERENCES software_components(id) ON DELETE CASCADE`
   - `is_primary BOOLEAN NOT NULL DEFAULT FALSE`

8. **Indexes & Permissions**:
   - Indexes added in [`dbscripts/indexes/indexes.sql`](../../dbscripts/indexes/indexes.sql).
   - Permissions seeded in [`dbscripts/inserts/inserts.sql`](../../dbscripts/inserts/inserts.sql): `TEAMS:READ`, `TEAMS:MANAGE`, `COMPONENTS:READ`, `COMPONENTS:MANAGE`.
   - Rebuilt installation bundle: `node dbscripts/build-install.mjs` cleanly into [`dbscripts/install.sql`](../../dbscripts/install.sql).

---

## 3. Backend NestJS Architecture

Created [`TeamsModule`](../../server/src/modules/teams/teams.module.ts) and registered in [`app.module.ts`](../../server/src/app.module.ts):
- **`TeamsService`** ([`teams.service.ts`](../../server/src/modules/teams/teams.service.ts)):
  - Teams CRUD and team projects/products association.
  - Effective-dated member assignments and removal.
  - Software components catalog CRUD with entity scope validation.
  - Component architecture dependencies and architecture map generator.
  - Authorized component drill-down dashboard with permission checks and classification into active work, defects, and technical debt.
  - Task-to-components mapping.
- **`TeamsController` & `ComponentsController`** ([`teams.controller.ts`](../../server/src/modules/teams/teams.controller.ts)):
  - Protected with `JwtAuthGuard` and `DynamicRbacGuard` with granular `@Permissions()`.
- **Automated Tests** ([`teams.service.spec.ts`](../../server/src/modules/teams/teams.service.spec.ts)):
  - Tested team creation, duplicate code rejection, effective-dated member management.
  - Tested component entity validation and self-dependency rejection.
  - Tested reciprocal dependency support (A calls B, B calls A).
  - Tested permission-enforced component drill-down preventing unauthorized cross-client access.
  - Tested aggregation of active tasks, defects, and tech debt.

---

## 4. Frontend React Architecture

1. **Type Definitions & API Client**:
   - Types in [`web/src/types/index.ts`](../../web/src/types/index.ts): `DeliveryTeam`, `TeamMember`, `SoftwareComponent`, `ComponentDependency`, `ComponentDashboardResponse`, `ComponentArchitectureMapResponse`.
   - Endpoints in [`web/src/api/endpoints.ts`](../../web/src/api/endpoints.ts): `teamsApi`, `componentsApi`.

2. **Delivery Teams Management View** ([`TeamsManagementView.tsx`](../../web/src/components/teams/TeamsManagementView.tsx)):
   - Card grid showing team code, name, description, team lead info, member and component counters, and project/product tags.
   - Create / Edit Team modal with project multi-select and lead picker.
   - Member Roster modal showing roles, allocation percentages, effective dates, and add/remove member forms.

3. **Software Components Catalog View** ([`ComponentsCatalogView.tsx`](../../web/src/components/components/ComponentsCatalogView.tsx)):
   - Components catalog grid with criticality badges (`Tier 1 Critical`, `Tier 2 Core`, `Tier 3 Supporting`), tech stack tags, owner teams, and tech leads.
   - Filter bar by criticality, owner team, and search text.
   - Create / Edit Component modal with entity scope selection (Product vs Project).
   - Component Drill-Down Dashboard modal:
     - Header metadata & summary KPI cards.
     - Tabs for Active Work, Bugs & Defects, Technical Debt, and Architecture Dependencies.
     - Architecture dependency manager (outbound and inbound links) with in-place edge creation.
   - Component Architecture Map visual modal.

4. **Navigation & Routing**:
   - Routes `/teams` and `/components` registered in [`web/src/App.tsx`](../../web/src/App.tsx).
   - Sidebar links for "Delivery teams" and "Components" in [`web/src/components/layout/Sidebar.tsx`](../../web/src/components/layout/Sidebar.tsx).

---

## 5. Verification & Test Evidence

1. **Backend Unit Tests**:
   - Ran `npm test` in `server`:
   - **18 / 18 Test Suites Passed**
   - **103 / 103 Tests Passed** (including `teams.service.spec.ts`)

2. **Frontend Production Build**:
   - Ran `npm run build` in `web`:
   - TypeScript compilation and Vite build succeeded with **code 0**.

3. **Checklist & Documentation**:
   - Checked off `PLAN-004` in [`docs/tasks-checklist.md`](../../docs/tasks-checklist.md).
   - Updated completed modules table and roadmap item in [`README.md`](../../README.md).
