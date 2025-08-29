/**
 * Event Store Service
 * Task: 22.3 - Event Collection System
 * Description: Database operations for security events
 * Date: 2025-08-28
 */

import { Pool } from 'pg';
import loggerService from './loggerService.js';

export class EventStore {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'solar_panel_tracking_dev',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    });
    
    this.initialize();
  }
  
  /**
   * Initialize the event store
   */
  async initialize() {
    try {
      // Test database connection
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      
      loggerService.logSecurity('info', 'Event store initialized successfully', {
        source: 'event-store',
        status: 'connected'
      });
    } catch (error) {
      loggerService.logSecurity('error', 'Failed to initialize event store', {
        source: 'event-store',
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Persist event to database
   * @param {Object} event - Security event object
   * @returns {string} Event ID
   */
  async persist(event) {
    const client = await this.pool.connect();
    
    try {
      const query = `
        INSERT INTO security_events (
          id, event_type, event_data, context, timestamp, 
          correlation_id, user_id, source_ip, severity
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `;
      
      const values = [
        event.id,
        event.eventType,
        JSON.stringify(event.eventData),
        JSON.stringify(event.context),
        event.timestamp,
        event.correlationId,
        event.userId,
        event.sourceIp,
        event.severity
      ];
      
      const result = await client.query(query, values);
      
      loggerService.logSecurity('debug', 'Event persisted successfully', {
        eventId: result.rows[0].id,
        eventType: event.eventType,
        source: 'event-store'
      });
      
      return result.rows[0].id;
    } catch (error) {
      loggerService.logSecurity('error', 'Failed to persist event', {
        eventId: event.id,
        eventType: event.eventType,
        error: error.message,
        source: 'event-store'
      });
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Retrieve events with filtering
   * @param {Object} filters - Filter criteria
   * @param {number} limit - Maximum number of events to return
   * @param {number} offset - Number of events to skip
   * @returns {Array} Array of events
   */
  async getEvents(filters = {}, limit = 100, offset = 0) {
    const client = await this.pool.connect();
    
    try {
      let query = 'SELECT * FROM security_events WHERE 1=1';
      const values = [];
      let valueIndex = 1;
      
      // Add filters
      if (filters.eventType) {
        query += ` AND event_type = $${valueIndex++}`;
        values.push(filters.eventType);
      }
      
      if (filters.userId) {
        query += ` AND user_id = $${valueIndex++}`;
        values.push(filters.userId);
      }
      
      if (filters.severity) {
        query += ` AND severity = $${valueIndex++}`;
        values.push(filters.severity);
      }
      
      if (filters.startDate) {
        query += ` AND timestamp >= $${valueIndex++}`;
        values.push(filters.startDate);
      }
      
      if (filters.endDate) {
        query += ` AND timestamp <= $${valueIndex++}`;
        values.push(filters.endDate);
      }
      
      if (filters.correlationId) {
        query += ` AND correlation_id = $${valueIndex++}`;
        values.push(filters.correlationId);
      }
      
      if (filters.sourceIp) {
        query += ` AND source_ip = $${valueIndex++}`;
        values.push(filters.sourceIp);
      }
      
      // Add ordering and pagination
      query += ` ORDER BY timestamp DESC LIMIT $${valueIndex++} OFFSET $${valueIndex++}`;
      values.push(limit, offset);
      
      const result = await client.query(query, values);
      
      // Parse JSONB fields
      const events = result.rows.map(row => ({
        ...row,
        eventData: JSON.parse(row.event_data),
        context: JSON.parse(row.context)
      }));
      
      loggerService.logSecurity('debug', 'Events retrieved successfully', {
        count: events.length,
        filters,
        source: 'event-store'
      });
      
      return events;
    } catch (error) {
      loggerService.logSecurity('error', 'Failed to retrieve events', {
        filters,
        error: error.message,
        source: 'event-store'
      });
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Get event statistics
   * @param {string} timePeriod - Time period for statistics
   * @returns {Array} Array of event statistics
   */
  async getEventStats(timePeriod = '24h') {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT 
          event_type,
          severity,
          COUNT(*) as count,
          MIN(timestamp) as first_occurrence,
          MAX(timestamp) as last_occurrence
        FROM security_events
        WHERE timestamp >= NOW() - INTERVAL '${timePeriod}'
        GROUP BY event_type, severity
        ORDER BY count DESC
      `;
      
      const result = await client.query(query);
      
      loggerService.logSecurity('debug', 'Event statistics retrieved successfully', {
        timePeriod,
        statCount: result.rows.length,
        source: 'event-store'
      });
      
      return result.rows;
    } catch (error) {
      loggerService.logSecurity('error', 'Failed to get event statistics', {
        timePeriod,
        error: error.message,
        source: 'event-store'
      });
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Get events by correlation ID
   * @param {string} correlationId - Correlation ID to search for
   * @returns {Array} Array of related events
   */
  async getEventsByCorrelation(correlationId) {
    return this.getEvents({ correlationId });
  }
  
  /**
   * Get recent events
   * @param {number} hours - Number of hours to look back
   * @param {number} limit - Maximum number of events to return
   * @returns {Array} Array of recent events
   */
  async getRecentEvents(hours = 24, limit = 100) {
    const startDate = new Date(Date.now() - (hours * 60 * 60 * 1000));
    return this.getEvents({ startDate }, limit);
  }
  
  /**
   * Get events by user
   * @param {string} userId - User ID to search for
   * @param {number} limit - Maximum number of events to return
   * @returns {Array} Array of user events
   */
  async getEventsByUser(userId, limit = 100) {
    return this.getEvents({ userId }, limit);
  }
  
  /**
   * Get events by type
   * @param {string} eventType - Event type to search for
   * @param {number} limit - Maximum number of events to return
   * @returns {Array} Array of events of specified type
   */
  async getEventsByType(eventType, limit = 100) {
    return this.getEvents({ eventType }, limit);
  }
  
  /**
   * Get events by severity
   * @param {string} severity - Severity level to search for
   * @param {number} limit - Maximum number of events to return
   * @returns {Array} Array of events with specified severity
   */
  async getEventsBySeverity(severity, limit = 100) {
    return this.getEvents({ severity }, limit);
  }
  
  /**
   * Search events by JSONB data
   * @param {string} jsonPath - JSON path to search in event_data
   * @param {string} value - Value to search for
   * @param {number} limit - Maximum number of events to return
   * @returns {Array} Array of matching events
   */
  async searchEventsByData(jsonPath, value, limit = 100) {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT * FROM security_events
        WHERE event_data @> $1
        ORDER BY timestamp DESC
        LIMIT $2
      `;
      
      const searchCriteria = { [jsonPath]: value };
      const result = await client.query(query, [JSON.stringify(searchCriteria), limit]);
      
      // Parse JSONB fields
      const events = result.rows.map(row => ({
        ...row,
        eventData: JSON.parse(row.event_data),
        context: JSON.parse(row.context)
      }));
      
      loggerService.logSecurity('debug', 'Events searched by data successfully', {
        jsonPath,
        value,
        count: events.length,
        source: 'event-store'
      });
      
      return events;
    } catch (error) {
      loggerService.logSecurity('error', 'Failed to search events by data', {
        jsonPath,
        value,
        error: error.message,
        source: 'event-store'
      });
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Mark event as processed
   * @param {string} eventId - Event ID to mark as processed
   * @returns {boolean} Success status
   */
  async markEventProcessed(eventId) {
    const client = await this.pool.connect();
    
    try {
      const query = `
        UPDATE security_events
        SET processed = TRUE
        WHERE id = $1
        RETURNING id
      `;
      
      const result = await client.query(query, [eventId]);
      
      if (result.rows.length > 0) {
        loggerService.logSecurity('debug', 'Event marked as processed', {
          eventId,
          source: 'event-store'
        });
        return true;
      }
      
      return false;
    } catch (error) {
      loggerService.logSecurity('error', 'Failed to mark event as processed', {
        eventId,
        error: error.message,
        source: 'event-store'
      });
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Get unprocessed events
   * @param {number} limit - Maximum number of events to return
   * @returns {Array} Array of unprocessed events
   */
  async getUnprocessedEvents(limit = 100) {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT * FROM security_events
        WHERE processed = FALSE
        ORDER BY timestamp ASC
        LIMIT $1
      `;
      
      const result = await client.query(query, [limit]);
      
      // Parse JSONB fields
      const events = result.rows.map(row => ({
        ...row,
        eventData: JSON.parse(row.event_data),
        context: JSON.parse(row.context)
      }));
      
      loggerService.logSecurity('debug', 'Unprocessed events retrieved successfully', {
        count: events.length,
        source: 'event-store'
      });
      
      return events;
    } catch (error) {
      loggerService.logSecurity('error', 'Failed to get unprocessed events', {
        error: error.message,
        source: 'event-store'
      });
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Clean up old events (for maintenance)
   * @param {number} daysOld - Number of days old to consider for cleanup
   * @returns {number} Number of events deleted
   */
  async cleanupOldEvents(daysOld = 365) {
    const client = await this.pool.connect();
    
    try {
      const query = `
        DELETE FROM security_events
        WHERE timestamp < NOW() - INTERVAL '${daysOld} days'
        AND processed = TRUE
      `;
      
      const result = await client.query(query);
      
      loggerService.logSecurity('info', 'Old events cleaned up successfully', {
        deletedCount: result.rowCount,
        daysOld,
        source: 'event-store'
      });
      
      return result.rowCount;
    } catch (error) {
      loggerService.logSecurity('error', 'Failed to cleanup old events', {
        daysOld,
        error: error.message,
        source: 'event-store'
      });
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Get database health status
   * @returns {Object} Health status information
   */
  async getHealthStatus() {
    const client = await this.pool.connect();
    
    try {
      // Check table exists
      const tableCheck = await client.query(`
        SELECT COUNT(*) as table_count
        FROM information_schema.tables
        WHERE table_name = 'security_events'
      `);
      
      // Get event count
      const eventCount = await client.query(`
        SELECT COUNT(*) as total_events
        FROM security_events
      `);
      
      // Get recent activity
      const recentActivity = await client.query(`
        SELECT COUNT(*) as recent_events
        FROM security_events
        WHERE timestamp >= NOW() - INTERVAL '1 hour'
      `);
      
      const health = {
        status: 'healthy',
        tables: tableCheck.rows[0].table_count > 0,
        totalEvents: parseInt(eventCount.rows[0].total_events),
        recentEvents: parseInt(recentActivity.rows[0].recent_events),
        timestamp: new Date().toISOString()
      };
      
      return health;
    } catch (error) {
      loggerService.logSecurity('error', 'Failed to get health status', {
        error: error.message,
        source: 'event-store'
      });
      
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    } finally {
      client.release();
    }
  }
  
  /**
   * Close database connections
   */
  async close() {
    try {
      await this.pool.end();
      loggerService.logSecurity('info', 'Event store connections closed', {
        source: 'event-store'
      });
    } catch (error) {
      loggerService.logSecurity('error', 'Failed to close event store connections', {
        error: error.message,
        source: 'event-store'
      });
    }
  }
}

// Export singleton instance
export const eventStore = new EventStore();
export default eventStore;
