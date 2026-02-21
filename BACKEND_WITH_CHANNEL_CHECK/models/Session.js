// ===================================
// SESSION.JS
// Session Model & Database Operations
// ===================================

const db = require('../config/database');
const crypto = require('crypto');

class Session {
  // ===================================
  // CREATE
  // ===================================

  /**
   * Create new session
   */
  static create(userId, token, expiresIn = '24h') {
    // Convert expiresIn to milliseconds
    const expirationMs = this.parseExpiration(expiresIn);
    const expiresAt = new Date(Date.now() + expirationMs).toISOString();

    const insert = db.prepare(`
      INSERT INTO sessions (user_id, token, expires_at)
      VALUES (?, ?, ?)
    `);

    const result = insert.run(userId, token, expiresAt);

    return {
      id: result.lastInsertRowid,
      userId,
      token,
      expiresAt
    };
  }

  /**
   * Generate random token
   */
  static generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // ===================================
  // READ
  // ===================================

  /**
   * Find session by token
   */
  static findByToken(token) {
    const query = db.prepare(`
      SELECT * FROM sessions 
      WHERE token = ? AND expires_at > CURRENT_TIMESTAMP
    `);
    return query.get(token);
  }

  /**
   * Find all sessions for a user
   */
  static findByUserId(userId) {
    const query = db.prepare(`
      SELECT * FROM sessions 
      WHERE user_id = ? AND expires_at > CURRENT_TIMESTAMP
      ORDER BY created_at DESC
    `);
    return query.all(userId);
  }

  /**
   * Get active session count for user
   */
  static getActiveCount(userId) {
    const query = db.prepare(`
      SELECT COUNT(*) as count FROM sessions 
      WHERE user_id = ? AND expires_at > CURRENT_TIMESTAMP
    `);
    const result = query.get(userId);
    return result.count;
  }

  // ===================================
  // UPDATE
  // ===================================

  /**
   * Extend session expiration
   */
  static extend(token, expiresIn = '24h') {
    const expirationMs = this.parseExpiration(expiresIn);
    const expiresAt = new Date(Date.now() + expirationMs).toISOString();

    const update = db.prepare(`
      UPDATE sessions 
      SET expires_at = ?
      WHERE token = ?
    `);

    const result = update.run(expiresAt, token);
    return result.changes > 0;
  }

  // ===================================
  // DELETE
  // ===================================

  /**
   * Delete session by token (logout)
   */
  static delete(token) {
    const deleteQuery = db.prepare('DELETE FROM sessions WHERE token = ?');
    const result = deleteQuery.run(token);
    return result.changes > 0;
  }

  /**
   * Delete all sessions for a user
   */
  static deleteByUserId(userId) {
    const deleteQuery = db.prepare('DELETE FROM sessions WHERE user_id = ?');
    const result = deleteQuery.run(userId);
    return result.changes;
  }

  /**
   * Delete expired sessions
   */
  static deleteExpired() {
    const deleteQuery = db.prepare('DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP');
    const result = deleteQuery.run();
    return result.changes;
  }

  // ===================================
  // VALIDATION
  // ===================================

  /**
   * Check if token is valid
   */
  static isValid(token) {
    const session = this.findByToken(token);
    return !!session;
  }

  /**
   * Verify token and get user ID
   */
  static verify(token) {
    const session = this.findByToken(token);
    return session ? session.user_id : null;
  }

  // ===================================
  // UTILITY
  // ===================================

  /**
   * Parse expiration string to milliseconds
   */
  static parseExpiration(expiresIn) {
    const units = {
      's': 1000,
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000
    };

    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 24 * 60 * 60 * 1000; // Default 24 hours
    }

    const [, value, unit] = match;
    return parseInt(value) * units[unit];
  }

  /**
   * Get session statistics
   */
  static getStats() {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN expires_at > CURRENT_TIMESTAMP THEN 1 END) as active,
        COUNT(CASE WHEN expires_at <= CURRENT_TIMESTAMP THEN 1 END) as expired
      FROM sessions
    `).get();

    return stats;
  }
}

module.exports = Session;
