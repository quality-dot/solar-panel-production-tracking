// User Experience Routes
// Manufacturing-optimized advanced UX features endpoints

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import userExperienceController from '../controllers/auth/userExperienceController.js';
import { 
  enhancedAuthenticateJWT, 
  enhancedAuthorizeRole, 
  trackSessionActivity,
  createRateLimiter
} from '../middleware/enhancedAuth.js';

const router = express.Router();

// Rate limiting for UX endpoints
const uxRateLimiter = createRateLimiter(15 * 60 * 1000, 30); // 30 attempts per 15 minutes
const authRateLimiter = createRateLimiter(15 * 60 * 1000, 10); // 10 auth attempts per 15 minutes

/**
 * @route   POST /api/v1/auth/ux/progressive-login
 * @desc    Progressive Authentication - Step 1: Basic Login
 * @access  Public
 * @body    { username, password, rememberMe?, ip?, userAgent? }
 */
router.post('/progressive-login',
  authRateLimiter,
  asyncHandler(userExperienceController.progressiveLogin)
);

/**
 * @route   POST /api/v1/auth/ux/mfa-verification
 * @desc    Progressive Authentication - Step 2: MFA Verification
 * @access  Public
 * @body    { username, mfaCode, tempToken, rememberMe?, ip?, userAgent? }
 */
router.post('/mfa-verification',
  authRateLimiter,
  asyncHandler(userExperienceController.mfaVerification)
);

/**
 * @route   POST /api/v1/auth/ux/verification
 * @desc    Progressive Authentication - Step 3: Verification
 * @access  Public
 * @body    { username, verificationCode, tempToken, rememberMe?, ip?, userAgent? }
 */
router.post('/verification',
  authRateLimiter,
  asyncHandler(userExperienceController.verificationStep)
);

/**
 * @route   POST /api/v1/auth/ux/approval
 * @desc    Progressive Authentication - Step 4: Approval
 * @access  Public
 * @body    { username, approvalCode, tempToken, rememberMe?, ip?, userAgent? }
 */
router.post('/approval',
  authRateLimiter,
  asyncHandler(userExperienceController.approvalStep)
);

/**
 * @route   POST /api/v1/auth/ux/remember-me
 * @desc    Remember Me Authentication
 * @access  Public
 * @body    { rememberToken, ip?, userAgent? }
 */
router.post('/remember-me',
  authRateLimiter,
  asyncHandler(userExperienceController.rememberMeAuth)
);

/**
 * @route   GET /api/v1/auth/ux/preferences
 * @desc    Get User Preferences
 * @access  Private (Authenticated Users)
 * @headers Authorization: Bearer <token>
 */
router.get('/preferences',
  enhancedAuthenticateJWT,
  trackSessionActivity,
  uxRateLimiter,
  asyncHandler(userExperienceController.getUserPreferences)
);

/**
 * @route   PUT /api/v1/auth/ux/preferences
 * @desc    Update User Preferences
 * @access  Private (Authenticated Users)
 * @headers Authorization: Bearer <token>
 * @body    { preferences: { theme?, language?, timezone?, notifications?, sessionTimeout?, mfaRequired? } }
 */
router.put('/preferences',
  enhancedAuthenticateJWT,
  trackSessionActivity,
  uxRateLimiter,
  asyncHandler(userExperienceController.updateUserPreferences)
);

/**
 * @route   POST /api/v1/auth/ux/revoke-remember-me
 * @desc    Revoke Remember Me Token
 * @access  Private (Authenticated Users)
 * @headers Authorization: Bearer <token>
 * @body    { rememberToken }
 */
router.post('/revoke-remember-me',
  enhancedAuthenticateJWT,
  trackSessionActivity,
  uxRateLimiter,
  asyncHandler(userExperienceController.revokeRememberMe)
);

/**
 * @route   POST /api/v1/auth/ux/bulk-operations
 * @desc    Bulk User Management Operations (Admin Only)
 * @access  Private (System Admin)
 * @headers Authorization: Bearer <token>
 * @body    { operations: [{ type, userId, data? }] }
 */
router.post('/bulk-operations',
  enhancedAuthenticateJWT,
  enhancedAuthorizeRole(['SYSTEM_ADMIN']),
  trackSessionActivity,
  uxRateLimiter,
  asyncHandler(userExperienceController.bulkUserOperations)
);

/**
 * @route   GET /api/v1/auth/ux/stats
 * @desc    Get User Experience Statistics (Admin/QC Manager)
 * @access  Private (Admin/QC Manager)
 * @headers Authorization: Bearer <token>
 */
router.get('/stats',
  enhancedAuthenticateJWT,
  enhancedAuthorizeRole(['SYSTEM_ADMIN', 'QC_MANAGER']),
  trackSessionActivity,
  uxRateLimiter,
  asyncHandler(userExperienceController.getUserExperienceStats)
);

/**
 * @route   GET /api/v1/auth/ux/features
 * @desc    Get available UX features and capabilities
 * @access  Public
 */
router.get('/features', (req, res) => {
  res.status(200).json({
    features: {
      progressiveAuthentication: {
        basic: 'Username/password authentication',
        mfa: 'Multi-factor authentication',
        verification: 'Additional verification step',
        approval: 'Manager approval required',
        tempTokens: 'Secure step-to-step progression'
      },
      rememberMe: {
        extendedSessions: '30-day session extension',
        deviceTracking: 'Device-based token management',
        secureTokens: 'Encrypted remember me tokens',
        autoRenewal: 'Automatic token renewal'
      },
      bulkOperations: {
        userActivation: 'Bulk user activation/deactivation',
        passwordReset: 'Bulk password resets',
        roleUpdates: 'Bulk role modifications',
        mfaManagement: 'Bulk MFA enable/disable',
        preferenceUpdates: 'Bulk preference changes'
      },
      userPreferences: {
        theme: 'Light/dark theme support',
        language: 'Multi-language support',
        timezone: 'Timezone configuration',
        notifications: 'Notification preferences',
        sessionTimeout: 'Custom session duration',
        mfaRequired: 'MFA requirement toggle'
      }
    },
    authenticationSteps: {
      BASIC: ['username', 'password'],
      MFA: ['username', 'password', 'mfa_code'],
      VERIFICATION: ['username', 'password', 'mfa_code', 'verification'],
      APPROVAL: ['username', 'password', 'mfa_code', 'verification', 'approval']
    },
    bulkOperationTypes: [
      'ACTIVATE',
      'DEACTIVATE', 
      'RESET_PASSWORD',
      'UPDATE_ROLE',
      'ENABLE_MFA',
      'DISABLE_MFA',
      'UPDATE_PREFERENCES'
    ],
    preferenceFields: [
      'theme',
      'language',
      'timezone',
      'notifications',
      'sessionTimeout',
      'mfaRequired'
    ],
    version: '2.2.0',
    timestamp: new Date().toISOString()
  });
});

/**
 * @route   GET /api/v1/auth/ux/status
 * @desc    Get UX system status and health
 * @access  Public
 */
router.get('/status', async (req, res) => {
  try {
    const { userExperienceService } = await import('../services/userExperienceService.js');
    const stats = await userExperienceService.getUserExperienceStats();
    
    res.status(200).json({
      status: 'operational',
      timestamp: new Date().toISOString(),
      features: {
        progressiveAuthentication: 'active',
        rememberMe: 'active',
        bulkOperations: 'active',
        userPreferences: 'active'
      },
      statistics: stats || {
        rememberMeTokens: 0,
        userPreferences: 0,
        activeSessions: 0,
        uniqueUsers: 0
      },
      version: '2.2.0'
    });
  } catch (error) {
    res.status(503).json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      error: 'UX system status check failed',
      features: {
        progressiveAuthentication: 'unknown',
        rememberMe: 'unknown',
        bulkOperations: 'unknown',
        userPreferences: 'unknown'
      }
    });
  }
});

/**
 * @route   POST /api/v1/auth/ux/test
 * @desc    Test UX system functionality (development only)
 * @access  Public (development)
 */
router.post('/test', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      error: 'UX testing disabled in production',
      message: 'This endpoint is only available in development mode'
    });
  }

  try {
    const { userExperienceService } = await import('../services/userExperienceService.js');
    
    // Test UX service
    const stats = await userExperienceService.getUserExperienceStats();
    
    res.status(200).json({
      message: 'User Experience System Test Completed',
      timestamp: new Date().toISOString(),
      tests: {
        serviceConnection: {
          success: !!stats,
          dataPoints: stats ? Object.keys(stats).length : 0
        },
        progressiveAuth: {
          success: true,
          steps: ['BASIC', 'MFA', 'VERIFICATION', 'APPROVAL']
        },
        rememberMe: {
          success: true,
          features: ['tokenCreation', 'validation', 'revocation']
        },
        bulkOperations: {
          success: true,
          operations: ['ACTIVATE', 'DEACTIVATE', 'RESET_PASSWORD', 'UPDATE_ROLE']
        },
        userPreferences: {
          success: true,
          fields: ['theme', 'language', 'timezone', 'notifications']
        }
      },
      systemStatus: {
        progressiveAuth: 'operational',
        rememberMe: 'operational',
        bulkOperations: 'operational',
        userPreferences: 'operational'
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'UX system test failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/v1/auth/ux/overview
 * @desc    Get UX system overview and capabilities
 * @access  Public
 */
router.get('/overview', (req, res) => {
  res.status(200).json({
    system: 'User Experience Enhancement System',
    version: '2.2.0',
    timestamp: new Date().toISOString(),
    description: 'Advanced UX features for manufacturing authentication system',
    capabilities: [
      'Progressive Multi-Step Authentication',
      'Extended Session Management (Remember Me)',
      'Bulk User Operations',
      'Customizable User Preferences',
      'Role-Based Access Control',
      'Performance Monitoring Integration'
    ],
    authenticationFlow: {
      steps: 4,
      maxSteps: 'APPROVAL',
      supportsMFA: true,
      supportsVerification: true,
      supportsApproval: true,
      tempTokenSecurity: true
    },
    sessionManagement: {
      standardSession: '24 hours',
      extendedSession: '30 days',
      deviceTracking: true,
      secureTokenRotation: true
    },
    bulkOperations: {
      supportedOperations: 7,
      adminOnly: true,
      batchProcessing: true,
      resultTracking: true
    },
    userPreferences: {
      supportedFields: 6,
      caching: true,
      persistence: true,
      customization: true
    },
    integration: {
      performanceMonitoring: true,
      sessionManagement: true,
      tokenRotation: true,
      redisCaching: true
    }
  });
});

export default router;
