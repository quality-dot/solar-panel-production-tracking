// Task 10 - Comprehensive Validation Test Runner
// Complete Manufacturing Order Management System Validation

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Task 10 - Comprehensive Validation Test Runner');
console.log('===============================================');

// Check if test file exists
const testFile = path.join(__dirname, 'test-task-10-comprehensive-validation.js');
if (!fs.existsSync(testFile)) {
  console.log('❌ Comprehensive validation test file not found:', testFile);
  process.exit(1);
}

console.log('✅ Comprehensive validation test file found');

// Check Task 10 component completeness
const task10Components = [
  {
    task: '10.1',
    name: 'MO Creation and BOM Verification',
    services: ['manufacturingOrderService.js'],
    controllers: ['manufacturing-orders/index.js'],
    routes: ['manufacturing-orders.js'],
    migrations: ['004_create_manufacturing_orders_table.sql'],
    tests: ['test-manufacturing-orders.js']
  },
  {
    task: '10.2',
    name: 'Progress Tracking and Alert System',
    services: ['moProgressTrackingService.js', 'moAlertService.js'],
    controllers: ['mo-progress/index.js'],
    routes: ['mo-progress.js'],
    migrations: ['016_create_mo_alerts_table.sql'],
    tests: ['test-mo-progress-tracking.js']
  },
  {
    task: '10.3',
    name: 'Automatic MO Closure Logic',
    services: ['moClosureService.js'],
    controllers: ['mo-closure/index.js'],
    routes: ['mo-closure.js'],
    migrations: ['017_create_mo_closure_audit_table.sql'],
    tests: ['test-mo-closure.js']
  },
  {
    task: '10.4',
    name: 'Historical Data and Reporting Interface',
    services: [
      'historicalDataService.js',
      'fbPanelReportingService.js',
      'productionMetricsService.js',
      'exportService.js',
      'dataRetentionService.js',
      'searchFilterService.js'
    ],
    controllers: ['historical-data/index.js'],
    routes: ['historical-data.js'],
    migrations: [],
    tests: ['test-historical-data-system.js']
  },
  {
    task: '10.5',
    name: 'End-to-End Workflow Testing',
    services: [],
    controllers: [],
    routes: [],
    migrations: [],
    tests: ['test-mo-end-to-end-simple.js', 'test-mo-end-to-end-workflow.js']
  },
  {
    task: '10.6',
    name: 'Offline/Online Transition Testing',
    services: ['offlineDataService.js'],
    controllers: [],
    routes: [],
    migrations: [],
    tests: ['test-offline-online-transition.js']
  },
  {
    task: '10.7',
    name: 'Performance and Load Testing',
    services: ['performanceMonitoringService.js'],
    controllers: [],
    routes: [],
    migrations: [],
    tests: ['test-performance-load-testing.js']
  },
  {
    task: '10.8',
    name: 'User Acceptance Testing',
    services: [],
    controllers: [],
    routes: [],
    migrations: [],
    tests: ['test-user-acceptance-testing.js']
  },
  {
    task: '10.9',
    name: 'Compliance and Security Validation',
    services: [],
    controllers: [],
    routes: [],
    migrations: [],
    tests: ['test-compliance-security-validation.js']
  }
];

console.log('📋 Checking Task 10 Component Completeness...');
task10Components.forEach(task => {
  console.log(`\n🔍 Task ${task.task} - ${task.name}:`);
  
  // Check services
  if (task.services.length > 0) {
    console.log('  📦 Services:');
    task.services.forEach(service => {
      const servicePath = path.join(__dirname, '..', 'services', service);
      if (fs.existsSync(servicePath)) {
        console.log(`    ✅ ${service} - Found`);
      } else {
        console.log(`    ❌ ${service} - Missing`);
      }
    });
  }
  
  // Check controllers
  if (task.controllers.length > 0) {
    console.log('  🎮 Controllers:');
    task.controllers.forEach(controller => {
      const controllerPath = path.join(__dirname, '..', 'controllers', controller);
      if (fs.existsSync(controllerPath)) {
        console.log(`    ✅ ${controller} - Found`);
      } else {
        console.log(`    ❌ ${controller} - Missing`);
      }
    });
  }
  
  // Check routes
  if (task.routes.length > 0) {
    console.log('  🛣️  Routes:');
    task.routes.forEach(route => {
      const routePath = path.join(__dirname, '..', 'routes', route);
      if (fs.existsSync(routePath)) {
        console.log(`    ✅ ${route} - Found`);
      } else {
        console.log(`    ❌ ${route} - Missing`);
      }
    });
  }
  
  // Check migrations
  if (task.migrations.length > 0) {
    console.log('  🗄️  Migrations:');
    task.migrations.forEach(migration => {
      const migrationPath = path.join(__dirname, '..', '..', 'database', 'migrations', migration);
      if (fs.existsSync(migrationPath)) {
        console.log(`    ✅ ${migration} - Found`);
      } else {
        console.log(`    ❌ ${migration} - Missing`);
      }
    });
  }
  
  // Check tests
  if (task.tests.length > 0) {
    console.log('  🧪 Tests:');
    task.tests.forEach(test => {
      const testPath = path.join(__dirname, test);
      if (fs.existsSync(testPath)) {
        console.log(`    ✅ ${test} - Found`);
      } else {
        console.log(`    ❌ ${test} - Missing`);
      }
    });
  }
});

// Check summary documents
const summaryDocuments = [
  'TASK_10_1_MO_CREATION_SUMMARY.md',
  'TASK_10_2_PROGRESS_TRACKING_SUMMARY.md',
  'TASK_10_3_MO_CLOSURE_SUMMARY.md',
  'TASK_10_4_HISTORICAL_DATA_SUMMARY.md',
  'TASK_10_5_END_TO_END_TESTING_SUMMARY.md',
  'TASK_10_6_OFFLINE_ONLINE_TRANSITION_SUMMARY.md',
  'TASK_10_7_PERFORMANCE_LOAD_TESTING_SUMMARY.md',
  'TASK_10_8_USER_ACCEPTANCE_TESTING_SUMMARY.md',
  'TASK_10_9_COMPLIANCE_SECURITY_VALIDATION_SUMMARY.md'
];

console.log('\n📋 Checking Task 10 Summary Documents...');
summaryDocuments.forEach(doc => {
  const docPath = path.join(__dirname, '..', doc);
  if (fs.existsSync(docPath)) {
    console.log(`✅ ${doc} - Found`);
  } else {
    console.log(`❌ ${doc} - Missing`);
  }
});

// Check test runners
const testRunners = [
  'run-end-to-end-tests.js',
  'run-offline-online-tests.js',
  'run-performance-load-tests.js',
  'run-user-acceptance-tests.js',
  'run-compliance-security-tests.js'
];

console.log('\n📋 Checking Task 10 Test Runners...');
testRunners.forEach(runner => {
  const runnerPath = path.join(__dirname, runner);
  if (fs.existsSync(runnerPath)) {
    console.log(`✅ ${runner} - Found`);
  } else {
    console.log(`❌ ${runner} - Missing`);
  }
});

// Check core system files
const coreSystemFiles = [
  'config/database.js',
  'config/index.js',
  'middleware/auth.js',
  'middleware/logger.js',
  'middleware/errorHandler.js',
  'services/eventWebSocket.js'
];

console.log('\n📋 Checking Core System Files...');
coreSystemFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} - Found`);
  } else {
    console.log(`❌ ${file} - Missing`);
  }
});

// Check package.json and dependencies
console.log('\n📋 Checking Package Dependencies...');
const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const requiredDependencies = [
    'express',
    'pg',
    'uuid',
    'csv-stringify',
    'exceljs',
    'pdfmake'
  ];
  
  const requiredDevDependencies = [
    'jest',
    'supertest'
  ];
  
  console.log('  📦 Required Dependencies:');
  requiredDependencies.forEach(dep => {
    if (packageJson.dependencies && packageJson.dependencies[dep]) {
      console.log(`    ✅ ${dep} - Installed`);
    } else {
      console.log(`    ❌ ${dep} - Missing`);
    }
  });
  
  console.log('  🧪 Required Dev Dependencies:');
  requiredDevDependencies.forEach(dep => {
    if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
      console.log(`    ✅ ${dep} - Installed`);
    } else {
      console.log(`    ❌ ${dep} - Missing`);
    }
  });
} else {
  console.log('❌ package.json not found');
}

// Check system readiness for comprehensive validation
function checkSystemReadiness() {
  console.log('\n📊 Checking System Readiness for Comprehensive Validation...');
  
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  console.log('✅ System Resources:', {
    memory_used: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
    memory_total: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
    cpu_user: `${(cpuUsage.user / 1000).toFixed(2)}ms`,
    cpu_system: `${(cpuUsage.system / 1000).toFixed(2)}ms`
  });
  
  // Check if system is ready for comprehensive validation
  const isSystemReady = memUsage.heapUsed < 100 * 1024 * 1024; // Less than 100MB
  
  if (isSystemReady) {
    console.log('✅ System is ready for Comprehensive Task 10 Validation');
  } else {
    console.log('⚠️  System may have high memory usage for comprehensive validation');
  }
  
  return isSystemReady;
}

// Check system readiness
const systemReady = checkSystemReadiness();

console.log('\n🚀 Running Comprehensive Task 10 Validation...');
console.log('============================================');

try {
  // Run the comprehensive validation tests
  execSync(`node ${testFile}`, { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('\n✅ All comprehensive Task 10 validation tests completed successfully!');
  console.log('🎯 Task 10 - Manufacturing Order Management System - COMPREHENSIVELY VALIDATED!');
  console.log('🚀 Ready for production deployment with complete validation assurance!');
  
} catch (error) {
  console.log('\n❌ Comprehensive Task 10 validation tests failed:', error.message);
  console.log('🔧 Please check the test output above for details');
  process.exit(1);
}
