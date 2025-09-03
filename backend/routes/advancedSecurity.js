// Advanced Security Routes with Token Rotation
// Manufacturing-optimized security endpoints with advanced features

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import advancedSecurityController from '../controllers/auth/advancedSecurityController.js';
import { 
  enhancedAuthenticateJWT, 
  enhancedAuthorizeRole, 
  trackSessionActivity,
  createRateLimiter,
  deviceFingerprinting
} from '../middleware/enhancedAuth.js';

const router = express.Router();

// Rate limiting for security endpoints
const securityRateLimiter = createRateLimiter(15 * 60 * 1000, 10); // 10 attempts per 15 minutes

/**
 * @route   POST /api/v1/auth/advanced-login
 * @desc    Advanced login with security monitoring and device fingerprinting
 * @access  Public
 * @body    { username: string, password: string, stationId?: string }
 */
router.post('/advanced-login', 
  securityRateLimiter,
  asyncHandler(advancedSecurityController.advancedLogin)
);

/**
 * @route   POST /api/v1/auth/token/rotate
 * @desc    Manually rotate tokens for security
 * @access  Private
 * @headers Authorization: Bearer <token>
 * @body    { currentToken: string, reason?: string }
 */
router.post('/token/rotate',
  enhancedAuthenticateJWT,
  trackSessionActivity,
  asyncHandler(advancedSecurityController.rotateTokens)
);

/**
 * @route   GET /api/v1/auth/security/stats
 * @desc    Get comprehensive security statistics
 * @access  Private (Admin/QC Manager)
 * @headers Authorization: Bearer <token>
 */
router.get('/stats',
  enhancedAuthenticateJWT,
  enhancedAuthorizeRole(['SYSTEM_ADMIN', 'QC_MANAGER']),
  trackSessionActivity,
  asyncHandler(advancedSecurityController.getSecurityStats)
);

/**
 * @route   GET /api/v1/auth/security/profile/:userId
 * @desc    Get user's security profile and risk assessment
 * @access  Private (Admin or self)
 * @headers Authorization: Bearer <token>
 * @param   userId - User ID to check
 */
router.get('/profile/:userId',
  enhancedAuthenticateJWT,
  trackSessionActivity,
  asyncHandler(advancedSecurityController.getUserSecurityProfile)
);

/**
 * @route   POST /api/v1/auth/security/force-logout
 * @desc    Force logout user with security incident logging
 * @access  Private (Admin only)
 * @headers Authorization: Bearer <token>
 * @body    { userId: string, reason?: string, securityIncident?: boolean }
 */
router.post('/force-logout',
  enhancedAuthenticateJWT,
  enhancedAuthorizeRole(['SYSTEM_ADMIN']),
  trackSessionActivity,
  asyncHandler(advancedSecurityController.forceLogoutWithSecurity)
);

/**
 * @route   PUT /api/v1/auth/security/settings/:userId
 * @desc    Update user's security settings
 * @access  Private (Admin only)
 * @headers Authorization: Bearer <token>
 * @param   userId - User ID to update
 * @body    { maxConcurrentSessions?: number, deviceFingerprinting?: boolean, ipRestrictions?: object }
 */
router.put('/settings/:userId',
  enhancedAuthenticateJWT,
  enhancedAuthorizeRole(['SYSTEM_ADMIN']),
  trackSessionActivity,
  asyncHandler(advancedSecurityController.updateUserSecuritySettings)
);

/**
 * @route   GET /api/v1/auth/security/health
 * @desc    Advanced security system health check
 * @access  Public
 */
router.get('/health', async (req, res) => {
  try {
    // Import services for health check
    const { checkRedisHealth } = await import('../config/redis.js');
    const { tokenRotationService } = await import('../services/tokenRotationService.js');
    
    const [redisHealth, securityStats] = await Promise.all([
      checkRedisHealth(),
      tokenRotationService.getSecurityStats()
    ]);
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        redis: redisHealth.status,
        redisResponseTime: redisHealth.responseTime,
        tokenRotation: 'operational',
        deviceFingerprinting: 'operational',
        ipSecurity: 'operational'
      },
      security: {
        suspiciousActivityCount: securityStats?.suspiciousActivityCount || 0,
        deviceChangeCount: securityStats?.deviceChangeCount || 0,
        ipBlacklistCount: securityStats?.ipBlacklistCount || 0,
        rateLimitViolations: securityStats?.rateLimitViolations || 0
      },
      version: '2.1.0',
      features: [
        'Automatic token rotation',
        'Device fingerprinting',
        'Suspicious activity detection',
        'IP-based security restrictions',
        'Concurrent session limits',
        'Security scoring system',
        'Advanced threat monitoring'
      ]
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      services: {
        redis: 'error',
        tokenRotation: 'error',
        deviceFingerprinting: 'error'
      }
    });
  }
});

/**
 * @route   GET /api/v1/auth/security/features
 * @desc    Get available advanced security features
 * @access  Public
 */
router.get('/features', (req, res) => {
  res.status(200).json({
    features: {
      tokenManagement: {
        automaticRotation: true,
        manualRotation: true,
        expiryThreshold: '5 minutes',
        rotationLogging: true
      },
      deviceSecurity: {
        fingerprinting: true,
        similarityThreshold: '70%',
        changeDetection: true,
        suspiciousActivity: true
      },
      sessionSecurity: {
        concurrentLimits: true,
        maxSessions: 3,
        automaticTermination: true,
        activityTracking: true
      },
      ipSecurity: {
        blacklisting: true,
        rateLimiting: true,
        geographicRestrictions: false, // Future feature
        threatDetection: true
      },
      monitoring: {
        securityStats: true,
        userProfiles: true,
        incidentLogging: true,
        riskScoring: true
      }
    },
    version: '2.1.0',
    timestamp: new Date().toISOString()
  });
});

/**
 * @route   POST /api/v1/auth/security/test
 * @desc    Test security features (development only)
 * @access  Public (development)
 */
router.post('/test', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      error: 'Security testing disabled in production',
      message: 'This endpoint is only available in development mode'
    });
  }

  try {
    const { tokenRotationService } = await import('../services/tokenRotationService.js');
    
    // Test device fingerprinting
    const testFingerprint = tokenRotationService.generateDeviceFingerprint(req);
    
    // Test fingerprint comparison
    const comparison = tokenRotationService.compareDeviceFingerprints(
      testFingerprint,
      { ...testFingerprint, data: { ...testFingerprint.data, ip: '192.168.1.100' } }
    );
    
    res.status(200).json({
      message: 'Security features test completed',
      timestamp: new Date().toISOString(),
      tests: {
        deviceFingerprinting: {
          success: true,
          fingerprint: testFingerprint.hash,
          data: testFingerprint.data
        },
        fingerprintComparison: {
          success: true,
          similarity: comparison.similarity,
          suspicious: comparison.suspicious,
          threshold: comparison.threshold
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Security test failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
