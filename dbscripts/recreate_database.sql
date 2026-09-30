-- ========================================================
-- Date & Time: 2026-09-30 16:55:00 IST
-- Author: Database Architect (KS-PMT)
-- File: dbscripts/recreate_database.sql
-- Description: Helper script to reset or drop & recreate the KS-PMT database in pgAdmin
-- Target Database: kspmt (matching server/.env DB_NAME)
-- ========================================================

-- ============================================================================
-- OPTION 1: Drop and Recreate Database (When connected to 'postgres' database)
-- ============================================================================
-- NOTE: In pgAdmin, you CANNOT drop the database you are currently connected to.
-- To run this option:
--   1. Connect to the default 'postgres' database in pgAdmin Object Explorer.
--   2. Open Query Tool (Tools -> Query Tool).
--   3. Execute the statements below.
-- ============================================================================

-- Terminate any existing connections to 'kspmt' (e.g. backend server, other tools)
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'kspmt'
  AND pid <> pg_backend_pid();

-- Drop existing database if present (WITH (FORCE) terminates remaining sessions in PostgreSQL 13+)
DROP DATABASE IF EXISTS kspmt WITH (FORCE);

-- Create fresh blank database
CREATE DATABASE kspmt
    WITH
    OWNER = postgres
    ENCODING = 'UTF8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

-- ============================================================================
-- OPTION 2: Instant Reset while connected directly to 'kspmt'
-- ============================================================================
-- If you already have Query Tool open directly on 'kspmt' and want to reset
-- everything to a blank slate without switching database connections:
-- Uncomment and execute the lines below:
--
-- DROP SCHEMA IF EXISTS public CASCADE;
-- CREATE SCHEMA public;
-- GRANT ALL ON SCHEMA public TO postgres;
-- GRANT ALL ON SCHEMA public TO public;
-- COMMENT ON SCHEMA public IS 'standard public schema';
-- ============================================================================
