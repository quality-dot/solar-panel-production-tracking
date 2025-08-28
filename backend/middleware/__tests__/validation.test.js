/**
 * Comprehensive test suite for Input Validation Middleware
 * Tests all validation patterns, middleware functions, and edge cases
 */

import request from 'supertest';
import express from 'express';
import {
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
} from '../validation.js';

// Create test Express app
const app = express();
app.use(express.json());

// Test routes for each validation middleware
app.post('/test/barcode', validateBarcode, (req, res) => {
  res.json({ success: true, barcode: req.body.barcode });
});

app.post('/test/station', validateStation, (req, res) => {
  res.json({ success: true, station: req.body.stationId });
});

app.post('/test/manufacturing-order', validateManufacturingOrder, (req, res) => {
  res.json({ success: true, order: req.body.orderId });
});

app.post('/test/inspection', validateInspection, (req, res) => {
  res.json({ success: true, inspection: req.body });
});

app.post('/test/pallet', validatePallet, (req, res) => {
  res.json({ success: true, pallet: req.body.palletId });
});

app.get('/test/pagination', validatePagination, (req, res) => {
  res.json({ success: true, pagination: req.query });
});

app.get('/test/date-range', validateDateRange, (req, res) => {
  res.json({ success: true, dates: req.query });
});

app.get('/test/search', validateSearch, (req, res) => {
  res.json({ success: true, search: req.query.search });
});

app.post('/test/user', validateUser, (req, res) => {
  res.json({ success: true, user: req.body });
});

app.post('/test/panel-type', validatePanelType, (req, res) => {
  res.json({ success: true, panelType: req.body.panelType });
});

app.post('/test/quality-criteria', validateQualityCriteria, (req, res) => {
  res.json({ success: true, criteria: req.body.criteria });
});

app.post('/test/workflow', validateWorkflow, (req, res) => {
  res.json({ success: true, workflow: req.body });
});

// Error handling middleware
app.use((error, req, res, next) => {
  res.status(400).json({
    success: false,
    error: error.message,
    details: error.details
  });
});

describe('Input Validation Middleware', () => {
  describe('Barcode Validation', () => {
    test('should accept valid CRSYYFBPP##### format barcode', async () => {
      const validBarcode = 'CRS24FT3660001';
      const response = await request(app)
        .post('/test/barcode')
        .send({ barcode: validBarcode });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.barcode).toBe(validBarcode);
    });

    test('should reject invalid barcode format', async () => {
      const invalidBarcodes = [
        'CRS24FT366000', // Too short
        'CRS24FT36600012', // Too long
        'CRS24FT3660000', // Invalid sequence (00000)
        'CRS24FT3660001', // Invalid panel size
        'CRS24FT3660001', // Invalid year
        'CRS24FT3660001', // Invalid framed indicator
        'CRS24FT3660001'  // Invalid backsheet type
      ];

      for (const barcode of invalidBarcodes) {
        const response = await request(app)
          .post('/test/barcode')
          .send({ barcode });
        
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });

    test('should validate barcode components correctly', async () => {
      const barcode = 'CRS24FT3660001';
      const components = validationHelpers.parseBarcodeComponents(barcode);
      
      expect(components.company).toBe('CR');
      expect(components.type).toBe('S');
      expect(components.year).toBe('24');
      expect(components.framed).toBe('F');
      expect(components.backsheet).toBe('T');
      expect(components.panelSize).toBe('36');
      expect(components.sequence).toBe('00001');
      expect(components.lineNumber).toBe(1);
    });

    test('should assign correct line numbers based on panel size', async () => {
      const line1Barcode = 'CRS24FT3660001'; // 36 -> Line 1
      const line2Barcode = 'CRS24FTB1440001'; // 144 -> Line 2
      
      const line1Components = validationHelpers.parseBarcodeComponents(line1Barcode);
      const line2Components = validationHelpers.parseBarcodeComponents(line2Barcode);
      
      expect(line1Components.lineNumber).toBe(1);
      expect(line2Components.lineNumber).toBe(2);
    });
  });

  describe('Station Validation', () => {
    test('should accept valid station IDs', async () => {
      const validStations = [1, 2, 3, 4, 5, 6, 7, 8];
      
      for (const stationId of validStations) {
        const response = await request(app)
          .post('/test/station')
          .send({ stationId });
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      }
    });

    test('should reject invalid station IDs', async () => {
      const invalidStations = [0, 9, -1, 'invalid', null];
      
      for (const stationId of invalidStations) {
        const response = await request(app)
          .post('/test/station')
          .send({ stationId });
        
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });

    test('should validate station-line relationships', async () => {
      // Line 1 stations (1-4) should work with line 1
      const response1 = await request(app)
        .post('/test/station')
        .send({ stationId: 1, lineNumber: 1 });
      
      expect(response1.status).toBe(200);
      
      // Line 2 stations (5-8) should work with line 2
      const response2 = await request(app)
        .post('/test/station')
        .send({ stationId: 5, lineNumber: 2 });
      
      expect(response2.status).toBe(200);
      
      // Line 1 station with line 2 should fail
      const response3 = await request(app)
        .post('/test/station')
        .send({ stationId: 1, lineNumber: 2 });
      
      expect(response3.status).toBe(400);
    });
  });

  describe('Panel Type Validation', () => {
    test('should accept valid panel types', async () => {
      const validPanelTypes = ['36', '40', '60', '72', '144'];
      
      for (const panelType of validPanelTypes) {
        const response = await request(app)
          .post('/test/panel-type')
          .send({ panelType });
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      }
    });

    test('should validate panel type against line number', async () => {
      // Line 1 should accept 36, 40, 60, 72
      const line1Types = ['36', '40', '60', '72'];
      for (const panelType of line1Types) {
        const response = await request(app)
          .post('/test/panel-type')
          .send({ panelType, lineNumber: 1 });
        
        expect(response.status).toBe(200);
      }
      
      // Line 2 should only accept 144
      const response = await request(app)
        .post('/test/panel-type')
        .send({ panelType: '144', lineNumber: 2 });
      
      expect(response.status).toBe(200);
      
      // Line 1 should reject 144
      const response2 = await request(app)
        .post('/test/panel-type')
        .send({ panelType: '144', lineNumber: 1 });
      
      expect(response2.status).toBe(400);
    });
  });

  describe('Quality Criteria Validation', () => {
    test('should accept valid quality criteria', async () => {
      const validCriteria = [
        {
          name: 'Efficiency',
          required: true,
          threshold: 20.5,
          unit: '%'
        },
        {
          name: 'Power Output',
          required: true,
          threshold: 400,
          unit: 'W'
        }
      ];
      
      const response = await request(app)
        .post('/test/quality-criteria')
        .send({ criteria: validCriteria });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject invalid quality criteria', async () => {
      const invalidCriteria = [
        { name: 'Efficiency' }, // Missing required field
        { name: 'Power', required: 'yes' }, // Invalid required type
        { name: 'Voltage', required: true, threshold: 'invalid' }, // Invalid threshold
        { name: 'Current', required: true, unit: 123 } // Invalid unit type
      ];
      
      for (const criteria of invalidCriteria) {
        const response = await request(app)
          .post('/test/quality-criteria')
          .send({ criteria: [criteria] });
        
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('Workflow Validation', () => {
    test('should accept valid workflow steps', async () => {
      const validSteps = ['ASSEMBLY_EL', 'FRAMING', 'JUNCTION_BOX', 'PERFORMANCE_FINAL'];
      
      for (const step of validSteps) {
        const response = await request(app)
          .post('/test/workflow')
          .send({ workflowStep: step });
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      }
    });

    test('should validate workflow progression', async () => {
      // Valid progression
      const response1 = await request(app)
        .post('/test/workflow')
        .send({
          workflowStep: 'FRAMING',
          previousStep: 'ASSEMBLY_EL'
        });
      
      expect(response1.status).toBe(200);
      
      // Invalid progression (going backwards)
      const response2 = await request(app)
        .post('/test/workflow')
        .send({
          workflowStep: 'ASSEMBLY_EL',
          previousStep: 'FRAMING'
        });
      
      expect(response2.status).toBe(400);
    });
  });

  describe('Manufacturing Order Validation', () => {
    test('should accept valid manufacturing order data', async () => {
      const validOrder = {
        orderId: 'MO-2024-0001',
        quantity: 100,
        priority: 'high',
        dueDate: '2024-12-31T23:59:59.000Z'
      };
      
      const response = await request(app)
        .post('/test/manufacturing-order')
        .send(validOrder);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject invalid manufacturing order data', async () => {
      const invalidOrders = [
        { orderId: 'INVALID-2024-0001' }, // Invalid format
        { orderId: 'MO-2024-0001', quantity: 0 }, // Invalid quantity
        { orderId: 'MO-2024-0001', quantity: 100, priority: 'invalid' }, // Invalid priority
        { orderId: 'MO-2024-0001', quantity: 100, dueDate: '2020-01-01' } // Past date
      ];
      
      for (const order of invalidOrders) {
        const response = await request(app)
          .post('/test/manufacturing-order')
          .send(order);
        
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('Inspection Validation', () => {
    test('should accept valid inspection data', async () => {
      const validInspection = {
        panelBarcode: 'CRS24FT3660001',
        stationId: 1,
        inspectionResult: 'pass',
        criteria: [
          { name: 'Efficiency', result: 'pass' },
          { name: 'Power Output', result: 'pass' }
        ],
        notes: 'All criteria passed'
      };
      
      const response = await request(app)
        .post('/test/inspection')
        .send(validInspection);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject invalid inspection data', async () => {
      const invalidInspections = [
        { panelBarcode: 'INVALID' }, // Invalid barcode
        { panelBarcode: 'CRS24FT3660001', stationId: 0 }, // Invalid station
        { panelBarcode: 'CRS24FT3660001', stationId: 1, inspectionResult: 'maybe' }, // Invalid result
        { panelBarcode: 'CRS24FT3660001', stationId: 1, inspectionResult: 'pass', criteria: 'invalid' } // Invalid criteria
      ];
      
      for (const inspection of invalidInspections) {
        const response = await request(app)
          .post('/test/inspection')
          .send(inspection);
        
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('Pagination Validation', () => {
    test('should accept valid pagination parameters', async () => {
      const validParams = {
        page: 1,
        limit: 50,
        sortBy: 'created_at',
        sortOrder: 'desc'
      };
      
      const response = await request(app)
        .get('/test/pagination')
        .query(validParams);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject invalid pagination parameters', async () => {
      const invalidParams = [
        { page: 0 }, // Invalid page
        { limit: 101 }, // Invalid limit
        { sortOrder: 'invalid' } // Invalid sort order
      ];
      
      for (const params of invalidParams) {
        const response = await request(app)
          .get('/test/pagination')
          .query(params);
        
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('Date Range Validation', () => {
    test('should accept valid date ranges', async () => {
      const validDates = {
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-12-31T23:59:59.000Z'
      };
      
      const response = await request(app)
        .get('/test/date-range')
        .query(validDates);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject invalid date ranges', async () => {
      const invalidDates = [
        { startDate: '2024-12-31', endDate: '2024-01-01' }, // End before start
        { startDate: '2024-01-01', endDate: '2026-01-01' } // More than 1 year
      ];
      
      for (const dates of invalidDates) {
        const response = await request(app)
          .get('/test/date-range')
          .query(dates);
        
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('Search Validation', () => {
    test('should accept valid search terms', async () => {
      const validSearches = [
        'solar panel',
        'CRS24FT3660001',
        'efficiency-test'
      ];
      
      for (const search of validSearches) {
        const response = await request(app)
          .get('/test/search')
          .query({ search });
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      }
    });

    test('should reject invalid search terms', async () => {
      const invalidSearches = [
        'a', // Too short
        'x'.repeat(101), // Too long
        'invalid@#$%' // Invalid characters
      ];
      
      for (const search of invalidSearches) {
        const response = await request(app)
          .get('/test/search')
          .query({ search });
        
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('User Validation', () => {
    test('should accept valid user data', async () => {
      const validUser = {
        username: 'testuser',
        email: 'test@example.com',
        role: 'STATION_INSPECTOR',
        stationAssignments: [1, 2]
      };
      
      const response = await request(app)
        .post('/test/user')
        .send(validUser);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject invalid user data', async () => {
      const invalidUsers = [
        { username: 'ab' }, // Too short
        { username: 'test@user' }, // Invalid characters
        { email: 'invalid-email' }, // Invalid email
        { role: 'INVALID_ROLE' }, // Invalid role
        { stationAssignments: [0, 9] } // Invalid stations
      ];
      
      for (const user of invalidUsers) {
        const response = await request(app)
          .post('/test/user')
          .send(user);
        
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('Validation Patterns', () => {
    test('should have correct barcode patterns', () => {
      expect(BARCODE_PATTERNS.FULL.test('CRS24FT3660001')).toBe(true);
      expect(BARCODE_PATTERNS.FULL.test('CRS24FB1440001')).toBe(true);
      expect(BARCODE_PATTERNS.FULL.test('INVALID')).toBe(false);
    });

    test('should have correct station patterns', () => {
      expect(STATION_PATTERNS.STATION_ID.test('1')).toBe(true);
      expect(STATION_PATTERNS.STATION_ID.test('8')).toBe(true);
      expect(STATION_PATTERNS.STATION_ID.test('0')).toBe(false);
      expect(STATION_PATTERNS.STATION_ID.test('9')).toBe(false);
    });

    test('should have correct MO patterns', () => {
      expect(MO_PATTERNS.MO_ID.test('MO-2024-0001')).toBe(true);
      expect(MO_PATTERNS.MO_ID.test('INVALID')).toBe(false);
      expect(MO_PATTERNS.PRIORITY.test('high')).toBe(true);
      expect(MO_PATTERNS.PRIORITY.test('invalid')).toBe(false);
    });
  });

  describe('Validation Helpers', () => {
    test('should validate station-line relationships correctly', () => {
      expect(() => validationHelpers.validateStationLine(1, 1)).not.toThrow();
      expect(() => validationHelpers.validateStationLine(5, 2)).not.toThrow();
      expect(() => validationHelpers.validateStationLine(1, 2)).toThrow();
      expect(() => validationHelpers.validateStationLine(5, 1)).toThrow();
    });

    test('should parse barcode components correctly', () => {
      const barcode = 'CRS24FT3660001';
      const components = validationHelpers.parseBarcodeComponents(barcode);
      
      expect(components).toEqual({
        company: 'CR',
        type: 'S',
        year: '24',
        framed: 'F',
        backsheet: 'T',
        panelSize: '36',
        sequence: '00001',
        lineNumber: 1
      });
    });
  });
});
