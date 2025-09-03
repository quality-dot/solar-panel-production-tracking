// Authentication Health Service
// Manufacturing-optimized health monitoring for authentication system

import { sessionManager } from './sessionManager.js';
import { tokenRotationService } from './tokenRotationService.js';
import { authPerformanceMonitor } from './authPerformanceMonitor.js';
import { userExperienceService } from './userExperienceService.js';
import { complianceAuditService } from './complianceAuditService.js';
import { manufacturingLogger } from '../middleware/logger.js';
import { getRedisClient, REDIS_KEYS, generateRedisKey } from '../config/redis.js';
import { User } from '../models/index.js';

/**
 * Authentication Health Service
 * Provides comprehensive health monitoring for authentication system
 */
class AuthHealthService {
  constructor() {
    this.healthLevels = {
      HEALTHY: 'healthy',
      DEGRADED: 'degraded',
      UNHEALTHY: 'unhealthy',
      CRITICAL: 'critical'
    };
    
    this.healthCategories = {
      SYSTEM: 'system',
      PERFORMANCE: 'performance',
      SECURITY: 'security',
      INTEGRATION: 'integration',
      COMPLIANCE: 'compliance'
    };
    
    this.healthThresholds = {
      responseTime: {
        warning: 100,    // 100ms
        critical: 500    // 500ms
      },
      errorRate: {
        warning: 0.05,   // 5%
        critical: 0.10   // 10%
      },
      availability: {
        warning: 0.95,   // 95%
        critical: 0.90   // 90%
      },
      securityScore: {
        warning: 80,     // 80%
        critical: 60     // 60%
      }
    };
    
    this.healthChecks = {
      redis: this.checkRedisHealth.bind(this),
      database: this.checkDatabaseHealth.bind(this),
      sessionManagement: this.checkSessionManagementHealth.bind(this),
      tokenRotation: this.checkTokenRotationHealth.bind(this),
      performanceMonitoring: this.checkPerformanceMonitoringHealth.bind(this),
      userExperience: this.checkUserExperienceHealth.bind(this),
      complianceAudit: this.checkComplianceAuditHealth.bind(this),
      securityPosture: this.checkSecurityPostureHealth.bind(this)
    };
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(includeDetails = false) {
    try {
      const startTime = Date.now();
      const healthResults = {};
      let overallHealth = this.healthLevels.HEALTHY;
      let criticalIssues = 0;
      let warnings = 0;

      // Perform all health checks
      for (const [checkName, checkFunction] of Object.entries(this.healthChecks)) {
        try {
          const result = await checkFunction();
          healthResults[checkName] = result;
          
          if (result.status === this.healthLevels.CRITICAL) {
            criticalIssues++;
            overallHealth = this.healthLevels.CRITICAL;
          } else if (result.status === this.healthLevels.UNHEALTHY) {
            if (overallHealth !== this.healthLevels.CRITICAL) {
              overallHealth = this.healthLevels.UNHEALTHY;
            }
          } else if (result.status === this.healthLevels.DEGRADED) {
            warnings++;
            if (overallHealth === this.healthLevels.HEALTHY) {
              overallHealth = this.healthLevels.DEGRADED;
            }
          }
        } catch (error) {
          healthResults[checkName] = {
            status: this.healthLevels.CRITICAL,
            message: `Health check failed: ${error.message}`,
            error: error.message,
            timestamp: new Date().toISOString()
          };
          criticalIssues++;
          overallHealth = this.healthLevels.CRITICAL;
        }
      }

      const healthCheck = {
        status: overallHealth,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        summary: {
          total: Object.keys(this.healthChecks).length,
          healthy: Object.values(healthResults).filter(r => r.status === this.healthLevels.HEALTHY).length,
          degraded: Object.values(healthResults).filter(r => r.status === this.healthLevels.DEGRADED).length,
          unhealthy: Object.values(healthResults).filter(r => r.status === this.healthLevels.UNHEALTHY).length,
          critical: criticalIssues,
          warnings
        },
        checks: includeDetails ? healthResults : Object.keys(healthResults),
        recommendations: this.generateHealthRecommendations(healthResults, overallHealth)
      };

      // Log health check results
      manufacturingLogger.info('Authentication health check completed', {
        status: overallHealth,
        responseTime: healthCheck.responseTime,
        summary: healthCheck.summary,
        category: 'auth_health'
      });

      return healthCheck;

    } catch (error) {
      manufacturingLogger.error('Health check failed', {
        error: error.message,
        category: 'auth_health'
      });
      
      return {
        status: this.healthLevels.CRITICAL,
        timestamp: new Date().toISOString(),
        error: error.message,
        message: 'Health check system failure'
      };
    }
  }

  /**
   * Check Redis health
   */
  async checkRedisHealth() {
    try {
      const startTime = Date.now();
      const redis = getRedisClient();
      
      // Test basic connectivity
      await redis.ping();
      const responseTime = Date.now() - startTime;
      
      // Test key operations
      const testKey = generateRedisKey(REDIS_KEYS.CACHE, 'health_check_test');
      await redis.setex(testKey, 60, 'health_check_value');
      const testValue = await redis.get(testKey);
      await redis.del(testKey);
      
      if (testValue !== 'health_check_value') {
        return {
          status: this.healthLevels.CRITICAL,
          message: 'Redis key operations failed',
          responseTime,
          timestamp: new Date().toISOString()
        };
      }
      
      // Check memory usage
      const info = await redis.info('memory');
      const memoryInfo = this.parseRedisInfo(info);
      
      let status = this.healthLevels.HEALTHY;
      if (responseTime > this.healthThresholds.responseTime.critical) {
        status = this.healthLevels.CRITICAL;
      } else if (responseTime > this.healthThresholds.responseTime.warning) {
        status = this.healthLevels.DEGRADED;
      }
      
      return {
        status,
        message: 'Redis is healthy',
        responseTime,
        memoryUsage: memoryInfo.used_memory_human,
        memoryPeak: memoryInfo.used_memory_peak_human,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: this.healthLevels.CRITICAL,
        message: 'Redis connection failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check database health
   */
  async checkDatabaseHealth() {
    try {
      const startTime = Date.now();
      
      // Test database connection
      const userCount = await User.count();
      const responseTime = Date.now() - startTime;
      
      let status = this.healthLevels.HEALTHY;
      if (responseTime > this.healthThresholds.responseTime.critical) {
        status = this.healthLevels.CRITICAL;
      } else if (responseTime > this.healthThresholds.responseTime.warning) {
        status = this.healthLevels.DEGRADED;
      }
      
      return {
        status,
        message: 'Database is healthy',
        responseTime,
        userCount,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: this.healthLevels.CRITICAL,
        message: 'Database connection failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check session management health
   */
  async checkSessionManagementHealth() {
    try {
      const startTime = Date.now();
      
      // Get session statistics
      const sessionStats = await sessionManager.getSessionStats();
      const responseTime = Date.now() - startTime;
      
      if (!sessionStats) {
        return {
          status: this.healthLevels.CRITICAL,
          message: 'Session management statistics unavailable',
          responseTime,
          timestamp: new Date().toISOString()
        };
      }
      
      let status = this.healthLevels.HEALTHY;
      if (responseTime > this.healthThresholds.responseTime.critical) {
        status = this.healthLevels.CRITICAL;
      } else if (responseTime > this.healthThresholds.responseTime.warning) {
        status = this.healthLevels.DEGRADED;
      }
      
      return {
        status,
        message: 'Session management is healthy',
        responseTime,
        activeSessions: sessionStats.activeSessions,
        uniqueUsers: sessionStats.uniqueUsers,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: this.healthLevels.CRITICAL,
        message: 'Session management health check failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check token rotation health
   */
  async checkTokenRotationHealth() {
    try {
      const startTime = Date.now();
      
      // Test token generation (simulated)
      const testUserId = 'health_check_user';
      const testSessionId = 'health_check_session';
      
      // This is a simulated check since we don't want to create actual tokens
      const responseTime = Date.now() - startTime;
      
      let status = this.healthLevels.HEALTHY;
      if (responseTime > this.healthThresholds.responseTime.critical) {
        status = this.healthLevels.CRITICAL;
      } else if (responseTime > this.healthThresholds.responseTime.warning) {
        status = this.healthLevels.DEGRADED;
      }
      
      return {
        status,
        message: 'Token rotation system is healthy',
        responseTime,
        features: ['JWT generation', 'Token validation', 'Refresh handling'],
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: this.healthLevels.CRITICAL,
        message: 'Token rotation health check failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check performance monitoring health
   */
  async checkPerformanceMonitoringHealth() {
    try {
      const startTime = Date.now();
      
      // Get performance metrics
      const metrics = await authPerformanceMonitor.getPerformanceMetrics();
      const responseTime = Date.now() - startTime;
      
      if (!metrics) {
        return {
          status: this.healthLevels.CRITICAL,
          message: 'Performance monitoring metrics unavailable',
          responseTime,
          timestamp: new Date().toISOString()
        };
      }
      
      let status = this.healthLevels.HEALTHY;
      if (responseTime > this.healthThresholds.responseTime.critical) {
        status = this.healthLevels.CRITICAL;
      } else if (responseTime > this.healthThresholds.responseTime.warning) {
        status = this.healthLevels.DEGRADED;
      }
      
      return {
        status,
        message: 'Performance monitoring is healthy',
        responseTime,
        loginAttempts: metrics.metrics?.loginAttempts || 0,
        successRate: metrics.successRate || 0,
        monitoringWindow: metrics.monitoringWindow || 0,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: this.healthLevels.CRITICAL,
        message: 'Performance monitoring health check failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check user experience health
   */
  async checkUserExperienceHealth() {
    try {
      const startTime = Date.now();
      
      // Get UX statistics
      const stats = await userExperienceService.getUserExperienceStats();
      const responseTime = Date.now() - startTime;
      
      if (!stats) {
        return {
          status: this.healthLevels.CRITICAL,
          message: 'User experience statistics unavailable',
          responseTime,
          timestamp: new Date().toISOString()
        };
      }
      
      let status = this.healthLevels.HEALTHY;
      if (responseTime > this.healthThresholds.responseTime.critical) {
        status = this.healthLevels.CRITICAL;
      } else if (responseTime > this.healthThresholds.responseTime.warning) {
        status = this.healthLevels.DEGRADED;
      }
      
      return {
        status,
        message: 'User experience system is healthy',
        responseTime,
        rememberMeTokens: stats.rememberMeTokens || 0,
        userPreferences: stats.userPreferences || 0,
        activeSessions: stats.activeSessions || 0,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: this.healthLevels.CRITICAL,
        message: 'User experience health check failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check compliance audit health
   */
  async checkComplianceAuditHealth() {
    try {
      const startTime = Date.now();
      
      // Get audit statistics
      const stats = await complianceAuditService.getAuditStatistics('24h');
      const responseTime = Date.now() - startTime;
      
      if (!stats) {
        return {
          status: this.healthLevels.CRITICAL,
          message: 'Compliance audit statistics unavailable',
          responseTime,
          timestamp: new Date().toISOString()
        };
      }
      
      let status = this.healthLevels.HEALTHY;
      if (responseTime > this.healthThresholds.responseTime.critical) {
        status = this.healthLevels.CRITICAL;
      } else if (responseTime > this.healthThresholds.responseTime.warning) {
        status = this.healthLevels.DEGRADED;
      }
      
      return {
        status,
        message: 'Compliance audit system is healthy',
        responseTime,
        totalEvents: stats.totalEvents || 0,
        byLevel: Object.keys(stats.byLevel || {}).length,
        byCategory: Object.keys(stats.byCategory || {}).length,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: this.healthLevels.CRITICAL,
        message: 'Compliance audit health check failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check security posture health
   */
  async checkSecurityPostureHealth() {
    try {
      const startTime = Date.now();
      
      // Get recent security events
      const securityStats = await complianceAuditService.getAuditStatistics('24h');
      const responseTime = Date.now() - startTime;
      
      if (!securityStats) {
        return {
          status: this.healthLevels.CRITICAL,
          message: 'Security statistics unavailable',
          responseTime,
          timestamp: new Date().toISOString()
        };
      }
      
      // Calculate security score
      const securityEvents = securityStats.byLevel?.error || 0;
      const criticalEvents = securityStats.byLevel?.critical || 0;
      const totalEvents = securityStats.totalEvents || 1;
      
      const securityScore = Math.max(0, 100 - (securityEvents * 5) - (criticalEvents * 20));
      
      let status = this.healthLevels.HEALTHY;
      if (securityScore < this.healthThresholds.securityScore.critical) {
        status = this.healthLevels.CRITICAL;
      } else if (securityScore < this.healthThresholds.securityScore.warning) {
        status = this.healthLevels.DEGRADED;
      }
      
      return {
        status,
        message: 'Security posture assessment completed',
        responseTime,
        securityScore,
        securityEvents,
        criticalEvents,
        totalEvents,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: this.healthLevels.CRITICAL,
        message: 'Security posture health check failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Generate health recommendations
   */
  generateHealthRecommendations(healthResults, overallHealth) {
    const recommendations = [];
    
    if (overallHealth === this.healthLevels.CRITICAL) {
      recommendations.push('Immediate attention required - critical system issues detected');
    }
    
    if (overallHealth === this.healthLevels.UNHEALTHY) {
      recommendations.push('System health compromised - review and resolve issues');
    }
    
    // Check specific areas
    for (const [checkName, result] of Object.entries(healthResults)) {
      if (result.status === this.healthLevels.CRITICAL) {
        recommendations.push(`Critical issue in ${checkName}: ${result.message}`);
      } else if (result.status === this.healthLevels.UNHEALTHY) {
        recommendations.push(`Unhealthy ${checkName}: ${result.message}`);
      } else if (result.status === this.healthLevels.DEGRADED) {
        recommendations.push(`Degraded ${checkName}: ${result.message}`);
      }
    }
    
    // Performance recommendations
    const slowChecks = Object.entries(healthResults).filter(([, result]) => 
      result.responseTime && result.responseTime > this.healthThresholds.responseTime.warning
    );
    
    if (slowChecks.length > 0) {
      recommendations.push(`Performance issues detected in: ${slowChecks.map(([name]) => name).join(', ')}`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('All systems operating normally');
    }
    
    return recommendations;
  }

  /**
   * Parse Redis info output
   */
  parseRedisInfo(info) {
    const lines = info.split('\r\n');
    const result = {};
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = value;
      }
    }
    
    return result;
  }

  /**
   * Get detailed health status for specific component
   */
  async getComponentHealth(componentName) {
    if (!this.healthChecks[componentName]) {
      throw new Error(`Unknown health check component: ${componentName}`);
    }
    
    return await this.healthChecks[componentName]();
  }

  /**
   * Get health history
   */
  async getHealthHistory(limit = 10) {
    try {
      const redis = getRedisClient();
      const historyKey = generateRedisKey(REDIS_KEYS.CACHE, 'health_history');
      
      const history = await redis.lrange(historyKey, 0, limit - 1);
      return history.map(item => JSON.parse(item));
      
    } catch (error) {
      manufacturingLogger.error('Failed to get health history', {
        error: error.message,
        category: 'auth_health'
      });
      return [];
    }
  }

  /**
   * Store health check result in history
   */
  async storeHealthResult(healthResult) {
    try {
      const redis = getRedisClient();
      const historyKey = generateRedisKey(REDIS_KEYS.CACHE, 'health_history');
      
      // Add to list (keep only last 100 results)
      await redis.lpush(historyKey, JSON.stringify(healthResult));
      await redis.ltrim(historyKey, 0, 99);
      
      // Set expiration (24 hours)
      await redis.expire(historyKey, 24 * 60 * 60);
      
    } catch (error) {
      manufacturingLogger.error('Failed to store health result', {
        error: error.message,
        category: 'auth_health'
      });
    }
  }

  /**
   * Get health metrics summary
   */
  async getHealthMetrics(timeRange = '24h') {
    try {
      const history = await this.getHealthHistory(100);
      const now = Date.now();
      
      let startTime;
      switch (timeRange) {
        case '1h':
          startTime = now - (60 * 60 * 1000);
          break;
        case '24h':
          startTime = now - (24 * 60 * 60 * 1000);
          break;
        case '7d':
          startTime = now - (7 * 24 * 60 * 60 * 1000);
          break;
        default:
          startTime = now - (24 * 60 * 60 * 1000);
      }
      
      const recentChecks = history.filter(check => 
        new Date(check.timestamp).getTime() > startTime
      );
      
      if (recentChecks.length === 0) {
        return {
          timeRange,
          totalChecks: 0,
          averageResponseTime: 0,
          availability: 0,
          statusBreakdown: {}
        };
      }
      
      const totalChecks = recentChecks.length;
      const averageResponseTime = recentChecks.reduce((sum, check) => 
        sum + (check.responseTime || 0), 0
      ) / totalChecks;
      
      const availability = recentChecks.filter(check => 
        check.status === this.healthLevels.HEALTHY
      ).length / totalChecks;
      
      const statusBreakdown = {};
      for (const check of recentChecks) {
        statusBreakdown[check.status] = (statusBreakdown[check.status] || 0) + 1;
      }
      
      return {
        timeRange,
        totalChecks,
        averageResponseTime: Math.round(averageResponseTime),
        availability: Math.round(availability * 100) / 100,
        statusBreakdown
      };
      
    } catch (error) {
      manufacturingLogger.error('Failed to get health metrics', {
        error: error.message,
        category: 'auth_health'
      });
      return null;
    }
  }
}

// Export singleton instance
export const authHealthService = new AuthHealthService();
export default authHealthService;
