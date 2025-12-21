// ===================================
// PRESET-GALLERY.JS
// Preset Gallery Handler for Settings
// Location: scripts/settings/preset-gallery.js
// ===================================

const PresetGallery = {
  galleryContainer: null,
  currentPreset: null,

  /**
   * Initialize preset gallery
   */
  init() {
    this.galleryContainer = document.getElementById('preset-gallery');
    
    if (!this.galleryContainer) {
      console.error('[PresetGallery] Gallery container not found');
      return;
    }

    this.renderGallery();
    this.loadCurrentPreset();
    this.setupEventListeners();
  },

  /**
   * Render gallery with presets
   */
  renderGallery() {
    if (!this.galleryContainer) return;

    const presets = getAllPresets();
    
    // Clear existing content
    this.galleryContainer.innerHTML = '';

    presets.forEach(preset => {
      const presetItem = this.createPresetItem(preset);
      this.galleryContainer.appendChild(presetItem);
    });
  },

  /**
   * Create preset item element
   */
  createPresetItem(preset) {
    const item = document.createElement('div');
    item.className = 'preset-item';
    item.setAttribute('data-preset', preset.id);
    item.title = preset.description;

    // Thumbnail
    const thumbnail = document.createElement('div');
    thumbnail.className = 'preset-thumbnail';
    thumbnail.style.background = preset.gradient;

    // Name
    const name = document.createElement('span');
    name.className = 'preset-name';
    name.textContent = preset.name;

    item.appendChild(thumbnail);
    item.appendChild(name);

    return item;
  },

  /**
   * Load current preset from storage
   */
  async loadCurrentPreset() {
    try {
      const wallpaperSettings = await Storage.getWallpaper();
      
      if (wallpaperSettings && wallpaperSettings.type === 'preset') {
        this.currentPreset = wallpaperSettings.preset;
        this.setActivePreset(wallpaperSettings.preset);
      }
    } catch (error) {
      console.error('[PresetGallery] Error loading current preset:', error);
    }
  },

  /**
   * Set active preset visually
   */
  setActivePreset(presetId) {
    if (!this.galleryContainer) return;

    // Remove active class from all
    const items = this.galleryContainer.querySelectorAll('.preset-item');
    items.forEach(item => item.classList.remove('active'));

    // Add active class to selected
    const activeItem = this.galleryContainer.querySelector(`[data-preset="${presetId}"]`);
    if (activeItem) {
      activeItem.classList.add('active');
    }

    this.currentPreset = presetId;
  },

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    if (!this.galleryContainer) return;

    this.galleryContainer.addEventListener('click', async (e) => {
      const presetItem = e.target.closest('.preset-item');
      
      if (!presetItem) return;

      const presetId = presetItem.getAttribute('data-preset');
      await this.selectPreset(presetId);
    });
  },

  /**
   * Select and apply preset
   */
  async selectPreset(presetId) {
    if (!presetExists(presetId)) {
      console.error('[PresetGallery] Invalid preset:', presetId);
      return;
    }

    try {
      // Apply via WallpaperManager
      await WallpaperManager.changePreset(presetId);

      // Update active state
      this.setActivePreset(presetId);

      // Show success message
      this.showToast('✅ Wallpaper applied', 'success');

      console.log('[PresetGallery] Preset applied:', presetId);
    } catch (error) {
      console.error('[PresetGallery] Error applying preset:', error);
      this.showToast('❌ Failed to apply wallpaper', 'error');
    }
  },

  /**
   * Get current preset
   */
  getCurrentPreset() {
    return this.currentPreset;
  },

  /**
   * Refresh gallery
   */
  refresh() {
    this.renderGallery();
    this.loadCurrentPreset();
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
  document.addEventListener('DOMContentLoaded', () => PresetGallery.init());
} else {
  PresetGallery.init();
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PresetGallery;
}