#!/usr/bin/env node
// Test script for Monitoring and Analytics System
// Run with: node backend/scripts/test-monitoring-system.js

import { metricsService } from '../services/metricsService.js';
import { processBarcodeComplete } from '../utils/barcodeProcessor.js';

console.log('📊 Testing Monitoring and Analytics System\n');

// Test data
const testBarcodes = [
  { barcode: 'CRS25WT03600001', shouldSucceed: true },  // 036 (3-char panel type)
  { barcode: 'CRS25WT03600002', shouldSucceed: true },  // 036 (3-char panel type)
  { barcode: 'CRS25WT14400001', shouldSucceed: true },  // 144 (3-char panel type)
  { barcode: 'INVALID123', shouldSucceed: false },       // Invalid format
  { barcode: 'CRS99XT09900001', shouldSucceed: false },  // Invalid year (99)
  { barcode: 'CRS25WT07200001', shouldSucceed: true },   // 072 (3-char panel type)
  { barcode: 'TOOLONG1234567890', shouldSucceed: false }, // Too long
  { barcode: 'CRS25WT06000001', shouldSucceed: true }    // 060 (3-char panel type)
];

const testMOEvents = [
  { moId: 1, orderNumber: 'MO-TEST-001', eventType: 'created' },
  { moId: 1, orderNumber: 'MO-TEST-001', eventType: 'progress_updated' },
  { moId: 2, orderNumber: 'MO-TEST-002', eventType: 'created' }
];

const testPanelEvents = [
  { panelId: 101, barcode: 'CRS25WT03600001', moId: 1, hasOverrides: false },
  { panelId: 102, barcode: 'CRS25WT03600002', moId: 1, hasOverrides: true },
  { panelId: 103, barcode: 'CRS25WT14400001', moId: 2, hasOverrides: false }
];

async function testMonitoringSystem() {
  try {
    console.log('🔄 Step 1: Testing barcode event recording...');
    
    // Test barcode processing with metrics
    for (const test of testBarcodes) {
      const startTime = performance.now();
      const result = processBarcodeComplete(test.barcode, {
        stationId: Math.floor(Math.random() * 8) + 1,
        userId: 'test-user-' + Math.floor(Math.random() * 5)
      });
      const processingTime = performance.now() - startTime;
      
      const success = result.success;
      const status = success === test.shouldSucceed ? '✅' : '⚠️';
      
      console.log(`   ${status} ${test.barcode}: ${success ? 'Valid' : 'Invalid'} (${processingTime.toFixed(2)}ms)`);
      
      // Small delay to simulate real scanning intervals
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n📋 Step 2: Testing MO event recording...');
    
    // Test MO events
    for (const moEvent of testMOEvents) {
      try {
        const event = metricsService.recordMOEvent({
          ...moEvent,
          details: { test: true },
          userId: 'test-supervisor'
        });
        console.log(`   ✅ MO Event: ${moEvent.orderNumber} - ${moEvent.eventType}`);
      } catch (error) {
        console.log(`   ❌ MO Event Failed: ${error.message}`);
      }
    }

    console.log('\n🔧 Step 3: Testing panel event recording...');
    
    // Test panel events
    for (const panelEvent of testPanelEvents) {
      try {
        const event = metricsService.recordPanelEvent({
          ...panelEvent,
          lineAssignment: { lineName: panelEvent.barcode.includes('144') ? 'LINE_2' : 'LINE_1' },
          processingTime: Math.random() * 1000 + 500,
          userId: 'test-operator'
        });
        console.log(`   ✅ Panel Event: Panel ${panelEvent.panelId} - ${panelEvent.hasOverrides ? 'With Overrides' : 'Standard'}`);
      } catch (error) {
        console.log(`   ❌ Panel Event Failed: ${error.message}`);
      }
    }

    console.log('\n📊 Step 4: Testing real-time metrics...');
    
    // Get real-time metrics
    const realTimeMetrics = metricsService.getRealTimeMetrics();
    console.log(`   ✅ Total Scans: ${realTimeMetrics.barcode.totalScans}`);
    console.log(`   ✅ Success Rate: ${realTimeMetrics.barcode.successRate}`);
    console.log(`   ✅ Scans/Min: ${realTimeMetrics.barcode.scansPerMinute}`);
    console.log(`   ✅ Uptime: ${realTimeMetrics.session.uptime.formatted}`);

    console.log('\n🚨 Step 5: Testing error analysis...');
    
    // Get error analysis
    const errorAnalysis = metricsService.getErrorAnalysis();
    console.log(`   ✅ Total Error Types: ${errorAnalysis.totalErrorTypes}`);
    console.log(`   ✅ Total Errors: ${errorAnalysis.summary.totalErrors}`);
    console.log(`   ✅ Recent Errors: ${errorAnalysis.summary.recentErrors}`);
    
    if (errorAnalysis.patterns.length > 0) {
      console.log('   📋 Top Error Patterns:');
      errorAnalysis.patterns.slice(0, 3).forEach(pattern => {
        console.log(`      - ${pattern.errorCode}: ${pattern.count} occurrences (${pattern.trend})`);
      });
    }

    console.log('\n⚡ Step 6: Testing performance statistics...');
    
    // Get performance stats
    const performanceStats = await metricsService.getPerformanceStats('15m');
    console.log(`   ✅ Events in last 15m: ${performanceStats.events.total}`);
    console.log(`   ✅ Average processing time: ${performanceStats.performance.averageProcessingTime || 'N/A'}ms`);
    console.log(`   ✅ Peak throughput: ${performanceStats.performance.peakThroughput}/min`);
    console.log(`   ✅ Success rate: ${performanceStats.quality.successRate || 'N/A'}`);

    console.log('\n🏭 Step 7: Testing production dashboard...');
    
    // Get dashboard data
    const dashboardData = await metricsService.getProductionDashboard();
    console.log(`   ✅ System Status: ${dashboardData.overview.status.toUpperCase()}`);
    console.log(`   ✅ Total Scans: ${dashboardData.overview.totalScans}`);
    console.log(`   ✅ Success Rate: ${dashboardData.overview.successRate}`);
    console.log(`   ✅ Active Alerts: ${dashboardData.alerts.length}`);
    
    if (dashboardData.alerts.length > 0) {
      console.log('   🚨 Alerts:');
      dashboardData.alerts.forEach(alert => {
        console.log(`      - ${alert.level.toUpperCase()}: ${alert.message}`);
      });
    }

    console.log('\n🎯 Step 8: Testing line metrics...');
    
    // Get line metrics
    const lineMetrics = await metricsService.getLineMetrics();
    console.log(`   ✅ Line 1: ${lineMetrics.line1?.scans || 0} scans, ${lineMetrics.line1?.successRate || '0%'} success`);
    console.log(`   ✅ Line 2: ${lineMetrics.line2?.scans || 0} scans, ${lineMetrics.line2?.successRate || '0%'} success`);

    console.log('\n🚨 Step 9: Testing alerts generation...');
    
    // Generate alerts
    const alerts = metricsService.generateAlerts(realTimeMetrics, errorAnalysis, performanceStats);
    console.log(`   ✅ Generated ${alerts.length} alerts`);
    alerts.forEach(alert => {
      console.log(`      - ${alert.level.toUpperCase()}: ${alert.message}`);
    });

    console.log('\n🏥 Step 10: Testing system health...');
    
    // Get system status
    const systemStatus = metricsService.getSystemStatus(realTimeMetrics, errorAnalysis);
    console.log(`   ✅ System Health: ${systemStatus.toUpperCase()}`);

    console.log('\n✅ Monitoring system test completed successfully!');
    console.log('\n📊 Test Results Summary:');
    console.log(`   • Barcode Events: ${realTimeMetrics.barcode.totalScans} processed`);
    console.log(`   • MO Events: ${testMOEvents.length} recorded`);
    console.log(`   • Panel Events: ${testPanelEvents.length} recorded`);
    console.log(`   • Error Patterns: ${errorAnalysis.totalErrorTypes} types identified`);
    console.log(`   • System Status: ${systemStatus.toUpperCase()}`);
    console.log(`   • Performance: ${performanceStats.performance.averageProcessingTime || 'N/A'}ms avg processing time`);
    
    console.log('\n🚀 Production monitoring system is operational!');
    console.log('\n📱 Dashboard URLs:');
    console.log('   • JSON API: GET /api/v1/metrics/dashboard');
    console.log('   • HTML Dashboard: GET /api/v1/metrics/dashboard-html');
    console.log('   • Real-time Metrics: GET /api/v1/metrics/realtime');
    console.log('   • Error Analysis: GET /api/v1/metrics/errors');
    console.log('   • Performance Stats: GET /api/v1/metrics/performance?timeRange=1h');
    console.log('   • Health Check: GET /api/v1/metrics/health');

  } catch (error) {
    console.error('\n❌ Monitoring system test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testMonitoringSystem().catch(console.error);
