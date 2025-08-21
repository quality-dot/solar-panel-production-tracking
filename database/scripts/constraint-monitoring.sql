-- Constraint Monitoring Script
-- Solar Panel Production Tracking System
-- Task 13.29: Constraint Documentation and Monitoring
-- Created: 2025-01-27

-- This script provides comprehensive monitoring and health checks
-- for all database constraints in the manufacturing system.

-- ============================================================================
-- CONSTRAINT HEALTH MONITORING
-- ============================================================================

-- Create a comprehensive constraint health dashboard
CREATE OR REPLACE VIEW constraint_health_dashboard AS
WITH constraint_status AS (
    -- Check constraint existence and status
    SELECT 
        schemaname,
        tablename,
        constraintname,
        contype,
        CASE 
            WHEN contype = 'p' THEN 'PRIMARY KEY'
            WHEN contype = 'f' THEN 'FOREIGN KEY'
            WHEN contype = 'u' THEN 'UNIQUE'
            WHEN contype = 'c' THEN 'CHECK'
            ELSE 'OTHER'
        END as constraint_type,
        CASE 
            WHEN contype = 'c' THEN pg_get_constraintdef(oid)
            ELSE 'N/A'
        END as constraint_definition
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE n.nspname = 'public'
      AND t.relname IN ('panels', 'manufacturing_orders', 'inspections', 
                        'pallets', 'pallet_assignments', 'stations', 'users',
                        'station_criteria_configurations', 'inspection_criteria_results')
),
constraint_violations AS (
    -- Count potential constraint violations
    SELECT 
        'panels' as table_name,
        'workflow_progression' as constraint_name,
        COUNT(*) as violation_count,
        'Panels with invalid workflow status' as description
    FROM panels 
    WHERE NOT (
        (status = 'PENDING' AND current_station_id IS NULL) OR
        (status = 'IN_PROGRESS' AND current_station_id IS NOT NULL) OR
        (status = 'COMPLETED' AND current_station_id IS NOT NULL AND 
         station_1_completed_at IS NOT NULL AND
         station_2_completed_at IS NOT NULL AND
         station_3_completed_at IS NOT NULL AND
         station_4_completed_at IS NOT NULL) OR
        (status = 'FAILED' AND current_station_id IS NOT NULL) OR
        (status = 'REWORK' AND current_station_id IS NOT NULL)
    )
    
    UNION ALL
    
    SELECT 
        'panels' as table_name,
        'barcode_format' as constraint_name,
        COUNT(*) as violation_count,
        'Panels with invalid barcode format' as description
    FROM panels 
    WHERE barcode !~ '^CRS[0-9]{2}[WB][TWB](36|40|60|72|144)[0-9]{5}$'
    
    UNION ALL
    
    SELECT 
        'panels' as table_name,
        'electrical_data_complete' as constraint_name,
        COUNT(*) as violation_count,
        'Completed panels missing electrical data' as description
    FROM panels 
    WHERE status = 'COMPLETED' AND 
          (wattage_pmax IS NULL OR vmp IS NULL OR imp IS NULL)
    
    UNION ALL
    
    SELECT 
        'inspections' as table_name,
        'station_progression' as constraint_name,
        COUNT(*) as violation_count,
        'Inspections violating station progression' as description
    FROM inspections i
    WHERE (station_id = 2 AND NOT EXISTS (
            SELECT 1 FROM inspections i2 
            WHERE i2.panel_id = i.panel_id AND i2.station_id = 1 AND i2.result = 'PASS'
        )) OR
        (station_id = 3 AND NOT EXISTS (
            SELECT 1 FROM inspections i2 
            WHERE i2.panel_id = i.panel_id AND i2.station_id = 2 AND i2.result = 'PASS'
        )) OR
        (station_id = 4 AND NOT EXISTS (
            SELECT 1 FROM inspections i2 
            WHERE i2.panel_id = i.panel_id AND i2.station_id = 3 AND i2.result = 'PASS'
        ))
    
    UNION ALL
    
    SELECT 
        'manufacturing_orders' as table_name,
        'completion_consistency' as constraint_name,
        COUNT(*) as violation_count,
        'MOs marked complete with incomplete panels' as description
    FROM manufacturing_orders 
    WHERE status = 'COMPLETED' AND panels_completed < quantity
    
    UNION ALL
    
    SELECT 
        'pallets' as table_name,
        'capacity_exceeded' as constraint_name,
        COUNT(*) as violation_count,
        'Pallets exceeding assigned capacity' as description
    FROM pallets 
    WHERE panels_assigned > capacity
),
constraint_performance AS (
    -- Monitor constraint performance impact
    SELECT 
        'foreign_key_queries' as metric_name,
        COUNT(*) as query_count,
        AVG(EXTRACT(EPOCH FROM (query_end_time - query_start_time))) as avg_duration_ms
    FROM pg_stat_statements 
    WHERE query LIKE '%JOIN%' AND query LIKE '%panels%'
      AND query_start_time >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
)
SELECT 
    cs.schemaname,
    cs.tablename,
    cs.constraintname,
    cs.constraint_type,
    cs.constraint_definition,
    COALESCE(cv.violation_count, 0) as violation_count,
    COALESCE(cv.description, 'No violations detected') as violation_description,
    CASE 
        WHEN COALESCE(cv.violation_count, 0) = 0 THEN 'HEALTHY'
        WHEN COALESCE(cv.violation_count, 0) < 10 THEN 'WARNING'
        ELSE 'CRITICAL'
    END as health_status
FROM constraint_status cs
LEFT JOIN constraint_violations cv ON cs.tablename = cv.table_name 
    AND cs.constraintname LIKE '%' || cv.constraint_name || '%'
ORDER BY cs.tablename, cs.constraintname;

-- ============================================================================
-- CONSTRAINT VIOLATION MONITORING QUERIES
-- ============================================================================

-- Function to get detailed constraint violations
CREATE OR REPLACE FUNCTION get_constraint_violations(
    p_table_name TEXT DEFAULT NULL,
    p_constraint_type TEXT DEFAULT NULL
) RETURNS TABLE (
    table_name TEXT,
    constraint_name TEXT,
    violation_count BIGINT,
    description TEXT,
    sample_violations TEXT,
    severity TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH violations AS (
        -- Panel workflow violations
        SELECT 
            'panels' as table_name,
            'workflow_progression' as constraint_name,
            COUNT(*) as violation_count,
            'Invalid workflow status transitions' as description,
            STRING_AGG(DISTINCT status, ', ') as sample_violations,
            CASE 
                WHEN COUNT(*) > 100 THEN 'CRITICAL'
                WHEN COUNT(*) > 10 THEN 'HIGH'
                ELSE 'MEDIUM'
            END as severity
        FROM panels 
        WHERE NOT (
            (status = 'PENDING' AND current_station_id IS NULL) OR
            (status = 'IN_PROGRESS' AND current_station_id IS NOT NULL) OR
            (status = 'COMPLETED' AND current_station_id IS NOT NULL AND 
             station_1_completed_at IS NOT NULL AND
             station_2_completed_at IS NOT NULL AND
             station_3_completed_at IS NOT NULL AND
             station_4_completed_at IS NOT NULL) OR
            (status = 'FAILED' AND current_station_id IS NOT NULL) OR
            (status = 'REWORK' AND current_station_id IS NOT NULL)
        )
        
        UNION ALL
        
        -- Barcode format violations
        SELECT 
            'panels' as table_name,
            'barcode_format' as constraint_name,
            COUNT(*) as violation_count,
            'Invalid barcode format' as description,
            STRING_AGG(SUBSTRING(barcode, 1, 20), ', ') as sample_violations,
            CASE 
                WHEN COUNT(*) > 50 THEN 'CRITICAL'
                WHEN COUNT(*) > 5 THEN 'HIGH'
                ELSE 'MEDIUM'
            END as severity
        FROM panels 
        WHERE barcode !~ '^CRS[0-9]{2}[WB][TWB](36|40|60|72|144)[0-9]{5}$'
        
        UNION ALL
        
        -- Station progression violations
        SELECT 
            'inspections' as table_name,
            'station_progression' as constraint_name,
            COUNT(*) as violation_count,
            'Station progression violations' as description,
            STRING_AGG(DISTINCT station_id::TEXT, ', ') as sample_violations,
            CASE 
                WHEN COUNT(*) > 20 THEN 'CRITICAL'
                WHEN COUNT(*) > 5 THEN 'HIGH'
                ELSE 'MEDIUM'
            END as severity
        FROM inspections i
        WHERE (station_id = 2 AND NOT EXISTS (
                SELECT 1 FROM inspections i2 
                WHERE i2.panel_id = i.panel_id AND i2.station_id = 1 AND i2.result = 'PASS'
            )) OR
            (station_id = 3 AND NOT EXISTS (
                SELECT 1 FROM inspections i2 
                WHERE i2.panel_id = i.panel_id AND i2.station_id = 2 AND i2.result = 'PASS'
            )) OR
            (station_id = 4 AND NOT EXISTS (
                SELECT 1 FROM inspections i2 
                WHERE i2.panel_id = i.panel_id AND i2.station_id = 3 AND i2.result = 'PASS'
            ))
        
        UNION ALL
        
        -- Manufacturing order violations
        SELECT 
            'manufacturing_orders' as table_name,
            'completion_consistency' as constraint_name,
            COUNT(*) as violation_count,
            'MO completion inconsistencies' as description,
            STRING_AGG(DISTINCT id::TEXT, ', ') as sample_violations,
            CASE 
                WHEN COUNT(*) > 10 THEN 'CRITICAL'
                WHEN COUNT(*) > 2 THEN 'HIGH'
                ELSE 'MEDIUM'
            END as severity
        FROM manufacturing_orders 
        WHERE status = 'COMPLETED' AND panels_completed < quantity
        
        UNION ALL
        
        -- Pallet capacity violations
        SELECT 
            'pallets' as table_name,
            'capacity_exceeded' as constraint_name,
            COUNT(*) as violation_count,
            'Pallet capacity exceeded' as description,
            STRING_AGG(DISTINCT id::TEXT, ', ') as sample_violations,
            CASE 
                WHEN COUNT(*) > 5 THEN 'CRITICAL'
                WHEN COUNT(*) > 1 THEN 'HIGH'
                ELSE 'MEDIUM'
            END as severity
        FROM pallets 
        WHERE panels_assigned > capacity
    )
    SELECT 
        v.table_name,
        v.constraint_name,
        v.violation_count,
        v.description,
        v.sample_violations,
        v.severity
    FROM violations v
    WHERE (p_table_name IS NULL OR v.table_name = p_table_name)
      AND (p_constraint_type IS NULL OR v.constraint_name LIKE '%' || p_constraint_type || '%')
    ORDER BY v.severity DESC, v.violation_count DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CONSTRAINT PERFORMANCE MONITORING
-- ============================================================================

-- Function to analyze constraint performance impact
CREATE OR REPLACE FUNCTION analyze_constraint_performance(
    p_hours_back INTEGER DEFAULT 24
) RETURNS TABLE (
    constraint_name TEXT,
    table_name TEXT,
    query_count BIGINT,
    avg_duration_ms NUMERIC,
    total_duration_ms NUMERIC,
    performance_impact TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH constraint_queries AS (
        SELECT 
            CASE 
                WHEN query LIKE '%JOIN%panels%' THEN 'panel_workflow_constraints'
                WHEN query LIKE '%JOIN%inspections%' THEN 'inspection_constraints'
                WHEN query LIKE '%JOIN%manufacturing_orders%' THEN 'mo_constraints'
                WHEN query LIKE '%JOIN%pallets%' THEN 'pallet_constraints'
                ELSE 'other_constraints'
            END as constraint_name,
            CASE 
                WHEN query LIKE '%panels%' THEN 'panels'
                WHEN query LIKE '%inspections%' THEN 'inspections'
                WHEN query LIKE '%manufacturing_orders%' THEN 'manufacturing_orders'
                WHEN query LIKE '%pallets%' THEN 'pallets'
                ELSE 'unknown'
            END as table_name,
            COUNT(*) as query_count,
            AVG(EXTRACT(EPOCH FROM (query_end_time - query_start_time)) * 1000) as avg_duration_ms,
            SUM(EXTRACT(EPOCH FROM (query_end_time - query_start_time)) * 1000) as total_duration_ms
        FROM pg_stat_statements 
        WHERE query_start_time >= CURRENT_TIMESTAMP - INTERVAL '1 hour' * p_hours_back
          AND query LIKE '%JOIN%'
        GROUP BY 
            CASE 
                WHEN query LIKE '%JOIN%panels%' THEN 'panel_workflow_constraints'
                WHEN query LIKE '%JOIN%inspections%' THEN 'inspection_constraints'
                WHEN query LIKE '%JOIN%manufacturing_orders%' THEN 'mo_constraints'
                WHEN query LIKE '%JOIN%pallets%' THEN 'pallet_constraints'
                ELSE 'other_constraints'
            END,
            CASE 
                WHEN query LIKE '%panels%' THEN 'panels'
                WHEN query LIKE '%inspections%' THEN 'inspections'
                WHEN query LIKE '%manufacturing_orders%' THEN 'manufacturing_orders'
                WHEN query LIKE '%pallets%' THEN 'pallets'
                ELSE 'unknown'
            END
    )
    SELECT 
        cq.constraint_name,
        cq.table_name,
        cq.query_count,
        ROUND(cq.avg_duration_ms, 2) as avg_duration_ms,
        ROUND(cq.total_duration_ms, 2) as total_duration_ms,
        CASE 
            WHEN cq.avg_duration_ms > 1000 THEN 'HIGH IMPACT'
            WHEN cq.avg_duration_ms > 500 THEN 'MEDIUM IMPACT'
            WHEN cq.avg_duration_ms > 100 THEN 'LOW IMPACT'
            ELSE 'MINIMAL IMPACT'
        END as performance_impact
    FROM constraint_queries cq
    ORDER BY cq.total_duration_ms DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CONSTRAINT HEALTH CHECK PROCEDURES
-- ============================================================================

-- Procedure to run comprehensive constraint health check
CREATE OR REPLACE PROCEDURE run_constraint_health_check()
LANGUAGE plpgsql
AS $$
DECLARE
    violation_count INTEGER;
    critical_violations INTEGER;
    health_status TEXT;
BEGIN
    -- Get total violation count
    SELECT COUNT(*) INTO violation_count
    FROM get_constraint_violations();
    
    -- Get critical violations count
    SELECT COUNT(*) INTO critical_violations
    FROM get_constraint_violations()
    WHERE severity = 'CRITICAL';
    
    -- Determine overall health status
    IF critical_violations > 0 THEN
        health_status := 'CRITICAL';
    ELSIF violation_count > 50 THEN
        health_status := 'WARNING';
    ELSIF violation_count > 10 THEN
        health_status := 'ATTENTION';
    ELSE
        health_status := 'HEALTHY';
    END IF;
    
    -- Log health check results
    RAISE NOTICE 'Constraint Health Check Results:';
    RAISE NOTICE 'Overall Status: %', health_status;
    RAISE NOTICE 'Total Violations: %', violation_count;
    RAISE NOTICE 'Critical Violations: %', critical_violations;
    
    -- Display detailed results
    RAISE NOTICE '';
    RAISE NOTICE 'Detailed Violation Summary:';
    RAISE NOTICE '========================';
    
    FOR violation_rec IN 
        SELECT * FROM get_constraint_violations() 
        ORDER BY severity DESC, violation_count DESC
    LOOP
        RAISE NOTICE 'Table: %, Constraint: %, Violations: %, Severity: %', 
            violation_rec.table_name, 
            violation_rec.constraint_name, 
            violation_rec.violation_count, 
            violation_rec.severity;
    END LOOP;
    
    -- Display performance analysis
    RAISE NOTICE '';
    RAISE NOTICE 'Constraint Performance Analysis:';
    RAISE NOTICE '===============================';
    
    FOR perf_rec IN 
        SELECT * FROM analyze_constraint_performance(24)
        ORDER BY total_duration_ms DESC
    LOOP
        RAISE NOTICE 'Constraint: %, Table: %, Avg Duration: %ms, Impact: %', 
            perf_rec.constraint_name, 
            perf_rec.table_name, 
            perf_rec.avg_duration_ms, 
            perf_rec.performance_impact;
    END LOOP;
    
END;
$$;

-- ============================================================================
-- MONITORING DASHBOARD QUERIES
-- ============================================================================

-- Real-time constraint violation summary
CREATE OR REPLACE VIEW constraint_violation_summary AS
SELECT 
    table_name,
    COUNT(*) as total_violations,
    COUNT(CASE WHEN severity = 'CRITICAL' THEN 1 END) as critical_violations,
    COUNT(CASE WHEN severity = 'HIGH' THEN 1 END) as high_violations,
    COUNT(CASE WHEN severity = 'MEDIUM' THEN 1 END) as medium_violations,
    MAX(severity) as highest_severity,
    CASE 
        WHEN COUNT(CASE WHEN severity = 'CRITICAL' THEN 1 END) > 0 THEN 'CRITICAL'
        WHEN COUNT(CASE WHEN severity = 'HIGH' THEN 1 END) > 0 THEN 'WARNING'
        WHEN COUNT(*) > 0 THEN 'ATTENTION'
        ELSE 'HEALTHY'
    END as overall_status
FROM get_constraint_violations()
GROUP BY table_name
ORDER BY total_violations DESC;

-- Constraint performance summary
CREATE OR REPLACE VIEW constraint_performance_summary AS
SELECT 
    constraint_name,
    table_name,
    query_count,
    ROUND(avg_duration_ms, 2) as avg_duration_ms,
    ROUND(total_duration_ms, 2) as total_duration_ms,
    performance_impact,
    CASE 
        WHEN avg_duration_ms > 1000 THEN 'RED'
        WHEN avg_duration_ms > 500 THEN 'YELLOW'
        WHEN avg_duration_ms > 100 THEN 'ORANGE'
        ELSE 'GREEN'
    END as performance_color
FROM analyze_constraint_performance(24)
ORDER BY total_duration_ms DESC;

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

/*
-- Run comprehensive health check
CALL run_constraint_health_check();

-- Get all constraint violations
SELECT * FROM get_constraint_violations();

-- Get violations for specific table
SELECT * FROM get_constraint_violations('panels');

-- Get violations for specific constraint type
SELECT * FROM get_constraint_violations(NULL, 'workflow');

-- View constraint health dashboard
SELECT * FROM constraint_health_dashboard;

-- View violation summary
SELECT * FROM constraint_violation_summary;

-- View performance summary
SELECT * FROM constraint_performance_summary;

-- Analyze performance for last 48 hours
SELECT * FROM analyze_constraint_performance(48);
*/

-- ============================================================================
-- CLEANUP (for development/testing)
-- ============================================================================

/*
-- Drop views and functions when no longer needed
DROP VIEW IF EXISTS constraint_health_dashboard;
DROP VIEW IF EXISTS constraint_violation_summary;
DROP VIEW IF EXISTS constraint_performance_summary;
DROP FUNCTION IF EXISTS get_constraint_violations(TEXT, TEXT);
DROP FUNCTION IF EXISTS analyze_constraint_performance(INTEGER);
DROP PROCEDURE IF EXISTS run_constraint_health_check();
*/
