// Threshold-based Security Rule Engine (22.7)
// ES module

export class SecurityRuleEngine {
	constructor(rules = []) {
		this.rules = Array.isArray(rules) ? rules : [];
	}

	addRule(rule) {
		this.rules.push(rule);
	}

	clear() {
		this.rules = [];
	}

	// context: { metrics, recentEvents, now }
	evaluate(context) {
		const results = [];
		for (const rule of this.rules) {
			try {
				const passed = !!rule.condition(context);
				if (passed) {
					results.push({
						id: rule.id,
						severity: rule.severity || 'medium',
						message: rule.message,
						metadata: rule.metadata ? rule.metadata(context) : undefined
					});
				}
			} catch (e) {
				// ignore failing rule; optionally log
			}
		}
		return results;
	}
}

// Example manufacturing rules
export const ManufacturingRules = {
	// Trigger if failed logins in the last N minutes exceed threshold
	failedLoginBurst: (threshold = 5, minutes = 5) => ({
		id: 'auth.failed_burst',
		severity: 'high',
		message: `Multiple failed logins detected (> ${threshold} in ${minutes}m)`,
		metadata: ({ recentEvents }) => ({ count: (recentEvents || []).length }),
		condition: ({ recentEvents = [], now = new Date() }) => {
			const cutoff = new Date(now.getTime() - minutes * 60 * 1000);
			const count = recentEvents.filter(e => e.eventType === 'user.login.failed' && new Date(e.timestamp) >= cutoff).length;
			return count >= threshold;
		}
	}),

	// Trigger if equipment error events exceed threshold over the last period
	equipmentErrorRate: (threshold = 3, minutes = 10) => ({
		id: 'equipment.error_rate',
		severity: 'critical',
		message: `Elevated equipment errors (> ${threshold} in ${minutes}m)`,
		metadata: ({ recentEvents }) => ({ count: (recentEvents || []).length }),
		condition: ({ recentEvents = [], now = new Date() }) => {
			const cutoff = new Date(now.getTime() - minutes * 60 * 1000);
			const count = recentEvents.filter(e => e.eventType === 'equipment.status.error' && new Date(e.timestamp) >= cutoff).length;
			return count >= threshold;
		}
	}),

	// Trigger on unauthorized data access attempts beyond a threshold in period
	unauthorizedAccessBurst: (threshold = 2, minutes = 10) => ({
		id: 'data.unauthorized_burst',
		severity: 'high',
		message: `Unauthorized access attempts exceed threshold (> ${threshold} in ${minutes}m)`,
		metadata: ({ recentEvents }) => ({ count: (recentEvents || []).length }),
		condition: ({ recentEvents = [], now = new Date() }) => {
			const cutoff = new Date(now.getTime() - minutes * 60 * 1000);
			const count = recentEvents.filter(e => e.eventType === 'data.access.unauthorized' && new Date(e.timestamp) >= cutoff).length;
			return count >= threshold;
		}
	})
};

export default SecurityRuleEngine;
