// Anomaly Detection and Security Intelligence Controller
// Manufacturing-optimized threat detection API endpoints

import { anomalyDetectionService } from '../../services/anomalyDetectionService.js';
import { manufacturingLogger } from '../../middleware/logger.js';
import {
  successResponse,
  errorResponse,
  validationError
} from '../../utils/responseHelpers.js';

/**
 * Anomaly Detection and Security Intelligence Controller
 * Provides API endpoints for threat detection and behavioral analysis
 */
class AnomalyDetectionController {
  /**
   * Analyze authentication attempt for anomalies
   */
  async analyzeAuthentication(req, res) {
    try {
      const {
        userId,
        username,
        ip,
        userAgent,
        timestamp,
        success,
        failureReason,
        location,
        deviceFingerprint
      } = req.body;
      
      // Validate required fields
      if (!userId || !username || !ip || !userAgent || !timestamp) {
        return validationError(res, 'Missing required fields: userId, username, ip, userAgent, timestamp');
      }
      
      // Validate timestamp format
      if (isNaN(new Date(timestamp).getTime())) {
        return validationError(res, 'Invalid timestamp format');
      }
      
      // Validate location format if provided
      if (location && (!location.lat || !location.lng)) {
        return validationError(res, 'Invalid location format. Must include lat and lng coordinates');
      }
      
      const authData = {
        userId,
        username,
        ip,
        userAgent,
        timestamp,
        success: success !== undefined ? success : true,
        failureReason,
        location,
        deviceFingerprint
      };
      
      const analysisResult = await anomalyDetectionService.analyzeAuthenticationAttempt(authData);
      
      return successResponse(res, {
        message: 'Authentication anomaly analysis completed',
        data: analysisResult
      });

    } catch (error) {
      manufacturingLogger.error('Authentication anomaly analysis failed', {
        error: error.message,
        body: req.body,
        category: 'anomaly_detection'
      });
      
      return errorResponse(res, 'Failed to analyze authentication attempt', 500);
    }
  }

  /**
   * Get anomaly statistics
   */
  async getAnomalyStatistics(req, res) {
    try {
      const { timeRange = '24h' } = req.query;
      
      // Validate time range
      const validTimeRanges = ['1h', '24h', '7d'];
      if (!validTimeRanges.includes(timeRange)) {
        return validationError(res, `Invalid time range. Must be one of: ${validTimeRanges.join(', ')}`);
      }
      
      const statistics = await anomalyDetectionService.getAnomalyStatistics(timeRange);
      
      if (!statistics) {
        return errorResponse(res, 'Failed to retrieve anomaly statistics', 500);
      }
      
      return successResponse(res, {
        message: 'Anomaly statistics retrieved successfully',
        data: {
          timeRange,
          ...statistics
        }
      });

    } catch (error) {
      manufacturingLogger.error('Failed to get anomaly statistics', {
        error: error.message,
        timeRange: req.query.timeRange,
        category: 'anomaly_detection'
      });
      
      return errorResponse(res, 'Failed to retrieve anomaly statistics', 500);
    }
  }

  /**
   * Get user anomaly history
   */
  async getUserAnomalyHistory(req, res) {
    try {
      const { userId } = req.params;
      const { limit = 10 } = req.query;
      
      if (!userId) {
        return validationError(res, 'User ID is required');
      }
      
      const limitNum = parseInt(limit, 10);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return validationError(res, 'Limit must be a number between 1 and 100');
      }
      
      const history = await anomalyDetectionService.getUserAnomalyHistory(userId, limitNum);
      
      return successResponse(res, {
        message: 'User anomaly history retrieved successfully',
        data: {
          userId,
          history,
          count: history.length,
          limit: limitNum
        }
      });

    } catch (error) {
      manufacturingLogger.error('Failed to get user anomaly history', {
        error: error.message,
        userId: req.params.userId,
        category: 'anomaly_detection'
      });
      
      return errorResponse(res, 'Failed to retrieve user anomaly history', 500);
    }
  }

  /**
   * Get anomaly detection configuration
   */
  async getAnomalyConfig(req, res) {
    try {
      const config = {
        anomalyTypes: anomalyDetectionService.anomalyTypes,
        threatLevels: anomalyDetectionService.threatLevels,
        detectionMethods: anomalyDetectionService.detectionMethods,
        thresholds: anomalyDetectionService.thresholds,
        description: 'Anomaly detection and security intelligence configuration'
      };
      
      return successResponse(res, {
        message: 'Anomaly detection configuration retrieved successfully',
        data: config
      });

    } catch (error) {
      manufacturingLogger.error('Failed to get anomaly detection configuration', {
        error: error.message,
        category: 'anomaly_detection'
      });
      
      return errorResponse(res, 'Failed to retrieve anomaly detection configuration', 500);
    }
  }

  /**
   * Get security intelligence status
   */
  async getSecurityIntelligenceStatus(req, res) {
    try {
      const status = {
        lastUpdate: anomalyDetectionService.threatIntelligence.lastUpdate,
        threatFeeds: anomalyDetectionService.threatIntelligence.threatFeeds,
        ipBlacklistCount: anomalyDetectionService.threatIntelligence.ipBlacklist.size,
        knownThreatsCount: anomalyDetectionService.threatIntelligence.knownThreats.size,
        status: 'operational',
        version: '2.2.0'
      };
      
      return successResponse(res, {
        message: 'Security intelligence status retrieved successfully',
        data: status
      });

    } catch (error) {
      manufacturingLogger.error('Failed to get security intelligence status', {
        error: error.message,
        category: 'anomaly_detection'
      });
      
      return errorResponse(res, 'Failed to retrieve security intelligence status', 500);
    }
  }

  /**
   * Update threat intelligence
   */
  async updateThreatIntelligence(req, res) {
    try {
      await anomalyDetectionService.updateThreatIntelligence();
      
      return successResponse(res, {
        message: 'Threat intelligence updated successfully',
        data: {
          updated: true,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      manufacturingLogger.error('Failed to update threat intelligence', {
        error: error.message,
        category: 'anomaly_detection'
      });
      
      return errorResponse(res, 'Failed to update threat intelligence', 500);
    }
  }

  /**
   * Get anomaly detection dashboard
   */
  async getAnomalyDashboard(req, res) {
    try {
      // Get statistics for different time ranges
      const [hourlyStats, dailyStats, weeklyStats] = await Promise.all([
        anomalyDetectionService.getAnomalyStatistics('1h'),
        anomalyDetectionService.getAnomalyStatistics('24h'),
        anomalyDetectionService.getAnomalyStatistics('7d')
      ]);
      
      // Get security intelligence status
      const securityStatus = {
        lastUpdate: anomalyDetectionService.threatIntelligence.lastUpdate,
        threatFeeds: anomalyDetectionService.threatIntelligence.threatFeeds,
        ipBlacklistCount: anomalyDetectionService.threatIntelligence.ipBlacklist.size,
        knownThreatsCount: anomalyDetectionService.threatIntelligence.knownThreats.size
      };
      
      const dashboard = {
        statistics: {
          hourly: hourlyStats,
          daily: dailyStats,
          weekly: weeklyStats
        },
        securityIntelligence: securityStatus,
        threatLevels: anomalyDetectionService.threatLevels,
        anomalyTypes: anomalyDetectionService.anomalyTypes,
        timestamp: new Date().toISOString()
      };
      
      return successResponse(res, {
        message: 'Anomaly detection dashboard retrieved successfully',
        data: dashboard
      });

    } catch (error) {
      manufacturingLogger.error('Failed to get anomaly detection dashboard', {
        error: error.message,
        category: 'anomaly_detection'
      });
      
      return errorResponse(res, 'Failed to retrieve anomaly detection dashboard', 500);
    }
  }

  /**
   * Get real-time threat feed
   */
  async getThreatFeed(req, res) {
    try {
      const { limit = 20 } = req.query;
      const limitNum = parseInt(limit, 10);
      
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return validationError(res, 'Limit must be a number between 1 and 100');
      }
      
      // Get recent anomalies as threat feed
      const redis = (await import('../../config/redis.js')).getRedisClient();
      const pattern = (await import('../../config/redis.js')).generateRedisKey(
        (await import('../../config/redis.js')).REDIS_KEYS.CACHE, 
        'anomaly_analysis:*'
      );
      
      const keys = await redis.keys(pattern);
      const threats = [];
      
      // Sort keys by timestamp (newest first) and get recent ones
      const sortedKeys = keys.sort().reverse().slice(0, limitNum);
      
      for (const key of sortedKeys) {
        try {
          const threatData = await redis.get(key);
          if (threatData) {
            const threat = JSON.parse(threatData);
            threats.push({
              id: key.split(':').pop(),
              timestamp: threat.timestamp,
              username: threat.username,
              ip: threat.ip,
              threatLevel: threat.threatLevel,
              riskScore: threat.overallRiskScore,
              anomalyCount: threat.anomalies.length,
              type: 'authentication_anomaly'
            });
          }
        } catch (error) {
          continue;
        }
      }
      
      return successResponse(res, {
        message: 'Threat feed retrieved successfully',
        data: {
          threats,
          count: threats.length,
          limit: limitNum,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      manufacturingLogger.error('Failed to get threat feed', {
        error: error.message,
        limit: req.query.limit,
        category: 'anomaly_detection'
      });
      
      return errorResponse(res, 'Failed to retrieve threat feed', 500);
    }
  }

  /**
   * Get anomaly detection capabilities
   */
  async getCapabilities(req, res) {
    try {
      const capabilities = {
        detectionMethods: Object.values(anomalyDetectionService.detectionMethods),
        anomalyTypes: Object.values(anomalyDetectionService.anomalyTypes),
        threatLevels: Object.values(anomalyDetectionService.threatLevels),
        features: [
          'Real-time authentication anomaly detection',
          'Behavioral pattern analysis',
          'Geographic anomaly detection',
          'Device fingerprinting analysis',
          'Threat intelligence integration',
          'Rate limiting analysis',
          'Timing pattern analysis',
          'Risk scoring and threat level assessment',
          'Automated recommendations',
          'Security event logging'
        ],
        thresholds: {
          loginAttempts: anomalyDetectionService.thresholds.loginAttempts,
          failedLogins: anomalyDetectionService.thresholds.failedLogins,
          locationChange: anomalyDetectionService.thresholds.locationChange,
          deviceChange: anomalyDetectionService.thresholds.deviceChange,
          responseTime: anomalyDetectionService.thresholds.responseTime
        }
      };
      
      return successResponse(res, {
        message: 'Anomaly detection capabilities retrieved successfully',
        data: capabilities
      });

    } catch (error) {
      manufacturingLogger.error('Failed to get anomaly detection capabilities', {
        error: error.message,
        category: 'anomaly_detection'
      });
      
      return errorResponse(res, 'Failed to retrieve anomaly detection capabilities', 500);
    }
  }

  /**
   * Test anomaly detection system
   */
  async testAnomalyDetection(req, res) {
    try {
      // Create a test authentication attempt with known anomalies
      const testAuthData = {
        userId: 'test_user_anomaly',
        username: 'testuser_anomaly',
        ip: '192.168.1.999',
        userAgent: 'TestBot/1.0 (Automated Testing)',
        timestamp: new Date().toISOString(),
        success: false,
        failureReason: 'Test anomaly detection',
        location: {
          lat: 40.7128,
          lng: -74.0060
        },
        deviceFingerprint: 'test_device_fingerprint_123'
      };
      
      // Analyze the test data
      const analysisResult = await anomalyDetectionService.analyzeAuthenticationAttempt(testAuthData);
      
      return successResponse(res, {
        message: 'Anomaly detection system test completed',
        data: {
          testData: testAuthData,
          analysisResult,
          systemStatus: 'operational',
          testTimestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      manufacturingLogger.error('Anomaly detection system test failed', {
        error: error.message,
        category: 'anomaly_detection'
      });
      
      return errorResponse(res, 'Anomaly detection system test failed', 500);
    }
  }
}

// Export singleton instance
export default new AnomalyDetectionController();
