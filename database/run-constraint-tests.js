#!/usr/bin/env node

/**
 * Constraint Validation Testing Script - Subtask 13.26
 * Test all existing constraints with real data scenarios
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuration
const config = require('./config.js');
const TEST_RESULTS_FILE = 'constraint-test-results.json';

// Test results storage
let testResults = {
  timestamp: new Date().toISOString(),
  subtask: '13.26',
  title: 'Constraint Validation and Testing',
  overallStatus: 'IN_PROGRESS',
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

async function connectToDatabase() {
  const client = new Client(config.development);
  try {
    await client.connect();
    log('Connected to database successfully');
    return client;
  } catch (error) {
    log(`Database connection failed: ${error.message}`, 'ERROR');
    throw error;
  }
}

async function runConstraintTests() {
  log('Starting Constraint Validation Testing - Subtask 13.26', 'START');
  
  let client;
  try {
    // Connect to database
    client = await connectToDatabase();
    
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
    log('Processing test results...');
    processTestResults(allTestsResult.rows);
    
    // Run individual test categories for detailed analysis
    log('Running detailed test categories...');
    await runDetailedTests(client);
    
    // Calculate overall summary
    calculateOverallSummary();
    
    // Save results
    saveResults();
    
    // Print summary
    printSummary();
    
    log('Constraint validation testing completed!', 'COMPLETE');
    
    // Exit with appropriate code
    process.exit(testResults.overallStatus === 'PASS' ? 0 : 1);
    
  } catch (error) {
    log(`Constraint testing failed: ${error.message}`, 'ERROR');
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

function processTestResults(rows) {
  log(`Processing ${rows.length} test results...`);
  
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
    throw error;
  }
}

function calculateOverallSummary() {
  const totalTests = testResults.summary.totalTests;
  const passedTests = testResults.summary.passedTests;
  const failedTests = testResults.summary.failedTests;
  
  testResults.summary.successRate = calculateSuccessRate(passedTests, totalTests);
  
  // Determine overall status
  if (failedTests === 0) {
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
  
  log('=== DETAILED RESULTS ===', 'DETAILS');
  testResults.detailedResults.forEach((result, index) => {
    const status = result.testResult === 'PASS' ? 'PASS' : 'FAIL';
    log(`${index + 1}. ${result.testName}: ${result.testResult}`, status);
  });
}

// Run tests if this script is executed directly
if (require.main === module) {
  runConstraintTests().catch(console.error);
}

module.exports = {
  runConstraintTests,
  testResults
};
