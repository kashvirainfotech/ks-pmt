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

-- ========================================================
-- Date & Time: 2026-09-27 07:22:54 (UTC)
-- Description: Support department head lookup and user relationship cleanup
-- ========================================================
CREATE INDEX idx_department_heads_user ON department_heads(user_id);

-- ========================================================
-- Date & Time: 2026-09-29 11:15:00 IST
-- Description: FND-001 - Indexes for Working Calendars, Holidays, Assignments, and Leaves
-- ========================================================
CREATE INDEX IF NOT EXISTS idx_working_calendars_branch ON working_calendars(branch_id);
CREATE INDEX IF NOT EXISTS idx_working_calendars_default ON working_calendars(is_default) WHERE is_default = TRUE;
CREATE INDEX IF NOT EXISTS idx_calendar_holidays_cal_date ON calendar_holidays(calendar_id, holiday_date);
CREATE INDEX IF NOT EXISTS idx_emp_cal_assign_user ON employee_calendar_assignments(user_id, effective_from);
CREATE INDEX IF NOT EXISTS idx_emp_leave_user_dates ON employee_leave_records(user_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_emp_leave_status ON employee_leave_records(status);

-- ========================================================
-- Date & Time: 2026-09-29 11:35:00 IST
-- Description: PLAN-001 - Indexes for Sprints, Milestones, Hierarchy, Backlog Order, and Scope Ledger
-- ========================================================
CREATE INDEX IF NOT EXISTS idx_milestones_entity ON milestones(entity_type, product_id, project_id);
CREATE INDEX IF NOT EXISTS idx_sprints_entity_dates ON sprints(entity_type, product_id, project_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_sprints_status ON sprints(status);
CREATE INDEX IF NOT EXISTS idx_tasks_sprint_id ON tasks(sprint_id);
CREATE INDEX IF NOT EXISTS idx_tasks_milestone_id ON tasks(milestone_id);
CREATE INDEX IF NOT EXISTS idx_tasks_hierarchy_level ON tasks(hierarchy_level);
CREATE INDEX IF NOT EXISTS idx_tasks_backlog_order ON tasks(project_id, product_id, backlog_order ASC);
CREATE INDEX IF NOT EXISTS idx_sprint_tasks_sprint_task ON sprint_tasks(sprint_id, task_id);
CREATE INDEX IF NOT EXISTS idx_sprint_tasks_rollover ON sprint_tasks(rollover_from_sprint_id);

-- ========================================================
-- Date & Time: 2026-09-29 12:05:00 IST
-- Description: PLAN-002 - Indexes for Task Dependencies, Inverse Lookups, and Blocker Episodes
-- ========================================================
CREATE INDEX IF NOT EXISTS idx_task_dep_source ON task_dependencies(source_task_id, link_type);
CREATE INDEX IF NOT EXISTS idx_task_dep_target ON task_dependencies(target_task_id, link_type);
CREATE INDEX IF NOT EXISTS idx_task_dep_type ON task_dependencies(link_type);
CREATE INDEX IF NOT EXISTS idx_blockers_task_status ON task_blocker_episodes(task_id, status);
CREATE INDEX IF NOT EXISTS idx_blockers_owner ON task_blocker_episodes(owner_user_id) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_blockers_blocking_item ON task_blocker_episodes(blocking_task_id);
CREATE INDEX IF NOT EXISTS idx_blockers_started_at ON task_blocker_episodes(started_at);
CREATE INDEX IF NOT EXISTS idx_blockers_radar ON task_blocker_episodes(category, priority, started_at) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_tasks_is_blocked ON tasks(is_blocked) WHERE is_blocked = TRUE;

-- ========================================================
-- Date & Time: 2026-09-29 13:21:00 IST
-- Description: PLAN-003 - Indexes for Saved Views, Multi-Column Sorting and Server-Side Attention Filters
-- ========================================================
CREATE INDEX IF NOT EXISTS idx_saved_views_user ON saved_views(user_id, scope, is_active);
CREATE INDEX IF NOT EXISTS idx_saved_views_project ON saved_views(project_id, scope, is_active);
CREATE INDEX IF NOT EXISTS idx_saved_views_favorite ON saved_views(user_id, is_favorite) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_tasks_sorting_priority_due ON tasks(priority, planned_end_date ASC);

-- ========================================================
-- Date & Time: 2026-09-29 14:08:00 IST
-- Description: TIME-001 - Indexes for Weekly Timesheets, Reviewer Portions, and Persistent Timers
-- ========================================================
CREATE INDEX IF NOT EXISTS idx_weekly_timesheets_user_period ON weekly_timesheets(user_id, period_start_date);
CREATE INDEX IF NOT EXISTS idx_weekly_timesheets_status ON weekly_timesheets(status) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_timesheet_portions_timesheet ON timesheet_project_portions(timesheet_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_portions_project ON timesheet_project_portions(project_id, status);
CREATE INDEX IF NOT EXISTS idx_task_time_logs_timesheet ON task_time_logs(timesheet_id);
CREATE INDEX IF NOT EXISTS idx_user_active_timers_user ON user_active_timers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_active_timers_task ON user_active_timers(task_id);

-- ========================================================
-- Date & Time: 2026-09-29 14:35:00 IST
-- Description: PLAN-004 - Indexes for Delivery Teams, Software Components & Architecture Relationships
-- ========================================================
CREATE INDEX IF NOT EXISTS idx_teams_code ON teams(team_code);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id, is_active);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_tasks_responsible_team ON tasks(responsible_team_id);
CREATE INDEX IF NOT EXISTS idx_components_entity ON software_components(entity_type, product_id, project_id);
CREATE INDEX IF NOT EXISTS idx_components_owner_team ON software_components(owner_team_id);
CREATE INDEX IF NOT EXISTS idx_component_dep_source ON component_dependencies(component_id);
CREATE INDEX IF NOT EXISTS idx_component_dep_target ON component_dependencies(depends_on_component_id);
CREATE INDEX IF NOT EXISTS idx_task_components_task ON task_components(task_id);
CREATE INDEX IF NOT EXISTS idx_task_components_comp ON task_components(component_id);
-- ========================================================
-- Date & Time: 2026-09-29 15:15:00 IST
-- Description: FLOW-001 - Indexes for Task Handoffs & Queue Lookups
-- ========================================================
CREATE INDEX IF NOT EXISTS idx_task_handoffs_task ON task_handoffs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_handoffs_to_team ON task_handoffs(to_team_id, status);
CREATE INDEX IF NOT EXISTS idx_task_handoffs_to_user ON task_handoffs(to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_task_handoffs_from_user ON task_handoffs(from_user_id, status);
CREATE INDEX IF NOT EXISTS idx_task_handoffs_predecessor ON task_handoffs(predecessor_handoff_id);
CREATE INDEX IF NOT EXISTS idx_task_handoffs_status ON task_handoffs(status);
-- ========================================================
-- Date & Time: 2026-09-29 15:45:00 IST
-- Description: CONFIG-001 - Indexes for Workflow Schemes & Transitions
-- ========================================================
CREATE INDEX IF NOT EXISTS idx_workflow_schemes_scope ON workflow_schemes(scope, project_id, product_id, status);
CREATE INDEX IF NOT EXISTS idx_workflow_schemes_type ON workflow_schemes(task_type_id, status);
CREATE INDEX IF NOT EXISTS idx_workflow_transitions_scheme ON workflow_scheme_transitions(scheme_id, is_active);
CREATE INDEX IF NOT EXISTS idx_workflow_transitions_from_to ON workflow_scheme_transitions(from_status_id, to_status_id);

-- ========================================================
-- Date & Time: 2026-09-29 16:00:00 IST
-- Description: CLIENT-001 & CLIENT-002 - Indexes for Client Portal Contacts, Project Grants, Intake Requests & Messages
-- ========================================================
CREATE INDEX IF NOT EXISTS idx_client_contacts_client ON client_contacts(client_id, is_active);
CREATE INDEX IF NOT EXISTS idx_client_contacts_email ON client_contacts(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_client_contacts_token ON client_contacts(invitation_token) WHERE invitation_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_contacts_status ON client_contacts(status);
CREATE INDEX IF NOT EXISTS idx_client_contact_projects_contact ON client_contact_projects(contact_id);
CREATE INDEX IF NOT EXISTS idx_client_contact_projects_project ON client_contact_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_client_intake_client ON client_intake_requests(client_id, status);
CREATE INDEX IF NOT EXISTS idx_client_intake_contact ON client_intake_requests(contact_id);
CREATE INDEX IF NOT EXISTS idx_client_intake_project ON client_intake_requests(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_intake_product ON client_intake_requests(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_intake_status ON client_intake_requests(status);
CREATE INDEX IF NOT EXISTS idx_client_intake_type ON client_intake_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_client_intake_linked_task ON client_intake_requests(linked_task_id) WHERE linked_task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_intake_duplicate ON client_intake_requests(duplicate_of_request_id) WHERE duplicate_of_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_messages_request ON client_request_messages(request_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_client_messages_internal ON client_request_messages(request_id, is_internal_only);

-- ========================================================
-- Date & Time: 2026-09-29 19:16:00 IST
-- Description: CLIENT-003 - Indexes for Requirement Specifications, Baselines, Acceptance Criteria & Task Traceability
-- ========================================================
CREATE INDEX IF NOT EXISTS idx_req_spec_project ON requirement_specifications(project_id, status) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_req_spec_product ON requirement_specifications(product_id, status) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_req_spec_originating_req ON requirement_specifications(originating_request_id) WHERE originating_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_req_spec_status ON requirement_specifications(status);
CREATE INDEX IF NOT EXISTS idx_req_spec_client_visible ON requirement_specifications(is_client_visible, is_baselined) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_req_baselines_req ON requirement_baselines(requirement_id, version);
CREATE INDEX IF NOT EXISTS idx_req_criteria_req ON requirement_acceptance_criteria(requirement_id, order_index);
CREATE INDEX IF NOT EXISTS idx_req_criteria_status ON requirement_acceptance_criteria(implementation_status);
CREATE INDEX IF NOT EXISTS idx_req_criteria_signoff ON requirement_acceptance_criteria(client_signoff_status);
CREATE INDEX IF NOT EXISTS idx_req_criterion_tasks_crit ON requirement_criterion_tasks(criterion_id);
CREATE INDEX IF NOT EXISTS idx_req_criterion_tasks_task ON requirement_criterion_tasks(task_id);

-- ========================================================
-- Date & Time: 2026-09-29 19:53:00 IST
-- Description: CLIENT-004 - Indexes for Scope & Change Requests, Revisions, and Tasks
-- ========================================================
CREATE INDEX IF NOT EXISTS idx_change_requests_project ON change_requests(project_id, status) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_change_requests_product ON change_requests(product_id, status) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_change_requests_originating ON change_requests(originating_intake_request_id) WHERE originating_intake_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_change_requests_requirement ON change_requests(requirement_id) WHERE requirement_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_change_requests_status ON change_requests(status);
CREATE INDEX IF NOT EXISTS idx_change_requests_pm ON change_requests(accountable_pm_user_id);
CREATE INDEX IF NOT EXISTS idx_cr_revisions_cr ON change_request_revisions(change_request_id, revision_number);
CREATE INDEX IF NOT EXISTS idx_cr_revisions_status ON change_request_revisions(status);
CREATE INDEX IF NOT EXISTS idx_cr_revisions_decision ON change_request_revisions(client_decision) WHERE client_decision IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cr_tasks_cr ON change_request_tasks(change_request_id);
CREATE INDEX IF NOT EXISTS idx_cr_tasks_task ON change_request_tasks(task_id);

-- ========================================================
-- Date & Time: 2026-09-29 20:36:00 IST
-- Description: CLIENT-005 - Indexes for UAT Packages, Revisions, Checklist Items, and Client Installed Versions
-- ========================================================
CREATE INDEX IF NOT EXISTS idx_uat_packages_project ON uat_packages(project_id, status) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_uat_packages_product ON uat_packages(product_id, status) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_uat_packages_version ON uat_packages(version_id) WHERE version_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_uat_packages_milestone ON uat_packages(milestone_id) WHERE milestone_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_uat_packages_status ON uat_packages(status);
CREATE INDEX IF NOT EXISTS idx_uat_revisions_pkg ON uat_package_revisions(package_id, revision_number);
CREATE INDEX IF NOT EXISTS idx_uat_revisions_status ON uat_package_revisions(status);
CREATE INDEX IF NOT EXISTS idx_uat_revisions_decision ON uat_package_revisions(client_decision) WHERE client_decision IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_uat_items_rev ON uat_checklist_items(package_revision_id, order_index);
CREATE INDEX IF NOT EXISTS idx_uat_items_client_status ON uat_checklist_items(client_status);
CREATE INDEX IF NOT EXISTS idx_uat_items_criterion ON uat_checklist_items(criterion_id) WHERE criterion_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_uat_items_defect ON uat_checklist_items(linked_defect_task_id) WHERE linked_defect_task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_installed_client ON client_installed_versions(client_id, is_current_active);
CREATE INDEX IF NOT EXISTS idx_client_installed_version ON client_installed_versions(version_id);

-- ========================================================
-- Date & Time: 2026-09-29 20:56:00 IST
-- Description: CLIENT-006 - Indexes for Client Progress Reports & Revisions
-- ========================================================
CREATE INDEX IF NOT EXISTS idx_cpr_project ON client_progress_reports(project_id, report_status);
CREATE INDEX IF NOT EXISTS idx_cpr_product ON client_progress_reports(product_id, report_status) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cpr_status ON client_progress_reports(report_status);
CREATE INDEX IF NOT EXISTS idx_cpr_period ON client_progress_reports(period_start_date, period_end_date);
CREATE INDEX IF NOT EXISTS idx_cpr_health ON client_progress_reports(overall_health);
CREATE INDEX IF NOT EXISTS idx_cpr_revisions_rep ON client_progress_report_revisions(report_id, revision_number);

-- ========================================================
-- Date & Time: 2026-09-29 22:00:00 IST
-- Description: DEL-001 - Indexes for RAID Items, Client Actions & Revisions
-- ========================================================
CREATE INDEX IF NOT EXISTS idx_raid_items_project ON raid_items(project_id, category, status);
CREATE INDEX IF NOT EXISTS idx_raid_items_product ON raid_items(product_id, category, status) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_raid_items_category ON raid_items(category);
CREATE INDEX IF NOT EXISTS idx_raid_items_status ON raid_items(status);
CREATE INDEX IF NOT EXISTS idx_raid_items_owner ON raid_items(owner_user_id) WHERE owner_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_raid_items_review_date ON raid_items(review_date);
CREATE INDEX IF NOT EXISTS idx_raid_items_req ON raid_items(requirement_id) WHERE requirement_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_raid_items_milestone ON raid_items(milestone_id) WHERE milestone_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_raid_items_client_shared ON raid_items(is_client_shared, client_visibility);
CREATE INDEX IF NOT EXISTS idx_raid_items_superseded ON raid_items(superseded_by_id) WHERE superseded_by_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_client_action_project ON client_action_requests(project_id, status);
CREATE INDEX IF NOT EXISTS idx_client_action_client ON client_action_requests(client_id, status);
CREATE INDEX IF NOT EXISTS idx_client_action_due ON client_action_requests(due_date, status);
CREATE INDEX IF NOT EXISTS idx_client_action_raid ON client_action_requests(raid_item_id) WHERE raid_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_action_contact ON client_action_requests(assigned_contact_id) WHERE assigned_contact_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_raid_revisions_item ON raid_item_revisions(raid_item_id, revision_number);



