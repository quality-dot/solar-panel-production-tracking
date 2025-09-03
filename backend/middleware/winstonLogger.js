// Winston Logger Middleware for Express
// Integrates Winston logging with Express middleware stack

import { v4 as uuidv4 } from 'uuid';
import loggerService, { setCorrelationId, logAPI } from '../services/loggerService.js';

/**
 * Winston Logger Middleware
 * Provides structured logging with correlation IDs for all HTTP requests
 */
export const winstonLoggerMiddleware = (req, res, next) => {
  // Generate correlation ID for request tracing
  const correlationId = uuidv4();
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  
  // Set correlation ID in logger service
  setCorrelationId(correlationId);

  // Log request start
  const startTime = Date.now();
  logAPI('info', 'HTTP Request Started', {
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    correlationId,
    timestamp: new Date().toISOString()
  }, 'api');

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - startTime;
    
    // Log response completion
    logAPI('info', 'HTTP Request Completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      correlationId,
      timestamp: new Date().toISOString()
    }, 'api');

    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Winston Error Logger Middleware
 * Logs errors with full context and stack traces
 */
export const winstonErrorLogger = (err, req, res, next) => {
  const correlationId = req.correlationId || 'unknown';
  
  // Log error with full context
  loggerService.error(err, {
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    correlationId,
    timestamp: new Date().toISOString(),
    errorType: 'http_error'
  }, 'api');

  next(err);
};

/**
 * Winston Security Logger Middleware
 * Logs security-related events with enhanced context
 */
export const winstonSecurityLogger = (req, res, next) => {
  // Log authentication attempts
  if (req.path.includes('/auth') || req.path.includes('/login')) {
    logAPI('info', 'Authentication Attempt', {
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
      eventType: 'authentication'
    }, 'security');
  }

  // Log authorization attempts
  if (req.headers.authorization) {
    logAPI('debug', 'Authorization Header Present', {
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection.remoteAddress,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
      eventType: 'authorization'
    }, 'security');
  }

  next();
};

/**
 * Winston Manufacturing Logger Middleware
 * Logs manufacturing-specific events with enhanced context
 */
export const winstonManufacturingLogger = (req, res, next) => {
  // Log manufacturing operations
  if (req.path.includes('/manufacturing') || req.path.includes('/panels') || req.path.includes('/stations')) {
    logAPI('info', 'Manufacturing Operation', {
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection.remoteAddress,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
      eventType: 'manufacturing_operation',
      operation: req.method + ' ' + req.path
    }, 'manufacturing');
  }

  next();
};

/**
 * Winston Performance Logger Middleware
 * Logs performance metrics for requests
 */
export const winstonPerformanceLogger = (req, res, next) => {
  const startTime = process.hrtime.bigint();
  
  // Override res.end to measure performance
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Number(process.hrtime.bigint() - startTime) / 1000000; // Convert to milliseconds
    
    // Log performance metrics for slow requests
    if (duration > 1000) { // Log requests taking more than 1 second
      logAPI('warn', 'Slow Request Detected', {
        method: req.method,
        url: req.url,
        duration: `${duration.toFixed(2)}ms`,
        correlationId: req.correlationId,
        timestamp: new Date().toISOString(),
        eventType: 'performance_warning'
      }, 'performance');
    }

    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Winston Database Logger Middleware
 * Logs database operations with context
 */
export const winstonDatabaseLogger = (req, res, next) => {
  // Log database-related operations
  if (req.path.includes('/database') || req.path.includes('/migrate')) {
    logAPI('info', 'Database Operation', {
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection.remoteAddress,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
      eventType: 'database_operation'
    }, 'database');
  }

  next();
};

/**
 * Winston Health Check Logger Middleware
 * Logs health check requests
 */
export const winstonHealthLogger = (req, res, next) => {
  if (req.path === '/health' || req.path === '/healthz') {
    logAPI('debug', 'Health Check Request', {
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection.remoteAddress,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
      eventType: 'health_check'
    }, 'api');
  }

  next();
};

/**
 * Winston Request Body Logger Middleware
 * Logs request body for debugging (with sensitive data filtering)
 */
export const winstonRequestBodyLogger = (req, res, next) => {
  // Only log in development mode
  if (process.env.NODE_ENV === 'development' && req.body) {
    // Filter out sensitive fields
    const sanitizedBody = { ...req.body };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    
    sensitiveFields.forEach(field => {
      if (sanitizedBody[field]) {
        sanitizedBody[field] = '[REDACTED]';
      }
    });

    logAPI('debug', 'Request Body', {
      method: req.method,
      url: req.url,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
      eventType: 'request_body',
      body: sanitizedBody
    }, 'api');
  }

  next();
};

/**
 * Winston Response Logger Middleware
 * Logs response data for debugging (with sensitive data filtering)
 */
export const winstonResponseLogger = (req, res, next) => {
  // Only log in development mode
  if (process.env.NODE_ENV === 'development') {
    const originalSend = res.send;
    res.send = function(data) {
      // Filter out sensitive fields in response
      let sanitizedData = data;
      if (typeof data === 'string') {
        try {
          const parsed = JSON.parse(data);
          const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
          
          sensitiveFields.forEach(field => {
            if (parsed[field]) {
              parsed[field] = '[REDACTED]';
            }
          });
          
          sanitizedData = JSON.stringify(parsed);
        } catch (e) {
          // Not JSON, use as-is
          sanitizedData = data;
        }
      }

      logAPI('debug', 'Response Data', {
        method: req.method,
        url: req.url,
        correlationId: req.correlationId,
        timestamp: new Date().toISOString(),
        eventType: 'response_data',
        response: sanitizedData
      }, 'api');

      // Call original send method
      originalSend.call(this, data);
    };
  }

  next();
};

/**
 * Winston Middleware Factory
 * Creates a configured Winston middleware stack
 */
export const createWinstonMiddleware = (options = {}) => {
  const {
    enableSecurityLogging = true,
    enableManufacturingLogging = true,
    enablePerformanceLogging = true,
    enableDatabaseLogging = true,
    enableHealthLogging = true,
    enableRequestBodyLogging = process.env.NODE_ENV === 'development',
    enableResponseLogging = process.env.NODE_ENV === 'development'
  } = options;

  const middleware = [winstonLoggerMiddleware];

  if (enableSecurityLogging) middleware.push(winstonSecurityLogger);
  if (enableManufacturingLogging) middleware.push(winstonManufacturingLogger);
  if (enablePerformanceLogging) middleware.push(winstonPerformanceLogger);
  if (enableDatabaseLogging) middleware.push(winstonDatabaseLogger);
  if (enableHealthLogging) middleware.push(winstonHealthLogger);
  if (enableRequestBodyLogging) middleware.push(winstonRequestBodyLogger);
  if (enableResponseLogging) middleware.push(winstonResponseLogger);

  return middleware;
};

// Export individual middleware for selective use
export {
  winstonLoggerMiddleware as default,
  winstonErrorLogger,
  winstonSecurityLogger,
  winstonManufacturingLogger,
  winstonPerformanceLogger,
  winstonDatabaseLogger,
  winstonHealthLogger,
  winstonRequestBodyLogger,
  winstonResponseLogger
};
