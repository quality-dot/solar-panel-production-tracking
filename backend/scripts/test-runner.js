#!/usr/bin/env node

/**
 * Test Runner Script for Manufacturing API
 * Comprehensive testing and development workflow management
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const config = {
  testTimeout: 30000,
  coverageThreshold: 80,
  testPatterns: [
    '**/__tests__/**/*.test.js',
    '**/*.test.js',
    '**/*.spec.js'
  ],
  ignorePatterns: [
    'node_modules/**',
    'coverage/**',
    'logs/**',
    'scripts/**',
    'migrations/**'
  ]
};

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

// Utility functions
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

// Test functions
async function runUnitTests() {
  logSection('Running Unit Tests');
  
  try {
    await runCommand('npm', ['test', '--', '--testPathPattern=__tests__', '--verbose']);
    log('✅ Unit tests completed successfully', 'green');
  } catch (error) {
    log('❌ Unit tests failed', 'red');
    throw error;
  }
}

async function runIntegrationTests() {
  logSection('Running Integration Tests');
  
  try {
    await runCommand('npm', ['test', '--', '--testPathPattern=integration', '--verbose']);
    log('✅ Integration tests completed successfully', 'green');
  } catch (error) {
    log('❌ Integration tests failed', 'red');
    throw error;
  }
}

async function runAllTests() {
  logSection('Running All Tests');
  
  try {
    await runCommand('npm', ['test', '--', '--verbose']);
    log('✅ All tests completed successfully', 'green');
  } catch (error) {
    log('❌ Tests failed', 'red');
    throw error;
  }
}

async function runTestsWithCoverage() {
  logSection('Running Tests with Coverage');
  
  try {
    await runCommand('npm', ['test', '--', '--coverage', '--verbose']);
    log('✅ Coverage report generated successfully', 'green');
  } catch (error) {
    log('❌ Coverage test failed', 'red');
    throw error;
  }
}

async function runSpecificTest(testPath) {
  logSection(`Running Specific Test: ${testPath}`);
  
  try {
    await runCommand('npm', ['test', '--', testPath, '--verbose']);
    log('✅ Specific test completed successfully', 'green');
  } catch (error) {
    log('❌ Specific test failed', 'red');
    throw error;
  }
}

async function runTestsInWatchMode() {
  logSection('Running Tests in Watch Mode');
  
  try {
    await runCommand('npm', ['test', '--', '--watch', '--verbose']);
    log('✅ Watch mode started successfully', 'green');
  } catch (error) {
    log('❌ Watch mode failed', 'red');
    throw error;
  }
}

async function runDatabaseTests() {
  logSection('Running Database Tests');
  
  try {
    await runCommand('npm', ['run', 'test-db-pool']);
    log('✅ Database tests completed successfully', 'green');
  } catch (error) {
    log('❌ Database tests failed', 'red');
    throw error;
  }
}

async function runAPITests() {
  logSection('Running API Tests');
  
  try {
    await runCommand('npm', ['run', 'test-api-routes']);
    log('✅ API tests completed successfully', 'green');
  } catch (error) {
    log('❌ API tests failed', 'red');
    throw error;
  }
}

async function runValidationTests() {
  logSection('Running Validation Tests');
  
  try {
    await runCommand('npm', ['run', 'test-validation']);
    log('✅ Validation tests completed successfully', 'green');
  } catch (error) {
    log('❌ Validation tests failed', 'red');
    throw error;
  }
}

async function runWorkflowTests() {
  logSection('Running Workflow Tests');
  
  try {
    await runCommand('npm', ['run', 'test-workflow-engine']);
    log('✅ Workflow tests completed successfully', 'green');
  } catch (error) {
    log('❌ Workflow tests failed', 'red');
    throw error;
  }
}

async function runResponseUtilsTests() {
  logSection('Running Response Utils Tests');
  
  try {
    await runCommand('npm', ['run', 'test-response-utils']);
    log('✅ Response utils tests completed successfully', 'green');
  } catch (error) {
    log('❌ Response utils tests failed', 'red');
    throw error;
  }
}

async function runBarcodeScannerTests() {
  logSection('Running Barcode Scanner Tests');
  
  try {
    await runCommand('npm', ['run', 'test-barcode-scanning']);
    log('✅ Barcode scanner tests completed successfully', 'green');
  } catch (error) {
    log('❌ Barcode scanner tests failed', 'red');
    throw error;
  }
}

async function runLoadTests() {
  logSection('Running Load Tests');
  
  try {
    await runCommand('npm', ['run', 'load-test']);
    log('✅ Load tests completed successfully', 'green');
  } catch (error) {
    log('❌ Load tests failed', 'red');
    throw error;
  }
}

async function runStressTests() {
  logSection('Running Stress Tests');
  
  try {
    await runCommand('npm', ['run', 'load-test-stress']);
    log('✅ Stress tests completed successfully', 'green');
  } catch (error) {
    log('❌ Stress tests failed', 'red');
    throw error;
  }
}

async function runBenchmarkTests() {
  logSection('Running Benchmark Tests');
  
  try {
    await runCommand('npm', ['run', 'benchmark']);
    log('✅ Benchmark tests completed successfully', 'green');
  } catch (error) {
    log('❌ Benchmark tests failed', 'red');
    throw error;
  }
}

async function runCacheTests() {
  logSection('Running Cache Tests');
  
  try {
    await runCommand('npm', ['run', 'cache-test']);
    log('✅ Cache tests completed successfully', 'green');
  } catch (error) {
    log('❌ Cache tests failed', 'red');
    throw error;
  }
}

async function generateTestReport() {
  logSection('Generating Test Report');
  
  try {
    // Create test report directory
    const reportDir = join(__dirname, '..', 'test-reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    // Run tests with coverage and generate report
    await runCommand('npm', ['test', '--', '--coverage', '--json', '--outputFile', join(reportDir, 'test-results.json')]);
    
    log('✅ Test report generated successfully', 'green');
    log(`📊 Report saved to: ${reportDir}`, 'cyan');
  } catch (error) {
    log('❌ Test report generation failed', 'red');
    throw error;
  }
}

async function runHealthChecks() {
  logSection('Running Health Checks');
  
  try {
    await runCommand('npm', ['run', 'backend:health']);
    log('✅ Health checks completed successfully', 'green');
  } catch (error) {
    log('❌ Health checks failed', 'red');
    throw error;
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  logHeader('Manufacturing API Test Runner');
  
  try {
    switch (command) {
      case 'unit':
        await runUnitTests();
        break;
        
      case 'integration':
        await runIntegrationTests();
        break;
        
      case 'all':
        await runAllTests();
        break;
        
      case 'coverage':
        await runTestsWithCoverage();
        break;
        
      case 'watch':
        await runTestsInWatchMode();
        break;
        
      case 'db':
        await runDatabaseTests();
        break;
        
      case 'api':
        await runAPITests();
        break;
        
      case 'validation':
        await runValidationTests();
        break;
        
      case 'workflow':
        await runWorkflowTests();
        break;
        
      case 'response':
        await runResponseUtilsTests();
        break;
        
      case 'barcode':
        await runBarcodeScannerTests();
        break;
        
      case 'load':
        await runLoadTests();
        break;
        
      case 'stress':
        await runStressTests();
        break;
        
      case 'benchmark':
        await runBenchmarkTests();
        break;
        
      case 'cache':
        await runCacheTests();
        break;
        
      case 'report':
        await generateTestReport();
        break;
        
      case 'health':
        await runHealthChecks();
        break;
        
      case 'specific':
        if (args[1]) {
          await runSpecificTest(args[1]);
        } else {
          log('❌ Please provide a test path for specific test', 'red');
          process.exit(1);
        }
        break;
        
      case 'help':
      default:
        showHelp();
        break;
    }
    
    log('\n🎉 Test execution completed successfully!', 'green');
    
  } catch (error) {
    log(`\n💥 Test execution failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

function showHelp() {
  log('\n📚 Available Commands:', 'bright');
  log('  unit        - Run unit tests only', 'cyan');
  log('  integration - Run integration tests only', 'cyan');
  log('  all         - Run all tests', 'cyan');
  log('  coverage    - Run tests with coverage report', 'cyan');
  log('  watch       - Run tests in watch mode', 'cyan');
  log('  db          - Run database tests', 'cyan');
  log('  api         - Run API route tests', 'cyan');
  log('  validation  - Run validation middleware tests', 'cyan');
  log('  workflow    - Run workflow engine tests', 'cyan');
  log('  response    - Run response utilities tests', 'cyan');
  log('  barcode     - Run barcode scanner tests', 'cyan');
  log('  load        - Run load tests', 'cyan');
  log('  stress      - Run stress tests', 'cyan');
  log('  benchmark   - Run benchmark tests', 'cyan');
  log('  cache       - Run cache tests', 'cyan');
  log('  report      - Generate comprehensive test report', 'cyan');
  log('  health      - Run health check endpoints', 'cyan');
  log('  specific    - Run a specific test file', 'cyan');
  log('  help        - Show this help message', 'cyan');
  
  log('\n📖 Usage Examples:', 'bright');
  log('  node backend/scripts/test-runner.js unit', 'yellow');
  log('  node backend/scripts/test-runner.js coverage', 'yellow');
  log('  node backend/scripts/test-runner.js specific backend/middleware/__tests__/validation.test.js', 'yellow');
  log('  node backend/scripts/test-runner.js watch', 'yellow');
}

// Run the main function
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export {
  runUnitTests,
  runIntegrationTests,
  runAllTests,
  runTestsWithCoverage,
  runSpecificTest,
  runTestsInWatchMode,
  runDatabaseTests,
  runAPITests,
  runValidationTests,
  runWorkflowTests,
  runResponseUtilsTests,
  runBarcodeScannerTests,
  runLoadTests,
  runStressTests,
  runBenchmarkTests,
  runCacheTests,
  generateTestReport,
  runHealthChecks
};
