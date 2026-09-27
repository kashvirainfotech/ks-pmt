# README Database Installation Steps

Updated `README.md` with the complete blank-database setup workflow: prerequisites, database creation, the single-command psql installer, and generation/execution of the pgAdmin SQL bundle. Clarified execution order, transaction handling, automatic seed inclusion, and regeneration after SQL changes.

Added installer files to the directory tree and explained the removal of `alter_tables.sql` and the new `department_heads` relationship. Corrected the backend database environment examples to use the actual `DB_*` variables, with `DB_NAME` matching the installation example.

Validation: compared the instructions against `dbscripts/install.psql`, `dbscripts/README.md`, and `server/.env.example`; `git diff --check` passed. Documentation-only changes; no database commands or application tests were executed.
