// ===================================
// CONNECTION.JS
// Database Connection Module
// Alternative import for database
// ===================================

/**
 * This file provides an alternative way to import the database connection.
 * The main database configuration is in config/database.js
 * 
 * Usage:
 *   const db = require('./database/connection');
 *   // or
 *   const db = require('./config/database');
 */

const db = require('../config/database');

module.exports = db;
