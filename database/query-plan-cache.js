/**
 * Query Plan Caching Implementation
 * Solar Panel Production Tracking System
 * Based on Performance Impact Analysis (Subtask 13.27)
 * Created: August 25, 2025
 */

const crypto = require('crypto');

/**
 * Query Plan Cache Manager
 * Provides application-level query plan caching with LRU eviction
 */
class QueryPlanCache {
  constructor(maxSize = 1000, ttl = 300000) { // 5 minutes default TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      sets: 0
    };
  }

  /**
   * Generate cache key from query and parameters
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {string} Cache key
   */
  generatePlanKey(query, params = []) {
    const queryHash = crypto.createHash('md5').update(query).digest('hex');
    const paramsHash = crypto.createHash('md5').update(JSON.stringify(params)).digest('hex');
    return `plan:${queryHash}:${paramsHash}`;
  }

  /**
   * Get cached query plan
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {Object|null} Cached plan or null
   */
  getCachedPlan(query, params) {
    const key = this.generatePlanKey(query, params);
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      this.stats.hits++;
      return cached.plan;
    }
    
    if (cached) {
      // Expired entry, remove it
      this.cache.delete(key);
    }
    
    this.stats.misses++;
    return null;
  }

  /**
   * Cache query plan
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @param {Object} plan - Query execution plan
   */
  cachePlan(query, params, plan) {
    const key = this.generatePlanKey(query, params);
    
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
    
    this.cache.set(key, {
      plan,
      timestamp: Date.now()
    });
    
    this.stats.sets++;
  }

  /**
   * Clear expired entries
   */
  clearExpired() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp >= this.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? Math.round((this.stats.hits / total) * 100 * 100) / 100 : 0,
      cacheSize: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl
    };
  }

  /**
   * Clear all cached plans
   */
  clear() {
    this.cache.clear();
  }
}

/**
 * Prepared Statement Manager
 * Manages prepared statements with query plan caching
 */
class PreparedStatementManager {
  constructor(db) {
    this.db = db;
    this.statements = new Map();
    this.queryPlanCache = new QueryPlanCache();
    this.stats = {
      preparedStatements: 0,
      executions: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  /**
   * Prepare a statement
   * @param {string} name - Statement name
   * @param {string} query - SQL query
   * @returns {Object} Prepared statement
   */
  async prepare(name, query) {
    if (!this.statements.has(name)) {
      const client = await this.db.pool.connect();
      try {
        // Prepare the statement
        await client.query({
          name,
          text: query
        });
        
        this.statements.set(name, { client, query });
        this.stats.preparedStatements++;
        
        console.log(`Prepared statement: ${name}`);
      } catch (error) {
        client.release();
        throw error;
      }
    }
    return this.statements.get(name);
  }

  /**
   * Execute a prepared statement
   * @param {string} name - Statement name
   * @param {Array} params - Query parameters
   * @returns {Object} Query result
   */
  async execute(name, params = []) {
    const statement = await this.prepare(name, statement.query);
    
    // Check for cached query plan
    const cachedPlan = this.queryPlanCache.getCachedPlan(statement.query, params);
    if (cachedPlan) {
      this.stats.cacheHits++;
      console.log(`Using cached plan for statement: ${name}`);
    } else {
      this.stats.cacheMisses++;
    }
    
    try {
      // Execute the statement
      const result = await statement.client.query({
        name,
        text: statement.query,
        values: params
      });
      
      // Cache the query plan for future use
      if (result.plan && !cachedPlan) {
        this.queryPlanCache.cachePlan(statement.query, params, result.plan);
      }
      
      this.stats.executions++;
      return result;
    } catch (error) {
      console.error(`Error executing prepared statement ${name}:`, error.message);
      throw error;
    }
  }

  /**
   * Get prepared statement statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      ...this.stats,
      queryPlanCache: this.queryPlanCache.getStats()
    };
  }

  /**
   * Close all prepared statements
   */
  async close() {
    for (const [name, statement] of this.statements) {
      statement.client.release();
      console.log(`Released prepared statement: ${name}`);
    }
    this.statements.clear();
  }
}

/**
 * Common Query Templates
 * Predefined queries for common operations
 */
const QUERY_TEMPLATES = {
  // Panel queries
  GET_PANEL_BY_ID: 'SELECT * FROM panels WHERE id = $1',
  GET_PANELS_BY_STATUS: 'SELECT * FROM panels WHERE status = $1 LIMIT $2',
  GET_PANELS_BY_MO: 'SELECT * FROM panels WHERE manufacturing_order_id = $1',
  GET_PANELS_BY_BARCODE: 'SELECT * FROM panels WHERE barcode = $1',
  GET_PANELS_BY_STATION: 'SELECT * FROM panels WHERE current_station_id = $1',
  
  // Inspection queries
  GET_INSPECTIONS_BY_PANEL: 'SELECT * FROM inspections WHERE panel_id = $1 ORDER BY inspection_date DESC',
  GET_INSPECTIONS_BY_STATION: 'SELECT * FROM inspections WHERE station_id = $1 AND inspection_date >= $2',
  GET_INSPECTIONS_BY_RESULT: 'SELECT * FROM inspections WHERE result = $1 AND inspection_date >= $2',
  GET_INSPECTIONS_BY_INSPECTOR: 'SELECT * FROM inspections WHERE inspector_id = $1 ORDER BY inspection_date DESC',
  
  // Manufacturing order queries
  GET_MO_BY_ID: 'SELECT * FROM manufacturing_orders WHERE id = $1',
  GET_ACTIVE_MOS: 'SELECT * FROM manufacturing_orders WHERE status = $1 ORDER BY start_date DESC',
  GET_MOS_BY_PANEL_TYPE: 'SELECT * FROM manufacturing_orders WHERE panel_type = $1 ORDER BY start_date DESC',
  GET_MOS_BY_DATE_RANGE: 'SELECT * FROM manufacturing_orders WHERE start_date >= $1 AND end_date <= $2',
  
  // Station queries
  GET_STATION_BY_ID: 'SELECT * FROM stations WHERE id = $1',
  GET_ALL_STATIONS: 'SELECT * FROM stations ORDER BY name',
  GET_STATIONS_BY_TYPE: 'SELECT * FROM stations WHERE station_type = $1 ORDER BY name',
  
  // User queries
  GET_USER_BY_ID: 'SELECT * FROM users WHERE id = $1',
  GET_USERS_BY_ROLE: 'SELECT * FROM users WHERE role = $1 ORDER BY created_at DESC',
  
  // Pallet queries
  GET_PALLET_BY_ID: 'SELECT * FROM pallets WHERE id = $1',
  GET_PALLETS_BY_STATUS: 'SELECT * FROM pallets WHERE status = $1 ORDER BY created_at DESC',
  GET_PALLET_ASSIGNMENTS: 'SELECT * FROM pallet_assignments WHERE pallet_id = $1 ORDER BY assigned_at DESC',
  
  // Aggregation queries
  GET_PANEL_STATUS_COUNT: 'SELECT status, COUNT(*) as count FROM panels GROUP BY status',
  GET_STATION_PERFORMANCE: `
    SELECT 
      s.name as station_name,
      COUNT(i.id) as inspection_count,
      AVG(CASE WHEN i.result = 'pass' THEN 1 ELSE 0 END) as pass_rate
    FROM stations s
    LEFT JOIN inspections i ON s.id = i.station_id
    WHERE i.inspection_date >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY s.id, s.name
    ORDER BY inspection_count DESC
  `,
  GET_WORKFLOW_STATS: `
    SELECT 
      AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_production_hours,
      COUNT(*) as total_panels,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_panels
    FROM panels
  `,
  GET_INSPECTION_SUMMARY: `
    SELECT 
      result,
      COUNT(*) as count,
      AVG(EXTRACT(EPOCH FROM (inspection_date - created_at))/60) as avg_inspection_time_minutes
    FROM inspections
    WHERE inspection_date >= CURRENT_DATE - INTERVAL '24 hours'
    GROUP BY result
  `
};

/**
 * Initialize prepared statements
 * @param {Object} db - Database connection
 * @returns {PreparedStatementManager} Prepared statement manager
 */
async function initializePreparedStatements(db) {
  const psm = new PreparedStatementManager(db);
  
  console.log('Initializing prepared statements...');
  
  for (const [name, query] of Object.entries(QUERY_TEMPLATES)) {
    try {
      await psm.prepare(name, query);
    } catch (error) {
      console.error(`Failed to prepare statement ${name}:`, error.message);
    }
  }
  
  console.log(`Initialized ${psm.statements.size} prepared statements`);
  return psm;
}

/**
 * Query Plan Cache Middleware
 * Express middleware for automatic query plan caching
 */
function queryPlanCacheMiddleware(psm, ttl = 300000) {
  return async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      if (res.statusCode === 200 && data) {
        try {
          // Cache successful responses
          const cacheKey = `response:${req.method}:${req.originalUrl}`;
          psm.queryPlanCache.cachePlan(cacheKey, [], data, ttl);
        } catch (error) {
          console.error('Cache middleware error:', error.message);
        }
      }
      originalSend.call(this, data);
    };
    
    next();
  };
}

/**
 * Performance monitoring for query plan cache
 */
class QueryPlanPerformanceMonitor {
  constructor(psm) {
    this.psm = psm;
    this.metrics = {
      totalQueries: 0,
      cachedQueries: 0,
      averageQueryTime: 0,
      totalQueryTime: 0
    };
  }

  /**
   * Monitor query execution
   * @param {string} name - Statement name
   * @param {Array} params - Query parameters
   * @param {Function} queryFn - Query function
   * @returns {Object} Query result
   */
  async monitorQuery(name, params, queryFn) {
    const startTime = Date.now();
    
    try {
      const result = await queryFn();
      const queryTime = Date.now() - startTime;
      
      // Update metrics
      this.metrics.totalQueries++;
      this.metrics.totalQueryTime += queryTime;
      this.metrics.averageQueryTime = this.metrics.totalQueryTime / this.metrics.totalQueries;
      
      // Check if query was cached
      const cachedPlan = this.psm.queryPlanCache.getCachedPlan(name, params);
      if (cachedPlan) {
        this.metrics.cachedQueries++;
      }
      
      // Log slow queries
      if (queryTime > 1000) {
        console.warn(`Slow query detected: ${name} took ${queryTime}ms`);
      }
      
      return result;
    } catch (error) {
      console.error(`Query error in ${name}:`, error.message);
      throw error;
    }
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheHitRate: this.metrics.totalQueries > 0 
        ? Math.round((this.metrics.cachedQueries / this.metrics.totalQueries) * 100 * 100) / 100 
        : 0,
      psmStats: this.psm.getStats()
    };
  }

  /**
   * Generate performance report
   * @returns {Object} Performance report
   */
  generateReport() {
    const metrics = this.getMetrics();
    
    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalQueries: metrics.totalQueries,
        averageQueryTime: Math.round(metrics.averageQueryTime * 100) / 100,
        cacheHitRate: metrics.cacheHitRate,
        preparedStatements: metrics.psmStats.preparedStatements
      },
      recommendations: this.generateRecommendations(metrics)
    };
  }

  /**
   * Generate performance recommendations
   * @param {Object} metrics - Performance metrics
   * @returns {Array} Recommendations
   */
  generateRecommendations(metrics) {
    const recommendations = [];
    
    if (metrics.averageQueryTime > 100) {
      recommendations.push('Consider optimizing slow queries');
    }
    
    if (metrics.cacheHitRate < 70) {
      recommendations.push('Query plan cache hit rate is low - consider increasing cache size');
    }
    
    if (metrics.psmStats.preparedStatements < 10) {
      recommendations.push('Consider preparing more frequently used queries');
    }
    
    return recommendations;
  }
}

module.exports = {
  QueryPlanCache,
  PreparedStatementManager,
  QUERY_TEMPLATES,
  initializePreparedStatements,
  queryPlanCacheMiddleware,
  QueryPlanPerformanceMonitor
};
