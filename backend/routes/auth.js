// Authentication routes for manufacturing environment
// JWT-based authentication with role-based access control

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authController } from '../controllers/index.js';

const router = express.Router();

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate user and return JWT token
 * @access  Public
 * @body    { username: string, password: string, stationId?: string }
 */
router.post('/login', authController.login);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user and invalidate token
 * @access  Private
 * @headers Authorization: Bearer <token>
 */
router.post('/logout', authController.logout);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current authenticated user information
 * @access  Private
 * @headers Authorization: Bearer <token>
 */
router.get('/me', authController.getProfile);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh JWT token
 * @access  Private
 * @body    { refreshToken: string }
 */
router.post('/refresh', authController.refresh);

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change user password
 * @access  Private
 * @headers Authorization: Bearer <token>
 * @body    { currentPassword: string, newPassword: string }
 */
router.post('/change-password', authController.changePassword);

/**
 * @route   GET /api/v1/auth/station-access/:stationId
 * @desc    Check if user has access to specific station
 * @access  Private
 * @headers Authorization: Bearer <token>
 * @param   stationId - Station ID (1-8)
 */
router.get('/station-access/:stationId', authController.checkStationAccess);

export default router;
