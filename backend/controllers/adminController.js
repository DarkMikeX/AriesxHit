// ===================================
// ADMINCONTROLLER.JS
// Admin Controller - User Management
// ===================================

const User = require('../models/User');
const Session = require('../models/Session');
const LoginAttempt = require('../models/LoginAttempt');

class AdminController {
  // ===================================
  // GET USERS
  // ===================================

  /**
   * Get all users
   * GET /api/admin/users
   */
  static async getAllUsers(req, res) {
    try {
      const users = User.findAll();
      const formattedUsers = User.formatMany(users);

      res.json({
        success: true,
        data: {
          users: formattedUsers,
          count: formattedUsers.length
        }
      });

    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users',
        error: error.message
      });
    }
  }

  /**
   * Get pending users
   * GET /api/admin/users/pending
   */
  static async getPendingUsers(req, res) {
    try {
      const users = User.findPending();
      const formattedUsers = User.formatMany(users);

      res.json({
        success: true,
        data: {
          users: formattedUsers,
          count: formattedUsers.length
        }
      });

    } catch (error) {
      console.error('Get pending users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch pending users',
        error: error.message
      });
    }
  }

  /**
   * Get active users
   * GET /api/admin/users/active
   */
  static async getActiveUsers(req, res) {
    try {
      const users = User.findActive();
      const formattedUsers = User.formatMany(users);

      res.json({
        success: true,
        data: {
          users: formattedUsers,
          count: formattedUsers.length
        }
      });

    } catch (error) {
      console.error('Get active users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch active users',
        error: error.message
      });
    }
  }

  /**
   * Get blocked users
   * GET /api/admin/users/blocked
   */
  static async getBlockedUsers(req, res) {
    try {
      const users = User.findBlocked();
      const formattedUsers = User.formatMany(users);

      res.json({
        success: true,
        data: {
          users: formattedUsers,
          count: formattedUsers.length
        }
      });

    } catch (error) {
      console.error('Get blocked users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch blocked users',
        error: error.message
      });
    }
  }

  /**
   * Get single user
   * GET /api/admin/users/:id
   */
  static async getUser(req, res) {
    try {
      const { id } = req.params;
      const user = User.findById(id);

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
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user',
        error: error.message
      });
    }
  }

  // ===================================
  // APPROVE / REJECT
  // ===================================

  /**
   * Approve user
   * POST /api/admin/users/:id/approve
   */
  static async approveUser(req, res) {
    try {
      const { id } = req.params;
      const { password, permissions } = req.body;

      // Validate input
      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'Password is required'
        });
      }

      if (!permissions || typeof permissions !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Permissions are required'
        });
      }

      // Check if user exists
      const user = User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if user is pending
      if (user.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'User is not pending approval'
        });
      }

      // Approve user
      const success = User.approve(id, {
        password,
        permissions,
        approvedBy: req.user.id
      });

      if (!success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to approve user'
        });
      }

      // Get updated user
      const updatedUser = User.findById(id);

      res.json({
        success: true,
        message: 'User approved successfully',
        data: {
          user: User.format(updatedUser)
        }
      });

    } catch (error) {
      console.error('Approve user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve user',
        error: error.message
      });
    }
  }

  /**
   * Reject user
   * POST /api/admin/users/:id/reject
   */
  static async rejectUser(req, res) {
    try {
      const { id } = req.params;

      // Check if user exists
      const user = User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if user is pending
      if (user.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'User is not pending approval'
        });
      }

      // Reject (delete) user
      const success = User.reject(id);

      if (!success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to reject user'
        });
      }

      res.json({
        success: true,
        message: 'User rejected and removed'
      });

    } catch (error) {
      console.error('Reject user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reject user',
        error: error.message
      });
    }
  }

  // ===================================
  // BLOCK / UNBLOCK
  // ===================================

  /**
   * Block user
   * POST /api/admin/users/:id/block
   */
  static async blockUser(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      // Check if user exists
      const user = User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Don't block admin
      if (User.isAdmin(id)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot block admin user'
        });
      }

      // Block user
      const success = User.block(id, reason);

      if (!success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to block user'
        });
      }

      // Delete all sessions
      Session.deleteByUserId(id);

      // Get updated user
      const updatedUser = User.findById(id);

      res.json({
        success: true,
        message: 'User blocked successfully',
        data: {
          user: User.format(updatedUser)
        }
      });

    } catch (error) {
      console.error('Block user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to block user',
        error: error.message
      });
    }
  }

  /**
   * Unblock user
   * POST /api/admin/users/:id/unblock
   */
  static async unblockUser(req, res) {
    try {
      const { id } = req.params;

      // Check if user exists
      const user = User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Unblock user
      const success = User.unblock(id);

      if (!success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to unblock user'
        });
      }

      // Get updated user
      const updatedUser = User.findById(id);

      res.json({
        success: true,
        message: 'User unblocked successfully',
        data: {
          user: User.format(updatedUser)
        }
      });

    } catch (error) {
      console.error('Unblock user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to unblock user',
        error: error.message
      });
    }
  }

  // ===================================
  // UPDATE PERMISSIONS
  // ===================================

  /**
   * Update user permissions
   * PUT /api/admin/users/:id/permissions
   */
  static async updatePermissions(req, res) {
    try {
      const { id } = req.params;
      const { permissions } = req.body;

      // Validate input
      if (!permissions || typeof permissions !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Valid permissions object is required'
        });
      }

      // Check if user exists
      const user = User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Update permissions
      const success = User.updatePermissions(id, permissions);

      if (!success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to update permissions'
        });
      }

      // Get updated user
      const updatedUser = User.findById(id);

      res.json({
        success: true,
        message: 'Permissions updated successfully',
        data: {
          user: User.format(updatedUser)
        }
      });

    } catch (error) {
      console.error('Update permissions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update permissions',
        error: error.message
      });
    }
  }

  // ===================================
  // STATISTICS
  // ===================================

  /**
   * Get dashboard statistics
   * GET /api/admin/stats
   */
  static async getStats(req, res) {
    try {
      const userStats = User.getStats();
      const sessionStats = Session.getStats();
      const loginStats = LoginAttempt.getStats(24);

      res.json({
        success: true,
        data: {
          users: userStats,
          sessions: sessionStats,
          logins: loginStats
        }
      });

    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch statistics',
        error: error.message
      });
    }
  }

  /**
   * Get login attempts
   * GET /api/admin/login-attempts
   */
  static async getLoginAttempts(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 100;
      const attempts = LoginAttempt.findAll(limit);

      res.json({
        success: true,
        data: {
          attempts,
          count: attempts.length
        }
      });

    } catch (error) {
      console.error('Get login attempts error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch login attempts',
        error: error.message
      });
    }
  }
}

module.exports = AdminController;
