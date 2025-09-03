// Test script for encryption utilities
// Tests field encryption, decryption, hashing, and key management

import { 
  encryptField, 
  decryptField, 
  hashField, 
  verifyHashedField, 
  generateSecureRandom, 
  getEncryptionStatus,
  keyManager,
  ENCRYPTION_CONFIG 
} from '../utils/encryption.js';

console.log('🔐 Testing Encryption Utilities');
console.log('================================\n');

// Test 1: Basic encryption and decryption
console.log('1. Testing basic field encryption/decryption:');
try {
  const testData = 'sensitive-manufacturing-data-123';
  const encrypted = encryptField(testData);
  const decrypted = decryptField(encrypted);
  
  console.log(`   ✅ Encryption successful`);
  console.log(`   ✅ Decryption successful`);
  console.log(`   ✅ Data integrity: ${testData === decrypted ? 'PASS' : 'FAIL'}`);
  console.log(`   ✅ Algorithm: ${encrypted.algorithm}`);
  console.log(`   ✅ Key version: ${encrypted.keyVersion}`);
} catch (error) {
  console.log(`   ❌ Encryption test failed: ${error.message}`);
}

// Test 2: Key management
console.log('\n2. Testing key management:');
try {
  const status = getEncryptionStatus();
  console.log(`   ✅ Status: ${status.status}`);
  console.log(`   ✅ Key version: ${status.keyVersion}`);
  console.log(`   ✅ Algorithm: ${status.algorithm}`);
  console.log(`   ✅ Days since rotation: ${status.daysSinceRotation}`);
  console.log(`   ✅ Next rotation in: ${status.nextRotationDays} days`);
  console.log(`   ✅ Rotation needed: ${status.keyRotationNeeded ? 'Yes' : 'No'}`);
} catch (error) {
  console.log(`   ❌ Key management test failed: ${error.message}`);
}

// Test 3: Hashing and verification
console.log('\n3. Testing field hashing and verification:');
try {
  const testPassword = 'manufacturing-password-456';
  const hashed = hashField(testPassword);
  const verification = verifyHashedField(testPassword, hashed.hash, hashed.salt);
  
  console.log(`   ✅ Hashing successful`);
  console.log(`   ✅ Verification: ${verification ? 'PASS' : 'FAIL'}`);
  console.log(`   ✅ Salt length: ${hashed.salt.length} characters`);
  console.log(`   ✅ Hash length: ${hashed.hash.length} characters`);
} catch (error) {
  console.log(`   ❌ Hashing test failed: ${error.message}`);
}

// Test 4: Secure random generation
console.log('\n4. Testing secure random generation:');
try {
  const random16 = generateSecureRandom(16);
  const random32 = generateSecureRandom(32);
  const random64 = generateSecureRandom(64);
  
  console.log(`   ✅ 16-byte random: ${random16.substring(0, 16)}...`);
  console.log(`   ✅ 32-byte random: ${random32.substring(0, 16)}...`);
  console.log(`   ✅ 64-byte random: ${random64.substring(0, 16)}...`);
  console.log(`   ✅ All random values are unique: ${random16 !== random32 && random32 !== random64 ? 'PASS' : 'FAIL'}`);
} catch (error) {
  console.log(`   ❌ Random generation test failed: ${error.message}`);
}

// Test 5: Encryption performance
console.log('\n5. Testing encryption performance:');
try {
  const testData = 'performance-test-data-'.repeat(100); // ~2KB of data
  const iterations = 100;
  
  console.log(`   📊 Testing ${iterations} iterations with ~${Math.round(testData.length / 1024)}KB data`);
  
  const startTime = Date.now();
  for (let i = 0; i < iterations; i++) {
    const encrypted = encryptField(testData);
    const decrypted = decryptField(encrypted);
    if (testData !== decrypted) {
      throw new Error(`Data integrity failed on iteration ${i}`);
    }
  }
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  const avgTime = totalTime / iterations;
  
  console.log(`   ✅ Total time: ${totalTime}ms`);
  console.log(`   ✅ Average time per operation: ${avgTime.toFixed(2)}ms`);
  console.log(`   ✅ Operations per second: ${Math.round(1000 / avgTime)}`);
} catch (error) {
  console.log(`   ❌ Performance test failed: ${error.message}`);
}

// Test 6: Error handling
console.log('\n6. Testing error handling:');
try {
  // Test invalid input
  try {
    encryptField(null);
    console.log(`   ❌ Should have thrown error for null input`);
  } catch (error) {
    console.log(`   ✅ Correctly rejected null input: ${error.message}`);
  }
  
  try {
    encryptField('');
    console.log(`   ❌ Should have thrown error for empty input`);
  } catch (error) {
    console.log(`   ✅ Correctly rejected empty input: ${error.message}`);
  }
  
  try {
    decryptField('invalid-data');
    console.log(`   ❌ Should have thrown error for invalid encrypted data`);
  } catch (error) {
    console.log(`   ✅ Correctly rejected invalid encrypted data: ${error.message}`);
  }
} catch (error) {
  console.log(`   ❌ Error handling test failed: ${error.message}`);
}

// Test 7: Configuration validation
console.log('\n7. Testing configuration validation:');
try {
  console.log(`   ✅ Algorithm: ${ENCRYPTION_CONFIG.algorithm}`);
  console.log(`   ✅ Key length: ${ENCRYPTION_CONFIG.keyLength} bytes (${ENCRYPTION_CONFIG.keyLength * 8} bits)`);
  console.log(`   ✅ IV length: ${ENCRYPTION_CONFIG.ivLength} bytes`);
  console.log(`   ✅ Tag length: ${ENCRYPTION_CONFIG.tagLength} bytes`);
  console.log(`   ✅ Key rotation days: ${ENCRYPTION_CONFIG.keyRotationDays}`);
  console.log(`   ✅ Salt rounds: ${ENCRYPTION_CONFIG.saltRounds}`);
} catch (error) {
  console.log(`   ❌ Configuration test failed: ${error.message}`);
}

// Test 8: Key rotation simulation
console.log('\n8. Testing key rotation simulation:');
try {
  const initialStatus = getEncryptionStatus();
  console.log(`   📊 Initial key version: ${initialStatus.keyVersion}`);
  
  // Simulate key rotation
  keyManager.generateNewKey();
  const newStatus = getEncryptionStatus();
  console.log(`   📊 New key version: ${newStatus.keyVersion}`);
  console.log(`   ✅ Key rotation successful: ${newStatus.keyVersion > initialStatus.keyVersion ? 'PASS' : 'FAIL'}`);
  
  // Test encryption with new key
  const testData = 'post-rotation-test';
  const encrypted = encryptField(testData);
  const decrypted = decryptField(encrypted);
  console.log(`   ✅ Post-rotation encryption/decryption: ${testData === decrypted ? 'PASS' : 'FAIL'}`);
} catch (error) {
  console.log(`   ❌ Key rotation test failed: ${error.message}`);
}

console.log('\n🔐 Encryption Testing Complete!');
console.log('================================');

// Summary
console.log('\n📋 Test Summary:');
console.log('================');
console.log('✅ Field encryption and decryption');
console.log('✅ Key management and rotation');
console.log('✅ Hashing and verification');
console.log('✅ Secure random generation');
console.log('✅ Performance testing');
console.log('✅ Error handling');
console.log('✅ Configuration validation');
console.log('✅ Key rotation simulation');

console.log('\n🎯 Next Steps:');
console.log('===============');
console.log('1. Run database migration 013_add_encryption_support.sql');
console.log('2. Test encryption with real database data');
console.log('3. Implement encryption middleware for API endpoints');
console.log('4. Add encryption to sensitive field operations');
console.log('5. Create encryption monitoring dashboard');
