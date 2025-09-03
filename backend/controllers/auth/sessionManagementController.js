// Session management controller for manufacturing system
// Handles session creation, validation, invalidation, and cleanup

import { sessionManagementService } from '../../services/sessionManagementService.js';
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
 * Get session information
 * GET /api/v1/auth/sessions/:sessionId
 */
export const getSessionInfo = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  if (!sessionId) {
    throw new ValidationError('Session ID is required', {
      field: 'sessionId',
      reason: 'missing_parameter'
    });
  }

  try {
    const session = await sessionManagementService.getSession(sessionId);
    
    if (!session) {
      throw new ValidationError('Session not found', {
        field: 'sessionId',
        reason: 'session_not_found'
      });
    }

    // Only return session info if user owns it or is admin
    if (session.userId !== req.user?.id && !['SYSTEM_ADMIN', 'QC_MANAGER'].includes(req.user?.role)) {
      throw new AuthenticationError('Access denied', {
        reason: 'insufficient_permissions'
      });
    }

    manufacturingLogger.info('Session information retrieved', {
      sessionId,
      userId: session.userId,
      username: session.username,
      category: 'session_management'
    });

    res.status(200).json(
      successResponse('Session information retrieved', {
        session: {
          sessionId: session.sessionId,
          userId: session.userId,
          username: session.username,
          role: session.role,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
          lastActivity: session.lastActivity,
          isActive: session.isActive
        }
      })
    );

  } catch (error) {
    manufacturingLogger.error('Failed to get session information', {
      error: error.message,
      sessionId,
      category: 'session_management'
    });
    throw error;
  }
});

/**
 * Get user sessions
 * GET /api/v1/auth/sessions/user/:userId
 */
export const getUserSessions = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    throw new ValidationError('User ID is required', {
      field: 'userId',
      reason: 'missing_parameter'
    });
  }

  // Only allow users to see their own sessions or admins to see any sessions
  if (userId !== req.user?.id && !['SYSTEM_ADMIN', 'QC_MANAGER'].includes(req.user?.role)) {
    throw new AuthenticationError('Access denied', {
      reason: 'insufficient_permissions'
    });
  }

  try {
    const sessions = await sessionManagementService.getUserSessions(userId);

    manufacturingLogger.info('User sessions retrieved', {
      userId,
      sessionCount: sessions.length,
      category: 'session_management'
    });

    res.status(200).json(
      successResponse('User sessions retrieved', {
        userId,
        sessions: sessions.map(session => ({
          sessionId: session.sessionId,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
          lastActivity: session.lastActivity,
          isActive: session.isActive
        })),
        count: sessions.length
      })
    );

  } catch (error) {
    manufacturingLogger.error('Failed to get user sessions', {
      error: error.message,
      userId,
      category: 'session_management'
    });
    throw error;
  }
});

/**
 * Invalidate a specific session
 * DELETE /api/v1/auth/sessions/:sessionId
 */
export const invalidateSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { reason = 'manual_logout' } = req.body;

  if (!sessionId) {
    throw new ValidationError('Session ID is required', {
      field: 'sessionId',
      reason: 'missing_parameter'
    });
  }

  try {
    const session = await sessionManagementService.getSession(sessionId);
    
    if (!session) {
      throw new ValidationError('Session not found', {
        field: 'sessionId',
        reason: 'session_not_found'
      });
    }

    // Only allow users to invalidate their own sessions or admins to invalidate any session
    if (session.userId !== req.user?.id && !['SYSTEM_ADMIN'].includes(req.user?.role)) {
      throw new AuthenticationError('Access denied', {
        reason: 'insufficient_permissions'
      });
    }

    const success = await sessionManagementService.invalidateSession(sessionId, reason);

    if (!success) {
      throw new Error('Failed to invalidate session');
    }

    manufacturingLogger.info('Session invalidated', {
      sessionId,
      userId: session.userId,
      username: session.username,
      reason,
      adminUserId: req.user?.id,
      category: 'session_management'
    });

    res.status(200).json(
      manufacturingResponse({
        message: 'Session invalidated successfully',
        sessionId,
        userId: session.userId,
        username: session.username,
        reason
      }, {
        action: 'session_invalidated',
        sessionId,
        userId: session.userId,
        adminUserId: req.user?.id,
        timestamp: new Date().toISOString()
      })
    );

  } catch (error) {
    manufacturingLogger.error('Failed to invalidate session', {
      error: error.message,
      sessionId,
      adminUserId: req.user?.id,
      category: 'session_management'
    });
    throw error;
  }
});

/**
 * Invalidate all user sessions
 * DELETE /api/v1/auth/sessions/user/:userId/all
 */
export const invalidateAllUserSessions = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { reason = 'admin_force_logout', excludeCurrentSession = true } = req.body;

  if (!userId) {
    throw new ValidationError('User ID is required', {
      field: 'userId',
      reason: 'missing_parameter'
    });
  }

  // Only admins can invalidate all sessions for any user
  if (!['SYSTEM_ADMIN'].includes(req.user?.role)) {
    throw new AuthenticationError('Access denied', {
      reason: 'insufficient_permissions'
    });
  }

  try {
    const excludeSessionId = excludeCurrentSession ? req.user?.sessionId : null;
    const invalidatedCount = await sessionManagementService.invalidateAllUserSessions(
      userId, 
      reason, 
      excludeSessionId
    );

    manufacturingLogger.info('All user sessions invalidated', {
      userId,
      invalidatedCount,
      reason,
      adminUserId: req.user?.id,
      category: 'session_management'
    });

    res.status(200).json(
      manufacturingResponse({
        message: 'All user sessions invalidated successfully',
        userId,
        invalidatedCount,
        reason
      }, {
        action: 'all_sessions_invalidated',
        userId,
        invalidatedCount,
        adminUserId: req.user?.id,
        timestamp: new Date().toISOString()
      })
    );

  } catch (error) {
    manufacturingLogger.error('Failed to invalidate all user sessions', {
      error: error.message,
      userId,
      adminUserId: req.user?.id,
      category: 'session_management'
    });
    throw error;
  }
});

/**
 * Get session statistics (admin only)
 * GET /api/v1/auth/sessions/statistics
 */
export const getSessionStatistics = asyncHandler(async (req, res) => {
  try {
    const statistics = await sessionManagementService.getSessionStatistics();

    if (!statistics) {
      throw new Error('Failed to retrieve session statistics');
    }

    manufacturingLogger.info('Session statistics retrieved', {
      activeSessions: statistics.activeSessions,
      blacklistedTokens: statistics.blacklistedTokens,
      category: 'session_management'
    });

    res.status(200).json(
      successResponse('Session statistics retrieved', {
        statistics,
        timestamp: new Date().toISOString()
      })
    );

  } catch (error) {
    manufacturingLogger.error('Failed to retrieve session statistics', {
      error: error.message,
      category: 'session_management'
    });
    throw error;
  }
});

/**
 * Check if token is blacklisted
 * POST /api/v1/auth/sessions/check-token
 */
export const checkTokenBlacklist = asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    throw new ValidationError('Token is required', {
      field: 'token',
      reason: 'missing_parameter'
    });
  }

  try {
    const isBlacklisted = await sessionManagementService.isTokenBlacklisted(token);

    res.status(200).json(
      successResponse('Token blacklist status checked', {
        token: token.substring(0, 20) + '...', // Only show first 20 chars for security
        isBlacklisted,
        timestamp: new Date().toISOString()
      })
    );

  } catch (error) {
    manufacturingLogger.error('Failed to check token blacklist', {
      error: error.message,
      token: token ? 'provided' : 'missing',
      category: 'session_management'
    });
    throw error;
  }
});

/**
 * Force cleanup of expired sessions (admin only)
 * POST /api/v1/auth/sessions/cleanup
 */
export const forceCleanup = asyncHandler(async (req, res) => {
  try {
    await sessionManagementService.cleanupExpiredSessions();

    manufacturingLogger.info('Session cleanup forced', {
      adminUserId: req.user?.id,
      category: 'session_management'
    });

    res.status(200).json(
      successResponse('Session cleanup completed', {
        timestamp: new Date().toISOString()
      })
    );

  } catch (error) {
    manufacturingLogger.error('Failed to force session cleanup', {
      error: error.message,
      adminUserId: req.user?.id,
      category: 'session_management'
    });
    throw error;
  }
});

/**
 * Get session configuration (admin only)
 * GET /api/v1/auth/sessions/config
 */
export const getSessionConfig = asyncHandler(async (req, res) => {
  try {
    const config = {
      sessionExpirationHours: sessionManagementService.sessionExpirationHours,
      maxSessionsPerUser: sessionManagementService.maxSessionsPerUser,
      blacklistExpirationHours: sessionManagementService.blacklistExpirationHours,
      cleanupInterval: sessionManagementService.cleanupInterval
    };

    res.status(200).json(
      successResponse('Session configuration retrieved', {
        configuration: config,
        timestamp: new Date().toISOString()
      })
    );

  } catch (error) {
    manufacturingLogger.error('Failed to get session configuration', {
      error: error.message,
      category: 'session_management'
    });
    throw error;
  }
});

// Export all controller functions
export default {
  getSessionInfo,
  getUserSessions,
  invalidateSession,
  invalidateAllUserSessions,
  getSessionStatistics,
  checkTokenBlacklist,
  forceCleanup,
  getSessionConfig
};
