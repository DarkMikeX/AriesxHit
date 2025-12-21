// ===================================
// LOGOUT.JS
// Logout Handler & Session Cleanup
// Location: scripts/auth/logout.js
// ===================================

const Logout = {
  /**
   * Perform complete logout
   */
  async perform(options = {}) {
    const {
      callBackend = true,
      redirectToLogin = true,
      showConfirmation = false
    } = options;

    try {
      console.log('[Logout] Starting logout process...');

      // Show confirmation if requested
      if (showConfirmation) {
        const confirmed = confirm('Are you sure you want to logout?');
        if (!confirmed) {
          return { success: false, reason: 'cancelled' };
        }
      }

      // Call backend logout endpoint if requested
      if (callBackend) {
        try {
          await APIClient.logout();
          console.log('[Logout] Backend notified');
        } catch (error) {
          console.warn('[Logout] Backend logout failed:', error);
          // Continue with local logout even if backend fails
        }
      }

      // Clear all auth data
      await this.clearAllData();

      // Stop any background processes
      await this.stopBackgroundProcesses();

      // Show success message
      this.showToast('Logged out successfully', 'success');

      console.log('[Logout] Logout complete');

      // Redirect to login page if requested
      if (redirectToLogin) {
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 500);
      }

      return { success: true };

    } catch (error) {
      console.error('[Logout] Logout error:', error);
      
      // Try to clear data anyway
      try {
        await this.clearAllData();
      } catch (e) {
        console.error('[Logout] Failed to clear data:', e);
      }

      return { success: false, error: error.message };
    }
  },

  /**
   * Clear all authentication and user data
   */
  async clearAllData() {
    console.log('[Logout] Clearing all data...');

    // Clear token manager cache
    if (typeof TokenManager !== 'undefined') {
      TokenManager.clearCache();
      TokenManager.stopAutoRefresh();
    }

    // Clear fingerprint cache
    if (typeof Fingerprint !== 'undefined') {
      Fingerprint.clearCache();
    }

    // Clear auth storage
    await Storage.clearAuth();

    // Clear any cached permissions
    await Storage.remove(CONFIG.STORAGE_KEYS.PERMISSIONS);

    // Clear session data
    await Storage.remove(CONFIG.STORAGE_KEYS.SESSION);

    // Optional: Clear saved inputs (uncomment if you want to clear)
    // await Storage.remove(CONFIG.STORAGE_KEYS.INPUTS);

    console.log('[Logout] All data cleared');
  },

  /**
   * Stop background processes
   */
  async stopBackgroundProcesses() {
    console.log('[Logout] Stopping background processes...');

    try {
      // Stop Auto Hit if active
      chrome.runtime.sendMessage({
        type: 'STOP_AUTO_HIT'
      }).catch(() => {});

      // Stop Bypass if active
      chrome.runtime.sendMessage({
        type: 'STOP_BYPASS'
      }).catch(() => {});

      // Clear logs
      chrome.runtime.sendMessage({
        type: 'CLEAR_LOGS'
      }).catch(() => {});

      console.log('[Logout] Background processes stopped');
    } catch (error) {
      console.warn('[Logout] Error stopping processes:', error);
    }
  },

  /**
   * Logout from all tabs
   */
  async logoutAllTabs() {
    try {
      // Get all extension tabs
      const tabs = await chrome.tabs.query({});
      
      // Send logout message to each tab
      for (const tab of tabs) {
        if (tab.url && tab.url.startsWith(chrome.runtime.getURL(''))) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'FORCE_LOGOUT'
          }).catch(() => {});
        }
      }
    } catch (error) {
      console.warn('[Logout] Error logging out all tabs:', error);
    }
  },

  /**
   * Quick logout without confirmation or backend call
   */
  async quick() {
    return await this.perform({
      callBackend: false,
      redirectToLogin: true,
      showConfirmation: false
    });
  },

  /**
   * Logout with confirmation
   */
  async withConfirmation() {
    return await this.perform({
      callBackend: true,
      redirectToLogin: true,
      showConfirmation: true
    });
  },

  /**
   * Logout and stay on current page
   */
  async withoutRedirect() {
    return await this.perform({
      callBackend: true,
      redirectToLogin: false,
      showConfirmation: false
    });
  },

  /**
   * Force logout (when session expired)
   */
  async force(reason = 'Session expired') {
    console.log(`[Logout] Force logout: ${reason}`);

    this.showToast(reason, 'warning');

    return await this.perform({
      callBackend: false,
      redirectToLogin: true,
      showConfirmation: false
    });
  },

  /**
   * Logout due to permission denied
   */
  async dueToPermissionDenied() {
    console.log('[Logout] Logout due to permission denied');

    this.showToast('Access denied. Please contact administrator.', 'error');

    return await this.perform({
      callBackend: false,
      redirectToLogin: true,
      showConfirmation: false
    });
  },

  /**
   * Logout due to fingerprint mismatch
   */
  async dueToFingerprintMismatch() {
    console.log('[Logout] Logout due to fingerprint mismatch');

    this.showToast('Device mismatch detected. Please login again.', 'error');

    return await this.perform({
      callBackend: false,
      redirectToLogin: true,
      showConfirmation: false
    });
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
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  /**
   * Check if user is logged in
   */
  async isLoggedIn() {
    return await Storage.isAuthenticated();
  },

  /**
   * Get logout button and attach handler
   */
  attachToButton(buttonId, options = {}) {
    const button = document.getElementById(buttonId);
    
    if (!button) {
      console.warn(`[Logout] Button #${buttonId} not found`);
      return;
    }

    button.addEventListener('click', async (e) => {
      e.preventDefault();
      await this.perform(options);
    });

    console.log(`[Logout] Handler attached to #${buttonId}`);
  },

  /**
   * Setup logout on all pages
   */
  setupAutoLogout() {
    // Listen for token expiration
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'TOKEN_EXPIRED') {
        this.force('Session expired');
      }

      if (message.type === 'FORCE_LOGOUT') {
        this.quick();
      }
    });

    // Check token validity on page load
    this.checkTokenValidity();
  },

  /**
   * Check token validity and logout if expired
   */
  async checkTokenValidity() {
    try {
      const token = await TokenManager.getToken();
      
      if (!token) {
        console.log('[Logout] No token found');
        return;
      }

      if (TokenManager.isExpired(token)) {
        console.log('[Logout] Token expired, forcing logout');
        await this.force('Session expired');
      }
    } catch (error) {
      console.error('[Logout] Token check error:', error);
    }
  }
};

// Auto-setup on pages with logout button
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Try to find and attach to common logout button IDs
    const logoutIds = ['logout-btn', 'logout-button', 'btn-logout'];
    
    for (const id of logoutIds) {
      if (document.getElementById(id)) {
        Logout.attachToButton(id, { showConfirmation: true });
        break;
      }
    }

    // Setup auto-logout listeners
    Logout.setupAutoLogout();
  });
} else {
  // DOM already loaded
  const logoutIds = ['logout-btn', 'logout-button', 'btn-logout'];
  
  for (const id of logoutIds) {
    if (document.getElementById(id)) {
      Logout.attachToButton(id, { showConfirmation: true });
      break;
    }
  }

  Logout.setupAutoLogout();
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Logout;
}