-- Migration 001: Create Enum Types
-- Solar Panel Production Tracking System
-- Created: 2025-01-27

-- User Role Types
CREATE TYPE user_role_type AS ENUM (
    'STATION_INSPECTOR',     -- Can only access assigned stations
    'PRODUCTION_SUPERVISOR', -- Can monitor production, basic admin
    'QC_MANAGER',           -- Quality reports, advanced admin
    'SYSTEM_ADMIN'          -- Full system access
);

-- Panel Status Types
CREATE TYPE panel_status_type AS ENUM (
    'PENDING',      -- Newly created, not started
    'SCANNED',      -- Barcode scanned at station
    'IN_PROGRESS',  -- Currently being inspected
    'PASSED',       -- Passed current station
    'FAILED',       -- Failed current station
    'REWORK',       -- Sent for rework
    'COMPLETED',    -- Finished all stations
    'CANCELLED'     -- Cancelled/scrapped
);

-- Station Types
CREATE TYPE station_type AS ENUM (
    'ASSEMBLY_EL',          -- Station 1: Assembly & EL
    'FRAMING',              -- Station 2: Framing
    'JUNCTION_BOX',         -- Station 3: Junction Box
    'PERFORMANCE_FINAL'     -- Station 4: Performance & Final Inspection
);

-- Production Line Types
CREATE TYPE line_type AS ENUM (
    'LINE_1',   -- Handles panel types 36, 40, 60, 72
    'LINE_2'    -- Handles panel type 144
);

-- Panel Types (based on PRD specifications)
CREATE TYPE panel_type_enum AS ENUM (
    'TYPE_36',   -- 36-cell panels (Line 1)
    'TYPE_40',   -- 40-cell panels (Line 1) 
    'TYPE_60',   -- 60-cell panels (Line 1)
    'TYPE_72',   -- 72-cell panels (Line 1)
    'TYPE_144'   -- 144-cell panels (Line 2)
);

-- Manufacturing Order Status
CREATE TYPE mo_status_type AS ENUM (
    'DRAFT',        -- Created but not started
    'ACTIVE',       -- Currently in production
    'PAUSED',       -- Temporarily stopped
    'COMPLETED',    -- All panels finished
    'CANCELLED'     -- Order cancelled
);

-- Pallet Status
CREATE TYPE pallet_status_type AS ENUM (
    'OPEN',         -- Accepting panels
    'FULL',         -- At capacity, ready to close
    'CLOSED',       -- Completed and sealed
    'SHIPPED'       -- Shipped to customer
);

-- Inspection Types
CREATE TYPE inspection_type AS ENUM (
    'NORMAL',       -- Regular station inspection
    'REWORK',       -- Re-inspection after rework
    'FINAL',        -- Final quality check
    'AUDIT'         -- Quality audit inspection
);

-- Frame Types (from barcode specification)
CREATE TYPE frame_type AS ENUM (
    'SILVER',       -- W in barcode
    'BLACK'         -- B in barcode
);

-- Backsheet Types (from barcode specification) 
CREATE TYPE backsheet_type AS ENUM (
    'TRANSPARENT',  -- T in barcode
    'WHITE',        -- W in barcode
    'BLACK'         -- B in barcode
);

-- Comments on enum types for documentation
COMMENT ON TYPE user_role_type IS 'User roles with different permission levels';
COMMENT ON TYPE panel_status_type IS 'Panel workflow status throughout production';
COMMENT ON TYPE station_type IS 'Types of inspection stations in the production line';
COMMENT ON TYPE line_type IS 'Production lines (Line 1 and Line 2)';
COMMENT ON TYPE panel_type_enum IS 'Panel types handled by the system';
COMMENT ON TYPE mo_status_type IS 'Manufacturing order status states';
COMMENT ON TYPE pallet_status_type IS 'Pallet lifecycle status';
COMMENT ON TYPE inspection_type IS 'Types of inspections performed';
COMMENT ON TYPE frame_type IS 'Frame color types from barcode';
COMMENT ON TYPE backsheet_type IS 'Backsheet color types from barcode';
