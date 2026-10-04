# Walkthrough: PROD-002 — Product Goals & Post-Release Outcome Reviews

## Executive Summary

Module `PROD-002` ("Product Goals & Outcome Reviews") bridges high-level strategic software objectives and post-release reality. It enables product managers and delivery teams to define quantifiable operational metrics with baseline and target thresholds, monitor actual progress towards those targets, and formally conduct dated post-release outcome evaluation reviews linked directly to shipped software versions and discovery ideas without double consumption of approved client allowances.

---

## 1. Architecture & Database Design

### Canonical Database Tables (Blank-Database Schema in `dbscripts/tables/tables.sql`)

1. **Table 83: `product_goals`**
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `goal_code VARCHAR(100) UNIQUE NOT NULL` (e.g., `GOAL-2026-0001`)
   - `product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE`
   - `title VARCHAR(255) NOT NULL`
   - `description TEXT`
   - `category VARCHAR(50) NOT NULL` (`ADOPTION`, `PERFORMANCE`, `REVENUE_GROWTH`, `QUALITY_RELIABILITY`, `USER_SATISFACTION`, `STRATEGIC`)
   - `metric_name VARCHAR(150) NOT NULL` (e.g., `Active Customer E-Invoice Adoption Rate`)
   - `metric_unit VARCHAR(50) NOT NULL` (e.g., `PERCENT`, `MILLISECONDS`, `COUNT`, `CURRENCY`, `SCORE`)
   - `baseline_value NUMERIC(15, 2) NOT NULL DEFAULT 0.00`
   - `target_value NUMERIC(15, 2) NOT NULL`
   - `current_value NUMERIC(15, 2) NOT NULL DEFAULT 0.00`
   - `target_date DATE NOT NULL`
   - `owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL`
   - `status VARCHAR(50) NOT NULL DEFAULT 'IN_PROGRESS'` (`DRAFT`, `IN_PROGRESS`, `ACHIEVED`, `MISSED`, `ABANDONED`)
   - Audit Columns: `is_active`, `created_by`, `created_at`, `updated_by`, `updated_at`.

2. **Table 84: `product_outcome_reviews`**
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `review_code VARCHAR(100) UNIQUE NOT NULL` (e.g., `REV-2026-0001`)
   - `product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE`
   - `goal_id UUID REFERENCES product_goals(id) ON DELETE SET NULL`
   - `version_id UUID REFERENCES versions(id) ON DELETE SET NULL`
   - `idea_id UUID REFERENCES product_ideas(id) ON DELETE SET NULL` (closes the discovery loop from `PROD-001`)
   - `review_title VARCHAR(255) NOT NULL`
   - `review_date DATE NOT NULL DEFAULT CURRENT_DATE`
   - `reviewer_user_id UUID REFERENCES users(id) ON DELETE SET NULL`
   - `actual_metric_value NUMERIC(15, 2)`
   - `outcome_verdict VARCHAR(50) NOT NULL` (`MET_EXPECTATIONS`, `EXCEEDED_EXPECTATIONS`, `BELOW_EXPECTATIONS`, `INCONCLUSIVE`)
   - `adoption_observations TEXT` (Telemetry and user adoption behavior)
   - `customer_evidence TEXT` (Metrics proof and direct feedback quotes)
   - `feedback_summary TEXT` (Qualitative customer feedback)
   - `learnings_and_next_steps TEXT` (Engineering & roadmap follow-ons)
   - `reconciled_allowance_used NUMERIC(10, 2) DEFAULT 0.00` (Reconciles approved customer allowance without double consumption)
   - Audit Columns: `is_active`, `created_by`, `created_at`, `updated_by`, `updated_at`.

### Composite Indexes (`dbscripts/indexes/indexes.sql`)
- `idx_product_goals_prod` on `product_goals(product_id, status)`
- `idx_product_goals_code` on `product_goals(goal_code)`
- `idx_product_goals_target_date` on `product_goals(target_date)`
- `idx_product_goals_owner` on `product_goals(owner_user_id)`
- `idx_outcome_reviews_prod` on `product_outcome_reviews(product_id, review_date DESC)`
- `idx_outcome_reviews_code` on `product_outcome_reviews(review_code)`
- `idx_outcome_reviews_goal` on `product_outcome_reviews(goal_id)`
- `idx_outcome_reviews_version` on `product_outcome_reviews(version_id)`
- `idx_outcome_reviews_idea` on `product_outcome_reviews(idea_id)`
- `idx_outcome_reviews_reviewer` on `product_outcome_reviews(reviewer_user_id)`

### RBAC Permissions (`dbscripts/inserts/inserts.sql`)
- `PRODUCT_GOALS:READ`: View product goals and outcome reviews (Super Admin, PM, Branch Manager, Developer, QA).
- `PRODUCT_GOALS:MANAGE`: Create, edit, and track product goals and metrics (Super Admin, PM).
- `PRODUCT_OUTCOMES:REVIEW`: Conduct post-release outcome evaluation reviews (Super Admin, PM, QA).

---

## 2. Backend Implementation (`server/src/modules/product-goals/`)

- **DTOs**:
  - `CreateProductGoalDto`, `UpdateProductGoalDto` (class-validator decorators for all metric types, enum categories, status).
  - `CreateOutcomeReviewDto` (verdict enums, allowance tracking, qualitative telemetry).
  - `QueryProductGoalsDto`, `QueryOutcomeReviewsDto` (filtering by product, category, status, verdict, text search, pagination).
- **Service (`ProductGoalsService`)**:
  - Auto-code sequence generators for `GOAL-YYYY-XXXX` and `REV-YYYY-XXXX`.
  - Progress calculation engine accommodating both standard (higher is better) and inverted metrics (e.g. latency, error rate where lower is better).
  - Automatic goal progress synchronization: when an outcome review with an actual metric value is submitted, the linked goal's `current_value` is updated and marked `ACHIEVED` if expectations are met or exceeded.
  - Reconciliation of approved allowance usage without double consumption.
  - Aggregated KPI summary endpoint (`/product-goals/summary`).
- **Controller (`ProductGoalsController`)**:
  - Full REST endpoints protected by `JwtAuthGuard` and `DynamicRbacGuard`.
- **Module (`ProductGoalsModule`)**:
  - Registered into `AppModule`.

---

## 3. Frontend Implementation (`web/`)

- **Types (`web/src/types/index.ts`)**:
  - `ProductGoal`, `ProductOutcomeReview`, `ProductGoalsSummary`, `ProductGoalCategory`, `ProductGoalStatus`, `OutcomeVerdict`.
- **API Client (`web/src/api/endpoints.ts`)**:
  - `productGoalsApi` methods: `getGoals`, `getGoalById`, `createGoal`, `updateGoal`, `updateGoalProgress`, `deleteGoal`, `getSummary`, `getOutcomeReviews`, `getOutcomeReviewById`, `createOutcomeReview`.
- **Workspace UI (`web/src/components/product-goals/ProductGoalsWorkspaceView.tsx`)**:
  - KPI Summary cards: Active Goals, Goal Categories, Outcome Reviews, Reconciled Allowance.
  - Tab 1: "Measurable Goals" grid with progress bars, baseline/target/current chips, latest review badge, Quick Progress Update modal, and Goal Details Drawer.
  - Tab 2: "Outcome Reviews" list displaying verdicts, actual metric observations, linked release/idea chips, qualitative findings, and retrospective next steps.
  - Interactive "Define Product Goal" modal and "Conduct Outcome Review" modal.
- **Routing & Navigation**:
  - Route `/product-goals` registered in `App.tsx`.
  - Sidebar item "Goals & Outcomes" with `Target` icon added under "Client Delivery" in `Sidebar.tsx`.

---

## 4. Verification & Validation

1. **Installer Bundle Test**:
   - `node dbscripts/build-install.mjs` executed cleanly.
   - `node --test dbscripts/build-install.test.mjs` passed with 2/2 tests passing (100% manifest order, transaction isolation, zero syntax errors).
2. **Server Compilation**:
   - `npm run build` in `server/` compiled cleanly with exit code `0`.
3. **Web Client Compilation**:
   - `npm run build` in `web/` built production bundle (`tsc && vite build`) cleanly with exit code `0`.
4. **Git Discipline**:
   - Zero `git commit` or `git push` executed. All changes remain unstaged/clean for manual developer review.
