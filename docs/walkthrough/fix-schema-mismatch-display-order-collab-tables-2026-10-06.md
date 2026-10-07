# Walkthrough: Fix Schema Discrepancies in `task_templates` & Collaboration Masters

## 1. Issue Summary
When executing the regenerated `dbscripts/install.sql` bundle on a blank PostgreSQL database, the execution failed with the following error:
```text
ERROR:  column "display_order" does not exist 
SQL state: 42703
```

## 2. Root Cause
In [`dbscripts/indexes/indexes.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/indexes/indexes.sql), line 366 creates an index on `task_templates`:
```sql
CREATE INDEX IF NOT EXISTS idx_task_templates_proj ON task_templates(project_template_id, display_order);
```
However, in [`dbscripts/tables/tables.sql`](file:///c:/Projects/KashviraInfotech/ks-pmt/dbscripts/tables/tables.sql), the `task_templates` table definition had retained an older drafting column name:
- Defined as `order_index` instead of `display_order`.
- Also used `template_code` instead of `task_template_code`, and was missing `hierarchy_level`, `parent_task_template_id`, `default_role_code`, and `checklists_template`.

Further automated cross-file analysis between canonical tables, indexes, services (`templates.service.ts`, `notifications.service.ts`), DTOs, and seed data (`sample_data.sql`) identified matching drift across modules `COLLAB-002` (Tables 74–77) and `COLLAB-003` (Tables 78–80):
1. **`project_templates`**: Missing `'CUSTOM'` category, used `default_billing_type` instead of `target_engagement_model`, and `estimated_duration_days` instead of `default_estimated_duration_days`.
2. **`task_templates`**: Column naming differences (`order_index` vs `display_order`, `template_code` vs `task_template_code`, missing `parent_task_template_id`, `hierarchy_level`, `default_role_code`, `checklists_template`).
3. **`recurring_work_rules`**: Used `interval_value` vs `interval_count`, `default_assignee_id` vs `default_assignee_user_id`, `target_priority` vs `default_priority`, and missing `month_of_year`, `total_occurrences_count`.
4. **`recurring_task_occurrences`**: Used `task_id` vs `generated_task_id`, `generated_at` vs `executed_at`, and missing `execution_status`, `error_message`.
5. **`work_item_watchers`**: Missing granular toggle columns (`notify_on_status_change`, `notify_on_comments`, `notify_on_attachments`, `notify_on_approvals`).
6. **`user_notification_settings`**: Column names differed from service/sample data (`email_notifications_enabled`, `in_app_notifications_enabled`, `push_notifications_enabled`).
7. **`notification_delivery_queue`**: Column names differed (`delivery_channel`, `event_category`, `event_title`, `event_summary`, `entity_code`, `delivered_at`).

## 3. Resolution Details
1. **Aligned Canonical Table Definitions (`dbscripts/tables/tables.sql`)**:
   - In accordance with the development lifecycle in `AGENTS.md`, edited the canonical `CREATE TABLE` definitions in place (Tables 74 through 80) to exactly match the application queries, DTO interfaces, indexes, and sample seeds.
2. **Automated Static Verification**:
   - Verified that all 134 tables in `tables.sql` fully cover all referenced columns in:
     - `indexes.sql`: **0 missing columns**.
     - `inserts.sql`: **0 missing columns**.
     - `sample_data.sql`: **0 missing columns**.
3. **Rebuilt Installation Script**:
   - Executed `node dbscripts/build-install.mjs`.
   - Executed `node --test dbscripts/build-install.test.mjs` (both installer test suites passed).

## 4. Verification
- `build-install.mjs` generated `dbscripts/install.sql` from 15 canonical source files with zero errors.
- Index and insert column consistency verified at 100%.
- Server test suite passed with 26/26 test suites passing (213 tests).
