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

export default {
  successResponse,
  errorResponse,
  manufacturingResponse,
  validationErrorResponse,
  paginatedResponse
};
