// Manufacturing Order Progress Tracking Routes
// API endpoints for progress monitoring and alert management

import express from 'express';
import moProgressController from '../controllers/mo-progress/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateRole } from '../middleware/authorization.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// ============================================================================
// PROGRESS TRACKING ROUTES
// ============================================================================

/**
 * @route   GET /api/v1/manufacturing-orders/:id/progress
 * @desc    Get progress for a specific manufacturing order
 * @access  Private (All roles)
 * @param   id - Manufacturing Order ID
 */
router.get('/:id/progress', 
  validateRole(['STATION_INSPECTOR', 'PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN']),
  asyncHandler(moProgressController.getMOProgress)
);

/**
 * @route   POST /api/v1/manufacturing-orders/progress/batch
 * @desc    Get progress for multiple manufacturing orders
 * @access  Private (Supervisor+ roles)
 * @body    { mo_ids: [1, 2, 3] }
 */
router.post('/progress/batch', 
  validateRole(['PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN']),
  asyncHandler(moProgressController.getBatchMOProgress)
);

/**
 * @route   GET /api/v1/manufacturing-orders/progress/active
 * @desc    Get progress for all active manufacturing orders
 * @access  Private (Supervisor+ roles)
 * @query   ?status=ACTIVE&limit=50
 */
router.get('/progress/active', 
  validateRole(['PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN']),
  asyncHandler(moProgressController.getActiveMOsProgress)
);

/**
 * @route   GET /api/v1/manufacturing-orders/progress/statistics
 * @desc    Get progress tracking service statistics
 * @access  Private (QC Manager+ roles)
 */
router.get('/progress/statistics', 
  validateRole(['QC_MANAGER', 'SYSTEM_ADMIN']),
  asyncHandler(moProgressController.getProgressTrackingStats)
);

/**
 * @route   DELETE /api/v1/manufacturing-orders/:id/progress/cache
 * @desc    Clear progress cache for a specific manufacturing order
 * @access  Private (QC Manager+ roles)
 * @param   id - Manufacturing Order ID
 */
router.delete('/:id/progress/cache', 
  validateRole(['QC_MANAGER', 'SYSTEM_ADMIN']),
  asyncHandler(moProgressController.clearProgressCache)
);

// ============================================================================
// ALERT MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   GET /api/v1/manufacturing-orders/:id/alerts
 * @desc    Get alerts for a specific manufacturing order
 * @access  Private (All roles)
 * @param   id - Manufacturing Order ID
 * @query   ?status=ACTIVE&severity=critical&limit=50&offset=0
 */
router.get('/:id/alerts', 
  validateRole(['STATION_INSPECTOR', 'PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN']),
  asyncHandler(moProgressController.getMOAlerts)
);

/**
 * @route   POST /api/v1/manufacturing-orders/:id/alerts
 * @desc    Create a manual alert for a manufacturing order
 * @access  Private (Supervisor+ roles)
 * @param   id - Manufacturing Order ID
 * @body    { alert_type: "manual", severity: "warning", title: "Alert Title", message: "Alert message", threshold_value: 50, current_value: 45 }
 */
router.post('/:id/alerts', 
  validateRole(['PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN']),
  asyncHandler(moProgressController.createAlert)
);

/**
 * @route   GET /api/v1/manufacturing-orders/alerts/active
 * @desc    Get all active alerts across all manufacturing orders
 * @access  Private (Supervisor+ roles)
 * @query   ?severity=critical&alert_type=panels_remaining&limit=100&offset=0
 */
router.get('/alerts/active', 
  validateRole(['PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN']),
  asyncHandler(moProgressController.getAllActiveAlerts)
);

/**
 * @route   GET /api/v1/manufacturing-orders/alerts/statistics
 * @desc    Get alert statistics
 * @access  Private (QC Manager+ roles)
 */
router.get('/alerts/statistics', 
  validateRole(['QC_MANAGER', 'SYSTEM_ADMIN']),
  asyncHandler(moProgressController.getAlertStatistics)
);

/**
 * @route   POST /api/v1/manufacturing-orders/alerts/:alertId/acknowledge
 * @desc    Acknowledge an alert
 * @access  Private (Supervisor+ roles)
 * @param   alertId - Alert ID
 * @body    { notes: "Acknowledgment notes" }
 */
router.post('/alerts/:alertId/acknowledge', 
  validateRole(['PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN']),
  asyncHandler(moProgressController.acknowledgeAlert)
);

/**
 * @route   POST /api/v1/manufacturing-orders/alerts/:alertId/resolve
 * @desc    Resolve an alert
 * @access  Private (Supervisor+ roles)
 * @param   alertId - Alert ID
 * @body    { resolution_notes: "Resolution notes" }
 */
router.post('/alerts/:alertId/resolve', 
  validateRole(['PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN']),
  asyncHandler(moProgressController.resolveAlert)
);

export default router;
