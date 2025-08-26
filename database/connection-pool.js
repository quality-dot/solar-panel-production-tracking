/**
 * Database Connection Pool Implementation
 * Solar Panel Production Tracking System
 * Based on Performance Impact Analysis (Subtask 13.27)
 * Created: August 25, 2025
 */

const { Pool } = require('pg');
const config = require('./config.cjs');

// Enhanced connection pool configuration
const poolConfig = {
  development: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'solar_panel_tracking_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    dialect: 'postgres',
    logging: console.log,
    pool: {
      max: 20,           // Maximum connections
      min: 5,            // Minimum connections
      acquire: 60000,    // Connection acquisition timeout
      idle: 300000,      // Connection idle timeout (5 minutes)
      evict: 60000,      // Connection eviction interval (1 minute)
      handleDisconnects: true
    },
    dialectOptions: {
      statement_timeout: 30000,  // 30 second query timeout
      idle_in_transaction_session_timeout: 300000  // 5 minute idle timeout
    }
  },
  
  production: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 50,           // Higher for production
      min: 10,           // Higher minimum
      acquire: 60000,
      idle: 300000,
      evict: 60000,
      handleDisconnects: true
    },
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false,
      statement_timeout: 30000,
      idle_in_transaction_session_timeout: 300000
    }
  },

  test: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'solar_panel_tracking_test',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 10,           // Lower for testing
      min: 2,            // Lower minimum
      acquire: 30000,
      idle: 60000,
      evict: 30000,
      handleDisconnects: true
    },
    dialectOptions: {
      statement_timeout: 15000,  // Shorter timeout for tests
      idle_in_transaction_session_timeout: 60000
    }
  }
};

/**
 * Database Connection Pool Manager
 * Provides optimized connection pooling with monitoring and error handling
 */
class DatabaseConnection {
  constructor() {
    const environment = process.env.NODE_ENV || 'development';
    this.config = poolConfig[environment];
    this.pool = new Pool(this.config);
    this.setupEventHandlers();
    this.metrics = {
      totalQueries: 0,
      successfulQueries: 0,
      failedQueries: 0,
      averageQueryTime: 0,
      totalQueryTime: 0
    };
  }

  /**
   * Setup event handlers for connection pool monitoring
   */
  setupEventHandlers() {
    // Handle pool errors
    this.pool.on('error', (err, client) => {
      console.error('Unexpected error on idle client', err);
      this.metrics.failedQueries++;
    });

    // Monitor pool events
    this.pool.on('connect', (client) => {
      console.log('New client connected to pool');
    });

    this.pool.on('acquire', (client) => {
      console.log('Client acquired from pool');
    });

    this.pool.on('release', (client) => {
      console.log('Client released to pool');
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('Shutting down database pool...');
      this.pool.end();
      process.exit(0);
    });
  }

  /**
   * Execute a query with connection pooling
   * @param {string} text - SQL query text
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} Query result
   */
  async query(text, params = []) {
    const startTime = Date.now();
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(text, params);
      const queryTime = Date.now() - startTime;
      
      // Update metrics
      this.metrics.totalQueries++;
      this.metrics.successfulQueries++;
      this.metrics.totalQueryTime += queryTime;
      this.metrics.averageQueryTime = this.metrics.totalQueryTime / this.metrics.totalQueries;
      
      // Log slow queries
      if (queryTime > 1000) {
        console.warn(`Slow query detected: ${queryTime}ms - ${text.substring(0, 100)}...`);
      }
      
      return result;
    } catch (error) {
      this.metrics.failedQueries++;
      console.error('Query error:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute a transaction with automatic rollback on error
   * @param {Function} callback - Transaction callback function
   * @returns {Promise<Object>} Transaction result
   */
  async transaction(callback) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Transaction error:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get current pool statistics
   * @returns {Object} Pool statistics
   */
  async getPoolStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      metrics: this.metrics
    };
  }

  /**
   * Health check for the database connection
   * @returns {Promise<Object>} Health check result
   */
  async healthCheck() {
    try {
      const startTime = Date.now();
      const result = await this.query('SELECT 1 as health_check');
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        pool: await this.getPoolStats(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        pool: await this.getPoolStats(),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Load test the connection pool
   * @param {number} concurrentQueries - Number of concurrent queries
   * @returns {Promise<Object>} Load test results
   */
  async loadTest(concurrentQueries = 100) {
    console.log(`Starting load test with ${concurrentQueries} concurrent queries...`);
    
    const startTime = Date.now();
    const promises = Array(concurrentQueries).fill().map(() => 
      this.query('SELECT 1 as test_query')
    );
    
    try {
      await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      return {
        success: true,
        concurrentQueries,
        totalTime,
        averageTime: totalTime / concurrentQueries,
        pool: await this.getPoolStats()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        concurrentQueries,
        pool: await this.getPoolStats()
      };
    }
  }

  /**
   * Close the connection pool
   */
  async close() {
    await this.pool.end();
    console.log('Database connection pool closed');
  }
}

// Create and export singleton instance
const db = new DatabaseConnection();

module.exports = db;
