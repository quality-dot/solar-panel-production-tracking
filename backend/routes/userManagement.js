// User management routes for manufacturing system
// Handles admin CRUD operations for user management

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticateJWT, authorizeRole } from '../middleware/auth.js';
import userManagementController from '../controllers/auth/userManagementController.js';

const router = express.Router();

/**
 * @route   GET /api/v1/auth/users
 * @desc    Get all users with pagination and filtering
 * @access  Private (Admin)
 * @query   page, limit, role, isActive, search, sortBy, sortOrder
 * @headers Authorization: Bearer <token>
 */
router.get('/users',
  authenticateJWT,
  authorizeRole(['SYSTEM_ADMIN', 'QC_MANAGER']),
  asyncHandler(userManagementController.getAllUsers)
);

/**
 * @route   GET /api/v1/auth/users/stats
 * @desc    Get user statistics
 * @access  Private (Admin)
 * @headers Authorization: Bearer <token>
 */
router.get('/users/stats',
  authenticateJWT,
  authorizeRole(['SYSTEM_ADMIN', 'QC_MANAGER']),
  asyncHandler(userManagementController.getUserStats)
);

/**
 * @route   GET /api/v1/auth/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin)
 * @param   id - User ID
 * @headers Authorization: Bearer <token>
 */
router.get('/users/:id',
  authenticateJWT,
  authorizeRole(['SYSTEM_ADMIN', 'QC_MANAGER']),
  asyncHandler(userManagementController.getUserById)
);

/**
 * @route   POST /api/v1/auth/users
 * @desc    Create new user
 * @access  Private (Admin)
 * @body    { username, email, password, role, stationAssignments }
 * @headers Authorization: Bearer <token>
 */
router.post('/users',
  authenticateJWT,
  authorizeRole(['SYSTEM_ADMIN']),
  asyncHandler(userManagementController.createUser)
);

/**
 * @route   PUT /api/v1/auth/users/:id
 * @desc    Update user
 * @access  Private (Admin)
 * @param   id - User ID
 * @body    { username, email, role, stationAssignments, isActive }
 * @headers Authorization: Bearer <token>
 */
router.put('/users/:id',
  authenticateJWT,
  authorizeRole(['SYSTEM_ADMIN']),
  asyncHandler(userManagementController.updateUser)
);

/**
 * @route   DELETE /api/v1/auth/users/:id
 * @desc    Delete user (soft delete by default)
 * @access  Private (Admin)
 * @param   id - User ID
 * @query   hardDelete - Set to 'true' for permanent deletion
 * @headers Authorization: Bearer <token>
 */
router.delete('/users/:id',
  authenticateJWT,
  authorizeRole(['SYSTEM_ADMIN']),
  asyncHandler(userManagementController.deleteUser)
);

/**
 * @route   POST /api/v1/auth/users/:id/reset-password
 * @desc    Reset user password (admin only)
 * @access  Private (Admin)
 * @param   id - User ID
 * @body    { newPassword }
 * @headers Authorization: Bearer <token>
 */
router.post('/users/:id/reset-password',
  authenticateJWT,
  authorizeRole(['SYSTEM_ADMIN']),
  asyncHandler(userManagementController.resetUserPassword)
);

export default router;
