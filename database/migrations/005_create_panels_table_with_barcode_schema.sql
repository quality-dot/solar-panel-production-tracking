-- Migration 005: Create panels table with barcode schema
-- Solar Panel Production Tracking System
-- Created: 2025-08-19

-- This migration implements: Create comprehensive panels table for tracking individual solar panels
-- through the production workflow with barcode-based identification and status tracking.

-- Create panels table for individual panel tracking
CREATE TABLE panels (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barcode VARCHAR(255) NOT NULL UNIQUE,
    
    -- Panel specifications (from barcode)
    panel_type panel_type_enum NOT NULL,  -- 36, 40, 60, 72, 144 cell
    frame_type frame_type NOT NULL,       -- SILVER (W), BLACK (B)
    backsheet_type backsheet_type NOT NULL, -- TRANSPARENT (T), WHITE (W), BLACK (B)
    
    -- Production tracking
    line_assignment line_type NOT NULL,   -- LINE_1 or LINE_2 (auto-assigned based on panel_type)
    current_station_id INTEGER,           -- FK to stations, nullable for panels not yet started
    status panel_status_type NOT NULL DEFAULT 'PENDING',
    
    -- Manufacturing order relationship
    mo_id INTEGER NOT NULL,               -- FK to manufacturing_orders
    
    -- Electrical measurements (manually entered at performance station)
    wattage_pmax DECIMAL(8,3),           -- Peak power (Watts) - manual entry
    vmp DECIMAL(6,2),                    -- Voltage at maximum power (Volts) - manual entry  
    imp DECIMAL(6,2),                    -- Current at maximum power (Amps) - manual entry
    
    -- Calculated electrical values (computed from panel type)
    voc_theoretical DECIMAL(6,2),        -- Open circuit voltage (calculated)
    isc_theoretical DECIMAL(6,2),        -- Short circuit current (calculated)
    
    -- Workflow tracking
    station_1_completed_at TIMESTAMP,    -- Assembly & EL completion
    station_2_completed_at TIMESTAMP,    -- Framing completion
    station_3_completed_at TIMESTAMP,    -- Junction Box completion
    station_4_completed_at TIMESTAMP,    -- Performance & Final completion
    
    -- Quality tracking
    rework_count INTEGER DEFAULT 0,      -- Number of times sent for rework
    rework_reason TEXT,                  -- Latest rework reason
    quality_notes TEXT,                  -- General quality notes
    
    -- Pallet assignment (for completed panels)
    pallet_id INTEGER,                   -- FK to pallets (nullable)
    pallet_position INTEGER,             -- Position within pallet (1-based)
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,              -- When panel finished all stations
    
    -- Audit fields
    created_by UUID,                     -- FK to users
    last_updated_by UUID                 -- FK to users
);

-- Create indexes for performance optimization
CREATE UNIQUE INDEX idx_panels_barcode ON panels(barcode);
CREATE INDEX idx_panels_mo_id ON panels(mo_id);
CREATE INDEX idx_panels_status ON panels(status);
CREATE INDEX idx_panels_current_station ON panels(current_station_id);
CREATE INDEX idx_panels_line_assignment ON panels(line_assignment);
CREATE INDEX idx_panels_panel_type ON panels(panel_type);
CREATE INDEX idx_panels_pallet_id ON panels(pallet_id);
CREATE INDEX idx_panels_created_at ON panels(created_at);
CREATE INDEX idx_panels_completed_at ON panels(completed_at);

-- Composite indexes for common query patterns
CREATE INDEX idx_panels_mo_status ON panels(mo_id, status);
CREATE INDEX idx_panels_station_status ON panels(current_station_id, status) WHERE current_station_id IS NOT NULL;
CREATE INDEX idx_panels_line_status ON panels(line_assignment, status);

-- Add foreign key constraints
ALTER TABLE panels ADD CONSTRAINT fk_panels_mo_id 
    FOREIGN KEY (mo_id) REFERENCES manufacturing_orders(id) 
    ON DELETE RESTRICT;

ALTER TABLE panels ADD CONSTRAINT fk_panels_current_station 
    FOREIGN KEY (current_station_id) REFERENCES stations(id) 
    ON DELETE SET NULL;

ALTER TABLE panels ADD CONSTRAINT fk_panels_created_by 
    FOREIGN KEY (created_by) REFERENCES users(id) 
    ON DELETE SET NULL;

ALTER TABLE panels ADD CONSTRAINT fk_panels_last_updated_by 
    FOREIGN KEY (last_updated_by) REFERENCES users(id) 
    ON DELETE SET NULL;

-- Add validation constraints
ALTER TABLE panels ADD CONSTRAINT check_barcode_format 
    CHECK (barcode ~ '^CRS[0-9]{2}[WB][TWB](36|40|60|72|144)[0-9]{5}$');

ALTER TABLE panels ADD CONSTRAINT check_barcode_length 
    CHECK (char_length(barcode) = 13);

ALTER TABLE panels ADD CONSTRAINT check_wattage_positive 
    CHECK (wattage_pmax IS NULL OR wattage_pmax > 0);

ALTER TABLE panels ADD CONSTRAINT check_vmp_positive 
    CHECK (vmp IS NULL OR vmp > 0);

ALTER TABLE panels ADD CONSTRAINT check_imp_positive 
    CHECK (imp IS NULL OR imp > 0);

ALTER TABLE panels ADD CONSTRAINT check_rework_count_positive 
    CHECK (rework_count >= 0);

ALTER TABLE panels ADD CONSTRAINT check_pallet_position_positive 
    CHECK (pallet_position IS NULL OR pallet_position > 0);

-- Line assignment logic constraint (based on panel type)
ALTER TABLE panels ADD CONSTRAINT check_line_assignment_logic 
    CHECK (
        (line_assignment = 'LINE_1' AND panel_type IN ('TYPE_36', 'TYPE_40', 'TYPE_60', 'TYPE_72')) OR
        (line_assignment = 'LINE_2' AND panel_type = 'TYPE_144')
    );

-- Create trigger to automatically update updated_at timestamp
CREATE TRIGGER update_panels_updated_at 
    BEFORE UPDATE ON panels 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically assign line based on panel type
CREATE OR REPLACE FUNCTION assign_line_from_panel_type()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-assign line based on panel type
    IF NEW.panel_type IN ('TYPE_36', 'TYPE_40', 'TYPE_60', 'TYPE_72') THEN
        NEW.line_assignment = 'LINE_1';
    ELSIF NEW.panel_type = 'TYPE_144' THEN
        NEW.line_assignment = 'LINE_2';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-assign line
CREATE TRIGGER trigger_assign_line_from_panel_type
    BEFORE INSERT OR UPDATE OF panel_type ON panels
    FOR EACH ROW
    EXECUTE FUNCTION assign_line_from_panel_type();

-- Function to extract panel specifications from barcode
CREATE OR REPLACE FUNCTION parse_barcode_specifications(barcode_input TEXT)
RETURNS TABLE(
    panel_type panel_type_enum,
    frame_type frame_type,
    backsheet_type backsheet_type
) AS $$
BEGIN
    -- Validate barcode format
    IF NOT (barcode_input ~ '^CRS[0-9]{2}[WB][TWB](36|40|60|72|144)[0-9]{5}$') THEN
        RAISE EXCEPTION 'Invalid barcode format: %', barcode_input;
    END IF;
    
    -- Extract frame type
    CASE substring(barcode_input, 6, 1)
        WHEN 'W' THEN frame_type = 'SILVER';
        WHEN 'B' THEN frame_type = 'BLACK';
    END CASE;
    
    -- Extract backsheet type  
    CASE substring(barcode_input, 7, 1)
        WHEN 'T' THEN backsheet_type = 'TRANSPARENT';
        WHEN 'W' THEN backsheet_type = 'WHITE';
        WHEN 'B' THEN backsheet_type = 'BLACK';
    END CASE;
    
    -- Extract panel type
    CASE substring(barcode_input, 8, 3)
        WHEN '36' THEN panel_type = 'TYPE_36';
        WHEN '40' THEN panel_type = 'TYPE_40';
        WHEN '60' THEN panel_type = 'TYPE_60';
        WHEN '72' THEN panel_type = 'TYPE_72';
        WHEN '144' THEN panel_type = 'TYPE_144';
    END CASE;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE panels IS 'Individual solar panels tracked through production workflow';
COMMENT ON COLUMN panels.id IS 'Unique identifier for the panel';
COMMENT ON COLUMN panels.barcode IS 'Unique barcode in format CRSYYFBPP##### identifying the panel';
COMMENT ON COLUMN panels.panel_type IS 'Type of panel (36, 40, 60, 72, or 144 cell)';
COMMENT ON COLUMN panels.frame_type IS 'Frame color type extracted from barcode';
COMMENT ON COLUMN panels.backsheet_type IS 'Backsheet type extracted from barcode';
COMMENT ON COLUMN panels.line_assignment IS 'Production line assignment (auto-assigned based on panel type)';
COMMENT ON COLUMN panels.current_station_id IS 'Current station where panel is located (null if not started)';
COMMENT ON COLUMN panels.status IS 'Current workflow status of the panel';
COMMENT ON COLUMN panels.mo_id IS 'Manufacturing order this panel belongs to';
COMMENT ON COLUMN panels.wattage_pmax IS 'Peak power measurement in Watts (manual entry at performance station)';
COMMENT ON COLUMN panels.vmp IS 'Voltage at maximum power in Volts (manual entry)';
COMMENT ON COLUMN panels.imp IS 'Current at maximum power in Amps (manual entry)';
COMMENT ON COLUMN panels.voc_theoretical IS 'Calculated open circuit voltage based on panel type';
COMMENT ON COLUMN panels.isc_theoretical IS 'Calculated short circuit current based on panel type';
COMMENT ON COLUMN panels.rework_count IS 'Number of times panel has been sent for rework';
COMMENT ON COLUMN panels.pallet_id IS 'Pallet assignment for completed panels';
COMMENT ON COLUMN panels.pallet_position IS 'Position within assigned pallet (1-based)';

-- Migration notes:
-- - Barcode format: CRSYYFBPP##### (13 characters total)
-- - Line assignment is automatic based on panel type
-- - Electrical measurements are manually entered at Station 4
-- - Status transitions are managed by application logic
-- - Rework panels re-enter at the point of failure

-- Rollback instructions (for manual rollback if needed):
/*
-- To rollback this migration:
DROP TRIGGER IF EXISTS trigger_assign_line_from_panel_type ON panels;
DROP FUNCTION IF EXISTS assign_line_from_panel_type();
DROP FUNCTION IF EXISTS parse_barcode_specifications(TEXT);
DROP TRIGGER IF EXISTS update_panels_updated_at ON panels;
DROP TABLE IF EXISTS panels;
*/
