// Comprehensive test suite for barcode processing system
// Tests parsing, validation, line assignment, and error handling

import {
  parseBarcode,
  validateBarcodeComponents,
  determineLineAssignment,
  processBarcodeComplete,
  generateTestBarcode,
  getBarcodeFormatInfo,
  BARCODE_CONFIG,
  BarcodeError
} from '../barcodeProcessor.js';

describe('Barcode Processing System', () => {
  
  describe('parseBarcode', () => {
    test('should parse valid barcode correctly', () => {
      const barcode = 'CRS24WT3600001';
      const result = parseBarcode(barcode);
      
      expect(result).toEqual({
        raw: 'CRS24WT3600001',
        companyPrefix: 'CRS',
        year: '24',
        factory: 'W',
        batch: 'T',
        panelType: '36',
        sequence: '00001'
      });
    });

    test('should handle lowercase input', () => {
      const barcode = 'crs24wt3600001';
      const result = parseBarcode(barcode);
      
      expect(result.raw).toBe('CRS24WT3600001');
      expect(result.companyPrefix).toBe('CRS');
    });

    test('should handle whitespace', () => {
      const barcode = '  CRS24WT3600001  ';
      const result = parseBarcode(barcode);
      
      expect(result.raw).toBe('CRS24WT3600001');
    });

    test('should throw error for invalid length', () => {
      expect(() => parseBarcode('CRS24WT360001')).toThrow(BarcodeError);
      expect(() => parseBarcode('CRS24WT36000001')).toThrow(BarcodeError);
    });

    test('should throw error for invalid input', () => {
      expect(() => parseBarcode(null)).toThrow(BarcodeError);
      expect(() => parseBarcode('')).toThrow(BarcodeError);
      expect(() => parseBarcode(123)).toThrow(BarcodeError);
    });
  });

  describe('validateBarcodeComponents', () => {
    const validComponents = {
      companyPrefix: 'CRS',
      year: '24',
      factory: 'W',
      batch: 'T',
      panelType: '36',
      sequence: '00001'
    };

    test('should validate correct components', () => {
      const result = validateBarcodeComponents(validComponents);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.validationTimestamp).toBeDefined();
    });

    test('should reject invalid company prefix', () => {
      const components = { ...validComponents, companyPrefix: 'ABC' };
      const result = validateBarcodeComponents(components);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].component).toBe('companyPrefix');
      expect(result.errors[0].code).toBe('INVALID_COMPANY_PREFIX');
    });

    test('should reject invalid year', () => {
      const components = { ...validComponents, year: '15' }; // Too old
      const result = validateBarcodeComponents(components);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0].component).toBe('year');
      expect(result.errors[0].code).toBe('INVALID_YEAR');
    });

    test('should reject invalid factory code', () => {
      const components = { ...validComponents, factory: 'X' };
      const result = validateBarcodeComponents(components);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0].component).toBe('factory');
      expect(result.errors[0].code).toBe('INVALID_FACTORY');
    });

    test('should reject invalid panel type', () => {
      const components = { ...validComponents, panelType: '99' };
      const result = validateBarcodeComponents(components);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0].component).toBe('panelType');
      expect(result.errors[0].code).toBe('INVALID_PANEL_TYPE');
    });

    test('should reject invalid sequence', () => {
      const components = { ...validComponents, sequence: '123' }; // Too short
      const result = validateBarcodeComponents(components);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0].component).toBe('sequence');
      expect(result.errors[0].code).toBe('INVALID_SEQUENCE');
    });

    test('should accumulate multiple errors', () => {
      const components = {
        companyPrefix: 'ABC',
        year: '15',
        factory: 'X',
        batch: 'T',
        panelType: '99',
        sequence: '123'
      };
      const result = validateBarcodeComponents(components);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('determineLineAssignment', () => {
    test('should assign Line 1 panel types correctly', () => {
      const line1Types = ['36', '40', '60', '72'];
      
      line1Types.forEach(panelType => {
        const result = determineLineAssignment(panelType);
        
        expect(result.lineNumber).toBe(1);
        expect(result.lineName).toBe('LINE_1');
        expect(result.panelType).toBe(panelType);
        expect(result.stationRange).toEqual([1, 2, 3, 4]);
        expect(result.isValid).toBe(true);
      });
    });

    test('should assign Line 2 panel types correctly', () => {
      const result = determineLineAssignment('144');
      
      expect(result.lineNumber).toBe(2);
      expect(result.lineName).toBe('LINE_2');
      expect(result.panelType).toBe('144');
      expect(result.stationRange).toEqual([5, 6, 7, 8]);
      expect(result.isValid).toBe(true);
    });

    test('should throw error for invalid panel type', () => {
      expect(() => determineLineAssignment('99')).toThrow(BarcodeError);
      expect(() => determineLineAssignment(null)).toThrow(BarcodeError);
      expect(() => determineLineAssignment('')).toThrow(BarcodeError);
    });
  });

  describe('processBarcodeComplete', () => {
    test('should process valid Line 1 barcode completely', () => {
      const barcode = 'CRS24WT3600001';
      const result = processBarcodeComplete(barcode);
      
      expect(result.success).toBe(true);
      expect(result.barcode).toBe(barcode);
      expect(result.components).toBeDefined();
      expect(result.validation.isValid).toBe(true);
      expect(result.lineAssignment.lineNumber).toBe(1);
      expect(result.manufacturing.panelTypeEnum).toBe('TYPE_36');
      expect(result.manufacturing.lineType).toBe('LINE_1');
      expect(result.manufacturing.initialStation).toBe(1);
      expect(result.processedAt).toBeDefined();
    });

    test('should process valid Line 2 barcode completely', () => {
      const barcode = 'CRS24WT14400001';
      const result = processBarcodeComplete(barcode);
      
      expect(result.success).toBe(true);
      expect(result.lineAssignment.lineNumber).toBe(2);
      expect(result.manufacturing.panelTypeEnum).toBe('TYPE_144');
      expect(result.manufacturing.lineType).toBe('LINE_2');
      expect(result.manufacturing.initialStation).toBe(5);
    });

    test('should handle invalid barcode gracefully', () => {
      const barcode = 'INVALID123';
      const result = processBarcodeComplete(barcode);
      
      expect(result.success).toBe(false);
      expect(result.barcode).toBe(barcode);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBeDefined();
      expect(result.error.message).toBeDefined();
      expect(result.processedAt).toBeDefined();
    });

    test('should handle validation failures', () => {
      const barcode = 'ABC24WT3600001'; // Invalid company prefix
      const result = processBarcodeComplete(barcode);
      
      expect(result.success).toBe(false);
      expect(result.validation.isValid).toBe(false);
      expect(result.lineAssignment).toBe(null);
    });
  });

  describe('generateTestBarcode', () => {
    test('should generate valid default barcode', () => {
      const barcode = generateTestBarcode();
      
      expect(barcode).toMatch(/^CRS\d{2}[WBT][TWB](36|40|60|72|144)\d{5}$/);
      expect(barcode.length).toBe(BARCODE_CONFIG.TOTAL_LENGTH);
    });

    test('should generate barcode with custom options', () => {
      const options = {
        year: 25,
        factory: 'B',
        batch: 'W',
        panelType: '144',
        sequence: 999
      };
      const barcode = generateTestBarcode(options);
      
      expect(barcode).toBe('CRS25BW14400999');
    });

    test('should pad sequence number correctly', () => {
      const barcode = generateTestBarcode({ sequence: 42 });
      
      expect(barcode).toMatch(/00042$/);
    });

    test('should throw error for invalid panel type', () => {
      expect(() => generateTestBarcode({ panelType: '99' })).toThrow(BarcodeError);
    });
  });

  describe('getBarcodeFormatInfo', () => {
    test('should return complete format information', () => {
      const info = getBarcodeFormatInfo();
      
      expect(info.format).toBe('CRSYYFBPP#####');
      expect(info.description).toBeDefined();
      expect(info.components).toBeDefined();
      expect(info.totalLength).toBe(BARCODE_CONFIG.TOTAL_LENGTH);
      expect(info.validPanelTypes).toEqual(BARCODE_CONFIG.VALID_PANEL_TYPES);
      expect(info.lineAssignments).toEqual(BARCODE_CONFIG.LINE_ASSIGNMENTS);
      expect(info.examples).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    test('BarcodeError should contain proper metadata', () => {
      const error = new BarcodeError('Test message', 'TEST_CODE', 'testComponent');
      
      expect(error.name).toBe('BarcodeError');
      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.component).toBe('testComponent');
      expect(error.timestamp).toBeDefined();
    });
  });

  describe('Real-world Manufacturing Scenarios', () => {
    test('should handle rapid consecutive barcode processing', () => {
      const barcodes = [
        'CRS24WT3600001',
        'CRS24WT4000002', 
        'CRS24WT6000003',
        'CRS24WT7200004',
        'CRS24WT14400005'
      ];

      const results = barcodes.map(barcode => processBarcodeComplete(barcode));
      
      // All should be valid
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Check line assignments
      expect(results[0].lineAssignment.lineNumber).toBe(1); // 36
      expect(results[1].lineAssignment.lineNumber).toBe(1); // 40
      expect(results[2].lineAssignment.lineNumber).toBe(1); // 60
      expect(results[3].lineAssignment.lineNumber).toBe(1); // 72
      expect(results[4].lineAssignment.lineNumber).toBe(2); // 144
    });

    test('should handle mixed valid and invalid barcodes', () => {
      const barcodes = [
        'CRS24WT3600001', // Valid
        'INVALID123',     // Invalid length
        'CRS24XT3600002', // Invalid factory
        'CRS24WT14400003' // Valid
      ];

      const results = barcodes.map(barcode => processBarcodeComplete(barcode));
      
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(false);
      expect(results[3].success).toBe(true);
    });

    test('should provide manufacturing metadata for workflow integration', () => {
      const barcode = 'CRS24WT3600001';
      const result = processBarcodeComplete(barcode);
      
      // Verify manufacturing metadata is suitable for database integration
      expect(result.manufacturing.panelTypeEnum).toBe('TYPE_36');
      expect(result.manufacturing.lineType).toBe('LINE_1');
      expect(result.manufacturing.initialStation).toBe(1);
      
      // Should match database enum values
      expect(result.manufacturing.panelTypeEnum).toMatch(/^TYPE_(36|40|60|72|144)$/);
      expect(result.manufacturing.lineType).toMatch(/^LINE_[12]$/);
    });
  });
});

// Integration test helper for API testing
export const TEST_BARCODES = {
  VALID_LINE_1: [
    'CRS24WT3600001',
    'CRS24WT4000002', 
    'CRS24WT6000003',
    'CRS24WT7200004'
  ],
  VALID_LINE_2: [
    'CRS24WT14400001'
  ],
  INVALID: [
    'INVALID123',      // Wrong length
    'ABC24WT3600001',  // Wrong prefix
    'CRS15WT3600001',  // Invalid year
    'CRS24XT3600001',  // Invalid factory
    'CRS24WX3600001',  // Invalid batch
    'CRS24WT9900001',  // Invalid panel type
    'CRS24WT360001'    // Invalid sequence
  ]
};
