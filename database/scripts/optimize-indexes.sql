-- High Priority Index Optimization Script
-- Solar Panel Production Tracking System
-- Based on Performance Impact Analysis (Subtask 13.27)
-- Created: August 25, 2025

-- This script implements the high priority index optimizations
-- identified in the performance impact analysis.

-- ============================================================================
-- INDEX OPTIMIZATION IMPLEMENTATION
-- ============================================================================

-- Enable timing for performance measurement
\timing on

-- Log optimization start
\echo 'Starting High Priority Index Optimization...'
\echo 'Timestamp: ' || CURRENT_TIMESTAMP

-- ============================================================================
-- 1. COMPOSITE INDEXES FOR COMPLEX JOINS
-- ============================================================================

\echo 'Creating composite indexes for complex joins...'

-- Manufacturing Order + Panel join optimization
-- Expected improvement: 25-30% for MO-panel queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_manufacturing_orders_panels 
ON panels (manufacturing_order_id, status, created_at);

\echo 'Created: idx_manufacturing_orders_panels'

-- Inspection complex join optimization
-- Expected improvement: 20-25% for inspection queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inspections_complex 
ON inspections (panel_id, station_id, inspection_date, result);

\echo 'Created: idx_inspections_complex'

-- Station performance query optimization
-- Expected improvement: 30-35% for station performance queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inspections_station_performance 
ON inspections (station_id, inspection_date, result);

\echo 'Created: idx_inspections_station_performance'

-- ============================================================================
-- 2. STATUS-BASED QUERY OPTIMIZATION
-- ============================================================================

\echo 'Creating status-based indexes...'

-- Panel status queries (most frequent)
-- Expected improvement: 25-30% for status queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_panels_status_workflow 
ON panels (status, current_station_id, updated_at);

\echo 'Created: idx_panels_status_workflow'

-- Manufacturing order status queries
-- Expected improvement: 20-25% for MO status queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_manufacturing_orders_status 
ON manufacturing_orders (status, start_date, end_date);

\echo 'Created: idx_manufacturing_orders_status'

-- ============================================================================
-- 3. DATE RANGE QUERY OPTIMIZATION
-- ============================================================================

\echo 'Creating date range indexes...'

-- Inspection date range queries
-- Expected improvement: 30-35% for date range queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inspections_date_range 
ON inspections (inspection_date DESC, panel_id);

\echo 'Created: idx_inspections_date_range'

-- Panel creation date queries
-- Expected improvement: 25-30% for creation date queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_panels_creation_date 
ON panels (created_at DESC, status);

\echo 'Created: idx_panels_creation_date'

-- ============================================================================
-- 4. BARCODE AND REFERENCE OPTIMIZATION
-- ============================================================================

\echo 'Creating barcode and reference indexes...'

-- Barcode lookup optimization
-- Expected improvement: 40-50% for barcode lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_panels_barcode_lookup 
ON panels (barcode) WHERE barcode IS NOT NULL;

\echo 'Created: idx_panels_barcode_lookup'

-- Manufacturing order reference optimization
-- Expected improvement: 35-40% for reference lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_manufacturing_orders_reference 
ON manufacturing_orders (reference) WHERE reference IS NOT NULL;

\echo 'Created: idx_manufacturing_orders_reference'

-- ============================================================================
-- 5. ADDITIONAL PERFORMANCE INDEXES
-- ============================================================================

\echo 'Creating additional performance indexes...'

-- User activity optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_panels_created_by 
ON panels (created_by, created_at DESC);

\echo 'Created: idx_panels_created_by'

-- Inspection inspector optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inspections_inspector 
ON inspections (inspector_id, inspection_date DESC);

\echo 'Created: idx_inspections_inspector'

-- Pallet assignment optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pallet_assignments_panel 
ON pallet_assignments (panel_id, assigned_at DESC);

\echo 'Created: idx_pallet_assignments_panel'

-- ============================================================================
-- 6. INDEX EFFECTIVENESS VERIFICATION
-- ============================================================================

\echo 'Verifying index effectiveness...'

-- Check index creation status
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Check index sizes
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes 
WHERE indexname LIKE 'idx_%'
ORDER BY pg_relation_size(indexname::regclass) DESC;

-- ============================================================================
-- 7. PERFORMANCE TESTING QUERIES
-- ============================================================================

\echo 'Running performance test queries...'

-- Test 1: Panel status query (should use idx_panels_status_workflow)
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) 
SELECT * FROM panels WHERE status = 'in_production' LIMIT 100;

-- Test 2: Manufacturing order with panels join (should use idx_manufacturing_orders_panels)
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) 
SELECT mo.id, mo.panel_type, mo.quantity, COUNT(p.id) as panel_count 
FROM manufacturing_orders mo 
LEFT JOIN panels p ON mo.id = p.manufacturing_order_id 
GROUP BY mo.id, mo.panel_type, mo.quantity 
LIMIT 50;

-- Test 3: Inspection complex join (should use idx_inspections_complex)
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) 
SELECT i.id, p.barcode, s.name as station_name, i.result, i.inspection_date
FROM inspections i 
JOIN panels p ON i.panel_id = p.id 
JOIN stations s ON i.station_id = s.id 
WHERE i.inspection_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY i.inspection_date DESC 
LIMIT 100;

-- Test 4: Station performance (should use idx_inspections_station_performance)
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) 
SELECT 
  s.name as station_name,
  COUNT(i.id) as inspection_count,
  AVG(CASE WHEN i.result = 'pass' THEN 1 ELSE 0 END) as pass_rate
FROM stations s
LEFT JOIN inspections i ON s.id = i.station_id
WHERE i.inspection_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY s.id, s.name
ORDER BY inspection_count DESC;

-- Test 5: Barcode lookup (should use idx_panels_barcode_lookup)
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) 
SELECT * FROM panels WHERE barcode = 'SP12345678';

-- ============================================================================
-- 8. INDEX USAGE MONITORING
-- ============================================================================

\echo 'Setting up index usage monitoring...'

-- Create a view for monitoring index usage
CREATE OR REPLACE VIEW index_usage_monitoring AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size,
    CASE 
        WHEN idx_scan = 0 THEN 'Unused'
        WHEN idx_scan < 10 THEN 'Low Usage'
        WHEN idx_scan < 100 THEN 'Medium Usage'
        ELSE 'High Usage'
    END as usage_level
FROM pg_stat_user_indexes 
WHERE indexname LIKE 'idx_%'
ORDER BY idx_scan DESC;

-- Display current index usage
SELECT * FROM index_usage_monitoring;

-- ============================================================================
-- 9. OPTIMIZATION SUMMARY
-- ============================================================================

\echo 'Index Optimization Summary:'
\echo '=========================='

-- Count of new indexes created
SELECT COUNT(*) as total_new_indexes
FROM pg_indexes 
WHERE indexname LIKE 'idx_%';

-- Total index size
SELECT pg_size_pretty(SUM(pg_relation_size(indexname::regclass))) as total_index_size
FROM pg_indexes 
WHERE indexname LIKE 'idx_%';

-- Expected performance improvements
\echo 'Expected Performance Improvements:'
\echo '- Panel Status Queries: 25-30% faster'
\echo '- Complex Joins: 20-25% faster'
\echo '- Date Range Queries: 30-35% faster'
\echo '- Barcode Lookups: 40-50% faster'
\echo '- Overall System: 20-30% improvement'

\echo 'Index optimization completed successfully!'
\echo 'Timestamp: ' || CURRENT_TIMESTAMP

-- Disable timing
\timing off
