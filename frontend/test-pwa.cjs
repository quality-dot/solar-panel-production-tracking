#!/usr/bin/env node

/**
 * PWA Testing Script for Subtask 13.4
 * Tests basic PWA functionality and provides a testing framework
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const TEST_URL = 'http://localhost:4173';
const MANIFEST_URL = `${TEST_URL}/manifest.webmanifest`;
const OFFLINE_URL = `${TEST_URL}/offline.html`;

console.log('🔍 PWA Testing Script - Subtask 13.4');
console.log('=====================================\n');

// Test 1: Check if server is running
async function testServerRunning() {
  console.log('1️⃣ Testing Server Availability...');
  
  return new Promise((resolve) => {
    const req = http.get(TEST_URL, (res) => {
      if (res.statusCode === 200) {
        console.log('✅ Server is running on port 4173');
        resolve(true);
      } else {
        console.log(`❌ Server returned status: ${res.statusCode}`);
        resolve(false);
      }
    });
    
    req.on('error', () => {
      console.log('❌ Server is not running');
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      console.log('❌ Server connection timeout');
      req.destroy();
      resolve(false);
    });
  });
}

// Test 2: Check PWA Manifest
async function testPWAManifest() {
  console.log('\n2️⃣ Testing PWA Manifest...');
  
  return new Promise((resolve) => {
    const req = http.get(MANIFEST_URL, (res) => {
      if (res.statusCode === 200) {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const manifest = JSON.parse(data);
            console.log('✅ PWA Manifest loaded successfully');
            console.log(`   - App Name: ${manifest.name}`);
            console.log(`   - Short Name: ${manifest.short_name}`);
            console.log(`   - Icons: ${manifest.icons?.length || 0} found`);
            console.log(`   - Theme Color: ${manifest.theme_color}`);
            resolve(true);
          } catch (e) {
            console.log('❌ PWA Manifest is not valid JSON');
            resolve(false);
          }
        });
      } else {
        console.log(`❌ PWA Manifest not found (${res.statusCode})`);
        resolve(false);
      }
    });
    
    req.on('error', () => {
      console.log('❌ Could not load PWA Manifest');
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      console.log('❌ PWA Manifest request timeout');
      req.destroy();
      resolve(false);
    });
  });
}

// Test 3: Check Offline Page
async function testOfflinePage() {
  console.log('\n3️⃣ Testing Offline Page...');
  
  return new Promise((resolve) => {
    const req = http.get(OFFLINE_URL, (res) => {
      if (res.statusCode === 200) {
        console.log('✅ Offline page is accessible');
        resolve(true);
      } else {
        console.log(`❌ Offline page not found (${res.statusCode})`);
        resolve(false);
      }
    });
    
    req.on('error', () => {
      console.log('❌ Could not load offline page');
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      console.log('❌ Offline page request timeout');
      req.destroy();
      resolve(false);
    });
  });
}

// Test 4: Check Build Files
function testBuildFiles() {
  console.log('\n4️⃣ Testing Build Files...');
  
  const distPath = path.join(__dirname, 'dist');
  const requiredFiles = [
    'index.html',
    'manifest.webmanifest',
    'sw.js',
    'offline.html'
  ];
  
  if (!fs.existsSync(distPath)) {
    console.log('❌ Dist directory not found');
    return false;
  }
  
  let allFilesExist = true;
  requiredFiles.forEach(file => {
    const filePath = path.join(distPath, file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${file} exists`);
    } else {
      console.log(`❌ ${file} missing`);
      allFilesExist = false;
    }
  });
  
  return allFilesExist;
}

// Test 5: Check Service Worker
function testServiceWorker() {
  console.log('\n5️⃣ Testing Service Worker...');
  
  const swPath = path.join(__dirname, 'dist', 'sw.js');
  if (!fs.existsSync(swPath)) {
    console.log('❌ Service worker not found');
    return false;
  }
  
  const swContent = fs.readFileSync(swPath, 'utf8');
  
  // Check for key Workbox features
  const checks = [
    { name: 'Workbox registration', pattern: /workbox/ },
    { name: 'Cache strategies', pattern: /NetworkFirst|CacheFirst|StaleWhileRevalidate/ },
    { name: 'Precache', pattern: /precacheAndRoute/ },
    { name: 'Skip waiting', pattern: /skipWaiting/ },
    { name: 'Clients claim', pattern: /clientsClaim/ }
  ];
  
  let allChecksPass = true;
  checks.forEach(check => {
    if (check.pattern.test(swContent)) {
      console.log(`✅ ${check.name} found`);
    } else {
      console.log(`❌ ${check.name} missing`);
      allChecksPass = false;
    }
  });
  
  return allChecksPass;
}

// Main testing function
async function runTests() {
  console.log('🚀 Starting PWA Tests...\n');
  
  const results = {
    server: await testServerRunning(),
    manifest: await testPWAManifest(),
    offline: await testOfflinePage(),
    buildFiles: testBuildFiles(),
    serviceWorker: testServiceWorker()
  };
  
  // Summary
  console.log('\n📊 Test Results Summary');
  console.log('========================');
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, result]) => {
    const status = result ? '✅ PASS' : '❌ FAIL';
    console.log(`${test.padEnd(20)}: ${status}`);
  });
  
  console.log(`\nOverall: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! PWA is ready for manual testing.');
    console.log('\n📋 Next Steps:');
    console.log('   1. Open http://localhost:4173 in Chrome');
    console.log('   2. Check for PWA install prompt');
    console.log('   3. Test offline functionality');
    console.log('   4. Verify service worker in DevTools');
  } else {
    console.log('\n⚠️  Some tests failed. Please fix issues before proceeding.');
  }
  
  return results;
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
