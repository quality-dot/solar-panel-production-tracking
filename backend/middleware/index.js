// Middleware exports for production floor reliability
// Security, validation, and logging middleware for manufacturing environment

// Authentication middleware
export { 
  authenticateJWT,
  optionalAuth,
  authorizeRole,
  requirePermission,
  validateStationAssignment,
  requireStationPermission,
  checkTokenRefresh,
  authRateLimitOverride,
  generateToken,
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

// Logging and monitoring middleware
export {
  ManufacturingLogger,
  manufacturingLogger,
  createRequestLogger,
  requestTiming,
  manufacturingActivityTracker,
  errorLogger,
  healthCheckLogger,
  default as loggerMiddleware
} from './logger.js';

// Error handling middleware
export {
  ManufacturingError,
  ValidationError,
  BarcodeError,
  DatabaseError,
  AuthenticationError,
  AuthorizationError,
  StationError,
  WorkflowError,
  ErrorHandler,
  asyncHandler,
  formatErrorResponse,
  globalErrorHandler,
  notFoundHandler,
  setupProcessErrorHandlers,
  default as errorHandlerMiddleware
} from './errorHandler.js';

// Validation middleware
export {
  createValidationMiddleware,
  validateBarcode,
  validateStation,
  validateManufacturingOrder,
  validateInspection,
  validatePallet,
  validatePagination,
  validateDateRange,
  validateSearch,
  validateUser,
  validationHelpers,
  BARCODE_PATTERNS,
  STATION_PATTERNS,
  MO_PATTERNS,
  default as validationMiddleware
} from './validation.js';

// Response standardization middleware
export {
  ResponseFormatter,
  responseTimer,
  addRequestContext,
  optimizeForTablets,
  apiVersioning,
  addManufacturingMetadata,
  standardizeErrors,
  RESPONSE_STRUCTURE,
  default as responseMiddleware
} from './response.js';

// Graceful degradation middleware
export {
  gracefulDegradationMiddleware,
  DEGRADATION_MODES,
  ServiceHealthTracker,
  default as gracefulDegradationMiddleware
} from './gracefulDegradation.js';
