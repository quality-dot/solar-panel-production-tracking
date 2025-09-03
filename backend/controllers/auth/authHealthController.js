// Authentication Health Controller
// Manufacturing-optimized health monitoring API endpoints

import { authHealthService } from '../../services/authHealthService.js';
import { manufacturingLogger } from '../../middleware/logger.js';
import {
  successResponse,
  errorResponse,
  validationErrorResponse as validationError
} from '../../utils/index.js';

/**
 * Authentication Health Controller
 * Provides API endpoints for monitoring authentication system health
 */
class AuthHealthController {
  /**
   * Get system health overview
   */
  async getSystemHealth(req, res) {
    try {
      const { detailed = false } = req.query;
      const includeDetails = detailed === 'true';
      
      const healthCheck = await authHealthService.performHealthCheck(includeDetails);
      
      // Store health result in history
      await authHealthService.storeHealthResult(healthCheck);
      
      return successResponse(res, {
        message: 'System health check completed',
        data: healthCheck
      });

    } catch (error) {
      manufacturingLogger.error('Failed to get system health', {
        error: error.message,
        category: 'auth_health'
      });
      
      return errorResponse(res, 'Failed to check system health', 500);
    }
  }

  /**
   * Get specific component health
   */
  async getComponentHealth(req, res) {
    try {
      const { component } = req.params;
      
      if (!component) {
        return validationError(res, 'Component name is required');
      }
      
      const healthResult = await authHealthService.getComponentHealth(component);
      
      return successResponse(res, {
        message: `Component health check completed for ${component}`,
        data: {
          component,
          ...healthResult
        }
      });

    } catch (error) {
      manufacturingLogger.error('Failed to get component health', {
        component: req.params.component,
        error: error.message,
        category: 'auth_health'
      });
      
      if (error.message.includes('Unknown health check component')) {
        return errorResponse(res, `Unknown component: ${req.params.component}`, 400);
      }
      
      return errorResponse(res, 'Failed to check component health', 500);
    }
  }

  /**
   * Get health metrics summary
   */
  async getHealthMetrics(req, res) {
    try {
      const { timeRange = '24h' } = req.query;
      
      // Validate time range
      const validTimeRanges = ['1h', '24h', '7d'];
      if (!validTimeRanges.includes(timeRange)) {
        return validationError(res, `Invalid time range. Must be one of: ${validTimeRanges.join(', ')}`);
      }
      
      const metrics = await authHealthService.getHealthMetrics(timeRange);
      
      if (!metrics) {
        return errorResponse(res, 'Failed to retrieve health metrics', 500);
      }
      
      return successResponse(res, {
        message: 'Health metrics retrieved successfully',
        data: {
          timeRange,
          ...metrics
        }
      });

    } catch (error) {
      manufacturingLogger.error('Failed to get health metrics', {
        timeRange: req.query.timeRange,
        error: error.message,
        category: 'auth_health'
      });
      
      return errorResponse(res, 'Failed to retrieve health metrics', 500);
    }
  }

  /**
   * Get health history
   */
  async getHealthHistory(req, res) {
    try {
      const { limit = 10 } = req.query;
      const limitNum = parseInt(limit, 10);
      
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return validationError(res, 'Limit must be a number between 1 and 100');
      }
      
      const history = await authHealthService.getHealthHistory(limitNum);
      
      return successResponse(res, {
        message: 'Health history retrieved successfully',
        data: {
          history,
          count: history.length,
          limit: limitNum
        }
      });

    } catch (error) {
      manufacturingLogger.error('Failed to get health history', {
        limit: req.query.limit,
        error: error.message,
        category: 'auth_health'
      });
      
      return errorResponse(res, 'Failed to retrieve health history', 500);
    }
  }

  /**
   * Get health dashboard data
   */
  async getHealthDashboard(req, res) {
    try {
      // Get current health status
      const currentHealth = await authHealthService.performHealthCheck(true);
      
      // Get metrics for different time ranges
      const [hourlyMetrics, dailyMetrics, weeklyMetrics] = await Promise.all([
        authHealthService.getHealthMetrics('1h'),
        authHealthService.getHealthMetrics('24h'),
        authHealthService.getHealthMetrics('7d')
      ]);
      
      // Get recent history
      const recentHistory = await authHealthService.getHealthHistory(20);
      
      const dashboard = {
        currentStatus: {
          overall: currentHealth.status,
          timestamp: currentHealth.timestamp,
          responseTime: currentHealth.responseTime,
          summary: currentHealth.summary
        },
        metrics: {
          hourly: hourlyMetrics,
          daily: dailyMetrics,
          weekly: weeklyMetrics
        },
        recentHistory: recentHistory.slice(0, 10),
        trends: this.analyzeHealthTrends(recentHistory),
        recommendations: currentHealth.recommendations
      };
      
      return successResponse(res, {
        message: 'Health dashboard data retrieved successfully',
        data: dashboard
      });

    } catch (error) {
      manufacturingLogger.error('Failed to get health dashboard', {
        error: error.message,
        category: 'auth_health'
      });
      
      return errorResponse(res, 'Failed to retrieve health dashboard', 500);
    }
  }

  /**
   * Force health check refresh
   */
  async refreshHealthCheck(req, res) {
    try {
      const { detailed = false } = req.query;
      const includeDetails = detailed === 'true';
      
      // Force a fresh health check
      const healthCheck = await authHealthService.performHealthCheck(includeDetails);
      
      // Store the result
      await authHealthService.storeHealthResult(healthCheck);
      
      return successResponse(res, {
        message: 'Health check refreshed successfully',
        data: {
          refreshed: true,
          timestamp: healthCheck.timestamp,
          status: healthCheck.status,
          responseTime: healthCheck.responseTime
        }
      });

    } catch (error) {
      manufacturingLogger.error('Failed to refresh health check', {
        error: error.message,
        category: 'auth_health'
      });
      
      return errorResponse(res, 'Failed to refresh health check', 500);
    }
  }

  /**
   * Get health check configuration
   */
  async getHealthConfig(req, res) {
    try {
      const config = {
        healthLevels: authHealthService.healthLevels,
        healthCategories: authHealthService.healthCategories,
        healthThresholds: authHealthService.healthThresholds,
        availableChecks: Object.keys(authHealthService.healthChecks),
        description: 'Authentication system health monitoring configuration'
      };
      
      return successResponse(res, {
        message: 'Health configuration retrieved successfully',
        data: config
      });

    } catch (error) {
      manufacturingLogger.error('Failed to get health configuration', {
        error: error.message,
        category: 'auth_health'
      });
      
      return errorResponse(res, 'Failed to retrieve health configuration', 500);
    }
  }

  /**
   * Analyze health trends from history
   */
  analyzeHealthTrends(history) {
    if (history.length < 2) {
      return {
        trend: 'insufficient_data',
        message: 'Not enough data to analyze trends'
      };
    }
    
    // Sort by timestamp (newest first)
    const sortedHistory = history.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    // Get recent vs older health status
    const recent = sortedHistory.slice(0, Math.ceil(history.length / 2));
    const older = sortedHistory.slice(Math.ceil(history.length / 2));
    
    // Calculate average response times
    const recentAvgResponse = recent.reduce((sum, check) => 
      sum + (check.responseTime || 0), 0
    ) / recent.length;
    
    const olderAvgResponse = older.reduce((sum, check) => 
      sum + (check.responseTime || 0), 0
    ) / older.length;
    
    // Calculate health status distribution
    const recentHealthCounts = this.countHealthStatuses(recent);
    const olderHealthCounts = this.countHealthStatuses(older);
    
    // Determine trends
    let performanceTrend = 'stable';
    if (recentAvgResponse > olderAvgResponse * 1.2) {
      performanceTrend = 'degrading';
    } else if (recentAvgResponse < olderAvgResponse * 0.8) {
      performanceTrend = 'improving';
    }
    
    let healthTrend = 'stable';
    const recentHealthScore = this.calculateHealthScore(recentHealthCounts);
    const olderHealthScore = this.calculateHealthScore(olderHealthCounts);
    
    if (recentHealthScore < olderHealthScore * 0.9) {
      healthTrend = 'degrading';
    } else if (recentHealthScore > olderHealthScore * 1.1) {
      healthTrend = 'improving';
    }
    
    return {
      trend: {
        performance: performanceTrend,
        health: healthTrend
      },
      metrics: {
        recent: {
          avgResponseTime: Math.round(recentAvgResponse),
          healthScore: recentHealthScore,
          statusCounts: recentHealthCounts
        },
        older: {
          avgResponseTime: Math.round(olderAvgResponse),
          healthScore: olderHealthScore,
          statusCounts: olderHealthCounts
        }
      },
      analysis: {
        performanceChange: Math.round(((recentAvgResponse - olderAvgResponse) / olderAvgResponse) * 100),
        healthChange: Math.round(((recentHealthScore - olderHealthScore) / olderHealthScore) * 100)
      }
    };
  }

  /**
   * Count health statuses in a history array
   */
  countHealthStatuses(history) {
    const counts = {};
    for (const check of history) {
      counts[check.status] = (counts[check.status] || 0) + 1;
    }
    return counts;
  }

  /**
   * Calculate health score from status counts
   */
  calculateHealthScore(statusCounts) {
    const weights = {
      healthy: 100,
      degraded: 70,
      unhealthy: 40,
      critical: 0
    };
    
    let totalWeight = 0;
    let totalCount = 0;
    
    for (const [status, count] of Object.entries(statusCounts)) {
      totalWeight += (weights[status] || 0) * count;
      totalCount += count;
    }
    
    return totalCount > 0 ? Math.round(totalWeight / totalCount) : 0;
  }
}

// Export singleton instance
export default new AuthHealthController();
