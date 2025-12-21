// ===================================
// TOGGLES.JS
// Auto Hit & Bypass Toggle Handlers
// Location: scripts/popup/toggles.js
// ===================================

const Toggles = {
  autoHitToggle: null,
  bypassToggle: null,
  permissions: null,

  /**
   * Initialize toggles
   */
  async init() {
    this.autoHitToggle = document.getElementById('auto-hit-toggle');
    this.bypassToggle = document.getElementById('bypass-toggle');

    // Get permissions
    this.permissions = await Storage.getPermissions();

    // Check permissions and setup
    this.setupAutoHitToggle();
    this.setupBypassToggle();

    // Listen for state updates from background
    this.listenForUpdates();
  },

  /**
   * Setup Auto Hit toggle
   */
  setupAutoHitToggle() {
    if (!this.autoHitToggle) return;

    // Check permission
    if (!this.permissions || !this.permissions.auto_hit) {
      this.disableToggle(this.autoHitToggle, 'Auto Hit permission required');
      return;
    }

    // Enable toggle
    this.autoHitToggle.addEventListener('click', () => {
      this.handleAutoHitToggle();
    });

    // Load current state
    this.loadAutoHitState();
  },

  /**
   * Setup Bypass toggle
   */
  setupBypassToggle() {
    if (!this.bypassToggle) return;

    // Check permission
    if (!this.permissions || !this.permissions.bypass) {
      this.disableToggle(this.bypassToggle, 'Bypass permission required');
      return;
    }

    // Enable toggle
    this.bypassToggle.addEventListener('click', () => {
      this.handleBypassToggle();
    });

    // Load current state
    this.loadBypassState();
  },

  /**
   * Disable toggle
   */
  disableToggle(toggle, message) {
    if (!toggle) return;

    toggle.classList.add('disabled');
    toggle.title = '⛔ ' + message;
    toggle.style.cursor = 'not-allowed';

    // Add visual lock icon
    const indicator = toggle.querySelector('.toggle-indicator');
    if (indicator) {
      indicator.innerHTML = '🔒';
      indicator.style.fontSize = '12px';
    }
  },

  /**
   * Handle Auto Hit toggle click
   */
  async handleAutoHitToggle() {
    const isActive = this.autoHitToggle.getAttribute('data-active') === 'true';

    if (isActive) {
      // Stop Auto Hit
      await this.stopAutoHit();
    } else {
      // Start Auto Hit
      await this.startAutoHit();
    }
  },

  /**
   * Start Auto Hit
   */
  async startAutoHit() {
    // Validate inputs first
    const validation = await this.validateInputs();
    
    if (!validation.valid) {
      this.showError(validation.error);
      return;
    }

    // Show loading
    this.setToggleLoading(this.autoHitToggle, true);

    try {
      // Send message to background
      const response = await chrome.runtime.sendMessage({
        type: 'START_AUTO_HIT',
        data: {
          bin: validation.data.bin,
          proxy: validation.data.proxy,
          cards: validation.data.cards
        }
      });

      if (response && response.success) {
        // Update UI
        this.setToggleActive(this.autoHitToggle, true);
        Logger.addLog('success', 'Auto Hit started');
        this.showToast('✅ Auto Hit Started', 'success');
      } else {
        const error = response?.error || 'Failed to start Auto Hit';
        Logger.addLog('error', error);
        this.showToast('❌ ' + error, 'error');
      }
    } catch (error) {
      console.error('Error starting Auto Hit:', error);
      this.showToast('❌ Failed to start Auto Hit', 'error');
    } finally {
      this.setToggleLoading(this.autoHitToggle, false);
    }
  },

  /**
   * Stop Auto Hit
   */
  async stopAutoHit() {
    this.setToggleLoading(this.autoHitToggle, true);

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'STOP_AUTO_HIT'
      });

      if (response && response.success) {
        this.setToggleActive(this.autoHitToggle, false);
        Logger.addLog('info', 'Auto Hit stopped');
        this.showToast('🛑 Auto Hit Stopped', 'info');
      }
    } catch (error) {
      console.error('Error stopping Auto Hit:', error);
      this.showToast('❌ Failed to stop Auto Hit', 'error');
    } finally {
      this.setToggleLoading(this.autoHitToggle, false);
    }
  },

  /**
   * Handle Bypass toggle click
   */
  async handleBypassToggle() {
    const isActive = this.bypassToggle.getAttribute('data-active') === 'true';

    if (isActive) {
      // Stop Bypass
      await this.stopBypass();
    } else {
      // Start Bypass
      await this.startBypass();
    }
  },

  /**
   * Start Bypass
   */
  async startBypass() {
    this.setToggleLoading(this.bypassToggle, true);

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'START_BYPASS'
      });

      if (response && response.success) {
        this.setToggleActive(this.bypassToggle, true);
        Logger.addLog('success', 'Bypass mode enabled (CVV removal)');
        this.showToast('✅ Bypass Enabled', 'success');
      } else {
        const error = response?.error || 'Failed to start Bypass';
        Logger.addLog('error', error);
        this.showToast('❌ ' + error, 'error');
      }
    } catch (error) {
      console.error('Error starting Bypass:', error);
      this.showToast('❌ Failed to start Bypass', 'error');
    } finally {
      this.setToggleLoading(this.bypassToggle, false);
    }
  },

  /**
   * Stop Bypass
   */
  async stopBypass() {
    this.setToggleLoading(this.bypassToggle, true);

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'STOP_BYPASS'
      });

      if (response && response.success) {
        this.setToggleActive(this.bypassToggle, false);
        Logger.addLog('info', 'Bypass mode disabled');
        this.showToast('🛑 Bypass Disabled', 'info');
      }
    } catch (error) {
      console.error('Error stopping Bypass:', error);
      this.showToast('❌ Failed to stop Bypass', 'error');
    } finally {
      this.setToggleLoading(this.bypassToggle, false);
    }
  },

  /**
   * Validate inputs before starting
   */
  async validateInputs() {
    const binInput = document.getElementById('bin-input');
    const proxyInput = document.getElementById('proxy-input');
    const ccInput = document.getElementById('cc-input');

    if (!binInput || !ccInput) {
      return { valid: false, error: 'Input fields not found' };
    }

    const bin = binInput.value.trim();
    const proxy = proxyInput.value.trim();
    const cards = ccInput.value.trim();

    // Must have either BIN or cards
    if (!bin && !cards) {
      return { valid: false, error: 'Please enter BIN or card list' };
    }

    // Cannot have both
    if (bin && cards) {
      return { valid: false, error: 'Use either BIN or card list, not both' };
    }

    let validatedData = {};

    // Validate BIN
    if (bin) {
      const binValidation = Validators.validateBIN(bin);
      if (!binValidation.valid) {
        return { valid: false, error: binValidation.error };
      }
      validatedData.bin = binValidation.bin;
    }

    // Validate cards
    if (cards) {
      const cardsValidation = Validators.validateCards(cards);
      if (!cardsValidation.valid) {
        return { valid: false, error: cardsValidation.errors[0] };
      }
      validatedData.cards = cardsValidation.cards;
    }

    // Validate proxy (optional)
    if (proxy) {
      const proxyValidation = Validators.validateProxy(proxy);
      if (!proxyValidation.valid) {
        return { valid: false, error: proxyValidation.error };
      }
      validatedData.proxy = proxyValidation.parsed;
    }

    return { valid: true, data: validatedData };
  },

  /**
   * Set toggle active state
   */
  setToggleActive(toggle, active) {
    if (!toggle) return;

    toggle.setAttribute('data-active', active ? 'true' : 'false');

    const indicator = toggle.querySelector('.toggle-indicator');
    if (indicator) {
      // Reset any lock icon
      indicator.innerHTML = '';
      indicator.style.fontSize = '';
    }
  },

  /**
   * Set toggle loading state
   */
  setToggleLoading(toggle, loading) {
    if (!toggle) return;

    if (loading) {
      toggle.classList.add('loading');
      toggle.style.pointerEvents = 'none';
    } else {
      toggle.classList.remove('loading');
      toggle.style.pointerEvents = '';
    }
  },

  /**
   * Load Auto Hit state from background
   */
  async loadAutoHitState() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_AUTO_HIT_STATE'
      });

      if (response && response.active) {
        this.setToggleActive(this.autoHitToggle, true);
      }
    } catch (error) {
      // Ignore if background not ready
    }
  },

  /**
   * Load Bypass state from background
   */
  async loadBypassState() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_BYPASS_STATE'
      });

      if (response && response.active) {
        this.setToggleActive(this.bypassToggle, true);
      }
    } catch (error) {
      // Ignore if background not ready
    }
  },

  /**
   * Listen for state updates from background
   */
  listenForUpdates() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'AUTO_HIT_STATE_CHANGED') {
        this.setToggleActive(this.autoHitToggle, message.active);
      }

      if (message.type === 'BYPASS_STATE_CHANGED') {
        this.setToggleActive(this.bypassToggle, message.active);
      }
    });
  },

  /**
   * Show error toast
   */
  showError(message) {
    this.showToast('⚠️ ' + message, 'error');
    Logger.addLog('error', message);
  },

  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    const colors = {
      info: '#00d9ff',
      success: '#00ff88',
      error: '#ff4444',
      warning: '#ffaa00'
    };

    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: ${colors[type]};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 13px;
      z-index: 10000;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Toggles.init());
} else {
  Toggles.init();
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Toggles;
}