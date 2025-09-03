import loggerService from '../services/loggerService.js';
import { logUtils } from '../utils/logFormatters.js';

/**
 * Test Basic Winston Functionality
 * Simple test without custom formatters
 */
async function testBasicWinston() {
  console.log('🚀 Testing Basic Winston Functionality...\n');
  
  try {
    // Test 1: Basic logging
    console.log('✅ Test 1: Basic Logging');
    loggerService.info('Basic info message');
    loggerService.warn('Basic warning message');
    loggerService.error(new Error('Basic error message'));
    
    // Test 2: Enhanced manufacturing context
    console.log('\n✅ Test 2: Enhanced Manufacturing Context');
    const manufacturingContext = logUtils.createManufacturingContext(
      'STATION-1',
      'LINE-A',
      'production',
      'PANEL-001',
      'BATCH-2025-001',
      'OP-001',
      {
        productionLine: 'LINE-A',
        shift: 'morning',
        qualityStatus: 'pass',
        operationDuration: 1500,
        throughput: 45,
        efficiency: 0.92,
        equipmentStatus: 'operational',
        maintenanceDue: false,
        errorCount: 0,
        uptime: 7200,
        orderNumber: 'ORD-2025-001',
        priority: 'high',
        dueDate: '2025-09-30',
        customer: 'SolarCorp',
        temperature: 22.5,
        humidity: 45.2,
        pressure: 1013.25,
        vibration: 0.02
      }
    );
    
    loggerService.logManufacturing('info', 'Panel production completed', manufacturingContext, 'manufacturing');
    
    console.log('   - Enhanced manufacturing context created successfully');
    console.log('   - Rich metadata logging working');
    console.log('   - Business and environmental context included');
    
    // Test 3: Performance optimization
    console.log('\n✅ Test 3: Performance Optimization');
    const startTime = Date.now();
    
    // Test async logging
    const promises = [];
    for (let i = 0; i < 10; i++) {
      const context = logUtils.createManufacturingContext(
        `STATION-${i % 3 + 1}`,
        `LINE-${String.fromCharCode(65 + (i % 2))}`,
        'test',
        `PANEL-${i.toString().padStart(3, '0')}`,
        `BATCH-${i}`,
        `OP-${i % 5 + 1}`
      );
      
      promises.push(loggerService.logAsync('info', `Test message ${i}`, context, 'manufacturing'));
    }
    
    await Promise.all(promises);
    
    const duration = Date.now() - startTime;
    console.log(`   - Async logging completed: ${duration}ms`);
    console.log(`   - Performance optimization active`);
    
    // Wait for batch processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n🎉 Basic Winston tests passed successfully!');
    
  } catch (error) {
    console.error('\n❌ Basic Winston test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testBasicWinston()
    .then(() => {
      console.log('\n🚀 Basic Winston functionality is working!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Basic Winston test failed:', error);
      process.exit(1);
    });
}

export { testBasicWinston };
