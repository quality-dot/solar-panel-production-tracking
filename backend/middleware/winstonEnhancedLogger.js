// Winston-Enhanced Logger Middleware for Solar Panel Production Tracking System
// Integrates Winston logging with existing manufacturing logging functionality

import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';
import loggerService, { 
  setCorrelationId, 
  logManufacturing, 
  logSecurity, 
  logAPI, 
  logPerformance 
} from '../services/loggerService.js';
import { logUtils } from '../utils/logFormatters.js';

/**
 * Winston-Enhanced Manufacturing Logger
 * Extends the existing ManufacturingLogger with Winston capabilities
 */
export class WinstonEnhancedManufacturingLogger {
  constructor(name = 'manufacturing') {
    this.name = name;
    this.correlationId = null;
  }

  /**
   * Set correlation ID for request tracing
   */
  setCorrelationId(correlationId) {
    this.correlationId = correlationId;
    setCorrelationId(correlationId);
  }

  /**
   * Log station action with Winston
   */
  stationAction(stationId, lineNumber, action, panelBarcode, result, meta = {}) {
    const manufacturingContext = logUtils.createManufacturingContext(
      stationId,
      lineNumber,
      action,
      panelBarcode,
      meta.batchId,
      meta.operatorId
    );

    logManufacturing('info', `Station Action: ${action}`, {
      ...manufacturingContext,
      result,
      category: 'station_operation',
      ...meta
    }, 'manufacturing');
  }

  /**
   * Log barcode action with Winston
   */
  barcodeAction(barcode, action, stationId, success, meta = {}) {
    const manufacturingContext = logUtils.createManufacturingContext(
      stationId,
      meta.lineNumber,
      action,
      barcode,
      meta.batchId,
      meta.operatorId
    );

    logManufacturing('info', `Barcode ${action}: ${barcode}`, {
      ...manufacturingContext,
      success,
      category: 'barcode_processing',
      ...meta
    }, 'manufacturing');
  }

  /**
   * Log performance metrics with Winston
   */
  performanceMetric(metric, value, unit, context = {}) {
    const performanceContext = logUtils.createPerformanceContext(
      context.responseTime,
      context.memoryUsage,
      context.cpuUsage,
      context.databaseQueries,
      context.cacheHits,
      context.cacheMisses
    );

    logPerformance('info', `Performance: ${metric} = ${value} ${unit}`, {
      ...performanceContext,
      metric,
      value,
      unit,
      category: 'performance',
      ...context
    }, 'performance');
  }

  /**
   * Log security events with Winston
   */
  securityEvent(event, severity, details = {}) {
    const securityContext = logUtils.createSecurityContext(
      details.userId,
      details.action,
      details.resource,
      details.riskLevel,
      details.threatType
    );

    logSecurity(severity, `Security Event: ${event}`, {
      ...securityContext,
      event,
      category: 'security',
      ...details
    }, 'security');
  }

  /**
   * Log error with Winston
   */
  error(message, meta = {}) {
    loggerService.error(new Error(message), {
      ...meta,
      category: 'error',
      correlationId: this.correlationId
    }, 'default');
  }

  /**
   * Log warning with Winston
   */
  warn(message, meta = {}) {
    loggerService.warn(message, {
      ...meta,
      category: 'warning',
      correlationId: this.correlationId
    }, 'default');
  }

  /**
   * Log info with Winston
   */
  info(message, meta = {}) {
    loggerService.info(message, {
      ...meta,
      category: 'info',
      correlationId: this.correlationId
    }, 'default');
  }

  /**
   * Log debug with Winston
   */
  debug(message, meta = {}) {
    loggerService.debug(message, {
      ...meta,
      category: 'debug',
      correlationId: this.correlationId
    }, 'default');
  }
}

// Create enhanced logger instance
export const winstonEnhancedLogger = new WinstonEnhancedManufacturingLogger();

/**
 * Winston-Enhanced Morgan HTTP request logging
 */
export const createWinstonEnhancedRequestLogger = () => {
  // Custom Morgan tokens for manufacturing context
  morgan.token('station-id', (req) => req.station?.id || 'unknown');
  morgan.token('line-number', (req) => req.station?.line || 'unknown');
  morgan.token('correlation-id', (req) => req.correlationId || 'unknown');
  morgan.token('response-time-color', (req, res) => {
    const ms = parseFloat(res.getHeader('X-Response-Time')) || 0;
    if (ms < 100) return '\x1b[32m'; // Green
    if (ms < 500) return '\x1b[33m'; // Yellow
    return '\x1b[31m'; // Red
  });

  // Custom format for manufacturing operations with Winston
  const winstonManufacturingFormat = config.environment === 'development' 
    ? ':response-time-color:method :url :status :res[content-length] - :response-time ms | Station: :station-id Line: :line-number | ID: :correlation-id\x1b[0m'
    : JSON.stringify({
        method: ':method',
        url: ':url',
        status: ':status',
        responseTime: ':response-time',
        contentLength: ':res[content-length]',
        userAgent: ':user-agent',
        station: ':station-id',
        line: ':line-number',
        correlationId: ':correlation-id',
        timestamp: ':date[iso]'
      });

  // Create write stream for request logs if file logging is enabled
  let accessLogStream;
  if (config.logging?.enableFile) {
    const logDir = path.join(process.cwd(), 'backend', 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const accessLogPath = path.join(logDir, `access-${new Date().toISOString().split('T')[0]}.log`);
    accessLogStream = fs.createWriteStream(accessLogPath, { flags: 'a' });
  }

  return morgan(winstonManufacturingFormat, {
    stream: accessLogStream || process.stdout,
    skip: (req, res) => {
      // Skip logging health checks in production to reduce noise
      if (config.environment === 'production') {
        return req.path === '/health' || req.path === '/status' || req.path === '/ready';
      }
      return false;
    }
  });
};

/**
 * Winston-Enhanced Request Timing Middleware
 */
export const winstonEnhancedRequestTiming = (req, res, next) => {
  const startTime = Date.now();
  
  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - startTime;
    res.setHeader('X-Response-Time', `${duration}ms`);
    
    // Log slow requests with Winston
    if (duration > 1000) { // Requests taking more than 1 second
      const performanceContext = logUtils.createPerformanceContext(
        duration,
        process.memoryUsage(),
        null,
        null,
        null,
        null
      );

      logPerformance('warn', 'Slow request detected', {
        ...performanceContext,
        method: req.method,
        url: req.url,
        station: req.station?.id,
        line: req.station?.line,
        category: 'performance_warning'
      }, 'performance');
    }
    
    originalEnd.apply(this, args);
  };
  
  next();
};

/**
 * Winston-Enhanced Manufacturing Activity Tracker
 */
export const winstonEnhancedManufacturingActivityTracker = (req, res, next) => {
  // Track barcode scanning activities
  if (req.path.includes('/scan') || req.path.includes('/barcode')) {
    const originalJson = res.json;
    res.json = function(data) {
      if (data && data.barcode) {
        winstonEnhancedLogger.barcodeAction(
          data.barcode,
          'scanned',
          req.station?.id,
          data.success || false,
          {
            url: req.url,
            method: req.method,
            ip: req.ip,
            lineNumber: req.station?.line,
            batchId: data.batchId,
            operatorId: data.operatorId
          }
        );
      }
      originalJson.call(this, data);
    };
  }

  // Track pass/fail operations
  if (req.path.includes('/inspection') || req.method === 'POST' && req.body) {
    const originalJson = res.json;
    res.json = function(data) {
      if (req.body && (req.body.pass !== undefined || req.body.fail !== undefined)) {
        winstonEnhancedLogger.stationAction(
          req.station?.id,
          req.station?.line,
          'inspection',
          req.body.barcode || req.body.panelId,
          req.body.pass ? 'PASS' : 'FAIL',
          {
            criteria: req.body.criteria,
            notes: req.body.notes,
            batchId: req.body.batchId,
            operatorId: req.body.operatorId
          }
        );
      }
      originalJson.call(this, data);
    };
  }

  next();
};

/**
 * Winston-Enhanced Error Logger
 */
export const winstonEnhancedErrorLogger = (error, req, res, next) => {
  const apiContext = logUtils.createAPIContext(
    req.path,
    req.method,
    res.statusCode,
    req.get('User-Agent'),
    req.ip,
    req.correlationId
  );

  logAPI('error', 'Application error', {
    ...apiContext,
    error: error.message,
    stack: error.stack,
    station: req.station?.id,
    line: req.station?.line,
    body: req.method !== 'GET' ? req.body : undefined,
    timestamp: req.timestamp,
    category: 'application_error'
  }, 'api');

  next(error);
};

/**
 * Winston-Enhanced Health Check Logger
 */
export const winstonEnhancedHealthCheckLogger = (req, res, next) => {
  if (req.path === '/health' || req.path === '/status') {
    // Don't log health checks unless they fail
    const originalStatus = res.status;
    res.status = function(code) {
      if (code !== 200) {
        const apiContext = logUtils.createAPIContext(
          req.path,
          req.method,
          code,
          req.get('User-Agent'),
          req.ip,
          req.correlationId
        );

        logAPI('warn', 'Health check failed', {
          ...apiContext,
          category: 'health_check_failure'
        }, 'api');
      }
      return originalStatus.call(this, code);
    };
  }
  next();
};

/**
 * Winston-Enhanced Correlation ID Middleware
 */
export const winstonEnhancedCorrelationId = (req, res, next) => {
  // Generate correlation ID if not present
  if (!req.correlationId) {
    req.correlationId = uuidv4();
  }
  
  // Set correlation ID in response headers
  res.setHeader('X-Correlation-ID', req.correlationId);
  
  // Set correlation ID in enhanced logger
  winstonEnhancedLogger.setCorrelationId(req.correlationId);
  
  next();
};

/**
 * Winston-Enhanced Logging Middleware Factory
 */
export const createWinstonEnhancedLoggingMiddleware = (options = {}) => {
  const {
    enableCorrelationId = true,
    enableRequestTiming = true,
    enableManufacturingTracking = true,
    enableErrorLogging = true,
    enableHealthCheckLogging = true,
    enableRequestLogging = true
  } = options;

  const middleware = [];

  if (enableCorrelationId) middleware.push(winstonEnhancedCorrelationId);
  if (enableRequestTiming) middleware.push(winstonEnhancedRequestTiming);
  if (enableManufacturingTracking) middleware.push(winstonEnhancedManufacturingActivityTracker);
  if (enableRequestLogging) middleware.push(createWinstonEnhancedRequestLogger());
  if (enableHealthCheckLogging) middleware.push(winstonEnhancedHealthCheckLogger);

  return middleware;
};

export default {
  WinstonEnhancedManufacturingLogger,
  winstonEnhancedLogger,
  createWinstonEnhancedRequestLogger,
  winstonEnhancedRequestTiming,
  winstonEnhancedManufacturingActivityTracker,
  winstonEnhancedErrorLogger,
  winstonEnhancedHealthCheckLogger,
  winstonEnhancedCorrelationId,
  createWinstonEnhancedLoggingMiddleware
};
