/**
 * Alert Notification Component
 * Task: 22.6.6 - Implement alert display and notification system
 */

import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  CheckIcon, 
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  ShieldExclamationIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import type { SecurityAlert } from '../services/alertService';

interface AlertNotificationProps {
  alert: SecurityAlert;
  onAcknowledge: (alertId: string) => void;
  onDismiss: (alertId: string) => void;
  onResolve: (alertId: string) => void;
  autoHide?: boolean;
  autoHideDelay?: number;
}

const AlertNotification: React.FC<AlertNotificationProps> = ({
  alert,
  onAcknowledge,
  onDismiss,
  onResolve,
  autoHide = false,
  autoHideDelay = 5000
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (autoHide && alert.severity !== 'critical') {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onDismiss(alert.id), 300); // Allow animation to complete
      }, autoHideDelay);
      return () => clearTimeout(timer);
    }
  }, [autoHide, autoHideDelay, alert.id, alert.severity, onDismiss]);

  const getSeverityIcon = () => {
    switch (alert.severity) {
      case 'critical':
        return <ShieldExclamationIcon className="w-5 h-5 text-red-600" />;
      case 'high':
        return <ExclamationTriangleIcon className="w-5 h-5 text-orange-600" />;
      case 'medium':
        return <ExclamationCircleIcon className="w-5 h-5 text-yellow-600" />;
      case 'low':
        return <InformationCircleIcon className="w-5 h-5 text-blue-600" />;
      default:
        return <BellIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const getSeverityStyles = () => {
    switch (alert.severity) {
      case 'critical':
        return {
          container: 'bg-red-50 border-red-200 shadow-red-100',
          header: 'text-red-800',
          text: 'text-red-700',
          button: 'bg-red-600 hover:bg-red-700 text-white'
        };
      case 'high':
        return {
          container: 'bg-orange-50 border-orange-200 shadow-orange-100',
          header: 'text-orange-800',
          text: 'text-orange-700',
          button: 'bg-orange-600 hover:bg-orange-700 text-white'
        };
      case 'medium':
        return {
          container: 'bg-yellow-50 border-yellow-200 shadow-yellow-100',
          header: 'text-yellow-800',
          text: 'text-yellow-700',
          button: 'bg-yellow-600 hover:bg-yellow-700 text-white'
        };
      case 'low':
        return {
          container: 'bg-blue-50 border-blue-200 shadow-blue-100',
          header: 'text-blue-800',
          text: 'text-blue-700',
          button: 'bg-blue-600 hover:bg-blue-700 text-white'
        };
      default:
        return {
          container: 'bg-gray-50 border-gray-200 shadow-gray-100',
          header: 'text-gray-800',
          text: 'text-gray-700',
          button: 'bg-gray-600 hover:bg-gray-700 text-white'
        };
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const styles = getSeverityStyles();

  if (!isVisible) return null;

  return (
    <div className={`relative border rounded-lg shadow-sm transition-all duration-300 ${styles.container} ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between p-4">
        <div className="flex items-start space-x-3 flex-1">
          <div className="flex-shrink-0 mt-0.5">
            {getSeverityIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h4 className={`text-sm font-semibold ${styles.header}`}>
                {alert.title || alert.type.charAt(0).toUpperCase() + alert.type.slice(1)} Alert
              </h4>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {alert.severity.toUpperCase()}
              </span>
            </div>
            <p className={`text-sm ${styles.text} mt-1`}>
              {alert.message}
            </p>
            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
              <span>{formatTimestamp(alert.timestamp)}</span>
              <span>•</span>
              <span>{alert.category}</span>
              <span>•</span>
              <span>{alert.source}</span>
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center space-x-2 ml-4">
          {alert.status === 'active' && (
            <>
              <button
                onClick={() => onAcknowledge(alert.id)}
                className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
                title="Acknowledge"
              >
                <CheckIcon className="w-4 h-4 mr-1" />
                Ack
              </button>
              <button
                onClick={() => onResolve(alert.id)}
                className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${styles.button} transition-colors`}
                title="Resolve"
              >
                Resolve
              </button>
            </>
          )}
          <button
            onClick={() => onDismiss(alert.id)}
            className="inline-flex items-center p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Dismiss"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expandable Details */}
      {alert.actions && alert.actions.length > 0 && (
        <div className="border-t border-gray-200">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full px-4 py-2 text-left text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            {isExpanded ? 'Hide' : 'Show'} Recommended Actions ({alert.actions.length})
          </button>
          {isExpanded && (
            <div className="px-4 pb-4">
              <ul className="space-y-2">
                {alert.actions.map((action, index) => (
                  <li key={index} className="flex items-start space-x-2 text-sm text-gray-700">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Context Information */}
      {alert.context && Object.keys(alert.context).length > 0 && (
        <div className="border-t border-gray-200 px-4 py-2">
          <details className="text-xs">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
              Technical Details
            </summary>
            <pre className="mt-2 text-xs text-gray-500 bg-gray-100 p-2 rounded overflow-x-auto">
              {JSON.stringify(alert.context, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default AlertNotification;
