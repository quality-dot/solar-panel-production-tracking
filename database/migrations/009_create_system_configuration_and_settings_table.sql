-- Migration 009: Create System Configuration and Settings Table
-- Solar Panel Production Tracking System
-- Created: 2025-08-20

-- This migration creates a comprehensive system configuration and settings table
-- to store application settings, station configurations, and system parameters.

-- Create system configuration table
CREATE TABLE system_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Configuration identification
    config_key VARCHAR(255) NOT NULL UNIQUE,
    config_name VARCHAR(255) NOT NULL,
    config_description TEXT,
    config_category VARCHAR(100) NOT NULL,
    config_subcategory VARCHAR(100),
    
    -- Configuration values
    config_value TEXT,
    config_value_json JSONB,
    config_value_numeric NUMERIC,
    config_value_boolean BOOLEAN,
    config_value_timestamp TIMESTAMP,
    
    -- Configuration metadata
    data_type VARCHAR(50) NOT NULL, -- TEXT, JSON, NUMERIC, BOOLEAN, TIMESTAMP, ENUM
    is_encrypted BOOLEAN DEFAULT false,
    is_sensitive BOOLEAN DEFAULT false,
    is_readonly BOOLEAN DEFAULT false,
    is_required BOOLEAN DEFAULT false,
    
    -- Validation and constraints
    validation_regex VARCHAR(500),
    min_value NUMERIC,
    max_value NUMERIC,
    allowed_values TEXT[],
    default_value TEXT,
    
    -- Scope and inheritance
    scope VARCHAR(50) NOT NULL DEFAULT 'GLOBAL', -- GLOBAL, STATION, USER, MANUFACTURING_ORDER
    scope_id UUID, -- ID of the specific scope (station_id, user_id, etc.)
    
    -- Versioning and lifecycle
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    effective_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    effective_to TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Audit information
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Additional metadata
    metadata JSONB,
    tags TEXT[]
);

-- Create indexes for efficient querying
CREATE INDEX idx_system_configs_key ON system_configurations(config_key);
CREATE INDEX idx_system_configs_category ON system_configurations(config_category);
CREATE INDEX idx_system_configs_subcategory ON system_configurations(config_subcategory);
CREATE INDEX idx_system_configs_scope ON system_configurations(scope);
CREATE INDEX idx_system_configs_scope_id ON system_configurations(scope_id);
CREATE INDEX idx_system_configs_active ON system_configurations(is_active);
CREATE INDEX idx_system_configs_effective_from ON system_configurations(effective_from);
CREATE INDEX idx_system_configs_created_at ON system_configurations(created_at);
CREATE INDEX idx_system_configs_updated_at ON system_configurations(updated_at);

-- Create composite indexes for common query patterns
CREATE INDEX idx_system_configs_category_active ON system_configurations(config_category, is_active);
CREATE INDEX idx_system_configs_scope_active ON system_configurations(scope, scope_id, is_active);
CREATE INDEX idx_system_configs_key_version ON system_configurations(config_key, version);

-- Create GIN indexes for JSONB and array fields
CREATE INDEX idx_system_configs_value_json_gin ON system_configurations USING GIN (config_value_json);
CREATE INDEX idx_system_configs_metadata_gin ON system_configurations USING GIN (metadata);
CREATE INDEX idx_system_configs_tags_gin ON system_configurations USING GIN (tags);
CREATE INDEX idx_system_configs_allowed_values_gin ON system_configurations USING GIN (allowed_values);

-- Add constraints
ALTER TABLE system_configurations ADD CONSTRAINT check_config_key_length 
    CHECK (char_length(config_key) >= 1 AND char_length(config_key) <= 255);

ALTER TABLE system_configurations ADD CONSTRAINT check_config_name_length 
    CHECK (char_length(config_name) >= 1 AND char_length(config_name) <= 255);

ALTER TABLE system_configurations ADD CONSTRAINT check_config_category_length 
    CHECK (char_length(config_category) >= 1 AND char_length(config_category) <= 100);

ALTER TABLE system_configurations ADD CONSTRAINT check_data_type 
    CHECK (data_type IN ('TEXT', 'JSON', 'NUMERIC', 'BOOLEAN', 'TIMESTAMP', 'ENUM'));

ALTER TABLE system_configurations ADD CONSTRAINT check_scope 
    CHECK (scope IN ('GLOBAL', 'STATION', 'USER', 'MANUFACTURING_ORDER', 'PALLET'));

ALTER TABLE system_configurations ADD CONSTRAINT check_version_positive 
    CHECK (version > 0);

-- Add trigger to update updated_at
CREATE TRIGGER update_system_configurations_updated_at 
    BEFORE UPDATE ON system_configurations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE system_configurations IS 'System configuration and settings table for storing application parameters and settings';
COMMENT ON COLUMN system_configurations.config_key IS 'Unique key identifier for the configuration';
COMMENT ON COLUMN system_configurations.config_name IS 'Human-readable name for the configuration';
COMMENT ON COLUMN system_configurations.config_description IS 'Detailed description of what this configuration controls';
COMMENT ON COLUMN system_configurations.config_category IS 'Category for grouping related configurations';
COMMENT ON COLUMN system_configurations.config_subcategory IS 'Subcategory for more specific grouping';
COMMENT ON COLUMN system_configurations.config_value IS 'Text value for the configuration';
COMMENT ON COLUMN system_configurations.config_value_json IS 'JSON value for complex configurations';
COMMENT ON COLUMN system_configurations.config_value_numeric IS 'Numeric value for the configuration';
COMMENT ON COLUMN system_configurations.config_value_boolean IS 'Boolean value for the configuration';
COMMENT ON COLUMN system_configurations.config_value_timestamp IS 'Timestamp value for the configuration';
COMMENT ON COLUMN system_configurations.data_type IS 'Data type of the configuration value';
COMMENT ON COLUMN system_configurations.is_encrypted IS 'Whether the value is encrypted';
COMMENT ON COLUMN system_configurations.is_sensitive IS 'Whether the value contains sensitive information';
COMMENT ON COLUMN system_configurations.is_readonly IS 'Whether the configuration is read-only';
COMMENT ON COLUMN system_configurations.is_required IS 'Whether the configuration is required';
COMMENT ON COLUMN system_configurations.validation_regex IS 'Regular expression for validation';
COMMENT ON COLUMN system_configurations.min_value IS 'Minimum allowed value for numeric configurations';
COMMENT ON COLUMN system_configurations.max_value IS 'Maximum allowed value for numeric configurations';
COMMENT ON COLUMN system_configurations.allowed_values IS 'Array of allowed values for enum configurations';
COMMENT ON COLUMN system_configurations.default_value IS 'Default value for the configuration';
COMMENT ON COLUMN system_configurations.scope IS 'Scope of the configuration (GLOBAL, STATION, USER, etc.)';
COMMENT ON COLUMN system_configurations.scope_id IS 'ID of the specific scope entity';
COMMENT ON COLUMN system_configurations.version IS 'Version number for configuration changes';
COMMENT ON COLUMN system_configurations.is_active IS 'Whether the configuration is currently active';
COMMENT ON COLUMN system_configurations.effective_from IS 'When this configuration becomes effective';
COMMENT ON COLUMN system_configurations.effective_to IS 'When this configuration expires';
COMMENT ON COLUMN system_configurations.metadata IS 'Additional metadata in JSON format';
COMMENT ON COLUMN system_configurations.tags IS 'Array of tags for categorizing configurations';

-- Create configuration category enum
CREATE TYPE config_category AS ENUM (
    'SYSTEM',
    'SECURITY',
    'AUTHENTICATION',
    'DATABASE',
    'NETWORK',
    'EMAIL',
    'NOTIFICATION',
    'LOGGING',
    'PERFORMANCE',
    'UI',
    'BUSINESS_LOGIC',
    'INTEGRATION',
    'BACKUP',
    'MAINTENANCE',
    'STATION_CONFIG',
    'INSPECTION',
    'MANUFACTURING',
    'REPORTING',
    'EXPORT',
    'IMPORT'
);

-- Create configuration scope enum
CREATE TYPE config_scope AS ENUM (
    'GLOBAL',
    'STATION',
    'USER',
    'MANUFACTURING_ORDER',
    'PALLET',
    'DEPARTMENT',
    'SHIFT'
);

-- Create configuration data type enum
CREATE TYPE config_data_type AS ENUM (
    'TEXT',
    'JSON',
    'NUMERIC',
    'BOOLEAN',
    'TIMESTAMP',
    'ENUM'
);

-- Add constraints using the new enums
ALTER TABLE system_configurations ALTER COLUMN config_category TYPE config_category USING config_category::config_category;
ALTER TABLE system_configurations ALTER COLUMN scope TYPE config_scope USING scope::config_scope;
ALTER TABLE system_configurations ALTER COLUMN data_type TYPE config_data_type USING data_type::config_data_type;

-- Create view for active configurations
CREATE VIEW active_configurations AS
SELECT 
    config_key,
    config_name,
    config_description,
    config_category,
    config_subcategory,
    config_value,
    config_value_json,
    config_value_numeric,
    config_value_boolean,
    config_value_timestamp,
    data_type,
    is_encrypted,
    is_sensitive,
    is_readonly,
    is_required,
    scope,
    scope_id,
    version,
    effective_from,
    effective_to,
    created_at,
    updated_at,
    created_by,
    updated_by,
    metadata,
    tags
FROM system_configurations
WHERE is_active = true
  AND (effective_to IS NULL OR effective_to > CURRENT_TIMESTAMP)
  AND effective_from <= CURRENT_TIMESTAMP;

-- Create function to get configuration value
CREATE OR REPLACE FUNCTION get_config_value(
    p_config_key VARCHAR(255),
    p_scope VARCHAR(50) DEFAULT 'GLOBAL',
    p_scope_id UUID DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
    v_config_value TEXT;
BEGIN
    SELECT 
        CASE 
            WHEN data_type = 'JSON' THEN config_value_json::TEXT
            WHEN data_type = 'NUMERIC' THEN config_value_numeric::TEXT
            WHEN data_type = 'BOOLEAN' THEN config_value_boolean::TEXT
            WHEN data_type = 'TIMESTAMP' THEN config_value_timestamp::TEXT
            ELSE config_value
        END
    INTO v_config_value
    FROM active_configurations
    WHERE config_key = p_config_key
      AND scope = p_scope
      AND (scope_id = p_scope_id OR (scope_id IS NULL AND p_scope_id IS NULL))
    ORDER BY version DESC
    LIMIT 1;
    
    RETURN v_config_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to set configuration value
CREATE OR REPLACE FUNCTION set_config_value(
    p_config_key VARCHAR(255),
    p_config_value TEXT,
    p_data_type config_data_type DEFAULT 'TEXT',
    p_scope config_scope DEFAULT 'GLOBAL',
    p_scope_id UUID DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_config_id UUID;
    v_version INTEGER;
BEGIN
    -- Get the next version number
    SELECT COALESCE(MAX(version), 0) + 1
    INTO v_version
    FROM system_configurations
    WHERE config_key = p_config_key
      AND scope = p_scope
      AND (scope_id = p_scope_id OR (scope_id IS NULL AND p_scope_id IS NULL));
    
    -- Deactivate previous version
    UPDATE system_configurations
    SET is_active = false,
        effective_to = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = p_user_id
    WHERE config_key = p_config_key
      AND scope = p_scope
      AND (scope_id = p_scope_id OR (scope_id IS NULL AND p_scope_id IS NULL))
      AND is_active = true;
    
    -- Insert new version
    INSERT INTO system_configurations (
        config_key,
        config_name,
        config_description,
        config_category,
        data_type,
        config_value,
        scope,
        scope_id,
        version,
        is_active,
        effective_from,
        created_by,
        updated_by
    ) VALUES (
        p_config_key,
        p_config_key, -- Use key as name if not provided
        p_description,
        'SYSTEM', -- Default category
        p_data_type,
        p_config_value,
        p_scope,
        p_scope_id,
        v_version,
        true,
        CURRENT_TIMESTAMP,
        p_user_id,
        p_user_id
    ) RETURNING id INTO v_config_id;
    
    RETURN v_config_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get all configurations for a scope
CREATE OR REPLACE FUNCTION get_scope_configurations(
    p_scope config_scope DEFAULT 'GLOBAL',
    p_scope_id UUID DEFAULT NULL
) RETURNS TABLE (
    config_key VARCHAR(255),
    config_name VARCHAR(255),
    config_value TEXT,
    data_type config_data_type,
    is_encrypted BOOLEAN,
    is_sensitive BOOLEAN,
    is_readonly BOOLEAN,
    scope config_scope,
    version INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ac.config_key,
        ac.config_name,
        CASE 
            WHEN ac.data_type = 'JSON' THEN ac.config_value_json::TEXT
            WHEN ac.data_type = 'NUMERIC' THEN ac.config_value_numeric::TEXT
            WHEN ac.data_type = 'BOOLEAN' THEN ac.config_value_boolean::TEXT
            WHEN ac.data_type = 'TIMESTAMP' THEN ac.config_value_timestamp::TEXT
            ELSE ac.config_value
        END as config_value,
        ac.data_type,
        ac.is_encrypted,
        ac.is_sensitive,
        ac.is_readonly,
        ac.scope,
        ac.version
    FROM active_configurations ac
    WHERE ac.scope = p_scope
      AND (ac.scope_id = p_scope_id OR (ac.scope_id IS NULL AND p_scope_id IS NULL))
    ORDER BY ac.config_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default system configurations
INSERT INTO system_configurations (
    config_key,
    config_name,
    config_description,
    config_category,
    data_type,
    config_value,
    scope,
    version,
    is_active,
    effective_from,
    is_required
) VALUES 
-- System configurations
('system.name', 'System Name', 'Name of the solar panel production tracking system', 'SYSTEM', 'TEXT', 'Solar Panel Production Tracking System', 'GLOBAL', 1, true, CURRENT_TIMESTAMP, true),
('system.version', 'System Version', 'Current version of the system', 'SYSTEM', 'TEXT', '1.0.0', 'GLOBAL', 1, true, CURRENT_TIMESTAMP, true),
('system.environment', 'Environment', 'Current environment (development, staging, production)', 'SYSTEM', 'TEXT', 'development', 'GLOBAL', 1, true, CURRENT_TIMESTAMP, true),

-- Security configurations
('security.session_timeout_minutes', 'Session Timeout', 'Session timeout in minutes', 'SECURITY', 'NUMERIC', '30', 'GLOBAL', 1, true, CURRENT_TIMESTAMP, true),
('security.max_login_attempts', 'Max Login Attempts', 'Maximum number of failed login attempts before lockout', 'SECURITY', 'NUMERIC', '5', 'GLOBAL', 1, true, CURRENT_TIMESTAMP, true),
('security.password_min_length', 'Password Min Length', 'Minimum password length', 'SECURITY', 'NUMERIC', '8', 'GLOBAL', 1, true, CURRENT_TIMESTAMP, true),

-- Database configurations
('database.connection_pool_size', 'Connection Pool Size', 'Number of database connections in the pool', 'DATABASE', 'NUMERIC', '10', 'GLOBAL', 1, true, CURRENT_TIMESTAMP, true),
('database.query_timeout_seconds', 'Query Timeout', 'Database query timeout in seconds', 'DATABASE', 'NUMERIC', '30', 'GLOBAL', 1, true, CURRENT_TIMESTAMP, true),

-- Logging configurations
('logging.level', 'Log Level', 'Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)', 'LOGGING', 'TEXT', 'INFO', 'GLOBAL', 1, true, CURRENT_TIMESTAMP, true),
('logging.retention_days', 'Log Retention', 'Number of days to retain log files', 'LOGGING', 'NUMERIC', '30', 'GLOBAL', 1, true, CURRENT_TIMESTAMP, true),

-- Performance configurations
('performance.max_concurrent_users', 'Max Concurrent Users', 'Maximum number of concurrent users', 'PERFORMANCE', 'NUMERIC', '100', 'GLOBAL', 1, true, CURRENT_TIMESTAMP, true),
('performance.cache_ttl_seconds', 'Cache TTL', 'Cache time-to-live in seconds', 'PERFORMANCE', 'NUMERIC', '300', 'GLOBAL', 1, true, CURRENT_TIMESTAMP, true),

-- Business logic configurations
('manufacturing.default_panel_quantity', 'Default Panel Quantity', 'Default quantity of panels per manufacturing order', 'MANUFACTURING', 'NUMERIC', '100', 'GLOBAL', 1, true, CURRENT_TIMESTAMP, true),
('inspection.auto_fail_threshold', 'Auto Fail Threshold', 'Number of failed inspections before auto-fail', 'INSPECTION', 'NUMERIC', '3', 'GLOBAL', 1, true, CURRENT_TIMESTAMP, true),

-- UI configurations
('ui.theme', 'UI Theme', 'User interface theme (light, dark, auto)', 'UI', 'TEXT', 'light', 'GLOBAL', 1, true, CURRENT_TIMESTAMP, true),
('ui.language', 'UI Language', 'User interface language', 'UI', 'TEXT', 'en', 'GLOBAL', 1, true, CURRENT_TIMESTAMP, true),
('ui.timezone', 'UI Timezone', 'User interface timezone', 'UI', 'TEXT', 'UTC', 'GLOBAL', 1, true, CURRENT_TIMESTAMP, true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON system_configurations TO solar_panel_user;
GRANT SELECT ON active_configurations TO solar_panel_user;
GRANT EXECUTE ON FUNCTION get_config_value TO solar_panel_user;
GRANT EXECUTE ON FUNCTION set_config_value TO solar_panel_user;
GRANT EXECUTE ON FUNCTION get_scope_configurations TO solar_panel_user;

-- Migration notes:
-- - This creates a comprehensive system configuration management system
-- - Supports multiple scopes (global, station, user, etc.)
-- - Includes versioning and effective date management
-- - Provides helper functions for easy configuration access
-- - Includes default configurations for common settings
-- - Supports encrypted and sensitive configurations
-- - Includes validation and constraints

-- Rollback instructions:
/*
-- To rollback this migration:
DROP FUNCTION IF EXISTS get_scope_configurations;
DROP FUNCTION IF EXISTS set_config_value;
DROP FUNCTION IF EXISTS get_config_value;
DROP VIEW IF EXISTS active_configurations;
DROP TABLE IF EXISTS system_configurations;
DROP TYPE IF EXISTS config_category;
DROP TYPE IF EXISTS config_scope;
DROP TYPE IF EXISTS config_data_type;
*/
