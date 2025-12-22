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
    
    // User endpoints
    GET_USER: '/users/me',
    GET_PERMISSIONS: '/users/permissions',
    UPDATE_USER: '/users/update',
    
    // Admin endpoints (if applicable)
    ADMIN_USERS: '/admin/users',
    ADMIN_APPROVE: '/admin/users/approve',
    ADMIN_BLOCK: '/admin/users/block'
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
      const response = await fetch(this.BASE_URL + '/health', {
        method: 'GET',
        timeout: 5000
      });
      return response.ok;
    } catch (error) {
      console.error('[APIConfig] Connection check failed:', error);
      return false;
    }
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = APIConfig;
}
