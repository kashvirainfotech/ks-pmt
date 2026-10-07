# Walkthrough: Fix PL/pgSQL Syntax Error at DECLARE in Sample Data

## 1. Issue Summary
When running `dbscripts/install.sql` (generated via `node dbscripts/build-install.mjs`) on a PostgreSQL database, the following syntax error was raised:
```text
ERROR:  syntax error at or near "DECLARE"
LINE 13293: DECLARE
            ^ 

SQL state: 42601
Character: 892399
```

## 2. Root Cause
In [`dbscripts/inserts/sample_data.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/inserts/sample_data.sql), an anonymous PL/pgSQL code block starting at line 8311 was missing the dollar-quote delimiter `$$`:
```sql
DO 
DECLARE
    v_admin_id UUID := '00000000-0000-0000-0000-000000000001';
...
```
Furthermore, the closing statement at line 10029 had `END ;` instead of `END $$;`.

In PostgreSQL, the `DO` command expects a string literal containing procedural language code (e.g., `DO $$ ... END $$;`). When `DO` was immediately followed by `DECLARE` without `$$`, PostgreSQL parsed `DECLARE` as a SQL keyword following `DO` rather than the start of a string block, raising syntax error `42601`.

## 3. Resolution Details
1. **Updated [`dbscripts/inserts/sample_data.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/inserts/sample_data.sql)**:
   - Fixed the start of the block from `DO` to `DO $$`.
   - Fixed the end of the block from `END ;` to `END $$;`.
2. **Re-bundled Installation Manifest**:
   - Executed `node dbscripts/build-install.mjs` to regenerate `dbscripts/install.sql`.
   - Verified that the generated bundle now contains properly formed `DO $$ ... END $$;` blocks with balanced delimiters.

## 4. Verification
- Scanned all SQL files across `dbscripts/` for any other bare `DO` statements or unclosed dollar-quote blocks; no other syntax anomalies were found.
- Generated `dbscripts/install.sql` successfully from all 15 object files.
- Verified line context around line 13293 and line 15010 in `dbscripts/install.sql`.
