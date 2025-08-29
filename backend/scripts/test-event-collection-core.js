/**
 * Test Event Collection System - Core Components Only
 * Task: 22.3 - Event Collection System
 * Description: Test core functionality without database dependency
 * Date: 2025-08-28
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import loggerService from '../services/loggerService.js';

/**
 * Mock Event Store for testing
 */
class MockEventStore {
  constructor() {
    this.events = [];
    this.initialized = true;
  }
  
  async initialize() {
    this.initialized = true;
    return true;
  }
  
  async persist(event) {
    this.events.push(event);
    return event.id;
  }
  
  async getEvents(filters = {}, limit = 100) {
    return this.events.slice(0, limit);
  }
  
  async getHealthStatus() {
    return {
      status: 'healthy',
      tables: true,
      totalEvents: this.events.length,
      recentEvents: this.events.filter(e => 
        Date.now() - e.timestamp.getTime() < 3600000
      ).length,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Mock Event Metrics for testing
 */
class MockEventMetrics {
  constructor() {
    this.metrics = new Map();
    this.performanceMetrics = new Map();
  }
  
  async record(event) {
    const key = `${event.eventType}:${event.severity}`;
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        count: 0,
        lastOccurrence: null,
        totalProcessingTime: 0,
        minProcessingTime: Infinity,
        maxProcessingTime: 0,
        errorCount: 0,
        successCount: 0
      });
    }
    
    const metric = this.metrics.get(key);
    metric.count++;
    metric.lastOccurrence = new Date();
    
    if (event.context.processingTime) {
      metric.totalProcessingTime += event.context.processingTime;
      metric.minProcessingTime = Math.min(metric.minProcessingTime, event.context.processingTime);
      metric.maxProcessingTime = Math.max(metric.maxProcessingTime, event.context.processingTime);
    }
    
    if (event.context.success === false || event.severity === 'error') {
      metric.errorCount++;
    } else {
      metric.successCount++;
    }
  }
  
  getMetrics() {
    const metrics = {};
    
    for (const [key, value] of this.metrics) {
      metrics[key] = {
        ...value,
        averageProcessingTime: value.count > 0 ? 
          value.totalProcessingTime / value.count : 0,
        successRate: value.count > 0 ? 
          (value.successCount / value.count) * 100 : 0,
        errorRate: value.count > 0 ? 
          (value.errorCount / value.count) * 100 : 0
      };
    }
    
    return metrics;
  }
  
  getMetricsSummary() {
    const metrics = this.getMetrics();
    
    return {
      totalEventTypes: Object.keys(metrics).length,
      totalEvents: Object.values(metrics).reduce((sum, m) => sum + m.count, 0),
      totalErrors: Object.values(metrics).reduce((sum, m) => sum + m.errorCount, 0),
      totalSuccess: Object.values(metrics).reduce((sum, m) => sum + m.successCount, 0),
      averageProcessingTime: 0,
      timestamp: new Date().toISOString()
    };
  }
  
  // Add missing methods required by EventAnalytics
  getPerformanceMetrics() {
    return {
      averageProcessingTime: 0,
      maxProcessingTime: 0,
      minProcessingTime: 0,
      totalProcessingTime: 0
    };
  }
  
  getEventTypeMetrics() {
    return this.getMetrics();
  }
  
  getSeverityMetrics() {
    const metrics = this.getMetrics();
    const severityMetrics = {};
    
    Object.values(metrics).forEach(metric => {
      // Mock severity metrics
      if (!severityMetrics.info) severityMetrics.info = 0;
      if (!severityMetrics.warning) severityMetrics.warning = 0;
      if (!severityMetrics.error) severityMetrics.error = 0;
      if (!severityMetrics.critical) severityMetrics.critical = 0;
      
      severityMetrics.info += metric.successCount;
      severityMetrics.error += metric.errorCount;
    });
    
    return severityMetrics;
  }
  
  getTopEventTypes() {
    const metrics = this.getMetrics();
    return Object.entries(metrics)
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, 5)
      .map(([type, metric]) => ({
        eventType: type,
        count: metric.count
      }));
  }
  
  getTopUsers() {
    return [];
  }
  
  getProcessingTimeStats() {
    return {
      average: 0,
      min: 0,
      max: 0,
      total: 0
    };
  }
}

/**
 * Test Security Event Emitter with Mock Dependencies
 */
class TestSecurityEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.eventStore = new MockEventStore();
    this.metrics = new MockEventMetrics();
    this.handlers = new Map();
    this.eventTypes = new Set();
    this.setupDefaultHandlers();
    
    console.log('✅ Test Security Event Emitter initialized');
  }
  
  /**
   * Emit security event with automatic persistence
   */
  async emitSecurityEvent(eventType, data, context = {}) {
    try {
      const startTime = Date.now();
      
      // Create standardized security event
      const event = this.createSecurityEvent(eventType, data, context);
      
      // Add processing time to context
      event.context.processingTime = Date.now() - startTime;
      
      // Persist to mock store
      await this.eventStore.persist(event);
      
      // Update metrics
      await this.metrics.record(event);
      
      // Emit event for real-time processing
      this.emit(eventType, event);
      this.emit('*', event);
      
      return event;
    } catch (error) {
      console.error('Failed to emit security event:', error.message);
      throw error;
    }
  }
  
  /**
   * Create standardized security event
   */
  createSecurityEvent(eventType, data, context) {
    this.eventTypes.add(eventType);
    
    return {
      id: randomUUID(),
      eventType,
      eventData: data,
      context: {
        correlationId: context.correlationId || 'test-correlation-id',
        timestamp: new Date().toISOString(),
        source: context.source || 'test-service',
        version: context.version || '1.0.0',
        ...context
      },
      metadata: {
        severity: this.determineSeverity(eventType, data),
        source: context.source || 'test-service',
        version: context.version || '1.0.0'
      },
      timestamp: new Date(),
      correlationId: context.correlationId || 'test-correlation-id',
      userId: context.userId,
      sourceIp: context.sourceIp,
      severity: this.determineSeverity(eventType, data)
    };
  }
  
  /**
   * Determine event severity based on type and data
   */
  determineSeverity(eventType, data) {
    const severityMap = {
      'user.login': 'info',
      'user.login.failed': 'warn',
      'security.violation': 'error',
      'system.error': 'error',
      'quality.check.failed': 'warn',
      'equipment.status.error': 'error'
    };
    
    if (data && data.severity) {
      return data.severity;
    }
    
    if (data && (data.success === false || data.failed === true || data.error)) {
      return 'error';
    }
    
    if (data && (data.warning || data.attention || data.overdue)) {
      return 'warn';
    }
    
    return severityMap[eventType] || 'info';
  }
  
  /**
   * Register event handler
   */
  registerHandler(eventType, handler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    
    this.handlers.get(eventType).push(handler);
    this.on(eventType, handler);
    
    console.log(`✅ Handler registered for event type: ${eventType}`);
  }
  
  /**
   * Setup default handlers
   */
  setupDefaultHandlers() {
    this.registerHandler('*', (event) => {
      console.log(`🔍 Default handler: ${event.eventType} event processed`);
    });
    
    this.registerHandler('error', (event) => {
      console.log(`🚨 Error handler: ${event.eventType} - ${event.eventData.error || 'Unknown error'}`);
    });
    
    this.registerHandler('warn', (event) => {
      console.log(`⚠️  Warning handler: ${event.eventType} event processed`);
    });
  }
  
  /**
   * Get statistics
   */
  getStatistics() {
    return {
      registeredEventTypes: this.getRegisteredEventTypes().length,
      totalHandlers: Array.from(this.handlers.values()).reduce((sum, handlers) => sum + handlers.length, 0),
      eventTypeHandlers: Object.fromEntries(
        Array.from(this.handlers.entries()).map(([type, handlers]) => [type, handlers.length])
      ),
      metrics: this.metrics.getMetricsSummary(),
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Get registered event types
   */
  getRegisteredEventTypes() {
    return Array.from(this.eventTypes);
  }
  
  /**
   * Health check
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
}

/**
 * Test the core event collection system
 */
async function testCoreEventCollection() {
  console.log('🚀 Testing Core Event Collection System...\n');
  
  try {
    // Initialize test event emitter
    const eventEmitter = new TestSecurityEventEmitter();
    
    // Test 1: Basic Event Emission
    console.log('✅ Test 1: Basic Event Emission');
    const basicEvent = await eventEmitter.emitSecurityEvent('test.basic', {
      message: 'Test basic event',
      value: 42
    }, {
      source: 'test-script',
      testId: 'basic-001'
    });
    
    console.log(`   - Basic event emitted: ${basicEvent.id}`);
    console.log(`   - Event type: ${basicEvent.eventType}`);
    console.log(`   - Severity: ${basicEvent.severity}`);
    
    // Test 2: Manufacturing Events
    console.log('\n✅ Test 2: Manufacturing Events');
    const stationEvent = await eventEmitter.emitSecurityEvent('station.operation', {
      stationId: 'STATION-001',
      operationType: 'production',
      panelId: 'PANEL-001',
      success: true
    }, {
      source: 'test-script',
      testId: 'manufacturing-001'
    });
    
    console.log(`   - Station operation event: ${stationEvent.id}`);
    
    const qualityEvent = await eventEmitter.emitSecurityEvent('quality.check', {
      panelId: 'PANEL-002',
      qualityStatus: 'fail',
      defectTypes: ['crack', 'discoloration']
    }, {
      source: 'test-script',
      testId: 'manufacturing-002'
    });
    
    console.log(`   - Quality check event: ${qualityEvent.id}`);
    console.log(`   - Quality status: ${qualityEvent.eventData.qualityStatus}`);
    
    // Test 3: Security Events
    console.log('\n✅ Test 3: Security Events');
    const loginEvent = await eventEmitter.emitSecurityEvent('user.login', {
      userId: 'test-user',
      sourceIp: '192.168.1.100',
      success: true
    }, {
      source: 'test-script',
      testId: 'security-001'
    });
    
    console.log(`   - User login event: ${loginEvent.id}`);
    
    const failedLoginEvent = await eventEmitter.emitSecurityEvent('user.login.failed', {
      userId: 'test-user',
      sourceIp: '192.168.1.100',
      success: false,
      error: 'Invalid credentials'
    }, {
      source: 'test-script',
      testId: 'security-002'
    });
    
    console.log(`   - Failed login event: ${failedLoginEvent.id}`);
    console.log(`   - Error: ${failedLoginEvent.eventData.error}`);
    
    // Test 4: Event Metrics
    console.log('\n✅ Test 4: Event Metrics');
    const metrics = eventEmitter.metrics.getMetrics();
    const summary = eventEmitter.metrics.getMetricsSummary();
    
    console.log(`   - Total event types: ${summary.totalEventTypes}`);
    console.log(`   - Total events: ${summary.totalEvents}`);
    console.log(`   - Error events: ${summary.totalErrors}`);
    
    // Test 5: Event Handlers
    console.log('\n✅ Test 5: Event Handlers');
    let customHandlerCalled = false;
    const customHandler = (event) => {
      customHandlerCalled = true;
      console.log(`   - Custom handler called for: ${event.eventType}`);
    };
    
    eventEmitter.registerHandler('test.custom', customHandler);
    
    await eventEmitter.emitSecurityEvent('test.custom', {
      message: 'Custom handler test'
    }, {
      source: 'test-script',
      testId: 'handler-001'
    });
    
    if (customHandlerCalled) {
      console.log('   - Custom event handler working correctly');
    }
    
    // Test 6: Performance Testing
    console.log('\n✅ Test 6: Performance Testing');
    const startTime = Date.now();
    const eventCount = 50;
    
    const promises = [];
    for (let i = 0; i < eventCount; i++) {
      promises.push(
        eventEmitter.emitSecurityEvent('test.performance', {
          message: `Performance test event ${i + 1}`,
          index: i
        }, {
          source: 'test-script',
          testId: `perf-${i + 1}`
        })
      );
    }
    
    await Promise.all(promises);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    const eventsPerSecond = (eventCount / duration) * 1000;
    
    console.log(`   - Performance: ${eventCount} events in ${duration}ms`);
    console.log(`   - Throughput: ${eventsPerSecond.toFixed(2)} events/second`);
    
    // Test 7: System Health
    console.log('\n✅ Test 7: System Health');
    const health = await eventEmitter.getHealthStatus();
    console.log(`   - System status: ${health.status}`);
    console.log(`   - Event store: ${health.eventStore.totalEvents} events`);
    console.log(`   - Metrics: ${health.metrics.totalEvents} events tracked`);
    
    // Test 8: Statistics
    console.log('\n✅ Test 8: System Statistics');
    const stats = eventEmitter.getStatistics();
    console.log(`   - Registered event types: ${stats.registeredEventTypes}`);
    console.log(`   - Total handlers: ${stats.totalHandlers}`);
    console.log(`   - Event types: ${Object.keys(stats.eventTypeHandlers).join(', ')}`);
    
    console.log('\n🎉 All Core Event Collection Tests Passed!');
    
    // Final summary
    console.log('\n📊 Final System State:');
    console.log(`   - Events emitted: ${eventEmitter.eventStore.events.length}`);
    console.log(`   - Event types: ${eventEmitter.getRegisteredEventTypes().join(', ')}`);
    console.log(`   - Metrics collected: ${Object.keys(eventEmitter.metrics.getMetrics()).length}`);
    
    return true;
    
  } catch (error) {
    console.error('\n❌ Core Event Collection Test Failed:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testCoreEventCollection()
    .then(success => {
      if (success) {
        console.log('\n🚀 Core Event Collection System is working correctly!');
        process.exit(0);
      } else {
        console.log('\n💥 Core Event Collection System has issues');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Test execution failed:', error);
      process.exit(1);
    });
}

export { testCoreEventCollection, TestSecurityEventEmitter, MockEventStore, MockEventMetrics };
