import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useEffect, useState, Suspense, lazy } from 'react'
import { registerSW } from 'virtual:pwa-register'
import Layout from './components/Layout'
import OfflineIndicator from './components/OfflineIndicator'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import LoadingSpinner from './components/ui/LoadingSpinner'

// Lazy load page components for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'))
const PanelScan = lazy(() => import('./pages/PanelScan'))
const Inspections = lazy(() => import('./pages/Inspections'))
const Settings = lazy(() => import('./pages/Settings'))
const UIDemo = lazy(() => import('./components/ui/UIDemo'))

// Loading component for Suspense fallback
const PageLoading = () => (
  <div className="flex items-center justify-center min-h-screen">
    <LoadingSpinner size="lg" />
  </div>
)

function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  // eslint-disable-next-line no-unused-vars
  const [_updateSW] = useState(() => registerSW({
    onNeedRefresh() {
      // Handle when new content is available
      console.log('New content available')
    },
    onOfflineReady() {
      // Handle when app is ready for offline use
      console.log('App ready for offline use')
    },
    onRegistered(swRegistration) {
      // Handle service worker registration
      console.log('Service Worker registered:', swRegistration)
    },
    onRegisterError(error) {
      // Handle registration error
      console.error('Service Worker registration error:', error)
    }
  }))

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <OfflineIndicator isOnline={isOnline} />
        <PWAInstallPrompt />
        <Layout>
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/scan" element={<PanelScan />} />
              <Route path="/inspections" element={<Inspections />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/ui-demo" element={<UIDemo />} />
            </Routes>
          </Suspense>
        </Layout>
      </div>
    </Router>
  )
}

export default App
