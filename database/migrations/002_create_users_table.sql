-- Migration 002: Create Users Table and Authentication Schema
-- Solar Panel Production Tracking System
-- Created: 2025-01-27

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role user_role_type NOT NULL DEFAULT 'STATION_INSPECTOR',
    
    -- Station assignments for inspectors (JSONB format)
    -- Example: {"line_1": [1, 2], "line_2": [3, 4]} for stations assigned
    station_assignments JSONB DEFAULT '{}',
    
    -- User status and metadata
    is_active BOOLEAN DEFAULT true,
    is_locked BOOLEAN DEFAULT false,
    failed_login_attempts INTEGER DEFAULT 0,
    last_failed_login TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    
    -- Additional user information
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    notes TEXT
);

-- Create indexes for performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_last_login ON users(last_login);

-- Create composite index for active users by role
CREATE INDEX idx_users_active_role ON users(is_active, role) WHERE is_active = true;

-- Create GIN index for station assignments JSONB queries
CREATE INDEX idx_users_station_assignments ON users USING gin(station_assignments);

-- Add constraints
ALTER TABLE users ADD CONSTRAINT check_username_length 
    CHECK (char_length(username) >= 3);

ALTER TABLE users ADD CONSTRAINT check_email_format 
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE users ADD CONSTRAINT check_password_hash_length 
    CHECK (char_length(password_hash) >= 60); -- bcrypt hash length

ALTER TABLE users ADD CONSTRAINT check_failed_attempts_positive 
    CHECK (failed_login_attempts >= 0);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE users IS 'User accounts for the solar panel production tracking system';
COMMENT ON COLUMN users.id IS 'Unique identifier for the user';
COMMENT ON COLUMN users.username IS 'Unique username for login';
COMMENT ON COLUMN users.email IS 'User email address, must be unique';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password';
COMMENT ON COLUMN users.role IS 'User role determining system permissions';
COMMENT ON COLUMN users.station_assignments IS 'JSON object defining which stations the user can access';
COMMENT ON COLUMN users.is_active IS 'Whether the user account is active';
COMMENT ON COLUMN users.is_locked IS 'Whether the account is locked due to failed logins';
COMMENT ON COLUMN users.failed_login_attempts IS 'Number of consecutive failed login attempts';
COMMENT ON COLUMN users.last_failed_login IS 'Timestamp of the last failed login attempt';
