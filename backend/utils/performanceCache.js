// Performance Cache System
// In-memory caching layer for barcode processing and validation rules

import { ManufacturingLogger } from '../middleware/logger.js';

const logger = new ManufacturingLogger('PerformanceCache');

/**
 * High-performance LRU Cache implementation for manufacturing operations
 */
class LRUCache {
  constructor(maxSize = 1000, ttl = 300000) { // 5 minutes default TTL
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.cache = new Map();
    this.accessOrder = new Map();
    this.timeouts = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      timeouts: 0
    };
  }

  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiry) {
      this.delete(key);
      this.stats.timeouts++;
      return null;
    }

    // Update access order
    this.accessOrder.delete(key);
    this.accessOrder.set(key, Date.now());
    this.stats.hits++;
    
    return entry.value;
  }

  set(key, value) {
    // Remove existing entry if present
    if (this.cache.has(key)) {
      this.delete(key);
    }

    // Evict least recently used if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const expiry = Date.now() + this.ttl;
    this.cache.set(key, { value, expiry });
    this.accessOrder.set(key, Date.now());

    // Set timeout for automatic cleanup
    const timeout = setTimeout(() => {
      this.delete(key);
      this.stats.timeouts++;
    }, this.ttl);
    
    this.timeouts.set(key, timeout);
  }

  delete(key) {
    this.cache.delete(key);
    this.accessOrder.delete(key);
    
    const timeout = this.timeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(key);
    }
  }

  evictLRU() {
    if (this.accessOrder.size === 0) return;
    
    const oldestKey = this.accessOrder.keys().next().value;
    this.delete(oldestKey);
    this.stats.evictions++;
  }

  clear() {
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.cache.clear();
    this.accessOrder.clear();
    this.timeouts.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0, timeouts: 0 };
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: total > 0 ? (this.stats.hits / total * 100).toFixed(2) + '%' : '0%',
      utilization: (this.cache.size / this.maxSize * 100).toFixed(2) + '%'
    };
  }
}

/**
 * Performance Cache Manager for Manufacturing Operations
 */
export class PerformanceCache {
  constructor() {
    // Different cache strategies for different data types
    this.caches = {
      // Barcode validation results - high frequency, small data
      barcodeValidation: new LRUCache(2000, 300000), // 5 minutes
      
      // Panel specifications - medium frequency, medium data
      panelSpecs: new LRUCache(1000, 600000), // 10 minutes
      
      // Line assignments - low frequency, small data, longer TTL
      lineAssignments: new LRUCache(500, 1800000), // 30 minutes
      
      // Database query results - high frequency, variable data
      dbQueries: new LRUCache(1500, 180000), // 3 minutes
      
      // MO validation results - medium frequency, small data
      moValidation: new LRUCache(800, 900000), // 15 minutes
      
      // User sessions and auth - low frequency, longer TTL
      userSessions: new LRUCache(200, 3600000), // 1 hour
    };

    // Global cache statistics
    this.globalStats = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      startTime: Date.now()
    };

    // Performance monitoring
    this.performanceThresholds = {
      maxResponseTime: 2000, // 2 seconds max
      warningResponseTime: 1000, // 1 second warning
      criticalHitRate: 70, // Below 70% hit rate is concerning
    };

    // Preload critical data
    this.preloadCriticalData();
  }

  /**
   * Get cached barcode validation result
   */
  getBarcodeValidation(barcode) {
    this.globalStats.totalRequests++;
    const result = this.caches.barcodeValidation.get(barcode);
    
    if (result) {
      this.globalStats.cacheHits++;
      logger.debug('Cache hit for barcode validation', { barcode });
    } else {
      this.globalStats.cacheMisses++;
      logger.debug('Cache miss for barcode validation', { barcode });
    }
    
    return result;
  }

  /**
   * Cache barcode validation result
   */
  setBarcodeValidation(barcode, validationResult) {
    this.caches.barcodeValidation.set(barcode, validationResult);
    logger.debug('Cached barcode validation', { barcode });
  }

  /**
   * Get cached panel specifications
   */
  getPanelSpecs(panelType, constructionType) {
    const key = `${panelType}_${constructionType}`;
    this.globalStats.totalRequests++;
    
    const result = this.caches.panelSpecs.get(key);
    
    if (result) {
      this.globalStats.cacheHits++;
      logger.debug('Cache hit for panel specs', { panelType, constructionType });
    } else {
      this.globalStats.cacheMisses++;
      logger.debug('Cache miss for panel specs', { panelType, constructionType });
    }
    
    return result;
  }

  /**
   * Cache panel specifications
   */
  setPanelSpecs(panelType, constructionType, specs) {
    const key = `${panelType}_${constructionType}`;
    this.caches.panelSpecs.set(key, specs);
    logger.debug('Cached panel specs', { panelType, constructionType });
  }

  /**
   * Get cached line assignment
   */
  getLineAssignment(panelType) {
    this.globalStats.totalRequests++;
    const result = this.caches.lineAssignments.get(panelType);
    
    if (result) {
      this.globalStats.cacheHits++;
      logger.debug('Cache hit for line assignment', { panelType });
    } else {
      this.globalStats.cacheMisses++;
      logger.debug('Cache miss for line assignment', { panelType });
    }
    
    return result;
  }

  /**
   * Cache line assignment
   */
  setLineAssignment(panelType, assignment) {
    this.caches.lineAssignments.set(panelType, assignment);
    logger.debug('Cached line assignment', { panelType });
  }

  /**
   * Generic database query caching
   */
  getDbQuery(queryHash) {
    this.globalStats.totalRequests++;
    const result = this.caches.dbQueries.get(queryHash);
    
    if (result) {
      this.globalStats.cacheHits++;
      logger.debug('Cache hit for DB query', { queryHash: queryHash.substring(0, 20) });
    } else {
      this.globalStats.cacheMisses++;
      logger.debug('Cache miss for DB query', { queryHash: queryHash.substring(0, 20) });
    }
    
    return result;
  }

  /**
   * Cache database query result
   */
  setDbQuery(queryHash, result) {
    this.caches.dbQueries.set(queryHash, result);
    logger.debug('Cached DB query', { queryHash: queryHash.substring(0, 20) });
  }

  /**
   * Get cached MO validation result
   */
  getMOValidation(moId, barcode) {
    const key = `${moId}_${barcode}`;
    this.globalStats.totalRequests++;
    
    const result = this.caches.moValidation.get(key);
    
    if (result) {
      this.globalStats.cacheHits++;
      logger.debug('Cache hit for MO validation', { moId, barcode });
    } else {
      this.globalStats.cacheMisses++;
      logger.debug('Cache miss for MO validation', { moId, barcode });
    }
    
    return result;
  }

  /**
   * Cache MO validation result
   */
  setMOValidation(moId, barcode, validationResult) {
    const key = `${moId}_${barcode}`;
    this.caches.moValidation.set(key, validationResult);
    logger.debug('Cached MO validation', { moId, barcode });
  }

  /**
   * Preload critical data for better cache hit rates
   */
  async preloadCriticalData() {
    try {
      // Preload line assignments for all panel types
      const panelTypes = ['36', '40', '60', '72', '144'];
      for (const panelType of panelTypes) {
        const assignment = this.calculateLineAssignment(panelType);
        this.setLineAssignment(panelType, assignment);
      }

      // Preload common panel specifications
      const constructionTypes = ['monofacial', 'bifacial'];
      for (const panelType of panelTypes) {
        for (const construction of constructionTypes) {
          const specs = this.generatePanelSpecs(panelType, construction);
          this.setPanelSpecs(panelType, construction, specs);
        }
      }

      logger.info('Critical data preloaded into cache', {
        lineAssignments: panelTypes.length,
        panelSpecs: panelTypes.length * constructionTypes.length
      });

    } catch (error) {
      logger.error('Failed to preload critical data', { error: error.message });
    }
  }

  /**
   * Calculate line assignment (cached version)
   */
  calculateLineAssignment(panelType) {
    // Line 1: 36, 40, 60, 72 cell panels
    // Line 2: 144 cell panels
    const lineNumber = panelType === '144' ? 2 : 1;
    
    return {
      lineName: `LINE_${lineNumber}`,
      lineNumber,
      panelTypes: lineNumber === 1 ? ['36', '40', '60', '72'] : ['144'],
      calculatedAt: new Date().toISOString()
    };
  }

  /**
   * Generate panel specifications (cached version)
   */
  generatePanelSpecs(panelType, constructionType) {
    const wattageMap = {
      '36': { min: 180, max: 220, typical: 200 },
      '40': { min: 200, max: 240, typical: 220 },
      '60': { min: 280, max: 320, typical: 300 },
      '72': { min: 350, max: 400, typical: 375 },
      '144': { min: 500, max: 600, typical: 550 }
    };

    const wattage = wattageMap[panelType] || wattageMap['72'];

    return {
      panelType,
      constructionType,
      nominalWattage: wattage.typical,
      wattageRange: wattage,
      frameColor: 'silver', // Default
      qualityGrade: 'A', // Default
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Create query hash for database caching
   */
  createQueryHash(query, params = []) {
    const combined = query + JSON.stringify(params);
    return Buffer.from(combined).toString('base64').substring(0, 32);
  }

  /**
   * Get comprehensive cache statistics
   */
  getStats() {
    const cacheStats = {};
    for (const [name, cache] of Object.entries(this.caches)) {
      cacheStats[name] = cache.getStats();
    }

    const totalRequests = this.globalStats.totalRequests;
    const globalHitRate = totalRequests > 0 ? 
      (this.globalStats.cacheHits / totalRequests * 100).toFixed(2) + '%' : '0%';

    const uptime = Date.now() - this.globalStats.startTime;

    return {
      global: {
        ...this.globalStats,
        hitRate: globalHitRate,
        uptime: `${Math.floor(uptime / 1000)}s`,
        performance: this.getPerformanceStatus()
      },
      caches: cacheStats,
      thresholds: this.performanceThresholds
    };
  }

  /**
   * Get performance status based on cache hit rates
   */
  getPerformanceStatus() {
    const totalRequests = this.globalStats.totalRequests;
    if (totalRequests === 0) return 'INITIALIZING';

    const hitRate = (this.globalStats.cacheHits / totalRequests) * 100;
    
    if (hitRate >= this.performanceThresholds.criticalHitRate) {
      return 'OPTIMAL';
    } else if (hitRate >= 50) {
      return 'ACCEPTABLE';
    } else {
      return 'POOR';
    }
  }

  /**
   * Clear all caches
   */
  clearAll() {
    for (const cache of Object.values(this.caches)) {
      cache.clear();
    }
    
    this.globalStats = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      startTime: Date.now()
    };

    logger.info('All caches cleared');
  }

  /**
   * Clear specific cache
   */
  clearCache(cacheName) {
    if (this.caches[cacheName]) {
      this.caches[cacheName].clear();
      logger.info(`Cache cleared: ${cacheName}`);
    }
  }

  /**
   * Warm up cache with common operations
   */
  async warmUp() {
    logger.info('Starting cache warm-up');
    
    try {
      // Simulate common barcode validations
      const commonBarcodes = [
        'CRS24WT3600001', 'CRS24WT4000001', 'CRS24WT6000001',
        'CRS24WT7200001', 'CRS24T144400001'
      ];

      for (const barcode of commonBarcodes) {
        // This would normally call the actual validation function
        const mockValidation = {
          isValid: true,
          panelType: barcode.substring(7, 9) === '14' ? '144' : barcode.substring(7, 9),
          constructionType: barcode.substring(5, 6) === 'T' ? 'bifacial' : 'monofacial'
        };
        this.setBarcodeValidation(barcode, mockValidation);
      }

      logger.info('Cache warm-up completed', {
        preloadedBarcodes: commonBarcodes.length
      });

    } catch (error) {
      logger.error('Cache warm-up failed', { error: error.message });
    }
  }

  /**
   * Monitor cache performance and log warnings
   */
  monitorPerformance() {
    const stats = this.getStats();
    const hitRate = parseFloat(stats.global.hitRate);

    if (hitRate < this.performanceThresholds.criticalHitRate) {
      logger.warn('Cache hit rate below threshold', {
        currentHitRate: stats.global.hitRate,
        threshold: this.performanceThresholds.criticalHitRate + '%',
        recommendation: 'Consider preloading more data or increasing cache sizes'
      });
    }

    // Check individual cache utilization
    for (const [name, cacheStats] of Object.entries(stats.caches)) {
      const utilization = parseFloat(cacheStats.utilization);
      if (utilization > 90) {
        logger.warn(`Cache ${name} near capacity`, {
          utilization: cacheStats.utilization,
          size: cacheStats.size,
          maxSize: cacheStats.maxSize,
          recommendation: 'Consider increasing cache size'
        });
      }
    }
  }
}

// Export singleton instance
export const performanceCache = new PerformanceCache();

// Utility functions
export function createCacheKey(...parts) {
  return parts.filter(part => part !== null && part !== undefined).join('_');
}

export function hashQuery(query, params = []) {
  return performanceCache.createQueryHash(query, params);
}

export default {
  PerformanceCache,
  performanceCache,
  createCacheKey,
  hashQuery
};
