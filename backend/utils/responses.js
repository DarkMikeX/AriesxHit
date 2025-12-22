// ===================================
// RESPONSES.JS
// Standardized API Response Utilities
// ===================================

/**
 * Success response
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 * @param {Object} data - Response data
 * @param {number} statusCode - HTTP status code
 */
function success(res, message = 'Success', data = null, statusCode = 200) {
  const response = {
    success: true,
    message
  };

  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
}

/**
 * Created response (201)
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 * @param {Object} data - Response data
 */
function created(res, message = 'Created successfully', data = null) {
  return success(res, message, data, 201);
}

/**
 * No content response (204)
 * @param {Object} res - Express response object
 */
function noContent(res) {
  return res.status(204).send();
}

/**
 * Error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {string} code - Error code
 * @param {Object} errors - Additional error details
 */
function error(res, message = 'Error', statusCode = 500, code = 'ERROR', errors = null) {
  const response = {
    success: false,
    message,
    code
  };

  if (errors !== null) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
}

/**
 * Bad request response (400)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {Object} errors - Validation errors
 */
function badRequest(res, message = 'Bad request', errors = null) {
  return error(res, message, 400, 'BAD_REQUEST', errors);
}

/**
 * Unauthorized response (401)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
function unauthorized(res, message = 'Unauthorized') {
  return error(res, message, 401, 'UNAUTHORIZED');
}

/**
 * Forbidden response (403)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
function forbidden(res, message = 'Forbidden') {
  return error(res, message, 403, 'FORBIDDEN');
}

/**
 * Not found response (404)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
function notFound(res, message = 'Resource not found') {
  return error(res, message, 404, 'NOT_FOUND');
}

/**
 * Conflict response (409)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
function conflict(res, message = 'Resource already exists') {
  return error(res, message, 409, 'CONFLICT');
}

/**
 * Validation error response (422)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {Object} errors - Validation errors
 */
function validationError(res, message = 'Validation failed', errors = null) {
  return error(res, message, 422, 'VALIDATION_ERROR', errors);
}

/**
 * Too many requests response (429)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} retryAfter - Seconds until retry is allowed
 */
function tooManyRequests(res, message = 'Too many requests', retryAfter = null) {
  if (retryAfter) {
    res.setHeader('Retry-After', retryAfter);
  }
  return error(res, message, 429, 'RATE_LIMITED');
}

/**
 * Internal server error response (500)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
function serverError(res, message = 'Internal server error') {
  return error(res, message, 500, 'INTERNAL_ERROR');
}

/**
 * Paginated response
 * @param {Object} res - Express response object
 * @param {Array} items - Items array
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total items count
 * @param {string} message - Success message
 */
function paginated(res, items, page, limit, total, message = 'Success') {
  const totalPages = Math.ceil(total / limit);
  
  return res.status(200).json({
    success: true,
    message,
    data: {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }
  });
}

/**
 * List response (with count)
 * @param {Object} res - Express response object
 * @param {Array} items - Items array
 * @param {string} itemName - Name for the items (e.g., 'users')
 * @param {string} message - Success message
 */
function list(res, items, itemName = 'items', message = 'Success') {
  return res.status(200).json({
    success: true,
    message,
    data: {
      [itemName]: items,
      count: items.length
    }
  });
}

/**
 * Wrap async route handler
 * Catches errors and passes to error handler
 * @param {Function} fn - Async function
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Create response helpers bound to response object
 * @param {Object} res - Express response object
 * @returns {Object} - Bound response helpers
 */
function createResponseHelpers(res) {
  return {
    success: (message, data) => success(res, message, data),
    created: (message, data) => created(res, message, data),
    noContent: () => noContent(res),
    error: (message, statusCode, code, errors) => error(res, message, statusCode, code, errors),
    badRequest: (message, errors) => badRequest(res, message, errors),
    unauthorized: (message) => unauthorized(res, message),
    forbidden: (message) => forbidden(res, message),
    notFound: (message) => notFound(res, message),
    conflict: (message) => conflict(res, message),
    validationError: (message, errors) => validationError(res, message, errors),
    tooManyRequests: (message, retryAfter) => tooManyRequests(res, message, retryAfter),
    serverError: (message) => serverError(res, message),
    paginated: (items, page, limit, total, message) => paginated(res, items, page, limit, total, message),
    list: (items, itemName, message) => list(res, items, itemName, message)
  };
}

module.exports = {
  success,
  created,
  noContent,
  error,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  validationError,
  tooManyRequests,
  serverError,
  paginated,
  list,
  asyncHandler,
  createResponseHelpers
};
