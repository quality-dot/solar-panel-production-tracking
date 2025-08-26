// Error Handling and Recovery API Routes
// Endpoints for monitoring and managing error recovery systems

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { successResponse, errorResponse } from '../utils/responseUtils.js';
import { 
  errorRecoverySystem, 
  errorAggregator,
  ManufacturingError 
} from '../utils/errorHandling.js';
import { 
  serviceHealthTracker,
  DEGRADATION_MODES,
  emergencyFallbacks 
} from '../middleware/gracefulDegradation.js';

const router = express.Router();

/**
 * GET /api/v1/error-handling/circuit-breakers
 * Get circuit breaker status for all services
 */
router.get('/circuit-breakers', asyncHandler(async (req, res) => {
  try {
    const stats = errorRecoverySystem.getCircuitBreakerStats();
    
    res.json(successResponse(stats, 'Circuit breaker statistics retrieved'));
    
  } catch (error) {
    res.status(500).json(errorResponse(
      'Failed to retrieve circuit breaker statistics',
      'CIRCUIT_BREAKER_ERROR',
      { error: error.message }
    ));
  }
}));

/**
 * POST /api/v1/error-handling/circuit-breakers/:serviceName/reset
 * Reset a specific circuit breaker
 */
router.post('/circuit-breakers/:serviceName/reset', asyncHandler(async (req, res) => {
  try {
    const { serviceName } = req.params;
    
    errorRecoverySystem.resetCircuitBreaker(serviceName);
    
    res.json(successResponse(
      { serviceName, resetAt: new Date().toISOString() },
      `Circuit breaker for ${serviceName} reset successfully`
    ));
    
  } catch (error) {
    res.status(500).json(errorResponse(
      'Failed to reset circuit breaker',
      'RESET_ERROR',
      { error: error.message }
    ));
  }
}));

/**
 * POST /api/v1/error-handling/circuit-breakers/reset-all
 * Reset all circuit breakers
 */
router.post('/circuit-breakers/reset-all', asyncHandler(async (req, res) => {
  try {
    errorRecoverySystem.resetAllCircuitBreakers();
    
    res.json(successResponse(
      { resetAt: new Date().toISOString() },
      'All circuit breakers reset successfully'
    ));
    
  } catch (error) {
    res.status(500).json(errorResponse(
      'Failed to reset circuit breakers',
      'RESET_ALL_ERROR',
      { error: error.message }
    ));
  }
}));

/**
 * GET /api/v1/error-handling/errors/stats
 * Get error aggregation statistics
 */
router.get('/errors/stats', asyncHandler(async (req, res) => {
  try {
    const stats = errorAggregator.getStats();
    
    res.json(successResponse(stats, 'Error statistics retrieved'));
    
  } catch (error) {
    res.status(500).json(errorResponse(
      'Failed to retrieve error statistics',
      'ERROR_STATS_ERROR',
      { error: error.message }
    ));
  }
}));

/**
 * GET /api/v1/error-handling/errors/recent
 * Get recent errors
 */
router.get('/errors/recent', asyncHandler(async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const recentErrors = errorAggregator.getRecentErrors(parseInt(limit));
    
    res.json(successResponse({
      errors: recentErrors,
      count: recentErrors.length,
      limit: parseInt(limit)
    }, 'Recent errors retrieved'));
    
  } catch (error) {
    res.status(500).json(errorResponse(
      'Failed to retrieve recent errors',
      'RECENT_ERRORS_ERROR',
      { error: error.message }
    ));
  }
}));

/**
 * POST /api/v1/error-handling/errors/clear-old
 * Clear old errors from aggregator
 */
router.post('/errors/clear-old', asyncHandler(async (req, res) => {
  try {
    const { olderThanHours = 24 } = req.body;
    const olderThanMs = parseInt(olderThanHours) * 60 * 60 * 1000;
    
    errorAggregator.clearOldErrors(olderThanMs);
    
    res.json(successResponse(
      { 
        clearedOlderThan: `${olderThanHours} hours`,
        clearedAt: new Date().toISOString() 
      },
      'Old errors cleared successfully'
    ));
    
  } catch (error) {
    res.status(500).json(errorResponse(
      'Failed to clear old errors',
      'CLEAR_ERRORS_ERROR',
      { error: error.message }
    ));
  }
}));

/**
 * GET /api/v1/error-handling/health
 * Get comprehensive system health including error handling status
 */
router.get('/health', asyncHandler(async (req, res) => {
  try {
    const healthStatus = serviceHealthTracker.getHealthStatus();
    const circuitBreakerStats = errorRecoverySystem.getCircuitBreakerStats();
    const errorStats = errorAggregator.getStats();
    
    const overallHealth = {
      systemStatus: healthStatus.overallStatus,
      services: healthStatus.services,
      capabilities: healthStatus.degradationCapabilities,
      circuitBreakers: circuitBreakerStats,
      errorStatistics: errorStats,
      recommendations: generateHealthRecommendations(healthStatus, circuitBreakerStats, errorStats)
    };
    
    const statusCode = healthStatus.overallStatus === DEGRADATION_MODES.FULL_SERVICE ? 200 : 503;
    
    res.status(statusCode).json(successResponse(overallHealth, 'System health retrieved'));
    
  } catch (error) {
    res.status(500).json(errorResponse(
      'Health check failed',
      'HEALTH_CHECK_ERROR',
      { error: error.message }
    ));
  }
}));

/**
 * POST /api/v1/error-handling/test-recovery
 * Test error recovery mechanisms
 */
router.post('/test-recovery', asyncHandler(async (req, res) => {
  try {
    const { testType = 'database', forceFailure = false } = req.body;
    
    let testResult;
    
    if (testType === 'database') {
      testResult = await testDatabaseRecovery(forceFailure);
    } else if (testType === 'cache') {
      testResult = await testCacheRecovery(forceFailure);
    } else if (testType === 'barcode') {
      testResult = await testBarcodeRecovery(forceFailure);
    } else {
      return res.status(400).json(errorResponse(
        'Invalid test type',
        'INVALID_TEST_TYPE',
        { validTypes: ['database', 'cache', 'barcode'] }
      ));
    }
    
    res.json(successResponse(testResult, `${testType} recovery test completed`));
    
  } catch (error) {
    res.status(500).json(errorResponse(
      'Recovery test failed',
      'RECOVERY_TEST_ERROR',
      { error: error.message }
    ));
  }
}));

/**
 * GET /api/v1/error-handling/fallback-test/:operation
 * Test emergency fallback operations
 */
router.get('/fallback-test/:operation', asyncHandler(async (req, res) => {
  try {
    const { operation } = req.params;
    
    if (operation === 'barcode-validation') {
      const { barcode = 'CRS24WT3600001' } = req.query;
      const result = emergencyFallbacks.barcodeValidation(barcode);
      
      res.json(successResponse(result, 'Emergency barcode validation fallback tested'));
      
    } else if (operation === 'health-check') {
      const result = emergencyFallbacks.healthCheck();
      
      res.json(successResponse(result, 'Emergency health check fallback tested'));
      
    } else {
      return res.status(400).json(errorResponse(
        'Invalid fallback operation',
        'INVALID_FALLBACK',
        { validOperations: ['barcode-validation', 'health-check'] }
      ));
    }
    
  } catch (error) {
    res.status(500).json(errorResponse(
      'Fallback test failed',
      'FALLBACK_TEST_ERROR',
      { error: error.message }
    ));
  }
}));

/**
 * POST /api/v1/error-handling/simulate-failure
 * Simulate system failures for testing (development only)
 */
router.post('/simulate-failure', asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json(errorResponse(
      'Failure simulation not allowed in production',
      'PRODUCTION_FORBIDDEN'
    ));
  }
  
  try {
    const { serviceType, duration = 30000, severity = 'ERROR' } = req.body;
    
    const simulationId = `SIM_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    // Simulate failure
    const simulatedError = new ManufacturingError(
      `Simulated ${serviceType} failure`,
      'SIMULATED_FAILURE',
      { simulationId, duration, serviceType },
      severity,
      true
    );
    
    errorAggregator.recordError(simulatedError, serviceType, {
      simulated: true,
      simulationId
    });
    
    // Auto-recover after duration
    setTimeout(() => {
      console.log(`Simulated failure ${simulationId} auto-recovering`);
    }, duration);
    
    res.json(successResponse({
      simulationId,
      serviceType,
      duration,
      severity,
      message: `Simulated failure will auto-recover in ${duration}ms`
    }, 'Failure simulation started'));
    
  } catch (error) {
    res.status(500).json(errorResponse(
      'Failure simulation failed',
      'SIMULATION_ERROR',
      { error: error.message }
    ));
  }
}));

/**
 * GET /api/v1/error-handling/recovery-recommendations
 * Get automated recovery recommendations
 */
router.get('/recovery-recommendations', asyncHandler(async (req, res) => {
  try {
    const healthStatus = serviceHealthTracker.getHealthStatus();
    const circuitBreakerStats = errorRecoverySystem.getCircuitBreakerStats();
    const errorStats = errorAggregator.getStats();
    
    const recommendations = generateRecoveryRecommendations(
      healthStatus, 
      circuitBreakerStats, 
      errorStats
    );
    
    res.json(successResponse({
      recommendations,
      priority: categorizePriority(recommendations),
      generatedAt: new Date().toISOString()
    }, 'Recovery recommendations generated'));
    
  } catch (error) {
    res.status(500).json(errorResponse(
      'Failed to generate recommendations',
      'RECOMMENDATIONS_ERROR',
      { error: error.message }
    ));
  }
}));

// Helper functions

async function testDatabaseRecovery(forceFailure) {
  return await errorRecoverySystem.executeWithRecovery(
    async () => {
      if (forceFailure) {
        throw new Error('Simulated database failure');
      }
      return { success: true, message: 'Database operation successful' };
    },
    {
      serviceName: 'database',
      fallbackStrategy: 'databaseFailure',
      context: { operation: 'recoveryTest' }
    }
  );
}

async function testCacheRecovery(forceFailure) {
  return await errorRecoverySystem.executeWithRecovery(
    async () => {
      if (forceFailure) {
        throw new Error('Simulated cache failure');
      }
      return { success: true, message: 'Cache operation successful' };
    },
    {
      serviceName: 'cache',
      fallbackStrategy: 'cacheFailure',
      context: { operation: 'recoveryTest' }
    }
  );
}

async function testBarcodeRecovery(forceFailure) {
  return await errorRecoverySystem.executeWithRecovery(
    async () => {
      if (forceFailure) {
        throw new Error('Simulated barcode processing failure');
      }
      return { success: true, message: 'Barcode processing successful' };
    },
    {
      serviceName: 'barcodeProcessing',
      context: { operation: 'recoveryTest' }
    }
  );
}

function generateHealthRecommendations(healthStatus, circuitBreakerStats, errorStats) {
  const recommendations = [];
  
  // Check circuit breaker status
  Object.entries(circuitBreakerStats).forEach(([service, stats]) => {
    if (stats.state === 'OPEN') {
      recommendations.push({
        type: 'CRITICAL',
        service,
        issue: 'Circuit breaker is OPEN',
        action: `Reset circuit breaker for ${service} after investigating root cause`,
        priority: 'HIGH'
      });
    } else if (stats.stats.failureRate && parseFloat(stats.stats.failureRate) > 20) {
      recommendations.push({
        type: 'WARNING',
        service,
        issue: `High failure rate: ${stats.stats.failureRate}`,
        action: `Investigate ${service} performance and stability`,
        priority: 'MEDIUM'
      });
    }
  });
  
  // Check error rates
  if (errorStats.errorsLastHour > 50) {
    recommendations.push({
      type: 'WARNING',
      service: 'system',
      issue: `High error rate: ${errorStats.errorsLastHour} errors in last hour`,
      action: 'Review error logs and investigate common failure patterns',
      priority: 'HIGH'
    });
  }
  
  // Check service health
  Object.entries(healthStatus.services).forEach(([serviceName, service]) => {
    if (service.status === 'FAILING') {
      recommendations.push({
        type: 'CRITICAL',
        service: serviceName,
        issue: `Service is failing (degradation level: ${service.degradationLevel})`,
        action: `Immediate investigation required for ${serviceName}`,
        priority: 'CRITICAL'
      });
    }
  });
  
  return recommendations;
}

function generateRecoveryRecommendations(healthStatus, circuitBreakerStats, errorStats) {
  const recommendations = [];
  
  // Analyze top errors
  errorStats.topErrors.forEach(error => {
    if (error.count > 10) {
      recommendations.push({
        type: 'RECOVERY',
        issue: `Frequent error: ${error.code} (${error.count} occurrences)`,
        actions: [
          'Investigate root cause of recurring error',
          'Consider adding specific error handling for this case',
          'Review related circuit breaker thresholds'
        ],
        priority: 'MEDIUM'
      });
    }
  });
  
  // Check for service-specific recovery actions
  Object.entries(healthStatus.services).forEach(([serviceName, service]) => {
    if (service.degradationLevel > 1) {
      recommendations.push({
        type: 'RECOVERY',
        service: serviceName,
        issue: `Service degraded (level ${service.degradationLevel})`,
        actions: [
          'Restart service if possible',
          'Check resource utilization',
          'Review recent changes or deployments',
          'Consider scaling resources'
        ],
        priority: service.degradationLevel > 2 ? 'HIGH' : 'MEDIUM'
      });
    }
  });
  
  return recommendations;
}

function categorizePriority(recommendations) {
  const critical = recommendations.filter(r => r.priority === 'CRITICAL').length;
  const high = recommendations.filter(r => r.priority === 'HIGH').length;
  const medium = recommendations.filter(r => r.priority === 'MEDIUM').length;
  const low = recommendations.filter(r => r.priority === 'LOW').length;
  
  return {
    critical,
    high,
    medium,
    low,
    total: recommendations.length,
    urgentAction: critical > 0 || high > 2
  };
}

export default router;
