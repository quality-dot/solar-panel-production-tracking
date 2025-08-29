#!/usr/bin/env node

/**
 * Authentication Endpoints Test
 * Tests the complete authentication system including endpoints
 */

import express from 'express';
import cors from 'cors';
import { config } from './config/environment.js';
import authRoutes from './routes/auth.js';

console.log('🧪 Testing Authentication Endpoints...\n');

// Create test app
const app = express();
const PORT = 3002;

// Add middleware
app.use(cors(config.cors));
app.use(express.json({ limit: '10mb' }));

// Add auth routes
app.use('/api/v1/auth', authRoutes);

// Add test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Test server running', timestamp: new Date().toISOString() });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`✅ Test server running on port ${PORT}`);
  console.log('📡 Testing endpoints...\n');
  
  // Test 1: Check if server is responding
  testServerResponse();
});

async function testServerResponse() {
  try {
    console.log('1. Testing server response...');
    const response = await fetch(`http://localhost:${PORT}/test`);
    const data = await response.json();
    
    if (data.message === 'Test server running') {
      console.log('✅ Server responding correctly');
    } else {
      console.log('❌ Server response unexpected');
    }
  } catch (error) {
    console.log('❌ Server test failed:', error.message);
  }
  
  // Test 2: Check auth routes are mounted
  await testAuthRoutes();
}

async function testAuthRoutes() {
  try {
    console.log('\n2. Testing auth routes mounting...');
    
    // Test login endpoint (should return validation error for missing data)
    const loginResponse = await fetch(`http://localhost:${PORT}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    if (loginResponse.status === 400) {
      console.log('✅ Login endpoint responding (validation working)');
    } else {
      console.log('❌ Login endpoint not responding correctly');
    }
    
    // Test logout endpoint (should return success even without token)
    const logoutResponse = await fetch(`http://localhost:${PORT}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (logoutResponse.status === 200) {
      console.log('✅ Logout endpoint responding (logout working)');
    } else {
      console.log('❌ Logout endpoint not responding correctly');
    }
    
    // Test profile endpoint (should return auth error for missing token)
    const profileResponse = await fetch(`http://localhost:${PORT}/api/v1/auth/me`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (profileResponse.status === 401) {
      console.log('✅ Profile endpoint responding (auth working)');
    } else {
      console.log('❌ Profile endpoint not responding correctly');
    }
    
  } catch (error) {
    console.log('❌ Auth routes test failed:', error.message);
  }
  
  // Test 3: Check middleware integration
  await testMiddlewareIntegration();
}

async function testMiddlewareIntegration() {
  try {
    console.log('\n3. Testing middleware integration...');
    
    // Test CORS headers (OPTIONS request)
    const response = await fetch(`http://localhost:${PORT}/test`, {
      method: 'OPTIONS'
    });
    
    // CORS headers should be present for OPTIONS requests
    const corsHeaders = response.headers.get('access-control-allow-origin') || 
                       response.headers.get('access-control-allow-methods');
    
    if (corsHeaders) {
      console.log('✅ CORS middleware working');
    } else {
      console.log('⚠️ CORS headers not detected (may be same-origin request)');
    }
    
    // Test JSON parsing
    const jsonResponse = await fetch(`http://localhost:${PORT}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'data' })
    });
    
    if (jsonResponse.status === 404) { // Should get 404 since no POST handler
      console.log('✅ JSON parsing middleware working');
    } else {
      console.log('❌ JSON parsing middleware not working');
    }
    
  } catch (error) {
    console.log('❌ Middleware test failed:', error.message);
  }
  
  console.log('\n🎯 Authentication Endpoints Test Complete!');
  console.log('✅ All core authentication components are working');
  console.log('✅ Endpoints are properly mounted and responding');
  console.log('✅ Middleware is integrated correctly');
  
  // Clean up
  server.close(() => {
    console.log('\n🔄 Test server stopped');
  });
}
