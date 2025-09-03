#!/usr/bin/env node

/**
 * Simple test to debug the failing tests
 */

import { ThreatAggregator } from './utils/threatAggregator.js';
import { StatisticalAnalyzer } from './utils/statisticalAnalyzer.js';

console.log('🔍 Simple Debug Test...\n');

// Test 1: Statistical Anomaly Detection
console.log('=== Test 1: Statistical Anomaly Detection ===');
const aggregator1 = new ThreatAggregator();

const context1 = {
	recentEvents: [
		{ eventType: 'user.login.failed', severity: 'medium', timestamp: new Date() }
	],
	seriesByKey: {
		loginFailures: [1, 1, 1, 1, 1, 5] // Last value is anomalous
	},
	sourceIp: '192.168.1.101',
	timeWindow: 60
};

console.log('Context 1:', JSON.stringify(context1, null, 2));

const threat1 = await aggregator1.evaluateThreat(context1);
console.log('Threat 1 Result:', JSON.stringify(threat1, null, 2));

// Test 2: Behavioral Pattern Detection
console.log('\n=== Test 2: Behavioral Pattern Detection ===');
const context2 = {
	recentEvents: [
		{ eventType: 'user.login.failed', severity: 'medium', timestamp: new Date() },
		{ eventType: 'data.access.unauthorized', severity: 'high', timestamp: new Date() },
		{ eventType: 'equipment.status.error', severity: 'critical', timestamp: new Date() },
		{ eventType: 'system.error', severity: 'high', timestamp: new Date() },
		{ eventType: 'network.alert', severity: 'medium', timestamp: new Date() },
		{ eventType: 'security.alert', severity: 'high', timestamp: new Date() }
	],
	sourceIp: '192.168.1.102',
	userId: 'suspicious-user',
	stationId: 'station-1',
	timeWindow: 60
};

console.log('Context 2:', JSON.stringify(context2, null, 2));

const threat2 = await aggregator1.evaluateThreat(context2);
console.log('Threat 2 Result:', JSON.stringify(threat2, null, 2));

// Test 3: Failed Login Burst
console.log('\n=== Test 3: Failed Login Burst ===');
const context3 = {
	recentEvents: [
		{ eventType: 'user.login.failed', severity: 'medium', sourceIp: '192.168.1.108', userId: 'user1', timestamp: new Date() },
		{ eventType: 'user.login.failed', severity: 'medium', sourceIp: '192.168.1.108', userId: 'user1', timestamp: new Date() },
		{ eventType: 'user.login.failed', severity: 'medium', sourceIp: '192.168.1.108', userId: 'user1', timestamp: new Date() },
		{ eventType: 'user.login.failed', severity: 'medium', sourceIp: '192.168.1.108', userId: 'user1', timestamp: new Date() },
		{ eventType: 'user.login.failed', severity: 'medium', sourceIp: '192.168.1.108', userId: 'user1', timestamp: new Date() }
	],
	sourceIp: '192.168.1.108',
	userId: 'user1',
	timeWindow: 60
};

console.log('Context 3:', JSON.stringify(context3, null, 2));

const threat3 = await aggregator1.evaluateThreat(context3);
console.log('Threat 3 Result:', JSON.stringify(threat3, null, 2));

console.log('\n🔍 Debug complete!');
