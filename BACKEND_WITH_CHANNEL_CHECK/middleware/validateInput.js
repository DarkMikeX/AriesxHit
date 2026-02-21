// ===================================
// VALIDATEINPUT.JS
// Input Validation Middleware
// ===================================

const validators = require('../utils/validators');

/**
 * Validation schemas
 */
const schemas = {
  // Auth schemas
  register: {
    username: {
      required: true,
      validator: validators.validateUsername
    },
    fingerprintHash: {
      required: true,
      validator: validators.validateFingerprintHash
    }
  },

  login: {
    username: {
      required: true,
      validator: validators.validateUsername
    },
    password: {
      required: true,
      type: 'string',
      minLength: 1
    },
    fingerprintHash: {
      required: true,
      validator: validators.validateFingerprintHash
    }
  },

  changePassword: {
    currentPassword: {
      required: true,
      type: 'string',
      minLength: 1
    },
    newPassword: {
      required: true,
      validator: validators.validatePassword
    }
  },

  // Admin schemas
  approveUser: {
    password: {
      required: true,
      validator: validators.validatePassword
    },
    permissions: {
      required: true,
      validator: validators.validatePermissions
    }
  },

  blockUser: {
    reason: {
      required: false,
      type: 'string',
      maxLength: 500
    }
  },

  updatePermissions: {
    permissions: {
      required: true,
      validator: validators.validatePermissions
    }
  },

  resetPassword: {
    password: {
      required: true,
      validator: validators.validatePassword
    }
  },

  // Common schemas
  userId: {
    id: {
      required: true,
      validator: validators.validateId
    }
  }
};

/**
 * Validate a single field
 */
function validateField(value, fieldName, rules) {
  const errors = [];

  // Check required
  if (rules.required && (value === undefined || value === null || value === '')) {
    errors.push(`${fieldName} is required`);
    return errors;
  }

  // Skip further validation if not required and not provided
  if (!rules.required && (value === undefined || value === null || value === '')) {
    return errors;
  }

  // Check type
  if (rules.type && typeof value !== rules.type) {
    errors.push(`${fieldName} must be a ${rules.type}`);
    return errors;
  }

  // Check min length
  if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
    errors.push(`${fieldName} must be at least ${rules.minLength} characters`);
  }

  // Check max length
  if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
    errors.push(`${fieldName} must be less than ${rules.maxLength} characters`);
  }

  // Check min value
  if (rules.min !== undefined && typeof value === 'number' && value < rules.min) {
    errors.push(`${fieldName} must be at least ${rules.min}`);
  }

  // Check max value
  if (rules.max !== undefined && typeof value === 'number' && value > rules.max) {
    errors.push(`${fieldName} must be at most ${rules.max}`);
  }

  // Check pattern
  if (rules.pattern && !rules.pattern.test(value)) {
    errors.push(`${fieldName} format is invalid`);
  }

  // Check enum
  if (rules.enum && !rules.enum.includes(value)) {
    errors.push(`${fieldName} must be one of: ${rules.enum.join(', ')}`);
  }

  // Run custom validator
  if (rules.validator) {
    const result = rules.validator(value);
    if (!result.valid) {
      errors.push(result.message);
    }
  }

  return errors;
}

/**
 * Validate request body against schema
 */
function validateBody(schema) {
  return (req, res, next) => {
    if (!schema) {
      return next();
    }

    const errors = [];

    for (const [fieldName, rules] of Object.entries(schema)) {
      const value = req.body[fieldName];
      const fieldErrors = validateField(value, fieldName, rules);
      errors.push(...fieldErrors);
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    next();
  };
}

/**
 * Validate request params against schema
 */
function validateParams(schema) {
  return (req, res, next) => {
    if (!schema) {
      return next();
    }

    const errors = [];

    // Handle schema with field names (like userId: { id: {...} })
    for (const [fieldName, rules] of Object.entries(schema)) {
      // For route params like /:id, the param name is 'id', not the schema key name
      // So if schema has { id: {...} }, check req.params.id
      // If schema has { userId: {...} }, check req.params.userId
      const paramName = fieldName === 'id' ? 'id' : fieldName;
      const value = req.params[paramName];
      
      if (value !== undefined) {
        const fieldErrors = validateField(value, fieldName, rules);
        errors.push(...fieldErrors);
      } else if (rules.required) {
        errors.push(`${paramName} is required`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    next();
  };
}

/**
 * Validate request query against schema
 */
function validateQuery(schema) {
  return (req, res, next) => {
    if (!schema) {
      return next();
    }

    const errors = [];

    for (const [fieldName, rules] of Object.entries(schema)) {
      const value = req.query[fieldName];
      const fieldErrors = validateField(value, fieldName, rules);
      errors.push(...fieldErrors);
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    next();
  };
}

/**
 * Sanitize request body
 */
function sanitizeBody(fields) {
  return (req, res, next) => {
    if (!req.body) {
      return next();
    }

    for (const field of fields) {
      if (req.body[field] && typeof req.body[field] === 'string') {
        req.body[field] = validators.sanitizeString(req.body[field]);
      }
    }

    next();
  };
}

/**
 * Trim all string fields in body
 */
function trimBody(req, res, next) {
  if (!req.body) {
    return next();
  }

  for (const key in req.body) {
    if (typeof req.body[key] === 'string') {
      req.body[key] = req.body[key].trim();
    }
  }

  next();
}

/**
 * Validate content type
 */
function validateContentType(contentType = 'application/json') {
  return (req, res, next) => {
    if (req.method === 'GET' || req.method === 'DELETE') {
      return next();
    }

    const reqContentType = req.get('Content-Type');

    if (!reqContentType || !reqContentType.includes(contentType)) {
      return res.status(415).json({
        success: false,
        message: `Content-Type must be ${contentType}`
      });
    }

    next();
  };
}

module.exports = {
  schemas,
  validateField,
  validateBody,
  validateParams,
  validateQuery,
  sanitizeBody,
  trimBody,
  validateContentType
};
