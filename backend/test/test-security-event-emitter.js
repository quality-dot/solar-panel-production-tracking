const { SecurityEventEmitter, SECURITY_EVENT_TYPES, SECURITY_SEVERITY, SECURITY_SOURCES } = require('../utils/securityEventEmitter');
const { pool } = require('../config/database');

describe('SecurityEventEmitter', () => {
  let securityEmitter;
  let testCorrelationId;
  let testSessionId;
  let testUserId;

  beforeAll(async () => {
    // Setup test database connection
    testCorrelationId = 'test-correlation-id-12345';
    testSessionId = 'test-session-id-67890';
    testUserId = 999;
  });

  beforeEach(async () => {
    securityEmitter = new SecurityEventEmitter();
    
    // Set test context
    securityEmitter.setContext(testCorrelationId, testSessionId, testUserId, SECURITY_SOURCES.USER);
    
    // Clear any existing test data
    await pool.query('DELETE FROM security_events WHERE correlation_id = $1', [testCorrelationId]);
  });

  afterEach(async () => {
    // Clean up test data
    await pool.query('DELETE FROM security_events WHERE correlation_id = $1', [testCorrelationId]);
    
    // Remove all listeners
    securityEmitter.removeAllListeners();
  });

  afterAll(async () => {
    // Clean up all test data
    await pool.query('DELETE FROM security_events WHERE correlation_id LIKE $1', ['test-%']);
    await pool.end();
  });

  describe('Initialization', () => {
    test('should initialize with default values', () => {
      expect(securityEmitter).toBeInstanceOf(SecurityEventEmitter);
      expect(securityEmitter.correlationId).toBe(testCorrelationId);
      expect(securityEmitter.sessionId).toBe(testSessionId);
      expect(securityEmitter.userId).toBe(testUserId);
      expect(securityEmitter.source).toBe(SECURITY_SOURCES.USER);
    });

    test('should generate valid correlation IDs', () => {
      const correlationId = securityEmitter.generateCorrelationId();
      expect(correlationId).toMatch(/^[a-f0-9]{64}$/);
    });

    test('should clear context correctly', () => {
      securityEmitter.clearContext();
      expect(securityEmitter.correlationId).toBeNull();
      expect(securityEmitter.sessionId).toBeNull();
      expect(securityEmitter.userId).toBeNull();
      expect(securityEmitter.source).toBe(SECURITY_SOURCES.SYSTEM);
    });
  });

  describe('Event Emission', () => {
    test('should emit security events with correct structure', async () => {
      const eventPromise = new Promise((resolve) => {
        securityEmitter.once('securityEvent', resolve);
      });

      const eventData = { testKey: 'testValue' };
      const metadata = { source: 'test' };
      
      const emittedEvent = await securityEmitter.emitSecurityEvent(
        'AUTH_SUCCESS',
        SECURITY_SEVERITY.LOW,
        eventData,
        metadata
      );

      const receivedEvent = await eventPromise;

      expect(emittedEvent).toMatchObject({
        eventType: 'AUTH_SUCCESS',
        severity: SECURITY_SEVERITY.LOW,
        source: SECURITY_SOURCES.USER,
        correlationId: testCorrelationId,
        sessionId: testSessionId,
        userId: testUserId,
        eventData,
        metadata
      });

      expect(receivedEvent).toMatchObject(emittedEvent);
      expect(emittedEvent.timestamp).toBeInstanceOf(Date);
      expect(emittedEvent.id).toBeDefined();
    });

    test('should emit specific event type listeners', async () => {
      const eventPromise = new Promise((resolve) => {
        securityEmitter.once('AUTH_SUCCESS', resolve);
      });

      await securityEmitter.emitSecurityEvent('AUTH_SUCCESS', SECURITY_SEVERITY.LOW);
      const receivedEvent = await eventPromise;

      expect(receivedEvent.eventType).toBe('AUTH_SUCCESS');
    });

    test('should reject invalid event types', async () => {
      await expect(
        securityEmitter.emitSecurityEvent('INVALID_EVENT', SECURITY_SEVERITY.LOW)
      ).rejects.toThrow('Invalid security event type: INVALID_EVENT');
    });

    test('should reject invalid severity levels', async () => {
      await expect(
        securityEmitter.emitSecurityEvent('AUTH_SUCCESS', 'INVALID_SEVERITY')
      ).rejects.toThrow('Invalid security severity: INVALID_SEVERITY');
    });
  });

  describe('Database Persistence', () => {
    test('should persist events to database', async () => {
      const eventData = { testKey: 'testValue' };
      const metadata = { source: 'test' };
      
      const event = await securityEmitter.emitSecurityEvent(
        'AUTH_SUCCESS',
        SECURITY_SEVERITY.LOW,
        eventData,
        metadata
      );

      // Verify event was persisted
      const result = await pool.query(
        'SELECT * FROM security_events WHERE id = $1',
        [event.id]
      );

      expect(result.rows).toHaveLength(1);
      const persistedEvent = result.rows[0];
      
      expect(persistedEvent.event_type).toBe('AUTH_SUCCESS');
      expect(persistedEvent.severity).toBe('low');
      expect(persistedEvent.source).toBe('user');
      expect(persistedEvent.correlation_id).toBe(testCorrelationId);
      expect(persistedEvent.session_id).toBe(testSessionId);
      expect(persistedEvent.user_id).toBe(testUserId);
      expect(persistedEvent.event_data).toEqual(eventData);
      expect(persistedEvent.metadata).toEqual(metadata);
    });

    test('should handle database errors gracefully', async () => {
      // Mock database error by temporarily breaking the connection
      const originalQuery = pool.query;
      pool.query = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      const event = await securityEmitter.emitSecurityEvent('AUTH_SUCCESS', SECURITY_SEVERITY.LOW);
      
      // Should still return the event object even if persistence fails
      expect(event).toBeDefined();
      expect(event.eventType).toBe('AUTH_SUCCESS');

      // Restore original query method
      pool.query = originalQuery;
    });
  });

  describe('Event Retrieval', () => {
    beforeEach(async () => {
      // Create test events
      await securityEmitter.emitSecurityEvent('AUTH_SUCCESS', SECURITY_SEVERITY.LOW, { user: 'test1' });
      await securityEmitter.emitSecurityEvent('AUTH_FAILURE', SECURITY_SEVERITY.MEDIUM, { user: 'test2' });
      await securityEmitter.emitSecurityEvent('THREAT_DETECTED', SECURITY_SEVERITY.HIGH, { threat: 'test' });
    });

    test('should retrieve all events without filters', async () => {
      const events = await securityEmitter.getEvents();
      expect(events.length).toBeGreaterThanOrEqual(3);
    });

    test('should filter events by event type', async () => {
      const events = await securityEmitter.getEvents({ eventType: 'auth_success' });
      expect(events.every(e => e.event_type === 'auth_success')).toBe(true);
    });

    test('should filter events by severity', async () => {
      const events = await securityEmitter.getEvents({ severity: 'high' });
      expect(events.every(e => e.severity === 'high')).toBe(true);
    });

    test('should filter events by source', async () => {
      const events = await securityEmitter.getEvents({ source: 'user' });
      expect(events.every(e => e.source === 'user')).toBe(true);
    });

    test('should filter events by user ID', async () => {
      const events = await securityEmitter.getEvents({ userId: testUserId });
      expect(events.every(e => e.user_id === testUserId)).toBe(true);
    });

    test('should filter events by correlation ID', async () => {
      const events = await securityEmitter.getEvents({ correlationId: testCorrelationId });
      expect(events.every(e => e.correlation_id === testCorrelationId)).toBe(true);
    });

    test('should apply limit and offset', async () => {
      const events = await securityEmitter.getEvents({ limit: 2, offset: 1 });
      expect(events.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Event Statistics', () => {
    beforeEach(async () => {
      // Create test events across different time periods
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Recent events (within 1 hour)
      await securityEmitter.emitSecurityEvent('AUTH_SUCCESS', SECURITY_SEVERITY.LOW, { user: 'recent' });
      
      // Events within 24 hours
      await securityEmitter.emitSecurityEvent('AUTH_FAILURE', SECURITY_SEVERITY.MEDIUM, { user: 'daily' });
      
      // Older events (beyond 24 hours) - these won't be counted in 24h stats
      // Note: In a real test, we'd need to manipulate the database timestamp directly
    });

    test('should get 24-hour statistics', async () => {
      const stats = await securityEmitter.getEventStatistics('24h');
      expect(Array.isArray(stats)).toBe(true);
      
      // Should have at least some events in the last 24 hours
      const totalEvents = stats.reduce((sum, stat) => sum + parseInt(stat.count), 0);
      expect(totalEvents).toBeGreaterThan(0);
    });

    test('should get 1-hour statistics', async () => {
      const stats = await securityEmitter.getEventStatistics('1h');
      expect(Array.isArray(stats)).toBe(true);
    });

    test('should get 7-day statistics', async () => {
      const stats = await securityEmitter.getEventStatistics('7d');
      expect(Array.isArray(stats)).toBe(true);
    });

    test('should get 30-day statistics', async () => {
      const stats = await securityEmitter.getEventStatistics('30d');
      expect(Array.isArray(stats)).toBe(true);
    });
  });

  describe('Convenience Methods', () => {
    test('should emit auth success events', async () => {
      const event = await securityEmitter.emitAuthSuccess(testUserId, testSessionId, { ip: '192.168.1.1' });
      
      expect(event.eventType).toBe('AUTH_SUCCESS');
      expect(event.severity).toBe(SECURITY_SEVERITY.LOW);
      expect(event.eventData).toEqual({ userId: testUserId, sessionId: testSessionId });
      expect(event.metadata).toEqual({ ip: '192.168.1.1' });
    });

    test('should emit auth failure events', async () => {
      const event = await securityEmitter.emitAuthFailure(testUserId, 'Invalid password', { ip: '192.168.1.1' });
      
      expect(event.eventType).toBe('AUTH_FAILURE');
      expect(event.severity).toBe(SECURITY_SEVERITY.MEDIUM);
      expect(event.eventData).toEqual({ userId: testUserId, reason: 'Invalid password' });
      expect(event.metadata).toEqual({ ip: '192.168.1.1' });
    });

    test('should emit threat detected events', async () => {
      const event = await securityEmitter.emitThreatDetected('SQL_INJECTION', { query: 'test' }, { ip: '192.168.1.1' });
      
      expect(event.eventType).toBe('THREAT_DETECTED');
      expect(event.severity).toBe(SECURITY_SEVERITY.HIGH);
      expect(event.eventData).toEqual({ threatType: 'SQL_INJECTION', details: { query: 'test' } });
      expect(event.metadata).toEqual({ ip: '192.168.1.1' });
    });

    test('should emit data access events', async () => {
      const event = await securityEmitter.emitDataAccess(testUserId, 'manufacturing_orders', 'read', { table: 'orders' });
      
      expect(event.eventType).toBe('DATA_READ');
      expect(event.severity).toBe(SECURITY_SEVERITY.LOW);
      expect(event.eventData).toEqual({ userId: testUserId, dataType: 'manufacturing_orders', operation: 'read' });
      expect(event.metadata).toEqual({ table: 'orders' });
    });

    test('should emit manufacturing events', async () => {
      const event = await securityEmitter.emitManufacturingEvent(
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
      expect(event.metadata).toEqual({ station: 'station_1' });
    });
  });

  describe('Data Retention', () => {
    test('should clean up old events', async () => {
      // Create an old event by manipulating the database directly
      const oldDate = new Date(Date.now() - 8 * 365 * 24 * 60 * 60 * 1000); // 8 years ago
      
      await pool.query(`
        INSERT INTO security_events (
          event_type, severity, source, correlation_id, session_id, user_id,
          event_data, metadata, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        'SYSTEM_STARTUP',
        'low',
        'system',
        'old-event-123',
        'old-session-123',
        999,
        '{}',
        '{}',
        oldDate
      ]);

      // Verify old event exists
      let result = await pool.query('SELECT COUNT(*) FROM security_events WHERE correlation_id = $1', ['old-event-123']);
      expect(parseInt(result.rows[0].count)).toBe(1);

      // Clean up old events (default 7 years retention)
      const deletedCount = await securityEmitter.cleanupOldEvents(7 * 365);
      expect(deletedCount).toBeGreaterThan(0);

      // Verify old event was deleted
      result = await pool.query('SELECT COUNT(*) FROM security_events WHERE correlation_id = $1', ['old-event-123']);
      expect(parseInt(result.rows[0].count)).toBe(0);
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle multiple concurrent events', async () => {
      const eventCount = 100;
      const promises = [];

      for (let i = 0; i < eventCount; i++) {
        promises.push(
          securityEmitter.emitSecurityEvent(
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
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      // Verify all events were persisted
      const result = await pool.query(
        'SELECT COUNT(*) FROM security_events WHERE correlation_id = $1',
        [testCorrelationId]
      );
      expect(parseInt(result.rows[0].count)).toBe(eventCount);
    });

    test('should handle rapid event emission', async () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 50; i++) {
        await securityEmitter.emitSecurityEvent(
          'SYSTEM_WARNING',
          SECURITY_SEVERITY.MEDIUM,
          { warning: `warning_${i}` }
        );
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should emit 50 events in reasonable time
      expect(duration).toBeLessThan(3000); // 3 seconds
      expect(duration / 50).toBeLessThan(100); // Average less than 100ms per event
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid database operations gracefully', async () => {
      // Mock database error
      const originalQuery = pool.query;
      pool.query = jest.fn().mockRejectedValue(new Error('Connection timeout'));

      // Should not throw error
      const event = await securityEmitter.emitSecurityEvent('SYSTEM_ERROR', SECURITY_SEVERITY.HIGH);
      
      expect(event).toBeDefined();
      expect(event.eventType).toBe('SYSTEM_ERROR');

      // Restore original query method
      pool.query = originalQuery;
    });

    test('should handle invalid event data gracefully', async () => {
      // Test with circular reference (should not crash)
      const circularData = { test: 'value' };
      circularData.self = circularData;

      const event = await securityEmitter.emitSecurityEvent(
        'SYSTEM_WARNING',
        SECURITY_SEVERITY.MEDIUM,
        circularData
      );

      expect(event).toBeDefined();
      expect(event.eventType).toBe('SYSTEM_WARNING');
    });
  });
});

// Run tests if this file is executed directly
if (require.main === module) {
  const { execSync } = require('child_process');
  
  console.log('Running SecurityEventEmitter tests...');
  
  try {
    execSync('npm test -- --testPathPattern=test-security-event-emitter.js', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
  } catch (error) {
    console.error('Tests failed:', error.message);
    process.exit(1);
  }
}
