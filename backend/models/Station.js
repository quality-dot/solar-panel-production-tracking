// Station Database Model
// Handles station configuration, assignment, and barcode processing operations

import { databaseManager } from '../config/database.js';
import { ManufacturingLogger } from '../middleware/logger.js';
import { BarcodeError } from '../utils/barcodeProcessor.js';

const logger = new ManufacturingLogger('StationModel');

/**
 * Station type enumeration
 */
export const STATION_TYPE = {
  ASSEMBLY_EL: 'ASSEMBLY_EL',
  FRAMING: 'FRAMING',
  JUNCTION_BOX: 'JUNCTION_BOX',
  PERFORMANCE: 'PERFORMANCE'
};

/**
 * Line type enumeration
 */
export const LINE_TYPE = {
  LINE_1: 'LINE_1',
  LINE_2: 'LINE_2'
};

/**
 * Station Model Class
 * Handles all station-related database operations and configuration
 */
export class Station {
  constructor(data = {}) {
    this.id = data.id;
    this.name = data.name;
    this.stationType = data.stationType;
    this.line = data.line;
    this.stationNumber = data.stationNumber;
    this.criteriaConfig = data.criteriaConfig || {};
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    
    // Additional station data
    this.description = data.description;
    this.location = data.location;
    this.operatorId = data.operatorId;
    this.currentStatus = data.currentStatus || 'idle';
    this.lastActivity = data.lastActivity;
    this.errorCount = data.errorCount || 0;
    this.uptime = data.uptime || 0;
    
    // Performance metrics
    this.totalScans = data.totalScans || 0;
    this.successfulScans = data.successfulScans || 0;
    this.failedScans = data.failedScans || 0;
    this.averageProcessingTime = data.averageProcessingTime || 0;
  }

  /**
   * Validate station data before database operations
   */
  validate() {
    const errors = [];

    if (!this.name) {
      errors.push('Station name is required');
    }

    if (!this.stationType) {
      errors.push('Station type is required');
    } else if (!Object.values(STATION_TYPE).includes(this.stationType)) {
      errors.push('Invalid station type');
    }

    if (!this.line) {
      errors.push('Line assignment is required');
    } else if (!Object.values(LINE_TYPE).includes(this.line)) {
      errors.push('Invalid line assignment');
    }

    if (!this.stationNumber || this.stationNumber < 1) {
      errors.push('Station number must be a positive integer');
    }

    if (this.criteriaConfig && typeof this.criteriaConfig !== 'object') {
      errors.push('Criteria config must be an object');
    }

    return errors.length === 0;
  }

  /**
   * Create station in database
   */
  async save() {
    if (!this.validate()) {
      throw new BarcodeError(
        'Station validation failed',
        'VALIDATION_ERROR',
        { errors: this.validationErrors }
      );
    }

    try {
      const client = await databaseManager.getClient();
      
      const query = `
        INSERT INTO stations (
          name, station_type, line, station_number, criteria_config,
          is_active, description, location, operator_id, current_status,
          last_activity, error_count, uptime, total_scans, successful_scans,
          failed_scans, average_processing_time, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING id, created_at
      `;

      const values = [
        this.name,
        this.stationType,
        this.line,
        this.stationNumber,
        JSON.stringify(this.criteriaConfig),
        this.isActive,
        this.description,
        this.location,
        this.operatorId,
        this.currentStatus,
        this.lastActivity,
        this.errorCount,
        this.uptime,
        this.totalScans,
        this.successfulScans,
        this.failedScans,
        this.averageProcessingTime,
        this.createdAt,
        this.updatedAt
      ];

      const result = await client.query(query, values);
      
      this.id = result.rows[0].id;
      this.createdAt = result.rows[0].created_at;
      
      logger.info('Station created successfully', {
        stationId: this.id,
        name: this.name,
        stationType: this.stationType,
        line: this.line
      });

      return this;

    } catch (error) {
      logger.error('Failed to create station', {
        error: error.message,
        name: this.name
      });
      throw new BarcodeError(
        'Failed to create station in database',
        'DATABASE_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Update station in database
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
          if (key === 'criteriaConfig') {
            updateFields.push(`${fieldName} = $${paramCount}`);
            values.push(JSON.stringify(value));
          } else {
            updateFields.push(`${fieldName} = $${paramCount}`);
            values.push(value);
          }
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
        UPDATE stations 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        throw new BarcodeError('Station not found', 'NOT_FOUND');
      }

      // Update local instance
      Object.assign(this, result.rows[0]);
      this.updatedAt = result.rows[0].updated_at;

      logger.info('Station updated successfully', {
        stationId: this.id,
        name: this.name,
        updates: Object.keys(updates)
      });

      return this;

    } catch (error) {
      logger.error('Failed to update station', {
        error: error.message,
        stationId: this.id
      });
      throw new BarcodeError(
        'Failed to update station in database',
        'DATABASE_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Find station by ID
   */
  static async findById(id) {
    try {
      const client = await databaseManager.getClient();
      
      const query = `
        SELECT * FROM stations 
        WHERE id = $1
      `;

      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return new Station(result.rows[0]);

    } catch (error) {
      logger.error('Failed to find station by ID', {
        error: error.message,
        stationId: id
      });
      throw new BarcodeError(
        'Failed to find station by ID',
        'DATABASE_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Find station by name
   */
  static async findByName(name) {
    try {
      const client = await databaseManager.getClient();
      
      const query = `
        SELECT * FROM stations 
        WHERE name = $1
        ORDER BY created_at DESC
        LIMIT 1
      `;

      const result = await client.query(query, [name]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return new Station(result.rows[0]);

    } catch (error) {
      logger.error('Failed to find station by name', {
        error: error.message,
        name
      });
      throw new BarcodeError(
        'Failed to find station by name',
        'DATABASE_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Find stations by line
   */
  static async findByLine(line, options = {}) {
    try {
      const client = await databaseManager.getClient();
      
      let query = `
        SELECT * FROM stations 
        WHERE line = $1
      `;
      
      const values = [line];
      let paramCount = 2;

      if (options.stationType) {
        query += ` AND station_type = $${paramCount}`;
        values.push(options.stationType);
        paramCount++;
      }

      if (options.isActive !== undefined) {
        query += ` AND is_active = $${paramCount}`;
        values.push(options.isActive);
        paramCount++;
      }

      query += ` ORDER BY station_number ASC`;

      const result = await client.query(query, values);
      
      return result.rows.map(row => new Station(row));

    } catch (error) {
      logger.error('Failed to find stations by line', {
        error: error.message,
        line
      });
      throw new BarcodeError(
        'Failed to find stations by line',
        'DATABASE_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Find all active stations
   */
  static async findActiveStations() {
    try {
      const client = await databaseManager.getClient();
      
      const query = `
        SELECT * FROM stations 
        WHERE is_active = true
        ORDER BY line, station_number
      `;

      const result = await client.query(query);
      
      return result.rows.map(row => new Station(row));

    } catch (error) {
      logger.error('Failed to find active stations', {
        error: error.message
      });
      throw new BarcodeError(
        'Failed to find active stations',
        'DATABASE_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Get station statistics
   */
  static async getStatistics(options = {}) {
    try {
      const client = await databaseManager.getClient();
      
      let query = `
        SELECT 
          COUNT(*) as total_stations,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_stations,
          COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_stations,
          COUNT(CASE WHEN current_status = 'active' THEN 1 END) as busy_stations,
          COUNT(CASE WHEN current_status = 'idle' THEN 1 END) as idle_stations,
          COUNT(CASE WHEN error_count > 0 THEN 1 END) as error_stations
        FROM stations
      `;
      
      const values = [];
      let paramCount = 1;

      if (options.line) {
        query += ` WHERE line = $${paramCount}`;
        values.push(options.line);
        paramCount++;
      }

      if (options.stationType) {
        const whereClause = options.line ? 'AND' : 'WHERE';
        query += ` ${whereClause} station_type = $${paramCount}`;
        values.push(options.stationType);
        paramCount++;
      }

      const result = await client.query(query, values);
      
      return result.rows[0];

    } catch (error) {
      logger.error('Failed to get station statistics', {
        error: error.message
      });
      throw new BarcodeError(
        'Failed to get station statistics',
        'DATABASE_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Update station activity and metrics
   */
  async updateActivity(activityData) {
    const updates = {
      currentStatus: activityData.status || this.currentStatus,
      lastActivity: new Date(),
      errorCount: activityData.errorCount !== undefined ? activityData.errorCount : this.errorCount,
      uptime: activityData.uptime !== undefined ? activityData.uptime : this.uptime,
      totalScans: activityData.totalScans !== undefined ? activityData.totalScans : this.totalScans,
      successfulScans: activityData.successfulScans !== undefined ? activityData.successfulScans : this.successfulScans,
      failedScans: activityData.failedScans !== undefined ? activityData.failedScans : this.failedScans,
      averageProcessingTime: activityData.averageProcessingTime !== undefined ? activityData.averageProcessingTime : this.averageProcessingTime
    };

    return await this.update(updates);
  }

  /**
   * Assign operator to station
   */
  async assignOperator(operatorId) {
    return await this.update({ operatorId });
  }

  /**
   * Update station criteria configuration
   */
  async updateCriteriaConfig(criteriaConfig) {
    return await this.update({ criteriaConfig });
  }

  /**
   * Activate/deactivate station
   */
  async setActiveStatus(isActive) {
    return await this.update({ isActive });
  }

  /**
   * Convert camelCase to snake_case for database fields
   */
  _camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * Convert database row to Station instance
   */
  static fromDatabaseRow(row) {
    return new Station({
      id: row.id,
      name: row.name,
      stationType: row.station_type,
      line: row.line,
      stationNumber: row.station_number,
      criteriaConfig: row.criteria_config ? JSON.parse(row.criteria_config) : {},
      isActive: row.is_active,
      description: row.description,
      location: row.location,
      operatorId: row.operator_id,
      currentStatus: row.current_status,
      lastActivity: row.last_activity,
      errorCount: row.error_count,
      uptime: row.uptime,
      totalScans: row.total_scans,
      successfulScans: row.successful_scans,
      failedScans: row.failed_scans,
      averageProcessingTime: row.average_processing_time,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }

  /**
   * Convert Station instance to database row
   */
  toDatabaseRow() {
    return {
      name: this.name,
      station_type: this.stationType,
      line: this.line,
      station_number: this.stationNumber,
      criteria_config: JSON.stringify(this.criteriaConfig),
      is_active: this.isActive,
      description: this.description,
      location: this.location,
      operator_id: this.operatorId,
      current_status: this.currentStatus,
      last_activity: this.lastActivity,
      error_count: this.errorCount,
      uptime: this.uptime,
      total_scans: this.totalScans,
      successful_scans: this.successfulScans,
      failed_scans: this.failedScans,
      average_processing_time: this.averageProcessingTime,
      created_at: this.createdAt,
      updated_at: this.updatedAt
    };
  }
}

// Export singleton instance for convenience
export const stationModel = new Station();

export default Station;
