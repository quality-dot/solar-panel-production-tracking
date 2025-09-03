// Panel Database Model
// Handles panel data structure, validation, and database operations for barcode processing

import { databaseManager } from '../config/database.js';
import { ManufacturingLogger } from '../middleware/logger.js';
import { BarcodeError } from '../utils/barcodeProcessor.js';

const logger = new ManufacturingLogger('PanelModel');

/**
 * Panel status enumeration
 */
export const PANEL_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  PASSED: 'PASSED',
  FAILED: 'FAILED',
  REWORK: 'REWORK',
  COMPLETED: 'COMPLETED'
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
 * Line type enumeration
 */
export const LINE_TYPE = {
  LINE_1: 'LINE_1',
  LINE_2: 'LINE_2'
};

/**
 * Panel Model Class
 * Handles all panel-related database operations and data validation
 */
export class Panel {
  constructor(data = {}) {
    this.id = data.id;
    this.barcode = data.barcode;
    this.panelType = data.panelType;
    this.lineAssignment = data.lineAssignment;
    this.currentStationId = data.currentStationId;
    this.status = data.status || PANEL_STATUS.PENDING;
    this.moId = data.moId;
    this.wattagePmax = data.wattagePmax;
    this.vmp = data.vmp;
    this.imp = data.imp;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.completedAt = data.completedAt;
    
    // Additional manufacturing data
    this.constructionType = data.constructionType || 'monofacial';
    this.frameColor = data.frameColor || 'silver';
    this.productionYear = data.productionYear;
    this.qualityGrade = data.qualityGrade || 'A';
    this.notes = data.notes;
    
    // Validation tracking
    this.validationErrors = data.validationErrors || [];
    this.lastValidation = data.lastValidation;
  }

  /**
   * Validate panel data before database operations
   */
  validate() {
    const errors = [];

    if (!this.barcode) {
      errors.push('Barcode is required');
    } else if (this.barcode.length !== 13) {
      errors.push('Barcode must be exactly 13 characters');
    }

    if (!this.panelType) {
      errors.push('Panel type is required');
    } else if (!Object.values(PANEL_TYPE).includes(this.panelType)) {
      errors.push('Invalid panel type');
    }

    if (!this.lineAssignment) {
      errors.push('Line assignment is required');
    } else if (!Object.values(LINE_TYPE).includes(this.lineAssignment)) {
      errors.push('Invalid line assignment');
    }

    if (this.wattagePmax && (this.wattagePmax <= 0 || this.wattagePmax > 1000)) {
      errors.push('Wattage Pmax must be between 0 and 1000');
    }

    if (this.vmp && (this.vmp <= 0 || this.vmp > 100)) {
      errors.push('Vmp must be between 0 and 100');
    }

    if (this.imp && (this.imp <= 0 || this.imp > 20)) {
      errors.push('Imp must be between 0 and 20');
    }

    this.validationErrors = errors;
    this.lastValidation = new Date();

    return errors.length === 0;
  }

  /**
   * Create panel in database
   */
  async save() {
    if (!this.validate()) {
      throw new BarcodeError(
        'Panel validation failed',
        'VALIDATION_ERROR',
        { errors: this.validationErrors }
      );
    }

    try {
      const client = await databaseManager.getClient();
      
      const query = `
        INSERT INTO panels (
          barcode, panel_type, line_assignment, current_station_id, 
          status, mo_id, wattage_pmax, vmp, imp, 
          construction_type, frame_color, production_year, quality_grade, notes,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id, created_at
      `;

      const values = [
        this.barcode,
        this.panelType,
        this.lineAssignment,
        this.currentStationId,
        this.status,
        this.moId,
        this.wattagePmax,
        this.vmp,
        this.imp,
        this.constructionType,
        this.frameColor,
        this.productionYear,
        this.qualityGrade,
        this.notes,
        this.createdAt,
        this.updatedAt
      ];

      const result = await client.query(query, values);
      
      this.id = result.rows[0].id;
      this.createdAt = result.rows[0].created_at;
      
      logger.info('Panel created successfully', {
        panelId: this.id,
        barcode: this.barcode,
        panelType: this.panelType
      });

      return this;

    } catch (error) {
      logger.error('Failed to create panel', {
        error: error.message,
        barcode: this.barcode
      });
      throw new BarcodeError(
        'Failed to create panel in database',
        'DATABASE_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Update panel in database
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
          updateFields.push(`${this._camelToSnake(key)} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      });

      if (updateFields.length === 0) {
        return this; // No updates
      }

      // Add updated_at timestamp
      updateFields.push('updated_at = $' + paramCount);
      values.push(new Date());
      paramCount++;

      // Add WHERE clause
      values.push(this.id);

      const query = `
        UPDATE panels 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        throw new BarcodeError('Panel not found', 'NOT_FOUND');
      }

      // Update local instance
      Object.assign(this, result.rows[0]);
      this.updatedAt = result.rows[0].updated_at;

      logger.info('Panel updated successfully', {
        panelId: this.id,
        barcode: this.barcode,
        updates: Object.keys(updates)
      });

      return this;

    } catch (error) {
      logger.error('Failed to update panel', {
        error: error.message,
        panelId: this.id
      });
      throw new BarcodeError(
        'Failed to update panel in database',
        'DATABASE_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Find panel by barcode
   */
  static async findByBarcode(barcode) {
    try {
      const client = await databaseManager.getClient();
      
      const query = `
        SELECT * FROM panels 
        WHERE barcode = $1
        ORDER BY created_at DESC
        LIMIT 1
      `;

      const result = await client.query(query, [barcode]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return new Panel(result.rows[0]);

    } catch (error) {
      logger.error('Failed to find panel by barcode', {
        error: error.message,
        barcode
      });
      throw new BarcodeError(
        'Failed to find panel by barcode',
        'DATABASE_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Find panel by ID
   */
  static async findById(id) {
    try {
      const client = await databaseManager.getClient();
      
      const query = `
        SELECT * FROM panels 
        WHERE id = $1
      `;

      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return new Panel(result.rows[0]);

    } catch (error) {
      logger.error('Failed to find panel by ID', {
        error: error.message,
        panelId: id
      });
      throw new BarcodeError(
        'Failed to find panel by ID',
        'DATABASE_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Find panels by manufacturing order
   */
  static async findByManufacturingOrder(moId, options = {}) {
    try {
      const client = await databaseManager.getClient();
      
      let query = `
        SELECT * FROM panels 
        WHERE mo_id = $1
      `;
      
      const values = [moId];
      let paramCount = 2;

      if (options.status) {
        query += ` AND status = $${paramCount}`;
        values.push(options.status);
        paramCount++;
      }

      if (options.panelType) {
        query += ` AND panel_type = $${paramCount}`;
        values.push(options.panelType);
        paramCount++;
      }

      query += ` ORDER BY created_at ASC`;

      if (options.limit) {
        query += ` LIMIT $${paramCount}`;
        values.push(options.limit);
      }

      const result = await client.query(query, values);
      
      return result.rows.map(row => new Panel(row));

    } catch (error) {
      logger.error('Failed to find panels by manufacturing order', {
        error: error.message,
        moId
      });
      throw new BarcodeError(
        'Failed to find panels by manufacturing order',
        'DATABASE_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Check if barcode exists
   */
  static async barcodeExists(barcode) {
    try {
      const client = await databaseManager.getClient();
      
      const query = `
        SELECT EXISTS(
          SELECT 1 FROM panels WHERE barcode = $1
        ) as exists
      `;

      const result = await client.query(query, [barcode]);
      
      return result.rows[0].exists;

    } catch (error) {
      logger.error('Failed to check barcode existence', {
        error: error.message,
        barcode
      });
      throw new BarcodeError(
        'Failed to check barcode existence',
        'DATABASE_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Get panel statistics
   */
  static async getStatistics(options = {}) {
    try {
      const client = await databaseManager.getClient();
      
      let query = `
        SELECT 
          COUNT(*) as total_panels,
          COUNT(CASE WHEN status = 'PASSED' THEN 1 END) as passed_panels,
          COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_panels,
          COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as in_progress_panels,
          COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_panels
        FROM panels
      `;
      
      const values = [];
      let paramCount = 1;

      if (options.moId) {
        query += ` WHERE mo_id = $${paramCount}`;
        values.push(options.moId);
        paramCount++;
      }

      if (options.panelType) {
        const whereClause = options.moId ? 'AND' : 'WHERE';
        query += ` ${whereClause} panel_type = $${paramCount}`;
        values.push(options.panelType);
        paramCount++;
      }

      const result = await client.query(query, values);
      
      return result.rows[0];

    } catch (error) {
      logger.error('Failed to get panel statistics', {
        error: error.message
      });
      throw new BarcodeError(
        'Failed to get panel statistics',
        'DATABASE_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Delete panel (soft delete for audit purposes)
   */
  async delete() {
    try {
      const client = await databaseManager.getClient();
      
      const query = `
        UPDATE panels 
        SET status = 'DELETED', updated_at = $1
        WHERE id = $2
        RETURNING *
      `;

      const result = await client.query(query, [new Date(), this.id]);
      
      if (result.rows.length === 0) {
        throw new BarcodeError('Panel not found', 'NOT_FOUND');
      }

      this.status = 'DELETED';
      this.updatedAt = result.rows[0].updated_at;

      logger.info('Panel soft deleted', {
        panelId: this.id,
        barcode: this.barcode
      });

      return this;

    } catch (error) {
      logger.error('Failed to delete panel', {
        error: error.message,
        panelId: this.id
      });
      throw new BarcodeError(
        'Failed to delete panel',
        'DATABASE_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Convert camelCase to snake_case for database fields
   */
  _camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * Convert database row to Panel instance
   */
  static fromDatabaseRow(row) {
    return new Panel({
      id: row.id,
      barcode: row.barcode,
      panelType: row.panel_type,
      lineAssignment: row.line_assignment,
      currentStationId: row.current_station_id,
      status: row.status,
      moId: row.mo_id,
      wattagePmax: row.wattage_pmax,
      vmp: row.vmp,
      imp: row.imp,
      constructionType: row.construction_type,
      frameColor: row.frame_color,
      productionYear: row.production_year,
      qualityGrade: row.quality_grade,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at
    });
  }

  /**
   * Convert Panel instance to database row
   */
  toDatabaseRow() {
    return {
      barcode: this.barcode,
      panel_type: this.panelType,
      line_assignment: this.lineAssignment,
      current_station_id: this.currentStationId,
      status: this.status,
      mo_id: this.moId,
      wattage_pmax: this.wattagePmax,
      vmp: this.vmp,
      imp: this.imp,
      construction_type: this.constructionType,
      frame_color: this.frameColor,
      production_year: this.productionYear,
      quality_grade: this.qualityGrade,
      notes: this.notes,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
      completed_at: this.completedAt
    };
  }
}

// Export singleton instance for convenience
export const panelModel = new Panel();

export default Panel;
