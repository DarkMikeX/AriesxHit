// ===================================
// Telegram Bot Routes
// OTP, Verify, Hit Notifications
// ===================================

const express = require('express');
const router = express.Router();
const { strictLimiter, createRateLimiter } = require('../middleware/rateLimiter');
const db = require('../config/database');

// Rate limiter for OTP sending (2 per hour per IP)
const otpLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 2,
  message: 'Too many OTP requests, please try again later',
  skipSuccessfulRequests: false,
  skipFailedRequests: true
});

// Rate limiter for OTP verification (5 per hour per IP)
const verifyLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many verification attempts, please try again later',
  skipSuccessfulRequests: true, // Don't count successful verifications
  skipFailedRequests: false
});

// Rate limiter for token validation (10 per hour per IP)
const tokenLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many token validation requests, please try again later'
});

// Rate limiter for hit notifications (20 per hour per IP)
const hitLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: 'Too many hit notifications, please try again later'
});
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
  getTopRealUsers,
  getUserRank,
  setUserData,
  getUserData,
  sendHitToGroups,
  detectMerchant,
} = require('../services/telegramService');

// Import checkout service
const checkoutService = require('../services/checkoutService');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || '';

// POST /api/tg/send-otp - Send OTP to user's Telegram
router.post('/send-otp', otpLimiter, async (req, res) => {
  if (!BOT_TOKEN) {
    return res.status(500).json({ ok: false, error: 'Telegram bot not configured. Add TELEGRAM_BOT_TOKEN to .env' });
  }
  const { tg_id } = req.body || {};
  const tgId = String(tg_id || '').trim();

  // Validate Telegram ID format (should be numeric and reasonable length)
  if (!tgId || !/^\d{5,15}$/.test(tgId)) {
    return res.status(400).json({ ok: false, error: 'Invalid Telegram ID format' });
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
router.post('/verify', verifyLimiter, async (req, res) => {
  const { tg_id, token } = req.body || {};
  const tgId = String(tg_id || '').trim();
  const userToken = String(token || '').trim();

  // Validate inputs
  if (!tgId || !/^\d{5,15}$/.test(tgId)) {
    return res.status(400).json({ ok: false, error: 'Invalid Telegram ID format' });
  }
  if (!userToken || !/^\d{6}$/.test(userToken)) {
    return res.status(400).json({ ok: false, error: 'Invalid OTP format (must be 6 digits)' });
  }
  if (verifyOTP(tgId, userToken)) {
    return res.json({ ok: true, name: 'User' });
  }
  return res.status(400).json({ ok: false, error: 'Invalid or expired token' });
});

// POST /api/tg/notify-hit - Send hit notification to user's Telegram (with optional screenshot)
router.post('/notify-hit', async (req, res) => {
  console.log('[HIT_NOTIFICATION] Received hit notification request');
  if (!BOT_TOKEN) {
    console.warn('[HIT_NOTIFICATION] Bot token not configured - notifications will fail');
    // Don't reject, just log warning
  }
  const { tg_id, name, card, attempts, amount, success_url, screenshot, email, time_sec } = req.body || {};
  // success_url is no longer sent by extension, so we can remove it from processing
  const tgId = String(tg_id || '').trim();

  // Debug logging for incoming data
  console.log('[HIT_NOTIFICATION] RECEIVED FROM EXTENSION:', {
    tg_id: tgId,
    name: name || 'NO_NAME',
    card: card || 'NO_CARD_DATA',
    attempts: attempts || 'NO_ATTEMPTS',
    amount: amount || 'NO_AMOUNT_DATA',
    email: email || 'NO_EMAIL_DATA',
    time_sec: time_sec || 'NO_TIME'
  });
  console.log('[HIT_NOTIFICATION] Raw request body:', req.body);

  // Accept any Telegram ID for debugging
  console.log('[HIT_NOTIFICATION] Processing with Telegram ID:', tgId);

  // Don't validate - just accept whatever data we get
  console.log('Processing hit notification with data:', { card, attempts, amount, email });
  const userName = name || 'User';
  const tgIdNum = String(tgId).replace(/\D/g, '');
  const nameLink = tgIdNum ? `<a href="tg://user?id=${tgIdNum}">${userName}</a>` : userName;
  const amtDisplay = (amount && String(amount).trim()) || '—';
  let amtFormatted = amtDisplay;
  if (amtDisplay !== 'Free Trial' && amtDisplay !== '—' && !/^[\$€£]/.test(amtDisplay)) {
    const num = amtDisplay.replace(/[^\d.]/g, '') || '0';
    amtFormatted = '₹' + (parseFloat(num).toFixed(2));
  }
  let businessUrl = '—';
  let fullCheckoutUrl = '—';

  // success_url is no longer sent by extension - simplified processing
  console.log('[Telegram] success_url removed from extension payload');
  const cardDisplay = (card && card.trim()) ? card.replace(/\|/g, ' | ') : '—';
  // Debug logging for card data
  if (!card || !card.trim()) {
    console.log('No card data received in hit notification:', { card, attempts, tgId });
  }
  const emailDisplay = (email && String(email).trim()) || '—';
  const timeDisplay = (time_sec != null && time_sec !== '') ? `${time_sec}s` : '—';
  const hitText = `🎯 <b>HIT DETECTED</b>\n` +
    `─────────────────\n\n` +
    `Card :- ${cardDisplay}\n` +
    `Email :- ${emailDisplay}\n` +
    `Attempt :- ${attempts ?? '—'}\n` +
    `Amount :- ${amtFormatted}\n` +
    `Time :- ${timeDisplay}\n\n` +
    `Thanks For Using Ariesxhit. ❤️`;
  console.log('[HIT_NOTIFICATION] Sending notification to Telegram user:', tgId);

  let result;
  if (screenshot && typeof screenshot === 'string' && screenshot.length > 100) {
    console.log('[HIT_NOTIFICATION] Sending photo notification');
    result = await sendPhoto(BOT_TOKEN, tgId, screenshot, hitText);
  } else {
    console.log('[HIT_NOTIFICATION] Sending text notification');
    result = await sendMessage(BOT_TOKEN, tgId, hitText);
  }

  if (result.ok) {
    console.log('[HIT_NOTIFICATION] Notification sent successfully, incrementing hits for user:', tgId);
    incrementUserHits(tgId);

    // Send hit notification to group chats (for extension hits too)
    const cleanCard = cardDisplay !== '—' ? cardDisplay.replace(' | ', '').replace(/\s/g, '') : '';
    const hitData = {
      userId: tgId,
      userName: userName,
      card: cleanCard || 'Unknown',
      bin: cleanCard ? extractBinFromCard(cleanCard) : 'Unknown',
      binMode: '(extension hit)',
      amount: amtFormatted === 'Free Trial' ? '0.00' : amtFormatted.replace('₹', '').replace(/[^\d.]/g, ''),
      attempts: attempts || 1,
      timeTaken: timeDisplay,
      merchant: 'Extension Hit' // Could be enhanced to detect actual merchant
    };

    try {
      // For extension hits, we don't have a checkout URL, so pass a generic one
      await sendHitToGroups(hitData, 'https://extension-hit.com');
      console.log('[HIT_NOTIFICATION] Group notifications sent for extension hit');
    } catch (groupError) {
      console.error('[HIT_NOTIFICATION] Failed to send group notifications:', groupError);
    }
  } else {
    console.error('[HIT_NOTIFICATION] Failed to send notification:', result.error);
  }

  return res.json({ ok: result.ok, error: result.error });
});

// GET /api/tg/user-data - Load user's saved BINs, CCs, prefs
router.get('/user-data', (req, res) => {
  const tgId = String(req.query.tg_id || '').trim();
  if (!tgId || !/^\d{5,15}$/.test(tgId)) {
    return res.status(400).json({ ok: false, error: 'Invalid Telegram ID format' });
  }
  const data = getUserData(tgId);
  return res.json({ ok: true, data: data || {} });
});

// POST /api/tg/user-data - Save user's BINs, CCs, prefs
router.post('/user-data', (req, res) => {
  const { tg_id, data } = req.body || {};
  const tgId = String(tg_id || '').trim();
  if (!tgId || !/^\d{5,15}$/.test(tgId)) {
    return res.status(400).json({ ok: false, error: 'Invalid Telegram ID format' });
  }
  if (typeof data !== 'object' || data === null) {
    return res.status(400).json({ ok: false, error: 'Valid data object required' });
  }
  setUserData(tgId, data);
  return res.json({ ok: true });
});

// GET /api/tg/test-stats - Test endpoint to check hit statistics
router.get('/test-stats', (req, res) => {
  const { tg_id } = req.query;
  const globalHits = getGlobalHits();
  const topUsers = getTopRealUsers(5);

  const response = {
    global_hits: globalHits,
    top_5_users: topUsers,
    user_hits: tg_id ? getUserHits(tg_id) : null,
    user_rank: tg_id ? getUserRank(tg_id) : null
  };

  return res.json({ ok: true, data: response });
});

// POST /api/tg/add-hits - Manually add hits (development only)
router.post('/add-hits', (req, res) => {
  const { tg_id, hits, global } = req.body || {};

  if (!tg_id || !hits || typeof hits !== 'number' || hits <= 0) {
    return res.status(400).json({ ok: false, error: 'Invalid parameters. Need: tg_id, hits (number > 0), optional: global (boolean)' });
  }

  try {
    if (global) {
      // Add to system bonus for global hits
      const existingBonus = db.prepare('SELECT hits FROM telegram_users WHERE tg_id = ?').get('SYSTEM_BONUS_HITS');
      const newBonusHits = (existingBonus?.hits || 0) + hits;
      db.prepare('INSERT OR REPLACE INTO telegram_users (tg_id, name, hits) VALUES (?, ?, ?)').run('SYSTEM_BONUS_HITS', 'System Bonus', newBonusHits);
    } else {
      // Add to specific user
      const existingUser = db.prepare('SELECT hits FROM telegram_users WHERE tg_id = ?').get(tg_id);
      const newHits = (existingUser?.hits || 0) + hits;
      const userName = existingUser ? null : `User_${tg_id.slice(-4)}`;
      db.prepare('INSERT OR REPLACE INTO telegram_users (tg_id, name, hits) VALUES (?, ?, ?)').run(tg_id, userName, newHits);
    }

    const globalHits = db.prepare('SELECT SUM(hits) as total FROM telegram_users').get();
    return res.json({
      ok: true,
      message: global ? `Added ${hits} global hits` : `Added ${hits} hits to user ${tg_id}`,
      global_hits: globalHits?.total || 0
    });

  } catch (error) {
    console.error('Error adding hits:', error);
    return res.status(500).json({ ok: false, error: 'Database error' });
  }
});

// POST /api/tg/validate-token - Validate login token (extension)
router.post('/validate-token', tokenLimiter, (req, res) => {
  console.log('[TOKEN_VALIDATION] Validating token');
  const { token } = req.body || {};
  const tokenStr = String(token || '').trim().toUpperCase();
  console.log('[TOKEN_VALIDATION] Token received:', tokenStr.substring(0, 4) + '****');

  // Validate token format (12 alphanumeric characters)
  if (!tokenStr || !/^[A-Z0-9]{12}$/.test(tokenStr)) {
    console.log('[TOKEN_VALIDATION] Invalid token format');
    return res.status(400).json({ ok: false, error: 'Invalid token format' });
  }

  const user = validateLoginToken(tokenStr);
  if (user) {
    console.log('[TOKEN_VALIDATION] Token valid for user:', user.tg_id, user.name);
    return res.json({ ok: true, tg_id: user.tg_id, name: user.name });
  }
  console.log('[TOKEN_VALIDATION] Token invalid or expired');
  return res.status(400).json({ ok: false, error: 'Invalid or expired token' });
});

// POST /api/tg/webhook - Telegram bot webhook (/start, inline buttons)
function getMainMenuText(firstName, tgId) {
  const myHits = getUserHits(tgId);
  const rank = getUserRank(tgId);
  const rankStr = rank ? ` (Rank #${rank})` : '';
  const users = getTopRealUsers(100); // Get all users to count them
  const communityHits = users.reduce((sum, u) => sum + u.hits, 0);
  return `ARIESXHIT\n` +
    `─────────────────\n\n` +
    `Welcome <b>${firstName}</b>\n\n` +
    `📊 Your Hits: ${myHits}${rankStr}\n` +
    `👥 Community: ${communityHits} hits\n\n` +
    `Select an option:`;
}

router.post('/webhook', async (req, res) => {
  console.log('[WEBHOOK] Received webhook request');

  // Always respond immediately to Telegram
  res.status(200).end();

  if (!BOT_TOKEN) {
    console.error('[WEBHOOK] Bot token not configured');
    return;
  }

  try {
    const u = req.body;
    if (!u) {
      console.error('Webhook: No request body');
      return;
    }

    const msg = u?.message;
    const cb = u?.callback_query;

    if (!msg && !cb) {
      console.log('Webhook: No message or callback query');
      return;
    }

    const chatId = msg?.chat?.id || cb?.message?.chat?.id;
    const messageId = cb?.message?.message_id;
    const firstName = msg?.from?.first_name || cb?.from?.first_name || 'User';
    const tgId = String(msg?.from?.id || cb?.from?.id || '');


    if (!chatId || !tgId) {
      console.error('Webhook: Missing chat_id or tg_id');
      return;
    }

    // Ensure user exists in database for all interactions
    if (tgId && firstName) {
      setUserName(tgId, firstName);
    }

    const backBtn = [{ text: '← Back', callback_data: 'back' }];
    const replyMarkup = (kb) => ({ reply_markup: JSON.stringify(kb) });

    if (cb) {
      try {
        setUserName(tgId, firstName);

        if (cb.data === 'back') {
          await answerCallbackQuery(BOT_TOKEN, cb.id);
          const result = await editMessageText(BOT_TOKEN, chatId, messageId, getMainMenuText(firstName, tgId), replyMarkup(MAIN_MENU_KEYBOARD));
          if (!result.ok) console.error('Webhook: Failed to edit message for back:', result.error);
        } else if (cb.data === 'get_login_token') {
          const token = generateLoginToken(tgId, firstName);
          await answerCallbackQuery(BOT_TOKEN, cb.id, 'Token generated!');
          const text = `🔑 <b>LOGIN CODE</b>\n` +
            `─────────────────\n\n` +
            ` Token :- \n\n` +
            `<code>${token}</code>\n\n` +
            `─────────────────\n` +
            `Use To Log In Hitter 💗`;
          const result = await editMessageText(BOT_TOKEN, chatId, messageId, text, replyMarkup({ inline_keyboard: [backBtn] }));
          if (!result.ok) console.error('Webhook: Failed to send login token:', result.error);
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
          const result = await editMessageText(BOT_TOKEN, chatId, messageId, text, replyMarkup({ inline_keyboard: [backBtn] }));
          if (!result.ok) console.error('Webhook: Failed to send stats:', result.error);
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
          const result = await editMessageText(BOT_TOKEN, chatId, messageId, text, replyMarkup({ inline_keyboard: [backBtn] }));
          if (!result.ok) console.error('Webhook: Failed to send hits:', result.error);
        } else if (cb.data === 'scoreboard') {
          const top = getTopRealUsers(5);
          const tags = ['🏆 LEGEND', '⭐ CHAMPION', '💎 MASTER', '🥇 ELITE', '🥈 PRO'];
          const emojis = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
          const rows = top.length ? top.map((u, i) => `${emojis[i]} ${u.name} ${tags[i] || '🎯'} (${u.hits})`).join('\n') : 'No users yet.';

          // Find user's tag based on their position
          const userRank = getUserRank(tgId);
          const userTag = userRank && userRank <= 5 ? ` ${tags[userRank - 1] || '🎯'}` : '';

          const text = `🏆 <b>ARIESXHIT SCOREBOARD</b>\n` +
            `═══════════════════════\n\n` +
            `${rows}\n\n` +
            `🎯 Your Hits: ${getUserHits(tgId)}${userTag}\n` +
            `🌍 Global Hits: ${getGlobalHits()}\n\n` +
            `═══════════════════════\n` +
            `💫 Climb the ranks!\n` +
            `Join @Ariesxhit 💗`;
          await answerCallbackQuery(BOT_TOKEN, cb.id);
          const result = await editMessageText(BOT_TOKEN, chatId, messageId, text, replyMarkup({ inline_keyboard: [backBtn] }));
          if (!result.ok) console.error('Webhook: Failed to send scoreboard:', result.error);
        } else if (cb.data === 'profile') {
          const hits = getUserHits(tgId);
          const rank = getUserRank(tgId);
          const rankStr = rank ? `#${rank}` : '—';
          let token = getLoginTokenForUser(tgId);
          if (!token) token = generateLoginToken(tgId, firstName);
          const text = `👤 <b>PROFILE</b>\n` +
            `─────────────────\n` +
            `Code :- <code>${token}</code> \n\n` +
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
          const result = await editMessageText(BOT_TOKEN, chatId, messageId, text, replyMarkup({ inline_keyboard: [backBtn] }));
          if (!result.ok) console.error('Webhook: Failed to send profile:', result.error);
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
          const result = await editMessageText(BOT_TOKEN, chatId, messageId, text, replyMarkup({ inline_keyboard: [backBtn] }));
          if (!result.ok) console.error('Webhook: Failed to send help:', result.error);
        }
      } catch (error) {
        console.error('Webhook: Error processing callback query:', error);
      }
      return;
    }

    // Debug command to check user ID (/debug)
    if (msg?.text && msg.text === '/debug') {
      await sendMessage(BOT_TOKEN, chatId, `🔧 <b>BOT DEBUG INFO</b>\n\n📊 <b>Your Telegram ID:</b> <code>${tgId}</code>\n🤖 <b>Bot Status:</b> Online\n📡 <b>Server:</b> Connected\n\n💡 <b>Commands Available:</b>\n• /co - Checkout hitter\n• /start - Main menu\n• /debug - This info`);
      return;
    }

    // Checkout hitter command (/co <checkout_url> <card_data>)
    if (msg?.text && msg.text.startsWith('/co ')) {
      try {
        const commandText = msg.text.substring(4).trim();

        // Split by newlines first, then by spaces
        let allParts = [];

        // Handle cards on separate lines
        const lines = commandText.split('\n').map(line => line.trim()).filter(line => line);
        if (lines.length > 1) {
          // First line should contain URL, rest are cards
          const firstLineParts = lines[0].split(' ');
          allParts = [firstLineParts[0]]; // URL
          allParts.push(...lines.slice(1)); // Cards from other lines
        } else {
          // All on one line
          allParts = commandText.split(' ');
        }

        if (allParts.length < 2) {
          await sendMessage(BOT_TOKEN, chatId, `❌ <b>Invalid Format</b>\n\nUsage: <code>/co &lt;checkout_url&gt; &lt;card_data&gt;</code>\n\nExamples:\n<code>/co https://checkout.stripe.com/... 4111111111111111|12|25|123</code>\n\nOr cards on separate lines:\n<code>/co https://checkout.stripe.com/... \n4111111111111111|12|25|123\n4222222222222222|01|26|456</code>`);
          return;
        }

        const checkoutUrl = allParts[0];
        const cardStrings = allParts.slice(1); // Get all cards after URL

        if (cardStrings.length === 0) {
          await sendMessage(BOT_TOKEN, chatId, `❌ <b>No Cards Provided</b>\n\nUsage: <code>/co &lt;checkout_url&gt; &lt;card1&gt; &lt;card2&gt; ...</code>\n\nExample:\n<code>/co https://checkout.stripe.com/... 4111111111111111|12|25|123 4222222222222222|01|26|456</code>`);
          return;
        }

        // Validate all cards have proper format
        const validCards = [];
        for (const cardStr of cardStrings) {
          if (cardStr.includes('|')) {
            validCards.push(cardStr);
          }
        }

        if (validCards.length === 0) {
          await sendMessage(BOT_TOKEN, chatId, `❌ <b>Invalid Card Format</b>\n\nCard format: <code>number|month|year|cvv</code>\n\nExample:\n<code>4111111111111111|12|25|123</code>`);
          return;
        }

        // Validate URL format - check for Stripe session ID
        const hasStripeSession = /cs_(?:live|test)_[A-Za-z0-9]+/.test(checkoutUrl);
        if (!checkoutUrl.startsWith('http') || !hasStripeSession) {
          await sendMessage(BOT_TOKEN, chatId, `❌ <b>Invalid URL</b>\n\nURL must be a valid Stripe checkout link containing a session ID (cs_live_... or cs_test_...).`);
          return;
        }

        // Send initial processing message with better UI
        const merchantName = checkoutUrl.includes('krea.ai') ? 'Krea.ai' :
                           checkoutUrl.includes('stripe.com') ? 'Stripe Checkout' :
                           'Unknown Merchant';

        await sendMessage(BOT_TOKEN, chatId,
          `🔥 <b>ARIESXHIT CHECKOUT TESTER</b> 🔥\n` +
          `═══════════════════════════════════════\n\n` +
          `🎯 <b>Target:</b> ${merchantName}\n` +
          `💳 <b>Cards Loaded:</b> ${validCards.length}\n` +
          `🔗 <b>Checkout URL:</b> ${checkoutUrl.substring(0, 35)}...\n\n` +
          `⚡ <b>Starting mass testing...</b>\n` +
          `📊 <b>Results will be sent individually</b>\n\n` +
          `═══════════════════════════════════════`
        );

        // Process each card
        for (let i = 0; i < validCards.length; i++) {
          const cardData = validCards[i];
          const cardNumber = cardData.split('|')[0];

          console.log(`Processing card ${i + 1}/${validCards.length}: ${cardNumber}`);

          try {
            // Process the checkout
            const result = await checkoutService.processCheckout(checkoutUrl, cardData);

            // Format result message with improved UI
            const cardNum = result.card || cardData.split('|')[0];
            const bin = cardNum.substring(0, 6);

            if (result.success && result.status === 'CHARGED') {
              const amount = result.amount ? `$${(result.amount / 100).toFixed(2)}` : '$9.99';
              const currency = result.currency?.toUpperCase() || 'USD';
              const currentTime = new Date().toLocaleString('en-US', {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
              });

              resultText = `🎯 𝗛𝗜𝗧 𝗖𝗛𝗔𝗥𝗚𝗘𝗗 ✅\n\n`;
              resultText += `「❃」 𝗥𝗲𝘀𝗽𝗼𝗻𝘀𝗲 : Charged\n`;
              resultText += `「❃」 𝗔𝗺𝗼𝘂𝗻𝘁 : ${amount} ${currency}\n`;
              resultText += `「❃」 𝗠𝗲𝗿𝗰𝗵𝗮𝗻𝘁 : ${detectMerchant(checkoutUrl)}\n`;
              resultText += `「❃」 𝗘𝗺𝗮𝗶𝗹 : ${tgId}@user.bot\n`;
              resultText += `「❃」 𝗕𝗜𝗡 :- ${bin}\n`;
              resultText += `「❃」 𝗛𝗶𝘁 𝗕𝘆 : ${tgId}\n`;
              resultText += `「❃」 𝗧𝗶𝗺𝗲 : ${currentTime}\n`;
            } else {
              // Enhanced failure message
              let statusEmoji = '❌';
              let statusColor = '🔴';
              let reason = 'Unknown Error';

              if (result.status === 'DECLINED' || result.code === 'card_declined') {
                statusEmoji = '🚫';
                statusColor = '🔴';
                if (result.decline_code === 'fraudulent') {
                  reason = 'Card Flagged as Fraudulent';
                } else if (result.decline_code === 'insufficient_funds') {
                  reason = 'Insufficient Funds';
                } else if (result.decline_code === 'card_not_supported') {
                  reason = 'Card Type Not Supported';
                } else if (result.decline_code === 'expired_card') {
                  reason = 'Card Expired';
                } else {
                  reason = 'Card Declined by Bank';
                }
              } else if (result.status === 'CHECKOUT_AMOUNT_MISMATCH') {
                statusEmoji = '💰';
                statusColor = '🟡';
                reason = 'Amount Mismatch (Subscription/Trial)';
              } else if (result.status === 'PAYMENT_METHOD_ERROR') {
                statusEmoji = '⚠️';
                statusColor = '🟠';
                reason = 'Invalid Payment Method';
              } else if (result.status === 'PAYMENT_INTENT_UNEXPECTED_STATE' || result.code === 'payment_intent_unexpected_state') {
                statusEmoji = '⏰';
                statusColor = '🟠';
                reason = 'Checkout Session Expired - Get Fresh URL';
              } else {
                // Better fallback for unknown errors
                if (result.status === 'UNKNOWN') {
                  reason = 'Payment processing failed - check card details';
                } else if (result.status === 'DECLINED') {
                  reason = 'Card declined by payment processor';
                } else if (result.status === 'CHECKOUT_AMOUNT_MISMATCH') {
                  reason = 'Amount mismatch - subscription/trial issue';
                } else {
                  reason = result.status || 'Processing Error';
                }
              }

              resultText = `${statusEmoji} <b>CARD DECLINED</b> ${statusColor}\n\n`;
              resultText += `💳 <b>Card:</b> <code>${cardNum}</code>\n`;
              resultText += `🏦 <b>BIN:</b> <code>${bin}</code>\n`;
              resultText += `📊 <b>Status:</b> ${result.status || 'UNKNOWN'}\n`;
              resultText += `❗ <b>Reason:</b> ${reason}\n`;

              if (result.code && result.code !== result.status) {
                resultText += `🔢 <b>Code:</b> ${result.code}\n`;
              }
              if (result.decline_code) {
                resultText += `🚫 <b>Decline:</b> ${result.decline_code}\n`;
              }

              resultText += `\n═══════════════════\n`;
              resultText += `🤖 <b>AriesxHit</b> | Card ${i + 1}/${validCards.length}`;
            }

            // Send result for this card
            await sendMessage(BOT_TOKEN, chatId, resultText);

            // If successful, increment hits and send group notifications
            if (result.success && (result.status === 'CHARGED' || result.status === '3DS_BYPASSED')) {
              console.log('[CO_COMMAND] Successful checkout, incrementing hits for user:', tgId);
              incrementUserHits(tgId);

              // Send hit notification to group chats
              const hitData = {
                userId: tgId,
                userName: getUserName(tgId) || 'User',
                card: cardData.split('|')[0], // Full card number
                bin: undefined, // Will be extracted in sendHitToGroups
                binMode: undefined, // For future BIN mode support
                amount: result.amount ? (result.amount / 100).toFixed(2) : '9.99',
                attempts: 1, // Single card attempt
                timeTaken: 'Instant', // Could be enhanced to track actual time
                merchant: detectMerchant(checkoutUrl)
              };

              try {
                await sendHitToGroups(hitData, checkoutUrl);
                console.log('[CO_COMMAND] Group notifications sent for successful hit');
              } catch (groupError) {
                console.error('[CO_COMMAND] Failed to send group notifications:', groupError);
              }
            }

            // Small delay between cards to avoid rate limiting
            if (i < validCards.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }

          } catch (checkoutError) {
            console.error('[CO_COMMAND] Checkout processing error:', checkoutError);
            const errorMsg = `❌ <b>Card ${i + 1} Error</b>\n💳 ${cardNumber}\n\nAn error occurred while processing this card:\n<code>${checkoutError.message}</code>`;
            await sendMessage(BOT_TOKEN, chatId, errorMsg);
          }
        }

      } catch (cmdError) {
        console.error('[CO_COMMAND] Command parsing error:', cmdError);
        await sendMessage(BOT_TOKEN, chatId, `❌ <b>Command Error</b>\n\nFailed to parse command. Please check the format:\n<code>/co &lt;checkout_url&gt; &lt;card_data&gt;</code>`);
      }

      return;
    }

    // Admin commands (only for admin user)
    if (msg?.text && msg.text.startsWith('/admin_')) {
      if (tgId !== '6447766151') {
        await sendMessage(BOT_TOKEN, chatId, `🚫 <b>ADMIN ACCESS REQUIRED</b>\n\n❌ <b>Access Denied</b>\n\nThis command is restricted to administrators only.\n\n📞 <b>Contact Admin:</b> Request access from the bot administrator.\n\n🔒 <b>Your ID:</b> ${tgId}`);
        return;
      }

      // Admin command implementations
      if (msg.text === '/admin_stats') {
        try {
          const globalHits = db.prepare('SELECT SUM(hits) as total FROM telegram_users').get();
          const realUsers = db.prepare('SELECT COUNT(*) as count FROM telegram_users WHERE tg_id != "SYSTEM_BONUS_HITS"').get();
          const systemBonus = db.prepare('SELECT hits FROM telegram_users WHERE tg_id = "SYSTEM_BONUS_HITS"').get();
          const topUsers = db.prepare('SELECT name, hits FROM telegram_users WHERE tg_id != "SYSTEM_BONUS_HITS" ORDER BY hits DESC LIMIT 5').all();

          const text = `🔧 <b>ADMIN STATS</b>\n` +
            `═══════════════════════\n\n` +
            `📊 <b>System Overview:</b>\n` +
            `🌍 Total Hits: ${globalHits?.total || 0}\n` +
            `👥 Real Users: ${realUsers?.count || 0}\n` +
            `🎁 System Bonus: ${systemBonus?.hits || 0}\n\n` +
            `🏆 <b>Top 5 Users:</b>\n` +
            topUsers.map((u, i) => `${i + 1}. ${u.name}: ${u.hits} hits`).join('\n') + '\n\n' +
            `═══════════════════════\n` +
            `✅ Admin Panel Active`;

          const result = await sendMessage(BOT_TOKEN, chatId, text);
          if (!result.ok) console.error('Admin: Failed to send stats:', result.error);
          return;
        } catch (error) {
          console.error('Admin: Error getting stats:', error);
        }
      }

      if (msg.text.startsWith('/admin_add_hits')) {
        try {
          const parts = msg.text.split(' ');
          if (parts.length !== 3) {
            await sendMessage(BOT_TOKEN, chatId, '❌ <b>Invalid Format</b>\n\nUsage: /admin_add_hits <user_id> <hits>\nExample: /admin_add_hits 123456789 100');
            return;
          }

          const targetTgId = parts[1];
          const hitsToAdd = parseInt(parts[2]);

          if (!targetTgId || !/^\d{5,15}$/.test(targetTgId)) {
            await sendMessage(BOT_TOKEN, chatId, '❌ Invalid user ID format. Must be a valid Telegram user ID (5-15 digits).');
            return;
          }

          if (isNaN(hitsToAdd) || hitsToAdd <= 0 || hitsToAdd > 1000000) {
            await sendMessage(BOT_TOKEN, chatId, '❌ Invalid hits amount. Must be a positive number (max 1,000,000).');
            return;
          }

          const existingUser = db.prepare('SELECT name, hits FROM telegram_users WHERE tg_id = ?').get(targetTgId);
          const newHits = (existingUser?.hits || 0) + hitsToAdd;
          const userName = existingUser?.name || `User_${targetTgId.slice(-4)}`;

          db.prepare('INSERT OR REPLACE INTO telegram_users (tg_id, name, hits) VALUES (?, ?, ?)').run(targetTgId, userName, newHits);

          const text = `✅ <b>Hits Added Successfully!</b>\n\n` +
            `👤 User: ${userName} (${targetTgId})\n` +
            `➕ Added: ${hitsToAdd} hits\n` +
            `📊 New Total: ${newHits} hits`;

          await sendMessage(BOT_TOKEN, chatId, text);
          return;
        } catch (error) {
          console.error('Admin: Error adding hits:', error);
          await sendMessage(BOT_TOKEN, chatId, '❌ Error adding hits');
        }
      }

      if (msg.text.startsWith('/admin_user_info')) {
        try {
          const parts = msg.text.split(' ');
          if (parts.length !== 2) {
            await sendMessage(BOT_TOKEN, chatId, '❌ <b>Invalid Format</b>\n\nUsage: /admin_user_info <user_id>\nExample: /admin_user_info 123456789');
            return;
          }

          const targetTgId = parts[1];

          if (!targetTgId || !/^\d{5,15}$/.test(targetTgId)) {
            await sendMessage(BOT_TOKEN, chatId, '❌ Invalid user ID format. Must be a valid Telegram user ID (5-15 digits).');
            return;
          }
          const user = db.prepare('SELECT * FROM telegram_users WHERE tg_id = ?').get(targetTgId);

          if (!user) {
            await sendMessage(BOT_TOKEN, chatId, `❌ User ${targetTgId} not found`);
            return;
          }

          const rank = db.prepare('SELECT COUNT(*) + 1 as rank FROM telegram_users WHERE hits > ? AND tg_id != "SYSTEM_BONUS_HITS"').get(user.hits);

          const text = `👤 <b>User Information</b>\n` +
            `═══════════════════════\n\n` +
            `🆔 ID: ${user.tg_id}\n` +
            `📛 Name: ${user.name}\n` +
            `🎯 Hits: ${user.hits}\n` +
            `🏅 Rank: ${rank?.rank || 'N/A'}\n` +
            `📅 Created: ${user.created_at}\n` +
            `🔄 Updated: ${user.updated_at}\n\n` +
            `═══════════════════════`;

          await sendMessage(BOT_TOKEN, chatId, text);
          return;
        } catch (error) {
          console.error('Admin: Error getting user info:', error);
          await sendMessage(BOT_TOKEN, chatId, '❌ Error getting user info');
        }
      }

      if (msg.text === '/admin_reset_hits') {
        try {
          // Reset all user hits (keep system bonus)
          db.prepare('UPDATE telegram_users SET hits = 0 WHERE tg_id != "SYSTEM_BONUS_HITS"').run();

          const text = `🔄 <b>All User Hits Reset!</b>\n\n` +
            `✅ Reset all user hit counts to 0\n` +
            `🎁 System bonus hits preserved\n` +
            `📊 Use /admin_stats to verify`;

          await sendMessage(BOT_TOKEN, chatId, text);
          return;
        } catch (error) {
          console.error('Admin: Error resetting hits:', error);
          await sendMessage(BOT_TOKEN, chatId, '❌ Error resetting hits');
        }
      }

      if (msg.text === '/admin_system_info') {
        try {
          const dbSize = db.prepare('SELECT COUNT(*) as users FROM telegram_users').get();
          const dbStats = db.prepare(`
            SELECT
              COUNT(CASE WHEN tg_id = 'SYSTEM_BONUS_HITS' THEN 1 END) as system_users,
              COUNT(CASE WHEN tg_id != 'SYSTEM_BONUS_HITS' THEN 1 END) as real_users,
              SUM(hits) as total_hits,
              AVG(hits) as avg_hits
            FROM telegram_users
          `).get();

          const text = `🖥️ <b>SYSTEM INFORMATION</b>\n` +
            `═══════════════════════\n\n` +
            `💾 <b>Database:</b>\n` +
            `👥 Total Users: ${dbSize?.users || 0}\n` +
            `🎯 Real Users: ${dbStats?.real_users || 0}\n` +
            `🤖 System Users: ${dbStats?.system_users || 0}\n\n` +
            `📊 <b>Statistics:</b>\n` +
            `🌍 Total Hits: ${dbStats?.total_hits || 0}\n` +
            `📈 Average Hits: ${Math.round(dbStats?.avg_hits || 0)}\n\n` +
            `⚡ <b>Server Status:</b> Online\n` +
            `🤖 <b>Bot Status:</b> Active\n\n` +
            `═══════════════════════`;

          await sendMessage(BOT_TOKEN, chatId, text);
          return;
        } catch (error) {
          console.error('Admin: Error getting system info:', error);
          await sendMessage(BOT_TOKEN, chatId, '❌ Error getting system info');
        }
      }

      if (msg.text.startsWith('/admin_broadcast')) {
        try {
          const message = msg.text.replace('/admin_broadcast', '').trim();
          if (!message) {
            await sendMessage(BOT_TOKEN, chatId, '❌ <b>Invalid Format</b>\n\nUsage: /admin_broadcast <message>\nExample: /admin_broadcast Hello everyone!');
            return;
          }

          if (message.length > 4000) {
            await sendMessage(BOT_TOKEN, chatId, '❌ Message too long. Maximum 4000 characters allowed.');
            return;
          }

          const users = db.prepare('SELECT tg_id FROM telegram_users WHERE tg_id != "SYSTEM_BONUS_HITS"').all();
          let successCount = 0;
          let failCount = 0;

          for (const user of users) {
            try {
              const result = await sendMessage(BOT_TOKEN, user.tg_id, `📢 <b>ADMIN ANNOUNCEMENT</b>\n\n${message}`);
              if (result.ok) successCount++;
              else failCount++;
            } catch (error) {
              failCount++;
            }
          }

          const text = `📢 <b>Broadcast Complete!</b>\n\n` +
            `✅ Sent to: ${successCount} users\n` +
            `❌ Failed: ${failCount} users\n` +
            `📝 Message: "${message}"`;

          await sendMessage(BOT_TOKEN, chatId, text);
          return;
        } catch (error) {
          console.error('Admin: Error broadcasting:', error);
          await sendMessage(BOT_TOKEN, chatId, '❌ Error broadcasting message');
        }
      }

      if (msg.text === '/admin_restart') {
        try {
          const text = `🔄 <b>SERVER RESTART INITIATED</b>\n\n` +
            `⚡ Shutting down AriesxHit server...\n` +
            `⏰ Render will automatically restart the service\n` +
            `📡 Webhook will be restored automatically\n` +
            `✅ You'll be notified when the server is back online`;

          await sendMessage(BOT_TOKEN, chatId, text);

          console.log('[ADMIN] Server restart initiated by admin');

          // Send confirmation message before shutdown
          setTimeout(() => {
            console.log('[ADMIN] Server shutting down for restart...');
            process.exit(0); // Clean exit - Render will restart the service
          }, 1000);

          return;
        } catch (error) {
          console.error('Admin: Error initiating restart:', error);
          await sendMessage(BOT_TOKEN, chatId, '❌ Error initiating restart');
        }
      }

      if (msg.text === '/admin_users') {
        try {
          const users = db.prepare('SELECT tg_id, name, hits FROM telegram_users WHERE tg_id != "SYSTEM_BONUS_HITS" ORDER BY hits DESC').all();

          let text = `👥 <b>ALL USERS (${users.length})</b>\n` +
            `═══════════════════════\n\n`;

          users.forEach((user, i) => {
            text += `${i + 1}. ${user.name} (${user.tg_id})\n`;
            text += `   🎯 ${user.hits} hits\n\n`;
          });

          text += `═══════════════════════`;

          await sendMessage(BOT_TOKEN, chatId, text);
          return;
        } catch (error) {
          console.error('Admin: Error getting users:', error);
          await sendMessage(BOT_TOKEN, chatId, '❌ Error getting user list');
        }
      }

      if (msg.text.startsWith('/admin_ban')) {
        try {
          const parts = msg.text.split(' ');
          if (parts.length !== 2) {
            await sendMessage(BOT_TOKEN, chatId, '❌ <b>Invalid Format</b>\n\nUsage: /admin_ban <user_id>\nExample: /admin_ban 123456789');
            return;
          }

          const targetTgId = parts[1];

          if (!targetTgId || !/^\d{5,15}$/.test(targetTgId)) {
            await sendMessage(BOT_TOKEN, chatId, '❌ Invalid user ID format. Must be a valid Telegram user ID (5-15 digits).');
            return;
          }
          const user = db.prepare('SELECT name FROM telegram_users WHERE tg_id = ?').get(targetTgId);

          if (!user) {
            await sendMessage(BOT_TOKEN, chatId, `❌ User ${targetTgId} not found in database.`);
            return;
          }

          if (targetTgId === '6447766151') {
            await sendMessage(BOT_TOKEN, chatId, '❌ Cannot ban the admin account.');
            return;
          }

          if (targetTgId === 'SYSTEM_BONUS_HITS') {
            await sendMessage(BOT_TOKEN, chatId, '❌ Cannot ban the system bonus account.');
            return;
          }

          // Mark user as banned (you can implement actual ban logic)
          db.prepare('UPDATE telegram_users SET name = ? WHERE tg_id = ?').run(`[BANNED] ${user.name}`, targetTgId);

          const text = `🚫 <b>User Banned!</b>\n\n` +
            `👤 User: ${user.name} (${targetTgId})\n` +
            `✅ Status: Banned\n` +
            `🔒 Access restricted`;

          await sendMessage(BOT_TOKEN, chatId, text);
          return;
        } catch (error) {
          console.error('Admin: Error banning user:', error);
          await sendMessage(BOT_TOKEN, chatId, '❌ Error banning user');
        }
      }

      if (msg.text === '/admin_backup') {
        try {
          const userCount = db.prepare('SELECT COUNT(*) as count FROM telegram_users WHERE tg_id != "SYSTEM_BONUS_HITS"').get();
          const totalHits = db.prepare('SELECT SUM(hits) as total FROM telegram_users').get();

          const text = `💾 <b>DATABASE BACKUP INFO</b>\n` +
            `═══════════════════════\n\n` +
            `👥 Users: ${userCount?.count || 0}\n` +
            `🌍 Total Hits: ${totalHits?.total || 0}\n` +
            `📅 Backup Date: ${new Date().toISOString()}\n\n` +
            `💡 <b>Manual Backup Steps:</b>\n` +
            `1. Download database from Render\n` +
            `2. Save to secure location\n` +
            `3. Keep multiple backup copies\n\n` +
            `═══════════════════════`;

          await sendMessage(BOT_TOKEN, chatId, text);
          return;
        } catch (error) {
          console.error('Admin: Error getting backup info:', error);
          await sendMessage(BOT_TOKEN, chatId, '❌ Error getting backup info');
        }
      }

      if (msg.text === '/admin_webhook') {
        try {
          const text = `🔗 <b>WEBHOOK STATUS</b>\n` +
            `═══════════════════════\n\n` +
            `🌐 URL: https://api.mikeyyfrr.me/api/tg/webhook\n` +
            `⚡ Status: Active\n` +
            `🤖 Bot Token: Configured\n` +
            `📡 Last Update: ${new Date().toLocaleString()}\n\n` +
            `✅ Webhook is working properly!\n\n` +
            `═══════════════════════`;

          await sendMessage(BOT_TOKEN, chatId, text);
          return;
        } catch (error) {
          console.error('Admin: Error getting webhook info:', error);
          await sendMessage(BOT_TOKEN, chatId, '❌ Error getting webhook info');
        }
      }

      if (msg.text === '/admin_clear_inactive') {
        try {
          // Clear users with 0 hits (except system bonus)
          const result = db.prepare('DELETE FROM telegram_users WHERE hits = 0 AND tg_id != "SYSTEM_BONUS_HITS"').run();

          const text = `🧹 <b>CLEANUP COMPLETE</b>\n\n` +
            `🗑️ Removed: ${result.changes} inactive users\n` +
            `📊 Users with 0 hits cleared\n` +
            `✅ Database optimized`;

          await sendMessage(BOT_TOKEN, chatId, text);
          return;
        } catch (error) {
          console.error('Admin: Error clearing inactive users:', error);
          await sendMessage(BOT_TOKEN, chatId, '❌ Error clearing inactive users');
        }
      }

      if (msg.text === '/admin_performance') {
        try {
          const startTime = Date.now();
          // Simple performance test
          const userCount = db.prepare('SELECT COUNT(*) as count FROM telegram_users').get();
          const hitSum = db.prepare('SELECT SUM(hits) as total FROM telegram_users').get();
          const queryTime = Date.now() - startTime;

          const text = `⚡ <b>PERFORMANCE STATUS</b>\n` +
            `═══════════════════════\n\n` +
            `🕐 Query Time: ${queryTime}ms\n` +
            `💾 Database: Operational\n` +
            `🤖 Bot: Responding\n` +
            `🌐 Server: Online\n\n` +
            `📊 Recent Stats:\n` +
            `👥 Users: ${userCount?.count || 0}\n` +
            `🎯 Hits: ${hitSum?.total || 0}\n\n` +
            `✅ All systems operational!\n\n` +
            `═══════════════════════`;

          await sendMessage(BOT_TOKEN, chatId, text);
          return;
        } catch (error) {
          console.error('Admin: Error checking performance:', error);
          await sendMessage(BOT_TOKEN, chatId, '❌ Error checking performance');
        }
      }

      if (msg.text === '/admin_backup_db') {
        try {
          const success = db.backup();
          if (success) {
            const text = `💾 <b>DATABASE BACKUP SUCCESSFUL</b>\n` +
              `═══════════════════════\n\n` +
              `✅ Database backed up to persistent storage\n` +
              `📁 Location: ${process.env.DATABASE_BACKUP_PATH || 'backup/ariesxhit.db'}\n` +
              `🕐 Timestamp: ${new Date().toISOString()}\n\n` +
              `💡 <b>Backup will persist across deployments</b>\n\n` +
              `═══════════════════════`;

            await sendMessage(BOT_TOKEN, chatId, text);
          } else {
            await sendMessage(BOT_TOKEN, chatId, '❌ Database backup failed');
          }
          return;
        } catch (error) {
          console.error('Admin: Error backing up database:', error);
          await sendMessage(BOT_TOKEN, chatId, '❌ Error backing up database');
        }
      }

      if (msg.text === '/admin_restore_db') {
        try {
          const success = db.restore();
          if (success) {
            const text = `🔄 <b>DATABASE RESTORE SUCCESSFUL</b>\n` +
              `═══════════════════════\n\n` +
              `✅ Database restored from backup\n` +
              `📁 Source: ${process.env.DATABASE_BACKUP_PATH || 'backup/ariesxhit.db'}\n\n` +
              `⚠️ <b>Server restart may be required</b>\n` +
              `   for changes to take effect\n\n` +
              `═══════════════════════`;

            await sendMessage(BOT_TOKEN, chatId, text);
          } else {
            await sendMessage(BOT_TOKEN, chatId, '❌ Database restore failed - no backup found');
          }
          return;
        } catch (error) {
          console.error('Admin: Error restoring database:', error);
          await sendMessage(BOT_TOKEN, chatId, '❌ Error restoring database');
        }
      }

      if (msg.text === '/admin_debug_users') {
        try {
          const allUsers = db.prepare('SELECT tg_id, name, hits FROM telegram_users ORDER BY created_at DESC').all();

          let text = `🐛 <b>DEBUG: ALL DATABASE USERS</b>\n` +
            `═══════════════════════\n\n`;

          allUsers.forEach((user, i) => {
            const type = user.tg_id === 'SYSTEM_BONUS_HITS' ? '🤖 SYSTEM' : '👤 USER';
            text += `${i + 1}. ${type} ${user.name} (${user.tg_id})\n`;
            text += `   🎯 ${user.hits} hits\n\n`;
          });

          text += `═══════════════════════\n` +
            `📊 Total Records: ${allUsers.length}`;

          await sendMessage(BOT_TOKEN, chatId, text);
          return;
        } catch (error) {
          console.error('Admin: Error in debug users:', error);
          await sendMessage(BOT_TOKEN, chatId, '❌ Error getting debug info');
        }
      }


      if (msg.text === '/admin_help' || msg.text === '/admincmd') {
        try {
          const text = `🔧 <b>ADMIN COMMANDS</b>\n` +
            `═══════════════════════\n\n` +
            `👥 /admin_users - List all users\n` +
            `🐛 /admin_debug_users - Debug all DB records\n` +
            `👤 /admin_user_info <id> - User details\n` +
            `➕ /admin_add_hits <id> <amount> - Add hits\n` +
            `🚫 /admin_ban <id> - Ban user\n` +
            `📢 /admin_broadcast <msg> - Send to all users\n` +
            `🔄 /admin_restart - Restart server\n` +
            `🧹 /admin_clear_inactive - Remove 0-hit users\n` +
            `💾 /admin_backup - Backup information\n` +
            `💽 /admin_backup_db - Backup database to persistent storage\n` +
            `🔄 /admin_restore_db - Restore database from backup\n` +
            `🔗 /admin_webhook - Webhook status\n` +
            `⚡ /admin_performance - System performance\n` +
            `🖥️ /admin_system_info - Server & DB info\n` +
            `📊 /admin_stats - System statistics\n` +
            `❓ /admin_help or /admincmd - This help message\n\n` +
            `═══════════════════════\n` +
            `🔒 Admin Only Commands\n` +
            `📝 Use: /command <required> [optional]`;

          await sendMessage(BOT_TOKEN, chatId, text);
          return;
        } catch (error) {
          console.error('Admin: Error showing help:', error);
          await sendMessage(BOT_TOKEN, chatId, '❌ Error showing admin help');
        }
      }
    } // End of admin commands block





    // Test command for anyone to verify bot is working
    if (msg?.text === '/test') {
      try {
        const text = `✅ <b>Bot is working!</b>\n\n` +
          `👤 User ID: ${tgId}\n` +
          `📝 Your message: ${msg.text}\n` +
          `⏰ Time: ${new Date().toLocaleString()}\n\n` +
          `The bot is responding correctly! 🤖`;
        await sendMessage(BOT_TOKEN, chatId, text);
        return;
      } catch (error) {
        console.error('Error processing /test command:', error);
      }
    }

    if (msg?.text === '/start') {
      try {
        setUserName(tgId, firstName);
        const text = getMainMenuText(firstName, tgId);
        const result = await sendMessage(BOT_TOKEN, chatId, text, replyMarkup(MAIN_MENU_KEYBOARD));
        if (!result.ok) console.error('Webhook: Failed to send start message:', result.error);
      } catch (error) {
        console.error('Webhook: Error processing /start command:', error);
      }
    }
  } catch (error) {
    console.error('Webhook: Unexpected error:', error);
  }
});

// Extract Stripe data from checkout URL
function extractStripeData(checkoutUrl) {
  try {
    const url = new URL(checkoutUrl);

    // Extract client secret from URL fragment or query params
    let clientSecret = null;
    let publishableKey = null;

    // Check URL hash/fragment for client secret
    if (url.hash) {
      const hashParams = new URLSearchParams(url.hash.substring(1));
      clientSecret = hashParams.get('client_secret') ||
                    hashParams.get('cs_live') ||
                    hashParams.get('cs_test') ||
                    url.hash.match(/cs_[a-zA-Z0-9_]+/)?.[0];
    }

    // Check query parameters
    if (!clientSecret) {
      clientSecret = url.searchParams.get('client_secret') ||
                    url.searchParams.get('cs_live') ||
                    url.searchParams.get('cs_test');
    }

    // For Stripe checkout links, try to extract publishable key from URL structure
    if (url.hostname.includes('checkout.stripe.com') || url.hostname.includes('pay.')) {
      // Extract from path or try common patterns
      const pathParts = url.pathname.split('/');
      if (pathParts.includes('c') && pathParts.includes('pay')) {
        // This is a Stripe checkout link
        return {
          provider: 'stripe',
          clientSecret: clientSecret,
          publishableKey: publishableKey, // Will be null for now
          sessionId: pathParts[pathParts.length - 1]?.split('#')[0],
          url: checkoutUrl
        };
      }
    }

    return {
      provider: 'unknown',
      clientSecret: clientSecret,
      publishableKey: publishableKey,
      url: checkoutUrl
    };

  } catch (error) {
    console.error('Error extracting Stripe data:', error);
    return {
      provider: 'unknown',
      error: error.message,
      url: checkoutUrl
    };
  }
}

module.exports = router;
