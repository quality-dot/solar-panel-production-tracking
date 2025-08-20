-- Constraint Monitoring Dashboard Configuration
-- Solar Panel Production Tracking System
-- Task 13.29: Constraint Documentation and Monitoring
-- Created: 2025-01-27

-- This script creates a comprehensive monitoring dashboard
-- for real-time constraint health and performance monitoring.

-- ============================================================================
-- DASHBOARD CONFIGURATION TABLES
-- ============================================================================

-- Create configuration table for monitoring thresholds
CREATE TABLE IF NOT EXISTS constraint_monitoring_config (
    id SERIAL PRIMARY KEY,
    constraint_name TEXT NOT NULL,
    table_name TEXT NOT NULL,
    violation_threshold_critical INTEGER DEFAULT 100,
    violation_threshold_warning INTEGER DEFAULT 50,
    violation_threshold_attention INTEGER DEFAULT 10,
    performance_threshold_critical_ms INTEGER DEFAULT 1000,
    performance_threshold_warning_ms INTEGER DEFAULT 500,
    performance_threshold_attention_ms INTEGER DEFAULT 100,
    monitoring_enabled BOOLEAN DEFAULT true,
    alert_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(constraint_name, table_name)
);

-- Create monitoring history table
CREATE TABLE IF NOT EXISTS constraint_monitoring_history (
    id SERIAL PRIMARY KEY,
    check_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    constraint_name TEXT NOT NULL,
    table_name TEXT NOT NULL,
    violation_count INTEGER DEFAULT 0,
    performance_avg_ms NUMERIC DEFAULT 0,
    health_status TEXT NOT NULL,
    alert_generated BOOLEAN DEFAULT false,
    notes TEXT
);

-- Create alert configuration table
CREATE TABLE IF NOT EXISTS constraint_alert_config (
    id SERIAL PRIMARY KEY,
    alert_type TEXT NOT NULL, -- 'violation', 'performance', 'health'
    severity TEXT NOT NULL, -- 'critical', 'warning', 'attention'
    notification_method TEXT NOT NULL, -- 'email', 'sms', 'webhook', 'log'
    recipients TEXT, -- comma-separated list
    webhook_url TEXT,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- DASHBOARD VIEWS
-- ============================================================================

-- Real-time constraint health overview
CREATE OR REPLACE VIEW constraint_health_overview AS
WITH current_status AS (
    SELECT 
        table_name,
        constraint_name,
        violation_count,
        health_status,
        ROW_NUMBER() OVER (PARTITION BY table_name, constraint_name ORDER BY check_timestamp DESC) as rn
    FROM constraint_monitoring_history
    WHERE check_timestamp >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
),
constraint_summary AS (
    SELECT 
        table_name,
        COUNT(*) as total_constraints,
        COUNT(CASE WHEN health_status = 'HEALTHY' THEN 1 END) as healthy_constraints,
        COUNT(CASE WHEN health_status = 'WARNING' THEN 1 END) as warning_constraints,
        COUNT(CASE WHEN health_status = 'CRITICAL' THEN 1 END) as critical_constraints,
        COUNT(CASE WHEN health_status = 'ATTENTION' THEN 1 END) as attention_constraints
    FROM current_status
    WHERE rn = 1
    GROUP BY table_name
)
SELECT 
    cs.table_name,
    cs.total_constraints,
    cs.healthy_constraints,
    cs.warning_constraints,
    cs.critical_constraints,
    cs.attention_constraints,
    CASE 
        WHEN cs.critical_constraints > 0 THEN '🔴 CRITICAL'
        WHEN cs.warning_constraints > 0 THEN '🟡 WARNING'
        WHEN cs.attention_constraints > 0 THEN '🟠 ATTENTION'
        ELSE '🟢 HEALTHY'
    END as overall_status,
    ROUND((cs.healthy_constraints::NUMERIC / cs.total_constraints) * 100, 1) as health_percentage
FROM constraint_summary cs
ORDER BY cs.critical_constraints DESC, cs.warning_constraints DESC;

-- Constraint violation trends
CREATE OR REPLACE VIEW constraint_violation_trends AS
WITH hourly_totals AS (
    SELECT 
        DATE_TRUNC('hour', check_timestamp) as hour_bucket,
        SUM(violation_count) as total_violations,
        COUNT(CASE WHEN health_status = 'CRITICAL' THEN 1 END) as critical_violations,
        COUNT(CASE WHEN health_status = 'WARNING' THEN 1 END) as warning_violations
    FROM constraint_monitoring_history
    WHERE check_timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
    GROUP BY DATE_TRUNC('hour', check_timestamp)
)
SELECT 
    hour_bucket,
    total_violations,
    critical_violations,
    warning_violations,
    LAG(total_violations) OVER (ORDER BY hour_bucket) as prev_hour_violations,
    CASE 
        WHEN LAG(total_violations) OVER (ORDER BY hour_bucket) IS NULL THEN 0
        ELSE total_violations - LAG(total_violations) OVER (ORDER BY hour_bucket)
    END as violation_change,
    CASE 
        WHEN LAG(total_violations) OVER (ORDER BY hour_bucket) IS NULL THEN 'N/A'
        WHEN total_violations > LAG(total_violations) OVER (ORDER BY hour_bucket) THEN '📈 INCREASING'
        WHEN total_violations < LAG(total_violations) OVER (ORDER BY hour_bucket) THEN '📉 DECREASING'
        ELSE '➡️ STABLE'
    END as trend_direction
FROM hourly_totals
ORDER BY hour_bucket DESC;

-- Constraint performance trends
CREATE OR REPLACE VIEW constraint_performance_trends AS
WITH performance_data AS (
    SELECT 
        DATE_TRUNC('hour', check_timestamp) as hour_bucket,
        constraint_name,
        table_name,
        AVG(performance_avg_ms) as avg_performance_ms,
        MAX(performance_avg_ms) as max_performance_ms,
        MIN(performance_avg_ms) as min_performance_ms
    FROM constraint_monitoring_history
    WHERE check_timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
      AND performance_avg_ms > 0
    GROUP BY DATE_TRUNC('hour', check_timestamp), constraint_name, table_name
)
SELECT 
    hour_bucket,
    constraint_name,
    table_name,
    ROUND(avg_performance_ms, 2) as avg_performance_ms,
    ROUND(max_performance_ms, 2) as max_performance_ms,
    ROUND(min_performance_ms, 2) as min_performance_ms,
    CASE 
        WHEN avg_performance_ms > 1000 THEN '🔴 HIGH IMPACT'
        WHEN avg_performance_ms > 500 THEN '🟡 MEDIUM IMPACT'
        WHEN avg_performance_ms > 100 THEN '🟠 LOW IMPACT'
        ELSE '🟢 MINIMAL IMPACT'
    END as performance_impact,
    CASE 
        WHEN avg_performance_ms > LAG(avg_performance_ms) OVER (PARTITION BY constraint_name ORDER BY hour_bucket) THEN '📈 DEGRADING'
        WHEN avg_performance_ms < LAG(avg_performance_ms) OVER (PARTITION BY constraint_name ORDER BY hour_bucket) THEN '📉 IMPROVING'
        ELSE '➡️ STABLE'
    END as performance_trend
FROM performance_data
ORDER BY hour_bucket DESC, avg_performance_ms DESC;

-- ============================================================================
-- ALERT SYSTEM
-- ============================================================================

-- Function to generate constraint alerts
CREATE OR REPLACE FUNCTION generate_constraint_alert(
    p_constraint_name TEXT,
    p_table_name TEXT,
    p_alert_type TEXT,
    p_severity TEXT,
    p_message TEXT
) RETURNS VOID AS $$
DECLARE
    alert_config RECORD;
BEGIN
    -- Get alert configuration
    SELECT * INTO alert_config
    FROM constraint_alert_config
    WHERE alert_type = p_alert_type 
      AND severity = p_severity 
      AND enabled = true;
    
    IF FOUND THEN
        -- Log alert
        INSERT INTO constraint_monitoring_history (
            constraint_name, 
            table_name, 
            health_status, 
            alert_generated, 
            notes
        ) VALUES (
            p_constraint_name, 
            p_table_name, 
            p_severity, 
            true, 
            p_message
        );
        
        -- Generate notification based on method
        CASE alert_config.notification_method
            WHEN 'log' THEN
                RAISE LOG 'CONSTRAINT ALERT: % - % - % - %', 
                    p_severity, p_constraint_name, p_table_name, p_message;
            WHEN 'webhook' THEN
                -- In production, this would call an external webhook
                RAISE NOTICE 'WEBHOOK ALERT: % - % - % - %', 
                    p_severity, p_constraint_name, p_table_name, p_message;
            ELSE
                RAISE NOTICE 'ALERT: % - % - % - %', 
                    p_severity, p_constraint_name, p_table_name, p_message;
        END CASE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to check constraint violations and generate alerts
CREATE OR REPLACE FUNCTION check_constraint_violations_and_alert() RETURNS VOID AS $$
DECLARE
    violation_rec RECORD;
    config_rec RECORD;
BEGIN
    -- Check each constraint for violations
    FOR violation_rec IN 
        SELECT * FROM get_constraint_violations()
    LOOP
        -- Get monitoring configuration for this constraint
        SELECT * INTO config_rec
        FROM constraint_monitoring_config
        WHERE constraint_name LIKE '%' || violation_rec.constraint_name || '%'
          AND table_name = violation_rec.table_name
          AND monitoring_enabled = true;
        
        IF FOUND THEN
            -- Check thresholds and generate alerts
            IF violation_rec.violation_count >= config_rec.violation_threshold_critical THEN
                PERFORM generate_constraint_alert(
                    violation_rec.constraint_name,
                    violation_rec.table_name,
                    'violation',
                    'CRITICAL',
                    'Critical violation threshold exceeded: ' || violation_rec.violation_count || ' violations'
                );
            ELSIF violation_rec.violation_count >= config_rec.violation_threshold_warning THEN
                PERFORM generate_constraint_alert(
                    violation_rec.constraint_name,
                    violation_rec.table_name,
                    'violation',
                    'WARNING',
                    'Warning violation threshold exceeded: ' || violation_rec.violation_count || ' violations'
                );
            ELSIF violation_rec.violation_count >= config_rec.violation_threshold_attention THEN
                PERFORM generate_constraint_alert(
                    violation_rec.constraint_name,
                    violation_rec.table_name,
                    'violation',
                    'ATTENTION',
                    'Attention violation threshold exceeded: ' || violation_rec.violation_count || ' violations'
                );
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- AUTOMATED MONITORING PROCEDURES
-- ============================================================================

-- Procedure to run automated constraint monitoring
CREATE OR REPLACE PROCEDURE run_automated_constraint_monitoring()
LANGUAGE plpgsql
AS $$
DECLARE
    constraint_rec RECORD;
    violation_count INTEGER;
    performance_avg_ms NUMERIC;
    health_status TEXT;
BEGIN
    -- Loop through all monitored constraints
    FOR constraint_rec IN 
        SELECT DISTINCT constraint_name, table_name
        FROM constraint_monitoring_config
        WHERE monitoring_enabled = true
    LOOP
        -- Get current violation count
        SELECT COALESCE(SUM(violation_count), 0) INTO violation_count
        FROM get_constraint_violations(constraint_rec.table_name, constraint_rec.constraint_name);
        
        -- Get performance data (simplified - in production would use pg_stat_statements)
        SELECT COALESCE(AVG(performance_avg_ms), 0) INTO performance_avg_ms
        FROM constraint_monitoring_history
        WHERE constraint_name = constraint_rec.constraint_name
          AND table_name = constraint_rec.table_name
          AND check_timestamp >= CURRENT_TIMESTAMP - INTERVAL '1 hour';
        
        -- Determine health status
        IF violation_count = 0 THEN
            health_status := 'HEALTHY';
        ELSIF violation_count < 10 THEN
            health_status := 'ATTENTION';
        ELSIF violation_count < 50 THEN
            health_status := 'WARNING';
        ELSE
            health_status := 'CRITICAL';
        END IF;
        
        -- Record monitoring results
        INSERT INTO constraint_monitoring_history (
            constraint_name,
            table_name,
            violation_count,
            performance_avg_ms,
            health_status
        ) VALUES (
            constraint_rec.constraint_name,
            constraint_rec.table_name,
            violation_count,
            performance_avg_ms,
            health_status
        );
    END LOOP;
    
    -- Check for violations and generate alerts
    PERFORM check_constraint_violations_and_alert();
    
    -- Log completion
    RAISE NOTICE 'Automated constraint monitoring completed at %', CURRENT_TIMESTAMP;
END;
$$;

-- ============================================================================
-- DASHBOARD QUERIES FOR FRONTEND INTEGRATION
-- ============================================================================

-- Get current system health status
CREATE OR REPLACE FUNCTION get_system_health_status() 
RETURNS TABLE (
    overall_status TEXT,
    total_constraints INTEGER,
    healthy_constraints INTEGER,
    warning_constraints INTEGER,
    critical_constraints INTEGER,
    attention_constraints INTEGER,
    health_percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cho.overall_status,
        SUM(cho.total_constraints)::INTEGER as total_constraints,
        SUM(cho.healthy_constraints)::INTEGER as healthy_constraints,
        SUM(cho.warning_constraints)::INTEGER as warning_constraints,
        SUM(cho.critical_constraints)::INTEGER as critical_constraints,
        SUM(cho.attention_constraints)::INTEGER as attention_constraints,
        ROUND(
            (SUM(cho.healthy_constraints)::NUMERIC / SUM(cho.total_constraints)) * 100, 1
        ) as health_percentage
    FROM constraint_health_overview cho
    GROUP BY cho.overall_status
    ORDER BY 
        CASE cho.overall_status
            WHEN '🔴 CRITICAL' THEN 1
            WHEN '🟡 WARNING' THEN 2
            WHEN '🟠 ATTENTION' THEN 3
            ELSE 4
        END
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Get constraint violations for specific table
CREATE OR REPLACE FUNCTION get_table_constraint_violations(p_table_name TEXT)
RETURNS TABLE (
    constraint_name TEXT,
    violation_count BIGINT,
    description TEXT,
    severity TEXT,
    last_check TIMESTAMP,
    trend TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cv.constraint_name,
        cv.violation_count,
        cv.description,
        cv.severity,
        cmh.check_timestamp as last_check,
        CASE 
            WHEN LAG(cv.violation_count) OVER (PARTITION BY cv.constraint_name ORDER BY cmh.check_timestamp) IS NULL THEN 'N/A'
            WHEN cv.violation_count > LAG(cv.violation_count) OVER (PARTITION BY cv.constraint_name ORDER BY cmh.check_timestamp) THEN '📈 INCREASING'
            WHEN cv.violation_count < LAG(cv.violation_count) OVER (PARTITION BY cv.constraint_name ORDER BY cmh.check_timestamp) THEN '📉 DECREASING'
            ELSE '➡️ STABLE'
        END as trend
    FROM get_constraint_violations(p_table_name) cv
    LEFT JOIN constraint_monitoring_history cmh ON 
        cmh.constraint_name LIKE '%' || cv.constraint_name || '%' AND
        cmh.table_name = cv.table_name
    WHERE cmh.check_timestamp = (
        SELECT MAX(check_timestamp) 
        FROM constraint_monitoring_history cmh2 
        WHERE cmh2.constraint_name LIKE '%' || cv.constraint_name || '%' AND
              cmh2.table_name = cv.table_name
    )
    ORDER BY cv.severity DESC, cv.violation_count DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INITIAL CONFIGURATION DATA
-- ============================================================================

-- Insert default monitoring configuration
INSERT INTO constraint_monitoring_config (
    constraint_name, table_name, 
    violation_threshold_critical, violation_threshold_warning, violation_threshold_attention,
    performance_threshold_critical_ms, performance_threshold_warning_ms, performance_threshold_attention_ms
) VALUES 
    ('workflow_progression', 'panels', 100, 50, 10, 1000, 500, 100),
    ('barcode_format', 'panels', 50, 25, 5, 500, 250, 50),
    ('electrical_data', 'panels', 75, 35, 7, 750, 375, 75),
    ('station_progression', 'inspections', 20, 10, 2, 800, 400, 80),
    ('completion_consistency', 'manufacturing_orders', 10, 5, 1, 600, 300, 60),
    ('capacity_exceeded', 'pallets', 5, 2, 1, 400, 200, 40)
ON CONFLICT (constraint_name, table_name) DO NOTHING;

-- Insert default alert configuration
INSERT INTO constraint_alert_config (alert_type, severity, notification_method, enabled) VALUES
    ('violation', 'critical', 'log', true),
    ('violation', 'warning', 'log', true),
    ('violation', 'attention', 'log', true),
    ('performance', 'critical', 'log', true),
    ('performance', 'warning', 'log', true),
    ('health', 'critical', 'log', true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

/*
-- Run automated monitoring
CALL run_automated_constraint_monitoring();

-- Get system health overview
SELECT * FROM constraint_health_overview;

-- Get violation trends
SELECT * FROM constraint_violation_trends;

-- Get performance trends
SELECT * FROM constraint_performance_trends;

-- Get overall system health
SELECT * FROM get_system_health_status();

-- Get table-specific violations
SELECT * FROM get_table_constraint_violations('panels');

-- Check constraint violations and generate alerts
SELECT check_constraint_violations_and_alert();

-- View monitoring configuration
SELECT * FROM constraint_monitoring_config;

-- View alert configuration
SELECT * FROM constraint_alert_config;
*/

-- ============================================================================
-- CLEANUP (for development/testing)
-- ============================================================================

/*
-- Drop all monitoring objects when no longer needed
DROP VIEW IF EXISTS constraint_health_overview;
DROP VIEW IF EXISTS constraint_violation_trends;
DROP VIEW IF EXISTS constraint_performance_trends;
DROP FUNCTION IF EXISTS generate_constraint_alert(TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS check_constraint_violations_and_alert();
DROP FUNCTION IF EXISTS get_system_health_status();
DROP FUNCTION IF EXISTS get_table_constraint_violations(TEXT);
DROP PROCEDURE IF EXISTS run_automated_constraint_monitoring();
DROP TABLE IF EXISTS constraint_monitoring_history;
DROP TABLE IF EXISTS constraint_monitoring_config;
DROP TABLE IF EXISTS constraint_alert_config;
*/
