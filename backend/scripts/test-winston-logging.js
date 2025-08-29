#!/usr/bin/env node

// Test script for Winston logging implementation
// Tests all logging features and demonstrates usage

import loggerService, { 
  setCorrelationId, 
  logManufacturing, 
  logSecurity, 
  logAPI, 
  logPerformance,
  getStats 
} from '../services/loggerService.js';
import { logUtils } from '../utils/logFormatters.js';

/**
 * Test Winston logging functionality
 */
async function testWinstonLogging() {
  console.log('🧪 Testing Winston Logging Implementation...\n');

  try {
    // Test 1: Basic logging functionality
    console.log('📝 Test 1: Basic Logging Functionality');
    loggerService.info('Basic info message');
    loggerService.warn('Basic warning message');
    loggerService.error(new Error('Basic error message'));
    loggerService.debug('Basic debug message');
    console.log('✅ Basic logging test completed\n');

    // Test 2: Correlation ID functionality
    console.log('🔗 Test 2: Correlation ID Functionality');
    const testCorrelationId = 'test-correlation-123';
    setCorrelationId(testCorrelationId);
    
    loggerService.info('Message with correlation ID', { 
      testData: 'correlation test' 
    });
    
    // Test nested correlation ID
    setCorrelationId('nested-correlation-456');
    loggerService.info('Nested correlation ID message');
    console.log('✅ Correlation ID test completed\n');

    // Test 3: Specialized logging methods
    console.log('🏭 Test 3: Specialized Logging Methods');
    
    // Manufacturing logging
    const manufacturingContext = logUtils.createManufacturingContext(
      'STATION-001',
      'LINE-A',
      'INSPECTION',
      'PANEL-12345',
      'BATCH-2024-001',
      'OPERATOR-JOHN'
    );
    
    logManufacturing('info', 'Panel inspection completed', {
      ...manufacturingContext,
      result: 'PASS',
      criteria: ['visual', 'electrical'],
      notes: 'All tests passed'
    }, 'manufacturing');

    // Security logging
    const securityContext = logUtils.createSecurityContext(
      'USER-001',
      'LOGIN',
      '/api/auth/login',
      'LOW',
      'AUTHENTICATION'
    );
    
    logSecurity('info', 'User login successful', {
      ...securityContext,
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0...'
    }, 'security');

    // API logging
    const apiContext = logUtils.createAPIContext(
      '/api/panels/12345',
      'GET',
      200,
      'Mozilla/5.0...',
      '192.168.1.100',
      'req-789'
    );
    
    logAPI('info', 'Panel data retrieved successfully', {
      ...apiContext,
      responseSize: '2.5KB',
      cacheHit: true
    }, 'api');

    // Performance logging
    const performanceContext = logUtils.createPerformanceContext(
      150, // responseTime
      { heapUsed: '45MB', heapTotal: '100MB' }, // memoryUsage
      15.5, // cpuUsage
      3, // databaseQueries
      2, // cacheHits
      1  // cacheMisses
    );
    
    logPerformance('info', 'Request performance metrics', {
      ...performanceContext,
      endpoint: '/api/panels',
      method: 'GET'
    }, 'performance');

    console.log('✅ Specialized logging test completed\n');

    // Test 4: Database context logging
    console.log('🗄️ Test 4: Database Context Logging');
    const databaseContext = logUtils.createDatabaseContext(
      'SELECT',
      'panels',
      45, // queryDuration
      25, // rowsAffected
      'pool-1'
    );
    
    loggerService.info('Database query executed', {
      ...databaseContext,
      query: 'SELECT * FROM panels WHERE status = $1',
      parameters: ['active']
    }, 'database');
    console.log('✅ Database context test completed\n');

    // Test 5: Error logging with context
    console.log('❌ Test 5: Error Logging with Context');
    try {
      // Simulate an error
      throw new Error('Simulated database connection error');
    } catch (error) {
      loggerService.error(error, {
        operation: 'database_connection',
        database: 'solar_panel_tracking',
        retryCount: 3,
        lastAttempt: new Date().toISOString()
      }, 'database');
    }
    console.log('✅ Error logging test completed\n');

    // Test 6: Log statistics
    console.log('📊 Test 6: Log Statistics');
    const stats = getStats();
    console.log('Logger Statistics:', JSON.stringify(stats, null, 2));
    console.log('✅ Log statistics test completed\n');

    // Test 7: Log formatting utilities
    console.log('🎨 Test 7: Log Formatting Utilities');
    console.log('Log Level with Emoji:', logUtils.formatLogLevel('info'));
    console.log('Duration Format:', logUtils.formatDuration(1500));
    console.log('File Size Format:', logUtils.formatFileSize(2048576));
    console.log('✅ Log formatting utilities test completed\n');

    // Test 8: Sanitization
    console.log('🔒 Test 8: Log Sanitization');
    loggerService.info('Sensitive data test', {
      username: 'john_doe',
      password: 'secret123',
      token: 'jwt-token-here',
      apiKey: 'sk-1234567890',
      body: {
        email: 'john@example.com',
        password: 'secret123'
      },
      headers: {
        'Authorization': 'Bearer jwt-token-here'
      }
    });
    console.log('✅ Log sanitization test completed\n');

    console.log('🎉 All Winston logging tests completed successfully!');
    console.log('\n📁 Check the logs directory for generated log files:');
    console.log('   - backend/logs/');
    console.log('   - Look for files like: general-YYYY-MM-DD.log, security-YYYY-MM-DD.log, etc.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

/**
 * Test Winston middleware functionality
 */
async function testWinstonMiddleware() {
  console.log('\n🔧 Testing Winston Middleware...\n');

  try {
    // Import middleware
    const { 
      winstonEnhancedLogger,
      createWinstonEnhancedLoggingMiddleware 
    } = await import('../middleware/winstonEnhancedLogger.js');

    // Test enhanced logger
    console.log('📝 Test: Enhanced Logger');
    winstonEnhancedLogger.setCorrelationId('middleware-test-123');
    winstonEnhancedLogger.info('Enhanced logger test message');
    
    winstonEnhancedLogger.stationAction(
      'STATION-002',
      'LINE-B',
      'ASSEMBLY',
      'PANEL-67890',
      'COMPLETED',
      { batchId: 'BATCH-2024-002', operatorId: 'OPERATOR-JANE' }
    );

    winstonEnhancedLogger.barcodeAction(
      'BARCODE-67890',
      'scanned',
      'STATION-002',
      true,
      { lineNumber: 'LINE-B', batchId: 'BATCH-2024-002', operatorId: 'OPERATOR-JANE' }
    );

    winstonEnhancedLogger.performanceMetric(
      'response_time',
      250,
      'ms',
      { responseTime: 250, memoryUsage: process.memoryUsage() }
    );

    winstonEnhancedLogger.securityEvent(
      'Failed login attempt',
      'warn',
      { 
        userId: 'unknown',
        action: 'LOGIN',
        resource: '/api/auth/login',
        riskLevel: 'MEDIUM',
        threatType: 'BRUTE_FORCE'
      }
    );

    console.log('✅ Enhanced logger test completed');

    // Test middleware factory
    console.log('\n🔧 Test: Middleware Factory');
    const middleware = createWinstonEnhancedLoggingMiddleware({
      enableCorrelationId: true,
      enableRequestTiming: true,
      enableManufacturingTracking: true,
      enableErrorLogging: true,
      enableHealthCheckLogging: true,
      enableRequestLogging: true
    });

    console.log(`✅ Created ${middleware.length} middleware functions`);
    console.log('Middleware types:', middleware.map(m => m.name || 'anonymous'));

    console.log('\n🎉 Winston middleware tests completed successfully!');

  } catch (error) {
    console.error('❌ Middleware test failed:', error);
  }
}

/**
 * Main test execution
 */
async function main() {
  console.log('🚀 Winston Logging Test Suite');
  console.log('==============================\n');

  await testWinstonLogging();
  await testWinstonMiddleware();

  console.log('\n✨ Test suite completed!');
  console.log('\n📋 Next steps:');
  console.log('   1. Check the generated log files');
  console.log('   2. Verify log rotation is working');
  console.log('   3. Test correlation ID tracking');
  console.log('   4. Integrate with your Express server');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { testWinstonLogging, testWinstonMiddleware };
