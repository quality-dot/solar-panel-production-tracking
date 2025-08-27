// Metrics Collection Service
// Real-time monitoring and analytics for barcode processing and manufacturing operations

import { ManufacturingLogger } from '../middleware/logger.js';
import { databaseManager } from '../config/database.js';
// Note: Using simple Map for event storage since performanceCache is specialized for other data types
// In production, this would be replaced with Redis or another persistent store

const logger = new ManufacturingLogger('MetricsService');

/**
 * Custom error class for metrics operations
 */
export class MetricsServiceError extends Error {
  constructor(message, code, details = null) {
    super(message);
    this.name = 'MetricsServiceError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Metrics Collection and Analytics Service
 * Handles real-time monitoring of barcode processing and manufacturing operations
 */
export class MetricsService {
  constructor() {
    this.db = databaseManager;
    this.realTimeMetrics = new Map();
    this.errorPatterns = new Map();
    this.performanceStats = new Map();
    this.eventStore = new Map(); // Simple in-memory event storage
    
    // Initialize metrics collection
    this.initializeMetrics();
  }

  /**
   * Initialize metrics collection system
   */
  initializeMetrics() {
    // Reset metrics on service restart
    this.realTimeMetrics.set('session_start', new Date().toISOString());
    this.realTimeMetrics.set('total_scans', 0);
    this.realTimeMetrics.set('successful_scans', 0);
    this.realTimeMetrics.set('failed_scans', 0);
    this.realTimeMetrics.set('mo_validations', 0);
    this.realTimeMetrics.set('panels_created', 0);

    logger.info('Metrics service initialized', {
      sessionStart: this.realTimeMetrics.get('session_start')
    });
  }

  /**
   * Record barcode scan event
   */
  recordBarcodeEvent(eventData) {
    const {
      barcode,
      success,
      errorCode,
      errorMessage,
      processingTime,
      lineAssignment,
      moId,
      stationId,
      userId
    } = eventData;

    try {
      // Update real-time counters
      this.incrementMetric('total_scans');
      
      if (success) {
        this.incrementMetric('successful_scans');
      } else {
        this.incrementMetric('failed_scans');
        this.recordErrorPattern(errorCode, errorMessage, barcode);
      }

      // Record detailed event
      const event = {
        timestamp: new Date().toISOString(),
        barcode: barcode?.substring(0, 10) + '...', // Truncate for privacy
        success,
        errorCode,
        errorMessage,
        processingTime,
        lineAssignment,
        moId,
        stationId,
        userId
      };

      // Store in event store for quick access
      const eventKey = `barcode_event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.eventStore.set(eventKey, { ...event, type: 'barcode', ttl: Date.now() + 3600000 }); // Keep for 1 hour

      // Log for debugging
      logger.debug('Barcode event recorded', {
        success,
        processingTime,
        lineAssignment: lineAssignment?.lineName,
        errorCode
      });

      return event;

    } catch (error) {
      logger.error('Failed to record barcode event', {
        error: error.message,
        barcode: barcode?.substring(0, 10) + '...'
      });
      throw new MetricsServiceError(
        'Failed to record barcode event',
        'RECORDING_FAILED',
        { originalError: error.message }
      );
    }
  }

  /**
   * Record MO-related event
   */
  recordMOEvent(eventData) {
    const {
      moId,
      orderNumber,
      eventType, // 'created', 'progress_updated', 'completed', 'barcode_validated'
      details,
      userId
    } = eventData;

    try {
      this.incrementMetric('mo_validations');

      const event = {
        timestamp: new Date().toISOString(),
        moId,
        orderNumber,
        eventType,
        details,
        userId
      };

      // Store in event store
      const eventKey = `mo_event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.eventStore.set(eventKey, { ...event, type: 'mo', ttl: Date.now() + 3600000 });

      logger.debug('MO event recorded', {
        moId,
        orderNumber,
        eventType
      });

      return event;

    } catch (error) {
      logger.error('Failed to record MO event', {
        error: error.message,
        moId,
        eventType
      });
      throw new MetricsServiceError(
        'Failed to record MO event',
        'MO_RECORDING_FAILED',
        { originalError: error.message }
      );
    }
  }

  /**
   * Record panel creation event
   */
  recordPanelEvent(eventData) {
    const {
      panelId,
      barcode,
      moId,
      lineAssignment,
      hasOverrides,
      processingTime,
      userId
    } = eventData;

    try {
      this.incrementMetric('panels_created');

      const event = {
        timestamp: new Date().toISOString(),
        panelId,
        barcode: barcode?.substring(0, 10) + '...',
        moId,
        lineAssignment: lineAssignment?.lineName,
        hasOverrides,
        processingTime,
        userId
      };

      // Store in event store
      const eventKey = `panel_event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.eventStore.set(eventKey, { ...event, type: 'panel', ttl: Date.now() + 3600000 });

      logger.debug('Panel event recorded', {
        panelId,
        lineAssignment: lineAssignment?.lineName,
        hasOverrides
      });

      return event;

    } catch (error) {
      logger.error('Failed to record panel event', {
        error: error.message,
        panelId
      });
      throw new MetricsServiceError(
        'Failed to record panel event',
        'PANEL_RECORDING_FAILED',
        { originalError: error.message }
      );
    }
  }

  /**
   * Record error pattern for analysis
   */
  recordErrorPattern(errorCode, errorMessage, context = null) {
    try {
      const patternKey = errorCode || 'UNKNOWN_ERROR';
      
      if (!this.errorPatterns.has(patternKey)) {
        this.errorPatterns.set(patternKey, {
          code: errorCode,
          count: 0,
          samples: [],
          firstSeen: new Date().toISOString(),
          lastSeen: null
        });
      }

      const pattern = this.errorPatterns.get(patternKey);
      pattern.count++;
      pattern.lastSeen = new Date().toISOString();

      // Keep last 5 samples for analysis
      if (pattern.samples.length >= 5) {
        pattern.samples.shift();
      }
      
      pattern.samples.push({
        message: errorMessage,
        context: context?.substring(0, 20) + '...' || null,
        timestamp: new Date().toISOString()
      });

      this.errorPatterns.set(patternKey, pattern);

    } catch (error) {
      logger.error('Failed to record error pattern', {
        error: error.message,
        errorCode
      });
    }
  }

  /**
   * Get real-time metrics summary
   */
  getRealTimeMetrics() {
    try {
      const sessionStart = new Date(this.realTimeMetrics.get('session_start'));
      const now = new Date();
      const uptimeMs = now - sessionStart;

      const totalScans = this.realTimeMetrics.get('total_scans');
      const successfulScans = this.realTimeMetrics.get('successful_scans');
      const failedScans = this.realTimeMetrics.get('failed_scans');

      return {
        session: {
          startTime: sessionStart.toISOString(),
          uptime: {
            milliseconds: uptimeMs,
            formatted: this.formatUptime(uptimeMs)
          }
        },
        barcode: {
          totalScans,
          successfulScans,
          failedScans,
          successRate: totalScans > 0 ? ((successfulScans / totalScans) * 100).toFixed(2) + '%' : '0%',
          scansPerMinute: totalScans > 0 ? ((totalScans / (uptimeMs / 60000)).toFixed(2)) : '0'
        },
        manufacturing: {
          moValidations: this.realTimeMetrics.get('mo_validations'),
          panelsCreated: this.realTimeMetrics.get('panels_created')
        },
        timestamp: now.toISOString()
      };

    } catch (error) {
      throw new MetricsServiceError(
        'Failed to generate real-time metrics',
        'METRICS_GENERATION_FAILED',
        { originalError: error.message }
      );
    }
  }

  /**
   * Get error patterns analysis
   */
  getErrorAnalysis() {
    try {
      const patterns = Array.from(this.errorPatterns.entries()).map(([code, data]) => ({
        errorCode: code,
        count: data.count,
        firstSeen: data.firstSeen,
        lastSeen: data.lastSeen,
        recentSamples: data.samples.slice(-3), // Last 3 samples
        trend: this.calculateErrorTrend(data.samples)
      }));

      // Sort by count (most frequent first)
      patterns.sort((a, b) => b.count - a.count);

      return {
        totalErrorTypes: patterns.length,
        patterns,
        summary: {
          mostFrequent: patterns[0]?.errorCode || null,
          totalErrors: patterns.reduce((sum, p) => sum + p.count, 0),
          recentErrors: patterns.filter(p => {
            const lastSeen = new Date(p.lastSeen);
            const oneHourAgo = new Date(Date.now() - 3600000);
            return lastSeen > oneHourAgo;
          }).length
        },
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      throw new MetricsServiceError(
        'Failed to generate error analysis',
        'ERROR_ANALYSIS_FAILED',
        { originalError: error.message }
      );
    }
  }

  /**
   * Get performance statistics
   */
  async getPerformanceStats(timeRange = '1h') {
    try {
      const timeRanges = {
        '15m': 15 * 60 * 1000,
        '1h': 60 * 60 * 1000,
        '4h': 4 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000
      };

      const rangeMs = timeRanges[timeRange] || timeRanges['1h'];
      const startTime = new Date(Date.now() - rangeMs);

      // Get events from cache within time range
      const events = this.getEventsFromCache(startTime);

      const stats = {
        timeRange,
        startTime: startTime.toISOString(),
        endTime: new Date().toISOString(),
        events: {
          total: events.length,
          byType: this.groupEventsByType(events)
        },
        performance: {
          averageProcessingTime: this.calculateAverageProcessingTime(events),
          peakThroughput: this.calculatePeakThroughput(events),
          stationUtilization: this.calculateStationUtilization(events)
        },
        quality: {
          successRate: this.calculateSuccessRate(events),
          errorRate: this.calculateErrorRate(events),
          overrideRate: this.calculateOverrideRate(events)
        }
      };

      return stats;

    } catch (error) {
      throw new MetricsServiceError(
        'Failed to generate performance statistics',
        'PERFORMANCE_STATS_FAILED',
        { originalError: error.message }
      );
    }
  }

  /**
   * Get dashboard data optimized for production floor display
   */
  async getProductionDashboard() {
    try {
      const realTimeMetrics = this.getRealTimeMetrics();
      const errorAnalysis = this.getErrorAnalysis();
      const performanceStats = await this.getPerformanceStats('1h');

      // Get line-specific metrics
      const lineMetrics = await this.getLineMetrics();

      // Get MO progress summary
      const moProgress = await this.getMOProgressSummary();

      return {
        overview: {
          status: this.getSystemStatus(realTimeMetrics, errorAnalysis),
          uptime: realTimeMetrics.session.uptime.formatted,
          totalScans: realTimeMetrics.barcode.totalScans,
          successRate: realTimeMetrics.barcode.successRate,
          scansPerMinute: realTimeMetrics.barcode.scansPerMinute
        },
        lines: lineMetrics,
        manufacturingOrders: moProgress,
        alerts: this.generateAlerts(realTimeMetrics, errorAnalysis, performanceStats),
        performance: {
          averageProcessingTime: performanceStats.performance.averageProcessingTime,
          peakThroughput: performanceStats.performance.peakThroughput,
          errorRate: performanceStats.quality.errorRate
        },
        errors: {
          totalTypes: errorAnalysis.totalErrorTypes,
          recentErrors: errorAnalysis.summary.recentErrors,
          topErrors: errorAnalysis.patterns.slice(0, 3)
        },
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      throw new MetricsServiceError(
        'Failed to generate production dashboard',
        'DASHBOARD_FAILED',
        { originalError: error.message }
      );
    }
  }

  // Helper methods

  /**
   * Increment a real-time metric counter
   */
  incrementMetric(key, amount = 1) {
    const current = this.realTimeMetrics.get(key) || 0;
    this.realTimeMetrics.set(key, current + amount);
  }

  /**
   * Format uptime in human-readable format
   */
  formatUptime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Calculate error trend from recent samples
   */
  calculateErrorTrend(samples) {
    if (samples.length < 2) return 'stable';

    const recent = samples.slice(-3);
    const older = samples.slice(-6, -3);

    if (recent.length === 0) return 'stable';
    if (older.length === 0) return 'new';

    return recent.length > older.length ? 'increasing' : 
           recent.length < older.length ? 'decreasing' : 'stable';
  }

  /**
   * Get events from event store within time range
   */
  getEventsFromCache(startTime) {
    const events = [];
    const now = Date.now();

    // Clean up expired events while iterating
    for (const [key, eventData] of this.eventStore.entries()) {
      if (eventData.ttl < now) {
        this.eventStore.delete(key);
        continue;
      }

      if (new Date(eventData.timestamp) >= startTime) {
        events.push(eventData);
      }
    }

    return events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  /**
   * Group events by type for analysis
   */
  groupEventsByType(events) {
    const groups = {
      barcode: 0,
      panel: 0,
      mo: 0
    };

    events.forEach(event => {
      if (event.barcode) groups.barcode++;
      if (event.panelId) groups.panel++;
      if (event.moId && event.eventType) groups.mo++;
    });

    return groups;
  }

  /**
   * Calculate average processing time from events
   */
  calculateAverageProcessingTime(events) {
    const timings = events
      .filter(e => e.processingTime && e.processingTime > 0)
      .map(e => e.processingTime);

    if (timings.length === 0) return null;

    const average = timings.reduce((sum, time) => sum + time, 0) / timings.length;
    return Math.round(average * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate peak throughput (events per minute)
   */
  calculatePeakThroughput(events) {
    if (events.length === 0) return 0;

    // Group events by minute
    const minuteGroups = new Map();
    
    events.forEach(event => {
      const minute = new Date(event.timestamp).toISOString().substring(0, 16); // YYYY-MM-DDTHH:mm
      minuteGroups.set(minute, (minuteGroups.get(minute) || 0) + 1);
    });

    return Math.max(...Array.from(minuteGroups.values()));
  }

  /**
   * Calculate station utilization
   */
  calculateStationUtilization(events) {
    const stationCounts = new Map();
    
    events.forEach(event => {
      if (event.stationId) {
        stationCounts.set(event.stationId, (stationCounts.get(event.stationId) || 0) + 1);
      }
    });

    const utilization = {};
    for (const [stationId, count] of stationCounts) {
      utilization[`station_${stationId}`] = count;
    }

    return utilization;
  }

  /**
   * Calculate success rate from events
   */
  calculateSuccessRate(events) {
    const barcodeEvents = events.filter(e => e.barcode);
    if (barcodeEvents.length === 0) return null;

    const successful = barcodeEvents.filter(e => e.success).length;
    return ((successful / barcodeEvents.length) * 100).toFixed(2) + '%';
  }

  /**
   * Calculate error rate from events
   */
  calculateErrorRate(events) {
    const barcodeEvents = events.filter(e => e.barcode);
    if (barcodeEvents.length === 0) return null;

    const failed = barcodeEvents.filter(e => !e.success).length;
    return ((failed / barcodeEvents.length) * 100).toFixed(2) + '%';
  }

  /**
   * Calculate override rate from panel events
   */
  calculateOverrideRate(events) {
    const panelEvents = events.filter(e => e.panelId);
    if (panelEvents.length === 0) return null;

    const overrides = panelEvents.filter(e => e.hasOverrides).length;
    return ((overrides / panelEvents.length) * 100).toFixed(2) + '%';
  }

  /**
   * Get line-specific metrics
   */
  async getLineMetrics() {
    try {
      const events = this.getEventsFromCache(new Date(Date.now() - 3600000)); // Last hour
      
      const lineStats = {
        line1: { scans: 0, success: 0, failed: 0 },
        line2: { scans: 0, success: 0, failed: 0 }
      };

      events.forEach(event => {
        if (event.lineAssignment) {
          const line = event.lineAssignment === 'LINE_1' ? 'line1' : 'line2';
          lineStats[line].scans++;
          if (event.success) {
            lineStats[line].success++;
          } else {
            lineStats[line].failed++;
          }
        }
      });

      return {
        line1: {
          ...lineStats.line1,
          successRate: lineStats.line1.scans > 0 ? 
            ((lineStats.line1.success / lineStats.line1.scans) * 100).toFixed(1) + '%' : '0%'
        },
        line2: {
          ...lineStats.line2,
          successRate: lineStats.line2.scans > 0 ? 
            ((lineStats.line2.success / lineStats.line2.scans) * 100).toFixed(1) + '%' : '0%'
        }
      };

    } catch (error) {
      logger.error('Failed to calculate line metrics', { error: error.message });
      return { line1: null, line2: null };
    }
  }

  /**
   * Get MO progress summary
   */
  async getMOProgressSummary() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_mos,
          COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_mos,
          COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_mos,
          SUM(target_quantity) as total_target,
          SUM(completed_quantity) as total_completed,
          SUM(failed_quantity) as total_failed,
          SUM(in_progress_quantity) as total_in_progress
        FROM manufacturing_orders
        WHERE created_at >= NOW() - INTERVAL '24 hours'
      `;

      const result = await this.db.query(query);
      const data = result.rows[0];

      return {
        totalMOs: parseInt(data.total_mos),
        activeMOs: parseInt(data.active_mos),
        completedMOs: parseInt(data.completed_mos),
        production: {
          target: parseInt(data.total_target) || 0,
          completed: parseInt(data.total_completed) || 0,
          failed: parseInt(data.total_failed) || 0,
          inProgress: parseInt(data.total_in_progress) || 0
        }
      };

    } catch (error) {
      logger.error('Failed to get MO progress summary', { error: error.message });
      return {
        totalMOs: 0,
        activeMOs: 0,
        completedMOs: 0,
        production: { target: 0, completed: 0, failed: 0, inProgress: 0 }
      };
    }
  }

  /**
   * Generate system alerts based on metrics
   */
  generateAlerts(realTimeMetrics, errorAnalysis, performanceStats) {
    const alerts = [];

    // High error rate alert
    const errorRate = parseFloat(performanceStats.quality.errorRate?.replace('%', '') || '0');
    if (errorRate > 10) {
      alerts.push({
        level: 'warning',
        message: `High error rate: ${performanceStats.quality.errorRate}`,
        code: 'HIGH_ERROR_RATE',
        timestamp: new Date().toISOString()
      });
    }

    // Low scan rate alert
    const scansPerMinute = parseFloat(realTimeMetrics.barcode.scansPerMinute);
    if (scansPerMinute < 1 && realTimeMetrics.barcode.totalScans > 0) {
      alerts.push({
        level: 'info',
        message: `Low scan rate: ${scansPerMinute} scans/minute`,
        code: 'LOW_SCAN_RATE',
        timestamp: new Date().toISOString()
      });
    }

    // Recent error spike alert
    if (errorAnalysis.summary.recentErrors > 5) {
      alerts.push({
        level: 'error',
        message: `Error spike detected: ${errorAnalysis.summary.recentErrors} new errors in last hour`,
        code: 'ERROR_SPIKE',
        timestamp: new Date().toISOString()
      });
    }

    return alerts;
  }

  /**
   * Determine overall system status
   */
  getSystemStatus(realTimeMetrics, errorAnalysis) {
    const successRate = parseFloat(realTimeMetrics.barcode.successRate.replace('%', ''));
    const recentErrors = errorAnalysis.summary.recentErrors;

    if (successRate >= 95 && recentErrors <= 2) return 'optimal';
    if (successRate >= 85 && recentErrors <= 5) return 'good';
    if (successRate >= 70 && recentErrors <= 10) return 'warning';
    return 'critical';
  }

  /**
   * Reset metrics (for testing or maintenance)
   */
  resetMetrics() {
    this.realTimeMetrics.clear();
    this.errorPatterns.clear();
    this.performanceStats.clear();
    this.eventStore.clear();
    this.initializeMetrics();
    
    logger.info('Metrics reset completed');
    return { success: true, resetAt: new Date().toISOString() };
  }
}

// Export singleton instance
export const metricsService = new MetricsService();

export default {
  MetricsService,
  MetricsServiceError,
  metricsService
};
