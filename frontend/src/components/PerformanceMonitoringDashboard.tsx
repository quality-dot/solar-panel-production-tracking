import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

interface PerformanceMetrics {
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  fcp: number | null;
  ttfb: number | null;
  connectionQuality: string;
  connectionSpeed: number | null;
  lastUpdated: Date;
}

interface PerformanceAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: Date;
  resolved: boolean;
}

const PerformanceMonitoringDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    lcp: null,
    fid: null,
    cls: null,
    fcp: null,
    ttfb: null,
    connectionQuality: 'unknown',
    connectionSpeed: null,
    lastUpdated: new Date()
  });

  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitoringInterval, setMonitoringInterval] = useState<number | null>(null);

  const { pwaStatus, webVitals, syncStatus } = useNetworkStatus();

  // Web Vitals thresholds for production floor reliability
  const thresholds = {
    lcp: { good: 2500, poor: 4000 }, // Largest Contentful Paint (ms)
    fid: { good: 100, poor: 300 },   // First Input Delay (ms)
    cls: { good: 0.1, poor: 0.25 }, // Cumulative Layout Shift
    fcp: { good: 1800, poor: 3000 }, // First Contentful Paint (ms)
    ttfb: { good: 800, poor: 1800 }  // Time to First Byte (ms)
  };

  // Connection quality assessment
  const assessConnectionQuality = useCallback((effectiveType: string, downlink: number | null): string => {
    if (effectiveType === '4g' && downlink && downlink > 10) return 'excellent';
    if (effectiveType === '4g' && downlink && downlink > 5) return 'good';
    if (effectiveType === '3g' || (downlink && downlink > 2)) return 'fair';
    if (effectiveType === '2g' || (downlink && downlink <= 2)) return 'poor';
    return 'unknown';
  }, []);

  // Get connection information
  const getConnectionInfo = useCallback(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      const quality = assessConnectionQuality(connection.effectiveType, connection.downlink);
      return {
        quality,
        speed: connection.downlink,
        effectiveType: connection.effectiveType,
        rtt: connection.rtt
      };
    }
    return { quality: 'unknown', speed: null, effectiveType: 'unknown', rtt: null };
  }, [assessConnectionQuality]);

  // Measure Web Vitals
  const measureWebVitals = useCallback(() => {
    // LCP (Largest Contentful Paint)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as PerformanceEntry;
          if (lastEntry) {
            setMetrics(prev => ({ ...prev, lcp: lastEntry.startTime }));
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (error) {
        console.warn('LCP measurement failed:', error);
      }

      // FID (First Input Delay)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          if (lastEntry && lastEntry.processingStart) {
            setMetrics(prev => ({ ...prev, fid: lastEntry.processingStart - lastEntry.startTime }));
          }
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (error) {
        console.warn('FID measurement failed:', error);
      }

      // CLS (Cumulative Layout Shift)
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          setMetrics(prev => ({ ...prev, cls: clsValue }));
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('CLS measurement failed:', error);
      }
    }

    // FCP (First Contentful Paint) and TTFB
    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigationEntry) {
      setMetrics(prev => ({
        ...prev,
        fcp: navigationEntry.domContentLoadedEventEnd - navigationEntry.fetchStart,
        ttfb: navigationEntry.responseStart - navigationEntry.requestStart
      }));
    }
  }, []);

  // Generate performance alerts
  const generateAlerts = useCallback((currentMetrics: PerformanceMetrics) => {
    const newAlerts: PerformanceAlert[] = [];

    // LCP alerts
    if (currentMetrics.lcp && currentMetrics.lcp > thresholds.lcp.poor) {
      newAlerts.push({
        id: `lcp-${Date.now()}`,
        type: 'error',
        message: `Critical: Page loading very slow (LCP: ${currentMetrics.lcp.toFixed(0)}ms)`,
        timestamp: new Date(),
        resolved: false
      });
    } else if (currentMetrics.lcp && currentMetrics.lcp > thresholds.lcp.good) {
      newAlerts.push({
        id: `lcp-${Date.now()}`,
        type: 'warning',
        message: `Warning: Page loading slow (LCP: ${currentMetrics.lcp.toFixed(0)}ms)`,
        timestamp: new Date(),
        resolved: false
      });
    }

    // FID alerts
    if (currentMetrics.fid && currentMetrics.fid > thresholds.fid.poor) {
      newAlerts.push({
        id: `fid-${Date.now()}`,
        type: 'error',
        message: `Critical: User interactions very slow (FID: ${currentMetrics.fid.toFixed(0)}ms)`,
        timestamp: new Date(),
        resolved: false
      });
    }

    // Connection quality alerts
    if (currentMetrics.connectionQuality === 'poor') {
      newAlerts.push({
        id: `connection-${Date.now()}`,
        type: 'warning',
        message: 'Warning: Poor network connection detected - may affect production data sync',
        timestamp: new Date(),
        resolved: false
      });
    }

    // Add new alerts
    if (newAlerts.length > 0) {
      setAlerts(prev => [...prev, ...newAlerts]);
    }
  }, [thresholds]);

  // Start performance monitoring
  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    measureWebVitals();
    
    const interval = setInterval(() => {
      const connectionInfo = getConnectionInfo();
      setMetrics(prev => {
        const newMetrics = {
          ...prev,
          connectionQuality: connectionInfo.quality,
          connectionSpeed: connectionInfo.speed,
          lastUpdated: new Date()
        };
        
        // Generate alerts based on new metrics
        generateAlerts(newMetrics);
        
        return newMetrics;
      });
    }, 5000); // Update every 5 seconds

    setMonitoringInterval(interval);
  }, [measureWebVitals, getConnectionInfo, generateAlerts]);

  // Stop performance monitoring
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      setMonitoringInterval(null);
    }
  }, [monitoringInterval]);

  // Resolve alert
  const resolveAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, resolved: true } : alert
    ));
  }, []);

  // Clear resolved alerts
  const clearResolvedAlerts = useCallback(() => {
    setAlerts(prev => prev.filter(alert => !alert.resolved));
  }, []);

  // Performance score calculation
  const performanceScore = useMemo(() => {
    let score = 100;
    let factors = 0;

    if (metrics.lcp) {
      if (metrics.lcp > thresholds.lcp.poor) score -= 30;
      else if (metrics.lcp > thresholds.lcp.good) score -= 15;
      factors++;
    }

    if (metrics.fid) {
      if (metrics.fid > thresholds.fid.poor) score -= 25;
      else if (metrics.fid > thresholds.fid.good) score -= 10;
      factors++;
    }

    if (metrics.cls) {
      if (metrics.cls > thresholds.cls.poor) score -= 20;
      else if (metrics.cls > thresholds.cls.good) score -= 10;
      factors++;
    }

    if (metrics.connectionQuality === 'poor') score -= 20;
    else if (metrics.connectionQuality === 'fair') score -= 10;

    return factors > 0 ? Math.max(0, score) : 100;
  }, [metrics, thresholds]);

  // Performance status
  const performanceStatus = useMemo(() => {
    if (performanceScore >= 90) return { status: 'excellent', color: 'text-green-600', bgColor: 'bg-green-100' };
    if (performanceScore >= 70) return { status: 'good', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    if (performanceScore >= 50) return { status: 'fair', color: 'text-orange-600', bgColor: 'bg-orange-100' };
    return { status: 'poor', color: 'text-red-600', bgColor: 'bg-red-100' };
  }, [performanceScore]);

  useEffect(() => {
    // Start monitoring automatically
    startMonitoring();

    return () => {
      stopMonitoring();
    };
  }, []); // Empty dependency array - only run once on mount

  // Update metrics when webVitals change from hook
  useEffect(() => {
    if (webVitals) {
      setMetrics(prev => ({
        ...prev,
        lcp: webVitals.lcp || prev.lcp,
        fid: webVitals.fid || prev.fid,
        cls: webVitals.cls || prev.cls,
        fcp: webVitals.fcp || prev.fcp,
        ttfb: webVitals.ttfb || prev.ttfb
      }));
    }
  }, [webVitals]);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Production Performance Monitor</h1>
          <div className="flex items-center space-x-4">
            <div className={`px-4 py-2 rounded-full ${performanceStatus.bgColor}`}>
              <span className={`font-semibold ${performanceStatus.color}`}>
                {performanceStatus.status.toUpperCase()}
              </span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{performanceScore}</div>
              <div className="text-sm text-gray-500">Performance Score</div>
            </div>
          </div>
        </div>

        {/* Monitoring Controls */}
        <div className="flex items-center space-x-4 mb-6">
          <button
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            className={`px-4 py-2 rounded-lg font-medium ${
              isMonitoring 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          </button>
          <button
            onClick={clearResolvedAlerts}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium"
          >
            Clear Resolved Alerts
          </button>
          <div className="text-sm text-gray-500">
            Last updated: {metrics.lastUpdated.toLocaleTimeString()}
          </div>
        </div>

        {/* Performance Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Web Vitals */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Web Vitals</h3>
            <div className="space-y-3">
              <MetricItem
                label="LCP"
                value={metrics.lcp}
                unit="ms"
                threshold={thresholds.lcp}
                description="Largest Contentful Paint"
              />
              <MetricItem
                label="FID"
                value={metrics.fid}
                unit="ms"
                threshold={thresholds.fid}
                description="First Input Delay"
              />
              <MetricItem
                label="CLS"
                value={metrics.cls}
                unit=""
                threshold={thresholds.cls}
                description="Cumulative Layout Shift"
              />
              <MetricItem
                label="FCP"
                value={metrics.fcp}
                unit="ms"
                threshold={thresholds.fcp}
                description="First Contentful Paint"
              />
              <MetricItem
                label="TTFB"
                value={metrics.ttfb}
                unit="ms"
                threshold={thresholds.ttfb}
                description="Time to First Byte"
              />
            </div>
          </div>

          {/* Connection Quality */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Network Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Connection Quality:</span>
                <span className={`font-medium ${getConnectionQualityColor(metrics.connectionQuality)}`}>
                  {metrics.connectionQuality.toUpperCase()}
                </span>
              </div>
              {metrics.connectionSpeed && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Download Speed:</span>
                  <span className="font-medium">{metrics.connectionSpeed.toFixed(1)} Mbps</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">PWA Status:</span>
                <span className="font-medium text-blue-600">{pwaStatus?.isInstalled ? 'Installed' : 'Not Installed'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Sync Status:</span>
                <span className="font-medium text-blue-600">{typeof syncStatus === 'string' ? syncStatus : 'Unknown'}</span>
              </div>
            </div>
          </div>

          {/* Production Impact */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Production Impact</h3>
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                <div className="mb-2">This dashboard monitors system performance that affects production floor operations:</div>
                <ul className="list-disc list-inside space-y-1">
                  <li>Page loading speed (LCP)</li>
                  <li>User interaction responsiveness (FID)</li>
                  <li>Network connection quality</li>
                  <li>Data synchronization status</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Alerts */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Alerts</h3>
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No performance alerts at this time
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border-l-4 ${
                    alert.type === 'error' ? 'border-red-500 bg-red-50' :
                    alert.type === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                    'border-blue-500 bg-blue-50'
                  } ${alert.resolved ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{alert.message}</div>
                      <div className="text-sm text-gray-500">
                        {alert.timestamp.toLocaleString()}
                      </div>
                    </div>
                    {!alert.resolved && (
                      <button
                        onClick={() => resolveAlert(alert.id)}
                        className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Metric Item Component
interface MetricItemProps {
  label: string;
  value: number | null;
  unit: string;
  threshold: { good: number; poor: number };
  description: string;
}

const MetricItem: React.FC<MetricItemProps> = ({ label, value, unit, threshold, description }) => {
  const getStatus = (val: number | null) => {
    if (val === null) return 'unknown';
    if (val <= threshold.good) return 'good';
    if (val <= threshold.poor) return 'warning';
    return 'poor';
  };

  const status = getStatus(value);
  const statusColor = {
    good: 'text-green-600',
    warning: 'text-yellow-600',
    poor: 'text-red-600',
    unknown: 'text-gray-400'
  }[status];

  const statusBg = {
    good: 'bg-green-100',
    warning: 'bg-yellow-100',
    poor: 'bg-red-100',
    unknown: 'bg-gray-100'
  }[status];

  return (
    <div className="flex justify-between items-center">
      <div>
        <div className="text-sm text-gray-600">{label}</div>
        <div className="text-xs text-gray-400">{description}</div>
      </div>
      <div className="text-right">
        <div className={`font-medium ${statusColor}`}>
          {value !== null ? `${value.toFixed(value < 1 ? 3 : 0)}${unit}` : 'N/A'}
        </div>
        <div className={`text-xs px-2 py-1 rounded-full ${statusBg} ${statusColor}`}>
          {status.toUpperCase()}
        </div>
      </div>
    </div>
  );
};

// Helper function for connection quality colors
const getConnectionQualityColor = (quality: string) => {
  switch (quality) {
    case 'excellent': return 'text-green-600';
    case 'good': return 'text-blue-600';
    case 'fair': return 'text-yellow-600';
    case 'poor': return 'text-red-600';
    default: return 'text-gray-400';
  }
};

export default PerformanceMonitoringDashboard;
