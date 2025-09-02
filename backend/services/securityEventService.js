/**
 * SecurityEventService - Database operations for security events
 */

// Mock database connection for testing
const db = {
  execute: async (query, params = []) => {
    console.log('Mock DB Query:', query, params);
    return [[], []]; // Mock result
  }
};

class SecurityEventService {
  constructor() {
    this.tableName = 'security_events';
  }

  async storeEvent(event) {
    try {
      const query = `
        INSERT INTO ${this.tableName} (
          id, type, severity, category, message, data, context, created_at, processed
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const values = [
        event.id,
        event.type,
        event.severity,
        event.category,
        event.message,
        JSON.stringify(event.data),
        JSON.stringify(event.context.toJSON()),
        event.createdAt,
        event.processed
      ];
      await db.execute(query, values);
      return event;
    } catch (error) {
      console.error('Error storing security event:', error);
      throw error;
    }
  }

  async getEventById(eventId) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE id = ?`;
      const [rows] = await db.execute(query, [eventId]);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Error getting event by ID:', error);
      throw error;
    }
  }

  async getEventsByType(type, limit = 100) {
    try {
      const query = `
        SELECT * FROM ${this.tableName}
        WHERE type = ?
        ORDER BY created_at DESC
        LIMIT ?
      `;
      const [rows] = await db.execute(query, [type, limit]);
      return rows;
    } catch (error) {
      console.error('Error getting events by type:', error);
      throw error;
    }
  }

  async getRecentEvents(limit = 100) {
    try {
      const query = `
        SELECT * FROM ${this.tableName}
        ORDER BY created_at DESC
        LIMIT ?
      `;
      const [rows] = await db.execute(query, [limit]);
      return rows;
    } catch (error) {
      console.error('Error getting recent events:', error);
      throw error;
    }
  }

  async getEventStatistics() {
    try {
      const query = `
        SELECT 
          type,
          severity,
          category,
          COUNT(*) as count
        FROM ${this.tableName}
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        GROUP BY type, severity, category
        ORDER BY count DESC
      `;
      const [rows] = await db.execute(query);
      return rows;
    } catch (error) {
      console.error('Error getting event statistics:', error);
      throw error;
    }
  }
}

export default SecurityEventService;
