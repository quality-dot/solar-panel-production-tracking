#!/usr/bin/env node

// Simple test script for Winston logging implementation
// Tests basic functionality without complex formatting

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

/**
 * Simple Winston logger test
 */
async function testSimpleWinston() {
  console.log('🧪 Testing Simple Winston Logging...\n');

  try {
    // Create logs directory
    const logDir = path.join(process.cwd(), 'backend', 'logs');
    
    // Simple console format
    const consoleFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.colorize(),
      winston.format.simple()
    );

    // Simple file format
    const fileFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.json()
    );

    // Create logger
    const logger = winston.createLogger({
      level: 'info',
      format: fileFormat,
      defaultMeta: {
        service: 'solar-panel-tracking',
        environment: process.env.NODE_ENV || 'development'
      },
      transports: [
        // Console transport
        new winston.transports.Console({
          format: consoleFormat,
          level: 'info'
        }),

        // Daily rotate file transport
        new DailyRotateFile({
          filename: path.join(logDir, 'test-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '7d',
          level: 'info'
        }),

        // Error log file
        new DailyRotateFile({
          filename: path.join(logDir, 'test-error-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '7d',
          level: 'error'
        })
      ]
    });

    console.log('✅ Winston logger created successfully');

    // Test basic logging
    console.log('\n📝 Testing Basic Logging...');
    logger.info('Basic info message');
    logger.warn('Basic warning message');
    logger.error('Basic error message');
    logger.debug('Basic debug message (should not appear in file)');

    // Test with metadata
    console.log('\n📊 Testing Logging with Metadata...');
    logger.info('Message with metadata', {
      userId: 'user123',
      action: 'login',
      timestamp: new Date().toISOString(),
      station: 'STATION-001',
      line: 'LINE-A'
    });

    // Test error logging
    console.log('\n❌ Testing Error Logging...');
    try {
      throw new Error('Simulated error for testing');
    } catch (error) {
      logger.error('Error occurred', {
        error: error.message,
        stack: error.stack,
        operation: 'test_operation'
      });
    }

    // Test manufacturing context
    console.log('\n🏭 Testing Manufacturing Context...');
    logger.info('Panel inspection completed', {
      stationId: 'STATION-001',
      lineId: 'LINE-A',
      operationType: 'INSPECTION',
      panelId: 'PANEL-12345',
      batchId: 'BATCH-2024-001',
      operatorId: 'OPERATOR-JOHN',
      result: 'PASS',
      timestamp: new Date().toISOString()
    });

    // Test security context
    console.log('\n🔒 Testing Security Context...');
    logger.warn('Failed login attempt', {
      userId: 'unknown',
      action: 'LOGIN',
      resource: '/api/auth/login',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0...',
      timestamp: new Date().toISOString()
    });

    console.log('\n🎉 Simple Winston logging tests completed successfully!');
    console.log('\n📁 Check the logs directory for generated log files:');
    console.log(`   - ${logDir}/`);
    console.log('   - Look for files like: test-YYYY-MM-DD.log, test-error-YYYY-MM-DD.log');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testSimpleWinston().catch(console.error);
}

export { testSimpleWinston };
