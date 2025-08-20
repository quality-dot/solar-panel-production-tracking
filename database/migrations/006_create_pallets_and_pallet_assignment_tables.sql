-- Migration 006: Create pallets and pallet assignment tables
-- Solar Panel Production Tracking System
-- Created: 2025-08-19

-- This migration implements: Automated pallet management system with panel assignments
-- for tracking completed panels organized into shippable pallets.

-- Create pallets table for main pallet tracking
CREATE TABLE pallets (
    -- Primary identification
    id SERIAL PRIMARY KEY,
    pallet_number VARCHAR(50) NOT NULL UNIQUE,
    
    -- Manufacturing order relationship
    mo_id INTEGER NOT NULL,               -- FK to manufacturing_orders
    
    -- Pallet configuration
    max_capacity INTEGER NOT NULL DEFAULT 25, -- Maximum panels this pallet can hold
    current_panel_count INTEGER NOT NULL DEFAULT 0, -- Current number of panels assigned
    
    -- Status tracking
    status pallet_status_type NOT NULL DEFAULT 'OPEN',
    
    -- Panel type consistency (all panels in pallet must be same type)
    panel_type panel_type_enum,           -- Set when first panel is added
    line_assignment line_type,            -- Set based on panel_type
    
    -- Quality summary (aggregated from assigned panels)
    total_wattage DECIMAL(10,3),         -- Sum of all panel wattages
    avg_wattage DECIMAL(8,3),            -- Average wattage of all panels
    min_wattage DECIMAL(8,3),            -- Minimum wattage in pallet
    max_wattage DECIMAL(8,3),            -- Maximum wattage in pallet
    
    -- Production tracking
    first_panel_added_at TIMESTAMP,      -- When first panel was added
    last_panel_added_at TIMESTAMP,       -- When last panel was added
    target_completion_date DATE,         -- Expected completion date
    
    -- Shipping information
    shipping_address TEXT,               -- Destination address
    shipping_notes TEXT,                 -- Special shipping instructions
    tracking_number VARCHAR(100),        -- Carrier tracking number
    shipped_at TIMESTAMP,               -- When pallet was shipped
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,              -- When pallet was marked complete
    
    -- Audit fields
    created_by UUID,                     -- FK to users
    completed_by UUID,                   -- FK to users who completed the pallet
    shipped_by UUID                      -- FK to users who processed shipping
);

-- Create pallet_panels junction table for panel assignments
CREATE TABLE pallet_panels (
    -- Primary identification
    id SERIAL PRIMARY KEY,
    
    -- Relationships
    pallet_id INTEGER NOT NULL,          -- FK to pallets
    panel_id UUID NOT NULL,              -- FK to panels
    
    -- Position and organization
    position INTEGER NOT NULL,           -- Position within pallet (1-based)
    
    -- Panel data snapshot (captured at time of assignment)
    panel_barcode VARCHAR(255) NOT NULL, -- Snapshot of panel barcode
    panel_wattage DECIMAL(8,3),         -- Snapshot of panel wattage
    panel_vmp DECIMAL(6,2),             -- Snapshot of panel Vmp
    panel_imp DECIMAL(6,2),             -- Snapshot of panel Imp
    
    -- Assignment tracking
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID,                    -- FK to users who assigned the panel
    
    -- Quality notes specific to this assignment
    assignment_notes TEXT
);

-- Create indexes for performance optimization

-- Pallets table indexes
CREATE UNIQUE INDEX idx_pallets_pallet_number ON pallets(pallet_number);
CREATE INDEX idx_pallets_mo_id ON pallets(mo_id);
CREATE INDEX idx_pallets_status ON pallets(status);
CREATE INDEX idx_pallets_panel_type ON pallets(panel_type);
CREATE INDEX idx_pallets_line_assignment ON pallets(line_assignment);
CREATE INDEX idx_pallets_created_at ON pallets(created_at);
CREATE INDEX idx_pallets_completed_at ON pallets(completed_at);
CREATE INDEX idx_pallets_shipped_at ON pallets(shipped_at);

-- Composite indexes for common queries
CREATE INDEX idx_pallets_mo_status ON pallets(mo_id, status);
CREATE INDEX idx_pallets_status_line ON pallets(status, line_assignment);
CREATE INDEX idx_pallets_capacity_status ON pallets(current_panel_count, max_capacity, status) 
    WHERE status = 'OPEN';

-- Pallet_panels table indexes
CREATE INDEX idx_pallet_panels_pallet_id ON pallet_panels(pallet_id);
CREATE INDEX idx_pallet_panels_panel_id ON pallet_panels(panel_id);
CREATE INDEX idx_pallet_panels_position ON pallet_panels(pallet_id, position);
CREATE INDEX idx_pallet_panels_assigned_at ON pallet_panels(assigned_at);

-- Unique constraints
CREATE UNIQUE INDEX idx_pallet_panels_unique_panel ON pallet_panels(panel_id); -- Panel can only be in one pallet
CREATE UNIQUE INDEX idx_pallet_panels_unique_position ON pallet_panels(pallet_id, position); -- No duplicate positions

-- Add foreign key constraints

-- Pallets foreign keys
ALTER TABLE pallets ADD CONSTRAINT fk_pallets_mo_id 
    FOREIGN KEY (mo_id) REFERENCES manufacturing_orders(id) 
    ON DELETE RESTRICT;

ALTER TABLE pallets ADD CONSTRAINT fk_pallets_created_by 
    FOREIGN KEY (created_by) REFERENCES users(id) 
    ON DELETE SET NULL;

ALTER TABLE pallets ADD CONSTRAINT fk_pallets_completed_by 
    FOREIGN KEY (completed_by) REFERENCES users(id) 
    ON DELETE SET NULL;

ALTER TABLE pallets ADD CONSTRAINT fk_pallets_shipped_by 
    FOREIGN KEY (shipped_by) REFERENCES users(id) 
    ON DELETE SET NULL;

-- Pallet_panels foreign keys
ALTER TABLE pallet_panels ADD CONSTRAINT fk_pallet_panels_pallet_id 
    FOREIGN KEY (pallet_id) REFERENCES pallets(id) 
    ON DELETE CASCADE;

ALTER TABLE pallet_panels ADD CONSTRAINT fk_pallet_panels_panel_id 
    FOREIGN KEY (panel_id) REFERENCES panels(id) 
    ON DELETE CASCADE;

ALTER TABLE pallet_panels ADD CONSTRAINT fk_pallet_panels_assigned_by 
    FOREIGN KEY (assigned_by) REFERENCES users(id) 
    ON DELETE SET NULL;

-- Add validation constraints

-- Pallets constraints
ALTER TABLE pallets ADD CONSTRAINT check_pallet_number_format 
    CHECK (pallet_number ~ '^PLT[0-9]{6,}$'); -- Format: PLT followed by at least 6 digits

ALTER TABLE pallets ADD CONSTRAINT check_max_capacity_positive 
    CHECK (max_capacity > 0 AND max_capacity <= 100); -- Reasonable limits

ALTER TABLE pallets ADD CONSTRAINT check_current_panel_count_valid 
    CHECK (current_panel_count >= 0 AND current_panel_count <= max_capacity);

ALTER TABLE pallets ADD CONSTRAINT check_wattage_values_positive 
    CHECK (
        (total_wattage IS NULL OR total_wattage > 0) AND
        (avg_wattage IS NULL OR avg_wattage > 0) AND
        (min_wattage IS NULL OR min_wattage > 0) AND
        (max_wattage IS NULL OR max_wattage > 0)
    );

ALTER TABLE pallets ADD CONSTRAINT check_wattage_range_logical 
    CHECK (min_wattage IS NULL OR max_wattage IS NULL OR min_wattage <= max_wattage);

-- Pallet_panels constraints
ALTER TABLE pallet_panels ADD CONSTRAINT check_position_positive 
    CHECK (position > 0);

ALTER TABLE pallet_panels ADD CONSTRAINT check_panel_wattage_positive 
    CHECK (panel_wattage IS NULL OR panel_wattage > 0);

-- Create automatic timestamp update trigger for pallets
CREATE TRIGGER update_pallets_updated_at 
    BEFORE UPDATE ON pallets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update pallet panel count and statistics
CREATE OR REPLACE FUNCTION update_pallet_statistics()
RETURNS TRIGGER AS $$
DECLARE
    pallet_stats RECORD;
BEGIN
    -- Calculate statistics for the affected pallet
    SELECT 
        COUNT(*) as panel_count,
        SUM(panel_wattage) as total_wattage,
        AVG(panel_wattage) as avg_wattage,
        MIN(panel_wattage) as min_wattage,
        MAX(panel_wattage) as max_wattage,
        MIN(assigned_at) as first_assigned,
        MAX(assigned_at) as last_assigned
    INTO pallet_stats
    FROM pallet_panels 
    WHERE pallet_id = COALESCE(NEW.pallet_id, OLD.pallet_id);
    
    -- Update pallet statistics
    UPDATE pallets 
    SET 
        current_panel_count = pallet_stats.panel_count,
        total_wattage = pallet_stats.total_wattage,
        avg_wattage = pallet_stats.avg_wattage,
        min_wattage = pallet_stats.min_wattage,
        max_wattage = pallet_stats.max_wattage,
        first_panel_added_at = pallet_stats.first_assigned,
        last_panel_added_at = pallet_stats.last_assigned,
        -- Auto-mark as FULL when at capacity
        status = CASE 
            WHEN pallet_stats.panel_count >= max_capacity AND status = 'OPEN' THEN 'FULL'
            WHEN pallet_stats.panel_count = 0 THEN 'OPEN'
            ELSE status
        END
    WHERE id = COALESCE(NEW.pallet_id, OLD.pallet_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update pallet statistics
CREATE TRIGGER trigger_update_pallet_stats_insert
    AFTER INSERT ON pallet_panels
    FOR EACH ROW
    EXECUTE FUNCTION update_pallet_statistics();

CREATE TRIGGER trigger_update_pallet_stats_update
    AFTER UPDATE ON pallet_panels
    FOR EACH ROW
    EXECUTE FUNCTION update_pallet_statistics();

CREATE TRIGGER trigger_update_pallet_stats_delete
    AFTER DELETE ON pallet_panels
    FOR EACH ROW
    EXECUTE FUNCTION update_pallet_statistics();

-- Function to set panel type and line assignment on first panel
CREATE OR REPLACE FUNCTION set_pallet_type_from_first_panel()
RETURNS TRIGGER AS $$
DECLARE
    panel_info RECORD;
BEGIN
    -- Get panel information
    SELECT panel_type, line_assignment 
    INTO panel_info
    FROM panels 
    WHERE id = NEW.panel_id;
    
    -- Update pallet if this is the first panel (panel_type is NULL)
    UPDATE pallets 
    SET 
        panel_type = panel_info.panel_type,
        line_assignment = panel_info.line_assignment
    WHERE id = NEW.pallet_id 
    AND panel_type IS NULL;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set pallet type from first panel
CREATE TRIGGER trigger_set_pallet_type_from_first_panel
    BEFORE INSERT ON pallet_panels
    FOR EACH ROW
    EXECUTE FUNCTION set_pallet_type_from_first_panel();

-- Function to validate panel compatibility with pallet
CREATE OR REPLACE FUNCTION validate_panel_pallet_compatibility()
RETURNS TRIGGER AS $$
DECLARE
    pallet_info RECORD;
    panel_info RECORD;
BEGIN
    -- Get pallet information
    SELECT panel_type, line_assignment, status, current_panel_count, max_capacity
    INTO pallet_info
    FROM pallets 
    WHERE id = NEW.pallet_id;
    
    -- Get panel information
    SELECT panel_type, line_assignment, status
    INTO panel_info
    FROM panels 
    WHERE id = NEW.panel_id;
    
    -- Check if pallet can accept more panels
    IF pallet_info.status NOT IN ('OPEN', 'FULL') THEN
        RAISE EXCEPTION 'Cannot add panels to pallet with status: %', pallet_info.status;
    END IF;
    
    IF pallet_info.current_panel_count >= pallet_info.max_capacity THEN
        RAISE EXCEPTION 'Pallet is at maximum capacity (%)', pallet_info.max_capacity;
    END IF;
    
    -- Check panel status
    IF panel_info.status != 'COMPLETED' THEN
        RAISE EXCEPTION 'Only completed panels can be added to pallets. Panel status: %', panel_info.status;
    END IF;
    
    -- Check panel type compatibility (if pallet already has a type set)
    IF pallet_info.panel_type IS NOT NULL AND pallet_info.panel_type != panel_info.panel_type THEN
        RAISE EXCEPTION 'Panel type % does not match pallet type %', panel_info.panel_type, pallet_info.panel_type;
    END IF;
    
    -- Check line assignment compatibility
    IF pallet_info.line_assignment IS NOT NULL AND pallet_info.line_assignment != panel_info.line_assignment THEN
        RAISE EXCEPTION 'Panel line assignment % does not match pallet line %', panel_info.line_assignment, pallet_info.line_assignment;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate panel compatibility
CREATE TRIGGER trigger_validate_panel_pallet_compatibility
    BEFORE INSERT ON pallet_panels
    FOR EACH ROW
    EXECUTE FUNCTION validate_panel_pallet_compatibility();

-- Function to generate pallet numbers
CREATE OR REPLACE FUNCTION generate_pallet_number(mo_id_input INTEGER)
RETURNS VARCHAR(50) AS $$
DECLARE
    mo_number VARCHAR(50);
    pallet_sequence INTEGER;
    new_pallet_number VARCHAR(50);
BEGIN
    -- Get MO number
    SELECT order_number INTO mo_number
    FROM manufacturing_orders 
    WHERE id = mo_id_input;
    
    -- Get next sequence number for this MO
    SELECT COALESCE(MAX(
        CASE 
            WHEN pallet_number ~ ('^PLT' || mo_number || '[0-9]+$') 
            THEN SUBSTRING(pallet_number FROM LENGTH('PLT' || mo_number) + 1)::INTEGER
            ELSE 0
        END
    ), 0) + 1
    INTO pallet_sequence
    FROM pallets 
    WHERE mo_id = mo_id_input;
    
    -- Generate new pallet number: PLT + MO_NUMBER + SEQUENCE
    new_pallet_number := 'PLT' || mo_number || LPAD(pallet_sequence::TEXT, 3, '0');
    
    RETURN new_pallet_number;
END;
$$ LANGUAGE plpgsql;

-- Update the panels table to reference pallets (if not done in previous migration)
-- Note: This would typically be in the panels migration, but we're handling it here for completeness
DO $$
BEGIN
    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_panels_pallet_id'
    ) THEN
        ALTER TABLE panels ADD CONSTRAINT fk_panels_pallet_id 
            FOREIGN KEY (pallet_id) REFERENCES pallets(id) 
            ON DELETE SET NULL;
    END IF;
END
$$;

-- Comments for documentation
COMMENT ON TABLE pallets IS 'Pallets for organizing completed panels for shipping';
COMMENT ON COLUMN pallets.id IS 'Unique identifier for the pallet';
COMMENT ON COLUMN pallets.pallet_number IS 'Unique pallet number in format PLT + MO_NUMBER + SEQUENCE';
COMMENT ON COLUMN pallets.mo_id IS 'Manufacturing order this pallet belongs to';
COMMENT ON COLUMN pallets.max_capacity IS 'Maximum number of panels this pallet can hold';
COMMENT ON COLUMN pallets.current_panel_count IS 'Current number of panels assigned to this pallet';
COMMENT ON COLUMN pallets.status IS 'Current status of the pallet (OPEN, FULL, CLOSED, SHIPPED)';
COMMENT ON COLUMN pallets.panel_type IS 'Type of panels in this pallet (all panels must be same type)';
COMMENT ON COLUMN pallets.total_wattage IS 'Sum of wattages of all panels in the pallet';

COMMENT ON TABLE pallet_panels IS 'Junction table linking panels to pallets with position tracking';
COMMENT ON COLUMN pallet_panels.pallet_id IS 'Reference to the pallet';
COMMENT ON COLUMN pallet_panels.panel_id IS 'Reference to the panel';
COMMENT ON COLUMN pallet_panels.position IS 'Position of panel within the pallet (1-based)';
COMMENT ON COLUMN pallet_panels.panel_wattage IS 'Snapshot of panel wattage at time of assignment';

-- Migration notes:
-- - Pallet numbers are auto-generated in format: PLT + MO_NUMBER + SEQUENCE
-- - All panels in a pallet must be the same type and from the same line
-- - Only completed panels can be added to pallets
-- - Pallet statistics are automatically updated when panels are added/removed
-- - Pallets auto-transition to FULL status when at capacity

-- Rollback instructions (for manual rollback if needed):
/*
-- To rollback this migration:
DROP TRIGGER IF EXISTS trigger_validate_panel_pallet_compatibility ON pallet_panels;
DROP TRIGGER IF EXISTS trigger_set_pallet_type_from_first_panel ON pallet_panels;
DROP TRIGGER IF EXISTS trigger_update_pallet_stats_delete ON pallet_panels;
DROP TRIGGER IF EXISTS trigger_update_pallet_stats_update ON pallet_panels;
DROP TRIGGER IF EXISTS trigger_update_pallet_stats_insert ON pallet_panels;
DROP TRIGGER IF EXISTS update_pallets_updated_at ON pallets;
DROP FUNCTION IF EXISTS validate_panel_pallet_compatibility();
DROP FUNCTION IF EXISTS set_pallet_type_from_first_panel();
DROP FUNCTION IF EXISTS update_pallet_statistics();
DROP FUNCTION IF EXISTS generate_pallet_number(INTEGER);
ALTER TABLE panels DROP CONSTRAINT IF EXISTS fk_panels_pallet_id;
DROP TABLE IF EXISTS pallet_panels;
DROP TABLE IF EXISTS pallets;
*/
