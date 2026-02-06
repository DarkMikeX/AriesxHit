// ===================================
// INDEX.JS
// Main Routes Index
// ===================================

const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const userRoutes = require('./users');
const adminRoutes = require('./admin');
const telegramRoutes = require('./telegram');

// ===================================
// HEALTH CHECK
// ===================================

/**
 * @route   GET /api/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'AriesxHit API is running',
    timestamp: new Date().toISOString(),
    version: process.env.API_VERSION || 'v1',
    uptime: process.uptime()
  });
});

/**
 * @route   GET /api/status
 * @desc    Detailed status check
 * @access  Public
 */
router.get('/status', (req, res) => {
  const os = require('os');
  
  res.json({
    success: true,
    data: {
      status: 'operational',
      environment: process.env.NODE_ENV || 'development',
      version: process.env.API_VERSION || 'v1',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: process.memoryUsage()
      },
      cpu: os.cpus().length
    }
  });
});

// ===================================
// MOUNT ROUTES
// ===================================

// Auth routes - /api/auth/*
router.use('/auth', authRoutes);

// User routes - /api/users/*
router.use('/users', userRoutes);

// Admin routes - /api/admin/*
router.use('/admin', adminRoutes);

// Telegram bot routes - /api/tg/*
router.use('/tg', telegramRoutes);

// ===================================
// 404 HANDLER
// ===================================

router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

module.exports = router;
