-- Migration 013: Add Encryption Support
-- Solar Panel Production Tracking System
-- Created: 2025-08-29

-- This migration adds encryption support using pgcrypto extension
-- and modifies tables to support encrypted sensitive fields

-- Enable pgcrypto extension for encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add encrypted fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_encrypted JSONB,
ADD COLUMN IF NOT EXISTS phone_encrypted JSONB,
ADD COLUMN IF NOT EXISTS notes_encrypted JSONB,
ADD COLUMN IF NOT EXISTS encryption_version INTEGER DEFAULT 1;

-- Add encrypted fields to audit_logs table for sensitive data
ALTER TABLE audit_logs 
ADD COLUMN IF NOT EXISTS sensitive_data_encrypted JSONB,
ADD COLUMN IF NOT EXISTS encryption_version INTEGER DEFAULT 1;

-- Add encrypted fields to manufacturing_orders table
ALTER TABLE manufacturing_orders 
ADD COLUMN IF NOT EXISTS customer_info_encrypted JSONB,
ADD COLUMN IF NOT EXISTS special_instructions_encrypted JSONB,
ADD COLUMN IF NOT EXISTS encryption_version INTEGER DEFAULT 1;

-- Add encrypted fields to inspections table
ALTER TABLE inspections 
ADD COLUMN IF NOT EXISTS inspector_notes_encrypted JSONB,
ADD COLUMN IF NOT EXISTS quality_notes_encrypted JSONB,
ADD COLUMN IF NOT EXISTS encryption_version INTEGER DEFAULT 1;

-- Create encryption metadata table
CREATE TABLE IF NOT EXISTS encryption_metadata (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    column_name VARCHAR(100) NOT NULL,
    encryption_algorithm VARCHAR(50) NOT NULL,
    key_version INTEGER NOT NULL,
    encryption_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    
    -- Constraints
    CONSTRAINT unique_table_column UNIQUE(table_name, column_name)
);

-- Create indexes for encrypted fields
CREATE INDEX IF NOT EXISTS idx_users_encryption_version ON users(encryption_version);
CREATE INDEX IF NOT EXISTS idx_audit_logs_encryption_version ON audit_logs(encryption_version);
CREATE INDEX IF NOT EXISTS idx_manufacturing_orders_encryption_version ON manufacturing_orders(encryption_version);
CREATE INDEX IF NOT EXISTS idx_inspections_encryption_version ON inspections(encryption_version);

-- Insert initial encryption metadata
INSERT INTO encryption_metadata (table_name, column_name, encryption_algorithm, key_version) VALUES
('users', 'email_encrypted', 'aes-256-gcm', 1),
('users', 'phone_encrypted', 'aes-256-gcm', 1),
('users', 'notes_encrypted', 'aes-256-gcm', 1),
('audit_logs', 'sensitive_data_encrypted', 'aes-256-gcm', 1),
('manufacturing_orders', 'customer_info_encrypted', 'aes-256-gcm', 1),
('manufacturing_orders', 'special_instructions_encrypted', 'aes-256-gcm', 1),
('inspections', 'inspector_notes_encrypted', 'aes-256-gcm', 1),
('inspections', 'quality_notes_encrypted', 'aes-256-gcm', 1)
ON CONFLICT (table_name, column_name) DO NOTHING;

-- Create function to encrypt data using pgcrypto
CREATE OR REPLACE FUNCTION encrypt_field_value(
    plaintext TEXT,
    encryption_key TEXT,
    algorithm TEXT DEFAULT 'aes'
) RETURNS TEXT AS $$
BEGIN
    -- Use pgcrypto's encrypt function
    RETURN encrypt_iv(
        plaintext::bytea,
        encryption_key::bytea,
        gen_random_bytes(16), -- Generate random IV
        algorithm
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to decrypt data using pgcrypto
CREATE OR REPLACE FUNCTION decrypt_field_value(
    encrypted_data TEXT,
    encryption_key TEXT,
    algorithm TEXT DEFAULT 'aes'
) RETURNS TEXT AS $$
BEGIN
    -- Use pgcrypto's decrypt function
    RETURN decrypt_iv(
        encrypted_data::bytea,
        encryption_key::bytea,
        substring(encrypted_data::bytea from 1 for 16), -- Extract IV from first 16 bytes
        algorithm
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to generate secure random values
CREATE OR REPLACE FUNCTION generate_secure_random(length INTEGER DEFAULT 32) RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(length), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to hash sensitive data
CREATE OR REPLACE FUNCTION hash_field_value(
    data TEXT,
    salt TEXT DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
    use_salt TEXT;
BEGIN
    -- Use provided salt or generate new one
    use_salt := COALESCE(salt, encode(gen_random_bytes(16), 'hex'));
    
    -- Return hash and salt combination
    RETURN crypt(data, use_salt);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to verify hashed data
CREATE OR REPLACE FUNCTION verify_hashed_field(
    data TEXT,
    hash TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    -- Use pgcrypto's crypt function for verification
    RETURN crypt(data, hash) = hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on encryption functions
GRANT EXECUTE ON FUNCTION encrypt_field_value(TEXT, TEXT, TEXT) TO solar_panel_user;
GRANT EXECUTE ON FUNCTION decrypt_field_value(TEXT, TEXT, TEXT) TO solar_panel_user;
GRANT EXECUTE ON FUNCTION generate_secure_random(INTEGER) TO solar_panel_user;
GRANT EXECUTE ON FUNCTION hash_field_value(TEXT, TEXT) TO solar_panel_user;
GRANT EXECUTE ON FUNCTION verify_hashed_field(TEXT, TEXT) TO solar_panel_user;

-- Create view for encryption status
CREATE OR REPLACE VIEW encryption_status AS
SELECT 
    table_name,
    column_name,
    encryption_algorithm,
    key_version,
    encryption_date,
    is_active,
    CASE 
        WHEN is_active THEN 'Active'
        ELSE 'Inactive'
    END as status
FROM encryption_metadata
ORDER BY table_name, column_name;

-- Grant select on encryption status view
GRANT SELECT ON encryption_status TO solar_panel_user;

-- Add comments for documentation
COMMENT ON EXTENSION pgcrypto IS 'Provides cryptographic functions for field-level encryption';
COMMENT ON TABLE encryption_metadata IS 'Tracks encryption configuration for all encrypted fields';
COMMENT ON FUNCTION encrypt_field_value IS 'Encrypts plaintext using pgcrypto with random IV';
COMMENT ON FUNCTION decrypt_field_value IS 'Decrypts data using pgcrypto';
COMMENT ON FUNCTION generate_secure_random IS 'Generates cryptographically secure random values';
COMMENT ON FUNCTION hash_field_value IS 'Hashes sensitive data using pgcrypto crypt function';
COMMENT ON FUNCTION verify_hashed_field IS 'Verifies hashed data against plaintext';
COMMENT ON VIEW encryption_status IS 'Shows current encryption status for all fields';

-- Log migration completion
INSERT INTO audit_logs (
    event_type, 
    event_category, 
    action, 
    description, 
    target_table,
    metadata
) VALUES (
    'MIGRATION_COMPLETED',
    'SYSTEM',
    'CREATE',
    'Migration 013: Added encryption support with pgcrypto extension',
    'encryption_metadata',
    '{"migration_version": "013", "extension": "pgcrypto", "encrypted_fields_added": 8}'
);
