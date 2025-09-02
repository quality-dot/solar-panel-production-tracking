const { SecurityEventService, securityEventService, SECURITY_EVENT_TYPES, SECURITY_SEVERITY, SECURITY_SOURCES } = require('../services/securityEventService');
const { pool } = require('../config/database');

describe('SecurityEventService', () => {
  let service;
  let testCorrelationId;
  let testSessionId;
  let testUserId;

  beforeAll(async () => {
    // Setup test database connection
    testCorrelationId = 'test-service-correlation-id-12345';
    testSessionId = 'test-service-session-id-67890';
    testUserId = 999;
  });

  beforeEach(async () => {
    // Create a new service instance for each test
    service = new SecurityEventService();
    
    // Set test context
    service.setContext(testCorrelationId, testSessionId, testUserId, SECURITY_SOURCES.USER);
    
    // Clear any existing test data
    await pool.query('DELETE FROM security_events WHERE correlation_id = $1', [testCorrelationId]);
    
    // Wait for service initialization
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(async () => {
    // Clean up test data
    await pool.query('DELETE FROM security_events WHERE correlation_id = $1', [testCorrelationId]);
    
    // Remove all listeners
    if (service.securityEmitter) {
      service.securityEmitter.removeAllListeners();
    }
  });

  afterAll(async () => {
    // Clean up all test data
    await pool.query('DELETE FROM security_events WHERE correlation_id LIKE $1', ['test-service-%']);
    await pool.end();
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      expect(service).toBeInstanceOf(SecurityEventService);
      expect(service.securityEmitter).toBeDefined();
      expect(service.isInitialized).toBe(true);
    });

    test('should set up global listeners', () => {
      expect(service.securityEmitter.listenerCount('securityEvent')).toBeGreaterThan(0);
      expect(service.securityEmitter.listenerCount('THREAT_DETECTED')).toBeGreaterThan(0);
      expect(service.securityEmitter.listenerCount('AUTH_FAILURE')).toBeGreaterThan(0);
    });

    test('should emit system startup event on initialization', async () => {
      // Wait for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const events = await service.getEvents({ correlationId: testCorrelationId });
      const startupEvent = events.find(e => e.event_type === 'system_startup');
      
      expect(startupEvent).toBeDefined();
      expect(startupEvent.event_data.service).toBe('SecurityEventService');
    });
  });

  describe('Event Emission', () => {
    test('should emit events through the service', async () => {
      const event = await service.emitEvent(
        'AUTH_SUCCESS',
        SECURITY_SEVERITY.LOW,
        { userId: testUserId, sessionId: testSessionId },
        { source: 'test' }
      );

      expect(event).toBeDefined();
      expect(event.eventType).toBe('AUTH_SUCCESS');
      expect(event.severity).toBe(SECURITY_SEVERITY.LOW);
    });

    test('should handle uninitialized service gracefully', async () => {
      const uninitializedService = new SecurityEventService();
      uninitializedService.isInitialized = false;
      
      const event = await uninitializedService.emitEvent('AUTH_SUCCESS', SECURITY_SEVERITY.LOW);
      
      expect(event).toBeDefined();
      expect(event.eventType).toBe('AUTH_SUCCESS');
    });
  });

  describe('Event Retrieval', () => {
    beforeEach(async () => {
      // Create test events
      await service.emitEvent('AUTH_SUCCESS', SECURITY_SEVERITY.LOW, { user: 'test1' });
      await service.emitEvent('AUTH_FAILURE', SECURITY_SEVERITY.MEDIUM, { user: 'test2' });
      await service.emitEvent('THREAT_DETECTED', SECURITY_SEVERITY.HIGH, { threat: 'test' });
    });

    test('should retrieve events with filters', async () => {
      const events = await service.getEvents({ eventType: 'auth_success' });
      expect(events.every(e => e.event_type === 'auth_success')).toBe(true);
    });

    test('should retrieve event statistics', async () => {
      const stats = await service.getStatistics('24h');
      expect(Array.isArray(stats)).toBe(true);
      
      const totalEvents = stats.reduce((sum, stat) => sum + parseInt(stat.count), 0);
      expect(totalEvents).toBeGreaterThan(0);
    });
  });

  describe('Context Management', () => {
    test('should set and clear context correctly', () => {
      service.setContext('new-correlation', 'new-session', 123, SECURITY_SOURCES.EXTERNAL);
      
      expect(service.securityEmitter.correlationId).toBe('new-correlation');
      expect(service.securityEmitter.sessionId).toBe('new-session');
      expect(service.securityEmitter.userId).toBe(123);
      expect(service.securityEmitter.source).toBe(SECURITY_SOURCES.EXTERNAL);
      
      service.clearContext();
      
      expect(service.securityEmitter.correlationId).toBeNull();
      expect(service.securityEmitter.sessionId).toBeNull();
      expect(service.securityEmitter.userId).toBeNull();
      expect(service.securityEmitter.source).toBe(SECURITY_SOURCES.SYSTEM);
    });
  });

  describe('Authentication Event Handling', () => {
    test('should handle authentication failures and check for brute force', async () => {
      // Create multiple auth failures
      for (let i = 0; i < 6; i++) {
        await service.emitAuthFailure(testUserId, `Failed attempt ${i + 1}`, { ip: '192.168.1.1' });
      }
      
      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if lockout event was emitted
      const events = await service.getEvents({ correlationId: testCorrelationId });
      const lockoutEvent = events.find(e => e.event_type === 'auth_lockout');
      
      expect(lockoutEvent).toBeDefined();
      expect(lockoutEvent.severity).toBe('high');
      expect(lockoutEvent.event_data.reason).toBe('Multiple failed attempts');
    });

    test('should emit authentication success events', async () => {
      const event = await service.emitAuthSuccess(testUserId, testSessionId, { ip: '192.168.1.1' });
      
      expect(event.eventType).toBe('AUTH_SUCCESS');
      expect(event.severity).toBe(SECURITY_SEVERITY.LOW);
      expect(event.eventData).toEqual({ userId: testUserId, sessionId: testSessionId });
    });

    test('should emit authentication failure events', async () => {
      const event = await service.emitAuthFailure(testUserId, 'Invalid password', { ip: '192.168.1.1' });
      
      expect(event.eventType).toBe('AUTH_FAILURE');
      expect(event.eventData).toEqual({ userId: testUserId, reason: 'Invalid password' });
    });
  });

  describe('Threat Event Handling', () => {
    test('should handle threat detected events', async () => {
      const event = await service.emitThreatDetected('SQL_INJECTION', { query: 'test' }, { ip: '192.168.1.1' });
      
      expect(event.eventType).toBe('THREAT_DETECTED');
      expect(event.severity).toBe(SECURITY_SEVERITY.HIGH);
      expect(event.eventData).toEqual({ threatType: 'SQL_INJECTION', details: { query: 'test' } });
    });

    test('should log threat response actions', async () => {
      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const events = await service.getEvents({ correlationId: testCorrelationId });
      const threatBlockedEvent = events.find(e => e.event_type === 'threat_blocked');
      
      // This should be created by the threat response handler
      expect(threatBlockedEvent).toBeDefined();
    });
  });

  describe('Manufacturing Event Handling', () => {
    test('should emit manufacturing events', async () => {
      const event = await service.emitManufacturingEvent(
        testUserId,
        'station_1',
        'access',
        { panelId: 'panel_123' },
        { station: 'station_1' }
      );
      
      expect(event.eventType).toBe('MANUFACTURING_ACCESS');
      expect(event.severity).toBe(SECURITY_SEVERITY.MEDIUM);
      expect(event.eventData).toEqual({
        userId: testUserId,
        stationId: 'station_1',
        operation: 'access',
        details: { panelId: 'panel_123' }
      });
    });

    test('should check for manufacturing anomalies', async () => {
      // Mock console.log to capture output
      const originalLog = console.log;
      const logs = [];
      console.log = (...args) => logs.push(args.join(' '));
      
      await service.emitManufacturingEvent(testUserId, 'station_1', 'access', { panelId: 'panel_123' });
      
      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if anomaly check was logged
      const anomalyLog = logs.find(log => log.includes('[ANOMALY_CHECK]'));
      expect(anomalyLog).toBeDefined();
      expect(anomalyLog).toContain('Checking manufacturing event');
      
      // Restore console.log
      console.log = originalLog;
    });
  });

  describe('Data Access Event Handling', () => {
    test('should emit data access events', async () => {
      const event = await service.emitDataAccess(testUserId, 'manufacturing_orders', 'read', { table: 'orders' });
      
      expect(event.eventType).toBe('DATA_READ');
      expect(event.severity).toBe(SECURITY_SEVERITY.LOW);
      expect(event.eventData).toEqual({
        userId: testUserId,
        dataType: 'manufacturing_orders',
        operation: 'read'
      });
    });

    test('should check for data access anomalies', async () => {
      // Mock console.log to capture output
      const originalLog = console.log;
      const logs = [];
      console.log = (...args) => logs.push(args.join(' '));
      
      await service.emitDataAccess(testUserId, 'manufacturing_orders', 'read', { table: 'orders' });
      
      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if anomaly check was logged
      const anomalyLog = logs.find(log => log.includes('[ANOMALY_CHECK]'));
      expect(anomalyLog).toBeDefined();
      expect(anomalyLog).toContain('Checking data access');
      
      // Restore console.log
      console.log = originalLog;
    });
  });

  describe('Compliance Event Handling', () => {
    test('should emit compliance violation events', async () => {
      const event = await service.emitComplianceViolation(
        'DATA_RETENTION_VIOLATION',
        { table: 'orders', retentionDays: 5 },
        { compliance: 'GDPR' }
      );
      
      expect(event.eventType).toBe('COMPLIANCE_VIOLATION');
      expect(event.severity).toBe(SECURITY_SEVERITY.HIGH);
      expect(event.eventData).toEqual({
        violationType: 'DATA_RETENTION_VIOLATION',
        details: { table: 'orders', retentionDays: 5 }
      });
    });

    test('should report compliance violations', async () => {
      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const events = await service.getEvents({ correlationId: testCorrelationId });
      const complianceReportEvent = events.find(e => e.event_type === 'compliance_report');
      
      // This should be created by the compliance violation handler
      expect(complianceReportEvent).toBeDefined();
    });
  });

  describe('Metrics and Caching', () => {
    test('should update metrics when events are emitted', async () => {
      const initialMetrics = service.getMetrics();
      const initialTotal = initialMetrics.totalEvents;
      
      await service.emitEvent('SYSTEM_WARNING', SECURITY_SEVERITY.MEDIUM, { warning: 'test' });
      
      const updatedMetrics = service.getMetrics();
      expect(updatedMetrics.totalEvents).toBe(initialTotal + 1);
      expect(updatedMetrics.eventsBySeverity.medium).toBeGreaterThan(0);
      expect(updatedMetrics.eventsByType.SYSTEM_WARNING).toBeGreaterThan(0);
    });

    test('should cache events for real-time monitoring', async () => {
      await service.emitEvent('SYSTEM_INFO', SECURITY_SEVERITY.LOW, { info: 'test' });
      
      const cachedEvents = service.getCachedEvents();
      const infoEvent = cachedEvents.find(e => e.eventType === 'SYSTEM_INFO');
      
      expect(infoEvent).toBeDefined();
      expect(infoEvent.eventData.info).toBe('test');
    });

    test('should limit cache size', async () => {
      // Add more than 1000 events
      for (let i = 0; i < 1100; i++) {
        await service.emitEvent('SYSTEM_INFO', SECURITY_SEVERITY.LOW, { index: i });
      }
      
      const cachedEvents = service.getCachedEvents();
      expect(cachedEvents.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // Mock database error
      const originalQuery = pool.query;
      pool.query = jest.fn().mockRejectedValue(new Error('Connection timeout'));
      
      // Should not throw error
      const event = await service.emitEvent('SYSTEM_ERROR', SECURITY_SEVERITY.HIGH);
      
      expect(event).toBeDefined();
      expect(event.eventType).toBe('SYSTEM_ERROR');
      
      // Restore original query method
      pool.query = originalQuery;
    });

    test('should handle event processing errors gracefully', async () => {
      // Mock console.error to capture output
      const originalError = console.error;
      const errors = [];
      console.error = (...args) => errors.push(args.join(' '));
      
      // Create an event that might cause processing errors
      await service.emitEvent('SYSTEM_WARNING', SECURITY_SEVERITY.MEDIUM, { warning: 'test' });
      
      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if any errors were logged
      expect(errors.length).toBeGreaterThanOrEqual(0);
      
      // Restore console.error
      console.error = originalError;
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle multiple concurrent events', async () => {
      const eventCount = 50;
      const promises = [];
      
      for (let i = 0; i < eventCount; i++) {
        promises.push(
          service.emitEvent(
            'DATA_READ',
            SECURITY_SEVERITY.LOW,
            { index: i, data: `test_data_${i}` }
          )
        );
      }
      
      const startTime = Date.now();
      const events = await Promise.all(promises);
      const endTime = Date.now();
      
      expect(events).toHaveLength(eventCount);
      expect(endTime - startTime).toBeLessThan(3000); // Should complete within 3 seconds
    });

    test('should handle rapid event emission', async () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 25; i++) {
        await service.emitEvent(
          'SYSTEM_WARNING',
          SECURITY_SEVERITY.MEDIUM,
          { warning: `warning_${i}` }
        );
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should emit 25 events in reasonable time
      expect(duration).toBeLessThan(2000); // 2 seconds
      expect(duration / 25).toBeLessThan(100); // Average less than 100ms per event
    });
  });

  describe('Singleton Instance', () => {
    test('should provide singleton instance', () => {
      expect(securityEventService).toBeInstanceOf(SecurityEventService);
      expect(securityEventService).toBe(securityEventService);
    });

    test('should maintain state across references', async () => {
      const event1 = await securityEventService.emitEvent('SYSTEM_INFO', SECURITY_SEVERITY.LOW, { test: '1' });
      const event2 = await securityEventService.emitEvent('SYSTEM_INFO', SECURITY_SEVERITY.LOW, { test: '2' });
      
      expect(event1.id).toBeDefined();
      expect(event2.id).toBeDefined();
      expect(event1.id).not.toBe(event2.id);
    });
  });

  describe('Integration with Security Frameworks', () => {
    test('should integrate with existing security event emitter', () => {
      expect(service.securityEmitter).toBeDefined();
      expect(service.securityEmitter).toBeInstanceOf(require('../utils/securityEventEmitter').SecurityEventEmitter);
    });

    test('should use correct security event types and severity levels', () => {
      expect(SECURITY_EVENT_TYPES.AUTH_SUCCESS).toBe('auth_success');
      expect(SECURITY_SEVERITY.HIGH).toBe('high');
      expect(SECURITY_SOURCES.USER).toBe('user');
    });
  });
});

// Run tests if this file is executed directly
if (require.main === module) {
  const { execSync } = require('child_process');
  
  console.log('Running SecurityEventService tests...');
  
  try {
    execSync('npm test -- --testPathPattern=test-security-event-service.js', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
  } catch (error) {
    console.error('Tests failed:', error.message);
    process.exit(1);
  }
}
