import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAuthUtils } from '../hooks/useAuthUtils';
import { LoginForm, AuthStatus } from '../components/auth';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusIndicator } from '../components/ui/StatusIndicator';

/**
 * AuthDemo page - Gradually restoring full functionality
 */
const AuthDemo: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const authUtils = useAuthUtils();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Authentication System Demo
          </h1>
          <p className="text-gray-600">
            Complete JWT-based authentication with role-based access control
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Authentication */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">Authentication Status</h2>
              </CardHeader>
              <CardContent>
                <AuthStatus />
              </CardContent>
            </Card>

            {!isAuthenticated && (
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-semibold">Login Form</h2>
                </CardHeader>
                <CardContent>
                  <LoginForm />
                </CardContent>
              </Card>
            )}

            {isAuthenticated && (
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-semibold">User Actions</h2>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button
                      onClick={handleLogout}
                      variant="outline"
                      className="w-full"
                    >
                      Logout
                    </Button>
                    <Button
                      onClick={() => window.location.href = '/ui-demo'}
                      variant="outline"
                      className="w-full"
                    >
                      View UI Components
                    </Button>
                    <Button
                      onClick={() => window.location.href = '/'}
                      variant="outline"
                      className="w-full"
                    >
                      Go to Dashboard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Features & Permissions */}
          <div className="space-y-6">
            {/* Role Information */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">Role-Based Access Control</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700">Station Inspector</h4>
                      <ul className="text-gray-600 space-y-1">
                        <li>• Panel scanning</li>
                        <li>• Inspection recording</li>
                        <li>• Assigned stations only</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700">Production Supervisor</h4>
                      <ul className="text-gray-600 space-y-1">
                        <li>• All inspector permissions</li>
                        <li>• All stations access</li>
                        <li>• Order management</li>
                        <li>• Quality reports</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700">QC Manager</h4>
                      <ul className="text-gray-600 space-y-1">
                        <li>• All supervisor permissions</li>
                        <li>• User management</li>
                        <li>• Station configuration</li>
                        <li>• Audit logs</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700">System Admin</h4>
                      <ul className="text-gray-600 space-y-1">
                        <li>• All QC manager permissions</li>
                        <li>• System configuration</li>
                        <li>• Database management</li>
                        <li>• Full system access</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Feature Access Matrix */}
            {isAuthenticated && (
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-semibold">Feature Access Matrix</h2>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { feature: 'Panel Scanning', key: 'panel_scanning' },
                      { feature: 'Inspection Recording', key: 'inspection_recording' },
                      { feature: 'Quality Reports', key: 'quality_reports' },
                      { feature: 'Production Monitoring', key: 'production_monitoring' },
                      { feature: 'User Management', key: 'user_management' },
                      { feature: 'Station Configuration', key: 'station_configuration' },
                      { feature: 'Audit Logs', key: 'audit_logs' },
                      { feature: 'System Configuration', key: 'system_configuration' },
                    ].map(({ feature, key }) => (
                      <div key={feature} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm font-medium text-gray-700">{feature}</span>
                        <StatusIndicator
                          status={authUtils.canAccessFeature(key) ? 'success' : 'error'}
                          showIcon
                        >
                          {authUtils.canAccessFeature(key) ? 'Access' : 'Denied'}
                        </StatusIndicator>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Session Information */}
            {isAuthenticated && (
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-semibold">Session Information</h2>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-700">Session Time Remaining:</span>
                      <span className={`text-sm font-mono ${authUtils.isSessionExpiringSoon ? 'text-yellow-600' : 'text-gray-600'}`}>
                        {authUtils.sessionTimeRemaining} minutes
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-700">Last Login:</span>
                      <span className="text-sm text-gray-600">{authUtils.loginTimeDisplay}</span>
                    </div>
                    {authUtils.isSessionExpiringSoon && (
                      <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                        ⚠️ Your session is expiring soon. Please save your work.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Test Content */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">Test Content</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded border-2 border-dashed border-blue-300">
                      <p className="text-center text-blue-800 font-medium">Test Container 1</p>
                      <p className="text-center text-blue-600 text-sm">Card components working</p>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded border-2 border-dashed border-green-300">
                      <p className="text-center text-green-800 font-medium">Test Container 2</p>
                      <p className="text-center text-green-600 text-sm">Structure restored</p>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
                      Test Button
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthDemo;
