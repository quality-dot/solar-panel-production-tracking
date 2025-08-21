-- Migration XXX: [Brief Description]
-- Solar Panel Production Tracking System
-- Created: [DATE]

-- [Detailed description of what this migration does]

-- Example CREATE TABLE:
/*
CREATE TABLE example_table (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
*/

-- Example CREATE INDEX:
/*
CREATE INDEX idx_example_table_name ON example_table(name);
*/

-- Example ADD COLUMN:
/*
ALTER TABLE existing_table ADD COLUMN new_column VARCHAR(100);
*/

-- Example CREATE CONSTRAINT:
/*
ALTER TABLE example_table ADD CONSTRAINT check_name_length 
    CHECK (char_length(name) >= 3);
*/

-- Example FOREIGN KEY:
/*
ALTER TABLE child_table ADD CONSTRAINT fk_child_parent 
    FOREIGN KEY (parent_id) REFERENCES parent_table(id) 
    ON DELETE CASCADE;
*/

-- Example CREATE TRIGGER:
/*
CREATE TRIGGER update_example_table_updated_at 
    BEFORE UPDATE ON example_table 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
*/

-- Comments for documentation:
/*
COMMENT ON TABLE example_table IS 'Description of the table purpose';
COMMENT ON COLUMN example_table.name IS 'Description of the column';
*/

-- Migration notes:
-- - Always test migrations on a copy of production data first
-- - Consider performance impact of new indexes on large tables  
-- - Document any data transformations or manual steps required
-- - Include rollback instructions if the migration is complex

-- Rollback instructions (for manual rollback if needed):
/*
-- To rollback this migration:
-- DROP TABLE example_table;
-- DROP INDEX idx_example_table_name;
-- ALTER TABLE existing_table DROP COLUMN new_column;
*/
