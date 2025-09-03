#!/usr/bin/env node

/**
 * Test Event Analytics Service
 * Task: 22.3 - Event Collection System
 * Description: Test the advanced analytics capabilities
 * Date: 2025-08-28
 */

import { EventAnalytics } from '../services/eventAnalytics.js';
import { SecurityEventEmitter } from '../services/securityEventEmitter.js';
import { MockEventStore } from './test-event-collection-core.js';
import { MockEventMetrics } from './test-event-collection-core.js';

// Mock the EventStore and EventMetrics for testing
class TestEventAnalytics extends EventAnalytics {
  constructor() {
    super();
    // Override with mock services
    this.eventStore = new MockEventStore();
    this.eventMetrics = new MockEventMetrics();
  }
}

// Test data generator
function generateTestEvents() {
  const events = [];
  const now = new Date();
  
  // Generate normal events
  for (let i = 0; i < 50; i++) {
    events.push({
      id: `event-${i}`,
      eventType: 'user.login',
      severity: 'info',
      userId: `user-${i % 5}`,
      timestamp: new Date(now.getTime() - i * 60000).toISOString(),
      context: {
        source: 'api',
        ip: `192.168.1.${i % 10}`,
        userAgent: 'test-agent'
      }
    });
  }
  
  // Generate some anomalies
  for (let i = 0; i < 20; i++) {
    events.push({
      id: `anomaly-${i}`,
      eventType: 'equipment.status.error',
      severity: 'error',
      userId: 'user-1', // Same user for anomaly detection
      timestamp: new Date(now.getTime() - i * 30000).toISOString(),
      context: {
        source: 'equipment-monitor',
        equipmentId: 'eq-001'
      }
    });
  }
  
  // Generate late night events (time anomaly)
  for (let i = 0; i < 10; i++) {
    const lateNight = new Date(now);
    lateNight.setHours(3, 0, 0, 0); // 3 AM
    
    events.push({
      id: `late-${i}`,
      eventType: 'data.access',
      severity: 'warning',
      userId: `user-${i % 3}`,
      timestamp: new Date(lateNight.getTime() - i * 60000).toISOString(),
      context: {
        source: 'api',
        endpoint: '/api/sensitive-data'
      }
    });
  }
  
  // Generate high-frequency events
  for (let i = 0; i < 30; i++) {
    events.push({
      id: `freq-${i}`,
      eventType: 'quality.check.failed',
      severity: 'warning',
      userId: 'user-2',
      timestamp: new Date(now.getTime() - i * 10000).toISOString(),
      context: {
        source: 'quality-control',
        stationId: 'station-001'
      }
    });
  }
  
  return events;
}

// Test functions
async function testBasicAnalytics() {
  console.log('\n🧪 Testing Basic Analytics...');
  
  const analytics = new TestEventAnalytics();
  const events = generateTestEvents();
  
  try {
    // Test pattern detection
    const patterns = analytics.detectPatterns(events, '24h');
    
    console.log('✅ Pattern detection:', {
      frequency: Object.keys(patterns.frequency.byType).length,
      correlations: Object.keys(patterns.correlation.userEventType).length,
      sequences: Object.keys(patterns.sequences.userSequences).length,
      anomalies: analytics.countAnomalies(patterns.anomalies),
      trends: Object.keys(patterns.trends.eventTypeTrends).length
    });
    
    // Test frequency analysis
    console.log('✅ Frequency analysis:', {
      eventTypes: patterns.frequency.byType,
      severities: patterns.frequency.bySeverity,
      users: Object.keys(patterns.frequency.byUser).length
    });
    
    return patterns;
  } catch (error) {
    console.error('❌ Basic analytics test failed:', error.message);
    throw error;
  }
}

async function testAnomalyDetection() {
  console.log('\n🔍 Testing Anomaly Detection...');
  
  const analytics = new TestEventAnalytics();
  const events = generateTestEvents();
  const patterns = analytics.detectPatterns(events, '24h');
  
  try {
    const anomalies = patterns.anomalies;
    
    console.log('✅ Anomalies detected:', {
      frequency: anomalies.frequencyAnomalies.length,
      time: anomalies.timeAnomalies.length,
      user: anomalies.userAnomalies.length,
      severity: anomalies.severityAnomalies.length
    });
    
    // Test specific anomaly types
    if (anomalies.frequencyAnomalies.length > 0) {
      console.log('✅ Frequency anomalies:', anomalies.frequencyAnomalies.slice(0, 2));
    }
    
    if (anomalies.timeAnomalies.length > 0) {
      console.log('✅ Time anomalies:', anomalies.timeAnomalies.slice(0, 2));
    }
    
    if (anomalies.userAnomalies.length > 0) {
      console.log('✅ User anomalies:', anomalies.userAnomalies.slice(0, 2));
    }
    
    return anomalies;
  } catch (error) {
    console.error('❌ Anomaly detection test failed:', error.message);
    throw error;
  }
}

async function testCorrelationAnalysis() {
  console.log('\n🔗 Testing Correlation Analysis...');
  
  const analytics = new TestEventAnalytics();
  const events = generateTestEvents();
  const patterns = analytics.detectPatterns(events, '24h');
  
  try {
    const correlations = patterns.correlation;
    
    console.log('✅ Correlations analyzed:', {
      userEventType: Object.keys(correlations.userEventType).length,
      sourceEventType: Object.keys(correlations.sourceEventType).length,
      severityEventType: Object.keys(correlations.severityEventType).length
    });
    
    // Test specific correlations
    if (correlations.userEventType['user-1']) {
      console.log('✅ User-1 event correlations:', correlations.userEventType['user-1']);
    }
    
    if (correlations.sourceEventType['equipment-monitor']) {
      console.log('✅ Equipment monitor correlations:', correlations.sourceEventType['equipment-monitor']);
    }
    
    return correlations;
  } catch (error) {
    console.error('❌ Correlation analysis test failed:', error.message);
    throw error;
  }
}

async function testSequenceAnalysis() {
  console.log('\n📊 Testing Sequence Analysis...');
  
  const analytics = new TestEventAnalytics();
  const events = generateTestEvents();
  const patterns = analytics.detectPatterns(events, '24h');
  
  try {
    const sequences = patterns.sequences;
    
    console.log('✅ Sequences analyzed:', {
      userSequences: Object.keys(sequences.userSequences).length,
      sourceSequences: Object.keys(sequences.sourceSequences).length
    });
    
    // Test specific sequences
    Object.entries(sequences.userSequences).slice(0, 2).forEach(([userId, userSequences]) => {
      console.log(`✅ User ${userId} sequences:`, userSequences.length);
      if (userSequences.length > 0) {
        console.log('  Sample sequence:', userSequences[0]);
      }
    });
    
    return sequences;
  } catch (error) {
    console.error('❌ Sequence analysis test failed:', error.message);
    throw error;
  }
}

async function testTrendAnalysis() {
  console.log('\n📈 Testing Trend Analysis...');
  
  const analytics = new TestEventAnalytics();
  const events = generateTestEvents();
  const patterns = analytics.detectPatterns(events, '24h');
  
  try {
    const trends = patterns.trends;
    
    console.log('✅ Trends analyzed:', {
      eventTypeTrends: Object.keys(trends.eventTypeTrends).length
    });
    
    // Test specific trends
    Object.entries(trends.eventTypeTrends).slice(0, 2).forEach(([eventType, trendData]) => {
      console.log(`✅ ${eventType} trend:`, {
        intervals: trendData.length,
        hasTrend: !!trendData.trend
      });
      
      if (trendData.trend) {
        console.log(`  Trend direction: ${trendData.trend.direction}`);
        console.log(`  Change: ${trendData.trend.change} (${trendData.trend.changePercent.toFixed(1)}%)`);
      }
    });
    
    return trends;
  } catch (error) {
    console.error('❌ Trend analysis test failed:', error.message);
    throw error;
  }
}

async function testPredictiveInsights() {
  console.log('\n🔮 Testing Predictive Insights...');
  
  const analytics = new TestEventAnalytics();
  const events = generateTestEvents();
  const patterns = analytics.detectPatterns(events, '24h');
  
  try {
    const insights = analytics.generatePredictiveInsights(patterns);
    
    console.log('✅ Insights generated:', {
      riskAssessment: !!insights.riskAssessment.overallRisk,
      maintenancePredictions: Object.keys(insights.maintenancePredictions.equipmentMaintenance || {}).length,
      securityThreats: insights.securityThreats.riskLevel,
      performanceForecasts: Object.keys(insights.performanceForecasts.eventVolume || {}).length
    });
    
    // Test risk assessment
    if (insights.riskAssessment.overallRisk !== undefined) {
      console.log('✅ Risk assessment:', {
        score: insights.riskAssessment.overallRisk,
        level: insights.riskAssessment.riskLevel,
        highRiskAreas: insights.riskAssessment.highRiskAreas.length,
        recommendations: insights.riskAssessment.recommendations.length
      });
    }
    
    // Test security threats
    if (insights.securityThreats.riskLevel) {
      console.log('✅ Security threats:', {
        level: insights.securityThreats.riskLevel,
        types: insights.securityThreats.threatTypes.length,
        actions: insights.securityThreats.immediateActions.length
      });
    }
    
    // Test maintenance predictions
    if (insights.maintenancePredictions.equipmentMaintenance) {
      console.log('✅ Maintenance predictions:', {
        equipment: insights.maintenancePredictions.equipmentMaintenance.length,
        system: insights.maintenancePredictions.systemMaintenance.length
      });
    }
    
    return insights;
  } catch (error) {
    console.error('❌ Predictive insights test failed:', error.message);
    throw error;
  }
}

async function testTimeIntervals() {
  console.log('\n⏰ Testing Time Intervals...');
  
  const analytics = new TestEventAnalytics();
  
  try {
    const intervals1h = analytics.createTimeIntervals('1h');
    const intervals24h = analytics.createTimeIntervals('24h');
    const intervals7d = analytics.createTimeIntervals('7d');
    
    console.log('✅ Time intervals created:', {
      '1h': intervals1h.length,
      '24h': intervals24h.length,
      '7d': intervals7d.length
    });
    
    // Test interval structure
    if (intervals1h.length > 0) {
      console.log('✅ 1h interval sample:', {
        name: intervals1h[0].name,
        start: intervals1h[0].start,
        end: intervals1h[0].end
      });
    }
    
    if (intervals24h.length > 0) {
      console.log('✅ 24h interval sample:', {
        name: intervals24h[0].name,
        start: intervals24h[0].start,
        end: intervals24h[0].end
      });
    }
    
    return { intervals1h, intervals24h, intervals7d };
  } catch (error) {
    console.error('❌ Time intervals test failed:', error.message);
    throw error;
  }
}

async function testAnalyticsReport() {
  console.log('\n📋 Testing Analytics Report...');
  
  const analytics = new TestEventAnalytics();
  
  try {
    const report = await analytics.getAnalyticsReport('24h');
    
    console.log('✅ Analytics report generated:', {
      timestamp: report.timestamp,
      timeRange: report.timeRange,
      totalEvents: report.summary.totalEvents,
      eventTypes: report.summary.eventTypes,
      anomalies: report.summary.anomalies,
      riskLevel: report.summary.riskLevel
    });
    
    // Test report structure
    console.log('✅ Report structure:', {
      hasPatterns: !!report.patterns,
      hasInsights: !!report.insights,
      hasMetrics: !!report.metrics,
      hasSummary: !!report.summary
    });
    
    return report;
  } catch (error) {
    console.error('❌ Analytics report test failed:', error.message);
    throw error;
  }
}

async function testHealthStatus() {
  console.log('\n💚 Testing Health Status...');
  
  const analytics = new TestEventAnalytics();
  
  try {
    const health = analytics.getHealthStatus();
    
    console.log('✅ Health status:', {
      status: health.status,
      patterns: health.patterns,
      anomalies: health.anomalies,
      trends: health.trends,
      timestamp: health.timestamp
    });
    
    return health;
  } catch (error) {
    console.error('❌ Health status test failed:', error.message);
    throw error;
  }
}

async function testPerformance() {
  console.log('\n⚡ Testing Performance...');
  
  const analytics = new TestEventAnalytics();
  const events = generateTestEvents();
  
  try {
    const startTime = Date.now();
    
    // Test pattern detection performance
    const patterns = analytics.detectPatterns(events, '24h');
    const patternTime = Date.now() - startTime;
    
    // Test insights generation performance
    const insightsStart = Date.now();
    const insights = analytics.generatePredictiveInsights(patterns);
    const insightsTime = Date.now() - insightsStart;
    
    console.log('✅ Performance metrics:', {
      eventCount: events.length,
      patternDetection: `${patternTime}ms`,
      insightsGeneration: `${insightsTime}ms`,
      totalTime: `${Date.now() - startTime}ms`
    });
    
    // Performance assertions
    if (patternTime > 1000) {
      console.warn('⚠️  Pattern detection took longer than expected');
    }
    
    if (insightsTime > 500) {
      console.warn('⚠️  Insights generation took longer than expected');
    }
    
    return { patterns, insights, performance: { patternTime, insightsTime } };
  } catch (error) {
    console.error('❌ Performance test failed:', error.message);
    throw error;
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Event Analytics Service Tests...\n');
  
  const results = {};
  const startTime = Date.now();
  
  try {
    // Run all tests
    results.basicAnalytics = await testBasicAnalytics();
    results.anomalyDetection = await testAnomalyDetection();
    results.correlationAnalysis = await testCorrelationAnalysis();
    results.sequenceAnalysis = await testSequenceAnalysis();
    results.trendAnalysis = await testTrendAnalysis();
    results.predictiveInsights = await testPredictiveInsights();
    results.timeIntervals = await testTimeIntervals();
    results.analyticsReport = await testAnalyticsReport();
    results.healthStatus = await testHealthStatus();
    results.performance = await testPerformance();
    
    const totalTime = Date.now() - startTime;
    
    console.log('\n🎉 All tests completed successfully!');
    console.log(`⏱️  Total test time: ${totalTime}ms`);
    
    // Summary
    console.log('\n📊 Test Summary:');
    console.log(`✅ Basic Analytics: ${Object.keys(results.basicAnalytics.frequency.byType).length} event types`);
    console.log(`✅ Anomaly Detection: ${results.anomalyDetection.frequencyAnomalies.length + results.anomalyDetection.timeAnomalies.length + results.anomalyDetection.userAnomalies.length} anomalies`);
    console.log(`✅ Correlation Analysis: ${Object.keys(results.correlationAnalysis.userEventType).length} user correlations`);
    console.log(`✅ Sequence Analysis: ${Object.keys(results.sequenceAnalysis.userSequences).length} user sequences`);
    console.log(`✅ Trend Analysis: ${Object.keys(results.trendAnalysis.eventTypeTrends).length} event type trends`);
    console.log(`✅ Predictive Insights: Risk level ${results.predictiveInsights.riskAssessment.riskLevel}`);
    console.log(`✅ Time Intervals: ${results.timeIntervals.intervals24h.length} hourly intervals`);
    console.log(`✅ Analytics Report: ${results.analyticsReport.summary.totalEvents} total events`);
    console.log(`✅ Health Status: ${results.healthStatus.status}`);
    console.log(`✅ Performance: ${results.performance.performance.patternTime}ms pattern detection`);
    
    return results;
    
  } catch (error) {
    console.error('\n💥 Test suite failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runAllTests, TestEventAnalytics };
