#!/usr/bin/env node

// Load Testing Script for Solar Panel Production System
// Tests barcode processing performance under concurrent station load

import { Command } from 'commander';
import { 
  processBarcodesBulkOptimized,
  getPerformanceStats,
  resetPerformanceStats
} from '../utils/performanceOptimizer.js';
import { performanceCache } from '../utils/performanceCache.js';
import { generateTestBarcodes } from '../utils/barcodeGenerator.js';

const program = new Command();

program
  .name('load-test')
  .description('Load test barcode processing for concurrent stations')
  .version('1.0.0');

// Main load test command
program
  .command('run')
  .description('Run load test simulation')
  .option('-s, --stations <number>', 'Number of concurrent stations', '8')
  .option('-b, --barcodes <number>', 'Barcodes per station', '20')
  .option('-t, --target <ms>', 'Target response time in milliseconds', '2000')
  .option('-w, --warmup', 'Warm up cache before test', false)
  .option('-r, --reset', 'Reset performance stats before test', false)
  .option('--json', 'Output results as JSON')
  .action(async (options) => {
    try {
      const stations = parseInt(options.stations);
      const barcodesPerStation = parseInt(options.barcodes);
      const targetResponseTime = parseInt(options.target);
      
      console.log('🧪 Starting Load Test for Solar Panel Production System');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📊 Test Parameters:`);
      console.log(`   • Concurrent Stations: ${stations}`);
      console.log(`   • Barcodes per Station: ${barcodesPerStation}`);
      console.log(`   • Total Barcodes: ${stations * barcodesPerStation}`);
      console.log(`   • Target Response Time: ${targetResponseTime}ms per barcode`);
      console.log('');

      // Reset stats if requested
      if (options.reset) {
        resetPerformanceStats();
        console.log('🔄 Performance statistics reset');
      }

      // Warm up cache if requested
      if (options.warmup) {
        console.log('🔥 Warming up cache...');
        await performanceCache.warmUp();
        console.log('✅ Cache warm-up completed');
        console.log('');
      }

      // Generate test barcodes
      console.log('🏭 Generating test barcodes...');
      const testSets = [];
      
      for (let station = 1; station <= stations; station++) {
        const panelType = ['36', '40', '60', '72', '144'][station % 5];
        const stationBarcodes = generateTestBarcodes(panelType, barcodesPerStation);
        
        testSets.push({
          stationId: station,
          panelType,
          barcodes: stationBarcodes.barcodes.map(b => b.barcode)
        });
      }
      
      console.log(`✅ Generated ${stations * barcodesPerStation} test barcodes`);
      console.log('');

      // Run load test
      console.log('🚀 Starting load test...');
      const startTime = Date.now();
      
      // Simulate concurrent stations
      const stationPromises = testSets.map(async (stationData, index) => {
        const stationStartTime = Date.now();
        
        try {
          const result = await processBarcodesBulkOptimized(stationData.barcodes, {
            batchSize: Math.ceil(barcodesPerStation / 2),
            maxConcurrency: 3
          });

          const stationTime = Date.now() - stationStartTime;
          const avgTimePerBarcode = stationTime / stationData.barcodes.length;

          return {
            stationId: stationData.stationId,
            panelType: stationData.panelType,
            totalTime: stationTime,
            avgTimePerBarcode: Math.round(avgTimePerBarcode),
            maxTimePerBarcode: Math.max(...(result.results?.map(r => r.responseTime || 0) || [0])),
            successCount: result.statistics.successful,
            errorCount: result.statistics.failed,
            successRate: (result.statistics.successful / result.statistics.total * 100).toFixed(1) + '%',
            passed: avgTimePerBarcode <= targetResponseTime,
            result
          };
        } catch (error) {
          return {
            stationId: stationData.stationId,
            panelType: stationData.panelType,
            error: error.message,
            passed: false
          };
        }
      });

      const stationResults = await Promise.all(stationPromises);
      const totalTime = Date.now() - startTime;

      // Analyze results
      const analysis = analyzeResults(stationResults, totalTime, targetResponseTime);
      const performanceStats = getPerformanceStats();

      // Output results
      if (options.json) {
        console.log(JSON.stringify({
          testParameters: {
            stations,
            barcodesPerStation,
            totalBarcodes: stations * barcodesPerStation,
            targetResponseTime
          },
          results: stationResults,
          analysis,
          performanceStats
        }, null, 2));
      } else {
        printResults(stationResults, analysis, performanceStats);
      }

      // Exit with appropriate code
      process.exit(analysis.overallPassed ? 0 : 1);

    } catch (error) {
      console.error('❌ Load test failed:', error.message);
      process.exit(1);
    }
  });

// Benchmark specific operations
program
  .command('benchmark')
  .description('Benchmark specific operations')
  .option('-o, --operation <type>', 'Operation to benchmark (parse|validate|process)', 'process')
  .option('-c, --count <number>', 'Number of operations to run', '1000')
  .option('-i, --iterations <number>', 'Number of test iterations', '5')
  .action(async (options) => {
    try {
      const operation = options.operation;
      const count = parseInt(options.count);
      const iterations = parseInt(options.iterations);

      console.log(`🔬 Benchmarking ${operation} operation`);
      console.log(`   • Operations per iteration: ${count}`);
      console.log(`   • Iterations: ${iterations}`);
      console.log('');

      const results = [];

      for (let i = 1; i <= iterations; i++) {
        console.log(`Running iteration ${i}/${iterations}...`);
        
        const barcodes = generateTestBarcodes('72', count).barcodes.map(b => b.barcode);
        const startTime = Date.now();

        if (operation === 'process') {
          await processBarcodesBulkOptimized(barcodes, { maxConcurrency: 10 });
        }

        const iterationTime = Date.now() - startTime;
        const avgTime = iterationTime / count;
        
        results.push({
          iteration: i,
          totalTime: iterationTime,
          avgTime: Math.round(avgTime * 100) / 100,
          throughput: Math.round((count / iterationTime) * 1000)
        });

        console.log(`   ✅ Iteration ${i}: ${iterationTime}ms total, ${avgTime.toFixed(2)}ms avg, ${results[i-1].throughput} ops/sec`);
      }

      // Calculate statistics
      const avgTotal = results.reduce((sum, r) => sum + r.totalTime, 0) / iterations;
      const avgPerOp = results.reduce((sum, r) => sum + r.avgTime, 0) / iterations;
      const avgThroughput = results.reduce((sum, r) => sum + r.throughput, 0) / iterations;

      console.log('');
      console.log('📊 Benchmark Results:');
      console.log(`   • Average total time: ${Math.round(avgTotal)}ms`);
      console.log(`   • Average per operation: ${avgPerOp.toFixed(2)}ms`);
      console.log(`   • Average throughput: ${Math.round(avgThroughput)} ops/sec`);

    } catch (error) {
      console.error('❌ Benchmark failed:', error.message);
      process.exit(1);
    }
  });

// Cache performance test
program
  .command('cache')
  .description('Test cache performance')
  .option('-r, --requests <number>', 'Number of requests to test', '10000')
  .option('--hit-rate <percentage>', 'Target cache hit rate', '80')
  .action(async (options) => {
    try {
      const requests = parseInt(options.requests);
      const targetHitRate = parseInt(options.hitRate);

      console.log('🧰 Testing cache performance...');
      console.log(`   • Requests: ${requests}`);
      console.log(`   • Target hit rate: ${targetHitRate}%`);
      console.log('');

      // Reset cache stats
      performanceCache.clearAll();
      await performanceCache.warmUp();

      // Generate test data with some repetition to test cache hits
      const uniqueBarcodes = Math.floor(requests * (100 - targetHitRate) / 100);
      const testBarcodes = generateTestBarcodes('60', uniqueBarcodes).barcodes.map(b => b.barcode);
      
      // Create request pattern with repetition
      const requestPattern = [];
      for (let i = 0; i < requests; i++) {
        const barcodeIndex = Math.floor(Math.random() * testBarcodes.length);
        requestPattern.push(testBarcodes[barcodeIndex]);
      }

      console.log('🚀 Running cache test...');
      const startTime = Date.now();

      await processBarcodesBulkOptimized(requestPattern, { maxConcurrency: 20 });

      const totalTime = Date.now() - startTime;
      const cacheStats = performanceCache.getStats();

      console.log('');
      console.log('📊 Cache Performance Results:');
      console.log(`   • Total time: ${totalTime}ms`);
      console.log(`   • Average per request: ${(totalTime / requests).toFixed(2)}ms`);
      console.log(`   • Cache hit rate: ${cacheStats.global.hitRate}`);
      console.log(`   • Total cache requests: ${cacheStats.global.totalRequests}`);
      console.log(`   • Cache hits: ${cacheStats.global.cacheHits}`);
      console.log(`   • Cache misses: ${cacheStats.global.cacheMisses}`);

      const actualHitRate = parseFloat(cacheStats.global.hitRate);
      const passed = actualHitRate >= targetHitRate;

      console.log('');
      console.log(passed ? '✅ Cache performance test PASSED' : '❌ Cache performance test FAILED');
      
      process.exit(passed ? 0 : 1);

    } catch (error) {
      console.error('❌ Cache test failed:', error.message);
      process.exit(1);
    }
  });

function analyzeResults(stationResults, totalTime, targetResponseTime) {
  const successfulStations = stationResults.filter(r => r.passed);
  const totalBarcodes = stationResults.reduce((sum, r) => sum + (r.successCount || 0), 0);
  const totalErrors = stationResults.reduce((sum, r) => sum + (r.errorCount || 0), 0);
  
  const responseTimes = stationResults
    .filter(r => r.avgTimePerBarcode)
    .map(r => r.avgTimePerBarcode);
  
  const avgResponseTime = responseTimes.length > 0 ? 
    Math.round(responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length) : 0;
  
  const maxResponseTime = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;
  const minResponseTime = responseTimes.length > 0 ? Math.min(...responseTimes) : 0;

  const throughput = Math.round((totalBarcodes / totalTime) * 1000); // barcodes per second
  const overallPassed = successfulStations.length === stationResults.length && 
                       avgResponseTime <= targetResponseTime;

  return {
    overallPassed,
    totalTime,
    totalBarcodes,
    totalErrors,
    successfulStations: successfulStations.length,
    totalStations: stationResults.length,
    avgResponseTime,
    maxResponseTime,
    minResponseTime,
    throughput,
    errorRate: totalBarcodes > 0 ? (totalErrors / (totalBarcodes + totalErrors) * 100).toFixed(2) + '%' : '0%',
    performance: {
      requirement: `${targetResponseTime}ms per barcode`,
      actual: `${avgResponseTime}ms average`,
      status: avgResponseTime <= targetResponseTime ? 'PASSED' : 'FAILED',
      margin: targetResponseTime - avgResponseTime
    }
  };
}

function printResults(stationResults, analysis, performanceStats) {
  console.log('');
  console.log('📈 Load Test Results');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Overall results
  console.log(`🎯 Overall Performance: ${analysis.overallPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   • Total time: ${analysis.totalTime}ms`);
  console.log(`   • Total barcodes processed: ${analysis.totalBarcodes}`);
  console.log(`   • Average response time: ${analysis.avgResponseTime}ms (target: ${analysis.performance.requirement})`);
  console.log(`   • Max response time: ${analysis.maxResponseTime}ms`);
  console.log(`   • Min response time: ${analysis.minResponseTime}ms`);
  console.log(`   • Throughput: ${analysis.throughput} barcodes/second`);
  console.log(`   • Error rate: ${analysis.errorRate}`);
  console.log(`   • Successful stations: ${analysis.successfulStations}/${analysis.totalStations}`);
  console.log('');

  // Station-by-station results
  console.log('📋 Station Performance:');
  stationResults.forEach(station => {
    const status = station.passed ? '✅' : '❌';
    const responseTime = station.avgTimePerBarcode || 'ERROR';
    console.log(`   ${status} Station ${station.stationId} (${station.panelType}-cell): ${responseTime}ms avg, ${station.successRate || 'N/A'} success`);
  });
  console.log('');

  // Cache performance
  const cacheStats = performanceStats.cache.global;
  console.log('🧰 Cache Performance:');
  console.log(`   • Hit rate: ${cacheStats.hitRate}`);
  console.log(`   • Status: ${cacheStats.performance}`);
  console.log(`   • Total requests: ${cacheStats.totalRequests}`);
  console.log('');

  // Recommendations
  if (!analysis.overallPassed) {
    console.log('💡 Recommendations:');
    if (analysis.avgResponseTime > 2000) {
      console.log('   • Response time exceeds 2s requirement - consider optimizing barcode processing');
    }
    if (parseFloat(cacheStats.hitRate) < 70) {
      console.log('   • Cache hit rate is low - consider preloading more data');
    }
    if (analysis.errorRate !== '0%') {
      console.log('   • Error rate is elevated - investigate error patterns');
    }
    console.log('');
  }

  console.log(analysis.overallPassed ? 
    '🎉 Load test completed successfully! System meets performance requirements.' :
    '⚠️  Load test failed. System does not meet performance requirements.');
}

// Help command
program
  .command('help')
  .description('Show usage examples')
  .action(() => {
    console.log('Load Testing Examples:');
    console.log('');
    console.log('1. Basic load test (8 stations, 20 barcodes each):');
    console.log('   node loadTest.js run');
    console.log('');
    console.log('2. Stress test (16 stations, 50 barcodes each):');
    console.log('   node loadTest.js run --stations 16 --barcodes 50');
    console.log('');
    console.log('3. Quick performance check with cache warmup:');
    console.log('   node loadTest.js run --stations 4 --barcodes 10 --warmup');
    console.log('');
    console.log('4. Benchmark processing operation:');
    console.log('   node loadTest.js benchmark --operation process --count 1000');
    console.log('');
    console.log('5. Test cache performance:');
    console.log('   node loadTest.js cache --requests 5000 --hit-rate 85');
    console.log('');
  });

program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
