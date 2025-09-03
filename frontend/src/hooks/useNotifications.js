// Notifications hook for manufacturing system
// Manages toast notifications and alerts

import { useState, useContext, createContext } from 'react';

// Create notifications context
const NotificationsContext = createContext();

// Notification provider component
export const NotificationsProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const showNotification = (message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    const notification = {
      id,
      message,
      type,
      duration,
      timestamp: new Date()
    };

    setNotifications(prev => [...prev, notification]);

    // Auto-remove notification after duration
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const showSuccess = (message, duration) => {
    return showNotification(message, 'success', duration);
  };

  const showError = (message, duration) => {
    return showNotification(message, 'error', duration);
  };

  const showWarning = (message, duration) => {
    return showNotification(message, 'warning', duration);
  };

  const showInfo = (message, duration) => {
    return showNotification(message, 'info', duration);
  };

  const value = {
    notifications,
    showNotification,
    removeNotification,
    clearAllNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      <NotificationContainer />
    </NotificationsContext.Provider>
  );
};

// Notification container component
const NotificationContainer = () => {
  const { notifications, removeNotification } = useNotifications();

  return (
    <div className="notification-container">
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={removeNotification}
        />
      ))}
    </div>
  );
};

// Individual notification component
const NotificationItem = ({ notification, onRemove }) => {
  const { id, message, type, timestamp } = notification;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: '#48bb78',
          borderColor: '#38a169',
          icon: '✅'
        };
      case 'error':
        return {
          backgroundColor: '#f56565',
          borderColor: '#e53e3e',
          icon: '❌'
        };
      case 'warning':
        return {
          backgroundColor: '#ed8936',
          borderColor: '#dd6b20',
          icon: '⚠️'
        };
      case 'info':
      default:
        return {
          backgroundColor: '#4299e1',
          borderColor: '#3182ce',
          icon: 'ℹ️'
        };
    }
  };

  const typeStyles = getTypeStyles();

  return (
    <div
      className="notification-item"
      style={{
        backgroundColor: typeStyles.backgroundColor,
        borderColor: typeStyles.borderColor
      }}
    >
      <div className="notification-content">
        <span className="notification-icon">{typeStyles.icon}</span>
        <div className="notification-text">
          <p className="notification-message">{message}</p>
          <p className="notification-time">
            {timestamp.toLocaleTimeString()}
          </p>
        </div>
      </div>
      <button
        className="notification-close"
        onClick={() => onRemove(id)}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
};

// Custom hook to use notifications context
export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};

export default useNotifications;
