// Forgot password form component for manufacturing system
// Handles password reset request flow

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import { useNotifications } from '../../hooks/useNotifications';
import './ForgotPasswordForm.css';

const ForgotPasswordForm = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState({});

  const navigate = useNavigate();
  const { showNotification } = useNotifications();

  const handleInputChange = (e) => {
    const { value } = e.target;
    setEmail(value);
    
    // Clear error when user starts typing
    if (errors.email) {
      setErrors(prev => ({
        ...prev,
        email: ''
      }));
    }
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate email
    if (!email.trim()) {
      setErrors({ email: 'Email is required' });
      return;
    }

    if (!validateEmail(email)) {
      setErrors({ email: 'Please enter a valid email address' });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await apiClient.forgotPassword(email.trim());
      
      if (response.success) {
        setIsSubmitted(true);
        showNotification('Password reset instructions sent to your email', 'success');
      } else {
        setErrors({ general: response.message || 'Failed to send reset instructions' });
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      
      if (error.status === 404) {
        setErrors({ 
          general: 'No account found with this email address. Please check your email and try again.' 
        });
      } else if (error.status === 429) {
        setErrors({ 
          general: 'Too many reset requests. Please wait before trying again.' 
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

  const handleResendEmail = () => {
    setIsSubmitted(false);
    setEmail('');
  };

  if (isSubmitted) {
    return (
      <div className="forgot-password-container">
        <div className="forgot-password-card">
          <div className="forgot-password-header">
            <div className="success-icon">✅</div>
            <h1>Check Your Email</h1>
            <p className="forgot-password-subtitle">
              We've sent password reset instructions to:
            </p>
            <p className="email-address">{email}</p>
          </div>

          <div className="forgot-password-content">
            <div className="instructions">
              <h3>Next Steps:</h3>
              <ol>
                <li>Check your email inbox (and spam folder)</li>
                <li>Click the reset link in the email</li>
                <li>Create a new password</li>
                <li>Sign in with your new password</li>
              </ol>
            </div>

            <div className="security-note">
              <h4>Security Note:</h4>
              <p>
                The reset link will expire in 1 hour for security reasons. 
                If you don't receive the email within a few minutes, 
                please check your spam folder or try again.
              </p>
            </div>
          </div>

          <div className="forgot-password-actions">
            <button
              type="button"
              className="resend-button"
              onClick={handleResendEmail}
            >
              Send Another Email
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
    );
  }

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-card">
        <div className="forgot-password-header">
          <div className="manufacturing-logo">
            <div className="logo-icon">⚡</div>
            <h1>Reset Password</h1>
          </div>
          <p className="forgot-password-subtitle">
            Enter your email address and we'll send you instructions to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="forgot-password-form">
          {errors.general && (
            <div className="error-message general-error">
              <span className="error-icon">⚠️</span>
              {errors.general}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={handleInputChange}
              className={`form-input ${errors.email ? 'error' : ''}`}
              placeholder="Enter your email address"
              disabled={isLoading}
              autoComplete="email"
              autoFocus
            />
            {errors.email && (
              <span className="error-message">{errors.email}</span>
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
                Sending Instructions...
              </>
            ) : (
              'Send Reset Instructions'
            )}
          </button>

          <div className="forgot-password-footer">
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

        <div className="forgot-password-info">
          <div className="info-item">
            <span className="info-icon">🔒</span>
            <span>Secure password reset</span>
          </div>
          <div className="info-item">
            <span className="info-icon">⏰</span>
            <span>Link expires in 1 hour</span>
          </div>
          <div className="info-item">
            <span className="info-icon">📧</span>
            <span>Check your spam folder</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;
