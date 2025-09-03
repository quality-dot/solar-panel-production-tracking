// Manufacturing Order Closure Routes
// API endpoints for automatic MO closure operations

import express from 'express';
import moClosureController from '../controllers/mo-closure/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateRole } from '../middleware/authorization.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// ============================================================================
// CLOSURE ASSESSMENT ROUTES
// ============================================================================

/**
 * @route   GET /api/v1/manufacturing-orders/:id/closure/assess
 * @desc    Assess if a manufacturing order is ready for automatic closure
 * @access  Private (Supervisor+ roles)
 * @param   id - Manufacturing Order ID
 */
router.get('/:id/closure/assess', 
  validateRole(['PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN']),
  asyncHandler(moClosureController.assessClosureReadiness)
);

// ============================================================================
// CLOSURE EXECUTION ROUTES
// ============================================================================

/**
 * @route   POST /api/v1/manufacturing-orders/:id/closure/execute
 * @desc    Execute automatic closure of a manufacturing order
 * @access  Private (QC Manager+ roles)
 * @param   id - Manufacturing Order ID
 * @body    { force: boolean, skipValidation: boolean, generateReport: boolean, finalizePallets: boolean }
 */
router.post('/:id/closure/execute', 
  validateRole(['QC_MANAGER', 'SYSTEM_ADMIN']),
  asyncHandler(moClosureController.executeAutomaticClosure)
);

/**
 * @route   POST /api/v1/manufacturing-orders/:id/closure/rollback
 * @desc    Rollback a manufacturing order closure
 * @access  Private (QC Manager+ roles)
 * @param   id - Manufacturing Order ID
 * @body    { reason: string }
 */
router.post('/:id/closure/rollback', 
  validateRole(['QC_MANAGER', 'SYSTEM_ADMIN']),
  asyncHandler(moClosureController.rollbackClosure)
);

// ============================================================================
// CLOSURE AUDIT ROUTES
// ============================================================================

/**
 * @route   GET /api/v1/manufacturing-orders/:id/closure/audit
 * @desc    Get closure audit history for a manufacturing order
 * @access  Private (Supervisor+ roles)
 * @param   id - Manufacturing Order ID
 */
router.get('/:id/closure/audit', 
  validateRole(['PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN']),
  asyncHandler(moClosureController.getClosureAuditHistory)
);

// ============================================================================
// CLOSURE CONFIGURATION ROUTES
// ============================================================================

/**
 * @route   GET /api/v1/manufacturing-orders/closure/rules
 * @desc    Get current closure rules configuration
 * @access  Private (QC Manager+ roles)
 */
router.get('/closure/rules', 
  validateRole(['QC_MANAGER', 'SYSTEM_ADMIN']),
  asyncHandler(moClosureController.getClosureRules)
);

/**
 * @route   PUT /api/v1/manufacturing-orders/closure/rules
 * @desc    Update closure rules configuration
 * @access  Private (System Admin only)
 * @body    { minCompletionPercentage: number, maxFailureRate: number, ... }
 */
router.put('/closure/rules', 
  validateRole(['SYSTEM_ADMIN']),
  asyncHandler(moClosureController.updateClosureRules)
);

// ============================================================================
// CLOSURE STATISTICS ROUTES
// ============================================================================

/**
 * @route   GET /api/v1/manufacturing-orders/closure/statistics
 * @desc    Get closure statistics and trends
 * @access  Private (Supervisor+ roles)
 * @query   ?days=30
 */
router.get('/closure/statistics', 
  validateRole(['PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN']),
  asyncHandler(moClosureController.getClosureStatistics)
);

export default router;
