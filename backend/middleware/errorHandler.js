// Global error handling middleware for manufacturing environment
// Production-grade error handling for solar panel tracking system

import { manufacturingLogger } from './logger.js';
import { config } from '../config/index.js';

/**
 * Custom error classes for manufacturing operations
 */
export class ManufacturingError extends Error {
  constructor(message, code = 'MANUFACTURING_ERROR', statusCode = 500, details = {}) {
    super(message);
    this.name = 'ManufacturingError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

export class ValidationError extends ManufacturingError {
  constructor(message, details = {}) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class BarcodeError extends ManufacturingError {
  constructor(message, barcode, details = {}) {
    super(message, 'BARCODE_ERROR', 400, { barcode, ...details });
    this.name = 'BarcodeError';
  }
}

export class DatabaseError extends ManufacturingError {
  constructor(message, operation, details = {}) {
    super(message, 'DATABASE_ERROR', 500, { operation, ...details });
    this.name = 'DatabaseError';
  }
}

export class AuthenticationError extends ManufacturingError {
  constructor(message, details = {}) {
    super(message, 'AUTHENTICATION_ERROR', 401, details);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends ManufacturingError {
  constructor(message, requiredRole, details = {}) {
    super(message, 'AUTHORIZATION_ERROR', 403, { requiredRole, ...details });
    this.name = 'AuthorizationError';
  }
}

export class StationError extends ManufacturingError {
  constructor(message, stationId, details = {}) {
    super(message, 'STATION_ERROR', 400, { stationId, ...details });
    this.name = 'StationError';
  }
}

export class WorkflowError extends ManufacturingError {
  constructor(message, panelId, currentState, attemptedAction, details = {}) {
    super(message, 'WORKFLOW_ERROR', 409, { panelId, currentState, attemptedAction, ...details });
    this.name = 'WorkflowError';
  }
}

/**
 * Error classification and handling utilities
 */
export class ErrorHandler {
  static isOperationalError(error) {
    if (error instanceof ManufacturingError) {
      return true;
    }
    
    // Check for known operational error patterns
    const operationalPatterns = [
      'ECONNREFUSED',  // Database connection issues
      'ETIMEDOUT',     // Timeout errors
      'ENOTFOUND',     // DNS resolution issues
      'EPIPE',         // Broken pipe
      'ECONNRESET'     // Connection reset
    ];
    
    return operationalPatterns.some(pattern => 
      error.code === pattern || error.message.includes(pattern)
    );
  }

  static getErrorCategory(error) {
    if (error instanceof ValidationError) return 'validation';
    if (error instanceof BarcodeError) return 'barcode';
    if (error instanceof DatabaseError) return 'database';
    if (error instanceof AuthenticationError) return 'authentication';
    if (error instanceof AuthorizationError) return 'authorization';
    if (error instanceof StationError) return 'station';
    if (error instanceof WorkflowError) return 'workflow';
    
    // Database-specific errors
    if (error.code === '23505') return 'duplicate_key';
    if (error.code === '23503') return 'foreign_key_violation';
    if (error.code === '23514') return 'check_violation';
    if (error.code?.startsWith('23')) return 'constraint_violation';
    if (error.code?.startsWith('42')) return 'syntax_error';
    if (error.code?.startsWith('08')) return 'connection_error';
    
    return 'unknown';
  }

  static getRecoveryStrategy(error) {
    const category = this.getErrorCategory(error);
    
    const strategies = {
      validation: 'retry_with_corrections',
      barcode: 'manual_entry_available',
      database: 'retry_after_delay',
      authentication: 'require_relogin',
      authorization: 'contact_supervisor',
      station: 'check_station_config',
      workflow: 'review_panel_state',
      duplicate_key: 'check_existing_data',
      foreign_key_violation: 'verify_references',
      check_violation: 'validate_constraints',
      constraint_violation: 'review_data_integrity',
      connection_error: 'retry_connection',
      unknown: 'contact_support'
    };

    return strategies[category] || 'contact_support';
  }
}

/**
 * Async error wrapper for route handlers
 * Ensures all async errors are properly caught
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Manufacturing-specific error response formatter
 */
export const formatErrorResponse = (error, req) => {
  const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const category = ErrorHandler.getErrorCategory(error);
  const recoveryStrategy = ErrorHandler.getRecoveryStrategy(error);
  
  const baseResponse = {
    success: false,
    error: {
      id: errorId,
      message: error.message,
      code: error.code || 'UNKNOWN_ERROR',
      category,
      recoveryStrategy,
      timestamp: new Date().toISOString()
    }
  };

  // Add manufacturing context
  if (req.station?.id) {
    baseResponse.error.station = {
      id: req.station.id,
      line: req.station.line
    };
  }

  // Add development details
  if (config.environment === 'development') {
    baseResponse.error.details = {
      stack: error.stack,
      originalError: error.toString(),
      ...(error.details || {})
    };
  }

  // Add production-safe details for specific error types
  if (error instanceof ManufacturingError && error.details) {
    baseResponse.error.context = error.details;
  }

  return baseResponse;
};

/**
 * Main error handling middleware
 */
export const globalErrorHandler = (error, req, res, next) => {
  // Log the error with full context
  manufacturingLogger.error('Application error occurred', {
    errorId: `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    error: error.message,
    stack: error.stack,
    code: error.code,
    category: ErrorHandler.getErrorCategory(error),
    url: req.url,
    method: req.method,
    station: req.station?.id,
    line: req.station?.line,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    body: req.method !== 'GET' ? req.body : undefined,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    params: Object.keys(req.params).length > 0 ? req.params : undefined,
    timestamp: req.timestamp,
    operational: ErrorHandler.isOperationalError(error)
  });

  // Determine status code
  let statusCode = 500;
  if (error.statusCode) {
    statusCode = error.statusCode;
  } else if (error instanceof ManufacturingError) {
    statusCode = error.statusCode;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
  } else if (error.name === 'ForbiddenError') {
    statusCode = 403;
  } else if (error.name === 'NotFoundError') {
    statusCode = 404;
  } else if (error.code === '23505') { // Duplicate key
    statusCode = 409;
  } else if (error.code?.startsWith('23')) { // Constraint violations
    statusCode = 400;
  }

  // Format and send error response
  const errorResponse = formatErrorResponse(error, req);
  res.status(statusCode).json(errorResponse);

  // For critical errors, consider alerting
  if (!ErrorHandler.isOperationalError(error) && config.environment === 'production') {
    manufacturingLogger.error('Critical application error', {
      error: error.message,
      stack: error.stack,
      category: 'critical',
      url: req.url,
      station: req.station?.id
    });
    // TODO: Add alerting integration (email, Slack, etc.)
  }
};

/**
 * 404 handler for manufacturing context
 */
export const notFoundHandler = (req, res) => {
  const error = new ManufacturingError(
    `Route not found: ${req.method} ${req.originalUrl}`,
    'ROUTE_NOT_FOUND',
    404,
    {
      path: req.originalUrl,
      method: req.method,
      availableEndpoints: [
        'GET /health',
        'GET /status',
        'POST /api/v1/auth/login',
        'GET /api/v1/stations',
        'POST /api/v1/panels/scan'
        // TODO: Add more endpoints as they're implemented
      ]
    }
  );

  manufacturingLogger.warn('Route not found', {
    path: req.originalUrl,
    method: req.method,
    station: req.station?.id,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  const errorResponse = formatErrorResponse(error, req);
  res.status(404).json(errorResponse);
};

/**
 * Process exit handlers for unhandled errors
 */
export const setupProcessErrorHandlers = () => {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    manufacturingLogger.error('Uncaught Exception', {
      error: error.message,
      stack: error.stack,
      category: 'critical'
    });
    
    // Give time for logs to flush
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    manufacturingLogger.error('Unhandled Promise Rejection', {
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise: promise.toString(),
      category: 'critical'
    });
    
    // Don't exit immediately, but log for investigation
    // In production, you might want to restart the service
  });

  // Handle warnings
  process.on('warning', (warning) => {
    manufacturingLogger.warn('Process Warning', {
      name: warning.name,
      message: warning.message,
      stack: warning.stack
    });
  });
};

export default {
  ManufacturingError,
  ValidationError,
  BarcodeError,
  DatabaseError,
  AuthenticationError,
  AuthorizationError,
  StationError,
  WorkflowError,
  ErrorHandler,
  asyncHandler,
  formatErrorResponse,
  globalErrorHandler,
  notFoundHandler,
  setupProcessErrorHandlers
};
