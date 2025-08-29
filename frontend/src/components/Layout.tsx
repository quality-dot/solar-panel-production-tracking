import React, { ReactNode, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  HomeIcon,
  QrCodeIcon,
  ClipboardDocumentCheckIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  KeyIcon,
  ChartBarIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'

interface LayoutProps {
  children: ReactNode
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Scan Panel', href: '/scan', icon: QrCodeIcon },
  { name: 'Inspections', href: '/inspections', icon: ClipboardDocumentCheckIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
  { name: 'Performance', href: '/performance', icon: ChartBarIcon },
  { name: 'Security', href: '/security', icon: ShieldCheckIcon },
]

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false)

  // Keyboard shortcut for toggling sidebar (Ctrl/Cmd + B)
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault()
        setDesktopSidebarCollapsed(!desktopSidebarCollapsed)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [desktopSidebarCollapsed])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              {/* Mobile menu button */}
              <button
                type="button"
                className="lg:hidden -m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
                onClick={() => setSidebarOpen(true)}
              >
                <span className="sr-only">Open sidebar</span>
                <Bars3Icon className="h-6 w-6" aria-hidden="true" />
              </button>
              
              <div className="flex items-center space-x-3">
                <img 
                  src="/crossroads-solar-logo.svg" 
                  alt="Crossroads Solar Logo" 
                  className="h-8 w-8"
                />
                <h1 className="text-xl font-semibold text-gray-900">
                  Crossroads Solar Production Tracker
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Production Floor
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content for mobile/tablet (without sidebar) */}
      <main className="lg:hidden flex-1 scroll-container ios-scroll">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 mobile-content mobile-content-wrapper">
          {children}
          {/* Extra bottom spacing to ensure content is never hidden */}
          <div className="mobile-bottom-spacing"></div>
        </div>
      </main>

      {/* Bottom navigation for mobile/tablet */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 lg:hidden bottom-nav-height shadow-lg z-40">
        <div className="flex justify-around h-full">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex flex-col items-center justify-center py-2 px-3 min-w-0 flex-1 h-full ${
                  isActive
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                } transition-colors duration-200`}
              >
                <item.icon className="h-6 w-6 mb-1" />
                <span className="text-xs font-medium">{item.name}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="relative z-50 lg:hidden">
          <div className="fixed inset-0 bg-gray-900/80" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-0 flex">
            <div className="relative mr-16 flex w-full max-w-xs flex-1">
              <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                <button
                  type="button"
                  className="-m-2.5 p-2.5"
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="sr-only">Close sidebar</span>
                  <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                </button>
              </div>
              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
                <div className="sidebar-header">
                  <div className="flex items-center space-x-3 mb-4">
                    <img 
                      src="/crossroads-solar-logo.svg" 
                      alt="Crossroads Solar Logo" 
                      className="h-8 w-8"
                    />
                    <h2 className="text-lg font-semibold text-gray-900">Crossroads Solar</h2>
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
                  <button
                    type="button"
                    className="lg:hidden sidebar-internal-toggle"
                    onClick={() => setSidebarOpen(false)}
                    title="Close sidebar"
                  >
                    <span className="sr-only">Close sidebar</span>
                    <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
                <nav className="flex flex-1 flex-col">
                  <ul role="list" className="flex flex-1 flex-col gap-y-7">
                    <li>
                      <ul role="list" className="-mx-2 space-y-1">
                        {navigation.map((item) => {
                          const isActive = location.pathname === item.href
                          return (
                            <li key={item.name}>
                              <Link
                                to={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={`group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold ${
                                  isActive
                                    ? 'bg-primary-100 text-primary-700'
                                    : 'text-gray-700 hover:text-primary-700 hover:bg-gray-50'
                                }`}
                              >
                                <item.icon className="h-6 w-6 shrink-0" />
                                {item.name}
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar for desktop */}
      <nav className={`hidden lg:block sidebar-desktop transition-all duration-300 ease-in-out ${
        desktopSidebarCollapsed ? 'w-16' : 'w-64'
      }`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header with Toggle Button */}
          <div className="sidebar-header">
            {!desktopSidebarCollapsed && (
              <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
            )}
            <button
              type="button"
              className="sidebar-internal-toggle"
              onClick={() => setDesktopSidebarCollapsed(!desktopSidebarCollapsed)}
              title={`${desktopSidebarCollapsed ? "Expand" : "Collapse"} sidebar`}
            >
              <span className="sr-only">
                {desktopSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              </span>
              {desktopSidebarCollapsed ? (
                <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
              ) : (
                <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
          
          {/* Navigation Items */}
          <div className="flex-1 px-4 py-4">
            <div className="space-y-2">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href
                return (
                  <div key={item.name} className="relative group">
                    <Link
                      to={item.href}
                      className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                        isActive
                          ? 'bg-primary-100 text-primary-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!desktopSidebarCollapsed && (
                        <span className="ml-3 transition-opacity duration-200">
                          {item.name}
                        </span>
                      )}
                    </Link>
                    {desktopSidebarCollapsed && (
                      <div className="sidebar-item-tooltip">
                        {item.name}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* Main content wrapper for desktop sidebar */}
      <main className={`hidden lg:block content-with-sidebar scroll-container ios-scroll ${
        desktopSidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
