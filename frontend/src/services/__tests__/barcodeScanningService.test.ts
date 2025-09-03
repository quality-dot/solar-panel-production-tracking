/**
 * Barcode Scanning Service Tests
 * Comprehensive tests for barcode scanning functionality including online/offline modes
 */

import barcodeScanningService, { BarcodeScanningError } from '../barcodeScanningService';

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

describe('BarcodeScanningService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('[]');
    navigator.onLine = true;
  });

  describe('validateBarcodeFormat', () => {
    it('should validate correct barcode format', () => {
      const validBarcodes = [
        'CRS01YF01PP12345',
        'CRS99YF99PP99999',
        'CRS25YF04PP00001',
      ];

      validBarcodes.forEach(barcode => {
        const result = barcodeScanningService.validateBarcodeFormat(barcode);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject invalid barcode formats', () => {
      const invalidBarcodes = [
        'CRS01YF01PP1234', // Too short
        'CRS01YF01PP123456', // Too long
        'CRS01YF01PP1234A', // Contains letter
        'CRS01YF01PP', // Missing sequence
        'CRS01YFPP12345', // Missing facility
        'CRS01YF01PP', // Missing sequence
        'INVALID', // Completely invalid
        '', // Empty string
      ];

      invalidBarcodes.forEach(barcode => {
        const result = barcodeScanningService.validateBarcodeFormat(barcode);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('processBarcode (online)', () => {
    beforeEach(() => {
      navigator.onLine = true;
    });

    it('should process valid barcode through backend API', async () => {
      const mockResponse = {
        success: true,
        data: {
          success: true,
          barcode: 'CRS01YF01PP12345',
          components: {
            raw: 'CRS01YF01PP12345',
            company: 'CRS',
            year: 2025,
            facility: 1,
            panelType: 'BP',
            powerRating: '550',
            sequence: 12345,
          },
          validation: {
            isValid: true,
            errors: [],
          },
          lineAssignment: {
            lineNumber: 1,
            lineName: 'LINE_1',
            panelType: 'BP',
            stationRange: [1, 2, 3, 4],
            isValid: true,
          },
          processedAt: '2025-01-27T00:00:00.000Z',
          manufacturing: {
            panelTypeEnum: 'TYPE_BP',
            lineType: 'LINE_1',
            initialStation: 1,
          },
        },
        message: 'Barcode processed successfully',
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await barcodeScanningService.processBarcode('CRS01YF01PP12345');

      expect(result).toEqual({
        barcode: 'CRS01YF01PP12345',
        panelType: 'BP',
        powerRating: '550',
        status: 'Ready for Inspection',
        manufacturingOrder: 'MO-2025-12345',
        lineNumber: 1,
        stationNumber: 1,
        lineName: 'LINE_1',
        stationRange: [1, 2, 3, 4],
      });

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/barcode/process',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ barcode: 'CRS01YF01PP12345' }),
        })
      );
    });

    it('should handle backend validation errors', async () => {
      const mockErrorResponse = {
        success: false,
        message: 'Barcode validation failed',
        code: 'BARCODE_VALIDATION_FAILED',
        details: ['Invalid panel type'],
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => mockErrorResponse,
      });

      await expect(
        barcodeScanningService.processBarcode('CRS01YF01PP12345')
      ).rejects.toThrow(BarcodeScanningError);

      await expect(
        barcodeScanningService.processBarcode('CRS01YF01PP12345')
      ).rejects.toThrow('Failed to process barcode');
    });

    it('should handle network errors and fallback to offline processing', async () => {
      navigator.onLine = false; // Simulate offline
      
      (fetch as jest.Mock).mockRejectedValueOnce(
        new TypeError('Failed to fetch')
      );

      const result = await barcodeScanningService.processBarcode('CRS01YF01PP12345');

      expect(result.status).toBe('Ready for Inspection (Offline)');
      expect(result.barcode).toBe('CRS01YF01PP12345');
    });
  });

  describe('processBarcode (offline)', () => {
    beforeEach(() => {
      navigator.onLine = false;
    });

    it('should process barcode offline with local validation', async () => {
      const result = await barcodeScanningService.processBarcode('CRS01YF01PP12345');

      expect(result).toEqual({
        barcode: 'CRS01YF01PP12345',
        panelType: 'BP',
        powerRating: '550',
        status: 'Ready for Inspection (Offline)',
        manufacturingOrder: 'MO-2025-12345',
        lineNumber: 1,
        stationNumber: 1,
        lineName: 'LINE_1',
        stationRange: [1],
      });
    });

    it('should store offline scan for later sync', async () => {
      await barcodeScanningService.processBarcode('CRS01YF01PP12345');

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'offlineScans',
        expect.stringContaining('CRS01YF01PP12345')
      );
    });

    it('should handle invalid barcode format offline', async () => {
      await expect(
        barcodeScanningService.processBarcode('INVALID')
      ).rejects.toThrow(BarcodeScanningError);

      await expect(
        barcodeScanningService.processBarcode('INVALID')
      ).rejects.toThrow('Invalid barcode format');
    });
  });

  describe('parseBarcode', () => {
    it('should parse barcode components through backend API', async () => {
      const mockResponse = {
        success: true,
        data: {
          raw: 'CRS01YF01PP12345',
          company: 'CRS',
          year: 2025,
          facility: 1,
          panelType: 'BP',
          powerRating: '550',
          sequence: 12345,
        },
        message: 'Barcode parsed successfully',
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await barcodeScanningService.parseBarcode('CRS01YF01PP12345');

      expect(result).toEqual(mockResponse.data);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/barcode/parse',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ barcode: 'CRS01YF01PP12345' }),
        })
      );
    });

    it('should handle parsing errors', async () => {
      const mockErrorResponse = {
        success: false,
        message: 'Failed to parse barcode',
        code: 'PARSING_ERROR',
        details: 'Invalid format',
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => mockErrorResponse,
      });

      await expect(
        barcodeScanningService.parseBarcode('INVALID')
      ).rejects.toThrow(BarcodeScanningError);

      await expect(
        barcodeScanningService.parseBarcode('INVALID')
      ).rejects.toThrow('Failed to parse barcode');
    });
  });

  describe('getBarcodeFormatInfo', () => {
    it('should get barcode format information from backend', async () => {
      const mockResponse = {
        success: true,
        data: {
          format: 'CRSYYFBPP#####',
          description: 'Crossroads Solar Panel Barcode Format',
          components: {
            company: 'CRS - Company identifier',
            year: 'YY - Year (2 digits)',
            facility: 'YF - Facility code (2 digits)',
            panelType: 'PP - Panel type (2 digits)',
            sequence: '##### - Sequence number (5 digits)',
          },
        },
        message: 'Format information retrieved successfully',
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await barcodeScanningService.getBarcodeFormatInfo();

      expect(result).toEqual(mockResponse.data);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/barcode/format-info'
      );
    });
  });

  describe('generateTestBarcode', () => {
    it('should generate test barcode from backend', async () => {
      const mockResponse = {
        success: true,
        data: {
          barcode: 'CRS25YF01PP12345',
        },
        message: 'Test barcode generated successfully',
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await barcodeScanningService.generateTestBarcode('BP', '550');

      expect(result).toBe('CRS25YF01PP12345');
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/barcode/generate-test',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ panelType: 'BP', powerRating: '550' }),
        })
      );
    });

    it('should use default parameters', async () => {
      const mockResponse = {
        success: true,
        data: {
          barcode: 'CRS25YF01PP12345',
        },
        message: 'Test barcode generated successfully',
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await barcodeScanningService.generateTestBarcode();

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/barcode/generate-test',
        expect.objectContaining({
          body: JSON.stringify({ panelType: 'BP', powerRating: '550' }),
        })
      );
    });
  });

  describe('getOfflineScanStatus', () => {
    it('should return offline scan status', async () => {
      const mockScans = [
        { barcode: 'CRS01YF01PP12345', synced: true },
        { barcode: 'CRS01YF01PP12346', synced: false },
        { barcode: 'CRS01YF01PP12347', synced: false },
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockScans));

      const result = await barcodeScanningService.getOfflineScanStatus();

      expect(result).toEqual({
        total: 3,
        synced: 1,
        pending: 2,
      });
    });

    it('should handle empty offline scans', async () => {
      localStorageMock.getItem.mockReturnValue('[]');

      const result = await barcodeScanningService.getOfflineScanStatus();

      expect(result).toEqual({
        total: 0,
        synced: 0,
        pending: 0,
      });
    });

    it('should handle localStorage errors gracefully', async () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      const result = await barcodeScanningService.getOfflineScanStatus();

      expect(result).toEqual({
        total: 0,
        synced: 0,
        pending: 0,
      });
    });
  });

  describe('syncOfflineScans', () => {
    beforeEach(() => {
      navigator.onLine = true;
    });

    it('should sync offline scans when online', async () => {
      const mockScans = [
        { barcode: 'CRS01YF01PP12345', synced: false },
        { barcode: 'CRS01YF01PP12346', synced: false },
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockScans));

      // Mock successful API responses
      const mockResponse = {
        success: true,
        data: {
          success: true,
          barcode: 'CRS01YF01PP12345',
          components: {
            raw: 'CRS01YF01PP12345',
            company: 'CRS',
            year: 2025,
            facility: 1,
            panelType: 'BP',
            powerRating: '550',
            sequence: 12345,
          },
          validation: { isValid: true, errors: [] },
          lineAssignment: {
            lineNumber: 1,
            lineName: 'LINE_1',
            panelType: 'BP',
            stationRange: [1, 2, 3, 4],
            isValid: true,
          },
          processedAt: '2025-01-27T00:00:00.000Z',
          manufacturing: {
            panelTypeEnum: 'TYPE_BP',
            lineType: 'LINE_1',
            initialStation: 1,
          },
        },
        message: 'Barcode processed successfully',
      };

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ...mockResponse, data: { ...mockResponse.data, barcode: 'CRS01YF01PP12346' } }),
        });

      const result = await barcodeScanningService.syncOfflineScans();

      expect(result).toEqual({
        synced: 2,
        failed: 0,
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'offlineScans',
        expect.stringContaining('"synced":true')
      );
    });

    it('should handle sync errors gracefully', async () => {
      const mockScans = [
        { barcode: 'CRS01YF01PP12345', synced: false },
        { barcode: 'INVALID', synced: false },
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockScans));

      // Mock one success and one failure
      const mockResponse = {
        success: true,
        data: {
          success: true,
          barcode: 'CRS01YF01PP12345',
          components: {
            raw: 'CRS01YF01PP12345',
            company: 'CRS',
            year: 2025,
            facility: 1,
            panelType: 'BP',
            powerRating: '550',
            sequence: 12345,
          },
          validation: { isValid: true, errors: [] },
          lineAssignment: {
            lineNumber: 1,
            lineName: 'LINE_1',
            panelType: 'BP',
            stationRange: [1, 2, 3, 4],
            isValid: true,
          },
          processedAt: '2025-01-27T00:00:00.000Z',
          manufacturing: {
            panelTypeEnum: 'TYPE_BP',
            lineType: 'LINE_1',
            initialStation: 1,
          },
        },
        message: 'Barcode processed successfully',
      };

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        })
        .mockRejectedValueOnce(new Error('Network error'));

      const result = await barcodeScanningService.syncOfflineScans();

      expect(result).toEqual({
        synced: 1,
        failed: 1,
      });
    });

    it('should throw error when offline', async () => {
      navigator.onLine = false;

      await expect(barcodeScanningService.syncOfflineScans()).rejects.toThrow(
        BarcodeScanningError
      );

      await expect(barcodeScanningService.syncOfflineScans()).rejects.toThrow(
        'Cannot sync while offline'
      );
    });
  });

  describe('isCurrentlyOnline', () => {
    it('should return true when online', () => {
      navigator.onLine = true;
      expect(barcodeScanningService.isCurrentlyOnline()).toBe(true);
    });

    it('should return false when offline', () => {
      navigator.onLine = false;
      expect(barcodeScanningService.isCurrentlyOnline()).toBe(false);
    });
  });

  describe('BarcodeScanningError', () => {
    it('should create error with message and code', () => {
      const error = new BarcodeScanningError('Test error', 'TEST_ERROR');
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.details).toBeUndefined();
    });

    it('should create error with details', () => {
      const details = { barcode: 'INVALID' };
      const error = new BarcodeScanningError('Test error', 'TEST_ERROR', details);
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.details).toEqual(details);
    });
  });
});
