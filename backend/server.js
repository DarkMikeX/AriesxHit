// ===================================
// SERVER.JS
// Main Server Entry Point
// AriesxHit Backend API
// ===================================

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Import database
const db = require('./config/database');

// Import routes (after db is set up)
let routes;

// Import middleware
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const { trimBody } = require('./middleware/validateInput');

// Initialize Express app
const app = express();

// ===================================
// CONFIGURATION
// ===================================

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || (process.env.PORT ? '0.0.0.0' : 'localhost');
const NODE_ENV = process.env.NODE_ENV || 'development';
const API_PREFIX = process.env.API_PREFIX || '/api';

// ===================================
// SECURITY MIDDLEWARE
// ===================================

// Helmet for security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Allow Chrome extensions
    if (origin.startsWith('chrome-extension://')) {
      return callback(null, true);
    }

    // Allow localhost in development
    if (NODE_ENV === 'development') {
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
    }

    // Check allowed origins from environment
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Default: allow all in development, deny in production
    if (NODE_ENV === 'development') {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Fingerprint', 'X-Requested-With'],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset']
};

app.use(cors(corsOptions));

// ===================================
// PARSING MIDDLEWARE
// ===================================

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trim whitespace from body fields
app.use(trimBody);

// ===================================
// LOGGING MIDDLEWARE
// ===================================

// Request logging
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Custom request logging
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (NODE_ENV === 'development') {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    }
  });

  next();
});

// ===================================
// RATE LIMITING
// ===================================

// Apply rate limiting to all API routes
app.use(API_PREFIX, apiLimiter);

// ===================================
// TRUST PROXY
// ===================================

// Trust proxy for correct IP detection behind reverse proxy
app.set('trust proxy', 1);

// ===================================
// STATIC ROUTES (before dynamic routes)
// ===================================

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'AriesxHit API Server',
    version: '2.0.0',
    documentation: `${API_PREFIX}/health`
  });
});

// Favicon (prevent 404)
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// ===================================
// GRACEFUL SHUTDOWN
// ===================================

function gracefulShutdown(signal, server) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  
  server.close(() => {
    console.log('HTTP server closed.');
    
    // Close database connection
    db.close();
    console.log('Database connection closed.');
    
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

// ===================================
// START SERVER
// ===================================

async function startServer() {
  // Wait for database to be ready
  console.log('⏳ Waiting for database initialization...');
  await db.initPromise;
  console.log('✅ Database ready!');
  
  // Now load routes (they depend on db)
  routes = require('./routes');
  
  // API routes
  app.use(API_PREFIX, routes);
  
  // 404 handler
  app.use(notFoundHandler);
  
  // Global error handler
  app.use(errorHandler);
  
  const server = app.listen(PORT, HOST, () => {
    console.log('\n===================================');
    console.log('🔥 AriesxHit Backend API Server');
    console.log('===================================');
    console.log(`📡 Server:      http://${HOST}:${PORT}`);
    console.log(`🌍 Environment: ${NODE_ENV}`);
    console.log(`🔗 API Prefix:  ${API_PREFIX}`);
    console.log(`❤️  Health:      http://${HOST}:${PORT}${API_PREFIX}/health`);
    console.log('===================================\n');
  });

  // Handle shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM', server));
  process.on('SIGINT', () => gracefulShutdown('SIGINT', server));
}

// Start the server
startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;
