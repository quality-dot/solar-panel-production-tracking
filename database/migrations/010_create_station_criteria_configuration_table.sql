-- Migration 010: Create Station Criteria Configuration Table
-- Solar Panel Production Tracking System
-- Created: 2025-08-20

-- This migration creates a station criteria configuration table to define
-- inspection criteria, parameters, and requirements for each station.

-- Create station criteria configuration table
CREATE TABLE station_criteria_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Station and criteria identification
    station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    criteria_name VARCHAR(255) NOT NULL,
    criteria_description TEXT,
    criteria_type VARCHAR(100) NOT NULL,
    criteria_category VARCHAR(100) NOT NULL,
    
    -- Criteria parameters
    parameter_name VARCHAR(255) NOT NULL,
    parameter_type VARCHAR(50) NOT NULL, -- NUMERIC, TEXT, BOOLEAN, ENUM, RANGE
    parameter_value TEXT,
    parameter_value_numeric NUMERIC,
    parameter_value_boolean BOOLEAN,
    parameter_value_json JSONB,
    
    -- Validation and constraints
    min_value NUMERIC,
    max_value NUMERIC,
    allowed_values TEXT[],
    validation_regex VARCHAR(500),
    is_required BOOLEAN DEFAULT false,
    is_critical BOOLEAN DEFAULT false,
    
    -- Measurement units and precision
    unit_of_measurement VARCHAR(50),
    decimal_places INTEGER DEFAULT 2,
    tolerance_percentage NUMERIC DEFAULT 0,
    tolerance_absolute NUMERIC DEFAULT 0,
    
    -- Criteria behavior
    failure_threshold INTEGER DEFAULT 1,
    warning_threshold INTEGER DEFAULT 1,
    auto_fail_on_threshold BOOLEAN DEFAULT false,
    allow_manual_override BOOLEAN DEFAULT true,
    
    -- Display and UI settings
    display_order INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT true,
    display_name VARCHAR(255),
    help_text TEXT,
    tooltip_text TEXT,
    
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
    tags TEXT[],
    
    -- Unique constraint to prevent duplicate criteria for the same station
    UNIQUE(station_id, criteria_name, parameter_name, version)
);

-- Create indexes for efficient querying
CREATE INDEX idx_station_criteria_station_id ON station_criteria_configurations(station_id);
CREATE INDEX idx_station_criteria_name ON station_criteria_configurations(criteria_name);
CREATE INDEX idx_station_criteria_type ON station_criteria_configurations(criteria_type);
CREATE INDEX idx_station_criteria_category ON station_criteria_configurations(criteria_category);
CREATE INDEX idx_station_criteria_parameter_name ON station_criteria_configurations(parameter_name);
CREATE INDEX idx_station_criteria_active ON station_criteria_configurations(is_active);
CREATE INDEX idx_station_criteria_effective_from ON station_criteria_configurations(effective_from);
CREATE INDEX idx_station_criteria_created_at ON station_criteria_configurations(created_at);
CREATE INDEX idx_station_criteria_updated_at ON station_criteria_configurations(updated_at);

-- Create composite indexes for common query patterns
CREATE INDEX idx_station_criteria_station_active ON station_criteria_configurations(station_id, is_active);
CREATE INDEX idx_station_criteria_type_active ON station_criteria_configurations(criteria_type, is_active);
CREATE INDEX idx_station_criteria_category_active ON station_criteria_configurations(criteria_category, is_active);
CREATE INDEX idx_station_criteria_station_type ON station_criteria_configurations(station_id, criteria_type, is_active);

-- Create GIN indexes for JSONB and array fields
CREATE INDEX idx_station_criteria_value_json_gin ON station_criteria_configurations USING GIN (parameter_value_json);
CREATE INDEX idx_station_criteria_metadata_gin ON station_criteria_configurations USING GIN (metadata);
CREATE INDEX idx_station_criteria_tags_gin ON station_criteria_configurations USING GIN (tags);
CREATE INDEX idx_station_criteria_allowed_values_gin ON station_criteria_configurations USING GIN (allowed_values);

-- Add constraints
ALTER TABLE station_criteria_configurations ADD CONSTRAINT check_criteria_name_length 
    CHECK (char_length(criteria_name) >= 1 AND char_length(criteria_name) <= 255);

ALTER TABLE station_criteria_configurations ADD CONSTRAINT check_parameter_name_length 
    CHECK (char_length(parameter_name) >= 1 AND char_length(parameter_name) <= 255);

ALTER TABLE station_criteria_configurations ADD CONSTRAINT check_criteria_type_length 
    CHECK (char_length(criteria_type) >= 1 AND char_length(criteria_type) <= 100);

ALTER TABLE station_criteria_configurations ADD CONSTRAINT check_criteria_category_length 
    CHECK (char_length(criteria_category) >= 1 AND char_length(criteria_category) <= 100);

ALTER TABLE station_criteria_configurations ADD CONSTRAINT check_parameter_type 
    CHECK (parameter_type IN ('NUMERIC', 'TEXT', 'BOOLEAN', 'ENUM', 'RANGE', 'JSON'));

ALTER TABLE station_criteria_configurations ADD CONSTRAINT check_version_positive 
    CHECK (version > 0);

ALTER TABLE station_criteria_configurations ADD CONSTRAINT check_decimal_places 
    CHECK (decimal_places >= 0 AND decimal_places <= 10);

ALTER TABLE station_criteria_configurations ADD CONSTRAINT check_tolerance_percentage 
    CHECK (tolerance_percentage >= 0 AND tolerance_percentage <= 100);

ALTER TABLE station_criteria_configurations ADD CONSTRAINT check_failure_threshold 
    CHECK (failure_threshold > 0);

ALTER TABLE station_criteria_configurations ADD CONSTRAINT check_warning_threshold 
    CHECK (warning_threshold > 0);

-- Add trigger to update updated_at
CREATE TRIGGER update_station_criteria_configurations_updated_at 
    BEFORE UPDATE ON station_criteria_configurations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE station_criteria_configurations IS 'Configuration table for defining inspection criteria and parameters for each station';
COMMENT ON COLUMN station_criteria_configurations.station_id IS 'ID of the station this criteria applies to';
COMMENT ON COLUMN station_criteria_configurations.criteria_name IS 'Name of the inspection criteria';
COMMENT ON COLUMN station_criteria_configurations.criteria_description IS 'Detailed description of the criteria';
COMMENT ON COLUMN station_criteria_configurations.criteria_type IS 'Type of criteria (e.g., VISUAL, ELECTRICAL, MECHANICAL)';
COMMENT ON COLUMN station_criteria_configurations.criteria_category IS 'Category of criteria (e.g., SAFETY, QUALITY, PERFORMANCE)';
COMMENT ON COLUMN station_criteria_configurations.parameter_name IS 'Name of the parameter being measured';
COMMENT ON COLUMN station_criteria_configurations.parameter_type IS 'Data type of the parameter';
COMMENT ON COLUMN station_criteria_configurations.parameter_value IS 'Text value of the parameter';
COMMENT ON COLUMN station_criteria_configurations.parameter_value_numeric IS 'Numeric value of the parameter';
COMMENT ON COLUMN station_criteria_configurations.parameter_value_boolean IS 'Boolean value of the parameter';
COMMENT ON COLUMN station_criteria_configurations.parameter_value_json IS 'JSON value for complex parameters';
COMMENT ON COLUMN station_criteria_configurations.min_value IS 'Minimum allowed value';
COMMENT ON COLUMN station_criteria_configurations.max_value IS 'Maximum allowed value';
COMMENT ON COLUMN station_criteria_configurations.allowed_values IS 'Array of allowed values for enum parameters';
COMMENT ON COLUMN station_criteria_configurations.validation_regex IS 'Regular expression for validation';
COMMENT ON COLUMN station_criteria_configurations.is_required IS 'Whether this criteria is required';
COMMENT ON COLUMN station_criteria_configurations.is_critical IS 'Whether this is a critical criteria';
COMMENT ON COLUMN station_criteria_configurations.unit_of_measurement IS 'Unit of measurement (e.g., mm, V, A, %)';
COMMENT ON COLUMN station_criteria_configurations.decimal_places IS 'Number of decimal places for display';
COMMENT ON COLUMN station_criteria_configurations.tolerance_percentage IS 'Tolerance as a percentage';
COMMENT ON COLUMN station_criteria_configurations.tolerance_absolute IS 'Absolute tolerance value';
COMMENT ON COLUMN station_criteria_configurations.failure_threshold IS 'Number of failures before auto-fail';
COMMENT ON COLUMN station_criteria_configurations.warning_threshold IS 'Number of warnings before escalation';
COMMENT ON COLUMN station_criteria_configurations.auto_fail_on_threshold IS 'Whether to auto-fail when threshold is reached';
COMMENT ON COLUMN station_criteria_configurations.allow_manual_override IS 'Whether manual override is allowed';
COMMENT ON COLUMN station_criteria_configurations.display_order IS 'Order for display in UI';
COMMENT ON COLUMN station_criteria_configurations.is_visible IS 'Whether this criteria is visible in UI';
COMMENT ON COLUMN station_criteria_configurations.display_name IS 'Display name for UI';
COMMENT ON COLUMN station_criteria_configurations.help_text IS 'Help text for users';
COMMENT ON COLUMN station_criteria_configurations.tooltip_text IS 'Tooltip text for UI';
COMMENT ON COLUMN station_criteria_configurations.version IS 'Version number for criteria changes';
COMMENT ON COLUMN station_criteria_configurations.is_active IS 'Whether this criteria is currently active';
COMMENT ON COLUMN station_criteria_configurations.effective_from IS 'When this criteria becomes effective';
COMMENT ON COLUMN station_criteria_configurations.effective_to IS 'When this criteria expires';
COMMENT ON COLUMN station_criteria_configurations.metadata IS 'Additional metadata in JSON format';
COMMENT ON COLUMN station_criteria_configurations.tags IS 'Array of tags for categorizing criteria';

-- Create criteria type enum
CREATE TYPE criteria_type AS ENUM (
    'VISUAL',
    'ELECTRICAL',
    'MECHANICAL',
    'THERMAL',
    'DIMENSIONAL',
    'MATERIAL',
    'FINISH',
    'FUNCTIONAL',
    'SAFETY',
    'COMPLIANCE',
    'DOCUMENTATION',
    'PACKAGING',
    'LABELING',
    'CUSTOM'
);

-- Create criteria category enum
CREATE TYPE criteria_category AS ENUM (
    'SAFETY',
    'QUALITY',
    'PERFORMANCE',
    'RELIABILITY',
    'COMPLIANCE',
    'AESTHETIC',
    'FUNCTIONAL',
    'DURABILITY',
    'ENVIRONMENTAL',
    'CUSTOM'
);

-- Create parameter type enum
CREATE TYPE parameter_type AS ENUM (
    'NUMERIC',
    'TEXT',
    'BOOLEAN',
    'ENUM',
    'RANGE',
    'JSON',
    'DATE',
    'TIME',
    'DATETIME'
);

-- Add constraints using the new enums
ALTER TABLE station_criteria_configurations ALTER COLUMN criteria_type TYPE criteria_type USING criteria_type::criteria_type;
ALTER TABLE station_criteria_configurations ALTER COLUMN criteria_category TYPE criteria_category USING criteria_category::criteria_category;
ALTER TABLE station_criteria_configurations ALTER COLUMN parameter_type TYPE parameter_type USING parameter_type::parameter_type;

-- Create view for active criteria configurations
CREATE VIEW active_station_criteria AS
SELECT 
    scc.id,
    scc.station_id,
    s.name as station_name,
    scc.criteria_name,
    scc.criteria_description,
    scc.criteria_type,
    scc.criteria_category,
    scc.parameter_name,
    scc.parameter_type,
    scc.parameter_value,
    scc.parameter_value_numeric,
    scc.parameter_value_boolean,
    scc.parameter_value_json,
    scc.min_value,
    scc.max_value,
    scc.allowed_values,
    scc.validation_regex,
    scc.is_required,
    scc.is_critical,
    scc.unit_of_measurement,
    scc.decimal_places,
    scc.tolerance_percentage,
    scc.tolerance_absolute,
    scc.failure_threshold,
    scc.warning_threshold,
    scc.auto_fail_on_threshold,
    scc.allow_manual_override,
    scc.display_order,
    scc.is_visible,
    scc.display_name,
    scc.help_text,
    scc.tooltip_text,
    scc.version,
    scc.effective_from,
    scc.effective_to,
    scc.created_at,
    scc.updated_at,
    scc.created_by,
    scc.updated_by,
    scc.metadata,
    scc.tags
FROM station_criteria_configurations scc
JOIN stations s ON scc.station_id = s.id
WHERE scc.is_active = true
  AND (scc.effective_to IS NULL OR scc.effective_to > CURRENT_TIMESTAMP)
  AND scc.effective_from <= CURRENT_TIMESTAMP
  AND s.is_active = true
ORDER BY scc.station_id, scc.display_order, scc.criteria_name;

-- Create function to get criteria for a station
CREATE OR REPLACE FUNCTION get_station_criteria(
    p_station_id UUID
) RETURNS TABLE (
    criteria_name VARCHAR(255),
    criteria_description TEXT,
    criteria_type criteria_type,
    criteria_category criteria_category,
    parameter_name VARCHAR(255),
    parameter_type parameter_type,
    parameter_value TEXT,
    parameter_value_numeric NUMERIC,
    parameter_value_boolean BOOLEAN,
    parameter_value_json JSONB,
    min_value NUMERIC,
    max_value NUMERIC,
    allowed_values TEXT[],
    is_required BOOLEAN,
    is_critical BOOLEAN,
    unit_of_measurement VARCHAR(50),
    decimal_places INTEGER,
    tolerance_percentage NUMERIC,
    tolerance_absolute NUMERIC,
    failure_threshold INTEGER,
    warning_threshold INTEGER,
    auto_fail_on_threshold BOOLEAN,
    allow_manual_override BOOLEAN,
    display_order INTEGER,
    is_visible BOOLEAN,
    display_name VARCHAR(255),
    help_text TEXT,
    tooltip_text TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        asc.criteria_name,
        asc.criteria_description,
        asc.criteria_type,
        asc.criteria_category,
        asc.parameter_name,
        asc.parameter_type,
        asc.parameter_value,
        asc.parameter_value_numeric,
        asc.parameter_value_boolean,
        asc.parameter_value_json,
        asc.min_value,
        asc.max_value,
        asc.allowed_values,
        asc.is_required,
        asc.is_critical,
        asc.unit_of_measurement,
        asc.decimal_places,
        asc.tolerance_percentage,
        asc.tolerance_absolute,
        asc.failure_threshold,
        asc.warning_threshold,
        asc.auto_fail_on_threshold,
        asc.allow_manual_override,
        asc.display_order,
        asc.is_visible,
        asc.display_name,
        asc.help_text,
        asc.tooltip_text
    FROM active_station_criteria asc
    WHERE asc.station_id = p_station_id
    ORDER BY asc.display_order, asc.criteria_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to set criteria for a station
CREATE OR REPLACE FUNCTION set_station_criteria(
    p_station_id UUID,
    p_criteria_name VARCHAR(255),
    p_parameter_name VARCHAR(255),
    p_parameter_value TEXT,
    p_parameter_type parameter_type DEFAULT 'TEXT',
    p_criteria_type criteria_type DEFAULT 'CUSTOM',
    p_criteria_category criteria_category DEFAULT 'CUSTOM',
    p_description TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_criteria_id UUID;
    v_version INTEGER;
BEGIN
    -- Get the next version number
    SELECT COALESCE(MAX(version), 0) + 1
    INTO v_version
    FROM station_criteria_configurations
    WHERE station_id = p_station_id
      AND criteria_name = p_criteria_name
      AND parameter_name = p_parameter_name;
    
    -- Deactivate previous version
    UPDATE station_criteria_configurations
    SET is_active = false,
        effective_to = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = p_user_id
    WHERE station_id = p_station_id
      AND criteria_name = p_criteria_name
      AND parameter_name = p_parameter_name
      AND is_active = true;
    
    -- Insert new version
    INSERT INTO station_criteria_configurations (
        station_id,
        criteria_name,
        criteria_description,
        criteria_type,
        criteria_category,
        parameter_name,
        parameter_type,
        parameter_value,
        version,
        is_active,
        effective_from,
        created_by,
        updated_by
    ) VALUES (
        p_station_id,
        p_criteria_name,
        p_description,
        p_criteria_type,
        p_criteria_category,
        p_parameter_name,
        p_parameter_type,
        p_parameter_value,
        v_version,
        true,
        CURRENT_TIMESTAMP,
        p_user_id,
        p_user_id
    ) RETURNING id INTO v_criteria_id;
    
    RETURN v_criteria_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default criteria configurations for common stations
INSERT INTO station_criteria_configurations (
    station_id,
    criteria_name,
    criteria_description,
    criteria_type,
    criteria_category,
    parameter_name,
    parameter_type,
    parameter_value,
    is_required,
    is_critical,
    unit_of_measurement,
    decimal_places,
    tolerance_percentage,
    failure_threshold,
    warning_threshold,
    auto_fail_on_threshold,
    allow_manual_override,
    display_order,
    is_visible,
    display_name,
    help_text,
    version,
    is_active,
    effective_from
) 
SELECT 
    s.id as station_id,
    'Panel Dimensions' as criteria_name,
    'Check panel length and width dimensions' as criteria_description,
    'DIMENSIONAL' as criteria_type,
    'QUALITY' as criteria_category,
    'length_mm' as parameter_name,
    'NUMERIC' as parameter_type,
    '1650' as parameter_value,
    true as is_required,
    true as is_critical,
    'mm' as unit_of_measurement,
    1 as decimal_places,
    1.0 as tolerance_percentage,
    1 as failure_threshold,
    1 as warning_threshold,
    true as auto_fail_on_threshold,
    false as allow_manual_override,
    1 as display_order,
    true as is_visible,
    'Panel Length (mm)' as display_name,
    'Measure panel length in millimeters' as help_text,
    1 as version,
    true as is_active,
    CURRENT_TIMESTAMP as effective_from
FROM stations s
WHERE s.station_type = 'INSPECTION'
UNION ALL
SELECT 
    s.id as station_id,
    'Panel Dimensions' as criteria_name,
    'Check panel length and width dimensions' as criteria_description,
    'DIMENSIONAL' as criteria_type,
    'QUALITY' as criteria_category,
    'width_mm' as parameter_name,
    'NUMERIC' as parameter_type,
    '992' as parameter_value,
    true as is_required,
    true as is_critical,
    'mm' as unit_of_measurement,
    1 as decimal_places,
    1.0 as tolerance_percentage,
    1 as failure_threshold,
    1 as warning_threshold,
    true as auto_fail_on_threshold,
    false as allow_manual_override,
    2 as display_order,
    true as is_visible,
    'Panel Width (mm)' as display_name,
    'Measure panel width in millimeters' as help_text,
    1 as version,
    true as is_active,
    CURRENT_TIMESTAMP as effective_from
FROM stations s
WHERE s.station_type = 'INSPECTION'
UNION ALL
SELECT 
    s.id as station_id,
    'Visual Inspection' as criteria_name,
    'Check for visual defects and damage' as criteria_description,
    'VISUAL' as criteria_type,
    'QUALITY' as criteria_category,
    'has_defects' as parameter_name,
    'BOOLEAN' as parameter_type,
    'false' as parameter_value,
    true as is_required,
    true as is_critical,
    NULL as unit_of_measurement,
    0 as decimal_places,
    0 as tolerance_percentage,
    1 as failure_threshold,
    1 as warning_threshold,
    true as auto_fail_on_threshold,
    true as allow_manual_override,
    3 as display_order,
    true as is_visible,
    'Has Visual Defects' as display_name,
    'Check for scratches, cracks, or other visual defects' as help_text,
    1 as version,
    true as is_active,
    CURRENT_TIMESTAMP as effective_from
FROM stations s
WHERE s.station_type = 'INSPECTION';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON station_criteria_configurations TO solar_panel_user;
GRANT SELECT ON active_station_criteria TO solar_panel_user;
GRANT EXECUTE ON FUNCTION get_station_criteria TO solar_panel_user;
GRANT EXECUTE ON FUNCTION set_station_criteria TO solar_panel_user;

-- Migration notes:
-- - This creates a comprehensive station criteria configuration system
-- - Supports multiple parameter types (numeric, text, boolean, enum, etc.)
-- - Includes validation and tolerance settings
-- - Provides versioning and effective date management
-- - Includes helper functions for easy criteria management
-- - Supports UI display settings and help text
-- - Includes default criteria for common inspection stations

-- Rollback instructions:
/*
-- To rollback this migration:
DROP FUNCTION IF EXISTS set_station_criteria;
DROP FUNCTION IF EXISTS get_station_criteria;
DROP VIEW IF EXISTS active_station_criteria;
DROP TABLE IF EXISTS station_criteria_configurations;
DROP TYPE IF EXISTS criteria_type;
DROP TYPE IF EXISTS criteria_category;
DROP TYPE IF EXISTS parameter_type;
*/
