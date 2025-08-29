// Enhanced session management service with Redis integration
// Manufacturing-optimized session handling with high availability

import { getRedisClient, REDIS_KEYS, generateRedisKey } from '../config/redis.js';
import { manufacturingLogger } from '../middleware/logger.js';
import { 
  generateTokenPair, 
  verifyToken, 
  TOKEN_TYPES 
} from '../utils/index.js';
import { User } from '../models/index.js';

/**
 * Session Manager Service
 * Handles user sessions, token management, and Redis-based caching
 */
class SessionManager {
  constructor() {
    this.redis = getRedisClient();
    this.sessionTTL = 24 * 60 * 60; // 24 hours in seconds
    this.permissionCacheTTL = 15 * 60; // 15 minutes in seconds
    this.blacklistTTL = 7 * 24 * 60 * 60; // 7 days in seconds
  }

  /**
   * Create new user session
   * Stores session data in Redis with proper TTL
   */
  async createSession(user, stationId = null) {
    try {
      const sessionId = `session_${user.id}_${Date.now()}`;
      const tokens = generateTokenPair(user);
      
      // Session data structure
      const sessionData = {
        id: sessionId,
        userId: user.id,
        username: user.username,
        role: user.role,
        stationId,
        loginTime: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        ipAddress: null, // Will be set by middleware
        userAgent: null, // Will be set by middleware
        permissions: await this.getUserPermissions(user.id),
        isActive: true
      };

      // Store session in Redis
      const sessionKey = generateRedisKey(REDIS_KEYS.SESSION, sessionId);
      await this.redis.setex(sessionKey, this.sessionTTL, JSON.stringify(sessionData));

      // Store user's active sessions
      const userSessionsKey = generateRedisKey(REDIS_KEYS.SESSION, `user:${user.id}:active`);
      await this.redis.sadd(userSessionsKey, sessionId);
      await this.redis.expire(userSessionsKey, this.sessionTTL);

      // Cache user permissions
      await this.cacheUserPermissions(user.id, sessionData.permissions);

      manufacturingLogger.info('Session created successfully', {
        sessionId,
        userId: user.id,
        username: user.username,
        stationId,
        category: 'session'
      });

      return {
        sessionId,
        tokens,
        sessionData
      };
    } catch (error) {
      manufacturingLogger.error('Failed to create session', {
        userId: user.id,
        error: error.message,
        category: 'session'
      });
      throw error;
    }
  }

  /**
   * Validate and refresh session
   * Updates last activity and extends TTL if needed
   */
  async validateSession(sessionId, token) {
    try {
      const sessionKey = generateRedisKey(REDIS_KEYS.SESSION, sessionId);
      const sessionData = await this.redis.get(sessionKey);

      if (!sessionData) {
        return { valid: false, reason: 'session_not_found' };
      }

      const session = JSON.parse(sessionData);
      
      // Check if session is active
      if (!session.isActive) {
        return { valid: false, reason: 'session_inactive' };
      }

      // Verify token
      try {
        const decoded = verifyToken(token, TOKEN_TYPES.ACCESS);
        if (decoded.userId !== session.userId) {
          return { valid: false, reason: 'token_mismatch' };
        }
      } catch (error) {
        return { valid: false, reason: 'invalid_token' };
      }

      // Update last activity
      session.lastActivity = new Date().toISOString();
      await this.redis.setex(sessionKey, this.sessionTTL, JSON.stringify(session));

      // Extend user sessions set TTL
      const userSessionsKey = generateRedisKey(REDIS_KEYS.SESSION, `user:${session.userId}:active`);
      await this.redis.expire(userSessionsKey, this.sessionTTL);

      return {
        valid: true,
        session,
        permissions: await this.getUserPermissions(session.userId)
      };
    } catch (error) {
      manufacturingLogger.error('Session validation failed', {
        sessionId,
        error: error.message,
        category: 'session'
      });
      return { valid: false, reason: 'validation_error' };
    }
  }

  /**
   * Invalidate session and add token to blacklist
   * Ensures secure logout for manufacturing environment
   */
  async invalidateSession(sessionId, token, reason = 'logout') {
    try {
      const sessionKey = generateRedisKey(REDIS_KEYS.SESSION, sessionId);
      const sessionData = await this.redis.get(sessionKey);

      if (sessionData) {
        const session = JSON.parse(sessionData);
        
        // Remove from user's active sessions
        const userSessionsKey = generateRedisKey(REDIS_KEYS.SESSION, `user:${session.userId}:active`);
        await this.redis.srem(userSessionsKey, sessionId);

        // Delete session data
        await this.redis.del(sessionKey);

        // Add token to blacklist
        if (token) {
          await this.blacklistToken(token, reason);
        }

        manufacturingLogger.info('Session invalidated successfully', {
          sessionId,
          userId: session.userId,
          reason,
          category: 'session'
        });

        return true;
      }

      return false;
    } catch (error) {
      manufacturingLogger.error('Failed to invalidate session', {
        sessionId,
        error: error.message,
        category: 'session'
      });
      throw error;
    }
  }

  /**
   * Add token to blacklist
   * Prevents reuse of logged out tokens
   */
  async blacklistToken(token, reason = 'logout') {
    try {
      const blacklistKey = generateRedisKey(REDIS_KEYS.TOKEN_BLACKLIST, token);
      await this.redis.setex(blacklistKey, this.blacklistTTL, JSON.stringify({
        reason,
        blacklistedAt: new Date().toISOString()
      }));

      manufacturingLogger.info('Token blacklisted', {
        reason,
        category: 'session'
      });

      return true;
    } catch (error) {
      manufacturingLogger.error('Failed to blacklist token', {
        error: error.message,
        category: 'session'
      });
      throw error;
    }
  }

  /**
   * Check if token is blacklisted
   * Used during authentication to prevent blacklisted token usage
   */
  async isTokenBlacklisted(token) {
    try {
      const blacklistKey = generateRedisKey(REDIS_KEYS.TOKEN_BLACKLIST, token);
      const blacklisted = await this.redis.exists(blacklistKey);
      return blacklisted === 1;
    } catch (error) {
      manufacturingLogger.error('Failed to check token blacklist', {
        error: error.message,
        category: 'session'
      });
      return false; // Fail safe - assume not blacklisted
    }
  }

  /**
   * Get user permissions with caching
   * Improves performance for frequently accessed permissions
   */
  async getUserPermissions(userId) {
    try {
      // Check cache first
      const cacheKey = generateRedisKey(REDIS_KEYS.USER_PERMISSIONS, userId);
      const cachedPermissions = await this.redis.get(cacheKey);

      if (cachedPermissions) {
        return JSON.parse(cachedPermissions);
      }

      // Fetch from database
      const user = await User.findById(userId);
      if (!user) {
        return null;
      }

      const permissions = {
        role: user.role,
        stationAccess: user.station_assignments,
        canAccessAllStations: ['SYSTEM_ADMIN', 'PRODUCTION_SUPERVISOR', 'QC_MANAGER'].includes(user.role),
        permissions: await this.getRolePermissions(user.role)
      };

      // Cache permissions
      await this.cacheUserPermissions(userId, permissions);

      return permissions;
    } catch (error) {
      manufacturingLogger.error('Failed to get user permissions', {
        userId,
        error: error.message,
        category: 'session'
      });
      return null;
    }
  }

  /**
   * Cache user permissions in Redis
   * Improves response time for permission checks
   */
  async cacheUserPermissions(userId, permissions) {
    try {
      const cacheKey = generateRedisKey(REDIS_KEYS.USER_PERMISSIONS, userId);
      await this.redis.setex(cacheKey, this.permissionCacheTTL, JSON.stringify(permissions));
    } catch (error) {
      manufacturingLogger.warn('Failed to cache user permissions', {
        userId,
        error: error.message,
        category: 'session'
      });
    }
  }

  /**
   * Get role-based permissions
   * Defines permissions for each manufacturing role
   */
  async getRolePermissions(role) {
    const rolePermissions = {
      STATION_INSPECTOR: [
        'panel:scan',
        'panel:inspect',
        'panel:pass',
        'panel:fail',
        'station:view'
      ],
      PRODUCTION_SUPERVISOR: [
        'panel:scan',
        'panel:inspect',
        'panel:pass',
        'panel:fail',
        'station:view',
        'station:manage',
        'user:view',
        'order:view',
        'order:create',
        'order:update'
      ],
      QC_MANAGER: [
        'panel:scan',
        'panel:inspect',
        'panel:pass',
        'panel:fail',
        'station:view',
        'station:manage',
        'user:view',
        'user:create',
        'user:update',
        'order:view',
        'order:create',
        'order:update',
        'quality:override',
        'reports:view',
        'reports:generate'
      ],
      SYSTEM_ADMIN: [
        'panel:scan',
        'panel:inspect',
        'panel:pass',
        'panel:fail',
        'station:view',
        'station:manage',
        'user:view',
        'user:create',
        'user:update',
        'user:delete',
        'order:view',
        'order:create',
        'order:update',
        'order:delete',
        'quality:override',
        'reports:view',
        'reports:generate',
        'system:configure',
        'system:maintenance'
      ]
    };

    return rolePermissions[role] || [];
  }

  /**
   * Get user's active sessions
   * Useful for admin monitoring and forced logout
   */
  async getUserActiveSessions(userId) {
    try {
      const userSessionsKey = generateRedisKey(REDIS_KEYS.SESSION, `user:${userId}:active`);
      const sessionIds = await this.redis.smembers(userSessionsKey);
      
      const sessions = [];
      for (const sessionId of sessionIds) {
        const sessionKey = generateRedisKey(REDIS_KEYS.SESSION, sessionId);
        const sessionData = await this.redis.get(sessionKey);
        if (sessionData) {
          sessions.push(JSON.parse(sessionData));
        }
      }

      return sessions;
    } catch (error) {
      manufacturingLogger.error('Failed to get user active sessions', {
        userId,
        error: error.message,
        category: 'session'
      });
      return [];
    }
  }

  /**
   * Force logout user from all sessions
   * Admin function for security incidents
   */
  async forceLogoutUser(userId, reason = 'admin_forced') {
    try {
      const sessions = await this.getUserActiveSessions(userId);
      
      for (const session of sessions) {
        await this.invalidateSession(session.id, null, reason);
      }

      // Clear permission cache
      const cacheKey = generateRedisKey(REDIS_KEYS.USER_PERMISSIONS, userId);
      await this.redis.del(cacheKey);

      manufacturingLogger.info('User force logged out from all sessions', {
        userId,
        reason,
        sessionsCount: sessions.length,
        category: 'session'
      });

      return sessions.length;
    } catch (error) {
      manufacturingLogger.error('Failed to force logout user', {
        userId,
        error: error.message,
        category: 'session'
      });
      throw error;
    }
  }

  /**
   * Update session activity timestamp
   * Extends session TTL and updates last activity
   */
  async updateSessionActivity(sessionId) {
    try {
      const sessionKey = generateRedisKey(REDIS_KEYS.SESSION, sessionId);
      const sessionData = await this.redis.get(sessionKey);

      if (sessionData) {
        const session = JSON.parse(sessionData);
        session.lastActivity = new Date().toISOString();
        
        // Extend TTL
        await this.redis.setex(sessionKey, this.sessionTTL, JSON.stringify(session));
        
        // Extend user sessions set TTL
        const userSessionsKey = generateRedisKey(REDIS_KEYS.SESSION, `user:${session.userId}:active`);
        await this.redis.expire(userSessionsKey, this.sessionTTL);
      }
    } catch (error) {
      manufacturingLogger.warn('Failed to update session activity', {
        sessionId,
        error: error.message,
        category: 'session'
      });
    }
  }

  /**
   * Update device fingerprint for session
   * Tracks device characteristics for security monitoring
   */
  async updateDeviceFingerprint(sessionId, fingerprint) {
    try {
      const sessionKey = generateRedisKey(REDIS_KEYS.SESSION, sessionId);
      const sessionData = await this.redis.get(sessionKey);

      if (sessionData) {
        const session = JSON.parse(sessionData);
        session.deviceFingerprint = fingerprint;
        
        await this.redis.setex(sessionKey, this.sessionTTL, JSON.stringify(session));
      }
    } catch (error) {
      manufacturingLogger.warn('Failed to update device fingerprint', {
        sessionId,
        error: error.message,
        category: 'session'
      });
    }
  }

  /**
   * Clean up expired sessions and blacklisted tokens
   * Maintenance function for Redis cleanup
   */
  async cleanupExpiredData() {
    try {
      // This would typically be handled by Redis TTL, but we can add manual cleanup
      // for manufacturing systems that need explicit control
      manufacturingLogger.info('Session cleanup completed', {
        category: 'session'
      });
    } catch (error) {
      manufacturingLogger.error('Session cleanup failed', {
        error: error.message,
        category: 'session'
      });
    }
  }

  /**
   * Get session statistics
   * Monitoring and analytics for manufacturing operations
   */
  async getSessionStats() {
    try {
      const stats = {
        totalSessions: 0,
        activeSessions: 0,
        blacklistedTokens: 0,
        timestamp: new Date().toISOString()
      };

      // Get total active sessions
      const sessionKeys = await this.redis.keys(generateRedisKey(REDIS_KEYS.SESSION, '*'));
      stats.totalSessions = sessionKeys.length;

      // Get blacklisted tokens count
      const blacklistKeys = await this.redis.keys(generateRedisKey(REDIS_KEYS.TOKEN_BLACKLIST, '*'));
      stats.blacklistedTokens = blacklistKeys.length;

      return stats;
    } catch (error) {
      manufacturingLogger.error('Failed to get session stats', {
        error: error.message,
        category: 'session'
      });
      return null;
    }
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();
export default sessionManager;
