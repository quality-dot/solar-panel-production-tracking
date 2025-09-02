// Threat Response System for IP blocking and automated responses (22.7)
// ES module

import { ThreatAggregator } from './threatAggregator.js';

export class ThreatResponseSystem {
	constructor(config = {}) {
		this.threatAggregator = new ThreatAggregator();
		this.blockedIPs = new Map();
		this.threatScores = new Map();
		this.responseRules = new Map();
		this.recentEvents = new Map(); // Store recent events by IP
		this.maxBlockDuration = config.maxBlockDuration || 24 * 60 * 60 * 1000; // 24 hours
		this.threatScoreThreshold = config.threatScoreThreshold || 70;
		this.autoBlockEnabled = config.autoBlockEnabled !== false;
		
		this.initializeResponseRules();
	}

	initializeResponseRules() {
		// Critical threat responses
		this.responseRules.set('critical', [
			'block_ip',
			'notify_security_team',
			'log_incident',
			'enhance_monitoring',
			'consider_system_lockdown'
		]);

		// High threat responses
		this.responseRules.set('high', [
			'rate_limit_ip',
			'notify_security_team',
			'log_incident',
			'enhance_monitoring'
		]);

		// Medium threat responses
		this.responseRules.set('medium', [
			'log_incident',
			'enhance_monitoring',
			'flag_for_review'
		]);

		// Low threat responses
		this.responseRules.set('low', [
			'log_incident',
			'continue_monitoring'
		]);
	}

	async processSecurityEvent(event) {
		try {
			const { sourceIp, userId, stationId } = event;
			
			// Skip if no source IP
			if (!sourceIp) {
				return { action: 'none', reason: 'No source IP' };
			}

			// Check if IP is already blocked
			if (this.isIPBlocked(sourceIp)) {
				return { action: 'blocked', reason: 'IP already blocked', blockInfo: this.getBlockInfo(sourceIp) };
			}

			// Store the current event
			this.storeEvent(sourceIp, event);
			
			// Get recent events for context (including the current one)
			const recentEvents = this.getRecentEvents(sourceIp, 60); // Last 60 minutes
			
			// Convert events to series format for ThreatAggregator
			const seriesByKey = this.convertEventsToSeries(recentEvents);
			
			// Evaluate threat level with accumulated events and series data
			const threatAssessment = await this.threatAggregator.evaluateThreat({
				recentEvents,
				seriesByKey,
				sourceIp,
				userId,
				stationId,
				timeWindow: 60
			});

			// Update threat score
			this.updateThreatScore(sourceIp, threatAssessment.score);

			// Determine response actions
			const responseActions = this.determineResponseActions(threatAssessment);

			// Execute response actions
			const executedActions = await this.executeResponseActions(responseActions, {
				sourceIp,
				userId,
				stationId,
				threatAssessment,
				event
			});

			return {
				action: responseActions.primary,
				threatLevel: threatAssessment.level,
				threatScore: threatAssessment.score,
				executedActions,
				recommendations: threatAssessment.recommendations
			};

		} catch (error) {
			console.error('Error processing security event:', error);
			return { action: 'error', reason: error.message };
		}
	}

	convertEventsToSeries(events) {
		// Ensure events is an array
		if (!Array.isArray(events)) {
			console.warn('convertEventsToSeries: events is not an array, using empty array');
			events = [];
		}
		
		const seriesByKey = {
			loginFailures: [],
			equipmentErrors: [],
			unauthorizedAccess: []
		};
		
		// Count events by type over time windows
		const timeWindows = [1, 5, 15, 30, 60]; // minutes
		const now = new Date();
		
		timeWindows.forEach(windowMinutes => {
			const cutoff = new Date(now.getTime() - windowMinutes * 60 * 1000);
			const windowEvents = events.filter(e => e && e.timestamp && new Date(e.timestamp) >= cutoff);
			
			// Count different event types in this time window
			const loginFailures = windowEvents.filter(e => e.eventType === 'user.login.failed').length;
			const equipmentErrors = windowEvents.filter(e => e.eventType && e.eventType.includes('equipment')).length;
			const unauthorizedAccess = windowEvents.filter(e => e.eventType && (e.eventType.includes('unauthorized') || e.eventType.includes('access'))).length;
			
			seriesByKey.loginFailures.push(loginFailures);
			seriesByKey.equipmentErrors.push(equipmentErrors);
			seriesByKey.unauthorizedAccess.push(unauthorizedAccess);
		});
		
		return seriesByKey;
	}

	determineResponseActions(threatAssessment) {
		const { level, score } = threatAssessment;
		const rules = this.responseRules.get(level) || [];
		
		let primary = 'none';
		let secondary = [];

		// Determine primary action based on threat level and score
		// Lower thresholds to ensure blocking happens more readily
		if (level === 'critical' || score >= 70) {
			primary = 'block_ip';
		} else if (level === 'high' || score >= 50) {
			primary = 'rate_limit_ip';
		} else if (level === 'medium' || score >= 25) {
			primary = 'enhance_monitoring';
		} else {
			primary = 'continue_monitoring';
		}

		// Special handling for failed login bursts and unauthorized access
		if (score >= 80) {
			primary = 'block_ip';
		} else if (score >= 60) {
			primary = 'rate_limit_ip';
		}

		// Determine secondary actions
		secondary = rules.filter(rule => rule !== primary);

		return { primary, secondary, all: rules };
	}

	async executeResponseActions(responseActions, context) {
		const { sourceIp, threatAssessment, event } = context;
		const executed = [];

		try {
			// Execute primary action
			if (responseActions.primary === 'block_ip') {
				await this.blockIP(sourceIp, threatAssessment, event);
				executed.push('block_ip');
			} else if (responseActions.primary === 'rate_limit_ip') {
				await this.rateLimitIP(sourceIp, threatAssessment, event);
				executed.push('rate_limit_ip');
			}

			// Execute secondary actions
			for (const action of responseActions.secondary) {
				try {
					await this.executeAction(action, context);
					executed.push(action);
				} catch (error) {
					console.warn(`Failed to execute action ${action}:`, error.message);
				}
			}

		} catch (error) {
			console.error('Error executing response actions:', error);
		}

		return executed;
	}

	async executeAction(action, context) {
		const { sourceIp, threatAssessment, event } = context;

		switch (action) {
			case 'notify_security_team':
				await this.notifySecurityTeam(threatAssessment, event);
				break;
			case 'log_incident':
				await this.logIncident(threatAssessment, event);
				break;
			case 'enhance_monitoring':
				await this.enhanceMonitoring(sourceIp, threatAssessment);
				break;
			case 'flag_for_review':
				await this.flagForReview(sourceIp, threatAssessment);
				break;
			case 'consider_system_lockdown':
				await this.considerSystemLockdown(threatAssessment);
				break;
		}
	}

	async blockIP(ipAddress, threatAssessment, event) {
		const blockInfo = {
			ip: ipAddress,
			timestamp: new Date(),
			reason: threatAssessment.factors.join('; '),
			threatScore: threatAssessment.score,
			threatLevel: threatAssessment.level,
			eventId: event.id,
			userId: event.userId,
			stationId: event.stationId,
			duration: this.calculateBlockDuration(threatAssessment.score),
			expiresAt: new Date(Date.now() + this.calculateBlockDuration(threatAssessment.score))
		};

		this.blockedIPs.set(ipAddress, blockInfo);
		
		// Log the block action
		console.log(`🚫 IP ${ipAddress} blocked due to ${threatAssessment.level} threat (Score: ${threatAssessment.score})`);
		
		return blockInfo;
	}

	async rateLimitIP(ipAddress, threatAssessment, event) {
		// Implement rate limiting logic
		const rateLimitInfo = {
			ip: ipAddress,
			timestamp: new Date(),
			threatScore: threatAssessment.score,
			rateLimit: 'strict', // strict, moderate, light
			expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
		};

		// Store rate limit info (could be in Redis for distributed systems)
		console.log(`⏱️ IP ${ipAddress} rate limited due to ${threatAssessment.level} threat`);
		
		return rateLimitInfo;
	}

	async notifySecurityTeam(threatAssessment, event) {
		// Implementation would integrate with notification system
		const notification = {
			type: 'security_threat',
			severity: threatAssessment.severity,
			message: `Security threat detected: ${threatAssessment.level} level`,
			details: {
				threatScore: threatAssessment.score,
				factors: threatAssessment.factors,
				recommendations: threatAssessment.recommendations,
				event: {
					id: event.id,
					type: event.eventType,
					sourceIp: event.sourceIp,
					userId: event.userId
				}
			},
			timestamp: new Date()
		};

		console.log(`🚨 Security notification: ${notification.message}`);
		return notification;
	}

	async logIncident(threatAssessment, event) {
		// Implementation would integrate with logging system
		const incident = {
			id: `incident-${Date.now()}`,
			threatLevel: threatAssessment.level,
			threatScore: threatAssessment.score,
			factors: threatAssessment.factors,
			event: event,
			timestamp: new Date(),
			status: 'active'
		};

		console.log(`📝 Security incident logged: ${incident.id}`);
		return incident;
	}

	async enhanceMonitoring(ipAddress, threatAssessment) {
		// Implementation would integrate with monitoring system
		const monitoringConfig = {
			ip: ipAddress,
			enhanced: true,
			threatLevel: threatAssessment.level,
			monitoringLevel: 'high',
			expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours
		};

		console.log(`🔍 Enhanced monitoring enabled for IP ${ipAddress}`);
		return monitoringConfig;
	}

	async flagForReview(ipAddress, threatAssessment) {
		// Implementation would integrate with review system
		const reviewFlag = {
			ip: ipAddress,
			threatLevel: threatAssessment.level,
			threatScore: threatAssessment.score,
			flaggedAt: new Date(),
			priority: threatAssessment.level === 'medium' ? 'medium' : 'low'
		};

		console.log(`🏁 IP ${ipAddress} flagged for security review`);
		return reviewFlag;
	}

	async considerSystemLockdown(threatAssessment) {
		// Implementation would integrate with system control
		const lockdownAssessment = {
			threatLevel: threatAssessment.level,
			threatScore: threatAssessment.score,
			recommended: threatAssessment.score >= 90,
			reason: threatAssessment.factors.join('; '),
			timestamp: new Date()
		};

		if (lockdownAssessment.recommended) {
			console.log(`🚨 SYSTEM LOCKDOWN RECOMMENDED: Threat score ${threatAssessment.score}/100`);
		}

		return lockdownAssessment;
	}

	calculateBlockDuration(threatScore) {
		// Dynamic block duration based on threat score
		if (threatScore >= 90) return 7 * 24 * 60 * 60 * 1000; // 7 days
		if (threatScore >= 80) return 3 * 24 * 60 * 60 * 1000; // 3 days
		if (threatScore >= 70) return 24 * 60 * 60 * 1000; // 1 day
		if (threatScore >= 60) return 6 * 60 * 60 * 1000; // 6 hours
		return 2 * 60 * 60 * 1000; // 2 hours
	}

	updateThreatScore(ipAddress, score) {
		if (!this.threatScores.has(ipAddress)) {
			this.threatScores.set(ipAddress, []);
		}

		const scores = this.threatScores.get(ipAddress);
		scores.push({
			timestamp: new Date(),
			score: score
		});

		// Keep only recent scores (last 24 hours)
		const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
		const filtered = scores.filter(entry => entry.timestamp > cutoff);
		this.threatScores.set(ipAddress, filtered);
	}

	getThreatScore(ipAddress) {
		const scores = this.threatScores.get(ipAddress) || [];
		if (scores.length === 0) return 0;

		// Calculate weighted average (recent scores have more weight)
		let totalWeight = 0;
		let weightedSum = 0;

		scores.forEach((entry, index) => {
			const weight = Math.exp(-index * 0.1); // Exponential decay
			totalWeight += weight;
			weightedSum += entry.score * weight;
		});

		return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
	}

	isIPBlocked(ipAddress) {
		const blockInfo = this.blockedIPs.get(ipAddress);
		if (!blockInfo) return false;

		// Check if block has expired
		if (new Date() > blockInfo.expiresAt) {
			this.blockedIPs.delete(ipAddress);
			return false;
		}

		return true;
	}

	getBlockInfo(ipAddress) {
		return this.blockedIPs.get(ipAddress);
	}

	unblockIP(ipAddress, reason = 'Manual unblock') {
		const blockInfo = this.blockedIPs.get(ipAddress);
		if (blockInfo) {
			blockInfo.unblockedAt = new Date();
			blockInfo.unblockReason = reason;
			this.blockedIPs.delete(ipAddress);
			
			console.log(`✅ IP ${ipAddress} unblocked: ${reason}`);
			return blockInfo;
		}
		return null;
	}

	getBlockedIPs() {
		const now = new Date();
		const active = [];
		const expired = [];

		for (const [ip, blockInfo] of this.blockedIPs) {
			if (now > blockInfo.expiresAt) {
				expired.push({ ip, ...blockInfo });
				this.blockedIPs.delete(ip);
			} else {
				active.push({ ip, ...blockInfo });
			}
		}

		return { active, expired };
	}

	getRecentEvents(ipAddress, minutes = 60) {
		if (!ipAddress) {
			return [];
		}
		
		if (!this.recentEvents.has(ipAddress)) {
			this.recentEvents.set(ipAddress, []);
			return [];
		}
		
		const events = this.recentEvents.get(ipAddress);
		if (!Array.isArray(events)) {
			this.recentEvents.set(ipAddress, []);
			return [];
		}
		
		const cutoff = new Date(Date.now() - minutes * 60 * 1000);
		
		// Filter events within time window and clean up old ones
		const recentEvents = events.filter(event => event && event.timestamp && new Date(event.timestamp) >= cutoff);
		
		// Update stored events to only keep recent ones
		this.recentEvents.set(ipAddress, recentEvents);
		
		return recentEvents;
	}

	storeEvent(ipAddress, event) {
		if (!ipAddress) return;
		
		if (!this.recentEvents.has(ipAddress)) {
			this.recentEvents.set(ipAddress, []);
		}
		
		const events = this.recentEvents.get(ipAddress);
		if (!Array.isArray(events)) {
			this.recentEvents.set(ipAddress, []);
		}
		
		const eventsArray = this.recentEvents.get(ipAddress);
		eventsArray.push({
			...event,
			timestamp: new Date().toISOString()
		});
		
		// Keep only last 100 events per IP to prevent memory issues
		if (eventsArray.length > 100) {
			eventsArray.splice(0, eventsArray.length - 100);
		}
	}

	getSystemStats() {
		const blockedIPs = Array.from(this.blockedIPs.values());
		const threatScores = Array.from(this.threatScores.values());

		return {
			totalBlockedIPs: blockedIPs.length,
			activeBlockedIPs: blockedIPs.filter(b => new Date() <= b.expiresAt).length,
			totalTrackedIPs: threatScores.length,
			avgThreatScore: threatScores.length > 0 
				? Math.round(threatScores.reduce((sum, scores) => sum + this.getThreatScore(scores[0]?.ip || ''), 0) / threatScores.length)
				: 0,
			responseRules: Object.fromEntries(this.responseRules),
			autoBlockEnabled: this.autoBlockEnabled,
			threatScoreThreshold: this.threatScoreThreshold
		};
	}

	// Configuration methods
	updateConfig(newConfig) {
		if (newConfig.maxBlockDuration !== undefined) {
			this.maxBlockDuration = newConfig.maxBlockDuration;
		}
		if (newConfig.threatScoreThreshold !== undefined) {
			this.threatScoreThreshold = newConfig.threatScoreThreshold;
		}
		if (newConfig.autoBlockEnabled !== undefined) {
			this.autoBlockEnabled = newConfig.autoBlockEnabled;
		}

		console.log('Threat response system configuration updated:', newConfig);
	}

	// Cleanup expired entries
	cleanup() {
		const now = new Date();
		let cleaned = 0;

		// Clean expired blocks
		for (const [ip, blockInfo] of this.blockedIPs) {
			if (now > blockInfo.expiresAt) {
				this.blockedIPs.delete(ip);
				cleaned++;
			}
		}

		// Clean old threat scores (older than 7 days)
		const scoreCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
		for (const [ip, scores] of this.threatScores) {
			const filtered = scores.filter(entry => entry.timestamp > scoreCutoff);
			if (filtered.length === 0) {
				this.threatScores.delete(ip);
				cleaned++;
			} else {
				this.threatScores.set(ip, filtered);
			}
		}

		if (cleaned > 0) {
			console.log(`🧹 Cleaned up ${cleaned} expired entries`);
		}

		return cleaned;
	}
}

export default ThreatResponseSystem;
