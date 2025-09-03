-- Migration 016: Create MO Alerts Table
-- Solar Panel Production Tracking System
-- Task 10.2: Progress Tracking and Alert System
-- Created: 2025-01-27

-- Create mo_alerts table for manufacturing order alerts
CREATE TABLE mo_alerts (
    id SERIAL PRIMARY KEY,
    mo_id INTEGER NOT NULL,
    
    -- Alert details
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Alert values
    threshold_value DECIMAL(10,2),
    current_value DECIMAL(10,2),
    
    -- Station context (for station-specific alerts)
    station_id INTEGER,
    
    -- Notification settings
    notification_channels JSONB DEFAULT '["websocket", "dashboard"]',
    
    -- Alert lifecycle
    status VARCHAR(20) DEFAULT 'ACTIVE',
    acknowledged_by UUID,
    acknowledged_at TIMESTAMP,
    acknowledgment_notes TEXT,
    resolved_by UUID,
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_mo_alerts_mo_id ON mo_alerts(mo_id);
CREATE INDEX idx_mo_alerts_status ON mo_alerts(status);
CREATE INDEX idx_mo_alerts_severity ON mo_alerts(severity);
CREATE INDEX idx_mo_alerts_alert_type ON mo_alerts(alert_type);
CREATE INDEX idx_mo_alerts_created_at ON mo_alerts(created_at);
CREATE INDEX idx_mo_alerts_station_id ON mo_alerts(station_id);

-- Create composite indexes for common queries
CREATE INDEX idx_mo_alerts_mo_status ON mo_alerts(mo_id, status);
CREATE INDEX idx_mo_alerts_severity_status ON mo_alerts(severity, status);
CREATE INDEX idx_mo_alerts_type_status ON mo_alerts(alert_type, status);

-- Create partial indexes for active alerts
CREATE INDEX idx_mo_alerts_active ON mo_alerts(created_at) 
    WHERE status = 'ACTIVE';

CREATE INDEX idx_mo_alerts_critical_active ON mo_alerts(created_at) 
    WHERE status = 'ACTIVE' AND severity = 'critical';

-- Add foreign key constraints
ALTER TABLE mo_alerts ADD CONSTRAINT fk_mo_alerts_mo_id 
    FOREIGN KEY (mo_id) REFERENCES manufacturing_orders(id) 
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE mo_alerts ADD CONSTRAINT fk_mo_alerts_acknowledged_by 
    FOREIGN KEY (acknowledged_by) REFERENCES users(id) 
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE mo_alerts ADD CONSTRAINT fk_mo_alerts_resolved_by 
    FOREIGN KEY (resolved_by) REFERENCES users(id) 
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Add constraints
ALTER TABLE mo_alerts ADD CONSTRAINT check_alert_type_valid 
    CHECK (alert_type IN (
        'panels_remaining',
        'low_progress', 
        'high_failure_rate',
        'station_bottleneck',
        'slow_station',
        'ready_for_completion',
        'mo_delayed',
        'mo_completed'
    ));

ALTER TABLE mo_alerts ADD CONSTRAINT check_severity_valid 
    CHECK (severity IN ('info', 'warning', 'critical'));

ALTER TABLE mo_alerts ADD CONSTRAINT check_status_valid 
    CHECK (status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'SUPPRESSED'));

ALTER TABLE mo_alerts ADD CONSTRAINT check_alert_values_positive 
    CHECK (
        (threshold_value IS NULL OR threshold_value >= 0) AND
        (current_value IS NULL OR current_value >= 0)
    );

ALTER TABLE mo_alerts ADD CONSTRAINT check_station_id_valid 
    CHECK (station_id IS NULL OR station_id BETWEEN 1 AND 4);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_mo_alerts_updated_at 
    BEFORE UPDATE ON mo_alerts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to auto-resolve alerts when MO is completed
CREATE OR REPLACE FUNCTION auto_resolve_mo_alerts_on_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- If MO status changed to COMPLETED, resolve all active alerts
    IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
        UPDATE mo_alerts 
        SET 
            status = 'RESOLVED',
            resolved_by = NULL, -- System auto-resolution
            resolved_at = CURRENT_TIMESTAMP,
            resolution_notes = 'Auto-resolved: Manufacturing order completed',
            updated_at = CURRENT_TIMESTAMP
        WHERE mo_id = NEW.id 
          AND status = 'ACTIVE';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-resolving alerts on MO completion
CREATE TRIGGER auto_resolve_mo_alerts_trigger 
    AFTER UPDATE ON manufacturing_orders 
    FOR EACH ROW 
    EXECUTE FUNCTION auto_resolve_mo_alerts_on_completion();

-- Create function to clean up old resolved alerts (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_mo_alerts()
RETURNS VOID AS $$
BEGIN
    -- Delete resolved alerts older than 30 days
    DELETE FROM mo_alerts 
    WHERE status = 'RESOLVED' 
      AND resolved_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
    
    -- Log cleanup activity
    RAISE NOTICE 'Cleaned up old MO alerts: % rows affected', ROW_COUNT;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE mo_alerts IS 'Manufacturing order alerts and notifications';
COMMENT ON COLUMN mo_alerts.id IS 'Unique identifier for the alert';
COMMENT ON COLUMN mo_alerts.mo_id IS 'Manufacturing order ID this alert relates to';
COMMENT ON COLUMN mo_alerts.alert_type IS 'Type of alert (panels_remaining, low_progress, etc.)';
COMMENT ON COLUMN mo_alerts.severity IS 'Alert severity level (info, warning, critical)';
COMMENT ON COLUMN mo_alerts.title IS 'Alert title for display';
COMMENT ON COLUMN mo_alerts.message IS 'Detailed alert message';
COMMENT ON COLUMN mo_alerts.threshold_value IS 'Threshold value that triggered the alert';
COMMENT ON COLUMN mo_alerts.current_value IS 'Current value when alert was created';
COMMENT ON COLUMN mo_alerts.station_id IS 'Station ID for station-specific alerts';
COMMENT ON COLUMN mo_alerts.notification_channels IS 'JSON array of notification channels';
COMMENT ON COLUMN mo_alerts.status IS 'Alert status (ACTIVE, ACKNOWLEDGED, RESOLVED, SUPPRESSED)';
COMMENT ON COLUMN mo_alerts.acknowledged_by IS 'User who acknowledged the alert';
COMMENT ON COLUMN mo_alerts.acknowledged_at IS 'When the alert was acknowledged';
COMMENT ON COLUMN mo_alerts.acknowledgment_notes IS 'Notes from acknowledgment';
COMMENT ON COLUMN mo_alerts.resolved_by IS 'User who resolved the alert';
COMMENT ON COLUMN mo_alerts.resolved_at IS 'When the alert was resolved';
COMMENT ON COLUMN mo_alerts.resolution_notes IS 'Notes from resolution';

-- Insert sample alert types for reference
INSERT INTO mo_alerts (
    mo_id, alert_type, severity, title, message, 
    threshold_value, current_value, status, created_at
) VALUES 
(1, 'panels_remaining', 'warning', 'Sample Alert', 'This is a sample alert for testing', 
 50, 45, 'RESOLVED', CURRENT_TIMESTAMP - INTERVAL '1 day')
ON CONFLICT DO NOTHING;
