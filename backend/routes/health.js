// Health check and monitoring endpoints for manufacturing environment
// Production-grade monitoring for solar panel tracking system

import express from 'express';
import { databaseManager } from '../config/index.js';
import { ResponseFormatter } from '../middleware/response.js';
import { manufacturingLogger } from '../middleware/logger.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * Basic health check endpoint
 * GET /health
 * Quick health status for load balancers
 */
router.get('/health', asyncHandler(async (req, res) => {
  const status = 'healthy';
  
  res.status(200).json(ResponseFormatter.health(status, {
    service: 'manufacturing-api',
    timestamp: new Date().toISOString()
  }));
}));

/**
 * Detailed system status endpoint
 * GET /status
 * Comprehensive system status for monitoring dashboards
 */
router.get('/status', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  
  // Check database connectivity
  let databaseStatus = 'unknown';
  let databaseLatency = null;
  let poolStats = null;
  
  try {
    const dbStart = Date.now();
    await databaseManager.testConnection();
    databaseLatency = Date.now() - dbStart;
    databaseStatus = 'connected';
    poolStats = databaseManager.getPoolStatistics();
  } catch (error) {
    databaseStatus = 'disconnected';
    manufacturingLogger.warn('Health check: Database connection failed', {
      error: error.message,
      category: 'health_check'
    });
  }
  
  // Memory usage
  const memUsage = process.memoryUsage();
  const memoryInfo = {
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
    external: Math.round(memUsage.external / 1024 / 1024), // MB
    rss: Math.round(memUsage.rss / 1024 / 1024), // MB
    usage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100) // %
  };
  
  // CPU usage approximation
  const cpuUsage = process.cpuUsage();
  
  // System status determination
  let overallStatus = 'healthy';
  const issues = [];
  
  if (databaseStatus === 'disconnected') {
    overallStatus = 'degraded';
    issues.push('Database connection unavailable');
  }
  
  if (memoryInfo.usage > 90) {
    overallStatus = 'degraded';
    issues.push('High memory usage');
  }
  
  if (databaseLatency > 1000) {
    overallStatus = 'degraded';
    issues.push('High database latency');
  }
  
  const responseTime = Date.now() - startTime;
  
  const statusData = {
    service: 'solar-panel-manufacturing-api',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: {
      seconds: Math.floor(process.uptime()),
      human: formatUptime(process.uptime())
    },
    database: {
      status: databaseStatus,
      latency: databaseLatency ? `${databaseLatency}ms` : null,
      pool: poolStats
    },
    memory: memoryInfo,
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system
    },
    manufacturing: {
      dualLineMode: true,
      maxConcurrentStations: 8,
      supportedStations: [1, 2, 3, 4, 5, 6, 7, 8],
      lineConfiguration: {
        line1: { stations: [1, 2, 3, 4], specifications: ['36V', '40V', '60V', '72V'] },
        line2: { stations: [5, 6, 7, 8], specifications: ['144V'] }
      }
    },
    responseTime: `${responseTime}ms`,
    issues: issues.length > 0 ? issues : null
  };
  
  const httpStatus = overallStatus === 'healthy' ? 200 : 503;
  
  res.status(httpStatus).json(ResponseFormatter.health(overallStatus, statusData));
}));

/**
 * Readiness check endpoint
 * GET /ready
 * Kubernetes-style readiness probe
 */
router.get('/ready', asyncHandler(async (req, res) => {
  const checks = {
    database: false,
    memory: false,
    startup: false
  };
  
  // Check database connectivity
  try {
    await databaseManager.testConnection();
    checks.database = true;
  } catch (error) {
    // Database check failed
  }
  
  // Check memory usage
  const memUsage = process.memoryUsage();
  const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  checks.memory = memoryUsagePercent < 95; // Ready if memory usage < 95%
  
  // Check startup time (ready after 10 seconds)
  checks.startup = process.uptime() > 10;
  
  const isReady = Object.values(checks).every(check => check === true);
  const status = isReady ? 'ready' : 'not ready';
  const httpStatus = isReady ? 200 : 503;
  
  res.status(httpStatus).json({
    status,
    ready: isReady,
    checks,
    timestamp: new Date().toISOString()
  });
}));

/**
 * Liveness check endpoint
 * GET /live
 * Kubernetes-style liveness probe
 */
router.get('/live', asyncHandler(async (req, res) => {
  // Simple liveness check - if we can respond, we're alive
  const alive = true;
  const uptime = process.uptime();
  
  res.status(200).json({
    status: 'alive',
    alive,
    uptime: {
      seconds: Math.floor(uptime),
      human: formatUptime(uptime)
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * Manufacturing metrics endpoint
 * GET /metrics
 * Prometheus-style metrics for monitoring
 */
router.get('/metrics', asyncHandler(async (req, res) => {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  let dbStats = null;
  try {
    dbStats = databaseManager.getPoolStatistics();
  } catch (error) {
    // Database not available
  }
  
  const metrics = {
    // Process metrics
    process_uptime_seconds: process.uptime(),
    process_memory_heap_used_bytes: memUsage.heapUsed,
    process_memory_heap_total_bytes: memUsage.heapTotal,
    process_memory_external_bytes: memUsage.external,
    process_memory_rss_bytes: memUsage.rss,
    process_cpu_user_microseconds: cpuUsage.user,
    process_cpu_system_microseconds: cpuUsage.system,
    
    // Database metrics
    database_pool_total_connections: dbStats?.totalCount || 0,
    database_pool_idle_connections: dbStats?.idleCount || 0,
    database_pool_waiting_requests: dbStats?.waitingCount || 0,
    
    // Manufacturing metrics
    manufacturing_supported_stations: 8,
    manufacturing_dual_line_mode: 1,
    manufacturing_line1_stations: 4,
    manufacturing_line2_stations: 4,
    
    // Timestamp
    timestamp: Date.now()
  };
  
  // Return in Prometheus format if requested
  if (req.headers.accept && req.headers.accept.includes('text/plain')) {
    let prometheusOutput = '';
    
    Object.entries(metrics).forEach(([key, value]) => {
      if (typeof value === 'number') {
        prometheusOutput += `${key} ${value}\n`;
      }
    });
    
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(prometheusOutput);
  } else {
    // Return as JSON
    res.json({
      success: true,
      metrics,
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * Database health check endpoint
 * GET /health/database
 * Detailed database connectivity and performance check
 */
router.get('/health/database', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Test basic connectivity
    await databaseManager.testConnection();
    
    // Get pool statistics
    const poolStats = databaseManager.getPoolStatistics();
    
    // Test query performance
    const queryStart = Date.now();
    await databaseManager.query('SELECT 1 as test');
    const queryTime = Date.now() - queryStart;
    
    const totalTime = Date.now() - startTime;
    
    const status = {
      connected: true,
      connectionTime: `${totalTime}ms`,
      queryTime: `${queryTime}ms`,
      pool: poolStats,
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'not_configured'
    };
    
    res.json(ResponseFormatter.success(status, 'Database is healthy'));
    
  } catch (error) {
    manufacturingLogger.error('Database health check failed', {
      error: error.message,
      stack: error.stack,
      category: 'health_check'
    });
    
    const status = {
      connected: false,
      error: error.message,
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'not_configured'
    };
    
    res.status(503).json(ResponseFormatter.error(
      'DATABASE_UNAVAILABLE',
      'Database health check failed',
      status,
      503
    ));
  }
}));

/**
 * System information endpoint
 * GET /info
 * Detailed system information for troubleshooting
 */
router.get('/info', asyncHandler(async (req, res) => {
  const info = {
    application: {
      name: 'Solar Panel Manufacturing API',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      startTime: new Date(Date.now() - (process.uptime() * 1000)).toISOString()
    },
    system: {
      platform: process.platform,
      architecture: process.arch,
      nodeVersion: process.version,
      uptime: formatUptime(process.uptime())
    },
    manufacturing: {
      dualLineSupport: true,
      maxConcurrentStations: 8,
      barcodeFormat: 'CRSYYFBPP#####',
      supportedPanelTypes: ['Monocrystalline', 'Polycrystalline'],
      productionLines: {
        line1: {
          stations: [1, 2, 3, 4],
          specifications: ['36V', '40V', '60V', '72V']
        },
        line2: {
          stations: [5, 6, 7, 8],
          specifications: ['144V']
        }
      },
      palletCapacity: {
        default: 25,
        alternative: 26,
        maximum: 30
      }
    },
    configuration: {
      port: process.env.PORT || 3000,
      database: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        name: process.env.DB_NAME || 'not_configured'
      },
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        directory: process.env.LOG_DIR || './logs'
      }
    }
  };
  
  res.json(ResponseFormatter.success(info, 'System information retrieved'));
}));

/**
 * Helper function to format uptime in human-readable format
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  let result = '';
  if (days > 0) result += `${days}d `;
  if (hours > 0) result += `${hours}h `;
  if (minutes > 0) result += `${minutes}m `;
  result += `${secs}s`;
  
  return result.trim();
}

export default router;


