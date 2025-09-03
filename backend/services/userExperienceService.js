// User Experience Service
// Manufacturing-optimized advanced UX features for authentication system

import { sessionManager } from './sessionManager.js';
import { tokenRotationService } from './tokenRotationService.js';
import { authPerformanceMonitor } from './authPerformanceMonitor.js';
import { User } from '../models/index.js';
import { manufacturingLogger } from '../middleware/logger.js';
import { getRedisClient, REDIS_KEYS, generateRedisKey } from '../config/redis.js';
import bcrypt from 'bcryptjs';

/**
 * User Experience Service
 * Provides advanced UX features for authentication and user management
 */
class UserExperienceService {
  constructor() {
    this.rememberMeTTL = 30 * 24 * 60 * 60 * 1000; // 30 days
    this.progressiveAuthSteps = {
      BASIC: ['username', 'password'],
      MFA: ['username', 'password', 'mfa_code'],
      VERIFICATION: ['username', 'password', 'mfa_code', 'verification'],
      APPROVAL: ['username', 'password', 'mfa_code', 'verification', 'approval']
    };
    
    this.userPreferences = {
      theme: 'light',
      language: 'en',
      timezone: 'UTC',
      notifications: true,
      sessionTimeout: 3600,
      mfaRequired: false
    };
  }

  /**
   * Progressive Authentication Flow
   * Handles multi-step authentication for complex roles
   */
  async progressiveAuthentication(authData, currentStep = 'BASIC') {
    try {
      const { username, password, mfaCode, verificationCode, approvalCode, rememberMe } = authData;
      
      // Track authentication attempt
      const attemptData = await authPerformanceMonitor.trackAuthAttempt({
        username,
        ip: authData.ip,
        userAgent: authData.userAgent,
        attemptType: 'progressive_auth'
      });

      const startTime = Date.now();

      // Step 1: Basic Authentication
      if (currentStep === 'BASIC') {
        const basicAuth = await this.authenticateBasic(username, password);
        if (!basicAuth.success) {
          await authPerformanceMonitor.recordFailedAuth(attemptData, basicAuth.error, Date.now() - startTime);
          return {
            success: false,
            error: basicAuth.error,
            nextStep: null,
            requiresMFA: basicAuth.requiresMFA,
            requiresVerification: basicAuth.requiresVerification,
            requiresApproval: basicAuth.requiresApproval
          };
        }

        // Check if user requires additional steps
        const user = basicAuth.user;
        const nextStep = this.determineNextStep(user);
        
        if (nextStep === 'COMPLETE') {
          // Complete authentication
          const sessionData = await this.createUserSession(user, authData, rememberMe);
          await authPerformanceMonitor.recordSuccessfulAuth(attemptData, Date.now() - startTime, user.id, sessionData.sessionId);
          
          return {
            success: true,
            user: this.sanitizeUserData(user),
            session: sessionData,
            nextStep: 'COMPLETE',
            requiresMFA: false,
            requiresVerification: false,
            requiresApproval: false
          };
        }

        // Return next step information
        return {
          success: true,
          user: this.sanitizeUserData(user),
          nextStep,
          requiresMFA: nextStep === 'MFA',
          requiresVerification: nextStep === 'VERIFICATION',
          requiresApproval: nextStep === 'APPROVAL',
          tempToken: await this.generateTempToken(user.id, nextStep)
        };
      }

      // Step 2: MFA Authentication
      if (currentStep === 'MFA') {
        const mfaAuth = await this.authenticateMFA(username, mfaCode);
        if (!mfaAuth.success) {
          await authPerformanceMonitor.recordFailedAuth(attemptData, mfaAuth.error, Date.now() - startTime);
          return {
            success: false,
            error: mfaAuth.error,
            nextStep: 'MFA',
            requiresMFA: true
          };
        }

        const user = mfaAuth.user;
        const nextStep = this.determineNextStep(user);
        
        if (nextStep === 'COMPLETE') {
          const sessionData = await this.createUserSession(user, authData, rememberMe);
          await authPerformanceMonitor.recordSuccessfulAuth(attemptData, Date.now() - startTime, user.id, sessionData.sessionId);
          
          return {
            success: true,
            user: this.sanitizeUserData(user),
            session: sessionData,
            nextStep: 'COMPLETE'
          };
        }

        return {
          success: true,
          user: this.sanitizeUserData(user),
          nextStep,
          requiresVerification: nextStep === 'VERIFICATION',
          requiresApproval: nextStep === 'APPROVAL',
          tempToken: await this.generateTempToken(user.id, nextStep)
        };
      }

      // Step 3: Verification (if required)
      if (currentStep === 'VERIFICATION') {
        const verificationAuth = await this.authenticateVerification(username, verificationCode);
        if (!verificationAuth.success) {
          await authPerformanceMonitor.recordFailedAuth(attemptData, verificationAuth.error, Date.now() - startTime);
          return {
            success: false,
            error: verificationAuth.error,
            nextStep: 'VERIFICATION',
            requiresVerification: true
          };
        }

        const user = verificationAuth.user;
        const nextStep = this.determineNextStep(user);
        
        if (nextStep === 'COMPLETE') {
          const sessionData = await this.createUserSession(user, authData, rememberMe);
          await authPerformanceMonitor.recordSuccessfulAuth(attemptData, Date.now() - startTime, user.id, sessionData.sessionId);
          
          return {
            success: true,
            user: this.sanitizeUserData(user),
            session: sessionData,
            nextStep: 'COMPLETE'
          };
        }

        return {
          success: true,
          user: this.sanitizeUserData(user),
          nextStep,
          requiresApproval: nextStep === 'APPROVAL',
          tempToken: await this.generateTempToken(user.id, nextStep)
        };
      }

      // Step 4: Approval (if required)
      if (currentStep === 'APPROVAL') {
        const approvalAuth = await this.authenticateApproval(username, approvalCode);
        if (!approvalAuth.success) {
          await authPerformanceMonitor.recordFailedAuth(attemptData, approvalAuth.error, Date.now() - startTime);
          return {
            success: false,
            error: approvalAuth.error,
            nextStep: 'APPROVAL',
            requiresApproval: true
          };
        }

        const user = approvalAuth.user;
        const sessionData = await this.createUserSession(user, authData, rememberMe);
        await authPerformanceMonitor.recordSuccessfulAuth(attemptData, Date.now() - startTime, user.id, sessionData.sessionId);
        
        return {
          success: true,
          user: this.sanitizeUserData(user),
          session: sessionData,
          nextStep: 'COMPLETE'
        };
      }

      throw new Error('Invalid authentication step');

    } catch (error) {
      manufacturingLogger.error('Progressive authentication failed', {
        error: error.message,
        username: authData.username,
        currentStep,
        category: 'user_experience'
      });
      
      return {
        success: false,
        error: error.message,
        nextStep: null
      };
    }
  }

  /**
   * Basic authentication (username/password)
   */
  async authenticateBasic(username, password) {
    try {
      const user = await User.findOne({ where: { username } });
      if (!user) {
        return {
          success: false,
          error: 'Invalid credentials',
          requiresMFA: false,
          requiresVerification: false,
          requiresApproval: false
        };
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return {
          success: false,
          error: 'Invalid credentials',
          requiresMFA: false,
          requiresVerification: false,
          requiresApproval: false
        };
      }

      // Check if user is active
      if (user.status !== 'ACTIVE') {
        return {
          success: false,
          error: 'Account is not active',
          requiresMFA: false,
          requiresVerification: false,
          requiresApproval: false
        };
      }

      return {
        success: true,
        user,
        requiresMFA: user.mfaEnabled,
        requiresVerification: user.requiresVerification,
        requiresApproval: user.requiresApproval
      };

    } catch (error) {
      manufacturingLogger.error('Basic authentication failed', {
        error: error.message,
        username,
        category: 'user_experience'
      });
      
      return {
        success: false,
        error: 'Authentication failed',
        requiresMFA: false,
        requiresVerification: false,
        requiresApproval: false
      };
    }
  }

  /**
   * MFA authentication
   */
  async authenticateMFA(username, mfaCode) {
    try {
      const user = await User.findOne({ where: { username } });
      if (!user || !user.mfaEnabled) {
        return {
          success: false,
          error: 'MFA not enabled for this user'
        };
      }

      // Validate MFA code (placeholder - implement actual MFA validation)
      const isValidMFACode = await this.validateMFACode(user.id, mfaCode);
      if (!isValidMFACode) {
        return {
          success: false,
          error: 'Invalid MFA code'
        };
      }

      return {
        success: true,
        user
      };

    } catch (error) {
      manufacturingLogger.error('MFA authentication failed', {
        error: error.message,
        username,
        category: 'user_experience'
      });
      
      return {
        success: false,
        error: 'MFA authentication failed'
      };
    }
  }

  /**
   * Verification authentication
   */
  async authenticateVerification(username, verificationCode) {
    try {
      const user = await User.findOne({ where: { username } });
      if (!user || !user.requiresVerification) {
        return {
          success: false,
          error: 'Verification not required for this user'
        };
      }

      // Validate verification code (placeholder - implement actual verification)
      const isValidVerification = await this.validateVerificationCode(user.id, verificationCode);
      if (!isValidVerification) {
        return {
          success: false,
          error: 'Invalid verification code'
        };
      }

      return {
        success: true,
        user
      };

    } catch (error) {
      manufacturingLogger.error('Verification authentication failed', {
        error: error.message,
        username,
        category: 'user_experience'
      });
      
      return {
        success: false,
        error: 'Verification authentication failed'
      };
    }
  }

  /**
   * Approval authentication
   */
  async authenticateApproval(username, approvalCode) {
    try {
      const user = await User.findOne({ where: { username } });
      if (!user || !user.requiresApproval) {
        return {
          success: false,
          error: 'Approval not required for this user'
        };
      }

      // Validate approval code (placeholder - implement actual approval)
      const isValidApproval = await this.validateApprovalCode(user.id, approvalCode);
      if (!isValidApproval) {
        return {
          success: false,
          error: 'Invalid approval code'
        };
      }

      return {
        success: true,
        user
      };

    } catch (error) {
      manufacturingLogger.error('Approval authentication failed', {
        error: error.message,
        username,
        category: 'user_experience'
      });
      
      return {
        success: false,
        error: 'Approval authentication failed'
      };
    }
  }

  /**
   * Determine next authentication step
   */
  determineNextStep(user) {
    if (user.requiresApproval) {
      return 'APPROVAL';
    } else if (user.requiresVerification) {
      return 'VERIFICATION';
    } else if (user.mfaEnabled) {
      return 'MFA';
    } else {
      return 'COMPLETE';
    }
  }

  /**
   * Create user session with remember me support
   */
  async createUserSession(user, authData, rememberMe = false) {
    try {
      const sessionData = {
        userId: user.id,
        username: user.username,
        role: user.role,
        ip: authData.ip,
        userAgent: authData.userAgent,
        deviceFingerprint: tokenRotationService.generateDeviceFingerprint(authData),
        rememberMe: rememberMe || false,
        expiresAt: rememberMe ? 
          new Date(Date.now() + this.rememberMeTTL) : 
          new Date(Date.now() + (24 * 60 * 60 * 1000)) // 24 hours
      };

      const sessionId = await sessionManager.createSession(sessionData);
      
      // Generate tokens
      const tokens = await tokenRotationService.generateTokenPair(user.id, sessionId);
      
      return {
        sessionId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: sessionData.expiresAt,
        rememberMe: sessionData.rememberMe
      };

    } catch (error) {
      manufacturingLogger.error('Failed to create user session', {
        error: error.message,
        userId: user.id,
        category: 'user_experience'
      });
      throw error;
    }
  }

  /**
   * Generate temporary token for multi-step authentication
   */
  async generateTempToken(userId, step) {
    try {
      const redis = getRedisClient();
      const tempToken = `temp_${Date.now()}_${userId}_${step}`;
      const tempTokenData = {
        userId,
        step,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + (5 * 60 * 1000)).toISOString() // 5 minutes
      };

      await redis.setex(
        generateRedisKey(REDIS_KEYS.CACHE, `temp_token:${tempToken}`),
        300, // 5 minutes TTL
        JSON.stringify(tempTokenData)
      );

      return tempToken;

    } catch (error) {
      manufacturingLogger.error('Failed to generate temp token', {
        error: error.message,
        userId,
        step,
        category: 'user_experience'
      });
      return null;
    }
  }

  /**
   * Validate temporary token
   */
  async validateTempToken(tempToken, step) {
    try {
      const redis = getRedisClient();
      const tokenKey = generateRedisKey(REDIS_KEYS.CACHE, `temp_token:${tempToken}`);
      const tokenData = await redis.get(tokenKey);

      if (!tokenData) {
        return { valid: false, error: 'Token expired or invalid' };
      }

      const parsedData = JSON.parse(tokenData);
      if (parsedData.step !== step) {
        return { valid: false, error: 'Invalid token step' };
      }

      if (new Date(parsedData.expiresAt) < new Date()) {
        return { valid: false, error: 'Token expired' };
      }

      return { valid: true, data: parsedData };

    } catch (error) {
      manufacturingLogger.error('Failed to validate temp token', {
        error: error.message,
        tempToken,
        category: 'user_experience'
      });
      return { valid: false, error: 'Token validation failed' };
    }
  }

  /**
   * Bulk User Management Operations
   */
  async bulkUserOperations(operations, adminUserId) {
    try {
      const results = {
        total: operations.length,
        successful: 0,
        failed: 0,
        details: []
      };

      for (const operation of operations) {
        try {
          const result = await this.executeBulkOperation(operation, adminUserId);
          results.details.push({
            operation: operation.type,
            userId: operation.userId,
            success: result.success,
            message: result.message
          });

          if (result.success) {
            results.successful++;
          } else {
            results.failed++;
          }
        } catch (error) {
          results.details.push({
            operation: operation.type,
            userId: operation.userId,
            success: false,
            message: error.message
          });
          results.failed++;
        }
      }

      // Log bulk operation
      manufacturingLogger.info('Bulk user operations completed', {
        adminUserId,
        total: results.total,
        successful: results.successful,
        failed: results.failed,
        category: 'user_experience'
      });

      return results;

    } catch (error) {
      manufacturingLogger.error('Bulk user operations failed', {
        error: error.message,
        adminUserId,
        category: 'user_experience'
      });
      throw error;
    }
  }

  /**
   * Execute individual bulk operation
   */
  async executeBulkOperation(operation, adminUserId) {
    const { type, userId, data } = operation;

    try {
      switch (type) {
        case 'ACTIVATE':
          await User.update({ status: 'ACTIVE' }, { where: { id: userId } });
          return { success: true, message: 'User activated successfully' };

        case 'DEACTIVATE':
          await User.update({ status: 'INACTIVE' }, { where: { id: userId } });
          // Terminate active sessions
          await sessionManager.terminateUserSessions(userId);
          return { success: true, message: 'User deactivated successfully' };

        case 'RESET_PASSWORD':
          const newPassword = await this.generateSecurePassword();
          const hashedPassword = await bcrypt.hash(newPassword, 12);
          await User.update({ password: hashedPassword }, { where: { id: userId } });
          // Terminate active sessions
          await sessionManager.terminateUserSessions(userId);
          return { success: true, message: 'Password reset successfully', newPassword };

        case 'UPDATE_ROLE':
          await User.update({ role: data.role }, { where: { id: userId } });
          return { success: true, message: 'Role updated successfully' };

        case 'ENABLE_MFA':
          await User.update({ mfaEnabled: true }, { where: { id: userId } });
          return { success: true, message: 'MFA enabled successfully' };

        case 'DISABLE_MFA':
          await User.update({ mfaEnabled: false }, { where: { id: userId } });
          return { success: true, message: 'MFA disabled successfully' };

        case 'UPDATE_PREFERENCES':
          await this.updateUserPreferences(userId, data.preferences);
          return { success: true, message: 'Preferences updated successfully' };

        default:
          return { success: false, message: 'Unknown operation type' };
      }
    } catch (error) {
      manufacturingLogger.error('Bulk operation failed', {
        error: error.message,
        operation: type,
        userId,
        adminUserId,
        category: 'user_experience'
      });
      
      return { success: false, message: error.message };
    }
  }

  /**
   * Generate secure password
   */
  async generateSecurePassword(length = 12) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return password;
  }

  /**
   * User Preferences Management
   */
  async getUserPreferences(userId) {
    try {
      const redis = getRedisClient();
      const prefsKey = generateRedisKey(REDIS_KEYS.CACHE, `user_prefs:${userId}`);
      
      const cachedPrefs = await redis.get(prefsKey);
      if (cachedPrefs) {
        return JSON.parse(cachedPrefs);
      }

      // Get from database or use defaults
      const user = await User.findByPk(userId);
      const preferences = user?.preferences ? 
        { ...this.userPreferences, ...user.preferences } : 
        this.userPreferences;

      // Cache preferences
      await redis.setex(prefsKey, 3600, JSON.stringify(preferences)); // 1 hour TTL
      
      return preferences;

    } catch (error) {
      manufacturingLogger.error('Failed to get user preferences', {
        error: error.message,
        userId,
        category: 'user_experience'
      });
      
      return this.userPreferences; // Return defaults on error
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(userId, newPreferences) {
    try {
      const currentPrefs = await this.getUserPreferences(userId);
      const updatedPrefs = { ...currentPrefs, ...newPreferences };

      // Update database
      await User.update(
        { preferences: updatedPrefs },
        { where: { id: userId } }
      );

      // Update cache
      const redis = getRedisClient();
      const prefsKey = generateRedisKey(REDIS_KEYS.CACHE, `user_prefs:${userId}`);
      await redis.setex(prefsKey, 3600, JSON.stringify(updatedPrefs));

      // Log preference update
      manufacturingLogger.info('User preferences updated', {
        userId,
        updatedFields: Object.keys(newPreferences),
        category: 'user_experience'
      });

      return updatedPrefs;

    } catch (error) {
      manufacturingLogger.error('Failed to update user preferences', {
        error: error.message,
        userId,
        category: 'user_experience'
      });
      throw error;
    }
  }

  /**
   * Remember Me Token Management
   */
  async createRememberMeToken(userId, deviceInfo) {
    try {
      const redis = getRedisClient();
      const rememberToken = `remember_${Date.now()}_${userId}`;
      
      const tokenData = {
        userId,
        deviceInfo,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + this.rememberMeTTL).toISOString()
      };

      await redis.setex(
        generateRedisKey(REDIS_KEYS.CACHE, `remember_token:${rememberToken}`),
        this.rememberMeTTL / 1000,
        JSON.stringify(tokenData)
      );

      return rememberToken;

    } catch (error) {
      manufacturingLogger.error('Failed to create remember me token', {
        error: error.message,
        userId,
        category: 'user_experience'
      });
      return null;
    }
  }

  /**
   * Validate remember me token
   */
  async validateRememberMeToken(rememberToken) {
    try {
      const redis = getRedisClient();
      const tokenKey = generateRedisKey(REDIS_KEYS.CACHE, `remember_token:${rememberToken}`);
      const tokenData = await redis.get(tokenKey);

      if (!tokenData) {
        return { valid: false, error: 'Token expired or invalid' };
      }

      const parsedData = JSON.parse(tokenData);
      if (new Date(parsedData.expiresAt) < new Date()) {
        return { valid: false, error: 'Token expired' };
      }

      return { valid: true, data: parsedData };

    } catch (error) {
      manufacturingLogger.error('Failed to validate remember me token', {
        error: error.message,
        category: 'user_experience'
      });
      return { valid: false, error: 'Token validation failed' };
    }
  }

  /**
   * Revoke remember me token
   */
  async revokeRememberMeToken(rememberToken) {
    try {
      const redis = getRedisClient();
      const tokenKey = generateRedisKey(REDIS_KEYS.CACHE, `remember_token:${rememberToken}`);
      await redis.del(tokenKey);

      manufacturingLogger.info('Remember me token revoked', {
        token: rememberToken,
        category: 'user_experience'
      });

      return true;

    } catch (error) {
      manufacturingLogger.error('Failed to revoke remember me token', {
        error: error.message,
        token: rememberToken,
        category: 'user_experience'
      });
      return false;
    }
  }

  /**
   * Sanitize user data for response
   */
  sanitizeUserData(user) {
    const { password, ...sanitizedUser } = user.toJSON();
    return sanitizedUser;
  }

  /**
   * Placeholder MFA validation (implement actual MFA logic)
   */
  async validateMFACode(userId, mfaCode) {
    // TODO: Implement actual MFA validation
    // For now, accept any 6-digit code
    return /^\d{6}$/.test(mfaCode);
  }

  /**
   * Placeholder verification validation (implement actual verification logic)
   */
  async validateVerificationCode(userId, verificationCode) {
    // TODO: Implement actual verification logic
    // For now, accept any 4-digit code
    return /^\d{4}$/.test(verificationCode);
  }

  /**
   * Placeholder approval validation (implement actual approval logic)
   */
  async validateApprovalCode(userId, approvalCode) {
    // TODO: Implement actual approval logic
    // For now, accept any 6-digit code
    return /^\d{6}$/.test(approvalCode);
  }

  /**
   * Get user experience statistics
   */
  async getUserExperienceStats() {
    try {
      const redis = getRedisClient();
      
      // Get remember me tokens count
      const rememberTokens = await redis.keys(generateRedisKey(REDIS_KEYS.CACHE, 'remember_token:*'));
      
      // Get user preferences count
      const userPrefs = await redis.keys(generateRedisKey(REDIS_KEYS.CACHE, 'user_prefs:*'));
      
      // Get active sessions count
      const activeSessions = await sessionManager.getSessionStats();
      
      return {
        timestamp: new Date().toISOString(),
        rememberMeTokens: rememberTokens.length,
        userPreferences: userPrefs.length,
        activeSessions: activeSessions?.activeSessions || 0,
        uniqueUsers: activeSessions?.uniqueUsers || 0
      };

    } catch (error) {
      manufacturingLogger.error('Failed to get user experience stats', {
        error: error.message,
        category: 'user_experience'
      });
      return null;
    }
  }
}

// Export singleton instance
export const userExperienceService = new UserExperienceService();
export default userExperienceService;
