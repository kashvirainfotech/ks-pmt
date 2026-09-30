# Walkthrough: Fix "relation requirements does not exist" in Database Installer Bundle

**Date & Time**: 2026-09-30 10:43:00 IST  
**Issue Reported**: pgAdmin error executing `install.sql` on blank database:
```
ERROR: relation "requirements" does not exist
SQL state: 42P01
```

---

## 1. Root Cause Analysis

1. In [`dbscripts/tables/tables.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/tables/tables.sql), the Table 44 definition (CLIENT-003) is named **`requirement_specifications`**, not `requirements`:
   ```sql
   -- 44. Requirement Specifications (CLIENT-003)
   CREATE TABLE IF NOT EXISTS requirement_specifications (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       req_code VARCHAR(50) NOT NULL UNIQUE,
       ...
   );
   ```
2. In Table 56 (`raid_items`), the foreign key on line 1616 incorrectly referenced `requirements(id)`:
   ```sql
   requirement_id UUID REFERENCES requirements(id) ON DELETE SET NULL,
   ```
   Because PostgreSQL does not have a relation named `requirements`, executing the script on a blank database threw:
   `ERROR: relation "requirements" does not exist (SQL state: 42P01)`.
3. In `server/src/modules/raid/raid.service.ts` lines 428 and 463, the queries also joined `requirements r` instead of `requirement_specifications r`.

---

## 2. Corrections Applied

1. **Table Schema ([`dbscripts/tables/tables.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/tables/tables.sql#L1616))**:
   Updated the foreign key definition in `raid_items`:
   ```sql
   requirement_id UUID REFERENCES requirement_specifications(id) ON DELETE SET NULL,
   ```
2. **Backend Queries ([`server/src/modules/raid/raid.service.ts`](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/modules/raid/raid.service.ts))**:
   Updated lines 428 and 463 to:
   ```sql
   LEFT JOIN requirement_specifications r ON ri.requirement_id = r.id
   ```
3. **Regenerated Installer Bundle ([`dbscripts/install.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/install.sql))**:
   Ran `node dbscripts/build-install.mjs` to regenerate `dbscripts/install.sql`.
4. **Automated Schema Ordering & Foreign Key Validation**:
   Wrote and executed a script verifying that every foreign key referenced in `install.sql` points to a table defined **before** it.
   - Result: `SUCCESS: All referenced tables are defined BEFORE they are referenced!`
5. **Backend Verification**:
   Ran `npm test -- raid.service.spec.ts` (9 passed, 9 total).
