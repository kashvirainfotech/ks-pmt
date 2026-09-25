-- ========================================================
-- View: vw_product_license_summary
-- Description: Aggregates product client licenses, AMC renewals, and recurring contract value
-- Note: Modify this existing file directly for any future changes.
-- ========================================================

CREATE OR REPLACE VIEW vw_product_license_summary AS
SELECT 
    pr.id AS product_id,
    pr.product_code,
    pr.product_name,
    pr.category,
    pr.current_version,
    pr.base_license_price,
    pr.standard_amc_percentage,
    pr.currency,
    CONCAT(u.first_name, ' ', u.last_name) AS product_manager_name,
    COUNT(DISTINCT pcm.client_id) AS total_licensed_clients,
    COUNT(DISTINCT CASE WHEN pcm.status = 'ACTIVE' THEN pcm.id END) AS active_licenses_count,
    COUNT(DISTINCT CASE WHEN pcm.status = 'PENDING_RENEWAL' THEN pcm.id END) AS pending_renewal_count,
    COALESCE(SUM(pcm.contract_value) FILTER (WHERE pcm.status = 'ACTIVE'), 0.00) AS total_active_contract_value,
    COALESCE(SUM(pcm.amc_amount) FILTER (WHERE pcm.status = 'ACTIVE'), 0.00) AS total_annual_amc_value,
    COUNT(DISTINCT t.id) AS total_product_tasks_count,
    COUNT(DISTINCT CASE WHEN tt.type_code = 'BUG' THEN t.id END) AS total_bugs_reported
FROM products pr
LEFT JOIN users u ON pr.product_manager_user_id = u.id
LEFT JOIN product_client_mappings pcm ON pr.id = pcm.product_id AND pcm.is_active = TRUE
LEFT JOIN tasks t ON pr.id = t.product_id
LEFT JOIN task_types tt ON t.task_type_id = tt.id
WHERE pr.is_active = TRUE
GROUP BY 
    pr.id, pr.product_code, pr.product_name, pr.category, pr.current_version,
    pr.base_license_price, pr.standard_amc_percentage, pr.currency,
    u.first_name, u.last_name;
