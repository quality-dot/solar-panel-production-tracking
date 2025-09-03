#!/usr/bin/env node

/**
 * Barcode Scanning Test Runner
 * Runs comprehensive tests for the barcode scanning system
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🔍 Running Barcode Scanning System Tests...\n');

try {
  // Run barcode scanning specific tests
  const testCommand = [
    'jest',
    '--config=src/__tests__/barcode-scanning.config.js',
    '--coverage',
    '--verbose',
    '--passWithNoTests',
  ].join(' ');

  console.log('📋 Test Configuration:');
  console.log('  - Environment: jsdom');
  console.log('  - Coverage: Enabled');
  console.log('  - Verbose: Enabled');
  console.log('  - Timeout: 10s');
  console.log('');

  console.log('🧪 Running Tests...');
  execSync(testCommand, {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'),
  });

  console.log('\n✅ Barcode Scanning Tests Completed Successfully!');
  console.log('');
  console.log('📊 Test Summary:');
  console.log('  - Service Tests: barcodeScanningService.test.ts');
  console.log('  - Component Tests: BarcodeScanner.test.tsx');
  console.log('  - Page Tests: PanelScan.test.tsx');
  console.log('  - Workflow Tests: StationWorkflow.test.tsx');
  console.log('  - Integration Tests: barcode-scanning.test.ts');
  console.log('');
  console.log('📈 Coverage Report: coverage/barcode-scanning/');

} catch (error) {
  console.error('\n❌ Barcode Scanning Tests Failed!');
  console.error('Error:', error.message);
  process.exit(1);
}
