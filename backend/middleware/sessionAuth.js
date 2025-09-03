// Enhanced session authentication middleware
// Validates JWT tokens and session status

import { verifyToken, extractTokenFromHeader, TOKEN_TYPES } from '../utils/index.js';
import { sessionManagementService } from '../services/sessionManagementService.js';
import { manufacturingLogger } from './logger.js';
import { AuthenticationError } from './errorHandler.js';

/**
 * Enhanced JWT authentication middleware with session validation
 * @param {Object} options - Middleware options
 * @param {boolean} options.requireSession - Whether to require valid session
 * @param {boolean} options.updateActivity - Whether to update session activity
 * @returns {Function} Express middleware function
 */
export const authenticateJWTWithSession = (options = {}) => {
  const { requireSession = true, updateActivity = true } = options;

  return async (req, res, next) => {
    try {
      const authHeader = req.get('Authorization');
      const token = extractTokenFromHeader(authHeader);

      if (!token) {
        throw new AuthenticationError('Access token required', {
          reason: 'missing_token'
        });
      }

      // Verify JWT token
      const decoded = verifyToken(token, TOKEN_TYPES.ACCESS);

      // Check if token is blacklisted
      const isBlacklisted = await sessionManagementService.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new AuthenticationError('Token has been invalidated', {
          reason: 'token_blacklisted'
        });
      }

      // If session validation is required, validate the session
      if (requireSession) {
        const sessionId = req.headers['x-session-id'] || req.body?.sessionId;
        
        if (sessionId) {
          const sessionValidation = await sessionManagementService.validateSession(
            sessionId, 
            token, 
            req.ip
          );

          if (!sessionValidation.valid) {
            throw new AuthenticationError('Invalid session', {
              reason: sessionValidation.reason
            });
          }

          // Update session activity if requested
          if (updateActivity && sessionValidation.session) {
            await sessionManagementService.updateSessionActivity(sessionId);
          }

          // Add session info to request
          req.session = sessionValidation.session;
        } else {
          // If session validation is required but no session ID provided
          throw new AuthenticationError('Session ID required', {
            reason: 'missing_session_id'
          });
        }
      }

      // Add user info to request
      req.user = {
        id: decoded.userId,
        username: decoded.username,
        role: decoded.role,
        tokenVersion: decoded.tokenVersion
      };

      // Add token info to request
      req.token = {
        type: TOKEN_TYPES.ACCESS,
        expiresAt: new Date(decoded.exp * 1000),
        issuedAt: new Date(decoded.iat * 1000)
      };

      next();

    } catch (error) {
      manufacturingLogger.warn('Authentication failed', {
        error: error.message,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        category: 'authentication'
      });

      if (error instanceof AuthenticationError) {
        return res.status(401).json({
          success: false,
          message: error.message,
          error: {
            type: 'AuthenticationError',
            reason: error.reason,
            timestamp: new Date().toISOString()
          }
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Authentication failed',
        error: {
          type: 'AuthenticationError',
          reason: 'invalid_token',
          timestamp: new Date().toISOString()
        }
      });
    }
  };
};

/**
 * Session validation middleware (for endpoints that need session info but not strict validation)
 */
export const validateSessionOptional = async (req, res, next) => {
  try {
    const sessionId = req.headers['x-session-id'] || req.body?.sessionId;
    
    if (sessionId) {
      const session = await sessionManagementService.getSession(sessionId);
      if (session && session.isActive) {
        req.session = {
          sessionId: session.sessionId,
          userId: session.userId,
          username: session.username,
          role: session.role,
          expiresAt: session.expiresAt,
          lastActivity: session.lastActivity
        };
      }
    }

    next();
  } catch (error) {
    // Continue without session info if validation fails
    manufacturingLogger.warn('Optional session validation failed', {
      error: error.message,
      sessionId: req.headers['x-session-id'] || req.body?.sessionId,
      category: 'session_validation'
    });
    next();
  }
};

/**
 * Check if user has valid session (utility function)
 * @param {string} userId - User ID
 * @param {string} sessionId - Session ID
 * @returns {Promise<boolean>} Has valid session
 */
export const hasValidSession = async (userId, sessionId) => {
  try {
    if (!sessionId) return false;

    const session = await sessionManagementService.getSession(sessionId);
    return session && 
           session.userId === userId && 
           session.isActive && 
           new Date() < new Date(session.expiresAt);
  } catch (error) {
    manufacturingLogger.error('Failed to check session validity', {
      error: error.message,
      userId,
      sessionId,
      category: 'session_validation'
    });
    return false;
  }
};

/**
 * Get session info from request (utility function)
 * @param {Object} req - Express request object
 * @returns {Object|null} Session info
 */
export const getSessionFromRequest = (req) => {
  return req.session || null;
};

/**
 * Get user info from request (utility function)
 * @param {Object} req - Express request object
 * @returns {Object|null} User info
 */
export const getUserFromRequest = (req) => {
  return req.user || null;
};

export default {
  authenticateJWTWithSession,
  validateSessionOptional,
  hasValidSession,
  getSessionFromRequest,
  getUserFromRequest
};
