// Panel tracking routes for manufacturing workflow
// API endpoints for panel lifecycle management

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { successResponse, errorResponse } from '../utils/responseUtils.js';
import { panelService, PanelServiceError } from '../services/panelService.js';
import { BarcodeError } from '../utils/barcodeProcessor.js';
import { createValidationMiddleware } from '../middleware/validation.js';

const router = express.Router();

/**
 * @route   GET /api/v1/panels
 * @desc    Get panels with filtering and pagination
 * @access  Private (All roles)
 * @query   ?status=PENDING|IN_PROGRESS|PASSED|FAILED&line=1|2&moId=number&limit=50&offset=0&barcode=string
 */
router.get('/', asyncHandler(async (req, res) => {
  // TODO: Implement in Task 4-5 - Panel Management
  res.status(501).json({
    success: false,
    error: 'Panel routes not yet implemented',
    code: 'NOT_IMPLEMENTED',
    message: 'Panel listing will be implemented in Tasks 4-5',
    queryParams: {
      status: 'PENDING | IN_PROGRESS | PASSED | FAILED | REWORK (optional)',
      line: '1 or 2 (optional)',
      moId: 'Manufacturing Order ID (optional)',
      limit: 'Results per page (default: 50, max: 200)',
      offset: 'Pagination offset (default: 0)',
      barcode: 'Search by barcode pattern (optional)',
      stationId: 'Filter by current station (optional)'
    },
    expectedResponse: {
      panels: ['array of panel objects'],
      pagination: {
        total: 'number',
        limit: 'number',
        offset: 'number',
        hasMore: 'boolean'
      }
    }
  });
}));

/**
 * @route   GET /api/v1/panels/:barcode
 * @desc    Get specific panel details by barcode
 * @access  Private (All roles)
 * @param   barcode - Panel barcode (CRSYYFBPP#####)
 */
router.get('/:barcode', asyncHandler(async (req, res) => {
  const { barcode } = req.params;
  
  try {
    const panel = await panelService.findByBarcode(barcode);
    
    if (!panel) {
      return res.status(404).json(errorResponse(
        `Panel not found with barcode: ${barcode}`,
        'PANEL_NOT_FOUND'
      ));
    }
    
    res.json(successResponse(panel, 'Panel found'));
    
  } catch (error) {
    if (error instanceof PanelServiceError) {
      res.status(400).json(errorResponse(
        error.message,
        error.code,
        error.details
      ));
    } else {
      throw error;
    }
  }
}));

/**
 * @route   POST /api/v1/panels
 * @desc    Create new panel entry from barcode (used during initial scan)
 * @access  Private (Inspector role)
 * @body    { barcode: string, moId?: number, overrides?: object, metadata?: object }
 */
router.post('/', asyncHandler(async (req, res) => {
  const { barcode, moId, overrides = {}, metadata = {} } = req.body;
  
  if (!barcode) {
    return res.status(400).json(errorResponse(
      'Barcode is required',
      'MISSING_BARCODE'
    ));
  }
  
  try {
    // Add request metadata
    const requestMetadata = {
      ...metadata,
      userId: req.user?.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionID
    };
    
    const result = await panelService.createPanelFromBarcode(barcode, {
      overrides,
      metadata: requestMetadata,
      moId
    });
    
    res.status(201).json(successResponse(result, 'Panel created successfully from barcode'));
    
  } catch (error) {
    if (error instanceof PanelServiceError || error instanceof BarcodeError) {
      const statusCode = error.code === 'BARCODE_DUPLICATE' ? 409 : 400;
      res.status(statusCode).json(errorResponse(
        error.message,
        error.code,
        error.details
      ));
    } else {
      throw error;
    }
  }
}));

/**
 * @route   PATCH /api/v1/panels/:barcode
 * @desc    Update panel status and details
 * @access  Private (Inspector/Supervisor role)
 * @param   barcode - Panel barcode
 * @body    { status?: string, currentStation?: number, wattage?: number, notes?: string }
 */
router.patch('/:barcode', asyncHandler(async (req, res) => {
  // TODO: Implement in Task 5 - Station Workflow Engine
  res.status(501).json({
    success: false,
    error: 'Panel updates not yet implemented',
    code: 'NOT_IMPLEMENTED',
    message: 'Panel updates will be implemented in Task 5',
    requestedBarcode: req.params.barcode
  });
}));

/**
 * @route   GET /api/v1/panels/:barcode/history
 * @desc    Get complete inspection history for a panel
 * @access  Private (All roles)
 * @param   barcode - Panel barcode
 */
router.get('/:barcode/history', asyncHandler(async (req, res) => {
  // TODO: Implement in Task 5 - Station Workflow Engine
  res.status(501).json({
    success: false,
    error: 'Panel history not yet implemented',
    code: 'NOT_IMPLEMENTED',
    message: 'Panel inspection history will be implemented in Task 5',
    requestedBarcode: req.params.barcode
  });
}));

/**
 * @route   POST /api/v1/panels/:barcode/rework
 * @desc    Initiate rework process for failed panel
 * @access  Private (Inspector/Supervisor role)
 * @param   barcode - Panel barcode
 * @body    { reason: string, targetStation: number, notes?: string }
 */
router.post('/:barcode/rework', asyncHandler(async (req, res) => {
  // TODO: Implement in Task 11 - Rework Flow Management
  res.status(501).json({
    success: false,
    error: 'Rework flow not yet implemented',
    code: 'NOT_IMPLEMENTED',
    message: 'Rework functionality will be implemented in Task 11',
    requestedBarcode: req.params.barcode
  });
}));

/**
 * @route   POST /api/v1/panels/manual
 * @desc    Create panel with complete manual specification (for damaged/missing barcodes)
 * @access  Private (Inspector role)
 * @body    { specification: object, metadata?: object }
 */
router.post('/manual', asyncHandler(async (req, res) => {
  const { specification, metadata = {} } = req.body;
  
  if (!specification) {
    return res.status(400).json(errorResponse(
      'Panel specification is required',
      'MISSING_SPECIFICATION'
    ));
  }
  
  try {
    const requestMetadata = {
      ...metadata,
      userId: req.user?.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionID
    };
    
    const result = await panelService.createPanelManual(specification, requestMetadata);
    
    res.status(201).json(successResponse(result, 'Panel created successfully with manual specification'));
    
  } catch (error) {
    if (error instanceof PanelServiceError) {
      res.status(400).json(errorResponse(
        error.message,
        error.code,
        error.details
      ));
    } else {
      throw error;
    }
  }
}));

/**
 * @route   POST /api/v1/panels/validate-barcode
 * @desc    Validate barcode uniqueness without creating panel
 * @access  Private (All roles)
 * @body    { barcode: string }
 */
router.post('/validate-barcode', asyncHandler(async (req, res) => {
  const { barcode } = req.body;
  
  if (!barcode) {
    return res.status(400).json(errorResponse(
      'Barcode is required',
      'MISSING_BARCODE'
    ));
  }
  
  try {
    await panelService.validateBarcodeUniqueness(barcode);
    
    res.json(successResponse(
      { barcode, isUnique: true, validatedAt: new Date().toISOString() },
      'Barcode is unique and available'
    ));
    
  } catch (error) {
    if (error instanceof PanelServiceError && error.code === 'BARCODE_DUPLICATE') {
      res.status(409).json(errorResponse(
        error.message,
        error.code,
        error.details
      ));
    } else if (error instanceof PanelServiceError) {
      res.status(400).json(errorResponse(
        error.message,
        error.code,
        error.details
      ));
    } else {
      throw error;
    }
  }
}));

/**
 * @route   GET /api/v1/panels/statistics
 * @desc    Get panel statistics
 * @access  Private (All roles)
 * @query   ?moId=number&startDate=ISO&endDate=ISO
 */
router.get('/statistics', asyncHandler(async (req, res) => {
  const { moId, startDate, endDate } = req.query;
  
  try {
    const options = {};
    
    if (moId) {
      options.moId = parseInt(moId);
    }
    
    if (startDate && endDate) {
      options.dateRange = {
        start: startDate,
        end: endDate
      };
    }
    
    const result = await panelService.getPanelStatistics(options);
    
    res.json(successResponse(result, 'Panel statistics retrieved'));
    
  } catch (error) {
    if (error instanceof PanelServiceError) {
      res.status(400).json(errorResponse(
        error.message,
        error.code,
        error.details
      ));
    } else {
      throw error;
    }
  }
}));

export default router;
