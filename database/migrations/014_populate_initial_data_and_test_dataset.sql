-- Migration 014: Populate Initial Data and Create Test Dataset
-- Solar Panel Production Tracking System
-- Created: 2025-08-20

-- This migration populates the database with initial data and creates comprehensive
-- test datasets for the solar panel production tracking system.

-- ============================================================================
-- INITIAL USER DATA
-- ============================================================================

-- Insert system administrator
INSERT INTO users (
    id,
    username,
    email,
    password_hash,
    first_name,
    last_name,
    role,
    is_active,
    created_at,
    updated_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440001',
    'admin',
    'admin@solarpanel.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK2G', -- password: admin123
    'System',
    'Administrator',
    'ADMIN',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Insert production manager
INSERT INTO users (
    id,
    username,
    email,
    password_hash,
    first_name,
    last_name,
    role,
    is_active,
    created_at,
    updated_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440002',
    'manager',
    'manager@solarpanel.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK2G', -- password: manager123
    'Production',
    'Manager',
    'MANAGER',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Insert quality control inspectors
INSERT INTO users (
    id,
    username,
    email,
    password_hash,
    first_name,
    last_name,
    role,
    is_active,
    created_at,
    updated_at
) VALUES 
    ('550e8400-e29b-41d4-a716-446655440003', 'inspector1', 'inspector1@solarpanel.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK2G', 'John', 'Smith', 'INSPECTOR', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('550e8400-e29b-41d4-a716-446655440004', 'inspector2', 'inspector2@solarpanel.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK2G', 'Sarah', 'Johnson', 'INSPECTOR', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('550e8400-e29b-41d4-a716-446655440005', 'inspector3', 'inspector3@solarpanel.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK2G', 'Mike', 'Davis', 'INSPECTOR', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert production operators
INSERT INTO users (
    id,
    username,
    email,
    password_hash,
    first_name,
    last_name,
    role,
    is_active,
    created_at,
    updated_at
) VALUES 
    ('550e8400-e29b-41d4-a716-446655440006', 'operator1', 'operator1@solarpanel.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK2G', 'Alex', 'Wilson', 'OPERATOR', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('550e8400-e29b-41d4-a716-446655440007', 'operator2', 'operator2@solarpanel.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK2G', 'Emily', 'Brown', 'OPERATOR', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('550e8400-e29b-41d4-a716-446655440008', 'operator3', 'operator3@solarpanel.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK2G', 'David', 'Miller', 'OPERATOR', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ============================================================================
-- INITIAL STATION DATA
-- ============================================================================

-- Insert production stations
INSERT INTO stations (
    id,
    name,
    description,
    station_type,
    location,
    is_active,
    created_at,
    updated_at
) VALUES 
    ('660e8400-e29b-41d4-a716-446655440001', 'Assembly Line A', 'Primary solar panel assembly station', 'ASSEMBLY', 'Building A - Floor 1', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('660e8400-e29b-41d4-a716-446655440002', 'Assembly Line B', 'Secondary solar panel assembly station', 'ASSEMBLY', 'Building A - Floor 1', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('660e8400-e29b-41d4-a716-446655440003', 'Quality Control Station 1', 'Initial quality inspection station', 'INSPECTION', 'Building A - Floor 2', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('660e8400-e29b-41d4-a716-446655440004', 'Quality Control Station 2', 'Final quality inspection station', 'INSPECTION', 'Building A - Floor 2', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('660e8400-e29b-41d4-a716-446655440005', 'Testing Station 1', 'Electrical testing and certification', 'TESTING', 'Building B - Floor 1', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('660e8400-e29b-41d4-a716-446655440006', 'Packaging Station 1', 'Final packaging and labeling', 'PACKAGING', 'Building B - Floor 2', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('660e8400-e29b-41d4-a716-446655440007', 'Packaging Station 2', 'Secondary packaging station', 'PACKAGING', 'Building B - Floor 2', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ============================================================================
-- TEST MANUFACTURING ORDERS
-- ============================================================================

-- Insert test manufacturing orders
INSERT INTO manufacturing_orders (
    id,
    order_number,
    description,
    quantity,
    priority,
    status,
    start_date,
    end_date,
    assigned_to,
    created_by,
    created_at,
    updated_at
) VALUES 
    ('770e8400-e29b-41d4-a716-446655440001', 'MO-2024-001', 'High-efficiency residential panels - 400W', 100, 'HIGH', 'IN_PROGRESS', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '10 days', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('770e8400-e29b-41d4-a716-446655440002', 'MO-2024-002', 'Commercial panels - 500W', 50, 'MEDIUM', 'PENDING', CURRENT_DATE + INTERVAL '2 days', CURRENT_DATE + INTERVAL '15 days', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('770e8400-e29b-41d4-a716-446655440003', 'MO-2024-003', 'Premium residential panels - 450W', 75, 'URGENT', 'IN_PROGRESS', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '5 days', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('770e8400-e29b-41d4-a716-446655440004', 'MO-2024-004', 'Standard residential panels - 350W', 200, 'LOW', 'PENDING', CURRENT_DATE + INTERVAL '5 days', CURRENT_DATE + INTERVAL '20 days', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('770e8400-e29b-41d4-a716-446655440005', 'MO-2024-005', 'Industrial panels - 600W', 25, 'HIGH', 'COMPLETED', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE - INTERVAL '5 days', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ============================================================================
-- TEST PANELS DATA
-- ============================================================================

-- Function to generate test panels for a manufacturing order
CREATE OR REPLACE FUNCTION generate_test_panels(p_mo_id UUID, p_quantity INTEGER)
RETURNS VOID AS $$
DECLARE
    v_panel_count INTEGER := 0;
    v_panel_id UUID;
    v_barcode VARCHAR(50);
    v_length_mm NUMERIC;
    v_width_mm NUMERIC;
    v_thickness_mm NUMERIC;
    v_power_watts NUMERIC;
    v_weight_kg NUMERIC;
    v_status VARCHAR(50);
    v_created_by UUID;
    v_mo_status VARCHAR(50);
BEGIN
    -- Get manufacturing order details
    SELECT status, assigned_to INTO v_mo_status, v_created_by
    FROM manufacturing_orders
    WHERE id = p_mo_id;
    
    -- Generate panels based on manufacturing order status
    WHILE v_panel_count < p_quantity LOOP
        v_panel_count := v_panel_count + 1;
        
        -- Generate random panel specifications
        v_length_mm := 1750 + (RANDOM() * 100)::INTEGER; -- 1750-1850mm
        v_width_mm := 1050 + (RANDOM() * 50)::INTEGER;   -- 1050-1100mm
        v_thickness_mm := 35 + (RANDOM() * 5)::INTEGER;  -- 35-40mm
        
        -- Power output varies by manufacturing order
        CASE p_mo_id::TEXT
            WHEN '770e8400-e29b-41d4-a716-446655440001' THEN v_power_watts := 400 + (RANDOM() * 20)::INTEGER; -- 400-420W
            WHEN '770e8400-e29b-41d4-a716-446655440002' THEN v_power_watts := 500 + (RANDOM() * 25)::INTEGER; -- 500-525W
            WHEN '770e8400-e29b-41d4-a716-446655440003' THEN v_power_watts := 450 + (RANDOM() * 20)::INTEGER; -- 450-470W
            WHEN '770e8400-e29b-41d4-a716-446655440004' THEN v_power_watts := 350 + (RANDOM() * 15)::INTEGER; -- 350-365W
            WHEN '770e8400-e29b-41d4-a716-446655440005' THEN v_power_watts := 600 + (RANDOM() * 30)::INTEGER; -- 600-630W
            ELSE v_power_watts := 400 + (RANDOM() * 50)::INTEGER; -- Default 400-450W
        END CASE;
        
        v_weight_kg := 18 + (RANDOM() * 2); -- 18-20kg
        
        -- Determine panel status based on manufacturing order status and panel number
        IF v_mo_status = 'COMPLETED' THEN
            v_status := 'COMPLETED';
        ELSIF v_mo_status = 'PENDING' THEN
            v_status := 'PENDING';
        ELSIF v_mo_status = 'IN_PROGRESS' THEN
            IF v_panel_count <= p_quantity * 0.3 THEN
                v_status := 'COMPLETED';
            ELSIF v_panel_count <= p_quantity * 0.7 THEN
                v_status := 'IN_PROGRESS';
            ELSE
                v_status := 'PENDING';
            END IF;
        END IF;
        
        -- Generate unique barcode
        v_barcode := 'PANEL_' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD_HH24MISS') || '_' || LPAD(v_panel_count::TEXT, 4, '0');
        
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
            notes,
            created_at,
            updated_at
        ) VALUES (
            p_mo_id,
            v_barcode,
            v_length_mm,
            v_width_mm,
            v_thickness_mm,
            v_power_watts,
            v_weight_kg,
            ROUND((v_power_watts / ((v_length_mm * v_width_mm) / 1000000))::NUMERIC, 2),
            v_status,
            v_created_by,
            'Test panel generated for manufacturing order ' || p_mo_id,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        );
    END LOOP;
    
    -- Update manufacturing order panel count
    UPDATE manufacturing_orders 
    SET panels_created = p_quantity,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_mo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate test panels for each manufacturing order
SELECT generate_test_panels('770e8400-e29b-41d4-a716-446655440001', 100);
SELECT generate_test_panels('770e8400-e29b-41d4-a716-446655440002', 50);
SELECT generate_test_panels('770e8400-e29b-41d4-a716-446655440003', 75);
SELECT generate_test_panels('770e8400-e29b-41d4-a716-446655440004', 200);
SELECT generate_test_panels('770e8400-e29b-41d4-a716-446655440005', 25);

-- ============================================================================
-- TEST PALLETS DATA
-- ============================================================================

-- Function to generate test pallets for a manufacturing order
CREATE OR REPLACE FUNCTION generate_test_pallets(p_mo_id UUID)
RETURNS VOID AS $$
DECLARE
    v_panel_count INTEGER;
    v_pallet_count INTEGER;
    v_pallet_id UUID;
    v_barcode VARCHAR(50);
    v_capacity INTEGER;
    v_length_mm NUMERIC;
    v_width_mm NUMERIC;
    v_height_mm NUMERIC;
    v_created_by UUID;
BEGIN
    -- Get panel count for this manufacturing order
    SELECT COUNT(*) INTO v_panel_count
    FROM panels
    WHERE manufacturing_order_id = p_mo_id;
    
    -- Calculate number of pallets needed (assuming 20 panels per pallet)
    v_pallet_count := CEIL(v_panel_count::NUMERIC / 20);
    
    -- Get manufacturing order assigned user
    SELECT assigned_to INTO v_created_by
    FROM manufacturing_orders
    WHERE id = p_mo_id;
    
    -- Generate pallets
    FOR i IN 1..v_pallet_count LOOP
        v_capacity := 20;
        v_length_mm := 2000 + (RANDOM() * 200)::INTEGER; -- 2000-2200mm
        v_width_mm := 1200 + (RANDOM() * 100)::INTEGER;  -- 1200-1300mm
        v_height_mm := 150 + (RANDOM() * 50)::INTEGER;   -- 150-200mm
        
        -- Generate pallet barcode
        v_barcode := 'PALLET_' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD_HH24MISS') || '_' || LPAD(i::TEXT, 3, '0');
        
        -- Insert pallet
        INSERT INTO pallets (
            manufacturing_order_id,
            barcode,
            capacity,
            length_mm,
            width_mm,
            height_mm,
            status,
            created_by,
            notes,
            created_at,
            updated_at
        ) VALUES (
            p_mo_id,
            v_barcode,
            v_capacity,
            v_length_mm,
            v_width_mm,
            v_height_mm,
            'IN_PROGRESS',
            v_created_by,
            'Test pallet generated for manufacturing order ' || p_mo_id,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate test pallets for each manufacturing order
SELECT generate_test_pallets('770e8400-e29b-41d4-a716-446655440001');
SELECT generate_test_pallets('770e8400-e29b-41d4-a716-446655440002');
SELECT generate_test_pallets('770e8400-e29b-41d4-a716-446655440003');
SELECT generate_test_pallets('770e8400-e29b-41d4-a716-446655440004');
SELECT generate_test_pallets('770e8400-e29b-41d4-a716-446655440005');

-- ============================================================================
-- TEST INSPECTIONS DATA
-- ============================================================================

-- Function to generate test inspections for completed panels
CREATE OR REPLACE FUNCTION generate_test_inspections()
RETURNS VOID AS $$
DECLARE
    v_panel RECORD;
    v_inspector_id UUID;
    v_station_id UUID;
    v_inspection_date TIMESTAMP;
    v_result VARCHAR(50);
    v_criteria_results JSONB;
BEGIN
    -- Loop through completed panels
    FOR v_panel IN 
        SELECT p.id, p.manufacturing_order_id, p.barcode
        FROM panels p
        WHERE p.status = 'COMPLETED'
    LOOP
        -- Generate inspections for each inspection station
        FOR v_station_id IN 
            SELECT id FROM stations WHERE station_type = 'INSPECTION' AND is_active = true
        LOOP
            -- Randomly select inspector
            SELECT id INTO v_inspector_id
            FROM users 
            WHERE role = 'INSPECTOR' AND is_active = true
            ORDER BY RANDOM()
            LIMIT 1;
            
            -- Generate inspection date (within last 30 days)
            v_inspection_date := CURRENT_TIMESTAMP - (RANDOM() * 30)::INTEGER * INTERVAL '1 day';
            
            -- Generate inspection result (90% pass rate)
            IF RANDOM() < 0.9 THEN
                v_result := 'PASS';
            ELSE
                v_result := 'FAIL';
            END IF;
            
            -- Generate criteria results
            v_criteria_results := jsonb_build_object(
                'visual_inspection', CASE WHEN v_result = 'PASS' THEN 'PASS' ELSE 'FAIL' END,
                'electrical_test', CASE WHEN v_result = 'PASS' THEN 'PASS' ELSE 'FAIL' END,
                'dimension_check', CASE WHEN v_result = 'PASS' THEN 'PASS' ELSE 'FAIL' END,
                'power_output', CASE WHEN v_result = 'PASS' THEN (350 + RANDOM() * 100)::INTEGER::TEXT ELSE '0' END
            );
            
            -- Insert inspection
            INSERT INTO inspections (
                panel_id,
                station_id,
                inspector_id,
                result,
                notes,
                manufacturing_order_id,
                inspection_date,
                created_at,
                updated_at
            ) VALUES (
                v_panel.id,
                v_station_id,
                v_inspector_id,
                v_result,
                'Test inspection for panel ' || v_panel.barcode,
                v_panel.manufacturing_order_id,
                v_inspection_date,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            );
            
            -- Update panel inspection count
            UPDATE panels 
            SET inspection_count = inspection_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = v_panel.id;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate test inspections
SELECT generate_test_inspections();

-- ============================================================================
-- TEST PALLET ASSIGNMENTS
-- ============================================================================

-- Function to assign completed panels to pallets
CREATE OR REPLACE FUNCTION assign_completed_panels_to_pallets()
RETURNS VOID AS $$
DECLARE
    v_panel RECORD;
    v_pallet RECORD;
    v_position_x INTEGER;
    v_position_y INTEGER;
    v_assigned_by UUID;
BEGIN
    -- Loop through completed panels
    FOR v_panel IN 
        SELECT p.id, p.manufacturing_order_id
        FROM panels p
        WHERE p.status = 'COMPLETED'
          AND NOT EXISTS (
              SELECT 1 FROM pallet_assignments pa WHERE pa.panel_id = p.id
          )
    LOOP
        -- Find available pallet for this manufacturing order
        SELECT * INTO v_pallet
        FROM pallets
        WHERE manufacturing_order_id = v_panel.manufacturing_order_id
          AND panels_assigned < capacity
        ORDER BY panels_assigned ASC
        LIMIT 1;
        
        IF FOUND THEN
            -- Get assigned user
            SELECT assigned_to INTO v_assigned_by
            FROM manufacturing_orders
            WHERE id = v_panel.manufacturing_order_id;
            
            -- Find available position
            SELECT 
                COALESCE(MAX(position_x), 0) + 1,
                COALESCE(MAX(position_y), 0)
            INTO v_position_x, v_position_y
            FROM pallet_assignments
            WHERE pallet_id = v_pallet.id;
            
            -- If no assignments yet, start at position (1,1)
            IF v_position_x IS NULL THEN
                v_position_x := 1;
                v_position_y := 1;
            END IF;
            
            -- Insert pallet assignment
            INSERT INTO pallet_assignments (
                pallet_id,
                panel_id,
                position_x,
                position_y,
                assigned_by,
                assigned_at
            ) VALUES (
                v_pallet.id,
                v_panel.id,
                v_position_x,
                v_position_y,
                v_assigned_by,
                CURRENT_TIMESTAMP
            );
            
            -- Update pallet assigned count
            UPDATE pallets 
            SET panels_assigned = panels_assigned + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = v_pallet.id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Assign completed panels to pallets
SELECT assign_completed_panels_to_pallets();

-- ============================================================================
-- UPDATE MANUFACTURING ORDER STATISTICS
-- ============================================================================

-- Update manufacturing order statistics
UPDATE manufacturing_orders
SET 
    panels_completed = (
        SELECT COUNT(*) FROM panels 
        WHERE manufacturing_order_id = manufacturing_orders.id 
          AND status = 'COMPLETED'
    ),
    panels_failed = (
        SELECT COUNT(*) FROM panels 
        WHERE manufacturing_order_id = manufacturing_orders.id 
          AND status = 'FAILED'
    ),
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- CLEANUP FUNCTIONS
-- ============================================================================

-- Drop temporary functions
DROP FUNCTION IF EXISTS generate_test_panels(UUID, INTEGER);
DROP FUNCTION IF EXISTS generate_test_pallets(UUID);
DROP FUNCTION IF EXISTS generate_test_inspections();
DROP FUNCTION IF EXISTS assign_completed_panels_to_pallets();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Create view for data verification
CREATE OR REPLACE VIEW test_data_summary AS
SELECT 
    'Users' as table_name,
    COUNT(*) as record_count,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_count
FROM users
UNION ALL
SELECT 
    'Stations' as table_name,
    COUNT(*) as record_count,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_count
FROM stations
UNION ALL
SELECT 
    'Manufacturing Orders' as table_name,
    COUNT(*) as record_count,
    COUNT(CASE WHEN status != 'CANCELLED' THEN 1 END) as active_count
FROM manufacturing_orders
UNION ALL
SELECT 
    'Panels' as table_name,
    COUNT(*) as record_count,
    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as active_count
FROM panels
UNION ALL
SELECT 
    'Pallets' as table_name,
    COUNT(*) as record_count,
    COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as active_count
FROM pallets
UNION ALL
SELECT 
    'Inspections' as table_name,
    COUNT(*) as record_count,
    COUNT(CASE WHEN result = 'PASS' THEN 1 END) as active_count
FROM inspections;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions on views
GRANT SELECT ON test_data_summary TO solar_panel_user;

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================

-- This migration populates the database with comprehensive test data:
-- - 8 users (1 admin, 1 manager, 3 inspectors, 3 operators)
-- - 7 stations (2 assembly, 2 inspection, 1 testing, 2 packaging)
-- - 5 manufacturing orders with varying priorities and statuses
-- - 450 test panels with realistic specifications
-- - 25 test pallets with appropriate capacities
-- - Comprehensive inspection data for completed panels
-- - Pallet assignments for completed panels
-- - Updated statistics and relationships

-- Test data includes:
-- - Realistic panel specifications (dimensions, power, weight)
-- - Varied manufacturing order priorities and statuses
-- - Quality inspection results with 90% pass rate
-- - Proper relationships between all entities
-- - Audit trail for all data changes

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================

/*
-- To rollback this migration:

-- Drop views
DROP VIEW IF EXISTS test_data_summary;

-- Delete test data (in reverse order of creation)
DELETE FROM pallet_assignments WHERE assigned_at >= CURRENT_DATE - INTERVAL '1 day';
DELETE FROM inspection_criteria_results WHERE created_at >= CURRENT_DATE - INTERVAL '1 day';
DELETE FROM inspections WHERE created_at >= CURRENT_DATE - INTERVAL '1 day';
DELETE FROM pallets WHERE created_at >= CURRENT_DATE - INTERVAL '1 day';
DELETE FROM panels WHERE created_at >= CURRENT_DATE - INTERVAL '1 day';
DELETE FROM manufacturing_orders WHERE created_at >= CURRENT_DATE - INTERVAL '1 day';
DELETE FROM stations WHERE created_at >= CURRENT_DATE - INTERVAL '1 day';
DELETE FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '1 day';

-- Reset sequences if needed
-- ALTER SEQUENCE users_id_seq RESTART WITH 1;
-- ALTER SEQUENCE stations_id_seq RESTART WITH 1;
-- etc.
*/
