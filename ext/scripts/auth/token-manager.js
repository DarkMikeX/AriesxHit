// ===================================
// TOKEN-MANAGER.JS
// JWT Token Management System
// Location: scripts/auth/token-manager.js
// ===================================

const TokenManager = {
  tokenCache: null,
  refreshTimer: null,

  /**
   * Parse JWT token without verification
   */
  parseToken(token) {
    if (!token || typeof token !== 'string') {
      return null;
    }

    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      // Decode payload (second part)
      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      const parsed = JSON.parse(decoded);

      return parsed;
    } catch (error) {
      console.error('[TokenManager] Parse error:', error);
      return null;
    }
  },

  /**
   * Check if token is expired
   */
  isExpired(token) {
    const parsed = this.parseToken(token);
    if (!parsed || !parsed.exp) {
      return true;
    }

    const expiryTime = parsed.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();

    return currentTime >= expiryTime;
  },

  /**
   * Get time until token expires (in milliseconds)
   */
  getTimeUntilExpiry(token) {
    const parsed = this.parseToken(token);
    if (!parsed || !parsed.exp) {
      return 0;
    }

    const expiryTime = parsed.exp * 1000;
    const currentTime = Date.now();
    const timeLeft = expiryTime - currentTime;

    return Math.max(0, timeLeft);
  },

  /**
   * Get token from storage
   */
  async getToken() {
    // Check cache first
    if (this.tokenCache) {
      // Verify not expired
      if (!this.isExpired(this.tokenCache)) {
        return this.tokenCache;
      } else {
        // Token expired, clear cache
        this.tokenCache = null;
      }
    }

    // Get from storage
    const token = await Storage.getToken();
    
    if (!token) {
      return null;
    }

    // Check expiry
    if (this.isExpired(token)) {
      console.log('[TokenManager] Token expired, clearing...');
      await this.clearToken();
      return null;
    }

    // Cache it
    this.tokenCache = token;

    return token;
  },

  /**
   * Set token in storage and cache
   */
  async setToken(token) {
    if (!token) {
      throw new Error('Invalid token');
    }

    // Validate token format
    const parsed = this.parseToken(token);
    if (!parsed) {
      throw new Error('Invalid token format');
    }

    // Check if already expired
    if (this.isExpired(token)) {
      throw new Error('Token is expired');
    }

    // Save to storage
    await Storage.setToken(token);

    // Cache it
    this.tokenCache = token;

    // Setup auto-refresh
    this.setupAutoRefresh(token);

    console.log('[TokenManager] Token set successfully');

    return true;
  },

  /**
   * Clear token from storage and cache
   */
  async clearToken() {
    // Clear cache
    this.tokenCache = null;

    // Clear storage
    await Storage.removeToken();

    // Stop auto-refresh
    this.stopAutoRefresh();

    console.log('[TokenManager] Token cleared');
  },

  /**
   * Verify token with backend
   */
  async verifyToken(token = null) {
    try {
      // Use provided token or get from storage
      const tokenToVerify = token || await this.getToken();

      if (!tokenToVerify) {
        return { valid: false, reason: 'no_token' };
      }

      // Check local expiry first
      if (this.isExpired(tokenToVerify)) {
        return { valid: false, reason: 'expired' };
      }

      // Verify with backend
      const response = await APIClient.verifyToken();

      if (response && response.valid) {
        return { valid: true, user: response.user };
      }

      return { valid: false, reason: 'invalid' };

    } catch (error) {
      console.error('[TokenManager] Verification error:', error);
      
      if (error.status === 401) {
        return { valid: false, reason: 'unauthorized' };
      }

      return { valid: false, reason: 'error', error: error };
    }
  },

  /**
   * Refresh token (if backend supports it)
   */
  async refreshToken() {
    try {
      const currentToken = await this.getToken();

      if (!currentToken) {
        throw new Error('No token to refresh');
      }

      // Call refresh endpoint (if your backend has one)
      // const response = await APIClient.refreshToken();
      // await this.setToken(response.token);

      console.log('[TokenManager] Token refreshed');
      return true;

    } catch (error) {
      console.error('[TokenManager] Refresh error:', error);
      return false;
    }
  },

  /**
   * Setup automatic token refresh before expiry
   */
  setupAutoRefresh(token) {
    // Clear existing timer
    this.stopAutoRefresh();

    const timeUntilExpiry = this.getTimeUntilExpiry(token);

    if (timeUntilExpiry <= 0) {
      return;
    }

    // Refresh 5 minutes before expiry
    const refreshTime = Math.max(0, timeUntilExpiry - (5 * 60 * 1000));

    console.log(`[TokenManager] Auto-refresh scheduled in ${Math.round(refreshTime / 1000 / 60)} minutes`);

    this.refreshTimer = setTimeout(async () => {
      console.log('[TokenManager] Auto-refreshing token...');
      const success = await this.refreshToken();

      if (!success) {
        console.error('[TokenManager] Auto-refresh failed, clearing token');
        await this.clearToken();
        
        // Notify user to re-login
        chrome.runtime.sendMessage({
          type: 'TOKEN_EXPIRED',
          message: 'Session expired. Please login again.'
        }).catch(() => {});
      }
    }, refreshTime);
  },

  /**
   * Stop auto-refresh timer
   */
  stopAutoRefresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  },

  /**
   * Get token payload data
   */
  async getTokenData() {
    const token = await this.getToken();
    if (!token) {
      return null;
    }

    return this.parseToken(token);
  },

  /**
   * Get user ID from token
   */
  async getUserId() {
    const tokenData = await this.getTokenData();
    return tokenData?.userId || tokenData?.sub || null;
  },

  /**
   * Get username from token
   */
  async getUsername() {
    const tokenData = await this.getTokenData();
    return tokenData?.username || null;
  },

  /**
   * Get permissions from token
   */
  async getPermissionsFromToken() {
    const tokenData = await this.getTokenData();
    return tokenData?.permissions || null;
  },

  /**
   * Check if user has specific permission
   */
  async hasPermission(permission) {
    const permissions = await this.getPermissionsFromToken();
    if (!permissions) {
      return false;
    }

    return permissions[permission] === true;
  },

  /**
   * Format token for Authorization header
   */
  formatBearerToken(token = null) {
    const tokenToFormat = token || this.tokenCache;
    if (!tokenToFormat) {
      return null;
    }

    return `Bearer ${tokenToFormat}`;
  },

  /**
   * Get token info for debugging
   */
  async getTokenInfo() {
    const token = await this.getToken();
    
    if (!token) {
      return {
        exists: false,
        valid: false
      };
    }

    const parsed = this.parseToken(token);
    const expired = this.isExpired(token);
    const timeLeft = this.getTimeUntilExpiry(token);

    return {
      exists: true,
      valid: !expired,
      expired: expired,
      timeUntilExpiry: timeLeft,
      expiresIn: `${Math.round(timeLeft / 1000 / 60)} minutes`,
      userId: parsed?.userId || parsed?.sub,
      username: parsed?.username,
      issuedAt: parsed?.iat ? new Date(parsed.iat * 1000).toISOString() : null,
      expiresAt: parsed?.exp ? new Date(parsed.exp * 1000).toISOString() : null
    };
  }
};

// Auto-setup refresh on load
(async function() {
  const token = await TokenManager.getToken();
  if (token && !TokenManager.isExpired(token)) {
    TokenManager.setupAutoRefresh(token);
  }
})();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TokenManager;
}