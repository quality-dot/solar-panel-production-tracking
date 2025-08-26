// Barcode Processing API Routes
// RESTful endpoints for barcode parsing, validation, and line assignment

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { successResponse, errorResponse } from '../utils/responseUtils.js';
import { 
  processBarcodeComplete,
  parseBarcode,
  validateBarcodeComponents,
  determineLineAssignment,
  generateTestBarcode,
  getBarcodeFormatInfo,
  BarcodeError
} from '../utils/barcodeProcessor.js';
import { 
  PanelSpecification,
  PANEL_SPECIFICATION_CONFIG,
  SPECIFICATION_HELPERS
} from '../utils/panelSpecificationOverride.js';
import { 
  BarcodeGenerator, 
  BarcodeGenerationError 
} from '../utils/barcodeGenerator.js';
import { createValidationMiddleware } from '../middleware/validation.js';

const router = express.Router();

// Validation schemas for barcode endpoints
const barcodeValidation = {
  process: {
    body: {
      barcode: {
        in: ['body'],
        exists: {
          errorMessage: 'Barcode is required'
        },
        isString: {
          errorMessage: 'Barcode must be a string'
        },
        trim: true,
        isLength: {
          options: { min: 1, max: 20 },
          errorMessage: 'Barcode must be between 1 and 20 characters'
        }
      }
    }
  },
  
  generate: {
    body: {
      year: {
        in: ['body'],
        optional: true,
        isInt: {
          options: { min: 20, max: 99 },
          errorMessage: 'Year must be between 20 and 99'
        },
        toInt: true
      },
      factory: {
        in: ['body'],
        optional: true,
        isIn: {
          options: [['W', 'B', 'T']],
          errorMessage: 'Factory must be W, B, or T'
        }
      },
      batch: {
        in: ['body'],
        optional: true,
        isIn: {
          options: [['T', 'W', 'B']],
          errorMessage: 'Batch must be T, W, or B'
        }
      },
      panelType: {
        in: ['body'],
        optional: true,
        isIn: {
          options: [['36', '40', '60', '72', '144']],
          errorMessage: 'Panel type must be 36, 40, 60, 72, or 144'
        }
      },
      sequence: {
        in: ['body'],
        optional: true,
        isInt: {
          options: { min: 1, max: 99999 },
          errorMessage: 'Sequence must be between 1 and 99999'
        },
        toInt: true
      }
    }
  }
};

/**
 * POST /api/v1/barcode/process
 * Process a complete barcode through parsing, validation, and line assignment
 */
router.post('/process', 
  createValidationMiddleware(barcodeValidation.process),
  asyncHandler(async (req, res) => {
    const { barcode } = req.body;
    
    try {
      const result = processBarcodeComplete(barcode);
      
      if (result.success) {
        res.json(successResponse(result, 'Barcode processed successfully'));
      } else {
        res.status(400).json(errorResponse(
          'Barcode validation failed',
          'BARCODE_VALIDATION_FAILED',
          result.error || result.validation.errors
        ));
      }
    } catch (error) {
      if (error instanceof BarcodeError) {
        res.status(400).json(errorResponse(
          error.message,
          error.code,
          { component: error.component }
        ));
      } else {
        throw error;
      }
    }
  })
);

/**
 * POST /api/v1/barcode/parse
 * Parse barcode components without validation
 */
router.post('/parse',
  createValidationMiddleware(barcodeValidation.process),
  asyncHandler(async (req, res) => {
    const { barcode } = req.body;
    
    try {
      const components = parseBarcode(barcode);
      res.json(successResponse(components, 'Barcode parsed successfully'));
    } catch (error) {
      if (error instanceof BarcodeError) {
        res.status(400).json(errorResponse(
          error.message,
          error.code,
          { component: error.component }
        ));
      } else {
        throw error;
      }
    }
  })
);

/**
 * POST /api/v1/barcode/validate
 * Validate barcode components
 */
router.post('/validate',
  createValidationMiddleware(barcodeValidation.process),
  asyncHandler(async (req, res) => {
    const { barcode } = req.body;
    
    try {
      const components = parseBarcode(barcode);
      const validation = validateBarcodeComponents(components);
      
      const result = {
        barcode,
        components,
        validation,
        processedAt: new Date().toISOString()
      };
      
      if (validation.isValid) {
        res.json(successResponse(result, 'Barcode validation passed'));
      } else {
        res.status(400).json(errorResponse(
          'Barcode validation failed',
          'VALIDATION_FAILED',
          validation.errors
        ));
      }
    } catch (error) {
      if (error instanceof BarcodeError) {
        res.status(400).json(errorResponse(
          error.message,
          error.code,
          { component: error.component }
        ));
      } else {
        throw error;
      }
    }
  })
);

/**
 * POST /api/v1/barcode/line-assignment
 * Determine line assignment for a panel type
 */
router.post('/line-assignment',
  asyncHandler(async (req, res) => {
    const { panelType, barcode } = req.body;
    
    let typeToCheck = panelType;
    
    // If barcode provided, extract panel type from it
    if (barcode && !panelType) {
      try {
        const components = parseBarcode(barcode);
        typeToCheck = components.panelType;
      } catch (error) {
        return res.status(400).json(errorResponse(
          'Invalid barcode provided',
          'INVALID_BARCODE',
          { originalError: error.message }
        ));
      }
    }
    
    if (!typeToCheck) {
      return res.status(400).json(errorResponse(
        'Panel type or barcode is required',
        'MISSING_PANEL_TYPE'
      ));
    }
    
    try {
      const lineAssignment = determineLineAssignment(typeToCheck);
      res.json(successResponse(lineAssignment, 'Line assignment determined'));
    } catch (error) {
      if (error instanceof BarcodeError) {
        res.status(400).json(errorResponse(
          error.message,
          error.code,
          { panelType: typeToCheck }
        ));
      } else {
        throw error;
      }
    }
  })
);

/**
 * POST /api/v1/barcode/generate
 * Generate test barcodes for development and testing
 */
router.post('/generate',
  createValidationMiddleware(barcodeValidation.generate),
  asyncHandler(async (req, res) => {
    const options = req.body;
    
    try {
      const barcode = generateTestBarcode(options);
      const processed = processBarcodeComplete(barcode);
      
      const result = {
        generated: {
          barcode,
          options: options || 'default',
          generatedAt: new Date().toISOString()
        },
        verification: processed
      };
      
      res.json(successResponse(result, 'Test barcode generated and verified'));
    } catch (error) {
      if (error instanceof BarcodeError) {
        res.status(400).json(errorResponse(
          error.message,
          error.code,
          { options }
        ));
      } else {
        throw error;
      }
    }
  })
);

/**
 * GET /api/v1/barcode/format
 * Get barcode format information and documentation
 */
router.get('/format',
  asyncHandler(async (req, res) => {
    const formatInfo = getBarcodeFormatInfo();
    res.json(successResponse(formatInfo, 'Barcode format information'));
  })
);

/**
 * POST /api/v1/barcode/batch-process
 * Process multiple barcodes in a single request (for bulk operations)
 */
router.post('/batch-process',
  asyncHandler(async (req, res) => {
    const { barcodes } = req.body;
    
    if (!Array.isArray(barcodes)) {
      return res.status(400).json(errorResponse(
        'Barcodes must be an array',
        'INVALID_BATCH_INPUT'
      ));
    }
    
    if (barcodes.length === 0) {
      return res.status(400).json(errorResponse(
        'At least one barcode is required',
        'EMPTY_BATCH'
      ));
    }
    
    if (barcodes.length > 100) {
      return res.status(400).json(errorResponse(
        'Maximum 100 barcodes per batch',
        'BATCH_TOO_LARGE'
      ));
    }
    
    const results = barcodes.map((barcode, index) => {
      try {
        const result = processBarcodeComplete(barcode);
        return {
          index,
          barcode,
          ...result
        };
      } catch (error) {
        return {
          index,
          barcode,
          success: false,
          error: {
            message: error.message,
            code: error.code || 'UNKNOWN_ERROR'
          }
        };
      }
    });
    
    const summary = {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      lineAssignments: {
        line1: results.filter(r => r.success && r.lineAssignment?.lineNumber === 1).length,
        line2: results.filter(r => r.success && r.lineAssignment?.lineNumber === 2).length
      }
    };
    
    const response = {
      summary,
      results,
      processedAt: new Date().toISOString()
    };
    
    res.json(successResponse(response, `Processed ${summary.total} barcodes`));
  })
);

/**
 * POST /api/v1/barcode/process-with-overrides
 * Process barcode with optional manual overrides for specification correction
 */
router.post('/process-with-overrides',
  asyncHandler(async (req, res) => {
    const { barcode, overrides = {}, metadata = {} } = req.body;
    
    if (!barcode) {
      return res.status(400).json(errorResponse(
        'Barcode is required',
        'MISSING_BARCODE'
      ));
    }
    
    try {
      // First process the barcode normally
      const barcodeResult = processBarcodeComplete(barcode);
      
      if (!barcodeResult.success) {
        return res.status(400).json(errorResponse(
          'Barcode processing failed',
          'BARCODE_PROCESSING_FAILED',
          barcodeResult.error
        ));
      }
      
      // Create panel specification with overrides
      const panelSpec = PanelSpecification.fromBarcodeWithOverrides(barcodeResult, overrides);
      
      // Add metadata if provided
      if (metadata.overrideReason) panelSpec.overrideReason = metadata.overrideReason;
      if (metadata.userId) panelSpec.overrideBy = metadata.userId;
      if (metadata.specialInstructions) panelSpec.specialInstructions = metadata.specialInstructions;
      if (metadata.qcNotes) panelSpec.qcNotes = metadata.qcNotes;
      
      // Update line assignment if panel type was overridden
      if (overrides.panelType) {
        panelSpec.updateLineAssignment();
      }
      
      const result = {
        original: barcodeResult,
        specification: panelSpec.toApiFormat(),
        processedAt: new Date().toISOString()
      };
      
      res.json(successResponse(result, 'Barcode processed with overrides successfully'));
      
    } catch (error) {
      if (error instanceof BarcodeError) {
        res.status(400).json(errorResponse(
          error.message,
          error.code,
          { component: error.component }
        ));
      } else {
        throw error;
      }
    }
  })
);

/**
 * POST /api/v1/barcode/manual-specification
 * Create complete manual panel specification (for damaged/missing barcodes)
 */
router.post('/manual-specification',
  asyncHandler(async (req, res) => {
    const { specification, metadata = {} } = req.body;
    
    if (!specification) {
      return res.status(400).json(errorResponse(
        'Panel specification is required',
        'MISSING_SPECIFICATION'
      ));
    }
    
    // Required fields for manual specification
    const requiredFields = ['panelType'];
    const missingFields = requiredFields.filter(field => !specification[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json(errorResponse(
        `Missing required fields: ${missingFields.join(', ')}`,
        'MISSING_REQUIRED_FIELDS',
        { missingFields }
      ));
    }
    
    try {
      const panelSpec = PanelSpecification.createManualSpecification(specification, metadata);
      
      // Determine line assignment
      panelSpec.updateLineAssignment();
      
      const result = {
        specification: panelSpec.toApiFormat(),
        databaseFormat: panelSpec.toDatabaseFormat(),
        processedAt: new Date().toISOString()
      };
      
      res.json(successResponse(result, 'Manual panel specification created successfully'));
      
    } catch (error) {
      if (error instanceof BarcodeError) {
        res.status(400).json(errorResponse(
          error.message,
          error.code
        ));
      } else {
        throw error;
      }
    }
  })
);

/**
 * GET /api/v1/barcode/specification-options
 * Get available options for panel specification UI dropdowns
 */
router.get('/specification-options',
  asyncHandler(async (req, res) => {
    const options = {
      panelTypes: SPECIFICATION_HELPERS.getPanelTypeOptions(),
      constructionTypes: SPECIFICATION_HELPERS.getConstructionTypeOptions(),
      frameColors: SPECIFICATION_HELPERS.getFrameColorOptions(),
      qualityGrades: SPECIFICATION_HELPERS.getQualityGradeOptions(),
      productionYears: PANEL_SPECIFICATION_CONFIG.VALID_YEARS.map(year => ({
        value: year,
        label: year
      })),
      wattageRanges: PANEL_SPECIFICATION_CONFIG.WATTAGE_RANGES,
      usage: {
        description: 'Options for manual panel specification UI',
        notes: [
          'Panel type selection automatically updates nominal wattage and line assignment',
          'Wattage can be manually adjusted within the valid range for each panel type',
          'Construction type affects testing procedures at Station 1',
          'Frame color affects visual inspection criteria'
        ]
      }
    };
    
    res.json(successResponse(options, 'Panel specification options'));
  })
);

/**
 * POST /api/v1/barcode/validate-specification
 * Validate manual panel specification before saving
 */
router.post('/validate-specification',
  asyncHandler(async (req, res) => {
    const { specification } = req.body;
    
    if (!specification) {
      return res.status(400).json(errorResponse(
        'Specification is required',
        'MISSING_SPECIFICATION'
      ));
    }
    
    try {
      const panelSpec = new PanelSpecification(specification);
      const validation = panelSpec.validate();
      
      const result = {
        specification,
        validation,
        lineAssignment: specification.panelType ? 
          (() => {
            try {
              return panelSpec.updateLineAssignment();
            } catch (error) {
              return { error: error.message };
            }
          })() : null,
        validatedAt: new Date().toISOString()
      };
      
      if (validation.isValid) {
        res.json(successResponse(result, 'Specification validation passed'));
      } else {
        res.status(400).json(errorResponse(
          'Specification validation failed',
          'VALIDATION_FAILED',
          validation.errors
        ));
      }
      
    } catch (error) {
      if (error instanceof BarcodeError) {
        res.status(400).json(errorResponse(
          error.message,
          error.code
        ));
      } else {
        throw error;
      }
    }
  })
);

/**
 * GET /api/v1/barcode/wattage-range/:panelType
 * Get valid wattage range for specific panel type
 */
router.get('/wattage-range/:panelType',
  asyncHandler(async (req, res) => {
    const { panelType } = req.params;
    
    const range = SPECIFICATION_HELPERS.getWattageRangeForPanelType(panelType);
    
    if (!range) {
      return res.status(404).json(errorResponse(
        `No wattage range found for panel type: ${panelType}`,
        'PANEL_TYPE_NOT_FOUND'
      ));
    }
    
    const result = {
      panelType,
      wattageRange: range,
      recommendations: {
        nominal: range.nominal,
        tolerance: {
          high: Math.round(range.nominal * 1.05),
          low: Math.round(range.nominal * 0.95)
        }
      }
    };
    
    res.json(successResponse(result, `Wattage range for ${panelType}-cell panels`));
  })
);

/**
 * GET /api/v1/barcode/test-data
 * Get test barcodes for development (valid and invalid examples)
 */
router.get('/test-data',
  asyncHandler(async (req, res) => {
    const testData = {
      valid: {
        line1: [
          'CRS24WT3600001',
          'CRS24WT4000002',
          'CRS24WT6000003',
          'CRS24WT7200004'
        ],
        line2: [
          'CRS24WT14400001'
        ]
      },
      invalid: [
        { barcode: 'INVALID123', reason: 'Invalid length' },
        { barcode: 'ABC24WT3600001', reason: 'Invalid company prefix' },
        { barcode: 'CRS15WT3600001', reason: 'Invalid year' },
        { barcode: 'CRS24XT3600001', reason: 'Invalid factory code' },
        { barcode: 'CRS24WX3600001', reason: 'Invalid batch code' },
        { barcode: 'CRS24WT9900001', reason: 'Invalid panel type' },
        { barcode: 'CRS24WT360001', reason: 'Invalid sequence format' }
      ],
      override_examples: {
        description: 'Examples of common override scenarios',
        scenarios: [
          {
            name: 'Wattage correction',
            original_barcode: 'CRS24WT3600001',
            override: { nominalWattage: 205 },
            reason: 'Flash test showed higher than nominal wattage'
          },
          {
            name: 'Panel type correction',
            original_barcode: 'CRS24WT3600001',
            override: { panelType: '40', nominalWattage: 220 },
            reason: 'Barcode damaged, visual inspection confirmed 40-cell panel'
          },
          {
            name: 'Construction type specification',
            original_barcode: 'CRS24WT14400001',
            override: { constructionType: 'bifacial', frameColor: 'black' },
            reason: 'Special bifacial variant with black frame'
          }
        ]
      },
      usage: {
        description: 'Test data for barcode system development and testing',
        endpoints: {
          process: 'POST /api/v1/barcode/process',
          processWithOverrides: 'POST /api/v1/barcode/process-with-overrides',
          manualSpecification: 'POST /api/v1/barcode/manual-specification',
          validate: 'POST /api/v1/barcode/validate',
          batchProcess: 'POST /api/v1/barcode/batch-process'
        }
      }
    };
    
    res.json(successResponse(testData, 'Test barcode data with override examples'));
  })
);

/**
 * POST /api/v1/barcode/generate
 * Generate test barcodes for development and testing
 */
router.post('/generate', asyncHandler(async (req, res) => {
  const { count = 1, options = {} } = req.body;
  
  try {
    const generator = new BarcodeGenerator();
    
    let result;
    if (count === 1) {
      result = { barcodes: [generator.generateBarcode(options)] };
    } else {
      result = generator.generateBarcodes(count, options);
    }
    
    res.json(successResponse(result, `Generated ${count} barcode(s) successfully`));
    
  } catch (error) {
    if (error instanceof BarcodeGenerationError) {
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
 * POST /api/v1/barcode/generate-mo-range
 * Generate barcode range for Manufacturing Order
 */
router.post('/generate-mo-range', asyncHandler(async (req, res) => {
  const { moId, targetQuantity, specifications = {} } = req.body;
  
  if (!moId || !targetQuantity) {
    return res.status(400).json(errorResponse(
      'MO ID and target quantity are required',
      'MISSING_PARAMETERS'
    ));
  }
  
  try {
    const generator = new BarcodeGenerator();
    const range = generator.generateMORange(moId, targetQuantity, specifications);
    
    res.status(201).json(successResponse(range, `MO range created for ${targetQuantity} panels`));
    
  } catch (error) {
    if (error instanceof BarcodeGenerationError) {
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
 * GET /api/v1/barcode/generate-from-mo/:moId/:position
 * Generate specific barcode from MO range
 */
router.get('/generate-from-mo/:moId/:position', asyncHandler(async (req, res) => {
  const { moId, position } = req.params;
  
  try {
    const generator = new BarcodeGenerator();
    const result = generator.generateFromMORange(parseInt(moId), parseInt(position));
    
    res.json(successResponse(result, `Generated barcode at position ${position} for MO ${moId}`));
    
  } catch (error) {
    if (error instanceof BarcodeGenerationError) {
      const statusCode = error.code === 'MO_RANGE_NOT_FOUND' ? 404 : 400;
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
 * POST /api/v1/barcode/validate-mo-template
 * Validate MO barcode template
 */
router.post('/validate-mo-template', asyncHandler(async (req, res) => {
  const { template, specifications = {} } = req.body;
  
  if (!template) {
    return res.status(400).json(errorResponse(
      'Template is required',
      'MISSING_TEMPLATE'
    ));
  }
  
  try {
    const generator = new BarcodeGenerator();
    const result = generator.validateMOTemplate(template, specifications);
    
    const statusCode = result.isValid ? 200 : 400;
    const message = result.isValid ? 'Template is valid' : 'Template validation failed';
    
    res.status(statusCode).json(successResponse(result, message));
    
  } catch (error) {
    if (error instanceof BarcodeGenerationError) {
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
 * GET /api/v1/barcode/test-dataset
 * Generate comprehensive test dataset
 */
router.get('/test-dataset', asyncHandler(async (req, res) => {
  const { 
    samplesPerType = 5,
    includeEdgeCases = true,
    includeInvalid = false 
  } = req.query;
  
  try {
    const generator = new BarcodeGenerator();
    const dataset = generator.generateTestDataset({
      samplesPerType: parseInt(samplesPerType),
      includeEdgeCases: includeEdgeCases === 'true',
      includeInvalid: includeInvalid === 'true'
    });
    
    res.json(successResponse(dataset, 'Test dataset generated successfully'));
    
  } catch (error) {
    if (error instanceof BarcodeGenerationError) {
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
 * GET /api/v1/barcode/generation-stats
 * Get barcode generation statistics
 */
router.get('/generation-stats', asyncHandler(async (req, res) => {
  try {
    const generator = new BarcodeGenerator();
    const stats = generator.getStatistics();
    
    res.json(successResponse(stats, 'Generation statistics retrieved'));
    
  } catch (error) {
    throw error;
  }
}));

/**
 * DELETE /api/v1/barcode/clear-cache
 * Clear generation cache
 */
router.delete('/clear-cache', asyncHandler(async (req, res) => {
  try {
    const generator = new BarcodeGenerator();
    const result = generator.clearCache();
    
    res.json(successResponse(result, 'Generation cache cleared successfully'));
    
  } catch (error) {
    throw error;
  }
}));

export default router;
