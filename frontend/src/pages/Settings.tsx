import { WifiIcon, DevicePhoneMobileIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import PWAInstallPrompt from '../components/PWAInstallPrompt'

export default function Settings() {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isPWAInstalled, setIsPWAInstalled] = useState(false)
  
  // Check if PWA is already installed
  useEffect(() => {
    const checkIfInstalled = () => {
      const isInstalled = window.matchMedia('(display-mode: standalone)').matches
      setIsPWAInstalled(isInstalled)
      return isInstalled
    }
    
    // Check immediately
    checkIfInstalled()
    
    // Listen for changes (in case user installs while on this page)
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    const handleChange = (e: MediaQueryListEvent) => {
      setIsPWAInstalled(e.matches)
    }
    
    mediaQuery.addEventListener('change', handleChange)
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])
  
  return (
    <div className="space-y-6 settings-content touch-scroll force-above-nav">
      {/* Header */}
      <div className="lg:hidden">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Configure system settings and preferences</p>
      </div>

      {/* System Status */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">System Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <WifiIcon className="h-5 w-5 text-gray-400 mr-3" />
              <span className="text-sm font-medium text-gray-900">Network</span>
            </div>
            <span className="status-success">Connected</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <DevicePhoneMobileIcon className="h-5 w-5 text-gray-400 mr-3" />
              <span className="text-sm font-medium text-gray-900">Device</span>
            </div>
            <span className="status-info">Tablet</span>
          </div>
        </div>
      </div>

      {/* PWA Installation - Only show if not already installed */}
      {!isPWAInstalled && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Install App</h3>
          <div className="text-center p-6">
            <ComputerDesktopIcon className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">Install App</h4>
            <p className="text-gray-600 mb-4">Add to your home screen</p>
            <button 
              onClick={() => setShowInstallPrompt(true)}
              className="touch-button btn-primary px-8 py-3 text-lg"
            >
              Install App
            </button>
          </div>
        </div>
      )}
      
      {/* PWA Already Installed - Show success message */}
      {isPWAInstalled && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">App Status</h3>
          <div className="text-center p-6">
            <ComputerDesktopIcon className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">App Installed</h4>
            <p className="text-gray-600 mb-4">You can access this app from your home screen</p>
            <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Installed Successfully
            </div>
          </div>
        </div>
      )}
      
      {/* Station Configuration */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Station Configuration</h3>
        <div className="space-y-4">
          <div className="form-group">
            <label htmlFor="settingsStationId" className="label">Station ID</label>
            <select id="settingsStationId" className="input">
              <option value="">Select Station</option>
              <option value="1">Line 1 - Station 1: Assembly & EL</option>
              <option value="2">Line 1 - Station 2: Framing</option>
              <option value="3">Line 1 - Station 3: Junction Box</option>
              <option value="4">Line 1 - Station 4: Performance & Final</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="operator" className="label">Operator Name</label>
            <input
              type="text"
              id="operator"
              className="input"
              placeholder="Enter operator name"
            />
          </div>
        </div>
      </div>

      {/* Scanner Configuration */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Scanner Configuration</h3>
        <div className="space-y-4">
          <div className="form-group">
            <label htmlFor="scannerType" className="label">Scanner Type</label>
            <select id="scannerType" className="input">
              <option value="">Select Scanner</option>
              <option value="bluetooth">Bluetooth Scanner</option>
              <option value="usb">USB Scanner</option>
              <option value="camera">Camera Scanner</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="scanDelay" className="label">Scan Delay (ms)</label>
            <input
              type="number"
              id="scanDelay"
              className="input"
              placeholder="500"
              min="0"
              max="2000"
            />
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Data Management</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Offline Storage</h4>
              <p className="text-sm text-gray-500">Local data storage capacity</p>
            </div>
            <span className="text-sm font-medium text-gray-900">0 / 800 panels</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="touch-button btn-secondary">
              Export Data
            </button>
            <button className="touch-button btn-secondary">
              Clear Cache
            </button>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">About</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">App Version</span>
            <span className="font-medium">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Build Date</span>
            <span className="font-medium">{new Date().toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Database Version</span>
            <span className="font-medium">1.0.0</span>
          </div>
        </div>
      </div>
      
      {/* PWA Install Prompt Modal */}
      <PWAInstallPrompt 
        isVisible={showInstallPrompt} 
        onClose={() => setShowInstallPrompt(false)} 
      />
    </div>
  )
}
