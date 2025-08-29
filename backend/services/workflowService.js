#!/usr/bin/env node

/**
 * Station Workflow Engine Service
 * 
 * Core workflow engine that handles station-specific processes, pass/fail criteria validation,
 * automatic checkbox marking for pass, failure criteria selection for fail, and note
 * requirements for F/B panels.
 * 
 * Features:
 * - Workflow state machine with defined transitions
 * - Pass/fail validation engine with station-specific criteria
 * - Automatic workflow progression and routing
 * - Quality criteria management and validation
 * - Workflow history tracking and audit trail
 */

import { WorkflowError } from '../middleware/errorHandler.js';
import { successResponse, errorResponse, stationWorkflowResponse } from '../utils/responseUtils.js';

/**
 * Workflow States and Transitions
 */
export const WORKFLOW_STATES = {
  // Initial states
  SCANNED: 'SCANNED',                    // Panel scanned at station
  VALIDATED: 'VALIDATED',                // Barcode validated and assigned
  
  // Station-specific states
  ASSEMBLY_EL: 'ASSEMBLY_EL',            // Station 1: Assembly & EL
  FRAMING: 'FRAMING',                    // Station 2: Framing
  JUNCTION_BOX: 'JUNCTION_BOX',          // Station 3: Junction Box
  PERFORMANCE_FINAL: 'PERFORMANCE_FINAL', // Station 4: Performance & Final Inspection
  
  // Final states
  COMPLETED: 'COMPLETED',                // Panel completed successfully
  FAILED: 'FAILED',                      // Panel failed inspection
  REWORK: 'REWORK',                      // Panel sent for rework
  QUARANTINE: 'QUARANTINE'               // Panel quarantined for review
};

/**
 * Valid workflow transitions
 */
export const WORKFLOW_TRANSITIONS = {
  [WORKFLOW_STATES.SCANNED]: [WORKFLOW_STATES.VALIDATED, WORKFLOW_STATES.FAILED],
  [WORKFLOW_STATES.VALIDATED]: [WORKFLOW_STATES.ASSEMBLY_EL, WORKFLOW_STATES.FAILED],
  [WORKFLOW_STATES.ASSEMBLY_EL]: [WORKFLOW_STATES.FRAMING, WORKFLOW_STATES.FAILED, WORKFLOW_STATES.REWORK],
  [WORKFLOW_STATES.FRAMING]: [WORKFLOW_STATES.JUNCTION_BOX, WORKFLOW_STATES.FAILED, WORKFLOW_STATES.REWORK],
  [WORKFLOW_STATES.JUNCTION_BOX]: [WORKFLOW_STATES.PERFORMANCE_FINAL, WORKFLOW_STATES.FAILED, WORKFLOW_STATES.REWORK],
  [WORKFLOW_STATES.PERFORMANCE_FINAL]: [WORKFLOW_STATES.COMPLETED, WORKFLOW_STATES.FAILED, WORKFLOW_STATES.REWORK, WORKFLOW_STATES.QUARANTINE],
  [WORKFLOW_STATES.FAILED]: [WORKFLOW_STATES.REWORK, WORKFLOW_STATES.QUARANTINE],
  [WORKFLOW_STATES.REWORK]: [WORKFLOW_STATES.ASSEMBLY_EL, WORKFLOW_STATES.FRAMING, WORKFLOW_STATES.JUNCTION_BOX, WORKFLOW_STATES.PERFORMANCE_FINAL],
  [WORKFLOW_STATES.QUARANTINE]: [WORKFLOW_STATES.REWORK, WORKFLOW_STATES.FAILED],
  [WORKFLOW_STATES.COMPLETED]: [] // Terminal state
};

/**
 * Station-specific workflow configurations
 */
export const STATION_CONFIGS = {
  STATION_1: {
    name: 'Assembly & EL',
    workflowStep: WORKFLOW_STATES.ASSEMBLY_EL,
    nextStep: WORKFLOW_STATES.FRAMING,
    criteria: {
      required: ['cellAlignment', 'electricalConnection', 'visualInspection'],
      optional: ['cellCount', 'stringCount', 'voltageCheck'],
      passThreshold: 0.95, // 95% of required criteria must pass
      notesRequired: false
    }
  },
  STATION_2: {
    name: 'Framing',
    workflowStep: WORKFLOW_STATES.FRAMING,
    nextStep: WORKFLOW_STATES.JUNCTION_BOX,
    criteria: {
      required: ['frameAlignment', 'cornerSeals', 'mountingHoles'],
      optional: ['frameType', 'cornerType', 'sealQuality'],
      passThreshold: 0.95,
      notesRequired: false
    }
  },
  STATION_3: {
    name: 'Junction Box',
    workflowStep: WORKFLOW_STATES.JUNCTION_BOX,
    nextStep: WORKFLOW_STATES.PERFORMANCE_FINAL,
    criteria: {
      required: ['boxAlignment', 'cableRouting', 'sealIntegrity'],
      optional: ['boxType', 'cableType', 'connectorType'],
      passThreshold: 0.95,
      notesRequired: false
    }
  },
  STATION_4: {
    name: 'Performance & Final Inspection',
    workflowStep: WORKFLOW_STATES.PERFORMANCE_FINAL,
    nextStep: WORKFLOW_STATES.COMPLETED,
    criteria: {
      required: ['powerOutput', 'voltageCheck', 'currentCheck', 'efficiencyTest'],
      optional: ['temperatureCoefficient', 'irradianceResponse', 'spectralResponse'],
      passThreshold: 0.98, // Higher threshold for final inspection
      notesRequired: true // Notes required for final inspection
    }
  }
};

/**
 * Quality criteria definitions for each station
 */
export const QUALITY_CRITERIA = {
  // Station 1: Assembly & EL
  cellAlignment: {
    name: 'Cell Alignment',
    description: 'Solar cells are properly aligned within tolerance',
    type: 'boolean',
    required: true,
    passValue: true
  },
  electricalConnection: {
    name: 'Electrical Connection',
    description: 'Electrical connections are secure and properly soldered',
    type: 'boolean',
    required: true,
    passValue: true
  },
  visualInspection: {
    name: 'Visual Inspection',
    description: 'No visible defects, cracks, or contamination',
    type: 'boolean',
    required: true,
    passValue: true
  },
  cellCount: {
    name: 'Cell Count',
    description: 'Correct number of cells for panel type',
    type: 'number',
    required: false,
    passValue: null // Will be validated against panel type
  },
  
  // Station 2: Framing
  frameAlignment: {
    name: 'Frame Alignment',
    description: 'Frame is properly aligned with panel edges',
    type: 'boolean',
    required: true,
    passValue: true
  },
  cornerSeals: {
    name: 'Corner Seals',
    description: 'Corner seals are properly applied and sealed',
    type: 'boolean',
    required: true,
    passValue: true
  },
  mountingHoles: {
    name: 'Mounting Holes',
    description: 'Mounting holes are properly drilled and positioned',
    type: 'boolean',
    required: true,
    passValue: true
  },
  
  // Station 3: Junction Box
  boxAlignment: {
    name: 'Box Alignment',
    description: 'Junction box is properly positioned and aligned',
    type: 'boolean',
    required: true,
    passValue: true
  },
  cableRouting: {
    name: 'Cable Routing',
    description: 'Cables are properly routed and secured',
    type: 'boolean',
    required: true,
    passValue: true
  },
  sealIntegrity: {
    name: 'Seal Integrity',
    description: 'Junction box seal is intact and waterproof',
    type: 'boolean',
    required: true,
    passValue: true
  },
  
  // Station 4: Performance & Final Inspection
  powerOutput: {
    name: 'Power Output',
    description: 'Power output meets specification requirements',
    type: 'number',
    required: true,
    passValue: null, // Will be validated against panel type specs
    unit: 'W',
    tolerance: 0.05 // 5% tolerance
  },
  voltageCheck: {
    name: 'Voltage Check',
    description: 'Open circuit voltage within specification',
    type: 'number',
    required: true,
    passValue: null,
    unit: 'V',
    tolerance: 0.03 // 3% tolerance
  },
  currentCheck: {
    name: 'Current Check',
    description: 'Short circuit current within specification',
    type: 'number',
    required: true,
    passValue: null,
    unit: 'A',
    tolerance: 0.05 // 5% tolerance
  },
  efficiencyTest: {
    name: 'Efficiency Test',
    description: 'Panel efficiency meets minimum requirements',
    type: 'number',
    required: true,
    passValue: 0.18, // Minimum 18% efficiency
    unit: '%',
    tolerance: 0.01 // 1% tolerance
  }
};

/**
 * Workflow Engine Class
 */
export class WorkflowEngine {
  constructor() {
    this.workflowHistory = new Map(); // panelId -> workflow history
    this.activeWorkflows = new Map(); // panelId -> current workflow state
  }

  /**
   * Initialize workflow for a new panel
   * @param {string} panelId - Panel identifier
   * @param {string} barcode - Panel barcode
   * @param {number} lineNumber - Production line number
   * @returns {Object} Initialized workflow state
   */
  initializeWorkflow(panelId, barcode, lineNumber) {
    if (this.activeWorkflows.has(panelId)) {
      throw new WorkflowError(
        'Panel workflow already exists',
        panelId,
        'INITIALIZE',
        'DUPLICATE_WORKFLOW'
      );
    }

    const initialState = {
      panelId,
      barcode,
      lineNumber,
      currentState: WORKFLOW_STATES.SCANNED,
      previousState: null,
      nextState: WORKFLOW_STATES.VALIDATED,
      stationId: null,
      operatorId: null,
      startTime: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      workflowProgress: 0,
      qualityScore: null,
      criteria: {},
      notes: [],
      status: 'ACTIVE'
    };

    this.activeWorkflows.set(panelId, initialState);
    this.workflowHistory.set(panelId, [{
      timestamp: new Date().toISOString(),
      action: 'WORKFLOW_INITIALIZED',
      fromState: null,
      toState: WORKFLOW_STATES.SCANNED,
      details: { barcode, lineNumber }
    }]);

    return { ...initialState };
  }

  /**
   * Validate workflow transition
   * @param {string} panelId - Panel identifier
   * @param {string} newState - Target workflow state
   * @returns {boolean} True if transition is valid
   */
  validateTransition(panelId, newState) {
    const currentWorkflow = this.activeWorkflows.get(panelId);
    if (!currentWorkflow) {
      throw new WorkflowError(
        'Panel workflow not found',
        panelId,
        'VALIDATE_TRANSITION',
        'WORKFLOW_NOT_FOUND'
      );
    }

    const currentState = currentWorkflow.currentState;
    const allowedTransitions = WORKFLOW_TRANSITIONS[currentState] || [];

    if (!allowedTransitions.includes(newState)) {
      throw new WorkflowError(
        `Invalid transition from ${currentState} to ${newState}`,
        panelId,
        currentState,
        'INVALID_TRANSITION',
        { allowedTransitions, attemptedTransition: newState }
      );
    }

    return true;
  }

  /**
   * Transition workflow to new state
   * @param {string} panelId - Panel identifier
   * @param {string} newState - Target workflow state
   * @param {Object} transitionData - Additional transition data
   * @returns {Object} Updated workflow state
   */
  transitionWorkflow(panelId, newState, transitionData = {}) {
    this.validateTransition(panelId, newState);

    const currentWorkflow = this.activeWorkflows.get(panelId);
    const previousState = currentWorkflow.currentState;

    // Calculate workflow progress
    const workflowSteps = [WORKFLOW_STATES.ASSEMBLY_EL, WORKFLOW_STATES.FRAMING, WORKFLOW_STATES.JUNCTION_BOX, WORKFLOW_STATES.PERFORMANCE_FINAL];
    const currentIndex = workflowSteps.indexOf(newState);
    const workflowProgress = currentIndex >= 0 ? ((currentIndex + 1) / workflowSteps.length) * 100 : 0;

    // Update workflow state
    const updatedWorkflow = {
      ...currentWorkflow,
      previousState,
      currentState: newState,
      nextState: this.getNextState(newState),
      lastUpdate: new Date().toISOString(),
      workflowProgress,
      stationId: transitionData.stationId || currentWorkflow.stationId,
      operatorId: transitionData.operatorId || currentWorkflow.operatorId,
      qualityScore: transitionData.qualityScore || currentWorkflow.qualityScore,
      criteria: { ...currentWorkflow.criteria, ...transitionData.criteria },
      notes: [...currentWorkflow.notes, ...(transitionData.notes || [])]
    };

    this.activeWorkflows.set(panelId, updatedWorkflow);

    // Add to history
    const historyEntry = {
      timestamp: new Date().toISOString(),
      action: 'STATE_TRANSITION',
      fromState: previousState,
      toState: newState,
      details: transitionData
    };

    this.workflowHistory.get(panelId).push(historyEntry);

    return { ...updatedWorkflow };
  }

  /**
   * Get next valid state for current workflow state
   * @param {string} currentState - Current workflow state
   * @returns {string|null} Next workflow state or null if terminal
   */
  getNextState(currentState) {
    const transitions = WORKFLOW_TRANSITIONS[currentState] || [];
    // Filter out failure states for normal progression
    const normalProgression = transitions.filter(state => 
      ![WORKFLOW_STATES.FAILED, WORKFLOW_STATES.REWORK, WORKFLOW_STATES.QUARANTINE].includes(state)
    );
    return normalProgression[0] || null;
  }

  /**
   * Process inspection results and determine workflow outcome
   * @param {string} panelId - Panel identifier
   * @param {string} stationId - Station identifier
   * @param {Object} inspectionData - Inspection results
   * @returns {Object} Workflow outcome and next actions
   */
  processInspection(panelId, stationId, inspectionData) {
    const currentWorkflow = this.activeWorkflows.get(panelId);
    if (!currentWorkflow) {
      throw new WorkflowError(
        'Panel workflow not found',
        panelId,
        'PROCESS_INSPECTION',
        'WORKFLOW_NOT_FOUND'
      );
    }

    const stationConfig = STATION_CONFIGS[stationId];
    if (!stationConfig) {
      throw new WorkflowError(
        'Invalid station configuration',
        panelId,
        currentWorkflow.currentState,
        'INVALID_STATION'
      );
    }

    // Validate inspection data against station criteria
    const validationResult = this.validateInspectionCriteria(
      stationConfig.criteria,
      inspectionData.criteria,
      inspectionData.result
    );

    // Determine workflow outcome
    let nextState;
    let workflowOutcome;

    if (inspectionData.result === 'PASS' && validationResult.isValid) {
      nextState = stationConfig.nextStep;
      workflowOutcome = {
        result: 'PASS',
        nextState,
        workflowProgress: this.calculateProgress(nextState),
        qualityScore: validationResult.qualityScore,
        message: 'Inspection passed, proceeding to next station'
      };
    } else if (inspectionData.result === 'FAIL') {
      nextState = WORKFLOW_STATES.FAILED;
      workflowOutcome = {
        result: 'FAIL',
        nextState,
        failureReasons: validationResult.failureReasons,
        requiredActions: validationResult.requiredActions,
        message: 'Inspection failed, panel requires rework or quarantine'
      };
    } else {
      throw new WorkflowError(
        'Invalid inspection result or criteria validation failed',
        panelId,
        currentWorkflow.currentState,
        'INVALID_INSPECTION'
      );
    }

    // Transition workflow
    const transitionData = {
      stationId,
      operatorId: inspectionData.operatorId,
      qualityScore: validationResult.qualityScore,
      criteria: inspectionData.criteria,
      notes: inspectionData.notes || [],
      inspectionResult: inspectionData.result,
      failureReasons: validationResult.failureReasons
    };

    const updatedWorkflow = this.transitionWorkflow(panelId, nextState, transitionData);

    return {
      workflow: updatedWorkflow,
      outcome: workflowOutcome,
      nextActions: this.getNextActions(nextState, validationResult)
    };
  }

  /**
   * Validate inspection criteria against station requirements
   * @param {Object} stationCriteria - Station criteria configuration
   * @param {Object} inspectionCriteria - Actual inspection results
   * @param {string} result - Inspection result (PASS/FAIL)
   * @returns {Object} Validation result with quality score and failure details
   */
  validateInspectionCriteria(stationCriteria, inspectionCriteria, result) {
    const requiredCriteria = stationCriteria.required;
    const optionalCriteria = stationCriteria.optional;
    const passThreshold = stationCriteria.passThreshold;

    let passedCriteria = 0;
    let totalCriteria = requiredCriteria.length;
    let failureReasons = [];
    let qualityScore = 0;

    // Validate required criteria
    for (const criterion of requiredCriteria) {
      const criterionResult = inspectionCriteria[criterion];
      if (criterionResult === true || criterionResult === 'PASS') {
        passedCriteria++;
      } else {
        failureReasons.push({
          criterion,
          reason: `Required criterion '${criterion}' failed`,
          value: criterionResult
        });
      }
    }

    // Calculate quality score
    qualityScore = (passedCriteria / totalCriteria) * 100;

    // Check if pass threshold is met
    const isValid = qualityScore >= (passThreshold * 100);

    // Validate notes requirement for FAIL results
    if (result === 'FAIL' && stationCriteria.notesRequired) {
      if (!inspectionCriteria.notes || inspectionCriteria.notes.trim().length === 0) {
        failureReasons.push({
          criterion: 'notes',
          reason: 'Notes are required for FAIL results',
          value: inspectionCriteria.notes
        });
        isValid = false;
      }
    }

    return {
      isValid,
      qualityScore: Math.round(qualityScore * 100) / 100,
      passedCriteria,
      totalCriteria,
      failureReasons,
      requiredActions: this.getRequiredActions(failureReasons)
    };
  }

  /**
   * Get required actions based on failure reasons
   * @param {Array} failureReasons - List of failure reasons
   * @returns {Array} Required actions to resolve failures
   */
  getRequiredActions(failureReasons) {
    const actions = [];
    
    for (const failure of failureReasons) {
      switch (failure.criterion) {
        case 'cellAlignment':
          actions.push('Realign solar cells within tolerance');
          break;
        case 'electricalConnection':
          actions.push('Re-solder electrical connections');
          break;
        case 'frameAlignment':
          actions.push('Realign frame with panel edges');
          break;
        case 'powerOutput':
          actions.push('Investigate power output deviation');
          break;
        case 'notes':
          actions.push('Provide detailed failure description');
          break;
        default:
          actions.push(`Review and correct ${failure.criterion} issue`);
      }
    }

    return actions;
  }

  /**
   * Calculate workflow progress percentage
   * @param {string} currentState - Current workflow state
   * @returns {number} Progress percentage (0-100)
   */
  calculateProgress(currentState) {
    const workflowSteps = [WORKFLOW_STATES.ASSEMBLY_EL, WORKFLOW_STATES.FRAMING, WORKFLOW_STATES.JUNCTION_BOX, WORKFLOW_STATES.PERFORMANCE_FINAL];
    const currentIndex = workflowSteps.indexOf(currentState);
    
    if (currentIndex === -1) {
      return currentState === WORKFLOW_STATES.COMPLETED ? 100 : 0;
    }
    
    return ((currentIndex + 1) / workflowSteps.length) * 100;
  }

  /**
   * Get next actions based on workflow state
   * @param {string} workflowState - Current workflow state
   * @param {Object} validationResult - Validation result
   * @returns {Array} List of next actions
   */
  getNextActions(workflowState, validationResult) {
    const actions = [];

    switch (workflowState) {
      case WORKFLOW_STATES.COMPLETED:
        actions.push('Panel completed successfully');
        actions.push('Ready for packaging and shipping');
        break;
      case WORKFLOW_STATES.FAILED:
        actions.push('Review failure reasons');
        actions.push('Determine rework or quarantine path');
        if (validationResult.requiredActions) {
          actions.push(...validationResult.requiredActions);
        }
        break;
      case WORKFLOW_STATES.REWORK:
        actions.push('Send panel to appropriate rework station');
        actions.push('Update workflow tracking');
        break;
      case WORKFLOW_STATES.QUARANTINE:
        actions.push('Place panel in quarantine area');
        actions.push('Schedule quality review');
        break;
      default:
        actions.push('Proceed to next station');
        actions.push('Update workflow status');
    }

    return actions;
  }

  /**
   * Get current workflow state for a panel
   * @param {string} panelId - Panel identifier
   * @returns {Object} Current workflow state
   */
  getWorkflowState(panelId) {
    const workflow = this.activeWorkflows.get(panelId);
    if (!workflow) {
      throw new WorkflowError(
        'Panel workflow not found',
        panelId,
        'GET_STATE',
        'WORKFLOW_NOT_FOUND'
      );
    }
    return { ...workflow };
  }

  /**
   * Get workflow history for a panel
   * @param {string} panelId - Panel identifier
   * @returns {Array} Workflow history
   */
  getWorkflowHistory(panelId) {
    const history = this.workflowHistory.get(panelId);
    if (!history) {
      throw new WorkflowError(
        'Panel workflow history not found',
        panelId,
        'GET_HISTORY',
        'HISTORY_NOT_FOUND'
      );
    }
    return [...history];
  }

  /**
   * Get all active workflows
   * @returns {Array} List of active workflows
   */
  getActiveWorkflows() {
    return Array.from(this.activeWorkflows.values()).map(workflow => ({ ...workflow }));
  }

  /**
   * Get workflows by status
   * @param {string} status - Workflow status filter
   * @returns {Array} Filtered workflows
   */
  getWorkflowsByStatus(status) {
    return Array.from(this.activeWorkflows.values())
      .filter(workflow => workflow.status === status)
      .map(workflow => ({ ...workflow }));
  }

  /**
   * Get workflows by station
   * @param {string} stationId - Station identifier
   * @returns {Array} Workflows at specified station
   */
  getWorkflowsByStation(stationId) {
    return Array.from(this.activeWorkflows.values())
      .filter(workflow => workflow.stationId === stationId)
      .map(workflow => ({ ...workflow }));
  }

  /**
   * Complete workflow for a panel
   * @param {string} panelId - Panel identifier
   * @param {Object} completionData - Completion data
   * @returns {Object} Completed workflow
   */
  completeWorkflow(panelId, completionData = {}) {
    const currentWorkflow = this.activeWorkflows.get(panelId);
    if (!currentWorkflow) {
      throw new WorkflowError(
        'Panel workflow not found',
        panelId,
        'COMPLETE',
        'WORKFLOW_NOT_FOUND'
      );
    }

    if (currentWorkflow.currentState !== WORKFLOW_STATES.PERFORMANCE_FINAL) {
      throw new WorkflowError(
        'Panel must be at final inspection to complete workflow',
        panelId,
        currentWorkflow.currentState,
        'INVALID_COMPLETION_STATE'
      );
    }

    const completedWorkflow = this.transitionWorkflow(panelId, WORKFLOW_STATES.COMPLETED, {
      ...completionData,
      completionTime: new Date().toISOString(),
      finalQualityScore: completionData.qualityScore || currentWorkflow.qualityScore
    });

    // Mark workflow as completed
    completedWorkflow.status = 'COMPLETED';
    this.activeWorkflows.set(panelId, completedWorkflow);

    return { ...completedWorkflow };
  }

  /**
   * Reset workflow for rework
   * @param {string} panelId - Panel identifier
   * @param {string} targetStation - Target station for rework
   * @param {Object} reworkData - Rework data
   * @returns {Object} Reset workflow
   */
  resetWorkflowForRework(panelId, targetStation, reworkData = {}) {
    const currentWorkflow = this.activeWorkflows.get(panelId);
    if (!currentWorkflow) {
      throw new WorkflowError(
        'Panel workflow not found',
        panelId,
        'RESET_FOR_REWORK',
        'WORKFLOW_NOT_FOUND'
      );
    }

    // Determine target workflow state based on station
    let targetState;
    switch (targetStation) {
      case 'STATION_1':
        targetState = WORKFLOW_STATES.ASSEMBLY_EL;
        break;
      case 'STATION_2':
        targetState = WORKFLOW_STATES.FRAMING;
        break;
      case 'STATION_3':
        targetState = WORKFLOW_STATES.JUNCTION_BOX;
        break;
      case 'STATION_4':
        targetState = WORKFLOW_STATES.PERFORMANCE_FINAL;
        break;
      default:
        throw new WorkflowError(
          'Invalid target station for rework',
          panelId,
          currentWorkflow.currentState,
          'INVALID_REWORK_STATION'
        );
    }

    // Reset workflow to target state
    const resetWorkflow = {
      ...currentWorkflow,
      currentState: targetState,
      previousState: currentWorkflow.currentState,
      nextState: this.getNextState(targetState),
      lastUpdate: new Date().toISOString(),
      workflowProgress: this.calculateProgress(targetState),
      status: 'ACTIVE',
      reworkCount: (currentWorkflow.reworkCount || 0) + 1,
      reworkReason: reworkData.reason,
      reworkNotes: reworkData.notes || []
    };

    this.activeWorkflows.set(panelId, resetWorkflow);

    // Add to history
    const historyEntry = {
      timestamp: new Date().toISOString(),
      action: 'REWORK_RESET',
      fromState: currentWorkflow.currentState,
      toState: targetState,
      details: { targetStation, ...reworkData }
    };

    this.workflowHistory.get(panelId).push(historyEntry);

    return { ...resetWorkflow };
  }
}

// Create singleton instance
const workflowEngine = new WorkflowEngine();

export default workflowEngine;
