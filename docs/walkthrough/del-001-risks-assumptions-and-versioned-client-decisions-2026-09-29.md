# DEL-001: Risks, Assumptions & Versioned Client Decisions Walkthrough

**Date:** 2026-09-29  
**Status:** ✅ Complete & Verified (Backend & Web UI)  
**Author:** Lead Full-Stack Engineer (KS-PMT Team)  
**Requirement Reference:** [SRS §3.29](file:///c:/Projects/KashviraInfotech/ks-pmt/docs/requirements.md#L338-L345) & [Increment C Plan](file:///c:/Projects/KashviraInfotech/ks-pmt/docs/plan.md#L154)

---

## 1. Executive Summary

`DEL-001` introduces a unified **RAID Register (Risks, Assumptions, Issues, Decisions)** and **Client Action Requests Engine** for KS-PMT. It formally bridges delivery risk management, architecture decision records (ADR), and client-side decision governance.

### Core Architecture & Business Rules
1. **Unified RAID Register (`raid_items`, `raid_item_revisions`)**:
   - Manages four distinct categories with specialized lifecycles:
     - **RISK**: `IDENTIFIED`, `MONITORING`, `MITIGATING`, `CLOSED`, `REALIZED`. Computes exposure score from Likelihood $\times$ Impact matrices with explicit mitigation and contingency plans.
     - **ASSUMPTION**: `VALIDATING`, `CONFIRMED`, `INVALIDATED` with target review dates.
     - **DECISION (ADR)**: `PROPOSED`, `ACCEPTED`, `REJECTED`, `SUPERSEDED`. Captures decision context, alternatives considered (with pros/cons, costs, rejected reasons), rationale, consequences, and technical/business impact.
     - **ISSUE**: `OPEN`, `RESOLVED`.
   - **Separation of Concerns**: Strictly separates possible future risks from active task blocker episodes (`task_blocker_episodes`). Realized risks can link to blocker episodes or tasks without conflating the two.
2. **Architecture Decision Records (ADR) & Supersession Lineage**:
   - Tracks predecessor (`supersedes_id`) and successor (`superseded_by_id`) relationships with full immutable revision snapshots.
   - **Enforced Business Constraint**: A superseded technical decision does not itself approve a commercial scope change. Commercial alterations continue to require formal quotations via `CLIENT-004`.
3. **Published Client Action Requests (`client_action_requests`)**:
   - Project Managers can formulate and dispatch specific action and decision requests to client stakeholders with SLA due dates and priorities (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
   - Supports **Approver Authority Gate (`requires_approver = TRUE`)**: Enforces that only designated client approvers (`contact.is_approver = TRUE` or scope/UAT permission grants) can record official sign-off decisions (`APPROVED`, `REJECTED`, `INFO_PROVIDED`, `SCOPE_CHANGE_REQUESTED`).
4. **Zero Confidentiality Leakage**:
   - An unresolved client decision appears in the client's action list without exposing the internal risk discussion (`internal_discussion` is strictly never selected or returned on customer portal endpoints).
   - Decisions retain problem context, alternatives, and consequences without exposing private source tickets or internal developer deliberations.

---

## 2. Database Schema Additions

Three canonical tables were appended to [`dbscripts/tables/tables.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/tables/tables.sql#L1585), with indexes in [`dbscripts/indexes/indexes.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/indexes/indexes.sql#L270), permissions in [`dbscripts/inserts/inserts.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/inserts/inserts.sql#L310), and execution manifest in [`dbscripts/install.psql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/install.psql). The installer bundle was regenerated via `node dbscripts/build-install.mjs` (0 SQL executed directly):

### Table 57: `raid_items`
- `id` (UUID PK)
- `item_code` (VARCHAR(50) UNIQUE - e.g. `RSK-2026-0001`, `DEC-2026-0001`)
- `category` (VARCHAR(20) - `RISK`, `ASSUMPTION`, `DECISION`, `ISSUE`)
- `project_id`, `product_id` (UUID FKs)
- `title` (VARCHAR(255) NOT NULL), `description` (TEXT)
- `owner_user_id` (UUID FK to `users`), `review_date` (DATE)
- `status` (VARCHAR(30) NOT NULL)
- Risk matrix: `likelihood`, `impact`, `risk_score`, `mitigation_plan`, `contingency_plan`
- Confidential internal notes: `internal_discussion` (TEXT - strictly zero leakage)
- Linkages: `requirement_id`, `milestone_id`, `task_id`, `component_id`, `realized_blocker_episode_id`
- ADR fields: `participants` (JSONB), `context` (TEXT), `alternatives_considered` (JSONB), `rationale` (TEXT), `consequences` (TEXT), `technical_impact` (TEXT), `business_impact` (TEXT)
- Supersession: `superseded_by_id` (UUID FK self-reference), `supersedes_id` (UUID FK self-reference)
- Client visibility: `is_client_shared` (BOOLEAN), `client_visibility` (`INTERNAL_ONLY`, `CLIENT_SUMMARY`, `CLIENT_FULL`), `client_summary` (TEXT)
- `current_revision` (INT DEFAULT 1)
- Standard audit columns (`created_by`, `created_at`, `updated_by`, `updated_at`, `is_active`)

### Table 58: `client_action_requests`
- `id` (UUID PK)
- `action_code` (VARCHAR(50) UNIQUE - e.g. `ACT-2026-0001`)
- `raid_item_id` (UUID FK to `raid_items`)
- `project_id`, `product_id`, `client_id` (UUID FKs)
- `title` (VARCHAR(255) NOT NULL), `description` (TEXT NOT NULL)
- `context_for_client` (TEXT NOT NULL - sanitized client-facing context)
- `priority` (VARCHAR(20) - `LOW`, `MEDIUM`, `HIGH`, `URGENT`)
- `due_date` (DATE NOT NULL)
- `assigned_contact_id` (UUID FK to `client_contacts`)
- `requires_approver` (BOOLEAN DEFAULT FALSE)
- `status` (VARCHAR(30) - `PENDING`, `IN_REVIEW`, `RESPONDED`, `RESOLVED`, `CANCELLED`)
- `response_text` (TEXT), `responded_by_contact_id` (UUID FK), `responded_at` (TIMESTAMPTZ)
- `resulting_decision` (VARCHAR(30) - `APPROVED`, `REJECTED`, `INFO_PROVIDED`, `SCOPE_CHANGE_REQUESTED`)
- `resulting_change_request_id` (UUID FK to `change_requests`)
- Standard audit columns (`created_by`, `created_at`, `updated_by`, `updated_at`, `is_active`)

### Table 59: `raid_item_revisions`
- `id` (UUID PK), `raid_item_id` (UUID FK)
- `revision_number` (INT NOT NULL)
- `snapshot` (JSONB NOT NULL - immutable copy of complete record)
- `change_summary` (TEXT)
- Standard audit columns (`created_by`, `created_at`, `updated_by`, `updated_at`, `is_active`)

---

## 3. Backend Implementation & Security Verification

- **DTOs** ([`server/src/modules/raid/dto/`](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/modules/raid/dto/)):
  - `create-raid-item.dto.ts`, `update-raid-item.dto.ts`, `create-client-action-request.dto.ts`, `respond-client-action-request.dto.ts`, `query-raid.dto.ts`.
- **[`RaidService`](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/modules/raid/raid.service.ts)**:
  - Automated prefix-based code sequences (`RSK-YYYY-XXXX`, `ASM-YYYY-XXXX`, `DEC-YYYY-XXXX`, `ACT-YYYY-XXXX`).
  - Score computation from 4x4 matrix ($1 \dots 16$).
  - Revision snapshotting on creation and every update.
  - Decision supersession workflow creating successor records, linking predecessor, and preserving full lineage.
  - Zero-leakage customer portal endpoints with grant enforcement and approver verification.
- **Controllers & Modules**:
  - Internal management: [`RaidController`](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/modules/raid/raid.controller.ts) & [`RaidModule`](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/modules/raid/raid.module.ts).
  - Customer portal integration: [`ClientPortalController`](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/modules/client-portal/client-portal.controller.ts) (`/client-portal/action-requests`, `/client-portal/action-requests/:id/respond`, `/client-portal/decisions`).
  - Registered in [`AppModule`](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/app.module.ts) and [`ClientPortalModule`](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/modules/client-portal/client-portal.module.ts).
- **Backend Unit Tests**:
  - [`raid.service.spec.ts`](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/modules/raid/raid.service.spec.ts): **9/9 unit tests passed** covering risk scoring, decision ADR creation, revision incrementing, supersession lineage, approver restrictions, and zero-leakage queries.

---

## 4. Frontend Implementation

1. **Dedicated RAID & Decision Workspace** ([`RaidWorkspaceView.tsx`](file:///c:/Projects/KashviraInfotech/ks-pmt/web/src/components/raid/RaidWorkspaceView.tsx)):
   - **KPI Metric Strip**: Open Risks, High/Critical Exposure counter, Assumptions under validation, Active Decisions, and Pending Client Actions.
   - **Category Switcher & Filter Bar**: Filter by category (`RISKS`, `ASSUMPTIONS`, `DECISIONS`, `CLIENT_ACTIONS`), project, product, status, and text search.
   - **Interactive Drawer / Modal Builder**:
     - Risk builder with Likelihood $\times$ Impact selectors and score badge.
     - Architecture Decision Record (ADR) editor with Context, Alternatives considered (with pros/cons/cost/reasons), Rationale, Consequences, and Technical/Business impact.
     - Internal discussion field labeled with confidentiality shield banner.
     - Client sharing controls (`is_client_shared`, `client_visibility`).
   - **Supersede Decision Action**: 1-click modal that creates a successor decision, updates predecessor to `SUPERSEDED`, and maintains full traceability without approving commercial changes.
   - **Publish Client Action Modal**: Allows PM to target projects, clients, specify due dates, and enforce approver-only restriction.
2. **Customer Portal Integration** ([`CustomerPortalWorkspace.tsx`](file:///c:/Projects/KashviraInfotech/ks-pmt/web/src/components/clients/CustomerPortalWorkspace.tsx)):
   - **Actions Needed Tab**: List of action/decision requests awaiting response, SLA deadlines, priority badges, and response modal with decision outcomes (`APPROVED`, `REJECTED`, `INFO_PROVIDED`, `SCOPE_CHANGE_REQUESTED`).
   - **Approver Gate Enforcement**: If an action requires approver authority and the contact is not an approver, clear messaging indicates that an authorized client approver must sign off.
   - **Decisions Log Tab**: Clean ADR reader displaying client-shared decisions, context, agreed rationale, trade-offs, and alternatives considered, with zero internal risk discussion leaked.
3. **Navigation & Routing**:
   - Registered `/raid` route in [`web/src/App.tsx`](file:///c:/Projects/KashviraInfotech/ks-pmt/web/src/App.tsx).
   - Added `RAID & Decisions` nav link with `ShieldAlert` icon in [`web/src/components/layout/Sidebar.tsx`](file:///c:/Projects/KashviraInfotech/ks-pmt/web/src/components/layout/Sidebar.tsx).

---

## 5. Verification & Test Suite Summary

- **Backend Unit Tests**:
  ```bash
  Test Suites: 25 passed, 25 total
  Tests:       197 passed, 197 total
  Snapshots:   0 total
  Time:        23.323 s
  ```
- **Web Frontend Production Build**:
  ```bash
  npm run build
  ✓ 2155 modules transformed.
  ✓ built in 1.83s (0 errors)
  ```
- **Database Scripts**:
  - `node dbscripts/build-install.mjs` executed cleanly without direct SQL execution.
- **Checklist & Roadmap**:
  - Marked `[x] **DEL-001**` and `[x] **CLIENT-002 / DEL-001 — detail acceptance**` in [`docs/tasks-checklist.md`](file:///c:/Projects/KashviraInfotech/ks-pmt/docs/tasks-checklist.md#L369).
  - Marked Tier C as complete in [`README.md`](file:///c:/Projects/KashviraInfotech/ks-pmt/README.md#L131).
