// Test Runner for Historical Data System
// Task 10.4.8 - Create Comprehensive Testing Suite

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Historical Data System - Test Runner');
console.log('=====================================');

// Check if Jest is installed
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8'));
  const hasJest = packageJson.devDependencies && packageJson.devDependencies.jest;
  
  if (!hasJest) {
    console.log('❌ Jest not found in devDependencies');
    console.log('📦 Installing Jest...');
    execSync('npm install --save-dev jest supertest @jest/globals', { stdio: 'inherit' });
  }
} catch (error) {
  console.log('❌ Error checking dependencies:', error.message);
  process.exit(1);
}

// Check if test files exist
const testFiles = [
  'test-historical-data-system.js',
  'setup.js',
  'global-setup.js',
  'global-teardown.js'
];

console.log('📋 Checking test files...');
testFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} - Found`);
  } else {
    console.log(`❌ ${file} - Missing`);
  }
});

// Check if Jest config exists
const jestConfigPath = path.join(__dirname, '..', 'jest.config.js');
if (fs.existsSync(jestConfigPath)) {
  console.log('✅ jest.config.js - Found');
} else {
  console.log('❌ jest.config.js - Missing');
}

// Check if services exist
const services = [
  'historicalDataService.js',
  'fbPanelReportingService.js',
  'productionMetricsService.js',
  'exportService.js',
  'dataRetentionService.js',
  'searchFilterService.js'
];

console.log('📋 Checking services...');
services.forEach(service => {
  const servicePath = path.join(__dirname, '..', 'services', service);
  if (fs.existsSync(servicePath)) {
    console.log(`✅ ${service} - Found`);
  } else {
    console.log(`❌ ${service} - Missing`);
  }
});

// Check if controllers exist
const controllers = [
  'historical-data/index.js'
];

console.log('📋 Checking controllers...');
controllers.forEach(controller => {
  const controllerPath = path.join(__dirname, '..', 'controllers', controller);
  if (fs.existsSync(controllerPath)) {
    console.log(`✅ ${controller} - Found`);
  } else {
    console.log(`❌ ${controller} - Missing`);
  }
});

// Check if routes exist
const routes = [
  'historical-data.js'
];

console.log('📋 Checking routes...');
routes.forEach(route => {
  const routePath = path.join(__dirname, '..', 'routes', route);
  if (fs.existsSync(routePath)) {
    console.log(`✅ ${route} - Found`);
  } else {
    console.log(`❌ ${route} - Missing`);
  }
});

console.log('\n🚀 Running Historical Data System Tests...');
console.log('==========================================');

try {
  // Run the tests
  execSync('npm run test:historical-data', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..', '..')
  });
  
  console.log('\n✅ All tests completed successfully!');
  console.log('🎯 Historical Data System is ready for production!');
  
} catch (error) {
  console.log('\n❌ Tests failed:', error.message);
  console.log('🔧 Please check the test output above for details');
  process.exit(1);
}
