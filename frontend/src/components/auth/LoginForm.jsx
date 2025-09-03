// Login form component for manufacturing system
// Handles user authentication with session management

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSession } from '../../hooks/useSession';
import { useNotifications } from '../../hooks/useNotifications';
import './LoginForm.css';

const LoginForm = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    stationId: '',
    rememberMe: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const { createSession } = useSession();
  const { showNotification } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    if (formData.stationId && !formData.stationId.trim()) {
      newErrors.stationId = 'Station ID cannot be empty if provided';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const loginData = {
        username: formData.username.trim(),
        password: formData.password,
        stationId: formData.stationId.trim() || null
      };

      const response = await login(loginData);
      
      if (response.success) {
        // Create session with the session ID from response
        if (response.data.session?.sessionId) {
          await createSession(response.data.session);
        }

        showNotification('Login successful! Welcome to the Manufacturing System.', 'success');
        
        // Redirect to intended page or dashboard
        const from = location.state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      } else {
        setErrors({ general: response.message || 'Login failed' });
      }
    } catch (error) {
      console.error('Login error:', error);
      
      if (error.reason === 'account_locked') {
        setErrors({ 
          general: `Account is locked until ${new Date(error.lockoutUntil).toLocaleString()}. Please contact your administrator.` 
        });
      } else if (error.reason === 'invalid_credentials') {
        setErrors({ 
          general: 'Invalid username or password. Please check your credentials and try again.' 
        });
      } else {
        setErrors({ 
          general: error.message || 'An unexpected error occurred. Please try again.' 
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigate('/auth/forgot-password');
  };

  return (
    <div className="login-form-container">
      <div className="login-form-card">
        <div className="login-form-header">
          <div className="manufacturing-logo">
            <div className="logo-icon">⚡</div>
            <h1>Manufacturing System</h1>
          </div>
          <p className="login-subtitle">Production Floor Access</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {errors.general && (
            <div className="error-message general-error">
              <span className="error-icon">⚠️</span>
              {errors.general}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Username *
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className={`form-input ${errors.username ? 'error' : ''}`}
              placeholder="Enter your username"
              disabled={isLoading}
              autoComplete="username"
            />
            {errors.username && (
              <span className="error-message">{errors.username}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password *
            </label>
            <div className="password-input-container">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`form-input ${errors.password ? 'error' : ''}`}
                placeholder="Enter your password"
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {errors.password && (
              <span className="error-message">{errors.password}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="stationId" className="form-label">
              Station ID (Optional)
            </label>
            <input
              type="text"
              id="stationId"
              name="stationId"
              value={formData.stationId}
              onChange={handleInputChange}
              className={`form-input ${errors.stationId ? 'error' : ''}`}
              placeholder="Enter station ID if applicable"
              disabled={isLoading}
              autoComplete="off"
            />
            {errors.stationId && (
              <span className="error-message">{errors.stationId}</span>
            )}
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleInputChange}
                disabled={isLoading}
                className="checkbox-input"
              />
              <span className="checkbox-text">Remember me</span>
            </label>
          </div>

          <button
            type="submit"
            className={`login-button ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="loading-spinner"></span>
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>

          <div className="login-form-footer">
            <button
              type="button"
              className="forgot-password-link"
              onClick={handleForgotPassword}
              disabled={isLoading}
            >
              Forgot your password?
            </button>
          </div>
        </form>

        <div className="login-form-info">
          <div className="info-item">
            <span className="info-icon">🔒</span>
            <span>Secure authentication</span>
          </div>
          <div className="info-item">
            <span className="info-icon">⚡</span>
            <span>Real-time production tracking</span>
          </div>
          <div className="info-item">
            <span className="info-icon">📊</span>
            <span>Comprehensive reporting</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
