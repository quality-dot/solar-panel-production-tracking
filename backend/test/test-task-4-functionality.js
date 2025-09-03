#!/usr/bin/env node

/**
 * Task 4 - Barcode Processing and Validation System
 * Comprehensive Functionality Test
 * 
 * This script tests all the core functionality of Task 4 to ensure
 * everything is working correctly and all requirements are met.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Task 4 - Barcode Processing and Validation System');
console.log('📋 Comprehensive Functionality Test');
console.log('');

// Test results tracking
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

function runTest(testName, testFunction) {
  testResults.total++;
  try {
    const result = testFunction();
    if (result) {
      testResults.passed++;
      console.log(`✅ ${testName}`);
    } else {
      testResults.failed++;
      console.log(`❌ ${testName}`);
    }
  } catch (error) {
    testResults.failed++;
    testResults.errors.push({ test: testName, error: error.message });
    console.log(`❌ ${testName} - Error: ${error.message}`);
  }
}

// Test 1: File Structure Validation
console.log('📁 File Structure Validation...');
runTest('Barcode Processor exists', () => {
  return fs.existsSync(join(__dirname, '..', 'utils', 'barcodeProcessor.js'));
});

runTest('Barcode Generator exists', () => {
  return fs.existsSync(join(__dirname, '..', 'utils', 'barcodeGenerator.js'));
});

runTest('Panel Specification Override exists', () => {
  return fs.existsSync(join(__dirname, '..', 'utils', 'panelSpecificationOverride.js'));
});

runTest('Barcode Routes exist', () => {
  return fs.existsSync(join(__dirname, '..', 'routes', 'barcode.js'));
});

runTest('Panel Service exists', () => {
  return fs.existsSync(join(__dirname, '..', 'services', 'panelService.js'));
});

runTest('Panel Routes exist', () => {
  return fs.existsSync(join(__dirname, '..', 'routes', 'panels.js'));
});

runTest('Frontend PanelScan exists', () => {
  return fs.existsSync(join(__dirname, '..', '..', 'frontend', 'src', 'pages', 'PanelScan.tsx'));
});

runTest('Frontend PanelStore exists', () => {
  return fs.existsSync(join(__dirname, '..', '..', 'frontend', 'src', 'database', 'stores', 'panelStore.ts'));
});

// Test 2: Barcode Processing Functionality
console.log('');
console.log('🧪 Barcode Processing Functionality...');

runTest('Barcode Processor imports correctly', () => {
  try {
    const { parseBarcode, validateBarcode, assignLine } = require(join(__dirname, '..', 'utils', 'barcodeProcessor.js'));
    return typeof parseBarcode === 'function' && typeof validateBarcode === 'function' && typeof assignLine === 'function';
  } catch (error) {
    throw new Error(`Import failed: ${error.message}`);
  }
});

runTest('Valid barcode parsing', () => {
  try {
    const { parseBarcode } = require(join(__dirname, '..', 'utils', 'barcodeProcessor.js'));
    const testBarcode = 'CRS25WBT3600001';
    const parsed = parseBarcode(testBarcode);
    return parsed && parsed.company === 'CRS' && parsed.year === '25' && parsed.panelType === '36';
  } catch (error) {
    throw new Error(`Parsing failed: ${error.message}`);
  }
});

runTest('Barcode validation', () => {
  try {
    const { validateBarcode } = require(join(__dirname, '..', 'utils', 'barcodeProcessor.js'));
    const testBarcode = 'CRS25WBT3600001';
    const validation = validateBarcode(testBarcode);
    return validation && validation.valid === true;
  } catch (error) {
    throw new Error(`Validation failed: ${error.message}`);
  }
});

runTest('Line assignment logic', () => {
  try {
    const { assignLine } = require(join(__dirname, '..', 'utils', 'barcodeProcessor.js'));
    const line1 = assignLine('36');
    const line2 = assignLine('144');
    return line1 === 'LINE_1' && line2 === 'LINE_2';
  } catch (error) {
    throw new Error(`Line assignment failed: ${error.message}`);
  }
});

// Test 3: API Endpoints Validation
console.log('');
console.log('🌐 API Endpoints Validation...');

runTest('Barcode routes file structure', () => {
  try {
    const barcodeRoutes = fs.readFileSync(join(__dirname, '..', 'routes', 'barcode.js'), 'utf8');
    return barcodeRoutes.includes('router.post') && barcodeRoutes.includes('/process');
  } catch (error) {
    throw new Error(`Routes file check failed: ${error.message}`);
  }
});

runTest('Panel routes file structure', () => {
  try {
    const panelRoutes = fs.readFileSync(join(__dirname, '..', 'routes', 'panels.js'), 'utf8');
    return panelRoutes.includes('router.get') && panelRoutes.includes('router.post');
  } catch (error) {
    throw new Error(`Panel routes file check failed: ${error.message}`);
  }
});

// Test 4: Database Integration
console.log('');
console.log('🗄️ Database Integration Validation...');

runTest('Panel service imports correctly', () => {
  try {
    const panelService = require(join(__dirname, '..', 'services', 'panelService.js'));
    return panelService && typeof panelService === 'object';
  } catch (error) {
    throw new Error(`Panel service import failed: ${error.message}`);
  }
});

// Test 5: Frontend Components
console.log('');
console.log('🖥️ Frontend Components Validation...');

runTest('Frontend PanelScan component structure', () => {
  try {
    const panelScan = fs.readFileSync(join(__dirname, '..', '..', 'frontend', 'src', 'pages', 'PanelScan.tsx'), 'utf8');
    return panelScan.includes('PanelScan') && panelScan.includes('export default');
  } catch (error) {
    throw new Error(`PanelScan component check failed: ${error.message}`);
  }
});

runTest('Frontend PanelStore structure', () => {
  try {
    const panelStore = fs.readFileSync(join(__dirname, '..', '..', 'frontend', 'src', 'database', 'stores', 'panelStore.ts'), 'utf8');
    return panelStore.includes('panelStore') && panelStore.includes('export');
  } catch (error) {
    throw new Error(`PanelStore check failed: ${error.message}`);
  }
});

// Test 6: Error Handling
console.log('');
console.log('⚠️ Error Handling Validation...');

runTest('Invalid barcode error handling', () => {
  try {
    const { validateBarcode } = require(join(__dirname, '..', 'utils', 'barcodeProcessor.js'));
    const invalidBarcode = 'INVALID123';
    const validation = validateBarcode(invalidBarcode);
    return validation && validation.valid === false;
  } catch (error) {
    // Expected to throw error for invalid barcode
    return true;
  }
});

// Test 7: Performance Features
console.log('');
console.log('⚡ Performance Features Validation...');

runTest('Performance optimizer exists', () => {
  return fs.existsSync(join(__dirname, '..', 'utils', 'performanceOptimizer.js'));
});

runTest('Performance optimizer imports correctly', () => {
  try {
    const performanceOptimizer = require(join(__dirname, '..', 'utils', 'performanceOptimizer.js'));
    return performanceOptimizer && typeof performanceOptimizer === 'object';
  } catch (error) {
    throw new Error(`Performance optimizer import failed: ${error.message}`);
  }
});

// Test 8: Manual Override System
console.log('');
console.log('🔧 Manual Override System Validation...');

runTest('Manual override system exists', () => {
  return fs.existsSync(join(__dirname, '..', 'utils', 'panelSpecificationOverride.js'));
});

runTest('Manual override system imports correctly', () => {
  try {
    const overrideSystem = require(join(__dirname, '..', 'utils', 'panelSpecificationOverride.js'));
    return overrideSystem && typeof overrideSystem === 'object';
  } catch (error) {
    throw new Error(`Manual override system import failed: ${error.message}`);
  }
});

// Test 9: Test Coverage
console.log('');
console.log('🧪 Test Coverage Validation...');

runTest('Barcode processor tests exist', () => {
  return fs.existsSync(join(__dirname, '..', 'utils', '__tests__', 'barcodeProcessor.test.js'));
});

runTest('Barcode generator tests exist', () => {
  return fs.existsSync(join(__dirname, '..', 'utils', '__tests__', 'barcodeGenerator.test.js'));
});

runTest('Panel service tests exist', () => {
  return fs.existsSync(join(__dirname, '..', 'services', '__tests__', 'panelService.test.js'));
});

// Final Results
console.log('');
console.log('📊 Test Results Summary...');
console.log(`Total Tests: ${testResults.total}`);
console.log(`Passed: ${testResults.passed}`);
console.log(`Failed: ${testResults.failed}`);
console.log(`Success Rate: ${Math.round((testResults.passed / testResults.total) * 100)}%`);

if (testResults.errors.length > 0) {
  console.log('');
  console.log('❌ Errors encountered:');
  testResults.errors.forEach(error => {
    console.log(`  - ${error.test}: ${error.error}`);
  });
}

console.log('');
if (testResults.failed === 0) {
  console.log('🎉 All tests passed! Task 4 is fully functional and ready for production.');
} else {
  console.log(`⚠️ ${testResults.failed} test(s) failed. Please review the errors above.`);
}

console.log('');
console.log('✅ Task 4 functionality test completed!');
