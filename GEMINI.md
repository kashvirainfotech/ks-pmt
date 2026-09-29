# KS-PMT Project Instructions & Agent Guidelines

## 1. Database Management Policies

The development lifecycle in [AGENTS.md](AGENTS.md) is authoritative: edit canonical CREATE definitions for blank-database installation. Do not accumulate migration history or standalone ALTER/UPDATE/DROP/DELETE statements to evolve the schema; seed INSERTs and SQL inside function/procedure bodies remain supported. Incremental migrations start only after the project is declared live. Installer manifest: `dbscripts/install.psql`; generate the ignored pgAdmin bundle with `node dbscripts/build-install.mjs` (generation does not execute SQL).

- Scripts must strictly live in `dbscripts/` organized under:
  - `tables/` (`tables.sql`; `alter_tables.sql` is not maintained during development)
  - `views/` (one file per view)
  - `sequences/` (one file per sequence or `sequences.sql`)
  - `functions/` (one file per function)
  - `procedures/` (one file per procedure)
  - `triggers/` (one file per trigger)
  - `indexes/` (`indexes.sql`)
  - `inserts/` (`inserts.sql`)
- For trigger, view, function, procedure: Maintain individual `.sql` files per object and edit the file directly when modifying.
- Maintain cumulative table/index/seed files. Edit existing definitions in place during development; append new definitions/seed entries with the required datetime header. The development policy above overrides historical append-only migration instructions.
- **NEVER execute database scripts directly on any database.** Scripts are reviewed and executed manually by the human developer.

## 2. Version Control Policies

- **NEVER run `git commit` or `git push`.** All repository commits are manually reviewed and performed by the developer.

## 3. Project Standards

- Audit columns (`created_by`, `created_at`, `updated_by`, `updated_at`) on every table.
- Active flag (`is_active` boolean default true) on every master table.
- AWS S3 for all binary assets and file attachments.
- Dual login: Email + Password or Mobile + OTP (no open public registration).
- Dynamic permission engine with user/branch level overrides.

## 4. Documentation Policy

- Every task completion summary/report presented to the user must also be saved into an individual markdown file inside the `docs/walkthrough/` directory.
