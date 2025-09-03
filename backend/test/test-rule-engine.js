import assert from 'assert';
import { SecurityRuleEngine, ManufacturingRules } from '../utils/ruleEngine.js';

const now = new Date('2025-01-27T15:00:00Z');
const recentEvents = [
  { eventType: 'user.login.failed', timestamp: '2025-01-27T14:58:00Z' },
  { eventType: 'user.login.failed', timestamp: '2025-01-27T14:59:00Z' },
  { eventType: 'user.login.failed', timestamp: '2025-01-27T14:59:30Z' }
];

const engine = new SecurityRuleEngine([
  ManufacturingRules.failedLoginBurst(3, 5)
]);

const hits = engine.evaluate({ recentEvents, now });
assert(hits.length === 1, 'Expected failed login burst to trigger');
assert(hits[0].id === 'auth.failed_burst', 'Rule id mismatch');
console.log('Rule engine test passed:', hits[0]);
