import { useState } from 'react'
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import BarcodeScanner from '../components/BarcodeScanner'

interface PanelData {
  barcode: string;
  panelType: string;
  powerRating: string;
  status: string;
  manufacturingOrder?: string;
  lineNumber?: string;
  stationNumber?: string;
}

export default function PanelScan() {
  const [scannedPanel, setScannedPanel] = useState<PanelData | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState('')

  const handleScanSuccess = async (barcode: string) => {
    setIsProcessing(true)
    setProcessingStatus('processing')
    setStatusMessage('Processing scanned barcode...')

    try {
      // Simulate API call to backend for panel validation
      // In real implementation, this would call the backend BarcodeScannerService
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Parse barcode components (CRSYYFBPP#####)
      const barcodeData = parseBarcodeComponents(barcode)
      
      if (barcodeData) {
        const panelData: PanelData = {
          barcode,
          panelType: barcodeData.panelType,
          powerRating: barcodeData.powerRating,
          status: 'Ready for Inspection',
          manufacturingOrder: barcodeData.moNumber,
          lineNumber: barcodeData.lineNumber,
          stationNumber: barcodeData.stationNumber
        }
        
        setScannedPanel(panelData)
        setProcessingStatus('success')
        setStatusMessage('Panel validated successfully!')
      } else {
        throw new Error('Invalid barcode format')
      }
    } catch (error) {
      console.error('Panel processing error:', error)
      setProcessingStatus('error')
      setStatusMessage('Failed to process panel. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleScanError = (error: string) => {
    setStatusMessage(error)
    setProcessingStatus('error')
  }

  const handleManualEntry = async (barcode: string) => {
    await handleScanSuccess(barcode)
  }

  const parseBarcodeComponents = (barcode: string) => {
    // Parse CRSYYFBPP##### format
    const match = barcode.match(/^CRS(\d{2})YF(\d{2})PP(\d{5})$/);
    if (!match) return null;

    const [, lineNum, stationNum, moNum] = match;
    
    // Map line numbers to panel types and power ratings
    const lineConfigs: Record<string, { type: string; power: string }> = {
      '01': { type: 'Monocrystalline', power: '400W' },
      '02': { type: 'Polycrystalline', power: '380W' },
      '03': { type: 'Thin Film', power: '350W' },
      '04': { type: 'Bifacial', power: '450W' }
    };

    const config = lineConfigs[lineNum] || { type: 'Standard', power: '400W' };

    return {
      lineNumber: lineNum,
      stationNumber: stationNum,
      moNumber: moNum,
      panelType: config.type,
      powerRating: config.power
    };
  }

  const beginInspection = () => {
    if (scannedPanel) {
      // Navigate to inspection page or start inspection workflow
      setStatusMessage('Starting inspection workflow...')
      // In real implementation, this would trigger navigation or workflow
    }
  }

  const resetScan = () => {
    setScannedPanel(null)
    setProcessingStatus('idle')
    setStatusMessage('')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="lg:hidden">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Panel Scan</h1>
        <p className="text-gray-600">Scan panel barcode to begin inspection</p>
      </div>

      {/* Barcode Scanner Component */}
      <BarcodeScanner
        onScanSuccess={handleScanSuccess}
        onScanError={handleScanError}
        onManualEntry={handleManualEntry}
      />

      {/* Processing Status */}
      {processingStatus !== 'idle' && (
        <div className="card">
          <div className="text-center">
            {processingStatus === 'processing' && (
              <div className="flex items-center justify-center space-x-2">
                <div className="spinner h-5 w-5" />
                <span className="text-gray-600">{statusMessage}</span>
              </div>
            )}
            
            {processingStatus === 'success' && (
              <div className="flex items-center justify-center space-x-2 text-success-600">
                <CheckCircleIcon className="h-5 w-5" />
                <span className="font-medium">{statusMessage}</span>
              </div>
            )}
            
            {processingStatus === 'error' && (
              <div className="flex items-center justify-center space-x-2 text-error-600">
                <XCircleIcon className="h-5 w-5" />
                <span className="font-medium">{statusMessage}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scan Result */}
      {scannedPanel && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Panel Information</h3>
              <p className="text-sm text-gray-600 mt-1">Barcode: {scannedPanel.barcode}</p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-success-600" />
          </div>
          
          <div className="space-y-3 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-600 text-sm">Panel Type</span>
                <p className="font-medium">{scannedPanel.panelType}</p>
              </div>
              <div>
                <span className="text-gray-600 text-sm">Power Rating</span>
                <p className="font-medium">{scannedPanel.powerRating}</p>
              </div>
              <div>
                <span className="text-gray-600 text-sm">Line Number</span>
                <p className="font-medium">{scannedPanel.lineNumber}</p>
              </div>
              <div>
                <span className="text-gray-600 text-sm">Station</span>
                <p className="font-medium">{scannedPanel.stationNumber}</p>
              </div>
            </div>
            
            {scannedPanel.manufacturingOrder && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <InformationCircleIcon className="h-5 w-5 text-blue-600" />
                  <span className="text-blue-800 font-medium">
                    Manufacturing Order: {scannedPanel.manufacturingOrder}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={beginInspection}
              className="touch-button btn-success"
            >
              <CheckCircleIcon className="h-5 w-5 mr-2" />
              Begin Inspection
            </button>
            <button 
              onClick={resetScan}
              className="touch-button btn-secondary"
            >
              <XCircleIcon className="h-5 w-5 mr-2" />
              Scan Another
            </button>
            <button className="touch-button btn-outline">
              View History
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
