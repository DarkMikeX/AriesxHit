// ===================================
// FORM-INJECTOR.JS
// Injects bypass script into page context
// Relays messages between page and background
// ===================================

(function() {
  if (window.__ARIESXHIT_INJECTOR__) return;
  window.__ARIESXHIT_INJECTOR__ = true;

  // State
  let bypassEnabled = false;
  let currentBin = '';
  let settings = {};

  // ==================== INJECT BYPASS SCRIPT ====================

  function injectBypassScript() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('scripts/core/bypass.js');
    script.onload = () => {
      console.log('[AriesxHit] Bypass script injected');
      // Send initial state after injection
      setTimeout(sendStateToPage, 100);
    };
    (document.head || document.documentElement).appendChild(script);
  }

  // ==================== SEND STATE TO PAGE ====================

  function sendStateToPage() {
    window.postMessage({
      source: 'ariesxhit-settings',
      type: 'UPDATE_STATE',
      bypassEnabled: bypassEnabled,
      bin: currentBin,
      settings: settings
    }, '*');
  }

  // ==================== LISTEN FOR LOGS FROM PAGE ====================

  window.addEventListener('message', (event) => {
    if (event.data?.source !== 'ariesxhit-bypass') return;
    
    if (event.data.type === 'LOG') {
      // Send to background for logging
      chrome.runtime.sendMessage({
        type: 'ADD_LOG_ENTRY',
        logType: event.data.logType,
        message: event.data.message
      }).catch(() => {});
    }
  });

  // ==================== LISTEN FOR MESSAGES FROM BACKGROUND ====================

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SET_BYPASS_STATE') {
      bypassEnabled = message.active;
      currentBin = message.bin || currentBin;
      settings = message.settings || settings;
      sendStateToPage();
      sendResponse({ success: true });
    }
    
    if (message.type === 'UPDATE_BIN') {
      currentBin = message.bin;
      sendStateToPage();
      sendResponse({ success: true });
    }

    if (message.type === 'UPDATE_SETTINGS') {
      settings = message.settings;
      sendStateToPage();
      sendResponse({ success: true });
    }

    return true;
  });

  // ==================== LOAD INITIAL STATE ====================

  async function loadInitialState() {
    try {
      // Get bypass state
      const bypassState = await chrome.runtime.sendMessage({ type: 'GET_BYPASS_STATE' });
      bypassEnabled = bypassState?.active || false;

      // Get settings
      const settingsResponse = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      settings = settingsResponse?.settings || {};

      // Get BIN
      const storage = await chrome.storage.local.get(['binList', 'current_bin']);
      if (storage.binList?.length > 0) {
        currentBin = storage.binList[0];
      } else if (storage.current_bin) {
        currentBin = storage.current_bin;
      }

      sendStateToPage();
    } catch (e) {
      console.log('[AriesxHit] Error loading initial state:', e);
    }
  }

  // ==================== INIT ====================

  function init() {
    // Only run on potential checkout pages
    const url = window.location.href;
    if (url.includes('stripe.com') || url.includes('checkout') || url.includes('payment') || url.includes('cs_live') || url.includes('buy.stripe')) {
      injectBypassScript();
      loadInitialState();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('[AriesxHit] Form injector loaded');
})();
