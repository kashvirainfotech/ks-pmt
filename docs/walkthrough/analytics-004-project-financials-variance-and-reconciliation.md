# ANALYTICS-004: Project Financials, Variance and Reconciliation Walkthrough

## 1. Overview & Objectives

**ANALYTICS-004** implements **Project Financials, Variance & Reconciliation**, completing **Tier E: Delivery Intelligence** of the KS-PMT (Kashvira Infotech - Project & Product Management Tool) platform. It provides transparent financial health tracking, effort variance against immutable frozen baselines, multi-threshold budget consumption alerting, independent Estimate at Completion (EAC) projections, direct delivery contribution margins, effective-dated labor cost and billing rate cards, multi-currency conversion, and reconciliation between draft unapproved worklogs and approved billable timesheets.

### Core Measurement Contract & Acceptance Criteria

1. **Effort Variance (Hours)**:
   $$\text{Effort Variance} = \text{Actual Logged Hours} - \text{Baseline Estimated Hours}$$
   - Maintains the original approved baseline estimate separately from revised current task estimates.
   - When a project or task estimate is updated during execution, the initial frozen baseline remains untouched for variance auditing.

2. **Budget Consumption (%) & Alert Thresholds**:
   $$\text{Budget Consumption (\%)} = \left(\frac{\text{Actual Logged Hours}}{\text{Budgeted Hours}}\right) \times 100$$
   - Governed by configurable multi-tier threshold alert rules:
     - **NORMAL**: Consumption $< 75\%$ (or custom warning threshold).
     - **WARNING**: Consumption $\ge 75\%$ and $< 90\%$.
     - **CRITICAL**: Consumption $\ge 90\%$ and $\le 100\%$.
     - **OVERRUN**: Consumption $> 100\%$.

3. **Estimate at Completion (EAC)**:
   $$\text{EAC} = \text{Actual Logged Hours} + \text{Remaining Estimated Hours}$$
   - Independent remaining estimates: When actual hours exhaust the original estimate, the remaining estimate does not artificially zero out or collapse into a negative value; remaining work continues to reflect the real required effort until tasks reach done status.

4. **Direct Delivery Contribution & Margin**:
   $$\text{Direct Contribution} = \text{Gross Revenue} - \text{Direct Labor Delivery Costs}$$
   $$\text{Contribution Margin (\%)} = \left(\frac{\text{Direct Contribution}}{\text{Gross Revenue}}\right) \times 100$$
   - **N/A Handling**: For internal, fixed-price unallocated, non-billable, or zero-revenue projects, the contribution margin explicitly renders as `N/A` rather than an invalid `0%` or divide-by-zero error.

5. **Effective-Dated Rate Snapshots**:
   - Billing and internal labor cost rates are recorded per project, role, or individual user with `effective_from` and `effective_to` date bounds.
   - Rate changes do not retroactively alter the financial margins or costs of historical worklog periods.

6. **Reconciliation & Privacy Governance**:
   - Reconciles unapproved draft worklogs (`DRAFT`, `SUBMITTED`, `REJECTED`) alongside approved billable timesheet hours (`APPROVED`) from `TIME-001` without double-counting.
   - **Confidentiality Rule**: Internal labor cost rates and contribution margins are treated as confidential executive data; they are strictly redacted unless the user holds the `FINANCIALS:COST_RATES_VIEW` permission or `SUPER_ADMIN` role.

---

## 2. Database Schema Artifacts

In accordance with the blank-database development policy defined in `AGENTS.md` and `GEMINI.md`, schema updates were maintained canonically in `dbscripts/tables/tables.sql`.

### 2.1 In-Place Table Update: `tasks`

Updated `tasks` table definition in `dbscripts/tables/tables.sql` to track both baseline and independent remaining effort:
```sql
baseline_estimated_hours NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
remaining_hours NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
```

### 2.2 Table 106: `project_financial_rates` (`dbscripts/tables/tables.sql`)

Stores effective-dated rate cards for billing revenue and internal labor costs:
```sql
CREATE TABLE IF NOT EXISTS project_financial_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_code VARCHAR(50),
    rate_type VARCHAR(20) NOT NULL CHECK (rate_type IN ('BILLING', 'LABOR_COST', 'BLENDED')),
    rate_code VARCHAR(50) NOT NULL,
    hourly_rate NUMERIC(10, 2) NOT NULL CHECK (hourly_rate >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    effective_from DATE NOT NULL,
    effective_to DATE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_fin_rates_effective_range CHECK (effective_to IS NULL OR effective_to >= effective_from)
);
```

### 2.3 Table 107: `project_financial_baselines` (`dbscripts/tables/tables.sql`)

Stores formal snapshot baselines of project scope, budget hours, and financial caps:
```sql
CREATE TABLE IF NOT EXISTS project_financial_baselines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    baseline_code VARCHAR(50) NOT NULL,
    baseline_name VARCHAR(150) NOT NULL,
    baseline_type VARCHAR(30) NOT NULL CHECK (baseline_type IN ('CONTRACT_ORIGINAL', 'APPROVED_SCOPE_REVISION', 'INTERNAL_FORECAST', 'REBASELINE')),
    budget_hours NUMERIC(10, 2) NOT NULL CHECK (budget_hours >= 0),
    budget_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (budget_amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    warning_threshold_pct NUMERIC(5, 2) NOT NULL DEFAULT 75.00 CHECK (warning_threshold_pct > 0 AND warning_threshold_pct <= 100),
    critical_threshold_pct NUMERIC(5, 2) NOT NULL DEFAULT 90.00 CHECK (critical_threshold_pct > warning_threshold_pct AND critical_threshold_pct <= 150),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    is_frozen BOOLEAN NOT NULL DEFAULT FALSE,
    frozen_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_project_baseline_code UNIQUE (project_id, baseline_code)
);
```

### 2.4 Table 108: `project_financial_metrics` (`dbscripts/tables/tables.sql`)

Stores periodic financial and effort performance snapshots (monthly, sprint, or milestone):
```sql
CREATE TABLE IF NOT EXISTS project_financial_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    baseline_id UUID REFERENCES project_financial_baselines(id) ON DELETE SET NULL,
    metric_period VARCHAR(30) NOT NULL,
    period_start_date DATE NOT NULL,
    period_end_date DATE NOT NULL,
    approved_billable_hours NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    unapproved_draft_hours NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_logged_hours NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    remaining_hours NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    estimate_at_completion_hours NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    effort_variance_hours NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    budget_consumption_pct NUMERIC(7, 2) NOT NULL DEFAULT 0.00,
    threshold_alert_state VARCHAR(20) NOT NULL DEFAULT 'NORMAL' CHECK (threshold_alert_state IN ('NORMAL', 'WARNING', 'CRITICAL', 'OVERRUN')),
    total_billing_revenue NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_direct_cost NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    direct_contribution NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    contribution_margin_pct NUMERIC(6, 2),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    is_reconciled BOOLEAN NOT NULL DEFAULT FALSE,
    reconciled_at TIMESTAMP WITH TIME ZONE,
    reconciled_by UUID REFERENCES users(id),
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_fin_metrics_period CHECK (period_end_date >= period_start_date)
);
```

### 2.5 Table 109: `currency_exchange_rates` (`dbscripts/tables/tables.sql`)

Stores currency conversion ratios for multi-currency contracts and rate conversions:
```sql
CREATE TABLE IF NOT EXISTS currency_exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    exchange_rate NUMERIC(12, 6) NOT NULL CHECK (exchange_rate > 0),
    effective_date DATE NOT NULL,
    source VARCHAR(100) DEFAULT 'MANUAL',
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_currency_pair_date UNIQUE (from_currency, to_currency, effective_date)
);
```

### 2.6 Performance Indexes (`dbscripts/indexes/indexes.sql`)

Appended high-performance composite indexes:
- `idx_fin_rates_project`, `idx_fin_rates_user`, `idx_fin_rates_role`, `idx_fin_rates_dates`, `idx_fin_rates_code`
- `idx_fin_baselines_project`, `idx_fin_baselines_code`, `idx_fin_baselines_date`
- `idx_fin_metrics_project`, `idx_fin_metrics_period`, `idx_fin_metrics_baseline`
- `idx_currency_rates_pair`

### 2.7 Seed Permissions & Sample Data (`dbscripts/inserts/`)

1. **System Permissions (`inserts.sql`)**:
   - `FINANCIALS:READ`: View project financial metrics, baselines, and burn curves.
   - `FINANCIALS:MANAGE`: Create/freeze baselines, record rate cards, and update FX rates.
   - `FINANCIALS:COST_RATES_VIEW`: High-privilege permission required to view internal labor cost rates and contribution margins.
   - Mapped to `SUPER_ADMIN`, `PROJECT_MANAGER`, and `BRANCH_MANAGER` roles.
2. **Realistic Seed Data (`sample_data.sql`)**:
   - Pre-seeded rate cards (Developer, QA Lead, Tech Lead) for billing and cost rates.
   - Active contract original baseline with 75% warning and 90% critical alert thresholds.
   - Historical periodic metric snapshots and FX rates (USD/INR, EUR/INR, GBP/INR).
3. **Static Build & Automated Test**:
   - Generated static install manifest bundle via `node dbscripts/build-install.mjs`.
   - Verified via `node --test dbscripts/build-install.test.mjs` (2/2 passing tests, 0 failures).

---

## 3. Backend REST Implementation

Built modular backend services under `server/src/modules/financial-analytics/`:

### 3.1 DTOs
- `create-financial-baseline.dto.ts`: Validates project baseline registration, budget hours, budget amount, currency, and warning/critical threshold boundaries.
- `create-financial-rate.dto.ts`: Validates billing/labor-cost rate cards, role/user assignment, and effective date intervals.
- `record-financial-metric.dto.ts`: Validates periodic metric capture, hours breakdown, and financial figures.
- `currency-exchange.dto.ts`: Validates currency pair conversion ratios.
- `financial-query.dto.ts`: Query parameters for project, date range, and currency filtering.

### 3.2 Service Logic (`FinancialAnalyticsService`)

1. **Effort Reconciliation Engine**:
   - Aggregates approved billable timesheet hours (`APPROVED`) from `timesheet_entries`.
   - Simultaneously aggregates draft/submitted/rejected worklog hours (`unapproved_draft_hours`).
   - Total logged hours = approved billable + unapproved draft hours.
2. **Dynamic Variance & EAC**:
   - Computes baseline effort variance against the active frozen baseline.
   - Aggregates remaining task hours (`tasks.remaining_hours`) and computes $\text{EAC} = \text{Actual} + \text{Remaining}$.
3. **Budget Consumption & Alert Engine**:
   - Calculates $\text{Consumption \%} = (\text{Actual} / \text{Budgeted}) \times 100$.
   - Automatically determines alert state (`NORMAL`, `WARNING`, `CRITICAL`, `OVERRUN`) against baseline threshold rules.
4. **Direct Delivery Contribution & Margin Calculation**:
   - Direct Contribution = Total Revenue - Total Direct Labor Cost.
   - Contribution Margin % = Direct Contribution / Total Revenue $\times 100$.
   - Returns `null` (`N/A`) for projects without recorded billing revenue.
5. **Role-Based Financial Privacy Redaction**:
   - Masks `hourly_rate` on `LABOR_COST` rate cards for users lacking `FINANCIALS:COST_RATES_VIEW`.
   - Masks `total_direct_cost`, `direct_contribution`, and `contribution_margin_pct` from overview and metric ledgers when unauthorized.
6. **Cumulative Weekly Burn Curve**:
   - Aggregates weekly historical hours burned alongside baseline budget guide lines.

### 3.3 Controller Endpoints (`FinancialAnalyticsController`)

All endpoints are protected with `JwtAuthGuard`, `DynamicRbacGuard`, and `@Permissions()`:
- `GET /api/financial-analytics/overview`: Project financial summary, KPI cards, and burn curve.
- `GET /api/financial-analytics/baselines`: Fetch project baselines.
- `POST /api/financial-analytics/baselines`: Register new baseline.
- `PATCH /api/financial-analytics/baselines/:id/freeze`: Toggle baseline freeze status.
- `GET /api/financial-analytics/rates`: Fetch effective-dated rate cards.
- `POST /api/financial-analytics/rates`: Register rate card.
- `DELETE /api/financial-analytics/rates/:id`: Deactivate rate card.
- `GET /api/financial-analytics/metrics`: Fetch periodic ledger snapshots.
- `POST /api/financial-analytics/metrics`: Record period metric ledger.
- `GET /api/financial-analytics/exchange-rates`: List FX conversion rates.
- `POST /api/financial-analytics/exchange-rates`: Upsert FX rate.

---

## 4. Frontend Workspace Implementation

### 4.1 Web Types & API Endpoints
- Updated `web/src/types/index.ts` with `ProjectFinancialOverview`, `ProjectFinancialBaseline`, `ProjectFinancialRateCard`, `ProjectFinancialPeriodicMetric`, and `CurrencyExchangeRate`.
- Added `financialAnalyticsApi` to `web/src/api/endpoints.ts`.

### 4.2 Interactive UI Workspace (`FinancialAnalyticsWorkspace.tsx`)

Rendered in `web/src/components/financial-analytics/FinancialAnalyticsWorkspace.tsx` with 5 dedicated tabs:
1. **Overview & Thresholds**:
   - KPI Banner: Effort Variance, Budget Consumption %, EAC, Contribution Margin (or `N/A`), and Active Threshold Badge (`NORMAL` in green, `WARNING` in yellow, `CRITICAL` in orange, `OVERRUN` in red).
   - Effort Reconciliation Panel: Approved Billable Hours vs Unapproved Draft Worklogs vs Independent Remaining Hours.
   - Commercial Financials Panel: Billed Revenue, Confidential Direct Labor Cost, and Direct Contribution.
   - Cumulative Weekly Burn Chart: Visual timeline comparison of actual hours burned against the baseline budget limit.
2. **Baselines & Thresholds**:
   - Table of baselines with frozen lock badges, budget hours, budget amounts, and warning/critical threshold rules.
   - Modal for creating new baselines and toggle for freezing scope.
3. **Effective Rate Cards**:
   - Tabular rate card manager by Project, Role, or User.
   - Confidential labor cost rate masking with privacy badge if unauthorized.
   - New Rate Card modal with effective date validation.
4. **Periodic Metric Ledger**:
   - Chronological accounting ledger recording historical period snapshots, hours, costs, margins, and reconciliation status.
5. **Multi-Currency Exchange Rates**:
   - FX conversion table with effective dates and rate entry modal.

### 4.3 Navigation & Routing
- Integrated route `/financial-analytics` into `web/src/App.tsx`.
- Added **Project Financials** (`TrendingUp` icon) under the `Client Delivery` section in `web/src/components/layout/Sidebar.tsx`.

---

## 5. Verification & Testing Results

1. **Static Schema Bundle**:
   - Rebuilt install bundle: `node dbscripts/build-install.mjs`
   - Test suite: `node --test dbscripts/build-install.test.mjs`
   - **Result**: `2/2 tests passed` (0 errors, valid manifest).
2. **Backend Server Build**:
   - Executed: `npm run build` in `server/` (`nest build`)
   - **Result**: Exit code `0` (Zero TypeScript or Nest compilation errors).
3. **Frontend Web Build**:
   - Executed: `npm run build` in `web/` (`tsc && vite build`)
   - **Result**: Exit code `0` (`2169 modules transformed`, production bundle generated).
4. **Documentation & Checklists**:
   - Checked off `ANALYTICS-004` in `docs/tasks-checklist.md` (Section 11.5).
   - Updated `README.md` to reflect `ANALYTICS-004` as implemented across completed modules and roadmap sections.
