// ===================================
// AUTHSERVICE.JS
// Authentication Service Layer
// ===================================

const User = require('../models/User');
const Session = require('../models/Session');
const LoginAttempt = require('../models/LoginAttempt');
const { generateAccessToken, verifyToken } = require('../config/jwt');
const bcrypt = require('bcryptjs');

class AuthService {
  /**
   * Register a new user
   * @param {string} username - Username
   * @param {string} fingerprintHash - Device fingerprint hash
   * @returns {Object} - Created user data
   */
  static async register(username, fingerprintHash) {
    // Check if username exists
    if (User.exists(username)) {
      throw {
        status: 400,
        message: 'Username already taken',
        code: 'USERNAME_EXISTS'
      };
    }

    // Check if fingerprint exists
    if (User.fingerprintExists(fingerprintHash)) {
      throw {
        status: 400,
        message: 'Device already registered',
        code: 'DEVICE_REGISTERED'
      };
    }

    // Create pending user
    const user = User.create({ username, fingerprintHash });

    return {
      id: user.id,
      username: user.username,
      status: user.status
    };
  }

  /**
   * Authenticate user
   * @param {string} username - Username
   * @param {string} password - Password
   * @param {string} fingerprintHash - Device fingerprint hash
   * @param {string} ipAddress - IP address
   * @returns {Object} - Token and user data
   */
  static async login(username, password, fingerprintHash, ipAddress) {
    // Check rate limiting
    if (LoginAttempt.isRateLimited(username, 5, 15)) {
      throw {
        status: 429,
        message: 'Too many failed login attempts. Please try again later.',
        code: 'RATE_LIMITED'
      };
    }

    // Check IP rate limiting
    if (LoginAttempt.isIPRateLimited(ipAddress, 10, 15)) {
      throw {
        status: 429,
        message: 'Too many login attempts from your IP. Please try again later.',
        code: 'IP_RATE_LIMITED'
      };
    }

    // Find user
    const user = User.findByUsername(username);

    if (!user) {
      LoginAttempt.logFailure(username, fingerprintHash, ipAddress, 'User not found');
      throw {
        status: 401,
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      };
    }

    // Check user status
    if (user.status === 'pending') {
      LoginAttempt.logFailure(username, fingerprintHash, ipAddress, 'User pending approval');
      throw {
        status: 403,
        message: 'Your account is pending admin approval',
        code: 'ACCOUNT_PENDING',
        reason: 'account_pending'
      };
    }

    if (user.status === 'blocked') {
      LoginAttempt.logFailure(username, fingerprintHash, ipAddress, 'User blocked');
      throw {
        status: 403,
        message: 'Your account has been blocked',
        code: 'ACCOUNT_BLOCKED',
        reason: 'account_blocked',
        blockedReason: user.blocked_reason
      };
    }

    // Verify password
    if (!user.password_hash || !bcrypt.compareSync(password, user.password_hash)) {
      LoginAttempt.logFailure(username, fingerprintHash, ipAddress, 'Invalid password');
      throw {
        status: 401,
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      };
    }

    // Verify fingerprint
    if (user.fingerprint_hash !== fingerprintHash) {
      LoginAttempt.logFailure(username, fingerprintHash, ipAddress, 'Fingerprint mismatch');
      throw {
        status: 403,
        message: 'Device not authorized. Please use the device you registered with.',
        code: 'FINGERPRINT_MISMATCH',
        reason: 'fingerprint_mismatch'
      };
    }

    // Generate JWT token
    const token = generateAccessToken(user);

    // Create session
    Session.create(user.id, token);

    // Update last login
    User.updateLastLogin(user.id);

    // Log successful login
    LoginAttempt.logSuccess(username, fingerprintHash, ipAddress);

    return {
      token,
      user: User.format(user)
    };
  }

  /**
   * Logout user
   * @param {string} token - JWT token
   * @returns {boolean} - Success status
   */
  static async logout(token) {
    if (token) {
      Session.delete(token);
    }
    return true;
  }

  /**
   * Verify token and get user
   * @param {string} token - JWT token
   * @returns {Object} - User data
   */
  static async verifyToken(token) {
    const verification = verifyToken(token);

    if (!verification.valid) {
      throw {
        status: 401,
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      };
    }

    // Check if session exists
    const session = Session.findByToken(token);

    if (!session) {
      throw {
        status: 401,
        message: 'Session not found or expired',
        code: 'SESSION_EXPIRED'
      };
    }

    // Get user
    const user = User.findById(verification.decoded.id);

    if (!user || user.status !== 'active') {
      throw {
        status: 401,
        message: 'User not found or inactive',
        code: 'USER_INACTIVE'
      };
    }

    return User.format(user);
  }

  /**
   * Get current user
   * @param {number} userId - User ID
   * @returns {Object} - User data
   */
  static async getCurrentUser(userId) {
    const user = User.findById(userId);

    if (!user) {
      throw {
        status: 404,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      };
    }

    return User.format(user);
  }

  /**
   * Change password
   * @param {number} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {boolean} - Success status
   */
  static async changePassword(userId, currentPassword, newPassword) {
    const user = User.findById(userId);

    if (!user) {
      throw {
        status: 404,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      };
    }

    // Verify current password
    if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
      throw {
        status: 401,
        message: 'Current password is incorrect',
        code: 'INVALID_PASSWORD'
      };
    }

    // Update password
    const success = User.changePassword(userId, newPassword);

    if (!success) {
      throw {
        status: 500,
        message: 'Failed to change password',
        code: 'PASSWORD_CHANGE_FAILED'
      };
    }

    return true;
  }

  /**
   * Refresh session
   * @param {string} token - Current token
   * @returns {Object} - New token
   */
  static async refreshSession(token) {
    const verification = verifyToken(token);

    if (!verification.valid) {
      throw {
        status: 401,
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      };
    }

    const user = User.findById(verification.decoded.id);

    if (!user || user.status !== 'active') {
      throw {
        status: 401,
        message: 'User not found or inactive',
        code: 'USER_INACTIVE'
      };
    }

    // Generate new token
    const newToken = generateAccessToken(user);

    // Delete old session and create new one
    Session.delete(token);
    Session.create(user.id, newToken);

    return { token: newToken };
  }

  /**
   * Validate fingerprint
   * @param {number} userId - User ID
   * @param {string} fingerprintHash - Fingerprint to validate
   * @returns {boolean} - Validation result
   */
  static async validateFingerprint(userId, fingerprintHash) {
    const user = User.findById(userId);

    if (!user) {
      return false;
    }

    return user.fingerprint_hash === fingerprintHash;
  }

  /**
   * Get user permissions
   * @param {number} userId - User ID
   * @returns {Object} - User permissions
   */
  static async getPermissions(userId) {
    return User.getPermissions(userId);
  }

  /**
   * Check if user has permission
   * @param {number} userId - User ID
   * @param {string} permission - Permission to check
   * @returns {boolean} - Has permission
   */
  static async hasPermission(userId, permission) {
    return User.hasPermission(userId, permission);
  }
}

module.exports = AuthService;
