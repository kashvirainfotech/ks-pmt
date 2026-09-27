# Database Scripts

KS-PMT is **under development**. After major changes, the developer / DBA installs and tests against a **blank PostgreSQL database**. Edit canonical `CREATE` definitions directly. Do not accumulate schema migrations or standalone `ALTER`, `DROP`, `UPDATE`, or `DELETE` statements. Required seed inserts, `ON DELETE` foreign-key actions, trigger events, and function bodies remain part of the application.

**Agents never execute these scripts.** Installation and database validation are manual developer / DBA steps. This installer is not an upgrade or reset command for an existing database. Once the project is declared live, use reviewed incremental migrations instead.

## Keep objects separate

| Objects | Canonical files |
| --- | --- |
| Tables and inline constraints | `tables/tables.sql` |
| Indexes | `indexes/indexes.sql` |
| Seed data | `inserts/inserts.sql` |
| Functions, procedures, views, triggers, sequences | Individual files in their corresponding folders |

The former `tables/alter_tables.sql` has been removed; its changes are included in the current table definitions. `department_heads` stores one optional head assignment per department, breaking the users/departments foreign-key cycle. The API still exposes `hod_user_id`. Both relationships are enforced with inline foreign keys, and deleting a user removes the assignment without deleting the department.

All tables must retain audit columns (`created_by`, `created_at`, `updated_by`, `updated_at`), and master tables must retain `is_active`. Edit existing definitions in place during development. New table, index, or seed definitions use the datetime header required by `AGENTS.md`.

## Terminal: one command

Prerequisites: PostgreSQL 15+, the `psql` client, an already-created blank database, and a database user permitted to create objects in `public` and install the `uuid-ossp` and `pgcrypto` extensions. Extension packages must be available on the PostgreSQL server. Use the database name configured in your backend environment.

From the project root:

```bash
psql -X -v ON_ERROR_STOP=1 -U postgres -d kspmt_db -f dbscripts/install.psql
```

Add `-h hostname -p 5432` when needed. `psql` prompts for a password if required; no credentials belong in the scripts.

`install.psql` includes every canonical SQL file in dependency order using `\ir`, so its includes are relative to the installer rather than the terminal's working directory. It enables stop-on-error and wraps the installation in a transaction. Successful execution commits the whole installation; an error terminates the command and rolls it back when the connection closes. `-X` ignores local psql startup customizations. See the [PostgreSQL psql reference](https://www.postgresql.org/docs/18/app-psql.html).

Order: tables and extensions → functions → triggers → views → indexes → seed data. Add any new object file to `install.psql` in dependency order.

## pgAdmin Query Tool: one SQL file

The Query Tool runs SQL, so use a plain SQL bundle instead of the psql-specific `\ir` commands.

1. Generate the bundle from the current object files (Node.js 20+):

   ```bash
   node dbscripts/build-install.mjs
   ```

2. In pgAdmin, select the blank database and open **Query Tool**.
3. Use **Open File** to open `dbscripts/install.sql`.
4. Clear any text selection and choose **Execute script** to run the entire file. These controls are documented in the [pgAdmin Query Tool toolbar reference](https://www.pgadmin.org/docs/pgadmin4/latest/query_tool_toolbar.html).
5. Check the Messages panel for successful completion. If an error leaves the session in an aborted transaction, execute `ROLLBACK;` before retrying the corrected script.

The bundle contains the same transaction and SQL as the terminal installer, without psql commands. It includes seed data and creates the documented Super Admin account. It does not create the database itself. Do not execute only a selected section if you want an atomic installation.

`install.sql` is generated and Git-ignored to prevent duplicated definitions from drifting. Regenerate it after every SQL change. The generator fails if an object file is missing from the manifest, included twice, absent from disk, or outside the object folders. Generation only reads and writes local files; it never connects to a database.

You can also run the generated bundle from a terminal:

```bash
psql -X -v ON_ERROR_STOP=1 -U postgres -d kspmt_db -f dbscripts/install.sql
```

## Local checks without a database

```bash
node --test dbscripts/build-install.test.mjs
node dbscripts/build-install.mjs
```

These checks validate the bundle's contents and manifest, not database execution. The developer / DBA must still test the resulting installation on a blank database.
