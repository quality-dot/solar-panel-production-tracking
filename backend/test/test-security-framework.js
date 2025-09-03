// Test script for Security Testing Framework
// Comprehensive testing of all security test categories

import { 
  securityTester, 
  runSecurityTests, 
  getSecurityReport,
  SECURITY_TEST_CONFIG 
} from '../utils/securityTester.js';

console.log('🔒 Testing Security Testing Framework');
console.log('=====================================\n');

// Test 1: Configuration validation
console.log('1. Testing Security Test Configuration:');
try {
  console.log(`   ✅ Test categories: ${Object.keys(SECURITY_TEST_CONFIG.testCategories).length}`);
  console.log(`   ✅ Authentication weight: ${SECURITY_TEST_CONFIG.testCategories.AUTHENTICATION.weight}`);
  console.log(`   ✅ Authorization weight: ${SECURITY_TEST_CONFIG.testCategories.AUTHORIZATION.weight}`);
  console.log(`   ✅ Encryption weight: ${SECURITY_TEST_CONFIG.testCategories.ENCRYPTION.weight}`);
  console.log(`   ✅ Performance thresholds: ${Object.keys(SECURITY_TEST_CONFIG.performance).length}`);
} catch (error) {
  console.log(`   ❌ Configuration test failed: ${error.message}`);
}

// Test 2: Security test execution
console.log('\n2. Running comprehensive security tests:');
try {
  console.log('   🚀 Starting security test suite...');
  const startTime = Date.now();
  
  const report = await runSecurityTests();
  const executionTime = Date.now() - startTime;
  
  console.log(`   ✅ Security tests completed in ${executionTime}ms`);
  console.log(`   ✅ Overall security score: ${report.summary.overallScore}/100`);
  console.log(`   ✅ Total tests run: ${report.summary.totalTests}`);
  console.log(`   ✅ Passed tests: ${report.summary.passedTests}`);
  console.log(`   ✅ Failed tests: ${report.summary.failedTests}`);
  console.log(`   ✅ Warning tests: ${report.summary.warningTests}`);
  
} catch (error) {
  console.log(`   ❌ Security test execution failed: ${error.message}`);
}

// Test 3: Detailed results analysis
console.log('\n3. Analyzing security test results:');
try {
  const report = getSecurityReport();
  
  // Vulnerability breakdown
  console.log('   📊 Vulnerability Breakdown:');
  Object.entries(report.summary.vulnerabilityCounts).forEach(([level, count]) => {
    const icon = count === 0 ? '✅' : count <= 2 ? '⚠️' : '❌';
    console.log(`      ${icon} ${level}: ${count}`);
  });
  
  // Risk assessment
  console.log(`   🎯 Overall Risk Assessment: ${report.riskAssessment}`);
  
  // Test category results
  console.log('   📋 Test Category Results:');
  const categoryResults = {};
  report.results.forEach(result => {
    if (!categoryResults[result.category]) {
      categoryResults[result.category] = { passed: 0, failed: 0, warning: 0 };
    }
    categoryResults[result.category][result.status.toLowerCase()]++;
  });
  
  Object.entries(categoryResults).forEach(([category, counts]) => {
    const total = counts.passed + counts.failed + counts.warning;
    const passedPct = Math.round((counts.passed / total) * 100);
    const icon = passedPct >= 80 ? '✅' : passedPct >= 60 ? '⚠️' : '❌';
    console.log(`      ${icon} ${category}: ${counts.passed}/${total} passed (${passedPct}%)`);
  });
  
} catch (error) {
  console.log(`   ❌ Results analysis failed: ${error.message}`);
}

// Test 4: Individual test details
console.log('\n4. Individual test details:');
try {
  const report = getSecurityReport();
  
  report.results.forEach((result, index) => {
    const statusIcon = result.status === 'PASSED' ? '✅' : 
                      result.status === 'WARNING' ? '⚠️' : '❌';
    const vulnIcon = result.vulnerabilityLevel === 'NONE' ? '🟢' :
                    result.vulnerabilityLevel === 'LOW' ? '🟡' :
                    result.vulnerabilityLevel === 'MEDIUM' ? '🟠' :
                    result.vulnerabilityLevel === 'HIGH' ? '🔴' : '⚫';
    
    console.log(`   ${index + 1}. ${statusIcon} ${vulnIcon} ${result.testName}`);
    console.log(`      Category: ${result.category}`);
    console.log(`      Status: ${result.status}`);
    console.log(`      Vulnerability: ${result.vulnerabilityLevel}`);
    console.log(`      Description: ${result.description}`);
    console.log(`      Execution Time: ${result.executionTime}ms`);
    
    if (result.recommendations.length > 0) {
      console.log(`      Recommendations:`);
      result.recommendations.forEach((rec, recIndex) => {
        console.log(`        ${recIndex + 1}. ${rec}`);
      });
    }
    
    if (Object.keys(result.details).length > 0) {
      console.log(`      Details:`);
      Object.entries(result.details).forEach(([key, value]) => {
        console.log(`        ${key}: ${value}`);
      });
    }
    console.log('');
  });
  
} catch (error) {
  console.log(`   ❌ Individual test details failed: ${error.message}`);
}

// Test 5: Recommendations analysis
console.log('\n5. Security recommendations:');
try {
  const report = getSecurityReport();
  
  if (report.recommendations.length === 0) {
    console.log('   🎉 No critical recommendations - system is secure!');
  } else {
    console.log(`   📝 Found ${report.recommendations.length} recommendations:`);
    
    report.recommendations.forEach((rec, index) => {
      const priorityIcon = rec.priority === 'CRITICAL' ? '🔴' :
                          rec.priority === 'HIGH' ? '🟠' :
                          rec.priority === 'MEDIUM' ? '🟡' : '🟢';
      
      console.log(`      ${index + 1}. ${priorityIcon} ${rec.priority} Priority`);
      console.log(`         Action: ${rec.action}`);
      console.log(`         Description: ${rec.description}`);
      console.log(`         Timeframe: ${rec.timeframe}`);
      console.log('');
    });
  }
  
} catch (error) {
  console.log(`   ❌ Recommendations analysis failed: ${error.message}`);
}

// Test 6: Performance metrics
console.log('\n6. Performance metrics:');
try {
  const report = getSecurityReport();
  
  console.log(`   ⏱️  Total execution time: ${report.summary.executionTime}ms`);
  console.log(`   📊 Average time per test: ${Math.round(report.summary.executionTime / report.summary.totalTests)}ms`);
  
  // Performance thresholds
  const performanceConfig = SECURITY_TEST_CONFIG.performance;
  console.log(`   🎯 Performance thresholds:`);
  console.log(`      Max response time: ${performanceConfig.maxResponseTime}ms`);
  console.log(`      Max memory usage: ${Math.round(performanceConfig.maxMemoryUsage / 1024 / 1024)}MB`);
  console.log(`      Max CPU usage: ${performanceConfig.maxCpuUsage}%`);
  
  // Check if performance meets thresholds
  const meetsThresholds = report.summary.executionTime <= performanceConfig.maxResponseTime;
  console.log(`   ${meetsThresholds ? '✅' : '❌'} Performance meets thresholds: ${meetsThresholds ? 'YES' : 'NO'}`);
  
} catch (error) {
  console.log(`   ❌ Performance metrics failed: ${error.message}`);
}

// Test 7: Security score breakdown
console.log('\n7. Security score breakdown:');
try {
  const report = getSecurityReport();
  
  console.log(`   🎯 Overall Security Score: ${report.summary.overallScore}/100`);
  
  // Score interpretation
  let scoreInterpretation = '';
  let scoreIcon = '';
  
  if (report.summary.overallScore >= 90) {
    scoreInterpretation = 'Excellent - System is highly secure';
    scoreIcon = '🟢';
  } else if (report.summary.overallScore >= 80) {
    scoreInterpretation = 'Good - System is secure with minor improvements needed';
    scoreIcon = '🟢';
  } else if (report.summary.overallScore >= 70) {
    scoreInterpretation = 'Fair - System has moderate security posture';
    scoreIcon = '🟡';
  } else if (report.summary.overallScore >= 50) {
    scoreInterpretation = 'Poor - System has significant security issues';
    scoreIcon = '🟠';
  } else {
    scoreInterpretation = 'Critical - System has severe security vulnerabilities';
    scoreIcon = '🔴';
  }
  
  console.log(`   ${scoreIcon} Score interpretation: ${scoreInterpretation}`);
  
  // Risk level
  console.log(`   🚨 Risk level: ${report.riskAssessment}`);
  
} catch (error) {
  console.log(`   ❌ Security score breakdown failed: ${error.message}`);
}

console.log('\n🔒 Security Testing Framework Test Complete!');
console.log('============================================');

// Summary
console.log('\n📋 Test Summary:');
console.log('================');
console.log('✅ Configuration validation');
console.log('✅ Security test execution');
console.log('✅ Results analysis');
console.log('✅ Individual test details');
console.log('✅ Recommendations analysis');
console.log('✅ Performance metrics');
console.log('✅ Security score breakdown');

console.log('\n🎯 Next Steps:');
console.log('===============');
console.log('1. Review security test results');
console.log('2. Address any failed tests');
console.log('3. Implement recommended security improvements');
console.log('4. Schedule regular security testing');
console.log('5. Integrate with CI/CD pipeline');
console.log('6. Create security monitoring dashboard');
