// Winston.js Logger Service for Solar Panel Production Tracking System
// Enterprise-grade logging with structured logging, correlation IDs, and log rotation

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { config } from '../config/index.js';

/**
 * Winston Logger Service
 * Provides enterprise-grade logging with structured logging, correlation IDs, and log rotation
 */
class LoggerService {
  constructor() {
    this.loggers = new Map();
    this.correlationId = null;
    
    // Performance optimization properties
    this.logQueue = [];
    this.processing = false;
    this.batchSize = 100;
    this.batchTimeout = 1000; // 1 second
    
    this.init();
    
    // Start background batch processing
    this.startBatchProcessing();
  }

  /**
   * Initialize the logger service
   */
  init() {
    // Create default logger
    this.createLogger('default');
    
    // Create specialized loggers for different components
    this.createLogger('security', 'security');
    this.createLogger('manufacturing', 'manufacturing');
    this.createLogger('database', 'database');
    this.createLogger('api', 'api');
    this.createLogger('performance', 'performance');
  }

  /**
   * Create a Winston logger instance
   * @param {string} name - Logger name
   * @param {string} category - Log category for file organization
   */
  createLogger(name, category = 'general') {
    const logDir = path.join(process.cwd(), 'backend', 'logs');
    
    // Define log formats
    const consoleFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, correlationId, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        const correlationStr = correlationId ? `[${correlationId}]` : '';
        return `${timestamp} ${correlationStr} ${level}: ${message} ${metaStr}`;
      })
    );

    const fileFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );

    // Create logger instance
    const logger = winston.createLogger({
      level: config.logging?.level || 'info',
      format: fileFormat,
      defaultMeta: {
        service: 'solar-panel-tracking',
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0'
      },
      transports: [
        // Console transport
        new winston.transports.Console({
          format: consoleFormat,
          level: config.logging?.consoleLevel || 'info'
        }),

        // Daily rotate file transport for general logs
        new DailyRotateFile({
          filename: path.join(logDir, `${category}-%DATE%.log`),
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
          level: config.logging?.fileLevel || 'info'
        }),

        // Error log file
        new DailyRotateFile({
          filename: path.join(logDir, `${category}-error-%DATE%.log`),
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '30d',
          level: 'error'
        })
      ]
    });

    // Add request context to logs
    logger.on('data', (info) => {
      if (this.correlationId) {
        info.correlationId = this.correlationId;
      }
    });

    this.loggers.set(name, logger);
    return logger;
  }

  /**
   * Set correlation ID for request tracing
   * @param {string} correlationId - Unique identifier for request tracing
   */
  setCorrelationId(correlationId) {
    this.correlationId = correlationId;
  }

  /**
   * Get logger by name
   * @param {string} name - Logger name
   * @returns {winston.Logger} Winston logger instance
   */
  getLogger(name = 'default') {
    if (!this.loggers.has(name)) {
      this.createLogger(name);
    }
    return this.loggers.get(name);
  }

  /**
   * Log with correlation ID context
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   * @param {string} loggerName - Logger name to use
   */
  log(level, message, meta = {}, loggerName = 'default') {
    const logger = this.getLogger(loggerName);
    const logData = {
      ...meta,
      correlationId: this.correlationId
    };
    
    logger.log(level, message, logData);
  }

  /**
   * Async logging with batching for high-performance operations
   */
  async logAsync(level, message, meta = {}, loggerName = 'default') {
    const logEntry = {
      level,
      message,
      meta: { ...meta, correlationId: this.correlationId },
      loggerName,
      timestamp: Date.now()
    };
    
    // Add to queue
    this.logQueue.push(logEntry);
    
    // Process immediately if queue is full
    if (this.logQueue.length >= this.batchSize) {
      await this.processBatch();
    }
  }

  /**
   * Process batched log entries
   */
  async processBatch() {
    if (this.processing || this.logQueue.length === 0) return;
    
    this.processing = true;
    const batch = this.logQueue.splice(0, this.batchSize);
    
    try {
      // Process batch in parallel
      const promises = batch.map(entry => 
        this.processLogEntry(entry)
      );
      
      await Promise.all(promises);
    } catch (error) {
      console.error('Batch processing error:', error);
    } finally {
      this.processing = false;
    }
  }

  /**
   * Process individual log entry
   */
  async processLogEntry(entry) {
    try {
      const logger = this.loggers.get(entry.loggerName);
      if (logger) {
        logger.log(entry.level, entry.message, entry.meta);
      }
    } catch (error) {
      console.error('Log entry processing error:', error);
    }
  }

  /**
   * Start background batch processing
   */
  startBatchProcessing() {
    setInterval(() => {
      if (this.logQueue.length > 0) {
        this.processBatch();
      }
    }, this.batchTimeout);
  }

  /**
   * Log error with stack trace
   * @param {Error} error - Error object
   * @param {Object} meta - Additional metadata
   * @param {string} loggerName - Logger name to use
   */
  error(error, meta = {}, loggerName = 'default') {
    const logger = this.getLogger(loggerName);
    const logData = {
      ...meta,
      correlationId: this.correlationId,
      stack: error.stack,
      name: error.name
    };
    
    logger.error(error.message, logData);
  }

  /**
   * Log warning
   * @param {string} message - Warning message
   * @param {Object} meta - Additional metadata
   * @param {string} loggerName - Logger name to use
   */
  warn(message, meta = {}, loggerName = 'default') {
    this.log('warn', message, meta, loggerName);
  }

  /**
   * Log info
   * @param {string} message - Info message
   * @param {Object} meta - Additional metadata
   * @param {string} loggerName - Logger name to use
   */
  info(message, meta = {}, loggerName = 'default') {
    this.log('info', message, meta, loggerName);
  }

  /**
   * Log debug
   * @param {string} message - Debug message
   * @param {Object} meta - Additional metadata
   * @param {string} loggerName - Logger name to use
   */
  debug(message, meta = {}, loggerName = 'default') {
    this.log('debug', message, meta, loggerName);
  }

  /**
   * Log with manufacturing context
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} manufacturingContext - Manufacturing-specific context
   * @param {string} loggerName - Logger name to use
   */
  logManufacturing(level, message, manufacturingContext = {}, loggerName = 'manufacturing') {
    const meta = {
      ...manufacturingContext,
      type: 'manufacturing',
      timestamp: new Date().toISOString()
    };
    
    this.log(level, message, meta, loggerName);
  }

  /**
   * Log security event
   * @param {string} level - Log level
   * @param {string} message - Security message
   * @param {Object} securityContext - Security-specific context
   * @param {string} loggerName - Logger name to use
   */
  logSecurity(level, message, securityContext = {}, loggerName = 'security') {
    const meta = {
      ...securityContext,
      type: 'security',
      timestamp: new Date().toISOString()
    };
    
    this.log(level, message, meta, loggerName);
  }

  /**
   * Log API request/response
   * @param {string} level - Log level
   * @param {string} message - API message
   * @param {Object} apiContext - API-specific context
   * @param {string} loggerName - Logger name to use
   */
  logAPI(level, message, apiContext = {}, loggerName = 'api') {
    const meta = {
      ...apiContext,
      type: 'api',
      timestamp: new Date().toISOString()
    };
    
    this.log(level, message, meta, loggerName);
  }

  /**
   * Log performance metrics
   * @param {string} level - Log level
   * @param {string} message - Performance message
   * @param {Object} performanceContext - Performance-specific context
   * @param {string} loggerName - Logger name to use
   */
  logPerformance(level, message, performanceContext = {}, loggerName = 'performance') {
    const meta = {
      ...performanceContext,
      type: 'performance',
      timestamp: new Date().toISOString()
    };
    
    this.log(level, message, meta, loggerName);
  }

  /**
   * Get log statistics
   * @returns {Object} Log statistics
   */
  getStats() {
    const stats = {};
    for (const [name, logger] of this.loggers) {
      stats[name] = {
        level: logger.level,
        transports: logger.transports.length
      };
    }
    return stats;
  }

  /**
   * Close all loggers
   */
  async close() {
    const closePromises = [];
    for (const [name, logger] of this.loggers) {
      closePromises.push(logger.end());
    }
    await Promise.all(closePromises);
  }
}

// Create singleton instance
const loggerService = new LoggerService();

// Export both the service and convenience methods
export { loggerService as default, LoggerService };

// Convenience methods for direct usage
export const log = (level, message, meta, loggerName) => loggerService.log(level, message, meta, loggerName);
export const logAsync = (level, message, meta, loggerName) => loggerService.logAsync(level, message, meta, loggerName);
export const error = (error, meta, loggerName) => loggerService.error(error, meta, loggerName);
export const warn = (message, meta, loggerName) => loggerService.warn(message, meta, loggerName);
export const info = (message, meta, loggerName) => loggerService.info(message, meta, loggerName);
export const debug = (message, meta, loggerName) => loggerService.debug(message, meta, loggerName);

// Specialized logging methods
export const logManufacturing = (level, message, context, loggerName) => 
  loggerService.logManufacturing(level, message, context, loggerName);
export const logSecurity = (level, message, context, loggerName) => 
  loggerService.logSecurity(level, message, context, loggerName);
export const logAPI = (level, message, context, loggerName) => 
  loggerService.logAPI(level, message, context, loggerName);
export const logPerformance = (level, message, context, loggerName) => 
  loggerService.logPerformance(level, message, context, loggerName);

// Utility methods
export const setCorrelationId = (id) => loggerService.setCorrelationId(id);
export const getLogger = (name) => loggerService.getLogger(name);
export const getStats = () => loggerService.getStats();
export const close = () => loggerService.close();
