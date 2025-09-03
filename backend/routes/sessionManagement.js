// Session management routes for manufacturing system
// Handles session creation, validation, invalidation, and cleanup

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticateJWT, authorizeRole } from '../middleware/auth.js';
import sessionManagementController from '../controllers/auth/sessionManagementController.js';

const router = express.Router();

/**
 * @route   GET /api/v1/auth/sessions/:sessionId
 * @desc    Get session information
 * @access  Private (User owns session or Admin/QC Manager)
 * @param   sessionId - Session ID
 * @headers Authorization: Bearer <token>
 */
router.get('/sessions/:sessionId',
  authenticateJWT,
  asyncHandler(sessionManagementController.getSessionInfo)
);

/**
 * @route   GET /api/v1/auth/sessions/user/:userId
 * @desc    Get all sessions for a user
 * @access  Private (User owns sessions or Admin/QC Manager)
 * @param   userId - User ID
 * @headers Authorization: Bearer <token>
 */
router.get('/sessions/user/:userId',
  authenticateJWT,
  asyncHandler(sessionManagementController.getUserSessions)
);

/**
 * @route   DELETE /api/v1/auth/sessions/:sessionId
 * @desc    Invalidate a specific session
 * @access  Private (User owns session or Admin)
 * @param   sessionId - Session ID
 * @body    { reason: string }
 * @headers Authorization: Bearer <token>
 */
router.delete('/sessions/:sessionId',
  authenticateJWT,
  asyncHandler(sessionManagementController.invalidateSession)
);

/**
 * @route   DELETE /api/v1/auth/sessions/user/:userId/all
 * @desc    Invalidate all sessions for a user (admin only)
 * @access  Private (Admin)
 * @param   userId - User ID
 * @body    { reason: string, excludeCurrentSession: boolean }
 * @headers Authorization: Bearer <token>
 */
router.delete('/sessions/user/:userId/all',
  authenticateJWT,
  authorizeRole(['SYSTEM_ADMIN']),
  asyncHandler(sessionManagementController.invalidateAllUserSessions)
);

/**
 * @route   GET /api/v1/auth/sessions/statistics
 * @desc    Get session statistics (admin only)
 * @access  Private (Admin)
 * @headers Authorization: Bearer <token>
 */
router.get('/sessions/statistics',
  authenticateJWT,
  authorizeRole(['SYSTEM_ADMIN']),
  asyncHandler(sessionManagementController.getSessionStatistics)
);

/**
 * @route   POST /api/v1/auth/sessions/check-token
 * @desc    Check if token is blacklisted
 * @access  Private (System)
 * @body    { token: string }
 * @headers Authorization: Bearer <token>
 */
router.post('/sessions/check-token',
  authenticateJWT,
  authorizeRole(['SYSTEM_ADMIN']), // Only system can check token blacklist
  asyncHandler(sessionManagementController.checkTokenBlacklist)
);

/**
 * @route   POST /api/v1/auth/sessions/cleanup
 * @desc    Force cleanup of expired sessions (admin only)
 * @access  Private (Admin)
 * @headers Authorization: Bearer <token>
 */
router.post('/sessions/cleanup',
  authenticateJWT,
  authorizeRole(['SYSTEM_ADMIN']),
  asyncHandler(sessionManagementController.forceCleanup)
);

/**
 * @route   GET /api/v1/auth/sessions/config
 * @desc    Get session configuration (admin only)
 * @access  Private (Admin)
 * @headers Authorization: Bearer <token>
 */
router.get('/sessions/config',
  authenticateJWT,
  authorizeRole(['SYSTEM_ADMIN']),
  asyncHandler(sessionManagementController.getSessionConfig)
);

export default router;
