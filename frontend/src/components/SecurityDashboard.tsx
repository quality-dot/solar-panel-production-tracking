import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  ChartBarIcon,
  ClockIcon,
  UserGroupIcon,
  CogIcon,
  DocumentTextIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  BellIcon
} from '@heroicons/react/24/outline';

import securityDashboardService from '../services/securityDashboardService';
import type { 
  SecurityEvent, 
  SecurityMetrics, 
  ComplianceStatus, 
  ManufacturingSecurity,
  SecurityAlert,
  DashboardConfig 
} from '../services/securityDashboardService';

// Use imported types from the service

// Mock data for development (will be replaced with real API calls)
const mockSecurityMetrics: SecurityMetrics = {
  totalEvents: 1247,
  criticalEvents: 3,
  warningEvents: 12,
  errorEvents: 8,
  infoEvents: 1224,
  riskScore: 65,
  riskLevel: 'medium',
  complianceScore: 87,
  activeIncidents: 2,
  resolvedIncidents: 15,
  lastUpdated: new Date().toISOString()
};

const mockComplianceStatus: ComplianceStatus = {
  isa99: {
    status: 'compliant',
    score: 92,
    lastAssessment: '2025-01-27T10:00:00Z',
    nextAssessment: '2025-04-27T10:00:00Z',
    requirements: ['Access Control', 'Network Segmentation', 'Incident Response'],
    gaps: ['Advanced Threat Detection']
  },
  nist: {
    status: 'partial',
    score: 78,
    lastAssessment: '2025-01-27T10:00:00Z',
    nextAssessment: '2025-02-11T10:00:00Z',
    framework: {
      identify: 85,
      protect: 90,
      detect: 65,
      respond: 70,
      recover: 80
    }
  },
  gdpr: {
    status: 'compliant',
    score: 95,
    lastAssessment: '2025-01-27T10:00:00Z',
    nextAssessment: '2025-07-27T10:00:00Z',
    dataProtection: {
      consent: true,
      dataMinimization: true,
      rightToErasure: true,
      dataPortability: true
    }
  }
};

const mockManufacturingSecurity: ManufacturingSecurity = {
  productionLines: {
    line1: { 
      status: 'secure', 
      incidents: 0, 
      securityScore: 95,
      lastIncident: undefined
    },
    line2: { 
      status: 'warning', 
      incidents: 2, 
      securityScore: 78,
      lastIncident: '2025-01-27T14:25:00Z'
    }
  },
  stations: {
    total: 8,
    secure: 6,
    warning: 1,
    critical: 1,
    details: [
      { id: 'station-1', name: 'Assembly & EL', status: 'secure', lastActivity: '2025-01-27T14:30:00Z', securityEvents: 0 },
      { id: 'station-2', name: 'Framing', status: 'secure', lastActivity: '2025-01-27T14:28:00Z', securityEvents: 0 },
      { id: 'station-3', name: 'Junction Box', status: 'secure', lastActivity: '2025-01-27T14:25:00Z', securityEvents: 0 },
      { id: 'station-4', name: 'Performance & Final', status: 'warning', lastActivity: '2025-01-27T14:20:00Z', securityEvents: 1 },
      { id: 'station-5', name: 'Assembly & EL', status: 'secure', lastActivity: '2025-01-27T14:32:00Z', securityEvents: 0 },
      { id: 'station-6', name: 'Framing', status: 'secure', lastActivity: '2025-01-27T14:29:00Z', securityEvents: 0 },
      { id: 'station-7', name: 'Junction Box', status: 'critical', lastActivity: '2025-01-27T14:15:00Z', securityEvents: 3 },
      { id: 'station-8', name: 'Performance & Final', status: 'secure', lastActivity: '2025-01-27T14:35:00Z', securityEvents: 0 }
    ]
  },
  equipment: {
    total: 24,
    secure: 20,
    warning: 3,
    critical: 1,
    criticalEquipment: [
      {
        id: 'eq-001',
        name: 'EL Test Equipment',
        type: 'Testing',
        issue: 'Communication timeout',
        lastUpdate: '2025-01-27T14:25:00Z'
      }
    ]
  }
};

const mockRecentEvents: SecurityEvent[] = [
  {
    id: '1',
    eventType: 'user.login.failed',
    severity: 'warning',
    timestamp: '2025-01-27T14:30:00Z',
    userId: 'user-123',
    source: 'api',
    message: 'Multiple failed login attempts detected',
    context: { ip: '192.168.1.100', attempts: 5 }
  },
  {
    id: '2',
    eventType: 'equipment.status.error',
    severity: 'critical',
    timestamp: '2025-01-27T14:25:00Z',
    source: 'equipment-monitor',
    message: 'Critical equipment failure detected',
    context: { equipmentId: 'eq-001', error: 'communication_timeout' }
  },
  {
    id: '3',
    eventType: 'data.access.unauthorized',
    severity: 'error',
    timestamp: '2025-01-27T14:20:00Z',
    userId: 'user-456',
    source: 'api',
    message: 'Unauthorized access attempt to sensitive data',
    context: { endpoint: '/api/panel-data', resource: 'panel-789' }
  }
];

export default function SecurityDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics>(mockSecurityMetrics);
  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatus>(mockComplianceStatus);
  const [manufacturingSecurity, setManufacturingSecurity] = useState<ManufacturingSecurity>(mockManufacturingSecurity);
  const [recentEvents, setRecentEvents] = useState<SecurityEvent[]>(mockRecentEvents);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [dashboardConfig, setDashboardConfig] = useState<DashboardConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');

  // Initialize dashboard data
  useEffect(() => {
    const initializeDashboard = async () => {
      setIsLoading(true);
      try {
        // Load initial data
        const [metrics, compliance, manufacturing, events, alerts, config] = await Promise.all([
          securityDashboardService.getSecurityMetrics(),
          securityDashboardService.getComplianceStatus(),
          securityDashboardService.getManufacturingSecurity(),
          securityDashboardService.getRecentSecurityEvents(10),
          securityDashboardService.getSecurityAlerts(),
          securityDashboardService.getDashboardConfig()
        ]);

        setSecurityMetrics(metrics);
        setComplianceStatus(compliance);
        setManufacturingSecurity(manufacturing);
        setRecentEvents(events);
        setSecurityAlerts(alerts);
        setDashboardConfig(config);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        // Use mock data as fallback
      } finally {
        setIsLoading(false);
      }
    };

    initializeDashboard();
  }, []);

  // Set up real-time updates
  useEffect(() => {
    const handleSecurityEvent = (event: SecurityEvent) => {
      setRecentEvents(prev => [event, ...prev.slice(0, 9)]);
    };

    const handleMetricsUpdate = (metrics: SecurityMetrics) => {
      setSecurityMetrics(metrics);
      setLastUpdated(new Date());
    };

    const handleComplianceUpdate = (compliance: ComplianceStatus) => {
      setComplianceStatus(compliance);
    };

    const handleManufacturingUpdate = (manufacturing: ManufacturingSecurity) => {
      setManufacturingSecurity(manufacturing);
    };

    const handleAlert = (alert: SecurityAlert) => {
      setSecurityAlerts(prev => [alert, ...prev]);
    };

    const handleConnection = (status: { status: string }) => {
      setConnectionStatus(status.status as any);
    };

    // Subscribe to real-time updates
    securityDashboardService.on('securityEvent', handleSecurityEvent);
    securityDashboardService.on('metricsUpdate', handleMetricsUpdate);
    securityDashboardService.on('complianceUpdate', handleComplianceUpdate);
    securityDashboardService.on('manufacturingUpdate', handleManufacturingUpdate);
    securityDashboardService.on('alert', handleAlert);
    securityDashboardService.on('connection', handleConnection);

    // Cleanup
    return () => {
      securityDashboardService.off('securityEvent', handleSecurityEvent);
      securityDashboardService.off('metricsUpdate', handleMetricsUpdate);
      securityDashboardService.off('complianceUpdate', handleComplianceUpdate);
      securityDashboardService.off('manufacturingUpdate', handleManufacturingUpdate);
      securityDashboardService.off('alert', handleAlert);
      securityDashboardService.off('connection', handleConnection);
    };
  }, []);

  // Periodic refresh for non-real-time data
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [metrics, compliance, manufacturing] = await Promise.all([
          securityDashboardService.getSecurityMetrics(),
          securityDashboardService.getComplianceStatus(),
          securityDashboardService.getManufacturingSecurity()
        ]);

        setSecurityMetrics(metrics);
        setComplianceStatus(compliance);
        setManufacturingSecurity(manufacturing);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Failed to refresh dashboard data:', error);
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      securityDashboardService.disconnect();
    };
  }, []);

  // Get risk level color
  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Get severity icon
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'error': return <ExclamationCircleIcon className="w-5 h-5 text-red-400" />;
      case 'warning': return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case 'info': return <InformationCircleIcon className="w-5 h-5 text-blue-500" />;
      default: return <InformationCircleIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  // Get compliance status color
  const getComplianceColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'text-green-600 bg-green-100';
      case 'partial': return 'text-yellow-600 bg-yellow-100';
      case 'non-compliant': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Get manufacturing security status color
  const getSecurityStatusColor = (status: string) => {
    switch (status) {
      case 'secure': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Overview Tab Content
  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Security Posture Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShieldCheckIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Risk Score</p>
              <p className={`text-2xl font-bold ${getRiskLevelColor(securityMetrics.riskLevel)}`}>
                {securityMetrics.riskScore}
              </p>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Risk Level: <span className="font-medium capitalize">{securityMetrics.riskLevel}</span>
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Compliance Score</p>
              <p className="text-2xl font-bold text-green-600">{securityMetrics.complianceScore}%</p>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-500">Overall compliance status</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ExclamationTriangleIcon className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Incidents</p>
              <p className="text-2xl font-bold text-orange-600">{securityMetrics.activeIncidents}</p>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-500">Requiring attention</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ChartBarIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Events</p>
              <p className="text-2xl font-bold text-purple-600">{securityMetrics.totalEvents}</p>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-500">Last 24 hours</p>
        </div>
      </div>

      {/* Manufacturing Security Status */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Manufacturing Security Status</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         {/* Production Lines */}
             <div>
               <h4 className="text-sm font-medium text-gray-700 mb-3">Production Lines</h4>
               <div className="space-y-3">
                 <div className="flex items-center justify-between">
                   <span className="text-sm text-gray-600">Line 1</span>
                   <div className="text-right">
                     <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSecurityStatusColor(manufacturingSecurity.productionLines.line1.status)}`}>
                       {manufacturingSecurity.productionLines.line1.status}
                     </span>
                     <p className="text-xs text-gray-500 mt-1">{manufacturingSecurity.productionLines.line1.securityScore}%</p>
                   </div>
                 </div>
                 <div className="flex items-center justify-between">
                   <span className="text-sm text-gray-600">Line 2</span>
                   <div className="text-right">
                     <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSecurityStatusColor(manufacturingSecurity.productionLines.line2.status)}`}>
                       {manufacturingSecurity.productionLines.line2.status}
                     </span>
                     <p className="text-xs text-gray-500 mt-1">{manufacturingSecurity.productionLines.line2.securityScore}%</p>
                   </div>
                 </div>
               </div>
             </div>

                         {/* Stations */}
             <div>
               <h4 className="text-sm font-medium text-gray-700 mb-3">Stations ({manufacturingSecurity.stations.total})</h4>
               <div className="space-y-2">
                 <div className="flex items-center justify-between">
                   <span className="text-sm text-gray-600">Secure</span>
                   <span className="text-sm font-medium text-green-600">{manufacturingSecurity.stations.secure}</span>
                 </div>
                 <div className="flex items-center justify-between">
                   <span className="text-sm text-gray-600">Warning</span>
                   <span className="text-sm font-medium text-yellow-600">{manufacturingSecurity.stations.warning}</span>
                 </div>
                 <div className="flex items-center justify-between">
                   <span className="text-sm text-gray-600">Critical</span>
                   <span className="text-sm font-medium text-red-600">{manufacturingSecurity.stations.critical}</span>
                 </div>
               </div>
               {/* Station Details */}
               <div className="mt-3 space-y-2">
                 {manufacturingSecurity.stations.details
                   .filter(station => station.status !== 'secure')
                   .slice(0, 3)
                   .map(station => (
                     <div key={station.id} className="text-xs text-gray-600">
                       <span className="font-medium">{station.name}:</span> {station.status} ({station.securityEvents} events)
                     </div>
                   ))}
               </div>
             </div>

                         {/* Equipment */}
             <div>
               <h4 className="text-sm font-medium text-gray-700 mb-3">Equipment ({manufacturingSecurity.equipment.total})</h4>
               <div className="space-y-2">
                 <div className="flex items-center justify-between">
                   <span className="text-sm text-gray-600">Secure</span>
                   <span className="text-sm font-medium text-green-600">{manufacturingSecurity.equipment.secure}</span>
                 </div>
                 <div className="flex items-center justify-between">
                   <span className="text-sm text-gray-600">Warning</span>
                   <span className="text-sm font-medium text-yellow-600">{manufacturingSecurity.equipment.warning}</span>
                 </div>
                 <div className="flex items-center justify-between">
                   <span className="text-sm text-gray-600">Critical</span>
                   <span className="text-sm font-medium text-red-600">{manufacturingSecurity.equipment.critical}</span>
                 </div>
               </div>
               {/* Critical Equipment Details */}
               {manufacturingSecurity.equipment.criticalEquipment.length > 0 && (
                 <div className="mt-3 space-y-2">
                   {manufacturingSecurity.equipment.criticalEquipment.map(equipment => (
                     <div key={equipment.id} className="text-xs text-red-600">
                       <span className="font-medium">{equipment.name}:</span> {equipment.issue}
                     </div>
                   ))}
                 </div>
               )}
             </div>
          </div>
        </div>
      </div>

      {/* Security Alerts */}
      {securityAlerts.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Active Security Alerts</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {securityAlerts.filter(alert => !alert.acknowledged).map((alert) => (
                <div key={alert.id} className={`p-4 rounded-lg border-l-4 ${
                  alert.severity === 'critical' ? 'border-red-500 bg-red-50' :
                  alert.severity === 'high' ? 'border-orange-500 bg-orange-50' :
                  alert.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                  'border-blue-500 bg-blue-50'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">{alert.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                      <div className="mt-2">
                        <p className="text-xs text-gray-500">
                          {new Date(alert.timestamp).toLocaleString()} • {alert.type}
                        </p>
                        {alert.actions.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-gray-700 mb-1">Recommended Actions:</p>
                            <ul className="text-xs text-gray-600 space-y-1">
                              {alert.actions.map((action, index) => (
                                <li key={index} className="flex items-center space-x-2">
                                  <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                                  <span>{action}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        // TODO: Implement alert acknowledgment
                        console.log('Acknowledge alert:', alert.id);
                      }}
                      className="ml-4 px-3 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Acknowledge
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Security Events */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Security Events</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {recentEvents.map((event) => (
              <div key={event.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                {getSeverityIcon(event.severity)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{event.message}</p>
                  <p className="text-sm text-gray-500">
                    {event.eventType} • {event.source} • {new Date(event.timestamp).toLocaleString()}
                  </p>
                  {event.userId && (
                    <p className="text-sm text-gray-500">User: {event.userId}</p>
                  )}
                  {event.correlationId && (
                    <p className="text-sm text-gray-500">Correlation ID: {event.correlationId}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Compliance Tab Content
  const ComplianceTab = () => (
    <div className="space-y-6">
      {/* Compliance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DocumentTextIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">ISA-99/IEC 62443</h3>
              <p className={`text-2xl font-bold ${getComplianceColor(complianceStatus.isa99.status)}`}>
                {complianceStatus.isa99.score}%
              </p>
              <p className="text-sm text-gray-500 capitalize">{complianceStatus.isa99.status}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-gray-600">
            Industrial cybersecurity standard compliance for manufacturing systems
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <ShieldCheckIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">NIST Framework</h3>
              <p className={`text-2xl font-bold ${getComplianceColor(complianceStatus.nist.status)}`}>
                {complianceStatus.nist.score}%
              </p>
              <p className="text-sm text-gray-500 capitalize">{complianceStatus.nist.status}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-gray-600">
            Cybersecurity framework implementation status
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <UserGroupIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">GDPR</h3>
              <p className={`text-2xl font-bold ${getComplianceColor(complianceStatus.gdpr.status)}`}>
                {complianceStatus.gdpr.score}%
              </p>
              <p className="text-sm text-gray-500 capitalize">{complianceStatus.gdpr.status}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-gray-600">
            Data protection and privacy compliance
          </p>
        </div>
      </div>

      {/* Compliance Details */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Compliance Assessment Details</h3>
        </div>
        <div className="p-6">
          <div className="space-y-6">
            {/* ISA-99 Details */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">ISA-99/IEC 62443 Compliance</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Status:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getComplianceColor(complianceStatus.isa99.status)}`}>
                      {complianceStatus.isa99.status}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Score:</span>
                    <span className="ml-2">{complianceStatus.isa99.score}%</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Last Assessment:</span>
                    <span className="ml-2">{new Date(complianceStatus.isa99.lastAssessment).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Next Assessment:</span>
                    <span className="ml-2">Due in 30 days</span>
                  </div>
                </div>
              </div>
            </div>

            {/* NIST Details */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">NIST Cybersecurity Framework</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Status:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getComplianceColor(complianceStatus.nist.status)}`}>
                      {complianceStatus.nist.status}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Score:</span>
                    <span className="ml-2">{complianceStatus.nist.score}%</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Last Assessment:</span>
                    <span className="ml-2">{new Date(complianceStatus.nist.lastAssessment).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Next Assessment:</span>
                    <span className="ml-2">Due in 15 days</span>
                  </div>
                </div>
              </div>
            </div>

            {/* GDPR Details */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">GDPR Compliance</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Status:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getComplianceColor(complianceStatus.gdpr.status)}`}>
                      {complianceStatus.gdpr.status}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Score:</span>
                    <span className="ml-2">{complianceStatus.gdpr.score}%</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Last Assessment:</span>
                    <span className="ml-2">{new Date(complianceStatus.gdpr.lastAssessment).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Next Assessment:</span>
                    <span className="ml-2">Due in 45 days</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Analytics Tab Content
  const AnalyticsTab = () => (
    <div className="space-y-6">
      {/* Security Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircleIcon className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Critical Events</p>
              <p className="text-2xl font-bold text-red-600">{securityMetrics.criticalEvents}</p>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-500">Last 24 hours</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Warning Events</p>
              <p className="text-2xl font-bold text-yellow-600">{securityMetrics.warningEvents}</p>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-500">Last 24 hours</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ExclamationCircleIcon className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Error Events</p>
              <p className="text-2xl font-bold text-orange-600">{securityMetrics.errorEvents}</p>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-500">Last 24 hours</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <InformationCircleIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Info Events</p>
              <p className="text-2xl font-bold text-blue-600">{securityMetrics.infoEvents}</p>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-500">Last 24 hours</p>
        </div>
      </div>

      {/* Event Trends */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Security Event Trends</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <ArrowTrendingUpIcon className="w-5 h-5 text-red-500" />
                <span className="text-sm font-medium text-gray-900">Critical Events</span>
              </div>
              <span className="text-sm text-red-600">+2 from yesterday</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <ArrowTrendingDownIcon className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-gray-900">Warning Events</span>
              </div>
              <span className="text-sm text-green-600">-3 from yesterday</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <ArrowTrendingUpIcon className="w-5 h-5 text-orange-500" />
                <span className="text-sm font-medium text-gray-900">Error Events</span>
              </div>
              <span className="text-sm text-orange-600">+1 from yesterday</span>
            </div>
          </div>
        </div>
      </div>

      {/* Manufacturing Security Analytics */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Manufacturing Security Analytics</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Production Line Security</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Line 1 Security Score</span>
                  <span className="text-sm font-medium text-green-600">95%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Line 2 Security Score</span>
                  <span className="text-sm font-medium text-yellow-600">78%</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Equipment Security</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Overall Equipment Security</span>
                  <span className="text-sm font-medium text-green-600">87%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Critical Equipment</span>
                  <span className="text-sm font-medium text-red-600">1 device</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Settings Tab Content
  const SettingsTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Security Dashboard Settings</h3>
        </div>
        <div className="p-6">
          <div className="space-y-6">
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Update Frequency</h4>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="15">15 seconds</option>
                <option value="30" selected>30 seconds</option>
                <option value="60">1 minute</option>
                <option value="300">5 minutes</option>
              </select>
            </div>
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Alert Thresholds</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Critical Events</label>
                  <input type="number" className="w-full px-3 py-2 border border-gray-300 rounded-md" defaultValue="5" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Warning Events</label>
                  <input type="number" className="w-full px-3 py-2 border border-gray-300 rounded-md" defaultValue="20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Error Events</label>
                  <input type="number" className="w-full px-3 py-2 border border-gray-300 rounded-md" defaultValue="15" />
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Compliance Assessment Schedule</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ISA-99 Assessment</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option value="30">Monthly</option>
                    <option value="90" selected>Quarterly</option>
                    <option value="180">Semi-annually</option>
                    <option value="365">Annually</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NIST Assessment</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option value="30">Monthly</option>
                    <option value="90" selected>Quarterly</option>
                    <option value="180">Semi-annually</option>
                    <option value="365">Annually</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GDPR Assessment</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option value="90">Quarterly</option>
                    <option value="180" selected>Semi-annually</option>
                    <option value="365">Annually</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Security Dashboard</h1>
              <p className="text-sm text-gray-600">
                Manufacturing security monitoring and compliance tracking
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-xs text-gray-500">Last Updated</p>
                <p className="text-sm font-medium text-gray-900">
                  {lastUpdated.toLocaleTimeString()}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-green-400' : 
                    connectionStatus === 'error' ? 'bg-red-400' : 'bg-yellow-400'
                  }`}></div>
                  <span className="text-sm text-gray-600">
                    {connectionStatus === 'connected' ? 'Live' : 
                     connectionStatus === 'error' ? 'Error' : 'Connecting...'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <BellIcon className="w-5 h-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">
                    {securityAlerts.filter(alert => !alert.acknowledged).length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: EyeIcon },
              { id: 'compliance', name: 'Compliance', icon: DocumentTextIcon },
              { id: 'analytics', name: 'Analytics', icon: ChartBarIcon },
              { id: 'settings', name: 'Settings', icon: CogIcon }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading security dashboard...</p>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && <OverviewTab />}
            {activeTab === 'compliance' && <ComplianceTab />}
            {activeTab === 'analytics' && <AnalyticsTab />}
            {activeTab === 'settings' && <SettingsTab />}
          </>
        )}
      </div>
    </div>
  );
}
