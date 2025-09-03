// End-to-End Workflow Test Runner
// Task 10.5 - End-to-End Workflow Testing

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Manufacturing Order - End-to-End Workflow Test Runner');
console.log('=======================================================');

// Check if test file exists
const testFile = path.join(__dirname, 'test-mo-end-to-end-workflow.js');
if (!fs.existsSync(testFile)) {
  console.log('❌ End-to-end test file not found:', testFile);
  process.exit(1);
}

console.log('✅ End-to-end test file found');

// Check if all required services exist
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

console.log('📋 Checking required services...');
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

console.log('📋 Checking required controllers...');
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

console.log('📋 Checking required routes...');
requiredRoutes.forEach(route => {
  const routePath = path.join(__dirname, '..', 'routes', route);
  if (fs.existsSync(routePath)) {
    console.log(`✅ ${route} - Found`);
  } else {
    console.log(`❌ ${route} - Missing`);
  }
});

console.log('\n🚀 Running End-to-End Workflow Tests...');
console.log('========================================');

try {
  // Run the end-to-end tests
  execSync(`node ${testFile}`, { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('\n✅ All end-to-end workflow tests completed successfully!');
  console.log('🎯 Manufacturing Order Management System is fully validated!');
  console.log('🚀 Ready for production deployment!');
  
} catch (error) {
  console.log('\n❌ End-to-end workflow tests failed:', error.message);
  console.log('🔧 Please check the test output above for details');
  process.exit(1);
}
