// Manufacturing Order routes for production management
// API endpoints for MO lifecycle and progress tracking

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import manufacturingOrderController from '../controllers/manufacturing-orders/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateRole } from '../middleware/authorization.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @route   GET /api/v1/manufacturing-orders
 * @desc    Get manufacturing orders with filtering and pagination
 * @access  Private (All roles)
 * @query   ?status=active|completed|cancelled&panelType=36|40|60|72|144&limit=50&offset=0
 */
router.get('/', 
  validateRole(['STATION_INSPECTOR', 'PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN']),
  asyncHandler(manufacturingOrderController.getManufacturingOrders)
);

/**
 * @route   POST /api/v1/manufacturing-orders
 * @desc    Create new manufacturing order
 * @access  Private (Supervisor+ roles)
 * @body    { panel_type: string, target_quantity: number, year_code: string, frame_type: string, backsheet_type: string, notes?: string }
 */
router.post('/', 
  validateRole(['PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN']),
  asyncHandler(manufacturingOrderController.createManufacturingOrder)
);

/**
 * @route   GET /api/v1/manufacturing-orders/:id
 * @desc    Get specific MO details and progress
 * @access  Private (All roles)
 * @param   id - Manufacturing Order ID
 */
router.get('/:id', 
  validateRole(['STATION_INSPECTOR', 'PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN']),
  asyncHandler(manufacturingOrderController.getManufacturingOrderById)
);

/**
 * @route   PUT /api/v1/manufacturing-orders/:id
 * @desc    Update MO status or details
 * @access  Private (Supervisor+ roles)
 * @param   id - Manufacturing Order ID
 * @body    { status?: string, notes?: string, target_quantity?: number, panel_type?: string, etc. }
 */
router.put('/:id', 
  validateRole(['PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN']),
  asyncHandler(manufacturingOrderController.updateManufacturingOrder)
);

/**
 * @route   DELETE /api/v1/manufacturing-orders/:id
 * @desc    Cancel manufacturing order (soft delete)
 * @access  Private (QC Manager+ roles)
 * @param   id - Manufacturing Order ID
 */
router.delete('/:id', 
  validateRole(['QC_MANAGER', 'SYSTEM_ADMIN']),
  asyncHandler(manufacturingOrderController.deleteManufacturingOrder)
);

/**
 * @route   GET /api/v1/manufacturing-orders/:id/statistics
 * @desc    Get real-time MO progress and statistics
 * @access  Private (Supervisor+ roles)
 * @param   id - Manufacturing Order ID
 */
router.get('/:id/statistics', 
  validateRole(['PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN']),
  asyncHandler(manufacturingOrderController.getMOStatistics)
);

/**
 * @route   GET /api/v1/manufacturing-orders/number/:orderNumber
 * @desc    Get manufacturing order by order number
 * @access  Private (All roles)
 * @param   orderNumber - Manufacturing Order number
 */
router.get('/number/:orderNumber', 
  validateRole(['STATION_INSPECTOR', 'PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN']),
  asyncHandler(manufacturingOrderController.getManufacturingOrderByNumber)
);

export default router;
