/**
 * Security Events API Routes
 * Provides endpoints for security event management and monitoring
 */

import express from 'express';
import { SecurityEventEmitter, SECURITY_EVENT_TYPES, SECURITY_SEVERITY, SECURITY_CATEGORIES } from '../services/securityEventEmitter.js';
import SecurityEventService from '../services/securityEventService.js';

// Initialize router
const router = express.Router();

// Initialize services
const securityEventEmitter = new SecurityEventEmitter();
const securityEventService = new SecurityEventService();

// Store events in database when emitted
securityEventEmitter.on('securityEvent', async (event) => {
  try {
    await securityEventService.storeEvent(event);
  } catch (error) {
    console.error('Error storing security event:', error);
  }
});

/**
 * GET /api/v1/security-events
 * Get security events with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const { type, severity, category, limit = 100, offset = 0 } = req.query;
    
    const filters = {};
    if (type) filters.type = type;
    if (severity) filters.severity = severity;
    if (category) filters.category = category;

    const events = await securityEventService.getRecentEvents(parseInt(limit));
    
    res.json({
      success: true,
      data: events,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: events.length
      }
    });
  } catch (error) {
    console.error('Error getting security events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve security events',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/security-events/:id
 * Get a specific security event by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const event = await securityEventService.getEventById(id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Security event not found'
      });
    }

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Error getting security event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve security event',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/security-events/type/:type
 * Get security events by type
 */
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { limit = 100 } = req.query;
    
    const events = await securityEventService.getEventsByType(type, parseInt(limit));
    
    res.json({
      success: true,
      data: events,
      type: type,
      count: events.length
    });
  } catch (error) {
    console.error('Error getting security events by type:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve security events by type',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/security-events/statistics
 * Get security event statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const statistics = await securityEventService.getEventStatistics();
    
    res.json({
      success: true,
      data: statistics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting security event statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve security event statistics',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/security-events/metrics
 * Get security event metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = securityEventEmitter.getMetrics();
    
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting security event metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve security event metrics',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/security-events/emit
 * Emit a new security event
 */
router.post('/emit', async (req, res) => {
  try {
    const { type, severity, category, message, data = {}, context = {} } = req.body;
    
    // Validate required fields
    if (!type || !severity || !category || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, severity, category, message'
      });
    }

    // Validate event type
    if (!Object.values(SECURITY_EVENT_TYPES).includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event type'
      });
    }

    // Validate severity
    if (!Object.values(SECURITY_SEVERITY).includes(severity)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid severity level'
      });
    }

    // Validate category
    if (!Object.values(SECURITY_CATEGORIES).includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category'
      });
    }

    // Emit the security event
    const event = securityEventEmitter.emitSecurityEvent(
      type,
      severity,
      category,
      message,
      data,
      context
    );

    res.status(201).json({
      success: true,
      data: event.toJSON(),
      message: 'Security event emitted successfully'
    });
  } catch (error) {
    console.error('Error emitting security event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to emit security event',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/security-events/auth
 * Emit authentication event
 */
router.post('/auth', async (req, res) => {
  try {
    const { type, userId, success, details = {}, context = {} } = req.body;
    
    if (!type || userId === undefined || success === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, userId, success'
      });
    }

    const event = securityEventEmitter.emitAuthEvent(
      type,
      userId,
      success,
      details,
      context
    );

    res.status(201).json({
      success: true,
      data: event.toJSON(),
      message: 'Authentication event emitted successfully'
    });
  } catch (error) {
    console.error('Error emitting authentication event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to emit authentication event',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/security-events/data
 * Emit data access event
 */
router.post('/data', async (req, res) => {
  try {
    const { type, userId, resource, action, details = {}, context = {} } = req.body;
    
    if (!type || !userId || !resource || !action) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, userId, resource, action'
      });
    }

    const event = securityEventEmitter.emitDataEvent(
      type,
      userId,
      resource,
      action,
      details,
      context
    );

    res.status(201).json({
      success: true,
      data: event.toJSON(),
      message: 'Data access event emitted successfully'
    });
  } catch (error) {
    console.error('Error emitting data access event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to emit data access event',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/security-events/manufacturing
 * Emit manufacturing event
 */
router.post('/manufacturing', async (req, res) => {
  try {
    const { type, equipmentId, details = {}, context = {} } = req.body;
    
    if (!type || !equipmentId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, equipmentId'
      });
    }

    const event = securityEventEmitter.emitManufacturingEvent(
      type,
      equipmentId,
      details,
      context
    );

    res.status(201).json({
      success: true,
      data: event.toJSON(),
      message: 'Manufacturing event emitted successfully'
    });
  } catch (error) {
    console.error('Error emitting manufacturing event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to emit manufacturing event',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/security-events/stream
 * Server-Sent Events stream for real-time security events
 */
router.get('/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({
    type: 'connection',
    message: 'Connected to security events stream',
    timestamp: new Date().toISOString()
  })}\n\n`);

  // Listen for security events
  const eventHandler = (event) => {
    res.write(`data: ${JSON.stringify({
      type: 'securityEvent',
      data: event.toJSON(),
      timestamp: new Date().toISOString()
    })}\n\n`);
  };

  securityEventEmitter.on('securityEvent', eventHandler);

  // Handle client disconnect
  req.on('close', () => {
    securityEventEmitter.removeListener('securityEvent', eventHandler);
  });

  // Send heartbeat every 30 seconds
  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({
      type: 'heartbeat',
      timestamp: new Date().toISOString()
    })}\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

/**
 * POST /api/v1/security-events/test-alert-generation
 * Test endpoint for generating security alerts
 */
router.post('/test-alert-generation', async (req, res) => {
  try {
    const { incidentType = 'auth-failure-burst' } = req.body;
    
    // Generate test security events based on incident type
    let event;
    
    switch (incidentType) {
      case 'auth-failure-burst':
        event = securityEventEmitter.emitAuthEvent(
          SECURITY_EVENT_TYPES.AUTH_FAILURE,
          'test-user',
          false,
          { failedAttempts: 15, timeWindow: '5 minutes' },
          { ipAddress: '192.168.1.100' }
        );
        break;
        
      case 'unauthorized-access':
        event = securityEventEmitter.emitDataEvent(
          SECURITY_EVENT_TYPES.DATA_READ,
          'unauthorized-user',
          'sensitive-data',
          'read',
          { unauthorizedAccess: true },
          { ipAddress: '10.0.0.50' }
        );
        break;
        
      case 'manufacturing-error':
        event = securityEventEmitter.emitManufacturingEvent(
          SECURITY_EVENT_TYPES.MANUFACTURING_ERROR,
          'equipment-001',
          { errorCode: 'E001', description: 'Temperature sensor failure' },
          { source: 'test' }
        );
        break;
        
      default:
        event = securityEventEmitter.emitSecurityEvent(
          SECURITY_EVENT_TYPES.SECURITY_THREAT_DETECTED,
          SECURITY_SEVERITY.HIGH,
          SECURITY_CATEGORIES.SECURITY,
          `Test security threat: ${incidentType}`,
          { testEvent: true },
          { source: 'test' }
        );
    }

    res.json({
      success: true,
      data: event.toJSON(),
      message: `Test ${incidentType} event generated successfully`
    });
  } catch (error) {
    console.error('Error generating test alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate test alert',
      message: error.message
    });
  }
});

export default router;