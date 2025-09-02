#!/usr/bin/env node

/**
 * Debug script for IP blocking test
 */

import { ThreatResponseSystem } from './utils/threatResponse.js';

console.log('🔍 Debugging IP Blocking...\n');

// Test the exact scenario from the failing test
const responseSystem = new ThreatResponseSystem({ autoBlockEnabled: true, threatScoreThreshold: 50 });

const event = {
	id: 'test-event-2',
	eventType: 'data.access.unauthorized',
	severity: 'critical',
	sourceIp: '192.168.1.104',
	userId: 'attacker',
	timestamp: new Date()
};

console.log('Event:', JSON.stringify(event, null, 2));

const response = await responseSystem.processSecurityEvent(event);
console.log('Response:', JSON.stringify(response, null, 2));

console.log('\n🔍 Debug complete!');
