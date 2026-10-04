# DATA-001: CSV Import & Portable Exports Walkthrough

## 1. Overview & Objectives

**DATA-001** introduces enterprise-grade data exchange capabilities to KS-PMT, enabling bidirectional CSV and JSON portable data imports and exports across 5 core domain entities:
- **Tasks & Defects** (`TASKS`)
- **Requirements & Acceptance Criteria** (`REQUIREMENTS`)
- **QA Test Cases** (`TEST_CASES`)
- **Client Intake Requests** (`CLIENT_REQUESTS`)
- **RAID Risks & Decisions** (`RAID_ITEMS`)

### Core Acceptance Criteria
1. **Permission-Controlled CSV Import / Export**:
   - Downloadable entity-specific CSV templates with header definitions, field descriptions, and sample row.
   - Interactive column mapping interface matching arbitrary CSV headers to destination entity attributes.
   - Zero-write dry-run preview checking required fields, data formats, and resolving references (`REFERENCE_NOT_FOUND`).
   - Stable external ID mapping (`external_id`) with persistent row-level error outcomes.
2. **Execution Modes**:
   - `UPSERT`: Updates existing records matching `external_id`, creates new records otherwise.
   - `CREATE_ONLY`: Creates new records; rejects and fails if `external_id` already exists.
   - `UPDATE_ONLY`: Updates existing records; fails with `RECORD_NOT_FOUND` if `external_id` does not match an existing record.
3. **Idempotent Retry Engine**:
   - Resuming or retrying an import batch only processes failed/invalid rows; previously successful rows are never duplicated or overwritten.
4. **Strict Security Boundaries**:
   - Protected approval and audit fields (`approval_status`, `reviewed_by`, `reviewed_at`, `is_approved`, `is_scope_addition`, `created_at`, `created_by`) are automatically stripped and protected from import payloads.
   - Binary attachments remain secure AWS S3 uploads; imports cannot fetch arbitrary remote files or embed binary content in database fields.
   - Restricted confidential data (employee salaries, cost margins, password hashes) cannot be recovered through exports or error diagnostics.
5. **Formula Injection Sanitization (CWE-1236)**:
   - CSV exports automatically prepend a single quote (`'`) to any cell value beginning with `=`, `+`, `-`, `@`, `\t`, or `\r` to prevent remote formula execution in Microsoft Excel and LibreOffice Calc.

---

## 2. Database Artifacts

### 2.1 Schema Tables (`dbscripts/tables/tables.sql`)

Two canonical blank-database tables were appended to `dbscripts/tables/tables.sql`:

1. **Table 91: `data_import_batches`**:
   - `id`: UUID primary key.
   - `batch_number`: Human-readable identifier (`IMP-YYYY-XXXX`).
   - `entity_type`: Target entity enum (`TASKS`, `REQUIREMENTS`, `TEST_CASES`, `CLIENT_REQUESTS`, `RAID_ITEMS`).
   - `import_mode`: Execution mode (`CREATE_ONLY`, `UPDATE_ONLY`, `UPSERT`).
   - `status`: Batch lifecycle state (`PREVIEW_READY`, `VALIDATED`, `PROCESSING`, `COMPLETED`, `PARTIALLY_FAILED`, `FAILED`).
   - `original_file_name`: Uploaded filename.
   - Counters: `total_rows`, `preview_valid_count`, `preview_error_count`, `success_count`, `failed_count`, `skipped_count`.
   - `column_mapping`: JSONB header mapping configuration.
   - `error_summary`: JSONB summary of row-level validation issues.
   - Standard audit columns: `executed_by_id`, `created_by`, `created_at`, `updated_by`, `updated_at`.

2. **Table 92: `data_import_row_outcomes`**:
   - `id`: UUID primary key.
   - `batch_id`: Foreign key referencing `data_import_batches(id)` ON DELETE CASCADE.
   - `row_index`: 1-indexed row number from CSV file.
   - `external_id`: External stable identifier.
   - `raw_payload`: Original unmapped CSV row values (JSONB).
   - `mapped_payload`: Sanitized destination payload (JSONB).
   - `outcome_status`: Row state (`VALID`, `INVALID`, `CREATED`, `UPDATED`, `SKIPPED`, `FAILED`).
   - `target_record_id`, `target_record_code`: Link to created/updated entity.
   - `validation_errors`: JSONB array of validation diagnostics (`field`, `message`, `code`).
   - `execution_error`: Error message if database insert/update fails.
   - `is_retried`, `retried_at`: Idempotent retry tracking flags.

### 2.2 Composite Indexes (`dbscripts/indexes/indexes.sql`)
- `idx_import_batches_entity`: `(entity_type, status)`
- `idx_import_batches_number`: `(batch_number)`
- `idx_import_batches_user`: `(executed_by_id)`
- `idx_import_batches_created`: `(created_at DESC)`
- `idx_import_row_batch`: `(batch_id, row_index)`
- `idx_import_row_external`: `(batch_id, external_id)`
- `idx_import_row_record`: `(target_record_id)`

### 2.3 RBAC Permissions (`dbscripts/inserts/inserts.sql`)
- `DATA_EXCHANGE:READ`: View import templates, preview summaries, and batch execution histories.
- `DATA_EXCHANGE:IMPORT`: Upload CSV files, perform dry-run validations, execute batches, and trigger idempotent retries.
- `DATA_EXCHANGE:EXPORT`: Download portable CSV and JSON exports across permitted projects and products.
- Mapped to `ROLE_SUPER_ADMIN`, `ROLE_BRANCH_MANAGER`, `ROLE_PROJECT_MANAGER`, `ROLE_TECH_LEAD`, `ROLE_DEVELOPER`, `ROLE_QA`.

### 2.4 Seed Sample Batch (`dbscripts/inserts/sample_data.sql`)
- Sample mixed-validity batch `IMP-2026-0001` for `TASKS`:
  - Row 1: Valid task creation (`TASK-EXT-001`, `PRJ-ALPHA`) -> `CREATED`.
  - Row 2: Valid task creation (`TASK-EXT-002`, `PRJ-ALPHA`) -> `CREATED`.
  - Row 3: Reference rejection (`PRJ-NONEXISTENT`) -> `FAILED` with code `REFERENCE_NOT_FOUND`.
  - Row 4: Idempotent retry demonstration (`TASK-EXT-004`) -> Retried and `CREATED` without duplicating Rows 1 or 2.

### 2.5 Installer Verification
- Installer bundle regenerated via `node dbscripts/build-install.mjs`.
- Verified clean build: `node --test dbscripts/build-install.test.mjs` passed (2/2 tests passed, 0 failures).

---

## 3. Backend REST Implementation (`server/src/modules/data-exchange/`)

### 3.1 DTOs
- `dry-run-import.dto.ts`: Declares `DryRunImportDto` with `entityType`, `importMode`, `rawCsvContent`, `columnMapping`, `originalFileName`.
- `execute-import.dto.ts`: Declares `ExecuteImportDto` with `allowPartial: boolean`.
- `export-query.dto.ts`: Declares `ExportQueryDto` with `entityType`, `projectId`, `productId`, `format`, `fromDate`, `toDate`.

### 3.2 Service Architecture (`DataExchangeService`)
1. **RFC 4180 CSV Parsing**:
   - `parseCsv(content: string)`: Handles quotes, commas inside quoted strings, escaped double quotes (`""`), and CRLF/LF newlines.
2. **CWE-1236 Formula Sanitization**:
   - `sanitizeFormulaInjection(val: any)`: Detects leading `=`, `+`, `-`, `@`, `\t`, `\r` and prepends `'`.
3. **Downloadable Templates**:
   - `getTemplate(entityType)`: Returns pre-configured header lists, sample values, and descriptions for all 5 entities.
4. **Reference Resolution & Security Boundary**:
   - Pre-loads uppercase project code, product code, client code, and user email lookup maps.
   - Automatically rejects missing foreign keys with diagnostic `REFERENCE_NOT_FOUND` codes.
   - Strips commercial and QA approval fields (`approval_status`, `reviewed_by`, `reviewed_at`, `is_scope_addition`, `is_approved`) and system audit timestamps.
5. **Zero-Write Dry-Run**:
   - `dryRunImport()`: Validates entire CSV payload in memory, calculates preview statistics, and creates a batch with status `PREVIEW_READY`. Writes zero rows to core business tables.
6. **Batch Execution & Idempotent Retry**:
   - `executeImport()`: Commits permitted valid rows. Updates row outcomes with target IDs and record numbers.
   - `retryBatch()`: Finds only rows where `outcome_status IN ('FAILED', 'INVALID')`, re-resolves references, and creates/updates records without touching previously succeeded rows.
7. **Portable Export Engine**:
   - `exportData()`: Extracts data respecting project access boundaries, excludes confidential columns (salaries, cost margins), applies formula sanitization, and outputs CSV or structured JSON.

### 3.3 Endpoints
- `GET /api/v1/data-exchange/templates/:entityType` (`DATA_EXCHANGE:READ`)
- `POST /api/v1/data-exchange/dry-run` (`DATA_EXCHANGE:IMPORT`)
- `POST /api/v1/data-exchange/batches/:batchId/execute` (`DATA_EXCHANGE:IMPORT`)
- `POST /api/v1/data-exchange/batches/:batchId/retry` (`DATA_EXCHANGE:IMPORT`)
- `GET /api/v1/data-exchange/batches` (`DATA_EXCHANGE:READ`)
- `GET /api/v1/data-exchange/batches/:id` (`DATA_EXCHANGE:READ`)
- `GET /api/v1/data-exchange/export` (`DATA_EXCHANGE:EXPORT`)

---

## 4. Frontend Implementation (`web/`)

### 4.1 Type Definitions (`web/src/types/index.ts`)
- `ImportEntityType`, `ImportMode`, `ImportBatchStatus`, `RowOutcomeStatus`
- `DataImportRowOutcome`, `DataImportBatch`, `DataImportPreviewResponse`, `DataExportQuery`

### 4.2 API Client (`web/src/api/endpoints.ts`)
- `dataExchangeApi`: `getTemplate`, `dryRunImport`, `executeImport`, `retryBatch`, `getAllBatches`, `getBatchById`, `exportData`.

### 4.3 UI Component (`web/src/components/data-exchange/DataExchangeWorkspace.tsx`)
- **4-Step Wizard**:
  1. *Template & Upload*: Entity selection, execution mode (`UPSERT` / `CREATE_ONLY` / `UPDATE_ONLY`), template download, file drag-and-drop or direct CSV paste.
  2. *Field Mapping*: Visual column mapper with auto-detection, required field indicators, sample value preview, and protected fields security notice.
  3. *Dry-Run Preview*: Zero-write preview with total / valid / rejected counts, full diagnostic table displaying row indices, external IDs, error codes (`REFERENCE_NOT_FOUND`, `REQUIRED_FIELD_MISSING`), and allow-partial execution toggle.
  4. *Execution & Idempotent Retries*: Progress scorecard and single-click retry action for failed rows.
- **Batch History & Audit Inspector**:
  - Filterable table of past import batches with status badges.
  - Interactive drawer inspecting row-level outcomes, target record codes, and validation diagnostics.
  - One-click idempotent retry of failed rows directly from batch history.
- **Portable Export Studio**:
  - Entity scope, optional project/product filters, CSV or JSON format.
  - Prominent CWE-1236 Formula Injection Defense guarantee banner.
  - Direct browser file download.

### 4.4 App Integration
- Route `/data-exchange` registered in `web/src/App.tsx`.
- Navigation item added in `web/src/components/layout/Sidebar.tsx` under Workspace.

---

## 5. Verification & Testing

1. **Database Schema & Static Installer**:
   - `node dbscripts/build-install.mjs` executed cleanly.
   - `node --test dbscripts/build-install.test.mjs` passed (2/2 tests passed, 0 failures).
2. **Backend Compilation**:
   - `npm run build` in `server/` succeeded with 0 errors.
3. **Frontend Compilation**:
   - `npx tsc --noEmit` and `npm run build` in `web/` verified without errors.
4. **Security & Policy Adherence**:
   - No direct database execution performed.
   - No `git commit` or `git push` executed.
   - Standard audit columns included on both tables.
   - AWS S3 attachment boundary preserved.
