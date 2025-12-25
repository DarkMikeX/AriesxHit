// ===================================
// API.JS
// Backend API Communication
// ===================================

import { API_BASE_URL } from '../config/api-config';

export async function registerUser(userData) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Fingerprint': userData.fingerprint
      },
      body: JSON.stringify({
        username: userData.username,
        email: userData.email,
        telegram: userData.telegram,
        fingerprintHash: userData.fingerprint
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
    }

    return {
      success: true,
      user: data.user || data.data
    };
  } catch (error) {
    console.error('Registration error:', error);
    return {
      success: false,
      message: error.message || 'Network error'
    };
  }
}

export async function checkExistingRegistration(fingerprint) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Fingerprint': fingerprint
      },
      body: JSON.stringify({
        fingerprintHash: fingerprint
      })
    });

    const data = await response.json();

    if (response.ok && data.exists) {
      return {
        exists: true,
        user: data.user || data.data
      };
    }

    return { exists: false };
  } catch (error) {
    console.error('Check registration error:', error);
    return { exists: false };
  }
}

export async function getUserStatus(fingerprint) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/status`, {
      method: 'GET',
      headers: {
        'X-Fingerprint': fingerprint
      }
    });

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        status: data.status,
        user: data.user
      };
    }

    return { success: false };
  } catch (error) {
    console.error('Get status error:', error);
    return { success: false };
  }
}
