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

