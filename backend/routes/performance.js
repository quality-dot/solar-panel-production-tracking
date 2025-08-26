// Performance Monitoring API Routes
// Endpoints for monitoring system performance and cache statistics

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { successResponse, errorResponse } from '../utils/responseUtils.js';
import { 
  getPerformanceStats, 
  resetPerformanceStats, 
  performanceHealthCheck,
  processBarcodesBulkOptimized
} from '../utils/performanceOptimizer.js';
import { performanceCache } from '../utils/performanceCache.js';
import { databaseManager } from '../config/database.js';

const router = express.Router();

/**
 * GET /api/v1/performance/stats
 * Get comprehensive performance statistics
 */
router.get('/stats', asyncHandler(async (req, res) => {
  try {
    const stats = getPerformanceStats();
    
    res.json(successResponse(stats, 'Performance statistics retrieved'));
    
  } catch (error) {
    res.status(500).json(errorResponse(
      'Failed to retrieve performance statistics',
      'PERFORMANCE_ERROR',
      { error: error.message }
    ));
  }
}));

/**
 * GET /api/v1/performance/health
 * Get performance health check
 */
router.get('/health', asyncHandler(async (req, res) => {
  try {
    const healthCheck = performanceHealthCheck();
    const dbHealth = await databaseManager.getHealthStatus();
    
    const overallHealth = {
      ...healthCheck,
      database: dbHealth,
      overall: healthCheck.healthy && dbHealth.status === 'healthy' ? 'HEALTHY' : 'DEGRADED'
    };
    
    const statusCode = overallHealth.overall === 'HEALTHY' ? 200 : 503;
    
    res.status(statusCode).json(successResponse(overallHealth, 'Performance health check completed'));
    
  } catch (error) {
    res.status(500).json(errorResponse(
      'Performance health check failed',
      'HEALTH_CHECK_ERROR',
      { error: error.message }
    ));
  }
}));

/**
 * GET /api/v1/performance/cache/stats
 * Get detailed cache statistics
 */
router.get('/cache/stats', asyncHandler(async (req, res) => {
  try {
    const cacheStats = performanceCache.getStats();
    
    res.json(successResponse(cacheStats, 'Cache statistics retrieved'));
    
  } catch (error) {
    res.status(500).json(errorResponse(
      'Failed to retrieve cache statistics',
      'CACHE_ERROR',
      { error: error.message }
    ));
  }
}));

/**
 * POST /api/v1/performance/cache/clear
 * Clear all caches
 */
router.post('/cache/clear', asyncHandler(async (req, res) => {
  try {
    const { cacheType } = req.body;
    
    if (cacheType && cacheType !== 'all') {
      performanceCache.clearCache(cacheType);
      res.json(successResponse(
        { clearedCache: cacheType },
        `Cache '${cacheType}' cleared successfully`
      ));
    } else {
      performanceCache.clearAll();
      res.json(successResponse(
        { clearedCache: 'all' },
        'All caches cleared successfully'
      ));
    }
    
  } catch (error) {
    res.status(500).json(errorResponse(
      'Failed to clear cache',
      'CACHE_CLEAR_ERROR',
      { error: error.message }
    ));
  }
}));

/**
 * POST /api/v1/performance/cache/warmup
 * Warm up caches with common data
 */
router.post('/cache/warmup', asyncHandler(async (req, res) => {
  try {
    await performanceCache.warmUp();
    
    const stats = performanceCache.getStats();
    
    res.json(successResponse(
      { cacheStats: stats },
      'Cache warm-up completed successfully'
    ));
    
  } catch (error) {
    res.status(500).json(errorResponse(
      'Cache warm-up failed',
      'CACHE_WARMUP_ERROR',
      { error: error.message }
    ));
  }
}));

/**
 * POST /api/v1/performance/load-test
 * Execute load test for concurrent stations
 */
router.post('/load-test', asyncHandler(async (req, res) => {
  try {
    const { 
      concurrentStations = 8, 
      barcodesPerStation = 10, 
      targetResponseTime = 2000 
    } = req.body;
    
    // Generate test barcodes for each station
    const testBarcodes = [];
    for (let station = 1; station <= concurrentStations; station++) {
      for (let i = 1; i <= barcodesPerStation; i++) {
        const sequence = (station * 1000) + i;
        const barcode = `CRS24WT3600${sequence.toString().padStart(3, '0')}`;
        testBarcodes.push(barcode);
      }
    }
    
    const startTime = Date.now();
    
    // Execute load test
    const result = await processBarcodesBulkOptimized(testBarcodes, {
      batchSize: barcodesPerStation,
      maxConcurrency: concurrentStations
    });
    
    const totalTime = Date.now() - startTime;
    const avgResponseTime = totalTime / testBarcodes.length;
    const maxResponseTime = Math.max(...result.results.map(r => r.responseTime || 0));
    
    // Evaluate performance
    const performance = {
      passed: avgResponseTime <= targetResponseTime && maxResponseTime <= (targetResponseTime * 1.5),
      averageResponseTime: Math.round(avgResponseTime),
      maxResponseTime: Math.round(maxResponseTime),
      targetResponseTime,
      concurrentStations,
      totalBarcodes: testBarcodes.length,
      successRate: (result.statistics.successful / result.statistics.total * 100).toFixed(2) + '%',
      totalTestTime: totalTime
    };
    
    const statusCode = performance.passed ? 200 : 422;
    const message = performance.passed ? 
      'Load test passed - performance requirements met' : 
      'Load test failed - performance requirements not met';
    
    res.status(statusCode).json(successResponse({
      performance,
      results: result,
      cacheStats: performanceCache.getStats()
    }, message));
    
  } catch (error) {
    res.status(500).json(errorResponse(
      'Load test failed',
      'LOAD_TEST_ERROR',
      { error: error.message }
    ));
  }
}));

/**
 * GET /api/v1/performance/database/stats
 * Get database performance statistics
 */
router.get('/database/stats', asyncHandler(async (req, res) => {
  try {
    const dbStats = databaseManager.getPoolStatistics();
    const healthStatus = await databaseManager.getHealthStatus();
    
    const stats = {
      pool: dbStats,
      health: healthStatus,
      performance: {
        connectionUtilization: dbStats.utilization + '%',
        availableConnections: dbStats.maxConnections - dbStats.totalConnections,
        queuedConnections: dbStats.waitingConnections
      }
    };
    
    res.json(successResponse(stats, 'Database statistics retrieved'));
    
  } catch (error) {
    res.status(500).json(errorResponse(
      'Failed to retrieve database statistics',
      'DATABASE_STATS_ERROR',
      { error: error.message }
    ));
  }
}));

/**
 * POST /api/v1/performance/reset
 * Reset all performance statistics
 */
router.post('/reset', asyncHandler(async (req, res) => {
  try {
    resetPerformanceStats();
    
    res.json(successResponse(
      { resetAt: new Date().toISOString() },
      'Performance statistics reset successfully'
    ));
    
  } catch (error) {
    res.status(500).json(errorResponse(
      'Failed to reset performance statistics',
      'RESET_ERROR',
      { error: error.message }
    ));
  }
}));

/**
 * GET /api/v1/performance/recommendations
 * Get performance optimization recommendations
 */
router.get('/recommendations', asyncHandler(async (req, res) => {
  try {
    const healthCheck = performanceHealthCheck();
    
    res.json(successResponse({
      recommendations: healthCheck.recommendations,
      currentStatus: {
        cache: healthCheck.cache,
        metrics: healthCheck.metrics
      }
    }, 'Performance recommendations generated'));
    
  } catch (error) {
    res.status(500).json(errorResponse(
      'Failed to generate recommendations',
      'RECOMMENDATIONS_ERROR',
      { error: error.message }
    ));
  }
}));

/**
 * GET /api/v1/performance/monitor
 * Real-time performance monitoring endpoint (SSE)
 */
router.get('/monitor', (req, res) => {
  // Set up Server-Sent Events
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  const sendStats = () => {
    try {
      const stats = getPerformanceStats();
      const data = JSON.stringify({
        timestamp: new Date().toISOString(),
        performance: stats
      });
      
      res.write(`data: ${data}\n\n`);
    } catch (error) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    }
  };

  // Send initial stats
  sendStats();

  // Send stats every 5 seconds
  const interval = setInterval(sendStats, 5000);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });

  req.on('aborted', () => {
    clearInterval(interval);
    res.end();
  });
});

export default router;
