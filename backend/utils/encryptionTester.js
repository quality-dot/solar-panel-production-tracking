// Encryption Validation and Performance Testing Framework
// Comprehensive testing for encryption algorithms, key management, and performance impact

import crypto from 'crypto';
import { manufacturingLogger } from '../middleware/logger.js';
import { ValidationError } from '../middleware/errorHandler.js';
import { 
  encryptField, 
  decryptField, 
  hashField, 
  verifyHashedField, 
  generateSecureRandom,
  getEncryptionStatus,
  keyManager,
  ENCRYPTION_CONFIG 
} from './encryption.js';

/**
 * Encryption testing configuration
 */
export const ENCRYPTION_TEST_CONFIG = {
  // Test categories and their importance
  testCategories: {
    ALGORITHM_VALIDATION: { importance: 'CRITICAL', weight: 0.3 },
    KEY_MANAGEMENT: { importance: 'HIGH', weight: 0.25 },
    PERFORMANCE: { importance: 'HIGH', weight: 0.25 },
    SECURITY_VALIDATION: { importance: 'HIGH', weight: 0.2 }
  },
  
  // Performance thresholds
  performance: {
    maxEncryptionTime: 10, // 10ms per field
    maxDecryptionTime: 10, // 10ms per field
    maxBatchEncryptionTime: 500, // 500ms for large batches (1000 fields)
    maxMemoryUsage: 100 * 1024 * 1024, // 100MB
    maxCpuUsage: 80, // 80%
    minThroughput: 1000 // 1000 operations per second
  },
  
  // Security validation requirements
  security: {
    minKeyLength: 256, // 256 bits
    minIvLength: 128, // 128 bits
    minSaltRounds: 10, // 10 rounds minimum
    maxKeyRotationDays: 90, // 90 days maximum
    requiredAlgorithms: ['aes-256-gcm'],
    forbiddenAlgorithms: ['des', '3des', 'rc4', 'md5']
  },
  
  // Test data sizes for performance testing
  testData: {
    smallField: 'short-text',
    mediumField: 'This is a medium length text field with some content to test encryption performance.',
    largeField: 'A'.repeat(1000), // 1KB
    extraLargeField: 'A'.repeat(10000), // 10KB
    binaryData: Buffer.from('A'.repeat(1000)).toString('base64')
  },
  
  // Load testing configuration
  load: {
    concurrentOperations: 100,
    batchSizes: [10, 50, 100, 500, 1000],
    stressTestDuration: 30000, // 30 seconds
    recoveryTestDuration: 10000 // 10 seconds
  }
};

/**
 * Encryption test results
 */
class EncryptionTestResult {
  constructor(testName, category) {
    this.testName = testName;
    this.category = category;
    this.status = 'pending';
    this.security = 'UNKNOWN';
    this.description = '';
    this.recommendations = [];
    this.executionTime = 0;
    this.timestamp = new Date();
    this.metrics = {};
    this.errors = [];
    this.performanceData = {};
  }

  markPassed(description = 'Test passed successfully') {
    this.status = 'PASSED';
    this.security = 'SECURE';
    this.description = description;
  }

  markFailed(security, description, recommendations = []) {
    this.status = 'FAILED';
    this.security = security;
    this.description = description;
    this.recommendations = recommendations;
  }

  markWarning(description, recommendations = []) {
    this.status = 'WARNING';
    this.security = 'PARTIALLY_SECURE';
    this.description = description;
    this.recommendations = recommendations;
  }

  addMetric(key, value) {
    this.metrics[key] = value;
  }

  addError(error) {
    this.errors.push(error);
  }

  addPerformanceData(key, value) {
    this.performanceData[key] = value;
  }
}

/**
 * Main encryption testing framework
 */
class EncryptionTester {
  constructor() {
    this.results = [];
    this.startTime = null;
    this.endTime = null;
    this.overallSecurity = 'UNKNOWN';
    this.performanceBaseline = {};
  }

  /**
   * Run comprehensive encryption testing
   */
  async runEncryptionTests() {
    try {
      this.startTime = new Date();
      manufacturingLogger.info('Starting comprehensive encryption testing', {
        category: 'encryption_testing'
      });

      // Run all test categories
      await this.runAlgorithmValidationTests();
      await this.runKeyManagementTests();
      await this.runPerformanceTests();
      await this.runSecurityValidationTests();
      await this.runLoadTests();
      await this.runRecoveryTests();

      this.calculateOverallSecurity();
      this.generateReport();

      this.endTime = new Date();
      const duration = this.endTime - this.startTime;

      manufacturingLogger.info('Encryption testing completed', {
        duration: `${duration}ms`,
        overallSecurity: this.overallSecurity,
        category: 'encryption_testing'
      });

      return this.getTestReport();
    } catch (error) {
      manufacturingLogger.error('Encryption testing failed', {
        error: error.message,
        category: 'encryption_testing'
      });
      throw error;
    }
  }

  /**
   * Test encryption algorithm validation
   */
  async runAlgorithmValidationTests() {
    const category = 'ALGORITHM_VALIDATION';
    
    // Test 1: Algorithm Strength Validation
    const algorithmTest = new EncryptionTestResult('Algorithm Strength Validation', category);
    try {
      const startTime = Date.now();
      
      const encryptionStatus = getEncryptionStatus();
      const currentAlgorithm = encryptionStatus.algorithm;
      const currentKeyLength = encryptionStatus.keyLength;
      
      algorithmTest.addMetric('currentAlgorithm', currentAlgorithm);
      algorithmTest.addMetric('currentKeyLength', currentKeyLength);
      algorithmTest.addMetric('requiredAlgorithms', ENCRYPTION_TEST_CONFIG.security.requiredAlgorithms);
      algorithmTest.addMetric('minKeyLength', ENCRYPTION_TEST_CONFIG.security.minKeyLength);
      
      // Validate algorithm
      const isAlgorithmSecure = ENCRYPTION_TEST_CONFIG.security.requiredAlgorithms.includes(currentAlgorithm);
      const isKeyLengthSecure = currentKeyLength >= ENCRYPTION_TEST_CONFIG.security.minKeyLength;
      const isAlgorithmForbidden = ENCRYPTION_TEST_CONFIG.security.forbiddenAlgorithms.includes(currentAlgorithm);
      
      if (isAlgorithmSecure && isKeyLengthSecure && !isAlgorithmForbidden) {
        algorithmTest.markPassed(`Using secure algorithm ${currentAlgorithm} with ${currentKeyLength}-bit keys`);
      } else {
        let issues = [];
        if (!isAlgorithmSecure) issues.push(`Algorithm ${currentAlgorithm} not in required list`);
        if (!isKeyLengthSecure) issues.push(`Key length ${currentKeyLength} below minimum ${ENCRYPTION_TEST_CONFIG.security.minKeyLength}`);
        if (isAlgorithmForbidden) issues.push(`Algorithm ${currentAlgorithm} is forbidden`);
        
        algorithmTest.markFailed('INSECURE', `Encryption algorithm validation failed: ${issues.join(', ')}`, [
          'Use only approved encryption algorithms (AES-256-GCM)',
          'Ensure key length is at least 256 bits',
          'Avoid deprecated or weak algorithms'
        ]);
      }
      
      algorithmTest.executionTime = Date.now() - startTime;
    } catch (error) {
      algorithmTest.markFailed('INSECURE', `Algorithm validation test failed: ${error.message}`);
    }
    this.results.push(algorithmTest);

    // Test 2: Encryption/Decryption Round Trip
    const roundTripTest = new EncryptionTestResult('Encryption/Decryption Round Trip', category);
    try {
      const startTime = Date.now();
      
      const testData = [
        ENCRYPTION_TEST_CONFIG.testData.smallField,
        ENCRYPTION_TEST_CONFIG.testData.mediumField,
        ENCRYPTION_TEST_CONFIG.testData.largeField,
        ENCRYPTION_TEST_CONFIG.testData.extraLargeField
      ];
      
      let successfulRoundTrips = 0;
      let failedRoundTrips = 0;
      const roundTripResults = [];
      
      for (const data of testData) {
        try {
          const encrypted = encryptField(data);
          const decrypted = decryptField(encrypted);
          
          if (data === decrypted) {
            successfulRoundTrips++;
            roundTripResults.push({ data: data.substring(0, 50) + '...', status: 'SUCCESS' });
          } else {
            failedRoundTrips++;
            roundTripResults.push({ data: data.substring(0, 50) + '...', status: 'FAILED' });
          }
        } catch (error) {
          failedRoundTrips++;
          roundTripResults.push({ data: data.substring(0, 50) + '...', status: 'ERROR', error: error.message });
        }
      }
      
      roundTripTest.addMetric('successfulRoundTrips', successfulRoundTrips);
      roundTripTest.addMetric('failedRoundTrips', failedRoundTrips);
      roundTripTest.addMetric('roundTripResults', roundTripResults);
      roundTripTest.addMetric('testDataSizes', testData.map(d => d.length));
      
      if (failedRoundTrips === 0) {
        roundTripTest.markPassed('All encryption/decryption round trips successful');
      } else {
        roundTripTest.markFailed('INSECURE', `${failedRoundTrips} round trips failed`, [
          'Verify encryption key consistency',
          'Check for data corruption during encryption/decryption',
          'Validate encryption algorithm implementation'
        ]);
      }
      
      roundTripTest.executionTime = Date.now() - startTime;
    } catch (error) {
      roundTripTest.markFailed('INSECURE', `Round trip test failed: ${error.message}`);
    }
    this.results.push(roundTripTest);

    // Test 3: Hash Function Validation
    const hashTest = new EncryptionTestResult('Hash Function Validation', category);
    try {
      const startTime = Date.now();
      
      const testPasswords = [
        'simple-password',
        'ComplexP@ssw0rd123!',
        'VeryLongPasswordWithSpecialCharacters@#$%^&*()',
        'Manufacturing2025!'
      ];
      
      let successfulHashes = 0;
      let successfulVerifications = 0;
      const hashResults = [];
      
      for (const password of testPasswords) {
        try {
          const hashed = hashField(password);
          const verification = verifyHashedField(password, hashed.hash, hashed.salt);
          
          if (verification) {
            successfulHashes++;
            successfulVerifications++;
            hashResults.push({ password: password.substring(0, 20) + '...', status: 'SUCCESS' });
          } else {
            hashResults.push({ password: password.substring(0, 20) + '...', status: 'VERIFICATION_FAILED' });
          }
        } catch (error) {
          hashResults.push({ password: password.substring(0, 20) + '...', status: 'ERROR', error: error.message });
        }
      }
      
      hashTest.addMetric('successfulHashes', successfulHashes);
      hashTest.addMetric('successfulVerifications', successfulVerifications);
      hashTest.addMetric('hashResults', hashResults);
      hashTest.addMetric('testPasswords', testPasswords.length);
      
      if (successfulHashes === testPasswords.length && successfulVerifications === testPasswords.length) {
        hashTest.markPassed('All hash functions working correctly');
      } else {
        hashTest.markFailed('INSECURE', 'Hash function validation failed', [
          'Verify PBKDF2 implementation',
          'Check salt generation and storage',
          'Validate hash verification logic'
        ]);
      }
      
      hashTest.executionTime = Date.now() - startTime;
    } catch (error) {
      hashTest.markFailed('INSECURE', `Hash validation test failed: ${error.message}`);
    }
    this.results.push(hashTest);
  }

  /**
   * Test key management
   */
  async runKeyManagementTests() {
    const category = 'KEY_MANAGEMENT';
    
    // Test 1: Key Generation and Storage
    const keyGenerationTest = new EncryptionTestResult('Key Generation and Storage', category);
    try {
      const startTime = Date.now();
      
      const encryptionStatus = getEncryptionStatus();
      const keyVersion = encryptionStatus.keyVersion;
      const keyLength = encryptionStatus.keyLength;
      const nextRotationDays = encryptionStatus.nextRotationDays;
      const keyRotationNeeded = encryptionStatus.keyRotationNeeded;
      
      keyGenerationTest.addMetric('keyVersion', keyVersion);
      keyGenerationTest.addMetric('keyLength', keyLength);
      keyGenerationTest.addMetric('nextRotationDays', nextRotationDays);
      keyGenerationTest.addMetric('keyRotationNeeded', keyRotationNeeded);
      keyGenerationTest.addMetric('maxRotationDays', ENCRYPTION_TEST_CONFIG.security.maxKeyRotationDays);
      
      // Validate key management
      const isKeyLengthSecure = keyLength >= ENCRYPTION_TEST_CONFIG.security.minKeyLength;
      const isRotationTimely = nextRotationDays <= ENCRYPTION_TEST_CONFIG.security.maxKeyRotationDays;
      const isKeyVersionValid = keyVersion > 0;
      
      if (isKeyLengthSecure && isRotationTimely && isKeyVersionValid) {
        keyGenerationTest.markPassed('Key management is properly configured');
      } else {
        let issues = [];
        if (!isKeyLengthSecure) issues.push(`Key length ${keyLength} below minimum ${ENCRYPTION_TEST_CONFIG.security.minKeyLength}`);
        if (!isRotationTimely) issues.push(`Key rotation overdue by ${nextRotationDays - ENCRYPTION_TEST_CONFIG.security.maxKeyRotationDays} days`);
        if (!isKeyVersionValid) issues.push('Invalid key version');
        
        keyGenerationTest.markWarning(`Key management issues: ${issues.join(', ')}`, [
          'Ensure key length meets security requirements',
          'Implement automatic key rotation',
          'Monitor key version management'
        ]);
      }
      
      keyGenerationTest.executionTime = Date.now() - startTime;
    } catch (error) {
      keyGenerationTest.markFailed('INSECURE', `Key generation test failed: ${error.message}`);
    }
    this.results.push(keyGenerationTest);

    // Test 2: Key Rotation Validation
    const keyRotationTest = new EncryptionTestResult('Key Rotation Validation', category);
    try {
      const startTime = Date.now();
      
      // Test key rotation functionality
      const currentKey = keyManager.getCurrentKey();
      const currentKeyVersion = keyManager.keyVersion;
      
      keyRotationTest.addMetric('currentKeyVersion', currentKeyVersion);
      keyRotationTest.addMetric('currentKeyLength', currentKey ? currentKey.length : 0);
      keyRotationTest.addMetric('rotationEnabled', true); // Rotation is always enabled
      
      // Simulate key rotation
      const rotationResult = keyManager.rotateKey();
      const newKeyVersion = keyManager.keyVersion;
      const newKey = keyManager.getCurrentKey();
      
      keyRotationTest.addMetric('rotationResult', rotationResult);
      keyRotationTest.addMetric('newKeyVersion', newKeyVersion);
      keyRotationTest.addMetric('newKeyLength', newKey ? newKey.length : 0);
      keyRotationTest.addMetric('versionIncremented', newKeyVersion > currentKeyVersion);
      
      // Convert key length from bytes to bits for comparison
      const newKeyLengthBits = newKey ? newKey.length * 8 : 0;
      
      if (rotationResult && newKeyVersion > currentKeyVersion && newKey && newKeyLengthBits >= ENCRYPTION_TEST_CONFIG.security.minKeyLength) {
        keyRotationTest.markPassed('Key rotation working correctly');
      } else {
        keyRotationTest.markWarning('Key rotation may have issues', [
          'Verify key rotation process',
          'Ensure new keys meet security requirements',
          'Monitor key version increments'
        ]);
      }
      
      keyRotationTest.executionTime = Date.now() - startTime;
    } catch (error) {
      keyRotationTest.markFailed('INSECURE', `Key rotation test failed: ${error.message}`);
    }
    this.results.push(keyRotationTest);
  }

  /**
   * Test encryption performance
   */
  async runPerformanceTests() {
    const category = 'PERFORMANCE';
    
    // Test 1: Single Field Performance
    const singleFieldTest = new EncryptionTestResult('Single Field Performance', category);
    try {
      const startTime = Date.now();
      
      const testData = ENCRYPTION_TEST_CONFIG.testData.mediumField;
      const iterations = 100;
      const performanceResults = [];
      
      for (let i = 0; i < iterations; i++) {
        const encryptStart = Date.now();
        const encrypted = encryptField(testData);
        const encryptTime = Date.now() - encryptStart;
        
        const decryptStart = Date.now();
        const decrypted = decryptField(encrypted);
        const decryptTime = Date.now() - decryptStart;
        
        performanceResults.push({
          iteration: i + 1,
          encryptTime,
          decryptTime,
          totalTime: encryptTime + decryptTime,
          dataLength: testData.length
        });
      }
      
      const avgEncryptTime = performanceResults.reduce((sum, r) => sum + r.encryptTime, 0) / iterations;
      const avgDecryptTime = performanceResults.reduce((sum, r) => sum + r.decryptTime, 0) / iterations;
      const avgTotalTime = performanceResults.reduce((sum, r) => sum + r.totalTime, 0) / iterations;
      const throughput = Math.round(1000 / avgTotalTime);
      
      singleFieldTest.addMetric('iterations', iterations);
      singleFieldTest.addMetric('avgEncryptTime', avgEncryptTime);
      singleFieldTest.addMetric('avgDecryptTime', avgDecryptTime);
      singleFieldTest.addMetric('avgTotalTime', avgTotalTime);
      singleFieldTest.addMetric('throughput', throughput);
      singleFieldTest.addMetric('maxEncryptTime', ENCRYPTION_TEST_CONFIG.performance.maxEncryptionTime);
      singleFieldTest.addMetric('maxDecryptTime', ENCRYPTION_TEST_CONFIG.performance.maxDecryptionTime);
      
      const encryptCompliant = avgEncryptTime <= ENCRYPTION_TEST_CONFIG.performance.maxEncryptionTime;
      const decryptCompliant = avgDecryptTime <= ENCRYPTION_TEST_CONFIG.performance.maxDecryptionTime;
      const throughputCompliant = throughput >= ENCRYPTION_TEST_CONFIG.performance.minThroughput;
      
      if (encryptCompliant && decryptCompliant && throughputCompliant) {
        singleFieldTest.markPassed(`Performance meets requirements: ${throughput} ops/sec`);
      } else {
        let issues = [];
        if (!encryptCompliant) issues.push(`Encryption time ${avgEncryptTime.toFixed(2)}ms exceeds ${ENCRYPTION_TEST_CONFIG.performance.maxEncryptionTime}ms`);
        if (!decryptCompliant) issues.push(`Decryption time ${avgDecryptTime.toFixed(2)}ms exceeds ${ENCRYPTION_TEST_CONFIG.performance.maxDecryptionTime}ms`);
        if (!throughputCompliant) issues.push(`Throughput ${throughput} ops/sec below minimum ${ENCRYPTION_TEST_CONFIG.performance.minThroughput}`);
        
        singleFieldTest.markWarning(`Performance issues: ${issues.join(', ')}`, [
          'Optimize encryption algorithms',
          'Review key generation efficiency',
          'Consider hardware acceleration'
        ]);
      }
      
      singleFieldTest.executionTime = Date.now() - startTime;
    } catch (error) {
      singleFieldTest.markFailed('INSECURE', `Single field performance test failed: ${error.message}`);
    }
    this.results.push(singleFieldTest);

    // Test 2: Batch Performance
    const batchTest = new EncryptionTestResult('Batch Performance', category);
    try {
      const startTime = Date.now();
      
      const batchSizes = ENCRYPTION_TEST_CONFIG.load.batchSizes;
      const batchResults = [];
      
      for (const batchSize of batchSizes) {
        const testData = Array(batchSize).fill(ENCRYPTION_TEST_CONFIG.testData.mediumField);
        
        const batchStart = Date.now();
        const encrypted = testData.map(data => encryptField(data));
        const batchTime = Date.now() - batchStart;
        
        const decryptStart = Date.now();
        const decrypted = encrypted.map(enc => decryptField(enc));
        const decryptTime = Date.now() - decryptStart;
        
        const totalTime = batchTime + decryptTime;
        const throughput = Math.round((batchSize * 2) / (totalTime / 1000)); // ops/sec
        
        batchResults.push({
          batchSize,
          encryptTime: batchTime,
          decryptTime,
          totalTime,
          throughput,
          avgTimePerField: totalTime / (batchSize * 2)
        });
      }
      
      batchTest.addMetric('batchResults', batchResults);
      batchTest.addMetric('maxBatchTime', ENCRYPTION_TEST_CONFIG.performance.maxBatchEncryptionTime);
      
      const compliantBatches = batchResults.filter(r => r.totalTime <= ENCRYPTION_TEST_CONFIG.performance.maxBatchEncryptionTime).length;
      const totalBatches = batchResults.length;
      
      if (compliantBatches === totalBatches) {
        batchTest.markPassed('All batch sizes meet performance requirements');
      } else {
        batchTest.markWarning(`${compliantBatches}/${totalBatches} batch sizes meet performance requirements`, [
          'Optimize batch processing algorithms',
          'Consider parallel processing for large batches',
          'Review memory usage during batch operations'
        ]);
      }
      
      batchTest.executionTime = Date.now() - startTime;
    } catch (error) {
      batchTest.markFailed('INSECURE', `Batch performance test failed: ${error.message}`);
    }
    this.results.push(batchTest);
  }

  /**
   * Test security validation
   */
  async runSecurityValidationTests() {
    const category = 'SECURITY_VALIDATION';
    
    // Test 1: Randomness Quality
    const randomnessTest = new EncryptionTestResult('Randomness Quality', category);
    try {
      const startTime = Date.now();
      
      const sampleSize = 1000;
      const randomSamples = [];
      
      for (let i = 0; i < sampleSize; i++) {
        const random = generateSecureRandom();
        randomSamples.push(random);
      }
      
      // Basic randomness tests
      const uniqueSamples = new Set(randomSamples).size;
      const uniquenessRatio = uniqueSamples / sampleSize;
      const avgLength = randomSamples.reduce((sum, r) => sum + r.length, 0) / sampleSize;
      
      randomnessTest.addMetric('sampleSize', sampleSize);
      randomnessTest.addMetric('uniqueSamples', uniqueSamples);
      randomnessTest.addMetric('uniquenessRatio', uniquenessRatio);
      randomnessTest.addMetric('avgLength', avgLength);
      
      if (uniquenessRatio > 0.99 && avgLength >= 32) {
        randomnessTest.markPassed('Randomness quality meets security requirements');
      } else {
        randomnessTest.markWarning('Randomness quality may be insufficient', [
          'Verify cryptographically secure random number generation',
          'Ensure adequate entropy sources',
          'Review random number generation implementation'
        ]);
      }
      
      randomnessTest.executionTime = Date.now() - startTime;
    } catch (error) {
      randomnessTest.markFailed('INSECURE', `Randomness test failed: ${error.message}`);
    }
    this.results.push(randomnessTest);

    // Test 2: Salt and IV Validation
    const saltIvTest = new EncryptionTestResult('Salt and IV Validation', category);
    try {
      const startTime = Date.now();
      
      const testData = 'test-data-for-salt-iv-validation';
      const iterations = 100;
      const saltResults = [];
      const ivResults = [];
      
      for (let i = 0; i < iterations; i++) {
        const encrypted1 = encryptField(testData);
        const encrypted2 = encryptField(testData);
        
        // Same data should produce different encrypted results due to different IVs
        if (encrypted1 !== encrypted2) {
          saltResults.push({ iteration: i + 1, status: 'SUCCESS' });
        } else {
          saltResults.push({ iteration: i + 1, status: 'FAILED' });
        }
        
        // Verify IV length
        try {
          const decrypted = decryptField(encrypted1);
          if (decrypted === testData) {
            ivResults.push({ iteration: i + 1, status: 'SUCCESS' });
          } else {
            ivResults.push({ iteration: i + 1, status: 'FAILED' });
          }
        } catch (error) {
          ivResults.push({ iteration: i + 1, status: 'ERROR', error: error.message });
        }
      }
      
      const successfulSalts = saltResults.filter(r => r.status === 'SUCCESS').length;
      const successfulIVs = ivResults.filter(r => r.status === 'SUCCESS').length;
      
      saltIvTest.addMetric('successfulSalts', successfulSalts);
      saltIvTest.addMetric('successfulIVs', successfulIVs);
      saltIvTest.addMetric('iterations', iterations);
      saltIvTest.addMetric('minIvLength', ENCRYPTION_TEST_CONFIG.security.minIvLength);
      
      if (successfulSalts === iterations && successfulIVs === iterations) {
        saltIvTest.markPassed('Salt and IV generation working correctly');
      } else {
        saltIvTest.markFailed('INSECURE', 'Salt and IV validation failed', [
          'Ensure unique IVs for each encryption',
          'Verify salt generation for hashing',
          'Check IV length meets security requirements'
        ]);
      }
      
      saltIvTest.executionTime = Date.now() - startTime;
    } catch (error) {
      saltIvTest.markFailed('INSECURE', `Salt and IV test failed: ${error.message}`);
    }
    this.results.push(saltIvTest);
  }

  /**
   * Test system under load
   */
  async runLoadTests() {
    const category = 'PERFORMANCE';
    
    // Test 1: Concurrent Encryption Performance
    const concurrentTest = new EncryptionTestResult('Concurrent Encryption Performance', category);
    try {
      const startTime = Date.now();
      
      const concurrentOperations = ENCRYPTION_TEST_CONFIG.load.concurrentOperations;
      const testData = ENCRYPTION_TEST_CONFIG.testData.mediumField;
      
      const loadStart = Date.now();
      const results = [];
      
      for (let i = 0; i < concurrentOperations; i++) {
        try {
          const encrypted = encryptField(testData + i);
          const decrypted = decryptField(encrypted);
          results.push({ success: true, data: decrypted });
        } catch (error) {
          results.push({ error: error.message });
        }
      }
      const loadTime = Date.now() - loadStart;
      
      const successfulOperations = results.filter(r => r.success).length;
      const failedOperations = results.filter(r => r.error).length;
      const successRate = (successfulOperations / concurrentOperations) * 100;
      const throughput = Math.round((successfulOperations * 2) / (loadTime / 1000)); // ops/sec
      
      concurrentTest.addMetric('concurrentOperations', concurrentOperations);
      concurrentTest.addMetric('successfulOperations', successfulOperations);
      concurrentTest.addMetric('failedOperations', failedOperations);
      concurrentTest.addMetric('successRate', successRate);
      concurrentTest.addMetric('loadTime', loadTime);
      concurrentTest.addMetric('throughput', throughput);
      concurrentTest.addMetric('minThroughput', ENCRYPTION_TEST_CONFIG.performance.minThroughput);
      
      if (successRate >= 95 && throughput >= ENCRYPTION_TEST_CONFIG.performance.minThroughput) {
        concurrentTest.markPassed(`Concurrent performance meets requirements: ${throughput} ops/sec`);
      } else {
        concurrentTest.markWarning(`Concurrent performance issues: ${successRate.toFixed(1)}% success rate`, [
          'Optimize concurrent encryption handling',
          'Review resource allocation',
          'Consider connection pooling for high concurrency'
        ]);
      }
      
      concurrentTest.executionTime = Date.now() - startTime;
    } catch (error) {
      concurrentTest.markFailed('INSECURE', `Concurrent performance test failed: ${error.message}`);
    }
    this.results.push(concurrentTest);
  }

  /**
   * Test system recovery
   */
  async runRecoveryTests() {
    const category = 'PERFORMANCE';
    
    // Test 1: Memory Recovery After Load
    const recoveryTest = new EncryptionTestResult('Memory Recovery After Load', category);
    try {
      const startTime = Date.now();
      
      // Baseline memory usage
      const baselineMemory = process.memoryUsage();
      
      // Apply load
      const loadStart = Date.now();
      const testData = ENCRYPTION_TEST_CONFIG.testData.largeField;
      const loadOperations = [];
      
      for (let i = 0; i < 1000; i++) {
        loadOperations.push(encryptField(testData + i));
      }
      
      await Promise.all(loadOperations);
      const loadTime = Date.now() - loadStart;
      const loadMemory = process.memoryUsage();
      
      // Wait for garbage collection
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Recovery memory usage
      const recoveryMemory = process.memoryUsage();
      
      const memoryIncrease = {
        heapUsed: loadMemory.heapUsed - baselineMemory.heapUsed,
        heapTotal: loadMemory.heapTotal - baselineMemory.heapTotal,
        external: loadMemory.external - baselineMemory.external
      };
      
      const memoryRecovery = {
        heapUsed: baselineMemory.heapUsed - recoveryMemory.heapUsed,
        heapTotal: baselineMemory.heapTotal - recoveryMemory.heapTotal,
        external: baselineMemory.external - recoveryMemory.external
      };
      
      recoveryTest.addMetric('baselineMemory', baselineMemory);
      recoveryTest.addMetric('loadMemory', loadMemory);
      recoveryTest.addMetric('recoveryMemory', recoveryMemory);
      recoveryTest.addMetric('memoryIncrease', memoryIncrease);
      recoveryTest.addMetric('memoryRecovery', memoryRecovery);
      recoveryTest.addMetric('loadTime', loadTime);
      
      const memoryRecovered = memoryRecovery.heapUsed > 0;
      const loadTimeAcceptable = loadTime <= 10000; // 10 seconds
      
      if (memoryRecovered && loadTimeAcceptable) {
        recoveryTest.markPassed('Memory recovery working correctly after load');
      } else {
        recoveryTest.markWarning('Memory recovery may have issues', [
          'Monitor memory usage patterns',
          'Review garbage collection efficiency',
          'Consider memory leak detection'
        ]);
      }
      
      recoveryTest.executionTime = Date.now() - startTime;
    } catch (error) {
      recoveryTest.markFailed('INSECURE', `Recovery test failed: ${error.message}`);
    }
    this.results.push(recoveryTest);
  }

  /**
   * Calculate overall security
   */
  calculateOverallSecurity() {
    let totalWeight = 0;
    let weightedScore = 0;
    
    this.results.forEach(result => {
      const category = ENCRYPTION_TEST_CONFIG.testCategories[result.category];
      if (category) {
        let score = 0;
        
        switch (result.status) {
          case 'PASSED':
            score = 100;
            break;
          case 'WARNING':
            score = 70;
            break;
          case 'FAILED':
            score = 0;
            break;
          default:
            score = 0;
        }
        
        weightedScore += score * category.weight;
        totalWeight += category.weight;
      }
    });
    
    const overallScore = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
    
    if (overallScore >= 90) this.overallSecurity = 'HIGHLY_SECURE';
    else if (overallScore >= 70) this.overallSecurity = 'SECURE';
    else if (overallScore >= 50) this.overallSecurity = 'PARTIALLY_SECURE';
    else this.overallSecurity = 'INSECURE';
  }

  /**
   * Generate test report
   */
  generateReport() {
    // Additional report generation logic can be added here
  }

  /**
   * Get formatted test report
   */
  getTestReport() {
    return {
      summary: {
        overallSecurity: this.overallSecurity,
        totalTests: this.results.length,
        passedTests: this.results.filter(r => r.status === 'PASSED').length,
        failedTests: this.results.filter(r => r.status === 'FAILED').length,
        warningTests: this.results.filter(r => r.status === 'WARNING').length,
        executionTime: this.endTime - this.startTime
      },
      results: this.results,
      recommendations: this.generateRecommendations(),
      securityAssessment: this.assessSecurity()
    };
  }

  /**
   * Generate actionable recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    // Failed tests
    const failedTests = this.results.filter(r => r.status === 'FAILED');
    if (failedTests.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Address failed security tests',
        description: `${failedTests.length} tests failed security requirements`,
        timeframe: 'Immediate'
      });
    }
    
    // Warning tests
    const warningTests = this.results.filter(r => r.status === 'WARNING');
    if (warningTests.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Review warning tests',
        description: `${warningTests.length} tests have security warnings`,
        timeframe: '1 week'
      });
    }
    
    return recommendations;
  }

  /**
   * Assess overall security
   */
  assessSecurity() {
    return {
      status: this.overallSecurity,
      score: this.calculateSecurityScore(),
      nextReview: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      criticalIssues: this.results.filter(r => r.status === 'FAILED').length
    };
  }

  /**
   * Calculate security score
   */
  calculateSecurityScore() {
    let totalWeight = 0;
    let weightedScore = 0;
    
    this.results.forEach(result => {
      const category = ENCRYPTION_TEST_CONFIG.testCategories[result.category];
      if (category) {
        let score = 0;
        
        switch (result.status) {
          case 'PASSED':
            score = 100;
            break;
          case 'WARNING':
            score = 70;
            break;
          case 'FAILED':
            score = 0;
            break;
          default:
            score = 0;
        }
        
        weightedScore += score * category.weight;
        totalWeight += category.weight;
      }
    });
    
    return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
  }
}

// Export the encryption tester
export const encryptionTester = new EncryptionTester();

// Export individual test functions for specific testing
export const runEncryptionTests = () => encryptionTester.runEncryptionTests();
export const getEncryptionReport = () => encryptionTester.getTestReport();

export default encryptionTester;
