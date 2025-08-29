// Comprehensive API Route Structure for Manufacturing Workflow
// Centralized API documentation and route organization

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { successResponse, errorResponse } from '../utils/responseUtils.js';

const router = express.Router();

/**
 * @route   GET /api/v1
 * @desc    Get comprehensive API documentation and available endpoints
 * @access  Public
 */
router.get('/', asyncHandler(async (req, res) => {
  const apiDocumentation = {
    service: '🏭 Solar Panel Production Tracking API',
    version: '1.0.0',
    description: 'Comprehensive manufacturing workflow API for dual-line solar panel production',
    environment: process.env.NODE_ENV || 'development',
    
    // Core Manufacturing Features
    manufacturing: {
      dualLineSupport: true,
      maxConcurrentStations: 8,
      supportedPanelTypes: {
        line1: ['36', '40', '60', '72'],
        line2: ['144']
      },
      barcodeFormat: 'CRSYYFBPP#####',
      stationWorkflow: {
        station1: 'Assembly & EL',
        station2: 'Framing', 
        station3: 'Junction Box',
        station4: 'Performance & Final Inspection'
      }
    },

    // Available Endpoints
    endpoints: {
      authentication: {
        base: '/api/v1/auth',
        description: 'User authentication and authorization',
        methods: ['POST /login', 'POST /logout', 'GET /profile', 'POST /refresh'],
        features: ['JWT tokens', 'Role-based access', 'Station assignment']
      },

      barcode: {
        base: '/api/v1/barcode',
        description: 'Barcode processing and validation',
        methods: ['POST /process', 'GET /validate/:barcode', 'POST /generate', 'GET /history/:barcode'],
        features: ['CRSYYFBPP##### format', 'Line assignment', 'MO validation', 'Event logging']
      },

      stations: {
        base: '/api/v1/stations',
        description: 'Station workflow management',
        methods: ['GET /', 'GET /:id', 'POST /:id/scan', 'POST /:id/inspect', 'GET /:id/status'],
        features: ['Workflow state machine', 'Pass/fail criteria', 'Real-time updates', 'Station assignment']
      },

      panels: {
        base: '/api/v1/panels',
        description: 'Panel lifecycle tracking',
        methods: ['GET /', 'GET /:barcode', 'POST /', 'PUT /:barcode', 'GET /:barcode/history'],
        features: ['Status tracking', 'Workflow progression', 'MO association', 'Quality metrics']
      },

      manufacturingOrders: {
        base: '/api/v1/manufacturing-orders',
        description: 'Production order management',
        methods: ['GET /', 'POST /', 'GET /:id', 'PUT /:id', 'GET /:id/progress', 'POST /:id/close'],
        features: ['Order creation', 'Progress tracking', 'Barcode sequencing', 'Completion logic']
      },

      inspections: {
        base: '/api/v1/inspections',
        description: 'Quality inspection management',
        methods: ['GET /', 'POST /', 'GET /:id', 'PUT /:id', 'GET /statistics'],
        features: ['Pass/fail criteria', 'Notes and overrides', 'Quality metrics', 'Trend analysis']
      },

      pallets: {
        base: '/api/v1/pallets',
        description: 'Automated pallet management',
        methods: ['GET /', 'POST /', 'GET /:id', 'PUT /:id', 'POST /:id/complete'],
        features: ['Auto-generation', 'Capacity management', 'Shipping preparation', 'Label printing']
      },

      performance: {
        base: '/api/v1/performance',
        description: 'System performance monitoring',
        methods: ['GET /', 'GET /metrics', 'GET /alerts', 'GET /optimization'],
        features: ['Response time tracking', 'Resource utilization', 'Performance alerts', 'Optimization suggestions']
      },

      errorHandling: {
        base: '/api/v1/error-handling',
        description: 'Error management and recovery',
        methods: ['GET /', 'GET /circuit-breakers', 'POST /recovery', 'GET /trends'],
        features: ['Circuit breaker pattern', 'Error classification', 'Recovery automation', 'Trend analysis']
      },

      metrics: {
        base: '/api/v1/metrics',
        description: 'Comprehensive system metrics',
        methods: ['GET /', 'GET /manufacturing', 'GET /database', 'GET /performance'],
        features: ['Production metrics', 'Database performance', 'System health', 'Real-time monitoring']
      }
    },

    // API Standards
    standards: {
      authentication: 'JWT Bearer token in Authorization header',
      rateLimiting: '1000 requests per 15 minutes per station',
      responseFormat: 'Standardized success/error response structure',
      errorCodes: 'Manufacturing-specific error codes and messages',
      validation: 'Comprehensive input validation with detailed error messages',
      pagination: 'Standard pagination with limit/offset parameters',
      filtering: 'Query parameter-based filtering and sorting',
      versioning: 'API versioning through URL path (/api/v1/)'
    },

    // Development Information
    development: {
      baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
      documentation: 'Comprehensive API documentation available at each endpoint',
      testing: 'Test endpoints available for development and validation',
      examples: 'Request/response examples provided in 501 responses',
      status: 'Many endpoints return 501 (Not Implemented) - implementation in progress'
    },

    // Health and Monitoring
    health: {
      endpoints: ['/health', '/status', '/ready', '/live'],
      database: 'PostgreSQL with connection pooling',
      logging: 'Comprehensive manufacturing logging',
      monitoring: 'Real-time performance metrics and alerts'
    }
  };

  res.json(successResponse(apiDocumentation, '🏭 Complete API Documentation'));
}));

/**
 * @route   GET /api/v1/endpoints
 * @desc    Get detailed endpoint information for development
 * @access  Public
 */
router.get('/endpoints', asyncHandler(async (req, res) => {
  const endpointDetails = {
    message: 'Detailed endpoint information for development',
    note: 'Many endpoints return 501 (Not Implemented) responses during development',
    
    // Authentication Endpoints
    auth: {
      'POST /api/v1/auth/login': {
        description: 'User login with station assignment',
        body: {
          username: 'string (required)',
          password: 'string (required)',
          stationId: 'number (optional)'
        },
        response: {
          success: 'JWT token and user info',
          error: 'Invalid credentials or station assignment'
        }
      },
      'POST /api/v1/auth/logout': {
        description: 'User logout and session cleanup',
        headers: 'Authorization: Bearer <token>',
        response: 'Success confirmation'
      }
    },

    // Barcode Processing Endpoints
    barcode: {
      'POST /api/v1/barcode/process': {
        description: 'Process barcode scan and initiate workflow',
        body: {
          barcode: 'string (CRSYYFBPP##### format)',
          stationId: 'number (required)',
          timestamp: 'ISO string (optional)'
        },
        response: {
          success: 'Panel info and workflow state',
          error: 'Invalid barcode, station mismatch, or processing error'
        }
      },
      'GET /api/v1/barcode/validate/:barcode': {
        description: 'Validate barcode format and components',
        params: 'barcode: string (CRSYYFBPP#####)',
        response: {
          success: 'Validation result and parsed components',
          error: 'Invalid format or business rule violation'
        }
      }
    },

    // Station Workflow Endpoints
    stations: {
      'GET /api/v1/stations': {
        description: 'Get all stations with current status',
        query: {
          line: '1 or 2 (optional)',
          status: 'active, inactive, maintenance (optional)',
          type: 'station type filter (optional)'
        },
        response: 'Array of station objects with current status'
      },
      'POST /api/v1/stations/:id/scan': {
        description: 'Process barcode scan at specific station',
        params: 'id: station number (1-8)',
        body: {
          barcode: 'string (required)',
          timestamp: 'ISO string (optional)'
        },
        response: 'Panel workflow initiation result'
      },
      'POST /api/v1/stations/:id/inspect': {
        description: 'Submit inspection results for panel',
        params: 'id: station number (1-8)',
        body: {
          panelId: 'string (required)',
          result: 'PASS or FAIL (required)',
          criteria: 'object (required)',
          notes: 'string (optional)'
        },
        response: 'Inspection result confirmation'
      }
    },

    // Panel Management Endpoints
    panels: {
      'GET /api/v1/panels': {
        description: 'Get panels with filtering and pagination',
        query: {
          status: 'PENDING, IN_PROGRESS, PASSED, FAILED, REWORK (optional)',
          line: '1 or 2 (optional)',
          moId: 'number (optional)',
          limit: 'number (default: 50, max: 200)',
          offset: 'number (default: 0)',
          barcode: 'string pattern (optional)'
        },
        response: 'Paginated array of panel objects'
      },
      'GET /api/v1/panels/:barcode': {
        description: 'Get specific panel details by barcode',
        params: 'barcode: string (CRSYYFBPP#####)',
        response: 'Complete panel object with workflow state'
      },
      'POST /api/v1/panels': {
        description: 'Create new panel entry from barcode',
        body: {
          barcode: 'string (required)',
          moId: 'number (optional)',
          overrides: 'object (optional)',
          metadata: 'object (optional)'
        },
        response: 'Created panel object'
      }
    },

    // Manufacturing Order Endpoints
    manufacturingOrders: {
      'GET /api/v1/manufacturing-orders': {
        description: 'Get manufacturing orders with filtering',
        query: {
          status: 'PENDING, IN_PROGRESS, COMPLETED, CANCELLED (optional)',
          panelType: '36, 40, 60, 72, 144 (optional)',
          line: '1 or 2 (optional)',
          limit: 'number (default: 50)',
          offset: 'number (default: 0)'
        },
        response: 'Paginated array of MO objects'
      },
      'POST /api/v1/manufacturing-orders': {
        description: 'Create new manufacturing order',
        body: {
          orderNumber: 'string (required)',
          panelType: 'string (required)',
          targetQuantity: 'number (required)',
          customerName: 'string (optional)',
          customerPo: 'string (optional)',
          notes: 'string (optional)',
          priority: 'number 0-10 (optional)'
        },
        response: 'Created MO object'
      },
      'GET /api/v1/manufacturing-orders/:id/progress': {
        description: 'Get MO progress and completion status',
        params: 'id: MO ID number',
        response: 'Progress metrics and completion percentage'
      }
    },

    // Inspection Endpoints
    inspections: {
      'GET /api/v1/inspections': {
        description: 'Get inspection records with filtering',
        query: {
          panelId: 'string (optional)',
          stationId: 'number (optional)',
          result: 'PASS, FAIL (optional)',
          date: 'ISO date (optional)',
          limit: 'number (default: 50)',
          offset: 'number (default: 0)'
        },
        response: 'Paginated array of inspection records'
      },
      'POST /api/v1/inspections': {
        description: 'Create new inspection record',
        body: {
          panelId: 'string (required)',
          stationId: 'number (required)',
          result: 'PASS or FAIL (required)',
          criteria: 'object (required)',
          notes: 'string (optional)',
          operatorId: 'number (optional)'
        },
        response: 'Created inspection record'
      }
    },

    // Pallet Management Endpoints
    pallets: {
      'GET /api/v1/pallets': {
        description: 'Get pallets with status and contents',
        query: {
          status: 'IN_PROGRESS, COMPLETED, SHIPPED (optional)',
          line: '1 or 2 (optional)',
          moId: 'number (optional)',
          limit: 'number (default: 50)',
          offset: 'number (default: 0)'
        },
        response: 'Paginated array of pallet objects'
      },
      'POST /api/v1/pallets': {
        description: 'Create new pallet for panels',
        body: {
          line: '1 or 2 (required)',
          moId: 'number (optional)',
          capacity: 'number (default: 25)',
          notes: 'string (optional)'
        },
        response: 'Created pallet object'
      }
    }
  };

  res.json(successResponse(endpointDetails, '📚 Detailed Endpoint Information'));
}));

/**
 * @route   GET /api/v1/status
 * @desc    Get API implementation status for development
 * @access  Public
 */
router.get('/status', asyncHandler(async (req, res) => {
  const implementationStatus = {
    message: 'API Implementation Status for Development',
    overall: 'Foundation complete, endpoints in development',
    
    // Completed Components
    completed: {
      server: 'Express server with ES6 modules',
      middleware: 'Security, logging, error handling, database pool',
      configuration: 'Environment and database configuration',
      routeStructure: 'Complete route organization and mounting',
      authentication: 'JWT-based auth system',
      barcode: 'Core barcode processing and validation'
    },

    // In Development
    inDevelopment: {
      stationWorkflow: 'Workflow state machine and pass/fail logic',
      panelManagement: 'Panel lifecycle and status tracking',
      manufacturingOrders: 'MO creation, tracking, and management',
      inspectionSystem: 'Pass/fail criteria and quality metrics',
      palletManagement: 'Automated pallet generation and tracking'
    },

    // Implementation Progress
    progress: {
      backend: '70% complete',
      api: '40% complete',
      workflow: '20% complete',
      frontend: '80% complete',
      testing: '30% complete'
    },

    // Next Steps
    nextSteps: [
      'Complete station workflow implementation',
      'Implement panel management endpoints',
      'Build manufacturing order system',
      'Create inspection workflow',
      'Develop pallet management',
      'Add comprehensive testing'
    ],

    // Development Notes
    notes: [
      'Many endpoints return 501 (Not Implemented) during development',
      'Core infrastructure and middleware are production-ready',
      'Database schema and models are complete',
      'Frontend PWA foundation is fully implemented',
      'Focus is on completing backend workflow logic'
    ]
  };

  res.json(successResponse(implementationStatus, '📊 API Implementation Status'));
}));

export default router;
