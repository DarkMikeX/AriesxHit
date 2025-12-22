// ===================================
// TOKENSERVICE.JS
// Token Management Service
// ===================================

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Session = require('../models/Session');

class TokenService {
  constructor() {
    this.secret = process.env.JWT_SECRET || 'default-secret-change-me';
    this.accessTokenExpiry = process.env.JWT_EXPIRES_IN || '24h';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    this.algorithm = 'HS256';
    this.issuer = 'AriesxHit-API';
    this.audience = 'AriesxHit-Extension';
  }

  /**
   * Generate access token
   * @param {Object} user - User object
   * @returns {string} - JWT token
   */
  generateAccessToken(user) {
    const payload = {
      id: user.id,
      username: user.username,
      status: user.status,
      permissions: typeof user.permissions === 'string' 
        ? JSON.parse(user.permissions) 
        : user.permissions,
      type: 'access'
    };

    return jwt.sign(payload, this.secret, {
      expiresIn: this.accessTokenExpiry,
      algorithm: this.algorithm,
      issuer: this.issuer,
      audience: this.audience
    });
  }

  /**
   * Generate refresh token
   * @param {Object} user - User object
   * @returns {string} - JWT refresh token
   */
  generateRefreshToken(user) {
    const payload = {
      id: user.id,
      username: user.username,
      type: 'refresh',
      jti: crypto.randomUUID() // Unique token ID
    };

    return jwt.sign(payload, this.secret, {
      expiresIn: this.refreshTokenExpiry,
      algorithm: this.algorithm,
      issuer: this.issuer,
      audience: this.audience
    });
  }

  /**
   * Generate token pair (access + refresh)
   * @param {Object} user - User object
   * @returns {Object} - { accessToken, refreshToken }
   */
  generateTokenPair(user) {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user)
    };
  }

  /**
   * Verify token
   * @param {string} token - JWT token
   * @returns {Object} - { valid, decoded, error }
   */
  verify(token) {
    try {
      const decoded = jwt.verify(token, this.secret, {
        algorithms: [this.algorithm],
        issuer: this.issuer,
        audience: this.audience
      });

      return {
        valid: true,
        decoded
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        expired: error.name === 'TokenExpiredError'
      };
    }
  }

  /**
   * Decode token without verification
   * @param {string} token - JWT token
   * @returns {Object|null} - Decoded token or null
   */
  decode(token) {
    try {
      return jwt.decode(token, { complete: true });
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if token is expired
   * @param {string} token - JWT token
   * @returns {boolean} - True if expired
   */
  isExpired(token) {
    const decoded = this.decode(token);

    if (!decoded || !decoded.payload.exp) {
      return true;
    }

    return decoded.payload.exp * 1000 < Date.now();
  }

  /**
   * Get token expiration date
   * @param {string} token - JWT token
   * @returns {Date|null} - Expiration date or null
   */
  getExpiration(token) {
    const decoded = this.decode(token);

    if (!decoded || !decoded.payload.exp) {
      return null;
    }

    return new Date(decoded.payload.exp * 1000);
  }

  /**
   * Get time until expiration
   * @param {string} token - JWT token
   * @returns {number} - Milliseconds until expiration (negative if expired)
   */
  getTimeUntilExpiration(token) {
    const decoded = this.decode(token);

    if (!decoded || !decoded.payload.exp) {
      return -1;
    }

    return decoded.payload.exp * 1000 - Date.now();
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Refresh token
   * @param {Function} getUserById - Function to get user by ID
   * @returns {Object} - { accessToken, user } or throws error
   */
  async refreshAccessToken(refreshToken, getUserById) {
    const verification = this.verify(refreshToken);

    if (!verification.valid) {
      throw new Error('Invalid refresh token');
    }

    if (verification.decoded.type !== 'refresh') {
      throw new Error('Token is not a refresh token');
    }

    // Get user
    const user = getUserById(verification.decoded.id);

    if (!user || user.status !== 'active') {
      throw new Error('User not found or inactive');
    }

    // Generate new access token
    const accessToken = this.generateAccessToken(user);

    return { accessToken, user };
  }

  /**
   * Create session with token
   * @param {number} userId - User ID
   * @param {string} token - JWT token
   * @returns {Object} - Created session
   */
  createSession(userId, token) {
    return Session.create(userId, token, this.accessTokenExpiry);
  }

  /**
   * Invalidate token (delete session)
   * @param {string} token - JWT token
   * @returns {boolean} - Success status
   */
  invalidate(token) {
    return Session.delete(token);
  }

  /**
   * Invalidate all user tokens
   * @param {number} userId - User ID
   * @returns {number} - Number of sessions deleted
   */
  invalidateAll(userId) {
    return Session.deleteByUserId(userId);
  }

  /**
   * Check if session exists
   * @param {string} token - JWT token
   * @returns {boolean} - True if session exists
   */
  sessionExists(token) {
    return Session.isValid(token);
  }

  /**
   * Generate random token (non-JWT)
   * @param {number} length - Token length in bytes
   * @returns {string} - Hex token
   */
  generateRandomToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate API key
   * @param {string} prefix - Key prefix
   * @returns {string} - API key
   */
  generateApiKey(prefix = 'ak_') {
    return prefix + this.generateRandomToken(24);
  }

  /**
   * Hash token for storage
   * @param {string} token - Token to hash
   * @returns {string} - SHA-256 hash
   */
  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Compare token with hash
   * @param {string} token - Plain token
   * @param {string} hash - Token hash
   * @returns {boolean} - True if matches
   */
  compareToken(token, hash) {
    const tokenHash = this.hashToken(token);
    return crypto.timingSafeEqual(Buffer.from(tokenHash), Buffer.from(hash));
  }
}

// Export singleton instance
module.exports = new TokenService();
