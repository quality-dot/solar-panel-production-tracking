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
=======
import { successResponse, errorResponse } from '../utils/responseUtils.js';
import { 
  manufacturingOrderService, 
  MOServiceError 
} from '../services/manufacturingOrderService.js';
import { createValidationMiddleware } from '../middleware/validation.js';

const router = express.Router();

// Validation schemas for MO endpoints
const moValidation = {
  create: {
    body: {
      orderNumber: {
        in: ['body'],
        exists: {
          errorMessage: 'Order number is required'
        },
        isString: {
          errorMessage: 'Order number must be a string'
        },
        trim: true,
        isLength: {
          options: { min: 3, max: 50 },
          errorMessage: 'Order number must be between 3 and 50 characters'
        },
        matches: {
          options: /^[A-Z0-9-]+$/,
          errorMessage: 'Order number must contain only uppercase letters, numbers, and hyphens'
        }
      },
      panelType: {
        in: ['body'],
        exists: {
          errorMessage: 'Panel type is required'
        },
        isIn: {
          options: [['36', '40', '60', '72', '144']],
          errorMessage: 'Panel type must be 36, 40, 60, 72, or 144'
        }
      },
      targetQuantity: {
        in: ['body'],
        exists: {
          errorMessage: 'Target quantity is required'
        },
        isInt: {
          options: { min: 1, max: 50000 },
          errorMessage: 'Target quantity must be between 1 and 50000'
        },
        toInt: true
      },
      customerName: {
        in: ['body'],
        optional: true,
        isString: {
          errorMessage: 'Customer name must be a string'
        },
        trim: true,
        isLength: {
          options: { max: 255 },
          errorMessage: 'Customer name must be less than 255 characters'
        }
      },
      customerPo: {
        in: ['body'],
        optional: true,
        isString: {
          errorMessage: 'Customer PO must be a string'
        },
        trim: true,
        isLength: {
          options: { max: 100 },
          errorMessage: 'Customer PO must be less than 100 characters'
        }
      },
      notes: {
        in: ['body'],
        optional: true,
        isString: {
          errorMessage: 'Notes must be a string'
        },
        trim: true
      },
      priority: {
        in: ['body'],
        optional: true,
        isInt: {
          options: { min: 0, max: 10 },
          errorMessage: 'Priority must be between 0 and 10'
        },
        toInt: true
      },
      yearCode: {
        in: ['body'],
        optional: true,
        matches: {
          options: /^[0-9]{2}$/,
          errorMessage: 'Year code must be 2 digits'
        }
      },
      frameType: {
        in: ['body'],
        optional: true,
        isIn: {
          options: [['SILVER', 'BLACK']],
          errorMessage: 'Frame type must be SILVER or BLACK'
        }
      },
      backsheetType: {
        in: ['body'],
        optional: true,
        isIn: {
          options: [['TRANSPARENT', 'WHITE', 'BLACK']],
          errorMessage: 'Backsheet type must be TRANSPARENT, WHITE, or BLACK'
        }
      }
    }
  }
};

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
  createValidationMiddleware(moValidation.create),
  asyncHandler(async (req, res) => {
    const orderData = req.body;
    const metadata = {
      userId: req.user?.id, // From JWT if auth middleware is enabled
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionID
    };

    try {
      const result = await manufacturingOrderService.createManufacturingOrder(orderData, metadata);
      
      res.status(201).json(successResponse(result, 'Manufacturing Order created successfully'));
      
    } catch (error) {
      if (error instanceof MOServiceError) {
        const statusCode = error.code === 'ORDER_NUMBER_DUPLICATE' ? 409 : 400;
        res.status(statusCode).json(errorResponse(
          error.message,
          error.code,
          error.details
        ));
      } else {
        throw error;
      }
    }
  })
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
router.get('/:moNumber/progress', asyncHandler(async (req, res) => {
  const { moNumber } = req.params;
  
  try {
    // First, find the MO by order number
    const query = 'SELECT id FROM manufacturing_orders WHERE order_number = $1';
    const result = await manufacturingOrderService.db.query(query, [moNumber]);
    
    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse(
        `Manufacturing Order not found: ${moNumber}`,
        'MO_NOT_FOUND'
      ));
    }
    
    const moId = result.rows[0].id;
    const progress = await manufacturingOrderService.getMOProgress(moId);
    
    res.json(successResponse(progress, 'MO progress retrieved successfully'));
    
  } catch (error) {
    if (error instanceof MOServiceError) {
      const statusCode = error.code === 'MO_NOT_FOUND' ? 404 : 500;
      res.status(statusCode).json(errorResponse(
        error.message,
        error.code,
        error.details
      ));
    } else {
      throw error;
    }
  }
}));

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
