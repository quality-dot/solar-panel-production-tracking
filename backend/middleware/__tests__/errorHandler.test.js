// Comprehensive test suite for Global Error Handling Middleware
// Tests all error handling scenarios for manufacturing operations

import request from 'supertest';
import express from 'express';
import { 
  globalErrorHandler, 
  notFoundHandler, 
  asyncHandler,
  formatErrorResponse,
  ErrorHandler,
  ManufacturingError,
  ValidationError,
  BarcodeError,
  DatabaseError,
  AuthenticationError,
  AuthorizationError,
  StationError,
  WorkflowError
} from '../errorHandler.js';

// Create test app
const createTestApp = () => {
  const app = express();
  
  // Add test routes that will trigger different error scenarios
  app.get('/test-success', (req, res) => {
    res.json({ success: true, message: 'Test successful' });
  });

  app.get('/test-validation-error', (req, res, next) => {
    next(new ValidationError('Invalid input data', { field: 'barcode', value: 'INVALID' }));
  });

  app.get('/test-barcode-error', (req, res, next) => {
    next(new BarcodeError('Barcode format invalid', 'INVALID123', { expectedFormat: 'CRSYYFBPP#####' }));
  });

  app.get('/test-database-error', (req, res, next) => {
    next(new DatabaseError('Database connection failed', 'SELECT', { table: 'panels' }));
  });

  app.get('/test-auth-error', (req, res, next) => {
    next(new AuthenticationError('Invalid credentials', { userId: 'user123' }));
  });

  app.get('/test-station-error', (req, res, next) => {
    next(new StationError('Station not found', 'STATION_999', { availableStations: ['STATION_1', 'STATION_2'] }));
  });

  app.get('/test-workflow-error', (req, res, next) => {
    next(new WorkflowError('Invalid panel state transition', 'PANEL_123', 'SCANNED', 'PROCESS', { allowedTransitions: ['SCANNED', 'VALIDATED'] }));
  });

  app.get('/test-generic-error', (req, res, next) => {
    next(new Error('Generic error occurred'));
  });

  app.get('/test-async-error', asyncHandler(async (req, res) => {
    throw new DatabaseError('Async database error', 'INSERT', { table: 'panels' });
  }));

  app.get('/test-db-constraint-error', (req, res, next) => {
    const error = new Error('Duplicate key violation');
    error.code = '23505'; // PostgreSQL duplicate key error
    next(error);
  });

  app.get('/test-foreign-key-error', (req, res, next) => {
    const error = new Error('Foreign key violation');
    error.code = '23503'; // PostgreSQL foreign key violation
    next(error);
  });

  app.get('/test-connection-error', (req, res, next) => {
    const error = new Error('Connection refused');
    error.code = 'ECONNREFUSED';
    next(error);
  });

  // Add error handling middleware
  app.use(globalErrorHandler);
  app.use(notFoundHandler);

  return app;
};

describe('Global Error Handling Middleware', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('Custom Error Classes', () => {
    test('ManufacturingError should have correct properties', () => {
      const error = new ManufacturingError('Test error', 'TEST_ERROR', 400, { test: true });
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('ManufacturingError');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ test: true });
      expect(error.timestamp).toBeDefined();
    });

    test('ValidationError should have correct status code', () => {
      const error = new ValidationError('Validation failed', { field: 'test' });
      
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    test('BarcodeError should include barcode in details', () => {
      const error = new BarcodeError('Invalid barcode', 'TEST123', { format: 'CRSYYFBPP#####' });
      
      expect(error.details.barcode).toBe('TEST123');
      expect(error.details.format).toBe('CRSYYFBPP#####');
    });

    test('DatabaseError should include operation details', () => {
      const error = new DatabaseError('Query failed', 'SELECT', { table: 'panels' });
      
      expect(error.details.operation).toBe('SELECT');
      expect(error.details.table).toBe('panels');
    });
  });

  describe('Error Classification', () => {
    test('should classify ValidationError correctly', () => {
      const error = new ValidationError('Test');
      const category = ErrorHandler.getErrorCategory(error);
      
      expect(category).toBe('validation');
    });

    test('should classify BarcodeError correctly', () => {
      const error = new BarcodeError('Test', 'TEST123');
      const category = ErrorHandler.getErrorCategory(error);
      
      expect(category).toBe('barcode');
    });

    test('should classify database constraint errors correctly', () => {
      const error = new Error('Duplicate key');
      error.code = '23505';
      
      const category = ErrorHandler.getErrorCategory(error);
      expect(category).toBe('duplicate_key');
    });

    test('should classify connection errors correctly', () => {
      const error = new Error('Connection refused');
      error.code = 'ECONNREFUSED';
      
      const category = ErrorHandler.getErrorCategory(error);
      expect(category).toBe('connection_error');
    });
  });

  describe('Recovery Strategy', () => {
    test('should provide recovery strategy for validation errors', () => {
      const error = new ValidationError('Test');
      const strategy = ErrorHandler.getRecoveryStrategy(error);
      
      expect(strategy).toBe('retry_with_corrections');
    });

    test('should provide recovery strategy for barcode errors', () => {
      const error = new BarcodeError('Test', 'TEST123');
      const strategy = ErrorHandler.getRecoveryStrategy(error);
      
      expect(strategy).toBe('manual_entry_available');
    });

    test('should provide recovery strategy for database errors', () => {
      const error = new DatabaseError('Test', 'SELECT');
      const strategy = ErrorHandler.getRecoveryStrategy(error);
      
      expect(strategy).toBe('retry_after_delay');
    });
  });

  describe('Error Response Formatting', () => {
    test('should format error response with correct structure', () => {
      const error = new ValidationError('Test error', { field: 'test' });
      const req = { station: { id: 'STATION_1', line: 'LINE_1' } };
      
      const response = formatErrorResponse(error, req);
      
      expect(response.success).toBe(false);
      expect(response.error.id).toBeDefined();
      expect(response.error.message).toBe('Test error');
      expect(response.error.code).toBe('VALIDATION_ERROR');
      expect(response.error.category).toBe('validation');
      expect(response.error.recoveryStrategy).toBe('retry_with_corrections');
      expect(response.error.timestamp).toBeDefined();
      expect(response.error.station).toEqual({ id: 'STATION_1', line: 'LINE_1' });
    });

    test('should include error details in development mode', () => {
      // Mock config to development mode
      const originalConfig = require('../../config/index.js');
      jest.spyOn(originalConfig, 'config', 'get').mockReturnValue({ environment: 'development' });
      
      const error = new ValidationError('Test error', { field: 'test' });
      const req = {};
      
      const response = formatErrorResponse(error, req);
      
      expect(response.error.details).toBeDefined();
      expect(response.error.details.stack).toBeDefined();
      
      // Restore original config
      jest.restoreAllMocks();
    });
  });

  describe('HTTP Status Code Mapping', () => {
    test('should return 400 for ValidationError', async () => {
      const response = await request(app).get('/test-validation-error');
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should return 400 for BarcodeError', async () => {
      const response = await request(app).get('/test-barcode-error');
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BARCODE_ERROR');
    });

    test('should return 500 for DatabaseError', async () => {
      const response = await request(app).get('/test-database-error');
      
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('DATABASE_ERROR');
    });

    test('should return 401 for AuthenticationError', async () => {
      const response = await request(app).get('/test-auth-error');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
    });

    test('should return 400 for StationError', async () => {
      const response = await request(app).get('/test-station-error');
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('STATION_ERROR');
    });

    test('should return 409 for WorkflowError', async () => {
      const response = await request(app).get('/test-workflow-error');
      
      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('WORKFLOW_ERROR');
    });

    test('should return 409 for duplicate key errors', async () => {
      const response = await request(app).get('/test-db-constraint-error');
      
      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });

    test('should return 400 for foreign key violations', async () => {
      const response = await request(app).get('/test-foreign-key-error');
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Async Error Handling', () => {
    test('should handle async errors correctly', async () => {
      const response = await request(app).get('/test-async-error');
      
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('DATABASE_ERROR');
    });
  });

  describe('404 Not Found Handler', () => {
    test('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/unknown-route');
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
      expect(response.body.error.context.availableEndpoints).toBeDefined();
    });
  });

  describe('Operational Error Detection', () => {
    test('should identify operational errors correctly', () => {
      const operationalError = new Error('Connection refused');
      operationalError.code = 'ECONNREFUSED';
      
      expect(ErrorHandler.isOperationalError(operationalError)).toBe(true);
    });

    test('should identify non-operational errors correctly', () => {
      const nonOperationalError = new Error('Unknown error');
      
      expect(ErrorHandler.isOperationalError(nonOperationalError)).toBe(false);
    });

    test('should identify ManufacturingError as operational', () => {
      const error = new ValidationError('Test');
      
      expect(ErrorHandler.isOperationalError(error)).toBe(true);
    });
  });

  describe('Error Context Preservation', () => {
    test('should preserve manufacturing context in error responses', async () => {
      const response = await request(app).get('/test-station-error');
      
      expect(response.body.error.context.stationId).toBe('STATION_999');
      expect(response.body.error.context.availableStations).toEqual(['STATION_1', 'STATION_2']);
    });

    test('should preserve barcode context in error responses', async () => {
      const response = await request(app).get('/test-barcode-error');
      
      expect(response.body.error.context.barcode).toBe('INVALID123');
      expect(response.body.error.context.expectedFormat).toBe('CRSYYFBPP#####');
    });
  });

  describe('Error ID Generation', () => {
    test('should generate unique error IDs', async () => {
      const response1 = await request(app).get('/test-validation-error');
      const response2 = await request(app).get('/test-validation-error');
      
      expect(response1.body.error.id).not.toBe(response2.body.error.id);
      expect(response1.body.error.id).toMatch(/^ERR_\d+_[a-zA-Z0-9]+$/);
    });
  });

  describe('Manufacturing-Specific Error Handling', () => {
    test('should handle station identification errors', async () => {
      const app = express();
      
      app.get('/test-station-required', (req, res, next) => {
        if (!req.station?.id) {
          next(new StationError('Station identification required', null, { header: 'x-station-id' }));
        } else {
          res.json({ success: true });
        }
      });
      
      app.use(globalErrorHandler);
      
      const response = await request(app).get('/test-station-required');
      
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('STATION_ERROR');
      expect(response.body.error.context.header).toBe('x-station-id');
    });

    test('should handle workflow state errors', async () => {
      const response = await request(app).get('/test-workflow-error');
      
      expect(response.status).toBe(409);
      expect(response.body.error.context.panelId).toBe('PANEL_123');
      expect(response.body.error.context.currentState).toBe('SCANNED');
      expect(response.body.error.context.attemptedAction).toBe('PROCESS');
      expect(response.body.error.context.allowedTransitions).toEqual(['SCANNED', 'VALIDATED']);
    });
  });
});

describe('Error Handler Integration', () => {
  test('should integrate with Express app correctly', () => {
    const app = express();
    
    // Add error handling middleware
    app.use(globalErrorHandler);
    app.use(notFoundHandler);
    
    expect(app._router.stack).toBeDefined();
  });

  test('should handle process errors correctly', () => {
    const setupProcessErrorHandlers = require('../errorHandler.js').setupProcessErrorHandlers;
    
    // Mock process event handlers
    const mockProcess = {
      on: jest.fn()
    };
    
    const originalProcess = global.process;
    global.process = mockProcess;
    
    setupProcessErrorHandlers();
    
    expect(mockProcess.on).toHaveBeenCalledWith('uncaughtException', expect.any(Function));
    expect(mockProcess.on).toHaveBeenCalledWith('unhandledRejection', expect.any(Function));
    expect(mockProcess.on).toHaveBeenCalledWith('warning', expect.any(Function));
    
    // Restore original process
    global.process = originalProcess;
  });
});
