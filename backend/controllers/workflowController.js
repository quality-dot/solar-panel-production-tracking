/**
 * Workflow Controller
 * 
 * Handles all workflow-related API endpoints including:
 * - Panel workflow initialization
 * - Station transitions
 * - Inspection processing
 * - Workflow state management
 * - Queue management
 */

import { WorkflowError } from '../middleware/errorHandler.js';
import { successResponse, errorResponse } from '../utils/responseUtils.js';
import { manufacturingLogger } from '../middleware/logger.js';
import workflowEngine from '../services/workflowService.js';
import workflowStateMachine from '../services/workflowStateMachine.js';
import databaseManager from '../config/database.js';

/**
 * Initialize workflow for a new panel
 * @route POST /api/v1/workflow/initialize
 */
export const initializeWorkflow = async (req, res) => {
  try {
    const { panelId, barcode, lineNumber } = req.body;

    // Validate required fields
    if (!panelId || !barcode || !lineNumber) {
      return errorResponse(res, 400, 'Missing required fields', {
        required: ['panelId', 'barcode', 'lineNumber'],
        received: { panelId, barcode, lineNumber }
      });
    }

    // Validate line number
    if (![1, 2].includes(lineNumber)) {
      return errorResponse(res, 400, 'Invalid line number', {
        validValues: [1, 2],
        received: lineNumber
      });
    }

    // Initialize workflow in both engines
    const workflowState = workflowEngine.initializeWorkflow(panelId, barcode, lineNumber);
    const stateMachineState = workflowStateMachine.initializePanel(panelId, barcode, barcode.slice(-3));

    // Log workflow initialization
    manufacturingLogger.info('Workflow initialized', {
      panelId,
      barcode,
      lineNumber,
      workflowState: workflowState.currentState,
      stateMachineState: stateMachineState.currentState
    });

    return successResponse(res, 201, 'Workflow initialized successfully', {
      workflow: workflowState,
      stateMachine: stateMachineState
    });

  } catch (error) {
    manufacturingLogger.error('Workflow initialization failed', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });

    if (error instanceof WorkflowError) {
      return errorResponse(res, 400, error.message, {
        code: error.code,
        details: error.details
      });
    }

    return errorResponse(res, 500, 'Internal server error', {
      error: error.message
    });
  }
};

/**
 * Process inspection results and transition workflow
 * @route POST /api/v1/workflow/inspect
 */
export const processInspection = async (req, res) => {
  try {
    const { panelId, stationId, result, criteria, notes, wattage, operatorId } = req.body;

    // Validate required fields
    if (!panelId || !stationId || !result || !criteria) {
      return errorResponse(res, 400, 'Missing required fields', {
        required: ['panelId', 'stationId', 'result', 'criteria'],
        received: { panelId, stationId, result, criteria }
      });
    }

    // Validate result
    if (!['PASS', 'FAIL'].includes(result)) {
      return errorResponse(res, 400, 'Invalid result', {
        validValues: ['PASS', 'FAIL'],
        received: result
      });
    }

    // Validate notes for FAIL results
    if (result === 'FAIL' && (!notes || notes.trim().length === 0)) {
      return errorResponse(res, 400, 'Notes required for FAIL results');
    }

    // Validate wattage for Station 4
    if (stationId === 'STATION_4' && (!wattage || isNaN(wattage))) {
      return errorResponse(res, 400, 'Wattage required for Station 4', {
        received: wattage
      });
    }

    // Prepare inspection data
    const inspectionData = {
      result,
      criteria,
      notes: notes || '',
      operatorId: operatorId || req.user?.id,
      wattage: stationId === 'STATION_4' ? parseFloat(wattage) : null
    };

    // Process inspection through workflow engine
    const workflowResult = workflowEngine.processInspection(panelId, stationId, inspectionData);

    // Update state machine if workflow succeeded
    if (workflowResult.outcome.result === 'PASS') {
      workflowStateMachine.transitionPanel(panelId, 'PASSED', 'Inspection passed', {
        stationId,
        qualityData: workflowResult.outcome.qualityScore,
        notes: inspectionData.notes
      });
    } else if (workflowResult.outcome.result === 'FAIL') {
      workflowStateMachine.transitionPanel(panelId, 'FAILED', 'Inspection failed', {
        stationId,
        failureReason: workflowResult.outcome.failureReasons,
        notes: inspectionData.notes
      });
    }

    // Log inspection processing
    manufacturingLogger.info('Inspection processed', {
      panelId,
      stationId,
      result,
      qualityScore: workflowResult.outcome.qualityScore,
      nextState: workflowResult.outcome.nextState
    });

    return successResponse(res, 200, 'Inspection processed successfully', {
      workflow: workflowResult.workflow,
      outcome: workflowResult.outcome,
      nextActions: workflowResult.nextActions
    });

  } catch (error) {
    manufacturingLogger.error('Inspection processing failed', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });

    if (error instanceof WorkflowError) {
      return errorResponse(res, 400, error.message, {
        code: error.code,
        details: error.details
      });
    }

    return errorResponse(res, 500, 'Internal server error', {
      error: error.message
    });
  }
};

/**
 * Get current workflow state for a panel
 * @route GET /api/v1/workflow/:panelId
 */
export const getWorkflowState = async (req, res) => {
  try {
    const { panelId } = req.params;

    if (!panelId) {
      return errorResponse(res, 400, 'Panel ID required');
    }

    // Get workflow state from both engines
    const workflowState = workflowEngine.getWorkflowState(panelId);
    const stateMachineState = workflowStateMachine.getPanelState(panelId);

    // Get workflow history
    const workflowHistory = workflowEngine.getWorkflowHistory(panelId);
    const transitionHistory = workflowStateMachine.getPanelTransitionHistory(panelId);

    return successResponse(res, 200, 'Workflow state retrieved successfully', {
      workflow: workflowState,
      stateMachine: stateMachineState,
      history: {
        workflow: workflowHistory,
        transitions: transitionHistory
      }
    });

  } catch (error) {
    manufacturingLogger.error('Failed to get workflow state', {
      error: error.message,
      stack: error.stack,
      panelId: req.params.panelId
    });

    if (error instanceof WorkflowError) {
      return errorResponse(res, 404, error.message, {
        code: error.code
      });
    }

    return errorResponse(res, 500, 'Internal server error', {
      error: error.message
    });
  }
};

/**
 * Get all active workflows
 * @route GET /api/v1/workflow
 */
export const getActiveWorkflows = async (req, res) => {
  try {
    const { status, stationId, lineNumber } = req.query;

    // Get active workflows from workflow engine
    let workflows = workflowEngine.getActiveWorkflows();

    // Apply filters
    if (status) {
      workflows = workflows.filter(w => w.status === status);
    }

    if (stationId) {
      workflows = workflows.filter(w => w.stationId === stationId);
    }

    if (lineNumber) {
      workflows = workflows.filter(w => w.lineNumber === parseInt(lineNumber));
    }

    // Get workflow statistics
    const statistics = workflowStateMachine.getWorkflowStatistics();

    return successResponse(res, 200, 'Active workflows retrieved successfully', {
      workflows,
      statistics,
      filters: { status, stationId, lineNumber },
      total: workflows.length
    });

  } catch (error) {
    manufacturingLogger.error('Failed to get active workflows', {
      error: error.message,
      stack: error.stack,
      query: req.query
    });

    return errorResponse(res, 500, 'Internal server error', {
      error: error.message
    });
  }
};

/**
 * Get station queue
 * @route GET /api/v1/workflow/station/:stationId/queue
 */
export const getStationQueue = async (req, res) => {
  try {
    const { stationId } = req.params;
    const { limit = 10, status = 'pending' } = req.query;

    if (!stationId) {
      return errorResponse(res, 400, 'Station ID required');
    }

    // Get queue from state machine
    const queue = workflowStateMachine.getStationQueue(stationId);
    
    // Get workflow details for each panel in queue
    const queueDetails = await Promise.all(
      queue.slice(0, parseInt(limit)).map(async (panelId) => {
        try {
          const workflowState = workflowEngine.getWorkflowState(panelId);
          const stateMachineState = workflowStateMachine.getPanelState(panelId);
          
          return {
            panelId,
            barcode: stateMachineState?.barcode,
            panelType: stateMachineState?.panelType,
            currentState: workflowState.currentState,
            workflowProgress: workflowState.workflowProgress,
            queuedAt: stateMachineState?.startTime,
            priority: queue.indexOf(panelId) + 1
          };
        } catch (error) {
          // Panel might have been removed from workflow
          return {
            panelId,
            error: 'Panel not found in workflow'
          };
        }
      })
    );

    // Filter by status if specified
    const filteredQueue = status === 'all' 
      ? queueDetails 
      : queueDetails.filter(panel => panel.currentState === status.toUpperCase());

    return successResponse(res, 200, 'Station queue retrieved successfully', {
      stationId,
      queue: filteredQueue,
      totalInQueue: queue.length,
      limit: parseInt(limit),
      status
    });

  } catch (error) {
    manufacturingLogger.error('Failed to get station queue', {
      error: error.message,
      stack: error.stack,
      stationId: req.params.stationId,
      query: req.query
    });

    return errorResponse(res, 500, 'Internal server error', {
      error: error.message
    });
  }
};

/**
 * Transition workflow to a specific state
 * @route POST /api/v1/workflow/:panelId/transition
 */
export const transitionWorkflow = async (req, res) => {
  try {
    const { panelId } = req.params;
    const { newState, reason, additionalData } = req.body;

    if (!panelId || !newState) {
      return errorResponse(res, 400, 'Missing required fields', {
        required: ['newState'],
        received: { newState }
      });
    }

    // Validate transition in workflow engine
    workflowEngine.validateTransition(panelId, newState);

    // Perform transition in workflow engine
    const updatedWorkflow = workflowEngine.transitionWorkflow(panelId, newState, {
      reason,
      ...additionalData
    });

    // Update state machine if needed
    if (['PASSED', 'FAILED', 'REWORK_NEEDED', 'COMPLETED'].includes(newState)) {
      workflowStateMachine.transitionPanel(panelId, newState, reason || 'Manual transition', additionalData);
    }

    // Log transition
    manufacturingLogger.info('Workflow transitioned manually', {
      panelId,
      newState,
      reason,
      operatorId: req.user?.id
    });

    return successResponse(res, 200, 'Workflow transitioned successfully', {
      workflow: updatedWorkflow
    });

  } catch (error) {
    manufacturingLogger.error('Workflow transition failed', {
      error: error.message,
      stack: error.stack,
      panelId: req.params.panelId,
      body: req.body
    });

    if (error instanceof WorkflowError) {
      return errorResponse(res, 400, error.message, {
        code: error.code,
        details: error.details
      });
    }

    return errorResponse(res, 500, 'Internal server error', {
      error: error.message
    });
  }
};

/**
 * Reset workflow for rework
 * @route POST /api/v1/workflow/:panelId/reset-rework
 */
export const resetWorkflowForRework = async (req, res) => {
  try {
    const { panelId } = req.params;
    const { targetStation, reason, notes } = req.body;

    if (!panelId || !targetStation || !reason) {
      return errorResponse(res, 400, 'Missing required fields', {
        required: ['targetStation', 'reason'],
        received: { targetStation, reason }
      });
    }

    // Reset workflow in workflow engine
    const resetWorkflow = workflowEngine.resetWorkflowForRework(panelId, targetStation, {
      reason,
      notes: notes || []
    });

    // Update state machine
    workflowStateMachine.transitionPanel(panelId, 'REWORK_NEEDED', reason, {
      reworkStation: targetStation,
      reworkReason: reason
    });

    // Log rework reset
    manufacturingLogger.info('Workflow reset for rework', {
      panelId,
      targetStation,
      reason,
      operatorId: req.user?.id
    });

    return successResponse(res, 200, 'Workflow reset for rework successfully', {
      workflow: resetWorkflow
    });

  } catch (error) {
    manufacturingLogger.error('Workflow rework reset failed', {
      error: error.message,
      stack: error.stack,
      panelId: req.params.panelId,
      body: req.body
    });

    if (error instanceof WorkflowError) {
      return errorResponse(res, 400, error.message, {
        code: error.code,
        details: error.details
      });
    }

    return errorResponse(res, 500, 'Internal server error', {
      error: error.message
    });
  }
};

/**
 * Complete workflow for a panel
 * @route POST /api/v1/workflow/:panelId/complete
 */
export const completeWorkflow = async (req, res) => {
  try {
    const { panelId } = req.params;
    const { qualityScore, completionNotes } = req.body;

    // Complete workflow in workflow engine
    const completedWorkflow = workflowEngine.completeWorkflow(panelId, {
      qualityScore,
      completionNotes
    });

    // Update state machine
    workflowStateMachine.transitionPanel(panelId, 'COMPLETED', 'Workflow completed', {
      finalQualityData: { qualityScore },
      completionNotes
    });

    // Log completion
    manufacturingLogger.info('Workflow completed', {
      panelId,
      qualityScore,
      operatorId: req.user?.id
    });

    return successResponse(res, 200, 'Workflow completed successfully', {
      workflow: completedWorkflow
    });

  } catch (error) {
    manufacturingLogger.error('Workflow completion failed', {
      error: error.message,
      stack: error.stack,
      panelId: req.params.panelId,
      body: req.body
    });

    if (error instanceof WorkflowError) {
      return errorResponse(res, 400, error.message, {
        code: error.code,
        details: error.details
      });
    }

    return errorResponse(res, 500, 'Internal server error', {
      error: error.message
    });
  }
};

/**
 * Get workflow statistics and metrics
 * @route GET /api/v1/workflow/stats
 */
export const getWorkflowStats = async (req, res) => {
  try {
    // Get statistics from both engines
    const stateMachineStats = workflowStateMachine.getWorkflowStatistics();
    const activeWorkflows = workflowEngine.getActiveWorkflows();

    // Calculate additional metrics
    const totalActive = activeWorkflows.length;
    const workflowsByState = {};
    const workflowsByStation = {};

    activeWorkflows.forEach(workflow => {
      // Count by state
      workflowsByState[workflow.currentState] = (workflowsByState[workflow.currentState] || 0) + 1;
      
      // Count by station
      if (workflow.stationId) {
        workflowsByStation[workflow.stationId] = (workflowsByStation[workflow.stationId] || 0) + 1;
      }
    });

    // Calculate average workflow progress
    const totalProgress = activeWorkflows.reduce((sum, w) => sum + (w.workflowProgress || 0), 0);
    const averageProgress = totalActive > 0 ? totalProgress / totalActive : 0;

    const stats = {
      ...stateMachineStats,
      workflowMetrics: {
        totalActive,
        averageProgress: Math.round(averageProgress * 100) / 100,
        byState: workflowsByState,
        byStation: workflowsByStation
      },
      timestamp: new Date().toISOString()
    };

    return successResponse(res, 200, 'Workflow statistics retrieved successfully', stats);

  } catch (error) {
    manufacturingLogger.error('Failed to get workflow statistics', {
      error: error.message,
      stack: error.stack
    });

    return errorResponse(res, 500, 'Internal server error', {
      error: error.message
    });
  }
};
