/**
 * Workflow Routes
 * 
 * API endpoints for workflow management including:
 * - Panel workflow initialization
 * - Inspection processing
 * - Workflow state management
 * - Station queue management
 * - Workflow transitions and rework
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  initializeWorkflow,
  processInspection,
  getWorkflowState,
  getActiveWorkflows,
  getStationQueue,
  transitionWorkflow,
  resetWorkflowForRework,
  completeWorkflow,
  getWorkflowStats
} from '../controllers/workflowController.js';

const router = express.Router();

/**
 * @route   POST /api/v1/workflow/initialize
 * @desc    Initialize workflow for a new panel
 * @access  Private (Inspector role)
 * @body    { panelId: string, barcode: string, lineNumber: number }
 */
router.post('/initialize', asyncHandler(initializeWorkflow));

/**
 * @route   POST /api/v1/workflow/inspect
 * @desc    Process inspection results and transition workflow
 * @access  Private (Inspector role, assigned to station)
 * @body    { panelId: string, stationId: string, result: 'PASS'|'FAIL', criteria: object, notes?: string, wattage?: number }
 */
router.post('/inspect', asyncHandler(processInspection));

/**
 * @route   GET /api/v1/workflow
 * @desc    Get all active workflows with optional filtering
 * @access  Private (Inspector role)
 * @query   ?status=string&stationId=string&lineNumber=number
 */
router.get('/', asyncHandler(getActiveWorkflows));

/**
 * @route   GET /api/v1/workflow/stats
 * @desc    Get workflow statistics and metrics
 * @access  Private (Inspector role)
 */
router.get('/stats', asyncHandler(getWorkflowStats));

/**
 * @route   GET /api/v1/workflow/:panelId
 * @desc    Get current workflow state for a specific panel
 * @access  Private (Inspector role)
 * @param   panelId - Panel identifier
 */
router.get('/:panelId', asyncHandler(getWorkflowState));

/**
 * @route   POST /api/v1/workflow/:panelId/transition
 * @desc    Manually transition workflow to a specific state
 * @access  Private (Inspector role, assigned to panel)
 * @param   panelId - Panel identifier
 * @body    { newState: string, reason?: string, additionalData?: object }
 */
router.post('/:panelId/transition', asyncHandler(transitionWorkflow));

/**
 * @route   POST /api/v1/workflow/:panelId/reset-rework
 * @desc    Reset workflow for rework at a specific station
 * @access  Private (Inspector role, assigned to panel)
 * @param   panelId - Panel identifier
 * @body    { targetStation: string, reason: string, notes?: string[] }
 */
router.post('/:panelId/reset-rework', asyncHandler(resetWorkflowForRework));

/**
 * @route   POST /api/v1/workflow/:panelId/complete
 * @desc    Complete workflow for a panel
 * @access  Private (Inspector role, assigned to panel)
 * @param   panelId - Panel identifier
 * @body    { qualityScore?: number, completionNotes?: string }
 */
router.post('/:panelId/complete', asyncHandler(completeWorkflow));

/**
 * @route   GET /api/v1/workflow/station/:stationId/queue
 * @desc    Get current panel queue for a specific station
 * @access  Private (Inspector role, assigned to station)
 * @param   stationId - Station identifier
 * @query   ?limit=number&status=string
 */
router.get('/station/:stationId/queue', asyncHandler(getStationQueue));

export default router;
