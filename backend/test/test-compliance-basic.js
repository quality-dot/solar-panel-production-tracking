/**
 * Basic Compliance Framework Test
 * Minimal test to verify core functionality
 */

console.log('🧪 Starting Basic Compliance Framework Test...\n');

// Test 1: Import and Basic Initialization
console.log('Test 1: Import and Basic Initialization');
try {
	const { ComplianceService } = await import('../services/complianceService.js');
	
	const complianceService = new ComplianceService({
		isa99: { enabled: true },
		nist: { enabled: true },
		gdpr: { enabled: true }
	});
	
	console.log('✅ Compliance Service imported and initialized successfully');
	console.log(`   - ISA-99 enabled: ${complianceService.config.isa99.enabled}`);
	console.log(`   - NIST enabled: ${complianceService.config.nist.enabled}`);
	console.log(`   - GDPR enabled: ${complianceService.config.gdpr.enabled}`);
} catch (error) {
	console.log(`❌ Import/Initialization failed: ${error.message}`);
}

// Test 2: Basic Assessment
console.log('\nTest 2: Basic Assessment');
try {
	const { ComplianceService } = await import('../services/complianceService.js');
	const complianceService = new ComplianceService();
	
	// Perform a quick assessment
	await complianceService.assessISA99Compliance();
	
	console.log('✅ ISA-99 Assessment completed successfully');
	console.log(`   - Security Level: ${complianceService.complianceState.isa99.overallSecurityLevel}`);
	console.log(`   - Compliance Score: ${complianceService.complianceState.isa99.complianceScore.toFixed(2)}`);
} catch (error) {
	console.log(`❌ Assessment failed: ${error.message}`);
}

// Test 3: Report Generation
console.log('\nTest 3: Report Generation');
try {
	const { ComplianceService } = await import('../services/complianceService.js');
	const complianceService = new ComplianceService();
	
	// Generate a report
	const report = await complianceService.generateComplianceReport();
	
	console.log('✅ Report Generation completed successfully');
	console.log(`   - Report ID: ${report.reportId}`);
	console.log(`   - Overall Score: ${report.overallCompliance.score.toFixed(2)}`);
	console.log(`   - Status: ${report.overallCompliance.status}`);
} catch (error) {
	console.log(`❌ Report Generation failed: ${error.message}`);
}

// Test 4: Enterprise Logging
console.log('\nTest 4: Enterprise Logging');
try {
	const { EnterpriseLoggingService } = await import('../services/enterpriseLoggingService.js');
	
	const loggingService = new EnterpriseLoggingService({
		logging: {
			enableConsole: false, // Disable console output for test
			enableFile: false,
			enableDatabase: false,
			enableRemote: false
		}
	});
	
	// Test basic logging
	loggingService.log('info', 'Test message', { test: true });
	
	// Test correlation ID
	const correlationId = loggingService.setCorrelationId();
	
	console.log('✅ Enterprise Logging Service initialized successfully');
	console.log(`   - Correlation ID: ${correlationId}`);
} catch (error) {
	console.log(`❌ Enterprise Logging failed: ${error.message}`);
}

console.log('\n🎉 Basic Compliance Framework Test completed!');
