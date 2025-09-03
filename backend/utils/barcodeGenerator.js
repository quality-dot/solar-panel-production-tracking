// Barcode Generation Utilities
// Tools for creating valid test barcodes, MO-specific ranges, and bulk generation

import { 
  BARCODE_CONFIG, 
  validateBarcodeComponents,
  processBarcodeComplete 
} from './barcodeProcessor.js';

/**
 * Custom error class for barcode generation operations
 */
export class BarcodeGenerationError extends Error {
  constructor(message, code, details = null) {
    super(message);
    this.name = 'BarcodeGenerationError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Barcode Generator Class
 * Handles creation of valid test barcodes and MO-specific ranges
 */
export class BarcodeGenerator {
  constructor() {
    this.generatedBarcodes = new Set();
    this.moRanges = new Map();
  }

  /**
   * Generate a single valid barcode
   */
  generateBarcode(options = {}) {
    const {
      factoryCode = 'CRS',
      productionYear = new Date().getFullYear().toString().slice(-2),
      panelType = null,
      constructionType = null,
      sequence = null,
      ensureUnique = true,
      moId = null,
      lineAssignment = null
    } = options;

    try {
      // Determine panel type if not specified
      const selectedPanelType = panelType || this._selectRandomPanelType();
      
      // Determine construction type if not specified
      const selectedConstruction = constructionType || this._selectRandomConstruction(selectedPanelType);
      
      // Generate sequence number
      const sequenceNumber = sequence || this._generateSequenceNumber();
      
      // Build barcode in CRSYYFBPP##### format
      const barcodeFormat = `CRS${productionYear}${selectedConstruction}T${selectedPanelType}${sequenceNumber.toString().padStart(5, '0')}`;

      // Ensure uniqueness if requested
      if (ensureUnique && this.generatedBarcodes.has(barcodeFormat)) {
        return this.generateBarcode({
          ...options,
          sequence: this._generateSequenceNumber()
        });
      }

      // Validate generated barcode
      const processResult = processBarcodeComplete(barcodeFormat);
      const validation = { isValid: processResult.success, errors: processResult.error };
      if (!validation.isValid) {
        throw new BarcodeGenerationError(
          'Generated invalid barcode',
          'GENERATION_FAILED',
          { barcode: barcodeFormat, errors: processResult.error }
        );
      }

      // Track generated barcode
      if (ensureUnique) {
        this.generatedBarcodes.add(barcodeFormat);
      }

      // Get full processing result
      const fullProcessResult = processBarcodeComplete(barcodeFormat);
      return {
        barcode: barcodeFormat,
        components: {
          factoryCode,
          productionYear,
          constructionType: selectedConstruction,
          panelType: selectedPanelType,
          sequenceNumber
        },
        processing: fullProcessResult,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      if (error instanceof BarcodeGenerationError) {
        throw error;
      }

      throw new BarcodeGenerationError(
        'Barcode generation failed',
        'GENERATION_ERROR',
        { originalError: error.message, options }
      );
    }
  }

  /**
   * Generate multiple barcodes
   */
  generateBarcodes(count, options = {}) {
    if (count <= 0 || count > 10000) {
      throw new BarcodeGenerationError(
        'Invalid count: must be between 1 and 10000',
        'INVALID_COUNT',
        { requestedCount: count }
      );
    }

    const barcodes = [];
    const errors = [];

    for (let i = 0; i < count; i++) {
      try {
        const barcode = this.generateBarcode(options);
        barcodes.push(barcode);
      } catch (error) {
        errors.push({
          index: i,
          error: error.message,
          code: error.code
        });
      }
    }

    return {
      success: errors.length === 0,
      barcodes,
      errors,
      statistics: {
        requested: count,
        generated: barcodes.length,
        failed: errors.length,
        successRate: ((barcodes.length / count) * 100).toFixed(2) + '%'
      },
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Generate barcode range for a Manufacturing Order
   */
  generateMORange(moId, targetQuantity, options = {}) {
    const {
      factoryCode = 'CRS',
      productionYear = new Date().getFullYear().toString().slice(-2),
      panelType = null,
      constructionType = null,
      startSequence = null,
      reserveExtra = 0.1 // Reserve 10% extra for potential rework
    } = options;

    try {
      if (targetQuantity <= 0 || targetQuantity > 50000) {
        throw new BarcodeGenerationError(
          'Invalid target quantity: must be between 1 and 50000',
          'INVALID_QUANTITY',
          { targetQuantity }
        );
      }

      // Calculate total needed (including reserve)
      const reserveQuantity = Math.ceil(targetQuantity * reserveExtra);
      const totalQuantity = targetQuantity + reserveQuantity;

      // Determine starting sequence
      const startSeq = startSequence || this._generateStartingSequence(moId);
      
      // Determine panel specifications
      const selectedPanelType = panelType || this._selectRandomPanelType();
      const selectedConstruction = constructionType || this._selectRandomConstruction(selectedPanelType);

      // Generate range template
      const template = this._createBarcodeTemplate({
        factoryCode,
        productionYear,
        constructionType: selectedConstruction,
        panelType: selectedPanelType
      });

      // Generate the range
      const range = {
        moId,
        template,
        startSequence: startSeq,
        endSequence: startSeq + totalQuantity - 1,
        targetQuantity,
        reserveQuantity,
        totalQuantity,
        specifications: {
          factoryCode,
          productionYear,
          panelType: selectedPanelType,
          constructionType: selectedConstruction
        },
        sampleBarcodes: [],
        createdAt: new Date().toISOString()
      };

      // Generate sample barcodes
      const sampleIndices = [0, Math.floor(totalQuantity / 4), Math.floor(totalQuantity / 2), Math.floor(totalQuantity * 0.75), totalQuantity - 1];
      
      for (const index of sampleIndices) {
        const sequence = startSeq + index;
        const sampleBarcode = template.replace('#####', sequence.toString().padStart(5, '0'));
        
        range.sampleBarcodes.push({
          position: index + 1,
          sequence,
          barcode: sampleBarcode,
          processing: processBarcodeComplete(sampleBarcode)
        });
      }

      // Store range for future reference
      this.moRanges.set(moId, range);

      return range;

    } catch (error) {
      if (error instanceof BarcodeGenerationError) {
        throw error;
      }

      throw new BarcodeGenerationError(
        'MO range generation failed',
        'MO_RANGE_ERROR',
        { originalError: error.message, moId, targetQuantity }
      );
    }
  }

  /**
   * Generate specific barcode from MO range
   */
  generateFromMORange(moId, position) {
    const range = this.moRanges.get(moId);
    
    if (!range) {
      throw new BarcodeGenerationError(
        `MO range not found: ${moId}`,
        'MO_RANGE_NOT_FOUND',
        { moId }
      );
    }

    if (position < 1 || position > range.totalQuantity) {
      throw new BarcodeGenerationError(
        `Position out of range: ${position}`,
        'POSITION_OUT_OF_RANGE',
        { position, range: `1-${range.totalQuantity}` }
      );
    }

    const sequence = range.startSequence + position - 1;
    const barcode = range.template.replace('#####', sequence.toString().padStart(5, '0'));

    return {
      moId,
      position,
      sequence,
      barcode,
      isReserve: position > range.targetQuantity,
      processing: processBarcodeComplete(barcode),
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Generate complete test dataset
   */
  generateTestDataset(options = {}) {
    const {
      samplesPerType = 5,
      includeEdgeCases = true,
      includeInvalid = false
    } = options;

    const dataset = {
      valid: [],
      edgeCases: [],
      invalid: [],
      moRanges: [],
      generatedAt: new Date().toISOString()
    };

    try {
      // Generate samples for each panel type and construction
      for (const panelType of BARCODE_CONFIG.VALID_PANEL_TYPES) {
        for (const construction of BARCODE_CONFIG.VALID_FACTORY_CODES) {
          const barcodeResult = this.generateBarcodes(samplesPerType, {
            panelType,
            constructionType: construction.code
          });
          
          dataset.valid.push({
            panelType,
            constructionType: construction.code,
            samples: barcodeResult.barcodes
          });
        }
      }

      // Generate edge cases
      if (includeEdgeCases) {
        dataset.edgeCases = [
          this.generateBarcode({ sequence: 1 }), // First possible sequence
          this.generateBarcode({ sequence: 99999 }), // Last possible sequence
          this.generateBarcode({ productionYear: '00' }), // Year 2000
          this.generateBarcode({ productionYear: '99' }), // Year 2099
        ];
      }

      // Generate MO ranges
      for (let i = 1; i <= 3; i++) {
        const moRange = this.generateMORange(i, 1000 + (i * 500), {
          panelType: BARCODE_CONFIG.VALID_PANEL_TYPES[i - 1]
        });
        dataset.moRanges.push(moRange);
      }

      // Generate invalid barcodes if requested
      if (includeInvalid) {
        dataset.invalid = [
          'INVALID123',
          'CRS24WT3600', // Too short
          'CRS24WT360000000', // Too long
          'XYZ24WT3600001', // Invalid factory
          'CRS24ZT3600001', // Invalid construction
          'CRS24W99600001', // Invalid panel type
        ];
      }

      return dataset;

    } catch (error) {
      throw new BarcodeGenerationError(
        'Test dataset generation failed',
        'DATASET_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Validate MO barcode template
   */
  validateMOTemplate(template, moSpecifications) {
    const { panelType, constructionType, expectedQuantity } = moSpecifications;
    
    try {
      // Basic template format validation
      if (!template.includes('#####')) {
        throw new BarcodeGenerationError(
          'Template must include ##### for sequence number',
          'INVALID_TEMPLATE_FORMAT'
        );
      }

      // Generate sample barcode from template
      const sampleBarcode = template.replace('#####', '00001');
      const processResult = processBarcodeComplete(sampleBarcode);
      const validation = { isValid: processResult.success, errors: processResult.error };
      
      if (!processResult.success) {
        throw new BarcodeGenerationError(
          'Template generates invalid barcodes',
          'INVALID_TEMPLATE',
          processResult.error
        );
      }

      }

      // Check sequence capacity
      const maxSequence = 99999;
      if (expectedQuantity > maxSequence) {
        errors.push(`Expected quantity ${expectedQuantity} exceeds maximum sequence capacity ${maxSequence}`);
      }

      return {
        template,
        isValid: true,
        errors,
        sampleBarcode,
          maxCapacity: maxSequence
        },
        validatedAt: new Date().toISOString()
      };

    } catch (error) {
      if (error instanceof BarcodeGenerationError) {
        throw error;
      }

      throw new BarcodeGenerationError(
        'Template validation failed',
        'VALIDATION_ERROR',
        { originalError: error.message, template }
      );
    }
  }

  /**
   * Get generation statistics
   */
  getStatistics() {
    return {
      totalGenerated: this.generatedBarcodes.size,
      moRangesCreated: this.moRanges.size,
      availableRanges: Array.from(this.moRanges.keys()),
      generationCapacity: {
        maxSequence: 99999,
        factoryCodes: BARCODE_CONFIG.VALID_FACTORY_CODES,
        panelTypes: BARCODE_CONFIG.VALID_PANEL_TYPES,
        constructionTypes: BARCODE_CONFIG.VALID_FACTORY_CODES.map(c => c.code)
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Clear generated barcode tracking
   */
  clearCache() {
    this.generatedBarcodes.clear();
    this.moRanges.clear();
    
    return {
      success: true,
      message: 'Generation cache cleared',
      clearedAt: new Date().toISOString()
    };
  }

  /**
   * Generate barcode from specific position in MO range
   */
  generateFromMORange(moId, position) {
    try {
      const moRange = this.moRanges.get(moId);
      if (!moRange) {
        throw new BarcodeGenerationError(
          'MO range not found',
          'MO_RANGE_NOT_FOUND',
          { moId }
        );
      }

      if (position < 1 || position > moRange.totalQuantity) {
        throw new BarcodeGenerationError(
          'Invalid position in MO range',
          'INVALID_POSITION',
          { position, rangeSize: moRange.totalQuantity }
        );
      }

      const sequence = moRange.startSequence + position - 1;
      const barcode = moRange.template.replace('#####', sequence.toString().padStart(5, '0'));
      
      return {
        barcode,
        position,
        moId,
        sequence,
        metadata: moRange.specifications,
        processing: processBarcodeComplete(barcode)
      };

    } catch (error) {
      throw new BarcodeGenerationError(
        'Failed to generate barcode from MO range',
        'MO_RANGE_ACCESS_FAILED',
        { moId, position, originalError: error.message }
      );
    }
  }

  /**
   * Validate MO barcode template
   */
  validateMOTemplate(template, specifications = {}) {
    try {
      const errors = [];
      const warnings = [];

      // Validate required fields
      if (!template.panelType) {
        errors.push('Panel type is required');
      } else if (!['36', '40', '60', '72', '144'].includes(template.panelType)) {
        errors.push('Invalid panel type');
      }

      if (!template.targetQuantity || template.targetQuantity < 1) {
        errors.push('Target quantity must be at least 1');
      }

      if (template.targetQuantity > 10000) {
        warnings.push('Large target quantity may impact performance');
      }

      // Validate panel type consistency with line assignment
      if (template.panelType && template.lineAssignment) {
        const expectedLine = this._determineLineAssignment(template.panelType);
        if (template.lineAssignment !== expectedLine) {
          warnings.push(`Panel type ${template.panelType} typically goes to ${expectedLine}, not ${template.lineAssignment}`);
        }
      }

      // Validate sequence range
      if (template.startSequence && template.endSequence) {
        if (template.startSequence >= template.endSequence) {
          errors.push('Start sequence must be less than end sequence');
        }
        
        const rangeSize = template.endSequence - template.startSequence + 1;
        if (rangeSize !== template.targetQuantity) {
          warnings.push(`Sequence range (${rangeSize}) doesn't match target quantity (${template.targetQuantity})`);
        }
      }

      const isValid = errors.length === 0;
      
      return {
        isValid,
        errors,
        warnings,
        template,
        specifications,
        validatedAt: new Date().toISOString()
      };

    } catch (error) {
      return {
        isValid: false,
        errors: ['Template validation failed: ' + error.message],
        warnings: [],
        template,
        specifications,
        validatedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Get comprehensive test dataset
   */
  generateTestDataset(options = {}) {
    const {
      samplesPerType = 5,
      includeEdgeCases = true,
      includeInvalid = false
    } = options;

    const dataset = {
      valid: {},
      edgeCases: [],
      invalid: [],
      metadata: {
        generatedAt: new Date().toISOString(),
        options
      }
    };

    // Generate samples for each panel type
    const panelTypes = ['36', '40', '60', '72', '144'];
    
    for (const panelType of panelTypes) {
      dataset.valid[panelType] = this.generateBarcodes(samplesPerType, { 
        panelType,
        ensureUnique: true
      });
    }

    // Generate edge cases
    if (includeEdgeCases) {
      dataset.edgeCases = [
        this.generateBarcode({ panelType: '36', sequence: 1 }),
        this.generateBarcode({ panelType: '144', sequence: 99999 }),
        this.generateBarcode({ productionYear: '20' }),
        this.generateBarcode({ productionYear: '99' })
      ];
    }

    // Generate invalid examples for testing
    if (includeInvalid) {
      dataset.invalid = [
        { barcode: 'INVALID123', reason: 'Invalid format' },
        { barcode: 'CRS15YBPP00001', reason: 'Invalid year' },
        { barcode: 'CRS24XBPP00001', reason: 'Invalid construction type' },
        { barcode: 'CRS24YBPP0001', reason: 'Too short' },
        { barcode: 'CRS24YBPP000001', reason: 'Too long' }
      ];
    }

    return dataset;
  }

  /**
   * Get generation statistics
   */
  getStatistics() {
    const totalGenerated = this.generatedBarcodes.size;
    const totalMORanges = this.moRanges.size;
    
    // Calculate success rates
    const successRate = totalGenerated > 0 ? 100 : 0;
    
    // Panel type distribution
    const panelTypeCounts = {};
    for (const barcode of this.generatedBarcodes) {
      const panelType = barcode.substring(6, 8);
      panelTypeCounts[panelType] = (panelTypeCounts[panelType] || 0) + 1;
    }

    return {
      totalGenerated,
      totalMORanges,
      successRate: `${successRate}%`,
      panelTypeDistribution: panelTypeCounts,
      cacheSize: {
        barcodes: this.generatedBarcodes.size,
        moRanges: this.moRanges.size
      },
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Determine line assignment for panel type
   */
  _determineLineAssignment(panelType) {
    if (panelType === '144') {
      return 'LINE_2';
    } else {
      return 'LINE_1';
    }
  }

  // Private helper methods

  _selectRandomPanelType() {
    const types = BARCODE_CONFIG.VALID_PANEL_TYPES;
    return types[Math.floor(Math.random() * types.length)];
  }

  _selectRandomConstruction(panelType) {
    // Bias construction type selection based on panel type
    // For solar panels, we use factory codes as construction types
    const constructions = BARCODE_CONFIG.VALID_FACTORY_CODES;
    
    if (panelType === '144') {
      // 144-cell panels are more commonly bifacial (T)
      return Math.random() < 0.7 ? 'T' : 'W';
    } else {
      // Other types are more commonly monofacial (W)
      return Math.random() < 0.8 ? 'W' : 'T';
    }
  }

  _generateSequenceNumber() {
    return Math.floor(Math.random() * 99999) + 1;
  }

  _generateStartingSequence(moId) {
    // Generate predictable but spread-out starting sequences for MOs
    const base = (moId * 10000) % 90000;
    return base + 1000;
  }

  _createBarcodeTemplate(specs) {
    const { factoryCode, productionYear, constructionType, panelType } = specs;
    
    // Format: CRSYYFBPP#####
    // CRS: Company prefix (fixed)
    // YY: Year (2 digits)
    // F: Factory identifier (from constructionType)
    // B: Batch indicator (default to 'T' for test)
    // PP: Panel type (2 digits)
    // #####: Sequence placeholder
    return `CRS${productionYear}${constructionType}T${panelType}#####`;
  }
}

// Export singleton instance
export const barcodeGenerator = new BarcodeGenerator();

// Utility functions for common use cases

/**
 * Generate a single random barcode quickly
 */
export function generateRandomBarcode(options = {}) {
  return barcodeGenerator.generateBarcode(options);
}

/**
 * Generate test barcodes for a specific panel type
 */
export function generateTestBarcodes(panelType, count = 10) {
  return barcodeGenerator.generateBarcodes(count, { panelType });
}

/**
 * Generate MO barcode range
 */
export function generateMOBarcodeRange(moId, quantity, specifications = {}) {
  return barcodeGenerator.generateMORange(moId, quantity, specifications);
}

/**
 * Create complete test dataset
 */
export function createTestDataset(options = {}) {
  return barcodeGenerator.generateTestDataset(options);
}

/**
 * Validate MO barcode template
 */
export function validateMOBarcodeTemplate(template, specifications) {
  return barcodeGenerator.validateMOTemplate(template, specifications);
}

export default {
  BarcodeGenerator,
  BarcodeGenerationError,
  barcodeGenerator,
  generateRandomBarcode,
  generateTestBarcodes,
  generateMOBarcodeRange,
  createTestDataset,
  validateMOBarcodeTemplate
};
