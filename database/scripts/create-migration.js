#!/usr/bin/env node

/**
 * Migration Creator Script
 * Solar Panel Production Tracking System
 * 
 * Creates a new migration file with proper naming and template.
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MIGRATIONS_DIR = join(__dirname, '../migrations');
const TEMPLATE_PATH = join(MIGRATIONS_DIR, '_migration_template.sql');

function getNextMigrationNumber() {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter(file => file.match(/^\d{3}_.*\.sql$/))
    .sort();
  
  if (files.length === 0) {
    return '001';
  }
  
  const lastFile = files[files.length - 1];
  const lastNumber = parseInt(lastFile.substring(0, 3));
  return String(lastNumber + 1).padStart(3, '0');
}

function formatDate() {
  return new Date().toISOString().split('T')[0];
}

function createMigration(description) {
  if (!description) {
    console.error('❌ Migration description is required');
    console.log('Usage: node create-migration.js "Description of migration"');
    process.exit(1);
  }
  
  // Generate migration filename
  const migrationNumber = getNextMigrationNumber();
  const filename = `${migrationNumber}_${description.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}.sql`;
  const filepath = join(MIGRATIONS_DIR, filename);
  
  // Read template
  let template;
  try {
    template = readFileSync(TEMPLATE_PATH, 'utf8');
  } catch (error) {
    console.error('❌ Could not read migration template:', error.message);
    process.exit(1);
  }
  
  // Replace placeholders
  const content = template
    .replace(/XXX/g, migrationNumber)
    .replace(/\[Brief Description\]/g, description)
    .replace(/\[DATE\]/g, formatDate())
    .replace(/\[Detailed description of what this migration does\]/g, 
             `This migration implements: ${description}`);
  
  // Write new migration file
  try {
    writeFileSync(filepath, content);
    console.log('✅ Created new migration:', filename);
    console.log('📁 Location:', filepath);
    console.log('');
    console.log('Next steps:');
    console.log('1. Edit the migration file to implement your changes');
    console.log('2. Test the migration with: npm run db:migrate');
    console.log('3. Check status with: npm run db:migrate:status');
  } catch (error) {
    console.error('❌ Could not create migration file:', error.message);
    process.exit(1);
  }
}

// CLI interface
const description = process.argv[2];
createMigration(description);
