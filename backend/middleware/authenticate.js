// ===================================
// AUTHENTICATE.JS
// JWT Authentication Middleware
// ===================================

const { verifyToken } = require('../config/jwt');
const User = require('../models/User');
const Session = require('../models/Session');

/**
 * Authenticate user via JWT token
 */
async function authenticate(req, res, next) {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify JWT token
    const verification = verifyToken(token);

    if (!verification.valid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        error: verification.error
      });
    }

    // Check if session exists
    const session = Session.findByToken(token);

    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Session not found or expired'
      });
    }

    // Get user
    const user = User.findById(verification.decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check user status
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'User account is not active',
        status: user.status
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      username: user.username,
      status: user.status,
      permissions: user.permissions ? JSON.parse(user.permissions) : {}
    };

    req.token = token;

    next();

  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: error.message
    });
  }
}

/**
 * Optional authentication (doesn't fail if no token)
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.replace('Bearer ', '');
    const verification = verifyToken(token);

    if (verification.valid) {
      const user = User.findById(verification.decoded.id);

      if (user && user.status === 'active') {
        req.user = {
          id: user.id,
          username: user.username,
          status: user.status,
          permissions: user.permissions ? JSON.parse(user.permissions) : {}
        };
        req.token = token;
      }
    }

    next();

  } catch (error) {
    next();
  }
}

module.exports = {
  authenticate,
  optionalAuth
};
