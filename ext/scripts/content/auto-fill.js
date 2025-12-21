// ===================================
// AUTO-FILL.JS
// Advanced Auto-Fill Logic for Stripe Forms
// Location: scripts/content/auto-fill.js
// ===================================

(function() {
  'use strict';

  console.log('[AriesxHit] Auto-fill module loaded');

  // ==================== FIELD SELECTORS ====================

  const FIELD_SELECTORS = {
    // Card number
    cardNumber: [
      'input[name="cardnumber"]',
      'input[name="card_number"]',
      'input[name="card-number"]',
      'input[placeholder*="card number" i]',
      'input[placeholder*="Card Number" i]',
      'input[autocomplete="cc-number"]',
      'input[id*="card-number"]',
      'input[id*="cardnumber"]',
      '#card-number',
      '.card-number',
      '[data-elements-stable-field-name="cardNumber"]'
    ],

    // Expiry month
    expMonth: [
      'input[name="exp_month"]',
      'input[name="exp-month"]',
      'input[name="expiry_month"]',
      'input[placeholder*="MM" i]',
      'input[autocomplete="cc-exp-month"]',
      'select[name="exp_month"]',
      'select[name="exp-month"]',
      '#exp-month',
      '.exp-month'
    ],

    // Expiry year
    expYear: [
      'input[name="exp_year"]',
      'input[name="exp-year"]',
      'input[name="expiry_year"]',
      'input[placeholder*="YY" i]',
      'input[placeholder*="YYYY" i]',
      'input[autocomplete="cc-exp-year"]',
      'select[name="exp_year"]',
      'select[name="exp-year"]',
      '#exp-year',
      '.exp-year'
    ],

    // Combined expiry (MM/YY)
    expCombined: [
      'input[name="exp"]',
      'input[name="expiry"]',
      'input[name="exp_date"]',
      'input[name="expiry_date"]',
      'input[placeholder*="MM / YY" i]',
      'input[placeholder*="MM/YY" i]',
      'input[autocomplete="cc-exp"]',
      '#exp-date',
      '.exp-date',
      '[data-elements-stable-field-name="cardExpiry"]'
    ],

    // CVV/CVC
    cvv: [
      'input[name="cvc"]',
      'input[name="cvv"]',
      'input[name="card_cvc"]',
      'input[name="card_cvv"]',
      'input[name="cvv2"]',
      'input[placeholder*="CVC" i]',
      'input[placeholder*="CVV" i]',
      'input[placeholder*="Security" i]',
      'input[autocomplete="cc-csc"]',
      '#cvc',
      '#cvv',
      '.cvc',
      '.cvv',
      '[data-elements-stable-field-name="cardCvc"]'
    ],

    // Cardholder name
    name: [
      'input[name="name"]',
      'input[name="cardholder"]',
      'input[name="card_name"]',
      'input[name="cardholder_name"]',
      'input[placeholder*="name on card" i]',
      'input[placeholder*="cardholder" i]',
      'input[autocomplete="cc-name"]',
      '#cardholder-name',
      '.cardholder-name'
    ],

    // Billing address
    address: [
      'input[name="address"]',
      'input[name="address_line1"]',
      'input[name="billing_address"]',
      'input[autocomplete="address-line1"]',
      '#address',
      '.address'
    ],

    // City
    city: [
      'input[name="city"]',
      'input[name="billing_city"]',
      'input[autocomplete="address-level2"]',
      '#city',
      '.city'
    ],

    // State
    state: [
      'input[name="state"]',
      'input[name="billing_state"]',
      'select[name="state"]',
      'input[autocomplete="address-level1"]',
      '#state',
      '.state'
    ],

    // ZIP/Postal code
    zip: [
      'input[name="zip"]',
      'input[name="postal_code"]',
      'input[name="postcode"]',
      'input[name="billing_zip"]',
      'input[autocomplete="postal-code"]',
      '#zip',
      '#postal-code',
      '.zip',
      '.postal-code'
    ],

    // Country
    country: [
      'select[name="country"]',
      'select[name="billing_country"]',
      'input[name="country"]',
      'input[autocomplete="country"]',
      '#country',
      '.country'
    ]
  };

  // ==================== HELPER FUNCTIONS ====================

  /**
   * Find field by selectors
   */
  function findField(selectors) {
    for (const selector of selectors) {
      const field = document.querySelector(selector);
      if (field && isVisible(field)) {
        return field;
      }
    }
    
    // Check iframes (Stripe Elements)
    const iframes = document.querySelectorAll('iframe');
    for (const iframe of iframes) {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        for (const selector of selectors) {
          const field = iframeDoc.querySelector(selector);
          if (field && isVisible(field)) {
            return field;
          }
        }
      } catch (e) {
        // Cross-origin iframe, skip
      }
    }

    return null;
  }

  /**
   * Check if element is visible
   */
  function isVisible(element) {
    if (!element) return false;
    
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.offsetParent !== null;
  }

  /**
   * Set field value with proper event triggering
   */
  function setFieldValue(field, value) {
    if (!field) return false;

    try {
      // For select elements
      if (field.tagName === 'SELECT') {
        field.value = value;
        field.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }

      // For input elements
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      ).set;

      nativeInputValueSetter.call(field, value);

      // Trigger events
      const events = ['input', 'change', 'blur', 'keyup', 'keydown'];
      events.forEach(eventType => {
        field.dispatchEvent(new Event(eventType, { bubbles: true }));
      });

      // Special handling for React
      const reactEvent = new Event('input', { bubbles: true });
      Object.defineProperty(reactEvent, 'target', { writable: false, value: field });
      field.dispatchEvent(reactEvent);

      return true;
    } catch (error) {
      console.error('[AutoFill] Error setting field value:', error);
      return false;
    }
  }

  // ==================== AUTO-FILL FUNCTIONS ====================

  /**
   * Auto-fill card data
   */
  window.autoFillCard = function(cardData, bypassMode = false) {
    console.log('[AutoFill] Starting auto-fill');

    const results = {
      cardNumber: false,
      expiry: false,
      cvv: false,
      name: false
    };

    // Fill card number
    const cardNumberField = findField(FIELD_SELECTORS.cardNumber);
    if (cardNumberField) {
      results.cardNumber = setFieldValue(cardNumberField, cardData.number);
      console.log('[AutoFill] Card number:', results.cardNumber ? 'OK' : 'FAILED');
    }

    // Fill expiry (check for combined field first)
    const expCombinedField = findField(FIELD_SELECTORS.expCombined);
    if (expCombinedField) {
      const expValue = `${cardData.month}/${cardData.year.slice(-2)}`;
      results.expiry = setFieldValue(expCombinedField, expValue);
      console.log('[AutoFill] Expiry (combined):', results.expiry ? 'OK' : 'FAILED');
    } else {
      // Separate month and year fields
      const expMonthField = findField(FIELD_SELECTORS.expMonth);
      const expYearField = findField(FIELD_SELECTORS.expYear);

      if (expMonthField) {
        setFieldValue(expMonthField, cardData.month);
      }
      if (expYearField) {
        const yearValue = cardData.year.length === 4 ? cardData.year.slice(-2) : cardData.year;
        setFieldValue(expYearField, yearValue);
      }

      results.expiry = !!(expMonthField || expYearField);
      console.log('[AutoFill] Expiry (separate):', results.expiry ? 'OK' : 'FAILED');
    }

    // Fill CVV (skip if bypass mode)
    if (!bypassMode && cardData.cvv) {
      const cvvField = findField(FIELD_SELECTORS.cvv);
      if (cvvField) {
        results.cvv = setFieldValue(cvvField, cardData.cvv);
        console.log('[AutoFill] CVV:', results.cvv ? 'OK' : 'FAILED');
      }
    } else if (bypassMode) {
      console.log('[AutoFill] CVV: SKIPPED (bypass mode)');
      results.cvv = true; // Consider it success in bypass mode
    }

    // Fill name (use default if not provided)
    const nameField = findField(FIELD_SELECTORS.name);
    if (nameField && !nameField.value) {
      const defaultName = cardData.name || 'John Doe';
      results.name = setFieldValue(nameField, defaultName);
      console.log('[AutoFill] Name:', results.name ? 'OK' : 'FAILED');
    }

    return results;
  };

  /**
   * Auto-fill billing details
   */
  window.autoFillBilling = function(billingData) {
    console.log('[AutoFill] Filling billing details');

    const defaults = {
      address: '123 Main Street',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      country: 'US'
    };

    const data = { ...defaults, ...billingData };

    // Address
    const addressField = findField(FIELD_SELECTORS.address);
    if (addressField && !addressField.value) {
      setFieldValue(addressField, data.address);
    }

    // City
    const cityField = findField(FIELD_SELECTORS.city);
    if (cityField && !cityField.value) {
      setFieldValue(cityField, data.city);
    }

    // State
    const stateField = findField(FIELD_SELECTORS.state);
    if (stateField && !stateField.value) {
      setFieldValue(stateField, data.state);
    }

    // ZIP
    const zipField = findField(FIELD_SELECTORS.zip);
    if (zipField && !zipField.value) {
      setFieldValue(zipField, data.zip);
    }

    // Country
    const countryField = findField(FIELD_SELECTORS.country);
    if (countryField && !countryField.value) {
      setFieldValue(countryField, data.country);
    }

    console.log('[AutoFill] Billing details filled');
  };

  /**
   * Clear all form fields
   */
  window.clearCardForm = function() {
    console.log('[AutoFill] Clearing form fields');

    const allSelectors = [
      ...FIELD_SELECTORS.cardNumber,
      ...FIELD_SELECTORS.expMonth,
      ...FIELD_SELECTORS.expYear,
      ...FIELD_SELECTORS.expCombined,
      ...FIELD_SELECTORS.cvv,
      ...FIELD_SELECTORS.name
    ];

    allSelectors.forEach(selector => {
      const field = document.querySelector(selector);
      if (field) {
        setFieldValue(field, '');
      }
    });
  };

  // ==================== MESSAGE LISTENER ====================

  // Listen for messages from background/content scripts
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    
    if (message.type === 'AUTO_FILL_CARD') {
      const results = window.autoFillCard(message.cardData, message.bypassMode);
      sendResponse({ success: true, results: results });
    }

    if (message.type === 'AUTO_FILL_BILLING') {
      window.autoFillBilling(message.billingData);
      sendResponse({ success: true });
    }

    if (message.type === 'CLEAR_FORM') {
      window.clearCardForm();
      sendResponse({ success: true });
    }

    return true;
  });

  console.log('[AriesxHit] Auto-fill ready');

})();