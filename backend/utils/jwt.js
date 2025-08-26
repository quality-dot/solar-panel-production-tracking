// JWT utility functions for manufacturing authentication
// Secure token generation and verification for production floor

import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { manufacturingLogger } from '../middleware/logger.js';
import { AuthenticationError } from '../middleware/errorHandler.js';

/**
 * JWT token types and configurations
 */
export const TOKEN_TYPES = {
  ACCESS: 'access',
  REFRESH: 'refresh'
};

export const TOKEN_EXPIRY = {
  ACCESS: '15m',    // 15 minutes for active operations
  REFRESH: '7d'     // 7 days for seamless shift handovers
};

/**
 * Generate JWT access token for authenticated user
 */
export const generateAccessToken = (user) => {
  try {
    const payload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      stationAssignments: user.station_assignments || [],
      type: TOKEN_TYPES.ACCESS,
      iat: Math.floor(Date.now() / 1000)
    };

    const token = jwt.sign(payload, config.security.jwtSecret, {
      expiresIn: TOKEN_EXPIRY.ACCESS,
      issuer: 'solar-panel-tracking-api',
      audience: 'manufacturing-stations',
      subject: user.id.toString()
    });

    manufacturingLogger.info('Access token generated', {
      userId: user.id,
      username: user.username,
      role: user.role,
      expiresIn: TOKEN_EXPIRY.ACCESS,
      category: 'authentication'
    });

    return token;
  } catch (error) {
    manufacturingLogger.error('Failed to generate access token', {
      userId: user.id,
      username: user.username,
      error: error.message,
      category: 'authentication'
    });
    throw new AuthenticationError('Failed to generate access token', {
      userId: user.id,
      reason: 'token_generation_failed'
    });
  }
};

/**
 * Generate JWT refresh token for token renewal
 */
export const generateRefreshToken = (user) => {
  try {
    const payload = {
      userId: user.id,
      username: user.username,
      type: TOKEN_TYPES.REFRESH,
      iat: Math.floor(Date.now() / 1000),
      // Store minimal data in refresh token for security
      tokenVersion: user.token_version || 1
    };

    const token = jwt.sign(payload, config.security.jwtSecret, {
      expiresIn: TOKEN_EXPIRY.REFRESH,
      issuer: 'solar-panel-tracking-api',
      audience: 'manufacturing-stations',
      subject: user.id.toString()
    });

    manufacturingLogger.info('Refresh token generated', {
      userId: user.id,
      username: user.username,
      expiresIn: TOKEN_EXPIRY.REFRESH,
      category: 'authentication'
    });

    return token;
  } catch (error) {
    manufacturingLogger.error('Failed to generate refresh token', {
      userId: user.id,
      username: user.username,
      error: error.message,
      category: 'authentication'
    });
    throw new AuthenticationError('Failed to generate refresh token', {
      userId: user.id,
      reason: 'token_generation_failed'
    });
  }
};

/**
 * Verify and decode JWT token
 */
export const verifyToken = (token, expectedType = null) => {
  try {
    const decoded = jwt.verify(token, config.security.jwtSecret, {
      issuer: 'solar-panel-tracking-api',
      audience: 'manufacturing-stations'
    });

    // Validate token type if specified
    if (expectedType && decoded.type !== expectedType) {
      throw new AuthenticationError('Invalid token type', {
        expected: expectedType,
        received: decoded.type,
        reason: 'invalid_token_type'
      });
    }

    // Check if token is expired (additional check)
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      throw new AuthenticationError('Token has expired', {
        expiredAt: new Date(decoded.exp * 1000).toISOString(),
        reason: 'token_expired'
      });
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      manufacturingLogger.warn('JWT verification failed', {
        error: error.message,
        tokenType: expectedType,
        category: 'authentication'
      });

      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Token has expired', {
          expiredAt: error.expiredAt?.toISOString(),
          reason: 'token_expired'
        });
      }

      if (error instanceof jwt.NotBeforeError) {
        throw new AuthenticationError('Token not active yet', {
          activeAt: error.date?.toISOString(),
          reason: 'token_not_active'
        });
      }

      throw new AuthenticationError('Invalid token', {
        reason: 'invalid_token',
        details: error.message
      });
    }

    // Re-throw AuthenticationError instances
    if (error instanceof AuthenticationError) {
      throw error;
    }

    // Handle unexpected errors
    manufacturingLogger.error('Unexpected error during token verification', {
      error: error.message,
      stack: error.stack,
      category: 'authentication'
    });
    throw new AuthenticationError('Token verification failed', {
      reason: 'verification_error'
    });
  }
};

/**
 * Extract token from Authorization header
 */
export const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};

/**
 * Generate token pair (access + refresh)
 */
export const generateTokenPair = (user) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  manufacturingLogger.info('Token pair generated', {
    userId: user.id,
    username: user.username,
    role: user.role,
    category: 'authentication'
  });

  return {
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    expiresIn: TOKEN_EXPIRY.ACCESS,
    refreshExpiresIn: TOKEN_EXPIRY.REFRESH
  };
};

/**
 * Validate token payload for manufacturing context
 */
export const validateTokenPayload = (payload) => {
  const requiredFields = ['userId', 'username', 'role', 'type'];
  
  for (const field of requiredFields) {
    if (!payload[field]) {
      throw new AuthenticationError(`Missing required token field: ${field}`, {
        field,
        reason: 'invalid_token_payload'
      });
    }
  }

  // Validate role
  const validRoles = ['STATION_INSPECTOR', 'PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN'];
  if (!validRoles.includes(payload.role)) {
    throw new AuthenticationError('Invalid user role in token', {
      role: payload.role,
      validRoles,
      reason: 'invalid_role'
    });
  }

  return payload;
};

/**
 * Check if token needs refresh (expires within threshold)
 */
export const needsRefresh = (token, thresholdMinutes = 5) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return true;
    }

    const now = Math.floor(Date.now() / 1000);
    const threshold = thresholdMinutes * 60;
    
    return (decoded.exp - now) < threshold;
  } catch (error) {
    return true; // If we can't decode, assume refresh is needed
  }
};

/**
 * Get token expiration info
 */
export const getTokenExpiration = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return null;
    }

    const expirationDate = new Date(decoded.exp * 1000);
    const now = new Date();
    const timeUntilExpiry = expirationDate.getTime() - now.getTime();

    return {
      expiresAt: expirationDate.toISOString(),
      expiresInSeconds: Math.floor(timeUntilExpiry / 1000),
      expiresInMinutes: Math.floor(timeUntilExpiry / (1000 * 60)),
      isExpired: timeUntilExpiry <= 0
    };
  } catch (error) {
    return null;
  }
};

export default {
  TOKEN_TYPES,
  TOKEN_EXPIRY,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  extractTokenFromHeader,
  generateTokenPair,
  validateTokenPayload,
  needsRefresh,
  getTokenExpiration
};

