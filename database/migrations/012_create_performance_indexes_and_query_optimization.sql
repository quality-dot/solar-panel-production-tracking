-- Migration 012: Create Performance Indexes and Query Optimization
-- Solar Panel Production Tracking System
-- Created: 2025-08-20

-- This migration adds comprehensive performance indexes and query optimization
-- features to ensure optimal database performance for the solar panel tracking system.

-- ============================================================================
-- FULL-TEXT SEARCH INDEXES
-- ============================================================================

-- Create full-text search indexes for searchable text fields
CREATE INDEX idx_panels_barcode_gin ON panels USING gin(to_tsvector('english', barcode));
CREATE INDEX idx_panels_notes_gin ON panels USING gin(to_tsvector('english', notes));

CREATE INDEX idx_manufacturing_orders_order_number_gin ON manufacturing_orders USING gin(to_tsvector('english', order_number));
CREATE INDEX idx_manufacturing_orders_description_gin ON manufacturing_orders USING gin(to_tsvector('english', description));
CREATE INDEX idx_manufacturing_orders_notes_gin ON manufacturing_orders USING gin(to_tsvector('english', notes));

CREATE INDEX idx_pallets_barcode_gin ON pallets USING gin(to_tsvector('english', barcode));
CREATE INDEX idx_pallets_notes_gin ON pallets USING gin(to_tsvector('english', notes));

CREATE INDEX idx_inspections_notes_gin ON inspections USING gin(to_tsvector('english', notes));

CREATE INDEX idx_users_username_gin ON users USING gin(to_tsvector('english', username));
CREATE INDEX idx_users_email_gin ON users USING gin(to_tsvector('english', email));
CREATE INDEX idx_users_first_name_gin ON users USING gin(to_tsvector('english', first_name));
CREATE INDEX idx_users_last_name_gin ON users USING gin(to_tsvector('english', last_name));

CREATE INDEX idx_stations_name_gin ON stations USING gin(to_tsvector('english', name));
CREATE INDEX idx_stations_description_gin ON stations USING gin(to_tsvector('english', description));

-- ============================================================================
-- PARTIAL INDEXES FOR COMMON FILTERS
-- ============================================================================

-- Partial indexes for active records
CREATE INDEX idx_panels_active ON panels(id, barcode, status, manufacturing_order_id) 
    WHERE status IN ('IN_PROGRESS', 'COMPLETED', 'FAILED');

CREATE INDEX idx_manufacturing_orders_active ON manufacturing_orders(id, order_number, status, priority) 
    WHERE status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED');

CREATE INDEX idx_pallets_active ON pallets(id, barcode, status, manufacturing_order_id) 
    WHERE status IN ('IN_PROGRESS', 'COMPLETED');

CREATE INDEX idx_inspections_recent ON inspections(id, panel_id, station_id, result, inspection_date) 
    WHERE inspection_date >= CURRENT_DATE - INTERVAL '30 days';

CREATE INDEX idx_users_active ON users(id, username, email, role) 
    WHERE is_active = true;

CREATE INDEX idx_stations_active ON stations(id, name, station_type, location) 
    WHERE is_active = true;

-- ============================================================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ============================================================================

-- Manufacturing order performance indexes
CREATE INDEX idx_mo_status_priority_date ON manufacturing_orders(status, priority, start_date DESC);
CREATE INDEX idx_mo_assigned_status ON manufacturing_orders(assigned_to, status, priority);
CREATE INDEX idx_mo_created_date_status ON manufacturing_orders(created_at DESC, status);

-- Panel performance indexes
CREATE INDEX idx_panels_mo_status_date ON panels(manufacturing_order_id, status, created_at DESC);
CREATE INDEX idx_panels_barcode_status_date ON panels(barcode, status, created_at DESC);
CREATE INDEX idx_panels_inspection_count_status ON panels(inspection_count, status);

-- Pallet performance indexes
CREATE INDEX idx_pallets_mo_status_date ON pallets(manufacturing_order_id, status, created_at DESC);
CREATE INDEX idx_pallets_capacity_assigned ON pallets(capacity, panels_assigned);
CREATE INDEX idx_pallets_barcode_status_date ON pallets(barcode, status, created_at DESC);

-- Inspection performance indexes
CREATE INDEX idx_inspections_panel_station_date ON inspections(panel_id, station_id, inspection_date DESC);
CREATE INDEX idx_inspections_station_result_date ON inspections(station_id, result, inspection_date DESC);
CREATE INDEX idx_inspections_inspector_date ON inspections(inspector_id, inspection_date DESC);
CREATE INDEX idx_inspections_mo_station_result ON inspections(manufacturing_order_id, station_id, result);

-- Pallet assignment performance indexes
CREATE INDEX idx_pallet_assignments_pallet_position ON pallet_assignments(pallet_id, position_x, position_y);
CREATE INDEX idx_pallet_assignments_panel_date ON pallet_assignments(panel_id, assigned_at DESC);

-- User performance indexes
CREATE INDEX idx_users_role_active ON users(role, is_active, username);
CREATE INDEX idx_users_created_date ON users(created_at DESC, is_active);

-- Station performance indexes
CREATE INDEX idx_stations_type_location ON stations(station_type, location, is_active);
CREATE INDEX idx_stations_name_type ON stations(name, station_type, is_active);

-- ============================================================================
-- FUNCTIONAL INDEXES
-- ============================================================================

-- Indexes for date-based queries
CREATE INDEX idx_panels_created_date_func ON panels(DATE(created_at));
CREATE INDEX idx_manufacturing_orders_start_date_func ON manufacturing_orders(DATE(start_date));
CREATE INDEX idx_manufacturing_orders_end_date_func ON manufacturing_orders(DATE(end_date));
CREATE INDEX idx_inspections_inspection_date_func ON inspections(DATE(inspection_date));

-- Indexes for string operations
CREATE INDEX idx_panels_barcode_lower ON panels(LOWER(barcode));
CREATE INDEX idx_manufacturing_orders_order_number_lower ON manufacturing_orders(LOWER(order_number));
CREATE INDEX idx_pallets_barcode_lower ON pallets(LOWER(barcode));
CREATE INDEX idx_users_username_lower ON users(LOWER(username));
CREATE INDEX idx_users_email_lower ON users(LOWER(email));

-- Indexes for numeric ranges
CREATE INDEX idx_panels_power_range ON panels(power_watts) WHERE power_watts BETWEEN 100 AND 500;
CREATE INDEX idx_panels_weight_range ON panels(weight_kg) WHERE weight_kg BETWEEN 10 AND 50;

-- ============================================================================
-- COVERING INDEXES FOR FREQUENT QUERIES
-- ============================================================================

-- Covering index for panel summary queries
CREATE INDEX idx_panels_covering ON panels(manufacturing_order_id, status, barcode, length_mm, width_mm, power_watts, inspection_count, created_at)
    INCLUDE (thickness_mm, weight_kg, notes);

-- Covering index for manufacturing order summary queries
CREATE INDEX idx_mo_covering ON manufacturing_orders(status, priority, start_date, end_date, quantity, panels_created)
    INCLUDE (order_number, description, assigned_to, created_at);

-- Covering index for inspection summary queries
CREATE INDEX idx_inspections_covering ON inspections(panel_id, station_id, result, inspection_date)
    INCLUDE (inspector_id, notes, manufacturing_order_id);

-- Covering index for pallet summary queries
CREATE INDEX idx_pallets_covering ON pallets(manufacturing_order_id, status, capacity, panels_assigned)
    INCLUDE (barcode, length_mm, width_mm, height_mm, created_at);

-- ============================================================================
-- STATISTICS AND ANALYTICS INDEXES
-- ============================================================================

-- Indexes for time-series analysis
CREATE INDEX idx_panels_created_hourly ON panels(DATE_TRUNC('hour', created_at), status);
CREATE INDEX idx_inspections_hourly ON inspections(DATE_TRUNC('hour', inspection_date), result);
CREATE INDEX idx_manufacturing_orders_daily ON manufacturing_orders(DATE_TRUNC('day', start_date), status);

-- Indexes for aggregation queries
CREATE INDEX idx_panels_status_count ON panels(status, manufacturing_order_id);
CREATE INDEX idx_inspections_result_count ON inspections(result, station_id);
CREATE INDEX idx_pallets_status_count ON pallets(status, manufacturing_order_id);

-- ============================================================================
-- CONCURRENT ACCESS OPTIMIZATION
-- ============================================================================

-- Indexes for high-concurrency operations
CREATE INDEX CONCURRENTLY idx_panels_status_concurrent ON panels(status) WHERE status IN ('IN_PROGRESS', 'COMPLETED');
CREATE INDEX CONCURRENTLY idx_inspections_result_concurrent ON inspections(result) WHERE result IN ('PASS', 'FAIL');
CREATE INDEX CONCURRENTLY idx_manufacturing_orders_status_concurrent ON manufacturing_orders(status) WHERE status IN ('PENDING', 'IN_PROGRESS');

-- ============================================================================
-- QUERY OPTIMIZATION FUNCTIONS
-- ============================================================================

-- Function to get panel statistics by manufacturing order
CREATE OR REPLACE FUNCTION get_panel_statistics_by_mo(p_mo_id UUID)
RETURNS TABLE (
    total_panels BIGINT,
    completed_panels BIGINT,
    in_progress_panels BIGINT,
    failed_panels BIGINT,
    avg_power_watts NUMERIC,
    avg_weight_kg NUMERIC,
    total_inspections BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(p.id) as total_panels,
        COUNT(CASE WHEN p.status = 'COMPLETED' THEN 1 END) as completed_panels,
        COUNT(CASE WHEN p.status = 'IN_PROGRESS' THEN 1 END) as in_progress_panels,
        COUNT(CASE WHEN p.status = 'FAILED' THEN 1 END) as failed_panels,
        AVG(p.power_watts) as avg_power_watts,
        AVG(p.weight_kg) as avg_weight_kg,
        SUM(p.inspection_count) as total_inspections
    FROM panels p
    WHERE p.manufacturing_order_id = p_mo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get inspection statistics by station
CREATE OR REPLACE FUNCTION get_inspection_statistics_by_station(p_station_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE (
    total_inspections BIGINT,
    passed_inspections BIGINT,
    failed_inspections BIGINT,
    avg_inspection_time_minutes NUMERIC,
    unique_inspectors BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(i.id) as total_inspections,
        COUNT(CASE WHEN i.result = 'PASS' THEN 1 END) as passed_inspections,
        COUNT(CASE WHEN i.result = 'FAIL' THEN 1 END) as failed_inspections,
        AVG(EXTRACT(EPOCH FROM (i.updated_at - i.created_at)) / 60) as avg_inspection_time_minutes,
        COUNT(DISTINCT i.inspector_id) as unique_inspectors
    FROM inspections i
    WHERE i.station_id = p_station_id
      AND i.inspection_date >= CURRENT_DATE - (p_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get manufacturing order progress
CREATE OR REPLACE FUNCTION get_manufacturing_order_progress(p_mo_id UUID)
RETURNS TABLE (
    order_number VARCHAR(255),
    status VARCHAR(50),
    progress_percentage NUMERIC,
    panels_created BIGINT,
    panels_completed BIGINT,
    panels_failed BIGINT,
    estimated_completion_date TIMESTAMP
) AS $$
DECLARE
    v_mo RECORD;
BEGIN
    SELECT * INTO v_mo FROM manufacturing_orders WHERE id = p_mo_id;
    
    RETURN QUERY
    SELECT 
        v_mo.order_number,
        v_mo.status,
        CASE 
            WHEN v_mo.quantity = 0 THEN 0
            ELSE ROUND((COUNT(CASE WHEN p.status = 'COMPLETED' THEN 1 END)::NUMERIC / v_mo.quantity) * 100, 2)
        END as progress_percentage,
        COUNT(p.id) as panels_created,
        COUNT(CASE WHEN p.status = 'COMPLETED' THEN 1 END) as panels_completed,
        COUNT(CASE WHEN p.status = 'FAILED' THEN 1 END) as panels_failed,
        CASE 
            WHEN v_mo.status = 'COMPLETED' THEN v_mo.end_date
            ELSE v_mo.start_date + (v_mo.quantity * INTERVAL '5 minutes')
        END as estimated_completion_date
    FROM panels p
    WHERE p.manufacturing_order_id = p_mo_id
    GROUP BY v_mo.order_number, v_mo.status, v_mo.quantity, v_mo.start_date, v_mo.end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MATERIALIZED VIEWS FOR COMPLEX QUERIES
-- ============================================================================

-- Materialized view for daily production statistics
CREATE MATERIALIZED VIEW daily_production_stats AS
SELECT 
    DATE_TRUNC('day', p.created_at) as production_date,
    mo.id as manufacturing_order_id,
    mo.order_number,
    COUNT(p.id) as panels_created,
    COUNT(CASE WHEN p.status = 'COMPLETED' THEN 1 END) as panels_completed,
    COUNT(CASE WHEN p.status = 'FAILED' THEN 1 END) as panels_failed,
    AVG(p.power_watts) as avg_power_watts,
    AVG(p.weight_kg) as avg_weight_kg,
    SUM(p.inspection_count) as total_inspections
FROM panels p
JOIN manufacturing_orders mo ON p.manufacturing_order_id = mo.id
GROUP BY DATE_TRUNC('day', p.created_at), mo.id, mo.order_number
ORDER BY production_date DESC, mo.order_number;

-- Materialized view for station performance
CREATE MATERIALIZED VIEW station_performance_stats AS
SELECT 
    s.id as station_id,
    s.name as station_name,
    s.station_type,
    DATE_TRUNC('day', i.inspection_date) as inspection_date,
    COUNT(i.id) as total_inspections,
    COUNT(CASE WHEN i.result = 'PASS' THEN 1 END) as passed_inspections,
    COUNT(CASE WHEN i.result = 'FAIL' THEN 1 END) as failed_inspections,
    COUNT(DISTINCT i.inspector_id) as unique_inspectors,
    AVG(EXTRACT(EPOCH FROM (i.updated_at - i.created_at)) / 60) as avg_inspection_time_minutes
FROM stations s
LEFT JOIN inspections i ON s.id = i.station_id
WHERE i.inspection_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY s.id, s.name, s.station_type, DATE_TRUNC('day', i.inspection_date)
ORDER BY s.name, inspection_date DESC;

-- Materialized view for user activity
CREATE MATERIALIZED VIEW user_activity_stats AS
SELECT 
    u.id as user_id,
    u.username,
    u.role,
    DATE_TRUNC('day', p.created_at) as activity_date,
    COUNT(p.id) as panels_created,
    COUNT(i.id) as inspections_performed,
    COUNT(DISTINCT mo.id) as manufacturing_orders_worked_on
FROM users u
LEFT JOIN panels p ON u.id = p.created_by
LEFT JOIN inspections i ON u.id = i.inspector_id
LEFT JOIN manufacturing_orders mo ON u.id = mo.assigned_to
WHERE (p.created_at >= CURRENT_DATE - INTERVAL '30 days' OR 
       i.inspection_date >= CURRENT_DATE - INTERVAL '30 days' OR
       mo.created_at >= CURRENT_DATE - INTERVAL '30 days')
GROUP BY u.id, u.username, u.role, DATE_TRUNC('day', p.created_at)
ORDER BY u.username, activity_date DESC;

-- ============================================================================
-- INDEXES FOR MATERIALIZED VIEWS
-- ============================================================================

-- Indexes for daily production stats
CREATE INDEX idx_daily_production_stats_date ON daily_production_stats(production_date DESC);
CREATE INDEX idx_daily_production_stats_mo ON daily_production_stats(manufacturing_order_id);
CREATE INDEX idx_daily_production_stats_date_mo ON daily_production_stats(production_date DESC, manufacturing_order_id);

-- Indexes for station performance stats
CREATE INDEX idx_station_performance_stats_station ON station_performance_stats(station_id);
CREATE INDEX idx_station_performance_stats_date ON station_performance_stats(inspection_date DESC);
CREATE INDEX idx_station_performance_stats_station_date ON station_performance_stats(station_id, inspection_date DESC);

-- Indexes for user activity stats
CREATE INDEX idx_user_activity_stats_user ON user_activity_stats(user_id);
CREATE INDEX idx_user_activity_stats_date ON user_activity_stats(activity_date DESC);
CREATE INDEX idx_user_activity_stats_user_date ON user_activity_stats(user_id, activity_date DESC);

-- ============================================================================
-- REFRESH FUNCTIONS FOR MATERIALIZED VIEWS
-- ============================================================================

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_production_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY station_performance_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_activity_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to refresh materialized views for a specific date range
CREATE OR REPLACE FUNCTION refresh_materialized_views_for_date_range(p_start_date DATE, p_end_date DATE)
RETURNS VOID AS $$
BEGIN
    -- Drop and recreate materialized views for the date range
    DROP MATERIALIZED VIEW IF EXISTS daily_production_stats;
    DROP MATERIALIZED VIEW IF EXISTS station_performance_stats;
    DROP MATERIALIZED VIEW IF EXISTS user_activity_stats;
    
    -- Recreate with date filters
    CREATE MATERIALIZED VIEW daily_production_stats AS
    SELECT 
        DATE_TRUNC('day', p.created_at) as production_date,
        mo.id as manufacturing_order_id,
        mo.order_number,
        COUNT(p.id) as panels_created,
        COUNT(CASE WHEN p.status = 'COMPLETED' THEN 1 END) as panels_completed,
        COUNT(CASE WHEN p.status = 'FAILED' THEN 1 END) as panels_failed,
        AVG(p.power_watts) as avg_power_watts,
        AVG(p.weight_kg) as avg_weight_kg,
        SUM(p.inspection_count) as total_inspections
    FROM panels p
    JOIN manufacturing_orders mo ON p.manufacturing_order_id = mo.id
    WHERE DATE(p.created_at) BETWEEN p_start_date AND p_end_date
    GROUP BY DATE_TRUNC('day', p.created_at), mo.id, mo.order_number
    ORDER BY production_date DESC, mo.order_number;
    
    -- Recreate other views similarly...
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- QUERY PLAN ANALYSIS FUNCTIONS
-- ============================================================================

-- Function to analyze query performance
CREATE OR REPLACE FUNCTION analyze_query_performance(p_query TEXT)
RETURNS TABLE (
    plan_type TEXT,
    estimated_cost NUMERIC,
    estimated_rows BIGINT,
    actual_time_ms NUMERIC,
    actual_rows BIGINT
) AS $$
BEGIN
    RETURN QUERY
    EXECUTE 'EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ' || p_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions on functions
GRANT EXECUTE ON FUNCTION get_panel_statistics_by_mo TO solar_panel_user;
GRANT EXECUTE ON FUNCTION get_inspection_statistics_by_station TO solar_panel_user;
GRANT EXECUTE ON FUNCTION get_manufacturing_order_progress TO solar_panel_user;
GRANT EXECUTE ON FUNCTION refresh_all_materialized_views TO solar_panel_user;
GRANT EXECUTE ON FUNCTION refresh_materialized_views_for_date_range TO solar_panel_user;
GRANT EXECUTE ON FUNCTION analyze_query_performance TO solar_panel_user;

-- Grant permissions on materialized views
GRANT SELECT ON daily_production_stats TO solar_panel_user;
GRANT SELECT ON station_performance_stats TO solar_panel_user;
GRANT SELECT ON user_activity_stats TO solar_panel_user;

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================

-- This migration adds comprehensive performance optimization:
-- - Full-text search indexes for efficient text searching
-- - Partial indexes for common filter conditions
-- - Composite indexes for complex query patterns
-- - Functional indexes for date and string operations
-- - Covering indexes to reduce table lookups
-- - Materialized views for complex aggregations
-- - Query optimization functions for common operations
-- - Concurrent indexes for high-availability systems

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================

/*
-- To rollback this migration:

-- Drop materialized views
DROP MATERIALIZED VIEW IF EXISTS user_activity_stats;
DROP MATERIALIZED VIEW IF EXISTS station_performance_stats;
DROP MATERIALIZED VIEW IF EXISTS daily_production_stats;

-- Drop functions
DROP FUNCTION IF EXISTS analyze_query_performance(TEXT);
DROP FUNCTION IF EXISTS refresh_materialized_views_for_date_range(DATE, DATE);
DROP FUNCTION IF EXISTS refresh_all_materialized_views();
DROP FUNCTION IF EXISTS get_manufacturing_order_progress(UUID);
DROP FUNCTION IF EXISTS get_inspection_statistics_by_station(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_panel_statistics_by_mo(UUID);

-- Drop indexes (in reverse order of creation)
DROP INDEX IF EXISTS idx_user_activity_stats_user_date;
DROP INDEX IF EXISTS idx_user_activity_stats_date;
DROP INDEX IF EXISTS idx_user_activity_stats_user;
DROP INDEX IF EXISTS idx_station_performance_stats_station_date;
DROP INDEX IF EXISTS idx_station_performance_stats_date;
DROP INDEX IF EXISTS idx_station_performance_stats_station;
DROP INDEX IF EXISTS idx_daily_production_stats_date_mo;
DROP INDEX IF EXISTS idx_daily_production_stats_mo;
DROP INDEX IF EXISTS idx_daily_production_stats_date;

-- Drop covering indexes
DROP INDEX IF EXISTS idx_pallets_covering;
DROP INDEX IF EXISTS idx_inspections_covering;
DROP INDEX IF EXISTS idx_mo_covering;
DROP INDEX IF EXISTS idx_panels_covering;

-- Drop functional indexes
DROP INDEX IF EXISTS idx_users_email_lower;
DROP INDEX IF EXISTS idx_users_username_lower;
DROP INDEX IF EXISTS idx_pallets_barcode_lower;
DROP INDEX IF EXISTS idx_manufacturing_orders_order_number_lower;
DROP INDEX IF EXISTS idx_panels_barcode_lower;
DROP INDEX IF EXISTS idx_inspections_inspection_date_func;
DROP INDEX IF EXISTS idx_manufacturing_orders_end_date_func;
DROP INDEX IF EXISTS idx_manufacturing_orders_start_date_func;
DROP INDEX IF EXISTS idx_panels_created_date_func;

-- Drop composite indexes
DROP INDEX IF EXISTS idx_stations_name_type;
DROP INDEX IF EXISTS idx_stations_type_location;
DROP INDEX IF EXISTS idx_users_created_date;
DROP INDEX IF EXISTS idx_users_role_active;
DROP INDEX IF EXISTS idx_pallet_assignments_panel_date;
DROP INDEX IF EXISTS idx_pallet_assignments_pallet_position;
DROP INDEX IF EXISTS idx_inspections_mo_station_result;
DROP INDEX IF EXISTS idx_inspections_inspector_date;
DROP INDEX IF EXISTS idx_inspections_station_result_date;
DROP INDEX IF EXISTS idx_inspections_panel_station_date;
DROP INDEX IF EXISTS idx_pallets_barcode_status_date;
DROP INDEX IF EXISTS idx_pallets_capacity_assigned;
DROP INDEX IF EXISTS idx_pallets_mo_status_date;
DROP INDEX IF EXISTS idx_panels_inspection_count_status;
DROP INDEX IF EXISTS idx_panels_barcode_status_date;
DROP INDEX IF EXISTS idx_panels_mo_status_date;
DROP INDEX IF EXISTS idx_mo_created_date_status;
DROP INDEX IF EXISTS idx_mo_assigned_status;
DROP INDEX IF EXISTS idx_mo_status_priority_date;

-- Drop partial indexes
DROP INDEX IF EXISTS idx_stations_active;
DROP INDEX IF EXISTS idx_users_active;
DROP INDEX IF EXISTS idx_inspections_recent;
DROP INDEX IF EXISTS idx_pallets_active;
DROP INDEX IF EXISTS idx_manufacturing_orders_active;
DROP INDEX IF EXISTS idx_panels_active;

-- Drop full-text search indexes
DROP INDEX IF EXISTS idx_stations_description_gin;
DROP INDEX IF EXISTS idx_stations_name_gin;
DROP INDEX IF EXISTS idx_users_last_name_gin;
DROP INDEX IF EXISTS idx_users_first_name_gin;
DROP INDEX IF EXISTS idx_users_email_gin;
DROP INDEX IF EXISTS idx_users_username_gin;
DROP INDEX IF EXISTS idx_inspections_notes_gin;
DROP INDEX IF EXISTS idx_pallets_notes_gin;
DROP INDEX IF EXISTS idx_pallets_barcode_gin;
DROP INDEX IF EXISTS idx_manufacturing_orders_notes_gin;
DROP INDEX IF EXISTS idx_manufacturing_orders_description_gin;
DROP INDEX IF EXISTS idx_manufacturing_orders_order_number_gin;
DROP INDEX IF EXISTS idx_panels_notes_gin;
DROP INDEX IF EXISTS idx_panels_barcode_gin;
*/
