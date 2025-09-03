// Manufacturing Order Routes
// API endpoints for manufacturing order management

import express from 'express';
import manufacturingOrderController from '../controllers/manufacturing-orders/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateRole } from '../middleware/authorization.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Create manufacturing order
// POST /api/manufacturing-orders
router.post('/', 
  validateRole(['PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN']),
  manufacturingOrderController.createManufacturingOrder
);

// Get all manufacturing orders with optional filtering
// GET /api/manufacturing-orders
router.get('/', 
  validateRole(['STATION_INSPECTOR', 'PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN']),
  manufacturingOrderController.getManufacturingOrders
);

// Get manufacturing order by ID
// GET /api/manufacturing-orders/:id
router.get('/:id', 
  validateRole(['STATION_INSPECTOR', 'PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN']),
  manufacturingOrderController.getManufacturingOrderById
);

// Get manufacturing order by order number
// GET /api/manufacturing-orders/number/:orderNumber
router.get('/number/:orderNumber', 
  validateRole(['STATION_INSPECTOR', 'PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN']),
  manufacturingOrderController.getManufacturingOrderByNumber
);

// Get manufacturing order statistics
// GET /api/manufacturing-orders/:id/statistics
router.get('/:id/statistics', 
  validateRole(['PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN']),
  manufacturingOrderController.getMOStatistics
);

// Update manufacturing order
// PUT /api/manufacturing-orders/:id
router.put('/:id', 
  validateRole(['PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN']),
  manufacturingOrderController.updateManufacturingOrder
);

// Delete manufacturing order (soft delete - set status to CANCELLED)
// DELETE /api/manufacturing-orders/:id
router.delete('/:id', 
  validateRole(['QC_MANAGER', 'SYSTEM_ADMIN']),
  manufacturingOrderController.deleteManufacturingOrder
);

export default router;
