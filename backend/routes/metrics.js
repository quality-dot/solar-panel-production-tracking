// Metrics and Monitoring API Routes
// Real-time monitoring endpoints for barcode processing and manufacturing operations

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { successResponse, errorResponse } from '../utils/responseUtils.js';
import { 
  metricsService, 
  MetricsServiceError 
} from '../services/metricsService.js';
import { enhancedMonitoring } from '../services/enhancedMonitoringService.js';
import { generateProductionDashboard } from '../utils/dashboardGenerator.js';

const router = express.Router();

/**
 * GET /api/v1/metrics/realtime
 * Get real-time metrics summary
 */
router.get('/realtime', asyncHandler(async (req, res) => {
  try {
    const metrics = metricsService.getRealTimeMetrics();
    
    res.json(successResponse(metrics, 'Real-time metrics retrieved successfully'));
    
  } catch (error) {
    if (error instanceof MetricsServiceError) {
      res.status(500).json(errorResponse(
        error.message,
        error.code,
        error.details
      ));
    } else {
      throw error;
    }
  }
}));

/**
 * GET /api/v1/metrics/errors
 * Get error analysis and patterns
 */
router.get('/errors', asyncHandler(async (req, res) => {
  try {
    const errorAnalysis = metricsService.getErrorAnalysis();
    
    res.json(successResponse(errorAnalysis, 'Error analysis retrieved successfully'));
    
  } catch (error) {
    if (error instanceof MetricsServiceError) {
      res.status(500).json(errorResponse(
        error.message,
        error.code,
        error.details
      ));
    } else {
      throw error;
    }
  }
}));

/**
 * GET /api/v1/metrics/performance
 * Get performance statistics for specified time range
 */
router.get('/performance', asyncHandler(async (req, res) => {
  const { timeRange = '1h' } = req.query;
  
  // Validate time range
  const validRanges = ['15m', '1h', '4h', '24h'];
  if (!validRanges.includes(timeRange)) {
    return res.status(400).json(errorResponse(
      `Invalid time range. Valid ranges: ${validRanges.join(', ')}`,
      'INVALID_TIME_RANGE',
      { provided: timeRange, valid: validRanges }
    ));
  }
  
  try {
    const performanceStats = await metricsService.getPerformanceStats(timeRange);
    
    res.json(successResponse(performanceStats, `Performance statistics for ${timeRange} retrieved successfully`));
    
  } catch (error) {
    if (error instanceof MetricsServiceError) {
      res.status(500).json(errorResponse(
        error.message,
        error.code,
        error.details
      ));
    } else {
      throw error;
    }
  }
}));

/**
 * GET /api/v1/metrics/dashboard
 * Get comprehensive dashboard data optimized for production floor display
 */
router.get('/dashboard', asyncHandler(async (req, res) => {
  try {
    const dashboardData = await metricsService.getProductionDashboard();
    
    res.json(successResponse(dashboardData, 'Production dashboard data retrieved successfully'));
    
  } catch (error) {
    if (error instanceof MetricsServiceError) {
      res.status(500).json(errorResponse(
        error.message,
        error.code,
        error.details
      ));
    } else {
      throw error;
    }
  }
}));

/**
 * POST /api/v1/metrics/record/barcode
 * Record a barcode processing event (internal use)
 */
router.post('/record/barcode', asyncHandler(async (req, res) => {
  const eventData = req.body;
  
  // Validate required fields
  const requiredFields = ['barcode', 'success'];
  const missingFields = requiredFields.filter(field => !(field in eventData));
  
  if (missingFields.length > 0) {
    return res.status(400).json(errorResponse(
      `Missing required fields: ${missingFields.join(', ')}`,
      'MISSING_FIELDS',
      { missingFields }
    ));
  }
  
  try {
    const event = metricsService.recordBarcodeEvent(eventData);
    
    res.status(201).json(successResponse(event, 'Barcode event recorded successfully'));
    
  } catch (error) {
    if (error instanceof MetricsServiceError) {
      res.status(400).json(errorResponse(
        error.message,
        error.code,
        error.details
      ));
    } else {
      throw error;
    }
  }
}));

/**
 * POST /api/v1/metrics/record/panel
 * Record a panel creation event (internal use)
 */
router.post('/record/panel', asyncHandler(async (req, res) => {
  const eventData = req.body;
  
  // Validate required fields
  const requiredFields = ['panelId', 'barcode'];
  const missingFields = requiredFields.filter(field => !(field in eventData));
  
  if (missingFields.length > 0) {
    return res.status(400).json(errorResponse(
      `Missing required fields: ${missingFields.join(', ')}`,
      'MISSING_FIELDS',
      { missingFields }
    ));
  }
  
  try {
    const event = metricsService.recordPanelEvent(eventData);
    
    res.status(201).json(successResponse(event, 'Panel event recorded successfully'));
    
  } catch (error) {
    if (error instanceof MetricsServiceError) {
      res.status(400).json(errorResponse(
        error.message,
        error.code,
        error.details
      ));
    } else {
      throw error;
    }
  }
}));

/**
 * POST /api/v1/metrics/record/mo
 * Record a manufacturing order event (internal use)
 */
router.post('/record/mo', asyncHandler(async (req, res) => {
  const eventData = req.body;
  
  // Validate required fields
  const requiredFields = ['moId', 'eventType'];
  const missingFields = requiredFields.filter(field => !(field in eventData));
  
  if (missingFields.length > 0) {
    return res.status(400).json(errorResponse(
      `Missing required fields: ${missingFields.join(', ')}`,
      'MISSING_FIELDS',
      { missingFields }
    ));
  }
  
  // Validate event type
  const validEventTypes = ['created', 'progress_updated', 'completed', 'barcode_validated'];
  if (!validEventTypes.includes(eventData.eventType)) {
    return res.status(400).json(errorResponse(
      `Invalid event type. Valid types: ${validEventTypes.join(', ')}`,
      'INVALID_EVENT_TYPE',
      { provided: eventData.eventType, valid: validEventTypes }
    ));
  }
  
  try {
    const event = metricsService.recordMOEvent(eventData);
    
    res.status(201).json(successResponse(event, 'MO event recorded successfully'));
    
  } catch (error) {
    if (error instanceof MetricsServiceError) {
      res.status(400).json(errorResponse(
        error.message,
        error.code,
        error.details
      ));
    } else {
      throw error;
    }
  }
}));

/**
 * GET /api/v1/metrics/alerts
 * Get system alerts and warnings
 */
router.get('/alerts', asyncHandler(async (req, res) => {
  try {
    const realTimeMetrics = metricsService.getRealTimeMetrics();
    const errorAnalysis = metricsService.getErrorAnalysis();
    const performanceStats = await metricsService.getPerformanceStats('1h');
    
    const alerts = metricsService.generateAlerts(realTimeMetrics, errorAnalysis, performanceStats);
    
    const response = {
      alerts,
      alertSummary: {
        total: alerts.length,
        byLevel: {
          error: alerts.filter(a => a.level === 'error').length,
          warning: alerts.filter(a => a.level === 'warning').length,
          info: alerts.filter(a => a.level === 'info').length
        }
      },
      generatedAt: new Date().toISOString()
    };
    
    res.json(successResponse(response, 'System alerts retrieved successfully'));
    
  } catch (error) {
    if (error instanceof MetricsServiceError) {
      res.status(500).json(errorResponse(
        error.message,
        error.code,
        error.details
      ));
    } else {
      throw error;
    }
  }
}));

/**
 * GET /api/v1/metrics/health
 * Get system health status
 */
router.get('/health', asyncHandler(async (req, res) => {
  try {
    const realTimeMetrics = metricsService.getRealTimeMetrics();
    const errorAnalysis = metricsService.getErrorAnalysis();
    const performanceStats = await metricsService.getPerformanceStats('15m');
    
    const systemStatus = metricsService.getSystemStatus(realTimeMetrics, errorAnalysis);
    
    const healthData = {
      status: systemStatus,
      uptime: realTimeMetrics.session.uptime.formatted,
      metrics: {
        totalScans: realTimeMetrics.barcode.totalScans,
        successRate: realTimeMetrics.barcode.successRate,
        errorCount: errorAnalysis.summary.totalErrors,
        averageProcessingTime: performanceStats.performance.averageProcessingTime
      },
      timestamp: new Date().toISOString()
    };
    
    // Set appropriate HTTP status based on system status
    const statusCode = systemStatus === 'critical' ? 503 : 
                      systemStatus === 'warning' ? 200 : 200;
    
    res.status(statusCode).json(successResponse(healthData, `System health: ${systemStatus}`));
    
  } catch (error) {
    res.status(503).json(errorResponse(
      'Health check failed',
      'HEALTH_CHECK_FAILED',
      { originalError: error.message }
    ));
  }
}));

/**
 * GET /api/v1/metrics/lines
 * Get line-specific metrics and performance
 */
router.get('/lines', asyncHandler(async (req, res) => {
  try {
    const lineMetrics = await metricsService.getLineMetrics();
    
    res.json(successResponse(lineMetrics, 'Line metrics retrieved successfully'));
    
  } catch (error) {
    if (error instanceof MetricsServiceError) {
      res.status(500).json(errorResponse(
        error.message,
        error.code,
        error.details
      ));
    } else {
      throw error;
    }
  }
}));

/**
 * POST /api/v1/metrics/reset
 * Reset metrics collection (development/testing only)
 */
router.post('/reset', asyncHandler(async (req, res) => {
  // Only allow in development environment
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json(errorResponse(
      'Metrics reset not allowed in production',
      'RESET_FORBIDDEN'
    ));
  }
  
  try {
    const result = metricsService.resetMetrics();
    
    res.json(successResponse(result, 'Metrics reset successfully'));
    
  } catch (error) {
    if (error instanceof MetricsServiceError) {
      res.status(500).json(errorResponse(
        error.message,
        error.code,
        error.details
      ));
    } else {
      throw error;
    }
  }
}));

/**
 * GET /api/v1/metrics/dashboard-html
 * Get production dashboard as HTML page for display screens
 */
router.get('/dashboard-html', asyncHandler(async (req, res) => {
  try {
    const dashboardData = await metricsService.getProductionDashboard();
    const htmlDashboard = generateProductionDashboard(dashboardData);
    
    res.setHeader('Content-Type', 'text/html');
    res.send(htmlDashboard);
    
  } catch (error) {
    if (error instanceof MetricsServiceError) {
      res.status(500).send(`
        <html>
          <body style="background: #1a1a1a; color: white; font-family: Arial; padding: 40px; text-align: center;">
            <h1>🚨 Dashboard Error</h1>
            <p>Unable to load production dashboard: ${error.message}</p>
            <button onclick="location.reload()" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
              🔄 Retry
            </button>
          </body>
        </html>
      `);
    } else {
      throw error;
    }
  }
}));

/**
 * GET /api/v1/metrics/export
 * Export metrics data for analysis (CSV format)
 */
router.get('/export', asyncHandler(async (req, res) => {
  const { format = 'json', timeRange = '24h' } = req.query;
  
  if (!['json', 'csv'].includes(format)) {
    return res.status(400).json(errorResponse(
      'Invalid format. Supported formats: json, csv',
      'INVALID_FORMAT'
    ));
  }
  
  try {
    const performanceStats = await metricsService.getPerformanceStats(timeRange);
    const errorAnalysis = metricsService.getErrorAnalysis();
    const realTimeMetrics = metricsService.getRealTimeMetrics();
    
    const exportData = {
      exportInfo: {
        generatedAt: new Date().toISOString(),
        timeRange,
        format
      },
      realTimeMetrics,
      performanceStats,
      errorAnalysis
    };
    
    if (format === 'csv') {
      // Convert to CSV format
      const csvData = convertToCSV(exportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=metrics-export-${Date.now()}.csv`);
      res.send(csvData);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=metrics-export-${Date.now()}.json`);
      res.json(exportData);
    }
    
  } catch (error) {
    if (error instanceof MetricsServiceError) {
      res.status(500).json(errorResponse(
        error.message,
        error.code,
        error.details
      ));
    } else {
      throw error;
    }
  }
}));

/**
 * Helper function to convert metrics data to CSV format
 */
function convertToCSV(data) {
  const rows = [];
  
  // Add headers
  rows.push([
    'Timestamp',
    'Metric Type',
    'Metric Name', 
    'Value',
    'Unit',
    'Additional Info'
  ]);
  
  const timestamp = data.exportInfo.generatedAt;
  
  // Real-time metrics
  rows.push([timestamp, 'RealTime', 'Total Scans', data.realTimeMetrics.barcode.totalScans, 'count', '']);
  rows.push([timestamp, 'RealTime', 'Success Rate', data.realTimeMetrics.barcode.successRate, 'percentage', '']);
  rows.push([timestamp, 'RealTime', 'Scans Per Minute', data.realTimeMetrics.barcode.scansPerMinute, 'rate', '']);
  
  // Performance stats
  if (data.performanceStats.performance.averageProcessingTime) {
    rows.push([timestamp, 'Performance', 'Average Processing Time', data.performanceStats.performance.averageProcessingTime, 'milliseconds', '']);
  }
  
  // Error patterns
  data.errorAnalysis.patterns.forEach(pattern => {
    rows.push([timestamp, 'Error', pattern.errorCode, pattern.count, 'count', pattern.trend]);
  });
  
  // Convert to CSV string
  return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

// ENHANCED MONITORING ENDPOINTS

/**
 * GET /api/v1/metrics/production-floor
 * Get comprehensive production floor dashboard with real-time station and line monitoring
 */
router.get('/production-floor', asyncHandler(async (req, res) => {
  try {
    const dashboardData = await enhancedMonitoring.getProductionFloorDashboard();
    
    res.json(successResponse(dashboardData, 'Production floor dashboard retrieved successfully'));
    
  } catch (error) {
    if (error instanceof MetricsServiceError) {
      res.status(500).json(errorResponse(
        error.message,
        error.code,
        error.details
      ));
    } else {
      throw error;
    }
  }
}));

/**
 * GET /api/v1/metrics/stations
 * Get real-time station metrics for all 8 production stations
 */
router.get('/stations', asyncHandler(async (req, res) => {
  try {
    const stationMetrics = enhancedMonitoring.getStationMetrics();
    
    res.json(successResponse(stationMetrics, 'Station metrics retrieved successfully'));
    
  } catch (error) {
    if (error instanceof MetricsServiceError) {
      res.status(500).json(errorResponse(
        error.message,
        error.code,
        error.details
      ));
    } else {
      throw error;
    }
  }
}));

/**
 * GET /api/v1/metrics/lines
 * Get real-time line metrics for production lines 1 and 2
 */
router.get('/lines', asyncHandler(async (req, res) => {
  try {
    const lineMetrics = enhancedMonitoring.getLineMetrics();
    
    res.json(successResponse(lineMetrics, 'Line metrics retrieved successfully'));
    
  } catch (error) {
    if (error instanceof MetricsServiceError) {
      res.status(500).json(errorResponse(
        error.message,
        error.code,
        error.details
      ));
    } else {
      throw error;
    }
  }
}));

/**
 * GET /api/v1/metrics/quality
 * Get quality metrics and defect analysis
 */
router.get('/quality', asyncHandler(async (req, res) => {
  try {
    const qualityMetrics = enhancedMonitoring.getQualityMetrics();
    
    res.json(successResponse(qualityMetrics, 'Quality metrics retrieved successfully'));
    
  } catch (error) {
    if (error instanceof MetricsServiceError) {
      res.status(500).json(errorResponse(
        error.message,
        error.code,
        error.details
      ));
    } else {
      throw error;
    }
  }
}));

/**
 * GET /api/v1/metrics/efficiency
 * Get production efficiency metrics and analysis
 */
router.get('/efficiency', asyncHandler(async (req, res) => {
  try {
    const lineMetrics = enhancedMonitoring.getLineMetrics();
    const baseMetrics = metricsService.getRealTimeMetrics();
    const efficiencyMetrics = enhancedMonitoring.calculateProductionEfficiency(lineMetrics, baseMetrics);
    
    res.json(successResponse(efficiencyMetrics, 'Production efficiency metrics retrieved successfully'));
    
  } catch (error) {
    if (error instanceof MetricsServiceError) {
      res.status(500).json(errorResponse(
        error.message,
        error.code,
        error.details
      ));
    } else {
      throw error;
    }
  }
}));

/**
 * GET /api/v1/metrics/alerts/production
 * Get production floor specific alerts and notifications
 */
router.get('/alerts/production', asyncHandler(async (req, res) => {
  try {
    const baseMetrics = metricsService.getRealTimeMetrics();
    const stationMetrics = enhancedMonitoring.getStationMetrics();
    const lineMetrics = enhancedMonitoring.getLineMetrics();
    const qualityMetrics = enhancedMonitoring.getQualityMetrics();
    
    const alerts = enhancedMonitoring.generateProductionAlerts(
      baseMetrics, 
      stationMetrics, 
      lineMetrics, 
      qualityMetrics
    );
    
    res.json(successResponse(alerts, 'Production alerts retrieved successfully'));
    
  } catch (error) {
    if (error instanceof MetricsServiceError) {
      res.status(500).json(errorResponse(
        error.message,
        error.code,
        error.details
      ));
    } else {
      throw error;
    }
  }
}));

/**
 * POST /api/v1/metrics/update/station
 * Update station metrics (called by barcode processing)
 */
router.post('/update/station', asyncHandler(async (req, res) => {
  const { stationId, eventData } = req.body;
  
  if (!stationId || !eventData) {
    return res.status(400).json(errorResponse(
      'Station ID and event data are required',
      'MISSING_REQUIRED_FIELDS'
    ));
  }
  
  try {
    enhancedMonitoring.updateStationMetrics(stationId, eventData);
    
    res.json(successResponse({ 
      stationId, 
      updated: true 
    }, 'Station metrics updated successfully'));
    
  } catch (error) {
    if (error instanceof MetricsServiceError) {
      res.status(500).json(errorResponse(
        error.message,
        error.code,
        error.details
      ));
    } else {
      throw error;
    }
  }
}));

/**
 * POST /api/v1/metrics/update/line
 * Update line metrics (called by panel processing)
 */
router.post('/update/line', asyncHandler(async (req, res) => {
  const { lineNumber, eventData } = req.body;
  
  if (!lineNumber || !eventData) {
    return res.status(400).json(errorResponse(
      'Line number and event data are required',
      'MISSING_REQUIRED_FIELDS'
    ));
  }
  
  try {
    enhancedMonitoring.updateLineMetrics(lineNumber, eventData);
    
    res.json(successResponse({ 
      lineNumber, 
      updated: true 
    }, 'Line metrics updated successfully'));
    
  } catch (error) {
    if (error instanceof MetricsServiceError) {
      res.status(500).json(errorResponse(
        error.message,
        error.code,
        error.details
      ));
    } else {
      throw error;
    }
  }
}));

/**
 * POST /api/v1/metrics/update/quality
 * Update quality metrics (called by inspection processes)
 */
router.post('/update/quality', asyncHandler(async (req, res) => {
  const { eventData } = req.body;
  
  if (!eventData) {
    return res.status(400).json(errorResponse(
      'Event data is required',
      'MISSING_REQUIRED_FIELDS'
    ));
  }
  
  try {
    enhancedMonitoring.updateQualityMetrics(eventData);
    
    res.json(successResponse({ 
      updated: true 
    }, 'Quality metrics updated successfully'));
    
  } catch (error) {
    if (error instanceof MetricsServiceError) {
      res.status(500).json(errorResponse(
        error.message,
        error.code,
        error.details
      ));
    } else {
      throw error;
    }
  }
}));

export default router;
