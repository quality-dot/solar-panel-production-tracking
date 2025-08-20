-- Constraint Rollback and Recovery Testing Script
-- Solar Panel Production Tracking System
-- Task 13.30: Rollback and Recovery Testing
-- Created: 2025-01-27

-- This script provides comprehensive testing of constraint rollback procedures,
-- recovery scenarios, and emergency procedures for the manufacturing system.

-- ============================================================================
-- ROLLBACK TESTING INFRASTRUCTURE
-- ============================================================================

-- Create rollback testing results table
CREATE TABLE IF NOT EXISTS rollback_test_results (
    id SERIAL PRIMARY KEY,
    test_name TEXT NOT NULL,
    test_type TEXT NOT NULL, -- 'ROLLBACK', 'RECOVERY', 'EMERGENCY'
    constraint_name TEXT NOT NULL,
    table_name TEXT NOT NULL,
    test_result TEXT NOT NULL, -- 'PASS', 'FAIL', 'ERROR'
    rollback_duration_ms INTEGER,
    recovery_duration_ms INTEGER,
    data_integrity_status TEXT,
    system_functionality_status TEXT,
    error_message TEXT,
    test_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Create backup tables for rollback testing
CREATE TABLE IF NOT EXISTS backup_panels AS SELECT * FROM panels LIMIT 0;
CREATE TABLE IF NOT EXISTS backup_manufacturing_orders AS SELECT * FROM panels LIMIT 0;
CREATE TABLE IF NOT EXISTS backup_inspections AS SELECT * FROM panels LIMIT 0;

-- Create rollback configuration table
CREATE TABLE IF NOT EXISTS rollback_config (
    id SERIAL PRIMARY KEY,
    constraint_name TEXT NOT NULL,
    table_name TEXT NOT NULL,
    rollback_priority INTEGER DEFAULT 1, -- 1=highest, 5=lowest
    rollback_method TEXT NOT NULL, -- 'DROP_CONSTRAINT', 'DISABLE_TRIGGER', 'MODIFY_CONSTRAINT'
    rollback_script TEXT NOT NULL,
    recovery_script TEXT NOT NULL,
    estimated_duration_ms INTEGER DEFAULT 1000,
    risk_level TEXT DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(constraint_name, table_name)
);

-- ============================================================================
-- ROLLBACK PROCEDURE FUNCTIONS
-- ============================================================================

-- Function to safely rollback a specific constraint
CREATE OR REPLACE FUNCTION rollback_constraint(
    p_constraint_name TEXT,
    p_table_name TEXT,
    p_rollback_method TEXT DEFAULT 'DROP_CONSTRAINT'
) RETURNS TABLE (
    operation TEXT,
    status TEXT,
    duration_ms INTEGER,
    error_message TEXT
) AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    rollback_script TEXT;
    recovery_script TEXT;
    constraint_exists BOOLEAN;
    trigger_exists BOOLEAN;
BEGIN
    start_time := CURRENT_TIMESTAMP;
    
    -- Check if constraint exists
    SELECT EXISTS(
        SELECT 1 FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        JOIN pg_class t ON t.oid = c.conrelid
        WHERE n.nspname = 'public'
          AND t.relname = p_table_name
          AND c.conname LIKE '%' || p_constraint_name || '%'
    ) INTO constraint_exists;
    
    -- Check if trigger exists
    SELECT EXISTS(
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = p_table_name
          AND t.tgname LIKE '%' || p_constraint_name || '%'
    ) INTO trigger_exists;
    
    IF NOT constraint_exists AND NOT trigger_exists THEN
        RETURN QUERY SELECT 
            'Constraint Check' as operation,
            'FAIL' as status,
            0 as duration_ms,
            'Constraint or trigger not found: ' || p_constraint_name as error_message;
        RETURN;
    END IF;
    
    -- Perform rollback based on method
    CASE p_rollback_method
        WHEN 'DROP_CONSTRAINT' THEN
            IF constraint_exists THEN
                BEGIN
                    -- Get rollback script from config
                    SELECT rollback_script INTO rollback_script
                    FROM rollback_config
                    WHERE constraint_name LIKE '%' || p_constraint_name || '%'
                      AND table_name = p_table_name;
                    
                    IF rollback_script IS NOT NULL THEN
                        EXECUTE rollback_script;
                    ELSE
                        -- Default rollback for check constraints
                        EXECUTE 'ALTER TABLE ' || p_table_name || ' DROP CONSTRAINT IF EXISTS ' || 
                                (SELECT conname FROM pg_constraint c
                                 JOIN pg_namespace n ON n.oid = c.connamespace
                                 JOIN pg_class t ON t.oid = c.conrelid
                                 WHERE n.nspname = 'public'
                                   AND t.relname = p_table_name
                                   AND c.conname LIKE '%' || p_constraint_name || '%'
                                 LIMIT 1);
                    END IF;
                    
                    RETURN QUERY SELECT 
                        'Drop Constraint' as operation,
                        'PASS' as status,
                        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time)) * 1000 as duration_ms,
                        NULL as error_message;
                EXCEPTION WHEN OTHERS THEN
                    RETURN QUERY SELECT 
                        'Drop Constraint' as operation,
                        'FAIL' as status,
                        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time)) * 1000 as duration_ms,
                        SQLERRM as error_message;
                END;
            ELSE
                RETURN QUERY SELECT 
                    'Drop Constraint' as operation,
                    'FAIL' as status,
                    0 as duration_ms,
                    'No constraint found to drop' as error_message;
            END IF;
            
        WHEN 'DISABLE_TRIGGER' THEN
            IF trigger_exists THEN
                BEGIN
                    EXECUTE 'ALTER TABLE ' || p_table_name || ' DISABLE TRIGGER ALL';
                    
                    RETURN QUERY SELECT 
                        'Disable Trigger' as operation,
                        'PASS' as status,
                        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time)) * 1000 as duration_ms,
                        NULL as error_message;
                EXCEPTION WHEN OTHERS THEN
                    RETURN QUERY SELECT 
                        'Disable Trigger' as operation,
                        'FAIL' as status,
                        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time)) * 1000 as duration_ms,
                        SQLERRM as error_message;
                END;
            ELSE
                RETURN QUERY SELECT 
                    'Disable Trigger' as operation,
                    'FAIL' as status,
                    0 as duration_ms,
                    'No trigger found to disable' as error_message;
            END IF;
            
        ELSE
            RETURN QUERY SELECT 
                'Invalid Method' as operation,
                'FAIL' as status,
                0 as duration_ms,
                'Invalid rollback method: ' || p_rollback_method as error_message;
    END CASE;
    
END;
$$ LANGUAGE plpgsql;

-- Function to recover a rolled back constraint
CREATE OR REPLACE FUNCTION recover_constraint(
    p_constraint_name TEXT,
    p_table_name TEXT
) RETURNS TABLE (
    operation TEXT,
    status TEXT,
    duration_ms INTEGER,
    error_message TEXT
) AS $$
DECLARE
    start_time TIMESTAMP;
    recovery_script TEXT;
BEGIN
    start_time := CURRENT_TIMESTAMP;
    
    -- Get recovery script from config
    SELECT recovery_script INTO recovery_script
    FROM rollback_config
    WHERE constraint_name LIKE '%' || p_constraint_name || '%'
      AND table_name = p_table_name;
    
    IF recovery_script IS NULL THEN
        RETURN QUERY SELECT 
            'Recovery Script' as operation,
            'FAIL' as status,
            0 as duration_ms,
            'No recovery script found for constraint: ' || p_constraint_name as error_message;
        RETURN;
    END IF;
    
    BEGIN
        -- Execute recovery script
        EXECUTE recovery_script;
        
        RETURN QUERY SELECT 
            'Recover Constraint' as operation,
            'PASS' as status,
            EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time)) * 1000 as duration_ms,
            NULL as error_message;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 
            'Recover Constraint' as operation,
            'FAIL' as status,
            EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time)) * 1000 as duration_ms,
            SQLERRM as error_message;
    END;
    
END;
$$ LANGUAGE plpgsql;

-- Function to test emergency rollback procedures
CREATE OR REPLACE FUNCTION test_emergency_rollback() 
RETURNS TABLE (
    test_name TEXT,
    constraint_name TEXT,
    table_name TEXT,
    rollback_status TEXT,
    recovery_status TEXT,
    data_integrity_status TEXT,
    system_functionality_status TEXT,
    total_duration_ms INTEGER
) AS $$
DECLARE
    rollback_rec RECORD;
    recovery_rec RECORD;
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    rollback_duration INTEGER;
    recovery_duration INTEGER;
    data_integrity TEXT;
    system_functionality TEXT;
BEGIN
    start_time := CURRENT_TIMESTAMP;
    
    -- Test rollback of critical constraints
    FOR rollback_rec IN 
        SELECT constraint_name, table_name, rollback_method
        FROM rollback_config
        WHERE rollback_priority <= 2  -- High priority constraints
        ORDER BY rollback_priority, constraint_name
    LOOP
        -- Perform rollback
        SELECT * INTO rollback_rec FROM rollback_constraint(
            rollback_rec.constraint_name, 
            rollback_rec.table_name, 
            rollback_rec.rollback_method
        );
        
        rollback_duration := rollback_rec.duration_ms;
        
        -- Test data integrity after rollback
        data_integrity := test_data_integrity(rollback_rec.table_name);
        
        -- Test system functionality after rollback
        system_functionality := test_system_functionality(rollback_rec.table_name);
        
        -- Perform recovery
        SELECT * INTO recovery_rec FROM recover_constraint(
            rollback_rec.constraint_name, 
            rollback_rec.table_name
        );
        
        recovery_duration := recovery_rec.duration_ms;
        
        -- Log test results
        INSERT INTO rollback_test_results (
            test_name, test_type, constraint_name, table_name, test_result,
            rollback_duration_ms, recovery_duration_ms, data_integrity_status,
            system_functionality_status
        ) VALUES (
            'Emergency Rollback Test', 'EMERGENCY', rollback_rec.constraint_name,
            rollback_rec.table_name, 
            CASE 
                WHEN rollback_rec.status = 'PASS' AND recovery_rec.status = 'PASS' THEN 'PASS'
                ELSE 'FAIL'
            END,
            rollback_duration, recovery_duration, data_integrity, system_functionality
        );
        
        -- Return test results
        RETURN QUERY SELECT 
            'Emergency Rollback Test' as test_name,
            rollback_rec.constraint_name,
            rollback_rec.table_name,
            rollback_rec.status as rollback_status,
            recovery_rec.status as recovery_status,
            data_integrity,
            system_functionality,
            (rollback_duration + recovery_duration) as total_duration_ms;
    END LOOP;
    
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DATA INTEGRITY TESTING FUNCTIONS
-- ============================================================================

-- Function to test data integrity after constraint rollback
CREATE OR REPLACE FUNCTION test_data_integrity(p_table_name TEXT) 
RETURNS TEXT AS $$
DECLARE
    integrity_score INTEGER := 0;
    total_checks INTEGER := 0;
    check_result TEXT;
BEGIN
    total_checks := 0;
    
    -- Test 1: Check for orphaned records
    IF p_table_name = 'panels' THEN
        total_checks := total_checks + 1;
        IF NOT EXISTS (
            SELECT 1 FROM panels p
            LEFT JOIN manufacturing_orders mo ON p.manufacturing_order_id = mo.id
            WHERE mo.id IS NULL AND p.manufacturing_order_id IS NOT NULL
        ) THEN
            integrity_score := integrity_score + 1;
        END IF;
    END IF;
    
    -- Test 2: Check for duplicate records
    total_checks := total_checks + 1;
    IF NOT EXISTS (
        SELECT 1 FROM (
            SELECT barcode, COUNT(*) as cnt
            FROM panels
            GROUP BY barcode
            HAVING COUNT(*) > 1
        ) dups
    ) THEN
        integrity_score := integrity_score + 1;
    END IF;
    
    -- Test 3: Check for invalid data ranges
    total_checks := total_checks + 1;
    IF NOT EXISTS (
        SELECT 1 FROM panels
        WHERE (wattage_pmax IS NOT NULL AND wattage_pmax <= 0) OR
              (vmp IS NOT NULL AND vmp <= 0) OR
              (imp IS NOT NULL AND imp <= 0)
    ) THEN
        integrity_score := integrity_score + 1;
    END IF;
    
    -- Calculate integrity percentage
    IF total_checks = 0 THEN
        RETURN 'UNKNOWN';
    END IF;
    
    check_result := ROUND((integrity_score::NUMERIC / total_checks) * 100, 0);
    
    RETURN CASE 
        WHEN check_result >= 90 THEN 'EXCELLENT'
        WHEN check_result >= 75 THEN 'GOOD'
        WHEN check_result >= 50 THEN 'FAIR'
        ELSE 'POOR'
    END;
    
END;
$$ LANGUAGE plpgsql;

-- Function to test system functionality after constraint rollback
CREATE OR REPLACE FUNCTION test_system_functionality(p_table_name TEXT) 
RETURNS TEXT AS $$
DECLARE
    functionality_score INTEGER := 0;
    total_checks INTEGER := 0;
    check_result TEXT;
BEGIN
    total_checks := 0;
    
    -- Test 1: Basic CRUD operations
    total_checks := total_checks + 1;
    BEGIN
        IF p_table_name = 'panels' THEN
            -- Test insert
            INSERT INTO panels (
                barcode, panel_type, line_assignment, status, 
                manufacturing_order_id, created_by
            ) VALUES (
                'TEST_BARCODE_001', '36', 'LINE_1', 'PENDING', 1, 1
            );
            
            -- Test update
            UPDATE panels SET status = 'IN_PROGRESS' WHERE barcode = 'TEST_BARCODE_001';
            
            -- Test select
            IF EXISTS (SELECT 1 FROM panels WHERE barcode = 'TEST_BARCODE_001') THEN
                functionality_score := functionality_score + 1;
            END IF;
            
            -- Cleanup
            DELETE FROM panels WHERE barcode = 'TEST_BARCODE_001';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Functionality test failed
        NULL;
    END;
    
    -- Test 2: Query performance
    total_checks := total_checks + 1;
    BEGIN
        IF p_table_name = 'panels' THEN
            -- Test basic query performance
            IF EXISTS (
                SELECT 1 FROM panels 
                WHERE status = 'PENDING' 
                LIMIT 1
            ) THEN
                functionality_score := functionality_score + 1;
            END IF;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Query test failed
        NULL;
    END;
    
    -- Test 3: Business logic validation
    total_checks := total_checks + 1;
    BEGIN
        IF p_table_name = 'panels' THEN
            -- Test basic business logic
            IF EXISTS (
                SELECT 1 FROM panels 
                WHERE panel_type IN ('36', '40', '60', '72', '144')
                LIMIT 1
            ) THEN
                functionality_score := functionality_score + 1;
            END IF;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Business logic test failed
        NULL;
    END;
    
    -- Calculate functionality percentage
    IF total_checks = 0 THEN
        RETURN 'UNKNOWN';
    END IF;
    
    check_result := ROUND((functionality_score::NUMERIC / total_checks) * 100, 0);
    
    RETURN CASE 
        WHEN check_result >= 90 THEN 'EXCELLENT'
        WHEN check_result >= 75 THEN 'GOOD'
        WHEN check_result >= 50 THEN 'FAIR'
        ELSE 'POOR'
    END;
    
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMPREHENSIVE ROLLBACK TESTING
-- ============================================================================

-- Function to run comprehensive rollback testing
CREATE OR REPLACE FUNCTION run_comprehensive_rollback_tests() 
RETURNS TABLE (
    test_category TEXT,
    total_tests INTEGER,
    passed_tests INTEGER,
    failed_tests INTEGER,
    success_rate NUMERIC,
    avg_rollback_duration_ms NUMERIC,
    avg_recovery_duration_ms NUMERIC
) AS $$
DECLARE
    test_rec RECORD;
    rollback_total INTEGER := 0;
    rollback_passed INTEGER := 0;
    recovery_total INTEGER := 0;
    recovery_passed INTEGER := 0;
    emergency_total INTEGER := 0;
    emergency_passed INTEGER := 0;
    rollback_duration_sum INTEGER := 0;
    recovery_duration_sum INTEGER := 0;
    duration_count INTEGER := 0;
BEGIN
    -- Test 1: Individual constraint rollbacks
    FOR test_rec IN 
        SELECT constraint_name, table_name, rollback_method
        FROM rollback_config
        ORDER BY rollback_priority, constraint_name
    LOOP
        rollback_total := rollback_total + 1;
        
        -- Test rollback
        SELECT * INTO test_rec FROM rollback_constraint(
            test_rec.constraint_name, 
            test_rec.table_name, 
            test_rec.rollback_method
        );
        
        IF test_rec.status = 'PASS' THEN
            rollback_passed := rollback_passed + 1;
        END IF;
        
        rollback_duration_sum := rollback_duration_sum + test_rec.duration_ms;
        duration_count := duration_count + 1;
        
        -- Test recovery
        SELECT * INTO test_rec FROM recover_constraint(
            test_rec.constraint_name, 
            test_rec.table_name
        );
        
        recovery_total := recovery_total + 1;
        
        IF test_rec.status = 'PASS' THEN
            recovery_passed := recovery_passed + 1;
        END IF;
        
        recovery_duration_sum := recovery_duration_sum + test_rec.duration_ms;
    END LOOP;
    
    -- Test 2: Emergency rollback procedures
    SELECT * INTO test_rec FROM test_emergency_rollback();
    
    emergency_total := 1;
    IF test_rec.rollback_status = 'PASS' AND test_rec.recovery_status = 'PASS' THEN
        emergency_passed := 1;
    END IF;
    
    -- Return rollback test results
    RETURN QUERY SELECT 
        'Rollback Tests' as test_category,
        rollback_total as total_tests,
        rollback_passed as passed_tests,
        (rollback_total - rollback_passed) as failed_tests,
        ROUND((rollback_passed::NUMERIC / rollback_total) * 100, 1) as success_rate,
        CASE WHEN duration_count > 0 THEN ROUND(rollback_duration_sum::NUMERIC / duration_count, 0) ELSE 0 END as avg_rollback_duration_ms,
        CASE WHEN duration_count > 0 THEN ROUND(recovery_duration_sum::NUMERIC / duration_count, 0) ELSE 0 END as avg_recovery_duration_ms;
    
    -- Return recovery test results
    RETURN QUERY SELECT 
        'Recovery Tests' as test_category,
        recovery_total as total_tests,
        recovery_passed as passed_tests,
        (recovery_total - recovery_passed) as failed_tests,
        ROUND((recovery_passed::NUMERIC / recovery_total) * 100, 1) as success_rate,
        0 as avg_rollback_duration_ms,
        CASE WHEN duration_count > 0 THEN ROUND(recovery_duration_sum::NUMERIC / duration_count, 0) ELSE 0 END as avg_recovery_duration_ms;
    
    -- Return emergency test results
    RETURN QUERY SELECT 
        'Emergency Procedures' as test_category,
        emergency_total as total_tests,
        emergency_passed as passed_tests,
        (emergency_total - emergency_passed) as failed_tests,
        ROUND((emergency_passed::NUMERIC / emergency_total) * 100, 1) as success_rate,
        0 as avg_rollback_duration_ms,
        0 as avg_recovery_duration_ms;
    
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROLLBACK CONFIGURATION DATA
-- ============================================================================

-- Insert rollback configuration for all constraints
INSERT INTO rollback_config (
    constraint_name, table_name, rollback_priority, rollback_method, 
    rollback_script, recovery_script, estimated_duration_ms, risk_level
) VALUES 
    -- High Priority Constraints (Critical for production)
    ('workflow_progression', 'panels', 1, 'DROP_CONSTRAINT',
     'ALTER TABLE panels DROP CONSTRAINT IF EXISTS check_workflow_progression;',
     'ALTER TABLE panels ADD CONSTRAINT check_workflow_progression CHECK ((status = ''PENDING'' AND current_station_id IS NULL) OR (status = ''IN_PROGRESS'' AND current_station_id IS NOT NULL) OR (status = ''COMPLETED'' AND current_station_id IS NOT NULL AND station_1_completed_at IS NOT NULL AND station_2_completed_at IS NOT NULL AND station_3_completed_at IS NOT NULL AND station_4_completed_at IS NOT NULL) OR (status = ''FAILED'' AND current_station_id IS NOT NULL) OR (status = ''REWORK'' AND current_station_id IS NOT NULL));',
     500, 'HIGH'),
     
    ('barcode_format', 'panels', 1, 'DROP_CONSTRAINT',
     'ALTER TABLE panels DROP CONSTRAINT IF EXISTS check_barcode_format_compliance;',
     'ALTER TABLE panels ADD CONSTRAINT check_barcode_format_compliance CHECK (barcode ~ ''^CRS[0-9]{2}[WB][TWB](36|40|60|72|144)[0-9]{5}$'');',
     300, 'MEDIUM'),
     
    ('electrical_data', 'panels', 2, 'DROP_CONSTRAINT',
     'ALTER TABLE panels DROP CONSTRAINT IF EXISTS check_completed_panel_electrical_data;',
     'ALTER TABLE panels ADD CONSTRAINT check_completed_panel_electrical_data CHECK ((status != ''COMPLETED'') OR (status = ''COMPLETED'' AND wattage_pmax IS NOT NULL AND vmp IS NOT NULL AND imp IS NOT NULL));',
     400, 'MEDIUM'),
     
    ('station_progression', 'inspections', 2, 'DROP_CONSTRAINT',
     'ALTER TABLE inspections DROP CONSTRAINT IF EXISTS check_station_progression;',
     'ALTER TABLE inspections ADD CONSTRAINT check_station_progression CHECK ((station_id = 1) OR (station_id = 2 AND EXISTS (SELECT 1 FROM inspections i2 WHERE i2.panel_id = panel_id AND i2.station_id = 1 AND i2.result = ''PASS'')) OR (station_id = 3 AND EXISTS (SELECT 1 FROM inspections i2 WHERE i2.panel_id = panel_id AND i2.station_id = 2 AND i2.result = ''PASS'')) OR (station_id = 4 AND EXISTS (SELECT 1 FROM inspections i2 WHERE i2.panel_id = panel_id AND i2.station_id = 3 AND i2.result = ''PASS'')));',
     600, 'HIGH'),
     
    ('completion_consistency', 'manufacturing_orders', 2, 'DROP_CONSTRAINT',
     'ALTER TABLE manufacturing_orders DROP CONSTRAINT IF EXISTS check_mo_completion_consistency;',
     'ALTER TABLE manufacturing_orders ADD CONSTRAINT check_mo_completion_consistency CHECK ((status != ''COMPLETED'') OR (status = ''COMPLETED'' AND panels_completed = quantity));',
     400, 'MEDIUM'),
     
    -- Medium Priority Constraints
    ('panel_type_line', 'panels', 3, 'DROP_CONSTRAINT',
     'ALTER TABLE panels DROP CONSTRAINT IF EXISTS check_panel_type_line_assignment;',
     'ALTER TABLE panels ADD CONSTRAINT check_panel_type_line_assignment CHECK ((line_assignment = ''LINE_1'' AND panel_type IN (''36'', ''40'', ''60'', ''72'')) OR (line_assignment = ''LINE_2'' AND panel_type = ''144''));',
     300, 'LOW'),
     
    ('pallet_capacity', 'pallets', 3, 'DROP_CONSTRAINT',
     'ALTER TABLE pallets DROP CONSTRAINT IF EXISTS check_pallet_assignment_capacity;',
     'ALTER TABLE pallets ADD CONSTRAINT check_pallet_assignment_capacity CHECK (panels_assigned <= capacity);',
     300, 'LOW'),
     
    -- Low Priority Constraints
    ('email_format', 'users', 4, 'DROP_CONSTRAINT',
     'ALTER TABLE users DROP CONSTRAINT IF EXISTS check_email_format;',
     'ALTER TABLE users ADD CONSTRAINT check_email_format CHECK (email ~ ''^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'');',
     200, 'LOW'),
     
    ('station_number', 'stations', 4, 'DROP_CONSTRAINT',
     'ALTER TABLE stations DROP CONSTRAINT IF EXISTS check_station_number_valid;',
     'ALTER TABLE stations ADD CONSTRAINT check_station_number_valid CHECK (station_number >= 1 AND station_number <= 8);',
     200, 'LOW'),
     
    -- Trigger-based Constraints
    ('panel_completion_trigger', 'panels', 1, 'DISABLE_TRIGGER',
     'ALTER TABLE panels DISABLE TRIGGER trigger_enforce_panel_completion;',
     'ALTER TABLE panels ENABLE TRIGGER trigger_enforce_panel_completion;',
     100, 'HIGH'),
     
    ('mo_completion_trigger', 'manufacturing_orders', 1, 'DISABLE_TRIGGER',
     'ALTER TABLE manufacturing_orders DISABLE TRIGGER trigger_enforce_mo_completion;',
     'ALTER TABLE manufacturing_orders ENABLE TRIGGER trigger_enforce_mo_completion;',
     100, 'HIGH'),
     
    ('pallet_completion_trigger', 'pallets', 2, 'DISABLE_TRIGGER',
     'ALTER TABLE pallets DISABLE TRIGGER trigger_enforce_pallet_completion;',
     'ALTER TABLE pallets ENABLE TRIGGER trigger_enforce_pallet_completion;',
     100, 'MEDIUM')
ON CONFLICT (constraint_name, table_name) DO NOTHING;

-- ============================================================================
-- ROLLBACK TESTING VIEWS
-- ============================================================================

-- View to analyze rollback test results
CREATE OR REPLACE VIEW rollback_test_summary AS
SELECT 
    test_type,
    COUNT(*) as total_tests,
    COUNT(CASE WHEN test_result = 'PASS' THEN 1 END) as passed_tests,
    COUNT(CASE WHEN test_result = 'FAIL' THEN 1 END) as failed_tests,
    ROUND(
        (COUNT(CASE WHEN test_result = 'PASS' THEN 1 END)::NUMERIC / COUNT(*)) * 100, 1
    ) as success_rate,
    AVG(rollback_duration_ms) as avg_rollback_duration_ms,
    AVG(recovery_duration_ms) as avg_recovery_duration_ms,
    MAX(test_timestamp) as last_test_run
FROM rollback_test_results
GROUP BY test_type
ORDER BY test_type;

-- View to identify rollback issues
CREATE OR REPLACE VIEW rollback_issues AS
SELECT 
    constraint_name,
    table_name,
    test_type,
    COUNT(*) as failure_count,
    STRING_AGG(DISTINCT test_name, ', ') as failed_tests,
    MAX(test_timestamp) as last_failure,
    AVG(rollback_duration_ms) as avg_rollback_duration_ms,
    AVG(recovery_duration_ms) as avg_recovery_duration_ms
FROM rollback_test_results
WHERE test_result = 'FAIL'
GROUP BY constraint_name, table_name, test_type
ORDER BY failure_count DESC;

-- View to assess rollback risk levels
CREATE OR REPLACE VIEW rollback_risk_assessment AS
SELECT 
    rc.constraint_name,
    rc.table_name,
    rc.rollback_priority,
    rc.risk_level,
    rc.estimated_duration_ms,
    COALESCE(rtr.avg_rollback_duration_ms, 0) as actual_rollback_duration_ms,
    COALESCE(rtr.avg_recovery_duration_ms, 0) as actual_recovery_duration_ms,
    CASE 
        WHEN rc.estimated_duration_ms < COALESCE(rtr.avg_rollback_duration_ms, 0) THEN 'HIGHER_THAN_ESTIMATED'
        WHEN rc.estimated_duration_ms > COALESCE(rtr.avg_rollback_duration_ms, 0) THEN 'LOWER_THAN_ESTIMATED'
        ELSE 'AS_ESTIMATED'
    END as duration_accuracy,
    CASE 
        WHEN rc.risk_level = 'CRITICAL' THEN '🔴 CRITICAL'
        WHEN rc.risk_level = 'HIGH' THEN '🟠 HIGH'
        WHEN rc.risk_level = 'MEDIUM' THEN '🟡 MEDIUM'
        ELSE '🟢 LOW'
    END as risk_indicator
FROM rollback_config rc
LEFT JOIN (
    SELECT 
        constraint_name,
        table_name,
        AVG(rollback_duration_ms) as avg_rollback_duration_ms,
        AVG(recovery_duration_ms) as avg_recovery_duration_ms
    FROM rollback_test_results
    GROUP BY constraint_name, table_name
) rtr ON rc.constraint_name LIKE '%' || rtr.constraint_name || '%' 
    AND rc.table_name = rtr.table_name
ORDER BY rc.rollback_priority, rc.risk_level;

-- ============================================================================
-- EMERGENCY ROLLBACK PROCEDURES
-- ============================================================================

-- Function to execute emergency rollback for critical constraints
CREATE OR REPLACE FUNCTION emergency_rollback_critical_constraints() 
RETURNS TABLE (
    constraint_name TEXT,
    table_name TEXT,
    rollback_status TEXT,
    duration_ms INTEGER,
    error_message TEXT
) AS $$
DECLARE
    constraint_rec RECORD;
    start_time TIMESTAMP;
    rollback_result RECORD;
BEGIN
    -- Rollback all critical constraints
    FOR constraint_rec IN 
        SELECT constraint_name, table_name, rollback_method
        FROM rollback_config
        WHERE rollback_priority = 1  -- Critical priority
        ORDER BY constraint_name
    LOOP
        start_time := CURRENT_TIMESTAMP;
        
        -- Execute rollback
        SELECT * INTO rollback_result FROM rollback_constraint(
            constraint_rec.constraint_name,
            constraint_rec.table_name,
            constraint_rec.rollback_method
        );
        
        -- Return result
        RETURN QUERY SELECT 
            constraint_rec.constraint_name,
            constraint_rec.table_name,
            rollback_result.status,
            rollback_result.duration_ms,
            rollback_result.error_message;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to execute emergency rollback for all constraints
CREATE OR REPLACE FUNCTION emergency_rollback_all_constraints() 
RETURNS TABLE (
    constraint_name TEXT,
    table_name TEXT,
    rollback_status TEXT,
    duration_ms INTEGER,
    error_message TEXT
) AS $$
DECLARE
    constraint_rec RECORD;
    start_time TIMESTAMP;
    rollback_result RECORD;
BEGIN
    -- Rollback all constraints by priority
    FOR constraint_rec IN 
        SELECT constraint_name, table_name, rollback_method
        FROM rollback_config
        ORDER BY rollback_priority, constraint_name
    LOOP
        start_time := CURRENT_TIMESTAMP;
        
        -- Execute rollback
        SELECT * INTO rollback_result FROM rollback_constraint(
            constraint_rec.constraint_name,
            constraint_rec.table_name,
            constraint_rec.rollback_method
        );
        
        -- Return result
        RETURN QUERY SELECT 
            constraint_rec.constraint_name,
            constraint_rec.table_name,
            rollback_result.status,
            rollback_result.duration_ms,
            rollback_result.error_message;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

/*
-- Run comprehensive rollback testing
SELECT * FROM run_comprehensive_rollback_tests();

-- Test emergency rollback procedures
SELECT * FROM test_emergency_rollback();

-- Execute emergency rollback for critical constraints
SELECT * FROM emergency_rollback_critical_constraints();

-- Execute emergency rollback for all constraints
SELECT * FROM emergency_rollback_all_constraints();

-- View rollback test results
SELECT * FROM rollback_test_summary;

-- View rollback issues
SELECT * FROM rollback_issues;

-- View risk assessment
SELECT * FROM rollback_risk_assessment;

-- Test individual constraint rollback
SELECT * FROM rollback_constraint('workflow_progression', 'panels', 'DROP_CONSTRAINT');

-- Test constraint recovery
SELECT * FROM recover_constraint('workflow_progression', 'panels');

-- View detailed test results
SELECT * FROM rollback_test_results ORDER BY test_timestamp DESC;
*/

-- ============================================================================
-- CLEANUP (for development/testing)
-- ============================================================================

/*
-- Drop rollback testing functions
DROP FUNCTION IF EXISTS rollback_constraint(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS recover_constraint(TEXT, TEXT);
DROP FUNCTION IF EXISTS test_emergency_rollback();
DROP FUNCTION IF EXISTS test_data_integrity(TEXT);
DROP FUNCTION IF EXISTS test_system_functionality(TEXT);
DROP FUNCTION IF EXISTS run_comprehensive_rollback_tests();
DROP FUNCTION IF EXISTS emergency_rollback_critical_constraints();
DROP FUNCTION IF EXISTS emergency_rollback_all_constraints();

-- Drop rollback testing views
DROP VIEW IF EXISTS rollback_test_summary;
DROP VIEW IF EXISTS rollback_issues;
DROP VIEW IF EXISTS rollback_risk_assessment;

-- Drop rollback testing tables
DROP TABLE IF EXISTS rollback_test_results;
DROP TABLE IF EXISTS backup_panels;
DROP TABLE IF EXISTS backup_manufacturing_orders;
DROP TABLE IF EXISTS backup_inspections;
DROP TABLE IF EXISTS rollback_config;
*/
