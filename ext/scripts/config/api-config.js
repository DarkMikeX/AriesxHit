// ===================================
// API-CONFIG.JS
// API Endpoint Configuration
// Location: scripts/config/api-config.js
// ===================================

const APIConfig = {
  // Backend base URL - update this to your server
  BASE_URL: 'http://localhost:3000/api',
  
  // API Endpoints
  ENDPOINTS: {
    // Auth endpoints
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    VERIFY: '/auth/verify',
    LOGOUT: '/auth/logout',
    CHECK: '/auth/check',
    STATUS: '/auth/status',
    ME: '/auth/me',
    REFRESH: '/auth/refresh',
    CHANGE_PASSWORD: '/auth/change-password',
    
    // User endpoints
    GET_USER: '/users/me',
    UPDATE_USER: '/users/me',
    USER_STATUS: '/users/status',
    GET_PERMISSIONS: '/users/permissions',
    CHECK_PERMISSION: '/users/permissions',
    USER_SESSIONS: '/users/sessions',
    VERIFY_FINGERPRINT: '/users/verify-fingerprint',
    
    // Admin endpoints
    ADMIN_USERS: '/admin/users',
    ADMIN_PENDING_USERS: '/admin/users/pending',
    ADMIN_ACTIVE_USERS: '/admin/users/active',
    ADMIN_BLOCKED_USERS: '/admin/users/blocked',
    ADMIN_USER: '/admin/users',
    ADMIN_APPROVE: '/admin/users',
    ADMIN_REJECT: '/admin/users',
    ADMIN_BLOCK: '/admin/users',
    ADMIN_UNBLOCK: '/admin/users',
    ADMIN_UPDATE_PERMISSIONS: '/admin/users',
    ADMIN_RESET_PASSWORD: '/admin/users',
    ADMIN_STATS: '/admin/stats',
    ADMIN_LOGIN_ATTEMPTS: '/admin/login-attempts',
    ADMIN_SESSIONS: '/admin/sessions',
    
    // Health check
    HEALTH: '/health'
  },
  
  // Request timeout in milliseconds
  TIMEOUT: 10000,
  
  // Headers
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  
  // Retry configuration
  RETRY: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // milliseconds
    RETRY_ON: [408, 500, 502, 503, 504]
  },
  
  /**
   * Get full URL for an endpoint
   * @param {string} endpoint - Endpoint path
   * @returns {string} - Full URL
   */
  getUrl(endpoint) {
    return this.BASE_URL + endpoint;
  },
  
  /**
   * Set base URL (useful for development/production)
   * @param {string} url - New base URL
   */
  setBaseUrl(url) {
    this.BASE_URL = url;
  },
  
  /**
   * Check if URL is reachable
   * @returns {Promise<boolean>}
   */
  async checkConnection() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(this.BASE_URL + '/health', {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('[APIConfig] Connection check timeout');
      } else {
        console.error('[APIConfig] Connection check failed:', error);
      }
      return false;
    }
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = APIConfig;
}
