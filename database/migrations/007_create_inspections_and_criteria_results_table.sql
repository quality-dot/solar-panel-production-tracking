-- Migration 007: Create inspections and criteria results table
-- Solar Panel Production Tracking System
-- Created: 2025-08-19

-- This migration implements: Comprehensive inspection tracking system with detailed 
-- pass/fail criteria results for quality control at each production station.

-- Create inspections table for tracking quality control results
CREATE TABLE inspections (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relationships
    panel_id UUID NOT NULL,              -- FK to panels
    station_id INTEGER NOT NULL,         -- FK to stations
    inspector_id UUID NOT NULL,          -- FK to users (who performed inspection)
    
    -- Inspection context
    inspection_type inspection_type NOT NULL DEFAULT 'NORMAL',
    inspection_sequence INTEGER DEFAULT 1, -- For rework tracking (1st, 2nd attempt, etc.)
    
    -- Overall result
    overall_result BOOLEAN NOT NULL,     -- TRUE = Pass, FALSE = Fail
    
    -- Detailed criteria results (JSONB for flexibility)
    criteria_results JSONB NOT NULL,     -- Station-specific pass/fail criteria
    
    -- Electrical measurements (for Station 4 only)
    wattage_pmax DECIMAL(8,3),          -- Peak power (Watts) - manual entry at Station 4
    vmp DECIMAL(6,2),                   -- Voltage at maximum power (Volts)
    imp DECIMAL(6,2),                   -- Current at maximum power (Amps)
    high_pot_test_result BOOLEAN,       -- High pot test result (Station 4)
    
    -- Quality notes and feedback
    notes TEXT,                         -- Inspector notes
    failure_reason TEXT,                -- Specific failure reason if overall_result = FALSE
    cosmetic_defects TEXT[],            -- Array of cosmetic defect descriptions
    
    -- Performance tracking
    inspection_duration_seconds INTEGER, -- Time spent on inspection
    barcode_scan_time TIMESTAMP,        -- When barcode was scanned
    inspection_started_at TIMESTAMP,    -- When inspection actually started
    inspection_completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- When inspection finished
    
    -- Rework tracking
    is_rework BOOLEAN DEFAULT FALSE,     -- TRUE if this is a rework inspection
    original_failure_station_id INTEGER, -- Station where original failure occurred
    rework_notes TEXT,                  -- Notes specific to rework
    
    -- Next action determination
    next_station_id INTEGER,            -- Where panel should go next (NULL if complete)
    requires_rework BOOLEAN DEFAULT FALSE, -- TRUE if panel needs rework
    rework_station_id INTEGER,          -- Specific station for rework (if applicable)
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Data integrity
    data_version INTEGER DEFAULT 1      -- For handling data structure changes
);

-- Create indexes for performance optimization

-- Primary lookup indexes
CREATE INDEX idx_inspections_panel_id ON inspections(panel_id);
CREATE INDEX idx_inspections_station_id ON inspections(station_id);
CREATE INDEX idx_inspections_inspector_id ON inspections(inspector_id);
CREATE INDEX idx_inspections_inspection_type ON inspections(inspection_type);
CREATE INDEX idx_inspections_overall_result ON inspections(overall_result);
CREATE INDEX idx_inspections_created_at ON inspections(created_at);
CREATE INDEX idx_inspections_inspection_completed_at ON inspections(inspection_completed_at);

-- Composite indexes for common query patterns
CREATE INDEX idx_inspections_panel_station ON inspections(panel_id, station_id);
CREATE INDEX idx_inspections_station_result ON inspections(station_id, overall_result);
CREATE INDEX idx_inspections_inspector_date ON inspections(inspector_id, DATE(created_at));
CREATE INDEX idx_inspections_panel_sequence ON inspections(panel_id, inspection_sequence);
CREATE INDEX idx_inspections_rework_tracking ON inspections(is_rework, original_failure_station_id) 
    WHERE is_rework = TRUE;

-- Time-based indexes for reporting
CREATE INDEX idx_inspections_date_station ON inspections(DATE(created_at), station_id);
CREATE INDEX idx_inspections_shift_tracking ON inspections(DATE(created_at), EXTRACT(hour FROM created_at), station_id);

-- JSONB indexes for criteria results queries
CREATE INDEX idx_inspections_criteria_results ON inspections USING gin(criteria_results);

-- Add foreign key constraints
ALTER TABLE inspections ADD CONSTRAINT fk_inspections_panel_id 
    FOREIGN KEY (panel_id) REFERENCES panels(id) 
    ON DELETE CASCADE;

ALTER TABLE inspections ADD CONSTRAINT fk_inspections_station_id 
    FOREIGN KEY (station_id) REFERENCES stations(id) 
    ON DELETE RESTRICT;

ALTER TABLE inspections ADD CONSTRAINT fk_inspections_inspector_id 
    FOREIGN KEY (inspector_id) REFERENCES users(id) 
    ON DELETE RESTRICT;

ALTER TABLE inspections ADD CONSTRAINT fk_inspections_next_station_id 
    FOREIGN KEY (next_station_id) REFERENCES stations(id) 
    ON DELETE SET NULL;

ALTER TABLE inspections ADD CONSTRAINT fk_inspections_rework_station_id 
    FOREIGN KEY (rework_station_id) REFERENCES stations(id) 
    ON DELETE SET NULL;

ALTER TABLE inspections ADD CONSTRAINT fk_inspections_original_failure_station_id 
    FOREIGN KEY (original_failure_station_id) REFERENCES stations(id) 
    ON DELETE SET NULL;

-- Add validation constraints
ALTER TABLE inspections ADD CONSTRAINT check_inspection_sequence_positive 
    CHECK (inspection_sequence > 0);

ALTER TABLE inspections ADD CONSTRAINT check_electrical_measurements_positive 
    CHECK (
        (wattage_pmax IS NULL OR wattage_pmax > 0) AND
        (vmp IS NULL OR vmp > 0) AND
        (imp IS NULL OR imp > 0)
    );

ALTER TABLE inspections ADD CONSTRAINT check_inspection_duration_positive 
    CHECK (inspection_duration_seconds IS NULL OR inspection_duration_seconds > 0);

ALTER TABLE inspections ADD CONSTRAINT check_rework_logic 
    CHECK (
        (is_rework = FALSE AND original_failure_station_id IS NULL) OR
        (is_rework = TRUE AND original_failure_station_id IS NOT NULL)
    );

ALTER TABLE inspections ADD CONSTRAINT check_failure_requires_reason 
    CHECK (
        (overall_result = TRUE) OR 
        (overall_result = FALSE AND (failure_reason IS NOT NULL OR array_length(cosmetic_defects, 1) > 0))
    );

ALTER TABLE inspections ADD CONSTRAINT check_timestamp_logic 
    CHECK (
        (barcode_scan_time IS NULL OR inspection_started_at IS NULL OR barcode_scan_time <= inspection_started_at) AND
        (inspection_started_at IS NULL OR inspection_completed_at IS NULL OR inspection_started_at <= inspection_completed_at)
    );

-- Create automatic timestamp update trigger
CREATE TRIGGER update_inspections_updated_at 
    BEFORE UPDATE ON inspections 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to validate station-specific criteria format
CREATE OR REPLACE FUNCTION validate_criteria_results_format()
RETURNS TRIGGER AS $$
DECLARE
    station_info RECORD;
    required_criteria TEXT[];
    provided_criteria TEXT[];
    missing_criteria TEXT[];
BEGIN
    -- Get station information to determine required criteria
    SELECT station_type, line INTO station_info
    FROM stations 
    WHERE id = NEW.station_id;
    
    -- Define required criteria based on station type
    CASE station_info.station_type
        WHEN 'ASSEMBLY_EL' THEN
            required_criteria := ARRAY['solder_joints', 'string_spacing', 'polarity', 'nubs_trimmed', 'insulation'];
            -- Add mirror_examination only for LINE_1
            IF station_info.line = 'LINE_1' THEN
                required_criteria := required_criteria || ARRAY['mirror_examination'];
            END IF;
            
        WHEN 'FRAMING' THEN
            required_criteria := ARRAY['panel_trimmed', 'panel_cleaned', 'barcode_verified', 'no_visible_flaws'];
            
        WHEN 'JUNCTION_BOX' THEN
            required_criteria := ARRAY['potting_gel_applied', 'jbox_soldered', 'jbox_capped', 'el_tested', 'barcode_verified', 'eva_backsheet_alignment'];
            
        WHEN 'PERFORMANCE_FINAL' THEN
            required_criteria := ARRAY['wattage_verification', 'high_pot_test', 'sticker_applied', 'labeling_verification', 'cell_integrity', 'frame_inspection', 'frame_continuity', 'glass_clean', 'line_ribbon_spacing', 'busbar_insulation', 'jbox_inspection', 'lamination_backsheet'];
            -- Add second_el_test only for LINE_2
            IF station_info.line = 'LINE_2' THEN
                required_criteria := required_criteria || ARRAY['second_el_test'];
            END IF;
    END CASE;
    
    -- Get criteria keys from JSONB
    SELECT ARRAY(SELECT jsonb_object_keys(NEW.criteria_results)) INTO provided_criteria;
    
    -- Check for missing required criteria
    SELECT ARRAY(
        SELECT unnest(required_criteria) 
        EXCEPT 
        SELECT unnest(provided_criteria)
    ) INTO missing_criteria;
    
    -- Raise exception if required criteria are missing
    IF array_length(missing_criteria, 1) > 0 THEN
        RAISE EXCEPTION 'Missing required criteria for station %: %', 
            station_info.station_type, array_to_string(missing_criteria, ', ');
    END IF;
    
    -- Validate that all criteria values are boolean
    IF NOT (
        SELECT bool_and(jsonb_typeof(value) = 'boolean')
        FROM jsonb_each(NEW.criteria_results)
    ) THEN
        RAISE EXCEPTION 'All criteria results must be boolean (true/false)';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate criteria results format
CREATE TRIGGER trigger_validate_criteria_results_format
    BEFORE INSERT OR UPDATE OF criteria_results ON inspections
    FOR EACH ROW
    EXECUTE FUNCTION validate_criteria_results_format();

-- Function to update panel status based on inspection result
CREATE OR REPLACE FUNCTION update_panel_status_from_inspection()
RETURNS TRIGGER AS $$
DECLARE
    panel_info RECORD;
    next_station_info RECORD;
BEGIN
    -- Get current panel information
    SELECT status, current_station_id INTO panel_info
    FROM panels 
    WHERE id = NEW.panel_id;
    
    -- Update panel based on inspection result
    IF NEW.overall_result = TRUE THEN
        -- Inspection passed
        IF NEW.next_station_id IS NOT NULL THEN
            -- Move to next station
            UPDATE panels 
            SET 
                current_station_id = NEW.next_station_id,
                status = 'IN_PROGRESS',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.panel_id;
        ELSE
            -- Panel completed all stations
            UPDATE panels 
            SET 
                current_station_id = NULL,
                status = 'COMPLETED',
                completed_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP,
                -- Update electrical measurements if this is Station 4
                wattage_pmax = COALESCE(NEW.wattage_pmax, wattage_pmax),
                vmp = COALESCE(NEW.vmp, vmp),
                imp = COALESCE(NEW.imp, imp)
            WHERE id = NEW.panel_id;
        END IF;
    ELSE
        -- Inspection failed
        IF NEW.requires_rework THEN
            -- Send to rework
            UPDATE panels 
            SET 
                status = 'REWORK',
                rework_count = rework_count + 1,
                rework_reason = NEW.failure_reason,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.panel_id;
        ELSE
            -- Mark as failed
            UPDATE panels 
            SET 
                status = 'FAILED',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.panel_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update panel status based on inspection result
CREATE TRIGGER trigger_update_panel_status_from_inspection
    AFTER INSERT ON inspections
    FOR EACH ROW
    EXECUTE FUNCTION update_panel_status_from_inspection();

-- Function to get station-specific criteria template
CREATE OR REPLACE FUNCTION get_station_criteria_template(station_id_input INTEGER)
RETURNS JSONB AS $$
DECLARE
    station_info RECORD;
    criteria_template JSONB;
BEGIN
    -- Get station information
    SELECT station_type, line INTO station_info
    FROM stations 
    WHERE id = station_id_input;
    
    -- Build criteria template based on station type
    CASE station_info.station_type
        WHEN 'ASSEMBLY_EL' THEN
            criteria_template := jsonb_build_object(
                'solder_joints', false,
                'string_spacing', false,
                'polarity', false,
                'nubs_trimmed', false,
                'insulation', false
            );
            -- Add mirror_examination for LINE_1
            IF station_info.line = 'LINE_1' THEN
                criteria_template := criteria_template || jsonb_build_object('mirror_examination', false);
            END IF;
            
        WHEN 'FRAMING' THEN
            criteria_template := jsonb_build_object(
                'panel_trimmed', false,
                'panel_cleaned', false,
                'barcode_verified', false,
                'no_visible_flaws', false
            );
            
        WHEN 'JUNCTION_BOX' THEN
            criteria_template := jsonb_build_object(
                'potting_gel_applied', false,
                'jbox_soldered', false,
                'jbox_capped', false,
                'el_tested', false,
                'barcode_verified', false,
                'eva_backsheet_alignment', false
            );
            
        WHEN 'PERFORMANCE_FINAL' THEN
            criteria_template := jsonb_build_object(
                'wattage_verification', false,
                'high_pot_test', false,
                'sticker_applied', false,
                'labeling_verification', false,
                'cell_integrity', false,
                'frame_inspection', false,
                'frame_continuity', false,
                'glass_clean', false,
                'line_ribbon_spacing', false,
                'busbar_insulation', false,
                'jbox_inspection', false,
                'lamination_backsheet', false
            );
            -- Add second_el_test for LINE_2
            IF station_info.line = 'LINE_2' THEN
                criteria_template := criteria_template || jsonb_build_object('second_el_test', false);
            END IF;
            
        ELSE
            criteria_template := '{}'::jsonb;
    END CASE;
    
    RETURN criteria_template;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE inspections IS 'Quality control inspection results for panels at each production station';
COMMENT ON COLUMN inspections.id IS 'Unique identifier for the inspection';
COMMENT ON COLUMN inspections.panel_id IS 'Panel being inspected';
COMMENT ON COLUMN inspections.station_id IS 'Station where inspection was performed';
COMMENT ON COLUMN inspections.inspector_id IS 'User who performed the inspection';
COMMENT ON COLUMN inspections.inspection_type IS 'Type of inspection (NORMAL, REWORK, FINAL, AUDIT)';
COMMENT ON COLUMN inspections.overall_result IS 'Overall pass/fail result (TRUE = Pass, FALSE = Fail)';
COMMENT ON COLUMN inspections.criteria_results IS 'JSONB object with station-specific pass/fail criteria results';
COMMENT ON COLUMN inspections.wattage_pmax IS 'Peak power measurement (Station 4 only)';
COMMENT ON COLUMN inspections.failure_reason IS 'Specific reason for failure if overall_result = FALSE';
COMMENT ON COLUMN inspections.is_rework IS 'TRUE if this is a rework inspection';
COMMENT ON COLUMN inspections.requires_rework IS 'TRUE if panel needs to be sent for rework';
COMMENT ON COLUMN inspections.next_station_id IS 'Next station for panel to proceed to (NULL if complete)';

-- Migration notes:
-- - Criteria results are stored in JSONB format for flexibility
-- - Station-specific criteria are validated based on station type and line
-- - Electrical measurements are only captured at Station 4 (Performance & Final)
-- - Panel status is automatically updated based on inspection results
-- - Rework flow is supported with tracking of original failure points
-- - Line-specific criteria (mirror_examination for Line 1, second_el_test for Line 2)

-- Rollback instructions (for manual rollback if needed):
/*
-- To rollback this migration:
DROP TRIGGER IF EXISTS trigger_update_panel_status_from_inspection ON inspections;
DROP TRIGGER IF EXISTS trigger_validate_criteria_results_format ON inspections;
DROP TRIGGER IF EXISTS update_inspections_updated_at ON inspections;
DROP FUNCTION IF EXISTS update_panel_status_from_inspection();
DROP FUNCTION IF EXISTS validate_criteria_results_format();
DROP FUNCTION IF EXISTS get_station_criteria_template(INTEGER);
DROP TABLE IF EXISTS inspections;
*/
