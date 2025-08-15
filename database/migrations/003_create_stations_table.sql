-- Migration 003: Create Stations Configuration Table
-- Solar Panel Production Tracking System
-- Created: 2025-01-27

-- Create stations table
CREATE TABLE stations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    station_type station_type NOT NULL,
    line line_type NOT NULL,
    station_number INTEGER NOT NULL,
    
    -- Criteria configuration for this station (JSONB format)
    -- Example: {"criteria": [{"name": "solder_joints", "required": true, "line_specific": false}]}
    criteria_config JSONB DEFAULT '{"criteria": []}',
    
    -- Station metadata
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create unique constraint for line + station_number combination
ALTER TABLE stations ADD CONSTRAINT unique_line_station 
    UNIQUE (line, station_number);

-- Create indexes for performance
CREATE INDEX idx_stations_type ON stations(station_type);
CREATE INDEX idx_stations_line ON stations(line);
CREATE INDEX idx_stations_active ON stations(is_active);
CREATE INDEX idx_stations_line_number ON stations(line, station_number);

-- Create GIN index for criteria configuration JSONB queries
CREATE INDEX idx_stations_criteria_config ON stations USING gin(criteria_config);

-- Add constraints
ALTER TABLE stations ADD CONSTRAINT check_station_number_positive 
    CHECK (station_number > 0 AND station_number <= 10);

ALTER TABLE stations ADD CONSTRAINT check_name_not_empty 
    CHECK (char_length(trim(name)) > 0);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_stations_updated_at 
    BEFORE UPDATE ON stations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert initial station configurations (8 stations total: 4 per line)
INSERT INTO stations (name, station_type, line, station_number, description, sort_order) VALUES
    -- Line 1 stations
    ('Line 1 - Station 1: Assembly & EL', 'ASSEMBLY_EL', 'LINE_1', 1, 'Assembly and electroluminescence testing for Line 1', 1),
    ('Line 1 - Station 2: Framing', 'FRAMING', 'LINE_1', 2, 'Panel framing and trimming for Line 1', 2),
    ('Line 1 - Station 3: Junction Box', 'JUNCTION_BOX', 'LINE_1', 3, 'Junction box installation and testing for Line 1', 3),
    ('Line 1 - Station 4: Performance & Final', 'PERFORMANCE_FINAL', 'LINE_1', 4, 'Performance testing and final inspection for Line 1', 4),
    
    -- Line 2 stations  
    ('Line 2 - Station 1: Assembly & EL', 'ASSEMBLY_EL', 'LINE_2', 1, 'Assembly and electroluminescence testing for Line 2', 5),
    ('Line 2 - Station 2: Framing', 'FRAMING', 'LINE_2', 2, 'Panel framing and trimming for Line 2', 6),
    ('Line 2 - Station 3: Junction Box', 'JUNCTION_BOX', 'LINE_2', 3, 'Junction box installation and testing for Line 2', 7),
    ('Line 2 - Station 4: Performance & Final', 'PERFORMANCE_FINAL', 'LINE_2', 4, 'Performance testing and final inspection for Line 2', 8);

-- Comments for documentation
COMMENT ON TABLE stations IS 'Configuration for production line stations';
COMMENT ON COLUMN stations.id IS 'Unique identifier for the station';
COMMENT ON COLUMN stations.name IS 'Human-readable name of the station';
COMMENT ON COLUMN stations.station_type IS 'Type of work performed at this station';
COMMENT ON COLUMN stations.line IS 'Which production line this station belongs to';
COMMENT ON COLUMN stations.station_number IS 'Sequential number of station within the line';
COMMENT ON COLUMN stations.criteria_config IS 'JSON configuration of pass/fail criteria for this station';
COMMENT ON COLUMN stations.is_active IS 'Whether this station is currently operational';
COMMENT ON COLUMN stations.sort_order IS 'Display order for UI purposes';
