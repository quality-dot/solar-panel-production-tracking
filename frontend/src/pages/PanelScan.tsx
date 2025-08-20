import { useState } from 'react'
import { QrCodeIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

export default function PanelScan() {
  const [scannedBarcode, setScannedBarcode] = useState('')
  const [isScanning, setIsScanning] = useState(false)

  const handleScan = () => {
    setIsScanning(true)
    // Simulate barcode scanning
    setTimeout(() => {
      setScannedBarcode('PANEL_20241201_001')
      setIsScanning(false)
    }, 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="lg:hidden">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Panel Scan</h1>
        <p className="text-gray-600">Scan panel barcode to begin inspection</p>
      </div>

      {/* Scan Area */}
      <div className="card">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-32 w-32 rounded-full bg-gray-100 mb-6">
            <QrCodeIcon className="h-16 w-16 text-gray-400" />
          </div>
          
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Ready to Scan
          </h3>
          <p className="text-gray-600 mb-6">
            Position the barcode scanner and scan the panel barcode
          </p>

          <button
            onClick={handleScan}
            disabled={isScanning}
            className="touch-button btn-primary"
          >
            {isScanning ? (
              <>
                <div className="spinner h-5 w-5 mr-2" />
                Scanning...
              </>
            ) : (
              <>
                <QrCodeIcon className="h-5 w-5 mr-2" />
                Start Scan
              </>
            )}
          </button>
        </div>
      </div>

      {/* Scan Result */}
      {scannedBarcode && (
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Scan Result</h3>
              <p className="text-sm text-gray-600 mt-1">Barcode: {scannedBarcode}</p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-success-600" />
          </div>
          
          <div className="mt-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Panel Type</span>
              <span className="font-medium">Monocrystalline</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Power Rating</span>
              <span className="font-medium">400W</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status</span>
              <span className="status-info">Ready for Inspection</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="touch-button btn-success">
              <CheckCircleIcon className="h-5 w-5 mr-2" />
              Begin Inspection
            </button>
            <button className="touch-button btn-secondary">
              <XCircleIcon className="h-5 w-5 mr-2" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Manual Entry */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Manual Entry</h3>
        <div className="space-y-4">
          <div className="form-group">
            <label htmlFor="barcode" className="label">Panel Barcode</label>
            <input
              type="text"
              id="barcode"
              className="input"
              placeholder="Enter panel barcode manually"
            />
          </div>
          <button className="touch-button btn-primary">
            Submit
          </button>
        </div>
      </div>
    </div>
  )
}
