# Walkthrough: Fix Unclosed Parenthesis in Sample Data `team_capacity_metrics`

## 1. Issue Summary
When running the regenerated `dbscripts/install.sql` bundle on a PostgreSQL database, the script failed at the very end of the second anonymous PL/pgSQL block:
```text
ERROR:  unexpected end of function definition at end of input
LINE 15005: END $$;
                ^ 

SQL state: 42601
Character: 977207
```

## 2. Root Cause
In [`dbscripts/inserts/sample_data.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/inserts/sample_data.sql), the `INSERT INTO team_capacity_metrics` statement around line 9716 was truncated mid-clause:
```sql
    -- Team Capacity & Estimation Metrics
    INSERT INTO team_capacity_metrics (
        team_id, project_id, sprint_id, metric_period_start, metric_period_end,
        available_hours, allocated_demand_hours, logged_actual_hours, completed_tasks_count,
        estimation_accuracy_index, on_time_delivery_rate, first_time_right_rate,
        rework_count, sample_size, is_active, created_by
    ) VALUES
        ('c0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001',
         CURRENT_DATE - 14, CURRENT_DATE,
         160.00, 140.00, 136.00, 12,
         0.9412, 91.67, 83.33,
    -- ========================================================
    -- ANALYTICS-004: Project Financials, Variance, Rate Cards & Currencies Sample Data
    -- ========================================================
```
Because the values tuple opened with `(` at line 9717 without providing the remaining columns (`rework_count`, `sample_size`, `is_active`, `created_by`) or the closing `);`, PL/pgSQL treated subsequent statements as part of the unclosed SQL expression. When the PL/pgSQL parser reached `END $$;` at the end of the script, it reached EOF (`$end`) while still expecting a closing parenthesis `)`, raising `unexpected end of function definition at end of input`.

## 3. Resolution Details
1. **Completed Truncated Statement in [`dbscripts/inserts/sample_data.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/inserts/sample_data.sql)**:
   - Appended the missing values (`2, 12, TRUE, v_admin_id);`) to complete all 16 target columns and terminate the statement cleanly.
2. **Repository-Wide Automated Parenthesis & Delimiter Audit**:
   - Performed an automated AST scan across all `.sql` files in `dbscripts/` verifying:
     - Parentheses balance: **0 unclosed parentheses**.
     - Statement terminations: **0 trailing unterminated clauses**.
     - Table/index/insert consistency: **0 column discrepancies**.
3. **Re-bundled Installation Manifest**:
   - Executed `node dbscripts/build-install.mjs`.
   - Executed `node --test dbscripts/build-install.test.mjs` (both test suites passed).

## 4. Verification
- `build-install.mjs` generated `dbscripts/install.sql` from 15 canonical source files with zero errors.
- Verified that all statements in `dbscripts/install.sql` have matching delimiters, balanced parentheses, and proper statement terminators.
