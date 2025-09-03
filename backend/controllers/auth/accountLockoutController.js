// Account lockout controller for manufacturing system
// Handles account lockout, recovery, and unlock operations

import { accountLockoutService } from '../../services/accountLockoutService.js';
import { manufacturingLogger } from '../../middleware/logger.js';
import { 
  successResponse, 
  errorResponse, 
  manufacturingResponse 
} from '../../utils/index.js';
import { 
  ValidationError, 
  AuthenticationError, 
  asyncHandler 
} from '../../middleware/errorHandler.js';

/**
 * Get account lockout status
 * GET /api/v1/auth/account-lockout/status/:userId
 */
export const getAccountLockoutStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    throw new ValidationError('User ID is required', {
      field: 'userId',
      reason: 'missing_parameter'
    });
  }

  try {
    const lockStatus = await accountLockoutService.isAccountLocked(userId);

    manufacturingLogger.info('Account lockout status retrieved', {
      userId,
      locked: lockStatus.locked,
      reason: lockStatus.reason,
      category: 'account_lockout'
    });

    res.status(200).json(
      successResponse('Account lockout status retrieved', {
        userId,
        locked: lockStatus.locked,
        reason: lockStatus.reason,
        lockoutUntil: lockStatus.lockoutUntil,
        remainingTime: lockStatus.remainingTime,
        timestamp: new Date().toISOString()
      })
    );

  } catch (error) {
    manufacturingLogger.error('Failed to get account lockout status', {
      error: error.message,
      userId,
      category: 'account_lockout'
    });
    throw error;
  }
});

/**
 * Unlock account (admin only)
 * POST /api/v1/auth/account-lockout/unlock/:userId
 */
export const unlockAccount = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { reason = 'admin_unlock' } = req.body;

  if (!userId) {
    throw new ValidationError('User ID is required', {
      field: 'userId',
      reason: 'missing_parameter'
    });
  }

  try {
    const unlockResult = await accountLockoutService.unlockAccount(
      userId, 
      reason, 
      req.user?.id
    );

    manufacturingLogger.info('Account unlocked by admin', {
      userId,
      username: unlockResult.username,
      reason,
      adminUserId: req.user?.id,
      category: 'account_lockout'
    });

    res.status(200).json(
      manufacturingResponse({
        message: 'Account unlocked successfully',
        userId: unlockResult.userId,
        username: unlockResult.username,
        reason: unlockResult.reason
      }, {
        action: 'account_unlocked',
        userId: unlockResult.userId,
        adminUserId: req.user?.id,
        timestamp: new Date().toISOString()
      })
    );

  } catch (error) {
    manufacturingLogger.error('Failed to unlock account', {
      error: error.message,
      userId,
      adminUserId: req.user?.id,
      category: 'account_lockout'
    });
    throw error;
  }
});

/**
 * Get lockout statistics (admin only)
 * GET /api/v1/auth/account-lockout/statistics
 */
export const getLockoutStatistics = asyncHandler(async (req, res) => {
  try {
    const statistics = await accountLockoutService.getLockoutStatistics();

    if (!statistics) {
      throw new Error('Failed to retrieve lockout statistics');
    }

    manufacturingLogger.info('Lockout statistics retrieved', {
      currentlyLocked: statistics.currentlyLocked,
      recentlyLocked: statistics.recentlyLocked,
      category: 'account_lockout'
    });

    res.status(200).json(
      successResponse('Lockout statistics retrieved', {
        statistics,
        timestamp: new Date().toISOString()
      })
    );

  } catch (error) {
    manufacturingLogger.error('Failed to retrieve lockout statistics', {
      error: error.message,
      category: 'account_lockout'
    });
    throw error;
  }
});

/**
 * Get user lockout history (admin only)
 * GET /api/v1/auth/account-lockout/history/:userId
 */
export const getUserLockoutHistory = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { limit = 50 } = req.query;

  if (!userId) {
    throw new ValidationError('User ID is required', {
      field: 'userId',
      reason: 'missing_parameter'
    });
  }

  try {
    const history = await accountLockoutService.getUserLockoutHistory(userId, parseInt(limit));

    manufacturingLogger.info('User lockout history retrieved', {
      userId,
      historyCount: history.length,
      category: 'account_lockout'
    });

    res.status(200).json(
      successResponse('User lockout history retrieved', {
        userId,
        history,
        count: history.length,
        timestamp: new Date().toISOString()
      })
    );

  } catch (error) {
    manufacturingLogger.error('Failed to retrieve user lockout history', {
      error: error.message,
      userId,
      category: 'account_lockout'
    });
    throw error;
  }
});

/**
 * Record failed login attempt (internal use)
 * POST /api/v1/auth/account-lockout/record-failed-attempt
 */
export const recordFailedAttempt = asyncHandler(async (req, res) => {
  const { userId, username, ipAddress, userAgent } = req.body;

  if (!userId || !username) {
    throw new ValidationError('User ID and username are required', {
      fields: ['userId', 'username'],
      reason: 'missing_required_fields'
    });
  }

  try {
    const result = await accountLockoutService.recordFailedAttempt(
      userId, 
      username, 
      ipAddress, 
      userAgent
    );

    manufacturingLogger.warn('Failed login attempt recorded', {
      userId,
      username,
      ipAddress,
      locked: result.locked,
      attemptCount: result.attemptCount,
      category: 'account_lockout'
    });

    res.status(200).json(
      manufacturingResponse({
        message: result.locked ? 'Account locked due to failed attempts' : 'Failed attempt recorded',
        locked: result.locked,
        attemptCount: result.attemptCount,
        remainingAttempts: result.remainingAttempts,
        lockoutUntil: result.lockoutUntil
      }, {
        action: result.locked ? 'account_locked' : 'failed_attempt_recorded',
        userId,
        username,
        timestamp: new Date().toISOString()
      })
    );

  } catch (error) {
    manufacturingLogger.error('Failed to record failed attempt', {
      error: error.message,
      userId,
      username,
      category: 'account_lockout'
    });
    throw error;
  }
});

/**
 * Record successful login (internal use)
 * POST /api/v1/auth/account-lockout/record-successful-login
 */
export const recordSuccessfulLogin = asyncHandler(async (req, res) => {
  const { userId, username, ipAddress } = req.body;

  if (!userId || !username) {
    throw new ValidationError('User ID and username are required', {
      fields: ['userId', 'username'],
      reason: 'missing_required_fields'
    });
  }

  try {
    await accountLockoutService.recordSuccessfulLogin(userId, username, ipAddress);

    manufacturingLogger.info('Successful login recorded', {
      userId,
      username,
      ipAddress,
      category: 'account_lockout'
    });

    res.status(200).json(
      successResponse('Successful login recorded', {
        userId,
        username,
        timestamp: new Date().toISOString()
      })
    );

  } catch (error) {
    manufacturingLogger.error('Failed to record successful login', {
      error: error.message,
      userId,
      username,
      category: 'account_lockout'
    });
    throw error;
  }
});

/**
 * Get lockout configuration (admin only)
 * GET /api/v1/auth/account-lockout/config
 */
export const getLockoutConfig = asyncHandler(async (req, res) => {
  try {
    const config = {
      maxFailedAttempts: accountLockoutService.maxFailedAttempts,
      lockoutDurationMinutes: accountLockoutService.lockoutDurationMinutes,
      maxLockoutDurationHours: accountLockoutService.maxLockoutDurationHours,
      cleanupInterval: accountLockoutService.cleanupInterval
    };

    res.status(200).json(
      successResponse('Lockout configuration retrieved', {
        configuration: config,
        timestamp: new Date().toISOString()
      })
    );

  } catch (error) {
    manufacturingLogger.error('Failed to get lockout configuration', {
      error: error.message,
      category: 'account_lockout'
    });
    throw error;
  }
});

// Export all controller functions
export default {
  getAccountLockoutStatus,
  unlockAccount,
  getLockoutStatistics,
  getUserLockoutHistory,
  recordFailedAttempt,
  recordSuccessfulLogin,
  getLockoutConfig
};
