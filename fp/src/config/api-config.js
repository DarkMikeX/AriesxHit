// ===================================
// API-CONFIG.JS
// API Configuration
// ===================================

// Backend API URL
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// API Endpoints
export const ENDPOINTS = {
  REGISTER: '/auth/register',
  CHECK: '/auth/check',
  STATUS: '/auth/status',
  LOGIN: '/auth/login'
};
