// ===================================
// CORS.JS
// CORS Configuration
// ===================================

const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests from Chrome extensions
    if (!origin || origin.startsWith('chrome-extension://')) {
      return callback(null, true);
    }

    // Allow requests from allowed origins
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : ['http://localhost:3000', 'http://localhost:3001'];

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // In development, allow all origins
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    // Block in production if not in allowed list
    callback(new Error('Not allowed by CORS'));
  },
  
  credentials: true,
  
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Fingerprint',
    'X-Device-Info'
  ],
  
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count',
    'X-Current-Page'
  ],
  
  maxAge: 86400, // 24 hours
  
  optionsSuccessStatus: 200
};

module.exports = corsOptions;
