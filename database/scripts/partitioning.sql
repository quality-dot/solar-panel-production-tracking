-- Database Partitioning Implementation Script
-- Solar Panel Production Tracking System
-- Based on Performance Impact Analysis (Subtask 13.27) - Low Priority Optimizations
-- Created: August 25, 2025

-- This script implements table partitioning for improved query performance
-- and efficient data management.

-- ============================================================================
-- DATABASE PARTITIONING IMPLEMENTATION
-- ============================================================================

-- Enable timing for performance measurement
\timing on

-- Log optimization start
\echo 'Starting Database Partitioning Implementation...'
\echo 'Timestamp: ' || CURRENT_TIMESTAMP

-- ============================================================================
-- 1. CREATE TABLESPACES FOR PARTITIONING
-- ============================================================================

\echo 'Creating tablespaces for partitioning...'

-- Create tablespace for current data (fast storage)
CREATE TABLESPACE IF NOT EXISTS current_data_tablespace 
LOCATION '/var/lib/postgresql/data/current_data';

-- Create tablespace for archive data (slower, cheaper storage)
CREATE TABLESPACE IF NOT EXISTS archive_tablespace 
LOCATION '/var/lib/postgresql/data/archive_data';

-- Create tablespace for indexes (fast storage)
CREATE TABLESPACE IF NOT EXISTS index_tablespace 
LOCATION '/var/lib/postgresql/data/index_data';

-- ============================================================================
-- 2. PANELS TABLE PARTITIONING
-- ============================================================================

\echo 'Creating partitioned panels table...'

-- Create partitioned panels table
CREATE TABLE IF NOT EXISTS panels_partitioned (
    id UUID PRIMARY KEY,
    barcode TEXT NOT NULL,
    type TEXT NOT NULL,
    specifications JSONB,
    status TEXT NOT NULL,
    manufacturing_order_id UUID REFERENCES manufacturing_orders(id),
    current_station_id INTEGER REFERENCES stations(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (created_at)
TABLESPACE current_data_tablespace;

-- Create monthly partitions for panels (current year)
CREATE TABLE IF NOT EXISTS panels_2024_01 PARTITION OF panels_partitioned
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01')
TABLESPACE current_data_tablespace;

CREATE TABLE IF NOT EXISTS panels_2024_02 PARTITION OF panels_partitioned
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01')
TABLESPACE current_data_tablespace;

CREATE TABLE IF NOT EXISTS panels_2024_03 PARTITION OF panels_partitioned
FOR VALUES FROM ('2024-03-01') TO ('2024-04-01')
TABLESPACE current_data_tablespace;

CREATE TABLE IF NOT EXISTS panels_2024_04 PARTITION OF panels_partitioned
FOR VALUES FROM ('2024-04-01') TO ('2024-05-01')
TABLESPACE current_data_tablespace;

CREATE TABLE IF NOT EXISTS panels_2024_05 PARTITION OF panels_partitioned
FOR VALUES FROM ('2024-05-01') TO ('2024-06-01')
TABLESPACE current_data_tablespace;

CREATE TABLE IF NOT EXISTS panels_2024_06 PARTITION OF panels_partitioned
FOR VALUES FROM ('2024-06-01') TO ('2024-07-01')
TABLESPACE current_data_tablespace;

CREATE TABLE IF NOT EXISTS panels_2024_07 PARTITION OF panels_partitioned
FOR VALUES FROM ('2024-07-01') TO ('2024-08-01')
TABLESPACE current_data_tablespace;

CREATE TABLE IF NOT EXISTS panels_2024_08 PARTITION OF panels_partitioned
FOR VALUES FROM ('2024-08-01') TO ('2024-09-01')
TABLESPACE current_data_tablespace;

CREATE TABLE IF NOT EXISTS panels_2024_09 PARTITION OF panels_partitioned
FOR VALUES FROM ('2024-09-01') TO ('2024-10-01')
TABLESPACE current_data_tablespace;

CREATE TABLE IF NOT EXISTS panels_2024_10 PARTITION OF panels_partitioned
FOR VALUES FROM ('2024-10-01') TO ('2024-11-01')
TABLESPACE current_data_tablespace;

CREATE TABLE IF NOT EXISTS panels_2024_11 PARTITION OF panels_partitioned
FOR VALUES FROM ('2024-11-01') TO ('2024-12-01')
TABLESPACE current_data_tablespace;

CREATE TABLE IF NOT EXISTS panels_2024_12 PARTITION OF panels_partitioned
FOR VALUES FROM ('2024-12-01') TO ('2025-01-01')
TABLESPACE current_data_tablespace;

-- Create indexes on partitioned table
CREATE INDEX IF NOT EXISTS idx_panels_partitioned_barcode 
ON panels_partitioned (barcode) 
TABLESPACE index_tablespace;

CREATE INDEX IF NOT EXISTS idx_panels_partitioned_status 
ON panels_partitioned (status) 
TABLESPACE index_tablespace;

CREATE INDEX IF NOT EXISTS idx_panels_partitioned_manufacturing_order_id 
ON panels_partitioned (manufacturing_order_id) 
TABLESPACE index_tablespace;

CREATE INDEX IF NOT EXISTS idx_panels_partitioned_current_station_id 
ON panels_partitioned (current_station_id) 
TABLESPACE index_tablespace;

CREATE INDEX IF NOT EXISTS idx_panels_partitioned_created_at 
ON panels_partitioned (created_at) 
TABLESPACE index_tablespace;

-- ============================================================================
-- 3. INSPECTIONS TABLE PARTITIONING
-- ============================================================================

\echo 'Creating partitioned inspections table...'

-- Create partitioned inspections table
CREATE TABLE IF NOT EXISTS inspections_partitioned (
    id SERIAL PRIMARY KEY,
    panel_id UUID REFERENCES panels(id),
    station_id INTEGER REFERENCES stations(id),
    inspector_id INTEGER REFERENCES users(id),
    result TEXT NOT NULL,
    notes TEXT,
    inspection_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (inspection_date)
TABLESPACE current_data_tablespace;

-- Create monthly partitions for inspections (current year)
CREATE TABLE IF NOT EXISTS inspections_2024_01 PARTITION OF inspections_partitioned
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01')
TABLESPACE current_data_tablespace;

CREATE TABLE IF NOT EXISTS inspections_2024_02 PARTITION OF inspections_partitioned
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01')
TABLESPACE current_data_tablespace;

CREATE TABLE IF NOT EXISTS inspections_2024_03 PARTITION OF inspections_partitioned
FOR VALUES FROM ('2024-03-01') TO ('2024-04-01')
TABLESPACE current_data_tablespace;

CREATE TABLE IF NOT EXISTS inspections_2024_04 PARTITION OF inspections_partitioned
FOR VALUES FROM ('2024-04-01') TO ('2024-05-01')
TABLESPACE current_data_tablespace;

CREATE TABLE IF NOT EXISTS inspections_2024_05 PARTITION OF inspections_partitioned
FOR VALUES FROM ('2024-05-01') TO ('2024-06-01')
TABLESPACE current_data_tablespace;

CREATE TABLE IF NOT EXISTS inspections_2024_06 PARTITION OF inspections_partitioned
FOR VALUES FROM ('2024-06-01') TO ('2024-07-01')
TABLESPACE current_data_tablespace;

CREATE TABLE IF NOT EXISTS inspections_2024_07 PARTITION OF inspections_partitioned
FOR VALUES FROM ('2024-07-01') TO ('2024-08-01')
TABLESPACE current_data_tablespace;

CREATE TABLE IF NOT EXISTS inspections_2024_08 PARTITION OF inspections_partitioned
FOR VALUES FROM ('2024-08-01') TO ('2024-09-01')
TABLESPACE current_data_tablespace;

CREATE TABLE IF NOT EXISTS inspections_2024_09 PARTITION OF inspections_partitioned
FOR VALUES FROM ('2024-09-01') TO ('2024-10-01')
TABLESPACE current_data_tablespace;

CREATE TABLE IF NOT EXISTS inspections_2024_10 PARTITION OF inspections_partitioned
FOR VALUES FROM ('2024-10-01') TO ('2024-11-01')
TABLESPACE current_data_tablespace;

CREATE TABLE IF NOT EXISTS inspections_2024_11 PARTITION OF inspections_partitioned
FOR VALUES FROM ('2024-11-01') TO ('2024-12-01')
TABLESPACE current_data_tablespace;

CREATE TABLE IF NOT EXISTS inspections_2024_12 PARTITION OF inspections_partitioned
FOR VALUES FROM ('2024-12-01') TO ('2025-01-01')
TABLESPACE current_data_tablespace;

-- Create indexes on partitioned inspections table
CREATE INDEX IF NOT EXISTS idx_inspections_partitioned_panel_id 
ON inspections_partitioned (panel_id) 
TABLESPACE index_tablespace;

CREATE INDEX IF NOT EXISTS idx_inspections_partitioned_station_id 
ON inspections_partitioned (station_id) 
TABLESPACE index_tablespace;

CREATE INDEX IF NOT EXISTS idx_inspections_partitioned_inspector_id 
ON inspections_partitioned (inspector_id) 
TABLESPACE index_tablespace;

CREATE INDEX IF NOT EXISTS idx_inspections_partitioned_result 
ON inspections_partitioned (result) 
TABLESPACE index_tablespace;

CREATE INDEX IF NOT EXISTS idx_inspections_partitioned_inspection_date 
ON inspections_partitioned (inspection_date) 
TABLESPACE index_tablespace;

-- ============================================================================
-- 4. MANUFACTURING ORDERS TABLE PARTITIONING
-- ============================================================================

\echo 'Creating partitioned manufacturing orders table...'

-- Create partitioned manufacturing orders table
CREATE TABLE IF NOT EXISTS manufacturing_orders_partitioned (
    id UUID PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL,
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expected_completion_date TIMESTAMP,
    actual_completion_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (start_date)
TABLESPACE current_data_tablespace;

-- Create quarterly partitions for manufacturing orders (current year)
CREATE TABLE IF NOT EXISTS manufacturing_orders_2024_q1 PARTITION OF manufacturing_orders_partitioned
FOR VALUES FROM ('2024-01-01') TO ('2024-04-01')
TABLESPACE current_data_tablespace;

CREATE TABLE IF NOT EXISTS manufacturing_orders_2024_q2 PARTITION OF manufacturing_orders_partitioned
FOR VALUES FROM ('2024-04-01') TO ('2024-07-01')
TABLESPACE current_data_tablespace;

CREATE TABLE IF NOT EXISTS manufacturing_orders_2024_q3 PARTITION OF manufacturing_orders_partitioned
FOR VALUES FROM ('2024-07-01') TO ('2024-10-01')
TABLESPACE current_data_tablespace;

CREATE TABLE IF NOT EXISTS manufacturing_orders_2024_q4 PARTITION OF manufacturing_orders_partitioned
FOR VALUES FROM ('2024-10-01') TO ('2025-01-01')
TABLESPACE current_data_tablespace;

-- Create indexes on partitioned manufacturing orders table
CREATE INDEX IF NOT EXISTS idx_manufacturing_orders_partitioned_order_number 
ON manufacturing_orders_partitioned (order_number) 
TABLESPACE index_tablespace;

CREATE INDEX IF NOT EXISTS idx_manufacturing_orders_partitioned_status 
ON manufacturing_orders_partitioned (status) 
TABLESPACE index_tablespace;

CREATE INDEX IF NOT EXISTS idx_manufacturing_orders_partitioned_start_date 
ON manufacturing_orders_partitioned (start_date) 
TABLESPACE index_tablespace;

-- ============================================================================
-- 5. PARTITION MANAGEMENT FUNCTIONS
-- ============================================================================

\echo 'Creating partition management functions...'

-- Function to create monthly partitions automatically
CREATE OR REPLACE FUNCTION create_monthly_partitions()
RETURNS VOID AS $$
DECLARE
    next_month DATE;
    partition_name TEXT;
    start_date TEXT;
    end_date TEXT;
    current_year INTEGER;
    current_month INTEGER;
BEGIN
    -- Create partitions for next 6 months
    FOR i IN 0..5 LOOP
        next_month := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month' * i);
        current_year := EXTRACT(YEAR FROM next_month);
        current_month := EXTRACT(MONTH FROM next_month);
        
        -- Create panels partition
        partition_name := 'panels_' || current_year || '_' || LPAD(current_month::TEXT, 2, '0');
        start_date := TO_CHAR(next_month, 'YYYY-MM-DD');
        end_date := TO_CHAR(next_month + INTERVAL '1 month', 'YYYY-MM-DD');
        
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF panels_partitioned
             FOR VALUES FROM (%L) TO (%L)
             TABLESPACE current_data_tablespace',
            partition_name, start_date, end_date
        );
        
        -- Create inspections partition
        partition_name := 'inspections_' || current_year || '_' || LPAD(current_month::TEXT, 2, '0');
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF inspections_partitioned
             FOR VALUES FROM (%L) TO (%L)
             TABLESPACE current_data_tablespace',
            partition_name, start_date, end_date
        );
        
        -- Create manufacturing orders partition (quarterly)
        IF current_month IN (1, 4, 7, 10) THEN
            partition_name := 'manufacturing_orders_' || current_year || '_q' || ((current_month - 1) / 3 + 1);
            start_date := TO_CHAR(next_month, 'YYYY-MM-DD');
            end_date := TO_CHAR(next_month + INTERVAL '3 months', 'YYYY-MM-DD');
            
            EXECUTE format(
                'CREATE TABLE IF NOT EXISTS %I PARTITION OF manufacturing_orders_partitioned
                 FOR VALUES FROM (%L) TO (%L)
                 TABLESPACE current_data_tablespace',
                partition_name, start_date, end_date
            );
        END IF;
    END LOOP;
    
    -- Log partition creation
    INSERT INTO partition_management_log (
        operation_type,
        partition_name,
        operation_details,
        success
    ) VALUES (
        'CREATE_MONTHLY_PARTITIONS',
        'AUTO_GENERATED',
        'Created partitions for next 6 months',
        TRUE
    );
END;
$$ LANGUAGE plpgsql;

-- Function to archive old partitions
CREATE OR REPLACE FUNCTION archive_old_partitions()
RETURNS VOID AS $$
DECLARE
    partition_record RECORD;
    archive_date DATE := CURRENT_DATE - INTERVAL '1 year';
    archive_year INTEGER;
    archive_month INTEGER;
    partition_name TEXT;
BEGIN
    archive_year := EXTRACT(YEAR FROM archive_date);
    archive_month := EXTRACT(MONTH FROM archive_date);
    
    -- Archive panels older than 1 year
    FOR partition_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE tablename LIKE 'panels_%' 
        AND tablename < 'panels_' || archive_year || '_' || LPAD(archive_month::TEXT, 2, '0')
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I SET TABLESPACE archive_tablespace', partition_record.tablename);
            
            INSERT INTO partition_management_log (
                operation_type,
                partition_name,
                operation_details,
                success
            ) VALUES (
                'ARCHIVE_PARTITION',
                partition_record.tablename,
                'Moved to archive tablespace',
                TRUE
            );
        EXCEPTION WHEN OTHERS THEN
            INSERT INTO partition_management_log (
                operation_type,
                partition_name,
                operation_details,
                success,
                error_message
            ) VALUES (
                'ARCHIVE_PARTITION',
                partition_record.tablename,
                'Failed to move to archive tablespace',
                FALSE,
                SQLERRM
            );
        END;
    END LOOP;
    
    -- Archive inspections older than 1 year
    FOR partition_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE tablename LIKE 'inspections_%' 
        AND tablename < 'inspections_' || archive_year || '_' || LPAD(archive_month::TEXT, 2, '0')
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I SET TABLESPACE archive_tablespace', partition_record.tablename);
            
            INSERT INTO partition_management_log (
                operation_type,
                partition_name,
                operation_details,
                success
            ) VALUES (
                'ARCHIVE_PARTITION',
                partition_record.tablename,
                'Moved to archive tablespace',
                TRUE
            );
        EXCEPTION WHEN OTHERS THEN
            INSERT INTO partition_management_log (
                operation_type,
                partition_name,
                operation_details,
                success,
                error_message
            ) VALUES (
                'ARCHIVE_PARTITION',
                partition_record.tablename,
                'Failed to move to archive tablespace',
                FALSE,
                SQLERRM
            );
        END;
    END LOOP;
    
    -- Archive manufacturing orders older than 2 years
    FOR partition_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE tablename LIKE 'manufacturing_orders_%' 
        AND tablename < 'manufacturing_orders_' || (archive_year - 1) || '_q1'
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I SET TABLESPACE archive_tablespace', partition_record.tablename);
            
            INSERT INTO partition_management_log (
                operation_type,
                partition_name,
                operation_details,
                success
            ) VALUES (
                'ARCHIVE_PARTITION',
                partition_record.tablename,
                'Moved to archive tablespace',
                TRUE
            );
        EXCEPTION WHEN OTHERS THEN
            INSERT INTO partition_management_log (
                operation_type,
                partition_name,
                operation_details,
                success,
                error_message
            ) VALUES (
                'ARCHIVE_PARTITION',
                partition_record.tablename,
                'Failed to move to archive tablespace',
                FALSE,
                SQLERRM
            );
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. PARTITION MANAGEMENT LOGGING
-- ============================================================================

\echo 'Creating partition management logging...'

-- Logging table for partition management operations
CREATE TABLE IF NOT EXISTS partition_management_log (
    id SERIAL PRIMARY KEY,
    operation_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    operation_type TEXT NOT NULL,
    partition_name TEXT,
    operation_details TEXT,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    execution_time_ms NUMERIC(10,3)
);

-- Function to get partition statistics
CREATE OR REPLACE FUNCTION get_partition_statistics()
RETURNS TABLE (
    table_name TEXT,
    partition_name TEXT,
    partition_range TEXT,
    row_count BIGINT,
    size_mb NUMERIC(10,2),
    tablespace_name TEXT,
    last_analyzed TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.parent_table as table_name,
        p.partition_name,
        p.partition_range,
        COALESCE(stats.row_count, 0) as row_count,
        ROUND(pg_total_relation_size(p.partition_name::regclass) / 1024.0 / 1024.0, 2) as size_mb,
        t.spcname as tablespace_name,
        s.last_analyzed
    FROM (
        SELECT 
            'panels_partitioned' as parent_table,
            tablename as partition_name,
            'Monthly' as partition_range
        FROM pg_tables 
        WHERE tablename LIKE 'panels_%'
        UNION ALL
        SELECT 
            'inspections_partitioned' as parent_table,
            tablename as partition_name,
            'Monthly' as partition_range
        FROM pg_tables 
        WHERE tablename LIKE 'inspections_%'
        UNION ALL
        SELECT 
            'manufacturing_orders_partitioned' as parent_table,
            tablename as partition_name,
            'Quarterly' as partition_range
        FROM pg_tables 
        WHERE tablename LIKE 'manufacturing_orders_%'
    ) p
    LEFT JOIN (
        SELECT 
            schemaname,
            tablename,
            n_tup_ins + n_tup_upd + n_tup_del as row_count
        FROM pg_stat_user_tables
    ) stats ON p.partition_name = stats.tablename
    LEFT JOIN pg_tablespace t ON t.oid = (
        SELECT reltablespace 
        FROM pg_class 
        WHERE relname = p.partition_name
    )
    LEFT JOIN pg_stat_user_tables s ON p.partition_name = s.relname
    ORDER BY p.parent_table, p.partition_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. DATA MIGRATION FUNCTIONS
-- ============================================================================

\echo 'Creating data migration functions...'

-- Function to migrate data from original tables to partitioned tables
CREATE OR REPLACE FUNCTION migrate_to_partitioned_tables()
RETURNS VOID AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    panels_migrated INTEGER := 0;
    inspections_migrated INTEGER := 0;
    manufacturing_orders_migrated INTEGER := 0;
BEGIN
    start_time := clock_timestamp();
    
    -- Migrate panels data
    INSERT INTO panels_partitioned 
    SELECT * FROM panels 
    ON CONFLICT (id) DO NOTHING;
    
    GET DIAGNOSTICS panels_migrated = ROW_COUNT;
    
    -- Migrate inspections data
    INSERT INTO inspections_partitioned 
    SELECT * FROM inspections 
    ON CONFLICT (id) DO NOTHING;
    
    GET DIAGNOSTICS inspections_migrated = ROW_COUNT;
    
    -- Migrate manufacturing orders data
    INSERT INTO manufacturing_orders_partitioned 
    SELECT * FROM manufacturing_orders 
    ON CONFLICT (id) DO NOTHING;
    
    GET DIAGNOSTICS manufacturing_orders_migrated = ROW_COUNT;
    
    end_time := clock_timestamp();
    
    -- Log migration
    INSERT INTO partition_management_log (
        operation_type,
        partition_name,
        operation_details,
        success,
        execution_time_ms
    ) VALUES (
        'DATA_MIGRATION',
        'ALL_TABLES',
        format('Migrated %s panels, %s inspections, %s manufacturing orders', 
               panels_migrated, inspections_migrated, manufacturing_orders_migrated),
        TRUE,
        EXTRACT(EPOCH FROM (end_time - start_time)) * 1000
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. PERFORMANCE MONITORING FUNCTIONS
-- ============================================================================

\echo 'Creating performance monitoring functions...'

-- Function to analyze partition performance
CREATE OR REPLACE FUNCTION analyze_partition_performance()
RETURNS TABLE (
    table_name TEXT,
    total_partitions INTEGER,
    total_rows BIGINT,
    total_size_mb NUMERIC(10,2),
    avg_partition_size_mb NUMERIC(10,2),
    partitions_in_current_tablespace INTEGER,
    partitions_in_archive_tablespace INTEGER,
    recommendation TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        stats.table_name,
        stats.total_partitions,
        stats.total_rows,
        stats.total_size_mb,
        ROUND(stats.total_size_mb / NULLIF(stats.total_partitions, 0), 2) as avg_partition_size_mb,
        stats.partitions_in_current_tablespace,
        stats.partitions_in_archive_tablespace,
        CASE 
            WHEN stats.avg_partition_size_mb > 1000 THEN 'Consider sub-partitioning large partitions'
            WHEN stats.partitions_in_current_tablespace > 24 THEN 'Consider archiving older partitions'
            WHEN stats.total_partitions < 6 THEN 'Consider creating more partitions for better performance'
            ELSE 'Partitioning strategy is optimal'
        END as recommendation
    FROM (
        SELECT 
            p.parent_table as table_name,
            COUNT(*) as total_partitions,
            SUM(p.row_count) as total_rows,
            SUM(p.size_mb) as total_size_mb,
            COUNT(CASE WHEN p.tablespace_name = 'current_data_tablespace' THEN 1 END) as partitions_in_current_tablespace,
            COUNT(CASE WHEN p.tablespace_name = 'archive_tablespace' THEN 1 END) as partitions_in_archive_tablespace
        FROM get_partition_statistics() p
        GROUP BY p.parent_table
    ) stats;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. INITIAL SETUP AND MIGRATION
-- ============================================================================

\echo 'Setting up initial partitions and migrating data...'

-- Create initial partitions for next 6 months
SELECT create_monthly_partitions();

-- Migrate existing data to partitioned tables
SELECT migrate_to_partitioned_tables();

-- ============================================================================
-- 10. PERFORMANCE VALIDATION
-- ============================================================================

\echo 'Validating partition performance...'

-- Test query performance improvements
\echo 'Testing partitioned panels query performance...'
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) 
SELECT COUNT(*) FROM panels_partitioned 
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

\echo 'Testing partitioned inspections query performance...'
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) 
SELECT COUNT(*) FROM inspections_partitioned 
WHERE inspection_date >= CURRENT_DATE - INTERVAL '7 days';

\echo 'Testing partitioned manufacturing orders query performance...'
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) 
SELECT COUNT(*) FROM manufacturing_orders_partitioned 
WHERE start_date >= CURRENT_DATE - INTERVAL '90 days';

-- ============================================================================
-- 11. SUMMARY AND RECOMMENDATIONS
-- ============================================================================

\echo 'Database Partitioning Implementation Complete!'
\echo 'Timestamp: ' || CURRENT_TIMESTAMP

\echo ''
\echo '=== PARTITIONED TABLES CREATED ==='
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(tablename::regclass)) as size
FROM pg_tables 
WHERE tablename LIKE '%_partitioned'
ORDER BY tablename;

\echo ''
\echo '=== PARTITION STATISTICS ==='
SELECT * FROM get_partition_statistics();

\echo ''
\echo '=== PERFORMANCE ANALYSIS ==='
SELECT * FROM analyze_partition_performance();

\echo ''
\echo '=== PARTITION MANAGEMENT RECOMMENDATIONS ==='
\echo '1. Set up automated partition creation (monthly for panels/inspections, quarterly for MOs)'
\echo '2. Set up automated archiving (1 year for panels/inspections, 2 years for MOs)'
\echo '3. Monitor partition sizes and consider sub-partitioning if > 1GB'
\echo '4. Set up alerts for partition creation/archival failures'
\echo '5. Consider partition pruning optimization for complex queries'

\echo ''
\echo '=== NEXT STEPS ==='
\echo '1. Test application queries against partitioned tables'
\echo '2. Set up automated partition management schedule'
\echo '3. Monitor partition performance improvements'
\echo '4. Adjust partition strategy based on data growth patterns'
\echo '5. Consider additional partitioning for other large tables'
