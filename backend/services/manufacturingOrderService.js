// Manufacturing Order Service
// Core business logic for MO creation, validation, and management

import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { manufacturingLogger } from '../middleware/logger.js';
import moProgressTrackingService from './moProgressTrackingService.js';
import moAlertService from './moAlertService.js';

class ManufacturingOrderService {
  constructor() {
    this.logger = manufacturingLogger;
  }

  /**
   * Create a new manufacturing order with validation
   * @param {Object} moData - Manufacturing order data
   * @param {string} moData.panel_type - Type of panels to manufacture
   * @param {number} moData.target_quantity - Number of panels to manufacture
   * @param {string} moData.year_code - Year code for barcode generation (YY format)
   * @param {string} moData.frame_type - Frame type (SILVER/BLACK)
   * @param {string} moData.backsheet_type - Backsheet type (TRANSPARENT/WHITE/BLACK)
   * @param {string} moData.created_by - User ID who created the order
   * @param {Object} moData.additional - Additional optional fields
   * @returns {Promise<Object>} Created manufacturing order
   */
  async createManufacturingOrder(moData) {
    const {
      panel_type,
      target_quantity,
      year_code,
      frame_type,
      backsheet_type,
      created_by,
      customer_name,
      customer_po,
      notes,
      estimated_completion_date,
      priority = 0,
      ...additional
    } = moData;

    try {
      // Validate required fields
      this.validateMOData(moData);

      // Generate unique order number
      const order_number = await this.generateOrderNumber();

      // Validate BOM components
      await this.validateBOMComponents({
        panel_type,
        frame_type,
        backsheet_type,
        year_code
      });

      // Create the manufacturing order
      const query = `
        INSERT INTO manufacturing_orders (
          order_number,
          panel_type,
          target_quantity,
          year_code,
          frame_type,
          backsheet_type,
          created_by,
          customer_name,
          customer_po,
          notes,
          estimated_completion_date,
          priority,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;

      const values = [
        order_number,
        panel_type,
        target_quantity,
        year_code,
        frame_type,
        backsheet_type,
        created_by,
        customer_name || null,
        customer_po || null,
        notes || null,
        estimated_completion_date || null,
        priority,
        'DRAFT'
      ];

      const result = await db.query(query, values);
      const newMO = result.rows[0];

      this.logger.info('Manufacturing order created successfully', {
        order_number: newMO.order_number,
        panel_type: newMO.panel_type,
        target_quantity: newMO.target_quantity,
        created_by
      });

      return newMO;

    } catch (error) {
      this.logger.error('Failed to create manufacturing order', {
        error: error.message,
        moData: { panel_type, target_quantity, created_by }
      });
      throw error;
    }
  }

  /**
   * Get manufacturing order by ID
   * @param {number} moId - Manufacturing order ID
   * @returns {Promise<Object|null>} Manufacturing order or null if not found
   */
  async getManufacturingOrderById(moId) {
    try {
      const query = `
        SELECT 
          mo.*,
          u.username as created_by_username,
          u.email as created_by_email
        FROM manufacturing_orders mo
        LEFT JOIN users u ON mo.created_by = u.id
        WHERE mo.id = $1
      `;

      const result = await db.query(query, [moId]);
      return result.rows[0] || null;

    } catch (error) {
      this.logger.error('Failed to get manufacturing order by ID', {
        error: error.message,
        moId
      });
      throw error;
    }
  }

  /**
   * Get manufacturing order by order number
   * @param {string} orderNumber - Order number
   * @returns {Promise<Object|null>} Manufacturing order or null if not found
   */
  async getManufacturingOrderByNumber(orderNumber) {
    try {
      const query = `
        SELECT 
          mo.*,
          u.username as created_by_username,
          u.email as created_by_email
        FROM manufacturing_orders mo
        LEFT JOIN users u ON mo.created_by = u.id
        WHERE mo.order_number = $1
      `;

      const result = await db.query(query, [orderNumber]);
      return result.rows[0] || null;

    } catch (error) {
      this.logger.error('Failed to get manufacturing order by number', {
        error: error.message,
        orderNumber
      });
      throw error;
    }
  }

  /**
   * Get all manufacturing orders with optional filtering
   * @param {Object} filters - Optional filters
   * @param {string} filters.status - Filter by status
   * @param {string} filters.panel_type - Filter by panel type
   * @param {number} filters.limit - Limit results
   * @param {number} filters.offset - Offset for pagination
   * @returns {Promise<Array>} Array of manufacturing orders
   */
  async getManufacturingOrders(filters = {}) {
    try {
      const {
        status,
        panel_type,
        limit = 50,
        offset = 0,
        order_by = 'created_at',
        order_direction = 'DESC'
      } = filters;

      let query = `
        SELECT 
          mo.*,
          u.username as created_by_username,
          u.email as created_by_email
        FROM manufacturing_orders mo
        LEFT JOIN users u ON mo.created_by = u.id
      `;

      const conditions = [];
      const values = [];
      let paramCount = 0;

      if (status) {
        paramCount++;
        conditions.push(`mo.status = $${paramCount}`);
        values.push(status);
      }

      if (panel_type) {
        paramCount++;
        conditions.push(`mo.panel_type = $${paramCount}`);
        values.push(panel_type);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ` ORDER BY mo.${order_by} ${order_direction}`;
      query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
      values.push(limit, offset);

      const result = await db.query(query, values);
      return result.rows;

    } catch (error) {
      this.logger.error('Failed to get manufacturing orders', {
        error: error.message,
        filters
      });
      throw error;
    }
  }

  /**
   * Update manufacturing order
   * @param {number} moId - Manufacturing order ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated manufacturing order
   */
  async updateManufacturingOrder(moId, updateData) {
    try {
      const allowedFields = [
        'panel_type',
        'target_quantity',
        'year_code',
        'frame_type',
        'backsheet_type',
        'customer_name',
        'customer_po',
        'notes',
        'estimated_completion_date',
        'priority',
        'status'
      ];

      const updateFields = [];
      const values = [];
      let paramCount = 0;

      // Build dynamic update query
      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          paramCount++;
          updateFields.push(`${key} = $${paramCount}`);
          values.push(value);
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      // Add updated_at
      paramCount++;
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      // Add WHERE clause
      paramCount++;
      values.push(moId);

      const query = `
        UPDATE manufacturing_orders 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await db.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Manufacturing order not found');
      }

      const updatedMO = result.rows[0];

      this.logger.info('Manufacturing order updated successfully', {
        moId,
        order_number: updatedMO.order_number,
        updatedFields: Object.keys(updateData)
      });

      return updatedMO;

    } catch (error) {
      this.logger.error('Failed to update manufacturing order', {
        error: error.message,
        moId,
        updateData
      });
      throw error;
    }
  }

  /**
   * Delete manufacturing order (soft delete by setting status to CANCELLED)
   * @param {number} moId - Manufacturing order ID
   * @returns {Promise<Object>} Updated manufacturing order
   */
  async deleteManufacturingOrder(moId) {
    try {
      const query = `
        UPDATE manufacturing_orders 
        SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND status != 'COMPLETED'
        RETURNING *
      `;

      const result = await db.query(query, [moId]);
      
      if (result.rows.length === 0) {
        throw new Error('Manufacturing order not found or cannot be cancelled');
      }

      const cancelledMO = result.rows[0];

      this.logger.info('Manufacturing order cancelled successfully', {
        moId,
        order_number: cancelledMO.order_number
      });

      return cancelledMO;

    } catch (error) {
      this.logger.error('Failed to delete manufacturing order', {
        error: error.message,
        moId
      });
      throw error;
    }
  }

  /**
   * Validate manufacturing order data
   * @param {Object} moData - Manufacturing order data to validate
   * @throws {Error} If validation fails
   */
  validateMOData(moData) {
    const {
      panel_type,
      target_quantity,
      year_code,
      frame_type,
      backsheet_type,
      created_by
    } = moData;

    // Required fields validation
    if (!panel_type) {
      throw new Error('Panel type is required');
    }

    if (!target_quantity || target_quantity <= 0) {
      throw new Error('Target quantity must be a positive number');
    }

    if (!year_code) {
      throw new Error('Year code is required');
    }

    if (!frame_type) {
      throw new Error('Frame type is required');
    }

    if (!backsheet_type) {
      throw new Error('Backsheet type is required');
    }

    if (!created_by) {
      throw new Error('Created by user ID is required');
    }

    // Validate panel type enum
    const validPanelTypes = ['TYPE_36', 'TYPE_40', 'TYPE_60', 'TYPE_72', 'TYPE_144'];
    if (!validPanelTypes.includes(panel_type)) {
      throw new Error(`Invalid panel type: ${panel_type}`);
    }

    // Validate frame type enum
    const validFrameTypes = ['SILVER', 'BLACK'];
    if (!validFrameTypes.includes(frame_type)) {
      throw new Error(`Invalid frame type: ${frame_type}`);
    }

    // Validate backsheet type enum
    const validBacksheetTypes = ['TRANSPARENT', 'WHITE', 'BLACK'];
    if (!validBacksheetTypes.includes(backsheet_type)) {
      throw new Error(`Invalid backsheet type: ${backsheet_type}`);
    }

    // Validate year code format (YY)
    if (!/^[0-9]{2}$/.test(year_code)) {
      throw new Error('Year code must be 2 digits (YY format)');
    }

    // Validate quantity range
    if (target_quantity < 1 || target_quantity > 10000) {
      throw new Error('Target quantity must be between 1 and 10,000');
    }

    // Validate UUID format for created_by
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(created_by)) {
      throw new Error('Invalid user ID format');
    }
  }

  /**
   * Validate BOM components for consistency
   * @param {Object} bomData - BOM component data
   * @throws {Error} If BOM validation fails
   */
  async validateBOMComponents(bomData) {
    const { panel_type, frame_type, backsheet_type, year_code } = bomData;

    // Validate panel type and line assignment
    const line1PanelTypes = ['TYPE_36', 'TYPE_40', 'TYPE_60', 'TYPE_72'];
    const line2PanelTypes = ['TYPE_144'];

    if (line1PanelTypes.includes(panel_type)) {
      // Line 1 panels - validate frame and backsheet combinations
      this.logger.debug('Validating Line 1 panel BOM', { panel_type, frame_type, backsheet_type });
    } else if (line2PanelTypes.includes(panel_type)) {
      // Line 2 panels - validate frame and backsheet combinations
      this.logger.debug('Validating Line 2 panel BOM', { panel_type, frame_type, backsheet_type });
    } else {
      throw new Error(`Invalid panel type: ${panel_type}`);
    }

    // Additional BOM validation logic can be added here
    // For example, checking if certain frame/backsheet combinations are valid
    // or if there are any business rules about component compatibility
  }

  /**
   * Generate unique order number
   * @returns {Promise<string>} Unique order number
   */
  async generateOrderNumber() {
    try {
      const currentYear = new Date().getFullYear().toString().slice(-2);
      const prefix = `MO${currentYear}`;

      // Get the highest order number for this year
      const query = `
        SELECT order_number 
        FROM manufacturing_orders 
        WHERE order_number LIKE $1
        ORDER BY order_number DESC 
        LIMIT 1
      `;

      const result = await db.query(query, [`${prefix}%`]);
      
      let nextNumber = 1;
      if (result.rows.length > 0) {
        const lastOrderNumber = result.rows[0].order_number;
        const lastNumber = parseInt(lastOrderNumber.replace(prefix, ''));
        nextNumber = lastNumber + 1;
      }

      const orderNumber = `${prefix}${nextNumber.toString().padStart(4, '0')}`;

      this.logger.debug('Generated order number', { orderNumber });
      return orderNumber;

    } catch (error) {
      this.logger.error('Failed to generate order number', { error: error.message });
      throw error;
    }
  }

  /**
   * Get MO statistics and progress
   * @param {number} moId - Manufacturing order ID
   * @returns {Promise<Object>} MO statistics
   */
  async getMOStatistics(moId) {
    try {
      const query = `
        SELECT 
          mo.*,
          COUNT(p.id) as total_panels,
          COUNT(CASE WHEN p.status = 'COMPLETED' THEN 1 END) as completed_panels,
          COUNT(CASE WHEN p.status = 'FAILED' THEN 1 END) as failed_panels,
          COUNT(CASE WHEN p.status = 'IN_PROGRESS' THEN 1 END) as in_progress_panels,
          ROUND(
            (COUNT(CASE WHEN p.status = 'COMPLETED' THEN 1 END)::DECIMAL / 
             NULLIF(mo.target_quantity, 0)) * 100, 2
          ) as completion_percentage
        FROM manufacturing_orders mo
        LEFT JOIN panels p ON mo.id = p.manufacturing_order_id
        WHERE mo.id = $1
        GROUP BY mo.id
      `;

      const result = await db.query(query, [moId]);
      
      if (result.rows.length === 0) {
        throw new Error('Manufacturing order not found');
      }

      return result.rows[0];

    } catch (error) {
      this.logger.error('Failed to get MO statistics', {
        error: error.message,
        moId
      });
      throw error;
    }
  }

  /**
   * Trigger progress update and alert generation for a manufacturing order
   * @param {number} moId - Manufacturing order ID
   * @returns {Promise<Object>} Updated progress data
   */
  async triggerProgressUpdate(moId) {
    try {
      // Clear cache to force fresh calculation
      moProgressTrackingService.clearProgressCache(moId);

      // Calculate fresh progress
      const progressData = await moProgressTrackingService.calculateMOProgress(moId);

      // Auto-resolve alerts that are no longer relevant
      await moAlertService.autoResolveAlerts(moId, progressData);

      // Create new alerts based on current progress
      for (const alert of progressData.alerts) {
        await moAlertService.createAlert({
          mo_id: moId,
          alert_type: alert.type,
          severity: alert.severity,
          title: alert.message,
          message: alert.message,
          threshold_value: alert.threshold,
          current_value: alert.current_value,
          station_id: alert.station_id || null
        });
      }

      // Broadcast progress update
      await moProgressTrackingService.broadcastProgressUpdate(moId, progressData);

      this.logger.info('Progress update triggered', {
        moId,
        order_number: progressData.order_number,
        progress_percentage: progressData.progress_percentage,
        alerts_generated: progressData.alerts.length
      });

      return progressData;

    } catch (error) {
      this.logger.error('Failed to trigger progress update', {
        error: error.message,
        moId
      });
      throw error;
    }
  }

  /**
   * Update manufacturing order and trigger progress update
   * @param {number} moId - Manufacturing order ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated manufacturing order with progress
   */
  async updateManufacturingOrderWithProgress(moId, updateData) {
    try {
      // Update the manufacturing order
      const updatedMO = await this.updateManufacturingOrder(moId, updateData);

      // Trigger progress update
      const progressData = await this.triggerProgressUpdate(moId);

      return {
        ...updatedMO,
        progress: progressData
      };

    } catch (error) {
      this.logger.error('Failed to update MO with progress', {
        error: error.message,
        moId,
        updateData
      });
      throw error;
    }
  }
}

export default new ManufacturingOrderService();
