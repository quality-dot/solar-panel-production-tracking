#!/usr/bin/env node

// Enhanced Error Handling Middleware Test Script
// Demonstrates all error handling capabilities for manufacturing operations

import express from 'express';
import { 
  globalErrorHandler, 
  notFoundHandler, 
  asyncHandler,
  ManufacturingError,
  ValidationError,
  BarcodeError,
  DatabaseError,
  AuthenticationError,
  StationError,
  WorkflowError
} from '../middleware/errorHandler.js';

import {
  ManufacturingErrorScenarios,
  ErrorTrendAnalyzer,
  ErrorRecoveryAutomation,
  ManufacturingErrorMetrics
} from '../utils/manufacturingErrorHandler.js';

// Create test server
const app = express();
const PORT = 3002;

// Add basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add station identification middleware for testing
app.use((req, res, next) => {
  req.station = {
    id: req.headers['x-station-id'] || 'TEST_STATION',
    line: req.headers['x-station-id']?.includes('1') ? 'LINE_1' : 'LINE_2'
  };
  req.timestamp = new Date().toISOString();
  next();
});

// Test routes for different error scenarios
app.get('/test-success', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Test successful',
    station: req.station,
    timestamp: req.timestamp
  });
});

// Test validation errors
app.get('/test-validation-error', (req, res, next) => {
  const error = new ValidationError('Invalid input data', { 
    field: 'barcode', 
    value: 'INVALID',
    expectedFormat: 'CRSYYFBPP#####'
  });
  next(error);
});

// Test barcode errors
app.get('/test-barcode-error', (req, res, next) => {
  const error = new BarcodeError('Barcode format invalid', 'INVALID123', { 
    expectedFormat: 'CRSYYFBPP#####',
    scannedValue: 'INVALID123',
    suggestions: ['Clean barcode', 'Check format', 'Use manual entry']
  });
  next(error);
});

// Test database errors
app.get('/test-database-error', (req, res, next) => {
  const error = new DatabaseError('Database connection failed', 'SELECT', { 
    table: 'panels',
    query: 'SELECT * FROM panels WHERE barcode = $1',
    parameters: ['CRS24WT3600001'],
    connectionPool: 'main_pool'
  });
  next(error);
});

// Test authentication errors
app.get('/test-auth-error', (req, res, next) => {
  const error = new AuthenticationError('Invalid credentials', { 
    userId: 'user123',
    attemptedLogin: new Date().toISOString(),
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });
  next(error);
});

// Test station errors
app.get('/test-station-error', (req, res, next) => {
  const error = new StationError('Station not found', 'STATION_999', { 
    availableStations: ['STATION_1', 'STATION_2', 'STATION_3'],
    requestedStation: 'STATION_999',
    line: 'LINE_1'
  });
  next(error);
});

// Test workflow errors
app.get('/test-workflow-error', (req, res, next) => {
  const error = new WorkflowError('Invalid panel state transition', 'PANEL_123', 'SCANNED', 'PROCESS', { 
    allowedTransitions: ['SCANNED', 'VALIDATED'],
    currentState: 'SCANNED',
    attemptedAction: 'PROCESS',
    panelId: 'PANEL_123'
  });
  next(error);
});

// Test production line errors
app.get('/test-line-error/:lineNumber', (req, res, next) => {
  const lineNumber = req.params.lineNumber;
  const error = new ManufacturingError(
    'Production line overload detected',
    'LINE_OVERLOAD',
    { lineNumber, currentLoad: 95, maxCapacity: 100 },
    'HIGH',
    true
  );
  next(error);
});

// Test async errors
app.get('/test-async-error', asyncHandler(async (req, res) => {
  // Simulate async operation that fails
  await new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new DatabaseError('Async database operation failed', 'INSERT', { 
        table: 'panels',
        operation: 'bulk_insert'
      }));
    }, 100);
  });
}));

// Test rate limiting errors
app.get('/test-rate-limit-error', (req, res, next) => {
  const error = new ManufacturingError(
    'Rate limit exceeded for station',
    'RATE_LIMIT_EXCEEDED',
    { 
      stationId: req.station.id,
      currentRate: 1200,
      maxRate: 1000,
      resetTime: new Date(Date.now() + 900000).toISOString() // 15 minutes
    },
    'MEDIUM',
    true
  );
  next(error);
});

// Test database constraint errors
app.get('/test-constraint-error/:type', (req, res, next) => {
  const type = req.params.type;
  let error;
  
  switch (type) {
    case 'duplicate':
      error = new Error('Duplicate key violation');
      error.code = '23505';
      error.detail = 'Key (barcode)=(CRS24WT3600001) already exists';
      break;
    case 'foreign-key':
      error = new Error('Foreign key violation');
      error.code = '23503';
      error.detail = 'Key (mo_id)=(MO-999) is not present in table "manufacturing_orders"';
      break;
    case 'check':
      error = new Error('Check constraint violation');
      error.code = '23514';
      error.detail = 'New row for relation "panels" violates check constraint "panels_panel_type_check"';
      break;
    default:
      error = new Error('Unknown constraint violation');
      error.code = '23500';
  }
  
  next(error);
});

// Test connection errors
app.get('/test-connection-error/:type', (req, res, next) => {
  const type = req.params.type;
  let error;
  
  switch (type) {
    case 'refused':
      error = new Error('Connection refused');
      error.code = 'ECONNREFUSED';
      break;
    case 'timeout':
      error = new Error('Connection timeout');
      error.code = 'ETIMEDOUT';
      break;
    case 'reset':
      error = new Error('Connection reset');
      error.code = 'ECONNRESET';
      break;
    default:
      error = new Error('Unknown connection error');
      error.code = 'ECONNERROR';
  }
  
  next(error);
});

// Test manufacturing error scenarios
app.get('/test-manufacturing-scenarios', (req, res) => {
  try {
    // Test production line error handling
    const lineError = new ManufacturingError('Line equipment failure', 'EQUIPMENT_FAILURE', { lineNumber: 1 });
    const lineResult = ManufacturingErrorScenarios.handleProductionLineError(1, lineError, { equipment: 'Scanner A' });
    
    // Test station error handling
    const stationError = new ManufacturingError('Station scanner failure', 'SCANNER_FAILURE', { stationId: 'STATION_1' });
    const stationResult = ManufacturingErrorScenarios.handleStationError('STATION_1', stationError, { scanner: 'Scanner A' });
    
    // Test barcode error handling
    const barcodeError = new BarcodeError('Invalid barcode format', 'INVALID123', { format: 'CRSYYFBPP#####' });
    const barcodeResult = ManufacturingErrorScenarios.handleBarcodeProcessingError('INVALID123', barcodeError, { station: 'STATION_1' });
    
    // Test MO error handling
    const moError = new ManufacturingError('MO not found', 'MO_NOT_FOUND', { moId: 'MO-999' });
    const moResult = ManufacturingErrorScenarios.handleManufacturingOrderError('MO-999', moError, { requestedBy: 'STATION_1' });
    
    res.json({
      success: true,
      message: 'Manufacturing error scenarios tested successfully',
      results: {
        lineError: lineResult,
        stationError: stationResult,
        barcodeError: barcodeResult,
        moError: moResult
      }
    });
  } catch (error) {
    next(error);
  }
});

// Test error trend analysis
app.get('/test-trend-analysis', (req, res) => {
  try {
    const trendAnalyzer = new ErrorTrendAnalyzer();
    
    // Record some test errors
    trendAnalyzer.recordError('ValidationError', 'INVALID_FORMAT', { field: 'barcode' });
    trendAnalyzer.recordError('ValidationError', 'INVALID_FORMAT', { field: 'barcode' });
    trendAnalyzer.recordError('ValidationError', 'INVALID_FORMAT', { field: 'barcode' });
    trendAnalyzer.recordError('BarcodeError', 'FORMAT_MISMATCH', { barcode: 'TEST123' });
    trendAnalyzer.recordError('BarcodeError', 'FORMAT_MISMATCH', { barcode: 'TEST456' });
    trendAnalyzer.recordError('DatabaseError', 'CONNECTION_FAILED', { table: 'panels' });
    
    const trends = trendAnalyzer.getTrendAnalysis();
    const criticalTrends = trendAnalyzer.getCriticalTrends();
    const frequency = trendAnalyzer.getErrorFrequency('hour');
    
    res.json({
      success: true,
      message: 'Error trend analysis tested successfully',
      results: {
        trends,
        criticalTrends,
        frequency
      }
    });
  } catch (error) {
    next(error);
  }
});

// Test error recovery automation
app.get('/test-recovery-automation', (req, res) => {
  try {
    const recoveryAutomation = new ErrorRecoveryAutomation();
    
    // Register a test recovery strategy
    recoveryAutomation.registerRecoveryStrategy('ValidationError', 'INVALID_FORMAT', {
      name: 'Format Validation Recovery',
      description: 'Attempts to clean and re-validate input data',
      execute: async (context) => {
        // Simulate recovery attempt
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
          success: Math.random() > 0.3, // 70% success rate
          details: { action: 'Data cleaning attempted', context }
        };
      }
    });
    
    const strategies = recoveryAutomation.getRecoveryStrategies();
    
    res.json({
      success: true,
      message: 'Error recovery automation tested successfully',
      results: {
        strategies,
        automatedRecoveryEnabled: recoveryAutomation.automatedRecoveryEnabled
      }
    });
  } catch (error) {
    next(error);
  }
});

// Test error metrics
app.get('/test-error-metrics', (req, res) => {
  try {
    const errorMetrics = new ManufacturingErrorMetrics();
    
    // Record some test errors
    const testError1 = new ValidationError('Test validation error');
    const testError2 = new BarcodeError('Test barcode error', 'TEST123');
    const testError3 = new DatabaseError('Test database error', 'SELECT');
    
    errorMetrics.recordError(testError1);
    errorMetrics.recordError(testError2);
    errorMetrics.recordError(testError3);
    
    // Record some recovery attempts
    errorMetrics.recordRecoveryAttempt(true);
    errorMetrics.recordRecoveryAttempt(false);
    errorMetrics.recordRecoveryAttempt(true);
    
    const metrics = errorMetrics.getMetrics();
    
    res.json({
      success: true,
      message: 'Error metrics tested successfully',
      results: {
        metrics
      }
    });
  } catch (error) {
    next(error);
  }
});

// Test error response formatting
app.get('/test-error-formatting', (req, res, next) => {
  // Test different error types to see response formatting
  const errors = [
    new ValidationError('Field validation failed', { field: 'barcode', value: 'INVALID' }),
    new BarcodeError('Barcode not found', 'MISSING123', { expectedFormat: 'CRSYYFBPP#####' }),
    new DatabaseError('Query execution failed', 'SELECT', { table: 'panels', query: 'SELECT * FROM panels' }),
    new StationError('Station offline', 'OFFLINE_STATION', { status: 'OFFLINE', lastSeen: '2024-01-01T00:00:00Z' })
  ];
  
  // Return the first error to test formatting
  next(errors[0]);
});

// Add error handling middleware
app.use(globalErrorHandler);
app.use(notFoundHandler);

// Start the test server
app.listen(PORT, () => {
  console.log(`🚀 Enhanced Error Handling Test Server running on port ${PORT}`);
  console.log(`📊 Test the following endpoints:`);
  console.log(`   GET /test-success - Successful response`);
  console.log(`   GET /test-validation-error - Validation error`);
  console.log(`   GET /test-barcode-error - Barcode error`);
  console.log(`   GET /test-database-error - Database error`);
  console.log(`   GET /test-auth-error - Authentication error`);
  console.log(`   GET /test-station-error - Station error`);
  console.log(`   GET /test-workflow-error - Workflow error`);
  console.log(`   GET /test-line-error/1 - Production line error`);
  console.log(`   GET /test-async-error - Async error`);
  console.log(`   GET /test-rate-limit-error - Rate limit error`);
  console.log(`   GET /test-constraint-error/duplicate - Constraint error`);
  console.log(`   GET /test-connection-error/refused - Connection error`);
  console.log(`   GET /test-manufacturing-scenarios - Manufacturing scenarios`);
  console.log(`   GET /test-trend-analysis - Trend analysis`);
  console.log(`   GET /test-recovery-automation - Recovery automation`);
  console.log(`   GET /test-error-metrics - Error metrics`);
  console.log(`   GET /test-error-formatting - Error response formatting`);
  console.log(`\n🔧 Use different x-station-id headers to test station-specific error handling`);
  console.log(`   Example: curl -H "x-station-id: STATION_1" http://localhost:${PORT}/test-station-error`);
});

export default app;
