// ===================================
// Telegram Bot Routes
// OTP, Verify, Hit Notifications
// ===================================

const express = require('express');
const router = express.Router();
const {
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
} = require('../services/telegramService');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || '';

// POST /api/tg/send-otp - Send OTP to user's Telegram
router.post('/send-otp', async (req, res) => {
  if (!BOT_TOKEN) {
    return res.status(500).json({ ok: false, error: 'Telegram bot not configured. Add TELEGRAM_BOT_TOKEN to .env' });
  }
  const { tg_id } = req.body || {};
  const tgId = String(tg_id || '').trim();
  if (!tgId) {
    return res.status(400).json({ ok: false, error: 'tg_id required' });
  }
  const token = generateOTP();
  setOTP(tgId, token);
  const otpText = `🔐 <b>ARIESXHIT LOGIN</b>\n` +
    `─────────────────\n\n` +
    `Your verification code:\n\n` +
    `<code>${token}</code>\n\n` +
    `Valid 5 minutes. Enter in extension.`;
  const result = await sendMessage(BOT_TOKEN, tgId, otpText);
  if (result.ok) {
    return res.json({ ok: true });
  }
  return res.status(400).json({ ok: false, error: result.error || 'Failed to send' });
});

// POST /api/tg/verify - Verify OTP token
router.post('/verify', async (req, res) => {
  const { tg_id, token } = req.body || {};
  const tgId = String(tg_id || '').trim();
  const userToken = String(token || '').trim();
  if (!tgId || !userToken) {
    return res.status(400).json({ ok: false, error: 'tg_id and token required' });
  }
  if (verifyOTP(tgId, userToken)) {
    return res.json({ ok: true, name: 'User' });
  }
  return res.status(400).json({ ok: false, error: 'Invalid or expired token' });
});

// POST /api/tg/notify-hit - Send hit notification to user's Telegram (with optional screenshot)
router.post('/notify-hit', async (req, res) => {
  if (!BOT_TOKEN) {
    return res.status(500).json({ ok: false, error: 'Telegram bot not configured' });
  }
  const { tg_id, name, card, attempts, amount, success_url, screenshot, email, time_sec } = req.body || {};
  const tgId = String(tg_id || '').trim();
  if (!tgId) {
    return res.status(400).json({ ok: false, error: 'tg_id required' });
  }
  const userName = name || 'User';
  const tgIdNum = String(tgId).replace(/\D/g, '');
  const nameLink = tgIdNum ? `<a href="tg://user?id=${tgIdNum}">${userName}</a>` : userName;
  const amtDisplay = (amount && String(amount).trim()) || (success_url && /free|trial|0\s*(usd|eur|gbp)/i.test(success_url) ? 'Free Trial' : '—');
  let amtFormatted = amtDisplay;
  if (amtDisplay !== 'Free Trial' && amtDisplay !== '—' && !/^[\$€£]/.test(amtDisplay)) {
    const num = amtDisplay.replace(/[^\d.]/g, '') || '0';
    amtFormatted = '₹' + (parseFloat(num).toFixed(2));
  }
  let businessUrl = '—';
  if (success_url) {
    try {
      const u = new URL(success_url);
      businessUrl = u.hostname.replace(/^www\./, '');
    } catch (_) {}
  }
  const cardDisplay = (card || '').replace(/\|/g, ' | ') || '—';
  const emailDisplay = (email && String(email).trim()) || '—';
  const timeDisplay = (time_sec != null && time_sec !== '') ? `${time_sec}s` : '—';
  const hitText = `🎯 <b>HIT DETECTED</b>\n` +
    `─────────────────\n\n` +
    `Card :- <code>${cardDisplay}</code>\n` +
    `Email :- ${emailDisplay}\n` +
    `Attempt :- ${attempts ?? '—'}\n` +
    `Amount :- ${amtFormatted}\n` +
    `Business URL :- ${success_url ? `<a href="${success_url}">${businessUrl}</a>` : businessUrl}\n` +
    `Time :- ${timeDisplay}\n\n` +
    `Thanks For Using Ariesxhit. ❤️`;
  let result;
  if (screenshot && typeof screenshot === 'string' && screenshot.length > 100) {
    result = await sendPhoto(BOT_TOKEN, tgId, screenshot, hitText);
  } else {
    result = await sendMessage(BOT_TOKEN, tgId, hitText);
  }
  if (result.ok) incrementUserHits(tgId);
  return res.json({ ok: result.ok, error: result.error });
});

// GET /api/tg/user-data - Load user's saved BINs, CCs, prefs
router.get('/user-data', (req, res) => {
  const tgId = String(req.query.tg_id || '').trim();
  if (!tgId) return res.status(400).json({ ok: false, error: 'tg_id required' });
  const data = getUserData(tgId);
  return res.json({ ok: true, data: data || {} });
});

// POST /api/tg/user-data - Save user's BINs, CCs, prefs
router.post('/user-data', (req, res) => {
  const { tg_id, data } = req.body || {};
  const tgId = String(tg_id || '').trim();
  if (!tgId) return res.status(400).json({ ok: false, error: 'tg_id required' });
  if (typeof data !== 'object') return res.status(400).json({ ok: false, error: 'data object required' });
  setUserData(tgId, data);
  return res.json({ ok: true });
});

// POST /api/tg/validate-token - Validate login token (extension)
router.post('/validate-token', (req, res) => {
  const { token } = req.body || {};
  const user = validateLoginToken(token);
  if (user) {
    return res.json({ ok: true, tg_id: user.tg_id, name: user.name });
  }
  return res.status(400).json({ ok: false, error: 'Invalid or expired token' });
});

// POST /api/tg/webhook - Telegram bot webhook (/start, inline buttons)
function getMainMenuText(firstName, tgId) {
  const myHits = getUserHits(tgId);
  const rank = getUserRank(tgId);
  const rankStr = rank ? ` (Rank #${rank})` : '';
  return `ARIESXHIT\n` +
    `─────────────────\n\n` +
    `Welcome <b>${firstName}</b>\n\n` +
    `📊 Your Hits: ${myHits}${rankStr}\n` +
    `🌍 Global Hits: ${getGlobalHits()}\n\n` +
    `Select an option:`;
}

router.post('/webhook', async (req, res) => {
  res.status(200).end();
  if (!BOT_TOKEN) return;
  const u = req.body;
  const msg = u?.message;
  const cb = u?.callback_query;
  const chatId = msg?.chat?.id || cb?.message?.chat?.id;
  const messageId = cb?.message?.message_id;
  const firstName = msg?.from?.first_name || cb?.from?.first_name || 'User';
  const tgId = String(msg?.from?.id || cb?.from?.id || '');
  const backBtn = [{ text: '← Back', callback_data: 'back' }];
  const replyMarkup = (kb) => ({ reply_markup: JSON.stringify(kb) });

  if (cb) {
    setUserName(tgId, firstName);
    if (cb.data === 'back') {
      await answerCallbackQuery(BOT_TOKEN, cb.id);
      await editMessageText(BOT_TOKEN, chatId, messageId, getMainMenuText(firstName, tgId), replyMarkup(MAIN_MENU_KEYBOARD));
    } else if (cb.data === 'get_login_token') {
      const token = generateLoginToken(tgId, firstName);
      await answerCallbackQuery(BOT_TOKEN, cb.id, 'Token generated!');
      const text = `🔑 <b>LOGIN CODE</b>\n` +
        `─────────────────\n\n` +
        ` Token :- \n\n` +
        `<code>${token}</code>\n\n` +
        `─────────────────\n` +
        `Use To Log In Hitter 💗`;
      await editMessageText(BOT_TOKEN, chatId, messageId, text, replyMarkup({ inline_keyboard: [backBtn] }));
    } else if (cb.data === 'my_stats') {
      const hits = getUserHits(tgId);
      const global = getGlobalHits();
      const text = `📈 <b>YOUR STATS</b>\n` +
        `────────────────────\n\n` +
        `👤 ${firstName}\n\n` +
        `🎯 Hits: ${hits}\n` +
        `🌍 Global: ${global}\n\n` +
        `────────────────────\n` +
        `Join :- @Ariesxhit 💗`;
      await answerCallbackQuery(BOT_TOKEN, cb.id);
      await editMessageText(BOT_TOKEN, chatId, messageId, text, replyMarkup({ inline_keyboard: [backBtn] }));
    } else if (cb.data === 'my_hits') {
      const hits = getUserHits(tgId);
      const global = getGlobalHits();
      const text = `📈 <b>YOUR HITS</b>\n` +
        `────────────────────\n\n` +
        `👤 ${firstName}\n\n` +
        `🎯 Hits: ${hits}\n` +
        `🌍 Global: ${global}\n\n` +
        `────────────────────\n` +
        `Join :- @Ariesxhit 💗`;
      await answerCallbackQuery(BOT_TOKEN, cb.id);
      await editMessageText(BOT_TOKEN, chatId, messageId, text, replyMarkup({ inline_keyboard: [backBtn] }));
    } else if (cb.data === 'scoreboard') {
      const top = getTopUsers(10);
      const rows = top.length ? top.map((u, i) => `${i + 1}. ${u.name}: ${u.hits}`).join('\n') : 'No hits yet.';
      const global = getGlobalHits();
      const text = `🏆 <b>SCOREBOARD</b>\n` +
        `─────────────────\n\n` +
        `${rows}\n\n` +
        `🌍 Global: ${global}\n\n` +
        `─────────────────\n` +
        `Join :- @Ariesxhit 💗`;
      await answerCallbackQuery(BOT_TOKEN, cb.id);
      await editMessageText(BOT_TOKEN, chatId, messageId, text, replyMarkup({ inline_keyboard: [backBtn] }));
    } else if (cb.data === 'profile') {
      const hits = getUserHits(tgId);
      const rank = getUserRank(tgId);
      const rankStr = rank ? `#${rank}` : '—';
      let token = getLoginTokenForUser(tgId);
      if (!token) token = generateLoginToken(tgId, firstName);
      const text = `👤 <b>PROFILE</b>\n` +
        `─────────────────\n` +
        `Code :- \n\n` +
        `<code>${token}</code>\n\n` +
        `─────────────────\n` +
        `Name: ${firstName}\n` +
        `--------------\n` +
        `Hits: ${hits}\n` +
        `Rank: ${rankStr}\n` +
        `--------------\n` +
        `Join :- @Ariesxhit\n` +
        `Thanks For Using AriesxHit 💗\n\n` +
        `─────────────────`;
      await answerCallbackQuery(BOT_TOKEN, cb.id, 'Profile');
      await editMessageText(BOT_TOKEN, chatId, messageId, text, replyMarkup({ inline_keyboard: [backBtn] }));
    } else if (cb.data === 'help') {
      const text = `❓ <b>HELP</b>\n` +
        `─────────────────\n\n` +
        `🔑 Generate Token\n` +
        `Get  token for hitter login\n` +
        `----------------\n` +
        `Enter code in hitter → Login\n` +
        `----------------\n` +
        `📈 My Stats / My Hits – Your hits & rank\n` +
        `----------------\n` +
        `🏆 Scoreboard – Top users\n` +
        `----------------\n` +
        `👤 Profile – Your info\n\n` +
        `─────────────────\n` +
        `Join :- @Ariesxhit\n` +
        `Thanks For Using AriesxHit 💗`;
      await answerCallbackQuery(BOT_TOKEN, cb.id);
      await editMessageText(BOT_TOKEN, chatId, messageId, text, replyMarkup({ inline_keyboard: [backBtn] }));
    }
    return;
  }
  if (msg?.text === '/start') {
    setUserName(tgId, firstName);
    const text = getMainMenuText(firstName, tgId);
    await sendMessage(BOT_TOKEN, chatId, text, replyMarkup(MAIN_MENU_KEYBOARD));
  }
});

module.exports = router;
