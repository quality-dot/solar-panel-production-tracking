/**
 * Alert Manager Component
 * Task: 22.6.6 - Implement alert display and notification system
 */

import React, { useState, useEffect, useCallback } from 'react';
import AlertToast from './AlertToast';
import type { SecurityAlert } from '../services/alertService';

interface AlertManagerProps {
  alerts: SecurityAlert[];
  onAcknowledge: (alertId: string) => void;
  onResolve: (alertId: string) => void;
  onDismiss: (alertId: string) => void;
  maxToasts?: number;
  toastDuration?: number;
  toastPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

const AlertManager: React.FC<AlertManagerProps> = ({
  alerts,
  onAcknowledge,
  onResolve,
  onDismiss,
  maxToasts = 3,
  toastDuration = 5000,
  toastPosition = 'top-right'
}) => {
  const [activeToasts, setActiveToasts] = useState<SecurityAlert[]>([]);
  const [dismissedToasts, setDismissedToasts] = useState<Set<string>>(new Set());

  // Filter alerts for toast notifications
  const getToastAlerts = useCallback(() => {
    return alerts
      .filter(alert => 
        alert.status === 'active' && 
        !dismissedToasts.has(alert.id) &&
        !activeToasts.some(toast => toast.id === alert.id)
      )
      .sort((a, b) => {
        // Sort by severity: critical > high > medium > low
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return (severityOrder[b.severity as keyof typeof severityOrder] || 0) - 
               (severityOrder[a.severity as keyof typeof severityOrder] || 0);
      })
      .slice(0, maxToasts);
  }, [alerts, dismissedToasts, activeToasts, maxToasts]);

  // Update active toasts when new alerts arrive
  useEffect(() => {
    const newToastAlerts = getToastAlerts();
    if (newToastAlerts.length > 0) {
      setActiveToasts(prev => [...prev, ...newToastAlerts]);
    }
  }, [getToastAlerts]);

  // Clean up dismissed toasts
  useEffect(() => {
    setActiveToasts(prev => prev.filter(toast => !dismissedToasts.has(toast.id)));
  }, [dismissedToasts]);

  const handleToastDismiss = useCallback((alertId: string) => {
    setDismissedToasts(prev => new Set([...prev, alertId]));
    setActiveToasts(prev => prev.filter(toast => toast.id !== alertId));
    onDismiss(alertId);
  }, [onDismiss]);

  const handleToastAcknowledge = useCallback((alertId: string) => {
    onAcknowledge(alertId);
    handleToastDismiss(alertId);
  }, [onAcknowledge, handleToastDismiss]);

  const handleToastResolve = useCallback((alertId: string) => {
    onResolve(alertId);
    handleToastDismiss(alertId);
  }, [onResolve, handleToastDismiss]);

  // Play notification sound for critical alerts
  useEffect(() => {
    const criticalAlerts = alerts.filter(alert => 
      alert.severity === 'critical' && 
      alert.status === 'active' &&
      !dismissedToasts.has(alert.id)
    );

    if (criticalAlerts.length > 0) {
      // Play notification sound (if browser supports it)
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
        audio.volume = 0.3;
        audio.play().catch(() => {
          // Ignore errors if audio can't play
        });
      } catch (error) {
        // Ignore audio errors
      }
    }
  }, [alerts, dismissedToasts]);

  // Request browser notification permission and show notifications
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const criticalAlerts = alerts.filter(alert => 
      alert.severity === 'critical' && 
      alert.status === 'active' &&
      !dismissedToasts.has(alert.id)
    );

    if (criticalAlerts.length > 0 && Notification.permission === 'granted') {
      criticalAlerts.forEach(alert => {
        new Notification(`Critical Security Alert: ${alert.title || alert.type}`, {
          body: alert.message,
          icon: '/favicon.ico',
          tag: alert.id,
          requireInteraction: true,
          silent: false
        });
      });
    }
  }, [alerts, dismissedToasts]);

  return (
    <div className="alert-manager">
      {activeToasts.map((alert, index) => (
        <div
          key={alert.id}
          className="toast-container"
          style={{
            transform: `translateY(${index * 10}px)`,
            zIndex: 1000 - index
          }}
        >
          <AlertToast
            alert={alert}
            onDismiss={handleToastDismiss}
            onAcknowledge={handleToastAcknowledge}
            onResolve={handleToastResolve}
            position={toastPosition}
            duration={toastDuration}
          />
        </div>
      ))}
    </div>
  );
};

export default AlertManager;
