// ===================================
// RATELIMITER.JS
// Rate Limiting Middleware
// ===================================

/**
 * In-memory rate limit store
 * In production, use Redis for distributed rate limiting
 */
const rateLimitStore = new Map();

/**
 * Clean up old entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

/**
 * Create rate limiter middleware
 * @param {Object} options - Rate limiter options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum requests per window
 * @param {string} options.message - Error message
 * @param {Function} options.keyGenerator - Function to generate unique key
 * @param {boolean} options.skipSuccessfulRequests - Skip counting successful requests
 * @param {boolean} options.skipFailedRequests - Skip counting failed requests
 */
function createRateLimiter(options = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100,
    message = 'Too many requests, please try again later',
    keyGenerator = (req) => req.ip,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    standardHeaders = true,
    legacyHeaders = false
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();

    // Get or create rate limit data
    let data = rateLimitStore.get(key);

    if (!data || now > data.resetTime) {
      data = {
        count: 0,
        resetTime: now + windowMs
      };
      rateLimitStore.set(key, data);
    }

    // Increment count
    data.count++;

    // Calculate remaining
    const remaining = Math.max(0, max - data.count);
    const resetTime = Math.ceil(data.resetTime / 1000);

    // Set headers
    if (standardHeaders) {
      res.setHeader('RateLimit-Limit', max);
      res.setHeader('RateLimit-Remaining', remaining);
      res.setHeader('RateLimit-Reset', resetTime);
    }

    if (legacyHeaders) {
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', resetTime);
    }

    // Check if rate limited
    if (data.count > max) {
      res.setHeader('Retry-After', Math.ceil((data.resetTime - now) / 1000));

      return res.status(429).json({
        success: false,
        message: message,
        code: 'RATE_LIMITED',
        retryAfter: Math.ceil((data.resetTime - now) / 1000)
      });
    }

    // Handle skip options
    if (skipSuccessfulRequests || skipFailedRequests) {
      const originalEnd = res.end;
      res.end = function(...args) {
        if (skipSuccessfulRequests && res.statusCode < 400) {
          data.count--;
        }
        if (skipFailedRequests && res.statusCode >= 400) {
          data.count--;
        }
        originalEnd.apply(res, args);
      };
    }

    next();
  };
}

/**
 * General API rate limiter
 * 100 requests per 15 minutes
 */
const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many API requests, please try again later'
});

/**
 * Auth rate limiter (stricter)
 * 5 login attempts per 15 minutes
 */
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later',
  skipSuccessfulRequests: true
});

/**
 * Register rate limiter
 * 10 registration attempts per hour (increased for development)
 */
const registerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many registration attempts, please try again later',
  skipFailedRequests: true // Don't count failed attempts
});

/**
 * Admin rate limiter (more lenient)
 * 200 requests per 15 minutes
 */
const adminLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Too many admin requests, please try again later'
});

/**
 * Strict rate limiter for sensitive operations
 * 10 requests per hour
 */
const strictLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Rate limit exceeded for this operation'
});

/**
 * IP-based rate limiter with custom key
 */
const ipLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 50,
  keyGenerator: (req) => {
    // Get real IP behind proxy
    return req.headers['x-forwarded-for']?.split(',')[0] || 
           req.headers['x-real-ip'] || 
           req.ip;
  }
});

/**
 * User-based rate limiter
 */
const userLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => {
    return req.user?.id ? `user:${req.user.id}` : req.ip;
  }
});

/**
 * Slow down middleware - adds delay instead of blocking
 */
function createSlowDown(options = {}) {
  const {
    windowMs = 15 * 60 * 1000,
    delayAfter = 50,
    delayMs = 500,
    maxDelayMs = 20000
  } = options;

  const store = new Map();

  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();

    let data = store.get(key);

    if (!data || now > data.resetTime) {
      data = { count: 0, resetTime: now + windowMs };
      store.set(key, data);
    }

    data.count++;

    if (data.count > delayAfter) {
      const delay = Math.min(
        (data.count - delayAfter) * delayMs,
        maxDelayMs
      );
      
      return setTimeout(next, delay);
    }

    next();
  };
}

module.exports = {
  createRateLimiter,
  apiLimiter,
  authLimiter,
  registerLimiter,
  adminLimiter,
  strictLimiter,
  ipLimiter,
  userLimiter,
  createSlowDown
};
