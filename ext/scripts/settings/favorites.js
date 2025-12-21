// ===================================
// FAVORITES.JS
// Favorites Wallpaper Management
// Location: scripts/settings/favorites.js
// ===================================

const Favorites = {
  favoritesList: null,
  favorites: [],
  maxFavorites: 10,

  /**
   * Initialize favorites manager
   */
  async init() {
    this.favoritesList = document.getElementById('favorites-list');
    
    if (!this.favoritesList) {
      console.error('[Favorites] Favorites list not found');
      return;
    }

    await this.loadFavorites();
    this.render();
    this.setupEventListeners();
  },

  /**
   * Load favorites from storage
   */
  async loadFavorites() {
    try {
      this.favorites = await Storage.getFavorites();
      console.log('[Favorites] Loaded:', this.favorites.length);
    } catch (error) {
      console.error('[Favorites] Error loading favorites:', error);
      this.favorites = [];
    }
  },

  /**
   * Save favorites to storage
   */
  async saveFavorites() {
    try {
      await Storage.setFavorites(this.favorites);
      console.log('[Favorites] Saved:', this.favorites.length);
    } catch (error) {
      console.error('[Favorites] Error saving favorites:', error);
    }
  },

  /**
   * Render favorites list
   */
  render() {
    if (!this.favoritesList) return;

    // Clear list
    this.favoritesList.innerHTML = '';

    // Show empty state if no favorites
    if (this.favorites.length === 0) {
      this.renderEmptyState();
      return;
    }

    // Render each favorite
    this.favorites.forEach((url, index) => {
      const item = this.createFavoriteItem(url, index);
      this.favoritesList.appendChild(item);
    });
  },

  /**
   * Render empty state
   */
  renderEmptyState() {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
      </svg>
      <p>No favorites saved yet</p>
    `;

    this.favoritesList.appendChild(emptyState);
  },

  /**
   * Create favorite item element
   */
  createFavoriteItem(url, index) {
    const item = document.createElement('div');
    item.className = 'favorite-item';
    item.setAttribute('data-index', index);

    // URL display
    const urlSpan = document.createElement('span');
    urlSpan.className = 'favorite-url';
    urlSpan.textContent = this.truncateUrl(url);
    urlSpan.title = url;

    // Actions container
    const actions = document.createElement('div');
    actions.className = 'favorite-actions';

    // Apply button
    const applyBtn = document.createElement('button');
    applyBtn.className = 'favorite-btn';
    applyBtn.textContent = 'Apply';
    applyBtn.onclick = () => this.applyFavorite(url);

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'favorite-btn delete';
    deleteBtn.textContent = 'X';
    deleteBtn.onclick = () => this.deleteFavorite(index);

    actions.appendChild(applyBtn);
    actions.appendChild(deleteBtn);

    item.appendChild(urlSpan);
    item.appendChild(actions);

    return item;
  },

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    const addBtn = document.getElementById('add-to-favorites-btn');
    
    if (addBtn) {
      addBtn.addEventListener('click', () => this.addCurrentToFavorites());
    }
  },

  /**
   * Add current wallpaper to favorites
   */
  async addCurrentToFavorites() {
    try {
      const currentSettings = WallpaperManager.getCurrentSettings();
      
      if (!currentSettings || currentSettings.type !== 'custom' || !currentSettings.url) {
        this.showToast('⚠️ No custom wallpaper applied', 'error');
        return;
      }

      const url = currentSettings.url;

      // Check if already in favorites
      if (this.favorites.includes(url)) {
        this.showToast('ℹ️ Already in favorites', 'info');
        return;
      }

      // Check max limit
      if (this.favorites.length >= this.maxFavorites) {
        this.showToast(`⚠️ Maximum ${this.maxFavorites} favorites allowed`, 'error');
        return;
      }

      // Add to favorites
      this.favorites.push(url);
      await this.saveFavorites();

      // Re-render
      this.render();

      this.showToast('✅ Added to favorites', 'success');
    } catch (error) {
      console.error('[Favorites] Error adding favorite:', error);
      this.showToast('❌ Failed to add favorite', 'error');
    }
  },

  /**
   * Apply favorite wallpaper
   */
  async applyFavorite(url) {
    try {
      await WallpaperManager.changeCustom(url);
      this.showToast('✅ Favorite applied', 'success');
    } catch (error) {
      console.error('[Favorites] Error applying favorite:', error);
      this.showToast('❌ Failed to apply favorite', 'error');
    }
  },

  /**
   * Delete favorite
   */
  async deleteFavorite(index) {
    if (index < 0 || index >= this.favorites.length) {
      return;
    }

    // Confirm deletion
    if (!confirm('Remove this favorite?')) {
      return;
    }

    try {
      // Remove from array
      this.favorites.splice(index, 1);
      
      // Save
      await this.saveFavorites();

      // Re-render
      this.render();

      this.showToast('✅ Favorite removed', 'success');
    } catch (error) {
      console.error('[Favorites] Error deleting favorite:', error);
      this.showToast('❌ Failed to delete favorite', 'error');
    }
  },

  /**
   * Clear all favorites
   */
  async clearAll() {
    if (!confirm('Remove all favorites?')) {
      return;
    }

    try {
      this.favorites = [];
      await this.saveFavorites();
      this.render();
      this.showToast('✅ All favorites removed', 'success');
    } catch (error) {
      console.error('[Favorites] Error clearing favorites:', error);
      this.showToast('❌ Failed to clear favorites', 'error');
    }
  },

  /**
   * Get favorites count
   */
  getCount() {
    return this.favorites.length;
  },

  /**
   * Check if URL is in favorites
   */
  isFavorite(url) {
    return this.favorites.includes(url);
  },

  /**
   * Truncate URL for display
   */
  truncateUrl(url, maxLength = 50) {
    if (url.length <= maxLength) {
      return url;
    }

    return url.substring(0, maxLength - 3) + '...';
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
  document.addEventListener('DOMContentLoaded', () => Favorites.init());
} else {
  Favorites.init();
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Favorites;
}