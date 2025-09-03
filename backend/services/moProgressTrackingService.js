// Manufacturing Order Progress Tracking Service
// Real-time progress monitoring, alerts, and bottleneck detection

import db from '../config/database.js';
import { manufacturingLogger } from '../middleware/logger.js';
import { getEventWebSocket } from './eventWebSocket.js';

class MOProgressTrackingService {
  constructor() {
    this.logger = manufacturingLogger;
    this.alertThresholds = {
      panelsRemaining: 50, // Alert when 50 panels remaining
      lowProgress: 25, // Alert when progress below 25%
      highFailureRate: 10, // Alert when failure rate above 10%
      bottleneckThreshold: 5 // Alert when station queue > 5 panels
    };
    this.progressCache = new Map(); // Cache for performance
    this.cacheTimeout = 30000; // 30 seconds cache timeout
  }

  /**
   * Calculate real-time progress for a manufacturing order
   * @param {number} moId - Manufacturing order ID
   * @returns {Promise<Object>} Progress data with statistics
   */
  async calculateMOProgress(moId) {
    try {
      // Check cache first
      const cacheKey = `mo_progress_${moId}`;
      const cached = this.progressCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        return cached.data;
      }

      const query = `
        WITH mo_data AS (
          SELECT 
            mo.id,
            mo.order_number,
            mo.panel_type,
            mo.target_quantity,
            mo.status,
            mo.created_at,
            mo.started_at,
            mo.estimated_completion_date,
            mo.priority
          FROM manufacturing_orders mo
          WHERE mo.id = $1
        ),
        panel_stats AS (
          SELECT 
            COUNT(p.id) as total_panels,
            COUNT(CASE WHEN p.status = 'COMPLETED' THEN 1 END) as completed_panels,
            COUNT(CASE WHEN p.status = 'FAILED' THEN 1 END) as failed_panels,
            COUNT(CASE WHEN p.status = 'IN_PROGRESS' THEN 1 END) as in_progress_panels,
            COUNT(CASE WHEN p.status = 'REWORK' THEN 1 END) as rework_panels,
            COUNT(CASE WHEN p.status = 'PENDING' THEN 1 END) as pending_panels
          FROM panels p
          WHERE p.manufacturing_order_id = $1
        ),
        station_progress AS (
          SELECT 
            COUNT(CASE WHEN p.station_1_completed_at IS NOT NULL THEN 1 END) as station_1_completed,
            COUNT(CASE WHEN p.station_2_completed_at IS NOT NULL THEN 1 END) as station_2_completed,
            COUNT(CASE WHEN p.station_3_completed_at IS NOT NULL THEN 1 END) as station_3_completed,
            COUNT(CASE WHEN p.station_4_completed_at IS NOT NULL THEN 1 END) as station_4_completed,
            COUNT(CASE WHEN p.current_station_id = 1 THEN 1 END) as at_station_1,
            COUNT(CASE WHEN p.current_station_id = 2 THEN 1 END) as at_station_2,
            COUNT(CASE WHEN p.current_station_id = 3 THEN 1 END) as at_station_3,
            COUNT(CASE WHEN p.current_station_id = 4 THEN 1 END) as at_station_4
          FROM panels p
          WHERE p.manufacturing_order_id = $1
        ),
        time_analysis AS (
          SELECT 
            AVG(EXTRACT(EPOCH FROM (p.station_1_completed_at - p.created_at))/60) as avg_station_1_time,
            AVG(EXTRACT(EPOCH FROM (p.station_2_completed_at - p.station_1_completed_at))/60) as avg_station_2_time,
            AVG(EXTRACT(EPOCH FROM (p.station_3_completed_at - p.station_2_completed_at))/60) as avg_station_3_time,
            AVG(EXTRACT(EPOCH FROM (p.station_4_completed_at - p.station_3_completed_at))/60) as avg_station_4_time
          FROM panels p
          WHERE p.manufacturing_order_id = $1
            AND p.station_4_completed_at IS NOT NULL
        )
        SELECT 
          mo.*,
          ps.*,
          sp.*,
          ta.*,
          -- Calculate progress percentage
          CASE 
            WHEN mo.target_quantity = 0 THEN 0
            ELSE ROUND((ps.completed_panels::DECIMAL / mo.target_quantity) * 100, 2)
          END as progress_percentage,
          -- Calculate remaining panels
          (mo.target_quantity - ps.completed_panels - ps.failed_panels) as panels_remaining,
          -- Calculate failure rate
          CASE 
            WHEN ps.total_panels = 0 THEN 0
            ELSE ROUND((ps.failed_panels::DECIMAL / ps.total_panels) * 100, 2)
          END as failure_rate,
          -- Calculate estimated completion time
          CASE 
            WHEN mo.status = 'COMPLETED' THEN mo.completed_at
            WHEN ps.completed_panels = 0 THEN NULL
            ELSE mo.started_at + INTERVAL '1 minute' * (
              (mo.target_quantity - ps.completed_panels - ps.failed_panels) * 
              COALESCE(
                (ta.avg_station_1_time + ta.avg_station_2_time + ta.avg_station_3_time + ta.avg_station_4_time) / 4,
                5 -- Default 5 minutes per panel if no data
              )
            )
          END as estimated_completion_time
        FROM mo_data mo
        CROSS JOIN panel_stats ps
        CROSS JOIN station_progress sp
        CROSS JOIN time_analysis ta
      `;

      const result = await db.query(query, [moId]);
      
      if (result.rows.length === 0) {
        throw new Error('Manufacturing order not found');
      }

      const progressData = result.rows[0];

      // Add calculated fields
      progressData.alerts = await this.generateAlerts(progressData);
      progressData.bottlenecks = await this.identifyBottlenecks(progressData);
      progressData.performance_metrics = this.calculatePerformanceMetrics(progressData);

      // Cache the result
      this.progressCache.set(cacheKey, {
        data: progressData,
        timestamp: Date.now()
      });

      this.logger.info('MO progress calculated', {
        moId,
        order_number: progressData.order_number,
        progress_percentage: progressData.progress_percentage,
        panels_remaining: progressData.panels_remaining
      });

      return progressData;

    } catch (error) {
      this.logger.error('Failed to calculate MO progress', {
        error: error.message,
        moId
      });
      throw error;
    }
  }

  /**
   * Generate alerts based on progress data
   * @param {Object} progressData - Progress data from calculateMOProgress
   * @returns {Promise<Array>} Array of alerts
   */
  async generateAlerts(progressData) {
    const alerts = [];

    // Check for 50 panels remaining alert
    if (progressData.panels_remaining <= this.alertThresholds.panelsRemaining && 
        progressData.panels_remaining > 0) {
      alerts.push({
        type: 'panels_remaining',
        severity: 'warning',
        message: `Only ${progressData.panels_remaining} panels remaining in MO ${progressData.order_number}`,
        threshold: this.alertThresholds.panelsRemaining,
        current_value: progressData.panels_remaining,
        timestamp: new Date().toISOString()
      });
    }

    // Check for low progress alert
    if (progressData.progress_percentage < this.alertThresholds.lowProgress && 
        progressData.status === 'ACTIVE') {
      alerts.push({
        type: 'low_progress',
        severity: 'warning',
        message: `Low progress: ${progressData.progress_percentage}% completed for MO ${progressData.order_number}`,
        threshold: this.alertThresholds.lowProgress,
        current_value: progressData.progress_percentage,
        timestamp: new Date().toISOString()
      });
    }

    // Check for high failure rate alert
    if (progressData.failure_rate > this.alertThresholds.highFailureRate) {
      alerts.push({
        type: 'high_failure_rate',
        severity: 'critical',
        message: `High failure rate: ${progressData.failure_rate}% for MO ${progressData.order_number}`,
        threshold: this.alertThresholds.highFailureRate,
        current_value: progressData.failure_rate,
        timestamp: new Date().toISOString()
      });
    }

    // Check for completion alert
    if (progressData.panels_remaining === 0 && progressData.status !== 'COMPLETED') {
      alerts.push({
        type: 'ready_for_completion',
        severity: 'info',
        message: `MO ${progressData.order_number} is ready for completion`,
        timestamp: new Date().toISOString()
      });
    }

    return alerts;
  }

  /**
   * Identify bottlenecks in the manufacturing workflow
   * @param {Object} progressData - Progress data from calculateMOProgress
   * @returns {Promise<Array>} Array of bottleneck information
   */
  async identifyBottlenecks(progressData) {
    const bottlenecks = [];

    // Check for station bottlenecks (too many panels at one station)
    const stationQueues = [
      { station: 1, count: progressData.at_station_1, name: 'Assembly & EL' },
      { station: 2, count: progressData.at_station_2, name: 'Framing' },
      { station: 3, count: progressData.at_station_3, name: 'Junction Box' },
      { station: 4, count: progressData.at_station_4, name: 'Performance & Final' }
    ];

    for (const station of stationQueues) {
      if (station.count > this.alertThresholds.bottleneckThreshold) {
        bottlenecks.push({
          type: 'station_bottleneck',
          severity: 'warning',
          station_id: station.station,
          station_name: station.name,
          queue_count: station.count,
          threshold: this.alertThresholds.bottleneckThreshold,
          message: `Bottleneck detected at ${station.name}: ${station.count} panels queued`,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Check for slow station performance
    const stationTimes = [
      { station: 1, time: progressData.avg_station_1_time, name: 'Assembly & EL' },
      { station: 2, time: progressData.avg_station_2_time, name: 'Framing' },
      { station: 3, time: progressData.avg_station_3_time, name: 'Junction Box' },
      { station: 4, time: progressData.avg_station_4_time, name: 'Performance & Final' }
    ];

    for (const station of stationTimes) {
      if (station.time && station.time > 10) { // More than 10 minutes per panel
        bottlenecks.push({
          type: 'slow_station',
          severity: 'warning',
          station_id: station.station,
          station_name: station.name,
          avg_time_minutes: station.time,
          threshold: 10,
          message: `Slow performance at ${station.name}: ${station.time.toFixed(1)} minutes per panel`,
          timestamp: new Date().toISOString()
        });
      }
    }

    return bottlenecks;
  }

  /**
   * Calculate performance metrics
   * @param {Object} progressData - Progress data from calculateMOProgress
   * @returns {Object} Performance metrics
   */
  calculatePerformanceMetrics(progressData) {
    const totalTime = progressData.started_at ? 
      (new Date() - new Date(progressData.started_at)) / (1000 * 60 * 60) : 0; // Hours

    const panelsPerHour = totalTime > 0 ? 
      (progressData.completed_panels / totalTime) : 0;

    const estimatedTotalTime = progressData.target_quantity * 0.083; // 5 minutes per panel in hours
    const efficiency = totalTime > 0 ? 
      ((progressData.completed_panels / progressData.target_quantity) / (totalTime / estimatedTotalTime)) * 100 : 0;

    return {
      total_production_time_hours: totalTime,
      panels_per_hour: panelsPerHour,
      estimated_efficiency_percentage: efficiency,
      avg_time_per_panel_minutes: totalTime > 0 ? (totalTime * 60) / progressData.completed_panels : 0,
      on_time_delivery_likelihood: this.calculateOnTimeDeliveryLikelihood(progressData)
    };
  }

  /**
   * Calculate on-time delivery likelihood
   * @param {Object} progressData - Progress data
   * @returns {number} Likelihood percentage
   */
  calculateOnTimeDeliveryLikelihood(progressData) {
    if (!progressData.estimated_completion_date || !progressData.estimated_completion_time) {
      return 0;
    }

    const targetDate = new Date(progressData.estimated_completion_date);
    const estimatedDate = new Date(progressData.estimated_completion_time);
    const timeDiff = estimatedDate - targetDate;
    
    if (timeDiff <= 0) {
      return 100; // On time or early
    } else if (timeDiff <= 24 * 60 * 60 * 1000) { // Within 24 hours
      return 75;
    } else if (timeDiff <= 72 * 60 * 60 * 1000) { // Within 3 days
      return 50;
    } else {
      return 25; // Significantly delayed
    }
  }

  /**
   * Get progress for multiple manufacturing orders
   * @param {Array} moIds - Array of manufacturing order IDs
   * @returns {Promise<Array>} Array of progress data
   */
  async getMultipleMOProgress(moIds) {
    const progressPromises = moIds.map(moId => this.calculateMOProgress(moId));
    return Promise.all(progressPromises);
  }

  /**
   * Get active manufacturing orders with progress
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Array of active MOs with progress
   */
  async getActiveMOsWithProgress(filters = {}) {
    try {
      const { status = 'ACTIVE', limit = 50 } = filters;

      const query = `
        SELECT id, order_number, panel_type, target_quantity, status, priority
        FROM manufacturing_orders 
        WHERE status = $1
        ORDER BY priority DESC, created_at ASC
        LIMIT $2
      `;

      const result = await db.query(query, [status, limit]);
      const moIds = result.rows.map(row => row.id);

      return this.getMultipleMOProgress(moIds);

    } catch (error) {
      this.logger.error('Failed to get active MOs with progress', {
        error: error.message,
        filters
      });
      throw error;
    }
  }

  /**
   * Broadcast progress update via WebSocket
   * @param {number} moId - Manufacturing order ID
   * @param {Object} progressData - Progress data
   */
  async broadcastProgressUpdate(moId, progressData) {
    try {
      const eventWebSocket = getEventWebSocket();
      if (eventWebSocket) {
        const event = {
          id: `mo_progress_${moId}_${Date.now()}`,
          eventType: 'MO_PROGRESS_UPDATE',
          timestamp: new Date().toISOString(),
          severity: 'info',
          eventData: {
            moId,
            order_number: progressData.order_number,
            progress_percentage: progressData.progress_percentage,
            panels_remaining: progressData.panels_remaining,
            status: progressData.status
          },
          context: {
            manufacturing_order_id: moId,
            order_number: progressData.order_number
          },
          metadata: {
            alerts: progressData.alerts,
            bottlenecks: progressData.bottlenecks,
            performance_metrics: progressData.performance_metrics
          }
        };

        eventWebSocket.broadcastEvent(event);

        this.logger.info('MO progress update broadcasted', {
          moId,
          order_number: progressData.order_number,
          progress_percentage: progressData.progress_percentage
        });
      }
    } catch (error) {
      this.logger.error('Failed to broadcast progress update', {
        error: error.message,
        moId
      });
    }
  }

  /**
   * Clear progress cache for a specific MO
   * @param {number} moId - Manufacturing order ID
   */
  clearProgressCache(moId) {
    const cacheKey = `mo_progress_${moId}`;
    this.progressCache.delete(cacheKey);
  }

  /**
   * Clear all progress cache
   */
  clearAllProgressCache() {
    this.progressCache.clear();
  }

  /**
   * Get progress tracking statistics
   * @returns {Object} Statistics about progress tracking
   */
  getProgressTrackingStats() {
    return {
      cache_size: this.progressCache.size,
      alert_thresholds: this.alertThresholds,
      cache_timeout_ms: this.cacheTimeout,
      timestamp: new Date().toISOString()
    };
  }
}

export default new MOProgressTrackingService();
