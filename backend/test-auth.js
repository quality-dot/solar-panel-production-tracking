#!/usr/bin/env node

/**
 * Basic Authentication System Test
 * Tests core authentication functionality without external dependencies
 */

import { User } from './models/User.js';
import { USER_ROLES } from './utils/permissions.js';
import { generateAccessToken, generateRefreshToken, verifyToken, TOKEN_TYPES } from './utils/jwt.js';
import { hashPassword, comparePassword } from './utils/password.js';

// Mock user data for testing
const testUserData = {
  id: 'test-user-123',
  username: 'testuser',
  email: 'test@example.com',
  password: 'SecurePass789',
  role: USER_ROLES.STATION_INSPECTOR,
  station_assignments: [1, 2],
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  last_login: null,
  token_version: 1,
  failed_login_attempts: 0,
  locked_until: null
};

console.log('🧪 Testing Authentication System...\n');

// Test 1: Password Hashing
console.log('1. Testing Password Hashing...');
try {
  const hashedPassword = await hashPassword(testUserData.password);
  const isPasswordValid = await comparePassword(testUserData.password, hashedPassword);
  
  if (isPasswordValid) {
    console.log('✅ Password hashing and verification working');
  } else {
    console.log('❌ Password verification failed');
  }
} catch (error) {
  console.log('❌ Password hashing failed:', error.message);
}

// Test 2: JWT Token Generation
console.log('\n2. Testing JWT Token Generation...');
try {
  const accessToken = generateAccessToken(testUserData);
  const refreshToken = generateRefreshToken(testUserData);
  
  if (accessToken && refreshToken) {
    console.log('✅ JWT token generation working');
    console.log(`   Access token length: ${accessToken.length}`);
    console.log(`   Refresh token length: ${refreshToken.length}`);
  } else {
    console.log('❌ JWT token generation failed');
  }
} catch (error) {
  console.log('❌ JWT token generation failed:', error.message);
}

// Test 3: User Model Creation
console.log('\n3. Testing User Model Creation...');
try {
  const testUser = new User(testUserData);
  
  if (testUser.username === testUserData.username && 
      testUser.role === testUserData.role) {
    console.log('✅ User model creation working');
    console.log(`   Username: ${testUser.username}`);
    console.log(`   Role: ${testUser.role}`);
    console.log(`   Station assignments: ${testUser.station_assignments.join(', ')}`);
  } else {
    console.log('❌ User model creation failed');
  }
} catch (error) {
  console.log('❌ User model creation failed:', error.message);
}

// Test 4: Station Access Logic
console.log('\n4. Testing Station Access Logic...');
try {
  const testUser = new User(testUserData);
  
  const hasAccessToStation1 = testUser.hasStationAccess(1);
  const hasAccessToStation5 = testUser.hasStationAccess(5);
  
  if (hasAccessToStation1 && !hasAccessToStation5) {
    console.log('✅ Station access logic working');
    console.log(`   Access to Station 1: ${hasAccessToStation1}`);
    console.log(`   Access to Station 5: ${hasAccessToStation5}`);
  } else {
    console.log('❌ Station access logic failed');
  }
} catch (error) {
  console.log('❌ Station access logic failed:', error.message);
}

console.log('\n🎯 Authentication System Test Complete!');
console.log('Note: This is a basic test. Full integration testing requires database connection.');
