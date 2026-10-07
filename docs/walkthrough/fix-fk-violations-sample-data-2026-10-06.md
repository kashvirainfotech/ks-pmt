# Walkthrough: Fix Foreign Key Violations & Data Alignment in Sample Data

**Date:** 2026-10-06  
**File Modified:** [`dbscripts/inserts/sample_data.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/inserts/sample_data.sql)  
**Bundle Generated:** [`dbscripts/install.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/install.sql)  

---

## 1. Problem Summary

During execution of `install.sql` on a blank PostgreSQL database, the script failed with the following error:

```text
ERROR:  insert or update on table "recurring_task_occurrences" violates foreign key constraint "recurring_task_occurrences_generated_task_id_fkey"
SQL state: 23503
Detail: Key (generated_task_id)=(20000000-0000-0000-0000-0000000003e8) is not present in table "tasks".
Context: SQL statement "INSERT INTO recurring_task_occurrences (
        id, rule_id, scheduled_date, executed_at, generated_task_id, execution_status, created_by
    ) VALUES (
        'f4000000-0000-0000-0000-000000000001',
        'f3000000-0000-0000-0000-000000000002',
        CURRENT_DATE - INTERVAL '5 days',
        CURRENT_TIMESTAMP - INTERVAL '5 days',
        '20000000-0000-0000-0000-0000000003e8',
        'SUCCESS',
        v_admin_id
    ) ON CONFLICT (rule_id, scheduled_date) DO NOTHING"
PL/pgSQL function inline_code_block line 175 at SQL statement
```

---

## 2. Root Cause & Proactive Schema Audit

### A. Non-Existent Task ID `...03e8`
In [`dbscripts/inserts/sample_data.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/inserts/sample_data.sql), tasks in the `tasks` table start numbering from `20000000-0000-0000-0000-0000000003e9` (`TSK-ERP-001`, hex 1001) through `...04ba`. The UUID `20000000-0000-0000-0000-0000000003e8` (hex 1000) was never inserted, violating the foreign key `recurring_task_occurrences(generated_task_id) REFERENCES tasks(id)`.

### B. Subsequent Cascading Foreign Key & Data Shifts Discovered
A full automated constraint validation of [`sample_data.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/inserts/sample_data.sql) revealed multiple downstream FK discrepancies that would have sequentially halted the installer:

1. **`issue_environment_observations` (lines 8891–8951)**:
   - **Tuple 1 (OBS-2026-0001)**: Referenced non-existent task `...03e8` instead of bug task `20000000-0000-0000-0000-0000000003ea` (`TSK-ERP-002`).
   - **Tuples 2 & 3 (OBS-2026-0002 & OBS-2026-0003)**: Omitted the `environment_id` column, causing every following value to shift into the wrong column (e.g. `client_contact_id` received browser user-agent strings, `tester_user_id` received a calendar ID, and `version_id` received status strings like `'FAILED'`).
2. **`qa_environments` (lines 8860–8887)**:
   - `ENV-APEX-UAT` used client ID `...7771` (does not exist in `clients`) instead of `77777777-7777-7777-7777-777777777772` (`CLI-ACME`).
   - `ENV-ZENITH-ONPREM` used client ID `...7772` instead of `77777777-7777-7777-7777-777777777774` (`CLI-ZENITH`).
3. **`risk_alerts` (lines 9406–9460)**:
   - Tuple 1 had swapped `project_id` and `client_id`, with `project_id` pointing to user ID `...0002` and `client_id` pointing to project `...0001`.
   - Tuples 2 & 3 had `project_id` set to user ID `'00000000-0000-0000-0000-000000000001'`.
4. **User ID Mistakenly Passed as `project_id` Across Analytics & Financial Modules**:
   - `wip_limits`
   - `wip_override_exceptions`
   - `flow_aging_configurations`
   - `daily_cumulative_flow_snapshots` (all 24 daily CFD snapshot rows)
   - `capacity_reservations`
   - `team_capacity_metrics`
   - `project_financial_rates`
   - `project_financial_baselines`
   - `project_financial_metrics`
   - `project_health_score_configs`
   - `project_health_evaluations`
   - `schedule_scenarios`
   All of the above tables used `'00000000-0000-0000-0000-000000000001'` (admin user ID) for `project_id` instead of `'b0000000-0000-0000-0000-000000000001'` (`PRJ-ACME-PAY`), which violated `REFERENCES projects(id)`.

---

## 3. Changes Applied

### A. [`dbscripts/inserts/sample_data.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/inserts/sample_data.sql)
1. **`recurring_task_occurrences`**: Updated `generated_task_id` to `'20000000-0000-0000-0000-0000000003e9'`.
2. **`change_activity_baselines`**: Updated `committedTaskIds` JSON array from `...03e8` to `...03ea`.
3. **`qa_environments`**:
   - `ENV-APEX-UAT`: `client_id` set to `'77777777-7777-7777-7777-777777777772'`.
   - `ENV-ZENITH-ONPREM`: `client_id` set to `'77777777-7777-7777-7777-777777777774'`.
4. **`issue_environment_observations`**:
   - Set `task_id` = `'20000000-0000-0000-0000-0000000003ea'` across all three observations.
   - Restored missing `environment_id` in Tuples 2 and 3 (`'e0000000-0000-0000-0000-000000000002'` and `'e0000000-0000-0000-0000-000000000003'`).
   - Realigned all 18 columns per tuple (valid client contact ID, tester user ID, browser info, os info, evidence, etc.).
5. **`risk_alerts`**:
   - Tuple 1: `project_id` = `'b0000000-0000-0000-0000-000000000001'`, `client_id` = `'77777777-7777-7777-7777-777777777772'`.
   - Tuples 2 & 3: `project_id` = `'b0000000-0000-0000-0000-000000000001'`.
6. **Analytics & Financials**:
   - Updated `project_id` to `'b0000000-0000-0000-0000-000000000001'` across `wip_limits`, `wip_override_exceptions`, `flow_aging_configurations`, `daily_cumulative_flow_snapshots`, `capacity_reservations`, `team_capacity_metrics`, `project_financial_rates`, `project_financial_baselines`, `project_financial_metrics`, `project_health_score_configs`, `project_health_evaluations`, and `schedule_scenarios`.

### B. Bundle Generation & Verification
1. Re-generated [`dbscripts/install.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/install.sql) with:
   ```powershell
   node dbscripts/build-install.mjs
   ```
2. Ran manifest and bundle verification test suite:
   ```powershell
   node --test dbscripts/build-install.test.mjs
   ```
   **Result:** `2 pass, 0 fail`.

---

## 4. Verification Instructions for User / DBA

To test against your blank database:
```powershell
node dbscripts/build-install.mjs
```
Then run [`dbscripts/install.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/install.sql) in pgAdmin or run [`dbscripts/install.psql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/install.psql) via `psql`.
