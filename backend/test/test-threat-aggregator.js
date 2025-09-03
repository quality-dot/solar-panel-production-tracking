import assert from 'assert';
import ThreatAggregator from '../services/threatAggregator.js';

const aggregator = new ThreatAggregator({});

const seriesByKey = {
  loginFailures: [1, 2, 2, 2, 10],
  equipmentErrors: [0, 0, 1, 0, 4]
};

const recentEvents = [
  { eventType: 'user.login.failed', timestamp: new Date().toISOString() },
  { eventType: 'user.login.failed', timestamp: new Date().toISOString() },
  { eventType: 'user.login.failed', timestamp: new Date().toISOString() }
];

const run = async () => {
  const res = await aggregator.evaluate({ seriesByKey, recentEvents, sourceIp: null });
  assert(res.score >= 10, 'Score should reflect anomalies/rules');
  console.log('ThreatAggregator test passed:', { score: res.score, level: res.level });
};

run();
