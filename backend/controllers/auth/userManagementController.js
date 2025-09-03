// User management controller for manufacturing system
// Handles admin CRUD operations for user management

import { User } from '../../models/index.js';
import { manufacturingLogger } from '../../middleware/logger.js';
import { 
  successResponse, 
  errorResponse, 
  manufacturingResponse 
} from '../../utils/index.js';
import { 
  ValidationError, 
  AuthenticationError, 
  DatabaseError,
  asyncHandler 
} from '../../middleware/errorHandler.js';

/**
 * Get all users with pagination and filtering
 * GET /api/v1/auth/users
 */
export const getAllUsers = asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    role, 
    isActive, 
    search,
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = req.query;

  // Validate pagination parameters
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  
  if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
    throw new ValidationError('Invalid pagination parameters', {
      fields: ['page', 'limit'],
      reason: 'invalid_pagination'
    });
  }

  // Validate sort parameters
  const allowedSortFields = ['username', 'email', 'role', 'created_at', 'last_login'];
  if (!allowedSortFields.includes(sortBy)) {
    throw new ValidationError('Invalid sort field', {
      field: 'sortBy',
      reason: 'invalid_sort_field',
      allowedFields: allowedSortFields
    });
  }

  const allowedSortOrders = ['asc', 'desc'];
  if (!allowedSortOrders.includes(sortOrder)) {
    throw new ValidationError('Invalid sort order', {
      field: 'sortOrder',
      reason: 'invalid_sort_order',
      allowedOrders: allowedSortOrders
    });
  }

  try {
    const result = await User.findAllWithFilters({
      page: pageNum,
      limit: limitNum,
      role,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      search,
      sortBy,
      sortOrder
    });

    manufacturingLogger.info('Users retrieved successfully', {
      totalUsers: result.total,
      page: pageNum,
      limit: limitNum,
      filters: { role, isActive, search },
      category: 'user_management'
    });

    res.status(200).json(
      manufacturingResponse({
        users: result.users,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(result.total / limitNum),
          totalUsers: result.total,
          hasNextPage: pageNum < Math.ceil(result.total / limitNum),
          hasPrevPage: pageNum > 1
        },
        filters: {
          role,
          isActive,
          search,
          sortBy,
          sortOrder
        }
      }, {
        action: 'users_listed',
        timestamp: new Date().toISOString()
      })
    );

  } catch (error) {
    manufacturingLogger.error('Failed to retrieve users', {
      error: error.message,
      filters: { role, isActive, search },
      category: 'user_management'
    });
    throw error;
  }
});

/**
 * Get user by ID
 * GET /api/v1/auth/users/:id
 */
export const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ValidationError('User ID is required', {
      field: 'id',
      reason: 'missing_parameter'
    });
  }

  try {
    const user = await User.findById(id);
    
    if (!user) {
      throw new ValidationError('User not found', {
        field: 'id',
        reason: 'user_not_found'
      });
    }

    manufacturingLogger.info('User retrieved successfully', {
      userId: id,
      username: user.username,
      category: 'user_management'
    });

    res.status(200).json(
      successResponse('User retrieved successfully', {
        user: user.toPublicJSON()
      })
    );

  } catch (error) {
    manufacturingLogger.error('Failed to retrieve user', {
      error: error.message,
      userId: id,
      category: 'user_management'
    });
    throw error;
  }
});

/**
 * Create new user
 * POST /api/v1/auth/users
 */
export const createUser = asyncHandler(async (req, res) => {
  const { 
    username, 
    email, 
    password, 
    role, 
    stationAssignments = [] 
  } = req.body;

  // Validate required fields
  if (!username || !email || !password || !role) {
    throw new ValidationError('Username, email, password, and role are required', {
      fields: ['username', 'email', 'password', 'role'],
      reason: 'missing_required_fields'
    });
  }

  // Validate role
  const allowedRoles = ['STATION_INSPECTOR', 'PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN'];
  if (!allowedRoles.includes(role)) {
    throw new ValidationError('Invalid role', {
      field: 'role',
      reason: 'invalid_role',
      allowedRoles
    });
  }

  // Validate station assignments for inspectors
  if (role === 'STATION_INSPECTOR' && (!stationAssignments || stationAssignments.length === 0)) {
    throw new ValidationError('Station assignments are required for STATION_INSPECTOR role', {
      field: 'stationAssignments',
      reason: 'missing_station_assignments'
    });
  }

  try {
    // Check if username or email already exists
    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      throw new ValidationError('Username already exists', {
        field: 'username',
        reason: 'username_exists'
      });
    }

    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      throw new ValidationError('Email already exists', {
        field: 'email',
        reason: 'email_exists'
      });
    }

    // Create new user
    const newUser = await User.create({
      username,
      email,
      password,
      role,
      stationAssignments
    });

    manufacturingLogger.info('User created successfully', {
      userId: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      category: 'user_management'
    });

    res.status(201).json(
      manufacturingResponse({
        message: 'User created successfully',
        user: newUser.toPublicJSON()
      }, {
        action: 'user_created',
        userId: newUser.id,
        timestamp: new Date().toISOString()
      })
    );

  } catch (error) {
    manufacturingLogger.error('Failed to create user', {
      error: error.message,
      username,
      email,
      role,
      category: 'user_management'
    });
    throw error;
  }
});

/**
 * Update user
 * PUT /api/v1/auth/users/:id
 */
export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { 
    username, 
    email, 
    role, 
    stationAssignments, 
    isActive 
  } = req.body;

  if (!id) {
    throw new ValidationError('User ID is required', {
      field: 'id',
      reason: 'missing_parameter'
    });
  }

  // Validate role if provided
  if (role) {
    const allowedRoles = ['STATION_INSPECTOR', 'PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN'];
    if (!allowedRoles.includes(role)) {
      throw new ValidationError('Invalid role', {
        field: 'role',
        reason: 'invalid_role',
        allowedRoles
      });
    }
  }

  try {
    // Get existing user
    const existingUser = await User.findById(id);
    if (!existingUser) {
      throw new ValidationError('User not found', {
        field: 'id',
        reason: 'user_not_found'
      });
    }

    // Check for username conflicts if username is being changed
    if (username && username !== existingUser.username) {
      const usernameExists = await User.findByUsername(username);
      if (usernameExists) {
        throw new ValidationError('Username already exists', {
          field: 'username',
          reason: 'username_exists'
        });
      }
    }

    // Check for email conflicts if email is being changed
    if (email && email !== existingUser.email) {
      const emailExists = await User.findByEmail(email);
      if (emailExists) {
        throw new ValidationError('Email already exists', {
          field: 'email',
          reason: 'email_exists'
        });
      }
    }

    // Validate station assignments for inspectors
    if (role === 'STATION_INSPECTOR' && stationAssignments && stationAssignments.length === 0) {
      throw new ValidationError('Station assignments are required for STATION_INSPECTOR role', {
        field: 'stationAssignments',
        reason: 'missing_station_assignments'
      });
    }

    // Update user
    const updatedUser = await existingUser.update({
      username,
      email,
      role,
      stationAssignments,
      isActive
    });

    manufacturingLogger.info('User updated successfully', {
      userId: id,
      username: updatedUser.username,
      changes: { username, email, role, stationAssignments, isActive },
      category: 'user_management'
    });

    res.status(200).json(
      manufacturingResponse({
        message: 'User updated successfully',
        user: updatedUser.toPublicJSON()
      }, {
        action: 'user_updated',
        userId: id,
        timestamp: new Date().toISOString()
      })
    );

  } catch (error) {
    manufacturingLogger.error('Failed to update user', {
      error: error.message,
      userId: id,
      changes: { username, email, role, stationAssignments, isActive },
      category: 'user_management'
    });
    throw error;
  }
});

/**
 * Delete user
 * DELETE /api/v1/auth/users/:id
 */
export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { hardDelete = false } = req.query;

  if (!id) {
    throw new ValidationError('User ID is required', {
      field: 'id',
      reason: 'missing_parameter'
    });
  }

  try {
    // Get existing user
    const existingUser = await User.findById(id);
    if (!existingUser) {
      throw new ValidationError('User not found', {
        field: 'id',
        reason: 'user_not_found'
      });
    }

    // Prevent deletion of the last admin user
    if (existingUser.role === 'SYSTEM_ADMIN') {
      const adminCount = await User.countByRole('SYSTEM_ADMIN');
      if (adminCount <= 1) {
        throw new ValidationError('Cannot delete the last system administrator', {
          field: 'id',
          reason: 'last_admin_protection'
        });
      }
    }

    // Delete user (soft delete by default)
    const deleted = await existingUser.delete(hardDelete === 'true');

    manufacturingLogger.info('User deleted successfully', {
      userId: id,
      username: existingUser.username,
      hardDelete: hardDelete === 'true',
      category: 'user_management'
    });

    res.status(200).json(
      manufacturingResponse({
        message: hardDelete === 'true' ? 'User permanently deleted' : 'User deactivated',
        userId: id,
        username: existingUser.username
      }, {
        action: hardDelete === 'true' ? 'user_hard_deleted' : 'user_soft_deleted',
        userId: id,
        timestamp: new Date().toISOString()
      })
    );

  } catch (error) {
    manufacturingLogger.error('Failed to delete user', {
      error: error.message,
      userId: id,
      hardDelete: hardDelete === 'true',
      category: 'user_management'
    });
    throw error;
  }
});

/**
 * Get user statistics
 * GET /api/v1/auth/users/stats
 */
export const getUserStats = asyncHandler(async (req, res) => {
  try {
    const stats = await User.getStatistics();

    manufacturingLogger.info('User statistics retrieved', {
      totalUsers: stats.totalUsers,
      activeUsers: stats.activeUsers,
      category: 'user_management'
    });

    res.status(200).json(
      successResponse('User statistics retrieved', {
        statistics: stats,
        timestamp: new Date().toISOString()
      })
    );

  } catch (error) {
    manufacturingLogger.error('Failed to retrieve user statistics', {
      error: error.message,
      category: 'user_management'
    });
    throw error;
  }
});

/**
 * Reset user password (admin only)
 * POST /api/v1/auth/users/:id/reset-password
 */
export const resetUserPassword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!id) {
    throw new ValidationError('User ID is required', {
      field: 'id',
      reason: 'missing_parameter'
    });
  }

  if (!newPassword) {
    throw new ValidationError('New password is required', {
      field: 'newPassword',
      reason: 'missing_parameter'
    });
  }

  try {
    // Get existing user
    const existingUser = await User.findById(id);
    if (!existingUser) {
      throw new ValidationError('User not found', {
        field: 'id',
        reason: 'user_not_found'
      });
    }

    // Update password
    await existingUser.updatePassword(newPassword);

    manufacturingLogger.info('User password reset by admin', {
      userId: id,
      username: existingUser.username,
      adminUserId: req.user?.id,
      category: 'user_management'
    });

    res.status(200).json(
      manufacturingResponse({
        message: 'User password reset successfully',
        userId: id,
        username: existingUser.username
      }, {
        action: 'user_password_reset',
        userId: id,
        adminUserId: req.user?.id,
        timestamp: new Date().toISOString()
      })
    );

  } catch (error) {
    manufacturingLogger.error('Failed to reset user password', {
      error: error.message,
      userId: id,
      adminUserId: req.user?.id,
      category: 'user_management'
    });
    throw error;
  }
});

// Export all controller functions
export default {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserStats,
  resetUserPassword
};
