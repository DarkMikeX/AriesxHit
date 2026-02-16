// ===================================
// DATABASE.JS
// SQLite Database Configuration (using sql.js - pure JS)
// ===================================

const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

// Database path
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../database/ariesxhit.db');
const DB_DIR = path.dirname(DB_PATH);
const BACKUP_PATH = process.env.DATABASE_BACKUP_PATH || path.join(__dirname, '../database/backup/ariesxhit.db');

// Ensure database directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
  console.log('✅ Database directory created:', DB_DIR);
}

// Ensure backup directory exists
const BACKUP_DIR = path.dirname(BACKUP_PATH);
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log('✅ Backup directory created:', BACKUP_DIR);
}

// Database wrapper to provide better-sqlite3 compatible API
class DatabaseWrapper {
  constructor() {
    this.db = null;
    this.ready = false;
    this.initPromise = this.initialize();
  }

  async initialize() {
    const SQL = await initSqlJs();

    // Try to restore from backup first
    if (fs.existsSync(BACKUP_PATH)) {
      try {
        console.log('🔄 Attempting to restore from backup:', BACKUP_PATH);
        const backupBuffer = fs.readFileSync(BACKUP_PATH);
        this.db = new SQL.Database(backupBuffer);
        console.log('✅ Database restored from backup!');
        this.ready = true;
        this.initializeTables(); // Ensure tables exist
        this.save(); // Save to main location
        return this;
      } catch (error) {
        console.error('❌ Failed to restore from backup:', error.message);
        // Continue with normal initialization
      }
    }

    // Load existing database or create new one
    if (fs.existsSync(DB_PATH)) {
      const fileBuffer = fs.readFileSync(DB_PATH);
      this.db = new SQL.Database(fileBuffer);
      console.log('💾 Database loaded:', DB_PATH);
    } else {
      this.db = new SQL.Database();
      console.log('💾 New database created:', DB_PATH);
    }

    this.ready = true;
    this.initializeTables();
    this.createDefaultAdmin();
    this.save();

    return this;
  }

  // Save database to file
  save() {
    if (this.db) {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(DB_PATH, buffer);
    }
  }

  // Backup database to persistent location
  backup() {
    if (this.db && this.ready) {
      try {
        const data = this.db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(BACKUP_PATH, buffer);
        console.log('💾 Database backed up to:', BACKUP_PATH);
        return true;
      } catch (error) {
        console.error('❌ Database backup failed:', error.message);
        return false;
      }
    }
    return false;
  }

  // Restore database from backup
  restore() {
    if (fs.existsSync(BACKUP_PATH)) {
      try {
        const backupBuffer = fs.readFileSync(BACKUP_PATH);
        this.db = new SQL.Database(backupBuffer);
        console.log('✅ Database restored from backup!');
        this.save(); // Save to main location
        return true;
      } catch (error) {
        console.error('❌ Database restore failed:', error.message);
        return false;
      }
    }
    console.log('❌ No backup file found');
    return false;
  }

  // Prepare statement (returns object with run, get, all methods)
  prepare(sql) {
    const self = this;
    return {
      run(...params) {
        try {
          // sql.js run method: run(sql, params) where params is an array
          const paramArray = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
          self.db.run(sql, paramArray);
          const result = {
            changes: self.db.getRowsModified(),
            lastInsertRowid: self.getLastInsertRowId()
          };
          self.save();
          return result;
        } catch (error) {
          console.error('SQL Error:', error.message, '\nSQL:', sql);
          throw error;
        }
      },
      get(...params) {
        try {
          const stmt = self.db.prepare(sql);
          // sql.js bind accepts an array or individual arguments
          if (params.length > 0) {
            stmt.bind(params.length === 1 && Array.isArray(params[0]) ? params[0] : params);
          }
          if (stmt.step()) {
            const row = stmt.getAsObject();
            stmt.free();
            return row;
          }
          stmt.free();
          return undefined;
        } catch (error) {
          console.error('SQL Error:', error.message, '\nSQL:', sql);
          throw error;
        }
      },
      all(...params) {
        try {
          const results = [];
          const stmt = self.db.prepare(sql);
          // sql.js bind accepts an array or individual arguments
          if (params.length > 0) {
            stmt.bind(params.length === 1 && Array.isArray(params[0]) ? params[0] : params);
          }
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          stmt.free();
          return results;
        } catch (error) {
          console.error('SQL Error:', error.message, '\nSQL:', sql);
          throw error;
        }
      }
    };
  }

  // Execute SQL directly
  exec(sql) {
    try {
      this.db.run(sql);
      this.save();
    } catch (error) {
      console.error('SQL Exec Error:', error.message, '\nSQL:', sql);
      throw error;
    }
  }

  // Get last insert row ID
  getLastInsertRowId() {
    try {
      const result = this.db.exec('SELECT last_insert_rowid() as id');
      if (result.length > 0 && result[0].values.length > 0) {
        return result[0].values[0][0];
      }
      return 0;
    } catch (error) {
      console.error('Error getting last insert rowid:', error);
      return 0;
    }
  }

  // Pragma command
  pragma(sql) {
    this.db.run('PRAGMA ' + sql);
  }

  // Close database
  close() {
    if (this.db) {
      this.backup(); // Backup before closing
      this.save();
      this.db.close();
      console.log('Database connection closed.');
    }
  }

  // Initialize tables
  initializeTables() {
    console.log('📋 Initializing database tables...');

    // Users table
    this.exec(`
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
    this.exec(`
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
    this.exec(`
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

    // Telegram bot data tables
    this.exec(`
      CREATE TABLE IF NOT EXISTS telegram_users (
        tg_id TEXT PRIMARY KEY,
        name TEXT,
        hits INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.exec(`
      CREATE TABLE IF NOT EXISTS telegram_user_data (
        tg_id TEXT PRIMARY KEY,
        data_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tg_id) REFERENCES telegram_users(tg_id) ON DELETE CASCADE
      )
    `);

    // Create indexes
    this.exec(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
    this.exec(`CREATE INDEX IF NOT EXISTS idx_users_fingerprint ON users(fingerprint_hash)`);
    this.exec(`CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)`);
    this.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`);
    this.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`);
    this.exec(`CREATE INDEX IF NOT EXISTS idx_login_attempts_username ON login_attempts(username)`);
    this.exec(`CREATE INDEX IF NOT EXISTS idx_telegram_users_tg_id ON telegram_users(tg_id)`);
    this.exec(`CREATE INDEX IF NOT EXISTS idx_telegram_user_data_tg_id ON telegram_user_data(tg_id)`);

    console.log('✅ Database tables initialized successfully!');
  }

  // Create default admin user
  createDefaultAdmin() {
    const bcrypt = require('bcryptjs');
    
    // Check if admin exists
    const adminExists = this.prepare('SELECT id FROM users WHERE username = ?').get('admin');
    
    if (!adminExists) {
      console.log('👤 Creating default admin user...');
      
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      const passwordHash = bcrypt.hashSync(adminPassword, 10);
      
      const permissions = JSON.stringify({
        auto_hit: true,
        bypass: true,
        admin: true
      });
      
      // Valid 64-character SHA-256 hash for testing
      const adminFingerprint = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
      
      this.prepare(`
        INSERT INTO users (username, fingerprint_hash, password_hash, status, permissions, approved_at)
        VALUES (?, ?, ?, 'active', ?, CURRENT_TIMESTAMP)
      `).run('admin', adminFingerprint, passwordHash, permissions);
      
      console.log('✅ Default admin user created!');
      console.log('   Username: admin');
      console.log('   Password:', adminPassword);
      console.log('   ⚠️  CHANGE THIS PASSWORD IN PRODUCTION!');
    }
  }

  // Get database info
  getInfo() {
    const userCount = this.prepare('SELECT COUNT(*) as count FROM users').get();
    const sessionCount = this.prepare('SELECT COUNT(*) as count FROM sessions').get();
    const attemptCount = this.prepare('SELECT COUNT(*) as count FROM login_attempts').get();
    
    let fileSize = 0;
    let created = new Date();
    if (fs.existsSync(DB_PATH)) {
      const stats = fs.statSync(DB_PATH);
      fileSize = stats.size;
      created = stats.birthtime;
    }
    
    return {
      path: DB_PATH,
      users: userCount?.count || 0,
      sessions: sessionCount?.count || 0,
      loginAttempts: attemptCount?.count || 0,
      size: fileSize,
      created: created
    };
  }

  // Clean expired sessions
  cleanExpiredSessions() {
    const result = this.prepare('DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP').run();
    return result.changes;
  }

  // Clean old login attempts
  cleanOldLoginAttempts() {
    const result = this.prepare(`
      DELETE FROM login_attempts 
      WHERE id NOT IN (
        SELECT id FROM login_attempts 
        ORDER BY attempted_at DESC 
        LIMIT 1000
      )
    `).run();
    return result.changes;
  }
}

// Create singleton instance
const db = new DatabaseWrapper();

// Schedule cleanup tasks
setInterval(() => {
  if (db.ready) {
    const cleaned = db.cleanExpiredSessions();
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired sessions`);
    }
  }
}, 60 * 60 * 1000); // Every hour

// Export the database wrapper
module.exports = db;
