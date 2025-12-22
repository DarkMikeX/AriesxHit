// ===================================
// USERS.JS
// User Routes
// ===================================

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authenticate');
const User = require('../models/User');

// All user routes require authentication
router.use(authenticate);

// ===================================
// USER PROFILE
// ===================================

/**
 * @route   GET /api/users/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', async (req, res) => {
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
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/users/permissions
 * @desc    Get current user permissions
 * @access  Private
 */
router.get('/permissions', async (req, res) => {
  try {
    const permissions = User.getPermissions(req.user.id);

    res.json({
      success: true,
      data: {
        permissions
      }
    });

  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get permissions',
      error: error.message
    });
  }
});

module.exports = router;
