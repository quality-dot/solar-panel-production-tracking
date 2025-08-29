// Manufacturing Order Service
// Handles MO creation, validation, progress tracking, and barcode integration

import { databaseManager } from '../config/database.js';
import { ManufacturingLogger } from '../middleware/logger.js';
import { errorRecoverySystem, ManufacturingError } from '../utils/errorHandling.js';
import { 
  processBarcodeComplete,
  validateBarcodeComponents,
  parseBarcode,
  BarcodeError 
} from '../utils/barcodeProcessor.js';
import { BarcodeGenerator } from '../utils/barcodeGenerator.js';
import { metricsService } from './metricsService.js';

const logger = new ManufacturingLogger('ManufacturingOrderService');

/**
 * Custom error class for manufacturing order operations
 */
export class MOServiceError extends Error {
  constructor(message, code, details = null) {
    super(message);
    this.name = 'MOServiceError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Manufacturing Order Service Class
 * Handles all MO-related operations with barcode integration
 */
export class ManufacturingOrderService {
  constructor() {
    this.db = databaseManager;
    this.barcodeGenerator = new BarcodeGenerator();
  }

  /**
   * Create a new manufacturing order with barcode generation parameters
   */
  async createManufacturingOrder(orderData, metadata = {}) {
    return await errorRecoverySystem.executeWithRecovery(
      async () => this._createManufacturingOrderInternal(orderData, metadata),
      {
        serviceName: 'database',
        fallbackStrategy: 'databaseFailure',
        retryEnabled: true,
        circuitBreakerEnabled: true,
        context: { 
          operation: 'createManufacturingOrder',
          orderNumber: orderData.orderNumber,
          userId: metadata.userId 
        }
      }
    );
  }

  async _createManufacturingOrderInternal(orderData, metadata = {}) {
    const {
      orderNumber,
      panelType,
      targetQuantity,
      customerName,
      customerPo,
      notes,
      priority = 0,
      yearCode,
      frameType,
      backsheetType,
      estimatedCompletionDate
    } = orderData;

    try {
      const client = await this.db.getClient();
      await client.query('BEGIN');

      try {
        // Validate order number uniqueness
        await this.validateOrderNumberUniqueness(orderNumber, client);

        // Validate panel type
        this.validatePanelType(panelType);

        // Set default barcode generation parameters
        const defaultYearCode = yearCode || new Date().getFullYear().toString().slice(-2);
        const defaultFrameType = frameType || 'SILVER';
        const defaultBacksheetType = backsheetType || 'WHITE';

        // Insert manufacturing order
        const insertQuery = `
          INSERT INTO manufacturing_orders (
            order_number, panel_type, target_quantity, completed_quantity, 
            failed_quantity, in_progress_quantity, status, priority,
            year_code, frame_type, backsheet_type, next_sequence_number,
            created_by, customer_name, customer_po, notes, estimated_completion_date,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
          ) RETURNING *
        `;

        const insertValues = [
          orderNumber,
          this.mapPanelTypeToEnum(panelType),
          targetQuantity,
          0, // completed_quantity
          0, // failed_quantity
          0, // in_progress_quantity
          'DRAFT', // status
          priority,
          defaultYearCode,
          defaultFrameType,
          defaultBacksheetType,
          1, // next_sequence_number (starting sequence)
          metadata.userId || null,
          customerName || null,
          customerPo || null,
          notes || null,
          estimatedCompletionDate || null,
          new Date().toISOString(),
          new Date().toISOString()
        ];

        const result = await client.query(insertQuery, insertValues);
        const createdMO = result.rows[0];

        // Generate barcode range for this MO
        const barcodeRange = await this.generateBarcodeRange(createdMO, client);

        // Log MO creation
        await this.logMOCreation(createdMO, metadata, client);

        // Record MO creation metrics
        try {
          metricsService.recordMOEvent({
            moId: createdMO.id,
            orderNumber: createdMO.order_number,
            eventType: 'created',
            details: {
              panelType: createdMO.panel_type,
              targetQuantity: createdMO.target_quantity,
              yearCode: createdMO.year_code
            },
            userId: metadata.userId
          });
        } catch (metricsError) {
          logger.warn('Failed to record MO creation metrics', {
            moId: createdMO.id,
            error: metricsError.message
          });
        }

        await client.query('COMMIT');

        logger.info('Manufacturing Order created successfully', {
          moId: createdMO.id,
          orderNumber: createdMO.order_number,
          panelType: createdMO.panel_type,
          targetQuantity: createdMO.target_quantity,
          barcodeRange: {
            startSequence: barcodeRange.startSequence,
            endSequence: barcodeRange.endSequence
          }
        });

        return {
          success: true,
          manufacturingOrder: createdMO,
          barcodeRange,
          createdAt: new Date().toISOString()
        };

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      logger.error('Manufacturing Order creation failed', {
        orderNumber,
        error: error.message,
        code: error.code
      });

      if (error instanceof MOServiceError || error instanceof BarcodeError) {
        throw error;
      }

      throw new MOServiceError(
        'Database operation failed during MO creation',
        'DATABASE_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Validate barcode against active manufacturing order
   */
  async validateBarcodeAgainstMO(barcodeString, moId = null) {
    try {
      // First, process the barcode normally
      const barcodeResult = processBarcodeComplete(barcodeString);
      
      if (!barcodeResult.success) {
        throw new MOServiceError(
          'Invalid barcode format',
          'INVALID_BARCODE',
          barcodeResult.error
        );
      }

      const components = barcodeResult.components;

      // Find relevant manufacturing orders
      let moQuery = `
        SELECT mo.*, 
               COUNT(p.id) as panels_created,
               COUNT(CASE WHEN p.status = 'PASSED' THEN 1 END) as panels_completed
        FROM manufacturing_orders mo
        LEFT JOIN panels p ON p.mo_id = mo.id
        WHERE mo.status IN ('DRAFT', 'ACTIVE', 'PAUSED')
          AND mo.panel_type = $1
      `;
      
      const params = [this.mapPanelTypeToEnum(components.panelType)];

      if (moId) {
        moQuery += ' AND mo.id = $2';
        params.push(moId);
      }

      moQuery += ` 
        GROUP BY mo.id
        ORDER BY mo.priority DESC, mo.created_at ASC
      `;

      const moResult = await this.db.query(moQuery, params);

      if (moResult.rows.length === 0) {
        throw new MOServiceError(
          `No active manufacturing orders found for panel type ${components.panelType}`,
          'NO_ACTIVE_MO',
          { panelType: components.panelType, moId }
        );
      }

      // Find the best matching MO
      let selectedMO = null;
      let validationResult = null;

      for (const mo of moResult.rows) {
        const validation = this.validateBarcodeForMO(components, mo);
        if (validation.isValid) {
          selectedMO = mo;
          validationResult = validation;
          break;
        }
      }

      if (!selectedMO) {
        throw new MOServiceError(
          'Barcode does not match any active manufacturing order specifications',
          'BARCODE_MO_MISMATCH',
          { 
            barcode: barcodeString,
            availableMOs: moResult.rows.map(mo => ({
              id: mo.id,
              orderNumber: mo.order_number,
              panelType: mo.panel_type,
              yearCode: mo.year_code
            }))
          }
        );
      }

      // Check if sequence is within valid range
      const sequenceValidation = await this.validateSequenceRange(
        components, 
        selectedMO
      );

      if (!sequenceValidation.isValid) {
        throw new MOServiceError(
          sequenceValidation.error,
          'SEQUENCE_OUT_OF_RANGE',
          sequenceValidation.details
        );
      }

      // Check for duplicate barcode
      const duplicateCheck = await this.checkBarcodeUniqueness(barcodeString);
      if (!duplicateCheck.isUnique) {
        throw new MOServiceError(
          'Barcode already exists in system',
          'BARCODE_DUPLICATE',
          duplicateCheck.details
        );
      }

      return {
        isValid: true,
        manufacturingOrder: selectedMO,
        barcodeResult,
        validation: validationResult,
        sequenceValidation,
        duplicateCheck,
        validatedAt: new Date().toISOString()
      };

    } catch (error) {
      if (error instanceof MOServiceError || error instanceof BarcodeError) {
        throw error;
      }

      throw new MOServiceError(
        'Barcode validation against MO failed',
        'VALIDATION_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Update MO progress when panels are completed/failed
   */
  async updateMOProgress(moId, statusChange, metadata = {}) {
    try {
      const client = await this.db.getClient();
      await client.query('BEGIN');

      try {
        // Get current MO state
        const moQuery = 'SELECT * FROM manufacturing_orders WHERE id = $1';
        const moResult = await client.query(moQuery, [moId]);

        if (moResult.rows.length === 0) {
          throw new MOServiceError(
            `Manufacturing Order not found: ${moId}`,
            'MO_NOT_FOUND'
          );
        }

        const mo = moResult.rows[0];

        // Calculate new quantities
        const newQuantities = this.calculateUpdatedQuantities(mo, statusChange);

        // Update MO with new quantities
        const updateQuery = `
          UPDATE manufacturing_orders 
          SET completed_quantity = $1,
              failed_quantity = $2,
              in_progress_quantity = $3,
              updated_at = $4
          WHERE id = $5
          RETURNING *
        `;

        const updateValues = [
          newQuantities.completed,
          newQuantities.failed,
          newQuantities.inProgress,
          new Date().toISOString(),
          moId
        ];

        const updateResult = await client.query(updateQuery, updateValues);
        const updatedMO = updateResult.rows[0];

        // Log progress update
        await this.logProgressUpdate(mo, updatedMO, statusChange, metadata, client);

        await client.query('COMMIT');

        logger.info('MO progress updated', {
          moId,
          orderNumber: mo.order_number,
          statusChange,
          oldQuantities: {
            completed: mo.completed_quantity,
            failed: mo.failed_quantity,
            inProgress: mo.in_progress_quantity
          },
          newQuantities
        });

        return {
          success: true,
          manufacturingOrder: updatedMO,
          progressChange: statusChange,
          updatedAt: new Date().toISOString()
        };

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      if (error instanceof MOServiceError) {
        throw error;
      }

      throw new MOServiceError(
        'MO progress update failed',
        'UPDATE_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Generate next barcode for a manufacturing order
   */
  async generateNextBarcode(moId) {
    try {
      const client = await this.db.getClient();
      await client.query('BEGIN');

      try {
        // Get MO with current sequence number
        const moQuery = `
          SELECT * FROM manufacturing_orders 
          WHERE id = $1 AND status IN ('DRAFT', 'ACTIVE', 'PAUSED')
          FOR UPDATE
        `;
        
        const moResult = await client.query(moQuery, [moId]);

        if (moResult.rows.length === 0) {
          throw new MOServiceError(
            `Active Manufacturing Order not found: ${moId}`,
            'MO_NOT_FOUND'
          );
        }

        const mo = moResult.rows[0];

        // Check if we've reached the target quantity
        const totalProduced = mo.completed_quantity + mo.failed_quantity + mo.in_progress_quantity;
        
        if (totalProduced >= mo.target_quantity) {
          throw new MOServiceError(
            `Manufacturing Order ${mo.order_number} has reached target quantity`,
            'MO_TARGET_REACHED',
            {
              targetQuantity: mo.target_quantity,
              totalProduced
            }
          );
        }

        // Generate barcode using MO specifications
        const barcode = this.constructBarcode({
          yearCode: mo.year_code,
          frameType: mo.frame_type,
          backsheetType: mo.backsheet_type,
          panelType: mo.panel_type,
          sequenceNumber: mo.next_sequence_number
        });

        // Increment sequence number
        const updateQuery = `
          UPDATE manufacturing_orders 
          SET next_sequence_number = next_sequence_number + 1,
              updated_at = $1
          WHERE id = $2
          RETURNING next_sequence_number
        `;

        await client.query(updateQuery, [new Date().toISOString(), moId]);

        await client.query('COMMIT');

        logger.info('Next barcode generated for MO', {
          moId,
          orderNumber: mo.order_number,
          barcode,
          sequenceNumber: mo.next_sequence_number
        });

        return {
          success: true,
          barcode,
          manufacturingOrder: {
            id: mo.id,
            orderNumber: mo.order_number,
            panelType: mo.panel_type
          },
          sequenceNumber: mo.next_sequence_number,
          generatedAt: new Date().toISOString()
        };

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      if (error instanceof MOServiceError) {
        throw error;
      }

      throw new MOServiceError(
        'Barcode generation failed',
        'GENERATION_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Get MO progress and statistics
   */
  async getMOProgress(moId) {
    try {
      const query = `
        SELECT mo.*,
               COUNT(p.id) as total_panels_created,
               COUNT(CASE WHEN p.status = 'PASSED' THEN 1 END) as panels_passed,
               COUNT(CASE WHEN p.status = 'FAILED' THEN 1 END) as panels_failed,
               COUNT(CASE WHEN p.status = 'IN_PROGRESS' THEN 1 END) as panels_in_progress,
               COUNT(CASE WHEN p.status = 'REWORK' THEN 1 END) as panels_rework,
               ROUND(
                 (mo.completed_quantity::float / NULLIF(mo.target_quantity, 0)) * 100, 2
               ) as completion_percentage
        FROM manufacturing_orders mo
        LEFT JOIN panels p ON p.mo_id = mo.id
        WHERE mo.id = $1
        GROUP BY mo.id
      `;

      const result = await this.db.query(query, [moId]);

      if (result.rows.length === 0) {
        throw new MOServiceError(
          `Manufacturing Order not found: ${moId}`,
          'MO_NOT_FOUND'
        );
      }

      const mo = result.rows[0];

      // Calculate additional metrics
      const metrics = {
        totalTargeted: mo.target_quantity,
        totalCompleted: mo.completed_quantity,
        totalFailed: mo.failed_quantity,
        totalInProgress: mo.in_progress_quantity,
        totalCreated: mo.total_panels_created,
        completionPercentage: mo.completion_percentage || 0,
        remainingToTarget: Math.max(0, mo.target_quantity - mo.completed_quantity - mo.failed_quantity),
        efficiency: mo.completed_quantity > 0 ? 
          ((mo.completed_quantity / (mo.completed_quantity + mo.failed_quantity)) * 100).toFixed(2) : 0,
        estimatedCompletion: this.calculateEstimatedCompletion(mo)
      };

      return {
        manufacturingOrder: mo,
        progress: metrics,
        queriedAt: new Date().toISOString()
      };

    } catch (error) {
      if (error instanceof MOServiceError) {
        throw error;
      }

      throw new MOServiceError(
        'MO progress lookup failed',
        'LOOKUP_ERROR',
        { originalError: error.message }
      );
    }
  }

  // Private helper methods

  /**
   * Validate barcode components against specific MO
   */
  validateBarcodeForMO(components, mo) {
    const errors = [];

    // Check year code
    if (mo.year_code && components.year !== mo.year_code) {
      errors.push(`Year mismatch: barcode has ${components.year}, MO expects ${mo.year_code}`);
    }

    // Check panel type
    const expectedPanelType = mo.panel_type.replace('TYPE_', '');
    if (components.panelType !== expectedPanelType) {
      errors.push(`Panel type mismatch: barcode has ${components.panelType}, MO expects ${expectedPanelType}`);
    }

    // Check frame type (if specified in MO)
    if (mo.frame_type) {
      const expectedFrameCode = mo.frame_type === 'SILVER' ? 'W' : 'B';
      if (components.factory !== expectedFrameCode) {
        errors.push(`Frame type mismatch: barcode has ${components.factory}, MO expects ${expectedFrameCode}`);
      }
    }

    // Check backsheet type (if specified in MO)
    if (mo.backsheet_type) {
      const expectedBacksheetCode = {
        'TRANSPARENT': 'T',
        'WHITE': 'W',
        'BLACK': 'B'
      }[mo.backsheet_type];
      
      if (expectedBacksheetCode && components.batch !== expectedBacksheetCode) {
        errors.push(`Backsheet type mismatch: barcode has ${components.batch}, MO expects ${expectedBacksheetCode}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      moId: mo.id,
      orderNumber: mo.order_number
    };
  }

  /**
   * Validate sequence number is within MO range
   */
  async validateSequenceRange(components, mo) {
    const sequenceNumber = parseInt(components.sequence);
    const currentSequence = mo.next_sequence_number;
    const maxSequence = currentSequence + (mo.target_quantity - mo.completed_quantity - mo.failed_quantity);

    if (sequenceNumber < 1) {
      return {
        isValid: false,
        error: 'Sequence number must be greater than 0',
        details: { sequenceNumber, minSequence: 1 }
      };
    }

    if (sequenceNumber >= currentSequence && sequenceNumber <= maxSequence) {
      return { isValid: true };
    }

    // Check if sequence is too low (already used)
    if (sequenceNumber < currentSequence) {
      return {
        isValid: false,
        error: `Sequence number ${sequenceNumber} has already been used for this MO`,
        details: { 
          sequenceNumber, 
          currentSequence, 
          status: 'SEQUENCE_ALREADY_USED' 
        }
      };
    }

    // Check if sequence is too high (beyond target)
    return {
      isValid: false,
      error: `Sequence number ${sequenceNumber} exceeds MO target range`,
      details: { 
        sequenceNumber, 
        maxSequence, 
        targetQuantity: mo.target_quantity,
        status: 'SEQUENCE_EXCEEDS_TARGET' 
      }
    };
  }

  /**
   * Check if barcode already exists in system
   */
  async checkBarcodeUniqueness(barcode) {
    try {
      const query = 'SELECT id, barcode, mo_id FROM panels WHERE barcode = $1';
      const result = await this.db.query(query, [barcode]);

      if (result.rows.length > 0) {
        return {
          isUnique: false,
          details: {
            existingPanelId: result.rows[0].id,
            existingMoId: result.rows[0].mo_id
          }
        };
      }

      return { isUnique: true };

    } catch (error) {
      throw new MOServiceError(
        'Barcode uniqueness check failed',
        'DATABASE_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Generate barcode range for MO
   */
  async generateBarcodeRange(mo, client) {
    const startSequence = mo.next_sequence_number;
    const endSequence = startSequence + mo.target_quantity - 1;

    // Generate sample barcodes for validation
    const sampleBarcodes = [];
    const samplePositions = [0, Math.floor(mo.target_quantity / 4), Math.floor(mo.target_quantity / 2), mo.target_quantity - 1];

    for (const position of samplePositions) {
      const sequenceNumber = startSequence + position;
      const barcode = this.constructBarcode({
        yearCode: mo.year_code,
        frameType: mo.frame_type,
        backsheetType: mo.backsheet_type,
        panelType: mo.panel_type,
        sequenceNumber
      });

      sampleBarcodes.push({
        position: position + 1,
        sequenceNumber,
        barcode
      });
    }

    return {
      moId: mo.id,
      startSequence,
      endSequence,
      totalCapacity: mo.target_quantity,
      sampleBarcodes,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Construct barcode from MO specifications
   */
  constructBarcode(specs) {
    const {
      yearCode,
      frameType,
      backsheetType,
      panelType,
      sequenceNumber
    } = specs;

    const frameCode = frameType === 'SILVER' ? 'W' : 'B';
    const backsheetCode = {
      'TRANSPARENT': 'T',
      'WHITE': 'W',
      'BLACK': 'B'
    }[backsheetType] || 'W';

    const panelTypeCode = panelType.replace('TYPE_', '');
    const paddedSequence = sequenceNumber.toString().padStart(5, '0');

    return `CRS${yearCode}${frameCode}${backsheetCode}${panelTypeCode}${paddedSequence}`;
  }

  /**
   * Calculate updated quantities based on status change
   */
  calculateUpdatedQuantities(mo, statusChange) {
    const quantities = {
      completed: mo.completed_quantity,
      failed: mo.failed_quantity,
      inProgress: mo.in_progress_quantity
    };

    switch (statusChange.type) {
      case 'PANEL_COMPLETED':
        quantities.completed += statusChange.count || 1;
        quantities.inProgress = Math.max(0, quantities.inProgress - (statusChange.count || 1));
        break;
      case 'PANEL_FAILED':
        quantities.failed += statusChange.count || 1;
        quantities.inProgress = Math.max(0, quantities.inProgress - (statusChange.count || 1));
        break;
      case 'PANEL_STARTED':
        quantities.inProgress += statusChange.count || 1;
        break;
      case 'PANEL_REWORK':
        // Rework doesn't change MO quantities directly
        break;
      default:
        throw new MOServiceError(
          `Unknown status change type: ${statusChange.type}`,
          'INVALID_STATUS_CHANGE'
        );
    }

    return quantities;
  }

  /**
   * Calculate estimated completion time
   */
  calculateEstimatedCompletion(mo) {
    if (!mo.completed_quantity || mo.completed_quantity === 0) {
      return null;
    }

    const createdAt = new Date(mo.created_at);
    const now = new Date();
    const timeElapsed = now - createdAt; // milliseconds
    const completionRate = mo.completed_quantity / timeElapsed; // panels per millisecond
    const remainingPanels = mo.target_quantity - mo.completed_quantity;
    
    if (remainingPanels <= 0) {
      return new Date().toISOString();
    }

    const estimatedTimeRemaining = remainingPanels / completionRate;
    const estimatedCompletion = new Date(now.getTime() + estimatedTimeRemaining);

    return estimatedCompletion.toISOString();
  }

  /**
   * Validate order number uniqueness
   */
  async validateOrderNumberUniqueness(orderNumber, client) {
    const query = 'SELECT id, order_number FROM manufacturing_orders WHERE order_number = $1';
    const result = await client.query(query, [orderNumber]);

    if (result.rows.length > 0) {
      throw new MOServiceError(
        `Order number already exists: ${orderNumber}`,
        'ORDER_NUMBER_DUPLICATE',
        { existingMoId: result.rows[0].id }
      );
    }

    return true;
  }

  /**
   * Validate panel type
   */
  validatePanelType(panelType) {
    const validTypes = ['36', '40', '60', '72', '144'];
    
    if (!validTypes.includes(panelType)) {
      throw new MOServiceError(
        `Invalid panel type: ${panelType}. Valid types: ${validTypes.join(', ')}`,
        'INVALID_PANEL_TYPE'
      );
    }

    return true;
  }

  /**
   * Map panel type to database enum
   */
  mapPanelTypeToEnum(panelType) {
    return `TYPE_${panelType}`;
  }

  /**
   * Log MO creation for audit trail
   */
  async logMOCreation(mo, metadata, client) {
    const logQuery = `
      INSERT INTO audit_log (
        entity_type, entity_id, action, user_id, new_values, 
        ip_address, user_agent, session_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    const logValues = [
      'MANUFACTURING_ORDER',
      mo.id,
      'CREATE',
      metadata.userId || null,
      JSON.stringify({
        order_number: mo.order_number,
        panel_type: mo.panel_type,
        target_quantity: mo.target_quantity,
        year_code: mo.year_code,
        frame_type: mo.frame_type,
        backsheet_type: mo.backsheet_type
      }),
      metadata.ipAddress || null,
      metadata.userAgent || null,
      metadata.sessionId || null,
      new Date().toISOString()
    ];

    await client.query(logQuery, logValues);
  }

  /**
   * Log progress updates for audit trail
   */
  async logProgressUpdate(oldMO, newMO, statusChange, metadata, client) {
    const logQuery = `
      INSERT INTO audit_log (
        entity_type, entity_id, action, user_id, old_values, new_values,
        ip_address, user_agent, session_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;

    const logValues = [
      'MANUFACTURING_ORDER',
      newMO.id,
      'UPDATE_PROGRESS',
      metadata.userId || null,
      JSON.stringify({
        completed_quantity: oldMO.completed_quantity,
        failed_quantity: oldMO.failed_quantity,
        in_progress_quantity: oldMO.in_progress_quantity
      }),
      JSON.stringify({
        completed_quantity: newMO.completed_quantity,
        failed_quantity: newMO.failed_quantity,
        in_progress_quantity: newMO.in_progress_quantity,
        status_change: statusChange
      }),
      metadata.ipAddress || null,
      metadata.userAgent || null,
      metadata.sessionId || null,
      new Date().toISOString()
    ];

    await client.query(logQuery, logValues);
  }
}

// Export singleton instance
export const manufacturingOrderService = new ManufacturingOrderService();

export default {
  ManufacturingOrderService,
  MOServiceError,
  manufacturingOrderService
};
