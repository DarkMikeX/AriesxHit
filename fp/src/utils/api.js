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
  
  // Extract detailed error information
  let errorMessage = data.message || defaultMessage || 'An error occurred';
  
  // If there are validation errors, include them
  if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
    errorMessage = data.errors.join('. ');
  } else if (data.errors && typeof data.errors === 'object') {
    const errorList = Object.values(data.errors).flat();
    if (errorList.length > 0) {
      errorMessage = errorList.join('. ');
    }
  }
  
  return {
    success: false,
    message: errorMessage,
    errors: data.errors || null,
    isRateLimited: response.status === 429
  };
}

export async function registerUser(userData) {
  try {
    // Validate fingerprint format before sending
    if (!userData.fingerprint || typeof userData.fingerprint !== 'string') {
      return {
        success: false,
        message: 'Invalid fingerprint. Please refresh the page and try again.'
      };
    }

    // Ensure fingerprint is 64 characters (SHA-256)
    if (userData.fingerprint.length !== 64) {
      console.error('Invalid fingerprint length:', userData.fingerprint.length);
      return {
        success: false,
        message: 'Fingerprint generation failed. Please refresh the page and try again.'
      };
    }

    const requestBody = {
      username: userData.username,
      fingerprintHash: userData.fingerprint
    };

    // Only include email and telegram if they exist
    if (userData.email) {
      requestBody.email = userData.email;
    }
    if (userData.telegram) {
      requestBody.telegram = userData.telegram;
    }

    console.log('Sending registration request:', {
      url: `${API_BASE_URL}/auth/register`,
      username: userData.username,
      hasEmail: !!userData.email,
      hasTelegram: !!userData.telegram,
      fingerprintLength: userData.fingerprint.length
    });

    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Fingerprint': userData.fingerprint
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Registration response status:', response.status);

    if (!response.ok) {
      return await handleAPIError(response, 'Registration failed');
    }

    const data = await parseJSONResponse(response);
    console.log('Registration success:', data);
    
    return {
      success: true,
      user: data.user || data.data?.user || data.data
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
        fingerprintHash: fingerprint
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
