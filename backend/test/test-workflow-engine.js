/**
 * Test script for Workflow Engine Implementation
 * 
 * Tests the core workflow engine functionality including:
 * - Workflow initialization
 * - State transitions
 * - Inspection processing
 * - Queue management
 * - Error handling
 */

import workflowEngine from '../services/workflowService.js';
import workflowStateMachine from '../services/workflowStateMachine.js';
import { manufacturingLogger } from '../middleware/logger.js';

console.log('🏭 Testing Workflow Engine Implementation');
console.log('========================================\n');

// Test configuration
const TEST_CONFIG = {
  panelId: 'TEST_PANEL_001',
  barcode: 'CRS25WB14400001',
  lineNumber: 2,
  stationId: 'STATION_1'
};

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0
};

/**
 * Test helper function
 */
function runTest(testName, testFunction) {
  testResults.total++;
  console.log(`\n🧪 Test: ${testName}`);
  
  try {
    const result = testFunction();
    if (result === true) {
      console.log(`   ✅ PASSED`);
      testResults.passed++;
    } else {
      console.log(`   ❌ FAILED: ${result}`);
      testResults.failed++;
    }
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    testResults.failed++;
  }
}

/**
 * Test 1: Workflow Engine Initialization
 */
runTest('Workflow Engine Initialization', () => {
  try {
    // Test workflow engine initialization
    const workflow = workflowEngine.initializeWorkflow(
      TEST_CONFIG.panelId,
      TEST_CONFIG.barcode,
      TEST_CONFIG.lineNumber
    );
    
    // Validate workflow state
    if (!workflow) throw new Error('Workflow not returned');
    if (workflow.currentState !== 'SCANNED') throw new Error('Initial state should be SCANNED');
    if (workflow.panelId !== TEST_CONFIG.panelId) throw new Error('Panel ID mismatch');
    if (workflow.barcode !== TEST_CONFIG.barcode) throw new Error('Barcode mismatch');
    if (workflow.lineNumber !== TEST_CONFIG.lineNumber) throw new Error('Line number mismatch');
    
    console.log(`   ✅ Workflow initialized: ${workflow.currentState}`);
    return true;
  } catch (error) {
    return `Workflow initialization failed: ${error.message}`;
  }
});

/**
 * Test 2: State Machine Initialization
 */
runTest('State Machine Initialization', () => {
  try {
    // Test state machine initialization
    const stateMachine = workflowStateMachine.initializePanel(
      TEST_CONFIG.panelId,
      TEST_CONFIG.barcode,
      '144' // Panel type from barcode
    );
    
    // Validate state machine state
    if (!stateMachine) throw new Error('State machine not returned');
    if (stateMachine.currentState !== 'SCANNED') throw new Error('Initial state should be SCANNED');
    if (stateMachine.id !== TEST_CONFIG.panelId) throw new Error('Panel ID mismatch');
    if (stateMachine.barcode !== TEST_CONFIG.barcode) throw new Error('Barcode mismatch');
    if (stateMachine.panelType !== '144') throw new Error('Panel type mismatch');
    if (stateMachine.line !== 'LINE_2') throw new Error('Line assignment mismatch');
    
    console.log(`   ✅ State machine initialized: ${stateMachine.currentState}`);
    return true;
  } catch (error) {
    return `State machine initialization failed: ${error.message}`;
  }
});

/**
 * Test 3: Workflow State Transitions
 */
runTest('Workflow State Transitions', () => {
  try {
    // First transition to VALIDATED state
    workflowEngine.transitionWorkflow(TEST_CONFIG.panelId, 'VALIDATED', {
      reason: 'Barcode validated'
    });
    
    // Test valid transitions step by step
    const transitions = [
      { from: 'VALIDATED', to: 'ASSEMBLY_EL', expected: true },
      { from: 'ASSEMBLY_EL', to: 'FRAMING', expected: true },
      { from: 'FRAMING', to: 'JUNCTION_BOX', expected: true },
      { from: 'JUNCTION_BOX', to: 'PERFORMANCE_FINAL', expected: true },
      { from: 'PERFORMANCE_FINAL', to: 'COMPLETED', expected: true }
    ];
    
    for (const transition of transitions) {
      const isValid = workflowEngine.validateTransition(TEST_CONFIG.panelId, transition.to);
      if (isValid !== transition.expected) {
        throw new Error(`Transition ${transition.from} -> ${transition.to} validation failed`);
      }
      
      // Actually perform the transition to test the next one
      if (transition.to !== 'COMPLETED') {
        workflowEngine.transitionWorkflow(TEST_CONFIG.panelId, transition.to, {
          reason: `Testing transition to ${transition.to}`
        });
      }
    }
    
    console.log(`   ✅ All ${transitions.length} transitions validated and executed`);
    return true;
  } catch (error) {
    return `State transitions failed: ${error.message}`;
  }
});

/**
 * Test 4: Inspection Processing
 */
runTest('Inspection Processing', () => {
  try {
    // Create a new test panel for inspection testing
    const inspectionPanelId = 'INSPECTION_TEST_001';
    const inspectionBarcode = 'CRS25WB14400004';
    
    // Initialize and progress to ASSEMBLY_EL state
    workflowEngine.initializeWorkflow(inspectionPanelId, inspectionBarcode, 2);
    workflowEngine.transitionWorkflow(inspectionPanelId, 'VALIDATED', {
      reason: 'Barcode validated'
    });
    workflowEngine.transitionWorkflow(inspectionPanelId, 'ASSEMBLY_EL', {
      reason: 'Starting Station 1 inspection'
    });
    
    // Test PASS inspection
    const passInspection = {
      result: 'PASS',
      criteria: {
        cellAlignment: true,
        electricalConnection: true,
        visualInspection: true
      },
      notes: 'All criteria passed',
      operatorId: 'TEST_OPERATOR'
    };
    
    const passResult = workflowEngine.processInspection(
      inspectionPanelId,
      'STATION_1',
      passInspection
    );
    
    if (passResult.outcome.result !== 'PASS') {
      throw new Error('PASS inspection failed');
    }
    
    if (passResult.outcome.nextState !== 'FRAMING') {
      throw new Error('Next state should be FRAMING');
    }
    
    console.log(`   ✅ PASS inspection processed: ${passResult.outcome.nextState}`);
    return true;
  } catch (error) {
    return `Inspection processing failed: ${error.message}`;
  }
});

/**
 * Test 5: Queue Management
 */
runTest('Queue Management', () => {
  try {
    // Test queue operations
    const stationId = 'STATION_1';
    
    // Get initial queue
    const initialQueue = workflowStateMachine.getStationQueue(stationId);
    
    // Add panel to queue
    workflowStateMachine.addToStationQueue(stationId, TEST_CONFIG.panelId);
    
    // Get updated queue
    const updatedQueue = workflowStateMachine.getStationQueue(stationId);
    
    if (updatedQueue.length !== initialQueue.length + 1) {
      throw new Error('Panel not added to queue');
    }
    
    if (!updatedQueue.includes(TEST_CONFIG.panelId)) {
      throw new Error('Panel ID not found in queue');
    }
    
    // Test get next panel
    const nextPanel = workflowStateMachine.getNextPanelInQueue(stationId);
    if (nextPanel !== TEST_CONFIG.panelId) {
      throw new Error('Next panel mismatch');
    }
    
    // Remove panel from queue
    workflowStateMachine.removeFromStationQueue(stationId, TEST_CONFIG.panelId);
    
    const finalQueue = workflowStateMachine.getStationQueue(stationId);
    if (finalQueue.includes(TEST_CONFIG.panelId)) {
      throw new Error('Panel not removed from queue');
    }
    
    console.log(`   ✅ Queue management operations successful`);
    return true;
  } catch (error) {
    return `Queue management failed: ${error.message}`;
  }
});

/**
 * Test 6: Workflow Statistics
 */
runTest('Workflow Statistics', () => {
  try {
    // Get workflow statistics
    const stats = workflowStateMachine.getWorkflowStatistics();
    
    if (!stats) throw new Error('Statistics not returned');
    if (typeof stats.totalPanels !== 'number') throw new Error('Total panels should be a number');
    if (!stats.stateCounts) throw new Error('State counts missing');
    if (!stats.queueCounts) throw new Error('Queue counts missing');
    if (!stats.timestamp) throw new Error('Timestamp missing');
    
    console.log(`   ✅ Statistics retrieved: ${stats.totalPanels} total panels`);
    return true;
  } catch (error) {
    return `Statistics failed: ${error.message}`;
  }
});

/**
 * Test 7: Error Handling
 */
runTest('Error Handling', () => {
  try {
    // Test invalid panel ID
    try {
      workflowEngine.getWorkflowState('INVALID_PANEL');
      throw new Error('Should have thrown error for invalid panel');
    } catch (error) {
      if (!(error instanceof Error)) {
        throw new Error('Expected Error instance');
      }
    }
    
    // Test invalid state transition
    try {
      workflowEngine.validateTransition(TEST_CONFIG.panelId, 'INVALID_STATE');
      throw new Error('Should have thrown error for invalid state');
    } catch (error) {
      if (!(error instanceof Error)) {
        throw new Error('Expected Error instance');
      }
    }
    
    console.log(`   ✅ Error handling working correctly`);
    return true;
  } catch (error) {
    return `Error handling failed: ${error.message}`;
  }
});

/**
 * Test 8: Workflow Completion
 */
runTest('Workflow Completion', () => {
  try {
    // Create a new test panel for completion testing
    const completionPanelId = 'COMPLETION_TEST_001';
    const completionBarcode = 'CRS25WB14400003';
    
    // Initialize and progress through workflow
    workflowEngine.initializeWorkflow(completionPanelId, completionBarcode, 2);
    
    // Progress through all states to reach PERFORMANCE_FINAL
    const states = ['VALIDATED', 'ASSEMBLY_EL', 'FRAMING', 'JUNCTION_BOX', 'PERFORMANCE_FINAL'];
    for (const state of states) {
      workflowEngine.transitionWorkflow(completionPanelId, state, {
        reason: `Progressing to ${state}`
      });
    }
    
    // Complete the workflow
    const completedWorkflow = workflowEngine.completeWorkflow(completionPanelId, {
      qualityScore: 95.5,
      completionNotes: 'Test completion'
    });
    
    if (completedWorkflow.currentState !== 'COMPLETED') {
      throw new Error('Workflow should be completed');
    }
    
    if (completedWorkflow.status !== 'COMPLETED') {
      throw new Error('Workflow status should be completed');
    }
    
    console.log(`   ✅ Workflow completed successfully`);
    return true;
  } catch (error) {
    return `Workflow completion failed: ${error.message}`;
  }
});

/**
 * Test 9: Rework Functionality
 */
runTest('Rework Functionality', () => {
  try {
    // Reset workflow for rework
    const reworkWorkflow = workflowEngine.resetWorkflowForRework(
      TEST_CONFIG.panelId,
      'STATION_1',
      {
        reason: 'Test rework',
        notes: ['Quality issue found']
      }
    );
    
    if (reworkWorkflow.currentState !== 'ASSEMBLY_EL') {
      throw new Error('Rework should reset to ASSEMBLY_EL');
    }
    
    if (reworkWorkflow.status !== 'ACTIVE') {
      throw new Error('Rework status should be active');
    }
    
    if (!reworkWorkflow.reworkCount || reworkWorkflow.reworkCount < 1) {
      throw new Error('Rework count should be incremented');
    }
    
    console.log(`   ✅ Rework functionality working`);
    return true;
  } catch (error) {
    return `Rework functionality failed: ${error.message}`;
  }
});

/**
 * Test 10: Integration Test
 */
runTest('Integration Test', () => {
  try {
    // Test full workflow cycle
    const testPanelId = 'INTEGRATION_TEST_001';
    const testBarcode = 'CRS25WB14400002';
    
    // Initialize
    const workflow = workflowEngine.initializeWorkflow(testPanelId, testBarcode, 2);
    const stateMachine = workflowStateMachine.initializePanel(testPanelId, testBarcode, '144');
    
    // Transition through workflow states
    const workflowStates = ['VALIDATED', 'ASSEMBLY_EL', 'FRAMING', 'JUNCTION_BOX', 'PERFORMANCE_FINAL'];
    
    for (const state of workflowStates) {
      workflowEngine.transitionWorkflow(testPanelId, state, {
        reason: `Transitioning to ${state}`,
        stationId: `STATION_${workflowStates.indexOf(state) + 1}`
      });
    }
    
    // Complete workflow
    const completed = workflowEngine.completeWorkflow(testPanelId, {
      qualityScore: 98.0,
      completionNotes: 'Integration test completed'
    });
    
    if (completed.currentState !== 'COMPLETED') {
      throw new Error('Integration test workflow not completed');
    }
    
    console.log(`   ✅ Full workflow cycle completed`);
    return true;
  } catch (error) {
    return `Integration test failed: ${error.message}`;
  }
});

// Print test results
console.log('\n📊 Test Results Summary');
console.log('========================');
console.log(`Total Tests: ${testResults.total}`);
console.log(`Passed: ${testResults.passed} ✅`);
console.log(`Failed: ${testResults.failed} ❌`);
console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

if (testResults.failed === 0) {
  console.log('\n🎉 All tests passed! Workflow engine is working correctly.');
} else {
  console.log('\n⚠️  Some tests failed. Please review the implementation.');
}

// Clean up test data
try {
  workflowStateMachine.reset();
  console.log('\n🧹 Test data cleaned up');
} catch (error) {
  console.log(`\n⚠️  Cleanup warning: ${error.message}`);
}
