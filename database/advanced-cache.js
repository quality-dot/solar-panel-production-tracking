/**
 * Advanced Caching Implementation
 * Solar Panel Production Tracking System
 * Based on Performance Impact Analysis (Subtask 13.27) - Low Priority Optimizations
 * Created: August 25, 2025
 */

const Redis = require('ioredis');
const crypto = require('crypto');

// Redis configuration for advanced caching
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
  commandTimeout: 5000,
  // Advanced configuration for better performance
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxLoadingTimeout: 10000,
  // Cluster configuration (if using Redis Cluster)
  enableOfflineQueue: false,
  // Memory optimization
  string_numbers: true,
  // Connection pooling
  family: 4,
  // TLS configuration (if needed)
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined
};

/**
 * Intelligent Cache Manager
 * Provides advanced caching strategies with intelligent invalidation
 */
class IntelligentCacheManager {
  constructor(redisClient = null) {
    this.redis = redisClient || new Redis(redisConfig);
    this.cachePatterns = new Map();
    this.invalidationRules = new Map();
    this.cacheMetrics = new Map();
    this.predictionEngine = new CachePredictionEngine();
    
    // Initialize cache patterns
    this.initializeCachePatterns();
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  /**
   * Initialize predefined cache patterns
   */
  initializeCachePatterns() {
    // Panel-related patterns
    this.cachePatterns.set('panel:*', {
      invalidationTriggers: ['panel:create', 'panel:update', 'panel:delete'],
      ttl: 300, // 5 minutes
      priority: 'high'
    });
    
    // Inspection-related patterns
    this.cachePatterns.set('inspection:*', {
      invalidationTriggers: ['inspection:create', 'inspection:update'],
      ttl: 600, // 10 minutes
      priority: 'medium'
    });
    
    // Manufacturing order patterns
    this.cachePatterns.set('manufacturing_order:*', {
      invalidationTriggers: ['manufacturing_order:create', 'manufacturing_order:update'],
      ttl: 900, // 15 minutes
      priority: 'medium'
    });
    
    // Dashboard patterns
    this.cachePatterns.set('dashboard:*', {
      invalidationTriggers: ['*:create', '*:update', '*:delete'],
      ttl: 180, // 3 minutes
      priority: 'high'
    });
    
    // Report patterns
    this.cachePatterns.set('report:*', {
      invalidationTriggers: ['*:create', '*:update'],
      ttl: 3600, // 1 hour
      priority: 'low'
    });
  }
  
  /**
   * Set up Redis event listeners
   */
  setupEventListeners() {
    this.redis.on('connect', () => {
      console.log('Advanced cache manager connected to Redis');
    });
    
    this.redis.on('error', (error) => {
      console.error('Redis connection error:', error);
    });
    
    this.redis.on('ready', () => {
      console.log('Advanced cache manager ready');
    });
  }
  
  /**
   * Pattern-based cache invalidation
   */
  async invalidatePattern(pattern, reason = 'manual') {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logInvalidation(pattern, keys.length, reason);
        console.log(`Invalidated ${keys.length} keys matching pattern: ${pattern}`);
      }
      return keys.length;
    } catch (error) {
      console.error('Pattern invalidation error:', error);
      throw error;
    }
  }
  
  /**
   * Intelligent cache invalidation based on triggers
   */
  async invalidateByTrigger(trigger) {
    const invalidatedKeys = [];
    
    for (const [pattern, config] of this.cachePatterns) {
      if (config.invalidationTriggers.some(t => 
        trigger.includes(t.replace('*', '')) || t === '*'
      )) {
        const count = await this.invalidatePattern(pattern, `trigger:${trigger}`);
        invalidatedKeys.push({ pattern, count });
      }
    }
    
    return invalidatedKeys;
  }
  
  /**
   * Cache warming for frequently accessed data
   */
  async warmCache() {
    console.log('Starting cache warming...');
    const startTime = Date.now();
    
    const warmingTasks = [
      this.warmPanelStatusSummary(),
      this.warmStationPerformance(),
      this.warmActiveManufacturingOrders(),
      this.warmRecentInspections(),
      this.warmDashboardMetrics(),
      this.warmQualityMetrics()
    ];
    
    try {
      await Promise.all(warmingTasks);
      const duration = Date.now() - startTime;
      console.log(`Cache warming completed in ${duration}ms`);
    } catch (error) {
      console.error('Cache warming error:', error);
      throw error;
    }
  }
  
  /**
   * Warm panel status summary cache
   */
  async warmPanelStatusSummary() {
    const query = `
      SELECT status, COUNT(*) as count 
      FROM panels 
      GROUP BY status
    `;
    const result = await this.executeQuery(query);
    await this.set('panel:status:summary', result, 300); // 5 minutes
  }
  
  /**
   * Warm station performance cache
   */
  async warmStationPerformance() {
    const query = `
      SELECT s.name, COUNT(i.id) as inspection_count,
             AVG(CASE WHEN i.result = 'PASS' THEN 1 ELSE 0 END) as pass_rate
      FROM stations s
      LEFT JOIN inspections i ON s.id = i.station_id
      WHERE i.inspection_date >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY s.id, s.name
    `;
    const result = await this.executeQuery(query);
    await this.set('station:performance:7d', result, 600); // 10 minutes
  }
  
  /**
   * Warm active manufacturing orders cache
   */
  async warmActiveManufacturingOrders() {
    const query = `
      SELECT id, order_number, status, start_date, expected_completion_date
      FROM manufacturing_orders
      WHERE status IN ('IN_PROGRESS', 'PENDING')
      ORDER BY start_date DESC
      LIMIT 50
    `;
    const result = await this.executeQuery(query);
    await this.set('manufacturing_order:active', result, 900); // 15 minutes
  }
  
  /**
   * Warm recent inspections cache
   */
  async warmRecentInspections() {
    const query = `
      SELECT i.id, i.panel_id, i.result, i.inspection_date, s.name as station_name
      FROM inspections i
      JOIN stations s ON i.station_id = s.id
      WHERE i.inspection_date >= CURRENT_DATE - INTERVAL '24 hours'
      ORDER BY i.inspection_date DESC
      LIMIT 100
    `;
    const result = await this.executeQuery(query);
    await this.set('inspection:recent:24h', result, 300); // 5 minutes
  }
  
  /**
   * Warm dashboard metrics cache
   */
  async warmDashboardMetrics() {
    const metrics = {
      total_panels: await this.getCount('SELECT COUNT(*) FROM panels'),
      active_orders: await this.getCount('SELECT COUNT(*) FROM manufacturing_orders WHERE status = \'IN_PROGRESS\''),
      today_inspections: await this.getCount('SELECT COUNT(*) FROM inspections WHERE inspection_date >= CURRENT_DATE'),
      pass_rate: await this.getPassRate()
    };
    
    await this.set('dashboard:metrics', metrics, 180); // 3 minutes
  }
  
  /**
   * Warm quality metrics cache
   */
  async warmQualityMetrics() {
    const query = `
      SELECT 
        DATE_TRUNC('day', inspection_date) as date,
        COUNT(*) as total_inspections,
        COUNT(CASE WHEN result = 'PASS' THEN 1 END) as passed_inspections,
        ROUND(
          (COUNT(CASE WHEN result = 'PASS' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2
        ) as pass_rate
      FROM inspections
      WHERE inspection_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', inspection_date)
      ORDER BY date DESC
    `;
    const result = await this.executeQuery(query);
    await this.set('quality:metrics:30d', result, 1800); // 30 minutes
  }
  
  /**
   * Predictive cache loading based on user behavior
   */
  async predictiveCacheLoad(userId, userRole) {
    const predictions = this.predictionEngine.getPredictions(userId, userRole);
    
    for (const prediction of predictions) {
      try {
        await this.preloadData(prediction.query, prediction.ttl, prediction.priority);
      } catch (error) {
        console.error(`Predictive cache loading error for ${prediction.query}:`, error);
      }
    }
  }
  
  /**
   * Preload data based on prediction
   */
  async preloadData(query, ttl, priority = 'medium') {
    const cacheKey = this.generateCacheKey(query);
    
    // Check if already cached
    const existing = await this.get(cacheKey);
    if (existing) {
      return existing;
    }
    
    // Execute query and cache result
    const result = await this.executeQuery(query);
    await this.set(cacheKey, result, ttl);
    
    return result;
  }
  
  /**
   * Generate cache key from query
   */
  generateCacheKey(query) {
    return crypto.createHash('md5').update(query).digest('hex');
  }
  
  /**
   * Execute database query (placeholder - should be replaced with actual DB connection)
   */
  async executeQuery(query) {
    // This should be replaced with actual database connection
    // For now, return mock data
    return { query, timestamp: new Date().toISOString() };
  }
  
  /**
   * Get count from query
   */
  async getCount(query) {
    const result = await this.executeQuery(query);
    return result.count || 0;
  }
  
  /**
   * Get pass rate
   */
  async getPassRate() {
    const query = `
      SELECT ROUND(
        (COUNT(CASE WHEN result = 'PASS' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2
      ) as pass_rate
      FROM inspections
      WHERE inspection_date >= CURRENT_DATE - INTERVAL '7 days'
    `;
    const result = await this.executeQuery(query);
    return result.pass_rate || 0;
  }
  
  /**
   * Set cache value with TTL
   */
  async set(key, value, ttl = 300) {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
      this.recordCacheSet(key, ttl);
    } catch (error) {
      console.error('Cache set error:', error);
      throw error;
    }
  }
  
  /**
   * Get cache value
   */
  async get(key) {
    try {
      const value = await this.redis.get(key);
      if (value) {
        this.recordCacheHit(key);
        return JSON.parse(value);
      } else {
        this.recordCacheMiss(key);
        return null;
      }
    } catch (error) {
      console.error('Cache get error:', error);
      this.recordCacheError(key);
      return null;
    }
  }
  
  /**
   * Delete cache key
   */
  async delete(key) {
    try {
      await this.redis.del(key);
      this.recordCacheDelete(key);
    } catch (error) {
      console.error('Cache delete error:', error);
      throw error;
    }
  }
  
  /**
   * Log cache invalidation
   */
  logInvalidation(pattern, count, reason) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      pattern,
      count,
      reason,
      type: 'invalidation'
    };
    
    // Store in cache metrics
    if (!this.cacheMetrics.has('invalidations')) {
      this.cacheMetrics.set('invalidations', []);
    }
    this.cacheMetrics.get('invalidations').push(logEntry);
  }
  
  /**
   * Record cache hit
   */
  recordCacheHit(key) {
    this.updateMetrics(key, 'hit');
  }
  
  /**
   * Record cache miss
   */
  recordCacheMiss(key) {
    this.updateMetrics(key, 'miss');
  }
  
  /**
   * Record cache set
   */
  recordCacheSet(key, ttl) {
    this.updateMetrics(key, 'set', ttl);
  }
  
  /**
   * Record cache delete
   */
  recordCacheDelete(key) {
    this.updateMetrics(key, 'delete');
  }
  
  /**
   * Record cache error
   */
  recordCacheError(key) {
    this.updateMetrics(key, 'error');
  }
  
  /**
   * Update cache metrics
   */
  updateMetrics(key, operation, ttl = null) {
    if (!this.cacheMetrics.has(key)) {
      this.cacheMetrics.set(key, {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        errors: 0,
        lastAccess: null,
        ttl: ttl
      });
    }
    
    const metrics = this.cacheMetrics.get(key);
    metrics[operation + 's']++;
    metrics.lastAccess = new Date().toISOString();
  }
  
  /**
   * Get cache performance metrics
   */
  getMetrics() {
    const metrics = {
      timestamp: new Date().toISOString(),
      summary: {
        totalKeys: this.cacheMetrics.size,
        totalHits: 0,
        totalMisses: 0,
        totalSets: 0,
        totalDeletes: 0,
        totalErrors: 0
      },
      keys: Array.from(this.cacheMetrics.entries()).map(([key, data]) => ({
        key,
        ...data,
        hitRate: data.hits + data.misses > 0 ? 
          (data.hits / (data.hits + data.misses) * 100).toFixed(2) : 0
      }))
    };
    
    // Calculate summary
    for (const [key, data] of this.cacheMetrics) {
      metrics.summary.totalHits += data.hits;
      metrics.summary.totalMisses += data.misses;
      metrics.summary.totalSets += data.sets;
      metrics.summary.totalDeletes += data.deletes;
      metrics.summary.totalErrors += data.errors;
    }
    
    return metrics;
  }
  
  /**
   * Generate cache performance report
   */
  async generateReport() {
    const metrics = this.getMetrics();
    const redisInfo = await this.redis.info();
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: metrics.summary,
      topAccessedKeys: metrics.keys
        .sort((a, b) => (b.hits + b.misses) - (a.hits + a.misses))
        .slice(0, 10),
      lowHitRateKeys: metrics.keys
        .filter(k => k.hitRate < 50 && (k.hits + k.misses) > 10)
        .sort((a, b) => a.hitRate - b.hitRate)
        .slice(0, 10),
      recommendations: this.generateRecommendations(metrics),
      redisInfo: redisInfo
    };
    
    return report;
  }
  
  /**
   * Generate cache optimization recommendations
   */
  generateRecommendations(metrics) {
    const recommendations = [];
    
    // Low hit rate recommendations
    const lowHitRateKeys = metrics.keys.filter(k => k.hitRate < 30);
    if (lowHitRateKeys.length > 0) {
      recommendations.push({
        type: 'low_hit_rate',
        description: `${lowHitRateKeys.length} keys have hit rate below 30%`,
        action: 'Consider removing or adjusting TTL for these keys'
      });
    }
    
    // High error rate recommendations
    const highErrorKeys = metrics.keys.filter(k => k.errors > k.hits * 0.1);
    if (highErrorKeys.length > 0) {
      recommendations.push({
        type: 'high_error_rate',
        description: `${highErrorKeys.length} keys have high error rates`,
        action: 'Investigate Redis connection issues or key format problems'
      });
    }
    
    // TTL optimization recommendations
    const shortTtlKeys = metrics.keys.filter(k => k.ttl && k.ttl < 60 && k.hits > 100);
    if (shortTtlKeys.length > 0) {
      recommendations.push({
        type: 'short_ttl',
        description: `${shortTtlKeys.length} frequently accessed keys have TTL < 60s`,
        action: 'Consider increasing TTL for better cache efficiency'
      });
    }
    
    return recommendations;
  }
  
  /**
   * Health check for cache system
   */
  async healthCheck() {
    try {
      const startTime = Date.now();
      await this.redis.ping();
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
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
  }
}

/**
 * Cache Prediction Engine
 * Predicts which data will be accessed based on user behavior
 */
class CachePredictionEngine {
  constructor() {
    this.userPatterns = new Map();
    this.rolePatterns = new Map();
    this.initializePatterns();
  }
  
  /**
   * Initialize prediction patterns
   */
  initializePatterns() {
    // Role-based patterns
    this.rolePatterns.set('operator', [
      { query: 'SELECT * FROM panels WHERE current_station_id = $1', ttl: 300, priority: 'high' },
      { query: 'SELECT * FROM inspections WHERE station_id = $1 ORDER BY inspection_date DESC LIMIT 50', ttl: 600, priority: 'high' }
    ]);
    
    this.rolePatterns.set('supervisor', [
      { query: 'SELECT * FROM manufacturing_orders WHERE status = \'IN_PROGRESS\'', ttl: 900, priority: 'high' },
      { query: 'SELECT status, COUNT(*) FROM panels GROUP BY status', ttl: 300, priority: 'high' },
      { query: 'SELECT * FROM mv_station_performance', ttl: 600, priority: 'medium' }
    ]);
    
    this.rolePatterns.set('manager', [
      { query: 'SELECT * FROM mv_mo_progress WHERE completion_percentage < 50', ttl: 900, priority: 'high' },
      { query: 'SELECT * FROM mv_quality_metrics ORDER BY inspection_date DESC LIMIT 30', ttl: 1800, priority: 'medium' },
      { query: 'SELECT * FROM mv_workflow_efficiency', ttl: 1200, priority: 'medium' }
    ]);
    
    this.rolePatterns.set('admin', [
      { query: 'SELECT * FROM users WHERE active = true', ttl: 3600, priority: 'low' },
      { query: 'SELECT * FROM stations ORDER BY name', ttl: 3600, priority: 'low' },
      { query: 'SELECT * FROM mv_panel_status_summary', ttl: 300, priority: 'medium' }
    ]);
  }
  
  /**
   * Get predictions for user
   */
  getPredictions(userId, userRole) {
    const rolePredictions = this.rolePatterns.get(userRole) || [];
    const userPredictions = this.userPatterns.get(userId) || [];
    
    return [...rolePredictions, ...userPredictions];
  }
  
  /**
   * Learn user pattern
   */
  learnPattern(userId, query, frequency) {
    if (!this.userPatterns.has(userId)) {
      this.userPatterns.set(userId, []);
    }
    
    const patterns = this.userPatterns.get(userId);
    const existingPattern = patterns.find(p => p.query === query);
    
    if (existingPattern) {
      existingPattern.frequency = frequency;
    } else {
      patterns.push({
        query,
        ttl: 300,
        priority: 'medium',
        frequency
      });
    }
  }
}

/**
 * Cache Performance Monitor
 * Monitors and reports on cache performance
 */
class CachePerformanceMonitor {
  constructor(cacheManager) {
    this.cacheManager = cacheManager;
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      hitRate: 0,
      avgResponseTime: 0
    };
    this.responseTimes = [];
  }
  
  /**
   * Record cache hit
   */
  async recordHit(key, responseTime) {
    this.metrics.hits++;
    this.updateHitRate();
    this.updateAvgResponseTime(responseTime);
  }
  
  /**
   * Record cache miss
   */
  async recordMiss(key, responseTime) {
    this.metrics.misses++;
    this.updateHitRate();
    this.updateAvgResponseTime(responseTime);
  }
  
  /**
   * Update hit rate
   */
  updateHitRate() {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0;
  }
  
  /**
   * Update average response time
   */
  updateAvgResponseTime(responseTime) {
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > 1000) {
      this.responseTimes.shift();
    }
    
    this.metrics.avgResponseTime = this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
  }
  
  /**
   * Get metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Generate performance report
   */
  async generateReport() {
    const cacheMetrics = this.cacheManager.getMetrics();
    const healthCheck = await this.cacheManager.healthCheck();
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.metrics,
      cacheDetails: cacheMetrics,
      health: healthCheck,
      recommendations: this.generateRecommendations()
    };
    
    return report;
  }
  
  /**
   * Generate recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (this.metrics.hitRate < 70) {
      recommendations.push({
        type: 'low_hit_rate',
        description: `Cache hit rate is ${this.metrics.hitRate.toFixed(2)}%`,
        action: 'Consider adjusting TTL values or cache warming strategies'
      });
    }
    
    if (this.metrics.avgResponseTime > 10) {
      recommendations.push({
        type: 'slow_response',
        description: `Average response time is ${this.metrics.avgResponseTime.toFixed(2)}ms`,
        action: 'Investigate Redis performance or network latency'
      });
    }
    
    if (this.metrics.errors > this.metrics.hits * 0.05) {
      recommendations.push({
        type: 'high_error_rate',
        description: `Error rate is ${(this.metrics.errors / (this.metrics.hits + this.metrics.misses) * 100).toFixed(2)}%`,
        action: 'Check Redis connection and configuration'
      });
    }
    
    return recommendations;
  }
}

// Export classes
module.exports = {
  IntelligentCacheManager,
  CachePredictionEngine,
  CachePerformanceMonitor
};
