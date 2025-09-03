-- Migration: Create session management tables
-- Description: Tables for user session management, token blacklisting, and session tracking
-- Created: 2024-01-XX
-- Author: System

-- Create user sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    username VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    invalidated_at TIMESTAMP WITH TIME ZONE NULL,
    invalidation_reason VARCHAR(100) NULL,
    
    -- Foreign key constraint
    CONSTRAINT fk_user_sessions_user_id 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE
);

-- Create token blacklist table
CREATE TABLE IF NOT EXISTS token_blacklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT NOT NULL UNIQUE,
    reason VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Index for performance
    CONSTRAINT chk_token_blacklist_expires_future 
        CHECK (expires_at > created_at)
);

-- Create indexes for user_sessions table
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id 
    ON user_sessions(session_id);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id 
    ON user_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_sessions_username 
    ON user_sessions(username);

CREATE INDEX IF NOT EXISTS idx_user_sessions_ip_address 
    ON user_sessions(ip_address);

CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at 
    ON user_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity 
    ON user_sessions(last_activity);

CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active 
    ON user_sessions(is_active);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active 
    ON user_sessions(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_user_sessions_created_at 
    ON user_sessions(created_at);

-- Create indexes for token_blacklist table
CREATE INDEX IF NOT EXISTS idx_token_blacklist_token 
    ON token_blacklist(token);

CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires_at 
    ON token_blacklist(expires_at);

CREATE INDEX IF NOT EXISTS idx_token_blacklist_created_at 
    ON token_blacklist(created_at);

-- Add comments for documentation
COMMENT ON TABLE user_sessions IS 'Stores active user sessions with tokens, IP tracking, and activity monitoring';
COMMENT ON COLUMN user_sessions.id IS 'Unique identifier for the session record';
COMMENT ON COLUMN user_sessions.session_id IS 'Unique session identifier used by the application';
COMMENT ON COLUMN user_sessions.user_id IS 'Reference to the user who owns this session';
COMMENT ON COLUMN user_sessions.username IS 'Username at the time of session creation (for audit purposes)';
COMMENT ON COLUMN user_sessions.role IS 'User role at the time of session creation';
COMMENT ON COLUMN user_sessions.ip_address IS 'IP address from which the session was created';
COMMENT ON COLUMN user_sessions.user_agent IS 'User agent string from the request';
COMMENT ON COLUMN user_sessions.access_token IS 'JWT access token for this session';
COMMENT ON COLUMN user_sessions.refresh_token IS 'JWT refresh token for this session';
COMMENT ON COLUMN user_sessions.created_at IS 'Timestamp when the session was created';
COMMENT ON COLUMN user_sessions.expires_at IS 'Timestamp when the session expires';
COMMENT ON COLUMN user_sessions.last_activity IS 'Timestamp of last activity in this session';
COMMENT ON COLUMN user_sessions.is_active IS 'Whether the session is currently active';
COMMENT ON COLUMN user_sessions.invalidated_at IS 'Timestamp when the session was invalidated';
COMMENT ON COLUMN user_sessions.invalidation_reason IS 'Reason for session invalidation';

COMMENT ON TABLE token_blacklist IS 'Stores blacklisted JWT tokens that have been invalidated';
COMMENT ON COLUMN token_blacklist.id IS 'Unique identifier for the blacklist record';
COMMENT ON COLUMN token_blacklist.token IS 'The blacklisted JWT token';
COMMENT ON COLUMN token_blacklist.reason IS 'Reason for blacklisting the token';
COMMENT ON COLUMN token_blacklist.created_at IS 'Timestamp when the token was blacklisted';
COMMENT ON COLUMN token_blacklist.expires_at IS 'Timestamp when the blacklist entry expires';

-- Add constraints to ensure valid data
ALTER TABLE user_sessions 
ADD CONSTRAINT chk_user_sessions_expires_future 
CHECK (expires_at > created_at);

ALTER TABLE user_sessions 
ADD CONSTRAINT chk_user_sessions_last_activity_valid 
CHECK (last_activity >= created_at);

ALTER TABLE user_sessions 
ADD CONSTRAINT chk_user_sessions_role_valid 
CHECK (role IN ('STATION_INSPECTOR', 'PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN'));

ALTER TABLE user_sessions 
ADD CONSTRAINT chk_user_sessions_invalidation_reason_valid 
CHECK (invalidation_reason IN (
    'manual_logout', 
    'password_change', 
    'account_locked', 
    'session_limit_exceeded',
    'expired',
    'token_mismatch',
    'admin_force_logout',
    'security_violation'
));

ALTER TABLE token_blacklist 
ADD CONSTRAINT chk_token_blacklist_reason_valid 
CHECK (reason IN (
    'manual_logout', 
    'password_change', 
    'account_locked', 
    'session_limit_exceeded',
    'expired',
    'token_mismatch',
    'admin_force_logout',
    'security_violation'
));

-- Create a function to automatically clean up expired sessions and tokens
CREATE OR REPLACE FUNCTION cleanup_expired_sessions_and_tokens()
RETURNS INTEGER AS $$
DECLARE
    expired_sessions INTEGER;
    expired_tokens INTEGER;
BEGIN
    -- Clean up expired sessions
    UPDATE user_sessions 
    SET is_active = false, invalidated_at = CURRENT_TIMESTAMP, invalidation_reason = 'expired'
    WHERE expires_at <= CURRENT_TIMESTAMP 
    AND is_active = true;
    
    GET DIAGNOSTICS expired_sessions = ROW_COUNT;
    
    -- Clean up expired blacklisted tokens
    DELETE FROM token_blacklist 
    WHERE expires_at <= CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS expired_tokens = ROW_COUNT;
    
    -- Log the cleanup operation
    INSERT INTO audit_log (
        entity_type, 
        entity_id, 
        action, 
        user_id, 
        new_values, 
        created_at
    ) VALUES (
        'session_management',
        'system',
        'CLEANUP_EXPIRED',
        NULL,
        jsonb_build_object(
            'expired_sessions', expired_sessions,
            'expired_tokens', expired_tokens
        ),
        CURRENT_TIMESTAMP
    );
    
    RETURN expired_sessions + expired_tokens;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get session statistics
CREATE OR REPLACE FUNCTION get_session_statistics()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'active_sessions', (
            SELECT COUNT(*) 
            FROM user_sessions 
            WHERE is_active = true 
            AND expires_at > CURRENT_TIMESTAMP
        ),
        'expired_sessions', (
            SELECT COUNT(*) 
            FROM user_sessions 
            WHERE expires_at <= CURRENT_TIMESTAMP
        ),
        'blacklisted_tokens', (
            SELECT COUNT(*) 
            FROM token_blacklist 
            WHERE expires_at > CURRENT_TIMESTAMP
        ),
        'sessions_by_user', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'userId', user_id,
                    'sessionCount', count
                )
            )
            FROM (
                SELECT user_id, COUNT(*) as count 
                FROM user_sessions 
                WHERE is_active = true 
                GROUP BY user_id
            ) subq
        ),
        'recent_sessions_24h', (
            SELECT COUNT(*) 
            FROM user_sessions 
            WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
        ),
        'sessions_by_role', (
            SELECT jsonb_object_agg(role, count)
            FROM (
                SELECT role, COUNT(*) as count 
                FROM user_sessions 
                WHERE is_active = true 
                GROUP BY role
            ) subq
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get user session history
CREATE OR REPLACE FUNCTION get_user_session_history(p_user_id UUID, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_activity TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN,
    invalidation_reason VARCHAR(100)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        us.session_id,
        us.ip_address,
        us.user_agent,
        us.created_at,
        us.expires_at,
        us.last_activity,
        us.is_active,
        us.invalidation_reason
    FROM user_sessions us
    WHERE us.user_id = p_user_id
    ORDER BY us.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically log session events
CREATE OR REPLACE FUNCTION log_session_events()
RETURNS TRIGGER AS $$
BEGIN
    -- Log when a session is created
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (
            entity_type, 
            entity_id, 
            action, 
            user_id, 
            new_values, 
            created_at
        ) VALUES (
            'user_sessions',
            NEW.session_id,
            'SESSION_CREATED',
            NEW.user_id,
            jsonb_build_object(
                'username', NEW.username,
                'role', NEW.role,
                'ipAddress', NEW.ip_address,
                'expiresAt', NEW.expires_at
            ),
            CURRENT_TIMESTAMP
        );
    END IF;
    
    -- Log when a session is invalidated
    IF TG_OP = 'UPDATE' AND OLD.is_active = true AND NEW.is_active = false THEN
        INSERT INTO audit_log (
            entity_type, 
            entity_id, 
            action, 
            user_id, 
            new_values, 
            created_at
        ) VALUES (
            'user_sessions',
            NEW.session_id,
            'SESSION_INVALIDATED',
            NEW.user_id,
            jsonb_build_object(
                'reason', NEW.invalidation_reason,
                'invalidatedAt', NEW.invalidated_at
            ),
            CURRENT_TIMESTAMP
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_log_session_events ON user_sessions;
CREATE TRIGGER trigger_log_session_events
    AFTER INSERT OR UPDATE ON user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION log_session_events();

-- Insert initial data or configuration if needed
-- (No initial data needed for these tables)

-- Grant appropriate permissions
-- (These would be set based on your application's database user)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON user_sessions TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON token_blacklist TO app_user;
-- GRANT USAGE ON SEQUENCE user_sessions_id_seq TO app_user;
-- GRANT USAGE ON SEQUENCE token_blacklist_id_seq TO app_user;
-- GRANT EXECUTE ON FUNCTION get_session_statistics() TO app_user;
-- GRANT EXECUTE ON FUNCTION get_user_session_history(UUID, INTEGER) TO app_user;
-- GRANT EXECUTE ON FUNCTION cleanup_expired_sessions_and_tokens() TO app_user;
