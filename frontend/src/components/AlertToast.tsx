/**
 * Alert Toast Notification Component
 * Task: 22.6.6 - Implement alert display and notification system
 */

import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/outline';
import type { SecurityAlert } from '../services/alertService';

interface AlertToastProps {
  alert: SecurityAlert;
  onDismiss: (alertId: string) => void;
  onAcknowledge?: (alertId: string) => void;
  onResolve?: (alertId: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  duration?: number;
}

const AlertToast: React.FC<AlertToastProps> = ({
  alert,
  onDismiss,
  onAcknowledge,
  onResolve,
  position = 'top-right',
  duration = 5000
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (alert.severity === 'critical') return; // Critical alerts don't auto-dismiss

    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev - (100 / (duration / 100));
        if (newProgress <= 0) {
          setIsVisible(false);
          setTimeout(() => onDismiss(alert.id), 300);
          return 0;
        }
        return newProgress;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [alert.id, alert.severity, duration, onDismiss]);

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
        return <ExclamationCircleIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const getSeverityStyles = () => {
    switch (alert.severity) {
      case 'critical':
        return {
          container: 'bg-red-50 border-red-200 shadow-red-200',
          header: 'text-red-800',
          text: 'text-red-700',
          progress: 'bg-red-500'
        };
      case 'high':
        return {
          container: 'bg-orange-50 border-orange-200 shadow-orange-200',
          header: 'text-orange-800',
          text: 'text-orange-700',
          progress: 'bg-orange-500'
        };
      case 'medium':
        return {
          container: 'bg-yellow-50 border-yellow-200 shadow-yellow-200',
          header: 'text-yellow-800',
          text: 'text-yellow-700',
          progress: 'bg-yellow-500'
        };
      case 'low':
        return {
          container: 'bg-blue-50 border-blue-200 shadow-blue-200',
          header: 'text-blue-800',
          text: 'text-blue-700',
          progress: 'bg-blue-500'
        };
      default:
        return {
          container: 'bg-gray-50 border-gray-200 shadow-gray-200',
          header: 'text-gray-800',
          text: 'text-gray-700',
          progress: 'bg-gray-500'
        };
    }
  };

  const getPositionStyles = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      default:
        return 'top-4 right-4';
    }
  };

  const styles = getSeverityStyles();
  const positionStyles = getPositionStyles();

  if (!isVisible) return null;

  return (
    <div className={`fixed ${positionStyles} z-50 max-w-sm w-full`}>
      <div className={`border rounded-lg shadow-lg ${styles.container} ${
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
      } transition-all duration-300`}>
        {/* Progress Bar */}
        {alert.severity !== 'critical' && (
          <div className="h-1 bg-gray-200 rounded-t-lg overflow-hidden">
            <div 
              className={`h-full ${styles.progress} transition-all duration-100 ease-linear`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              {getSeverityIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h4 className={`text-sm font-semibold ${styles.header}`}>
                  {alert.title || alert.type.charAt(0).toUpperCase() + alert.type.slice(1)}
                </h4>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                  alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                  alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                  alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {alert.severity.toUpperCase()}
                </span>
              </div>
              <p className={`text-sm ${styles.text} mt-1 line-clamp-2`}>
                {alert.message}
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </span>
                <span className="text-xs text-gray-500">
                  {alert.category}
                </span>
              </div>
              
              {/* Action Buttons */}
              {alert.status === 'active' && (onAcknowledge || onResolve) && (
                <div className="flex items-center space-x-2 mt-3">
                  {onAcknowledge && (
                    <button
                      onClick={() => onAcknowledge(alert.id)}
                      className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Acknowledge
                    </button>
                  )}
                  {onResolve && (
                    <button
                      onClick={() => onResolve(alert.id)}
                      className="px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => {
                setIsVisible(false);
                setTimeout(() => onDismiss(alert.id), 300);
              }}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertToast;
