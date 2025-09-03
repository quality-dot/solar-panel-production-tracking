/**
 * Security Event Middleware
 * Task: 22.3 - Event Collection System
 * Description: Automatically collect security events from API requests
 * Date: 2025-08-28
 */

import { securityEventEmitter } from '../services/securityEventEmitter.js';
import loggerService from '../services/loggerService.js';

/**
 * Middleware to capture security events from API requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const securityEventMiddleware = (req, res, next) => {
  // Capture request start time
  const startTime = Date.now();
  
  // Generate correlation ID if not present
  if (!req.correlationId) {
    req.correlationId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Override res.end to capture response data
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    // Calculate processing time
    const processingTime = Date.now() - startTime;
    
    // Emit security event for API access
    securityEventEmitter.emitApiAccess({
      endpoint: req.path,
      method: req.method,
      statusCode: res.statusCode,
      processingTime,
      userAgent: req.get('User-Agent'),
      sourceIp: req.ip || req.connection.remoteAddress,
      userId: req.user?.id,
      sessionId: req.session?.id,
      requestSize: req.get('Content-Length') || 0,
      responseSize: chunk ? chunk.length : 0,
      headers: {
        contentType: req.get('Content-Type'),
        accept: req.get('Accept'),
        authorization: req.get('Authorization') ? 'present' : 'absent'
      },
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      body: req.body && Object.keys(req.body).length > 0 ? 'present' : 'absent',
      success: res.statusCode < 400,
      error: res.statusCode >= 400 ? res.statusMessage : undefined
    }, {
      userId: req.user?.id,
      correlationId: req.correlationId,
      source: 'api-middleware',
      timestamp: new Date().toISOString()
    }).catch(error => {
      // Log error but don't fail the response
      loggerService.logSecurity('error', 'Failed to emit API access event', {
        error: error.message,
        endpoint: req.path,
        method: req.method,
        source: 'security-event-middleware'
      });
    });
    
    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };
  
  // Emit request start event
  securityEventEmitter.emitSecurityEvent('api.request.start', {
    endpoint: req.path,
    method: req.method,
    sourceIp: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    sessionId: req.session?.id,
    timestamp: new Date().toISOString()
  }, {
    userId: req.user?.id,
    correlationId: req.correlationId,
    source: 'api-middleware'
  }).catch(error => {
    // Log error but don't fail the request
    loggerService.logSecurity('error', 'Failed to emit request start event', {
      error: error.message,
      endpoint: req.path,
      method: req.method,
      source: 'security-event-middleware'
    });
  });
  
  next();
};

/**
 * Middleware to capture authentication events
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const authenticationEventMiddleware = (req, res, next) => {
  // Capture authentication attempts
  if (req.path.includes('/auth/login') || req.path.includes('/auth/signin')) {
    const originalSend = res.send;
    
    res.send = function(data) {
      try {
        let responseData;
        if (typeof data === 'string') {
          responseData = JSON.parse(data);
        } else {
          responseData = data;
        }
        
        // Emit authentication event
        securityEventEmitter.emitUserLogin({
          userId: req.body?.email || req.body?.username,
          sourceIp: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          method: req.body?.method || 'password',
          success: responseData.success !== false && responseData.token,
          error: responseData.error || responseData.message,
          timestamp: new Date().toISOString()
        }, {
          correlationId: req.correlationId,
          source: 'auth-middleware'
        }).catch(error => {
          loggerService.logSecurity('error', 'Failed to emit authentication event', {
            error: error.message,
            source: 'authentication-event-middleware'
          });
        });
        
      } catch (error) {
        // If we can't parse the response, emit a generic event
        securityEventEmitter.emitUserLogin({
          userId: req.body?.email || req.body?.username,
          sourceIp: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          method: req.body?.method || 'password',
          success: res.statusCode < 400,
          error: 'Unable to parse response',
          timestamp: new Date().toISOString()
        }, {
          correlationId: req.correlationId,
          source: 'auth-middleware'
        }).catch(error => {
          loggerService.logSecurity('error', 'Failed to emit authentication event', {
            error: error.message,
            source: 'authentication-event-middleware'
          });
        });
      }
      
      // Call original send method
      originalSend.call(this, data);
    };
  }
  
  // Capture logout attempts
  if (req.path.includes('/auth/logout') || req.path.includes('/auth/signout')) {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Emit logout event
      securityEventEmitter.emitUserLogout({
        userId: req.user?.id || req.body?.userId,
        sourceIp: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        sessionId: req.session?.id,
        timestamp: new Date().toISOString()
      }, {
        correlationId: req.correlationId,
        source: 'auth-middleware'
      }).catch(error => {
        loggerService.logSecurity('error', 'Failed to emit logout event', {
          error: error.message,
          source: 'authentication-event-middleware'
        });
      });
      
      // Call original send method
      originalSend.call(this, data);
    };
  }
  
  next();
};

/**
 * Middleware to capture permission change events
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const permissionEventMiddleware = (req, res, next) => {
  // Capture permission changes
  if (req.path.includes('/users') && (req.method === 'PUT' || req.method === 'PATCH')) {
    const originalSend = res.send;
    
    res.send = function(data) {
      try {
        let responseData;
        if (typeof data === 'string') {
          responseData = JSON.parse(data);
        } else {
          responseData = data;
        }
        
        // Check if permissions were changed
        if (req.body.role || req.body.permissions) {
          securityEventEmitter.emitPermissionChange({
            userId: req.params.id || req.body.userId,
            changedBy: req.user?.id,
            oldRole: req.body.oldRole,
            newRole: req.body.role,
            oldPermissions: req.body.oldPermissions,
            newPermissions: req.body.permissions,
            success: res.statusCode < 400,
            error: responseData.error || responseData.message,
            timestamp: new Date().toISOString()
          }, {
            userId: req.user?.id,
            correlationId: req.correlationId,
            source: 'permission-middleware'
          }).catch(error => {
            loggerService.logSecurity('error', 'Failed to emit permission change event', {
              error: error.message,
              source: 'permission-event-middleware'
            });
          });
        }
        
      } catch (error) {
        // If we can't parse the response, emit a generic event
        if (req.body.role || req.body.permissions) {
          securityEventEmitter.emitPermissionChange({
            userId: req.params.id || req.body.userId,
            changedBy: req.user?.id,
            oldRole: req.body.oldRole,
            newRole: req.body.role,
            oldPermissions: req.body.oldPermissions,
            newPermissions: req.body.permissions,
            success: res.statusCode < 400,
            error: 'Unable to parse response',
            timestamp: new Date().toISOString()
          }, {
            userId: req.user?.id,
            correlationId: req.correlationId,
            source: 'permission-middleware'
          }).catch(error => {
            loggerService.logSecurity('error', 'Failed to emit permission change event', {
              error: error.message,
              source: 'permission-event-middleware'
            });
          });
        }
      }
      
      // Call original send method
      originalSend.call(this, data);
    };
  }
  
  next();
};

/**
 * Middleware to capture data access events
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const dataAccessEventMiddleware = (req, res, next) => {
  // Capture data access for sensitive endpoints
  const sensitiveEndpoints = [
    '/api/users',
    '/api/panels',
    '/api/manufacturing-orders',
    '/api/quality-control',
    '/api/equipment',
    '/api/maintenance'
  ];
  
  const isSensitiveEndpoint = sensitiveEndpoints.some(endpoint => 
    req.path.startsWith(endpoint)
  );
  
  if (isSensitiveEndpoint) {
    const originalSend = res.send;
    
    res.send = function(data) {
      try {
        let responseData;
        if (typeof data === 'string') {
          responseData = JSON.parse(data);
        } else {
          responseData = data;
        }
        
        // Emit data access event
        securityEventEmitter.emitDataAccess({
          userId: req.user?.id,
          resource: req.path,
          action: req.method,
          success: res.statusCode < 400,
          unauthorized: res.statusCode === 401 || res.statusCode === 403,
          sensitive: true,
          dataSize: responseData ? JSON.stringify(responseData).length : 0,
          timestamp: new Date().toISOString()
        }, {
          userId: req.user?.id,
          correlationId: req.correlationId,
          source: 'data-access-middleware'
        }).catch(error => {
          loggerService.logSecurity('error', 'Failed to emit data access event', {
            error: error.message,
            source: 'data-access-event-middleware'
          });
        });
        
      } catch (error) {
        // If we can't parse the response, emit a generic event
        securityEventEmitter.emitDataAccess({
          userId: req.user?.id,
          resource: req.path,
          action: req.method,
          success: res.statusCode < 400,
          unauthorized: res.statusCode === 401 || res.statusCode === 403,
          sensitive: true,
          dataSize: 0,
          error: 'Unable to parse response',
          timestamp: new Date().toISOString()
        }, {
          userId: req.user?.id,
          correlationId: req.correlationId,
          source: 'data-access-middleware'
        }).catch(error => {
          loggerService.logSecurity('error', 'Failed to emit data access event', {
            error: error.message,
            source: 'data-access-event-middleware'
          });
        });
      }
      
      // Call original send method
      originalSend.call(this, data);
    };
  }
  
  next();
};

/**
 * Middleware to capture manufacturing events
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const manufacturingEventMiddleware = (req, res, next) => {
  // Capture station operations
  if (req.path.includes('/api/stations') && req.method === 'POST') {
    const originalSend = res.send;
    
    res.send = function(data) {
      try {
        let responseData;
        if (typeof data === 'string') {
          responseData = JSON.parse(data);
        } else {
          responseData = data;
        }
        
        // Emit station operation event
        securityEventEmitter.emitStationOperation({
          stationId: req.body.stationId || req.params.id,
          operationType: req.body.operationType,
          panelId: req.body.panelId,
          batchId: req.body.batchId,
          operatorId: req.user?.id,
          success: res.statusCode < 400,
          error: responseData.error || responseData.message,
          timestamp: new Date().toISOString()
        }, {
          userId: req.user?.id,
          correlationId: req.correlationId,
          source: 'manufacturing-middleware'
        }).catch(error => {
          loggerService.logSecurity('error', 'Failed to emit station operation event', {
            error: error.message,
            source: 'manufacturing-event-middleware'
          });
        });
        
      } catch (error) {
        // If we can't parse the response, emit a generic event
        securityEventEmitter.emitStationOperation({
          stationId: req.body.stationId || req.params.id,
          operationType: req.body.operationType,
          panelId: req.body.panelId,
          batchId: req.body.batchId,
          operatorId: req.user?.id,
          success: res.statusCode < 400,
          error: 'Unable to parse response',
          timestamp: new Date().toISOString()
        }, {
          userId: req.user?.id,
          correlationId: req.correlationId,
          source: 'manufacturing-middleware'
        }).catch(error => {
          loggerService.logSecurity('error', 'Failed to emit station operation event', {
            error: error.message,
            source: 'manufacturing-event-middleware'
          });
        });
      }
      
      // Call original send method
      originalSend.call(this, data);
    };
  }
  
  // Capture quality control events
  if (req.path.includes('/api/quality-control') && req.method === 'POST') {
    const originalSend = res.send;
    
    res.send = function(data) {
      try {
        let responseData;
        if (typeof data === 'string') {
          responseData = JSON.parse(data);
        } else {
          responseData = data;
        }
        
        // Emit quality check event
        securityEventEmitter.emitQualityCheck({
          panelId: req.body.panelId,
          batchId: req.body.batchId,
          qualityStatus: req.body.qualityStatus,
          defectTypes: req.body.defectTypes || [],
          inspectorId: req.user?.id,
          failed: req.body.qualityStatus === 'fail',
          critical: req.body.critical || false,
          success: res.statusCode < 400,
          error: responseData.error || responseData.message,
          timestamp: new Date().toISOString()
        }, {
          userId: req.user?.id,
          correlationId: req.correlationId,
          source: 'manufacturing-middleware'
        }).catch(error => {
          loggerService.logSecurity('error', 'Failed to emit quality check event', {
            error: error.message,
            source: 'manufacturing-event-middleware'
          });
        });
        
      } catch (error) {
        // If we can't parse the response, emit a generic event
        securityEventEmitter.emitQualityCheck({
          panelId: req.body.panelId,
          batchId: req.body.batchId,
          qualityStatus: req.body.qualityStatus,
          defectTypes: req.body.defectTypes || [],
          inspectorId: req.user?.id,
          failed: req.body.qualityStatus === 'fail',
          critical: req.body.critical || false,
          success: res.statusCode < 400,
          error: 'Unable to parse response',
          timestamp: new Date().toISOString()
        }, {
          userId: req.user?.id,
          correlationId: req.correlationId,
          source: 'manufacturing-middleware'
        }).catch(error => {
          loggerService.logSecurity('error', 'Failed to emit quality check event', {
            error: error.message,
            source: 'manufacturing-event-middleware'
          });
        });
      }
      
      // Call original send method
      originalSend.call(this, data);
    };
  }
  
  next();
};

/**
 * Middleware to capture error events
 * @param {Object} error - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const errorEventMiddleware = (error, req, res, next) => {
  // Emit system error event
  securityEventEmitter.emitSystemError({
    error: error.message,
    stack: error.stack,
    endpoint: req.path,
    method: req.method,
    userId: req.user?.id,
    sourceIp: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    securityRelated: error.statusCode === 401 || error.statusCode === 403,
    timestamp: new Date().toISOString()
  }, {
    userId: req.user?.id,
    correlationId: req.correlationId,
    source: 'error-middleware'
  }).catch(eventError => {
    // Log error but don't fail error handling
    loggerService.logSecurity('error', 'Failed to emit system error event', {
      error: eventError.message,
      originalError: error.message,
      source: 'error-event-middleware'
    });
  });
  
  next(error);
};

/**
 * Apply all security event middleware
 * @param {Object} app - Express app object
 */
export const applySecurityEventMiddleware = (app) => {
  // Apply middleware in order
  app.use(securityEventMiddleware);
  app.use(authenticationEventMiddleware);
  app.use(permissionEventMiddleware);
  app.use(dataAccessEventMiddleware);
  app.use(manufacturingEventMiddleware);
  
  // Error middleware should be applied last
  app.use(errorEventMiddleware);
  
  loggerService.logSecurity('info', 'Security event middleware applied', {
    source: 'security-event-middleware'
  });
};

export default {
  securityEventMiddleware,
  authenticationEventMiddleware,
  permissionEventMiddleware,
  dataAccessEventMiddleware,
  manufacturingEventMiddleware,
  errorEventMiddleware,
  applySecurityEventMiddleware
};
