-- Migration 008: Create Comprehensive Audit Log Table
-- Solar Panel Production Tracking System
-- Created: 2025-08-20

-- This migration creates a comprehensive audit log table to track all system activities,
-- user actions, data changes, and security events for compliance and troubleshooting.

-- Create comprehensive audit log table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Event identification
    event_type VARCHAR(100) NOT NULL,
    event_category VARCHAR(50) NOT NULL,
    event_subcategory VARCHAR(50),
    
    -- User and session information
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    
    -- Target entity information
    target_table VARCHAR(100),
    target_id UUID,
    target_barcode VARCHAR(50),
    
    -- Event details
    action VARCHAR(50) NOT NULL, -- CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, etc.
    description TEXT,
    old_values JSONB,
    new_values JSONB,
    
    -- Context information
    station_id INTEGER REFERENCES stations(id) ON DELETE SET NULL,
    manufacturing_order_id INTEGER REFERENCES manufacturing_orders(id) ON DELETE SET NULL,
    pallet_id INTEGER REFERENCES pallets(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    event_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Metadata
    severity_level VARCHAR(20) DEFAULT 'INFO', -- DEBUG, INFO, WARNING, ERROR, CRITICAL
    is_successful BOOLEAN DEFAULT true,
    error_message TEXT,
    
    -- Additional context
    metadata JSONB,
    tags TEXT[]
);

-- Create indexes for efficient querying
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_event_category ON audit_logs(event_category);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_target_table ON audit_logs(target_table);
CREATE INDEX idx_audit_logs_target_id ON audit_logs(target_id);
CREATE INDEX idx_audit_logs_target_barcode ON audit_logs(target_barcode);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_event_timestamp ON audit_logs(event_timestamp);
CREATE INDEX idx_audit_logs_severity_level ON audit_logs(severity_level);
CREATE INDEX idx_audit_logs_station_id ON audit_logs(station_id);
CREATE INDEX idx_audit_logs_manufacturing_order_id ON audit_logs(manufacturing_order_id);
CREATE INDEX idx_audit_logs_pallet_id ON audit_logs(pallet_id);

-- Create composite indexes for common query patterns
CREATE INDEX idx_audit_logs_user_timestamp ON audit_logs(user_id, event_timestamp);
CREATE INDEX idx_audit_logs_target_timestamp ON audit_logs(target_table, target_id, event_timestamp);
CREATE INDEX idx_audit_logs_station_timestamp ON audit_logs(station_id, event_timestamp);
CREATE INDEX idx_audit_logs_mo_timestamp ON audit_logs(manufacturing_order_id, event_timestamp);

-- Create GIN index for JSONB fields
CREATE INDEX idx_audit_logs_old_values_gin ON audit_logs USING GIN (old_values);
CREATE INDEX idx_audit_logs_new_values_gin ON audit_logs USING GIN (new_values);
CREATE INDEX idx_audit_logs_metadata_gin ON audit_logs USING GIN (metadata);

-- Create GIN index for tags array
CREATE INDEX idx_audit_logs_tags_gin ON audit_logs USING GIN (tags);

-- Add constraints
ALTER TABLE audit_logs ADD CONSTRAINT check_event_type_length 
    CHECK (char_length(event_type) >= 1 AND char_length(event_type) <= 100);

ALTER TABLE audit_logs ADD CONSTRAINT check_event_category_length 
    CHECK (char_length(event_category) >= 1 AND char_length(event_category) <= 50);

ALTER TABLE audit_logs ADD CONSTRAINT check_action_length 
    CHECK (char_length(action) >= 1 AND char_length(action) <= 50);

ALTER TABLE audit_logs ADD CONSTRAINT check_severity_level 
    CHECK (severity_level IN ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'));

-- Add trigger to update event_timestamp
CREATE TRIGGER update_audit_logs_event_timestamp 
    BEFORE UPDATE ON audit_logs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE audit_logs IS 'Comprehensive audit log for tracking all system activities, user actions, and data changes';
COMMENT ON COLUMN audit_logs.event_type IS 'Type of event (e.g., PANEL_SCAN, INSPECTION, USER_LOGIN)';
COMMENT ON COLUMN audit_logs.event_category IS 'Category of event (e.g., AUTHENTICATION, DATA_ACCESS, SYSTEM)';
COMMENT ON COLUMN audit_logs.event_subcategory IS 'Subcategory for more specific event classification';
COMMENT ON COLUMN audit_logs.user_id IS 'ID of the user who performed the action';
COMMENT ON COLUMN audit_logs.session_id IS 'Session identifier for tracking user sessions';
COMMENT ON COLUMN audit_logs.ip_address IS 'IP address of the client that performed the action';
COMMENT ON COLUMN audit_logs.user_agent IS 'User agent string from the client';
COMMENT ON COLUMN audit_logs.target_table IS 'Database table that was affected';
COMMENT ON COLUMN audit_logs.target_id IS 'ID of the record that was affected';
COMMENT ON COLUMN audit_logs.target_barcode IS 'Barcode of the panel or item that was affected';
COMMENT ON COLUMN audit_logs.action IS 'Type of action performed (CREATE, READ, UPDATE, DELETE, etc.)';
COMMENT ON COLUMN audit_logs.description IS 'Human-readable description of the event';
COMMENT ON COLUMN audit_logs.old_values IS 'Previous values before the change (JSON format)';
COMMENT ON COLUMN audit_logs.new_values IS 'New values after the change (JSON format)';
COMMENT ON COLUMN audit_logs.station_id IS 'Station where the action occurred';
COMMENT ON COLUMN audit_logs.manufacturing_order_id IS 'Manufacturing order related to the action';
COMMENT ON COLUMN audit_logs.pallet_id IS 'Pallet related to the action';
COMMENT ON COLUMN audit_logs.event_timestamp IS 'Timestamp when the event occurred';
COMMENT ON COLUMN audit_logs.severity_level IS 'Severity level of the event';
COMMENT ON COLUMN audit_logs.is_successful IS 'Whether the action was successful';
COMMENT ON COLUMN audit_logs.error_message IS 'Error message if the action failed';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional metadata in JSON format';
COMMENT ON COLUMN audit_logs.tags IS 'Array of tags for categorizing and filtering events';

-- Create audit log event types enum
CREATE TYPE audit_event_type AS ENUM (
    -- Authentication events
    'USER_LOGIN',
    'USER_LOGOUT',
    'USER_REGISTRATION',
    'PASSWORD_CHANGE',
    'PASSWORD_RESET',
    'SESSION_EXPIRED',
    'ACCESS_DENIED',
    
    -- Panel events
    'PANEL_SCAN',
    'PANEL_CREATED',
    'PANEL_UPDATED',
    'PANEL_DELETED',
    'PANEL_INSPECTION',
    'PANEL_PASS',
    'PANEL_FAIL',
    'PANEL_REWORK',
    
    -- Station events
    'STATION_LOGIN',
    'STATION_LOGOUT',
    'STATION_CONFIG_CHANGE',
    'STATION_ERROR',
    
    -- Manufacturing order events
    'MO_CREATED',
    'MO_UPDATED',
    'MO_COMPLETED',
    'MO_CANCELLED',
    'MO_PROGRESS_UPDATE',
    
    -- Pallet events
    'PALLET_CREATED',
    'PALLET_ASSIGNED',
    'PALLET_COMPLETED',
    'PALLET_PRINTED',
    
    -- System events
    'SYSTEM_STARTUP',
    'SYSTEM_SHUTDOWN',
    'BACKUP_CREATED',
    'MAINTENANCE_MODE',
    'CONFIGURATION_CHANGE',
    
    -- Data events
    'DATA_EXPORT',
    'DATA_IMPORT',
    'DATA_SYNC',
    'DATA_CLEANUP',
    
    -- Security events
    'SECURITY_ALERT',
    'UNAUTHORIZED_ACCESS',
    'RATE_LIMIT_EXCEEDED',
    'SUSPICIOUS_ACTIVITY'
);

-- Create audit event category enum
CREATE TYPE audit_event_category AS ENUM (
    'AUTHENTICATION',
    'AUTHORIZATION',
    'DATA_ACCESS',
    'DATA_MODIFICATION',
    'SYSTEM',
    'SECURITY',
    'BUSINESS_LOGIC',
    'INTEGRATION',
    'PERFORMANCE',
    'MAINTENANCE'
);

-- Create audit action enum
CREATE TYPE audit_action AS ENUM (
    'CREATE',
    'READ',
    'UPDATE',
    'DELETE',
    'LOGIN',
    'LOGOUT',
    'SCAN',
    'INSPECT',
    'PASS',
    'FAIL',
    'ASSIGN',
    'COMPLETE',
    'PRINT',
    'EXPORT',
    'IMPORT',
    'SYNC',
    'CONFIGURE',
    'MAINTAIN'
);

-- Create audit severity level enum
CREATE TYPE audit_severity_level AS ENUM (
    'DEBUG',
    'INFO',
    'WARNING',
    'ERROR',
    'CRITICAL'
);

-- Add constraints using the new enums
ALTER TABLE audit_logs ALTER COLUMN event_type TYPE audit_event_type USING event_type::audit_event_type;
ALTER TABLE audit_logs ALTER COLUMN event_category TYPE audit_event_category USING event_category::audit_event_category;
ALTER TABLE audit_logs ALTER COLUMN action TYPE audit_action USING action::audit_action;
ALTER TABLE audit_logs ALTER COLUMN severity_level TYPE audit_severity_level USING severity_level::audit_severity_level;

-- Create view for common audit log queries
CREATE VIEW audit_log_summary AS
SELECT 
    DATE_TRUNC('day', event_timestamp) as date,
    event_category,
    event_type,
    action,
    severity_level,
    COUNT(*) as event_count,
    COUNT(CASE WHEN is_successful = false THEN 1 END) as error_count,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT station_id) as unique_stations
FROM audit_logs
GROUP BY DATE_TRUNC('day', event_timestamp), event_category, event_type, action, severity_level
ORDER BY date DESC, event_count DESC;

-- Create function to automatically log events
CREATE OR REPLACE FUNCTION log_audit_event(
    p_event_type audit_event_type,
    p_event_category audit_event_category,
    p_action audit_action,
    p_description TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_target_table VARCHAR(100) DEFAULT NULL,
    p_target_id UUID DEFAULT NULL,
    p_target_barcode VARCHAR(50) DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_station_id INTEGER DEFAULT NULL,
    p_manufacturing_order_id INTEGER DEFAULT NULL,
    p_pallet_id INTEGER DEFAULT NULL,
    p_severity_level audit_severity_level DEFAULT 'INFO',
    p_metadata JSONB DEFAULT NULL,
    p_tags TEXT[] DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_audit_id UUID;
BEGIN
    INSERT INTO audit_logs (
        event_type,
        event_category,
        action,
        description,
        user_id,
        target_table,
        target_id,
        target_barcode,
        old_values,
        new_values,
        station_id,
        manufacturing_order_id,
        pallet_id,
        severity_level,
        metadata,
        tags,
        is_successful
    ) VALUES (
        p_event_type,
        p_event_category,
        p_action,
        p_description,
        p_user_id,
        p_target_table,
        p_target_id,
        p_target_barcode,
        p_old_values,
        p_new_values,
        p_station_id,
        p_manufacturing_order_id,
        p_pallet_id,
        p_severity_level,
        p_metadata,
        p_tags,
        true
    ) RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT ON audit_logs TO solar_panel_user;
GRANT SELECT ON audit_log_summary TO solar_panel_user;
GRANT EXECUTE ON FUNCTION log_audit_event TO solar_panel_user;

-- Migration notes:
-- - This creates a comprehensive audit logging system
-- - Includes enums for type safety and consistency
-- - Provides indexes for efficient querying
-- - Includes a helper function for easy event logging
-- - Creates a summary view for reporting
-- - Supports JSONB for flexible metadata storage

-- Rollback instructions:
/*
-- To rollback this migration:
DROP VIEW IF EXISTS audit_log_summary;
DROP FUNCTION IF EXISTS log_audit_event;
DROP TABLE IF EXISTS audit_logs;
DROP TYPE IF EXISTS audit_event_type;
DROP TYPE IF EXISTS audit_event_category;
DROP TYPE IF EXISTS audit_action;
DROP TYPE IF EXISTS audit_severity_level;
*/
