// Manufacturing Order Database Model
// Handles manufacturing order data structure, validation, and database operations

import { databaseManager } from '../config/database.js';
import { ManufacturingLogger } from '../middleware/logger.js';
import { BarcodeError } from '../utils/barcodeProcessor.js';

const logger = new ManufacturingLogger('ManufacturingOrderModel');

/**
 * Manufacturing Order status enumeration
 */
export const MO_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  ON_HOLD: 'ON_HOLD'
};

/**
 * Panel type enumeration
 */
export const PANEL_TYPE = {
  TYPE_36: 'TYPE_36',
  TYPE_40: 'TYPE_40',
  TYPE_60: 'TYPE_60',
  TYPE_72: 'TYPE_72',
  TYPE_144: 'TYPE_144'
};

/**
 * Manufacturing Order Model Class
 * Handles all MO-related database operations and barcode validation
 */
export class ManufacturingOrder {
  constructor(data = {}) {
    this.id = data.id;
    this.orderNumber = data.orderNumber;
    this.panelType = data.panelType;
    this.targetQuantity = data.targetQuantity;
    this.completedQuantity = data.completedQuantity || 0;
    this.failedQuantity = data.failedQuantity || 0;
    this.status = data.status || MO_STATUS.PENDING;
    this.createdBy = data.createdBy;
    this.createdAt = data.createdAt || new Date();
    this.startedAt = data.startedAt;
    this.completedAt = data.completedAt;
    this.notes = data.notes;
    
    // Additional manufacturing data
    this.priority = data.priority || 'medium';
    this.dueDate = data.dueDate;
    this.assignedLine = data.assignedLine;
    this.qualityTarget = data.qualityTarget || 95; // 95% quality target
    this.efficiencyTarget = data.efficiencyTarget || 90; // 90% efficiency target
    
    // Barcode range tracking
    this.barcodeStart = data.barcodeStart;
    this.barcodeEnd = data.barcodeEnd;
    this.currentBarcodeSequence = data.currentBarcodeSequence || 0;
    
    // Progress tracking
    this.currentStation = data.currentStation;
    this.estimatedCompletion = data.estimatedCompletion;
    this.actualStartTime = data.actualStartTime;
    this.totalProductionTime = data.totalProductionTime;
  }

  /**
   * Validate manufacturing order data before database operations
   */
  validate() {
    const errors = [];

    if (!this.orderNumber) {
      errors.push('Order number is required');
    }

    if (!this.panelType) {
      errors.push('Panel type is required');
    } else if (!Object.values(PANEL_TYPE).includes(this.panelType)) {
      errors.push('Invalid panel type');
    }

    if (!this.targetQuantity || this.targetQuantity <= 0) {
      errors.push('Target quantity must be a positive number');
    }

    if (this.completedQuantity < 0) {
      errors.push('Completed quantity cannot be negative');
    }

    if (this.failedQuantity < 0) {
      errors.push('Failed quantity cannot be negative');
    }

    if (this.completedQuantity + this.failedQuantity > this.targetQuantity) {
      errors.push('Total processed quantity cannot exceed target quantity');
    }

    if (this.qualityTarget && (this.qualityTarget < 0 || this.qualityTarget > 100)) {
      errors.push('Quality target must be between 0 and 100');
    }

    if (this.efficiencyTarget && (this.efficiencyTarget < 0 || this.efficiencyTarget > 100)) {
      errors.push('Efficiency target must be between 0 and 100');
    }

    return errors.length === 0;
  }

  /**
   * Create manufacturing order in database
   */
  async save() {
    if (!this.validate()) {
      throw new BarcodeError(
        'Manufacturing order validation failed',
        'VALIDATION_ERROR',
        { errors: this.validationErrors }
      );
    }

    try {
      const client = await databaseManager.getClient();
      
      const query = `
        INSERT INTO manufacturing_orders (
          order_number, panel_type, target_quantity, completed_quantity, failed_quantity,
          status, created_by, priority, due_date, assigned_line, quality_target,
          efficiency_target, barcode_start, barcode_end, current_barcode_sequence,
          current_station, estimated_completion, actual_start_time, total_production_time,
          notes, created_at, started_at, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        RETURNING id, created_at
      `;

      const values = [
        this.orderNumber,
        this.panelType,
        this.targetQuantity,
        this.completedQuantity,
        this.failedQuantity,
        this.status,
        this.createdBy,
        this.priority,
        this.dueDate,
        this.assignedLine,
        this.qualityTarget,
        this.efficiencyTarget,
        this.barcodeStart,
        this.barcodeEnd,
        this.currentBarcodeSequence,
        this.currentStation,
        this.estimatedCompletion,
        this.actualStartTime,
        this.totalProductionTime,
        this.notes,
        this.createdAt,
        this.startedAt,
        this.completedAt
      ];

      const result = await client.query(query, values);
      
      this.id = result.rows[0].id;
      this.createdAt = result.rows[0].created_at;
      
      logger.info('Manufacturing order created successfully', {
        moId: this.id,
        orderNumber: this.orderNumber,
        panelType: this.panelType,
        targetQuantity: this.targetQuantity
      });

      return this;

    } catch (error) {
      logger.error('Failed to create manufacturing order', {
        error: error.message,
        orderNumber: this.orderNumber
      });
      throw new BarcodeError(
        'Failed to create manufacturing order in database',
        'DATABASE_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Update manufacturing order in database
   */
  async update(updates = {}) {
    try {
      const client = await databaseManager.getClient();
      
      // Build dynamic update query
      const updateFields = [];
      const values = [];
      let paramCount = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'createdAt') {
          const fieldName = this._camelToSnake(key);
          updateFields.push(`${fieldName} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      });

      if (updateFields.length === 0) {
        return this; // No updates
      }

      // Add WHERE clause
      values.push(this.id);

      const query = `
        UPDATE manufacturing_orders 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        throw new BarcodeError('Manufacturing order not found', 'NOT_FOUND');
      }

      // Update local instance
      Object.assign(this, result.rows[0]);

      logger.info('Manufacturing order updated successfully', {
        moId: this.id,
        orderNumber: this.orderNumber,
        updates: Object.keys(updates)
      });

      return this;

    } catch (error) {
      logger.error('Failed to update manufacturing order', {
        error: error.message,
        moId: this.id
      });
      throw new BarcodeError(
        'Failed to update manufacturing order in database',
        'DATABASE_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Find manufacturing order by ID
   */
  static async findById(id) {
    try {
      const client = await databaseManager.getClient();
      
      const query = `
        SELECT * FROM manufacturing_orders 
        WHERE id = $1
      `;

      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return new ManufacturingOrder(result.rows[0]);

    } catch (error) {
      logger.error('Failed to find manufacturing order by ID', {
        error: error.message,
        moId: id
      });
      throw new BarcodeError(
        'Failed to find manufacturing order by ID',
        'DATABASE_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Find manufacturing order by order number
   */
  static async findByOrderNumber(orderNumber) {
    try {
      const client = await databaseManager.getClient();
      
      const query = `
        SELECT * FROM manufacturing_orders 
        WHERE order_number = $1
        ORDER BY created_at DESC
        LIMIT 1
      `;

      const result = await client.query(query, [orderNumber]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return new ManufacturingOrder(result.rows[0]);

    } catch (error) {
      logger.error('Failed to find manufacturing order by order number', {
        error: error.message,
        orderNumber
      });
      throw new BarcodeError(
        'Failed to find manufacturing order by order number',
        'DATABASE_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Find active manufacturing orders
   */
  static async findActiveOrders(options = {}) {
    try {
      const client = await databaseManager.getClient();
      
      let query = `
        SELECT * FROM manufacturing_orders 
        WHERE status IN ('PENDING', 'IN_PROGRESS')
      `;
      
      const values = [];
      let paramCount = 1;

      if (options.panelType) {
        query += ` AND panel_type = $${paramCount}`;
        values.push(options.panelType);
        paramCount++;
      }

      if (options.assignedLine) {
        query += ` AND assigned_line = $${paramCount}`;
        values.push(options.assignedLine);
        paramCount++;
      }

      if (options.priority) {
        query += ` AND priority = $${paramCount}`;
        values.push(options.priority);
        paramCount++;
      }

      query += ` ORDER BY priority DESC, created_at ASC`;

      if (options.limit) {
        query += ` LIMIT $${paramCount}`;
        values.push(options.limit);
      }

      const result = await client.query(query, values);
      
      return result.rows.map(row => new ManufacturingOrder(row));

    } catch (error) {
      logger.error('Failed to find active manufacturing orders', {
        error: error.message
      });
      throw new BarcodeError(
        'Failed to find active manufacturing orders',
        'DATABASE_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Find manufacturing orders by panel type
   */
  static async findByPanelType(panelType, options = {}) {
    try {
      const client = await databaseManager.getClient();
      
      let query = `
        SELECT * FROM manufacturing_orders 
        WHERE panel_type = $1
      `;
      
      const values = [panelType];
      let paramCount = 2;

      if (options.status) {
        query += ` AND status = $${paramCount}`;
        values.push(options.status);
        paramCount++;
      }

      if (options.assignedLine) {
        query += ` AND assigned_line = $${paramCount}`;
        values.push(options.assignedLine);
        paramCount++;
      }

      query += ` ORDER BY created_at DESC`;

      if (options.limit) {
        query += ` LIMIT $${paramCount}`;
        values.push(options.limit);
      }

      const result = await client.query(query, values);
      
      return result.rows.map(row => new ManufacturingOrder(row));

    } catch (error) {
      logger.error('Failed to find manufacturing orders by panel type', {
        error: error.message,
        panelType
      });
      throw new BarcodeError(
        'Failed to find manufacturing orders by panel type',
        'DATABASE_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Get manufacturing order statistics
   */
  static async getStatistics(options = {}) {
    try {
      const client = await databaseManager.getClient();
      
      let query = `
        SELECT 
          COUNT(*) as total_orders,
          COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_orders,
          COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as in_progress_orders,
          COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_orders,
          COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled_orders,
          SUM(target_quantity) as total_target_quantity,
          SUM(completed_quantity) as total_completed_quantity,
          SUM(failed_quantity) as total_failed_quantity
        FROM manufacturing_orders
      `;
      
      const values = [];
      let paramCount = 1;

      if (options.panelType) {
        query += ` WHERE panel_type = $${paramCount}`;
        values.push(options.panelType);
        paramCount++;
      }

      if (options.assignedLine) {
        const whereClause = options.panelType ? 'AND' : 'WHERE';
        query += ` ${whereClause} assigned_line = $${paramCount}`;
        values.push(options.assignedLine);
        paramCount++;
      }

      const result = await client.query(query, values);
      
      return result.rows[0];

    } catch (error) {
      logger.error('Failed to get manufacturing order statistics', {
        error: error.message
      });
      throw new BarcodeError(
        'Failed to get manufacturing order statistics',
        'DATABASE_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Update order progress
   */
  async updateProgress(progressData) {
    const updates = {
      completedQuantity: progressData.completedQuantity !== undefined ? progressData.completedQuantity : this.completedQuantity,
      failedQuantity: progressData.failedQuantity !== undefined ? progressData.failedQuantity : this.failedQuantity,
      currentStation: progressData.currentStation !== undefined ? progressData.currentStation : this.currentStation,
      currentBarcodeSequence: progressData.currentBarcodeSequence !== undefined ? progressData.currentBarcodeSequence : this.currentBarcodeSequence
    };

    // Auto-update status based on progress
    if (updates.completedQuantity + updates.failedQuantity >= this.targetQuantity) {
      updates.status = MO_STATUS.COMPLETED;
      updates.completedAt = new Date();
    } else if (updates.completedQuantity > 0 || updates.failedQuantity > 0) {
      updates.status = MO_STATUS.IN_PROGRESS;
      if (!this.startedAt) {
        updates.startedAt = new Date();
      }
    }

    return await this.update(updates);
  }

  /**
   * Start manufacturing order
   */
  async start() {
    if (this.status !== MO_STATUS.PENDING) {
      throw new BarcodeError(
        'Manufacturing order cannot be started',
        'INVALID_STATUS',
        { currentStatus: this.status, requiredStatus: MO_STATUS.PENDING }
      );
    }

    return await this.update({
      status: MO_STATUS.IN_PROGRESS,
      startedAt: new Date()
    });
  }

  /**
   * Complete manufacturing order
   */
  async complete() {
    if (this.status !== MO_STATUS.IN_PROGRESS) {
      throw new BarcodeError(
        'Manufacturing order cannot be completed',
        'INVALID_STATUS',
        { currentStatus: this.status, requiredStatus: MO_STATUS.IN_PROGRESS }
      );
    }

    return await this.update({
      status: MO_STATUS.COMPLETED,
      completedAt: new Date()
    });
  }

  /**
   * Cancel manufacturing order
   */
  async cancel() {
    if (this.status === MO_STATUS.COMPLETED) {
      throw new BarcodeError(
        'Completed manufacturing order cannot be cancelled',
        'INVALID_STATUS',
        { currentStatus: this.status }
      );
    }

    return await this.update({
      status: MO_STATUS.CANCELLED
    });
  }

  /**
   * Check if barcode belongs to this manufacturing order
   */
  validateBarcode(barcode) {
    if (!this.barcodeStart || !this.barcodeEnd) {
      return false; // No barcode range defined
    }

    // Extract sequence number from barcode (last 5 digits)
    const sequence = parseInt(barcode.substring(8));
    
    return sequence >= this.barcodeStart && sequence <= this.barcodeEnd;
  }

  /**
   * Get next barcode sequence for this manufacturing order
   */
  getNextBarcodeSequence() {
    if (!this.barcodeStart || !this.barcodeEnd) {
      throw new BarcodeError(
        'No barcode range defined for manufacturing order',
        'NO_BARCODE_RANGE'
      );
    }

    if (this.currentBarcodeSequence >= this.barcodeEnd) {
      throw new BarcodeError(
        'Barcode sequence range exhausted',
        'BARCODE_RANGE_EXHAUSTED'
      );
    }

    return this.currentBarcodeSequence + 1;
  }

  /**
   * Calculate completion percentage
   */
  getCompletionPercentage() {
    if (this.targetQuantity === 0) return 0;
    return Math.round((this.completedQuantity / this.targetQuantity) * 100);
  }

  /**
   * Calculate quality rate
   */
  getQualityRate() {
    const totalProcessed = this.completedQuantity + this.failedQuantity;
    if (totalProcessed === 0) return 100;
    return Math.round((this.completedQuantity / totalProcessed) * 100);
  }

  /**
   * Check if manufacturing order is complete
   */
  isComplete() {
    return this.completedQuantity + this.failedQuantity >= this.targetQuantity;
  }

  /**
   * Convert camelCase to snake_case for database fields
   */
  _camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * Convert database row to ManufacturingOrder instance
   */
  static fromDatabaseRow(row) {
    return new ManufacturingOrder({
      id: row.id,
      orderNumber: row.order_number,
      panelType: row.panel_type,
      targetQuantity: row.target_quantity,
      completedQuantity: row.completed_quantity,
      failedQuantity: row.failed_quantity,
      status: row.status,
      createdBy: row.created_by,
      priority: row.priority,
      dueDate: row.due_date,
      assignedLine: row.assigned_line,
      qualityTarget: row.quality_target,
      efficiencyTarget: row.efficiency_target,
      barcodeStart: row.barcode_start,
      barcodeEnd: row.barcode_end,
      currentBarcodeSequence: row.current_barcode_sequence,
      currentStation: row.current_station,
      estimatedCompletion: row.estimated_completion,
      actualStartTime: row.actual_start_time,
      totalProductionTime: row.total_production_time,
      notes: row.notes,
      createdAt: row.created_at,
      startedAt: row.started_at,
      completedAt: row.completed_at
    });
  }

  /**
   * Convert ManufacturingOrder instance to database row
   */
  toDatabaseRow() {
    return {
      order_number: this.orderNumber,
      panel_type: this.panelType,
      target_quantity: this.targetQuantity,
      completed_quantity: this.completedQuantity,
      failed_quantity: this.failedQuantity,
      status: this.status,
      created_by: this.createdBy,
      priority: this.priority,
      due_date: this.dueDate,
      assigned_line: this.assignedLine,
      quality_target: this.qualityTarget,
      efficiency_target: this.efficiencyTarget,
      barcode_start: this.barcodeStart,
      barcode_end: this.barcodeEnd,
      current_barcode_sequence: this.currentBarcodeSequence,
      current_station: this.currentStation,
      estimated_completion: this.estimatedCompletion,
      actual_start_time: this.actualStartTime,
      total_production_time: this.totalProductionTime,
      notes: this.notes,
      created_at: this.createdAt,
      started_at: this.startedAt,
      completed_at: this.completedAt
    };
  }
}

// Export singleton instance for convenience
export const manufacturingOrderModel = new ManufacturingOrder();

export default ManufacturingOrder;
