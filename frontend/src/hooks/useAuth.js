// Authentication hook for manufacturing system
// Manages user authentication state and operations

import { useState, useEffect, useContext, createContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/apiClient';
import { useNotifications } from './useNotifications';

// Create authentication context
const AuthContext = createContext();

// Authentication provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [tokens, setTokens] = useState(null);

  const navigate = useNavigate();
  const { showNotification } = useNotifications();

  // Initialize authentication state
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const storedTokens = localStorage.getItem('auth_tokens');
      const storedUser = localStorage.getItem('auth_user');

      if (storedTokens && storedUser) {
        const parsedTokens = JSON.parse(storedTokens);
        const parsedUser = JSON.parse(storedUser);

        // Validate tokens are not expired
        if (parsedTokens.accessToken && !isTokenExpired(parsedTokens.accessToken)) {
          setTokens(parsedTokens);
          setUser(parsedUser);
          setIsAuthenticated(true);
          
          // Set default authorization header
          apiClient.setAuthToken(parsedTokens.accessToken);
        } else {
          // Tokens expired, clear storage
          clearAuthData();
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      clearAuthData();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      setIsLoading(true);
      
      const response = await apiClient.post('/auth/login', credentials);
      
      if (response.success) {
        const { user: userData, tokens: tokenData, session } = response.data;
        
        // Store authentication data
        setUser(userData);
        setTokens(tokenData);
        setIsAuthenticated(true);
        
        // Store in localStorage
        localStorage.setItem('auth_tokens', JSON.stringify(tokenData));
        localStorage.setItem('auth_user', JSON.stringify(userData));
        
        // Set authorization header
        apiClient.setAuthToken(tokenData.accessToken);
        
        // Store session info if available
        if (session) {
          localStorage.setItem('auth_session', JSON.stringify(session));
        }
        
        return { success: true, data: response.data };
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle specific error types
      if (error.response?.data?.error) {
        const errorData = error.response.data.error;
        throw {
          message: errorData.message || 'Login failed',
          reason: errorData.reason,
          lockoutUntil: errorData.lockoutUntil
        };
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const sessionData = localStorage.getItem('auth_session');
      
      if (sessionData && tokens) {
        const session = JSON.parse(sessionData);
        
        // Call logout endpoint with session ID
        await apiClient.post('/auth/logout', {
          sessionId: session.sessionId
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with logout even if API call fails
    } finally {
      // Clear authentication data
      clearAuthData();
      showNotification('You have been logged out successfully.', 'info');
      navigate('/login');
    }
  };

  const refreshToken = async () => {
    try {
      if (!tokens?.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await apiClient.post('/auth/refresh', {
        refreshToken: tokens.refreshToken
      });

      if (response.success) {
        const newTokens = response.data.tokens;
        setTokens(newTokens);
        localStorage.setItem('auth_tokens', JSON.stringify(newTokens));
        apiClient.setAuthToken(newTokens.accessToken);
        
        return newTokens;
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      clearAuthData();
      navigate('/login');
      throw error;
    }
  };

  const clearAuthData = () => {
    setUser(null);
    setTokens(null);
    setIsAuthenticated(false);
    
    // Clear localStorage
    localStorage.removeItem('auth_tokens');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_session');
    
    // Clear authorization header
    apiClient.clearAuthToken();
  };

  const isTokenExpired = (token) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      return true; // Consider invalid tokens as expired
    }
  };

  const hasRole = (requiredRole) => {
    if (!user) return false;
    
    // Define role hierarchy
    const roleHierarchy = {
      'STATION_INSPECTOR': 1,
      'PRODUCTION_SUPERVISOR': 2,
      'QC_MANAGER': 3,
      'SYSTEM_ADMIN': 4
    };
    
    const userRoleLevel = roleHierarchy[user.role] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0;
    
    return userRoleLevel >= requiredRoleLevel;
  };

  const hasAnyRole = (roles) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const canAccessStation = (stationId) => {
    if (!user) return false;
    
    // System admins and QC managers can access all stations
    if (['SYSTEM_ADMIN', 'QC_MANAGER'].includes(user.role)) {
      return true;
    }
    
    // Check if user has access to specific station
    if (user.stationAccess && Array.isArray(user.stationAccess)) {
      return user.stationAccess.includes(stationId);
    }
    
    return false;
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('auth_user', JSON.stringify(updatedUser));
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    tokens,
    login,
    logout,
    refreshToken,
    hasRole,
    hasAnyRole,
    canAccessStation,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use authentication context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default useAuth;
