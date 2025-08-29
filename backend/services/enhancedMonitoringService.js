// Enhanced Monitoring and Analytics Service
// Production-floor specific monitoring for barcode processing and manufacturing operations

import { metricsService, MetricsServiceError } from './metricsService.js';
import { enhancedMOIntegration } from './enhancedMOIntegration.js';
import { ManufacturingLogger } from '../middleware/logger.js';
import { performanceCache } from '../utils/performanceCache.js';

const logger = new ManufacturingLogger('EnhancedMonitoring');

/**
 * Enhanced Monitoring Service
 * Provides production-floor specific monitoring and analytics
 */
export class EnhancedMonitoringService {
  constructor() {
    this.metricsService = metricsService;
    this.moIntegration = enhancedMOIntegration;
    this.performanceCache = performanceCache;
    
    // Production floor specific metrics
    this.stationMetrics = new Map();
    this.lineMetrics = new Map();
    this.qualityMetrics = new Map();
    
    this.initializeEnhancedMetrics();
  }

  /**
   * Initialize enhanced monitoring metrics
   */
  initializeEnhancedMetrics() {
    // Initialize station metrics for 8 stations
    for (let i = 1; i <= 8; i++) {
      this.stationMetrics.set(i, {
        stationId: i,
        lineNumber: i <= 4 ? 1 : 2,
        totalScans: 0,
        successfulScans: 0,
        failedScans: 0,
        lastActivity: null,
        currentStatus: 'idle',
        averageProcessingTime: 0,
        errorCount: 0,
        uptime: 0
      });
    }

    // Initialize line metrics
    this.lineMetrics.set(1, {
      lineNumber: 1,
      panelTypes: ['36', '40', '60', '72'],
      totalPanels: 0,
      completedPanels: 0,
      failedPanels: 0,
      currentThroughput: 0,
      targetThroughput: 120, // panels per hour
      efficiency: 0,
      lastUpdated: new Date().toISOString()
    });

    this.lineMetrics.set(2, {
      lineNumber: 2,
      panelTypes: ['144'],
      totalPanels: 0,
      completedPanels: 0,
      failedPanels: 0,
      currentThroughput: 0,
      targetThroughput: 60, // panels per hour (144W panels are slower)
      efficiency: 0,
      lastUpdated: new Date().toISOString()
    });

    // Initialize quality metrics
    this.qualityMetrics.set('overall', {
      totalInspections: 0,
      passedInspections: 0,
      failedInspections: 0,
      passRate: 0,
      commonDefects: new Map(),
      qualityTrend: 'stable'
    });

    logger.info('Enhanced monitoring service initialized', {
      stations: this.stationMetrics.size,
      lines: this.lineMetrics.size
    });
  }

  /**
   * Get comprehensive production floor dashboard
   * Enhanced version with real-time station and line monitoring
   */
  async getProductionFloorDashboard() {
    try {
      // Get base metrics
      const baseMetrics = this.metricsService.getRealTimeMetrics();
      const errorAnalysis = this.metricsService.getErrorAnalysis();
      const performanceStats = await this.metricsService.getPerformanceStats('1h');
      
      // Get enhanced metrics
      const stationMetrics = this.getStationMetrics();
      const lineMetrics = this.getLineMetrics();
      const qualityMetrics = this.getQualityMetrics();
      const moDashboard = await this.moIntegration.getMODashboardData();
      
      // Generate production alerts
      const alerts = this.generateProductionAlerts(baseMetrics, stationMetrics, lineMetrics, qualityMetrics);
      
      // Calculate production efficiency
      const efficiencyMetrics = this.calculateProductionEfficiency(lineMetrics, baseMetrics);
      
      const dashboard = {
        overview: {
          status: this.getProductionStatus(baseMetrics, stationMetrics, lineMetrics),
          uptime: baseMetrics.session.uptime.formatted,
          totalScans: baseMetrics.barcode.totalScans,
          successRate: baseMetrics.barcode.successRate,
          scansPerMinute: baseMetrics.barcode.scansPerMinute,
          productionEfficiency: efficiencyMetrics.overallEfficiency
        },
        stations: stationMetrics,
        lines: lineMetrics,
        quality: qualityMetrics,
        manufacturingOrders: moDashboard,
        alerts,
        efficiency: efficiencyMetrics,
        performance: {
          averageProcessingTime: performanceStats.performance.averageProcessingTime,
          peakThroughput: performanceStats.performance.peakThroughput,
          errorRate: performanceStats.quality.errorRate,
          stationUtilization: this.calculateStationUtilization(stationMetrics)
        },
        errors: {
          totalTypes: errorAnalysis.totalErrorTypes,
          recentErrors: errorAnalysis.summary.recentErrors,
          topErrors: errorAnalysis.patterns.slice(0, 5),
          stationErrors: this.getStationErrorBreakdown(stationMetrics)
        },
        lastUpdated: new Date().toISOString()
      };

      logger.info('Production floor dashboard generated', {
        stations: stationMetrics.length,
        lines: lineMetrics.length,
        alerts: alerts.length
      });

      return dashboard;

    } catch (error) {
      logger.error('Failed to generate production floor dashboard', {
        error: error.message
      });
      throw new MetricsServiceError(
        'Failed to generate production floor dashboard',
        'DASHBOARD_GENERATION_FAILED',
        { originalError: error.message }
      );
    }
  }

  /**
   * Get real-time station metrics
   */
  getStationMetrics() {
    const metrics = [];
    
    for (const [stationId, data] of this.stationMetrics) {
      const station = { ...data };
      
      // Calculate station efficiency
      if (station.totalScans > 0) {
        station.successRate = ((station.successfulScans / station.totalScans) * 100).toFixed(2) + '%';
        station.errorRate = ((station.errorCount / station.totalScans) * 100).toFixed(2) + '%';
      } else {
        station.successRate = '0%';
        station.errorRate = '0%';
      }
      
      // Calculate uptime
      if (station.lastActivity) {
        const lastActivity = new Date(station.lastActivity);
        const now = new Date();
        station.uptime = Math.floor((now - lastActivity) / 1000); // seconds since last activity
      }
      
      metrics.push(station);
    }
    
    return metrics;
  }

  /**
   * Get real-time line metrics
   */
  getLineMetrics() {
    const metrics = [];
    
    for (const [lineNumber, data] of this.lineMetrics) {
      const line = { ...data };
      
      // Calculate efficiency
      if (line.totalPanels > 0) {
        line.efficiency = ((line.completedPanels / line.totalPanels) * 100).toFixed(2);
      }
      
      // Calculate current throughput (panels per hour)
      const oneHourAgo = new Date(Date.now() - 3600000);
      const recentPanels = this.getRecentPanelsForLine(lineNumber, oneHourAgo);
      line.currentThroughput = recentPanels.length;
      
      // Calculate throughput efficiency
      line.throughputEfficiency = line.targetThroughput > 0 
        ? ((line.currentThroughput / line.targetThroughput) * 100).toFixed(2)
        : 0;
      
      metrics.push(line);
    }
    
    return metrics;
  }

  /**
   * Get quality metrics
   */
  getQualityMetrics() {
    const overall = this.qualityMetrics.get('overall');
    
    if (overall.totalInspections > 0) {
      overall.passRate = ((overall.passedInspections / overall.totalInspections) * 100).toFixed(2) + '%';
    } else {
      overall.passRate = '0%';
    }
    
    // Convert common defects map to array
    const commonDefects = Array.from(overall.commonDefects.entries())
      .map(([defect, count]) => ({ defect, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    return {
      ...overall,
      commonDefects
    };
  }

  /**
   * Generate production floor alerts
   */
  generateProductionAlerts(baseMetrics, stationMetrics, lineMetrics, qualityMetrics) {
    const alerts = [];
    
    // Station alerts
    stationMetrics.forEach(station => {
      if (station.errorCount > 5) {
        alerts.push({
          type: 'STATION_ERROR',
          level: 'warning',
          message: `Station ${station.stationId} has ${station.errorCount} errors`,
          stationId: station.stationId,
          timestamp: new Date().toISOString()
        });
      }
      
      if (station.uptime > 300) { // 5 minutes idle
        alerts.push({
          type: 'STATION_IDLE',
          level: 'info',
          message: `Station ${station.stationId} has been idle for ${Math.floor(station.uptime / 60)} minutes`,
          stationId: station.stationId,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Line alerts
    lineMetrics.forEach(line => {
      if (line.throughputEfficiency < 80) {
        alerts.push({
          type: 'LOW_THROUGHPUT',
          level: 'warning',
          message: `Line ${line.lineNumber} throughput is ${line.throughputEfficiency}% of target`,
          lineNumber: line.lineNumber,
          throughputEfficiency: line.throughputEfficiency,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Quality alerts
    if (qualityMetrics.passRate && parseFloat(qualityMetrics.passRate) < 95) {
      alerts.push({
        type: 'QUALITY_ISSUE',
        level: 'critical',
        message: `Quality pass rate is ${qualityMetrics.passRate}, below 95% threshold`,
        passRate: qualityMetrics.passRate,
        timestamp: new Date().toISOString()
      });
    }
    
    // System alerts
    if (baseMetrics.barcode.successRate && parseFloat(baseMetrics.barcode.successRate) < 90) {
      alerts.push({
        type: 'SYSTEM_ISSUE',
        level: 'critical',
        message: `Barcode success rate is ${baseMetrics.barcode.successRate}, below 90% threshold`,
        successRate: baseMetrics.barcode.successRate,
        timestamp: new Date().toISOString()
      });
    }
    
    return alerts;
  }

  /**
   * Calculate production efficiency metrics
   */
  calculateProductionEfficiency(lineMetrics, baseMetrics) {
    let totalEfficiency = 0;
    let lineCount = 0;
    
    lineMetrics.forEach(line => {
      if (line.efficiency) {
        totalEfficiency += parseFloat(line.efficiency);
        lineCount++;
      }
    });
    
    const overallEfficiency = lineCount > 0 ? (totalEfficiency / lineCount).toFixed(2) : 0;
    
    return {
      overallEfficiency: overallEfficiency + '%',
      lineEfficiencies: lineMetrics.map(line => ({
        lineNumber: line.lineNumber,
        efficiency: line.efficiency + '%',
        throughputEfficiency: line.throughputEfficiency + '%'
      })),
      targetEfficiency: 95, // Target 95% efficiency
      status: parseFloat(overallEfficiency) >= 95 ? 'excellent' : 
              parseFloat(overallEfficiency) >= 85 ? 'good' : 
              parseFloat(overallEfficiency) >= 75 ? 'fair' : 'poor'
    };
  }

  /**
   * Calculate station utilization
   */
  calculateStationUtilization(stationMetrics) {
    const totalStations = stationMetrics.length;
    const activeStations = stationMetrics.filter(s => s.currentStatus === 'active').length;
    const idleStations = stationMetrics.filter(s => s.currentStatus === 'idle').length;
    
    return {
      total: totalStations,
      active: activeStations,
      idle: idleStations,
      utilization: totalStations > 0 ? ((activeStations / totalStations) * 100).toFixed(2) + '%' : '0%'
    };
  }

  /**
   * Get station error breakdown
   */
  getStationErrorBreakdown(stationMetrics) {
    return stationMetrics
      .filter(s => s.errorCount > 0)
      .map(s => ({
        stationId: s.stationId,
        lineNumber: s.lineNumber,
        errorCount: s.errorCount,
        errorRate: s.errorRate
      }))
      .sort((a, b) => b.errorCount - a.errorCount);
  }

  /**
   * Get recent panels for a specific line
   */
  getRecentPanelsForLine(lineNumber, since) {
    // This would typically query the database
    // For now, return empty array as placeholder
    return [];
  }

  /**
   * Get production status
   */
  getProductionStatus(baseMetrics, stationMetrics, lineMetrics) {
    const activeStations = stationMetrics.filter(s => s.currentStatus === 'active').length;
    const totalStations = stationMetrics.length;
    const stationUtilization = (activeStations / totalStations) * 100;
    
    if (stationUtilization >= 90) return 'optimal';
    if (stationUtilization >= 70) return 'good';
    if (stationUtilization >= 50) return 'fair';
    if (stationUtilization >= 30) return 'poor';
    return 'critical';
  }

  /**
   * Update station metrics
   */
  updateStationMetrics(stationId, eventData) {
    const station = this.stationMetrics.get(stationId);
    if (!station) return;
    
    const { success, processingTime, errorCode } = eventData;
    
    station.totalScans++;
    station.lastActivity = new Date().toISOString();
    station.currentStatus = 'active';
    
    if (success) {
      station.successfulScans++;
      // Update average processing time
      if (processingTime) {
        const totalTime = station.averageProcessingTime * (station.successfulScans - 1) + processingTime;
        station.averageProcessingTime = totalTime / station.successfulScans;
      }
    } else {
      station.failedScans++;
      station.errorCount++;
    }
    
    // Reset uptime
    station.uptime = 0;
  }

  /**
   * Update line metrics
   */
  updateLineMetrics(lineNumber, eventData) {
    const line = this.lineMetrics.get(lineNumber);
    if (!line) return;
    
    const { panelCreated, panelCompleted, panelFailed } = eventData;
    
    if (panelCreated) line.totalPanels++;
    if (panelCompleted) line.completedPanels++;
    if (panelFailed) line.failedPanels++;
    
    line.lastUpdated = new Date().toISOString();
  }

  /**
   * Update quality metrics
   */
  updateQualityMetrics(eventData) {
    const overall = this.qualityMetrics.get('overall');
    const { passed, failed, defect } = eventData;
    
    if (passed) {
      overall.totalInspections++;
      overall.passedInspections++;
    }
    
    if (failed) {
      overall.totalInspections++;
      overall.failedInspections++;
      
      if (defect) {
        const currentCount = overall.commonDefects.get(defect) || 0;
        overall.commonDefects.set(defect, currentCount + 1);
      }
    }
    
    // Update quality trend
    if (overall.totalInspections > 10) {
      const recentPassRate = (overall.passedInspections / overall.totalInspections) * 100;
      overall.qualityTrend = recentPassRate > 95 ? 'improving' : 
                             recentPassRate < 90 ? 'declining' : 'stable';
    }
  }
}

// Export singleton instance
export const enhancedMonitoring = new EnhancedMonitoringService();

export default enhancedMonitoring;
