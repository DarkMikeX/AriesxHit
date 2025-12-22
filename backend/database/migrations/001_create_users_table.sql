-- ===================================
-- 001_CREATE_USERS_TABLE.SQL
-- Database Migration - Initial Schema
-- AriesxHit Backend
-- ===================================

-- ===================================
-- USERS TABLE
-- ===================================
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
);

-- ===================================
-- SESSIONS TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ===================================
-- LOGIN ATTEMPTS TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    fingerprint_hash TEXT NOT NULL,
    ip_address TEXT,
    success INTEGER DEFAULT 0,
    error_message TEXT,
    attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ===================================
-- INDEXES
-- ===================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_fingerprint ON users(fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Login attempts indexes
CREATE INDEX IF NOT EXISTS idx_login_attempts_username ON login_attempts(username);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_fingerprint ON login_attempts(fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_login_attempts_time ON login_attempts(attempted_at);

-- ===================================
-- TRIGGERS
-- ===================================

-- Trigger to update approved_at when status changes to active
CREATE TRIGGER IF NOT EXISTS update_approved_at
AFTER UPDATE ON users
WHEN NEW.status = 'active' AND OLD.status = 'pending'
BEGIN
    UPDATE users SET approved_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ===================================
-- VIEWS
-- ===================================

-- View for pending users
CREATE VIEW IF NOT EXISTS pending_users AS
SELECT id, username, created_at
FROM users
WHERE status = 'pending'
ORDER BY created_at DESC;

-- View for active users
CREATE VIEW IF NOT EXISTS active_users AS
SELECT id, username, permissions, created_at, approved_at, last_login
FROM users
WHERE status = 'active'
ORDER BY last_login DESC;

-- View for blocked users
CREATE VIEW IF NOT EXISTS blocked_users AS
SELECT id, username, blocked_reason, created_at
FROM users
WHERE status = 'blocked'
ORDER BY created_at DESC;

-- View for user statistics
CREATE VIEW IF NOT EXISTS user_stats AS
SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
    SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked
FROM users;

-- View for recent login attempts
CREATE VIEW IF NOT EXISTS recent_login_attempts AS
SELECT 
    la.*,
    u.status as user_status
FROM login_attempts la
LEFT JOIN users u ON la.username = u.username
ORDER BY la.attempted_at DESC
LIMIT 100;

-- View for active sessions with user info
CREATE VIEW IF NOT EXISTS active_sessions AS
SELECT 
    s.id,
    s.user_id,
    u.username,
    s.created_at,
    s.expires_at
FROM sessions s
JOIN users u ON s.user_id = u.id
WHERE s.expires_at > CURRENT_TIMESTAMP
ORDER BY s.created_at DESC;
