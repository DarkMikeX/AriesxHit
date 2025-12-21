// ===================================
// WALLPAPER-MANAGER.JS
// Advanced Wallpaper Management System
// Location: scripts/settings/wallpaper-manager.js
// Note: This extends the basic wallpaper.js with advanced features
// ===================================

const WallpaperManagerAdvanced = {
  // Current wallpaper state
  currentWallpaper: null,
  currentBlur: 60,
  currentDarkness: 50,

  // Cache
  presetCache: new Map(),
  customCache: new Map(),

  // Elements
  wallpaperLayer: null,
  glassOverlay: null,

  /**
   * Initialize wallpaper manager
   */
  async init() {
    this.wallpaperLayer = document.getElementById('wallpaper-layer');
    this.glassOverlay = document.getElementById('glass-overlay');

    if (!this.wallpaperLayer) {
      this.wallpaperLayer = this.createWallpaperLayer();
    }

    if (!this.glassOverlay) {
      this.glassOverlay = this.createGlassOverlay();
    }

    await this.loadCurrentWallpaper();
    this.setupAutoSync();

    console.log('[WallpaperManager] Initialized');
  },

  /**
   * Create wallpaper layer
   */
  createWallpaperLayer() {
    const layer = document.createElement('div');
    layer.id = 'wallpaper-layer';
    layer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-size: cover;
      background-position: center;
      z-index: -2;
      transition: background-image 0.5s ease;
    `;

    document.body.insertBefore(layer, document.body.firstChild);
    return layer;
  },

  /**
   * Create glass overlay
   */
  createGlassOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'glass-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(10px);
      z-index: -1;
      transition: backdrop-filter 0.3s ease, background 0.3s ease;
    `;

    document.body.insertBefore(overlay, this.wallpaperLayer.nextSibling);
    return overlay;
  },

  /**
   * Load current wallpaper from storage
   */
  async loadCurrentWallpaper() {
    const settings = await Storage.getWallpaper();

    if (!settings) {
      this.applyDefault();
      return;
    }

    this.currentWallpaper = settings;
    this.currentBlur = settings.blur || 60;
    this.currentDarkness = settings.darkness || 50;

    this.apply(settings);
  },

  /**
   * Apply wallpaper settings
   */
  apply(settings) {
    if (!settings) return;

    // Apply background
    switch (settings.type) {
      case 'preset':
        this.applyPreset(settings.preset);
        break;
      case 'custom':
        this.applyCustom(settings.url);
        break;
      default:
        this.applyDefault();
    }

    // Apply effects
    this.setBlur(settings.blur || 60);
    this.setDarkness(settings.darkness || 50);
  },

  /**
   * Apply preset wallpaper
   */
  applyPreset(presetId) {
    if (!presetId) {
      console.error('[WallpaperManager] No preset ID provided');
      return;
    }

    const preset = getPresetById(presetId);
    
    if (!preset) {
      console.error('[WallpaperManager] Preset not found:', presetId);
      this.applyDefault();
      return;
    }

    // Use image if available, otherwise gradient
    if (preset.image) {
      this.wallpaperLayer.style.backgroundImage = `url('${preset.image}')`;
    } else if (preset.gradient) {
      this.wallpaperLayer.style.backgroundImage = preset.gradient;
    }

    console.log('[WallpaperManager] Applied preset:', presetId);
  },

  /**
   * Apply custom URL wallpaper
   */
  applyCustom(url) {
    if (!url) {
      console.error('[WallpaperManager] No URL provided');
      return;
    }

    this.wallpaperLayer.style.backgroundImage = `url('${url}')`;
    console.log('[WallpaperManager] Applied custom:', url);
  },

  /**
   * Apply default wallpaper
   */
  applyDefault() {
    this.wallpaperLayer.style.backgroundImage = 
      'linear-gradient(135deg, #0a0a0f 0%, #12121a 50%, #0a0a0f 100%)';
    this.setBlur(60);
    this.setDarkness(50);
    
    console.log('[WallpaperManager] Applied default');
  },

  /**
   * Set blur intensity
   */
  setBlur(value) {
    if (!this.glassOverlay) return;

    this.currentBlur = value;
    const blurPx = (value / 100) * 20; // 0-100 -> 0-20px

    this.glassOverlay.style.backdropFilter = `blur(${blurPx}px)`;
    this.glassOverlay.style.webkitBackdropFilter = `blur(${blurPx}px)`;
  },

  /**
   * Set darkness overlay
   */
  setDarkness(value) {
    if (!this.glassOverlay) return;

    this.currentDarkness = value;
    const opacity = (value / 100) * 0.9; // 0-100 -> 0-0.9

    this.glassOverlay.style.backgroundColor = `rgba(0, 0, 0, ${opacity})`;
  },

  /**
   * Change to preset
   */
  async changeToPreset(presetId) {
    if (!presetExists(presetId)) {
      throw new Error('Invalid preset');
    }

    const settings = {
      type: 'preset',
      preset: presetId,
      blur: this.currentBlur,
      darkness: this.currentDarkness
    };

    await this.saveAndApply(settings);
  },

  /**
   * Change to custom URL
   */
  async changeToCustom(url) {
    // Validate URL
    const validation = await Validators.validateImageURL(url);
    
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const settings = {
      type: 'custom',
      url: url,
      blur: this.currentBlur,
      darkness: this.currentDarkness
    };

    await this.saveAndApply(settings);
  },

  /**
   * Update blur
   */
  async updateBlur(value) {
    this.setBlur(value);
    
    if (this.currentWallpaper) {
      this.currentWallpaper.blur = value;
      await Storage.setWallpaper(this.currentWallpaper);
    }
  },

  /**
   * Update darkness
   */
  async updateDarkness(value) {
    this.setDarkness(value);
    
    if (this.currentWallpaper) {
      this.currentWallpaper.darkness = value;
      await Storage.setWallpaper(this.currentWallpaper);
    }
  },

  /**
   * Save and apply settings
   */
  async saveAndApply(settings) {
    await Storage.setWallpaper(settings);
    this.currentWallpaper = settings;
    this.apply(settings);
  },

  /**
   * Reset to default
   */
  async reset() {
    await Storage.remove(CONFIG.STORAGE_KEYS.WALLPAPER);
    this.currentWallpaper = null;
    this.currentBlur = 60;
    this.currentDarkness = 50;
    this.applyDefault();
  },

  /**
   * Get current settings
   */
  getCurrentSettings() {
    return this.currentWallpaper ? { ...this.currentWallpaper } : null;
  },

  /**
   * Preview wallpaper without saving
   */
  preview(settings) {
    this.apply(settings);
  },

  /**
   * Revert to saved wallpaper
   */
  revertToSaved() {
    if (this.currentWallpaper) {
      this.apply(this.currentWallpaper);
    } else {
      this.applyDefault();
    }
  },

  /**
   * Add to favorites
   */
  async addToFavorites(url) {
    const favorites = await Storage.getFavorites();
    
    if (favorites.includes(url)) {
      throw new Error('Already in favorites');
    }

    if (favorites.length >= CONFIG.WALLPAPER.MAX_FAVORITES) {
      throw new Error(`Maximum ${CONFIG.WALLPAPER.MAX_FAVORITES} favorites allowed`);
    }

    favorites.push(url);
    await Storage.setFavorites(favorites);

    return favorites;
  },

  /**
   * Remove from favorites
   */
  async removeFromFavorites(url) {
    const favorites = await Storage.getFavorites();
    const index = favorites.indexOf(url);
    
    if (index === -1) {
      throw new Error('Not in favorites');
    }

    favorites.splice(index, 1);
    await Storage.setFavorites(favorites);

    return favorites;
  },

  /**
   * Get favorites
   */
  async getFavorites() {
    return await Storage.getFavorites();
  },

  /**
   * Check if URL is favorite
   */
  async isFavorite(url) {
    const favorites = await Storage.getFavorites();
    return favorites.includes(url);
  },

  /**
   * Import wallpaper settings
   */
  async import(settings) {
    const validation = this.validateSettings(settings);
    
    if (!validation.valid) {
      throw new Error('Invalid settings: ' + validation.errors.join(', '));
    }

    await this.saveAndApply(settings);
  },

  /**
   * Export wallpaper settings
   */
  export() {
    return this.currentWallpaper ? JSON.stringify(this.currentWallpaper, null, 2) : null;
  },

  /**
   * Validate wallpaper settings
   */
  validateSettings(settings) {
    const errors = [];

    if (!settings.type) {
      errors.push('Type is required');
    }

    if (settings.type === 'preset' && !settings.preset) {
      errors.push('Preset ID is required');
    }

    if (settings.type === 'custom' && !settings.url) {
      errors.push('URL is required');
    }

    if (settings.blur !== undefined) {
      if (settings.blur < 0 || settings.blur > 100) {
        errors.push('Blur must be between 0-100');
      }
    }

    if (settings.darkness !== undefined) {
      if (settings.darkness < 0 || settings.darkness > 100) {
        errors.push('Darkness must be between 0-100');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  },

  /**
   * Setup auto-sync across tabs
   */
  setupAutoSync() {
    // Listen for storage changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes[CONFIG.STORAGE_KEYS.WALLPAPER]) {
        const newSettings = changes[CONFIG.STORAGE_KEYS.WALLPAPER].newValue;
        
        if (newSettings) {
          console.log('[WallpaperManager] Settings synced from storage');
          this.currentWallpaper = newSettings;
          this.apply(newSettings);
        }
      }
    });
  },

  /**
   * Get wallpaper info
   */
  getInfo() {
    return {
      current: this.currentWallpaper,
      blur: this.currentBlur,
      darkness: this.currentDarkness,
      type: this.currentWallpaper?.type || 'default',
      preset: this.currentWallpaper?.preset,
      url: this.currentWallpaper?.url
    };
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => WallpaperManagerAdvanced.init());
} else {
  WallpaperManagerAdvanced.init();
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WallpaperManagerAdvanced;
}