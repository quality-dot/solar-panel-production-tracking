-- Migration: Create password reset tokens table
-- Description: Table for storing secure password reset tokens with expiration
-- Created: 2024-01-XX
-- Author: System

-- Create password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP WITH TIME ZONE NULL,
    
    -- Foreign key constraint
    CONSTRAINT fk_password_reset_tokens_user_id 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id 
    ON password_reset_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token 
    ON password_reset_tokens(token);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at 
    ON password_reset_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_created_at 
    ON password_reset_tokens(created_at);

-- Add comments for documentation
COMMENT ON TABLE password_reset_tokens IS 'Stores secure password reset tokens with expiration for user password reset functionality';
COMMENT ON COLUMN password_reset_tokens.id IS 'Unique identifier for the reset token record';
COMMENT ON COLUMN password_reset_tokens.user_id IS 'Reference to the user requesting password reset';
COMMENT ON COLUMN password_reset_tokens.token IS 'Secure random token for password reset (64 characters)';
COMMENT ON COLUMN password_reset_tokens.expires_at IS 'Timestamp when the reset token expires (typically 1 hour)';
COMMENT ON COLUMN password_reset_tokens.created_at IS 'Timestamp when the reset token was created';
COMMENT ON COLUMN password_reset_tokens.used_at IS 'Timestamp when the reset token was used (NULL if unused)';

-- Create a function to automatically clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_password_reset_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM password_reset_tokens 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
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
        'password_reset_tokens',
        'system',
        'CLEANUP_EXPIRED',
        NULL,
        jsonb_build_object('deleted_count', deleted_count),
        CURRENT_TIMESTAMP
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update used_at when token is used
-- (This would be called from the application when a token is successfully used)
CREATE OR REPLACE FUNCTION mark_password_reset_token_used()
RETURNS TRIGGER AS $$
BEGIN
    -- This function can be called from the application
    -- to mark a token as used when password reset is completed
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add constraint to ensure token format (64 hex characters)
ALTER TABLE password_reset_tokens 
ADD CONSTRAINT chk_password_reset_token_format 
CHECK (token ~ '^[a-f0-9]{64}$');

-- Add constraint to ensure expires_at is in the future when created
ALTER TABLE password_reset_tokens 
ADD CONSTRAINT chk_password_reset_expires_future 
CHECK (expires_at > created_at);

-- Insert initial data or configuration if needed
-- (No initial data needed for this table)

-- Grant appropriate permissions
-- (These would be set based on your application's database user)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON password_reset_tokens TO app_user;
-- GRANT USAGE ON SEQUENCE password_reset_tokens_id_seq TO app_user;
