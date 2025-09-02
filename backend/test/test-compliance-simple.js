/**
 * Simple Compliance Framework Test
 * Basic functionality tests without monitoring noise
 */

import { ComplianceService } from '../services/complianceService.js';
import { EnterpriseLoggingService } from '../services/enterpriseLoggingService.js';

console.log('🧪 Starting Simple Compliance Framework Test...\n');

// Test 1: Basic Compliance Service
console.log('Test 1: Basic Compliance Service');
try {
	const complianceService = new ComplianceService({
		isa99: { enabled: true },
		nist: { enabled: true },
		gdpr: { enabled: true }
	});
	
	// Check initialization
	if (!complianceService.config) {
		throw new Error('Compliance service not initialized');
	}
	
	// Check ISA-99 state
	if (!complianceService.complianceState.isa99) {
		throw new Error('ISA-99 state not initialized');
	}
	
	// Check NIST state
	if (!complianceService.complianceState.nist) {
		throw new Error('NIST state not initialized');
	}
	
	// Check GDPR state
	if (!complianceService.complianceState.gdpr) {
		throw new Error('GDPR state not initialized');
	}
	
	console.log('✅ Compliance Service - Basic initialization passed');
} catch (error) {
	console.log(`❌ Compliance Service - Basic initialization failed: ${error.message}`);
}

// Test 2: Compliance Assessment
console.log('Test 2: Compliance Assessment');
try {
	const complianceService = new ComplianceService();
	
	// Perform assessment
	await complianceService.performComplianceAssessment();
	
	// Check if assessment was performed
	if (!complianceService.complianceState.lastAudit) {
		throw new Error('Assessment not performed');
	}
	
	// Check if compliance score is calculated
	if (typeof complianceService.complianceState.complianceScore !== 'number') {
		throw new Error('Compliance score not calculated');
	}
	
	console.log(`✅ Compliance Assessment passed - Score: ${complianceService.complianceState.complianceScore.toFixed(2)}`);
} catch (error) {
	console.log(`❌ Compliance Assessment failed: ${error.message}`);
}

// Test 3: Report Generation
console.log('Test 3: Report Generation');
try {
	const complianceService = new ComplianceService();
	
	// Generate report
	const report = await complianceService.generateComplianceReport();
	
	// Check if report is generated
	if (!report || !report.reportId || !report.timestamp) {
		throw new Error('Report not generated properly');
	}
	
	// Check if overall compliance is present
	if (!report.overallCompliance || typeof report.overallCompliance.score !== 'number') {
		throw new Error('Overall compliance not present in report');
	}
	
	console.log(`✅ Report Generation passed - Report ID: ${report.reportId}`);
} catch (error) {
	console.log(`❌ Report Generation failed: ${error.message}`);
}

// Test 4: Enterprise Logging Service
console.log('Test 4: Enterprise Logging Service');
try {
	const loggingService = new EnterpriseLoggingService({
		logging: {
			enableConsole: true,
			enableFile: false, // Disable file logging for test
			enableDatabase: false, // Disable database logging for test
			enableRemote: false // Disable remote logging for test
		}
	});
	
	// Test basic logging
	loggingService.log('info', 'Test message', { test: true });
	
	// Test correlation ID
	const correlationId = loggingService.setCorrelationId();
	if (!correlationId) {
		throw new Error('Correlation ID not set');
	}
	
	// Test audit logging
	loggingService.logAudit('test_action', { details: 'test' });
	
	// Test security logging
	loggingService.logSecurity('test_security_event', { details: 'test' });
	
	// Test compliance logging
	loggingService.logCompliance('ISA-99', 'test_compliance_event', { details: 'test' });
	
	console.log(`✅ Enterprise Logging Service passed - Correlation ID: ${correlationId}`);
} catch (error) {
	console.log(`❌ Enterprise Logging Service failed: ${error.message}`);
}

// Test 5: Integration Test
console.log('Test 5: Integration Test');
try {
	const complianceService = new ComplianceService();
	const loggingService = new EnterpriseLoggingService({
		logging: {
			enableConsole: false, // Disable console output for test
			enableFile: false,
			enableDatabase: false,
			enableRemote: false
		}
	});
	
	// Set correlation ID
	const correlationId = loggingService.setCorrelationId();
	
	// Perform compliance assessment
	await complianceService.performComplianceAssessment();
	
	// Log the assessment
	loggingService.logCompliance('INTEGRATION', 'assessment_completed', {
		score: complianceService.complianceState.complianceScore,
		correlationId: correlationId
	});
	
	// Generate report
	const report = await complianceService.generateComplianceReport();
	
	// Log the report
	loggingService.logCompliance('INTEGRATION', 'report_generated', {
		reportId: report.reportId,
		score: report.overallCompliance.score
	});
	
	console.log(`✅ Integration Test passed - Final Score: ${report.overallCompliance.score.toFixed(2)}`);
} catch (error) {
	console.log(`❌ Integration Test failed: ${error.message}`);
}

console.log('\n🎉 Simple Compliance Framework Test completed!');
