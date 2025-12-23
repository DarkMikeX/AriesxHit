// ===================================
// STRIPE-DETECTOR.JS
// Stripe Checkout Detection with 3DS
// ===================================

(function() {
  'use strict';

  // Prevent multiple injections
  if (window.__ARIESXHIT_STRIPE_DETECTOR__) {
    return;
  }
  window.__ARIESXHIT_STRIPE_DETECTOR__ = true;

  // State
  let stripeNotificationShown = false;
  let is3dsDetected = false;
  let persistentNotification = null;

  // Stripe detection patterns
  const STRIPE_PATTERNS = {
    urls: ['checkout.stripe.com', 'buy.stripe.com', 'invoice.stripe.com', 'cs_live', 'cs_test'],
    scripts: ['js.stripe.com', 'checkout.stripe.com'],
    elements: ['SubmitButton', 'CheckoutButton', 'stripe-button', '__PrivateStripeElement']
  };

  // 3DS detection patterns
  const THREE_DS_PATTERNS = {
    urls: ['3ds', 'authenticate', 'three-d-secure', 'threedsecure'],
    elements: ['stripe-3ds', 'three-ds', 'authentication'],
    iframes: ['stripe.com/js/v3/iframe-helper']
  };

  /**
   * Check if current page is Stripe checkout
   */
  function isStripeCheckout() {
    const url = window.location.href.toLowerCase();
    
    // Check URL patterns
    if (STRIPE_PATTERNS.urls.some(pattern => url.includes(pattern))) {
      return true;
    }

    // Check for Stripe scripts
    const scripts = Array.from(document.querySelectorAll('script'));
    if (scripts.some(script => script.src && STRIPE_PATTERNS.scripts.some(pattern => script.src.includes(pattern)))) {
      return true;
    }

    // Check for Stripe elements
    if (document.querySelector('[class*="SubmitButton"]') ||
        document.querySelector('[class*="CheckoutButton"]') ||
        document.querySelector('.stripe-button') ||
        document.querySelector('[data-stripe]') ||
        document.querySelector('iframe[src*="stripe.com"]')) {
      return true;
    }

    return false;
  }

  /**
   * Check if 3D Secure is present
   */
  function is3dsPresent() {
    const url = window.location.href.toLowerCase();
    
    // Check URL
    if (THREE_DS_PATTERNS.urls.some(pattern => url.includes(pattern))) {
      return true;
    }

    // Check iframes
    const iframes = document.querySelectorAll('iframe');
    for (const iframe of iframes) {
      const src = iframe.src?.toLowerCase() || '';
      const name = iframe.name?.toLowerCase() || '';
      
      if (src.includes('3ds') || 
          src.includes('authenticate') ||
          src.includes('threedsecure') ||
          name.includes('3ds') ||
          name.includes('threedsecure')) {
        return true;
      }
    }

    // Check for 3DS modal/elements
    if (document.querySelector('[class*="3ds"]') ||
        document.querySelector('[class*="three-d"]') ||
        document.querySelector('[data-3ds]')) {
      return true;
    }

    return false;
  }

  /**
   * Create persistent notification (top-left, stays visible)
   * Types: '2d', '3d'
   */
  function showPersistentNotification(type = '2d') {
    // Remove existing notification if any
    if (persistentNotification) {
      persistentNotification.remove();
    }

    persistentNotification = document.createElement('div');
    persistentNotification.id = 'ariesxhit-persistent-notification';
    
    let content = '';
    let borderColor = '#8A2BE2';  // Purple for 2D
    
    if (type === '3d') {
      borderColor = '#FF9800';  // Orange for 3D
      content = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 18px;">🔒</span>
          <div>
            <div style="font-size: 13px; font-weight: 700; color: #FF9800;">3D Checkout</div>
            <div style="font-size: 11px; color: #888;">AriesxHit Ready</div>
          </div>
          <span style="background: rgba(255, 152, 0, 0.3); padding: 2px 8px; border-radius: 4px; font-size: 10px; color: #FF9800; margin-left: auto;">3D</span>
        </div>
      `;
    } else {
      content = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 18px;">💳</span>
          <div>
            <div style="font-size: 13px; font-weight: 700; color: #8A2BE2;">2D Checkout</div>
            <div style="font-size: 11px; color: #888;">AriesxHit Ready</div>
          </div>
          <span style="background: rgba(138, 43, 226, 0.3); padding: 2px 8px; border-radius: 4px; font-size: 10px; color: #8A2BE2; margin-left: auto;">2D</span>
        </div>
      `;

    persistentNotification.innerHTML = content;
    persistentNotification.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      background: rgba(15, 15, 35, 0.95);
      border: 1px solid ${borderColor};
      border-radius: 8px;
      padding: 10px 14px;
      z-index: 2147483647;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      animation: ariesxSlideIn 0.3s ease;
      min-width: 220px;
    `;

    // Add animation styles
    const styleId = 'ariesxhit-notification-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes ariesxSlideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(persistentNotification);
  }

  /**
   * Update notification to show 3D Checkout
   */
  function show3dsNotification() {
    if (is3dsDetected) return;
    is3dsDetected = true;
    
    showPersistentNotification('3d');
    
    // Notify background
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: '3DS_DETECTED' }).catch(() => {});
    }
    
    console.log('[AriesxHit] 3D Checkout detected');
  }

  /**
   * Show 2D Checkout notification
   */
  function show2dNotification() {
    if (stripeNotificationShown) return;
    stripeNotificationShown = true;
    
    showPersistentNotification('2d');
    
    // Notify background
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: 'CHECKOUT_DETECTED', checkoutType: '2d' }).catch(() => {});
    }
    
    console.log('[AriesxHit] 2D Checkout detected');
  }

  /**
   * Create notification container for runtime messages (right side)
   */
  function createNotificationContainer() {
    if (document.getElementById('ariesxhit-notifications')) {
      return;
    }

    const container = document.createElement('div');
    container.id = 'ariesxhit-notifications';
    container.style.cssText = `
      position: fixed;
      top: 60px;
      right: 10px;
      z-index: 2147483646;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 300px;
    `;

    document.body.appendChild(container);
  }

  /**
   * Show runtime notification (right side, temporary)
   */
  function showNotification(message, type = 'info') {
    const container = document.getElementById('ariesxhit-notifications');
    if (!container) {
      createNotificationContainer();
    }

    const colors = {
      info: '#2196F3',
      success: '#4CAF50',
      error: '#F44336',
      warning: '#FF9800'
    };

    const notification = document.createElement('div');
    notification.className = 'ariesxhit-temp-notification';
    notification.innerHTML = `<span>${message}</span>`;

    notification.style.cssText = `
      background: rgba(15, 15, 35, 0.95);
      border: 1px solid ${colors[type]};
      border-radius: 6px;
      padding: 10px 14px;
      color: white;
      font-size: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(10px);
      animation: ariesxSlideIn 0.3s ease;
    `;

    document.getElementById('ariesxhit-notifications').appendChild(notification);

    // Auto remove after 4 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(20px)';
      notification.style.transition = 'all 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 4000);
  }

  /**
   * Detect submit button click
   */
  function setupSubmitDetection() {
    document.addEventListener('click', (e) => {
      const target = e.target;
      
      // Check if clicked element is submit button
      if (target.classList?.contains('SubmitButton') ||
          target.closest?.('.SubmitButton') ||
          target.classList?.contains('CheckoutButton') ||
          target.closest?.('.CheckoutButton') ||
          target.type === 'submit') {
        
        // Notify background script
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          chrome.runtime.sendMessage({
            type: 'user_clicked_submit'
          }).catch(() => {});
        }
      }
    }, true);
  }

  /**
   * Setup mutation observer for 3DS detection
   */
  function setup3dsObserver() {
    const observer = new MutationObserver((mutations) => {
      if (is3dsDetected) return;

      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          
          // Check for 3DS iframe
          if (node.tagName === 'IFRAME') {
            const src = node.src?.toLowerCase() || '';
            const name = node.name?.toLowerCase() || '';
            
            if (src.includes('3ds') || 
                src.includes('authenticate') ||
                src.includes('threedsecure') ||
                name.includes('3ds')) {
              show3dsNotification();
              return;
            }
          }
          
          // Check for 3DS elements in added node
          if (node.querySelector?.('[class*="3ds"]') ||
              node.querySelector?.('[class*="three-d"]')) {
            show3dsNotification();
            return;
          }
        }
      }

      // Also check if 3DS appeared in page
      if (is3dsPresent()) {
        show3dsNotification();
      }
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Listen for messages from background
   */
  function setupMessageListener() {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        switch (message.type) {
          case 'show_notification':
            showNotification(message.message, message.messageType || 'info');
            break;

          case 'SHOW_SUCCESS_NOTIFICATION':
            showNotification(message.message || '🎉 Payment Success!', 'success');
            break;

          case 'SHOW_DECLINE_NOTIFICATION':
            showNotification(message.message || '❌ Card Declined', 'error');
            if (message.shouldRetry) {
              setTimeout(() => retrySubmit(), 2000);
            }
            break;

          case 'SHOW_3DS_NOTIFICATION':
            show3dsNotification();
            break;

          case 'trigger_retry':
            retrySubmit(message.selector);
            break;
        }

        sendResponse({ success: true });
        return true;
      });
    }
  }

  /**
   * Retry submit by clicking button
   */
  function retrySubmit(selector) {
    let button;

    if (selector) {
      button = document.querySelector(selector);
    }

    // Fallback to default selectors
    if (!button) {
      button = document.querySelector('.SubmitButton') ||
               document.querySelector('.CheckoutButton') ||
               document.querySelector('[data-testid="hosted-payment-submit-button"]') ||
               document.querySelector('[type="submit"]');
    }

    if (button) {
      showNotification('🔄 Retrying...', 'info');
      setTimeout(() => {
        button.click();
      }, 500);
    } else {
      console.error('[AriesxHit] Submit button not found');
    }
  }

  /**
   * Initialize detector
   */
  function init() {
    // Create notification container first
    createNotificationContainer();

    // Check if Stripe checkout
    if (!isStripeCheckout()) {
      console.log('[AriesxHit] Not a Stripe checkout page');
      return;
    }

    console.log('[AriesxHit] Stripe checkout detected!');

    // Show 2D notification by default, will change to 3D if detected
    if (!stripeNotificationShown) {
      setTimeout(() => {
        show2dNotification();
      }, 500);
    }

    // Check for 3DS immediately
    if (is3dsPresent()) {
      show3dsNotification();
    }

    // Setup observers and listeners
    setupSubmitDetection();
    setupMessageListener();
    setup3dsObserver();
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Also re-check on page load complete (for SPAs)
  window.addEventListener('load', () => {
    if (!stripeNotificationShown && isStripeCheckout()) {
      init();
    }
  });

})();
