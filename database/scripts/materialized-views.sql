-- Materialized Views Implementation Script
-- Solar Panel Production Tracking System
-- Based on Performance Impact Analysis (Subtask 13.27) - Low Priority Optimizations
-- Created: August 25, 2025

-- This script implements materialized views for expensive aggregation queries
-- to improve dashboard and reporting performance.

-- ============================================================================
-- MATERIALIZED VIEWS IMPLEMENTATION
-- ============================================================================

-- Enable timing for performance measurement
\timing on

-- Log optimization start
\echo 'Starting Materialized Views Implementation...'
\echo 'Timestamp: ' || CURRENT_TIMESTAMP

-- ============================================================================
-- 1. MATERIALIZED VIEW FOR PANEL STATUS SUMMARY
-- ============================================================================

\echo 'Creating materialized view for panel status summary...'

-- Materialized view for panel status aggregation
-- Expected improvement: 70-90% faster dashboard queries
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_panel_status_summary AS
SELECT 
    status,
    COUNT(*) as panel_count,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_processing_hours,
    MIN(created_at) as earliest_panel,
    MAX(updated_at) as latest_update,
    COUNT(CASE WHEN updated_at >= CURRENT_DATE - INTERVAL '24 hours' THEN 1 END) as panels_updated_24h,
    COUNT(CASE WHEN updated_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as panels_updated_7d
FROM panels 
GROUP BY status;

-- Create index on materialized view for faster queries
CREATE INDEX IF NOT EXISTS idx_mv_panel_status_summary_status 
ON mv_panel_status_summary (status);

-- ============================================================================
-- 2. MATERIALIZED VIEW FOR STATION PERFORMANCE
-- ============================================================================

\echo 'Creating materialized view for station performance...'

-- Materialized view for station performance metrics
-- Expected improvement: 60-80% faster station analysis queries
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_station_performance AS
SELECT 
    s.id as station_id,
    s.name as station_name,
    s.station_type,
    COUNT(i.id) as total_inspections,
    COUNT(CASE WHEN i.result = 'PASS' THEN 1 END) as passed_inspections,
    COUNT(CASE WHEN i.result = 'FAIL' THEN 1 END) as failed_inspections,
    ROUND(
        (COUNT(CASE WHEN i.result = 'PASS' THEN 1 END)::NUMERIC / 
         NULLIF(COUNT(i.id), 0)::NUMERIC) * 100, 2
    ) as pass_rate_percentage,
    AVG(EXTRACT(EPOCH FROM (i.inspection_date - i.created_at))/60) as avg_inspection_time_minutes,
    COUNT(CASE WHEN i.inspection_date >= CURRENT_DATE - INTERVAL '24 hours' THEN 1 END) as inspections_24h,
    COUNT(CASE WHEN i.inspection_date >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as inspections_7d,
    MAX(i.inspection_date) as last_inspection_date
FROM stations s
LEFT JOIN inspections i ON s.id = i.station_id
GROUP BY s.id, s.name, s.station_type;

-- Create indexes on materialized view
CREATE INDEX IF NOT EXISTS idx_mv_station_performance_station_id 
ON mv_station_performance (station_id);

CREATE INDEX IF NOT EXISTS idx_mv_station_performance_pass_rate 
ON mv_station_performance (pass_rate_percentage DESC);

-- ============================================================================
-- 3. MATERIALIZED VIEW FOR MANUFACTURING ORDER PROGRESS
-- ============================================================================

\echo 'Creating materialized view for manufacturing order progress...'

-- Materialized view for manufacturing order progress tracking
-- Expected improvement: 50-70% faster MO progress queries
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_mo_progress AS
SELECT 
    mo.id as mo_id,
    mo.order_number,
    mo.status as mo_status,
    mo.start_date,
    mo.expected_completion_date,
    COUNT(p.id) as total_panels,
    COUNT(CASE WHEN p.status = 'COMPLETED' THEN 1 END) as completed_panels,
    COUNT(CASE WHEN p.status = 'IN_PROGRESS' THEN 1 END) as in_progress_panels,
    COUNT(CASE WHEN p.status = 'INSPECTION' THEN 1 END) as inspection_panels,
    COUNT(CASE WHEN p.status = 'PENDING' THEN 1 END) as pending_panels,
    ROUND(
        (COUNT(CASE WHEN p.status = 'COMPLETED' THEN 1 END)::NUMERIC / 
         NULLIF(COUNT(p.id), 0)::NUMERIC) * 100, 2
    ) as completion_percentage,
    AVG(EXTRACT(EPOCH FROM (p.updated_at - p.created_at))/3600) as avg_panel_processing_hours,
    MIN(p.created_at) as first_panel_created,
    MAX(p.updated_at) as last_panel_updated,
    CASE 
        WHEN mo.expected_completion_date IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (mo.expected_completion_date - CURRENT_TIMESTAMP))/3600
        ELSE NULL 
    END as hours_until_expected_completion
FROM manufacturing_orders mo
LEFT JOIN panels p ON mo.id = p.manufacturing_order_id
GROUP BY mo.id, mo.order_number, mo.status, mo.start_date, mo.expected_completion_date;

-- Create indexes on materialized view
CREATE INDEX IF NOT EXISTS idx_mv_mo_progress_mo_id 
ON mv_mo_progress (mo_id);

CREATE INDEX IF NOT EXISTS idx_mv_mo_progress_completion_percentage 
ON mv_mo_progress (completion_percentage DESC);

CREATE INDEX IF NOT EXISTS idx_mv_mo_progress_status 
ON mv_mo_progress (mo_status);

-- ============================================================================
-- 4. MATERIALIZED VIEW FOR QUALITY METRICS
-- ============================================================================

\echo 'Creating materialized view for quality metrics...'

-- Materialized view for quality control metrics
-- Expected improvement: 65-85% faster quality analysis queries
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_quality_metrics AS
SELECT 
    DATE_TRUNC('day', i.inspection_date) as inspection_date,
    s.station_type,
    COUNT(i.id) as total_inspections,
    COUNT(CASE WHEN i.result = 'PASS' THEN 1 END) as passed_inspections,
    COUNT(CASE WHEN i.result = 'FAIL' THEN 1 END) as failed_inspections,
    ROUND(
        (COUNT(CASE WHEN i.result = 'PASS' THEN 1 END)::NUMERIC / 
         NULLIF(COUNT(i.id), 0)::NUMERIC) * 100, 2
    ) as daily_pass_rate,
    AVG(EXTRACT(EPOCH FROM (i.inspection_date - i.created_at))/60) as avg_inspection_time_minutes,
    COUNT(DISTINCT i.panel_id) as unique_panels_inspected,
    COUNT(DISTINCT i.inspector_id) as inspectors_working
FROM inspections i
JOIN stations s ON i.station_id = s.id
WHERE i.inspection_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', i.inspection_date), s.station_type
ORDER BY inspection_date DESC, s.station_type;

-- Create indexes on materialized view
CREATE INDEX IF NOT EXISTS idx_mv_quality_metrics_date 
ON mv_quality_metrics (inspection_date DESC);

CREATE INDEX IF NOT EXISTS idx_mv_quality_metrics_station_type 
ON mv_quality_metrics (station_type);

-- ============================================================================
-- 5. MATERIALIZED VIEW FOR WORKFLOW EFFICIENCY
-- ============================================================================

\echo 'Creating materialized view for workflow efficiency...'

-- Materialized view for workflow efficiency analysis
-- Expected improvement: 55-75% faster workflow analysis queries
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_workflow_efficiency AS
SELECT 
    p.status as panel_status,
    s.station_type,
    COUNT(p.id) as panels_at_station,
    AVG(EXTRACT(EPOCH FROM (p.updated_at - p.created_at))/3600) as avg_time_at_station_hours,
    MIN(EXTRACT(EPOCH FROM (p.updated_at - p.created_at))/3600) as min_time_at_station_hours,
    MAX(EXTRACT(EPOCH FROM (p.updated_at - p.created_at))/3600) as max_time_at_station_hours,
    COUNT(CASE WHEN p.updated_at >= CURRENT_DATE - INTERVAL '24 hours' THEN 1 END) as panels_processed_24h,
    COUNT(CASE WHEN p.updated_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as panels_processed_7d,
    ROUND(
        (COUNT(CASE WHEN p.updated_at >= CURRENT_DATE - INTERVAL '24 hours' THEN 1 END)::NUMERIC / 
         NULLIF(COUNT(p.id), 0)::NUMERIC) * 100, 2
    ) as processing_rate_24h
FROM panels p
JOIN stations s ON p.current_station_id = s.id
GROUP BY p.status, s.station_type;

-- Create indexes on materialized view
CREATE INDEX IF NOT EXISTS idx_mv_workflow_efficiency_status 
ON mv_workflow_efficiency (panel_status);

CREATE INDEX IF NOT EXISTS idx_mv_workflow_efficiency_station_type 
ON mv_workflow_efficiency (station_type);

-- ============================================================================
-- 6. REFRESH FUNCTIONS AND LOGGING
-- ============================================================================

\echo 'Creating refresh functions and logging tables...'

-- Logging table for materialized view refresh operations
CREATE TABLE IF NOT EXISTS materialized_view_refresh_log (
    id SERIAL PRIMARY KEY,
    refresh_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    view_name TEXT NOT NULL,
    refresh_duration_ms NUMERIC(10,3),
    rows_affected INTEGER,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT
);

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS VOID AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    view_name TEXT;
    refresh_start TIMESTAMP;
    refresh_end TIMESTAMP;
    rows_count INTEGER;
BEGIN
    start_time := clock_timestamp();
    
    -- List of materialized views to refresh
    FOR view_name IN 
        SELECT matviewname 
        FROM pg_matviews 
        WHERE schemaname = 'public'
        ORDER BY 
            CASE matviewname 
                WHEN 'mv_panel_status_summary' THEN 1
                WHEN 'mv_station_performance' THEN 2
                WHEN 'mv_mo_progress' THEN 3
                WHEN 'mv_quality_metrics' THEN 4
                WHEN 'mv_workflow_efficiency' THEN 5
                ELSE 6
            END
    LOOP
        refresh_start := clock_timestamp();
        
        BEGIN
            -- Refresh materialized view
            EXECUTE format('REFRESH MATERIALIZED VIEW CONCURRENTLY %I', view_name);
            
            -- Get row count
            EXECUTE format('SELECT COUNT(*) FROM %I', view_name) INTO rows_count;
            
            refresh_end := clock_timestamp();
            
            -- Log successful refresh
            INSERT INTO materialized_view_refresh_log (
                view_name,
                refresh_duration_ms,
                rows_affected,
                success
            ) VALUES (
                view_name,
                EXTRACT(EPOCH FROM (refresh_end - refresh_start)) * 1000,
                rows_count,
                TRUE
            );
            
        EXCEPTION WHEN OTHERS THEN
            refresh_end := clock_timestamp();
            
            -- Log failed refresh
            INSERT INTO materialized_view_refresh_log (
                view_name,
                refresh_duration_ms,
                rows_affected,
                success,
                error_message
            ) VALUES (
                view_name,
                EXTRACT(EPOCH FROM (refresh_end - refresh_start)) * 1000,
                0,
                FALSE,
                SQLERRM
            );
        END;
    END LOOP;
    
    end_time := clock_timestamp();
    
    -- Log overall refresh operation
    INSERT INTO materialized_view_refresh_log (
        view_name,
        refresh_duration_ms,
        rows_affected,
        success
    ) VALUES (
        'ALL_VIEWS',
        EXTRACT(EPOCH FROM (end_time - start_time)) * 1000,
        0,
        TRUE
    );
END;
$$ LANGUAGE plpgsql;

-- Function to refresh specific materialized view
CREATE OR REPLACE FUNCTION refresh_materialized_view(view_name TEXT)
RETURNS VOID AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    rows_count INTEGER;
BEGIN
    start_time := clock_timestamp();
    
    BEGIN
        -- Refresh specific materialized view
        EXECUTE format('REFRESH MATERIALIZED VIEW CONCURRENTLY %I', view_name);
        
        -- Get row count
        EXECUTE format('SELECT COUNT(*) FROM %I', view_name) INTO rows_count;
        
        end_time := clock_timestamp();
        
        -- Log successful refresh
        INSERT INTO materialized_view_refresh_log (
            view_name,
            refresh_duration_ms,
            rows_affected,
            success
        ) VALUES (
            view_name,
            EXTRACT(EPOCH FROM (end_time - start_time)) * 1000,
            rows_count,
            TRUE
        );
        
    EXCEPTION WHEN OTHERS THEN
        end_time := clock_timestamp();
        
        -- Log failed refresh
        INSERT INTO materialized_view_refresh_log (
            view_name,
            refresh_duration_ms,
            rows_affected,
            success,
            error_message
        ) VALUES (
            view_name,
            EXTRACT(EPOCH FROM (end_time - start_time)) * 1000,
            0,
            FALSE,
            SQLERRM
        );
        
        RAISE;
    END;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. PERFORMANCE MONITORING FUNCTIONS
-- ============================================================================

\echo 'Creating performance monitoring functions...'

-- Function to analyze materialized view performance
CREATE OR REPLACE FUNCTION analyze_materialized_view_performance()
RETURNS TABLE (
    view_name TEXT,
    total_rows INTEGER,
    last_refresh TIMESTAMP,
    avg_refresh_time_ms NUMERIC(10,3),
    refresh_success_rate NUMERIC(5,2),
    recommendation TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mv.matviewname as view_name,
        COALESCE(stats.total_rows, 0) as total_rows,
        COALESCE(refresh_stats.last_refresh, '1970-01-01'::TIMESTAMP) as last_refresh,
        COALESCE(refresh_stats.avg_refresh_time_ms, 0) as avg_refresh_time_ms,
        COALESCE(refresh_stats.success_rate, 0) as refresh_success_rate,
        CASE 
            WHEN COALESCE(refresh_stats.last_refresh, '1970-01-01'::TIMESTAMP) < CURRENT_TIMESTAMP - INTERVAL '1 hour' 
            THEN 'Consider refreshing view - data may be stale'
            WHEN COALESCE(refresh_stats.avg_refresh_time_ms, 0) > 5000 
            THEN 'Consider optimizing view - refresh time is high'
            WHEN COALESCE(refresh_stats.success_rate, 0) < 95 
            THEN 'Investigate refresh failures - success rate is low'
            ELSE 'View performance is good'
        END as recommendation
    FROM pg_matviews mv
    LEFT JOIN (
        SELECT 
            view_name,
            COUNT(*) as total_rows
        FROM (
            SELECT 'mv_panel_status_summary' as view_name, COUNT(*) as total_rows FROM mv_panel_status_summary
            UNION ALL
            SELECT 'mv_station_performance' as view_name, COUNT(*) as total_rows FROM mv_station_performance
            UNION ALL
            SELECT 'mv_mo_progress' as view_name, COUNT(*) as total_rows FROM mv_mo_progress
            UNION ALL
            SELECT 'mv_quality_metrics' as view_name, COUNT(*) as total_rows FROM mv_quality_metrics
            UNION ALL
            SELECT 'mv_workflow_efficiency' as view_name, COUNT(*) as total_rows FROM mv_workflow_efficiency
        ) stats
        GROUP BY view_name
    ) stats ON mv.matviewname = stats.view_name
    LEFT JOIN (
        SELECT 
            view_name,
            MAX(refresh_timestamp) as last_refresh,
            AVG(refresh_duration_ms) as avg_refresh_time_ms,
            ROUND(
                (COUNT(CASE WHEN success THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2
            ) as success_rate
        FROM materialized_view_refresh_log
        WHERE view_name != 'ALL_VIEWS'
        GROUP BY view_name
    ) refresh_stats ON mv.matviewname = refresh_stats.view_name
    WHERE mv.schemaname = 'public'
    ORDER BY mv.matviewname;
END;
$$ LANGUAGE plpgsql;

-- Function to get materialized view usage statistics
CREATE OR REPLACE FUNCTION get_materialized_view_usage_stats()
RETURNS TABLE (
    view_name TEXT,
    estimated_size_mb NUMERIC(10,2),
    index_size_mb NUMERIC(10,2),
    total_size_mb NUMERIC(10,2),
    last_analyzed TIMESTAMP,
    auto_vacuum_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.tablename as view_name,
        ROUND(pg_total_relation_size(t.tablename::regclass) / 1024.0 / 1024.0, 2) as estimated_size_mb,
        ROUND(pg_indexes_size(t.tablename::regclass) / 1024.0 / 1024.0, 2) as index_size_mb,
        ROUND((pg_total_relation_size(t.tablename::regclass) + pg_indexes_size(t.tablename::regclass)) / 1024.0 / 1024.0, 2) as total_size_mb,
        s.last_analyzed,
        s.autovacuum_count
    FROM pg_tables t
    JOIN pg_stat_user_tables s ON t.tablename = s.relname
    WHERE t.tablename LIKE 'mv_%'
    ORDER BY total_size_mb DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. INITIAL DATA POPULATION
-- ============================================================================

\echo 'Populating materialized views with initial data...'

-- Populate all materialized views with current data
SELECT refresh_all_materialized_views();

-- ============================================================================
-- 9. PERFORMANCE VALIDATION
-- ============================================================================

\echo 'Validating materialized view performance...'

-- Test query performance improvements
\echo 'Testing panel status summary query performance...'
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) 
SELECT * FROM mv_panel_status_summary WHERE status = 'IN_PROGRESS';

\echo 'Testing station performance query performance...'
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) 
SELECT * FROM mv_station_performance WHERE pass_rate_percentage > 95;

\echo 'Testing manufacturing order progress query performance...'
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) 
SELECT * FROM mv_mo_progress WHERE completion_percentage < 50;

-- ============================================================================
-- 10. SUMMARY AND RECOMMENDATIONS
-- ============================================================================

\echo 'Materialized Views Implementation Complete!'
\echo 'Timestamp: ' || CURRENT_TIMESTAMP

\echo ''
\echo '=== MATERIALIZED VIEWS CREATED ==='
SELECT matviewname as view_name, 
       pg_size_pretty(pg_total_relation_size(matviewname::regclass)) as size
FROM pg_matviews 
WHERE schemaname = 'public'
ORDER BY matviewname;

\echo ''
\echo '=== PERFORMANCE ANALYSIS ==='
SELECT * FROM analyze_materialized_view_performance();

\echo ''
\echo '=== USAGE STATISTICS ==='
SELECT * FROM get_materialized_view_usage_stats();

\echo ''
\echo '=== REFRESH RECOMMENDATIONS ==='
\echo '1. Set up automated refresh every 15 minutes for real-time dashboards'
\echo '2. Monitor refresh performance and adjust frequency as needed'
\echo '3. Consider incremental refresh for large views if performance degrades'
\echo '4. Set up alerts for refresh failures'
\echo '5. Monitor view sizes and consider archiving old data'

\echo ''
\echo '=== NEXT STEPS ==='
\echo '1. Test dashboard queries against materialized views'
\echo '2. Set up automated refresh schedule'
\echo '3. Monitor performance improvements'
\echo '4. Adjust refresh frequency based on data freshness requirements'
\echo '5. Consider additional materialized views for specific use cases'
