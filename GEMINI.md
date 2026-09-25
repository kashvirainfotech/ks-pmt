# KS-PMT Project Instructions & Agent Guidelines

## 1. Database Management Policies
- Scripts must strictly live in `dbscripts/` organized under:
  - `tables/` (`tables.sql`, `alter_tables.sql`)
  - `views/` (one file per view)
  - `sequences/` (one file per sequence or `sequences.sql`)
  - `functions/` (one file per function)
  - `procedures/` (one file per procedure)
  - `triggers/` (one file per trigger)
  - `indexes/` (`indexes.sql`)
  - `inserts/` (`inserts.sql`)
- For trigger, view, function, procedure: Maintain individual `.sql` files per object and edit the file directly when modifying.
- For table, alter table, index, inserts: Maintain in their single `.sql` files, appending new statements at the bottom with a datetime comment.
- **NEVER execute database scripts directly on any database.** Scripts are reviewed and executed manually by the human developer.

## 2. Version Control Policies
- **NEVER run `git commit` or `git push`.** All repository commits are manually reviewed and performed by the developer.

## 3. Project Standards
- Audit columns (`created_by`, `created_at`, `updated_by`, `updated_at`) on every table.
- Active flag (`is_active` boolean default true) on every master table.
- AWS S3 for all binary assets and file attachments.
- Dual login: Email + Password or Mobile + OTP (no open public registration).
- Dynamic permission engine with user/branch level overrides.
