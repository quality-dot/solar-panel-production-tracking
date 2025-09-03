// Anomaly Detection and Security Intelligence Service
// Manufacturing-optimized threat detection and behavioral analysis

import { sessionManager } from './sessionManager.js';
import { tokenRotationService } from './tokenRotationService.js';
import { authPerformanceMonitor } from './authPerformanceMonitor.js';
import { userExperienceService } from './userExperienceService.js';
import { complianceAuditService } from './complianceAuditService.js';
import { manufacturingLogger } from '../middleware/logger.js';
import { getRedisClient, REDIS_KEYS, generateRedisKey } from '../config/redis.js';
import { User } from '../models/index.js';

/**
 * Anomaly Detection and Security Intelligence Service
 * Provides advanced threat detection and behavioral analysis
 */
class AnomalyDetectionService {
  constructor() {
    this.anomalyTypes = {
      AUTHENTICATION: 'authentication',
      SESSION: 'session',
      BEHAVIORAL: 'behavioral',
      NETWORK: 'network',
      TIMING: 'timing',
      DEVICE: 'device',
      LOCATION: 'location',
      PATTERN: 'pattern'
    };
    
    this.threatLevels = {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
      CRITICAL: 'critical'
    };
    
    this.detectionMethods = {
      STATISTICAL: 'statistical',
      MACHINE_LEARNING: 'ml',
      RULE_BASED: 'rule_based',
      BEHAVIORAL: 'behavioral',
      THREAT_INTELLIGENCE: 'threat_intel'
    };
    
    // Anomaly detection thresholds
    this.thresholds = {
      loginAttempts: {
        normal: 5,        // Normal attempts per hour
        suspicious: 10,   // Suspicious threshold
        critical: 20      // Critical threshold
      },
      failedLogins: {
        normal: 2,        // Normal failures per hour
        suspicious: 5,    // Suspicious threshold
        critical: 10      // Critical threshold
      },
      sessionDuration: {
        min: 5 * 60 * 1000,      // 5 minutes minimum
        max: 24 * 60 * 60 * 1000, // 24 hours maximum
        suspicious: 2 * 60 * 60 * 1000 // 2 hours suspicious
      },
      responseTime: {
        normal: 100,      // 100ms normal
        suspicious: 500,  // 500ms suspicious
        critical: 1000    // 1000ms critical
      },
      locationChange: {
        suspicious: 100,  // 100km change in 1 hour
        critical: 500     // 500km change in 1 hour
      },
      deviceChange: {
        suspicious: 2,    // 2 different devices in 1 hour
        critical: 5       // 5 different devices in 1 hour
      }
    };
    
    // Behavioral patterns for analysis
    this.behavioralPatterns = {
      loginTimes: new Map(),      // User login time patterns
      loginLocations: new Map(),  // User login location patterns
      deviceUsage: new Map(),     // User device usage patterns
      activityPatterns: new Map() // User activity timing patterns
    };
    
    // Threat intelligence sources
    this.threatIntelligence = {
      ipBlacklist: new Set(),
      knownThreats: new Map(),
      threatFeeds: [],
      lastUpdate: null
    };
  }

  /**
   * Analyze authentication attempt for anomalies
   */
  async analyzeAuthenticationAttempt(authData) {
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
      } = authData;
      
      const anomalies = [];
      let overallRiskScore = 0;
      
      // 1. Rate limiting analysis
      const rateLimitAnomaly = await this.analyzeRateLimiting(username, ip, timestamp);
      if (rateLimitAnomaly) {
        anomalies.push(rateLimitAnomaly);
        overallRiskScore += rateLimitAnomaly.riskScore;
      }
      
      // 2. Geographic anomaly detection
      const geoAnomaly = await this.analyzeGeographicAnomaly(userId, ip, location, timestamp);
      if (geoAnomaly) {
        anomalies.push(geoAnomaly);
        overallRiskScore += geoAnomaly.riskScore;
      }
      
      // 3. Device anomaly detection
      const deviceAnomaly = await this.analyzeDeviceAnomaly(userId, deviceFingerprint, timestamp);
      if (deviceAnomaly) {
        anomalies.push(deviceAnomaly);
        overallRiskScore += deviceAnomaly.riskScore;
      }
      
      // 4. Behavioral pattern analysis
      const behavioralAnomaly = await this.analyzeBehavioralPattern(userId, timestamp, success);
      if (behavioralAnomaly) {
        anomalies.push(behavioralAnomaly);
        overallRiskScore += behavioralAnomaly.riskScore;
      }
      
      // 5. Threat intelligence check
      const threatAnomaly = await this.checkThreatIntelligence(ip, userAgent);
      if (threatAnomaly) {
        anomalies.push(threatAnomaly);
        overallRiskScore += threatAnomaly.riskScore;
      }
      
      // 6. Timing anomaly detection
      const timingAnomaly = await this.analyzeTimingAnomaly(userId, timestamp, success);
      if (timingAnomaly) {
        anomalies.push(timingAnomaly);
        overallRiskScore += timingAnomaly.riskScore;
      }
      
      // Determine overall threat level
      const threatLevel = this.calculateThreatLevel(overallRiskScore);
      
      // Store analysis results
      const analysisResult = {
        userId,
        username,
        ip,
        timestamp,
        success,
        anomalies,
        overallRiskScore,
        threatLevel,
        recommendations: this.generateAnomalyRecommendations(anomalies, threatLevel)
      };
      
      // Store in Redis for real-time monitoring
      await this.storeAnomalyAnalysis(analysisResult);
      
      // Log security event if anomalies detected
      if (anomalies.length > 0) {
        await this.logSecurityEvent(analysisResult);
      }
      
      return analysisResult;
      
    } catch (error) {
      manufacturingLogger.error('Anomaly analysis failed', {
        error: error.message,
        authData,
        category: 'anomaly_detection'
      });
      
      return {
        userId: authData.userId,
        timestamp: new Date().toISOString(),
        anomalies: [],
        overallRiskScore: 0,
        threatLevel: this.threatLevels.LOW,
        error: error.message
      };
    }
  }

  /**
   * Analyze rate limiting patterns
   */
  async analyzeRateLimiting(username, ip, timestamp) {
    try {
      const redis = getRedisClient();
      const now = Date.now();
      const oneHourAgo = now - (60 * 60 * 1000);
      
      // Check username-based rate limiting
      const usernameKey = generateRedisKey(REDIS_KEYS.CACHE, `login_attempts:${username}`);
      const usernameAttempts = await redis.zcount(usernameKey, oneHourAgo, now);
      
      // Check IP-based rate limiting
      const ipKey = generateRedisKey(REDIS_KEYS.CACHE, `login_attempts_ip:${ip}`);
      const ipAttempts = await redis.zcount(ipKey, oneHourAgo, now);
      
      // Check failed login attempts
      const failedKey = generateRedisKey(REDIS_KEYS.CACHE, `failed_logins:${username}`);
      const failedAttempts = await redis.zcount(failedKey, oneHourAgo, now);
      
      let anomaly = null;
      let riskScore = 0;
      
      // Username-based anomalies
      if (usernameAttempts > this.thresholds.loginAttempts.critical) {
        anomaly = {
          type: this.anomalyTypes.AUTHENTICATION,
          method: this.detectionMethods.RULE_BASED,
          description: `Excessive login attempts for username: ${usernameAttempts} in 1 hour`,
          riskScore: 80,
          severity: this.threatLevels.CRITICAL
        };
        riskScore = 80;
      } else if (usernameAttempts > this.thresholds.loginAttempts.suspicious) {
        anomaly = {
          type: this.anomalyTypes.AUTHENTICATION,
          method: this.detectionMethods.RULE_BASED,
          description: `Suspicious login attempts for username: ${usernameAttempts} in 1 hour`,
          riskScore: 40,
          severity: this.threatLevels.MEDIUM
        };
        riskScore = 40;
      }
      
      // IP-based anomalies
      if (ipAttempts > this.thresholds.loginAttempts.critical) {
        if (!anomaly) {
          anomaly = {
            type: this.anomalyTypes.NETWORK,
            method: this.detectionMethods.RULE_BASED,
            description: `Excessive login attempts from IP: ${ipAttempts} in 1 hour`,
            riskScore: 70,
            severity: this.threatLevels.HIGH
          };
          riskScore = 70;
        } else {
          riskScore += 30;
        }
      }
      
      // Failed login anomalies
      if (failedAttempts > this.thresholds.failedLogins.critical) {
        if (!anomaly) {
          anomaly = {
            type: this.anomalyTypes.AUTHENTICATION,
            method: this.detectionMethods.RULE_BASED,
            description: `Excessive failed login attempts: ${failedAttempts} in 1 hour`,
            riskScore: 60,
            severity: this.threatLevels.HIGH
          };
          riskScore = 60;
        } else {
          riskScore += 20;
        }
      }
      
      // Add attempt to tracking
      await redis.zadd(usernameKey, now, `${now}_${Math.random()}`);
      await redis.zadd(ipKey, now, `${now}_${Math.random()}`);
      await redis.expire(usernameKey, 60 * 60); // 1 hour TTL
      await redis.expire(ipKey, 60 * 60);
      
      if (anomaly) {
        anomaly.riskScore = riskScore;
        return anomaly;
      }
      
      return null;
      
    } catch (error) {
      manufacturingLogger.error('Rate limiting analysis failed', {
        error: error.message,
        username,
        ip,
        category: 'anomaly_detection'
      });
      return null;
    }
  }

  /**
   * Analyze geographic anomalies
   */
  async analyzeGeographicAnomaly(userId, ip, location, timestamp) {
    try {
      if (!location || !userId) {
        return null;
      }
      
      const redis = getRedisClient();
      const userLocationKey = generateRedisKey(REDIS_KEYS.CACHE, `user_location:${userId}`);
      
      // Get user's last known location
      const lastLocation = await redis.get(userLocationKey);
      
      if (!lastLocation) {
        // First login from this location - store it
        await redis.setex(userLocationKey, 24 * 60 * 60, JSON.stringify({
          location,
          timestamp,
          ip
        }));
        return null;
      }
      
      const lastLocationData = JSON.parse(lastLocation);
      const lastLocationCoords = lastLocationData.location;
      const lastTimestamp = new Date(lastLocationData.timestamp).getTime();
      const currentTimestamp = new Date(timestamp).getTime();
      
      // Calculate distance and time difference
      const distance = this.calculateDistance(
        lastLocationCoords.lat, lastLocationCoords.lng,
        location.lat, location.lng
      );
      
      const timeDiff = currentTimestamp - lastTimestamp;
      const timeDiffHours = timeDiff / (1000 * 60 * 60);
      
      // Check for suspicious location changes
      if (distance > this.thresholds.locationChange.critical && timeDiffHours < 1) {
        return {
          type: this.anomalyTypes.LOCATION,
          method: this.detectionMethods.BEHAVIORAL,
          description: `Impossible travel detected: ${distance.toFixed(2)}km in ${timeDiffHours.toFixed(2)} hours`,
          riskScore: 90,
          severity: this.threatLevels.CRITICAL,
          details: {
            distance: distance.toFixed(2),
            timeDiff: timeDiffHours.toFixed(2),
            lastLocation: lastLocationCoords,
            currentLocation: location
          }
        };
      } else if (distance > this.thresholds.locationChange.suspicious && timeDiffHours < 2) {
        return {
          type: this.anomalyTypes.LOCATION,
          method: this.detectionMethods.BEHAVIORAL,
          description: `Suspicious travel detected: ${distance.toFixed(2)}km in ${timeDiffHours.toFixed(2)} hours`,
          riskScore: 50,
          severity: this.threatLevels.MEDIUM,
          details: {
            distance: distance.toFixed(2),
            timeDiff: timeDiffHours.toFixed(2),
            lastLocation: lastLocationCoords,
            currentLocation: location
          }
        };
      }
      
      // Update location if no anomaly
      await redis.setex(userLocationKey, 24 * 60 * 60, JSON.stringify({
        location,
        timestamp,
        ip
      }));
      
      return null;
      
    } catch (error) {
      manufacturingLogger.error('Geographic anomaly analysis failed', {
        error: error.message,
        userId,
        category: 'anomaly_detection'
      });
      return null;
    }
  }

  /**
   * Analyze device anomalies
   */
  async analyzeDeviceAnomaly(userId, deviceFingerprint, timestamp) {
    try {
      if (!deviceFingerprint || !userId) {
        return null;
      }
      
      const redis = getRedisClient();
      const userDeviceKey = generateRedisKey(REDIS_KEYS.CACHE, `user_devices:${userId}`);
      
      // Get user's known devices
      const knownDevices = await redis.smembers(userDeviceKey);
      
      if (!knownDevices.includes(deviceFingerprint)) {
        // New device detected
        const deviceCount = knownDevices.length;
        
        if (deviceCount >= this.thresholds.deviceChange.critical) {
          return {
            type: this.anomalyTypes.DEVICE,
            method: this.detectionMethods.BEHAVIORAL,
            description: `Critical number of new devices: ${deviceCount + 1} devices`,
            riskScore: 70,
            severity: this.threatLevels.HIGH,
            details: {
              newDevice: deviceFingerprint,
              totalDevices: deviceCount + 1,
              knownDevices
            }
          };
        } else if (deviceCount >= this.thresholds.deviceChange.suspicious) {
          return {
            type: this.anomalyTypes.DEVICE,
            method: this.detectionMethods.BEHAVIORAL,
            description: `Suspicious number of new devices: ${deviceCount + 1} devices`,
            riskScore: 40,
            severity: this.threatLevels.MEDIUM,
            details: {
              newDevice: deviceFingerprint,
              totalDevices: deviceCount + 1,
              knownDevices
            }
          };
        }
        
        // Add new device to known devices
        await redis.sadd(userDeviceKey, deviceFingerprint);
        await redis.expire(userDeviceKey, 30 * 24 * 60 * 60); // 30 days TTL
      }
      
      return null;
      
    } catch (error) {
      manufacturingLogger.error('Device anomaly analysis failed', {
        error: error.message,
        userId,
        category: 'anomaly_detection'
      });
      return null;
    }
  }

  /**
   * Analyze behavioral patterns
   */
  async analyzeBehavioralPattern(userId, timestamp, success) {
    try {
      const redis = getRedisClient();
      const now = new Date(timestamp);
      const hour = now.getHours();
      const dayOfWeek = now.getDay();
      
      // Get user's behavioral patterns
      const patternKey = generateRedisKey(REDIS_KEYS.CACHE, `behavior_pattern:${userId}`);
      const patterns = await redis.get(patternKey);
      
      if (!patterns) {
        // Initialize patterns for new user
        const initialPatterns = {
          loginHours: { [hour]: 1 },
          loginDays: { [dayOfWeek]: 1 },
          successRate: success ? 1 : 0,
          totalLogins: 1,
          lastUpdate: timestamp
        };
        
        await redis.setex(patternKey, 30 * 24 * 60 * 60, JSON.stringify(initialPatterns));
        return null;
      }
      
      const userPatterns = JSON.parse(patterns);
      
      // Update patterns
      userPatterns.loginHours[hour] = (userPatterns.loginHours[hour] || 0) + 1;
      userPatterns.loginDays[dayOfWeek] = (userPatterns.loginDays[dayOfWeek] || 0) + 1;
      userPatterns.totalLogins += 1;
      userPatterns.successRate = ((userPatterns.successRate * (userPatterns.totalLogins - 1)) + (success ? 1 : 0)) / userPatterns.totalLogins;
      userPatterns.lastUpdate = timestamp;
      
      // Check for unusual patterns
      const anomalies = [];
      
      // Check for unusual login hours
      const avgLoginsPerHour = userPatterns.totalLogins / 24;
      const currentHourLogins = userPatterns.loginHours[hour] || 0;
      
      if (currentHourLogins > avgLoginsPerHour * 3) {
        anomalies.push({
          type: this.anomalyTypes.BEHAVIORAL,
          method: this.detectionMethods.STATISTICAL,
          description: `Unusual login activity at hour ${hour}: ${currentHourLogins} logins`,
          riskScore: 30,
          severity: this.threatLevels.MEDIUM
        });
      }
      
      // Check for unusual success rate changes
      if (userPatterns.totalLogins > 10) {
        const previousSuccessRate = userPatterns.successRate;
        if (Math.abs(previousSuccessRate - (success ? 1 : 0)) > 0.3) {
          anomalies.push({
            type: this.anomalyTypes.BEHAVIORAL,
            method: this.detectionMethods.STATISTICAL,
            description: `Unusual success rate change: ${(previousSuccessRate * 100).toFixed(1)}% to ${(success ? 100 : 0)}%`,
            riskScore: 25,
            severity: this.threatLevels.LOW
          });
        }
      }
      
      // Save updated patterns
      await redis.setex(patternKey, 30 * 24 * 60 * 60, JSON.stringify(userPatterns));
      
      return anomalies.length > 0 ? anomalies[0] : null;
      
    } catch (error) {
      manufacturingLogger.error('Behavioral pattern analysis failed', {
        error: error.message,
        userId,
        category: 'anomaly_detection'
      });
      return null;
    }
  }

  /**
   * Check threat intelligence
   */
  async checkThreatIntelligence(ip, userAgent) {
    try {
      // Check IP blacklist
      if (this.threatIntelligence.ipBlacklist.has(ip)) {
        return {
          type: this.anomalyTypes.NETWORK,
          method: this.detectionMethods.THREAT_INTELLIGENCE,
          description: `IP address ${ip} is in threat intelligence blacklist`,
          riskScore: 100,
          severity: this.threatLevels.CRITICAL,
          details: {
            ip,
            blacklistSource: 'internal_threat_intel'
          }
        };
      }
      
      // Check for known threat patterns in user agent
      const suspiciousPatterns = [
        'bot', 'crawler', 'scraper', 'automated',
        'sqlmap', 'nmap', 'metasploit', 'burp'
      ];
      
      const lowerUserAgent = userAgent.toLowerCase();
      for (const pattern of suspiciousPatterns) {
        if (lowerUserAgent.includes(pattern)) {
          return {
            type: this.anomalyTypes.NETWORK,
            method: this.detectionMethods.RULE_BASED,
            description: `Suspicious user agent pattern detected: ${pattern}`,
            riskScore: 60,
            severity: this.threatLevels.HIGH,
            details: {
              pattern,
              userAgent: userAgent.substring(0, 100) // Truncate for security
            }
          };
        }
      }
      
      return null;
      
    } catch (error) {
      manufacturingLogger.error('Threat intelligence check failed', {
        error: error.message,
        ip,
        category: 'anomaly_detection'
      });
      return null;
    }
  }

  /**
   * Analyze timing anomalies
   */
  async analyzeTimingAnomaly(userId, timestamp, success) {
    try {
      const redis = getRedisClient();
      const now = new Date(timestamp);
      const hour = now.getHours();
      
      // Check for unusual login times (e.g., 2-5 AM)
      if (hour >= 2 && hour <= 5) {
        return {
          type: this.anomalyTypes.TIMING,
          method: this.detectionMethods.RULE_BASED,
          description: `Unusual login time: ${hour}:00 (early morning hours)`,
          riskScore: 35,
          severity: this.threatLevels.MEDIUM,
          details: {
            hour,
            timeCategory: 'early_morning'
          }
        };
      }
      
      // Check for rapid successive login attempts
      const recentLoginsKey = generateRedisKey(REDIS_KEYS.CACHE, `recent_logins:${userId}`);
      const recentLogins = await redis.zrange(recentLoginsKey, 0, -1, 'WITHSCORES');
      
      if (recentLogins.length > 0) {
        const lastLoginTime = parseInt(recentLogins[recentLogins.length - 2]);
        const timeDiff = now.getTime() - lastLoginTime;
        
        if (timeDiff < 60 * 1000) { // Less than 1 minute
          return {
            type: this.anomalyTypes.TIMING,
            method: this.detectionMethods.RULE_BASED,
            description: `Rapid successive login attempts: ${timeDiff}ms apart`,
            riskScore: 45,
            severity: this.threatLevels.MEDIUM,
            details: {
              timeDiff,
              lastLogin: new Date(lastLoginTime).toISOString()
            }
          };
        }
      }
      
      // Add current login to recent logins
      await redis.zadd(recentLoginsKey, now.getTime(), `${now.getTime()}_${Math.random()}`);
      await redis.zremrangebyrank(recentLoginsKey, 0, -6); // Keep only last 5
      await redis.expire(recentLoginsKey, 60 * 60); // 1 hour TTL
      
      return null;
      
    } catch (error) {
      manufacturingLogger.error('Timing anomaly analysis failed', {
        error: error.message,
        userId,
        category: 'anomaly_detection'
      });
      return null;
    }
  }

  /**
   * Calculate threat level based on risk score
   */
  calculateThreatLevel(riskScore) {
    if (riskScore >= 80) {
      return this.threatLevels.CRITICAL;
    } else if (riskScore >= 60) {
      return this.threatLevels.HIGH;
    } else if (riskScore >= 30) {
      return this.threatLevels.MEDIUM;
    } else {
      return this.threatLevels.LOW;
    }
  }

  /**
   * Generate anomaly recommendations
   */
  generateAnomalyRecommendations(anomalies, threatLevel) {
    const recommendations = [];
    
    if (threatLevel === this.threatLevels.CRITICAL) {
      recommendations.push('Immediate account lockout and security review required');
      recommendations.push('Contact security team for incident response');
      recommendations.push('Review all recent account activity');
    } else if (threatLevel === this.threatLevels.HIGH) {
      recommendations.push('Enable additional authentication factors');
      recommendations.push('Monitor account activity closely');
      recommendations.push('Consider temporary account restrictions');
    } else if (threatLevel === this.threatLevels.MEDIUM) {
      recommendations.push('Monitor for additional suspicious activity');
      recommendations.push('Consider enhanced authentication');
      recommendations.push('Review login patterns');
    } else if (threatLevel === this.threatLevels.LOW) {
      recommendations.push('Continue normal monitoring');
      recommendations.push('No immediate action required');
    }
    
    // Add specific recommendations based on anomaly types
    const anomalyTypes = anomalies.map(a => a.type);
    
    if (anomalyTypes.includes(this.anomalyTypes.LOCATION)) {
      recommendations.push('Verify user location and travel patterns');
    }
    
    if (anomalyTypes.includes(this.anomalyTypes.DEVICE)) {
      recommendations.push('Review device access patterns');
      recommendations.push('Consider device verification');
    }
    
    if (anomalyTypes.includes(this.anomalyTypes.NETWORK)) {
      recommendations.push('Review network access patterns');
      recommendations.push('Consider IP-based restrictions');
    }
    
    return recommendations;
  }

  /**
   * Store anomaly analysis results
   */
  async storeAnomalyAnalysis(analysisResult) {
    try {
      const redis = getRedisClient();
      const key = generateRedisKey(REDIS_KEYS.CACHE, `anomaly_analysis:${analysisResult.userId}:${Date.now()}`);
      
      await redis.setex(key, 24 * 60 * 60, JSON.stringify(analysisResult)); // 24 hour TTL
      
      // Add to user's anomaly history
      const historyKey = generateRedisKey(REDIS_KEYS.CACHE, `anomaly_history:${analysisResult.userId}`);
      await redis.lpush(historyKey, key);
      await redis.ltrim(historyKey, 0, 99); // Keep last 100
      await redis.expire(historyKey, 7 * 24 * 60 * 60); // 7 days TTL
      
    } catch (error) {
      manufacturingLogger.error('Failed to store anomaly analysis', {
        error: error.message,
        userId: analysisResult.userId,
        category: 'anomaly_detection'
      });
    }
  }

  /**
   * Log security event
   */
  async logSecurityEvent(analysisResult) {
    try {
      await complianceAuditService.createAuditLog({
        level: 'SECURITY',
        category: 'SECURITY_EVENTS',
        action: 'ANOMALY_DETECTED',
        userId: analysisResult.userId,
        username: analysisResult.username,
        ip: analysisResult.ip,
        details: {
          anomalies: analysisResult.anomalies.length,
          riskScore: analysisResult.overallRiskScore,
          threatLevel: analysisResult.threatLevel,
          recommendations: analysisResult.recommendations
        },
        complianceTags: ['SECURITY', 'THREAT_DETECTION', 'ANOMALY_ANALYSIS']
      });
      
    } catch (error) {
      manufacturingLogger.error('Failed to log security event', {
        error: error.message,
        userId: analysisResult.userId,
        category: 'anomaly_detection'
      });
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  /**
   * Get anomaly statistics
   */
  async getAnomalyStatistics(timeRange = '24h') {
    try {
      const redis = getRedisClient();
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
      
      // Get all anomaly keys
      const pattern = generateRedisKey(REDIS_KEYS.CACHE, 'anomaly_analysis:*');
      const keys = await redis.keys(pattern);
      
      const statistics = {
        timeRange,
        totalAnomalies: 0,
        byThreatLevel: {},
        byType: {},
        byUser: {},
        averageRiskScore: 0,
        topAnomalies: []
      };
      
      let totalRiskScore = 0;
      const anomalyCount = 0;
      
      for (const key of keys) {
        try {
          const anomalyData = await redis.get(key);
          if (anomalyData) {
            const anomaly = JSON.parse(anomalyData);
            const anomalyTime = new Date(anomaly.timestamp).getTime();
            
            if (anomalyTime >= startTime) {
              statistics.totalAnomalies++;
              totalRiskScore += anomaly.overallRiskScore;
              
              // Count by threat level
              statistics.byThreatLevel[anomaly.threatLevel] = 
                (statistics.byThreatLevel[anomaly.threatLevel] || 0) + 1;
              
              // Count by anomaly type
              for (const anomalyItem of anomaly.anomalies) {
                statistics.byType[anomalyItem.type] = 
                  (statistics.byType[anomalyItem.type] || 0) + 1;
              }
              
              // Count by user
              statistics.byUser[anomaly.username] = 
                (statistics.byUser[anomaly.username] || 0) + 1;
            }
          }
        } catch (error) {
          // Skip invalid entries
          continue;
        }
      }
      
      if (statistics.totalAnomalies > 0) {
        statistics.averageRiskScore = Math.round(totalRiskScore / statistics.totalAnomalies);
      }
      
      return statistics;
      
    } catch (error) {
      manufacturingLogger.error('Failed to get anomaly statistics', {
        error: error.message,
        timeRange,
        category: 'anomaly_detection'
      });
      return null;
    }
  }

  /**
   * Get user anomaly history
   */
  async getUserAnomalyHistory(userId, limit = 10) {
    try {
      const redis = getRedisClient();
      const historyKey = generateRedisKey(REDIS_KEYS.CACHE, `anomaly_history:${userId}`);
      
      const historyKeys = await redis.lrange(historyKey, 0, limit - 1);
      const history = [];
      
      for (const key of historyKeys) {
        try {
          const anomalyData = await redis.get(key);
          if (anomalyData) {
            history.push(JSON.parse(anomalyData));
          }
        } catch (error) {
          continue;
        }
      }
      
      return history;
      
    } catch (error) {
      manufacturingLogger.error('Failed to get user anomaly history', {
        error: error.message,
        userId,
        category: 'anomaly_detection'
      });
      return [];
    }
  }

  /**
   * Update threat intelligence
   */
  async updateThreatIntelligence() {
    try {
      // This would typically integrate with external threat feeds
      // For now, we'll simulate with some basic patterns
      
      const redis = getRedisClient();
      const threatKey = generateRedisKey(REDIS_KEYS.CACHE, 'threat_intelligence');
      
      const threatData = {
        lastUpdate: new Date().toISOString(),
        ipBlacklist: [],
        knownThreats: {},
        threatFeeds: ['internal', 'manufacturing_sector'],
        version: '1.0.0'
      };
      
      await redis.setex(threatKey, 24 * 60 * 60, JSON.stringify(threatData));
      
      this.threatIntelligence.lastUpdate = new Date();
      
      manufacturingLogger.info('Threat intelligence updated', {
        timestamp: new Date().toISOString(),
        category: 'anomaly_detection'
      });
      
    } catch (error) {
      manufacturingLogger.error('Failed to update threat intelligence', {
        error: error.message,
        category: 'anomaly_detection'
      });
    }
  }
}

// Export singleton instance
export const anomalyDetectionService = new AnomalyDetectionService();
export default anomalyDetectionService;
