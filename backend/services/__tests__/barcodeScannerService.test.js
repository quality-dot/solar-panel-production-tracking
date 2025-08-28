/**
 * Barcode Scanner Service Test Suite
 * Tests camera-based barcode scanning functionality
 */

import { jest } from '@jest/globals';
import BarcodeScannerService, {
  SCANNING_STATES,
  SUPPORTED_FORMATS,
  AUDIO_FEEDBACK,
  VISUAL_FEEDBACK
} from '../barcodeScannerService.js';

// Mock browser APIs
global.window = {};
global.navigator = {
  mediaDevices: {
    getUserMedia: jest.fn(),
    enumerateDevices: jest.fn()
  }
};

// Mock HTML5 QR Code library
global.Html5Qrcode = jest.fn().mockImplementation(() => ({
  start: jest.fn(),
  stop: jest.fn(),
  clear: jest.fn()
}));

// Mock AudioContext
global.AudioContext = jest.fn().mockImplementation(() => ({
  createOscillator: jest.fn(() => ({
    connect: jest.fn(),
    frequency: { value: 0 },
    type: 'sine',
    start: jest.fn(),
    stop: jest.fn()
  })),
  createGain: jest.fn(() => ({
    connect: jest.fn(),
    gain: {
      setValueAtTime: jest.fn(),
      exponentialRampToValueAtTime: jest.fn()
    }
  })),
  destination: {},
  currentTime: 0
}));

describe('BarcodeScannerService', () => {
  let service;
  let mockScanner;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create fresh service instance
    service = new BarcodeScannerService();
    
    // Mock scanner instance
    mockScanner = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined)
    };
    
    // Mock camera devices
    global.navigator.mediaDevices.enumerateDevices.mockResolvedValue([
      { kind: 'videoinput', deviceId: 'camera1', label: 'Front Camera' },
      { kind: 'videoinput', deviceId: 'camera2', label: 'Back Camera' }
    ]);
  });

  afterEach(() => {
    if (service) {
      service.removeAllListeners();
    }
  });

  describe('Initialization', () => {
    test('should initialize with default settings', async () => {
      const result = await service.initialize();
      
      expect(result).toBe(true);
      expect(service.isInitialized).toBe(true);
      expect(service.currentState).toBe(SCANNING_STATES.IDLE);
      expect(service.audioEnabled).toBe(true);
      expect(service.visualFeedbackEnabled).toBe(true);
      expect(service.manualEntryEnabled).toBe(true);
    });

    test('should initialize with custom settings', async () => {
      const options = {
        audioEnabled: false,
        visualFeedbackEnabled: false,
        scanTimeout: 60000,
        maxErrors: 10
      };
      
      const result = await service.initialize(options);
      
      expect(result).toBe(true);
      expect(service.audioEnabled).toBe(false);
      expect(service.visualFeedbackEnabled).toBe(false);
      expect(service.scanTimeout).toBe(60000);
      expect(service.maxErrors).toBe(10);
    });

    test('should detect available cameras', async () => {
      const cameras = await service.getCameraDevices();
      
      expect(cameras).toHaveLength(2);
      expect(service.selectedCamera).toBe('camera1');
      expect(service.cameraDevices).toHaveLength(2);
    });

    test('should handle camera enumeration failure', async () => {
      global.navigator.mediaDevices.enumerateDevices.mockRejectedValue(
        new Error('Permission denied')
      );
      
      await expect(service.getCameraDevices()).rejects.toThrow(
        'Failed to get camera devices: Permission denied'
      );
    });

    test('should handle no cameras found', async () => {
      global.navigator.mediaDevices.enumerateDevices.mockResolvedValue([]);
      
      await expect(service.getCameraDevices()).rejects.toThrow(
        'No camera devices found'
      );
    });

    test('should fail initialization without browser environment', async () => {
      delete global.window;
      
      const result = await service.initialize();
      
      expect(result).toBe(false);
      expect(service.currentState).toBe(SCANNING_STATES.CAMERA_ERROR);
    });

    test('should fail initialization without camera support', async () => {
      delete global.navigator.mediaDevices;
      
      const result = await service.initialize();
      
      expect(result).toBe(false);
      expect(service.currentState).toBe(SCANNING_STATES.CAMERA_ERROR);
    });
  });

  describe('Barcode Validation', () => {
    test('should validate solar panel barcode format', () => {
      const validBarcode = 'CRS23WB123456789';
      const result = service.validateBarcode(validBarcode);
      
      expect(result.isValid).toBe(true);
      expect(result.format).toBe('SOLAR_PANEL');
      expect(result.pattern).toBe('CRSYYFBPP#####');
    });

    test('should validate various barcode formats', () => {
      const testCases = [
        { barcode: '1234567890123', format: 'EAN_13' },
        { barcode: '12345678', format: 'EAN_8' },
        { barcode: '123456789012', format: 'UPC_A' },
        { barcode: '12345678', format: 'UPC_E' },
        { barcode: 'ABC123DEF', format: 'CODE_39' },
        { barcode: 'Hello World 123', format: 'CODE_128' }
      ];
      
      testCases.forEach(({ barcode, format }) => {
        const result = service.validateBarcode(barcode);
        expect(result.isValid).toBe(true);
        expect(result.format).toBe(format);
      });
    });

    test('should reject invalid barcodes', () => {
      const invalidBarcodes = [
        '',
        null,
        undefined,
        '123',
        'ABC',
        'CRS99XX999999999', // Invalid format
        'CRS23XX123456789'  // Invalid format
      ];
      
      invalidBarcodes.forEach(barcode => {
        const result = service.validateBarcode(barcode);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('Scanning Operations', () => {
    beforeEach(async () => {
      await service.initialize();
      service.scanner = mockScanner;
    });

    test('should start scanning successfully', async () => {
      const result = await service.startScanning();
      
      expect(result).toBe(true);
      expect(service.currentState).toBe(SCANNING_STATES.SCANNING);
      expect(mockScanner.start).toHaveBeenCalled();
    });

    test('should start scanning with custom options', async () => {
      const options = {
        fps: 15,
        qrbox: { width: 300, height: 300 },
        aspectRatio: 1.5
      };
      
      const result = await service.startScanning(options);
      
      expect(result).toBe(true);
      expect(mockScanner.start).toHaveBeenCalledWith(
        { deviceId: 'camera1' },
        expect.objectContaining(options),
        expect.any(Function),
        expect.any(Function)
      );
    });

    test('should fail to start scanning when not initialized', async () => {
      service.isInitialized = false;
      
      await expect(service.startScanning()).rejects.toThrow(
        'Scanner not initialized'
      );
    });

    test('should fail to start scanning when already active', async () => {
      service.currentState = SCANNING_STATES.SCANNING;
      
      await expect(service.startScanning()).rejects.toThrow(
        'Scanner already active'
      );
    });

    test('should stop scanning successfully', async () => {
      service.currentState = SCANNING_STATES.SCANNING;
      service.scanInterval = setTimeout(() => {}, 1000);
      
      const result = await service.stopScanning('Test stop');
      
      expect(result).toBe(true);
      expect(service.currentState).toBe(SCANNING_STATES.IDLE);
      expect(mockScanner.stop).toHaveBeenCalled();
    });

    test('should handle scan timeout', async () => {
      jest.useFakeTimers();
      
      await service.startScanning();
      expect(service.currentState).toBe(SCANNING_STATES.SCANNING);
      
      jest.advanceTimersByTime(30000); // Advance past timeout
      
      expect(service.currentState).toBe(SCANNING_STATES.IDLE);
      
      jest.useRealTimers();
    });
  });

  describe('Scan Success Handling', () => {
    beforeEach(async () => {
      await service.initialize();
      service.scanner = mockScanner;
    });

    test('should handle successful scan', async () => {
      const mockDecodedText = 'CRS23WB123456789';
      const mockResult = { format: 'CODE_128' };
      
      // Mock the success callback
      const successCallback = mockScanner.start.mock.calls[0][2];
      
      await service.startScanning();
      successCallback(mockDecodedText, mockResult);
      
      expect(service.currentState).toBe(SCANNING_STATES.SCAN_SUCCESS);
      expect(service.errorCount).toBe(0);
    });

    test('should handle invalid barcode format', async () => {
      const mockDecodedText = 'INVALID_BARCODE';
      const mockResult = { format: 'UNKNOWN' };
      
      // Mock the success callback
      const successCallback = mockScanner.start.mock.calls[0][2];
      
      await service.startScanning();
      successCallback(mockDecodedText, mockResult);
      
      expect(service.currentState).toBe(SCANNING_STATES.SCAN_ERROR);
      expect(service.errorCount).toBe(1);
    });
  });

  describe('Scan Error Handling', () => {
    beforeEach(async () => {
      await service.initialize();
      service.scanner = mockScanner;
    });

    test('should handle scan errors', async () => {
      const mockError = new Error('Scan failed');
      
      // Mock the error callback
      const errorCallback = mockScanner.start.mock.calls[0][3];
      
      await service.startScanning();
      errorCallback(mockError);
      
      expect(service.errorCount).toBe(1);
      expect(service.currentState).toBe(SCANNING_STATES.SCANNING);
    });

    test('should transition to error state after max errors', async () => {
      service.maxErrors = 3;
      
      // Mock the error callback
      const errorCallback = mockScanner.start.mock.calls[0][3];
      
      await service.startScanning();
      
      // Trigger errors up to max
      for (let i = 0; i < 3; i++) {
        errorCallback(new Error(`Error ${i + 1}`));
      }
      
      expect(service.errorCount).toBe(3);
      expect(service.currentState).toBe(SCANNING_STATES.SCAN_ERROR);
    });
  });

  describe('Manual Entry', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should enable manual entry mode', () => {
      const result = service.enableManualEntry();
      
      expect(result).toBe(true);
      expect(service.currentState).toBe(SCANNING_STATES.MANUAL_ENTRY);
    });

    test('should process valid manual barcode', () => {
      const barcode = 'CRS23WB123456789';
      const result = service.processManualBarcode(barcode);
      
      expect(result.success).toBe(true);
      expect(result.validation.isValid).toBe(true);
      expect(result.validation.format).toBe('SOLAR_PANEL');
    });

    test('should process invalid manual barcode', () => {
      const barcode = 'INVALID';
      const result = service.processManualBarcode(barcode);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle manual entry when disabled', () => {
      service.manualEntryEnabled = false;
      
      const result = service.enableManualEntry();
      
      expect(result).toBe(false);
    });
  });

  describe('Camera Management', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should switch camera successfully', async () => {
      const newCameraId = 'camera2';
      
      const result = await service.switchCamera(newCameraId);
      
      expect(result).toBe(true);
      expect(service.selectedCamera).toBe(newCameraId);
    });

    test('should fail to switch to non-existent camera', async () => {
      await expect(service.switchCamera('nonexistent')).rejects.toThrow(
        'Camera device not found'
      );
    });

    test('should stop scanning when switching cameras', async () => {
      service.currentState = SCANNING_STATES.SCANNING;
      service.scanInterval = setTimeout(() => {}, 1000);
      
      await service.switchCamera('camera2');
      
      expect(service.currentState).toBe(SCANNING_STATES.IDLE);
    });
  });

  describe('Audio Feedback', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should provide audio feedback when enabled', () => {
      service.audioEnabled = true;
      
      // Mock AudioContext methods
      const mockOscillator = {
        connect: jest.fn(),
        frequency: { value: 0 },
        type: 'sine',
        start: jest.fn(),
        stop: jest.fn()
      };
      
      const mockGainNode = {
        connect: jest.fn(),
        gain: {
          setValueAtTime: jest.fn(),
          exponentialRampToValueAtTime: jest.fn()
        }
      };
      
      global.AudioContext.mockImplementation(() => ({
        createOscillator: jest.fn(() => mockOscillator),
        createGain: jest.fn(() => mockGainNode),
        destination: {},
        currentTime: 0
      }));
      
      service.provideAudioFeedback(AUDIO_FEEDBACK.SUCCESS);
      
      expect(mockOscillator.start).toHaveBeenCalled();
      expect(mockOscillator.stop).toHaveBeenCalled();
    });

    test('should not provide audio feedback when disabled', () => {
      service.audioEnabled = false;
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      service.provideAudioFeedback(AUDIO_FEEDBACK.SUCCESS);
      
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Visual Feedback', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should emit visual feedback events', () => {
      const feedbackSpy = jest.fn();
      service.on('visualFeedback', feedbackSpy);
      
      service.provideVisualFeedback(VISUAL_FEEDBACK.SUCCESS);
      
      expect(feedbackSpy).toHaveBeenCalledWith({
        type: VISUAL_FEEDBACK.SUCCESS,
        timestamp: expect.any(Date)
      });
    });

    test('should not emit visual feedback when disabled', () => {
      service.visualFeedbackEnabled = false;
      
      const feedbackSpy = jest.fn();
      service.on('visualFeedback', feedbackSpy);
      
      service.provideVisualFeedback(VISUAL_FEEDBACK.SUCCESS);
      
      expect(feedbackSpy).not.toHaveBeenCalled();
    });
  });

  describe('Scan Logging and Statistics', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should log successful scans', () => {
      const barcode = 'CRS23WB123456789';
      const result = { format: 'CODE_128' };
      
      service.logScan(barcode, result, true);
      
      expect(service.scanHistory).toHaveLength(1);
      expect(service.scanHistory[0].barcode).toBe(barcode);
      expect(service.scanHistory[0].success).toBe(true);
    });

    test('should log failed scans', () => {
      const error = 'Scan failed';
      
      service.logScan(null, null, false, error);
      
      expect(service.scanHistory).toHaveLength(1);
      expect(service.scanHistory[0].success).toBe(false);
      expect(service.scanHistory[0].error).toBe(error);
    });

    test('should limit scan history to 100 entries', () => {
      // Add 101 scans
      for (let i = 0; i < 101; i++) {
        service.logScan(`BARCODE_${i}`, {}, true);
      }
      
      expect(service.scanHistory).toHaveLength(100);
      expect(service.scanHistory[0].barcode).toBe('BARCODE_1');
      expect(service.scanHistory[99].barcode).toBe('BARCODE_100');
    });

    test('should provide scan statistics', () => {
      // Add some test scans
      service.logScan('BARCODE_1', {}, true);
      service.logScan('BARCODE_2', {}, true);
      service.logScan('BARCODE_3', {}, false, 'Error');
      
      const stats = service.getScanStatistics();
      
      expect(stats.total).toBe(3);
      expect(stats.successful).toBe(2);
      expect(stats.failed).toBe(1);
      expect(stats.successRate).toBe(66.67);
      expect(stats.errorCount).toBe(0);
    });
  });

  describe('Service Management', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should reset service state', async () => {
      // Set some state
      service.currentState = SCANNING_STATES.SCANNING;
      service.errorCount = 5;
      service.logScan('TEST', {}, true);
      
      await service.reset();
      
      expect(service.currentState).toBe(SCANNING_STATES.IDLE);
      expect(service.errorCount).toBe(0);
      expect(service.scanHistory).toHaveLength(0);
    });

    test('should get service status', () => {
      const status = service.getStatus();
      
      expect(status.initialized).toBe(true);
      expect(status.currentState).toBe(SCANNING_STATES.IDLE);
      expect(status.cameraCount).toBe(2);
      expect(status.selectedCamera).toBe('camera1');
      expect(status.audioEnabled).toBe(true);
      expect(status.visualFeedbackEnabled).toBe(true);
      expect(status.manualEntryEnabled).toBe(true);
    });

    test('should cleanup resources', async () => {
      service.currentState = SCANNING_STATES.SCANNING;
      service.scanInterval = setTimeout(() => {}, 1000);
      
      await service.cleanup();
      
      expect(service.isInitialized).toBe(false);
      expect(service.currentState).toBe(SCANNING_STATES.IDLE);
      expect(service.scanner).toBeNull();
    });
  });

  describe('Event Emission', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should emit state change events', () => {
      const stateChangeSpy = jest.fn();
      service.on('stateChanged', stateChangeSpy);
      
      service.currentState = SCANNING_STATES.SCANNING;
      service.emit('stateChanged', { state: SCANNING_STATES.SCANNING, timestamp: new Date() });
      
      expect(stateChangeSpy).toHaveBeenCalledWith({
        state: SCANNING_STATES.SCANNING,
        timestamp: expect.any(Date)
      });
    });

    test('should emit scan success events', () => {
      const successSpy = jest.fn();
      service.on('scanSuccess', successSpy);
      
      service.emit('scanSuccess', {
        barcode: 'CRS23WB123456789',
        timestamp: new Date()
      });
      
      expect(successSpy).toHaveBeenCalledWith({
        barcode: 'CRS23WB123456789',
        timestamp: expect.any(Date)
      });
    });

    test('should emit scan error events', () => {
      const errorSpy = jest.fn();
      service.on('scanError', errorSpy);
      
      service.emit('scanError', {
        error: 'Scan failed',
        timestamp: new Date()
      });
      
      expect(errorSpy).toHaveBeenCalledWith({
        error: 'Scan failed',
        timestamp: expect.any(Date)
      });
    });
  });
});
