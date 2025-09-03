#!/usr/bin/env node

// Comprehensive Winston Logging Test Script
// Demonstrates all Winston features for Solar Panel Production Tracking System

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Comprehensive Winston logging test
 */
async function testComprehensiveWinston() {
  console.log('🧪 Testing Comprehensive Winston Logging...\n');

  try {
    // Create logs directory
    const logDir = path.join(process.cwd(), 'backend', 'logs');
    
    // Create specialized loggers for different components
    const loggers = {};

    // 1. General Logger
    loggers.general = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: {
        service: 'solar-panel-tracking',
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
      },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        new DailyRotateFile({
          filename: path.join(logDir, 'general-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d'
        })
      ]
    });

    // 2. Security Logger
    loggers.security = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: {
        service: 'solar-panel-tracking',
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0',
        category: 'security'
      },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        new DailyRotateFile({
          filename: path.join(logDir, 'security-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '30d'
        }),
        new DailyRotateFile({
          filename: path.join(logDir, 'security-error-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '30d',
          level: 'error'
        })
      ]
    });

    // 3. Manufacturing Logger
    loggers.manufacturing = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: {
        service: 'solar-panel-tracking',
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0',
        category: 'manufacturing'
      },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        new DailyRotateFile({
          filename: path.join(logDir, 'manufacturing-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d'
        })
      ]
    });

    // 4. Performance Logger
    loggers.performance = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: {
        service: 'solar-panel-tracking',
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0',
        category: 'performance'
      },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        new DailyRotateFile({
          filename: path.join(logDir, 'performance-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d'
        })
      ]
    });

    // 5. API Logger
    loggers.api = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: {
        service: 'solar-panel-tracking',
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0',
        category: 'api'
      },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        new DailyRotateFile({
          filename: path.join(logDir, 'api-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d'
        })
      ]
    });

    console.log('✅ All Winston loggers created successfully\n');

    // Test 1: Correlation ID Tracking
    console.log('🔗 Test 1: Correlation ID Tracking');
    const correlationId = uuidv4();
    
    loggers.general.info('Request started', {
      correlationId,
      method: 'GET',
      url: '/api/panels',
      timestamp: new Date().toISOString()
    });

    loggers.api.info('API request processed', {
      correlationId,
      endpoint: '/api/panels',
      statusCode: 200,
      responseTime: 150,
      timestamp: new Date().toISOString()
    });

    loggers.general.info('Request completed', {
      correlationId,
      method: 'GET',
      url: '/api/panels',
      duration: 150,
      timestamp: new Date().toISOString()
    });
    console.log('✅ Correlation ID tracking test completed\n');

    // Test 2: Security Logging
    console.log('🔒 Test 2: Security Logging');
    
    // Login attempt
    loggers.security.info('User login attempt', {
      userId: 'user123',
      action: 'LOGIN',
      resource: '/api/auth/login',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      timestamp: new Date().toISOString()
    });

    // Failed login
    loggers.security.warn('Failed login attempt', {
      userId: 'unknown',
      action: 'LOGIN',
      resource: '/api/auth/login',
      ipAddress: '192.168.1.101',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      reason: 'Invalid credentials',
      riskLevel: 'MEDIUM',
      timestamp: new Date().toISOString()
    });

    // Successful login
    loggers.security.info('User login successful', {
      userId: 'user123',
      action: 'LOGIN',
      resource: '/api/auth/login',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      sessionId: 'sess_abc123',
      timestamp: new Date().toISOString()
    });

    // Authorization check
    loggers.security.info('Authorization check', {
      userId: 'user123',
      action: 'AUTHORIZE',
      resource: '/api/panels/12345',
      permission: 'READ',
      result: 'GRANTED',
      timestamp: new Date().toISOString()
    });
    console.log('✅ Security logging test completed\n');

    // Test 3: Manufacturing Logging
    console.log('🏭 Test 3: Manufacturing Logging');
    
    // Panel inspection
    loggers.manufacturing.info('Panel inspection started', {
      stationId: 'STATION-001',
      lineId: 'LINE-A',
      operationType: 'INSPECTION',
      panelId: 'PANEL-12345',
      batchId: 'BATCH-2024-001',
      operatorId: 'OPERATOR-JOHN',
      timestamp: new Date().toISOString()
    });

    // Inspection results
    loggers.manufacturing.info('Panel inspection completed', {
      stationId: 'STATION-001',
      lineId: 'LINE-A',
      operationType: 'INSPECTION',
      panelId: 'PANEL-12345',
      batchId: 'BATCH-2024-001',
      operatorId: 'OPERATOR-JOHN',
      result: 'PASS',
      criteria: ['visual', 'electrical', 'mechanical'],
      notes: 'All tests passed successfully',
      duration: 45,
      timestamp: new Date().toISOString()
    });

    // Barcode scanning
    loggers.manufacturing.info('Barcode scanned', {
      stationId: 'STATION-002',
      lineId: 'LINE-B',
      operationType: 'SCANNING',
      barcode: 'BARCODE-67890',
      batchId: 'BATCH-2024-002',
      operatorId: 'OPERATOR-JANE',
      success: true,
      timestamp: new Date().toISOString()
    });

    // Assembly operation
    loggers.manufacturing.info('Assembly operation started', {
      stationId: 'STATION-003',
      lineId: 'LINE-A',
      operationType: 'ASSEMBLY',
      panelId: 'PANEL-12346',
      batchId: 'BATCH-2024-001',
      operatorId: 'OPERATOR-MIKE',
      componentType: 'FRAME',
      timestamp: new Date().toISOString()
    });
    console.log('✅ Manufacturing logging test completed\n');

    // Test 4: Performance Logging
    console.log('📊 Test 4: Performance Logging');
    
    // Request performance
    loggers.performance.info('Request performance metrics', {
      endpoint: '/api/panels',
      method: 'GET',
      responseTime: 150,
      memoryUsage: {
        heapUsed: '45MB',
        heapTotal: '100MB',
        external: '2MB'
      },
      cpuUsage: 15.5,
      databaseQueries: 3,
      cacheHits: 2,
      cacheMisses: 1,
      timestamp: new Date().toISOString()
    });

    // Slow request warning
    loggers.performance.warn('Slow request detected', {
      endpoint: '/api/panels/search',
      method: 'POST',
      responseTime: 2500,
      memoryUsage: {
        heapUsed: '60MB',
        heapTotal: '100MB',
        external: '5MB'
      },
      cpuUsage: 25.0,
      databaseQueries: 8,
      cacheHits: 0,
      cacheMisses: 8,
      timestamp: new Date().toISOString()
    });

    // System performance
    loggers.performance.info('System performance snapshot', {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      activeConnections: 15,
      databaseConnections: 8,
      timestamp: new Date().toISOString()
    });
    console.log('✅ Performance logging test completed\n');

    // Test 5: API Logging
    console.log('🌐 Test 5: API Logging');
    
    // GET request
    loggers.api.info('GET request processed', {
      endpoint: '/api/panels',
      method: 'GET',
      statusCode: 200,
      responseSize: '2.5KB',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      ipAddress: '192.168.1.100',
      responseTime: 150,
      timestamp: new Date().toISOString()
    });

    // POST request
    loggers.api.info('POST request processed', {
      endpoint: '/api/panels',
      method: 'POST',
      statusCode: 201,
      responseSize: '500B',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      ipAddress: '192.168.1.100',
      responseTime: 200,
      requestBody: { name: 'New Panel', type: '36-cell' },
      timestamp: new Date().toISOString()
    });

    // Error response
    loggers.api.error('API error occurred', {
      endpoint: '/api/panels/99999',
      method: 'GET',
      statusCode: 404,
      error: 'Panel not found',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      ipAddress: '192.168.1.100',
      timestamp: new Date().toISOString()
    });
    console.log('✅ API logging test completed\n');

    // Test 6: Error Logging
    console.log('❌ Test 6: Error Logging');
    
    try {
      // Simulate database error
      throw new Error('Database connection timeout');
    } catch (error) {
      loggers.general.error('Database operation failed', {
        error: error.message,
        stack: error.stack,
        operation: 'SELECT panels',
        table: 'panels',
        retryCount: 3,
        lastAttempt: new Date().toISOString(),
        timestamp: new Date().toISOString()
      });
    }

    try {
      // Simulate validation error
      throw new Error('Invalid panel data format');
    } catch (error) {
      loggers.manufacturing.error('Data validation failed', {
        error: error.message,
        stack: error.stack,
        operation: 'panel_creation',
        data: { panelId: 'INVALID-123', type: 'invalid-type' },
        validationRules: ['panelId format', 'type enum'],
        timestamp: new Date().toISOString()
      });
    }
    console.log('✅ Error logging test completed\n');

    // Test 7: Structured Data Logging
    console.log('📋 Test 7: Structured Data Logging');
    
    // Complex manufacturing data
    loggers.manufacturing.info('Production line status update', {
      lineId: 'LINE-A',
      status: 'ACTIVE',
      currentBatch: {
        batchId: 'BATCH-2024-001',
        panelType: '36-cell',
        targetQuantity: 100,
        completedQuantity: 75,
        startTime: '2024-01-27T08:00:00Z',
        estimatedCompletion: '2024-01-27T16:00:00Z'
      },
      stations: [
        {
          stationId: 'STATION-001',
          status: 'ACTIVE',
          currentPanel: 'PANEL-12345',
          operator: 'OPERATOR-JOHN',
          efficiency: 95.5
        },
        {
          stationId: 'STATION-002',
          status: 'ACTIVE',
          currentPanel: 'PANEL-12346',
          operator: 'OPERATOR-JANE',
          efficiency: 92.3
        }
      ],
      qualityMetrics: {
        passRate: 98.5,
        defectRate: 1.5,
        reworkRate: 0.8
      },
      timestamp: new Date().toISOString()
    });
    console.log('✅ Structured data logging test completed\n');

    console.log('🎉 All comprehensive Winston logging tests completed successfully!');
    console.log('\n📁 Check the logs directory for generated log files:');
    console.log(`   - ${logDir}/`);
    console.log('   - Look for files like:');
    console.log('     * general-YYYY-MM-DD.log');
    console.log('     * security-YYYY-MM-DD.log');
    console.log('     * manufacturing-YYYY-MM-DD.log');
    console.log('     * performance-YYYY-MM-DD.log');
    console.log('     * api-YYYY-MM-DD.log');
    console.log('     * security-error-YYYY-MM-DD.log');

    // Close all loggers
    for (const [name, logger] of Object.entries(loggers)) {
      await logger.end();
      console.log(`✅ ${name} logger closed`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testComprehensiveWinston().catch(console.error);
}

export { testComprehensiveWinston };
