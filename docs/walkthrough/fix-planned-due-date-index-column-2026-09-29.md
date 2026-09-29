# Fix: Corrected `planned_due_date` to `planned_end_date` in Database Indexes

**Date:** 2026-09-29  
**Issue:** `ERROR: column "planned_due_date" does not exist` when executing `install.sql` in pgAdmin against a blank database.  
**Resolution:** Replaced invalid column reference `planned_due_date` with canonical database column `planned_end_date` in `dbscripts/indexes/indexes.sql` and regenerated `dbscripts/install.sql`.

---

## 1. Root Cause Analysis

In `dbscripts/indexes/indexes.sql`:
```sql
-- Line 143:
CREATE INDEX IF NOT EXISTS idx_tasks_sorting_priority_due ON tasks(priority, planned_due_date ASC);
```
In the `tasks` table schema ([`dbscripts/tables/tables.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/tables/tables.sql#L532-L535)):
```sql
    planned_start_date TIMESTAMP WITH TIME ZONE,
    planned_end_date TIMESTAMP WITH TIME ZONE,
    actual_start_date TIMESTAMP WITH TIME ZONE,
    actual_end_date TIMESTAMP WITH TIME ZONE,
```
The canonical column name in the database schema is `planned_end_date`. The index had inadvertently referenced the frontend property alias (`planned_due_date`), which caused PostgreSQL to fail during blank database initialization.

---

## 2. Changes Made

1. **`dbscripts/indexes/indexes.sql`**:
   Updated index definition:
   ```sql
   CREATE INDEX IF NOT EXISTS idx_tasks_sorting_priority_due ON tasks(priority, planned_end_date ASC);
   ```

2. **Generated Bundle Regeneration**:
   Ran the installation bundle generator:
   ```bash
   node dbscripts/build-install.mjs
   ```
   Regenerated `dbscripts/install.sql` cleanly without executing SQL.

3. **Cross-Table Comprehensive Audit**:
   Executed a verification script across all 57 database tables in `dbscripts/tables/tables.sql` against all index definitions in `dbscripts/indexes/indexes.sql`. All column references matched with zero errors.

4. **Test Suite Verification**:
   All 20 backend test suites passed (136/136 tests).
