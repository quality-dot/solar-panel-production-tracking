import { useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Custom hook providing additional authentication utilities
 * Extends the base useAuth hook with convenience methods
 */
export const useAuthUtils = () => {
  const auth = useAuth();

  /**
   * Check if user has any of the specified roles
   */
  const hasAnyRole = useCallback((roles: NonNullable<typeof auth.user>['role'][]): boolean => {
    if (!auth.user) return false;
    return roles.includes(auth.user.role);
  }, [auth.user]);

  /**
   * Check if user has all of the specified roles (for future multi-role support)
   */
  const hasAllRoles = useCallback((roles: NonNullable<typeof auth.user>['role'][]): boolean => {
    if (!auth.user) return false;
    return roles.every(role => auth.hasRole(role));
  }, [auth.user, auth.hasRole]);

  /**
   * Check if user is a station inspector
   */
  const isStationInspector = useMemo(() => {
    return auth.user?.role === 'STATION_INSPECTOR';
  }, [auth.user?.role]);

  /**
   * Check if user is a production supervisor
   */
  const isProductionSupervisor = useMemo(() => {
    return auth.user?.role === 'PRODUCTION_SUPERVISOR';
  }, [auth.user?.role]);

  /**
   * Check if user is a QC manager
   */
  const isQCManager = useMemo(() => {
    return auth.user?.role === 'QC_MANAGER';
  }, [auth.user?.role]);

  /**
   * Check if user is a system admin
   */
  const isSystemAdmin = useMemo(() => {
    return auth.user?.role === 'SYSTEM_ADMIN';
  }, [auth.user?.role]);

  /**
   * Check if user has administrative privileges
   */
  const hasAdminPrivileges = useMemo(() => {
    return auth.user && ['QC_MANAGER', 'SYSTEM_ADMIN'].includes(auth.user.role);
  }, [auth.user]);

  /**
   * Check if user has supervisory privileges
   */
  const hasSupervisoryPrivileges = useMemo(() => {
    return auth.user && ['PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN'].includes(auth.user.role);
  }, [auth.user]);

  /**
   * Get user's display name (username or email fallback)
   */
  const userDisplayName = useMemo(() => {
    if (!auth.user) return '';
    return auth.user.username || auth.user.email.split('@')[0] || 'User';
  }, [auth.user]);

  /**
   * Get user's role display name
   */
  const userRoleDisplayName = useMemo(() => {
    if (!auth.user) return '';
    
    const roleNames = {
      'STATION_INSPECTOR': 'Station Inspector',
      'PRODUCTION_SUPERVISOR': 'Production Supervisor',
      'QC_MANAGER': 'Quality Control Manager',
      'SYSTEM_ADMIN': 'System Administrator',
    };
    
    return roleNames[auth.user.role] || auth.user.role;
  }, [auth.user]);

  /**
   * Get user's assigned stations as a formatted string
   */
  const assignedStationsDisplay = useMemo(() => {
    if (!auth.user) return '';
    
    if (auth.user.role === 'SYSTEM_ADMIN' || 
        auth.user.role === 'PRODUCTION_SUPERVISOR' || 
        auth.user.role === 'QC_MANAGER') {
      return 'All Stations';
    }
    
    if (auth.user.station_assignments.length === 0) {
      return 'No Stations Assigned';
    }
    
    return auth.user.station_assignments
      .sort((a, b) => a - b)
      .map(station => `Station ${station}`)
      .join(', ');
  }, [auth.user]);

  /**
   * Get user's login time as a formatted string
   */
  const loginTimeDisplay = useMemo(() => {
    if (!auth.user?.last_login) return 'Never';
    
    const loginDate = new Date(auth.user.last_login);
    const now = new Date();
    const diffMs = now.getTime() - loginDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return loginDate.toLocaleDateString();
  }, [auth.user?.last_login]);

  /**
   * Check if user can access a specific feature based on their role
   */
  const canAccessFeature = useCallback((feature: string): boolean => {
    if (!auth.user) return false;
    
    const featurePermissions = {
      'panel_scanning': true, // All authenticated users can scan panels
      'inspection_recording': true, // All authenticated users can record inspections
      'quality_reports': auth.user.role !== 'STATION_INSPECTOR', // Supervisors and above
      'production_monitoring': auth.user.role !== 'STATION_INSPECTOR', // Supervisors and above
      'user_management': ['QC_MANAGER', 'SYSTEM_ADMIN'].includes(auth.user.role), // Managers and above
      'station_configuration': ['QC_MANAGER', 'SYSTEM_ADMIN'].includes(auth.user.role), // Managers and above
      'audit_logs': ['QC_MANAGER', 'SYSTEM_ADMIN'].includes(auth.user.role), // Managers and above
      'system_configuration': auth.user.role === 'SYSTEM_ADMIN', // System admin only
    };
    
    return featurePermissions[feature as keyof typeof featurePermissions] || false;
  }, [auth.user]);

  /**
   * Get user's primary station (first assigned station or null)
   */
  const primaryStation = useMemo(() => {
    if (!auth.user || auth.user.station_assignments.length === 0) return null;
    return Math.min(...auth.user.station_assignments);
  }, [auth.user]);

  /**
   * Check if user is currently at their assigned station
   */
  const isAtAssignedStation = useCallback((currentStationId: number): boolean => {
    if (!auth.user) return false;
    
    // Admins and supervisors can access any station
    if (['SYSTEM_ADMIN', 'PRODUCTION_SUPERVISOR', 'QC_MANAGER'].includes(auth.user.role)) {
      return true;
    }
    
    // Station inspectors can only access assigned stations
    return auth.user.station_assignments.includes(currentStationId);
  }, [auth.user]);

  /**
   * Get user's session time remaining in minutes
   */
  const sessionTimeRemaining = useMemo(() => {
    if (!auth.tokens?.expiresAt) return 0;
    
    const now = Date.now();
    const expiresAt = auth.tokens.expiresAt.getTime();
    const remaining = expiresAt - now;
    
    return Math.max(0, Math.floor(remaining / (1000 * 60)));
  }, [auth.tokens?.expiresAt]);

  /**
   * Check if user's session is about to expire (within 5 minutes)
   */
  const isSessionExpiringSoon = useMemo(() => {
    return sessionTimeRemaining <= 5;
  }, [sessionTimeRemaining]);

  return {
    // Base auth functionality
    ...auth,
    
    // Role checking utilities
    hasAnyRole,
    hasAllRoles,
    isStationInspector,
    isProductionSupervisor,
    isQCManager,
    isSystemAdmin,
    hasAdminPrivileges,
    hasSupervisoryPrivileges,
    
    // User information utilities
    userDisplayName,
    userRoleDisplayName,
    assignedStationsDisplay,
    primaryStation,
    
    // Feature access utilities
    canAccessFeature,
    isAtAssignedStation,
    
    // Session utilities
    sessionTimeRemaining,
    isSessionExpiringSoon,
    loginTimeDisplay,
  };
};

export default useAuthUtils;
