// Database Integration Service
// Orchestrates database operations across Panel, Station, and ManufacturingOrder models
// Provides unified interface for barcode processing and validation

import { databaseManager } from '../config/database.js';
import { ManufacturingLogger } from '../middleware/logger.js';
import { BarcodeError } from '../utils/barcodeProcessor.js';
import { Panel, panelModel, PANEL_STATUS, PANEL_TYPE, LINE_TYPE } from '../models/Panel.js';
import { Station, stationModel, STATION_TYPE } from '../models/Station.js';
import { ManufacturingOrder, manufacturingOrderModel, MO_STATUS } from '../models/ManufacturingOrder.js';

const logger = new ManufacturingLogger('DatabaseService');

/**
 * Database Integration Service Class
 * Handles complex database operations involving multiple models
 */
export class DatabaseService {
  constructor() {
    this.panelModel = panelModel;
    this.stationModel = stationModel;
    this.manufacturingOrderModel = manufacturingOrderModel;
  }

  /**
   * Initialize database tables and relationships
   */
  async initializeDatabase() {
    try {
      const client = await databaseManager.getClient();
      
      // Create tables if they don't exist
      await this.createTables(client);
      
      // Create indexes for performance
      await this.createIndexes(client);
      
      // Insert default data
      await this.insertDefaultData(client);
      
      logger.info('Database initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize database', {
        error: error.message
      });
      throw new BarcodeError(
        'Database initialization failed',
        'DATABASE_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Create database tables
   */
  async createTables(client) {
    // Create panels table
    await client.query(`
      CREATE TABLE IF NOT EXISTS panels (
        id SERIAL PRIMARY KEY,
        barcode VARCHAR(13) UNIQUE NOT NULL,
        panel_type VARCHAR(20) NOT NULL,
        line_assignment VARCHAR(10) NOT NULL,
        current_station_id INTEGER,
        status VARCHAR(20) DEFAULT 'PENDING',
        mo_id INTEGER,
        wattage_pmax DECIMAL(6,2),
        vmp DECIMAL(5,2),
        imp DECIMAL(4,2),
        construction_type VARCHAR(20) DEFAULT 'monofacial',
        frame_color VARCHAR(20) DEFAULT 'silver',
        production_year INTEGER,
        quality_grade VARCHAR(5) DEFAULT 'A',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      )
    `);

    // Create stations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS stations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        station_type VARCHAR(30) NOT NULL,
        line VARCHAR(10) NOT NULL,
        station_number INTEGER NOT NULL,
        criteria_config JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        description TEXT,
        location VARCHAR(100),
        operator_id INTEGER,
        current_status VARCHAR(20) DEFAULT 'idle',
        last_activity TIMESTAMP,
        error_count INTEGER DEFAULT 0,
        uptime INTEGER DEFAULT 0,
        total_scans INTEGER DEFAULT 0,
        successful_scans INTEGER DEFAULT 0,
        failed_scans INTEGER DEFAULT 0,
        average_processing_time DECIMAL(8,3) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create manufacturing_orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS manufacturing_orders (
        id SERIAL PRIMARY KEY,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        panel_type VARCHAR(20) NOT NULL,
        target_quantity INTEGER NOT NULL,
        completed_quantity INTEGER DEFAULT 0,
        failed_quantity INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'PENDING',
        created_by INTEGER,
        priority VARCHAR(20) DEFAULT 'medium',
        due_date DATE,
        assigned_line VARCHAR(10),
        quality_target INTEGER DEFAULT 95,
        efficiency_target INTEGER DEFAULT 90,
        barcode_start INTEGER,
        barcode_end INTEGER,
        current_barcode_sequence INTEGER DEFAULT 0,
        current_station INTEGER,
        estimated_completion TIMESTAMP,
        actual_start_time TIMESTAMP,
        total_production_time INTEGER,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        started_at TIMESTAMP,
        completed_at TIMESTAMP
      )
    `);

    // Create barcode_events table for audit trail
    await client.query(`
      CREATE TABLE IF NOT EXISTS barcode_events (
        id SERIAL PRIMARY KEY,
        barcode VARCHAR(13) NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        station_id INTEGER,
        mo_id INTEGER,
        event_data JSONB DEFAULT '{}',
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        operator_id INTEGER,
        success BOOLEAN DEFAULT true,
        error_message TEXT
      )
    `);

    logger.info('Database tables created successfully');
  }

  /**
   * Create database indexes for performance
   */
  async createIndexes(client) {
    // Panel indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_panels_barcode ON panels(barcode)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_panels_mo_id ON panels(mo_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_panels_status ON panels(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_panels_line_assignment ON panels(line_assignment)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_panels_created_at ON panels(created_at)');

    // Station indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_stations_line ON stations(line)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_stations_type ON stations(station_type)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_stations_active ON stations(is_active)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_stations_name ON stations(name)');

    // Manufacturing order indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_mo_order_number ON manufacturing_orders(order_number)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_mo_status ON manufacturing_orders(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_mo_panel_type ON manufacturing_orders(panel_type)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_mo_assigned_line ON manufacturing_orders(assigned_line)');

    // Barcode event indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_events_barcode ON barcode_events(barcode)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_events_timestamp ON barcode_events(timestamp)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_events_station_id ON barcode_events(station_id)');

    logger.info('Database indexes created successfully');
  }

  /**
   * Insert default data
   */
  async insertDefaultData(client) {
    // Insert default stations if none exist
    const stationCount = await client.query('SELECT COUNT(*) FROM stations');
    if (parseInt(stationCount.rows[0].count) === 0) {
      const defaultStations = [
        { name: 'Assembly-EL-1', stationType: 'ASSEMBLY_EL', line: 'LINE_1', stationNumber: 1, description: 'Assembly Station 1 - Line 1' },
        { name: 'Assembly-EL-2', stationType: 'ASSEMBLY_EL', line: 'LINE_1', stationNumber: 2, description: 'Assembly Station 2 - Line 1' },
        { name: 'Framing-1', stationType: 'FRAMING', line: 'LINE_1', stationNumber: 3, description: 'Framing Station 1 - Line 1' },
        { name: 'Framing-2', stationType: 'FRAMING', line: 'LINE_1', stationNumber: 4, description: 'Framing Station 2 - Line 1' },
        { name: 'Assembly-EL-3', stationType: 'ASSEMBLY_EL', line: 'LINE_2', stationNumber: 1, description: 'Assembly Station 1 - Line 2' },
        { name: 'Assembly-EL-4', stationType: 'ASSEMBLY_EL', line: 'LINE_2', stationNumber: 2, description: 'Assembly Station 2 - Line 2' },
        { name: 'Framing-3', stationType: 'FRAMING', line: 'LINE_2', stationNumber: 3, description: 'Framing Station 1 - Line 2' },
        { name: 'Framing-4', stationType: 'FRAMING', line: 'LINE_2', stationNumber: 4, description: 'Framing Station 2 - Line 2' }
      ];

      for (const stationData of defaultStations) {
        const station = new Station(stationData);
        await station.save();
      }

      logger.info('Default stations created successfully');
    }
  }

  /**
   * Process barcode with full database integration
   */
  async processBarcode(barcode, stationId, metadata = {}) {
    const client = await databaseManager.getClient();
    
    try {
      await client.query('BEGIN');

      // Validate barcode format
      if (!this.validateBarcodeFormat(barcode)) {
        throw new BarcodeError('Invalid barcode format', 'INVALID_FORMAT');
      }

      // Check if barcode already exists
      const existingPanel = await Panel.findByBarcode(barcode);
      if (existingPanel) {
        throw new BarcodeError('Barcode already exists', 'DUPLICATE_BARCODE');
      }

      // Parse barcode components
      const barcodeData = this.parseBarcode(barcode);
      
      // Find or create manufacturing order
      let mo = await this.findOrCreateManufacturingOrder(barcodeData, metadata);
      
      // Create panel record
      const panel = new Panel({
        barcode: barcode,
        panelType: barcodeData.panelType,
        lineAssignment: barcodeData.lineAssignment,
        currentStationId: stationId,
        moId: mo.id,
        wattagePmax: barcodeData.wattagePmax,
        vmp: barcodeData.vmp,
        imp: barcodeData.imp,
        productionYear: new Date().getFullYear()
      });

      await panel.save();

      // Update station activity
      const station = await Station.findById(stationId);
      if (station) {
        await station.updateActivity({
          status: 'active',
          totalScans: station.totalScans + 1,
          successfulScans: station.successfulScans + 1
        });
      }

      // Log barcode event
      await this.logBarcodeEvent(barcode, 'BARCODE_PROCESSED', stationId, mo.id, {
        panelId: panel.id,
        panelType: barcodeData.panelType,
        lineAssignment: barcodeData.lineAssignment
      });

      await client.query('COMMIT');

      logger.info('Barcode processed successfully', {
        barcode,
        panelId: panel.id,
        moId: mo.id,
        stationId
      });

      return {
        panel,
        manufacturingOrder: mo,
        barcodeData
      };

    } catch (error) {
      await client.query('ROLLBACK');
      
      // Log failed event
      await this.logBarcodeEvent(barcode, 'BARCODE_PROCESSING_FAILED', stationId, null, {
        error: error.message,
        metadata
      });

      throw error;
    }
  }

  /**
   * Validate barcode format
   */
  validateBarcodeFormat(barcode) {
    // CRSYYFBPP##### format validation
    const barcodePattern = /^CRS\d{2}[YF]BPP\d{5}$/;
    return barcodePattern.test(barcode);
  }

  /**
   * Parse barcode into components
   */
  parseBarcode(barcode) {
    const year = barcode.substring(3, 5);
    const isFramed = barcode.substring(5, 6) === 'F';
    const panelType = barcode.substring(6, 8);
    const sequence = barcode.substring(8);

    // Determine panel type from barcode
    let panelTypeEnum;
    switch (panelType) {
      case '36': panelTypeEnum = PANEL_TYPE.TYPE_36; break;
      case '40': panelTypeEnum = PANEL_TYPE.TYPE_40; break;
      case '60': panelTypeEnum = PANEL_TYPE.TYPE_60; break;
      case '72': panelTypeEnum = PANEL_TYPE.TYPE_72; break;
      case '14': panelTypeEnum = PANEL_TYPE.TYPE_144; break;
      default: throw new BarcodeError('Invalid panel type in barcode', 'INVALID_PANEL_TYPE');
    }

    // Determine line assignment based on sequence
    const sequenceNum = parseInt(sequence);
    const lineAssignment = sequenceNum % 2 === 0 ? LINE_TYPE.LINE_2 : LINE_TYPE.LINE_1;

    // Calculate electrical parameters based on panel type
    const electricalParams = this.calculateElectricalParameters(panelTypeEnum);

    return {
      year: parseInt(year),
      isFramed,
      panelType: panelTypeEnum,
      sequence: parseInt(sequence),
      lineAssignment,
      wattagePmax: electricalParams.wattagePmax,
      vmp: electricalParams.vmp,
      imp: electricalParams.imp
    };
  }

  /**
   * Calculate electrical parameters for panel type
   */
  calculateElectricalParameters(panelType) {
    const params = {
      [PANEL_TYPE.TYPE_36]: { wattagePmax: 36, vmp: 18.0, imp: 2.0 },
      [PANEL_TYPE.TYPE_40]: { wattagePmax: 40, vmp: 20.0, imp: 2.0 },
      [PANEL_TYPE.TYPE_60]: { wattagePmax: 60, vmp: 30.0, imp: 2.0 },
      [PANEL_TYPE.TYPE_72]: { wattagePmax: 72, vmp: 36.0, imp: 2.0 },
      [PANEL_TYPE.TYPE_144]: { wattagePmax: 144, vmp: 72.0, imp: 2.0 }
    };

    return params[panelType] || { wattagePmax: 0, vmp: 0, imp: 0 };
  }

  /**
   * Find or create manufacturing order for barcode
   */
  async findOrCreateManufacturingOrder(barcodeData, metadata) {
    // Try to find existing active MO for this panel type and line
    const existingMO = await ManufacturingOrder.findActiveOrders({
      panelType: barcodeData.panelType,
      assignedLine: barcodeData.lineAssignment
    });

    if (existingMO.length > 0) {
      // Use existing MO
      return existingMO[0];
    }

    // Create new MO
    const mo = new ManufacturingOrder({
      orderNumber: `MO-${barcodeData.panelType}-${Date.now()}`,
      panelType: barcodeData.panelType,
      targetQuantity: metadata.targetQuantity || 100,
      assignedLine: barcodeData.lineAssignment,
      createdBy: metadata.createdBy || 1,
      priority: metadata.priority || 'medium',
      barcodeStart: barcodeData.sequence,
      barcodeEnd: barcodeData.sequence + (metadata.targetQuantity || 100) - 1
    });

    await mo.save();
    return mo;
  }

  /**
   * Log barcode event for audit trail
   */
  async logBarcodeEvent(barcode, eventType, stationId, moId, eventData) {
    try {
      const client = await databaseManager.getClient();
      
      const query = `
        INSERT INTO barcode_events (
          barcode, event_type, station_id, mo_id, event_data, operator_id, success
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;

      const values = [
        barcode,
        eventType,
        stationId,
        moId,
        JSON.stringify(eventData),
        eventData.operatorId || null,
        !eventData.error
      ];

      await client.query(query, values);

    } catch (error) {
      logger.error('Failed to log barcode event', {
        error: error.message,
        barcode,
        eventType
      });
      // Don't throw - logging failure shouldn't break main operation
    }
  }

  /**
   * Get comprehensive barcode processing statistics
   */
  async getBarcodeStatistics(options = {}) {
    try {
      const client = await databaseManager.getClient();
      
      // Get panel statistics
      const panelStats = await Panel.getStatistics(options);
      
      // Get station statistics
      const stationStats = await Station.getStatistics(options);
      
      // Get MO statistics
      const moStats = await ManufacturingOrder.getStatistics(options);
      
      // Get barcode event statistics
      const eventQuery = `
        SELECT 
          COUNT(*) as total_events,
          COUNT(CASE WHEN success = true THEN 1 END) as successful_events,
          COUNT(CASE WHEN success = false THEN 1 END) as failed_events,
          COUNT(CASE WHEN event_type = 'BARCODE_PROCESSED' THEN 1 END) as processed_barcodes,
          COUNT(CASE WHEN event_type = 'BARCODE_PROCESSING_FAILED' THEN 1 END) as failed_barcodes
        FROM barcode_events
        WHERE timestamp >= $1
      `;
      
      const cutoffDate = options.since || new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
      const eventResult = await client.query(eventQuery, [cutoffDate]);
      const eventStats = eventResult.rows[0];

      return {
        panels: panelStats,
        stations: stationStats,
        manufacturingOrders: moStats,
        events: eventStats,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('Failed to get barcode statistics', {
        error: error.message
      });
      throw new BarcodeError(
        'Failed to get barcode statistics',
        'DATABASE_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Get barcode processing history
   */
  async getBarcodeHistory(barcode, options = {}) {
    try {
      const client = await databaseManager.getClient();
      
      let query = `
        SELECT 
          be.*,
          p.panel_type,
          p.line_assignment,
          p.status as panel_status,
          s.name as station_name,
          mo.order_number
        FROM barcode_events be
        LEFT JOIN panels p ON be.barcode = p.barcode
        LEFT JOIN stations s ON be.station_id = s.id
        LEFT JOIN manufacturing_orders mo ON be.mo_id = mo.id
        WHERE be.barcode = $1
        ORDER BY be.timestamp DESC
      `;
      
      const values = [barcode];
      let paramCount = 2;

      if (options.limit) {
        query += ` LIMIT $${paramCount}`;
        values.push(options.limit);
        paramCount++;
      }

      const result = await client.query(query, values);
      
      return result.rows.map(row => ({
        id: row.id,
        eventType: row.event_type,
        timestamp: row.timestamp,
        stationName: row.station_name,
        panelType: row.panel_type,
        lineAssignment: row.line_assignment,
        panelStatus: row.panel_status,
        orderNumber: row.order_number,
        eventData: row.event_data,
        success: row.success,
        errorMessage: row.error_message
      }));

    } catch (error) {
      logger.error('Failed to get barcode history', {
        error: error.message,
        barcode
      });
      throw new BarcodeError(
        'Failed to get barcode history',
        'DATABASE_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Clean up old barcode events
   */
  async cleanupOldEvents(daysToKeep = 90) {
    try {
      const client = await databaseManager.getClient();
      
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
      
      const query = `
        DELETE FROM barcode_events 
        WHERE timestamp < $1
      `;
      
      const result = await client.query(query, [cutoffDate]);
      
      logger.info('Old barcode events cleaned up', {
        deletedCount: result.rowCount,
        cutoffDate
      });
      
      return result.rowCount;

    } catch (error) {
      logger.error('Failed to cleanup old events', {
        error: error.message
      });
      throw new BarcodeError(
        'Failed to cleanup old events',
        'DATABASE_ERROR',
        { originalError: error.message }
      );
    }
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();

export default DatabaseService;
