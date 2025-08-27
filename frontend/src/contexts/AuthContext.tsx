import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';

// Types for authentication
export interface User {
  id: string;
  username: string;
  email: string;
  role: 'STATION_INSPECTOR' | 'PRODUCTION_SUPERVISOR' | 'QC_MANAGER' | 'SYSTEM_ADMIN';
  station_assignments: number[];
  is_active: boolean;
  created_at: string;
  last_login: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  login: (username: string, password: string, stationId?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  clearError: () => void;
  hasRole: (requiredRole: User['role']) => boolean;
  hasStationAccess: (stationId: number) => boolean;
  hasPermission: (permission: string) => boolean;
}

// Action types for reducer
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; tokens: AuthTokens } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'TOKEN_REFRESH'; payload: { tokens: AuthTokens } }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_LOADING'; payload: boolean };

// Initial state
const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Reducer for authentication state
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        tokens: action.payload.tokens,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'AUTH_LOGOUT':
      return {
        ...state,
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'TOKEN_REFRESH':
      return {
        ...state,
        tokens: action.payload.tokens,
        error: null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  
  // Refs for stable references and cleanup
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  // Check if user has specific role
  const hasRole = useCallback((requiredRole: User['role']): boolean => {
    if (!state.user) return false;
    
    const roleHierarchy = {
      'STATION_INSPECTOR': 1,
      'PRODUCTION_SUPERVISOR': 2,
      'QC_MANAGER': 3,
      'SYSTEM_ADMIN': 4,
    };
    
    return roleHierarchy[state.user.role] >= roleHierarchy[requiredRole];
  }, [state.user]);

  // Check if user has access to specific station
  const hasStationAccess = useCallback((stationId: number): boolean => {
    if (!state.user) return false;
    
    // System admins and supervisors have access to all stations
    if (['SYSTEM_ADMIN', 'PRODUCTION_SUPERVISOR'].includes(state.user.role)) {
      return true;
    }
    
    // QC managers have access to all stations
    if (state.user.role === 'QC_MANAGER') {
      return true;
    }
    
    // Station inspectors only have access to assigned stations
    return state.user.station_assignments.includes(stationId);
  }, [state.user]);

  // Check if user has specific permission
  const hasPermission = useCallback((permission: string): boolean => {
    if (!state.user) return false;
    
    // Define permission matrix
    const permissions = {
      'STATION_INSPECTOR': [
        'scan_panels',
        'record_inspections',
        'view_assigned_stations',
        'update_panel_status'
      ],
      'PRODUCTION_SUPERVISOR': [
        'scan_panels',
        'record_inspections',
        'view_all_stations',
        'update_panel_status',
        'manage_orders',
        'view_reports'
      ],
      'QC_MANAGER': [
        'scan_panels',
        'record_inspections',
        'view_all_stations',
        'update_panel_status',
        'manage_orders',
        'view_reports',
        'manage_users',
        'configure_stations',
        'view_audit_logs'
      ],
      'SYSTEM_ADMIN': [
        'scan_panels',
        'record_inspections',
        'view_all_stations',
        'update_panel_status',
        'manage_orders',
        'view_reports',
        'manage_users',
        'configure_stations',
        'view_audit_logs',
        'system_configuration',
        'database_management'
      ]
    };
    
    return permissions[state.user.role]?.includes(permission) || false;
  }, [state.user]);

  // Login function
  const login = useCallback(async (username: string, password: string, stationId?: string): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, stationId }),
        credentials: 'include', // Include cookies for refresh token
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await response.json();
      
      if (!isMountedRef.current) return;

      // Extract user and tokens from response
      const { user, tokens, permissions } = data.data;
      
      // Create tokens object with expiration
      const authTokens: AuthTokens = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(tokens.expiresAt || Date.now() + 15 * 60 * 1000), // 15 minutes default
      };

      dispatch({ 
        type: 'AUTH_SUCCESS', 
        payload: { user, tokens: authTokens } 
      });

      // Schedule token refresh
      scheduleTokenRefresh(authTokens.expiresAt);
      
    } catch (error) {
      if (!isMountedRef.current) return;
      
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
    }
  }, []);

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    try {
      if (state.tokens?.accessToken) {
        // Call logout endpoint to invalidate token
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${state.tokens.accessToken}`,
          },
          credentials: 'include',
        });
      }
    } catch (error) {
      // Log error but continue with logout
      console.error('Logout API call failed:', error);
    } finally {
      // Clear refresh timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      
      // Clear state
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  }, [state.tokens]);

  // Refresh token function
  const refreshToken = useCallback(async (): Promise<void> => {
    try {
      if (!state.tokens?.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: state.tokens.refreshToken }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      
      if (!isMountedRef.current) return;

      const { tokens } = data.data;
      
      const newTokens: AuthTokens = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(tokens.expiresAt || Date.now() + 15 * 60 * 1000),
      };

      dispatch({ type: 'TOKEN_REFRESH', payload: { tokens: newTokens } });
      
      // Schedule next refresh
      scheduleTokenRefresh(newTokens.expiresAt);
      
    } catch (error) {
      if (!isMountedRef.current) return;
      
      // If refresh fails, logout user
      console.error('Token refresh failed:', error);
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  }, [state.tokens]);

  // Schedule token refresh
  const scheduleTokenRefresh = useCallback((expiresAt: Date) => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    const now = Date.now();
    const expiresAtMs = expiresAt.getTime();
    const timeUntilExpiry = expiresAtMs - now;
    
    // Refresh token 2 minutes before expiration
    const refreshTime = Math.max(timeUntilExpiry - (2 * 60 * 1000), 1000);
    
    refreshTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        refreshToken();
      }
    }, refreshTime);
  }, [refreshToken]);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        // Check if we have a valid token in memory
        if (state.tokens?.accessToken) {
          // Verify token with backend
          const response = await fetch('/api/v1/auth/me', {
            headers: {
              'Authorization': `Bearer ${state.tokens.accessToken}`,
            },
            credentials: 'include',
          });

          if (response.ok) {
            const data = await response.json();
            // Token is still valid, schedule refresh
            if (state.tokens.expiresAt) {
              scheduleTokenRefresh(state.tokens.expiresAt);
            }
          } else {
            // Token is invalid, try to refresh
            await refreshToken();
          }
        }
      } catch (error) {
        // Session check failed, user needs to login
        console.error('Session check failed:', error);
      }
    };

    checkExistingSession();
  }, [state.tokens, refreshToken, scheduleTokenRefresh]);

  // Context value
  const contextValue: AuthContextType = {
    ...state,
    login,
    logout,
    refreshToken,
    clearError,
    hasRole,
    hasStationAccess,
    hasPermission,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export types for use in other components
export type { AuthState, AuthTokens, User };
