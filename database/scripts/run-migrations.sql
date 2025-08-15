-- Migration Runner Script
-- Solar Panel Production Tracking System
-- This script runs all migrations in order

-- Create migration tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(64)
);

-- Function to check if migration was already executed
CREATE OR REPLACE FUNCTION migration_exists(migration_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS(SELECT 1 FROM schema_migrations WHERE schema_migrations.migration_name = migration_exists.migration_name);
END;
$$ LANGUAGE plpgsql;

-- Show current migration status
SELECT 'Current migrations executed:' as status;
SELECT migration_name, executed_at FROM schema_migrations ORDER BY id;

-- Instructions for running migrations manually:
/*
To run migrations manually, execute each file in order:

1. First, ensure you're connected to the solar_panel_tracking database
2. Run migrations in this order:
   \i 001_create_enums.sql
   \i 002_create_users_table.sql
   \i 003_create_stations_table.sql
   \i 004_create_manufacturing_orders_table.sql
   
3. After each migration, record it:
   INSERT INTO schema_migrations (migration_name) VALUES ('001_create_enums');
   INSERT INTO schema_migrations (migration_name) VALUES ('002_create_users_table');
   INSERT INTO schema_migrations (migration_name) VALUES ('003_create_stations_table');
   INSERT INTO schema_migrations (migration_name) VALUES ('004_create_manufacturing_orders_table');

To verify all tables were created:
\dt

To see all enum types:
\dT

To see table structures:
\d users
\d stations
\d manufacturing_orders
*/

-- Show final status
SELECT 'Migration runner ready. Follow instructions above to run migrations manually.' as status;
