/**
 * Barcode Scanning Integration Service
 * Implements camera-based barcode scanning for station tablets
 */

import { EventEmitter } from 'events';

// Barcode scanning states
export const SCANNING_STATES = {
  IDLE: 'IDLE',
  INITIALIZING: 'INITIALIZING',
  SCANNING: 'SCANNING',
  SCAN_SUCCESS: 'SCAN_SUCCESS',
  SCAN_ERROR: 'SCAN_ERROR',
  CAMERA_ERROR: 'CAMERA_ERROR',
  MANUAL_ENTRY: 'MANUAL_ENTRY'
};

// Supported barcode formats
export const SUPPORTED_FORMATS = [
  'QR_CODE',
  'CODE_128',
  'CODE_39',
  'EAN_13',
  'EAN_8',
  'UPC_A',
  'UPC_E',
  'ITF',
  'PDF_417',
  'AZTEC',
  'DATA_MATRIX'
];

// Audio feedback types
export const AUDIO_FEEDBACK = {
  SUCCESS: 'success',
  ERROR: 'error',
  SCAN: 'scan'
};

// Visual feedback types
export const VISUAL_FEEDBACK = {
  SUCCESS: 'success',
  ERROR: 'error',
  SCANNING: 'scanning',
  WARNING: 'warning'
};

/**
 * Barcode Scanner Service Class
 * Manages camera-based barcode scanning with fallback options
 */
export class BarcodeScannerService extends EventEmitter {
  constructor() {
    super();
    this.currentState = SCANNING_STATES.IDLE;
    this.scanner = null;
    this.isInitialized = false;
    this.cameraDevices = [];
    this.selectedCamera = null;
    this.scanHistory = [];
    this.errorCount = 0;
    this.maxErrors = 5;
    this.scanTimeout = 30000; // 30 seconds
    this.scanInterval = null;
    this.audioEnabled = true;
    this.visualFeedbackEnabled = true;
    this.manualEntryEnabled = true;
  }

  /**
   * Initialize the barcode scanner service
   * @param {Object} options - Configuration options
   * @returns {Promise<boolean>} Success status
   */
  async initialize(options = {}) {
    try {
      this.currentState = SCANNING_STATES.INITIALIZING;
      this.emit('stateChanged', { state: this.currentState, timestamp: new Date() });

      // Apply configuration options
      this.audioEnabled = options.audioEnabled !== undefined ? options.audioEnabled : true;
      this.visualFeedbackEnabled = options.visualFeedbackEnabled !== undefined ? options.visualFeedbackEnabled : true;
      this.manualEntryEnabled = options.manualEntryEnabled !== undefined ? options.manualEntryEnabled : true;
      this.scanTimeout = options.scanTimeout || 30000;
      this.maxErrors = options.maxErrors || 5;

      // Check if running in browser environment
      if (typeof window === 'undefined') {
        throw new Error('Barcode scanner service must run in browser environment');
      }

      // Check for required browser APIs
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported in this browser');
      }

      // Get available camera devices
      await this.getCameraDevices();

      // Initialize HTML5 QR Code scanner
      await this.initializeScanner();

      this.isInitialized = true;
      this.currentState = SCANNING_STATES.IDLE;
      
      this.emit('initialized', { 
        timestamp: new Date(),
        cameraCount: this.cameraDevices.length,
        selectedCamera: this.selectedCamera
      });
      
      this.emit('stateChanged', { state: this.currentState, timestamp: new Date() });

      return true;
    } catch (error) {
      this.currentState = SCANNING_STATES.CAMERA_ERROR;
      this.emit('error', { 
        error: error.message, 
        timestamp: new Date(),
        state: this.currentState
      });
      this.emit('stateChanged', { state: this.currentState, timestamp: new Date() });
      return false;
    }
  }

  /**
   * Get available camera devices
   * @returns {Promise<Array>} Array of camera devices
   */
  async getCameraDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.cameraDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (this.cameraDevices.length === 0) {
        throw new Error('No camera devices found');
      }

      // Select first camera by default
      this.selectedCamera = this.cameraDevices[0].deviceId;
      
      this.emit('camerasDetected', { 
        cameras: this.cameraDevices,
        selectedCamera: this.selectedCamera,
        timestamp: new Date()
      });

      return this.cameraDevices;
    } catch (error) {
      throw new Error(`Failed to get camera devices: ${error.message}`);
    }
  }

  /**
   * Initialize HTML5 QR Code scanner
   * @returns {Promise<void>}
   */
  async initializeScanner() {
    try {
      // Check if html5-qrcode is available
      if (typeof Html5Qrcode === 'undefined') {
        throw new Error('HTML5 QR Code library not loaded. Please include html5-qrcode.min.js');
      }

      // Create scanner instance
      this.scanner = new Html5Qrcode('qr-reader', {
        verbose: false,
        formatsToSupport: SUPPORTED_FORMATS
      });

      this.emit('scannerInitialized', { 
        timestamp: new Date(),
        supportedFormats: SUPPORTED_FORMATS
      });

    } catch (error) {
      throw new Error(`Failed to initialize scanner: ${error.message}`);
    }
  }

  /**
   * Start barcode scanning
   * @param {Object} options - Scanning options
   * @returns {Promise<boolean>} Success status
   */
  async startScanning(options = {}) {
    if (!this.isInitialized || !this.scanner) {
      throw new Error('Scanner not initialized');
    }

    if (this.currentState === SCANNING_STATES.SCANNING) {
      throw new Error('Scanner already active');
    }

    try {
      this.currentState = SCANNING_STATES.SCANNING;
      this.emit('stateChanged', { state: this.currentState, timestamp: new Date() });

      const config = {
        fps: options.fps || 10,
        qrbox: options.qrbox || { width: 250, height: 250 },
        aspectRatio: options.aspectRatio || 1.0,
        disableFlip: options.disableFlip || false
      };

      // Start scanning
      await this.scanner.start(
        { deviceId: this.selectedCamera },
        config,
        this.onScanSuccess.bind(this),
        this.onScanError.bind(this)
      );

      // Set scan timeout
      this.scanInterval = setTimeout(() => {
        this.stopScanning('Scan timeout reached');
      }, this.scanTimeout);

      this.emit('scanningStarted', { 
        config,
        timestamp: new Date(),
        cameraId: this.selectedCamera
      });

      // Provide visual feedback
      if (this.visualFeedbackEnabled) {
        this.provideVisualFeedback(VISUAL_FEEDBACK.SCANNING);
      }

      return true;
    } catch (error) {
      this.currentState = SCANNING_STATES.SCAN_ERROR;
      this.emit('error', { 
        error: error.message, 
        timestamp: new Date(),
        state: this.currentState
      });
      this.emit('stateChanged', { state: this.currentState, timestamp: new Date() });
      return false;
    }
  }

  /**
   * Stop barcode scanning
   * @param {string} reason - Reason for stopping
   * @returns {Promise<boolean>} Success status
   */
  async stopScanning(reason = 'User stopped') {
    if (this.currentState !== SCANNING_STATES.SCANNING) {
      return false;
    }

    try {
      if (this.scanner) {
        await this.scanner.stop();
      }

      // Clear timeout
      if (this.scanInterval) {
        clearTimeout(this.scanInterval);
        this.scanInterval = null;
      }

      this.currentState = SCANNING_STATES.IDLE;
      
      this.emit('scanningStopped', { 
        reason,
        timestamp: new Date()
      });
      
      this.emit('stateChanged', { state: this.currentState, timestamp: new Date() });

      return true;
    } catch (error) {
      this.emit('error', { 
        error: error.message, 
        timestamp: new Date()
      });
      return false;
    }
  }

  /**
   * Handle successful barcode scan
   * @param {string} decodedText - Decoded barcode text
   * @param {Object} result - Scan result object
   */
  onScanSuccess(decodedText, result) {
    try {
      // Stop scanning on success
      this.stopScanning('Scan successful');

      // Validate barcode format
      const validationResult = this.validateBarcode(decodedText);
      
      if (validationResult.isValid) {
        this.currentState = SCANNING_STATES.SCAN_SUCCESS;
        
        // Log successful scan
        this.logScan(decodedText, result, true);
        
        // Provide success feedback
        this.provideAudioFeedback(AUDIO_FEEDBACK.SUCCESS);
        this.provideVisualFeedback(VISUAL_FEEDBACK.SUCCESS);
        
        // Reset error count
        this.errorCount = 0;
        
        this.emit('scanSuccess', {
          barcode: decodedText,
          result,
          validation: validationResult,
          timestamp: new Date()
        });
        
        this.emit('stateChanged', { state: this.currentState, timestamp: new Date() });
      } else {
        // Invalid barcode format
        this.onScanError(new Error(`Invalid barcode format: ${validationResult.error}`));
      }
    } catch (error) {
      this.onScanError(error);
    }
  }

  /**
   * Handle barcode scan error
   * @param {Error} error - Scan error
   */
  onScanError(error) {
    this.errorCount++;
    
    // Log error
    this.logScan(null, null, false, error.message);
    
    // Provide error feedback
    this.provideAudioFeedback(AUDIO_FEEDBACK.ERROR);
    this.provideVisualFeedback(VISUAL_FEEDBACK.ERROR);
    
    this.emit('scanError', {
      error: error.message,
      errorCount: this.errorCount,
      timestamp: new Date()
    });
    
    // Check if max errors reached
    if (this.errorCount >= this.maxErrors) {
      this.currentState = SCANNING_STATES.SCAN_ERROR;
      this.emit('stateChanged', { state: this.currentState, timestamp: new Date() });
      this.emit('maxErrorsReached', {
        errorCount: this.errorCount,
        timestamp: new Date()
      });
    }
  }

  /**
   * Validate barcode format
   * @param {string} barcode - Barcode text to validate
   * @returns {Object} Validation result
   */
  validateBarcode(barcode) {
    if (!barcode || typeof barcode !== 'string') {
      return { isValid: false, error: 'Invalid barcode format' };
    }

    // Check for CRSYYFBPP##### format (solar panel barcode)
    const solarPanelPattern = /^CRS[0-9]{2}[WBT][WBT][0-9]{2,3}[0-9]{5}$/;
    if (solarPanelPattern.test(barcode)) {
      return { 
        isValid: true, 
        format: 'SOLAR_PANEL',
        pattern: 'CRSYYFBPP#####'
      };
    }

    // Check for other common formats
    const patterns = {
      'QR_CODE': /^[A-Za-z0-9+/=]{20,}$/,
      'CODE_128': /^[A-Za-z0-9\s]{5,}$/,
      'CODE_39': /^[A-Z0-9\-\s\.\/\+\$]{5,}$/,
      'EAN_13': /^[0-9]{13}$/,
      'EAN_8': /^[0-9]{8}$/,
      'UPC_A': /^[0-9]{12}$/,
      'UPC_E': /^[0-9]{8}$/
    };

    for (const [format, pattern] of Object.entries(patterns)) {
      if (pattern.test(barcode)) {
        return { isValid: true, format, pattern: format };
      }
    }

    return { isValid: false, error: 'Unknown barcode format' };
  }

  /**
   * Switch to manual entry mode
   * @returns {boolean} Success status
   */
  enableManualEntry() {
    if (!this.manualEntryEnabled) {
      return false;
    }

    this.currentState = SCANNING_STATES.MANUAL_ENTRY;
    
    this.emit('manualEntryEnabled', { 
      timestamp: new Date()
    });
    
    this.emit('stateChanged', { state: this.currentState, timestamp: new Date() });

    return true;
  }

  /**
   * Process manually entered barcode
   * @param {string} barcode - Manually entered barcode
   * @returns {Object} Processing result
   */
  processManualBarcode(barcode) {
    try {
      const validationResult = this.validateBarcode(barcode);
      
      if (validationResult.isValid) {
        // Log manual entry
        this.logScan(barcode, { source: 'manual' }, true);
        
        // Provide success feedback
        this.provideAudioFeedback(AUDIO_FEEDBACK.SUCCESS);
        this.provideVisualFeedback(VISUAL_FEEDBACK.SUCCESS);
        
        this.emit('manualBarcodeProcessed', {
          barcode,
          validation: validationResult,
          timestamp: new Date()
        });
        
        return { success: true, validation: validationResult };
      } else {
        // Provide error feedback
        this.provideAudioFeedback(AUDIO_FEEDBACK.ERROR);
        this.provideVisualFeedback(VISUAL_FEEDBACK.ERROR);
        
        this.emit('manualBarcodeError', {
          barcode,
          error: validationResult.error,
          timestamp: new Date()
        });
        
        return { success: false, error: validationResult.error };
      }
    } catch (error) {
      this.emit('error', { 
        error: error.message, 
        timestamp: new Date()
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Switch camera device
   * @param {string} cameraId - Camera device ID
   * @returns {Promise<boolean>} Success status
   */
  async switchCamera(cameraId) {
    if (!this.cameraDevices.find(camera => camera.deviceId === cameraId)) {
      throw new Error('Camera device not found');
    }

    // Stop current scanning if active
    if (this.currentState === SCANNING_STATES.SCANNING) {
      await this.stopScanning('Camera switch');
    }

    this.selectedCamera = cameraId;
    
    this.emit('cameraSwitched', { 
      cameraId,
      timestamp: new Date()
    });

    return true;
  }

  /**
   * Provide audio feedback
   * @param {string} type - Audio feedback type
   */
  provideAudioFeedback(type) {
    if (!this.audioEnabled) return;

    try {
      // Create audio context for feedback
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      let frequency, duration;
      
      switch (type) {
        case AUDIO_FEEDBACK.SUCCESS:
          frequency = 800; // Higher pitch for success
          duration = 0.2;
          break;
        case AUDIO_FEEDBACK.ERROR:
          frequency = 400; // Lower pitch for error
          duration = 0.4;
          break;
        case AUDIO_FEEDBACK.SCAN:
          frequency = 600; // Medium pitch for scan
          duration = 0.1;
          break;
        default:
          return;
      }

      // Generate tone
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
      
    } catch (error) {
      // Fallback to console log if audio fails
      console.log(`Audio feedback ${type}: ${error.message}`);
    }
  }

  /**
   * Provide visual feedback
   * @param {string} type - Visual feedback type
   */
  provideVisualFeedback(type) {
    if (!this.visualFeedbackEnabled) return;

    // Emit visual feedback event for UI to handle
    this.emit('visualFeedback', {
      type,
      timestamp: new Date()
    });
  }

  /**
   * Log scan activity
   * @param {string} barcode - Scanned barcode
   * @param {Object} result - Scan result
   * @param {boolean} success - Success status
   * @param {string} error - Error message if failed
   */
  logScan(barcode, result, success, error = null) {
    const scanLog = {
      timestamp: new Date(),
      barcode,
      result,
      success,
      error,
      cameraId: this.selectedCamera,
      state: this.currentState
    };

    this.scanHistory.push(scanLog);
    
    // Keep only last 100 scans
    if (this.scanHistory.length > 100) {
      this.scanHistory = this.scanHistory.slice(-100);
    }

    this.emit('scanLogged', scanLog);
  }

  /**
   * Get scan history
   * @param {number} limit - Maximum number of entries to return
   * @returns {Array} Scan history
   */
  getScanHistory(limit = 50) {
    return this.scanHistory.slice(-limit);
  }

  /**
   * Get scanning statistics
   * @returns {Object} Statistics
   */
  getScanStatistics() {
    const total = this.scanHistory.length;
    const successful = this.scanHistory.filter(scan => scan.success).length;
    const failed = total - successful;
    const successRate = total > 0 ? (successful / total) * 100 : 0;

    return {
      total,
      successful,
      failed,
      successRate: Math.round(successRate * 100) / 100,
      errorCount: this.errorCount,
      currentState: this.currentState,
      timestamp: new Date()
    };
  }

  /**
   * Reset scanner service
   */
  async reset() {
    try {
      if (this.currentState === SCANNING_STATES.SCANNING) {
        await this.stopScanning('Reset');
      }

      this.currentState = SCANNING_STATES.IDLE;
      this.scanHistory = [];
      this.errorCount = 0;
      this.selectedCamera = this.cameraDevices[0]?.deviceId || null;

      this.emit('reset', { timestamp: new Date() });
      this.emit('stateChanged', { state: this.currentState, timestamp: new Date() });
    } catch (error) {
      this.emit('error', { 
        error: error.message, 
        timestamp: new Date()
      });
    }
  }

  /**
   * Get service status
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      currentState: this.currentState,
      cameraCount: this.cameraDevices.length,
      selectedCamera: this.selectedCamera,
      errorCount: this.errorCount,
      scanHistoryCount: this.scanHistory.length,
      audioEnabled: this.audioEnabled,
      visualFeedbackEnabled: this.visualFeedbackEnabled,
      manualEntryEnabled: this.manualEntryEnabled,
      timestamp: new Date()
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      if (this.currentState === SCANNING_STATES.SCANNING) {
        await this.stopScanning('Cleanup');
      }

      if (this.scanner) {
        await this.scanner.clear();
        this.scanner = null;
      }

      this.isInitialized = false;
      this.currentState = SCANNING_STATES.IDLE;
      
      this.emit('cleanup', { timestamp: new Date() });
      this.emit('stateChanged', { state: this.currentState, timestamp: new Date() });
    } catch (error) {
      this.emit('error', { 
        error: error.message, 
        timestamp: new Date()
      });
    }
  }
}

// Create and export singleton instance
const barcodeScannerService = new BarcodeScannerService();
export default barcodeScannerService;
