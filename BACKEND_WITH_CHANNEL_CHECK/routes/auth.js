// ===================================
// AUTH.JS
// Authentication Routes
// ===================================

const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authenticate } = require('../middleware/authenticate');
const { validateFingerprintFormat } = require('../middleware/validateFingerprint');
const { validateBody, schemas } = require('../middleware/validateInput');
const { authLimiter, registerLimiter } = require('../middleware/rateLimiter');

// ===================================
// PUBLIC ROUTES
// ===================================

/**
 * @route   POST /api/auth/register
 * @desc    Register new user (pending approval)
 * @access  Public
 */
router.post(
  '/register',
  registerLimiter,
  validateBody(schemas.register),
  validateFingerprintFormat,
  AuthController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user with triple authentication
 * @access  Public
 */
router.post(
  '/login',
  authLimiter,
  validateBody(schemas.login),
  validateFingerprintFormat,
  AuthController.login
);

/**
 * @route   POST /api/auth/check
 * @desc    Check if fingerprint is already registered
 * @access  Public
 */
router.post(
  '/check',
  registerLimiter,
  AuthController.check
);

/**
 * @route   GET /api/auth/status
 * @desc    Get user status by fingerprint
 * @access  Public
 */
router.get(
  '/status',
  AuthController.getStatus
);

// ===================================
// PROTECTED ROUTES
// ===================================

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (invalidate session)
 * @access  Private
 */
router.post('/logout', authenticate, AuthController.logout);

/**
 * @route   GET /api/auth/verify
 * @desc    Verify JWT token
 * @access  Private
 */
router.get('/verify', authenticate, AuthController.verify);

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user
 * @access  Private
 */
router.get('/me', authenticate, AuthController.me);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Private
 */
router.post('/refresh', authenticate, async (req, res) => {
  try {
    const { generateAccessToken } = require('../config/jwt');
    const User = require('../models/User');
    
    const user = User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const newToken = generateAccessToken(user);

    res.json({
      success: true,
      message: 'Token refreshed',
      data: { token: newToken }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to refresh token',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post(
  '/change-password',
  authenticate,
  validateBody(schemas.changePassword),
  async (req, res) => {
    try {
      const User = require('../models/User');
      const bcrypt = require('bcryptjs');
      
      const { currentPassword, newPassword } = req.body;
      const user = User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify current password
      if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Update password
      const success = User.changePassword(req.user.id, newPassword);

      if (!success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to change password'
        });
      }

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to change password',
        error: error.message
      });
    }
  }
);

module.exports = router;
