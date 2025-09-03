// Performance Monitoring Service
// Task 10.7 - Performance and Load Testing

import { manufacturingLogger } from '../middleware/logger.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PERFORMANCE_DIR = path.join(__dirname, '..', 'performance-logs');

class PerformanceMonitoringService {
  constructor() {
    this.logger = manufacturingLogger;
    this.performanceDir = PERFORMANCE_DIR;
    this.metrics = {
      response_times: [],
      memory_usage: [],
      cpu_usage: [],
      throughput: [],
      error_rates: [],
      concurrent_operations: []
    };
    this.alerts = [];
    this.thresholds = {
      max_response_time: 1000, // 1 second
      max_memory_usage: 500 * 1024 * 1024, // 500MB
      max_cpu_usage: 80, // 80%
      min_throughput: 10, // 10 ops/sec
      max_error_rate: 5 // 5%
    };
    this.monitoringActive = false;
    this.monitoringInterval = null;
    this.ensurePerformanceDirectory();
  }

  /**
   * Ensure performance logs directory exists
   */
  async ensurePerformanceDirectory() {
    try {
      await fs.mkdir(this.performanceDir, { recursive: true });
      this.logger.info('Performance monitoring directory ensured', { path: this.performanceDir });
    } catch (error) {
      this.logger.error('Failed to create performance monitoring directory', { error: error.message });
    }
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(intervalMs = 5000) {
    if (this.monitoringActive) {
      this.logger.warn('Performance monitoring already active');
      return;
    }

    this.monitoringActive = true;
    this.monitoringInterval = setInterval(() => {
      this.collectPerformanceMetrics();
    }, intervalMs);

    this.logger.info('Performance monitoring started', { interval: intervalMs });
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring() {
    if (!this.monitoringActive) {
      this.logger.warn('Performance monitoring not active');
      return;
    }

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.monitoringActive = false;
    this.logger.info('Performance monitoring stopped');
  }

  /**
   * Collect performance metrics
   */
  collectPerformanceMetrics() {
    try {
      const timestamp = Date.now();
      
      // Memory usage
      const memUsage = process.memoryUsage();
      this.metrics.memory_usage.push({
        heap_used: memUsage.heapUsed,
        heap_total: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
        timestamp
      });

      // CPU usage
      const cpuUsage = process.cpuUsage();
      this.metrics.cpu_usage.push({
        user: cpuUsage.user,
        system: cpuUsage.system,
        timestamp
      });

      // Check thresholds and generate alerts
      this.checkThresholds();

    } catch (error) {
      this.logger.error('Failed to collect performance metrics', { error: error.message });
    }
  }

  /**
   * Record response time for an operation
   */
  recordResponseTime(operation, duration, metadata = {}) {
    const timestamp = Date.now();
    
    this.metrics.response_times.push({
      operation,
      duration,
      timestamp,
      ...metadata
    });

    // Check if response time exceeds threshold
    if (duration > this.thresholds.max_response_time) {
      this.generateAlert('HIGH_RESPONSE_TIME', {
        operation,
        duration,
        threshold: this.thresholds.max_response_time,
        message: `Response time ${duration}ms exceeds threshold ${this.thresholds.max_response_time}ms for operation ${operation}`
      });
    }

    // Keep only last 1000 response times
    if (this.metrics.response_times.length > 1000) {
      this.metrics.response_times = this.metrics.response_times.slice(-1000);
    }
  }

  /**
   * Record throughput metrics
   */
  recordThroughput(operations, duration, operationType = 'general') {
    const timestamp = Date.now();
    const opsPerSecond = operations / (duration / 1000);
    
    this.metrics.throughput.push({
      operations,
      duration,
      ops_per_second: opsPerSecond,
      operation_type: operationType,
      timestamp
    });

    // Check if throughput is below threshold
    if (opsPerSecond < this.thresholds.min_throughput) {
      this.generateAlert('LOW_THROUGHPUT', {
        operation_type: operationType,
        ops_per_second: opsPerSecond,
        threshold: this.thresholds.min_throughput,
        message: `Throughput ${opsPerSecond.toFixed(2)} ops/sec below threshold ${this.thresholds.min_throughput} ops/sec for ${operationType}`
      });
    }

    // Keep only last 1000 throughput records
    if (this.metrics.throughput.length > 1000) {
      this.metrics.throughput = this.metrics.throughput.slice(-1000);
    }
  }

  /**
   * Record error rate
   */
  recordErrorRate(operation, errors, total, metadata = {}) {
    const timestamp = Date.now();
    const errorRate = (errors / total) * 100;
    
    this.metrics.error_rates.push({
      operation,
      errors,
      total,
      error_rate: errorRate,
      timestamp,
      ...metadata
    });

    // Check if error rate exceeds threshold
    if (errorRate > this.thresholds.max_error_rate) {
      this.generateAlert('HIGH_ERROR_RATE', {
        operation,
        error_rate: errorRate,
        threshold: this.thresholds.max_error_rate,
        message: `Error rate ${errorRate.toFixed(2)}% exceeds threshold ${this.thresholds.max_error_rate}% for operation ${operation}`
      });
    }

    // Keep only last 1000 error rate records
    if (this.metrics.error_rates.length > 1000) {
      this.metrics.error_rates = this.metrics.error_rates.slice(-1000);
    }
  }

  /**
   * Record concurrent operations
   */
  recordConcurrentOperations(count, operationType = 'general') {
    const timestamp = Date.now();
    
    this.metrics.concurrent_operations.push({
      count,
      operation_type: operationType,
      timestamp
    });

    // Keep only last 1000 concurrent operation records
    if (this.metrics.concurrent_operations.length > 1000) {
      this.metrics.concurrent_operations = this.metrics.concurrent_operations.slice(-1000);
    }
  }

  /**
   * Check performance thresholds and generate alerts
   */
  checkThresholds() {
    const currentMemory = process.memoryUsage();
    
    // Check memory usage
    if (currentMemory.heapUsed > this.thresholds.max_memory_usage) {
      this.generateAlert('HIGH_MEMORY_USAGE', {
        heap_used: currentMemory.heapUsed,
        threshold: this.thresholds.max_memory_usage,
        message: `Memory usage ${(currentMemory.heapUsed / 1024 / 1024).toFixed(2)}MB exceeds threshold ${(this.thresholds.max_memory_usage / 1024 / 1024).toFixed(2)}MB`
      });
    }

    // Check CPU usage (simplified)
    const cpuUsage = process.cpuUsage();
    const totalCpu = cpuUsage.user + cpuUsage.system;
    if (totalCpu > this.thresholds.max_cpu_usage * 1000) { // Convert to microseconds
      this.generateAlert('HIGH_CPU_USAGE', {
        cpu_usage: totalCpu,
        threshold: this.thresholds.max_cpu_usage,
        message: `CPU usage ${(totalCpu / 1000).toFixed(2)}ms exceeds threshold ${this.thresholds.max_cpu_usage}ms`
      });
    }
  }

  /**
   * Generate performance alert
   */
  generateAlert(type, data) {
    const alert = {
      id: `perf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity: this.getAlertSeverity(type),
      data,
      timestamp: new Date().toISOString(),
      resolved: false
    };

    this.alerts.push(alert);
    
    this.logger.warn('Performance alert generated', alert);
    
    // Keep only last 1000 alerts
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }
  }

  /**
   * Get alert severity based on type
   */
  getAlertSeverity(type) {
    const severityMap = {
      'HIGH_RESPONSE_TIME': 'WARNING',
      'LOW_THROUGHPUT': 'WARNING',
      'HIGH_ERROR_RATE': 'CRITICAL',
      'HIGH_MEMORY_USAGE': 'CRITICAL',
      'HIGH_CPU_USAGE': 'WARNING'
    };
    
    return severityMap[type] || 'INFO';
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(timeWindowMs = 300000) { // 5 minutes default
    const now = Date.now();
    const cutoff = now - timeWindowMs;
    
    // Filter metrics by time window
    const recentResponseTimes = this.metrics.response_times.filter(m => m.timestamp > cutoff);
    const recentThroughput = this.metrics.throughput.filter(m => m.timestamp > cutoff);
    const recentErrorRates = this.metrics.error_rates.filter(m => m.timestamp > cutoff);
    const recentMemoryUsage = this.metrics.memory_usage.filter(m => m.timestamp > cutoff);
    const recentCpuUsage = this.metrics.cpu_usage.filter(m => m.timestamp > cutoff);
    
    // Calculate averages
    const avgResponseTime = recentResponseTimes.length > 0 
      ? recentResponseTimes.reduce((sum, m) => sum + m.duration, 0) / recentResponseTimes.length 
      : 0;
    
    const maxResponseTime = recentResponseTimes.length > 0 
      ? Math.max(...recentResponseTimes.map(m => m.duration)) 
      : 0;
    
    const avgThroughput = recentThroughput.length > 0 
      ? recentThroughput.reduce((sum, m) => sum + m.ops_per_second, 0) / recentThroughput.length 
      : 0;
    
    const avgErrorRate = recentErrorRates.length > 0 
      ? recentErrorRates.reduce((sum, m) => sum + m.error_rate, 0) / recentErrorRates.length 
      : 0;
    
    const avgMemoryUsage = recentMemoryUsage.length > 0 
      ? recentMemoryUsage.reduce((sum, m) => sum + m.heap_used, 0) / recentMemoryUsage.length 
      : 0;
    
    const maxMemoryUsage = recentMemoryUsage.length > 0 
      ? Math.max(...recentMemoryUsage.map(m => m.heap_used)) 
      : 0;
    
    // Get active alerts
    const activeAlerts = this.alerts.filter(a => !a.resolved);
    
    return {
      time_window_ms: timeWindowMs,
      metrics_count: {
        response_times: recentResponseTimes.length,
        throughput: recentThroughput.length,
        error_rates: recentErrorRates.length,
        memory_usage: recentMemoryUsage.length,
        cpu_usage: recentCpuUsage.length
      },
      performance: {
        avg_response_time: avgResponseTime,
        max_response_time: maxResponseTime,
        avg_throughput: avgThroughput,
        avg_error_rate: avgErrorRate,
        avg_memory_usage: avgMemoryUsage,
        max_memory_usage: maxMemoryUsage
      },
      alerts: {
        total: this.alerts.length,
        active: activeAlerts.length,
        by_severity: this.getAlertsBySeverity(activeAlerts)
      },
      thresholds: this.thresholds,
      monitoring_active: this.monitoringActive
    };
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(alerts) {
    return alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Get performance metrics by operation type
   */
  getMetricsByOperation(operationType, timeWindowMs = 300000) {
    const now = Date.now();
    const cutoff = now - timeWindowMs;
    
    const operationMetrics = {
      response_times: this.metrics.response_times.filter(m => 
        m.operation === operationType && m.timestamp > cutoff
      ),
      throughput: this.metrics.throughput.filter(m => 
        m.operation_type === operationType && m.timestamp > cutoff
      ),
      error_rates: this.metrics.error_rates.filter(m => 
        m.operation === operationType && m.timestamp > cutoff
      )
    };
    
    return {
      operation_type: operationType,
      time_window_ms: timeWindowMs,
      metrics: operationMetrics,
      summary: {
        avg_response_time: operationMetrics.response_times.length > 0 
          ? operationMetrics.response_times.reduce((sum, m) => sum + m.duration, 0) / operationMetrics.response_times.length 
          : 0,
        avg_throughput: operationMetrics.throughput.length > 0 
          ? operationMetrics.throughput.reduce((sum, m) => sum + m.ops_per_second, 0) / operationMetrics.throughput.length 
          : 0,
        avg_error_rate: operationMetrics.error_rates.length > 0 
          ? operationMetrics.error_rates.reduce((sum, m) => sum + m.error_rate, 0) / operationMetrics.error_rates.length 
          : 0
      }
    };
  }

  /**
   * Export performance data to file
   */
  async exportPerformanceData(format = 'json', timeWindowMs = 3600000) { // 1 hour default
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `performance-export-${timestamp}.${format}`;
      const filepath = path.join(this.performanceDir, filename);
      
      const data = {
        export_timestamp: new Date().toISOString(),
        time_window_ms: timeWindowMs,
        summary: this.getPerformanceSummary(timeWindowMs),
        metrics: this.metrics,
        alerts: this.alerts,
        thresholds: this.thresholds
      };
      
      if (format === 'json') {
        await fs.writeFile(filepath, JSON.stringify(data, null, 2));
      } else if (format === 'csv') {
        // Convert to CSV format (simplified)
        const csvData = this.convertToCSV(data);
        await fs.writeFile(filepath, csvData);
      }
      
      this.logger.info('Performance data exported', { filename, format, timeWindowMs });
      
      return {
        success: true,
        filename,
        filepath,
        size: (await fs.stat(filepath)).size
      };
      
    } catch (error) {
      this.logger.error('Failed to export performance data', { error: error.message });
      throw error;
    }
  }

  /**
   * Convert performance data to CSV format
   */
  convertToCSV(data) {
    const csvLines = [];
    
    // Add summary data
    csvLines.push('Metric,Value');
    csvLines.push(`Avg Response Time,${data.summary.performance.avg_response_time}`);
    csvLines.push(`Max Response Time,${data.summary.performance.max_response_time}`);
    csvLines.push(`Avg Throughput,${data.summary.performance.avg_throughput}`);
    csvLines.push(`Avg Error Rate,${data.summary.performance.avg_error_rate}`);
    csvLines.push(`Avg Memory Usage,${data.summary.performance.avg_memory_usage}`);
    csvLines.push(`Max Memory Usage,${data.summary.performance.max_memory_usage}`);
    
    return csvLines.join('\n');
  }

  /**
   * Clear old performance data
   */
  clearOldData(olderThanMs = 86400000) { // 24 hours default
    const cutoff = Date.now() - olderThanMs;
    
    this.metrics.response_times = this.metrics.response_times.filter(m => m.timestamp > cutoff);
    this.metrics.throughput = this.metrics.throughput.filter(m => m.timestamp > cutoff);
    this.metrics.error_rates = this.metrics.error_rates.filter(m => m.timestamp > cutoff);
    this.metrics.memory_usage = this.metrics.memory_usage.filter(m => m.timestamp > cutoff);
    this.metrics.cpu_usage = this.metrics.cpu_usage.filter(m => m.timestamp > cutoff);
    this.metrics.concurrent_operations = this.metrics.concurrent_operations.filter(m => m.timestamp > cutoff);
    
    this.logger.info('Old performance data cleared', { olderThanMs, cutoff });
  }

  /**
   * Update performance thresholds
   */
  updateThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    this.logger.info('Performance thresholds updated', { newThresholds });
  }

  /**
   * Get current thresholds
   */
  getThresholds() {
    return { ...this.thresholds };
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId, resolution = 'Manual resolution') {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolved_at = new Date().toISOString();
      alert.resolution = resolution;
      this.logger.info('Performance alert resolved', { alertId, resolution });
      return true;
    }
    return false;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts() {
    return this.alerts.filter(a => !a.resolved);
  }

  /**
   * Get performance health status
   */
  getHealthStatus() {
    const summary = this.getPerformanceSummary();
    const activeAlerts = this.getActiveAlerts();
    
    let healthStatus = 'HEALTHY';
    
    if (activeAlerts.some(a => a.severity === 'CRITICAL')) {
      healthStatus = 'CRITICAL';
    } else if (activeAlerts.some(a => a.severity === 'WARNING')) {
      healthStatus = 'WARNING';
    } else if (summary.performance.avg_error_rate > 1) {
      healthStatus = 'DEGRADED';
    }
    
    return {
      status: healthStatus,
      summary,
      active_alerts: activeAlerts.length,
      last_updated: new Date().toISOString()
    };
  }
}

export default new PerformanceMonitoringService();
