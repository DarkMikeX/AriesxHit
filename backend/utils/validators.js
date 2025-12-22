// ===================================
// VALIDATORS.JS
// Input Validation Utilities
// ===================================

/**
 * Validate username
 */
function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, message: 'Username is required' };
  }

  if (username.length < 3) {
    return { valid: false, message: 'Username must be at least 3 characters' };
  }

  if (username.length > 30) {
    return { valid: false, message: 'Username must be less than 30 characters' };
  }

  // Allow alphanumeric, underscore, and hyphen
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(username)) {
    return { valid: false, message: 'Username can only contain letters, numbers, underscore, and hyphen' };
  }

  return { valid: true };
}

/**
 * Validate password
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }

  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }

  if (password.length > 128) {
    return { valid: false, message: 'Password must be less than 128 characters' };
  }

  // Check for at least one letter and one number
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasLetter || !hasNumber) {
    return { valid: false, message: 'Password must contain at least one letter and one number' };
  }

  return { valid: true };
}

/**
 * Validate fingerprint hash
 */
function validateFingerprintHash(hash) {
  if (!hash || typeof hash !== 'string') {
    return { valid: false, message: 'Fingerprint hash is required' };
  }

  // SHA-256 hash is 64 hex characters
  const sha256Regex = /^[a-f0-9]{64}$/i;

  if (!sha256Regex.test(hash)) {
    return { valid: false, message: 'Invalid fingerprint hash format' };
  }

  return { valid: true };
}

/**
 * Validate email
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, message: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return { valid: false, message: 'Invalid email format' };
  }

  return { valid: true };
}

/**
 * Validate permissions object
 */
function validatePermissions(permissions) {
  if (!permissions || typeof permissions !== 'object') {
    return { valid: false, message: 'Permissions must be an object' };
  }

  const allowedPermissions = ['auto_hit', 'bypass', 'admin'];

  for (const key in permissions) {
    if (!allowedPermissions.includes(key)) {
      return { valid: false, message: `Invalid permission: ${key}` };
    }

    if (typeof permissions[key] !== 'boolean') {
      return { valid: false, message: `Permission ${key} must be a boolean` };
    }
  }

  return { valid: true };
}

/**
 * Sanitize string input
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[<>]/g, '');
}

/**
 * Validate ID
 */
function validateId(id) {
  const numId = parseInt(id);

  if (isNaN(numId) || numId <= 0) {
    return { valid: false, message: 'Invalid ID' };
  }

  return { valid: true, id: numId };
}

module.exports = {
  validateUsername,
  validatePassword,
  validateFingerprintHash,
  validateEmail,
  validatePermissions,
  sanitizeString,
  validateId
};
