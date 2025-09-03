// Manufacturing Order Controllers
// API endpoints for manufacturing order management

import manufacturingOrderService from '../../services/manufacturingOrderService.js';
import { manufacturingLogger } from '../../middleware/logger.js';

class ManufacturingOrderController {
  constructor() {
    this.logger = manufacturingLogger;
  }

  /**
   * Create a new manufacturing order
   * POST /api/manufacturing-orders
   */
  async createManufacturingOrder(req, res) {
    try {
      const moData = {
        ...req.body,
        created_by: req.user.id // From authentication middleware
      };

      const newMO = await manufacturingOrderService.createManufacturingOrder(moData);

      this.logger.info('Manufacturing order created via API', {
        order_number: newMO.order_number,
        panel_type: newMO.panel_type,
        target_quantity: newMO.target_quantity,
        created_by: req.user.id
      });

      res.status(201).json({
        success: true,
        message: 'Manufacturing order created successfully',
        data: newMO
      });

    } catch (error) {
      this.logger.error('Failed to create manufacturing order via API', {
        error: error.message,
        userId: req.user?.id,
        body: req.body
      });

      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create manufacturing order',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Get manufacturing order by ID
   * GET /api/manufacturing-orders/:id
   */
  async getManufacturingOrderById(req, res) {
    try {
      const { id } = req.params;
      const moId = parseInt(id);

      if (isNaN(moId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid manufacturing order ID'
        });
      }

      const mo = await manufacturingOrderService.getManufacturingOrderById(moId);

      if (!mo) {
        return res.status(404).json({
          success: false,
          message: 'Manufacturing order not found'
        });
      }

      res.json({
        success: true,
        data: mo
      });

    } catch (error) {
      this.logger.error('Failed to get manufacturing order by ID via API', {
        error: error.message,
        moId: req.params.id,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve manufacturing order',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Get manufacturing order by order number
   * GET /api/manufacturing-orders/number/:orderNumber
   */
  async getManufacturingOrderByNumber(req, res) {
    try {
      const { orderNumber } = req.params;

      const mo = await manufacturingOrderService.getManufacturingOrderByNumber(orderNumber);

      if (!mo) {
        return res.status(404).json({
          success: false,
          message: 'Manufacturing order not found'
        });
      }

      res.json({
        success: true,
        data: mo
      });

    } catch (error) {
      this.logger.error('Failed to get manufacturing order by number via API', {
        error: error.message,
        orderNumber: req.params.orderNumber,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve manufacturing order',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Get all manufacturing orders with optional filtering
   * GET /api/manufacturing-orders
   */
  async getManufacturingOrders(req, res) {
    try {
      const filters = {
        status: req.query.status,
        panel_type: req.query.panel_type,
        limit: parseInt(req.query.limit) || 50,
        offset: parseInt(req.query.offset) || 0,
        order_by: req.query.order_by || 'created_at',
        order_direction: req.query.order_direction || 'DESC'
      };

      // Remove undefined filters
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined) {
          delete filters[key];
        }
      });

      const mos = await manufacturingOrderService.getManufacturingOrders(filters);

      res.json({
        success: true,
        data: mos,
        meta: {
          count: mos.length,
          filters: filters
        }
      });

    } catch (error) {
      this.logger.error('Failed to get manufacturing orders via API', {
        error: error.message,
        query: req.query,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve manufacturing orders',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Update manufacturing order
   * PUT /api/manufacturing-orders/:id
   */
  async updateManufacturingOrder(req, res) {
    try {
      const { id } = req.params;
      const moId = parseInt(id);

      if (isNaN(moId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid manufacturing order ID'
        });
      }

      const updateData = req.body;
      const updatedMO = await manufacturingOrderService.updateManufacturingOrder(moId, updateData);

      this.logger.info('Manufacturing order updated via API', {
        moId,
        order_number: updatedMO.order_number,
        updatedFields: Object.keys(updateData),
        userId: req.user.id
      });

      res.json({
        success: true,
        message: 'Manufacturing order updated successfully',
        data: updatedMO
      });

    } catch (error) {
      this.logger.error('Failed to update manufacturing order via API', {
        error: error.message,
        moId: req.params.id,
        updateData: req.body,
        userId: req.user?.id
      });

      const statusCode = error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to update manufacturing order',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Delete manufacturing order (soft delete)
   * DELETE /api/manufacturing-orders/:id
   */
  async deleteManufacturingOrder(req, res) {
    try {
      const { id } = req.params;
      const moId = parseInt(id);

      if (isNaN(moId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid manufacturing order ID'
        });
      }

      const cancelledMO = await manufacturingOrderService.deleteManufacturingOrder(moId);

      this.logger.info('Manufacturing order cancelled via API', {
        moId,
        order_number: cancelledMO.order_number,
        userId: req.user.id
      });

      res.json({
        success: true,
        message: 'Manufacturing order cancelled successfully',
        data: cancelledMO
      });

    } catch (error) {
      this.logger.error('Failed to delete manufacturing order via API', {
        error: error.message,
        moId: req.params.id,
        userId: req.user?.id
      });

      const statusCode = error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to cancel manufacturing order',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Get manufacturing order statistics
   * GET /api/manufacturing-orders/:id/statistics
   */
  async getMOStatistics(req, res) {
    try {
      const { id } = req.params;
      const moId = parseInt(id);

      if (isNaN(moId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid manufacturing order ID'
        });
      }

      const statistics = await manufacturingOrderService.getMOStatistics(moId);

      res.json({
        success: true,
        data: statistics
      });

    } catch (error) {
      this.logger.error('Failed to get MO statistics via API', {
        error: error.message,
        moId: req.params.id,
        userId: req.user?.id
      });

      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to retrieve MO statistics',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
}

export default new ManufacturingOrderController();



