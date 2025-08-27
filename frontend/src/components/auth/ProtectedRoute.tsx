import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../ui/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'STATION_INSPECTOR' | 'PRODUCTION_SUPERVISOR' | 'QC_MANAGER' | 'SYSTEM_ADMIN';
  requiredPermission?: string;
  requiredStationAccess?: number;
  fallbackPath?: string;
  showLoading?: boolean;
}

/**
 * ProtectedRoute component
 * Wraps routes and ensures they're only accessible to authenticated users
 * with proper permissions and role requirements
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredPermission,
  requiredStationAccess,
  fallbackPath = '/login',
  showLoading = true,
}) => {
  const { isAuthenticated, isLoading, user, hasRole, hasPermission, hasStationAccess } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading && showLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    // Save the attempted location for redirect after login
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // Check role requirement
  if (requiredRole && !hasRole(requiredRole)) {
    // Redirect to unauthorized page or dashboard
    return <Navigate to="/unauthorized" replace />;
  }

  // Check permission requirement
  if (requiredPermission && !hasPermission(requiredPermission)) {
    // Redirect to unauthorized page or dashboard
    return <Navigate to="/unauthorized" replace />;
  }

  // Check station access requirement
  if (requiredStationAccess && !hasStationAccess(requiredStationAccess)) {
    // Redirect to unauthorized page or dashboard
    return <Navigate to="/unauthorized" replace />;
  }

  // All checks passed, render the protected content
  return <>{children}</>;
};

/**
 * Role-based route protection
 * Shorthand for routes that require a specific role
 */
export const RoleProtectedRoute: React.FC<{
  children: React.ReactNode;
  role: 'STATION_INSPECTOR' | 'PRODUCTION_SUPERVISOR' | 'QC_MANAGER' | 'SYSTEM_ADMIN';
  fallbackPath?: string;
}> = ({ children, role, fallbackPath }) => (
  <ProtectedRoute requiredRole={role} fallbackPath={fallbackPath}>
    {children}
  </ProtectedRoute>
);

/**
 * Permission-based route protection
 * Shorthand for routes that require a specific permission
 */
export const PermissionProtectedRoute: React.FC<{
  children: React.ReactNode;
  permission: string;
  fallbackPath?: string;
}> = ({ children, permission, fallbackPath }) => (
  <ProtectedRoute requiredPermission={permission} fallbackPath={fallbackPath}>
    {children}
  </ProtectedRoute>
);

/**
 * Station-based route protection
 * Shorthand for routes that require access to a specific station
 */
export const StationProtectedRoute: React.FC<{
  children: React.ReactNode;
  stationId: number;
  fallbackPath?: string;
}> = ({ children, stationId, fallbackPath }) => (
  <ProtectedRoute requiredStationAccess={stationId} fallbackPath={fallbackPath}>
    {children}
  </ProtectedRoute>
);

export default ProtectedRoute;
