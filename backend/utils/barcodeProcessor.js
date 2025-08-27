// Barcode Processing and Validation System
// Handles CRSYYFBPP##### format parsing and validation for solar panel tracking

import { config } from '../config/index.js';
import { performanceCache } from './performanceCache.js';
import { metricsService } from '../services/metricsService.js';

/**
 * Barcode format: CRSYYFBPP#####
 * - CRS: Company prefix (fixed)
 * - YY: Year (2 digits)
 * - F: Factory identifier (single character)
 * - B: Batch indicator (single character) 
 * - PP: Panel type (36, 40, 60, 72, 144)
 * - #####: Sequential number (5 digits)
 */

// Barcode format constants
export const BARCODE_CONFIG = {
  // Total length including all components
  TOTAL_LENGTH: 13,
  
  // Component positions and lengths
  COMPANY_PREFIX: { start: 0, length: 3, value: 'CRS' },
  YEAR: { start: 3, length: 2 },
  FACTORY: { start: 5, length: 1 },
  BATCH: { start: 6, length: 1 },
  PANEL_TYPE: { start: 7, length: 3 }, // Changed to 3 to accommodate 144
  SEQUENCE: { start: 10, length: 5 }, // Adjusted start position
  
  // Valid values
  VALID_PANEL_TYPES: ['36', '40', '60', '72', '144'],
  VALID_FACTORY_CODES: ['W', 'B', 'T'], // West, Blue, Test facilities
  VALID_BATCH_CODES: ['T', 'W', 'B'], // Test, Week, Batch indicators
  
  // Line assignment rules
  LINE_ASSIGNMENTS: {
    LINE_1: ['36', '40', '60', '72'],
    LINE_2: ['144']
  },

  // Additional properties for barcode generator compatibility
  format: 'CRSYYFBPPP#####',
  panelTypes: ['36', '40', '60', '72', '144'],
  factoryCodes: ['CRS'],
  constructionTypes: [
    { code: 'W', name: 'Silver Frame' },
    { code: 'B', name: 'Black Frame' },
    { code: 'T', name: 'Test' }
  ]
};

/**
 * Custom error class for barcode processing errors
 */
export class BarcodeError extends Error {
  constructor(message, code, component = null) {
    super(message);
    this.name = 'BarcodeError';
    this.code = code;
    this.component = component;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Parse barcode components from raw barcode string
 */
export function parseBarcode(barcodeString) {
  if (!barcodeString || typeof barcodeString !== 'string') {
    throw new BarcodeError('Invalid barcode input', 'INVALID_INPUT');
  }

  // Remove any whitespace and convert to uppercase
  const cleanBarcode = barcodeString.trim().toUpperCase();
  
  // Check total length
  if (cleanBarcode.length !== BARCODE_CONFIG.TOTAL_LENGTH) {
    throw new BarcodeError(
      `Invalid barcode length. Expected ${BARCODE_CONFIG.TOTAL_LENGTH}, got ${cleanBarcode.length}`,
      'INVALID_LENGTH'
    );
  }

  // Extract components
  const components = {
    raw: cleanBarcode,
    companyPrefix: cleanBarcode.substring(
      BARCODE_CONFIG.COMPANY_PREFIX.start,
      BARCODE_CONFIG.COMPANY_PREFIX.start + BARCODE_CONFIG.COMPANY_PREFIX.length
    ),
    year: cleanBarcode.substring(
      BARCODE_CONFIG.YEAR.start,
      BARCODE_CONFIG.YEAR.start + BARCODE_CONFIG.YEAR.length
    ),
    factory: cleanBarcode.substring(
      BARCODE_CONFIG.FACTORY.start,
      BARCODE_CONFIG.FACTORY.start + BARCODE_CONFIG.FACTORY.length
    ),
    batch: cleanBarcode.substring(
      BARCODE_CONFIG.BATCH.start,
      BARCODE_CONFIG.BATCH.start + BARCODE_CONFIG.BATCH.length
    ),
    panelType: cleanBarcode.substring(
      BARCODE_CONFIG.PANEL_TYPE.start,
      BARCODE_CONFIG.PANEL_TYPE.start + BARCODE_CONFIG.PANEL_TYPE.length
    ),
    sequence: cleanBarcode.substring(
      BARCODE_CONFIG.SEQUENCE.start,
      BARCODE_CONFIG.SEQUENCE.start + BARCODE_CONFIG.SEQUENCE.length
    )
  };

  return components;
}

/**
 * Validate individual barcode components
 */
export function validateBarcodeComponents(components) {
  const errors = [];

  // Validate company prefix
  if (components.companyPrefix !== BARCODE_CONFIG.COMPANY_PREFIX.value) {
    errors.push({
      component: 'companyPrefix',
      message: `Invalid company prefix. Expected '${BARCODE_CONFIG.COMPANY_PREFIX.value}', got '${components.companyPrefix}'`,
      code: 'INVALID_COMPANY_PREFIX'
    });
  }

  // Validate year (must be numeric and reasonable)
  const yearNum = parseInt(components.year);
  const currentYear = new Date().getFullYear() % 100; // Get last 2 digits
  if (isNaN(yearNum) || yearNum < 20 || yearNum > currentYear + 5) {
    errors.push({
      component: 'year',
      message: `Invalid year '${components.year}'. Must be between 20 and ${currentYear + 5}`,
      code: 'INVALID_YEAR'
    });
  }

  // Validate factory code
  if (!BARCODE_CONFIG.VALID_FACTORY_CODES.includes(components.factory)) {
    errors.push({
      component: 'factory',
      message: `Invalid factory code '${components.factory}'. Valid codes: ${BARCODE_CONFIG.VALID_FACTORY_CODES.join(', ')}`,
      code: 'INVALID_FACTORY'
    });
  }

  // Validate batch code
  if (!BARCODE_CONFIG.VALID_BATCH_CODES.includes(components.batch)) {
    errors.push({
      component: 'batch',
      message: `Invalid batch code '${components.batch}'. Valid codes: ${BARCODE_CONFIG.VALID_BATCH_CODES.join(', ')}`,
      code: 'INVALID_BATCH'
    });
  }

  // Validate panel type (normalize by removing leading zeros)
  const normalizedPanelType = components.panelType.replace(/^0+/, '') || '0';
  if (!BARCODE_CONFIG.VALID_PANEL_TYPES.includes(normalizedPanelType)) {
    errors.push({
      component: 'panelType',
      message: `Invalid panel type '${components.panelType}' (normalized: '${normalizedPanelType}'). Valid types: ${BARCODE_CONFIG.VALID_PANEL_TYPES.join(', ')}`,
      code: 'INVALID_PANEL_TYPE'
    });
  }
  
  // Update component with normalized value for consistency
  components.panelType = normalizedPanelType;

  // Validate sequence number
  const sequenceNum = parseInt(components.sequence);
  if (isNaN(sequenceNum) || components.sequence.length !== 5 || !/^\d{5}$/.test(components.sequence)) {
    errors.push({
      component: 'sequence',
      message: `Invalid sequence number '${components.sequence}'. Must be exactly 5 digits`,
      code: 'INVALID_SEQUENCE'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    validationTimestamp: new Date().toISOString()
  };
}

/**
 * Determine production line assignment based on panel type
 */
export function determineLineAssignment(panelType) {
  if (!panelType) {
    throw new BarcodeError('Panel type is required for line assignment', 'MISSING_PANEL_TYPE');
  }

  // Check Line 1 assignment
  if (BARCODE_CONFIG.LINE_ASSIGNMENTS.LINE_1.includes(panelType)) {
    return {
      lineNumber: 1,
      lineName: 'LINE_1',
      panelType,
      stationRange: [1, 2, 3, 4], // Stations 1-4 for Line 1
      isValid: true
    };
  }

  // Check Line 2 assignment
  if (BARCODE_CONFIG.LINE_ASSIGNMENTS.LINE_2.includes(panelType)) {
    return {
      lineNumber: 2,
      lineName: 'LINE_2', 
      panelType,
      stationRange: [5, 6, 7, 8], // Stations 5-8 for Line 2
      isValid: true
    };
  }

  // Invalid panel type
  throw new BarcodeError(
    `Cannot determine line assignment for panel type '${panelType}'. Valid types: ${BARCODE_CONFIG.VALID_PANEL_TYPES.join(', ')}`,
    'INVALID_PANEL_TYPE_FOR_LINE',
    'panelType'
  );
}

/**
 * Complete barcode processing pipeline
 * Parses, validates, and determines line assignment in one operation
 */
export function processBarcodeComplete(barcodeString, metadata = {}) {
  const startTime = performance.now();
  
  try {
    // Step 1: Parse barcode components
    const components = parseBarcode(barcodeString);

    // Step 2: Validate components
    const validation = validateBarcodeComponents(components);

    // Step 3: Determine line assignment (only if validation passes)
    let lineAssignment = null;
    if (validation.isValid) {
      lineAssignment = determineLineAssignment(components.panelType);
    }

    // Step 4: Create comprehensive result
    const result = {
      success: validation.isValid,
      barcode: components.raw,
      components,
      validation,
      lineAssignment,
      processedAt: new Date().toISOString(),
      
      // Manufacturing metadata
      manufacturing: {
        panelTypeEnum: components.panelType ? `TYPE_${components.panelType}` : null,
        lineType: lineAssignment ? lineAssignment.lineName : null,
        initialStation: lineAssignment ? lineAssignment.stationRange[0] : null
      }
    };

    // Step 5: Record metrics
    const processingTime = performance.now() - startTime;
    try {
      metricsService.recordBarcodeEvent({
        barcode: barcodeString,
        success: validation.isValid,
        errorCode: validation.isValid ? null : 'BARCODE_VALIDATION_FAILED',
        errorMessage: validation.isValid ? null : validation.errors.map(e => e.message).join(', '),
        processingTime,
        lineAssignment,
        moId: metadata.moId || null,
        stationId: metadata.stationId || null,
        userId: metadata.userId || null
      });
    } catch (metricsError) {
      // Don't fail barcode processing if metrics recording fails
      console.warn('Failed to record barcode metrics:', metricsError.message);
    }

    return result;

  } catch (error) {
    const processingTime = performance.now() - startTime;
    
    // Record error metrics
    try {
      metricsService.recordBarcodeEvent({
        barcode: barcodeString,
        success: false,
        errorCode: error instanceof BarcodeError ? error.code : 'PROCESSING_ERROR',
        errorMessage: error.message,
        processingTime,
        lineAssignment: null,
        moId: metadata.moId || null,
        stationId: metadata.stationId || null,
        userId: metadata.userId || null
      });
    } catch (metricsError) {
      console.warn('Failed to record barcode error metrics:', metricsError.message);
    }
    
    if (error instanceof BarcodeError) {
      return {
        success: false,
        barcode: barcodeString,
        error: {
          message: error.message,
          code: error.code,
          component: error.component,
          timestamp: error.timestamp
        },
        processedAt: new Date().toISOString()
      };
    }
    
    // Unexpected error
    throw error;
  }
}

/**
 * Generate a valid barcode for testing purposes
 */
export function generateTestBarcode(options = {}) {
  const {
    year = new Date().getFullYear() % 100,
    factory = 'W',
    batch = 'T',
    panelType = '36',
    sequence = 1
  } = options;

  // Validate inputs
  if (!BARCODE_CONFIG.VALID_PANEL_TYPES.includes(panelType.toString())) {
    throw new BarcodeError(`Invalid panel type for test barcode: ${panelType}`, 'INVALID_TEST_PANEL_TYPE');
  }

  const paddedSequence = sequence.toString().padStart(5, '0');
  const barcode = `CRS${year.toString().padStart(2, '0')}${factory}${batch}${panelType}${paddedSequence}`;

  return barcode;
}

/**
 * Utility function to get barcode format information
 */
export function getBarcodeFormatInfo() {
  return {
    format: 'CRSYYFBPP#####',
    description: 'Solar Panel Barcode Format',
    components: {
      CRS: 'Company prefix (fixed)',
      YY: 'Year (2 digits)',
      F: 'Factory identifier',
      B: 'Batch indicator',
      PP: 'Panel type (36/40/60/72/144)',
      '#####': 'Sequential number (5 digits)'
    },
    totalLength: BARCODE_CONFIG.TOTAL_LENGTH,
    validPanelTypes: BARCODE_CONFIG.VALID_PANEL_TYPES,
    lineAssignments: BARCODE_CONFIG.LINE_ASSIGNMENTS,
    examples: [
      'CRS24W T36 00001', // Line 1 example
      'CRS24WT14400001'   // Line 2 example
    ].map(ex => ex.replace(/ /g, ''))
  };
}

export default {
  parseBarcode,
  validateBarcodeComponents,
  determineLineAssignment,
  processBarcodeComplete,
  generateTestBarcode,
  getBarcodeFormatInfo,
  BARCODE_CONFIG,
  BarcodeError
};
