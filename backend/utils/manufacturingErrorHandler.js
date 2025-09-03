// Enhanced Manufacturing Error Handler
// Additional error handling utilities specific to manufacturing operations

import { ManufacturingLogger } from '../middleware/logger.js';
import { performanceCache } from './performanceCache.js';

const logger = new ManufacturingLogger('ManufacturingErrorHandler');

/**
 * Manufacturing-specific error scenarios and handling
 */
export class ManufacturingErrorScenarios {
  /**
   * Handle production line errors
   */
  static handleProductionLineError(lineNumber, error, context = {}) {
    const errorContext = {
      lineNumber,
      errorType: 'production_line',
      timestamp: new Date().toISOString(),
      ...context
    };

    logger.error('Production line error occurred', errorContext);

    // Check if this is a recurring error
    const errorKey = `line_${lineNumber}_error_${error.code || 'unknown'}`;
    const errorCount = performanceCache.get(errorKey) || 0;
    performanceCache.set(errorKey, errorCount + 1);

    // If this is a recurring error, escalate
    if (errorCount > 3) {
      logger.warn('Recurring production line error detected', {
        lineNumber,
        errorCode: error.code,
        errorCount: errorCount + 1,
        context: errorContext
      });
      
      // TODO: Add alerting integration for recurring errors
    }

    return {
      errorId: error.errorId || `LINE_${lineNumber}_${Date.now()}`,
      lineNumber,
      errorType: 'production_line',
      severity: errorCount > 3 ? 'HIGH' : 'MEDIUM',
      recoveryAction: this.getLineRecoveryAction(lineNumber, error),
      context: errorContext
    };
  }

  /**
   * Handle station-specific errors
   */
  static handleStationError(stationId, error, context = {}) {
    const errorContext = {
      stationId,
      errorType: 'station',
      timestamp: new Date().toISOString(),
      ...context
    };

    logger.error('Station error occurred', errorContext);

    // Track station error patterns
    const errorKey = `station_${stationId}_error_${error.code || 'unknown'}`;
    const errorCount = performanceCache.get(errorKey) || 0;
    performanceCache.set(errorKey, errorCount + 1);

    // Determine if station should be taken offline
    const shouldTakeOffline = errorCount > 5 || error.severity === 'CRITICAL';
    
    if (shouldTakeOffline) {
      logger.critical('Station should be taken offline', {
        stationId,
        errorCount: errorCount + 1,
        reason: 'Excessive errors or critical failure'
      });
    }

    return {
      errorId: error.errorId || `STATION_${stationId}_${Date.now()}`,
      stationId,
      errorType: 'station',
      severity: shouldTakeOffline ? 'CRITICAL' : 'HIGH',
      recoveryAction: this.getStationRecoveryAction(stationId, error),
      shouldTakeOffline,
      context: errorContext
    };
  }

  /**
   * Handle barcode processing errors
   */
  static handleBarcodeProcessingError(barcode, error, context = {}) {
    const errorContext = {
      barcode,
      errorType: 'barcode_processing',
      timestamp: new Date().toISOString(),
      ...context
    };

    logger.error('Barcode processing error occurred', errorContext);

    // Track barcode error patterns
    const errorKey = `barcode_error_${error.code || 'unknown'}`;
    const errorCount = performanceCache.get(errorKey) || 0;
    performanceCache.set(errorKey, errorCount + 1);

    // If this is a recurring barcode error, it might indicate a system issue
    if (errorCount > 10) {
      logger.warn('Recurring barcode processing errors detected', {
        errorCode: error.code,
        errorCount: errorCount + 1,
        context: errorContext
      });
    }

    return {
      errorId: error.errorId || `BARCODE_${Date.now()}`,
      barcode,
      errorType: 'barcode_processing',
      severity: errorCount > 10 ? 'HIGH' : 'MEDIUM',
      recoveryAction: this.getBarcodeRecoveryAction(error),
      context: errorContext
    };
  }

  /**
   * Handle manufacturing order errors
   */
  static handleManufacturingOrderError(moId, error, context = {}) {
    const errorContext = {
      moId,
      errorType: 'manufacturing_order',
      timestamp: new Date().toISOString(),
      ...context
    };

    logger.error('Manufacturing order error occurred', errorContext);

    // Track MO error patterns
    const errorKey = `mo_error_${error.code || 'unknown'}`;
    const errorCount = performanceCache.get(errorKey) || 0;
    performanceCache.set(errorKey, errorCount + 1);

    return {
      errorId: error.errorId || `MO_${moId}_${Date.now()}`,
      moId,
      errorType: 'manufacturing_order',
      severity: errorCount > 3 ? 'HIGH' : 'MEDIUM',
      recoveryAction: this.getMORecoveryAction(moId, error),
      context: errorContext
    };
  }

  /**
   * Get recovery actions for production line errors
   */
  static getLineRecoveryAction(lineNumber, error) {
    const actions = {
      'LINE_OVERLOAD': 'Reduce production rate or add backup stations',
      'EQUIPMENT_FAILURE': 'Perform equipment maintenance or switch to backup line',
      'MATERIAL_SHORTAGE': 'Check material inventory and reorder if necessary',
      'QUALITY_ISSUE': 'Review quality control procedures and adjust parameters',
      'default': 'Contact line supervisor for immediate assistance'
    };

    return actions[error.code] || actions.default;
  }

  /**
   * Get recovery actions for station errors
   */
  static getStationRecoveryAction(stationId, error) {
    const actions = {
      'STATION_OFFLINE': 'Check power and network connections',
      'SCANNER_FAILURE': 'Restart scanner or replace if necessary',
      'VALIDATION_ERROR': 'Review station configuration and validation rules',
      'RATE_LIMIT_EXCEEDED': 'Wait for rate limit reset or contact supervisor',
      'default': 'Restart station and contact maintenance if issue persists'
    };

    return actions[error.code] || actions.default;
  }

  /**
   * Get recovery actions for barcode errors
   */
  static getBarcodeRecoveryAction(error) {
    const actions = {
      'INVALID_FORMAT': 'Clean barcode and re-scan, or use manual entry',
      'VALIDATION_FAILED': 'Check barcode quality and manufacturing specifications',
      'DUPLICATE_BARCODE': 'Verify barcode uniqueness and check for duplicates',
      'MO_MISMATCH': 'Confirm manufacturing order and panel specifications',
      'default': 'Use manual override or contact quality control'
    };

    return actions[error.code] || actions.default;
  }

  /**
   * Get recovery actions for manufacturing order errors
   */
  static getMORecoveryAction(moId, error) {
    const actions = {
      'MO_NOT_FOUND': 'Verify manufacturing order number and status',
      'PANEL_TYPE_MISMATCH': 'Check panel type consistency with MO specifications',
      'SEQUENCE_OUT_OF_RANGE': 'Verify panel sequence within MO range',
      'MO_COMPLETED': 'Check if MO is already completed or closed',
      'default': 'Contact production planning for MO verification'
    };

    return actions[error.code] || actions.default;
  }
}

/**
 * Error aggregation and trending analysis
 */
export class ErrorTrendAnalyzer {
  constructor() {
    this.errorHistory = new Map();
    this.trendAnalysis = new Map();
  }

  /**
   * Record an error for trend analysis
   */
  recordError(errorType, errorCode, context = {}) {
    const key = `${errorType}_${errorCode}`;
    const timestamp = new Date().toISOString();
    
    if (!this.errorHistory.has(key)) {
      this.errorHistory.set(key, []);
    }
    
    this.errorHistory.get(key).push({
      timestamp,
      context,
      count: 1
    });

    // Keep only last 100 errors per type for memory management
    if (this.errorHistory.get(key).length > 100) {
      this.errorHistory.get(key).shift();
    }

    this.updateTrendAnalysis(key);
  }

  /**
   * Update trend analysis for an error type
   */
  updateTrendAnalysis(errorKey) {
    const errors = this.errorHistory.get(errorKey);
    if (!errors || errors.length < 2) return;

    const recentErrors = errors.slice(-10); // Last 10 errors
    const olderErrors = errors.slice(-20, -10); // Previous 10 errors

    const recentCount = recentErrors.reduce((sum, e) => sum + e.count, 0);
    const olderCount = olderErrors.reduce((sum, e) => sum + e.count, 0);

    const trend = recentCount > olderCount ? 'INCREASING' : 
                  recentCount < olderCount ? 'DECREASING' : 'STABLE';

    this.trendAnalysis.set(errorKey, {
      trend,
      recentCount,
      olderCount,
      changeRate: ((recentCount - olderCount) / Math.max(olderCount, 1)) * 100,
      lastUpdated: new Date().toISOString()
    });
  }

  /**
   * Get trend analysis for all error types
   */
  getTrendAnalysis() {
    const analysis = {};
    
    for (const [errorKey, trend] of this.trendAnalysis) {
      analysis[errorKey] = trend;
    }

    return analysis;
  }

  /**
   * Get critical error trends that need attention
   */
  getCriticalTrends() {
    const critical = [];
    
    for (const [errorKey, trend] of this.trendAnalysis) {
      if (trend.trend === 'INCREASING' && trend.changeRate > 50) {
        critical.push({
          errorKey,
          trend: trend.trend,
          changeRate: trend.changeRate,
          recentCount: trend.recentCount
        });
      }
    }

    return critical.sort((a, b) => b.changeRate - a.changeRate);
  }

  /**
   * Get error frequency by time period
   */
  getErrorFrequency(period = 'hour') {
    const now = new Date();
    const frequency = new Map();

    for (const [errorKey, errors] of this.errorHistory) {
      const periodErrors = errors.filter(error => {
        const errorTime = new Date(error.timestamp);
        const diff = now - errorTime;
        
        switch (period) {
          case 'minute':
            return diff < 60000; // 1 minute
          case 'hour':
            return diff < 3600000; // 1 hour
          case 'day':
            return diff < 86400000; // 1 day
          default:
            return diff < 3600000; // Default to hour
        }
      });

      if (periodErrors.length > 0) {
        frequency.set(errorKey, periodErrors.length);
      }
    }

    return Object.fromEntries(frequency);
  }
}

/**
 * Error recovery automation
 */
export class ErrorRecoveryAutomation {
  constructor() {
    this.recoveryStrategies = new Map();
    this.automatedRecoveryEnabled = true;
  }

  /**
   * Register a recovery strategy for an error type
   */
  registerRecoveryStrategy(errorType, errorCode, strategy) {
    const key = `${errorType}_${errorCode}`;
    this.recoveryStrategies.set(key, strategy);
  }

  /**
   * Attempt automated recovery for an error
   */
  async attemptRecovery(errorType, errorCode, context = {}) {
    const key = `${errorType}_${errorCode}`;
    const strategy = this.recoveryStrategies.get(key);

    if (!strategy || !this.automatedRecoveryEnabled) {
      return {
        attempted: false,
        reason: strategy ? 'Automated recovery disabled' : 'No recovery strategy found'
      };
    }

    try {
      logger.info('Attempting automated error recovery', {
        errorType,
        errorCode,
        strategy: strategy.name || 'unknown'
      });

      const result = await strategy.execute(context);
      
      logger.info('Automated error recovery completed', {
        errorType,
        errorCode,
        success: result.success,
        details: result.details
      });

      return {
        attempted: true,
        success: result.success,
        details: result.details
      };
    } catch (recoveryError) {
      logger.error('Automated error recovery failed', {
        errorType,
        errorCode,
        recoveryError: recoveryError.message,
        context
      });

      return {
        attempted: true,
        success: false,
        error: recoveryError.message
      };
    }
  }

  /**
   * Enable/disable automated recovery
   */
  setAutomatedRecoveryEnabled(enabled) {
    this.automatedRecoveryEnabled = enabled;
    logger.info(`Automated error recovery ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get all registered recovery strategies
   */
  getRecoveryStrategies() {
    const strategies = {};
    
    for (const [key, strategy] of this.recoveryStrategies) {
      strategies[key] = {
        name: strategy.name || 'Unknown',
        description: strategy.description || 'No description available',
        enabled: this.automatedRecoveryEnabled
      };
    }

    return strategies;
  }
}

/**
 * Manufacturing error metrics and reporting
 */
export class ManufacturingErrorMetrics {
  constructor() {
    this.metrics = {
      totalErrors: 0,
      errorsByType: new Map(),
      errorsBySeverity: new Map(),
      errorsByLine: new Map(),
      errorsByStation: new Map(),
      recoverySuccessRate: 0,
      totalRecoveryAttempts: 0,
      successfulRecoveries: 0
    };
    
    this.startTime = Date.now();
  }

  /**
   * Record an error metric
   */
  recordError(error) {
    this.metrics.totalErrors++;

    // Record by type
    const errorType = error.constructor.name;
    this.metrics.errorsByType.set(errorType, (this.metrics.errorsByType.get(errorType) || 0) + 1);

    // Record by severity
    const severity = error.severity || 'UNKNOWN';
    this.metrics.errorsBySeverity.set(severity, (this.metrics.errorsBySeverity.get(severity) || 0) + 1);

    // Record by line if available
    if (error.context?.lineNumber) {
      const line = `LINE_${error.context.lineNumber}`;
      this.metrics.errorsByLine.set(line, (this.metrics.errorsByLine.get(line) || 0) + 1);
    }

    // Record by station if available
    if (error.context?.stationId) {
      this.metrics.errorsByStation.set(error.context.stationId, (this.metrics.errorsByStation.get(error.context.stationId) || 0) + 1);
    }
  }

  /**
   * Record recovery attempt
   */
  recordRecoveryAttempt(success) {
    this.metrics.totalRecoveryAttempts++;
    if (success) {
      this.metrics.successfulRecoveries++;
    }
    
    this.metrics.recoverySuccessRate = this.metrics.successfulRecoveries / this.metrics.totalRecoveryAttempts;
  }

  /**
   * Get comprehensive error metrics
   */
  getMetrics() {
    const uptime = Date.now() - this.startTime;
    const uptimeHours = uptime / (1000 * 60 * 60);

    return {
      summary: {
        totalErrors: this.metrics.totalErrors,
        uptimeHours: Math.round(uptimeHours * 100) / 100,
        errorsPerHour: Math.round((this.metrics.totalErrors / uptimeHours) * 100) / 100,
        recoverySuccessRate: Math.round(this.metrics.recoverySuccessRate * 10000) / 100,
        totalRecoveryAttempts: this.metrics.totalRecoveryAttempts,
        successfulRecoveries: this.metrics.successfulRecoveries
      },
      byType: Object.fromEntries(this.metrics.errorsByType),
      bySeverity: Object.fromEntries(this.metrics.errorsBySeverity),
      byLine: Object.fromEntries(this.metrics.errorsByLine),
      byStation: Object.fromEntries(this.metrics.errorsByStation)
    };
  }

  /**
   * Reset metrics (useful for testing or daily resets)
   */
  resetMetrics() {
    this.metrics = {
      totalErrors: 0,
      errorsByType: new Map(),
      errorsBySeverity: new Map(),
      errorsByLine: new Map(),
      errorsByStation: new Map(),
      recoverySuccessRate: 0,
      totalRecoveryAttempts: 0,
      successfulRecoveries: 0
    };
    this.startTime = Date.now();
    
    logger.info('Manufacturing error metrics reset');
  }
}

// Export all classes and utilities
export default {
  ManufacturingErrorScenarios,
  ErrorTrendAnalyzer,
  ErrorRecoveryAutomation,
  ManufacturingErrorMetrics
};
