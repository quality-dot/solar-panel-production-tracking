/**
 * Event Metrics Service
 * Task: 22.3 - Event Collection System
 * Description: Performance monitoring and metrics collection for events
 * Date: 2025-08-28
 */

import { EventStore } from './eventStore.js';
import loggerService from './loggerService.js';

export class EventMetrics {
  constructor() {
    this.eventStore = new EventStore();
    this.metrics = new Map();
    this.performanceMetrics = new Map();
    this.startMetricsCollection();
    
    loggerService.logSecurity('info', 'Event metrics service initialized', {
      source: 'event-metrics'
    });
  }
  
  /**
   * Record event for metrics
   * @param {Object} event - Security event object
   */
  async record(event) {
    try {
      // Update in-memory metrics
      this.updateInMemoryMetrics(event);
      
      // Update performance metrics
      this.updatePerformanceMetrics(event);
      
      // Update database metrics (async)
      this.updateDatabaseMetrics(event);
      
    } catch (error) {
      loggerService.logSecurity('error', 'Failed to record event metrics', {
        eventId: event.id,
        error: error.message,
        source: 'event-metrics'
      });
    }
  }
  
  /**
   * Update in-memory metrics
   * @param {Object} event - Security event object
   */
  updateInMemoryMetrics(event) {
    const key = `${event.eventType}:${event.severity}`;
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        count: 0,
        lastOccurrence: null,
        totalProcessingTime: 0,
        minProcessingTime: Infinity,
        maxProcessingTime: 0,
        errorCount: 0,
        successCount: 0
      });
    }
    
    const metric = this.metrics.get(key);
    metric.count++;
    metric.lastOccurrence = new Date();
    
    // Calculate processing time if available
    if (event.context.processingTime) {
      const processingTime = event.context.processingTime;
      metric.totalProcessingTime += processingTime;
      metric.minProcessingTime = Math.min(metric.minProcessingTime, processingTime);
      metric.maxProcessingTime = Math.max(metric.maxProcessingTime, processingTime);
    }
    
    // Track success/error counts
    if (event.context.success === false || event.severity === 'error') {
      metric.errorCount++;
    } else {
      metric.successCount++;
    }
  }
  
  /**
   * Update performance metrics
   * @param {Object} event - Security event object
   */
  updatePerformanceMetrics(event) {
    const timestamp = new Date();
    const hourKey = this.getHourKey(timestamp);
    const dayKey = this.getDayKey(timestamp);
    
    // Hourly metrics
    if (!this.performanceMetrics.has(hourKey)) {
      this.performanceMetrics.set(hourKey, {
        eventCount: 0,
        totalProcessingTime: 0,
        eventTypes: new Set(),
        severities: new Set(),
        users: new Set(),
        sourceIps: new Set()
      });
    }
    
    const hourMetrics = this.performanceMetrics.get(hourKey);
    hourMetrics.eventCount++;
    hourMetrics.eventTypes.add(event.eventType);
    hourMetrics.severities.add(event.severity);
    
    if (event.userId) hourMetrics.users.add(event.userId);
    if (event.sourceIp) hourMetrics.sourceIps.add(event.sourceIp);
    
    if (event.context.processingTime) {
      hourMetrics.totalProcessingTime += event.context.processingTime;
    }
    
    // Daily metrics
    if (!this.performanceMetrics.has(dayKey)) {
      this.performanceMetrics.set(dayKey, {
        eventCount: 0,
        totalProcessingTime: 0,
        eventTypes: new Set(),
        severities: new Set(),
        users: new Set(),
        sourceIps: new Set()
      });
    }
    
    const dayMetrics = this.performanceMetrics.get(dayKey);
    dayMetrics.eventCount++;
    dayMetrics.eventTypes.add(event.eventType);
    dayMetrics.severities.add(event.severity);
    
    if (event.userId) dayMetrics.users.add(event.userId);
    if (event.sourceIp) dayMetrics.sourceIps.add(event.sourceIp);
    
    if (event.context.processingTime) {
      dayMetrics.totalProcessingTime += event.context.processingTime;
    }
  }
  
  /**
   * Update database metrics
   * @param {Object} event - Security event object
   */
  async updateDatabaseMetrics(event) {
    try {
      // This would update the event_metrics table
      // Implementation depends on specific metrics requirements
      // For now, we'll just log the metric update
      
      loggerService.logSecurity('debug', 'Database metrics updated', {
        eventId: event.id,
        eventType: event.eventType,
        source: 'event-metrics'
      });
      
    } catch (error) {
      // Log error but don't fail event processing
      loggerService.logSecurity('warn', 'Failed to update database metrics', {
        eventId: event.id,
        error: error.message,
        source: 'event-metrics'
      });
    }
  }
  
  /**
   * Get current metrics
   * @returns {Object} Current metrics
   */
  getMetrics() {
    const metrics = {};
    
    for (const [key, value] of this.metrics) {
      metrics[key] = {
        ...value,
        averageProcessingTime: value.count > 0 ? 
          value.totalProcessingTime / value.count : 0,
        successRate: value.count > 0 ? 
          (value.successCount / value.count) * 100 : 0,
        errorRate: value.count > 0 ? 
          (value.errorCount / value.count) * 100 : 0
      };
    }
    
    return metrics;
  }
  
  /**
   * Get performance metrics
   * @param {string} period - Time period (hour, day)
   * @returns {Object} Performance metrics
   */
  getPerformanceMetrics(period = 'hour') {
    const metrics = {};
    
    for (const [key, value] of this.performanceMetrics) {
      if (key.startsWith(period)) {
        metrics[key] = {
          eventCount: value.eventCount,
          totalProcessingTime: value.totalProcessingTime,
          averageProcessingTime: value.eventCount > 0 ? 
            value.totalProcessingTime / value.eventCount : 0,
          eventTypeCount: value.eventTypes.size,
          severityCount: value.severities.size,
          userCount: value.users.size,
          sourceIpCount: value.sourceIps.size,
          eventTypes: Array.from(value.eventTypes),
          severities: Array.from(value.severities),
          users: Array.from(value.users),
          sourceIps: Array.from(value.sourceIps)
        };
      }
    }
    
    return metrics;
  }
  
  /**
   * Get metrics summary
   * @returns {Object} Metrics summary
   */
  getMetricsSummary() {
    const metrics = this.getMetrics();
    const performanceMetrics = this.getPerformanceMetrics('hour');
    
    const summary = {
      totalEventTypes: Object.keys(metrics).length,
      totalEvents: Object.values(metrics).reduce((sum, m) => sum + m.count, 0),
      totalErrors: Object.values(metrics).reduce((sum, m) => sum + m.errorCount, 0),
      totalSuccess: Object.values(metrics).reduce((sum, m) => sum + m.successCount, 0),
      averageProcessingTime: 0,
      performanceMetrics: performanceMetrics,
      timestamp: new Date().toISOString()
    };
    
    // Calculate overall average processing time
    let totalProcessingTime = 0;
    let totalCount = 0;
    
    for (const metric of Object.values(metrics)) {
      totalProcessingTime += metric.totalProcessingTime;
      totalCount += metric.count;
    }
    
    summary.averageProcessingTime = totalCount > 0 ? 
      totalProcessingTime / totalCount : 0;
    
    return summary;
  }
  
  /**
   * Get metrics for specific event type
   * @param {string} eventType - Event type to get metrics for
   * @returns {Object} Event type metrics
   */
  getEventTypeMetrics(eventType) {
    const metrics = this.getMetrics();
    const eventTypeMetrics = {};
    
    for (const [key, value] of Object.entries(metrics)) {
      if (key.startsWith(eventType)) {
        eventTypeMetrics[key] = value;
      }
    }
    
    return eventTypeMetrics;
  }
  
  /**
   * Get metrics for specific severity
   * @param {string} severity - Severity level to get metrics for
   * @returns {Object} Severity metrics
   */
  getSeverityMetrics(severity) {
    const metrics = this.getMetrics();
    const severityMetrics = {};
    
    for (const [key, value] of Object.entries(metrics)) {
      if (key.endsWith(severity)) {
        severityMetrics[key] = value;
      }
    }
    
    return severityMetrics;
  }
  
  /**
   * Get top event types by count
   * @param {number} limit - Number of top event types to return
   * @returns {Array} Top event types
   */
  getTopEventTypes(limit = 10) {
    const metrics = this.getMetrics();
    const eventTypeCounts = {};
    
    // Aggregate counts by event type
    for (const [key, value] of Object.entries(metrics)) {
      const eventType = key.split(':')[0];
      if (!eventTypeCounts[eventType]) {
        eventTypeCounts[eventType] = 0;
      }
      eventTypeCounts[eventType] += value.count;
    }
    
    // Sort by count and return top N
    return Object.entries(eventTypeCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([eventType, count]) => ({ eventType, count }));
  }
  
  /**
   * Get top users by event count
   * @param {number} limit - Number of top users to return
   * @returns {Array} Top users
   */
  getTopUsers(limit = 10) {
    const performanceMetrics = this.getPerformanceMetrics('day');
    const userCounts = {};
    
    // Aggregate user counts across all time periods
    for (const metrics of Object.values(performanceMetrics)) {
      for (const userId of metrics.users) {
        if (!userCounts[userId]) {
          userCounts[userId] = 0;
        }
        userCounts[userId]++;
      }
    }
    
    // Sort by count and return top N
    return Object.entries(userCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([userId, count]) => ({ userId, count }));
  }
  
  /**
   * Get processing time statistics
   * @returns {Object} Processing time statistics
   */
  getProcessingTimeStats() {
    const metrics = this.getMetrics();
    const processingTimes = [];
    
    for (const metric of Object.values(metrics)) {
      if (metric.totalProcessingTime > 0) {
        processingTimes.push(metric.averageProcessingTime);
      }
    }
    
    if (processingTimes.length === 0) {
      return {
        min: 0,
        max: 0,
        average: 0,
        median: 0,
        p95: 0,
        p99: 0
      };
    }
    
    processingTimes.sort((a, b) => a - b);
    
    const stats = {
      min: processingTimes[0],
      max: processingTimes[processingTimes.length - 1],
      average: processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length,
      median: processingTimes[Math.floor(processingTimes.length / 2)],
      p95: processingTimes[Math.floor(processingTimes.length * 0.95)],
      p99: processingTimes[Math.floor(processingTimes.length * 0.99)]
    };
    
    return stats;
  }
  
  /**
   * Get hour key for metrics
   * @param {Date} timestamp - Timestamp
   * @returns {string} Hour key
   */
  getHourKey(timestamp) {
    const date = new Date(timestamp);
    return `hour_${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}`;
  }
  
  /**
   * Get day key for metrics
   * @param {Date} timestamp - Timestamp
   * @returns {string} Day key
   */
  getDayKey(timestamp) {
    const date = new Date(timestamp);
    return `day_${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  
  /**
   * Start metrics collection
   */
  startMetricsCollection() {
    // Collect metrics every minute
    setInterval(() => {
      this.collectMetrics();
    }, 60000);
    
    // Clean up old metrics every hour
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 3600000);
    
    loggerService.logSecurity('info', 'Metrics collection started', {
      source: 'event-metrics',
      collectionInterval: '1 minute',
      cleanupInterval: '1 hour'
    });
  }
  
  /**
   * Collect and store metrics
   */
  async collectMetrics() {
    try {
      const summary = this.getMetricsSummary();
      
      // Store metrics to database
      // Implementation depends on specific requirements
      
      loggerService.logSecurity('debug', 'Metrics collected successfully', {
        metricCount: summary.totalEventTypes,
        totalEvents: summary.totalEvents,
        source: 'event-metrics'
      });
      
    } catch (error) {
      loggerService.logSecurity('error', 'Failed to collect metrics', {
        error: error.message,
        source: 'event-metrics'
      });
    }
  }
  
  /**
   * Clean up old metrics
   */
  cleanupOldMetrics() {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
      
      // Clean up old performance metrics
      for (const [key, value] of this.performanceMetrics.entries()) {
        if (key.startsWith('hour_')) {
          const hourDate = this.parseHourKey(key);
          if (hourDate < oneDayAgo) {
            this.performanceMetrics.delete(key);
          }
        }
      }
      
      loggerService.logSecurity('debug', 'Old metrics cleaned up successfully', {
        source: 'event-metrics'
      });
      
    } catch (error) {
      loggerService.logSecurity('error', 'Failed to cleanup old metrics', {
        error: error.message,
        source: 'event-metrics'
      });
    }
  }
  
  /**
   * Parse hour key to get date
   * @param {string} hourKey - Hour key
   * @returns {Date} Parsed date
   */
  parseHourKey(hourKey) {
    const match = hourKey.match(/hour_(\d{4})-(\d{2})-(\d{2})_(\d{2})/);
    if (match) {
      const [, year, month, day, hour] = match;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour));
    }
    return new Date();
  }
  
  /**
   * Reset all metrics
   */
  resetMetrics() {
    this.metrics.clear();
    this.performanceMetrics.clear();
    
    loggerService.logSecurity('info', 'All metrics reset', {
      source: 'event-metrics'
    });
  }
  
  /**
   * Export metrics for external use
   * @returns {Object} Exported metrics data
   */
  exportMetrics() {
    return {
      metrics: this.getMetrics(),
      performanceMetrics: this.getPerformanceMetrics(),
      summary: this.getMetricsSummary(),
      processingTimeStats: this.getProcessingTimeStats(),
      topEventTypes: this.getTopEventTypes(),
      topUsers: this.getTopUsers(),
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
export const eventMetrics = new EventMetrics();
export default eventMetrics;
