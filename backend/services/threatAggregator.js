// ThreatAggregator (22.7)
// Combines statistical anomalies, rule hits, and reputation into unified score

import { StatisticalAnalyzer } from '../utils/statisticalAnalyzer.js';
import { SecurityRuleEngine, ManufacturingRules } from '../utils/ruleEngine.js';
import AbuseIpdbClient from '../utils/abuseIpdbClient.js';

export class ThreatAggregator {
	constructor(options = {}) {
		this.ruleEngine = options.ruleEngine || new SecurityRuleEngine([
			ManufacturingRules.failedLoginBurst(5, 5),
			ManufacturingRules.equipmentErrorRate(3, 10),
			ManufacturingRules.unauthorizedAccessBurst(2, 10)
		]);
		this.abuseClient = options.abuseClient || new AbuseIpdbClient();
	}

	// context: { metrics, recentEvents, seriesByKey, sourceIp }
	async evaluate(context = {}) {
		const now = new Date();
		const { seriesByKey = {}, recentEvents = [], sourceIp } = context;

		// Statistical anomalies (simple last-point checks)
		const stats = {};
		const anomalies = [];
		for (const [key, series] of Object.entries(seriesByKey)) {
			const res = StatisticalAnalyzer.isLastPointAnomalous(series, 3);
			stats[key] = res.stats;
			if (res.anomalous) anomalies.push({ type: 'statistical', key, stats: res.stats });
		}

		// Rule hits
		const rules = this.ruleEngine.evaluate({ recentEvents, now });

		// IP reputation
		let ipRep = null;
		if (sourceIp) {
			ipRep = await this.abuseClient.checkIp(sourceIp);
		}

		// Aggregate score (0-100)
		let score = 0;
		score += Math.min(anomalies.length * 10, 30); // up to 30 from anomalies
		score += Math.min(rules.length * 15, 45); // up to 45 from rules
		if (ipRep && ipRep.supported) {
			score += Math.min(ipRep.reputation, 25); // up to 25 from reputation
		}
		score = Math.max(0, Math.min(100, score));

		let level = 'low';
		if (score >= 80) level = 'critical';
		else if (score >= 60) level = 'high';
		else if (score >= 35) level = 'medium';

		return {
			score,
			level,
			anomalies,
			rules,
			reputation: ipRep,
			stats
		};
	}
}

export default ThreatAggregator;
