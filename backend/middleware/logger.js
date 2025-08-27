// Logging and monitoring middleware for manufacturing environment
// Production-grade logging for solar panel tracking system

import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import { config } from '../config/index.js';

/**
 * Ensure log directory exists
 */
const ensureLogDirectory = () => {
  const logDir = config.logging.logDirectory;
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
    console.log(`📁 Created log directory: ${logDir}`);
  }
};

/**
 * Custom manufacturing logger utility
 * Station-aware logging with production context
 */
export class ManufacturingLogger {
  constructor(name = 'manufacturing') {
    this.name = name;
    this.logLevels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
    this.currentLevel = this.logLevels[config.logging.level] || 2;
  }

  _formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      logger: this.name,
      message,
      ...meta
    };

    return JSON.stringify(logEntry);
  }

  _shouldLog(level) {
    return this.logLevels[level] <= this.currentLevel;
  }

  _writeToFile(logEntry) {
    if (config.logging.enableFile) {
      try {
        ensureLogDirectory();
        const logFile = path.join(config.logging.logDirectory, `manufacturing-${new Date().toISOString().split('T')[0]}.log`);
        fs.appendFileSync(logFile, logEntry + '\n');
      } catch (error) {
        console.error('Failed to write to log file:', error.message);
      }
    }
  }

  _output(level, message, meta) {
    if (!this._shouldLog(level)) return;

    const logEntry = this._formatMessage(level, message, meta);

    // Console output
    if (config.logging.enableConsole) {
      const colorMap = {
        error: '\x1b[31m', // Red
        warn: '\x1b[33m',  // Yellow
        info: '\x1b[36m',  // Cyan
        debug: '\x1b[37m'  // White
      };
      const resetColor = '\x1b[0m';
      console.log(`${colorMap[level] || ''}${logEntry}${resetColor}`);
    }

    // File output
    this._writeToFile(logEntry);
  }

  error(message, meta = {}) {
    this._output('error', message, meta);
  }

  warn(message, meta = {}) {
    this._output('warn', message, meta);
  }

  info(message, meta = {}) {
    this._output('info', message, meta);
  }

  debug(message, meta = {}) {
    this._output('debug', message, meta);
  }

  // Manufacturing-specific logging methods
  stationAction(stationId, lineNumber, action, panelBarcode, result, meta = {}) {
    this.info(`Station Action: ${action}`, {
      station: stationId,
      line: lineNumber,
      panel: panelBarcode,
      result,
      category: 'station_operation',
      ...meta
    });
  }

  barcodeAction(barcode, action, stationId, success, meta = {}) {
    this.info(`Barcode ${action}: ${barcode}`, {
      barcode,
      action,
      station: stationId,
      success,
      category: 'barcode_processing',
      ...meta
    });
  }

  performanceMetric(metric, value, unit, context = {}) {
    this.info(`Performance: ${metric} = ${value} ${unit}`, {
      metric,
      value,
      unit,
      category: 'performance',
      ...context
    });
  }

  securityEvent(event, severity, details = {}) {
    this[severity](`Security Event: ${event}`, {
      event,
      category: 'security',
      ...details
    });
  }
}

// Create default logger instance
export const manufacturingLogger = new ManufacturingLogger();

/**
 * Morgan HTTP request logging with manufacturing context
 */
export const createRequestLogger = () => {
  // Custom Morgan token for station identification
  morgan.token('station-id', (req) => req.station?.id || 'unknown');
  morgan.token('line-number', (req) => req.station?.line || 'unknown');
  morgan.token('response-time-color', (req, res) => {
    const ms = parseFloat(res.getHeader('X-Response-Time')) || 0;
    if (ms < 100) return '\x1b[32m'; // Green
    if (ms < 500) return '\x1b[33m'; // Yellow
    return '\x1b[31m'; // Red
  });

  // Custom format for manufacturing operations
  const manufacturingFormat = config.environment === 'development' 
    ? ':response-time-color:method :url :status :res[content-length] - :response-time ms | Station: :station-id Line: :line-number\x1b[0m'
    : JSON.stringify({
        method: ':method',
        url: ':url',
        status: ':status',
        responseTime: ':response-time',
        contentLength: ':res[content-length]',
        userAgent: ':user-agent',
        station: ':station-id',
        line: ':line-number',
        timestamp: ':date[iso]'
      });

  // Create write stream for request logs if file logging is enabled
  let accessLogStream;
  if (config.logging.enableFile) {
    ensureLogDirectory();
    const accessLogPath = path.join(config.logging.logDirectory, `access-${new Date().toISOString().split('T')[0]}.log`);
    accessLogStream = fs.createWriteStream(accessLogPath, { flags: 'a' });
  }

  return morgan(manufacturingFormat, {
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
 * Request timing middleware
 * Adds response time headers and performance tracking
 */
export const requestTiming = (req, res, next) => {
  const startTime = Date.now();
  
  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - startTime;
    res.setHeader('X-Response-Time', `${duration}ms`);
    
    // Log slow requests for performance monitoring
    if (duration > 1000) { // Requests taking more than 1 second
      manufacturingLogger.warn('Slow request detected', {
        method: req.method,
        url: req.url,
        duration,
        station: req.station?.id,
        line: req.station?.line,
        category: 'performance'
      });
    }
    
    originalEnd.apply(this, args);
  };
  
  next();
};

/**
 * Manufacturing activity tracking middleware
 * Logs specific manufacturing operations
 */
export const manufacturingActivityTracker = (req, res, next) => {
  // Track barcode scanning activities
  if (req.path.includes('/scan') || req.path.includes('/barcode')) {
    const originalJson = res.json;
    res.json = function(data) {
      if (data && data.barcode) {
        manufacturingLogger.barcodeAction(
          data.barcode,
          'scanned',
          req.station?.id,
          data.success || false,
          {
            url: req.url,
            method: req.method,
            ip: req.ip
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
        manufacturingLogger.stationAction(
          req.station?.id,
          req.station?.line,
          'inspection',
          req.body.barcode || req.body.panelId,
          req.body.pass ? 'PASS' : 'FAIL',
          {
            criteria: req.body.criteria,
            notes: req.body.notes
          }
        );
      }
      originalJson.call(this, data);
    };
  }

  next();
};

/**
 * Error logging middleware
 * Captures and logs application errors with context
 */
export const errorLogger = (error, req, res, next) => {
  manufacturingLogger.error('Application error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    station: req.station?.id,
    line: req.station?.line,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    body: req.method !== 'GET' ? req.body : undefined,
    timestamp: req.timestamp
  });

  next(error);
};

/**
 * Health check and monitoring endpoint middleware
 */
export const healthCheckLogger = (req, res, next) => {
  if (req.path === '/health' || req.path === '/status') {
    // Don't log health checks unless they fail
    const originalStatus = res.status;
    res.status = function(code) {
      if (code !== 200) {
        manufacturingLogger.warn('Health check failed', {
          path: req.path,
          statusCode: code,
          category: 'health_check'
        });
      }
      return originalStatus.call(this, code);
    };
  }
  next();
};

export default {
  ManufacturingLogger,
  manufacturingLogger,
  createRequestLogger,
  requestTiming,
  manufacturingActivityTracker,
  errorLogger,
  healthCheckLogger
};
