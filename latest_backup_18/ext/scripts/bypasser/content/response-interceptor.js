// ===================================
// RESPONSE-INTERCEPTOR.JS
// Stripe Response Interception & Parsing
// Location: scripts/content/response-interceptor.js
// ===================================

(function() {
  'use strict';

  console.log('[AriesxHit] Response interceptor loaded');

  // ==================== RESPONSE CODES ====================

  const STRIPE_CODES = {
    // Success
    SUCCESS: ['succeeded', 'success', 'processing', 'requires_action'],
    
    // Declines
    GENERIC_DECLINE: 'generic_decline',
    INSUFFICIENT_FUNDS: 'insufficient_funds',
    CARD_EXPIRED: 'card_expired',
    INVALID_CVV: 'incorrect_cvc',
    INVALID_NUMBER: 'incorrect_number',
    INVALID_EXPIRY: 'invalid_expiry_year',
    CARD_DECLINED: 'card_declined',
    DO_NOT_HONOR: 'do_not_honor',
    FRAUDULENT: 'fraudulent',
    LOST_CARD: 'lost_card',
    STOLEN_CARD: 'stolen_card',
    PROCESSING_ERROR: 'processing_error',
    CARD_NOT_SUPPORTED: 'card_not_supported',
    
    // Authentication
    AUTHENTICATION_REQUIRED: 'authentication_required',
    REQUIRES_3DS: 'requires_source_action'
  };

  // ==================== INTERCEPT FETCH ====================

  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    
    // Clone response for reading
    const clonedResponse = response.clone();
    
    // Check if Stripe API response
    if (isStripeResponse(args[0])) {
      handleStripeResponse(clonedResponse, args[0]);
    }

    return response;
  };

  // ==================== INTERCEPT XHR ====================

  const XHR = XMLHttpRequest;
  const originalOpen = XHR.prototype.open;
  const originalSend = XHR.prototype.send;

  XHR.prototype.open = function(method, url) {
    this._interceptUrl = url;
    return originalOpen.apply(this, arguments);
  };

  XHR.prototype.send = function() {
    this.addEventListener('load', function() {
      if (isStripeResponse(this._interceptUrl)) {
        try {
          const data = JSON.parse(this.responseText);
          processStripeData(data, this._interceptUrl);
        } catch (e) {
          // Not JSON or parse error
        }
      }
    });

    return originalSend.apply(this, arguments);
  };

  // ==================== HELPER FUNCTIONS ====================

  /**
   * Check if response is from Stripe
   */
  function isStripeResponse(url) {
    if (!url) return false;
    
    const stripePatterns = [
      'stripe.com',
      'stripe.network',
      '/v1/payment',
      '/v1/tokens',
      '/v1/sources',
      '/v1/payment_methods',
      '/v1/setup_intents'
    ];

    const urlString = typeof url === 'string' ? url : url.url || '';
    return stripePatterns.some(pattern => urlString.includes(pattern));
  }

  /**
   * Handle Stripe response
   */
  async function handleStripeResponse(response, requestUrl) {
    try {
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        processStripeData(data, requestUrl);
      }
    } catch (error) {
      console.error('[ResponseInterceptor] Error handling response:', error);
    }
  }

  /**
   * Process Stripe response data
   */
  function processStripeData(data, url) {
    console.log('[ResponseInterceptor] Stripe response:', data);

    // Extract response details
    const result = analyzeResponse(data);

    // Notify background script
    notifyBackgroundScript(result);

    // Show notification to user
    showResponseNotification(result);
  }

  /**
   * Analyze Stripe response
   */
  function analyzeResponse(data) {
    const result = {
      success: false,
      status: null,
      code: null,
      message: null,
      needsAction: false,
      data: data
    };

    // Check for success
    if (data.status) {
      result.status = data.status;
      
      if (STRIPE_CODES.SUCCESS.includes(data.status)) {
        result.success = true;
        result.message = 'Payment successful';
        return result;
      }

      if (data.status === 'requires_action' || data.status === 'requires_source_action') {
        result.needsAction = true;
        result.message = '3D Secure authentication required';
      }
    }

    // Check for errors
    if (data.error) {
      const error = data.error;
      
      result.code = error.decline_code || error.code || 'unknown';
      result.message = error.message || 'Payment declined';
      result.success = false;

      // Parse specific decline codes
      if (error.decline_code) {
        result.declineReason = parseDeclineCode(error.decline_code);
      }
    }

    // Check payment_intent errors
    if (data.payment_intent && data.payment_intent.last_payment_error) {
      const error = data.payment_intent.last_payment_error;
      
      result.code = error.decline_code || error.code || 'unknown';
      result.message = error.message || 'Payment declined';
      result.success = false;
    }

    // Check for successful payment_intent
    if (data.payment_intent && data.payment_intent.status) {
      if (STRIPE_CODES.SUCCESS.includes(data.payment_intent.status)) {
        result.success = true;
        result.status = data.payment_intent.status;
        result.message = 'Payment successful';
      }
    }

    return result;
  }

  /**
   * Parse decline code - return clean code for logging
   */
  function parseDeclineCode(code) {
    // Return the raw code for cleaner logs
    return code ? code.replace(/_/g, ' ') : code;
  }

  /**
   * Notify background script
   */
  function notifyBackgroundScript(result) {
    try {
      chrome.runtime.sendMessage({
        type: 'STRIPE_RESPONSE',
        result: result
      });
    } catch (error) {
      console.error('[ResponseInterceptor] Error notifying background:', error);
    }
  }

  /**
   * Show response notification
   */
  function showResponseNotification(result) {
    // Don't show if requires action (3DS)
    if (result.needsAction) {
      return;
    }

    const messageType = result.success ? 'success' : 'error';
    const icon = result.success ? '✅' : '❌';
    const message = `${icon} ${result.message}`;

    // Send to stripe-detector for display
    window.postMessage({
      source: 'ariesxhit-response',
      type: 'show_notification',
      message: message,
      messageType: messageType
    }, '*');
  }

  // ==================== LISTEN FOR POSTMESSAGE ====================

  window.addEventListener('message', (event) => {
    if (event.data?.source === 'ariesxhit-response') {
      // Relay to content script
      chrome.runtime.sendMessage({
        type: 'show_notification',
        message: event.data.message,
        messageType: event.data.messageType
      }).catch(() => {});
    }
  });

  // ==================== SUCCESS URL DETECTION ====================

  /**
   * Detect success page navigation
   */
  function detectSuccessNavigation() {
    const successPatterns = [
      '/success',
      '/confirmation',
      '/thank-you',
      '/complete',
      'success=true',
      'payment_intent='
    ];

    const currentUrl = window.location.href;
    
    if (successPatterns.some(pattern => currentUrl.includes(pattern))) {
      console.log('[ResponseInterceptor] Success page detected');
      
      chrome.runtime.sendMessage({
        type: 'SUCCESS_PAGE_DETECTED',
        url: currentUrl
      }).catch(() => {});
    }
  }

  // Check on load
  if (document.readyState === 'complete') {
    detectSuccessNavigation();
  } else {
    window.addEventListener('load', detectSuccessNavigation);
  }

  // Monitor URL changes (for SPA)
  let lastUrl = window.location.href;
  const observer = new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      detectSuccessNavigation();
    }
  });

  observer.observe(document.body, { 
    childList: true, 
    subtree: true 
  });

  console.log('[AriesxHit] Response interceptor ready');

})();