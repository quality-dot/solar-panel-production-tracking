// Performance and Load Test Runner
// Task 10.7 - Performance and Load Testing

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Manufacturing Order - Performance and Load Test Runner');
console.log('=======================================================');

// Check if test file exists
const testFile = path.join(__dirname, 'test-performance-load-testing.js');
if (!fs.existsSync(testFile)) {
  console.log('❌ Performance and load test file not found:', testFile);
  process.exit(1);
}

console.log('✅ Performance and load test file found');

// Check system resources before running tests
function checkSystemResources() {
  console.log('📊 Checking System Resources...');
  
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  console.log('✅ Memory Usage:', {
    heap_used: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
    heap_total: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
    external: `${(memUsage.external / 1024 / 1024).toFixed(2)}MB`
  });
  
  console.log('✅ CPU Usage:', {
    user: `${(cpuUsage.user / 1000).toFixed(2)}ms`,
    system: `${(cpuUsage.system / 1000).toFixed(2)}ms`
  });
  
  // Check available memory
  const totalMemory = memUsage.heapTotal;
  const usedMemory = memUsage.heapUsed;
  const availableMemory = totalMemory - usedMemory;
  
  console.log('✅ Available Memory:', `${(availableMemory / 1024 / 1024).toFixed(2)}MB`);
  
  if (availableMemory < 50 * 1024 * 1024) { // Less than 50MB
    console.log('⚠️  Warning: Low available memory for performance testing');
  }
}

// Check if all required services exist for performance testing
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

console.log('📋 Checking required services for performance testing...');
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

console.log('📋 Checking required controllers for performance testing...');
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

console.log('📋 Checking required routes for performance testing...');
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

// Check if offline data service exists
const offlineServicePath = path.join(__dirname, '..', 'services', 'offlineDataService.js');
if (fs.existsSync(offlineServicePath)) {
  console.log('✅ Offline data service found');
} else {
  console.log('❌ Offline data service missing');
}

// Check system resources
checkSystemResources();

console.log('\n🚀 Running Performance and Load Tests...');
console.log('======================================');

try {
  // Run the performance and load tests
  execSync(`node ${testFile}`, { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('\n✅ All performance and load tests completed successfully!');
  console.log('🎯 Manufacturing Order Management System performance validated!');
  console.log('🚀 Ready for production deployment with optimal performance!');
  
} catch (error) {
  console.log('\n❌ Performance and load tests failed:', error.message);
  console.log('🔧 Please check the test output above for details');
  process.exit(1);
}
