-- ========================================================
-- View: vw_project_financial_summary
-- Description: Aggregates project contract values, total budgeted hours, 
--              total logged hours, billable amounts, and chargeable task charges.
-- Note: Modify this existing file directly for any future changes.
-- ========================================================

CREATE OR REPLACE VIEW vw_project_financial_summary AS
SELECT 
    p.id AS project_id,
    p.project_code,
    p.project_name,
    p.billing_type,
    p.currency,
    p.contract_amount,
    p.hourly_rate,
    p.budgeted_hours,
    p.project_status,
    c.id AS client_id,
    c.company_name AS client_name,
    b.id AS branch_id,
    b.branch_name,
    CONCAT(u.first_name, ' ', u.last_name) AS project_manager_name,
    COUNT(DISTINCT t.id) AS total_tasks_count,
    COUNT(DISTINCT CASE WHEN ts.is_terminal THEN t.id END) AS completed_tasks_count,
    COALESCE(SUM(t.charge_amount) FILTER (WHERE t.is_chargeable = TRUE), 0.00) AS total_chargeable_tasks_amount,
    COALESCE(SUM(tl.hours_spent), 0.00) AS total_actual_hours_logged,
    COALESCE(SUM(tl.hours_spent) FILTER (WHERE tl.is_billable = TRUE), 0.00) AS total_billable_hours_logged,
    CASE 
        WHEN p.billing_type = 'TIME_AND_MATERIAL' THEN 
            COALESCE(SUM(tl.hours_spent) FILTER (WHERE tl.is_billable = TRUE), 0.00) * p.hourly_rate
        ELSE p.contract_amount
    END AS estimated_realized_revenue
FROM projects p
LEFT JOIN clients c ON p.client_id = c.id
INNER JOIN branches b ON p.branch_id = b.id
INNER JOIN users u ON p.project_manager_user_id = u.id
LEFT JOIN tasks t ON p.id = t.project_id
LEFT JOIN task_statuses ts ON t.status_id = ts.id
LEFT JOIN task_time_logs tl ON t.id = tl.task_id
WHERE p.is_active = TRUE
GROUP BY 
    p.id, p.project_code, p.project_name, p.billing_type, p.currency, 
    p.contract_amount, p.hourly_rate, p.budgeted_hours, p.project_status,
    c.id, c.company_name, b.id, b.branch_name, u.first_name, u.last_name;
