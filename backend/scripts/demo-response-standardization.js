#!/usr/bin/env node

/**
 * Response Standardization System Demonstration Script
 * 
 * This script demonstrates all the enhanced response standardization features
 * including manufacturing-specific responses, real-time updates, offline sync,
 * and various specialized response types.
 */

import {
  successResponse,
  errorResponse,
  manufacturingResponse,
  validationErrorResponse,
  paginatedResponse,
  realTimeUpdateResponse,
  offlineSyncResponse,
  moProgressResponse,
  qualityInspectionResponse,
  stationWorkflowResponse,
  barcodeProcessingResponse,
  systemHealthResponse,
  batchOperationResponse,
  enhancedManufacturingResponse,
  rateLimitedResponse
} from '../utils/responseUtils.js';

// Utility function to display responses in a formatted way
const displayResponse = (title, response) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📋 ${title}`);
  console.log(`${'='.repeat(60)}`);
  console.log(JSON.stringify(response, null, 2));
  console.log(`${'='.repeat(60)}`);
};

// Utility function to simulate manufacturing operations
const simulateManufacturingOperation = () => {
  const startTime = Date.now();
  
  // Simulate processing time
  const processingTime = Math.floor(Math.random() * 100) + 50;
  
  return {
    duration: processingTime,
    qualityScore: Math.floor(Math.random() * 20) + 80,
    efficiency: Math.floor(Math.random() * 15) + 85
  };
};

// Main demonstration function
const demonstrateResponseStandardization = () => {
  console.log('🏭 Response Standardization System Demonstration');
  console.log('Demonstrating enhanced manufacturing API responses\n');

  // 1. Basic Response Functions
  console.log('🔧 Basic Response Functions');
  
  displayResponse('Basic Success Response', 
    successResponse({ message: 'Hello World' })
  );
  
  displayResponse('Success Response with Metadata', 
    successResponse(
      { panelId: 'CRS24F1236', status: 'active' },
      'Panel status retrieved',
      { version: '1.0.0', environment: 'development' }
    )
  );
  
  displayResponse('Error Response', 
    errorResponse('Panel not found', 404, { 
      requestedId: 'CRS24F9999',
      suggestion: 'Check barcode format' 
    })
  );

  // 2. Manufacturing-Specific Responses
  console.log('\n🏭 Manufacturing-Specific Responses');
  
  displayResponse('Manufacturing Response with Station Context', 
    manufacturingResponse(
      { panelId: 'CRS24F1236', status: 'processing' },
      'STATION_1',
      'LINE_1'
    )
  );
  
  displayResponse('Real-time Update Response', 
    realTimeUpdateResponse(
      { status: 'quality_check_passed', timestamp: new Date().toISOString() },
      'status_change',
      'STATION_2',
      { previousStatus: 'processing', changeReason: 'quality_verification' }
    )
  );
  
  displayResponse('Offline Sync Response', 
    offlineSyncResponse(
      { syncedItems: 25, failedItems: 2 },
      'upload',
      3,
      { lastSyncAttempt: new Date().toISOString(), retryCount: 1 }
    )
  );
  
  displayResponse('Manufacturing Order Progress Response', 
    moProgressResponse(
      { moId: 'MO_001', currentStep: 'FRAMING', completedSteps: 2 },
      'MO_001',
      'IN_PROGRESS',
      75,
      { 
        estimatedCompletion: new Date(Date.now() + 86400000).toISOString(),
        nextStep: 'JUNCTION_BOX',
        remainingSteps: 1
      }
    )
  );
  
  displayResponse('Quality Inspection Response', 
    qualityInspectionResponse(
      { 
        inspectionId: 'INS_001', 
        criteria: ['voltage', 'current', 'efficiency'],
        measurements: { voltage: 24.1, current: 5.2, efficiency: 18.9 }
      },
      'PANEL_001',
      'STATION_3',
      'PASS',
      { 
        qualityScore: 95.5,
        criteria: ['voltage: 95%', 'current: 96%', 'efficiency: 94%'],
        inspector: 'OP_001',
        inspectionTime: new Date().toISOString()
      }
    )
  );
  
  displayResponse('Station Workflow Response', 
    stationWorkflowResponse(
      { stepId: 'STEP_001', duration: 120, operator: 'OP_001' },
      'STATION_1',
      'ASSEMBLY_EL',
      'FRAMING',
      { 
        workflowProgress: 25,
        estimatedDuration: 300,
        qualityCheck: 'passed',
        nextOperator: 'OP_002'
      }
    )
  );
  
  displayResponse('Barcode Processing Response', 
    barcodeProcessingResponse(
      { barcode: 'CRS24F1236', lineNumber: 1, validationStatus: 'valid' },
      'CRS24F1236',
      1,
      { 
        processingTime: 45,
        validationResults: ['format_valid', 'checksum_valid', 'line_assigned'],
        assignedStation: 'STATION_1',
        estimatedProcessingTime: 120
      }
    )
  );
  
  displayResponse('System Health Response', 
    systemHealthResponse(
      { 
        uptime: 86400, 
        version: '1.0.0',
        memoryUsage: '65%',
        cpuUsage: '45%'
      },
      'healthy',
      { 
        database: 'healthy',
        api: 'healthy',
        cache: 'degraded',
        fileSystem: 'healthy'
      },
      { 
        uptime: 86400,
        lastMaintenance: new Date(Date.now() - 604800000).toISOString(),
        nextMaintenance: new Date(Date.now() + 259200000).toISOString()
      }
    )
  );
  
  displayResponse('Batch Operation Response', 
    batchOperationResponse(
      { operationId: 'BATCH_001', operationType: 'bulk_import' },
      'bulk_import',
      100,
      95,
      5,
      { 
        failures: [
          { item: 'PANEL_001', reason: 'Invalid barcode format', barcode: 'INVALID123' },
          { item: 'PANEL_002', reason: 'Duplicate entry', existingId: 'CRS24F1236' },
          { item: 'PANEL_003', reason: 'Invalid panel type', panelType: '999' },
          { item: 'PANEL_004', reason: 'Missing required fields', missingFields: ['lineNumber'] },
          { item: 'PANEL_005', reason: 'Database connection timeout', retryCount: 3 }
        ],
        operationDuration: 45,
        averageProcessingTime: 0.45
      }
    )
  );
  
  displayResponse('Enhanced Manufacturing Response', 
    enhancedManufacturingResponse(
      { 
        panelId: 'PANEL_001', 
        status: 'completed',
        completionTime: new Date().toISOString()
      },
      { 
        version: '1.0.0', 
        environment: 'production',
        buildNumber: '2024.01.15.001'
      },
      {
        station: 'STATION_1',
        line: 'LINE_1',
        shift: 'DAY',
        operator: 'OP_001',
        supervisor: 'SUP_001',
        performance: {
          processingTime: 120,
          throughput: 30,
          efficiency: 95.5,
          qualityScore: 98.2,
          energyConsumption: 2.4
        },
        materials: {
          solarCells: 72,
          frameType: 'aluminum',
          backsheetType: 'white',
          junctionBox: 'standard'
        }
      }
    )
  );
  
  displayResponse('Rate Limited Response', 
    rateLimitedResponse(
      { message: 'Request processed successfully', data: { panelId: 'CRS24F1236' } },
      {
        remaining: 95,
        reset: Math.floor(Date.now() / 1000) + 3600,
        limit: 100,
        window: 3600
      },
      { 
        clientId: 'CLIENT_001',
        endpoint: '/api/v1/panels',
        method: 'POST'
      }
    )
  );

  // 3. Specialized Response Types
  console.log('\n🔍 Specialized Response Types');
  
  displayResponse('Validation Error Response', 
    validationErrorResponse(
      [
        { field: 'barcode', message: 'Invalid format. Expected CRSYYFBPP#####', value: 'INVALID123' },
        { field: 'lineNumber', message: 'Must be 1 or 2', value: 3 },
        { field: 'panelType', message: 'Must be one of: 36, 40, 60, 72, 144', value: '99' },
        { field: 'framed', message: 'Must be F (Framed) or B (Unframed)', value: 'X' }
      ],
      'panel_creation'
    )
  );
  
  displayResponse('Paginated Response', 
    paginatedResponse(
      [
        { id: 1, barcode: 'CRS24F1236', status: 'active' },
        { id: 2, barcode: 'CRS24F1237', status: 'processing' },
        { id: 3, barcode: 'CRS24F1238', status: 'completed' }
      ],
      1,
      10,
      25
    )
  );

  // 4. Practical Manufacturing Scenarios
  console.log('\n🏭 Practical Manufacturing Scenarios');
  
  // Scenario 1: Panel Processing Workflow
  console.log('\n📋 Scenario 1: Panel Processing Workflow');
  
  const panelData = {
    barcode: 'CRS24F1236',
    panelType: '60',
    lineNumber: 1,
    station: 'STATION_1'
  };
  
  // Step 1: Barcode Processing
  displayResponse('Step 1: Barcode Processing', 
    barcodeProcessingResponse(
      { ...panelData, validationStatus: 'valid' },
      panelData.barcode,
      panelData.lineNumber,
      { 
        processingTime: 45,
        validationResults: ['format_valid', 'checksum_valid', 'line_assigned'],
        assignedStation: 'STATION_1'
      }
    )
  );
  
  // Step 2: Station Assignment
  displayResponse('Step 2: Station Assignment', 
    manufacturingResponse(
      { ...panelData, stationAssigned: true, assignedTime: new Date().toISOString() },
      'STATION_1',
      'LINE_1'
    )
  );
  
  // Step 3: Workflow Progression
  displayResponse('Step 3: Workflow Progression', 
    stationWorkflowResponse(
      { stepId: 'STEP_001', duration: 120, operator: 'OP_001' },
      'STATION_1',
      'ASSEMBLY_EL',
      'FRAMING',
      { 
        workflowProgress: 25,
        estimatedDuration: 300,
        qualityCheck: 'passed'
      }
    )
  );
  
  // Step 4: Quality Inspection
  displayResponse('Step 4: Quality Inspection', 
    qualityInspectionResponse(
      { 
        inspectionId: 'INS_001', 
        criteria: ['voltage', 'current', 'efficiency'],
        measurements: { voltage: 24.1, current: 5.2, efficiency: 18.9 }
      },
      'PANEL_001',
      'STATION_3',
      'PASS',
      { 
        qualityScore: 95.5,
        criteria: ['voltage: 95%', 'current: 96%', 'efficiency: 94%']
      }
    )
  );
  
  // Step 5: Final Completion
  displayResponse('Step 5: Final Completion', 
    enhancedManufacturingResponse(
      { 
        panelId: 'PANEL_001', 
        status: 'completed',
        completionTime: new Date().toISOString()
      },
      { 
        version: '1.0.0', 
        environment: 'production'
      },
      {
        station: 'STATION_1',
        line: 'LINE_1',
        shift: 'DAY',
        operator: 'OP_001',
        performance: {
          processingTime: 120,
          throughput: 30,
          efficiency: 95.5
        }
      }
    )
  );

  // Scenario 2: Manufacturing Order Progress
  console.log('\n📋 Scenario 2: Manufacturing Order Progress');
  
  const moData = {
    moId: 'MO_001',
    orderType: 'Standard Production',
    quantity: 100,
    startDate: new Date(Date.now() - 86400000).toISOString()
  };
  
  // Progress updates at different stages
  [25, 50, 75, 100].forEach(progress => {
    const currentStep = progress <= 25 ? 'ASSEMBLY_EL' : 
                       progress <= 50 ? 'FRAMING' : 
                       progress <= 75 ? 'JUNCTION_BOX' : 'PERFORMANCE_FINAL';
    
    displayResponse(`MO Progress: ${progress}% - ${currentStep}`, 
      moProgressResponse(
        { 
          ...moData, 
          currentStep,
          completedQuantity: Math.floor((progress / 100) * moData.quantity),
          remainingQuantity: moData.quantity - Math.floor((progress / 100) * moData.quantity)
        },
        'MO_001',
        progress === 100 ? 'COMPLETED' : 'IN_PROGRESS',
        progress,
        { 
          estimatedCompletion: progress === 100 ? new Date().toISOString() : 
            new Date(Date.now() + ((100 - progress) * 86400000 / 100)).toISOString(),
          nextStep: progress === 100 ? null : 
            progress <= 25 ? 'FRAMING' : 
            progress <= 50 ? 'JUNCTION_BOX' : 'PERFORMANCE_FINAL'
        }
      )
    );
  });

  // 5. Error Handling Scenarios
  console.log('\n⚠️ Error Handling Scenarios');
  
  displayResponse('Database Connection Error', 
    errorResponse(
      'Database connection failed',
      503,
      { 
        service: 'postgresql',
        retryAfter: 30,
        alternative: 'Use cached data',
        timestamp: new Date().toISOString()
      }
    )
  );
  
  displayResponse('Authentication Error', 
    errorResponse(
      'Invalid authentication token',
      401,
      { 
        required: 'JWT token',
        provided: 'None',
        suggestion: 'Include Authorization header',
        timestamp: new Date().toISOString()
      }
    )
  );
  
  displayResponse('Rate Limit Exceeded', 
    errorResponse(
      'Rate limit exceeded',
      429,
      { 
        limit: 100,
        window: 3600,
        reset: Math.floor(Date.now() / 1000) + 3600,
        suggestion: 'Reduce request frequency',
        timestamp: new Date().toISOString()
      }
    )
  );

  // 6. Performance Metrics
  console.log('\n📊 Performance Metrics');
  
  const performanceData = {
    totalRequests: 15420,
    successfulRequests: 15380,
    failedRequests: 40,
    averageResponseTime: 45,
    peakResponseTime: 120,
    requestsPerMinute: 25.7
  };
  
  displayResponse('System Performance Summary', 
    successResponse(
      performanceData,
      'Performance metrics retrieved successfully',
      {
        timeRange: 'Last 24 hours',
        dataSource: 'Application logs',
        lastUpdated: new Date().toISOString(),
        nextUpdate: new Date(Date.now() + 300000).toISOString()
      }
    )
  );

  console.log('\n🎉 Response Standardization Demonstration Complete!');
  console.log('\nKey Benefits Demonstrated:');
  console.log('✅ Consistent response structure across all endpoints');
  console.log('✅ Manufacturing-specific context and metadata');
  console.log('✅ Real-time update support with sequence tracking');
  console.log('✅ Offline sync integration for PWA functionality');
  console.log('✅ Comprehensive error handling and validation');
  console.log('✅ Performance monitoring and health checks');
  console.log('✅ Batch operation tracking and reporting');
  console.log('✅ Rate limiting and API management');
  console.log('✅ Enhanced metadata for operational insights');
};

// Run the demonstration
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    demonstrateResponseStandardization();
  } catch (error) {
    console.error('❌ Error running demonstration:', error.message);
    process.exit(1);
  }
}

export default demonstrateResponseStandardization;
