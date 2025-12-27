import API_CONFIG from '../config/api-config';

class ApiService {
  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
  }

  getToken() {
    return localStorage.getItem('admin_token');
  }

  setToken(token) {
    localStorage.setItem('admin_token', token);
  }

  removeToken() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw {
          status: response.status,
          message: data.message || 'Request failed',
          data,
        };
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw { status: 408, message: 'Request timeout' };
      }
      
      if (error.status) {
        throw error;
      }
      
      throw { status: 0, message: 'Network error' };
    }
  }

  // Auth endpoints
  async login(username, password, fingerprintHash) {
    const response = await this.request(API_CONFIG.ENDPOINTS.LOGIN, {
      method: 'POST',
      body: JSON.stringify({ username, password, fingerprintHash }),
    });
    
    if (response.success && response.data?.token) {
      this.setToken(response.data.token);
      localStorage.setItem('admin_user', JSON.stringify(response.data.user));
    }
    
    return response;
  }

  async logout() {
    try {
      await this.request(API_CONFIG.ENDPOINTS.LOGOUT, { method: 'POST' });
    } finally {
      this.removeToken();
    }
  }

  async verifyToken() {
    return this.request(API_CONFIG.ENDPOINTS.VERIFY);
  }

  // Admin endpoints
  async getStats() {
    return this.request(API_CONFIG.ENDPOINTS.STATS);
  }

  async getAllUsers() {
    return this.request(API_CONFIG.ENDPOINTS.USERS);
  }

  async getPendingUsers() {
    return this.request(API_CONFIG.ENDPOINTS.PENDING_USERS);
  }

  async getActiveUsers() {
    return this.request(API_CONFIG.ENDPOINTS.ACTIVE_USERS);
  }

  async getBlockedUsers() {
    return this.request(API_CONFIG.ENDPOINTS.BLOCKED_USERS);
  }

  async approveUser(userId, password, permissions) {
    return this.request(API_CONFIG.ENDPOINTS.APPROVE_USER(userId), {
      method: 'POST',
      body: JSON.stringify({ password, permissions }),
    });
  }

  async rejectUser(userId) {
    return this.request(API_CONFIG.ENDPOINTS.REJECT_USER(userId), {
      method: 'POST',
    });
  }

  async blockUser(userId, reason) {
    return this.request(API_CONFIG.ENDPOINTS.BLOCK_USER(userId), {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async unblockUser(userId) {
    return this.request(API_CONFIG.ENDPOINTS.UNBLOCK_USER(userId), {
      method: 'POST',
    });
  }

  async updatePermissions(userId, permissions) {
    return this.request(API_CONFIG.ENDPOINTS.UPDATE_PERMISSIONS(userId), {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    });
  }

  async deleteUser(userId) {
    return this.request(API_CONFIG.ENDPOINTS.DELETE_USER(userId), {
      method: 'DELETE',
    });
  }

  async resetPassword(userId, password) {
    return this.request(API_CONFIG.ENDPOINTS.RESET_PASSWORD(userId), {
      method: 'PUT',
      body: JSON.stringify({ password }),
    });
  }

  async getLoginAttempts(limit = 100) {
    return this.request(`${API_CONFIG.ENDPOINTS.LOGIN_ATTEMPTS}?limit=${limit}`);
  }
}

const api = new ApiService();
export default api;
