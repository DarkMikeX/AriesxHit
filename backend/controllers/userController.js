// ===================================
// USERCONTROLLER.JS
// User Controller
// ===================================

const User = require('../models/User');
const Session = require('../models/Session');

class UserController {
  // ===================================
  // GET USER PROFILE
  // ===================================

  /**
   * Get current user profile
   * GET /api/users/me
   */
  static async getProfile(req, res) {
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
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get profile',
        error: error.message
      });
    }
  }

  // ===================================
  // GET PERMISSIONS
  // ===================================

  /**
   * Get current user permissions
   * GET /api/users/permissions
   */
  static async getPermissions(req, res) {
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
  }

  // ===================================
  // CHECK PERMISSION
  // ===================================

  /**
   * Check if user has specific permission
   * GET /api/users/permissions/:permission
   */
  static async checkPermission(req, res) {
    try {
      const { permission } = req.params;
      const hasPermission = User.hasPermission(req.user.id, permission);

      res.json({
        success: true,
        data: {
          permission,
          granted: hasPermission
        }
      });

    } catch (error) {
      console.error('Check permission error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check permission',
        error: error.message
      });
    }
  }

  // ===================================
  // UPDATE PROFILE
  // ===================================

  /**
   * Update user profile (limited fields)
   * PUT /api/users/me
   */
  static async updateProfile(req, res) {
    try {
      // Users can only update certain fields
      // Currently, users cannot update much - add fields here as needed
      
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: User.format(User.findById(req.user.id))
        }
      });

    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: error.message
      });
    }
  }

  // ===================================
  // GET SESSIONS
  // ===================================

  /**
   * Get current user's active sessions
   * GET /api/users/sessions
   */
  static async getSessions(req, res) {
    try {
      const sessions = Session.findByUserId(req.user.id);
      
      // Format sessions (hide full token)
      const formattedSessions = sessions.map(session => ({
        id: session.id,
        createdAt: session.created_at,
        expiresAt: session.expires_at,
        current: session.token === req.token
      }));

      res.json({
        success: true,
        data: {
          sessions: formattedSessions,
          count: formattedSessions.length
        }
      });

    } catch (error) {
      console.error('Get sessions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get sessions',
        error: error.message
      });
    }
  }

  // ===================================
  // REVOKE SESSION
  // ===================================

  /**
   * Revoke a specific session
   * DELETE /api/users/sessions/:id
   */
  static async revokeSession(req, res) {
    try {
      const { id } = req.params;
      
      // Get session to verify ownership
      const sessions = Session.findByUserId(req.user.id);
      const session = sessions.find(s => s.id === parseInt(id));

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      // Don't allow revoking current session via this endpoint
      if (session.token === req.token) {
        return res.status(400).json({
          success: false,
          message: 'Cannot revoke current session. Use logout instead.'
        });
      }

      // Delete session
      Session.delete(session.token);

      res.json({
        success: true,
        message: 'Session revoked successfully'
      });

    } catch (error) {
      console.error('Revoke session error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to revoke session',
        error: error.message
      });
    }
  }

  // ===================================
  // REVOKE ALL SESSIONS
  // ===================================

  /**
   * Revoke all sessions except current
   * DELETE /api/users/sessions
   */
  static async revokeAllSessions(req, res) {
    try {
      // Get all sessions
      const sessions = Session.findByUserId(req.user.id);
      
      // Delete all except current
      let revokedCount = 0;
      for (const session of sessions) {
        if (session.token !== req.token) {
          Session.delete(session.token);
          revokedCount++;
        }
      }

      res.json({
        success: true,
        message: `${revokedCount} session(s) revoked`,
        data: {
          revokedCount
        }
      });

    } catch (error) {
      console.error('Revoke all sessions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to revoke sessions',
        error: error.message
      });
    }
  }

  // ===================================
  // GET USER STATUS
  // ===================================

  /**
   * Get current user status
   * GET /api/users/status
   */
  static async getStatus(req, res) {
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
          status: user.status,
          lastLogin: user.last_login,
          createdAt: user.created_at
        }
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

  // ===================================
  // VERIFY FINGERPRINT
  // ===================================

  /**
   * Verify device fingerprint
   * POST /api/users/verify-fingerprint
   */
  static async verifyFingerprint(req, res) {
    try {
      const { fingerprintHash } = req.body;

      if (!fingerprintHash) {
        return res.status(400).json({
          success: false,
          message: 'Fingerprint hash is required'
        });
      }

      const isValid = User.verifyFingerprint(req.user.id, fingerprintHash);

      res.json({
        success: true,
        data: {
          verified: isValid
        }
      });

    } catch (error) {
      console.error('Verify fingerprint error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify fingerprint',
        error: error.message
      });
    }
  }
}

module.exports = UserController;
