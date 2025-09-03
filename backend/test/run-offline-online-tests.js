// Offline/Online Transition Test Runner
// Task 10.6 - Offline/Online Transition Testing

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Manufacturing Order - Offline/Online Transition Test Runner');
console.log('============================================================');

// Check if test file exists
const testFile = path.join(__dirname, 'test-offline-online-transition.js');
if (!fs.existsSync(testFile)) {
  console.log('❌ Offline/online transition test file not found:', testFile);
  process.exit(1);
}

console.log('✅ Offline/online transition test file found');

// Check if offline storage directory exists or can be created
const offlineDir = path.join(__dirname, '..', 'offline-storage');
if (!fs.existsSync(offlineDir)) {
  try {
    fs.mkdirSync(offlineDir, { recursive: true });
    console.log('✅ Offline storage directory created');
  } catch (error) {
    console.log('❌ Failed to create offline storage directory:', error.message);
  }
} else {
  console.log('✅ Offline storage directory exists');
}

// Check if all required services exist for offline operations
const requiredServices = [
  'manufacturingOrderService.js',
  'moProgressTrackingService.js',
  'moAlertService.js',
  'moClosureService.js',
  'historicalDataService.js',
  'fbPanelReportingService.js',
  'productionMetricsService.js',
  'exportService.js',
  'dataRetentionService.js',
  'searchFilterService.js'
];

console.log('📋 Checking required services for offline operations...');
requiredServices.forEach(service => {
  const servicePath = path.join(__dirname, '..', 'services', service);
  if (fs.existsSync(servicePath)) {
    console.log(`✅ ${service} - Found`);
  } else {
    console.log(`❌ ${service} - Missing`);
  }
});

// Check if all required controllers exist
const requiredControllers = [
  'manufacturing-orders/index.js',
  'mo-progress/index.js',
  'mo-closure/index.js',
  'historical-data/index.js'
];

console.log('📋 Checking required controllers for offline operations...');
requiredControllers.forEach(controller => {
  const controllerPath = path.join(__dirname, '..', 'controllers', controller);
  if (fs.existsSync(controllerPath)) {
    console.log(`✅ ${controller} - Found`);
  } else {
    console.log(`❌ ${controller} - Missing`);
  }
});

// Check if all required routes exist
const requiredRoutes = [
  'manufacturing-orders.js',
  'mo-progress.js',
  'mo-closure.js',
  'historical-data.js'
];

console.log('📋 Checking required routes for offline operations...');
requiredRoutes.forEach(route => {
  const routePath = path.join(__dirname, '..', 'routes', route);
  if (fs.existsSync(routePath)) {
    console.log(`✅ ${route} - Found`);
  } else {
    console.log(`❌ ${route} - Missing`);
  }
});

// Check if database configuration exists
const dbConfigPath = path.join(__dirname, '..', 'config', 'database.js');
if (fs.existsSync(dbConfigPath)) {
  console.log('✅ Database configuration found');
} else {
  console.log('❌ Database configuration missing');
}

// Check if logger configuration exists
const loggerPath = path.join(__dirname, '..', 'middleware', 'logger.js');
if (fs.existsSync(loggerPath)) {
  console.log('✅ Logger configuration found');
} else {
  console.log('❌ Logger configuration missing');
}

console.log('\n🚀 Running Offline/Online Transition Tests...');
console.log('============================================');

try {
  // Run the offline/online transition tests
  execSync(`node ${testFile}`, { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('\n✅ All offline/online transition tests completed successfully!');
  console.log('🎯 Manufacturing Order Management System offline/online capabilities validated!');
  console.log('🚀 Ready for production deployment with offline support!');
  
} catch (error) {
  console.log('\n❌ Offline/online transition tests failed:', error.message);
  console.log('🔧 Please check the test output above for details');
  process.exit(1);
}
