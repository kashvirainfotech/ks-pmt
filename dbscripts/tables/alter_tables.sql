-- ========================================================
-- Date & Time: 2026-09-25 13:16:00 IST
-- Author: Database Architect (KS-PMT)
-- Description: Cumulative Table Alterations and Schema Migrations
-- Note: All new ALTER statements must be appended at the end of this file with a datetime header.
-- ========================================================

-- (Initial file creation. No pending table alterations at initial schema baseline.)

-- ========================================================
-- Date & Time: 2026-09-25 20:10:00 (IST)
-- Description: Allow client_id in projects table to be NULL for internal in-house projects
-- ========================================================
ALTER TABLE projects ALTER COLUMN client_id DROP NOT NULL;


-- ========================================================
-- Date & Time: 2026-09-25 16:12:46 (UTC)
-- Description: Requirements audit - missing entry fields and timesheet review
-- ========================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS employment_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (employment_status IN ('ACTIVE','INACTIVE','SUSPENDED'));
ALTER TABLE products ADD COLUMN IF NOT EXISTS tech_stack TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS documentation_links TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS subscription_plans TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS implementation_fee NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (implementation_fee >= 0);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tech_stack TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS invoicing_milestones TEXT;
ALTER TABLE product_client_mappings ADD COLUMN IF NOT EXISTS support_tier VARCHAR(100);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS severity VARCHAR(100);
ALTER TABLE task_types ADD COLUMN IF NOT EXISTS default_severity VARCHAR(100);
ALTER TABLE task_types ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE task_time_logs ADD COLUMN IF NOT EXISTS is_overtime BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE task_time_logs ADD COLUMN IF NOT EXISTS is_weekend BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE task_time_logs ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (approval_status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED'));
ALTER TABLE task_time_logs ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id);
ALTER TABLE task_time_logs ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE task_time_logs ADD COLUMN IF NOT EXISTS review_remarks TEXT;

-- ========================================================
-- Date & Time: 2026-09-25 16:32:38 (UTC)
-- Description: Requirements audit - device session revocation and preferences
-- ========================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{"inApp":true,"email":true,"push":true}'::jsonb;
