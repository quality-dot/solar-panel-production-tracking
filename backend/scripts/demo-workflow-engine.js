#!/usr/bin/env node

/**
 * Station Workflow Engine Demonstration Script
 * 
 * This script demonstrates all the capabilities of the Station Workflow Engine including:
 * - Workflow initialization and state management
 * - Pass/fail validation and criteria checking
 * - Workflow progression through stations
 * - Inspection processing and quality scoring
 * - Rework workflow management
 * - Error handling and edge cases
 */

import workflowEngine, { 
  WORKFLOW_STATES, 
  STATION_CONFIGS, 
  QUALITY_CRITERIA 
} from '../services/workflowService.js';

// Utility function to display workflow information
const displayWorkflow = (title, workflow) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🏭 ${title}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Panel ID: ${workflow.panelId}`);
  console.log(`Barcode: ${workflow.barcode}`);
  console.log(`Line: ${workflow.lineNumber}`);
  console.log(`Current State: ${workflow.currentState}`);
  console.log(`Previous State: ${workflow.previousState || 'N/A'}`);
  console.log(`Next State: ${workflow.nextState || 'N/A'}`);
  console.log(`Progress: ${workflow.workflowProgress}%`);
  console.log(`Quality Score: ${workflow.qualityScore || 'N/A'}`);
  console.log(`Status: ${workflow.status}`);
  console.log(`Station: ${workflow.stationId || 'N/A'}`);
  console.log(`Operator: ${workflow.operatorId || 'N/A'}`);
  if (workflow.reworkCount > 0) {
    console.log(`Rework Count: ${workflow.reworkCount}`);
    console.log(`Rework Reason: ${workflow.reworkReason}`);
  }
  console.log(`${'='.repeat(60)}`);
};

// Utility function to display inspection results
const displayInspectionResult = (title, result) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔍 ${title}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Result: ${result.outcome.result}`);
  console.log(`Next State: ${result.outcome.nextState}`);
  console.log(`Quality Score: ${result.outcome.qualityScore}`);
  console.log(`Message: ${result.outcome.message}`);
  
  if (result.outcome.failureReasons) {
    console.log('\n❌ Failure Reasons:');
    result.outcome.failureReasons.forEach((failure, index) => {
      console.log(`  ${index + 1}. ${failure.criterion}: ${failure.reason}`);
    });
  }
  
  if (result.outcome.requiredActions) {
    console.log('\n🔧 Required Actions:');
    result.outcome.requiredActions.forEach((action, index) => {
      console.log(`  ${index + 1}. ${action}`);
    });
  }
  
  console.log('\n📋 Next Actions:');
  result.nextActions.forEach((action, index) => {
    console.log(`  ${index + 1}. ${action}`);
  });
  
  console.log(`${'='.repeat(60)}`);
};

// Main demonstration function
const demonstrateWorkflowEngine = () => {
  console.log('🏭 Station Workflow Engine Demonstration');
  console.log('Demonstrating comprehensive workflow management for solar panel production\n');

  try {
    // Scenario 1: Normal Workflow Progression
    console.log('\n📋 Scenario 1: Normal Workflow Progression');
    console.log('Following a panel through all stations successfully\n');

    // Initialize workflow
    const panelId1 = 'PANEL_DEMO_001';
    const barcode1 = 'CRS24F1236';
    const lineNumber1 = 1;

    console.log('1️⃣ Initializing workflow...');
    let workflow = workflowEngine.initializeWorkflow(panelId1, barcode1, lineNumber1);
    displayWorkflow('Initial Workflow State', workflow);

    // Progress through stations
    console.log('\n2️⃣ Progressing through stations...');
    
    // Station 1: Assembly & EL
    console.log('\n   📍 Station 1: Assembly & EL');
    workflow = workflowEngine.transitionWorkflow(workflow.panelId, WORKFLOW_STATES.VALIDATED);
    workflow = workflowEngine.transitionWorkflow(workflow.panelId, WORKFLOW_STATES.ASSEMBLY_EL);
    displayWorkflow('After Station 1 Transition', workflow);

    // Process inspection at Station 1
    console.log('\n   🔍 Processing inspection at Station 1...');
    const inspection1 = {
      result: 'PASS',
      criteria: {
        cellAlignment: true,
        electricalConnection: true,
        visualInspection: true,
        cellCount: 72,
        stringCount: 6
      },
      operatorId: 'OP_001'
    };

    const result1 = workflowEngine.processInspection(workflow.panelId, 'STATION_1', inspection1);
    displayInspectionResult('Station 1 Inspection Result', result1);
    workflow = result1.workflow;

    // Station 2: Framing
    console.log('\n   📍 Station 2: Framing');
    workflow = workflowEngine.transitionWorkflow(workflow.panelId, WORKFLOW_STATES.FRAMING);
    displayWorkflow('After Station 2 Transition', workflow);

    // Process inspection at Station 2
    console.log('\n   🔍 Processing inspection at Station 2...');
    const inspection2 = {
      result: 'PASS',
      criteria: {
        frameAlignment: true,
        cornerSeals: true,
        mountingHoles: true,
        frameType: 'Aluminum',
        cornerType: 'Standard'
      },
      operatorId: 'OP_002'
    };

    const result2 = workflowEngine.processInspection(workflow.panelId, 'STATION_2', inspection2);
    displayInspectionResult('Station 2 Inspection Result', result2);
    workflow = result2.workflow;

    // Station 3: Junction Box
    console.log('\n   📍 Station 3: Junction Box');
    workflow = workflowEngine.transitionWorkflow(workflow.panelId, WORKFLOW_STATES.JUNCTION_BOX);
    displayWorkflow('After Station 3 Transition', workflow);

    // Process inspection at Station 3
    console.log('\n   🔍 Processing inspection at Station 3...');
    const inspection3 = {
      result: 'PASS',
      criteria: {
        boxAlignment: true,
        cableRouting: true,
        sealIntegrity: true,
        boxType: 'IP67',
        cableType: 'UV-resistant'
      },
      operatorId: 'OP_003'
    };

    const result3 = workflowEngine.processInspection(workflow.panelId, 'STATION_3', inspection3);
    displayInspectionResult('Station 3 Inspection Result', result3);
    workflow = result3.workflow;

    // Station 4: Performance & Final Inspection
    console.log('\n   📍 Station 4: Performance & Final Inspection');
    workflow = workflowEngine.transitionWorkflow(workflow.panelId, WORKFLOW_STATES.PERFORMANCE_FINAL);
    displayWorkflow('After Station 4 Transition', workflow);

    // Process inspection at Station 4
    console.log('\n   🔍 Processing inspection at Station 4...');
    const inspection4 = {
      result: 'PASS',
      criteria: {
        powerOutput: 295.5,
        voltageCheck: 24.8,
        currentCheck: 5.2,
        efficiencyTest: 18.2,
        temperatureCoefficient: -0.35,
        irradianceResponse: 0.98
      },
      operatorId: 'OP_004'
    };

    const result4 = workflowEngine.processInspection(workflow.panelId, 'STATION_4', inspection4);
    displayInspectionResult('Station 4 Inspection Result', result4);
    workflow = result4.workflow;

    // Complete workflow
    console.log('\n3️⃣ Completing workflow...');
    const completedWorkflow = workflowEngine.completeWorkflow(workflow.panelId, {
      qualityScore: 98.5,
      finalInspector: 'OP_004',
      completionNotes: 'Panel meets all specifications and quality standards'
    });
    displayWorkflow('Completed Workflow', completedWorkflow);

    // Scenario 2: Failed Inspection and Rework
    console.log('\n📋 Scenario 2: Failed Inspection and Rework');
    console.log('Demonstrating failure handling and rework workflow\n');

    const panelId2 = 'PANEL_DEMO_002';
    const barcode2 = 'CRS24F1237';
    const lineNumber2 = 1;

    // Initialize and progress to Station 1
    console.log('1️⃣ Initializing workflow for rework scenario...');
    let workflow2 = workflowEngine.initializeWorkflow(panelId2, barcode2, lineNumber2);
    workflow2 = workflowEngine.transitionWorkflow(workflow2.panelId, WORKFLOW_STATES.VALIDATED);
    workflow2 = workflowEngine.transitionWorkflow(workflow2.panelId, WORKFLOW_STATES.ASSEMBLY_EL);
    displayWorkflow('Workflow Ready for Inspection', workflow2);

    // Process failed inspection
    console.log('\n2️⃣ Processing failed inspection...');
    const failedInspection = {
      result: 'FAIL',
      criteria: {
        cellAlignment: false,
        electricalConnection: true,
        visualInspection: false
      },
      notes: 'Cells misaligned by 2mm, visual defects on surface',
      operatorId: 'OP_001'
    };

    const failedResult = workflowEngine.processInspection(workflow2.panelId, 'STATION_1', failedInspection);
    displayInspectionResult('Failed Inspection Result', failedResult);
    workflow2 = failedResult.workflow;

    // Reset for rework
    console.log('\n3️⃣ Resetting workflow for rework...');
    const reworkData = {
      reason: 'Cell alignment and visual defects detected',
      notes: ['Cells shifted during assembly', 'Surface contamination detected', 'Requires complete rework']
    };

    const reworkWorkflow = workflowEngine.resetWorkflowForRework(workflow2.panelId, 'STATION_1', reworkData);
    displayWorkflow('Rework Workflow Reset', reworkWorkflow);

    // Process successful rework inspection
    console.log('\n4️⃣ Processing successful rework inspection...');
    const reworkInspection = {
      result: 'PASS',
      criteria: {
        cellAlignment: true,
        electricalConnection: true,
        visualInspection: true,
        cellCount: 72,
        stringCount: 6
      },
      operatorId: 'OP_001',
      notes: 'Rework completed successfully, all criteria met'
    };

    const reworkResult = workflowEngine.processInspection(reworkWorkflow.panelId, 'STATION_1', reworkInspection);
    displayInspectionResult('Rework Inspection Result', reworkResult);

    // Scenario 3: Station-Specific Criteria Validation
    console.log('\n📋 Scenario 3: Station-Specific Criteria Validation');
    console.log('Demonstrating different validation requirements for each station\n');

    console.log('📍 Station 1 (Assembly & EL):');
    console.log(`   Required Criteria: ${STATION_CONFIGS.STATION_1.criteria.required.join(', ')}`);
    console.log(`   Optional Criteria: ${STATION_CONFIGS.STATION_1.criteria.optional.join(', ')}`);
    console.log(`   Pass Threshold: ${STATION_CONFIGS.STATION_1.criteria.passThreshold * 100}%`);
    console.log(`   Notes Required: ${STATION_CONFIGS.STATION_1.criteria.notesRequired ? 'Yes' : 'No'}`);

    console.log('\n📍 Station 4 (Performance & Final):');
    console.log(`   Required Criteria: ${STATION_CONFIGS.STATION_4.criteria.required.join(', ')}`);
    console.log(`   Optional Criteria: ${STATION_CONFIGS.STATION_4.criteria.optional.join(', ')}`);
    console.log(`   Pass Threshold: ${STATION_CONFIGS.STATION_4.criteria.passThreshold * 100}%`);
    console.log(`   Notes Required: ${STATION_CONFIGS.STATION_4.criteria.notesRequired ? 'Yes' : 'No'}`);

    // Scenario 4: Quality Criteria Examples
    console.log('\n📋 Scenario 4: Quality Criteria Examples');
    console.log('Showing detailed criteria definitions\n');

    console.log('🔍 Cell Alignment Criteria:');
    console.log(`   Name: ${QUALITY_CRITERIA.cellAlignment.name}`);
    console.log(`   Description: ${QUALITY_CRITERIA.cellAlignment.description}`);
    console.log(`   Type: ${QUALITY_CRITERIA.cellAlignment.type}`);
    console.log(`   Required: ${QUALITY_CRITERIA.cellAlignment.required ? 'Yes' : 'No'}`);
    console.log(`   Pass Value: ${QUALITY_CRITERIA.cellAlignment.passValue}`);

    console.log('\n🔍 Power Output Criteria:');
    console.log(`   Name: ${QUALITY_CRITERIA.powerOutput.name}`);
    console.log(`   Description: ${QUALITY_CRITERIA.powerOutput.description}`);
    console.log(`   Type: ${QUALITY_CRITERIA.powerOutput.type}`);
    console.log(`   Unit: ${QUALITY_CRITERIA.powerOutput.unit}`);
    console.log(`   Tolerance: ±${QUALITY_CRITERIA.powerOutput.tolerance * 100}%`);

    // Scenario 5: Workflow Queries and Analytics
    console.log('\n📋 Scenario 5: Workflow Queries and Analytics');
    console.log('Demonstrating workflow monitoring and reporting capabilities\n');

    // Get all active workflows
    const activeWorkflows = workflowEngine.getActiveWorkflows();
    console.log(`📊 Total Active Workflows: ${activeWorkflows.length}`);

    // Get workflows by status
    const completedWorkflows = workflowEngine.getWorkflowsByStatus('COMPLETED');
    console.log(`✅ Completed Workflows: ${completedWorkflows.length}`);

    // Get workflows by station
    const station1Workflows = workflowEngine.getWorkflowsByStation('STATION_1');
    console.log(`🏭 Station 1 Workflows: ${station1Workflows.length}`);

    // Display workflow history for rework panel
    console.log('\n📜 Workflow History for Rework Panel:');
    const history = workflowEngine.getWorkflowHistory(panelId2);
    history.forEach((entry, index) => {
      console.log(`   ${index + 1}. ${entry.timestamp} - ${entry.action}: ${entry.fromState || 'N/A'} → ${entry.toState}`);
      if (entry.details) {
        Object.entries(entry.details).forEach(([key, value]) => {
          console.log(`      ${key}: ${value}`);
        });
      }
    });

    // Summary
    console.log('\n🎯 Workflow Engine Demonstration Summary');
    console.log('=====================================');
    console.log('✅ Successfully demonstrated:');
    console.log('   • Workflow initialization and state management');
    console.log('   • Pass/fail validation with station-specific criteria');
    console.log('   • Complete workflow progression through all stations');
    console.log('   • Failed inspection handling and rework workflows');
    console.log('   • Quality scoring and criteria validation');
    console.log('   • Workflow history tracking and audit trail');
    console.log('   • Query capabilities for monitoring and reporting');
    console.log('\n🚀 The Station Workflow Engine is ready for production use!');

  } catch (error) {
    console.error('❌ Error during demonstration:', error.message);
    if (error.name === 'WorkflowError') {
      console.error('   Error Code:', error.code);
      console.error('   Panel ID:', error.panelId);
      console.error('   Current State:', error.currentState);
      console.error('   Attempted Action:', error.attemptedAction);
    }
    process.exit(1);
  }
};

// Run the demonstration
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    demonstrateWorkflowEngine();
  } catch (error) {
    console.error('❌ Error running demonstration:', error.message);
    process.exit(1);
  }
}

export default demonstrateWorkflowEngine;
