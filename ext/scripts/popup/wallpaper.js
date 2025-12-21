// ===================================
// WALLPAPER.JS
// Wallpaper Background Manager
// ===================================

const WallpaperManager = {
  wallpaperLayer: null,
  glassOverlay: null,
  currentSettings: null,

  /**
   * Initialize wallpaper system
   */
  init() {
    // Get or create wallpaper layer
    this.wallpaperLayer = document.getElementById('wallpaper-layer');
    this.glassOverlay = document.getElementById('glass-overlay');

    if (!this.wallpaperLayer) {
      this.wallpaperLayer = document.createElement('div');
      this.wallpaperLayer.id = 'wallpaper-layer';
      document.body.insertBefore(this.wallpaperLayer, document.body.firstChild);
    }

    if (!this.glassOverlay) {
      this.glassOverlay = document.createElement('div');
      this.glassOverlay.id = 'glass-overlay';
      document.body.insertBefore(this.glassOverlay, this.wallpaperLayer.nextSibling);
    }

    // Load and apply saved settings
    this.loadSettings();
  },

  /**
   * Load settings from storage
   */
  async loadSettings() {
    const settings = await Storage.getWallpaper();
    if (settings) {
      this.applyWallpaper(settings);
    } else {
      this.applyDefault();
    }
  },

  /**
   * Apply wallpaper settings
   */
  applyWallpaper(settings) {
    this.currentSettings = settings;

    // Apply background
    if (settings.type === 'preset') {
      this.applyPreset(settings.preset);
    } else if (settings.type === 'custom' && settings.url) {
      this.applyCustom(settings.url);
    } else {
      this.applyDefault();
    }

    // Apply blur
    const blur = settings.blur !== undefined ? settings.blur : CONFIG.WALLPAPER.DEFAULT_BLUR;
    this.setBlur(blur);

    // Apply darkness
    const darkness = settings.darkness !== undefined ? settings.darkness : CONFIG.WALLPAPER.DEFAULT_DARKNESS;
    this.setDarkness(darkness);
  },

  /**
   * Apply preset wallpaper
   */
  applyPreset(presetName) {
    const preset = WALLPAPER_PRESETS[presetName];
    if (!preset) {
      console.error('Preset not found:', presetName);
      this.applyDefault();
      return;
    }

    if (preset.image) {
      this.wallpaperLayer.style.backgroundImage = `url('${preset.image}')`;
    } else if (preset.gradient) {
      this.wallpaperLayer.style.backgroundImage = preset.gradient;
    }
  },

  /**
   * Apply custom URL wallpaper
   */
  applyCustom(url) {
    this.wallpaperLayer.style.backgroundImage = `url('${url}')`;
  },

  /**
   * Apply default wallpaper
   */
  applyDefault() {
    this.wallpaperLayer.style.backgroundImage = 'linear-gradient(135deg, #0a0a0f 0%, #12121a 50%, #0a0a0f 100%)';
    this.setBlur(CONFIG.WALLPAPER.DEFAULT_BLUR);
    this.setDarkness(CONFIG.WALLPAPER.DEFAULT_DARKNESS);
  },

  /**
   * Set blur intensity
   */
  setBlur(value) {
    if (!this.glassOverlay) return;

    // Convert percentage to pixels (0-100 -> 0-20px)
    const blurPx = (value / 100) * 20;
    this.glassOverlay.style.backdropFilter = `blur(${blurPx}px)`;
    this.glassOverlay.style.webkitBackdropFilter = `blur(${blurPx}px)`;
  },

  /**
   * Set darkness overlay
   */
  setDarkness(value) {
    if (!this.glassOverlay) return;

    // Convert percentage to opacity (0-100 -> 0-0.9)
    const opacity = (value / 100) * 0.9;
    this.glassOverlay.style.backgroundColor = `rgba(0, 0, 0, ${opacity})`;
  },

  /**
   * Save current settings
   */
  async saveSettings() {
    if (this.currentSettings) {
      await Storage.setWallpaper(this.currentSettings);
    }
  },

  /**
   * Change wallpaper to preset
   */
  async changePreset(presetName) {
    const settings = {
      type: 'preset',
      preset: presetName,
      blur: this.currentSettings?.blur || CONFIG.WALLPAPER.DEFAULT_BLUR,
      darkness: this.currentSettings?.darkness || CONFIG.WALLPAPER.DEFAULT_DARKNESS
    };

    this.applyWallpaper(settings);
    await Storage.setWallpaper(settings);
  },

  /**
   * Change wallpaper to custom URL
   */
  async changeCustom(url) {
    // Validate URL first
    const validation = await Validators.validateImageURL(url);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const settings = {
      type: 'custom',
      url: url,
      blur: this.currentSettings?.blur || CONFIG.WALLPAPER.DEFAULT_BLUR,
      darkness: this.currentSettings?.darkness || CONFIG.WALLPAPER.DEFAULT_DARKNESS
    };

    this.applyWallpaper(settings);
    await Storage.setWallpaper(settings);
  },

  /**
   * Update blur setting
   */
  async updateBlur(value) {
    if (!this.currentSettings) {
      this.currentSettings = {};
    }
    
    this.currentSettings.blur = value;
    this.setBlur(value);
    await Storage.setWallpaper(this.currentSettings);
  },

  /**
   * Update darkness setting
   */
  async updateDarkness(value) {
    if (!this.currentSettings) {
      this.currentSettings = {};
    }
    
    this.currentSettings.darkness = value;
    this.setDarkness(value);
    await Storage.setWallpaper(this.currentSettings);
  },

  /**
   * Reset to default
   */
  async reset() {
    this.applyDefault();
    await Storage.remove(CONFIG.STORAGE_KEYS.WALLPAPER);
    this.currentSettings = null;
  },

  /**
   * Get current settings
   */
  getCurrentSettings() {
    return this.currentSettings;
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => WallpaperManager.init());
} else {
  WallpaperManager.init();
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WallpaperManager;
}