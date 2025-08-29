/**
 * Security Event Emitter
 * Task: 22.3 - Event Collection System
 * Description: Core event management for security monitoring
 * Date: 2025-08-28
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { EventStore } from './eventStore.js';
import { EventMetrics } from './eventMetrics.js';
import { getEventWebSocket } from './eventWebSocket.js';
import loggerService from './loggerService.js';

export class SecurityEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.eventStore = new EventStore();
    this.metrics = new EventMetrics();
    this.handlers = new Map();
    this.eventTypes = new Set();
    this.setupDefaultHandlers();
    
    loggerService.logSecurity('info', 'Security event emitter initialized', {
      source: 'security-event-emitter'
    });
  }
  
  /**
   * Emit security event with automatic persistence
   * @param {string} eventType - Type of security event
   * @param {Object} data - Event data
   * @param {Object} context - Event context
   * @returns {Object} Created event object
   */
  async emitSecurityEvent(eventType, data, context = {}) {
    try {
      const startTime = Date.now();
      
      // Create standardized security event
      const event = this.createSecurityEvent(eventType, data, context);
      
      // Add processing time to context
      event.context.processingTime = Date.now() - startTime;
      
      // Persist to database
      await this.eventStore.persist(event);
      
      // Update metrics
      await this.metrics.record(event);
      
      // Emit event for real-time processing
      this.emit(eventType, event);
      
      // Emit to wildcard handler
      this.emit('*', event);
      
      // Stream event to WebSocket clients (if available)
      try {
        const webSocket = getEventWebSocket();
        if (webSocket) {
          webSocket.broadcastEvent(event);
        }
      } catch (error) {
        // Log error but don't fail event emission
        loggerService.logSecurity('warn', 'Failed to broadcast event to WebSocket', {
          eventId: event.id,
          error: error.message,
          source: 'security-event-emitter'
        });
      }
      
      // Log event emission
      loggerService.logSecurity('debug', `Security event emitted: ${eventType}`, {
        eventId: event.id,
        eventType,
        timestamp: event.timestamp,
        severity: event.severity,
        source: 'security-event-emitter'
      });
      
      return event;
    } catch (error) {
      loggerService.logSecurity('error', 'Failed to emit security event', {
        eventType,
        error: error.message,
        stack: error.stack,
        source: 'security-event-emitter'
      });
      throw error;
    }
  }
  
  /**
   * Create standardized security event
   * @param {string} eventType - Type of security event
   * @param {Object} data - Event data
   * @param {Object} context - Event context
   * @returns {Object} Standardized event object
   */
  createSecurityEvent(eventType, data, context) {
    // Add event type to tracking
    this.eventTypes.add(eventType);
    
    return {
      id: randomUUID(),
      eventType,
      eventData: data,
      context: {
        correlationId: context.correlationId || loggerService.correlationId,
        timestamp: new Date().toISOString(),
        source: context.source || 'security-service',
        version: context.version || '1.0.0',
        ...context
      },
      metadata: {
        severity: this.determineSeverity(eventType, data),
        source: context.source || 'security-service',
        version: context.version || '1.0.0'
      },
      timestamp: new Date(),
      correlationId: context.correlationId || loggerService.correlationId,
      userId: context.userId,
      sourceIp: context.sourceIp,
      severity: this.determineSeverity(eventType, data)
    };
  }
  
  /**
   * Determine event severity based on type and data
   * @param {string} eventType - Event type
   * @param {Object} data - Event data
   * @returns {string} Severity level
   */
  determineSeverity(eventType, data) {
    const severityMap = {
      // Authentication events
      'user.login': 'info',
      'user.logout': 'info',
      'user.login.failed': 'warn',
      'user.logout.failed': 'warn',
      'permission.change': 'warn',
      'permission.change.failed': 'error',
      'access.denied': 'warn',
      'access.denied.repeated': 'error',
      
      // Manufacturing events
      'station.operation': 'info',
      'station.operation.failed': 'warn',
      'quality.check': 'info',
      'quality.check.failed': 'warn',
      'quality.check.critical': 'error',
      'equipment.status': 'info',
      'equipment.status.warning': 'warn',
      'equipment.status.error': 'error',
      'maintenance.event': 'info',
      'maintenance.event.overdue': 'warn',
      
      // Data security events
      'data.access': 'info',
      'data.access.unauthorized': 'warn',
      'data.access.sensitive': 'warn',
      'encryption.event': 'info',
      'encryption.event.failed': 'error',
      'compliance.action': 'info',
      'compliance.action.violation': 'error',
      
      // System security events
      'config.change': 'warn',
      'config.change.security': 'error',
      'security.violation': 'error',
      'security.violation.critical': 'error',
      'system.error': 'error',
      'system.error.security': 'error',
      
      // API events
      'api.access': 'info',
      'api.access.unauthorized': 'warn',
      'api.access.rate.limited': 'warn',
      'api.access.suspicious': 'error'
    };
    
    // Check for specific severity indicators in data
    if (data && data.severity) {
      return data.severity;
    }
    
    // Check for failure indicators
    if (data && (data.success === false || data.failed === true || data.error)) {
      return 'error';
    }
    
    // Check for warning indicators
    if (data && (data.warning || data.attention || data.overdue)) {
      return 'warn';
    }
    
    // Return mapped severity or default to info
    return severityMap[eventType] || 'info';
  }
  
  /**
   * Register event handler
   * @param {string} eventType - Event type to handle
   * @param {Function} handler - Handler function
   */
  registerHandler(eventType, handler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    
    this.handlers.get(eventType).push(handler);
    this.on(eventType, handler);
    
    loggerService.logSecurity('info', `Handler registered for event type: ${eventType}`, {
      eventType,
      handlerCount: this.handlers.get(eventType).length,
      source: 'security-event-emitter'
    });
  }
  
  /**
   * Unregister event handler
   * @param {string} eventType - Event type
   * @param {Function} handler - Handler function to remove
   */
  unregisterHandler(eventType, handler) {
    if (this.handlers.has(eventType)) {
      const handlers = this.handlers.get(eventType);
      const index = handlers.indexOf(handler);
      
      if (index > -1) {
        handlers.splice(index, 1);
        this.off(eventType, handler);
        
        loggerService.logSecurity('info', `Handler unregistered for event type: ${eventType}`, {
          eventType,
          handlerCount: handlers.length,
          source: 'security-event-emitter'
        });
      }
    }
  }
  
  /**
   * Setup default handlers
   */
  setupDefaultHandlers() {
    // Default security event handler
    this.registerHandler('*', (event) => {
      loggerService.logSecurity('debug', 'Default security event handler', {
        eventId: event.id,
        eventType: event.eventType,
        source: 'security-event-emitter'
      });
    });
    
    // Error event handler
    this.registerHandler('error', (event) => {
      loggerService.logSecurity('error', 'Security error event detected', {
        eventId: event.id,
        eventType: event.eventType,
        error: event.eventData.error,
        source: 'security-event-emitter'
      });
    });
    
    // Warning event handler
    this.registerHandler('warn', (event) => {
      loggerService.logSecurity('warn', 'Security warning event detected', {
        eventId: event.id,
        eventType: event.eventType,
        source: 'security-event-emitter'
      });
    });
  }
  
  /**
   * Get registered event types
   * @returns {Array} Array of registered event types
   */
  getRegisteredEventTypes() {
    return Array.from(this.eventTypes);
  }
  
  /**
   * Get handler count for event type
   * @param {string} eventType - Event type
   * @returns {number} Number of handlers
   */
  getHandlerCount(eventType) {
    return this.handlers.has(eventType) ? this.handlers.get(eventType).length : 0;
  }
  
  /**
   * Get all handlers
   * @returns {Map} Map of event types to handlers
   */
  getAllHandlers() {
    return new Map(this.handlers);
  }
  
  /**
   * Emit user login event
   * @param {Object} data - Login data
   * @param {Object} context - Event context
   * @returns {Object} Created event
   */
  async emitUserLogin(data, context = {}) {
    const eventType = data.success ? 'user.login' : 'user.login.failed';
    return this.emitSecurityEvent(eventType, data, context);
  }
  
  /**
   * Emit user logout event
   * @param {Object} data - Logout data
   * @param {Object} context - Event context
   * @returns {Object} Created event
   */
  async emitUserLogout(data, context = {}) {
    return this.emitSecurityEvent('user.logout', data, context);
  }
  
  /**
   * Emit permission change event
   * @param {Object} data - Permission change data
   * @param {Object} context - Event context
   * @returns {Object} Created event
   */
  async emitPermissionChange(data, context = {}) {
    const eventType = data.success ? 'permission.change' : 'permission.change.failed';
    return this.emitSecurityEvent(eventType, data, context);
  }
  
  /**
   * Emit access denied event
   * @param {Object} data - Access denied data
   * @param {Object} context - Event context
   * @returns {Object} Created event
   */
  async emitAccessDenied(data, context = {}) {
    const eventType = data.repeated ? 'access.denied.repeated' : 'access.denied';
    return this.emitSecurityEvent(eventType, data, context);
  }
  
  /**
   * Emit station operation event
   * @param {Object} data - Station operation data
   * @param {Object} context - Event context
   * @returns {Object} Created event
   */
  async emitStationOperation(data, context = {}) {
    const eventType = data.success ? 'station.operation' : 'station.operation.failed';
    return this.emitSecurityEvent(eventType, data, context);
  }
  
  /**
   * Emit quality check event
   * @param {Object} data - Quality check data
   * @param {Object} context - Event context
   * @returns {Object} Created event
   */
  async emitQualityCheck(data, context = {}) {
    let eventType = 'quality.check';
    
    if (data.failed) {
      eventType = 'quality.check.failed';
    } else if (data.critical) {
      eventType = 'quality.check.critical';
    }
    
    return this.emitSecurityEvent(eventType, data, context);
  }
  
  /**
   * Emit equipment status event
   * @param {Object} data - Equipment status data
   * @param {Object} context - Event context
   * @returns {Object} Created event
   */
  async emitEquipmentStatus(data, context = {}) {
    let eventType = 'equipment.status';
    
    if (data.status === 'warning') {
      eventType = 'equipment.status.warning';
    } else if (data.status === 'error') {
      eventType = 'equipment.status.error';
    }
    
    return this.emitSecurityEvent(eventType, data, context);
  }
  
  /**
   * Emit maintenance event
   * @param {Object} data - Maintenance data
   * @param {Object} context - Event context
   * @returns {Object} Created event
   */
  async emitMaintenanceEvent(data, context = {}) {
    const eventType = data.overdue ? 'maintenance.event.overdue' : 'maintenance.event';
    return this.emitSecurityEvent(eventType, data, context);
  }
  
  /**
   * Emit data access event
   * @param {Object} data - Data access data
   * @param {Object} context - Event context
   * @returns {Object} Created event
   */
  async emitDataAccess(data, context = {}) {
    let eventType = 'data.access';
    
    if (data.unauthorized) {
      eventType = 'data.access.unauthorized';
    } else if (data.sensitive) {
      eventType = 'data.access.sensitive';
    }
    
    return this.emitSecurityEvent(eventType, data, context);
  }
  
  /**
   * Emit encryption event
   * @param {Object} data - Encryption data
   * @param {Object} context - Event context
   * @returns {Object} Created event
   */
  async emitEncryptionEvent(data, context = {}) {
    const eventType = data.success ? 'encryption.event' : 'encryption.event.failed';
    return this.emitSecurityEvent(eventType, data, context);
  }
  
  /**
   * Emit compliance action event
   * @param {Object} data - Compliance action data
   * @param {Object} context - Event context
   * @returns {Object} Created event
   */
  async emitComplianceAction(data, context = {}) {
    const eventType = data.violation ? 'compliance.action.violation' : 'compliance.action';
    return this.emitSecurityEvent(eventType, data, context);
  }
  
  /**
   * Emit configuration change event
   * @param {Object} data - Configuration change data
   * @param {Object} context - Event context
   * @returns {Object} Created event
   */
  async emitConfigChange(data, context = {}) {
    let eventType = 'config.change';
    
    if (data.securityRelated) {
      eventType = 'config.change.security';
    }
    
    return this.emitSecurityEvent(eventType, data, context);
  }
  
  /**
   * Emit security violation event
   * @param {Object} data - Security violation data
   * @param {Object} context - Event context
   * @returns {Object} Created event
   */
  async emitSecurityViolation(data, context = {}) {
    const eventType = data.critical ? 'security.violation.critical' : 'security.violation';
    return this.emitSecurityEvent(eventType, data, context);
  }
  
  /**
   * Emit system error event
   * @param {Object} data - System error data
   * @param {Object} context - Event context
   * @returns {Object} Created event
   */
  async emitSystemError(data, context = {}) {
    let eventType = 'system.error';
    
    if (data.securityRelated) {
      eventType = 'system.error.security';
    }
    
    return this.emitSecurityEvent(eventType, data, context);
  }
  
  /**
   * Emit API access event
   * @param {Object} data - API access data
   * @param {Object} context - Event context
   * @returns {Object} Created event
   */
  async emitApiAccess(data, context = {}) {
    let eventType = 'api.access';
    
    if (data.unauthorized) {
      eventType = 'api.access.unauthorized';
    } else if (data.rateLimited) {
      eventType = 'api.access.rate.limited';
    } else if (data.suspicious) {
      eventType = 'api.access.suspicious';
    }
    
    return this.emitSecurityEvent(eventType, data, context);
  }
  
  /**
   * Get event emitter statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    return {
      registeredEventTypes: this.getRegisteredEventTypes().length,
      totalHandlers: Array.from(this.handlers.values()).reduce((sum, handlers) => sum + handlers.length, 0),
      eventTypeHandlers: Object.fromEntries(
        Array.from(this.handlers.entries()).map(([type, handlers]) => [type, handlers.length])
      ),
      metrics: this.metrics.exportMetrics(),
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Health check
   * @returns {Object} Health status
   */
  async getHealthStatus() {
    try {
      const eventStoreHealth = await this.eventStore.getHealthStatus();
      const metricsHealth = this.metrics.getMetricsSummary();
      
      return {
        status: 'healthy',
        eventStore: eventStoreHealth,
        metrics: metricsHealth,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      // Close event store connections
      await this.eventStore.close();
      
      // Remove all listeners
      this.removeAllListeners();
      
      // Clear handlers
      this.handlers.clear();
      
      loggerService.logSecurity('info', 'Security event emitter cleaned up', {
        source: 'security-event-emitter'
      });
    } catch (error) {
      loggerService.logSecurity('error', 'Failed to cleanup security event emitter', {
        error: error.message,
        source: 'security-event-emitter'
      });
    }
  }
}

// Export singleton instance
export const securityEventEmitter = new SecurityEventEmitter();
export default securityEventEmitter;
