import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCodeIcon, CameraIcon, XMarkIcon } from '@heroicons/react/24/outline';
import audioFeedbackService from '../services/audioFeedbackService';

interface BarcodeScannerProps {
  onScanSuccess: (barcode: string) => void;
  onScanError: (error: string) => void;
  onManualEntry: (barcode: string) => void;
  className?: string;
}

interface CameraDevice {
  id: string;
  label: string;
}

export default function BarcodeScanner({
  onScanSuccess,
  onScanError,
  onManualEntry,
  className = ''
}: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [manualBarcode, setManualBarcode] = useState('');
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Initialize audio feedback service
  useEffect(() => {
    audioFeedbackService.initialize();
    return () => {
      audioFeedbackService.dispose();
    };
  }, []);

  // Initialize camera devices
  useEffect(() => {
    const initializeCameras = async () => {
      try {
        if (videoContainerRef.current) {
          const html5QrCode = new Html5Qrcode('barcode-scanner-video');
          scannerRef.current = html5QrCode;
          
          const devices = await html5QrCode.getCameras();
          setCameras(devices);
          
          if (devices.length > 0) {
            setSelectedCamera(devices[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to initialize cameras:', error);
        setErrorMessage('Failed to access camera. Please check permissions.');
        audioFeedbackService.playError();
      }
    };

    initializeCameras();

    return () => {
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  // Start scanning
  const startScanning = useCallback(async () => {
    if (!scannerRef.current || !selectedCamera) {
      setErrorMessage('No camera selected or scanner not initialized');
      audioFeedbackService.playError();
      return;
    }

    try {
      setIsScanning(true);
      setScanStatus('scanning');
      setErrorMessage('');
      
      // Play scan start sound
      audioFeedbackService.playScan();

      await scannerRef.current.start(
        selectedCamera,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          disableFlip: false
        },
        (decodedText: string) => {
          // Validate barcode format (CRSYYFBPP#####)
          if (isValidBarcode(decodedText)) {
            setScanStatus('success');
            audioFeedbackService.playSuccess();
            onScanSuccess(decodedText);
            stopScanning();
          } else {
            setScanStatus('error');
            setErrorMessage('Invalid barcode format. Expected: CRSYYFBPP#####');
            audioFeedbackService.playError();
          }
        },
        (error: any) => {
          console.log('Scan error:', error);
          // Don't show every scan error to user, only critical ones
        }
      );
    } catch (error) {
      console.error('Failed to start scanning:', error);
      setErrorMessage('Failed to start camera scanning');
      setScanStatus('error');
      setIsScanning(false);
      audioFeedbackService.playError();
    }
  }, [selectedCamera, onScanSuccess]);

  // Stop scanning
  const stopScanning = useCallback(async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        setIsScanning(false);
        setScanStatus('idle');
      } catch (error) {
        console.error('Failed to stop scanning:', error);
      }
    }
  }, [isScanning]);

  // Validate barcode format
  const isValidBarcode = (barcode: string): boolean => {
    // CRSYYFBPP##### format validation
    const barcodePattern = /^CRS\d{2}YF\d{2}PP\d{5}$/;
    return barcodePattern.test(barcode);
  };

  // Handle manual barcode submission
  const handleManualSubmit = () => {
    if (manualBarcode.trim()) {
      if (isValidBarcode(manualBarcode.trim())) {
        audioFeedbackService.playSuccess();
        onManualEntry(manualBarcode.trim());
        setManualBarcode('');
      } else {
        setErrorMessage('Invalid barcode format. Expected: CRSYYFBPP#####');
        audioFeedbackService.playError();
      }
    }
  };

  // Handle camera selection change
  const handleCameraChange = (cameraId: string) => {
    setSelectedCamera(cameraId);
    if (isScanning) {
      stopScanning().then(() => {
        setTimeout(() => startScanning(), 500);
      });
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Camera Selection */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Camera Selection</h3>
        <div className="space-y-3">
          <label htmlFor="camera-select" className="label">
            Select Camera
          </label>
          <select
            id="camera-select"
            value={selectedCamera}
            onChange={(e) => handleCameraChange(e.target.value)}
            className="input"
            disabled={isScanning}
          >
            {cameras.map((camera) => (
              <option key={camera.id} value={camera.id}>
                {camera.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Video Container */}
      <div className="card">
        <div className="text-center">
          <div 
            ref={videoContainerRef}
            id="barcode-scanner-video"
            className="mx-auto bg-gray-100 rounded-lg overflow-hidden mb-4"
            style={{ width: '320px', height: '240px' }}
          >
            {!isScanning && (
              <div className="flex items-center justify-center h-full">
                <CameraIcon className="h-16 w-16 text-gray-400" />
              </div>
            )}
          </div>
          
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-900">
              {scanStatus === 'scanning' ? 'Scanning...' : 'Ready to Scan'}
            </h3>
            
            {scanStatus === 'scanning' && (
              <p className="text-gray-600">
                Position the barcode within the scanning area
              </p>
            )}
            
            {scanStatus === 'success' && (
              <p className="text-success-600 font-medium">
                ✓ Barcode scanned successfully!
              </p>
            )}
            
            {scanStatus === 'error' && (
              <p className="text-error-600 font-medium">
                {errorMessage}
              </p>
            )}
          </div>

          <div className="mt-6 space-x-3">
            {!isScanning ? (
              <button
                onClick={startScanning}
                disabled={!selectedCamera}
                className="touch-button btn-primary"
              >
                <QrCodeIcon className="h-5 w-5 mr-2" />
                Start Scanning
              </button>
            ) : (
              <button
                onClick={stopScanning}
                className="touch-button btn-secondary"
              >
                <XMarkIcon className="h-5 w-5 mr-2" />
                Stop Scanning
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Manual Entry */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Manual Entry</h3>
        <div className="space-y-4">
          <div className="form-group">
            <label htmlFor="manual-barcode" className="label">
              Panel Barcode
            </label>
            <input
              type="text"
              id="manual-barcode"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              className="input"
              placeholder="Enter barcode manually (CRSYYFBPP#####)"
              onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
            />
          </div>
          <button 
            onClick={handleManualSubmit}
            disabled={!manualBarcode.trim()}
            className="touch-button btn-primary"
          >
            Submit Manual Entry
          </button>
        </div>
      </div>

      {/* Error Display */}
      {errorMessage && (
        <div className="card bg-error-50 border-error-200">
          <div className="flex items-center">
            <XMarkIcon className="h-5 w-5 text-error-600 mr-2" />
            <span className="text-error-800">{errorMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
