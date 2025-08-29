// Enhanced authentication routes with Redis session management
// Manufacturing-optimized authentication endpoints with advanced features

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import enhancedAuthController from '../controllers/auth/enhancedAuthController.js';
import { 
  enhancedAuthenticateJWT, 
  enhancedAuthorizeRole, 
  validateStationAccess,
  trackSessionActivity,
  createRateLimiter,
  deviceFingerprinting
} from '../middleware/enhancedAuth.js';

const router = express.Router();

// Rate limiting for authentication endpoints
const authRateLimiter = createRateLimiter(15 * 60 * 1000, 5); // 5 attempts per 15 minutes

/**
 * @route   POST /api/v1/auth/enhanced-login
 * @desc    Enhanced login with Redis session management
 * @access  Public
 * @body    { username: string, password: string, stationId?: string }
 */
router.post('/enhanced-login', 
  authRateLimiter,
  asyncHandler(enhancedAuthController.enhancedLogin)
);

/**
 * @route   POST /api/v1/auth/enhanced-logout
 * @desc    Enhanced logout with session invalidation
 * @access  Private
 * @headers Authorization: Bearer <token>
 * @body    { sessionId: string }
 */
router.post('/enhanced-logout',
  enhancedAuthenticateJWT,
  trackSessionActivity,
  asyncHandler(enhancedAuthController.enhancedLogout)
);

/**
 * @route   GET /api/v1/auth/session/:sessionId
 * @desc    Get detailed session information
 * @access  Private
 * @headers Authorization: Bearer <token>
 * @param   sessionId - Session ID
 */
router.get('/session/:sessionId',
  enhancedAuthenticateJWT,
  trackSessionActivity,
  asyncHandler(enhancedAuthController.getSessionInfo)
);

/**
 * @route   GET /api/v1/auth/sessions/active
 * @desc    Get user's active sessions
 * @access  Private
 * @headers Authorization: Bearer <token>
 */
router.get('/sessions/active',
  enhancedAuthenticateJWT,
  trackSessionActivity,
  asyncHandler(enhancedAuthController.getActiveSessions)
);

/**
 * @route   GET /api/v1/auth/sessions/active/:userId
 * @desc    Get specific user's active sessions (admin only)
 * @access  Private
 * @headers Authorization: Bearer <token>
 * @param   userId - User ID to check
 */
router.get('/sessions/active/:userId',
  enhancedAuthenticateJWT,
  enhancedAuthorizeRole(['SYSTEM_ADMIN']),
  trackSessionActivity,
  asyncHandler(enhancedAuthController.getActiveSessions)
);

/**
 * @route   POST /api/v1/auth/sessions/force-logout
 * @desc    Force logout user from all sessions (admin only)
 * @access  Private
 * @headers Authorization: Bearer <token>
 * @body    { userId: string, reason?: string }
 */
router.post('/sessions/force-logout',
  enhancedAuthenticateJWT,
  enhancedAuthorizeRole(['SYSTEM_ADMIN']),
  trackSessionActivity,
  asyncHandler(enhancedAuthController.forceLogoutUser)
);

/**
 * @route   GET /api/v1/auth/sessions/stats
 * @desc    Get session statistics (admin/QC manager only)
 * @access  Private
 * @headers Authorization: Bearer <token>
 */
router.get('/sessions/stats',
  enhancedAuthenticateJWT,
  enhancedAuthorizeRole(['SYSTEM_ADMIN', 'QC_MANAGER']),
  trackSessionActivity,
  asyncHandler(enhancedAuthController.getSessionStats)
);

/**
 * @route   POST /api/v1/auth/session/refresh
 * @desc    Refresh session with activity update
 * @access  Private
 * @headers Authorization: Bearer <token>
 * @body    { sessionId: string }
 */
router.post('/session/refresh',
  enhancedAuthenticateJWT,
  trackSessionActivity,
  asyncHandler(enhancedAuthController.refreshSession)
);

/**
 * @route   POST /api/v1/auth/token/validate
 * @desc    Validate token without full authentication
 * @access  Public
 * @body    { token: string }
 */
router.post('/token/validate',
  asyncHandler(enhancedAuthController.validateToken)
);

/**
 * @route   GET /api/v1/auth/health
 * @desc    Authentication system health check
 * @access  Public
 */
router.get('/health', async (req, res) => {
  try {
    // Import session manager for health check
    const { checkRedisHealth } = await import('../config/redis.js');
    const redisHealth = await checkRedisHealth();
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        redis: redisHealth.status,
        redisResponseTime: redisHealth.responseTime
      },
      version: '2.0.0',
      features: [
        'Redis-based session management',
        'Token blacklisting',
        'Permission caching',
        'Device fingerprinting',
        'Rate limiting',
        'Session activity tracking'
      ]
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      services: {
        redis: 'error'
      }
    });
  }
});

/**
 * @route   GET /api/v1/auth/features
 * @desc    Get available authentication features
 * @access  Public
 */
router.get('/features', (req, res) => {
  res.status(200).json({
    features: {
      sessionManagement: {
        redis: true,
        ttl: '24 hours',
        blacklisting: true,
        activityTracking: true
      },
      security: {
        rateLimiting: true,
        deviceFingerprinting: true,
        tokenValidation: true,
        permissionCaching: true
      },
      monitoring: {
        sessionStats: true,
        healthChecks: true,
        auditLogging: true
      },
      roles: [
        'STATION_INSPECTOR',
        'PRODUCTION_SUPERVISOR', 
        'QC_MANAGER',
        'SYSTEM_ADMIN'
      ]
    },
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

export default router;
