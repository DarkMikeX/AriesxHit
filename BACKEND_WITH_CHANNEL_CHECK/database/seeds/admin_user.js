// ===================================
// ADMIN_USER.JS
// Admin User Seeder
// ===================================

const bcrypt = require('bcryptjs');

/**
 * Seed admin user
 * @param {Object} db - Database connection
 */
function seedAdminUser(db) {
  console.log('🌱 Seeding admin user...');

  // Check if admin already exists
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');

  if (adminExists) {
    console.log('✅ Admin user already exists');
    return;
  }

  // Get admin credentials from environment or use defaults
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminFingerprint = process.env.ADMIN_FINGERPRINT || 'admin-fingerprint-placeholder';

  // Hash password
  const passwordHash = bcrypt.hashSync(adminPassword, 10);

  // Admin permissions
  const permissions = JSON.stringify({
    auto_hit: true,
    bypass: true,
    admin: true
  });

  // Insert admin user
  const insert = db.prepare(`
    INSERT INTO users (
      username, 
      fingerprint_hash, 
      password_hash, 
      status, 
      permissions, 
      approved_at
    )
    VALUES (?, ?, ?, 'active', ?, CURRENT_TIMESTAMP)
  `);

  try {
    insert.run(adminUsername, adminFingerprint, passwordHash, permissions);

    console.log('✅ Admin user created successfully!');
    console.log('   Username:', adminUsername);
    console.log('   Password:', adminPassword);
    console.log('   ⚠️  CHANGE THIS PASSWORD IN PRODUCTION!');
  } catch (error) {
    console.error('❌ Failed to create admin user:', error.message);
  }
}

/**
 * Create demo users (for development/testing)
 * @param {Object} db - Database connection
 */
function seedDemoUsers(db) {
  if (process.env.NODE_ENV === 'production') {
    console.log('⚠️  Skipping demo users in production');
    return;
  }

  console.log('🌱 Seeding demo users...');

  const demoUsers = [
    {
      username: 'demo_pending',
      fingerprint: 'demo-pending-fingerprint-hash-12345678901234567890123456789012',
      status: 'pending'
    },
    {
      username: 'demo_active',
      fingerprint: 'demo-active-fingerprint-hash-123456789012345678901234567890123',
      password: 'demo123',
      status: 'active',
      permissions: { auto_hit: true, bypass: false, admin: false }
    },
    {
      username: 'demo_blocked',
      fingerprint: 'demo-blocked-fingerprint-hash-12345678901234567890123456789012',
      password: 'demo123',
      status: 'blocked',
      blockedReason: 'Demo blocked user'
    }
  ];

  const insertPending = db.prepare(`
    INSERT OR IGNORE INTO users (username, fingerprint_hash, status)
    VALUES (?, ?, ?)
  `);

  const insertActive = db.prepare(`
    INSERT OR IGNORE INTO users (username, fingerprint_hash, password_hash, status, permissions, approved_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  const insertBlocked = db.prepare(`
    INSERT OR IGNORE INTO users (username, fingerprint_hash, password_hash, status, blocked_reason)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const user of demoUsers) {
    try {
      if (user.status === 'pending') {
        insertPending.run(user.username, user.fingerprint, user.status);
      } else if (user.status === 'active') {
        const passwordHash = bcrypt.hashSync(user.password, 10);
        const permissions = JSON.stringify(user.permissions);
        insertActive.run(user.username, user.fingerprint, passwordHash, user.status, permissions);
      } else if (user.status === 'blocked') {
        const passwordHash = bcrypt.hashSync(user.password, 10);
        insertBlocked.run(user.username, user.fingerprint, passwordHash, user.status, user.blockedReason);
      }
      
      console.log(`   ✅ Created ${user.username} (${user.status})`);
    } catch (error) {
      console.log(`   ⚠️  ${user.username} may already exist`);
    }
  }
}

/**
 * Run all seeders
 * @param {Object} db - Database connection
 */
function runSeeders(db) {
  console.log('\n===================================');
  console.log('🌱 Running Database Seeders');
  console.log('===================================\n');

  seedAdminUser(db);
  
  if (process.env.SEED_DEMO_USERS === 'true') {
    seedDemoUsers(db);
  }

  console.log('\n===================================');
  console.log('✅ Seeding Complete');
  console.log('===================================\n');
}

// Run if executed directly
if (require.main === module) {
  const db = require('../../config/database');
  runSeeders(db);
}

module.exports = {
  seedAdminUser,
  seedDemoUsers,
  runSeeders
};
