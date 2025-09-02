import SecurityEventEmitter, { SECURITY_EVENT_TYPES, SECURITY_SEVERITY, SECURITY_SOURCES } from '../utils/securityEventEmitter.js';
import ThreatAggregator from './threatAggregator.js';

class SecurityEventService {
	constructor() {
		this.securityEmitter = new SecurityEventEmitter();
		this.isInitialized = false;
		this.recentEventsWindowMs = 10 * 60 * 1000; // 10 minutes window for rule checks
		this.recentEvents = [];
		this.seriesByKey = { loginFailures: [], equipmentErrors: [], unauthorizedAccess: [] };
		this.threatAggregator = new ThreatAggregator();
		this.initialize();
	}

	async initialize() {
		try {
			await this.securityEmitter.initializeDatabase();
			this.setupGlobalListeners();
			await this.securityEmitter.emitSecurityEvent(
				SECURITY_EVENT_TYPES.SYSTEM_STARTUP,
				SECURITY_SEVERITY.LOW,
				{ service: 'SecurityEventService', version: '1.0.0' },
				{ description: 'Security Event Service initialized' }
			);
			this.isInitialized = true;
			console.log('Security Event Service initialized successfully');
		} catch (error) {
			console.error('Error initializing Security Event Service:', error.message);
		}
	}

	setupGlobalListeners() {
		this.securityEmitter.on('securityEvent', (event) => this.handleSecurityEvent(event));
		this.securityEmitter.on(SECURITY_EVENT_TYPES.THREAT_DETECTED, (event) => this.handleThreatEvent(event));
		this.securityEmitter.on(SECURITY_EVENT_TYPES.AUTH_FAILURE, (event) => this.handleAuthFailure(event));
		this.securityEmitter.on(SECURITY_EVENT_TYPES.MANUFACTURING_ACCESS, (event) => this.handleManufacturingEvent(event));
		this.securityEmitter.on(SECURITY_EVENT_TYPES.DATA_READ, (event) => this.handleDataAccessEvent(event));
		this.securityEmitter.on(SECURITY_EVENT_TYPES.DATA_WRITE, (event) => this.handleDataAccessEvent(event));
		this.securityEmitter.on(SECURITY_EVENT_TYPES.COMPLIANCE_VIOLATION, (event) => this.handleComplianceViolation(event));
	}

	async handleSecurityEvent(event) {
		try {
			if (process.env.NODE_ENV === 'development') {
				console.log(`[SECURITY] ${event.eventType}: ${event.severity}`);
			}
			this.cacheEvent(event);
			this.updateSeriesFromEvent(event);
			// Evaluate threat score on relevant events
			if (this.shouldEvaluateThreat(event)) {
				const aggregation = await this.threatAggregator.evaluate({
					recentEvents: this.getRecentEvents(),
					seriesByKey: this.seriesByKey,
					sourceIp: event.eventData?.ip || event.eventData?.sourceIp
				});
				this.lastThreatAggregation = aggregation;
				// emit high/critical as detected threats
				if (aggregation.level === 'high' || aggregation.level === 'critical') {
					await this.securityEmitter.emitSecurityEvent(
						SECURITY_EVENT_TYPES.THREAT_DETECTED,
						aggregation.level === 'critical' ? SECURITY_SEVERITY.CRITICAL : SECURITY_SEVERITY.HIGH,
						{ aggregation },
						{ source: 'ThreatAggregator' }
					);
				}
				// update metrics store
				this.updateThreatMetrics(aggregation);
			}
			if (event.severity === SECURITY_SEVERITY.CRITICAL) {
				await this.escalateCriticalEvent?.(event);
			}
			this.updateMetrics(event);
		} catch (error) {
			console.error('Error handling security event:', error.message);
		}
	}

	async handleThreatEvent(event) {
		try {
			console.warn(`[THREAT] ${event.eventType}`);
			await this.logThreatResponse(event);
		} catch (error) {
			console.error('Error handling threat event:', error.message);
		}
	}

	async handleAuthFailure(event) {
		try {
			const { userId } = event.eventData;
			const failureCount = await this.getRecentAuthFailures(userId);
			if (failureCount >= 5) {
				await this.securityEmitter.emitSecurityEvent(
					SECURITY_EVENT_TYPES.AUTH_LOCKOUT,
					SECURITY_SEVERITY.HIGH,
					{ userId, reason: 'Multiple failed attempts', failureCount },
					{ source: 'SecurityEventService', action: 'automatic_lockout' }
				);
			}
		} catch (error) {
			console.error('Error handling auth failure event:', error.message);
		}
	}

	async handleManufacturingEvent(event) {
		try {
			const { userId, stationId, operation } = event.eventData;
			console.log(`[MANUFACTURING] User ${userId} performed ${operation} at station ${stationId}`);
			await this.checkManufacturingAnomalies(event);
		} catch (error) {
			console.error('Error handling manufacturing event:', error.message);
		}
	}

	async handleDataAccessEvent(event) {
		try {
			const { userId, dataType, operation } = event.eventData;
			if (process.env.NODE_ENV === 'development') {
				console.log(`[DATA_ACCESS] User ${userId} performed ${operation} on ${dataType}`);
			}
			await this.checkDataAccessAnomalies(event);
		} catch (error) {
			console.error('Error handling data access event:', error.message);
		}
	}

	async handleComplianceViolation(event) {
		try {
			console.error(`[COMPLIANCE_VIOLATION] ${event.eventType}`);
			await this.reportComplianceViolation(event);
		} catch (error) {
			console.error('Error handling compliance violation event:', error.message);
		}
	}

	async emitEvent(eventType, severity = SECURITY_SEVERITY.MEDIUM, eventData = {}, metadata = {}) {
		if (!this.isInitialized) await this.initialize();
		return this.securityEmitter.emitSecurityEvent(eventType, severity, eventData, metadata);
	}

	async getEvents(filters = {}) {
		return this.securityEmitter.getEvents(filters);
	}

	async getStatistics(timeRange = '24h') {
		return this.securityEmitter.getEventStatistics(timeRange);
	}

	async cleanupOldEvents(retentionDays = 2555) {
		return this.securityEmitter.cleanupOldEvents(retentionDays);
	}

	setContext(correlationId, sessionId, userId, source = SECURITY_SOURCES.USER) {
		this.securityEmitter.setContext(correlationId, sessionId, userId, source);
	}

	clearContext() { this.securityEmitter.clearContext(); }

	async getRecentAuthFailures(userId) {
		try {
			const rows = await this.securityEmitter.getEvents({ userId, eventType: SECURITY_EVENT_TYPES.AUTH_FAILURE, startDate: new Date(Date.now() - 60 * 60 * 1000) });
			return rows.length;
		} catch { return 0; }
	}

	async checkManufacturingAnomalies(event) { console.log(`[ANOMALY_CHECK] Manufacturing ${event.eventData.operation}`); }
	async checkDataAccessAnomalies(event) { console.log(`[ANOMALY_CHECK] Data ${event.eventData.operation}`); }

	async logThreatResponse(event) {
		await this.securityEmitter.emitSecurityEvent(
			SECURITY_EVENT_TYPES.THREAT_BLOCKED,
			SECURITY_SEVERITY.MEDIUM,
			{ originalThreat: event.eventType, response: 'logged_and_monitored', timestamp: new Date() },
			{ source: 'SecurityEventService', action: 'threat_response' }
		);
	}

	async reportComplianceViolation(event) {
		await this.securityEmitter.emitSecurityEvent(
			SECURITY_EVENT_TYPES.COMPLIANCE_REPORT,
			SECURITY_SEVERITY.HIGH,
			{ violation: event.eventType, details: event.eventData, reportedAt: new Date() },
			{ source: 'SecurityEventService', action: 'compliance_reporting' }
		);
	}

	cacheEvent(event) {
		this.eventCache ||= [];
		this.eventCache.push(event);
		if (this.eventCache.length > 1000) this.eventCache = this.eventCache.slice(-1000);
	}

	updateMetrics(event) {
		this.metrics ||= { totalEvents: 0, eventsBySeverity: {}, eventsByType: {}, eventsBySource: {} };
		this.metrics.totalEvents++;
		this.metrics.eventsBySeverity[event.severity] = (this.metrics.eventsBySeverity[event.severity] || 0) + 1;
		this.metrics.eventsByType[event.eventType] = (this.metrics.eventsByType[event.eventType] || 0) + 1;
		this.metrics.eventsBySource[event.source] = (this.metrics.eventsBySource[event.source] || 0) + 1;
	}

	updateThreatMetrics(aggregation) {
		this.metrics ||= {};
		this.metrics.threat ||= { lastScore: 0, lastLevel: 'low' };
		this.metrics.threat.lastScore = aggregation.score;
		this.metrics.threat.lastLevel = aggregation.level;
	}

	shouldEvaluateThreat(event) {
		// Evaluate threats for security-relevant events
		const securityEventTypes = [
			SECURITY_EVENT_TYPES.AUTH_FAILURE,
			SECURITY_EVENT_TYPES.THREAT_DETECTED,
			SECURITY_EVENT_TYPES.MANUFACTURING_ACCESS,
			SECURITY_EVENT_TYPES.DATA_READ,
			SECURITY_EVENT_TYPES.DATA_WRITE,
			SECURITY_EVENT_TYPES.COMPLIANCE_VIOLATION
		];
		
		return securityEventTypes.includes(event.eventType) || 
			   event.eventType?.includes('login.failed') ||
			   event.eventType?.includes('unauthorized');
	}

	updateSeriesFromEvent(event) {
		const type = event.eventType || '';
		if (type === 'user.login.failed' || type === SECURITY_EVENT_TYPES.AUTH_FAILURE) {
			this.pushSeriesPoint('loginFailures', 1);
		}
		if (type === 'equipment.status.error') {
			this.pushSeriesPoint('equipmentErrors', 1);
		}
		if (type === 'data.access.unauthorized') {
			this.pushSeriesPoint('unauthorizedAccess', 1);
		}
	}

	pushSeriesPoint(key, value) {
		const arr = this.seriesByKey[key] || (this.seriesByKey[key] = []);
		arr.push(Number(value) || 0);
		if (arr.length > 200) this.seriesByKey[key] = arr.slice(-200);
	}

	getRecentEvents() {
		const cutoff = Date.now() - this.recentEventsWindowMs;
		this.recentEvents = (this.recentEvents || []).filter(e => new Date(e.timestamp).getTime() >= cutoff);
		return this.recentEvents;
	}

	cacheEvent(event) {
		this.eventCache ||= [];
		this.eventCache.push(event);
		if (this.eventCache.length > 1000) this.eventCache = this.eventCache.slice(-1000);
		// also keep light recentEvents list for rules
		this.recentEvents.push({ eventType: event.eventType, timestamp: event.timestamp });
	}

	getMetrics() { return this.metrics || { totalEvents: 0, eventsBySeverity: {}, eventsByType: {}, eventsBySource: {} }; }
	getCachedEvents(limit = 100) { return (this.eventCache || []).slice(-limit); }

	async emitAuthSuccess(userId, sessionId, metadata = {}) { return this.emitEvent(SECURITY_EVENT_TYPES.AUTH_SUCCESS, SECURITY_SEVERITY.LOW, { userId, sessionId }, metadata); }
	async emitAuthFailure(userId, reason, metadata = {}) { return this.emitEvent(SECURITY_EVENT_TYPES.AUTH_FAILURE, SECURITY_SEVERITY.MEDIUM, { userId, reason }, metadata); }
	async emitThreatDetected(threatType, details, metadata = {}) { return this.emitEvent(SECURITY_EVENT_TYPES.THREAT_DETECTED, SECURITY_SEVERITY.HIGH, { threatType, details }, metadata); }
	async emitDataAccess(userId, dataType, operation, metadata = {}) {
		const key = `DATA_${operation.toUpperCase()}`;
		if (SECURITY_EVENT_TYPES[key]) return this.emitEvent(SECURITY_EVENT_TYPES[key], SECURITY_SEVERITY.LOW, { userId, dataType, operation }, metadata);
	}
	async emitManufacturingEvent(userId, stationId, operation, details, metadata = {}) {
		const key = `MANUFACTURING_${operation.toUpperCase()}`;
		if (SECURITY_EVENT_TYPES[key]) return this.emitEvent(SECURITY_EVENT_TYPES[key], SECURITY_SEVERITY.MEDIUM, { userId, stationId, operation, details }, metadata);
	}
	async emitComplianceViolation(violationType, details, metadata = {}) { return this.emitEvent(SECURITY_EVENT_TYPES.COMPLIANCE_VIOLATION, SECURITY_SEVERITY.HIGH, { violationType, details }, metadata); }
}

export const securityEventService = new SecurityEventService();
export { SECURITY_EVENT_TYPES, SECURITY_SEVERITY, SECURITY_SOURCES };
export default SecurityEventService;
