import { useState, useEffect } from 'react'
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon, CloudArrowUpIcon, WifiIcon } from '@heroicons/react/24/outline'
import BarcodeScanner from '../components/BarcodeScanner'
import barcodeScanningService, { BarcodeScanningError } from '../services/barcodeScanningService'

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
  const [isOnline, setIsOnline] = useState(barcodeScanningService.isCurrentlyOnline())
  const [offlineScanStatus, setOfflineScanStatus] = useState({ total: 0, synced: 0, pending: 0 })
  const [isSyncing, setIsSyncing] = useState(false)

  const handleScanSuccess = async (barcode: string) => {
    setIsProcessing(true)
    setProcessingStatus('processing')
    setStatusMessage('Processing scanned barcode...')

    try {
      // Call backend barcode processing service
      const panelData = await barcodeScanningService.processBarcode(barcode)
      
      setScannedPanel(panelData)
      setProcessingStatus('success')
      setStatusMessage('Panel validated successfully!')
    } catch (error) {
      console.error('Panel processing error:', error)
      
      let errorMessage = 'Failed to process panel. Please try again.'
      
      if (error instanceof BarcodeScanningError) {
        switch (error.code) {
          case 'VALIDATION_FAILED':
            errorMessage = 'Invalid barcode format or validation failed.'
            break
          case 'NETWORK_ERROR':
            errorMessage = 'Unable to connect to backend. Please check your connection.'
            break
          case 'PROCESSING_ERROR':
            errorMessage = error.message || 'Barcode processing failed.'
            break
          default:
            errorMessage = error.message || errorMessage
        }
      }
      
      setProcessingStatus('error')
      setStatusMessage(errorMessage)
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

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      // Auto-sync when back online
      syncOfflineScans()
    }
    
    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Load initial offline scan status
    loadOfflineScanStatus()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Load offline scan status
  const loadOfflineScanStatus = async () => {
    try {
      const status = await barcodeScanningService.getOfflineScanStatus()
      setOfflineScanStatus(status)
    } catch (error) {
      console.error('Failed to load offline scan status:', error)
    }
  }

  // Sync offline scans
  const syncOfflineScans = async () => {
    if (!isOnline || isSyncing) return

    try {
      setIsSyncing(true)
      setStatusMessage('Syncing offline scans...')
      
      const result = await barcodeScanningService.syncOfflineScans()
      
      if (result.synced > 0) {
        setStatusMessage(`Successfully synced ${result.synced} offline scans`)
        await loadOfflineScanStatus()
      } else if (result.failed > 0) {
        setStatusMessage(`Failed to sync ${result.failed} offline scans`)
      } else {
        setStatusMessage('No offline scans to sync')
      }
    } catch (error) {
      console.error('Failed to sync offline scans:', error)
      setStatusMessage('Failed to sync offline scans')
    } finally {
      setIsSyncing(false)
    }
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

      {/* Connection Status */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {isOnline ? (
              <WifiIcon className="h-5 w-5 text-success-600" />
            ) : (
              <XCircleIcon className="h-5 w-5 text-error-600" />
            )}
            <div>
              <p className="font-medium text-gray-900">
                {isOnline ? 'Online' : 'Offline'}
              </p>
              <p className="text-sm text-gray-600">
                {isOnline ? 'Connected to backend' : 'Working offline - scans will sync when online'}
              </p>
            </div>
          </div>
          
          {offlineScanStatus.pending > 0 && (
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {offlineScanStatus.pending} pending sync
                </p>
                <p className="text-xs text-gray-600">
                  {offlineScanStatus.synced} synced
                </p>
              </div>
              {isOnline && (
                <button
                  onClick={syncOfflineScans}
                  disabled={isSyncing}
                  className="touch-button btn-primary btn-sm"
                >
                  {isSyncing ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Syncing...
                    </div>
                  ) : (
                    <>
                      <CloudArrowUpIcon className="h-4 w-4 mr-1" />
                      Sync
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
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
