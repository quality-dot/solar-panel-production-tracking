// Test script for Anomaly Detection Framework
import StatisticalAnalyzer from '../utils/statisticalAnalyzer.js';
import SecurityRuleEngine, { ManufacturingRules } from '../utils/ruleEngine.js';
import ThreatAggregator from '../services/threatAggregator.js';
import SecurityEventService from '../services/securityEventService.js';
import SecurityEventEmitter, { SECURITY_EVENT_TYPES, SECURITY_SEVERITY } from '../utils/securityEventEmitter.js';

// Simple test framework for Node.js
class TestFramework {
	constructor() {
		this.tests = [];
		this.passed = 0;
		this.failed = 0;
	}

	describe(name, fn) {
		console.log(`\n📋 ${name}`);
		fn();
	}

	test(name, fn) {
		try {
			fn();
			console.log(`  ✅ ${name}`);
			this.passed++;
		} catch (error) {
			console.log(`  ❌ ${name}: ${error.message}`);
			this.failed++;
		}
	}

	expect(value) {
		return {
			toBe: (expected) => {
				if (value !== expected) {
					throw new Error(`Expected ${value} to be ${expected}`);
				}
			},
			toBeGreaterThan: (expected) => {
				if (value <= expected) {
					throw new Error(`Expected ${value} to be greater than ${expected}`);
				}
			},
			toBeDefined: () => {
				if (value === undefined) {
					throw new Error(`Expected value to be defined`);
				}
			},
			toContain: (expected) => {
				if (!value.includes(expected)) {
					throw new Error(`Expected ${value} to contain ${expected}`);
				}
			},
			not: {
				toContain: (expected) => {
					if (value.includes(expected)) {
						throw new Error(`Expected ${value} not to contain ${expected}`);
					}
				}
			},
			toBeCloseTo: (expected, precision) => {
				const tolerance = Math.pow(10, -precision);
				if (Math.abs(value - expected) > tolerance) {
					throw new Error(`Expected ${value} to be close to ${expected} within ${tolerance}`);
				}
			}
		};
	}

	summary() {
		console.log(`\n📊 Test Summary: ${this.passed} passed, ${this.failed} failed`);
		return this.failed === 0;
	}
}

// Mock Jest functions
const jest = {
	fn: () => {
		const mockFn = (...args) => mockFn.mock.calls.push({ args, returnValue: undefined });
		mockFn.mock = { calls: [] };
		mockFn.mockResolvedValue = (value) => {
			mockFn.mock.returnValue = value;
			return mockFn;
		};
		return mockFn;
	}
};

// Run tests
async function runTests() {
	const test = new TestFramework();
	
	test.describe('StatisticalAnalyzer', () => {
		test.test('should calculate mean and standard deviation', () => {
			const data = [1, 2, 3, 4, 5];
			const mean = StatisticalAnalyzer.mean(data);
			const stdDev = StatisticalAnalyzer.stdDev(data);
			test.expect(mean).toBe(3);
			test.expect(stdDev).toBeCloseTo(1.58, 2);
		});

		test.test('should detect outliers using z-score', () => {
			const data = [1, 2, 3, 4, 100]; // 100 is an outlier
			const result = StatisticalAnalyzer.detectOutliers(data, 1.5); // Lower threshold to catch the outlier
			test.expect(result.outliers.length).toBeGreaterThan(0);
			test.expect(result.outliers[0].value).toBe(100);
		});

		test.test('should handle empty data gracefully', () => {
			const mean = StatisticalAnalyzer.mean([]);
			const stdDev = StatisticalAnalyzer.stdDev([]);
			test.expect(mean).toBe(0);
			test.expect(stdDev).toBe(0);
		});
	});

	test.describe('SecurityRuleEngine', () => {
		test.test('should evaluate threshold rules', () => {
			const rules = new SecurityRuleEngine();
			const rule = ManufacturingRules.failedLoginBurst(5, 5);
			rules.addRule(rule);

			const context = {
				recentEvents: [
					{ eventType: 'user.login.failed', timestamp: new Date() },
					{ eventType: 'user.login.failed', timestamp: new Date() },
					{ eventType: 'user.login.failed', timestamp: new Date() },
					{ eventType: 'user.login.failed', timestamp: new Date() },
					{ eventType: 'user.login.failed', timestamp: new Date() },
					{ eventType: 'user.login.failed', timestamp: new Date() }
				],
				now: new Date()
			};

			const results = rules.evaluate(context);
			test.expect(results.length).toBeGreaterThan(0);
			test.expect(results[0].severity).toBe('high');
		});

		test.test('should handle equipment error rules', () => {
			const rules = new SecurityRuleEngine();
			const rule = ManufacturingRules.equipmentErrorRate(3, 10);
			rules.addRule(rule);

			const context = {
				recentEvents: [
					{ eventType: 'equipment.status.error', timestamp: new Date() },
					{ eventType: 'equipment.status.error', timestamp: new Date() },
					{ eventType: 'equipment.status.error', timestamp: new Date() },
					{ eventType: 'equipment.status.error', timestamp: new Date() }
				],
				now: new Date()
			};

			const results = rules.evaluate(context);
			test.expect(results.length).toBeGreaterThan(0);
			test.expect(results[0].severity).toBe('critical');
		});
	});

	test.describe('ThreatAggregator', () => {
		test.test('should aggregate threat scores from multiple sources', async () => {
			const aggregator = new ThreatAggregator();
			const mockAbuseIPDB = {
				checkIP: jest.fn().mockResolvedValue({ score: 0.8, risk: 'high' })
			};

			// Mock the AbuseIPDB client
			aggregator.abuseIPDB = mockAbuseIPDB;

			const result = await aggregator.evaluate({
				recentEvents: [
					{ eventType: 'user.login.failed', timestamp: new Date() },
					{ eventType: 'user.login.failed', timestamp: new Date() }
				],
				seriesByKey: {
					loginFailures: [1, 1, 1, 1, 1] // 5 failures
				},
				sourceIp: '192.168.1.100'
			});

			test.expect(result.score).toBeGreaterThan(0);
			test.expect(result.level).toBeDefined();
		});

		test.test('should handle missing AbuseIPDB gracefully', async () => {
			const aggregator = new ThreatAggregator();
			aggregator.abuseIPDB = null;

			const result = await aggregator.evaluate({
				recentEvents: [],
				seriesByKey: { loginFailures: [1, 1, 1] },
				sourceIp: '192.168.1.100'
			});

			test.expect(result.score).toBeGreaterThan(0);
			test.expect(result.level).toBeDefined();
		});
	});

	test.describe('SecurityEventService Integration', () => {
		test.test('should track threat metrics', async () => {
			const eventService = new SecurityEventService();
			
			// Simulate events that trigger threat detection
			await eventService.handleSecurityEvent({
				eventType: 'user.login.failed',
				severity: SECURITY_SEVERITY.MEDIUM,
				timestamp: new Date(),
				eventData: { ip: '192.168.1.100' }
			});

			test.expect(eventService.metrics.threat).toBeDefined();
			test.expect(eventService.metrics.threat.lastScore).toBeGreaterThan(0);
			test.expect(eventService.metrics.threat.lastLevel).toBeDefined();
		});
	});

	test.describe('End-to-End Anomaly Detection', () => {
		test.test('should detect and respond to coordinated attack pattern', async () => {
			const eventService = new SecurityEventService();
			const mockEmitter = {
				emitSecurityEvent: jest.fn()
			};

			eventService.securityEmitter = mockEmitter;

			// Simulate coordinated attack: multiple failed logins from same IP
			const attackEvents = [];
			for (let i = 0; i < 15; i++) {
				attackEvents.push({
					eventType: 'user.login.failed',
					severity: SECURITY_SEVERITY.MEDIUM,
					timestamp: new Date(Date.now() - i * 1000), // Spread over time
					eventData: { ip: '192.168.1.100', username: `user${i}` }
				});
			}

			// Process all attack events
			for (const event of attackEvents) {
				await eventService.handleSecurityEvent(event);
			}

			// Should have triggered threat detection
			const threatCalls = mockEmitter.emitSecurityEvent.mock.calls.filter(
				call => call.args[0] === SECURITY_EVENT_TYPES.THREAT_DETECTED
			);

			test.expect(threatCalls.length).toBeGreaterThan(0);
			
			// Check threat level
			const threatCall = threatCalls[0];
			test.expect(threatCall.args[1]).toBe(SECURITY_SEVERITY.HIGH);
			
			const aggregation = threatCall.args[2].aggregation;
			test.expect(aggregation.score).toBeGreaterThan(0.7); // High threat score
			test.expect(['high', 'critical']).toContain(aggregation.level);
		});
	});

	return test.summary();
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
	console.log('🚀 Running Anomaly Detection Framework Tests...\n');
	
	runTests().then(success => {
		if (success) {
			console.log('\n🎉 All tests passed successfully!');
			process.exit(0);
		} else {
			console.log('\n❌ Some tests failed!');
			process.exit(1);
		}
	}).catch(error => {
		console.error('\n💥 Test execution failed:', error.message);
		process.exit(1);
	});
}
