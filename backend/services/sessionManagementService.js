// Session management service for manufacturing system
// Handles session storage, invalidation, cleanup, and security

import { databaseManager } from '../config/index.js';
import { manufacturingLogger } from '../middleware/logger.js';
import { ValidationError, AuthenticationError, DatabaseError } from '../middleware/errorHandler.js';

class SessionManagementService {
  constructor() {
    this.sessionExpirationHours = 4; // 4 hours session timeout
    this.cleanupInterval = 15 * 60 * 1000; // 15 minutes cleanup interval
    this.maxSessionsPerUser = 5; // Maximum concurrent sessions per user
    this.blacklistExpirationHours = 24; // 24 hours blacklist expiration
    this.startCleanupJob();
  }

  /**
   * Create a new session
   * @param {string} userId - User ID
   * @param {string} username - Username
   * @param {string} role - User role
   * @param {string} ipAddress - IP address
   * @param {string} userAgent - User agent string
   * @param {string} accessToken - Access token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>} Session information
   */
  async createSession(userId, username, role, ipAddress, userAgent, accessToken, refreshToken) {
    try {
      // Check for existing sessions and enforce limits
      await this.enforceSessionLimits(userId);

      const sessionId = this.generateSessionId();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (this.sessionExpirationHours * 60 * 60 * 1000));

      // Store session in database
      const sessionData = {
        sessionId,
        userId,
        username,
        role,
        ipAddress,
        userAgent,
        accessToken,
        refreshToken,
        createdAt: now,
        expiresAt,
        lastActivity: now,
        isActive: true
      };

      await this.storeSession(sessionData);

      manufacturingLogger.info('Session created successfully', {
        sessionId,
        userId,
        username,
        role,
        ipAddress,
        expiresAt,
        category: 'session_management'
      });

      return {
        sessionId,
        userId,
        username,
        role,
        expiresAt,
        createdAt: now
      };

    } catch (error) {
      manufacturingLogger.error('Failed to create session', {
        error: error.message,
        userId,
        username,
        category: 'session_management'
      });
      throw error;
    }
  }

  /**
   * Validate and update session
   * @param {string} sessionId - Session ID
   * @param {string} accessToken - Access token
   * @param {string} ipAddress - Current IP address
   * @returns {Promise<Object>} Session validation result
   */
  async validateSession(sessionId, accessToken, ipAddress) {
    try {
      const session = await this.getSession(sessionId);
      
      if (!session) {
        return { valid: false, reason: 'session_not_found' };
      }

      if (!session.isActive) {
        return { valid: false, reason: 'session_inactive' };
      }

      if (new Date() > new Date(session.expiresAt)) {
        await this.invalidateSession(sessionId, 'expired');
        return { valid: false, reason: 'session_expired' };
      }

      if (session.accessToken !== accessToken) {
        await this.invalidateSession(sessionId, 'token_mismatch');
        return { valid: false, reason: 'token_mismatch' };
      }

      // Update last activity
      await this.updateSessionActivity(sessionId);

      return {
        valid: true,
        session: {
          sessionId: session.sessionId,
          userId: session.userId,
          username: session.username,
          role: session.role,
          expiresAt: session.expiresAt,
          lastActivity: session.lastActivity
        }
      };

    } catch (error) {
      manufacturingLogger.error('Failed to validate session', {
        error: error.message,
        sessionId,
        category: 'session_management'
      });
      return { valid: false, reason: 'validation_error' };
    }
  }

  /**
   * Invalidate a session
   * @param {string} sessionId - Session ID
   * @param {string} reason - Invalidation reason
   * @returns {Promise<boolean>} Success status
   */
  async invalidateSession(sessionId, reason = 'manual_logout') {
    try {
      const session = await this.getSession(sessionId);
      
      if (!session) {
        return false;
      }

      // Blacklist the tokens
      await this.blacklistTokens(session.accessToken, session.refreshToken, reason);

      // Mark session as inactive
      await this.deactivateSession(sessionId, reason);

      manufacturingLogger.info('Session invalidated', {
        sessionId,
        userId: session.userId,
        username: session.username,
        reason,
        category: 'session_management'
      });

      return true;

    } catch (error) {
      manufacturingLogger.error('Failed to invalidate session', {
        error: error.message,
        sessionId,
        reason,
        category: 'session_management'
      });
      throw error;
    }
  }

  /**
   * Invalidate all sessions for a user
   * @param {string} userId - User ID
   * @param {string} reason - Invalidation reason
   * @param {string} excludeSessionId - Session ID to exclude from invalidation
   * @returns {Promise<number>} Number of sessions invalidated
   */
  async invalidateAllUserSessions(userId, reason = 'password_change', excludeSessionId = null) {
    try {
      const sessions = await this.getUserSessions(userId);
      let invalidatedCount = 0;

      for (const session of sessions) {
        if (excludeSessionId && session.sessionId === excludeSessionId) {
          continue;
        }

        await this.invalidateSession(session.sessionId, reason);
        invalidatedCount++;
      }

      manufacturingLogger.info('All user sessions invalidated', {
        userId,
        reason,
        invalidatedCount,
        category: 'session_management'
      });

      return invalidatedCount;

    } catch (error) {
      manufacturingLogger.error('Failed to invalidate all user sessions', {
        error: error.message,
        userId,
        reason,
        category: 'session_management'
      });
      throw error;
    }
  }

  /**
   * Check if token is blacklisted
   * @param {string} token - Token to check
   * @returns {Promise<boolean>} Is blacklisted
   */
  async isTokenBlacklisted(token) {
    try {
      const query = `
        SELECT id FROM token_blacklist 
        WHERE token = $1 
        AND expires_at > CURRENT_TIMESTAMP
      `;

      const result = await databaseManager.query(query, [token]);
      return result.rows.length > 0;

    } catch (error) {
      manufacturingLogger.error('Failed to check token blacklist', {
        error: error.message,
        token: token ? 'provided' : 'missing',
        category: 'session_management'
      });
      return false;
    }
  }

  /**
   * Blacklist tokens
   * @param {string} accessToken - Access token
   * @param {string} refreshToken - Refresh token
   * @param {string} reason - Blacklist reason
   */
  async blacklistTokens(accessToken, refreshToken, reason) {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (this.blacklistExpirationHours * 60 * 60 * 1000));

      const query = `
        INSERT INTO token_blacklist (token, reason, created_at, expires_at)
        VALUES ($1, $2, $3, $4), ($5, $2, $3, $4)
        ON CONFLICT (token) DO NOTHING
      `;

      await databaseManager.query(query, [
        accessToken, reason, now, expiresAt,
        refreshToken, reason, now, expiresAt
      ]);

      manufacturingLogger.info('Tokens blacklisted', {
        reason,
        expiresAt,
        category: 'session_management'
      });

    } catch (error) {
      manufacturingLogger.error('Failed to blacklist tokens', {
        error: error.message,
        reason,
        category: 'session_management'
      });
      throw error;
    }
  }

  /**
   * Get user sessions
   * @param {string} userId - User ID
   * @returns {Promise<Array>} User sessions
   */
  async getUserSessions(userId) {
    try {
      const query = `
        SELECT * FROM user_sessions 
        WHERE user_id = $1 
        AND is_active = true 
        ORDER BY last_activity DESC
      `;

      const result = await databaseManager.query(query, [userId]);
      return result.rows;

    } catch (error) {
      manufacturingLogger.error('Failed to get user sessions', {
        error: error.message,
        userId,
        category: 'session_management'
      });
      throw error;
    }
  }

  /**
   * Get session statistics
   * @returns {Promise<Object>} Session statistics
   */
  async getSessionStatistics() {
    try {
      const queries = {
        activeSessions: `
          SELECT COUNT(*) as count 
          FROM user_sessions 
          WHERE is_active = true 
          AND expires_at > CURRENT_TIMESTAMP
        `,
        expiredSessions: `
          SELECT COUNT(*) as count 
          FROM user_sessions 
          WHERE expires_at <= CURRENT_TIMESTAMP
        `,
        blacklistedTokens: `
          SELECT COUNT(*) as count 
          FROM token_blacklist 
          WHERE expires_at > CURRENT_TIMESTAMP
        `,
        sessionsByUser: `
          SELECT user_id, COUNT(*) as count 
          FROM user_sessions 
          WHERE is_active = true 
          GROUP BY user_id
        `,
        recentSessions: `
          SELECT COUNT(*) as count 
          FROM user_sessions 
          WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
        `
      };

      const results = {};
      for (const [key, query] of Object.entries(queries)) {
        const result = await databaseManager.query(query);
        if (key === 'sessionsByUser') {
          results[key] = result.rows.map(row => ({
            userId: row.user_id,
            sessionCount: parseInt(row.count)
          }));
        } else {
          results[key] = parseInt(result.rows[0].count);
        }
      }

      return results;

    } catch (error) {
      manufacturingLogger.error('Failed to get session statistics', {
        error: error.message,
        category: 'session_management'
      });
      return null;
    }
  }

  /**
   * Clean up expired sessions and tokens
   */
  async cleanupExpiredSessions() {
    try {
      // Clean up expired sessions
      const sessionQuery = `
        UPDATE user_sessions 
        SET is_active = false, invalidated_at = CURRENT_TIMESTAMP, invalidation_reason = 'expired'
        WHERE expires_at <= CURRENT_TIMESTAMP 
        AND is_active = true
      `;

      const sessionResult = await databaseManager.query(sessionQuery);

      // Clean up expired blacklisted tokens
      const tokenQuery = `
        DELETE FROM token_blacklist 
        WHERE expires_at <= CURRENT_TIMESTAMP
      `;

      const tokenResult = await databaseManager.query(tokenQuery);

      if (sessionResult.rowCount > 0 || tokenResult.rowCount > 0) {
        manufacturingLogger.info('Expired sessions and tokens cleaned up', {
          expiredSessions: sessionResult.rowCount,
          expiredTokens: tokenResult.rowCount,
          category: 'session_cleanup'
        });
      }

    } catch (error) {
      manufacturingLogger.error('Failed to cleanup expired sessions', {
        error: error.message,
        category: 'session_cleanup'
      });
    }
  }

  /**
   * Enforce session limits per user
   * @param {string} userId - User ID
   */
  async enforceSessionLimits(userId) {
    try {
      const sessions = await this.getUserSessions(userId);
      
      if (sessions.length >= this.maxSessionsPerUser) {
        // Remove oldest sessions
        const sessionsToRemove = sessions.slice(this.maxSessionsPerUser - 1);
        
        for (const session of sessionsToRemove) {
          await this.invalidateSession(session.sessionId, 'session_limit_exceeded');
        }

        manufacturingLogger.info('Session limits enforced', {
          userId,
          removedSessions: sessionsToRemove.length,
          maxSessions: this.maxSessionsPerUser,
          category: 'session_management'
        });
      }

    } catch (error) {
      manufacturingLogger.error('Failed to enforce session limits', {
        error: error.message,
        userId,
        category: 'session_management'
      });
    }
  }

  /**
   * Generate unique session ID
   * @returns {string} Session ID
   */
  generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Store session in database
   * @param {Object} sessionData - Session data
   */
  async storeSession(sessionData) {
    try {
      const query = `
        INSERT INTO user_sessions (
          session_id, user_id, username, role, ip_address, user_agent,
          access_token, refresh_token, created_at, expires_at, last_activity, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `;

      await databaseManager.query(query, [
        sessionData.sessionId,
        sessionData.userId,
        sessionData.username,
        sessionData.role,
        sessionData.ipAddress,
        sessionData.userAgent,
        sessionData.accessToken,
        sessionData.refreshToken,
        sessionData.createdAt,
        sessionData.expiresAt,
        sessionData.lastActivity,
        sessionData.isActive
      ]);

    } catch (error) {
      manufacturingLogger.error('Failed to store session', {
        error: error.message,
        sessionId: sessionData.sessionId,
        category: 'session_management'
      });
      throw error;
    }
  }

  /**
   * Get session by ID
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object|null>} Session data
   */
  async getSession(sessionId) {
    try {
      const query = `
        SELECT * FROM user_sessions 
        WHERE session_id = $1
      `;

      const result = await databaseManager.query(query, [sessionId]);
      return result.rows[0] || null;

    } catch (error) {
      manufacturingLogger.error('Failed to get session', {
        error: error.message,
        sessionId,
        category: 'session_management'
      });
      return null;
    }
  }

  /**
   * Update session activity
   * @param {string} sessionId - Session ID
   */
  async updateSessionActivity(sessionId) {
    try {
      const query = `
        UPDATE user_sessions 
        SET last_activity = CURRENT_TIMESTAMP
        WHERE session_id = $1
      `;

      await databaseManager.query(query, [sessionId]);

    } catch (error) {
      manufacturingLogger.error('Failed to update session activity', {
        error: error.message,
        sessionId,
        category: 'session_management'
      });
    }
  }

  /**
   * Deactivate session
   * @param {string} sessionId - Session ID
   * @param {string} reason - Deactivation reason
   */
  async deactivateSession(sessionId, reason) {
    try {
      const query = `
        UPDATE user_sessions 
        SET is_active = false, invalidated_at = CURRENT_TIMESTAMP, invalidation_reason = $1
        WHERE session_id = $2
      `;

      await databaseManager.query(query, [reason, sessionId]);

    } catch (error) {
      manufacturingLogger.error('Failed to deactivate session', {
        error: error.message,
        sessionId,
        reason,
        category: 'session_management'
      });
      throw error;
    }
  }

  /**
   * Start periodic cleanup job
   */
  startCleanupJob() {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.cleanupInterval);

    manufacturingLogger.info('Session cleanup job started', {
      interval: this.cleanupInterval,
      category: 'session_cleanup'
    });
  }
}

// Export singleton instance
export const sessionManagementService = new SessionManagementService();
export default sessionManagementService;
