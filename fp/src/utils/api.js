// ===================================
// API.JS
// Backend API Communication
// ===================================

import { API_BASE_URL } from '../config/api-config';

async function parseJSONResponse(response) {
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch (e) {
      throw new Error('Invalid JSON response from server');
    }
  }
  return { message: await response.text() || 'Unknown error' };
}

async function handleAPIError(response, defaultMessage) {
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    const message = retryAfter 
      ? `Too many registration attempts. Please try again after ${retryAfter} seconds.`
      : 'Too many registration attempts, please try again later.';
    return {
      success: false,
      message,
      isRateLimited: true,
      retryAfter: retryAfter ? parseInt(retryAfter) : null
    };
  }

  const data = await parseJSONResponse(response);
  return {
    success: false,
    message: data.message || defaultMessage || 'An error occurred'
  };
}

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
        fingerprint_hash: userData.fingerprint
      })
    });

    if (!response.ok) {
      return await handleAPIError(response, 'Registration failed');
    }

    const data = await parseJSONResponse(response);
    return {
      success: true,
      user: data.user || data.data
    };
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        success: false,
        message: 'Network error. Please check your internet connection and try again.'
      };
    }
    
    return {
      success: false,
      message: error.message || 'Network error. Please try again.'
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
        fingerprint_hash: fingerprint
      })
    });

    if (!response.ok) {
      // For check endpoint, we'll silently fail and allow registration
      console.warn('Check registration failed:', response.status);
      return { exists: false };
    }

    const data = await parseJSONResponse(response);

    if (data.exists) {
      return {
        exists: true,
        user: data.user || data.data
      };
    }

    return { exists: false };
  } catch (error) {
    console.error('Check registration error:', error);
    // Fail silently to allow registration attempt
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

    if (!response.ok) {
      return { success: false };
    }

    const data = await parseJSONResponse(response);
    return {
      success: true,
      status: data.status,
      user: data.user
    };
  } catch (error) {
    console.error('Get status error:', error);
    return { success: false };
  }
}
