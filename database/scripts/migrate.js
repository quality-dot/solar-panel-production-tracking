#!/usr/bin/env node

/**
 * Database Migration Runner
 * Solar Panel Production Tracking System
 * 
 * This script runs database migrations in order and tracks their execution.
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Client } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database configuration
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'solar_panel_tracking',
  user: process.env.DB_USER || 'solar_panel_user',
  password: process.env.DB_PASSWORD || 'change_this_password'
};

const MIGRATIONS_DIR = join(__dirname, '../migrations');

class MigrationRunner {
  constructor() {
    this.client = new Client(config);
  }

  async connect() {
    try {
      await this.client.connect();
      console.log('✅ Connected to database:', config.database);
    } catch (error) {
      console.error('❌ Failed to connect to database:', error.message);
      throw error;
    }
  }

  async disconnect() {
    await this.client.end();
    console.log('🔌 Disconnected from database');
  }

  async ensureMigrationTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        checksum VARCHAR(64),
        execution_time_ms INTEGER
      );
    `;
    
    await this.client.query(createTableQuery);
    console.log('📋 Migration tracking table ready');
  }

  async getExecutedMigrations() {
    const result = await this.client.query(
      'SELECT migration_name FROM schema_migrations ORDER BY id'
    );
    return result.rows.map(row => row.migration_name);
  }

  async getMigrationFiles() {
    const files = readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    return files;
  }

  generateChecksum(content) {
    // Simple checksum for migration content validation
    return Buffer.from(content).toString('base64').slice(0, 32);
  }

  async executeMigration(filename) {
    const filePath = join(MIGRATIONS_DIR, filename);
    const content = readFileSync(filePath, 'utf8');
    const checksum = this.generateChecksum(content);
    
    console.log(`🚀 Executing migration: ${filename}`);
    const startTime = Date.now();
    
    try {
      // Begin transaction
      await this.client.query('BEGIN');
      
      // Execute migration content
      await this.client.query(content);
      
      // Record migration execution
      await this.client.query(
        `INSERT INTO schema_migrations (migration_name, checksum, execution_time_ms) 
         VALUES ($1, $2, $3)`,
        [filename, checksum, Date.now() - startTime]
      );
      
      // Commit transaction
      await this.client.query('COMMIT');
      
      console.log(`✅ Migration completed: ${filename} (${Date.now() - startTime}ms)`);
      
    } catch (error) {
      // Rollback on error
      await this.client.query('ROLLBACK');
      console.error(`❌ Migration failed: ${filename}`);
      console.error('Error:', error.message);
      throw error;
    }
  }

  async run() {
    try {
      await this.connect();
      await this.ensureMigrationTable();
      
      const migrationFiles = await this.getMigrationFiles();
      const executedMigrations = await this.getExecutedMigrations();
      
      console.log(`📁 Found ${migrationFiles.length} migration files`);
      console.log(`📊 ${executedMigrations.length} migrations already executed`);
      
      const pendingMigrations = migrationFiles.filter(
        file => !executedMigrations.includes(file)
      );
      
      if (pendingMigrations.length === 0) {
        console.log('🎉 All migrations are up to date!');
        return;
      }
      
      console.log(`⏳ Running ${pendingMigrations.length} pending migrations...`);
      
      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }
      
      console.log('🎉 All migrations completed successfully!');
      
      // Show final status
      await this.showStatus();
      
    } catch (error) {
      console.error('💥 Migration process failed:', error.message);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }

  async showStatus() {
    const result = await this.client.query(`
      SELECT 
        migration_name, 
        executed_at, 
        execution_time_ms 
      FROM schema_migrations 
      ORDER BY id
    `);
    
    console.log('\n📋 Migration Status:');
    console.log('─'.repeat(80));
    
    if (result.rows.length === 0) {
      console.log('No migrations executed yet');
    } else {
      result.rows.forEach(row => {
        const time = row.execution_time_ms ? `(${row.execution_time_ms}ms)` : '';
        console.log(`✅ ${row.migration_name} - ${row.executed_at.toISOString()} ${time}`);
      });
    }
    console.log('─'.repeat(80));
  }

  async rollback(migrationName = null) {
    try {
      await this.connect();
      
      if (migrationName) {
        console.log(`🔄 Rolling back specific migration: ${migrationName}`);
        // This would require rollback scripts - placeholder for now
        console.log('⚠️  Specific rollback not implemented yet. Please rollback manually.');
      } else {
        console.log('🔄 Rolling back last migration...');
        // This would require rollback scripts - placeholder for now
        console.log('⚠️  Rollback not implemented yet. Please rollback manually.');
      }
      
    } catch (error) {
      console.error('💥 Rollback failed:', error.message);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'run';
  
  const runner = new MigrationRunner();
  
  switch (command) {
    case 'run':
      await runner.run();
      break;
    case 'status':
      await runner.connect();
      await runner.ensureMigrationTable();
      await runner.showStatus();
      await runner.disconnect();
      break;
    case 'rollback':
      await runner.rollback(args[1]);
      break;
    default:
      console.log(`
🔧 Database Migration Runner

Usage:
  node migrate.js [command]

Commands:
  run       Run pending migrations (default)
  status    Show migration status
  rollback  Rollback last migration (not implemented)

Environment Variables:
  DB_HOST     Database host (default: localhost)
  DB_PORT     Database port (default: 5432)
  DB_NAME     Database name (default: solar_panel_tracking)
  DB_USER     Database user (default: solar_panel_user)
  DB_PASSWORD Database password (default: change_this_password)
      `);
      break;
  }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}

export default MigrationRunner;
