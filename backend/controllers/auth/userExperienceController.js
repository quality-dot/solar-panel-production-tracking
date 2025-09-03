// User Experience Controller
// Manufacturing-optimized advanced UX features API

import { userExperienceService } from '../../services/userExperienceService.js';
import { sessionManager } from '../../services/sessionManager.js';
import { authPerformanceMonitor } from '../../services/authPerformanceMonitor.js';
import { User } from '../../models/index.js';
import { 
  successResponse, 
  errorResponse, 
  manufacturingResponse 
} from '../../utils/index.js';
import { manufacturingLogger } from '../../middleware/logger.js';
import { 
  AuthenticationError, 
  ValidationError, 
  asyncHandler 
} from '../../middleware/errorHandler.js';

/**
 * Progressive Authentication - Step 1: Basic Login
 * POST /api/v1/auth/ux/progressive-login
 */
export const progressiveLogin = asyncHandler(async (req, res) => {
  const { username, password, rememberMe, ip, userAgent } = req.body;

  // Validate required fields
  if (!username || !password) {
    throw new ValidationError('Username and password are required', {
      field: !username ? 'username' : 'password',
      reason: 'missing_required_field'
    });
  }

  try {
    const authData = {
      username,
      password,
      rememberMe: rememberMe || false,
      ip: ip || req.ip,
      userAgent: userAgent || req.get('User-Agent')
    };

    const result = await userExperienceService.progressiveAuthentication(authData, 'BASIC');

    if (!result.success) {
      return res.status(401).json(manufacturingResponse(
        null,
        result.error,
        {
          action: 'progressive_login',
          step: 'BASIC',
          requiresMFA: result.requiresMFA,
          requiresVerification: result.requiresVerification,
          requiresApproval: result.requiresApproval,
          timestamp: req.timestamp
        }
      ));
    }

    if (result.nextStep === 'COMPLETE') {
      // Authentication complete
      return res.status(200).json(manufacturingResponse(
        {
          user: result.user,
          session: result.session,
          authenticationComplete: true
        },
        'Authentication completed successfully',
        {
          action: 'progressive_login',
          step: 'COMPLETE',
          userId: result.user.id,
          sessionId: result.session.sessionId,
          timestamp: req.timestamp
        }
      ));
    }

    // Return next step information
    return res.status(200).json(manufacturingResponse(
      {
        user: result.user,
        nextStep: result.nextStep,
        requiresMFA: result.requiresMFA,
        requiresVerification: result.requiresVerification,
        requiresApproval: result.requiresApproval,
        tempToken: result.tempToken,
        authenticationComplete: false
      },
      `Authentication step completed. Next step: ${result.nextStep}`,
      {
        action: 'progressive_login',
        step: result.nextStep,
        userId: result.user.id,
        tempToken: result.tempToken,
        timestamp: req.timestamp
      }
    ));

  } catch (error) {
    manufacturingLogger.error('Progressive login failed', {
      error: error.message,
      username,
      category: 'user_experience'
    });
    
    throw new ValidationError('Progressive login failed', {
      reason: 'authentication_error',
      details: error.message
    });
  }
});

/**
 * Progressive Authentication - Step 2: MFA
 * POST /api/v1/auth/ux/mfa-verification
 */
export const mfaVerification = asyncHandler(async (req, res) => {
  const { username, mfaCode, tempToken, rememberMe, ip, userAgent } = req.body;

  // Validate required fields
  if (!username || !mfaCode || !tempToken) {
    throw new ValidationError('Username, MFA code, and temporary token are required', {
      field: !username ? 'username' : !mfaCode ? 'mfaCode' : 'tempToken',
      reason: 'missing_required_field'
    });
  }

  try {
    // Validate temp token
    const tokenValidation = await userExperienceService.validateTempToken(tempToken, 'MFA');
    if (!tokenValidation.valid) {
      throw new ValidationError('Invalid or expired temporary token', {
        reason: 'invalid_temp_token',
        details: tokenValidation.error
      });
    }

    const authData = {
      username,
      mfaCode,
      rememberMe: rememberMe || false,
      ip: ip || req.ip,
      userAgent: userAgent || req.get('User-Agent')
    };

    const result = await userExperienceService.progressiveAuthentication(authData, 'MFA');

    if (!result.success) {
      return res.status(401).json(manufacturingResponse(
        null,
        result.error,
        {
          action: 'mfa_verification',
          step: 'MFA',
          requiresMFA: true,
          timestamp: req.timestamp
        }
      ));
    }

    if (result.nextStep === 'COMPLETE') {
      return res.status(200).json(manufacturingResponse(
        {
          user: result.user,
          session: result.session,
          authenticationComplete: true
        },
        'MFA verification completed successfully',
        {
          action: 'mfa_verification',
          step: 'COMPLETE',
          userId: result.user.id,
          sessionId: result.session.sessionId,
          timestamp: req.timestamp
        }
      ));
    }

    return res.status(200).json(manufacturingResponse(
      {
        user: result.user,
        nextStep: result.nextStep,
        requiresVerification: result.requiresVerification,
        requiresApproval: result.requiresApproval,
        tempToken: result.tempToken,
        authenticationComplete: false
      },
      `MFA verification completed. Next step: ${result.nextStep}`,
      {
        action: 'mfa_verification',
        step: result.nextStep,
        userId: result.user.id,
        tempToken: result.tempToken,
        timestamp: req.timestamp
      }
    ));

  } catch (error) {
    manufacturingLogger.error('MFA verification failed', {
      error: error.message,
      username,
      category: 'user_experience'
    });
    
    throw new ValidationError('MFA verification failed', {
      reason: 'mfa_error',
      details: error.message
    });
  }
});

/**
 * Progressive Authentication - Step 3: Verification
 * POST /api/v1/auth/ux/verification
 */
export const verificationStep = asyncHandler(async (req, res) => {
  const { username, verificationCode, tempToken, rememberMe, ip, userAgent } = req.body;

  if (!username || !verificationCode || !tempToken) {
    throw new ValidationError('Username, verification code, and temporary token are required', {
      field: !username ? 'username' : !verificationCode ? 'verificationCode' : 'tempToken',
      reason: 'missing_required_field'
    });
  }

  try {
    // Validate temp token
    const tokenValidation = await userExperienceService.validateTempToken(tempToken, 'VERIFICATION');
    if (!tokenValidation.valid) {
      throw new ValidationError('Invalid or expired temporary token', {
        reason: 'invalid_temp_token',
        details: tokenValidation.error
      });
    }

    const authData = {
      username,
      verificationCode,
      rememberMe: rememberMe || false,
      ip: ip || req.ip,
      userAgent: userAgent || req.get('User-Agent')
    };

    const result = await userExperienceService.progressiveAuthentication(authData, 'VERIFICATION');

    if (!result.success) {
      return res.status(401).json(manufacturingResponse(
        null,
        result.error,
        {
          action: 'verification_step',
          step: 'VERIFICATION',
          requiresVerification: true,
          timestamp: req.timestamp
        }
      ));
    }

    if (result.nextStep === 'COMPLETE') {
      return res.status(200).json(manufacturingResponse(
        {
          user: result.user,
          session: result.session,
          authenticationComplete: true
        },
        'Verification completed successfully',
        {
          action: 'verification_step',
          step: 'COMPLETE',
          userId: result.user.id,
          sessionId: result.session.sessionId,
          timestamp: req.timestamp
        }
      ));
    }

    return res.status(200).json(manufacturingResponse(
      {
        user: result.user,
        nextStep: result.nextStep,
        requiresApproval: result.requiresApproval,
        tempToken: result.tempToken,
        authenticationComplete: false
      },
      `Verification completed. Next step: ${result.nextStep}`,
      {
        action: 'verification_step',
        step: result.nextStep,
        userId: result.user.id,
        tempToken: result.tempToken,
        timestamp: req.timestamp
      }
    ));

  } catch (error) {
    manufacturingLogger.error('Verification step failed', {
      error: error.message,
      username,
      category: 'user_experience'
    });
    
    throw new ValidationError('Verification step failed', {
      reason: 'verification_error',
      details: error.message
    });
  }
});

/**
 * Progressive Authentication - Step 4: Approval
 * POST /api/v1/auth/ux/approval
 */
export const approvalStep = asyncHandler(async (req, res) => {
  const { username, approvalCode, tempToken, rememberMe, ip, userAgent } = req.body;

  if (!username || !approvalCode || !tempToken) {
    throw new ValidationError('Username, approval code, and temporary token are required', {
      field: !username ? 'username' : !approvalCode ? 'approvalCode' : 'tempToken',
      reason: 'missing_required_field'
    });
  }

  try {
    // Validate temp token
    const tokenValidation = await userExperienceService.validateTempToken(tempToken, 'APPROVAL');
    if (!tokenValidation.valid) {
      throw new ValidationError('Invalid or expired temporary token', {
        reason: 'invalid_temp_token',
        details: tokenValidation.error
      });
    }

    const authData = {
      username,
      approvalCode,
      rememberMe: rememberMe || false,
      ip: ip || req.ip,
      userAgent: userAgent || req.get('User-Agent')
    };

    const result = await userExperienceService.progressiveAuthentication(authData, 'APPROVAL');

    if (!result.success) {
      return res.status(401).json(manufacturingResponse(
        null,
        result.error,
        {
          action: 'approval_step',
          step: 'APPROVAL',
          requiresApproval: true,
          timestamp: req.timestamp
        }
      ));
    }

    return res.status(200).json(manufacturingResponse(
      {
        user: result.user,
        session: result.session,
        authenticationComplete: true
      },
      'Approval completed successfully. Authentication complete.',
      {
        action: 'approval_step',
        step: 'COMPLETE',
        userId: result.user.id,
        sessionId: result.session.sessionId,
        timestamp: req.timestamp
      }
    ));

  } catch (error) {
    manufacturingLogger.error('Approval step failed', {
      error: error.message,
      username,
      category: 'user_experience'
    });
    
    throw new ValidationError('Approval step failed', {
      reason: 'approval_error',
      details: error.message
    });
  }
});

/**
 * Remember Me Authentication
 * POST /api/v1/auth/ux/remember-me
 */
export const rememberMeAuth = asyncHandler(async (req, res) => {
  const { rememberToken, ip, userAgent } = req.body;

  if (!rememberToken) {
    throw new ValidationError('Remember me token is required', {
      field: 'rememberToken',
      reason: 'missing_required_field'
    });
  }

  try {
    // Validate remember me token
    const tokenValidation = await userExperienceService.validateRememberMeToken(rememberToken);
    if (!tokenValidation.valid) {
      return res.status(401).json(manufacturingResponse(
        null,
        'Invalid or expired remember me token',
        {
          action: 'remember_me_auth',
          timestamp: req.timestamp
        }
      ));
    }

    const { userId, deviceInfo } = tokenValidation.data;
    
    // Get user data
    const user = await User.findByPk(userId);
    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json(manufacturingResponse(
        null,
        'User account is not active',
        {
          action: 'remember_me_auth',
          userId,
          timestamp: req.timestamp
        }
      ));
    }

    // Create new session
    const authData = {
      ip: ip || req.ip,
      userAgent: userAgent || req.get('User-Agent')
    };

    const sessionData = await userExperienceService.createUserSession(user, authData, true);
    
    // Create new remember me token
    const newRememberToken = await userExperienceService.createRememberMeToken(userId, deviceInfo);

    return res.status(200).json(manufacturingResponse(
      {
        user: userExperienceService.sanitizeUserData(user),
        session: sessionData,
        rememberToken: newRememberToken
      },
      'Remember me authentication successful',
      {
        action: 'remember_me_auth',
        userId: user.id,
        sessionId: sessionData.sessionId,
        timestamp: req.timestamp
      }
    ));

  } catch (error) {
    manufacturingLogger.error('Remember me authentication failed', {
      error: error.message,
      category: 'user_experience'
    });
    
    throw new ValidationError('Remember me authentication failed', {
      reason: 'remember_me_error',
      details: error.message
    });
  }
});

/**
 * Bulk User Management Operations
 * POST /api/v1/auth/ux/bulk-operations
 */
export const bulkUserOperations = asyncHandler(async (req, res) => {
  const { operations } = req.body;

  // Only system admins can perform bulk operations
  if (req.user.role !== 'SYSTEM_ADMIN') {
    throw new AuthenticationError('Insufficient permissions for bulk operations', {
      reason: 'insufficient_permissions'
    });
  }

  if (!Array.isArray(operations) || operations.length === 0) {
    throw new ValidationError('Operations array is required and must not be empty', {
      field: 'operations',
      reason: 'invalid_operations_array'
    });
  }

  // Validate operations
  const validOperations = ['ACTIVATE', 'DEACTIVATE', 'RESET_PASSWORD', 'UPDATE_ROLE', 'ENABLE_MFA', 'DISABLE_MFA', 'UPDATE_PREFERENCES'];
  
  for (const operation of operations) {
    if (!operation.type || !validOperations.includes(operation.type)) {
      throw new ValidationError(`Invalid operation type: ${operation.type}`, {
        field: 'operations',
        validTypes: validOperations,
        reason: 'invalid_operation_type'
      });
    }
    
    if (!operation.userId) {
      throw new ValidationError('User ID is required for all operations', {
        field: 'operations',
        reason: 'missing_user_id'
      });
    }
  }

  try {
    const results = await userExperienceService.bulkUserOperations(operations, req.user.id);

    return res.status(200).json(manufacturingResponse(
      results,
      'Bulk user operations completed',
      {
        action: 'bulk_user_operations',
        adminUserId: req.user.id,
        total: results.total,
        successful: results.successful,
        failed: results.failed,
        timestamp: req.timestamp
      }
    ));

  } catch (error) {
    manufacturingLogger.error('Bulk user operations failed', {
      error: error.message,
      adminUserId: req.user.id,
      operations: operations.length,
      category: 'user_experience'
    });
    
    throw new ValidationError('Bulk user operations failed', {
      reason: 'bulk_operations_error',
      details: error.message
    });
  }
});

/**
 * Get User Preferences
 * GET /api/v1/auth/ux/preferences
 */
export const getUserPreferences = asyncHandler(async (req, res) => {
  try {
    const preferences = await userExperienceService.getUserPreferences(req.user.id);

    return res.status(200).json(manufacturingResponse(
      preferences,
      'User preferences retrieved successfully',
      {
        action: 'get_user_preferences',
        userId: req.user.id,
        timestamp: req.timestamp
      }
    ));

  } catch (error) {
    manufacturingLogger.error('Failed to get user preferences', {
      error: error.message,
      userId: req.user.id,
      category: 'user_experience'
    });
    
    throw new ValidationError('Failed to retrieve user preferences', {
      reason: 'preferences_retrieval_error',
      details: error.message
    });
  }
});

/**
 * Update User Preferences
 * PUT /api/v1/auth/ux/preferences
 */
export const updateUserPreferences = asyncHandler(async (req, res) => {
  const { preferences } = req.body;

  if (!preferences || typeof preferences !== 'object') {
    throw new ValidationError('Preferences object is required', {
      field: 'preferences',
      reason: 'missing_preferences'
    });
  }

  // Validate preference fields
  const validFields = ['theme', 'language', 'timezone', 'notifications', 'sessionTimeout', 'mfaRequired'];
  const invalidFields = Object.keys(preferences).filter(field => !validFields.includes(field));
  
  if (invalidFields.length > 0) {
    throw new ValidationError(`Invalid preference fields: ${invalidFields.join(', ')}`, {
      field: 'preferences',
      validFields,
      invalidFields,
      reason: 'invalid_preference_fields'
    });
  }

  try {
    const updatedPreferences = await userExperienceService.updateUserPreferences(req.user.id, preferences);

    return res.status(200).json(manufacturingResponse(
      updatedPreferences,
      'User preferences updated successfully',
      {
        action: 'update_user_preferences',
        userId: req.user.id,
        updatedFields: Object.keys(preferences),
        timestamp: req.timestamp
      }
    ));

  } catch (error) {
    manufacturingLogger.error('Failed to update user preferences', {
      error: error.message,
      userId: req.user.id,
      preferences: Object.keys(preferences),
      category: 'user_experience'
    });
    
    throw new ValidationError('Failed to update user preferences', {
      reason: 'preferences_update_error',
      details: error.message
    });
  }
});

/**
 * Revoke Remember Me Token
 * POST /api/v1/auth/ux/revoke-remember-me
 */
export const revokeRememberMe = asyncHandler(async (req, res) => {
  const { rememberToken } = req.body;

  if (!rememberToken) {
    throw new ValidationError('Remember me token is required', {
      field: 'rememberToken',
      reason: 'missing_required_field'
    });
  }

  try {
    const revoked = await userExperienceService.revokeRememberMeToken(rememberToken);

    if (revoked) {
      return res.status(200).json(manufacturingResponse(
        { revoked: true },
        'Remember me token revoked successfully',
        {
          action: 'revoke_remember_me',
          userId: req.user.id,
          timestamp: req.timestamp
        }
      ));
    } else {
      throw new ValidationError('Failed to revoke remember me token', {
        reason: 'revoke_failed'
      });
    }

  } catch (error) {
    manufacturingLogger.error('Failed to revoke remember me token', {
      error: error.message,
      userId: req.user.id,
      category: 'user_experience'
    });
    
    throw new ValidationError('Failed to revoke remember me token', {
      reason: 'revoke_error',
      details: error.message
    });
  }
});

/**
 * Get User Experience Statistics
 * GET /api/v1/auth/ux/stats
 */
export const getUserExperienceStats = asyncHandler(async (req, res) => {
  // Only system admins and QC managers can view UX stats
  if (!['SYSTEM_ADMIN', 'QC_MANAGER'].includes(req.user.role)) {
    throw new AuthenticationError('Insufficient permissions for UX statistics', {
      reason: 'insufficient_permissions'
    });
  }

  try {
    const stats = await userExperienceService.getUserExperienceStats();

    return res.status(200).json(manufacturingResponse(
      stats,
      'User experience statistics retrieved successfully',
      {
        action: 'get_ux_stats',
        userId: req.user.id,
        timestamp: req.timestamp
      }
    ));

  } catch (error) {
    manufacturingLogger.error('Failed to get UX statistics', {
      error: error.message,
      userId: req.user.id,
      category: 'user_experience'
    });
    
    throw new ValidationError('Failed to retrieve UX statistics', {
      reason: 'stats_retrieval_error',
      details: error.message
    });
  }
});

export default {
  progressiveLogin,
  mfaVerification,
  verificationStep,
  approvalStep,
  rememberMeAuth,
  bulkUserOperations,
  getUserPreferences,
  updateUserPreferences,
  revokeRememberMe,
  getUserExperienceStats
};
