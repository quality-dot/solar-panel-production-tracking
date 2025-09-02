import EventEmitter from 'events';
import crypto from 'crypto';
import databaseManager from '../config/database.js';

// Security Event Types for comprehensive monitoring
export const SECURITY_EVENT_TYPES = {
	AUTH_SUCCESS: 'auth_success',
	AUTH_FAILURE: 'auth_failure',
	AUTH_LOCKOUT: 'auth_lockout',
	AUTH_TIMEOUT: 'auth_timeout',
	AUTH_LOGOUT: 'auth_logout',

	MANUFACTURING_ACCESS: 'manufacturing_access',
	MANUFACTURING_MODIFICATION: 'manufacturing_modification',
	MANUFACTURING_DELETION: 'manufacturing_deletion',
	MANUFACTURING_EXPORT: 'manufacturing_export',

	DATA_READ: 'data_read',
	DATA_WRITE: 'data_write',
	DATA_DELETE: 'data_delete',
	DATA_EXPORT: 'data_export',
	DATA_IMPORT: 'data_import',

	THREAT_DETECTED: 'threat_detected',
	THREAT_BLOCKED: 'threat_blocked',
	THREAT_ESCALATED: 'threat_escalated',

	SYSTEM_STARTUP: 'system_startup',
	SYSTEM_SHUTDOWN: 'system_shutdown',
	SYSTEM_ERROR: 'system_error',
	SYSTEM_WARNING: 'system_warning',

	COMPLIANCE_CHECK: 'compliance_check',
	COMPLIANCE_VIOLATION: 'compliance_violation',
	COMPLIANCE_REPORT: 'compliance_report'
};

// Security Event Severity Levels
export const SECURITY_SEVERITY = {
	LOW: 'low',
	MEDIUM: 'medium',
	HIGH: 'high',
	CRITICAL: 'critical'
};

// Security Event Source Types
export const SECURITY_SOURCES = {
	USER: 'user',
	SYSTEM: 'system',
	EXTERNAL: 'external',
	AUTOMATED: 'automated'
};

export class SecurityEventEmitter extends EventEmitter {
	constructor() {
		super();
		this.correlationId = null;
		this.sessionId = null;
		this.userId = null;
		this.source = SECURITY_SOURCES.SYSTEM;
		this.dbReady = false;
		this.initializeDatabase();
	}

	async execQuery(query, values = []) {
		try {
			if (!databaseManager.getPool()) {
				// Attempt to initialize once
				await databaseManager.initialize();
			}
			if (!databaseManager.getPool()) {
				// Development mode without DB; skip persistence
				return null;
			}
			return await databaseManager.query(query, values);
		} catch (error) {
			// Don't throw to avoid taking down the app due to telemetry
			console.error('Error executing security event query:', error.message);
			return null;
		}
	}

	async initializeDatabase() {
		try {
			await databaseManager.initialize();
			if (!databaseManager.getPool()) {
				this.dbReady = false;
				return;
			}
			const createTableQuery = `
				CREATE TABLE IF NOT EXISTS security_events (
					id SERIAL PRIMARY KEY,
					event_type VARCHAR(50) NOT NULL,
					severity VARCHAR(20) NOT NULL DEFAULT 'medium',
					source VARCHAR(20) NOT NULL DEFAULT 'system',
					correlation_id VARCHAR(64),
					session_id VARCHAR(64),
					user_id INTEGER,
					ip_address INET,
					user_agent TEXT,
					event_data JSONB,
					metadata JSONB,
					timestamp TIMESTAMPTZ DEFAULT NOW(),
					created_at TIMESTAMPTZ DEFAULT NOW()
				);
				CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
				CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
				CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp);
				CREATE INDEX IF NOT EXISTS idx_security_events_correlation_id ON security_events(correlation_id);
				CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
				CREATE INDEX IF NOT EXISTS idx_security_events_source ON security_events(source);
			`;
			await this.execQuery(createTableQuery);
			this.dbReady = true;
		} catch (error) {
			console.error('Error initializing security events table:', error.message);
			this.dbReady = false;
		}
	}

	setContext(correlationId, sessionId, userId, source = SECURITY_SOURCES.SYSTEM) {
		this.correlationId = correlationId;
		this.sessionId = sessionId;
		this.userId = userId;
		this.source = source;
	}

	clearContext() {
		this.correlationId = null;
		this.sessionId = null;
		this.userId = null;
		this.source = SECURITY_SOURCES.SYSTEM;
	}

	generateCorrelationId() {
		return crypto.randomBytes(32).toString('hex');
	}

	async emitSecurityEvent(eventType, severity = SECURITY_SEVERITY.MEDIUM, eventData = {}, metadata = {}) {
		if (!Object.values(SECURITY_EVENT_TYPES).includes(eventType)) {
			throw new Error(`Invalid security event type: ${eventType}`);
		}
		if (!Object.values(SECURITY_SEVERITY).includes(severity)) {
			throw new Error(`Invalid security severity: ${severity}`);
		}
		const event = {
			eventType,
			severity,
			source: this.source,
			correlationId: this.correlationId,
			sessionId: this.sessionId,
			userId: this.userId,
			eventData,
			metadata,
			timestamp: new Date()
		};

		this.emit('securityEvent', event);
		this.emit(eventType, event);
		await this.persistEvent(event);
		return event;
	}

	async persistEvent(event) {
		const insertQuery = `
			INSERT INTO security_events (
				event_type, severity, source, correlation_id, session_id, user_id,
				event_data, metadata, timestamp
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
			RETURNING id
		`;
		const values = [
			event.eventType,
			event.severity,
			event.source,
			event.correlationId,
			event.sessionId,
			event.userId,
			JSON.stringify(event.eventData ?? {}),
			JSON.stringify(event.metadata ?? {}),
			event.timestamp
		];
		const result = await this.execQuery(insertQuery, values);
		if (result && result.rows && result.rows[0]) {
			event.id = result.rows[0].id;
		}
		return event;
	}

	async getEvents(filters = {}) {
		let whereClause = 'WHERE 1=1';
		const values = [];
		let idx = 1;
		if (filters.eventType) { whereClause += ` AND event_type = $${idx++}`; values.push(filters.eventType); }
		if (filters.severity) { whereClause += ` AND severity = $${idx++}`; values.push(filters.severity); }
		if (filters.source) { whereClause += ` AND source = $${idx++}`; values.push(filters.source); }
		if (filters.userId) { whereClause += ` AND user_id = $${idx++}`; values.push(filters.userId); }
		if (filters.correlationId) { whereClause += ` AND correlation_id = $${idx++}`; values.push(filters.correlationId); }
		if (filters.startDate) { whereClause += ` AND timestamp >= $${idx++}`; values.push(filters.startDate); }
		if (filters.endDate) { whereClause += ` AND timestamp <= $${idx++}`; values.push(filters.endDate); }
		const limit = filters.limit || 100;
		const offset = filters.offset || 0;
		const query = `SELECT * FROM security_events ${whereClause} ORDER BY timestamp DESC LIMIT $${idx++} OFFSET $${idx++}`;
		values.push(limit, offset);
		const result = await this.execQuery(query, values);
		return result?.rows ?? [];
	}

	async getEventStatistics(timeRange = '24h') {
		let timeFilter = `AND timestamp >= NOW() - INTERVAL '24 hours'`;
		if (timeRange === '1h') timeFilter = `AND timestamp >= NOW() - INTERVAL '1 hour'`;
		if (timeRange === '7d') timeFilter = `AND timestamp >= NOW() - INTERVAL '7 days'`;
		if (timeRange === '30d') timeFilter = `AND timestamp >= NOW() - INTERVAL '30 days'`;
		const query = `
			SELECT event_type, severity, source, COUNT(*) as count,
				MIN(timestamp) as first_occurrence, MAX(timestamp) as last_occurrence
			FROM security_events
			WHERE 1=1 ${timeFilter}
			GROUP BY event_type, severity, source
			ORDER BY count DESC
		`;
		const result = await this.execQuery(query);
		return result?.rows ?? [];
	}

	async cleanupOldEvents(retentionDays = 2555) {
		const query = `DELETE FROM security_events WHERE timestamp < NOW() - INTERVAL '${retentionDays} days'`;
		const result = await this.execQuery(query);
		return result?.rowCount ?? 0;
	}

	async emitAuthSuccess(userId, sessionId, metadata = {}) {
		return this.emitSecurityEvent(SECURITY_EVENT_TYPES.AUTH_SUCCESS, SECURITY_SEVERITY.LOW, { userId, sessionId }, metadata);
	}
	async emitAuthFailure(userId, reason, metadata = {}) {
		return this.emitSecurityEvent(SECURITY_EVENT_TYPES.AUTH_FAILURE, SECURITY_SEVERITY.MEDIUM, { userId, reason }, metadata);
	}
	async emitThreatDetected(threatType, details, metadata = {}) {
		return this.emitSecurityEvent(SECURITY_EVENT_TYPES.THREAT_DETECTED, SECURITY_SEVERITY.HIGH, { threatType, details }, metadata);
	}
	async emitDataAccess(userId, dataType, operation, metadata = {}) {
		const eventType = `data_${operation.toLowerCase()}`;
		if (Object.values(SECURITY_EVENT_TYPES).includes(eventType)) {
			return this.emitSecurityEvent(eventType, SECURITY_SEVERITY.LOW, { userId, dataType, operation }, metadata);
		}
	}
	async emitManufacturingEvent(userId, stationId, operation, details, metadata = {}) {
		const eventType = `manufacturing_${operation.toLowerCase()}`;
		if (Object.values(SECURITY_EVENT_TYPES).includes(eventType)) {
			return this.emitSecurityEvent(eventType, SECURITY_SEVERITY.MEDIUM, { userId, stationId, operation, details }, metadata);
		}
	}
}

export default SecurityEventEmitter;
