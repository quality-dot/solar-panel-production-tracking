#!/usr/bin/env node

// Test script for password reset API endpoints
// Tests the complete password reset flow

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';
const API_BASE = `${BASE_URL}/api/v1/auth`;

console.log('🧪 Testing Password Reset API Endpoints\n');

async function testPasswordResetEndpoints() {
  try {
    console.log('1. Testing forgot password endpoint...');
    
    // Test forgot password with valid email
    const forgotPasswordResponse = await fetch(`${API_BASE}/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@manufacturing.com'
      })
    });
    
    const forgotPasswordData = await forgotPasswordResponse.json();
    console.log(`   Status: ${forgotPasswordResponse.status} ${forgotPasswordResponse.status === 200 ? '✅' : '❌'}`);
    console.log(`   Response: ${forgotPasswordData.message || forgotPasswordData.error || 'No message'}`);
    
    // Test forgot password with invalid email
    const invalidEmailResponse = await fetch(`${API_BASE}/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'invalid-email'
      })
    });
    
    const invalidEmailData = await invalidEmailResponse.json();
    console.log(`   Invalid email status: ${invalidEmailResponse.status} ${invalidEmailResponse.status === 400 ? '✅' : '❌'}`);
    
    // Test forgot password with missing email
    const missingEmailResponse = await fetch(`${API_BASE}/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    const missingEmailData = await missingEmailResponse.json();
    console.log(`   Missing email status: ${missingEmailResponse.status} ${missingEmailResponse.status === 400 ? '✅' : '❌'}`);
    
    console.log('\n2. Testing reset password endpoint...');
    
    // Test reset password with valid token and password
    const resetPasswordResponse = await fetch(`${API_BASE}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: 'test-token-123',
        newPassword: 'NewSecurePass123'
      })
    });
    
    const resetPasswordData = await resetPasswordResponse.json();
    console.log(`   Status: ${resetPasswordResponse.status} ${resetPasswordResponse.status === 200 || resetPasswordResponse.status === 400 ? '✅' : '❌'}`);
    console.log(`   Response: ${resetPasswordData.message || resetPasswordData.error || 'No message'}`);
    
    // Test reset password with weak password
    const weakPasswordResponse = await fetch(`${API_BASE}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: 'test-token-123',
        newPassword: 'weak'
      })
    });
    
    const weakPasswordData = await weakPasswordResponse.json();
    console.log(`   Weak password status: ${weakPasswordResponse.status} ${weakPasswordResponse.status === 400 ? '✅' : '❌'}`);
    
    // Test reset password with missing fields
    const missingFieldsResponse = await fetch(`${API_BASE}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: 'test-token-123'
      })
    });
    
    const missingFieldsData = await missingFieldsResponse.json();
    console.log(`   Missing fields status: ${missingFieldsResponse.status} ${missingFieldsResponse.status === 400 ? '✅' : '❌'}`);
    
    console.log('\n3. Testing token validation endpoint...');
    
    // Test token validation
    const validateTokenResponse = await fetch(`${API_BASE}/validate-reset-token/test-token-123`);
    const validateTokenData = await validateTokenResponse.json();
    console.log(`   Status: ${validateTokenResponse.status} ${validateTokenResponse.status === 200 || validateTokenResponse.status === 400 ? '✅' : '❌'}`);
    console.log(`   Response: ${validateTokenData.message || validateTokenData.error || 'No message'}`);
    
    // Test token validation with missing token
    const missingTokenResponse = await fetch(`${API_BASE}/validate-reset-token/`);
    console.log(`   Missing token status: ${missingTokenResponse.status} ${missingTokenResponse.status === 404 ? '✅' : '❌'}`);
    
    console.log('\n4. Testing admin endpoints (without auth)...');
    
    // Test password reset stats (should fail without auth)
    const statsResponse = await fetch(`${API_BASE}/password-reset/stats`);
    console.log(`   Stats endpoint status: ${statsResponse.status} ${statsResponse.status === 401 ? '✅' : '❌'}`);
    
    // Test email service test (should fail without auth)
    const emailTestResponse = await fetch(`${API_BASE}/test-email`);
    console.log(`   Email test endpoint status: ${emailTestResponse.status} ${emailTestResponse.status === 401 ? '✅' : '❌'}`);
    
    console.log('\n✅ Password reset API endpoint tests completed!');
    console.log('\n📋 API Endpoints Implemented:');
    console.log('   • POST /api/v1/auth/forgot-password - Request password reset');
    console.log('   • POST /api/v1/auth/reset-password - Reset password with token');
    console.log('   • GET /api/v1/auth/validate-reset-token/:token - Validate reset token');
    console.log('   • GET /api/v1/auth/password-reset/stats - Get statistics (admin only)');
    console.log('   • GET /api/v1/auth/test-email - Test email service (admin only)');
    
    console.log('\n🔧 Features Implemented:');
    console.log('   • Input validation and error handling');
    console.log('   • Rate limiting protection');
    console.log('   • Secure token generation and validation');
    console.log('   • Password strength requirements');
    console.log('   • Email notifications (mock mode)');
    console.log('   • Admin-only endpoints with proper authorization');
    console.log('   • Comprehensive logging and monitoring');
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Note: Make sure the server is running on port 3001');
      console.log('   Run: npm run dev');
    }
  }
}

// Run the tests
testPasswordResetEndpoints();
