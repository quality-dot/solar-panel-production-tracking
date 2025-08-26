// Utility functions for manufacturing operations
// Helper functions for barcode processing, validation, and manufacturing logic

export { 
  successResponse, 
  errorResponse, 
  manufacturingResponse, 
  validationErrorResponse, 
  paginatedResponse,
  default as responseUtils 
} from './responseUtils.js';

// Authentication utilities
export {
  TOKEN_TYPES,
  TOKEN_EXPIRY,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  extractTokenFromHeader,
  generateTokenPair,
  validateTokenPayload,
  needsRefresh,
  getTokenExpiration,
  default as jwtUtils
} from './jwt.js';

export {
  PASSWORD_POLICY,
  hashPassword,
  comparePassword,
  validatePasswordPolicy,
  getPasswordStrength,
  generateTemporaryPassword,
  checkPasswordBreach,
  default as passwordUtils
} from './password.js';

// Permissions and role management
export {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  PERMISSION_CATEGORIES,
  hasPermission,
  getRolePermissions,
  hasAnyPermission,
  hasAllPermissions,
  getRolePermissionCategories,
  hasStationPermission,
  getPermissionDescription,
  default as permissionUtils
} from './permissions.js';

// Placeholder exports for future utility modules
// export { default as barcodeUtils } from './barcodeUtils.js';
// export { default as validationUtils } from './validationUtils.js';
// export { default as dateUtils } from './dateUtils.js';
// export { default as manufacturingUtils } from './manufacturingUtils.js';
