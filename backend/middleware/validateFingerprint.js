// ===================================
// VALIDATEFINGERPRINT.JS
// Fingerprint Validation Middleware
// ===================================

/**
 * Validate fingerprint format
 */
function validateFingerprintFormat(req, res, next) {
  const fingerprintHash = req.body.fingerprintHash || req.headers['x-fingerprint'];

  if (!fingerprintHash) {
    return res.status(400).json({
      success: false,
      message: 'Device fingerprint is required'
    });
  }

  // Validate SHA-256 hash format (64 hex characters)
  const sha256Regex = /^[a-f0-9]{64}$/i;

  if (!sha256Regex.test(fingerprintHash)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid fingerprint format. Expected SHA-256 hash.'
    });
  }

  req.fingerprintHash = fingerprintHash;
  next();
}

/**
 * Verify fingerprint matches user
 */
function verifyUserFingerprint(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const User = require('../models/User');
  const fingerprintHash = req.body.fingerprintHash || req.headers['x-fingerprint'];

  if (!fingerprintHash) {
    return res.status(400).json({
      success: false,
      message: 'Device fingerprint is required'
    });
  }

  const user = User.findById(req.user.id);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'User not found'
    });
  }

  if (user.fingerprint_hash !== fingerprintHash) {
    return res.status(403).json({
      success: false,
      message: 'Device fingerprint mismatch. Please use your registered device.'
    });
  }

  next();
}

module.exports = {
  validateFingerprintFormat,
  verifyUserFingerprint
};
