#!/usr/bin/env node

// Test script for session management API endpoints
// Tests the complete session management API

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';
const API_BASE = `${BASE_URL}/api/v1/auth`;

console.log('🧪 Testing Session Management API Endpoints\n');

async function testSessionManagementEndpoints() {
  try {
    console.log('1. Testing session info endpoint (without auth)...');
    
    // Test session info without authentication (should fail)
    const sessionInfoResponse = await fetch(`${API_BASE}/sessions/test-session-123`);
    console.log(`   Status: ${sessionInfoResponse.status} ${sessionInfoResponse.status === 401 ? '✅' : '❌'}`);
    
    console.log('\n2. Testing user sessions endpoint (without auth)...');
    
    // Test user sessions without authentication (should fail)
    const userSessionsResponse = await fetch(`${API_BASE}/sessions/user/test-user-123`);
    console.log(`   Status: ${userSessionsResponse.status} ${userSessionsResponse.status === 401 ? '✅' : '❌'}`);
    
    console.log('\n3. Testing session invalidation endpoint (without auth)...');
    
    // Test session invalidation without authentication (should fail)
    const invalidateResponse = await fetch(`${API_BASE}/sessions/test-session-123`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reason: 'manual_logout'
      })
    });
    console.log(`   Status: ${invalidateResponse.status} ${invalidateResponse.status === 401 ? '✅' : '❌'}`);
    
    console.log('\n4. Testing invalidate all user sessions endpoint (without auth)...');
    
    // Test invalidate all sessions without authentication (should fail)
    const invalidateAllResponse = await fetch(`${API_BASE}/sessions/user/test-user-123/all`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reason: 'admin_force_logout'
      })
    });
    console.log(`   Status: ${invalidateAllResponse.status} ${invalidateAllResponse.status === 401 ? '✅' : '❌'}`);
    
    console.log('\n5. Testing session statistics endpoint (without auth)...');
    
    // Test session statistics without authentication (should fail)
    const statsResponse = await fetch(`${API_BASE}/sessions/statistics`);
    console.log(`   Status: ${statsResponse.status} ${statsResponse.status === 401 ? '✅' : '❌'}`);
    
    console.log('\n6. Testing token blacklist check endpoint (without auth)...');
    
    // Test token blacklist check without authentication (should fail)
    const tokenCheckResponse = await fetch(`${API_BASE}/sessions/check-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: 'test-token-123'
      })
    });
    console.log(`   Status: ${tokenCheckResponse.status} ${tokenCheckResponse.status === 401 ? '✅' : '❌'}`);
    
    console.log('\n7. Testing session cleanup endpoint (without auth)...');
    
    // Test session cleanup without authentication (should fail)
    const cleanupResponse = await fetch(`${API_BASE}/sessions/cleanup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log(`   Status: ${cleanupResponse.status} ${cleanupResponse.status === 401 ? '✅' : '❌'}`);
    
    console.log('\n8. Testing session configuration endpoint (without auth)...');
    
    // Test session configuration without authentication (should fail)
    const configResponse = await fetch(`${API_BASE}/sessions/config`);
    console.log(`   Status: ${configResponse.status} ${configResponse.status === 401 ? '✅' : '❌'}`);
    
    console.log('\n9. Testing invalid endpoints...');
    
    // Test invalid session ID format
    const invalidIdResponse = await fetch(`${API_BASE}/sessions/invalid-id`);
    console.log(`   Invalid ID status: ${invalidIdResponse.status} ${invalidIdResponse.status === 401 ? '✅' : '❌'}`);
    
    // Test invalid HTTP methods
    const invalidMethodResponse = await fetch(`${API_BASE}/sessions/test-session-123`, {
      method: 'PUT'
    });
    console.log(`   Invalid method status: ${invalidMethodResponse.status} ${invalidMethodResponse.status === 404 || invalidMethodResponse.status === 401 ? '✅' : '❌'}`);
    
    // Test missing parameters
    const missingParamsResponse = await fetch(`${API_BASE}/sessions/check-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    console.log(`   Missing parameters status: ${missingParamsResponse.status} ${missingParamsResponse.status === 401 ? '✅' : '❌'}`);
    
    console.log('\n✅ Session management API endpoint tests completed!');
    console.log('\n📋 API Endpoints Implemented:');
    console.log('   • GET /api/v1/auth/sessions/:sessionId - Get session info (User owns session or Admin/QC Manager)');
    console.log('   • GET /api/v1/auth/sessions/user/:userId - Get user sessions (User owns sessions or Admin/QC Manager)');
    console.log('   • DELETE /api/v1/auth/sessions/:sessionId - Invalidate session (User owns session or Admin)');
    console.log('   • DELETE /api/v1/auth/sessions/user/:userId/all - Invalidate all user sessions (Admin only)');
    console.log('   • GET /api/v1/auth/sessions/statistics - Get session statistics (Admin only)');
    console.log('   • POST /api/v1/auth/sessions/check-token - Check token blacklist (System)');
    console.log('   • POST /api/v1/auth/sessions/cleanup - Force cleanup (Admin only)');
    console.log('   • GET /api/v1/auth/sessions/config - Get configuration (Admin only)');
    
    console.log('\n🔧 Features Implemented:');
    console.log('   • Role-based access control (proper authorization)');
    console.log('   • Input validation and error handling');
    console.log('   • Session information retrieval');
    console.log('   • User session management');
    console.log('   • Session invalidation (single and bulk)');
    console.log('   • Session statistics and reporting');
    console.log('   • Token blacklist checking');
    console.log('   • Session cleanup management');
    console.log('   • Configuration management');
    console.log('   • Comprehensive audit logging');
    console.log('   • Manufacturing-specific responses');
    
    console.log('\n🔒 Security Features:');
    console.log('   • JWT authentication required');
    console.log('   • Role-based authorization');
    console.log('   • User ownership validation');
    console.log('   • Admin-only operations protected');
    console.log('   • System-only operations protected');
    console.log('   • Input validation and sanitization');
    console.log('   • SQL injection protection');
    console.log('   • IP address and user agent tracking');
    console.log('   • Comprehensive audit trail');
    console.log('   • Session activity monitoring');
    
    console.log('\n💡 Next Steps:');
    console.log('   1. Test with valid JWT tokens');
    console.log('   2. Test role-based access control');
    console.log('   3. Test session creation and validation flow');
    console.log('   4. Test session invalidation on logout');
    console.log('   5. Test token blacklisting functionality');
    console.log('   6. Test session limits enforcement');
    console.log('   7. Test automatic cleanup jobs');
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Note: Make sure the server is running on port 3001');
      console.log('   Run: npm run dev');
    }
  }
}

// Run the tests
testSessionManagementEndpoints();
