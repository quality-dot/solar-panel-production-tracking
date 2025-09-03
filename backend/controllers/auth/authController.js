// Authentication controller for manufacturing system
// Login, logout, and token management for production floor users

import { User } from '../../models/index.js';
import { 
  generateTokenPair, 
  verifyToken, 
  extractTokenFromHeader, 
  getTokenExpiration,
  TOKEN_TYPES 
} from '../../utils/index.js';
import { successResponse, errorResponse, manufacturingResponse } from '../../utils/index.js';
import { manufacturingLogger } from '../../middleware/logger.js';
import { 
  AuthenticationError, 
  ValidationError, 
  asyncHandler 
} from '../../middleware/errorHandler.js';
import { securityEventService } from '../../services/securityEventService.js';
import { accountLockoutService } from '../../services/accountLockoutService.js';
import { sessionManagementService } from '../../services/sessionManagementService.js';

/**
 * User login endpoint
 * POST /api/v1/auth/login
 */
export const login = asyncHandler(async (req, res) => {
  const { username, password, stationId } = req.body;

  // Validate input
  if (!username || !password) {
    throw new ValidationError('Username and password are required', {
      fields: ['username', 'password'],
      reason: 'missing_credentials'
    });
  }

  try {
    // Authenticate user
    const user = await User.authenticate(username, password);
    
    // Check if account is locked
    const lockStatus = await accountLockoutService.isAccountLocked(user.id);
    if (lockStatus.locked) {
      throw new AuthenticationError('Account is locked', {
        reason: 'account_locked',
        lockoutUntil: lockStatus.lockoutUntil,
        remainingTime: lockStatus.remainingTime
      });
    }

    // Record successful login and clear failed attempts
    await accountLockoutService.recordSuccessfulLogin(
      user.id, 
      user.username, 
      req.ip
    );
    
    // Generate token pair
    const tokens = generateTokenPair(user);

    // Create session
    const session = await sessionManagementService.createSession(
      user.id,
      user.username,
      user.role,
      req.ip,
      req.get('User-Agent'),
      tokens.accessToken,
      tokens.refreshToken
    );

    // Log successful login
    manufacturingLogger.info('User login successful', {
      userId: user.id,
      username: user.username,
      role: user.role,
      stationId: stationId || 'not_specified',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      station: req.station?.id || 'unknown',
      category: 'authentication'
    });

    // Prepare response data
    const responseData = {
      user: user.toPublicJSON(),
      tokens,
      session: {
        sessionId: session.sessionId,
        loginTime: new Date().toISOString(),
        expiresAt: session.expiresAt,
        stationContext: stationId || null
      },
      permissions: {
        role: user.role,
        stationAccess: user.station_assignments,
        canAccessAllStations: ['SYSTEM_ADMIN', 'PRODUCTION_SUPERVISOR', 'QC_MANAGER'].includes(user.role)
      }
    };

    res.status(200).json(manufacturingResponse(
      responseData,
      'Login successful',
      {
        action: 'login',
        station: req.station?.id,
        timestamp: req.timestamp
      }
    ));

  } catch (error) {
    // Handle authentication failures
    if (error instanceof AuthenticationError && error.reason === 'invalid_credentials') {
      // Find user by username to record failed attempt
      try {
        const user = await User.findByUsername(username);
        if (user) {
          // Record failed attempt
          const lockoutResult = await accountLockoutService.recordFailedAttempt(
            user.id,
            user.username,
            req.ip,
            req.get('User-Agent')
          );

          // If account is now locked, include lockout information in error
          if (lockoutResult.locked) {
            throw new AuthenticationError('Account locked due to failed login attempts', {
              reason: 'account_locked',
              lockoutUntil: lockoutResult.lockoutUntil,
              attemptCount: lockoutResult.attemptCount
            });
          }
        }
      } catch (lockoutError) {
        manufacturingLogger.error('Failed to record failed login attempt', {
          error: lockoutError.message,
          username,
          ip: req.ip,
          category: 'account_lockout'
        });
      }
    }

    // Re-throw the original error
    throw error;
  }
});

/**
 * User logout endpoint
 * POST /api/v1/auth/logout
 */
export const logout = asyncHandler(async (req, res) => {
  const authHeader = req.get('Authorization');
  const token = extractTokenFromHeader(authHeader);
  const { sessionId } = req.body;

  if (token) {
    try {
      const decoded = verifyToken(token, TOKEN_TYPES.ACCESS);
      
      // Invalidate session if sessionId is provided
      if (sessionId) {
        try {
          await sessionManagementService.invalidateSession(sessionId, 'manual_logout');
        } catch (sessionError) {
          manufacturingLogger.warn('Failed to invalidate session during logout', {
            error: sessionError.message,
            sessionId,
            userId: decoded.userId,
            category: 'authentication'
          });
        }
      }
      
      // Log successful logout
      manufacturingLogger.info('User logout successful', {
        userId: decoded.userId,
        username: decoded.username,
        role: decoded.role,
        ip: req.ip,
        sessionId,
        station: req.station?.id || 'unknown',
        category: 'authentication'
      });
      
    } catch (error) {
      // Log logout attempt even with invalid token
      manufacturingLogger.warn('Logout attempt with invalid token', {
        error: error.message,
        ip: req.ip,
        sessionId,
        station: req.station?.id,
        category: 'authentication'
      });
    }
  }

  res.status(200).json(manufacturingResponse(
    { loggedOut: true },
    'Logout successful',
    {
      action: 'logout',
      station: req.station?.id,
      timestamp: req.timestamp
    }
  ));
});

/**
 * Refresh token endpoint
 * POST /api/v1/auth/refresh
 */
export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ValidationError('Refresh token is required', {
      field: 'refreshToken',
      reason: 'missing_refresh_token'
    });
  }

  // Verify refresh token
  const decoded = verifyToken(refreshToken, TOKEN_TYPES.REFRESH);

  // Get user from database (to check if still active)
  const user = await User.findById(decoded.userId);
  if (!user) {
    throw new AuthenticationError('User not found or inactive', {
      reason: 'user_not_found'
    });
  }

  // Check token version (for session invalidation)
  if (decoded.tokenVersion !== user.token_version) {
    throw new AuthenticationError('Refresh token has been invalidated', {
      reason: 'token_version_mismatch'
    });
  }

  // Generate new token pair
  const tokens = generateTokenPair(user);

  manufacturingLogger.info('Token refreshed successfully', {
    userId: user.id,
    username: user.username,
    role: user.role,
    station: req.station?.id,
    category: 'authentication'
  });

  const responseData = {
    tokens,
    user: user.toPublicJSON(),
    session: {
      refreshedAt: new Date().toISOString(),
      expiresAt: getTokenExpiration(tokens.accessToken)?.expiresAt
    }
  };

  res.status(200).json(manufacturingResponse(
    responseData,
    'Token refreshed successfully',
    {
      action: 'token_refresh',
      station: req.station?.id,
      timestamp: req.timestamp
    }
  ));
});

/**
 * Get current user profile
 * GET /api/v1/auth/me
 */
export const getProfile = asyncHandler(async (req, res) => {
  const authHeader = req.get('Authorization');
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    throw new AuthenticationError('Authentication token required', {
      reason: 'missing_token'
    });
  }

  // Verify token
  const decoded = verifyToken(token, TOKEN_TYPES.ACCESS);

  // Get fresh user data
  const user = await User.findById(decoded.userId);
  if (!user) {
    throw new AuthenticationError('User not found or inactive', {
      reason: 'user_not_found'
    });
  }

  const tokenInfo = getTokenExpiration(token);
  
  const responseData = {
    user: user.toPublicJSON(),
    session: {
      tokenExpiresAt: tokenInfo?.expiresAt,
      tokenExpiresInMinutes: tokenInfo?.expiresInMinutes,
      needsRefresh: tokenInfo?.expiresInMinutes < 5,
      currentStation: req.station?.id || null
    },
    permissions: {
      role: user.role,
      stationAccess: user.station_assignments,
      canAccessAllStations: ['SYSTEM_ADMIN', 'PRODUCTION_SUPERVISOR', 'QC_MANAGER'].includes(user.role)
    }
  };

  res.status(200).json(manufacturingResponse(
    responseData,
    'User profile retrieved',
    {
      action: 'get_profile',
      station: req.station?.id,
      timestamp: req.timestamp
    }
  ));
});

/**
 * Change password endpoint
 * POST /api/v1/auth/change-password
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const authHeader = req.get('Authorization');
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    throw new AuthenticationError('Authentication token required', {
      reason: 'missing_token'
    });
  }

  if (!currentPassword || !newPassword) {
    throw new ValidationError('Current password and new password are required', {
      fields: ['currentPassword', 'newPassword'],
      reason: 'missing_passwords'
    });
  }

  // Verify token and get user
  const decoded = verifyToken(token, TOKEN_TYPES.ACCESS);
  const user = await User.findById(decoded.userId);
  
  if (!user) {
    throw new AuthenticationError('User not found', {
      reason: 'user_not_found'
    });
  }

  // Verify current password
  const currentUser = await User.authenticate(user.username, currentPassword);
  if (!currentUser) {
    throw new AuthenticationError('Current password is incorrect', {
      reason: 'invalid_current_password'
    });
  }

  // Change password using User model method
  await user.changePassword(currentPassword, newPassword);

  res.status(200).json(manufacturingResponse(
    { message: 'Password changed successfully' },
    'Password changed successfully',
    {
      action: 'change_password',
      station: req.station?.id,
      timestamp: req.timestamp
    }
  ));
});

/**
 * Station assignment check endpoint
 * GET /api/v1/auth/station-access/:stationId
 */
export const checkStationAccess = asyncHandler(async (req, res) => {
  const { stationId } = req.params;
  const authHeader = req.get('Authorization');
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    throw new AuthenticationError('Authentication token required', {
      reason: 'missing_token'
    });
  }

  const stationIdNum = parseInt(stationId);
  if (!stationIdNum || stationIdNum < 1 || stationIdNum > 8) {
    throw new ValidationError('Invalid station ID', {
      field: 'stationId',
      value: stationId,
      validRange: '1-8',
      reason: 'invalid_station_id'
    });
  }

  // Verify token and get user
  const decoded = verifyToken(token, TOKEN_TYPES.ACCESS);
  const user = await User.findById(decoded.userId);
  
  if (!user) {
    throw new AuthenticationError('User not found', {
      reason: 'user_not_found'
    });
  }

  const hasAccess = user.hasStationAccess(stationIdNum);

  const responseData = {
    hasAccess,
    stationId: stationIdNum,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      stationAssignments: user.station_assignments
    },
    accessReason: hasAccess ? 
      (user.role === 'STATION_INSPECTOR' ? 'assigned_station' : 'elevated_permissions') :
      'no_access'
  };

  res.status(200).json(manufacturingResponse(
    responseData,
    `Station access ${hasAccess ? 'granted' : 'denied'}`,
    {
      action: 'station_access_check',
      stationId: stationIdNum,
      result: hasAccess ? 'granted' : 'denied',
      timestamp: req.timestamp
    }
  ));
});

export default {
  login,
  logout,
  refresh,
  getProfile,
  changePassword,
  checkStationAccess
};

