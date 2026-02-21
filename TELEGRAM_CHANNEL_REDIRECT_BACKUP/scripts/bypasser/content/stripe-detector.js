// ===================================
// STRIPE-DETECTOR.JS
// Detects Stripe checkout, shows 2D/3D notification
// NO AUTO RETRY - user controls submit
// ===================================

(function() {
  if (window.__ARIESXHIT_DETECTOR__) return;
  window.__ARIESXHIT_DETECTOR__ = true;

  let notificationShown = false;
  let is3ds = false;

  // ==================== DETECTION ====================
  
  function isStripeCheckout() {
    const url = window.location.href.toLowerCase();
    
    if (url.includes('checkout.stripe.com') || 
        url.includes('buy.stripe.com') || 
        url.includes('invoice.stripe.com')) {
      return true;
    }

    // Check for Stripe elements
    if (document.querySelector('iframe[src*="stripe.com"]') ||
        document.querySelector('[class*="SubmitButton"]') ||
        document.querySelector('[data-stripe]')) {
      return true;
    }

    return false;
  }

  function is3dsPresent() {
    const url = window.location.href.toLowerCase();
    
    if (url.includes('3ds') || url.includes('authenticate') || url.includes('three-d-secure')) {
      return true;
    }

    const iframes = document.querySelectorAll('iframe');
    for (const iframe of iframes) {
      const src = (iframe.src || '').toLowerCase();
      if (src.includes('3ds') || src.includes('authenticate')) {
        return true;
      }
    }

    return false;
  }

  // ==================== NOTIFICATION ====================
  
  function showNotification(type = '2d') {
    // Remove existing
    const existing = document.getElementById('ariesxhit-checkout-badge');
    if (existing) existing.remove();

    const badge = document.createElement('div');
    badge.id = 'ariesxhit-checkout-badge';
    
    const is3d = type === '3d';
    const color = is3d ? '#FF9800' : '#8A2BE2';
    const icon = is3d ? '🔒' : '💳';
    const text = is3d ? '3D Checkout' : '2D Checkout';

    badge.innerHTML = `
      <span style="font-size: 16px; margin-right: 8px;">${icon}</span>
      <span style="font-weight: 600; color: ${color};">${text}</span>
      <span style="margin-left: 8px; font-size: 10px; background: ${color}33; padding: 2px 6px; border-radius: 4px; color: ${color};">${type.toUpperCase()}</span>
    `;

    badge.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      background: rgba(10, 10, 20, 0.95);
      border: 1px solid ${color};
      border-radius: 8px;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px;
      color: white;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      backdrop-filter: blur(10px);
    `;

    document.body.appendChild(badge);
    notificationShown = true;
  }

  // ==================== OBSERVER ====================
  
  function setup3dsObserver() {
    const observer = new MutationObserver(() => {
      if (!is3ds && is3dsPresent()) {
        is3ds = true;
        showNotification('3d');
        chrome.runtime.sendMessage({ type: '3DS_DETECTED' }).catch(() => {});
      }
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // ==================== MESSAGE LISTENER ====================
  
  chrome.runtime.onMessage.addListener((msg, sender, respond) => {
    if (msg.type === 'UPDATE_CHECKOUT_TYPE' && msg.checkoutType === '3d') {
      is3ds = true;
      showNotification('3d');
    }
    
    if (msg.type === 'show_notification') {
      showTempNotification(msg.message, msg.messageType);
    }
    
    respond({ success: true });
    return true;
  });

  function showTempNotification(message, type = 'info') {
    const colors = {
      info: '#2196F3',
      success: '#4CAF50', 
      error: '#F44336',
      warning: '#FF9800'
    };

    const notif = document.createElement('div');
    notif.textContent = message;
    notif.style.cssText = `
      position: fixed;
      top: 60px;
      right: 10px;
      background: rgba(10, 10, 20, 0.95);
      border: 1px solid ${colors[type] || colors.info};
      border-radius: 6px;
      padding: 10px 14px;
      color: white;
      font-size: 12px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      z-index: 2147483646;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    `;

    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 4000);
  }

  // ==================== INIT ====================
  
  function init() {
    if (!isStripeCheckout()) return;

    console.log('[AriesxHit] Stripe checkout detected');

    // Show initial notification
    if (!notificationShown) {
      if (is3dsPresent()) {
        is3ds = true;
        showNotification('3d');
      } else {
        showNotification('2d');
      }
    }

    setup3dsObserver();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('load', () => {
    if (!notificationShown && isStripeCheckout()) init();
  });
})();
