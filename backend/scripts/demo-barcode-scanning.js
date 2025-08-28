#!/usr/bin/env node

/**
 * Barcode Scanning Integration Demonstration Script
 * Showcases camera-based barcode scanning functionality for station tablets
 */

import { EventEmitter } from 'events';
import BarcodeScannerService, {
  SCANNING_STATES,
  SUPPORTED_FORMATS,
  AUDIO_FEEDBACK,
  VISUAL_FEEDBACK
} from '../services/barcodeScannerService.js';

// Mock browser environment for Node.js demonstration
global.window = {};
global.navigator = {
  mediaDevices: {
    getUserMedia: () => Promise.resolve({}),
    enumerateDevices: () => Promise.resolve([
      { kind: 'videoinput', deviceId: 'camera1', label: 'Front Camera' },
      { kind: 'videoinput', deviceId: 'camera2', label: 'Back Camera' }
    ])
  }
};

// Mock HTML5 QR Code library
global.Html5Qrcode = class MockHtml5Qrcode {
  constructor(elementId, config) {
    this.elementId = elementId;
    this.config = config;
    this.isRunning = false;
  }

  async start(deviceId, config, onScanSuccess, onScanError) {
    this.isRunning = true;
    this.deviceId = deviceId;
    this.config = config;
    this.onScanSuccess = onScanSuccess;
    this.onScanError = onScanError;
    
    console.log(`🎥 Scanner started on device: ${deviceId.deviceId}`);
    console.log(`⚙️  Configuration:`, config);
    
    // Simulate successful scan after 2 seconds
    setTimeout(() => {
      if (this.isRunning) {
        const mockBarcode = 'CRS23WB123456789';
        const mockResult = { format: 'CODE_128' };
        
        console.log(`✅ Simulating successful scan: ${mockBarcode}`);
        this.onScanSuccess(mockBarcode, mockResult);
      }
    }, 2000);
  }

  async stop() {
    this.isRunning = false;
    console.log('🛑 Scanner stopped');
  }

  async clear() {
    this.isRunning = false;
    console.log('🧹 Scanner cleared');
  }
};

// Mock AudioContext for Node.js demonstration
global.AudioContext = class MockAudioContext {
  constructor() {
    this.currentTime = 0;
  }

  createOscillator() {
    return {
      connect: () => {},
      frequency: { value: 0 },
      type: 'sine',
      start: () => console.log('🔊 Audio feedback generated'),
      stop: () => {}
    };
  }

  createGain() {
    return {
      connect: () => {},
      gain: {
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {}
      }
    };
  }

  get destination() {
    return {};
  }
};

/**
 * Demonstration Helper Functions
 */
class BarcodeScanningDemo extends EventEmitter {
  constructor() {
    super();
    this.service = new BarcodeScannerService();
    this.demoRunning = false;
    this.setupEventListeners();
  }

  setupEventListeners() {
    // State change events
    this.service.on('stateChanged', ({ state, timestamp }) => {
      console.log(`🔄 State changed to: ${state} at ${timestamp.toLocaleTimeString()}`);
    });

    // Initialization events
    this.service.on('initialized', ({ timestamp, cameraCount, selectedCamera }) => {
      console.log(`✅ Scanner initialized at ${timestamp.toLocaleTimeString()}`);
      console.log(`📷 Detected ${cameraCount} cameras, selected: ${selectedCamera}`);
    });

    // Camera events
    this.service.on('camerasDetected', ({ cameras, selectedCamera }) => {
      console.log(`📹 Available cameras:`);
      cameras.forEach(camera => {
        console.log(`   - ${camera.label} (${camera.deviceId})`);
      });
      console.log(`🎯 Selected camera: ${selectedCamera}`);
    });

    // Scanner events
    this.service.on('scannerInitialized', ({ timestamp, supportedFormats }) => {
      console.log(`🔧 Scanner initialized at ${timestamp.toLocaleTimeString()}`);
      console.log(`📋 Supported formats: ${supportedFormats.join(', ')}`);
    });

    // Scanning events
    this.service.on('scanningStarted', ({ config, timestamp, cameraId }) => {
      console.log(`🚀 Scanning started at ${timestamp.toLocaleTimeString()}`);
      console.log(`📷 Camera: ${cameraId}`);
      console.log(`⚙️  Config:`, config);
    });

    this.service.on('scanningStopped', ({ reason, timestamp }) => {
      console.log(`⏹️  Scanning stopped at ${timestamp.toLocaleTimeString()}`);
      console.log(`📝 Reason: ${reason}`);
    });

    // Scan result events
    this.service.on('scanSuccess', ({ barcode, result, validation, timestamp }) => {
      console.log(`🎉 Scan successful at ${timestamp.toLocaleTimeString()}`);
      console.log(`📊 Barcode: ${barcode}`);
      console.log(`🔍 Format: ${validation.format}`);
      console.log(`📋 Pattern: ${validation.pattern}`);
      console.log(`📄 Result:`, result);
    });

    this.service.on('scanError', ({ error, errorCount, timestamp }) => {
      console.log(`❌ Scan error at ${timestamp.toLocaleTimeString()}`);
      console.log(`🚨 Error: ${error}`);
      console.log(`🔢 Error count: ${errorCount}`);
    });

    // Manual entry events
    this.service.on('manualEntryEnabled', ({ timestamp }) => {
      console.log(`✍️  Manual entry enabled at ${timestamp.toLocaleTimeString()}`);
    });

    this.service.on('manualBarcodeProcessed', ({ barcode, validation, timestamp }) => {
      console.log(`✍️  Manual barcode processed at ${timestamp.toLocaleTimeString()}`);
      console.log(`📊 Barcode: ${barcode}`);
      console.log(`🔍 Format: ${validation.format}`);
    });

    this.service.on('manualBarcodeError', ({ barcode, error, timestamp }) => {
      console.log(`❌ Manual barcode error at ${timestamp.toLocaleTimeString()}`);
      console.log(`📊 Barcode: ${barcode}`);
      console.log(`🚨 Error: ${error}`);
    });

    // Camera management events
    this.service.on('cameraSwitched', ({ cameraId, timestamp }) => {
      console.log(`🔄 Camera switched to ${cameraId} at ${timestamp.toLocaleTimeString()}`);
    });

    // Visual feedback events
    this.service.on('visualFeedback', ({ type, timestamp }) => {
      console.log(`🎨 Visual feedback: ${type} at ${timestamp.toLocaleTimeString()}`);
    });

    // Scan logging events
    this.service.on('scanLogged', (scanLog) => {
      console.log(`📝 Scan logged: ${scanLog.success ? '✅' : '❌'} ${scanLog.barcode || 'N/A'}`);
    });

    // Error events
    this.service.on('error', ({ error, timestamp, state }) => {
      console.log(`💥 Service error at ${timestamp.toLocaleTimeString()}`);
      console.log(`🚨 Error: ${error}`);
      if (state) console.log(`🔴 State: ${state}`);
    });

    // Max errors reached event
    this.service.on('maxErrorsReached', ({ errorCount, timestamp }) => {
      console.log(`🚨 Max errors reached at ${timestamp.toLocaleTimeString()}`);
      console.log(`🔢 Total errors: ${errorCount}`);
    });
  }

  async runDemo() {
    if (this.demoRunning) {
      console.log('⚠️  Demo already running');
      return;
    }

    this.demoRunning = true;
    console.log('\n🚀 Starting Barcode Scanning Integration Demo...\n');

    try {
      // Step 1: Initialize the service
      console.log('📋 Step 1: Initializing Barcode Scanner Service');
      console.log('=' .repeat(50));
      
      const initResult = await this.service.initialize({
        audioEnabled: true,
        visualFeedbackEnabled: true,
        manualEntryEnabled: true,
        scanTimeout: 30000,
        maxErrors: 5
      });

      if (!initResult) {
        throw new Error('Failed to initialize scanner service');
      }

      await this.delay(1000);

      // Step 2: Display service status
      console.log('\n📊 Step 2: Service Status');
      console.log('=' .repeat(50));
      
      const status = this.service.getStatus();
      console.log('Service Status:', JSON.stringify(status, null, 2));

      await this.delay(1000);

      // Step 3: Demonstrate camera management
      console.log('\n📹 Step 3: Camera Management');
      console.log('=' .repeat(50));
      
      const cameras = await this.service.getCameraDevices();
      console.log(`Available cameras: ${cameras.length}`);
      
      if (cameras.length > 1) {
        console.log('Switching to second camera...');
        await this.service.switchCamera(cameras[1].deviceId);
        await this.delay(1000);
      }

      await this.delay(1000);

      // Step 4: Demonstrate barcode validation
      console.log('\n🔍 Step 4: Barcode Validation Examples');
      console.log('=' .repeat(50));
      
      const testBarcodes = [
        'CRS23WB123456789',  // Valid solar panel
        'CRS45BT987654321',  // Valid solar panel
        '1234567890123',     // Valid EAN-13
        '12345678',          // Valid EAN-8
        'ABC123DEF',         // Valid CODE-39
        'INVALID_BARCODE',   // Invalid
        '',                  // Empty
        null                 // Null
      ];

      testBarcodes.forEach(barcode => {
        const result = this.service.validateBarcode(barcode);
        const status = result.isValid ? '✅' : '❌';
        console.log(`${status} ${barcode || 'null'} -> ${result.isValid ? result.format : result.error}`);
      });

      await this.delay(1000);

      // Step 5: Demonstrate manual entry
      console.log('\n✍️  Step 5: Manual Entry Fallback');
      console.log('=' .repeat(50));
      
      console.log('Enabling manual entry mode...');
      this.service.enableManualEntry();
      await this.delay(500);

      const manualBarcodes = [
        'CRS23WB123456789',
        'INVALID_MANUAL',
        '1234567890123'
      ];

      for (const barcode of manualBarcodes) {
        console.log(`\nProcessing manual barcode: ${barcode}`);
        const result = this.service.processManualBarcode(barcode);
        console.log(`Result: ${result.success ? '✅' : '❌'} ${result.success ? 'Valid' : result.error}`);
        await this.delay(500);
      }

      await this.delay(1000);

      // Step 6: Demonstrate scanning simulation
      console.log('\n🎥 Step 6: Camera Scanning Simulation');
      console.log('=' .repeat(50));
      
      console.log('Starting camera scanning...');
      const scanResult = await this.service.startScanning({
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      });

      if (scanResult) {
        console.log('Scanning started successfully. Waiting for scan result...');
        
        // Wait for the simulated scan to complete
        await this.delay(3000);
        
        console.log('Stopping scanner...');
        await this.service.stopScanning('Demo completed');
      }

      await this.delay(1000);

      // Step 7: Display scan statistics
      console.log('\n📈 Step 7: Scan Statistics');
      console.log('=' .repeat(50));
      
      const stats = this.service.getScanStatistics();
      console.log('Scan Statistics:', JSON.stringify(stats, null, 2));

      await this.delay(1000);

      // Step 8: Demonstrate error handling
      console.log('\n🚨 Step 8: Error Handling Simulation');
      console.log('=' .repeat(50));
      
      console.log('Simulating scan errors...');
      
      // Manually trigger error events to demonstrate error handling
      for (let i = 0; i < 3; i++) {
        this.service.onScanError(new Error(`Simulated error ${i + 1}`));
        await this.delay(200);
      }

      await this.delay(1000);

      // Step 9: Demonstrate service reset
      console.log('\n🔄 Step 9: Service Reset');
      console.log('=' .repeat(50));
      
      console.log('Resetting service...');
      await this.service.reset();
      
      const resetStatus = this.service.getStatus();
      console.log('Status after reset:', JSON.stringify(resetStatus, null, 2));

      await this.delay(1000);

      // Step 10: Final status and cleanup
      console.log('\n🏁 Step 10: Final Status and Cleanup');
      console.log('=' .repeat(50));
      
      const finalStatus = this.service.getStatus();
      console.log('Final Service Status:', JSON.stringify(finalStatus, null, 2));
      
      console.log('Cleaning up...');
      await this.service.cleanup();
      
      console.log('\n✅ Barcode Scanning Integration Demo completed successfully!');
      console.log('\n🎯 Key Features Demonstrated:');
      console.log('   • Camera detection and management');
      console.log('   • Barcode format validation');
      console.log('   • Manual entry fallback');
      console.log('   • Audio and visual feedback');
      console.log('   • Error handling and recovery');
      console.log('   • Scan logging and statistics');
      console.log('   • Service state management');
      console.log('   • Event-driven architecture');

    } catch (error) {
      console.error('\n💥 Demo failed:', error.message);
      console.error(error.stack);
    } finally {
      this.demoRunning = false;
    }
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 Barcode Scanning Integration System');
  console.log('📱 Station Tablet Camera Integration Demo');
  console.log('🏭 Solar Panel Production Tracking\n');

  const demo = new BarcodeScanningDemo();
  
  try {
    await demo.runDemo();
  } catch (error) {
    console.error('💥 Demo execution failed:', error.message);
    process.exit(1);
  }
}

// Run demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default BarcodeScanningDemo;
