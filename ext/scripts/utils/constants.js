// ===================================
// CONSTANTS.JS
// Configuration & Constants
// ===================================

const CONFIG = {
  // Backend API Configuration
  API: {
    BASE_URL: 'http://localhost:3000/api', // Change to your backend URL
    ENDPOINTS: {
      // Auth endpoints
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      VERIFY_TOKEN: '/auth/verify',
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
      UPDATE_PERMISSIONS: '/users/permissions',
      USER_SESSIONS: '/users/sessions',
      VERIFY_FINGERPRINT: '/users/verify-fingerprint',
      
      // Admin endpoints
      ADMIN_USERS: '/admin/users',
      ADMIN_PENDING_USERS: '/admin/users/pending',
      ADMIN_ACTIVE_USERS: '/admin/users/active',
      ADMIN_BLOCKED_USERS: '/admin/users/blocked',
      ADMIN_APPROVE: '/admin/users',
      ADMIN_BLOCK: '/admin/users',
      ADMIN_STATS: '/admin/stats'
    },
    TIMEOUT: 10000 // 10 seconds
  },

  // Storage Keys
  STORAGE_KEYS: {
    AUTH_TOKEN: 'auth_token',
    USER_DATA: 'user_data',
    PERMISSIONS: 'permissions',
    FINGERPRINT: 'device_fingerprint',
    WALLPAPER: 'wallpaper_settings',
    FAVORITES: 'wallpaper_favorites',
    SESSION: 'session_data',
    INPUTS: 'saved_inputs'
  },

  // Wallpaper Settings
  WALLPAPER: {
    DEFAULT_BLUR: 60,
    DEFAULT_DARKNESS: 50,
    MIN_BLUR: 0,
    MAX_BLUR: 100,
    MIN_DARKNESS: 0,
    MAX_DARKNESS: 100,
    MAX_FAVORITES: 10
  },

  // Card Testing
  CARD: {
    MIN_BIN_LENGTH: 6,
    MAX_BIN_LENGTH: 8,
    CARD_NUMBER_LENGTH: 16,
    CVV_LENGTH: 3,
    TEST_DELAY: 2000, // 2 seconds between tests
    MAX_RETRIES: 3
  },

  // Messages
  MESSAGES: {
    AUTH: {
      LOGIN_SUCCESS: 'Login successful!',
      LOGIN_FAILED: 'Invalid credentials',
      LOGOUT_SUCCESS: 'Logged out successfully',
      SESSION_EXPIRED: 'Session expired. Please login again.',
      NO_PERMISSION: 'You do not have permission to use this feature',
      FINGERPRINT_MISMATCH: 'Device fingerprint does not match'
    },
    WALLPAPER: {
      APPLIED: 'Wallpaper applied successfully',
      INVALID_URL: 'Invalid image URL',
      LOAD_ERROR: 'Failed to load image',
      FAVORITE_ADDED: 'Added to favorites',
      FAVORITE_REMOVED: 'Removed from favorites',
      FAVORITES_FULL: 'Maximum 10 favorites allowed',
      RESET_SUCCESS: 'Wallpaper reset to default'
    },
    CARD: {
      INVALID_BIN: 'Invalid BIN format',
      INVALID_CARD: 'Invalid card format',
      INVALID_PROXY: 'Invalid proxy format',
      NO_CARDS: 'No cards provided',
      TEST_STARTED: 'Card testing started',
      TEST_STOPPED: 'Card testing stopped',
      HIT_DETECTED: 'Hit Detected',
      ALL_TESTED: 'All cards tested'
    },
    ERROR: {
      NETWORK: 'Network error. Please check your connection.',
      SERVER: 'Server error. Please try again later.',
      UNKNOWN: 'An unknown error occurred'
    }
  },

  // Response Codes (Stripe)
  STRIPE_RESPONSES: {
    SUCCESS: 'success',
    GENERIC_DECLINE: 'generic_decline',
    INSUFFICIENT_FUNDS: 'insufficient_funds',
    CARD_EXPIRED: 'card_expired',
    INVALID_CVV: 'incorrect_cvc',
    DO_NOT_HONOR: 'do_not_honor',
    FRAUDULENT: 'fraudulent',
    LOST_CARD: 'lost_card',
    STOLEN_CARD: 'stolen_card',
    INVALID_NUMBER: 'incorrect_number',
    PROCESSING_ERROR: 'processing_error'
  },

  // Feature Flags
  FEATURES: {
    AUTO_HIT: 'auto_hit',
    BYPASS: 'bypass',
    PROXY_SUPPORT: 'proxy_support',
    WALLPAPER: 'wallpaper',
    FAVORITES: 'favorites'
  }
};

// Wallpaper Presets
const WALLPAPER_PRESETS = {
  cyber: {
    name: 'Cyber City',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    image: null // Will use gradient if no image
  },
  anime: {
    name: 'Anime Sunset',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    image: null
  },
  abstract: {
    name: 'Abstract Waves',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    image: null
  },
  dark: {
    name: 'Dark Matter',
    gradient: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
    image: null
  },
  neon: {
    name: 'Neon Lights',
    gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    image: null
  },
  matrix: {
    name: 'Matrix Rain',
    gradient: 'linear-gradient(135deg, #00c853 0%, #004d40 100%)',
    image: null
  },
  purple: {
    name: 'Purple Galaxy',
    gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    image: null
  },
  blue: {
    name: 'Blue Circuit',
    gradient: 'linear-gradient(135deg, #36d1dc 0%, #5b86e5 100%)',
    image: null
  },
  red: {
    name: 'Red Horizon',
    gradient: 'linear-gradient(135deg, #ff6a00 0%, #ee0979 100%)',
    image: null
  },
  green: {
    name: 'Green Code',
    gradient: 'linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)',
    image: null
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONFIG, WALLPAPER_PRESETS };
}