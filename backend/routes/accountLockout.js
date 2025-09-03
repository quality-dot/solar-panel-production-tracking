// Account lockout routes for manufacturing system
// Handles account lockout, recovery, and unlock operations

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticateJWT, authorizeRole } from '../middleware/auth.js';
import accountLockoutController from '../controllers/auth/accountLockoutController.js';

const router = express.Router();

/**
 * @route   GET /api/v1/auth/account-lockout/status/:userId
 * @desc    Get account lockout status for a user
 * @access  Private (Admin/QC Manager)
 * @param   userId - User ID to check
 * @headers Authorization: Bearer <token>
 */
router.get('/account-lockout/status/:userId',
  authenticateJWT,
  authorizeRole(['SYSTEM_ADMIN', 'QC_MANAGER']),
  asyncHandler(accountLockoutController.getAccountLockoutStatus)
);

/**
 * @route   POST /api/v1/auth/account-lockout/unlock/:userId
 * @desc    Unlock user account (admin only)
 * @access  Private (Admin)
 * @param   userId - User ID to unlock
 * @body    { reason: string }
 * @headers Authorization: Bearer <token>
 */
router.post('/account-lockout/unlock/:userId',
  authenticateJWT,
  authorizeRole(['SYSTEM_ADMIN']),
  asyncHandler(accountLockoutController.unlockAccount)
);

/**
 * @route   GET /api/v1/auth/account-lockout/statistics
 * @desc    Get lockout statistics (admin only)
 * @access  Private (Admin)
 * @headers Authorization: Bearer <token>
 */
router.get('/account-lockout/statistics',
  authenticateJWT,
  authorizeRole(['SYSTEM_ADMIN']),
  asyncHandler(accountLockoutController.getLockoutStatistics)
);

/**
 * @route   GET /api/v1/auth/account-lockout/history/:userId
 * @desc    Get user lockout history (admin only)
 * @access  Private (Admin)
 * @param   userId - User ID
 * @query   limit - Maximum number of records (default: 50)
 * @headers Authorization: Bearer <token>
 */
router.get('/account-lockout/history/:userId',
  authenticateJWT,
  authorizeRole(['SYSTEM_ADMIN']),
  asyncHandler(accountLockoutController.getUserLockoutHistory)
);

/**
 * @route   GET /api/v1/auth/account-lockout/config
 * @desc    Get lockout configuration (admin only)
 * @access  Private (Admin)
 * @headers Authorization: Bearer <token>
 */
router.get('/account-lockout/config',
  authenticateJWT,
  authorizeRole(['SYSTEM_ADMIN']),
  asyncHandler(accountLockoutController.getLockoutConfig)
);

/**
 * @route   POST /api/v1/auth/account-lockout/record-failed-attempt
 * @desc    Record failed login attempt (internal use)
 * @access  Private (System)
 * @body    { userId, username, ipAddress, userAgent }
 * @headers Authorization: Bearer <token>
 */
router.post('/account-lockout/record-failed-attempt',
  authenticateJWT,
  authorizeRole(['SYSTEM_ADMIN']), // Only system can record failed attempts
  asyncHandler(accountLockoutController.recordFailedAttempt)
);

/**
 * @route   POST /api/v1/auth/account-lockout/record-successful-login
 * @desc    Record successful login (internal use)
 * @access  Private (System)
 * @body    { userId, username, ipAddress }
 * @headers Authorization: Bearer <token>
 */
router.post('/account-lockout/record-successful-login',
  authenticateJWT,
  authorizeRole(['SYSTEM_ADMIN']), // Only system can record successful logins
  asyncHandler(accountLockoutController.recordSuccessfulLogin)
);

export default router;
