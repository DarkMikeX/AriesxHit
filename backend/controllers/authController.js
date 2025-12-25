// ===================================
// AUTHCONTROLLER.JS
// Authentication Controller
// ===================================

const User = require('../models/User');
const Session = require('../models/Session');
const LoginAttempt = require('../models/LoginAttempt');
const { generateAccessToken } = require('../config/jwt');
const bcrypt = require('bcryptjs');

class AuthController {
  // ===================================
  // REGISTER
  // ===================================

  /**
   * Register new user (pending approval)
   * POST /api/auth/register
   */
  static async register(req, res) {
    try {
      const { username, fingerprintHash, email, telegram } = req.body;

      // Validate input
      if (!username || !fingerprintHash) {
        return res.status(400).json({
          success: false,
          message: 'Username and fingerprint are required'
        });
      }

      // Check if username exists
      if (User.exists(username)) {
        return res.status(400).json({
          success: false,
          message: 'Username already taken'
        });
      }

      // Check if fingerprint exists
      if (User.fingerprintExists(fingerprintHash)) {
        return res.status(400).json({
          success: false,
          message: 'Device already registered'
        });
      }

      // Create pending user
      const user = User.create({ username, fingerprintHash });

      // Format response (email and telegram are accepted but not stored in current schema)
      const formattedUser = User.format(user);
      if (email) formattedUser.email = email;
      if (telegram) formattedUser.telegram = telegram;

      res.status(201).json({
        success: true,
        message: 'Registration successful. Waiting for admin approval.',
        data: formattedUser,
        user: formattedUser  // Also include 'user' key for compatibility
      });

    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: error.message
      });
    }
  }

  // ===================================
  // LOGIN
  // ===================================

  /**
   * User login with triple authentication
   * POST /api/auth/login
   */
  static async login(req, res) {
    try {
      const { username, password, fingerprintHash } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;

      // Validate input
      if (!username || !password || !fingerprintHash) {
        LoginAttempt.logFailure(username, fingerprintHash, ipAddress, 'Missing credentials');
        return res.status(400).json({
          success: false,
          message: 'Username, password, and fingerprint are required'
        });
      }

      // Check rate limiting
      if (LoginAttempt.isRateLimited(username, 5, 15)) {
        LoginAttempt.logFailure(username, fingerprintHash, ipAddress, 'Rate limited');
        return res.status(429).json({
          success: false,
          message: 'Too many failed login attempts. Please try again later.'
        });
      }

      // Check IP rate limiting
      if (LoginAttempt.isIPRateLimited(ipAddress, 10, 15)) {
        LoginAttempt.logFailure(username, fingerprintHash, ipAddress, 'IP rate limited');
        return res.status(429).json({
          success: false,
          message: 'Too many login attempts from your IP. Please try again later.'
        });
      }

      // Find user
      const user = User.findByUsername(username);

      if (!user) {
        LoginAttempt.logFailure(username, fingerprintHash, ipAddress, 'User not found');
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Check user status
      if (user.status === 'pending') {
        LoginAttempt.logFailure(username, fingerprintHash, ipAddress, 'User pending approval');
        return res.status(403).json({
          success: false,
          message: 'Your account is pending admin approval'
        });
      }

      if (user.status === 'blocked') {
        LoginAttempt.logFailure(username, fingerprintHash, ipAddress, 'User blocked');
        return res.status(403).json({
          success: false,
          message: 'Your account has been blocked',
          reason: user.blocked_reason
        });
      }

      // Verify password
      if (!user.password_hash || !bcrypt.compareSync(password, user.password_hash)) {
        LoginAttempt.logFailure(username, fingerprintHash, ipAddress, 'Invalid password');
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Verify fingerprint
      if (user.fingerprint_hash !== fingerprintHash) {
        LoginAttempt.logFailure(username, fingerprintHash, ipAddress, 'Fingerprint mismatch');
        return res.status(401).json({
          success: false,
          message: 'Device not authorized. Please use the device you registered with.'
        });
      }

      // Generate JWT token
      const token = generateAccessToken(user);

      // Create session
      Session.create(user.id, token);

      // Update last login
      User.updateLastLogin(user.id);

      // Log successful login
      LoginAttempt.logSuccess(username, fingerprintHash, ipAddress);

      // Return success
      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: User.format(user)
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: error.message
      });
    }
  }

  // ===================================
  // LOGOUT
  // ===================================

  /**
   * User logout
   * POST /api/auth/logout
   */
  static async logout(req, res) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (token) {
        Session.delete(token);
      }

      res.json({
        success: true,
        message: 'Logout successful'
      });

    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed',
        error: error.message
      });
    }
  }

  // ===================================
  // VERIFY TOKEN
  // ===================================

  /**
   * Verify JWT token
   * GET /api/auth/verify
   */
  static async verify(req, res) {
    try {
      // Token is already verified by authenticate middleware
      const user = User.findById(req.user.id);

      if (!user || user.status !== 'active') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      }

      res.json({
        success: true,
        message: 'Token is valid',
        data: {
          user: User.format(user)
        }
      });

    } catch (error) {
      console.error('Verify error:', error);
      res.status(500).json({
        success: false,
        message: 'Token verification failed',
        error: error.message
      });
    }
  }

  // ===================================
  // GET CURRENT USER
  // ===================================

  /**
   * Get current authenticated user
   * GET /api/auth/me
   */
  static async me(req, res) {
    try {
      const user = User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: {
          user: User.format(user)
        }
      });

    } catch (error) {
      console.error('Me error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user data',
        error: error.message
      });
    }
  }

  // ===================================
  // CHECK REGISTRATION
  // ===================================

  /**
   * Check if fingerprint is already registered
   * POST /api/auth/check
   */
  static async check(req, res) {
    try {
      const { fingerprintHash } = req.body;

      if (!fingerprintHash) {
        return res.status(400).json({
          success: false,
          message: 'Fingerprint hash is required'
        });
      }

      // Find user by fingerprint
      const user = User.findByFingerprint(fingerprintHash);

      if (user) {
        return res.json({
          success: true,
          exists: true,
          user: User.format(user)
        });
      }

      res.json({
        success: true,
        exists: false
      });

    } catch (error) {
      console.error('Check error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check registration',
        error: error.message
      });
    }
  }

  // ===================================
  // GET STATUS BY FINGERPRINT
  // ===================================

  /**
   * Get user status by fingerprint (public endpoint)
   * GET /api/auth/status
   */
  static async getStatus(req, res) {
    try {
      const fingerprintHash = req.headers['x-fingerprint'];

      if (!fingerprintHash) {
        return res.status(400).json({
          success: false,
          message: 'Fingerprint hash is required in X-Fingerprint header'
        });
      }

      // Find user by fingerprint
      const user = User.findByFingerprint(fingerprintHash);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        status: user.status,
        user: User.format(user)
      });

    } catch (error) {
      console.error('Get status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get status',
        error: error.message
      });
    }
  }
}

module.exports = AuthController;
