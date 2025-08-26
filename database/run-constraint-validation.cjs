#!/usr/bin/env node

/**
 * Comprehensive Constraint Validation Script - Subtask 13.26
 * Test all existing constraints with real data scenarios
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuration
const config = require('./config.cjs');
const TEST_RESULTS_FILE = 'constraint-validation-results.json';

// Test results storage
let testResults = {
  timestamp: new Date().toISOString(),
  subtask: '13.26',
  title: 'Constraint Validation and Testing',
  overallStatus: 'IN_PROGRESS',
  databaseStatus: 'UNKNOWN',
  testCategories: {
    panelConstraints: { total: 0, passed: 0, failed: 0, successRate: 0 },
    manufacturingOrderConstraints: { total: 0, passed: 0, failed: 0, successRate: 0 },
    inspectionConstraints: { total: 0, passed: 0, failed: 0, successRate: 0 },
    edgeCases: { total: 0, passed: 0, failed: 0, successRate: 0 }
  },
  detailedResults: [],
  summary: {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    successRate: 0
  }
};

// Utility functions
function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}] ${message}`);
}

function calculateSuccessRate(passed, total) {
  return total > 0 ? Math.round((passed / total) * 100) : 0;
}

function updateTestCategory(category, passed, total) {
  testResults.testCategories[category].total = total;
  testResults.testCategories[category].passed = passed;
  testResults.testCategories[category].failed = total - passed;
  testResults.testCategories[category].successRate = calculateSuccessRate(passed, total);
}

async function testDatabaseConnection() {
  log('Testing database connection...');
  
  const connectionConfigs = [
    config.development,
    config.test,
    {
      host: 'localhost',
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: 'password'
    }
  ];
  
  for (const config of connectionConfigs) {
    try {
      const client = new Client(config);
      await client.connect();
      log(`✅ Connected to database: ${config.database}`, 'SUCCESS');
      await client.end();
      return config;
    } catch (error) {
      log(`❌ Failed to connect to ${config.database}: ${error.message}`, 'WARNING');
    }
  }
  
  throw new Error('No database connection available');
}

async function createTestDatabase(client, dbName = 'solar_panel_tracking_test') {
  log(`Creating test database: ${dbName}...`);
  
  try {
    // Try to create the database
    await client.query(`CREATE DATABASE ${dbName}`);
    log(`✅ Test database created: ${dbName}`, 'SUCCESS');
    return dbName;
  } catch (error) {
    if (error.code === '42P04') {
      log(`Database ${dbName} already exists`, 'INFO');
      return dbName;
    } else {
      log(`Failed to create database: ${error.message}`, 'ERROR');
      throw error;
    }
  }
}

async function runMigrations(client) {
  log('Running database migrations...');
  
  const migrationsDir = path.join(__dirname, 'migrations');
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  for (const file of migrationFiles) {
    try {
      log(`Running migration: ${file}`);
      const migrationSQL = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query(migrationSQL);
      log(`✅ Migration completed: ${file}`, 'SUCCESS');
    } catch (error) {
      log(`❌ Migration failed: ${file} - ${error.message}`, 'ERROR');
      // Continue with other migrations
    }
  }
}

async function runConstraintTests(client) {
  log('Running constraint validation tests...');
  
  try {
    // Load constraint testing script
    const constraintTestScript = fs.readFileSync(
      path.join(__dirname, 'scripts/constraint-validation-testing.sql'), 
      'utf8'
    );
    
    log('Loading constraint testing functions...');
    await client.query(constraintTestScript);
    
    // Run all constraint tests
    log('Running comprehensive constraint tests...');
    const allTestsResult = await client.query('SELECT * FROM run_all_constraint_tests()');
    
    // Process results
    log(`Processing ${allTestsResult.rows.length} test results...`);
    processTestResults(allTestsResult.rows);
    
    // Run individual test categories for detailed analysis
    log('Running detailed test categories...');
    await runDetailedTests(client);
    
    return true;
  } catch (error) {
    log(`Constraint testing failed: ${error.message}`, 'ERROR');
    return false;
  }
}

function processTestResults(rows) {
  rows.forEach(row => {
    const testResult = {
      testName: row.test_name || 'Unknown Test',
      constraintName: row.constraint_name || 'Unknown Constraint',
      tableName: row.table_name || 'Unknown Table',
      testType: row.test_type || 'UNKNOWN',
      testResult: row.test_result || 'UNKNOWN',
      expectedResult: row.expected_result || 'UNKNOWN',
      actualResult: row.actual_result || 'N/A',
      errorMessage: row.error_message || null,
      timestamp: row.test_timestamp || new Date().toISOString(),
      notes: row.notes || null
    };
    
    testResults.detailedResults.push(testResult);
    
    // Categorize test results
    if (testResult.testResult === 'PASS') {
      testResults.summary.passedTests++;
    } else {
      testResults.summary.failedTests++;
    }
    testResults.summary.totalTests++;
  });
}

async function runDetailedTests(client) {
  try {
    // Test panel workflow constraints
    log('Testing panel workflow constraints...');
    const panelResults = await client.query('SELECT * FROM test_panel_workflow_constraints()');
    const panelPassed = panelResults.rows.filter(r => r.test_result === 'PASS').length;
    updateTestCategory('panelConstraints', panelPassed, panelResults.rows.length);
    
    // Test manufacturing order constraints
    log('Testing manufacturing order constraints...');
    const moResults = await client.query('SELECT * FROM test_manufacturing_order_constraints()');
    const moPassed = moResults.rows.filter(r => r.test_result === 'PASS').length;
    updateTestCategory('manufacturingOrderConstraints', moPassed, moResults.rows.length);
    
    // Test inspection constraints
    log('Testing inspection constraints...');
    const inspectionResults = await client.query('SELECT * FROM test_inspection_constraints()');
    const inspectionPassed = inspectionResults.rows.filter(r => r.test_result === 'PASS').length;
    updateTestCategory('inspectionConstraints', inspectionPassed, inspectionResults.rows.length);
    
    // Test edge cases
    log('Testing constraint edge cases...');
    const edgeResults = await client.query('SELECT * FROM test_constraint_edge_cases()');
    const edgePassed = edgeResults.rows.filter(r => r.test_result === 'PASS').length;
    updateTestCategory('edgeCases', edgePassed, edgeResults.rows.length);
    
  } catch (error) {
    log(`Detailed testing failed: ${error.message}`, 'ERROR');
    // Continue with summary even if detailed tests fail
  }
}

function calculateOverallSummary() {
  const totalTests = testResults.summary.totalTests;
  const passedTests = testResults.summary.passedTests;
  const failedTests = testResults.summary.failedTests;
  
  testResults.summary.successRate = calculateSuccessRate(passedTests, totalTests);
  
  // Determine overall status
  if (failedTests === 0 && totalTests > 0) {
    testResults.overallStatus = 'PASS';
  } else if (testResults.summary.successRate >= 90) {
    testResults.overallStatus = 'WARNING';
  } else {
    testResults.overallStatus = 'FAIL';
  }
}

function saveResults() {
  fs.writeFileSync(TEST_RESULTS_FILE, JSON.stringify(testResults, null, 2));
  log(`Test results saved to ${TEST_RESULTS_FILE}`);
}

function printSummary() {
  log('=== CONSTRAINT VALIDATION TESTING SUMMARY ===', 'SUMMARY');
  log(`Overall Status: ${testResults.overallStatus}`, 'SUMMARY');
  log(`Database Status: ${testResults.databaseStatus}`, 'SUMMARY');
  log(`Total Tests: ${testResults.summary.totalTests}`, 'SUMMARY');
  log(`Passed: ${testResults.summary.passedTests}`, 'SUMMARY');
  log(`Failed: ${testResults.summary.failedTests}`, 'SUMMARY');
  log(`Success Rate: ${testResults.summary.successRate}%`, 'SUMMARY');
  
  log('=== TEST CATEGORY BREAKDOWN ===', 'DETAILS');
  Object.entries(testResults.testCategories).forEach(([category, stats]) => {
    const categoryName = category.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    log(`${categoryName}: ${stats.passed}/${stats.total} (${stats.successRate}%)`, 
        stats.successRate === 100 ? 'PASS' : stats.successRate >= 90 ? 'WARNING' : 'FAIL');
  });
  
  if (testResults.detailedResults.length > 0) {
    log('=== DETAILED RESULTS ===', 'DETAILS');
    testResults.detailedResults.forEach((result, index) => {
      const status = result.testResult === 'PASS' ? 'PASS' : 'FAIL';
      log(`${index + 1}. ${result.testName}: ${result.testResult}`, status);
    });
  }
}

async function runConstraintValidation() {
  log('Starting Constraint Validation Testing - Subtask 13.26', 'START');
  
  let client;
  try {
    // Test database connection
    const dbConfig = await testDatabaseConnection();
    testResults.databaseStatus = 'CONNECTED';
    
    // Create test database if needed
    const testDbName = await createTestDatabase(client, 'solar_panel_tracking_test');
    
    // Connect to test database
    const testConfig = { ...dbConfig, database: testDbName };
    client = new Client(testConfig);
    await client.connect();
    log(`Connected to test database: ${testDbName}`);
    
    // Run migrations
    await runMigrations(client);
    
    // Run constraint tests
    const testsSuccessful = await runConstraintTests(client);
    
    if (testsSuccessful) {
      // Calculate overall summary
      calculateOverallSummary();
      
      // Save results
      saveResults();
      
      // Print summary
      printSummary();
      
      log('Constraint validation testing completed!', 'COMPLETE');
      
      // Exit with appropriate code
      process.exit(testResults.overallStatus === 'PASS' ? 0 : 1);
    } else {
      log('Constraint testing failed', 'ERROR');
      process.exit(1);
    }
    
  } catch (error) {
    log(`Constraint validation failed: ${error.message}`, 'ERROR');
    testResults.databaseStatus = 'FAILED';
    testResults.overallStatus = 'FAIL';
    saveResults();
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  runConstraintValidation().catch(console.error);
}

module.exports = {
  runConstraintValidation,
  testResults
};
