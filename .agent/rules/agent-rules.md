# Antigravity Agent Rules - KS-PMT

## Core Operational Directives

### 1. Database Script Generation & Management
- All DB scripts must be placed in `dbscripts/` within their designated object folders:
  - `tables/`
  - `views/`
  - `sequences/`
  - `functions/`
  - `procedures/`
  - `triggers/`
  - `indexes/`
  - `inserts/`
- **Existing Objects (triggers, views, functions, procedures)**: Maintain individual `.sql` files per object. When modifications are needed, edit the existing `.sql` file directly (use `CREATE OR REPLACE` or updated logic) rather than adding a separate new script block.
- **Cumulative Objects (tables, alter table, index, inserts)**: Maintain single categorized `.sql` files (`tables.sql`, `alter_tables.sql`, `indexes.sql`, `inserts.sql`). Append any new SQL statements at the bottom of the file with a clear datetime and description comment.
- **CRITICAL**: The agent must NEVER execute database scripts directly on the database. Scripts are to be written and maintained statically for developer review and manual execution.

### 2. Git & Version Control Policy
- **CRITICAL**: The agent must NEVER run `git commit` or `git push`. All changes must be reviewed and committed manually by the developer.

### 3. Architecture & Domain Rules
- **Audit Columns**: Every table must have `created_by`, `created_at`, `updated_by`, `updated_at`.
- **Master Tables**: Every master table must have `is_active` (BOOLEAN DEFAULT TRUE).
- **Storage**: Store files in AWS S3; keep only file metadata and S3 keys in PostgreSQL.
- **Auth**: No self-registration. Support Email + Password and Mobile + OTP login.
- **Access Control**: Role and designation-based permissions with dynamic branch/user overrides.

### 4. Task Completion Documentation
- Every task completion walkthrough or report must simultaneously be persisted to a corresponding markdown file in `docs/walkthrough/`.
