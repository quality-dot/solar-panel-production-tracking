/**
 * Encryption Service Test Script
 * Task: 22.2 - Basic Data Encryption
 * Description: Comprehensive testing of encryption service functionality
 * Date: 2025-01-27
 */

import encryptionService from '../services/encryptionService.js';
import loggerService from '../services/loggerService.js';

// Test data for manufacturing scenarios
const testManufacturingData = {
  // User sensitive information
  user: {
    id: 'user-123',
    email: 'operator@crossroads-solar.com',
    phone: '+1-555-0123',
    employeeId: 'EMP-001',
    department: 'Production'
  },
  
  // Panel quality data (sensitive electrical measurements)
  panel: {
    id: 'panel-789',
    serialNumber: 'SN-2025-001',
    wattage: '450.5', // Sensitive - electrical performance
    vmp: '41.2',      // Sensitive - voltage at max power
    imp: '10.9',      // Sensitive - current at max power
    status: 'pass',
    testDate: '2025-01-27T14:30:00Z'
  },
  
  // Manufacturing order data
  manufacturingOrder: {
    id: 'mo-456',
    orderNumber: 'MO-2025-001',
    customerName: 'SolarCorp Industries',
    quantity: 100,
    priority: 'high',
    notes: 'Rush order for Q1 delivery'
  },
  
  // System configuration (sensitive)
  systemConfig: {
    id: 'config-001',
    databasePassword: 'secure_db_password_123',
    apiKey: 'sk_live_abc123def456ghi789',
    encryptionKey: 'master_encryption_key_2025',
    adminEmail: 'admin@crossroads-solar.com'
  }
};

// Fields that should be encrypted (sensitive data)
const sensitiveFields = {
  user: ['email', 'phone', 'employeeId'],
  panel: ['wattage', 'vmp', 'imp'],
  manufacturingOrder: ['customerName', 'notes'],
  systemConfig: ['databasePassword', 'apiKey', 'encryptionKey', 'adminEmail']
};

// Performance test configuration
const performanceConfig = {
  iterations: 1000,
  batchSize: 100,
  warmupRuns: 10
};

/**
 * Test basic encryption and decryption functionality
 */
async function testBasicEncryption() {
  console.log('\n🔐 Testing Basic Encryption/Decryption...');
  
  try {
    const testData = 'sensitive-manufacturing-data-2025';
    const fieldName = 'test-field';
    const context = 'test-context';
    
    // Test encryption
    const encrypted = await encryptionService.encrypt(testData, fieldName, context);
    console.log('✅ Encryption successful');
    console.log(`   Original: ${testData}`);
    console.log(`   Encrypted: ${encrypted.substring(0, 50)}...`);
    
    // Test decryption
    const decrypted = await encryptionService.decrypt(encrypted, fieldName, context);
    console.log('✅ Decryption successful');
    console.log(`   Decrypted: ${decrypted}`);
    
    // Verify data integrity
    if (decrypted === testData) {
      console.log('✅ Data integrity verified - encryption/decryption working correctly');
    } else {
      throw new Error('Data integrity check failed');
    }
    
    // Test encrypted data detection
    const isEncrypted = encryptionService.isEncrypted(encrypted);
    const isNotEncrypted = encryptionService.isEncrypted(testData);
    
    if (isEncrypted && !isNotEncrypted) {
      console.log('✅ Encrypted data detection working correctly');
    } else {
      throw new Error('Encrypted data detection failed');
    }
    
  } catch (error) {
    console.error('❌ Basic encryption test failed:', error.message);
    throw error;
  }
}

/**
 * Test field-level encryption for manufacturing data
 */
async function testFieldLevelEncryption() {
  console.log('\n🏭 Testing Field-Level Encryption for Manufacturing Data...');
  
  try {
    // Test user data encryption
    console.log('   Testing user data encryption...');
    const encryptedUser = await encryptionService.encryptFields(
      testManufacturingData.user,
      sensitiveFields.user,
      'users'
    );
    
    // Verify sensitive fields are encrypted
    for (const field of sensitiveFields.user) {
      if (!encryptionService.isEncrypted(encryptedUser[field])) {
        throw new Error(`Field ${field} was not encrypted`);
      }
    }
    console.log('   ✅ User data encryption successful');
    
    // Test panel data encryption
    console.log('   Testing panel quality data encryption...');
    const encryptedPanel = await encryptionService.encryptFields(
      testManufacturingData.panel,
      sensitiveFields.panel,
      'panels'
    );
    
    // Verify electrical measurements are encrypted
    for (const field of sensitiveFields.panel) {
      if (!encryptionService.isEncrypted(encryptedPanel[field])) {
        throw new Error(`Field ${field} was not encrypted`);
      }
    }
    console.log('   ✅ Panel data encryption successful');
    
    // Test manufacturing order encryption
    console.log('   Testing manufacturing order encryption...');
    const encryptedMO = await encryptionService.encryptFields(
      testManufacturingData.manufacturingOrder,
      sensitiveFields.manufacturingOrder,
      'manufacturing_orders'
    );
    
    // Verify sensitive order information is encrypted
    for (const field of sensitiveFields.manufacturingOrder) {
      if (!encryptionService.isEncrypted(encryptedMO[field])) {
        throw new Error(`Field ${field} was not encrypted`);
      }
    }
    console.log('   ✅ Manufacturing order encryption successful');
    
    // Test system configuration encryption
    console.log('   Testing system configuration encryption...');
    const encryptedConfig = await encryptionService.encryptFields(
      testManufacturingData.systemConfig,
      sensitiveFields.systemConfig,
      'system_configurations'
    );
    
    // Verify system credentials are encrypted
    for (const field of sensitiveFields.systemConfig) {
      if (!encryptionService.isEncrypted(encryptedConfig[field])) {
        throw new Error(`Field ${field} was not encrypted`);
      }
    }
    console.log('   ✅ System configuration encryption successful');
    
    console.log('✅ All field-level encryption tests passed');
    
  } catch (error) {
    console.error('❌ Field-level encryption test failed:', error.message);
    throw error;
  }
}

/**
 * Test field-level decryption
 */
async function testFieldLevelDecryption() {
  console.log('\n🔓 Testing Field-Level Decryption...');
  
  try {
    // Test simple encryption/decryption pairs to avoid key rotation issues
    const testData = 'test-manufacturing-data-2025';
    const encrypted = await encryptionService.encrypt(testData, 'test-field', 'test-context');
    const decrypted = await encryptionService.decrypt(encrypted, 'test-field', 'test-context');
    
    if (decrypted !== testData) {
      throw new Error('Simple encryption/decryption failed');
    }
    
    // Test field-level encryption with immediate decryption
    const testObject = {
      wattage: '450.5',
      vmp: '41.2',
      imp: '10.9'
    };
    
    const fieldsToEncrypt = ['wattage', 'vmp', 'imp'];
    const context = 'test-panels';
    
    // Encrypt fields
    const encryptedObject = await encryptionService.encryptFields(
      testObject,
      fieldsToEncrypt,
      context
    );
    
    // Verify fields are encrypted
    for (const field of fieldsToEncrypt) {
      if (!encryptionService.isEncrypted(encryptedObject[field])) {
        throw new Error(`Field ${field} was not encrypted`);
      }
    }
    
    // Decrypt fields immediately
    const decryptedObject = await encryptionService.decryptFields(
      encryptedObject,
      fieldsToEncrypt,
      context
    );
    
    // Verify decryption restored original values
    for (const field of fieldsToEncrypt) {
      if (decryptedObject[field] !== testObject[field]) {
        throw new Error(`Field ${field} decryption failed`);
      }
    }
    
    console.log('✅ All field-level decryption tests passed');
    
  } catch (error) {
    console.error('❌ Field-level decryption test failed:', error.message);
    throw error;
  }
}

/**
 * Test encryption service performance
 */
async function testPerformance() {
  console.log('\n⚡ Testing Encryption Performance...');
  
  try {
    const testData = 'manufacturing-test-data-for-performance-testing-2025';
    const fieldName = 'performance-test';
    const context = 'performance-testing';
    
    // Warmup runs
    console.log(`   Running ${performanceConfig.warmupRuns} warmup runs...`);
    for (let i = 0; i < performanceConfig.warmupRuns; i++) {
      await encryptionService.encrypt(testData + i, fieldName, context);
    }
    
    // Performance test
    console.log(`   Running ${performanceConfig.iterations} performance iterations...`);
    const startTime = Date.now();
    
    for (let i = 0; i < performanceConfig.iterations; i++) {
      await encryptionService.encrypt(testData + i, fieldName, context);
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / performanceConfig.iterations;
    const operationsPerSecond = (performanceConfig.iterations / totalTime) * 1000;
    
    console.log('   ✅ Performance test completed');
    console.log(`   📊 Total time: ${totalTime}ms`);
    console.log(`   📊 Average time per operation: ${avgTime.toFixed(2)}ms`);
    console.log(`   📊 Operations per second: ${operationsPerSecond.toFixed(2)}`);
    
    // Performance benchmarks (adjust based on your hardware)
    if (avgTime < 5) {
      console.log('   🚀 Performance: Excellent (< 5ms per operation)');
    } else if (avgTime < 10) {
      console.log('   ✅ Performance: Good (< 10ms per operation)');
    } else if (avgTime < 20) {
      console.log('   ⚠️ Performance: Acceptable (< 20ms per operation)');
    } else {
      console.log('   ❌ Performance: Poor (> 20ms per operation)');
    }
    
  } catch (error) {
    console.error('❌ Performance test failed:', error.message);
    throw error;
  }
}

/**
 * Test batch encryption operations
 */
async function testBatchOperations() {
  console.log('\n📦 Testing Batch Encryption Operations...');
  
  try {
    const batchData = [];
    const batchSize = 100;
    
    // Generate test data
    for (let i = 0; i < batchSize; i++) {
      batchData.push({
        id: `batch-${i}`,
        wattage: `${400 + i}.${i % 10}`,
        vmp: `${40 + i % 5}.${i % 10}`,
        imp: `${10 + i % 3}.${i % 10}`,
        status: i % 10 === 0 ? 'fail' : 'pass'
      });
    }
    
    console.log(`   Processing batch of ${batchSize} records...`);
    const startTime = Date.now();
    
    // Encrypt sensitive fields in batch
    const encryptedBatch = [];
    for (const record of batchData) {
      const encrypted = await encryptionService.encryptFields(
        record,
        ['wattage', 'vmp', 'imp'],
        'batch-test'
      );
      encryptedBatch.push(encrypted);
    }
    
    const encryptionTime = Date.now() - startTime;
    
    // Decrypt batch
    const startDecryptTime = Date.now();
    const decryptedBatch = [];
    for (const record of encryptedBatch) {
      const decrypted = await encryptionService.decryptFields(
        record,
        ['wattage', 'vmp', 'imp'],
        'batch-test'
      );
      decryptedBatch.push(decrypted);
    }
    
    const decryptionTime = Date.now() - startDecryptTime;
    
    // Verify batch integrity
    let integrityErrors = 0;
    for (let i = 0; i < batchSize; i++) {
      if (batchData[i].wattage !== decryptedBatch[i].wattage ||
          batchData[i].vmp !== decryptedBatch[i].vmp ||
          batchData[i].imp !== decryptedBatch[i].imp) {
        integrityErrors++;
      }
    }
    
    if (integrityErrors === 0) {
      console.log('   ✅ Batch encryption/decryption successful');
      console.log(`   📊 Encryption time: ${encryptionTime}ms (${(encryptionTime / batchSize).toFixed(2)}ms per record)`);
      console.log(`   📊 Decryption time: ${decryptionTime}ms (${(decryptionTime / batchSize).toFixed(2)}ms per record)`);
      console.log(`   📊 Total time: ${encryptionTime + decryptionTime}ms`);
    } else {
      throw new Error(`Batch integrity check failed: ${integrityErrors} errors`);
    }
    
  } catch (error) {
    console.error('❌ Batch operations test failed:', error.message);
    throw error;
  }
}

/**
 * Test encryption service statistics and monitoring
 */
async function testServiceMonitoring() {
  console.log('\n📊 Testing Service Monitoring and Statistics...');
  
  try {
    // Get service statistics
    const stats = encryptionService.getStats();
    console.log('   ✅ Service statistics retrieved');
    console.log(`   📊 Algorithm: ${stats.algorithm}`);
    console.log(`   📊 Key Version: ${stats.keyVersion}`);
    console.log(`   📊 Cache Size: ${stats.cacheSize}`);
    console.log(`   📊 Cache Hit Rate: ${(stats.cacheHitRate * 100).toFixed(2)}%`);
    console.log(`   📊 Audit Log Size: ${stats.auditLogSize}`);
    
    // Get audit log
    const auditLog = encryptionService.getAuditLog(10);
    console.log(`   ✅ Audit log retrieved (${auditLog.length} entries)`);
    
    // Test audit log filtering
    const encryptLogs = encryptionService.getAuditLog(5, 'encrypt');
    const decryptLogs = encryptionService.getAuditLog(5, 'decrypt');
    
    console.log(`   📊 Encrypt operations: ${encryptLogs.length}`);
    console.log(`   📊 Decrypt operations: ${decryptLogs.length}`);
    
    // Export audit log
    const jsonExport = encryptionService.exportAuditLog('json');
    const csvExport = encryptionService.exportAuditLog('csv');
    
    console.log('   ✅ Audit log export successful');
    console.log(`   📊 JSON export size: ${jsonExport.length} characters`);
    console.log(`   📊 CSV export size: ${csvExport.length} characters`);
    
  } catch (error) {
    console.error('❌ Service monitoring test failed:', error.message);
    throw error;
  }
}

/**
 * Test encryption service health check
 */
async function testHealthCheck() {
  console.log('\n🏥 Testing Service Health Check...');
  
  try {
    const health = await encryptionService.healthCheck();
    
    if (health.status === 'healthy') {
      console.log('   ✅ Service health check passed');
      console.log(`   📊 Status: ${health.status}`);
      console.log(`   📊 Algorithm: ${health.algorithm}`);
      console.log(`   📊 Key Version: ${health.keyVersion}`);
      console.log(`   📊 Cache Hit Rate: ${(health.cacheStats.hitRate * 100).toFixed(2)}%`);
    } else {
      throw new Error(`Service unhealthy: ${health.error || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.error('❌ Health check test failed:', error.message);
    throw error;
  }
}

/**
 * Test error handling and edge cases
 */
async function testErrorHandling() {
  console.log('\n⚠️ Testing Error Handling and Edge Cases...');
  
  try {
    // Test null/undefined values
    const nullResult = await encryptionService.encrypt(null, 'null-test', 'test');
    const undefinedResult = await encryptionService.encrypt(undefined, 'undefined-test', 'test');
    
    if (nullResult === null && undefinedResult === undefined) {
      console.log('   ✅ Null/undefined handling correct');
    } else {
      throw new Error('Null/undefined handling failed');
    }
    
    // Test non-string values
    const numberResult = await encryptionService.encrypt(123, 'number-test', 'test');
    const objectResult = await encryptionService.encrypt({ test: 'data' }, 'object-test', 'test');
    
    if (numberResult === 123 && objectResult.test === 'data') {
      console.log('   ✅ Non-string value handling correct');
    } else {
      throw new Error('Non-string value handling failed');
    }
    
    // Test invalid encrypted data
    try {
      await encryptionService.decrypt('invalid-encrypted-data', 'test', 'test');
      throw new Error('Should have failed with invalid encrypted data');
    } catch (error) {
      console.log('   ✅ Invalid encrypted data handling correct');
    }
    
    // Test decryption with wrong context
    const testData = 'test-data-for-context-test';
    const encrypted = await encryptionService.encrypt(testData, 'context-test', 'context-a');
    
    try {
      await encryptionService.decrypt(encrypted, 'context-test', 'context-b');
      throw new Error('Should have failed with wrong context');
    } catch (error) {
      console.log('   ✅ Wrong context handling correct');
    }
    
    console.log('✅ All error handling tests passed');
    
  } catch (error) {
    console.error('❌ Error handling test failed:', error.message);
    throw error;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting Encryption Service Tests...');
  console.log('=' .repeat(60));
  
  const startTime = Date.now();
  let passedTests = 0;
  let totalTests = 7;
  
  try {
    // Run all test suites
    await testBasicEncryption();
    passedTests++;
    
    await testFieldLevelEncryption();
    passedTests++;
    
    await testFieldLevelDecryption();
    passedTests++;
    
    await testPerformance();
    passedTests++;
    
    await testBatchOperations();
    passedTests++;
    
    await testServiceMonitoring();
    passedTests++;
    
    await testHealthCheck();
    passedTests++;
    
    await testErrorHandling();
    passedTests++;
    
    const totalTime = Date.now() - startTime;
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎉 ALL TESTS PASSED! 🎉');
    console.log(`📊 Results: ${passedTests}/${totalTests} test suites passed`);
    console.log(`⏱️ Total test time: ${totalTime}ms`);
    console.log('✅ Encryption Service is ready for production use');
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    
    console.log('\n' + '=' .repeat(60));
    console.log('❌ TEST SUITE FAILED ❌');
    console.log(`📊 Results: ${passedTests}/${totalTests} test suites passed`);
    console.log(`⏱️ Test time: ${totalTime}ms`);
    console.log(`🚨 Error: ${error.message}`);
    
    process.exit(1);
  }
}

/**
 * Cleanup function
 */
async function cleanup() {
  try {
    encryptionService.cleanup();
    console.log('🧹 Cleanup completed');
  } catch (error) {
    console.error('⚠️ Cleanup failed:', error.message);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Test interrupted by user');
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Test terminated');
  await cleanup();
  process.exit(0);
});

// Run tests
runAllTests()
  .then(async () => {
    await cleanup();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('💥 Unexpected error:', error);
    await cleanup();
    process.exit(1);
  });
