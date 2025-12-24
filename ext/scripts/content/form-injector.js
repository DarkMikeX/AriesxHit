// ===================================
// FORM-INJECTOR.JS
// Injects bypass.js into page context
// NO DEBUGGER - runs in page
// ===================================

(function() {
  if (window.__ARIESXHIT_INJECTOR__) return;
  window.__ARIESXHIT_INJECTOR__ = true;

  let injected = false;

  // ==================== INJECT BYPASS SCRIPT ====================
  
  function injectBypass() {
    if (injected) return;
    
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('scripts/core/bypass.js');
    script.onload = () => {
      console.log('[AriesxHit] Bypass script injected');
      injected = true;
      
      // Send initial state after small delay
      setTimeout(loadAndSendState, 200);
    };
    (document.head || document.documentElement).appendChild(script);
  }

  // ==================== STATE MANAGEMENT ====================
  
  async function loadAndSendState() {
    try {
      // Get bypass state
      const bypassState = await chrome.runtime.sendMessage({ type: 'GET_BYPASS_STATE' });
      const enabled = bypassState?.active || false;

      // Get settings
      const settingsResp = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      const settings = settingsResp?.settings || {};

      // Get BIN from storage
      const storage = await chrome.storage.local.get(['binList']);
      const bin = storage.binList?.[0] || '';

      // Send to page
      sendStateToPage(enabled, bin, settings);
    } catch (e) {
      console.log('[AriesxHit] State load error:', e);
    }
  }

  function sendStateToPage(enabled, bin, settings) {
    window.postMessage({
      source: 'ariesxhit-control',
      type: 'SET_STATE',
      enabled: enabled,
      bin: bin,
      settings: settings
    }, '*');
  }

  // ==================== LISTEN FOR LOGS FROM PAGE ====================
  
  window.addEventListener('message', (e) => {
    if (e.data?.source !== 'ariesxhit-bypass') return;
    
    if (e.data.type === 'LOG') {
      // Send to background
      chrome.runtime.sendMessage({
        type: 'ADD_LOG',
        logType: e.data.logType,
        message: e.data.message
      }).catch(() => {});
    }
  });

  // ==================== LISTEN FOR MESSAGES FROM BACKGROUND ====================
  
  chrome.runtime.onMessage.addListener((msg, sender, respond) => {
    if (msg.type === 'SET_BYPASS_STATE') {
      sendStateToPage(msg.enabled, msg.bin, msg.settings);
      respond({ success: true });
    }
    return true;
  });

  // ==================== INIT ====================
  
  function init() {
    const url = window.location.href;
    
    // Only inject on relevant pages
    if (url.includes('stripe.com') || 
        url.includes('checkout') || 
        url.includes('payment') || 
        url.includes('subscribe') ||
        url.includes('buy')) {
      injectBypass();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Also try on load (for SPAs)
  window.addEventListener('load', init);

  console.log('[AriesxHit] Form injector loaded');
})();
