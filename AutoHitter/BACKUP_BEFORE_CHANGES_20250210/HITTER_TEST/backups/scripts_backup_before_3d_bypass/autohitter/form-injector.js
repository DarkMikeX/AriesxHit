// ===================================
// FORM-INJECTOR - Detect Stripe billing/checkout + bridge state to autohitter
// ===================================

(function () {
  'use strict';
  if (window.__ARIESXHIT_INJECTOR__) return;
  window.__ARIESXHIT_INJECTOR__ = true;

  function isStripePaymentPage() {
    const h = (document.location.hostname || '').toLowerCase();
    const p = (document.location.pathname || '').toLowerCase();
    const u = (document.location.href || '').toLowerCase();
    if (h.includes('stripe.com')) return true;
    if (h.includes('billing') || h.includes('checkout')) return true;
    if (/\/c\/pay\/|\/pay\/|checkout|billing/i.test(p) || /\/c\/pay\/|checkout\.stripe|api\.stripe/i.test(u)) return true;
    if (document.querySelector('script[src*="js.stripe.com"], iframe[src*="stripe.com"], iframe[src*="stripe.network"]')) return true;
    if (document.querySelector('[data-elements-stable-field-name], [data-stripe]')) return true;
    return false;
  }

  function injectCoreScript() {
    if (document.querySelector('script[data-aries-autohit]')) return;

    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('scripts/autohitter/core.js');
    script.dataset.ariesAutohit = '1';
    script.onload = () => {
      console.log('[Form-Injector] Core script loaded successfully');
    };
    script.onerror = () => {
      console.error('[Form-Injector] Failed to load core script');
    };
    (document.head || document.documentElement).appendChild(script);
  }

  function notify() {
    if (!isStripePaymentPage()) return;

    console.log('[Form-Injector] Stripe payment page detected, injecting scripts...');
    injectCoreScript();
  }

  // Listen for state updates from background
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'STATE_UPDATE') {
      // Forward to content scripts
      window.postMessage({
        type: 'aries-state-update',
        detail: msg
      }, '*');
    }
    if (msg.type === 'LOGS_UPDATE') {
      // Forward to content scripts
      window.postMessage({
        type: 'aries-logs-update',
        detail: msg
      }, '*');
    }
  });

  // Initial injection
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', notify);
  } else {
    notify();
  }

  // Re-inject on navigation (SPA support)
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(notify, 100);
    }
  }).observe(document, { subtree: true, childList: true });
})();