// Input validation middleware for manufacturing environment
// Production-grade validation for barcode processing and manufacturing data

import { body, param, query, validationResult } from 'express-validator';
import { manufacturingLogger } from './logger.js';
import { ValidationError } from './errorHandler.js';

/**
 * Barcode format validation patterns for solar panel tracking
 * Format: CRSYYFBPP#####
 * - CR: Company/Customer Code (2 letters)
 * - S: Solar Panel Type (1 letter: S=Solar)
 * - YY: Year (2 digits: 24 for 2024)
 * - F: Framed indicator (1 letter: F=Framed, B=Unframed)
 * - B: Backsheet type (1 letter: T=Transparent, W=White, B=Black)
 * - PP: Panel type (2 digits: 36, 40, 60, 72, 144)
 * - #####: Sequential Number (5 digits: 00001-99999)
 */
export const BARCODE_PATTERNS = {
  // Full barcode pattern: CRSYYFBPP#####
  FULL: /^CRS\d{2}[FB][TWB](36|40|60|72|144)\d{5}$/,
  
  // Individual component patterns
  COMPANY_CODE: /^CR$/,
  PANEL_TYPE: /^S$/, // S=Solar
  YEAR: /^\d{2}$/,
  FRAMED: /^[FB]$/, // F=Framed, B=Unframed
  BACKSHEET: /^[TWB]$/, // T=Transparent, W=White, B=Black
  PANEL_SIZE: /^(36|40|60|72|144)$/,
  SEQUENCE: /^\d{5}$/ // 00001-99999
};

/**
 * Station validation patterns for dual-line manufacturing
 */
export const STATION_PATTERNS = {
  // Valid station IDs for dual-line setup
  STATION_ID: /^[1-8]$/,
  LINE_NUMBER: /^[12]$/,
  
  // Line 1 stations: 1,2,3,4 (corresponding to 36,40,60,72)
  LINE_1_STATIONS: [1, 2, 3, 4],
  
  // Line 2 stations: 5,6,7,8 (corresponding to 144 specification)
  LINE_2_STATIONS: [5, 6, 7, 8]
};

/**
 * Manufacturing order validation patterns
 */
export const MO_PATTERNS = {
  // Manufacturing order ID format: MO-YYYY-####
  MO_ID: /^MO-\d{4}-\d{4}$/,
  
  // Quantity validation (1-10000 panels per order)
  QUANTITY: /^([1-9]|[1-9]\d{1,3}|10000)$/,
  
  // Priority levels
  PRIORITY: /^(low|medium|high|urgent)$/i
};

/**
 * Validation middleware factory
 */
export const createValidationMiddleware = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const validationErrors = errors.array().map(error => ({
        field: error.path || error.param,
        message: error.msg,
        value: error.value,
        location: error.location
      }));

      manufacturingLogger.warn('Validation failed', {
        path: req.path,
        method: req.method,
        errors: validationErrors,
        body: req.body,
        params: req.params,
        query: req.query,
        station: req.station?.id,
        user: req.user?.username,
        category: 'validation'
      });

      throw new ValidationError('Input validation failed', {
        errors: validationErrors,
        path: req.path,
        method: req.method
      });
    }

    next();
  };
};

/**
 * Barcode validation middleware
 */
export const validateBarcode = createValidationMiddleware([
  body('barcode')
    .exists()
    .withMessage('Barcode is required')
    .isString()
    .withMessage('Barcode must be a string')
    .isLength({ min: 12, max: 12 })
    .withMessage('Barcode must be exactly 12 characters')
    .matches(BARCODE_PATTERNS.FULL)
    .withMessage('Invalid barcode format. Expected: CRSYYFBPP##### (CR=Company, S=Type, YY=Year, F=Factory, B=Batch, PP=Week, #####=Sequence)')
    .custom((value) => {
      // Additional validation for barcode components
      if (value.length !== 12) return false;
      
      const components = {
        company: value.substring(0, 2),
        type: value.substring(2, 3),
        year: value.substring(3, 5),
        framed: value.substring(5, 6),
        backsheet: value.substring(6, 7),
        panelSize: value.substring(7, 9),
        sequence: value.substring(9, 12)
      };

      // Validate company code (must be CR)
      if (components.company !== 'CR') {
        throw new Error(`Invalid company code. Expected 'CR', got '${components.company}'`);
      }

      // Validate panel type (must be S)
      if (components.type !== 'S') {
        throw new Error(`Invalid panel type. Expected 'S', got '${components.type}'`);
      }

      // Validate current year (allow current year ±1)
      const currentYear = new Date().getFullYear() % 100;
      const barcodeYear = parseInt(components.year);
      if (Math.abs(barcodeYear - currentYear) > 1) {
        throw new Error(`Invalid year in barcode. Expected ${currentYear-1}-${currentYear+1}, got ${barcodeYear}`);
      }

      // Validate framed indicator
      if (!['F', 'B'].includes(components.framed)) {
        throw new Error(`Invalid framed indicator. Expected 'F' or 'B', got '${components.framed}'`);
      }

      // Validate backsheet type
      if (!['T', 'W', 'B'].includes(components.backsheet)) {
        throw new Error(`Invalid backsheet type. Expected 'T', 'W', or 'B', got '${components.backsheet}'`);
      }

      // Validate panel size
      const validPanelSizes = ['36', '40', '60', '72', '144'];
      if (!validPanelSizes.includes(components.panelSize)) {
        throw new Error(`Invalid panel size. Expected one of ${validPanelSizes.join(', ')}, got '${components.panelSize}'`);
      }

      // Validate sequence number (not 00000)
      if (components.sequence === '00000') {
        throw new Error('Invalid sequence number in barcode. Cannot be 00000');
      }

      return true;
    })
]);

/**
 * Station validation middleware
 */
export const validateStation = createValidationMiddleware([
  param('stationId')
    .optional()
    .isInt({ min: 1, max: 8 })
    .withMessage('Station ID must be between 1 and 8'),
    
  body('stationId')
    .optional()
    .isInt({ min: 1, max: 8 })
    .withMessage('Station ID must be between 1 and 8'),
    
  query('stationId')
    .optional()
    .isInt({ min: 1, max: 8 })
    .withMessage('Station ID must be between 1 and 8'),
    
  body('lineNumber')
    .optional()
    .isInt({ min: 1, max: 2 })
    .withMessage('Line number must be 1 or 2')
    .custom((value, { req }) => {
      const stationId = req.body.stationId || req.params.stationId;
      if (stationId && value) {
        const station = parseInt(stationId);
        const line = parseInt(value);
        
        // Validate station-line relationship
        if (line === 1 && !STATION_PATTERNS.LINE_1_STATIONS.includes(station)) {
          throw new Error(`Station ${station} is not valid for Line 1. Valid stations: ${STATION_PATTERNS.LINE_1_STATIONS.join(', ')}`);
        }
        if (line === 2 && !STATION_PATTERNS.LINE_2_STATIONS.includes(station)) {
          throw new Error(`Station ${station} is not valid for Line 2. Valid stations: ${STATION_PATTERNS.LINE_2_STATIONS.join(', ')}`);
        }
      }
      return true;
    })
]);

/**
 * Manufacturing order validation middleware
 */
export const validateManufacturingOrder = createValidationMiddleware([
  body('orderId')
    .exists()
    .withMessage('Manufacturing order ID is required')
    .matches(MO_PATTERNS.MO_ID)
    .withMessage('Invalid manufacturing order ID format. Expected: MO-YYYY-####'),
    
  body('quantity')
    .exists()
    .withMessage('Quantity is required')
    .isInt({ min: 1, max: 10000 })
    .withMessage('Quantity must be between 1 and 10,000'),
    
  body('priority')
    .optional()
    .matches(MO_PATTERNS.PRIORITY)
    .withMessage('Priority must be one of: low, medium, high, urgent'),
    
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be in ISO 8601 format')
    .custom((value) => {
      const dueDate = new Date(value);
      const now = new Date();
      
      if (dueDate <= now) {
        throw new Error('Due date must be in the future');
      }
      
      // Maximum 1 year in future
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 1);
      
      if (dueDate > maxDate) {
        throw new Error('Due date cannot be more than 1 year in the future');
      }
      
      return true;
    })
]);

/**
 * Panel inspection validation middleware
 */
export const validateInspection = createValidationMiddleware([
  body('panelBarcode')
    .exists()
    .withMessage('Panel barcode is required')
    .matches(BARCODE_PATTERNS.FULL)
    .withMessage('Invalid panel barcode format'),
    
  body('stationId')
    .exists()
    .withMessage('Station ID is required')
    .isInt({ min: 1, max: 8 })
    .withMessage('Station ID must be between 1 and 8'),
    
  body('inspectionResult')
    .exists()
    .withMessage('Inspection result is required')
    .isIn(['pass', 'fail', 'rework'])
    .withMessage('Inspection result must be: pass, fail, or rework'),
    
  body('criteria')
    .optional()
    .isArray()
    .withMessage('Criteria must be an array')
    .custom((criteria) => {
      if (Array.isArray(criteria)) {
        for (const criterion of criteria) {
          if (!criterion.name || !criterion.result || !['pass', 'fail'].includes(criterion.result)) {
            throw new Error('Each criterion must have name and result (pass/fail)');
          }
        }
      }
      return true;
    }),
    
  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string')
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
]);

/**
 * Pallet validation middleware
 */
export const validatePallet = createValidationMiddleware([
  body('palletId')
    .exists()
    .withMessage('Pallet ID is required')
    .isString()
    .withMessage('Pallet ID must be a string')
    .isLength({ min: 8, max: 20 })
    .withMessage('Pallet ID must be between 8 and 20 characters'),
    
  body('panelCount')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('Panel count must be between 1 and 30'),
    
  body('targetCapacity')
    .optional()
    .isInt({ min: 20, max: 30 })
    .withMessage('Target capacity must be between 20 and 30 panels')
]);

/**
 * Pagination validation middleware
 */
export const validatePagination = createValidationMiddleware([
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
    
  query('sortBy')
    .optional()
    .isString()
    .withMessage('Sort field must be a string'),
    
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be "asc" or "desc"')
]);

/**
 * Date range validation middleware
 */
export const validateDateRange = createValidationMiddleware([
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be in ISO 8601 format'),
    
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be in ISO 8601 format')
    .custom((value, { req }) => {
      if (req.query.startDate && value) {
        const start = new Date(req.query.startDate);
        const end = new Date(value);
        
        if (end <= start) {
          throw new Error('End date must be after start date');
        }
        
        // Maximum 1 year range
        const maxRange = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
        if (end - start > maxRange) {
          throw new Error('Date range cannot exceed 1 year');
        }
      }
      return true;
    })
]);

/**
 * Search validation middleware
 */
export const validateSearch = createValidationMiddleware([
  query('search')
    .optional()
    .isString()
    .withMessage('Search term must be a string')
    .isLength({ min: 2, max: 100 })
    .withMessage('Search term must be between 2 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_.]+$/)
    .withMessage('Search term contains invalid characters')
]);

/**
 * User input validation middleware
 */
export const validateUser = createValidationMiddleware([
  body('username')
    .optional()
    .isString()
    .withMessage('Username must be a string')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
    
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
    
  body('role')
    .optional()
    .isIn(['STATION_INSPECTOR', 'PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN'])
    .withMessage('Invalid user role'),
    
  body('stationAssignments')
    .optional()
    .isArray()
    .withMessage('Station assignments must be an array')
    .custom((stations) => {
      if (Array.isArray(stations)) {
        for (const station of stations) {
          if (!Number.isInteger(station) || station < 1 || station > 8) {
            throw new Error('Station assignments must be integers between 1 and 8');
          }
        }
      }
      return true;
    })
]);

/**
 * Panel type validation middleware
 */
export const validatePanelType = createValidationMiddleware([
  body('panelType')
    .exists()
    .withMessage('Panel type is required')
    .isIn(['36', '40', '60', '72', '144'])
    .withMessage('Panel type must be one of: 36, 40, 60, 72, 144')
    .custom((value, { req }) => {
      const panelType = value;
      const lineNumber = req.body.lineNumber || req.query.lineNumber;
      
      if (lineNumber) {
        const line = parseInt(lineNumber);
        if (line === 1 && !['36', '40', '60', '72'].includes(panelType)) {
          throw new Error(`Panel type ${panelType} is not valid for Line 1. Valid types: 36, 40, 60, 72`);
        }
        if (line === 2 && panelType !== '144') {
          throw new Error(`Panel type ${panelType} is not valid for Line 2. Only type 144 is supported`);
        }
      }
      return true;
    })
]);

/**
 * Quality criteria validation middleware
 */
export const validateQualityCriteria = createValidationMiddleware([
  body('criteria')
    .exists()
    .withMessage('Quality criteria are required')
    .isArray({ min: 1 })
    .withMessage('At least one quality criterion is required')
    .custom((criteria) => {
      for (const criterion of criteria) {
        if (!criterion.name || typeof criterion.name !== 'string') {
          throw new Error('Each criterion must have a valid name');
        }
        if (!criterion.required || typeof criterion.required !== 'boolean') {
          throw new Error('Each criterion must specify if it is required');
        }
        if (criterion.threshold && typeof criterion.threshold !== 'number') {
          throw new Error('Criterion threshold must be a number');
        }
        if (criterion.unit && typeof criterion.unit !== 'string') {
          throw new Error('Criterion unit must be a string');
        }
      }
      return true;
    })
]);

/**
 * Manufacturing workflow validation middleware
 */
export const validateWorkflow = createValidationMiddleware([
  body('workflowStep')
    .exists()
    .withMessage('Workflow step is required')
    .isIn(['ASSEMBLY_EL', 'FRAMING', 'JUNCTION_BOX', 'PERFORMANCE_FINAL'])
    .withMessage('Invalid workflow step'),
    
  body('previousStep')
    .optional()
    .isIn(['ASSEMBLY_EL', 'FRAMING', 'JUNCTION_BOX', 'PERFORMANCE_FINAL'])
    .withMessage('Invalid previous step'),
    
  body('nextStep')
    .optional()
    .isIn(['ASSEMBLY_EL', 'FRAMING', 'JUNCTION_BOX', 'PERFORMANCE_FINAL', 'COMPLETE'])
    .withMessage('Invalid next step')
    .custom((value, { req }) => {
      const currentStep = req.body.workflowStep;
      const previousStep = req.body.previousStep;
      
      // Validate workflow progression
      const workflowOrder = ['ASSEMBLY_EL', 'FRAMING', 'JUNCTION_BOX', 'PERFORMANCE_FINAL'];
      const currentIndex = workflowOrder.indexOf(currentStep);
      
      if (previousStep) {
        const previousIndex = workflowOrder.indexOf(previousStep);
        if (previousIndex >= currentIndex) {
          throw new Error('Workflow step must progress forward');
        }
      }
      
      return true;
    })
]);

/**
 * Custom validation helpers
 */
export const validationHelpers = {
  /**
   * Validate barcode format and extract components
   */
  parseBarcodeComponents: (barcode) => {
    if (!BARCODE_PATTERNS.FULL.test(barcode)) {
      throw new ValidationError('Invalid barcode format');
    }

    return {
      company: barcode.substring(0, 2),
      type: barcode.substring(2, 3),
      year: barcode.substring(3, 5),
      framed: barcode.substring(5, 6),
      backsheet: barcode.substring(6, 7),
      panelSize: barcode.substring(7, 9),
      sequence: barcode.substring(9, 12),
      lineNumber: ['36', '40', '60', '72'].includes(barcode.substring(7, 9)) ? 1 : 2
    };
  },

  /**
   * Validate station-line relationship
   */
  validateStationLine: (stationId, lineNumber) => {
    const station = parseInt(stationId);
    const line = parseInt(lineNumber);
    
    if (line === 1 && !STATION_PATTERNS.LINE_1_STATIONS.includes(station)) {
      throw new ValidationError(`Station ${station} is not valid for Line 1`);
    }
    
    if (line === 2 && !STATION_PATTERNS.LINE_2_STATIONS.includes(station)) {
      throw new ValidationError(`Station ${station} is not valid for Line 2`);
    }
    
    return true;
  }
};

export default {
  createValidationMiddleware,
  validateBarcode,
  validateStation,
  validateManufacturingOrder,
  validateInspection,
  validatePallet,
  validatePagination,
  validateDateRange,
  validateSearch,
  validateUser,
  validatePanelType,
  validateQualityCriteria,
  validateWorkflow,
  validationHelpers,
  BARCODE_PATTERNS,
  STATION_PATTERNS,
  MO_PATTERNS
};











