# Walkthrough: COMM-001 Retainer & AMC Entitlements

**Feature Code**: `COMM-001`  
**Implemented Date**: 2026-10-01  
**Status**: Completed & Verified  

---

## 1. Executive Summary

Feature `COMM-001` delivers a complete commercial governance and recurring service entitlement engine for KS-PMT (Kashvira Infotech - Project & Product Management Tool). It bridges the gap between daily developer/QA effort tracking (`TIME-001`) and client commercial contracts, ensuring hours are consumed transparently, accurately, and without duplicate allocation or confidential margin leaks.

### Core Acceptance Criteria Realized
> *"Acceptance: rejecting a worklog does not consume allowance; approval retries do not consume it twice; a new contract period follows the agreed rollover policy."*

To satisfy this guarantee:
1. **Commercial Contracts & Retainers**: Master contracts supporting `RETAINER` (monthly hours bucket), `AMC` (Annual/Quarterly Maintenance Contract), and `TIME_AND_MATERIALS_CAP`. Snapshots preserve historical hourly rates, overage rates, currency, and agreed rollover rules.
2. **Entitlement Periods & Rollover Engine**: Structured periods (`UPCOMING`, `OPEN`, `CLOSED`, `RECONCILED`) tracking included hours, rolled-over hours in, total allowance, approved consumed hours, remaining balance, and overage hours. Closing a period automatically evaluates the rollover policy (`NO_ROLLOVER`, `FULL_ROLLOVER`, `CAPPED_ROLLOVER`, `EXPIRE_AFTER_N_PERIODS`), calculates unused hours, and initializes Period $N+1$ with the carried balance.
3. **Single Consumption Ledger**: Worklog consumptions enforce that **only** `APPROVED` and `is_billable = TRUE` time logs from the contract's project or product scope consume allowance. The database uniqueness constraint (`UNIQUE (time_log_id)`) guarantees approval retries or re-scans never consume allowance twice. Worklog rejection or status rollback immediately unlinks the consumption and restores available allowance.
4. **Overage Authorization (CLIENT-004 Integration)**: Out-of-bucket effort generates formal overage authorization requests with estimated amounts, linked to `change_requests` (CLIENT-004), requiring authorized client approver decisions.
5. **Zero-Margin-Leakage Client Statements**: Dedicated client-facing statement views disclosing only authorized approved usage and quotations, strictly omitting internal developer pay, resource cost rates, and internal feasibility margins.

---

## 2. Database Schema & Architecture (`dbscripts/`)

### A. New Canonical Tables (`dbscripts/tables/tables.sql`)

1. **Table 87: `commercial_contracts`**
   - **Fields**: `id` (UUID PK), `contract_number` (e.g. `RET-2026-ACME`), `client_id` (FK to `clients`), `project_id` (FK to `projects`), `product_id` (FK to `products`), `title`, `contract_type` (`RETAINER`, `AMC`, `TIME_AND_MATERIALS_CAP`, `FIXED_HOURS_BUCKET`), `periodicity` (`MONTHLY`, `QUARTERLY`, `ANNUALLY`, `CUSTOM`), `included_hours_per_period`, `hourly_rate`, `overage_hourly_rate`, `currency`, `rollover_rule` (`NO_ROLLOVER`, `FULL_ROLLOVER`, `CAPPED_ROLLOVER`, `EXPIRE_AFTER_N_PERIODS`), `max_rollover_hours`, `rollover_expiry_periods`, `start_date`, `end_date`, `status`, `accountable_pm_user_id`, `terms_and_conditions`, `notes`, `is_active`, standard audit columns.
2. **Table 88: `contract_periods`**
   - **Fields**: `id` (UUID PK), `contract_id` (FK to `commercial_contracts`), `period_code` (e.g. `PER-RET-2026-10`), `period_sequence`, `start_date`, `end_date`, `included_hours`, `rolled_over_hours_in`, `total_allowance_hours`, `approved_consumed_hours`, `remaining_allowance_hours`, `overage_hours`, `rolled_over_hours_out`, `hourly_rate`, `overage_hourly_rate`, `currency`, `status` (`UPCOMING`, `OPEN`, `CLOSED`, `RECONCILED`), `closed_at`, `closed_by`, `reconciled_notes`, standard audit columns.
   - **Constraint**: `uq_contract_period_seq UNIQUE (contract_id, period_sequence)`.
3. **Table 89: `contract_worklog_consumptions`**
   - **Fields**: `id` (UUID PK), `contract_period_id` (FK to `contract_periods`), `time_log_id` (FK to `task_time_logs` **UNIQUE**), `hours_consumed`, `is_overage`, `consumed_at`, standard audit columns.
   - **Key Acceptance Guarantee**: `UNIQUE (time_log_id)` guarantees approval retries cannot consume twice.
4. **Table 90: `contract_overage_requests`**
   - **Fields**: `id` (UUID PK), `request_code` (e.g. `OVR-2026-0001`), `contract_period_id` (FK to `contract_periods`), `change_request_id` (FK to `change_requests`), `requested_overage_hours`, `estimated_amount`, `currency`, `justification`, `status` (`PENDING_CLIENT_APPROVAL`, `APPROVED`, `REJECTED`, `WAIVED`), `approved_hours`, `approved_by_contact_id` (FK to `client_contacts`), `approved_at`, `client_remarks`, standard audit columns.

### B. High-Performance Composite Indexes (`dbscripts/indexes/indexes.sql`)

- `idx_contracts_client`: `commercial_contracts(client_id, status)`
- `idx_contracts_project`: `commercial_contracts(project_id)`
- `idx_contracts_product`: `commercial_contracts(product_id)`
- `idx_contracts_number`: `commercial_contracts(contract_number)`
- `idx_contracts_status`: `commercial_contracts(status)`
- `idx_contract_periods_contract`: `contract_periods(contract_id, period_sequence)`
- `idx_contract_periods_code`: `contract_periods(period_code)`
- `idx_contract_periods_dates`: `contract_periods(start_date, end_date)`
- `idx_contract_periods_status`: `contract_periods(status)`
- `idx_contract_consumptions_period`: `contract_worklog_consumptions(contract_period_id)`
- `idx_contract_consumptions_timelog`: `contract_worklog_consumptions(time_log_id)`
- `idx_overage_requests_period`: `contract_overage_requests(contract_period_id)`
- `idx_overage_requests_cr`: `contract_overage_requests(change_request_id)`
- `idx_overage_requests_code`: `contract_overage_requests(request_code)`
- `idx_overage_requests_status`: `contract_overage_requests(status)`

### C. System RBAC & Permissions (`dbscripts/inserts/inserts.sql`)

- Added system permissions:
  - `COMMERCIAL:READ` - View contracts, periods, allowances, and statements.
  - `COMMERCIAL:MANAGE` - Create and manage contracts, periods, and rollover policies.
  - `COMMERCIAL:CONSUME` - Link and reconcile approved worklog allowance consumptions.
  - `COMMERCIAL:OVERAGE` - Create, review, and authorize overage requests.
- Mapped to roles: `ROLE_SUPER_ADMIN`, `ROLE_PROJECT_MANAGER`, `ROLE_SUPPORT_EXEC`, `ROLE_DEVELOPER`, `ROLE_QA_TESTER`.

### D. Sample Seed Verification (`dbscripts/inserts/sample_data.sql`)

- **Retainer Contract `RET-2026-ACME`**: 40 monthly hours, INR 2,500/hr, overage INR 3,200/hr, `CAPPED_ROLLOVER` max 10 hours.
- **Period 1 (`PER-RET-2026-09`)**: 40h allowance, 32h consumed, 8h unused rolled over to Period 2 (`CLOSED`).
- **Period 2 (`PER-RET-2026-10`)**: 40h base + 8h rolled in = 48h total allowance, 18h consumed, 30h remaining (`OPEN`).
- **Rejected Worklog Validation**: 6.0h rejected worklog (`approval_status = 'REJECTED'`) is omitted from consumption.
- **Overage Request `OVR-2026-0001`**: 15h overage linked to `CR-ACME-001`, approved by Acme CTO Robert Miller.

---

## 3. Backend Implementation (`server/src/modules/commercial/`)

### DTOs
- `CreateContractDto`: Validates title, client, contract type, periodicity, included hours, rates, rollover rules, dates.
- `QueryContractsDto`: Filters by client, project, product, type, status, and text search.
- `CreateContractPeriodDto`: Validates period sequence, start/end dates, included and rolled-over hours.
- `ConsumeWorklogDto`: Validates time log ID and optional partial hours.
- `CreateOverageRequestDto`: Validates requested hours, estimated amount, justification, change request link.
- `DecideOverageRequestDto`: Validates decision (`APPROVED`, `REJECTED`, `WAIVED`), approved hours, client remarks.

### Service Methods (`CommercialService`)
- `createContract`: Auto-generates contract code (`RET-YYYY-XXXX` or `AMC-YYYY-XXXX`) and optionally initializes Period 1.
- `findAllContracts` & `findContractById`: Multi-tenant filtered contract query with active period summaries.
- `reconcilePeriod`: Removes consumptions for unapproved/non-billable logs, scans newly eligible approved worklogs, performs idempotent single-consumption insertion (`ON CONFLICT (time_log_id) DO NOTHING`), and updates period balances.
- `consumeWorklog`: Validates `APPROVED` status, billability, project/product scope match, and logs consumption.
- `closeAndRolloverPeriod`: Reconciles current period, evaluates contract rollover rules, freezes period as `CLOSED`, and creates Period $N+1$ carrying forward the agreed rollover balance.
- `createOverageRequest` & `decideOverageRequest`: Manages out-of-bucket overage requests with attributable decision tracking.
- `getClientStatement`: Produces a clean, client-safe entitlement statement disclosing approved deliverables while stripping internal developer salaries and cost margins.

### Controller Endpoints (`CommercialController`)
- `POST /api/v1/commercial/contracts`
- `GET /api/v1/commercial/contracts`
- `GET /api/v1/commercial/contracts/:id`
- `PATCH /api/v1/commercial/contracts/:id`
- `POST /api/v1/commercial/contracts/:contractId/periods`
- `GET /api/v1/commercial/periods/:id`
- `POST /api/v1/commercial/periods/:id/reconcile`
- `POST /api/v1/commercial/periods/:id/close-and-rollover`
- `POST /api/v1/commercial/periods/:id/consume`
- `DELETE /api/v1/commercial/consumptions/:id`
- `POST /api/v1/commercial/periods/:id/overage-requests`
- `PATCH /api/v1/commercial/overage-requests/:id/decision`
- `GET /api/v1/commercial/statements`

---

## 4. Frontend Workspace (`web/`)

### Types & API Endpoints (`web/src/types/index.ts`, `web/src/api/endpoints.ts`)
- Added `CommercialContract`, `ContractPeriod`, `ContractWorklogConsumption`, `ContractOverageRequest`, `ClientStatementResponse` interfaces.
- Added `commercialApi` client with 13 methods for full contract, period, consumption, and statement interactions.

### Dedicated UI: `CommercialRetainerWorkspace.tsx`
Accessed via `/commercial` and linked in the sidebar under "Client Delivery":
1. **Contracts & Agreements Registry**: Searchable grid of active Retainer and AMC contracts with allowance metrics and rollover policies.
2. **Period Entitlement & Rollover Hub**: Real-time KPI cards (Total Allowance, Approved Consumed, Remaining Balance, Overage), one-click reconciliation, and period closing with automated rollover.
3. **Approved Worklog Ledger**: Itemized table of consumed worklogs with task details, hours, and approval badges, illustrating the single-consumption guarantee.
4. **Overage Authorizations (CLIENT-004)**: Overage request cards with approval decisions and change request references.
5. **Client Statement View**: Executive entitlement statement with allowance burn rates, itemized deliverables, and zero confidential margin leakage.
6. **Modals**: Create Contract, Request Overage, and Record Decision modals.

---

## 5. Verification & Testing

1. **Static Bundle Generation**:
   - `node dbscripts/build-install.mjs` generated `install.sql` cleanly.
   - `node --test dbscripts/build-install.test.mjs` passed (2/2 tests passing, 0 failures).
2. **Backend Compilation**:
   - `npm run build` in `server/`: Compiled 100% cleanly without errors.
3. **Frontend Compilation**:
   - `npx tsc --noEmit` and `npm run build` in `web/`: Compiled and bundled 100% cleanly (0 errors).
4. **Operational Rule Compliance**:
   - No direct SQL execution on any live database instance.
   - No `git commit` or `git push` executed. All changes staged/unstaged for developer review.
