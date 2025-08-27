import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAuthUtils } from '../../hooks/useAuthUtils';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { StatusIndicator } from '../ui/StatusIndicator';

/**
 * AuthStatus component
 * Displays current authentication state for development and testing
 */
export const AuthStatus: React.FC = () => {
  const auth = useAuth();
  const authUtils = useAuthUtils();

  if (auth.isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <h3 className="text-lg font-semibold">Authentication Status</h3>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Checking authentication...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <h3 className="text-lg font-semibold">Authentication Status</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <StatusIndicator status="error" showIcon>
              Not Authenticated
            </StatusIndicator>
            {auth.error && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                Error: {auth.error}
              </div>
            )}
            <p className="text-gray-600 text-sm">
              Please log in to access the system.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <h3 className="text-lg font-semibold">Authentication Status</h3>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <StatusIndicator status="success" showIcon>
            Authenticated
          </StatusIndicator>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">User:</span>
              <span>{authUtils.userDisplayName}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Role:</span>
              <span>{authUtils.userRoleDisplayName}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Stations:</span>
              <span>{authUtils.assignedStationsDisplay}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Session:</span>
              <span>{authUtils.sessionTimeRemaining} min remaining</span>
            </div>
          </div>

          {authUtils.isSessionExpiringSoon && (
            <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
              ⚠️ Session expiring soon
            </div>
          )}

          <div className="pt-2 border-t">
            <h4 className="font-medium text-sm text-gray-700 mb-2">Permissions:</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${authUtils.canAccessFeature('panel_scanning') ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                <span>Panel Scanning</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${authUtils.canAccessFeature('quality_reports') ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                <span>Quality Reports</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${authUtils.canAccessFeature('user_management') ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                <span>User Management</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${authUtils.canAccessFeature('system_configuration') ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                <span>System Config</span>
              </div>
            </div>
          </div>

          <button
            onClick={auth.logout}
            className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AuthStatus;
