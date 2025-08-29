#!/usr/bin/env node

/**
 * Development Workflow Script
 * Streamlined development workflow for manufacturing API
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(title) {
  log('\n' + '='.repeat(60), 'cyan');
  log(` ${title}`, 'bright');
  log('='.repeat(60), 'cyan');
}

function logSection(title) {
  log('\n' + '-'.repeat(40), 'blue');
  log(` ${title}`, 'blue');
  log('-'.repeat(40), 'blue');
}

function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

// Development workflow functions
async function startDevelopment() {
  logSection('Starting Development Environment');
  
  try {
    // Check if database is running
    log('🔍 Checking database connection...', 'yellow');
    await runCommand('npm', ['run', 'test-db-pool']);
    
    // Start development server
    log('🚀 Starting development server...', 'yellow');
    await runCommand('npm', ['run', 'dev']);
    
  } catch (error) {
    log('❌ Failed to start development environment', 'red');
    log(`Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

async function runFullTestSuite() {
  logSection('Running Full Test Suite');
  
  try {
    // Run all tests with coverage
    log('🧪 Running tests with coverage...', 'yellow');
    await runCommand('npm', ['test', '--', '--coverage', '--verbose']);
    
    // Generate test report
    log('📊 Generating test report...', 'yellow');
    await runCommand('node', ['backend/scripts/test-runner.js', 'report']);
    
    log('✅ Full test suite completed successfully', 'green');
    
  } catch (error) {
    log('❌ Test suite failed', 'red');
    log(`Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

async function runQuickTests() {
  logSection('Running Quick Tests');
  
  try {
    // Run core tests only
    log('🧪 Running core tests...', 'yellow');
    await runCommand('npm', ['test', '--', '--testPathPattern=__tests__', '--verbose']);
    
    log('✅ Quick tests completed successfully', 'green');
    
  } catch (error) {
    log('❌ Quick tests failed', 'red');
    log(`Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

async function runDatabaseTests() {
  logSection('Running Database Tests');
  
  try {
    // Test database connection pool
    log('🗄️ Testing database connection pool...', 'yellow');
    await runCommand('npm', ['run', 'test-db-pool']);
    
    // Test API routes
    log('🔗 Testing API routes...', 'yellow');
    await runCommand('npm', ['run', 'test-api-routes']);
    
    log('✅ Database tests completed successfully', 'green');
    
  } catch (error) {
    log('❌ Database tests failed', 'red');
    log(`Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

async function runValidationTests() {
  logSection('Running Validation Tests');
  
  try {
    // Test validation middleware
    log('✅ Testing validation middleware...', 'yellow');
    await runCommand('npm', ['run', 'test-validation']);
    
    // Test response utilities
    log('📤 Testing response utilities...', 'yellow');
    await runCommand('npm', ['run', 'test-response-utils']);
    
    log('✅ Validation tests completed successfully', 'green');
    
  } catch (error) {
    log('❌ Validation tests failed', 'red');
    log(`Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

async function runWorkflowTests() {
  logSection('Running Workflow Tests');
  
  try {
    // Test workflow engine
    log('⚙️ Testing workflow engine...', 'yellow');
    await runCommand('npm', ['run', 'test-workflow-engine']);
    
    // Test barcode scanning
    log('📱 Testing barcode scanning...', 'yellow');
    await runCommand('npm', ['run', 'test-barcode-scanning']);
    
    log('✅ Workflow tests completed successfully', 'green');
    
  } catch (error) {
    log('❌ Workflow tests failed', 'red');
    log(`Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

async function runLoadTests() {
  logSection('Running Load Tests');
  
  try {
    // Run basic load test
    log('📈 Running basic load test...', 'yellow');
    await runCommand('npm', ['run', 'load-test']);
    
    // Run stress test
    log('🔥 Running stress test...', 'yellow');
    await runCommand('npm', ['run', 'load-test-stress']);
    
    log('✅ Load tests completed successfully', 'green');
    
  } catch (error) {
    log('❌ Load tests failed', 'red');
    log(`Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

async function runHealthChecks() {
  logSection('Running Health Checks');
  
  try {
    // Run health check endpoints
    log('🏥 Running health check endpoints...', 'yellow');
    await runCommand('npm', ['run', 'backend:health']);
    
    log('✅ Health checks completed successfully', 'green');
    
  } catch (error) {
    log('❌ Health checks failed', 'red');
    log(`Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

async function generateTestData() {
  logSection('Generating Test Data');
  
  try {
    // Generate test barcodes
    log('🏷️ Generating test barcodes...', 'yellow');
    await runCommand('npm', ['run', 'gen-test-data']);
    
    // Generate test dataset
    log('📊 Generating test dataset...', 'yellow');
    await runCommand('npm', ['run', 'backend:test-data']);
    
    log('✅ Test data generated successfully', 'green');
    
  } catch (error) {
    log('❌ Test data generation failed', 'red');
    log(`Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

async function runBenchmarks() {
  logSection('Running Benchmarks');
  
  try {
    // Run benchmark tests
    log('⚡ Running benchmark tests...', 'yellow');
    await runCommand('npm', ['run', 'benchmark']);
    
    // Run cache tests
    log('💾 Running cache tests...', 'yellow');
    await runCommand('npm', ['run', 'cache-test']);
    
    log('✅ Benchmarks completed successfully', 'green');
    
  } catch (error) {
    log('❌ Benchmarks failed', 'red');
    log(`Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

async function setupDevelopment() {
  logSection('Setting Up Development Environment');
  
  try {
    // Install dependencies
    log('📦 Installing dependencies...', 'yellow');
    await runCommand('npm', ['install']);
    
    // Setup database
    log('🗄️ Setting up database...', 'yellow');
    await runCommand('npm', ['run', 'db:init']);
    
    // Run migrations
    log('🔄 Running database migrations...', 'yellow');
    await runCommand('npm', ['run', 'db:migrate']);
    
    log('✅ Development environment setup completed', 'green');
    
  } catch (error) {
    log('❌ Development environment setup failed', 'red');
    log(`Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

async function cleanupDevelopment() {
  logSection('Cleaning Up Development Environment');
  
  try {
    // Clean test reports
    log('🧹 Cleaning test reports...', 'yellow');
    const testReportsDir = join(__dirname, '..', 'test-reports');
    if (fs.existsSync(testReportsDir)) {
      fs.rmSync(testReportsDir, { recursive: true, force: true });
    }
    
    // Clean coverage
    log('🧹 Cleaning coverage reports...', 'yellow');
    const coverageDir = join(__dirname, '..', 'coverage');
    if (fs.existsSync(coverageDir)) {
      fs.rmSync(coverageDir, { recursive: true, force: true });
    }
    
    // Clean logs
    log('🧹 Cleaning log files...', 'yellow');
    const logsDir = join(__dirname, '..', 'logs');
    if (fs.existsSync(logsDir)) {
      const logFiles = fs.readdirSync(logsDir).filter(file => file.endsWith('.log'));
      logFiles.forEach(file => {
        fs.unlinkSync(join(logsDir, file));
      });
    }
    
    log('✅ Development environment cleanup completed', 'green');
    
  } catch (error) {
    log('❌ Development environment cleanup failed', 'red');
    log(`Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

async function showDevelopmentStatus() {
  logSection('Development Environment Status');
  
  try {
    // Check package.json
    log('📦 Package.json status...', 'yellow');
    const packagePath = join(__dirname, '..', '..', 'package.json');
    if (fs.existsSync(packagePath)) {
      const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      log(`   Project: ${packageData.name}`, 'cyan');
      log(`   Version: ${packageData.version}`, 'cyan');
      log(`   Scripts: ${Object.keys(packageData.scripts).length} available`, 'cyan');
    }
    
    // Check database connection
    log('🗄️ Database connection...', 'yellow');
    try {
      await runCommand('npm', ['run', 'test-db-pool']);
      log('   ✅ Database connection successful', 'green');
    } catch (error) {
      log('   ❌ Database connection failed', 'red');
    }
    
    // Check test files
    log('🧪 Test files...', 'yellow');
    const testDir = join(__dirname, '..', '__tests__');
    if (fs.existsSync(testDir)) {
      const testFiles = fs.readdirSync(testDir, { recursive: true }).filter(file => file.endsWith('.test.js'));
      log(`   Found ${testFiles.length} test files`, 'cyan');
    }
    
    // Check configuration files
    log('⚙️ Configuration files...', 'yellow');
    const configDir = join(__dirname, '..', 'config');
    if (fs.existsSync(configDir)) {
      const configFiles = fs.readdirSync(configDir).filter(file => file.endsWith('.js'));
      log(`   Found ${configFiles.length} configuration files`, 'cyan');
    }
    
    log('✅ Status check completed', 'green');
    
  } catch (error) {
    log('❌ Status check failed', 'red');
    log(`Error: ${error.message}`, 'red');
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  logHeader('Manufacturing API Development Workflow');
  
  try {
    switch (command) {
      case 'start':
        await startDevelopment();
        break;
        
      case 'test':
        await runFullTestSuite();
        break;
        
      case 'test:quick':
        await runQuickTests();
        break;
        
      case 'test:db':
        await runDatabaseTests();
        break;
        
      case 'test:validation':
        await runValidationTests();
        break;
        
      case 'test:workflow':
        await runWorkflowTests();
        break;
        
      case 'test:load':
        await runLoadTests();
        break;
        
      case 'test:benchmark':
        await runBenchmarks();
        break;
        
      case 'health':
        await runHealthChecks();
        break;
        
      case 'data':
        await generateTestData();
        break;
        
      case 'setup':
        await setupDevelopment();
        break;
        
      case 'cleanup':
        await cleanupDevelopment();
        break;
        
      case 'status':
        await showDevelopmentStatus();
        break;
        
      case 'help':
      default:
        showHelp();
        break;
    }
    
    log('\n🎉 Development workflow completed successfully!', 'green');
    
  } catch (error) {
    log(`\n💥 Development workflow failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

function showHelp() {
  log('\n📚 Available Commands:', 'bright');
  log('  start           - Start development environment', 'cyan');
  log('  test            - Run full test suite with coverage', 'cyan');
  log('  test:quick      - Run quick core tests only', 'cyan');
  log('  test:db         - Run database and API tests', 'cyan');
  log('  test:validation - Run validation and response tests', 'cyan');
  log('  test:workflow   - Run workflow and barcode tests', 'cyan');
  log('  test:load       - Run load and stress tests', 'cyan');
  log('  test:benchmark  - Run benchmark and cache tests', 'cyan');
  log('  health          - Run health check endpoints', 'cyan');
  log('  data            - Generate test data and datasets', 'cyan');
  log('  setup           - Setup development environment', 'cyan');
  log('  cleanup         - Clean up development artifacts', 'cyan');
  log('  status          - Show development environment status', 'cyan');
  log('  help            - Show this help message', 'cyan');
  
  log('\n📖 Usage Examples:', 'bright');
  log('  node backend/scripts/dev-workflow.js start', 'yellow');
  log('  node backend/scripts/dev-workflow.js test', 'yellow');
  log('  node backend/scripts/dev-workflow.js test:quick', 'yellow');
  log('  node backend/scripts/dev-workflow.js status', 'yellow');
}

// Run the main function
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export {
  startDevelopment,
  runFullTestSuite,
  runQuickTests,
  runDatabaseTests,
  runValidationTests,
  runWorkflowTests,
  runLoadTests,
  runBenchmarks,
  runHealthChecks,
  generateTestData,
  setupDevelopment,
  cleanupDevelopment,
  showDevelopmentStatus
};
