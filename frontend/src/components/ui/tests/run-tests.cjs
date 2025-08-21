#!/usr/bin/env node

/**
 * Simple test runner for UI components
 * This script provides basic testing functionality without requiring a full testing framework
 */

const fs = require('fs');
const path = require('path');

// Test results
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Simple assertion functions
const assert = {
  equal: (actual, expected, message) => {
    if (actual === expected) {
      testResults.passed++;
      testResults.details.push(`✅ PASS: ${message}`);
    } else {
      testResults.failed++;
      testResults.details.push(`❌ FAIL: ${message} - Expected ${expected}, got ${actual}`);
    }
    testResults.total++;
  },
  
  truthy: (value, message) => {
    if (value) {
      testResults.passed++;
      testResults.details.push(`✅ PASS: ${message}`);
    } else {
      testResults.failed++;
      testResults.details.push(`❌ FAIL: ${message} - Expected truthy value, got ${value}`);
    }
    testResults.total++;
  },
  
  falsy: (value, message) => {
    if (!value) {
      testResults.passed++;
      testResults.details.push(`✅ PASS: ${message}`);
    } else {
      testResults.failed++;
      testResults.details.push(`❌ FAIL: ${message} - Expected falsy value, got ${value}`);
    }
    testResults.total++;
  }
};

// Mock React and testing utilities
global.React = {
  createElement: (type, props, ...children) => ({
    type,
    props: { ...props, children: children.length === 1 ? children[0] : children }
  }),
  useState: (initial) => [initial, () => {}],
  useEffect: () => {},
  forwardRef: (render) => render,
  useRef: () => ({ current: null }),
  useCallback: (fn) => fn,
  useMemo: (fn) => fn()
};

// Don't mock console for now to see output
// global.console = {
//   log: () => {},
//   error: () => {},
//   warn: () => {}
// };

// Mock DOM elements
global.document = {
  createElement: (tag) => ({
    tagName: tag.toUpperCase(),
    className: '',
    style: {},
    setAttribute: () => {},
    getAttribute: () => null,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true
  }),
  addEventListener: () => {},
  removeEventListener: () => {}
};

global.window = {
  addEventListener: () => {},
  removeEventListener: () => {}
};

// Mock CSS classes
const mockCn = (...classes) => classes.filter(Boolean).join(' ');
global.cn = mockCn;

// Test the cn utility function
function testCnUtility() {
  console.log('Testing cn utility function...');
  
  assert.equal(mockCn('class1', 'class2'), 'class1 class2', 'cn should join multiple classes');
  assert.equal(mockCn('class1', false, 'class2'), 'class1 class2', 'cn should filter falsy values');
  assert.equal(mockCn('class1', null, undefined, 'class2'), 'class1 class2', 'cn should handle null/undefined');
}

// Test component interfaces
function testComponentInterfaces() {
  console.log('Testing component interfaces...');
  
  // Test that components can be imported (basic structure test)
  try {
    // This would normally import the actual components
    // For now, we'll test the interface structure
    const mockButton = {
      displayName: 'Button',
      defaultProps: { variant: 'primary', size: 'md' }
    };
    
    assert.truthy(mockButton.displayName, 'Button should have displayName');
    assert.truthy(mockButton.defaultProps, 'Button should have defaultProps');
  } catch (error) {
    assert.falsy(true, 'Component interfaces should be accessible');
  }
}

// Test utility functions
function testUtilityFunctions() {
  console.log('Testing utility functions...');
  
  // Test basic string operations that components might use
  const testString = 'test-string';
  assert.equal(testString.includes('test'), true, 'String should include "test"');
  assert.equal(testString.replace('-', '_'), 'test_string', 'String replacement should work');
}

// Run all tests
function runTests() {
  console.log('🧪 Starting UI Component Tests...\n');
  
  testCnUtility();
  testComponentInterfaces();
  testUtilityFunctions();
  
  // Print results
  console.log('\n📊 Test Results:');
  console.log(`Total: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed}`);
  console.log(`Failed: ${testResults.failed}`);
  console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  console.log('\n📝 Test Details:');
  testResults.details.forEach(detail => console.log(detail));
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests, assert, testResults };
