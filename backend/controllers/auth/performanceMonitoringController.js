// Authentication Performance Monitoring Controller
// Manufacturing-optimized performance monitoring and analytics API

import { authPerformanceMonitor } from '../../services/authPerformanceMonitor.js';
import { sessionManager } from '../../services/sessionManager.js';
import { tokenRotationService } from '../../services/tokenRotationService.js';
import { 
  successResponse, 
  errorResponse, 
  manufacturingResponse 
} from '../../utils/index.js';
import { manufacturingLogger } from '../../middleware/logger.js';
import { 
  AuthenticationError, 
  ValidationError, 
  asyncHandler 
} from '../../middleware/errorHandler.js';

/**
 * Get real-time performance dashboard data
 * GET /api/v1/auth/monitoring/dashboard
 */
export const getPerformanceDashboard = asyncHandler(async (req, res) => {
  // Only system admins and QC managers can view performance dashboard
  if (!['SYSTEM_ADMIN', 'QC_MANAGER'].includes(req.user.role)) {
    throw new AuthenticationError('Insufficient permissions for performance dashboard', {
      reason: 'insufficient_permissions'
    });
  }

  try {
    // Get comprehensive performance data
    const [performanceMetrics, recentAlerts, sessionStats, securityStats] = await Promise.all([
      authPerformanceMonitor.getPerformanceMetrics(),
      authPerformanceMonitor.getRecentAlerts(20),
      sessionManager.getSessionStats(),
      tokenRotationService.getSecurityStats()
    ]);

    // Calculate additional metrics
    const dashboardData = {
      timestamp: new Date().toISOString(),
      overview: {
        totalActiveSessions: sessionStats?.activeSessions || 0,
        totalUsers: sessionStats?.uniqueUsers || 0,
        systemUptime: process.uptime(),
        lastUpdate: new Date().toISOString()
      },
      performance: performanceMetrics || {},
      alerts: {
        recent: recentAlerts || [],
        unacknowledged: (recentAlerts || []).filter(a => !a.acknowledged).length,
        critical: (recentAlerts || []).filter(a => a.level === 'critical').length,
        warning: (recentAlerts || []).filter(a => a.level === 'warning').length
      },
      security: securityStats || {},
      trends: await authPerformanceMonitor.getPerformanceTrends(60) // 1 hour trends
    };

    res.status(200).json(manufacturingResponse(
      dashboardData,
      'Performance dashboard data retrieved',
      {
        action: 'get_performance_dashboard',
        timestamp: req.timestamp
      }
    ));

  } catch (error) {
    manufacturingLogger.error('Failed to get performance dashboard', {
      error: error.message,
      userId: req.user.id,
      category: 'performance_monitoring'
    });
    
    throw new ValidationError('Failed to retrieve performance dashboard data', {
      reason: 'data_retrieval_error',
      details: error.message
    });
  }
});

/**
 * Get detailed performance metrics
 * GET /api/v1/auth/monitoring/metrics
 */
export const getDetailedMetrics = asyncHandler(async (req, res) => {
  const { windowMinutes = 60, operation } = req.query;

  // Validate window size
  const validWindows = [15, 30, 60, 120, 240]; // 15min to 4 hours
  if (!validWindows.includes(parseInt(windowMinutes))) {
    throw new ValidationError('Invalid monitoring window', {
      field: 'windowMinutes',
      value: windowMinutes,
      validValues: validWindows,
      reason: 'invalid_window_size'
    });
  }

  try {
    const metrics = await authPerformanceMonitor.getPerformanceMetrics();
    const trends = await authPerformanceMonitor.getPerformanceTrends(parseInt(windowMinutes));

    const detailedMetrics = {
      timestamp: new Date().toISOString(),
      windowMinutes: parseInt(windowMinutes),
      currentMetrics: metrics,
      trends: trends,
      operation: operation || 'all'
    };

    res.status(200).json(manufacturingResponse(
      detailedMetrics,
      'Detailed performance metrics retrieved',
      {
        action: 'get_detailed_metrics',
        windowMinutes: parseInt(windowMinutes),
        timestamp: req.timestamp
      }
    ));

  } catch (error) {
    manufacturingLogger.error('Failed to get detailed metrics', {
      error: error.message,
      windowMinutes,
      category: 'performance_monitoring'
    });
    
    throw new ValidationError('Failed to retrieve detailed metrics', {
      reason: 'metrics_retrieval_error',
      details: error.message
    });
  }
});

/**
 * Get recent alerts with filtering
 * GET /api/v1/auth/monitoring/alerts
 */
export const getRecentAlerts = asyncHandler(async (req, res) => {
  const { limit = 50, level, category, acknowledged } = req.query;

  // Validate limit
  if (limit < 1 || limit > 200) {
    throw new ValidationError('Invalid alert limit', {
      field: 'limit',
      value: limit,
      min: 1,
      max: 200,
      reason: 'invalid_limit'
    });
  }

  try {
    let alerts = await authPerformanceMonitor.getRecentAlerts(parseInt(limit));

    // Apply filters
    if (level) {
      alerts = alerts.filter(a => a.level === level);
    }
    
    if (category) {
      alerts = alerts.filter(a => a.category === category);
    }
    
    if (acknowledged !== undefined) {
      const acknowledgedBool = acknowledged === 'true';
      alerts = alerts.filter(a => a.acknowledged === acknowledgedBool);
    }

    const alertSummary = {
      timestamp: new Date().toISOString(),
      total: alerts.length,
      byLevel: {
        critical: alerts.filter(a => a.level === 'critical').length,
        warning: alerts.filter(a => a.level === 'warning').length,
        info: alerts.filter(a => a.level === 'info').length
      },
      byCategory: {
        security: alerts.filter(a => a.category === 'security').length,
        performance: alerts.filter(a => a.category === 'performance').length,
        rate_limiting: alerts.filter(a => a.category === 'rate_limiting').length
      },
      unacknowledged: alerts.filter(a => !a.acknowledged).length,
      alerts: alerts
    };

    res.status(200).json(manufacturingResponse(
      alertSummary,
      'Recent alerts retrieved',
      {
        action: 'get_recent_alerts',
        filters: { level, category, acknowledged },
        timestamp: req.timestamp
      }
    ));

  } catch (error) {
    manufacturingLogger.error('Failed to get recent alerts', {
      error: error.message,
      filters: req.query,
      category: 'performance_monitoring'
    });
    
    throw new ValidationError('Failed to retrieve recent alerts', {
      reason: 'alerts_retrieval_error',
      details: error.message
    });
  }
});

/**
 * Acknowledge an alert
 * POST /api/v1/auth/monitoring/alerts/:alertId/acknowledge
 */
export const acknowledgeAlert = asyncHandler(async (req, res) => {
  const { alertId } = req.params;

  if (!alertId) {
    throw new ValidationError('Alert ID required', {
      field: 'alertId',
      reason: 'missing_alert_id'
    });
  }

  try {
    const acknowledged = await authPerformanceMonitor.acknowledgeAlert(parseInt(alertId));

    if (acknowledged) {
      res.status(200).json(manufacturingResponse(
        { alertId: parseInt(alertId), acknowledged: true },
        'Alert acknowledged successfully',
        {
          action: 'acknowledge_alert',
          alertId: parseInt(alertId),
          timestamp: req.timestamp
        }
      ));
    } else {
      throw new ValidationError('Alert not found or already acknowledged', {
        reason: 'alert_not_found',
        alertId: parseInt(alertId)
      });
    }

  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    
    manufacturingLogger.error('Failed to acknowledge alert', {
      error: error.message,
      alertId,
      category: 'performance_monitoring'
    });
    
    throw new ValidationError('Failed to acknowledge alert', {
      reason: 'acknowledgement_error',
      details: error.message
    });
  }
});

/**
 * Get performance trends analysis
 * GET /api/v1/auth/monitoring/trends
 */
export const getPerformanceTrends = asyncHandler(async (req, res) => {
  const { windowMinutes = 120, operation } = req.query;

  // Validate window size
  const validWindows = [30, 60, 120, 240, 480]; // 30min to 8 hours
  if (!validWindows.includes(parseInt(windowMinutes))) {
    throw new ValidationError('Invalid trend window', {
      field: 'windowMinutes',
      value: windowMinutes,
      validValues: validWindows,
      reason: 'invalid_trend_window'
    });
  }

  try {
    const trends = await authPerformanceMonitor.getPerformanceTrends(parseInt(windowMinutes));

    // Add trend analysis
    const trendAnalysis = {
      timestamp: new Date().toISOString(),
      windowMinutes: parseInt(windowMinutes),
      trends: trends?.trends || {},
      analysis: analyzeTrends(trends?.trends || {}),
      recommendations: generateRecommendations(trends?.trends || {})
    };

    res.status(200).json(manufacturingResponse(
      trendAnalysis,
      'Performance trends analysis retrieved',
      {
        action: 'get_performance_trends',
        windowMinutes: parseInt(windowMinutes),
        timestamp: req.timestamp
      }
    ));

  } catch (error) {
    manufacturingLogger.error('Failed to get performance trends', {
      error: error.message,
      windowMinutes,
      category: 'performance_monitoring'
    });
    
    throw new ValidationError('Failed to retrieve performance trends', {
      reason: 'trends_retrieval_error',
      details: error.message
    });
  }
});

/**
 * Reset performance metrics (admin only)
 * POST /api/v1/auth/monitoring/metrics/reset
 */
export const resetPerformanceMetrics = asyncHandler(async (req, res) => {
  // Only system admins can reset metrics
  if (req.user.role !== 'SYSTEM_ADMIN') {
    throw new AuthenticationError('Insufficient permissions to reset metrics', {
      reason: 'insufficient_permissions'
    });
  }

  try {
    await authPerformanceMonitor.resetMetrics();

    res.status(200).json(manufacturingResponse(
      { reset: true, timestamp: new Date().toISOString() },
      'Performance metrics reset successfully',
      {
        action: 'reset_performance_metrics',
        adminUserId: req.user.id,
        timestamp: req.timestamp
      }
    ));

    // Log the reset operation
    manufacturingLogger.info('Performance metrics reset by admin', {
      adminUserId: req.user.id,
      adminUsername: req.user.username,
      category: 'performance_monitoring'
    });

  } catch (error) {
    manufacturingLogger.error('Failed to reset performance metrics', {
      error: error.message,
      adminUserId: req.user.id,
      category: 'performance_monitoring'
    });
    
    throw new ValidationError('Failed to reset performance metrics', {
      reason: 'reset_error',
      details: error.message
    });
  }
});

/**
 * Get system health status
 * GET /api/v1/auth/monitoring/health
 */
export const getSystemHealth = asyncHandler(async (req, res) => {
  try {
    // Import services for health check
    const { checkRedisHealth } = await import('../../config/redis.js');
    
    const [redisHealth, performanceMetrics, recentAlerts] = await Promise.all([
      checkRedisHealth(),
      authPerformanceMonitor.getPerformanceMetrics(),
      authPerformanceMonitor.getRecentAlerts(10)
    ]);

    // Determine overall system health
    const criticalAlerts = recentAlerts.filter(a => a.level === 'critical');
    const warningAlerts = recentAlerts.filter(a => a.level === 'warning');
    
    let overallHealth = 'healthy';
    if (criticalAlerts.length > 0) {
      overallHealth = 'critical';
    } else if (warningAlerts.length > 3) {
      overallHealth = 'warning';
    } else if (redisHealth.status !== 'healthy') {
      overallHealth = 'degraded';
    }

    const healthData = {
      status: overallHealth,
      timestamp: new Date().toISOString(),
      services: {
        redis: redisHealth.status,
        redisResponseTime: redisHealth.responseTime,
        performanceMonitoring: 'operational',
        sessionManagement: 'operational',
        tokenRotation: 'operational'
      },
      alerts: {
        critical: criticalAlerts.length,
        warning: warningAlerts.length,
        total: recentAlerts.length
      },
      performance: {
        successRate: performanceMetrics?.successRate || '0.000',
        averageResponseTime: calculateOverallAverageResponseTime(performanceMetrics?.performance || {})
      },
              recommendations: generateHealthRecommendations(overallHealth, criticalAlerts, warningAlerts)
    };

    res.status(200).json(manufacturingResponse(
      healthData,
      'System health status retrieved',
      {
        action: 'get_system_health',
        timestamp: req.timestamp
      }
    ));

  } catch (error) {
    manufacturingLogger.error('Failed to get system health', {
      error: error.message,
      category: 'performance_monitoring'
    });
    
    // Return degraded health status if monitoring fails
    res.status(200).json(manufacturingResponse(
      {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        services: {
          redis: 'unknown',
          performanceMonitoring: 'error',
          sessionManagement: 'unknown',
          tokenRotation: 'unknown'
        }
      },
      'System health status (degraded)',
      {
        action: 'get_system_health',
        timestamp: req.timestamp
      }
    ));
  }
});

/**
 * Analyze performance trends and provide insights
 */
function analyzeTrends(trends) {
  const analysis = {
    overall: 'stable',
    operations: {},
    insights: []
  };

  let improvingCount = 0;
  let degradingCount = 0;
  let stableCount = 0;

  for (const [operation, trend] of Object.entries(trends)) {
    analysis.operations[operation] = {
      trend: trend.trend,
      performance: trend.averageResponseTime < 1000 ? 'excellent' :
                  trend.averageResponseTime < 2000 ? 'good' :
                  trend.averageResponseTime < 5000 ? 'fair' : 'poor'
    };

    if (trend.trend === 'improving') improvingCount++;
    else if (trend.trend === 'degrading') degradingCount++;
    else stableCount++;

    // Generate insights
    if (trend.trend === 'degrading' && trend.averageResponseTime > 2000) {
      analysis.insights.push(`${operation} performance is degrading and may need attention`);
    } else if (trend.trend === 'improving' && trend.averageResponseTime < 500) {
      analysis.insights.push(`${operation} performance is improving significantly`);
    }
  }

  // Determine overall trend
  if (degradingCount > improvingCount) {
    analysis.overall = 'degrading';
    analysis.insights.push('Overall system performance is trending downward');
  } else if (improvingCount > degradingCount) {
    analysis.overall = 'improving';
    analysis.insights.push('Overall system performance is trending upward');
  }

  return analysis;
}

/**
 * Generate performance recommendations
 */
function generateRecommendations(trends) {
  const recommendations = [];

  for (const [operation, trend] of Object.entries(trends)) {
    if (trend.trend === 'degrading') {
      if (operation === 'login') {
        recommendations.push('Consider optimizing database queries for user authentication');
        recommendations.push('Review login endpoint performance and caching strategies');
      } else if (operation === 'tokenRotation') {
        recommendations.push('Optimize token rotation process and Redis operations');
        recommendations.push('Consider implementing token rotation batching');
      } else if (operation.includes('session')) {
        recommendations.push('Review session management performance and Redis configuration');
        recommendations.push('Consider implementing session cleanup optimization');
      }
    }

    if (trend.averageResponseTime > 2000) {
      recommendations.push(`Investigate ${operation} performance bottlenecks`);
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('System performance is within acceptable parameters');
    recommendations.push('Continue monitoring for any performance degradation');
  }

  return recommendations;
}

/**
 * Generate health recommendations
 */
function generateHealthRecommendations(overallHealth, criticalAlerts, warningAlerts) {
  const recommendations = [];

  if (overallHealth === 'critical') {
    recommendations.push('Immediate attention required for critical alerts');
    recommendations.push('Review system logs and performance metrics');
    recommendations.push('Consider implementing emergency response procedures');
  } else if (overallHealth === 'warning') {
    recommendations.push('Monitor warning alerts closely');
    recommendations.push('Review performance trends and system resources');
    recommendations.push('Prepare for potential performance issues');
  } else if (overallHealth === 'degraded') {
    recommendations.push('Investigate service degradation');
    recommendations.push('Check Redis connectivity and performance');
    recommendations.push('Review recent system changes');
  } else {
    recommendations.push('System is operating normally');
    recommendations.push('Continue regular monitoring and maintenance');
  }

  return recommendations;
}

/**
 * Calculate overall average response time
 */
function calculateOverallAverageResponseTime(performance) {
  const operations = Object.values(performance);
  if (operations.length === 0) return 0;

  const totalTime = operations.reduce((sum, op) => sum + op.averageResponseTime, 0);
  return Math.round(totalTime / operations.length);
}

export default {
  getPerformanceDashboard,
  getDetailedMetrics,
  getRecentAlerts,
  acknowledgeAlert,
  getPerformanceTrends,
  resetPerformanceMetrics,
  getSystemHealth
};
