-- Migration: Create account lockout events table
-- Description: Table for storing account lockout events and failed login attempts
-- Created: 2024-01-XX
-- Author: System

-- Create account lockout events table
CREATE TABLE IF NOT EXISTS account_lockout_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    username VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    event_type VARCHAR(50) NOT NULL,
    reason VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT fk_account_lockout_events_user_id 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_account_lockout_events_user_id 
    ON account_lockout_events(user_id);

CREATE INDEX IF NOT EXISTS idx_account_lockout_events_username 
    ON account_lockout_events(username);

CREATE INDEX IF NOT EXISTS idx_account_lockout_events_ip_address 
    ON account_lockout_events(ip_address);

CREATE INDEX IF NOT EXISTS idx_account_lockout_events_event_type 
    ON account_lockout_events(event_type);

CREATE INDEX IF NOT EXISTS idx_account_lockout_events_created_at 
    ON account_lockout_events(created_at);

CREATE INDEX IF NOT EXISTS idx_account_lockout_events_user_created 
    ON account_lockout_events(user_id, created_at);

-- Add comments for documentation
COMMENT ON TABLE account_lockout_events IS 'Stores account lockout events, failed login attempts, and security-related user events';
COMMENT ON COLUMN account_lockout_events.id IS 'Unique identifier for the lockout event record';
COMMENT ON COLUMN account_lockout_events.user_id IS 'Reference to the user associated with the event';
COMMENT ON COLUMN account_lockout_events.username IS 'Username at the time of the event (for audit purposes)';
COMMENT ON COLUMN account_lockout_events.ip_address IS 'IP address from which the event originated';
COMMENT ON COLUMN account_lockout_events.user_agent IS 'User agent string from the request';
COMMENT ON COLUMN account_lockout_events.event_type IS 'Type of event (failed_login, account_locked, account_unlocked, etc.)';
COMMENT ON COLUMN account_lockout_events.reason IS 'Reason for the event (invalid_credentials, max_attempts_exceeded, etc.)';
COMMENT ON COLUMN account_lockout_events.created_at IS 'Timestamp when the event occurred';

-- Add constraint to ensure valid event types
ALTER TABLE account_lockout_events 
ADD CONSTRAINT chk_account_lockout_event_type 
CHECK (event_type IN ('failed_login', 'account_locked', 'account_unlocked', 'password_reset', 'admin_unlock'));

-- Add constraint to ensure valid reasons
ALTER TABLE account_lockout_events 
ADD CONSTRAINT chk_account_lockout_reason 
CHECK (reason IN (
    'invalid_credentials', 
    'max_attempts_exceeded', 
    'automatic_expiry', 
    'admin_unlock', 
    'password_reset_completed',
    'account_created',
    'account_deleted'
));

-- Create a function to automatically clean up old lockout events
CREATE OR REPLACE FUNCTION cleanup_old_lockout_events()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM account_lockout_events 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup operation
    INSERT INTO audit_log (
        entity_type, 
        entity_id, 
        action, 
        user_id, 
        new_values, 
        created_at
    ) VALUES (
        'account_lockout_events',
        'system',
        'CLEANUP_OLD_EVENTS',
        NULL,
        jsonb_build_object('deleted_count', deleted_count, 'retention_days', 90),
        CURRENT_TIMESTAMP
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get lockout statistics
CREATE OR REPLACE FUNCTION get_lockout_statistics()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'currently_locked', (
            SELECT COUNT(*) 
            FROM users 
            WHERE locked_until IS NOT NULL 
            AND locked_until > CURRENT_TIMESTAMP
        ),
        'recently_locked', (
            SELECT COUNT(*) 
            FROM users 
            WHERE locked_until IS NOT NULL 
            AND locked_until > CURRENT_TIMESTAMP - INTERVAL '24 hours'
        ),
        'total_lockout_events_30d', (
            SELECT COUNT(*) 
            FROM account_lockout_events 
            WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
        ),
        'failed_attempts_24h', (
            SELECT COUNT(*) 
            FROM account_lockout_events 
            WHERE event_type = 'failed_login' 
            AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
        ),
        'lockouts_by_reason_30d', (
            SELECT jsonb_object_agg(reason, count)
            FROM (
                SELECT reason, COUNT(*) as count 
                FROM account_lockout_events 
                WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
                GROUP BY reason
            ) subq
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get user lockout history
CREATE OR REPLACE FUNCTION get_user_lockout_history(p_user_id UUID)
RETURNS TABLE (
    event_type VARCHAR(50),
    reason VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ale.event_type,
        ale.reason,
        ale.ip_address,
        ale.user_agent,
        ale.created_at
    FROM account_lockout_events ale
    WHERE ale.user_id = p_user_id
    ORDER BY ale.created_at DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically log account lockout events
CREATE OR REPLACE FUNCTION log_account_lockout_event()
RETURNS TRIGGER AS $$
BEGIN
    -- Log when a user gets locked
    IF NEW.locked_until IS NOT NULL AND OLD.locked_until IS NULL THEN
        INSERT INTO account_lockout_events (
            user_id, 
            username, 
            event_type, 
            reason, 
            created_at
        ) VALUES (
            NEW.id,
            NEW.username,
            'account_locked',
            'max_attempts_exceeded',
            CURRENT_TIMESTAMP
        );
    END IF;
    
    -- Log when a user gets unlocked
    IF NEW.locked_until IS NULL AND OLD.locked_until IS NOT NULL THEN
        INSERT INTO account_lockout_events (
            user_id, 
            username, 
            event_type, 
            reason, 
            created_at
        ) VALUES (
            NEW.id,
            NEW.username,
            'account_unlocked',
            'automatic_expiry',
            CURRENT_TIMESTAMP
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_log_account_lockout_event ON users;
CREATE TRIGGER trigger_log_account_lockout_event
    AFTER UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION log_account_lockout_event();

-- Insert initial data or configuration if needed
-- (No initial data needed for this table)

-- Grant appropriate permissions
-- (These would be set based on your application's database user)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON account_lockout_events TO app_user;
-- GRANT USAGE ON SEQUENCE account_lockout_events_id_seq TO app_user;
-- GRANT EXECUTE ON FUNCTION get_lockout_statistics() TO app_user;
-- GRANT EXECUTE ON FUNCTION get_user_lockout_history(UUID) TO app_user;
-- GRANT EXECUTE ON FUNCTION cleanup_old_lockout_events() TO app_user;
