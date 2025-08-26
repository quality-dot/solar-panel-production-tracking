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

  // Authenticate user
  const user = await User.authenticate(username, password);
  
  // Generate token pair
  const tokens = generateTokenPair(user);

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
    permissions: {
      role: user.role,
      stationAccess: user.station_assignments,
      canAccessAllStations: ['SYSTEM_ADMIN', 'PRODUCTION_SUPERVISOR', 'QC_MANAGER'].includes(user.role)
    },
    session: {
      loginTime: new Date().toISOString(),
      expiresAt: getTokenExpiration(tokens.accessToken)?.expiresAt,
      stationContext: stationId || null
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
});

/**
 * User logout endpoint
 * POST /api/v1/auth/logout
 */
export const logout = asyncHandler(async (req, res) => {
  const authHeader = req.get('Authorization');
  const token = extractTokenFromHeader(authHeader);

  if (token) {
    try {
      const decoded = verifyToken(token, TOKEN_TYPES.ACCESS);
      
      // Log successful logout
      manufacturingLogger.info('User logout successful', {
        userId: decoded.userId,
        username: decoded.username,
        role: decoded.role,
        ip: req.ip,
        station: req.station?.id || 'unknown',
        category: 'authentication'
      });

      // TODO: Add token to blacklist/invalidation store
      // For now, we rely on short token expiry
      
    } catch (error) {
      // Log logout attempt even with invalid token
      manufacturingLogger.warn('Logout attempt with invalid token', {
        error: error.message,
        ip: req.ip,
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

  // TODO: Implement password change in User model
  // For now, we'll return a 501 response
  throw new ValidationError('Password change functionality not yet implemented', {
    reason: 'feature_not_implemented'
  });
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

