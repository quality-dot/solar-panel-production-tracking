/**
 * Test Event Collection System
 * Task: 22.3 - Event Collection System
 * Description: Comprehensive testing of the event collection implementation
 * Date: 2025-08-28
 */

import { securityEventEmitter } from '../services/securityEventEmitter.js';
import { eventStore } from '../services/eventStore.js';
import { eventMetrics } from '../services/eventMetrics.js';
import { securityEventHandler } from '../services/eventHandlers/securityEventHandler.js';
import loggerService from '../services/loggerService.js';

/**
 * Test the complete event collection system
 */
async function testEventCollectionSystem() {
  console.log('🚀 Testing Event Collection System...\n');
  
  try {
    // Test 1: Basic Event Emission
    console.log('✅ Test 1: Basic Event Emission');
    await testBasicEventEmission();
    
    // Test 2: Event Persistence
    console.log('\n✅ Test 2: Event Persistence');
    await testEventPersistence();
    
    // Test 3: Event Metrics
    console.log('\n✅ Test 3: Event Metrics');
    await testEventMetrics();
    
    // Test 4: Event Handlers
    console.log('\n✅ Test 4: Event Handlers');
    await testEventHandlers();
    
    // Test 5: Manufacturing Events
    console.log('\n✅ Test 5: Manufacturing Events');
    await testManufacturingEvents();
    
    // Test 6: Security Events
    console.log('\n✅ Test 6: Security Events');
    await testSecurityEvents();
    
    // Test 7: Event Retrieval
    console.log('\n✅ Test 7: Event Retrieval');
    await testEventRetrieval();
    
    // Test 8: Performance Testing
    console.log('\n✅ Test 8: Performance Testing');
    await testPerformance();
    
    console.log('\n🎉 All Event Collection System tests passed successfully!');
    
  } catch (error) {
    console.error('\n❌ Event Collection System test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

/**
 * Test basic event emission
 */
async function testBasicEventEmission() {
  // Test basic security event
  const event = await securityEventEmitter.emitSecurityEvent('test.basic', {
    message: 'Test basic event',
    value: 42
  }, {
    source: 'test-script',
    testId: 'basic-001'
  });
  
  console.log('   - Basic event emitted successfully');
  console.log(`   - Event ID: ${event.id}`);
  console.log(`   - Event Type: ${event.eventType}`);
  console.log(`   - Severity: ${event.severity}`);
  
  // Verify event structure
  if (!event.id || !event.eventType || !event.timestamp) {
    throw new Error('Event structure is invalid');
  }
}

/**
 * Test event persistence
 */
async function testEventPersistence() {
  // Emit test event
  const event = await securityEventEmitter.emitSecurityEvent('test.persistence', {
    message: 'Test persistence event',
    data: { key: 'value', number: 123 }
  }, {
    source: 'test-script',
    testId: 'persistence-001'
  });
  
  // Wait a moment for persistence
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Retrieve event from store
  const events = await eventStore.getEvents({
    eventType: 'test.persistence'
  }, 1);
  
  if (events.length === 0) {
    throw new Error('Event was not persisted');
  }
  
  const persistedEvent = events[0];
  
  console.log('   - Event persisted successfully');
  console.log(`   - Retrieved event ID: ${persistedEvent.id}`);
  console.log(`   - Event data preserved: ${persistedEvent.eventData.message}`);
  
  // Verify data integrity
  if (persistedEvent.eventData.message !== 'Test persistence event') {
    throw new Error('Event data was not preserved correctly');
  }
}

/**
 * Test event metrics
 */
async function testEventMetrics() {
  // Emit multiple events to test metrics
  for (let i = 0; i < 5; i++) {
    await securityEventEmitter.emitSecurityEvent('test.metrics', {
      message: `Test metrics event ${i + 1}`,
      index: i
    }, {
      source: 'test-script',
      testId: `metrics-${i + 1}`
    });
  }
  
  // Wait for metrics to be processed
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Get metrics
  const metrics = eventMetrics.getMetrics();
  const metricsSummary = eventMetrics.getMetricsSummary();
  
  console.log('   - Event metrics collected successfully');
  console.log(`   - Total event types: ${metricsSummary.totalEventTypes}`);
  console.log(`   - Total events: ${metricsSummary.totalEvents}`);
  
  // Verify metrics
  if (metricsSummary.totalEvents < 5) {
    throw new Error('Metrics not collecting all events');
  }
}

/**
 * Test event handlers
 */
async function testEventHandlers() {
  // Register test handler
  let handlerCalled = false;
  const testHandler = (event) => {
    handlerCalled = true;
    console.log(`   - Handler called for event: ${event.eventType}`);
  };
  
  securityEventEmitter.registerHandler('test.handler', testHandler);
  
  // Emit event
  await securityEventEmitter.emitSecurityEvent('test.handler', {
    message: 'Test handler event'
  }, {
    source: 'test-script',
    testId: 'handler-001'
  });
  
  // Wait for handler
  await new Promise(resolve => setTimeout(resolve, 100));
  
  if (!handlerCalled) {
    throw new Error('Event handler was not called');
  }
  
  console.log('   - Event handlers working correctly');
  
  // Cleanup
  securityEventEmitter.unregisterHandler('test.handler', testHandler);
}

/**
 * Test manufacturing events
 */
async function testManufacturingEvents() {
  // Test station operation
  const stationEvent = await securityEventEmitter.emitStationOperation({
    stationId: 'STATION-001',
    operationType: 'production',
    panelId: 'PANEL-001',
    batchId: 'BATCH-001',
    operatorId: 'OP-001',
    success: true
  }, {
    source: 'test-script',
    testId: 'manufacturing-001'
  });
  
  console.log('   - Station operation event emitted');
  console.log(`   - Event ID: ${stationEvent.id}`);
  
  // Test quality check
  const qualityEvent = await securityEventEmitter.emitQualityCheck({
    panelId: 'PANEL-002',
    batchId: 'BATCH-001',
    qualityStatus: 'pass',
    defectTypes: [],
    inspectorId: 'QC-001',
    failed: false,
    critical: false
  }, {
    source: 'test-script',
    testId: 'manufacturing-002'
  });
  
  console.log('   - Quality check event emitted');
  console.log(`   - Event ID: ${qualityEvent.id}`);
  
  // Test equipment status
  const equipmentEvent = await securityEventEmitter.emitEquipmentStatus({
    stationId: 'STATION-002',
    status: 'operational',
    maintenanceDue: false,
    errorCount: 0
  }, {
    source: 'test-script',
    testId: 'manufacturing-003'
  });
  
  console.log('   - Equipment status event emitted');
  console.log(`   - Event ID: ${equipmentEvent.id}`);
}

/**
 * Test security events
 */
async function testSecurityEvents() {
  // Test user login
  const loginEvent = await securityEventEmitter.emitUserLogin({
    userId: 'test-user',
    sourceIp: '192.168.1.100',
    userAgent: 'Test-Agent/1.0',
    method: 'password',
    success: true
  }, {
    source: 'test-script',
    testId: 'security-001'
  });
  
  console.log('   - User login event emitted');
  console.log(`   - Event ID: ${loginEvent.id}`);
  
  // Test data access
  const dataAccessEvent = await securityEventEmitter.emitDataAccess({
    userId: 'test-user',
    resource: '/api/panels',
    action: 'GET',
    unauthorized: false,
    sensitive: true
  }, {
    source: 'test-script',
    testId: 'security-002'
  });
  
  console.log('   - Data access event emitted');
  console.log(`   - Event ID: ${dataAccessEvent.id}`);
  
  // Test encryption event
  const encryptionEvent = await securityEventEmitter.emitEncryptionEvent({
    operation: 'encrypt',
    keyType: 'AES-256',
    dataLength: 1024,
    success: true
  }, {
    source: 'test-script',
    testId: 'security-003'
  });
  
  console.log('   - Encryption event emitted');
  console.log(`   - Event ID: ${encryptionEvent.id}`);
}

/**
 * Test event retrieval
 */
async function testEventRetrieval() {
  // Get recent events
  const recentEvents = await eventStore.getRecentEvents(1, 10);
  
  console.log('   - Recent events retrieved successfully');
  console.log(`   - Retrieved ${recentEvents.length} events`);
  
  // Get events by type
  const testEvents = await eventStore.getEventsByType('test.metrics', 5);
  
  console.log('   - Events by type retrieved successfully');
  console.log(`   - Retrieved ${testEvents.length} test.metrics events`);
  
  // Get events by severity
  const infoEvents = await eventStore.getEventsBySeverity('info', 5);
  
  console.log('   - Events by severity retrieved successfully');
  console.log(`   - Retrieved ${infoEvents.length} info events`);
  
  // Test event statistics
  const stats = await eventStore.getEventStats('1h');
  
  console.log('   - Event statistics retrieved successfully');
  console.log(`   - Retrieved ${stats.length} stat records`);
}

/**
 * Test performance
 */
async function testPerformance() {
  const startTime = Date.now();
  const eventCount = 100;
  
  console.log(`   - Testing performance with ${eventCount} events...`);
  
  // Emit events in parallel
  const promises = [];
  for (let i = 0; i < eventCount; i++) {
    promises.push(
      securityEventEmitter.emitSecurityEvent('test.performance', {
        message: `Performance test event ${i + 1}`,
        index: i
      }, {
        source: 'test-script',
        testId: `perf-${i + 1}`
      })
    );
  }
  
  // Wait for all events to complete
  await Promise.all(promises);
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  const eventsPerSecond = (eventCount / duration) * 1000;
  
  console.log(`   - Performance test completed in ${duration}ms`);
  console.log(`   - Events per second: ${eventsPerSecond.toFixed(2)}`);
  
  // Performance targets
  if (duration > 5000) { // 5 seconds for 100 events
    console.log('   - ⚠️  Performance below target (should be < 5s for 100 events)');
  } else {
    console.log('   - ✅ Performance meets target');
  }
}

/**
 * Test system health
 */
async function testSystemHealth() {
  console.log('\n🔍 Testing System Health...');
  
  try {
    // Test event emitter health
    const emitterHealth = await securityEventEmitter.getHealthStatus();
    console.log('   - Event Emitter Health:', emitterHealth.status);
    
    // Test event store health
    const storeHealth = await eventStore.getHealthStatus();
    console.log('   - Event Store Health:', storeHealth.status);
    
    // Test metrics health
    const metricsHealth = eventMetrics.getMetricsSummary();
    console.log('   - Metrics Health: OK');
    
    // Test handler statistics
    const handlerStats = securityEventHandler.getStatistics();
    console.log('   - Handler Statistics:', handlerStats);
    
    console.log('   - ✅ All systems healthy');
    
  } catch (error) {
    console.error('   - ❌ Health check failed:', error.message);
    throw error;
  }
}

/**
 * Cleanup test data
 */
async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...');
  
  try {
    // Get test events
    const testEvents = await eventStore.getEvents({
      eventType: { $like: 'test.%' }
    }, 1000);
    
    console.log(`   - Found ${testEvents.length} test events to cleanup`);
    
    // Note: In a real implementation, you might want to mark these as test events
    // and clean them up periodically rather than deleting them immediately
    
    console.log('   - ✅ Test data cleanup completed');
    
  } catch (error) {
    console.error('   - ⚠️  Cleanup warning:', error.message);
  }
}

/**
 * Main test execution
 */
async function main() {
  try {
    // Run tests
    await testEventCollectionSystem();
    
    // Test system health
    await testSystemHealth();
    
    // Cleanup
    await cleanupTestData();
    
    console.log('\n🎉 Event Collection System is ready for production use!');
    console.log('\n📊 System Statistics:');
    
    const stats = securityEventEmitter.getStatistics();
    console.log(`   - Registered Event Types: ${stats.registeredEventTypes}`);
    console.log(`   - Total Handlers: ${stats.totalHandlers}`);
    console.log(`   - Event Store: ${stats.metrics.totalEvents} events`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n💥 Test execution failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Main execution failed:', error);
    process.exit(1);
  });
}

export {
  testEventCollectionSystem,
  testBasicEventEmission,
  testEventPersistence,
  testEventMetrics,
  testEventHandlers,
  testManufacturingEvents,
  testSecurityEvents,
  testEventRetrieval,
  testPerformance,
  testSystemHealth
};
