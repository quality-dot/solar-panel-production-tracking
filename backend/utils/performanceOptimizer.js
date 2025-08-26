// Performance Optimization Layer
// High-performance wrappers for barcode processing and database operations

import { performanceCache, createCacheKey, hashQuery } from './performanceCache.js';
import { ManufacturingLogger } from '../middleware/logger.js';
import { 
  processBarcodeComplete as originalProcessBarcode,
  parseBarcode as originalParseBarcode,
  validateBarcodeComponents as originalValidateComponents,
  determineLineAssignment as originalLineAssignment
} from './barcodeProcessor.js';

const logger = new ManufacturingLogger('PerformanceOptimizer');

/**
 * Performance metrics collection
 */
class PerformanceMetrics {
  constructor() {
    this.metrics = {
      totalRequests: 0,
      averageResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: Infinity,
      responseTimeHistory: [],
      slowQueries: [],
      errorRate: 0,
      totalErrors: 0
    };
    
    this.thresholds = {
      slowQueryThreshold: 1000, // 1 second
      criticalResponseTime: 2000, // 2 seconds
      maxHistorySize: 1000
    };
  }

  recordRequest(startTime, success = true, context = {}) {
    const responseTime = Date.now() - startTime;
    this.metrics.totalRequests++;
    
    if (!success) {
      this.metrics.totalErrors++;
    }

    // Update response time metrics
    this.metrics.maxResponseTime = Math.max(this.metrics.maxResponseTime, responseTime);
    this.metrics.minResponseTime = Math.min(this.metrics.minResponseTime, responseTime);
    
    // Update average (running average)
    const alpha = 0.1; // Smoothing factor
    this.metrics.averageResponseTime = 
      this.metrics.averageResponseTime * (1 - alpha) + responseTime * alpha;

    // Track response time history
    this.metrics.responseTimeHistory.push({
      timestamp: Date.now(),
      responseTime,
      success,
      context
    });

    // Limit history size
    if (this.metrics.responseTimeHistory.length > this.thresholds.maxHistorySize) {
      this.metrics.responseTimeHistory = this.metrics.responseTimeHistory.slice(-this.thresholds.maxHistorySize);
    }

    // Track slow queries
    if (responseTime > this.thresholds.slowQueryThreshold) {
      this.metrics.slowQueries.push({
        timestamp: Date.now(),
        responseTime,
        context
      });

      // Limit slow queries history
      if (this.metrics.slowQueries.length > 100) {
        this.metrics.slowQueries = this.metrics.slowQueries.slice(-100);
      }

      logger.warn('Slow operation detected', {
        responseTime: `${responseTime}ms`,
        threshold: `${this.thresholds.slowQueryThreshold}ms`,
        context
      });
    }

    // Calculate error rate
    this.metrics.errorRate = (this.metrics.totalErrors / this.metrics.totalRequests) * 100;

    // Alert on critical response times
    if (responseTime > this.thresholds.criticalResponseTime) {
      logger.error('Critical response time exceeded', {
        responseTime: `${responseTime}ms`,
        threshold: `${this.thresholds.criticalResponseTime}ms`,
        context
      });
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      minResponseTime: this.metrics.minResponseTime === Infinity ? 0 : this.metrics.minResponseTime,
      recentPerformance: this.getRecentPerformance(),
      healthStatus: this.getHealthStatus()
    };
  }

  getRecentPerformance(windowMs = 60000) { // Last 1 minute
    const cutoff = Date.now() - windowMs;
    const recentRequests = this.metrics.responseTimeHistory.filter(
      entry => entry.timestamp > cutoff
    );

    if (recentRequests.length === 0) {
      return { count: 0, averageResponseTime: 0, errorRate: 0 };
    }

    const totalTime = recentRequests.reduce((sum, entry) => sum + entry.responseTime, 0);
    const errors = recentRequests.filter(entry => !entry.success).length;

    return {
      count: recentRequests.length,
      averageResponseTime: Math.round(totalTime / recentRequests.length),
      errorRate: (errors / recentRequests.length) * 100,
      timeWindow: `${windowMs / 1000}s`
    };
  }

  getHealthStatus() {
    const recent = this.getRecentPerformance();
    
    if (recent.count === 0) return 'UNKNOWN';
    if (recent.averageResponseTime > this.thresholds.criticalResponseTime) return 'CRITICAL';
    if (recent.averageResponseTime > this.thresholds.slowQueryThreshold) return 'WARNING';
    if (recent.errorRate > 5) return 'DEGRADED';
    
    return 'HEALTHY';
  }

  reset() {
    this.metrics = {
      totalRequests: 0,
      averageResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: Infinity,
      responseTimeHistory: [],
      slowQueries: [],
      errorRate: 0,
      totalErrors: 0
    };
  }
}

// Global performance metrics instance
const performanceMetrics = new PerformanceMetrics();

/**
 * High-performance barcode processing with caching
 */
export function processBarcodeOptimized(barcode, options = {}) {
  const startTime = Date.now();
  const cacheKey = createCacheKey('barcode_process', barcode, JSON.stringify(options));
  
  try {
    // Check cache first
    const cachedResult = performanceCache.getBarcodeValidation(cacheKey);
    if (cachedResult) {
      performanceMetrics.recordRequest(startTime, true, { 
        operation: 'processBarcodeOptimized', 
        cached: true,
        barcode: barcode.substring(0, 10) + '...'
      });
      return cachedResult;
    }

    // Process barcode
    const result = originalProcessBarcode(barcode, options);
    
    // Cache successful results
    if (result.success) {
      performanceCache.setBarcodeValidation(cacheKey, result);
    }

    performanceMetrics.recordRequest(startTime, result.success, { 
      operation: 'processBarcodeOptimized', 
      cached: false,
      barcode: barcode.substring(0, 10) + '...'
    });

    return result;

  } catch (error) {
    performanceMetrics.recordRequest(startTime, false, { 
      operation: 'processBarcodeOptimized', 
      error: error.message,
      barcode: barcode.substring(0, 10) + '...'
    });
    throw error;
  }
}

/**
 * Optimized barcode parsing with caching
 */
export function parseBarcodeOptimized(barcode) {
  const startTime = Date.now();
  const cacheKey = createCacheKey('barcode_parse', barcode);
  
  try {
    // Check cache
    const cached = performanceCache.getBarcodeValidation(cacheKey);
    if (cached) {
      performanceMetrics.recordRequest(startTime, true, { 
        operation: 'parseBarcodeOptimized', 
        cached: true 
      });
      return cached;
    }

    // Parse barcode
    const result = originalParseBarcode(barcode);
    
    // Cache result
    performanceCache.setBarcodeValidation(cacheKey, result);

    performanceMetrics.recordRequest(startTime, true, { 
      operation: 'parseBarcodeOptimized', 
      cached: false 
    });

    return result;

  } catch (error) {
    performanceMetrics.recordRequest(startTime, false, { 
      operation: 'parseBarcodeOptimized', 
      error: error.message 
    });
    throw error;
  }
}

/**
 * Optimized line assignment with caching
 */
export function determineLineAssignmentOptimized(panelType) {
  const startTime = Date.now();
  
  try {
    // Check cache
    const cached = performanceCache.getLineAssignment(panelType);
    if (cached) {
      performanceMetrics.recordRequest(startTime, true, { 
        operation: 'determineLineAssignmentOptimized', 
        cached: true,
        panelType 
      });
      return cached;
    }

    // Determine assignment
    const result = originalLineAssignment(panelType);
    
    // Cache result
    performanceCache.setLineAssignment(panelType, result);

    performanceMetrics.recordRequest(startTime, true, { 
      operation: 'determineLineAssignmentOptimized', 
      cached: false,
      panelType 
    });

    return result;

  } catch (error) {
    performanceMetrics.recordRequest(startTime, false, { 
      operation: 'determineLineAssignmentOptimized', 
      error: error.message,
      panelType 
    });
    throw error;
  }
}

/**
 * Optimized database query wrapper
 */
export function optimizedDbQuery(queryFunction, query, params = [], cacheKey = null) {
  const startTime = Date.now();
  
  return new Promise(async (resolve, reject) => {
    try {
      // Generate cache key if not provided
      const key = cacheKey || hashQuery(query, params);
      
      // Check cache for SELECT queries only
      if (query.trim().toUpperCase().startsWith('SELECT')) {
        const cached = performanceCache.getDbQuery(key);
        if (cached) {
          performanceMetrics.recordRequest(startTime, true, { 
            operation: 'optimizedDbQuery', 
            cached: true,
            queryType: 'SELECT'
          });
          return resolve(cached);
        }
      }

      // Execute query
      const result = await queryFunction(query, params);
      
      // Cache SELECT results only
      if (query.trim().toUpperCase().startsWith('SELECT') && result.rows) {
        performanceCache.setDbQuery(key, result);
      }

      performanceMetrics.recordRequest(startTime, true, { 
        operation: 'optimizedDbQuery', 
        cached: false,
        queryType: query.trim().substring(0, 6).toUpperCase(),
        rowCount: result.rows?.length || 0
      });

      resolve(result);

    } catch (error) {
      performanceMetrics.recordRequest(startTime, false, { 
        operation: 'optimizedDbQuery', 
        error: error.message,
        queryType: query.trim().substring(0, 6).toUpperCase()
      });
      reject(error);
    }
  });
}

/**
 * Bulk barcode processing with optimizations
 */
export async function processBarcodesBulkOptimized(barcodes, options = {}) {
  const startTime = Date.now();
  const { batchSize = 10, maxConcurrency = 5 } = options;
  
  try {
    const results = [];
    const errors = [];

    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < barcodes.length; i += batchSize) {
      const batch = barcodes.slice(i, i + batchSize);
      
      // Process batch with limited concurrency
      const batchPromises = batch.slice(0, maxConcurrency).map(async (barcode) => {
        try {
          const result = await processBarcodeOptimized(barcode, options);
          return { barcode, result, success: true };
        } catch (error) {
          return { barcode, error: error.message, success: false };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      // Separate successful results from errors
      batchResults.forEach(item => {
        if (item.success) {
          results.push(item);
        } else {
          errors.push(item);
        }
      });

      // Small delay between batches to prevent overwhelming
      if (i + batchSize < barcodes.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    const totalTime = Date.now() - startTime;
    const avgTimePerBarcode = totalTime / barcodes.length;

    performanceMetrics.recordRequest(startTime, errors.length === 0, { 
      operation: 'processBarcodesBulkOptimized', 
      totalBarcodes: barcodes.length,
      successCount: results.length,
      errorCount: errors.length,
      avgTimePerBarcode: Math.round(avgTimePerBarcode)
    });

    return {
      success: errors.length === 0,
      results,
      errors,
      statistics: {
        total: barcodes.length,
        successful: results.length,
        failed: errors.length,
        totalTime,
        avgTimePerBarcode: Math.round(avgTimePerBarcode)
      }
    };

  } catch (error) {
    performanceMetrics.recordRequest(startTime, false, { 
      operation: 'processBarcodesBulkOptimized', 
      error: error.message,
      totalBarcodes: barcodes.length
    });
    throw error;
  }
}

/**
 * Performance monitoring middleware
 */
export function performanceMonitoringMiddleware() {
  return (req, res, next) => {
    const startTime = Date.now();
    
    // Capture original end function
    const originalEnd = res.end;
    
    res.end = function(...args) {
      const responseTime = Date.now() - startTime;
      
      // Record metrics
      performanceMetrics.recordRequest(startTime, res.statusCode < 400, {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });

      // Add performance headers
      res.setHeader('X-Response-Time', `${responseTime}ms`);
      res.setHeader('X-Cache-Status', req.cacheHit ? 'HIT' : 'MISS');
      
      // Log slow requests
      if (responseTime > 1000) {
        logger.warn('Slow request detected', {
          method: req.method,
          path: req.path,
          responseTime: `${responseTime}ms`,
          statusCode: res.statusCode
        });
      }
      
      // Call original end function
      originalEnd.apply(this, args);
    };
    
    next();
  };
}

/**
 * Get comprehensive performance statistics
 */
export function getPerformanceStats() {
  return {
    metrics: performanceMetrics.getMetrics(),
    cache: performanceCache.getStats(),
    timestamp: new Date().toISOString()
  };
}

/**
 * Reset performance metrics
 */
export function resetPerformanceStats() {
  performanceMetrics.reset();
  performanceCache.clearAll();
  
  logger.info('Performance statistics reset');
}

/**
 * Health check for performance system
 */
export function performanceHealthCheck() {
  const stats = getPerformanceStats();
  const cacheHealthy = stats.cache.global.performance === 'OPTIMAL';
  const metricsHealthy = stats.metrics.healthStatus === 'HEALTHY';
  
  return {
    healthy: cacheHealthy && metricsHealthy,
    cache: {
      status: stats.cache.global.performance,
      hitRate: stats.cache.global.hitRate
    },
    metrics: {
      status: stats.metrics.healthStatus,
      averageResponseTime: Math.round(stats.metrics.averageResponseTime),
      errorRate: stats.metrics.errorRate.toFixed(2) + '%'
    },
    recommendations: getPerformanceRecommendations(stats)
  };
}

/**
 * Generate performance optimization recommendations
 */
function getPerformanceRecommendations(stats) {
  const recommendations = [];
  
  const cacheHitRate = parseFloat(stats.cache.global.hitRate);
  if (cacheHitRate < 70) {
    recommendations.push('Consider preloading more frequently accessed data to improve cache hit rate');
  }
  
  if (stats.metrics.averageResponseTime > 1000) {
    recommendations.push('Average response time is high - investigate slow operations');
  }
  
  if (stats.metrics.errorRate > 5) {
    recommendations.push('Error rate is elevated - review error logs and fix underlying issues');
  }
  
  const slowQueries = stats.metrics.slowQueries.length;
  if (slowQueries > 10) {
    recommendations.push('Multiple slow operations detected - optimize frequently used functions');
  }
  
  return recommendations;
}

export default {
  processBarcodeOptimized,
  parseBarcodeOptimized,
  determineLineAssignmentOptimized,
  optimizedDbQuery,
  processBarcodesBulkOptimized,
  performanceMonitoringMiddleware,
  getPerformanceStats,
  resetPerformanceStats,
  performanceHealthCheck
};
