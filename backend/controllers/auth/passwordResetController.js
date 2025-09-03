// Password reset controller for manufacturing system
// Handles password reset requests and token validation

import { passwordResetService } from '../../services/passwordResetService.js';
import { manufacturingLogger } from '../../middleware/logger.js';
import { 
  successResponse, 
  errorResponse, 
  manufacturingResponse 
} from '../../utils/index.js';
import { 
  ValidationError, 
  AuthenticationError, 
  asyncHandler 
} from '../../middleware/errorHandler.js';

/**
 * Request password reset
 * POST /api/v1/auth/forgot-password
 */
export const requestPasswordReset = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Validate input
  if (!email) {
    throw new ValidationError('Email address is required', {
      field: 'email',
      reason: 'missing_email'
    });
  }

  // Request password reset
  const result = await passwordResetService.requestPasswordReset(email);

  manufacturingLogger.info('Password reset request processed', {
    email: result.email,
    success: result.success,
    category: 'password_reset'
  });

  res.status(200).json(
    manufacturingResponse({
      message: result.message,
      success: result.success
    }, {
      action: 'password_reset_request',
      timestamp: new Date().toISOString()
    })
  );
});

/**
 * Reset password with token
 * POST /api/v1/auth/reset-password
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  // Validate input
  if (!token || !newPassword) {
    throw new ValidationError('Reset token and new password are required', {
      fields: ['token', 'newPassword'],
      reason: 'missing_required_fields'
    });
  }

  // Reset password
  const result = await passwordResetService.resetPassword(token, newPassword);

  manufacturingLogger.info('Password reset completed', {
    userId: result.userId,
    success: result.success,
    category: 'password_reset'
  });

  res.status(200).json(
    manufacturingResponse({
      message: result.message,
      success: result.success
    }, {
      action: 'password_reset_completed',
      userId: result.userId,
      timestamp: new Date().toISOString()
    })
  );
});

/**
 * Validate reset token
 * GET /api/v1/auth/validate-reset-token/:token
 */
export const validateResetToken = asyncHandler(async (req, res) => {
  const { token } = req.params;

  if (!token) {
    throw new ValidationError('Reset token is required', {
      field: 'token',
      reason: 'missing_token'
    });
  }

  // Validate token
  const validation = await passwordResetService.validateResetToken(token);

  if (!validation.valid) {
    res.status(400).json(
      errorResponse('Invalid or expired reset token', {
        reason: validation.reason,
        valid: false
      })
    );
    return;
  }

  res.status(200).json(
    successResponse('Reset token is valid', {
      valid: true,
      expiresAt: validation.expiresAt
    })
  );
});

/**
 * Get password reset statistics (admin only)
 * GET /api/v1/auth/password-reset/stats
 */
export const getPasswordResetStats = asyncHandler(async (req, res) => {
  const stats = await passwordResetService.getStatistics();

  if (!stats) {
    throw new Error('Failed to retrieve password reset statistics');
  }

  res.status(200).json(
    successResponse('Password reset statistics retrieved', {
      statistics: stats,
      timestamp: new Date().toISOString()
    })
  );
});

/**
 * Test email service connection (admin only)
 * GET /api/v1/auth/test-email
 */
export const testEmailService = asyncHandler(async (req, res) => {
  const { emailService } = await import('../../services/emailService.js');
  
  const isConnected = await emailService.testConnection();

  res.status(200).json(
    successResponse('Email service test completed', {
      connected: isConnected,
      timestamp: new Date().toISOString()
    })
  );
});

// Export all controller functions
export default {
  requestPasswordReset,
  resetPassword,
  validateResetToken,
  getPasswordResetStats,
  testEmailService
};
