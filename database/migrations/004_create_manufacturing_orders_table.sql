-- Migration 004: Create Manufacturing Orders Table
-- Solar Panel Production Tracking System
-- Created: 2025-01-27

-- Create manufacturing_orders table
CREATE TABLE manufacturing_orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    panel_type panel_type_enum NOT NULL,
    
    -- Quantity tracking
    target_quantity INTEGER NOT NULL,
    completed_quantity INTEGER DEFAULT 0,
    failed_quantity INTEGER DEFAULT 0,
    in_progress_quantity INTEGER DEFAULT 0,
    
    -- Status and metadata
    status mo_status_type DEFAULT 'DRAFT',
    priority INTEGER DEFAULT 0, -- Higher numbers = higher priority
    
    -- Barcode generation parameters
    year_code VARCHAR(2), -- YY part of barcode (e.g., '25' for 2025)
    frame_type frame_type,
    backsheet_type backsheet_type,
    next_sequence_number INTEGER DEFAULT 1,
    
    -- Relationships
    created_by UUID NOT NULL, -- FK to users table (will be added later)
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Additional information
    customer_name VARCHAR(255),
    customer_po VARCHAR(100),
    notes TEXT,
    estimated_completion_date DATE,
    actual_completion_date DATE
);

-- Create indexes for performance
CREATE INDEX idx_mo_order_number ON manufacturing_orders(order_number);
CREATE INDEX idx_mo_status ON manufacturing_orders(status);
CREATE INDEX idx_mo_panel_type ON manufacturing_orders(panel_type);
CREATE INDEX idx_mo_created_by ON manufacturing_orders(created_by);
CREATE INDEX idx_mo_created_at ON manufacturing_orders(created_at);
CREATE INDEX idx_mo_priority_status ON manufacturing_orders(priority DESC, status);

-- Create partial indexes for active orders
CREATE INDEX idx_mo_active_orders ON manufacturing_orders(created_at) 
    WHERE status IN ('DRAFT', 'ACTIVE', 'PAUSED');

-- Add constraints
ALTER TABLE manufacturing_orders ADD CONSTRAINT check_target_quantity_positive 
    CHECK (target_quantity > 0);

ALTER TABLE manufacturing_orders ADD CONSTRAINT check_quantities_valid 
    CHECK (
        completed_quantity >= 0 AND 
        failed_quantity >= 0 AND 
        in_progress_quantity >= 0 AND
        (completed_quantity + failed_quantity + in_progress_quantity) <= target_quantity
    );

ALTER TABLE manufacturing_orders ADD CONSTRAINT check_order_number_format 
    CHECK (order_number ~ '^[A-Z0-9-]+$' AND char_length(order_number) >= 3);

ALTER TABLE manufacturing_orders ADD CONSTRAINT check_year_code_format 
    CHECK (year_code IS NULL OR year_code ~ '^[0-9]{2}$');

ALTER TABLE manufacturing_orders ADD CONSTRAINT check_sequence_number_positive 
    CHECK (next_sequence_number > 0);

ALTER TABLE manufacturing_orders ADD CONSTRAINT check_completion_dates 
    CHECK (
        (completed_at IS NULL) OR 
        (started_at IS NULL OR completed_at >= started_at)
    );

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_mo_updated_at 
    BEFORE UPDATE ON manufacturing_orders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to auto-update status based on quantities
CREATE OR REPLACE FUNCTION update_mo_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-complete if all panels are done
    IF NEW.completed_quantity + NEW.failed_quantity >= NEW.target_quantity 
       AND NEW.status = 'ACTIVE' THEN
        NEW.status = 'COMPLETED';
        NEW.completed_at = CURRENT_TIMESTAMP;
        NEW.actual_completion_date = CURRENT_DATE;
    END IF;
    
    -- Auto-start if panels are in progress and status is DRAFT
    IF NEW.in_progress_quantity > 0 AND NEW.status = 'DRAFT' THEN
        NEW.status = 'ACTIVE';
        NEW.started_at = CURRENT_TIMESTAMP;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for auto-status updates
CREATE TRIGGER update_mo_auto_status 
    BEFORE UPDATE ON manufacturing_orders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_mo_status();

-- Comments for documentation
COMMENT ON TABLE manufacturing_orders IS 'Manufacturing orders for solar panel production';
COMMENT ON COLUMN manufacturing_orders.id IS 'Unique identifier for the manufacturing order';
COMMENT ON COLUMN manufacturing_orders.order_number IS 'Unique order number for tracking';
COMMENT ON COLUMN manufacturing_orders.panel_type IS 'Type of panels to be manufactured';
COMMENT ON COLUMN manufacturing_orders.target_quantity IS 'Total number of panels to manufacture';
COMMENT ON COLUMN manufacturing_orders.completed_quantity IS 'Number of panels successfully completed';
COMMENT ON COLUMN manufacturing_orders.failed_quantity IS 'Number of panels that failed and were scrapped';
COMMENT ON COLUMN manufacturing_orders.in_progress_quantity IS 'Number of panels currently in production';
COMMENT ON COLUMN manufacturing_orders.year_code IS 'Year code for barcode generation (YY format)';
COMMENT ON COLUMN manufacturing_orders.frame_type IS 'Frame type for all panels in this order';
COMMENT ON COLUMN manufacturing_orders.backsheet_type IS 'Backsheet type for all panels in this order';
COMMENT ON COLUMN manufacturing_orders.next_sequence_number IS 'Next sequential number for barcode generation';
