// ===================================
// CRYPTO.JS
// Cryptographic Utilities
// ===================================

const crypto = require('crypto');

/**
 * Generate SHA-256 hash
 * @param {string} data - Data to hash
 * @returns {string} - Hex-encoded hash
 */
function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate SHA-512 hash
 * @param {string} data - Data to hash
 * @returns {string} - Hex-encoded hash
 */
function sha512(data) {
  return crypto.createHash('sha512').update(data).digest('hex');
}

/**
 * Generate MD5 hash (for non-security purposes)
 * @param {string} data - Data to hash
 * @returns {string} - Hex-encoded hash
 */
function md5(data) {
  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Generate HMAC-SHA256
 * @param {string} data - Data to sign
 * @param {string} secret - Secret key
 * @returns {string} - Hex-encoded HMAC
 */
function hmacSha256(data, secret) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Generate random bytes
 * @param {number} length - Number of bytes
 * @returns {string} - Hex-encoded random bytes
 */
function randomBytes(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate random token
 * @param {number} length - Token length (default 64 hex chars = 32 bytes)
 * @returns {string} - Random token
 */
function generateToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate UUID v4
 * @returns {string} - UUID v4
 */
function generateUUID() {
  return crypto.randomUUID();
}

/**
 * Generate secure random integer
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (exclusive)
 * @returns {number} - Random integer
 */
function randomInt(min, max) {
  return crypto.randomInt(min, max);
}

/**
 * Generate random string
 * @param {number} length - String length
 * @param {string} charset - Character set to use
 * @returns {string} - Random string
 */
function randomString(length = 16, charset = 'alphanumeric') {
  const charsets = {
    numeric: '0123456789',
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    alpha: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
    alphanumeric: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    special: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  };

  const chars = charsets[charset] || charset;
  let result = '';

  for (let i = 0; i < length; i++) {
    result += chars[randomInt(0, chars.length)];
  }

  return result;
}

/**
 * Constant-time string comparison (timing-safe)
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean} - Whether strings are equal
 */
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  if (bufA.length !== bufB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Encrypt data with AES-256-GCM
 * @param {string} data - Data to encrypt
 * @param {string} key - Encryption key (32 bytes hex)
 * @returns {string} - Encrypted data (iv:authTag:encrypted)
 */
function encrypt(data, key) {
  const keyBuffer = Buffer.from(key, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);

  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt data with AES-256-GCM
 * @param {string} encryptedData - Encrypted data (iv:authTag:encrypted)
 * @param {string} key - Decryption key (32 bytes hex)
 * @returns {string} - Decrypted data
 */
function decrypt(encryptedData, key) {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');

  const keyBuffer = Buffer.from(key, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generate encryption key
 * @returns {string} - 32-byte hex key
 */
function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash password with PBKDF2
 * @param {string} password - Password to hash
 * @param {string} salt - Optional salt (generated if not provided)
 * @returns {Object} - { hash, salt }
 */
function hashPassword(password, salt = null) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');

  return { hash, salt };
}

/**
 * Verify password hash
 * @param {string} password - Password to verify
 * @param {string} hash - Stored hash
 * @param {string} salt - Stored salt
 * @returns {boolean} - Whether password matches
 */
function verifyPassword(password, hash, salt) {
  const { hash: newHash } = hashPassword(password, salt);
  return timingSafeEqual(hash, newHash);
}

/**
 * Generate API key
 * @param {string} prefix - Optional prefix (e.g., 'ak_')
 * @returns {string} - API key
 */
function generateApiKey(prefix = 'ak_') {
  return prefix + randomString(32, 'alphanumeric');
}

/**
 * Mask sensitive data
 * @param {string} data - Data to mask
 * @param {number} showFirst - Number of characters to show at start
 * @param {number} showLast - Number of characters to show at end
 * @returns {string} - Masked data
 */
function maskData(data, showFirst = 4, showLast = 4) {
  if (!data || data.length <= showFirst + showLast) {
    return data;
  }

  const first = data.substring(0, showFirst);
  const last = data.substring(data.length - showLast);
  const masked = '*'.repeat(Math.min(data.length - showFirst - showLast, 10));

  return first + masked + last;
}

module.exports = {
  sha256,
  sha512,
  md5,
  hmacSha256,
  randomBytes,
  generateToken,
  generateUUID,
  randomInt,
  randomString,
  timingSafeEqual,
  encrypt,
  decrypt,
  generateEncryptionKey,
  hashPassword,
  verifyPassword,
  generateApiKey,
  maskData
};
