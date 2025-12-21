// ===================================
// STORAGE.JS
// Chrome Storage API Wrapper
// ===================================

const Storage = {
  /**
   * Get data from Chrome storage
   * @param {string|string[]} keys - Single key or array of keys
   * @returns {Promise<any>} - Retrieved data
   */
  async get(keys) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          // If single key, return just that value
          if (typeof keys === 'string') {
            resolve(result[keys]);
          } else {
            resolve(result);
          }
        }
      });
    });
  },

  /**
   * Set data in Chrome storage
   * @param {Object} data - Key-value pairs to store
   * @returns {Promise<void>}
   */
  async set(data) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(data, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  },

  /**
   * Remove data from Chrome storage
   * @param {string|string[]} keys - Keys to remove
   * @returns {Promise<void>}
   */
  async remove(keys) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove(keys, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  },

  /**
   * Clear all data from Chrome storage
   * @returns {Promise<void>}
   */
  async clear() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.clear(() => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  },

  /**
   * Check if key exists in storage
   * @param {string} key - Key to check
   * @returns {Promise<boolean>}
   */
  async has(key) {
    const result = await this.get(key);
    return result !== undefined && result !== null;
  },

  // Specific storage methods for common data

  /**
   * Get auth token
   */
  async getToken() {
    return await this.get(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
  },

  /**
   * Set auth token
   */
  async setToken(token) {
    await this.set({ [CONFIG.STORAGE_KEYS.AUTH_TOKEN]: token });
  },

  /**
   * Remove auth token
   */
  async removeToken() {
    await this.remove(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
  },

  /**
   * Get user data
   */
  async getUserData() {
    return await this.get(CONFIG.STORAGE_KEYS.USER_DATA);
  },

  /**
   * Set user data
   */
  async setUserData(userData) {
    await this.set({ [CONFIG.STORAGE_KEYS.USER_DATA]: userData });
  },

  /**
   * Get permissions
   */
  async getPermissions() {
    return await this.get(CONFIG.STORAGE_KEYS.PERMISSIONS);
  },

  /**
   * Set permissions
   */
  async setPermissions(permissions) {
    await this.set({ [CONFIG.STORAGE_KEYS.PERMISSIONS]: permissions });
  },

  /**
   * Get device fingerprint
   */
  async getFingerprint() {
    return await this.get(CONFIG.STORAGE_KEYS.FINGERPRINT);
  },

  /**
   * Set device fingerprint
   */
  async setFingerprint(fingerprint) {
    await this.set({ [CONFIG.STORAGE_KEYS.FINGERPRINT]: fingerprint });
  },

  /**
   * Get wallpaper settings
   */
  async getWallpaper() {
    return await this.get(CONFIG.STORAGE_KEYS.WALLPAPER);
  },

  /**
   * Set wallpaper settings
   */
  async setWallpaper(settings) {
    await this.set({ [CONFIG.STORAGE_KEYS.WALLPAPER]: settings });
  },

  /**
   * Get favorites
   */
  async getFavorites() {
    const favorites = await this.get(CONFIG.STORAGE_KEYS.FAVORITES);
    return favorites || [];
  },

  /**
   * Set favorites
   */
  async setFavorites(favorites) {
    await this.set({ [CONFIG.STORAGE_KEYS.FAVORITES]: favorites });
  },

  /**
   * Get saved inputs (BIN, Proxy, CC)
   */
  async getInputs() {
    return await this.get(CONFIG.STORAGE_KEYS.INPUTS);
  },

  /**
   * Set saved inputs
   */
  async setInputs(inputs) {
    await this.set({ [CONFIG.STORAGE_KEYS.INPUTS]: inputs });
  },

  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    const token = await this.getToken();
    const userData = await this.getUserData();
    return !!(token && userData);
  },

  /**
   * Clear all auth data (logout)
   */
  async clearAuth() {
    await this.remove([
      CONFIG.STORAGE_KEYS.AUTH_TOKEN,
      CONFIG.STORAGE_KEYS.USER_DATA,
      CONFIG.STORAGE_KEYS.PERMISSIONS,
      CONFIG.STORAGE_KEYS.SESSION
    ]);
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Storage;
}