#!/usr/bin/env node

/**
 * PWA Testing Script - Subtask 13.24
 * Test PWA Functionality Across Devices
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Configuration
const PWA_URL = 'http://localhost:4173';
const TEST_RESULTS_FILE = 'pwa-test-results.json';

// Test results storage
let testResults = {
  timestamp: new Date().toISOString(),
  subtask: '13.24',
  title: 'Test PWA Functionality Across Devices',
  overallStatus: 'IN_PROGRESS',
  tests: {
    serverAvailability: { status: 'PENDING', details: {} },
    pwaManifest: { status: 'PENDING', details: {} },
    serviceWorker: { status: 'PENDING', details: {} },
    offlineFunctionality: { status: 'PENDING', details: {} },
    crossBrowserCompatibility: { status: 'PENDING', details: {} },
    deviceResponsiveness: { status: 'PENDING', details: {} }
  },
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

function updateTestResult(testName, status, details = {}) {
  testResults.tests[testName] = { status, details };
  log(`Test ${testName}: ${status}`, status === 'PASS' ? 'PASS' : status === 'FAIL' ? 'FAIL' : 'INFO');
}

function calculateSummary() {
  const tests = Object.values(testResults.tests);
  testResults.summary.totalTests = tests.length;
  testResults.summary.passedTests = tests.filter(t => t.status === 'PASS').length;
  testResults.summary.failedTests = tests.filter(t => t.status === 'FAIL').length;
  testResults.summary.successRate = Math.round((testResults.summary.passedTests / testResults.summary.totalTests) * 100);
  
  testResults.overallStatus = testResults.summary.failedTests === 0 ? 'PASS' : 'FAIL';
}

function saveResults() {
  fs.writeFileSync(TEST_RESULTS_FILE, JSON.stringify(testResults, null, 2));
  log(`Test results saved to ${TEST_RESULTS_FILE}`);
}

// Test 1: Server Availability
async function testServerAvailability() {
  log('Testing server availability...');
  
  try {
    const response = await new Promise((resolve, reject) => {
      http.get(PWA_URL, (res) => {
        resolve(res);
      }).on('error', (err) => {
        reject(err);
      });
    });
    
    if (response.statusCode === 200) {
      updateTestResult('serverAvailability', 'PASS', {
        statusCode: response.statusCode,
        url: PWA_URL
      });
    } else {
      updateTestResult('serverAvailability', 'FAIL', {
        statusCode: response.statusCode,
        expected: 200
      });
    }
  } catch (error) {
    updateTestResult('serverAvailability', 'FAIL', {
      error: error.message
    });
  }
}

// Test 2: PWA Manifest
async function testPWAManifest() {
  log('Testing PWA manifest...');
  
  try {
    const manifestUrl = `${PWA_URL}/manifest.webmanifest`;
    const response = await new Promise((resolve, reject) => {
      http.get(manifestUrl, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, data }));
      }).on('error', reject);
    });
    
    if (response.statusCode === 200) {
      const manifest = JSON.parse(response.data);
      
      // Validate required manifest fields
      const requiredFields = ['name', 'short_name', 'start_url', 'display', 'theme_color'];
      const missingFields = requiredFields.filter(field => !manifest[field]);
      
      if (missingFields.length === 0) {
        updateTestResult('pwaManifest', 'PASS', {
          statusCode: response.statusCode,
          hasIcons: !!manifest.icons,
          iconCount: manifest.icons ? manifest.icons.length : 0,
          hasShortcuts: !!manifest.shortcuts,
          displayMode: manifest.display
        });
      } else {
        updateTestResult('pwaManifest', 'FAIL', {
          statusCode: response.statusCode,
          missingFields
        });
      }
    } else {
      updateTestResult('pwaManifest', 'FAIL', {
        statusCode: response.statusCode,
        expected: 200
      });
    }
  } catch (error) {
    updateTestResult('pwaManifest', 'FAIL', {
      error: error.message
    });
  }
}

// Test 3: Service Worker
async function testServiceWorker() {
  log('Testing service worker...');
  
  try {
    const swUrl = `${PWA_URL}/sw.js`;
    const response = await new Promise((resolve, reject) => {
      http.get(swUrl, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, data }));
      }).on('error', reject);
    });
    
    if (response.statusCode === 200) {
      const swContent = response.data;
      
      // Check for service worker content
      const hasWorkbox = swContent.includes('workbox');
      const hasCacheStrategies = swContent.includes('CacheFirst') || swContent.includes('NetworkFirst');
      const hasOfflineSupport = swContent.includes('offline') || swContent.includes('offline.html');
      
      if (hasWorkbox && hasCacheStrategies) {
        updateTestResult('serviceWorker', 'PASS', {
          statusCode: response.statusCode,
          hasWorkbox,
          hasCacheStrategies,
          hasOfflineSupport,
          size: swContent.length
        });
      } else {
        updateTestResult('serviceWorker', 'FAIL', {
          statusCode: response.statusCode,
          hasWorkbox,
          hasCacheStrategies,
          hasOfflineSupport
        });
      }
    } else {
      updateTestResult('serviceWorker', 'FAIL', {
        statusCode: response.statusCode,
        expected: 200
      });
    }
  } catch (error) {
    updateTestResult('serviceWorker', 'FAIL', {
      error: error.message
    });
  }
}

// Test 4: Offline Functionality
async function testOfflineFunctionality() {
  log('Testing offline functionality...');
  
  try {
    const offlineUrl = `${PWA_URL}/offline.html`;
    const response = await new Promise((resolve, reject) => {
      http.get(offlineUrl, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, data }));
      }).on('error', reject);
    });
    
    if (response.statusCode === 200) {
      const offlineContent = response.data;
      
      // Check for offline page content
      const hasOfflineMessage = offlineContent.includes('offline') || offlineContent.includes('no internet');
      const hasRetryButton = offlineContent.includes('retry') || offlineContent.includes('reload');
      
      if (hasOfflineMessage) {
        updateTestResult('offlineFunctionality', 'PASS', {
          statusCode: response.statusCode,
          hasOfflineMessage,
          hasRetryButton,
          size: offlineContent.length
        });
      } else {
        updateTestResult('offlineFunctionality', 'FAIL', {
          statusCode: response.statusCode,
          hasOfflineMessage,
          hasRetryButton
        });
      }
    } else {
      updateTestResult('offlineFunctionality', 'FAIL', {
        statusCode: response.statusCode,
        expected: 200
      });
    }
  } catch (error) {
    updateTestResult('offlineFunctionality', 'FAIL', {
      error: error.message
    });
  }
}

// Test 5: Cross Browser Compatibility (Basic)
async function testCrossBrowserCompatibility() {
  log('Testing cross-browser compatibility (basic)...');
  
  try {
    // Test main page loads
    const response = await new Promise((resolve, reject) => {
      http.get(PWA_URL, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, data }));
      }).on('error', reject);
    });
    
    if (response.statusCode === 200) {
      const htmlContent = response.data;
      
      // Check for PWA meta tags
      const hasPWAViewport = htmlContent.includes('viewport');
      const hasPWAThemeColor = htmlContent.includes('theme-color');
      const hasPWAManifest = htmlContent.includes('manifest.webmanifest');
      const hasServiceWorker = htmlContent.includes('sw.js') || htmlContent.includes('service-worker');
      
      if (hasPWAViewport && hasPWAManifest) {
        updateTestResult('crossBrowserCompatibility', 'PASS', {
          statusCode: response.statusCode,
          hasPWAViewport,
          hasPWAThemeColor,
          hasPWAManifest,
          hasServiceWorker
        });
      } else {
        updateTestResult('crossBrowserCompatibility', 'FAIL', {
          statusCode: response.statusCode,
          hasPWAViewport,
          hasPWAThemeColor,
          hasPWAManifest,
          hasServiceWorker
        });
      }
    } else {
      updateTestResult('crossBrowserCompatibility', 'FAIL', {
        statusCode: response.statusCode,
        expected: 200
      });
    }
  } catch (error) {
    updateTestResult('crossBrowserCompatibility', 'FAIL', {
      error: error.message
    });
  }
}

// Test 6: Device Responsiveness (Basic)
async function testDeviceResponsiveness() {
  log('Testing device responsiveness (basic)...');
  
  try {
    // Check if CSS includes responsive design
    const cssUrl = `${PWA_URL}/assets/index-DX-qNxjm.css`;
    const response = await new Promise((resolve, reject) => {
      http.get(cssUrl, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, data }));
      }).on('error', reject);
    });
    
    if (response.statusCode === 200) {
      const cssContent = response.data;
      
      // Check for responsive design patterns
      const hasMediaQueries = cssContent.includes('@media');
      const hasFlexbox = cssContent.includes('display: flex') || cssContent.includes('display:flex');
      const hasGrid = cssContent.includes('display: grid') || cssContent.includes('display:grid');
      const hasResponsiveUnits = cssContent.includes('vw') || cssContent.includes('vh') || cssContent.includes('rem');
      
      if (hasMediaQueries || hasFlexbox || hasGrid) {
        updateTestResult('deviceResponsiveness', 'PASS', {
          statusCode: response.statusCode,
          hasMediaQueries,
          hasFlexbox,
          hasGrid,
          hasResponsiveUnits,
          size: cssContent.length
        });
      } else {
        updateTestResult('deviceResponsiveness', 'FAIL', {
          statusCode: response.statusCode,
          hasMediaQueries,
          hasFlexbox,
          hasGrid,
          hasResponsiveUnits
        });
      }
    } else {
      updateTestResult('deviceResponsiveness', 'FAIL', {
        statusCode: response.statusCode,
        expected: 200
      });
    }
  } catch (error) {
    updateTestResult('deviceResponsiveness', 'FAIL', {
      error: error.message
    });
  }
}

// Main test runner
async function runAllTests() {
  log('Starting PWA Testing - Subtask 13.24', 'START');
  log(`Testing PWA at: ${PWA_URL}`);
  
  try {
    // Run all tests
    await testServerAvailability();
    await testPWAManifest();
    await testServiceWorker();
    await testOfflineFunctionality();
    await testCrossBrowserCompatibility();
    await testDeviceResponsiveness();
    
    // Calculate summary
    calculateSummary();
    
    // Save results
    saveResults();
    
    // Print summary
    log('=== PWA TESTING SUMMARY ===', 'SUMMARY');
    log(`Overall Status: ${testResults.overallStatus}`, 'SUMMARY');
    log(`Total Tests: ${testResults.summary.totalTests}`, 'SUMMARY');
    log(`Passed: ${testResults.summary.passedTests}`, 'SUMMARY');
    log(`Failed: ${testResults.summary.failedTests}`, 'SUMMARY');
    log(`Success Rate: ${testResults.summary.successRate}%`, 'SUMMARY');
    
    // Print detailed results
    log('=== DETAILED RESULTS ===', 'DETAILS');
    Object.entries(testResults.tests).forEach(([testName, result]) => {
      log(`${testName}: ${result.status}`, result.status === 'PASS' ? 'PASS' : 'FAIL');
    });
    
    log('PWA Testing completed!', 'COMPLETE');
    
    // Exit with appropriate code
    process.exit(testResults.overallStatus === 'PASS' ? 0 : 1);
    
  } catch (error) {
    log(`Test execution failed: ${error.message}`, 'ERROR');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  runAllTests,
  testResults
};
