/**
 * Structured Logging Service
 * Provides structured logging with correlation IDs, metadata, and context tracking
 * 
 * @author Solar Panel Production Tracking System
 * @version 1.0.0
 */

import { v4 as uuidv4 } from 'uuid';
import { EnterpriseLoggingService } from './enterpriseLoggingService.js';

/**
 * Structured Logging Service
 * Extends enterprise logging with structured data and correlation tracking
 */
export class StructuredLoggingService extends EnterpriseLoggingService {
	constructor(config = {}) {
		super(config);
		
		// Structured logging configuration
		this.structuredConfig = {
			// Correlation tracking
			correlation: {
				enableAutoCorrelation: config.correlation?.enableAutoCorrelation !== false,
				correlationHeader: config.correlation?.correlationHeader || 'x-correlation-id',
				correlationTimeout: config.correlation?.correlationTimeout || 30 * 60 * 1000, // 30 minutes
				enableNestedCorrelation: config.correlation?.enableNestedCorrelation !== false
			},
			
			// Metadata management
			metadata: {
				enableAutoMetadata: config.metadata?.enableAutoMetadata !== false,
				includeSystemInfo: config.metadata?.includeSystemInfo !== false,
				includeUserInfo: config.metadata?.includeUserInfo !== false,
				includeRequestInfo: config.metadata?.includeRequestInfo !== false,
				includePerformanceInfo: config.metadata?.includePerformanceInfo !== false,
				maxMetadataSize: config.metadata?.maxMetadataSize || 1024 * 10 // 10KB
			},
			
			// Context tracking
			context: {
				enableContextTracking: config.context?.enableContextTracking !== false,
				maxContextDepth: config.context?.maxContextDepth || 10,
				contextTimeout: config.context?.contextTimeout || 60 * 60 * 1000, // 1 hour
				enableContextInheritance: config.context?.enableContextInheritance !== false
			},
			
			// Schema validation
			schema: {
				enableValidation: config.schema?.enableValidation !== false,
				schemaVersion: config.schema?.schemaVersion || '1.0.0',
				strictMode: config.schema?.strictMode !== false
			}
		};
		
		// Context tracking
		this.contextStack = [];
		this.activeContexts = new Map();
		
		// Correlation tracking
		this.correlationChains = new Map();
		this.correlationHistory = new Map();
		
		// Metadata cache
		this.metadataCache = new Map();
		
		// Start cleanup services
		this.startCleanupServices();
		
		console.log('📊 Structured logging service initialized');
	}

	/**
	 * Start cleanup services
	 */
	startCleanupServices() {
		// Cleanup expired correlations
		setInterval(() => {
			this.cleanupExpiredCorrelations();
		}, 5 * 60 * 1000); // Every 5 minutes
		
		// Cleanup expired contexts
		setInterval(() => {
			this.cleanupExpiredContexts();
		}, 10 * 60 * 1000); // Every 10 minutes
		
		// Cleanup metadata cache
		setInterval(() => {
			this.cleanupMetadataCache();
		}, 15 * 60 * 1000); // Every 15 minutes
	}

	/**
	 * Create structured log entry
	 */
	createStructuredLog(level, message, options = {}) {
		const logEntry = {
			// Basic log information
			level,
			message,
			timestamp: new Date().toISOString(),
			
			// Correlation information
			correlation: this.getCorrelationInfo(),
			
			// Context information
			context: this.getContextInfo(),
			
			// Metadata
			metadata: this.buildMetadata(options.metadata || {}),
			
			// Schema information
			schema: {
				version: this.structuredConfig.schema.schemaVersion,
				type: options.type || 'application'
			},
			
			// Additional structured data
			data: options.data || {},
			
			// Performance information
			performance: this.getPerformanceInfo(),
			
			// System information
			system: this.getSystemInfo()
		};
		
		// Validate schema if enabled
		if (this.structuredConfig.schema.enableValidation) {
			this.validateLogSchema(logEntry);
		}
		
		return logEntry;
	}

	/**
	 * Get correlation information
	 */
	getCorrelationInfo() {
		const correlationId = this.getCorrelationId();
		const correlation = {
			id: correlationId,
			parentId: this.getParentCorrelationId(),
			chain: this.getCorrelationChain(correlationId),
			startTime: this.getCorrelationStartTime(correlationId),
			duration: this.getCorrelationDuration(correlationId)
		};
		
		return correlation;
	}

	/**
	 * Get context information
	 */
	getContextInfo() {
		const currentContext = this.getCurrentContext();
		const context = {
			id: currentContext?.id,
			name: currentContext?.name,
			type: currentContext?.type,
			depth: this.contextStack.length,
			stack: this.contextStack.map(ctx => ({
				id: ctx.id,
				name: ctx.name,
				type: ctx.type,
				startTime: ctx.startTime
			})),
			metadata: currentContext?.metadata || {}
		};
		
		return context;
	}

	/**
	 * Build metadata
	 */
	buildMetadata(customMetadata = {}) {
		const metadata = {};
		
		// Add system information
		if (this.structuredConfig.metadata.includeSystemInfo) {
			metadata.system = this.getSystemMetadata();
		}
		
		// Add user information
		if (this.structuredConfig.metadata.includeUserInfo) {
			metadata.user = this.getUserMetadata();
		}
		
		// Add request information
		if (this.structuredConfig.metadata.includeRequestInfo) {
			metadata.request = this.getRequestMetadata();
		}
		
		// Add performance information
		if (this.structuredConfig.metadata.includePerformanceInfo) {
			metadata.performance = this.getPerformanceMetadata();
		}
		
		// Add custom metadata
		Object.assign(metadata, customMetadata);
		
		// Limit metadata size
		const metadataSize = JSON.stringify(metadata).length;
		if (metadataSize > this.structuredConfig.metadata.maxMetadataSize) {
			metadata._truncated = true;
			metadata._originalSize = metadataSize;
		}
		
		return metadata;
	}

	/**
	 * Get system metadata
	 */
	getSystemMetadata() {
		const memUsage = process.memoryUsage();
		const uptime = process.uptime();
		
		return {
			pid: process.pid,
			platform: process.platform,
			arch: process.arch,
			nodeVersion: process.version,
			uptime: Math.floor(uptime),
			memory: {
				rss: Math.round(memUsage.rss / 1024 / 1024), // MB
				heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
				heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
				external: Math.round(memUsage.external / 1024 / 1024) // MB
			},
			cpu: process.cpuUsage()
		};
	}

	/**
	 * Get user metadata
	 */
	getUserMetadata() {
		// In a real implementation, this would extract user info from request context
		return {
			id: 'system',
			role: 'system',
			sessionId: this.getCorrelationId()
		};
	}

	/**
	 * Get request metadata
	 */
	getRequestMetadata() {
		// In a real implementation, this would extract request info from HTTP context
		return {
			method: 'SYSTEM',
			url: '/system',
			userAgent: 'StructuredLoggingService',
			ip: '127.0.0.1'
		};
	}

	/**
	 * Get performance metadata
	 */
	getPerformanceMetadata() {
		return {
			responseTime: this.getResponseTime(),
			throughput: this.getThroughput(),
			errorRate: this.getErrorRate()
		};
	}

	/**
	 * Get performance information
	 */
	getPerformanceInfo() {
		return {
			responseTime: this.getResponseTime(),
			throughput: this.getThroughput(),
			errorRate: this.getErrorRate(),
			activeConnections: this.getActiveConnections(),
			queueSize: this.getQueueSize()
		};
	}

	/**
	 * Get system information
	 */
	getSystemInfo() {
		return {
			hostname: require('os').hostname(),
			environment: process.env.NODE_ENV || 'development',
			version: process.env.npm_package_version || '1.0.0',
			service: 'solar-panel-tracking'
		};
	}

	/**
	 * Start context
	 */
	startContext(name, type = 'operation', metadata = {}) {
		const contextId = uuidv4();
		const context = {
			id: contextId,
			name,
			type,
			startTime: new Date(),
			metadata,
			correlationId: this.getCorrelationId()
		};
		
		// Add to context stack
		this.contextStack.push(context);
		
		// Store in active contexts
		this.activeContexts.set(contextId, context);
		
		// Log context start
		this.log('info', `Context started: ${name}`, {
			type: 'context_start',
			contextId,
			contextName: name,
			contextType: type,
			metadata
		});
		
		return contextId;
	}

	/**
	 * End context
	 */
	endContext(contextId, result = null, metadata = {}) {
		const context = this.activeContexts.get(contextId);
		if (!context) {
			console.warn(`Context ${contextId} not found`);
			return;
		}
		
		const duration = new Date() - context.startTime;
		
		// Remove from context stack
		const stackIndex = this.contextStack.findIndex(ctx => ctx.id === contextId);
		if (stackIndex !== -1) {
			this.contextStack.splice(stackIndex, 1);
		}
		
		// Remove from active contexts
		this.activeContexts.delete(contextId);
		
		// Log context end
		this.log('info', `Context ended: ${context.name}`, {
			type: 'context_end',
			contextId,
			contextName: context.name,
			contextType: context.type,
			duration,
			result,
			metadata
		});
		
		return {
			contextId,
			duration,
			result
		};
	}

	/**
	 * Get current context
	 */
	getCurrentContext() {
		return this.contextStack[this.contextStack.length - 1] || null;
	}

	/**
	 * Create correlation chain
	 */
	createCorrelationChain(parentCorrelationId = null) {
		const correlationId = uuidv4();
		const chain = {
			id: correlationId,
			parentId: parentCorrelationId,
			startTime: new Date(),
			children: [],
			events: []
		};
		
		// Store correlation chain
		this.correlationChains.set(correlationId, chain);
		
		// Add to parent chain if exists
		if (parentCorrelationId) {
			const parentChain = this.correlationChains.get(parentCorrelationId);
			if (parentChain) {
				parentChain.children.push(correlationId);
			}
		}
		
		// Set as current correlation
		this.setCorrelationId(correlationId);
		
		return correlationId;
	}

	/**
	 * Get correlation chain
	 */
	getCorrelationChain(correlationId) {
		const chain = this.correlationChains.get(correlationId);
		if (!chain) return [];
		
		const chainArray = [];
		let current = chain;
		
		while (current) {
			chainArray.push({
				id: current.id,
				startTime: current.startTime,
				eventCount: current.events.length,
				childCount: current.children.length
			});
			
			// Move to parent
			current = current.parentId ? this.correlationChains.get(current.parentId) : null;
		}
		
		return chainArray.reverse(); // Return from root to current
	}

	/**
	 * Get parent correlation ID
	 */
	getParentCorrelationId() {
		const correlationId = this.getCorrelationId();
		const chain = this.correlationChains.get(correlationId);
		return chain?.parentId || null;
	}

	/**
	 * Get correlation start time
	 */
	getCorrelationStartTime(correlationId) {
		const chain = this.correlationChains.get(correlationId);
		return chain?.startTime || null;
	}

	/**
	 * Get correlation duration
	 */
	getCorrelationDuration(correlationId) {
		const chain = this.correlationChains.get(correlationId);
		if (!chain) return null;
		
		return new Date() - chain.startTime;
	}

	/**
	 * Add event to correlation
	 */
	addCorrelationEvent(event) {
		const correlationId = this.getCorrelationId();
		const chain = this.correlationChains.get(correlationId);
		
		if (chain) {
			chain.events.push({
				...event,
				timestamp: new Date()
			});
		}
	}

	/**
	 * Structured log method
	 */
	structuredLog(level, message, options = {}) {
		const logEntry = this.createStructuredLog(level, message, options);
		
		// Add to correlation events
		this.addCorrelationEvent({
			type: 'log',
			level,
			message,
			contextId: this.getCurrentContext()?.id
		});
		
		// Log using base logger
		this.log(level, message, logEntry);
		
		return logEntry;
	}

	/**
	 * Log with context
	 */
	logWithContext(level, message, contextName, contextType = 'operation', options = {}) {
		const contextId = this.startContext(contextName, contextType, options.metadata);
		
		try {
			const result = this.structuredLog(level, message, options);
			this.endContext(contextId, 'success', { logEntry: result });
			return result;
		} catch (error) {
			this.endContext(contextId, 'error', { error: error.message });
			throw error;
		}
	}

	/**
	 * Log with correlation
	 */
	logWithCorrelation(level, message, parentCorrelationId = null, options = {}) {
		const correlationId = this.createCorrelationChain(parentCorrelationId);
		
		try {
			const result = this.structuredLog(level, message, options);
			return { correlationId, logEntry: result };
		} catch (error) {
			this.addCorrelationEvent({
				type: 'error',
				error: error.message,
				stack: error.stack
			});
			throw error;
		}
	}

	/**
	 * Validate log schema
	 */
	validateLogSchema(logEntry) {
		const requiredFields = ['level', 'message', 'timestamp', 'correlation', 'context', 'metadata'];
		const missingFields = requiredFields.filter(field => !(field in logEntry));
		
		if (missingFields.length > 0) {
			throw new Error(`Missing required fields in log entry: ${missingFields.join(', ')}`);
		}
		
		// Validate correlation structure
		if (!logEntry.correlation.id) {
			throw new Error('Correlation ID is required');
		}
		
		// Validate context structure
		if (typeof logEntry.context.depth !== 'number') {
			throw new Error('Context depth must be a number');
		}
		
		// Validate metadata structure
		if (typeof logEntry.metadata !== 'object') {
			throw new Error('Metadata must be an object');
		}
	}

	/**
	 * Get response time
	 */
	getResponseTime() {
		// Simulate response time calculation
		return Math.random() * 100 + 50; // 50-150ms
	}

	/**
	 * Get throughput
	 */
	getThroughput() {
		// Simulate throughput calculation
		return Math.random() * 1000 + 500; // 500-1500 requests/min
	}

	/**
	 * Get error rate
	 */
	getErrorRate() {
		// Simulate error rate calculation
		return Math.random() * 0.05; // 0-5%
	}

	/**
	 * Get active connections
	 */
	getActiveConnections() {
		// Simulate active connections
		return Math.floor(Math.random() * 100) + 10; // 10-110 connections
	}

	/**
	 * Get queue size
	 */
	getQueueSize() {
		// Simulate queue size
		return Math.floor(Math.random() * 50); // 0-50 items
	}

	/**
	 * Cleanup expired correlations
	 */
	cleanupExpiredCorrelations() {
		const now = new Date();
		const timeout = this.structuredConfig.correlation.correlationTimeout;
		
		for (const [correlationId, chain] of this.correlationChains) {
			if (now - chain.startTime > timeout) {
				// Move to history
				this.correlationHistory.set(correlationId, {
					...chain,
					endTime: now,
					duration: now - chain.startTime
				});
				
				// Remove from active chains
				this.correlationChains.delete(correlationId);
			}
		}
	}

	/**
	 * Cleanup expired contexts
	 */
	cleanupExpiredContexts() {
		const now = new Date();
		const timeout = this.structuredConfig.context.contextTimeout;
		
		for (const [contextId, context] of this.activeContexts) {
			if (now - context.startTime > timeout) {
				// Force end context
				this.endContext(contextId, 'timeout', { reason: 'context_timeout' });
			}
		}
	}

	/**
	 * Cleanup metadata cache
	 */
	cleanupMetadataCache() {
		// Clear metadata cache if it gets too large
		if (this.metadataCache.size > 1000) {
			this.metadataCache.clear();
		}
	}

	/**
	 * Get structured logging statistics
	 */
	getStructuredLoggingStats() {
		return {
			config: this.structuredConfig,
			activeCorrelations: this.correlationChains.size,
			correlationHistory: this.correlationHistory.size,
			activeContexts: this.activeContexts.size,
			contextStackDepth: this.contextStack.length,
			metadataCacheSize: this.metadataCache.size
		};
	}

	/**
	 * Export correlation data
	 */
	exportCorrelationData(correlationId) {
		const chain = this.correlationChains.get(correlationId) || this.correlationHistory.get(correlationId);
		if (!chain) return null;
		
		return {
			correlationId,
			chain: this.getCorrelationChain(correlationId),
			events: chain.events,
			children: chain.children,
			startTime: chain.startTime,
			endTime: chain.endTime,
			duration: chain.duration
		};
	}

	/**
	 * Export context data
	 */
	exportContextData(contextId) {
		const context = this.activeContexts.get(contextId);
		if (!context) return null;
		
		return {
			contextId,
			name: context.name,
			type: context.type,
			startTime: context.startTime,
			duration: new Date() - context.startTime,
			metadata: context.metadata,
			correlationId: context.correlationId
		};
	}
}

export default StructuredLoggingService;
