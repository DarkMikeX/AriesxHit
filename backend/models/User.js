// ===================================
// USER.JS
// User Model & Database Operations
// ===================================

const db = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  // ===================================
  // CREATE
  // ===================================

  /**
   * Create new user (pending approval)
   */
  static create({ username, fingerprintHash }) {
    const insert = db.prepare(`
      INSERT INTO users (username, fingerprint_hash, status)
      VALUES (?, ?, 'pending')
    `);

    const result = insert.run(username, fingerprintHash);

    return {
      id: result.lastInsertRowid,
      username,
      fingerprintHash,
      status: 'pending'
    };
  }

  // ===================================
  // READ
  // ===================================

  /**
   * Find user by ID
   */
  static findById(id) {
    const query = db.prepare('SELECT * FROM users WHERE id = ?');
    return query.get(id);
  }

  /**
   * Find user by username
   */
  static findByUsername(username) {
    const query = db.prepare('SELECT * FROM users WHERE username = ?');
    return query.get(username);
  }

  /**
   * Find user by fingerprint
   */
  static findByFingerprint(fingerprintHash) {
    const query = db.prepare('SELECT * FROM users WHERE fingerprint_hash = ?');
    return query.get(fingerprintHash);
  }

  /**
   * Get all users
   */
  static findAll() {
    const query = db.prepare('SELECT * FROM users ORDER BY created_at DESC');
    return query.all();
  }

  /**
   * Get users by status
   */
  static findByStatus(status) {
    const query = db.prepare('SELECT * FROM users WHERE status = ? ORDER BY created_at DESC');
    return query.all(status);
  }

  /**
   * Get pending users
   */
  static findPending() {
    return this.findByStatus('pending');
  }

  /**
   * Get active users
   */
  static findActive() {
    return this.findByStatus('active');
  }

  /**
   * Get blocked users
   */
  static findBlocked() {
    return this.findByStatus('blocked');
  }

  // ===================================
  // UPDATE
  // ===================================

  /**
   * Approve user (set password and permissions)
   */
  static approve(userId, { password, permissions, approvedBy }) {
    const passwordHash = bcrypt.hashSync(password, 10);
    const permissionsJson = JSON.stringify(permissions);

    const update = db.prepare(`
      UPDATE users 
      SET password_hash = ?, 
          permissions = ?, 
          status = 'active', 
          approved_at = CURRENT_TIMESTAMP,
          approved_by = ?
      WHERE id = ?
    `);

    const result = update.run(passwordHash, permissionsJson, approvedBy, userId);

    return result.changes > 0;
  }

  /**
   * Block user
   */
  static block(userId, reason = null) {
    const update = db.prepare(`
      UPDATE users 
      SET status = 'blocked', blocked_reason = ?
      WHERE id = ?
    `);

    const result = update.run(reason, userId);
    return result.changes > 0;
  }

  /**
   * Unblock user
   */
  static unblock(userId) {
    const update = db.prepare(`
      UPDATE users 
      SET status = 'active', blocked_reason = NULL
      WHERE id = ?
    `);

    const result = update.run(userId);
    return result.changes > 0;
  }

  /**
   * Update user permissions
   */
  static updatePermissions(userId, permissions) {
    const permissionsJson = JSON.stringify(permissions);

    const update = db.prepare('UPDATE users SET permissions = ? WHERE id = ?');
    const result = update.run(permissionsJson, userId);

    return result.changes > 0;
  }

  /**
   * Update last login time
   */
  static updateLastLogin(userId) {
    const update = db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?');
    const result = update.run(userId);

    return result.changes > 0;
  }

  /**
   * Change password
   */
  static changePassword(userId, newPassword) {
    const passwordHash = bcrypt.hashSync(newPassword, 10);

    const update = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
    const result = update.run(passwordHash, userId);

    return result.changes > 0;
  }

  // ===================================
  // DELETE
  // ===================================

  /**
   * Delete user
   */
  static delete(userId) {
    const deleteQuery = db.prepare('DELETE FROM users WHERE id = ?');
    const result = deleteQuery.run(userId);

    return result.changes > 0;
  }

  /**
   * Reject pending user (delete)
   */
  static reject(userId) {
    return this.delete(userId);
  }

  // ===================================
  // AUTH & VALIDATION
  // ===================================

  /**
   * Verify password
   */
  static verifyPassword(userId, password) {
    const user = this.findById(userId);

    if (!user || !user.password_hash) {
      return false;
    }

    return bcrypt.compareSync(password, user.password_hash);
  }

  /**
   * Verify fingerprint
   */
  static verifyFingerprint(userId, fingerprintHash) {
    const user = this.findById(userId);

    if (!user) {
      return false;
    }

    return user.fingerprint_hash === fingerprintHash;
  }

  /**
   * Check if user exists
   */
  static exists(username) {
    const query = db.prepare('SELECT id FROM users WHERE username = ?');
    const result = query.get(username);

    return !!result;
  }

  /**
   * Check if fingerprint is taken
   */
  static fingerprintExists(fingerprintHash) {
    const query = db.prepare('SELECT id FROM users WHERE fingerprint_hash = ?');
    const result = query.get(fingerprintHash);

    return !!result;
  }

  // ===================================
  // PERMISSIONS
  // ===================================

  /**
   * Get user permissions
   */
  static getPermissions(userId) {
    const user = this.findById(userId);

    if (!user || !user.permissions) {
      return {};
    }

    try {
      return JSON.parse(user.permissions);
    } catch (error) {
      console.error('Error parsing permissions:', error);
      return {};
    }
  }

  /**
   * Check if user has specific permission
   */
  static hasPermission(userId, permission) {
    const permissions = this.getPermissions(userId);
    return permissions[permission] === true;
  }

  /**
   * Check if user is admin
   */
  static isAdmin(userId) {
    return this.hasPermission(userId, 'admin');
  }

  // ===================================
  // STATS
  // ===================================

  /**
   * Get user statistics
   */
  static getStats() {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked
      FROM users
    `).get();

    return stats;
  }

  // ===================================
  // UTILITY
  // ===================================

  /**
   * Format user data (remove sensitive info)
   */
  static format(user) {
    if (!user) return null;

    const { password_hash, fingerprint_hash, ...safeUser } = user;

    // Parse permissions if string
    if (safeUser.permissions && typeof safeUser.permissions === 'string') {
      try {
        safeUser.permissions = JSON.parse(safeUser.permissions);
      } catch (error) {
        safeUser.permissions = {};
      }
    }

    return safeUser;
  }

  /**
   * Format multiple users
   */
  static formatMany(users) {
    return users.map(user => this.format(user));
  }
}

module.exports = User;
