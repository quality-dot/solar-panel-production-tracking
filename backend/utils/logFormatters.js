// Log Formatting Utilities for Solar Panel Production Tracking System
// Provides consistent formatting for different types of logs

import { format } from 'winston';

/**
 * Custom log formatters for Winston
 */
export const logFormatters = {
  /**
   * Manufacturing context formatter
   * Adds manufacturing-specific metadata to logs
   */
  manufacturingContext: format((info) => {
    if (info.manufacturingContext) {
      // Basic context
      info.stationId = info.manufacturingContext.stationId;
      info.lineId = info.manufacturingContext.lineId;
      info.operationType = info.manufacturingContext.operationType;
      info.panelId = info.manufacturingContext.panelId;
      info.batchId = info.manufacturingContext.batchId;
      info.operatorId = info.manufacturingContext.operatorId;
      
      // Enhanced context
      info.productionLine = info.manufacturingContext.productionLine;
      info.shift = info.manufacturingContext.shift;
      info.qualityStatus = info.manufacturingContext.qualityStatus;
      
      // Performance context
      info.operationDuration = info.manufacturingContext.operationDuration;
      info.throughput = info.manufacturingContext.throughput;
      info.efficiency = info.manufacturingContext.efficiency;
      
      // Equipment context
      info.equipmentStatus = info.manufacturingContext.equipmentStatus;
      info.maintenanceDue = info.manufacturingContext.maintenanceDue;
      info.errorCount = info.manufacturingContext.errorCount;
      
      // Business context
      if (info.manufacturingContext.orderNumber || info.manufacturingContext.priority || info.manufacturingContext.dueDate || info.manufacturingContext.customer) {
        info.business = {
          orderNumber: info.manufacturingContext.orderNumber,
          priority: info.manufacturingContext.priority,
          dueDate: info.manufacturingContext.dueDate,
          customer: info.manufacturingContext.customer
        };
      }
      
      // Environmental context
      if (info.manufacturingContext.temperature || info.manufacturingContext.humidity || info.manufacturingContext.pressure || info.manufacturingContext.vibration) {
        info.environmental = {
          temperature: info.manufacturingContext.temperature,
          humidity: info.manufacturingContext.humidity,
          pressure: info.manufacturingContext.pressure,
          vibration: info.manufacturingContext.vibration
        };
      }
    }
    return info;
  }),

  /**
   * Security context formatter
   * Adds security-specific metadata to logs
   */
  securityContext: format((info) => {
    if (info.securityContext) {
      info.userId = info.securityContext.userId;
      info.action = info.securityContext.action;
      info.resource = info.securityContext.resource;
      info.riskLevel = info.securityContext.riskLevel;
      info.threatType = info.securityContext.threatType;
    }
    return info;
  }),

  /**
   * Performance context formatter
   * Adds performance-specific metadata to logs
   */
  performanceContext: format((info) => {
    if (info.performanceContext) {
      info.responseTime = info.performanceContext.responseTime;
      info.memoryUsage = info.performanceContext.memoryUsage;
      info.cpuUsage = info.performanceContext.cpuUsage;
      info.databaseQueries = info.performanceContext.databaseQueries;
      info.cacheHits = info.performanceContext.cacheHits;
      info.cacheMisses = info.performanceContext.cacheMisses;
    }
    return info;
  }),

  /**
   * Database context formatter
   * Adds database-specific metadata to logs
   */
  databaseContext: format((info) => {
    if (info.databaseContext) {
      info.queryType = info.databaseContext.queryType;
      info.tableName = info.databaseContext.tableName;
      info.queryDuration = info.databaseContext.queryDuration;
      info.rowsAffected = info.databaseContext.rowsAffected;
      info.connectionPool = info.databaseContext.connectionPool;
    }
    return info;
  }),

  /**
   * API context formatter
   * Adds API-specific metadata to logs
   */
  apiContext: format((info) => {
    if (info.apiContext) {
      info.endpoint = info.apiContext.endpoint;
      info.httpMethod = info.apiContext.httpMethod;
      info.statusCode = info.apiContext.statusCode;
      info.userAgent = info.apiContext.userAgent;
      info.ipAddress = info.apiContext.ipAddress;
      info.requestId = info.apiContext.requestId;
    }
    return info;
  }),

  /**
   * Error context formatter
   * Adds error-specific metadata to logs
   */
  errorContext: format((info) => {
    if (info.error) {
      info.errorName = info.error.name;
      info.errorMessage = info.error.message;
      info.errorStack = info.error.stack;
      info.errorCode = info.error.code;
    }
    return info;
  }),

  /**
   * Correlation ID formatter
   * Ensures correlation ID is always present
   */
  correlationId: format((info) => {
    if (!info.correlationId) {
      info.correlationId = 'unknown';
    }
    return info;
  }),

  /**
   * Timestamp formatter
   * Ensures consistent timestamp format
   */
  timestamp: format((info) => {
    if (!info.timestamp) {
      info.timestamp = new Date().toISOString();
    }
    return info;
  }),

  /**
   * Environment formatter
   * Adds environment information
   */
  environment: format((info) => {
    info.environment = process.env.NODE_ENV || 'development';
    info.service = 'solar-panel-tracking';
    info.version = process.env.npm_package_version || '1.0.0';
    return info;
  }),

  /**
   * Sanitization formatter
   * Removes sensitive information from logs
   */
  sanitization: format((info) => {
    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'authorization',
      'apiKey', 'privateKey', 'sessionId', 'cookie'
    ];

    // Sanitize top-level fields
    sensitiveFields.forEach(field => {
      if (info[field]) {
        info[field] = '[REDACTED]';
      }
    });

    // Sanitize nested objects
    if (info.body && typeof info.body === 'object') {
      sensitiveFields.forEach(field => {
        if (info.body[field]) {
          info.body[field] = '[REDACTED]';
        }
      });
    }

    if (info.headers && typeof info.headers === 'object') {
      sensitiveFields.forEach(field => {
        if (info.headers[field]) {
          info.headers[field] = '[REDACTED]';
        }
      });
    }

    return info;
  }),

  /**
   * Secure log formatter with field encryption
   * Encrypts sensitive fields for secure logging
   */
  secureLogFormatter: format((info) => {
    // Identify sensitive fields that should be encrypted
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'privateKey'];
    
    // Note: Encryption will be handled by the encryption service
    // This formatter marks fields for encryption
    sensitiveFields.forEach(field => {
      if (info[field] && info[field] !== '[REDACTED]') {
        info[`${field}_encrypted`] = true;
        info[`${field}_original`] = info[field];
        info[field] = '[ENCRYPTED]';
      }
    });
    
    // Add security metadata
    if (Object.keys(info).some(key => key.includes('_encrypted'))) {
      info.security = {
        encrypted: true,
        encryptionTimestamp: new Date().toISOString(),
        encryptionLevel: 'field-level'
      };
    }
    
    return info;
  }),

  /**
   * Production Line Formatter
   * Formats production line operations with enhanced metrics
   */
  productionLineFormatter: format((info) => {
    if (info.manufacturing?.operationType === 'production') {
      info.formattedMessage = `[LINE-${info.manufacturing.lineId}] ${info.manufacturing.operationType} - Panel ${info.manufacturing.panelId} - ${info.manufacturing.qualityStatus}`;
      info.productionMetrics = {
        lineEfficiency: info.manufacturing.efficiency,
        currentThroughput: info.manufacturing.throughput,
        qualityRate: info.manufacturing.qualityStatus === 'pass' ? 1 : 0
      };
    }
    return info;
  }),

  /**
   * Quality Control Formatter
   * Formats quality control operations with detailed metrics
   */
  qualityControlFormatter: format((info) => {
    if (info.manufacturing?.operationType === 'quality_check') {
      info.formattedMessage = `[QC-${info.manufacturing.stationId}] ${info.manufacturing.qualityStatus} - Panel ${info.manufacturing.panelId}`;
      info.qualityMetrics = {
        passRate: info.manufacturing.qualityStatus === 'pass' ? 1 : 0,
        defectTypes: info.manufacturing.defectTypes || [],
        inspectionTime: info.manufacturing.operationDuration
      };
    }
    return info;
  }),

  /**
   * Maintenance Formatter
   * Formats maintenance operations with equipment metrics
   */
  maintenanceFormatter: format((info) => {
    if (info.manufacturing?.operationType === 'maintenance') {
      info.formattedMessage = `[MAINT-${info.manufacturing.stationId}] ${info.manufacturing.maintenanceType || 'general'} - ${info.manufacturing.status || 'in_progress'}`;
      info.maintenanceMetrics = {
        downtime: info.manufacturing.downtime || 0,
        repairTime: info.manufacturing.repairTime || 0,
        partsUsed: info.manufacturing.partsUsed || []
      };
    }
    return info;
  }),

  /**
   * Equipment Health Formatter
   * Formats equipment health and status information
   */
  equipmentHealthFormatter: format((info) => {
    if (info.manufacturing?.equipmentStatus) {
      info.formattedMessage = `[EQUIP-${info.manufacturing.stationId}] Status: ${info.manufacturing.equipmentStatus}`;
      info.equipmentMetrics = {
        health: info.manufacturing.equipmentStatus,
        maintenanceDue: info.manufacturing.maintenanceDue,
        errorCount: info.manufacturing.errorCount || 0,
        uptime: info.manufacturing.uptime || 0
      };
    }
    return info;
  })
};

/**
 * Predefined format combinations for different use cases
 */
export const formatCombinations = {
  /**
   * Console format for development
   */
  console: format.combine(
    format.colorize(),
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.printf(({ timestamp, level, message, correlationId, ...meta }) => {
      const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
      const correlationStr = correlationId ? `[${correlationId}]` : '';
      return `${timestamp} ${correlationStr} ${level}: ${message} ${metaStr}`;
    })
  ),

  /**
   * File format for production
   */
  file: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.json()
  ),

  /**
   * Security log format
   */
  security: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.json()
  ),

  /**
   * Manufacturing log format
   */
  manufacturing: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.json()
  ),

  /**
   * Performance log format
   */
  performance: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.json()
  ),

  /**
   * Database log format
   */
  database: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.json()
  ),

  /**
   * API log format
   */
  api: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.json()
  ),

  /**
   * Error log format
   */
  error: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.json()
  ),


};

/**
 * Utility functions for log formatting
 */
export const logUtils = {
  /**
   * Create manufacturing context object
   */
  createManufacturingContext: (stationId, lineId, operationType, panelId, batchId, operatorId, options = {}) => ({
    stationId,
    lineId,
    operationType,
    panelId,
    batchId,
    operatorId,
    timestamp: new Date().toISOString(),
    
    // Enhanced context
    productionLine: options.productionLine,
    shift: options.shift,
    qualityStatus: options.qualityStatus,
    
    // Performance context
    operationDuration: options.operationDuration,
    throughput: options.throughput,
    efficiency: options.efficiency,
    
    // Equipment context
    equipmentStatus: options.equipmentStatus,
    maintenanceDue: options.maintenanceDue,
    errorCount: options.errorCount,
    uptime: options.uptime,
    
    // Business context
    orderNumber: options.orderNumber,
    priority: options.priority,
    dueDate: options.dueDate,
    customer: options.customer,
    
    // Environmental context
    temperature: options.temperature,
    humidity: options.humidity,
    pressure: options.pressure,
    vibration: options.vibration,
    
    // Operation-specific context
    maintenanceType: options.maintenanceType,
    status: options.status,
    defectTypes: options.defectTypes,
    repairTime: options.repairTime,
    downtime: options.downtime,
    partsUsed: options.partsUsed
  }),

  /**
   * Create security context object
   */
  createSecurityContext: (userId, action, resource, riskLevel, threatType) => ({
    userId,
    action,
    resource,
    riskLevel,
    threatType,
    timestamp: new Date().toISOString()
  }),

  /**
   * Create performance context object
   */
  createPerformanceContext: (responseTime, memoryUsage, cpuUsage, databaseQueries, cacheHits, cacheMisses) => ({
    responseTime,
    memoryUsage,
    cpuUsage,
    databaseQueries,
    cacheHits,
    cacheMisses,
    timestamp: new Date().toISOString()
  }),

  /**
   * Create database context object
   */
  createDatabaseContext: (queryType, tableName, queryDuration, rowsAffected, connectionPool) => ({
    queryType,
    tableName,
    queryDuration,
    rowsAffected,
    connectionPool,
    timestamp: new Date().toISOString()
  }),

  /**
   * Create API context object
   */
  createAPIContext: (endpoint, httpMethod, statusCode, userAgent, ipAddress, requestId) => ({
    endpoint,
    httpMethod,
    statusCode,
    userAgent,
    ipAddress,
    requestId,
    timestamp: new Date().toISOString()
  }),

  /**
   * Create production line context
   */
  createProductionLineContext: (lineId, panelId, batchId, operatorId, options = {}) => ({
    stationId: 'LINE-' + lineId,
    lineId,
    operationType: 'production',
    panelId,
    batchId,
    operatorId,
    timestamp: new Date().toISOString(),
    productionLine: options.productionLine || `LINE-${lineId}`,
    shift: options.shift,
    qualityStatus: options.qualityStatus || 'pending',
    operationDuration: options.operationDuration,
    throughput: options.throughput,
    efficiency: options.efficiency
  }),

  /**
   * Create quality control context
   */
  createQualityControlContext: (stationId, panelId, batchId, operatorId, options = {}) => ({
    stationId,
    lineId: options.lineId,
    operationType: 'quality_check',
    panelId,
    batchId,
    operatorId,
    timestamp: new Date().toISOString(),
    qualityStatus: options.qualityStatus || 'pending',
    operationDuration: options.operationDuration,
    defectTypes: options.defectTypes || [],
    inspectionTime: options.inspectionTime
  }),

  /**
   * Create maintenance context
   */
  createMaintenanceContext: (stationId, operatorId, options = {}) => ({
    stationId,
    lineId: options.lineId,
    operationType: 'maintenance',
    panelId: null,
    batchId: null,
    operatorId,
    timestamp: new Date().toISOString(),
    maintenanceType: options.maintenanceType || 'general',
    status: options.status || 'in_progress',
    downtime: options.downtime || 0,
    repairTime: options.repairTime || 0,
    partsUsed: options.partsUsed || []
  }),

  /**
   * Create equipment health context
   */
  createEquipmentHealthContext: (stationId, options = {}) => ({
    stationId,
    lineId: options.lineId,
    operationType: 'equipment_health',
    panelId: null,
    batchId: null,
    operatorId: options.operatorId,
    timestamp: new Date().toISOString(),
    equipmentStatus: options.equipmentStatus || 'operational',
    maintenanceDue: options.maintenanceDue,
    errorCount: options.errorCount || 0,
    uptime: options.uptime || 0
  }),

  /**
   * Format log level with emojis for better readability
   */
  formatLogLevel: (level) => {
    const levelEmojis = {
      error: '❌',
      warn: '⚠️',
      info: 'ℹ️',
      debug: '🐛',
      verbose: '📝',
      silly: '🤪'
    };
    return `${levelEmojis[level] || '📋'} ${level.toUpperCase()}`;
  },

  /**
   * Format duration in human-readable format
   */
  formatDuration: (ms) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}m`;
  },

  /**
   * Format file size in human-readable format
   */
  formatFileSize: (bytes) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`;
  }
};

export default {
  logFormatters,
  formatCombinations,
  logUtils
};
