// Middleware exports for production floor reliability
// Security, validation, and logging middleware for manufacturing environment

// Authentication middleware
export { 
  authenticateJWT,
  authorizeRole,
  validateStationAssignment,
  optionalAuth,
  generateToken,
  checkTokenRefresh,
  default as authMiddleware 
} from './auth.js';

// Security middleware
export {
  helmetConfig,
  manufacturingRateLimit,
  authRateLimit,
  stationIdentification,
  corsPreflightHandler,
  requestSizeLimit,
  default as securityMiddleware
} from './security.js';

// Placeholder exports for future middleware modules
// export { default as validationMiddleware } from './validation.js';
// export { default as errorHandler } from './errorHandler.js';
// export { default as logger } from './logger.js';
