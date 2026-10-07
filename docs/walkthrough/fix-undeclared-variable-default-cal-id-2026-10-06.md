# Walkthrough: Fix Undeclared Variable `v_default_cal_id` in Sample Data

## 1. Issue Summary
When running the generated `dbscripts/install.sql` script on a PostgreSQL database, the following PL/pgSQL variable compilation error occurred:
```text
ERROR:  "v_default_cal_id" is not a known variable
LINE 14254:     SELECT id INTO v_default_cal_id FROM working_calendars W...
                               ^ 

SQL state: 42601
Character: 931336
```

## 2. Root Cause
In [`dbscripts/inserts/sample_data.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/inserts/sample_data.sql), the sample data is partitioned into two anonymous PL/pgSQL code blocks (`DO $$ ... BEGIN ... END $$;`).
- The second block starts at line 8311 for modular enterprise sample data (`COLLAB-002` through `LATER-002`).
- At line 9279, the block queries the default corporate working calendar and populates a variable:
  ```sql
  SELECT id INTO v_default_cal_id FROM working_calendars WHERE calendar_code = 'CAL-CORP-STD' LIMIT 1;
  ```
- However, `v_default_cal_id` was not declared in the `DECLARE` section of this second block (only in the first block). Because PL/pgSQL requires every variable targeted by `INTO` or referenced in queries to be declared in the block's `DECLARE` block, PostgreSQL raised `42601` (`"v_default_cal_id" is not a known variable`).

## 3. Resolution Details
1. **Added Variable Declaration to `sample_data.sql`**:
   - In [`dbscripts/inserts/sample_data.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/inserts/sample_data.sql), added `v_default_cal_id UUID := '88888888-8888-8888-8888-888888888881';` to the `DECLARE` section of the second anonymous block.
2. **Automated Static Scan Across Entire Repository**:
   - Scanned all PL/pgSQL `DO` blocks across all SQL scripts in `dbscripts/` to confirm that every `v_*` variable referenced in code sections is properly declared in its respective `DECLARE` section.
   - Result: 0 undeclared variables across all scripts.
3. **Re-bundled Installation Manifest**:
   - Re-executed `node dbscripts/build-install.mjs`.
   - Executed `node --test dbscripts/build-install.test.mjs` (all bundle integrity tests passed).

## 4. Verification
- `build-install.mjs` regenerated `dbscripts/install.sql` from 15 canonical source files.
- `v_default_cal_id` is declared at line 13293 and safely populated at line 14255.
