# Walkthrough: Fix Invalid UUID Syntax in Sample Data

**Date:** 2026-10-06  
**File Modified:** [`dbscripts/inserts/sample_data.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/inserts/sample_data.sql)  
**Bundle Generated:** [`dbscripts/install.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/install.sql)  

---

## 1. Problem Summary

When executing [`dbscripts/install.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/install.sql) on PostgreSQL, the installer halted with the following error:

```text
ERROR:  invalid input syntax for type uuid: "h1000000-0000-0000-0000-000000000001"
LINE 6:         'h1000000-0000-0000-0000-000000000001', 'b0000000-00...
                ^
QUERY:  INSERT INTO project_health_score_configs (
        id, project_id, weight_schedule, weight_scope, weight_quality, weight_blockers, weight_budget_flow,
        schedule_slip_warning_days, schedule_slip_critical_days, defect_density_critical_ratio,
        blocker_age_critical_hours, missing_data_strategy, is_active, created_by
    ) VALUES (
        'h1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
        30.00, 20.00, 20.00, 15.00, 15.00,
        3, 7, 0.25, 48.00, 'NEUTRAL_SCORE', TRUE, v_admin_id
    ) ON CONFLICT (project_id) DO NOTHING
CONTEXT:  PL/pgSQL function inline_code_block line 1477 at SQL statement 

SQL state: 22P02
```

---

## 2. Root Cause Analysis

PostgreSQL `UUID` columns strictly enforce standard hexadecimal notation (`0-9`, `a-f`, `A-F`). Characters outside this range (`g-z`) are invalid.
An automated scan of all `.sql` files across the codebase identified 13 UUID literals that used non-hexadecimal prefixes:

| Non-Hex Literal | Invalid Characters | Table / Column | Canonical Hex Replacement |
|---|---|---|---|
| `'h1000000-0000-0000-0000-000000000001'` | `h` | `project_health_score_configs.id` | `'ba100000-0000-0000-0000-000000000001'` |
| `'h2000000-0000-0000-0000-000000000001'` | `h` | `project_health_evaluations.id` | `'ba200000-0000-0000-0000-000000000001'` |
| `'s1000000-0000-0000-0000-000000000001'` | `s` | `schedule_scenarios.id` & `schedule_scenario_task_overrides.scenario_id` | `'ba300000-0000-0000-0000-000000000001'` |
| `'w1000000-0000-0000-0000-000000000001'` | `w` | `webhook_subscriptions.id` & `webhook_deliveries.subscription_id` | `'bb100000-0000-0000-0000-000000000001'` |
| `'w1000000-0000-0000-0000-000000000002'` | `w` | `webhook_subscriptions.id` | `'bb100000-0000-0000-0000-000000000002'` |
| `'w2000000-0000-0000-0000-000000000001'` | `w` | `webhook_deliveries.id` | `'bb200000-0000-0000-0000-000000000001'` |
| `'w2000000-0000-0000-0000-000000000002'` | `w` | `webhook_deliveries.id` | `'bb200000-0000-0000-0000-000000000002'` |
| `'pkg00000-0000-0000-0000-000000000001'` | `p`, `k`, `g` | `configuration_packages.id` | `'bc100000-0000-0000-0000-000000000001'` |
| `'pkg00000-0000-0000-0000-000000000002'` | `p`, `k`, `g` | `configuration_packages.id` | `'bc100000-0000-0000-0000-000000000002'` |

---

## 3. Resolution & Verification

1. **[`dbscripts/inserts/sample_data.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/inserts/sample_data.sql)**:
   - Replaced all 13 instances with valid hex-prefixed UUIDs (`ba...`, `bb...`, `bc...`).
   - Re-scanned all `.sql` files: verified **0 invalid UUIDs** remain across the entire repository.
2. **Bundle Re-generation**:
   - Rebuilt [`dbscripts/install.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/install.sql) with:
     ```powershell
     node dbscripts/build-install.mjs
     ```
3. **Automated Testing**:
   - Ran `node --test dbscripts/build-install.test.mjs`: `2 pass, 0 fail`.
