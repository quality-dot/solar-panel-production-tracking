/**
 * Query Result Caching Implementation
 * Solar Panel Production Tracking System
 * Based on Performance Impact Analysis (Subtask 13.27)
 * Created: August 25, 2025
 */

const Redis = require('ioredis');

// Redis configuration for caching
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  db: 0,
  keyPrefix: 'solar_panel:',
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000
};

// Cache keys structure
const CACHE_KEYS = {
  PANEL_STATUS: 'panels:status',
  STATION_PERFORMANCE: 'stations:performance',
  WORKFLOW_STATS: 'workflow:stats',
  INSPECTION_SUMMARY: 'inspections:summary',
  MANUFACTURING_ORDERS: 'manufacturing_orders:active',
  DASHBOARD_DATA: 'dashboard:data',
  REPORTS: 'reports:data'
};

// Cache TTL (Time To Live) configuration
const CACHE_TTL = {
  PANEL_STATUS: 300,        // 5 minutes
  STATION_PERFORMANCE: 600, // 10 minutes
  WORKFLOW_STATS: 900,      // 15 minutes
  INSPECTION_SUMMARY: 300,  // 5 minutes
  MANUFACTURING_ORDERS: 600, // 10 minutes
  DASHBOARD_DATA: 300,      // 5 minutes
  REPORTS: 1800            // 30 minutes
};

/**
 * Redis Cache Manager
 * Provides query result caching with automatic invalidation
 */
class CacheManager {
  constructor() {
    this.redis = new Redis(redisConfig);
    this.setupEventHandlers();
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
  }

  /**
   * Setup Redis event handlers
   */
  setupEventHandlers() {
    this.redis.on('connect', () => {
      console.log('Redis cache connected');
    });

    this.redis.on('error', (error) => {
      console.error('Redis cache error:', error.message);
      this.metrics.errors++;
    });

    this.redis.on('ready', () => {
      console.log('Redis cache ready');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down Redis cache...');
      await this.redis.quit();
      process.exit(0);
    });
  }

  /**
   * Generate cache key from query and parameters
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {string} Cache key
   */
  generateCacheKey(query, params = []) {
    const queryHash = require('crypto').createHash('md5').update(query).digest('hex');
    const paramsHash = require('crypto').createHash('md5').update(JSON.stringify(params)).digest('hex');
    return `query:${queryHash}:${paramsHash}`;
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<Object|null>} Cached value or null
   */
  async get(key) {
    try {
      const value = await this.redis.get(key);
      if (value) {
        this.metrics.hits++;
        return JSON.parse(value);
      } else {
        this.metrics.misses++;
        return null;
      }
    } catch (error) {
      console.error('Cache get error:', error.message);
      this.metrics.errors++;
      return null;
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {Object} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, ttl = 300) {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
      this.metrics.sets++;
      return true;
    } catch (error) {
      console.error('Cache set error:', error.message);
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Delete cache key
   * @param {string} key - Cache key to delete
   * @returns {Promise<boolean>} Success status
   */
  async delete(key) {
    try {
      await this.redis.del(key);
      this.metrics.deletes++;
      return true;
    } catch (error) {
      console.error('Cache delete error:', error.message);
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Invalidate cache by pattern
   * @param {string} pattern - Redis pattern for keys to delete
   * @returns {Promise<number>} Number of keys deleted
   */
  async invalidatePattern(pattern) {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(keys);
        this.metrics.deletes += keys.length;
        console.log(`Invalidated ${keys.length} cache keys matching pattern: ${pattern}`);
      }
      return keys.length;
    } catch (error) {
      console.error('Cache invalidation error:', error.message);
      this.metrics.errors++;
      return 0;
    }
  }

  /**
   * Cache middleware for Express routes
   * @param {number} ttl - Time to live in seconds
   * @returns {Function} Express middleware
   */
  cacheMiddleware(ttl = 300) {
    return async (req, res, next) => {
      const cacheKey = `route:${req.method}:${req.originalUrl}`;
      
      try {
        // Try to get from cache
        const cached = await this.get(cacheKey);
        if (cached) {
          return res.json(cached);
        }
        
        // If not in cache, execute route and cache result
        const originalSend = res.send;
        res.send = function(data) {
          if (res.statusCode === 200) {
            this.set(cacheKey, data, ttl);
          }
          originalSend.call(this, data);
        }.bind(this);
        
        next();
      } catch (error) {
        console.error('Cache middleware error:', error.message);
        next(error);
      }
    };
  }

  /**
   * Cache database query results
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @param {number} ttl - Time to live in seconds
   * @param {Function} queryFunction - Function to execute if not cached
   * @returns {Promise<Object>} Query result
   */
  async cachedQuery(query, params, ttl, queryFunction) {
    const cacheKey = this.generateCacheKey(query, params);
    
    try {
      // Try to get from cache
      const cached = await this.get(cacheKey);
      if (cached) {
        return cached;
      }
      
      // Execute query and cache result
      const result = await queryFunction();
      await this.set(cacheKey, result, ttl);
      
      return result;
    } catch (error) {
      console.error('Cached query error:', error.message);
      // Fallback to direct query execution
      return await queryFunction();
    }
  }

  /**
   * Predefined cached queries for common operations
   */
  async getPanelStatusSummary(db) {
    const query = 'SELECT status, COUNT(*) as count FROM panels GROUP BY status';
    const ttl = CACHE_TTL.PANEL_STATUS;
    
    return this.cachedQuery(query, [], ttl, async () => {
      const result = await db.query(query);
      return result.rows;
    });
  }

  async getStationPerformance(db) {
    const query = `
      SELECT 
        s.name as station_name,
        COUNT(i.id) as inspection_count,
        AVG(CASE WHEN i.result = 'pass' THEN 1 ELSE 0 END) as pass_rate
      FROM stations s
      LEFT JOIN inspections i ON s.id = i.station_id
      WHERE i.inspection_date >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY s.id, s.name
      ORDER BY inspection_count DESC
    `;
    const ttl = CACHE_TTL.STATION_PERFORMANCE;
    
    return this.cachedQuery(query, [], ttl, async () => {
      const result = await db.query(query);
      return result.rows;
    });
  }

  async getWorkflowStats(db) {
    const query = `
      SELECT 
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_production_hours,
        COUNT(*) as total_panels,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_panels
      FROM panels
    `;
    const ttl = CACHE_TTL.WORKFLOW_STATS;
    
    return this.cachedQuery(query, [], ttl, async () => {
      const result = await db.query(query);
      return result.rows[0];
    });
  }

  async getInspectionSummary(db) {
    const query = `
      SELECT 
        result,
        COUNT(*) as count,
        AVG(EXTRACT(EPOCH FROM (inspection_date - created_at))/60) as avg_inspection_time_minutes
      FROM inspections
      WHERE inspection_date >= CURRENT_DATE - INTERVAL '24 hours'
      GROUP BY result
    `;
    const ttl = CACHE_TTL.INSPECTION_SUMMARY;
    
    return this.cachedQuery(query, [], ttl, async () => {
      const result = await db.query(query);
      return result.rows;
    });
  }

  /**
   * Invalidate cache when data changes
   */
  async invalidatePanelCache() {
    await this.invalidatePattern('solar_panel:panels:*');
    await this.invalidatePattern('solar_panel:query:*');
  }

  async invalidateInspectionCache() {
    await this.invalidatePattern('solar_panel:inspections:*');
    await this.invalidatePattern('solar_panel:stations:*');
  }

  async invalidateManufacturingOrderCache() {
    await this.invalidatePattern('solar_panel:manufacturing_orders:*');
  }

  async invalidateAllCache() {
    await this.invalidatePattern('solar_panel:*');
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  async getStats() {
    try {
      const info = await this.redis.info('stats');
      const hitRate = this.metrics.hits + this.metrics.misses > 0 
        ? (this.metrics.hits / (this.metrics.hits + this.metrics.misses)) * 100 
        : 0;
      
      return {
        metrics: this.metrics,
        hitRate: Math.round(hitRate * 100) / 100,
        redisInfo: info,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Cache stats error:', error.message);
      return {
        metrics: this.metrics,
        hitRate: 0,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Health check for cache
   * @returns {Promise<Object>} Health check result
   */
  async healthCheck() {
    try {
      const startTime = Date.now();
      await this.redis.ping();
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        stats: await this.getStats(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    await this.redis.quit();
    console.log('Redis cache connection closed');
  }
}

// Create and export singleton instance
const cache = new CacheManager();

module.exports = {
  cache,
  CACHE_KEYS,
  CACHE_TTL
};
