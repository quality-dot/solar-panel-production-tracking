// Password reset service for manufacturing system
// Handles secure token generation, validation, and password reset flow

import crypto from 'crypto';
import { databaseManager } from '../config/index.js';
import { emailService } from './emailService.js';
import { User } from '../models/index.js';
import { manufacturingLogger } from '../middleware/logger.js';
import { ValidationError, AuthenticationError } from '../middleware/errorHandler.js';

class PasswordResetService {
  constructor() {
    this.tokenExpirationHours = 1; // 1 hour expiration
    this.maxAttemptsPerHour = 3; // Max 3 reset attempts per hour per user
    this.cleanupInterval = 60 * 60 * 1000; // 1 hour cleanup interval
    this.startCleanupJob();
  }

  /**
   * Request password reset for a user
   * @param {string} email - User's email address
   * @returns {Promise<Object>} Reset request result
   */
  async requestPasswordReset(email) {
    try {
      // Validate email format
      if (!email || !this.isValidEmail(email)) {
        throw new ValidationError('Valid email address is required', {
          field: 'email',
          reason: 'invalid_email_format'
        });
      }

      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not for security
        manufacturingLogger.warn('Password reset requested for non-existent email', {
          email,
          category: 'password_reset'
        });
        
        // Return success even if user doesn't exist (security best practice)
        return {
          success: true,
          message: 'If the email exists, a password reset link has been sent.',
          email: email // Don't return the actual email in production
        };
      }

      // Check rate limiting
      await this.checkRateLimit(user.id);

      // Generate secure reset token
      const resetToken = this.generateSecureToken();
      const expiresAt = new Date(Date.now() + (this.tokenExpirationHours * 60 * 60 * 1000));

      // Store reset token in database
      await this.storeResetToken(user.id, resetToken, expiresAt);

      // Send reset email
      await emailService.sendPasswordResetEmail(user.email, resetToken, user.username);

      manufacturingLogger.info('Password reset requested successfully', {
        userId: user.id,
        email: user.email,
        username: user.username,
        category: 'password_reset'
      });

      return {
        success: true,
        message: 'Password reset link has been sent to your email.',
        email: user.email
      };

    } catch (error) {
      manufacturingLogger.error('Password reset request failed', {
        error: error.message,
        email,
        category: 'password_reset'
      });
      throw error;
    }
  }

  /**
   * Reset password using token
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Reset result
   */
  async resetPassword(token, newPassword) {
    try {
      // Validate inputs
      if (!token || !newPassword) {
        throw new ValidationError('Reset token and new password are required', {
          fields: ['token', 'newPassword'],
          reason: 'missing_required_fields'
        });
      }

      // Validate password strength
      if (!this.isValidPassword(newPassword)) {
        throw new ValidationError('Password does not meet security requirements', {
          field: 'newPassword',
          reason: 'weak_password'
        });
      }

      // Find and validate reset token
      const resetRecord = await this.getResetToken(token);
      if (!resetRecord) {
        throw new AuthenticationError('Invalid or expired reset token', {
          reason: 'invalid_token'
        });
      }

      // Check if token is expired
      if (new Date() > new Date(resetRecord.expires_at)) {
        await this.invalidateResetToken(token);
        throw new AuthenticationError('Reset token has expired', {
          reason: 'expired_token'
        });
      }

      // Get user
      const user = await User.findById(resetRecord.user_id);
      if (!user) {
        throw new AuthenticationError('User not found', {
          reason: 'user_not_found'
        });
      }

      // Update user password
      await user.updatePassword(newPassword);

      // Invalidate the reset token
      await this.invalidateResetToken(token);

      // Invalidate all user sessions (force re-login)
      await this.invalidateUserSessions(user.id);

      manufacturingLogger.info('Password reset completed successfully', {
        userId: user.id,
        username: user.username,
        category: 'password_reset'
      });

      return {
        success: true,
        message: 'Password has been reset successfully. Please log in with your new password.',
        userId: user.id
      };

    } catch (error) {
      manufacturingLogger.error('Password reset failed', {
        error: error.message,
        token: token ? 'provided' : 'missing',
        category: 'password_reset'
      });
      throw error;
    }
  }

  /**
   * Validate reset token
   * @param {string} token - Reset token to validate
   * @returns {Promise<Object>} Token validation result
   */
  async validateResetToken(token) {
    try {
      if (!token) {
        return { valid: false, reason: 'no_token' };
      }

      const resetRecord = await this.getResetToken(token);
      if (!resetRecord) {
        return { valid: false, reason: 'invalid_token' };
      }

      if (new Date() > new Date(resetRecord.expires_at)) {
        return { valid: false, reason: 'expired_token' };
      }

      return { 
        valid: true, 
        userId: resetRecord.user_id,
        expiresAt: resetRecord.expires_at
      };

    } catch (error) {
      manufacturingLogger.error('Token validation failed', {
        error: error.message,
        token: token ? 'provided' : 'missing'
      });
      return { valid: false, reason: 'validation_error' };
    }
  }

  /**
   * Generate secure reset token
   * @returns {string} Secure token
   */
  generateSecureToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Store reset token in database
   * @param {string} userId - User ID
   * @param {string} token - Reset token
   * @param {Date} expiresAt - Expiration date
   */
  async storeResetToken(userId, token, expiresAt) {
    try {
      const query = `
        INSERT INTO password_reset_tokens (user_id, token, expires_at, created_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          token = EXCLUDED.token,
          expires_at = EXCLUDED.expires_at,
          created_at = CURRENT_TIMESTAMP
      `;

      await databaseManager.query(query, [userId, token, expiresAt]);

    } catch (error) {
      manufacturingLogger.error('Failed to store reset token', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Get reset token from database
   * @param {string} token - Reset token
   * @returns {Promise<Object|null>} Reset token record
   */
  async getResetToken(token) {
    try {
      const query = `
        SELECT user_id, token, expires_at, created_at
        FROM password_reset_tokens
        WHERE token = $1
      `;

      const result = await databaseManager.query(query, [token]);
      return result.rows[0] || null;

    } catch (error) {
      manufacturingLogger.error('Failed to get reset token', {
        error: error.message,
        token: token ? 'provided' : 'missing'
      });
      return null;
    }
  }

  /**
   * Invalidate reset token
   * @param {string} token - Reset token to invalidate
   */
  async invalidateResetToken(token) {
    try {
      const query = `
        DELETE FROM password_reset_tokens
        WHERE token = $1
      `;

      await databaseManager.query(query, [token]);

    } catch (error) {
      manufacturingLogger.error('Failed to invalidate reset token', {
        error: error.message,
        token: token ? 'provided' : 'missing'
      });
    }
  }

  /**
   * Check rate limiting for password reset requests
   * @param {string} userId - User ID
   */
  async checkRateLimit(userId) {
    try {
      const oneHourAgo = new Date(Date.now() - (60 * 60 * 1000));
      
      const query = `
        SELECT COUNT(*) as attempt_count
        FROM password_reset_tokens
        WHERE user_id = $1 AND created_at > $2
      `;

      const result = await databaseManager.query(query, [userId, oneHourAgo]);
      const attemptCount = parseInt(result.rows[0].attempt_count);

      if (attemptCount >= this.maxAttemptsPerHour) {
        throw new ValidationError('Too many password reset attempts. Please try again later.', {
          reason: 'rate_limit_exceeded',
          attempts: attemptCount,
          maxAttempts: this.maxAttemptsPerHour
        });
      }

    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      manufacturingLogger.error('Rate limit check failed', {
        error: error.message,
        userId
      });
    }
  }

  /**
   * Invalidate all user sessions (force re-login)
   * @param {string} userId - User ID
   */
  async invalidateUserSessions(userId) {
    try {
      // Increment token version to invalidate all existing tokens
      const user = await User.findById(userId);
      if (user) {
        await user.updateTokenVersion();
      }

      manufacturingLogger.info('User sessions invalidated after password reset', {
        userId,
        category: 'password_reset'
      });

    } catch (error) {
      manufacturingLogger.error('Failed to invalidate user sessions', {
        error: error.message,
        userId
      });
    }
  }

  /**
   * Clean up expired reset tokens
   */
  async cleanupExpiredTokens() {
    try {
      const query = `
        DELETE FROM password_reset_tokens
        WHERE expires_at < CURRENT_TIMESTAMP
      `;

      const result = await databaseManager.query(query);
      
      if (result.rowCount > 0) {
        manufacturingLogger.info('Expired password reset tokens cleaned up', {
          count: result.rowCount,
          category: 'password_reset_cleanup'
        });
      }

    } catch (error) {
      manufacturingLogger.error('Failed to cleanup expired tokens', {
        error: error.message
      });
    }
  }

  /**
   * Start periodic cleanup job
   */
  startCleanupJob() {
    setInterval(() => {
      this.cleanupExpiredTokens();
    }, this.cleanupInterval);

    manufacturingLogger.info('Password reset cleanup job started', {
      interval: this.cleanupInterval,
      category: 'password_reset_cleanup'
    });
  }

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} Is valid email
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {boolean} Is valid password
   */
  isValidPassword(password) {
    // Minimum 8 characters, at least one uppercase, one lowercase, one number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }

  /**
   * Get password reset statistics
   * @returns {Promise<Object>} Statistics
   */
  async getStatistics() {
    try {
      const queries = {
        activeTokens: `
          SELECT COUNT(*) as count
          FROM password_reset_tokens
          WHERE expires_at > CURRENT_TIMESTAMP
        `,
        expiredTokens: `
          SELECT COUNT(*) as count
          FROM password_reset_tokens
          WHERE expires_at <= CURRENT_TIMESTAMP
        `,
        recentRequests: `
          SELECT COUNT(*) as count
          FROM password_reset_tokens
          WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
        `
      };

      const results = {};
      for (const [key, query] of Object.entries(queries)) {
        const result = await databaseManager.query(query);
        results[key] = parseInt(result.rows[0].count);
      }

      return results;

    } catch (error) {
      manufacturingLogger.error('Failed to get password reset statistics', {
        error: error.message
      });
      return null;
    }
  }
}

// Export singleton instance
export const passwordResetService = new PasswordResetService();
export default passwordResetService;
