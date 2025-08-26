// Authentication and authorization middleware for manufacturing environment
// JWT verification, role-based access control, and station assignment validation

import { 
  verifyToken, 
  extractTokenFromHeader, 
  getTokenExpiration,
  TOKEN_TYPES 
} from '../utils/index.js';
import { 
  hasPermission, 
  hasStationPermission, 
  PERMISSIONS 
} from '../utils/index.js';
import { User } from '../models/index.js';
import { manufacturingLogger } from './logger.js';
import { 
  AuthenticationError, 
  AuthorizationError, 
  ValidationError 
} from './errorHandler.js';

/**
 * Authenticate JWT token middleware
 * Verifies token and adds user info to request
 */
export const authenticateJWT = async (req, res, next) => {
  try {
    const authHeader = req.get('Authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      throw new AuthenticationError('Authentication token required', {
        reason: 'missing_token'
      });
    }

    // Verify token
    const decoded = verifyToken(token, TOKEN_TYPES.ACCESS);

    // Get fresh user data from database
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new AuthenticationError('User not found or inactive', {
        reason: 'user_not_found',
        userId: decoded.userId
      });
    }

    // Check if token is about to expire
    const tokenInfo = getTokenExpiration(token);
    if (tokenInfo && tokenInfo.expiresInMinutes < 2) {
      manufacturingLogger.warn('Token expiring soon', {
        userId: user.id,
        username: user.username,
        expiresInMinutes: tokenInfo.expiresInMinutes,
        category: 'authentication'
      });
    }

    // Add user and token info to request
    req.user = user;
    req.token = {
      raw: token,
      decoded,
      expiresAt: tokenInfo?.expiresAt,
      expiresInMinutes: tokenInfo?.expiresInMinutes
    };

    manufacturingLogger.debug('User authenticated successfully', {
      userId: user.id,
      username: user.username,
      role: user.role,
      station: req.station?.id,
      category: 'authentication'
    });

    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return next(error);
    }

    manufacturingLogger.error('JWT authentication failed', {
      error: error.message,
      path: req.path,
      method: req.method,
      ip: req.ip,
      category: 'authentication'
    });

    next(new AuthenticationError('Authentication failed', {
      reason: 'authentication_error',
      details: error.message
    }));
  }
};

/**
 * Optional authentication middleware
 * Adds user info if token is present but doesn't require it
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.get('Authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      // No token provided, continue without authentication
      req.user = null;
      req.token = null;
      return next();
    }

    // Try to authenticate, but don't fail if token is invalid
    const decoded = verifyToken(token, TOKEN_TYPES.ACCESS);
    const user = await User.findById(decoded.userId);

    if (user) {
      const tokenInfo = getTokenExpiration(token);
      req.user = user;
      req.token = {
        raw: token,
        decoded,
        expiresAt: tokenInfo?.expiresAt,
        expiresInMinutes: tokenInfo?.expiresInMinutes
      };
    }

    next();
  } catch (error) {
    // Log warning but continue without authentication
    manufacturingLogger.warn('Optional authentication failed', {
      error: error.message,
      path: req.path,
      category: 'authentication'
    });

    req.user = null;
    req.token = null;
    next();
  }
};

/**
 * Role-based authorization middleware
 * Requires specific user roles to access the route
 */
export const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required', {
          reason: 'not_authenticated'
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        manufacturingLogger.warn('Unauthorized role access attempt', {
          userId: req.user.id,
          username: req.user.username,
          userRole: req.user.role,
          requiredRoles: allowedRoles,
          path: req.path,
          method: req.method,
          category: 'authorization'
        });

        throw new AuthorizationError('Insufficient permissions', req.user.role, {
          userRole: req.user.role,
          requiredRoles: allowedRoles,
          reason: 'insufficient_role'
        });
      }

      manufacturingLogger.debug('Role authorization successful', {
        userId: req.user.id,
        role: req.user.role,
        allowedRoles,
        category: 'authorization'
      });

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Permission-based authorization middleware
 * Requires specific permissions to access the route
 */
export const requirePermission = (...permissions) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required', {
          reason: 'not_authenticated'
        });
      }

      // Check if user has any of the required permissions
      const hasAnyPermission = permissions.some(permission => 
        hasPermission(req.user.role, permission)
      );

      if (!hasAnyPermission) {
        manufacturingLogger.warn('Unauthorized permission access attempt', {
          userId: req.user.id,
          username: req.user.username,
          userRole: req.user.role,
          requiredPermissions: permissions,
          path: req.path,
          method: req.method,
          category: 'authorization'
        });

        throw new AuthorizationError('Insufficient permissions', req.user.role, {
          userRole: req.user.role,
          requiredPermissions: permissions,
          reason: 'insufficient_permissions'
        });
      }

      manufacturingLogger.debug('Permission authorization successful', {
        userId: req.user.id,
        role: req.user.role,
        permissions,
        category: 'authorization'
      });

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Station assignment validation middleware
 * Ensures inspector users can only access assigned stations
 */
export const validateStationAssignment = (req, res, next) => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required', {
        reason: 'not_authenticated'
      });
    }

    // Extract station ID from params, body, or query
    const stationId = parseInt(req.params.id || req.params.stationId || req.body.stationId || req.query.stationId);
    
    if (!stationId || stationId < 1 || stationId > 8) {
      throw new ValidationError('Valid station ID required', {
        field: 'stationId',
        value: stationId,
        validRange: '1-8',
        reason: 'invalid_station_id'
      });
    }

    // Check station access
    if (!req.user.hasStationAccess(stationId)) {
      manufacturingLogger.warn('Unauthorized station access attempt', {
        userId: req.user.id,
        username: req.user.username,
        userRole: req.user.role,
        requestedStation: stationId,
        assignedStations: req.user.station_assignments,
        path: req.path,
        method: req.method,
        category: 'authorization'
      });

      throw new AuthorizationError('No access to this station', req.user.role, {
        requestedStation: stationId,
        assignedStations: req.user.station_assignments,
        reason: 'station_not_assigned'
      });
    }

    // Add station validation info to request
    req.validatedStation = {
      id: stationId,
      hasAccess: true,
      accessReason: req.user.role === 'STATION_INSPECTOR' ? 'assigned' : 'elevated_permissions'
    };

    manufacturingLogger.debug('Station access validated', {
      userId: req.user.id,
      stationId,
      accessReason: req.validatedStation.accessReason,
      category: 'authorization'
    });

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Station-specific permission validation
 * Combines permission checking with station assignment validation
 */
export const requireStationPermission = (...permissions) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required', {
          reason: 'not_authenticated'
        });
      }

      // Extract station ID
      const stationId = parseInt(req.params.id || req.params.stationId || req.body.stationId || req.query.stationId);
      
      if (!stationId || stationId < 1 || stationId > 8) {
        throw new ValidationError('Valid station ID required', {
          field: 'stationId',
          value: stationId,
          reason: 'invalid_station_id'
        });
      }

      // Check if user has any of the required permissions for this station
      const hasAnyStationPermission = permissions.some(permission => 
        hasStationPermission(req.user, permission, stationId)
      );

      if (!hasAnyStationPermission) {
        manufacturingLogger.warn('Unauthorized station permission access attempt', {
          userId: req.user.id,
          username: req.user.username,
          userRole: req.user.role,
          stationId,
          requiredPermissions: permissions,
          assignedStations: req.user.station_assignments,
          path: req.path,
          method: req.method,
          category: 'authorization'
        });

        throw new AuthorizationError('Insufficient station permissions', req.user.role, {
          stationId,
          requiredPermissions: permissions,
          assignedStations: req.user.station_assignments,
          reason: 'insufficient_station_permissions'
        });
      }

      // Add validation info to request
      req.validatedStation = {
        id: stationId,
        hasAccess: true,
        permissions,
        accessReason: req.user.role === 'STATION_INSPECTOR' ? 'assigned' : 'elevated_permissions'
      };

      manufacturingLogger.debug('Station permission validation successful', {
        userId: req.user.id,
        stationId,
        permissions,
        category: 'authorization'
      });

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Token refresh check middleware
 * Adds refresh recommendation to response headers
 */
export const checkTokenRefresh = (req, res, next) => {
  if (req.token && req.token.expiresInMinutes < 5) {
    res.setHeader('X-Token-Refresh-Recommended', 'true');
    res.setHeader('X-Token-Expires-In-Minutes', req.token.expiresInMinutes);
    
    manufacturingLogger.info('Token refresh recommended', {
      userId: req.user?.id,
      expiresInMinutes: req.token.expiresInMinutes,
      category: 'authentication'
    });
  }

  next();
};

/**
 * Rate limiting override for authenticated users
 * Provides higher rate limits for authenticated manufacturing users
 */
export const authRateLimitOverride = (req, res, next) => {
  if (req.user) {
    // Set higher rate limit key for authenticated users
    req.rateLimitKey = `auth-${req.user.id}`;
    
    // Add user context for rate limiting
    req.rateLimitContext = {
      userId: req.user.id,
      role: req.user.role,
      authenticated: true
    };
  }

  next();
};

/**
 * Legacy token generation for backwards compatibility
 * TODO: Remove after full migration to new JWT utilities
 */
export const generateToken = (user) => {
  manufacturingLogger.warn('Using legacy generateToken function', {
    userId: user.id,
    username: user.username,
    category: 'authentication',
    deprecated: true
  });
  
  // Import the new utility function
  import('../utils/index.js').then(({ generateAccessToken }) => {
    return generateAccessToken(user);
  }).catch(error => {
    manufacturingLogger.error('Failed to generate token with new utility', {
      error: error.message,
      category: 'authentication'
    });
  });
};

export default {
  authenticateJWT,
  optionalAuth,
  authorizeRole,
  requirePermission,
  validateStationAssignment,
  requireStationPermission,
  checkTokenRefresh,
  authRateLimitOverride,
  generateToken
};