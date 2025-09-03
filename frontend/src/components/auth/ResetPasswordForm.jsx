// Reset password form component for manufacturing system
// Handles password reset with token validation

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import { useNotifications } from '../../hooks/useNotifications';
import './ResetPasswordForm.css';

const ResetPasswordForm = () => {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { token } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotifications();

  // Validate token on component mount
  useEffect(() => {
    if (token) {
      validateToken();
    } else {
      setIsValidating(false);
      setErrors({ general: 'Invalid reset link. Please request a new password reset.' });
    }
  }, [token]);

  const validateToken = async () => {
    try {
      setIsValidating(true);
      const response = await apiClient.validateResetToken(token);
      
      if (response.success) {
        setIsValidToken(true);
      } else {
        setErrors({ general: response.message || 'Invalid or expired reset link.' });
      }
    } catch (error) {
      console.error('Token validation error:', error);
      
      if (error.status === 404) {
        setErrors({ general: 'Reset link not found. Please request a new password reset.' });
      } else if (error.status === 400) {
        setErrors({ general: 'Invalid or expired reset link. Please request a new password reset.' });
      } else {
        setErrors({ general: 'Failed to validate reset link. Please try again.' });
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validatePassword = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return {
      minLength: password.length >= minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar
    };
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else {
      const passwordValidation = validatePassword(formData.newPassword);
      if (!passwordValidation.minLength) {
        newErrors.newPassword = 'Password must be at least 8 characters long';
      } else if (!passwordValidation.hasUpperCase || !passwordValidation.hasLowerCase || 
                 !passwordValidation.hasNumbers || !passwordValidation.hasSpecialChar) {
        newErrors.newPassword = 'Password must contain uppercase, lowercase, numbers, and special characters';
      }
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
      const response = await apiClient.resetPassword(token, formData.newPassword);
      
      if (response.success) {
        showNotification('Password reset successfully! You can now sign in with your new password.', 'success');
        navigate('/login', { 
          state: { 
            message: 'Password reset successfully! Please sign in with your new password.' 
          } 
        });
      } else {
        setErrors({ general: response.message || 'Failed to reset password' });
      }
    } catch (error) {
      console.error('Reset password error:', error);
      
      if (error.status === 400) {
        setErrors({ 
          general: error.data?.message || 'Invalid or expired reset link. Please request a new password reset.' 
        });
      } else if (error.status === 404) {
        setErrors({ 
          general: 'Reset link not found. Please request a new password reset.' 
        });
      } else {
        setErrors({ 
          general: error.data?.message || 'An unexpected error occurred. Please try again.' 
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  const handleRequestNewReset = () => {
    navigate('/auth/forgot-password');
  };

  const getPasswordStrength = () => {
    if (!formData.newPassword) return { strength: 0, label: '' };
    
    const validation = validatePassword(formData.newPassword);
    const score = Object.values(validation).filter(Boolean).length;
    
    if (score < 3) return { strength: 1, label: 'Weak' };
    if (score < 5) return { strength: 2, label: 'Medium' };
    return { strength: 3, label: 'Strong' };
  };

  const passwordStrength = getPasswordStrength();

  if (isValidating) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-card">
          <div className="loading-state">
            <div className="loading-spinner large"></div>
            <h2>Validating Reset Link...</h2>
            <p>Please wait while we verify your reset link.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-card">
          <div className="error-state">
            <div className="error-icon">❌</div>
            <h2>Invalid Reset Link</h2>
            <p>{errors.general}</p>
            <div className="error-actions">
              <button
                type="button"
                className="request-new-button"
                onClick={handleRequestNewReset}
              >
                Request New Reset Link
              </button>
              <button
                type="button"
                className="back-to-login-button"
                onClick={handleBackToLogin}
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-password-container">
      <div className="reset-password-card">
        <div className="reset-password-header">
          <div className="manufacturing-logo">
            <div className="logo-icon">⚡</div>
            <h1>Reset Password</h1>
          </div>
          <p className="reset-password-subtitle">
            Enter your new password below.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="reset-password-form">
          {errors.general && (
            <div className="error-message general-error">
              <span className="error-icon">⚠️</span>
              {errors.general}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="newPassword" className="form-label">
              New Password *
            </label>
            <div className="password-input-container">
              <input
                type={showPassword ? 'text' : 'password'}
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                className={`form-input ${errors.newPassword ? 'error' : ''}`}
                placeholder="Enter your new password"
                disabled={isLoading}
                autoComplete="new-password"
                autoFocus
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
            {errors.newPassword && (
              <span className="error-message">{errors.newPassword}</span>
            )}
            
            {formData.newPassword && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div 
                    className={`strength-fill strength-${passwordStrength.strength}`}
                  ></div>
                </div>
                <span className={`strength-label strength-${passwordStrength.strength}`}>
                  {passwordStrength.label}
                </span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Confirm New Password *
            </label>
            <div className="password-input-container">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                placeholder="Confirm your new password"
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {errors.confirmPassword && (
              <span className="error-message">{errors.confirmPassword}</span>
            )}
          </div>

          <button
            type="submit"
            className={`reset-button ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="loading-spinner"></span>
                Resetting Password...
              </>
            ) : (
              'Reset Password'
            )}
          </button>

          <div className="reset-password-footer">
            <button
              type="button"
              className="back-to-login-link"
              onClick={handleBackToLogin}
              disabled={isLoading}
            >
              ← Back to Login
            </button>
          </div>
        </form>

        <div className="reset-password-info">
          <div className="info-item">
            <span className="info-icon">🔒</span>
            <span>Secure password reset</span>
          </div>
          <div className="info-item">
            <span className="info-icon">⚡</span>
            <span>Immediate effect</span>
          </div>
          <div className="info-item">
            <span className="info-icon">🛡️</span>
            <span>Strong password required</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordForm;
