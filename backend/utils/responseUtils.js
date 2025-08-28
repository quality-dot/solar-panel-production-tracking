// Response utility functions for manufacturing API
// Standardized response formatting and error handling

/**
 * Standard success response format
 * @param {Object} data - Response data
 * @param {string} message - Success message
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Standardized success response
 */
export const successResponse = (data = null, message = 'Success', metadata = {}) => {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
    ...metadata
  };
};

/**
 * Standard error response format
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {Object} details - Additional error details
 * @returns {Object} Standardized error response
 */
export const errorResponse = (message = 'An error occurred', statusCode = 500, details = {}) => {
  return {
    success: false,
    error: message,
    statusCode,
    timestamp: new Date().toISOString(),
    ...details
  };
};

/**
 * Manufacturing-specific response with station context
 * @param {Object} data - Response data
 * @param {string} stationId - Station identifier
 * @param {string} lineNumber - Production line number
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Manufacturing context response
 */
export const manufacturingResponse = (data, stationId = null, lineNumber = null, metadata = {}) => {
  const response = successResponse(data, 'Manufacturing operation completed', metadata);
  
  if (stationId) {
    response.station = {
      id: stationId,
      line: lineNumber,
      timestamp: response.timestamp
    };
  }
  
  return response;
};

/**
 * Validation error response for manufacturing data
 * @param {Array} errors - Array of validation errors
 * @param {string} context - Context where validation failed
 * @returns {Object} Validation error response
 */
export const validationErrorResponse = (errors = [], context = 'input validation') => {
  return {
    success: false,
    error: 'Validation failed',
    context,
    validationErrors: errors,
    timestamp: new Date().toISOString()
  };
};

/**
 * Paginated response format
 * @param {Array} data - Array of data items
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @returns {Object} Paginated response
 */
export const paginatedResponse = (data, page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  
  return successResponse(data, 'Data retrieved successfully', {
    pagination: {
      currentPage: page,
      itemsPerPage: limit,
      totalItems: total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    }
  });
};

/**
 * Real-time manufacturing update response
 * @param {Object} data - Update data
 * @param {string} updateType - Type of update (status_change, quality_check, etc.)
 * @param {string} stationId - Station identifier
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Real-time update response
 */
export const realTimeUpdateResponse = (data, updateType, stationId = null, metadata = {}) => {
  return successResponse(data, 'Real-time update received', {
    updateType,
    stationId,
    realTime: true,
    sequenceId: Date.now(),
    ...metadata
  });
};

/**
 * Offline sync response for PWA
 * @param {Object} data - Sync data
 * @param {string} syncType - Type of sync (upload, download, conflict_resolution)
 * @param {number} pendingItems - Number of items waiting to sync
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Offline sync response
 */
export const offlineSyncResponse = (data, syncType, pendingItems = 0, metadata = {}) => {
  return successResponse(data, 'Offline sync completed', {
    syncType,
    pendingItems,
    offline: true,
    lastSync: new Date().toISOString(),
    ...metadata
  });
};

/**
 * Manufacturing order progress response
 * @param {Object} data - MO data
 * @param {string} moId - Manufacturing order ID
 * @param {string} status - Current MO status
 * @param {number} progress - Progress percentage (0-100)
 * @param {Object} metadata - Additional metadata
 * @returns {Object} MO progress response
 */
export const moProgressResponse = (data, moId, status, progress, metadata = {}) => {
  return successResponse(data, 'Manufacturing order progress updated', {
    moId,
    status,
    progress,
    estimatedCompletion: metadata.estimatedCompletion || null,
    ...metadata
  });
};

/**
 * Quality inspection response
 * @param {Object} data - Inspection data
 * @param {string} panelId - Panel identifier
 * @param {string} stationId - Station identifier
 * @param {string} result - Pass/Fail/Review
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Quality inspection response
 */
export const qualityInspectionResponse = (data, panelId, stationId, result, metadata = {}) => {
  return successResponse(data, 'Quality inspection completed', {
    panelId,
    stationId,
    result,
    qualityScore: metadata.qualityScore || null,
    criteria: metadata.criteria || [],
    ...metadata
  });
};

/**
 * Station workflow response
 * @param {Object} data - Workflow data
 * @param {string} stationId - Station identifier
 * @param {string} workflowStep - Current workflow step
 * @param {string} nextStep - Next workflow step
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Station workflow response
 */
export const stationWorkflowResponse = (data, stationId, workflowStep, nextStep = null, metadata = {}) => {
  return successResponse(data, 'Workflow step completed', {
    stationId,
    workflowStep,
    nextStep,
    workflowProgress: metadata.workflowProgress || null,
    estimatedDuration: metadata.estimatedDuration || null,
    ...metadata
  });
};

/**
 * Barcode processing response
 * @param {Object} data - Barcode data
 * @param {string} barcode - Processed barcode
 * @param {string} lineNumber - Assigned production line
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Barcode processing response
 */
export const barcodeProcessingResponse = (data, barcode, lineNumber, metadata = {}) => {
  return successResponse(data, 'Barcode processed successfully', {
    barcode,
    lineNumber,
    processingTime: metadata.processingTime || null,
    validationResults: metadata.validationResults || [],
    ...metadata
  });
};

/**
 * System health response
 * @param {Object} data - Health data
 * @param {string} status - System status (healthy, degraded, critical)
 * @param {Object} components - Component health status
 * @param {Object} metadata - Additional metadata
 * @returns {Object} System health response
 */
export const systemHealthResponse = (data, status, components = {}, metadata = {}) => {
  return successResponse(data, 'System health status', {
    status,
    components,
    uptime: metadata.uptime || null,
    lastCheck: new Date().toISOString(),
    ...metadata
  });
};

/**
 * Batch operation response
 * @param {Object} data - Batch operation data
 * @param {string} operationType - Type of batch operation
 * @param {number} totalItems - Total items processed
 * @param {number} successCount - Successfully processed items
 * @param {number} failureCount - Failed items
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Batch operation response
 */
export const batchOperationResponse = (data, operationType, totalItems, successCount, failureCount, metadata = {}) => {
  return successResponse(data, 'Batch operation completed', {
    operationType,
    totalItems,
    successCount,
    failureCount,
    successRate: (successCount / totalItems) * 100,
    failures: metadata.failures || [],
    ...metadata
  });
};

/**
 * Enhanced metadata response with manufacturing context
 * @param {Object} data - Response data
 * @param {Object} metadata - Base metadata
 * @param {Object} manufacturingContext - Manufacturing-specific context
 * @returns {Object} Enhanced response with manufacturing context
 */
export const enhancedManufacturingResponse = (data, metadata = {}, manufacturingContext = {}) => {
  const baseResponse = successResponse(data, 'Manufacturing operation completed', metadata);
  
  // Add manufacturing context
  if (manufacturingContext.station) {
    baseResponse.manufacturingContext = {
      station: manufacturingContext.station,
      line: manufacturingContext.line,
      shift: manufacturingContext.shift,
      operator: manufacturingContext.operator,
      timestamp: baseResponse.timestamp
    };
  }
  
  // Add performance metrics if available
  if (manufacturingContext.performance) {
    baseResponse.performance = {
      processingTime: manufacturingContext.performance.processingTime,
      throughput: manufacturingContext.performance.throughput,
      efficiency: manufacturingContext.performance.efficiency
    };
  }
  
  return baseResponse;
};

/**
 * Response with rate limiting information
 * @param {Object} data - Response data
 * @param {Object} rateLimitInfo - Rate limiting details
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Response with rate limit info
 */
export const rateLimitedResponse = (data, rateLimitInfo, metadata = {}) => {
  return successResponse(data, 'Request processed', {
    rateLimit: {
      remaining: rateLimitInfo.remaining,
      reset: rateLimitInfo.reset,
      limit: rateLimitInfo.limit
    },
    ...metadata
  });
};

export default {
  successResponse,
  errorResponse,
  manufacturingResponse,
  validationErrorResponse,
  paginatedResponse,
  realTimeUpdateResponse,
  offlineSyncResponse,
  moProgressResponse,
  qualityInspectionResponse,
  stationWorkflowResponse,
  barcodeProcessingResponse,
  systemHealthResponse,
  batchOperationResponse,
  enhancedManufacturingResponse,
  rateLimitedResponse
};
