// ===================================
// ADMIN.JS
// Admin Routes
// ===================================

const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const { authenticate } = require('../middleware/authenticate');
const { isAdmin } = require('../middleware/authorize');
const { validateBody, validateParams, schemas } = require('../middleware/validateInput');

// All admin routes require authentication and admin permission
router.use(authenticate);
router.use(isAdmin);

// ===================================
// USER MANAGEMENT
// ===================================

/**
 * @route   GET /api/admin/users
 * @desc    Get all users
 * @access  Admin
 */
router.get('/users', AdminController.getAllUsers);

/**
 * @route   GET /api/admin/users/pending
 * @desc    Get pending users
 * @access  Admin
 */
router.get('/users/pending', AdminController.getPendingUsers);

/**
 * @route   GET /api/admin/users/active
 * @desc    Get active users
 * @access  Admin
 */
router.get('/users/active', AdminController.getActiveUsers);

/**
 * @route   GET /api/admin/users/blocked
 * @desc    Get blocked users
 * @access  Admin
 */
router.get('/users/blocked', AdminController.getBlockedUsers);

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get single user by ID
 * @access  Admin
 */
router.get(
  '/users/:id',
  validateParams(schemas.userId),
  AdminController.getUser
);

/**
 * @route   POST /api/admin/users/:id/approve
 * @desc    Approve pending user
 * @access  Admin
 */
router.post(
  '/users/:id/approve',
  validateParams(schemas.userId),
  validateBody(schemas.approveUser),
  AdminController.approveUser
);

/**
 * @route   POST /api/admin/users/:id/reject
 * @desc    Reject and delete pending user
 * @access  Admin
 */
router.post(
  '/users/:id/reject',
  validateParams(schemas.userId),
  AdminController.rejectUser
);

/**
 * @route   POST /api/admin/users/:id/block
 * @desc    Block active user
 * @access  Admin
 */
router.post(
  '/users/:id/block',
  validateParams(schemas.userId),
  validateBody(schemas.blockUser),
  AdminController.blockUser
);

/**
 * @route   POST /api/admin/users/:id/unblock
 * @desc    Unblock blocked user
 * @access  Admin
 */
router.post(
  '/users/:id/unblock',
  validateParams(schemas.userId),
  AdminController.unblockUser
);

/**
 * @route   PUT /api/admin/users/:id/permissions
 * @desc    Update user permissions
 * @access  Admin
 */
router.put(
  '/users/:id/permissions',
  validateParams(schemas.userId),
  validateBody(schemas.updatePermissions),
  AdminController.updatePermissions
);

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user
 * @access  Admin
 */
router.delete(
  '/users/:id',
  validateParams(schemas.userId),
  async (req, res) => {
    try {
      const User = require('../models/User');
      const Session = require('../models/Session');
      const { id } = req.params;

      // Check if user exists
      const user = User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Don't allow deleting admin
      if (User.isAdmin(id)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete admin user'
        });
      }

      // Delete sessions first
      Session.deleteByUserId(id);

      // Delete user
      const success = User.delete(id);

      if (!success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to delete user'
        });
      }

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete user',
        error: error.message
      });
    }
  }
);

/**
 * @route   PUT /api/admin/users/:id/password
 * @desc    Reset user password
 * @access  Admin
 */
router.put(
  '/users/:id/password',
  validateParams(schemas.userId),
  validateBody(schemas.resetPassword),
  async (req, res) => {
    try {
      const User = require('../models/User');
      const { id } = req.params;
      const { password } = req.body;

      // Check if user exists
      const user = User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Update password
      const success = User.changePassword(id, password);

      if (!success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to reset password'
        });
      }

      res.json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to reset password',
        error: error.message
      });
    }
  }
);

// ===================================
// STATISTICS
// ===================================

/**
 * @route   GET /api/admin/stats
 * @desc    Get dashboard statistics
 * @access  Admin
 */
router.get('/stats', AdminController.getStats);

/**
 * @route   GET /api/admin/login-attempts
 * @desc    Get login attempts log
 * @access  Admin
 */
router.get('/login-attempts', AdminController.getLoginAttempts);

/**
 * @route   GET /api/admin/sessions
 * @desc    Get active sessions
 * @access  Admin
 */
router.get('/sessions', async (req, res) => {
  try {
    const Session = require('../models/Session');
    const stats = Session.getStats();

    res.json({
      success: true,
      data: { sessions: stats }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sessions',
      error: error.message
    });
  }
});

// ===================================
// SYSTEM
// ===================================

/**
 * @route   POST /api/admin/cleanup
 * @desc    Clean up expired sessions and old login attempts
 * @access  Admin
 */
router.post('/cleanup', async (req, res) => {
  try {
    const db = require('../config/database');
    const Session = require('../models/Session');
    const LoginAttempt = require('../models/LoginAttempt');

    const expiredSessions = Session.deleteExpired();
    const oldAttempts = LoginAttempt.deleteOld(30);

    res.json({
      success: true,
      message: 'Cleanup completed',
      data: {
        expiredSessionsDeleted: expiredSessions,
        oldLoginAttemptsDeleted: oldAttempts
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Cleanup failed',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/database-info
 * @desc    Get database information
 * @access  Admin
 */
router.get('/database-info', async (req, res) => {
  try {
    const db = require('../config/database');
    const info = db.getInfo();

    res.json({
      success: true,
      data: { database: info }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get database info',
      error: error.message
    });
  }
});

module.exports = router;
