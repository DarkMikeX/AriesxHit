// ===================================
// ERRORHANDLER.JS
// Global Error Handling Middleware
// ===================================

const logger = require('../utils/logger');

/**
 * Custom API Error class
 */
class APIError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Common error types
 */
const ErrorTypes = {
  BAD_REQUEST: (message = 'Bad request') => new APIError(message, 400, 'BAD_REQUEST'),
  UNAUTHORIZED: (message = 'Unauthorized') => new APIError(message, 401, 'UNAUTHORIZED'),
  FORBIDDEN: (message = 'Forbidden') => new APIError(message, 403, 'FORBIDDEN'),
  NOT_FOUND: (message = 'Resource not found') => new APIError(message, 404, 'NOT_FOUND'),
  CONFLICT: (message = 'Conflict') => new APIError(message, 409, 'CONFLICT'),
  VALIDATION: (message = 'Validation failed') => new APIError(message, 422, 'VALIDATION_ERROR'),
  RATE_LIMITED: (message = 'Too many requests') => new APIError(message, 429, 'RATE_LIMITED'),
  INTERNAL: (message = 'Internal server error') => new APIError(message, 500, 'INTERNAL_ERROR')
};

/**
 * Handle development errors (show stack trace)
 */
function handleDevError(err, res) {
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message,
    code: err.code || 'INTERNAL_ERROR',
    stack: err.stack,
    error: err
  });
}

/**
 * Handle production errors (hide stack trace)
 */
function handleProdError(err, res) {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('Unexpected error:', { error: err.message, stack: err.stack });

    res.status(500).json({
      success: false,
      message: 'Something went wrong',
      code: 'INTERNAL_ERROR'
    });
  }
}

/**
 * Handle specific error types
 */
function handleSpecificErrors(err) {
  // SQLite errors
  if (err.code === 'SQLITE_CONSTRAINT') {
    if (err.message.includes('UNIQUE')) {
      return new APIError('Resource already exists', 409, 'DUPLICATE_ENTRY');
    }
    return new APIError('Database constraint violation', 400, 'CONSTRAINT_ERROR');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return new APIError('Invalid token', 401, 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    return new APIError('Token expired', 401, 'TOKEN_EXPIRED');
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return new APIError(err.message, 422, 'VALIDATION_ERROR');
  }

  // Syntax errors (malformed JSON)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return new APIError('Invalid JSON in request body', 400, 'INVALID_JSON');
  }

  return err;
}

/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, next) {
  // Default values
  err.statusCode = err.statusCode || 500;
  err.code = err.code || 'INTERNAL_ERROR';

  // Log error
  logger.error(`[${err.code}] ${err.message}`, {
    path: req.path,
    method: req.method,
    ip: req.ip,
    user: req.user?.id
  });

  // Handle specific error types
  const processedError = handleSpecificErrors(err);

  // Send response based on environment
  if (process.env.NODE_ENV === 'development') {
    handleDevError(processedError, res);
  } else {
    handleProdError(processedError, res);
  }
}

/**
 * Async handler wrapper - catches async errors
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Not found handler
 */
function notFoundHandler(req, res, next) {
  const error = new APIError(
    `Cannot ${req.method} ${req.originalUrl}`,
    404,
    'NOT_FOUND'
  );
  next(error);
}

module.exports = {
  APIError,
  ErrorTypes,
  errorHandler,
  asyncHandler,
  notFoundHandler
};
