// Enhanced authentication middleware with Redis session management
// Manufacturing-optimized authentication with advanced security features

import { sessionManager } from '../services/sessionManager.js';
import { 
  verifyToken, 
  extractTokenFromHeader, 
  TOKEN_TYPES 
} from '../utils/index.js';
import { manufacturingLogger } from './logger.js';
import { 
  AuthenticationError, 
  AuthorizationError 
} from './errorHandler.js';

/**
 * Enhanced JWT authentication middleware
 * Integrates with Redis session management for better security
 */
export const enhancedAuthenticateJWT = async (req, res, next) => {
  try {
    const authHeader = req.get('Authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      throw new AuthenticationError('Authentication token required', {
        reason: 'missing_token'
      });
    }

    // Check if token is blacklisted
    const isBlacklisted = await sessionManager.isTokenBlacklisted(token);
    if (isBlacklisted) {
      throw new AuthenticationError('Token has been invalidated', {
        reason: 'token_blacklisted'
      });
    }

    // Verify token
    const decoded = verifyToken(token, TOKEN_TYPES.ACCESS);
    
    // Get session from Redis
    const sessionValidation = await sessionManager.validateSession(
      decoded.sessionId || `legacy_${decoded.userId}`,
      token
    );

    if (!sessionValidation.valid) {
      throw new AuthenticationError('Invalid or expired session', {
        reason: sessionValidation.reason
      });
    }

    const { session, permissions } = sessionValidation;

    // Add user and session info to request
    req.user = {
      id: session.userId,
      username: session.username,
      role: session.role,
      stationId: session.stationId
    };
    
    req.session = session;
    req.permissions = permissions;
    req.token = {
      raw: token,
      decoded,
      sessionId: session.id
    };

    // Log successful authentication
    manufacturingLogger.debug('User authenticated successfully', {
      userId: session.userId,
      username: session.username,
      role: session.role,
      sessionId: session.id,
      station: req.station?.id,
      category: 'authentication'
    });

    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return next(error);
    }

    manufacturingLogger.error('Enhanced JWT authentication failed', {
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
 * Enhanced role-based authorization middleware
 * Uses cached permissions from Redis for better performance
 */
export const enhancedAuthorizeRole = (requiredRoles, requiredPermissions = []) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.permissions) {
        throw new AuthorizationError('User authentication required', {
          reason: 'missing_authentication'
        });
      }

      // Check role requirements
      if (requiredRoles && requiredRoles.length > 0) {
        if (!requiredRoles.includes(req.user.role)) {
          throw new AuthorizationError('Insufficient role permissions', {
            reason: 'insufficient_role',
            required: requiredRoles,
            current: req.user.role
          });
        }
      }

      // Check specific permission requirements
      if (requiredPermissions && requiredPermissions.length > 0) {
        const userPermissions = req.permissions.permissions || [];
        const missingPermissions = requiredPermissions.filter(
          permission => !userPermissions.includes(permission)
        );

        if (missingPermissions.length > 0) {
          throw new AuthorizationError('Insufficient permissions', {
            reason: 'insufficient_permissions',
            missing: missingPermissions,
            required: requiredPermissions
          });
        }
      }

      // Log authorization success
      manufacturingLogger.debug('Authorization successful', {
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role,
        requiredRoles,
        requiredPermissions,
        category: 'authorization'
      });

      next();
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return next(error);
      }

      manufacturingLogger.error('Authorization failed', {
        error: error.message,
        userId: req.user?.id,
        path: req.path,
        method: req.method,
        category: 'authorization'
      });

      next(new AuthorizationError('Authorization failed', {
        reason: 'authorization_error',
        details: error.message
      }));
    }
  };
};

/**
 * Station access validation middleware
 * Ensures users can only access their assigned stations
 */
export const validateStationAccess = (stationIdParam = 'stationId') => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.permissions) {
        throw new AuthorizationError('User authentication required', {
          reason: 'missing_authentication'
        });
      }

      const stationId = req.params[stationIdParam] || req.body[stationIdParam];
      
      if (!stationId) {
        throw new AuthorizationError('Station ID required', {
          reason: 'missing_station_id'
        });
      }

      // System admins and supervisors can access all stations
      if (req.permissions.canAccessAllStations) {
        return next();
      }

      // Check if user has access to this specific station
      const userStations = req.permissions.stationAccess || [];
      if (!userStations.includes(parseInt(stationId))) {
        throw new AuthorizationError('Access denied to station', {
          reason: 'station_access_denied',
          stationId,
          userStations
        });
      }

      // Log station access
      manufacturingLogger.debug('Station access validated', {
        userId: req.user.id,
        username: req.user.username,
        stationId,
        category: 'authorization'
      });

      next();
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return next(error);
      }

      manufacturingLogger.error('Station access validation failed', {
        error: error.message,
        userId: req.user?.id,
        stationId: req.params[stationIdParam] || req.body[stationIdParam],
        category: 'authorization'
      });

      next(new AuthorizationError('Station access validation failed', {
        reason: 'station_validation_error',
        details: error.message
      }));
    }
  };
};

/**
 * Session activity tracking middleware
 * Updates session activity and provides session management endpoints
 */
export const trackSessionActivity = async (req, res, next) => {
  try {
    if (req.session && req.session.id) {
      // Update session activity in Redis
      await sessionManager.updateSessionActivity(req.session.id);
      
      // Add session info to response headers for monitoring
      res.set('X-Session-ID', req.session.id);
      res.set('X-Session-Age', Math.floor((Date.now() - new Date(req.session.loginTime).getTime()) / 1000));
    }
    
    next();
  } catch (error) {
    // Don't fail the request for session tracking errors
    manufacturingLogger.warn('Session activity tracking failed', {
      error: error.message,
      sessionId: req.session?.id,
      category: 'session'
    });
    next();
  }
};

/**
 * Rate limiting middleware with Redis
 * Prevents brute force attacks on authentication endpoints
 */
export const createRateLimiter = (windowMs = 15 * 60 * 1000, maxRequests = 100) => {
  return async (req, res, next) => {
    try {
      const clientIp = req.ip;
      const rateLimitKey = `rate_limit:${clientIp}`;
      
      // Get current request count
      const currentCount = await sessionManager.redis.incr(rateLimitKey);
      
      // Set expiry on first request
      if (currentCount === 1) {
        await sessionManager.redis.expire(rateLimitKey, Math.floor(windowMs / 1000));
      }
      
      // Check if limit exceeded
      if (currentCount > maxRequests) {
        manufacturingLogger.warn('Rate limit exceeded', {
          ip: clientIp,
          count: currentCount,
          limit: maxRequests,
          category: 'security'
        });
        
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Too many requests, please try again later',
          retryAfter: Math.floor(windowMs / 1000)
        });
      }
      
      // Add rate limit info to response headers
      res.set('X-RateLimit-Limit', maxRequests);
      res.set('X-RateLimit-Remaining', Math.max(0, maxRequests - currentCount));
      res.set('X-RateLimit-Reset', Date.now() + windowMs);
      
      next();
    } catch (error) {
      // Fail safe - allow request if rate limiting fails
      manufacturingLogger.error('Rate limiting failed', {
        error: error.message,
        ip: req.ip,
        category: 'security'
      });
      next();
    }
  };
};

/**
 * Device fingerprinting middleware
 * Tracks device characteristics for security monitoring
 */
export const deviceFingerprinting = async (req, res, next) => {
  try {
    if (req.session && req.session.id) {
      const deviceFingerprint = {
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        acceptLanguage: req.get('Accept-Language'),
        acceptEncoding: req.get('Accept-Encoding'),
        timestamp: new Date().toISOString()
      };

      // Store device fingerprint in session
      await sessionManager.updateDeviceFingerprint(req.session.id, deviceFingerprint);
    }
    
    next();
  } catch (error) {
    // Don't fail the request for fingerprinting errors
    manufacturingLogger.warn('Device fingerprinting failed', {
      error: error.message,
      sessionId: req.session?.id,
      category: 'security'
    });
    next();
  }
};

export default {
  enhancedAuthenticateJWT,
  enhancedAuthorizeRole,
  validateStationAccess,
  trackSessionActivity,
  createRateLimiter,
  deviceFingerprinting
};
