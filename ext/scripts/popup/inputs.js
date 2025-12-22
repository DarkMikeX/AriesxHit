// ===================================
// INPUTS.JS
// BIN/Proxy/CC Input Handlers
// Location: scripts/popup/inputs.js
// ===================================

const Inputs = {
  binInput: null,
  proxyInput: null,
  ccInput: null,
  autoSaveTimeout: null,

  /**
   * Initialize inputs
   */
  init() {
    this.binInput = document.getElementById('bin-input');
    this.proxyInput = document.getElementById('proxy-input');
    this.ccInput = document.getElementById('cc-input');

    // Load saved inputs
    this.loadSavedInputs();

    // Setup event listeners
    this.setupEventListeners();

    // Setup auto-save
    this.setupAutoSave();
  },

  /**
   * Load saved inputs from storage
   */
  async loadSavedInputs() {
    try {
      const savedInputs = await Storage.getInputs();

      if (savedInputs) {
        if (this.binInput && savedInputs.bin) {
          this.binInput.value = savedInputs.bin;
          this.validateBINInput();
        }

        if (this.proxyInput && savedInputs.proxy) {
          this.proxyInput.value = savedInputs.proxy;
          this.validateProxyInput();
        }

        if (this.ccInput && savedInputs.cards) {
          this.ccInput.value = savedInputs.cards;
          this.validateCCInput();
        }
      }
    } catch (error) {
      console.error('Error loading saved inputs:', error);
    }
  },

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // BIN input
    if (this.binInput) {
      this.binInput.addEventListener('input', (e) => {
        this.handleBINInput(e);
      });

      this.binInput.addEventListener('blur', () => {
        this.validateBINInput();
      });

      // No keypress restriction - allow any input, validation handles it
    }

    // Proxy input
    if (this.proxyInput) {
      this.proxyInput.addEventListener('input', (e) => {
        this.handleProxyInput(e);
      });

      this.proxyInput.addEventListener('blur', () => {
        this.validateProxyInput();
      });
    }

    // CC input
    if (this.ccInput) {
      this.ccInput.addEventListener('input', (e) => {
        this.handleCCInput(e);
      });

      this.ccInput.addEventListener('blur', () => {
        this.validateCCInput();
      });

      // Prevent both BIN and CC at same time
      this.ccInput.addEventListener('focus', () => {
        if (this.binInput && this.binInput.value.trim()) {
          this.showWarning('Using card list will disable BIN mode');
        }
      });
    }

    // Prevent both BIN and CC
    if (this.binInput) {
      this.binInput.addEventListener('focus', () => {
        if (this.ccInput && this.ccInput.value.trim()) {
          this.showWarning('Using BIN will clear card list');
        }
      });
    }
  },

  /**
   * Setup auto-save
   */
  setupAutoSave() {
    const inputs = [this.binInput, this.proxyInput, this.ccInput];

    inputs.forEach(input => {
      if (input) {
        input.addEventListener('input', () => {
          this.scheduleAutoSave();
        });
      }
    });
  },

  /**
   * Schedule auto-save (debounced)
   */
  scheduleAutoSave() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    this.autoSaveTimeout = setTimeout(() => {
      this.saveInputs();
    }, 1000); // Save after 1 second of no typing
  },

  /**
   * Save inputs to storage
   */
  async saveInputs() {
    try {
      const inputData = {
        bin: this.binInput ? this.binInput.value.trim() : '',
        proxy: this.proxyInput ? this.proxyInput.value.trim() : '',
        cards: this.ccInput ? this.ccInput.value.trim() : ''
      };

      await Storage.setInputs(inputData);
      console.log('[Inputs] Saved to storage');
    } catch (error) {
      console.error('Error saving inputs:', error);
    }
  },

  /**
   * Handle BIN input
   * Supports formats:
   * - 456789 (standard 6-8 digit BIN)
   * - 456789xxxxxx (BIN with x placeholders)
   * - 456789xxxxxx|12|25 (BIN with expiry)
   * - 456789xxxxxx|12|25|xxx (BIN with expiry and CVV pattern)
   * - Multiple BINs separated by newlines
   */
  handleBINInput(e) {
    const value = e.target.value;

    // Allow: digits, x/X (placeholder), | (separator), newlines
    // Don't restrict input to allow full BIN patterns

    // Send BIN list to background on each change
    if (value.trim()) {
      this.sendBinListToBackground(value);
    }
  },

  /**
   * Send BIN list to background script
   */
  sendBinListToBackground(binText) {
    const bins = this.parseBinList(binText);
    
    if (bins.length > 0) {
      chrome.runtime.sendMessage({
        type: 'SET_BIN_LIST',
        bins: bins
      }).catch(() => {});
    }
  },

  /**
   * Parse BIN list from textarea
   */
  parseBinList(binText) {
    if (!binText) return [];

    return binText
      .split('\n')
      .map(line => line.trim())
      .filter(line => {
        // Must have at least 6 valid characters (digits or x)
        const cleanedLine = line.split('|')[0].replace(/[^0-9xX]/g, '');
        return cleanedLine.length >= 6;
      });
  },

  /**
   * Validate BIN input
   * Now supports extended BIN patterns
   */
  validateBINInput() {
    if (!this.binInput) return true;

    const value = this.binInput.value.trim();
    
    if (!value) {
      this.clearInputError(this.binInput);
      return true;
    }

    const bins = this.parseBinList(value);

    if (bins.length === 0) {
      this.showInputError(this.binInput, 'Enter at least 6 digits (can use x as placeholder)');
      return false;
    }

    // Validate each BIN pattern
    let invalidBins = [];
    bins.forEach((bin, index) => {
      const validation = this.validateSingleBin(bin);
      if (!validation.valid) {
        invalidBins.push(`Line ${index + 1}: ${validation.error}`);
      }
    });

    if (invalidBins.length > 0) {
      this.showInputError(this.binInput, invalidBins[0]);
      return false;
    }

    this.clearInputError(this.binInput);
    this.showInputSuccess(this.binInput, `${bins.length} BIN pattern${bins.length > 1 ? 's' : ''} loaded`);
    return true;
  },

  /**
   * Validate a single BIN pattern
   */
  validateSingleBin(bin) {
    const parts = bin.split('|');
    const binPattern = parts[0].trim();
    
    // Remove non-digit/x characters
    const cleaned = binPattern.replace(/[^0-9xX]/g, '');
    
    // Must be 6-16 characters
    if (cleaned.length < 6) {
      return { valid: false, error: 'BIN must be at least 6 characters' };
    }
    
    if (cleaned.length > 16) {
      return { valid: false, error: 'BIN cannot exceed 16 characters' };
    }

    // First 6 characters should be mostly digits (at least 4)
    const firstSix = cleaned.substring(0, 6);
    const digitCount = (firstSix.match(/\d/g) || []).length;
    if (digitCount < 4) {
      return { valid: false, error: 'First 6 characters should have at least 4 digits' };
    }

    // Validate expiry if provided
    if (parts[1]) {
      const month = parseInt(parts[1], 10);
      if (isNaN(month) || month < 1 || month > 12) {
        return { valid: false, error: 'Invalid month (01-12)' };
      }
    }

    if (parts[2]) {
      const year = parseInt(parts[2], 10);
      if (isNaN(year) || year < 0 || year > 99) {
        return { valid: false, error: 'Invalid year (00-99)' };
      }
    }

    return { valid: true };
  },

  /**
   * Handle Proxy input
   */
  handleProxyInput(e) {
    // Optional - add any real-time formatting
  },

  /**
   * Validate Proxy input
   */
  validateProxyInput() {
    if (!this.proxyInput) return true;

    const value = this.proxyInput.value.trim();
    
    if (!value) {
      this.clearInputError(this.proxyInput);
      return true;
    }

    const validation = Validators.validateProxy(value);

    if (!validation.valid) {
      this.showInputError(this.proxyInput, validation.error);
      return false;
    }

    this.clearInputError(this.proxyInput);
    
    // Show formatted proxy
    const formatted = Formatters.formatProxy(validation.parsed);
    this.showInputSuccess(this.proxyInput, 'Proxy: ' + formatted);
    
    return true;
  },

  /**
   * Handle CC input
   */
  handleCCInput(e) {
    const value = e.target.value;

    // Clear BIN if cards are entered
    if (value.trim() && this.binInput) {
      if (this.binInput.value.trim()) {
        this.binInput.value = '';
        this.showInfo('BIN cleared (using card list mode)');
      }
    }
  },

  /**
   * Validate CC input
   */
  validateCCInput() {
    if (!this.ccInput) return true;

    const value = this.ccInput.value.trim();
    
    if (!value) {
      this.clearInputError(this.ccInput);
      return true;
    }

    const validation = Validators.validateCards(value);

    if (!validation.valid) {
      this.showInputError(this.ccInput, validation.errors[0]);
      return false;
    }

    this.clearInputError(this.ccInput);
    
    // Show card count
    const count = validation.cards.length;
    this.showInputSuccess(this.ccInput, `${count} valid card${count > 1 ? 's' : ''} loaded`);
    
    return true;
  },

  /**
   * Show input error
   */
  showInputError(input, message) {
    if (!input) return;

    input.style.borderColor = '#ff4444';
    input.title = message;

    // Find or create error message element
    let errorMsg = input.parentElement.querySelector('.input-error');
    if (!errorMsg) {
      errorMsg = document.createElement('div');
      errorMsg.className = 'input-error';
      errorMsg.style.cssText = `
        color: #ff4444;
        font-size: 11px;
        margin-top: 4px;
      `;
      input.parentElement.appendChild(errorMsg);
    }

    errorMsg.textContent = '⚠️ ' + message;
  },

  /**
   * Show input success
   */
  showInputSuccess(input, message) {
    if (!input) return;

    input.style.borderColor = '#00ff88';

    // Find or create success message element
    let successMsg = input.parentElement.querySelector('.input-success');
    if (!successMsg) {
      successMsg = document.createElement('div');
      successMsg.className = 'input-success';
      successMsg.style.cssText = `
        color: #00ff88;
        font-size: 11px;
        margin-top: 4px;
      `;
      input.parentElement.appendChild(successMsg);
    }

    successMsg.textContent = '✓ ' + message;

    // Auto-remove after 3 seconds
    setTimeout(() => {
      successMsg.remove();
      input.style.borderColor = '';
    }, 3000);
  },

  /**
   * Clear input error
   */
  clearInputError(input) {
    if (!input) return;

    input.style.borderColor = '';
    input.title = '';

    // Remove error message
    const errorMsg = input.parentElement.querySelector('.input-error');
    if (errorMsg) {
      errorMsg.remove();
    }

    // Remove success message
    const successMsg = input.parentElement.querySelector('.input-success');
    if (successMsg) {
      successMsg.remove();
    }
  },

  /**
   * Show warning toast
   */
  showWarning(message) {
    const toast = document.createElement('div');
    toast.textContent = '⚠️ ' + message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #ffaa00;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 13px;
      z-index: 10000;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  },

  /**
   * Show info toast
   */
  showInfo(message) {
    const toast = document.createElement('div');
    toast.textContent = 'ℹ️ ' + message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #00d9ff;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 13px;
      z-index: 10000;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  },

  /**
   * Clear all inputs
   */
  clearAll() {
    if (this.binInput) {
      this.binInput.value = '';
      this.clearInputError(this.binInput);
    }

    if (this.proxyInput) {
      this.proxyInput.value = '';
      this.clearInputError(this.proxyInput);
    }

    if (this.ccInput) {
      this.ccInput.value = '';
      this.clearInputError(this.ccInput);
    }

    this.saveInputs();
  },

  /**
   * Get current input values
   */
  getValues() {
    return {
      bin: this.binInput ? this.binInput.value.trim() : '',
      proxy: this.proxyInput ? this.proxyInput.value.trim() : '',
      cards: this.ccInput ? this.ccInput.value.trim() : ''
    };
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Inputs.init());
} else {
  Inputs.init();
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Inputs;
}