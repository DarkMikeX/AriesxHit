#!/usr/bin/env node

// ===================================
// MANUAL HITS ADDER - CLI TOOL
// Usage: node add-hits-cmd.js <tg_id> <hits_to_add>
// ===================================

const db = require('./config/database');

async function addHitsManually() {
  const args = process.argv.slice(2);

  if (args.length !== 2) {
    console.log('❌ Usage: node add-hits-cmd.js <telegram_id> <hits_to_add>');
    console.log('📝 Example: node add-hits-cmd.js 6447766151 100');
    process.exit(1);
  }

  const tgId = args[0];
  const hitsToAdd = parseInt(args[1]);

  if (isNaN(hitsToAdd) || hitsToAdd <= 0) {
    console.log('❌ Invalid hits amount. Must be a positive number.');
    process.exit(1);
  }

  try {
    await db.initPromise;

    // Check current hits
    const currentUser = db.prepare('SELECT name, hits FROM telegram_users WHERE tg_id = ?').get(tgId);

    if (currentUser) {
      // Update existing user
      const newHits = currentUser.hits + hitsToAdd;
      db.prepare('UPDATE telegram_users SET hits = ?, updated_at = CURRENT_TIMESTAMP WHERE tg_id = ?').run(newHits, tgId);
      console.log(`✅ Updated ${currentUser.name} (${tgId}): ${currentUser.hits} → ${newHits} hits (+${hitsToAdd})`);
    } else {
      // Create new user
      const userName = `User_${tgId.slice(-4)}`; // Generate a default name
      db.prepare('INSERT INTO telegram_users (tg_id, name, hits) VALUES (?, ?, ?)').run(tgId, userName, hitsToAdd);
      console.log(`✅ Created new user ${userName} (${tgId}) with ${hitsToAdd} hits`);
    }

    // Show updated global stats
    const globalHits = db.prepare('SELECT SUM(hits) as total FROM telegram_users').get();
    const realUsers = db.prepare('SELECT COUNT(*) as count FROM telegram_users WHERE tg_id != "SYSTEM_BONUS_HITS"').get();

    console.log(`\n📊 Updated Stats:`);
    console.log(`   🌍 Global Hits: ${globalHits?.total || 0}`);
    console.log(`   👥 Real Users: ${realUsers?.count || 0}`);

    console.log('\n🎯 SUCCESS: Hits added successfully!');

  } catch (error) {
    console.error('❌ Error adding hits:', error.message);
    process.exit(1);
  }
}

addHitsManually();