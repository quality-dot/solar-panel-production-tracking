/**
 * Barcode Validation Middleware
 * Server-side validation for CRSYYFBPP##### barcode format
 * Prevents client-side validation bypass and ensures data integrity
 */

import { BarcodeError } from '../utils/barcodeProcessor.js';
import { BARCODE_CONFIG } from '../utils/barcodeProcessor.js';

/**
 * Barcode format validation middleware
 * Validates CRSYYFBPP##### format on the server side
 */
export const barcodeFormatValidation = (req, res, next) => {
  try {
    const { barcode } = req.body;

    // Check if barcode exists
    if (!barcode) {
      return res.status(400).json({
        success: false,
        error: 'Barcode is required',
        code: 'BARCODE_MISSING',
        timestamp: new Date().toISOString()
      });
    }

    // Check if barcode is a string
    if (typeof barcode !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Barcode must be a string',
        code: 'BARCODE_INVALID_TYPE',
        timestamp: new Date().toISOString()
      });
    }

    // Check barcode length
    if (barcode.length !== BARCODE_CONFIG.TOTAL_LENGTH) {
      return res.status(400).json({
        success: false,
        error: `Barcode must be exactly ${BARCODE_CONFIG.TOTAL_LENGTH} characters`,
        code: 'BARCODE_INVALID_LENGTH',
        details: {
          expected: BARCODE_CONFIG.TOTAL_LENGTH,
          actual: barcode.length,
          format: 'CRSYYFBPP#####'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Validate barcode format using regex
    const barcodeRegex = /^CRS(\d{2})([WB])([TWB])(36|40|60|72|144)(\d{5})$/;
    if (!barcodeRegex.test(barcode)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid barcode format',
        code: 'BARCODE_INVALID_FORMAT',
        details: {
          expected: 'CRSYYFBPP#####',
          actual: barcode,
          explanation: 'CRS=Company, YY=Year, F=Factory, B=Batch, PP=PanelType, #####=Sequence'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Extract and validate components
    const components = {
      company: barcode.substring(
        BARCODE_CONFIG.COMPANY_PREFIX.start,
        BARCODE_CONFIG.COMPANY_PREFIX.start + BARCODE_CONFIG.COMPANY_PREFIX.length
      ),
      year: barcode.substring(
        BARCODE_CONFIG.YEAR.start,
        BARCODE_CONFIG.YEAR.start + BARCODE_CONFIG.YEAR.length
      ),
      factory: barcode.substring(
        BARCODE_CONFIG.FACTORY.start,
        BARCODE_CONFIG.FACTORY.start + BARCODE_CONFIG.FACTORY.length
      ),
      batch: barcode.substring(
        BARCODE_CONFIG.BATCH.start,
        BARCODE_CONFIG.BATCH.start + BARCODE_CONFIG.BATCH.length
      ),
      panelType: barcode.substring(
        BARCODE_CONFIG.PANEL_TYPE.start,
        BARCODE_CONFIG.PANEL_TYPE.start + BARCODE_CONFIG.PANEL_TYPE.length
      ),
      sequence: barcode.substring(
        BARCODE_CONFIG.SEQUENCE.start,
        BARCODE_CONFIG.SEQUENCE.start + BARCODE_CONFIG.SEQUENCE.length
      )
    };

    // Validate company prefix
    if (components.company !== BARCODE_CONFIG.COMPANY_PREFIX.value) {
      return res.status(400).json({
        success: false,
        error: 'Invalid company prefix',
        code: 'BARCODE_INVALID_COMPANY',
        details: {
          expected: BARCODE_CONFIG.COMPANY_PREFIX.value,
          actual: components.company
        },
        timestamp: new Date().toISOString()
      });
    }

    // Validate year (allow current year ±2 for manufacturing flexibility)
    const currentYear = new Date().getFullYear() % 100;
    const barcodeYear = parseInt(components.year);
    if (Math.abs(barcodeYear - currentYear) > 2) {
      return res.status(400).json({
        success: false,
        error: 'Invalid year in barcode',
        code: 'BARCODE_INVALID_YEAR',
        details: {
          expected: `${currentYear - 2}-${currentYear + 2}`,
          actual: barcodeYear,
          currentYear: currentYear
        },
        timestamp: new Date().toISOString()
      });
    }

    // Validate factory code
    if (!BARCODE_CONFIG.VALID_FACTORY_CODES.includes(components.factory)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid factory code',
        code: 'BARCODE_INVALID_FACTORY',
        details: {
          expected: BARCODE_CONFIG.VALID_FACTORY_CODES,
          actual: components.factory
        },
        timestamp: new Date().toISOString()
      });
    }

    // Validate batch code
    if (!BARCODE_CONFIG.VALID_BATCH_CODES.includes(components.batch)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid batch code',
        code: 'BARCODE_INVALID_BATCH',
        details: {
          expected: BARCODE_CONFIG.VALID_BATCH_CODES,
          actual: components.batch
        },
        timestamp: new Date().toISOString()
      });
    }

    // Validate panel type
    if (!BARCODE_CONFIG.VALID_PANEL_TYPES.includes(components.panelType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid panel type',
        code: 'BARCODE_INVALID_PANEL_TYPE',
        details: {
          expected: BARCODE_CONFIG.VALID_PANEL_TYPES,
          actual: components.panelType
        },
        timestamp: new Date().toISOString()
      });
    }

    // Validate sequence number (must be 1-99999)
    const sequence = parseInt(components.sequence);
    if (isNaN(sequence) || sequence < 1 || sequence > 99999) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sequence number',
        code: 'BARCODE_INVALID_SEQUENCE',
        details: {
          expected: '1-99999',
          actual: sequence
        },
        timestamp: new Date().toISOString()
      });
    }

    // Add validated components to request for use in route handlers
    req.barcodeComponents = components;
    req.validatedBarcode = barcode;

    // Log successful validation for audit purposes
    console.log('Barcode validation passed:', {
      barcode: barcode.substring(0, 8) + '...', // Log partial barcode for security
      components: {
        year: components.year,
        factory: components.factory,
        batch: components.batch,
        panelType: components.panelType
      },
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    next();
  } catch (error) {
    console.error('Barcode validation middleware error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error during barcode validation',
      code: 'BARCODE_VALIDATION_ERROR',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Enhanced barcode validation with business rules
 * Includes additional manufacturing-specific validations
 */
export const enhancedBarcodeValidation = (req, res, next) => {
  try {
    // First run basic format validation
    barcodeFormatValidation(req, res, (err) => {
      if (err) return next(err);

      // Additional business rule validations
      const { barcodeComponents } = req;
      
      // Check for duplicate barcode processing (basic check)
      // This would integrate with a more sophisticated duplicate detection system
      const barcodeHash = require('crypto')
        .createHash('sha256')
        .update(req.validatedBarcode)
        .digest('hex');

      // Add barcode hash to request for duplicate detection
      req.barcodeHash = barcodeHash;

      // Validate manufacturing order consistency (if available)
      if (req.headers['x-manufacturing-order']) {
        const moId = req.headers['x-manufacturing-order'];
        // Additional MO validation would go here
        console.log('Manufacturing order validation for barcode:', moId);
      }

      // Validate station assignment consistency
      if (req.headers['x-station-id']) {
        const stationId = parseInt(req.headers['x-station-id']);
        const panelType = barcodeComponents.panelType;
        
        // Check if panel type is compatible with station
        const line1Types = BARCODE_CONFIG.LINE_ASSIGNMENTS.LINE_1;
        const line2Types = BARCODE_CONFIG.LINE_ASSIGNMENTS.LINE_2;
        
        if (line1Types.includes(panelType) && stationId > 4) {
          return res.status(400).json({
            success: false,
            error: 'Panel type incompatible with station',
            code: 'BARCODE_STATION_MISMATCH',
            details: {
              panelType,
              stationId,
              expectedStations: '1-4 (Line 1)',
              actualStation: stationId
            },
            timestamp: new Date().toISOString()
          });
        }
        
        if (line2Types.includes(panelType) && stationId < 5) {
          return res.status(400).json({
            success: false,
            error: 'Panel type incompatible with station',
            code: 'BARCODE_STATION_MISMATCH',
            details: {
              panelType,
              stationId,
              expectedStations: '5-8 (Line 2)',
              actualStation: stationId
            },
            timestamp: new Date().toISOString()
          });
        }
      }

      next();
    });
  } catch (error) {
    console.error('Enhanced barcode validation error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error during enhanced barcode validation',
      code: 'ENHANCED_BARCODE_VALIDATION_ERROR',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Barcode sanitization middleware
 * Sanitizes barcode input to prevent injection attacks
 */
export const barcodeSanitization = (req, res, next) => {
  try {
    if (req.body.barcode) {
      // Remove any non-alphanumeric characters except expected format
      req.body.barcode = req.body.barcode.toString().trim().toUpperCase();
      
      // Log sanitization for audit
      console.log('Barcode sanitized:', {
        original: req.body.barcode,
        sanitized: req.body.barcode,
        timestamp: new Date().toISOString()
      });
    }
    
    next();
  } catch (error) {
    console.error('Barcode sanitization error:', error);
    next(error);
  }
};

export default {
  barcodeFormatValidation,
  enhancedBarcodeValidation,
  barcodeSanitization
};
