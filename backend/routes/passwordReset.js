// Password reset routes for manufacturing system
// Handles password reset requests, token validation, and password updates

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticateJWT, authorizeRole } from '../middleware/auth.js';
import passwordResetController from '../controllers/auth/passwordResetController.js';

const router = express.Router();

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset for a user
 * @access  Public
 * @body    { email: string }
 */
router.post('/forgot-password', 
  asyncHandler(passwordResetController.requestPasswordReset)
);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password using reset token
 * @access  Public
 * @body    { token: string, newPassword: string }
 */
router.post('/reset-password', 
  asyncHandler(passwordResetController.resetPassword)
);

/**
 * @route   GET /api/v1/auth/validate-reset-token/:token
 * @desc    Validate password reset token
 * @access  Public
 * @param   token - Reset token to validate
 */
router.get('/validate-reset-token/:token', 
  asyncHandler(passwordResetController.validateResetToken)
);

/**
 * @route   GET /api/v1/auth/password-reset/stats
 * @desc    Get password reset statistics (admin only)
 * @access  Private (Admin)
 * @headers Authorization: Bearer <token>
 */
router.get('/password-reset/stats',
  authenticateJWT,
  authorizeRole(['SYSTEM_ADMIN']),
  asyncHandler(passwordResetController.getPasswordResetStats)
);

/**
 * @route   GET /api/v1/auth/test-email
 * @desc    Test email service connection (admin only)
 * @access  Private (Admin)
 * @headers Authorization: Bearer <token>
 */
router.get('/test-email',
  authenticateJWT,
  authorizeRole(['SYSTEM_ADMIN']),
  asyncHandler(passwordResetController.testEmailService)
);

export default router;
