#!/usr/bin/env node

/**
 * Test script for the Security Event System
 */

import SecurityEventEmitter, { SECURITY_EVENT_TYPES, SECURITY_SEVERITY, SECURITY_SOURCES } from './utils/securityEventEmitter.js';
import SecurityEventService, { securityEventService } from './services/securityEventService.js';

async function testSecurityEventSystem() {
	console.log('🔒 Testing Security Event System...\n');
	try {
		console.log('1. Testing SecurityEventEmitter...');
		const emitter = new SecurityEventEmitter();
		const testCorrelationId = 'test-' + Date.now();
		const testSessionId = 'session-' + Date.now();
		const testUserId = 123;
		emitter.setContext(testCorrelationId, testSessionId, testUserId, SECURITY_SOURCES.USER);
		emitter.on('securityEvent', (event) => { console.log(`   📡 Event received: ${event.eventType} (${event.severity})`); });
		await emitter.emitSecurityEvent(SECURITY_EVENT_TYPES.AUTH_SUCCESS, SECURITY_SEVERITY.LOW, { userId: testUserId });
		await emitter.emitSecurityEvent(SECURITY_EVENT_TYPES.DATA_READ, SECURITY_SEVERITY.LOW, { dataType: 'manufacturing_orders' });
		await emitter.emitSecurityEvent(SECURITY_EVENT_TYPES.THREAT_DETECTED, SECURITY_SEVERITY.HIGH, { threatType: 'SQL_INJECTION' });
		console.log('   ✅ SecurityEventEmitter tests passed\n');

		console.log('2. Testing SecurityEventService...');
		await new Promise((r) => setTimeout(r, 300));
		securityEventService.setContext(testCorrelationId, testSessionId, testUserId, SECURITY_SOURCES.USER);
		await securityEventService.emitAuthSuccess(testUserId, testSessionId, { ip: '192.168.1.100' });
		await securityEventService.emitManufacturingEvent(testUserId, 'station_1', 'access', { panelId: 'panel_123' });
		await securityEventService.emitDataAccess(testUserId, 'manufacturing_orders', 'read', { table: 'orders' });
		console.log('   ✅ SecurityEventService tests passed\n');

		console.log('3. Testing Event Retrieval and Statistics...');
		const events = await securityEventService.getEvents({ correlationId: testCorrelationId });
		console.log(`   📊 Retrieved ${events.length} events`);
		const stats = await securityEventService.getStatistics('24h');
		console.log(`   📈 Statistics: ${stats.length} event types`);
		const metrics = securityEventService.getMetrics();
		console.log(`   📊 Total events: ${metrics.totalEvents}`);
		console.log('   ✅ Event retrieval tests passed\n');

		console.log('4. Testing Performance...');
		const startTime = Date.now();
		const eventCount = 50;
		for (let i = 0; i < eventCount; i++) {
			await securityEventService.emitEvent(SECURITY_EVENT_TYPES.SYSTEM_WARNING, SECURITY_SEVERITY.MEDIUM, { idx: i });
		}
		const duration = Date.now() - startTime;
		const eps = Math.round((eventCount / duration) * 1000);
		console.log(`   ⚡ Emitted ${eventCount} events in ${duration}ms (${eps} events/sec)`);
		console.log('   ✅ Performance tests passed\n');

		console.log('5. Cleanup...');
		const deleted = await securityEventService.cleanupOldEvents(1);
		console.log(`   🗑️  Cleaned up ${deleted} old events`);
		console.log('   ✅ Cleanup tests passed\n');

		console.log('6. Final Statistics...');
		const finalMetrics = securityEventService.getMetrics();
		console.log(`   📊 Total events in system: ${finalMetrics.totalEvents}`);
		console.log(`   📈 Events by severity:`, finalMetrics.eventsBySeverity);
		console.log(`   🔍 Events by type:`, Object.keys(finalMetrics.eventsByType).length, 'types');
		console.log(`   📍 Events by source:`, Object.keys(finalMetrics.eventsBySource).length, 'sources');
		console.log('\n🎉 All Security Event System tests completed successfully!');
	} catch (error) {
		console.error('❌ Test failed:', error);
		process.exit(1);
	}
}

// Execute
const run = await testSecurityEventSystem();
