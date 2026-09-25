-- ========================================================
-- Date & Time: 2026-09-25 13:15:00 IST
-- Author: Database Architect (KS-PMT)
-- Description: Core Schema Definition for Kashvira Infotech - Project & Product Management Tool
-- PostgreSQL 14+ / 16+
-- ========================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================================
-- 1. Organizational Structure: Branches / Locations Master
-- ========================================================
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_code VARCHAR(50) NOT NULL UNIQUE,
    branch_name VARCHAR(150) NOT NULL,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'India',
    postal_code VARCHAR(20) NOT NULL,
    phone VARCHAR(25),
    email VARCHAR(150),
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    geofence_radius_meters INTEGER NOT NULL DEFAULT 200,
    is_head_office BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========================================================
-- 2. Organizational Structure: Departments Master
-- ========================================================
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dept_code VARCHAR(50) NOT NULL UNIQUE,
    dept_name VARCHAR(100) NOT NULL,
    description TEXT,
    hod_user_id UUID, -- Foreign key reference added in alter/post user table
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========================================================
-- 3. Organizational Structure: Designations Master
-- ========================================================
CREATE TABLE IF NOT EXISTS designations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    desig_code VARCHAR(50) NOT NULL UNIQUE,
    desig_name VARCHAR(100) NOT NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    hierarchy_level INTEGER NOT NULL DEFAULT 1, -- Higher number indicates higher seniority (for auto-assignment/escalations)
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========================================================
-- 4. Access Control: Roles Master
-- ========================================================
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_code VARCHAR(50) NOT NULL UNIQUE,
    role_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system_role BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========================================================
-- 5. Access Control: Granular Permissions Registry
-- ========================================================
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module VARCHAR(50) NOT NULL, -- e.g., 'TASKS', 'PROJECTS', 'PRODUCTS', 'CLIENTS', 'USERS', 'REPORTS', 'BRANCHES'
    action VARCHAR(50) NOT NULL, -- e.g., 'CREATE', 'READ', 'UPDATE', 'DELETE', 'EXPORT', 'APPROVE', 'VIEW_FINANCIALS'
    permission_code VARCHAR(100) NOT NULL UNIQUE, -- e.g., 'TASKS:CREATE', 'PROJECTS:VIEW_FINANCIALS'
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========================================================
-- 6. Access Control: Role Permissions Mapping
-- ========================================================
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_role_permission UNIQUE (role_id, permission_id)
);

-- ========================================================
-- 7. Employee / User Management (Dual Auth: Password or Mobile OTP)
-- ========================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_code VARCHAR(50) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    mobile_number VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255), -- Argon2id or bcrypt hash; nullable if strictly mobile OTP
    primary_branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    designation_id UUID NOT NULL REFERENCES designations(id) ON DELETE RESTRICT,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    reporting_manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
    avatar_s3_key VARCHAR(500),
    is_email_login_allowed BOOLEAN NOT NULL DEFAULT TRUE,
    is_otp_login_allowed BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_ip VARCHAR(45),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Circular FK for departments HOD
ALTER TABLE departments 
ADD CONSTRAINT fk_departments_hod 
FOREIGN KEY (hod_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- ========================================================
-- 8. Multi-Branch Access for Users
-- ========================================================
CREATE TABLE IF NOT EXISTS user_branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_branch UNIQUE (user_id, branch_id)
);

-- ========================================================
-- 9. Dynamic RBAC: User-Level Permission Overrides
-- ========================================================
CREATE TABLE IF NOT EXISTS user_permission_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    is_granted BOOLEAN NOT NULL, -- TRUE: explicit grant; FALSE: explicit revocation
    reason TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_permission_override UNIQUE (user_id, permission_id)
);

-- ========================================================
-- 10. Dynamic RBAC: Branch-Level Permission Overrides
-- ========================================================
CREATE TABLE IF NOT EXISTS branch_permission_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    is_allowed BOOLEAN NOT NULL, -- FALSE: blocked for everyone in this branch
    reason TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_branch_permission_override UNIQUE (branch_id, permission_id)
);

-- ========================================================
-- 11. CRM & Client Management: Clients & Prospects
-- ========================================================
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_code VARCHAR(50) NOT NULL UNIQUE,
    company_name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(150) NOT NULL,
    designation VARCHAR(100),
    email VARCHAR(255) NOT NULL,
    mobile_number VARCHAR(20) NOT NULL,
    alternate_phone VARCHAR(20),
    website VARCHAR(255),
    address TEXT,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'India',
    postal_code VARCHAR(20),
    tax_id_or_gst VARCHAR(50),
    client_type VARCHAR(50) NOT NULL DEFAULT 'PROSPECT', -- 'PROSPECT', 'ACTIVE_CLIENT', 'FORMER_CLIENT'
    account_manager_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========================================================
-- 12. Products Master (Proprietary Software Products)
-- ========================================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_code VARCHAR(50) NOT NULL UNIQUE,
    product_name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    current_version VARCHAR(50),
    base_license_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    standard_amc_percentage NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    product_manager_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========================================================
-- 13. Product to Clients Mapping (Licenses & Subscriptions)
-- ========================================================
CREATE TABLE IF NOT EXISTS product_client_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    license_type VARCHAR(50) NOT NULL, -- 'SAAS_SUBSCRIPTION', 'ON_PREMISE_PERPETUAL', 'ANNUAL_LEASE'
    contract_value NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    amc_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    license_start_date DATE NOT NULL,
    license_end_date DATE,
    amc_renewal_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'EXPIRED', 'PENDING_RENEWAL', 'TERMINATED'
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========================================================
-- 14. Projects Master (Custom Development Services)
-- ========================================================
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_code VARCHAR(50) NOT NULL UNIQUE,
    project_name VARCHAR(200) NOT NULL,
    description TEXT,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    project_manager_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    billing_type VARCHAR(50) NOT NULL, -- 'FIXED_COST', 'TIME_AND_MATERIAL', 'RETAINER'
    contract_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    budgeted_hours NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    project_status VARCHAR(50) NOT NULL DEFAULT 'PLANNING', -- 'PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========================================================
-- 15. Project Team Allocations (Project Members)
-- ========================================================
CREATE TABLE IF NOT EXISTS project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    project_role VARCHAR(100), -- 'Lead Developer', 'UI/UX Designer', 'QA Lead', 'Fullstack Dev'
    allocation_percentage NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_project_member UNIQUE (project_id, user_id)
);

-- ========================================================
-- 16. Version Management (For Products and Projects)
-- ========================================================
CREATE TABLE IF NOT EXISTS versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_code VARCHAR(50) NOT NULL, -- e.g., 'v1.0.0', 'Sprint 3', 'Phase 1'
    version_name VARCHAR(150),
    description TEXT,
    entity_type VARCHAR(20) NOT NULL, -- 'PRODUCT' or 'PROJECT'
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    planned_start_date DATE,
    target_release_date DATE,
    actual_release_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'PLANNING', -- 'PLANNING', 'IN_PROGRESS', 'CODE_FREEZE', 'RELEASED', 'ARCHIVED'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_version_entity CHECK (
        (entity_type = 'PRODUCT' AND product_id IS NOT NULL AND project_id IS NULL) OR
        (entity_type = 'PROJECT' AND project_id IS NOT NULL AND product_id IS NULL)
    )
);

-- ========================================================
-- 17. Dynamic Task Types Master
-- ========================================================
CREATE TABLE IF NOT EXISTS task_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_code VARCHAR(50) NOT NULL UNIQUE,
    type_name VARCHAR(100) NOT NULL, -- 'New Development', 'Bug', 'Issue', 'Enhancement', 'Training', 'Support'
    description TEXT,
    color_hex VARCHAR(10) DEFAULT '#3B82F6',
    icon_name VARCHAR(50) DEFAULT 'check-square',
    is_chargeable_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========================================================
-- 18. Dynamic Task Statuses Master
-- ========================================================
CREATE TABLE IF NOT EXISTS task_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status_code VARCHAR(50) NOT NULL UNIQUE,
    status_name VARCHAR(100) NOT NULL, -- 'Open', 'WIP', 'Pending for Testing', 'Testing', 'Pending for Deployment', 'Closed', 'Cancelled'
    description TEXT,
    status_category VARCHAR(50) NOT NULL, -- 'TODO', 'IN_PROGRESS', 'REVIEW_TEST', 'DONE', 'CANCELLED'
    sequence_order INTEGER NOT NULL DEFAULT 1,
    color_hex VARCHAR(10) DEFAULT '#6B7280',
    is_terminal BOOLEAN NOT NULL DEFAULT FALSE, -- TRUE for Closed or Cancelled
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========================================================
-- 19. Dynamic Task Workflow: Allowed Transitions per Task Type
-- ========================================================
CREATE TABLE IF NOT EXISTS task_type_workflow_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_type_id UUID NOT NULL REFERENCES task_types(id) ON DELETE CASCADE,
    from_status_id UUID NOT NULL REFERENCES task_statuses(id) ON DELETE CASCADE,
    to_status_id UUID NOT NULL REFERENCES task_statuses(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_task_workflow_transition UNIQUE (task_type_id, from_status_id, to_status_id)
);

-- ========================================================
-- 20. Core Tasks Master (with Subtasks, Estimates & Billing)
-- ========================================================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_code VARCHAR(50) NOT NULL UNIQUE, -- e.g., 'TSK-1001'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    task_type_id UUID NOT NULL REFERENCES task_types(id) ON DELETE RESTRICT,
    status_id UUID NOT NULL REFERENCES task_statuses(id) ON DELETE RESTRICT,
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL'
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    version_id UUID REFERENCES versions(id) ON DELETE SET NULL,
    parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE, -- Hierarchical sub-task
    planned_start_date TIMESTAMP WITH TIME ZONE,
    planned_end_date TIMESTAMP WITH TIME ZONE,
    actual_start_date TIMESTAMP WITH TIME ZONE,
    actual_end_date TIMESTAMP WITH TIME ZONE,
    estimated_hours NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    is_chargeable BOOLEAN NOT NULL DEFAULT FALSE,
    charge_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_task_parent CHECK (id <> parent_task_id),
    CONSTRAINT chk_task_scope CHECK (
        (project_id IS NOT NULL AND product_id IS NULL) OR
        (product_id IS NOT NULL AND project_id IS NULL) OR
        (project_id IS NULL AND product_id IS NULL)
    )
);

-- ========================================================
-- 21. Task Multi-User Assignees
-- ========================================================
CREATE TABLE IF NOT EXISTS task_assignees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    is_primary_assignee BOOLEAN NOT NULL DEFAULT FALSE,
    assigned_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_task_assignee UNIQUE (task_id, user_id)
);

-- ========================================================
-- 22. Effort Tracking: Task Time Logs / Worklogs
-- ========================================================
CREATE TABLE IF NOT EXISTS task_time_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    hours_spent NUMERIC(6, 2) NOT NULL,
    is_billable BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT NOT NULL,
    timer_start_time TIMESTAMP WITH TIME ZONE,
    timer_end_time TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_positive_hours CHECK (hours_spent > 0)
);

-- ========================================================
-- 23. Task Comments & Collaboration
-- ========================================================
CREATE TABLE IF NOT EXISTS task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES task_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    comment_text TEXT NOT NULL,
    is_internal_only BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========================================================
-- 24. AWS S3 File Attachments Metadata
-- ========================================================
CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL, -- 'TASK', 'TASK_COMMENT', 'PROJECT', 'PRODUCT', 'CLIENT', 'USER_AVATAR'
    entity_id UUID NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    s3_bucket_name VARCHAR(150) NOT NULL,
    s3_object_key VARCHAR(500) NOT NULL,
    s3_region VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========================================================
-- 25. Auto-Assignment Rules Matrix
-- ========================================================
CREATE TABLE IF NOT EXISTS auto_assignment_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name VARCHAR(150) NOT NULL,
    trigger_event VARCHAR(50) NOT NULL, -- 'ON_CREATION', 'ON_STATUS_CHANGE'
    task_type_id UUID REFERENCES task_types(id) ON DELETE CASCADE,
    from_status_id UUID REFERENCES task_statuses(id) ON DELETE SET NULL,
    to_status_id UUID REFERENCES task_statuses(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    target_assignment_type VARCHAR(50) NOT NULL, -- 'SPECIFIC_USER', 'DEPARTMENT_HOD', 'DESIGNATION_HIERARCHY', 'PROJECT_MANAGER', 'ROUND_ROBIN'
    target_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    target_designation_id UUID REFERENCES designations(id) ON DELETE SET NULL,
    target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========================================================
-- 26. In-App Notifications Queue
-- ========================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    notification_type VARCHAR(50) NOT NULL, -- 'TASK_ASSIGNED', 'STATUS_CHANGED', 'COMMENT_ADDED', 'MENTIONED', 'DEADLINE_ALERT'
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    entity_type VARCHAR(50), -- 'TASK', 'PROJECT', 'VERSION', 'COMMENT'
    entity_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    is_push_sent BOOLEAN NOT NULL DEFAULT FALSE,
    is_email_sent BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========================================================
-- 27. User Push Tokens (FCM Tokens for Android & iOS)
-- ========================================================
CREATE TABLE IF NOT EXISTS user_push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_type VARCHAR(20) NOT NULL, -- 'ANDROID', 'IOS', 'WEB'
    fcm_token TEXT NOT NULL,
    device_model VARCHAR(100),
    os_version VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_fcm_token UNIQUE (user_id, fcm_token)
);

-- ========================================================
-- 28. Central Audit Trail & Activity Tracking
-- ========================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL, -- 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'OTP_REQUESTED', 'TASK_CREATED', 'TASK_UPDATED', 'STATUS_CHANGED', 'FILE_ATTACHED', 'TIME_LOGGED', etc.
    entity_name VARCHAR(100) NOT NULL, -- 'users', 'tasks', 'attachments', 'projects', 'clients', etc.
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_platform VARCHAR(50), -- 'WEB', 'ANDROID', 'IOS'
    location_coordinates VARCHAR(100), -- 'lat,long' from GPS or GeoIP
    remarks TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========================================================
-- Date & Time: 2026-09-25 16:32:38 (UTC)
-- Description: Requirements audit - device session revocation and preferences
-- ========================================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_platform VARCHAR(20) NOT NULL DEFAULT 'WEB',
    refresh_token_hash VARCHAR(64),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
