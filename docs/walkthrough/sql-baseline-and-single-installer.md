# SQL Baseline and Single Installer

Reviewed all SQL object files and removed standalone `ALTER`, `DROP`, `DELETE`, and `UPDATE` statements from the database scripts. Preserved `ON DELETE` foreign-key actions, trigger events, application function bodies, and required seed inserts.

## Schema changes

- Folded all 19 added columns into their original `CREATE TABLE` definitions, preserving types, defaults, checks, and foreign keys.
- Made `projects.client_id` nullable in its creation definition for internal projects.
- Removed `tables/alter_tables.sql`, four trigger-drop statements, and the redundant Super Admin password update. The existing seed insert already contains the corrected password hash and flags.
- Replaced `departments.hod_user_id` with a `department_heads` relationship table. Its department primary key allows one head per department; both relationships have inline foreign keys. Deleting a user removes their head assignments while preserving departments. All audit columns are included.
- Updated department create/update/list/detail/status APIs and department-head auto-assignment to use the relationship table while preserving `hod_user_id` in API responses. Department changes and head assignments share a transaction. Omitting `hodUserId` preserves an assignment; explicitly passing null clears it.
- Added a user lookup index for the relationship table. Existing databases require a fresh developer-managed rebuild before running the updated backend; this is not a live-data migration.

## Single-command installation

Object files remain separate. The developer / DBA can run the complete ordered installation from the project root against an already-created blank database:

```bash
psql -X -v ON_ERROR_STOP=1 -U postgres -d kspmt_db -f dbscripts/install.psql
```

For pgAdmin Query Tool, generate the plain SQL bundle:

```bash
node dbscripts/build-install.mjs
```

Then open `dbscripts/install.sql` in the Query Tool and execute the entire file. The bundle is generated locally and Git-ignored; regenerate it after SQL changes. The generator does not connect to a database. Both installers wrap extensions, tables, functions, triggers, views, indexes, and seeds in a transaction. See [database instructions](../../dbscripts/README.md) for prerequisites and error handling, based on the [psql reference](https://www.postgresql.org/docs/18/app-psql.html) and [pgAdmin toolbar reference](https://www.pgadmin.org/docs/pgadmin4/latest/query_tool_toolbar.html).

## Validation

- PostgreSQL syntax parser: parsed all 14 canonical SQL files plus the generated bundle; no standalone `ALTER`, `DROP`, `DELETE`, or `UPDATE` statements found.
- Static AST comparison: all 19 formerly added columns retain their original definitions and project client remains nullable.
- All 30 tables contain audit columns; every inline foreign-key target exists in creation order and references an existing column. No circular table dependency remains.
- Changed backend static SQL statements parsed without contacting PostgreSQL.
- `node --test dbscripts/build-install.test.mjs`: two tests passed, covering verbatim ordered inclusion, deterministic generation, transaction boundaries, and rejection of omitted/duplicate/missing/out-of-folder sources.
- Focused department and assignment tests: two suites / 11 tests passed, including API shape, head changes, omitted/null handling, and rollback on a failed head assignment.
- Backend production build passed.

No SQL was executed against any database. Parser, mocked unit, and bundle tests do not replace the developer / DBA's blank-database installation test. No commits or pushes were made.
