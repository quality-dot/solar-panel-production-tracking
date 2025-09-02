/**
 * React hook for Role-Based Access Control (RBAC)
 * Provides easy access to RBAC functionality in React components
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { rbacService, User, UserRole, Permission } from '../services/rbacService';

export interface UseRBACReturn {
  // User state
  currentUser: User | null;
  isAuthenticated: boolean;
  userRole: UserRole | null;
  userPermissions: Permission[];
  userRoleLevel: number;

  // Permission checks
  hasPermission: (permissionId: string, resource?: string, action?: string) => boolean;
  hasAnyPermission: (permissionIds: string[]) => boolean;
  hasAllPermissions: (permissionIds: string[]) => boolean;
  canAccessFeature: (feature: string) => boolean;
  canPerformAction: (resource: string, action: string) => boolean;

  // Role checks
  hasRole: (roleId: string) => boolean;
  hasMinimumRoleLevel: (level: number) => boolean;
  isAdmin: () => boolean;
  isAnalystOrHigher: () => boolean;
  isOperatorOrHigher: () => boolean;

  // User management
  setCurrentUser: (user: User) => void;
  clearCurrentUser: () => void;
  updateUserRole: (roleId: string) => void;

  // Available data
  availableRoles: UserRole[];
  getRoleById: (roleId: string) => UserRole | undefined;

  // Utility functions
  filterDataByPermissions: <T>(data: T[], permissionCheck: (item: T) => boolean) => T[];
  logAccessAttempt: (resource: string, action: string, success: boolean) => void;
}

export const useRBAC = (): UseRBACReturn => {
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Initialize RBAC service with current user
  useEffect(() => {
    const user = rbacService.getCurrentUser();
    if (user) {
      setCurrentUserState(user);
      setIsAuthenticated(true);
    }
  }, []);

  // Permission check functions
  const hasPermission = useCallback((permissionId: string, resource?: string, action?: string): boolean => {
    return rbacService.hasPermission(permissionId, resource, action);
  }, []);

  const hasAnyPermission = useCallback((permissionIds: string[]): boolean => {
    return rbacService.hasAnyPermission(permissionIds);
  }, []);

  const hasAllPermissions = useCallback((permissionIds: string[]): boolean => {
    return rbacService.hasAllPermissions(permissionIds);
  }, []);

  const canAccessFeature = useCallback((feature: string): boolean => {
    return rbacService.canAccessFeature(feature);
  }, []);

  const canPerformAction = useCallback((resource: string, action: string): boolean => {
    return rbacService.canPerformAction(resource, action);
  }, []);

  // Role check functions
  const hasRole = useCallback((roleId: string): boolean => {
    return rbacService.hasRole(roleId);
  }, []);

  const hasMinimumRoleLevel = useCallback((level: number): boolean => {
    return rbacService.hasMinimumRoleLevel(level);
  }, []);

  const isAdmin = useCallback((): boolean => {
    return rbacService.isAdmin();
  }, []);

  const isAnalystOrHigher = useCallback((): boolean => {
    return rbacService.isAnalystOrHigher();
  }, []);

  const isOperatorOrHigher = useCallback((): boolean => {
    return rbacService.isOperatorOrHigher();
  }, []);

  // User management functions
  const setCurrentUser = useCallback((user: User): void => {
    rbacService.setCurrentUser(user);
    setCurrentUserState(user);
    setIsAuthenticated(true);
  }, []);

  const clearCurrentUser = useCallback((): void => {
    rbacService.setCurrentUser(null as any);
    setCurrentUserState(null);
    setIsAuthenticated(false);
  }, []);

  const updateUserRole = useCallback((roleId: string): void => {
    if (!currentUser) return;

    const newRole = rbacService.getRoleById(roleId);
    if (newRole) {
      const updatedUser: User = {
        ...currentUser,
        role: newRole
      };
      setCurrentUser(updatedUser);
    }
  }, [currentUser, setCurrentUser]);

  // Utility functions
  const filterDataByPermissions = useCallback(<T>(data: T[], permissionCheck: (item: T) => boolean): T[] => {
    return rbacService.filterDataByPermissions(data, permissionCheck);
  }, []);

  const logAccessAttempt = useCallback((resource: string, action: string, success: boolean): void => {
    rbacService.logAccessAttempt(resource, action, success);
  }, []);

  // Memoized values
  const userRole = useMemo(() => currentUser?.role || null, [currentUser]);
  const userPermissions = useMemo(() => rbacService.getUserPermissions(), [currentUser]);
  const userRoleLevel = useMemo(() => rbacService.getUserRoleLevel(), [currentUser]);
  const availableRoles = useMemo(() => rbacService.getAvailableRoles(), []);

  const getRoleById = useCallback((roleId: string): UserRole | undefined => {
    return rbacService.getRoleById(roleId);
  }, []);

  return {
    // User state
    currentUser,
    isAuthenticated,
    userRole,
    userPermissions,
    userRoleLevel,

    // Permission checks
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessFeature,
    canPerformAction,

    // Role checks
    hasRole,
    hasMinimumRoleLevel,
    isAdmin,
    isAnalystOrHigher,
    isOperatorOrHigher,

    // User management
    setCurrentUser,
    clearCurrentUser,
    updateUserRole,

    // Available data
    availableRoles,
    getRoleById,

    // Utility functions
    filterDataByPermissions,
    logAccessAttempt
  };
};

export default useRBAC;
