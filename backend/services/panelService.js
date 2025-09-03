// Panel Database Service
// Handles panel creation, barcode validation, and database operations

import { databaseManager } from '../config/database.js';
import { 
  processBarcodeComplete,
  BarcodeError 
} from '../utils/barcodeProcessor.js';
import { 
  PanelSpecification,
  PANEL_SPECIFICATION_CONFIG 
} from '../utils/panelSpecificationOverride.js';
import { ManufacturingLogger } from '../middleware/logger.js';
import { optimizedDbQuery, processBarcodeOptimized } from '../utils/performanceOptimizer.js';
import { performanceCache, createCacheKey } from '../utils/performanceCache.js';
import { errorRecoverySystem, ManufacturingError } from '../utils/errorHandling.js';
import { 
  manufacturingOrderService, 
  MOServiceError 
} from './manufacturingOrderService.js';
import { 
  metricsService, 
  MetricsServiceError 
} from './metricsService.js';

const logger = new ManufacturingLogger('PanelService');

/**
 * Custom error class for panel service operations
 */
export class PanelServiceError extends Error {
  constructor(message, code, details = null) {
    super(message);
    this.name = 'PanelServiceError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Panel Database Service Class
 * Handles all panel-related database operations with barcode integration
 */
export class PanelService {
  constructor() {
    this.db = databaseManager;
  }

  /**
   * Create a new panel from barcode with optional overrides
   */
  async createPanelFromBarcode(barcodeString, options = {}) {
    const { overrides = {}, metadata = {}, moId = null } = options;
    
    return await errorRecoverySystem.executeWithRecovery(
      async () => this._createPanelFromBarcodeInternal(barcodeString, options),
      {
        serviceName: 'database',
        fallbackStrategy: 'databaseFailure',
        retryEnabled: true,
        circuitBreakerEnabled: true,
        context: { 
          operation: 'createPanelFromBarcode',
          barcode: barcodeString.substring(0, 10) + '...',
          moId,
          userId: metadata.userId 
        }
      }
    );
  }

  async _createPanelFromBarcodeInternal(barcodeString, options = {}) {
    const { overrides = {}, metadata = {}, moId = null } = options;
    const startTime = performance.now();
    
    try {
      // Start database transaction
      const client = await this.db.getClient();
      await client.query('BEGIN');

      try {
        // Step 1: Process barcode (optimized with caching)
        const barcodeResult = processBarcodeOptimized(barcodeString);
        
        if (!barcodeResult.success) {
          throw new PanelServiceError(
            'Barcode processing failed',
            'INVALID_BARCODE',
            barcodeResult.error
          );
        }

        // Step 2: Check barcode uniqueness
        await this.validateBarcodeUniqueness(barcodeString, client);

        // Step 3: Create panel specification with overrides
        const panelSpec = PanelSpecification.fromBarcodeWithOverrides(barcodeResult, overrides);
        
        // Add metadata
        if (metadata.overrideReason) panelSpec.overrideReason = metadata.overrideReason;
        if (metadata.userId) panelSpec.overrideBy = metadata.userId;
        if (metadata.specialInstructions) panelSpec.specialInstructions = metadata.specialInstructions;
        if (metadata.qcNotes) panelSpec.qcNotes = metadata.qcNotes;

        // Step 4: Validate panel specification
        const validation = panelSpec.validate();
        if (!validation.isValid) {
          throw new PanelServiceError(
            'Panel specification validation failed',
            'SPECIFICATION_INVALID',
            validation.errors
          );
        }

        // Step 5: Calculate theoretical electrical values
        const theoreticalValues = this.calculateTheoreticalValues(panelSpec.panelType);

        // Step 6: Insert panel into database
        const insertQuery = `
          INSERT INTO panels (
            barcode, panel_type, line_assignment, status, mo_id,
            factory_code, batch_code, sequence_number, production_year,
            nominal_wattage, construction_type, frame_color, quality_grade,
            voc_theoretical, isc_theoretical,
            manual_override, override_reason, override_by, override_timestamp,
            special_instructions, qc_notes, created_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20, $21, $22
          ) RETURNING *
        `;

        const dbFormat = panelSpec.toDatabaseFormat();
        const insertValues = [
          dbFormat.barcode,
          dbFormat.panel_type,
          dbFormat.line_assignment,
          'PENDING', // Initial status
          moId || null,
          dbFormat.factory_code,
          dbFormat.batch_code,
          dbFormat.sequence_number,
          dbFormat.production_year,
          dbFormat.nominal_wattage,
          dbFormat.construction_type,
          dbFormat.frame_color,
          dbFormat.quality_grade,
          theoreticalValues.voc,
          theoreticalValues.isc,
          dbFormat.manual_override,
          dbFormat.override_reason,
          dbFormat.override_by,
          dbFormat.override_timestamp,
          dbFormat.special_instructions,
          dbFormat.qc_notes,
          new Date().toISOString()
        ];

        const result = await client.query(insertQuery, insertValues);
        const createdPanel = result.rows[0];

        // Step 7: Log panel creation
        await this.logPanelCreation(createdPanel, metadata, client);

        // Step 8: Update MO progress if panel is associated with an MO
        if (moId) {
          try {
            await manufacturingOrderService.updateMOProgress(moId, {
              type: 'PANEL_STARTED',
              count: 1
            }, metadata);
          } catch (moError) {
            logger.warn('Failed to update MO progress for panel creation', {
              panelId: createdPanel.id,
              moId,
              error: moError.message
            });
            // Don't fail panel creation if MO update fails
          }
        }

        // Step 9: Record panel creation metrics
        try {
          metricsService.recordPanelEvent({
            panelId: createdPanel.id,
            barcode: barcodeString,
            moId: moId,
            lineAssignment: panelSpec.lineAssignment,
            hasOverrides: panelSpec.manualOverride,
            processingTime: performance.now() - startTime,
            userId: metadata.userId
          });
        } catch (metricsError) {
          logger.warn('Failed to record panel creation metrics', {
            panelId: createdPanel.id,
            error: metricsError.message
          });
          // Don't fail panel creation if metrics recording fails
        }

        // Commit transaction
        await client.query('COMMIT');

        logger.info('Panel created successfully', {
          panelId: createdPanel.id,
          barcode: barcodeString,
          panelType: panelSpec.panelType,
          lineAssignment: panelSpec.lineAssignment?.lineName,
          hasOverrides: panelSpec.manualOverride
        });

        return {
          success: true,
          panel: createdPanel,
          barcodeResult,
          specification: panelSpec.toApiFormat(),
          theoreticalValues,
          createdAt: new Date().toISOString()
        };

      } catch (error) {
        // Rollback transaction on error
        await client.query('ROLLBACK');
        throw error;
      } finally {
        // Release client
        client.release();
      }

    } catch (error) {
      logger.error('Panel creation failed', {
        barcode: barcodeString,
        error: error.message,
        code: error.code
      });

      if (error instanceof PanelServiceError || error instanceof BarcodeError) {
        throw error;
      }

      throw new PanelServiceError(
        'Database operation failed',
        'DATABASE_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Create panel with complete manual specification (for damaged/missing barcodes)
   */
  async createPanelManual(specification, metadata = {}) {
    try {
      const client = await this.db.getClient();
      await client.query('BEGIN');

      try {
        // Create panel specification
        const panelSpec = PanelSpecification.createManualSpecification(specification, metadata);
        
        // Validate specification
        const validation = panelSpec.validate();
        if (!validation.isValid) {
          throw new PanelServiceError(
            'Manual specification validation failed',
            'SPECIFICATION_INVALID',
            validation.errors
          );
        }

        // Update line assignment
        panelSpec.updateLineAssignment();

        // Generate temporary barcode if none provided
        if (!panelSpec.barcode) {
          panelSpec.barcode = `MANUAL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`.toUpperCase();
        }

        // Check barcode uniqueness
        await this.validateBarcodeUniqueness(panelSpec.barcode, client);

        // Calculate theoretical values
        const theoreticalValues = this.calculateTheoreticalValues(panelSpec.panelType);

        // Insert panel
        const insertQuery = `
          INSERT INTO panels (
            barcode, panel_type, line_assignment, status, mo_id,
            factory_code, batch_code, sequence_number, production_year,
            nominal_wattage, construction_type, frame_color, quality_grade,
            voc_theoretical, isc_theoretical,
            manual_override, override_reason, override_by, override_timestamp,
            special_instructions, qc_notes, created_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20, $21, $22
          ) RETURNING *
        `;

        const dbFormat = panelSpec.toDatabaseFormat();
        const insertValues = [
          dbFormat.barcode,
          dbFormat.panel_type,
          dbFormat.line_assignment,
          'PENDING',
          specification.moId || null,
          dbFormat.factory_code,
          dbFormat.batch_code,
          dbFormat.sequence_number,
          dbFormat.production_year,
          dbFormat.nominal_wattage,
          dbFormat.construction_type,
          dbFormat.frame_color,
          dbFormat.quality_grade,
          theoreticalValues.voc,
          theoreticalValues.isc,
          true, // Always manual override for manual specification
          dbFormat.override_reason,
          dbFormat.override_by,
          new Date().toISOString(),
          dbFormat.special_instructions,
          dbFormat.qc_notes,
          new Date().toISOString()
        ];

        const result = await client.query(insertQuery, insertValues);
        const createdPanel = result.rows[0];

        // Log panel creation
        await this.logPanelCreation(createdPanel, metadata, client);

        await client.query('COMMIT');

        logger.info('Manual panel created successfully', {
          panelId: createdPanel.id,
          barcode: createdPanel.barcode,
          panelType: panelSpec.panelType,
          isManual: true
        });

        return {
          success: true,
          panel: createdPanel,
          specification: panelSpec.toApiFormat(),
          theoreticalValues,
          createdAt: new Date().toISOString()
        };

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      if (error instanceof PanelServiceError) {
        throw error;
      }

      throw new PanelServiceError(
        'Manual panel creation failed',
        'DATABASE_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Find panel by barcode
   */
  async findByBarcode(barcode) {
    try {
      const query = `
        SELECT p.*, 
               mo.order_number as mo_order_number,
               mo.target_quantity as mo_target_quantity,
               s.name as current_station_name,
               s.station_type as current_station_type
        FROM panels p
        LEFT JOIN manufacturing_orders mo ON p.mo_id = mo.id
        LEFT JOIN stations s ON p.current_station_id = s.id
        WHERE p.barcode = $1
      `;

      const result = await this.db.query(query, [barcode]);

      if (result.rows.length === 0) {
        return null;
      }

      const panel = result.rows[0];
      
      // Add processing metadata
      return {
        ...panel,
        foundAt: new Date().toISOString(),
        hasOverrides: panel.manual_override,
        lineAssignment: {
          lineName: panel.line_assignment,
          lineNumber: panel.line_assignment === 'LINE_1' ? 1 : 2
        }
      };

    } catch (error) {
      logger.error('Panel lookup failed', {
        barcode,
        error: error.message
      });

      throw new PanelServiceError(
        'Panel lookup failed',
        'DATABASE_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Check if barcode already exists in database
   */
  async validateBarcodeUniqueness(barcode, client = null) {
    try {
      const dbClient = client || this.db;
      
      const query = 'SELECT id, barcode FROM panels WHERE barcode = $1';
      const result = await dbClient.query(query, [barcode]);

      if (result.rows.length > 0) {
        throw new PanelServiceError(
          `Barcode already exists: ${barcode}`,
          'BARCODE_DUPLICATE',
          { existingPanelId: result.rows[0].id }
        );
      }

      return true;

    } catch (error) {
      if (error instanceof PanelServiceError) {
        throw error;
      }

      throw new PanelServiceError(
        'Barcode uniqueness validation failed',
        'DATABASE_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Update panel status and station progression
   */
  async updatePanelStatus(panelId, status, stationId = null, metadata = {}) {
    try {
      const client = await this.db.getClient();
      await client.query('BEGIN');

      try {
        // Get current panel state
        const currentPanel = await client.query(
          'SELECT * FROM panels WHERE id = $1',
          [panelId]
        );

        if (currentPanel.rows.length === 0) {
          throw new PanelServiceError(
            `Panel not found: ${panelId}`,
            'PANEL_NOT_FOUND'
          );
        }

        const panel = currentPanel.rows[0];

        // Update panel status and station
        const updateQuery = `
          UPDATE panels 
          SET status = $1, 
              current_station_id = $2,
              updated_at = $3
          WHERE id = $4
          RETURNING *
        `;

        const result = await client.query(updateQuery, [
          status,
          stationId,
          new Date().toISOString(),
          panelId
        ]);

        const updatedPanel = result.rows[0];

        // Log status change
        await this.logStatusChange(panel, updatedPanel, metadata, client);

        // Update MO progress if status changed to completed or failed
        if (panel.mo_id && this.shouldUpdateMOProgress(panel.status, status)) {
          try {
            const statusChange = this.mapStatusToMOUpdate(panel.status, status);
            if (statusChange) {
              await manufacturingOrderService.updateMOProgress(panel.mo_id, statusChange, metadata);
            }
          } catch (moError) {
            logger.warn('Failed to update MO progress for status change', {
              panelId,
              moId: panel.mo_id,
              oldStatus: panel.status,
              newStatus: status,
              error: moError.message
            });
            // Don't fail panel update if MO update fails
          }
        }

        await client.query('COMMIT');

        logger.info('Panel status updated', {
          panelId,
          barcode: panel.barcode,
          oldStatus: panel.status,
          newStatus: status,
          stationId
        });

        return updatedPanel;

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      if (error instanceof PanelServiceError) {
        throw error;
      }

      throw new PanelServiceError(
        'Panel status update failed',
        'DATABASE_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Get panels by manufacturing order
   */
  async getPanelsByMO(moId, options = {}) {
    try {
      const { status, limit = 1000, offset = 0 } = options;
      
      let query = `
        SELECT p.*, s.name as current_station_name
        FROM panels p
        LEFT JOIN stations s ON p.current_station_id = s.id
        WHERE p.mo_id = $1
      `;
      
      const params = [moId];
      
      if (status) {
        query += ' AND p.status = $2';
        params.push(status);
      }
      
      query += ' ORDER BY p.created_at ASC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
      params.push(limit, offset);

      const result = await this.db.query(query, params);

      return {
        panels: result.rows,
        total: result.rowCount,
        moId,
        queriedAt: new Date().toISOString()
      };

    } catch (error) {
      throw new PanelServiceError(
        'MO panels lookup failed',
        'DATABASE_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Calculate theoretical electrical values based on panel type
   */
  calculateTheoreticalValues(panelType) {
    // Theoretical electrical values based on panel type
    const theoreticalValues = {
      '36': { voc: 22.5, isc: 9.5 },
      '40': { voc: 24.8, isc: 10.2 },
      '60': { voc: 37.2, isc: 9.5 },
      '72': { voc: 44.6, isc: 9.5 },
      '144': { voc: 49.2, isc: 11.8 }
    };

    return theoreticalValues[panelType] || { voc: null, isc: null };
  }

  /**
   * Log panel creation for audit trail
   */
  async logPanelCreation(panel, metadata, client) {
    const logQuery = `
      INSERT INTO audit_log (
        entity_type, entity_id, action, user_id, new_values, 
        ip_address, user_agent, session_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    const logValues = [
      'PANEL',
      panel.id,
      'CREATE',
      metadata.userId || null,
      JSON.stringify({
        barcode: panel.barcode,
        panel_type: panel.panel_type,
        line_assignment: panel.line_assignment,
        manual_override: panel.manual_override
      }),
      metadata.ipAddress || null,
      metadata.userAgent || null,
      metadata.sessionId || null,
      new Date().toISOString()
    ];

    await client.query(logQuery, logValues);
  }

  /**
   * Log status changes for audit trail
   */
  async logStatusChange(oldPanel, newPanel, metadata, client) {
    const logQuery = `
      INSERT INTO audit_log (
        entity_type, entity_id, action, user_id, old_values, new_values,
        ip_address, user_agent, session_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;

    const logValues = [
      'PANEL',
      newPanel.id,
      'UPDATE',
      metadata.userId || null,
      JSON.stringify({
        status: oldPanel.status,
        current_station_id: oldPanel.current_station_id
      }),
      JSON.stringify({
        status: newPanel.status,
        current_station_id: newPanel.current_station_id
      }),
      metadata.ipAddress || null,
      metadata.userAgent || null,
      metadata.sessionId || null,
      new Date().toISOString()
    ];

    await client.query(logQuery, logValues);
  }

  /**
   * Get panel statistics
   */
  async getPanelStatistics(options = {}) {
    try {
      const { moId, dateRange } = options;
      
      let query = `
        SELECT 
          COUNT(*) as total_panels,
          COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as in_progress,
          COUNT(CASE WHEN status = 'PASSED' THEN 1 END) as passed,
          COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed,
          COUNT(CASE WHEN status = 'REWORK' THEN 1 END) as rework,
          COUNT(CASE WHEN line_assignment = 'LINE_1' THEN 1 END) as line_1,
          COUNT(CASE WHEN line_assignment = 'LINE_2' THEN 1 END) as line_2,
          COUNT(CASE WHEN manual_override = true THEN 1 END) as manual_overrides,
          AVG(nominal_wattage) as avg_wattage
        FROM panels WHERE 1=1
      `;
      
      const params = [];
      
      if (moId) {
        query += ' AND mo_id = $' + (params.length + 1);
        params.push(moId);
      }
      
      if (dateRange && dateRange.start && dateRange.end) {
        query += ' AND created_at BETWEEN $' + (params.length + 1) + ' AND $' + (params.length + 2);
        params.push(dateRange.start, dateRange.end);
      }

      const result = await this.db.query(query, params);

      return {
        statistics: result.rows[0],
        generatedAt: new Date().toISOString(),
        filters: { moId, dateRange }
      };

    } catch (error) {
      throw new PanelServiceError(
        'Statistics generation failed',
        'DATABASE_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Check if panel status change should update MO progress
   */
  shouldUpdateMOProgress(oldStatus, newStatus) {
    const statusTransitions = {
      'PENDING': ['IN_PROGRESS', 'PASSED', 'FAILED'],
      'IN_PROGRESS': ['PASSED', 'FAILED', 'REWORK'],
      'REWORK': ['PASSED', 'FAILED', 'IN_PROGRESS'],
      'PASSED': ['FAILED', 'REWORK'], // Rare but possible
      'FAILED': ['REWORK'] // Rare but possible
    };

    return statusTransitions[oldStatus]?.includes(newStatus) || false;
  }

  /**
   * Map panel status change to MO progress update
   */
  mapStatusToMOUpdate(oldStatus, newStatus) {
    // Panel completed successfully
    if (newStatus === 'PASSED' && oldStatus !== 'PASSED') {
      return { type: 'PANEL_COMPLETED', count: 1 };
    }

    // Panel failed
    if (newStatus === 'FAILED' && oldStatus !== 'FAILED') {
      return { type: 'PANEL_FAILED', count: 1 };
    }

    // Panel moved to rework (considered still in progress)
    if (newStatus === 'REWORK') {
      return { type: 'PANEL_REWORK', count: 1 };
    }

    // Panel started (moved from pending to in progress)
    if (newStatus === 'IN_PROGRESS' && oldStatus === 'PENDING') {
      return { type: 'PANEL_STARTED', count: 1 };
    }

    return null; // No MO update needed
  }

  /**
   * Create panel from barcode with MO validation
   */
  async createPanelFromBarcodeWithMOValidation(barcodeString, options = {}) {
    const { overrides = {}, metadata = {}, moId = null, skipMOValidation = false } = options;

    try {
      // Step 1: Validate barcode against MO if not skipping
      if (!skipMOValidation) {
        const moValidation = await manufacturingOrderService.validateBarcodeAgainstMO(barcodeString, moId);
        
        if (!moValidation.isValid) {
          throw new PanelServiceError(
            'Barcode validation against MO failed',
            'MO_VALIDATION_FAILED',
            moValidation
          );
        }

        // Use the validated MO for panel creation
        options.moId = moValidation.manufacturingOrder.id;
      }

      // Step 2: Create panel using existing method
      return await this.createPanelFromBarcode(barcodeString, options);

    } catch (error) {
      if (error instanceof PanelServiceError || error instanceof MOServiceError) {
        throw error;
      }

      throw new PanelServiceError(
        'Panel creation with MO validation failed',
        'CREATION_WITH_MO_FAILED',
        { originalError: error.message }
      );
    }
  }
}

// Export singleton instance
export const panelService = new PanelService();

export default {
  PanelService,
  PanelServiceError,
  panelService
};
