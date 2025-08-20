-- Migration 011: Create Foreign Key Relationships and Constraints
-- Solar Panel Production Tracking System
-- Created: 2025-08-20

-- This migration establishes all foreign key relationships and constraints
-- between the database tables to ensure data integrity and referential integrity.

-- ============================================================================
-- PANELS TABLE RELATIONSHIPS
-- ============================================================================

-- Add foreign key relationships to panels table
ALTER TABLE panels ADD CONSTRAINT fk_panels_manufacturing_order 
    FOREIGN KEY (manufacturing_order_id) REFERENCES manufacturing_orders(id) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE panels ADD CONSTRAINT fk_panels_created_by 
    FOREIGN KEY (created_by) REFERENCES users(id) 
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE panels ADD CONSTRAINT fk_panels_updated_by 
    FOREIGN KEY (updated_by) REFERENCES users(id) 
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- MANUFACTURING ORDERS TABLE RELATIONSHIPS
-- ============================================================================

-- Add foreign key relationships to manufacturing_orders table
ALTER TABLE manufacturing_orders ADD CONSTRAINT fk_manufacturing_orders_created_by 
    FOREIGN KEY (created_by) REFERENCES users(id) 
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE manufacturing_orders ADD CONSTRAINT fk_manufacturing_orders_updated_by 
    FOREIGN KEY (updated_by) REFERENCES users(id) 
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE manufacturing_orders ADD CONSTRAINT fk_manufacturing_orders_assigned_to 
    FOREIGN KEY (assigned_to) REFERENCES users(id) 
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- PALLETS TABLE RELATIONSHIPS
-- ============================================================================

-- Add foreign key relationships to pallets table
ALTER TABLE pallets ADD CONSTRAINT fk_pallets_manufacturing_order 
    FOREIGN KEY (manufacturing_order_id) REFERENCES manufacturing_orders(id) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE pallets ADD CONSTRAINT fk_pallets_created_by 
    FOREIGN KEY (created_by) REFERENCES users(id) 
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE pallets ADD CONSTRAINT fk_pallets_updated_by 
    FOREIGN KEY (updated_by) REFERENCES users(id) 
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- PALLET ASSIGNMENTS TABLE RELATIONSHIPS
-- ============================================================================

-- Add foreign key relationships to pallet_assignments table
ALTER TABLE pallet_assignments ADD CONSTRAINT fk_pallet_assignments_pallet 
    FOREIGN KEY (pallet_id) REFERENCES pallets(id) 
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE pallet_assignments ADD CONSTRAINT fk_pallet_assignments_panel 
    FOREIGN KEY (panel_id) REFERENCES panels(id) 
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE pallet_assignments ADD CONSTRAINT fk_pallet_assignments_assigned_by 
    FOREIGN KEY (assigned_by) REFERENCES users(id) 
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- INSPECTIONS TABLE RELATIONSHIPS
-- ============================================================================

-- Add foreign key relationships to inspections table
ALTER TABLE inspections ADD CONSTRAINT fk_inspections_panel 
    FOREIGN KEY (panel_id) REFERENCES panels(id) 
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE inspections ADD CONSTRAINT fk_inspections_station 
    FOREIGN KEY (station_id) REFERENCES stations(id) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE inspections ADD CONSTRAINT fk_inspections_inspector 
    FOREIGN KEY (inspector_id) REFERENCES users(id) 
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE inspections ADD CONSTRAINT fk_inspections_manufacturing_order 
    FOREIGN KEY (manufacturing_order_id) REFERENCES manufacturing_orders(id) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE inspections ADD CONSTRAINT fk_inspections_created_by 
    FOREIGN KEY (created_by) REFERENCES users(id) 
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE inspections ADD CONSTRAINT fk_inspections_updated_by 
    FOREIGN KEY (updated_by) REFERENCES users(id) 
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- INSPECTION CRITERIA RESULTS TABLE RELATIONSHIPS
-- ============================================================================

-- Add foreign key relationships to inspection_criteria_results table
ALTER TABLE inspection_criteria_results ADD CONSTRAINT fk_inspection_criteria_results_inspection 
    FOREIGN KEY (inspection_id) REFERENCES inspections(id) 
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE inspection_criteria_results ADD CONSTRAINT fk_inspection_criteria_results_criteria 
    FOREIGN KEY (criteria_id) REFERENCES station_criteria_configurations(id) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE inspection_criteria_results ADD CONSTRAINT fk_inspection_criteria_results_created_by 
    FOREIGN KEY (created_by) REFERENCES users(id) 
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- STATIONS TABLE RELATIONSHIPS
-- ============================================================================

-- Add foreign key relationships to stations table
ALTER TABLE stations ADD CONSTRAINT fk_stations_created_by 
    FOREIGN KEY (created_by) REFERENCES users(id) 
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE stations ADD CONSTRAINT fk_stations_updated_by 
    FOREIGN KEY (updated_by) REFERENCES users(id) 
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- USERS TABLE RELATIONSHIPS
-- ============================================================================

-- Add foreign key relationships to users table
ALTER TABLE users ADD CONSTRAINT fk_users_created_by 
    FOREIGN KEY (created_by) REFERENCES users(id) 
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE users ADD CONSTRAINT fk_users_updated_by 
    FOREIGN KEY (updated_by) REFERENCES users(id) 
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- ADDITIONAL DATA INTEGRITY CONSTRAINTS
-- ============================================================================

-- Ensure panel barcodes are unique within a manufacturing order
ALTER TABLE panels ADD CONSTRAINT unique_panel_barcode_per_mo 
    UNIQUE (manufacturing_order_id, barcode);

-- Ensure pallet barcodes are unique
ALTER TABLE pallets ADD CONSTRAINT unique_pallet_barcode 
    UNIQUE (barcode);

-- Ensure pallet assignments are unique (one panel per pallet position)
ALTER TABLE pallet_assignments ADD CONSTRAINT unique_panel_per_pallet_position 
    UNIQUE (pallet_id, position_x, position_y);

-- Ensure inspection criteria results are unique per inspection and criteria
ALTER TABLE inspection_criteria_results ADD CONSTRAINT unique_criteria_per_inspection 
    UNIQUE (inspection_id, criteria_id);

-- Ensure station criteria configurations are unique per station and criteria
ALTER TABLE station_criteria_configurations ADD CONSTRAINT unique_station_criteria 
    UNIQUE (station_id, criteria_name, parameter_name) 
    WHERE is_active = true;

-- Ensure system configurations are unique per key and scope
ALTER TABLE system_configurations ADD CONSTRAINT unique_config_per_scope 
    UNIQUE (config_key, scope, scope_id) 
    WHERE is_active = true;

-- ============================================================================
-- CHECK CONSTRAINTS FOR DATA VALIDATION
-- ============================================================================

-- Panel constraints
ALTER TABLE panels ADD CONSTRAINT check_panel_dimensions_positive 
    CHECK (length_mm > 0 AND width_mm > 0 AND thickness_mm > 0);

ALTER TABLE panels ADD CONSTRAINT check_panel_weight_positive 
    CHECK (weight_kg > 0);

ALTER TABLE panels ADD CONSTRAINT check_panel_power_positive 
    CHECK (power_watts > 0);

-- Manufacturing order constraints
ALTER TABLE manufacturing_orders ADD CONSTRAINT check_mo_quantity_positive 
    CHECK (quantity > 0);

ALTER TABLE manufacturing_orders ADD CONSTRAINT check_mo_dates_valid 
    CHECK (start_date <= end_date);

-- Pallet constraints
ALTER TABLE pallets ADD CONSTRAINT check_pallet_capacity_positive 
    CHECK (capacity > 0);

ALTER TABLE pallets ADD CONSTRAINT check_pallet_dimensions_positive 
    CHECK (length_mm > 0 AND width_mm > 0 AND height_mm > 0);

-- Pallet assignment constraints
ALTER TABLE pallet_assignments ADD CONSTRAINT check_position_positive 
    CHECK (position_x >= 0 AND position_y >= 0);

-- Inspection constraints
ALTER TABLE inspections ADD CONSTRAINT check_inspection_dates_valid 
    CHECK (inspection_date <= CURRENT_TIMESTAMP);

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to all tables that don't already have them
CREATE TRIGGER update_panels_updated_at 
    BEFORE UPDATE ON panels 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_manufacturing_orders_updated_at 
    BEFORE UPDATE ON manufacturing_orders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pallets_updated_at 
    BEFORE UPDATE ON pallets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pallet_assignments_updated_at 
    BEFORE UPDATE ON pallet_assignments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inspections_updated_at 
    BEFORE UPDATE ON inspections 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inspection_criteria_results_updated_at 
    BEFORE UPDATE ON inspection_criteria_results 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stations_updated_at 
    BEFORE UPDATE ON stations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TRIGGERS FOR DATA CONSISTENCY
-- ============================================================================

-- Trigger to update panel count in manufacturing orders
CREATE OR REPLACE FUNCTION update_manufacturing_order_panel_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE manufacturing_orders 
        SET panels_created = panels_created + 1
        WHERE id = NEW.manufacturing_order_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE manufacturing_orders 
        SET panels_created = panels_created - 1
        WHERE id = OLD.manufacturing_order_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_mo_panel_count
    AFTER INSERT OR DELETE ON panels
    FOR EACH ROW
    EXECUTE FUNCTION update_manufacturing_order_panel_count();

-- Trigger to update pallet assignment count
CREATE OR REPLACE FUNCTION update_pallet_assignment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE pallets 
        SET panels_assigned = panels_assigned + 1
        WHERE id = NEW.pallet_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE pallets 
        SET panels_assigned = panels_assigned - 1
        WHERE id = OLD.pallet_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pallet_assignment_count
    AFTER INSERT OR DELETE ON pallet_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_pallet_assignment_count();

-- Trigger to update inspection count in panels
CREATE OR REPLACE FUNCTION update_panel_inspection_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE panels 
        SET inspection_count = inspection_count + 1
        WHERE id = NEW.panel_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE panels 
        SET inspection_count = inspection_count - 1
        WHERE id = OLD.panel_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_panel_inspection_count
    AFTER INSERT OR DELETE ON inspections
    FOR EACH ROW
    EXECUTE FUNCTION update_panel_inspection_count();

-- ============================================================================
-- INDEXES FOR FOREIGN KEY PERFORMANCE
-- ============================================================================

-- Create indexes on foreign key columns for better performance
CREATE INDEX idx_panels_manufacturing_order_id ON panels(manufacturing_order_id);
CREATE INDEX idx_panels_created_by ON panels(created_by);
CREATE INDEX idx_panels_updated_by ON panels(updated_by);

CREATE INDEX idx_manufacturing_orders_created_by ON manufacturing_orders(created_by);
CREATE INDEX idx_manufacturing_orders_updated_by ON manufacturing_orders(updated_by);
CREATE INDEX idx_manufacturing_orders_assigned_to ON manufacturing_orders(assigned_to);

CREATE INDEX idx_pallets_manufacturing_order_id ON pallets(manufacturing_order_id);
CREATE INDEX idx_pallets_created_by ON pallets(created_by);
CREATE INDEX idx_pallets_updated_by ON pallets(updated_by);

CREATE INDEX idx_pallet_assignments_pallet_id ON pallet_assignments(pallet_id);
CREATE INDEX idx_pallet_assignments_panel_id ON pallet_assignments(panel_id);
CREATE INDEX idx_pallet_assignments_assigned_by ON pallet_assignments(assigned_by);

CREATE INDEX idx_inspections_panel_id ON inspections(panel_id);
CREATE INDEX idx_inspections_station_id ON inspections(station_id);
CREATE INDEX idx_inspections_inspector_id ON inspections(inspector_id);
CREATE INDEX idx_inspections_manufacturing_order_id ON inspections(manufacturing_order_id);
CREATE INDEX idx_inspections_created_by ON inspections(created_by);
CREATE INDEX idx_inspections_updated_by ON inspections(updated_by);

CREATE INDEX idx_inspection_criteria_results_inspection_id ON inspection_criteria_results(inspection_id);
CREATE INDEX idx_inspection_criteria_results_criteria_id ON inspection_criteria_results(criteria_id);
CREATE INDEX idx_inspection_criteria_results_created_by ON inspection_criteria_results(created_by);

CREATE INDEX idx_stations_created_by ON stations(created_by);
CREATE INDEX idx_stations_updated_by ON stations(updated_by);

CREATE INDEX idx_users_created_by ON users(created_by);
CREATE INDEX idx_users_updated_by ON users(updated_by);

-- ============================================================================
-- COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- ============================================================================

-- Manufacturing order queries
CREATE INDEX idx_manufacturing_orders_status_date ON manufacturing_orders(status, start_date);
CREATE INDEX idx_manufacturing_orders_priority_status ON manufacturing_orders(priority, status);

-- Panel queries
CREATE INDEX idx_panels_mo_status ON panels(manufacturing_order_id, status);
CREATE INDEX idx_panels_barcode_status ON panels(barcode, status);

-- Inspection queries
CREATE INDEX idx_inspections_panel_station ON inspections(panel_id, station_id);
CREATE INDEX idx_inspections_station_date ON inspections(station_id, inspection_date);
CREATE INDEX idx_inspections_result_date ON inspections(result, inspection_date);

-- Pallet queries
CREATE INDEX idx_pallets_mo_status ON pallets(manufacturing_order_id, status);
CREATE INDEX idx_pallets_barcode_status ON pallets(barcode, status);

-- ============================================================================
-- VIEWS FOR COMMON QUERY PATTERNS
-- ============================================================================

-- View for panel summary with manufacturing order info
CREATE VIEW panel_summary AS
SELECT 
    p.id,
    p.barcode,
    p.status,
    p.length_mm,
    p.width_mm,
    p.thickness_mm,
    p.weight_kg,
    p.power_watts,
    p.inspection_count,
    p.created_at,
    mo.order_number,
    mo.status as mo_status,
    mo.priority as mo_priority,
    u.username as created_by_user
FROM panels p
LEFT JOIN manufacturing_orders mo ON p.manufacturing_order_id = mo.id
LEFT JOIN users u ON p.created_by = u.id;

-- View for manufacturing order summary with panel counts
CREATE VIEW manufacturing_order_summary AS
SELECT 
    mo.id,
    mo.order_number,
    mo.status,
    mo.priority,
    mo.quantity,
    mo.panels_created,
    mo.start_date,
    mo.end_date,
    mo.created_at,
    u.username as assigned_to_user,
    COUNT(DISTINCT p.id) as total_panels,
    COUNT(DISTINCT CASE WHEN p.status = 'COMPLETED' THEN p.id END) as completed_panels,
    COUNT(DISTINCT CASE WHEN p.status = 'IN_PROGRESS' THEN p.id END) as in_progress_panels,
    COUNT(DISTINCT CASE WHEN p.status = 'FAILED' THEN p.id END) as failed_panels
FROM manufacturing_orders mo
LEFT JOIN users u ON mo.assigned_to = u.id
LEFT JOIN panels p ON mo.id = p.manufacturing_order_id
GROUP BY mo.id, mo.order_number, mo.status, mo.priority, mo.quantity, mo.panels_created, 
         mo.start_date, mo.end_date, mo.created_at, u.username;

-- View for inspection summary
CREATE VIEW inspection_summary AS
SELECT 
    i.id,
    i.inspection_date,
    i.result,
    i.notes,
    p.barcode as panel_barcode,
    s.name as station_name,
    u.username as inspector_username,
    mo.order_number,
    COUNT(icr.id) as criteria_count,
    COUNT(CASE WHEN icr.result = 'PASS' THEN 1 END) as passed_criteria,
    COUNT(CASE WHEN icr.result = 'FAIL' THEN 1 END) as failed_criteria
FROM inspections i
LEFT JOIN panels p ON i.panel_id = p.id
LEFT JOIN stations s ON i.station_id = s.id
LEFT JOIN users u ON i.inspector_id = u.id
LEFT JOIN manufacturing_orders mo ON i.manufacturing_order_id = mo.id
LEFT JOIN inspection_criteria_results icr ON i.id = icr.inspection_id
GROUP BY i.id, i.inspection_date, i.result, i.notes, p.barcode, s.name, u.username, mo.order_number;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions on views
GRANT SELECT ON panel_summary TO solar_panel_user;
GRANT SELECT ON manufacturing_order_summary TO solar_panel_user;
GRANT SELECT ON inspection_summary TO solar_panel_user;

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================

-- This migration establishes comprehensive foreign key relationships and constraints:
-- - All tables are properly linked with appropriate cascade/restrict behaviors
-- - Data integrity constraints ensure valid data
-- - Automatic triggers maintain consistency
-- - Performance indexes optimize common queries
-- - Views provide convenient access to related data
-- - Unique constraints prevent duplicate data
-- - Check constraints validate data ranges and relationships

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================

/*
-- To rollback this migration (in reverse order):

-- Drop views
DROP VIEW IF EXISTS inspection_summary;
DROP VIEW IF EXISTS manufacturing_order_summary;
DROP VIEW IF EXISTS panel_summary;

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_update_panel_inspection_count ON inspections;
DROP TRIGGER IF EXISTS trigger_update_pallet_assignment_count ON pallet_assignments;
DROP TRIGGER IF EXISTS trigger_update_mo_panel_count ON panels;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_stations_updated_at ON stations;
DROP TRIGGER IF EXISTS update_inspection_criteria_results_updated_at ON inspection_criteria_results;
DROP TRIGGER IF EXISTS update_inspections_updated_at ON inspections;
DROP TRIGGER IF EXISTS update_pallet_assignments_updated_at ON pallet_assignments;
DROP TRIGGER IF EXISTS update_pallets_updated_at ON pallets;
DROP TRIGGER IF EXISTS update_manufacturing_orders_updated_at ON manufacturing_orders;
DROP TRIGGER IF EXISTS update_panels_updated_at ON panels;

-- Drop trigger functions
DROP FUNCTION IF EXISTS update_panel_inspection_count();
DROP FUNCTION IF EXISTS update_pallet_assignment_count();
DROP FUNCTION IF EXISTS update_manufacturing_order_panel_count();

-- Drop foreign key constraints
ALTER TABLE inspection_criteria_results DROP CONSTRAINT IF EXISTS fk_inspection_criteria_results_inspection;
ALTER TABLE inspection_criteria_results DROP CONSTRAINT IF EXISTS fk_inspection_criteria_results_criteria;
ALTER TABLE inspection_criteria_results DROP CONSTRAINT IF EXISTS fk_inspection_criteria_results_created_by;
ALTER TABLE inspections DROP CONSTRAINT IF EXISTS fk_inspections_panel;
ALTER TABLE inspections DROP CONSTRAINT IF EXISTS fk_inspections_station;
ALTER TABLE inspections DROP CONSTRAINT IF EXISTS fk_inspections_inspector;
ALTER TABLE inspections DROP CONSTRAINT IF EXISTS fk_inspections_manufacturing_order;
ALTER TABLE inspections DROP CONSTRAINT IF EXISTS fk_inspections_created_by;
ALTER TABLE inspections DROP CONSTRAINT IF EXISTS fk_inspections_updated_by;
ALTER TABLE pallet_assignments DROP CONSTRAINT IF EXISTS fk_pallet_assignments_pallet;
ALTER TABLE pallet_assignments DROP CONSTRAINT IF EXISTS fk_pallet_assignments_panel;
ALTER TABLE pallet_assignments DROP CONSTRAINT IF EXISTS fk_pallet_assignments_assigned_by;
ALTER TABLE pallets DROP CONSTRAINT IF EXISTS fk_pallets_manufacturing_order;
ALTER TABLE pallets DROP CONSTRAINT IF EXISTS fk_pallets_created_by;
ALTER TABLE pallets DROP CONSTRAINT IF EXISTS fk_pallets_updated_by;
ALTER TABLE manufacturing_orders DROP CONSTRAINT IF EXISTS fk_manufacturing_orders_created_by;
ALTER TABLE manufacturing_orders DROP CONSTRAINT IF EXISTS fk_manufacturing_orders_updated_by;
ALTER TABLE manufacturing_orders DROP CONSTRAINT IF EXISTS fk_manufacturing_orders_assigned_to;
ALTER TABLE panels DROP CONSTRAINT IF EXISTS fk_panels_manufacturing_order;
ALTER TABLE panels DROP CONSTRAINT IF EXISTS fk_panels_created_by;
ALTER TABLE panels DROP CONSTRAINT IF EXISTS fk_panels_updated_by;
ALTER TABLE stations DROP CONSTRAINT IF EXISTS fk_stations_created_by;
ALTER TABLE stations DROP CONSTRAINT IF EXISTS fk_stations_updated_by;
ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_created_by;
ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_updated_by;

-- Drop unique constraints
ALTER TABLE inspection_criteria_results DROP CONSTRAINT IF EXISTS unique_criteria_per_inspection;
ALTER TABLE pallet_assignments DROP CONSTRAINT IF EXISTS unique_panel_per_pallet_position;
ALTER TABLE pallets DROP CONSTRAINT IF EXISTS unique_pallet_barcode;
ALTER TABLE panels DROP CONSTRAINT IF EXISTS unique_panel_barcode_per_mo;

-- Drop check constraints
ALTER TABLE inspections DROP CONSTRAINT IF EXISTS check_inspection_dates_valid;
ALTER TABLE pallet_assignments DROP CONSTRAINT IF EXISTS check_position_positive;
ALTER TABLE pallets DROP CONSTRAINT IF EXISTS check_pallet_dimensions_positive;
ALTER TABLE pallets DROP CONSTRAINT IF EXISTS check_pallet_capacity_positive;
ALTER TABLE manufacturing_orders DROP CONSTRAINT IF EXISTS check_mo_dates_valid;
ALTER TABLE manufacturing_orders DROP CONSTRAINT IF EXISTS check_mo_quantity_positive;
ALTER TABLE panels DROP CONSTRAINT IF EXISTS check_panel_power_positive;
ALTER TABLE panels DROP CONSTRAINT IF EXISTS check_panel_weight_positive;
ALTER TABLE panels DROP CONSTRAINT IF EXISTS check_panel_dimensions_positive;

-- Drop indexes (optional - they will be recreated if needed)
DROP INDEX IF EXISTS idx_inspection_criteria_results_created_by;
DROP INDEX IF EXISTS idx_inspection_criteria_results_criteria_id;
DROP INDEX IF EXISTS idx_inspection_criteria_results_inspection_id;
DROP INDEX IF EXISTS idx_inspections_updated_by;
DROP INDEX IF EXISTS idx_inspections_created_by;
DROP INDEX IF EXISTS idx_inspections_manufacturing_order_id;
DROP INDEX IF EXISTS idx_inspections_inspector_id;
DROP INDEX IF EXISTS idx_inspections_station_id;
DROP INDEX IF EXISTS idx_inspections_panel_id;
DROP INDEX IF EXISTS idx_pallet_assignments_assigned_by;
DROP INDEX IF EXISTS idx_pallet_assignments_panel_id;
DROP INDEX IF EXISTS idx_pallet_assignments_pallet_id;
DROP INDEX IF EXISTS idx_pallets_updated_by;
DROP INDEX IF EXISTS idx_pallets_created_by;
DROP INDEX IF EXISTS idx_pallets_manufacturing_order_id;
DROP INDEX IF EXISTS idx_manufacturing_orders_assigned_to;
DROP INDEX IF EXISTS idx_manufacturing_orders_updated_by;
DROP INDEX IF EXISTS idx_manufacturing_orders_created_by;
DROP INDEX IF EXISTS idx_panels_updated_by;
DROP INDEX IF EXISTS idx_panels_created_by;
DROP INDEX IF EXISTS idx_panels_manufacturing_order_id;
DROP INDEX IF EXISTS idx_stations_updated_by;
DROP INDEX IF EXISTS idx_stations_created_by;
DROP INDEX IF EXISTS idx_users_updated_by;
DROP INDEX IF EXISTS idx_users_created_by;
*/
