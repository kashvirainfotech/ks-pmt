-- ========================================================
-- Date & Time: 2026-09-30 16:45:00 (IST)
-- Description: Comprehensive Enterprise Demo Data Showcase (All Features)
--              - 3 Branches (Ahmedabad HQ, Pune DC, Bangalore Hub)
--              - 13 Employees with Diverse Roles & Permission Sets
--              - Department Heads, Secondary Branch Access & Overrides
--              - 3 Products (KashCloud ERP, LogiTrack Fleet, PayPulse Gateway)
--              - 5 Clients (Internal, Acme, NexGen, Zenith, HealthWave)
--              - 5 Projects across Clients with Teams & Allocations
--              - Sprints, Milestones, Software Components & Architecture DAG
--              - 210+ Diverse Tasks across Products & Projects
--              - Worklogs, Timesheets, Handoffs, Blockers, Comments
--              - Client Portal, Intake, Requirements, CRs, UAT, RAID, Ideas
-- ========================================================
DO $$
DECLARE
    v_admin_id UUID := '00000000-0000-0000-0000-000000000001';
    v_default_cal_id UUID := '88888888-8888-8888-8888-888888888881';
BEGIN


    -- 1. Additional Branches (Pune & Bangalore)
    INSERT INTO branches (id, branch_code, branch_name, address_line1, address_line2, city, state, country, postal_code, phone, email, latitude, longitude, geofence_radius_meters, is_head_office, is_active, created_by)
    VALUES 
        ('11111111-1111-1111-1111-111111111112', 'BR-PUN-02', 'Development Center - Pune', 'Cyber City Magarpatta', 'Tower 7, 5th Floor, Hadapsar', 'Pune', 'Maharashtra', 'India', '411028', '+91 20 6700 1100', 'pune@kashvirainfotech.com', 18.5167000, 73.9272000, 200, FALSE, TRUE, v_admin_id),
        ('11111111-1111-1111-1111-111111111113', 'BR-BLR-03', 'Innovation Hub - Bangalore', 'Indiranagar 100ft Road', 'HAL 2nd Stage, Above TechSpace', 'Bangalore', 'Karnataka', 'India', '560038', '+91 80 4500 2200', 'blr@kashvirainfotech.com', 12.9716000, 77.6412000, 200, FALSE, TRUE, v_admin_id)
    ON CONFLICT (branch_code) DO NOTHING;


    -- 2. Additional Designations
    INSERT INTO designations (id, desig_code, desig_name, department_id, hierarchy_level, description, is_active, created_by)
    VALUES 
        ('33333333-3333-3333-3333-333333333337', 'DESIG-PM', 'Senior Project / Product Manager', '22222222-2222-2222-2222-222222222221', 9, 'Project delivery, client communication, and scope governance', TRUE, v_admin_id),
        ('33333333-3333-3333-3333-333333333338', 'DESIG-OPS-LEAD', 'DevOps & Cloud Lead', '22222222-2222-2222-2222-222222222225', 7, 'CI/CD automation, cloud architecture, and container orchestrations', TRUE, v_admin_id),
        ('33333333-3333-3333-3333-333333333339', 'DESIG-QA-AUTO', 'QA Automation Specialist', '22222222-2222-2222-2222-222222222222', 5, 'Automated regression suites, Cypress, and performance scripts', TRUE, v_admin_id),
        ('33333333-3333-3333-3333-333333333340', 'DESIG-MOB-LEAD', 'Mobile Solutions Architect', '22222222-2222-2222-2222-222222222224', 8, 'Flutter, native iOS/Android bridge, and offline-first mobile apps', TRUE, v_admin_id)
    ON CONFLICT (desig_code) DO NOTHING;


    -- 3. Granular Role-Permission Mappings for standard operational roles
    -- Branch Manager Role Permissions
    INSERT INTO role_permissions (role_id, permission_id, created_by)
    SELECT '44444444-4444-4444-4444-444444444442', p.id, v_admin_id
    FROM permissions p
    WHERE p.permission_code IN (
        'BRANCHES:MANAGE', 'USERS:MANAGE', 'PROJECTS:READ', 'TASKS:READ', 'TASKS:ASSIGN',
        'TIMELOGS:APPROVE', 'TIMESHEETS:READ', 'TIMESHEETS:APPROVE', 'CALENDARS:READ',
        'AUDIT_LOGS:VIEW', 'CLIENT_REPORTS:READ', 'RAID:READ'
    ) ON CONFLICT (role_id, permission_id) DO NOTHING;

    -- Developer Role Permissions
    INSERT INTO role_permissions (role_id, permission_id, created_by)
    SELECT '44444444-4444-4444-4444-444444444444', p.id, v_admin_id
    FROM permissions p
    WHERE p.permission_code IN (
        'TASKS:READ', 'TASKS:UPDATE', 'TASKS:STATUS_CHANGE', 'TIMELOGS:LOG_OWN',
        'TIMESHEETS:READ', 'TIMESHEETS:SUBMIT', 'HANDOFFS:READ', 'HANDOFFS:CREATE',
        'HANDOFFS:ACKNOWLEDGE', 'DEPENDENCIES:READ', 'BLOCKERS:READ', 'BLOCKERS:MANAGE',
        'SAVED_VIEWS:READ', 'SAVED_VIEWS:MANAGE', 'COMPONENTS:READ', 'PROJECTS:READ', 'PRODUCT_IDEAS:READ'
    ) ON CONFLICT (role_id, permission_id) DO NOTHING;

    -- QA Tester Role Permissions
    INSERT INTO role_permissions (role_id, permission_id, created_by)
    SELECT '44444444-4444-4444-4444-444444444445', p.id, v_admin_id
    FROM permissions p
    WHERE p.permission_code IN (
        'TASKS:CREATE', 'TASKS:READ', 'TASKS:UPDATE', 'TASKS:STATUS_CHANGE', 'TIMELOGS:LOG_OWN',
        'TIMESHEETS:READ', 'TIMESHEETS:SUBMIT', 'REQUIREMENTS:READ', 'REQUIREMENTS:SIGNOFF',
        'UAT_PACKAGES:READ', 'UAT_PACKAGES:MANAGE', 'UAT_PACKAGES:APPROVE', 'HANDOFFS:READ',
        'HANDOFFS:ACKNOWLEDGE', 'HANDOFFS:MANAGE', 'SAVED_VIEWS:READ', 'SAVED_VIEWS:MANAGE',
        'PROJECTS:READ', 'PRODUCT_IDEAS:READ'
    ) ON CONFLICT (role_id, permission_id) DO NOTHING;


    -- 4. Employee Accounts (12 Enterprise Users)
    -- All accounts use bcrypt hash for password 'Admin@123456' for demo convenience


    INSERT INTO users (
        id, employee_code, first_name, last_name, email, mobile_number,
        password_hash, primary_branch_id, department_id, designation_id,
        role_id, reporting_manager_id, is_email_login_allowed, is_otp_login_allowed,
        employment_status, is_active, created_by
    ) VALUES (
        '00000000-0000-0000-0000-000000000002', 'EMP-0002', 'Rajesh', 'Sharma', 'rajesh.sharma@kashvirainfotech.com', '+919820011002',
        '$2a$10$vEVL52lkxWGMGBRk/VloLOGYV1xW7FNQ49ODuTSHO6lAZ5V9H7ZRO', '11111111-1111-1111-1111-111111111112', '22222222-2222-2222-2222-222222222221', '33333333-3333-3333-3333-333333333337',
        '44444444-4444-4444-4444-444444444442', '00000000-0000-0000-0000-000000000001', TRUE, TRUE,
        'ACTIVE', TRUE, v_admin_id
    ) ON CONFLICT (employee_code) DO NOTHING;
  

    INSERT INTO users (
        id, employee_code, first_name, last_name, email, mobile_number,
        password_hash, primary_branch_id, department_id, designation_id,
        role_id, reporting_manager_id, is_email_login_allowed, is_otp_login_allowed,
        employment_status, is_active, created_by
    ) VALUES (
        '00000000-0000-0000-0000-000000000003', 'EMP-0003', 'Priya', 'Desai', 'priya.desai@kashvirainfotech.com', '+919820011003',
        '$2a$10$vEVL52lkxWGMGBRk/VloLOGYV1xW7FNQ49ODuTSHO6lAZ5V9H7ZRO', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222221', '33333333-3333-3333-3333-333333333337',
        '44444444-4444-4444-4444-444444444443', '00000000-0000-0000-0000-000000000001', TRUE, TRUE,
        'ACTIVE', TRUE, v_admin_id
    ) ON CONFLICT (employee_code) DO NOTHING;
  

    INSERT INTO users (
        id, employee_code, first_name, last_name, email, mobile_number,
        password_hash, primary_branch_id, department_id, designation_id,
        role_id, reporting_manager_id, is_email_login_allowed, is_otp_login_allowed,
        employment_status, is_active, created_by
    ) VALUES (
        '00000000-0000-0000-0000-000000000004', 'EMP-0004', 'Vikram', 'Malhotra', 'vikram.malhotra@kashvirainfotech.com', '+919820011004',
        '$2a$10$vEVL52lkxWGMGBRk/VloLOGYV1xW7FNQ49ODuTSHO6lAZ5V9H7ZRO', '11111111-1111-1111-1111-111111111113', '22222222-2222-2222-2222-222222222221', '33333333-3333-3333-3333-333333333332',
        '44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000003', TRUE, TRUE,
        'ACTIVE', TRUE, v_admin_id
    ) ON CONFLICT (employee_code) DO NOTHING;
  

    INSERT INTO users (
        id, employee_code, first_name, last_name, email, mobile_number,
        password_hash, primary_branch_id, department_id, designation_id,
        role_id, reporting_manager_id, is_email_login_allowed, is_otp_login_allowed,
        employment_status, is_active, created_by
    ) VALUES (
        '00000000-0000-0000-0000-000000000005', 'EMP-0005', 'Sneha', 'Iyer', 'sneha.iyer@kashvirainfotech.com', '+919820011005',
        '$2a$10$vEVL52lkxWGMGBRk/VloLOGYV1xW7FNQ49ODuTSHO6lAZ5V9H7ZRO', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333335',
        '44444444-4444-4444-4444-444444444445', '00000000-0000-0000-0000-000000000001', TRUE, TRUE,
        'ACTIVE', TRUE, v_admin_id
    ) ON CONFLICT (employee_code) DO NOTHING;
  

    INSERT INTO users (
        id, employee_code, first_name, last_name, email, mobile_number,
        password_hash, primary_branch_id, department_id, designation_id,
        role_id, reporting_manager_id, is_email_login_allowed, is_otp_login_allowed,
        employment_status, is_active, created_by
    ) VALUES (
        '00000000-0000-0000-0000-000000000006', 'EMP-0006', 'Amit', 'Patel', 'amit.patel@kashvirainfotech.com', '+919820011006',
        '$2a$10$vEVL52lkxWGMGBRk/VloLOGYV1xW7FNQ49ODuTSHO6lAZ5V9H7ZRO', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222221', '33333333-3333-3333-3333-333333333333',
        '44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000004', TRUE, TRUE,
        'ACTIVE', TRUE, v_admin_id
    ) ON CONFLICT (employee_code) DO NOTHING;
  

    INSERT INTO users (
        id, employee_code, first_name, last_name, email, mobile_number,
        password_hash, primary_branch_id, department_id, designation_id,
        role_id, reporting_manager_id, is_email_login_allowed, is_otp_login_allowed,
        employment_status, is_active, created_by
    ) VALUES (
        '00000000-0000-0000-0000-000000000007', 'EMP-0007', 'Neha', 'Joshi', 'neha.joshi@kashvirainfotech.com', '+919820011007',
        '$2a$10$vEVL52lkxWGMGBRk/VloLOGYV1xW7FNQ49ODuTSHO6lAZ5V9H7ZRO', '11111111-1111-1111-1111-111111111112', '22222222-2222-2222-2222-222222222221', '33333333-3333-3333-3333-333333333334',
        '44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000006', TRUE, TRUE,
        'ACTIVE', TRUE, v_admin_id
    ) ON CONFLICT (employee_code) DO NOTHING;
  

    INSERT INTO users (
        id, employee_code, first_name, last_name, email, mobile_number,
        password_hash, primary_branch_id, department_id, designation_id,
        role_id, reporting_manager_id, is_email_login_allowed, is_otp_login_allowed,
        employment_status, is_active, created_by
    ) VALUES (
        '00000000-0000-0000-0000-000000000008', 'EMP-0008', 'Rahul', 'Verma', 'rahul.verma@kashvirainfotech.com', '+919820011008',
        '$2a$10$vEVL52lkxWGMGBRk/VloLOGYV1xW7FNQ49ODuTSHO6lAZ5V9H7ZRO', '11111111-1111-1111-1111-111111111112', '22222222-2222-2222-2222-222222222221', '33333333-3333-3333-3333-333333333333',
        '44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000004', TRUE, TRUE,
        'ACTIVE', TRUE, v_admin_id
    ) ON CONFLICT (employee_code) DO NOTHING;
  

    INSERT INTO users (
        id, employee_code, first_name, last_name, email, mobile_number,
        password_hash, primary_branch_id, department_id, designation_id,
        role_id, reporting_manager_id, is_email_login_allowed, is_otp_login_allowed,
        employment_status, is_active, created_by
    ) VALUES (
        '00000000-0000-0000-0000-000000000009', 'EMP-0009', 'Ananya', 'Sen', 'ananya.sen@kashvirainfotech.com', '+919820011009',
        '$2a$10$vEVL52lkxWGMGBRk/VloLOGYV1xW7FNQ49ODuTSHO6lAZ5V9H7ZRO', '11111111-1111-1111-1111-111111111113', '22222222-2222-2222-2222-222222222224', '33333333-3333-3333-3333-333333333340',
        '44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000003', TRUE, TRUE,
        'ACTIVE', TRUE, v_admin_id
    ) ON CONFLICT (employee_code) DO NOTHING;
  

    INSERT INTO users (
        id, employee_code, first_name, last_name, email, mobile_number,
        password_hash, primary_branch_id, department_id, designation_id,
        role_id, reporting_manager_id, is_email_login_allowed, is_otp_login_allowed,
        employment_status, is_active, created_by
    ) VALUES (
        '00000000-0000-0000-0000-000000000010', 'EMP-0010', 'Karan', 'Mehta', 'karan.mehta@kashvirainfotech.com', '+919820011010',
        '$2a$10$vEVL52lkxWGMGBRk/VloLOGYV1xW7FNQ49ODuTSHO6lAZ5V9H7ZRO', '11111111-1111-1111-1111-111111111113', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333339',
        '44444444-4444-4444-4444-444444444445', '00000000-0000-0000-0000-000000000005', TRUE, TRUE,
        'ACTIVE', TRUE, v_admin_id
    ) ON CONFLICT (employee_code) DO NOTHING;
  

    INSERT INTO users (
        id, employee_code, first_name, last_name, email, mobile_number,
        password_hash, primary_branch_id, department_id, designation_id,
        role_id, reporting_manager_id, is_email_login_allowed, is_otp_login_allowed,
        employment_status, is_active, created_by
    ) VALUES (
        '00000000-0000-0000-0000-000000000011', 'EMP-0011', 'Pooja', 'Reddy', 'pooja.reddy@kashvirainfotech.com', '+919820011011',
        '$2a$10$vEVL52lkxWGMGBRk/VloLOGYV1xW7FNQ49ODuTSHO6lAZ5V9H7ZRO', '11111111-1111-1111-1111-111111111112', '22222222-2222-2222-2222-222222222223', '33333333-3333-3333-3333-333333333336',
        '44444444-4444-4444-4444-444444444446', '00000000-0000-0000-0000-000000000002', TRUE, TRUE,
        'ACTIVE', TRUE, v_admin_id
    ) ON CONFLICT (employee_code) DO NOTHING;
  

    INSERT INTO users (
        id, employee_code, first_name, last_name, email, mobile_number,
        password_hash, primary_branch_id, department_id, designation_id,
        role_id, reporting_manager_id, is_email_login_allowed, is_otp_login_allowed,
        employment_status, is_active, created_by
    ) VALUES (
        '00000000-0000-0000-0000-000000000012', 'EMP-0012', 'Suresh', 'Nair', 'suresh.nair@kashvirainfotech.com', '+919820011012',
        '$2a$10$vEVL52lkxWGMGBRk/VloLOGYV1xW7FNQ49ODuTSHO6lAZ5V9H7ZRO', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222225', '33333333-3333-3333-3333-333333333338',
        '44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000001', TRUE, TRUE,
        'ACTIVE', TRUE, v_admin_id
    ) ON CONFLICT (employee_code) DO NOTHING;
  

    INSERT INTO users (
        id, employee_code, first_name, last_name, email, mobile_number,
        password_hash, primary_branch_id, department_id, designation_id,
        role_id, reporting_manager_id, is_email_login_allowed, is_otp_login_allowed,
        employment_status, is_active, created_by
    ) VALUES (
        '00000000-0000-0000-0000-000000000013', 'EMP-0013', 'Kavita', 'Shah', 'kavita.shah@kashvirainfotech.com', '+919820011013',
        '$2a$10$vEVL52lkxWGMGBRk/VloLOGYV1xW7FNQ49ODuTSHO6lAZ5V9H7ZRO', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222221', '33333333-3333-3333-3333-333333333337',
        '44444444-4444-4444-4444-444444444443', '00000000-0000-0000-0000-000000000001', TRUE, TRUE,
        'ACTIVE', TRUE, v_admin_id
    ) ON CONFLICT (employee_code) DO NOTHING;
  

    -- 5. Multi-Branch Access for roving PMs and leads
    INSERT INTO user_branches (user_id, branch_id, created_by)
    VALUES
        ('00000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111112', v_admin_id), -- Priya Desai covers Pune
        ('00000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111113', v_admin_id), -- Priya Desai covers Bangalore
        ('00000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111112', v_admin_id), -- Vikram covers Pune
        ('00000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111112', v_admin_id)  -- Sneha Iyer covers Pune QA
    ON CONFLICT (user_id, branch_id) DO NOTHING;

    -- User Permission Overrides (Tech Lead granted architecture and release gates)
    INSERT INTO user_permission_overrides (user_id, permission_id, is_granted, reason, created_by)
    SELECT '00000000-0000-0000-0000-000000000004', p.id, TRUE, 'Tech Lead granted component architecture management', v_admin_id
    FROM permissions p WHERE p.permission_code = 'COMPONENTS:MANAGE'
    ON CONFLICT (user_id, permission_id) DO NOTHING;

    INSERT INTO user_permission_overrides (user_id, permission_id, is_granted, reason, created_by)
    SELECT '00000000-0000-0000-0000-000000000004', p.id, TRUE, 'Tech Lead granted workflow gating configuration', v_admin_id
    FROM permissions p WHERE p.permission_code = 'WORKFLOWS:MANAGE'
    ON CONFLICT (user_id, permission_id) DO NOTHING;

    -- Department Heads
    INSERT INTO department_heads (department_id, user_id, created_by)
    VALUES 
        ('22222222-2222-2222-2222-222222222221', '00000000-0000-0000-0000-000000000004', v_admin_id), -- Vikram Malhotra (Eng)
        ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000005', v_admin_id),  -- Sneha Iyer (QA)
        ('22222222-2222-2222-2222-222222222223', '00000000-0000-0000-0000-000000000011', v_admin_id), -- Pooja Reddy (Support)
        ('22222222-2222-2222-2222-222222222224', '00000000-0000-0000-0000-000000000009', v_admin_id), -- Ananya Sen (Mobile)
        ('22222222-2222-2222-2222-222222222225', '00000000-0000-0000-0000-000000000012', v_admin_id)  -- Suresh Nair (DevOps)
    ON CONFLICT (department_id) DO UPDATE SET user_id = EXCLUDED.user_id;

    -- Working Calendar Assignments for Employees


    INSERT INTO employee_calendar_assignments (user_id, calendar_id, effective_from, billable_target_hours_per_week, is_contractor, is_active, created_by)
    VALUES ('00000000-0000-0000-0000-000000000002', v_default_cal_id, '2026-01-01', 40.00, FALSE, TRUE, v_admin_id)
    ON CONFLICT DO NOTHING;
  

    INSERT INTO employee_calendar_assignments (user_id, calendar_id, effective_from, billable_target_hours_per_week, is_contractor, is_active, created_by)
    VALUES ('00000000-0000-0000-0000-000000000003', v_default_cal_id, '2026-01-01', 40.00, FALSE, TRUE, v_admin_id)
    ON CONFLICT DO NOTHING;
  

    INSERT INTO employee_calendar_assignments (user_id, calendar_id, effective_from, billable_target_hours_per_week, is_contractor, is_active, created_by)
    VALUES ('00000000-0000-0000-0000-000000000004', v_default_cal_id, '2026-01-01', 40.00, FALSE, TRUE, v_admin_id)
    ON CONFLICT DO NOTHING;
  

    INSERT INTO employee_calendar_assignments (user_id, calendar_id, effective_from, billable_target_hours_per_week, is_contractor, is_active, created_by)
    VALUES ('00000000-0000-0000-0000-000000000005', v_default_cal_id, '2026-01-01', 40.00, FALSE, TRUE, v_admin_id)
    ON CONFLICT DO NOTHING;
  

    INSERT INTO employee_calendar_assignments (user_id, calendar_id, effective_from, billable_target_hours_per_week, is_contractor, is_active, created_by)
    VALUES ('00000000-0000-0000-0000-000000000006', v_default_cal_id, '2026-01-01', 40.00, FALSE, TRUE, v_admin_id)
    ON CONFLICT DO NOTHING;
  

    INSERT INTO employee_calendar_assignments (user_id, calendar_id, effective_from, billable_target_hours_per_week, is_contractor, is_active, created_by)
    VALUES ('00000000-0000-0000-0000-000000000007', v_default_cal_id, '2026-01-01', 40.00, FALSE, TRUE, v_admin_id)
    ON CONFLICT DO NOTHING;
  

    INSERT INTO employee_calendar_assignments (user_id, calendar_id, effective_from, billable_target_hours_per_week, is_contractor, is_active, created_by)
    VALUES ('00000000-0000-0000-0000-000000000008', v_default_cal_id, '2026-01-01', 40.00, FALSE, TRUE, v_admin_id)
    ON CONFLICT DO NOTHING;
  

    INSERT INTO employee_calendar_assignments (user_id, calendar_id, effective_from, billable_target_hours_per_week, is_contractor, is_active, created_by)
    VALUES ('00000000-0000-0000-0000-000000000009', v_default_cal_id, '2026-01-01', 40.00, FALSE, TRUE, v_admin_id)
    ON CONFLICT DO NOTHING;
  

    INSERT INTO employee_calendar_assignments (user_id, calendar_id, effective_from, billable_target_hours_per_week, is_contractor, is_active, created_by)
    VALUES ('00000000-0000-0000-0000-000000000010', v_default_cal_id, '2026-01-01', 40.00, FALSE, TRUE, v_admin_id)
    ON CONFLICT DO NOTHING;
  

    INSERT INTO employee_calendar_assignments (user_id, calendar_id, effective_from, billable_target_hours_per_week, is_contractor, is_active, created_by)
    VALUES ('00000000-0000-0000-0000-000000000011', v_default_cal_id, '2026-01-01', 40.00, FALSE, TRUE, v_admin_id)
    ON CONFLICT DO NOTHING;
  

    INSERT INTO employee_calendar_assignments (user_id, calendar_id, effective_from, billable_target_hours_per_week, is_contractor, is_active, created_by)
    VALUES ('00000000-0000-0000-0000-000000000012', v_default_cal_id, '2026-01-01', 40.00, FALSE, TRUE, v_admin_id)
    ON CONFLICT DO NOTHING;
  

    INSERT INTO employee_calendar_assignments (user_id, calendar_id, effective_from, billable_target_hours_per_week, is_contractor, is_active, created_by)
    VALUES ('00000000-0000-0000-0000-000000000013', v_default_cal_id, '2026-01-01', 40.00, FALSE, TRUE, v_admin_id)
    ON CONFLICT DO NOTHING;
  

    -- 6. Additional Clients (Zenith Retail & HealthWave Care)
    INSERT INTO clients (
        id, client_code, company_name, contact_person, designation, email, mobile_number,
        city, state, country, postal_code, client_type, account_manager_user_id, branch_id, is_active, created_by
    ) VALUES 
        ('77777777-7777-7777-7777-777777777774', 'CLI-ZENITH', 'Zenith Retail & E-Commerce Global', 'David Wong', 'Head of Omnichannel Logistics', 'david.wong@zenithretail.com', '+919833344556', 'Pune', 'Maharashtra', 'India', '411001', 'ACTIVE_CLIENT', '00000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111112', TRUE, v_admin_id),
        ('77777777-7777-7777-7777-777777777775', 'CLI-HEALTH', 'HealthWave Care Systems', 'Dr. Meera Nambiar', 'Chief Medical Officer', 'meera.nambiar@healthwavecare.org', '+919811122334', 'Ahmedabad', 'Gujarat', 'India', '380009', 'ACTIVE_CLIENT', '00000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', TRUE, v_admin_id)
    ON CONFLICT (client_code) DO NOTHING;


    -- Demo Clients (Acme FinTech & NexGen Logistics)
    INSERT INTO clients (
        id, client_code, company_name, contact_person, designation, email, mobile_number,
        city, state, country, client_type, branch_id, is_active, created_by
    ) VALUES 
        ('77777777-7777-7777-7777-777777777772', 'CLI-ACME', 'Acme FinTech Solutions Ltd', 'Robert Miller', 'Chief Technology Officer', 'robert@acmefintech.com', '+919876543210', 'Mumbai', 'Maharashtra', 'India', 'ACTIVE_CLIENT', '11111111-1111-1111-1111-111111111111', TRUE, v_admin_id),
        ('77777777-7777-7777-7777-777777777773', 'CLI-NEXGEN', 'NexGen Digital Logistics', 'Sarah Chen', 'Product Director', 'sarah@nexgenlogistics.com', '+919822233445', 'Bangalore', 'Karnataka', 'India', 'ACTIVE_CLIENT', '11111111-1111-1111-1111-111111111111', TRUE, v_admin_id)
    ON CONFLICT (client_code) DO NOTHING;

    -- Client Portal Contacts
    INSERT INTO client_contacts (id, client_id, first_name, last_name, email, phone, job_title, password_hash, portal_role, is_approver, status, is_active, created_by)
    VALUES
        ('d0000000-0000-0000-0000-000000000001', '77777777-7777-7777-7777-777777777772', 'Robert', 'Miller', 'robert.client@acmefintech.com', '+919876543210', 'Chief Technology Officer', '$2a$10$vEVL52lkxWGMGBRk/VloLOGYV1xW7FNQ49ODuTSHO6lAZ5V9H7ZRO', 'CLIENT_ADMIN', TRUE, 'ACTIVE', TRUE, v_admin_id),
        ('d0000000-0000-0000-0000-000000000002', '77777777-7777-7777-7777-777777777773', 'Sarah', 'Chen', 'sarah.client@nexgenlogistics.com', '+919822233445', 'Product Director', '$2a$10$vEVL52lkxWGMGBRk/VloLOGYV1xW7FNQ49ODuTSHO6lAZ5V9H7ZRO', 'CLIENT_ADMIN', TRUE, 'ACTIVE', TRUE, v_admin_id),
        ('d0000000-0000-0000-0000-000000000003', '77777777-7777-7777-7777-777777777774', 'David', 'Wong', 'david.client@zenithretail.com', '+919833344556', 'Head of Omnichannel Logistics', '$2a$10$vEVL52lkxWGMGBRk/VloLOGYV1xW7FNQ49ODuTSHO6lAZ5V9H7ZRO', 'CLIENT_ADMIN', TRUE, 'ACTIVE', TRUE, v_admin_id),
        ('d0000000-0000-0000-0000-000000000004', '77777777-7777-7777-7777-777777777775', 'Dr. Meera', 'Nambiar', 'meera.client@healthwavecare.org', '+919811122334', 'Chief Medical Officer', '$2a$10$vEVL52lkxWGMGBRk/VloLOGYV1xW7FNQ49ODuTSHO6lAZ5V9H7ZRO', 'CLIENT_ADMIN', TRUE, 'ACTIVE', TRUE, v_admin_id)
    ON CONFLICT (email) DO NOTHING;


    -- 7. Products Master (3 High-Value Software Products)
    INSERT INTO products (
        id, product_code, product_name, description, category, current_version,
        base_license_price, standard_amc_percentage, currency, product_manager_user_id,
        is_active, tech_stack, implementation_fee, created_by
    ) VALUES
        ('a0000000-0000-0000-0000-000000000001', 'PRD-ERP-CORE', 'KashCloud Enterprise ERP', 'Cloud native ERP platform covering multi-currency general ledger, inventory, supply chain, automated invoices and tax filings.', 'ENTERPRISE_ERP', 'v3.2.0', 450000.00, 18.00, 'INR', '00000000-0000-0000-0000-000000000013', TRUE, 'PostgreSQL, Node.js, React, Redis, Docker', 50000.00, v_admin_id),
        ('a0000000-0000-0000-0000-000000000002', 'PRD-FLEET-LOGIX', 'LogiTrack Fleet & Logistics Suite', 'Real-time GPS telematics, AI dispatching, dynamic route optimization, cold-chain temperature monitoring, and driver mobile apps.', 'LOGISTICS_IOT', 'v2.1.0', 320000.00, 18.00, 'INR', '00000000-0000-0000-0000-000000000003', TRUE, 'Flutter, Python FastAPI, PostgreSQL, MQTT, Redis', 40000.00, v_admin_id),
        ('a0000000-0000-0000-0000-000000000003', 'PRD-FIN-PAYGATE', 'PayPulse Omni-channel Gateway', 'High-throughput payment orchestration engine, bank recon switch, UPI intent processing, and instant merchant settlement ledger.', 'FINTECH_PAYMENTS', 'v1.4.0', 550000.00, 18.00, 'INR', '00000000-0000-0000-0000-000000000003', TRUE, 'Go, PostgreSQL, Kafka, React Dashboard, AWS ECS', 75000.00, v_admin_id)
    ON CONFLICT (product_code) DO NOTHING;

    -- Product to Client Licenses
    INSERT INTO product_client_mappings (
        id, product_id, client_id, license_type, contract_value, amc_amount, currency,
        license_start_date, license_end_date, amc_renewal_date, status, support_tier, is_active, created_by
    ) VALUES
        ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', '77777777-7777-7777-7777-777777777772', 'SAAS_SUBSCRIPTION', 600000.00, 108000.00, 'INR', '2026-01-01', '2026-12-31', '2026-12-15', 'ACTIVE', '24x7 Enterprise Gold', TRUE, v_admin_id),
        ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', '77777777-7777-7777-7777-777777777773', 'ON_PREMISE_PERPETUAL', 850000.00, 153000.00, 'INR', '2026-02-01', NULL, '2027-01-31', 'ACTIVE', 'Business Standard', TRUE, v_admin_id),
        ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', '77777777-7777-7777-7777-777777777774', 'ANNUAL_LEASE', 450000.00, 81000.00, 'INR', '2026-03-01', '2027-02-28', '2027-02-15', 'ACTIVE', '24x7 Enterprise Gold', TRUE, v_admin_id),
        ('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003', '77777777-7777-7777-7777-777777777775', 'SAAS_SUBSCRIPTION', 350000.00, 63000.00, 'INR', '2026-04-01', '2027-03-31', '2027-03-15', 'ACTIVE', 'Business Standard', TRUE, v_admin_id)
    ON CONFLICT DO NOTHING;


    -- 8. Projects Master (5 Strategic Client & Internal Projects)
    INSERT INTO projects (
        id, project_code, project_name, description, client_id, branch_id, project_manager_user_id,
        billing_type, contract_amount, hourly_rate, budgeted_hours, currency,
        planned_start_date, planned_end_date, actual_start_date, project_status, tech_stack, is_active, created_by
    ) VALUES
        ('b0000000-0000-0000-0000-000000000001', 'PRJ-ACME-PAY', 'Acme Neo-Bank Mobile Integration', 'Custom mobile banking SDK and payment gateway adapter integration for Acme FinTech Solutions.', '77777777-7777-7777-7777-777777777772', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000003', 'FIXED_COST', 1250000.00, 1500.00, 800.00, 'INR', '2026-06-01', '2026-12-15', '2026-06-05', 'ACTIVE', 'Flutter, Node.js, PostgreSQL, AWS', TRUE, v_admin_id),
        ('b0000000-0000-0000-0000-000000000002', 'PRJ-NEXGEN-RT', 'NexGen Real-time Cold-Chain Tracking', 'Custom enterprise dashboard and telematics sensor pipeline for vaccine and perishable food supply chains.', '77777777-7777-7777-7777-777777777773', '11111111-1111-1111-1111-111111111113', '00000000-0000-0000-0000-000000000003', 'TIME_AND_MATERIAL', 950000.00, 1800.00, 650.00, 'INR', '2026-07-01', '2026-11-30', '2026-07-01', 'ACTIVE', 'React, Python, MQTT, TimescaleDB', TRUE, v_admin_id),
        ('b0000000-0000-0000-0000-000000000003', 'PRJ-ZENITH-OMNI', 'Zenith Multi-Store Inventory & POS Rollout', 'Omnichannel inventory sync engine with offline-capable retail point-of-sale integration for 150 stores.', '77777777-7777-7777-7777-777777777774', '11111111-1111-1111-1111-111111111112', '00000000-0000-0000-0000-000000000013', 'FIXED_COST', 1800000.00, 1600.00, 1100.00, 'INR', '2026-05-15', '2026-12-31', '2026-05-20', 'ACTIVE', 'React, Node.js, Electron, PostgreSQL', TRUE, v_admin_id),
        ('b0000000-0000-0000-0000-000000000004', 'PRJ-HEALTH-EHR', 'HealthWave Patient Portal & Telemedicine', 'HIPAA/ABDM compliant teleconsultation and automated health record sync portal with video conferencing.', '77777777-7777-7777-7777-777777777775', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000003', 'FIXED_COST', 1400000.00, 1750.00, 900.00, 'INR', '2026-08-01', '2027-02-28', '2026-08-05', 'ACTIVE', 'Next.js, WebRTC, Node.js, PostgreSQL', TRUE, v_admin_id),
        ('b0000000-0000-0000-0000-000000000005', 'PRJ-INT-AI-OPS', 'Internal AIOps Monitoring & Task Dispatcher', 'Machine learning telemetry ingestion, automated incident auto-assignment, and SLA escalation bot.', '77777777-7777-7777-7777-777777777771', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000004', 'RETAINER', 500000.00, 1200.00, 400.00, 'INR', '2026-04-01', '2026-12-31', '2026-04-01', 'ACTIVE', 'Python, LangChain, PostgreSQL, AWS Lambda', TRUE, v_admin_id)
    ON CONFLICT (project_code) DO NOTHING;

    -- Project Members
    INSERT INTO project_members (project_id, user_id, project_role, allocation_percentage, start_date, is_active, created_by)
    VALUES
        ('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'Project Manager', 50.00, '2026-06-01', TRUE, v_admin_id),
        ('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'Technical Architect', 40.00, '2026-06-01', TRUE, v_admin_id),
        ('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000006', 'Lead Fullstack Dev', 100.00, '2026-06-01', TRUE, v_admin_id),
        ('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000007', 'Frontend Developer', 100.00, '2026-06-01', TRUE, v_admin_id),
        ('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000005', 'QA Lead', 50.00, '2026-06-01', TRUE, v_admin_id),

        ('b0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'Project Manager', 50.00, '2026-07-01', TRUE, v_admin_id),
        ('b0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000009', 'Lead Mobile Dev', 100.00, '2026-07-01', TRUE, v_admin_id),
        ('b0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000008', 'Backend Engineer', 100.00, '2026-07-01', TRUE, v_admin_id),
        ('b0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'QA Automation Engineer', 80.00, '2026-07-01', TRUE, v_admin_id),

        ('b0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000013', 'Product / Project Manager', 80.00, '2026-05-15', TRUE, v_admin_id),
        ('b0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000006', 'Senior Developer', 60.00, '2026-05-15', TRUE, v_admin_id),
        ('b0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000007', 'UI Developer', 80.00, '2026-05-15', TRUE, v_admin_id),
        ('b0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000011', 'Support Lead', 50.00, '2026-05-15', TRUE, v_admin_id)
    ON CONFLICT (project_id, user_id) DO NOTHING;

    -- Client Contact Project Grants
    INSERT INTO client_contact_projects (contact_id, project_id, can_view_milestones, can_create_requests, can_approve_scope, can_approve_uat, is_active, created_by)
    VALUES
        ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', TRUE, TRUE, TRUE, TRUE, TRUE, v_admin_id),
        ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', TRUE, TRUE, TRUE, TRUE, TRUE, v_admin_id),
        ('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', TRUE, TRUE, TRUE, TRUE, TRUE, v_admin_id),
        ('d0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004', TRUE, TRUE, TRUE, TRUE, TRUE, v_admin_id)
    ON CONFLICT (contact_id, project_id) DO NOTHING;


    -- 9. Delivery Teams & Squad Allocations (PLAN-004)
    INSERT INTO teams (id, team_code, team_name, description, lead_user_id, is_active, created_by)
    VALUES
        ('c0000000-0000-0000-0000-000000000001', 'TEAM-PLATFORM', 'Core Platform & Architecture Squad', 'Cloud infrastructure, API gateways, database architecture, and microservices foundation.', '00000000-0000-0000-0000-000000000004', TRUE, v_admin_id),
        ('c0000000-0000-0000-0000-000000000002', 'TEAM-FINTECH', 'FinTech & Payment Engine Squad', 'Payment switches, transaction processing, ledger balancing, and banking security.', '00000000-0000-0000-0000-000000000006', TRUE, v_admin_id),
        ('c0000000-0000-0000-0000-000000000003', 'TEAM-LOGIX', 'Logistics, IoT & Mobile Squad', 'Telematics ingestion, route planning algorithms, offline mobile sync, and fleet apps.', '00000000-0000-0000-0000-000000000009', TRUE, v_admin_id)
    ON CONFLICT (team_code) DO NOTHING;

    INSERT INTO team_members (team_id, user_id, role_in_team, allocation_percentage, is_active, created_by)
    VALUES
        ('c0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'LEAD', 50.00, TRUE, v_admin_id),
        ('c0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', 'DEVOPS', 100.00, TRUE, v_admin_id),
        ('c0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000008', 'DEVELOPER', 50.00, TRUE, v_admin_id),
        ('c0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000005', 'QA_ENGINEER', 40.00, TRUE, v_admin_id),

        ('c0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000006', 'LEAD', 100.00, TRUE, v_admin_id),
        ('c0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000007', 'DEVELOPER', 100.00, TRUE, v_admin_id),
        ('c0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000008', 'DEVELOPER', 50.00, TRUE, v_admin_id),
        ('c0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000005', 'QA_ENGINEER', 60.00, TRUE, v_admin_id),

        ('c0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000009', 'LEAD', 100.00, TRUE, v_admin_id),
        ('c0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000007', 'DEVELOPER', 50.00, TRUE, v_admin_id),
        ('c0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'QA_ENGINEER', 100.00, TRUE, v_admin_id),
        ('c0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000011', 'DEVELOPER', 60.00, TRUE, v_admin_id)
    ON CONFLICT (team_id, user_id) DO NOTHING;

    INSERT INTO team_projects (team_id, project_id)
    VALUES
        ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001'),
        ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002'),
        ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003'),
        ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005')
    ON CONFLICT DO NOTHING;

    INSERT INTO team_products (team_id, product_id)
    VALUES
        ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'),
        ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002'),
        ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003')
    ON CONFLICT DO NOTHING;


    -- 10. Software Components Catalog & Architecture DAG (PLAN-004)
    INSERT INTO software_components (id, component_code, component_name, description, entity_type, product_id, project_id, owner_team_id, tech_lead_user_id, technology_stack, criticality, is_active, created_by)
    VALUES
        ('f0000000-0000-0000-0000-000000000001', 'CMP-ERP-CORE', 'ERP General Ledger Engine', 'Core double-entry journal book and tax calculations', 'PRODUCT', 'a0000000-0000-0000-0000-000000000001', NULL, 'c0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'Node.js, PostgreSQL', 'TIER_1_CRITICAL', TRUE, v_admin_id),
        ('f0000000-0000-0000-0000-000000000002', 'CMP-ERP-WEB', 'ERP Web Experience Portal', 'React based responsive finance and operations web console', 'PRODUCT', 'a0000000-0000-0000-0000-000000000001', NULL, 'c0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000006', 'React, Vite, Tailwind', 'TIER_2_CORE', TRUE, v_admin_id),
        ('f0000000-0000-0000-0000-000000000003', 'CMP-FLEET-TEL', 'Telematics Telemetry Processor', 'MQTT broker consumer and GPS coordinate stream validator', 'PRODUCT', 'a0000000-0000-0000-0000-000000000002', NULL, 'c0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000009', 'Python, FastAPI, Redis', 'TIER_1_CRITICAL', TRUE, v_admin_id),
        ('f0000000-0000-0000-0000-000000000004', 'CMP-FLEET-APP', 'Driver & Dispatcher Mobile App', 'Flutter iOS/Android app with offline cache and turn-by-turn routing', 'PRODUCT', 'a0000000-0000-0000-0000-000000000002', NULL, 'c0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000009', 'Flutter, Dart, SQLite', 'TIER_2_CORE', TRUE, v_admin_id),
        ('f0000000-0000-0000-0000-000000000005', 'CMP-PAY-SWITCH', 'PayPulse Core Switch & Ledger', 'PCI-DSS transaction router, tokenization and UPI rail adapter', 'PRODUCT', 'a0000000-0000-0000-0000-000000000003', NULL, 'c0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000006', 'Go, Kafka, PostgreSQL', 'TIER_1_CRITICAL', TRUE, v_admin_id),
        ('f0000000-0000-0000-0000-000000000006', 'CMP-PAY-PORTAL', 'Merchant Management Portal', 'Merchant onboarding, settlement reports, and refund management UI', 'PRODUCT', 'a0000000-0000-0000-0000-000000000003', NULL, 'c0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000007', 'React, Tailwind, Chart.js', 'TIER_2_CORE', TRUE, v_admin_id),
        ('f0000000-0000-0000-0000-000000000007', 'CMP-ACME-SDK', 'Acme Mobile Banking Bridge SDK', 'Custom SDK embedding PayPulse into Acme Android/iOS apps', 'PROJECT', NULL, 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000006', 'Kotlin, Swift, TypeScript', 'TIER_1_CRITICAL', TRUE, v_admin_id),
        ('f0000000-0000-0000-0000-000000000008', 'CMP-NEX-COLD', 'NexGen Cold-Chain Sensor Ingestion', 'TimescaleDB high-velocity time-series ingest for temperature probes', 'PROJECT', NULL, 'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000008', 'Python, TimescaleDB, MQTT', 'TIER_2_CORE', TRUE, v_admin_id),
        ('f0000000-0000-0000-0000-000000000009', 'CMP-ZEN-POS', 'Zenith Offline POS Desktop Bridge', 'Electron POS client running across 150 local store registers', 'PROJECT', NULL, 'b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000007', 'Electron, React, SQLite', 'TIER_2_CORE', TRUE, v_admin_id)
    ON CONFLICT (component_code, entity_type, product_id, project_id) DO NOTHING;

    INSERT INTO component_dependencies (component_id, depends_on_component_id, dependency_type, description, is_active, created_by)
    VALUES
        ('f0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', 'CONSUMES_API', 'ERP Frontend consumes core RESTful API endpoints', TRUE, v_admin_id),
        ('f0000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000003', 'CONSUMES_API', 'Mobile app pulls route telemetry from telemetry processor', TRUE, v_admin_id),
        ('f0000000-0000-0000-0000-000000000006', 'f0000000-0000-0000-0000-000000000005', 'CONSUMES_API', 'Merchant portal interacts with payment engine via secured RPC', TRUE, v_admin_id),
        ('f0000000-0000-0000-0000-000000000007', 'f0000000-0000-0000-0000-000000000005', 'CALLS_SERVICE', 'Acme SDK communicates with PayPulse switch', TRUE, v_admin_id),
        ('f0000000-0000-0000-0000-000000000008', 'f0000000-0000-0000-0000-000000000003', 'EVENT_PUBSUB', 'Cold-chain pipeline subscribes to fleet telemetry broker', TRUE, v_admin_id),
        ('f0000000-0000-0000-0000-000000000009', 'f0000000-0000-0000-0000-000000000001', 'CONSUMES_API', 'Zenith POS synchronizes orders into ERP core ledger', TRUE, v_admin_id)
    ON CONFLICT (component_id, depends_on_component_id, dependency_type) DO NOTHING;


    -- 11. Versions, Milestones & Sprints (PLAN-001)
    INSERT INTO versions (id, version_code, version_name, description, entity_type, product_id, project_id, planned_start_date, target_release_date, status, is_active, created_by)
    VALUES
        ('10000000-0000-0000-0000-000000000001', 'v3.2.0', 'KashCloud ERP Q3 Release', 'Multi-GST automation and inventory aging analytics', 'PRODUCT', 'a0000000-0000-0000-0000-000000000001', NULL, '2026-08-01', '2026-10-31', 'IN_PROGRESS', TRUE, v_admin_id),
        ('10000000-0000-0000-0000-000000000002', 'v2.1.0', 'LogiTrack IoT Telematics 2.1', 'Sub-second GPS streaming and cold-chain temperature thresholds', 'PRODUCT', 'a0000000-0000-0000-0000-000000000002', NULL, '2026-08-15', '2026-11-15', 'IN_PROGRESS', TRUE, v_admin_id),
        ('10000000-0000-0000-0000-000000000003', 'v1.4.0', 'PayPulse Multi-Bank Orchestration', 'Dynamic routing and instant UPI Intent refund reconciliations', 'PRODUCT', 'a0000000-0000-0000-0000-000000000003', NULL, '2026-07-01', '2026-10-15', 'IN_PROGRESS', TRUE, v_admin_id),
        ('10000000-0000-0000-0000-000000000004', 'v1.0.0-PROD', 'Acme Mobile SDK Initial Release', 'Acme customer banking SDK release for iOS and Android', 'PROJECT', NULL, 'b0000000-0000-0000-0000-000000000001', '2026-06-01', '2026-10-31', 'IN_PROGRESS', TRUE, v_admin_id),
        ('10000000-0000-0000-0000-000000000005', 'v1.2.0', 'NexGen Cold-Chain Pipeline Phase 1', 'IoT sensor aggregation and cold storage dashboard', 'PROJECT', NULL, 'b0000000-0000-0000-0000-000000000002', '2026-07-01', '2026-11-30', 'IN_PROGRESS', TRUE, v_admin_id),
        ('10000000-0000-0000-0000-000000000006', 'v1.0.0-PILOT', 'Zenith POS Multi-Store Pilot', 'Pilot deployment to 25 flagship retail stores in Pune and Mumbai', 'PROJECT', NULL, 'b0000000-0000-0000-0000-000000000003', '2026-05-15', '2026-10-31', 'IN_PROGRESS', TRUE, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO milestones (id, milestone_code, milestone_name, description, entity_type, product_id, project_id, target_date, status, is_active, created_by)
    VALUES
        ('11000000-0000-0000-0000-000000000001', 'MLS-ERP-Q3', 'GST E-Invoice & Audit Trail Certification', 'Complete Indian GSTN sandbox verification and audit trail export', 'PRODUCT', 'a0000000-0000-0000-0000-000000000001', NULL, '2026-10-15', 'IN_PROGRESS', TRUE, v_admin_id),
        ('11000000-0000-0000-0000-000000000002', 'MLS-FLEET-COLD', 'Cold-Chain Alerting Engine Verification', 'Real-time alert dispatching for 10,000 simultaneous telemetry feeds', 'PRODUCT', 'a0000000-0000-0000-0000-000000000002', NULL, '2026-10-30', 'IN_PROGRESS', TRUE, v_admin_id),
        ('11000000-0000-0000-0000-000000000003', 'MLS-PAY-NPCI', 'NPCI UPI AutoPay 2.0 Certification', 'End-to-end UPI recurring mandate automation certification', 'PRODUCT', 'a0000000-0000-0000-0000-000000000003', NULL, '2026-10-05', 'IN_PROGRESS', TRUE, v_admin_id),
        ('11000000-0000-0000-0000-000000000004', 'MLS-ACME-BETA', 'Acme Beta User Testing & Security Pen-Test', 'External security audit and 500 beta customer transactions', 'PROJECT', NULL, 'b0000000-0000-0000-0000-000000000001', '2026-10-20', 'IN_PROGRESS', TRUE, v_admin_id),
        ('11000000-0000-0000-0000-000000000005', 'MLS-NEX-PROBES', 'Sensor Calibration & Fleet Field Trials', '100 reefer trucks onboarded with real-time temperature telemetry', 'PROJECT', NULL, 'b0000000-0000-0000-0000-000000000002', '2026-11-10', 'PLANNED', TRUE, v_admin_id),
        ('11000000-0000-0000-0000-000000000006', 'MLS-ZEN-STORES', 'Store Offline Sync & Reconcile Verification', 'Verify 7-day network disconnected POS operations with zero data loss', 'PROJECT', NULL, 'b0000000-0000-0000-0000-000000000003', '2026-10-25', 'IN_PROGRESS', TRUE, v_admin_id)
    ON CONFLICT (milestone_code, entity_type, product_id, project_id) DO NOTHING;

    INSERT INTO sprints (id, sprint_code, sprint_name, sprint_goal, entity_type, product_id, project_id, start_date, end_date, status, committed_tasks_count, committed_story_points, committed_hours, completed_tasks_count, completed_story_points, completed_hours, total_capacity_hours, is_active, created_by)
    VALUES
        ('12000000-0000-0000-0000-000000000001', 'SPR-ERP-40', 'Sprint 40: Inventory & GST Compliance', 'Finalize automated e-invoicing and batch inventory tracking', 'PRODUCT', 'a0000000-0000-0000-0000-000000000001', NULL, '2026-09-21', '2026-10-04', 'ACTIVE', 35, 85.0, 240.0, 15, 38.0, 105.0, 280.0, TRUE, v_admin_id),
        ('12000000-0000-0000-0000-000000000002', 'SPR-FLT-22', 'Sprint 22: High-Velocity Telematics Stream', 'Optimize Redis pub/sub and battery-saving GPS push frequencies', 'PRODUCT', 'a0000000-0000-0000-0000-000000000002', NULL, '2026-09-21', '2026-10-04', 'ACTIVE', 35, 78.0, 220.0, 14, 32.0, 96.0, 260.0, TRUE, v_admin_id),
        ('12000000-0000-0000-0000-000000000003', 'SPR-PAY-18', 'Sprint 18: Payment Switch Fault Tolerance', 'Implement circuit breakers and zero-loss ledger retry queues', 'PRODUCT', 'a0000000-0000-0000-0000-000000000003', NULL, '2026-09-21', '2026-10-04', 'ACTIVE', 35, 92.0, 260.0, 18, 45.0, 130.0, 300.0, TRUE, v_admin_id),
        ('12000000-0000-0000-0000-000000000004', 'SPR-ACM-06', 'Sprint 06: Biometric Auth & Tokenization', 'Complete fingerprint/faceID biometric tokenization in Flutter', 'PROJECT', NULL, 'b0000000-0000-0000-0000-000000000001', '2026-09-21', '2026-10-04', 'ACTIVE', 35, 80.0, 230.0, 16, 40.0, 110.0, 270.0, TRUE, v_admin_id),
        ('12000000-0000-0000-0000-000000000005', 'SPR-NEX-05', 'Sprint 05: Cold-Chain Radar & Heatmaps', 'Build geospatial route map with temperature color-grading', 'PROJECT', NULL, 'b0000000-0000-0000-0000-000000000002', '2026-09-21', '2026-10-04', 'ACTIVE', 35, 75.0, 210.0, 12, 28.0, 85.0, 250.0, TRUE, v_admin_id),
        ('12000000-0000-0000-0000-000000000006', 'SPR-ZEN-08', 'Sprint 08: Multi-Barcode Scan & Fast Checkout', 'Sub-50ms barcode lookup and SQLite offline batching', 'PROJECT', NULL, 'b0000000-0000-0000-0000-000000000003', '2026-09-21', '2026-10-04', 'ACTIVE', 35, 82.0, 235.0, 15, 36.0, 102.0, 280.0, TRUE, v_admin_id)
    ON CONFLICT DO NOTHING;


    -- 12. Workflow Transitions for all task types
    INSERT INTO task_type_workflow_statuses (task_type_id, from_status_id, to_status_id, is_active, created_by)
    VALUES
        -- BUG transitions
        ('55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666661', '66666666-6666-6666-6666-666666666662', TRUE, v_admin_id),
        ('55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666662', '66666666-6666-6666-6666-666666666663', TRUE, v_admin_id),
        ('55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666663', '66666666-6666-6666-6666-666666666664', TRUE, v_admin_id),
        ('55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666664', '66666666-6666-6666-6666-666666666665', TRUE, v_admin_id),
        ('55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666665', '66666666-6666-6666-6666-666666666662', TRUE, v_admin_id),
        ('55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666665', '66666666-6666-6666-6666-666666666666', TRUE, v_admin_id),
        ('55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666667', TRUE, v_admin_id),
        ('55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666661', '66666666-6666-6666-6666-666666666668', TRUE, v_admin_id),

        -- ISSUE transitions
        ('55555555-5555-5555-5555-555555555553', '66666666-6666-6666-6666-666666666661', '66666666-6666-6666-6666-666666666662', TRUE, v_admin_id),
        ('55555555-5555-5555-5555-555555555553', '66666666-6666-6666-6666-666666666662', '66666666-6666-6666-6666-666666666665', TRUE, v_admin_id),
        ('55555555-5555-5555-5555-555555555553', '66666666-6666-6666-6666-666666666665', '66666666-6666-6666-6666-666666666667', TRUE, v_admin_id),
        ('55555555-5555-5555-5555-555555555553', '66666666-6666-6666-6666-666666666661', '66666666-6666-6666-6666-666666666668', TRUE, v_admin_id),

        -- ENHANCEMENT transitions
        ('55555555-5555-5555-5555-555555555554', '66666666-6666-6666-6666-666666666661', '66666666-6666-6666-6666-666666666662', TRUE, v_admin_id),
        ('55555555-5555-5555-5555-555555555554', '66666666-6666-6666-6666-666666666662', '66666666-6666-6666-6666-666666666663', TRUE, v_admin_id),
        ('55555555-5555-5555-5555-555555555554', '66666666-6666-6666-6666-666666666663', '66666666-6666-6666-6666-666666666664', TRUE, v_admin_id),
        ('55555555-5555-5555-5555-555555555554', '66666666-6666-6666-6666-666666666664', '66666666-6666-6666-6666-666666666665', TRUE, v_admin_id),
        ('55555555-5555-5555-5555-555555555554', '66666666-6666-6666-6666-666666666665', '66666666-6666-6666-6666-666666666666', TRUE, v_admin_id),
        ('55555555-5555-5555-5555-555555555554', '66666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666667', TRUE, v_admin_id),
        ('55555555-5555-5555-5555-555555555554', '66666666-6666-6666-6666-666666666661', '66666666-6666-6666-6666-666666666668', TRUE, v_admin_id),

        -- TRAINING transitions
        ('55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666661', '66666666-6666-6666-6666-666666666662', TRUE, v_admin_id),
        ('55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666662', '66666666-6666-6666-6666-666666666667', TRUE, v_admin_id),
        ('55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666661', '66666666-6666-6666-6666-666666666668', TRUE, v_admin_id),

        -- SUPPORT transitions
        ('55555555-5555-5555-5555-555555555556', '66666666-6666-6666-6666-666666666661', '66666666-6666-6666-6666-666666666662', TRUE, v_admin_id),
        ('55555555-5555-5555-5555-555555555556', '66666666-6666-6666-6666-666666666662', '66666666-6666-6666-6666-666666666665', TRUE, v_admin_id),
        ('55555555-5555-5555-5555-555555555556', '66666666-6666-6666-6666-666666666665', '66666666-6666-6666-6666-666666666667', TRUE, v_admin_id),
        ('55555555-5555-5555-5555-555555555556', '66666666-6666-6666-6666-666666666661', '66666666-6666-6666-6666-666666666668', TRUE, v_admin_id)
    ON CONFLICT (task_type_id, from_status_id, to_status_id) DO NOTHING;


    -- 13. Tasks, Assignees, Sprint Tasks, Worklogs, Comments, Dependencies, and Blockers
    -- Total ~210 richly structured tasks across Products and Projects


    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000003e9', 'TSK-ERP-001', 1, 'Epic: Automated GST E-Invoicing & Compliance Engine', 'Detailed technical description and specification for Epic: Automated GST E-Invoicing & Compliance Engine',
        'EPIC', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666662', 'CRITICAL',
        NULL, 'a0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', NULL,
        'c0000000-0000-0000-0000-000000000001', 13, 'XL', '2026-09-01 09:30:00+05:30', '2026-10-03 18:30:00+05:30',
        '2026-09-01 09:30:00+05:30', NULL,
        40, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003e9', '00000000-0000-0000-0000-000000000012', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003e9', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003e9', 'f0000000-0000-0000-0000-000000000001', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-0000000003e9', '00000000-0000-0000-0000-000000000012', CURRENT_DATE - 2, 24, FALSE, 'Implementation and code review work for TSK-ERP-001', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000003ea', 'TSK-ERP-002', 1, 'Tax calculation rule parser for Inter-state IGST and Intra-state CGST/SGST', 'Detailed technical description and specification for Tax calculation rule parser for Inter-state IGST and Intra-state CGST/SGST',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666667', 'HIGH',
        NULL, 'a0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003e9',
        'c0000000-0000-0000-0000-000000000001', 5, 'M', '2026-09-02 09:30:00+05:30', '2026-10-05 18:30:00+05:30',
        '2026-09-02 09:30:00+05:30', '2026-10-05 18:30:00+05:30',
        16, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003ea', '00000000-0000-0000-0000-000000000004', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003ea', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003ea', 'f0000000-0000-0000-0000-000000000001', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-0000000003ea', '00000000-0000-0000-0000-000000000004', CURRENT_DATE - 2, 16, FALSE, 'Implementation and code review work for TSK-ERP-002', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

      INSERT INTO task_comments (task_id, user_id, comment_text, is_internal_only, created_by)
      VALUES ('20000000-0000-0000-0000-0000000003ea', '00000000-0000-0000-0000-000000000004', 'Status update: Technical solution implemented, unit tests passed, ready for verification on staging environment.', FALSE, v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000003eb', 'TSK-ERP-003', 1, 'Direct NIC Portal JSON Payload encryption with AES-256', 'Detailed technical description and specification for Direct NIC Portal JSON Payload encryption with AES-256',
        'SUBTASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666667', 'HIGH',
        NULL, 'a0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003ea',
        'c0000000-0000-0000-0000-000000000001', 3, 'S', '2026-09-03 09:30:00+05:30', '2026-10-07 18:30:00+05:30',
        '2026-09-03 09:30:00+05:30', '2026-10-07 18:30:00+05:30',
        10, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003eb', '00000000-0000-0000-0000-000000000006', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003eb', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003eb', 'f0000000-0000-0000-0000-000000000001', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-0000000003eb', '00000000-0000-0000-0000-000000000006', CURRENT_DATE - 2, 10, FALSE, 'Implementation and code review work for TSK-ERP-003', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000003ec', 'TSK-ERP-004', 1, 'E-way bill generation trigger on dispatch advice generation', 'Detailed technical description and specification for E-way bill generation trigger on dispatch advice generation',
        'SUBTASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666667', 'MEDIUM',
        NULL, 'a0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003ea',
        'c0000000-0000-0000-0000-000000000001', 2, 'XS', '2026-09-04 09:30:00+05:30', '2026-10-09 18:30:00+05:30',
        '2026-09-04 09:30:00+05:30', '2026-10-09 18:30:00+05:30',
        8, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003ec', '00000000-0000-0000-0000-000000000007', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003ec', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003ec', 'f0000000-0000-0000-0000-000000000001', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-0000000003ec', '00000000-0000-0000-0000-000000000007', CURRENT_DATE - 2, 8, FALSE, 'Implementation and code review work for TSK-ERP-004', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000003ed', 'TSK-ERP-005', 1, 'Bug: Rounding discrepancy in fractional paise during bulk invoice discount', 'Detailed technical description and specification for Bug: Rounding discrepancy in fractional paise during bulk invoice discount',
        'TASK', '55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666665', 'HIGH',
        NULL, 'a0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003e9',
        'c0000000-0000-0000-0000-000000000001', 3, 'S', '2026-09-05 09:30:00+05:30', '2026-10-11 18:30:00+05:30',
        '2026-09-05 09:30:00+05:30', NULL,
        8, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{"environment":"Staging","steps_to_reproduce":"1. Navigate to target module screen.\n2. Enter boundary test data.\n3. Click proceed and observe behavior.","expected_behavior":"Operation should complete with valid response without errors.","actual_behavior":"System displays error notification or unexpected validation output.","reproduction_frequency":"Always"}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003ed', '00000000-0000-0000-0000-000000000010', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003ed', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003ed', 'f0000000-0000-0000-0000-000000000001', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-0000000003ed', '00000000-0000-0000-0000-000000000010', CURRENT_DATE - 2, 4, FALSE, 'Implementation and code review work for TSK-ERP-005', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

      INSERT INTO task_comments (task_id, user_id, comment_text, is_internal_only, created_by)
      VALUES ('20000000-0000-0000-0000-0000000003ed', '00000000-0000-0000-0000-000000000010', 'Status update: Technical solution implemented, unit tests passed, ready for verification on staging environment.', FALSE, v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000003ee', 'TSK-ERP-006', 1, 'Regression test round-off math for 500+ items invoice', 'Detailed technical description and specification for Regression test round-off math for 500+ items invoice',
        'SUBTASK', '55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666665', 'MEDIUM',
        NULL, 'a0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003ed',
        'c0000000-0000-0000-0000-000000000001', 1, 'XS', '2026-09-06 09:30:00+05:30', '2026-10-13 18:30:00+05:30',
        '2026-09-06 09:30:00+05:30', NULL,
        4, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{"environment":"Staging","steps_to_reproduce":"1. Navigate to target module screen.\n2. Enter boundary test data.\n3. Click proceed and observe behavior.","expected_behavior":"Operation should complete with valid response without errors.","actual_behavior":"System displays error notification or unexpected validation output.","reproduction_frequency":"Always"}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003ee', '00000000-0000-0000-0000-000000000005', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003ee', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003ee', 'f0000000-0000-0000-0000-000000000001', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-0000000003ee', '00000000-0000-0000-0000-000000000005', CURRENT_DATE - 2, 2, FALSE, 'Implementation and code review work for TSK-ERP-006', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000003ef', 'TSK-ERP-007', 1, 'Epic: Multi-Warehouse Inventory Valuation & Aging Ledger', 'Detailed technical description and specification for Epic: Multi-Warehouse Inventory Valuation & Aging Ledger',
        'EPIC', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666662', 'HIGH',
        NULL, 'a0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', NULL,
        'c0000000-0000-0000-0000-000000000001', 21, 'XL', '2026-09-07 09:30:00+05:30', '2026-10-15 18:30:00+05:30',
        '2026-09-07 09:30:00+05:30', NULL,
        60, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003ef', '00000000-0000-0000-0000-000000000012', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003ef', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003ef', 'f0000000-0000-0000-0000-000000000001', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-0000000003ef', '00000000-0000-0000-0000-000000000012', CURRENT_DATE - 2, 36, FALSE, 'Implementation and code review work for TSK-ERP-007', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000003f0', 'TSK-ERP-008', 1, 'FIFO and Weighted Average cost evaluation scheduled job', 'Detailed technical description and specification for FIFO and Weighted Average cost evaluation scheduled job',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666663', 'HIGH',
        NULL, 'a0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003ef',
        'c0000000-0000-0000-0000-000000000001', 8, 'L', '2026-09-08 09:30:00+05:30', '2026-10-10 18:30:00+05:30',
        '2026-09-08 09:30:00+05:30', NULL,
        24, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003f0', '00000000-0000-0000-0000-000000000004', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003f0', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003f0', 'f0000000-0000-0000-0000-000000000001', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-0000000003f0', '00000000-0000-0000-0000-000000000004', CURRENT_DATE - 2, 14, FALSE, 'Implementation and code review work for TSK-ERP-008', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

      INSERT INTO task_comments (task_id, user_id, comment_text, is_internal_only, created_by)
      VALUES ('20000000-0000-0000-0000-0000000003f0', '00000000-0000-0000-0000-000000000004', 'Status update: Technical solution implemented, unit tests passed, ready for verification on staging environment.', FALSE, v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000003f1', 'TSK-ERP-009', 1, 'Inventory transfer receipt validation against serial & batch numbers', 'Detailed technical description and specification for Inventory transfer receipt validation against serial & batch numbers',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666664', 'MEDIUM',
        NULL, 'a0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003ef',
        'c0000000-0000-0000-0000-000000000001', 5, 'M', '2026-09-09 09:30:00+05:30', '2026-10-12 18:30:00+05:30',
        '2026-09-09 09:30:00+05:30', NULL,
        16, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003f1', '00000000-0000-0000-0000-000000000010', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003f1', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003f1', 'f0000000-0000-0000-0000-000000000001', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000003f2', 'TSK-ERP-010', 1, 'Barcode scanner QR parser optimization on goods inward screen', 'Detailed technical description and specification for Barcode scanner QR parser optimization on goods inward screen',
        'TASK', '55555555-5555-5555-5555-555555555554', '66666666-6666-6666-6666-666666666667', 'LOW',
        NULL, 'a0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003ef',
        'c0000000-0000-0000-0000-000000000001', 2, 'XS', '2026-09-10 09:30:00+05:30', '2026-10-14 18:30:00+05:30',
        '2026-09-10 09:30:00+05:30', '2026-10-14 18:30:00+05:30',
        6, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003f2', '00000000-0000-0000-0000-000000000007', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003f2', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003f2', 'f0000000-0000-0000-0000-000000000001', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-0000000003f2', '00000000-0000-0000-0000-000000000007', CURRENT_DATE - 2, 6, FALSE, 'Implementation and code review work for TSK-ERP-010', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000003f3', 'TSK-ERP-011', 1, 'Issue: Deadlock during concurrent warehouse stock depletion', 'Detailed technical description and specification for Issue: Deadlock during concurrent warehouse stock depletion',
        'TASK', '55555555-5555-5555-5555-555555555553', '66666666-6666-6666-6666-666666666667', 'URGENT',
        NULL, 'a0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003ef',
        'c0000000-0000-0000-0000-000000000001', 5, 'M', '2026-09-11 09:30:00+05:30', '2026-10-16 18:30:00+05:30',
        '2026-09-11 09:30:00+05:30', '2026-10-16 18:30:00+05:30',
        12, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003f3', '00000000-0000-0000-0000-000000000008', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003f3', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003f3', 'f0000000-0000-0000-0000-000000000001', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-0000000003f3', '00000000-0000-0000-0000-000000000008', CURRENT_DATE - 2, 12, FALSE, 'Implementation and code review work for TSK-ERP-011', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

      INSERT INTO task_comments (task_id, user_id, comment_text, is_internal_only, created_by)
      VALUES ('20000000-0000-0000-0000-0000000003f3', '00000000-0000-0000-0000-000000000008', 'Status update: Technical solution implemented, unit tests passed, ready for verification on staging environment.', FALSE, v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000003f4', 'TSK-ERP-012', 1, 'Support: Assistance for fiscal year-end closing entry generation', 'Detailed technical description and specification for Support: Assistance for fiscal year-end closing entry generation',
        'TASK', '55555555-5555-5555-5555-555555555556', '66666666-6666-6666-6666-666666666667', 'HIGH',
        NULL, 'a0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003ef',
        'c0000000-0000-0000-0000-000000000001', 3, 'S', '2026-09-12 09:30:00+05:30', '2026-10-18 18:30:00+05:30',
        '2026-09-12 09:30:00+05:30', '2026-10-18 18:30:00+05:30',
        8, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003f4', '00000000-0000-0000-0000-000000000011', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003f4', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003f4', 'f0000000-0000-0000-0000-000000000001', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-0000000003f4', '00000000-0000-0000-0000-000000000011', CURRENT_DATE - 2, 8, FALSE, 'Implementation and code review work for TSK-ERP-012', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000003f5', 'TSK-ERP-013', 1, 'Training: Internal workshop on new automated reconciliations screen', 'Detailed technical description and specification for Training: Internal workshop on new automated reconciliations screen',
        'TASK', '55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666667', 'MEDIUM',
        NULL, 'a0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003ef',
        'c0000000-0000-0000-0000-000000000001', 2, 'XS', '2026-09-13 09:30:00+05:30', '2026-10-20 18:30:00+05:30',
        '2026-09-13 09:30:00+05:30', '2026-10-20 18:30:00+05:30',
        4, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003f5', '00000000-0000-0000-0000-000000000003', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003f5', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003f5', 'f0000000-0000-0000-0000-000000000001', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-0000000003f5', '00000000-0000-0000-0000-000000000003', CURRENT_DATE - 2, 4, FALSE, 'Implementation and code review work for TSK-ERP-013', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000003f6', 'TSK-ERP-014', 1, 'Enhancement: Export general ledger balance sheet to XLSX with drill-downs', 'Detailed technical description and specification for Enhancement: Export general ledger balance sheet to XLSX with drill-downs',
        'TASK', '55555555-5555-5555-5555-555555555554', '66666666-6666-6666-6666-666666666661', 'MEDIUM',
        NULL, 'a0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003ef',
        'c0000000-0000-0000-0000-000000000001', 3, 'S', '2026-09-14 09:30:00+05:30', '2026-10-22 18:30:00+05:30',
        NULL, NULL,
        10, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003f6', '00000000-0000-0000-0000-000000000004', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003f6', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003f6', 'f0000000-0000-0000-0000-000000000001', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000003f7', 'TSK-ERP-015', 1, 'Bug: Supplier TDS deduction mismatch on reverse charge invoices', 'Detailed technical description and specification for Bug: Supplier TDS deduction mismatch on reverse charge invoices',
        'TASK', '55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666664', 'HIGH',
        NULL, 'a0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003ef',
        'c0000000-0000-0000-0000-000000000001', 3, 'S', '2026-09-15 09:30:00+05:30', '2026-10-17 18:30:00+05:30',
        '2026-09-15 09:30:00+05:30', NULL,
        8, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{"environment":"Staging","steps_to_reproduce":"1. Navigate to target module screen.\n2. Enter boundary test data.\n3. Click proceed and observe behavior.","expected_behavior":"Operation should complete with valid response without errors.","actual_behavior":"System displays error notification or unexpected validation output.","reproduction_frequency":"Always"}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003f7', '00000000-0000-0000-0000-000000000010', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003f7', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003f7', 'f0000000-0000-0000-0000-000000000001', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000003f8', 'TSK-ERP-016', 1, 'Verify TDS Section 194Q threshold logic for vendor payments', 'Detailed technical description and specification for Verify TDS Section 194Q threshold logic for vendor payments',
        'SUBTASK', '55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666664', 'MEDIUM',
        NULL, 'a0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003f7',
        'c0000000-0000-0000-0000-000000000001', 2, 'XS', '2026-09-16 09:30:00+05:30', '2026-10-19 18:30:00+05:30',
        '2026-09-16 09:30:00+05:30', NULL,
        4, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{"environment":"Staging","steps_to_reproduce":"1. Navigate to target module screen.\n2. Enter boundary test data.\n3. Click proceed and observe behavior.","expected_behavior":"Operation should complete with valid response without errors.","actual_behavior":"System displays error notification or unexpected validation output.","reproduction_frequency":"Always"}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003f8', '00000000-0000-0000-0000-000000000005', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003f8', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003f8', 'f0000000-0000-0000-0000-000000000001', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000003f9', 'TSK-ERP-017', 1, 'Epic: Role-based Approval Matrix for Purchase Orders > ₹5,00,000', 'Detailed technical description and specification for Epic: Role-based Approval Matrix for Purchase Orders > ₹5,00,000',
        'EPIC', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666661', 'HIGH',
        NULL, 'a0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', NULL,
        'c0000000-0000-0000-0000-000000000001', 13, 'XL', '2026-09-17 09:30:00+05:30', '2026-10-21 18:30:00+05:30',
        NULL, NULL,
        40, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003f9', '00000000-0000-0000-0000-000000000008', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003f9', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003f9', 'f0000000-0000-0000-0000-000000000001', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000003fa', 'TSK-ERP-018', 1, 'PO approval hierarchy workflow delegation when approver is on leave', 'Detailed technical description and specification for PO approval hierarchy workflow delegation when approver is on leave',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666661', 'MEDIUM',
        NULL, 'a0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003f9',
        'c0000000-0000-0000-0000-000000000001', 5, 'M', '2026-09-18 09:30:00+05:30', '2026-10-23 18:30:00+05:30',
        NULL, NULL,
        16, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003fa', '00000000-0000-0000-0000-000000000009', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003fa', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003fa', 'f0000000-0000-0000-0000-000000000001', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000003fb', 'TSK-ERP-019', 1, 'Email & WhatsApp interactive approval button callback webhook', 'Detailed technical description and specification for Email & WhatsApp interactive approval button callback webhook',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666661', 'MEDIUM',
        NULL, 'a0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003f9',
        'c0000000-0000-0000-0000-000000000001', 5, 'M', '2026-09-19 09:30:00+05:30', '2026-10-25 18:30:00+05:30',
        NULL, NULL,
        14, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003fb', '00000000-0000-0000-0000-000000000012', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003fb', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003fb', 'f0000000-0000-0000-0000-000000000001', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000003fc', 'TSK-ERP-020', 1, 'Bug: Stale PO status cached after manager rejects order', 'Detailed technical description and specification for Bug: Stale PO status cached after manager rejects order',
        'TASK', '55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666661', 'MEDIUM',
        NULL, 'a0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003f9',
        'c0000000-0000-0000-0000-000000000001', 2, 'XS', '2026-09-20 09:30:00+05:30', '2026-10-27 18:30:00+05:30',
        NULL, NULL,
        6, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{"environment":"Staging","steps_to_reproduce":"1. Navigate to target module screen.\n2. Enter boundary test data.\n3. Click proceed and observe behavior.","expected_behavior":"Operation should complete with valid response without errors.","actual_behavior":"System displays error notification or unexpected validation output.","reproduction_frequency":"Always"}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003fc', '00000000-0000-0000-0000-000000000005', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003fc', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003fc', 'f0000000-0000-0000-0000-000000000001', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000003fd', 'TSK-ERP-021', 1, 'Issue: PDF rendering latency spikes on invoices with 200+ line items', 'Detailed technical description and specification for Issue: PDF rendering latency spikes on invoices with 200+ line items',
        'TASK', '55555555-5555-5555-5555-555555555553', '66666666-6666-6666-6666-666666666662', 'HIGH',
        NULL, 'a0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003f9',
        'c0000000-0000-0000-0000-000000000001', 5, 'M', '2026-09-01 09:30:00+05:30', '2026-10-09 18:30:00+05:30',
        '2026-09-01 09:30:00+05:30', NULL,
        14, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003fd', '00000000-0000-0000-0000-000000000006', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003fd', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003fd', 'f0000000-0000-0000-0000-000000000001', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-0000000003fd', '00000000-0000-0000-0000-000000000006', CURRENT_DATE - 2, 8, FALSE, 'Implementation and code review work for TSK-ERP-021', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000003fe', 'TSK-ERP-022', 1, 'Enhancement: Implement streaming PDF generation with WebAssembly font cache', 'Detailed technical description and specification for Enhancement: Implement streaming PDF generation with WebAssembly font cache',
        'TASK', '55555555-5555-5555-5555-555555555554', '66666666-6666-6666-6666-666666666661', 'MEDIUM',
        NULL, 'a0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003f9',
        'c0000000-0000-0000-0000-000000000001', 3, 'S', '2026-09-02 09:30:00+05:30', '2026-10-04 18:30:00+05:30',
        NULL, NULL,
        10, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003fe', '00000000-0000-0000-0000-000000000007', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003fe', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003fe', 'f0000000-0000-0000-0000-000000000001', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000003ff', 'TSK-ERP-023', 1, 'Support: Client request for custom chart of accounts mapping import', 'Detailed technical description and specification for Support: Client request for custom chart of accounts mapping import',
        'TASK', '55555555-5555-5555-5555-555555555556', '66666666-6666-6666-6666-666666666667', 'LOW',
        NULL, 'a0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003f9',
        'c0000000-0000-0000-0000-000000000001', 2, 'XS', '2026-09-03 09:30:00+05:30', '2026-10-06 18:30:00+05:30',
        '2026-09-03 09:30:00+05:30', '2026-10-06 18:30:00+05:30',
        6, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003ff', '00000000-0000-0000-0000-000000000011', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003ff', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000003ff', 'f0000000-0000-0000-0000-000000000001', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-0000000003ff', '00000000-0000-0000-0000-000000000011', CURRENT_DATE - 2, 6, FALSE, 'Implementation and code review work for TSK-ERP-023', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000400', 'TSK-ERP-024', 1, 'Training: Finance team demo on automated bank feed statement parsing', 'Detailed technical description and specification for Training: Finance team demo on automated bank feed statement parsing',
        'TASK', '55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666661', 'LOW',
        NULL, 'a0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003f9',
        'c0000000-0000-0000-0000-000000000001', 2, 'XS', '2026-09-04 09:30:00+05:30', '2026-10-08 18:30:00+05:30',
        NULL, NULL,
        4, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000400', '00000000-0000-0000-0000-000000000003', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000400', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000400', 'f0000000-0000-0000-0000-000000000001', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000401', 'TSK-ERP-025', 1, 'Epic: Multi-Currency Revaluation & Forex Gain/Loss Ledger', 'Detailed technical description and specification for Epic: Multi-Currency Revaluation & Forex Gain/Loss Ledger',
        'EPIC', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666661', 'HIGH',
        NULL, 'a0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', NULL,
        'c0000000-0000-0000-0000-000000000001', 13, 'XL', '2026-09-05 09:30:00+05:30', '2026-10-10 18:30:00+05:30',
        NULL, NULL,
        36, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000012', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000401', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000401', 'f0000000-0000-0000-0000-000000000001', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000402', 'TSK-ERP-026', 1, 'Daily automated RBI forex exchange rate feed sync cron job', 'Detailed technical description and specification for Daily automated RBI forex exchange rate feed sync cron job',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666667', 'LOW',
        NULL, 'a0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000401',
        'c0000000-0000-0000-0000-000000000001', 3, 'S', '2026-09-06 09:30:00+05:30', '2026-10-12 18:30:00+05:30',
        '2026-09-06 09:30:00+05:30', '2026-10-12 18:30:00+05:30',
        8, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000004', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000402', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000402', 'f0000000-0000-0000-0000-000000000001', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000004', CURRENT_DATE - 2, 8, FALSE, 'Implementation and code review work for TSK-ERP-026', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000403', 'TSK-ERP-027', 1, 'Unrealized forex gain/loss month-end journal ledger balancing', 'Detailed technical description and specification for Unrealized forex gain/loss month-end journal ledger balancing',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666662', 'HIGH',
        NULL, 'a0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000401',
        'c0000000-0000-0000-0000-000000000001', 5, 'M', '2026-09-07 09:30:00+05:30', '2026-10-14 18:30:00+05:30',
        '2026-09-07 09:30:00+05:30', NULL,
        18, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000403', '00000000-0000-0000-0000-000000000006', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000403', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000403', 'f0000000-0000-0000-0000-000000000001', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000403', '00000000-0000-0000-0000-000000000006', CURRENT_DATE - 2, 10, FALSE, 'Implementation and code review work for TSK-ERP-027', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000404', 'TSK-ERP-028', 1, 'Bug: Currency symbol missing in vendor statement header printout', 'Detailed technical description and specification for Bug: Currency symbol missing in vendor statement header printout',
        'TASK', '55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666667', 'LOW',
        NULL, 'a0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000401',
        'c0000000-0000-0000-0000-000000000001', 1, 'XS', '2026-09-08 09:30:00+05:30', '2026-10-16 18:30:00+05:30',
        '2026-09-08 09:30:00+05:30', '2026-10-16 18:30:00+05:30',
        2, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{"environment":"Staging","steps_to_reproduce":"1. Navigate to target module screen.\n2. Enter boundary test data.\n3. Click proceed and observe behavior.","expected_behavior":"Operation should complete with valid response without errors.","actual_behavior":"System displays error notification or unexpected validation output.","reproduction_frequency":"Always"}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000404', '00000000-0000-0000-0000-000000000005', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000404', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000404', 'f0000000-0000-0000-0000-000000000001', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000404', '00000000-0000-0000-0000-000000000005', CURRENT_DATE - 2, 2, FALSE, 'Implementation and code review work for TSK-ERP-028', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000405', 'TSK-ERP-029', 1, 'Enhancement: Dark mode toggle contrast adjustments across accounting grids', 'Detailed technical description and specification for Enhancement: Dark mode toggle contrast adjustments across accounting grids',
        'TASK', '55555555-5555-5555-5555-555555555554', '66666666-6666-6666-6666-666666666667', 'LOW',
        NULL, 'a0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000401',
        'c0000000-0000-0000-0000-000000000001', 2, 'XS', '2026-09-09 09:30:00+05:30', '2026-10-11 18:30:00+05:30',
        '2026-09-09 09:30:00+05:30', '2026-10-11 18:30:00+05:30',
        6, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000405', '00000000-0000-0000-0000-000000000008', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000405', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000405', 'f0000000-0000-0000-0000-000000000001', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000405', '00000000-0000-0000-0000-000000000008', CURRENT_DATE - 2, 6, FALSE, 'Implementation and code review work for TSK-ERP-029', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000406', 'TSK-ERP-030', 1, 'Issue: Memory leak in long-running background payroll batch calculation', 'Detailed technical description and specification for Issue: Memory leak in long-running background payroll batch calculation',
        'TASK', '55555555-5555-5555-5555-555555555553', '66666666-6666-6666-6666-666666666665', 'CRITICAL',
        NULL, 'a0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000401',
        'c0000000-0000-0000-0000-000000000001', 8, 'L', '2026-09-10 09:30:00+05:30', '2026-10-13 18:30:00+05:30',
        '2026-09-10 09:30:00+05:30', NULL,
        20, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000406', '00000000-0000-0000-0000-000000000005', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000406', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000406', 'f0000000-0000-0000-0000-000000000001', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000406', '00000000-0000-0000-0000-000000000005', CURRENT_DATE - 2, 12, FALSE, 'Implementation and code review work for TSK-ERP-030', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000407', 'TSK-ERP-031', 1, 'Profile Node.js V8 heap during 10,000 employee salary slip run', 'Detailed technical description and specification for Profile Node.js V8 heap during 10,000 employee salary slip run',
        'SUBTASK', '55555555-5555-5555-5555-555555555553', '66666666-6666-6666-6666-666666666665', 'HIGH',
        NULL, 'a0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000406',
        'c0000000-0000-0000-0000-000000000001', 3, 'S', '2026-09-11 09:30:00+05:30', '2026-10-15 18:30:00+05:30',
        '2026-09-11 09:30:00+05:30', NULL,
        8, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000407', '00000000-0000-0000-0000-000000000010', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000407', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000407', 'f0000000-0000-0000-0000-000000000001', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000407', '00000000-0000-0000-0000-000000000010', CURRENT_DATE - 2, 4, FALSE, 'Implementation and code review work for TSK-ERP-031', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000408', 'TSK-ERP-032', 1, 'Refactor payroll worker thread pool allocation', 'Detailed technical description and specification for Refactor payroll worker thread pool allocation',
        'SUBTASK', '55555555-5555-5555-5555-555555555553', '66666666-6666-6666-6666-666666666667', 'HIGH',
        NULL, 'a0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000406',
        'c0000000-0000-0000-0000-000000000001', 5, 'M', '2026-09-12 09:30:00+05:30', '2026-10-17 18:30:00+05:30',
        '2026-09-12 09:30:00+05:30', '2026-10-17 18:30:00+05:30',
        12, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000408', '00000000-0000-0000-0000-000000000004', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000408', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000408', 'f0000000-0000-0000-0000-000000000001', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000408', '00000000-0000-0000-0000-000000000004', CURRENT_DATE - 2, 12, FALSE, 'Implementation and code review work for TSK-ERP-032', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000409', 'TSK-ERP-033', 1, 'Support: Re-issue corrupted digital signature token for billing admin', 'Detailed technical description and specification for Support: Re-issue corrupted digital signature token for billing admin',
        'TASK', '55555555-5555-5555-5555-555555555556', '66666666-6666-6666-6666-666666666667', 'MEDIUM',
        NULL, 'a0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000401',
        'c0000000-0000-0000-0000-000000000001', 1, 'XS', '2026-09-13 09:30:00+05:30', '2026-10-19 18:30:00+05:30',
        '2026-09-13 09:30:00+05:30', '2026-10-19 18:30:00+05:30',
        2, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000409', '00000000-0000-0000-0000-000000000011', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000409', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000409', 'f0000000-0000-0000-0000-000000000001', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000409', '00000000-0000-0000-0000-000000000011', CURRENT_DATE - 2, 2, FALSE, 'Implementation and code review work for TSK-ERP-033', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000040a', 'TSK-ERP-034', 1, 'Training: Onboarding session for associate accounting team members', 'Detailed technical description and specification for Training: Onboarding session for associate accounting team members',
        'TASK', '55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666667', 'LOW',
        NULL, 'a0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000401',
        'c0000000-0000-0000-0000-000000000001', 2, 'XS', '2026-09-14 09:30:00+05:30', '2026-10-21 18:30:00+05:30',
        '2026-09-14 09:30:00+05:30', '2026-10-21 18:30:00+05:30',
        4, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000040a', '00000000-0000-0000-0000-000000000003', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-00000000040a', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000040a', 'f0000000-0000-0000-0000-000000000001', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000040a', '00000000-0000-0000-0000-000000000003', CURRENT_DATE - 2, 4, FALSE, 'Implementation and code review work for TSK-ERP-034', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000040b', 'TSK-ERP-035', 1, 'Enhancement: Bulk credit note upload via CSV with pre-validation modal', 'Detailed technical description and specification for Enhancement: Bulk credit note upload via CSV with pre-validation modal',
        'TASK', '55555555-5555-5555-5555-555555555554', '66666666-6666-6666-6666-666666666666', 'MEDIUM',
        NULL, 'a0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000401',
        'c0000000-0000-0000-0000-000000000001', 3, 'S', '2026-09-15 09:30:00+05:30', '2026-10-23 18:30:00+05:30',
        '2026-09-15 09:30:00+05:30', NULL,
        10, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000040b', '00000000-0000-0000-0000-000000000008', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-00000000040b', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000040b', 'f0000000-0000-0000-0000-000000000001', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000040c', 'TSK-FLT-001', 1, 'Epic: Real-time Telematics GPS & Sensor Stream Processing', 'Detailed technical description and specification for Epic: Real-time Telematics GPS & Sensor Stream Processing',
        'EPIC', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666662', 'CRITICAL',
        NULL, 'a0000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', NULL,
        'c0000000-0000-0000-0000-000000000003', 21, 'XL', '2026-09-01 09:30:00+05:30', '2026-10-03 18:30:00+05:30',
        '2026-09-01 09:30:00+05:30', NULL,
        60, FALSE, 0,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000040c', '00000000-0000-0000-0000-000000000009', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-00000000040c', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000040c', 'f0000000-0000-0000-0000-000000000003', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000040c', '00000000-0000-0000-0000-000000000009', CURRENT_DATE - 2, 36, FALSE, 'Implementation and code review work for TSK-FLT-001', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000040d', 'TSK-FLT-002', 1, 'High-throughput MQTT broker listener for 50,000 concurrent ping bursts', 'Detailed technical description and specification for High-throughput MQTT broker listener for 50,000 concurrent ping bursts',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666667', 'CRITICAL',
        NULL, 'a0000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-00000000040c',
        'c0000000-0000-0000-0000-000000000003', 8, 'L', '2026-09-02 09:30:00+05:30', '2026-10-05 18:30:00+05:30',
        '2026-09-02 09:30:00+05:30', '2026-10-05 18:30:00+05:30',
        24, FALSE, 0,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000040d', '00000000-0000-0000-0000-000000000012', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-00000000040d', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000040d', 'f0000000-0000-0000-0000-000000000003', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000040d', '00000000-0000-0000-0000-000000000012', CURRENT_DATE - 2, 24, FALSE, 'Implementation and code review work for TSK-FLT-002', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

      INSERT INTO task_comments (task_id, user_id, comment_text, is_internal_only, created_by)
      VALUES ('20000000-0000-0000-0000-00000000040d', '00000000-0000-0000-0000-000000000012', 'Status update: Technical solution implemented, unit tests passed, ready for verification on staging environment.', FALSE, v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000040e', 'TSK-FLT-003', 1, 'Geohash spatial indexing for sub-second fleet proximity search', 'Detailed technical description and specification for Geohash spatial indexing for sub-second fleet proximity search',
        'SUBTASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666667', 'HIGH',
        NULL, 'a0000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-00000000040d',
        'c0000000-0000-0000-0000-000000000003', 5, 'M', '2026-09-03 09:30:00+05:30', '2026-10-07 18:30:00+05:30',
        '2026-09-03 09:30:00+05:30', '2026-10-07 18:30:00+05:30',
        16, FALSE, 0,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000040e', '00000000-0000-0000-0000-000000000004', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-00000000040e', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000040e', 'f0000000-0000-0000-0000-000000000003', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000040e', '00000000-0000-0000-0000-000000000004', CURRENT_DATE - 2, 16, FALSE, 'Implementation and code review work for TSK-FLT-003', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000040f', 'TSK-FLT-004', 1, 'GPS dead-reckoning interpolation during tunnel and mountain transit', 'Detailed technical description and specification for GPS dead-reckoning interpolation during tunnel and mountain transit',
        'SUBTASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666665', 'MEDIUM',
        NULL, 'a0000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-00000000040d',
        'c0000000-0000-0000-0000-000000000003', 5, 'M', '2026-09-04 09:30:00+05:30', '2026-10-09 18:30:00+05:30',
        '2026-09-04 09:30:00+05:30', NULL,
        14, FALSE, 0,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000040f', '00000000-0000-0000-0000-000000000010', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-00000000040f', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000040f', 'f0000000-0000-0000-0000-000000000003', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000040f', '00000000-0000-0000-0000-000000000010', CURRENT_DATE - 2, 8, FALSE, 'Implementation and code review work for TSK-FLT-004', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000410', 'TSK-FLT-005', 1, 'Bug: Negative speed calculation when device clock drifts ahead of UTC', 'Detailed technical description and specification for Bug: Negative speed calculation when device clock drifts ahead of UTC',
        'TASK', '55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666665', 'HIGH',
        NULL, 'a0000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-00000000040c',
        'c0000000-0000-0000-0000-000000000003', 3, 'S', '2026-09-05 09:30:00+05:30', '2026-10-11 18:30:00+05:30',
        '2026-09-05 09:30:00+05:30', NULL,
        8, FALSE, 0,
        '11111111-1111-1111-1111-111111111113', '{"environment":"Staging","steps_to_reproduce":"1. Navigate to target module screen.\n2. Enter boundary test data.\n3. Click proceed and observe behavior.","expected_behavior":"Operation should complete with valid response without errors.","actual_behavior":"System displays error notification or unexpected validation output.","reproduction_frequency":"Always"}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000410', '00000000-0000-0000-0000-000000000005', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000410', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000410', 'f0000000-0000-0000-0000-000000000003', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000410', '00000000-0000-0000-0000-000000000005', CURRENT_DATE - 2, 4, FALSE, 'Implementation and code review work for TSK-FLT-005', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

      INSERT INTO task_comments (task_id, user_id, comment_text, is_internal_only, created_by)
      VALUES ('20000000-0000-0000-0000-000000000410', '00000000-0000-0000-0000-000000000005', 'Status update: Technical solution implemented, unit tests passed, ready for verification on staging environment.', FALSE, v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000411', 'TSK-FLT-006', 1, 'Verify NTP timestamp alignment on incoming sensor payloads', 'Detailed technical description and specification for Verify NTP timestamp alignment on incoming sensor payloads',
        'SUBTASK', '55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666667', 'MEDIUM',
        NULL, 'a0000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000410',
        'c0000000-0000-0000-0000-000000000003', 1, 'XS', '2026-09-06 09:30:00+05:30', '2026-10-13 18:30:00+05:30',
        '2026-09-06 09:30:00+05:30', '2026-10-13 18:30:00+05:30',
        3, FALSE, 0,
        '11111111-1111-1111-1111-111111111113', '{"environment":"Staging","steps_to_reproduce":"1. Navigate to target module screen.\n2. Enter boundary test data.\n3. Click proceed and observe behavior.","expected_behavior":"Operation should complete with valid response without errors.","actual_behavior":"System displays error notification or unexpected validation output.","reproduction_frequency":"Always"}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000411', '00000000-0000-0000-0000-000000000010', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000411', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000411', 'f0000000-0000-0000-0000-000000000003', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000411', '00000000-0000-0000-0000-000000000010', CURRENT_DATE - 2, 3, FALSE, 'Implementation and code review work for TSK-FLT-006', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000412', 'TSK-FLT-007', 1, 'Epic: Cold-Chain Reefer Temperature & Humidity Incident Monitor', 'Detailed technical description and specification for Epic: Cold-Chain Reefer Temperature & Humidity Incident Monitor',
        'EPIC', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666662', 'HIGH',
        NULL, 'a0000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', NULL,
        'c0000000-0000-0000-0000-000000000003', 13, 'XL', '2026-09-07 09:30:00+05:30', '2026-10-15 18:30:00+05:30',
        '2026-09-07 09:30:00+05:30', NULL,
        40, FALSE, 0,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000412', '00000000-0000-0000-0000-000000000009', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000412', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000412', 'f0000000-0000-0000-0000-000000000003', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000412', '00000000-0000-0000-0000-000000000009', CURRENT_DATE - 2, 24, FALSE, 'Implementation and code review work for TSK-FLT-007', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000413', 'TSK-FLT-008', 1, 'Threshold violation alert trigger within 30 seconds of temp surge', 'Detailed technical description and specification for Threshold violation alert trigger within 30 seconds of temp surge',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666663', 'CRITICAL',
        NULL, 'a0000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000412',
        'c0000000-0000-0000-0000-000000000003', 5, 'M', '2026-09-08 09:30:00+05:30', '2026-10-10 18:30:00+05:30',
        '2026-09-08 09:30:00+05:30', NULL,
        16, FALSE, 0,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000413', '00000000-0000-0000-0000-000000000012', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000413', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000413', 'f0000000-0000-0000-0000-000000000003', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000413', '00000000-0000-0000-0000-000000000012', CURRENT_DATE - 2, 9, FALSE, 'Implementation and code review work for TSK-FLT-008', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

      INSERT INTO task_comments (task_id, user_id, comment_text, is_internal_only, created_by)
      VALUES ('20000000-0000-0000-0000-000000000413', '00000000-0000-0000-0000-000000000012', 'Status update: Technical solution implemented, unit tests passed, ready for verification on staging environment.', FALSE, v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000414', 'TSK-FLT-009', 1, 'Automated SMS and voice escalation call to standby depot technician', 'Detailed technical description and specification for Automated SMS and voice escalation call to standby depot technician',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666664', 'HIGH',
        NULL, 'a0000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000412',
        'c0000000-0000-0000-0000-000000000003', 5, 'M', '2026-09-09 09:30:00+05:30', '2026-10-12 18:30:00+05:30',
        '2026-09-09 09:30:00+05:30', NULL,
        14, FALSE, 0,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000414', '00000000-0000-0000-0000-000000000005', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000414', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000414', 'f0000000-0000-0000-0000-000000000003', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000415', 'TSK-FLT-010', 1, 'Enhancement: Color-coded temperature trend line on driver dashboard', 'Detailed technical description and specification for Enhancement: Color-coded temperature trend line on driver dashboard',
        'TASK', '55555555-5555-5555-5555-555555555554', '66666666-6666-6666-6666-666666666667', 'MEDIUM',
        NULL, 'a0000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000412',
        'c0000000-0000-0000-0000-000000000003', 2, 'XS', '2026-09-10 09:30:00+05:30', '2026-10-14 18:30:00+05:30',
        '2026-09-10 09:30:00+05:30', '2026-10-14 18:30:00+05:30',
        6, FALSE, 0,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000415', '00000000-0000-0000-0000-000000000006', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000415', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000415', 'f0000000-0000-0000-0000-000000000003', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000415', '00000000-0000-0000-0000-000000000006', CURRENT_DATE - 2, 6, FALSE, 'Implementation and code review work for TSK-FLT-010', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000416', 'TSK-FLT-011', 1, 'Issue: Gateway timeout on large trip history telemetry queries', 'Detailed technical description and specification for Issue: Gateway timeout on large trip history telemetry queries',
        'TASK', '55555555-5555-5555-5555-555555555553', '66666666-6666-6666-6666-666666666667', 'HIGH',
        NULL, 'a0000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000412',
        'c0000000-0000-0000-0000-000000000003', 5, 'M', '2026-09-11 09:30:00+05:30', '2026-10-16 18:30:00+05:30',
        '2026-09-11 09:30:00+05:30', '2026-10-16 18:30:00+05:30',
        12, FALSE, 0,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000416', '00000000-0000-0000-0000-000000000007', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000416', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000416', 'f0000000-0000-0000-0000-000000000003', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000416', '00000000-0000-0000-0000-000000000007', CURRENT_DATE - 2, 12, FALSE, 'Implementation and code review work for TSK-FLT-011', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

      INSERT INTO task_comments (task_id, user_id, comment_text, is_internal_only, created_by)
      VALUES ('20000000-0000-0000-0000-000000000416', '00000000-0000-0000-0000-000000000007', 'Status update: Technical solution implemented, unit tests passed, ready for verification on staging environment.', FALSE, v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000417', 'TSK-FLT-012', 1, 'Support: Investigate false tamper alert trigger on Truck #GJ-01-AX-9901', 'Detailed technical description and specification for Support: Investigate false tamper alert trigger on Truck #GJ-01-AX-9901',
        'TASK', '55555555-5555-5555-5555-555555555556', '66666666-6666-6666-6666-666666666667', 'MEDIUM',
        NULL, 'a0000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000412',
        'c0000000-0000-0000-0000-000000000003', 2, 'XS', '2026-09-12 09:30:00+05:30', '2026-10-18 18:30:00+05:30',
        '2026-09-12 09:30:00+05:30', '2026-10-18 18:30:00+05:30',
        4, FALSE, 0,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000417', '00000000-0000-0000-0000-000000000011', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000417', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000417', 'f0000000-0000-0000-0000-000000000003', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000417', '00000000-0000-0000-0000-000000000011', CURRENT_DATE - 2, 4, FALSE, 'Implementation and code review work for TSK-FLT-012', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000418', 'TSK-FLT-013', 1, 'Training: Driver mobile application training for depot fleet managers', 'Detailed technical description and specification for Training: Driver mobile application training for depot fleet managers',
        'TASK', '55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666667', 'LOW',
        NULL, 'a0000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000412',
        'c0000000-0000-0000-0000-000000000003', 2, 'XS', '2026-09-13 09:30:00+05:30', '2026-10-20 18:30:00+05:30',
        '2026-09-13 09:30:00+05:30', '2026-10-20 18:30:00+05:30',
        4, FALSE, 0,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000418', '00000000-0000-0000-0000-000000000003', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000418', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000418', 'f0000000-0000-0000-0000-000000000003', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000418', '00000000-0000-0000-0000-000000000003', CURRENT_DATE - 2, 4, FALSE, 'Implementation and code review work for TSK-FLT-013', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000419', 'TSK-FLT-014', 1, 'Enhancement: Offline geofence caching inside Android driver app', 'Detailed technical description and specification for Enhancement: Offline geofence caching inside Android driver app',
        'TASK', '55555555-5555-5555-5555-555555555554', '66666666-6666-6666-6666-666666666662', 'HIGH',
        NULL, 'a0000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000412',
        'c0000000-0000-0000-0000-000000000003', 5, 'M', '2026-09-14 09:30:00+05:30', '2026-10-22 18:30:00+05:30',
        '2026-09-14 09:30:00+05:30', NULL,
        16, FALSE, 0,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000419', '00000000-0000-0000-0000-000000000012', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000419', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000419', 'f0000000-0000-0000-0000-000000000003', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000419', '00000000-0000-0000-0000-000000000012', CURRENT_DATE - 2, 9, FALSE, 'Implementation and code review work for TSK-FLT-014', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000041a', 'TSK-FLT-015', 1, 'Bug: Battery drain on driver phone during background GPS tracking', 'Detailed technical description and specification for Bug: Battery drain on driver phone during background GPS tracking',
        'TASK', '55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666664', 'HIGH',
        NULL, 'a0000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000412',
        'c0000000-0000-0000-0000-000000000003', 5, 'M', '2026-09-15 09:30:00+05:30', '2026-10-17 18:30:00+05:30',
        '2026-09-15 09:30:00+05:30', NULL,
        14, FALSE, 0,
        '11111111-1111-1111-1111-111111111113', '{"environment":"Staging","steps_to_reproduce":"1. Navigate to target module screen.\n2. Enter boundary test data.\n3. Click proceed and observe behavior.","expected_behavior":"Operation should complete with valid response without errors.","actual_behavior":"System displays error notification or unexpected validation output.","reproduction_frequency":"Always"}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000041a', '00000000-0000-0000-0000-000000000005', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-00000000041a', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000041a', 'f0000000-0000-0000-0000-000000000003', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000041b', 'TSK-FLT-016', 1, 'Tune Android FusedLocationProvider priority when vehicle is stationary', 'Detailed technical description and specification for Tune Android FusedLocationProvider priority when vehicle is stationary',
        'SUBTASK', '55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666664', 'MEDIUM',
        NULL, 'a0000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-00000000041a',
        'c0000000-0000-0000-0000-000000000003', 2, 'XS', '2026-09-16 09:30:00+05:30', '2026-10-19 18:30:00+05:30',
        '2026-09-16 09:30:00+05:30', NULL,
        6, FALSE, 0,
        '11111111-1111-1111-1111-111111111113', '{"environment":"Staging","steps_to_reproduce":"1. Navigate to target module screen.\n2. Enter boundary test data.\n3. Click proceed and observe behavior.","expected_behavior":"Operation should complete with valid response without errors.","actual_behavior":"System displays error notification or unexpected validation output.","reproduction_frequency":"Always"}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000041b', '00000000-0000-0000-0000-000000000010', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-00000000041b', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000041b', 'f0000000-0000-0000-0000-000000000003', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000041c', 'TSK-FLT-017', 1, 'Epic: AI Multi-Stop Dispatch & Dynamic Route Optimization', 'Detailed technical description and specification for Epic: AI Multi-Stop Dispatch & Dynamic Route Optimization',
        'EPIC', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666661', 'HIGH',
        NULL, 'a0000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', NULL,
        'c0000000-0000-0000-0000-000000000003', 21, 'XL', '2026-09-17 09:30:00+05:30', '2026-10-21 18:30:00+05:30',
        NULL, NULL,
        60, FALSE, 0,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000041c', '00000000-0000-0000-0000-000000000007', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-00000000041c', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000041c', 'f0000000-0000-0000-0000-000000000003', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000041d', 'TSK-FLT-018', 1, 'Dijkstra route matrix calculation incorporating live traffic density', 'Detailed technical description and specification for Dijkstra route matrix calculation incorporating live traffic density',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666661', 'HIGH',
        NULL, 'a0000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-00000000041c',
        'c0000000-0000-0000-0000-000000000003', 8, 'L', '2026-09-18 09:30:00+05:30', '2026-10-23 18:30:00+05:30',
        NULL, NULL,
        24, FALSE, 0,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000041d', '00000000-0000-0000-0000-000000000008', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-00000000041d', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000041d', 'f0000000-0000-0000-0000-000000000003', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000041e', 'TSK-FLT-019', 1, 'Consignment weight & volumetric capacity constraint solver', 'Detailed technical description and specification for Consignment weight & volumetric capacity constraint solver',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666661', 'MEDIUM',
        NULL, 'a0000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-00000000041c',
        'c0000000-0000-0000-0000-000000000003', 5, 'M', '2026-09-19 09:30:00+05:30', '2026-10-25 18:30:00+05:30',
        NULL, NULL,
        16, FALSE, 0,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000041e', '00000000-0000-0000-0000-000000000009', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-00000000041e', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000041e', 'f0000000-0000-0000-0000-000000000003', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000041f', 'TSK-FLT-020', 1, 'Bug: Route map polyline glitches across date-line boundaries', 'Detailed technical description and specification for Bug: Route map polyline glitches across date-line boundaries',
        'TASK', '55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666667', 'LOW',
        NULL, 'a0000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-00000000041c',
        'c0000000-0000-0000-0000-000000000003', 2, 'XS', '2026-09-20 09:30:00+05:30', '2026-10-27 18:30:00+05:30',
        '2026-09-20 09:30:00+05:30', '2026-10-27 18:30:00+05:30',
        4, FALSE, 0,
        '11111111-1111-1111-1111-111111111113', '{"environment":"Staging","steps_to_reproduce":"1. Navigate to target module screen.\n2. Enter boundary test data.\n3. Click proceed and observe behavior.","expected_behavior":"Operation should complete with valid response without errors.","actual_behavior":"System displays error notification or unexpected validation output.","reproduction_frequency":"Always"}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000041f', '00000000-0000-0000-0000-000000000010', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-00000000041f', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000041f', 'f0000000-0000-0000-0000-000000000003', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000041f', '00000000-0000-0000-0000-000000000010', CURRENT_DATE - 2, 4, FALSE, 'Implementation and code review work for TSK-FLT-020', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000420', 'TSK-FLT-021', 1, 'Issue: Cellular handover packet loss in remote coastal corridors', 'Detailed technical description and specification for Issue: Cellular handover packet loss in remote coastal corridors',
        'TASK', '55555555-5555-5555-5555-555555555553', '66666666-6666-6666-6666-666666666662', 'MEDIUM',
        NULL, 'a0000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-00000000041c',
        'c0000000-0000-0000-0000-000000000003', 3, 'S', '2026-09-01 09:30:00+05:30', '2026-10-09 18:30:00+05:30',
        '2026-09-01 09:30:00+05:30', NULL,
        10, FALSE, 0,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000420', '00000000-0000-0000-0000-000000000004', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000420', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000420', 'f0000000-0000-0000-0000-000000000003', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000420', '00000000-0000-0000-0000-000000000004', CURRENT_DATE - 2, 6, FALSE, 'Implementation and code review work for TSK-FLT-021', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000421', 'TSK-FLT-022', 1, 'Enhancement: Support OBD-II fuel consumption and harsh braking telemetry', 'Detailed technical description and specification for Enhancement: Support OBD-II fuel consumption and harsh braking telemetry',
        'TASK', '55555555-5555-5555-5555-555555555554', '66666666-6666-6666-6666-666666666661', 'MEDIUM',
        NULL, 'a0000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-00000000041c',
        'c0000000-0000-0000-0000-000000000003', 5, 'M', '2026-09-02 09:30:00+05:30', '2026-10-04 18:30:00+05:30',
        NULL, NULL,
        16, FALSE, 0,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000421', '00000000-0000-0000-0000-000000000006', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000421', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000421', 'f0000000-0000-0000-0000-000000000003', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000422', 'TSK-FLT-023', 1, 'Support: Replace faulty BLE temperature beacon for Pharma client', 'Detailed technical description and specification for Support: Replace faulty BLE temperature beacon for Pharma client',
        'TASK', '55555555-5555-5555-5555-555555555556', '66666666-6666-6666-6666-666666666667', 'LOW',
        NULL, 'a0000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-00000000041c',
        'c0000000-0000-0000-0000-000000000003', 1, 'XS', '2026-09-03 09:30:00+05:30', '2026-10-06 18:30:00+05:30',
        '2026-09-03 09:30:00+05:30', '2026-10-06 18:30:00+05:30',
        2, FALSE, 0,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000422', '00000000-0000-0000-0000-000000000011', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000422', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000422', 'f0000000-0000-0000-0000-000000000003', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000422', '00000000-0000-0000-0000-000000000011', CURRENT_DATE - 2, 2, FALSE, 'Implementation and code review work for TSK-FLT-023', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000423', 'TSK-FLT-024', 1, 'Training: Webinar on optimizing fleet fuel costs using driver scorecards', 'Detailed technical description and specification for Training: Webinar on optimizing fleet fuel costs using driver scorecards',
        'TASK', '55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666661', 'LOW',
        NULL, 'a0000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-00000000041c',
        'c0000000-0000-0000-0000-000000000003', 2, 'XS', '2026-09-04 09:30:00+05:30', '2026-10-08 18:30:00+05:30',
        NULL, NULL,
        4, FALSE, 0,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000423', '00000000-0000-0000-0000-000000000003', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000423', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000423', 'f0000000-0000-0000-0000-000000000003', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000424', 'TSK-FLT-025', 1, 'Epic: Automated Vehicle Maintenance & Preventive Health Radar', 'Detailed technical description and specification for Epic: Automated Vehicle Maintenance & Preventive Health Radar',
        'EPIC', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666661', 'MEDIUM',
        NULL, 'a0000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', NULL,
        'c0000000-0000-0000-0000-000000000003', 13, 'XL', '2026-09-05 09:30:00+05:30', '2026-10-10 18:30:00+05:30',
        NULL, NULL,
        36, FALSE, 0,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000424', '00000000-0000-0000-0000-000000000009', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000424', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000424', 'f0000000-0000-0000-0000-000000000003', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000425', 'TSK-FLT-026', 1, 'Odometer mileage trigger for scheduled engine oil & brake inspections', 'Detailed technical description and specification for Odometer mileage trigger for scheduled engine oil & brake inspections',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666667', 'LOW',
        NULL, 'a0000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000424',
        'c0000000-0000-0000-0000-000000000003', 3, 'S', '2026-09-06 09:30:00+05:30', '2026-10-12 18:30:00+05:30',
        '2026-09-06 09:30:00+05:30', '2026-10-12 18:30:00+05:30',
        8, FALSE, 0,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000425', '00000000-0000-0000-0000-000000000012', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000425', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000425', 'f0000000-0000-0000-0000-000000000003', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000425', '00000000-0000-0000-0000-000000000012', CURRENT_DATE - 2, 8, FALSE, 'Implementation and code review work for TSK-FLT-026', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000426', 'TSK-FLT-027', 1, 'Driver pre-trip inspection checklist with mandatory tire photo upload', 'Detailed technical description and specification for Driver pre-trip inspection checklist with mandatory tire photo upload',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666662', 'MEDIUM',
        NULL, 'a0000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000424',
        'c0000000-0000-0000-0000-000000000003', 5, 'M', '2026-09-07 09:30:00+05:30', '2026-10-14 18:30:00+05:30',
        '2026-09-07 09:30:00+05:30', NULL,
        14, FALSE, 0,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000426', '00000000-0000-0000-0000-000000000004', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000426', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000426', 'f0000000-0000-0000-0000-000000000003', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000426', '00000000-0000-0000-0000-000000000004', CURRENT_DATE - 2, 8, FALSE, 'Implementation and code review work for TSK-FLT-027', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000427', 'TSK-FLT-028', 1, 'Bug: Push notification fails to deliver when driver phone is in battery saver mode', 'Detailed technical description and specification for Bug: Push notification fails to deliver when driver phone is in battery saver mode',
        'TASK', '55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666667', 'HIGH',
        NULL, 'a0000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000424',
        'c0000000-0000-0000-0000-000000000003', 3, 'S', '2026-09-08 09:30:00+05:30', '2026-10-16 18:30:00+05:30',
        '2026-09-08 09:30:00+05:30', '2026-10-16 18:30:00+05:30',
        8, FALSE, 0,
        '11111111-1111-1111-1111-111111111113', '{"environment":"Staging","steps_to_reproduce":"1. Navigate to target module screen.\n2. Enter boundary test data.\n3. Click proceed and observe behavior.","expected_behavior":"Operation should complete with valid response without errors.","actual_behavior":"System displays error notification or unexpected validation output.","reproduction_frequency":"Always"}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000427', '00000000-0000-0000-0000-000000000010', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000427', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000427', 'f0000000-0000-0000-0000-000000000003', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000427', '00000000-0000-0000-0000-000000000010', CURRENT_DATE - 2, 8, FALSE, 'Implementation and code review work for TSK-FLT-028', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000428', 'TSK-FLT-029', 1, 'Enhancement: Fleet summary PDF export with fuel vs trip efficiency graphs', 'Detailed technical description and specification for Enhancement: Fleet summary PDF export with fuel vs trip efficiency graphs',
        'TASK', '55555555-5555-5555-5555-555555555554', '66666666-6666-6666-6666-666666666667', 'LOW',
        NULL, 'a0000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000424',
        'c0000000-0000-0000-0000-000000000003', 3, 'S', '2026-09-09 09:30:00+05:30', '2026-10-11 18:30:00+05:30',
        '2026-09-09 09:30:00+05:30', '2026-10-11 18:30:00+05:30',
        8, FALSE, 0,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000428', '00000000-0000-0000-0000-000000000007', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000428', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000428', 'f0000000-0000-0000-0000-000000000003', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000428', '00000000-0000-0000-0000-000000000007', CURRENT_DATE - 2, 8, FALSE, 'Implementation and code review work for TSK-FLT-029', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000429', 'TSK-FLT-030', 1, 'Issue: Redis cache memory peak during simultaneous morning 8 AM trip starts', 'Detailed technical description and specification for Issue: Redis cache memory peak during simultaneous morning 8 AM trip starts',
        'TASK', '55555555-5555-5555-5555-555555555553', '66666666-6666-6666-6666-666666666665', 'URGENT',
        NULL, 'a0000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000424',
        'c0000000-0000-0000-0000-000000000003', 8, 'L', '2026-09-10 09:30:00+05:30', '2026-10-13 18:30:00+05:30',
        '2026-09-10 09:30:00+05:30', NULL,
        18, FALSE, 0,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000429', '00000000-0000-0000-0000-000000000010', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000429', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000429', 'f0000000-0000-0000-0000-000000000003', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000429', '00000000-0000-0000-0000-000000000010', CURRENT_DATE - 2, 10, FALSE, 'Implementation and code review work for TSK-FLT-030', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000042a', 'TSK-FLT-031', 1, 'Partition Redis cluster keys by geographic cluster zone', 'Detailed technical description and specification for Partition Redis cluster keys by geographic cluster zone',
        'SUBTASK', '55555555-5555-5555-5555-555555555553', '66666666-6666-6666-6666-666666666665', 'HIGH',
        NULL, 'a0000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000429',
        'c0000000-0000-0000-0000-000000000003', 4, 'M', '2026-09-11 09:30:00+05:30', '2026-10-15 18:30:00+05:30',
        '2026-09-11 09:30:00+05:30', NULL,
        10, FALSE, 0,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000042a', '00000000-0000-0000-0000-000000000005', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-00000000042a', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000042a', 'f0000000-0000-0000-0000-000000000003', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000042a', '00000000-0000-0000-0000-000000000005', CURRENT_DATE - 2, 6, FALSE, 'Implementation and code review work for TSK-FLT-031', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000042b', 'TSK-FLT-032', 1, 'Implement sliding window rate limiting on client device pings', 'Detailed technical description and specification for Implement sliding window rate limiting on client device pings',
        'SUBTASK', '55555555-5555-5555-5555-555555555553', '66666666-6666-6666-6666-666666666667', 'MEDIUM',
        NULL, 'a0000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000429',
        'c0000000-0000-0000-0000-000000000003', 4, 'M', '2026-09-12 09:30:00+05:30', '2026-10-17 18:30:00+05:30',
        '2026-09-12 09:30:00+05:30', '2026-10-17 18:30:00+05:30',
        8, FALSE, 0,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000042b', '00000000-0000-0000-0000-000000000012', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-00000000042b', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000042b', 'f0000000-0000-0000-0000-000000000003', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000042b', '00000000-0000-0000-0000-000000000012', CURRENT_DATE - 2, 8, FALSE, 'Implementation and code review work for TSK-FLT-032', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000042c', 'TSK-FLT-033', 1, 'Support: Reset locked driver mobile login after 3 failed PIN attempts', 'Detailed technical description and specification for Support: Reset locked driver mobile login after 3 failed PIN attempts',
        'TASK', '55555555-5555-5555-5555-555555555556', '66666666-6666-6666-6666-666666666667', 'LOW',
        NULL, 'a0000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000424',
        'c0000000-0000-0000-0000-000000000003', 1, 'XS', '2026-09-13 09:30:00+05:30', '2026-10-19 18:30:00+05:30',
        '2026-09-13 09:30:00+05:30', '2026-10-19 18:30:00+05:30',
        2, FALSE, 0,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000042c', '00000000-0000-0000-0000-000000000011', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-00000000042c', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000042c', 'f0000000-0000-0000-0000-000000000003', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000042c', '00000000-0000-0000-0000-000000000011', CURRENT_DATE - 2, 2, FALSE, 'Implementation and code review work for TSK-FLT-033', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000042d', 'TSK-FLT-034', 1, 'Training: Hands-on session for logistics dispatchers on live vehicle replay', 'Detailed technical description and specification for Training: Hands-on session for logistics dispatchers on live vehicle replay',
        'TASK', '55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666667', 'LOW',
        NULL, 'a0000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000424',
        'c0000000-0000-0000-0000-000000000003', 2, 'XS', '2026-09-14 09:30:00+05:30', '2026-10-21 18:30:00+05:30',
        '2026-09-14 09:30:00+05:30', '2026-10-21 18:30:00+05:30',
        4, FALSE, 0,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000042d', '00000000-0000-0000-0000-000000000003', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-00000000042d', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000042d', 'f0000000-0000-0000-0000-000000000003', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000042d', '00000000-0000-0000-0000-000000000003', CURRENT_DATE - 2, 4, FALSE, 'Implementation and code review work for TSK-FLT-034', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000042e', 'TSK-FLT-035', 1, 'Enhancement: Quick-call SOS button in driver app with automated coordinates SMS', 'Detailed technical description and specification for Enhancement: Quick-call SOS button in driver app with automated coordinates SMS',
        'TASK', '55555555-5555-5555-5555-555555555554', '66666666-6666-6666-6666-666666666666', 'HIGH',
        NULL, 'a0000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000424',
        'c0000000-0000-0000-0000-000000000003', 3, 'S', '2026-09-15 09:30:00+05:30', '2026-10-23 18:30:00+05:30',
        '2026-09-15 09:30:00+05:30', NULL,
        8, FALSE, 0,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000042e', '00000000-0000-0000-0000-000000000007', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-00000000042e', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000042e', 'f0000000-0000-0000-0000-000000000003', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000042f', 'TSK-PAY-001', 1, 'Epic: High-Throughput UPI 2.0 & AutoPay Mandate Switch', 'Detailed technical description and specification for Epic: High-Throughput UPI 2.0 & AutoPay Mandate Switch',
        'EPIC', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666662', 'CRITICAL',
        NULL, 'a0000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', NULL,
        'c0000000-0000-0000-0000-000000000002', 21, 'XL', '2026-09-01 09:30:00+05:30', '2026-10-03 18:30:00+05:30',
        '2026-09-01 09:30:00+05:30', NULL,
        60, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000042f', '00000000-0000-0000-0000-000000000008', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-00000000042f', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000042f', 'f0000000-0000-0000-0000-000000000005', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000042f', '00000000-0000-0000-0000-000000000008', CURRENT_DATE - 2, 36, FALSE, 'Implementation and code review work for TSK-PAY-001', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000430', 'TSK-PAY-002', 1, 'UPI Intent flow deep-link generator for Android and iOS apps', 'Detailed technical description and specification for UPI Intent flow deep-link generator for Android and iOS apps',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666667', 'CRITICAL',
        NULL, 'a0000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-00000000042f',
        'c0000000-0000-0000-0000-000000000002', 8, 'L', '2026-09-02 09:30:00+05:30', '2026-10-05 18:30:00+05:30',
        '2026-09-02 09:30:00+05:30', '2026-10-05 18:30:00+05:30',
        22, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000430', '00000000-0000-0000-0000-000000000009', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000430', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000430', 'f0000000-0000-0000-0000-000000000005', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000430', '00000000-0000-0000-0000-000000000009', CURRENT_DATE - 2, 22, FALSE, 'Implementation and code review work for TSK-PAY-002', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

      INSERT INTO task_comments (task_id, user_id, comment_text, is_internal_only, created_by)
      VALUES ('20000000-0000-0000-0000-000000000430', '00000000-0000-0000-0000-000000000009', 'Status update: Technical solution implemented, unit tests passed, ready for verification on staging environment.', FALSE, v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000431', 'TSK-PAY-003', 1, 'Verify SHA-256 signature and checksum validation on bank callbacks', 'Detailed technical description and specification for Verify SHA-256 signature and checksum validation on bank callbacks',
        'SUBTASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666667', 'HIGH',
        NULL, 'a0000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000430',
        'c0000000-0000-0000-0000-000000000002', 3, 'S', '2026-09-03 09:30:00+05:30', '2026-10-07 18:30:00+05:30',
        '2026-09-03 09:30:00+05:30', '2026-10-07 18:30:00+05:30',
        10, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000431', '00000000-0000-0000-0000-000000000012', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000431', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000431', 'f0000000-0000-0000-0000-000000000005', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000431', '00000000-0000-0000-0000-000000000012', CURRENT_DATE - 2, 10, FALSE, 'Implementation and code review work for TSK-PAY-003', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000432', 'TSK-PAY-004', 1, 'Asynchronous webhook delivery dispatcher with exponential backoff', 'Detailed technical description and specification for Asynchronous webhook delivery dispatcher with exponential backoff',
        'SUBTASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666665', 'HIGH',
        NULL, 'a0000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000430',
        'c0000000-0000-0000-0000-000000000002', 5, 'M', '2026-09-04 09:30:00+05:30', '2026-10-09 18:30:00+05:30',
        '2026-09-04 09:30:00+05:30', NULL,
        14, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000432', '00000000-0000-0000-0000-000000000005', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000432', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000432', 'f0000000-0000-0000-0000-000000000005', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000432', '00000000-0000-0000-0000-000000000005', CURRENT_DATE - 2, 8, FALSE, 'Implementation and code review work for TSK-PAY-004', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000433', 'TSK-PAY-005', 1, 'Bug: Duplicate transaction record generated on rapid double-tap submit', 'Detailed technical description and specification for Bug: Duplicate transaction record generated on rapid double-tap submit',
        'TASK', '55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666665', 'CRITICAL',
        NULL, 'a0000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-00000000042f',
        'c0000000-0000-0000-0000-000000000002', 5, 'M', '2026-09-05 09:30:00+05:30', '2026-10-11 18:30:00+05:30',
        '2026-09-05 09:30:00+05:30', NULL,
        12, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{"environment":"Staging","steps_to_reproduce":"1. Navigate to target module screen.\n2. Enter boundary test data.\n3. Click proceed and observe behavior.","expected_behavior":"Operation should complete with valid response without errors.","actual_behavior":"System displays error notification or unexpected validation output.","reproduction_frequency":"Always"}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000433', '00000000-0000-0000-0000-000000000010', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000433', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000433', 'f0000000-0000-0000-0000-000000000005', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000433', '00000000-0000-0000-0000-000000000010', CURRENT_DATE - 2, 7, FALSE, 'Implementation and code review work for TSK-PAY-005', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

      INSERT INTO task_comments (task_id, user_id, comment_text, is_internal_only, created_by)
      VALUES ('20000000-0000-0000-0000-000000000433', '00000000-0000-0000-0000-000000000010', 'Status update: Technical solution implemented, unit tests passed, ready for verification on staging environment.', FALSE, v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000434', 'TSK-PAY-006', 1, 'Idempotency key enforcement on payment initiation header', 'Detailed technical description and specification for Idempotency key enforcement on payment initiation header',
        'SUBTASK', '55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666667', 'HIGH',
        NULL, 'a0000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000433',
        'c0000000-0000-0000-0000-000000000002', 2, 'XS', '2026-09-06 09:30:00+05:30', '2026-10-13 18:30:00+05:30',
        '2026-09-06 09:30:00+05:30', '2026-10-13 18:30:00+05:30',
        6, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{"environment":"Staging","steps_to_reproduce":"1. Navigate to target module screen.\n2. Enter boundary test data.\n3. Click proceed and observe behavior.","expected_behavior":"Operation should complete with valid response without errors.","actual_behavior":"System displays error notification or unexpected validation output.","reproduction_frequency":"Always"}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000434', '00000000-0000-0000-0000-000000000005', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000434', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000434', 'f0000000-0000-0000-0000-000000000005', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000434', '00000000-0000-0000-0000-000000000005', CURRENT_DATE - 2, 6, FALSE, 'Implementation and code review work for TSK-PAY-006', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000435', 'TSK-PAY-007', 1, 'Epic: PCI-DSS Compliant Card Vault & Tokenization Service', 'Detailed technical description and specification for Epic: PCI-DSS Compliant Card Vault & Tokenization Service',
        'EPIC', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666662', 'CRITICAL',
        NULL, 'a0000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', NULL,
        'c0000000-0000-0000-0000-000000000002', 13, 'XL', '2026-09-07 09:30:00+05:30', '2026-10-15 18:30:00+05:30',
        '2026-09-07 09:30:00+05:30', NULL,
        40, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000435', '00000000-0000-0000-0000-000000000008', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000435', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000435', 'f0000000-0000-0000-0000-000000000005', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000435', '00000000-0000-0000-0000-000000000008', CURRENT_DATE - 2, 24, FALSE, 'Implementation and code review work for TSK-PAY-007', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000436', 'TSK-PAY-008', 1, 'Hardware Security Module (HSM) key rotation and token generation API', 'Detailed technical description and specification for Hardware Security Module (HSM) key rotation and token generation API',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666663', 'CRITICAL',
        NULL, 'a0000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000435',
        'c0000000-0000-0000-0000-000000000002', 8, 'L', '2026-09-08 09:30:00+05:30', '2026-10-10 18:30:00+05:30',
        '2026-09-08 09:30:00+05:30', NULL,
        24, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000436', '00000000-0000-0000-0000-000000000009', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000436', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000436', 'f0000000-0000-0000-0000-000000000005', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000436', '00000000-0000-0000-0000-000000000009', CURRENT_DATE - 2, 14, FALSE, 'Implementation and code review work for TSK-PAY-008', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

      INSERT INTO task_comments (task_id, user_id, comment_text, is_internal_only, created_by)
      VALUES ('20000000-0000-0000-0000-000000000436', '00000000-0000-0000-0000-000000000009', 'Status update: Technical solution implemented, unit tests passed, ready for verification on staging environment.', FALSE, v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000437', 'TSK-PAY-009', 1, 'Network tokenization integration with Visa and Mastercard rails', 'Detailed technical description and specification for Network tokenization integration with Visa and Mastercard rails',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666664', 'HIGH',
        NULL, 'a0000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000435',
        'c0000000-0000-0000-0000-000000000002', 5, 'M', '2026-09-09 09:30:00+05:30', '2026-10-12 18:30:00+05:30',
        '2026-09-09 09:30:00+05:30', NULL,
        16, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000437', '00000000-0000-0000-0000-000000000010', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000437', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000437', 'f0000000-0000-0000-0000-000000000005', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000438', 'TSK-PAY-010', 1, 'Enhancement: Card brand auto-detection with custom SVG badge display', 'Detailed technical description and specification for Enhancement: Card brand auto-detection with custom SVG badge display',
        'TASK', '55555555-5555-5555-5555-555555555554', '66666666-6666-6666-6666-666666666667', 'LOW',
        NULL, 'a0000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000435',
        'c0000000-0000-0000-0000-000000000002', 2, 'XS', '2026-09-10 09:30:00+05:30', '2026-10-14 18:30:00+05:30',
        '2026-09-10 09:30:00+05:30', '2026-10-14 18:30:00+05:30',
        4, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000438', '00000000-0000-0000-0000-000000000004', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000438', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000438', 'f0000000-0000-0000-0000-000000000005', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000438', '00000000-0000-0000-0000-000000000004', CURRENT_DATE - 2, 4, FALSE, 'Implementation and code review work for TSK-PAY-010', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000439', 'TSK-PAY-011', 1, 'Issue: Transaction timeout during peak 12 PM flash sales', 'Detailed technical description and specification for Issue: Transaction timeout during peak 12 PM flash sales',
        'TASK', '55555555-5555-5555-5555-555555555553', '66666666-6666-6666-6666-666666666667', 'CRITICAL',
        NULL, 'a0000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000435',
        'c0000000-0000-0000-0000-000000000002', 8, 'L', '2026-09-11 09:30:00+05:30', '2026-10-16 18:30:00+05:30',
        '2026-09-11 09:30:00+05:30', '2026-10-16 18:30:00+05:30',
        18, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000439', '00000000-0000-0000-0000-000000000006', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000439', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000439', 'f0000000-0000-0000-0000-000000000005', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000439', '00000000-0000-0000-0000-000000000006', CURRENT_DATE - 2, 18, FALSE, 'Implementation and code review work for TSK-PAY-011', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

      INSERT INTO task_comments (task_id, user_id, comment_text, is_internal_only, created_by)
      VALUES ('20000000-0000-0000-0000-000000000439', '00000000-0000-0000-0000-000000000006', 'Status update: Technical solution implemented, unit tests passed, ready for verification on staging environment.', FALSE, v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000043a', 'TSK-PAY-012', 1, 'Support: Manual settlement adjustment for disputed chargeback #CB-88912', 'Detailed technical description and specification for Support: Manual settlement adjustment for disputed chargeback #CB-88912',
        'TASK', '55555555-5555-5555-5555-555555555556', '66666666-6666-6666-6666-666666666667', 'HIGH',
        NULL, 'a0000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000435',
        'c0000000-0000-0000-0000-000000000002', 2, 'XS', '2026-09-12 09:30:00+05:30', '2026-10-18 18:30:00+05:30',
        '2026-09-12 09:30:00+05:30', '2026-10-18 18:30:00+05:30',
        6, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000043a', '00000000-0000-0000-0000-000000000011', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-00000000043a', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000043a', 'f0000000-0000-0000-0000-000000000005', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000043a', '00000000-0000-0000-0000-000000000011', CURRENT_DATE - 2, 6, FALSE, 'Implementation and code review work for TSK-PAY-012', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000043b', 'TSK-PAY-013', 1, 'Training: Merchant developer workshop on integrating PayPulse JS SDK', 'Detailed technical description and specification for Training: Merchant developer workshop on integrating PayPulse JS SDK',
        'TASK', '55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666667', 'MEDIUM',
        NULL, 'a0000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000435',
        'c0000000-0000-0000-0000-000000000002', 2, 'XS', '2026-09-13 09:30:00+05:30', '2026-10-20 18:30:00+05:30',
        '2026-09-13 09:30:00+05:30', '2026-10-20 18:30:00+05:30',
        4, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000043b', '00000000-0000-0000-0000-000000000003', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-00000000043b', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000043b', 'f0000000-0000-0000-0000-000000000005', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000043b', '00000000-0000-0000-0000-000000000003', CURRENT_DATE - 2, 4, FALSE, 'Implementation and code review work for TSK-PAY-013', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000043c', 'TSK-PAY-014', 1, 'Enhancement: Smart dynamic routing based on real-time bank success rates', 'Detailed technical description and specification for Enhancement: Smart dynamic routing based on real-time bank success rates',
        'TASK', '55555555-5555-5555-5555-555555555554', '66666666-6666-6666-6666-666666666662', 'HIGH',
        NULL, 'a0000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000435',
        'c0000000-0000-0000-0000-000000000002', 5, 'M', '2026-09-14 09:30:00+05:30', '2026-10-22 18:30:00+05:30',
        '2026-09-14 09:30:00+05:30', NULL,
        16, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000043c', '00000000-0000-0000-0000-000000000009', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-00000000043c', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000043c', 'f0000000-0000-0000-0000-000000000005', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000043c', '00000000-0000-0000-0000-000000000009', CURRENT_DATE - 2, 9, FALSE, 'Implementation and code review work for TSK-PAY-014', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000043d', 'TSK-PAY-015', 1, 'Bug: Instant refund amount deduction failure when bank API returns 504', 'Detailed technical description and specification for Bug: Instant refund amount deduction failure when bank API returns 504',
        'TASK', '55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666664', 'HIGH',
        NULL, 'a0000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000435',
        'c0000000-0000-0000-0000-000000000002', 5, 'M', '2026-09-15 09:30:00+05:30', '2026-10-17 18:30:00+05:30',
        '2026-09-15 09:30:00+05:30', NULL,
        12, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{"environment":"Staging","steps_to_reproduce":"1. Navigate to target module screen.\n2. Enter boundary test data.\n3. Click proceed and observe behavior.","expected_behavior":"Operation should complete with valid response without errors.","actual_behavior":"System displays error notification or unexpected validation output.","reproduction_frequency":"Always"}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000043d', '00000000-0000-0000-0000-000000000010', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-00000000043d', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000043d', 'f0000000-0000-0000-0000-000000000005', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000043e', 'TSK-PAY-016', 1, 'Implement compensating reconciliation transaction for pending refunds', 'Detailed technical description and specification for Implement compensating reconciliation transaction for pending refunds',
        'SUBTASK', '55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666664', 'MEDIUM',
        NULL, 'a0000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-00000000043d',
        'c0000000-0000-0000-0000-000000000002', 2, 'XS', '2026-09-16 09:30:00+05:30', '2026-10-19 18:30:00+05:30',
        '2026-09-16 09:30:00+05:30', NULL,
        6, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{"environment":"Staging","steps_to_reproduce":"1. Navigate to target module screen.\n2. Enter boundary test data.\n3. Click proceed and observe behavior.","expected_behavior":"Operation should complete with valid response without errors.","actual_behavior":"System displays error notification or unexpected validation output.","reproduction_frequency":"Always"}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000043e', '00000000-0000-0000-0000-000000000005', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-00000000043e', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000043e', 'f0000000-0000-0000-0000-000000000005', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000043f', 'TSK-PAY-017', 1, 'Epic: Automated Merchant Settlement & T+1 Escrow Ledger', 'Detailed technical description and specification for Epic: Automated Merchant Settlement & T+1 Escrow Ledger',
        'EPIC', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666661', 'HIGH',
        NULL, 'a0000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', NULL,
        'c0000000-0000-0000-0000-000000000002', 13, 'XL', '2026-09-17 09:30:00+05:30', '2026-10-21 18:30:00+05:30',
        NULL, NULL,
        36, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000043f', '00000000-0000-0000-0000-000000000006', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-00000000043f', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000043f', 'f0000000-0000-0000-0000-000000000005', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000440', 'TSK-PAY-018', 1, 'Daily automated NEFT/RTGS batch payout generation at 23:00 UTC', 'Detailed technical description and specification for Daily automated NEFT/RTGS batch payout generation at 23:00 UTC',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666661', 'HIGH',
        NULL, 'a0000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-00000000043f',
        'c0000000-0000-0000-0000-000000000002', 5, 'M', '2026-09-18 09:30:00+05:30', '2026-10-23 18:30:00+05:30',
        NULL, NULL,
        16, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000440', '00000000-0000-0000-0000-000000000007', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000440', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000440', 'f0000000-0000-0000-0000-000000000005', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000441', 'TSK-PAY-019', 1, 'MDR fee and GST automatic deduction ledger entries per transaction', 'Detailed technical description and specification for MDR fee and GST automatic deduction ledger entries per transaction',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666661', 'MEDIUM',
        NULL, 'a0000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-00000000043f',
        'c0000000-0000-0000-0000-000000000002', 5, 'M', '2026-09-19 09:30:00+05:30', '2026-10-25 18:30:00+05:30',
        NULL, NULL,
        14, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000441', '00000000-0000-0000-0000-000000000008', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000441', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000441', 'f0000000-0000-0000-0000-000000000005', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000442', 'TSK-PAY-020', 1, 'Bug: Merchant payout summary email showing blank attachment on Outlook', 'Detailed technical description and specification for Bug: Merchant payout summary email showing blank attachment on Outlook',
        'TASK', '55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666667', 'LOW',
        NULL, 'a0000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-00000000043f',
        'c0000000-0000-0000-0000-000000000002', 1, 'XS', '2026-09-20 09:30:00+05:30', '2026-10-27 18:30:00+05:30',
        '2026-09-20 09:30:00+05:30', '2026-10-27 18:30:00+05:30',
        3, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{"environment":"Staging","steps_to_reproduce":"1. Navigate to target module screen.\n2. Enter boundary test data.\n3. Click proceed and observe behavior.","expected_behavior":"Operation should complete with valid response without errors.","actual_behavior":"System displays error notification or unexpected validation output.","reproduction_frequency":"Always"}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000442', '00000000-0000-0000-0000-000000000005', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000442', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000442', 'f0000000-0000-0000-0000-000000000005', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000442', '00000000-0000-0000-0000-000000000005', CURRENT_DATE - 2, 3, FALSE, 'Implementation and code review work for TSK-PAY-020', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000443', 'TSK-PAY-021', 1, 'Issue: Kafka partition lag under 2,000 TPS payment status spikes', 'Detailed technical description and specification for Issue: Kafka partition lag under 2,000 TPS payment status spikes',
        'TASK', '55555555-5555-5555-5555-555555555553', '66666666-6666-6666-6666-666666666662', 'HIGH',
        NULL, 'a0000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-00000000043f',
        'c0000000-0000-0000-0000-000000000002', 5, 'M', '2026-09-01 09:30:00+05:30', '2026-10-09 18:30:00+05:30',
        '2026-09-01 09:30:00+05:30', NULL,
        14, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000443', '00000000-0000-0000-0000-000000000012', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000443', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000443', 'f0000000-0000-0000-0000-000000000005', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000443', '00000000-0000-0000-0000-000000000012', CURRENT_DATE - 2, 8, FALSE, 'Implementation and code review work for TSK-PAY-021', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000444', 'TSK-PAY-022', 1, 'Enhancement: Merchant webhook test simulator tool in developer portal', 'Detailed technical description and specification for Enhancement: Merchant webhook test simulator tool in developer portal',
        'TASK', '55555555-5555-5555-5555-555555555554', '66666666-6666-6666-6666-666666666661', 'MEDIUM',
        NULL, 'a0000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-00000000043f',
        'c0000000-0000-0000-0000-000000000002', 3, 'S', '2026-09-02 09:30:00+05:30', '2026-10-04 18:30:00+05:30',
        NULL, NULL,
        10, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000444', '00000000-0000-0000-0000-000000000004', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000444', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000444', 'f0000000-0000-0000-0000-000000000005', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000445', 'TSK-PAY-023', 1, 'Support: KYC document re-verification for newly onboarded enterprise vendor', 'Detailed technical description and specification for Support: KYC document re-verification for newly onboarded enterprise vendor',
        'TASK', '55555555-5555-5555-5555-555555555556', '66666666-6666-6666-6666-666666666667', 'LOW',
        NULL, 'a0000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-00000000043f',
        'c0000000-0000-0000-0000-000000000002', 1, 'XS', '2026-09-03 09:30:00+05:30', '2026-10-06 18:30:00+05:30',
        '2026-09-03 09:30:00+05:30', '2026-10-06 18:30:00+05:30',
        2, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000445', '00000000-0000-0000-0000-000000000011', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000445', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000445', 'f0000000-0000-0000-0000-000000000005', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000445', '00000000-0000-0000-0000-000000000011', CURRENT_DATE - 2, 2, FALSE, 'Implementation and code review work for TSK-PAY-023', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000446', 'TSK-PAY-024', 1, 'Training: Customer care session on reading payment trace timelines', 'Detailed technical description and specification for Training: Customer care session on reading payment trace timelines',
        'TASK', '55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666661', 'LOW',
        NULL, 'a0000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-00000000043f',
        'c0000000-0000-0000-0000-000000000002', 2, 'XS', '2026-09-04 09:30:00+05:30', '2026-10-08 18:30:00+05:30',
        NULL, NULL,
        4, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000446', '00000000-0000-0000-0000-000000000003', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000446', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000446', 'f0000000-0000-0000-0000-000000000005', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000447', 'TSK-PAY-025', 1, 'Epic: Fraud Detection & Risk Scoring Rule Engine', 'Detailed technical description and specification for Epic: Fraud Detection & Risk Scoring Rule Engine',
        'EPIC', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666661', 'HIGH',
        NULL, 'a0000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', NULL,
        'c0000000-0000-0000-0000-000000000002', 21, 'XL', '2026-09-05 09:30:00+05:30', '2026-10-10 18:30:00+05:30',
        NULL, NULL,
        50, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000447', '00000000-0000-0000-0000-000000000008', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000447', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000447', 'f0000000-0000-0000-0000-000000000005', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000448', 'TSK-PAY-026', 1, 'Velocity rule checking: More than 3 failed attempts in 10 minutes', 'Detailed technical description and specification for Velocity rule checking: More than 3 failed attempts in 10 minutes',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666667', 'HIGH',
        NULL, 'a0000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000447',
        'c0000000-0000-0000-0000-000000000002', 3, 'S', '2026-09-06 09:30:00+05:30', '2026-10-12 18:30:00+05:30',
        '2026-09-06 09:30:00+05:30', '2026-10-12 18:30:00+05:30',
        10, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000448', '00000000-0000-0000-0000-000000000009', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000448', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000448', 'f0000000-0000-0000-0000-000000000005', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000448', '00000000-0000-0000-0000-000000000009', CURRENT_DATE - 2, 10, FALSE, 'Implementation and code review work for TSK-PAY-026', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000449', 'TSK-PAY-027', 1, 'GeoIP mismatch scoring against issued credit card country code', 'Detailed technical description and specification for GeoIP mismatch scoring against issued credit card country code',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666662', 'MEDIUM',
        NULL, 'a0000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000447',
        'c0000000-0000-0000-0000-000000000002', 5, 'M', '2026-09-07 09:30:00+05:30', '2026-10-14 18:30:00+05:30',
        '2026-09-07 09:30:00+05:30', NULL,
        14, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000449', '00000000-0000-0000-0000-000000000012', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000449', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000449', 'f0000000-0000-0000-0000-000000000005', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000449', '00000000-0000-0000-0000-000000000012', CURRENT_DATE - 2, 8, FALSE, 'Implementation and code review work for TSK-PAY-027', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000044a', 'TSK-PAY-028', 1, 'Bug: Decimal rounding error in 3-decimal crypto conversion rate', 'Detailed technical description and specification for Bug: Decimal rounding error in 3-decimal crypto conversion rate',
        'TASK', '55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666667', 'LOW',
        NULL, 'a0000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000447',
        'c0000000-0000-0000-0000-000000000002', 2, 'XS', '2026-09-08 09:30:00+05:30', '2026-10-16 18:30:00+05:30',
        '2026-09-08 09:30:00+05:30', '2026-10-16 18:30:00+05:30',
        4, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{"environment":"Staging","steps_to_reproduce":"1. Navigate to target module screen.\n2. Enter boundary test data.\n3. Click proceed and observe behavior.","expected_behavior":"Operation should complete with valid response without errors.","actual_behavior":"System displays error notification or unexpected validation output.","reproduction_frequency":"Always"}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000044a', '00000000-0000-0000-0000-000000000005', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-00000000044a', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000044a', 'f0000000-0000-0000-0000-000000000005', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000044a', '00000000-0000-0000-0000-000000000005', CURRENT_DATE - 2, 4, FALSE, 'Implementation and code review work for TSK-PAY-028', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000044b', 'TSK-PAY-029', 1, 'Enhancement: Export merchant monthly transaction audit log in signed PDF', 'Detailed technical description and specification for Enhancement: Export merchant monthly transaction audit log in signed PDF',
        'TASK', '55555555-5555-5555-5555-555555555554', '66666666-6666-6666-6666-666666666667', 'LOW',
        NULL, 'a0000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000447',
        'c0000000-0000-0000-0000-000000000002', 2, 'XS', '2026-09-09 09:30:00+05:30', '2026-10-11 18:30:00+05:30',
        '2026-09-09 09:30:00+05:30', '2026-10-11 18:30:00+05:30',
        6, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000044b', '00000000-0000-0000-0000-000000000006', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-00000000044b', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000044b', 'f0000000-0000-0000-0000-000000000005', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000044b', '00000000-0000-0000-0000-000000000006', CURRENT_DATE - 2, 6, FALSE, 'Implementation and code review work for TSK-PAY-029', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000044c', 'TSK-PAY-030', 1, 'Issue: PostgreSQL connection pool exhaustion during flash payment spikes', 'Detailed technical description and specification for Issue: PostgreSQL connection pool exhaustion during flash payment spikes',
        'TASK', '55555555-5555-5555-5555-555555555553', '66666666-6666-6666-6666-666666666665', 'CRITICAL',
        NULL, 'a0000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000447',
        'c0000000-0000-0000-0000-000000000002', 8, 'L', '2026-09-10 09:30:00+05:30', '2026-10-13 18:30:00+05:30',
        '2026-09-10 09:30:00+05:30', NULL,
        20, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000044c', '00000000-0000-0000-0000-000000000005', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-00000000044c', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000044c', 'f0000000-0000-0000-0000-000000000005', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000044c', '00000000-0000-0000-0000-000000000005', CURRENT_DATE - 2, 12, FALSE, 'Implementation and code review work for TSK-PAY-030', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000044d', 'TSK-PAY-031', 1, 'Deploy PgBouncer transaction-mode pooler with 10,000 client max', 'Detailed technical description and specification for Deploy PgBouncer transaction-mode pooler with 10,000 client max',
        'SUBTASK', '55555555-5555-5555-5555-555555555553', '66666666-6666-6666-6666-666666666665', 'CRITICAL',
        NULL, 'a0000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-00000000044c',
        'c0000000-0000-0000-0000-000000000002', 5, 'M', '2026-09-11 09:30:00+05:30', '2026-10-15 18:30:00+05:30',
        '2026-09-11 09:30:00+05:30', NULL,
        12, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000044d', '00000000-0000-0000-0000-000000000010', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-00000000044d', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000044d', 'f0000000-0000-0000-0000-000000000005', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000044d', '00000000-0000-0000-0000-000000000010', CURRENT_DATE - 2, 7, FALSE, 'Implementation and code review work for TSK-PAY-031', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000044e', 'TSK-PAY-032', 1, 'Tune database max_connections and shared_buffers settings', 'Detailed technical description and specification for Tune database max_connections and shared_buffers settings',
        'SUBTASK', '55555555-5555-5555-5555-555555555553', '66666666-6666-6666-6666-666666666667', 'HIGH',
        NULL, 'a0000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-00000000044c',
        'c0000000-0000-0000-0000-000000000002', 3, 'S', '2026-09-12 09:30:00+05:30', '2026-10-17 18:30:00+05:30',
        '2026-09-12 09:30:00+05:30', '2026-10-17 18:30:00+05:30',
        8, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000044e', '00000000-0000-0000-0000-000000000009', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-00000000044e', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000044e', 'f0000000-0000-0000-0000-000000000005', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000044e', '00000000-0000-0000-0000-000000000009', CURRENT_DATE - 2, 8, FALSE, 'Implementation and code review work for TSK-PAY-032', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000044f', 'TSK-PAY-033', 1, 'Support: Assist merchant with generating production API secret credentials', 'Detailed technical description and specification for Support: Assist merchant with generating production API secret credentials',
        'TASK', '55555555-5555-5555-5555-555555555556', '66666666-6666-6666-6666-666666666667', 'LOW',
        NULL, 'a0000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000447',
        'c0000000-0000-0000-0000-000000000002', 1, 'XS', '2026-09-13 09:30:00+05:30', '2026-10-19 18:30:00+05:30',
        '2026-09-13 09:30:00+05:30', '2026-10-19 18:30:00+05:30',
        2, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000044f', '00000000-0000-0000-0000-000000000011', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-00000000044f', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000044f', 'f0000000-0000-0000-0000-000000000005', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000044f', '00000000-0000-0000-0000-000000000011', CURRENT_DATE - 2, 2, FALSE, 'Implementation and code review work for TSK-PAY-033', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000450', 'TSK-PAY-034', 1, 'Training: Compliance training on RBI guidelines for digital token storage', 'Detailed technical description and specification for Training: Compliance training on RBI guidelines for digital token storage',
        'TASK', '55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666667', 'LOW',
        NULL, 'a0000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000447',
        'c0000000-0000-0000-0000-000000000002', 2, 'XS', '2026-09-14 09:30:00+05:30', '2026-10-21 18:30:00+05:30',
        '2026-09-14 09:30:00+05:30', '2026-10-21 18:30:00+05:30',
        4, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000450', '00000000-0000-0000-0000-000000000003', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000450', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000450', 'f0000000-0000-0000-0000-000000000005', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000450', '00000000-0000-0000-0000-000000000003', CURRENT_DATE - 2, 4, FALSE, 'Implementation and code review work for TSK-PAY-034', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000451', 'TSK-PAY-035', 1, 'Enhancement: Apple Pay and Google Pay one-tap native mobile sheets', 'Detailed technical description and specification for Enhancement: Apple Pay and Google Pay one-tap native mobile sheets',
        'TASK', '55555555-5555-5555-5555-555555555554', '66666666-6666-6666-6666-666666666666', 'HIGH',
        NULL, 'a0000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000447',
        'c0000000-0000-0000-0000-000000000002', 5, 'M', '2026-09-15 09:30:00+05:30', '2026-10-23 18:30:00+05:30',
        '2026-09-15 09:30:00+05:30', NULL,
        16, FALSE, 0,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000451', '00000000-0000-0000-0000-000000000006', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000451', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000451', 'f0000000-0000-0000-0000-000000000005', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000452', 'TSK-ACM-001', 1, 'Epic: Acme Neo-Bank Mobile Core Architecture & Secure Enclave', 'Detailed technical description and specification for Epic: Acme Neo-Bank Mobile Core Architecture & Secure Enclave',
        'EPIC', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666662', 'CRITICAL',
        'b0000000-0000-0000-0000-000000000001', NULL,
        '10000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', NULL,
        'c0000000-0000-0000-0000-000000000002', 21, 'XL', '2026-09-01 09:30:00+05:30', '2026-10-03 18:30:00+05:30',
        '2026-09-01 09:30:00+05:30', NULL,
        60, TRUE, 90000,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000452', '00000000-0000-0000-0000-000000000007', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000452', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000452', 'f0000000-0000-0000-0000-000000000007', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000452', '00000000-0000-0000-0000-000000000007', CURRENT_DATE - 2, 36, TRUE, 'Implementation and code review work for TSK-ACM-001', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000453', 'TSK-ACM-002', 1, 'Biometric authentication integration with FaceID and TouchID', 'Detailed technical description and specification for Biometric authentication integration with FaceID and TouchID',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666667', 'CRITICAL',
        'b0000000-0000-0000-0000-000000000001', NULL,
        '10000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000452',
        'c0000000-0000-0000-0000-000000000002', 5, 'M', '2026-09-02 09:30:00+05:30', '2026-10-05 18:30:00+05:30',
        '2026-09-02 09:30:00+05:30', '2026-10-05 18:30:00+05:30',
        16, TRUE, 24000,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000453', '00000000-0000-0000-0000-000000000008', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000453', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000453', 'f0000000-0000-0000-0000-000000000007', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000453', '00000000-0000-0000-0000-000000000008', CURRENT_DATE - 2, 16, TRUE, 'Implementation and code review work for TSK-ACM-002', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

      INSERT INTO task_comments (task_id, user_id, comment_text, is_internal_only, created_by)
      VALUES ('20000000-0000-0000-0000-000000000453', '00000000-0000-0000-0000-000000000008', 'Status update: Technical solution implemented, unit tests passed, ready for verification on staging environment.', FALSE, v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000454', 'TSK-ACM-003', 1, 'Secure Enclave AES-GCM hardware-backed key storage bridge', 'Detailed technical description and specification for Secure Enclave AES-GCM hardware-backed key storage bridge',
        'SUBTASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666667', 'HIGH',
        'b0000000-0000-0000-0000-000000000001', NULL,
        '10000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000453',
        'c0000000-0000-0000-0000-000000000002', 5, 'M', '2026-09-03 09:30:00+05:30', '2026-10-07 18:30:00+05:30',
        '2026-09-03 09:30:00+05:30', '2026-10-07 18:30:00+05:30',
        14, TRUE, 21000,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000454', '00000000-0000-0000-0000-000000000009', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000454', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000454', 'f0000000-0000-0000-0000-000000000007', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000454', '00000000-0000-0000-0000-000000000009', CURRENT_DATE - 2, 14, TRUE, 'Implementation and code review work for TSK-ACM-003', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000455', 'TSK-ACM-004', 1, 'Jailbreak and root detection enforcement with instant app lockdown', 'Detailed technical description and specification for Jailbreak and root detection enforcement with instant app lockdown',
        'SUBTASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666665', 'HIGH',
        'b0000000-0000-0000-0000-000000000001', NULL,
        '10000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000453',
        'c0000000-0000-0000-0000-000000000002', 3, 'S', '2026-09-04 09:30:00+05:30', '2026-10-09 18:30:00+05:30',
        '2026-09-04 09:30:00+05:30', NULL,
        10, TRUE, 15000,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000455', '00000000-0000-0000-0000-000000000010', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000455', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000455', 'f0000000-0000-0000-0000-000000000007', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000455', '00000000-0000-0000-0000-000000000010', CURRENT_DATE - 2, 6, TRUE, 'Implementation and code review work for TSK-ACM-004', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000456', 'TSK-ACM-005', 1, 'Bug: Flutter UI freeze on iOS 17 when switching dark mode dynamically', 'Detailed technical description and specification for Bug: Flutter UI freeze on iOS 17 when switching dark mode dynamically',
        'TASK', '55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666665', 'HIGH',
        'b0000000-0000-0000-0000-000000000001', NULL,
        '10000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000452',
        'c0000000-0000-0000-0000-000000000002', 3, 'S', '2026-09-05 09:30:00+05:30', '2026-10-11 18:30:00+05:30',
        '2026-09-05 09:30:00+05:30', NULL,
        8, TRUE, 12000,
        '11111111-1111-1111-1111-111111111111', '{"environment":"Staging","steps_to_reproduce":"1. Navigate to target module screen.\n2. Enter boundary test data.\n3. Click proceed and observe behavior.","expected_behavior":"Operation should complete with valid response without errors.","actual_behavior":"System displays error notification or unexpected validation output.","reproduction_frequency":"Always"}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000456', '00000000-0000-0000-0000-000000000005', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000456', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000456', 'f0000000-0000-0000-0000-000000000007', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000456', '00000000-0000-0000-0000-000000000005', CURRENT_DATE - 2, 4, TRUE, 'Implementation and code review work for TSK-ACM-005', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

      INSERT INTO task_comments (task_id, user_id, comment_text, is_internal_only, created_by)
      VALUES ('20000000-0000-0000-0000-000000000456', '00000000-0000-0000-0000-000000000005', 'Status update: Technical solution implemented, unit tests passed, ready for verification on staging environment.', FALSE, v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000457', 'TSK-ACM-006', 1, 'Repaint boundary optimization in balance carousel widget', 'Detailed technical description and specification for Repaint boundary optimization in balance carousel widget',
        'SUBTASK', '55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666667', 'MEDIUM',
        'b0000000-0000-0000-0000-000000000001', NULL,
        '10000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000456',
        'c0000000-0000-0000-0000-000000000002', 1, 'XS', '2026-09-06 09:30:00+05:30', '2026-10-13 18:30:00+05:30',
        '2026-09-06 09:30:00+05:30', '2026-10-13 18:30:00+05:30',
        3, TRUE, 4500,
        '11111111-1111-1111-1111-111111111111', '{"environment":"Staging","steps_to_reproduce":"1. Navigate to target module screen.\n2. Enter boundary test data.\n3. Click proceed and observe behavior.","expected_behavior":"Operation should complete with valid response without errors.","actual_behavior":"System displays error notification or unexpected validation output.","reproduction_frequency":"Always"}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000457', '00000000-0000-0000-0000-000000000010', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000457', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000457', 'f0000000-0000-0000-0000-000000000007', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000457', '00000000-0000-0000-0000-000000000010', CURRENT_DATE - 2, 3, TRUE, 'Implementation and code review work for TSK-ACM-006', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000458', 'TSK-ACM-007', 1, 'Epic: Real-Time Account Statement & Categorized Spending Trends', 'Detailed technical description and specification for Epic: Real-Time Account Statement & Categorized Spending Trends',
        'EPIC', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666662', 'HIGH',
        'b0000000-0000-0000-0000-000000000001', NULL,
        '10000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', NULL,
        'c0000000-0000-0000-0000-000000000002', 13, 'XL', '2026-09-07 09:30:00+05:30', '2026-10-15 18:30:00+05:30',
        '2026-09-07 09:30:00+05:30', NULL,
        40, TRUE, 60000,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000458', '00000000-0000-0000-0000-000000000007', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000458', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000458', 'f0000000-0000-0000-0000-000000000007', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000458', '00000000-0000-0000-0000-000000000007', CURRENT_DATE - 2, 24, TRUE, 'Implementation and code review work for TSK-ACM-007', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000459', 'TSK-ACM-008', 1, 'Infinite scroll virtualized transaction list with offline SQLite cache', 'Detailed technical description and specification for Infinite scroll virtualized transaction list with offline SQLite cache',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666663', 'HIGH',
        'b0000000-0000-0000-0000-000000000001', NULL,
        '10000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000458',
        'c0000000-0000-0000-0000-000000000002', 5, 'M', '2026-09-08 09:30:00+05:30', '2026-10-10 18:30:00+05:30',
        '2026-09-08 09:30:00+05:30', NULL,
        16, TRUE, 24000,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000459', '00000000-0000-0000-0000-000000000008', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000459', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000459', 'f0000000-0000-0000-0000-000000000007', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000459', '00000000-0000-0000-0000-000000000008', CURRENT_DATE - 2, 9, TRUE, 'Implementation and code review work for TSK-ACM-008', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

      INSERT INTO task_comments (task_id, user_id, comment_text, is_internal_only, created_by)
      VALUES ('20000000-0000-0000-0000-000000000459', '00000000-0000-0000-0000-000000000008', 'Status update: Technical solution implemented, unit tests passed, ready for verification on staging environment.', FALSE, v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000045a', 'TSK-ACM-009', 1, 'AI merchant category tagger (Dining, Travel, Groceries, Utilities)', 'Detailed technical description and specification for AI merchant category tagger (Dining, Travel, Groceries, Utilities)',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666664', 'MEDIUM',
        'b0000000-0000-0000-0000-000000000001', NULL,
        '10000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000458',
        'c0000000-0000-0000-0000-000000000002', 5, 'M', '2026-09-09 09:30:00+05:30', '2026-10-12 18:30:00+05:30',
        '2026-09-09 09:30:00+05:30', NULL,
        14, TRUE, 21000,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000045a', '00000000-0000-0000-0000-000000000005', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-00000000045a', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000045a', 'f0000000-0000-0000-0000-000000000007', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000045b', 'TSK-ACM-010', 1, 'Enhancement: Pull-to-refresh haptic vibration feedback', 'Detailed technical description and specification for Enhancement: Pull-to-refresh haptic vibration feedback',
        'TASK', '55555555-5555-5555-5555-555555555554', '66666666-6666-6666-6666-666666666667', 'LOW',
        'b0000000-0000-0000-0000-000000000001', NULL,
        '10000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000458',
        'c0000000-0000-0000-0000-000000000002', 1, 'XS', '2026-09-10 09:30:00+05:30', '2026-10-14 18:30:00+05:30',
        '2026-09-10 09:30:00+05:30', '2026-10-14 18:30:00+05:30',
        4, TRUE, 6000,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000045b', '00000000-0000-0000-0000-000000000012', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-00000000045b', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000045b', 'f0000000-0000-0000-0000-000000000007', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000045b', '00000000-0000-0000-0000-000000000012', CURRENT_DATE - 2, 4, TRUE, 'Implementation and code review work for TSK-ACM-010', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000045c', 'TSK-ACM-011', 1, 'Issue: Certificate pinning failure on corporate proxy networks', 'Detailed technical description and specification for Issue: Certificate pinning failure on corporate proxy networks',
        'TASK', '55555555-5555-5555-5555-555555555553', '66666666-6666-6666-6666-666666666667', 'HIGH',
        'b0000000-0000-0000-0000-000000000001', NULL,
        '10000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000458',
        'c0000000-0000-0000-0000-000000000002', 5, 'M', '2026-09-11 09:30:00+05:30', '2026-10-16 18:30:00+05:30',
        '2026-09-11 09:30:00+05:30', '2026-10-16 18:30:00+05:30',
        12, TRUE, 18000,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000045c', '00000000-0000-0000-0000-000000000004', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-00000000045c', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000045c', 'f0000000-0000-0000-0000-000000000007', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000045c', '00000000-0000-0000-0000-000000000004', CURRENT_DATE - 2, 12, TRUE, 'Implementation and code review work for TSK-ACM-011', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

      INSERT INTO task_comments (task_id, user_id, comment_text, is_internal_only, created_by)
      VALUES ('20000000-0000-0000-0000-00000000045c', '00000000-0000-0000-0000-000000000004', 'Status update: Technical solution implemented, unit tests passed, ready for verification on staging environment.', FALSE, v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000045d', 'TSK-ACM-012', 1, 'Support: Re-register user device after customer changed phone number', 'Detailed technical description and specification for Support: Re-register user device after customer changed phone number',
        'TASK', '55555555-5555-5555-5555-555555555556', '66666666-6666-6666-6666-666666666667', 'MEDIUM',
        'b0000000-0000-0000-0000-000000000001', NULL,
        '10000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000458',
        'c0000000-0000-0000-0000-000000000002', 1, 'XS', '2026-09-12 09:30:00+05:30', '2026-10-18 18:30:00+05:30',
        '2026-09-12 09:30:00+05:30', '2026-10-18 18:30:00+05:30',
        3, TRUE, 4500,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000045d', '00000000-0000-0000-0000-000000000011', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-00000000045d', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000045d', 'f0000000-0000-0000-0000-000000000007', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000045d', '00000000-0000-0000-0000-000000000011', CURRENT_DATE - 2, 3, TRUE, 'Implementation and code review work for TSK-ACM-012', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000045e', 'TSK-ACM-013', 1, 'Training: Client executive demo of release candidate build on TestFlight', 'Detailed technical description and specification for Training: Client executive demo of release candidate build on TestFlight',
        'TASK', '55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666667', 'MEDIUM',
        'b0000000-0000-0000-0000-000000000001', NULL,
        '10000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000458',
        'c0000000-0000-0000-0000-000000000002', 2, 'XS', '2026-09-13 09:30:00+05:30', '2026-10-20 18:30:00+05:30',
        '2026-09-13 09:30:00+05:30', '2026-10-20 18:30:00+05:30',
        4, TRUE, 6000,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000045e', '00000000-0000-0000-0000-000000000003', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-00000000045e', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000045e', 'f0000000-0000-0000-0000-000000000007', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000045e', '00000000-0000-0000-0000-000000000003', CURRENT_DATE - 2, 4, TRUE, 'Implementation and code review work for TSK-ACM-013', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000045f', 'TSK-ACM-014', 1, 'Enhancement: In-app PDF download for audited tax deduction certificate', 'Detailed technical description and specification for Enhancement: In-app PDF download for audited tax deduction certificate',
        'TASK', '55555555-5555-5555-5555-555555555554', '66666666-6666-6666-6666-666666666662', 'MEDIUM',
        'b0000000-0000-0000-0000-000000000001', NULL,
        '10000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000458',
        'c0000000-0000-0000-0000-000000000002', 3, 'S', '2026-09-14 09:30:00+05:30', '2026-10-22 18:30:00+05:30',
        '2026-09-14 09:30:00+05:30', NULL,
        10, TRUE, 15000,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000045f', '00000000-0000-0000-0000-000000000008', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-00000000045f', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000045f', 'f0000000-0000-0000-0000-000000000007', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000045f', '00000000-0000-0000-0000-000000000008', CURRENT_DATE - 2, 6, TRUE, 'Implementation and code review work for TSK-ACM-014', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000460', 'TSK-ACM-015', 1, 'Bug: Card freeze switch toggles back on fast swipe gesture', 'Detailed technical description and specification for Bug: Card freeze switch toggles back on fast swipe gesture',
        'TASK', '55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666664', 'HIGH',
        'b0000000-0000-0000-0000-000000000001', NULL,
        '10000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000458',
        'c0000000-0000-0000-0000-000000000002', 3, 'S', '2026-09-15 09:30:00+05:30', '2026-10-17 18:30:00+05:30',
        '2026-09-15 09:30:00+05:30', NULL,
        8, TRUE, 12000,
        '11111111-1111-1111-1111-111111111111', '{"environment":"Staging","steps_to_reproduce":"1. Navigate to target module screen.\n2. Enter boundary test data.\n3. Click proceed and observe behavior.","expected_behavior":"Operation should complete with valid response without errors.","actual_behavior":"System displays error notification or unexpected validation output.","reproduction_frequency":"Always"}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000460', '00000000-0000-0000-0000-000000000005', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000460', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000460', 'f0000000-0000-0000-0000-000000000007', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000461', 'TSK-ACM-016', 1, 'Add debounce logic to debit card toggle switch event listener', 'Detailed technical description and specification for Add debounce logic to debit card toggle switch event listener',
        'SUBTASK', '55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666664', 'MEDIUM',
        'b0000000-0000-0000-0000-000000000001', NULL,
        '10000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000460',
        'c0000000-0000-0000-0000-000000000002', 1, 'XS', '2026-09-16 09:30:00+05:30', '2026-10-19 18:30:00+05:30',
        '2026-09-16 09:30:00+05:30', NULL,
        3, TRUE, 4500,
        '11111111-1111-1111-1111-111111111111', '{"environment":"Staging","steps_to_reproduce":"1. Navigate to target module screen.\n2. Enter boundary test data.\n3. Click proceed and observe behavior.","expected_behavior":"Operation should complete with valid response without errors.","actual_behavior":"System displays error notification or unexpected validation output.","reproduction_frequency":"Always"}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000461', '00000000-0000-0000-0000-000000000010', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000461', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000461', 'f0000000-0000-0000-0000-000000000007', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000462', 'TSK-ACM-017', 1, 'Epic: Peer-to-Peer Instant Split Bill & Request Money Sheet', 'Detailed technical description and specification for Epic: Peer-to-Peer Instant Split Bill & Request Money Sheet',
        'EPIC', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666661', 'MEDIUM',
        'b0000000-0000-0000-0000-000000000001', NULL,
        '10000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', NULL,
        'c0000000-0000-0000-0000-000000000002', 13, 'XL', '2026-09-17 09:30:00+05:30', '2026-10-21 18:30:00+05:30',
        NULL, NULL,
        36, TRUE, 54000,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000462', '00000000-0000-0000-0000-000000000004', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000462', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000462', 'f0000000-0000-0000-0000-000000000007', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000463', 'TSK-ACM-018', 1, 'Phone contact book sync with localized user discovery', 'Detailed technical description and specification for Phone contact book sync with localized user discovery',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666661', 'MEDIUM',
        'b0000000-0000-0000-0000-000000000001', NULL,
        '10000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000462',
        'c0000000-0000-0000-0000-000000000002', 5, 'M', '2026-09-18 09:30:00+05:30', '2026-10-23 18:30:00+05:30',
        NULL, NULL,
        14, TRUE, 21000,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000463', '00000000-0000-0000-0000-000000000006', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000463', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000463', 'f0000000-0000-0000-0000-000000000007', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000464', 'TSK-ACM-019', 1, 'Dynamic QR code generator with embedded request amount', 'Detailed technical description and specification for Dynamic QR code generator with embedded request amount',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666661', 'MEDIUM',
        'b0000000-0000-0000-0000-000000000001', NULL,
        '10000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000462',
        'c0000000-0000-0000-0000-000000000002', 3, 'S', '2026-09-19 09:30:00+05:30', '2026-10-25 18:30:00+05:30',
        NULL, NULL,
        10, TRUE, 15000,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000464', '00000000-0000-0000-0000-000000000007', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000464', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000464', 'f0000000-0000-0000-0000-000000000007', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000465', 'TSK-ACM-020', 1, 'Bug: International phone numbers truncated on transfer screen', 'Detailed technical description and specification for Bug: International phone numbers truncated on transfer screen',
        'TASK', '55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666667', 'LOW',
        'b0000000-0000-0000-0000-000000000001', NULL,
        '10000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000462',
        'c0000000-0000-0000-0000-000000000002', 2, 'XS', '2026-09-20 09:30:00+05:30', '2026-10-27 18:30:00+05:30',
        '2026-09-20 09:30:00+05:30', '2026-10-27 18:30:00+05:30',
        4, TRUE, 6000,
        '11111111-1111-1111-1111-111111111111', '{"environment":"Staging","steps_to_reproduce":"1. Navigate to target module screen.\n2. Enter boundary test data.\n3. Click proceed and observe behavior.","expected_behavior":"Operation should complete with valid response without errors.","actual_behavior":"System displays error notification or unexpected validation output.","reproduction_frequency":"Always"}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000465', '00000000-0000-0000-0000-000000000010', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000465', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000465', 'f0000000-0000-0000-0000-000000000007', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000465', '00000000-0000-0000-0000-000000000010', CURRENT_DATE - 2, 4, TRUE, 'Implementation and code review work for TSK-ACM-020', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000466', 'TSK-ACM-021', 1, 'Issue: High CPU usage in background push notification listener', 'Detailed technical description and specification for Issue: High CPU usage in background push notification listener',
        'TASK', '55555555-5555-5555-5555-555555555553', '66666666-6666-6666-6666-666666666662', 'HIGH',
        'b0000000-0000-0000-0000-000000000001', NULL,
        '10000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000462',
        'c0000000-0000-0000-0000-000000000002', 5, 'M', '2026-09-01 09:30:00+05:30', '2026-10-09 18:30:00+05:30',
        '2026-09-01 09:30:00+05:30', NULL,
        12, TRUE, 18000,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000466', '00000000-0000-0000-0000-000000000009', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000466', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000466', 'f0000000-0000-0000-0000-000000000007', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000466', '00000000-0000-0000-0000-000000000009', CURRENT_DATE - 2, 7, TRUE, 'Implementation and code review work for TSK-ACM-021', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000467', 'TSK-ACM-022', 1, 'Enhancement: Skeleton loading animation while transactions fetch', 'Detailed technical description and specification for Enhancement: Skeleton loading animation while transactions fetch',
        'TASK', '55555555-5555-5555-5555-555555555554', '66666666-6666-6666-6666-666666666661', 'LOW',
        'b0000000-0000-0000-0000-000000000001', NULL,
        '10000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000462',
        'c0000000-0000-0000-0000-000000000002', 2, 'XS', '2026-09-02 09:30:00+05:30', '2026-10-04 18:30:00+05:30',
        NULL, NULL,
        6, TRUE, 9000,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000467', '00000000-0000-0000-0000-000000000012', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000467', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000467', 'f0000000-0000-0000-0000-000000000007', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000468', 'TSK-ACM-023', 1, 'Support: Clear cached biometric state for locked client user', 'Detailed technical description and specification for Support: Clear cached biometric state for locked client user',
        'TASK', '55555555-5555-5555-5555-555555555556', '66666666-6666-6666-6666-666666666667', 'LOW',
        'b0000000-0000-0000-0000-000000000001', NULL,
        '10000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000462',
        'c0000000-0000-0000-0000-000000000002', 1, 'XS', '2026-09-03 09:30:00+05:30', '2026-10-06 18:30:00+05:30',
        '2026-09-03 09:30:00+05:30', '2026-10-06 18:30:00+05:30',
        2, TRUE, 3000,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000468', '00000000-0000-0000-0000-000000000011', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000468', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000468', 'f0000000-0000-0000-0000-000000000007', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000468', '00000000-0000-0000-0000-000000000011', CURRENT_DATE - 2, 2, TRUE, 'Implementation and code review work for TSK-ACM-023', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000469', 'TSK-ACM-024', 1, 'Training: Security pen-testing debrief with Acme security team', 'Detailed technical description and specification for Training: Security pen-testing debrief with Acme security team',
        'TASK', '55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666661', 'LOW',
        'b0000000-0000-0000-0000-000000000001', NULL,
        '10000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000462',
        'c0000000-0000-0000-0000-000000000002', 2, 'XS', '2026-09-04 09:30:00+05:30', '2026-10-08 18:30:00+05:30',
        NULL, NULL,
        4, TRUE, 6000,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000469', '00000000-0000-0000-0000-000000000003', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000469', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000469', 'f0000000-0000-0000-0000-000000000007', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000046a', 'TSK-ACM-025', 1, 'Epic: Fixed Deposit & Mutual Fund Investment Portfolio Screen', 'Detailed technical description and specification for Epic: Fixed Deposit & Mutual Fund Investment Portfolio Screen',
        'EPIC', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666661', 'HIGH',
        'b0000000-0000-0000-0000-000000000001', NULL,
        '10000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', NULL,
        'c0000000-0000-0000-0000-000000000002', 21, 'XL', '2026-09-05 09:30:00+05:30', '2026-10-10 18:30:00+05:30',
        NULL, NULL,
        50, TRUE, 75000,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000046a', '00000000-0000-0000-0000-000000000007', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-00000000046a', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000046a', 'f0000000-0000-0000-0000-000000000007', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000046b', 'TSK-ACM-026', 1, 'Interest rate compound calculator widget with sliders', 'Detailed technical description and specification for Interest rate compound calculator widget with sliders',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666667', 'LOW',
        'b0000000-0000-0000-0000-000000000001', NULL,
        '10000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-00000000046a',
        'c0000000-0000-0000-0000-000000000002', 3, 'S', '2026-09-06 09:30:00+05:30', '2026-10-12 18:30:00+05:30',
        '2026-09-06 09:30:00+05:30', '2026-10-12 18:30:00+05:30',
        8, TRUE, 12000,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000046b', '00000000-0000-0000-0000-000000000008', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-00000000046b', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000046b', 'f0000000-0000-0000-0000-000000000007', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000046b', '00000000-0000-0000-0000-000000000008', CURRENT_DATE - 2, 8, TRUE, 'Implementation and code review work for TSK-ACM-026', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000046c', 'TSK-ACM-027', 1, 'One-click FD creation with instant nominee nomination', 'Detailed technical description and specification for One-click FD creation with instant nominee nomination',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666662', 'HIGH',
        'b0000000-0000-0000-0000-000000000001', NULL,
        '10000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-00000000046a',
        'c0000000-0000-0000-0000-000000000002', 5, 'M', '2026-09-07 09:30:00+05:30', '2026-10-14 18:30:00+05:30',
        '2026-09-07 09:30:00+05:30', NULL,
        16, TRUE, 24000,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000046c', '00000000-0000-0000-0000-000000000009', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-00000000046c', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000046c', 'f0000000-0000-0000-0000-000000000007', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000046c', '00000000-0000-0000-0000-000000000009', CURRENT_DATE - 2, 9, TRUE, 'Implementation and code review work for TSK-ACM-027', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000046d', 'TSK-ACM-028', 1, 'Bug: Nominee age validation fails for minor accounts', 'Detailed technical description and specification for Bug: Nominee age validation fails for minor accounts',
        'TASK', '55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666667', 'MEDIUM',
        'b0000000-0000-0000-0000-000000000001', NULL,
        '10000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-00000000046a',
        'c0000000-0000-0000-0000-000000000002', 2, 'XS', '2026-09-08 09:30:00+05:30', '2026-10-16 18:30:00+05:30',
        '2026-09-08 09:30:00+05:30', '2026-10-16 18:30:00+05:30',
        6, TRUE, 9000,
        '11111111-1111-1111-1111-111111111111', '{"environment":"Staging","steps_to_reproduce":"1. Navigate to target module screen.\n2. Enter boundary test data.\n3. Click proceed and observe behavior.","expected_behavior":"Operation should complete with valid response without errors.","actual_behavior":"System displays error notification or unexpected validation output.","reproduction_frequency":"Always"}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000046d', '00000000-0000-0000-0000-000000000010', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-00000000046d', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000046d', 'f0000000-0000-0000-0000-000000000007', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000046d', '00000000-0000-0000-0000-000000000010', CURRENT_DATE - 2, 6, TRUE, 'Implementation and code review work for TSK-ACM-028', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000046e', 'TSK-ACM-029', 1, 'Enhancement: Multi-language support (English, Hindi, Gujarati, Marathi)', 'Detailed technical description and specification for Enhancement: Multi-language support (English, Hindi, Gujarati, Marathi)',
        'TASK', '55555555-5555-5555-5555-555555555554', '66666666-6666-6666-6666-666666666667', 'HIGH',
        'b0000000-0000-0000-0000-000000000001', NULL,
        '10000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-00000000046a',
        'c0000000-0000-0000-0000-000000000002', 5, 'M', '2026-09-09 09:30:00+05:30', '2026-10-11 18:30:00+05:30',
        '2026-09-09 09:30:00+05:30', '2026-10-11 18:30:00+05:30',
        16, TRUE, 24000,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000046e', '00000000-0000-0000-0000-000000000004', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-00000000046e', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000046e', 'f0000000-0000-0000-0000-000000000007', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000046e', '00000000-0000-0000-0000-000000000004', CURRENT_DATE - 2, 16, TRUE, 'Implementation and code review work for TSK-ACM-029', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000046f', 'TSK-ACM-030', 1, 'Issue: Memory leak when navigating repeatedly between charts and cards', 'Detailed technical description and specification for Issue: Memory leak when navigating repeatedly between charts and cards',
        'TASK', '55555555-5555-5555-5555-555555555553', '66666666-6666-6666-6666-666666666665', 'HIGH',
        'b0000000-0000-0000-0000-000000000001', NULL,
        '10000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-00000000046a',
        'c0000000-0000-0000-0000-000000000002', 5, 'M', '2026-09-10 09:30:00+05:30', '2026-10-13 18:30:00+05:30',
        '2026-09-10 09:30:00+05:30', NULL,
        14, TRUE, 21000,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000046f', '00000000-0000-0000-0000-000000000010', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-00000000046f', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000046f', 'f0000000-0000-0000-0000-000000000007', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000046f', '00000000-0000-0000-0000-000000000010', CURRENT_DATE - 2, 8, TRUE, 'Implementation and code review work for TSK-ACM-030', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000470', 'TSK-ACM-031', 1, 'Dispose FL Chart controllers properly on widget unmount', 'Detailed technical description and specification for Dispose FL Chart controllers properly on widget unmount',
        'SUBTASK', '55555555-5555-5555-5555-555555555553', '66666666-6666-6666-6666-666666666665', 'MEDIUM',
        'b0000000-0000-0000-0000-000000000001', NULL,
        '10000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-00000000046f',
        'c0000000-0000-0000-0000-000000000002', 2, 'XS', '2026-09-11 09:30:00+05:30', '2026-10-15 18:30:00+05:30',
        '2026-09-11 09:30:00+05:30', NULL,
        6, TRUE, 9000,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000470', '00000000-0000-0000-0000-000000000005', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000470', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000470', 'f0000000-0000-0000-0000-000000000007', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000470', '00000000-0000-0000-0000-000000000005', CURRENT_DATE - 2, 3, TRUE, 'Implementation and code review work for TSK-ACM-031', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000471', 'TSK-ACM-032', 1, 'Audit Flutter ImageCache memory cap settings on low-memory devices', 'Detailed technical description and specification for Audit Flutter ImageCache memory cap settings on low-memory devices',
        'SUBTASK', '55555555-5555-5555-5555-555555555553', '66666666-6666-6666-6666-666666666667', 'MEDIUM',
        'b0000000-0000-0000-0000-000000000001', NULL,
        '10000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-00000000046f',
        'c0000000-0000-0000-0000-000000000002', 3, 'S', '2026-09-12 09:30:00+05:30', '2026-10-17 18:30:00+05:30',
        '2026-09-12 09:30:00+05:30', '2026-10-17 18:30:00+05:30',
        8, TRUE, 12000,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000471', '00000000-0000-0000-0000-000000000008', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000471', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000471', 'f0000000-0000-0000-0000-000000000007', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000471', '00000000-0000-0000-0000-000000000008', CURRENT_DATE - 2, 8, TRUE, 'Implementation and code review work for TSK-ACM-032', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000472', 'TSK-ACM-033', 1, 'Support: Re-issue user welcome email with secure verification link', 'Detailed technical description and specification for Support: Re-issue user welcome email with secure verification link',
        'TASK', '55555555-5555-5555-5555-555555555556', '66666666-6666-6666-6666-666666666667', 'LOW',
        'b0000000-0000-0000-0000-000000000001', NULL,
        '10000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-00000000046a',
        'c0000000-0000-0000-0000-000000000002', 1, 'XS', '2026-09-13 09:30:00+05:30', '2026-10-19 18:30:00+05:30',
        '2026-09-13 09:30:00+05:30', '2026-10-19 18:30:00+05:30',
        2, TRUE, 3000,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000472', '00000000-0000-0000-0000-000000000011', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000472', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000472', 'f0000000-0000-0000-0000-000000000007', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000472', '00000000-0000-0000-0000-000000000011', CURRENT_DATE - 2, 2, TRUE, 'Implementation and code review work for TSK-ACM-033', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000473', 'TSK-ACM-034', 1, 'Training: Client staff training on managing user roles in backoffice', 'Detailed technical description and specification for Training: Client staff training on managing user roles in backoffice',
        'TASK', '55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666667', 'LOW',
        'b0000000-0000-0000-0000-000000000001', NULL,
        '10000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-00000000046a',
        'c0000000-0000-0000-0000-000000000002', 2, 'XS', '2026-09-14 09:30:00+05:30', '2026-10-21 18:30:00+05:30',
        '2026-09-14 09:30:00+05:30', '2026-10-21 18:30:00+05:30',
        4, TRUE, 6000,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000473', '00000000-0000-0000-0000-000000000003', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000473', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000473', 'f0000000-0000-0000-0000-000000000007', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000473', '00000000-0000-0000-0000-000000000003', CURRENT_DATE - 2, 4, TRUE, 'Implementation and code review work for TSK-ACM-034', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000474', 'TSK-ACM-035', 1, 'Enhancement: Quick-action widgets for Android home screen and iOS Lock Screen', 'Detailed technical description and specification for Enhancement: Quick-action widgets for Android home screen and iOS Lock Screen',
        'TASK', '55555555-5555-5555-5555-555555555554', '66666666-6666-6666-6666-666666666666', 'HIGH',
        'b0000000-0000-0000-0000-000000000001', NULL,
        '10000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-00000000046a',
        'c0000000-0000-0000-0000-000000000002', 5, 'M', '2026-09-15 09:30:00+05:30', '2026-10-23 18:30:00+05:30',
        '2026-09-15 09:30:00+05:30', NULL,
        16, TRUE, 24000,
        '11111111-1111-1111-1111-111111111111', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000474', '00000000-0000-0000-0000-000000000004', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000474', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000474', 'f0000000-0000-0000-0000-000000000007', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000475', 'TSK-NEX-001', 1, 'Epic: NexGen Reefer Fleet Real-time Telemetry Pipeline', 'Detailed technical description and specification for Epic: NexGen Reefer Fleet Real-time Telemetry Pipeline',
        'EPIC', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666662', 'CRITICAL',
        'b0000000-0000-0000-0000-000000000002', NULL,
        '10000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005', NULL,
        'c0000000-0000-0000-0000-000000000003', 21, 'XL', '2026-09-01 09:30:00+05:30', '2026-10-03 18:30:00+05:30',
        '2026-09-01 09:30:00+05:30', NULL,
        60, TRUE, 90000,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000475', '00000000-0000-0000-0000-000000000006', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000475', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000475', 'f0000000-0000-0000-0000-000000000008', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000475', '00000000-0000-0000-0000-000000000006', CURRENT_DATE - 2, 36, TRUE, 'Implementation and code review work for TSK-NEX-001', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000476', 'TSK-NEX-002', 1, 'Sub-second temperature & humidity sensor ingest via TimescaleDB', 'Detailed technical description and specification for Sub-second temperature & humidity sensor ingest via TimescaleDB',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666667', 'CRITICAL',
        'b0000000-0000-0000-0000-000000000002', NULL,
        '10000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000475',
        'c0000000-0000-0000-0000-000000000003', 8, 'L', '2026-09-02 09:30:00+05:30', '2026-10-05 18:30:00+05:30',
        '2026-09-02 09:30:00+05:30', '2026-10-05 18:30:00+05:30',
        24, TRUE, 36000,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000476', '00000000-0000-0000-0000-000000000007', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000476', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000476', 'f0000000-0000-0000-0000-000000000008', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000476', '00000000-0000-0000-0000-000000000007', CURRENT_DATE - 2, 24, TRUE, 'Implementation and code review work for TSK-NEX-002', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

      INSERT INTO task_comments (task_id, user_id, comment_text, is_internal_only, created_by)
      VALUES ('20000000-0000-0000-0000-000000000476', '00000000-0000-0000-0000-000000000007', 'Status update: Technical solution implemented, unit tests passed, ready for verification on staging environment.', FALSE, v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000477', 'TSK-NEX-003', 1, 'Compress hypertable historical data older than 30 days', 'Detailed technical description and specification for Compress hypertable historical data older than 30 days',
        'SUBTASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666667', 'HIGH',
        'b0000000-0000-0000-0000-000000000002', NULL,
        '10000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000476',
        'c0000000-0000-0000-0000-000000000003', 3, 'S', '2026-09-03 09:30:00+05:30', '2026-10-07 18:30:00+05:30',
        '2026-09-03 09:30:00+05:30', '2026-10-07 18:30:00+05:30',
        10, TRUE, 15000,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000477', '00000000-0000-0000-0000-000000000008', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000477', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000477', 'f0000000-0000-0000-0000-000000000008', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000477', '00000000-0000-0000-0000-000000000008', CURRENT_DATE - 2, 10, TRUE, 'Implementation and code review work for TSK-NEX-003', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000478', 'TSK-NEX-004', 1, 'Live geospatial dashboard showing 1,500 active long-haul trucks', 'Detailed technical description and specification for Live geospatial dashboard showing 1,500 active long-haul trucks',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666665', 'HIGH',
        'b0000000-0000-0000-0000-000000000002', NULL,
        '10000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000475',
        'c0000000-0000-0000-0000-000000000003', 8, 'L', '2026-09-04 09:30:00+05:30', '2026-10-09 18:30:00+05:30',
        '2026-09-04 09:30:00+05:30', NULL,
        22, TRUE, 33000,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000478', '00000000-0000-0000-0000-000000000005', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000478', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000478', 'f0000000-0000-0000-0000-000000000008', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000478', '00000000-0000-0000-0000-000000000005', CURRENT_DATE - 2, 13, TRUE, 'Implementation and code review work for TSK-NEX-004', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000479', 'TSK-NEX-005', 1, 'Bug: Sensor reading spikes to 999.0°C when probe disconnects briefly', 'Detailed technical description and specification for Bug: Sensor reading spikes to 999.0°C when probe disconnects briefly',
        'TASK', '55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666665', 'HIGH',
        'b0000000-0000-0000-0000-000000000002', NULL,
        '10000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000475',
        'c0000000-0000-0000-0000-000000000003', 3, 'S', '2026-09-05 09:30:00+05:30', '2026-10-11 18:30:00+05:30',
        '2026-09-05 09:30:00+05:30', NULL,
        8, TRUE, 12000,
        '11111111-1111-1111-1111-111111111113', '{"environment":"Staging","steps_to_reproduce":"1. Navigate to target module screen.\n2. Enter boundary test data.\n3. Click proceed and observe behavior.","expected_behavior":"Operation should complete with valid response without errors.","actual_behavior":"System displays error notification or unexpected validation output.","reproduction_frequency":"Always"}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000479', '00000000-0000-0000-0000-000000000010', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000479', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000479', 'f0000000-0000-0000-0000-000000000008', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000479', '00000000-0000-0000-0000-000000000010', CURRENT_DATE - 2, 4, TRUE, 'Implementation and code review work for TSK-NEX-005', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

      INSERT INTO task_comments (task_id, user_id, comment_text, is_internal_only, created_by)
      VALUES ('20000000-0000-0000-0000-000000000479', '00000000-0000-0000-0000-000000000010', 'Status update: Technical solution implemented, unit tests passed, ready for verification on staging environment.', FALSE, v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000047a', 'TSK-NEX-006', 1, 'Apply anomaly rejection filter for out-of-range sensor readings', 'Detailed technical description and specification for Apply anomaly rejection filter for out-of-range sensor readings',
        'SUBTASK', '55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666667', 'MEDIUM',
        'b0000000-0000-0000-0000-000000000002', NULL,
        '10000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000479',
        'c0000000-0000-0000-0000-000000000003', 2, 'XS', '2026-09-06 09:30:00+05:30', '2026-10-13 18:30:00+05:30',
        '2026-09-06 09:30:00+05:30', '2026-10-13 18:30:00+05:30',
        5, TRUE, 7500,
        '11111111-1111-1111-1111-111111111113', '{"environment":"Staging","steps_to_reproduce":"1. Navigate to target module screen.\n2. Enter boundary test data.\n3. Click proceed and observe behavior.","expected_behavior":"Operation should complete with valid response without errors.","actual_behavior":"System displays error notification or unexpected validation output.","reproduction_frequency":"Always"}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000047a', '00000000-0000-0000-0000-000000000005', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-00000000047a', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000047a', 'f0000000-0000-0000-0000-000000000008', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000047a', '00000000-0000-0000-0000-000000000005', CURRENT_DATE - 2, 5, TRUE, 'Implementation and code review work for TSK-NEX-006', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000047b', 'TSK-NEX-007', 1, 'Epic: Automated Cold-Chain Breach Compliance Certificates', 'Detailed technical description and specification for Epic: Automated Cold-Chain Breach Compliance Certificates',
        'EPIC', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666662', 'HIGH',
        'b0000000-0000-0000-0000-000000000002', NULL,
        '10000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005', NULL,
        'c0000000-0000-0000-0000-000000000003', 13, 'XL', '2026-09-07 09:30:00+05:30', '2026-10-15 18:30:00+05:30',
        '2026-09-07 09:30:00+05:30', NULL,
        40, TRUE, 60000,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000047b', '00000000-0000-0000-0000-000000000006', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-00000000047b', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000047b', 'f0000000-0000-0000-0000-000000000008', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000047b', '00000000-0000-0000-0000-000000000006', CURRENT_DATE - 2, 24, TRUE, 'Implementation and code review work for TSK-NEX-007', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000047c', 'TSK-NEX-008', 1, 'FDA 21 CFR Part 11 electronic audit trail signature generation', 'Detailed technical description and specification for FDA 21 CFR Part 11 electronic audit trail signature generation',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666663', 'HIGH',
        'b0000000-0000-0000-0000-000000000002', NULL,
        '10000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-00000000047b',
        'c0000000-0000-0000-0000-000000000003', 5, 'M', '2026-09-08 09:30:00+05:30', '2026-10-10 18:30:00+05:30',
        '2026-09-08 09:30:00+05:30', NULL,
        16, TRUE, 24000,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000047c', '00000000-0000-0000-0000-000000000007', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-00000000047c', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000047c', 'f0000000-0000-0000-0000-000000000008', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000047c', '00000000-0000-0000-0000-000000000007', CURRENT_DATE - 2, 9, TRUE, 'Implementation and code review work for TSK-NEX-008', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

      INSERT INTO task_comments (task_id, user_id, comment_text, is_internal_only, created_by)
      VALUES ('20000000-0000-0000-0000-00000000047c', '00000000-0000-0000-0000-000000000007', 'Status update: Technical solution implemented, unit tests passed, ready for verification on staging environment.', FALSE, v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000047d', 'TSK-NEX-009', 1, 'PDF trip temperature log download with tamper-evident SHA-256 seal', 'Detailed technical description and specification for PDF trip temperature log download with tamper-evident SHA-256 seal',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666664', 'MEDIUM',
        'b0000000-0000-0000-0000-000000000002', NULL,
        '10000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-00000000047b',
        'c0000000-0000-0000-0000-000000000003', 5, 'M', '2026-09-09 09:30:00+05:30', '2026-10-12 18:30:00+05:30',
        '2026-09-09 09:30:00+05:30', NULL,
        14, TRUE, 21000,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000047d', '00000000-0000-0000-0000-000000000010', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-00000000047d', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000047d', 'f0000000-0000-0000-0000-000000000008', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000047e', 'TSK-NEX-010', 1, 'Enhancement: Automated notification to receiving warehouse on breach', 'Detailed technical description and specification for Enhancement: Automated notification to receiving warehouse on breach',
        'TASK', '55555555-5555-5555-5555-555555555554', '66666666-6666-6666-6666-666666666667', 'HIGH',
        'b0000000-0000-0000-0000-000000000002', NULL,
        '10000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-00000000047b',
        'c0000000-0000-0000-0000-000000000003', 3, 'S', '2026-09-10 09:30:00+05:30', '2026-10-14 18:30:00+05:30',
        '2026-09-10 09:30:00+05:30', '2026-10-14 18:30:00+05:30',
        8, TRUE, 12000,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000047e', '00000000-0000-0000-0000-000000000009', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-00000000047e', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000047e', 'f0000000-0000-0000-0000-000000000008', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000047e', '00000000-0000-0000-0000-000000000009', CURRENT_DATE - 2, 8, TRUE, 'Implementation and code review work for TSK-NEX-010', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000047f', 'TSK-NEX-011', 1, 'Issue: High database CPU during multi-month temperature rollup', 'Detailed technical description and specification for Issue: High database CPU during multi-month temperature rollup',
        'TASK', '55555555-5555-5555-5555-555555555553', '66666666-6666-6666-6666-666666666667', 'HIGH',
        'b0000000-0000-0000-0000-000000000002', NULL,
        '10000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-00000000047b',
        'c0000000-0000-0000-0000-000000000003', 5, 'M', '2026-09-11 09:30:00+05:30', '2026-10-16 18:30:00+05:30',
        '2026-09-11 09:30:00+05:30', '2026-10-16 18:30:00+05:30',
        14, TRUE, 21000,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000047f', '00000000-0000-0000-0000-000000000012', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-00000000047f', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000047f', 'f0000000-0000-0000-0000-000000000008', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000047f', '00000000-0000-0000-0000-000000000012', CURRENT_DATE - 2, 14, TRUE, 'Implementation and code review work for TSK-NEX-011', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

      INSERT INTO task_comments (task_id, user_id, comment_text, is_internal_only, created_by)
      VALUES ('20000000-0000-0000-0000-00000000047f', '00000000-0000-0000-0000-000000000012', 'Status update: Technical solution implemented, unit tests passed, ready for verification on staging environment.', FALSE, v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000480', 'TSK-NEX-012', 1, 'Support: Remote sensor diagnostic check for consignment #CN-9901', 'Detailed technical description and specification for Support: Remote sensor diagnostic check for consignment #CN-9901',
        'TASK', '55555555-5555-5555-5555-555555555556', '66666666-6666-6666-6666-666666666667', 'MEDIUM',
        'b0000000-0000-0000-0000-000000000002', NULL,
        '10000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-00000000047b',
        'c0000000-0000-0000-0000-000000000003', 2, 'XS', '2026-09-12 09:30:00+05:30', '2026-10-18 18:30:00+05:30',
        '2026-09-12 09:30:00+05:30', '2026-10-18 18:30:00+05:30',
        4, TRUE, 6000,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000480', '00000000-0000-0000-0000-000000000011', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000480', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000480', 'f0000000-0000-0000-0000-000000000008', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000480', '00000000-0000-0000-0000-000000000011', CURRENT_DATE - 2, 4, TRUE, 'Implementation and code review work for TSK-NEX-012', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000481', 'TSK-NEX-013', 1, 'Training: Client field operators training on BLE beacon provisioning', 'Detailed technical description and specification for Training: Client field operators training on BLE beacon provisioning',
        'TASK', '55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666667', 'LOW',
        'b0000000-0000-0000-0000-000000000002', NULL,
        '10000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-00000000047b',
        'c0000000-0000-0000-0000-000000000003', 2, 'XS', '2026-09-13 09:30:00+05:30', '2026-10-20 18:30:00+05:30',
        '2026-09-13 09:30:00+05:30', '2026-10-20 18:30:00+05:30',
        4, TRUE, 6000,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000481', '00000000-0000-0000-0000-000000000003', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000481', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000481', 'f0000000-0000-0000-0000-000000000008', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000481', '00000000-0000-0000-0000-000000000003', CURRENT_DATE - 2, 4, TRUE, 'Implementation and code review work for TSK-NEX-013', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000482', 'TSK-NEX-014', 1, 'Enhancement: Battery level indicator alert when probe reaches < 15%', 'Detailed technical description and specification for Enhancement: Battery level indicator alert when probe reaches < 15%',
        'TASK', '55555555-5555-5555-5555-555555555554', '66666666-6666-6666-6666-666666666662', 'MEDIUM',
        'b0000000-0000-0000-0000-000000000002', NULL,
        '10000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-00000000047b',
        'c0000000-0000-0000-0000-000000000003', 3, 'S', '2026-09-14 09:30:00+05:30', '2026-10-22 18:30:00+05:30',
        '2026-09-14 09:30:00+05:30', NULL,
        8, TRUE, 12000,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000482', '00000000-0000-0000-0000-000000000007', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000482', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000482', 'f0000000-0000-0000-0000-000000000008', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000482', '00000000-0000-0000-0000-000000000007', CURRENT_DATE - 2, 4, TRUE, 'Implementation and code review work for TSK-NEX-014', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000483', 'TSK-NEX-015', 1, 'Bug: False door-open alarm when magnetic latch vibrates over potholes', 'Detailed technical description and specification for Bug: False door-open alarm when magnetic latch vibrates over potholes',
        'TASK', '55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666664', 'HIGH',
        'b0000000-0000-0000-0000-000000000002', NULL,
        '10000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-00000000047b',
        'c0000000-0000-0000-0000-000000000003', 3, 'S', '2026-09-15 09:30:00+05:30', '2026-10-17 18:30:00+05:30',
        '2026-09-15 09:30:00+05:30', NULL,
        8, TRUE, 12000,
        '11111111-1111-1111-1111-111111111113', '{"environment":"Staging","steps_to_reproduce":"1. Navigate to target module screen.\n2. Enter boundary test data.\n3. Click proceed and observe behavior.","expected_behavior":"Operation should complete with valid response without errors.","actual_behavior":"System displays error notification or unexpected validation output.","reproduction_frequency":"Always"}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000483', '00000000-0000-0000-0000-000000000010', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000483', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000483', 'f0000000-0000-0000-0000-000000000008', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000484', 'TSK-NEX-016', 1, 'Add 3-second continuous trigger delay before logging door open event', 'Detailed technical description and specification for Add 3-second continuous trigger delay before logging door open event',
        'SUBTASK', '55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666664', 'MEDIUM',
        'b0000000-0000-0000-0000-000000000002', NULL,
        '10000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000483',
        'c0000000-0000-0000-0000-000000000003', 1, 'XS', '2026-09-16 09:30:00+05:30', '2026-10-19 18:30:00+05:30',
        '2026-09-16 09:30:00+05:30', NULL,
        3, TRUE, 4500,
        '11111111-1111-1111-1111-111111111113', '{"environment":"Staging","steps_to_reproduce":"1. Navigate to target module screen.\n2. Enter boundary test data.\n3. Click proceed and observe behavior.","expected_behavior":"Operation should complete with valid response without errors.","actual_behavior":"System displays error notification or unexpected validation output.","reproduction_frequency":"Always"}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000484', '00000000-0000-0000-0000-000000000005', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000484', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000484', 'f0000000-0000-0000-0000-000000000008', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000485', 'TSK-NEX-017', 1, 'Epic: Predictive Arrival Time (ETA) Calculation Engine', 'Detailed technical description and specification for Epic: Predictive Arrival Time (ETA) Calculation Engine',
        'EPIC', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666661', 'MEDIUM',
        'b0000000-0000-0000-0000-000000000002', NULL,
        '10000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005', NULL,
        'c0000000-0000-0000-0000-000000000003', 13, 'XL', '2026-09-17 09:30:00+05:30', '2026-10-21 18:30:00+05:30',
        NULL, NULL,
        36, TRUE, 54000,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000485', '00000000-0000-0000-0000-000000000012', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000485', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000485', 'f0000000-0000-0000-0000-000000000008', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000486', 'TSK-NEX-018', 1, 'Weather impact weighting for monsoon and heavy rainfall zones', 'Detailed technical description and specification for Weather impact weighting for monsoon and heavy rainfall zones',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666661', 'MEDIUM',
        'b0000000-0000-0000-0000-000000000002', NULL,
        '10000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000485',
        'c0000000-0000-0000-0000-000000000003', 5, 'M', '2026-09-18 09:30:00+05:30', '2026-10-23 18:30:00+05:30',
        NULL, NULL,
        14, TRUE, 21000,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000486', '00000000-0000-0000-0000-000000000004', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000486', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000486', 'f0000000-0000-0000-0000-000000000008', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000487', 'TSK-NEX-019', 1, 'Driver mandatory rest stop calculation into remaining transit time', 'Detailed technical description and specification for Driver mandatory rest stop calculation into remaining transit time',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666661', 'LOW',
        'b0000000-0000-0000-0000-000000000002', NULL,
        '10000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000485',
        'c0000000-0000-0000-0000-000000000003', 3, 'S', '2026-09-19 09:30:00+05:30', '2026-10-25 18:30:00+05:30',
        NULL, NULL,
        10, TRUE, 15000,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000487', '00000000-0000-0000-0000-000000000006', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000487', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000487', 'f0000000-0000-0000-0000-000000000008', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000488', 'TSK-NEX-020', 1, 'Bug: Timezone offset error when consignment crosses state borders', 'Detailed technical description and specification for Bug: Timezone offset error when consignment crosses state borders',
        'TASK', '55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666667', 'LOW',
        'b0000000-0000-0000-0000-000000000002', NULL,
        '10000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000485',
        'c0000000-0000-0000-0000-000000000003', 2, 'XS', '2026-09-20 09:30:00+05:30', '2026-10-27 18:30:00+05:30',
        '2026-09-20 09:30:00+05:30', '2026-10-27 18:30:00+05:30',
        4, TRUE, 6000,
        '11111111-1111-1111-1111-111111111113', '{"environment":"Staging","steps_to_reproduce":"1. Navigate to target module screen.\n2. Enter boundary test data.\n3. Click proceed and observe behavior.","expected_behavior":"Operation should complete with valid response without errors.","actual_behavior":"System displays error notification or unexpected validation output.","reproduction_frequency":"Always"}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000488', '00000000-0000-0000-0000-000000000005', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000488', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000488', 'f0000000-0000-0000-0000-000000000008', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000488', '00000000-0000-0000-0000-000000000005', CURRENT_DATE - 2, 4, TRUE, 'Implementation and code review work for TSK-NEX-020', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000489', 'TSK-NEX-021', 1, 'Issue: Webhook delivery failure to NexGen internal SAP ERP', 'Detailed technical description and specification for Issue: Webhook delivery failure to NexGen internal SAP ERP',
        'TASK', '55555555-5555-5555-5555-555555555553', '66666666-6666-6666-6666-666666666662', 'HIGH',
        'b0000000-0000-0000-0000-000000000002', NULL,
        '10000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000485',
        'c0000000-0000-0000-0000-000000000003', 5, 'M', '2026-09-01 09:30:00+05:30', '2026-10-09 18:30:00+05:30',
        '2026-09-01 09:30:00+05:30', NULL,
        12, TRUE, 18000,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000489', '00000000-0000-0000-0000-000000000008', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000489', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000489', 'f0000000-0000-0000-0000-000000000008', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000489', '00000000-0000-0000-0000-000000000008', CURRENT_DATE - 2, 7, TRUE, 'Implementation and code review work for TSK-NEX-021', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000048a', 'TSK-NEX-022', 1, 'Enhancement: Fullscreen operations control room view with auto-cycling tabs', 'Detailed technical description and specification for Enhancement: Fullscreen operations control room view with auto-cycling tabs',
        'TASK', '55555555-5555-5555-5555-555555555554', '66666666-6666-6666-6666-666666666661', 'LOW',
        'b0000000-0000-0000-0000-000000000002', NULL,
        '10000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000485',
        'c0000000-0000-0000-0000-000000000003', 3, 'S', '2026-09-02 09:30:00+05:30', '2026-10-04 18:30:00+05:30',
        NULL, NULL,
        8, TRUE, 12000,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000048a', '00000000-0000-0000-0000-000000000009', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-00000000048a', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000048a', 'f0000000-0000-0000-0000-000000000008', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000048b', 'TSK-NEX-023', 1, 'Support: Update destination coordinates for redirected truck #GJ-18-B-3344', 'Detailed technical description and specification for Support: Update destination coordinates for redirected truck #GJ-18-B-3344',
        'TASK', '55555555-5555-5555-5555-555555555556', '66666666-6666-6666-6666-666666666667', 'LOW',
        'b0000000-0000-0000-0000-000000000002', NULL,
        '10000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000485',
        'c0000000-0000-0000-0000-000000000003', 1, 'XS', '2026-09-03 09:30:00+05:30', '2026-10-06 18:30:00+05:30',
        '2026-09-03 09:30:00+05:30', '2026-10-06 18:30:00+05:30',
        2, TRUE, 3000,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000048b', '00000000-0000-0000-0000-000000000011', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-00000000048b', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000048b', 'f0000000-0000-0000-0000-000000000008', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000048b', '00000000-0000-0000-0000-000000000011', CURRENT_DATE - 2, 2, TRUE, 'Implementation and code review work for TSK-NEX-023', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000048c', 'TSK-NEX-024', 1, 'Training: Driver checklist walkthrough for cold storage logistics', 'Detailed technical description and specification for Training: Driver checklist walkthrough for cold storage logistics',
        'TASK', '55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666661', 'LOW',
        'b0000000-0000-0000-0000-000000000002', NULL,
        '10000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000485',
        'c0000000-0000-0000-0000-000000000003', 2, 'XS', '2026-09-04 09:30:00+05:30', '2026-10-08 18:30:00+05:30',
        NULL, NULL,
        4, TRUE, 6000,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000048c', '00000000-0000-0000-0000-000000000003', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-00000000048c', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000048c', 'f0000000-0000-0000-0000-000000000008', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000048d', 'TSK-NEX-025', 1, 'Epic: Multi-Depot Fleet Health & Preventive Diagnostic Matrix', 'Detailed technical description and specification for Epic: Multi-Depot Fleet Health & Preventive Diagnostic Matrix',
        'EPIC', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666661', 'HIGH',
        'b0000000-0000-0000-0000-000000000002', NULL,
        '10000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005', NULL,
        'c0000000-0000-0000-0000-000000000003', 21, 'XL', '2026-09-05 09:30:00+05:30', '2026-10-10 18:30:00+05:30',
        NULL, NULL,
        50, TRUE, 75000,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000048d', '00000000-0000-0000-0000-000000000006', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-00000000048d', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000048d', 'f0000000-0000-0000-0000-000000000008', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000048e', 'TSK-NEX-026', 1, 'Engine coolant temperature anomaly detection rule', 'Detailed technical description and specification for Engine coolant temperature anomaly detection rule',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666667', 'MEDIUM',
        'b0000000-0000-0000-0000-000000000002', NULL,
        '10000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-00000000048d',
        'c0000000-0000-0000-0000-000000000003', 3, 'S', '2026-09-06 09:30:00+05:30', '2026-10-12 18:30:00+05:30',
        '2026-09-06 09:30:00+05:30', '2026-10-12 18:30:00+05:30',
        10, TRUE, 15000,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000048e', '00000000-0000-0000-0000-000000000007', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-00000000048e', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000048e', 'f0000000-0000-0000-0000-000000000008', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000048e', '00000000-0000-0000-0000-000000000007', CURRENT_DATE - 2, 10, TRUE, 'Implementation and code review work for TSK-NEX-026', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000048f', 'TSK-NEX-027', 1, 'Fleet maintenance cost ledger per kilometer driven', 'Detailed technical description and specification for Fleet maintenance cost ledger per kilometer driven',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666662', 'HIGH',
        'b0000000-0000-0000-0000-000000000002', NULL,
        '10000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-00000000048d',
        'c0000000-0000-0000-0000-000000000003', 5, 'M', '2026-09-07 09:30:00+05:30', '2026-10-14 18:30:00+05:30',
        '2026-09-07 09:30:00+05:30', NULL,
        16, TRUE, 24000,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000048f', '00000000-0000-0000-0000-000000000008', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-00000000048f', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000048f', 'f0000000-0000-0000-0000-000000000008', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000048f', '00000000-0000-0000-0000-000000000008', CURRENT_DATE - 2, 9, TRUE, 'Implementation and code review work for TSK-NEX-027', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000490', 'TSK-NEX-028', 1, 'Bug: Fleet manager export button disabled on Firefox browser', 'Detailed technical description and specification for Bug: Fleet manager export button disabled on Firefox browser',
        'TASK', '55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666667', 'LOW',
        'b0000000-0000-0000-0000-000000000002', NULL,
        '10000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-00000000048d',
        'c0000000-0000-0000-0000-000000000003', 1, 'XS', '2026-09-08 09:30:00+05:30', '2026-10-16 18:30:00+05:30',
        '2026-09-08 09:30:00+05:30', '2026-10-16 18:30:00+05:30',
        2, TRUE, 3000,
        '11111111-1111-1111-1111-111111111113', '{"environment":"Staging","steps_to_reproduce":"1. Navigate to target module screen.\n2. Enter boundary test data.\n3. Click proceed and observe behavior.","expected_behavior":"Operation should complete with valid response without errors.","actual_behavior":"System displays error notification or unexpected validation output.","reproduction_frequency":"Always"}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000490', '00000000-0000-0000-0000-000000000005', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000490', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000490', 'f0000000-0000-0000-0000-000000000008', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000490', '00000000-0000-0000-0000-000000000005', CURRENT_DATE - 2, 2, TRUE, 'Implementation and code review work for TSK-NEX-028', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000491', 'TSK-NEX-029', 1, 'Enhancement: Dark mode high-contrast map tiles for night-shift dispatchers', 'Detailed technical description and specification for Enhancement: Dark mode high-contrast map tiles for night-shift dispatchers',
        'TASK', '55555555-5555-5555-5555-555555555554', '66666666-6666-6666-6666-666666666667', 'LOW',
        'b0000000-0000-0000-0000-000000000002', NULL,
        '10000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-00000000048d',
        'c0000000-0000-0000-0000-000000000003', 2, 'XS', '2026-09-09 09:30:00+05:30', '2026-10-11 18:30:00+05:30',
        '2026-09-09 09:30:00+05:30', '2026-10-11 18:30:00+05:30',
        6, TRUE, 9000,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000491', '00000000-0000-0000-0000-000000000012', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000491', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000491', 'f0000000-0000-0000-0000-000000000008', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000491', '00000000-0000-0000-0000-000000000012', CURRENT_DATE - 2, 6, TRUE, 'Implementation and code review work for TSK-NEX-029', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000492', 'TSK-NEX-030', 1, 'Issue: WebSocket disconnect during high concurrent user monitoring', 'Detailed technical description and specification for Issue: WebSocket disconnect during high concurrent user monitoring',
        'TASK', '55555555-5555-5555-5555-555555555553', '66666666-6666-6666-6666-666666666665', 'CRITICAL',
        'b0000000-0000-0000-0000-000000000002', NULL,
        '10000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-00000000048d',
        'c0000000-0000-0000-0000-000000000003', 8, 'L', '2026-09-10 09:30:00+05:30', '2026-10-13 18:30:00+05:30',
        '2026-09-10 09:30:00+05:30', NULL,
        18, TRUE, 27000,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000492', '00000000-0000-0000-0000-000000000005', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000492', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000492', 'f0000000-0000-0000-0000-000000000008', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000492', '00000000-0000-0000-0000-000000000005', CURRENT_DATE - 2, 10, TRUE, 'Implementation and code review work for TSK-NEX-030', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000493', 'TSK-NEX-031', 1, 'Implement Redis adapter for socket.io across multiple server nodes', 'Detailed technical description and specification for Implement Redis adapter for socket.io across multiple server nodes',
        'SUBTASK', '55555555-5555-5555-5555-555555555553', '66666666-6666-6666-6666-666666666665', 'HIGH',
        'b0000000-0000-0000-0000-000000000002', NULL,
        '10000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000492',
        'c0000000-0000-0000-0000-000000000003', 5, 'M', '2026-09-11 09:30:00+05:30', '2026-10-15 18:30:00+05:30',
        '2026-09-11 09:30:00+05:30', NULL,
        12, TRUE, 18000,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000493', '00000000-0000-0000-0000-000000000010', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000493', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000493', 'f0000000-0000-0000-0000-000000000008', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000493', '00000000-0000-0000-0000-000000000010', CURRENT_DATE - 2, 7, TRUE, 'Implementation and code review work for TSK-NEX-031', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000494', 'TSK-NEX-032', 1, 'Add client auto-reconnect with exponential heartbeat retry', 'Detailed technical description and specification for Add client auto-reconnect with exponential heartbeat retry',
        'SUBTASK', '55555555-5555-5555-5555-555555555553', '66666666-6666-6666-6666-666666666667', 'MEDIUM',
        'b0000000-0000-0000-0000-000000000002', NULL,
        '10000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000492',
        'c0000000-0000-0000-0000-000000000003', 3, 'S', '2026-09-12 09:30:00+05:30', '2026-10-17 18:30:00+05:30',
        '2026-09-12 09:30:00+05:30', '2026-10-17 18:30:00+05:30',
        6, TRUE, 9000,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000494', '00000000-0000-0000-0000-000000000007', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000494', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000494', 'f0000000-0000-0000-0000-000000000008', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000494', '00000000-0000-0000-0000-000000000007', CURRENT_DATE - 2, 6, TRUE, 'Implementation and code review work for TSK-NEX-032', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000495', 'TSK-NEX-033', 1, 'Support: Re-send unreceived daily temperature digest for client QA auditor', 'Detailed technical description and specification for Support: Re-send unreceived daily temperature digest for client QA auditor',
        'TASK', '55555555-5555-5555-5555-555555555556', '66666666-6666-6666-6666-666666666667', 'LOW',
        'b0000000-0000-0000-0000-000000000002', NULL,
        '10000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-00000000048d',
        'c0000000-0000-0000-0000-000000000003', 1, 'XS', '2026-09-13 09:30:00+05:30', '2026-10-19 18:30:00+05:30',
        '2026-09-13 09:30:00+05:30', '2026-10-19 18:30:00+05:30',
        2, TRUE, 3000,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000495', '00000000-0000-0000-0000-000000000011', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000495', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000495', 'f0000000-0000-0000-0000-000000000008', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000495', '00000000-0000-0000-0000-000000000011', CURRENT_DATE - 2, 2, TRUE, 'Implementation and code review work for TSK-NEX-033', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000496', 'TSK-NEX-034', 1, 'Training: Client safety compliance lead training on generating audit packages', 'Detailed technical description and specification for Training: Client safety compliance lead training on generating audit packages',
        'TASK', '55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666667', 'LOW',
        'b0000000-0000-0000-0000-000000000002', NULL,
        '10000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-00000000048d',
        'c0000000-0000-0000-0000-000000000003', 2, 'XS', '2026-09-14 09:30:00+05:30', '2026-10-21 18:30:00+05:30',
        '2026-09-14 09:30:00+05:30', '2026-10-21 18:30:00+05:30',
        4, TRUE, 6000,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000496', '00000000-0000-0000-0000-000000000003', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000496', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000496', 'f0000000-0000-0000-0000-000000000008', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000496', '00000000-0000-0000-0000-000000000003', CURRENT_DATE - 2, 4, TRUE, 'Implementation and code review work for TSK-NEX-034', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000497', 'TSK-NEX-035', 1, 'Enhancement: Real-time sound notification in dispatch room on critical temp surge', 'Detailed technical description and specification for Enhancement: Real-time sound notification in dispatch room on critical temp surge',
        'TASK', '55555555-5555-5555-5555-555555555554', '66666666-6666-6666-6666-666666666666', 'HIGH',
        'b0000000-0000-0000-0000-000000000002', NULL,
        '10000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-00000000048d',
        'c0000000-0000-0000-0000-000000000003', 2, 'XS', '2026-09-15 09:30:00+05:30', '2026-10-23 18:30:00+05:30',
        '2026-09-15 09:30:00+05:30', NULL,
        6, TRUE, 9000,
        '11111111-1111-1111-1111-111111111113', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000497', '00000000-0000-0000-0000-000000000012', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000497', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000497', 'f0000000-0000-0000-0000-000000000008', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000498', 'TSK-ZEN-001', 1, 'Epic: Zenith Retail Multi-Store POS Offline Engine', 'Detailed technical description and specification for Epic: Zenith Retail Multi-Store POS Offline Engine',
        'EPIC', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666662', 'CRITICAL',
        'b0000000-0000-0000-0000-000000000003', NULL,
        '10000000-0000-0000-0000-000000000006', '12000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000006', NULL,
        'c0000000-0000-0000-0000-000000000002', 21, 'XL', '2026-09-01 09:30:00+05:30', '2026-10-03 18:30:00+05:30',
        '2026-09-01 09:30:00+05:30', NULL,
        60, TRUE, 90000,
        '11111111-1111-1111-1111-111111111112', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000498', '00000000-0000-0000-0000-000000000004', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000498', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000498', 'f0000000-0000-0000-0000-000000000009', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000498', '00000000-0000-0000-0000-000000000004', CURRENT_DATE - 2, 36, TRUE, 'Implementation and code review work for TSK-ZEN-001', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-000000000499', 'TSK-ZEN-002', 1, 'Local SQLite offline transaction ledger with auto-sync daemon', 'Detailed technical description and specification for Local SQLite offline transaction ledger with auto-sync daemon',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666667', 'CRITICAL',
        'b0000000-0000-0000-0000-000000000003', NULL,
        '10000000-0000-0000-0000-000000000006', '12000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000498',
        'c0000000-0000-0000-0000-000000000002', 8, 'L', '2026-09-02 09:30:00+05:30', '2026-10-05 18:30:00+05:30',
        '2026-09-02 09:30:00+05:30', '2026-10-05 18:30:00+05:30',
        24, TRUE, 36000,
        '11111111-1111-1111-1111-111111111112', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-000000000499', '00000000-0000-0000-0000-000000000006', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000499', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-000000000499', 'f0000000-0000-0000-0000-000000000009', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-000000000499', '00000000-0000-0000-0000-000000000006', CURRENT_DATE - 2, 24, TRUE, 'Implementation and code review work for TSK-ZEN-002', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

      INSERT INTO task_comments (task_id, user_id, comment_text, is_internal_only, created_by)
      VALUES ('20000000-0000-0000-0000-000000000499', '00000000-0000-0000-0000-000000000006', 'Status update: Technical solution implemented, unit tests passed, ready for verification on staging environment.', FALSE, v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000049a', 'TSK-ZEN-003', 1, 'Fast barcode lookup index across 80,000 retail SKUs (< 20ms)', 'Detailed technical description and specification for Fast barcode lookup index across 80,000 retail SKUs (< 20ms)',
        'SUBTASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666667', 'HIGH',
        'b0000000-0000-0000-0000-000000000003', NULL,
        '10000000-0000-0000-0000-000000000006', '12000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000499',
        'c0000000-0000-0000-0000-000000000002', 5, 'M', '2026-09-03 09:30:00+05:30', '2026-10-07 18:30:00+05:30',
        '2026-09-03 09:30:00+05:30', '2026-10-07 18:30:00+05:30',
        14, TRUE, 21000,
        '11111111-1111-1111-1111-111111111112', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000049a', '00000000-0000-0000-0000-000000000007', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-00000000049a', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000049a', 'f0000000-0000-0000-0000-000000000009', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000049a', '00000000-0000-0000-0000-000000000007', CURRENT_DATE - 2, 14, TRUE, 'Implementation and code review work for TSK-ZEN-003', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000049b', 'TSK-ZEN-004', 1, 'Receipt printer ESC/POS serial and USB driver communication bridge', 'Detailed technical description and specification for Receipt printer ESC/POS serial and USB driver communication bridge',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666665', 'HIGH',
        'b0000000-0000-0000-0000-000000000003', NULL,
        '10000000-0000-0000-0000-000000000006', '12000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000498',
        'c0000000-0000-0000-0000-000000000002', 5, 'M', '2026-09-04 09:30:00+05:30', '2026-10-09 18:30:00+05:30',
        '2026-09-04 09:30:00+05:30', NULL,
        16, TRUE, 24000,
        '11111111-1111-1111-1111-111111111112', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000049b', '00000000-0000-0000-0000-000000000010', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-00000000049b', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000049b', 'f0000000-0000-0000-0000-000000000009', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000049b', '00000000-0000-0000-0000-000000000010', CURRENT_DATE - 2, 9, TRUE, 'Implementation and code review work for TSK-ZEN-004', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000049c', 'TSK-ZEN-005', 1, 'Bug: Cash drawer fails to kick open when tender type is Split Cash/UPI', 'Detailed technical description and specification for Bug: Cash drawer fails to kick open when tender type is Split Cash/UPI',
        'TASK', '55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666665', 'HIGH',
        'b0000000-0000-0000-0000-000000000003', NULL,
        '10000000-0000-0000-0000-000000000006', '12000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000498',
        'c0000000-0000-0000-0000-000000000002', 3, 'S', '2026-09-05 09:30:00+05:30', '2026-10-11 18:30:00+05:30',
        '2026-09-05 09:30:00+05:30', NULL,
        8, TRUE, 12000,
        '11111111-1111-1111-1111-111111111112', '{"environment":"Staging","steps_to_reproduce":"1. Navigate to target module screen.\n2. Enter boundary test data.\n3. Click proceed and observe behavior.","expected_behavior":"Operation should complete with valid response without errors.","actual_behavior":"System displays error notification or unexpected validation output.","reproduction_frequency":"Always"}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000049c', '00000000-0000-0000-0000-000000000005', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-00000000049c', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000049c', 'f0000000-0000-0000-0000-000000000009', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000049c', '00000000-0000-0000-0000-000000000005', CURRENT_DATE - 2, 4, TRUE, 'Implementation and code review work for TSK-ZEN-005', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

      INSERT INTO task_comments (task_id, user_id, comment_text, is_internal_only, created_by)
      VALUES ('20000000-0000-0000-0000-00000000049c', '00000000-0000-0000-0000-000000000005', 'Status update: Technical solution implemented, unit tests passed, ready for verification on staging environment.', FALSE, v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000049d', 'TSK-ZEN-006', 1, 'Send hex 1B 70 pulse command on all successful split tender completions', 'Detailed technical description and specification for Send hex 1B 70 pulse command on all successful split tender completions',
        'SUBTASK', '55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666667', 'MEDIUM',
        'b0000000-0000-0000-0000-000000000003', NULL,
        '10000000-0000-0000-0000-000000000006', '12000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-00000000049c',
        'c0000000-0000-0000-0000-000000000002', 1, 'XS', '2026-09-06 09:30:00+05:30', '2026-10-13 18:30:00+05:30',
        '2026-09-06 09:30:00+05:30', '2026-10-13 18:30:00+05:30',
        3, TRUE, 4500,
        '11111111-1111-1111-1111-111111111112', '{"environment":"Staging","steps_to_reproduce":"1. Navigate to target module screen.\n2. Enter boundary test data.\n3. Click proceed and observe behavior.","expected_behavior":"Operation should complete with valid response without errors.","actual_behavior":"System displays error notification or unexpected validation output.","reproduction_frequency":"Always"}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000049d', '00000000-0000-0000-0000-000000000010', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-00000000049d', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000049d', 'f0000000-0000-0000-0000-000000000009', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000049d', '00000000-0000-0000-0000-000000000010', CURRENT_DATE - 2, 3, TRUE, 'Implementation and code review work for TSK-ZEN-006', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000049e', 'TSK-ZEN-007', 1, 'Epic: Real-Time Store Inventory Synchronization & Low-Stock Alerts', 'Detailed technical description and specification for Epic: Real-Time Store Inventory Synchronization & Low-Stock Alerts',
        'EPIC', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666662', 'HIGH',
        'b0000000-0000-0000-0000-000000000003', NULL,
        '10000000-0000-0000-0000-000000000006', '12000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000006', NULL,
        'c0000000-0000-0000-0000-000000000002', 13, 'XL', '2026-09-07 09:30:00+05:30', '2026-10-15 18:30:00+05:30',
        '2026-09-07 09:30:00+05:30', NULL,
        40, TRUE, 60000,
        '11111111-1111-1111-1111-111111111112', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000049e', '00000000-0000-0000-0000-000000000004', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-00000000049e', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000049e', 'f0000000-0000-0000-0000-000000000009', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000049e', '00000000-0000-0000-0000-000000000004', CURRENT_DATE - 2, 24, TRUE, 'Implementation and code review work for TSK-ZEN-007', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-00000000049f', 'TSK-ZEN-008', 1, 'Two-way delta sync between cloud ERP and 150 physical store registers', 'Detailed technical description and specification for Two-way delta sync between cloud ERP and 150 physical store registers',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666663', 'HIGH',
        'b0000000-0000-0000-0000-000000000003', NULL,
        '10000000-0000-0000-0000-000000000006', '12000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-00000000049e',
        'c0000000-0000-0000-0000-000000000002', 5, 'M', '2026-09-08 09:30:00+05:30', '2026-10-10 18:30:00+05:30',
        '2026-09-08 09:30:00+05:30', NULL,
        18, TRUE, 27000,
        '11111111-1111-1111-1111-111111111112', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-00000000049f', '00000000-0000-0000-0000-000000000006', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-00000000049f', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-00000000049f', 'f0000000-0000-0000-0000-000000000009', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-00000000049f', '00000000-0000-0000-0000-000000000006', CURRENT_DATE - 2, 10, TRUE, 'Implementation and code review work for TSK-ZEN-008', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

      INSERT INTO task_comments (task_id, user_id, comment_text, is_internal_only, created_by)
      VALUES ('20000000-0000-0000-0000-00000000049f', '00000000-0000-0000-0000-000000000006', 'Status update: Technical solution implemented, unit tests passed, ready for verification on staging environment.', FALSE, v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000004a0', 'TSK-ZEN-009', 1, 'Automated stock replenishment PO creation when item reaches safety stock', 'Detailed technical description and specification for Automated stock replenishment PO creation when item reaches safety stock',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666664', 'MEDIUM',
        'b0000000-0000-0000-0000-000000000003', NULL,
        '10000000-0000-0000-0000-000000000006', '12000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-00000000049e',
        'c0000000-0000-0000-0000-000000000002', 5, 'M', '2026-09-09 09:30:00+05:30', '2026-10-12 18:30:00+05:30',
        '2026-09-09 09:30:00+05:30', NULL,
        14, TRUE, 21000,
        '11111111-1111-1111-1111-111111111112', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004a0', '00000000-0000-0000-0000-000000000005', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004a0', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004a0', 'f0000000-0000-0000-0000-000000000009', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000004a1', 'TSK-ZEN-010', 1, 'Enhancement: Quick search shortcut keys (F1 to F12) for cashier ergonomics', 'Detailed technical description and specification for Enhancement: Quick search shortcut keys (F1 to F12) for cashier ergonomics',
        'TASK', '55555555-5555-5555-5555-555555555554', '66666666-6666-6666-6666-666666666667', 'LOW',
        'b0000000-0000-0000-0000-000000000003', NULL,
        '10000000-0000-0000-0000-000000000006', '12000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-00000000049e',
        'c0000000-0000-0000-0000-000000000002', 2, 'XS', '2026-09-10 09:30:00+05:30', '2026-10-14 18:30:00+05:30',
        '2026-09-10 09:30:00+05:30', '2026-10-14 18:30:00+05:30',
        6, TRUE, 9000,
        '11111111-1111-1111-1111-111111111112', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004a1', '00000000-0000-0000-0000-000000000008', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004a1', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004a1', 'f0000000-0000-0000-0000-000000000009', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-0000000004a1', '00000000-0000-0000-0000-000000000008', CURRENT_DATE - 2, 6, TRUE, 'Implementation and code review work for TSK-ZEN-010', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000004a2', 'TSK-ZEN-011', 1, 'Issue: Transaction conflict when same item is sold simultaneously in 2 aisles', 'Detailed technical description and specification for Issue: Transaction conflict when same item is sold simultaneously in 2 aisles',
        'TASK', '55555555-5555-5555-5555-555555555553', '66666666-6666-6666-6666-666666666667', 'HIGH',
        'b0000000-0000-0000-0000-000000000003', NULL,
        '10000000-0000-0000-0000-000000000006', '12000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-00000000049e',
        'c0000000-0000-0000-0000-000000000002', 5, 'M', '2026-09-11 09:30:00+05:30', '2026-10-16 18:30:00+05:30',
        '2026-09-11 09:30:00+05:30', '2026-10-16 18:30:00+05:30',
        12, TRUE, 18000,
        '11111111-1111-1111-1111-111111111112', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004a2', '00000000-0000-0000-0000-000000000009', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004a2', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004a2', 'f0000000-0000-0000-0000-000000000009', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-0000000004a2', '00000000-0000-0000-0000-000000000009', CURRENT_DATE - 2, 12, TRUE, 'Implementation and code review work for TSK-ZEN-011', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

      INSERT INTO task_comments (task_id, user_id, comment_text, is_internal_only, created_by)
      VALUES ('20000000-0000-0000-0000-0000000004a2', '00000000-0000-0000-0000-000000000009', 'Status update: Technical solution implemented, unit tests passed, ready for verification on staging environment.', FALSE, v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000004a3', 'TSK-ZEN-012', 1, 'Support: Re-print damaged customer invoice for Store #04 Pune', 'Detailed technical description and specification for Support: Re-print damaged customer invoice for Store #04 Pune',
        'TASK', '55555555-5555-5555-5555-555555555556', '66666666-6666-6666-6666-666666666667', 'LOW',
        'b0000000-0000-0000-0000-000000000003', NULL,
        '10000000-0000-0000-0000-000000000006', '12000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-00000000049e',
        'c0000000-0000-0000-0000-000000000002', 1, 'XS', '2026-09-12 09:30:00+05:30', '2026-10-18 18:30:00+05:30',
        '2026-09-12 09:30:00+05:30', '2026-10-18 18:30:00+05:30',
        2, TRUE, 3000,
        '11111111-1111-1111-1111-111111111112', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004a3', '00000000-0000-0000-0000-000000000011', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004a3', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004a3', 'f0000000-0000-0000-0000-000000000009', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-0000000004a3', '00000000-0000-0000-0000-000000000011', CURRENT_DATE - 2, 2, TRUE, 'Implementation and code review work for TSK-ZEN-012', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000004a4', 'TSK-ZEN-013', 1, 'Training: Cashier training session on handling return merchandise authorization', 'Detailed technical description and specification for Training: Cashier training session on handling return merchandise authorization',
        'TASK', '55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666667', 'MEDIUM',
        'b0000000-0000-0000-0000-000000000003', NULL,
        '10000000-0000-0000-0000-000000000006', '12000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-00000000049e',
        'c0000000-0000-0000-0000-000000000002', 2, 'XS', '2026-09-13 09:30:00+05:30', '2026-10-20 18:30:00+05:30',
        '2026-09-13 09:30:00+05:30', '2026-10-20 18:30:00+05:30',
        4, TRUE, 6000,
        '11111111-1111-1111-1111-111111111112', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004a4', '00000000-0000-0000-0000-000000000003', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004a4', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004a4', 'f0000000-0000-0000-0000-000000000009', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-0000000004a4', '00000000-0000-0000-0000-000000000003', CURRENT_DATE - 2, 4, TRUE, 'Implementation and code review work for TSK-ZEN-013', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000004a5', 'TSK-ZEN-014', 1, 'Enhancement: Customer loyalty points balance lookup via mobile number', 'Detailed technical description and specification for Enhancement: Customer loyalty points balance lookup via mobile number',
        'TASK', '55555555-5555-5555-5555-555555555554', '66666666-6666-6666-6666-666666666662', 'MEDIUM',
        'b0000000-0000-0000-0000-000000000003', NULL,
        '10000000-0000-0000-0000-000000000006', '12000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-00000000049e',
        'c0000000-0000-0000-0000-000000000002', 3, 'S', '2026-09-14 09:30:00+05:30', '2026-10-22 18:30:00+05:30',
        '2026-09-14 09:30:00+05:30', NULL,
        10, TRUE, 15000,
        '11111111-1111-1111-1111-111111111112', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004a5', '00000000-0000-0000-0000-000000000006', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004a5', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004a5', 'f0000000-0000-0000-0000-000000000009', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-0000000004a5', '00000000-0000-0000-0000-000000000006', CURRENT_DATE - 2, 6, TRUE, 'Implementation and code review work for TSK-ZEN-014', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000004a6', 'TSK-ZEN-015', 1, 'Bug: Promotional discount coupon applied twice on item exchange', 'Detailed technical description and specification for Bug: Promotional discount coupon applied twice on item exchange',
        'TASK', '55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666664', 'HIGH',
        'b0000000-0000-0000-0000-000000000003', NULL,
        '10000000-0000-0000-0000-000000000006', '12000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-00000000049e',
        'c0000000-0000-0000-0000-000000000002', 3, 'S', '2026-09-15 09:30:00+05:30', '2026-10-17 18:30:00+05:30',
        '2026-09-15 09:30:00+05:30', NULL,
        8, TRUE, 12000,
        '11111111-1111-1111-1111-111111111112', '{"environment":"Staging","steps_to_reproduce":"1. Navigate to target module screen.\n2. Enter boundary test data.\n3. Click proceed and observe behavior.","expected_behavior":"Operation should complete with valid response without errors.","actual_behavior":"System displays error notification or unexpected validation output.","reproduction_frequency":"Always"}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004a6', '00000000-0000-0000-0000-000000000005', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004a6', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004a6', 'f0000000-0000-0000-0000-000000000009', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000004a7', 'TSK-ZEN-016', 1, 'Enforce single coupon validation rule per checkout session', 'Detailed technical description and specification for Enforce single coupon validation rule per checkout session',
        'SUBTASK', '55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666664', 'MEDIUM',
        'b0000000-0000-0000-0000-000000000003', NULL,
        '10000000-0000-0000-0000-000000000006', '12000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004a6',
        'c0000000-0000-0000-0000-000000000002', 1, 'XS', '2026-09-16 09:30:00+05:30', '2026-10-19 18:30:00+05:30',
        '2026-09-16 09:30:00+05:30', NULL,
        3, TRUE, 4500,
        '11111111-1111-1111-1111-111111111112', '{"environment":"Staging","steps_to_reproduce":"1. Navigate to target module screen.\n2. Enter boundary test data.\n3. Click proceed and observe behavior.","expected_behavior":"Operation should complete with valid response without errors.","actual_behavior":"System displays error notification or unexpected validation output.","reproduction_frequency":"Always"}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004a7', '00000000-0000-0000-0000-000000000010', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004a7', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004a7', 'f0000000-0000-0000-0000-000000000009', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000004a8', 'TSK-ZEN-017', 1, 'Epic: Multi-Tender Payment Integration (Card, Cash, UPI, Gift Voucher)', 'Detailed technical description and specification for Epic: Multi-Tender Payment Integration (Card, Cash, UPI, Gift Voucher)',
        'EPIC', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666661', 'HIGH',
        'b0000000-0000-0000-0000-000000000003', NULL,
        '10000000-0000-0000-0000-000000000006', '12000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000006', NULL,
        'c0000000-0000-0000-0000-000000000002', 13, 'XL', '2026-09-17 09:30:00+05:30', '2026-10-21 18:30:00+05:30',
        NULL, NULL,
        36, TRUE, 54000,
        '11111111-1111-1111-1111-111111111112', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004a8', '00000000-0000-0000-0000-000000000009', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004a8', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004a8', 'f0000000-0000-0000-0000-000000000009', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000004a9', 'TSK-ZEN-018', 1, 'Pine Labs / MSwipe Android EDC POS machine integration API', 'Detailed technical description and specification for Pine Labs / MSwipe Android EDC POS machine integration API',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666661', 'HIGH',
        'b0000000-0000-0000-0000-000000000003', NULL,
        '10000000-0000-0000-0000-000000000006', '12000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004a8',
        'c0000000-0000-0000-0000-000000000002', 5, 'M', '2026-09-18 09:30:00+05:30', '2026-10-23 18:30:00+05:30',
        NULL, NULL,
        16, TRUE, 24000,
        '11111111-1111-1111-1111-111111111112', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004a9', '00000000-0000-0000-0000-000000000012', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004a9', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004a9', 'f0000000-0000-0000-0000-000000000009', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000004aa', 'TSK-ZEN-019', 1, 'Dynamic customer-facing screen QR code generation on bill total', 'Detailed technical description and specification for Dynamic customer-facing screen QR code generation on bill total',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666661', 'MEDIUM',
        'b0000000-0000-0000-0000-000000000003', NULL,
        '10000000-0000-0000-0000-000000000006', '12000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004a8',
        'c0000000-0000-0000-0000-000000000002', 3, 'S', '2026-09-19 09:30:00+05:30', '2026-10-25 18:30:00+05:30',
        NULL, NULL,
        10, TRUE, 15000,
        '11111111-1111-1111-1111-111111111112', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004aa', '00000000-0000-0000-0000-000000000004', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004aa', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004aa', 'f0000000-0000-0000-0000-000000000009', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000004ab', 'TSK-ZEN-020', 1, 'Bug: Shift closing register cash variance calculation rounded incorrectly', 'Detailed technical description and specification for Bug: Shift closing register cash variance calculation rounded incorrectly',
        'TASK', '55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666667', 'LOW',
        'b0000000-0000-0000-0000-000000000003', NULL,
        '10000000-0000-0000-0000-000000000006', '12000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004a8',
        'c0000000-0000-0000-0000-000000000002', 2, 'XS', '2026-09-20 09:30:00+05:30', '2026-10-27 18:30:00+05:30',
        '2026-09-20 09:30:00+05:30', '2026-10-27 18:30:00+05:30',
        4, TRUE, 6000,
        '11111111-1111-1111-1111-111111111112', '{"environment":"Staging","steps_to_reproduce":"1. Navigate to target module screen.\n2. Enter boundary test data.\n3. Click proceed and observe behavior.","expected_behavior":"Operation should complete with valid response without errors.","actual_behavior":"System displays error notification or unexpected validation output.","reproduction_frequency":"Always"}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004ab', '00000000-0000-0000-0000-000000000010', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004ab', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004ab', 'f0000000-0000-0000-0000-000000000009', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-0000000004ab', '00000000-0000-0000-0000-000000000010', CURRENT_DATE - 2, 4, TRUE, 'Implementation and code review work for TSK-ZEN-020', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000004ac', 'TSK-ZEN-021', 1, 'Issue: Electron desktop app memory bloat after 14-hour continuous store shift', 'Detailed technical description and specification for Issue: Electron desktop app memory bloat after 14-hour continuous store shift',
        'TASK', '55555555-5555-5555-5555-555555555553', '66666666-6666-6666-6666-666666666662', 'HIGH',
        'b0000000-0000-0000-0000-000000000003', NULL,
        '10000000-0000-0000-0000-000000000006', '12000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004a8',
        'c0000000-0000-0000-0000-000000000002', 5, 'M', '2026-09-01 09:30:00+05:30', '2026-10-09 18:30:00+05:30',
        '2026-09-01 09:30:00+05:30', NULL,
        14, TRUE, 21000,
        '11111111-1111-1111-1111-111111111112', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004ac', '00000000-0000-0000-0000-000000000007', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004ac', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004ac', 'f0000000-0000-0000-0000-000000000009', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-0000000004ac', '00000000-0000-0000-0000-000000000007', CURRENT_DATE - 2, 8, TRUE, 'Implementation and code review work for TSK-ZEN-021', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000004ad', 'TSK-ZEN-022', 1, 'Enhancement: Automated daily end-of-day Z-Report generation and email', 'Detailed technical description and specification for Enhancement: Automated daily end-of-day Z-Report generation and email',
        'TASK', '55555555-5555-5555-5555-555555555554', '66666666-6666-6666-6666-666666666661', 'LOW',
        'b0000000-0000-0000-0000-000000000003', NULL,
        '10000000-0000-0000-0000-000000000006', '12000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004a8',
        'c0000000-0000-0000-0000-000000000002', 2, 'XS', '2026-09-02 09:30:00+05:30', '2026-10-04 18:30:00+05:30',
        NULL, NULL,
        6, TRUE, 9000,
        '11111111-1111-1111-1111-111111111112', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004ad', '00000000-0000-0000-0000-000000000008', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004ad', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004ad', 'f0000000-0000-0000-0000-000000000009', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000004ae', 'TSK-ZEN-023', 1, 'Support: Remote database reset for Store #12 register 2 hard crash', 'Detailed technical description and specification for Support: Remote database reset for Store #12 register 2 hard crash',
        'TASK', '55555555-5555-5555-5555-555555555556', '66666666-6666-6666-6666-666666666667', 'LOW',
        'b0000000-0000-0000-0000-000000000003', NULL,
        '10000000-0000-0000-0000-000000000006', '12000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004a8',
        'c0000000-0000-0000-0000-000000000002', 1, 'XS', '2026-09-03 09:30:00+05:30', '2026-10-06 18:30:00+05:30',
        '2026-09-03 09:30:00+05:30', '2026-10-06 18:30:00+05:30',
        2, TRUE, 3000,
        '11111111-1111-1111-1111-111111111112', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004ae', '00000000-0000-0000-0000-000000000011', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004ae', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004ae', 'f0000000-0000-0000-0000-000000000009', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-0000000004ae', '00000000-0000-0000-0000-000000000011', CURRENT_DATE - 2, 2, TRUE, 'Implementation and code review work for TSK-ZEN-023', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000004af', 'TSK-ZEN-024', 1, 'Training: Store managers webinar on inventory shrinkage reconciliation', 'Detailed technical description and specification for Training: Store managers webinar on inventory shrinkage reconciliation',
        'TASK', '55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666661', 'LOW',
        'b0000000-0000-0000-0000-000000000003', NULL,
        '10000000-0000-0000-0000-000000000006', '12000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004a8',
        'c0000000-0000-0000-0000-000000000002', 2, 'XS', '2026-09-04 09:30:00+05:30', '2026-10-08 18:30:00+05:30',
        NULL, NULL,
        4, TRUE, 6000,
        '11111111-1111-1111-1111-111111111112', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004af', '00000000-0000-0000-0000-000000000003', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004af', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004af', 'f0000000-0000-0000-0000-000000000009', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000004b0', 'TSK-ZEN-025', 1, 'Epic: Click-and-Collect Omnichannel Order Pickup & Returns Desk', 'Detailed technical description and specification for Epic: Click-and-Collect Omnichannel Order Pickup & Returns Desk',
        'EPIC', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666661', 'HIGH',
        'b0000000-0000-0000-0000-000000000003', NULL,
        '10000000-0000-0000-0000-000000000006', '12000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000006', NULL,
        'c0000000-0000-0000-0000-000000000002', 21, 'XL', '2026-09-05 09:30:00+05:30', '2026-10-10 18:30:00+05:30',
        NULL, NULL,
        50, TRUE, 75000,
        '11111111-1111-1111-1111-111111111112', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004b0', '00000000-0000-0000-0000-000000000004', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004b0', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004b0', 'f0000000-0000-0000-0000-000000000009', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000004b1', 'TSK-ZEN-026', 1, 'Customer OTP verification modal before order handover', 'Detailed technical description and specification for Customer OTP verification modal before order handover',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666667', 'MEDIUM',
        'b0000000-0000-0000-0000-000000000003', NULL,
        '10000000-0000-0000-0000-000000000006', '12000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004b0',
        'c0000000-0000-0000-0000-000000000002', 3, 'S', '2026-09-06 09:30:00+05:30', '2026-10-12 18:30:00+05:30',
        '2026-09-06 09:30:00+05:30', '2026-10-12 18:30:00+05:30',
        8, TRUE, 12000,
        '11111111-1111-1111-1111-111111111112', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004b1', '00000000-0000-0000-0000-000000000006', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004b1', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004b1', 'f0000000-0000-0000-0000-000000000009', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-0000000004b1', '00000000-0000-0000-0000-000000000006', CURRENT_DATE - 2, 8, TRUE, 'Implementation and code review work for TSK-ZEN-026', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000004b2', 'TSK-ZEN-027', 1, 'Return item inspection condition grading (Sellable, Damaged, Defective)', 'Detailed technical description and specification for Return item inspection condition grading (Sellable, Damaged, Defective)',
        'TASK', '55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666662', 'HIGH',
        'b0000000-0000-0000-0000-000000000003', NULL,
        '10000000-0000-0000-0000-000000000006', '12000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004b0',
        'c0000000-0000-0000-0000-000000000002', 5, 'M', '2026-09-07 09:30:00+05:30', '2026-10-14 18:30:00+05:30',
        '2026-09-07 09:30:00+05:30', NULL,
        16, TRUE, 24000,
        '11111111-1111-1111-1111-111111111112', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004b2', '00000000-0000-0000-0000-000000000007', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004b2', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004b2', 'f0000000-0000-0000-0000-000000000009', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-0000000004b2', '00000000-0000-0000-0000-000000000007', CURRENT_DATE - 2, 9, TRUE, 'Implementation and code review work for TSK-ZEN-027', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000004b3', 'TSK-ZEN-028', 1, 'Bug: Missing price tag barcode prints without leading zero', 'Detailed technical description and specification for Bug: Missing price tag barcode prints without leading zero',
        'TASK', '55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666667', 'LOW',
        'b0000000-0000-0000-0000-000000000003', NULL,
        '10000000-0000-0000-0000-000000000006', '12000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004b0',
        'c0000000-0000-0000-0000-000000000002', 1, 'XS', '2026-09-08 09:30:00+05:30', '2026-10-16 18:30:00+05:30',
        '2026-09-08 09:30:00+05:30', '2026-10-16 18:30:00+05:30',
        2, TRUE, 3000,
        '11111111-1111-1111-1111-111111111112', '{"environment":"Staging","steps_to_reproduce":"1. Navigate to target module screen.\n2. Enter boundary test data.\n3. Click proceed and observe behavior.","expected_behavior":"Operation should complete with valid response without errors.","actual_behavior":"System displays error notification or unexpected validation output.","reproduction_frequency":"Always"}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004b3', '00000000-0000-0000-0000-000000000010', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004b3', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004b3', 'f0000000-0000-0000-0000-000000000009', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-0000000004b3', '00000000-0000-0000-0000-000000000010', CURRENT_DATE - 2, 2, TRUE, 'Implementation and code review work for TSK-ZEN-028', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000004b4', 'TSK-ZEN-029', 1, 'Enhancement: Touchscreen friendly big-button interface for quick snack POS', 'Detailed technical description and specification for Enhancement: Touchscreen friendly big-button interface for quick snack POS',
        'TASK', '55555555-5555-5555-5555-555555555554', '66666666-6666-6666-6666-666666666667', 'LOW',
        'b0000000-0000-0000-0000-000000000003', NULL,
        '10000000-0000-0000-0000-000000000006', '12000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004b0',
        'c0000000-0000-0000-0000-000000000002', 3, 'S', '2026-09-09 09:30:00+05:30', '2026-10-11 18:30:00+05:30',
        '2026-09-09 09:30:00+05:30', '2026-10-11 18:30:00+05:30',
        8, TRUE, 12000,
        '11111111-1111-1111-1111-111111111112', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004b4', '00000000-0000-0000-0000-000000000009', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004b4', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004b4', 'f0000000-0000-0000-0000-000000000009', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-0000000004b4', '00000000-0000-0000-0000-000000000009', CURRENT_DATE - 2, 8, TRUE, 'Implementation and code review work for TSK-ZEN-029', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000004b5', 'TSK-ZEN-030', 1, 'Issue: Network latency over 4G backup dongle when broadband fails', 'Detailed technical description and specification for Issue: Network latency over 4G backup dongle when broadband fails',
        'TASK', '55555555-5555-5555-5555-555555555553', '66666666-6666-6666-6666-666666666665', 'HIGH',
        'b0000000-0000-0000-0000-000000000003', NULL,
        '10000000-0000-0000-0000-000000000006', '12000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004b0',
        'c0000000-0000-0000-0000-000000000002', 5, 'M', '2026-09-10 09:30:00+05:30', '2026-10-13 18:30:00+05:30',
        '2026-09-10 09:30:00+05:30', NULL,
        14, TRUE, 21000,
        '11111111-1111-1111-1111-111111111112', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004b5', '00000000-0000-0000-0000-000000000010', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004b5', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004b5', 'f0000000-0000-0000-0000-000000000009', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-0000000004b5', '00000000-0000-0000-0000-000000000010', CURRENT_DATE - 2, 8, TRUE, 'Implementation and code review work for TSK-ZEN-030', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000004b6', 'TSK-ZEN-031', 1, 'Gzip compress delta inventory batches before transmission', 'Detailed technical description and specification for Gzip compress delta inventory batches before transmission',
        'SUBTASK', '55555555-5555-5555-5555-555555555553', '66666666-6666-6666-6666-666666666665', 'MEDIUM',
        'b0000000-0000-0000-0000-000000000003', NULL,
        '10000000-0000-0000-0000-000000000006', '12000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004b5',
        'c0000000-0000-0000-0000-000000000002', 2, 'XS', '2026-09-11 09:30:00+05:30', '2026-10-15 18:30:00+05:30',
        '2026-09-11 09:30:00+05:30', NULL,
        6, TRUE, 9000,
        '11111111-1111-1111-1111-111111111112', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004b6', '00000000-0000-0000-0000-000000000005', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004b6', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004b6', 'f0000000-0000-0000-0000-000000000009', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-0000000004b6', '00000000-0000-0000-0000-000000000005', CURRENT_DATE - 2, 3, TRUE, 'Implementation and code review work for TSK-ZEN-031', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000004b7', 'TSK-ZEN-032', 1, 'Prioritize checkout transaction packets over analytics telemetry', 'Detailed technical description and specification for Prioritize checkout transaction packets over analytics telemetry',
        'SUBTASK', '55555555-5555-5555-5555-555555555553', '66666666-6666-6666-6666-666666666667', 'HIGH',
        'b0000000-0000-0000-0000-000000000003', NULL,
        '10000000-0000-0000-0000-000000000006', '12000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004b5',
        'c0000000-0000-0000-0000-000000000002', 3, 'S', '2026-09-12 09:30:00+05:30', '2026-10-17 18:30:00+05:30',
        '2026-09-12 09:30:00+05:30', '2026-10-17 18:30:00+05:30',
        8, TRUE, 12000,
        '11111111-1111-1111-1111-111111111112', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004b7', '00000000-0000-0000-0000-000000000006', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004b7', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004b7', 'f0000000-0000-0000-0000-000000000009', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-0000000004b7', '00000000-0000-0000-0000-000000000006', CURRENT_DATE - 2, 8, TRUE, 'Implementation and code review work for TSK-ZEN-032', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000004b8', 'TSK-ZEN-033', 1, 'Support: Unlock supervisor override PIN for cashier refund permission', 'Detailed technical description and specification for Support: Unlock supervisor override PIN for cashier refund permission',
        'TASK', '55555555-5555-5555-5555-555555555556', '66666666-6666-6666-6666-666666666667', 'LOW',
        'b0000000-0000-0000-0000-000000000003', NULL,
        '10000000-0000-0000-0000-000000000006', '12000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004b0',
        'c0000000-0000-0000-0000-000000000002', 1, 'XS', '2026-09-13 09:30:00+05:30', '2026-10-19 18:30:00+05:30',
        '2026-09-13 09:30:00+05:30', '2026-10-19 18:30:00+05:30',
        2, TRUE, 3000,
        '11111111-1111-1111-1111-111111111112', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004b8', '00000000-0000-0000-0000-000000000011', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004b8', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004b8', 'f0000000-0000-0000-0000-000000000009', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-0000000004b8', '00000000-0000-0000-0000-000000000011', CURRENT_DATE - 2, 2, TRUE, 'Implementation and code review work for TSK-ZEN-033', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000004b9', 'TSK-ZEN-034', 1, 'Training: Training video for seasonal festival retail temp staff', 'Detailed technical description and specification for Training: Training video for seasonal festival retail temp staff',
        'TASK', '55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666667', 'LOW',
        'b0000000-0000-0000-0000-000000000003', NULL,
        '10000000-0000-0000-0000-000000000006', '12000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004b0',
        'c0000000-0000-0000-0000-000000000002', 2, 'XS', '2026-09-14 09:30:00+05:30', '2026-10-21 18:30:00+05:30',
        '2026-09-14 09:30:00+05:30', '2026-10-21 18:30:00+05:30',
        4, TRUE, 6000,
        '11111111-1111-1111-1111-111111111112', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004b9', '00000000-0000-0000-0000-000000000003', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004b9', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004b9', 'f0000000-0000-0000-0000-000000000009', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

      INSERT INTO task_time_logs (task_id, user_id, log_date, hours_spent, is_billable, description, approval_status, created_by)
      VALUES ('20000000-0000-0000-0000-0000000004b9', '00000000-0000-0000-0000-000000000003', CURRENT_DATE - 2, 4, TRUE, 'Implementation and code review work for TSK-ZEN-034', 'APPROVED', v_admin_id)
      ON CONFLICT DO NOTHING;
    

    INSERT INTO tasks (
        id, task_code, revision, title, description, hierarchy_level, task_type_id, status_id,
        priority, project_id, product_id, version_id, sprint_id, milestone_id, parent_task_id,
        responsible_team_id, story_points, t_shirt_size, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, estimated_hours, is_chargeable, charge_amount,
        branch_id, custom_field_values, created_by
    ) VALUES (
        '20000000-0000-0000-0000-0000000004ba', 'TSK-ZEN-035', 1, 'Enhancement: Instant WhatsApp e-receipt sent to customer upon payment completion', 'Detailed technical description and specification for Enhancement: Instant WhatsApp e-receipt sent to customer upon payment completion',
        'TASK', '55555555-5555-5555-5555-555555555554', '66666666-6666-6666-6666-666666666666', 'HIGH',
        'b0000000-0000-0000-0000-000000000003', NULL,
        '10000000-0000-0000-0000-000000000006', '12000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004b0',
        'c0000000-0000-0000-0000-000000000002', 3, 'S', '2026-09-15 09:30:00+05:30', '2026-10-23 18:30:00+05:30',
        '2026-09-15 09:30:00+05:30', NULL,
        10, TRUE, 15000,
        '11111111-1111-1111-1111-111111111112', '{}'::jsonb, v_admin_id
    ) ON CONFLICT (task_code) DO NOTHING;

    INSERT INTO task_assignees (task_id, user_id, is_primary_assignee, assigned_by_user_id, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004ba', '00000000-0000-0000-0000-000000000009', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;

    INSERT INTO sprint_tasks (sprint_id, task_id, is_initial_commitment, added_by, created_by)
    VALUES ('12000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000004ba', TRUE, v_admin_id, v_admin_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO task_components (task_id, component_id, is_primary, created_by)
    VALUES ('20000000-0000-0000-0000-0000000004ba', 'f0000000-0000-0000-0000-000000000009', TRUE, v_admin_id)
    ON CONFLICT (task_id, component_id) DO NOTHING;
  

    -- 14. Task Dependencies (DAG Relationships: BLOCKS, FINISH_TO_START)


      INSERT INTO task_dependencies (source_task_id, target_task_id, link_type, description, created_by)
      VALUES ('20000000-0000-0000-0000-0000000003e9', '20000000-0000-0000-0000-0000000003ea', 'FINISH_TO_START', 'Prerequisite delivery milestone completion required', v_admin_id)
      ON CONFLICT (source_task_id, target_task_id, link_type) DO NOTHING;
    

      INSERT INTO task_dependencies (source_task_id, target_task_id, link_type, description, created_by)
      VALUES ('20000000-0000-0000-0000-0000000003f0', '20000000-0000-0000-0000-0000000003f1', 'FINISH_TO_START', 'Prerequisite delivery milestone completion required', v_admin_id)
      ON CONFLICT (source_task_id, target_task_id, link_type) DO NOTHING;
    

      INSERT INTO task_dependencies (source_task_id, target_task_id, link_type, description, created_by)
      VALUES ('20000000-0000-0000-0000-0000000003f7', '20000000-0000-0000-0000-0000000003f8', 'FINISH_TO_START', 'Prerequisite delivery milestone completion required', v_admin_id)
      ON CONFLICT (source_task_id, target_task_id, link_type) DO NOTHING;
    

      INSERT INTO task_dependencies (source_task_id, target_task_id, link_type, description, created_by)
      VALUES ('20000000-0000-0000-0000-0000000003fe', '20000000-0000-0000-0000-0000000003ff', 'FINISH_TO_START', 'Prerequisite delivery milestone completion required', v_admin_id)
      ON CONFLICT (source_task_id, target_task_id, link_type) DO NOTHING;
    

      INSERT INTO task_dependencies (source_task_id, target_task_id, link_type, description, created_by)
      VALUES ('20000000-0000-0000-0000-000000000405', '20000000-0000-0000-0000-000000000406', 'FINISH_TO_START', 'Prerequisite delivery milestone completion required', v_admin_id)
      ON CONFLICT (source_task_id, target_task_id, link_type) DO NOTHING;
    

      INSERT INTO task_dependencies (source_task_id, target_task_id, link_type, description, created_by)
      VALUES ('20000000-0000-0000-0000-00000000040c', '20000000-0000-0000-0000-00000000040d', 'FINISH_TO_START', 'Prerequisite delivery milestone completion required', v_admin_id)
      ON CONFLICT (source_task_id, target_task_id, link_type) DO NOTHING;
    

      INSERT INTO task_dependencies (source_task_id, target_task_id, link_type, description, created_by)
      VALUES ('20000000-0000-0000-0000-000000000413', '20000000-0000-0000-0000-000000000414', 'FINISH_TO_START', 'Prerequisite delivery milestone completion required', v_admin_id)
      ON CONFLICT (source_task_id, target_task_id, link_type) DO NOTHING;
    

      INSERT INTO task_dependencies (source_task_id, target_task_id, link_type, description, created_by)
      VALUES ('20000000-0000-0000-0000-00000000041a', '20000000-0000-0000-0000-00000000041b', 'FINISH_TO_START', 'Prerequisite delivery milestone completion required', v_admin_id)
      ON CONFLICT (source_task_id, target_task_id, link_type) DO NOTHING;
    

      INSERT INTO task_dependencies (source_task_id, target_task_id, link_type, description, created_by)
      VALUES ('20000000-0000-0000-0000-000000000421', '20000000-0000-0000-0000-000000000422', 'FINISH_TO_START', 'Prerequisite delivery milestone completion required', v_admin_id)
      ON CONFLICT (source_task_id, target_task_id, link_type) DO NOTHING;
    

      INSERT INTO task_dependencies (source_task_id, target_task_id, link_type, description, created_by)
      VALUES ('20000000-0000-0000-0000-000000000428', '20000000-0000-0000-0000-000000000429', 'FINISH_TO_START', 'Prerequisite delivery milestone completion required', v_admin_id)
      ON CONFLICT (source_task_id, target_task_id, link_type) DO NOTHING;
    

      INSERT INTO task_dependencies (source_task_id, target_task_id, link_type, description, created_by)
      VALUES ('20000000-0000-0000-0000-00000000042f', '20000000-0000-0000-0000-000000000430', 'FINISH_TO_START', 'Prerequisite delivery milestone completion required', v_admin_id)
      ON CONFLICT (source_task_id, target_task_id, link_type) DO NOTHING;
    

      INSERT INTO task_dependencies (source_task_id, target_task_id, link_type, description, created_by)
      VALUES ('20000000-0000-0000-0000-000000000436', '20000000-0000-0000-0000-000000000437', 'FINISH_TO_START', 'Prerequisite delivery milestone completion required', v_admin_id)
      ON CONFLICT (source_task_id, target_task_id, link_type) DO NOTHING;
    

      INSERT INTO task_dependencies (source_task_id, target_task_id, link_type, description, created_by)
      VALUES ('20000000-0000-0000-0000-00000000043d', '20000000-0000-0000-0000-00000000043e', 'FINISH_TO_START', 'Prerequisite delivery milestone completion required', v_admin_id)
      ON CONFLICT (source_task_id, target_task_id, link_type) DO NOTHING;
    

      INSERT INTO task_dependencies (source_task_id, target_task_id, link_type, description, created_by)
      VALUES ('20000000-0000-0000-0000-000000000444', '20000000-0000-0000-0000-000000000445', 'FINISH_TO_START', 'Prerequisite delivery milestone completion required', v_admin_id)
      ON CONFLICT (source_task_id, target_task_id, link_type) DO NOTHING;
    

      INSERT INTO task_dependencies (source_task_id, target_task_id, link_type, description, created_by)
      VALUES ('20000000-0000-0000-0000-00000000044b', '20000000-0000-0000-0000-00000000044c', 'FINISH_TO_START', 'Prerequisite delivery milestone completion required', v_admin_id)
      ON CONFLICT (source_task_id, target_task_id, link_type) DO NOTHING;
    

      INSERT INTO task_dependencies (source_task_id, target_task_id, link_type, description, created_by)
      VALUES ('20000000-0000-0000-0000-000000000452', '20000000-0000-0000-0000-000000000453', 'FINISH_TO_START', 'Prerequisite delivery milestone completion required', v_admin_id)
      ON CONFLICT (source_task_id, target_task_id, link_type) DO NOTHING;
    

      INSERT INTO task_dependencies (source_task_id, target_task_id, link_type, description, created_by)
      VALUES ('20000000-0000-0000-0000-000000000459', '20000000-0000-0000-0000-00000000045a', 'FINISH_TO_START', 'Prerequisite delivery milestone completion required', v_admin_id)
      ON CONFLICT (source_task_id, target_task_id, link_type) DO NOTHING;
    

      INSERT INTO task_dependencies (source_task_id, target_task_id, link_type, description, created_by)
      VALUES ('20000000-0000-0000-0000-000000000460', '20000000-0000-0000-0000-000000000461', 'FINISH_TO_START', 'Prerequisite delivery milestone completion required', v_admin_id)
      ON CONFLICT (source_task_id, target_task_id, link_type) DO NOTHING;
    

      INSERT INTO task_dependencies (source_task_id, target_task_id, link_type, description, created_by)
      VALUES ('20000000-0000-0000-0000-000000000467', '20000000-0000-0000-0000-000000000468', 'FINISH_TO_START', 'Prerequisite delivery milestone completion required', v_admin_id)
      ON CONFLICT (source_task_id, target_task_id, link_type) DO NOTHING;
    

      INSERT INTO task_dependencies (source_task_id, target_task_id, link_type, description, created_by)
      VALUES ('20000000-0000-0000-0000-00000000046e', '20000000-0000-0000-0000-00000000046f', 'FINISH_TO_START', 'Prerequisite delivery milestone completion required', v_admin_id)
      ON CONFLICT (source_task_id, target_task_id, link_type) DO NOTHING;
    

      INSERT INTO task_dependencies (source_task_id, target_task_id, link_type, description, created_by)
      VALUES ('20000000-0000-0000-0000-000000000475', '20000000-0000-0000-0000-000000000476', 'FINISH_TO_START', 'Prerequisite delivery milestone completion required', v_admin_id)
      ON CONFLICT (source_task_id, target_task_id, link_type) DO NOTHING;
    

      INSERT INTO task_dependencies (source_task_id, target_task_id, link_type, description, created_by)
      VALUES ('20000000-0000-0000-0000-00000000047c', '20000000-0000-0000-0000-00000000047d', 'FINISH_TO_START', 'Prerequisite delivery milestone completion required', v_admin_id)
      ON CONFLICT (source_task_id, target_task_id, link_type) DO NOTHING;
    

      INSERT INTO task_dependencies (source_task_id, target_task_id, link_type, description, created_by)
      VALUES ('20000000-0000-0000-0000-000000000483', '20000000-0000-0000-0000-000000000484', 'FINISH_TO_START', 'Prerequisite delivery milestone completion required', v_admin_id)
      ON CONFLICT (source_task_id, target_task_id, link_type) DO NOTHING;
    

      INSERT INTO task_dependencies (source_task_id, target_task_id, link_type, description, created_by)
      VALUES ('20000000-0000-0000-0000-00000000048a', '20000000-0000-0000-0000-00000000048b', 'FINISH_TO_START', 'Prerequisite delivery milestone completion required', v_admin_id)
      ON CONFLICT (source_task_id, target_task_id, link_type) DO NOTHING;
    

      INSERT INTO task_dependencies (source_task_id, target_task_id, link_type, description, created_by)
      VALUES ('20000000-0000-0000-0000-000000000491', '20000000-0000-0000-0000-000000000492', 'FINISH_TO_START', 'Prerequisite delivery milestone completion required', v_admin_id)
      ON CONFLICT (source_task_id, target_task_id, link_type) DO NOTHING;
    

      INSERT INTO task_dependencies (source_task_id, target_task_id, link_type, description, created_by)
      VALUES ('20000000-0000-0000-0000-000000000498', '20000000-0000-0000-0000-000000000499', 'FINISH_TO_START', 'Prerequisite delivery milestone completion required', v_admin_id)
      ON CONFLICT (source_task_id, target_task_id, link_type) DO NOTHING;
    

      INSERT INTO task_dependencies (source_task_id, target_task_id, link_type, description, created_by)
      VALUES ('20000000-0000-0000-0000-00000000049f', '20000000-0000-0000-0000-0000000004a0', 'FINISH_TO_START', 'Prerequisite delivery milestone completion required', v_admin_id)
      ON CONFLICT (source_task_id, target_task_id, link_type) DO NOTHING;
    

      INSERT INTO task_dependencies (source_task_id, target_task_id, link_type, description, created_by)
      VALUES ('20000000-0000-0000-0000-0000000004a6', '20000000-0000-0000-0000-0000000004a7', 'FINISH_TO_START', 'Prerequisite delivery milestone completion required', v_admin_id)
      ON CONFLICT (source_task_id, target_task_id, link_type) DO NOTHING;
    

      INSERT INTO task_dependencies (source_task_id, target_task_id, link_type, description, created_by)
      VALUES ('20000000-0000-0000-0000-0000000004ad', '20000000-0000-0000-0000-0000000004ae', 'FINISH_TO_START', 'Prerequisite delivery milestone completion required', v_admin_id)
      ON CONFLICT (source_task_id, target_task_id, link_type) DO NOTHING;
    

      INSERT INTO task_dependencies (source_task_id, target_task_id, link_type, description, created_by)
      VALUES ('20000000-0000-0000-0000-0000000004b4', '20000000-0000-0000-0000-0000000004b5', 'FINISH_TO_START', 'Prerequisite delivery milestone completion required', v_admin_id)
      ON CONFLICT (source_task_id, target_task_id, link_type) DO NOTHING;
    

    -- 15. Blocker Episodes (Blocker Radar Showcase)
    INSERT INTO task_blocker_episodes (task_id, owner_user_id, reason, next_action, category, priority, status, started_at, created_by)
    VALUES
        ('20000000-0000-0000-0000-0000000003ed', '00000000-0000-0000-0000-000000000010', 'Awaiting sandbox access credentials from GSTN technical helpdesk', 'Follow up with client account manager today', 'THIRD_PARTY', 'HIGH', 'ACTIVE', CURRENT_TIMESTAMP - INTERVAL '2 days', v_admin_id),
        ('20000000-0000-0000-0000-000000000410', '00000000-0000-0000-0000-000000000005', 'Sensor firmware version 1.4 requires manufacturer flashing adapter', 'Depot engineer visiting site tomorrow with adapter tool', 'ENVIRONMENT', 'MEDIUM', 'ACTIVE', CURRENT_TIMESTAMP - INTERVAL '1 day', v_admin_id)
    ON CONFLICT DO NOTHING;


    -- 16. Weekly Timesheets & Cross-Project Review Portions (TIME-001)


    INSERT INTO weekly_timesheets (id, user_id, period_start_date, period_end_date, expected_hours, total_logged_hours, total_billable_hours, status, submitted_at, approved_at, approved_by, created_by)
    VALUES ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', '2026-09-21', '2026-09-27', 40.00, 40.00, 32.00, 'APPROVED', CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '2 days', '00000000-0000-0000-0000-000000000003', v_admin_id)
    ON CONFLICT (user_id, period_start_date) DO NOTHING;

    INSERT INTO timesheet_project_portions (timesheet_id, project_id, product_id, logged_hours, billable_hours, status, reviewed_by, reviewed_at, created_by)
    VALUES
        ('30000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', NULL, 20.00, 20.00, 'APPROVED', '00000000-0000-0000-0000-000000000003', CURRENT_TIMESTAMP - INTERVAL '2 days', v_admin_id),
        ('30000000-0000-0000-0000-000000000001', NULL, 'a0000000-0000-0000-0000-000000000003', 20.00, 12.00, 'APPROVED', '00000000-0000-0000-0000-000000000003', CURRENT_TIMESTAMP - INTERVAL '2 days', v_admin_id)
    ON CONFLICT DO NOTHING;
  

    INSERT INTO weekly_timesheets (id, user_id, period_start_date, period_end_date, expected_hours, total_logged_hours, total_billable_hours, status, submitted_at, approved_at, approved_by, created_by)
    VALUES ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000006', '2026-09-21', '2026-09-27', 40.00, 40.00, 32.00, 'APPROVED', CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '2 days', '00000000-0000-0000-0000-000000000003', v_admin_id)
    ON CONFLICT (user_id, period_start_date) DO NOTHING;

    INSERT INTO timesheet_project_portions (timesheet_id, project_id, product_id, logged_hours, billable_hours, status, reviewed_by, reviewed_at, created_by)
    VALUES
        ('30000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', NULL, 20.00, 20.00, 'APPROVED', '00000000-0000-0000-0000-000000000003', CURRENT_TIMESTAMP - INTERVAL '2 days', v_admin_id),
        ('30000000-0000-0000-0000-000000000002', NULL, 'a0000000-0000-0000-0000-000000000003', 20.00, 12.00, 'APPROVED', '00000000-0000-0000-0000-000000000003', CURRENT_TIMESTAMP - INTERVAL '2 days', v_admin_id)
    ON CONFLICT DO NOTHING;
  

    INSERT INTO weekly_timesheets (id, user_id, period_start_date, period_end_date, expected_hours, total_logged_hours, total_billable_hours, status, submitted_at, approved_at, approved_by, created_by)
    VALUES ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000007', '2026-09-21', '2026-09-27', 40.00, 40.00, 32.00, 'APPROVED', CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '2 days', '00000000-0000-0000-0000-000000000003', v_admin_id)
    ON CONFLICT (user_id, period_start_date) DO NOTHING;

    INSERT INTO timesheet_project_portions (timesheet_id, project_id, product_id, logged_hours, billable_hours, status, reviewed_by, reviewed_at, created_by)
    VALUES
        ('30000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', NULL, 20.00, 20.00, 'APPROVED', '00000000-0000-0000-0000-000000000003', CURRENT_TIMESTAMP - INTERVAL '2 days', v_admin_id),
        ('30000000-0000-0000-0000-000000000003', NULL, 'a0000000-0000-0000-0000-000000000003', 20.00, 12.00, 'APPROVED', '00000000-0000-0000-0000-000000000003', CURRENT_TIMESTAMP - INTERVAL '2 days', v_admin_id)
    ON CONFLICT DO NOTHING;
  

    INSERT INTO weekly_timesheets (id, user_id, period_start_date, period_end_date, expected_hours, total_logged_hours, total_billable_hours, status, submitted_at, approved_at, approved_by, created_by)
    VALUES ('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000008', '2026-09-21', '2026-09-27', 40.00, 40.00, 32.00, 'APPROVED', CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '2 days', '00000000-0000-0000-0000-000000000003', v_admin_id)
    ON CONFLICT (user_id, period_start_date) DO NOTHING;

    INSERT INTO timesheet_project_portions (timesheet_id, project_id, product_id, logged_hours, billable_hours, status, reviewed_by, reviewed_at, created_by)
    VALUES
        ('30000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', NULL, 20.00, 20.00, 'APPROVED', '00000000-0000-0000-0000-000000000003', CURRENT_TIMESTAMP - INTERVAL '2 days', v_admin_id),
        ('30000000-0000-0000-0000-000000000004', NULL, 'a0000000-0000-0000-0000-000000000003', 20.00, 12.00, 'APPROVED', '00000000-0000-0000-0000-000000000003', CURRENT_TIMESTAMP - INTERVAL '2 days', v_admin_id)
    ON CONFLICT DO NOTHING;
  

    -- 17. Task Handoffs & Waiting Queue Tracking (FLOW-001)
    INSERT INTO task_handoffs (
        id, task_id, from_team_id, from_user_id, to_team_id, to_user_id,
        handoff_type, status, sent_at, acknowledged_at, acknowledged_by, required_context, notes, is_active, created_by
    ) VALUES
        ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000003ea', 'c0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000005', 'DEV_TO_QA', 'ACCEPTED', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '18 hours', '00000000-0000-0000-0000-000000000005', 'Feature branch PR #142 deployed on QA staging cluster. Run regression test plan suite A-12.', 'All 15 automated test cases passing in CI pipeline.', TRUE, v_admin_id),
        ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-00000000040d', 'c0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'DEV_TO_QA', 'IN_PROGRESS', CURRENT_TIMESTAMP - INTERVAL '12 hours', CURRENT_TIMESTAMP - INTERVAL '8 hours', '00000000-0000-0000-0000-000000000010', 'Sensor ingestion stress test build ready with mock telemetry simulator.', 'Simulate 5,000 requests per second and log CPU/Memory metrics.', TRUE, v_admin_id)
    ON CONFLICT DO NOTHING;


    -- 18. Client Portal Intake, Clarification Messages & SLA Triage (CLIENT-001, CLIENT-002)
    INSERT INTO client_intake_requests (
        id, request_number, client_id, contact_id, project_id, product_id,
        request_type, title, description, status, client_priority, internal_priority,
        technical_severity, business_impact, impact_breadth, is_active, created_by
    ) VALUES (
        '50000000-0000-0000-0000-000000000001', 'REQ-ACME-2026-001', '77777777-7777-7777-7777-777777777772', 'd0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000001', NULL, 'CHANGE_REQUEST', 'Add Biometric Re-authentication on High-Value Wire Transfers > ₹1,00,000',
        'Customer compliance mandate requiring face or fingerprint verification before finalizing large NEFT/RTGS transfers.',
        'ACCEPTED', 'HIGH', 'HIGH', 'MAJOR', 'COMPLIANCE', 'ORGANIZATION', TRUE, v_admin_id
    ) ON CONFLICT (request_number) DO NOTHING;

    INSERT INTO client_request_messages (request_id, sender_type, contact_id, user_id, message, is_internal_only, is_active, created_by)
    VALUES
        ('50000000-0000-0000-0000-000000000001', 'CLIENT_CONTACT', 'd0000000-0000-0000-0000-000000000001', NULL, 'Can we target this for the October v1.0.0 release cycle?', FALSE, TRUE, v_admin_id),
        ('50000000-0000-0000-0000-000000000001', 'INTERNAL_USER', NULL, '00000000-0000-0000-0000-000000000003', 'Yes, our engineering team has assessed this as 16 hours of effort and it is now formally linked to Change Request CR-ACME-001.', FALSE, TRUE, v_admin_id)
    ON CONFLICT DO NOTHING;

    -- 19. Requirement Specifications & Acceptance Traceability (CLIENT-003)
    INSERT INTO requirement_specifications (
        id, req_code, title, project_id, product_id, module_name,
        business_objective, in_scope, out_of_scope, version, status, is_baselined, is_client_visible, is_active, created_by
    ) VALUES (
        '60000000-0000-0000-0000-000000000001', 'BRD-ACME-AUTH-01', 'Biometric Authentication & Transaction Security Specification',
        'b0000000-0000-0000-0000-000000000001', NULL, 'Mobile Security',
        'Ensure all fund disbursements exceeding standard daily thresholds require verified biometric cryptographic attestation.',
        'Secure Enclave integration, prompt customization, fallback to transaction PIN after 3 failed attempts.',
        'Hardware security token issuance or SMS OTP fallback.',
        1, 'BASELINED', TRUE, TRUE, TRUE, v_admin_id
    ) ON CONFLICT (req_code) DO NOTHING;

    INSERT INTO requirement_acceptance_criteria (
        id, requirement_id, criteria_code, title, description,
        verification_method, implementation_status, order_index, client_signoff_status, is_active, created_by
    ) VALUES (
        '70000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'AC-01', 'Biometric Prompt Invocation on Amount Threshold',
        'Whenever transfer input field exceeds 100,000.00 INR, confirm button triggers OS native biometric sheet before API request.',
        'MANUAL_TEST', 'IMPLEMENTED', 1, 'ACCEPTED', TRUE, v_admin_id
    ) ON CONFLICT (requirement_id, criteria_code) DO NOTHING;

    INSERT INTO requirement_criterion_tasks (criterion_id, task_id, is_active, created_by)
    VALUES ('70000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000452', TRUE, v_admin_id)
    ON CONFLICT (criterion_id, task_id) DO NOTHING;

    -- 20. Change Requests & Revisions (CLIENT-004)
    INSERT INTO change_requests (
        id, cr_number, project_id, product_id, originating_intake_request_id, requirement_id,
        title, description, business_justification, accountable_pm_user_id, current_revision, status, is_active, created_by
    ) VALUES (
        '80000000-0000-0000-0000-000000000001', 'CR-ACME-001', 'b0000000-0000-0000-0000-000000000001', NULL, '50000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001',
        'Biometric Re-authentication on High-Value Wire Transfers',
        'Scope extension to incorporate native biometric verification modal during transfer confirmation flow.',
        'Mandated by Reserve Bank of India updated digital payment security norms.',
        '00000000-0000-0000-0000-000000000003', 1, 'APPROVED', TRUE, v_admin_id
    ) ON CONFLICT (cr_number) DO NOTHING;

    INSERT INTO change_request_revisions (
        id, change_request_id, revision_number, scope_description, deliverables,
        estimated_hours, quoted_price, currency, status, submitted_by_user_id,
        client_decision, decided_by_contact_id, decided_at, is_active, created_by
    ) VALUES (
        gen_random_uuid(), '80000000-0000-0000-0000-000000000001', 1, 'Flutter bridge implementation for iOS LocalAuthentication and Android BiometricPrompt',
        '["Biometric Security Plugin", "UI Prompt Dialog", "Automated Security Tests"]'::jsonb,
        24.00, 36000.00, 'INR', 'APPROVED', '00000000-0000-0000-0000-000000000003',
        'APPROVED', 'd0000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP - INTERVAL '3 days', TRUE, v_admin_id
    ) ON CONFLICT (change_request_id, revision_number) DO NOTHING;

    -- 21. UAT Packages & Checklist Items (CLIENT-005)
    INSERT INTO uat_packages (
        id, package_code, project_id, product_id, version_id, milestone_id,
        title, description, environment_url, build_number, current_revision, status,
        target_signoff_date, prepared_by_user_id, qa_lead_user_id, is_active, created_by
    ) VALUES (
        '90000000-0000-0000-0000-000000000001', 'UAT-ACME-OCT-01', 'b0000000-0000-0000-0000-000000000001', NULL, '10000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004',
        'Acme Neo-Bank Mobile SDK Release Candidate 1 (v1.0.0-rc1)',
        'Comprehensive UAT verification package containing biometric auth, statements, and payment checkout flows.',
        'https://staging-acme.kashvirainfotech.com', 'Build #2026.09.28.1', 1, 'READY_FOR_CLIENT',
        '2026-10-15', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000005', TRUE, v_admin_id
    ) ON CONFLICT (package_code) DO NOTHING;

    INSERT INTO uat_package_revisions (
        id, package_id, revision_number, revision_notes, status, is_active, created_by
    ) VALUES (
        '91000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', 1, 'Initial submission to Acme FinTech QA and security compliance officers', 'READY_FOR_CLIENT', TRUE, v_admin_id
    ) ON CONFLICT (package_id, revision_number) DO NOTHING;

    INSERT INTO uat_checklist_items (
        id, package_revision_id, item_code, title, instructions, expected_outcome,
        order_index, developer_done, qa_verified, client_status, is_active, created_by
    ) VALUES
        (gen_random_uuid(), '91000000-0000-0000-0000-000000000001', 'CHK-01', 'Biometric Prompt on ₹1,50,000 NEFT Transfer', 'Login with test account, initiate ₹1,50,000 transfer, observe prompt.', 'Biometric prompt pops up; transfer is submitted only on success.', 1, TRUE, TRUE, 'PASSED', TRUE, v_admin_id),
        (gen_random_uuid(), '91000000-0000-0000-0000-000000000001', 'CHK-02', 'Account Statement Offline Cache Loading', 'Turn off Wi-Fi/Mobile Data, open statement screen.', 'Cached records display with clear offline status indicator banner.', 2, TRUE, TRUE, 'PASSED', TRUE, v_admin_id),
        (gen_random_uuid(), '91000000-0000-0000-0000-000000000001', 'CHK-03', 'Invalid PIN Lockout Escalation', 'Enter wrong PIN 3 times consecutively.', 'Account is temporarily locked for 15 minutes with security notification email.', 3, TRUE, TRUE, 'PENDING', TRUE, v_admin_id)
    ON CONFLICT (package_revision_id, item_code) DO NOTHING;

    -- 22. RAID Items (Risks, Assumptions, Issues, Decisions - DEL-001)
    INSERT INTO raid_items (
        id, item_code, category, project_id, product_id, title, description,
        owner_user_id, status, likelihood, impact, risk_score, mitigation_plan, is_client_shared, client_visibility, is_active, created_by
    ) VALUES
        ('a1000000-0000-0000-0000-000000000001', 'RSK-PAY-001', 'RISK', NULL, 'a0000000-0000-0000-0000-000000000003',
        'NPCI Sandbox Gateway Downtime during End-to-End UPI Mandate Verification',
        'Scheduled maintenance on national NPCI testing sandbox could delay UPI AutoPay certification by up to 5 business days.',
        '00000000-0000-0000-0000-000000000004', 'MITIGATING', 'MEDIUM', 'HIGH', 15,
        'Deploy local NPCI mock simulator to complete 80% of edge case validations ahead of live window.', TRUE, 'CLIENT_SUMMARY', TRUE, v_admin_id)
    ON CONFLICT (item_code) DO NOTHING;

    INSERT INTO client_action_requests (
        id, action_code, raid_item_id, project_id, product_id, client_id,
        title, description, context_for_client, priority, due_date, requires_approver, status, is_active, created_by
    ) VALUES (
        gen_random_uuid(), 'ACT-ACME-001', 'a1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', NULL, '77777777-7777-7777-7777-777777777772',
        'Acme Security Certificate Signing Authority Approval',
        'Acme internal Infosec team signoff on mTLS public certificate authority keys for staging environment.',
        'Required before initiating external penetration testing scheduled for next Monday.',
        'HIGH', '2026-10-08', TRUE, 'PENDING', TRUE, v_admin_id
    ) ON CONFLICT (action_code) DO NOTHING;

    -- 23. Product Discovery Ideas & Votes (PROD-001)
    INSERT INTO product_ideas (
        id, idea_code, product_id, title, sanitized_description, customer_problem,
        expected_outcome, status, roadmap_bucket, reach, impact_score, confidence_score,
        effort_score, strategic_fit, rice_score, is_published, visibility, vote_count, is_active, created_by
    ) VALUES
        ('a2000000-0000-0000-0000-000000000001', 'IDEA-PAY-001', 'a0000000-0000-0000-0000-000000000003',
        'WhatsApp Embedded Conversational Payment Flow via Chatbot',
        'Allow merchants to trigger WhatsApp interactive checkout messages directly from customer support chats.',
        'Customers abandon web checkouts when redirected to external browser tabs on mobile devices.',
        'Increase checkout conversion rate by 22% for mobile-first social commerce merchants.',
        'PLANNED', 'NOW', 25000, 3.50, 0.90, 2.00, 5, 39375.00, TRUE, 'PRODUCT_COMMUNITY', 3, TRUE, v_admin_id)
    ON CONFLICT (idea_code) DO NOTHING;

    INSERT INTO product_idea_votes (idea_id, client_id, is_active)
    VALUES
        ('a2000000-0000-0000-0000-000000000001', '77777777-7777-7777-7777-777777777772', TRUE),
        ('a2000000-0000-0000-0000-000000000001', '77777777-7777-7777-7777-777777777774', TRUE),
        ('a2000000-0000-0000-0000-000000000001', '77777777-7777-7777-7777-777777777775', TRUE)
    ON CONFLICT (idea_id, client_id) DO NOTHING;

    -- 24. Personal & Team Saved Views (PLAN-003)
    INSERT INTO saved_views (
        view_name, entity_type, scope, project_id, product_id, user_id, is_default, is_favorite,
        filters, columns, sort, view_mode, is_active, created_by
    ) VALUES
        ('Sprint Active Tasks by Status', 'TASK', 'GLOBAL', NULL, NULL, v_admin_id, TRUE, TRUE,
        '{"status": ["OPEN", "WIP", "CODE_REVIEW", "PENDING_TEST", "TESTING"]}'::jsonb,
        '["task_code", "title", "task_type", "status", "priority", "assignee", "planned_end_date"]'::jsonb,
        '[{"column": "priority", "direction": "DESC"}]'::jsonb, 'KANBAN', TRUE, v_admin_id),
        ('High Priority Bugs & Blockers', 'DEFECT', 'GLOBAL', NULL, NULL, v_admin_id, FALSE, TRUE,
        '{"task_type": ["BUG", "ISSUE"], "priority": ["HIGH", "URGENT", "CRITICAL"]}'::jsonb,
        '["task_code", "title", "severity", "status", "assignee", "is_blocked"]'::jsonb,
        '[{"column": "created_at", "direction": "DESC"}]'::jsonb, 'LIST', TRUE, v_admin_id)
    ON CONFLICT DO NOTHING;

    -- 25. QA Manual Test Cases, Test Runs & Release Gatekeeper (QA-001)
    INSERT INTO permissions (module, action, permission_code, description, is_active, created_by)
    VALUES 
        ('TESTING', 'READ', 'TESTING:READ', 'Permission to view test suites, cases, runs, and checklists', TRUE, v_admin_id),
        ('TESTING', 'MANAGE', 'TESTING:MANAGE', 'Permission to create and manage test suites and cases', TRUE, v_admin_id),
        ('TESTING', 'EXECUTE', 'TESTING:EXECUTE', 'Permission to execute test runs and log test run results', TRUE, v_admin_id),
        ('TESTING', 'SIGNOFF', 'TESTING:SIGNOFF', 'Permission to approve and sign off release readiness checklists', TRUE, v_admin_id)
    ON CONFLICT (permission_code) DO NOTHING;

    INSERT INTO role_permissions (role_id, permission_id, created_by)
    SELECT '44444444-4444-4444-4444-444444444441', p.id, v_admin_id -- Super Admin
    FROM permissions p
    WHERE p.permission_code IN ('TESTING:READ', 'TESTING:MANAGE', 'TESTING:EXECUTE', 'TESTING:SIGNOFF')
    ON CONFLICT (role_id, permission_id) DO NOTHING;

    INSERT INTO role_permissions (role_id, permission_id, created_by)
    SELECT '44444444-4444-4444-4444-444444444445', p.id, v_admin_id -- QA Tester
    FROM permissions p
    WHERE p.permission_code IN ('TESTING:READ', 'TESTING:MANAGE', 'TESTING:EXECUTE', 'TESTING:SIGNOFF')
    ON CONFLICT (role_id, permission_id) DO NOTHING;

    INSERT INTO role_permissions (role_id, permission_id, created_by)
    SELECT '44444444-4444-4444-4444-444444444443', p.id, v_admin_id -- PM
    FROM permissions p
    WHERE p.permission_code IN ('TESTING:READ', 'TESTING:SIGNOFF')
    ON CONFLICT (role_id, permission_id) DO NOTHING;

    INSERT INTO role_permissions (role_id, permission_id, created_by)
    SELECT '44444444-4444-4444-4444-444444444444', p.id, v_admin_id -- Developer
    FROM permissions p
    WHERE p.permission_code IN ('TESTING:READ')
    ON CONFLICT (role_id, permission_id) DO NOTHING;

    -- Test Suites
    INSERT INTO test_suites (
        id, suite_code, suite_name, description, entity_type, product_id, project_id,
        component_id, is_active, created_by
    ) VALUES
        ('e0000000-0000-0000-0000-000000000001', 'SUITE-ERP-CORE', 'KashFlow ERP Core Financial & Ledger Regression Suite',
        'End-to-end regression test suite covering invoicing, tax rules, journal postings, and goods receipts.',
        'PRODUCT', 'a0000000-0000-0000-0000-000000000001', NULL,
        'f0000000-0000-0000-0000-000000000001', TRUE, v_admin_id),
        ('e0000000-0000-0000-0000-000000000002', 'SUITE-ACME-MOB', 'Acme Neo-Bank Security & Payment Verification Suite',
        'Security, biometric prompt challenge, transaction limits, and offline cache tests for mobile banking SDK.',
        'PROJECT', NULL, 'b0000000-0000-0000-0000-000000000001',
        NULL, TRUE, v_admin_id)
    ON CONFLICT (suite_code) DO NOTHING;

    -- Test Cases
    INSERT INTO test_cases (
        id, case_code, suite_id, title, description, preconditions,
        test_steps, expected_result, severity, priority, execution_type,
        estimated_minutes, requirement_criterion_id, component_id, version, is_active, created_by
    ) VALUES
        ('e1000000-0000-0000-0000-000000000001', 'TC-ERP-001', 'e0000000-0000-0000-0000-000000000001',
        'Verify Inter-State IGST (18%) Calculation on Bulk B2B Invoices',
        'Validates that inter-state shipments apply IGST 18% correctly without charging CGST/SGST.',
        'Active GSTIN configured for buyer and seller across different states (e.g. MH to GJ).',
        '[
            {"step_number": 1, "action": "Navigate to Sales > Invoices > Create New Invoice.", "expected_result": "Invoice form opens with auto-populated series number."},
            {"step_number": 2, "action": "Select buyer with out-of-state GSTIN and add 3 line items totaling ₹10,000.", "expected_result": "Line total shows ₹10,000; CGST and SGST remain 0%."},
            {"step_number": 3, "action": "Click Calculate Taxes button.", "expected_result": "IGST applies at 18% (₹1,800); grand total equals ₹11,800.00 exact."}
        ]'::jsonb,
        'Tax ledger entry posts correctly with IGST component of ₹1,800.00 without any decimal truncation.',
        'CRITICAL', 'HIGH', 'MANUAL', 15, NULL, 'f0000000-0000-0000-0000-000000000001', 1, TRUE, v_admin_id),

        ('e1000000-0000-0000-0000-000000000002', 'TC-ERP-002', 'e0000000-0000-0000-0000-000000000001',
        'Verify Fractional Paise Rounding on Line-Item Discount Splitting',
        'Ensures line item discount distribution does not produce rounding errors exceeding 1 paisa.',
        'Draft invoice with 5 items each priced at ₹33.33 with a 5% global discount coupon.',
        '[
            {"step_number": 1, "action": "Open Draft Invoice #INV-2026-9041.", "expected_result": "Form loads with all 5 line items at ₹33.33."},
            {"step_number": 2, "action": "Apply global discount code FESTIVE5.", "expected_result": "Discount splits proportionally across items."},
            {"step_number": 3, "action": "Inspect tax invoice preview footer.", "expected_result": "Rounding adjustment displays difference strictly <= ₹0.01."}
        ]'::jsonb,
        'Total rounding does not exceed 1 paisa and ledger balances debit and credit lines perfectly.',
        'MAJOR', 'MEDIUM', 'MANUAL', 20, NULL, 'f0000000-0000-0000-0000-000000000001', 1, TRUE, v_admin_id),

        ('e1000000-0000-0000-0000-000000000003', 'TC-ERP-003', 'e0000000-0000-0000-0000-000000000001',
        'Barcode QR Code Scan on Goods Inward Receipt',
        'Verifies that scanner hardware QR parser populates lot number and expiry into grid rows.',
        'Physical Bluetooth scanner connected; Goods Inward modal open.',
        '[
            {"step_number": 1, "action": "Focus on QR Scan input field.", "expected_result": "Input field shows active scan indicator pulse."},
            {"step_number": 2, "action": "Scan sample GS1-128 QR sticker.", "expected_result": "Item SKU, lot number, and expiry date auto-populate into grid rows."}
        ]'::jsonb,
        'GRN line items auto-generate with 100% matched batch and serial attributes.',
        'MAJOR', 'LOW', 'MANUAL', 10, NULL, 'f0000000-0000-0000-0000-000000000001', 1, TRUE, v_admin_id),

        ('e1000000-0000-0000-0000-000000000004', 'TC-ACME-001', 'e0000000-0000-0000-0000-000000000002',
        'Biometric Fingerprint/FaceID Challenge for High-Value Transfer (> ₹1,00,000)',
        'Verifies that payments above threshold force biometric authentication prior to dispatching payment instruction.',
        'Acme Mobile App v1.0.0-rc1 installed; biometrics enrolled on test device.',
        '[
            {"step_number": 1, "action": "Initiate NEFT transfer for ₹1,50,000.", "expected_result": "Transfer review modal prompts for authentication."},
            {"step_number": 2, "action": "Trigger biometric sensor prompt.", "expected_result": "OS biometric prompt displays with security lock icon."},
            {"step_number": 3, "action": "Authenticate with valid fingerprint.", "expected_result": "Transfer confirms with reference UTR number."}
        ]'::jsonb,
        'Transfer completes securely; audit trail records biometric verification flag = true.',
        'CRITICAL', 'CRITICAL', 'MANUAL', 15, NULL, NULL, 1, TRUE, v_admin_id)
    ON CONFLICT (case_code) DO NOTHING;

    -- Test Runs
    INSERT INTO test_runs (
        id, run_code, title, description, entity_type, product_id, project_id,
        version_id, milestone_id, environment, status, assigned_to_user_id,
        total_cases, passed_cases, failed_cases, blocked_cases, skipped_cases,
        started_at, completed_at, is_active, created_by
    ) VALUES
        ('e2000000-0000-0000-0000-000000000001', 'TRUN-ERP-2026-01',
        'KashFlow v2.4.0 Release Candidate Staging Regression Run',
        'Pre-release staging verification of tax calculations, fractional discounts, and barcode scanning.',
        'PRODUCT', 'a0000000-0000-0000-0000-000000000001', NULL,
        '10000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001',
        'STAGING', 'IN_PROGRESS', '00000000-0000-0000-0000-000000000005',
        3, 1, 1, 0, 0,
        CURRENT_TIMESTAMP - INTERVAL '1 day', NULL, TRUE, v_admin_id)
    ON CONFLICT (run_code) DO NOTHING;

    -- Test Run Items
    INSERT INTO test_run_items (
        id, test_run_id, test_case_id, status, actual_result, execution_notes,
        executed_by_user_id, executed_at, evidence_urls, linked_defect_task_id, is_active, created_by
    ) VALUES
        ('e3000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000001',
        'e1000000-0000-0000-0000-000000000001', 'PASSED',
        'IGST calculated precisely at 18% (₹1,800.00). Invoice generated successfully.',
        'Tested with Gujarat to Maharashtra inter-state test GSTINs. All lines balanced.',
        '00000000-0000-0000-0000-000000000005', CURRENT_TIMESTAMP - INTERVAL '6 hours',
        '["https://s3.ap-south-1.amazonaws.com/ks-pmt-evidence/staging/inv-9040-tax-ok.png"]'::jsonb,
        NULL, TRUE, v_admin_id),

        ('e3000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0000-000000000001',
        'e1000000-0000-0000-0000-000000000002', 'FAILED',
        'Total rounding discrepancy observed: ₹0.03 difference across 5 split items, triggering debit/credit imbalance warning.',
        'Discrepancy reproduces when discount is applied after tax line generation instead of before.',
        '00000000-0000-0000-0000-000000000005', CURRENT_TIMESTAMP - INTERVAL '4 hours',
        '["https://s3.ap-south-1.amazonaws.com/ks-pmt-evidence/staging/rounding-error-log.png"]'::jsonb,
        '20000000-0000-0000-0000-0000000003ed', TRUE, v_admin_id),

        ('e3000000-0000-0000-0000-000000000003', 'e2000000-0000-0000-0000-000000000001',
        'e1000000-0000-0000-0000-000000000003', 'PENDING',
        NULL, NULL, NULL, NULL, '[]'::jsonb, NULL, TRUE, v_admin_id)
    ON CONFLICT (test_run_id, test_case_id) DO NOTHING;

    -- Release Readiness Checklists
    INSERT INTO release_readiness_checklists (
        id, checklist_code, entity_type, product_id, project_id, version_id,
        milestone_id, title, overall_status, target_release_date,
        lead_qa_user_id, signoff_pm_user_id, signed_off_at, signoff_notes,
        exceptions_notes, is_active, created_by
    ) VALUES
        ('e4000000-0000-0000-0000-000000000001', 'REL-GATE-ERP-2.4.0',
        'PRODUCT', 'a0000000-0000-0000-0000-000000000001', NULL,
        '10000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001',
        'KashFlow ERP v2.4.0 Production Cutover Gatekeeper',
        'CONDITIONAL_RELEASE', '2026-10-28',
        '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000003',
        CURRENT_TIMESTAMP - INTERVAL '1 hour',
        'Approved for deployment with mitigation. Hotfix 2.4.1 planned for minor paise rounding edge-case.',
        'Minor rounding discrepancy (TSK-ERP-005) waived under condition of hotfix delivery within 48h.',
        TRUE, v_admin_id)
    ON CONFLICT (checklist_code) DO NOTHING;

    -- Release Checklist Items
    INSERT INTO release_checklist_items (
        id, checklist_id, item_code, gate_category, title, description,
        status, is_mandatory, verified_by_user_id, verified_at, evidence_notes, waived_reason, order_index, is_active, created_by
    ) VALUES
        (gen_random_uuid(), 'e4000000-0000-0000-0000-000000000001', 'GATE-01', 'QA_TESTING',
        'Core Regression Test Suite Passing Rate >= 95%',
        'All critical severity test cases must pass on staging environment before deployment.',
        'PASSED', TRUE, '00000000-0000-0000-0000-000000000005', CURRENT_TIMESTAMP - INTERVAL '2 hours',
        'TRUN-ERP-2026-01 completed with 96.2% pass rate across automated and manual test cases.', NULL, 1, TRUE, v_admin_id),

        (gen_random_uuid(), 'e4000000-0000-0000-0000-000000000001', 'GATE-02', 'SECURITY',
        'OWASP Top 10 Dynamic Vulnerability Scan Clean',
        'DAST and SAST scans must report zero critical or high vulnerabilities.',
        'PASSED', TRUE, '00000000-0000-0000-0000-000000000010', CURRENT_TIMESTAMP - INTERVAL '5 hours',
        'SonarQube & OWASP ZAP automated scan report clean. Zero high/critical issues.', NULL, 2, TRUE, v_admin_id),

        (gen_random_uuid(), 'e4000000-0000-0000-0000-000000000001', 'GATE-03', 'PERFORMANCE',
        '500 Concurrent Users Stress Test Latency < 400ms',
        'API 95th percentile response latency under benchmark load must remain under 400ms.',
        'PASSED', FALSE, '00000000-0000-0000-0000-000000000010', CURRENT_TIMESTAMP - INTERVAL '8 hours',
        'k6 stress test completed at p95 = 280ms on AWS staging cluster.', NULL, 3, TRUE, v_admin_id),

        (gen_random_uuid(), 'e4000000-0000-0000-0000-000000000001', 'GATE-04', 'DATA_MIGRATION',
        'Dry Run DB Schema Alterations on Replica Tested',
        'Database scripts must be tested on blank database and staged migration replica without locking.',
        'PASSED', TRUE, '00000000-0000-0000-0000-000000000004', CURRENT_TIMESTAMP - INTERVAL '12 hours',
        'Executed dbscripts/build-install.mjs verification cleanly on staging replica.', NULL, 4, TRUE, v_admin_id),

        (gen_random_uuid(), 'e4000000-0000-0000-0000-000000000001', 'GATE-05', 'CLIENT_UAT',
        'Key Stakeholders & Client Pilot Signoff Recorded',
        'Pilot branch managers must confirm acceptance of GST invoice and Goods Inward screens.',
        'PASSED', TRUE, '00000000-0000-0000-0000-000000000003', CURRENT_TIMESTAMP - INTERVAL '3 hours',
        'UAT signoff received from Ahmedabad & Surat branch managers.', NULL, 5, TRUE, v_admin_id),

        (gen_random_uuid(), 'e4000000-0000-0000-0000-000000000001', 'GATE-06', 'DOCUMENTATION',
        'Release Notes & API Documentation Published',
        'User guide changes, API specs, and change logs published to internal knowledge base.',
        'PENDING', FALSE, NULL, NULL,
        'Drafted in Confluence; pending final review by tech writer.', NULL, 6, TRUE, v_admin_id)
    ON CONFLICT (checklist_id, item_code) DO NOTHING;

END $$;

-- ========================================================
-- Date & Time: 2026-10-01 09:35:00 IST
-- Description: COLLAB-002 - Enterprise Sample Templates and Recurring Work Rules
-- ========================================================
DO 
DECLARE
    v_admin_id UUID := '00000000-0000-0000-0000-000000000001';
    v_task_type_task UUID := '55555555-5555-5555-5555-555555555551';
    v_branch_id UUID := '11111111-1111-1111-1111-111111111111';
    v_dev_user_id UUID := '00000000-0000-0000-0000-000000000004';
    v_lead_user_id UUID := '00000000-0000-0000-0000-000000000003';
BEGIN
    -- 1. Project Templates
    INSERT INTO project_templates (
        id, template_code, template_name, description, category,
        target_engagement_model, default_estimated_duration_days, milestone_templates,
        is_active, created_by
    ) VALUES (
        'f1000000-0000-0000-0000-000000000001',
        'TPL-PRJ-CLIENT-ONBOARD',
        'Enterprise Client Onboarding & Solution Kickoff',
        'Standard blueprint for rapid client onboarding, security review, infrastructure provisioning, and initial sprint zero execution.',
        'CLIENT_ONBOARDING',
        'TIME_AND_MATERIALS',
        30,
        '[
            {"name": "Discovery & Architecture Alignment", "target_offset_days": 7, "display_order": 1},
            {"name": "Infrastructure Provisioning & Sandbox Access", "target_offset_days": 15, "display_order": 2},
            {"name": "Initial Pilot & Production Readiness Review", "target_offset_days": 30, "display_order": 3}
        ]'::jsonb,
        TRUE,
        v_admin_id
    ), (
        'f1000000-0000-0000-0000-000000000002',
        'TPL-PRJ-FIXED-DELIVERY',
        'Fixed-Price Custom Software Delivery',
        'Structured template for milestone-gated fixed price software engagements with formal sign-off gates.',
        'FIXED_PRICE_DELIVERY',
        'FIXED_COST',
        60,
        '[
            {"name": "Sprint 0 & Scope Baseline Signoff", "target_offset_days": 10, "display_order": 1},
            {"name": "Core MVP Functionality Delivery", "target_offset_days": 35, "display_order": 2},
            {"name": "Client UAT & Production Cutover", "target_offset_days": 60, "display_order": 3}
        ]'::jsonb,
        TRUE,
        v_admin_id
    ) ON CONFLICT (template_code) DO NOTHING;

    -- 2. Task Templates for Client Onboarding
    INSERT INTO task_templates (
        id, project_template_id, task_template_code, title, description,
        task_type_id, priority, hierarchy_level, start_offset_days, duration_days,
        estimated_hours, default_role_code, checklists_template, display_order, is_active, created_by
    ) VALUES (
        'f2000000-0000-0000-0000-000000000001',
        'f1000000-0000-0000-0000-000000000001',
        'TPL-TSK-ONB-01',
        'Kickoff Meeting & Governance Alignment',
        'Coordinate executive stakeholder briefing, communication matrix, and shared Slack/Teams channels.',
        v_task_type_task,
        'HIGH',
        'TASK',
        0, 2, 8.00,
        'ROLE_PROJECT_MANAGER',
        '[{"item": "Schedule 60m intro call", "is_required": true}, {"item": "Exchange key contact matrix", "is_required": true}, {"item": "Distribute project charter & timeline", "is_required": true}]'::jsonb,
        1, TRUE, v_admin_id
    ), (
        'f2000000-0000-0000-0000-000000000002',
        'f1000000-0000-0000-0000-000000000001',
        'TPL-TSK-ONB-02',
        'Cloud IAM & Sandbox Workspace Provisioning',
        'Set up AWS/GCP development accounts, configure federated SSO, and whitelist client IP ranges.',
        v_task_type_task,
        'HIGH',
        'TASK',
        2, 5, 16.00,
        'ROLE_DEVOPS',
        '[{"item": "Create dedicated VPC and subnets", "is_required": true}, {"item": "Provision IAM cross-account roles", "is_required": true}, {"item": "Verify SSH & VPN connectivity", "is_required": true}]'::jsonb,
        2, TRUE, v_admin_id
    ), (
        'f2000000-0000-0000-0000-000000000003',
        'f1000000-0000-0000-0000-000000000001',
        'TPL-TSK-ONB-03',
        'Architecture Review & Data Flow Mapping',
        'Review existing client API specs, third-party integrations, and compliance constraints.',
        v_task_type_task,
        'URGENT',
        'TASK',
        7, 7, 24.00,
        'ROLE_DEVELOPER',
        '[{"item": "Draft system context diagram", "is_required": true}, {"item": "Document integration authentication tokens", "is_required": true}, {"item": "Present architecture decision record", "is_required": true}]'::jsonb,
        3, TRUE, v_admin_id
    ), (
        'f2000000-0000-0000-0000-000000000004',
        'f1000000-0000-0000-0000-000000000001',
        'TPL-TSK-ONB-04',
        'Pilot Environment Smoke Testing & Handoff',
        'Deploy baseline release build to pilot staging environment and execute initial verification suite.',
        v_task_type_task,
        'MEDIUM',
        'TASK',
        15, 10, 20.00,
        'ROLE_QA_TESTER',
        '[{"item": "Deploy staging artifact build", "is_required": true}, {"item": "Execute automated smoke tests", "is_required": true}, {"item": "Issue client test login credentials", "is_required": true}]'::jsonb,
        4, TRUE, v_admin_id
    ), (
        -- Standalone Templates
        'f2000000-0000-0000-0000-000000000005',
        NULL,
        'TPL-TSK-SEC-AUDIT',
        'Quarterly SOC2 / ISO27001 Security Audit & Vulnerability Scan',
        'Comprehensive security review covering dependencies, container vulnerabilities, IAM access keys, and staging backups.',
        v_task_type_task,
        'HIGH',
        'TASK',
        0, 5, 18.00,
        'ROLE_DEVOPS',
        '[{"item": "Run Trivy container scan", "is_required": true}, {"item": "Audit IAM inactive access keys > 90 days", "is_required": true}, {"item": "Rotate staging database credentials", "is_required": true}, {"item": "File vulnerability remediation tickets", "is_required": true}]'::jsonb,
        1, TRUE, v_admin_id
    ), (
        'f2000000-0000-0000-0000-000000000006',
        NULL,
        'TPL-TSK-REL-CHECKLIST',
        'Production Release Checklist & Smoke Verification',
        'Operational checklist executed by delivery lead and DevOps specialist prior to cutover.',
        v_task_type_task,
        'URGENT',
        'TASK',
        0, 1, 6.00,
        'ROLE_PROJECT_MANAGER',
        '[{"item": "Verify database migration dry run on staging replica", "is_required": true}, {"item": "Check S3 bucket policy and CORS configuration", "is_required": true}, {"item": "Trigger blue-green zero-downtime deployment", "is_required": true}, {"item": "Execute automated smoke test suite on live endpoints", "is_required": true}]'::jsonb,
        2, TRUE, v_admin_id
    ) ON CONFLICT (task_template_code) DO NOTHING;

    -- 3. Recurring Work Rules
    INSERT INTO recurring_work_rules (
        id, rule_code, title, description, product_id, project_id,
        task_template_id, frequency, interval_count, day_of_month, day_of_week,
        next_run_date, default_assignee_user_id, default_priority, is_active, created_by
    ) VALUES (
        'f3000000-0000-0000-0000-000000000001',
        'REC-SEC-AUDIT-Q',
        'Quarterly Security & Infrastructure Compliance Audit',
        'Automated recurrence rule generating quarterly security review tasks for the flagship ERP product.',
        'a0000000-0000-0000-0000-000000000001',
        NULL,
        'f2000000-0000-0000-0000-000000000005',
        'QUARTERLY',
        1,
        1,
        NULL,
        CURRENT_DATE + INTERVAL '1 day',
        v_lead_user_id,
        'HIGH',
        TRUE,
        v_admin_id
    ), (
        'f3000000-0000-0000-0000-000000000002',
        'REC-DB-MAINT-WK',
        'Weekly Database Index Defrag & VACUUM ANALYZE Review',
        'Automated recurrence rule for weekly PostgreSQL maintenance review and query plan sanity check.',
        NULL,
        'b0000000-0000-0000-0000-000000000001',
        NULL,
        'WEEKLY',
        1,
        NULL,
        1,
        CURRENT_DATE + INTERVAL '2 days',
        v_dev_user_id,
        'MEDIUM',
        TRUE,
        v_admin_id
    ) ON CONFLICT (rule_code) DO NOTHING;

    -- 4. Sample Occurrence History
    INSERT INTO recurring_task_occurrences (
        id, rule_id, scheduled_date, executed_at, generated_task_id, execution_status, created_by
    ) VALUES (
        'f4000000-0000-0000-0000-000000000001',
        'f3000000-0000-0000-0000-000000000002',
        CURRENT_DATE - INTERVAL '5 days',
        CURRENT_TIMESTAMP - INTERVAL '5 days',
        '20000000-0000-0000-0000-0000000003e8',
        'SUCCESS',
        v_admin_id
    ) ON CONFLICT (rule_id, scheduled_date) DO NOTHING;

    -- ========================================================
    -- Date & Time: 2026-10-01 10:10:00 IST
    -- Description: COLLAB-003 - Sample Notification Settings, Watchers & Queue Records
    -- ========================================================

    -- 5. User Notification Settings
    INSERT INTO user_notification_settings (
        id, user_id, client_contact_id, email_notifications_enabled, in_app_notifications_enabled,
        push_notifications_enabled, digest_mode, quiet_hours_enabled, quiet_hours_start,
        quiet_hours_end, timezone, allow_urgent_during_quiet_hours, event_preferences, created_by
    ) VALUES (
        'f5000000-0000-0000-0000-000000000001',
        v_admin_id,
        NULL,
        TRUE,
        TRUE,
        TRUE,
        'INSTANT',
        FALSE,
        NULL,
        NULL,
        'Asia/Kolkata',
        TRUE,
        '{"TASK_ASSIGNMENT": true, "STATUS_CHANGE": true, "COMMENT_AND_MENTION": true, "BLOCKER_AND_DEPENDENCY": true, "DOCUMENT_REVISION": true, "APPROVAL_AND_SIGNOFF": true, "DEADLINE_AND_SLA": true, "RECURRING_WORK_RUN": true}'::jsonb,
        v_admin_id
    ), (
        'f5000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000003', -- PM Priya Desai
        NULL,
        TRUE,
        TRUE,
        FALSE,
        'DAILY',
        TRUE,
        '22:00:00',
        '07:00:00',
        'Asia/Kolkata',
        TRUE,
        '{"TASK_ASSIGNMENT": true, "STATUS_CHANGE": true, "COMMENT_AND_MENTION": true, "BLOCKER_AND_DEPENDENCY": true, "DOCUMENT_REVISION": true, "APPROVAL_AND_SIGNOFF": true, "DEADLINE_AND_SLA": true, "RECURRING_WORK_RUN": false}'::jsonb,
        v_admin_id
    ), (
        'f5000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000006', -- Dev Rohan
        NULL,
        FALSE,
        TRUE,
        FALSE,
        'INSTANT',
        TRUE,
        '23:00:00',
        '08:00:00',
        'Asia/Kolkata',
        FALSE,
        '{"TASK_ASSIGNMENT": true, "STATUS_CHANGE": true, "COMMENT_AND_MENTION": true, "BLOCKER_AND_DEPENDENCY": true, "DOCUMENT_REVISION": false, "APPROVAL_AND_SIGNOFF": false, "DEADLINE_AND_SLA": true, "RECURRING_WORK_RUN": false}'::jsonb,
        v_admin_id
    ) ON CONFLICT (user_id) DO NOTHING;

    -- 6. Work Item Watchers (Independent Followers)
    INSERT INTO work_item_watchers (
        id, entity_type, entity_id, user_id, client_contact_id,
        notify_on_status_change, notify_on_comments, notify_on_attachments, notify_on_approvals,
        created_by
    ) VALUES (
        'f6000000-0000-0000-0000-000000000001',
        'TASK',
        '20000000-0000-0000-0000-0000000003e9',
        v_admin_id,
        NULL,
        TRUE, TRUE, TRUE, TRUE,
        v_admin_id
    ), (
        'f6000000-0000-0000-0000-000000000002',
        'TASK',
        '20000000-0000-0000-0000-0000000003e9',
        '00000000-0000-0000-0000-000000000003',
        NULL,
        TRUE, TRUE, FALSE, TRUE,
        v_admin_id
    ), (
        'f6000000-0000-0000-0000-000000000003',
        'KNOWLEDGE_DOC',
        'e0000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000006',
        NULL,
        TRUE, TRUE, TRUE, TRUE,
        v_admin_id
    ), (
        'f6000000-0000-0000-0000-000000000004',
        'PRODUCT_IDEA',
        'd0000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000003',
        NULL,
        TRUE, TRUE, TRUE, TRUE,
        v_admin_id
    ) ON CONFLICT DO NOTHING;

    -- 7. Deduplicated Notification Delivery Queue Entries
    INSERT INTO notification_delivery_queue (
        id, deduplication_key, recipient_user_id, recipient_contact_id, delivery_channel,
        event_category, event_title, event_summary, entity_type, entity_id,
        entity_code, is_urgent, delivery_status, scheduled_for, created_by
    ) VALUES (
        'f7000000-0000-0000-0000-000000000001',
        'dedup_task_assign_3e9_admin',
        v_admin_id,
        NULL,
        'IN_APP',
        'TASK_ASSIGNMENT',
        'Assigned to GST E-Invoicing Engine',
        'You have been added to TSK-ERP-001 by System Administrator.',
        'TASK',
        '20000000-0000-0000-0000-0000000003e9',
        'TSK-ERP-001',
        FALSE,
        'SENT',
        CURRENT_TIMESTAMP - INTERVAL '1 hour',
        v_admin_id
    ), (
        'f7000000-0000-0000-0000-000000000002',
        'dedup_status_change_3e9_pm',
        '00000000-0000-0000-0000-000000000003',
        NULL,
        'EMAIL',
        'STATUS_CHANGE',
        'Task TSK-ERP-001 transitioned to IN_PROGRESS',
        'Developer Suresh Nair updated the status of TSK-ERP-001 to In Progress.',
        'TASK',
        '20000000-0000-0000-0000-0000000003e9',
        'TSK-ERP-001',
        FALSE,
        'QUEUED',
        CURRENT_TIMESTAMP,
        v_admin_id
    ), (
        'f7000000-0000-0000-0000-000000000003',
        'dedup_doc_rev_arch_pm',
        '00000000-0000-0000-0000-000000000003',
        NULL,
        'EMAIL',
        'DOCUMENT_REVISION',
        'New Revision 2 published for Architecture RFC',
        'Architect System Administrator published revision 2 for KS-ADR-001.',
        'KNOWLEDGE_DOC',
        'e0000000-0000-0000-0000-000000000001',
        'DOC-ADR-001',
        FALSE,
        'DIGEST_PENDING',
        CURRENT_TIMESTAMP,
        v_admin_id
    ) ON CONFLICT (deduplication_key) DO NOTHING;

    -- ========================================================
    -- Date & Time: 2026-10-01 10:25:00 IST
    -- Description: COLLAB-004 - Sample Activity Baselines & Saved Queries
    -- ========================================================

    -- 8. Change Activity Baselines
    INSERT INTO change_activity_baselines (
        id, baseline_code, title, description, scope_type, scope_id,
        baseline_timestamp, snapshot_data, is_frozen, is_active, created_by
    ) VALUES (
        'f8000000-0000-0000-0000-000000000001',
        'BASE-ERP-S1-COMMIT',
        'ERP Sprint 1 Commitment Baseline',
        'Official commitment snapshot of committed user stories and bugs prior to sprint start.',
        'SPRINT',
        '12000000-0000-0000-0000-000000000001',
        CURRENT_TIMESTAMP - INTERVAL '7 days',
        '{"taskCount": 4, "totalPoints": 34, "committedTaskIds": ["20000000-0000-0000-0000-0000000003e8", "20000000-0000-0000-0000-0000000003e9"]}'::jsonb,
        TRUE,
        TRUE,
        v_admin_id
    ), (
        'f8000000-0000-0000-0000-000000000002',
        'BASE-PRJ-KASH-SCOPE',
        'Kashvira Cloud Launch Scope Freeze',
        'Approved client contract scope baseline for Project ERP implementation.',
        'PROJECT',
        'b0000000-0000-0000-0000-000000000001',
        CURRENT_TIMESTAMP - INTERVAL '14 days',
        '{"totalTasks": 28, "totalEstimatedHours": 320, "approvedRequirementCount": 6}'::jsonb,
        TRUE,
        TRUE,
        v_admin_id
    ) ON CONFLICT (baseline_code) DO NOTHING;

    -- 9. User Saved Activity Queries
    INSERT INTO user_activity_saved_queries (
        id, user_id, query_name, time_filter_type, baseline_id, scope_type,
        scope_id, is_client_safe, category_filters, is_active, created_by
    ) VALUES (
        'f9000000-0000-0000-0000-000000000001',
        v_admin_id,
        'Changes Since My Last Login',
        'LAST_LOGIN',
        NULL,
        NULL,
        NULL,
        FALSE,
        '["SCOPE_ADDITION", "SCOPE_REMOVAL", "STATUS_TRANSITION", "BLOCKER_EVENT", "REQUIREMENT_CHANGE", "DOCUMENT_REVISION"]'::jsonb,
        TRUE,
        v_admin_id
    ), (
        'f9000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000003', -- PM Priya Desai
        'Sprint 1 Scope Diff vs Baseline',
        'SINCE_BASELINE',
        'f8000000-0000-0000-0000-000000000001',
        'SPRINT',
        '12000000-0000-0000-0000-000000000001',
        FALSE,
        '["SCOPE_ADDITION", "SCOPE_REMOVAL", "STATUS_TRANSITION", "BLOCKER_EVENT"]'::jsonb,
        TRUE,
        v_admin_id
    ), (
        'f9000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000003',
        'Client-Safe Weekly Changes',
        'DAYS_7',
        NULL,
        'PROJECT',
        'b0000000-0000-0000-0000-000000000001',
        TRUE,
        '["STATUS_TRANSITION", "DOCUMENT_REVISION", "REQUIREMENT_CHANGE"]'::jsonb,
        TRUE,
        v_admin_id
    ) ON CONFLICT DO NOTHING;
END ;
