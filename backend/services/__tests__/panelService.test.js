// Panel Service Tests
// Test database integration with barcode processing

import { jest } from '@jest/globals';
import { PanelService, PanelServiceError } from '../panelService.js';
import { BarcodeError } from '../../utils/barcodeProcessor.js';

// Mock database manager
const mockDatabaseManager = {
  getClient: jest.fn(),
  query: jest.fn()
};

// Mock client for transactions
const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};

describe('PanelService', () => {
  let panelService;

  beforeEach(() => {
    jest.clearAllMocks();
    panelService = new PanelService();
    panelService.db = mockDatabaseManager;
  });

  describe('createPanelFromBarcode', () => {
    const validBarcode = 'CRS24WT3600001';
    const mockPanelResult = {
      rows: [{
        id: 'uuid-123',
        barcode: validBarcode,
        panel_type: 'TYPE_36',
        line_assignment: 'LINE_1',
        status: 'PENDING'
      }]
    };

    beforeEach(() => {
      mockDatabaseManager.getClient.mockResolvedValue(mockClient);
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // uniqueness check
        .mockResolvedValueOnce(mockPanelResult) // insert panel
        .mockResolvedValueOnce(undefined) // audit log
        .mockResolvedValueOnce(undefined); // COMMIT
    });

    test('should create panel successfully from valid barcode', async () => {
      const result = await panelService.createPanelFromBarcode(validBarcode);

      expect(result.success).toBe(true);
      expect(result.panel.barcode).toBe(validBarcode);
      expect(result.panel.panel_type).toBe('TYPE_36');
      expect(result.panel.line_assignment).toBe('LINE_1');
      
      // Verify transaction handling
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should handle barcode uniqueness violation', async () => {
      // Mock existing barcode
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'existing-id' }] }); // uniqueness check fails

      await expect(panelService.createPanelFromBarcode(validBarcode))
        .rejects
        .toThrow(PanelServiceError);
      
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    test('should handle invalid barcode format', async () => {
      const invalidBarcode = 'INVALID123';

      await expect(panelService.createPanelFromBarcode(invalidBarcode))
        .rejects
        .toThrow(PanelServiceError);
    });

    test('should apply manual overrides correctly', async () => {
      const overrides = {
        nominalWattage: 205,
        frameColor: 'black'
      };

      const result = await panelService.createPanelFromBarcode(validBarcode, { overrides });

      expect(result.success).toBe(true);
      expect(result.specification.specification.nominalWattage).toBe(205);
      expect(result.specification.specification.frameColor).toBe('black');
    });
  });

  describe('findByBarcode', () => {
    test('should find existing panel', async () => {
      const mockResult = {
        rows: [{
          id: 'uuid-123',
          barcode: 'CRS24WT3600001',
          panel_type: 'TYPE_36',
          line_assignment: 'LINE_1',
          status: 'PENDING'
        }]
      };

      mockDatabaseManager.query.mockResolvedValue(mockResult);

      const result = await panelService.findByBarcode('CRS24WT3600001');

      expect(result).toBeDefined();
      expect(result.barcode).toBe('CRS24WT3600001');
      expect(result.lineAssignment.lineName).toBe('LINE_1');
    });

    test('should return null for non-existent panel', async () => {
      mockDatabaseManager.query.mockResolvedValue({ rows: [] });

      const result = await panelService.findByBarcode('NONEXISTENT');

      expect(result).toBeNull();
    });
  });

  describe('validateBarcodeUniqueness', () => {
    test('should pass for unique barcode', async () => {
      mockDatabaseManager.query.mockResolvedValue({ rows: [] });

      const result = await panelService.validateBarcodeUniqueness('CRS24WT3600001');

      expect(result).toBe(true);
    });

    test('should throw error for duplicate barcode', async () => {
      mockDatabaseManager.query.mockResolvedValue({
        rows: [{ id: 'existing-id', barcode: 'CRS24WT3600001' }]
      });

      await expect(panelService.validateBarcodeUniqueness('CRS24WT3600001'))
        .rejects
        .toThrow(PanelServiceError);
    });
  });

  describe('calculateTheoreticalValues', () => {
    test('should return correct values for each panel type', () => {
      expect(panelService.calculateTheoreticalValues('36')).toEqual({
        voc: 22.5,
        isc: 9.5
      });

      expect(panelService.calculateTheoreticalValues('144')).toEqual({
        voc: 49.2,
        isc: 11.8
      });
    });

    test('should return null values for invalid panel type', () => {
      expect(panelService.calculateTheoreticalValues('999')).toEqual({
        voc: null,
        isc: null
      });
    });
  });

  describe('updatePanelStatus', () => {
    test('should update panel status successfully', async () => {
      const mockCurrentPanel = {
        rows: [{
          id: 'uuid-123',
          barcode: 'CRS24WT3600001',
          status: 'PENDING'
        }]
      };

      const mockUpdatedPanel = {
        rows: [{
          id: 'uuid-123',
          barcode: 'CRS24WT3600001',
          status: 'IN_PROGRESS'
        }]
      };

      mockDatabaseManager.getClient.mockResolvedValue(mockClient);
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(mockCurrentPanel) // get current
        .mockResolvedValueOnce(mockUpdatedPanel) // update
        .mockResolvedValueOnce(undefined) // audit log
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await panelService.updatePanelStatus('uuid-123', 'IN_PROGRESS', 1);

      expect(result.status).toBe('IN_PROGRESS');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    test('should handle panel not found', async () => {
      mockDatabaseManager.getClient.mockResolvedValue(mockClient);
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // panel not found

      await expect(panelService.updatePanelStatus('nonexistent', 'IN_PROGRESS'))
        .rejects
        .toThrow(PanelServiceError);
      
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('getPanelStatistics', () => {
    test('should return panel statistics', async () => {
      const mockStats = {
        rows: [{
          total_panels: 100,
          pending: 20,
          in_progress: 30,
          passed: 45,
          failed: 5,
          line_1: 80,
          line_2: 20,
          avg_wattage: 385.5
        }]
      };

      mockDatabaseManager.query.mockResolvedValue(mockStats);

      const result = await panelService.getPanelStatistics();

      expect(result.statistics.total_panels).toBe(100);
      expect(result.statistics.avg_wattage).toBe(385.5);
      expect(result.generatedAt).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors', async () => {
      mockDatabaseManager.getClient.mockRejectedValue(new Error('Connection failed'));

      await expect(panelService.createPanelFromBarcode('CRS24WT3600001'))
        .rejects
        .toThrow(PanelServiceError);
    });

    test('should properly rollback transactions on error', async () => {
      mockDatabaseManager.getClient.mockResolvedValue(mockClient);
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('Database error')); // Subsequent query fails

      await expect(panelService.createPanelFromBarcode('CRS24WT3600001'))
        .rejects
        .toThrow();

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});

// Integration test helpers
export const PANEL_TEST_DATA = {
  validBarcodes: [
    'CRS24WT3600001',
    'CRS24WT4000002',
    'CRS24WT14400003'
  ],
  
  samplePanelSpecs: [
    {
      panelType: '36',
      nominalWattage: 200,
      constructionType: 'monofacial',
      frameColor: 'silver',
      productionYear: '2024',
      qualityGrade: 'A'
    },
    {
      panelType: '144',
      nominalWattage: 550,
      constructionType: 'bifacial',
      frameColor: 'black',
      productionYear: '2024',
      qualityGrade: 'A'
    }
  ],

  mockOverrides: {
    wattageCorrection: { nominalWattage: 205 },
    panelTypeCorrection: { panelType: '40', nominalWattage: 220 },
    specialVariant: { constructionType: 'bifacial', frameColor: 'black' }
  }
};
