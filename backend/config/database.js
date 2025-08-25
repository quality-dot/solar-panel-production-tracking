// Database Configuration for Solar Panel Production Tracking
// PostgreSQL connection and pool management for manufacturing environment

import { Pool } from 'pg';
import { config } from './environment.js';

// Create database connection pool optimized for manufacturing operations
class DatabaseManager {
  constructor() {
    this.pool = null;
    this.isConnected = false;
  }

  // Initialize database connection pool
  async initialize() {
    try {
      const dbConfig = config.database;
      
      this.pool = new Pool({
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        user: dbConfig.username,
        password: dbConfig.password,
        ssl: dbConfig.ssl ? { rejectUnauthorized: false } : false,
        
        // Connection pool settings for manufacturing environment
        min: dbConfig.pool.min,
        max: dbConfig.pool.max,
        acquireTimeoutMillis: dbConfig.pool.acquire,
        idleTimeoutMillis: dbConfig.pool.idle,
        
        // Manufacturing-specific settings
        connectionTimeoutMillis: 10000, // 10 seconds timeout
        statement_timeout: 30000, // 30 seconds for complex queries
        query_timeout: 30000,
        
        // Keep connections alive for production floor reliability
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
      });

      // Set up pool event handlers for monitoring
      this.setupPoolEventHandlers();

      // Test connection
      const connectionSuccess = await this.testConnection();
      
      if (connectionSuccess) {
        this.isConnected = true;
        console.log('🔗 Database connection pool initialized successfully');
        console.log(`📊 Pool config: min=${dbConfig.pool.min}, max=${dbConfig.pool.max}`);
        return this.pool;
      } else {
        // Database connection failed, but we're continuing in development mode
        console.log('⚠️ Database not available - running in development mode');
        return null;
      }
    } catch (error) {
      console.error('❌ Database initialization failed:', error.message);
      // Don't throw in development mode, allow server to continue
      console.log('🔧 Server will continue without database functionality');
      this.isConnected = false;
      return null;
    }
  }

  // Set up pool monitoring for production reliability
  setupPoolEventHandlers() {
    this.pool.on('connect', (client) => {
      console.log('🔌 New database client connected');
    });

    this.pool.on('acquire', (client) => {
      console.log('📥 Database client acquired from pool');
    });

    this.pool.on('release', (client) => {
      console.log('📤 Database client released back to pool');
    });

    this.pool.on('error', (err, client) => {
      console.error('❌ Database pool error:', err.message);
      // In production, you might want to trigger alerts here
    });

    this.pool.on('remove', (client) => {
      console.log('🗑️ Database client removed from pool');
    });
  }

  // Test database connection
  async testConnection() {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW() as current_time, version() as postgres_version');
      console.log('✅ Database connection test successful');
      console.log(`📅 Database time: ${result.rows[0].current_time}`);
      client.release();
      return true;
    } catch (error) {
      console.error('❌ Database connection test failed:', error.message);
      
      // For development, allow continuing without database
      if (error.message.includes('password authentication failed') || 
          error.message.includes('database') || 
          error.message.includes('connection')) {
        console.log('🔧 Continuing in development mode without database connection.');
        console.log('📝 Create a .env file with proper database credentials to enable database features.');
        
        // Close the failed pool
        if (this.pool) {
          await this.pool.end();
          this.pool = null;
        }
        this.isConnected = false;
        return false;
      }
      
      throw error;
    }
  }

  // Get database health status for monitoring endpoints
  async getHealthStatus() {
    if (!this.pool || !this.isConnected) {
      return {
        status: 'development_mode',
        message: 'Database not connected - running in development mode',
        databaseAvailable: false
      };
    }

    try {
      const start = Date.now();
      const client = await this.pool.connect();
      const result = await client.query('SELECT 1 as health_check');
      const responseTime = Date.now() - start;
      client.release();

      return {
        status: 'healthy',
        responseTime: `${responseTime}ms`,
        totalConnections: this.pool.totalCount,
        idleConnections: this.pool.idleCount,
        waitingConnections: this.pool.waitingCount,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Execute query with error handling and logging
  async query(text, params = []) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      if (config.database.logging) {
        console.log('🔍 Query executed:', { 
          query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
          duration: `${duration}ms`,
          rows: result.rowCount 
        });
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.error('❌ Query failed:', {
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration: `${duration}ms`,
        error: error.message
      });
      throw error;
    }
  }

  // Execute query with a specific client (for transactions)
  async queryWithClient(client, text, params = []) {
    const start = Date.now();
    try {
      const result = await client.query(text, params);
      const duration = Date.now() - start;
      
      if (config.database.logging) {
        console.log('🔍 Transaction query executed:', { 
          query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
          duration: `${duration}ms`,
          rows: result.rowCount 
        });
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.error('❌ Transaction query failed:', {
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration: `${duration}ms`,
        error: error.message
      });
      throw error;
    }
  }

  // Get a client for transactions
  async getClient() {
    return await this.pool.connect();
  }

  // Graceful shutdown
  async close() {
    if (this.pool) {
      console.log('🔌 Closing database connection pool...');
      await this.pool.end();
      this.isConnected = false;
      console.log('✅ Database connection pool closed');
    }
  }

  // Get the pool instance (for direct access if needed)
  getPool() {
    return this.pool;
  }
}

// Create singleton instance
const databaseManager = new DatabaseManager();

export default databaseManager;
export { databaseManager };
