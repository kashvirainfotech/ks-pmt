-- ========================================================
-- Function: fn_calculate_task_effort
-- Description: Computes aggregated effort (total, billable, non-billable hours) for a given task
-- Note: Modify this existing file directly for any future changes.
-- ========================================================

CREATE OR REPLACE FUNCTION fn_calculate_task_effort(
    p_task_id UUID,
    p_include_subtasks BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
    total_hours NUMERIC(10, 2),
    billable_hours NUMERIC(10, 2),
    non_billable_hours NUMERIC(10, 2)
) AS $$
BEGIN
    IF p_include_subtasks THEN
        RETURN QUERY
        WITH RECURSIVE task_tree AS (
            SELECT id FROM tasks WHERE id = p_task_id
            UNION ALL
            SELECT t.id FROM tasks t
            INNER JOIN task_tree tt ON t.parent_task_id = tt.id
        )
        SELECT 
            COALESCE(SUM(l.hours_spent), 0.00) AS total_hours,
            COALESCE(SUM(CASE WHEN l.is_billable THEN l.hours_spent ELSE 0 END), 0.00) AS billable_hours,
            COALESCE(SUM(CASE WHEN NOT l.is_billable THEN l.hours_spent ELSE 0 END), 0.00) AS non_billable_hours
        FROM task_time_logs l
        INNER JOIN task_tree tt ON l.task_id = tt.id;
    ELSE
        RETURN QUERY
        SELECT 
            COALESCE(SUM(l.hours_spent), 0.00) AS total_hours,
            COALESCE(SUM(CASE WHEN l.is_billable THEN l.hours_spent ELSE 0 END), 0.00) AS billable_hours,
            COALESCE(SUM(CASE WHEN NOT l.is_billable THEN l.hours_spent ELSE 0 END), 0.00) AS non_billable_hours
        FROM task_time_logs l
        WHERE l.task_id = p_task_id;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;
