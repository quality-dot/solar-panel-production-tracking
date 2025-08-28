// Main route configuration for manufacturing API
// RESTful routes for solar panel production workflow

import express from 'express';
import { config } from '../config/index.js';
import { databaseManager } from '../config/index.js';
import { successResponse, errorResponse } from '../utils/index.js';

// Import route modules
import authRoutes from './auth.js';
import barcodeRoutes from './barcode.js';
import panelsRoutes from './panels.js';
import stationsRoutes from './stations.js';
import inspectionsRoutes from './inspections.js';
import manufacturingOrdersRoutes from './manufacturingOrders.js';
import palletsRoutes from './pallets.js';
import apiRoutes from './api.js';

const router = express.Router();

// Root endpoint
router.get('/', (req, res) => {
  const apiInfo = {
    service: '🏭 Solar Panel Production Tracking API',
    version: '1.0.0',
    environment: config.environment,
    manufacturing: {
      maxStations: config.manufacturing.maxConcurrentStations,
      supportedPanelTypes: [
        ...config.manufacturing.dualLineConfig.line1.panelTypes,
        ...config.manufacturing.dualLineConfig.line2.panelTypes
      ],
      lines: {
        line1: config.manufacturing.dualLineConfig.line1,
        line2: config.manufacturing.dualLineConfig.line2
      }
    }
  };
  
  res.json(successResponse(apiInfo, '🏭 Solar Panel Production Tracking API'));
});

// Health check endpoints
router.get('/health', async (req, res) => {
  try {
    const dbHealth = await databaseManager.getHealthStatus();
    
    res.status(200).json({ 
      success: true,
      status: 'healthy',
      timestamp: req.timestamp || new Date().toISOString(),
      service: 'solar-panel-tracking-api',
      version: '1.0.0',
      environment: config.environment,
      database: dbHealth,
      manufacturing: {
        maxStations: config.manufacturing.maxConcurrentStations,
        stationTimeout: config.manufacturing.stationTimeoutMs,
        barcodeFormatRegex: config.manufacturing.barcodeFormat.source
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: req.timestamp || new Date().toISOString(),
      details: config.environment === 'development' ? error.message : undefined
    });
  }
});

router.get('/status', async (req, res) => {
  try {
    const dbHealth = await databaseManager.getHealthStatus();
    
    res.status(200).json({ 
      success: true,
      status: 'operational',
      version: '1.0.0',
      environment: config.environment,
      timestamp: req.timestamp || new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: {
        status: dbHealth.status,
        responseTime: dbHealth.responseTime,
        connections: {
          total: dbHealth.totalConnections,
          idle: dbHealth.idleConnections,
          waiting: dbHealth.waitingConnections
        }
      },
      manufacturing: {
        maxConcurrentStations: config.manufacturing.maxConcurrentStations,
        supportedPanelTypes: [
          ...config.manufacturing.dualLineConfig.line1.panelTypes,
          ...config.manufacturing.dualLineConfig.line2.panelTypes
        ]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Status check failed',
      timestamp: req.timestamp || new Date().toISOString(),
      details: config.environment === 'development' ? error.message : undefined
    });
  }
});

// Ready endpoint for Kubernetes/Docker health checks
router.get('/ready', async (req, res) => {
  try {
    const dbHealth = await databaseManager.getHealthStatus();
    
    if (dbHealth.status === 'healthy') {
      res.status(200).json({
        success: true,
        status: 'ready',
        timestamp: req.timestamp || new Date().toISOString()
      });
    } else {
      res.status(503).json({
        success: false,
        status: 'not ready',
        reason: 'Database not healthy',
        timestamp: req.timestamp || new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'not ready',
      reason: 'Health check failed',
      timestamp: req.timestamp || new Date().toISOString()
    });
  }
});

// Dynamic route imports for modules not yet imported above
const stationRoutes = await import('./stations.js');
const panelRoutes = await import('./panels.js');
const manufacturingOrderRoutes = await import('./manufacturingOrders.js');
const inspectionRoutes = await import('./inspections.js');
  const palletRoutes = await import('./pallets.js');
  const performanceRoutes = await import('./performance.js');
  const errorHandlingRoutes = await import('./errorHandling.js');
  const metricsRoutes = await import('./metrics.js');

// API v1 base route with available endpoints info
router.get('/api/v1', (req, res) => {
  res.json(successResponse({
    message: 'Solar Panel Production Tracking API v1',
    version: '1.0.0',
    availableEndpoints: {
      auth: '/api/v1/auth',
      barcode: '/api/v1/barcode',
      stations: '/api/v1/stations',
      panels: '/api/v1/panels', 
      manufacturingOrders: '/api/v1/manufacturing-orders',
      inspections: '/api/v1/inspections',
      pallets: '/api/v1/pallets',
      performance: '/api/v1/performance',
      errorHandling: '/api/v1/error-handling',
      metrics: '/api/v1/metrics'
    },
    documentation: 'Each endpoint provides detailed documentation in 501 responses until implemented',
    features: {
      authentication: 'JWT-based with role-based access control',
      barcodeSanning: 'Supports CRSYYFBPP##### format',
      dualLineSupport: 'Line 1 (36,40,60,72) and Line 2 (144)',
      offlineCapability: 'PWA with IndexedDB storage',
      realTimeTracking: 'Live production monitoring'
    }
  }, 'API v1 Base'));
});

// Mount route modules
router.use('/api/v1/auth', authRoutes.default);
router.use('/api/v1/barcode', barcodeRoutes);
router.use('/api/v1/stations', stationRoutes.default);
router.use('/api/v1/panels', panelRoutes.default);
router.use('/api/v1/manufacturing-orders', manufacturingOrderRoutes.default);
router.use('/api/v1/inspections', inspectionRoutes.default);
router.use('/api/v1/pallets', palletRoutes.default);
router.use('/api/v1/performance', performanceRoutes.default);
router.use('/api/v1/error-handling', errorHandlingRoutes.default);
router.use('/api/v1/metrics', metricsRoutes.default);

// Mount API documentation routes
router.use('/api/v1', apiRoutes);

export default router;