// Enhanced authentication controller with Redis session management
// Manufacturing-optimized authentication with advanced features

import { sessionManager } from '../../services/sessionManager.js';
import { User } from '../../models/index.js';
import { 
  successResponse, 
  errorResponse, 
  manufacturingResponse 
} from '../../utils/index.js';
import { manufacturingLogger } from '../../middleware/logger.js';
import { 
  AuthenticationError, 
  ValidationError, 
  asyncHandler 
} from '../../middleware/errorHandler.js';

/**
 * Enhanced login endpoint with Redis session management
 * POST /api/v1/auth/enhanced-login
 */
export const enhancedLogin = asyncHandler(async (req, res) => {
  const { username, password, stationId } = req.body;

  // Validate input
  if (!username || !password) {
    throw new ValidationError('Username and password are required', {
      fields: ['username', 'password'],
      reason: 'missing_credentials'
    });
  }

  // Authenticate user
  const user = await User.authenticate(username, password);
  
  // Create Redis-based session
  const sessionResult = await sessionManager.createSession(user, stationId);
  
  // Log successful login
  manufacturingLogger.info('Enhanced login successful', {
    userId: user.id,
    username: user.username,
    role: user.role,
    sessionId: sessionResult.sessionId,
    stationId: stationId || 'not_specified',
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    category: 'authentication'
  });

  // Prepare response data
  const responseData = {
    user: user.toPublicJSON(),
    session: {
      id: sessionResult.sessionId,
      loginTime: sessionResult.sessionData.loginTime,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      stationContext: stationId || null
    },
    tokens: sessionResult.tokens,
    permissions: sessionResult.sessionData.permissions
  };

  res.status(200).json(manufacturingResponse(
    responseData,
    'Enhanced login successful',
    {
      action: 'enhanced_login',
      sessionId: sessionResult.sessionId,
      timestamp: req.timestamp
    }
  ));
});

/**
 * Enhanced logout endpoint with session invalidation
 * POST /api/v1/auth/enhanced-logout
 */
export const enhancedLogout = asyncHandler(async (req, res) => {
  const { sessionId } = req.body;
  const token = req.token?.raw;

  if (!sessionId) {
    throw new ValidationError('Session ID required', {
      field: 'sessionId',
      reason: 'missing_session_id'
    });
  }

  // Invalidate session and blacklist token
  const invalidated = await sessionManager.invalidateSession(sessionId, token, 'enhanced_logout');

  if (invalidated) {
    manufacturingLogger.info('Enhanced logout successful', {
      userId: req.user?.id,
      username: req.user?.username,
      sessionId,
      ip: req.ip,
      category: 'authentication'
    });

    res.status(200).json(manufacturingResponse(
      { sessionId, invalidated: true },
      'Enhanced logout successful',
      {
        action: 'enhanced_logout',
        sessionId,
        timestamp: req.timestamp
      }
    ));
  } else {
    throw new ValidationError('Session not found or already invalidated', {
      reason: 'session_not_found'
    });
  }
});

/**
 * Get session information
 * GET /api/v1/auth/session/:sessionId
 */
export const getSessionInfo = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  // Validate session
  const sessionValidation = await sessionManager.validateSession(sessionId, req.token?.raw);
  
  if (!sessionValidation.valid) {
    throw new AuthenticationError('Invalid or expired session', {
      reason: sessionValidation.reason
    });
  }

  const { session, permissions } = sessionValidation;

  // Check if user can access this session
  if (req.user.role !== 'SYSTEM_ADMIN' && req.user.id !== session.userId) {
    throw new AuthenticationError('Access denied to session', {
      reason: 'session_access_denied'
    });
  }

  res.status(200).json(manufacturingResponse(
    {
      session: {
        id: session.id,
        userId: session.userId,
        username: session.username,
        role: session.role,
        stationId: session.stationId,
        loginTime: session.loginTime,
        lastActivity: session.lastActivity,
        deviceFingerprint: session.deviceFingerprint
      },
      permissions
    },
    'Session information retrieved',
    {
      action: 'get_session_info',
      sessionId,
      timestamp: req.timestamp
    }
  ));
});

/**
 * Get user's active sessions
 * GET /api/v1/auth/sessions/active
 */
export const getActiveSessions = asyncHandler(async (req, res) => {
  const userId = req.params.userId || req.user.id;

  // Check permissions
  if (req.user.role !== 'SYSTEM_ADMIN' && req.user.id !== userId) {
    throw new AuthenticationError('Access denied to user sessions', {
      reason: 'session_access_denied'
    });
  }

  const sessions = await sessionManager.getUserActiveSessions(userId);

  res.status(200).json(manufacturingResponse(
    {
      userId,
      sessions: sessions.map(session => ({
        id: session.id,
        loginTime: session.loginTime,
        lastActivity: session.lastActivity,
        stationId: session.stationId,
        deviceFingerprint: session.deviceFingerprint
      })),
      count: sessions.length
    },
    'Active sessions retrieved',
    {
      action: 'get_active_sessions',
      userId,
      timestamp: req.timestamp
    }
  ));
});

/**
 * Force logout user from all sessions
 * POST /api/v1/auth/sessions/force-logout
 */
export const forceLogoutUser = asyncHandler(async (req, res) => {
  const { userId, reason } = req.body;

  // Only system admins can force logout users
  if (req.user.role !== 'SYSTEM_ADMIN') {
    throw new AuthenticationError('Insufficient permissions for force logout', {
      reason: 'insufficient_permissions'
    });
  }

  if (!userId) {
    throw new ValidationError('User ID required', {
      field: 'userId',
      reason: 'missing_user_id'
    });
  }

  const sessionsCount = await sessionManager.forceLogoutUser(userId, reason || 'admin_forced');

  manufacturingLogger.info('User force logged out from all sessions', {
    adminUserId: req.user.id,
    adminUsername: req.user.username,
    targetUserId: userId,
    reason: reason || 'admin_forced',
    sessionsCount,
    category: 'authentication'
  });

  res.status(200).json(manufacturingResponse(
    {
      userId,
      sessionsCount,
      reason: reason || 'admin_forced'
    },
    'User force logged out from all sessions',
    {
      action: 'force_logout_user',
      targetUserId: userId,
      timestamp: req.timestamp
    }
  ));
});

/**
 * Get session statistics
 * GET /api/v1/auth/sessions/stats
 */
export const getSessionStats = asyncHandler(async (req, res) => {
  // Only system admins and QC managers can view session stats
  if (!['SYSTEM_ADMIN', 'QC_MANAGER'].includes(req.user.role)) {
    throw new AuthenticationError('Insufficient permissions for session stats', {
      reason: 'insufficient_permissions'
    });
  }

  const stats = await sessionManager.getSessionStats();

  res.status(200).json(manufacturingResponse(
    stats,
    'Session statistics retrieved',
    {
      action: 'get_session_stats',
      timestamp: req.timestamp
    }
  ));
});

/**
 * Refresh session with activity update
 * POST /api/v1/auth/session/refresh
 */
export const refreshSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    throw new ValidationError('Session ID required', {
      field: 'sessionId',
      reason: 'missing_session_id'
    });
  }

  // Validate and refresh session
  const sessionValidation = await sessionManager.validateSession(sessionId, req.token?.raw);
  
  if (!sessionValidation.valid) {
    throw new AuthenticationError('Invalid or expired session', {
      reason: sessionValidation.reason
    });
  }

  const { session, permissions } = sessionValidation;

  // Update session activity
  await sessionManager.updateSessionActivity(sessionId);

  res.status(200).json(manufacturingResponse(
    {
      session: {
        id: session.id,
        lastActivity: session.lastActivity,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
      permissions
    },
    'Session refreshed successfully',
    {
      action: 'refresh_session',
      sessionId,
      timestamp: req.timestamp
    }
  ));
});

/**
 * Validate token without full authentication
 * POST /api/v1/auth/token/validate
 */
export const validateToken = asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    throw new ValidationError('Token required', {
      field: 'token',
      reason: 'missing_token'
    });
  }

  // Check if token is blacklisted
  const isBlacklisted = await sessionManager.isTokenBlacklisted(token);
  
  if (isBlacklisted) {
    return res.status(200).json(manufacturingResponse(
      { valid: false, reason: 'token_blacklisted' },
      'Token validation completed',
      {
        action: 'validate_token',
        timestamp: req.timestamp
      }
    ));
  }

  try {
    // Verify token structure (without full session validation)
    const decoded = verifyToken(token, TOKEN_TYPES.ACCESS);
    
    res.status(200).json(manufacturingResponse(
      { 
        valid: true, 
        decoded: {
          userId: decoded.userId,
          role: decoded.role,
          exp: decoded.exp
        }
      },
      'Token validation completed',
      {
        action: 'validate_token',
        timestamp: req.timestamp
      }
    ));
  } catch (error) {
    res.status(200).json(manufacturingResponse(
      { valid: false, reason: 'invalid_token' },
      'Token validation completed',
      {
        action: 'validate_token',
        timestamp: req.timestamp
      }
    ));
  }
});

// Default export for the entire controller
export default {
  enhancedLogin,
  enhancedLogout,
  getSessionInfo,
  getActiveSessions,
  forceLogoutUser,
  getSessionStats,
  refreshSession,
  validateToken
};
