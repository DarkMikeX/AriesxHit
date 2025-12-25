// API Configuration for Admin Panel
const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  TIMEOUT: 10000,
  
  ENDPOINTS: {
    // Auth
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    VERIFY: '/auth/verify',
    
    // Admin
    STATS: '/admin/stats',
    USERS: '/admin/users',
    PENDING_USERS: '/admin/users/pending',
    ACTIVE_USERS: '/admin/users/active',
    BLOCKED_USERS: '/admin/users/blocked',
    APPROVE_USER: (id) => `/admin/users/${id}/approve`,
    REJECT_USER: (id) => `/admin/users/${id}/reject`,
    BLOCK_USER: (id) => `/admin/users/${id}/block`,
    UNBLOCK_USER: (id) => `/admin/users/${id}/unblock`,
    UPDATE_PERMISSIONS: (id) => `/admin/users/${id}/permissions`,
    DELETE_USER: (id) => `/admin/users/${id}`,
    RESET_PASSWORD: (id) => `/admin/users/${id}/password`,
    LOGIN_ATTEMPTS: '/admin/login-attempts',
  }
};

export default API_CONFIG;
