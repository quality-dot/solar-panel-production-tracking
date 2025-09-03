# Task 22.3 Implementation Plan: Event Collection System
## Lightweight Event Bus Implementation for Manufacturing Security

**Date:** 2025-08-28  
**Task:** 22.3 - Event Collection System  
**Status:** 📋 IMPLEMENTATION PLAN READY  
**Approach:** Lightweight Event Bus (Recommended)  
**Timeline:** 2 days implementation  
**Dependencies:** Task 22.1 (Winston Logging) ✅ COMPLETED + ENHANCED  

---

## 🎯 **Implementation Overview**

### **Architecture Decision: Lightweight Event Bus**
Based on research findings, we're implementing a **Lightweight Event Bus** approach because it provides:

- ✅ **Simplicity**: Easy to implement and understand
- ✅ **Performance**: Meets manufacturing event volume requirements  
- ✅ **Flexibility**: Easy to extend and modify
- ✅ **Integration**: Seamless integration with existing Winston logging
- ✅ **Compliance**: Supports all required compliance frameworks
- ✅ **Future Ready**: Foundation for advanced features

### **Core Components**
1. **SecurityEventEmitter**: Core event management class
2. **Event Store**: PostgreSQL with JSONB for flexible event data
3. **Event Handlers**: Security, manufacturing, and data event processing
4. **Real-time Updates**: WebSocket for live event streaming
5. **Integration Points**: Winston logging, encryption service, existing systems

---

## 🏗️ **Implementation Architecture**

### **System Architecture**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Event Source  │───▶│  Event Bus      │───▶│ Event Handlers  │
│   (Winston)     │    │  (Node.js)      │    │ (Security, DB)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Event Store   │    │ Real-time       │    │ Event          │
│   (PostgreSQL)  │    │ Processing      │    │ Analytics      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Data Flow**
1. **Winston Logging** → Generates security events
2. **Event Bus** → Routes events to appropriate handlers
3. **Event Store** → Persists events to PostgreSQL
4. **Event Handlers** → Process events for security monitoring
5. **Real-time Updates** → WebSocket broadcasts for live monitoring

---

## 📅 **Implementation Timeline**

### **Day 1: Foundation (4-6 hours)**
- **Morning**: Database schema and event store setup
- **Afternoon**: SecurityEventEmitter class implementation
- **Evening**: Basic event types and structures

### **Day 2: Integration & Testing (4-6 hours)**
- **Morning**: Winston integration and event handlers
- **Afternoon**: Real-time updates and WebSocket setup
- **Evening**: Testing and documentation

---

## 🔧 **Implementation Details**

### **1. Database Schema Setup**

#### **Security Events Table**
```sql
-- Create security_events table
CREATE TABLE security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB NOT NULL,
  context JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  correlation_id VARCHAR(100),
  user_id VARCHAR(100),
  source_ip INET,
  severity VARCHAR(20) DEFAULT 'info',
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_security_events_type ON security_events(event_type);
CREATE INDEX idx_security_events_timestamp ON security_events(timestamp);
CREATE INDEX idx_security_events_user ON security_events(user_id);
CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_correlation ON security_events(correlation_id);

-- JSONB index for flexible queries
CREATE INDEX idx_security_events_data ON security_events USING GIN(event_data);

-- Partitioning for large volumes (future)
-- CREATE TABLE security_events_2025_08 PARTITION OF security_events
-- FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
```

#### **Event Metrics Table**
```sql
-- Create event_metrics table for performance monitoring
CREATE TABLE event_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type VARCHAR(100) NOT NULL,
  metric_value NUMERIC NOT NULL,
  event_count INTEGER DEFAULT 0,
  time_period VARCHAR(20) NOT NULL, -- hour, day, week, month
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for metrics
CREATE INDEX idx_event_metrics_type ON event_metrics(metric_type);
CREATE INDEX idx_event_metrics_period ON event_metrics(period_start, period_end);
```

### **2. SecurityEventEmitter Class**

#### **Core Class Structure**
```javascript
// backend/services/securityEventEmitter.js
import { EventEmitter } from 'events';
import { EventStore } from './eventStore.js';
import { EventMetrics } from './eventMetrics.js';
import loggerService from './loggerService.js';

export class SecurityEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.eventStore = new EventStore();
    this.metrics = new EventMetrics();
    this.handlers = new Map();
    this.setupDefaultHandlers();
  }
  
  // Emit security events with automatic persistence
  async emitSecurityEvent(eventType, data, context = {}) {
    try {
      const event = this.createSecurityEvent(eventType, data, context);
      
      // Persist to database
      await this.eventStore.persist(event);
      
      // Update metrics
      this.metrics.record(event);
      
      // Emit event for real-time processing
      this.emit(eventType, event);
      
      // Log event emission
      loggerService.logSecurity('info', `Security event emitted: ${eventType}`, {
        eventId: event.id,
        eventType,
        timestamp: event.timestamp,
        severity: event.severity
      });
      
      return event;
    } catch (error) {
      loggerService.logSecurity('error', 'Failed to emit security event', {
        eventType,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
  
  // Create standardized security event
  createSecurityEvent(eventType, data, context) {
    return {
      id: crypto.randomUUID(),
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
  
  // Determine event severity based on type and data
  determineSeverity(eventType, data) {
    const severityMap = {
      'user.login': 'info',
      'user.logout': 'info',
      'permission.change': 'warn',
      'access.denied': 'warn',
      'security.violation': 'error',
      'system.error': 'error',
      'data.access': 'info',
      'encryption.event': 'info',
      'compliance.action': 'warn'
    };
    
    return severityMap[eventType] || 'info';
  }
  
  // Register event handlers
  registerHandler(eventType, handler) {
    this.handlers.set(eventType, handler);
    this.on(eventType, handler);
    
    loggerService.logSecurity('info', `Handler registered for event type: ${eventType}`);
  }
  
  // Setup default handlers
  setupDefaultHandlers() {
    // Default security event handler
    this.registerHandler('*', (event) => {
      loggerService.logSecurity('debug', 'Default security event handler', {
        eventId: event.id,
        eventType: event.eventType
      });
    });
  }
}
```

### **3. Event Store Service**

#### **Database Operations**
```javascript
// backend/services/eventStore.js
import { Pool } from 'pg';
import loggerService from './loggerService.js';

export class EventStore {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  
  // Persist event to database
  async persist(event) {
    const client = await this.pool.connect();
    
    try {
      const query = `
        INSERT INTO security_events (
          id, event_type, event_data, context, timestamp, 
          correlation_id, user_id, source_ip, severity
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `;
      
      const values = [
        event.id,
        event.eventType,
        JSON.stringify(event.eventData),
        JSON.stringify(event.context),
        event.timestamp,
        event.correlationId,
        event.userId,
        event.sourceIp,
        event.severity
      ];
      
      const result = await client.query(query, values);
      
      loggerService.logSecurity('debug', 'Event persisted successfully', {
        eventId: result.rows[0].id,
        eventType: event.eventType
      });
      
      return result.rows[0].id;
    } catch (error) {
      loggerService.logSecurity('error', 'Failed to persist event', {
        eventId: event.id,
        eventType: event.eventType,
        error: error.message
      });
      throw error;
    } finally {
      client.release();
    }
  }
  
  // Retrieve events with filtering
  async getEvents(filters = {}, limit = 100, offset = 0) {
    const client = await this.pool.connect();
    
    try {
      let query = 'SELECT * FROM security_events WHERE 1=1';
      const values = [];
      let valueIndex = 1;
      
      // Add filters
      if (filters.eventType) {
        query += ` AND event_type = $${valueIndex++}`;
        values.push(filters.eventType);
      }
      
      if (filters.userId) {
        query += ` AND user_id = $${valueIndex++}`;
        values.push(filters.userId);
      }
      
      if (filters.severity) {
        query += ` AND severity = $${valueIndex++}`;
        values.push(filters.severity);
      }
      
      if (filters.startDate) {
        query += ` AND timestamp >= $${valueIndex++}`;
        values.push(filters.startDate);
      }
      
      if (filters.endDate) {
        query += ` AND timestamp <= $${valueIndex++}`;
        values.push(filters.endDate);
      }
      
      // Add ordering and pagination
      query += ` ORDER BY timestamp DESC LIMIT $${valueIndex++} OFFSET $${valueIndex++}`;
      values.push(limit, offset);
      
      const result = await client.query(query, values);
      
      return result.rows.map(row => ({
        ...row,
        eventData: JSON.parse(row.event_data),
        context: JSON.parse(row.context)
      }));
    } catch (error) {
      loggerService.logSecurity('error', 'Failed to retrieve events', {
        filters,
        error: error.message
      });
      throw error;
    } finally {
      client.release();
    }
  }
  
  // Get event statistics
  async getEventStats(timePeriod = '24h') {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT 
          event_type,
          severity,
          COUNT(*) as count,
          MIN(timestamp) as first_occurrence,
          MAX(timestamp) as last_occurrence
        FROM security_events
        WHERE timestamp >= NOW() - INTERVAL '${timePeriod}'
        GROUP BY event_type, severity
        ORDER BY count DESC
      `;
      
      const result = await client.query(query);
      return result.rows;
    } catch (error) {
      loggerService.logSecurity('error', 'Failed to get event statistics', {
        timePeriod,
        error: error.message
      });
      throw error;
    } finally {
      client.release();
    }
  }
}
```

### **4. Event Metrics Service**

#### **Performance Monitoring**
```javascript
// backend/services/eventMetrics.js
import { EventStore } from './eventStore.js';
import loggerService from './loggerService.js';

export class EventMetrics {
  constructor() {
    this.eventStore = new EventStore();
    this.metrics = new Map();
    this.startMetricsCollection();
  }
  
  // Record event for metrics
  async record(event) {
    try {
      // Update in-memory metrics
      this.updateInMemoryMetrics(event);
      
      // Update database metrics (async)
      this.updateDatabaseMetrics(event);
      
    } catch (error) {
      loggerService.logSecurity('error', 'Failed to record event metrics', {
        eventId: event.id,
        error: error.message
      });
    }
  }
  
  // Update in-memory metrics
  updateInMemoryMetrics(event) {
    const key = `${event.eventType}:${event.severity}`;
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        count: 0,
        lastOccurrence: null,
        totalProcessingTime: 0
      });
    }
    
    const metric = this.metrics.get(key);
    metric.count++;
    metric.lastOccurrence = new Date();
    
    // Calculate processing time if available
    if (event.context.processingTime) {
      metric.totalProcessingTime += event.context.processingTime;
    }
  }
  
  // Update database metrics
  async updateDatabaseMetrics(event) {
    try {
      // This would update the event_metrics table
      // Implementation depends on specific metrics requirements
    } catch (error) {
      // Log error but don't fail event processing
      loggerService.logSecurity('warn', 'Failed to update database metrics', {
        eventId: event.id,
        error: error.message
      });
    }
  }
  
  // Get current metrics
  getMetrics() {
    const metrics = {};
    
    for (const [key, value] of this.metrics) {
      metrics[key] = {
        ...value,
        averageProcessingTime: value.count > 0 ? 
          value.totalProcessingTime / value.count : 0
      };
    }
    
    return metrics;
  }
  
  // Start metrics collection
  startMetricsCollection() {
    // Collect metrics every minute
    setInterval(() => {
      this.collectMetrics();
    }, 60000);
  }
  
  // Collect and store metrics
  async collectMetrics() {
    try {
      const metrics = this.getMetrics();
      
      // Store metrics to database
      // Implementation depends on specific requirements
      
      loggerService.logSecurity('debug', 'Metrics collected successfully', {
        metricCount: Object.keys(metrics).length
      });
    } catch (error) {
      loggerService.logSecurity('error', 'Failed to collect metrics', {
        error: error.message
      });
    }
  }
}
```

### **5. Event Handlers**

#### **Security Event Handler**
```javascript
// backend/services/eventHandlers/securityEventHandler.js
import loggerService from '../loggerService.js';

export class SecurityEventHandler {
  constructor() {
    this.loginAttempts = new Map();
    this.suspiciousPatterns = new Map();
  }
  
  // Handle user login events
  async handleUserLogin(event) {
    try {
      // Check for suspicious patterns
      await this.checkLoginPatterns(event);
      
      // Update user session tracking
      await this.updateSessionTracking(event);
      
      // Generate security metrics
      await this.updateSecurityMetrics(event);
      
      loggerService.logSecurity('info', 'User login event processed', {
        userId: event.eventData.userId,
        eventId: event.id
      });
      
    } catch (error) {
      loggerService.logSecurity('error', 'Failed to process user login event', {
        eventId: event.id,
        error: error.message
      });
    }
  }
  
  // Handle quality control events
  async handleQualityCheck(event) {
    try {
      // Track quality trends
      await this.updateQualityMetrics(event);
      
      // Check for anomalies
      await this.detectQualityAnomalies(event);
      
      // Alert on quality issues
      if (event.eventData.qualityStatus === 'fail') {
        await this.alertQualityIssues(event);
      }
      
      loggerService.logSecurity('info', 'Quality check event processed', {
        panelId: event.eventData.panelId,
        qualityStatus: event.eventData.qualityStatus,
        eventId: event.id
      });
      
    } catch (error) {
      loggerService.logSecurity('error', 'Failed to process quality check event', {
        eventId: event.id,
        error: error.message
      });
    }
  }
  
  // Handle equipment status events
  async handleEquipmentStatus(event) {
    try {
      // Monitor equipment health
      await this.updateEquipmentHealth(event);
      
      // Predict maintenance needs
      await this.predictMaintenance(event);
      
      // Alert on equipment issues
      if (event.eventData.equipmentStatus === 'error') {
        await this.alertEquipmentIssues(event);
      }
      
      loggerService.logSecurity('info', 'Equipment status event processed', {
        stationId: event.eventData.stationId,
        equipmentStatus: event.eventData.equipmentStatus,
        eventId: event.id
      });
      
    } catch (error) {
      loggerService.logSecurity('error', 'Failed to process equipment status event', {
        eventId: event.id,
        error: error.message
      });
    }
  }
  
  // Check for suspicious login patterns
  async checkLoginPatterns(event) {
    const userId = event.eventData.userId;
    const sourceIp = event.eventData.sourceIp;
    const timestamp = event.timestamp;
    
    if (!this.loginAttempts.has(userId)) {
      this.loginAttempts.set(userId, []);
    }
    
    const attempts = this.loginAttempts.get(userId);
    attempts.push({ timestamp, sourceIp, success: event.eventData.success });
    
    // Keep only last 10 attempts
    if (attempts.length > 10) {
      attempts.shift();
    }
    
    // Check for suspicious patterns
    const recentAttempts = attempts.filter(
      attempt => timestamp - attempt.timestamp < 300000 // 5 minutes
    );
    
    if (recentAttempts.length >= 5) {
      await this.alertSuspiciousActivity(event, {
        type: 'multiple_login_attempts',
        attempts: recentAttempts.length,
        timeWindow: '5 minutes'
      });
    }
  }
  
  // Update session tracking
  async updateSessionTracking(event) {
    // Implementation for session tracking
    // This would integrate with existing session management
  }
  
  // Update security metrics
  async updateSecurityMetrics(event) {
    // Implementation for security metrics
    // This would update security dashboards and reports
  }
  
  // Alert on suspicious activity
  async alertSuspiciousActivity(event, details) {
    loggerService.logSecurity('warn', 'Suspicious activity detected', {
      eventId: event.id,
      userId: event.eventData.userId,
      details
    });
    
    // Additional alerting logic (email, SMS, dashboard)
  }
}
```

### **6. Real-time Event Streaming**

#### **WebSocket Implementation**
```javascript
// backend/services/eventWebSocket.js
import WebSocket from 'ws';
import loggerService from './loggerService.js';

export class EventWebSocket {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Map(); // Map client to subscription filters
    this.setupWebSocket();
    
    loggerService.logSecurity('info', 'Event WebSocket server initialized');
  }
  
  // Setup WebSocket server
  setupWebSocket() {
    this.wss.on('connection', (ws, request) => {
      const clientId = this.generateClientId();
      
      this.clients.set(ws, {
        id: clientId,
        filters: {},
        connectedAt: new Date(),
        ip: request.socket.remoteAddress
      });
      
      loggerService.logSecurity('info', 'WebSocket client connected', {
        clientId,
        ip: request.socket.remoteAddress
      });
      
      // Handle client messages
      ws.on('message', (message) => {
        this.handleClientMessage(ws, message);
      });
      
      // Handle client disconnect
      ws.on('close', () => {
        this.handleClientDisconnect(ws);
      });
      
      // Handle errors
      ws.on('error', (error) => {
        this.handleClientError(ws, error);
      });
      
      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connection_established',
        clientId,
        timestamp: new Date().toISOString()
      }));
    });
  }
  
  // Handle client messages (subscription filters)
  handleClientMessage(ws, message) {
    try {
      const data = JSON.parse(message);
      const client = this.clients.get(ws);
      
      if (data.type === 'subscribe') {
        client.filters = data.filters || {};
        
        ws.send(JSON.stringify({
          type: 'subscription_updated',
          filters: client.filters,
          timestamp: new Date().toISOString()
        }));
        
        loggerService.logSecurity('info', 'Client subscription updated', {
          clientId: client.id,
          filters: client.filters
        });
      }
      
    } catch (error) {
      loggerService.logSecurity('error', 'Failed to handle client message', {
        error: error.message
      });
    }
  }
  
  // Handle client disconnect
  handleClientDisconnect(ws) {
    const client = this.clients.get(ws);
    
    if (client) {
      loggerService.logSecurity('info', 'WebSocket client disconnected', {
        clientId: client.id,
        connectionDuration: Date.now() - client.connectedAt.getTime()
      });
      
      this.clients.delete(ws);
    }
  }
  
  // Handle client errors
  handleClientError(ws, error) {
    const client = this.clients.get(ws);
    
    loggerService.logSecurity('error', 'WebSocket client error', {
      clientId: client?.id,
      error: error.message
    });
  }
  
  // Broadcast events to connected clients
  broadcastEvent(event) {
    const eventMessage = JSON.stringify({
      type: 'security_event',
      event: {
        id: event.id,
        eventType: event.eventType,
        timestamp: event.timestamp,
        severity: event.severity,
        eventData: event.eventData
      }
    });
    
    let broadcastCount = 0;
    
    for (const [ws, client] of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        // Check if client is subscribed to this event type
        if (this.shouldSendToClient(event, client)) {
          ws.send(eventMessage);
          broadcastCount++;
        }
      }
    }
    
    loggerService.logSecurity('debug', 'Event broadcasted to clients', {
      eventId: event.id,
      eventType: event.eventType,
      clientCount: broadcastCount
    });
  }
  
  // Check if event should be sent to client based on filters
  shouldSendToClient(event, client) {
    if (!client.filters || Object.keys(client.filters).length === 0) {
      return true; // No filters, send all events
    }
    
    // Check event type filter
    if (client.filters.eventType && 
        client.filters.eventType !== event.eventType) {
      return false;
    }
    
    // Check severity filter
    if (client.filters.severity && 
        client.filters.severity !== event.severity) {
      return false;
    }
    
    // Check user filter
    if (client.filters.userId && 
        client.filters.userId !== event.userId) {
      return false;
    }
    
    return true;
  }
  
  // Generate unique client ID
  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Get connection statistics
  getConnectionStats() {
    const stats = {
      totalConnections: this.clients.size,
      activeConnections: 0,
      connections: []
    };
    
    for (const [ws, client] of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        stats.activeConnections++;
        stats.connections.push({
          id: client.id,
          connectedAt: client.connectedAt,
          ip: client.ip,
          filters: client.filters
        });
      }
    }
    
    return stats;
  }
}
```

---

## 🔌 **Integration Points**

### **1. Winston Logging Integration**

#### **Event Collection from Logs**
```javascript
// backend/middleware/securityEventMiddleware.js
import { securityEventEmitter } from '../services/securityEventEmitter.js';
import loggerService from '../services/loggerService.js';

export const securityEventMiddleware = (req, res, next) => {
  // Capture request start time
  const startTime = Date.now();
  
  // Override res.end to capture response data
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    // Calculate processing time
    const processingTime = Date.now() - startTime;
    
    // Emit security event for API access
    securityEventEmitter.emitSecurityEvent('api.access', {
      endpoint: req.path,
      method: req.method,
      statusCode: res.statusCode,
      processingTime,
      userAgent: req.get('User-Agent'),
      sourceIp: req.ip
    }, {
      userId: req.user?.id,
      correlationId: req.correlationId,
      source: 'api-middleware'
    });
    
    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};
```

### **2. Encryption Service Integration**

#### **Encryption Event Collection**
```javascript
// backend/services/encryptionService.js (enhanced)
// Add event emission to existing encryption operations

async encryptField(value, keyType, context = {}) {
  try {
    const startTime = Date.now();
    
    // ... existing encryption logic ...
    
    // Emit encryption event
    securityEventEmitter.emitSecurityEvent('encryption.event', {
      operation: 'encrypt',
      keyType,
      dataLength: value.length,
      processingTime: Date.now() - startTime,
      success: true
    }, {
      userId: context.userId,
      correlationId: context.correlationId,
      source: 'encryption-service'
    });
    
    return encryptedField;
  } catch (error) {
    // Emit encryption failure event
    securityEventEmitter.emitSecurityEvent('encryption.event', {
      operation: 'encrypt',
      keyType,
      error: error.message,
      success: false
    }, {
      userId: context.userId,
      correlationId: context.correlationId,
      source: 'encryption-service'
    });
    
    throw error;
  }
}
```

---

## 🧪 **Testing Strategy**

### **1. Unit Tests**

#### **SecurityEventEmitter Tests**
```javascript
// backend/__tests__/services/securityEventEmitter.test.js
import { SecurityEventEmitter } from '../../services/securityEventEmitter.js';
import { EventStore } from '../../services/eventStore.js';

describe('SecurityEventEmitter', () => {
  let eventEmitter;
  let mockEventStore;
  
  beforeEach(() => {
    mockEventStore = {
      persist: jest.fn().mockResolvedValue('test-id')
    };
    
    eventEmitter = new SecurityEventEmitter();
    eventEmitter.eventStore = mockEventStore;
  });
  
  test('should emit security event successfully', async () => {
    const eventData = { userId: 'test-user', action: 'login' };
    const context = { source: 'test' };
    
    const event = await eventEmitter.emitSecurityEvent('user.login', eventData, context);
    
    expect(event).toBeDefined();
    expect(event.eventType).toBe('user.login');
    expect(event.eventData).toEqual(eventData);
    expect(mockEventStore.persist).toHaveBeenCalledWith(event);
  });
  
  test('should determine correct severity for different event types', () => {
    expect(eventEmitter.determineSeverity('user.login', {})).toBe('info');
    expect(eventEmitter.determineSeverity('security.violation', {})).toBe('error');
    expect(eventEmitter.determineSeverity('unknown.type', {})).toBe('info');
  });
});
```

### **2. Integration Tests**

#### **End-to-End Event Flow**
```javascript
// backend/__tests__/integration/eventFlow.test.js
import request from 'supertest';
import { app } from '../../server.js';
import { securityEventEmitter } from '../../services/securityEventEmitter.js';
import { EventStore } from '../../services/eventStore.js';

describe('Event Flow Integration', () => {
  let eventStore;
  
  beforeEach(async () => {
    eventStore = new EventStore();
    // Setup test database
  });
  
  test('should collect events from API requests', async () => {
    // Make API request
    const response = await request(app)
      .get('/api/test')
      .set('Authorization', 'Bearer test-token');
    
    expect(response.status).toBe(200);
    
    // Verify event was collected
    const events = await eventStore.getEvents({
      eventType: 'api.access',
      startDate: new Date(Date.now() - 60000) // Last minute
    });
    
    expect(events).toHaveLength(1);
    expect(events[0].eventData.endpoint).toBe('/api/test');
  });
  
  test('should emit events to WebSocket clients', async () => {
    // Setup WebSocket connection
    // Emit test event
    // Verify WebSocket received event
  });
});
```

---

## 📊 **Performance Benchmarks**

### **1. Event Processing Performance**
- **Target**: <10ms event processing latency
- **Test Method**: Measure time from event emission to database persistence
- **Success Criteria**: 95% of events processed within target latency

### **2. Event Storage Performance**
- **Target**: <5ms database write latency
- **Test Method**: Measure database insert performance
- **Success Criteria**: 99% of events stored within target latency

### **3. Event Retrieval Performance**
- **Target**: <50ms query latency
- **Test Method**: Measure database query performance
- **Success Criteria**: 95% of queries complete within target latency

### **4. Real-time Update Performance**
- **Target**: <100ms end-to-end latency
- **Test Method**: Measure WebSocket broadcast performance
- **Success Criteria**: 95% of updates delivered within target latency

---

## 🔒 **Security & Compliance**

### **1. Event Security**
- **Event Integrity**: Digital signatures for critical events
- **Access Control**: Role-based event access
- **Data Protection**: Encryption for sensitive event data
- **Audit Trail**: Complete event modification history

### **2. Compliance Coverage**
- **ISA-99/IEC 62443**: Industrial control system events
- **NIST CSF**: All framework functions covered
- **GDPR**: Data processing event tracking
- **Manufacturing Standards**: Industry-specific requirements

---

## 🎯 **Success Metrics**

### **1. Functional Metrics**
- **Event Collection**: 100% of security events collected
- **Event Persistence**: 100% of events successfully stored
- **Event Processing**: All events processed within SLA
- **Real-time Updates**: <100ms end-to-end latency

### **2. Performance Metrics**
- **Event Throughput**: Support target event volume
- **Storage Performance**: Meet latency requirements
- **Query Performance**: Fast event retrieval and analysis
- **System Reliability**: 99.9% uptime target

### **3. Compliance Metrics**
- **ISA-99 Compliance**: 100% industrial control event coverage
- **NIST CSF Coverage**: All framework functions covered
- **GDPR Compliance**: Complete data processing event tracking
- **Audit Trail**: 100% event audit trail coverage

---

## 🚀 **Implementation Steps**

### **Day 1: Foundation**
1. **Database Setup**: Create security_events and event_metrics tables
2. **Event Store**: Implement EventStore service with PostgreSQL
3. **Event Emitter**: Create SecurityEventEmitter class
4. **Basic Handlers**: Implement core event handling logic

### **Day 2: Integration & Testing**
1. **Winston Integration**: Connect event collection to logging system
2. **Event Handlers**: Implement security, manufacturing, and data handlers
3. **Real-time Updates**: Setup WebSocket for live event streaming
4. **Testing**: Comprehensive testing and validation
5. **Documentation**: API documentation and usage examples

---

## 🎉 **Expected Outcomes**

### **Immediate Benefits**
- **Real-time Monitoring**: Live security event monitoring
- **Complete Audit Trail**: Full event history and tracking
- **Compliance Ready**: Framework for regulatory compliance
- **Performance Insights**: Event-based performance monitoring

### **Long-term Benefits**
- **Threat Detection**: Foundation for anomaly detection
- **Predictive Analytics**: Event-based predictive capabilities
- **Enterprise Integration**: Ready for SIEM and APM integration
- **Cloud Migration**: Foundation for cloud-based event processing

The Lightweight Event Bus approach provides a solid, scalable foundation for manufacturing security event collection while maintaining simplicity and performance for current needs.
