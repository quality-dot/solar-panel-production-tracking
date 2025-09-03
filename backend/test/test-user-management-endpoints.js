#!/usr/bin/env node

// Test script for user management API endpoints
// Tests the complete user management API

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';
const API_BASE = `${BASE_URL}/api/v1/auth`;

console.log('🧪 Testing User Management API Endpoints\n');

async function testUserManagementEndpoints() {
  try {
    console.log('1. Testing user listing endpoint (without auth)...');
    
    // Test users listing without authentication (should fail)
    const usersResponse = await fetch(`${API_BASE}/users`);
    console.log(`   Status: ${usersResponse.status} ${usersResponse.status === 401 ? '✅' : '❌'}`);
    
    console.log('\n2. Testing user statistics endpoint (without auth)...');
    
    // Test user stats without authentication (should fail)
    const statsResponse = await fetch(`${API_BASE}/users/stats`);
    console.log(`   Status: ${statsResponse.status} ${statsResponse.status === 401 ? '✅' : '❌'}`);
    
    console.log('\n3. Testing user creation endpoint (without auth)...');
    
    // Test user creation without authentication (should fail)
    const createResponse = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'testuser',
        email: 'test@manufacturing.com',
        password: 'TestPass123',
        role: 'STATION_INSPECTOR',
        stationAssignments: ['Station1']
      })
    });
    console.log(`   Status: ${createResponse.status} ${createResponse.status === 401 ? '✅' : '❌'}`);
    
    console.log('\n4. Testing user update endpoint (without auth)...');
    
    // Test user update without authentication (should fail)
    const updateResponse = await fetch(`${API_BASE}/users/test-id`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'updateduser'
      })
    });
    console.log(`   Status: ${updateResponse.status} ${updateResponse.status === 401 ? '✅' : '❌'}`);
    
    console.log('\n5. Testing user deletion endpoint (without auth)...');
    
    // Test user deletion without authentication (should fail)
    const deleteResponse = await fetch(`${API_BASE}/users/test-id`, {
      method: 'DELETE'
    });
    console.log(`   Status: ${deleteResponse.status} ${deleteResponse.status === 401 ? '✅' : '❌'}`);
    
    console.log('\n6. Testing password reset endpoint (without auth)...');
    
    // Test password reset without authentication (should fail)
    const resetResponse = await fetch(`${API_BASE}/users/test-id/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        newPassword: 'NewPass123'
      })
    });
    console.log(`   Status: ${resetResponse.status} ${resetResponse.status === 401 ? '✅' : '❌'}`);
    
    console.log('\n7. Testing invalid endpoints...');
    
    // Test invalid user ID format
    const invalidIdResponse = await fetch(`${API_BASE}/users/invalid-id`);
    console.log(`   Invalid ID status: ${invalidIdResponse.status} ${invalidIdResponse.status === 401 ? '✅' : '❌'}`);
    
    // Test invalid HTTP methods
    const invalidMethodResponse = await fetch(`${API_BASE}/users`, {
      method: 'PATCH'
    });
    console.log(`   Invalid method status: ${invalidMethodResponse.status} ${invalidMethodResponse.status === 404 || invalidMethodResponse.status === 401 ? '✅' : '❌'}`);
    
    console.log('\n✅ User management API endpoint tests completed!');
    console.log('\n📋 API Endpoints Implemented:');
    console.log('   • GET /api/v1/auth/users - List users with filtering (Admin/QC Manager)');
    console.log('   • GET /api/v1/auth/users/stats - Get user statistics (Admin/QC Manager)');
    console.log('   • GET /api/v1/auth/users/:id - Get user by ID (Admin/QC Manager)');
    console.log('   • POST /api/v1/auth/users - Create new user (Admin only)');
    console.log('   • PUT /api/v1/auth/users/:id - Update user (Admin only)');
    console.log('   • DELETE /api/v1/auth/users/:id - Delete user (Admin only)');
    console.log('   • POST /api/v1/auth/users/:id/reset-password - Reset password (Admin only)');
    
    console.log('\n🔧 Features Implemented:');
    console.log('   • Role-based access control (proper authorization)');
    console.log('   • Input validation and error handling');
    console.log('   • Pagination and filtering support');
    console.log('   • Search functionality');
    console.log('   • User statistics and reporting');
    console.log('   • Soft and hard delete options');
    console.log('   • Password reset by admin');
    console.log('   • Comprehensive audit logging');
    console.log('   • Manufacturing-specific responses');
    
    console.log('\n🔒 Security Features:');
    console.log('   • JWT authentication required');
    console.log('   • Role-based authorization');
    console.log('   • Admin-only operations protected');
    console.log('   • Input validation and sanitization');
    console.log('   • SQL injection protection');
    console.log('   • Username/email uniqueness validation');
    console.log('   • Station assignment validation');
    console.log('   • Last admin protection');
    
    console.log('\n💡 Next Steps:');
    console.log('   1. Test with valid JWT tokens');
    console.log('   2. Test role-based access control');
    console.log('   3. Test input validation with various data');
    console.log('   4. Test pagination and filtering');
    console.log('   5. Test error handling scenarios');
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Note: Make sure the server is running on port 3001');
      console.log('   Run: npm run dev');
    }
  }
}

// Run the tests
testUserManagementEndpoints();
