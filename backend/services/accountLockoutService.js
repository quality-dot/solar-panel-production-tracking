// Account lockout service for manufacturing system
// Handles account lockout, recovery, and unlock mechanisms

import { databaseManager } from '../config/index.js';
import { emailService } from './emailService.js';
import { User } from '../models/index.js';
import { manufacturingLogger } from '../middleware/logger.js';
import { ValidationError, AuthenticationError, DatabaseError } from '../middleware/errorHandler.js';

class AccountLockoutService {
  constructor() {
    this.maxFailedAttempts = 5; // Max failed login attempts
    this.lockoutDurationMinutes = 30; // Lockout duration in minutes
    this.maxLockoutDurationHours = 24; // Maximum lockout duration
    this.cleanupInterval = 60 * 60 * 1000; // 1 hour cleanup interval
    this.startCleanupJob();
  }

  /**
   * Record failed login attempt
   * @param {string} userId - User ID
   * @param {string} username - Username
   * @param {string} ipAddress - IP address
   * @param {string} userAgent - User agent string
   * @returns {Promise<Object>} Lockout status
   */
  async recordFailedAttempt(userId, username, ipAddress, userAgent) {
    try {
      const now = new Date();
      const lockoutUntil = new Date(now.getTime() + (this.lockoutDurationMinutes * 60 * 1000));

      // Record the failed attempt
      await this.storeFailedAttempt(userId, username, ipAddress, userAgent, now);

      // Get current failed attempt count
      const attemptCount = await this.getFailedAttemptCount(userId, now);

      manufacturingLogger.warn('Failed login attempt recorded', {
        userId,
        username,
        ipAddress,
        attemptCount,
        category: 'account_lockout'
      });

      // Check if account should be locked
      if (attemptCount >= this.maxFailedAttempts) {
        return await this.lockAccount(userId, username, lockoutUntil, attemptCount);
      }

      return {
        locked: false,
        attemptCount,
        remainingAttempts: this.maxFailedAttempts - attemptCount,
        lockoutThreshold: this.maxFailedAttempts
      };

    } catch (error) {
      manufacturingLogger.error('Failed to record failed attempt', {
        error: error.message,
        userId,
        username,
        category: 'account_lockout'
      });
      throw error;
    }
  }

  /**
   * Record successful login and clear failed attempts
   * @param {string} userId - User ID
   * @param {string} username - Username
   * @param {string} ipAddress - IP address
   */
  async recordSuccessfulLogin(userId, username, ipAddress) {
    try {
      // Clear failed attempts
      await this.clearFailedAttempts(userId);

      // Update user's last login
      const user = await User.findById(userId);
      if (user) {
        await user.updateLastLogin();
      }

      manufacturingLogger.info('Successful login recorded, failed attempts cleared', {
        userId,
        username,
        ipAddress,
        category: 'account_lockout'
      });

    } catch (error) {
      manufacturingLogger.error('Failed to record successful login', {
        error: error.message,
        userId,
        username,
        category: 'account_lockout'
      });
      throw error;
    }
  }

  /**
   * Lock user account
   * @param {string} userId - User ID
   * @param {string} username - Username
   * @param {Date} lockoutUntil - Lockout expiration time
   * @param {number} attemptCount - Number of failed attempts
   * @returns {Promise<Object>} Lockout result
   */
  async lockAccount(userId, username, lockoutUntil, attemptCount) {
    try {
      // Update user's lockout status
      const user = await User.findById(userId);
      if (!user) {
        throw new ValidationError('User not found', {
          field: 'userId',
          reason: 'user_not_found'
        });
      }

      // Set lockout in database
      await this.setUserLockout(userId, lockoutUntil);

      // Send lockout notification email
      try {
        await emailService.sendAccountLockoutEmail(user.email, username, lockoutUntil, attemptCount);
      } catch (emailError) {
        manufacturingLogger.warn('Failed to send lockout notification email', {
          error: emailError.message,
          userId,
          username,
          category: 'account_lockout'
        });
      }

      manufacturingLogger.warn('Account locked due to failed login attempts', {
        userId,
        username,
        attemptCount,
        lockoutUntil,
        category: 'account_lockout'
      });

      return {
        locked: true,
        lockoutUntil,
        attemptCount,
        reason: 'max_failed_attempts_exceeded',
        message: `Account locked due to ${attemptCount} failed login attempts. Lockout expires at ${lockoutUntil.toISOString()}`
      };

    } catch (error) {
      manufacturingLogger.error('Failed to lock account', {
        error: error.message,
        userId,
        username,
        category: 'account_lockout'
      });
      throw error;
    }
  }

  /**
   * Check if account is locked
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Lock status
   */
  async isAccountLocked(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return { locked: false, reason: 'user_not_found' };
      }

      if (!user.locked_until) {
        return { locked: false, reason: 'not_locked' };
      }

      const now = new Date();
      const lockoutUntil = new Date(user.locked_until);

      if (now > lockoutUntil) {
        // Lockout has expired, auto-unlock
        await this.unlockAccount(userId, 'automatic_expiry');
        return { locked: false, reason: 'lockout_expired' };
      }

      return {
        locked: true,
        lockoutUntil,
        remainingTime: lockoutUntil.getTime() - now.getTime(),
        reason: 'account_locked'
      };

    } catch (error) {
      manufacturingLogger.error('Failed to check account lock status', {
        error: error.message,
        userId,
        category: 'account_lockout'
      });
      return { locked: false, reason: 'check_failed' };
    }
  }

  /**
   * Unlock account (admin or automatic)
   * @param {string} userId - User ID
   * @param {string} reason - Unlock reason
   * @param {string} adminUserId - Admin user ID (if admin unlock)
   * @returns {Promise<Object>} Unlock result
   */
  async unlockAccount(userId, reason, adminUserId = null) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new ValidationError('User not found', {
          field: 'userId',
          reason: 'user_not_found'
        });
      }

      // Clear lockout status
      await this.clearUserLockout(userId);

      // Clear failed attempts
      await this.clearFailedAttempts(userId);

      // Send unlock notification email
      try {
        await emailService.sendAccountUnlockEmail(user.email, user.username, reason);
      } catch (emailError) {
        manufacturingLogger.warn('Failed to send unlock notification email', {
          error: emailError.message,
          userId,
          username: user.username,
          category: 'account_lockout'
        });
      }

      manufacturingLogger.info('Account unlocked', {
        userId,
        username: user.username,
        reason,
        adminUserId,
        category: 'account_lockout'
      });

      return {
        unlocked: true,
        userId,
        username: user.username,
        reason,
        adminUserId,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      manufacturingLogger.error('Failed to unlock account', {
        error: error.message,
        userId,
        reason,
        adminUserId,
        category: 'account_lockout'
      });
      throw error;
    }
  }

  /**
   * Get lockout statistics
   * @returns {Promise<Object>} Lockout statistics
   */
  async getLockoutStatistics() {
    try {
      const queries = {
        currentlyLocked: `
          SELECT COUNT(*) as count 
          FROM users 
          WHERE locked_until IS NOT NULL 
          AND locked_until > CURRENT_TIMESTAMP
        `,
        recentlyLocked: `
          SELECT COUNT(*) as count 
          FROM users 
          WHERE locked_until IS NOT NULL 
          AND locked_until > CURRENT_TIMESTAMP - INTERVAL '24 hours'
        `,
        totalLockouts: `
          SELECT COUNT(*) as count 
          FROM account_lockout_events 
          WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
        `,
        lockoutsByReason: `
          SELECT reason, COUNT(*) as count 
          FROM account_lockout_events 
          WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
          GROUP BY reason
        `
      };

      const results = {};
      for (const [key, query] of Object.entries(queries)) {
        const result = await databaseManager.query(query);
        if (key === 'lockoutsByReason') {
          results[key] = result.rows.reduce((acc, row) => {
            acc[row.reason] = parseInt(row.count);
            return acc;
          }, {});
        } else {
          results[key] = parseInt(result.rows[0].count);
        }
      }

      return results;

    } catch (error) {
      manufacturingLogger.error('Failed to get lockout statistics', {
        error: error.message,
        category: 'account_lockout'
      });
      return null;
    }
  }

  /**
   * Store failed login attempt
   * @param {string} userId - User ID
   * @param {string} username - Username
   * @param {string} ipAddress - IP address
   * @param {string} userAgent - User agent
   * @param {Date} timestamp - Attempt timestamp
   */
  async storeFailedAttempt(userId, username, ipAddress, userAgent, timestamp) {
    try {
      const query = `
        INSERT INTO account_lockout_events (
          user_id, username, ip_address, user_agent, event_type, 
          reason, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;

      await databaseManager.query(query, [
        userId,
        username,
        ipAddress,
        userAgent,
        'failed_login',
        'invalid_credentials',
        timestamp
      ]);

    } catch (error) {
      manufacturingLogger.error('Failed to store failed attempt', {
        error: error.message,
        userId,
        username,
        category: 'account_lockout'
      });
      throw error;
    }
  }

  /**
   * Get failed attempt count for user
   * @param {string} userId - User ID
   * @param {Date} since - Count attempts since this time
   * @returns {Promise<number>} Failed attempt count
   */
  async getFailedAttemptCount(userId, since) {
    try {
      const query = `
        SELECT COUNT(*) as count 
        FROM account_lockout_events 
        WHERE user_id = $1 
        AND event_type = 'failed_login' 
        AND created_at > $2
      `;

      const result = await databaseManager.query(query, [userId, since]);
      return parseInt(result.rows[0].count);

    } catch (error) {
      manufacturingLogger.error('Failed to get failed attempt count', {
        error: error.message,
        userId,
        category: 'account_lockout'
      });
      return 0;
    }
  }

  /**
   * Clear failed attempts for user
   * @param {string} userId - User ID
   */
  async clearFailedAttempts(userId) {
    try {
      const query = `
        DELETE FROM account_lockout_events 
        WHERE user_id = $1 
        AND event_type = 'failed_login'
      `;

      await databaseManager.query(query, [userId]);

    } catch (error) {
      manufacturingLogger.error('Failed to clear failed attempts', {
        error: error.message,
        userId,
        category: 'account_lockout'
      });
    }
  }

  /**
   * Set user lockout status
   * @param {string} userId - User ID
   * @param {Date} lockoutUntil - Lockout expiration time
   */
  async setUserLockout(userId, lockoutUntil) {
    try {
      const query = `
        UPDATE users 
        SET locked_until = $1, updated_at = $2
        WHERE id = $3
      `;

      await databaseManager.query(query, [lockoutUntil, new Date().toISOString(), userId]);

    } catch (error) {
      manufacturingLogger.error('Failed to set user lockout', {
        error: error.message,
        userId,
        lockoutUntil,
        category: 'account_lockout'
      });
      throw error;
    }
  }

  /**
   * Clear user lockout status
   * @param {string} userId - User ID
   */
  async clearUserLockout(userId) {
    try {
      const query = `
        UPDATE users 
        SET locked_until = NULL, updated_at = $1
        WHERE id = $2
      `;

      await databaseManager.query(query, [new Date().toISOString(), userId]);

    } catch (error) {
      manufacturingLogger.error('Failed to clear user lockout', {
        error: error.message,
        userId,
        category: 'account_lockout'
      });
      throw error;
    }
  }

  /**
   * Clean up expired lockout events
   */
  async cleanupExpiredEvents() {
    try {
      const query = `
        DELETE FROM account_lockout_events
        WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days'
      `;

      const result = await databaseManager.query(query);
      
      if (result.rowCount > 0) {
        manufacturingLogger.info('Expired lockout events cleaned up', {
          count: result.rowCount,
          category: 'account_lockout_cleanup'
        });
      }

    } catch (error) {
      manufacturingLogger.error('Failed to cleanup expired events', {
        error: error.message,
        category: 'account_lockout_cleanup'
      });
    }
  }

  /**
   * Get user lockout history
   * @param {string} userId - User ID
   * @param {number} limit - Maximum number of records to return
   * @returns {Promise<Array>} Lockout history
   */
  async getUserLockoutHistory(userId, limit = 50) {
    try {
      const query = `
        SELECT 
          event_type,
          reason,
          ip_address,
          user_agent,
          created_at
        FROM account_lockout_events
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;

      const result = await databaseManager.query(query, [userId, limit]);
      return result.rows;

    } catch (error) {
      manufacturingLogger.error('Failed to get user lockout history', {
        error: error.message,
        userId,
        limit,
        category: 'account_lockout'
      });
      throw new DatabaseError('Failed to get user lockout history', 'lockout_history', {
        userId,
        limit,
        originalError: error.message
      });
    }
  }

  /**
   * Start periodic cleanup job
   */
  startCleanupJob() {
    setInterval(() => {
      this.cleanupExpiredEvents();
    }, this.cleanupInterval);

    manufacturingLogger.info('Account lockout cleanup job started', {
      interval: this.cleanupInterval,
      category: 'account_lockout_cleanup'
    });
  }
}

// Export singleton instance
export const accountLockoutService = new AccountLockoutService();
export default accountLockoutService;
