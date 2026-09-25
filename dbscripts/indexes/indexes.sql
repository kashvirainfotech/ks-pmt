-- ========================================================
-- Date & Time: 2026-09-25 13:17:00 IST
-- Author: Database Architect (KS-PMT)
-- Description: Performance & Relational Indexes for KS-PMT
-- Note: All new CREATE INDEX statements must be appended at the end of this file with a datetime header.
-- ========================================================

-- Foreign Key & Organizational Indexes
CREATE INDEX IF NOT EXISTS idx_users_primary_branch ON users(primary_branch_id);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_designation ON users(designation_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_reporting_manager ON users(reporting_manager_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile_number);

-- Multi-Branch & Permission Override Indexes
CREATE INDEX IF NOT EXISTS idx_user_branches_user ON user_branches(user_id);
CREATE INDEX IF NOT EXISTS idx_user_branches_branch ON user_branches(branch_id);
CREATE INDEX IF NOT EXISTS idx_user_perm_override_user ON user_permission_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_user_perm_override_perm ON user_permission_overrides(permission_id);
CREATE INDEX IF NOT EXISTS idx_branch_perm_override_branch ON branch_permission_overrides(branch_id);

-- Client & Product Mapping Indexes
CREATE INDEX IF NOT EXISTS idx_clients_branch ON clients(branch_id);
CREATE INDEX IF NOT EXISTS idx_clients_account_mgr ON clients(account_manager_user_id);
CREATE INDEX IF NOT EXISTS idx_clients_type ON clients(client_type);
CREATE INDEX IF NOT EXISTS idx_product_client_product ON product_client_mappings(product_id);
CREATE INDEX IF NOT EXISTS idx_product_client_client ON product_client_mappings(client_id);
CREATE INDEX IF NOT EXISTS idx_product_client_status ON product_client_mappings(status);

-- Project & Team Allocation Indexes
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_branch ON projects(branch_id);
CREATE INDEX IF NOT EXISTS idx_projects_manager ON projects(project_manager_user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(project_status);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);

-- Version Management Indexes
CREATE INDEX IF NOT EXISTS idx_versions_product ON versions(product_id);
CREATE INDEX IF NOT EXISTS idx_versions_project ON versions(project_id);
CREATE INDEX IF NOT EXISTS idx_versions_status ON versions(status);

-- Core Tasks Performance & Filter Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_product ON tasks(product_id);
CREATE INDEX IF NOT EXISTS idx_tasks_version ON tasks(version_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(task_type_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status_id);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_branch ON tasks(branch_id);
CREATE INDEX IF NOT EXISTS idx_tasks_dates ON tasks(planned_start_date, planned_end_date);
CREATE INDEX IF NOT EXISTS idx_tasks_chargeable ON tasks(is_chargeable) WHERE is_chargeable = TRUE;

-- Composite Indexes for High-Frequency Task Queries
CREATE INDEX IF NOT EXISTS idx_tasks_project_status_prio ON tasks(project_id, status_id, priority);
CREATE INDEX IF NOT EXISTS idx_tasks_product_version_status ON tasks(product_id, version_id, status_id);

-- Multi-Assignee & Effort Tracking Indexes
CREATE INDEX IF NOT EXISTS idx_task_assignees_task ON task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON task_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_task_time_logs_task ON task_time_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_time_logs_user_date ON task_time_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_task_time_logs_billable ON task_time_logs(is_billable);

-- Comments & Attachments Indexes
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_parent ON task_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(entity_type, entity_id);

-- Notification & Push Token Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON notifications(recipient_user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user ON user_push_tokens(user_id);

-- Audit Trail Indexes (B-Tree + GIN for JSONB payload queries)
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_record ON audit_logs(entity_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs(user_id, action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_old_val_gin ON audit_logs USING GIN (old_values);
CREATE INDEX IF NOT EXISTS idx_audit_logs_new_val_gin ON audit_logs USING GIN (new_values);

-- ========================================================
-- Date & Time: 2026-09-25 16:32:38 (UTC)
-- Description: Requirements audit - device session revocation and preferences
-- ========================================================
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(user_id, expires_at) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_time_logs_approval ON task_time_logs(approval_status, log_date, user_id);
