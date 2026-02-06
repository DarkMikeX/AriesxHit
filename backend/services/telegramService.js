// ===================================
// Telegram Bot Service
// Uses your bot to send OTP, hit notifications, and photos
// ===================================

const TELEGRAM_API = 'https://api.telegram.org/bot';

async function sendMessage(botToken, chatId, text, opts = {}) {
  if (!botToken || !chatId) return { ok: false, error: 'Missing bot token or chat_id' };
  try {
    const url = `${TELEGRAM_API}${botToken}/sendMessage`;
    const body = {
      chat_id: String(chatId).replace(/\D/g, '') || chatId,
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

async function sendPhoto(botToken, chatId, photoBase64, caption) {
  if (!botToken || !chatId || !photoBase64) return { ok: false, error: 'Missing bot token, chat_id or photo' };
  try {
    const FormData = require('form-data');
    const base64Data = String(photoBase64).replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const form = new FormData();
    form.append('chat_id', String(chatId).replace(/\D/g, '') || chatId);
    form.append('photo', buffer, { filename: 'screenshot.png', contentType: 'image/png' });
    if (caption) {
      form.append('caption', caption);
      form.append('parse_mode', 'HTML');
    }
    const url = `${TELEGRAM_API}${botToken}/sendPhoto`;
    const res = await fetch(url, {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
    });
    const data = await res.json();
    return { ok: data.ok, error: data.description };
  } catch (e) {
    return { ok: false, error: e.message };
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
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
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

// User hits store (tg_id -> count) and global hits
const userHitsStore = new Map();
const userNamesStore = new Map(); // tg_id -> firstName (for scoreboard)
let globalHits = 0;

function getUserHits(tgId) {
  return userHitsStore.get(String(tgId)) || 0;
}

function getGlobalHits() {
  return globalHits;
}

function incrementUserHits(tgId) {
  const id = String(tgId);
  const cur = userHitsStore.get(id) || 0;
  userHitsStore.set(id, cur + 1);
  globalHits++;
}

function setUserName(tgId, firstName) {
  if (tgId && firstName) userNamesStore.set(String(tgId), String(firstName));
}

function getUserName(tgId) {
  return userNamesStore.get(String(tgId)) || 'User';
}

function getTopUsers(limit = 10) {
  const entries = [...userHitsStore.entries()]
    .filter(([, hits]) => hits > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
  return entries.map(([tgId, hits]) => ({
    tg_id: tgId,
    name: getUserName(tgId),
    hits,
  }));
}

function getUserRank(tgId) {
  const sorted = [...userHitsStore.entries()]
    .filter(([, hits]) => hits > 0)
    .sort((a, b) => b[1] - a[1]);
  const idx = sorted.findIndex(([id]) => id === String(tgId));
  return idx === -1 ? null : idx + 1;
}

// User data store (tg_id -> { savedBins, savedCards, ... }) - BINs, CCs, prefs
const userDataStore = new Map();

function setUserData(tgId, data) {
  if (!tgId || typeof data !== 'object') return;
  const id = String(tgId);
  const existing = userDataStore.get(id) || {};
  userDataStore.set(id, { ...existing, ...data });
}

function getUserData(tgId) {
  return userDataStore.get(String(tgId)) || null;
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
  getUserRank,
  setUserData,
  getUserData,
};
