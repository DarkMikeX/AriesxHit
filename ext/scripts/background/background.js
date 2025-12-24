// ===================================
// BACKGROUND.JS - NO DEBUGGER
// Only state management and logging
// ===================================

const state = {
  binList: [],
  cardList: [],
  currentBinIndex: 0,
  bypassActive: false,
  autoHitActive: false,
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

// Load saved state
chrome.storage.local.get([
  'binList', 'cardList', 'logs', 'stats',
  'settings_cvcModifier', 'settings_customCvc',
  'settings_remove3dsFingerprint'
], (r) => {
  if (r.binList) state.binList = r.binList;
  if (r.cardList) state.cardList = r.cardList;
  if (r.logs) state.logs = r.logs;
  if (r.stats) state.stats = r.stats;
  if (r.settings_cvcModifier) state.settings.cvcModifier = r.settings_cvcModifier;
  if (r.settings_customCvc) state.settings.customCvc = r.settings_customCvc;
  if (r.settings_remove3dsFingerprint !== undefined) {
    state.settings.remove3dsFingerprint = r.settings_remove3dsFingerprint;
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
  if (type === 'success' && message.includes('HIT')) state.stats.hits++;
  chrome.storage.local.set({ stats: state.stats });
  
  // Broadcast to popup
  chrome.runtime.sendMessage({ type: 'LOG_UPDATE', logType: type, message }).catch(() => {});
}

// ==================== TAB MANAGEMENT ====================

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Inject on Stripe pages
  if (changeInfo.status === 'complete' && tab.url) {
    if (tab.url.includes('stripe.com') || tab.url.includes('checkout') || tab.url.includes('payment')) {
      // Send current state to tab
      sendStateToTab(tabId);
    }
  }
});

function sendStateToTab(tabId) {
  const bin = state.binList[state.currentBinIndex % Math.max(1, state.binList.length)] || '';
  
  chrome.tabs.sendMessage(tabId, {
    type: 'SET_BYPASS_STATE',
    enabled: state.bypassActive,
    bin: bin,
    settings: state.settings
  }).catch(() => {});
}

function broadcastState() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => sendStateToTab(tab.id));
  });
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
      broadcastState();
      respond({ success: true });
      break;

    // Stop Bypass
    case 'STOP_BYPASS':
      state.bypassActive = false;
      log('info', '⏹️ Bypass OFF');
      broadcastState();
      respond({ success: true });
      break;

    // Start Auto Hit
    case 'START_AUTO_HIT':
      state.autoHitActive = true;
      state.cardList = msg.data?.cards || [];
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
      broadcastState();
      respond({ success: true });
      break;

    // Update settings
    case 'UPDATE_SETTINGS':
      Object.assign(state.settings, msg.settings);
      for (const [k, v] of Object.entries(msg.settings)) {
        chrome.storage.local.set({ [`settings_${k}`]: v });
      }
      broadcastState();
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

    // Next BIN
    case 'NEXT_BIN':
      state.currentBinIndex++;
      broadcastState();
      respond({ success: true });
      break;

    default:
      respond({ success: true });
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
    const auth = await chrome.storage.local.get(['auth_token']);
    chrome.tabs.create({
      url: chrome.runtime.getURL(auth.auth_token ? 'popup.html' : 'login.html')
    });
  }
});

console.log('[AriesxHit] Background Ready - NO DEBUGGER');
