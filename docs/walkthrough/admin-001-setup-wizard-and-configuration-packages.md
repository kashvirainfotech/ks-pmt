# Walkthrough: ADMIN-001 Enterprise Setup Wizard & Configuration Packages

**Date**: 2026-10-01  
**Module**: `ADMIN-001` (Single-Company Setup Wizard & Configuration Packages)  
**Status**: Completed & Verified  

---

## 1. Overview & Objective

`ADMIN-001` introduces an enterprise configuration toolkit and interactive initialization wizard for single-company deployments of KS-PMT. It enables rapid corporate onboarding and seamless configuration portability (exporting and importing project templates, workflow statuses, task types, and SLA rules between development, staging, and production environments) with strict zero-leak boundaries.

### Measurement Contract & Acceptance Criteria (`docs/requirements.md` §3.40)
1. **Interactive Setup Wizard**: Guided 6-step initialization wizard covering corporate legal identity, headquarters branch assignment, regional localization/currency, constrained branding (with script/CSS injection sanitization), modular capability switches, and final review.
2. **Versioned Configuration Packages**: Portable, sanitized JSON package bundles (`PKG-...`) capturing task types, workflow schemes, project templates, and SLA policies.
3. **Dry-Run Diff & Dependency Validation**: Comprehensive pre-application inspection engine that compares an incoming package against the live database, flags new vs matching entities, identifies potential conflicts, and supports configurable conflict resolution policies (`SKIP` vs `OVERWRITE`).
4. **Strict Security & Zero-Leak Guarantees**: Packages strictly exclude user accounts, passwords, tokens, API secrets, client organization data, client tickets, financial margin metrics, and direct permission assignments (preventing silent privilege elevation of the importing administrator).
5. **Audited Application History**: Full execution audit trail recording who performed dry-run previews, package exports, and package applications, along with detailed change summaries and conflict logs.

---

## 2. Database Schema & Static Installer

Following the development blank-database policy in `AGENTS.md`, table definitions were added canonically to `dbscripts/tables/tables.sql` without migration history.

### Canonical Tables Added
1. **Table 116: `company_settings`**:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `company_name VARCHAR(150) NOT NULL`
   - `legal_name VARCHAR(200)`
   - `registration_number VARCHAR(100)`
   - `tax_id VARCHAR(100)`
   - `company_domain VARCHAR(150)`
   - `primary_email VARCHAR(150)`
   - `support_email VARCHAR(150)`
   - `headquarters_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL`
   - `default_currency VARCHAR(10) NOT NULL DEFAULT 'INR'`
   - `timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata'`
   - `date_format VARCHAR(30) NOT NULL DEFAULT 'YYYY-MM-DD'`
   - `branding_primary_color VARCHAR(20) NOT NULL DEFAULT '#2563eb'`
   - `branding_accent_color VARCHAR(20) NOT NULL DEFAULT '#4f46e5'`
   - `logo_url TEXT`
   - `favicon_url TEXT`
   - `setup_wizard_completed BOOLEAN NOT NULL DEFAULT FALSE`
   - `setup_wizard_step INTEGER NOT NULL DEFAULT 1 CHECK (setup_wizard_step >= 1 AND setup_wizard_step <= 6)`
   - `setup_completed_at TIMESTAMP WITH TIME ZONE`
   - `enabled_modules JSONB NOT NULL`
   - Standard audit columns (`created_by`, `created_at`, `updated_by`, `updated_at`, `is_active`)

2. **Table 117: `configuration_packages`**:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `package_code VARCHAR(50) NOT NULL UNIQUE`
   - `package_name VARCHAR(150) NOT NULL`
   - `version VARCHAR(30) NOT NULL DEFAULT '1.0.0'`
   - `pmt_version_compatibility VARCHAR(50) NOT NULL DEFAULT '1.0.0'`
   - `package_type VARCHAR(30) NOT NULL DEFAULT 'FULL' CHECK (package_type IN ('FULL', 'WORKFLOWS_ONLY', 'ROLES_PERMISSIONS', 'TEMPLATES', 'SLA_POLICIES'))`
   - `description TEXT`
   - `manifest JSONB NOT NULL DEFAULT '{}'::jsonb`
   - `package_data JSONB NOT NULL DEFAULT '{}'::jsonb`
   - `is_builtin_template BOOLEAN NOT NULL DEFAULT FALSE`
   - `applied_at TIMESTAMP WITH TIME ZONE`
   - `applied_by UUID REFERENCES users(id) ON DELETE SET NULL`
   - Standard audit columns (`created_by`, `created_at`, `updated_by`, `updated_at`, `is_active`)

3. **Table 118: `configuration_audit_logs`**:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `package_id UUID REFERENCES configuration_packages(id) ON DELETE SET NULL`
   - `action VARCHAR(50) NOT NULL CHECK (action IN ('DRY_RUN_PREVIEW', 'APPLY_PACKAGE', 'ROLLBACK', 'EXPORT_PACKAGE'))`
   - `applied_changes JSONB NOT NULL DEFAULT '[]'::jsonb`
   - `conflicts_detected JSONB NOT NULL DEFAULT '[]'::jsonb`
   - `status VARCHAR(30) NOT NULL DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'WARNINGS', 'FAILED'))`
   - `executed_by UUID NOT NULL`
   - Standard audit columns (`created_by`, `created_at`, `updated_by`, `updated_at`, `is_active`)

### Performance Indexes (`dbscripts/indexes/indexes.sql`)
- `idx_company_settings_active`: `company_settings(is_active)`
- `idx_config_pkg_code`: `configuration_packages(package_code)`
- `idx_config_pkg_type`: `configuration_packages(package_type, is_active)`
- `idx_config_audit_pkg`: `configuration_audit_logs(package_id)`
- `idx_config_audit_created`: `configuration_audit_logs(created_at DESC)`

### RBAC Permissions (`dbscripts/inserts/inserts.sql`)
- `ADMIN:SETUP_WIZARD`: Permission to run single-company setup wizard and update corporate settings.
- `ADMIN:CONFIG_PACKAGES`: Permission to export, import, dry-run preview, and apply configuration packages.
- Mapped to `SUPER_ADMIN`, with `ADMIN:SETUP_WIZARD` also mapped to `PROJECT_MANAGER` and `BRANCH_MANAGER`.

### Seed Sample Data (`dbscripts/inserts/sample_data.sql`)
- Default active corporate profile: `Kashvira Infotech Private Limited`.
- Starter Package 1: `PKG-AGILE-CORE-v1` ("Agile Scrum & Kanban Core Delivery Package").
- Starter Package 2: `PKG-CLIENT-SERVICES-v1` ("Client Delivery & Retainer Governance Package").

---

## 3. Backend Engine Implementation

### 3.1 Security Sanitizer (`server/src/modules/config-toolkit/sanitizer.ts`)
- `sanitizeHexColor()`: Enforces regex `^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$` preventing arbitrary CSS/script injection.
- `sanitizeConfigurationBundle()`: Strictly strips prohibited enterprise data (`users`, `passwords`, `tokens`, `secrets`, `clients`, `financial_metrics`, `cost_rate`, `salaries`, `worklogs`, `role_permissions`).

### 3.2 Service (`server/src/modules/config-toolkit/config-toolkit.service.ts`)
- `getCompanySettings()`: Retrieves or initializes single-company installation profile with branch join.
- `updateCompanySettings(dto, userId)`: Updates corporate branding, wizard step, and completion state.
- `resetSetupWizard(userId)`: Allows administrators to re-open the wizard from step 1.
- `getPackages()` & `getPackageById(id)`: Filtered listing of built-in templates and custom packages.
- `exportCurrentConfiguration(dto, userId)`: Exports active task types, workflow statuses, templates, and SLA policies into a new portable package.
- `previewPackageDiff(dto, userId)`: Performs non-destructive dry-run diff against the database, flagging new vs existing records and detecting conflicts.
- `applyPackage(dto, userId)`: Applies package entities with `SKIP` or `OVERWRITE` conflict resolution policies and records execution audit log.
- `getAuditLogs()`: Audit trail of all previews, exports, and applied configurations.

### 3.3 Controller (`server/src/modules/config-toolkit/config-toolkit.controller.ts`)
Guarded by `JwtAuthGuard` and `DynamicRbacGuard`:
- `GET /api/config-toolkit/settings` (`ADMIN:SETUP_WIZARD`)
- `PUT /api/config-toolkit/settings` (`ADMIN:SETUP_WIZARD`)
- `POST /api/config-toolkit/settings/reset-wizard` (`ADMIN:SETUP_WIZARD`)
- `GET /api/config-toolkit/packages` (`ADMIN:CONFIG_PACKAGES`)
- `GET /api/config-toolkit/packages/:id` (`ADMIN:CONFIG_PACKAGES`)
- `POST /api/config-toolkit/packages/export` (`ADMIN:CONFIG_PACKAGES`)
- `POST /api/config-toolkit/packages/dry-run` (`ADMIN:CONFIG_PACKAGES`)
- `POST /api/config-toolkit/packages/apply` (`ADMIN:CONFIG_PACKAGES`)
- `GET /api/config-toolkit/audit-logs` (`ADMIN:CONFIG_PACKAGES`)

Registered `ConfigToolkitModule` in `server/src/app.module.ts`.

---

## 4. Frontend Web Implementation

### 4.1 Types & API Client
- Added `CompanySettings`, `ConfigurationPackage`, `ConfigurationAuditLog`, and `PackageDiffResult` interfaces in `web/src/types/index.ts`.
- Exported `configToolkitApi` in `web/src/api/endpoints.ts`.

### 4.2 Workspace Component (`web/src/components/config-toolkit/ConfigToolkitWorkspace.tsx`)
1. **Setup Wizard & Profile Tab**:
   - 6-step guided wizard (Corporate Identity &rarr; Headquarters &rarr; Localization & Currency &rarr; Branding & Colors &rarr; Modules &rarr; Review).
   - Live Branding Preview card reflecting real-time color choices.
   - Re-run Wizard button for existing installations.
2. **Configuration Packages Tab**:
   - Card listing of built-in starter packs and custom exported bundles.
   - Manifest tags showing counts of task types, workflows, templates, and SLAs.
   - One-click JSON download for portable transport.
3. **Dry-Run Inspection & Application Modal**:
   - Visual statistics for New Entities, Already Present, and Conflicts.
   - Conflict resolution selector (`SKIP` vs `OVERWRITE`).
   - Granular item-by-item diff review and one-click application button.
4. **Audit Logs Tab**:
   - Filterable execution history with timestamps, user names, action types, and change counts.

### 4.3 Routing & Navigation
- Added route `/config-toolkit` in `web/src/App.tsx`.
- Added sidebar navigation link with `Sliders` icon under the `Organization` category in `web/src/components/layout/Sidebar.tsx`.

---

## 5. Build & Validation Results

1. **Database Installer Bundle & Test**:
   ```powershell
   node dbscripts/build-install.mjs
   node --test dbscripts/build-install.test.mjs
   ```
   - Generated `dbscripts/install.sql` from 15 object files.
   - Result: **2/2 tests passed, 0 failures**.

2. **Backend Server Build**:
   ```powershell
   cd server && npm run build
   ```
   - Compiled NestJS application with **0 errors**.

3. **Frontend Web Build**:
   ```powershell
   cd web && npm run build
   ```
   - Verified clean production build with Vite.

---

## 6. Operational Compliance

- **Blank Database Policy**: Maintained canonical `CREATE TABLE` definitions in `dbscripts/tables/tables.sql` (Tables 116, 117, 118) and indexes in `dbscripts/indexes/indexes.sql`.
- **Zero Database Execution**: No SQL scripts executed directly against any database.
- **Zero Git Commit**: No `git commit` or `git push` executed. All changes remain unstaged for developer review.
