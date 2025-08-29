// Performance Monitoring Routes
// Manufacturing-optimized performance monitoring and analytics endpoints

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import performanceMonitoringController from '../controllers/auth/performanceMonitoringController.js';
import { 
  enhancedAuthenticateJWT, 
  enhancedAuthorizeRole, 
  trackSessionActivity,
  createRateLimiter
} from '../middleware/enhancedAuth.js';

const router = express.Router();

// Rate limiting for monitoring endpoints (higher limit for monitoring)
const monitoringRateLimiter = createRateLimiter(15 * 60 * 1000, 50); // 50 attempts per 15 minutes

/**
 * @route   GET /api/v1/auth/monitoring/dashboard
 * @desc    Get real-time performance dashboard data
 * @access  Private (Admin/QC Manager)
 * @headers Authorization: Bearer <token>
 */
router.get('/dashboard',
  enhancedAuthenticateJWT,
  enhancedAuthorizeRole(['SYSTEM_ADMIN', 'QC_MANAGER']),
  trackSessionActivity,
  monitoringRateLimiter,
  asyncHandler(performanceMonitoringController.getPerformanceDashboard)
);

/**
 * @route   GET /api/v1/auth/monitoring/metrics
 * @desc    Get detailed performance metrics with filtering
 * @access  Private (Admin/QC Manager)
 * @headers Authorization: Bearer <token>
 * @query   windowMinutes - Monitoring window in minutes (15, 30, 60, 120, 240)
 * @query   operation - Specific operation to filter (optional)
 */
router.get('/metrics',
  enhancedAuthenticateJWT,
  enhancedAuthorizeRole(['SYSTEM_ADMIN', 'QC_MANAGER']),
  trackSessionActivity,
  monitoringRateLimiter,
  asyncHandler(performanceMonitoringController.getDetailedMetrics)
);

/**
 * @route   GET /api/v1/auth/monitoring/alerts
 * @desc    Get recent alerts with filtering and pagination
 * @access  Private (Admin/QC Manager)
 * @headers Authorization: Bearer <token>
 * @query   limit - Number of alerts to return (1-200, default: 50)
 * @query   level - Filter by alert level (critical, warning, info)
 * @query   category - Filter by alert category (security, performance, rate_limiting)
 * @query   acknowledged - Filter by acknowledgment status (true, false)
 */
router.get('/alerts',
  enhancedAuthenticateJWT,
  enhancedAuthorizeRole(['SYSTEM_ADMIN', 'QC_MANAGER']),
  trackSessionActivity,
  monitoringRateLimiter,
  asyncHandler(performanceMonitoringController.getRecentAlerts)
);

/**
 * @route   POST /api/v1/auth/monitoring/alerts/:alertId/acknowledge
 * @desc    Acknowledge an alert to mark it as reviewed
 * @access  Private (Admin/QC Manager)
 * @headers Authorization: Bearer <token>
 * @param   alertId - ID of the alert to acknowledge
 */
router.post('/alerts/:alertId/acknowledge',
  enhancedAuthenticateJWT,
  enhancedAuthorizeRole(['SYSTEM_ADMIN', 'QC_MANAGER']),
  trackSessionActivity,
  monitoringRateLimiter,
  asyncHandler(performanceMonitoringController.acknowledgeAlert)
);

/**
 * @route   GET /api/v1/auth/monitoring/trends
 * @desc    Get performance trends analysis with insights
 * @access  Private (Admin/QC Manager)
 * @headers Authorization: Bearer <token>
 * @query   windowMinutes - Trend analysis window (30, 60, 120, 240, 480 minutes)
 * @query   operation - Specific operation to analyze (optional)
 */
router.get('/trends',
  enhancedAuthenticateJWT,
  enhancedAuthorizeRole(['SYSTEM_ADMIN', 'QC_MANAGER']),
  trackSessionActivity,
  monitoringRateLimiter,
  asyncHandler(performanceMonitoringController.getPerformanceTrends)
);

/**
 * @route   POST /api/v1/auth/monitoring/metrics/reset
 * @desc    Reset performance metrics (admin only)
 * @access  Private (Admin only)
 * @headers Authorization: Bearer <token>
 */
router.post('/metrics/reset',
  enhancedAuthenticateJWT,
  enhancedAuthorizeRole(['SYSTEM_ADMIN']),
  trackSessionActivity,
  monitoringRateLimiter,
  asyncHandler(performanceMonitoringController.resetPerformanceMetrics)
);

/**
 * @route   GET /api/v1/auth/monitoring/health
 * @desc    Get comprehensive system health status
 * @access  Private (Admin/QC Manager)
 * @headers Authorization: Bearer <token>
 */
router.get('/health',
  enhancedAuthenticateJWT,
  enhancedAuthorizeRole(['SYSTEM_ADMIN', 'QC_MANAGER']),
  trackSessionActivity,
  monitoringRateLimiter,
  asyncHandler(performanceMonitoringController.getSystemHealth)
);

/**
 * @route   GET /api/v1/auth/monitoring/overview
 * @desc    Get quick overview of system status (public health check)
 * @access  Public
 */
router.get('/overview', async (req, res) => {
  try {
    // Import services for quick health check
    const { checkRedisHealth } = await import('../config/redis.js');
    const { authPerformanceMonitor } = await import('../services/authPerformanceMonitor.js');
    
    const [redisHealth, performanceMetrics] = await Promise.all([
      checkRedisHealth(),
      authPerformanceMonitor.getPerformanceMetrics()
    ]);
    
    // Determine overall status
    let status = 'healthy';
    if (redisHealth.status !== 'healthy') {
      status = 'degraded';
    } else if (performanceMetrics?.successRate < 0.8) {
      status = 'warning';
    }
    
    res.status(200).json({
      status,
      timestamp: new Date().toISOString(),
      services: {
        redis: redisHealth.status,
        performanceMonitoring: 'operational'
      },
      summary: {
        successRate: performanceMetrics?.successRate || '0.000',
        activeSessions: performanceMetrics?.metrics?.sessionCreations || 0,
        lastUpdate: new Date().toISOString()
      },
      version: '2.2.0',
      features: [
        'Real-time performance monitoring',
        'Comprehensive alerting system',
        'Performance trend analysis',
        'System health monitoring',
        'Automated recommendations'
      ]
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      services: {
        redis: 'unknown',
        performanceMonitoring: 'error'
      }
    });
  }
});

/**
 * @route   GET /api/v1/auth/monitoring/features
 * @desc    Get available monitoring features and capabilities
 * @access  Public
 */
router.get('/features', (req, res) => {
  res.status(200).json({
    features: {
      realTimeMonitoring: {
        performanceMetrics: true,
        sessionTracking: true,
        securityEvents: true,
        rateLimiting: true
      },
      alerting: {
        performanceAlerts: true,
        securityAlerts: true,
        rateLimitAlerts: true,
        acknowledgment: true
      },
      analytics: {
        trendAnalysis: true,
        performanceInsights: true,
        recommendations: true,
        historicalData: true
      },
      dashboard: {
        realTimeMetrics: true,
        alertOverview: true,
        systemHealth: true,
        performanceTrends: true
      }
    },
    thresholds: {
      loginResponseTime: '1000ms',
      tokenRotationTime: '500ms',
      sessionCreationTime: '300ms',
      highFailureRate: '20%',
      highResponseTime: '2000ms'
    },
    monitoringWindows: {
      short: [15, 30], // minutes
      medium: [60, 120], // minutes
      long: [240, 480] // minutes
    },
    version: '2.2.0',
    timestamp: new Date().toISOString()
  });
});

/**
 * @route   POST /api/v1/auth/monitoring/test
 * @desc    Test monitoring system functionality (development only)
 * @access  Public (development)
 */
router.post('/test', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      error: 'Monitoring testing disabled in production',
      message: 'This endpoint is only available in development mode'
    });
  }

  try {
    const { authPerformanceMonitor } = await import('../services/authPerformanceMonitor.js');
    
    // Test performance monitoring
    const testMetrics = await authPerformanceMonitor.getPerformanceMetrics();
    const testAlerts = await authPerformanceMonitor.getRecentAlerts(5);
    const testTrends = await authPerformanceMonitor.getPerformanceTrends(30);
    
    res.status(200).json({
      message: 'Performance monitoring test completed',
      timestamp: new Date().toISOString(),
      tests: {
        metricsCollection: {
          success: !!testMetrics,
          dataPoints: testMetrics ? Object.keys(testMetrics).length : 0
        },
        alertSystem: {
          success: Array.isArray(testAlerts),
          alertCount: testAlerts ? testAlerts.length : 0
        },
        trendAnalysis: {
          success: !!testTrends,
          trendData: testTrends ? Object.keys(testTrends.trends || {}).length : 0
        }
      },
      systemStatus: {
        monitoring: 'operational',
        redis: 'connected',
        performance: 'tracking'
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Monitoring test failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/v1/auth/monitoring/status
 * @desc    Get current monitoring system status
 * @access  Public
 */
router.get('/status', async (req, res) => {
  try {
    const { authPerformanceMonitor } = await import('../services/authPerformanceMonitor.js');
    
    const metrics = await authPerformanceMonitor.getPerformanceMetrics();
    const alerts = await authPerformanceMonitor.getRecentAlerts(10);
    
    const criticalAlerts = alerts.filter(a => a.level === 'critical');
    const warningAlerts = alerts.filter(a => a.level === 'warning');
    
    let status = 'operational';
    if (criticalAlerts.length > 0) {
      status = 'critical';
    } else if (warningAlerts.length > 2) {
      status = 'warning';
    }
    
    res.status(200).json({
      status,
      timestamp: new Date().toISOString(),
      monitoring: {
        metricsCollection: 'active',
        alertSystem: 'operational',
        trendAnalysis: 'active'
      },
      currentMetrics: {
        totalOperations: metrics?.metrics?.loginAttempts || 0,
        successRate: metrics?.successRate || '0.000',
        activeAlerts: alerts.length,
        criticalAlerts: criticalAlerts.length
      },
      uptime: process.uptime(),
      version: '2.2.0'
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Status check failed',
      monitoring: 'inactive'
    });
  }
});

export default router;
