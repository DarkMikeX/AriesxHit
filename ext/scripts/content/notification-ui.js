// ===================================
// NOTIFICATION-UI.JS
// Persistent notification UI for checkout pages
// Shows Stripe detection, 3DS status, card attempts
// ===================================

(function() {
  'use strict';

  // Prevent duplicate injection
  if (window.__ariesxhit_notification_ui__) return;
  window.__ariesxhit_notification_ui__ = true;

  // State
  let notificationContainer = null;
  let stripeNotificationShown = false;
  let is3dsDetected = false;
  let currentNotification = null;

  // Styles for the notification
  const styles = `
    .ariesx-notification-container {
      position: fixed;
      top: 10px;
      left: 10px;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      gap: 8px;
      pointer-events: none;
    }

    .ariesx-notification {
      background: rgba(15, 15, 35, 0.95);
      border: 1px solid rgba(138, 43, 226, 0.5);
      border-radius: 8px;
      padding: 10px 16px;
      color: white;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(10px);
      animation: ariesx-slide-in 0.3s ease-out;
      pointer-events: auto;
      min-width: 200px;
    }

    .ariesx-notification.stripe-detected {
      border-color: rgba(103, 58, 183, 0.6);
      background: linear-gradient(135deg, rgba(15, 15, 35, 0.95), rgba(103, 58, 183, 0.2));
    }

    .ariesx-notification.secure-3d {
      border-color: rgba(255, 152, 0, 0.6);
      background: linear-gradient(135deg, rgba(15, 15, 35, 0.95), rgba(255, 152, 0, 0.2));
    }

    .ariesx-notification.success {
      border-color: rgba(76, 175, 80, 0.6);
      background: linear-gradient(135deg, rgba(15, 15, 35, 0.95), rgba(76, 175, 80, 0.2));
    }

    .ariesx-notification.error {
      border-color: rgba(244, 67, 54, 0.6);
      background: linear-gradient(135deg, rgba(15, 15, 35, 0.95), rgba(244, 67, 54, 0.2));
    }

    .ariesx-notification.info {
      border-color: rgba(33, 150, 243, 0.6);
      background: linear-gradient(135deg, rgba(15, 15, 35, 0.95), rgba(33, 150, 243, 0.2));
    }

    .ariesx-notification-icon {
      font-size: 16px;
      flex-shrink: 0;
    }

    .ariesx-notification-text {
      flex: 1;
      line-height: 1.3;
    }

    .ariesx-notification-badge {
      background: rgba(138, 43, 226, 0.3);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .ariesx-notification.stripe-detected .ariesx-notification-badge {
      background: rgba(103, 58, 183, 0.4);
    }

    .ariesx-notification.secure-3d .ariesx-notification-badge {
      background: rgba(255, 152, 0, 0.4);
    }

    .ariesx-notification-close {
      cursor: pointer;
      opacity: 0.6;
      padding: 4px;
      font-size: 14px;
      transition: opacity 0.2s;
    }

    .ariesx-notification-close:hover {
      opacity: 1;
    }

    @keyframes ariesx-slide-in {
      from {
        opacity: 0;
        transform: translateX(-20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes ariesx-fade-out {
      from {
        opacity: 1;
      }
      to {
        opacity: 0;
        transform: translateX(-20px);
      }
    }

    .ariesx-notification.removing {
      animation: ariesx-fade-out 0.3s ease-out forwards;
    }
  `;

  /**
   * Initialize the notification system
   */
  function init() {
    // Inject styles
    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);

    // Create container
    notificationContainer = document.createElement('div');
    notificationContainer.className = 'ariesx-notification-container';
    document.body.appendChild(notificationContainer);

    // Listen for messages from background
    chrome.runtime.onMessage.addListener(handleMessage);

    // Detect Stripe checkout page
    detectStripeCheckout();

    console.log('[AriesxHit] Notification UI initialized');
  }

  /**
   * Handle messages from background script
   */
  function handleMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'SHOW_STRIPE_CHECKOUT_NOTIFICATION':
        showStripeNotification();
        sendResponse({ success: true });
        break;

      case 'SHOW_3DS_NOTIFICATION':
        show3dsNotification(message.message);
        sendResponse({ success: true });
        break;

      case 'SHOW_SUCCESS_NOTIFICATION':
        showSuccessNotification(message.message, message.card);
        sendResponse({ success: true });
        break;

      case 'SHOW_DECLINE_NOTIFICATION':
        showDeclineNotification(message.message, message.shouldRetry);
        sendResponse({ success: true });
        break;

      case 'show_notification':
        showGenericNotification(message.message, message.messageType);
        sendResponse({ success: true });
        break;
    }
    return true;
  }

  /**
   * Detect if we're on a Stripe checkout page
   */
  function detectStripeCheckout() {
    const url = window.location.href;
    
    // Check URL patterns
    const isStripeCheckout = 
      url.includes('checkout.stripe.com') ||
      url.includes('buy.stripe.com') ||
      url.includes('invoice.stripe.com') ||
      url.includes('cs_live') ||
      url.includes('cs_test');

    if (isStripeCheckout && !stripeNotificationShown) {
      // Wait for page to load
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          setTimeout(showStripeNotification, 500);
        });
      } else {
        setTimeout(showStripeNotification, 500);
      }
    }

    // Also detect Stripe iframes
    detectStripeIframes();
  }

  /**
   * Detect Stripe iframes/elements
   */
  function detectStripeIframes() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check for Stripe iframe
            if (node.tagName === 'IFRAME' && 
                (node.src?.includes('stripe.com') || node.name?.includes('__stripe'))) {
              if (!stripeNotificationShown) {
                showStripeNotification();
              }
            }
            
            // Check for 3DS iframe
            if (node.tagName === 'IFRAME' && 
                (node.src?.includes('3ds') || node.src?.includes('authenticate'))) {
              show3dsNotification('🔒 3D Secure Authentication');
            }
          }
        }
      }
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Show Stripe checkout detected notification
   */
  function showStripeNotification() {
    if (stripeNotificationShown) return;
    stripeNotificationShown = true;

    const notification = createNotification(
      'stripe-detected',
      '💳',
      'Stripe Checkout Detected',
      'ACTIVE',
      false  // Don't auto-hide
    );

    // Notify background
    chrome.runtime.sendMessage({ type: 'CHECKOUT_DETECTED' }).catch(() => {});
  }

  /**
   * Show 3D Secure notification
   */
  function show3dsNotification(message = '🔒 3D Secure Detected') {
    if (is3dsDetected) return;
    is3dsDetected = true;

    const notification = createNotification(
      'secure-3d',
      '🔒',
      '3D Secure Authentication',
      '3DS',
      false  // Don't auto-hide
    );

    // Notify background
    chrome.runtime.sendMessage({ type: '3DS_DETECTED' }).catch(() => {});
  }

  /**
   * Show success notification
   */
  function showSuccessNotification(message, card) {
    createNotification(
      'success',
      '✨',
      message || 'Payment Success!',
      'HIT',
      true,  // Auto-hide after 10 seconds
      10000
    );
  }

  /**
   * Show decline notification
   */
  function showDeclineNotification(message, shouldRetry) {
    createNotification(
      'error',
      '❌',
      message || 'Card Declined',
      'FAIL',
      true,  // Auto-hide
      3000
    );
  }

  /**
   * Show generic notification
   */
  function showGenericNotification(message, type = 'info') {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    };

    createNotification(
      type,
      icons[type] || 'ℹ️',
      message,
      null,
      true,
      5000
    );
  }

  /**
   * Create notification element
   */
  function createNotification(className, icon, text, badge, autoHide = true, hideDelay = 5000) {
    if (!notificationContainer) {
      init();
    }

    const notification = document.createElement('div');
    notification.className = `ariesx-notification ${className}`;
    
    let html = `
      <span class="ariesx-notification-icon">${icon}</span>
      <span class="ariesx-notification-text">${text}</span>
    `;

    if (badge) {
      html += `<span class="ariesx-notification-badge">${badge}</span>`;
    }

    if (autoHide) {
      html += `<span class="ariesx-notification-close" onclick="this.parentElement.remove()">✕</span>`;
    }

    notification.innerHTML = html;
    notificationContainer.appendChild(notification);

    if (autoHide) {
      setTimeout(() => {
        notification.classList.add('removing');
        setTimeout(() => notification.remove(), 300);
      }, hideDelay);
    }

    return notification;
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
