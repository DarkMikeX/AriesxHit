// Validation utilities for Admin Panel

/**
 * Validate password (must match backend requirements)
 */
export function validatePassword(password) {
  if (!password || password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }

  if (password.length > 128) {
    return { valid: false, error: 'Password must be less than 128 characters' };
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasLetter || !hasNumber) {
    return { valid: false, error: 'Password must contain at least one letter and one number' };
  }

  return { valid: true };
}

/**
 * Validate username
 */
export function validateUsername(username) {
  if (!username || username.trim().length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }

  if (username.length > 30) {
    return { valid: false, error: 'Username must be less than 30 characters' };
  }

  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(username)) {
    return { valid: false, error: 'Username can only contain letters, numbers, underscore, and hyphen' };
  }

  return { valid: true };
}

/**
 * Validate permissions object
 */
export function validatePermissions(permissions) {
  if (!permissions || typeof permissions !== 'object') {
    return { valid: false, error: 'Permissions must be an object' };
  }

  const allowedKeys = ['auto_hit', 'bypass', 'admin'];
  for (const key of Object.keys(permissions)) {
    if (!allowedKeys.includes(key)) {
      return { valid: false, error: `Invalid permission: ${key}` };
    }
    if (typeof permissions[key] !== 'boolean') {
      return { valid: false, error: `Permission ${key} must be a boolean` };
    }
  }

  return { valid: true };
}

export default {
  validatePassword,
  validateUsername,
  validatePermissions,
};
