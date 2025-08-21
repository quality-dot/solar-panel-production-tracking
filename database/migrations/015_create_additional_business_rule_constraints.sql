-- Migration 015: Create Additional Business Rule Constraints
-- Solar Panel Production Tracking System
-- Task 13.28: Additional Business Rule Constraints
-- Created: 2025-01-27

-- This migration adds manufacturing-specific business rule constraints
-- that enforce workflow validation, station progression, and business logic
-- as specified in the PRD.

-- ============================================================================
-- PANEL WORKFLOW VALIDATION CONSTRAINTS
-- ============================================================================

-- Constraint to ensure proper panel workflow progression
-- Panels must follow the correct station sequence: 1 -> 2 -> 3 -> 4
ALTER TABLE panels ADD CONSTRAINT check_workflow_progression
CHECK (
    (status = 'PENDING' AND current_station_id IS NULL) OR
    (status = 'IN_PROGRESS' AND current_station_id IS NOT NULL) OR
    (status = 'COMPLETED' AND current_station_id IS NOT NULL AND 
     station_1_completed_at IS NOT NULL AND
     station_2_completed_at IS NOT NULL AND
     station_3_completed_at IS NOT NULL AND
     station_4_completed_at IS NOT NULL) OR
    (status = 'FAILED' AND current_station_id IS NOT NULL) OR
    (status = 'REWORK' AND current_station_id IS NOT NULL)
);

-- Constraint to ensure station completion follows proper sequence
ALTER TABLE panels ADD CONSTRAINT check_station_completion_sequence
CHECK (
    (station_1_completed_at IS NULL) OR
    (station_1_completed_at IS NOT NULL AND 
     (station_2_completed_at IS NULL OR station_2_completed_at >= station_1_completed_at)) OR
    (station_2_completed_at IS NOT NULL AND 
     (station_3_completed_at IS NULL OR station_3_completed_at >= station_2_completed_at)) OR
    (station_3_completed_at IS NOT NULL AND 
     (station_4_completed_at IS NULL OR station_4_completed_at >= station_3_completed_at))
);

-- Constraint to ensure panel type matches line assignment
-- Line 1: Panel types 36, 40, 60, 72
-- Line 2: Panel type 144
ALTER TABLE panels ADD CONSTRAINT check_panel_type_line_assignment
CHECK (
    (line_assignment = 'LINE_1' AND panel_type IN ('36', '40', '60', '72')) OR
    (line_assignment = 'LINE_2' AND panel_type = '144')
);

-- Constraint to ensure barcode format compliance
-- Format: CRSYYFBPP#####
-- CRS: Crossroads Solar, YY: Year, F: Frame, B: Backsheet, PP: Panel type, #####: Sequential
ALTER TABLE panels ADD CONSTRAINT check_barcode_format_compliance
CHECK (
    barcode ~ '^CRS[0-9]{2}[WB][TWB](36|40|60|72|144)[0-9]{5}$'
);

-- Constraint to ensure barcode length is exactly 13 characters
ALTER TABLE panels ADD CONSTRAINT check_barcode_length
CHECK (char_length(barcode) = 13);

-- ============================================================================
-- STATION PROGRESSION RULES
-- ============================================================================

-- Constraint to ensure inspections follow proper station sequence
-- Station 1 -> Station 2 -> Station 3 -> Station 4
ALTER TABLE inspections ADD CONSTRAINT check_station_progression
CHECK (
    (station_id = 1) OR
    (station_id = 2 AND EXISTS (
        SELECT 1 FROM inspections i2 
        WHERE i2.panel_id = panel_id AND i2.station_id = 1 AND i2.result = 'PASS'
    )) OR
    (station_id = 3 AND EXISTS (
        SELECT 1 FROM inspections i2 
        WHERE i2.panel_id = panel_id AND i2.station_id = 2 AND i2.result = 'PASS'
    )) OR
    (station_id = 4 AND EXISTS (
        SELECT 1 FROM inspections i2 
        WHERE i2.panel_id = panel_id AND i2.station_id = 3 AND i2.result = 'PASS'
    ))
);

-- Constraint to prevent duplicate station inspections for the same panel
-- Each panel can only be inspected once per station
ALTER TABLE inspections ADD CONSTRAINT unique_panel_station_inspection
UNIQUE (panel_id, station_id);

-- Constraint to ensure inspection results are valid
ALTER TABLE inspections ADD CONSTRAINT check_inspection_result_valid
CHECK (result IN ('PASS', 'FAIL', 'COSMETIC_DEFECT', 'REWORK'));

-- Constraint to ensure failed inspections have notes
ALTER TABLE inspections ADD CONSTRAINT check_failed_inspection_notes
CHECK (
    (result IN ('PASS', 'COSMETIC_DEFECT')) OR
    (result IN ('FAIL', 'REWORK') AND notes IS NOT NULL AND trim(notes) != '')
);

-- ============================================================================
-- MANUFACTURING ORDER COMPLETION LOGIC
-- ============================================================================

-- Constraint to ensure MO quantity is reasonable for manufacturing
ALTER TABLE manufacturing_orders ADD CONSTRAINT check_mo_quantity_reasonable
CHECK (
    quantity >= 1 AND quantity <= 10000
);

-- Constraint to ensure MO dates are logical
ALTER TABLE manufacturing_orders ADD CONSTRAINT check_mo_dates_logical
CHECK (
    start_date <= end_date AND
    start_date >= CURRENT_DATE - INTERVAL '1 year' AND
    end_date <= CURRENT_DATE + INTERVAL '2 years'
);

-- Constraint to ensure MO status transitions are valid
ALTER TABLE manufacturing_orders ADD CONSTRAINT check_mo_status_transition
CHECK (
    status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD')
);

-- Constraint to ensure completed MOs have all panels completed
-- This is enforced by trigger, but constraint provides additional validation
ALTER TABLE manufacturing_orders ADD CONSTRAINT check_mo_completion_consistency
CHECK (
    (status != 'COMPLETED') OR
    (status = 'COMPLETED' AND panels_completed = quantity)
);

-- ============================================================================
-- PALLET MANAGEMENT CONSTRAINTS
-- ============================================================================

-- Constraint to ensure pallet capacity is reasonable
ALTER TABLE pallets ADD CONSTRAINT check_pallet_capacity_reasonable
CHECK (
    capacity >= 1 AND capacity <= 100
);

-- Constraint to ensure pallet assignments don't exceed capacity
ALTER TABLE pallets ADD CONSTRAINT check_pallet_assignment_capacity
CHECK (
    panels_assigned <= capacity
);

-- Constraint to ensure pallet positions are within bounds
ALTER TABLE pallet_assignments ADD CONSTRAINT check_pallet_position_bounds
CHECK (
    position_x >= 0 AND position_x < 20 AND
    position_y >= 0 AND position_y < 20
);

-- Constraint to ensure pallet assignments are unique
ALTER TABLE pallet_assignments ADD CONSTRAINT unique_pallet_position
UNIQUE (pallet_id, position_x, position_y);

-- ============================================================================
-- QUALITY CONTROL CONSTRAINTS
-- ============================================================================

-- Constraint to ensure rework panels have proper routing
ALTER TABLE panels ADD CONSTRAINT check_rework_routing
CHECK (
    (status != 'REWORK') OR
    (status = 'REWORK' AND rework_reason IS NOT NULL AND trim(rework_reason) != '')
);

-- Constraint to ensure failed panels have proper documentation
ALTER TABLE panels ADD CONSTRAINT check_failed_panel_documentation
CHECK (
    (status != 'FAILED') OR
    (status = 'FAILED' AND quality_notes IS NOT NULL AND trim(quality_notes) != '')
);

-- Constraint to ensure cosmetic defect panels have notes
ALTER TABLE panels ADD CONSTRAINT check_cosmetic_defect_notes
CHECK (
    (status != 'COSMETIC_DEFECT') OR
    (status = 'COSMETIC_DEFECT' AND quality_notes IS NOT NULL AND trim(quality_notes) != '')
);

-- ============================================================================
-- ELECTRICAL DATA VALIDATION CONSTRAINTS
-- ============================================================================

-- Constraint to ensure electrical data is valid when available
ALTER TABLE panels ADD CONSTRAINT check_electrical_data_validity
CHECK (
    (wattage_pmax IS NULL) OR
    (wattage_pmax IS NOT NULL AND wattage_pmax > 0 AND wattage_pmax <= 1000)
);

ALTER TABLE panels ADD CONSTRAINT check_voltage_data_validity
CHECK (
    (vmp IS NULL) OR
    (vmp IS NOT NULL AND vmp > 0 AND vmp <= 100)
);

ALTER TABLE panels ADD CONSTRAINT check_current_data_validity
CHECK (
    (imp IS NULL) OR
    (imp IS NOT NULL AND imp > 0 AND imp <= 20)
);

-- Constraint to ensure electrical data is complete for completed panels
ALTER TABLE panels ADD CONSTRAINT check_completed_panel_electrical_data
CHECK (
    (status != 'COMPLETED') OR
    (status = 'COMPLETED' AND 
     wattage_pmax IS NOT NULL AND 
     vmp IS NOT NULL AND 
     imp IS NOT NULL)
);

-- ============================================================================
-- USER ROLE AND PERMISSION CONSTRAINTS
-- ============================================================================

-- Constraint to ensure user roles are valid
ALTER TABLE users ADD CONSTRAINT check_user_role_valid
CHECK (
    role IN ('STATION_INSPECTOR', 'PRODUCTION_SUPERVISOR', 'QUALITY_CONTROL_MANAGER', 'SYSTEM_ADMINISTRATOR')
);

-- Constraint to ensure station inspectors are assigned to valid stations
ALTER TABLE users ADD CONSTRAINT check_inspector_station_assignment
CHECK (
    (role != 'STATION_INSPECTOR') OR
    (role = 'STATION_INSPECTOR' AND assigned_station_id IS NOT NULL)
);

-- Constraint to ensure users have valid email format
ALTER TABLE users ADD CONSTRAINT check_email_format
CHECK (
    email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
);

-- ============================================================================
-- STATION CONFIGURATION CONSTRAINTS
-- ============================================================================

-- Constraint to ensure station numbers are valid
ALTER TABLE stations ADD CONSTRAINT check_station_number_valid
CHECK (
    station_number >= 1 AND station_number <= 8
);

-- Constraint to ensure station types are valid
ALTER TABLE stations ADD CONSTRAINT check_station_type_valid
CHECK (
    station_type IN ('ASSEMBLY_EL', 'FRAMING', 'JUNCTION_BOX', 'PERFORMANCE_FINAL')
);

-- Constraint to ensure line assignments are valid
ALTER TABLE stations ADD CONSTRAINT check_station_line_assignment
CHECK (
    line IN ('LINE_1', 'LINE_2')
);

-- Constraint to ensure station criteria configurations are valid
ALTER TABLE station_criteria_configurations ADD CONSTRAINT check_criteria_type_valid
CHECK (
    criteria_type IN ('PASS_FAIL', 'NUMERIC', 'TEXT', 'N_A')
);

-- ============================================================================
-- BUSINESS RULE TRIGGERS
-- ============================================================================

-- Trigger to enforce panel completion requirements
CREATE OR REPLACE FUNCTION enforce_panel_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure all stations are completed before marking panel as completed
    IF NEW.status = 'COMPLETED' THEN
        IF NEW.station_1_completed_at IS NULL OR
           NEW.station_2_completed_at IS NULL OR
           NEW.station_3_completed_at IS NULL OR
           NEW.station_4_completed_at IS NULL THEN
            RAISE EXCEPTION 'Panel cannot be marked as completed until all stations are completed';
        END IF;
        
        -- Ensure electrical data is present for completed panels
        IF NEW.wattage_pmax IS NULL OR NEW.vmp IS NULL OR NEW.imp IS NULL THEN
            RAISE EXCEPTION 'Panel cannot be marked as completed without electrical data';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_enforce_panel_completion
    BEFORE UPDATE ON panels
    FOR EACH ROW
    EXECUTE FUNCTION enforce_panel_completion();

-- Trigger to enforce manufacturing order completion
CREATE OR REPLACE FUNCTION enforce_mo_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-complete MO when all panels are completed
    IF NEW.panels_completed = NEW.quantity AND NEW.status = 'IN_PROGRESS' THEN
        NEW.status := 'COMPLETED';
        NEW.completed_at := CURRENT_TIMESTAMP;
    END IF;
    
    -- Prevent MO completion if panels are still in progress
    IF NEW.status = 'COMPLETED' AND NEW.panels_completed < NEW.quantity THEN
        RAISE EXCEPTION 'Manufacturing order cannot be completed until all panels are finished';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_enforce_mo_completion
    BEFORE UPDATE ON manufacturing_orders
    FOR EACH ROW
    EXECUTE FUNCTION enforce_mo_completion();

-- Trigger to enforce pallet completion
CREATE OR REPLACE FUNCTION enforce_pallet_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-complete pallet when capacity is reached
    IF NEW.panels_assigned = NEW.capacity AND NEW.status = 'IN_PROGRESS' THEN
        NEW.status := 'COMPLETED';
        NEW.completed_at := CURRENT_TIMESTAMP;
    END IF;
    
    -- Prevent pallet completion if not at capacity
    IF NEW.status = 'COMPLETED' AND NEW.panels_assigned < NEW.capacity THEN
        RAISE EXCEPTION 'Pallet cannot be completed until capacity is reached';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_enforce_pallet_completion
    BEFORE UPDATE ON pallets
    FOR EACH ROW
    EXECUTE FUNCTION enforce_pallet_completion();

-- ============================================================================
-- ROLLBACK PROCEDURES
-- ============================================================================

/*
-- To rollback this migration (in reverse order):

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_enforce_pallet_completion ON pallets;
DROP TRIGGER IF EXISTS trigger_enforce_mo_completion ON manufacturing_orders;
DROP TRIGGER IF EXISTS trigger_enforce_panel_completion ON panels;

-- Drop trigger functions
DROP FUNCTION IF EXISTS enforce_pallet_completion();
DROP FUNCTION IF EXISTS enforce_mo_completion();
DROP FUNCTION IF EXISTS enforce_panel_completion();

-- Drop business rule constraints
ALTER TABLE station_criteria_configurations DROP CONSTRAINT IF EXISTS check_criteria_type_valid;
ALTER TABLE stations DROP CONSTRAINT IF EXISTS check_station_line_assignment;
ALTER TABLE stations DROP CONSTRAINT IF EXISTS check_station_type_valid;
ALTER TABLE stations DROP CONSTRAINT IF EXISTS check_station_number_valid;
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_email_format;
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_inspector_station_assignment;
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_user_role_valid;
ALTER TABLE panels DROP CONSTRAINT IF EXISTS check_completed_panel_electrical_data;
ALTER TABLE panels DROP CONSTRAINT IF EXISTS check_current_data_validity;
ALTER TABLE panels DROP CONSTRAINT IF EXISTS check_voltage_data_validity;
ALTER TABLE panels DROP CONSTRAINT IF EXISTS check_electrical_data_validity;
ALTER TABLE panels DROP CONSTRAINT IF EXISTS check_cosmetic_defect_notes;
ALTER TABLE panels DROP CONSTRAINT IF EXISTS check_failed_panel_documentation;
ALTER TABLE panels DROP CONSTRAINT IF EXISTS check_rework_routing;
ALTER TABLE pallet_assignments DROP CONSTRAINT IF EXISTS unique_pallet_position;
ALTER TABLE pallet_assignments DROP CONSTRAINT IF EXISTS check_pallet_position_bounds;
ALTER TABLE pallets DROP CONSTRAINT IF EXISTS check_pallet_assignment_capacity;
ALTER TABLE pallets DROP CONSTRAINT IF EXISTS check_pallet_capacity_reasonable;
ALTER TABLE manufacturing_orders DROP CONSTRAINT IF EXISTS check_mo_completion_consistency;
ALTER TABLE manufacturing_orders DROP CONSTRAINT IF EXISTS check_mo_status_transition;
ALTER TABLE manufacturing_orders DROP CONSTRAINT IF EXISTS check_mo_dates_logical;
ALTER TABLE manufacturing_orders DROP CONSTRAINT IF EXISTS check_mo_quantity_reasonable;
ALTER TABLE inspections DROP CONSTRAINT IF EXISTS check_failed_inspection_notes;
ALTER TABLE inspections DROP CONSTRAINT IF EXISTS check_inspection_result_valid;
ALTER TABLE inspections DROP CONSTRAINT IF EXISTS unique_panel_station_inspection;
ALTER TABLE inspections DROP CONSTRAINT IF EXISTS check_station_progression;
ALTER TABLE panels DROP CONSTRAINT IF EXISTS check_barcode_length;
ALTER TABLE panels DROP CONSTRAINT IF EXISTS check_barcode_format_compliance;
ALTER TABLE panels DROP CONSTRAINT IF EXISTS check_panel_type_line_assignment;
ALTER TABLE panels DROP CONSTRAINT IF EXISTS check_station_completion_sequence;
ALTER TABLE panels DROP CONSTRAINT IF EXISTS check_workflow_progression;
*/
