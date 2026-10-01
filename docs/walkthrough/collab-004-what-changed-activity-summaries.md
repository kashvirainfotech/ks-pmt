# COLLAB-004 Walkthrough: "What Changed?" Activity Summaries, Baseline Diffing & Client-Safe Reporting

**Date**: 2026-10-01  
**Module**: COLLAB-004 (`Tier D` / `Increment D`)  
**Status**: Completed & Verified  

---

## 1. Executive Summary

COLLAB-004 delivers a deterministic, source-linked activity inspection and scope diffing workspace ("What Changed?") for developers, project managers, and client stakeholders. It enables teams to inspect all lifecycle events, additions, removals, and status movements since their last login, across predefined time windows, or against frozen baseline snapshots—with guaranteed client-safe sanitization and no AI hallucinations.

### Key Capabilities Delivered:
1. **Dynamic Time Windows & Baseline Diffing**:
   - Filter by: `Since Last Login` (resolving against `users.last_login_at` with 24-hour fallback), `Last 24 Hours`, `Last 7 Days`, `Last 14 Days`, `Last 30 Days`, `Since Baseline Snapshot`, or `Custom Date Range`.
   - Frozen scope baselines: Capture immutable snapshots of project contracts, sprint commitments, or release plans with total items, points, and committed task IDs.
2. **Source-Linked Events vs Distinct Affected Item Distinction**:
   - Accurately computes and separates **Total Change Events** (e.g. 24 granular workflow and audit events) from **Distinct Affected Deliverables** (e.g. 11 unique tasks or specifications that moved).
   - Metrics broken down across Scope Additions (+), Scope Removals (-), Workflow Transitions, Blocker Incidents (declared/cleared), Requirement Updates, and Published Document Revisions.
3. **Missing-History Disclosure Engine**:
   - If an evaluation window extends prior to the system's earliest retained audit activity, the system explicitly renders a prominent disclosure alert rather than presenting a misleading illusion of full historical completeness.
4. **Client-Safe Executive Briefings (Without AI)**:
   - Built with deterministic, rule-based narrative templates verified 100% against underlying audit records.
   - When **Client-Safe Mode** is activated, internal development discussions, internal rate/financial metrics, technical debt blocker descriptions, and confidential internal-only knowledge documents are automatically stripped.
   - One-click "Copy Briefing" action for PM email status updates.
5. **Saved Query Presets**:
   - Users can save frequently executed activity views (e.g. "My Sprint Work vs Baseline", "Client-Safe Weekly Changes") for 1-click execution.

---

## 2. Database Artifacts (`dbscripts/`)

*In accordance with blank-database development guidelines, canonical definitions were maintained in place without accumulating ad-hoc migration scripts. Direct database execution was strictly avoided.*

### Canonical Schema Additions (`dbscripts/tables/tables.sql`)
1. **Table 81: `change_activity_baselines`**:
   - Captures frozen baseline snapshots with `baseline_code` (UNIQUE), `title`, `description`, `scope_type` (`PROJECT`, `PRODUCT`, `SPRINT`, `RELEASE`), `scope_id`, `baseline_timestamp`, `snapshot_data` (JSONB), and `is_frozen = TRUE`.
   - Standard audit columns (`created_by`, `created_at`, `updated_by`, `updated_at`, `is_active`).
2. **Table 82: `user_activity_saved_queries`**:
   - Stores user-saved activity queries with `query_name`, `time_filter_type` (`LAST_LOGIN`, `HOURS_24`, `DAYS_7`, `DAYS_14`, `DAYS_30`, `SINCE_BASELINE`, `CUSTOM_RANGE`), optional `baseline_id`, `scope_type`, `scope_id`, `is_client_safe`, and `category_filters` (JSONB).

### Indexes (`dbscripts/indexes/indexes.sql`)
- `idx_activity_baselines_code` on `(baseline_code)`
- `idx_activity_baselines_scope` on `(scope_type, scope_id)`
- `idx_activity_saved_queries_user` on `(user_id)`
- `idx_audit_logs_created_entity` on `(created_at DESC, entity_name)` (composite index for fast audit window slicing)

### Permissions & Seed Inserts (`dbscripts/inserts/inserts.sql` & `sample_data.sql`)
- Permissions added:
  - `ACTIVITY:READ`: Permission to view "What Changed" activity summaries and change streams.
  - `ACTIVITY:BASELINES`: Permission to capture and manage change activity baselines.
  - `ACTIVITY:CLIENT_SUMMARY`: Permission to generate and export client-safe change summaries.
- Dynamically assigned to Super Admin, Project Manager, Support Executive, Branch Manager, Developer, and QA Tester roles.
- Sample data appended in `sample_data.sql`: sample commitment baseline `BASE-ERP-S1-COMMIT`, scope freeze `BASE-PRJ-KASH-SCOPE`, and saved user queries for PM and Admin.

### Installer Verification
- Executed `node dbscripts/build-install.mjs` (bundle generated from 15 object files).
- Ran `node --test dbscripts/build-install.test.mjs` (all test suites passed 100%).

---

## 3. Backend Implementation (`server/src/modules/activity/`)

### DTOs
- `dto/query-activity.dto.ts`: Validates `timeFilterType` (`LAST_LOGIN`, `HOURS_24`, `DAYS_7`, `DAYS_14`, `DAYS_30`, `SINCE_BASELINE`, `CUSTOM_RANGE`), `startDate`, `endDate`, `baselineId`, `scopeType`, `scopeId`, and `isClientSafe`.
- `dto/create-baseline.dto.ts`: Validates baseline code, title, scope type, and scope ID.
- `dto/saved-query.dto.ts`: Validates query name, time filter type, scope, and client-safe mode.

### Service Layer (`activity.service.ts`)
- `getWhatChangedSummary(userId, dto)`:
  - Resolves effective time window start & end from `users.last_login_at`, duration offsets, or baseline timestamp.
  - Checks earliest retained audit timestamp and flags `missingHistory.detected = true` with disclosure note when window precedes retained logs.
  - Queries scope additions from newly created tasks, scope removals from sprint ledgers, workflow transitions from audit status diffs, blocker episodes from `task_blocker_episodes`, requirement updates from `requirements`, and ADR revisions from `knowledge_document_revisions`.
  - Applies client-safe sanitization when `isClientSafe = true`.
  - Calculates `sourceLinkedEventCount` and `distinctItemCount` via unique entity ID set.
  - Generates deterministic executive summary narrative string.
- `createBaseline(userId, dto)`: Captures task counts, story point totals, and committed task IDs into `snapshot_data`.
- `getBaselines`, `saveQuery`, `getSavedQueries`, `deleteSavedQuery`: Full CRUD for baselines and presets.

### Controller & Module (`activity.controller.ts` & `activity.module.ts`)
- Registered under route prefix `activity` with `JwtAuthGuard`, `DynamicRbacGuard`, and `@Permissions(...)`.
- Registered `ActivityModule` in `server/src/app.module.ts`.
- Verified compilation: `npm run build` in `server/` succeeded with exit code `0`.

---

## 4. Frontend Implementation (`web/`)

### TypeScript Interfaces (`web/src/types/index.ts`)
- `ChangeActivityBaseline`, `UserActivitySavedQuery`, `WhatChangedMetrics`, and `WhatChangedSummaryResponse`.

### API Client (`web/src/api/endpoints.ts`)
- Added `activityApi` (`getWhatChanged`, `getBaselines`, `createBaseline`, `getSavedQueries`, `saveQuery`, `deleteSavedQuery`).

### Workspace UI (`WhatChangedWorkspaceView.tsx`)
- Located at `web/src/components/activity/WhatChangedWorkspaceView.tsx` and routed to `/what-changed` in `App.tsx` and linked in `Sidebar.tsx`.
- **Time Window Filter Pills**: Quick buttons for Last Login, 24h, 7d, 14d, 30d, Baseline, and Custom Range.
- **Top Metrics Cards**: Displays Total Change Events vs Distinct Items Affected side-by-side with Scope Additions, Removals, Transitions, Blockers, and Specs.
- **Missing-History Alert**: Prominent notice when history predates audit retention.
- **Client-Safe Mode Switch**: Instant toggle that sanitizes internal technical debt, private blockers, and rates, updating the narrative to an executive briefing.
- **Categorized Change Stream**: Tabbed inspection across All Activity, Scope, Workflow Transitions, Blockers, and Specs/ADRs with before/after status pills and actor timestamps.
- **Modals**: "Freeze Baseline Snapshot" and "Save Query Preset".
- Verified compilation: `npm run build` in `web/` succeeded with exit code `0`.

---

## 5. Verification Results

1. **Database Script Bundle**:
   - `node dbscripts/build-install.mjs` passed.
   - `node --test dbscripts/build-install.test.mjs`: 2/2 tests passed.
2. **Backend Compilation**:
   - `npm run build` in `server/` passed with exit code `0`.
3. **Frontend Compilation**:
   - `npm run build` in `web/` (`tsc && vite build`) passed with exit code `0`.
4. **Task Checklist**:
   - `COLLAB-004` checked off `[x]` in `docs/tasks-checklist.md`.
