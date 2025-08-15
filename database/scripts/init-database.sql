-- Solar Panel Production Tracking System - Database Initialization
-- This script creates the initial database and user

-- Create database (run as postgres superuser)
CREATE DATABASE solar_panel_tracking 
    WITH 
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

-- Create application user
CREATE USER solar_panel_user WITH PASSWORD 'change_this_password';

-- Grant privileges
GRANT CONNECT ON DATABASE solar_panel_tracking TO solar_panel_user;
GRANT USAGE ON SCHEMA public TO solar_panel_user;
GRANT CREATE ON SCHEMA public TO solar_panel_user;

-- Switch to the application database
\c solar_panel_tracking;

-- Grant table privileges (will apply to future tables)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO solar_panel_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO solar_panel_user;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for password hashing (if needed)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create a comment on the database
COMMENT ON DATABASE solar_panel_tracking IS 'Solar Panel Production Tracking System Database';

-- Verify setup
SELECT 
    current_database() as database_name,
    current_user as current_user,
    version() as postgresql_version;
