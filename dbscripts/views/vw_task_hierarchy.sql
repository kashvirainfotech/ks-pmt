-- ========================================================
-- View: vw_task_hierarchy
-- Description: Recursive hierarchy representation of parent tasks and nested subtasks
-- Note: Modify this existing file directly for any future changes.
-- ========================================================

CREATE OR REPLACE VIEW vw_task_hierarchy AS
WITH RECURSIVE task_tree AS (
    -- Root tasks (tasks with no parent)
    SELECT 
        t.id AS task_id,
        t.task_code,
        t.title,
        t.task_type_id,
        t.status_id,
        t.priority,
        t.project_id,
        t.product_id,
        t.version_id,
        t.parent_task_id,
        t.estimated_hours,
        t.is_chargeable,
        t.charge_amount,
        t.planned_start_date,
        t.planned_end_date,
        1 AS level,
        ARRAY[t.id] AS path,
        t.title::TEXT AS path_names
    FROM tasks t
    WHERE t.parent_task_id IS NULL

    UNION ALL

    -- Child subtasks
    SELECT 
        c.id AS task_id,
        c.task_code,
        c.title,
        c.task_type_id,
        c.status_id,
        c.priority,
        c.project_id,
        c.product_id,
        c.version_id,
        c.parent_task_id,
        c.estimated_hours,
        c.is_chargeable,
        c.charge_amount,
        c.planned_start_date,
        c.planned_end_date,
        tt.level + 1 AS level,
        tt.path || c.id AS path,
        tt.path_names || ' -> ' || c.title AS path_names
    FROM tasks c
    INNER JOIN task_tree tt ON c.parent_task_id = tt.task_id
)
SELECT 
    th.task_id,
    th.task_code,
    th.title,
    th.level,
    th.path_names,
    tt.type_name AS task_type,
    ts.status_name AS status,
    ts.status_category,
    th.priority,
    th.estimated_hours,
    th.is_chargeable,
    th.charge_amount,
    th.parent_task_id,
    p.project_name,
    pr.product_name,
    v.version_code
FROM task_tree th
INNER JOIN task_types tt ON th.task_type_id = tt.id
INNER JOIN task_statuses ts ON th.status_id = ts.id
LEFT JOIN projects p ON th.project_id = p.id
LEFT JOIN products pr ON th.product_id = pr.id
LEFT JOIN versions v ON th.version_id = v.id;
