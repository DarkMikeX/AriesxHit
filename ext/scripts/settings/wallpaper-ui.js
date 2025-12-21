// ===================================
// WALLPAPER-UI.JS
// Wallpaper UI Control Handlers
// Location: scripts/settings/wallpaper-ui.js
// ===================================

const WallpaperUI = {
  // Elements
  customUrlInput: null,
  previewUrlBtn: null,
  applyUrlBtn: null,
  urlPreview: null,
  urlPreviewImg: null,
  blurSlider: null,
  blurValue: null,
  darknessSlider: null,
  darknessValue: null,
  resetBtn: null,

  /**
   * Initialize wallpaper UI controls
   */
  init() {
    this.customUrlInput = document.getElementById('custom-url-input');
    this.previewUrlBtn = document.getElementById('preview-url-btn');
    this.applyUrlBtn = document.getElementById('apply-url-btn');
    this.urlPreview = document.getElementById('url-preview');
    this.urlPreviewImg = document.getElementById('url-preview-img');
    this.blurSlider = document.getElementById('blur-slider');
    this.blurValue = document.getElementById('blur-value');
    this.darknessSlider = document.getElementById('darkness-slider');
    this.darknessValue = document.getElementById('darkness-value');
    this.resetBtn = document.getElementById('reset-wallpaper-btn');

    this.setupEventListeners();
    this.loadCurrentSettings();
  },

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Preview URL button
    if (this.previewUrlBtn) {
      this.previewUrlBtn.addEventListener('click', () => this.handlePreviewUrl());
    }

    // Apply URL button
    if (this.applyUrlBtn) {
      this.applyUrlBtn.addEventListener('click', () => this.handleApplyUrl());
    }

    // Blur slider
    if (this.blurSlider) {
      this.blurSlider.addEventListener('input', (e) => this.handleBlurInput(e));
      this.blurSlider.addEventListener('change', (e) => this.handleBlurChange(e));
    }

    // Darkness slider
    if (this.darknessSlider) {
      this.darknessSlider.addEventListener('input', (e) => this.handleDarknessInput(e));
      this.darknessSlider.addEventListener('change', (e) => this.handleDarknessChange(e));
    }

    // Reset button
    if (this.resetBtn) {
      this.resetBtn.addEventListener('click', () => this.handleReset());
    }

    // Custom URL input - validate on input
    if (this.customUrlInput) {
      this.customUrlInput.addEventListener('input', () => this.validateUrlInput());
    }
  },

  /**
   * Load current settings
   */
  async loadCurrentSettings() {
    try {
      const settings = await Storage.getWallpaper();

      if (settings) {
        // Load blur
        if (settings.blur !== undefined && this.blurSlider) {
          this.blurSlider.value = settings.blur;
          this.blurValue.textContent = settings.blur + '%';
        }

        // Load darkness
        if (settings.darkness !== undefined && this.darknessSlider) {
          this.darknessSlider.value = settings.darkness;
          this.darknessValue.textContent = settings.darkness + '%';
        }

        // Load custom URL
        if (settings.type === 'custom' && settings.url && this.customUrlInput) {
          this.customUrlInput.value = settings.url;
        }
      }
    } catch (error) {
      console.error('[WallpaperUI] Error loading settings:', error);
    }
  },

  /**
   * Handle preview URL
   */
  async handlePreviewUrl() {
    const url = this.customUrlInput.value.trim();

    if (!url) {
      this.showToast('⚠️ Please enter a URL', 'error');
      return;
    }

    // Show loading
    this.setButtonLoading(this.previewUrlBtn, true);

    try {
      // Validate URL
      const validation = await Validators.validateImageURL(url);

      if (!validation.valid) {
        this.showToast('❌ ' + validation.error, 'error');
        this.hidePreview();
        return;
      }

      // Show preview
      this.showPreview(url);
      this.showToast('✅ Preview loaded', 'success');
    } catch (error) {
      console.error('[WallpaperUI] Preview error:', error);
      this.showToast('❌ Failed to load preview', 'error');
      this.hidePreview();
    } finally {
      this.setButtonLoading(this.previewUrlBtn, false);
    }
  },

  /**
   * Handle apply URL
   */
  async handleApplyUrl() {
    const url = this.customUrlInput.value.trim();

    if (!url) {
      this.showToast('⚠️ Please enter a URL', 'error');
      return;
    }

    this.setButtonLoading(this.applyUrlBtn, true);

    try {
      await WallpaperManager.changeCustom(url);
      this.showToast('✅ Custom wallpaper applied', 'success');
    } catch (error) {
      console.error('[WallpaperUI] Apply error:', error);
      this.showToast('❌ ' + error.message, 'error');
    } finally {
      this.setButtonLoading(this.applyUrlBtn, false);
    }
  },

  /**
   * Handle blur slider input (real-time)
   */
  handleBlurInput(e) {
    const value = e.target.value;
    this.blurValue.textContent = value + '%';
    WallpaperManager.setBlur(value);
  },

  /**
   * Handle blur slider change (save)
   */
  async handleBlurChange(e) {
    const value = e.target.value;
    await WallpaperManager.updateBlur(value);
  },

  /**
   * Handle darkness slider input (real-time)
   */
  handleDarknessInput(e) {
    const value = e.target.value;
    this.darknessValue.textContent = value + '%';
    WallpaperManager.setDarkness(value);
  },

  /**
   * Handle darkness slider change (save)
   */
  async handleDarknessChange(e) {
    const value = e.target.value;
    await WallpaperManager.updateDarkness(value);
  },

  /**
   * Handle reset
   */
  async handleReset() {
    if (!confirm('Reset wallpaper to default?')) {
      return;
    }

    try {
      await WallpaperManager.reset();

      // Reset UI
      if (this.blurSlider) {
        this.blurSlider.value = CONFIG.WALLPAPER.DEFAULT_BLUR;
        this.blurValue.textContent = CONFIG.WALLPAPER.DEFAULT_BLUR + '%';
      }

      if (this.darknessSlider) {
        this.darknessSlider.value = CONFIG.WALLPAPER.DEFAULT_DARKNESS;
        this.darknessValue.textContent = CONFIG.WALLPAPER.DEFAULT_DARKNESS + '%';
      }

      if (this.customUrlInput) {
        this.customUrlInput.value = '';
      }

      this.hidePreview();

      this.showToast('✅ Wallpaper reset to default', 'success');
    } catch (error) {
      console.error('[WallpaperUI] Reset error:', error);
      this.showToast('❌ Failed to reset wallpaper', 'error');
    }
  },

  /**
   * Show preview image
   */
  showPreview(url) {
    if (!this.urlPreview || !this.urlPreviewImg) return;

    this.urlPreviewImg.src = url;
    this.urlPreview.style.display = 'block';
  },

  /**
   * Hide preview image
   */
  hidePreview() {
    if (!this.urlPreview) return;

    this.urlPreview.style.display = 'none';
    if (this.urlPreviewImg) {
      this.urlPreviewImg.src = '';
    }
  },

  /**
   * Validate URL input
   */
  validateUrlInput() {
    if (!this.customUrlInput) return;

    const url = this.customUrlInput.value.trim();

    if (!url) {
      this.customUrlInput.style.borderColor = '';
      return;
    }

    // Basic URL validation
    const isValid = Validators.validateURL(url);

    if (isValid) {
      this.customUrlInput.style.borderColor = '#00ff88';
    } else {
      this.customUrlInput.style.borderColor = '#ff4444';
    }
  },

  /**
   * Set button loading state
   */
  setButtonLoading(button, loading) {
    if (!button) return;

    if (loading) {
      button.disabled = true;
      button.style.opacity = '0.6';
      button.style.cursor = 'wait';
    } else {
      button.disabled = false;
      button.style.opacity = '';
      button.style.cursor = '';
    }
  },

  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    if (!toast || !toastMessage) {
      console.log(message);
      return;
    }

    toastMessage.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'block';

    setTimeout(() => {
      toast.style.display = 'none';
    }, 3000);
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => WallpaperUI.init());
} else {
  WallpaperUI.init();
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WallpaperUI;
}