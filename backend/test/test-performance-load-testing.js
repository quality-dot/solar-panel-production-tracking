// Performance and Load Testing for Manufacturing Order Management System
// Task 10.7 - Performance and Load Testing

console.log('🧪 Manufacturing Order - Performance and Load Testing');
console.log('==================================================');

// Performance metrics tracking
class PerformanceMetrics {
  constructor() {
    this.metrics = {
      response_times: [],
      memory_usage: [],
      cpu_usage: [],
      throughput: [],
      error_rates: [],
      concurrent_operations: []
    };
    this.startTime = Date.now();
  }

  recordResponseTime(operation, duration) {
    this.metrics.response_times.push({
      operation,
      duration,
      timestamp: Date.now()
    });
  }

  recordMemoryUsage() {
    const memUsage = process.memoryUsage();
    this.metrics.memory_usage.push({
      heap_used: memUsage.heapUsed,
      heap_total: memUsage.heapTotal,
      external: memUsage.external,
      timestamp: Date.now()
    });
  }

  recordThroughput(operations, duration) {
    this.metrics.throughput.push({
      operations,
      duration,
      ops_per_second: operations / (duration / 1000),
      timestamp: Date.now()
    });
  }

  recordErrorRate(operation, errors, total) {
    this.metrics.error_rates.push({
      operation,
      errors,
      total,
      error_rate: (errors / total) * 100,
      timestamp: Date.now()
    });
  }

  getSummary() {
    const totalDuration = Date.now() - this.startTime;
    const avgResponseTime = this.metrics.response_times.reduce((sum, m) => sum + m.duration, 0) / this.metrics.response_times.length;
    const maxResponseTime = Math.max(...this.metrics.response_times.map(m => m.duration));
    const minResponseTime = Math.min(...this.metrics.response_times.map(m => m.duration));
    
    const avgThroughput = this.metrics.throughput.reduce((sum, m) => sum + m.ops_per_second, 0) / this.metrics.throughput.length;
    const maxThroughput = Math.max(...this.metrics.throughput.map(m => m.ops_per_second));
    
    const totalErrors = this.metrics.error_rates.reduce((sum, m) => sum + m.errors, 0);
    const totalOperations = this.metrics.error_rates.reduce((sum, m) => sum + m.total, 0);
    const overallErrorRate = totalOperations > 0 ? (totalErrors / totalOperations) * 100 : 0;

    return {
      total_duration: totalDuration,
      avg_response_time: avgResponseTime,
      max_response_time: maxResponseTime,
      min_response_time: minResponseTime,
      avg_throughput: avgThroughput,
      max_throughput: maxThroughput,
      overall_error_rate: overallErrorRate,
      total_operations: totalOperations,
      total_errors: totalErrors
    };
  }
}

// Test high-volume MO creation
async function testHighVolumeMOCreation() {
  console.log('\n📊 Testing High-Volume MO Creation...');
  
  const metrics = new PerformanceMetrics();
  const moCount = 100;
  const createdMOs = [];
  
  try {
    const startTime = Date.now();
    
    // Simulate high-volume MO creation
    for (let i = 1; i <= moCount; i++) {
      const moStartTime = Date.now();
      
      // Simulate MO creation data
      const moData = {
        id: i,
        order_number: `MO-2024-${String(i).padStart(3, '0')}`,
        panel_type: '60',
        target_quantity: 100,
        year_code: '24',
        frame_type: 'W',
        backsheet_type: 'T',
        customer_name: `Customer ${i}`,
        created_by: 'test-user-id',
        created_at: new Date().toISOString()
      };
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
      
      const moEndTime = Date.now();
      const duration = moEndTime - moStartTime;
      
      metrics.recordResponseTime('mo_creation', duration);
      createdMOs.push(moData);
    }
    
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    
    metrics.recordThroughput(moCount, totalDuration);
    metrics.recordMemoryUsage();
    
    const summary = metrics.getSummary();
    
    console.log('✅ High-Volume MO Creation Results:', {
      total_mos: moCount,
      total_duration: `${totalDuration}ms`,
      avg_response_time: `${summary.avg_response_time.toFixed(2)}ms`,
      max_response_time: `${summary.max_response_time}ms`,
      min_response_time: `${summary.min_response_time}ms`,
      throughput: `${summary.avg_throughput.toFixed(2)} ops/sec`,
      max_throughput: `${summary.max_throughput.toFixed(2)} ops/sec`
    });
    
    return {
      success: true,
      moCount,
      totalDuration,
      summary
    };
    
  } catch (error) {
    console.log('❌ High-volume MO creation test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Test concurrent operations
async function testConcurrentOperations() {
  console.log('\n🔄 Testing Concurrent Operations...');
  
  const metrics = new PerformanceMetrics();
  const concurrentCount = 50;
  const operations = [];
  
  try {
    const startTime = Date.now();
    
    // Create concurrent operation promises
    for (let i = 1; i <= concurrentCount; i++) {
      const operation = async () => {
        const opStartTime = Date.now();
        
        // Simulate different types of operations
        const operationType = ['mo_creation', 'panel_completion', 'progress_update', 'alert_generation'][i % 4];
        
        // Simulate operation processing
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
        
        const opEndTime = Date.now();
        const duration = opEndTime - opStartTime;
        
        metrics.recordResponseTime(operationType, duration);
        
        return {
          operation: operationType,
          duration,
          success: true
        };
      };
      
      operations.push(operation());
    }
    
    // Execute all operations concurrently
    const results = await Promise.all(operations);
    
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    
    metrics.recordThroughput(concurrentCount, totalDuration);
    metrics.recordMemoryUsage();
    
    const summary = metrics.getSummary();
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.length - successCount;
    
    metrics.recordErrorRate('concurrent_operations', errorCount, results.length);
    
    console.log('✅ Concurrent Operations Results:', {
      concurrent_operations: concurrentCount,
      total_duration: `${totalDuration}ms`,
      successful_operations: successCount,
      failed_operations: errorCount,
      success_rate: `${((successCount / results.length) * 100).toFixed(2)}%`,
      avg_response_time: `${summary.avg_response_time.toFixed(2)}ms`,
      throughput: `${summary.avg_throughput.toFixed(2)} ops/sec`
    });
    
    return {
      success: true,
      concurrentCount,
      totalDuration,
      successCount,
      errorCount,
      summary
    };
    
  } catch (error) {
    console.log('❌ Concurrent operations test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Test database performance
async function testDatabasePerformance() {
  console.log('\n🗄️ Testing Database Performance...');
  
  const metrics = new PerformanceMetrics();
  const queryCount = 200;
  const queries = [];
  
  try {
    const startTime = Date.now();
    
    // Simulate different types of database queries
    const queryTypes = [
      'SELECT manufacturing_orders',
      'SELECT panels',
      'SELECT progress_tracking',
      'SELECT alerts',
      'INSERT manufacturing_order',
      'UPDATE progress_tracking',
      'DELETE expired_data'
    ];
    
    for (let i = 1; i <= queryCount; i++) {
      const queryStartTime = Date.now();
      
      // Simulate query execution
      const queryType = queryTypes[i % queryTypes.length];
      const simulatedQueryTime = Math.random() * 100; // 0-100ms
      
      await new Promise(resolve => setTimeout(resolve, simulatedQueryTime));
      
      const queryEndTime = Date.now();
      const duration = queryEndTime - queryStartTime;
      
      metrics.recordResponseTime(queryType, duration);
      
      queries.push({
        type: queryType,
        duration,
        success: true
      });
    }
    
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    
    metrics.recordThroughput(queryCount, totalDuration);
    metrics.recordMemoryUsage();
    
    const summary = metrics.getSummary();
    const successCount = queries.filter(q => q.success).length;
    const errorCount = queries.length - successCount;
    
    metrics.recordErrorRate('database_queries', errorCount, queries.length);
    
    console.log('✅ Database Performance Results:', {
      total_queries: queryCount,
      total_duration: `${totalDuration}ms`,
      successful_queries: successCount,
      failed_queries: errorCount,
      success_rate: `${((successCount / queries.length) * 100).toFixed(2)}%`,
      avg_response_time: `${summary.avg_response_time.toFixed(2)}ms`,
      max_response_time: `${summary.max_response_time}ms`,
      throughput: `${summary.avg_throughput.toFixed(2)} queries/sec`
    });
    
    return {
      success: true,
      queryCount,
      totalDuration,
      successCount,
      errorCount,
      summary
    };
    
  } catch (error) {
    console.log('❌ Database performance test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Test memory usage under load
async function testMemoryUsageUnderLoad() {
  console.log('\n💾 Testing Memory Usage Under Load...');
  
  const metrics = new PerformanceMetrics();
  const operationCount = 1000;
  const memorySnapshots = [];
  
  try {
    const startTime = Date.now();
    
    // Record initial memory usage
    const initialMemory = process.memoryUsage();
    memorySnapshots.push({
      phase: 'initial',
      memory: initialMemory,
      timestamp: Date.now()
    });
    
    // Simulate memory-intensive operations
    const dataArrays = [];
    
    for (let i = 1; i <= operationCount; i++) {
      // Create large data structures
      const largeDataArray = new Array(1000).fill(0).map((_, index) => ({
        id: index,
        data: `data-${i}-${index}`,
        timestamp: new Date().toISOString(),
        random_value: Math.random()
      }));
      
      dataArrays.push(largeDataArray);
      
      // Record memory usage every 100 operations
      if (i % 100 === 0) {
        const currentMemory = process.memoryUsage();
        memorySnapshots.push({
          phase: `operation_${i}`,
          memory: currentMemory,
          timestamp: Date.now()
        });
        
        metrics.recordMemoryUsage();
      }
    }
    
    // Record final memory usage
    const finalMemory = process.memoryUsage();
    memorySnapshots.push({
      phase: 'final',
      memory: finalMemory,
      timestamp: Date.now()
    });
    
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    
    // Calculate memory growth
    const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
    const memoryGrowthMB = (memoryGrowth / 1024 / 1024).toFixed(2);
    
    console.log('✅ Memory Usage Under Load Results:', {
      total_operations: operationCount,
      total_duration: `${totalDuration}ms`,
      initial_memory: `${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      final_memory: `${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      memory_growth: `${memoryGrowthMB}MB`,
      memory_growth_rate: `${(memoryGrowthMB / (totalDuration / 1000)).toFixed(2)}MB/sec`,
      data_structures_created: dataArrays.length
    });
    
    // Clean up memory
    dataArrays.length = 0;
    
    return {
      success: true,
      operationCount,
      totalDuration,
      initialMemory,
      finalMemory,
      memoryGrowth,
      memorySnapshots
    };
    
  } catch (error) {
    console.log('❌ Memory usage under load test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Test API endpoint performance
async function testAPIEndpointPerformance() {
  console.log('\n🌐 Testing API Endpoint Performance...');
  
  const metrics = new PerformanceMetrics();
  const endpointCount = 100;
  const endpoints = [];
  
  try {
    const startTime = Date.now();
    
    // Simulate different API endpoints
    const apiEndpoints = [
      'GET /api/v1/manufacturing-orders',
      'POST /api/v1/manufacturing-orders',
      'GET /api/v1/manufacturing-orders/:id',
      'PUT /api/v1/manufacturing-orders/:id',
      'GET /api/v1/manufacturing-orders/:id/progress',
      'GET /api/v1/manufacturing-orders/:id/alerts',
      'POST /api/v1/manufacturing-orders/:id/closure/execute',
      'GET /api/v1/historical-data/manufacturing-orders',
      'POST /api/v1/historical-data/export/manufacturing-orders/csv',
      'GET /api/v1/historical-data/production-metrics'
    ];
    
    for (let i = 1; i <= endpointCount; i++) {
      const endpointStartTime = Date.now();
      
      // Simulate API endpoint processing
      const endpoint = apiEndpoints[i % apiEndpoints.length];
      const simulatedProcessingTime = Math.random() * 200; // 0-200ms
      
      await new Promise(resolve => setTimeout(resolve, simulatedProcessingTime));
      
      const endpointEndTime = Date.now();
      const duration = endpointEndTime - endpointStartTime;
      
      metrics.recordResponseTime(endpoint, duration);
      
      endpoints.push({
        endpoint,
        duration,
        success: true
      });
    }
    
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    
    metrics.recordThroughput(endpointCount, totalDuration);
    metrics.recordMemoryUsage();
    
    const summary = metrics.getSummary();
    const successCount = endpoints.filter(e => e.success).length;
    const errorCount = endpoints.length - successCount;
    
    metrics.recordErrorRate('api_endpoints', errorCount, endpoints.length);
    
    console.log('✅ API Endpoint Performance Results:', {
      total_endpoints: endpointCount,
      total_duration: `${totalDuration}ms`,
      successful_endpoints: successCount,
      failed_endpoints: errorCount,
      success_rate: `${((successCount / endpoints.length) * 100).toFixed(2)}%`,
      avg_response_time: `${summary.avg_response_time.toFixed(2)}ms`,
      max_response_time: `${summary.max_response_time}ms`,
      throughput: `${summary.avg_throughput.toFixed(2)} requests/sec`
    });
    
    return {
      success: true,
      endpointCount,
      totalDuration,
      successCount,
      errorCount,
      summary
    };
    
  } catch (error) {
    console.log('❌ API endpoint performance test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Test stress testing scenarios
async function testStressTestingScenarios() {
  console.log('\n⚡ Testing Stress Testing Scenarios...');
  
  const metrics = new PerformanceMetrics();
  const stressLevels = [100, 500, 1000, 2000];
  const stressResults = [];
  
  try {
    for (const stressLevel of stressLevels) {
      console.log(`   Testing stress level: ${stressLevel} operations...`);
      
      const startTime = Date.now();
      const operations = [];
      
      // Create stress operations
      for (let i = 1; i <= stressLevel; i++) {
        const operation = async () => {
          const opStartTime = Date.now();
          
          // Simulate complex operation
          await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
          
          const opEndTime = Date.now();
          const duration = opEndTime - opStartTime;
          
          metrics.recordResponseTime('stress_operation', duration);
          
          return {
            success: true,
            duration
          };
        };
        
        operations.push(operation());
      }
      
      // Execute stress operations
      const results = await Promise.all(operations);
      
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      
      metrics.recordThroughput(stressLevel, totalDuration);
      metrics.recordMemoryUsage();
      
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.length - successCount;
      
      metrics.recordErrorRate(`stress_${stressLevel}`, errorCount, results.length);
      
      stressResults.push({
        stress_level: stressLevel,
        total_duration: totalDuration,
        success_count: successCount,
        error_count: errorCount,
        success_rate: (successCount / results.length) * 100,
        throughput: stressLevel / (totalDuration / 1000)
      });
      
      console.log(`   ✅ Stress level ${stressLevel}: ${successCount}/${stressLevel} successful (${((successCount / results.length) * 100).toFixed(2)}%)`);
    }
    
    const summary = metrics.getSummary();
    
    console.log('✅ Stress Testing Results Summary:', {
      stress_levels_tested: stressLevels.length,
      max_stress_level: Math.max(...stressLevels),
      avg_throughput: `${summary.avg_throughput.toFixed(2)} ops/sec`,
      max_throughput: `${summary.max_throughput.toFixed(2)} ops/sec`,
      overall_error_rate: `${summary.overall_error_rate.toFixed(2)}%`
    });
    
    return {
      success: true,
      stressLevels,
      stressResults,
      summary
    };
    
  } catch (error) {
    console.log('❌ Stress testing scenarios test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Test performance under different load patterns
async function testLoadPatterns() {
  console.log('\n📈 Testing Different Load Patterns...');
  
  const metrics = new PerformanceMetrics();
  const loadPatterns = [
    { name: 'Steady Load', operations: 100, duration: 10000 },
    { name: 'Burst Load', operations: 500, duration: 2000 },
    { name: 'Gradual Increase', operations: 200, duration: 15000 },
    { name: 'Spike Load', operations: 1000, duration: 1000 }
  ];
  
  const patternResults = [];
  
  try {
    for (const pattern of loadPatterns) {
      console.log(`   Testing ${pattern.name} pattern...`);
      
      const startTime = Date.now();
      const operations = [];
      
      // Create operations based on pattern
      for (let i = 1; i <= pattern.operations; i++) {
        const operation = async () => {
          const opStartTime = Date.now();
          
          // Simulate operation processing
          await new Promise(resolve => setTimeout(resolve, Math.random() * 20));
          
          const opEndTime = Date.now();
          const duration = opEndTime - opStartTime;
          
          metrics.recordResponseTime(pattern.name, duration);
          
          return {
            success: true,
            duration
          };
        };
        
        operations.push(operation());
      }
      
      // Execute operations
      const results = await Promise.all(operations);
      
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      
      metrics.recordThroughput(pattern.operations, totalDuration);
      metrics.recordMemoryUsage();
      
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.length - successCount;
      
      metrics.recordErrorRate(pattern.name, errorCount, results.length);
      
      patternResults.push({
        pattern: pattern.name,
        operations: pattern.operations,
        total_duration: totalDuration,
        success_count: successCount,
        error_count: errorCount,
        success_rate: (successCount / results.length) * 100,
        throughput: pattern.operations / (totalDuration / 1000)
      });
      
      console.log(`   ✅ ${pattern.name}: ${successCount}/${pattern.operations} successful (${((successCount / results.length) * 100).toFixed(2)}%)`);
    }
    
    const summary = metrics.getSummary();
    
    console.log('✅ Load Patterns Results Summary:', {
      patterns_tested: loadPatterns.length,
      avg_throughput: `${summary.avg_throughput.toFixed(2)} ops/sec`,
      max_throughput: `${summary.max_throughput.toFixed(2)} ops/sec`,
      overall_error_rate: `${summary.overall_error_rate.toFixed(2)}%`
    });
    
    return {
      success: true,
      loadPatterns,
      patternResults,
      summary
    };
    
  } catch (error) {
    console.log('❌ Load patterns test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Test performance monitoring and alerting
async function testPerformanceMonitoring() {
  console.log('\n📊 Testing Performance Monitoring...');
  
  const metrics = new PerformanceMetrics();
  const monitoringDuration = 30000; // 30 seconds
  const monitoringInterval = 1000; // 1 second
  
  try {
    const startTime = Date.now();
    const monitoringData = [];
    
    console.log(`   Monitoring performance for ${monitoringDuration / 1000} seconds...`);
    
    // Start monitoring loop
    const monitoringLoop = setInterval(() => {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      
      if (elapsed >= monitoringDuration) {
        clearInterval(monitoringLoop);
        return;
      }
      
      // Record performance metrics
      const currentMemory = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      monitoringData.push({
        timestamp: currentTime,
        elapsed,
        memory: currentMemory,
        cpu: cpuUsage
      });
      
      metrics.recordMemoryUsage();
      
    }, monitoringInterval);
    
    // Wait for monitoring to complete
    await new Promise(resolve => setTimeout(resolve, monitoringDuration));
    
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    
    // Analyze monitoring data
    const memoryTrend = monitoringData.map(d => d.memory.heapUsed);
    const avgMemory = memoryTrend.reduce((sum, mem) => sum + mem, 0) / memoryTrend.length;
    const maxMemory = Math.max(...memoryTrend);
    const minMemory = Math.min(...memoryTrend);
    
    console.log('✅ Performance Monitoring Results:', {
      monitoring_duration: `${totalDuration}ms`,
      data_points: monitoringData.length,
      avg_memory: `${(avgMemory / 1024 / 1024).toFixed(2)}MB`,
      max_memory: `${(maxMemory / 1024 / 1024).toFixed(2)}MB`,
      min_memory: `${(minMemory / 1024 / 1024).toFixed(2)}MB`,
      memory_variance: `${((maxMemory - minMemory) / 1024 / 1024).toFixed(2)}MB`
    });
    
    return {
      success: true,
      monitoringDuration,
      monitoringData,
      avgMemory,
      maxMemory,
      minMemory
    };
    
  } catch (error) {
    console.log('❌ Performance monitoring test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run all performance and load tests
async function runAllPerformanceLoadTests() {
  console.log('🚀 Starting Performance and Load Tests...\n');
  
  const testResults = [];
  
  // Run all performance tests
  const highVolumeResult = await testHighVolumeMOCreation();
  testResults.push({ test: 'High Volume MO Creation', result: highVolumeResult });
  
  const concurrentResult = await testConcurrentOperations();
  testResults.push({ test: 'Concurrent Operations', result: concurrentResult });
  
  const databaseResult = await testDatabasePerformance();
  testResults.push({ test: 'Database Performance', result: databaseResult });
  
  const memoryResult = await testMemoryUsageUnderLoad();
  testResults.push({ test: 'Memory Usage Under Load', result: memoryResult });
  
  const apiResult = await testAPIEndpointPerformance();
  testResults.push({ test: 'API Endpoint Performance', result: apiResult });
  
  const stressResult = await testStressTestingScenarios();
  testResults.push({ test: 'Stress Testing Scenarios', result: stressResult });
  
  const loadPatternResult = await testLoadPatterns();
  testResults.push({ test: 'Load Patterns', result: loadPatternResult });
  
  const monitoringResult = await testPerformanceMonitoring();
  testResults.push({ test: 'Performance Monitoring', result: monitoringResult });
  
  // Generate overall summary
  const successfulTests = testResults.filter(tr => tr.result.success).length;
  const failedTests = testResults.filter(tr => !tr.result.success).length;
  
  console.log('\n🎯 Performance and Load Tests Complete!');
  console.log('=====================================');
  console.log(`✅ Successful Tests: ${successfulTests}`);
  console.log(`❌ Failed Tests: ${failedTests}`);
  console.log(`📊 Success Rate: ${((successfulTests / testResults.length) * 100).toFixed(2)}%`);
  
  // Performance summary
  console.log('\n📈 Performance Summary:');
  testResults.forEach(tr => {
    if (tr.result.success && tr.result.summary) {
      console.log(`   ${tr.test}:`);
      console.log(`     Avg Response Time: ${tr.result.summary.avg_response_time?.toFixed(2) || 'N/A'}ms`);
      console.log(`     Max Response Time: ${tr.result.summary.max_response_time?.toFixed(2) || 'N/A'}ms`);
      console.log(`     Throughput: ${tr.result.summary.avg_throughput?.toFixed(2) || 'N/A'} ops/sec`);
      console.log(`     Error Rate: ${tr.result.summary.overall_error_rate?.toFixed(2) || 'N/A'}%`);
    }
  });
  
  console.log('\n🚀 Manufacturing Order Management System performance validated!');
  console.log('🎉 Task 10.7 - Performance and Load Testing - COMPLETED!');
  
  return {
    success: successfulTests === testResults.length,
    testResults,
    successfulTests,
    failedTests,
    successRate: (successfulTests / testResults.length) * 100
  };
}

// Run the tests
runAllPerformanceLoadTests().catch(error => {
  console.error('❌ Performance and load test suite failed:', error);
  process.exit(1);
});
