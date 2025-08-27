// Graceful Degradation Middleware
// Provides fallback responses when services are degraded or unavailable

import { errorRecoverySystem, ManufacturingError } from '../utils/errorHandling.js';
import { performanceCache } from '../utils/performanceCache.js';
import { ManufacturingLogger } from './logger.js';
import { successResponse, errorResponse } from '../utils/responseUtils.js';

const logger = new ManufacturingLogger('GracefulDegradation');

/**
 * Graceful degradation modes
 */
export const DEGRADATION_MODES = {
  FULL_SERVICE: 'FULL_SERVICE',           // All services operational
  PERFORMANCE_DEGRADED: 'PERFORMANCE_DEGRADED', // Slow but functional
  LIMITED_SERVICE: 'LIMITED_SERVICE',     // Some services unavailable
  EMERGENCY_MODE: 'EMERGENCY_MODE',       // Minimal functionality only
  MAINTENANCE_MODE: 'MAINTENANCE_MODE'    // Planned maintenance
};

/**
 * Service health status tracker
 */
class ServiceHealthTracker {
  constructor() {
    this.services = new Map();
    this.overallHealthStatus = DEGRADATION_MODES.FULL_SERVICE;
    this.lastHealthCheck = Date.now();
    this.healthCheckInterval = 30000; // 30 seconds
    
    this.initializeServices();
    this.startHealthMonitoring();
  }

  initializeServices() {
    const services = [
      'database',
      'barcodeProcessing', 
      'cache',
      'panelService',
      'authentication'
    ];

    services.forEach(service => {
      this.services.set(service, {
        name: service,
        status: 'HEALTHY',
        lastCheck: Date.now(),
        failureCount: 0,
        responseTime: 0,
        degradationLevel: 0 // 0=healthy, 1=slow, 2=unstable, 3=failing
      });
    });
  }

  updateServiceHealth(serviceName, status, responseTime = 0, error = null) {
    const service = this.services.get(serviceName);
    if (!service) return;

    service.lastCheck = Date.now();
    service.responseTime = responseTime;

    if (status === 'HEALTHY') {
      service.failureCount = Math.max(0, service.failureCount - 1);
      service.degradationLevel = Math.max(0, service.degradationLevel - 1);
    } else {
      service.failureCount++;
      if (service.failureCount > 5) {
        service.degradationLevel = Math.min(3, service.degradationLevel + 1);
      }
    }

    service.status = this.calculateServiceStatus(service);
    this.updateOverallHealthStatus();

    if (error) {
      logger.warn('Service health degraded', {
        service: serviceName,
        status: service.status,
        failureCount: service.failureCount,
        degradationLevel: service.degradationLevel,
        error: error.message
      });
    }
  }

  calculateServiceStatus(service) {
    if (service.degradationLevel === 0) return 'HEALTHY';
    if (service.degradationLevel === 1) return 'SLOW';
    if (service.degradationLevel === 2) return 'UNSTABLE';
    return 'FAILING';
  }

  updateOverallHealthStatus() {
    const serviceStatuses = Array.from(this.services.values()).map(s => s.status);
    const failingServices = serviceStatuses.filter(s => s === 'FAILING').length;
    const unstableServices = serviceStatuses.filter(s => s === 'UNSTABLE').length;
    const slowServices = serviceStatuses.filter(s => s === 'SLOW').length;

    if (failingServices > 2) {
      this.overallHealthStatus = DEGRADATION_MODES.EMERGENCY_MODE;
    } else if (failingServices > 0 || unstableServices > 2) {
      this.overallHealthStatus = DEGRADATION_MODES.LIMITED_SERVICE;
    } else if (unstableServices > 0 || slowServices > 2) {
      this.overallHealthStatus = DEGRADATION_MODES.PERFORMANCE_DEGRADED;
    } else {
      this.overallHealthStatus = DEGRADATION_MODES.FULL_SERVICE;
    }

    logger.info('Overall health status updated', {
      overallStatus: this.overallHealthStatus,
      failingServices,
      unstableServices,
      slowServices
    });
  }

  startHealthMonitoring() {
    setInterval(() => {
      this.performHealthChecks();
    }, this.healthCheckInterval);
  }

  async performHealthChecks() {
    // Get circuit breaker stats
    const circuitBreakerStats = errorRecoverySystem.getCircuitBreakerStats();
    
    for (const [serviceName, stats] of Object.entries(circuitBreakerStats)) {
      const service = this.services.get(serviceName);
      if (service) {
        const isHealthy = stats.state === 'CLOSED';
        this.updateServiceHealth(
          serviceName, 
          isHealthy ? 'HEALTHY' : 'UNHEALTHY',
          0,
          isHealthy ? null : { message: `Circuit breaker ${stats.state}` }
        );
      }
    }

    // Check cache health
    const cacheStats = performanceCache.getStats();
    const cacheHealthy = parseFloat(cacheStats.global.hitRate) > 50;
    this.updateServiceHealth('cache', cacheHealthy ? 'HEALTHY' : 'UNHEALTHY');
  }

  getHealthStatus() {
    return {
      overallStatus: this.overallHealthStatus,
      services: Object.fromEntries(this.services),
      lastCheck: this.lastHealthCheck,
      degradationCapabilities: this.getDegradationCapabilities()
    };
  }

  getDegradationCapabilities() {
    switch (this.overallHealthStatus) {
      case DEGRADATION_MODES.FULL_SERVICE:
        return {
          barcodeProcessing: 'FULL',
          panelCreation: 'FULL',
          databaseOperations: 'FULL',
          caching: 'FULL',
          realTimeUpdates: 'FULL'
        };
      
      case DEGRADATION_MODES.PERFORMANCE_DEGRADED:
        return {
          barcodeProcessing: 'SLOW',
          panelCreation: 'SLOW',
          databaseOperations: 'SLOW',
          caching: 'LIMITED',
          realTimeUpdates: 'DELAYED'
        };
      
      case DEGRADATION_MODES.LIMITED_SERVICE:
        return {
          barcodeProcessing: 'CACHED_ONLY',
          panelCreation: 'LIMITED',
          databaseOperations: 'READ_ONLY',
          caching: 'EMERGENCY',
          realTimeUpdates: 'DISABLED'
        };
      
      case DEGRADATION_MODES.EMERGENCY_MODE:
        return {
          barcodeProcessing: 'VALIDATION_ONLY',
          panelCreation: 'DISABLED',
          databaseOperations: 'DISABLED',
          caching: 'MEMORY_ONLY',
          realTimeUpdates: 'DISABLED'
        };
      
      default:
        return {
          barcodeProcessing: 'DISABLED',
          panelCreation: 'DISABLED',
          databaseOperations: 'DISABLED',
          caching: 'DISABLED',
          realTimeUpdates: 'DISABLED'
        };
    }
  }
}

// Create singleton health tracker
const serviceHealthTracker = new ServiceHealthTracker();

/**
 * Graceful degradation middleware
 */
export function gracefulDegradationMiddleware() {
  return (req, res, next) => {
    const healthStatus = serviceHealthTracker.getHealthStatus();
    
    // Add health status to request for use by route handlers
    req.systemHealth = healthStatus;
    req.degradationMode = healthStatus.overallStatus;
    req.capabilities = healthStatus.degradationCapabilities;
    
    // Add degradation headers
    res.setHeader('X-System-Health', healthStatus.overallStatus);
    res.setHeader('X-Service-Capabilities', JSON.stringify(healthStatus.degradationCapabilities));
    
    // Handle emergency mode
    if (healthStatus.overallStatus === DEGRADATION_MODES.EMERGENCY_MODE) {
      // Allow only health checks and basic barcode validation
      const allowedPaths = [
        '/api/v1/health',
        '/api/v1/performance/health',
        '/api/v1/barcode/validate'
      ];
      
      if (!allowedPaths.some(path => req.path.startsWith(path))) {
        return res.status(503).json(errorResponse(
          'System in emergency mode - limited functionality available',
          'EMERGENCY_MODE',
          {
            allowedEndpoints: allowedPaths,
            healthStatus: healthStatus.overallStatus
          }
        ));
      }
    }
    
    // Handle maintenance mode
    if (healthStatus.overallStatus === DEGRADATION_MODES.MAINTENANCE_MODE) {
      const maintenanceInfo = {
        mode: 'MAINTENANCE',
        message: 'System is currently under maintenance',
        estimatedRestoration: process.env.MAINTENANCE_END || 'Unknown',
        contactSupport: 'support@manufacturing.com'
      };
      
      return res.status(503).json(errorResponse(
        'System under maintenance',
        'MAINTENANCE_MODE',
        maintenanceInfo
      ));
    }
    
    next();
  };
}

/**
 * Route-specific degradation handlers
 */
export const degradationHandlers = {
  // Handle barcode processing degradation
  barcodeProcessing: (req, res, next) => {
    const capability = req.capabilities?.barcodeProcessing;
    
    switch (capability) {
      case 'FULL':
        // Normal processing
        next();
        break;
        
      case 'SLOW':
        // Add warning header but continue
        res.setHeader('X-Performance-Warning', 'Barcode processing may be slower than usual');
        next();
        break;
        
      case 'CACHED_ONLY':
        // Only allow cached barcode lookups
        if (req.method === 'POST' && req.path.includes('/process')) {
          return res.status(503).json(errorResponse(
            'Barcode processing unavailable - cached lookups only',
            'PROCESSING_DEGRADED',
            { availableOperations: ['validate', 'lookup'] }
          ));
        }
        next();
        break;
        
      case 'VALIDATION_ONLY':
        // Only basic validation allowed
        if (!req.path.includes('/validate')) {
          return res.status(503).json(errorResponse(
            'Only barcode validation available',
            'VALIDATION_ONLY',
            { availableOperation: 'validate' }
          ));
        }
        next();
        break;
        
      default:
        return res.status(503).json(errorResponse(
          'Barcode processing unavailable',
          'SERVICE_UNAVAILABLE'
        ));
    }
  },

  // Handle panel creation degradation
  panelCreation: (req, res, next) => {
    const capability = req.capabilities?.panelCreation;
    
    switch (capability) {
      case 'FULL':
        next();
        break;
        
      case 'SLOW':
        res.setHeader('X-Performance-Warning', 'Panel creation may be slower than usual');
        next();
        break;
        
      case 'LIMITED':
        // Only allow panel lookups, not creation
        if (req.method === 'POST') {
          return res.status(503).json(errorResponse(
            'Panel creation unavailable - lookups only',
            'CREATION_DISABLED',
            { availableOperations: ['lookup', 'search'] }
          ));
        }
        next();
        break;
        
      default:
        return res.status(503).json(errorResponse(
          'Panel operations unavailable',
          'SERVICE_UNAVAILABLE'
        ));
    }
  },

  // Handle database operation degradation
  databaseOperations: (req, res, next) => {
    const capability = req.capabilities?.databaseOperations;
    
    switch (capability) {
      case 'FULL':
        next();
        break;
        
      case 'SLOW':
        res.setHeader('X-Performance-Warning', 'Database operations may be slower than usual');
        next();
        break;
        
      case 'READ_ONLY':
        // Only allow read operations
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
          return res.status(503).json(errorResponse(
            'Database in read-only mode',
            'READ_ONLY_MODE',
            { allowedMethods: ['GET'] }
          ));
        }
        next();
        break;
        
      default:
        return res.status(503).json(errorResponse(
          'Database operations unavailable',
          'DATABASE_UNAVAILABLE'
        ));
    }
  }
};

/**
 * Emergency fallback responses
 */
export const emergencyFallbacks = {
  // Provide cached barcode validation
  barcodeValidation: (barcode) => {
    // Try to get from cache
    const cached = performanceCache.getBarcodeValidation(barcode);
    if (cached) {
      return {
        success: true,
        cached: true,
        degradedService: true,
        result: cached
      };
    }
    
    // Basic format validation only
    const isValidFormat = /^CRS\d{2}[WT][346]\d{2}\d{5}$/.test(barcode);
    return {
      success: isValidFormat,
      cached: false,
      degradedService: true,
      result: {
        isValid: isValidFormat,
        format: 'CRSYYFBPP#####',
        note: 'Emergency mode - format validation only'
      }
    };
  },

  // Provide system health information
  healthCheck: () => {
    const healthStatus = serviceHealthTracker.getHealthStatus();
    return {
      status: healthStatus.overallStatus,
      services: healthStatus.services,
      capabilities: healthStatus.degradationCapabilities,
      mode: 'DEGRADED',
      timestamp: new Date().toISOString()
    };
  }
};

// Update service health tracker based on middleware usage
export function updateServiceHealth(serviceName, isHealthy, responseTime = 0, error = null) {
  serviceHealthTracker.updateServiceHealth(
    serviceName, 
    isHealthy ? 'HEALTHY' : 'UNHEALTHY', 
    responseTime, 
    error
  );
}

export { serviceHealthTracker };

export default {
  DEGRADATION_MODES,
  gracefulDegradationMiddleware,
  degradationHandlers,
  emergencyFallbacks,
  updateServiceHealth,
  serviceHealthTracker
};
