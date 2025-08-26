// Password hashing and validation utilities for manufacturing authentication
// Secure password management for production floor users

import bcrypt from 'bcryptjs';
import { config } from '../config/index.js';
import { manufacturingLogger } from '../middleware/logger.js';
import { ValidationError } from '../middleware/errorHandler.js';

/**
 * Password policy configuration for manufacturing environment
 */
export const PASSWORD_POLICY = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false, // Relaxed for tablet use
  bannedPasswords: [
    'password', 'password123', 'admin', 'admin123', 
    'station', 'station123', 'manufacturing', 'solar123',
    '12345678', 'qwerty123', 'abc123456'
  ]
};

/**
 * Hash password using bcrypt with manufacturing-grade salt rounds
 */
export const hashPassword = async (plainPassword) => {
  try {
    if (!plainPassword || typeof plainPassword !== 'string') {
      throw new ValidationError('Password must be a non-empty string', {
        field: 'password',
        reason: 'invalid_input'
      });
    }

    // Validate password before hashing
    validatePasswordPolicy(plainPassword);

    const saltRounds = config.security.bcryptRounds;
    const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

    manufacturingLogger.debug('Password hashed successfully', {
      saltRounds,
      passwordLength: plainPassword.length,
      category: 'authentication'
    });

    return hashedPassword;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }

    manufacturingLogger.error('Password hashing failed', {
      error: error.message,
      category: 'authentication'
    });

    throw new ValidationError('Password hashing failed', {
      reason: 'hashing_error',
      details: error.message
    });
  }
};

/**
 * Compare plain password with hashed password
 */
export const comparePassword = async (plainPassword, hashedPassword) => {
  try {
    if (!plainPassword || !hashedPassword) {
      throw new ValidationError('Both password and hash are required for comparison', {
        reason: 'missing_parameters'
      });
    }

    const isMatch = await bcrypt.compare(plainPassword, hashedPassword);

    manufacturingLogger.debug('Password comparison completed', {
      isMatch,
      category: 'authentication'
    });

    return isMatch;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }

    manufacturingLogger.error('Password comparison failed', {
      error: error.message,
      category: 'authentication'
    });

    throw new ValidationError('Password comparison failed', {
      reason: 'comparison_error',
      details: error.message
    });
  }
};

/**
 * Validate password against manufacturing policy
 */
export const validatePasswordPolicy = (password) => {
  const errors = [];

  // Check length
  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters long`);
  }

  if (password.length > PASSWORD_POLICY.maxLength) {
    errors.push(`Password must not exceed ${PASSWORD_POLICY.maxLength} characters`);
  }

  // Check character requirements
  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (PASSWORD_POLICY.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (PASSWORD_POLICY.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check banned passwords
  const lowercasePassword = password.toLowerCase();
  if (PASSWORD_POLICY.bannedPasswords.some(banned => lowercasePassword.includes(banned.toLowerCase()))) {
    errors.push('Password contains commonly used words or patterns that are not allowed');
  }

  // Check for common patterns
  if (/^(.)\1+$/.test(password)) {
    errors.push('Password cannot consist of repeated characters');
  }

  if (/^(?:abc|123|qwe)/i.test(password)) {
    errors.push('Password cannot start with common sequences');
  }

  if (errors.length > 0) {
    throw new ValidationError('Password does not meet security requirements', {
      field: 'password',
      violations: errors,
      policy: PASSWORD_POLICY,
      reason: 'policy_violation'
    });
  }

  return true;
};

/**
 * Generate password strength score
 */
export const getPasswordStrength = (password) => {
  let score = 0;
  const feedback = [];

  // Length scoring
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  // Character variety scoring
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add lowercase letters');
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add uppercase letters');
  }

  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add numbers');
  }

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Consider adding special characters');
  }

  // Pattern checks (negative scoring)
  if (/(.)\1{2,}/.test(password)) {
    score -= 1;
    feedback.push('Avoid repeated characters');
  }

  if (/^(?:123|abc|qwe)/i.test(password)) {
    score -= 1;
    feedback.push('Avoid common sequences');
  }

  // Calculate strength level
  const maxScore = 7;
  const strengthLevel = Math.max(0, Math.min(maxScore, score));
  
  let strengthText;
  if (strengthLevel <= 2) strengthText = 'Weak';
  else if (strengthLevel <= 4) strengthText = 'Fair';
  else if (strengthLevel <= 5) strengthText = 'Good';
  else strengthText = 'Strong';

  return {
    score: strengthLevel,
    maxScore,
    percentage: Math.round((strengthLevel / maxScore) * 100),
    level: strengthText,
    feedback,
    meetsPolicy: score >= 4 // Minimum acceptable score
  };
};

/**
 * Generate secure temporary password for new users
 */
export const generateTemporaryPassword = (length = 12) => {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const specials = '!@#$%^&*';
  
  const allChars = lowercase + uppercase + numbers + specials;
  
  let password = '';
  
  // Ensure at least one character from each required category
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  
  // Fill the rest with random characters
  for (let i = 3; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  const shuffled = password.split('').sort(() => Math.random() - 0.5).join('');
  
  manufacturingLogger.info('Temporary password generated', {
    length,
    category: 'authentication'
  });
  
  return shuffled;
};

/**
 * Check if password has been compromised (placeholder for future breach detection)
 */
export const checkPasswordBreach = async (password) => {
  // TODO: Integrate with HaveIBeenPwned API or similar service
  // For now, just check against our banned list
  const lowercasePassword = password.toLowerCase();
  const isCompromised = PASSWORD_POLICY.bannedPasswords.some(banned => 
    lowercasePassword.includes(banned.toLowerCase())
  );

  return {
    isCompromised,
    source: isCompromised ? 'local_banned_list' : null
  };
};

export default {
  PASSWORD_POLICY,
  hashPassword,
  comparePassword,
  validatePasswordPolicy,
  getPasswordStrength,
  generateTemporaryPassword,
  checkPasswordBreach
};

