// ===================================
// USERS.JS
// User Routes
// ===================================

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authenticate');
const UserController = require('../controllers/userController');
const { validateBody, validateParams, schemas } = require('../middleware/validateInput');

// All user routes require authentication
router.use(authenticate);

// ===================================
// USER PROFILE
// ===================================

/**
 * @route   GET /api/users/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', UserController.getProfile);

/**
 * @route   PUT /api/users/me
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/me', UserController.updateProfile);

/**
 * @route   GET /api/users/status
 * @desc    Get current user status
 * @access  Private
 */
router.get('/status', UserController.getStatus);

// ===================================
// PERMISSIONS
// ===================================

/**
 * @route   GET /api/users/permissions
 * @desc    Get current user permissions
 * @access  Private
 */
router.get('/permissions', UserController.getPermissions);

/**
 * @route   GET /api/users/permissions/:permission
 * @desc    Check if user has specific permission
 * @access  Private
 */
router.get('/permissions/:permission', UserController.checkPermission);

// ===================================
// SESSIONS
// ===================================

/**
 * @route   GET /api/users/sessions
 * @desc    Get current user's active sessions
 * @access  Private
 */
router.get('/sessions', UserController.getSessions);

/**
 * @route   DELETE /api/users/sessions
 * @desc    Revoke all sessions except current
 * @access  Private
 */
router.delete('/sessions', UserController.revokeAllSessions);

/**
 * @route   DELETE /api/users/sessions/:id
 * @desc    Revoke a specific session
 * @access  Private
 */
router.delete('/sessions/:id', UserController.revokeSession);

// ===================================
// FINGERPRINT
// ===================================

/**
 * @route   POST /api/users/verify-fingerprint
 * @desc    Verify device fingerprint
 * @access  Private
 */
router.post('/verify-fingerprint', UserController.verifyFingerprint);

module.exports = router;
