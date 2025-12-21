// ===================================
// STRIPE-DETECTOR.JS
// Stripe Checkout Detection
// ===================================

(function() {
  'use strict';

  // Prevent multiple injections
  if (window.__ARIESXHIT_STRIPE_DETECTOR__) {
    return;
  }
  window.__ARIESXHIT_STRIPE_DETECTOR__ = true;

  // Stripe detection patterns
  const STRIPE_PATTERNS = {
    urls: ['checkout.stripe.com', 'buy.stripe.com', 'cs_live'],
    scripts: ['js.stripe.com', 'checkout.stripe.com'],
    elements: ['SubmitButton', 'CheckoutButton', 'stripe-button']
  };

  /**
   * Check if current page is Stripe checkout
   */
  function isStripeCheckout() {
    // Check URL
    const url = window.location.href;
    if (STRIPE_PATTERNS.urls.some(pattern => url.includes(pattern))) {
      return true;
    }

    // Check for Stripe scripts
    const scripts = Array.from(document.querySelectorAll('script'));
    if (scripts.some(script => STRIPE_PATTERNS.scripts.some(pattern => script.src.includes(pattern)))) {
      return true;
    }

    // Check for Stripe elements
    if (document.querySelector('[class*="SubmitButton"]') ||
        document.querySelector('[class*="CheckoutButton"]') ||
        document.querySelector('.stripe-button')) {
      return true;
    }

    return false;
  }

  /**
   * Show Stripe detected notification
   */
  function showDetectedNotification() {
    const notification = document.createElement('div');
    notification.id = 'ariesxhit-stripe-detected';
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="width: 40px; height: 40px; background: #FFD700; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px;">
          ⚡
        </div>
        <div>
          <div style="font-size: 16px; font-weight: 700; color: #FFD700;">Stripe Checkout Detected</div>
          <div style="font-size: 12px; color: #888;">AriesxHit is ready</div>
        </div>
      </div>
    `;

    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(10, 10, 15, 0.95);
      border: 2px solid #FFD700;
      border-radius: 12px;
      padding: 16px 20px;
      z-index: 999999;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      opacity: 0;
      transform: translateY(-20px);
      transition: all 0.3s ease;
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateY(0)';
    }, 100);

    // Auto remove after 4 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateY(-20px)';
      setTimeout(() => notification.remove(), 300);
    }, 4000);
  }

  /**
   * Create notification container for runtime messages
   */
  function createNotificationContainer() {
    if (document.getElementById('ariesxhit-notifications')) {
      return;
    }

    const container = document.createElement('div');
    container.id = 'ariesxhit-notifications';
    container.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 350px;
    `;

    document.body.appendChild(container);
  }

  /**
   * Show runtime notification
   */
  function showNotification(message, type = 'info') {
    const container = document.getElementById('ariesxhit-notifications');
    if (!container) return;

    const colors = {
      info: '#00d9ff',
      success: '#00ff88',
      error: '#ff4444',
      warning: '#ffaa00'
    };

    const icons = {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    };

    const notification = document.createElement('div');
    notification.className = 'ariesxhit-notification';
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 20px;">${icons[type]}</span>
        <span style="flex: 1;">${message}</span>
      </div>
    `;

    notification.style.cssText = `
      background: rgba(10, 10, 15, 0.95);
      border: 1px solid ${colors[type]};
      border-radius: 8px;
      padding: 12px 16px;
      color: white;
      font-size: 13px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
      opacity: 0;
      transform: translateX(20px);
      transition: all 0.3s ease;
    `;

    container.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
    }, 50);

    // Auto remove after 5 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(20px)';
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }

  /**
   * Detect submit button click
   */
  function setupSubmitDetection() {
    document.addEventListener('click', (e) => {
      const target = e.target;
      
      // Check if clicked element is submit button
      if (target.classList.contains('SubmitButton') ||
          target.closest('.SubmitButton') ||
          target.classList.contains('CheckoutButton') ||
          target.closest('.CheckoutButton')) {
        
        // Notify background script
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          chrome.runtime.sendMessage({
            type: 'user_clicked_submit'
          });
        }
      }
    }, true);
  }

  /**
   * Listen for messages from background
   */
  function setupMessageListener() {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'show_notification') {
          showNotification(message.message, message.messageType || 'info');
        }

        if (message.type === 'trigger_retry') {
          retrySubmit(message.selector);
        }

        sendResponse({ success: true });
      });
    }
  }

  /**
   * Retry submit by clicking button
   */
  function retrySubmit(selector) {
    let button;

    if (selector) {
      // Try custom selector
      if (selector.startsWith('/')) {
        // XPath
        const result = document.evaluate(selector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        button = result.singleNodeValue;
      } else {
        // CSS selector
        button = document.querySelector(selector);
      }
    }

    // Fallback to default selectors
    if (!button) {
      button = document.querySelector('.SubmitButton') ||
               document.querySelector('.CheckoutButton') ||
               document.querySelector('[type="submit"]');
    }

    if (button) {
      showNotification('🔄 Retrying with next card...', 'info');
      setTimeout(() => {
        button.click();
      }, 500);
    } else {
      console.error('Submit button not found');
    }
  }

  /**
   * Initialize detector
   */
  function init() {
    if (!isStripeCheckout()) {
      console.log('[AriesxHit] Not a Stripe checkout page');
      return;
    }

    console.log('[AriesxHit] Stripe checkout detected!');

    // Show detection notification
    setTimeout(() => {
      showDetectedNotification();
    }, 500);

    // Create notification container
    createNotificationContainer();

    // Setup submit detection
    setupSubmitDetection();

    // Setup message listener
    setupMessageListener();
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();