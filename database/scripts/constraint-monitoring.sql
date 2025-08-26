-- Constraint Monitoring and Violation Tracking
-- Solar Panel Production Tracking System
-- Subtask 13.29: Constraint Documentation and Monitoring

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Create constraint monitoring tables
CREATE TABLE IF NOT EXISTS constraint_violations (
    id SERIAL PRIMARY KEY,
    constraint_name VARCHAR(100) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    violation_type VARCHAR(50) NOT NULL,
    violation_details JSONB,
    affected_rows INTEGER,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    severity VARCHAR(20) DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
);

-- Create constraint health metrics table
CREATE TABLE IF NOT EXISTS constraint_health_metrics (
    id SERIAL PRIMARY KEY,
    constraint_name VARCHAR(100) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    constraint_type VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_validated_at TIMESTAMP,
    validation_duration_ms INTEGER,
    violation_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create constraint dependency mapping table
CREATE TABLE IF NOT EXISTS constraint_dependencies (
    id SERIAL PRIMARY KEY,
    constraint_name VARCHAR(100) NOT NULL,
    dependent_constraint VARCHAR(100),
    dependency_type VARCHAR(50) NOT NULL, -- 'FOREIGN_KEY', 'CHECK', 'TRIGGER'
    table_name VARCHAR(50) NOT NULL,
    referenced_table VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for monitoring tables
CREATE INDEX IF NOT EXISTS idx_constraint_violations_constraint_name ON constraint_violations(constraint_name);
CREATE INDEX IF NOT EXISTS idx_constraint_violations_created_at ON constraint_violations(created_at);
CREATE INDEX IF NOT EXISTS idx_constraint_violations_severity ON constraint_violations(severity);
CREATE INDEX IF NOT EXISTS idx_constraint_health_metrics_constraint_name ON constraint_health_metrics(constraint_name);
CREATE INDEX IF NOT EXISTS idx_constraint_dependencies_constraint_name ON constraint_dependencies(constraint_name);

-- Function to log constraint violations
CREATE OR REPLACE FUNCTION log_constraint_violation(
    p_constraint_name VARCHAR(100),
    p_table_name VARCHAR(50),
    p_violation_type VARCHAR(50),
    p_violation_details JSONB DEFAULT NULL,
    p_affected_rows INTEGER DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL,
    p_severity VARCHAR(20) DEFAULT 'MEDIUM'
)
RETURNS INTEGER AS $$
DECLARE
    violation_id INTEGER;
BEGIN
    INSERT INTO constraint_violations (
        constraint_name, table_name, violation_type, violation_details,
        affected_rows, error_message, severity
    ) VALUES (
        p_constraint_name, p_table_name, p_violation_type, p_violation_details,
        p_affected_rows, p_error_message, p_severity
    ) RETURNING id INTO violation_id;
    
    -- Update health metrics
    UPDATE constraint_health_metrics 
    SET violation_count = violation_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE constraint_name = p_constraint_name;
    
    RETURN violation_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get constraint violation summary
CREATE OR REPLACE FUNCTION get_constraint_violation_summary(
    p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    constraint_name VARCHAR(100),
    table_name VARCHAR(50),
    violation_count BIGINT,
    critical_count BIGINT,
    high_count BIGINT,
    medium_count BIGINT,
    low_count BIGINT,
    last_violation TIMESTAMP,
    avg_resolution_time INTERVAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cv.constraint_name,
        cv.table_name,
        COUNT(*) as violation_count,
        COUNT(*) FILTER (WHERE cv.severity = 'CRITICAL') as critical_count,
        COUNT(*) FILTER (WHERE cv.severity = 'HIGH') as high_count,
        COUNT(*) FILTER (WHERE cv.severity = 'MEDIUM') as medium_count,
        COUNT(*) FILTER (WHERE cv.severity = 'LOW') as low_count,
        MAX(cv.created_at) as last_violation,
        AVG(cv.resolved_at - cv.created_at) as avg_resolution_time
    FROM constraint_violations cv
    WHERE cv.created_at >= CURRENT_DATE - INTERVAL '1 day' * p_days_back
    GROUP BY cv.constraint_name, cv.table_name
    ORDER BY violation_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get constraint health status
CREATE OR REPLACE FUNCTION get_constraint_health_status()
RETURNS TABLE (
    constraint_name VARCHAR(100),
    table_name VARCHAR(50),
    constraint_type VARCHAR(50),
    is_active BOOLEAN,
    last_validated_at TIMESTAMP,
    violation_count INTEGER,
    success_rate DECIMAL(5,2),
    health_status VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        chm.constraint_name,
        chm.table_name,
        chm.constraint_type,
        chm.is_active,
        chm.last_validated_at,
        chm.violation_count,
        chm.success_rate,
        CASE 
            WHEN chm.success_rate >= 99.5 THEN 'EXCELLENT'
            WHEN chm.success_rate >= 95.0 THEN 'GOOD'
            WHEN chm.success_rate >= 90.0 THEN 'FAIR'
            ELSE 'POOR'
        END as health_status
    FROM constraint_health_metrics chm
    ORDER BY chm.success_rate DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- Function to validate constraint dependencies
CREATE OR REPLACE FUNCTION validate_constraint_dependencies()
RETURNS TABLE (
    constraint_name VARCHAR(100),
    dependency_status VARCHAR(50),
    dependency_details TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cd.constraint_name,
        CASE 
            WHEN cd.dependent_constraint IS NULL THEN 'NO_DEPENDENCIES'
            WHEN EXISTS (
                SELECT 1 FROM information_schema.table_constraints tc 
                WHERE tc.constraint_name = cd.dependent_constraint
            ) THEN 'DEPENDENCY_VALID'
            ELSE 'DEPENDENCY_MISSING'
        END as dependency_status,
        CASE 
            WHEN cd.dependent_constraint IS NULL THEN 'No dependencies found'
            WHEN EXISTS (
                SELECT 1 FROM information_schema.table_constraints tc 
                WHERE tc.constraint_name = cd.dependent_constraint
            ) THEN 'Dependency ' || cd.dependent_constraint || ' is valid'
            ELSE 'Dependency ' || cd.dependent_constraint || ' is missing'
        END as dependency_details
    FROM constraint_dependencies cd;
END;
$$ LANGUAGE plpgsql;

-- Function to generate constraint impact analysis
CREATE OR REPLACE FUNCTION generate_constraint_impact_analysis()
RETURNS TABLE (
    constraint_name VARCHAR(100),
    table_name VARCHAR(50),
    impact_level VARCHAR(20),
    performance_impact DECIMAL(5,2),
    data_integrity_score INTEGER,
    business_criticality VARCHAR(20),
    recommendations TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        chm.constraint_name,
        chm.table_name,
        CASE 
            WHEN chm.violation_count = 0 THEN 'LOW'
            WHEN chm.violation_count <= 10 THEN 'MEDIUM'
            WHEN chm.violation_count <= 50 THEN 'HIGH'
            ELSE 'CRITICAL'
        END as impact_level,
        CASE 
            WHEN chm.validation_duration_ms IS NULL THEN 0.0
            ELSE chm.validation_duration_ms::DECIMAL / 1000.0
        END as performance_impact,
        CASE 
            WHEN chm.success_rate >= 99.5 THEN 100
            WHEN chm.success_rate >= 95.0 THEN 80
            WHEN chm.success_rate >= 90.0 THEN 60
            ELSE 40
        END as data_integrity_score,
        CASE 
            WHEN chm.constraint_name LIKE '%workflow%' OR chm.constraint_name LIKE '%completion%' THEN 'HIGH'
            WHEN chm.constraint_name LIKE '%barcode%' OR chm.constraint_name LIKE '%unique%' THEN 'MEDIUM'
            ELSE 'LOW'
        END as business_criticality,
        CASE 
            WHEN chm.success_rate < 90.0 THEN 'Consider reviewing constraint logic or data quality'
            WHEN chm.validation_duration_ms > 1000 THEN 'Consider optimizing constraint performance'
            WHEN chm.violation_count > 0 THEN 'Monitor for patterns in violations'
            ELSE 'Constraint performing well'
        END as recommendations
    FROM constraint_health_metrics chm;
END;
$$ LANGUAGE plpgsql;

-- Function to create constraint monitoring dashboard data
CREATE OR REPLACE FUNCTION get_constraint_monitoring_dashboard()
RETURNS JSON AS $$
DECLARE
    dashboard_data JSON;
BEGIN
    SELECT json_build_object(
        'summary', (
            SELECT json_build_object(
                'total_constraints', COUNT(*),
                'active_constraints', COUNT(*) FILTER (WHERE is_active = true),
                'constraints_with_violations', COUNT(*) FILTER (WHERE violation_count > 0),
                'avg_success_rate', AVG(success_rate)
            ) FROM constraint_health_metrics
        ),
        'violations_by_severity', (
            SELECT json_object_agg(severity, count)
            FROM (
                SELECT severity, COUNT(*) as count
                FROM constraint_violations
                WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
                GROUP BY severity
            ) severity_counts
        ),
        'top_violating_constraints', (
            SELECT json_agg(row_to_json(t))
            FROM (
                SELECT constraint_name, table_name, violation_count, last_validated_at
                FROM constraint_health_metrics
                WHERE violation_count > 0
                ORDER BY violation_count DESC
                LIMIT 10
            ) t
        ),
        'constraint_health_distribution', (
            SELECT json_object_agg(health_status, count)
            FROM (
                SELECT 
                    CASE 
                        WHEN success_rate >= 99.5 THEN 'EXCELLENT'
                        WHEN success_rate >= 95.0 THEN 'GOOD'
                        WHEN success_rate >= 90.0 THEN 'FAIR'
                        ELSE 'POOR'
                    END as health_status,
                    COUNT(*) as count
                FROM constraint_health_metrics
                GROUP BY health_status
            ) health_distribution
        )
    ) INTO dashboard_data;
    
    RETURN dashboard_data;
END;
$$ LANGUAGE plpgsql;

-- Insert initial constraint health metrics for existing constraints
INSERT INTO constraint_health_metrics (constraint_name, table_name, constraint_type, is_active)
SELECT 
    tc.constraint_name,
    tc.table_name,
    tc.constraint_type,
    TRUE
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public'
    AND tc.constraint_type IN ('CHECK', 'UNIQUE', 'FOREIGN KEY')
    AND tc.constraint_name NOT IN (
        SELECT constraint_name FROM constraint_health_metrics
    );

-- Insert constraint dependencies mapping
INSERT INTO constraint_dependencies (constraint_name, table_name, dependency_type, referenced_table)
VALUES 
    ('check_workflow_progression', 'panels', 'CHECK', NULL),
    ('check_station_completion_sequence', 'panels', 'CHECK', NULL),
    ('check_panel_type_line_assignment', 'panels', 'CHECK', NULL),
    ('check_barcode_format_compliance', 'panels', 'CHECK', NULL),
    ('check_station_progression', 'inspections', 'CHECK', 'panels'),
    ('unique_panel_station_inspection', 'inspections', 'UNIQUE', NULL),
    ('check_inspection_result_valid', 'inspections', 'CHECK', NULL),
    ('check_failed_inspection_notes', 'inspections', 'CHECK', NULL),
    ('check_mo_quantity_reasonable', 'manufacturing_orders', 'CHECK', NULL),
    ('check_mo_dates_logical', 'manufacturing_orders', 'CHECK', NULL),
    ('check_mo_status_transition', 'manufacturing_orders', 'CHECK', NULL),
    ('check_mo_completion_consistency', 'manufacturing_orders', 'CHECK', NULL),
    ('check_pallet_capacity_reasonable', 'pallets', 'CHECK', NULL),
    ('check_pallet_assignment_capacity', 'pallets', 'CHECK', NULL),
    ('check_pallet_position_bounds', 'pallet_assignments', 'CHECK', NULL),
    ('unique_pallet_position', 'pallet_assignments', 'UNIQUE', NULL),
    ('check_rework_routing', 'panels', 'CHECK', NULL),
    ('check_failed_panel_documentation', 'panels', 'CHECK', NULL),
    ('check_cosmetic_defect_notes', 'panels', 'CHECK', NULL),
    ('check_electrical_data_validity', 'panels', 'CHECK', NULL),
    ('check_voltage_data_validity', 'panels', 'CHECK', NULL),
    ('check_current_data_validity', 'panels', 'CHECK', NULL),
    ('check_completed_panel_electrical_data', 'panels', 'CHECK', NULL),
    ('check_user_role_valid', 'users', 'CHECK', NULL),
    ('check_inspector_station_assignment', 'users', 'CHECK', 'stations'),
    ('check_email_format', 'users', 'CHECK', NULL),
    ('check_station_number_valid', 'stations', 'CHECK', NULL),
    ('check_station_type_valid', 'stations', 'CHECK', NULL),
    ('check_station_line_assignment', 'stations', 'CHECK', NULL),
    ('check_criteria_type_valid', 'station_criteria_configurations', 'CHECK', NULL)
ON CONFLICT (constraint_name) DO NOTHING;

-- Create view for constraint monitoring dashboard
CREATE OR REPLACE VIEW constraint_monitoring_dashboard AS
SELECT 
    chm.constraint_name,
    chm.table_name,
    chm.constraint_type,
    chm.is_active,
    chm.last_validated_at,
    chm.violation_count,
    chm.success_rate,
    CASE 
        WHEN chm.success_rate >= 99.5 THEN 'EXCELLENT'
        WHEN chm.success_rate >= 95.0 THEN 'GOOD'
        WHEN chm.success_rate >= 90.0 THEN 'FAIR'
        ELSE 'POOR'
    END as health_status,
    COUNT(cv.id) FILTER (WHERE cv.created_at >= CURRENT_DATE - INTERVAL '7 days') as violations_last_7_days,
    COUNT(cv.id) FILTER (WHERE cv.created_at >= CURRENT_DATE - INTERVAL '30 days') as violations_last_30_days
FROM constraint_health_metrics chm
LEFT JOIN constraint_violations cv ON chm.constraint_name = cv.constraint_name
GROUP BY chm.id, chm.constraint_name, chm.table_name, chm.constraint_type, chm.is_active, 
         chm.last_validated_at, chm.violation_count, chm.success_rate;

-- Create view for constraint violation trends
CREATE OR REPLACE VIEW constraint_violation_trends AS
SELECT 
    constraint_name,
    table_name,
    DATE(created_at) as violation_date,
    COUNT(*) as daily_violations,
    COUNT(*) FILTER (WHERE severity = 'CRITICAL') as critical_violations,
    COUNT(*) FILTER (WHERE severity = 'HIGH') as high_violations,
    COUNT(*) FILTER (WHERE severity = 'MEDIUM') as medium_violations,
    COUNT(*) FILTER (WHERE severity = 'LOW') as low_violations
FROM constraint_violations
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY constraint_name, table_name, DATE(created_at)
ORDER BY constraint_name, violation_date;

-- Grant permissions for monitoring
GRANT SELECT ON constraint_violations TO PUBLIC;
GRANT SELECT ON constraint_health_metrics TO PUBLIC;
GRANT SELECT ON constraint_dependencies TO PUBLIC;
GRANT SELECT ON constraint_monitoring_dashboard TO PUBLIC;
GRANT SELECT ON constraint_violation_trends TO PUBLIC;
GRANT EXECUTE ON FUNCTION log_constraint_violation TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_constraint_violation_summary TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_constraint_health_status TO PUBLIC;
GRANT EXECUTE ON FUNCTION validate_constraint_dependencies TO PUBLIC;
GRANT EXECUTE ON FUNCTION generate_constraint_impact_analysis TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_constraint_monitoring_dashboard TO PUBLIC;
