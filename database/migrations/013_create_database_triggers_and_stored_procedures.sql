-- Migration 013: Create Database Triggers and Stored Procedures
-- Solar Panel Production Tracking System
-- Created: 2025-08-20

-- This migration adds comprehensive database triggers and stored procedures
-- to automate business logic and maintain data integrity in the solar panel tracking system.

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to generate unique barcodes
CREATE OR REPLACE FUNCTION generate_unique_barcode(p_prefix VARCHAR(10) DEFAULT 'PANEL')
RETURNS VARCHAR(50) AS $$
DECLARE
    v_barcode VARCHAR(50);
    v_counter INTEGER := 1;
    v_max_attempts INTEGER := 100;
BEGIN
    LOOP
        -- Generate barcode with prefix, timestamp, and random component
        v_barcode := p_prefix || '_' || 
                     TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD_HH24MISS') || '_' ||
                     LPAD(FLOOR(RANDOM() * 9999)::TEXT, 4, '0');
        
        -- Check if barcode already exists in panels table
        IF NOT EXISTS (SELECT 1 FROM panels WHERE barcode = v_barcode) THEN
            RETURN v_barcode;
        END IF;
        
        v_counter := v_counter + 1;
        IF v_counter > v_max_attempts THEN
            RAISE EXCEPTION 'Unable to generate unique barcode after % attempts', v_max_attempts;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate pallet barcode
CREATE OR REPLACE FUNCTION generate_pallet_barcode(p_manufacturing_order_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    v_barcode VARCHAR(50);
    v_mo_number VARCHAR(50);
    v_pallet_count INTEGER;
BEGIN
    -- Get manufacturing order number
    SELECT order_number INTO v_mo_number 
    FROM manufacturing_orders 
    WHERE id = p_manufacturing_order_id;
    
    -- Count existing pallets for this manufacturing order
    SELECT COALESCE(COUNT(*), 0) + 1 INTO v_pallet_count
    FROM pallets 
    WHERE manufacturing_order_id = p_manufacturing_order_id;
    
    -- Generate pallet barcode
    v_barcode := 'PALLET_' || v_mo_number || '_' || LPAD(v_pallet_count::TEXT, 3, '0');
    
    RETURN v_barcode;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate panel efficiency
CREATE OR REPLACE FUNCTION calculate_panel_efficiency(p_power_watts NUMERIC, p_length_mm NUMERIC, p_width_mm NUMERIC)
RETURNS NUMERIC AS $$
DECLARE
    v_area_sqm NUMERIC;
    v_efficiency NUMERIC;
BEGIN
    -- Calculate area in square meters
    v_area_sqm := (p_length_mm * p_width_mm) / 1000000;
    
    -- Calculate efficiency (W/m²)
    v_efficiency := p_power_watts / v_area_sqm;
    
    RETURN ROUND(v_efficiency, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate inspection criteria
CREATE OR REPLACE FUNCTION validate_inspection_criteria(
    p_station_id UUID,
    p_criteria_name VARCHAR(255),
    p_parameter_name VARCHAR(255),
    p_parameter_value TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_criteria RECORD;
    v_is_valid BOOLEAN := true;
    v_numeric_value NUMERIC;
BEGIN
    -- Get criteria configuration
    SELECT * INTO v_criteria
    FROM station_criteria_configurations
    WHERE station_id = p_station_id
      AND criteria_name = p_criteria_name
      AND parameter_name = p_parameter_name
      AND is_active = true
    ORDER BY version DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN true; -- No criteria defined, assume valid
    END IF;
    
    -- Check if required
    IF v_criteria.is_required AND (p_parameter_value IS NULL OR p_parameter_value = '') THEN
        RETURN false;
    END IF;
    
    -- Validate numeric ranges if applicable
    IF v_criteria.parameter_type = 'NUMERIC' AND p_parameter_value IS NOT NULL THEN
        BEGIN
            v_numeric_value := p_parameter_value::NUMERIC;
            
            IF v_criteria.min_value IS NOT NULL AND v_numeric_value < v_criteria.min_value THEN
                v_is_valid := false;
            END IF;
            
            IF v_criteria.max_value IS NOT NULL AND v_numeric_value > v_criteria.max_value THEN
                v_is_valid := false;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                v_is_valid := false;
        END;
    END IF;
    
    RETURN v_is_valid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- BUSINESS LOGIC FUNCTIONS
-- ============================================================================

-- Function to create a new panel
CREATE OR REPLACE FUNCTION create_panel(
    p_manufacturing_order_id UUID,
    p_length_mm NUMERIC,
    p_width_mm NUMERIC,
    p_thickness_mm NUMERIC,
    p_power_watts NUMERIC,
    p_weight_kg NUMERIC,
    p_created_by UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_panel_id UUID;
    v_barcode VARCHAR(50);
    v_efficiency NUMERIC;
BEGIN
    -- Generate unique barcode
    v_barcode := generate_unique_barcode('PANEL');
    
    -- Calculate efficiency
    v_efficiency := calculate_panel_efficiency(p_power_watts, p_length_mm, p_width_mm);
    
    -- Insert panel
    INSERT INTO panels (
        manufacturing_order_id,
        barcode,
        length_mm,
        width_mm,
        thickness_mm,
        power_watts,
        weight_kg,
        efficiency_w_per_sqm,
        status,
        created_by,
        notes
    ) VALUES (
        p_manufacturing_order_id,
        v_barcode,
        p_length_mm,
        p_width_mm,
        p_thickness_mm,
        p_power_watts,
        p_weight_kg,
        v_efficiency,
        'IN_PROGRESS',
        p_created_by,
        p_notes
    ) RETURNING id INTO v_panel_id;
    
    -- Update manufacturing order panel count
    UPDATE manufacturing_orders 
    SET panels_created = panels_created + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_manufacturing_order_id;
    
    RETURN v_panel_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to assign panel to pallet
CREATE OR REPLACE FUNCTION assign_panel_to_pallet(
    p_panel_id UUID,
    p_pallet_id UUID,
    p_position_x INTEGER,
    p_position_y INTEGER,
    p_assigned_by UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_pallet_capacity INTEGER;
    v_current_assigned INTEGER;
    v_panel_status VARCHAR(50);
BEGIN
    -- Check if panel exists and is available
    SELECT status INTO v_panel_status
    FROM panels
    WHERE id = p_panel_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Panel not found';
    END IF;
    
    IF v_panel_status != 'COMPLETED' THEN
        RAISE EXCEPTION 'Panel must be completed before assignment to pallet';
    END IF;
    
    -- Check pallet capacity
    SELECT capacity, panels_assigned 
    INTO v_pallet_capacity, v_current_assigned
    FROM pallets
    WHERE id = p_pallet_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pallet not found';
    END IF;
    
    IF v_current_assigned >= v_pallet_capacity THEN
        RAISE EXCEPTION 'Pallet is at full capacity';
    END IF;
    
    -- Check if position is available
    IF EXISTS (
        SELECT 1 FROM pallet_assignments 
        WHERE pallet_id = p_pallet_id 
          AND position_x = p_position_x 
          AND position_y = p_position_y
    ) THEN
        RAISE EXCEPTION 'Position already occupied';
    END IF;
    
    -- Assign panel to pallet
    INSERT INTO pallet_assignments (
        pallet_id,
        panel_id,
        position_x,
        position_y,
        assigned_by
    ) VALUES (
        p_pallet_id,
        p_panel_id,
        p_position_x,
        p_position_y,
        p_assigned_by
    );
    
    -- Update pallet assigned count
    UPDATE pallets 
    SET panels_assigned = panels_assigned + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_pallet_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record inspection result
CREATE OR REPLACE FUNCTION record_inspection_result(
    p_panel_id UUID,
    p_station_id UUID,
    p_inspector_id UUID,
    p_result VARCHAR(50),
    p_notes TEXT DEFAULT NULL,
    p_criteria_results JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_inspection_id UUID;
    v_manufacturing_order_id UUID;
    v_criteria_result RECORD;
    v_criteria_key TEXT;
    v_criteria_value TEXT;
BEGIN
    -- Get manufacturing order ID
    SELECT manufacturing_order_id INTO v_manufacturing_order_id
    FROM panels
    WHERE id = p_panel_id;
    
    -- Create inspection record
    INSERT INTO inspections (
        panel_id,
        station_id,
        inspector_id,
        result,
        notes,
        manufacturing_order_id
    ) VALUES (
        p_panel_id,
        p_station_id,
        p_inspector_id,
        p_result,
        p_notes,
        v_manufacturing_order_id
    ) RETURNING id INTO v_inspection_id;
    
    -- Record criteria results if provided
    IF p_criteria_results IS NOT NULL THEN
        FOR v_criteria_key, v_criteria_value IN SELECT * FROM jsonb_each_text(p_criteria_results)
        LOOP
            INSERT INTO inspection_criteria_results (
                inspection_id,
                criteria_name,
                parameter_name,
                parameter_value,
                is_valid
            ) VALUES (
                v_inspection_id,
                v_criteria_key,
                'value',
                v_criteria_value,
                validate_inspection_criteria(p_station_id, v_criteria_key, 'value', v_criteria_value)
            );
        END LOOP;
    END IF;
    
    -- Update panel inspection count
    UPDATE panels 
    SET inspection_count = inspection_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_panel_id;
    
    -- Update panel status based on inspection result
    IF p_result = 'FAIL' THEN
        UPDATE panels 
        SET status = 'FAILED',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = p_panel_id;
    ELSIF p_result = 'PASS' AND EXISTS (
        SELECT 1 FROM inspections 
        WHERE panel_id = p_panel_id 
          AND result = 'PASS'
        HAVING COUNT(*) >= (
            SELECT COUNT(*) FROM stations WHERE is_active = true
        )
    ) THEN
        UPDATE panels 
        SET status = 'COMPLETED',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = p_panel_id;
    END IF;
    
    RETURN v_inspection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete manufacturing order
CREATE OR REPLACE FUNCTION complete_manufacturing_order(p_manufacturing_order_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_order RECORD;
    v_completed_panels INTEGER;
    v_total_panels INTEGER;
BEGIN
    -- Get manufacturing order details
    SELECT * INTO v_order
    FROM manufacturing_orders
    WHERE id = p_manufacturing_order_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Manufacturing order not found';
    END IF;
    
    -- Count completed panels
    SELECT COUNT(*) INTO v_completed_panels
    FROM panels
    WHERE manufacturing_order_id = p_manufacturing_order_id
      AND status = 'COMPLETED';
    
    -- Count total panels
    SELECT COUNT(*) INTO v_total_panels
    FROM panels
    WHERE manufacturing_order_id = p_manufacturing_order_id;
    
    -- Check if all panels are completed
    IF v_completed_panels < v_total_panels THEN
        RAISE EXCEPTION 'Cannot complete order: % panels still in progress', (v_total_panels - v_completed_panels);
    END IF;
    
    -- Update manufacturing order status
    UPDATE manufacturing_orders
    SET status = 'COMPLETED',
        end_date = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_manufacturing_order_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- AUDIT TRIGGERS
-- ============================================================================

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_event_type VARCHAR(100);
    v_event_category VARCHAR(50);
    v_action VARCHAR(50);
    v_description TEXT;
    v_old_values JSONB;
    v_new_values JSONB;
BEGIN
    -- Get current user ID (you may need to implement session management)
    v_user_id := COALESCE(current_setting('app.current_user_id', true)::UUID, NULL);
    
    -- Determine event type based on TG_OP and table
    CASE TG_OP
        WHEN 'INSERT' THEN
            v_action := 'CREATE';
            v_event_type := 'RECORD_CREATED';
            v_description := 'New ' || TG_TABLE_NAME || ' record created';
            v_new_values := to_jsonb(NEW);
        WHEN 'UPDATE' THEN
            v_action := 'UPDATE';
            v_event_type := 'RECORD_UPDATED';
            v_description := TG_TABLE_NAME || ' record updated';
            v_old_values := to_jsonb(OLD);
            v_new_values := to_jsonb(NEW);
        WHEN 'DELETE' THEN
            v_action := 'DELETE';
            v_event_type := 'RECORD_DELETED';
            v_description := TG_TABLE_NAME || ' record deleted';
            v_old_values := to_jsonb(OLD);
    END CASE;
    
    -- Determine event category based on table
    CASE TG_TABLE_NAME
        WHEN 'panels' THEN v_event_category := 'PANEL_MANAGEMENT';
        WHEN 'manufacturing_orders' THEN v_event_category := 'ORDER_MANAGEMENT';
        WHEN 'pallets' THEN v_event_category := 'PALLET_MANAGEMENT';
        WHEN 'inspections' THEN v_event_category := 'QUALITY_CONTROL';
        WHEN 'users' THEN v_event_category := 'USER_MANAGEMENT';
        WHEN 'stations' THEN v_event_category := 'STATION_MANAGEMENT';
        ELSE v_event_category := 'SYSTEM';
    END CASE;
    
    -- Insert audit log
    INSERT INTO audit_logs (
        event_type,
        event_category,
        user_id,
        target_table,
        target_id,
        action,
        description,
        old_values,
        new_values,
        severity_level,
        is_successful
    ) VALUES (
        v_event_type,
        v_event_category,
        v_user_id,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        v_action,
        v_description,
        v_old_values,
        v_new_values,
        'INFO',
        true
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- DATA VALIDATION TRIGGERS
-- ============================================================================

-- Function to validate panel data
CREATE OR REPLACE FUNCTION validate_panel_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate dimensions
    IF NEW.length_mm <= 0 OR NEW.width_mm <= 0 OR NEW.thickness_mm <= 0 THEN
        RAISE EXCEPTION 'Panel dimensions must be positive values';
    END IF;
    
    -- Validate power output
    IF NEW.power_watts <= 0 THEN
        RAISE EXCEPTION 'Panel power output must be positive';
    END IF;
    
    -- Validate weight
    IF NEW.weight_kg <= 0 THEN
        RAISE EXCEPTION 'Panel weight must be positive';
    END IF;
    
    -- Validate efficiency
    IF NEW.efficiency_w_per_sqm <= 0 THEN
        RAISE EXCEPTION 'Panel efficiency must be positive';
    END IF;
    
    -- Validate barcode format
    IF NEW.barcode !~ '^[A-Z0-9_-]+$' THEN
        RAISE EXCEPTION 'Invalid barcode format';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate manufacturing order data
CREATE OR REPLACE FUNCTION validate_manufacturing_order_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate quantity
    IF NEW.quantity <= 0 THEN
        RAISE EXCEPTION 'Manufacturing order quantity must be positive';
    END IF;
    
    -- Validate dates
    IF NEW.start_date >= NEW.end_date THEN
        RAISE EXCEPTION 'Start date must be before end date';
    END IF;
    
    -- Validate priority
    IF NEW.priority NOT IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT') THEN
        RAISE EXCEPTION 'Invalid priority level';
    END IF;
    
    -- Validate status transitions
    IF TG_OP = 'UPDATE' THEN
        IF OLD.status = 'COMPLETED' AND NEW.status != 'COMPLETED' THEN
            RAISE EXCEPTION 'Cannot change status of completed order';
        END IF;
        
        IF OLD.status = 'CANCELLED' AND NEW.status != 'CANCELLED' THEN
            RAISE EXCEPTION 'Cannot change status of cancelled order';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate inspection data
CREATE OR REPLACE FUNCTION validate_inspection_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate result
    IF NEW.result NOT IN ('PASS', 'FAIL', 'PENDING', 'IN_PROGRESS') THEN
        RAISE EXCEPTION 'Invalid inspection result';
    END IF;
    
    -- Validate inspection date
    IF NEW.inspection_date > CURRENT_TIMESTAMP THEN
        RAISE EXCEPTION 'Inspection date cannot be in the future';
    END IF;
    
    -- Check if panel exists and is active
    IF NOT EXISTS (
        SELECT 1 FROM panels 
        WHERE id = NEW.panel_id 
          AND status IN ('IN_PROGRESS', 'COMPLETED')
    ) THEN
        RAISE EXCEPTION 'Panel not found or not available for inspection';
    END IF;
    
    -- Check if station exists and is active
    IF NOT EXISTS (
        SELECT 1 FROM stations 
        WHERE id = NEW.station_id 
          AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Station not found or not active';
    END IF;
    
    -- Check if inspector exists and is active
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = NEW.inspector_id 
          AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Inspector not found or not active';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- AUTOMATIC UPDATE TRIGGERS
-- ============================================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update manufacturing order statistics
CREATE OR REPLACE FUNCTION update_manufacturing_order_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update panel counts when panel status changes
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        UPDATE manufacturing_orders
        SET 
            panels_completed = (
                SELECT COUNT(*) FROM panels 
                WHERE manufacturing_order_id = NEW.manufacturing_order_id 
                  AND status = 'COMPLETED'
            ),
            panels_failed = (
                SELECT COUNT(*) FROM panels 
                WHERE manufacturing_order_id = NEW.manufacturing_order_id 
                  AND status = 'FAILED'
            ),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.manufacturing_order_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update pallet statistics
CREATE OR REPLACE FUNCTION update_pallet_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update pallet assigned count when assignments change
    IF TG_OP = 'INSERT' THEN
        UPDATE pallets
        SET panels_assigned = panels_assigned + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.pallet_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE pallets
        SET panels_assigned = panels_assigned - 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.pallet_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER DEFINITIONS
-- ============================================================================

-- Audit triggers for all main tables
CREATE TRIGGER trigger_audit_panels
    AFTER INSERT OR UPDATE OR DELETE ON panels
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER trigger_audit_manufacturing_orders
    AFTER INSERT OR UPDATE OR DELETE ON manufacturing_orders
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER trigger_audit_pallets
    AFTER INSERT OR UPDATE OR DELETE ON pallets
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER trigger_audit_inspections
    AFTER INSERT OR UPDATE OR DELETE ON inspections
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER trigger_audit_users
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER trigger_audit_stations
    AFTER INSERT OR UPDATE OR DELETE ON stations
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Data validation triggers
CREATE TRIGGER trigger_validate_panel_data
    BEFORE INSERT OR UPDATE ON panels
    FOR EACH ROW EXECUTE FUNCTION validate_panel_data();

CREATE TRIGGER trigger_validate_manufacturing_order_data
    BEFORE INSERT OR UPDATE ON manufacturing_orders
    FOR EACH ROW EXECUTE FUNCTION validate_manufacturing_order_data();

CREATE TRIGGER trigger_validate_inspection_data
    BEFORE INSERT OR UPDATE ON inspections
    FOR EACH ROW EXECUTE FUNCTION validate_inspection_data();

-- Automatic update triggers
CREATE TRIGGER trigger_update_panels_timestamps
    BEFORE UPDATE ON panels
    FOR EACH ROW EXECUTE FUNCTION update_timestamps();

CREATE TRIGGER trigger_update_manufacturing_orders_timestamps
    BEFORE UPDATE ON manufacturing_orders
    FOR EACH ROW EXECUTE FUNCTION update_timestamps();

CREATE TRIGGER trigger_update_pallets_timestamps
    BEFORE UPDATE ON pallets
    FOR EACH ROW EXECUTE FUNCTION update_timestamps();

CREATE TRIGGER trigger_update_inspections_timestamps
    BEFORE UPDATE ON inspections
    FOR EACH ROW EXECUTE FUNCTION update_timestamps();

CREATE TRIGGER trigger_update_users_timestamps
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_timestamps();

CREATE TRIGGER trigger_update_stations_timestamps
    BEFORE UPDATE ON stations
    FOR EACH ROW EXECUTE FUNCTION update_timestamps();

-- Statistics update triggers
CREATE TRIGGER trigger_update_manufacturing_order_stats
    AFTER INSERT OR UPDATE OR DELETE ON panels
    FOR EACH ROW EXECUTE FUNCTION update_manufacturing_order_stats();

CREATE TRIGGER trigger_update_pallet_stats
    AFTER INSERT OR DELETE ON pallet_assignments
    FOR EACH ROW EXECUTE FUNCTION update_pallet_stats();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions on functions
GRANT EXECUTE ON FUNCTION generate_unique_barcode(VARCHAR) TO solar_panel_user;
GRANT EXECUTE ON FUNCTION generate_pallet_barcode(UUID) TO solar_panel_user;
GRANT EXECUTE ON FUNCTION calculate_panel_efficiency(NUMERIC, NUMERIC, NUMERIC) TO solar_panel_user;
GRANT EXECUTE ON FUNCTION validate_inspection_criteria(UUID, VARCHAR, VARCHAR, TEXT) TO solar_panel_user;
GRANT EXECUTE ON FUNCTION create_panel(UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, UUID, TEXT) TO solar_panel_user;
GRANT EXECUTE ON FUNCTION assign_panel_to_pallet(UUID, UUID, INTEGER, INTEGER, UUID) TO solar_panel_user;
GRANT EXECUTE ON FUNCTION record_inspection_result(UUID, UUID, UUID, VARCHAR, TEXT, JSONB) TO solar_panel_user;
GRANT EXECUTE ON FUNCTION complete_manufacturing_order(UUID) TO solar_panel_user;

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================

-- This migration adds comprehensive database triggers and stored procedures:
-- - Utility functions for barcode generation and calculations
-- - Business logic functions for panel creation, assignment, and inspection
-- - Audit triggers to log all data changes
-- - Data validation triggers to ensure data integrity
-- - Automatic update triggers for timestamps and statistics
-- - Comprehensive error handling and business rule enforcement

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================

/*
-- To rollback this migration:

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_update_pallet_stats ON pallet_assignments;
DROP TRIGGER IF EXISTS trigger_update_manufacturing_order_stats ON panels;
DROP TRIGGER IF EXISTS trigger_update_stations_timestamps ON stations;
DROP TRIGGER IF EXISTS trigger_update_users_timestamps ON users;
DROP TRIGGER IF EXISTS trigger_update_inspections_timestamps ON inspections;
DROP TRIGGER IF EXISTS trigger_update_pallets_timestamps ON pallets;
DROP TRIGGER IF EXISTS trigger_update_manufacturing_orders_timestamps ON manufacturing_orders;
DROP TRIGGER IF EXISTS trigger_update_panels_timestamps ON panels;
DROP TRIGGER IF EXISTS trigger_validate_inspection_data ON inspections;
DROP TRIGGER IF EXISTS trigger_validate_manufacturing_order_data ON manufacturing_orders;
DROP TRIGGER IF EXISTS trigger_validate_panel_data ON panels;
DROP TRIGGER IF EXISTS trigger_audit_stations ON stations;
DROP TRIGGER IF EXISTS trigger_audit_users ON users;
DROP TRIGGER IF EXISTS trigger_audit_inspections ON inspections;
DROP TRIGGER IF EXISTS trigger_audit_pallets ON pallets;
DROP TRIGGER IF EXISTS trigger_audit_manufacturing_orders ON manufacturing_orders;
DROP TRIGGER IF EXISTS trigger_audit_panels ON panels;

-- Drop functions
DROP FUNCTION IF EXISTS update_pallet_stats();
DROP FUNCTION IF EXISTS update_manufacturing_order_stats();
DROP FUNCTION IF EXISTS update_timestamps();
DROP FUNCTION IF EXISTS validate_inspection_data();
DROP FUNCTION IF EXISTS validate_manufacturing_order_data();
DROP FUNCTION IF EXISTS validate_panel_data();
DROP FUNCTION IF EXISTS log_audit_event();
DROP FUNCTION IF EXISTS complete_manufacturing_order(UUID);
DROP FUNCTION IF EXISTS record_inspection_result(UUID, UUID, UUID, VARCHAR, TEXT, JSONB);
DROP FUNCTION IF EXISTS assign_panel_to_pallet(UUID, UUID, INTEGER, INTEGER, UUID);
DROP FUNCTION IF EXISTS create_panel(UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, UUID, TEXT);
DROP FUNCTION IF EXISTS validate_inspection_criteria(UUID, VARCHAR, VARCHAR, TEXT);
DROP FUNCTION IF EXISTS calculate_panel_efficiency(NUMERIC, NUMERIC, NUMERIC);
DROP FUNCTION IF EXISTS generate_pallet_barcode(UUID);
DROP FUNCTION IF EXISTS generate_unique_barcode(VARCHAR);
*/
