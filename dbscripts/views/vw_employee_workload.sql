-- ========================================================
-- View: vw_employee_workload
-- Description: Summarizes active tasks, estimated hours, and total hours logged per employee
-- Note: Modify this existing file directly for any future changes.
-- ========================================================

CREATE OR REPLACE VIEW vw_employee_workload AS
SELECT 
    u.id AS user_id,
    u.employee_code,
    CONCAT(u.first_name, ' ', u.last_name) AS full_name,
    u.email,
    b.branch_name,
    d.dept_name,
    des.desig_name,
    des.hierarchy_level,
    r.role_name,
    COUNT(DISTINCT ta.task_id) FILTER (WHERE NOT ts.is_terminal) AS active_assigned_tasks_count,
    COALESCE(SUM(t.estimated_hours) FILTER (WHERE NOT ts.is_terminal), 0.00) AS total_active_estimated_hours,
    COALESCE(SUM(tl.hours_spent) FILTER (WHERE tl.log_date >= CURRENT_DATE - INTERVAL '30 days'), 0.00) AS hours_logged_last_30_days,
    COALESCE(SUM(tl.hours_spent) FILTER (WHERE tl.is_billable AND tl.log_date >= CURRENT_DATE - INTERVAL '30 days'), 0.00) AS billable_hours_last_30_days
FROM users u
INNER JOIN branches b ON u.primary_branch_id = b.id
INNER JOIN departments d ON u.department_id = d.id
INNER JOIN designations des ON u.designation_id = des.id
INNER JOIN roles r ON u.role_id = r.id
LEFT JOIN task_assignees ta ON u.id = ta.user_id
LEFT JOIN tasks t ON ta.task_id = t.id
LEFT JOIN task_statuses ts ON t.status_id = ts.id
LEFT JOIN task_time_logs tl ON u.id = tl.user_id
WHERE u.is_active = TRUE
GROUP BY 
    u.id, u.employee_code, u.first_name, u.last_name, u.email,
    b.branch_name, d.dept_name, des.desig_name, des.hierarchy_level, r.role_name;
