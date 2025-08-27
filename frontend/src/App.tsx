import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useEffect, useState, Suspense, lazy } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/Layout'
import OfflineIndicator from './components/OfflineIndicator'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import LoadingSpinner from './components/ui/LoadingSpinner'

// Import UIDemo directly to fix chunk loading issues
import UIDemo from './components/ui/UIDemo'

// Lazy load page components for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'))
const PanelScan = lazy(() => import('./pages/PanelScan'))
const Inspections = lazy(() => import('./pages/Inspections'))
const Settings = lazy(() => import('./pages/Settings'))
const AuthStatus = lazy(() => import('./components/auth/AuthStatus'))
const LoginForm = lazy(() => import('./components/auth/LoginForm'))
const AuthDemo = lazy(() => import('./pages/AuthDemo'))

// Loading component for Suspense fallback
const PageLoading = () => (
  <div className="flex items-center justify-center min-h-screen">
    <LoadingSpinner size="lg" />
  </div>
)

function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

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
    <AuthProvider>
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
                <Route path="/auth-status" element={<AuthStatus />} />
                <Route path="/login" element={<LoginForm />} />
                <Route path="/auth-demo" element={<AuthDemo />} />
              </Routes>
            </Suspense>
          </Layout>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
