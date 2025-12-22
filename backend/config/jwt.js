// ===================================
// JWT.JS
// JWT Configuration & Token Management
// ===================================

const jwt = require('jsonwebtoken');

// JWT Configuration
const config = {
  secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this',
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  algorithm: 'HS256',
  issuer: 'AriesxHit-API',
  audience: 'AriesxHit-Extension'
};

/**
 * Generate JWT token
 */
function generateToken(payload, options = {}) {
  const tokenOptions = {
    expiresIn: options.expiresIn || config.expiresIn,
    algorithm: config.algorithm,
    issuer: config.issuer,
    audience: config.audience
  };

  return jwt.sign(payload, config.secret, tokenOptions);
}

/**
 * Generate access token
 */
function generateAccessToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    status: user.status,
    permissions: user.permissions,
    type: 'access'
  };

  return generateToken(payload, { expiresIn: config.expiresIn });
}

/**
 * Generate refresh token
 */
function generateRefreshToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    type: 'refresh'
  };

  return generateToken(payload, { expiresIn: config.refreshExpiresIn });
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, config.secret, {
      algorithms: [config.algorithm],
      issuer: config.issuer,
      audience: config.audience
    });

    return {
      valid: true,
      decoded
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
}

/**
 * Decode token without verification
 */
function decodeToken(token) {
  try {
    return jwt.decode(token, { complete: true });
  } catch (error) {
    return null;
  }
}

/**
 * Check if token is expired
 */
function isExpired(token) {
  const decoded = decodeToken(token);
  
  if (!decoded || !decoded.payload.exp) {
    return true;
  }

  return decoded.payload.exp * 1000 < Date.now();
}

/**
 * Get token expiration time
 */
function getExpiration(token) {
  const decoded = decodeToken(token);
  
  if (!decoded || !decoded.payload.exp) {
    return null;
  }

  return new Date(decoded.payload.exp * 1000);
}

/**
 * Refresh access token
 */
function refreshAccessToken(refreshToken) {
  const verification = verifyToken(refreshToken);

  if (!verification.valid) {
    throw new Error('Invalid refresh token');
  }

  if (verification.decoded.type !== 'refresh') {
    throw new Error('Token is not a refresh token');
  }

  // Generate new access token
  const payload = {
    id: verification.decoded.id,
    username: verification.decoded.username,
    type: 'access'
  };

  return generateToken(payload, { expiresIn: config.expiresIn });
}

module.exports = {
  config,
  generateToken,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
  isExpired,
  getExpiration,
  refreshAccessToken
};
