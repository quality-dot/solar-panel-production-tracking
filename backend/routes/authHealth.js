// Authentication Health Routes
// Manufacturing-optimized health monitoring API endpoints

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import authHealthController from '../controllers/auth/authHealthController.js';
import {
  enhancedAuthenticateJWT,
  enhancedAuthorizeRoles
} from '../middleware/enhancedAuth.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public endpoints (no authentication required)
router.get('/overview', asyncHandler(async (req, res) => {
  return res.json({
    system: 'Authentication Health Monitoring System',
    version: '2.2.0',
    description: 'Comprehensive health monitoring for authentication system',
    endpoints: {
      public: [
        'GET /overview - System overview and capabilities',
        'GET /status - Current system health status',
        'GET /health - Basic health check'
      ],
      protected: [
        'GET /dashboard - Detailed health dashboard',
        'GET /metrics/:timeRange - Health metrics',
        'GET /history - Health check history',
        'GET /component/:component - Component-specific health',
        'POST /refresh - Force health check refresh',
        'GET /config - Health check configuration'
      ]
    },
    capabilities: [
      'System health monitoring',
      'Component-specific health checks',
      'Performance metrics tracking',
      'Health history and trends',
      'Automated recommendations',
      'Real-time health dashboard'
    ]
  });
}));

router.get('/status', asyncHandler(async (req, res) => {
  return res.json({
    status: 'operational',
    timestamp: new Date().toISOString(),
    system: 'Authentication Health Monitoring',
    services: [
      'Redis connectivity',
      'Database health',
      'Session management',
      'Token rotation',
      'Performance monitoring',
      'User experience',
      'Compliance audit',
      'Security posture'
    ]
  });
}));

router.get('/health', asyncHandler(async (req, res) => {
  // Basic health check - just verify the service is running
  return res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'Authentication health monitoring service is operational'
  });
}));

// Protected endpoints (require authentication)
router.use(enhancedAuthenticateJWT);

// Health dashboard - requires authentication
router.get('/dashboard', 
  rateLimiter({ windowMs: 60 * 1000, max: 30 }), // 30 requests per minute
  asyncHandler(authHealthController.getHealthDashboard.bind(authHealthController))
);

// Health metrics with time range
router.get('/metrics/:timeRange?', 
  rateLimiter({ windowMs: 60 * 1000, max: 60 }), // 60 requests per minute
  asyncHandler(authHealthController.getHealthMetrics.bind(authHealthController))
);

// Health history
router.get('/history', 
  rateLimiter({ windowMs: 60 * 1000, max: 30 }), // 30 requests per minute
  asyncHandler(authHealthController.getHealthHistory.bind(authHealthController))
);

// Component-specific health check
router.get('/component/:component', 
  rateLimiter({ windowMs: 60 * 1000, max: 60 }), // 60 requests per minute
  asyncHandler(authHealthController.getComponentHealth.bind(authHealthController))
);

// Force health check refresh
router.post('/refresh', 
  rateLimiter({ windowMs: 5 * 60 * 1000, max: 10 }), // 10 requests per 5 minutes
  asyncHandler(authHealthController.refreshHealthCheck.bind(authHealthController))
);

// Health configuration
router.get('/config', 
  rateLimiter({ windowMs: 60 * 1000, max: 20 }), // 20 requests per minute
  asyncHandler(authHealthController.getHealthConfig.bind(authHealthController))
);

// System health overview (detailed)
router.get('/system', 
  rateLimiter({ windowMs: 60 * 1000, max: 20 }), // 20 requests per minute
  asyncHandler(authHealthController.getSystemHealth.bind(authHealthController))
);

// Admin-only endpoints (require admin role)
router.get('/admin/status', 
  enhancedAuthorizeRoles(['admin', 'system_admin']),
  rateLimiter({ windowMs: 60 * 1000, max: 10 }), // 10 requests per minute
  asyncHandler(async (req, res) => {
    return res.json({
      status: 'admin_access_granted',
      timestamp: new Date().toISOString(),
      user: req.user.username,
      role: req.user.role,
      permissions: req.user.permissions,
      message: 'Administrative access to health monitoring system'
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
        health_monitoring: 'operational'
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
        health_monitoring: 'degraded'
      }
    });
  }
}));

// Health check endpoint for Kubernetes/container health probes
router.get('/ready', asyncHandler(async (req, res) => {
  try {
    // Perform a quick health check
    const healthCheck = await authHealthController.getSystemHealth(req, res);
    
    if (healthCheck.status === 200) {
      return res.json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        message: 'Authentication health monitoring system is ready to serve requests'
      });
    } else {
      return res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        message: 'Authentication health monitoring system is not ready'
      });
    }
    
  } catch (error) {
    return res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: error.message,
      message: 'Authentication health monitoring system health check failed'
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
      message: 'Authentication health monitoring system has started successfully',
      services: {
        redis: 'available',
        express: 'running',
        health_monitoring: 'initialized'
      }
    });
    
  } catch (error) {
    return res.status(503).json({
      status: 'starting',
      timestamp: new Date().toISOString(),
      error: error.message,
      message: 'Authentication health monitoring system is still starting up'
    });
  }
}));

export default router;
