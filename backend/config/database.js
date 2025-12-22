// ===================================
// DATABASE.JS
// SQLite Database Configuration
// ===================================

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Database path
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../database/ariesxhit.db');
const DB_DIR = path.dirname(DB_PATH);

// Ensure database directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
  console.log('✅ Database directory created:', DB_DIR);
}

// Initialize database
const db = new Database(DB_PATH, {
  verbose: process.env.NODE_ENV !== 'production' ? console.log : null
});

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('💾 Database connected:', DB_PATH);

// ===================================
// CREATE TABLES
// ===================================

function initializeTables() {
  console.log('📋 Initializing database tables...');

  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      fingerprint_hash TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'active', 'blocked')),
      permissions TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      approved_at DATETIME,
      last_login DATETIME,
      approved_by INTEGER,
      blocked_reason TEXT,
      FOREIGN KEY (approved_by) REFERENCES users(id)
    )
  `);

  // Sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Login attempts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS login_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      fingerprint_hash TEXT NOT NULL,
      ip_address TEXT,
      success INTEGER DEFAULT 0,
      error_message TEXT,
      attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_fingerprint ON users(fingerprint_hash);
    CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_login_attempts_username ON login_attempts(username);
  `);

  console.log('✅ Database tables initialized successfully!');
}

// Initialize tables on startup
initializeTables();

// ===================================
// SEED DEFAULT ADMIN USER
// ===================================

function createDefaultAdmin() {
  const bcrypt = require('bcryptjs');
  
  // Check if admin exists
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  
  if (!adminExists) {
    console.log('👤 Creating default admin user...');
    
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const passwordHash = bcrypt.hashSync(adminPassword, 10);
    
    // Create admin with dummy fingerprint (to be updated on first login)
    const insert = db.prepare(`
      INSERT INTO users (username, fingerprint_hash, password_hash, status, permissions, approved_at)
      VALUES (?, ?, ?, 'active', ?, CURRENT_TIMESTAMP)
    `);
    
    const permissions = JSON.stringify({
      auto_hit: true,
      bypass: true,
      admin: true
    });
    
    insert.run('admin', 'admin-fingerprint-placeholder', passwordHash, permissions);
    
    console.log('✅ Default admin user created!');
    console.log('   Username: admin');
    console.log('   Password:', adminPassword);
    console.log('   ⚠️  CHANGE THIS PASSWORD IN PRODUCTION!');
  }
}

// Create admin on first run
createDefaultAdmin();

// ===================================
// HELPER FUNCTIONS
// ===================================

// Get database info
db.getInfo = function() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  const sessionCount = db.prepare('SELECT COUNT(*) as count FROM sessions').get();
  const attemptCount = db.prepare('SELECT COUNT(*) as count FROM login_attempts').get();
  
  return {
    path: DB_PATH,
    users: userCount.count,
    sessions: sessionCount.count,
    loginAttempts: attemptCount.count,
    size: fs.statSync(DB_PATH).size,
    created: fs.statSync(DB_PATH).birthtime
  };
};

// Clean expired sessions
db.cleanExpiredSessions = function() {
  const result = db.prepare('DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP').run();
  return result.changes;
};

// Clean old login attempts (keep last 1000)
db.cleanOldLoginAttempts = function() {
  const result = db.prepare(`
    DELETE FROM login_attempts 
    WHERE id NOT IN (
      SELECT id FROM login_attempts 
      ORDER BY attempted_at DESC 
      LIMIT 1000
    )
  `).run();
  return result.changes;
};

// Schedule cleanup tasks
setInterval(() => {
  const cleaned = db.cleanExpiredSessions();
  if (cleaned > 0) {
    console.log(`🧹 Cleaned ${cleaned} expired sessions`);
  }
}, 60 * 60 * 1000); // Every hour

// ===================================
// EXPORT
// ===================================

module.exports = db;
