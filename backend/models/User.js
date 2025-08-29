// User model for manufacturing authentication system
// Database operations for user management with role-based access control

import { databaseManager } from '../config/index.js';
import { hashPassword, comparePassword, validatePasswordPolicy } from '../utils/index.js';
import { manufacturingLogger } from '../middleware/logger.js';
import { DatabaseError, ValidationError, AuthenticationError } from '../middleware/errorHandler.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * User roles for manufacturing environment
 * Imported from permissions to avoid circular dependency
 */
import { USER_ROLES } from '../utils/permissions.js';

/**
 * User model class with database operations
 */
export class User {
  constructor(data = {}) {
    this.id = data.id || null;
    this.username = data.username || null;
    this.email = data.email || null;
    this.password_hash = data.password_hash || null;
    this.role = data.role || USER_ROLES.STATION_INSPECTOR;
    this.station_assignments = data.station_assignments || [];
    this.is_active = data.is_active !== undefined ? data.is_active : true;
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
    this.last_login = data.last_login || null;
    this.token_version = data.token_version || 1;
    this.failed_login_attempts = data.failed_login_attempts || 0;
    this.locked_until = data.locked_until || null;
  }

  /**
   * Create new user with password hashing
   */
  static async create(userData) {
    try {
      // Validate required fields
      const requiredFields = ['username', 'email', 'password', 'role'];
      for (const field of requiredFields) {
        if (!userData[field]) {
          throw new ValidationError(`${field} is required`, {
            field,
            reason: 'missing_required_field'
          });
        }
      }

      // Validate username format
      if (!/^[a-zA-Z0-9_]{3,30}$/.test(userData.username)) {
        throw new ValidationError('Username must be 3-30 characters and contain only letters, numbers, and underscores', {
          field: 'username',
          value: userData.username,
          reason: 'invalid_format'
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        throw new ValidationError('Invalid email format', {
          field: 'email',
          value: userData.email,
          reason: 'invalid_format'
        });
      }

      // Validate role
      if (!Object.values(USER_ROLES).includes(userData.role)) {
        throw new ValidationError('Invalid user role', {
          field: 'role',
          value: userData.role,
          validRoles: Object.values(USER_ROLES),
          reason: 'invalid_role'
        });
      }

      // Hash password
      const hashedPassword = await hashPassword(userData.password);

      // Check for existing users
      await User._checkUniqueConstraints(userData.username, userData.email);

      // Prepare user data
      const userId = uuidv4();
      const now = new Date().toISOString();
      
      const userRecord = {
        id: userId,
        username: userData.username,
        email: userData.email,
        password_hash: hashedPassword,
        role: userData.role,
        station_assignments: userData.stationAssignments || [],
        is_active: true,
        created_at: now,
        updated_at: now,
        last_login: null,
        token_version: 1,
        failed_login_attempts: 0,
        locked_until: null
      };

      // Insert into database
      const query = `
        INSERT INTO users (
          id, username, email, password_hash, role, station_assignments,
          is_active, created_at, updated_at, last_login, token_version,
          failed_login_attempts, locked_until
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
        ) RETURNING *
      `;

      const values = [
        userRecord.id,
        userRecord.username,
        userRecord.email,
        userRecord.password_hash,
        userRecord.role,
        JSON.stringify(userRecord.station_assignments),
        userRecord.is_active,
        userRecord.created_at,
        userRecord.updated_at,
        userRecord.last_login,
        userRecord.token_version,
        userRecord.failed_login_attempts,
        userRecord.locked_until
      ];

      const result = await databaseManager.query(query, values);
      const newUser = new User(result.rows[0]);

      manufacturingLogger.info('User created successfully', {
        userId: newUser.id,
        username: newUser.username,
        role: newUser.role,
        category: 'user_management'
      });

      return newUser;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      if (error.code === '23505') { // Unique constraint violation
        if (error.constraint?.includes('username')) {
          throw new ValidationError('Username already exists', {
            field: 'username',
            value: userData.username,
            reason: 'duplicate_username'
          });
        }
        if (error.constraint?.includes('email')) {
          throw new ValidationError('Email already exists', {
            field: 'email',
            value: userData.email,
            reason: 'duplicate_email'
          });
        }
      }

      manufacturingLogger.error('Failed to create user', {
        username: userData.username,
        email: userData.email,
        error: error.message,
        category: 'user_management'
      });

      throw new DatabaseError('Failed to create user', 'user_creation', {
        originalError: error.message
      });
    }
  }

  /**
   * Find user by username
   */
  static async findByUsername(username) {
    try {
      if (!username) {
        throw new ValidationError('Username is required', {
          field: 'username',
          reason: 'missing_parameter'
        });
      }

      const query = 'SELECT * FROM users WHERE username = $1 AND is_active = true';
      const result = await databaseManager.query(query, [username]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const userData = result.rows[0];
      // Parse JSON fields
      if (userData.station_assignments) {
        userData.station_assignments = JSON.parse(userData.station_assignments);
      }

      return new User(userData);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      manufacturingLogger.error('Failed to find user by username', {
        username,
        error: error.message,
        category: 'user_management'
      });

      throw new DatabaseError('Failed to find user', 'user_lookup', {
        username,
        originalError: error.message
      });
    }
  }

  /**
   * Find user by ID
   */
  static async findById(userId) {
    try {
      if (!userId) {
        throw new ValidationError('User ID is required', {
          field: 'userId',
          reason: 'missing_parameter'
        });
      }

      const query = 'SELECT * FROM users WHERE id = $1 AND is_active = true';
      const result = await databaseManager.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const userData = result.rows[0];
      // Parse JSON fields
      if (userData.station_assignments) {
        userData.station_assignments = JSON.parse(userData.station_assignments);
      }

      return new User(userData);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      manufacturingLogger.error('Failed to find user by ID', {
        userId,
        error: error.message,
        category: 'user_management'
      });

      throw new DatabaseError('Failed to find user', 'user_lookup', {
        userId,
        originalError: error.message
      });
    }
  }

  /**
   * Authenticate user with username and password
   */
  static async authenticate(username, password) {
    try {
      if (!username || !password) {
        throw new ValidationError('Username and password are required', {
          reason: 'missing_credentials'
        });
      }

      const user = await User.findByUsername(username);
      if (!user) {
        // Log attempt but don't reveal user existence
        manufacturingLogger.warn('Authentication attempt for non-existent user', {
          username,
          category: 'authentication'
        });
        throw new AuthenticationError('Invalid credentials', {
          reason: 'invalid_credentials'
        });
      }

      // Check if account is locked
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        manufacturingLogger.warn('Authentication attempt on locked account', {
          userId: user.id,
          username: user.username,
          lockedUntil: user.locked_until,
          category: 'authentication'
        });
        throw new AuthenticationError('Account is temporarily locked', {
          reason: 'account_locked',
          lockedUntil: user.locked_until
        });
      }

      // Verify password
      const isPasswordValid = await comparePassword(password, user.password_hash);
      if (!isPasswordValid) {
        await user._handleFailedLogin();
        throw new AuthenticationError('Invalid credentials', {
          reason: 'invalid_credentials'
        });
      }

      // Reset failed attempts and update last login
      await user._handleSuccessfulLogin();

      manufacturingLogger.info('User authenticated successfully', {
        userId: user.id,
        username: user.username,
        role: user.role,
        category: 'authentication'
      });

      return user;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof AuthenticationError) {
        throw error;
      }

      manufacturingLogger.error('Authentication process failed', {
        username,
        error: error.message,
        category: 'authentication'
      });

      throw new DatabaseError('Authentication failed', 'authentication', {
        username,
        originalError: error.message
      });
    }
  }

  /**
   * Update user's last login time and reset failed attempts
   */
  async _handleSuccessfulLogin() {
    try {
      const now = new Date().toISOString();
      const query = `
        UPDATE users 
        SET last_login = $1, failed_login_attempts = 0, locked_until = NULL, updated_at = $2
        WHERE id = $3
      `;
      await databaseManager.query(query, [now, now, this.id]);
      
      this.last_login = now;
      this.failed_login_attempts = 0;
      this.locked_until = null;
      this.updated_at = now;
    } catch (error) {
      manufacturingLogger.error('Failed to update login success', {
        userId: this.id,
        error: error.message,
        category: 'authentication'
      });
    }
  }

  /**
   * Handle failed login attempt with lockout logic
   */
  async _handleFailedLogin() {
    try {
      const maxAttempts = 5;
      const lockoutDuration = 15 * 60 * 1000; // 15 minutes
      const newFailedAttempts = this.failed_login_attempts + 1;
      const now = new Date().toISOString();

      let lockedUntil = null;
      if (newFailedAttempts >= maxAttempts) {
        lockedUntil = new Date(Date.now() + lockoutDuration).toISOString();
      }

      const query = `
        UPDATE users 
        SET failed_login_attempts = $1, locked_until = $2, updated_at = $3
        WHERE id = $4
      `;
      await databaseManager.query(query, [newFailedAttempts, lockedUntil, now, this.id]);

      this.failed_login_attempts = newFailedAttempts;
      this.locked_until = lockedUntil;
      this.updated_at = now;

      manufacturingLogger.warn('Failed login attempt recorded', {
        userId: this.id,
        username: this.username,
        attempts: newFailedAttempts,
        isLocked: !!lockedUntil,
        category: 'authentication'
      });
    } catch (error) {
      manufacturingLogger.error('Failed to update login failure', {
        userId: this.id,
        error: error.message,
        category: 'authentication'
      });
    }
  }

  /**
   * Check for username and email uniqueness
   */
  static async _checkUniqueConstraints(username, email, excludeUserId = null) {
    const queries = [
      { field: 'username', value: username },
      { field: 'email', value: email }
    ];

    for (const { field, value } of queries) {
      let query = `SELECT id FROM users WHERE ${field} = $1`;
      const params = [value];
      
      if (excludeUserId) {
        query += ' AND id != $2';
        params.push(excludeUserId);
      }

      const result = await databaseManager.query(query, params);
      if (result.rows.length > 0) {
        throw new ValidationError(`${field} already exists`, {
          field,
          value,
          reason: `duplicate_${field}`
        });
      }
    }
  }

  /**
   * Update station assignments for inspector users
   */
  async updateStationAssignments(stationIds) {
    try {
      if (this.role !== USER_ROLES.STATION_INSPECTOR) {
        throw new ValidationError('Station assignments only apply to station inspectors', {
          role: this.role,
          reason: 'invalid_role_for_stations'
        });
      }

      // Validate station IDs (1-8 for dual line system)
      const validStationIds = stationIds.filter(id => id >= 1 && id <= 8);
      if (validStationIds.length !== stationIds.length) {
        throw new ValidationError('Invalid station IDs provided', {
          provided: stationIds,
          valid: validStationIds,
          reason: 'invalid_station_ids'
        });
      }

      const now = new Date().toISOString();
      const query = `
        UPDATE users 
        SET station_assignments = $1, updated_at = $2
        WHERE id = $3
      `;
      
      await databaseManager.query(query, [JSON.stringify(validStationIds), now, this.id]);
      
      this.station_assignments = validStationIds;
      this.updated_at = now;

      manufacturingLogger.info('Station assignments updated', {
        userId: this.id,
        username: this.username,
        stations: validStationIds,
        category: 'user_management'
      });

      return this;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      manufacturingLogger.error('Failed to update station assignments', {
        userId: this.id,
        error: error.message,
        category: 'user_management'
      });

      throw new DatabaseError('Failed to update station assignments', 'station_assignment', {
        userId: this.id,
        originalError: error.message
      });
    }
  }

  /**
   * Check if user has access to a specific station
   */
  hasStationAccess(stationId) {
    // System admins and supervisors have access to all stations
    if (this.role === USER_ROLES.SYSTEM_ADMIN || 
        this.role === USER_ROLES.PRODUCTION_SUPERVISOR ||
        this.role === USER_ROLES.QC_MANAGER) {
      return true;
    }

    // Station inspectors only have access to assigned stations
    if (this.role === USER_ROLES.STATION_INSPECTOR) {
      return this.station_assignments.includes(stationId);
    }

    return false;
  }

  /**
   * Change user password with current password verification
   */
  async changePassword(currentPassword, newPassword) {
    try {
      if (!currentPassword || !newPassword) {
        throw new ValidationError('Current password and new password are required', {
          reason: 'missing_passwords'
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await comparePassword(currentPassword, this.password_hash);
      if (!isCurrentPasswordValid) {
        throw new ValidationError('Current password is incorrect', {
          reason: 'invalid_current_password'
        });
      }

      // Validate new password
      if (currentPassword === newPassword) {
        throw new ValidationError('New password must be different from current password', {
          reason: 'password_same_as_current'
        });
      }

      // Validate new password policy
      const passwordValidation = validatePasswordPolicy(newPassword);
      if (!passwordValidation.isValid) {
        throw new ValidationError('New password does not meet security requirements', {
          reason: 'password_policy_violation',
          details: passwordValidation.errors
        });
      }

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);

      // Update password and increment token version (invalidates all existing tokens)
      const now = new Date().toISOString();
      const query = `
        UPDATE users 
        SET password_hash = $1, token_version = $2, updated_at = $3
        WHERE id = $4
      `;
      
      await databaseManager.query(query, [newPasswordHash, this.token_version + 1, now, this.id]);
      
      // Update local instance
      this.password_hash = newPasswordHash;
      this.token_version += 1;
      this.updated_at = now;

      manufacturingLogger.info('Password changed successfully', {
        userId: this.id,
        username: this.username,
        category: 'user_management'
      });

      return true;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      manufacturingLogger.error('Failed to change password', {
        userId: this.id,
        error: error.message,
        category: 'user_management'
      });

      throw new DatabaseError('Failed to change password', 'password_change', {
        userId: this.id,
        originalError: error.message
      });
    }
  }

  /**
   * Get user's public data (excluding sensitive fields)
   */
  toPublicJSON() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      role: this.role,
      stationAssignments: this.station_assignments,
      isActive: this.is_active,
      createdAt: this.created_at,
      lastLogin: this.last_login
    };
  }
}

export default User;

