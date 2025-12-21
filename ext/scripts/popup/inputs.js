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

      // Allow only numbers
      this.binInput.addEventListener('keypress', (e) => {
        if (!/[0-9]/.test(e.key) && e.key !== 'Backspace') {
          e.preventDefault();
        }
      });
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
   */
  handleBINInput(e) {
    const value = e.target.value;

    // Limit to 8 digits
    if (value.length > 8) {
      e.target.value = value.substring(0, 8);
    }

    // Format with spaces (optional)
    // e.target.value = Formatters.formatBIN(e.target.value);

    // Clear CC input if BIN is entered
    if (value.trim() && this.ccInput) {
      if (this.ccInput.value.trim()) {
        this.ccInput.value = '';
        this.showInfo('Card list cleared (using BIN mode)');
      }
    }
  },

  /**
   * Validate BIN input
   */
  validateBINInput() {
    if (!this.binInput) return true;

    const value = this.binInput.value.trim();
    
    if (!value) {
      this.clearInputError(this.binInput);
      return true;
    }

    const validation = Validators.validateBIN(value);

    if (!validation.valid) {
      this.showInputError(this.binInput, validation.error);
      return false;
    }

    this.clearInputError(this.binInput);
    return true;
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