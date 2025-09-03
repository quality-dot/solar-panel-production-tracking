-- Migration: Create Security Events Table
-- Task: 22.3 - Event Collection System
-- Description: Create foundation for real-time security monitoring
-- Date: 2025-08-28

-- Create security_events table for comprehensive event collection
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB NOT NULL,
  context JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  correlation_id VARCHAR(100),
  user_id VARCHAR(100),
  source_ip INET,
  severity VARCHAR(20) DEFAULT 'info',
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create event_metrics table for performance monitoring
CREATE TABLE IF NOT EXISTS event_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type VARCHAR(100) NOT NULL,
  metric_value NUMERIC NOT NULL,
  event_count INTEGER DEFAULT 0,
  time_period VARCHAR(20) NOT NULL, -- hour, day, week, month
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes for security_events
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_correlation ON security_events(correlation_id);

-- JSONB index for flexible queries on event_data
CREATE INDEX IF NOT EXISTS idx_security_events_data ON security_events USING GIN(event_data);

-- JSONB index for flexible queries on context
CREATE INDEX IF NOT EXISTS idx_security_events_context ON security_events USING GIN(context);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_security_events_type_severity ON security_events(event_type, severity);
CREATE INDEX IF NOT EXISTS idx_security_events_user_timestamp ON security_events(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_security_events_type_timestamp ON security_events(event_type, timestamp);

-- Indexes for event_metrics
CREATE INDEX IF NOT EXISTS idx_event_metrics_type ON event_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_event_metrics_period ON event_metrics(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_event_metrics_type_period ON event_metrics(metric_type, period_start, period_end);

-- Add comments for documentation
COMMENT ON TABLE security_events IS 'Comprehensive security event collection for manufacturing operations';
COMMENT ON TABLE event_metrics IS 'Performance metrics for event processing and analysis';

COMMENT ON COLUMN security_events.id IS 'Unique identifier for each security event';
COMMENT ON COLUMN security_events.event_type IS 'Type of security event (e.g., user.login, quality.check)';
COMMENT ON COLUMN security_events.event_data IS 'JSON data containing event-specific information';
COMMENT ON COLUMN security_events.context IS 'Additional context information (correlation, source, etc.)';
COMMENT ON COLUMN security_events.timestamp IS 'When the event occurred';
COMMENT ON COLUMN security_events.correlation_id IS 'Correlation ID for tracing related events';
COMMENT ON COLUMN security_events.user_id IS 'User associated with the event';
COMMENT ON COLUMN security_events.source_ip IS 'Source IP address for the event';
COMMENT ON COLUMN security_events.severity IS 'Event severity level (info, warn, error)';
COMMENT ON COLUMN security_events.processed IS 'Whether the event has been processed by handlers';
COMMENT ON COLUMN security_events.created_at IS 'When the event record was created';

COMMENT ON COLUMN event_metrics.id IS 'Unique identifier for each metric record';
COMMENT ON COLUMN event_metrics.metric_type IS 'Type of metric (e.g., event_count, processing_time)';
COMMENT ON COLUMN event_metrics.metric_value IS 'Numeric value of the metric';
COMMENT ON COLUMN event_metrics.event_count IS 'Number of events in the time period';
COMMENT ON COLUMN event_metrics.time_period IS 'Time period for the metric (hour, day, week, month)';
COMMENT ON COLUMN event_metrics.period_start IS 'Start of the time period';
COMMENT ON COLUMN event_metrics.period_end IS 'End of the time period';
COMMENT ON COLUMN event_metrics.created_at IS 'When the metric record was created';

-- Insert initial event types for reference
INSERT INTO security_events (event_type, event_data, context, severity, source_ip) VALUES
('system.initialization', 
 '{"message": "Security events table created", "version": "1.0.0"}',
 '{"source": "migration", "task": "22.3", "component": "database"}',
 'info',
 '127.0.0.1')
ON CONFLICT DO NOTHING;

-- Create view for common event queries
CREATE OR REPLACE VIEW security_events_summary AS
SELECT 
  event_type,
  severity,
  COUNT(*) as event_count,
  MIN(timestamp) as first_occurrence,
  MAX(timestamp) as last_occurrence,
  AVG(EXTRACT(EPOCH FROM (NOW() - timestamp))) as avg_age_seconds
FROM security_events
GROUP BY event_type, severity
ORDER BY event_count DESC;

-- Create view for recent events
CREATE OR REPLACE VIEW recent_security_events AS
SELECT 
  id,
  event_type,
  severity,
  timestamp,
  user_id,
  source_ip,
  correlation_id
FROM security_events
WHERE timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON security_events TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE ON event_metrics TO your_app_user;
-- GRANT SELECT ON security_events_summary TO your_app_user;
-- GRANT SELECT ON recent_security_events TO your_app_user;
