-- ========================================================
-- Date & Time: 2026-09-25 13:20:00 IST
-- Author: Database Architect (KS-PMT)
-- Description: Master Seed Data (Roles, Permissions, Departments, 
--              Designations, Task Types, Statuses, Workflows, Admin User)
-- Note: All new INSERT statements must be appended at the end of this file with a datetime header.
-- ========================================================

-- Root System User ID for Audit reference on initial seed
-- UUID: 00000000-0000-0000-0000-000000000001
DO $$
DECLARE
    v_admin_id UUID := '00000000-0000-0000-0000-000000000001';
    v_ho_branch_id UUID := '11111111-1111-1111-1111-111111111111';
    v_eng_dept_id UUID := '22222222-2222-2222-2222-222222222221';
    v_qa_dept_id UUID := '22222222-2222-2222-2222-222222222222';
    v_support_dept_id UUID := '22222222-2222-2222-2222-222222222223';
    v_mobile_dept_id UUID := '22222222-2222-2222-2222-222222222224';
    v_devops_dept_id UUID := '22222222-2222-2222-2222-222222222225';
    
    v_desig_architect UUID := '33333333-3333-3333-3333-333333333331';
    v_desig_tech_lead UUID := '33333333-3333-3333-3333-333333333332';
    v_desig_sr_dev UUID := '33333333-3333-3333-3333-333333333333';
    v_desig_jr_dev UUID := '33333333-3333-3333-3333-333333333334';
    v_desig_qa_lead UUID := '33333333-3333-3333-3333-333333333335';
    v_desig_support_eng UUID := '33333333-3333-3333-3333-333333333336';
    
    v_role_super_admin UUID := '44444444-4444-4444-4444-444444444441';
    v_role_branch_mgr UUID := '44444444-4444-4444-4444-444444444442';
    v_role_pm UUID := '44444444-4444-4444-4444-444444444443';
    v_role_dev UUID := '44444444-4444-4444-4444-444444444444';
    v_role_qa UUID := '44444444-4444-4444-4444-444444444445';
    v_role_support UUID := '44444444-4444-4444-4444-444444444446';

    -- Task Types
    v_tt_new_dev UUID := '55555555-5555-5555-5555-555555555551';
    v_tt_bug UUID := '55555555-5555-5555-5555-555555555552';
    v_tt_issue UUID := '55555555-5555-5555-5555-555555555553';
    v_tt_enhancement UUID := '55555555-5555-5555-5555-555555555554';
    v_tt_training UUID := '55555555-5555-5555-5555-555555555555';
    v_tt_support UUID := '55555555-5555-5555-5555-555555555556';

    -- Task Statuses
    v_st_open UUID := '66666666-6666-6666-6666-666666666661';
    v_st_wip UUID := '66666666-6666-6666-6666-666666666662';
    v_st_code_review UUID := '66666666-6666-6666-6666-666666666663';
    v_st_pending_test UUID := '66666666-6666-6666-6666-666666666664';
    v_st_testing UUID := '66666666-6666-6666-6666-666666666665';
    v_st_pending_deploy UUID := '66666666-6666-6666-6666-666666666666';
    v_st_closed UUID := '66666666-6666-6666-6666-666666666667';
    v_st_cancelled UUID := '66666666-6666-6666-6666-666666666668';

BEGIN

    -- 1. Initial Head Office Branch
    INSERT INTO branches (id, branch_code, branch_name, address_line1, address_line2, city, state, country, postal_code, phone, email, latitude, longitude, geofence_radius_meters, is_head_office, is_active, created_by)
    VALUES (v_ho_branch_id, 'HO-AHM-01', 'Head Office - Ahmedabad', 'Kashvira Tower, SG Highway', 'Prahlad Nagar', 'Ahmedabad', 'Gujarat', 'India', '380015', '+91 79 4000 0000', 'hq@kashvirainfotech.com', 23.0125000, 72.5110000, 250, TRUE, TRUE, v_admin_id)
    ON CONFLICT (branch_code) DO NOTHING;

    -- 2. Base Departments
    INSERT INTO departments (id, dept_code, dept_name, description, is_active, created_by)
    VALUES 
        (v_eng_dept_id, 'DEPT-ENG', 'Software Engineering', 'Web and backend product & project development', TRUE, v_admin_id),
        (v_mobile_dept_id, 'DEPT-MOB', 'Mobile App Development', 'Flutter iOS and Android development team', TRUE, v_admin_id),
        (v_qa_dept_id, 'DEPT-QA', 'Quality Assurance & Testing', 'Manual, automation, and security testing', TRUE, v_admin_id),
        (v_support_dept_id, 'DEPT-SUP', 'Client Support & Implementation', 'On-site implementation and client ticketing', TRUE, v_admin_id),
        (v_devops_dept_id, 'DEPT-OPS', 'DevOps & Cloud Infrastructure', 'AWS cloud architectures and CI/CD pipelines', TRUE, v_admin_id)
    ON CONFLICT (dept_code) DO NOTHING;

    -- 3. Designations with Hierarchy Levels
    INSERT INTO designations (id, desig_code, desig_name, department_id, hierarchy_level, description, is_active, created_by)
    VALUES 
        (v_desig_architect, 'DESIG-ARCH', 'Principal Solution Architect', v_eng_dept_id, 10, 'Overall solution architecture', TRUE, v_admin_id),
        (v_desig_tech_lead, 'DESIG-TL', 'Tech Lead', v_eng_dept_id, 8, 'Technical squad and module lead', TRUE, v_admin_id),
        (v_desig_sr_dev, 'DESIG-SR-DEV', 'Senior Software Engineer', v_eng_dept_id, 6, 'Core feature implementation', TRUE, v_admin_id),
        (v_desig_jr_dev, 'DESIG-JR-DEV', 'Associate Software Engineer', v_eng_dept_id, 3, 'Task development and bug fixing', TRUE, v_admin_id),
        (v_desig_qa_lead, 'DESIG-QA-LEAD', 'Lead QA Engineer', v_qa_dept_id, 7, 'Test plan management and verification', TRUE, v_admin_id),
        (v_desig_support_eng, 'DESIG-SUP-ENG', 'Technical Support Executive', v_support_dept_id, 4, 'Tier 1 client issue resolution', TRUE, v_admin_id)
    ON CONFLICT (desig_code) DO NOTHING;

    -- 4. Roles Master
    INSERT INTO roles (id, role_code, role_name, description, is_system_role, is_active, created_by)
    VALUES 
        (v_role_super_admin, 'ROLE_SUPER_ADMIN', 'Super Administrator', 'Complete system-wide unrestricted access', TRUE, TRUE, v_admin_id),
        (v_role_branch_mgr, 'ROLE_BRANCH_MANAGER', 'Branch Manager', 'Full branch-level administration and reports', TRUE, TRUE, v_admin_id),
        (v_role_pm, 'ROLE_PROJECT_MANAGER', 'Project / Product Manager', 'Project scopes, budgets, tasks, and sprints', TRUE, TRUE, v_admin_id),
        (v_role_dev, 'ROLE_DEVELOPER', 'Software Developer', 'Task execution, time tracking, and comments', TRUE, TRUE, v_admin_id),
        (v_role_qa, 'ROLE_QA_TESTER', 'QA Engineer', 'Testing workflows, bug logging, and verification', TRUE, TRUE, v_admin_id),
        (v_role_support, 'ROLE_SUPPORT_EXEC', 'Support Executive', 'Support ticket resolution and customer feedback', TRUE, TRUE, v_admin_id)
    ON CONFLICT (role_code) DO NOTHING;

    -- 5. System Permissions
    INSERT INTO permissions (module, action, permission_code, description, is_active, created_by)
    VALUES 
        -- Task Permissions
        ('TASKS', 'CREATE', 'TASKS:CREATE', 'Permission to create new tasks', TRUE, v_admin_id),
        ('TASKS', 'READ', 'TASKS:READ', 'Permission to view tasks', TRUE, v_admin_id),
        ('TASKS', 'UPDATE', 'TASKS:UPDATE', 'Permission to edit tasks', TRUE, v_admin_id),
        ('TASKS', 'DELETE', 'TASKS:DELETE', 'Permission to delete tasks', TRUE, v_admin_id),
        ('TASKS', 'ASSIGN', 'TASKS:ASSIGN', 'Permission to assign users to tasks', TRUE, v_admin_id),
        ('TASKS', 'STATUS_CHANGE', 'TASKS:STATUS_CHANGE', 'Permission to transition task statuses', TRUE, v_admin_id),
        -- Project & Financial Permissions
        ('PROJECTS', 'CREATE', 'PROJECTS:CREATE', 'Permission to create projects', TRUE, v_admin_id),
        ('PROJECTS', 'READ', 'PROJECTS:READ', 'Permission to view projects', TRUE, v_admin_id),
        ('PROJECTS', 'UPDATE', 'PROJECTS:UPDATE', 'Permission to edit projects', TRUE, v_admin_id),
        ('PROJECTS', 'VIEW_FINANCIALS', 'PROJECTS:VIEW_FINANCIALS', 'Permission to view project contract amounts and rates', TRUE, v_admin_id),
        -- Product Permissions
        ('PRODUCTS', 'MANAGE', 'PRODUCTS:MANAGE', 'Permission to manage software products and licenses', TRUE, v_admin_id),
        -- Time Log Permissions
        ('TIMELOGS', 'LOG_OWN', 'TIMELOGS:LOG_OWN', 'Permission to log own working hours', TRUE, v_admin_id),
        ('TIMELOGS', 'APPROVE', 'TIMELOGS:APPROVE', 'Permission to approve team timesheets', TRUE, v_admin_id),
        -- User & Branch Permissions
        ('USERS', 'MANAGE', 'USERS:MANAGE', 'Permission to provision and manage employee accounts', TRUE, v_admin_id),
        ('BRANCHES', 'MANAGE', 'BRANCHES:MANAGE', 'Permission to manage company branches', TRUE, v_admin_id)
    ON CONFLICT (permission_code) DO NOTHING;

    -- Map all permissions to Super Admin role
    INSERT INTO role_permissions (role_id, permission_id, created_by)
    SELECT v_role_super_admin, p.id, v_admin_id
    FROM permissions p
    ON CONFLICT (role_id, permission_id) DO NOTHING;

    -- 6. Initial Super Admin Account
    -- Default password hash: '$2a$12$e6mZ8...placeholder' (can be reset via console or OTP)
    INSERT INTO users (
        id, employee_code, first_name, last_name, email, mobile_number, 
        password_hash, primary_branch_id, department_id, designation_id, 
        role_id, is_email_login_allowed, is_otp_login_allowed, is_active, created_by
    ) VALUES (
        v_admin_id, 'EMP-0001', 'System', 'Administrator', 'admin@kashvirainfotech.com', '+919999900000',
        '$2b$12$uE5tT1gXoYgKzJ7x8C0aNeP0K1l8Q4mZ5vW3yU2tS1rA0bC9dE8fG', -- Default hashed password
        v_ho_branch_id, v_eng_dept_id, v_desig_architect,
        v_role_super_admin, TRUE, TRUE, TRUE, v_admin_id
    )
    ON CONFLICT (employee_code) DO NOTHING;

    -- 7. Dynamic Task Types
    INSERT INTO task_types (id, type_code, type_name, description, color_hex, icon_name, is_chargeable_default, is_active, created_by)
    VALUES 
        (v_tt_new_dev, 'NEW_DEV', 'New Development', 'New feature or greenfield module development', '#3B82F6', 'code', FALSE, TRUE, v_admin_id),
        (v_tt_bug, 'BUG', 'Bug / Defect', 'Software bug or functional discrepancy', '#EF4444', 'bug', FALSE, TRUE, v_admin_id),
        (v_tt_issue, 'ISSUE', 'Issue', 'Production or staging environment blockage', '#F59E0B', 'alert-triangle', FALSE, TRUE, v_admin_id),
        (v_tt_enhancement, 'ENHANCEMENT', 'Enhancement', 'Improvement or optimization to existing feature', '#10B981', 'trending-up', TRUE, TRUE, v_admin_id),
        (v_tt_training, 'TRAINING', 'Training', 'Client or internal team training session', '#8B5CF6', 'book-open', TRUE, TRUE, v_admin_id),
        (v_tt_support, 'SUPPORT', 'Support Ticket', 'Ongoing client support or maintenance request', '#EC4899', 'life-buoy', TRUE, TRUE, v_admin_id)
    ON CONFLICT (type_code) DO NOTHING;

    -- 8. Dynamic Task Statuses
    INSERT INTO task_statuses (id, status_code, status_name, description, status_category, sequence_order, color_hex, is_terminal, is_active, created_by)
    VALUES 
        (v_st_open, 'OPEN', 'Open', 'Task logged and awaiting assignment/start', 'TODO', 10, '#6B7280', FALSE, TRUE, v_admin_id),
        (v_st_wip, 'WIP', 'Work In Progress', 'Work is currently actively ongoing', 'IN_PROGRESS', 20, '#3B82F6', FALSE, TRUE, v_admin_id),
        (v_st_code_review, 'CODE_REVIEW', 'Pending Code Review', 'Feature complete, awaiting pull request review', 'IN_PROGRESS', 30, '#8B5CF6', FALSE, TRUE, v_admin_id),
        (v_st_pending_test, 'PENDING_TEST', 'Pending for Testing', 'Ready for QA deployment and test execution', 'REVIEW_TEST', 40, '#F59E0B', FALSE, TRUE, v_admin_id),
        (v_st_testing, 'TESTING', 'Testing in Progress', 'Actively undergoing QA verification', 'REVIEW_TEST', 50, '#EAB308', FALSE, TRUE, v_admin_id),
        (v_st_pending_deploy, 'PENDING_DEPLOY', 'Pending for Deployment', 'Verified by QA, queued for production release', 'REVIEW_TEST', 60, '#06B6D4', FALSE, TRUE, v_admin_id),
        (v_st_closed, 'CLOSED', 'Closed', 'Completed, verified, and successfully deployed', 'DONE', 70, '#10B981', TRUE, TRUE, v_admin_id),
        (v_st_cancelled, 'CANCELLED', 'Cancelled', 'Task discarded, invalid, or obsolete', 'CANCELLED', 80, '#9CA3AF', TRUE, TRUE, v_admin_id)
    ON CONFLICT (status_code) DO NOTHING;

    -- 9. Standard Dynamic Workflow Transitions for NEW_DEV
    INSERT INTO task_type_workflow_statuses (task_type_id, from_status_id, to_status_id, is_active, created_by)
    VALUES 
        (v_tt_new_dev, v_st_open, v_st_wip, TRUE, v_admin_id),
        (v_tt_new_dev, v_st_wip, v_st_code_review, TRUE, v_admin_id),
        (v_tt_new_dev, v_st_code_review, v_st_pending_test, TRUE, v_admin_id),
        (v_tt_new_dev, v_st_pending_test, v_st_testing, TRUE, v_admin_id),
        (v_tt_new_dev, v_st_testing, v_st_wip, TRUE, v_admin_id), -- Retest failed
        (v_tt_new_dev, v_st_testing, v_st_pending_deploy, TRUE, v_admin_id),
        (v_tt_new_dev, v_st_pending_deploy, v_st_closed, TRUE, v_admin_id),
        (v_tt_new_dev, v_st_open, v_st_cancelled, TRUE, v_admin_id)
    ON CONFLICT (task_type_id, from_status_id, to_status_id) DO NOTHING;

    -- 10. Sample Auto-Assignment Rules Matrix
    INSERT INTO auto_assignment_rules (
        rule_name, trigger_event, task_type_id, to_status_id, target_assignment_type, target_department_id, is_active, created_by
    ) VALUES (
        'Auto route ready tasks to QA Department',
        'ON_STATUS_CHANGE',
        v_tt_new_dev,
        v_st_pending_test,
        'DEPARTMENT_HOD',
        v_qa_dept_id,
        TRUE,
        v_admin_id
    );

END $$;

-- ========================================================
-- Date & Time: 2026-09-25 15:10:00 (UTC)
-- Description: Add AUDIT_LOGS and NOTIFICATIONS permissions
-- ========================================================
DO $$
DECLARE
    v_admin_id UUID := '00000000-0000-0000-0000-000000000001';
    v_role_super_admin UUID := '00000000-0000-0000-0000-000000000101';
BEGIN
    INSERT INTO permissions (module, action, permission_code, description, is_active, created_by)
    VALUES 
        ('AUDIT_LOGS', 'VIEW', 'AUDIT_LOGS:VIEW', 'Permission to view system audit logs', TRUE, v_admin_id),
        ('NOTIFICATIONS', 'MANAGE', 'NOTIFICATIONS:MANAGE', 'Permission to broadcast system notifications', TRUE, v_admin_id)
    ON CONFLICT (permission_code) DO NOTHING;

    INSERT INTO role_permissions (role_id, permission_id, created_by)
    SELECT v_role_super_admin, p.id, v_admin_id
    FROM permissions p
    WHERE p.permission_code IN ('AUDIT_LOGS:VIEW', 'NOTIFICATIONS:MANAGE')
    ON CONFLICT (role_id, permission_id) DO NOTHING;
END $$;
