# Walkthrough - Fix Foreign Key Constraint in Master Seed Inserts

## Issue Summary
When running [`dbscripts/inserts/inserts.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/inserts/inserts.sql), PostgreSQL threw a foreign key constraint violation error:
```
ERROR: insert or update on table "role_permissions" violates foreign key constraint "role_permissions_role_id_fkey"
SQL state: 23503
Detail: Key (role_id)=(00000000-0000-0000-0000-000000000101) is not present in table "roles".
Context: SQL statement "INSERT INTO role_permissions (role_id, permission_id, created_by)
    SELECT v_role_super_admin, p.id, v_admin_id
    FROM permissions p
    WHERE p.permission_code IN ('AUDIT_LOGS:VIEW', 'NOTIFICATIONS:MANAGE')
    ON CONFLICT (role_id, permission_id) DO NOTHING"
PL/pgSQL function inline_code_block line 12 at SQL statement
```

## Root Cause
In `dbscripts/inserts/inserts.sql`:
1. The initial seed block defines the Super Administrator role (`ROLE_SUPER_ADMIN`) with primary key ID `'44444444-4444-4444-4444-444444444441'`.
2. A subsequent patch block (appended to add permissions for `AUDIT_LOGS` and `NOTIFICATIONS`) mistakenly declared `v_role_super_admin` as `'00000000-0000-0000-0000-000000000101'`.
3. Because `'00000000-0000-0000-0000-000000000101'` does not exist in `roles`, inserting into `role_permissions` failed with `23503` (Foreign Key Constraint Violation).

## Fix Applied
In [`dbscripts/inserts/inserts.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/inserts/inserts.sql), modified the PL/pgSQL block to dynamically resolve the Super Admin role ID from the `roles` table with a fallback to `'44444444-4444-4444-4444-444444444441'`:

```sql
DO $$
DECLARE
    v_admin_id UUID := '00000000-0000-0000-0000-000000000001';
    v_role_super_admin UUID;
BEGIN
    -- Dynamically resolve Super Admin role ID (canonical ID: 44444444-4444-4444-4444-444444444441)
    SELECT id INTO v_role_super_admin
    FROM roles
    WHERE role_code = 'ROLE_SUPER_ADMIN';

    IF v_role_super_admin IS NULL THEN
        v_role_super_admin := '44444444-4444-4444-4444-444444444441';
    END IF;

    INSERT INTO permissions (module, action, permission_code, description, is_active, created_by)
    VALUES 
        ('AUDIT_LOGS', 'VIEW', 'AUDIT_LOGS:VIEW', 'Permission to view system audit logs', TRUE, v_admin_id),
        ('NOTIFICATIONS', 'MANAGE', 'NOTIFICATIONS:MANAGE', 'Permission to broadcast system notifications', TRUE, v_admin_id)
    ON CONFLICT (permission_code) DO NOTHING;

    INSERT INTO role_permissions (role_id, permission_id, created_by)
    SELECT v_role_super_admin, p.id, v_admin_id
    FROM permissions p
    WHERE p.permission_code IN ('AUDIT_LOGS:VIEW', 'NOTIFICATIONS:MANAGE')
    ON CONFLICT (role_id, permission_id) DO NOTHING;
END $$;
```

## Validation & Status
- The UUID lookup now matches `roles.id` populated by the earlier section of `inserts.sql`.
- In compliance with the operational rules, database scripts were not executed directly against any live instance and git commits were not executed.
- You can now re-run `dbscripts/inserts/inserts.sql` in your PostgreSQL client/tool.
