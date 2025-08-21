import { useState } from 'react'
import {
  QrCodeIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline'

export default function Dashboard() {
  const [expandedSections, setExpandedSections] = useState({
    quickActions: true,
    productionStats: true,
    stationStatus: true,
    recentActivity: true,
    quickStart: true
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="lg:hidden">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Production floor overview</p>
      </div>

      {/* Quick Actions - Collapsible */}
      <div className="card">
        <button
          onClick={() => toggleSection('quickActions')}
          className="collapsible-header"
        >
          <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
          {expandedSections.quickActions ? (
            <ChevronUpIcon className="collapsible-icon" />
          ) : (
            <ChevronDownIcon className="collapsible-icon" />
          )}
        </button>
        
        {expandedSections.quickActions && (
          <div className="collapsible-content grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="production-card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <QrCodeIcon className="h-8 w-8 text-primary-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Scan Panel</h3>
                  <p className="text-sm text-gray-500">Scan barcode to begin inspection</p>
                </div>
              </div>
            </div>

            <div className="production-card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClipboardDocumentCheckIcon className="h-8 w-8 text-success-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Inspections</h3>
                  <p className="text-sm text-gray-500">View inspection history</p>
                </div>
              </div>
            </div>

            <div className="production-card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-8 w-8 text-warning-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Alerts</h3>
                  <p className="text-sm text-gray-500">System notifications</p>
                </div>
              </div>
            </div>

            <div className="production-card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-8 w-8 text-success-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Status</h3>
                  <p className="text-sm text-gray-500">System health</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Production Stats - Collapsible */}
      <div className="card">
        <button
          onClick={() => toggleSection('productionStats')}
          className="collapsible-header"
        >
          <h3 className="text-lg font-medium text-gray-900">Today's Production</h3>
          {expandedSections.productionStats ? (
            <ChevronUpIcon className="collapsible-icon" />
          ) : (
            <ChevronDownIcon className="collapsible-icon" />
          )}
        </button>
        
        {expandedSections.productionStats && (
          <div className="collapsible-content space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Panels Scanned</span>
              <span className="font-semibold">0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Inspections Completed</span>
              <span className="font-semibold">0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pass Rate</span>
              <span className="font-semibold text-success-600">0%</span>
            </div>
          </div>
        )}
      </div>

      {/* Station Status - Collapsible */}
      <div className="card">
        <button
          onClick={() => toggleSection('stationStatus')}
          className="collapsible-header"
        >
          <h3 className="text-lg font-medium text-gray-900">Station Status</h3>
          {expandedSections.stationStatus ? (
            <ChevronUpIcon className="collapsible-icon" />
          ) : (
            <ChevronDownIcon className="collapsible-icon" />
          )}
        </button>
        
        {expandedSections.stationStatus && (
          <div className="collapsible-content space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Line 1 - Station 1</span>
              <span className="status-success">Active</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Line 1 - Station 2</span>
              <span className="status-success">Active</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Line 2 - Station 1</span>
              <span className="status-warning">Maintenance</span>
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity - Collapsible */}
      <div className="card">
        <button
          onClick={() => toggleSection('recentActivity')}
          className="collapsible-header"
        >
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
          {expandedSections.recentActivity ? (
            <ChevronUpIcon className="collapsible-icon" />
          ) : (
            <ChevronDownIcon className="collapsible-icon" />
          )}
        </button>
        
        {expandedSections.recentActivity && (
          <div className="collapsible-content space-y-3">
            <div className="text-sm text-gray-500">
              No recent activity
            </div>
          </div>
        )}
      </div>

      {/* Quick Start - Collapsible */}
      <div className="card">
        <button
          onClick={() => toggleSection('quickStart')}
          className="collapsible-header"
        >
          <h3 className="text-lg font-medium text-gray-900">Quick Start</h3>
          {expandedSections.quickStart ? (
            <ChevronUpIcon className="collapsible-icon" />
          ) : (
            <ChevronDownIcon className="collapsible-icon" />
          )}
        </button>
        
        {expandedSections.quickStart && (
          <div className="collapsible-content grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="touch-button btn-primary">
              <QrCodeIcon className="h-5 w-5 mr-2" />
              Start Panel Scan
            </button>
            <button className="touch-button btn-secondary">
              <ClipboardDocumentCheckIcon className="h-5 w-5 mr-2" />
              View Inspections
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
