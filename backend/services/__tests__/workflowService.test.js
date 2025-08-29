#!/usr/bin/env node

/**
 * Comprehensive test suite for Station Workflow Engine Service
 * 
 * Tests all aspects of the workflow engine including:
 * - Workflow state machine and transitions
 * - Pass/fail validation engine
 * - Station-specific criteria configuration
 * - Workflow routing and progression
 * - Error handling and edge cases
 * - Rework and completion workflows
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import workflowEngine, { 
  WORKFLOW_STATES, 
  WORKFLOW_TRANSITIONS, 
  STATION_CONFIGS, 
  QUALITY_CRITERIA 
} from '../workflowService.js';
import { WorkflowError } from '../../middleware/errorHandler.js';

describe('Station Workflow Engine', () => {
  let testPanelId;
  let testBarcode;
  let testLineNumber;

  beforeEach(() => {
    // Reset workflow engine state before each test
    workflowEngine.workflowHistory.clear();
    workflowEngine.activeWorkflows.clear();
    
    // Set up test data
    testPanelId = 'PANEL_TEST_001';
    testBarcode = 'CRS24F1236';
    testLineNumber = 1;
  });

  afterEach(() => {
    // Clean up after each test
    workflowEngine.workflowHistory.clear();
    workflowEngine.activeWorkflows.clear();
  });

  describe('Constants and Configuration', () => {
    describe('WORKFLOW_STATES', () => {
      it('should define all required workflow states', () => {
        expect(WORKFLOW_STATES.SCANNED).toBe('SCANNED');
        expect(WORKFLOW_STATES.VALIDATED).toBe('VALIDATED');
        expect(WORKFLOW_STATES.ASSEMBLY_EL).toBe('ASSEMBLY_EL');
        expect(WORKFLOW_STATES.FRAMING).toBe('FRAMING');
        expect(WORKFLOW_STATES.JUNCTION_BOX).toBe('JUNCTION_BOX');
        expect(WORKFLOW_STATES.PERFORMANCE_FINAL).toBe('PERFORMANCE_FINAL');
        expect(WORKFLOW_STATES.COMPLETED).toBe('COMPLETED');
        expect(WORKFLOW_STATES.FAILED).toBe('FAILED');
        expect(WORKFLOW_STATES.REWORK).toBe('REWORK');
        expect(WORKFLOW_STATES.QUARANTINE).toBe('QUARANTINE');
      });
    });

    describe('WORKFLOW_TRANSITIONS', () => {
      it('should define valid transitions for each state', () => {
        expect(WORKFLOW_TRANSITIONS[WORKFLOW_STATES.SCANNED]).toContain(WORKFLOW_STATES.VALIDATED);
        expect(WORKFLOW_TRANSITIONS[WORKFLOW_STATES.SCANNED]).toContain(WORKFLOW_STATES.FAILED);
        
        expect(WORKFLOW_TRANSITIONS[WORKFLOW_STATES.ASSEMBLY_EL]).toContain(WORKFLOW_STATES.FRAMING);
        expect(WORKFLOW_TRANSITIONS[WORKFLOW_STATES.ASSEMBLY_EL]).toContain(WORKFLOW_STATES.FAILED);
        expect(WORKFLOW_TRANSITIONS[WORKFLOW_STATES.ASSEMBLY_EL]).toContain(WORKFLOW_STATES.REWORK);
        
        expect(WORKFLOW_TRANSITIONS[WORKFLOW_STATES.COMPLETED]).toEqual([]); // Terminal state
      });
    });

    describe('STATION_CONFIGS', () => {
      it('should define configuration for all stations', () => {
        expect(STATION_CONFIGS.STATION_1).toBeDefined();
        expect(STATION_CONFIGS.STATION_2).toBeDefined();
        expect(STATION_CONFIGS.STATION_3).toBeDefined();
        expect(STATION_CONFIGS.STATION_4).toBeDefined();
      });

      it('should have correct workflow steps for each station', () => {
        expect(STATION_CONFIGS.STATION_1.workflowStep).toBe(WORKFLOW_STATES.ASSEMBLY_EL);
        expect(STATION_CONFIGS.STATION_2.workflowStep).toBe(WORKFLOW_STATES.FRAMING);
        expect(STATION_CONFIGS.STATION_3.workflowStep).toBe(WORKFLOW_STATES.JUNCTION_BOX);
        expect(STATION_CONFIGS.STATION_4.workflowStep).toBe(WORKFLOW_STATES.PERFORMANCE_FINAL);
      });

      it('should define required criteria for each station', () => {
        expect(STATION_CONFIGS.STATION_1.criteria.required).toContain('cellAlignment');
        expect(STATION_CONFIGS.STATION_2.criteria.required).toContain('frameAlignment');
        expect(STATION_CONFIGS.STATION_3.criteria.required).toContain('boxAlignment');
        expect(STATION_CONFIGS.STATION_4.criteria.required).toContain('powerOutput');
      });

      it('should have appropriate pass thresholds', () => {
        expect(STATION_CONFIGS.STATION_1.criteria.passThreshold).toBe(0.95);
        expect(STATION_CONFIGS.STATION_4.criteria.passThreshold).toBe(0.98); // Higher for final inspection
      });
    });

    describe('QUALITY_CRITERIA', () => {
      it('should define criteria for all stations', () => {
        expect(QUALITY_CRITERIA.cellAlignment).toBeDefined();
        expect(QUALITY_CRITERIA.frameAlignment).toBeDefined();
        expect(QUALITY_CRITERIA.boxAlignment).toBeDefined();
        expect(QUALITY_CRITERIA.powerOutput).toBeDefined();
      });

      it('should have correct data types for criteria', () => {
        expect(QUALITY_CRITERIA.cellAlignment.type).toBe('boolean');
        expect(QUALITY_CRITERIA.powerOutput.type).toBe('number');
        expect(QUALITY_CRITERIA.efficiencyTest.unit).toBe('%');
        expect(QUALITY_CRITERIA.voltageCheck.tolerance).toBe(0.03);
      });
    });
  });

  describe('Workflow Initialization', () => {
    it('should initialize workflow for new panel', () => {
      const workflow = workflowEngine.initializeWorkflow(testPanelId, testBarcode, testLineNumber);
      
      expect(workflow.panelId).toBe(testPanelId);
      expect(workflow.barcode).toBe(testBarcode);
      expect(workflow.lineNumber).toBe(testLineNumber);
      expect(workflow.currentState).toBe(WORKFLOW_STATES.SCANNED);
      expect(workflow.nextState).toBe(WORKFLOW_STATES.VALIDATED);
      expect(workflow.workflowProgress).toBe(0);
      expect(workflow.status).toBe('ACTIVE');
    });

    it('should prevent duplicate workflow initialization', () => {
      workflowEngine.initializeWorkflow(testPanelId, testBarcode, testLineNumber);
      
      expect(() => {
        workflowEngine.initializeWorkflow(testPanelId, testBarcode, testLineNumber);
      }).toThrow(WorkflowError);
    });

    it('should create workflow history entry', () => {
      workflowEngine.initializeWorkflow(testPanelId, testBarcode, testLineNumber);
      const history = workflowEngine.getWorkflowHistory(testPanelId);
      
      expect(history).toHaveLength(1);
      expect(history[0].action).toBe('WORKFLOW_INITIALIZED');
      expect(history[0].toState).toBe(WORKFLOW_STATES.SCANNED);
    });
  });

  describe('Workflow Transitions', () => {
    beforeEach(() => {
      workflowEngine.initializeWorkflow(testPanelId, testBarcode, testLineNumber);
    });

    it('should validate valid transitions', () => {
      expect(workflowEngine.validateTransition(testPanelId, WORKFLOW_STATES.VALIDATED)).toBe(true);
      expect(workflowEngine.validateTransition(testPanelId, WORKFLOW_STATES.FAILED)).toBe(true);
    });

    it('should reject invalid transitions', () => {
      expect(() => {
        workflowEngine.validateTransition(testPanelId, WORKFLOW_STATES.ASSEMBLY_EL);
      }).toThrow(WorkflowError);
    });

    it('should transition workflow to new state', () => {
      const updatedWorkflow = workflowEngine.transitionWorkflow(
        testPanelId, 
        WORKFLOW_STATES.VALIDATED,
        { stationId: 'STATION_1', operatorId: 'OP_001' }
      );
      
      expect(updatedWorkflow.currentState).toBe(WORKFLOW_STATES.VALIDATED);
      expect(updatedWorkflow.previousState).toBe(WORKFLOW_STATES.SCANNED);
      expect(updatedWorkflow.stationId).toBe('STATION_1');
      expect(updatedWorkflow.operatorId).toBe('OP_001');
    });

    it('should update workflow progress correctly', () => {
      workflowEngine.transitionWorkflow(testPanelId, WORKFLOW_STATES.VALIDATED);
      workflowEngine.transitionWorkflow(testPanelId, WORKFLOW_STATES.ASSEMBLY_EL);
      
      const workflow = workflowEngine.getWorkflowState(testPanelId);
      expect(workflow.workflowProgress).toBe(25); // 1 out of 4 main steps
    });

    it('should maintain workflow history', () => {
      workflowEngine.transitionWorkflow(testPanelId, WORKFLOW_STATES.VALIDATED);
      const history = workflowEngine.getWorkflowHistory(testPanelId);
      
      expect(history).toHaveLength(2); // INIT + TRANSITION
      expect(history[1].action).toBe('STATE_TRANSITION');
      expect(history[1].fromState).toBe(WORKFLOW_STATES.SCANNED);
      expect(history[1].toState).toBe(WORKFLOW_STATES.VALIDATED);
    });
  });

  describe('Pass/Fail Validation Engine', () => {
    let workflow;

    beforeEach(() => {
      workflowEngine.initializeWorkflow(testPanelId, testBarcode, testLineNumber);
      workflowEngine.transitionWorkflow(testPanelId, WORKFLOW_STATES.VALIDATED);
      workflowEngine.transitionWorkflow(testPanelId, WORKFLOW_STATES.ASSEMBLY_EL);
      workflow = workflowEngine.getWorkflowState(testPanelId);
    });

    it('should validate PASS inspection with all required criteria', () => {
      const inspectionData = {
        result: 'PASS',
        criteria: {
          cellAlignment: true,
          electricalConnection: true,
          visualInspection: true
        },
        operatorId: 'OP_001'
      };

      const result = workflowEngine.processInspection(testPanelId, 'STATION_1', inspectionData);
      
      expect(result.outcome.result).toBe('PASS');
      expect(result.outcome.nextState).toBe(WORKFLOW_STATES.FRAMING);
      expect(result.workflow.currentState).toBe(WORKFLOW_STATES.FRAMING);
      expect(result.workflow.qualityScore).toBe(100);
    });

    it('should validate PASS inspection with optional criteria', () => {
      const inspectionData = {
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

      const result = workflowEngine.processInspection(testPanelId, 'STATION_1', inspectionData);
      
      expect(result.outcome.result).toBe('PASS');
      expect(result.workflow.criteria.cellCount).toBe(72);
      expect(result.workflow.criteria.stringCount).toBe(6);
    });

    it('should reject PASS inspection with failed required criteria', () => {
      const inspectionData = {
        result: 'PASS',
        criteria: {
          cellAlignment: true,
          electricalConnection: false, // Failed
          visualInspection: true
        },
        operatorId: 'OP_001'
      };

      expect(() => {
        workflowEngine.processInspection(testPanelId, 'STATION_1', inspectionData);
      }).toThrow(WorkflowError);
    });

    it('should process FAIL inspection correctly', () => {
      const inspectionData = {
        result: 'FAIL',
        criteria: {
          cellAlignment: false,
          electricalConnection: false,
          visualInspection: true
        },
        notes: 'Cells misaligned, electrical connections loose',
        operatorId: 'OP_001'
      };

      const result = workflowEngine.processInspection(testPanelId, 'STATION_1', inspectionData);
      
      expect(result.outcome.result).toBe('FAIL');
      expect(result.outcome.nextState).toBe(WORKFLOW_STATES.FAILED);
      expect(result.workflow.currentState).toBe(WORKFLOW_STATES.FAILED);
      expect(result.outcome.failureReasons).toHaveLength(2);
      expect(result.outcome.requiredActions).toContain('Realign solar cells within tolerance');
      expect(result.outcome.requiredActions).toContain('Re-solder electrical connections');
    });

    it('should require notes for FAIL at Station 4', () => {
      // Move panel to Station 4
      workflowEngine.transitionWorkflow(testPanelId, WORKFLOW_STATES.FRAMING);
      workflowEngine.transitionWorkflow(testPanelId, WORKFLOW_STATES.JUNCTION_BOX);
      workflowEngine.transitionWorkflow(testPanelId, WORKFLOW_STATES.PERFORMANCE_FINAL);

      const inspectionData = {
        result: 'FAIL',
        criteria: {
          powerOutput: 280, // Below spec
          voltageCheck: 24.0,
          currentCheck: 5.0,
          efficiencyTest: 17.5
        },
        // Missing notes - should fail validation
        operatorId: 'OP_001'
      };

      expect(() => {
        workflowEngine.processInspection(testPanelId, 'STATION_4', inspectionData);
      }).toThrow(WorkflowError);
    });

    it('should calculate quality score correctly', () => {
      const inspectionData = {
        result: 'PASS',
        criteria: {
          cellAlignment: true,
          electricalConnection: true,
          visualInspection: false // 1 out of 3 required criteria failed
        },
        operatorId: 'OP_001'
      };

      // This should fail validation, but let's check the quality calculation
      const validationResult = workflowEngine.validateInspectionCriteria(
        STATION_CONFIGS.STATION_1.criteria,
        inspectionData.criteria,
        inspectionData.result
      );

      expect(validationResult.qualityScore).toBe(66.67); // 2/3 * 100
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.passedCriteria).toBe(2);
      expect(validationResult.totalCriteria).toBe(3);
    });
  });

  describe('Workflow Progression', () => {
    beforeEach(() => {
      workflowEngine.initializeWorkflow(testPanelId, testBarcode, testLineNumber);
    });

    it('should progress through all stations correctly', () => {
      // Station 1: Assembly & EL
      let workflow = workflowEngine.transitionWorkflow(testPanelId, WORKFLOW_STATES.VALIDATED);
      workflow = workflowEngine.transitionWorkflow(testPanelId, WORKFLOW_STATES.ASSEMBLY_EL);
      expect(workflow.workflowProgress).toBe(25);

      // Station 2: Framing
      workflow = workflowEngine.transitionWorkflow(testPanelId, WORKFLOW_STATES.FRAMING);
      expect(workflow.workflowProgress).toBe(50);

      // Station 3: Junction Box
      workflow = workflowEngine.transitionWorkflow(testPanelId, WORKFLOW_STATES.JUNCTION_BOX);
      expect(workflow.workflowProgress).toBe(75);

      // Station 4: Performance & Final Inspection
      workflow = workflowEngine.transitionWorkflow(testPanelId, WORKFLOW_STATES.PERFORMANCE_FINAL);
      expect(workflow.workflowProgress).toBe(100);
    });

    it('should get correct next state for each workflow step', () => {
      expect(workflowEngine.getNextState(WORKFLOW_STATES.SCANNED)).toBe(WORKFLOW_STATES.VALIDATED);
      expect(workflowEngine.getNextState(WORKFLOW_STATES.ASSEMBLY_EL)).toBe(WORKFLOW_STATES.FRAMING);
      expect(workflowEngine.getNextState(WORKFLOW_STATES.FRAMING)).toBe(WORKFLOW_STATES.JUNCTION_BOX);
      expect(workflowEngine.getNextState(WORKFLOW_STATES.JUNCTION_BOX)).toBe(WORKFLOW_STATES.PERFORMANCE_FINAL);
      expect(workflowEngine.getNextState(WORKFLOW_STATES.PERFORMANCE_FINAL)).toBe(WORKFLOW_STATES.COMPLETED);
      expect(workflowEngine.getNextState(WORKFLOW_STATES.COMPLETED)).toBe(null); // Terminal state
    });
  });

  describe('Workflow Completion', () => {
    beforeEach(() => {
      workflowEngine.initializeWorkflow(testPanelId, testBarcode, testLineNumber);
      // Move panel to final inspection
      workflowEngine.transitionWorkflow(testPanelId, WORKFLOW_STATES.VALIDATED);
      workflowEngine.transitionWorkflow(testPanelId, WORKFLOW_STATES.ASSEMBLY_EL);
      workflowEngine.transitionWorkflow(testPanelId, WORKFLOW_STATES.FRAMING);
      workflowEngine.transitionWorkflow(testPanelId, WORKFLOW_STATES.JUNCTION_BOX);
      workflowEngine.transitionWorkflow(testPanelId, WORKFLOW_STATES.PERFORMANCE_FINAL);
    });

    it('should complete workflow successfully', () => {
      const completionData = {
        qualityScore: 98.5,
        finalInspector: 'OP_001',
        completionNotes: 'Panel meets all specifications'
      };

      const completedWorkflow = workflowEngine.completeWorkflow(testPanelId, completionData);
      
      expect(completedWorkflow.currentState).toBe(WORKFLOW_STATES.COMPLETED);
      expect(completedWorkflow.status).toBe('COMPLETED');
      expect(completedWorkflow.workflowProgress).toBe(100);
      expect(completedWorkflow.finalQualityScore).toBe(98.5);
    });

    it('should reject completion from non-final state', () => {
      // Move panel back to framing
      workflowEngine.transitionWorkflow(testPanelId, WORKFLOW_STATES.FRAMING);
      
      expect(() => {
        workflowEngine.completeWorkflow(testPanelId);
      }).toThrow(WorkflowError);
    });
  });

  describe('Rework Workflow', () => {
    beforeEach(() => {
      workflowEngine.initializeWorkflow(testPanelId, testBarcode, testLineNumber);
      // Move panel to assembly
      workflowEngine.transitionWorkflow(testPanelId, WORKFLOW_STATES.VALIDATED);
      workflowEngine.transitionWorkflow(testPanelId, WORKFLOW_STATES.ASSEMBLY_EL);
    });

    it('should reset workflow for rework at specific station', () => {
      const reworkData = {
        reason: 'Cell alignment issues detected',
        notes: ['Cells shifted during transport', 'Requires realignment']
      };

      const resetWorkflow = workflowEngine.resetWorkflowForRework(testPanelId, 'STATION_1', reworkData);
      
      expect(resetWorkflow.currentState).toBe(WORKFLOW_STATES.ASSEMBLY_EL);
      expect(resetWorkflow.reworkCount).toBe(1);
      expect(resetWorkflow.reworkReason).toBe('Cell alignment issues detected');
      expect(resetWorkflow.reworkNotes).toContain('Cells shifted during transport');
    });

    it('should reject invalid rework station', () => {
      expect(() => {
        workflowEngine.resetWorkflowForRework(testPanelId, 'INVALID_STATION');
      }).toThrow(WorkflowError);
    });

    it('should track rework history', () => {
      workflowEngine.resetWorkflowForRework(testPanelId, 'STATION_1', { reason: 'Test rework' });
      const history = workflowEngine.getWorkflowHistory(testPanelId);
      
      const reworkEntry = history.find(entry => entry.action === 'REWORK_RESET');
      expect(reworkEntry).toBeDefined();
      expect(reworkEntry.details.targetStation).toBe('STATION_1');
    });
  });

  describe('Error Handling', () => {
    it('should throw WorkflowError for non-existent panel', () => {
      expect(() => {
        workflowEngine.getWorkflowState('NON_EXISTENT_PANEL');
      }).toThrow(WorkflowError);
    });

    it('should throw WorkflowError for invalid state transitions', () => {
      workflowEngine.initializeWorkflow(testPanelId, testBarcode, testLineNumber);
      
      expect(() => {
        workflowEngine.transitionWorkflow(testPanelId, WORKFLOW_STATES.ASSEMBLY_EL);
      }).toThrow(WorkflowError);
    });

    it('should throw WorkflowError for invalid station in inspection', () => {
      workflowEngine.initializeWorkflow(testPanelId, testBarcode, testLineNumber);
      workflowEngine.transitionWorkflow(testPanelId, WORKFLOW_STATES.VALIDATED);
      workflowEngine.transitionWorkflow(testPanelId, WORKFLOW_STATES.ASSEMBLY_EL);

      const inspectionData = {
        result: 'PASS',
        criteria: { cellAlignment: true, electricalConnection: true, visualInspection: true },
        operatorId: 'OP_001'
      };

      expect(() => {
        workflowEngine.processInspection(testPanelId, 'INVALID_STATION', inspectionData);
      }).toThrow(WorkflowError);
    });
  });

  describe('Workflow Queries', () => {
    beforeEach(() => {
      // Create multiple workflows for testing
      workflowEngine.initializeWorkflow('PANEL_001', 'CRS24F1236', 1);
      workflowEngine.initializeWorkflow('PANEL_002', 'CRS24F1237', 1);
      workflowEngine.initializeWorkflow('PANEL_003', 'CRS24F1238', 2);
    });

    it('should get all active workflows', () => {
      const activeWorkflows = workflowEngine.getActiveWorkflows();
      expect(activeWorkflows).toHaveLength(3);
      expect(activeWorkflows[0].panelId).toBe('PANEL_001');
      expect(activeWorkflows[1].panelId).toBe('PANEL_002');
      expect(activeWorkflows[2].panelId).toBe('PANEL_003');
    });

    it('should get workflows by status', () => {
      const activeWorkflows = workflowEngine.getWorkflowsByStatus('ACTIVE');
      expect(activeWorkflows).toHaveLength(3);
    });

    it('should get workflows by station', () => {
      // Move panels to different stations
      workflowEngine.transitionWorkflow('PANEL_001', WORKFLOW_STATES.VALIDATED);
      workflowEngine.transitionWorkflow('PANEL_001', WORKFLOW_STATES.ASSEMBLY_EL);
      
      const stationWorkflows = workflowEngine.getWorkflowsByStation('STATION_1');
      expect(stationWorkflows).toHaveLength(1);
      expect(stationWorkflows[0].panelId).toBe('PANEL_001');
    });
  });

  describe('Edge Cases', () => {
    it('should handle workflow with no transitions gracefully', () => {
      expect(workflowEngine.getNextState(WORKFLOW_STATES.COMPLETED)).toBe(null);
    });

    it('should calculate progress for non-standard states', () => {
      expect(workflowEngine.calculateProgress(WORKFLOW_STATES.SCANNED)).toBe(0);
      expect(workflowEngine.calculateProgress(WORKFLOW_STATES.COMPLETED)).toBe(100);
      expect(workflowEngine.calculateProgress('UNKNOWN_STATE')).toBe(0);
    });

    it('should handle empty criteria gracefully', () => {
      const validationResult = workflowEngine.validateInspectionCriteria(
        { required: [], optional: [], passThreshold: 0.95, notesRequired: false },
        {},
        'PASS'
      );
      
      expect(validationResult.qualityScore).toBe(100);
      expect(validationResult.isValid).toBe(true);
    });
  });
});
