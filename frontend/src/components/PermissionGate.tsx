/**
 * PermissionGate Component
 * Conditionally renders children based on user permissions
 */

import React from 'react';
import { useRBAC } from '../hooks/useRBAC';

export interface PermissionGateProps {
  children: React.ReactNode;
  permission?: string;
  permissions?: string[];
  resource?: string;
  action?: string;
  role?: string;
  minimumRoleLevel?: number;
  requireAllPermissions?: boolean; // If true, user must have ALL permissions; if false, ANY permission
  fallback?: React.ReactNode;
  showFallback?: boolean; // Whether to show fallback when access is denied
  logAccess?: boolean; // Whether to log access attempts
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  permission,
  permissions = [],
  resource,
  action,
  role,
  minimumRoleLevel,
  requireAllPermissions = false,
  fallback = null,
  showFallback = false,
  logAccess = true
}) => {
  const {
    isAuthenticated,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasMinimumRoleLevel,
    logAccessAttempt
  } = useRBAC();

  // If not authenticated, don't render anything
  if (!isAuthenticated) {
    if (logAccess) {
      logAccessAttempt(resource || 'component', action || 'access', false);
    }
    return showFallback ? <>{fallback}</> : null;
  }

  // Check role requirements
  if (role && !hasRole(role)) {
    if (logAccess) {
      logAccessAttempt(resource || 'component', action || 'access', false);
    }
    return showFallback ? <>{fallback}</> : null;
  }

  // Check minimum role level
  if (minimumRoleLevel && !hasMinimumRoleLevel(minimumRoleLevel)) {
    if (logAccess) {
      logAccessAttempt(resource || 'component', action || 'access', false);
    }
    return showFallback ? <>{fallback}</> : null;
  }

  // Check single permission
  if (permission && !hasPermission(permission, resource, action)) {
    if (logAccess) {
      logAccessAttempt(resource || 'component', action || 'access', false);
    }
    return showFallback ? <>{fallback}</> : null;
  }

  // Check multiple permissions
  if (permissions.length > 0) {
    const hasRequiredPermissions = requireAllPermissions
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);

    if (!hasRequiredPermissions) {
      if (logAccess) {
        logAccessAttempt(resource || 'component', action || 'access', false);
      }
      return showFallback ? <>{fallback}</> : null;
    }
  }

  // Log successful access
  if (logAccess) {
    logAccessAttempt(resource || 'component', action || 'access', true);
  }

  // Render children if all checks pass
  return <>{children}</>;
};

export default PermissionGate;
