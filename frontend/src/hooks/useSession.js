// Session management hook for manufacturing system
// Manages user sessions and session-related operations

import { useState, useEffect, useContext, createContext } from 'react';
import { apiClient } from '../services/apiClient';
import { useNotifications } from './useNotifications';

// Create session context
const SessionContext = createContext();

// Session provider component
export const SessionProvider = ({ children }) => {
  const [currentSession, setCurrentSession] = useState(null);
  const [userSessions, setUserSessions] = useState([]);
  const [sessionStats, setSessionStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const { showNotification } = useNotifications();

  // Initialize session from localStorage
  useEffect(() => {
    const storedSession = localStorage.getItem('auth_session');
    if (storedSession) {
      try {
        setCurrentSession(JSON.parse(storedSession));
      } catch (error) {
        console.error('Error parsing stored session:', error);
        localStorage.removeItem('auth_session');
      }
    }
  }, []);

  const createSession = async (sessionData) => {
    try {
      setCurrentSession(sessionData);
      localStorage.setItem('auth_session', JSON.stringify(sessionData));
      
      showNotification('Session created successfully', 'success');
      return sessionData;
    } catch (error) {
      console.error('Error creating session:', error);
      showNotification('Failed to create session', 'error');
      throw error;
    }
  };

  const getSessionInfo = async (sessionId) => {
    try {
      setIsLoading(true);
      
      const response = await apiClient.get(`/auth/sessions/${sessionId}`);
      
      if (response.success) {
        return response.data.session;
      } else {
        throw new Error(response.message || 'Failed to get session info');
      }
    } catch (error) {
      console.error('Error getting session info:', error);
      showNotification('Failed to get session information', 'error');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getUserSessions = async (userId) => {
    try {
      setIsLoading(true);
      
      const response = await apiClient.get(`/auth/sessions/user/${userId}`);
      
      if (response.success) {
        setUserSessions(response.data.sessions);
        return response.data.sessions;
      } else {
        throw new Error(response.message || 'Failed to get user sessions');
      }
    } catch (error) {
      console.error('Error getting user sessions:', error);
      showNotification('Failed to get user sessions', 'error');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const invalidateSession = async (sessionId, reason = 'manual_logout') => {
    try {
      setIsLoading(true);
      
      const response = await apiClient.delete(`/auth/sessions/${sessionId}`, {
        reason
      });
      
      if (response.success) {
        // Remove from user sessions if it exists
        setUserSessions(prev => prev.filter(session => session.sessionId !== sessionId));
        
        // If it's the current session, clear it
        if (currentSession?.sessionId === sessionId) {
          setCurrentSession(null);
          localStorage.removeItem('auth_session');
        }
        
        showNotification('Session invalidated successfully', 'success');
        return true;
      } else {
        throw new Error(response.message || 'Failed to invalidate session');
      }
    } catch (error) {
      console.error('Error invalidating session:', error);
      showNotification('Failed to invalidate session', 'error');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const invalidateAllUserSessions = async (userId, reason = 'admin_force_logout') => {
    try {
      setIsLoading(true);
      
      const response = await apiClient.delete(`/auth/sessions/user/${userId}/all`, {
        reason,
        excludeCurrentSession: true
      });
      
      if (response.success) {
        const invalidatedCount = response.data.invalidatedCount;
        
        // Clear user sessions
        setUserSessions([]);
        
        // If current user's sessions were invalidated, clear current session
        if (currentSession?.userId === userId) {
          setCurrentSession(null);
          localStorage.removeItem('auth_session');
        }
        
        showNotification(`Invalidated ${invalidatedCount} sessions successfully`, 'success');
        return invalidatedCount;
      } else {
        throw new Error(response.message || 'Failed to invalidate all sessions');
      }
    } catch (error) {
      console.error('Error invalidating all sessions:', error);
      showNotification('Failed to invalidate all sessions', 'error');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getSessionStatistics = async () => {
    try {
      setIsLoading(true);
      
      const response = await apiClient.get('/auth/sessions/statistics');
      
      if (response.success) {
        setSessionStats(response.data.statistics);
        return response.data.statistics;
      } else {
        throw new Error(response.message || 'Failed to get session statistics');
      }
    } catch (error) {
      console.error('Error getting session statistics:', error);
      showNotification('Failed to get session statistics', 'error');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const checkTokenBlacklist = async (token) => {
    try {
      const response = await apiClient.post('/auth/sessions/check-token', {
        token
      });
      
      if (response.success) {
        return response.data.isBlacklisted;
      } else {
        throw new Error(response.message || 'Failed to check token blacklist');
      }
    } catch (error) {
      console.error('Error checking token blacklist:', error);
      throw error;
    }
  };

  const forceCleanup = async () => {
    try {
      setIsLoading(true);
      
      const response = await apiClient.post('/auth/sessions/cleanup');
      
      if (response.success) {
        showNotification('Session cleanup completed successfully', 'success');
        return true;
      } else {
        throw new Error(response.message || 'Failed to cleanup sessions');
      }
    } catch (error) {
      console.error('Error forcing cleanup:', error);
      showNotification('Failed to cleanup sessions', 'error');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getSessionConfig = async () => {
    try {
      const response = await apiClient.get('/auth/sessions/config');
      
      if (response.success) {
        return response.data.configuration;
      } else {
        throw new Error(response.message || 'Failed to get session configuration');
      }
    } catch (error) {
      console.error('Error getting session config:', error);
      throw error;
    }
  };

  const clearCurrentSession = () => {
    setCurrentSession(null);
    localStorage.removeItem('auth_session');
  };

  const updateCurrentSession = (updates) => {
    if (currentSession) {
      const updatedSession = { ...currentSession, ...updates };
      setCurrentSession(updatedSession);
      localStorage.setItem('auth_session', JSON.stringify(updatedSession));
    }
  };

  const isSessionExpired = () => {
    if (!currentSession?.expiresAt) return false;
    return new Date() > new Date(currentSession.expiresAt);
  };

  const getSessionTimeRemaining = () => {
    if (!currentSession?.expiresAt) return 0;
    const now = new Date();
    const expires = new Date(currentSession.expiresAt);
    return Math.max(0, expires.getTime() - now.getTime());
  };

  const formatSessionDuration = (milliseconds) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const value = {
    currentSession,
    userSessions,
    sessionStats,
    isLoading,
    createSession,
    getSessionInfo,
    getUserSessions,
    invalidateSession,
    invalidateAllUserSessions,
    getSessionStatistics,
    checkTokenBlacklist,
    forceCleanup,
    getSessionConfig,
    clearCurrentSession,
    updateCurrentSession,
    isSessionExpired,
    getSessionTimeRemaining,
    formatSessionDuration
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};

// Custom hook to use session context
export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

export default useSession;
