// ===================================
// API-CLIENT.JS
// Backend API Communication
// ===================================

const APIClient = {
  /**
   * Make HTTP request to backend
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise<Object>} - Response data
   */
  async request(endpoint, options = {}) {
    const url = `${CONFIG.API.BASE_URL}${endpoint}`;
    
    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: CONFIG.API.TIMEOUT
    };
    
    // Merge options
    const fetchOptions = { ...defaultOptions, ...options };
    
    // Add auth token if available
    const token = await Storage.getToken();
    if (token) {
      fetchOptions.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Convert body to JSON if object
    if (fetchOptions.body && typeof fetchOptions.body === 'object') {
      fetchOptions.body = JSON.stringify(fetchOptions.body);
    }
    
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), fetchOptions.timeout);
      
      fetchOptions.signal = controller.signal;
      
      const response = await fetch(url, fetchOptions);
      
      clearTimeout(timeoutId);
      
      // Parse JSON response
      const data = await response.json();
      
      // Check if response is ok
      if (!response.ok) {
        throw {
          status: response.status,
          message: data.message || 'Request failed',
          data: data
        };
      }
      
      return data;
      
    } catch (error) {
      // Handle different error types
      if (error.name === 'AbortError') {
        throw {
          status: 408,
          message: 'Request timeout',
          error: 'timeout'
        };
      }
      
      if (error.status) {
        throw error;
      }
      
      throw {
        status: 0,
        message: CONFIG.MESSAGES.ERROR.NETWORK,
        error: error.message
      };
    }
  },

  /**
   * Login with username, password, and fingerprint
   * @param {string} username - Username
   * @param {string} password - Password
   * @param {string} fingerprint - Device fingerprint
   * @returns {Promise<Object>} - User data with token
   */
  async login(username, password, fingerprint) {
    return await this.request(CONFIG.API.ENDPOINTS.LOGIN, {
      method: 'POST',
      body: {
        username,
        password,
        fingerprint_hash: fingerprint
      }
    });
  },

  /**
   * Register new user
   * @param {string} username - Username
   * @param {string} fingerprint - Device fingerprint
   * @returns {Promise<Object>} - Registration result
   */
  async register(username, fingerprint) {
    return await this.request(CONFIG.API.ENDPOINTS.REGISTER, {
      method: 'POST',
      body: {
        username,
        fingerprint_hash: fingerprint
      }
    });
  },

  /**
   * Verify JWT token
   * @returns {Promise<Object>} - Verification result
   */
  async verifyToken() {
    return await this.request(CONFIG.API.ENDPOINTS.VERIFY_TOKEN, {
      method: 'POST'
    });
  },

  /**
   * Logout user
   * @returns {Promise<Object>} - Logout result
   */
  async logout() {
    return await this.request(CONFIG.API.ENDPOINTS.LOGOUT, {
      method: 'POST'
    });
  },

  /**
   * Get current user data
   * @returns {Promise<Object>} - User data
   */
  async getUserData() {
    return await this.request(CONFIG.API.ENDPOINTS.GET_USER, {
      method: 'GET'
    });
  },

  /**
   * Update user permissions
   * @param {Object} permissions - New permissions
   * @returns {Promise<Object>} - Updated permissions
   */
  async updatePermissions(permissions) {
    return await this.request(CONFIG.API.ENDPOINTS.UPDATE_PERMISSIONS, {
      method: 'PUT',
      body: { permissions }
    });
  },

  /**
   * Check if user is authenticated with backend
   * @returns {Promise<boolean>} - True if authenticated
   */
  async isAuthenticated() {
    try {
      await this.verifyToken();
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Refresh user data from backend
   * @returns {Promise<void>}
   */
  async refreshUserData() {
    try {
      const userData = await this.getUserData();
      
      // Update local storage
      await Storage.setUserData(userData.user);
      await Storage.setPermissions(userData.permissions);
      
      return userData;
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      throw error;
    }
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = APIClient;
}