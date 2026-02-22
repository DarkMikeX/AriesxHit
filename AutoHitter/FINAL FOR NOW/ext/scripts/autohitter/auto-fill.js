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
      'input[placeholder="Address"]',
      'input[placeholder*="Address" i]',
      'input[name="address_line1"]',
      'input[name="address"]',
      'input[name="billing_address"]',
      'input[autocomplete="address-line1"]',
      'input[placeholder*="street" i]',
      'input[aria-label*="address" i]',
      'input[id*="address" i]',
      '[data-elements-stable-field-name="addressLine1"] input',
      '[data-elements-stable-field-name="addressLine1"]',
      '#address',
      '.address'
    ],

    // City
    city: [
      'input[name="city"]',
      'input[name="billing_city"]',
      'input[autocomplete="address-level2"]',
      'input[placeholder*="city" i]',
      'input[id*="city" i]',
      '[data-elements-stable-field-name="addressCity"]',
      '#city',
      '.city'
    ],

    // State
    state: [
      'input[name="state"]',
      'input[name="billing_state"]',
      'select[name="state"]',
      'input[autocomplete="address-level1"]',
      'input[placeholder*="state" i]',
      'input[id*="state" i]',
      '[data-elements-stable-field-name="addressState"]',
      '#state',
      '.state'
    ],

    // ZIP/Postal code / PIN
    zip: [
      'input[name="zip"]',
      'input[name="postal_code"]',
      'input[name="postcode"]',
      'input[autocomplete="postal-code"]',
      'input[placeholder*="ZIP" i]',
      'input[placeholder*="Postal" i]',
      'input[id*="zip" i]',
      'input[id*="postal" i]',
      '[data-elements-stable-field-name="addressPostalCode"]',
      'input[name="billing_zip"]',
      'input[name="pin"]',
      'input[placeholder*="PIN" i]',
      'input[placeholder*="ZIP" i]',
      'input[placeholder*="Postal" i]',
      'input[autocomplete="postal-code"]',
      '#zip',
      '#postal-code',
      '#pin',
      '.zip',
      '.postal-code',
      '.pin'
    ],

    country: [
      '[data-elements-stable-field-name="country"]',
      '[data-elements-stable-field-name="countryCode"]',
      'select[name="country"]',
      'select[name="billing_country"]',
      'input[name="country"]',
      'input[name="countryCode"]',
      'input[autocomplete="country"]',
      'input[placeholder*="Country" i]',
      'input[placeholder*="country" i]',
      'input[placeholder*="region" i]',
      'input[placeholder*="Region" i]',
      '[data-elements-stable-field-name="country"]',
      '[data-elements-stable-field-name="countryCode"]',
      '#country',
      '.country'
    ]
  };

  // ==================== HELPER FUNCTIONS ====================

  const LABEL_TO_FIELD = {
    address: ['address line 1', 'address line1', 'street', 'billing address', 'address'],
    city: ['city', 'locality'],
    state: ['state', 'province'],
    zip: ['zip', 'postal', 'postcode', 'pin']
  };

  function findFieldByLabel(kind) {
    const labels = LABEL_TO_FIELD[kind] || [];
    for (const labelText of labels) {
      const labels = document.querySelectorAll('label');
      for (const label of labels) {
        if (!(label.textContent || '').toLowerCase().includes(labelText)) continue;
        const forId = label.getAttribute('for');
        if (forId) {
          const input = document.getElementById(forId);
          if (input && isVisible(input) && (input.tagName === 'INPUT' || input.tagName === 'SELECT')) return input;
        }
        const input = label.querySelector('input, select');
        if (input && isVisible(input)) return input;
      }
    }
    return null;
  }

  /**
   * Find field by selectors
   */
  function findCountryField() {
    const candidates = document.querySelectorAll('select, input, [role="combobox"], [role="listbox"]');
    for (const el of candidates) {
      if (!isVisible(el)) continue;
      const ph = (el.placeholder || '').toLowerCase();
      const name = (el.name || '').toLowerCase();
      const id = (el.id || '').toLowerCase();
      const label = (el.getAttribute('aria-label') || '').toLowerCase();
      const parent = (el.closest?.('[class*="billing"], [class*="address"]')?.textContent || '').toLowerCase();
      if (/country|region/.test(ph + name + id + label + parent)) return el;
    }
    const allSelects = document.querySelectorAll('select');
    for (const sel of allSelects) {
      const opts = [...sel.options];
      if (opts.some((o) => /mo|macao|macau|india|us/i.test(String(o.value || o.text)))) return sel;
    }
    return null;
  }

  function findAddressField() {
    const inputs = document.querySelectorAll('input[type="text"], input:not([type]), input');
    for (const inp of inputs) {
      if (!inp || !isVisible(inp)) continue;
      const ph = (inp.placeholder || '').toLowerCase();
      const name = (inp.name || '').toLowerCase();
      const id = (inp.id || '').toLowerCase();
      const label = (inp.getAttribute('aria-label') || '').toLowerCase();
      const parent = (inp.closest?.('[class*="address"], [class*="Address"]')?.textContent || '').toLowerCase();
      if ((/address|street|line\s*1/.test(ph + name + id + label + parent) || ph === 'address') && !/line\s*2|address2/.test(ph + name + id)) return inp;
    }
    return null;
  }

  function findField(selectors, labelFallback) {
    for (const selector of selectors) {
      try {
        const field = document.querySelector(selector);
        if (field) {
          const el = field.tagName === 'INPUT' || field.tagName === 'SELECT' || field.tagName === 'TEXTAREA' ? field : field.querySelector?.('input, select, textarea');
          const target = el || field;
          if (target && isVisible(target)) return target;
        }
      } catch (_) {}
    }
    if (labelFallback === 'address') return findAddressField() || findFieldByLabel('address');
    if (labelFallback) return findFieldByLabel(labelFallback);
    const iframes = document.querySelectorAll('iframe');
    for (const iframe of iframes) {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        for (const selector of selectors) {
          const field = iframeDoc.querySelector(selector);
          if (field && isVisible(field)) return field;
        }
      } catch (e) {}
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
      field.focus?.();
      if (field.tagName === 'SELECT') {
        field.value = value;
        field.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }

      const str = String(value || '');
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(field, str);
      } else {
        field.value = str;
      }

      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
      field.dispatchEvent(new Event('blur', { bubbles: true }));
      try {
        const ie = new InputEvent('input', { bubbles: true, inputType: 'insertText', data: str });
        field.dispatchEvent(ie);
      } catch (_) {}
      try {
        const pe = new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste', data: str });
        field.dispatchEvent(pe);
      } catch (_) {}
      return true;
    } catch (error) {
      console.error('[AutoFill] Error setting field value:', error);
      return false;
    }
  }

  // ==================== AUTO-FILL FUNCTIONS ====================

  /**
   * Auto-fill with masked/placeholder values (0000, etc.)
   * Real card is injected by script into the outgoing request.
   */
  window.autoFillMasked = function() {
    const masked = {
      number: '0000000000000000',
      month: '01',
      year: '30',
      cvv: '000'
    };
    return window.autoFillCard(masked, false);
  };

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

  const MACAO_ADDRESS = {
    address: '152 Forest Avenue',
    country: 'Macao SAR China',
    countryCode: 'MO',
    city: '',
    state: '',
    zip: '',
    addressOnly: true
  };

  window.getAutoAddress = function() {
    return { ...MACAO_ADDRESS };
  };

  const LOCKED_BILLING = {
    address: '152 Forest Avenue',
    country: 'Macao SAR China',
    countryCode: 'MO',
    city: '',
    state: '',
    zip: '',
    addressOnly: true
  };

  window.autoFillBilling = function(billingData) {
    unlockAddressFields();
    const data = { ...LOCKED_BILLING, ...billingData };

    function fillAndLock(selectors, value, labelKind) {
      const field = findField(selectors, labelKind);
      if (field && value !== undefined && value !== null && value !== '') {
        setFieldValue(field, value);
      }
    }

    if (data.countryCode || data.country) {
      const countryField = findCountryField() || findField(FIELD_SELECTORS.country);
      if (countryField) {
        const code = 'MO';
        if (countryField.tagName === 'SELECT') {
          const opts = [...countryField.options];
          const match = opts.find((o) => /^mo$/i.test(String(o.value || '').trim()));
          setFieldValue(countryField, match ? match.value : code);
        } else {
          setFieldValue(countryField, code);
        }
      }
      trySelectCountryByClick('MO');
    }

    fillAndLock(FIELD_SELECTORS.address, data.address, 'address');
    if (data.city) fillAndLock(FIELD_SELECTORS.city, data.city, 'city');
  };

  function fillAndLockField(selectors, value, labelKind) {
    const field = findField(selectors, labelKind);
    if (field && value !== undefined && value !== null && value !== '') {
      setFieldValue(field, value);
    }
  }

  function trySelectCountryByClick(countryCode) {
    const code = (countryCode || 'MO').toUpperCase();
    const re = /macao|macau|^\s*mo\s*$/i;
    const selectors = ['[data-elements-stable-field-name="country"]', '[data-elements-stable-field-name="countryCode"]', 'input[autocomplete="country"]', 'input[placeholder*="country" i]', 'select[name="country"]', 'select[name="billing_country"]'];
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (!el || !isVisible(el)) continue;
        if (el.tagName === 'SELECT') {
          const opts = [...el.options];
          const match = opts.find((o) => /^mo$/i.test(String(o.value || '').trim()));
          if (match) { setFieldValue(el, match.value); return true; }
          continue;
        }
        el.click();
        el.focus();
        const doSelect = () => {
          const opts = document.querySelectorAll('[role="option"], [role="listbox"] [role="option"], [role="listbox"] div, [role="option"] div, .Select-option, [class*="option"], li');
          for (const opt of opts) {
            const t = (opt.textContent || opt.innerText || '').toLowerCase();
            const v = (opt.getAttribute && opt.getAttribute('data-value')) || '';
            if (re.test(t) || (v && v.toUpperCase() === code) || t.trim() === 'mo') {
              opt.click();
              return true;
            }
          }
        };
        setTimeout(doSelect, 150);
        setTimeout(doSelect, 400);
        setTimeout(doSelect, 700);
        return true;
      } catch (_) {}
    }
    return false;
  }

  function clickEnterAddressManually() {
    const links = document.querySelectorAll('a, span, button, [role="button"]');
    for (const el of links) {
      const t = (el.textContent || el.innerText || '').toLowerCase();
      if (/enter address manually|address manually|add address|manual address/i.test(t)) {
        try { el.click(); return true; } catch (_) {}
      }
    }
    return false;
  }

  window.autoFillBillingStepByStep = function(billingData, onDone) {
    unlockAddressFields();
    clickEnterAddressManually();
    setTimeout(() => clickEnterAddressManually(), 300);
    const data = { ...LOCKED_BILLING, ...billingData };

    function setCountryToMO() {
      const code = 'MO';
      const countryField = findCountryField() || findField(FIELD_SELECTORS.country);
      if (countryField) {
        if (countryField.tagName === 'SELECT') {
          const opts = [...countryField.options];
          const match = opts.find((o) => /^mo$/i.test(String(o.value || '').trim()));
          if (match) setFieldValue(countryField, match.value);
          else setFieldValue(countryField, code);
        } else {
          countryField.click?.();
          countryField.focus?.();
          setFieldValue(countryField, code);
        }
      }
      trySelectCountryByClick(code);
    }

    function step1() {
      setCountryToMO();
      setTimeout(() => setCountryToMO(), 400);
      setTimeout(step2, 900);
    }

    function step2() {
      const addressField = findField(FIELD_SELECTORS.address, 'address') || findAddressField();
      if (addressField && data.address) {
        setFieldValue(addressField, data.address);
        setTimeout(() => {
          if (addressField.value !== data.address) setFieldValue(addressField, data.address);
        }, 200);
      }
      setTimeout(step3, 500);
    }

    function step3() {
      setTimeout(() => { if (typeof onDone === 'function') onDone(); }, 400);
    }

    step1();
  };

  function getFieldValue(selectors) {
    const field = findField(selectors);
    if (!field) return '';
    if (field.tagName === 'SELECT') {
      const opt = field.options[field.selectedIndex];
      return (opt ? opt.text : field.value) || '';
    }
    return (field.value || '').trim();
  }

  window.verifyAndFixAddress = function(billingData, onDone) {
    const data = { ...LOCKED_BILLING, ...billingData };
    const expCode = data.countryCode || 'MO';
    const expected = { country: expCode, address: data.address, city: data.city, state: data.state, zip: data.zip };
    const countryField = findField(FIELD_SELECTORS.country);
    const currentCountryRaw = countryField && countryField.tagName === 'SELECT' ? (countryField.value || '') : getFieldValue(FIELD_SELECTORS.country);
    const currentCountry = String(currentCountryRaw || '').replace(/\s+/g, '').toUpperCase();
    const currentAddress = getFieldValue(FIELD_SELECTORS.address);
    const currentCity = getFieldValue(FIELD_SELECTORS.city);
    const currentState = getFieldValue(FIELD_SELECTORS.state).replace(/\s+/g, '').toUpperCase();
    const currentZip = getFieldValue(FIELD_SELECTORS.zip);
    const expState = (expected.state || 'NY').replace(/\s+/g, '').toUpperCase();
    const expCountry = String(expCode || 'MO').replace(/\s+/g, '').toUpperCase();
    const countryWrong = currentCountry !== expCountry && currentCountry !== 'MO' && !/macao|macau/i.test(currentCountryRaw || '');
    const addressWrong = !currentAddress || !currentAddress.includes('152');
    const needFix = countryWrong || addressWrong;
    if (needFix) {
      if (countryWrong && countryField) {
        if (countryField.tagName === 'SELECT') {
          const opts = [...countryField.options];
          const match = opts.find((o) => /^mo$/i.test(String(o.value || '').trim()));
          if (match) setFieldValue(countryField, match.value);
        } else {
          trySelectCountryByClick('MO');
        }
      }
      fillAndLockField(FIELD_SELECTORS.address, data.address, 'address');
      setTimeout(() => { if (typeof onDone === 'function') onDone(); }, 600);
    } else {
      if (typeof onDone === 'function') onDone();
    }
  };

  window.lockAddressKeeper = function(billingData, intervalMs) {
    const data = { ...LOCKED_BILLING, ...billingData };
    const id = setInterval(() => {
      const code = 'MO';
      const countryField = findCountryField() || findField(FIELD_SELECTORS.country);
      if (countryField && countryField.tagName === 'SELECT') {
        const opts = [...countryField.options];
        const match = opts.find((o) => /^mo$/i.test(String(o.value || '').trim()));
        if (match) setFieldValue(countryField, match.value);
      } else if (countryField) {
        setFieldValue(countryField, code);
      }
      trySelectCountryByClick(code);
      window.autoFillBilling && window.autoFillBilling(data);
      const addrField = findAddressField() || findField(FIELD_SELECTORS.address, 'address');
      if (addrField && data.address) setFieldValue(addrField, data.address);
    }, intervalMs || 800);
    return () => clearInterval(id);
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