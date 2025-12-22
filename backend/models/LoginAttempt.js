// ===================================
// LOGINATTEMPT.JS
// Login Attempt Model & Security Logging
// ===================================

const db = require('../config/database');

class LoginAttempt {
  // ===================================
  // CREATE
  // ===================================

  /**
   * Log login attempt
   */
  static log({ username, fingerprintHash, ipAddress, success, errorMessage = null }) {
    const insert = db.prepare(`
      INSERT INTO login_attempts (username, fingerprint_hash, ip_address, success, error_message)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      username,
      fingerprintHash,
      ipAddress,
      success ? 1 : 0,
      errorMessage
    );

    return {
      id: result.lastInsertRowid,
      username,
      success
    };
  }

  /**
   * Log successful login
   */
  static logSuccess(username, fingerprintHash, ipAddress) {
    return this.log({
      username,
      fingerprintHash,
      ipAddress,
      success: true
    });
  }

  /**
   * Log failed login
   */
  static logFailure(username, fingerprintHash, ipAddress, errorMessage) {
    return this.log({
      username,
      fingerprintHash,
      ipAddress,
      success: false,
      errorMessage
    });
  }

  // ===================================
  // READ
  // ===================================

  /**
   * Get all attempts for a username
   */
  static findByUsername(username, limit = 100) {
    const query = db.prepare(`
      SELECT * FROM login_attempts 
      WHERE username = ?
      ORDER BY attempted_at DESC
      LIMIT ?
    `);
    return query.all(username, limit);
  }

  /**
   * Get recent attempts by IP
   */
  static findByIP(ipAddress, limit = 100) {
    const query = db.prepare(`
      SELECT * FROM login_attempts 
      WHERE ip_address = ?
      ORDER BY attempted_at DESC
      LIMIT ?
    `);
    return query.all(ipAddress, limit);
  }

  /**
   * Get recent attempts by fingerprint
   */
  static findByFingerprint(fingerprintHash, limit = 100) {
    const query = db.prepare(`
      SELECT * FROM login_attempts 
      WHERE fingerprint_hash = ?
      ORDER BY attempted_at DESC
      LIMIT ?
    `);
    return query.all(fingerprintHash, limit);
  }

  /**
   * Get all attempts
   */
  static findAll(limit = 1000) {
    const query = db.prepare(`
      SELECT * FROM login_attempts 
      ORDER BY attempted_at DESC
      LIMIT ?
    `);
    return query.all(limit);
  }

  // ===================================
  // RATE LIMITING
  // ===================================

  /**
   * Count failed attempts in time window
   */
  static countRecentFailures(username, windowMinutes = 15) {
    const cutoffTime = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

    const query = db.prepare(`
      SELECT COUNT(*) as count FROM login_attempts
      WHERE username = ? 
        AND success = 0 
        AND attempted_at > ?
    `);

    const result = query.get(username, cutoffTime);
    return result.count;
  }

  /**
   * Check if user is rate limited
   */
  static isRateLimited(username, maxAttempts = 5, windowMinutes = 15) {
    const failureCount = this.countRecentFailures(username, windowMinutes);
    return failureCount >= maxAttempts;
  }

  /**
   * Count failed attempts by IP in time window
   */
  static countIPFailures(ipAddress, windowMinutes = 15) {
    const cutoffTime = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

    const query = db.prepare(`
      SELECT COUNT(*) as count FROM login_attempts
      WHERE ip_address = ? 
        AND success = 0 
        AND attempted_at > ?
    `);

    const result = query.get(ipAddress, cutoffTime);
    return result.count;
  }

  /**
   * Check if IP is rate limited
   */
  static isIPRateLimited(ipAddress, maxAttempts = 10, windowMinutes = 15) {
    const failureCount = this.countIPFailures(ipAddress, windowMinutes);
    return failureCount >= maxAttempts;
  }

  // ===================================
  // CLEANUP
  // ===================================

  /**
   * Delete old login attempts
   */
  static deleteOld(daysOld = 30) {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();

    const deleteQuery = db.prepare('DELETE FROM login_attempts WHERE attempted_at < ?');
    const result = deleteQuery.run(cutoffDate);

    return result.changes;
  }

  /**
   * Delete all attempts for a username
   */
  static deleteByUsername(username) {
    const deleteQuery = db.prepare('DELETE FROM login_attempts WHERE username = ?');
    const result = deleteQuery.run(username);
    return result.changes;
  }

  // ===================================
  // STATISTICS
  // ===================================

  /**
   * Get login statistics
   */
  static getStats(hours = 24) {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(success) as successful,
        COUNT(*) - SUM(success) as failed,
        COUNT(DISTINCT username) as uniqueUsers,
        COUNT(DISTINCT ip_address) as uniqueIPs
      FROM login_attempts
      WHERE attempted_at > ?
    `).get(cutoffTime);

    return {
      total: stats.total,
      successful: stats.successful,
      failed: stats.failed,
      uniqueUsers: stats.uniqueUsers,
      uniqueIPs: stats.uniqueIPs,
      successRate: stats.total > 0 ? (stats.successful / stats.total * 100).toFixed(2) : 0
    };
  }

  /**
   * Get top failed usernames
   */
  static getTopFailedUsernames(limit = 10, hours = 24) {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const query = db.prepare(`
      SELECT username, COUNT(*) as attempts
      FROM login_attempts
      WHERE success = 0 AND attempted_at > ?
      GROUP BY username
      ORDER BY attempts DESC
      LIMIT ?
    `);

    return query.all(cutoffTime, limit);
  }

  /**
   * Get top attacking IPs
   */
  static getTopAttackingIPs(limit = 10, hours = 24) {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const query = db.prepare(`
      SELECT ip_address, COUNT(*) as attempts
      FROM login_attempts
      WHERE success = 0 AND attempted_at > ?
      GROUP BY ip_address
      ORDER BY attempts DESC
      LIMIT ?
    `);

    return query.all(cutoffTime, limit);
  }
}

module.exports = LoginAttempt;
