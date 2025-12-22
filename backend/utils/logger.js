// ===================================
// LOGGER.JS
// Logging Utility
// ===================================

const fs = require('fs');
const path = require('path');

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Current log level from environment
const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] || LOG_LEVELS.INFO;

// Log file path
const LOG_FILE = process.env.LOG_FILE || path.join(__dirname, '../logs/app.log');
const LOG_DIR = path.dirname(LOG_FILE);

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Format log message
 */
function formatMessage(level, message, meta = null) {
  const timestamp = new Date().toISOString();
  let logMessage = `[${timestamp}] [${level}] ${message}`;

  if (meta) {
    logMessage += ` ${JSON.stringify(meta)}`;
  }

  return logMessage;
}

/**
 * Write to log file
 */
function writeToFile(message) {
  try {
    fs.appendFileSync(LOG_FILE, message + '\n');
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
}

/**
 * Log error
 */
function error(message, meta = null) {
  if (currentLevel >= LOG_LEVELS.ERROR) {
    const logMessage = formatMessage('ERROR', message, meta);
    console.error(logMessage);
    writeToFile(logMessage);
  }
}

/**
 * Log warning
 */
function warn(message, meta = null) {
  if (currentLevel >= LOG_LEVELS.WARN) {
    const logMessage = formatMessage('WARN', message, meta);
    console.warn(logMessage);
    writeToFile(logMessage);
  }
}

/**
 * Log info
 */
function info(message, meta = null) {
  if (currentLevel >= LOG_LEVELS.INFO) {
    const logMessage = formatMessage('INFO', message, meta);
    console.log(logMessage);
    writeToFile(logMessage);
  }
}

/**
 * Log debug
 */
function debug(message, meta = null) {
  if (currentLevel >= LOG_LEVELS.DEBUG) {
    const logMessage = formatMessage('DEBUG', message, meta);
    console.log(logMessage);
    writeToFile(logMessage);
  }
}

/**
 * Log HTTP request
 */
function request(req) {
  const message = `${req.method} ${req.path}`;
  const meta = {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    body: req.body
  };

  info(message, meta);
}

/**
 * Log HTTP response
 */
function response(req, res, duration) {
  const message = `${req.method} ${req.path} - ${res.statusCode}`;
  const meta = {
    duration: `${duration}ms`
  };

  info(message, meta);
}

module.exports = {
  error,
  warn,
  info,
  debug,
  request,
  response
};
