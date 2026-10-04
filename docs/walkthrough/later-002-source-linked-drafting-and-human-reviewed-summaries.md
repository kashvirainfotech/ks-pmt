# LATER-002: Source-Linked Drafting & Human-Reviewed Summaries

**Date & Time**: 2026-10-02 13:38:00 (IST)  
**Specification Reference**: `docs/requirements.md` §3.40 (LATER-002)  
**Implementation Roadmap**: `docs/plan.md` Phase 10 & `docs/tasks-checklist.md` §11.6  
**Status**: ✅ Completed & Verified

---

## 1. Executive Summary & Measurement Contract

`LATER-002` ("Source-Linked Drafting & Human-Reviewed Summaries") addresses the final functional requirement in Section 11 of the KS-PMT roadmap. It establishes a deterministic, auditable drafting and gap detection assistance engine coupled with a mandatory human-in-the-loop review ledger.

### Key Capabilities Delivered:
1. **Source-Linked Coverage Gap & Duplicate Engine**:
   - **`RULE-GAP-TESTING`**: Automated radar scans identifying approved requirements lacking linked QA test cases.
   - **`RULE-GAP-ACCEPTANCE`**: Automated scans detecting ready-for-development specifications missing verifiable Given-When-Then acceptance criteria.
   - **`RULE-DUP-TASKS`**: Deterministic token Jaccard similarity scanner detecting redundant tasks and defects across projects based on a configurable threshold.
2. **Deterministic 4-Phase Work Breakdown Structure (WBS) Drafter**:
   - Decomposes Epics and high-level tasks into Architecture, Backend, Frontend, and QA testing subtasks with proportional effort allocation.
3. **Given-When-Then Acceptance Criteria Drafter**:
   - Derives boundary conditions, invalid payload handling, and RBAC authorization criteria directly from requirement objectives.
4. **Sprint & Release Activity Summarizer**:
   - Compiles release notes categorized into Features and Bug Fixes.
   - Strict audience boundary: `CLIENT_SAFE` summaries strictly redact internal technical refactors and private labor details.
5. **Mandatory Human Review Ledger**:
   - Drafts are never published or saved automatically; they record `reviewed_by`, `reviewed_at`, `status` (`ACCEPTED`, `MODIFIED_AND_ACCEPTED`, `REJECTED`, `DISCARDED`), and `review_notes`.
   - **1-Click Instantiation**: Accepted drafts can instantly be materialized into live child subtasks or acceptance criteria in the database.

---

## 2. Database Schema & Static Installer

Following the canonical blank-database development policy in [AGENTS.md](../../AGENTS.md):
- Direct database execution was **strictly prohibited**.
- Schema definitions were updated in place with full audit columns (`created_by`, `created_at`, `updated_by`, `updated_at`, `is_active`).

### 2.1 Table Definitions (`dbscripts/tables/tables.sql`)
- **Table 119 (`draft_suggestions`)**:
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `draft_code VARCHAR(50) NOT NULL UNIQUE` (e.g. `DRF-WBS-1001`)
  - `draft_type VARCHAR(50)` (`DRAFT_SUBTASKS`, `DRAFT_ACCEPTANCE_CRITERIA`, `DRAFT_RELEASE_NOTES`, `DRAFT_SPRINT_SUMMARY`, `DRAFT_BUG_TRIAGE`, `GAP_SUGGESTION`, `DUPLICATE_SUGGESTION`)
  - `title VARCHAR(255) NOT NULL`
  - `source_entity_type VARCHAR(50)` (`TASK`, `REQUIREMENT`, `VERSION`, `SPRINT`, `CLIENT_INTAKE`, `PRODUCT_IDEA`, `PROJECT`)
  - `source_entity_id UUID NOT NULL`
  - `source_entity_code VARCHAR(50)`
  - `audience_scope VARCHAR(30)` (`INTERNAL_ONLY`, `CLIENT_SAFE`, `PUBLIC_COMMUNITY`)
  - `status VARCHAR(30)` (`PENDING_REVIEW`, `ACCEPTED`, `MODIFIED_AND_ACCEPTED`, `REJECTED`, `DISCARDED`)
  - `suggested_content JSONB NOT NULL DEFAULT '{}'::jsonb`
  - `reviewed_content JSONB`
  - `review_notes TEXT`
  - `reviewed_by UUID REFERENCES users(id)`
  - `reviewed_at TIMESTAMP WITH TIME ZONE`
  - `applied_entity_type VARCHAR(50)`
  - `applied_entity_id UUID`
  - Full audit tracking columns.
- **Table 120 (`draft_rule_configs`)**:
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `rule_code VARCHAR(50) NOT NULL UNIQUE` (`RULE-GAP-TESTING`, `RULE-GAP-ACCEPTANCE`, `RULE-DUP-TASKS`, `RULE-WBS-DEFAULT`, `RULE-REL-SUMMARY`)
  - `rule_name VARCHAR(150) NOT NULL`
  - `rule_type VARCHAR(50)` (`GAP_DETECTION`, `DUPLICATE_DETECTION`, `WBS_GENERATION`, `SUMMARY_GENERATION`)
  - `is_enabled BOOLEAN NOT NULL DEFAULT TRUE`
  - `similarity_threshold NUMERIC(5, 2) DEFAULT 0.70`
  - `rule_parameters JSONB NOT NULL DEFAULT '{}'::jsonb`
  - Full audit tracking columns.

### 2.2 Composite Performance Indexes (`dbscripts/indexes/indexes.sql`)
- `idx_draft_sugg_code` (`draft_code`)
- `idx_draft_sugg_source` (`source_entity_type`, `source_entity_id`)
- `idx_draft_sugg_status` (`status`)
- `idx_draft_sugg_type` (`draft_type`)
- `idx_draft_sugg_audience` (`audience_scope`)
- `idx_draft_rules_code` (`rule_code`)
- `idx_draft_rules_type` (`rule_type`, `is_enabled`)

### 2.3 RBAC Permissions & Seed Data (`dbscripts/inserts/inserts.sql`, `sample_data.sql`)
- Permissions added:
  - `DRAFTING:READ`: View draft suggestions, review history, and rules.
  - `DRAFTING:GENERATE`: Trigger automated drafting and coverage audits.
  - `DRAFTING:REVIEW`: Complete reviews, accept/modify/reject drafts, and adjust rule thresholds.
- Mapped to: `ROLE_SUPER_ADMIN`, `ROLE_PROJECT_MANAGER`, `ROLE_BRANCH_MANAGER`.
- Starter rule configurations and seed draft suggestions added to `sample_data.sql`.
- Static bundle regenerated via `node dbscripts/build-install.mjs`.
- Installer test verified: `node --test dbscripts/build-install.test.mjs` (**2/2 passed**).

---

## 3. Backend Architecture (`server/src/modules/drafting/`)

The backend engine provides deterministic algorithms and REST endpoints protected by `JwtAuthGuard` and `DynamicRbacGuard`:

1. **`draft-generator.ts`**:
   - `generateWbsDraft`: Computes 4-phase breakdown (Architecture 20%, Backend 40%, Frontend 25%, QA 15%).
   - `generateCriteriaDraft`: Formulates standard Given-When-Then criteria for positive, boundary/error, and authorization states.
   - `compileReleaseNotesDraft`: Categorizes version tasks into features and bug fixes; enforces `CLIENT_SAFE` redaction.
   - `computeTitleSimilarity`: Computes token Jaccard similarity with stopword filtering.
2. **`drafting.service.ts`**:
   - `getDrafts(query)`: Retrieves drafts with creator and reviewer metadata.
   - `getDraftById(id)`: Fetches complete draft record.
   - `generateDraft(dto, userId)`: Executes deterministic generators (`SUBTASKS`, `ACCEPTANCE_CRITERIA`, `RELEASE_NOTES`, `GAP_AUDIT`, `DUPLICATE_CHECK`).
   - `reviewDraft(id, dto, userId)`: Updates review state and conditionally instantiates accepted child tasks or criteria into live database records when `applyToSource = true`.
   - `getRuleConfigs()` / `updateRuleConfig(id, dto, userId)`: Manages rules and similarity thresholds.
3. **`drafting.controller.ts`**:
   - `GET /drafting/suggestions` (`DRAFTING:READ`)
   - `GET /drafting/suggestions/:id` (`DRAFTING:READ`)
   - `POST /drafting/generate` (`DRAFTING:GENERATE`)
   - `POST /drafting/suggestions/:id/review` (`DRAFTING:REVIEW`)
   - `GET /drafting/rules` (`DRAFTING:READ`)
   - `PUT /drafting/rules/:id` (`DRAFTING:REVIEW`)
4. **App Module Registration**:
   - Registered `DraftingModule` in [server/src/app.module.ts](../../server/src/app.module.ts).
   - Backend build test: `npm run build` in `server/` (**exited code 0**).

---

## 4. Frontend UI Workspace (`web/src/components/drafting/`)

A dedicated workspace was implemented at `/drafting`:

1. **`DraftingWorkspace.tsx`**:
   - **Suggestions Review Queue Tab**:
     - Status badges (`PENDING_REVIEW`, `ACCEPTED`, `MODIFIED_AND_ACCEPTED`, `REJECTED`, `DISCARDED`).
     - Type badges (`DRAFT_SUBTASKS`, `DRAFT_ACCEPTANCE_CRITERIA`, `DRAFT_RELEASE_NOTES`, `GAP_SUGGESTION`, `DUPLICATE_SUGGESTION`).
     - Audience scope indicators (`INTERNAL_ONLY`, `CLIENT_SAFE`, `PUBLIC_COMMUNITY`).
     - Fast multi-filter bar and real-time search.
   - **Review & Detail Modal**:
     - Inline editable content payload for subtasks (titles, hours) and criteria (Given, When, Then).
     - Audience redaction inspection for release notes.
     - Review notes input for decision audit trail.
     - "Automatically instantiate accepted items into live database records" 1-click toggle.
     - Action buttons: "Accept & Complete Review", "Reject Draft", "Discard".
   - **Drafting Generator Tab**:
     - Visual selection cards for WBS Subtasks, Given-When-Then Criteria, and Release Notes.
     - Source entity selector (Tasks, Requirements, Versions) or manual UUID input.
     - Audience scope boundary radio selection.
   - **Coverage Gap Radar Tab**:
     - "Run Live Coverage Audit" button scanning for missing test cases and acceptance criteria.
     - Gap resolution table with 1-click inspection.
   - **Rule Configurations Tab**:
     - Active toggle switches for each rule.
     - Interactive slider for Jaccard token similarity threshold (0.40 to 0.95).
2. **Navigation & Route Setup**:
   - Route `/drafting` registered in [web/src/App.tsx](../../web/src/App.tsx).
   - Sidebar item with `Sparkles` icon added under `Workspace` in [web/src/components/layout/Sidebar.tsx](../../web/src/components/layout/Sidebar.tsx).
   - Frontend build test: `npm run build` in `web/` (**exited code 0, 2173 modules transformed**).

---

## 5. Verification & Test Evidence

| Verification Step | Command | Result |
| :--- | :--- | :--- |
| **SQL Installer Test** | `node --test dbscripts/build-install.test.mjs` | **2/2 passed** (0 failures, 326ms) |
| **Backend NestJS Build** | `npm run build` (in `server/`) | **Exit code 0** (clean compilation) |
| **Frontend Vite Build** | `npm run build` (in `web/`) | **Exit code 0** (dist bundled in 2.62s) |

---

## 6. Operational Governance

- **Zero Git Commits / Pushes**: No git commit or push commands were executed; all changes remain staged/unstaged for developer review.
- **Zero Direct Database Executions**: No SQL statements or migrations were run against any active database instance.
- **Blank-Database Standard**: Maintained schema directly in canonical `CREATE TABLE` and `CREATE INDEX` scripts.
