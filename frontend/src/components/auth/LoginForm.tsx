import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { StatusIndicator } from '../ui/StatusIndicator';

/**
 * LoginForm component
 * Simple form for testing authentication
 */
export const LoginForm: React.FC = () => {
  const { login, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    stationId: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    const stationId = formData.stationId.trim() || undefined;
    try {
      await login(formData.username, formData.password, stationId);
      // Force immediate redirect to security dashboard
      window.location.href = '/security';
    } catch (err) {
      // AuthContext already sets error state; add a console for visibility
      // eslint-disable-next-line no-console
      console.error('Login failed:', err);
    }
  };

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <h3 className="text-lg font-semibold">Login</h3>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <StatusIndicator status="error" showIcon>
              {error}
            </StatusIndicator>
          )}
          
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <Input
              id="username"
              type="text"
              value={formData.username}
              onChange={handleInputChange('username')}
              placeholder="Enter username"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange('password')}
              placeholder="Enter password"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="stationId" className="block text-sm font-medium text-gray-700 mb-1">
              Station ID (Optional)
            </label>
            <Input
              id="stationId"
              type="number"
              value={formData.stationId}
              onChange={handleInputChange('stationId')}
              placeholder="Enter station ID"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to login without station context
            </p>
          </div>

          <Button
            type="submit"
            disabled={isLoading || !formData.username || !formData.password}
            className="w-full"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </form>

        <div className="mt-4 p-3 bg-blue-50 rounded text-sm text-blue-700">
          <p className="font-medium mb-2">Test Credentials:</p>
          <div className="space-y-1 text-xs">
            <p><strong>Station Inspector:</strong> inspector1 / password123</p>
            <p><strong>Supervisor:</strong> supervisor1 / password123</p>
            <p><strong>QC Manager:</strong> qcmanager1 / password123</p>
            <p><strong>Admin:</strong> admin1 / password123</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LoginForm;
