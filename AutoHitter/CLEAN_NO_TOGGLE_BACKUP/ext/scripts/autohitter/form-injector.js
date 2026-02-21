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

  function notify() {
    try {
      chrome.runtime.sendMessage({ type: 'INJECT_BYPASS' });
    } catch (_) {}
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'STATE_UPDATE') {
      document.dispatchEvent(new CustomEvent('aries-state-update', { detail: msg }));
    }
  });

  window.addEventListener('message', (e) => {
    if (e.source !== window || !e.data?.__ariesxhit__) return;
    const { type, ...data } = e.data;
    chrome.runtime.sendMessage({ type, ...data }).catch(() => {});
  });

  if (isStripePaymentPage()) notify();

  const observer = new MutationObserver(() => {
    if (isStripePaymentPage()) notify();
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.body) observer.observe(document.body, { childList: true, subtree: true });
    });
  }
})();
