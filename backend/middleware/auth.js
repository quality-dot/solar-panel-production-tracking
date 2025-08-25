// Authentication middleware for manufacturing system
// JWT-based authentication for production floor tablets

import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { errorResponse } from '../utils/index.js';

/**
 * JWT Authentication middleware
 * Validates JWT tokens for protected routes
 */
export const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json(errorResponse('Access token required', 401, {
      context: 'authentication',
      stationId: req.station?.id || 'unknown'
    }));
  }

  try {
    const decoded = jwt.verify(token, config.security.jwtSecret);
    req.user = decoded;
    
    // Add user context for manufacturing logging
    if (config.environment === 'development') {
      console.log(`👤 User ${decoded.username} (${decoded.role}) authenticated on station ${req.station?.id || 'unknown'}`);
    }
    
    next();
  } catch (error) {
    console.error('🚨 JWT verification failed:', {
      error: error.message,
      stationId: req.station?.id || 'unknown',
      timestamp: new Date().toISOString()
    });

    return res.status(403).json(errorResponse('Invalid or expired token', 403, {
      context: 'authentication',
      stationId: req.station?.id || 'unknown'
    }));
  }
};

/**
 * Role-based authorization middleware
 * Restricts access based on user roles
 */
export const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(errorResponse('Authentication required', 401, {
        context: 'authorization'
      }));
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.warn(`🚫 Access denied for user ${req.user.username} (${req.user.role}) on station ${req.station?.id || 'unknown'}`);
      
      return res.status(403).json(errorResponse('Insufficient permissions', 403, {
        context: 'authorization',
        requiredRoles: allowedRoles,
        userRole: req.user.role,
        stationId: req.station?.id || 'unknown'
      }));
    }

    next();
  };
};

/**
 * Station assignment validation
 * Ensures operators can only access their assigned stations
 */
export const validateStationAssignment = (req, res, next) => {
  const user = req.user;
  const requestedStationId = req.station?.id || req.params.stationId;

  // Admins and supervisors can access any station
  if (user.role === 'admin' || user.role === 'supervisor') {
    return next();
  }

  // Operators must work on their assigned station
  if (user.role === 'operator') {
    if (!user.stationAssignment) {
      return res.status(403).json(errorResponse('No station assignment found', 403, {
        context: 'station_assignment',
        userId: user.id,
        username: user.username
      }));
    }

    if (requestedStationId && user.stationAssignment.toString() !== requestedStationId) {
      console.warn(`🚫 Station assignment violation: User ${user.username} tried to access station ${requestedStationId}, assigned to ${user.stationAssignment}`);
      
      return res.status(403).json(errorResponse('Access denied: Wrong station assignment', 403, {
        context: 'station_assignment',
        assignedStation: user.stationAssignment,
        requestedStation: requestedStationId,
        username: user.username
      }));
    }
  }

  next();
};

/**
 * Optional authentication middleware
 * Adds user context if token is present but doesn't require it
 */
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, config.security.jwtSecret);
      req.user = decoded;
    } catch (error) {
      // Silently ignore invalid tokens for optional auth
      console.warn('⚠️ Optional auth: Invalid token provided:', error.message);
    }
  }

  next();
};

/**
 * Generate JWT token for authenticated users
 */
export const generateToken = (user) => {
  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    stationAssignment: user.station_assignment,
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, config.security.jwtSecret, {
    expiresIn: config.security.jwtExpiresIn,
    issuer: 'solar-panel-tracking-api',
    audience: 'manufacturing-stations'
  });
};

/**
 * Refresh token validation
 * Checks if token is close to expiry and needs refresh
 */
export const checkTokenRefresh = (req, res, next) => {
  if (req.user) {
    const currentTime = Math.floor(Date.now() / 1000);
    const tokenExp = req.user.exp;
    const timeUntilExpiry = tokenExp - currentTime;
    
    // Add refresh warning if token expires in less than 30 minutes
    if (timeUntilExpiry < 1800) {
      res.setHeader('X-Token-Refresh-Required', 'true');
      res.setHeader('X-Token-Expires-In', timeUntilExpiry.toString());
    }
  }

  next();
};

export default {
  authenticateJWT,
  authorizeRole,
  validateStationAssignment,
  optionalAuth,
  generateToken,
  checkTokenRefresh
};
