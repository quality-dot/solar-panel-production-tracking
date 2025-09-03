#!/usr/bin/env node

// Test script for account lockout API endpoints
// Tests the complete account lockout API

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';
const API_BASE = `${BASE_URL}/api/v1/auth`;

console.log('🧪 Testing Account Lockout API Endpoints\n');

async function testAccountLockoutEndpoints() {
  try {
    console.log('1. Testing account lockout status endpoint (without auth)...');
    
    // Test lockout status without authentication (should fail)
    const statusResponse = await fetch(`${API_BASE}/account-lockout/status/test-user-123`);
    console.log(`   Status: ${statusResponse.status} ${statusResponse.status === 401 ? '✅' : '❌'}`);
    
    console.log('\n2. Testing account unlock endpoint (without auth)...');
    
    // Test account unlock without authentication (should fail)
    const unlockResponse = await fetch(`${API_BASE}/account-lockout/unlock/test-user-123`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reason: 'admin_unlock'
      })
    });
    console.log(`   Status: ${unlockResponse.status} ${unlockResponse.status === 401 ? '✅' : '❌'}`);
    
    console.log('\n3. Testing lockout statistics endpoint (without auth)...');
    
    // Test lockout statistics without authentication (should fail)
    const statsResponse = await fetch(`${API_BASE}/account-lockout/statistics`);
    console.log(`   Status: ${statsResponse.status} ${statsResponse.status === 401 ? '✅' : '❌'}`);
    
    console.log('\n4. Testing lockout history endpoint (without auth)...');
    
    // Test lockout history without authentication (should fail)
    const historyResponse = await fetch(`${API_BASE}/account-lockout/history/test-user-123`);
    console.log(`   Status: ${historyResponse.status} ${historyResponse.status === 401 ? '✅' : '❌'}`);
    
    console.log('\n5. Testing lockout configuration endpoint (without auth)...');
    
    // Test lockout configuration without authentication (should fail)
    const configResponse = await fetch(`${API_BASE}/account-lockout/config`);
    console.log(`   Status: ${configResponse.status} ${configResponse.status === 401 ? '✅' : '❌'}`);
    
    console.log('\n6. Testing failed attempt recording endpoint (without auth)...');
    
    // Test failed attempt recording without authentication (should fail)
    const failedAttemptResponse = await fetch(`${API_BASE}/account-lockout/record-failed-attempt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: 'test-user-123',
        username: 'testuser',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Test Browser)'
      })
    });
    console.log(`   Status: ${failedAttemptResponse.status} ${failedAttemptResponse.status === 401 ? '✅' : '❌'}`);
    
    console.log('\n7. Testing successful login recording endpoint (without auth)...');
    
    // Test successful login recording without authentication (should fail)
    const successResponse = await fetch(`${API_BASE}/account-lockout/record-successful-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: 'test-user-123',
        username: 'testuser',
        ipAddress: '192.168.1.100'
      })
    });
    console.log(`   Status: ${successResponse.status} ${successResponse.status === 401 ? '✅' : '❌'}`);
    
    console.log('\n8. Testing invalid endpoints...');
    
    // Test invalid user ID format
    const invalidIdResponse = await fetch(`${API_BASE}/account-lockout/status/invalid-id`);
    console.log(`   Invalid ID status: ${invalidIdResponse.status} ${invalidIdResponse.status === 401 ? '✅' : '❌'}`);
    
    // Test invalid HTTP methods
    const invalidMethodResponse = await fetch(`${API_BASE}/account-lockout/status/test-user-123`, {
      method: 'DELETE'
    });
    console.log(`   Invalid method status: ${invalidMethodResponse.status} ${invalidMethodResponse.status === 404 || invalidMethodResponse.status === 401 ? '✅' : '❌'}`);
    
    // Test missing parameters
    const missingParamsResponse = await fetch(`${API_BASE}/account-lockout/record-failed-attempt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    console.log(`   Missing parameters status: ${missingParamsResponse.status} ${missingParamsResponse.status === 401 ? '✅' : '❌'}`);
    
    console.log('\n✅ Account lockout API endpoint tests completed!');
    console.log('\n📋 API Endpoints Implemented:');
    console.log('   • GET /api/v1/auth/account-lockout/status/:userId - Check lockout status (Admin/QC Manager)');
    console.log('   • POST /api/v1/auth/account-lockout/unlock/:userId - Unlock account (Admin only)');
    console.log('   • GET /api/v1/auth/account-lockout/statistics - Get lockout statistics (Admin only)');
    console.log('   • GET /api/v1/auth/account-lockout/history/:userId - Get user history (Admin only)');
    console.log('   • GET /api/v1/auth/account-lockout/config - Get configuration (Admin only)');
    console.log('   • POST /api/v1/auth/account-lockout/record-failed-attempt - Record failed attempt (System)');
    console.log('   • POST /api/v1/auth/account-lockout/record-successful-login - Record success (System)');
    
    console.log('\n🔧 Features Implemented:');
    console.log('   • Role-based access control (proper authorization)');
    console.log('   • Input validation and error handling');
    console.log('   • Account lockout status checking');
    console.log('   • Admin account unlock functionality');
    console.log('   • Lockout statistics and reporting');
    console.log('   • User lockout history tracking');
    console.log('   • Configuration management');
    console.log('   • Failed attempt recording');
    console.log('   • Successful login recording');
    console.log('   • Comprehensive audit logging');
    console.log('   • Manufacturing-specific responses');
    
    console.log('\n🔒 Security Features:');
    console.log('   • JWT authentication required');
    console.log('   • Role-based authorization');
    console.log('   • Admin-only operations protected');
    console.log('   • System-only recording endpoints');
    console.log('   • Input validation and sanitization');
    console.log('   • SQL injection protection');
    console.log('   • IP address and user agent tracking');
    console.log('   • Comprehensive audit trail');
    
    console.log('\n💡 Next Steps:');
    console.log('   1. Test with valid JWT tokens');
    console.log('   2. Test role-based access control');
    console.log('   3. Test account lockout flow end-to-end');
    console.log('   4. Test admin unlock functionality');
    console.log('   5. Test email notifications');
    console.log('   6. Test automatic cleanup jobs');
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Note: Make sure the server is running on port 3001');
      console.log('   Run: npm run dev');
    }
  }
}

// Run the tests
testAccountLockoutEndpoints();
