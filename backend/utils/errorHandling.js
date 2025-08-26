// Comprehensive Error Handling and Recovery System
// Production-grade error handling for manufacturing operations

import { ManufacturingLogger } from '../middleware/logger.js';
import { performanceCache } from './performanceCache.js';

const logger = new ManufacturingLogger('ErrorHandling');

/**
 * Manufacturing-specific error types
 */
export class ManufacturingError extends Error {
  constructor(message, code, context = {}, severity = 'ERROR', recoverable = true) {
    super(message);
    this.name = 'ManufacturingError';
    this.code = code;
    this.context = context;
    this.severity = severity; // INFO, WARN, ERROR, CRITICAL
    this.recoverable = recoverable;
    this.timestamp = new Date().toISOString();
    this.errorId = this.generateErrorId();
    this.stackTrace = this.stack;
  }

  generateErrorId() {
    return `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`.toUpperCase();
  }

  toJSON() {
    return {
      errorId: this.errorId,
      name: this.name,
      code: this.code,
      message: this.message,
      severity: this.severity,
      recoverable: this.recoverable,
      context: this.context,
      timestamp: this.timestamp,
      stackTrace: this.stackTrace
    };
  }
}

/**
 * Circuit Breaker Pattern Implementation
 */
export class CircuitBreaker {
  constructor(options = {}) {
    this.name = options.name || 'CircuitBreaker';
    this.failureThreshold = options.failureThreshold || 5;
    this.recoveryTimeout = options.recoveryTimeout || 60000; // 1 minute
    this.monitoringPeriod = options.monitoringPeriod || 30000; // 30 seconds
    this.expectedErrors = options.expectedErrors || [];
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
    this.totalRequests = 0;
    
    this.stats = {
      totalCalls: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      stateChanges: [],
      recentFailures: []
    };
  }

  async execute(operation, fallback = null) {
    this.stats.totalCalls++;
    this.totalRequests++;

    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
        this.logStateChange('HALF_OPEN', 'Attempting recovery');
      } else {
        const error = new ManufacturingError(
          `Circuit breaker is OPEN for ${this.name}`,
          'CIRCUIT_BREAKER_OPEN',
          { 
            circuitBreakerName: this.name,
            failureCount: this.failureCount,
            lastFailureTime: this.lastFailureTime 
          },
          'WARN',
          true
        );

        if (fallback) {
          logger.warn('Circuit breaker OPEN, executing fallback', { 
            circuitBreaker: this.name,
            errorId: error.errorId 
          });
          return await fallback(error);
        }

        throw error;
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      
      if (fallback && (this.state === 'OPEN' || this.isExpectedError(error))) {
        logger.warn('Operation failed, executing fallback', { 
          circuitBreaker: this.name,
          error: error.message,
          state: this.state 
        });
        return await fallback(error);
      }
      
      throw error;
    }
  }

  onSuccess() {
    this.stats.totalSuccesses++;
    this.successCount++;
    this.failureCount = 0;
    
    if (this.state === 'HALF_OPEN') {
      if (this.successCount >= 3) { // Require 3 successes to fully recover
        this.state = 'CLOSED';
        this.successCount = 0;
        this.logStateChange('CLOSED', 'Recovery successful');
      }
    }
  }

  onFailure(error) {
    this.stats.totalFailures++;
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.successCount = 0;

    // Track recent failures
    this.stats.recentFailures.push({
      timestamp: this.lastFailureTime,
      error: error.message,
      code: error.code || 'UNKNOWN'
    });

    // Keep only last 20 failures
    if (this.stats.recentFailures.length > 20) {
      this.stats.recentFailures = this.stats.recentFailures.slice(-20);
    }

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.logStateChange('OPEN', 'Recovery attempt failed');
    } else if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.logStateChange('OPEN', 'Failure threshold exceeded');
    }
  }

  shouldAttemptReset() {
    return Date.now() - this.lastFailureTime >= this.recoveryTimeout;
  }

  isExpectedError(error) {
    return this.expectedErrors.some(expectedError => 
      error.code === expectedError || 
      error.message.includes(expectedError) ||
      error.name === expectedError
    );
  }

  logStateChange(newState, reason) {
    const stateChange = {
      timestamp: new Date().toISOString(),
      from: this.state,
      to: newState,
      reason,
      failureCount: this.failureCount
    };

    this.stats.stateChanges.push(stateChange);
    
    // Keep only last 50 state changes
    if (this.stats.stateChanges.length > 50) {
      this.stats.stateChanges = this.stats.stateChanges.slice(-50);
    }

    logger.warn('Circuit breaker state change', {
      circuitBreaker: this.name,
      stateChange
    });
  }

  getStats() {
    const failureRate = this.stats.totalCalls > 0 ? 
      (this.stats.totalFailures / this.stats.totalCalls * 100).toFixed(2) + '%' : '0%';

    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      failureThreshold: this.failureThreshold,
      lastFailureTime: this.lastFailureTime,
      stats: {
        ...this.stats,
        failureRate,
        uptime: this.state === 'CLOSED' ? 'HEALTHY' : 'DEGRADED'
      }
    };
  }

  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.logStateChange('CLOSED', 'Manual reset');
  }
}

/**
 * Retry Mechanism with Exponential Backoff
 */
export class RetryMechanism {
  constructor(options = {}) {
    this.maxAttempts = options.maxAttempts || 3;
    this.baseDelay = options.baseDelay || 1000; // 1 second
    this.maxDelay = options.maxDelay || 30000; // 30 seconds
    this.backoffMultiplier = options.backoffMultiplier || 2;
    this.jitter = options.jitter || true;
    this.retryableErrors = options.retryableErrors || [
      'ECONNRESET',
      'ENOTFOUND',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'DATABASE_ERROR',
      'NETWORK_ERROR',
      'TEMPORARY_FAILURE'
    ];
  }

  async execute(operation, context = {}) {
    let lastError;
    const attemptHistory = [];

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      const attemptStart = Date.now();
      
      try {
        const result = await operation(attempt);
        
        // Log successful retry if it wasn't the first attempt
        if (attempt > 1) {
          logger.info('Operation succeeded after retry', {
            attempt,
            totalAttempts: attempt,
            context,
            attemptHistory
          });
        }
        
        return result;
      } catch (error) {
        const attemptTime = Date.now() - attemptStart;
        lastError = error;
        
        attemptHistory.push({
          attempt,
          error: error.message,
          code: error.code || 'UNKNOWN',
          duration: attemptTime,
          timestamp: new Date().toISOString()
        });

        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          logger.warn('Non-retryable error encountered', {
            error: error.message,
            code: error.code,
            attempt,
            context
          });
          break;
        }

        // Don't delay after the last attempt
        if (attempt < this.maxAttempts) {
          const delay = this.calculateDelay(attempt);
          
          logger.warn('Operation failed, retrying', {
            error: error.message,
            code: error.code,
            attempt,
            maxAttempts: this.maxAttempts,
            nextRetryIn: `${delay}ms`,
            context
          });

          await this.delay(delay);
        }
      }
    }

    // All retries exhausted
    const enhancedError = new ManufacturingError(
      `Operation failed after ${this.maxAttempts} attempts: ${lastError.message}`,
      'RETRY_EXHAUSTED',
      {
        originalError: lastError.message,
        originalCode: lastError.code,
        attemptHistory,
        maxAttempts: this.maxAttempts,
        context
      },
      'ERROR',
      false
    );

    logger.error('All retry attempts exhausted', {
      error: enhancedError.toJSON(),
      attemptHistory
    });

    throw enhancedError;
  }

  isRetryableError(error) {
    return this.retryableErrors.some(retryableError => 
      error.code === retryableError ||
      error.message.includes(retryableError) ||
      (error.errno && error.errno === retryableError)
    );
  }

  calculateDelay(attempt) {
    let delay = this.baseDelay * Math.pow(this.backoffMultiplier, attempt - 1);
    
    // Apply maximum delay limit
    delay = Math.min(delay, this.maxDelay);
    
    // Add jitter to prevent thundering herd
    if (this.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return Math.floor(delay);
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Error Recovery and Fallback System
 */
export class ErrorRecoverySystem {
  constructor() {
    this.circuitBreakers = new Map();
    this.retryMechanism = new RetryMechanism();
    this.fallbackStrategies = new Map();
    this.errorAggregator = new ErrorAggregator();
    
    // Initialize circuit breakers for critical services
    this.initializeCircuitBreakers();
  }

  initializeCircuitBreakers() {
    // Database circuit breaker
    this.circuitBreakers.set('database', new CircuitBreaker({
      name: 'database',
      failureThreshold: 5,
      recoveryTimeout: 60000,
      expectedErrors: ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT']
    }));

    // Barcode processing circuit breaker
    this.circuitBreakers.set('barcodeProcessing', new CircuitBreaker({
      name: 'barcodeProcessing',
      failureThreshold: 10,
      recoveryTimeout: 30000,
      expectedErrors: ['INVALID_BARCODE', 'PARSING_ERROR']
    }));

    // Cache circuit breaker
    this.circuitBreakers.set('cache', new CircuitBreaker({
      name: 'cache',
      failureThreshold: 8,
      recoveryTimeout: 45000,
      expectedErrors: ['CACHE_ERROR', 'MEMORY_ERROR']
    }));
  }

  async executeWithRecovery(operation, options = {}) {
    const {
      serviceName = 'unknown',
      fallbackStrategy = null,
      retryEnabled = true,
      circuitBreakerEnabled = true,
      context = {}
    } = options;

    try {
      if (circuitBreakerEnabled && this.circuitBreakers.has(serviceName)) {
        const circuitBreaker = this.circuitBreakers.get(serviceName);
        const fallback = fallbackStrategy ? 
          (error) => this.executeFallback(fallbackStrategy, error, context) : null;

        if (retryEnabled) {
          return await circuitBreaker.execute(
            () => this.retryMechanism.execute(operation, context),
            fallback
          );
        } else {
          return await circuitBreaker.execute(operation, fallback);
        }
      } else if (retryEnabled) {
        return await this.retryMechanism.execute(operation, context);
      } else {
        return await operation();
      }
    } catch (error) {
      // Aggregate error for monitoring
      this.errorAggregator.recordError(error, serviceName, context);
      
      // Try fallback if available and not already tried
      if (fallbackStrategy && !error.fallbackAttempted) {
        try {
          error.fallbackAttempted = true;
          const fallbackResult = await this.executeFallback(fallbackStrategy, error, context);
          
          logger.warn('Fallback strategy successful', {
            serviceName,
            originalError: error.message,
            fallbackStrategy,
            context
          });
          
          return fallbackResult;
        } catch (fallbackError) {
          logger.error('Fallback strategy failed', {
            serviceName,
            originalError: error.message,
            fallbackError: fallbackError.message,
            context
          });
        }
      }
      
      throw error;
    }
  }

  async executeFallback(strategy, originalError, context) {
    if (typeof strategy === 'function') {
      return await strategy(originalError, context);
    }

    if (typeof strategy === 'string' && this.fallbackStrategies.has(strategy)) {
      const fallbackFunction = this.fallbackStrategies.get(strategy);
      return await fallbackFunction(originalError, context);
    }

    throw new ManufacturingError(
      'No valid fallback strategy available',
      'FALLBACK_UNAVAILABLE',
      { strategy, originalError: originalError.message, context }
    );
  }

  registerFallbackStrategy(name, strategy) {
    this.fallbackStrategies.set(name, strategy);
    logger.info('Fallback strategy registered', { name });
  }

  getCircuitBreakerStats() {
    const stats = {};
    for (const [name, circuitBreaker] of this.circuitBreakers.entries()) {
      stats[name] = circuitBreaker.getStats();
    }
    return stats;
  }

  getErrorStats() {
    return this.errorAggregator.getStats();
  }

  resetCircuitBreaker(serviceName) {
    if (this.circuitBreakers.has(serviceName)) {
      this.circuitBreakers.get(serviceName).reset();
      logger.info('Circuit breaker reset', { serviceName });
    }
  }

  resetAllCircuitBreakers() {
    for (const [name, circuitBreaker] of this.circuitBreakers.entries()) {
      circuitBreaker.reset();
    }
    logger.info('All circuit breakers reset');
  }
}

/**
 * Error Aggregation and Monitoring
 */
export class ErrorAggregator {
  constructor() {
    this.errors = new Map(); // serviceName -> error array
    this.errorCounts = new Map(); // errorCode -> count
    this.recentErrors = [];
    this.maxRecentErrors = 1000;
    this.alertThresholds = {
      errorRate: 10, // errors per minute
      criticalErrors: 5, // critical errors per hour
      circuitBreakerTrips: 3 // circuit breaker trips per hour
    };
  }

  recordError(error, serviceName = 'unknown', context = {}) {
    const errorRecord = {
      timestamp: new Date().toISOString(),
      serviceName,
      error: error instanceof ManufacturingError ? error.toJSON() : {
        name: error.name,
        message: error.message,
        code: error.code || 'UNKNOWN',
        stack: error.stack
      },
      context
    };

    // Add to service-specific errors
    if (!this.errors.has(serviceName)) {
      this.errors.set(serviceName, []);
    }
    this.errors.get(serviceName).push(errorRecord);

    // Add to recent errors
    this.recentErrors.push(errorRecord);
    if (this.recentErrors.length > this.maxRecentErrors) {
      this.recentErrors = this.recentErrors.slice(-this.maxRecentErrors);
    }

    // Count error types
    const errorCode = errorRecord.error.code || 'UNKNOWN';
    this.errorCounts.set(errorCode, (this.errorCounts.get(errorCode) || 0) + 1);

    // Check for alert conditions
    this.checkAlertConditions(errorRecord);
  }

  checkAlertConditions(errorRecord) {
    // Check error rate (errors per minute)
    const oneMinuteAgo = Date.now() - 60000;
    const recentErrorCount = this.recentErrors.filter(
      e => new Date(e.timestamp).getTime() > oneMinuteAgo
    ).length;

    if (recentErrorCount >= this.alertThresholds.errorRate) {
      this.triggerAlert('HIGH_ERROR_RATE', {
        errorRate: recentErrorCount,
        threshold: this.alertThresholds.errorRate,
        timeWindow: '1 minute'
      });
    }

    // Check for critical errors
    if (errorRecord.error.severity === 'CRITICAL') {
      const oneHourAgo = Date.now() - 3600000;
      const criticalErrors = this.recentErrors.filter(
        e => new Date(e.timestamp).getTime() > oneHourAgo && 
            e.error.severity === 'CRITICAL'
      ).length;

      if (criticalErrors >= this.alertThresholds.criticalErrors) {
        this.triggerAlert('CRITICAL_ERROR_THRESHOLD', {
          criticalErrors,
          threshold: this.alertThresholds.criticalErrors,
          timeWindow: '1 hour'
        });
      }
    }
  }

  triggerAlert(alertType, data) {
    const alert = {
      alertType,
      timestamp: new Date().toISOString(),
      data,
      alertId: `ALERT_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    };

    logger.error('Error aggregator alert triggered', alert);

    // TODO: Integrate with external alerting systems
    // - Send email notifications
    // - Post to Slack/Teams
    // - Trigger PagerDuty incident
    // - Send to monitoring service
  }

  getStats() {
    const oneHourAgo = Date.now() - 3600000;
    const oneDayAgo = Date.now() - 86400000;

    const recentHourErrors = this.recentErrors.filter(
      e => new Date(e.timestamp).getTime() > oneHourAgo
    );

    const recentDayErrors = this.recentErrors.filter(
      e => new Date(e.timestamp).getTime() > oneDayAgo
    );

    const errorsByService = {};
    for (const [serviceName, errors] of this.errors.entries()) {
      errorsByService[serviceName] = {
        total: errors.length,
        lastHour: errors.filter(e => new Date(e.timestamp).getTime() > oneHourAgo).length,
        lastDay: errors.filter(e => new Date(e.timestamp).getTime() > oneDayAgo).length
      };
    }

    const topErrors = Array.from(this.errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([code, count]) => ({ code, count }));

    return {
      totalErrors: this.recentErrors.length,
      errorsLastHour: recentHourErrors.length,
      errorsLastDay: recentDayErrors.length,
      errorsByService,
      topErrors,
      alertThresholds: this.alertThresholds
    };
  }

  getRecentErrors(limit = 50) {
    return this.recentErrors.slice(-limit);
  }

  clearOldErrors(olderThanMs = 86400000) { // 24 hours default
    const cutoff = Date.now() - olderThanMs;
    
    // Clear old errors from service maps
    for (const [serviceName, errors] of this.errors.entries()) {
      const filteredErrors = errors.filter(
        e => new Date(e.timestamp).getTime() > cutoff
      );
      this.errors.set(serviceName, filteredErrors);
    }

    // Clear old recent errors
    this.recentErrors = this.recentErrors.filter(
      e => new Date(e.timestamp).getTime() > cutoff
    );

    logger.info('Old errors cleared', { 
      cutoffTime: new Date(cutoff).toISOString(),
      remainingErrors: this.recentErrors.length 
    });
  }
}

// Create singleton instances
export const errorRecoverySystem = new ErrorRecoverySystem();
export const errorAggregator = new ErrorAggregator();

// Register default fallback strategies
errorRecoverySystem.registerFallbackStrategy('cacheFailure', async (error, context) => {
  logger.warn('Cache failure, proceeding without cache', { error: error.message, context });
  return null; // Proceed without cached data
});

errorRecoverySystem.registerFallbackStrategy('databaseFailure', async (error, context) => {
  logger.error('Database failure, returning cached data if available', { error: error.message, context });
  
  // Try to return cached data
  if (context.cacheKey) {
    const cachedData = performanceCache.get(context.cacheKey);
    if (cachedData) {
      logger.info('Returning cached data due to database failure', { cacheKey: context.cacheKey });
      return cachedData;
    }
  }
  
  throw new ManufacturingError(
    'Database unavailable and no cached data available',
    'DATABASE_AND_CACHE_FAILURE',
    context,
    'CRITICAL',
    false
  );
});

export default {
  ManufacturingError,
  CircuitBreaker,
  RetryMechanism,
  ErrorRecoverySystem,
  ErrorAggregator,
  errorRecoverySystem,
  errorAggregator
};
