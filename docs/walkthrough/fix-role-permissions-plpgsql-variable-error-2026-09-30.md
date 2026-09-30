# Walkthrough: Fix PL/pgSQL Variable Error `v_role_pm` in Seed Inserts

## 1. Issue Summary
When executing the newly bundled `dbscripts/install.sql` on a blank PostgreSQL database in pgAdmin, the following error occurred during seed insertion:
```text
ERROR:  column "v_role_pm" does not exist
LINE 2:     SELECT v_role_pm, p.id, v_admin_id
                   ^
QUERY:  INSERT INTO role_permissions (role_id, permission_id, created_by)
    SELECT v_role_pm, p.id, v_admin_id
    FROM permissions p
    WHERE p.permission_code IN (...)
    ON CONFLICT (role_id, permission_id) DO NOTHING
CONTEXT:  PL/pgSQL function inline_code_block line 88 at SQL statement 
SQL state: 42703
```

## 2. Root Cause
In [`dbscripts/inserts/inserts.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/inserts/inserts.sql), an anonymous PL/pgSQL code block (`DO $$ ... BEGIN ... END $$;`) seeded new system permissions and assigned them to roles (`v_role_super_admin`, `v_role_pm`, and `v_role_support`).

However, inside that specific `DO $$` block:
- `v_role_pm` and `v_role_support` were **not declared** in the `DECLARE` section.
- Since PL/pgSQL treats undeclared identifiers in query context as column names of the queried tables, PostgreSQL looked for a column named `v_role_pm` on the `permissions` table, triggering error `42703 (undefined_column)`.

## 3. Resolution Details
1. **Declared Role Variables in `inserts.sql`**:
   Added `v_role_pm UUID;` and `v_role_support UUID;` to the `DECLARE` section of the block.
2. **Initialized Roles from Table with Fallbacks**:
   ```sql
   SELECT id INTO v_role_pm FROM roles WHERE role_code = 'ROLE_PROJECT_MANAGER';
   IF v_role_pm IS NULL THEN
       v_role_pm := '44444444-4444-4444-4444-444444444443';
   END IF;

   SELECT id INTO v_role_support FROM roles WHERE role_code = 'ROLE_SUPPORT_EXEC';
   IF v_role_support IS NULL THEN
       v_role_support := '44444444-4444-4444-4444-444444444446';
   END IF;
   ```
3. **Rebuilt Installation Script Bundle**:
   Re-ran `node dbscripts/build-install.mjs` to regenerate `dbscripts/install.sql` with the corrected seed logic.

## 4. Verification
- `dbscripts/inserts/inserts.sql` validated for all variables and references.
- `node dbscripts/build-install.mjs` executed successfully (14 object files bundled).
- Full backend automated test suite executed.
