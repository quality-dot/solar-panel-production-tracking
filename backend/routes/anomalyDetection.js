// Anomaly Detection and Security Intelligence Routes
// Manufacturing-optimized threat detection API endpoints

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import anomalyDetectionController from '../controllers/auth/anomalyDetectionController.js';
import {
  enhancedAuthenticateJWT,
  enhancedAuthorizeRoles
} from '../middleware/enhancedAuth.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public endpoints (no authentication required)
router.get('/overview', asyncHandler(async (req, res) => {
  return res.json({
    system: 'Anomaly Detection and Security Intelligence System',
    version: '2.2.0',
    description: 'Advanced threat detection and behavioral analysis for authentication systems',
    endpoints: {
      public: [
        'GET /overview - System overview and capabilities',
        'GET /status - Current system status',
        'GET /capabilities - Detection capabilities and features',
        'GET /health - Basic health check'
      ],
      protected: [
        'POST /analyze - Analyze authentication attempt for anomalies',
        'GET /statistics - Get anomaly statistics',
        'GET /history/:userId - Get user anomaly history',
        'GET /dashboard - Anomaly detection dashboard',
        'GET /threat-feed - Real-time threat feed',
        'GET /config - Anomaly detection configuration',
        'GET /intelligence/status - Security intelligence status',
        'POST /intelligence/update - Update threat intelligence',
        'POST /test - Test anomaly detection system'
      ]
    },
    capabilities: [
      'Real-time authentication anomaly detection',
      'Behavioral pattern analysis',
      'Geographic anomaly detection',
      'Device fingerprinting analysis',
      'Threat intelligence integration',
      'Rate limiting analysis',
      'Timing pattern analysis',
      'Risk scoring and threat level assessment',
      'Automated recommendations',
      'Security event logging'
    ]
  });
}));

router.get('/status', asyncHandler(async (req, res) => {
  return res.json({
    status: 'operational',
    timestamp: new Date().toISOString(),
    system: 'Anomaly Detection and Security Intelligence',
    services: [
      'Authentication anomaly detection',
      'Behavioral pattern analysis',
      'Geographic anomaly detection',
      'Device anomaly detection',
      'Threat intelligence',
      'Rate limiting analysis',
      'Timing anomaly detection',
      'Security event logging'
    ]
  });
}));

router.get('/capabilities', 
  rateLimiter({ windowMs: 60 * 1000, max: 30 }), // 30 requests per minute
  asyncHandler(anomalyDetectionController.getCapabilities.bind(anomalyDetectionController))
);

router.get('/health', asyncHandler(async (req, res) => {
  // Basic health check - just verify the service is running
  return res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'Anomaly detection and security intelligence service is operational'
  });
}));

// Protected endpoints (require authentication)
router.use(enhancedAuthenticateJWT);

// Analyze authentication attempt for anomalies
router.post('/analyze', 
  rateLimiter({ windowMs: 60 * 1000, max: 100 }), // 100 requests per minute
  asyncHandler(anomalyDetectionController.analyzeAuthentication.bind(anomalyDetectionController))
);

// Get anomaly statistics
router.get('/statistics', 
  rateLimiter({ windowMs: 60 * 1000, max: 60 }), // 60 requests per minute
  asyncHandler(anomalyDetectionController.getAnomalyStatistics.bind(anomalyDetectionController))
);

// Get user anomaly history
router.get('/history/:userId', 
  rateLimiter({ windowMs: 60 * 1000, max: 30 }), // 30 requests per minute
  asyncHandler(anomalyDetectionController.getUserAnomalyHistory.bind(anomalyDetectionController))
);

// Get anomaly detection configuration
router.get('/config', 
  rateLimiter({ windowMs: 60 * 1000, max: 20 }), // 20 requests per minute
  asyncHandler(anomalyDetectionController.getAnomalyConfig.bind(anomalyDetectionController))
);

// Get anomaly detection dashboard
router.get('/dashboard', 
  rateLimiter({ windowMs: 60 * 1000, max: 30 }), // 30 requests per minute
  asyncHandler(anomalyDetectionController.getAnomalyDashboard.bind(anomalyDetectionController))
);

// Get real-time threat feed
router.get('/threat-feed', 
  rateLimiter({ windowMs: 60 * 1000, max: 60 }), // 60 requests per minute
  asyncHandler(anomalyDetectionController.getThreatFeed.bind(anomalyDetectionController))
);

// Test anomaly detection system
router.post('/test', 
  rateLimiter({ windowMs: 5 * 60 * 1000, max: 10 }), // 10 requests per 5 minutes
  asyncHandler(anomalyDetectionController.testAnomalyDetection.bind(anomalyDetectionController))
);

// Security intelligence endpoints
router.get('/intelligence/status', 
  rateLimiter({ windowMs: 60 * 1000, max: 20 }), // 20 requests per minute
  asyncHandler(anomalyDetectionController.getSecurityIntelligenceStatus.bind(anomalyDetectionController))
);

router.post('/intelligence/update', 
  enhancedAuthorizeRoles(['admin', 'security_admin']),
  rateLimiter({ windowMs: 5 * 60 * 1000, max: 5 }), // 5 requests per 5 minutes
  asyncHandler(anomalyDetectionController.updateThreatIntelligence.bind(anomalyDetectionController))
);

// Admin-only endpoints (require admin role)
router.get('/admin/status', 
  enhancedAuthorizeRoles(['admin', 'security_admin']),
  rateLimiter({ windowMs: 60 * 1000, max: 10 }), // 10 requests per minute
  asyncHandler(async (req, res) => {
    return res.json({
      status: 'admin_access_granted',
      timestamp: new Date().toISOString(),
      user: req.user.username,
      role: req.user.role,
      permissions: req.user.permissions,
      message: 'Administrative access to anomaly detection system'
    });
  })
);

// Health check endpoint for load balancers and monitoring systems
router.get('/ping', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Quick Redis ping
    const redis = (await import('../config/redis.js')).getRedisClient();
    await redis.ping();
    
    const responseTime = Date.now() - startTime;
    
    return res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      services: {
        redis: 'connected',
        anomaly_detection: 'operational',
        security_intelligence: 'operational'
      }
    });
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      error: error.message,
      services: {
        redis: 'disconnected',
        anomaly_detection: 'degraded',
        security_intelligence: 'degraded'
      }
    });
  }
}));

// Health check endpoint for Kubernetes/container health probes
router.get('/ready', asyncHandler(async (req, res) => {
  try {
    // Perform a quick capability check
    const capabilities = await anomalyDetectionController.getCapabilities(req, res);
    
    if (capabilities.status === 200) {
      return res.json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        message: 'Anomaly detection and security intelligence system is ready to serve requests'
      });
    } else {
      return res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        message: 'Anomaly detection and security intelligence system is not ready'
      });
    }
    
  } catch (error) {
    return res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: error.message,
      message: 'Anomaly detection and security intelligence system health check failed'
    });
  }
}));

// Health check endpoint for startup probes
router.get('/startup', asyncHandler(async (req, res) => {
  try {
    // Check if all required services are available
    const redis = (await import('../config/redis.js')).getRedisClient();
    await redis.ping();
    
    return res.json({
      status: 'started',
      timestamp: new Date().toISOString(),
      message: 'Anomaly detection and security intelligence system has started successfully',
      services: {
        redis: 'available',
        express: 'running',
        anomaly_detection: 'initialized',
        security_intelligence: 'initialized'
      }
    });
    
  } catch (error) {
    return res.status(503).json({
      status: 'starting',
      timestamp: new Date().toISOString(),
      error: error.message,
      message: 'Anomaly detection and security intelligence system is still starting up'
    });
  }
}));

export default router;
