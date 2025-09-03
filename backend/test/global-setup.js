// Global Setup for Historical Data System Tests
// Task 10.4.8 - Create Comprehensive Testing Suite

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function globalSetup() {
  console.log('🌍 Global Test Setup - Historical Data System');
  
  // Create test directories
  const testDirs = [
    path.join(__dirname, '..', 'exports'),
    path.join(__dirname, '..', 'archives'),
    path.join(__dirname, '..', 'logs'),
    path.join(__dirname, '..', 'coverage')
  ];
  
  testDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created test directory: ${dir}`);
    }
  });
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.TEST_MODE = 'true';
  process.env.DB_NAME = 'solar_panel_tracking_test';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
  
  // Create test configuration
  const testConfig = {
    testEnvironment: 'test',
    database: {
      host: 'localhost',
      port: 5432,
      name: 'solar_panel_tracking_test',
      user: 'postgres',
      password: 'test'
    },
    jwt: {
      secret: 'test-jwt-secret-key-for-testing-only',
      expiresIn: '1h'
    },
    export: {
      directory: path.join(__dirname, '..', 'exports'),
      maxFileSize: '100MB'
    },
    archive: {
      directory: path.join(__dirname, '..', 'archives'),
      retentionDays: 7
    }
  };
  
  // Write test config file
  const configPath = path.join(__dirname, '..', 'test-config.json');
  fs.writeFileSync(configPath, JSON.stringify(testConfig, null, 2));
  
  console.log('✅ Global test setup complete');
  console.log('📊 Test configuration created');
  console.log('📁 Test directories ready');
  console.log('🔧 Environment variables set');
}
