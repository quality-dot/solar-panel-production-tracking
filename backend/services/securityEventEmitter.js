/**
 * SecurityEventEmitter - Real-time security event monitoring and collection system
 */

import EventEmitter from 'events';
import { v4 as uuidv4 } from 'uuid';

// Security Event Types
const SECURITY_EVENT_TYPES = {
  AUTH_SUCCESS: 'auth_success',
  AUTH_FAILURE: 'auth_failure',
  AUTH_LOCKOUT: 'auth_lockout',
  DATA_READ: 'data_read',
  DATA_WRITE: 'data_write',
  DATA_DELETE: 'data_delete',
  SYSTEM_ERROR: 'system_error',
  MANUFACTURING_ERROR: 'manufacturing_error',
  COMPLIANCE_VIOLATION: 'compliance_violation',
  SECURITY_THREAT_DETECTED: 'security_threat_detected'
};

// Security Event Severity Levels
const SECURITY_SEVERITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info'
};

// Security Event Categories
const SECURITY_CATEGORIES = {
  AUTHENTICATION: 'authentication',
  DATA_ACCESS: 'data_access',
  SYSTEM: 'system',
  MANUFACTURING: 'manufacturing',
  COMPLIANCE: 'compliance',
  SECURITY: 'security'
};

// Security Event Context
class SecurityEventContext {
  constructor(options = {}) {
    this.timestamp = new Date().toISOString();
    this.correlationId = options.correlationId || uuidv4();
    this.sessionId = options.sessionId || null;
    this.userId = options.userId || null;
    this.ipAddress = options.ipAddress || null;
    this.source = options.source || 'system';
  }

  toJSON() {
    return {
      timestamp: this.timestamp,
      correlationId: this.correlationId,
      sessionId: this.sessionId,
      userId: this.userId,
      ipAddress: this.ipAddress,
      source: this.source
    };
  }
}

// Security Event Data Structure
class SecurityEvent {
  constructor(type, severity, category, message, data = {}, context = {}) {
    this.id = uuidv4();
    this.type = type;
    this.severity = severity;
    this.category = category;
    this.message = message;
    this.data = data;
    this.context = new SecurityEventContext(context);
    this.createdAt = new Date().toISOString();
    this.processed = false;
  }

  validate() {
    const errors = [];
    if (!this.type || !Object.values(SECURITY_EVENT_TYPES).includes(this.type)) {
      errors.push('Invalid event type');
    }
    if (!this.severity || !Object.values(SECURITY_SEVERITY).includes(this.severity)) {
      errors.push('Invalid severity level');
    }
    if (!this.message || typeof this.message !== 'string') {
      errors.push('Invalid message');
    }
    return { isValid: errors.length === 0, errors };
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      severity: this.severity,
      category: this.category,
      message: this.message,
      data: this.data,
      context: this.context.toJSON(),
      createdAt: this.createdAt,
      processed: this.processed
    };
  }
}

// Security Event Emitter Class
class SecurityEventEmitter extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      maxListeners: options.maxListeners || 100,
      enableValidation: options.enableValidation !== false,
      ...options
    };
    this.setMaxListeners(this.options.maxListeners);
    this.eventStore = new Map();
    this.metrics = {
      totalEvents: 0,
      eventsByType: new Map(),
      eventsBySeverity: new Map(),
      errors: 0
    };
  }

  emitSecurityEvent(type, severity, category, message, data = {}, context = {}) {
    try {
      const event = new SecurityEvent(type, severity, category, message, data, context);
      
      if (this.options.enableValidation) {
        const validation = event.validate();
        if (!validation.isValid) {
          throw new Error(`Invalid security event: ${validation.errors.join(', ')}`);
        }
      }

      this.eventStore.set(event.id, event);
      this.updateMetrics(event);
      
      this.emit('securityEvent', event);
      this.emit(`securityEvent:${type}`, event);
      this.emit('event', event.toJSON());
      
      return event;
    } catch (error) {
      console.error('Error emitting security event:', error);
      this.metrics.errors++;
      throw error;
    }
  }

  emitAuthEvent(type, userId, success, details = {}, context = {}) {
    const severity = success ? SECURITY_SEVERITY.INFO : SECURITY_SEVERITY.HIGH;
    const message = success 
      ? `Authentication successful for user ${userId}`
      : `Authentication failed for user ${userId}`;

    return this.emitSecurityEvent(
      type,
      severity,
      SECURITY_CATEGORIES.AUTHENTICATION,
      message,
      { userId, success, ...details },
      { userId, ...context }
    );
  }

  emitDataEvent(type, userId, resource, action, details = {}, context = {}) {
    const severity = this.getDataAccessSeverity(action);
    const message = `Data ${action}: ${userId} performed ${action} on ${resource}`;

    return this.emitSecurityEvent(
      type,
      severity,
      SECURITY_CATEGORIES.DATA_ACCESS,
      message,
      { userId, resource, action, ...details },
      { userId, ...context }
    );
  }

  emitManufacturingEvent(type, equipmentId, details = {}, context = {}) {
    const severity = this.getManufacturingSeverity(type);
    const message = `Manufacturing event: ${type} for equipment ${equipmentId}`;

    return this.emitSecurityEvent(
      type,
      severity,
      SECURITY_CATEGORIES.MANUFACTURING,
      message,
      { equipmentId, ...details },
      context
    );
  }

  updateMetrics(event) {
    this.metrics.totalEvents++;
    const typeCount = this.metrics.eventsByType.get(event.type) || 0;
    this.metrics.eventsByType.set(event.type, typeCount + 1);
    const severityCount = this.metrics.eventsBySeverity.get(event.severity) || 0;
    this.metrics.eventsBySeverity.set(event.severity, severityCount + 1);
  }

  getEvent(eventId) {
    return this.eventStore.get(eventId);
  }

  getEventsByType(type, limit = 100) {
    return Array.from(this.eventStore.values())
      .filter(event => event.type === type)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }

  getRecentEvents(limit = 100) {
    return Array.from(this.eventStore.values())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }

  getMetrics() {
    return {
      ...this.metrics,
      eventsByType: Object.fromEntries(this.metrics.eventsByType),
      eventsBySeverity: Object.fromEntries(this.metrics.eventsBySeverity),
      eventStoreSize: this.eventStore.size
    };
  }

  getDataAccessSeverity(action) {
    const severityMap = {
      'read': SECURITY_SEVERITY.INFO,
      'write': SECURITY_SEVERITY.MEDIUM,
      'delete': SECURITY_SEVERITY.HIGH,
      'export': SECURITY_SEVERITY.MEDIUM
    };
    return severityMap[action] || SECURITY_SEVERITY.INFO;
  }

  getManufacturingSeverity(type) {
    const severityMap = {
      [SECURITY_EVENT_TYPES.MANUFACTURING_ERROR]: SECURITY_SEVERITY.HIGH
    };
    return severityMap[type] || SECURITY_SEVERITY.INFO;
  }

  /**
   * Create event listener for specific event types
   */
  onSecurityEvent(type, callback) {
    this.on(`securityEvent:${type}`, callback);
  }

  /**
   * Create event listener for specific severity levels
   */
  onSeverity(severity, callback) {
    this.on(`securityEvent:${severity}`, callback);
  }

  /**
   * Create event listener for specific categories
   */
  onCategory(category, callback) {
    this.on(`securityEvent:${category}`, callback);
  }
}

export {
  SecurityEventEmitter,
  SecurityEvent,
  SecurityEventContext,
  SECURITY_EVENT_TYPES,
  SECURITY_SEVERITY,
  SECURITY_CATEGORIES
};
