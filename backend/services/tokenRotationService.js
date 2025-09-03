// Token Rotation and Security Enhancement Service
// Manufacturing-optimized token management with advanced security features

import { sessionManager } from './sessionManager.js';
import { 
  generateTokenPair, 
  verifyToken, 
  TOKEN_TYPES 
} from '../utils/index.js';
import { manufacturingLogger } from '../middleware/logger.js';
import { 
  AuthenticationError, 
  ValidationError 
} from '../middleware/errorHandler.js';

/**
 * Token Rotation Service
 * Handles automatic token rotation, device fingerprinting, and security restrictions
 */
class TokenRotationService {
  constructor() {
    this.maxConcurrentSessions = 3; // Maximum sessions per user
    this.rotationThreshold = 5 * 60 * 1000; // 5 minutes before expiry
    this.suspiciousActivityThreshold = 3; // Failed attempts before flagging
    this.deviceChangeThreshold = 0.7; // Similarity threshold for device fingerprinting
  }

  /**
   * Rotate tokens automatically when they're close to expiry
   * Generates new token pair and invalidates old ones
   */
  async rotateTokens(userId, currentToken, reason = 'auto_rotation') {
    try {
      // Verify current token
      const decoded = verifyToken(currentToken, TOKEN_TYPES.ACCESS);
      
      // Get user's active sessions
      const activeSessions = await sessionManager.getUserActiveSessions(userId);
      
      // Find the session for this token
      const currentSession = activeSessions.find(session => 
        session.id === (decoded.sessionId || `legacy_${userId}`)
      );

      if (!currentSession) {
        throw new AuthenticationError('Session not found for token rotation', {
          reason: 'session_not_found'
        });
      }

      // Generate new token pair
      const newTokens = generateTokenPair({
        id: userId,
        role: currentSession.role
      });

      // Create new session with rotated tokens
      const newSessionResult = await sessionManager.createSession(
        { id: userId, role: currentSession.role },
        currentSession.stationId
      );

      // Invalidate old session
      await sessionManager.invalidateSession(currentSession.id, currentToken, reason);

      // Log token rotation
      manufacturingLogger.info('Token rotation completed', {
        userId,
        oldSessionId: currentSession.id,
        newSessionId: newSessionResult.sessionId,
        reason,
        category: 'token_rotation'
      });

      return {
        newTokens,
        newSessionId: newSessionResult.sessionId,
        rotatedAt: new Date().toISOString(),
        reason
      };
    } catch (error) {
      manufacturingLogger.error('Token rotation failed', {
        userId,
        error: error.message,
        category: 'token_rotation'
      });
      throw error;
    }
  }

  /**
   * Check and enforce concurrent session limits
   * Prevents users from having too many active sessions
   */
  async enforceSessionLimits(userId, newSessionData = null) {
    try {
      const activeSessions = await sessionManager.getUserActiveSessions(userId);
      
      if (activeSessions.length >= this.maxConcurrentSessions) {
        // Find oldest session to terminate
        const oldestSession = activeSessions
          .sort((a, b) => new Date(a.loginTime) - new Date(b.loginTime))[0];

        // Terminate oldest session
        await sessionManager.invalidateSession(
          oldestSession.id, 
          null, 
          'session_limit_enforced'
        );

        manufacturingLogger.warn('Session limit enforced - oldest session terminated', {
          userId,
          terminatedSessionId: oldestSession.id,
          activeSessionsCount: activeSessions.length,
          maxAllowed: this.maxConcurrentSessions,
          category: 'session_management'
        });

        return {
          limitEnforced: true,
          terminatedSessionId: oldestSession.id,
          reason: 'session_limit_enforced'
        };
      }

      return { limitEnforced: false };
    } catch (error) {
      manufacturingLogger.error('Session limit enforcement failed', {
        userId,
        error: error.message,
        category: 'session_management'
      });
      throw error;
    }
  }

  /**
   * Generate device fingerprint from request data
   * Creates unique device identifier for security monitoring
   */
  generateDeviceFingerprint(req) {
    try {
      const userAgent = req.get('User-Agent') || '';
      const acceptLanguage = req.get('Accept-Language') || '';
      const acceptEncoding = req.get('Accept-Encoding') || '';
      const ip = req.ip || req.connection?.remoteAddress || 'unknown';
      
      // Create fingerprint hash
      const fingerprintData = {
        userAgent: userAgent.substring(0, 100), // Limit length
        acceptLanguage: acceptLanguage.substring(0, 50),
        acceptEncoding: acceptEncoding.substring(0, 50),
        ip: ip,
        timestamp: new Date().toISOString()
      };

      // Generate hash from fingerprint data
      const fingerprintString = JSON.stringify(fingerprintData);
      const fingerprintHash = this.hashString(fingerprintString);

      return {
        hash: fingerprintHash,
        data: fingerprintData,
        similarity: 1.0 // Perfect match for new fingerprint
      };
    } catch (error) {
      manufacturingLogger.warn('Device fingerprint generation failed', {
        error: error.message,
        ip: req.ip,
        category: 'security'
      });
      
      // Return fallback fingerprint
      return {
        hash: 'fallback_fingerprint',
        data: { ip: req.ip || 'unknown' },
        similarity: 0.0
      };
    }
  }

  /**
   * Compare device fingerprints for similarity
   * Detects potential device changes or suspicious activity
   */
  compareDeviceFingerprints(fingerprint1, fingerprint2) {
    try {
      if (!fingerprint1 || !fingerprint2) {
        return { similarity: 0.0, suspicious: false };
      }

      let similarity = 0.0;
      let matchCount = 0;
      let totalFields = 0;

      // Compare individual fields
      const fields = ['userAgent', 'acceptLanguage', 'acceptEncoding', 'ip'];
      
      fields.forEach(field => {
        if (fingerprint1.data[field] && fingerprint2.data[field]) {
          totalFields++;
          if (fingerprint1.data[field] === fingerprint2.data[field]) {
            matchCount++;
          }
        }
      });

      // Calculate similarity score
      if (totalFields > 0) {
        similarity = matchCount / totalFields;
      }

      // Determine if change is suspicious
      const suspicious = similarity < this.deviceChangeThreshold;

      return {
        similarity,
        suspicious,
        matchCount,
        totalFields,
        threshold: this.deviceChangeThreshold
      };
    } catch (error) {
      manufacturingLogger.warn('Device fingerprint comparison failed', {
        error: error.message,
        category: 'security'
      });
      
      return { similarity: 0.0, suspicious: true };
    }
  }

  /**
   * Check for suspicious activity patterns
   * Monitors login attempts, device changes, and unusual behavior
   */
  async detectSuspiciousActivity(userId, newFingerprint, req) {
    try {
      const activeSessions = await sessionManager.getUserActiveSessions(userId);
      
      if (activeSessions.length === 0) {
        return { suspicious: false, reasons: [] };
      }

      const reasons = [];
      let suspicious = false;

      // Check for device changes
      const recentSession = activeSessions
        .sort((a, b) => new Date(b.loginTime) - new Date(a.loginTime))[0];

      if (recentSession.deviceFingerprint) {
        const comparison = this.compareDeviceFingerprints(
          recentSession.deviceFingerprint,
          newFingerprint
        );

        if (comparison.suspicious) {
          reasons.push(`Device change detected (similarity: ${comparison.similarity.toFixed(2)})`);
          suspicious = true;
        }
      }

      // Check for multiple IP addresses
      const uniqueIPs = new Set(activeSessions.map(s => s.ipAddress).filter(Boolean));
      if (uniqueIPs.size > 2) {
        reasons.push(`Multiple IP addresses detected: ${uniqueIPs.size}`);
        suspicious = true;
      }

      // Check for rapid successive logins
      const recentLogins = activeSessions
        .filter(s => {
          const loginTime = new Date(s.loginTime);
          const now = new Date();
          return (now - loginTime) < 5 * 60 * 1000; // 5 minutes
        });

      if (recentLogins.length > 2) {
        reasons.push(`Rapid successive logins: ${recentLogins.length} in 5 minutes`);
        suspicious = true;
      }

      // Check for unusual time patterns (outside normal working hours)
      const hour = new Date().getHours();
      if (hour < 6 || hour > 22) {
        reasons.push(`Login outside normal hours: ${hour}:00`);
        suspicious = true;
      }

      if (suspicious) {
        manufacturingLogger.warn('Suspicious activity detected', {
          userId,
          reasons,
          newFingerprint: newFingerprint.hash,
          ip: req.ip,
          category: 'security'
        });
      }

      return { suspicious, reasons };
    } catch (error) {
      manufacturingLogger.error('Suspicious activity detection failed', {
        userId,
        error: error.message,
        category: 'security'
      });
      
      // Fail safe - assume suspicious if detection fails
      return { suspicious: true, reasons: ['Detection system error'] };
    }
  }

  /**
   * Apply IP-based security restrictions
   * Blocks or flags requests from suspicious IP addresses
   */
  async applyIPSecurityRestrictions(ip, userId = null) {
    try {
      // Check if IP is in blacklist
      const isBlacklisted = await this.isIPBlacklisted(ip);
      if (isBlacklisted) {
        return {
          allowed: false,
          reason: 'ip_blacklisted',
          action: 'block'
        };
      }

      // Check for rate limiting violations
      const rateLimitStatus = await this.checkIPRateLimit(ip);
      if (rateLimitStatus.violated) {
        return {
          allowed: false,
          reason: 'rate_limit_violation',
          action: 'block',
          retryAfter: rateLimitStatus.retryAfter
        };
      }

      // Check for geographic restrictions (if configured)
      const geoRestriction = await this.checkGeographicRestriction(ip);
      if (geoRestriction.restricted) {
        return {
          allowed: false,
          reason: 'geographic_restriction',
          action: 'block',
          country: geoRestriction.country
        };
      }

      return { allowed: true };
    } catch (error) {
      manufacturingLogger.error('IP security check failed', {
        ip,
        userId,
        error: error.message,
        category: 'security'
      });
      
      // Fail safe - allow request if security check fails
      return { allowed: true };
    }
  }

  /**
   * Check if IP address is blacklisted
   * Consults Redis for IP blacklist
   */
  async isIPBlacklisted(ip) {
    try {
      const { getRedisClient, REDIS_KEYS, generateRedisKey } = await import('../config/redis.js');
      const redis = getRedisClient();
      
      const blacklistKey = generateRedisKey(REDIS_KEYS.CACHE, `ip_blacklist:${ip}`);
      const isBlacklisted = await redis.exists(blacklistKey);
      
      return isBlacklisted === 1;
    } catch (error) {
      manufacturingLogger.warn('IP blacklist check failed', {
        ip,
        error: error.message,
        category: 'security'
      });
      return false;
    }
  }

  /**
   * Check IP rate limiting status
   * Monitors request frequency per IP address
   */
  async checkIPRateLimit(ip) {
    try {
      const { getRedisClient, REDIS_KEYS, generateRedisKey } = await import('../config/redis.js');
      const redis = getRedisClient();
      
      const rateLimitKey = generateRedisKey(REDIS_KEYS.RATE_LIMIT, `ip:${ip}`);
      const currentCount = await redis.get(rateLimitKey);
      
      if (currentCount && parseInt(currentCount) > 100) { // 100 requests per window
        return {
          violated: true,
          retryAfter: 300 // 5 minutes
        };
      }
      
      return { violated: false };
    } catch (error) {
      manufacturingLogger.warn('IP rate limit check failed', {
        ip,
        error: error.message,
        category: 'security'
      });
      return { violated: false };
    }
  }

  /**
   * Check geographic restrictions
   * Placeholder for future geographic IP filtering
   */
  async checkGeographicRestriction(ip) {
    // This is a placeholder for future geographic IP filtering
    // Could integrate with services like MaxMind GeoIP2
    return { restricted: false };
  }

  /**
   * Simple string hashing function
   * Creates consistent hash for device fingerprinting
   */
  hashString(str) {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * Get security statistics for monitoring
   * Provides insights into security events and patterns
   */
  async getSecurityStats() {
    try {
      const { getRedisClient, REDIS_KEYS, generateRedisKey } = await import('../config/redis.js');
      const redis = getRedisClient();
      
      const stats = {
        timestamp: new Date().toISOString(),
        suspiciousActivityCount: 0,
        deviceChangeCount: 0,
        ipBlacklistCount: 0,
        rateLimitViolations: 0
      };

      // Get suspicious activity count
      const suspiciousKeys = await redis.keys(generateRedisKey(REDIS_KEYS.AUDIT, 'suspicious:*'));
      stats.suspiciousActivityCount = suspiciousKeys.length;

      // Get device change count
      const deviceChangeKeys = await redis.keys(generateRedisKey(REDIS_KEYS.AUDIT, 'device_change:*'));
      stats.deviceChangeCount = deviceChangeKeys.length;

      // Get IP blacklist count
      const ipBlacklistKeys = await redis.keys(generateRedisKey(REDIS_KEYS.CACHE, 'ip_blacklist:*'));
      stats.ipBlacklistCount = ipBlacklistKeys.length;

      // Get rate limit violations
      const rateLimitKeys = await redis.keys(generateRedisKey(REDIS_KEYS.AUDIT, 'rate_limit:*'));
      stats.rateLimitViolations = rateLimitKeys.length;

      return stats;
    } catch (error) {
      manufacturingLogger.error('Security stats collection failed', {
        error: error.message,
        category: 'security'
      });
      return null;
    }
  }
}

// Export singleton instance
export const tokenRotationService = new TokenRotationService();
export default tokenRotationService;
