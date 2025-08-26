// Barcode Generator Tests
// Comprehensive testing for barcode generation utilities

import { jest } from '@jest/globals';
import { 
  BarcodeGenerator, 
  BarcodeGenerationError,
  barcodeGenerator,
  generateRandomBarcode,
  generateTestBarcodes,
  generateMOBarcodeRange,
  createTestDataset,
  validateMOBarcodeTemplate
} from '../barcodeGenerator.js';
import { BARCODE_CONFIG } from '../barcodeProcessor.js';

describe('BarcodeGenerator Class', () => {
  let generator;

  beforeEach(() => {
    generator = new BarcodeGenerator();
  });

  describe('generateBarcode', () => {
    test('should generate valid barcode with default options', () => {
      const result = generator.generateBarcode();

      expect(result.barcode).toBeDefined();
      expect(result.barcode).toMatch(/^CRS\d{2}[WT][346]\d{2}\d{5}$/);
      expect(result.components).toBeDefined();
      expect(result.processing.success).toBe(true);
      expect(result.generatedAt).toBeDefined();
    });

    test('should generate barcode with custom options', () => {
      const options = {
        factoryCode: 'CRS',
        productionYear: '24',
        panelType: '144',
        constructionType: 'T',
        sequence: 12345
      };

      const result = generator.generateBarcode(options);

      expect(result.barcode).toBe('CRS24T144412345');
      expect(result.components.factoryCode).toBe('CRS');
      expect(result.components.productionYear).toBe('24');
      expect(result.components.panelType).toBe('144');
      expect(result.components.constructionType).toBe('T');
      expect(result.components.sequenceNumber).toBe(12345);
    });

    test('should ensure uniqueness when requested', () => {
      const options = { 
        sequence: 1001,
        panelType: '36',
        constructionType: 'W',
        ensureUnique: true 
      };

      const result1 = generator.generateBarcode(options);
      const result2 = generator.generateBarcode(options); // Same options should generate different barcode

      expect(result1.barcode).not.toBe(result2.barcode);
      expect(result1.components.sequenceNumber).not.toBe(result2.components.sequenceNumber);
    });

    test('should generate barcode for each panel type', () => {
      const panelTypes = ['36', '40', '60', '72', '144'];
      
      for (const panelType of panelTypes) {
        const result = generator.generateBarcode({ panelType });
        
        expect(result.processing.result.panelSpecs.panelType).toBe(panelType);
        expect(result.barcode).toContain(panelType);
      }
    });

    test('should generate barcode for each construction type', () => {
      const constructionTypes = ['W', 'T'];
      
      for (const constructionType of constructionTypes) {
        const result = generator.generateBarcode({ constructionType });
        
        expect(result.processing.result.panelSpecs.constructionType).toBe(
          constructionType === 'W' ? 'monofacial' : 'bifacial'
        );
        expect(result.barcode).toContain(constructionType);
      }
    });
  });

  describe('generateBarcodes', () => {
    test('should generate multiple barcodes successfully', () => {
      const result = generator.generateBarcodes(5);

      expect(result.success).toBe(true);
      expect(result.barcodes).toHaveLength(5);
      expect(result.errors).toHaveLength(0);
      expect(result.statistics.generated).toBe(5);
      expect(result.statistics.successRate).toBe('100.00%');
    });

    test('should enforce count limits', () => {
      expect(() => generator.generateBarcodes(0))
        .toThrow(BarcodeGenerationError);
      
      expect(() => generator.generateBarcodes(10001))
        .toThrow(BarcodeGenerationError);
    });

    test('should generate unique barcodes by default', () => {
      const result = generator.generateBarcodes(100);
      const barcodes = result.barcodes.map(b => b.barcode);
      const uniqueBarcodes = new Set(barcodes);

      expect(uniqueBarcodes.size).toBe(barcodes.length);
    });

    test('should generate barcodes with consistent options', () => {
      const options = { panelType: '72', constructionType: 'T' };
      const result = generator.generateBarcodes(10, options);

      result.barcodes.forEach(barcode => {
        expect(barcode.components.panelType).toBe('72');
        expect(barcode.components.constructionType).toBe('T');
      });
    });
  });

  describe('generateMORange', () => {
    test('should generate valid MO range', () => {
      const moId = 101;
      const targetQuantity = 1000;
      
      const range = generator.generateMORange(moId, targetQuantity);

      expect(range.moId).toBe(moId);
      expect(range.targetQuantity).toBe(targetQuantity);
      expect(range.totalQuantity).toBeGreaterThan(targetQuantity); // Includes reserve
      expect(range.startSequence).toBeGreaterThan(0);
      expect(range.endSequence).toBeGreaterThan(range.startSequence);
      expect(range.template).toContain('#####');
      expect(range.sampleBarcodes).toHaveLength(5);
    });

    test('should enforce quantity limits', () => {
      expect(() => generator.generateMORange(1, 0))
        .toThrow(BarcodeGenerationError);
      
      expect(() => generator.generateMORange(1, 50001))
        .toThrow(BarcodeGenerationError);
    });

    test('should generate sample barcodes correctly', () => {
      const range = generator.generateMORange(102, 500);
      
      range.sampleBarcodes.forEach(sample => {
        expect(sample.barcode).toMatch(/^CRS\d{2}[WT][346]\d{2}\d{5}$/);
        expect(sample.processing.success).toBe(true);
        expect(sample.sequence).toBeGreaterThanOrEqual(range.startSequence);
        expect(sample.sequence).toBeLessThanOrEqual(range.endSequence);
      });
    });

    test('should store and retrieve MO ranges', () => {
      const moId = 103;
      const range1 = generator.generateMORange(moId, 750);
      
      // Generate barcode from range
      const barcodeFromRange = generator.generateFromMORange(moId, 1);
      
      expect(barcodeFromRange.moId).toBe(moId);
      expect(barcodeFromRange.position).toBe(1);
      expect(barcodeFromRange.sequence).toBe(range1.startSequence);
      expect(barcodeFromRange.isReserve).toBe(false);
    });

    test('should handle reserve quantities correctly', () => {
      const moId = 104;
      const targetQuantity = 100;
      const range = generator.generateMORange(moId, targetQuantity);
      
      // Test main production barcode
      const mainBarcode = generator.generateFromMORange(moId, targetQuantity);
      expect(mainBarcode.isReserve).toBe(false);
      
      // Test reserve barcode
      const reserveBarcode = generator.generateFromMORange(moId, targetQuantity + 1);
      expect(reserveBarcode.isReserve).toBe(true);
    });
  });

  describe('generateFromMORange', () => {
    beforeEach(() => {
      generator.generateMORange(201, 100);
    });

    test('should generate barcode from existing range', () => {
      const result = generator.generateFromMORange(201, 50);

      expect(result.moId).toBe(201);
      expect(result.position).toBe(50);
      expect(result.barcode).toBeDefined();
      expect(result.processing.success).toBe(true);
    });

    test('should throw error for non-existent MO', () => {
      expect(() => generator.generateFromMORange(999, 1))
        .toThrow(BarcodeGenerationError);
    });

    test('should throw error for invalid position', () => {
      expect(() => generator.generateFromMORange(201, 0))
        .toThrow(BarcodeGenerationError);
      
      expect(() => generator.generateFromMORange(201, 1000))
        .toThrow(BarcodeGenerationError);
    });
  });

  describe('generateTestDataset', () => {
    test('should create comprehensive test dataset', () => {
      const dataset = generator.generateTestDataset();

      expect(dataset.valid).toBeDefined();
      expect(dataset.edgeCases).toBeDefined();
      expect(dataset.moRanges).toBeDefined();
      expect(dataset.generatedAt).toBeDefined();

      // Should have samples for each panel type and construction type
      expect(dataset.valid.length).toBeGreaterThan(0);
      
      // Should have edge cases
      expect(dataset.edgeCases.length).toBeGreaterThan(0);
      
      // Should have MO ranges
      expect(dataset.moRanges.length).toBe(3);
    });

    test('should include invalid barcodes when requested', () => {
      const dataset = generator.generateTestDataset({ includeInvalid: true });

      expect(dataset.invalid).toBeDefined();
      expect(dataset.invalid.length).toBeGreaterThan(0);
    });

    test('should respect sample count options', () => {
      const samplesPerType = 3;
      const dataset = generator.generateTestDataset({ samplesPerType });

      dataset.valid.forEach(typeGroup => {
        expect(typeGroup.samples).toHaveLength(samplesPerType);
      });
    });
  });

  describe('validateMOTemplate', () => {
    test('should validate correct template', () => {
      const template = 'CRS24WT36#####';
      const specifications = {
        panelType: '36',
        constructionType: 'monofacial',
        expectedQuantity: 1000
      };

      const result = generator.validateMOTemplate(template, specifications);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sampleBarcode).toBe('CRS24WT3600001');
      expect(result.templateAnalysis).toBeDefined();
    });

    test('should detect template format errors', () => {
      const invalidTemplate = 'CRS24WT36'; // Missing #####
      const specifications = { panelType: '36' };

      expect(() => generator.validateMOTemplate(invalidTemplate, specifications))
        .toThrow(BarcodeGenerationError);
    });

    test('should detect specification mismatches', () => {
      const template = 'CRS24WT36#####';
      const specifications = {
        panelType: '72', // Doesn't match template
        constructionType: 'bifacial', // Doesn't match template
        expectedQuantity: 500
      };

      const result = generator.validateMOTemplate(template, specifications);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Panel type mismatch');
      expect(result.errors[1]).toContain('Construction type mismatch');
    });

    test('should detect quantity capacity issues', () => {
      const template = 'CRS24WT36#####';
      const specifications = {
        expectedQuantity: 100000 // Exceeds sequence capacity
      };

      const result = generator.validateMOTemplate(template, specifications);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('exceeds maximum sequence capacity'))).toBe(true);
    });
  });

  describe('getStatistics', () => {
    test('should return generation statistics', () => {
      generator.generateBarcodes(10);
      generator.generateMORange(301, 100);

      const stats = generator.getStatistics();

      expect(stats.totalGenerated).toBe(10);
      expect(stats.moRangesCreated).toBe(1);
      expect(stats.availableRanges).toContain(301);
      expect(stats.generationCapacity).toBeDefined();
      expect(stats.timestamp).toBeDefined();
    });
  });

  describe('clearCache', () => {
    test('should clear generation cache', () => {
      generator.generateBarcodes(5);
      generator.generateMORange(401, 50);

      const clearResult = generator.clearCache();
      const stats = generator.getStatistics();

      expect(clearResult.success).toBe(true);
      expect(stats.totalGenerated).toBe(0);
      expect(stats.moRangesCreated).toBe(0);
    });
  });
});

describe('Utility Functions', () => {
  describe('generateRandomBarcode', () => {
    test('should generate random barcode', () => {
      const result = generateRandomBarcode();

      expect(result.barcode).toBeDefined();
      expect(result.processing.success).toBe(true);
    });

    test('should respect options', () => {
      const result = generateRandomBarcode({ panelType: '144' });

      expect(result.components.panelType).toBe('144');
    });
  });

  describe('generateTestBarcodes', () => {
    test('should generate test barcodes for panel type', () => {
      const result = generateTestBarcodes('60', 3);

      expect(result.barcodes).toHaveLength(3);
      result.barcodes.forEach(barcode => {
        expect(barcode.components.panelType).toBe('60');
      });
    });
  });

  describe('generateMOBarcodeRange', () => {
    test('should generate MO range', () => {
      const result = generateMOBarcodeRange(501, 200);

      expect(result.moId).toBe(501);
      expect(result.targetQuantity).toBe(200);
    });
  });

  describe('createTestDataset', () => {
    test('should create test dataset', () => {
      const dataset = createTestDataset();

      expect(dataset.valid).toBeDefined();
      expect(dataset.moRanges).toBeDefined();
    });
  });

  describe('validateMOBarcodeTemplate', () => {
    test('should validate MO template', () => {
      const result = validateMOBarcodeTemplate('CRS24WT72#####', {
        panelType: '72',
        constructionType: 'monofacial',
        expectedQuantity: 500
      });

      expect(result.isValid).toBe(true);
    });
  });
});

describe('Error Handling', () => {
  test('should throw BarcodeGenerationError with proper structure', () => {
    const generator = new BarcodeGenerator();

    try {
      generator.generateBarcodes(-1);
    } catch (error) {
      expect(error).toBeInstanceOf(BarcodeGenerationError);
      expect(error.code).toBeDefined();
      expect(error.timestamp).toBeDefined();
      expect(error.message).toBeDefined();
    }
  });

  test('should handle edge cases gracefully', () => {
    const generator = new BarcodeGenerator();

    // Test edge sequence numbers
    const result1 = generator.generateBarcode({ sequence: 1 });
    const result2 = generator.generateBarcode({ sequence: 99999 });

    expect(result1.processing.success).toBe(true);
    expect(result2.processing.success).toBe(true);
  });
});

describe('Integration with BarcodeProcessor', () => {
  test('should generate barcodes that pass processor validation', () => {
    const generator = new BarcodeGenerator();
    const result = generator.generateBarcodes(50);

    result.barcodes.forEach(barcode => {
      expect(barcode.processing.success).toBe(true);
      expect(barcode.processing.result.lineAssignment).toBeDefined();
      expect(barcode.processing.result.panelSpecs).toBeDefined();
    });
  });

  test('should maintain consistency between generator and processor', () => {
    const generator = new BarcodeGenerator();
    
    for (const panelType of BARCODE_CONFIG.panelTypes) {
      const result = generator.generateBarcode({ panelType });
      
      expect(result.components.panelType).toBe(result.processing.result.panelSpecs.panelType);
      expect(result.processing.result.lineAssignment.lineName).toBeDefined();
    }
  });
});

// Performance tests
describe('Performance', () => {
  test('should generate 1000 barcodes in reasonable time', () => {
    const generator = new BarcodeGenerator();
    const startTime = Date.now();

    const result = generator.generateBarcodes(1000);
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(result.success).toBe(true);
    expect(result.barcodes).toHaveLength(1000);
    expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
  });

  test('should handle large MO ranges efficiently', () => {
    const generator = new BarcodeGenerator();
    const startTime = Date.now();

    const range = generator.generateMORange(999, 10000);
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(range.totalQuantity).toBeGreaterThan(10000);
    expect(duration).toBeLessThan(1000); // Should complete in under 1 second
  });
});
