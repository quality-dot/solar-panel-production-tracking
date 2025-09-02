/**
 * Test Anomaly Detection and Threat Intelligence System
 */

import StatisticalAnalyzer from '../services/statisticalAnalyzer.js';
import SecurityRuleEngine from '../services/securityRuleEngine.js';
import ThreatAggregator from '../services/threatAggregator.js';

console.log('🧪 Testing Anomaly Detection System...\n');

// Test 1: StatisticalAnalyzer
console.log('Test 1: StatisticalAnalyzer');
try {
  const analyzer = new StatisticalAnalyzer();
  
  // Add normal data
  for (let i = 0; i < 20; i++) {
    analyzer.addDataPoint('response_time', 100 + Math.random() * 20);
  }
  
  // Add anomaly
  const anomalyResult = analyzer.detectAnomalies('response_time', 500);
  console.log('✅ Anomaly detection working');
  console.log('   Is anomaly:', anomalyResult.isAnomaly);
  console.log('   Confidence:', anomalyResult.confidence);
  
} catch (error) {
  console.error('❌ StatisticalAnalyzer test failed:', error.message);
}

// Test 2: SecurityRuleEngine
console.log('\nTest 2: SecurityRuleEngine');
try {
  const ruleEngine = new SecurityRuleEngine();
  
  // Test threshold rule
  const results = ruleEngine.evaluateMetric('auth_failures_per_minute', 8);
  console.log('✅ Rule evaluation working');
  console.log('   Violations found:', results.length);
  
  const stats = ruleEngine.getRuleStatistics();
  console.log('✅ Rule statistics working');
  console.log('   Total rules:', stats.totalRules);
  
} catch (error) {
  console.error('❌ SecurityRuleEngine test failed:', error.message);
}

// Test 3: ThreatAggregator
console.log('\nTest 3: ThreatAggregator');
try {
  const threatAggregator = new ThreatAggregator({ enableAbuseIPDB: false });
  
  // Test IP threat checking
  const threatData = await threatAggregator.checkIPThreat('192.168.1.100');
  console.log('✅ IP threat checking working');
  console.log('   Is threat:', threatData.isThreat);
  console.log('   Overall score:', threatData.overallScore);
  
  // Test IP blocking
  threatAggregator.blockIP('192.168.1.102', 'Test blocking');
  const isBlocked = threatAggregator.isIPBlocked('192.168.1.102');
  console.log('✅ IP blocking working');
  console.log('   IP blocked:', isBlocked);
  
} catch (error) {
  console.error('❌ ThreatAggregator test failed:', error.message);
}

console.log('\n🎯 Anomaly Detection System Test Complete!');
