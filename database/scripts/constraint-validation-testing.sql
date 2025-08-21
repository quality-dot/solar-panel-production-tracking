-- Constraint Validation and Testing Script
-- Solar Panel Production Tracking System
-- Task 13.26: Constraint Validation and Testing
-- Created: 2025-01-27

-- This script provides comprehensive testing of all database constraints
-- to ensure proper functionality and business rule enforcement.

-- ============================================================================
-- TEST DATA SETUP
-- ============================================================================

-- Create test data tables for constraint testing
CREATE TABLE IF NOT EXISTS test_constraint_results (
    id SERIAL PRIMARY KEY,
    test_name TEXT NOT NULL,
    constraint_name TEXT NOT NULL,
    table_name TEXT NOT NULL,
    test_type TEXT NOT NULL, -- 'VALIDATION', 'VIOLATION', 'EDGE_CASE'
    test_result TEXT NOT NULL, -- 'PASS', 'FAIL', 'ERROR'
    expected_result TEXT NOT NULL,
    actual_result TEXT,
    error_message TEXT,
    test_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Create test data for constraint validation
CREATE TABLE IF NOT EXISTS test_panels (
    id SERIAL PRIMARY KEY,
    barcode TEXT NOT NULL,
    panel_type TEXT NOT NULL,
    line_assignment TEXT NOT NULL,
    status TEXT NOT NULL,
    current_station_id INTEGER,
    station_1_completed_at TIMESTAMP,
    station_2_completed_at TIMESTAMP,
    station_3_completed_at TIMESTAMP,
    station_4_completed_at TIMESTAMP,
    wattage_pmax NUMERIC,
    vmp NUMERIC,
    imp NUMERIC,
    rework_reason TEXT,
    quality_notes TEXT,
    manufacturing_order_id INTEGER,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS test_manufacturing_orders (
    id SERIAL PRIMARY KEY,
    panel_type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL,
    panels_created INTEGER DEFAULT 0,
    panels_completed INTEGER DEFAULT 0,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS test_inspections (
    id SERIAL PRIMARY KEY,
    panel_id INTEGER NOT NULL,
    station_id INTEGER NOT NULL,
    inspector_id INTEGER NOT NULL,
    result TEXT NOT NULL,
    notes TEXT,
    inspection_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- CONSTRAINT VALIDATION FUNCTIONS
-- ============================================================================

-- Function to test panel workflow progression constraints
CREATE OR REPLACE FUNCTION test_panel_workflow_constraints() 
RETURNS TABLE (
    test_name TEXT,
    constraint_name TEXT,
    test_result TEXT,
    expected_result TEXT,
    actual_result TEXT,
    error_message TEXT
) AS $$
DECLARE
    test_panel_id INTEGER;
    test_result TEXT;
    error_msg TEXT;
BEGIN
    -- Test 1: Valid panel workflow progression
    BEGIN
        INSERT INTO test_panels (
            barcode, panel_type, line_assignment, status, current_station_id,
            station_1_completed_at, station_2_completed_at, station_3_completed_at, station_4_completed_at,
            wattage_pmax, vmp, imp, manufacturing_order_id, created_by
        ) VALUES (
            'CRS250W3640001', '36', 'LINE_1', 'COMPLETED', 4,
            '2025-01-27 08:00:00', '2025-01-27 09:00:00', '2025-01-27 10:00:00', '2025-01-27 11:00:00',
            400, 45, 8.9, 1, 1
        );
        
        test_result := 'PASS';
        error_msg := NULL;
    EXCEPTION WHEN OTHERS THEN
        test_result := 'FAIL';
        error_msg := SQLERRM;
    END;
    
    RETURN QUERY SELECT 
        'Valid Panel Workflow Progression' as test_name,
        'check_workflow_progression' as constraint_name,
        test_result,
        'PASS' as expected_result,
        test_result as actual_result,
        error_msg as error_message;
    
    -- Test 2: Invalid panel workflow (missing station completion)
    BEGIN
        INSERT INTO test_panels (
            barcode, panel_type, line_assignment, status, current_station_id,
            station_1_completed_at, station_2_completed_at, station_3_completed_at, station_4_completed_at,
            wattage_pmax, vmp, imp, manufacturing_order_id, created_by
        ) VALUES (
            'CRS250W3640002', '36', 'LINE_1', 'COMPLETED', 4,
            '2025-01-27 08:00:00', '2025-01-27 09:00:00', NULL, '2025-01-27 11:00:00',
            400, 45, 8.9, 1, 1
        );
        
        test_result := 'FAIL'; -- Should fail due to constraint
        error_msg := 'Expected constraint violation';
    EXCEPTION WHEN OTHERS THEN
        test_result := 'PASS'; -- Constraint properly enforced
        error_msg := SQLERRM;
    END;
    
    RETURN QUERY SELECT 
        'Invalid Panel Workflow (Missing Station)' as test_name,
        'check_workflow_progression' as constraint_name,
        test_result,
        'PASS' as expected_result,
        test_result as actual_result,
        error_msg as error_message;
    
    -- Test 3: Invalid barcode format
    BEGIN
        INSERT INTO test_panels (
            barcode, panel_type, line_assignment, status, current_station_id,
            manufacturing_order_id, created_by
        ) VALUES (
            'INVALID_BARCODE', '36', 'LINE_1', 'PENDING', NULL,
            1, 1
        );
        
        test_result := 'FAIL'; -- Should fail due to constraint
        error_msg := 'Expected constraint violation';
    EXCEPTION WHEN OTHERS THEN
        test_result := 'PASS'; -- Constraint properly enforced
        error_msg := SQLERRM;
    END;
    
    RETURN QUERY SELECT 
        'Invalid Barcode Format' as test_name,
        'check_barcode_format_compliance' as constraint_name,
        test_result,
        'PASS' as expected_result,
        test_result as actual_result,
        error_msg as error_message;
    
    -- Test 4: Invalid panel type for line assignment
    BEGIN
        INSERT INTO test_panels (
            barcode, panel_type, line_assignment, status, current_station_id,
            manufacturing_order_id, created_by
        ) VALUES (
            'CRS250W1440001', '144', 'LINE_1', 'PENDING', NULL,
            1, 1
        );
        
        test_result := 'FAIL'; -- Should fail due to constraint
        error_msg := 'Expected constraint violation';
    EXCEPTION WHEN OTHERS THEN
        test_result := 'PASS'; -- Constraint properly enforced
        error_msg := SQLERRM;
    END;
    
    RETURN QUERY SELECT 
        'Invalid Panel Type for Line' as test_name,
        'check_panel_type_line_assignment' as constraint_name,
        test_result,
        'PASS' as expected_result,
        test_result as actual_result,
        error_msg as error_message;
    
    -- Test 5: Completed panel without electrical data
    BEGIN
        INSERT INTO test_panels (
            barcode, panel_type, line_assignment, status, current_station_id,
            station_1_completed_at, station_2_completed_at, station_3_completed_at, station_4_completed_at,
            manufacturing_order_id, created_by
        ) VALUES (
            'CRS250W3640003', '36', 'LINE_1', 'COMPLETED', 4,
            '2025-01-27 08:00:00', '2025-01-27 09:00:00', '2025-01-27 10:00:00', '2025-01-27 11:00:00',
            1, 1
        );
        
        test_result := 'FAIL'; -- Should fail due to constraint
        error_msg := 'Expected constraint violation';
    EXCEPTION WHEN OTHERS THEN
        test_result := 'PASS'; -- Constraint properly enforced
        error_msg := SQLERRM;
    END;
    
    RETURN QUERY SELECT 
        'Completed Panel Without Electrical Data' as test_name,
        'check_completed_panel_electrical_data' as constraint_name,
        test_result,
        'PASS' as expected_result,
        test_result as actual_result,
        error_msg as error_message;
    
    -- Test 6: Failed panel without quality notes
    BEGIN
        INSERT INTO test_panels (
            barcode, panel_type, line_assignment, status, current_station_id,
            manufacturing_order_id, created_by
        ) VALUES (
            'CRS250W3640004', '36', 'LINE_1', 'FAILED', 2,
            1, 1
        );
        
        test_result := 'FAIL'; -- Should fail due to constraint
        error_msg := 'Expected constraint violation';
    EXCEPTION WHEN OTHERS THEN
        test_result := 'PASS'; -- Constraint properly enforced
        error_msg := SQLERRM;
    END;
    
    RETURN QUERY SELECT 
        'Failed Panel Without Quality Notes' as test_name,
        'check_failed_panel_documentation' as constraint_name,
        test_result,
        'PASS' as expected_result,
        test_result as actual_result,
        error_msg as error_message;
    
    -- Test 7: Rework panel without rework reason
    BEGIN
        INSERT INTO test_panels (
            barcode, panel_type, line_assignment, status, current_station_id,
            manufacturing_order_id, created_by
        ) VALUES (
            'CRS250W3640005', '36', 'LINE_1', 'REWORK', 2,
            1, 1
        );
        
        test_result := 'FAIL'; -- Should fail due to constraint
        error_msg := 'Expected constraint violation';
    EXCEPTION WHEN OTHERS THEN
        test_result := 'PASS'; -- Constraint properly enforced
        error_msg := SQLERRM;
    END;
    
    RETURN QUERY SELECT 
        'Rework Panel Without Reason' as test_name,
        'check_rework_routing' as constraint_name,
        test_result,
        'PASS' as expected_result,
        test_result as actual_result,
        error_msg as error_message;
    
    -- Test 8: Valid electrical data ranges
    BEGIN
        INSERT INTO test_panels (
            barcode, panel_type, line_assignment, status, current_station_id,
            wattage_pmax, vmp, imp, manufacturing_order_id, created_by
        ) VALUES (
            'CRS250W3640006', '36', 'LINE_1', 'IN_PROGRESS', 2,
            400, 45, 8.9, 1, 1
        );
        
        test_result := 'PASS';
        error_msg := NULL;
    EXCEPTION WHEN OTHERS THEN
        test_result := 'FAIL';
        error_msg := SQLERRM;
    END;
    
    RETURN QUERY SELECT 
        'Valid Electrical Data Ranges' as test_name,
        'check_electrical_data_validity' as constraint_name,
        test_result,
        'PASS' as expected_result,
        test_result as actual_result,
        error_msg as error_message;
    
    -- Test 9: Invalid electrical data ranges
    BEGIN
        INSERT INTO test_panels (
            barcode, panel_type, line_assignment, status, current_station_id,
            wattage_pmax, vmp, imp, manufacturing_order_id, created_by
        ) VALUES (
            'CRS250W3640007', '36', 'LINE_1', 'IN_PROGRESS', 2,
            -100, 150, 25, 1, 1
        );
        
        test_result := 'FAIL'; -- Should fail due to constraint
        error_msg := 'Expected constraint violation';
    EXCEPTION WHEN OTHERS THEN
        test_result := 'PASS'; -- Constraint properly enforced
        error_msg := SQLERRM;
    END;
    
    RETURN QUERY SELECT 
        'Invalid Electrical Data Ranges' as test_name,
        'check_electrical_data_validity' as constraint_name,
        test_result,
        'PASS' as expected_result,
        test_result as actual_result,
        error_msg as error_message;
    
    -- Test 10: Station completion sequence validation
    BEGIN
        INSERT INTO test_panels (
            barcode, panel_type, line_assignment, status, current_station_id,
            station_1_completed_at, station_2_completed_at, station_3_completed_at, station_4_completed_at,
            manufacturing_order_id, created_by
        ) VALUES (
            'CRS250W3640008', '36', 'LINE_1', 'IN_PROGRESS', 3,
            '2025-01-27 08:00:00', '2025-01-27 07:00:00', '2025-01-27 10:00:00', NULL,
            1, 1
        );
        
        test_result := 'FAIL'; -- Should fail due to constraint
        error_msg := 'Expected constraint violation';
    EXCEPTION WHEN OTHERS THEN
        test_result := 'PASS'; -- Constraint properly enforced
        error_msg := SQLERRM;
    END;
    
    RETURN QUERY SELECT 
        'Invalid Station Completion Sequence' as test_name,
        'check_station_completion_sequence' as constraint_name,
        test_result,
        'PASS' as expected_result,
        test_result as actual_result,
        error_msg as error_message;
    
END;
$$ LANGUAGE plpgsql;

-- Function to test manufacturing order constraints
CREATE OR REPLACE FUNCTION test_manufacturing_order_constraints() 
RETURNS TABLE (
    test_name TEXT,
    constraint_name TEXT,
    test_result TEXT,
    expected_result TEXT,
    actual_result TEXT,
    error_message TEXT
) AS $$
DECLARE
    test_result TEXT;
    error_msg TEXT;
BEGIN
    -- Test 1: Valid manufacturing order
    BEGIN
        INSERT INTO test_manufacturing_orders (
            panel_type, quantity, start_date, end_date, status, created_by
        ) VALUES (
            '36', 100, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'PENDING', 1
        );
        
        test_result := 'PASS';
        error_msg := NULL;
    EXCEPTION WHEN OTHERS THEN
        test_result := 'FAIL';
        error_msg := SQLERRM;
    END;
    
    RETURN QUERY SELECT 
        'Valid Manufacturing Order' as test_name,
        'check_mo_quantity_reasonable' as constraint_name,
        test_result,
        'PASS' as expected_result,
        test_result as actual_result,
        error_msg as error_message;
    
    -- Test 2: Invalid quantity (too high)
    BEGIN
        INSERT INTO test_manufacturing_orders (
            panel_type, quantity, start_date, end_date, status, created_by
        ) VALUES (
            '36', 15000, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'PENDING', 1
        );
        
        test_result := 'FAIL'; -- Should fail due to constraint
        error_msg := 'Expected constraint violation';
    EXCEPTION WHEN OTHERS THEN
        test_result := 'PASS'; -- Constraint properly enforced
        error_msg := SQLERRM;
    END;
    
    RETURN QUERY SELECT 
        'Invalid Quantity (Too High)' as test_name,
        'check_mo_quantity_reasonable' as constraint_name,
        test_result,
        'PASS' as expected_result,
        test_result as actual_result,
        error_msg as error_message;
    
    -- Test 3: Invalid dates (end before start)
    BEGIN
        INSERT INTO test_manufacturing_orders (
            panel_type, quantity, start_date, end_date, status, created_by
        ) VALUES (
            '36', 100, CURRENT_DATE, CURRENT_DATE - INTERVAL '1 day', 'PENDING', 1
        );
        
        test_result := 'FAIL'; -- Should fail due to constraint
        error_msg := 'Expected constraint violation';
    EXCEPTION WHEN OTHERS THEN
        test_result := 'PASS'; -- Constraint properly enforced
        error_msg := SQLERRM;
    END;
    
    RETURN QUERY SELECT 
        'Invalid Dates (End Before Start)' as test_name,
        'check_mo_dates_logical' as constraint_name,
        test_result,
        'PASS' as expected_result,
        test_result as actual_result,
        error_msg as error_message;
    
    -- Test 4: Invalid status
    BEGIN
        INSERT INTO test_manufacturing_orders (
            panel_type, quantity, start_date, end_date, status, created_by
        ) VALUES (
            '36', 100, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'INVALID_STATUS', 1
        );
        
        test_result := 'FAIL'; -- Should fail due to constraint
        error_msg := 'Expected constraint violation';
    EXCEPTION WHEN OTHERS THEN
        test_result := 'PASS'; -- Constraint properly enforced
        error_msg := SQLERRM;
    END;
    
    RETURN QUERY SELECT 
        'Invalid Status' as test_name,
        'check_mo_status_transition' as constraint_name,
        test_result,
        'PASS' as expected_result,
        test_result as actual_result,
        error_msg as error_message;
    
END;
$$ LANGUAGE plpgsql;

-- Function to test inspection constraints
CREATE OR REPLACE FUNCTION test_inspection_constraints() 
RETURNS TABLE (
    test_name TEXT,
    constraint_name TEXT,
    test_result TEXT,
    expected_result TEXT,
    actual_result TEXT,
    error_message TEXT
) AS $$
DECLARE
    test_result TEXT;
    error_msg TEXT;
BEGIN
    -- Test 1: Valid inspection
    BEGIN
        INSERT INTO test_inspections (
            panel_id, station_id, inspector_id, result
        ) VALUES (
            1, 1, 1, 'PASS'
        );
        
        test_result := 'PASS';
        error_msg := NULL;
    EXCEPTION WHEN OTHERS THEN
        test_result := 'FAIL';
        error_msg := SQLERRM;
    END;
    
    RETURN QUERY SELECT 
        'Valid Inspection' as test_name,
        'check_inspection_result_valid' as constraint_name,
        test_result,
        'PASS' as expected_result,
        test_result as actual_result,
        error_msg as error_message;
    
    -- Test 2: Invalid inspection result
    BEGIN
        INSERT INTO test_inspections (
            panel_id, station_id, inspector_id, result
        ) VALUES (
            1, 1, 1, 'INVALID_RESULT'
        );
        
        test_result := 'FAIL'; -- Should fail due to constraint
        error_msg := 'Expected constraint violation';
    EXCEPTION WHEN OTHERS THEN
        test_result := 'PASS'; -- Constraint properly enforced
        error_msg := SQLERRM;
    END;
    
    RETURN QUERY SELECT 
        'Invalid Inspection Result' as test_name,
        'check_inspection_result_valid' as constraint_name,
        test_result,
        'PASS' as expected_result,
        test_result as actual_result,
        error_msg as error_message;
    
    -- Test 3: Failed inspection without notes
    BEGIN
        INSERT INTO test_inspections (
            panel_id, station_id, inspector_id, result, notes
        ) VALUES (
            1, 1, 1, 'FAIL', NULL
        );
        
        test_result := 'FAIL'; -- Should fail due to constraint
        error_msg := 'Expected constraint violation';
    EXCEPTION WHEN OTHERS THEN
        test_result := 'PASS'; -- Constraint properly enforced
        error_msg := SQLERRM;
    END;
    
    RETURN QUERY SELECT 
        'Failed Inspection Without Notes' as test_name,
        'check_failed_inspection_notes' as constraint_name,
        test_result,
        'PASS' as expected_result,
        test_result as actual_result,
        error_msg as error_message;
    
    -- Test 4: Failed inspection with notes
    BEGIN
        INSERT INTO test_inspections (
            panel_id, station_id, inspector_id, result, notes
        ) VALUES (
            1, 1, 1, 'FAIL', 'Quality issue detected'
        );
        
        test_result := 'PASS';
        error_msg := NULL;
    EXCEPTION WHEN OTHERS THEN
        test_result := 'FAIL';
        error_msg := SQLERRM;
    END;
    
    RETURN QUERY SELECT 
        'Failed Inspection With Notes' as test_name,
        'check_failed_inspection_notes' as constraint_name,
        test_result,
        'PASS' as expected_result,
        test_result as actual_result,
        error_msg as error_message;
    
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMPREHENSIVE TEST RUNNER
-- ============================================================================

-- Function to run all constraint tests
CREATE OR REPLACE FUNCTION run_all_constraint_tests() 
RETURNS TABLE (
    test_category TEXT,
    total_tests INTEGER,
    passed_tests INTEGER,
    failed_tests INTEGER,
    success_rate NUMERIC
) AS $$
DECLARE
    panel_results RECORD;
    mo_results RECORD;
    inspection_results RECORD;
    panel_total INTEGER := 0;
    panel_passed INTEGER := 0;
    mo_total INTEGER := 0;
    mo_passed INTEGER := 0;
    inspection_total INTEGER := 0;
    inspection_passed INTEGER := 0;
BEGIN
    -- Run panel constraint tests
    FOR panel_results IN SELECT * FROM test_panel_workflow_constraints() LOOP
        panel_total := panel_total + 1;
        IF panel_results.test_result = 'PASS' THEN
            panel_passed := panel_passed + 1;
        END IF;
        
        -- Log test results
        INSERT INTO test_constraint_results (
            test_name, constraint_name, table_name, test_type, test_result,
            expected_result, actual_result, error_message
        ) VALUES (
            panel_results.test_name, panel_results.constraint_name, 'panels',
            'VALIDATION', panel_results.test_result, panel_results.expected_result,
            panel_results.actual_result, panel_results.error_message
        );
    END LOOP;
    
    -- Run manufacturing order constraint tests
    FOR mo_results IN SELECT * FROM test_manufacturing_order_constraints() LOOP
        mo_total := mo_total + 1;
        IF mo_results.test_result = 'PASS' THEN
            mo_passed := mo_passed + 1;
        END IF;
        
        -- Log test results
        INSERT INTO test_constraint_results (
            test_name, constraint_name, table_name, test_type, test_result,
            expected_result, actual_result, error_message
        ) VALUES (
            mo_results.test_name, mo_results.constraint_name, 'manufacturing_orders',
            'VALIDATION', mo_results.test_result, mo_results.expected_result,
            mo_results.actual_result, mo_results.error_message
        );
    END LOOP;
    
    -- Run inspection constraint tests
    FOR inspection_results IN SELECT * FROM test_inspection_constraints() LOOP
        inspection_total := inspection_total + 1;
        IF inspection_results.test_result = 'PASS' THEN
            inspection_passed := inspection_passed + 1;
        END IF;
        
        -- Log test results
        INSERT INTO test_constraint_results (
            test_name, constraint_name, table_name, test_type, test_result,
            expected_result, actual_result, error_message
        ) VALUES (
            inspection_results.test_name, inspection_results.constraint_name, 'inspections',
            'VALIDATION', inspection_results.test_result, inspection_results.expected_result,
            inspection_results.actual_result, inspection_results.error_message
        );
    END LOOP;
    
    -- Return panel test results
    RETURN QUERY SELECT 
        'Panel Constraints' as test_category,
        panel_total as total_tests,
        panel_passed as passed_tests,
        (panel_total - panel_passed) as failed_tests,
        ROUND((panel_passed::NUMERIC / panel_total) * 100, 1) as success_rate;
    
    -- Return manufacturing order test results
    RETURN QUERY SELECT 
        'Manufacturing Order Constraints' as test_category,
        mo_total as total_tests,
        mo_passed as passed_tests,
        (mo_total - mo_passed) as failed_tests,
        ROUND((mo_passed::NUMERIC / mo_total) * 100, 1) as success_rate;
    
    -- Return inspection test results
    RETURN QUERY SELECT 
        'Inspection Constraints' as test_category,
        inspection_total as total_tests,
        inspection_passed as passed_tests,
        (inspection_total - inspection_passed) as failed_tests,
        ROUND((inspection_passed::NUMERIC / inspection_total) * 100, 1) as success_rate;
    
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TEST RESULTS ANALYSIS
-- ============================================================================

-- View to analyze test results
CREATE OR REPLACE VIEW constraint_test_summary AS
SELECT 
    table_name,
    constraint_name,
    COUNT(*) as total_tests,
    COUNT(CASE WHEN test_result = 'PASS' THEN 1 END) as passed_tests,
    COUNT(CASE WHEN test_result = 'FAIL' THEN 1 END) as failed_tests,
    COUNT(CASE WHEN test_result = 'ERROR' THEN 1 END) as error_tests,
    ROUND(
        (COUNT(CASE WHEN test_result = 'PASS' THEN 1 END)::NUMERIC / COUNT(*)) * 100, 1
    ) as success_rate,
    MAX(test_timestamp) as last_test_run
FROM test_constraint_results
GROUP BY table_name, constraint_name
ORDER BY table_name, success_rate DESC;

-- View to identify failing constraints
CREATE OR REPLACE VIEW failing_constraints AS
SELECT 
    table_name,
    constraint_name,
    COUNT(*) as failure_count,
    STRING_AGG(DISTINCT test_name, ', ') as failed_tests,
    MAX(test_timestamp) as last_failure
FROM test_constraint_results
WHERE test_result = 'FAIL'
GROUP BY table_name, constraint_name
ORDER BY failure_count DESC;

-- ============================================================================
-- EDGE CASE TESTING
-- ============================================================================

-- Function to test edge cases and boundary conditions
CREATE OR REPLACE FUNCTION test_constraint_edge_cases() 
RETURNS TABLE (
    test_name TEXT,
    constraint_name TEXT,
    test_result TEXT,
    expected_result TEXT,
    actual_result TEXT,
    error_message TEXT
) AS $$
DECLARE
    test_result TEXT;
    error_msg TEXT;
BEGIN
    -- Test 1: Maximum valid values
    BEGIN
        INSERT INTO test_panels (
            barcode, panel_type, line_assignment, status, current_station_id,
            wattage_pmax, vmp, imp, manufacturing_order_id, created_by
        ) VALUES (
            'CRS250W3640009', '36', 'LINE_1', 'IN_PROGRESS', 2,
            1000, 100, 20, 1, 1
        );
        
        test_result := 'PASS';
        error_msg := NULL;
    EXCEPTION WHEN OTHERS THEN
        test_result := 'FAIL';
        error_msg := SQLERRM;
    END;
    
    RETURN QUERY SELECT 
        'Maximum Valid Values' as test_name,
        'check_electrical_data_validity' as constraint_name,
        test_result,
        'PASS' as expected_result,
        test_result as actual_result,
        error_msg as error_message;
    
    -- Test 2: Boundary value testing (just over limit)
    BEGIN
        INSERT INTO test_panels (
            barcode, panel_type, line_assignment, status, current_station_id,
            wattage_pmax, vmp, imp, manufacturing_order_id, created_by
        ) VALUES (
            'CRS250W3640010', '36', 'LINE_1', 'IN_PROGRESS', 2,
            1001, 101, 21, 1, 1
        );
        
        test_result := 'FAIL'; -- Should fail due to constraint
        error_msg := 'Expected constraint violation';
    EXCEPTION WHEN OTHERS THEN
        test_result := 'PASS'; -- Constraint properly enforced
        error_msg := SQLERRM;
    END;
    
    RETURN QUERY SELECT 
        'Boundary Value Testing (Over Limit)' as test_name,
        'check_electrical_data_validity' as constraint_name,
        test_result,
        'PASS' as expected_result,
        test_result as actual_result,
        error_msg as error_message;
    
    -- Test 3: Zero values (should fail)
    BEGIN
        INSERT INTO test_panels (
            barcode, panel_type, line_assignment, status, current_station_id,
            wattage_pmax, vmp, imp, manufacturing_order_id, created_by
        ) VALUES (
            'CRS250W3640011', '36', 'LINE_1', 'IN_PROGRESS', 2,
            0, 0, 0, 1, 1
        );
        
        test_result := 'FAIL'; -- Should fail due to constraint
        error_msg := 'Expected constraint violation';
    EXCEPTION WHEN OTHERS THEN
        test_result := 'PASS'; -- Constraint properly enforced
        error_msg := SQLERRM;
    END;
    
    RETURN QUERY SELECT 
        'Zero Values (Should Fail)' as test_name,
        'check_electrical_data_validity' as constraint_name,
        test_result,
        'PASS' as expected_result,
        test_result as actual_result,
        error_msg as error_message;
    
    -- Test 4: Null values in required fields
    BEGIN
        INSERT INTO test_panels (
            barcode, panel_type, line_assignment, status, current_station_id,
            manufacturing_order_id, created_by
        ) VALUES (
            NULL, '36', 'LINE_1', 'PENDING', NULL,
            1, 1
        );
        
        test_result := 'FAIL'; -- Should fail due to constraint
        error_msg := 'Expected constraint violation';
    EXCEPTION WHEN OTHERS THEN
        test_result := 'PASS'; -- Constraint properly enforced
        error_msg := SQLERRM;
    END;
    
    RETURN QUERY SELECT 
        'Null Values in Required Fields' as test_name,
        'check_barcode_format_compliance' as constraint_name,
        test_result,
        'PASS' as expected_result,
        test_result as actual_result,
        error_msg as error_message;
    
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

/*
-- Run all constraint tests
SELECT * FROM run_all_constraint_tests();

-- View test results summary
SELECT * FROM constraint_test_summary;

-- View failing constraints
SELECT * FROM failing_constraints;

-- Run edge case tests
SELECT * FROM test_constraint_edge_cases();

-- View detailed test results
SELECT * FROM test_constraint_results 
ORDER BY test_timestamp DESC;

-- Clean up test data
DELETE FROM test_constraint_results;
DELETE FROM test_panels;
DELETE FROM test_manufacturing_orders;
DELETE FROM test_inspections;
*/

-- ============================================================================
-- CLEANUP (for development/testing)
-- ============================================================================

/*
-- Drop test functions when no longer needed
DROP FUNCTION IF EXISTS test_panel_workflow_constraints();
DROP FUNCTION IF EXISTS test_manufacturing_order_constraints();
DROP FUNCTION IF EXISTS test_inspection_constraints();
DROP FUNCTION IF EXISTS run_all_constraint_tests();
DROP FUNCTION IF EXISTS test_constraint_edge_cases();

-- Drop test views
DROP VIEW IF EXISTS constraint_test_summary;
DROP VIEW IF EXISTS failing_constraints;

-- Drop test tables
DROP TABLE IF EXISTS test_constraint_results;
DROP TABLE IF EXISTS test_panels;
DROP TABLE IF EXISTS test_manufacturing_orders;
DROP TABLE IF EXISTS test_inspections;
*/
