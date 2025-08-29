/**
 * Basic Encryption Service Test Script
 * Task: 22.2 - Basic Data Encryption (PRD Scope: "Local data encryption")
 * Description: Simple testing of basic local data encryption
 * Date: 2025-01-27
 */

import basicEncryptionService from '../services/encryptionService.js';

/**
 * Test basic encryption functionality
 */
function testBasicEncryption() {
  console.log('\n🔐 Testing Basic Encryption Service...');
  
  try {
    // Test data encryption
    const testData = 'sensitive-manufacturing-data';
    console.log('   📝 Original data:', testData);
    
    const encrypted = basicEncryptionService.encrypt(testData);
    console.log('   🔒 Encrypted data:', encrypted);
    
    // Verify it's encrypted
    if (!basicEncryptionService.isEncrypted(encrypted)) {
      throw new Error('Data was not properly encrypted');
    }
    console.log('   ✅ Encryption verification passed');
    
    // Test decryption
    const decrypted = basicEncryptionService.decrypt(encrypted);
    console.log('   🔓 Decrypted data:', decrypted);
    
    // Verify decryption
    if (decrypted !== testData) {
      throw new Error('Decryption failed - data mismatch');
    }
    console.log('   ✅ Decryption verification passed');
    
    console.log('   ✅ Basic encryption test passed');
    
  } catch (error) {
    console.error('   ❌ Basic encryption test failed:', error.message);
    throw error;
  }
}

/**
 * Test health check
 */
function testHealthCheck() {
  console.log('\n🏥 Testing Health Check...');
  
  try {
    const health = basicEncryptionService.healthCheck();
    console.log('   📊 Health status:', health.status);
    console.log('   📊 Algorithm:', health.algorithm);
    console.log('   📊 Key length:', health.keyLength);
    
    if (health.status !== 'healthy') {
      throw new Error(`Service unhealthy: ${health.error}`);
    }
    
    console.log('   ✅ Health check passed');
    
  } catch (error) {
    console.error('   ❌ Health check failed:', error.message);
    throw error;
  }
}

/**
 * Test edge cases
 */
function testEdgeCases() {
  console.log('\n🔍 Testing Edge Cases...');
  
  try {
    // Test null/undefined
    const nullResult = basicEncryptionService.encrypt(null);
    if (nullResult !== null) {
      throw new Error('Null handling failed');
    }
    console.log('   ✅ Null handling passed');
    
    // Test empty string
    const emptyResult = basicEncryptionService.encrypt('');
    if (emptyResult !== '') {
      throw new Error('Empty string handling failed');
    }
    console.log('   ✅ Empty string handling passed');
    
    // Test non-encrypted data
    const plainData = 'plain-text-data';
    const isEncrypted = basicEncryptionService.isEncrypted(plainData);
    if (isEncrypted) {
      throw new Error('Plain text incorrectly identified as encrypted');
    }
    console.log('   ✅ Plain text detection passed');
    
    // Test decryption of non-encrypted data
    const decryptedPlain = basicEncryptionService.decrypt(plainData);
    if (decryptedPlain !== plainData) {
      throw new Error('Plain text decryption failed');
    }
    console.log('   ✅ Plain text decryption passed');
    
    console.log('   ✅ Edge case tests passed');
    
  } catch (error) {
    console.error('   ❌ Edge case test failed:', error.message);
    throw error;
  }
}

/**
 * Run all tests
 */
function runAllTests() {
  console.log('🚀 Starting Basic Encryption Service Tests...');
  console.log('=' .repeat(50));
  
  const startTime = Date.now();
  let passedTests = 0;
  let totalTests = 3;
  
  try {
    // Run all test suites
    testBasicEncryption();
    passedTests++;
    
    testHealthCheck();
    passedTests++;
    
    testEdgeCases();
    passedTests++;
    
    const totalTime = Date.now() - startTime;
    
    console.log('\n' + '=' .repeat(50));
    console.log('🎉 ALL BASIC ENCRYPTION TESTS PASSED! 🎉');
    console.log(`📊 Results: ${passedTests}/${totalTests} test suites passed`);
    console.log(`⏱️ Total test time: ${totalTime}ms`);
    console.log('✅ Basic encryption service is working correctly');
    console.log('✅ PRD requirement "Local data encryption" is satisfied');
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    
    console.log('\n' + '=' .repeat(50));
    console.log('❌ BASIC ENCRYPTION TEST SUITE FAILED ❌');
    console.log(`📊 Results: ${passedTests}/${totalTests} test suites passed`);
    console.log(`⏱️ Test time: ${totalTime}ms`);
    console.log(`🚨 Error: ${error.message}`);
    
    process.exit(1);
  }
}

// Run tests
runAllTests();
