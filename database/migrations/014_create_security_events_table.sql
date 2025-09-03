-- Migration: Create security_events table for real-time security monitoring
-- Date: 2025-01-27
-- Description: Implements comprehensive security event tracking with 7-year retention

-- Create security_events table
CREATE TABLE IF NOT EXISTS security_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium',
  source VARCHAR(20) NOT NULL DEFAULT 'system',
  correlation_id VARCHAR(64),
  session_id VARCHAR(64),
  user_id INTEGER,
  ip_address INET,
  user_agent TEXT,
  event_data JSONB,
  metadata JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_events_correlation_id ON security_events(correlation_id);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_source ON security_events(source);

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_security_events_type_severity ON security_events(event_type, severity);
CREATE INDEX IF NOT EXISTS idx_security_events_type_timestamp ON security_events(event_type, timestamp);
CREATE INDEX IF NOT EXISTS idx_security_events_severity_timestamp ON security_events(severity, timestamp);
CREATE INDEX IF NOT EXISTS idx_security_events_user_timestamp ON security_events(user_id, timestamp);

-- Create partial indexes for high-severity events (most important for monitoring)
CREATE INDEX IF NOT EXISTS idx_security_events_high_severity ON security_events(timestamp) 
  WHERE severity IN ('high', 'critical');

-- Create index for JSONB queries on event_data
CREATE INDEX IF NOT EXISTS idx_security_events_data_gin ON security_events USING GIN (event_data);

-- Create index for JSONB queries on metadata
CREATE INDEX IF NOT EXISTS idx_security_events_metadata_gin ON security_events USING GIN (metadata);

-- Add constraints for data integrity
ALTER TABLE security_events 
  ADD CONSTRAINT chk_security_events_severity 
  CHECK (severity IN ('low', 'medium', 'high', 'critical'));

ALTER TABLE security_events 
  ADD CONSTRAINT chk_security_events_source 
  CHECK (source IN ('user', 'system', 'external', 'automated'));

ALTER TABLE security_events 
  ADD CONSTRAINT chk_security_events_event_type 
  CHECK (event_type IN (
    'auth_success', 'auth_failure', 'auth_lockout', 'auth_timeout', 'auth_logout',
    'manufacturing_access', 'manufacturing_modification', 'manufacturing_deletion', 'manufacturing_export',
    'data_read', 'data_write', 'data_delete', 'data_export', 'data_import',
    'threat_detected', 'threat_blocked', 'threat_escalated',
    'system_startup', 'system_shutdown', 'system_error', 'system_warning',
    'compliance_check', 'compliance_violation', 'compliance_report'
  ));

-- Add foreign key constraint to users table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    ALTER TABLE security_events 
      ADD CONSTRAINT fk_security_events_user_id 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create view for high-priority security events
CREATE OR REPLACE VIEW high_priority_security_events AS
SELECT 
  id,
  event_type,
  severity,
  source,
  correlation_id,
  user_id,
  timestamp,
  event_data,
  metadata
FROM security_events
WHERE severity IN ('high', 'critical')
ORDER BY timestamp DESC;

-- Create view for recent security events (last 24 hours)
CREATE OR REPLACE VIEW recent_security_events AS
SELECT 
  id,
  event_type,
  severity,
  source,
  correlation_id,
  user_id,
  timestamp,
  event_data,
  metadata
FROM security_events
WHERE timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;

-- Create view for authentication events
CREATE OR REPLACE VIEW authentication_events AS
SELECT 
  id,
  event_type,
  severity,
  source,
  correlation_id,
  session_id,
  user_id,
  ip_address,
  timestamp,
  event_data,
  metadata
FROM security_events
WHERE event_type LIKE 'auth_%'
ORDER BY timestamp DESC;

-- Create view for manufacturing events
CREATE OR REPLACE VIEW manufacturing_events AS
SELECT 
  id,
  event_type,
  severity,
  source,
  correlation_id,
  user_id,
  timestamp,
  event_data,
  metadata
FROM security_events
WHERE event_type LIKE 'manufacturing_%'
ORDER BY timestamp DESC;

-- Create view for threat events
CREATE OR REPLACE VIEW threat_events AS
SELECT 
  id,
  event_type,
  severity,
  source,
  correlation_id,
  user_id,
  timestamp,
  event_data,
  metadata
FROM security_events
WHERE event_type LIKE 'threat_%'
ORDER BY timestamp DESC;

-- Create function to get security event statistics
CREATE OR REPLACE FUNCTION get_security_event_stats(
  time_range INTERVAL DEFAULT INTERVAL '24 hours'
)
RETURNS TABLE (
  event_type VARCHAR(50),
  severity VARCHAR(20),
  source VARCHAR(20),
  event_count BIGINT,
  first_occurrence TIMESTAMP WITH TIME ZONE,
  last_occurrence TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    se.event_type,
    se.severity,
    se.source,
    COUNT(*)::BIGINT as event_count,
    MIN(se.timestamp) as first_occurrence,
    MAX(se.timestamp) as last_occurrence
  FROM security_events se
  WHERE se.timestamp >= NOW() - time_range
  GROUP BY se.event_type, se.severity, se.source
  ORDER BY event_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up old security events
CREATE OR REPLACE FUNCTION cleanup_old_security_events(
  retention_days INTEGER DEFAULT 2555  -- 7 years
)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM security_events
  WHERE timestamp < NOW() - INTERVAL '1 day' * retention_days;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get security events by correlation ID
CREATE OR REPLACE FUNCTION get_security_events_by_correlation(
  correlation_id_param VARCHAR(64)
)
RETURNS TABLE (
  id INTEGER,
  event_type VARCHAR(50),
  severity VARCHAR(20),
  source VARCHAR(20),
  session_id VARCHAR(64),
  user_id INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE,
  event_data JSONB,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    se.id,
    se.event_type,
    se.severity,
    se.source,
    se.session_id,
    se.user_id,
    se.timestamp,
    se.event_data,
    se.metadata
  FROM security_events se
  WHERE se.correlation_id = correlation_id_param
  ORDER BY se.timestamp ASC;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user security activity
CREATE OR REPLACE FUNCTION get_user_security_activity(
  user_id_param INTEGER,
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  event_type VARCHAR(50),
  severity VARCHAR(20),
  source VARCHAR(20),
  event_count BIGINT,
  last_occurrence TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    se.event_type,
    se.severity,
    se.source,
    COUNT(*)::BIGINT as event_count,
    MAX(se.timestamp) as last_occurrence
  FROM security_events se
  WHERE se.user_id = user_id_param
    AND se.timestamp >= NOW() - INTERVAL '1 day' * days_back
  GROUP BY se.event_type, se.severity, se.source
  ORDER BY event_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant appropriate permissions
GRANT SELECT, INSERT ON security_events TO authenticated_users;
GRANT SELECT ON high_priority_security_events TO authenticated_users;
GRANT SELECT ON recent_security_events TO authenticated_users;
GRANT SELECT ON authentication_events TO authenticated_users;
GRANT SELECT ON manufacturing_events TO authenticated_users;
GRANT SELECT ON threat_events TO authenticated_users;
GRANT EXECUTE ON FUNCTION get_security_event_stats(INTERVAL) TO authenticated_users;
GRANT EXECUTE ON FUNCTION get_security_events_by_correlation(VARCHAR) TO authenticated_users;
GRANT EXECUTE ON FUNCTION get_user_security_activity(INTEGER, INTEGER) TO authenticated_users;

-- Only allow cleanup function to be executed by database administrators
GRANT EXECUTE ON FUNCTION cleanup_old_security_events(INTEGER) TO database_admin;

-- Add comments for documentation
COMMENT ON TABLE security_events IS 'Comprehensive security event tracking for real-time monitoring and audit compliance';
COMMENT ON COLUMN security_events.event_type IS 'Type of security event (auth_success, threat_detected, etc.)';
COMMENT ON COLUMN security_events.severity IS 'Severity level (low, medium, high, critical)';
COMMENT ON COLUMN security_events.source IS 'Source of the event (user, system, external, automated)';
COMMENT ON COLUMN security_events.correlation_id IS 'Unique identifier for correlating related events';
COMMENT ON COLUMN security_events.session_id IS 'Session identifier for user activity tracking';
COMMENT ON COLUMN security_events.user_id IS 'User ID associated with the event';
COMMENT ON COLUMN security_events.event_data IS 'JSON data specific to the event type';
COMMENT ON COLUMN security_events.metadata IS 'Additional metadata and context information';

-- Create trigger to automatically update created_at timestamp
CREATE OR REPLACE FUNCTION update_security_events_created_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_security_events_created_at
  BEFORE UPDATE ON security_events
  FOR EACH ROW
  EXECUTE FUNCTION update_security_events_created_at();

-- Insert initial system startup event
INSERT INTO security_events (
  event_type, 
  severity, 
  source, 
  correlation_id, 
  event_data, 
  metadata
) VALUES (
  'system_startup',
  'low',
  'system',
  'migration-014-' || EXTRACT(EPOCH FROM NOW())::BIGINT,
  '{"migration": "014_create_security_events_table", "version": "1.0.0"}',
  '{"description": "Security events table created and initialized"}'
);
