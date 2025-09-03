// Authentication Performance Monitoring Service
// Manufacturing-optimized performance tracking and alerting system

import { sessionManager } from './sessionManager.js';
import { tokenRotationService } from './tokenRotationService.js';
import { manufacturingLogger } from '../middleware/logger.js';
import { getRedisClient, REDIS_KEYS, generateRedisKey } from '../config/redis.js';

/**
 * Authentication Performance Monitor
 * Tracks real-time metrics, performance, and alerts for authentication system
 */
class AuthPerformanceMonitor {
  constructor() {
    this.metrics = {
      loginAttempts: 0,
      successfulLogins: 0,
      failedLogins: 0,
      tokenRotations: 0,
      sessionCreations: 0,
      sessionTerminations: 0,
      suspiciousActivities: 0,
      rateLimitViolations: 0
    };
    
    this.performanceThresholds = {
      loginResponseTime: 1000, // 1 second
      tokenRotationTime: 500,  // 500ms
      sessionCreationTime: 300, // 300ms
      highFailureRate: 0.2,    // 20% failure rate
      highResponseTime: 2000    // 2 seconds
    };
    
    this.alertLevels = {
      INFO: 'info',
      WARNING: 'warning',
      CRITICAL: 'critical'
    };
    
    this.monitoringWindow = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Track authentication attempt with performance metrics
   */
  async trackAuthAttempt(attemptData) {
    const startTime = Date.now();
    const { username, ip, userAgent, attemptType = 'login' } = attemptData;
    
    try {
      // Increment attempt counter
      await this.incrementMetric('loginAttempts');
      
      // Track attempt details in Redis
      const attemptKey = generateRedisKey(REDIS_KEYS.AUDIT, `auth_attempt:${Date.now()}:${ip}`);
      const attemptRecord = {
        timestamp: new Date().toISOString(),
        username,
        ip,
        userAgent: userAgent?.substring(0, 100),
        attemptType,
        startTime: startTime
      };
      
      const redis = getRedisClient();
      await redis.setex(attemptKey, 3600, JSON.stringify(attemptRecord)); // 1 hour TTL
      
      return { startTime, attemptKey };
    } catch (error) {
      manufacturingLogger.error('Failed to track auth attempt', {
        error: error.message,
        username,
        ip,
        category: 'performance_monitoring'
      });
      return { startTime, attemptKey: null };
    }
  }

  /**
   * Record successful authentication with performance data
   */
  async recordSuccessfulAuth(attemptData, responseTime, userId, sessionId) {
    try {
      const { startTime, attemptKey } = attemptData;
      const totalResponseTime = Date.now() - startTime;
      
      // Update metrics
      await this.incrementMetric('successfulLogins');
      
      // Record performance data
      await this.recordPerformanceMetric('login', totalResponseTime);
      
      // Update attempt record with success data
      if (attemptKey) {
        const redis = getRedisClient();
        const attemptRecord = await redis.get(attemptKey);
        if (attemptRecord) {
          const updatedRecord = {
            ...JSON.parse(attemptRecord),
            success: true,
            responseTime: totalResponseTime,
            userId,
            sessionId,
            completedAt: new Date().toISOString()
          };
          await redis.setex(attemptKey, 3600, JSON.stringify(updatedRecord));
        }
      }
      
      // Check for performance alerts
      await this.checkPerformanceAlert('login', totalResponseTime);
      
      // Log success
      manufacturingLogger.info('Authentication performance recorded', {
        userId,
        sessionId,
        responseTime: totalResponseTime,
        ip: attemptData.ip,
        category: 'performance_monitoring'
      });
      
    } catch (error) {
      manufacturingLogger.error('Failed to record successful auth', {
        error: error.message,
        userId,
        category: 'performance_monitoring'
      });
    }
  }

  /**
   * Record failed authentication with error details
   */
  async recordFailedAuth(attemptData, error, responseTime) {
    try {
      const { startTime, attemptKey } = attemptData;
      const totalResponseTime = Date.now() - startTime;
      
      // Update metrics
      await this.incrementMetric('failedLogins');
      
      // Record performance data
      await this.recordPerformanceMetric('login', totalResponseTime);
      
      // Update attempt record with failure data
      if (attemptKey) {
        const redis = getRedisClient();
        const attemptRecord = await redis.get(attemptKey);
        if (attemptRecord) {
          const updatedRecord = {
            ...JSON.parse(attemptRecord),
            success: false,
            error: error.message,
            errorCode: error.code || 'unknown',
            responseTime: totalResponseTime,
            completedAt: new Date().toISOString()
          };
          await redis.setex(attemptKey, 3600, JSON.stringify(updatedRecord));
        }
      }
      
      // Check for failure rate alerts
      await this.checkFailureRateAlert();
      
      // Log failure
      manufacturingLogger.warn('Authentication failure recorded', {
        username: attemptData.username,
        ip: attemptData.ip,
        error: error.message,
        responseTime: totalResponseTime,
        category: 'performance_monitoring'
      });
      
    } catch (error) {
      manufacturingLogger.error('Failed to record failed auth', {
        error: error.message,
        category: 'performance_monitoring'
      });
    }
  }

  /**
   * Track token rotation performance
   */
  async trackTokenRotation(userId, oldSessionId, newSessionId, responseTime) {
    try {
      // Update metrics
      await this.incrementMetric('tokenRotations');
      
      // Record performance data
      await this.recordPerformanceMetric('tokenRotation', responseTime);
      
      // Store rotation record
      const rotationKey = generateRedisKey(REDIS_KEYS.AUDIT, `token_rotation:${Date.now()}:${userId}`);
      const rotationRecord = {
        timestamp: new Date().toISOString(),
        userId,
        oldSessionId,
        newSessionId,
        responseTime,
        type: 'rotation'
      };
      
      const redis = getRedisClient();
      await redis.setex(rotationKey, 3600, JSON.stringify(rotationRecord));
      
      // Check for performance alerts
      await this.checkPerformanceAlert('tokenRotation', responseTime);
      
      // Log rotation
      manufacturingLogger.info('Token rotation performance recorded', {
        userId,
        oldSessionId,
        newSessionId,
        responseTime,
        category: 'performance_monitoring'
      });
      
    } catch (error) {
      manufacturingLogger.error('Failed to track token rotation', {
        error: error.message,
        userId,
        category: 'performance_monitoring'
      });
    }
  }

  /**
   * Track session management performance
   */
  async trackSessionOperation(operation, userId, sessionId, responseTime, details = {}) {
    try {
      const metricKey = operation === 'create' ? 'sessionCreations' : 'sessionTerminations';
      
      // Update metrics
      await this.incrementMetric(metricKey);
      
      // Record performance data
      await this.recordPerformanceMetric(`session_${operation}`, responseTime);
      
      // Store operation record
      const operationKey = generateRedisKey(REDIS_KEYS.AUDIT, `session_${operation}:${Date.now()}:${sessionId}`);
      const operationRecord = {
        timestamp: new Date().toISOString(),
        operation,
        userId,
        sessionId,
        responseTime,
        details,
        type: 'session_operation'
      };
      
      const redis = getRedisClient();
      await redis.setex(operationKey, 3600, JSON.stringify(operationRecord));
      
      // Check for performance alerts
      await this.checkPerformanceAlert(`session_${operation}`, responseTime);
      
    } catch (error) {
      manufacturingLogger.error('Failed to track session operation', {
        error: error.message,
        operation,
        userId,
        category: 'performance_monitoring'
      });
    }
  }

  /**
   * Track suspicious activity and security events
   */
  async trackSecurityEvent(eventType, details) {
    try {
      // Update metrics
      await this.incrementMetric('suspiciousActivities');
      
      // Store security event
      const eventKey = generateRedisKey(REDIS_KEYS.AUDIT, `security_event:${Date.now()}:${eventType}`);
      const eventRecord = {
        timestamp: new Date().toISOString(),
        eventType,
        details,
        severity: this.calculateEventSeverity(eventType, details),
        type: 'security_event'
      };
      
      const redis = getRedisClient();
      await redis.setex(eventKey, 7200, JSON.stringify(eventRecord)); // 2 hours TTL
      
      // Check for security alerts
      await this.checkSecurityAlert(eventType, details);
      
      // Log security event
      manufacturingLogger.warn('Security event tracked', {
        eventType,
        details,
        severity: eventRecord.severity,
        category: 'performance_monitoring'
      });
      
    } catch (error) {
      manufacturingLogger.error('Failed to track security event', {
        error: error.message,
        eventType,
        category: 'performance_monitoring'
      });
    }
  }

  /**
   * Track rate limiting violations
   */
  async trackRateLimitViolation(ip, endpoint, count, limit) {
    try {
      // Update metrics
      await this.incrementMetric('rateLimitViolations');
      
      // Store violation record
      const violationKey = generateRedisKey(REDIS_KEYS.AUDIT, `rate_limit:${Date.now()}:${ip}`);
      const violationRecord = {
        timestamp: new Date().toISOString(),
        ip,
        endpoint,
        count,
        limit,
        type: 'rate_limit_violation'
      };
      
      const redis = getRedisClient();
      await redis.setex(violationKey, 3600, JSON.stringify(violationRecord));
      
      // Check for rate limiting alerts
      await this.checkRateLimitAlert(ip, endpoint, count, limit);
      
    } catch (error) {
      manufacturingLogger.error('Failed to track rate limit violation', {
        error: error.message,
        ip,
        endpoint,
        category: 'performance_monitoring'
      });
    }
  }

  /**
   * Record performance metric with timestamp
   */
  async recordPerformanceMetric(operation, responseTime) {
    try {
      const redis = getRedisClient();
      const metricKey = generateRedisKey(REDIS_KEYS.CACHE, `perf_metric:${operation}:${Date.now()}`);
      
      const metricData = {
        operation,
        responseTime,
        timestamp: new Date().toISOString()
      };
      
      // Store metric with 1 hour TTL
      await redis.setex(metricKey, 3600, JSON.stringify(metricData));
      
      // Update rolling average
      await this.updateRollingAverage(operation, responseTime);
      
    } catch (error) {
      manufacturingLogger.error('Failed to record performance metric', {
        error: error.message,
        operation,
        responseTime,
        category: 'performance_monitoring'
      });
    }
  }

  /**
   * Update rolling average for performance metrics
   */
  async updateRollingAverage(operation, responseTime) {
    try {
      const redis = getRedisClient();
      const avgKey = generateRedisKey(REDIS_KEYS.CACHE, `perf_avg:${operation}`);
      
      // Get current average
      const currentAvg = await redis.get(avgKey);
      let avg = currentAvg ? parseFloat(currentAvg) : 0;
      let count = 1;
      
      // Get count
      const countKey = generateRedisKey(REDIS_KEYS.CACHE, `perf_count:${operation}`);
      const currentCount = await redis.get(countKey);
      if (currentCount) {
        count = parseInt(currentCount) + 1;
      }
      
      // Calculate new average
      avg = ((avg * (count - 1)) + responseTime) / count;
      
      // Store updated values
      await redis.setex(avgKey, 3600, avg.toString());
      await redis.setex(countKey, 3600, count.toString());
      
    } catch (error) {
      manufacturingLogger.error('Failed to update rolling average', {
        error: error.message,
        operation,
        category: 'performance_monitoring'
      });
    }
  }

  /**
   * Check for performance alerts
   */
  async checkPerformanceAlert(operation, responseTime) {
    try {
      const threshold = this.performanceThresholds[`${operation}ResponseTime`] || 
                       this.performanceThresholds.highResponseTime;
      
      if (responseTime > threshold) {
        await this.createAlert(
          this.alertLevels.WARNING,
          'performance',
          `${operation} response time exceeded threshold`,
          {
            operation,
            responseTime,
            threshold,
            timestamp: new Date().toISOString()
          }
        );
      }
    } catch (error) {
      manufacturingLogger.error('Failed to check performance alert', {
        error: error.message,
        operation,
        category: 'performance_monitoring'
      });
    }
  }

  /**
   * Check for failure rate alerts
   */
  async checkFailureRateAlert() {
    try {
      const totalAttempts = this.metrics.loginAttempts;
      const failures = this.metrics.failedLogins;
      
      if (totalAttempts > 10) { // Only check after minimum attempts
        const failureRate = failures / totalAttempts;
        
        if (failureRate > this.performanceThresholds.highFailureRate) {
          await this.createAlert(
            this.alertLevels.CRITICAL,
            'security',
            'High authentication failure rate detected',
            {
              failureRate: failureRate.toFixed(3),
              totalAttempts,
              failures,
              threshold: this.performanceThresholds.highFailureRate,
              timestamp: new Date().toISOString()
            }
          );
        }
      }
    } catch (error) {
      manufacturingLogger.error('Failed to check failure rate alert', {
        error: error.message,
        category: 'performance_monitoring'
      });
    }
  }

  /**
   * Check for security alerts
   */
  async checkSecurityAlert(eventType, details) {
    try {
      let severity = this.alertLevels.INFO;
      let message = `Security event: ${eventType}`;
      
      // Determine severity based on event type
      if (eventType === 'multiple_failed_logins' || eventType === 'suspicious_ip') {
        severity = this.alertLevels.WARNING;
        message = `Suspicious activity detected: ${eventType}`;
      } else if (eventType === 'brute_force_attempt' || eventType === 'account_lockout') {
        severity = this.alertLevels.CRITICAL;
        message = `Critical security threat: ${eventType}`;
      }
      
      await this.createAlert(severity, 'security', message, {
        eventType,
        details,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      manufacturingLogger.error('Failed to check security alert', {
        error: error.message,
        eventType,
        category: 'performance_monitoring'
      });
    }
  }

  /**
   * Check for rate limiting alerts
   */
  async checkRateLimitAlert(ip, endpoint, count, limit) {
    try {
      if (count > limit * 2) { // Alert if significantly over limit
        await this.createAlert(
          this.alertLevels.WARNING,
          'rate_limiting',
          'Excessive rate limiting violations detected',
          {
            ip,
            endpoint,
            count,
            limit,
            timestamp: new Date().toISOString()
          }
        );
      }
    } catch (error) {
      manufacturingLogger.error('Failed to check rate limit alert', {
        error: error.message,
        ip,
        category: 'performance_monitoring'
      });
    }
  }

  /**
   * Create and store alert
   */
  async createAlert(level, category, message, details) {
    try {
      const redis = getRedisClient();
      const alertKey = generateRedisKey(REDIS_KEYS.AUDIT, `alert:${Date.now()}:${level}`);
      
      const alert = {
        id: Date.now(),
        level,
        category,
        message,
        details,
        timestamp: new Date().toISOString(),
        acknowledged: false,
        type: 'alert'
      };
      
      // Store alert with 24 hour TTL
      await redis.setex(alertKey, 86400, JSON.stringify(alert));
      
      // Log alert
      const logLevel = level === this.alertLevels.CRITICAL ? 'error' : 
                      level === this.alertLevels.WARNING ? 'warn' : 'info';
      
      manufacturingLogger[logLevel](`Performance Alert [${level.toUpperCase()}]: ${message}`, {
        alert,
        category: 'performance_monitoring'
      });
      
    } catch (error) {
      manufacturingLogger.error('Failed to create alert', {
        error: error.message,
        level,
        message,
        category: 'performance_monitoring'
      });
    }
  }

  /**
   * Calculate event severity
   */
  calculateEventSeverity(eventType, details) {
    const criticalEvents = ['brute_force_attempt', 'account_lockout', 'suspicious_device_change'];
    const warningEvents = ['multiple_failed_logins', 'suspicious_ip', 'unusual_time_pattern'];
    
    if (criticalEvents.includes(eventType)) {
      return this.alertLevels.CRITICAL;
    } else if (warningEvents.includes(eventType)) {
      return this.alertLevels.WARNING;
    }
    
    return this.alertLevels.INFO;
  }

  /**
   * Get real-time performance metrics
   */
  async getPerformanceMetrics() {
    try {
      const redis = getRedisClient();
      
      // Get current metrics
      const currentMetrics = { ...this.metrics };
      
      // Get performance averages
      const operations = ['login', 'tokenRotation', 'session_create', 'session_termination'];
      const performanceData = {};
      
      for (const operation of operations) {
        const avgKey = generateRedisKey(REDIS_KEYS.CACHE, `perf_avg:${operation}`);
        const countKey = generateRedisKey(REDIS_KEYS.CACHE, `perf_count:${operation}`);
        
        const [avg, count] = await Promise.all([
          redis.get(avgKey),
          redis.get(countKey)
        ]);
        
        performanceData[operation] = {
          averageResponseTime: avg ? parseFloat(avg) : 0,
          totalOperations: count ? parseInt(count) : 0
        };
      }
      
      // Calculate success rate
      const totalAttempts = currentMetrics.loginAttempts;
      const successRate = totalAttempts > 0 ? 
        (currentMetrics.successfulLogins / totalAttempts) : 0;
      
      return {
        timestamp: new Date().toISOString(),
        metrics: currentMetrics,
        performance: performanceData,
        successRate: successRate.toFixed(3),
        monitoringWindow: this.monitoringWindow
      };
      
    } catch (error) {
      manufacturingLogger.error('Failed to get performance metrics', {
        error: error.message,
        category: 'performance_monitoring'
      });
      return null;
    }
  }

  /**
   * Get recent alerts
   */
  async getRecentAlerts(limit = 50) {
    try {
      const redis = getRedisClient();
      const alertKeys = await redis.keys(generateRedisKey(REDIS_KEYS.AUDIT, 'alert:*'));
      
      // Sort by timestamp (newest first) and limit
      const sortedKeys = alertKeys
        .sort((a, b) => {
          const timestampA = parseInt(a.split(':')[1]);
          const timestampB = parseInt(b.split(':')[1]);
          return timestampB - timestampA;
        })
        .slice(0, limit);
      
      const alerts = [];
      for (const key of sortedKeys) {
        const alertData = await redis.get(key);
        if (alertData) {
          alerts.push(JSON.parse(alertData));
        }
      }
      
      return alerts;
      
    } catch (error) {
      manufacturingLogger.error('Failed to get recent alerts', {
        error: error.message,
        category: 'performance_monitoring'
      });
      return [];
    }
  }

  /**
   * Get performance trends
   */
  async getPerformanceTrends(windowMinutes = 60) {
    try {
      const redis = getRedisClient();
      const cutoffTime = Date.now() - (windowMinutes * 60 * 1000);
      
      // Get performance metrics within window
      const metricKeys = await redis.keys(generateRedisKey(REDIS_KEYS.CACHE, 'perf_metric:*'));
      const recentMetrics = [];
      
      for (const key of metricKeys) {
        const metricData = await redis.get(key);
        if (metricData) {
          const metric = JSON.parse(metricData);
          const timestamp = new Date(metric.timestamp).getTime();
          
          if (timestamp > cutoffTime) {
            recentMetrics.push(metric);
          }
        }
      }
      
      // Group by operation and calculate trends
      const trends = {};
      const operations = ['login', 'tokenRotation', 'session_create', 'session_termination'];
      
      for (const operation of operations) {
        const operationMetrics = recentMetrics.filter(m => m.operation === operation);
        
        if (operationMetrics.length > 0) {
          const responseTimes = operationMetrics.map(m => m.responseTime);
          trends[operation] = {
            count: operationMetrics.length,
            averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
            minResponseTime: Math.min(...responseTimes),
            maxResponseTime: Math.max(...responseTimes),
            trend: this.calculateTrend(responseTimes)
          };
        }
      }
      
      return {
        windowMinutes,
        timestamp: new Date().toISOString(),
        trends
      };
      
    } catch (error) {
      manufacturingLogger.error('Failed to get performance trends', {
        error: error.message,
        category: 'performance_monitoring'
      });
      return null;
    }
  }

  /**
   * Calculate trend direction
   */
  calculateTrend(values) {
    if (values.length < 2) return 'stable';
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    if (change > 10) return 'improving';
    if (change < -10) return 'degrading';
    return 'stable';
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId) {
    try {
      const redis = getRedisClient();
      const alertKeys = await redis.keys(generateRedisKey(REDIS_KEYS.AUDIT, 'alert:*'));
      
      for (const key of alertKeys) {
        const alertData = await redis.get(key);
        if (alertData) {
          const alert = JSON.parse(alertData);
          if (alert.id === alertId) {
            alert.acknowledged = true;
            alert.acknowledgedAt = new Date().toISOString();
            await redis.setex(key, 86400, JSON.stringify(alert));
            return true;
          }
        }
      }
      
      return false;
      
    } catch (error) {
      manufacturingLogger.error('Failed to acknowledge alert', {
        error: error.message,
        alertId,
        category: 'performance_monitoring'
      });
      return false;
    }
  }

  /**
   * Reset metrics (for testing or maintenance)
   */
  async resetMetrics() {
    try {
      this.metrics = {
        loginAttempts: 0,
        successfulLogins: 0,
        failedLogins: 0,
        tokenRotations: 0,
        sessionCreations: 0,
        sessionTerminations: 0,
        suspiciousActivities: 0,
        rateLimitViolations: 0
      };
      
      manufacturingLogger.info('Performance metrics reset', {
        category: 'performance_monitoring'
      });
      
    } catch (error) {
      manufacturingLogger.error('Failed to reset metrics', {
        error: error.message,
        category: 'performance_monitoring'
      });
    }
  }

  /**
   * Increment metric counter
   */
  async incrementMetric(metricName) {
    if (this.metrics.hasOwnProperty(metricName)) {
      this.metrics[metricName]++;
    }
  }
}

// Export singleton instance
export const authPerformanceMonitor = new AuthPerformanceMonitor();
export default authPerformanceMonitor;
