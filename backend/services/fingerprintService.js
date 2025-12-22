// ===================================
// FINGERPRINTSERVICE.JS
// Device Fingerprint Service
// ===================================

const crypto = require('crypto');
const User = require('../models/User');

class FingerprintService {
  /**
   * Validate fingerprint hash format
   * @param {string} hash - Fingerprint hash to validate
   * @returns {Object} - Validation result
   */
  static validate(hash) {
    if (!hash || typeof hash !== 'string') {
      return {
        valid: false,
        message: 'Fingerprint hash is required'
      };
    }

    // SHA-256 hash should be 64 hex characters
    const sha256Regex = /^[a-f0-9]{64}$/i;

    if (!sha256Regex.test(hash)) {
      return {
        valid: false,
        message: 'Invalid fingerprint hash format. Expected SHA-256 (64 hex characters).'
      };
    }

    return { valid: true };
  }

  /**
   * Check if fingerprint is already registered
   * @param {string} hash - Fingerprint hash
   * @returns {boolean} - True if registered
   */
  static isRegistered(hash) {
    return User.fingerprintExists(hash);
  }

  /**
   * Get user by fingerprint
   * @param {string} hash - Fingerprint hash
   * @returns {Object|null} - User or null
   */
  static getUser(hash) {
    return User.findByFingerprint(hash);
  }

  /**
   * Verify fingerprint belongs to user
   * @param {number} userId - User ID
   * @param {string} hash - Fingerprint hash
   * @returns {boolean} - True if matches
   */
  static verify(userId, hash) {
    const user = User.findById(userId);

    if (!user) {
      return false;
    }

    return user.fingerprint_hash === hash;
  }

  /**
   * Generate server-side fingerprint hash
   * This can be used to create a fingerprint from server-collected data
   * @param {Object} data - Fingerprint data components
   * @returns {string} - SHA-256 hash
   */
  static generate(data) {
    const sortedData = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(sortedData).digest('hex');
  }

  /**
   * Calculate fingerprint similarity
   * Useful for detecting similar devices (potential account sharing)
   * @param {Object} fp1 - First fingerprint data
   * @param {Object} fp2 - Second fingerprint data
   * @returns {number} - Similarity score (0-1)
   */
  static calculateSimilarity(fp1, fp2) {
    if (!fp1 || !fp2) return 0;

    const keys1 = Object.keys(fp1);
    const keys2 = Object.keys(fp2);
    const allKeys = [...new Set([...keys1, ...keys2])];

    let matches = 0;
    let total = allKeys.length;

    for (const key of allKeys) {
      if (fp1[key] === fp2[key]) {
        matches++;
      }
    }

    return total > 0 ? matches / total : 0;
  }

  /**
   * Analyze fingerprint for suspicious patterns
   * @param {string} hash - Fingerprint hash
   * @param {Object} metadata - Additional metadata (IP, user agent, etc.)
   * @returns {Object} - Analysis result
   */
  static analyze(hash, metadata = {}) {
    const analysis = {
      isValid: this.validate(hash).valid,
      isRegistered: this.isRegistered(hash),
      suspiciousPatterns: [],
      riskScore: 0
    };

    // Check for common/default fingerprints (testing tools, emulators)
    const suspiciousHashes = [
      'admin-fingerprint-placeholder',
      '0000000000000000000000000000000000000000000000000000000000000000',
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
    ];

    if (suspiciousHashes.includes(hash.toLowerCase())) {
      analysis.suspiciousPatterns.push('Known test/placeholder fingerprint');
      analysis.riskScore += 50;
    }

    // Check for repeated characters (potentially fake)
    if (/^(.)\1+$/.test(hash)) {
      analysis.suspiciousPatterns.push('Repeated character pattern');
      analysis.riskScore += 30;
    }

    // Check metadata for suspicious patterns
    if (metadata.userAgent) {
      const ua = metadata.userAgent.toLowerCase();

      // Check for automation tools
      const automationKeywords = ['selenium', 'puppeteer', 'playwright', 'headless', 'phantomjs'];
      for (const keyword of automationKeywords) {
        if (ua.includes(keyword)) {
          analysis.suspiciousPatterns.push(`Automation tool detected: ${keyword}`);
          analysis.riskScore += 40;
        }
      }
    }

    // Normalize risk score
    analysis.riskScore = Math.min(100, analysis.riskScore);

    // Determine risk level
    if (analysis.riskScore >= 70) {
      analysis.riskLevel = 'high';
    } else if (analysis.riskScore >= 40) {
      analysis.riskLevel = 'medium';
    } else {
      analysis.riskLevel = 'low';
    }

    return analysis;
  }

  /**
   * Log fingerprint event for audit
   * @param {string} event - Event type
   * @param {string} hash - Fingerprint hash
   * @param {Object} metadata - Additional data
   */
  static logEvent(event, hash, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      fingerprintHash: hash ? hash.substring(0, 16) + '...' : null,
      ...metadata
    };

    // In production, this could write to a dedicated audit log
    console.log('[Fingerprint]', JSON.stringify(logEntry));
  }

  /**
   * Mask fingerprint hash for display
   * @param {string} hash - Full hash
   * @returns {string} - Masked hash
   */
  static mask(hash) {
    if (!hash || hash.length < 16) return hash;
    return hash.substring(0, 8) + '...' + hash.substring(hash.length - 8);
  }
}

module.exports = FingerprintService;
