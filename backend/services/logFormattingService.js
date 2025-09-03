/**
 * Log Formatting Service
 * Provides advanced log formatting utilities and context management
 * 
 * @author Solar Panel Production Tracking System
 * @version 1.0.0
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Log Formatting Service
 * Provides advanced formatting and context utilities for structured logging
 */
export class LogFormattingService {
	constructor(config = {}) {
		this.config = {
			// Formatting configuration
			formatting: {
				enableColorization: config.formatting?.enableColorization !== false,
				enableTimestampFormatting: config.formatting?.enableTimestampFormatting !== false,
				enableLevelFormatting: config.formatting?.enableLevelFormatting !== false,
				enableContextFormatting: config.formatting?.enableContextFormatting !== false,
				enableMetadataFormatting: config.formatting?.enableMetadataFormatting !== false,
				enablePerformanceFormatting: config.formatting?.enablePerformanceFormatting !== false,
				enableCorrelationFormatting: config.formatting?.enableCorrelationFormatting !== false,
				maxMessageLength: config.formatting?.maxMessageLength || 1000,
				maxMetadataDepth: config.formatting?.maxMetadataDepth || 5,
				indentSize: config.formatting?.indentSize || 2
			},
			
			// Context configuration
			context: {
				enableContextInheritance: config.context?.enableContextInheritance !== false,
				enableContextValidation: config.context?.enableContextValidation !== false,
				maxContextDepth: config.context?.maxContextDepth || 10,
				contextTimeout: config.context?.contextTimeout || 60 * 60 * 1000, // 1 hour
				enableContextMetrics: config.context?.enableContextMetrics !== false
			},
			
			// Template configuration
			templates: {
				enableTemplates: config.templates?.enableTemplates !== false,
				templateDirectory: config.templates?.templateDirectory || './templates',
				defaultTemplate: config.templates?.defaultTemplate || 'standard',
				enableCustomTemplates: config.templates?.enableCustomTemplates !== false
			},
			
			// Output configuration
			output: {
				enableConsoleOutput: config.output?.enableConsoleOutput !== false,
				enableFileOutput: config.output?.enableFileOutput !== false,
				enableJsonOutput: config.output?.enableJsonOutput !== false,
				enablePrettyOutput: config.output?.enablePrettyOutput !== false,
				enableCompactOutput: config.output?.enableCompactOutput !== false
			}
		};
		
		// Context management
		this.contextStack = [];
		this.contextRegistry = new Map();
		this.contextMetrics = new Map();
		
		// Template management
		this.templates = new Map();
		this.customTemplates = new Map();
		
		// Formatting utilities
		this.formatters = this.initializeFormatters();
		
		// Initialize default templates
		this.initializeDefaultTemplates();
		
		// Start context cleanup
		this.startContextCleanup();
		
		console.log('🎨 Log formatting service initialized');
	}

	/**
	 * Initialize formatters
	 */
	initializeFormatters() {
		return {
			// Color formatters
			colors: {
				reset: '\x1b[0m',
				bright: '\x1b[1m',
				dim: '\x1b[2m',
				red: '\x1b[31m',
				green: '\x1b[32m',
				yellow: '\x1b[33m',
				blue: '\x1b[34m',
				magenta: '\x1b[35m',
				cyan: '\x1b[36m',
				white: '\x1b[37m',
				gray: '\x1b[90m'
			},
			
			// Level colors
			levelColors: {
				error: '\x1b[31m', // red
				warn: '\x1b[33m',  // yellow
				info: '\x1b[36m',  // cyan
				debug: '\x1b[90m', // gray
				verbose: '\x1b[35m' // magenta
			},
			
			// Context colors
			contextColors: {
				operation: '\x1b[34m', // blue
				request: '\x1b[32m',   // green
				response: '\x1b[36m',  // cyan
				error: '\x1b[31m',     // red
				system: '\x1b[90m'     // gray
			}
		};
	}

	/**
	 * Initialize default templates
	 */
	initializeDefaultTemplates() {
		// Standard template
		this.templates.set('standard', {
			name: 'Standard',
			format: (logEntry) => {
				const timestamp = this.formatTimestamp(logEntry.timestamp);
				const level = this.formatLevel(logEntry.level);
				const message = this.formatMessage(logEntry.message);
				const context = this.formatContext(logEntry.context);
				const correlation = this.formatCorrelation(logEntry.correlation);
				
				return `${timestamp} ${level} ${message}${context}${correlation}`;
			}
		});
		
		// JSON template
		this.templates.set('json', {
			name: 'JSON',
			format: (logEntry) => {
				return JSON.stringify(logEntry, null, this.config.formatting.indentSize);
			}
		});
		
		// Compact template
		this.templates.set('compact', {
			name: 'Compact',
			format: (logEntry) => {
				const timestamp = this.formatTimestamp(logEntry.timestamp, 'compact');
				const level = this.formatLevel(logEntry.level, 'compact');
				const message = this.formatMessage(logEntry.message, 'compact');
				
				return `${timestamp} ${level} ${message}`;
			}
		});
		
		// Detailed template
		this.templates.set('detailed', {
			name: 'Detailed',
			format: (logEntry) => {
				const timestamp = this.formatTimestamp(logEntry.timestamp);
				const level = this.formatLevel(logEntry.level);
				const message = this.formatMessage(logEntry.message);
				const context = this.formatContext(logEntry.context, 'detailed');
				const correlation = this.formatCorrelation(logEntry.correlation, 'detailed');
				const metadata = this.formatMetadata(logEntry.metadata, 'detailed');
				const performance = this.formatPerformance(logEntry.performance, 'detailed');
				
				return [
					`${timestamp} ${level} ${message}`,
					context,
					correlation,
					metadata,
					performance
				].filter(Boolean).join('\n');
			}
		});
		
		// Audit template
		this.templates.set('audit', {
			name: 'Audit',
			format: (logEntry) => {
				const timestamp = this.formatTimestamp(logEntry.timestamp);
				const level = this.formatLevel(logEntry.level);
				const message = this.formatMessage(logEntry.message);
				const context = this.formatContext(logEntry.context, 'audit');
				const correlation = this.formatCorrelation(logEntry.correlation, 'audit');
				const metadata = this.formatMetadata(logEntry.metadata, 'audit');
				
				return `${timestamp} ${level} ${message} | ${context} | ${correlation} | ${metadata}`;
			}
		});
	}

	/**
	 * Format log entry
	 */
	formatLogEntry(logEntry, templateName = null) {
		const template = templateName ? this.getTemplate(templateName) : this.getDefaultTemplate();
		
		if (!template) {
			throw new Error(`Template not found: ${templateName || 'default'}`);
		}
		
		try {
			return template.format(logEntry);
		} catch (error) {
			console.error('Error formatting log entry:', error);
			return JSON.stringify(logEntry);
		}
	}

	/**
	 * Format timestamp
	 */
	formatTimestamp(timestamp, style = 'standard') {
		if (!this.config.formatting.enableTimestampFormatting) {
			return '';
		}
		
		const date = new Date(timestamp);
		
		switch (style) {
			case 'compact':
				return date.toISOString().replace('T', ' ').replace('Z', '');
			case 'readable':
				return date.toLocaleString();
			case 'unix':
				return Math.floor(date.getTime() / 1000).toString();
			default:
				return date.toISOString();
		}
	}

	/**
	 * Format log level
	 */
	formatLevel(level, style = 'standard') {
		if (!this.config.formatting.enableLevelFormatting) {
			return level;
		}
		
		const color = this.formatters.levelColors[level] || this.formatters.colors.white;
		const reset = this.formatters.colors.reset;
		
		switch (style) {
			case 'compact':
				return this.config.formatting.enableColorization 
					? `${color}${level.charAt(0).toUpperCase()}${reset}`
					: level.charAt(0).toUpperCase();
			case 'uppercase':
				return this.config.formatting.enableColorization 
					? `${color}${level.toUpperCase()}${reset}`
					: level.toUpperCase();
			default:
				return this.config.formatting.enableColorization 
					? `${color}${level}${reset}`
					: level;
		}
	}

	/**
	 * Format message
	 */
	formatMessage(message, style = 'standard') {
		if (!message) return '';
		
		// Truncate if too long
		if (message.length > this.config.formatting.maxMessageLength) {
			message = message.substring(0, this.config.formatting.maxMessageLength) + '...';
		}
		
		switch (style) {
			case 'compact':
				return message.replace(/\s+/g, ' ').trim();
			case 'multiline':
				return message.split('\n').map(line => `  ${line}`).join('\n');
			default:
				return message;
		}
	}

	/**
	 * Format context
	 */
	formatContext(context, style = 'standard') {
		if (!this.config.formatting.enableContextFormatting || !context) {
			return '';
		}
		
		const color = this.formatters.contextColors[context.type] || this.formatters.colors.white;
		const reset = this.formatters.colors.reset;
		
		switch (style) {
			case 'compact':
				return this.config.formatting.enableColorization 
					? `${color}[${context.name}]${reset}`
					: `[${context.name}]`;
			case 'detailed':
				const contextInfo = [
					`Context: ${context.name}`,
					`Type: ${context.type}`,
					`Depth: ${context.depth}`,
					`ID: ${context.id}`
				].join(', ');
				
				return this.config.formatting.enableColorization 
					? `${color}${contextInfo}${reset}`
					: contextInfo;
			case 'audit':
				return `ctx:${context.name}:${context.type}:${context.depth}`;
			default:
				return this.config.formatting.enableColorization 
					? `${color}[${context.name}:${context.type}]${reset}`
					: `[${context.name}:${context.type}]`;
		}
	}

	/**
	 * Format correlation
	 */
	formatCorrelation(correlation, style = 'standard') {
		if (!this.config.formatting.enableCorrelationFormatting || !correlation) {
			return '';
		}
		
		const color = this.formatters.colors.cyan;
		const reset = this.formatters.colors.reset;
		
		switch (style) {
			case 'compact':
				return this.config.formatting.enableColorization 
					? `${color}${correlation.id.substring(0, 8)}${reset}`
					: correlation.id.substring(0, 8);
			case 'detailed':
				const correlationInfo = [
					`ID: ${correlation.id}`,
					`Parent: ${correlation.parentId || 'none'}`,
					`Duration: ${correlation.duration || 0}ms`,
					`Chain: ${correlation.chain.length}`
				].join(', ');
				
				return this.config.formatting.enableColorization 
					? `${color}${correlationInfo}${reset}`
					: correlationInfo;
			case 'audit':
				return `corr:${correlation.id}:${correlation.chain.length}`;
			default:
				return this.config.formatting.enableColorization 
					? `${color}${correlation.id}${reset}`
					: correlation.id;
		}
	}

	/**
	 * Format metadata
	 */
	formatMetadata(metadata, style = 'standard') {
		if (!this.config.formatting.enableMetadataFormatting || !metadata) {
			return '';
		}
		
		const color = this.formatters.colors.magenta;
		const reset = this.formatters.colors.reset;
		
		switch (style) {
			case 'compact':
				const keys = Object.keys(metadata);
				return keys.length > 0 ? `{${keys.join(',')}}` : '';
			case 'detailed':
				const formatted = this.formatObject(metadata, 0);
				return this.config.formatting.enableColorization 
					? `${color}${formatted}${reset}`
					: formatted;
			case 'audit':
				return Object.keys(metadata).length > 0 ? 'metadata:present' : 'metadata:none';
			default:
				const summary = Object.keys(metadata).slice(0, 3).join(',');
				return this.config.formatting.enableColorization 
					? `${color}{${summary}}${reset}`
					: `{${summary}}`;
		}
	}

	/**
	 * Format performance
	 */
	formatPerformance(performance, style = 'standard') {
		if (!this.config.formatting.enablePerformanceFormatting || !performance) {
			return '';
		}
		
		const color = this.formatters.colors.yellow;
		const reset = this.formatters.colors.reset;
		
		switch (style) {
			case 'compact':
				return `perf:${Math.round(performance.responseTime)}ms`;
			case 'detailed':
				const perfInfo = [
					`Response: ${Math.round(performance.responseTime)}ms`,
					`Throughput: ${Math.round(performance.throughput)}/min`,
					`Error Rate: ${(performance.errorRate * 100).toFixed(2)}%`,
					`Connections: ${performance.activeConnections}`,
					`Queue: ${performance.queueSize}`
				].join(', ');
				
				return this.config.formatting.enableColorization 
					? `${color}${perfInfo}${reset}`
					: perfInfo;
			case 'audit':
				return `perf:${Math.round(performance.responseTime)}:${Math.round(performance.throughput)}:${(performance.errorRate * 100).toFixed(1)}`;
			default:
				return this.config.formatting.enableColorization 
					? `${color}${Math.round(performance.responseTime)}ms${reset}`
					: `${Math.round(performance.responseTime)}ms`;
		}
	}

	/**
	 * Format object with indentation
	 */
	formatObject(obj, depth = 0) {
		if (depth > this.config.formatting.maxMetadataDepth) {
			return '[Max Depth Reached]';
		}
		
		if (typeof obj !== 'object' || obj === null) {
			return String(obj);
		}
		
		if (Array.isArray(obj)) {
			if (obj.length === 0) return '[]';
			if (obj.length > 5) return `[${obj.length} items]`;
			
			const items = obj.map(item => this.formatObject(item, depth + 1));
			return `[${items.join(', ')}]`;
		}
		
		const indent = ' '.repeat(depth * this.config.formatting.indentSize);
		const nextIndent = ' '.repeat((depth + 1) * this.config.formatting.indentSize);
		
		const entries = Object.entries(obj).slice(0, 10); // Limit to 10 entries
		const formatted = entries.map(([key, value]) => {
			const formattedValue = this.formatObject(value, depth + 1);
			return `${nextIndent}${key}: ${formattedValue}`;
		});
		
		if (Object.keys(obj).length > 10) {
			formatted.push(`${nextIndent}... (${Object.keys(obj).length - 10} more)`);
		}
		
		return `{\n${formatted.join('\n')}\n${indent}}`;
	}

	/**
	 * Create context
	 */
	createContext(name, type = 'operation', metadata = {}) {
		const contextId = uuidv4();
		const context = {
			id: contextId,
			name,
			type,
			startTime: new Date(),
			metadata,
			parentId: this.getCurrentContext()?.id,
			depth: this.contextStack.length
		};
		
		// Validate context
		if (this.config.context.enableContextValidation) {
			this.validateContext(context);
		}
		
		// Add to context stack
		this.contextStack.push(context);
		
		// Register context
		this.contextRegistry.set(contextId, context);
		
		// Update metrics
		if (this.config.context.enableContextMetrics) {
			this.updateContextMetrics(context);
		}
		
		return contextId;
	}

	/**
	 * Get current context
	 */
	getCurrentContext() {
		return this.contextStack[this.contextStack.length - 1] || null;
	}

	/**
	 * End context
	 */
	endContext(contextId, result = null) {
		const context = this.contextRegistry.get(contextId);
		if (!context) {
			console.warn(`Context ${contextId} not found`);
			return null;
		}
		
		const duration = new Date() - context.startTime;
		
		// Remove from context stack
		const stackIndex = this.contextStack.findIndex(ctx => ctx.id === contextId);
		if (stackIndex !== -1) {
			this.contextStack.splice(stackIndex, 1);
		}
		
		// Remove from registry
		this.contextRegistry.delete(contextId);
		
		// Update metrics
		if (this.config.context.enableContextMetrics) {
			this.updateContextMetrics(context, duration, result);
		}
		
		return {
			contextId,
			duration,
			result
		};
	}

	/**
	 * Validate context
	 */
	validateContext(context) {
		if (!context.name || typeof context.name !== 'string') {
			throw new Error('Context name must be a non-empty string');
		}
		
		if (!context.type || typeof context.type !== 'string') {
			throw new Error('Context type must be a non-empty string');
		}
		
		if (this.contextStack.length >= this.config.context.maxContextDepth) {
			throw new Error(`Maximum context depth exceeded: ${this.config.context.maxContextDepth}`);
		}
	}

	/**
	 * Update context metrics
	 */
	updateContextMetrics(context, duration = null, result = null) {
		const key = `${context.type}:${context.name}`;
		
		if (!this.contextMetrics.has(key)) {
			this.contextMetrics.set(key, {
				count: 0,
				totalDuration: 0,
				successCount: 0,
				errorCount: 0,
				lastUsed: new Date()
			});
		}
		
		const metrics = this.contextMetrics.get(key);
		metrics.count++;
		metrics.lastUsed = new Date();
		
		if (duration !== null) {
			metrics.totalDuration += duration;
		}
		
		if (result === 'success') {
			metrics.successCount++;
		} else if (result === 'error') {
			metrics.errorCount++;
		}
	}

	/**
	 * Get template
	 */
	getTemplate(templateName) {
		return this.templates.get(templateName) || this.customTemplates.get(templateName);
	}

	/**
	 * Get default template
	 */
	getDefaultTemplate() {
		return this.templates.get(this.config.templates.defaultTemplate);
	}

	/**
	 * Register custom template
	 */
	registerTemplate(name, template) {
		if (!this.config.templates.enableCustomTemplates) {
			throw new Error('Custom templates are disabled');
		}
		
		if (!template.name || !template.format) {
			throw new Error('Template must have name and format function');
		}
		
		this.customTemplates.set(name, template);
		console.log(`📝 Custom template registered: ${name}`);
	}

	/**
	 * Start context cleanup
	 */
	startContextCleanup() {
		setInterval(() => {
			this.cleanupExpiredContexts();
		}, 5 * 60 * 1000); // Every 5 minutes
	}

	/**
	 * Cleanup expired contexts
	 */
	cleanupExpiredContexts() {
		const now = new Date();
		const timeout = this.config.context.contextTimeout;
		
		for (const [contextId, context] of this.contextRegistry) {
			if (now - context.startTime > timeout) {
				// Force end context
				this.endContext(contextId, 'timeout');
			}
		}
	}

	/**
	 * Get formatting statistics
	 */
	getFormattingStats() {
		return {
			config: this.config,
			activeContexts: this.contextRegistry.size,
			contextStackDepth: this.contextStack.length,
			registeredTemplates: this.templates.size + this.customTemplates.size,
			contextMetrics: Object.fromEntries(this.contextMetrics)
		};
	}

	/**
	 * Export context data
	 */
	exportContextData(contextId) {
		const context = this.contextRegistry.get(contextId);
		if (!context) return null;
		
		return {
			...context,
			duration: new Date() - context.startTime,
			stackPosition: this.contextStack.findIndex(ctx => ctx.id === contextId)
		};
	}

	/**
	 * Get context metrics
	 */
	getContextMetrics() {
		return Object.fromEntries(this.contextMetrics);
	}

	/**
	 * Clear context metrics
	 */
	clearContextMetrics() {
		this.contextMetrics.clear();
		console.log('🧹 Context metrics cleared');
	}
}

export default LogFormattingService;
