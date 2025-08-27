// Response standardization middleware for manufacturing environment
// Consistent API response format for production floor operations

import { manufacturingLogger } from './logger.js';

/**
 * Standard response structure for manufacturing API
 */
export const RESPONSE_STRUCTURE = {
  SUCCESS: {
    success: true,
    data: null,
    message: '',
    metadata: {},
    timestamp: null
  },
  ERROR: {
    success: false,
    error: {
      code: '',
      message: '',
      details: {}
    },
    timestamp: null,
    requestId: null
  },
  PAGINATION: {
    success: true,
    data: [],
    pagination: {
      page: 1,
      limit: 25,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false
    },
    metadata: {},
    timestamp: null
  }
};

/**
 * Response formatter utilities
 */
export class ResponseFormatter {
  /**
   * Format successful response
   */
  static success(data, message = 'Operation successful', metadata = {}) {
    return {
      success: true,
      data,
      message,
      metadata: {
        ...metadata,
        responseTime: metadata.responseTime || null,
        station: metadata.station || null,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Format error response
   */
  static error(code, message, details = {}, statusCode = 500) {
    return {
      success: false,
      error: {
        code,
        message,
        details,
        statusCode
      },
      timestamp: new Date().toISOString(),
      requestId: details.requestId || null
    };
  }

  /**
   * Format paginated response
   */
  static paginated(data, pagination, message = 'Data retrieved successfully', metadata = {}) {
    const totalPages = Math.ceil(pagination.total / pagination.limit);
    
    return {
      success: true,
      data,
      message,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrev: pagination.page > 1,
        startIndex: (pagination.page - 1) * pagination.limit + 1,
        endIndex: Math.min(pagination.page * pagination.limit, pagination.total)
      },
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Format manufacturing-specific response with station context
   */
  static manufacturing(data, message, context = {}) {
    return {
      success: true,
      data,
      message,
      manufacturing: {
        station: context.station || null,
        line: context.line || null,
        shift: context.shift || null,
        operator: context.operator || null,
        action: context.action || null,
        timestamp: context.timestamp || new Date().toISOString()
      },
      metadata: {
        responseTime: context.responseTime || null,
        version: context.version || '1.0.0'
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Format real-time update response
   */
  static realTime(event, data, target = 'all') {
    return {
      type: 'real-time-update',
      event,
      data,
      target, // 'all', 'station-{id}', 'line-{number}', 'user-{id}'
      timestamp: new Date().toISOString(),
      sequenceId: Date.now()
    };
  }

  /**
   * Format health check response
   */
  static health(status, checks = {}) {
    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database: checks.database || 'unknown',
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024)
        },
        ...checks
      }
    };
  }
}

/**
 * Response timing middleware
 * Adds response time tracking to all requests
 */
export const responseTimer = (req, res, next) => {
  const startTime = Date.now();
  
  // Add start time to request for later use
  req.startTime = startTime;
  
  // Override res.json to add timing information
  const originalJson = res.json;
  res.json = function(data) {
    const responseTime = Date.now() - startTime;
    
    // Add timing to response if it's a success response
    if (data && typeof data === 'object' && data.success !== false) {
      if (data.metadata) {
        data.metadata.responseTime = `${responseTime}ms`;
      } else if (data.manufacturing) {
        data.manufacturing.responseTime = `${responseTime}ms`;
      } else {
        data.responseTime = `${responseTime}ms`;
      }
    }
    
    // Log response time for monitoring
    manufacturingLogger.debug('Response sent', {
      path: req.path,
      method: req.method,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      station: req.station?.id,
      user: req.user?.username,
      category: 'response'
    });
    
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * Request context middleware
 * Adds manufacturing context to all requests
 */
export const addRequestContext = (req, res, next) => {
  // Add request ID for tracing
  req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Add timestamp
  req.timestamp = new Date().toISOString();
  
  // Add helper functions to response object
  res.successResponse = (data, message, metadata) => {
    return res.json(ResponseFormatter.success(data, message, {
      ...metadata,
      station: req.station?.id,
      requestId: req.requestId,
      user: req.user?.username
    }));
  };
  
  res.errorResponse = (code, message, details, statusCode = 500) => {
    return res.status(statusCode).json(ResponseFormatter.error(code, message, {
      ...details,
      requestId: req.requestId,
      station: req.station?.id,
      user: req.user?.username
    }, statusCode));
  };
  
  res.paginatedResponse = (data, pagination, message, metadata) => {
    return res.json(ResponseFormatter.paginated(data, pagination, message, {
      ...metadata,
      station: req.station?.id,
      requestId: req.requestId,
      user: req.user?.username
    }));
  };
  
  res.manufacturingResponse = (data, message, context) => {
    return res.json(ResponseFormatter.manufacturing(data, message, {
      ...context,
      station: req.station?.id,
      requestId: req.requestId,
      user: req.user?.username,
      timestamp: req.timestamp
    }));
  };
  
  next();
};

/**
 * Response compression middleware for manufacturing data
 * Optimizes responses for tablet devices with limited bandwidth
 */
export const optimizeForTablets = (req, res, next) => {
  // Add Cache-Control headers for static manufacturing data
  if (req.path.includes('/stations') || req.path.includes('/criteria')) {
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
  }
  
  // Add ETag for data that changes infrequently
  if (req.path.includes('/manufacturing-orders') && req.method === 'GET') {
    res.setHeader('Cache-Control', 'public, max-age=60'); // 1 minute
  }
  
  // Disable caching for real-time data
  if (req.path.includes('/inspections') || req.path.includes('/real-time')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  // Add compression hints
  if (req.headers['accept-encoding'] && req.headers['accept-encoding'].includes('gzip')) {
    res.setHeader('Vary', 'Accept-Encoding');
  }
  
  next();
};

/**
 * API versioning middleware
 * Handles API version headers and routing
 */
export const apiVersioning = (req, res, next) => {
  // Extract version from Accept header or URL
  const versionHeader = req.headers['accept-version'] || req.headers['api-version'];
  const versionFromUrl = req.path.match(/\/api\/v(\d+)/);
  
  const version = versionHeader || (versionFromUrl ? versionFromUrl[1] : '1');
  
  // Add version info to request
  req.apiVersion = version;
  
  // Add version to response headers
  res.setHeader('API-Version', version);
  res.setHeader('API-Supported-Versions', '1');
  
  // Validate version
  const supportedVersions = ['1'];
  if (!supportedVersions.includes(version)) {
    return res.status(400).json(ResponseFormatter.error(
      'UNSUPPORTED_API_VERSION',
      `API version ${version} is not supported. Supported versions: ${supportedVersions.join(', ')}`,
      { requestedVersion: version, supportedVersions },
      400
    ));
  }
  
  next();
};

/**
 * Manufacturing metadata middleware
 * Adds manufacturing-specific metadata to responses
 */
export const addManufacturingMetadata = (req, res, next) => {
  // Override response methods to add manufacturing context
  const originalSuccessResponse = res.successResponse;
  const originalManufacturingResponse = res.manufacturingResponse;
  
  res.successResponse = (data, message, metadata = {}) => {
    return originalSuccessResponse(data, message, {
      ...metadata,
      manufacturing: {
        dualLineMode: true,
        activeStations: [1, 2, 3, 4, 5, 6, 7, 8],
        systemMode: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      }
    });
  };
  
  res.manufacturingResponse = (data, message, context = {}) => {
    return originalManufacturingResponse(data, message, {
      ...context,
      systemInfo: {
        dualLineMode: true,
        maxConcurrentStations: 8,
        version: '1.0.0'
      }
    });
  };
  
  next();
};

/**
 * Error response standardization middleware
 * Ensures all errors follow the same format
 */
export const standardizeErrors = (err, req, res, next) => {
  // If response was already sent, delegate to Express error handler
  if (res.headersSent) {
    return next(err);
  }
  
  // Use the error response helper
  const statusCode = err.statusCode || err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'An unexpected error occurred';
  
  return res.errorResponse(code, message, {
    ...err.details,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  }, statusCode);
};

export default {
  ResponseFormatter,
  responseTimer,
  addRequestContext,
  optimizeForTablets,
  apiVersioning,
  addManufacturingMetadata,
  standardizeErrors,
  RESPONSE_STRUCTURE
};



