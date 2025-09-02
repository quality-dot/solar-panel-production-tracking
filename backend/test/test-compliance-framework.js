/**
 * Compliance Framework Test Suite
 * Comprehensive tests for compliance system and advanced logging
 * 
 * @author Solar Panel Production Tracking System
 * @version 1.0.0
 */

import { ComplianceService } from '../services/complianceService.js';
import { ComplianceMonitoringService } from '../services/complianceMonitoringService.js';
import { ComplianceValidationService } from '../services/complianceValidationService.js';
import { EnterpriseLoggingService } from '../services/enterpriseLoggingService.js';
import { StructuredLoggingService } from '../services/structuredLoggingService.js';
import { LogFormattingService } from '../services/logFormattingService.js';

/**
 * Simple Test Framework
 */
class TestFramework {
	constructor() {
		this.tests = [];
		this.passed = 0;
		this.failed = 0;
		this.startTime = Date.now();
	}

	test(name, testFn) {
		this.tests.push({ name, testFn });
	}

	async run() {
		console.log('🧪 Starting Compliance Framework Test Suite...\n');
		
		for (const test of this.tests) {
			try {
				await test.testFn();
				console.log(`✅ ${test.name}`);
				this.passed++;
			} catch (error) {
				console.log(`❌ ${test.name}: ${error.message}`);
				this.failed++;
			}
		}
		
		const duration = Date.now() - this.startTime;
		console.log(`\n📊 Test Results Summary`);
		console.log('========================');
		console.log(`Total Tests: ${this.tests.length}`);
		console.log(`✅ Passed: ${this.passed}`);
		console.log(`❌ Failed: ${this.failed}`);
		console.log(`Success Rate: ${((this.passed / this.tests.length) * 100).toFixed(1)}%`);
		console.log(`Duration: ${duration}ms`);
		
		if (this.failed === 0) {
			console.log('\n🎉 ALL TESTS PASSED - Compliance Framework is fully operational!');
		} else {
			console.log(`\n⚠️ ${this.failed} test(s) failed - Review and fix issues`);
		}
	}
}

const testFramework = new TestFramework();

// Test 1: ComplianceService - Basic Initialization
testFramework.test('ComplianceService - Basic Initialization', async () => {
	const complianceService = new ComplianceService();
	
	// Check if service is initialized
	if (!complianceService.config) {
		throw new Error('Compliance service not properly initialized');
	}
	
	// Check if ISA-99 is enabled by default
	if (!complianceService.config.isa99.enabled) {
		throw new Error('ISA-99 should be enabled by default');
	}
	
	// Check if NIST is enabled by default
	if (!complianceService.config.nist.enabled) {
		throw new Error('NIST should be enabled by default');
	}
	
	// Check if GDPR is enabled by default
	if (!complianceService.config.gdpr.enabled) {
		throw new Error('GDPR should be enabled by default');
	}
	
	// Check if compliance state is initialized
	if (!complianceService.complianceState) {
		throw new Error('Compliance state not initialized');
	}
});

// Test 2: ComplianceService - ISA-99 Assessment
testFramework.test('ComplianceService - ISA-99 Assessment', async () => {
	const complianceService = new ComplianceService();
	
	// Perform ISA-99 assessment
	await complianceService.assessISA99Compliance();
	
	// Check if assessment was performed
	if (!complianceService.complianceState.isa99.lastAssessment) {
		throw new Error('ISA-99 assessment not performed');
	}
	
	// Check if zones are initialized
	if (complianceService.complianceState.isa99.zones.size === 0) {
		throw new Error('ISA-99 zones not initialized');
	}
	
	// Check if security level is set
	if (complianceService.complianceState.isa99.overallSecurityLevel < 1 || 
		complianceService.complianceState.isa99.overallSecurityLevel > 4) {
		throw new Error('Invalid ISA-99 security level');
	}
	
	// Check if compliance score is calculated
	if (typeof complianceService.complianceState.isa99.complianceScore !== 'number') {
		throw new Error('ISA-99 compliance score not calculated');
	}
});

// Test 3: ComplianceService - NIST Assessment
testFramework.test('ComplianceService - NIST Assessment', async () => {
	const complianceService = new ComplianceService();
	
	// Perform NIST assessment
	await complianceService.assessNISTCompliance();
	
	// Check if assessment was performed
	if (!complianceService.complianceState.nist.lastAssessment) {
		throw new Error('NIST assessment not performed');
	}
	
	// Check if functions are initialized
	if (complianceService.complianceState.nist.functions.size === 0) {
		throw new Error('NIST functions not initialized');
	}
	
	// Check if overall score is calculated
	if (typeof complianceService.complianceState.nist.overallScore !== 'number') {
		throw new Error('NIST overall score not calculated');
	}
	
	// Check if score is within valid range
	if (complianceService.complianceState.nist.overallScore < 0 || 
		complianceService.complianceState.nist.overallScore > 1) {
		throw new Error('NIST score out of valid range (0-1)');
	}
});

// Test 4: ComplianceService - GDPR Assessment
testFramework.test('ComplianceService - GDPR Assessment', async () => {
	const complianceService = new ComplianceService();
	
	// Perform GDPR assessment
	await complianceService.assessGDPRCompliance();
	
	// Check if assessment was performed
	if (!complianceService.complianceState.gdpr.principles) {
		throw new Error('GDPR principles not initialized');
	}
	
	// Check if rights are initialized
	if (!complianceService.complianceState.gdpr.rights) {
		throw new Error('GDPR rights not initialized');
	}
	
	// Check if compliance score is calculated
	if (typeof complianceService.complianceState.gdpr.complianceScore !== 'number') {
		throw new Error('GDPR compliance score not calculated');
	}
	
	// Check if score is within valid range
	if (complianceService.complianceState.gdpr.complianceScore < 0 || 
		complianceService.complianceState.gdpr.complianceScore > 1) {
		throw new Error('GDPR score out of valid range (0-1)');
	}
});

// Test 5: ComplianceService - Report Generation
testFramework.test('ComplianceService - Report Generation', async () => {
	const complianceService = new ComplianceService();
	
	// Generate compliance report
	const report = await complianceService.generateComplianceReport();
	
	// Check if report is generated
	if (!report) {
		throw new Error('Compliance report not generated');
	}
	
	// Check if report has required fields
	if (!report.reportId || !report.timestamp || !report.overallCompliance) {
		throw new Error('Compliance report missing required fields');
	}
	
	// Check if overall compliance score is present
	if (typeof report.overallCompliance.score !== 'number') {
		throw new Error('Overall compliance score not present in report');
	}
	
	// Check if recommendations are generated
	if (!Array.isArray(report.recommendations)) {
		throw new Error('Recommendations not generated in report');
	}
});

// Test 6: ComplianceMonitoringService - Real-time Monitoring
testFramework.test('ComplianceMonitoringService - Real-time Monitoring', async () => {
	const monitoringService = new ComplianceMonitoringService();
	
	// Wait a bit for monitoring to start
	await new Promise(resolve => setTimeout(resolve, 100));
	
	// Check if monitoring state is initialized
	if (!monitoringService.monitoringState) {
		throw new Error('Monitoring state not initialized');
	}
	
	// Check if metrics are initialized
	if (!monitoringService.monitoringState.metrics) {
		throw new Error('Monitoring metrics not initialized');
	}
	
	// Check if alerting is configured
	if (!monitoringService.monitoringConfig.alerting) {
		throw new Error('Alerting not configured');
	}
	
	// Check if reporting is configured
	if (!monitoringService.monitoringConfig.reporting) {
		throw new Error('Reporting not configured');
	}
});

// Test 7: ComplianceMonitoringService - Health Check
testFramework.test('ComplianceMonitoringService - Health Check', async () => {
	const monitoringService = new ComplianceMonitoringService();
	
	// Perform health check
	const healthCheck = await monitoringService.performHealthCheck();
	
	// Check if health check is performed
	if (!healthCheck) {
		throw new Error('Health check not performed');
	}
	
	// Check if health check has required fields
	if (!healthCheck.timestamp || !healthCheck.status || !healthCheck.checks) {
		throw new Error('Health check missing required fields');
	}
	
	// Check if status is valid
	if (!['healthy', 'degraded', 'critical'].includes(healthCheck.status)) {
		throw new Error('Invalid health check status');
	}
	
	// Check if checks are performed
	if (Object.keys(healthCheck.checks).length === 0) {
		throw new Error('No health checks performed');
	}
});

// Test 8: ComplianceValidationService - Validation
testFramework.test('ComplianceValidationService - Validation', async () => {
	const validationService = new ComplianceValidationService();
	
	// Perform validation
	const validationResults = await validationService.performPeriodicValidation();
	
	// Check if validation is performed
	if (!validationResults) {
		throw new Error('Validation not performed');
	}
	
	// Check if validation has required fields
	if (!validationResults.validationId || !validationResults.results || !validationResults.overallStatus) {
		throw new Error('Validation results missing required fields');
	}
	
	// Check if overall status is valid
	if (!['passed', 'failed', 'warning', 'error', 'partial', 'unknown'].includes(validationResults.overallStatus)) {
		throw new Error('Invalid validation status');
	}
	
	// Check if results are present
	if (!validationResults.results.isa99 && !validationResults.results.nist && !validationResults.results.gdpr) {
		throw new Error('No validation results generated');
	}
});

// Test 9: ComplianceValidationService - Violation Detection
testFramework.test('ComplianceValidationService - Violation Detection', async () => {
	const validationService = new ComplianceValidationService();
	
	// Perform validation
	const validationResults = await validationService.performPeriodicValidation();
	
	// Check if violations are detected
	if (!Array.isArray(validationResults.violations)) {
		throw new Error('Violations not detected properly');
	}
	
	// Check if recommendations are generated
	if (!Array.isArray(validationResults.recommendations)) {
		throw new Error('Recommendations not generated');
	}
	
	// Check validation statistics
	const stats = validationService.getValidationStats();
	if (typeof stats.total !== 'number' || typeof stats.passed !== 'number' || typeof stats.failed !== 'number') {
		throw new Error('Validation statistics not properly tracked');
	}
});

// Test 10: EnterpriseLoggingService - Basic Logging
testFramework.test('EnterpriseLoggingService - Basic Logging', async () => {
	const loggingService = new EnterpriseLoggingService();
	
	// Test basic logging
	loggingService.log('info', 'Test message', { test: true });
	
	// Test audit logging
	loggingService.logAudit('test_action', { details: 'test' });
	
	// Test security logging
	loggingService.logSecurity('test_security_event', { details: 'test' });
	
	// Test compliance logging
	loggingService.logCompliance('ISA-99', 'test_compliance_event', { details: 'test' });
	
	// Test performance logging
	loggingService.logPerformance('test_metric', 100, { details: 'test' });
	
	// Check if loggers are created
	if (!loggingService.loggers) {
		throw new Error('Loggers not created');
	}
	
	// Check if correlation ID is set
	const correlationId = loggingService.setCorrelationId();
	if (!correlationId) {
		throw new Error('Correlation ID not set');
	}
});

// Test 11: EnterpriseLoggingService - Configuration
testFramework.test('EnterpriseLoggingService - Configuration', async () => {
	const loggingService = new EnterpriseLoggingService();
	
	// Check if configuration is set
	if (!loggingService.config) {
		throw new Error('Logging configuration not set');
	}
	
	// Check if file logging is configured
	if (!loggingService.config.logging.enableFile) {
		throw new Error('File logging not enabled');
	}
	
	// Check if console logging is configured
	if (!loggingService.config.logging.enableConsole) {
		throw new Error('Console logging not enabled');
	}
	
	// Check if security logging is configured
	if (!loggingService.config.security.enableSecurityLogging) {
		throw new Error('Security logging not enabled');
	}
	
	// Check if audit logging is configured
	if (!loggingService.config.security.enableAuditLogging) {
		throw new Error('Audit logging not enabled');
	}
});

// Test 12: StructuredLoggingService - Structured Logging
testFramework.test('StructuredLoggingService - Structured Logging', async () => {
	const structuredLogging = new StructuredLoggingService();
	
	// Test structured logging
	const logEntry = structuredLogging.structuredLog('info', 'Test structured message', {
		data: { test: true },
		metadata: { source: 'test' }
	});
	
	// Check if log entry is created
	if (!logEntry) {
		throw new Error('Structured log entry not created');
	}
	
	// Check if log entry has required fields
	if (!logEntry.level || !logEntry.message || !logEntry.timestamp || !logEntry.correlation) {
		throw new Error('Structured log entry missing required fields');
	}
	
	// Check if correlation ID is present
	if (!logEntry.correlation.id) {
		throw new Error('Correlation ID not present in log entry');
	}
	
	// Check if context is present
	if (!logEntry.context) {
		throw new Error('Context not present in log entry');
	}
	
	// Check if metadata is present
	if (!logEntry.metadata) {
		throw new Error('Metadata not present in log entry');
	}
});

// Test 13: StructuredLoggingService - Context Management
testFramework.test('StructuredLoggingService - Context Management', async () => {
	const structuredLogging = new StructuredLoggingService();
	
	// Start context
	const contextId = structuredLogging.startContext('test_context', 'operation', { test: true });
	
	// Check if context is created
	if (!contextId) {
		throw new Error('Context not created');
	}
	
	// Check if context is in stack
	const currentContext = structuredLogging.getCurrentContext();
	if (!currentContext || currentContext.id !== contextId) {
		throw new Error('Context not in stack');
	}
	
	// End context
	const result = structuredLogging.endContext(contextId, 'success');
	
	// Check if context is ended
	if (!result) {
		throw new Error('Context not ended properly');
	}
	
	// Check if duration is calculated
	if (typeof result.duration !== 'number') {
		throw new Error('Context duration not calculated');
	}
});

// Test 14: StructuredLoggingService - Correlation Management
testFramework.test('StructuredLoggingService - Correlation Management', async () => {
	const structuredLogging = new StructuredLoggingService();
	
	// Create correlation chain
	const correlationId = structuredLogging.createCorrelationChain();
	
	// Check if correlation is created
	if (!correlationId) {
		throw new Error('Correlation chain not created');
	}
	
	// Check if correlation is set
	const currentCorrelation = structuredLogging.getCorrelationId();
	if (currentCorrelation !== correlationId) {
		throw new Error('Correlation ID not set properly');
	}
	
	// Check if correlation chain is retrieved
	const chain = structuredLogging.getCorrelationChain(correlationId);
	if (!Array.isArray(chain)) {
		throw new Error('Correlation chain not retrieved');
	}
	
	// Check if chain has current correlation
	if (chain.length === 0 || chain[chain.length - 1].id !== correlationId) {
		throw new Error('Correlation chain does not contain current correlation');
	}
});

// Test 15: LogFormattingService - Formatting
testFramework.test('LogFormattingService - Formatting', async () => {
	const formattingService = new LogFormattingService();
	
	// Create test log entry
	const logEntry = {
		level: 'info',
		message: 'Test message',
		timestamp: new Date().toISOString(),
		correlation: { id: 'test-correlation-id' },
		context: { name: 'test-context', type: 'operation' },
		metadata: { test: true },
		performance: { responseTime: 100 }
	};
	
	// Test different formatting templates
	const standardFormat = formattingService.formatLogEntry(logEntry, 'standard');
	const jsonFormat = formattingService.formatLogEntry(logEntry, 'json');
	const compactFormat = formattingService.formatLogEntry(logEntry, 'compact');
	
	// Check if formats are generated
	if (!standardFormat || !jsonFormat || !compactFormat) {
		throw new Error('Log formatting not working');
	}
	
	// Check if JSON format is valid JSON
	try {
		JSON.parse(jsonFormat);
	} catch (error) {
		throw new Error('JSON format is not valid JSON');
	}
	
	// Check if compact format is shorter
	if (compactFormat.length >= standardFormat.length) {
		throw new Error('Compact format should be shorter than standard format');
	}
});

// Test 16: LogFormattingService - Context Management
testFramework.test('LogFormattingService - Context Management', async () => {
	const formattingService = new LogFormattingService();
	
	// Create context
	const contextId = formattingService.createContext('test_context', 'operation', { test: true });
	
	// Check if context is created
	if (!contextId) {
		throw new Error('Context not created');
	}
	
	// Check if context is in registry
	const context = formattingService.contextRegistry.get(contextId);
	if (!context) {
		throw new Error('Context not in registry');
	}
	
	// Check if context has required fields
	if (!context.name || !context.type || !context.startTime) {
		throw new Error('Context missing required fields');
	}
	
	// End context
	const result = formattingService.endContext(contextId, 'success');
	
	// Check if context is ended
	if (!result) {
		throw new Error('Context not ended properly');
	}
	
	// Check if context is removed from registry
	if (formattingService.contextRegistry.has(contextId)) {
		throw new Error('Context not removed from registry');
	}
});

// Test 17: Integration Test - Full Compliance Pipeline
testFramework.test('Integration Test - Full Compliance Pipeline', async () => {
	// Create all services
	const complianceService = new ComplianceService();
	const monitoringService = new ComplianceMonitoringService();
	const validationService = new ComplianceValidationService();
	const loggingService = new StructuredLoggingService();
	const formattingService = new LogFormattingService();
	
	// Set correlation ID
	const correlationId = loggingService.setCorrelationId();
	
	// Start context
	const contextId = loggingService.startContext('compliance_pipeline', 'integration');
	
	try {
		// Perform compliance assessment
		await complianceService.performComplianceAssessment();
		
		// Log compliance assessment
		loggingService.logCompliance('INTEGRATION', 'assessment_completed', {
			score: complianceService.complianceState.complianceScore
		});
		
		// Perform monitoring check
		await monitoringService.performRealTimeComplianceCheck();
		
		// Log monitoring check
		loggingService.logCompliance('INTEGRATION', 'monitoring_check_completed', {
			healthStatus: monitoringService.monitoringState.lastHealthCheck ? 'healthy' : 'unknown'
		});
		
		// Perform validation
		const validationResults = await validationService.performPeriodicValidation();
		
		// Log validation results
		loggingService.logCompliance('INTEGRATION', 'validation_completed', {
			status: validationResults.overallStatus,
			violations: validationResults.violations.length
		});
		
		// Format and log final result
		const finalLogEntry = loggingService.structuredLog('info', 'Compliance pipeline completed', {
			data: {
				complianceScore: complianceService.complianceState.complianceScore,
				validationStatus: validationResults.overallStatus,
				violations: validationResults.violations.length
			}
		});
		
		// Format the log entry
		const formattedLog = formattingService.formatLogEntry(finalLogEntry, 'detailed');
		
		// Check if pipeline completed successfully
		if (!formattedLog) {
			throw new Error('Pipeline completion log not formatted');
		}
		
	} finally {
		// End context
		loggingService.endContext(contextId, 'success');
	}
});

// Test 18: Performance Test - Multiple Concurrent Operations
testFramework.test('Performance Test - Multiple Concurrent Operations', async () => {
	const complianceService = new ComplianceService();
	const loggingService = new StructuredLoggingService();
	
	// Create multiple concurrent operations
	const operations = [];
	const startTime = Date.now();
	
	for (let i = 0; i < 10; i++) {
		operations.push(
			complianceService.performComplianceAssessment().then(() => {
				loggingService.structuredLog('info', `Assessment ${i} completed`, {
					data: { operationId: i }
				});
			})
		);
	}
	
	// Wait for all operations to complete
	await Promise.all(operations);
	
	const duration = Date.now() - startTime;
	
	// Check if operations completed within reasonable time
	if (duration > 10000) { // 10 seconds
		throw new Error(`Operations took too long: ${duration}ms`);
	}
	
	console.log(`   Performance: 10 concurrent operations completed in ${duration}ms`);
});

// Test 19: Edge Case Test - Error Handling
testFramework.test('Edge Case Test - Error Handling', async () => {
	const complianceService = new ComplianceService();
	const loggingService = new StructuredLoggingService();
	
	// Test with invalid configuration
	try {
		const invalidService = new ComplianceService({
			isa99: { enabled: false },
			nist: { enabled: false },
			gdpr: { enabled: false }
		});
		
		// Should still work with all frameworks disabled
		await invalidService.performComplianceAssessment();
		
	} catch (error) {
		throw new Error(`Service should handle disabled frameworks: ${error.message}`);
	}
	
	// Test with invalid log entry
	try {
		loggingService.structuredLog('invalid_level', 'test message');
	} catch (error) {
		// Should handle invalid log level gracefully
		if (!error.message.includes('level')) {
			throw new Error(`Should handle invalid log level: ${error.message}`);
		}
	}
	
	// Test with null context
	try {
		loggingService.endContext('non-existent-context');
	} catch (error) {
		// Should handle non-existent context gracefully
		if (!error.message.includes('not found')) {
			throw new Error(`Should handle non-existent context: ${error.message}`);
		}
	}
});

// Test 20: Edge Case Test - Resource Cleanup
testFramework.test('Edge Case Test - Resource Cleanup', async () => {
	const complianceService = new ComplianceService();
	const monitoringService = new ComplianceMonitoringService();
	const validationService = new ComplianceValidationService();
	const loggingService = new StructuredLoggingService();
	const formattingService = new LogFormattingService();
	
	// Create multiple contexts and correlations
	const contextIds = [];
	const correlationIds = [];
	
	for (let i = 0; i < 5; i++) {
		const contextId = loggingService.startContext(`test_context_${i}`, 'operation');
		const correlationId = loggingService.createCorrelationChain();
		
		contextIds.push(contextId);
		correlationIds.push(correlationId);
	}
	
	// Check if resources are created
	if (loggingService.contextStack.length !== 5) {
		throw new Error('Contexts not created properly');
	}
	
	if (loggingService.correlationChains.size !== 5) {
		throw new Error('Correlations not created properly');
	}
	
	// Clean up resources
	for (const contextId of contextIds) {
		loggingService.endContext(contextId, 'cleanup');
	}
	
	// Check if contexts are cleaned up
	if (loggingService.contextStack.length !== 0) {
		throw new Error('Contexts not cleaned up properly');
	}
	
	// Check if correlations are still present (they should be for history)
	if (loggingService.correlationChains.size === 0) {
		throw new Error('Correlations should be preserved for history');
	}
	
	// Test cleanup methods
	validationService.clearValidationHistory();
	formattingService.clearContextMetrics();
	
	console.log('   Resource cleanup: All resources properly managed');
});

// Run all tests
testFramework.run().catch(console.error);
