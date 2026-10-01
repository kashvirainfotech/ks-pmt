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
    emergency_contact TEXT,
    employment_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (employment_status IN ('ACTIVE','INACTIVE','SUSPENDED')),
    notification_preferences JSONB NOT NULL DEFAULT '{"inApp":true,"email":true,"push":true}'::jsonb,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
    tech_stack TEXT,
    documentation_links TEXT,
    subscription_plans TEXT,
    implementation_fee NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (implementation_fee >= 0),
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
    support_tier VARCHAR(100),
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
    client_id UUID REFERENCES clients(id) ON DELETE RESTRICT,
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
    tech_stack TEXT,
    invoicing_milestones TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========================================================
-- 14b. Delivery Teams & Team Members (PLAN-004)
-- ========================================================
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_code VARCHAR(50) NOT NULL UNIQUE,
    team_name VARCHAR(150) NOT NULL,
    description TEXT,
    lead_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_in_team VARCHAR(50) NOT NULL DEFAULT 'DEVELOPER', -- 'LEAD', 'DEVELOPER', 'QA_ENGINEER', 'DEVOPS', 'PRODUCT_OWNER', 'UI_DESIGNER'
    joined_date DATE NOT NULL DEFAULT CURRENT_DATE,
    left_date DATE,
    allocation_percentage NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_team_member UNIQUE (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS team_projects (
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (team_id, project_id)
);

CREATE TABLE IF NOT EXISTS team_products (
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (team_id, product_id)
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
-- 16b. Milestones Master (PLAN-001)
-- ========================================================
CREATE TABLE IF NOT EXISTS milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_code VARCHAR(50) NOT NULL, -- e.g. 'MLS-ALPHA', 'MLS-Q3-CORE'
    milestone_name VARCHAR(150) NOT NULL,
    description TEXT,
    entity_type VARCHAR(20) NOT NULL, -- 'PRODUCT' or 'PROJECT'
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    target_date DATE,
    actual_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'ACHIEVED', 'MISSED', 'CANCELLED')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_milestone_entity CHECK (
        (entity_type = 'PRODUCT' AND product_id IS NOT NULL AND project_id IS NULL) OR
        (entity_type = 'PROJECT' AND project_id IS NOT NULL AND product_id IS NULL)
    ),
    CONSTRAINT uq_milestone_code_entity UNIQUE (milestone_code, entity_type, product_id, project_id)
);

-- ========================================================
-- 16c. Agile Sprints Master (PLAN-001)
-- ========================================================
CREATE TABLE IF NOT EXISTS sprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sprint_code VARCHAR(50) NOT NULL, -- e.g. 'SPR-2026-01'
    sprint_name VARCHAR(150) NOT NULL,
    sprint_goal TEXT,
    entity_type VARCHAR(20) NOT NULL, -- 'PRODUCT' or 'PROJECT'
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PLANNING' CHECK (status IN ('PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
    committed_tasks_count INTEGER NOT NULL DEFAULT 0,
    committed_story_points NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    committed_hours NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    completed_tasks_count INTEGER NOT NULL DEFAULT 0,
    completed_story_points NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    completed_hours NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    total_capacity_hours NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_sprint_entity CHECK (
        (entity_type = 'PRODUCT' AND product_id IS NOT NULL AND project_id IS NULL) OR
        (entity_type = 'PROJECT' AND project_id IS NOT NULL AND product_id IS NULL)
    ),
    CONSTRAINT chk_sprint_dates CHECK (end_date >= start_date)
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
    default_severity VARCHAR(100),
    custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
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
    revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
    custom_field_values JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(custom_field_values) = 'object'),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    hierarchy_level VARCHAR(20) NOT NULL DEFAULT 'TASK' CHECK (hierarchy_level IN ('INITIATIVE', 'EPIC', 'TASK', 'SUBTASK')),
    task_type_id UUID NOT NULL REFERENCES task_types(id) ON DELETE RESTRICT,
    status_id UUID NOT NULL REFERENCES task_statuses(id) ON DELETE RESTRICT,
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL'
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    version_id UUID REFERENCES versions(id) ON DELETE SET NULL,
    sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL,
    milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,
    parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE, -- Hierarchical parent (Epic for Task, Task for Subtask)
    responsible_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    backlog_order NUMERIC(12, 4) NOT NULL DEFAULT 0.0000, -- Custom rank ordering in project/product backlog
    story_points NUMERIC(5, 1) CHECK (story_points >= 0),
    t_shirt_size VARCHAR(10) CHECK (t_shirt_size IN ('XS', 'S', 'M', 'L', 'XL', 'XXL')),
    planned_start_date TIMESTAMP WITH TIME ZONE,
    planned_end_date TIMESTAMP WITH TIME ZONE,
    actual_start_date TIMESTAMP WITH TIME ZONE,
    actual_end_date TIMESTAMP WITH TIME ZONE,
    estimated_hours NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    is_chargeable BOOLEAN NOT NULL DEFAULT FALSE,
    charge_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT,
    severity VARCHAR(100),
    resolution VARCHAR(50) CHECK (resolution IS NULL OR resolution IN ('FIXED', 'WONT_FIX', 'DUPLICATE', 'CANNOT_REPRODUCE', 'BY_DESIGN')),
    resolution_details TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
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
-- 21b. Sprint Task Associations & Scope Ledger (PLAN-001)
-- ========================================================
CREATE TABLE IF NOT EXISTS sprint_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    is_initial_commitment BOOLEAN NOT NULL DEFAULT TRUE,
    added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    added_by UUID NOT NULL REFERENCES users(id),
    removed_at TIMESTAMP WITH TIME ZONE,
    removed_by UUID REFERENCES users(id),
    scope_change_reason TEXT,
    rollover_from_sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_sprint_task_session UNIQUE (sprint_id, task_id, added_at)
);

-- ========================================================
-- 21c. Task Dependencies & Relationships (PLAN-002)
-- ========================================================
CREATE TABLE IF NOT EXISTS task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    target_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    link_type VARCHAR(50) NOT NULL CHECK (link_type IN (
        'FINISH_TO_START', 'BLOCKS', 'RELATED_TO', 'DUPLICATE_OF', 
        'CAUSES', 'FIXED_BY', 'TESTED_BY', 'RELEASED_IN'
    )),
    description TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_no_self_dependency CHECK (source_task_id <> target_task_id),
    CONSTRAINT uq_task_dependency UNIQUE (source_task_id, target_task_id, link_type)
);

-- ========================================================
-- 21d. Task Blocker Episodes (PLAN-002)
-- ========================================================
CREATE TABLE IF NOT EXISTS task_blocker_episodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    blocking_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    next_action TEXT,
    follow_up_date TIMESTAMP WITH TIME ZONE,
    expected_resolution_date TIMESTAMP WITH TIME ZONE,
    category VARCHAR(50) NOT NULL DEFAULT 'TECHNICAL' CHECK (category IN (
        'TECHNICAL', 'DEPENDENCY', 'CLIENT', 'ENVIRONMENT', 'SPECIFICATION', 'THIRD_PARTY', 'RESOURCE', 'OTHER'
    )),
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    notes TEXT,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RESOLVED', 'DISMISSED')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========================================================
-- Date & Time: 2026-09-29 14:05:00 (IST)
-- Description: 21e. Weekly Timesheets (TIME-001)
-- ========================================================
CREATE TABLE IF NOT EXISTS weekly_timesheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period_start_date DATE NOT NULL,
    period_end_date DATE NOT NULL,
    expected_hours NUMERIC(6, 2) NOT NULL DEFAULT 40.00,
    total_logged_hours NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    total_billable_hours NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    total_overtime_hours NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED')),
    submitted_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejected_by UUID REFERENCES users(id) ON DELETE SET NULL,
    revision INTEGER NOT NULL DEFAULT 1,
    submission_notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_period UNIQUE (user_id, period_start_date)
);

-- ========================================================
-- Date & Time: 2026-09-29 14:05:00 (IST)
-- Description: 21f. Timesheet Project Portions for Cross-Project Reviewers (TIME-001)
-- ========================================================
CREATE TABLE IF NOT EXISTS timesheet_project_portions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timesheet_id UUID NOT NULL REFERENCES weekly_timesheets(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    logged_hours NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    billable_hours NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_remarks TEXT,
    revision INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========================================================
-- 22. Effort Tracking: Task Time Logs / Worklogs
-- ========================================================
CREATE TABLE IF NOT EXISTS task_time_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    timesheet_id UUID REFERENCES weekly_timesheets(id) ON DELETE SET NULL,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    hours_spent NUMERIC(6, 2) NOT NULL,
    is_billable BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT NOT NULL,
    timer_start_time TIMESTAMP WITH TIME ZONE,
    timer_end_time TIMESTAMP WITH TIME ZONE,
    is_overtime BOOLEAN NOT NULL DEFAULT FALSE,
    is_weekend BOOLEAN NOT NULL DEFAULT FALSE,
    approval_status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (approval_status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED')),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_remarks TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_positive_hours CHECK (hours_spent > 0)
);

-- ========================================================
-- Date & Time: 2026-09-29 14:05:00 (IST)
-- Description: 22a. Persistent Global Active Timer Across Tabs & Devices (TIME-001)
-- ========================================================
CREATE TABLE IF NOT EXISTS user_active_timers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    accumulated_seconds INTEGER NOT NULL DEFAULT 0,
    is_paused BOOLEAN NOT NULL DEFAULT FALSE,
    paused_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    is_billable BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_active_timer UNIQUE (user_id)
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

-- ========================================================
-- Date & Time: 2026-09-27 07:22:54 (UTC)
-- Description: Department head relationship without circular table dependencies
-- ========================================================
-- At most one head per department. No row means no assigned head.
-- Removing a user removes the assignment, leaving the department intact.
CREATE TABLE department_heads (
    department_id UUID PRIMARY KEY REFERENCES departments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========================================================
-- Date & Time: 2026-09-29 11:15:00 IST
-- Description: FND-001 - Working Calendars, Holidays, Employee Schedules & Leave Tracking
-- ========================================================

-- 29. Company / Branch Working Calendars
CREATE TABLE IF NOT EXISTS working_calendars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_code VARCHAR(50) NOT NULL UNIQUE,
    calendar_name VARCHAR(150) NOT NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    standard_hours_per_day NUMERIC(4, 2) NOT NULL DEFAULT 8.00 CHECK (standard_hours_per_day > 0 AND standard_hours_per_day <= 24),
    working_days_mask VARCHAR(7) NOT NULL DEFAULT '1111100', -- Mon to Sun (1=working, 0=off)
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 30. Calendar Holidays Master
CREATE TABLE IF NOT EXISTS calendar_holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_id UUID REFERENCES working_calendars(id) ON DELETE CASCADE,
    holiday_name VARCHAR(150) NOT NULL,
    holiday_date DATE NOT NULL,
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 31. Employee Calendar & Schedule Assignments
CREATE TABLE IF NOT EXISTS employee_calendar_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    calendar_id UUID NOT NULL REFERENCES working_calendars(id) ON DELETE RESTRICT,
    effective_from DATE NOT NULL,
    effective_to DATE,
    custom_hours_per_day NUMERIC(4, 2) CHECK (custom_hours_per_day > 0 AND custom_hours_per_day <= 24),
    billable_target_hours_per_week NUMERIC(4, 2) NOT NULL DEFAULT 40.00 CHECK (billable_target_hours_per_week >= 0),
    is_contractor BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 32. Employee Leave & Absence Records
CREATE TABLE IF NOT EXISTS employee_leave_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL, -- 'ANNUAL', 'SICK', 'CASUAL', 'MATERNITY', 'PATERNITY', 'UNPAID'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_count NUMERIC(4, 1) NOT NULL DEFAULT 1.0 CHECK (days_count > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'APPROVED' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    reason TEXT,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========================================================
-- Date & Time: 2026-09-29 13:20:00 (IST)
-- Description: 33. Saved Views & Attention Workspaces (PLAN-003)
-- ========================================================
CREATE TABLE IF NOT EXISTS saved_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    view_name VARCHAR(150) NOT NULL,
    entity_type VARCHAR(50) NOT NULL DEFAULT 'TASK' CHECK (entity_type IN ('TASK', 'DEFECT', 'SPRINT', 'PROJECT', 'PORTFOLIO', 'MY_WORK')),
    scope VARCHAR(20) NOT NULL DEFAULT 'PERSONAL' CHECK (scope IN ('PERSONAL', 'TEAM', 'PROJECT', 'GLOBAL')),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    icon VARCHAR(50) DEFAULT 'bookmark',
    color VARCHAR(30) DEFAULT 'blue',
    filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    columns JSONB NOT NULL DEFAULT '[]'::jsonb,
    sort JSONB NOT NULL DEFAULT '[]'::jsonb,
    group_by VARCHAR(50),
    view_mode VARCHAR(30) NOT NULL DEFAULT 'LIST' CHECK (view_mode IN ('LIST', 'KANBAN', 'CALENDAR', 'TIMELINE')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========================================================
-- Date & Time: 2026-09-29 14:30:00 (IST)
-- Description: Software Components Catalog, Architecture Dependencies & Task Component Mapping (PLAN-004)
-- ========================================================

-- 34. Software Components Catalog
CREATE TABLE IF NOT EXISTS software_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    component_code VARCHAR(50) NOT NULL, -- e.g. 'CMP-AUTH-SRV', 'CMP-WEB-CLIENT'
    component_name VARCHAR(150) NOT NULL,
    description TEXT,
    entity_type VARCHAR(20) NOT NULL, -- 'PRODUCT' or 'PROJECT'
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    owner_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    tech_lead_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    technology_stack VARCHAR(200), -- e.g. 'Node.js, PostgreSQL', 'React, Vite, Tailwind', 'Flutter'
    documentation_url TEXT,
    repository_url TEXT,
    criticality VARCHAR(30) NOT NULL DEFAULT 'TIER_2_CORE' CHECK (criticality IN ('TIER_1_CRITICAL', 'TIER_2_CORE', 'TIER_3_SUPPORTING')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_component_entity CHECK (
        (entity_type = 'PRODUCT' AND product_id IS NOT NULL AND project_id IS NULL) OR
        (entity_type = 'PROJECT' AND project_id IS NOT NULL AND product_id IS NULL)
    ),
    CONSTRAINT uq_component_code_entity UNIQUE (component_code, entity_type, product_id, project_id)
);

-- 35. Component Architecture Dependencies (PLAN-004)
-- Reciprocal links (A calls B, B calls A) are valid architectural communication and distinct from task DAG scheduling.
CREATE TABLE IF NOT EXISTS component_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    component_id UUID NOT NULL REFERENCES software_components(id) ON DELETE CASCADE,
    depends_on_component_id UUID NOT NULL REFERENCES software_components(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) NOT NULL DEFAULT 'CONSUMES_API' CHECK (dependency_type IN ('CONSUMES_API', 'CALLS_SERVICE', 'SHARED_DATABASE', 'EVENT_PUBSUB', 'CLIENT_SDK')),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_component_no_self_dep CHECK (component_id <> depends_on_component_id),
    CONSTRAINT uq_component_dependency UNIQUE (component_id, depends_on_component_id, dependency_type)
);

-- 36. Task Components Many-to-Many Mapping (PLAN-004)
CREATE TABLE IF NOT EXISTS task_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    component_id UUID NOT NULL REFERENCES software_components(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_task_component UNIQUE (task_id, component_id)
);
-- ========================================================
-- Date & Time: 2026-09-29 15:15:00 IST
-- Description: FLOW-001 - Task Handoff Tracking & Waiting Queue Episodes
-- ========================================================

-- 37. Task Handoffs
CREATE TABLE IF NOT EXISTS task_handoffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    from_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    to_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    handoff_type VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'IN_PROGRESS', 'RETURNED_FOR_REWORK', 'REDIRECTED', 'COMPLETED', 'CANCELLED')),
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
    work_started_at TIMESTAMP WITH TIME ZONE,
    work_started_by UUID REFERENCES users(id) ON DELETE SET NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    predecessor_handoff_id UUID REFERENCES task_handoffs(id) ON DELETE SET NULL,
    required_context TEXT,
    rejection_or_return_reason TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_handoff_recipient CHECK (to_team_id IS NOT NULL OR to_user_id IS NOT NULL)
);
-- ========================================================
-- Date & Time: 2026-09-29 15:45:00 IST
-- Description: CONFIG-001 - Project-Specific Workflow Overrides & Transition Gates
-- ========================================================

-- 38. Workflow Schemes Master (Global, Project, and Product Overrides)
CREATE TABLE IF NOT EXISTS workflow_schemes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheme_code VARCHAR(50) NOT NULL,
    scheme_name VARCHAR(150) NOT NULL,
    description TEXT,
    scope VARCHAR(20) NOT NULL DEFAULT 'GLOBAL' CHECK (scope IN ('GLOBAL', 'PROJECT', 'PRODUCT')),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    task_type_id UUID REFERENCES task_types(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_workflow_scheme_scope CHECK (
        (scope = 'GLOBAL' AND project_id IS NULL AND product_id IS NULL) OR
        (scope = 'PROJECT' AND project_id IS NOT NULL AND product_id IS NULL) OR
        (scope = 'PRODUCT' AND product_id IS NOT NULL AND project_id IS NULL)
    ),
    CONSTRAINT uq_workflow_scheme_code_version UNIQUE (scheme_code, version)
);

-- 39. Workflow Scheme Transitions & Gate Rules
CREATE TABLE IF NOT EXISTS workflow_scheme_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheme_id UUID NOT NULL REFERENCES workflow_schemes(id) ON DELETE CASCADE,
    from_status_id UUID NOT NULL REFERENCES task_statuses(id) ON DELETE CASCADE,
    to_status_id UUID NOT NULL REFERENCES task_statuses(id) ON DELETE CASCADE,
    allowed_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
    required_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    requires_release_association BOOLEAN NOT NULL DEFAULT FALSE,
    requires_qa_signoff BOOLEAN NOT NULL DEFAULT FALSE,
    requires_resolution BOOLEAN NOT NULL DEFAULT FALSE,
    manual_gate_name VARCHAR(100),
    transition_notes_prompt TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_workflow_scheme_transition UNIQUE (scheme_id, from_status_id, to_status_id),
    CONSTRAINT chk_scheme_transition_not_same CHECK (from_status_id <> to_status_id)
);

-- ========================================================
-- Date & Time: 2026-09-29 16:00:00 IST
-- Description: Client Portal Contacts, Project Grants, Intake Requests & Clarification Messages (CLIENT-001, CLIENT-002)
-- ========================================================

-- 40. Client Contacts & Portal Identity (CLIENT-001)
CREATE TABLE IF NOT EXISTS client_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    job_title VARCHAR(100),
    password_hash VARCHAR(255),
    portal_role VARCHAR(30) NOT NULL DEFAULT 'CLIENT_USER' CHECK (portal_role IN ('CLIENT_USER', 'CLIENT_ADMIN')),
    is_approver BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(30) NOT NULL DEFAULT 'INVITED' CHECK (status IN ('INVITED', 'ACTIVE', 'REVOKED', 'EXPIRED')),
    invitation_token VARCHAR(255) UNIQUE,
    invitation_sent_at TIMESTAMP WITH TIME ZONE,
    invitation_accepted_at TIMESTAMP WITH TIME ZONE,
    invited_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    invited_by_contact_id UUID REFERENCES client_contacts(id) ON DELETE SET NULL,
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_ip VARCHAR(45),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 41. Client Contact Project Grants (CLIENT-001)
CREATE TABLE IF NOT EXISTS client_contact_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES client_contacts(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    can_view_milestones BOOLEAN NOT NULL DEFAULT TRUE,
    can_create_requests BOOLEAN NOT NULL DEFAULT TRUE,
    can_approve_scope BOOLEAN NOT NULL DEFAULT FALSE,
    can_approve_uat BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_client_contact_project UNIQUE (contact_id, project_id)
);

-- 42. Client Intake Requests (CLIENT-002)
CREATE TABLE IF NOT EXISTS client_intake_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number VARCHAR(50) NOT NULL UNIQUE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES client_contacts(id) ON DELETE RESTRICT,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    component_id UUID REFERENCES software_components(id) ON DELETE SET NULL,
    request_type VARCHAR(30) NOT NULL DEFAULT 'SUPPORT' CHECK (request_type IN ('BUG', 'SUPPORT', 'CHANGE_REQUEST')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'UNDER_REVIEW', 'NEEDS_INFORMATION', 'ACCEPTED', 'DUPLICATE', 'DECLINED')),
    client_priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (client_priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    internal_priority VARCHAR(20) CHECK (internal_priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    technical_severity VARCHAR(20) CHECK (technical_severity IN ('TRIVIAL', 'MINOR', 'MAJOR', 'CRITICAL', 'BLOCKER')),
    business_impact VARCHAR(30) NOT NULL DEFAULT 'OPERATIONS' CHECK (business_impact IN ('OPERATIONS', 'REVENUE', 'COMPLIANCE', 'SECURITY', 'USABILITY', 'PERFORMANCE', 'REPORTING', 'OTHER')),
    impact_breadth VARCHAR(30) NOT NULL DEFAULT 'SINGLE_USER' CHECK (impact_breadth IN ('INTERNAL', 'SINGLE_USER', 'ORGANIZATION', 'MULTIPLE_CLIENTS', 'ALL_CLIENTS')),
    environment_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
    rejection_or_decline_reason TEXT,
    duplicate_of_request_id UUID REFERENCES client_intake_requests(id) ON DELETE SET NULL,
    linked_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    triaged_by UUID REFERENCES users(id) ON DELETE SET NULL,
    triaged_at TIMESTAMP WITH TIME ZONE,
    affected_version VARCHAR(50),
    target_fix_version VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 43. Client Request Clarification Messages (CLIENT-002)
CREATE TABLE IF NOT EXISTS client_request_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES client_intake_requests(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('CLIENT_CONTACT', 'INTERNAL_USER')),
    contact_id UUID REFERENCES client_contacts(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    is_internal_only BOOLEAN NOT NULL DEFAULT FALSE,
    attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========================================================
-- Date & Time: 2026-09-29 19:15:00 IST
-- Description: Requirements & Acceptance Traceability (CLIENT-003)
-- ========================================================

-- 44. Requirement Specifications (CLIENT-003)
CREATE TABLE IF NOT EXISTS requirement_specifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    req_code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    module_name VARCHAR(100),
    business_objective TEXT NOT NULL,
    in_scope TEXT,
    out_of_scope TEXT,
    assumptions TEXT,
    originating_request_id UUID REFERENCES client_intake_requests(id) ON DELETE SET NULL,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PROPOSED', 'REVIEWED', 'BASELINED', 'AMENDED', 'ARCHIVED')),
    is_baselined BOOLEAN NOT NULL DEFAULT FALSE,
    baselined_at TIMESTAMP WITH TIME ZONE,
    baselined_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_client_visible BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_req_spec_scope CHECK (
        (project_id IS NOT NULL AND product_id IS NULL) OR
        (product_id IS NOT NULL AND project_id IS NULL)
    )
);

-- 45. Requirement Baselines (CLIENT-003)
CREATE TABLE IF NOT EXISTS requirement_baselines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requirement_id UUID NOT NULL REFERENCES requirement_specifications(id) ON DELETE CASCADE,
    version INTEGER NOT NULL CHECK (version > 0),
    baseline_name VARCHAR(150) NOT NULL,
    snapshot_data JSONB NOT NULL,
    baselined_by UUID NOT NULL REFERENCES users(id),
    baselined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_by_contact_id UUID REFERENCES client_contacts(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_req_baseline_version UNIQUE (requirement_id, version)
);

-- 46. Requirement Acceptance Criteria (CLIENT-003)
CREATE TABLE IF NOT EXISTS requirement_acceptance_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requirement_id UUID NOT NULL REFERENCES requirement_specifications(id) ON DELETE CASCADE,
    criteria_code VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    verification_method VARCHAR(30) NOT NULL DEFAULT 'MANUAL_TEST' CHECK (verification_method IN ('MANUAL_TEST', 'DEMO', 'DOCUMENTATION', 'AUTOMATED')),
    implementation_status VARCHAR(30) NOT NULL DEFAULT 'NOT_STARTED' CHECK (implementation_status IN ('NOT_STARTED', 'IN_PROGRESS', 'IMPLEMENTED', 'VERIFIED_QA', 'ACCEPTED_CLIENT', 'WAIVED')),
    order_index INTEGER NOT NULL DEFAULT 1,
    qa_evidence_notes TEXT,
    qa_evidence_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    qa_verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    qa_verified_at TIMESTAMP WITH TIME ZONE,
    client_signoff_status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (client_signoff_status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'WAIVED')),
    client_signoff_by_contact_id UUID REFERENCES client_contacts(id) ON DELETE SET NULL,
    client_signoff_at TIMESTAMP WITH TIME ZONE,
    client_signoff_notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_req_criteria_code UNIQUE (requirement_id, criteria_code)
);

-- 47. Requirement Criterion to Delivery Tasks Mapping (CLIENT-003)
CREATE TABLE IF NOT EXISTS requirement_criterion_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    criterion_id UUID NOT NULL REFERENCES requirement_acceptance_criteria(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_criterion_task UNIQUE (criterion_id, task_id)
);

-- ========================================================
-- Date & Time: 2026-09-29 19:53:00 IST
-- Description: Scope & Change-Request Approval (CLIENT-004)
-- ========================================================

-- 48. Change Requests (CLIENT-004)
CREATE TABLE IF NOT EXISTS change_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cr_number VARCHAR(50) NOT NULL UNIQUE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    originating_intake_request_id UUID REFERENCES client_intake_requests(id) ON DELETE SET NULL,
    requirement_id UUID REFERENCES requirement_specifications(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    business_justification TEXT NOT NULL,
    impact_summary TEXT,
    accountable_pm_user_id UUID NOT NULL REFERENCES users(id),
    current_revision INTEGER NOT NULL DEFAULT 1 CHECK (current_revision > 0),
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'INTERNAL_REVIEW', 'AWAITING_CLIENT', 'APPROVED', 'CHANGES_REQUESTED', 'REJECTED', 'DEFERRED', 'WITHDRAWN')),
    linked_milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_cr_scope CHECK (
        (project_id IS NOT NULL AND product_id IS NULL) OR
        (product_id IS NOT NULL AND project_id IS NULL)
    )
);

-- 49. Change Request Revisions (CLIENT-004)
CREATE TABLE IF NOT EXISTS change_request_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    change_request_id UUID NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
    revision_number INTEGER NOT NULL CHECK (revision_number > 0),
    scope_description TEXT NOT NULL,
    deliverables JSONB NOT NULL DEFAULT '[]'::jsonb,
    estimated_hours NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (estimated_hours >= 0),
    quoted_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (quoted_price >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    schedule_delay_days INTEGER NOT NULL DEFAULT 0,
    revised_delivery_date DATE,
    revision_reason TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'INTERNAL_REVIEW', 'AWAITING_CLIENT', 'APPROVED', 'CHANGES_REQUESTED', 'REJECTED', 'SUPERSEDED')),
    submitted_by_user_id UUID NOT NULL REFERENCES users(id),
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    internal_reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    internal_reviewed_at TIMESTAMP WITH TIME ZONE,
    internal_review_notes TEXT,
    client_decision VARCHAR(30) CHECK (client_decision IS NULL OR client_decision IN ('APPROVED', 'CHANGES_REQUESTED', 'REJECTED')),
    decided_by_contact_id UUID REFERENCES client_contacts(id) ON DELETE SET NULL,
    decided_at TIMESTAMP WITH TIME ZONE,
    client_remarks TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_cr_revision UNIQUE (change_request_id, revision_number)
);

-- 50. Change Request Tasks (CLIENT-004)
CREATE TABLE IF NOT EXISTS change_request_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    change_request_id UUID NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    is_scope_addition BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_cr_task UNIQUE (change_request_id, task_id)
);

-- ========================================================
-- Date & Time: 2026-09-29 20:36:00 IST
-- Description: Client UAT Packages & Milestone Acceptance (CLIENT-005)
-- ========================================================

-- 51. UAT Packages (CLIENT-005)
CREATE TABLE IF NOT EXISTS uat_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_code VARCHAR(50) NOT NULL UNIQUE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    version_id UUID REFERENCES versions(id) ON DELETE SET NULL,
    milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    environment_url VARCHAR(500),
    build_number VARCHAR(100),
    test_credentials_instructions TEXT,
    current_revision INTEGER NOT NULL DEFAULT 1 CHECK (current_revision > 0),
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'INTERNAL_QA', 'READY_FOR_CLIENT', 'ACCEPTED', 'CHANGES_REQUESTED', 'REJECTED', 'SUPERSEDED')),
    target_signoff_date DATE,
    prepared_by_user_id UUID NOT NULL REFERENCES users(id),
    qa_lead_user_id UUID REFERENCES users(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_uat_package_scope CHECK (
        (project_id IS NOT NULL AND product_id IS NULL) OR
        (product_id IS NOT NULL AND project_id IS NULL)
    )
);

-- 52. UAT Package Revisions (CLIENT-005)
CREATE TABLE IF NOT EXISTS uat_package_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES uat_packages(id) ON DELETE CASCADE,
    revision_number INTEGER NOT NULL CHECK (revision_number > 0),
    revision_notes TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'INTERNAL_QA', 'READY_FOR_CLIENT', 'ACCEPTED', 'CHANGES_REQUESTED', 'REJECTED', 'SUPERSEDED')),
    known_issues JSONB NOT NULL DEFAULT '[]'::jsonb,
    test_evidence_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    qa_approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    qa_approved_at TIMESTAMP WITH TIME ZONE,
    qa_notes TEXT,
    client_decision VARCHAR(30) CHECK (client_decision IS NULL OR client_decision IN ('APPROVED', 'CHANGES_REQUESTED', 'REJECTED')),
    decided_by_contact_id UUID REFERENCES client_contacts(id) ON DELETE SET NULL,
    decided_at TIMESTAMP WITH TIME ZONE,
    client_signoff_remarks TEXT,
    submitted_to_client_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_uat_revision UNIQUE (package_id, revision_number)
);

-- 53. UAT Checklist Items (CLIENT-005)
CREATE TABLE IF NOT EXISTS uat_checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_revision_id UUID NOT NULL REFERENCES uat_package_revisions(id) ON DELETE CASCADE,
    item_code VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    instructions TEXT NOT NULL,
    expected_outcome TEXT NOT NULL,
    criterion_id UUID REFERENCES requirement_acceptance_criteria(id) ON DELETE SET NULL,
    order_index INTEGER NOT NULL DEFAULT 1,
    developer_done BOOLEAN NOT NULL DEFAULT FALSE,
    developer_done_at TIMESTAMP WITH TIME ZONE,
    qa_verified BOOLEAN NOT NULL DEFAULT FALSE,
    qa_verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    qa_verified_at TIMESTAMP WITH TIME ZONE,
    qa_evidence_notes TEXT,
    client_status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (client_status IN ('PENDING', 'PASSED', 'FAILED', 'BLOCKED', 'WAIVED')),
    client_feedback TEXT,
    client_tested_by_contact_id UUID REFERENCES client_contacts(id) ON DELETE SET NULL,
    client_tested_at TIMESTAMP WITH TIME ZONE,
    linked_defect_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_uat_checklist_item UNIQUE (package_revision_id, item_code)
);

-- 54. Client Installed / Accepted Versions (CLIENT-005)
CREATE TABLE IF NOT EXISTS client_installed_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    version_id UUID NOT NULL REFERENCES versions(id) ON DELETE RESTRICT,
    environment_name VARCHAR(50) NOT NULL DEFAULT 'PRODUCTION',
    accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    accepted_by_contact_id UUID REFERENCES client_contacts(id) ON DELETE SET NULL,
    installed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    installed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    uat_package_id UUID REFERENCES uat_packages(id) ON DELETE SET NULL,
    notes TEXT,
    is_current_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========================================================
-- Date & Time: 2026-09-29 20:56:00 IST
-- Description: Client Progress Reports & Revisions (CLIENT-006)
-- ========================================================

-- 55. Client Progress Reports (CLIENT-006)
CREATE TABLE IF NOT EXISTS client_progress_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_code VARCHAR(50) NOT NULL UNIQUE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    period_start_date DATE NOT NULL,
    period_end_date DATE NOT NULL,
    report_status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (report_status IN ('DRAFT', 'UNDER_REVIEW', 'PUBLISHED', 'ARCHIVED')),
    overall_health VARCHAR(30) NOT NULL DEFAULT 'ON_TRACK' CHECK (overall_health IN ('ON_TRACK', 'NEEDS_ATTENTION', 'AT_RISK')),
    health_narrative TEXT,
    executive_summary TEXT NOT NULL,
    delivered_work_summary TEXT,
    next_steps_summary TEXT,
    decisions_needed_summary TEXT,
    client_action_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    milestone_forecasts JSONB NOT NULL DEFAULT '[]'::jsonb,
    sanitized_risks JSONB NOT NULL DEFAULT '[]'::jsonb,
    include_commercials BOOLEAN NOT NULL DEFAULT FALSE,
    commercial_summary JSONB,
    audience_scope VARCHAR(30) NOT NULL DEFAULT 'CLIENT_ALL' CHECK (audience_scope IN ('CLIENT_ALL', 'CLIENT_APPROVERS_ONLY', 'INTERNAL_ONLY')),
    internal_notes TEXT,
    current_revision INTEGER NOT NULL DEFAULT 1,
    published_at TIMESTAMP WITH TIME ZONE,
    published_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 56. Client Progress Report Revisions (CLIENT-006)
CREATE TABLE IF NOT EXISTS client_progress_report_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES client_progress_reports(id) ON DELETE CASCADE,
    revision_number INTEGER NOT NULL,
    published_content_snapshot JSONB NOT NULL,
    revision_reason TEXT,
    published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_report_revision UNIQUE (report_id, revision_number)
);

-- ========================================================
-- Date & Time: 2026-09-29 22:00:00 IST
-- Description: Risks, Assumptions, Decisions & Client Action Requests (DEL-001)
-- ========================================================

-- 57. RAID Items (Risks, Assumptions, Issues, Decisions - DEL-001)
CREATE TABLE IF NOT EXISTS raid_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_code VARCHAR(50) NOT NULL UNIQUE,
    category VARCHAR(20) NOT NULL CHECK (category IN ('RISK', 'ASSUMPTION', 'DECISION', 'ISSUE')),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    review_date DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN' CHECK (
        status IN (
            'IDENTIFIED', 'MONITORING', 'MITIGATING', 'CLOSED', 'REALIZED',
            'VALIDATING', 'CONFIRMED', 'INVALIDATED',
            'PROPOSED', 'ACCEPTED', 'REJECTED', 'SUPERSEDED',
            'OPEN', 'RESOLVED'
        )
    ),
    likelihood VARCHAR(20) CHECK (likelihood IN ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH')),
    impact VARCHAR(20) CHECK (impact IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    risk_score INTEGER,
    mitigation_plan TEXT,
    contingency_plan TEXT,
    internal_discussion TEXT,
    requirement_id UUID REFERENCES requirement_specifications(id) ON DELETE SET NULL,
    milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    component_id UUID REFERENCES software_components(id) ON DELETE SET NULL,
    realized_blocker_episode_id UUID REFERENCES task_blocker_episodes(id) ON DELETE SET NULL,
    participants JSONB NOT NULL DEFAULT '[]'::jsonb,
    context TEXT,
    alternatives_considered JSONB NOT NULL DEFAULT '[]'::jsonb,
    rationale TEXT,
    consequences TEXT,
    technical_impact TEXT,
    business_impact TEXT,
    superseded_by_id UUID REFERENCES raid_items(id) ON DELETE SET NULL,
    supersedes_id UUID REFERENCES raid_items(id) ON DELETE SET NULL,
    is_client_shared BOOLEAN NOT NULL DEFAULT FALSE,
    client_visibility VARCHAR(30) NOT NULL DEFAULT 'INTERNAL_ONLY' CHECK (client_visibility IN ('INTERNAL_ONLY', 'CLIENT_SUMMARY', 'CLIENT_FULL')),
    client_summary TEXT,
    current_revision INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 58. Client Action Requests (Published Actions & Decisions Needed from Client - DEL-001)
CREATE TABLE IF NOT EXISTS client_action_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_code VARCHAR(50) NOT NULL UNIQUE,
    raid_item_id UUID REFERENCES raid_items(id) ON DELETE SET NULL,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    context_for_client TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    due_date DATE NOT NULL,
    assigned_contact_id UUID REFERENCES client_contacts(id) ON DELETE SET NULL,
    requires_approver BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_REVIEW', 'RESPONDED', 'RESOLVED', 'CANCELLED')),
    response_text TEXT,
    responded_by_contact_id UUID REFERENCES client_contacts(id) ON DELETE SET NULL,
    responded_at TIMESTAMP WITH TIME ZONE,
    resulting_decision VARCHAR(30) CHECK (resulting_decision IN ('APPROVED', 'REJECTED', 'INFO_PROVIDED', 'SCOPE_CHANGE_REQUESTED')),
    resulting_change_request_id UUID REFERENCES change_requests(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 59. RAID Item Revisions (Immutable Audit Trail for Decisions & Risks - DEL-001)
CREATE TABLE IF NOT EXISTS raid_item_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raid_item_id UUID NOT NULL REFERENCES raid_items(id) ON DELETE CASCADE,
    revision_number INTEGER NOT NULL,
    snapshot JSONB NOT NULL,
    change_summary TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_raid_item_revision UNIQUE (raid_item_id, revision_number)
);

-- ========================================================
-- Date & Time: 2026-09-30 10:05:00 IST
-- Description: Product Discovery, Organization Voting, Duplicate Merging & Roadmaps (PROD-001)
-- ========================================================

-- 60. Product Discovery Ideas (PROD-001)
CREATE TABLE IF NOT EXISTS product_ideas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_code VARCHAR(50) NOT NULL UNIQUE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    sanitized_description TEXT NOT NULL,
    customer_problem TEXT,
    expected_outcome TEXT,
    module_or_component_id UUID REFERENCES software_components(id) ON DELETE SET NULL,
    target_segment VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'PROPOSED' CHECK (
        status IN ('PROPOSED', 'UNDER_EVALUATION', 'PLANNED', 'IN_DEVELOPMENT', 'RELEASED', 'DECLINED', 'DEFERRED', 'MERGED')
    ),
    status_reason TEXT,
    roadmap_bucket VARCHAR(20) CHECK (roadmap_bucket IN ('NOW', 'NEXT', 'LATER')),
    indicative_target VARCHAR(100),
    reach INTEGER NOT NULL DEFAULT 0,
    impact_score NUMERIC(4,2) NOT NULL DEFAULT 1.00,
    confidence_score NUMERIC(4,2) NOT NULL DEFAULT 1.00,
    effort_score NUMERIC(4,2) NOT NULL DEFAULT 1.00,
    strategic_fit INTEGER NOT NULL DEFAULT 3,
    rice_score NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    scoring_rationale TEXT,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMP WITH TIME ZONE,
    moderated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    visibility VARCHAR(30) NOT NULL DEFAULT 'PRODUCT_COMMUNITY' CHECK (visibility IN ('INTERNAL_ONLY', 'PRODUCT_COMMUNITY', 'PUBLIC')),
    submitted_by_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    submitted_by_contact_id UUID REFERENCES client_contacts(id) ON DELETE SET NULL,
    submitted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    private_evidence_notes TEXT,
    internal_commercial_impact TEXT,
    merged_into_idea_id UUID REFERENCES product_ideas(id) ON DELETE SET NULL,
    merged_at TIMESTAMP WITH TIME ZONE,
    merged_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_version_id UUID REFERENCES versions(id) ON DELETE SET NULL,
    delivery_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    changelog_summary TEXT,
    vote_count INTEGER NOT NULL DEFAULT 0,
    follower_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 61. Product Idea Votes (One Vote per Organization Atomic Enforcement - PROD-001)
CREATE TABLE IF NOT EXISTS product_idea_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL REFERENCES product_ideas(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    voted_by_contact_id UUID REFERENCES client_contacts(id) ON DELETE SET NULL,
    voted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    vote_revision INTEGER NOT NULL DEFAULT 1,
    original_idea_id UUID REFERENCES product_ideas(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_idea_client_vote UNIQUE (idea_id, client_id)
);

-- 62. Product Idea Follows (Independent of Organization Votes - PROD-001)
CREATE TABLE IF NOT EXISTS product_idea_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL REFERENCES product_ideas(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES client_contacts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_idea_follow_actor CHECK (
        (contact_id IS NOT NULL AND user_id IS NULL) OR
        (contact_id IS NULL AND user_id IS NOT NULL)
    ),
    CONSTRAINT uq_idea_contact_follow UNIQUE (idea_id, contact_id),
    CONSTRAINT uq_idea_user_follow UNIQUE (idea_id, user_id)
);

-- 63. Product Idea Merge History (Deduplication Audit Trail - PROD-001)
CREATE TABLE IF NOT EXISTS product_idea_merge_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canonical_idea_id UUID NOT NULL REFERENCES product_ideas(id) ON DELETE CASCADE,
    merged_idea_id UUID NOT NULL REFERENCES product_ideas(id) ON DELETE CASCADE,
    merged_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    migrated_votes_count INTEGER NOT NULL DEFAULT 0,
    deduplicated_votes_count INTEGER NOT NULL DEFAULT 0,
    merge_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========================================================
-- Date & Time: 2026-09-30 20:10:00 IST
-- Description: QA-001 - Manual QA Test Cases, Test Runs & Release-Readiness Gatekeeper
-- ========================================================

-- 64. Test Suites Master (QA-001)
CREATE TABLE IF NOT EXISTS test_suites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suite_code VARCHAR(50) NOT NULL UNIQUE,
    suite_name VARCHAR(150) NOT NULL,
    description TEXT,
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('PRODUCT', 'PROJECT')),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    component_id UUID REFERENCES software_components(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_test_suite_scope CHECK (
        (entity_type = 'PRODUCT' AND product_id IS NOT NULL AND project_id IS NULL) OR
        (entity_type = 'PROJECT' AND project_id IS NOT NULL AND product_id IS NULL)
    )
);

-- 65. Test Cases Master (QA-001)
CREATE TABLE IF NOT EXISTS test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_code VARCHAR(50) NOT NULL UNIQUE,
    suite_id UUID NOT NULL REFERENCES test_suites(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    preconditions TEXT,
    test_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    expected_result TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'MAJOR' CHECK (severity IN ('TRIVIAL', 'MINOR', 'MAJOR', 'CRITICAL', 'BLOCKER')),
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    execution_type VARCHAR(20) NOT NULL DEFAULT 'MANUAL' CHECK (execution_type IN ('MANUAL', 'AUTOMATED')),
    estimated_minutes INTEGER NOT NULL DEFAULT 15 CHECK (estimated_minutes >= 0),
    requirement_criterion_id UUID REFERENCES requirement_acceptance_criteria(id) ON DELETE SET NULL,
    component_id UUID REFERENCES software_components(id) ON DELETE SET NULL,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 66. Test Runs Master (QA-001)
CREATE TABLE IF NOT EXISTS test_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('PRODUCT', 'PROJECT')),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    version_id UUID REFERENCES versions(id) ON DELETE SET NULL,
    milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,
    environment VARCHAR(50) NOT NULL DEFAULT 'STAGING' CHECK (environment IN ('LOCAL', 'QA', 'STAGING', 'UAT', 'PRODUCTION', 'ON_PREMISE')),
    status VARCHAR(30) NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ABORTED')),
    assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    total_cases INTEGER NOT NULL DEFAULT 0 CHECK (total_cases >= 0),
    passed_cases INTEGER NOT NULL DEFAULT 0 CHECK (passed_cases >= 0),
    failed_cases INTEGER NOT NULL DEFAULT 0 CHECK (failed_cases >= 0),
    blocked_cases INTEGER NOT NULL DEFAULT 0 CHECK (blocked_cases >= 0),
    skipped_cases INTEGER NOT NULL DEFAULT 0 CHECK (skipped_cases >= 0),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_test_run_scope CHECK (
        (entity_type = 'PRODUCT' AND product_id IS NOT NULL AND project_id IS NULL) OR
        (entity_type = 'PROJECT' AND project_id IS NOT NULL AND product_id IS NULL)
    )
);

-- 67. Test Run Items (Execution Record per Test Case - QA-001)
CREATE TABLE IF NOT EXISTS test_run_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_run_id UUID NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
    test_case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PASSED', 'FAILED', 'BLOCKED', 'SKIPPED')),
    actual_result TEXT,
    execution_notes TEXT,
    executed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    executed_at TIMESTAMP WITH TIME ZONE,
    evidence_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    linked_defect_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_test_run_case UNIQUE (test_run_id, test_case_id)
);

-- 68. Release Readiness Checklists (Release Gatekeeper - QA-001)
CREATE TABLE IF NOT EXISTS release_readiness_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_code VARCHAR(50) NOT NULL UNIQUE,
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('PRODUCT', 'PROJECT')),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    version_id UUID REFERENCES versions(id) ON DELETE SET NULL,
    milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    overall_status VARCHAR(30) NOT NULL DEFAULT 'NOT_STARTED' CHECK (overall_status IN ('NOT_STARTED', 'IN_REVIEW', 'READY_FOR_RELEASE', 'BLOCKED', 'CONDITIONAL_RELEASE')),
    target_release_date DATE,
    lead_qa_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    signoff_pm_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    signed_off_at TIMESTAMP WITH TIME ZONE,
    signoff_notes TEXT,
    exceptions_notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_readiness_scope CHECK (
        (entity_type = 'PRODUCT' AND product_id IS NOT NULL AND project_id IS NULL) OR
        (entity_type = 'PROJECT' AND project_id IS NOT NULL AND product_id IS NULL)
    )
);

-- 69. Release Checklist Items (QA-001)
CREATE TABLE IF NOT EXISTS release_checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id UUID NOT NULL REFERENCES release_readiness_checklists(id) ON DELETE CASCADE,
    item_code VARCHAR(50) NOT NULL,
    gate_category VARCHAR(50) NOT NULL CHECK (gate_category IN ('QA_TESTING', 'SECURITY', 'CLIENT_UAT', 'DOCUMENTATION', 'DATA_MIGRATION', 'PERFORMANCE')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PASSED', 'FAILED', 'WAIVED')),
    is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
    verified_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    evidence_notes TEXT,
    waived_reason TEXT,
    order_index INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_release_checklist_item UNIQUE (checklist_id, item_code)
);

-- ========================================================
-- Date & Time: 2026-09-30 22:35:00 IST
-- Description: COLLAB-001 - Versioned Knowledge Base, Decision Docs (ADRs) & Specs Library
-- ========================================================

-- 70. Knowledge Documents Master (COLLAB-001)
CREATE TABLE IF NOT EXISTS knowledge_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('SPECIFICATION', 'ARCHITECTURE_DECISION', 'RUNBOOK', 'MEETING_NOTES', 'RELEASE_NOTES', 'USER_GUIDE', 'POLICY')),
    entity_type VARCHAR(20) NOT NULL DEFAULT 'GLOBAL' CHECK (entity_type IN ('PRODUCT', 'PROJECT', 'GLOBAL')),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    component_id UUID REFERENCES software_components(id) ON DELETE SET NULL,
    audience VARCHAR(30) NOT NULL DEFAULT 'INTERNAL_ONLY' CHECK (audience IN ('INTERNAL_ONLY', 'CLIENT_VISIBLE', 'PRODUCT_COMMUNITY')),
    current_version INTEGER NOT NULL DEFAULT 1 CHECK (current_version > 0),
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'IN_REVIEW', 'APPROVED', 'SUPERSEDED', 'ARCHIVED')),
    decision_outcome VARCHAR(30) CHECK (decision_outcome IN ('PROPOSED', 'ACCEPTED', 'REJECTED', 'DEPRECATED', 'SUPERSEDED')),
    superseded_by_document_id UUID REFERENCES knowledge_documents(id) ON DELETE SET NULL,
    owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_knowledge_doc_scope CHECK (
        (entity_type = 'GLOBAL' AND product_id IS NULL AND project_id IS NULL) OR
        (entity_type = 'PRODUCT' AND product_id IS NOT NULL AND project_id IS NULL) OR
        (entity_type = 'PROJECT' AND project_id IS NOT NULL AND product_id IS NULL)
    )
);

-- 71. Knowledge Document Revisions (Version History & Diffs - COLLAB-001)
CREATE TABLE IF NOT EXISTS knowledge_document_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
    revision_number INTEGER NOT NULL CHECK (revision_number > 0),
    title VARCHAR(255) NOT NULL,
    content_markdown TEXT NOT NULL,
    change_summary VARCHAR(500),
    author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_knowledge_doc_revision UNIQUE (document_id, revision_number)
);

-- 72. Knowledge Document Work Item Links (COLLAB-001)
CREATE TABLE IF NOT EXISTS knowledge_document_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
    linked_entity_type VARCHAR(30) NOT NULL CHECK (linked_entity_type IN ('TASK', 'VERSION', 'MILESTONE', 'REQUIREMENT_CRITERION', 'CHANGE_REQUEST')),
    linked_entity_id UUID NOT NULL,
    link_notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_knowledge_doc_entity_link UNIQUE (document_id, linked_entity_type, linked_entity_id)
);

-- 73. Knowledge Document Attachments (Immutable S3 Asset Revisions - COLLAB-001)
CREATE TABLE IF NOT EXISTS knowledge_document_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
    revision_number INTEGER NOT NULL DEFAULT 1 CHECK (revision_number > 0),
    file_name VARCHAR(255) NOT NULL,
    s3_key VARCHAR(500) NOT NULL,
    s3_bucket VARCHAR(255) NOT NULL DEFAULT 'ks-pmt-documents',
    mime_type VARCHAR(150) NOT NULL,
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========================================================
-- Date & Time: 2026-10-01 09:35:00 IST
-- Description: COLLAB-002 - Project & Task Templates, Relative Dates & Recurring Work with Unique Occurrences
-- ========================================================

-- 74. Project Templates Master (COLLAB-002)
CREATE TABLE IF NOT EXISTS project_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_code VARCHAR(50) NOT NULL UNIQUE,
    template_name VARCHAR(150) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'CLIENT_ONBOARDING' CHECK (
        category IN ('CLIENT_ONBOARDING', 'FIXED_PRICE_DELIVERY', 'MAINTENANCE_RETAINER', 'SECURITY_AUDIT', 'RELEASE_CHECKLIST', 'INTERNAL_INITIATIVE')
    ),
    default_billing_type VARCHAR(30) NOT NULL DEFAULT 'FIXED_COST' CHECK (
        default_billing_type IN ('FIXED_COST', 'TIME_AND_MATERIALS', 'NON_BILLABLE', 'RETAINER')
    ),
    estimated_duration_days INTEGER NOT NULL DEFAULT 30 CHECK (estimated_duration_days > 0),
    default_tags TEXT[] NOT NULL DEFAULT '{}',
    milestone_templates JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 75. Task Templates Master (COLLAB-002)
CREATE TABLE IF NOT EXISTS task_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_code VARCHAR(50) NOT NULL UNIQUE,
    project_template_id UUID REFERENCES project_templates(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    task_type_id UUID REFERENCES task_types(id) ON DELETE SET NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL')),
    start_offset_days INTEGER NOT NULL DEFAULT 0 CHECK (start_offset_days >= 0),
    duration_days INTEGER NOT NULL DEFAULT 1 CHECK (duration_days > 0),
    estimated_hours NUMERIC(6, 2) NOT NULL DEFAULT 8.00 CHECK (estimated_hours >= 0),
    story_points INTEGER NOT NULL DEFAULT 1 CHECK (story_points >= 0),
    checklist_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    default_tags TEXT[] NOT NULL DEFAULT '{}',
    order_index INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 76. Recurring Work Rules Master (COLLAB-002)
CREATE TABLE IF NOT EXISTS recurring_work_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    task_template_id UUID REFERENCES task_templates(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    component_id UUID REFERENCES software_components(id) ON DELETE SET NULL,
    frequency VARCHAR(30) NOT NULL DEFAULT 'WEEKLY' CHECK (
        frequency IN ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY')
    ),
    interval_value INTEGER NOT NULL DEFAULT 1 CHECK (interval_value > 0),
    day_of_week INTEGER CHECK (day_of_week BETWEEN 1 AND 7),
    day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
    start_date DATE NOT NULL,
    end_date DATE,
    max_occurrences INTEGER,
    occurrences_count INTEGER NOT NULL DEFAULT 0 CHECK (occurrences_count >= 0),
    last_generated_date DATE,
    next_run_date DATE NOT NULL,
    default_assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (target_priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL')),
    estimated_hours NUMERIC(6, 2) NOT NULL DEFAULT 4.00 CHECK (estimated_hours >= 0),
    checklist_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    tags TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_recurrence_scope CHECK (
        (project_id IS NOT NULL AND product_id IS NULL) OR
        (product_id IS NOT NULL AND project_id IS NULL) OR
        (project_id IS NULL AND product_id IS NULL)
    )
);

-- 77. Recurring Task Occurrences (Idempotent Occurrence Registry - COLLAB-002)
CREATE TABLE IF NOT EXISTS recurring_task_occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES recurring_work_rules(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    occurrence_number INTEGER NOT NULL CHECK (occurrence_number > 0),
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_recurrence_scheduled_date UNIQUE (rule_id, scheduled_date),
    CONSTRAINT uq_recurrence_task UNIQUE (task_id)
);







