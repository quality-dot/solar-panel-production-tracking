// Main route configuration for manufacturing API
// RESTful routes for solar panel production workflow

import express from 'express';
import { config } from '../config/index.js';
import { databaseManager } from '../config/index.js';
import { successResponse, errorResponse } from '../utils/index.js';

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

// API v1 base route with available endpoints info
router.get('/api/v1', (req, res) => {
  res.json(successResponse({
    message: 'Solar Panel Production Tracking API v1',
    availableEndpoints: {
      stations: '/api/v1/stations',
      panels: '/api/v1/panels', 
      manufacturingOrders: '/api/v1/manufacturing-orders',
      inspections: '/api/v1/inspections',
      pallets: '/api/v1/pallets',
      auth: '/api/v1/auth'
    },
    documentation: 'See individual endpoints for detailed API documentation'
  }, 'API v1 Base'));
});

// Simple placeholder routes for API endpoints (no wildcards)
router.get('/api/v1/stations', (req, res) => {
  res.status(501).json(errorResponse('Station Management routes not yet implemented', 501, {
    plannedEndpoints: [
      'GET /api/v1/stations - List all stations',
      'GET /api/v1/stations/:id - Get station details',
      'POST /api/v1/stations/:id/scan - Process barcode scan',
      'POST /api/v1/stations/:id/inspect - Submit inspection results'
    ],
    requestedPath: req.path,
    method: req.method
  }));
});

router.get('/api/v1/panels', (req, res) => {
  res.status(501).json(errorResponse('Panel Tracking routes not yet implemented', 501, {
    plannedEndpoints: [
      'GET /api/v1/panels - List panels with filters',
      'GET /api/v1/panels/:serialNumber - Get panel details',
      'POST /api/v1/panels - Create new panel',
      'PATCH /api/v1/panels/:serialNumber - Update panel status'
    ],
    requestedPath: req.path,
    method: req.method
  }));
});

router.get('/api/v1/manufacturing-orders', (req, res) => {
  res.status(501).json(errorResponse('Manufacturing Orders routes not yet implemented', 501, {
    plannedEndpoints: [
      'GET /api/v1/manufacturing-orders - List MOs',
      'POST /api/v1/manufacturing-orders - Create new MO',
      'GET /api/v1/manufacturing-orders/:moNumber - Get MO details',
      'PATCH /api/v1/manufacturing-orders/:moNumber - Update MO'
    ],
    requestedPath: req.path,
    method: req.method
  }));
});

router.get('/api/v1/inspections', (req, res) => {
  res.status(501).json(errorResponse('Quality Inspections routes not yet implemented', 501, {
    plannedEndpoints: [
      'GET /api/v1/inspections - List inspections',
      'POST /api/v1/inspections - Create inspection record',
      'GET /api/v1/inspections/:id - Get inspection details'
    ],
    requestedPath: req.path,
    method: req.method
  }));
});

router.get('/api/v1/pallets', (req, res) => {
  res.status(501).json(errorResponse('Pallet Management routes not yet implemented', 501, {
    plannedEndpoints: [
      'GET /api/v1/pallets - List pallets',
      'POST /api/v1/pallets - Create new pallet',
      'GET /api/v1/pallets/:palletNumber - Get pallet details'
    ],
    requestedPath: req.path,
    method: req.method
  }));
});

router.post('/api/v1/auth/login', (req, res) => {
  res.status(501).json(errorResponse('Authentication routes not yet implemented', 501, {
    plannedEndpoints: [
      'POST /api/v1/auth/login - User login',
      'POST /api/v1/auth/logout - User logout',
      'GET /api/v1/auth/me - Get current user'
    ],
    requestedPath: req.path,
    method: req.method
  }));
});

export default router;