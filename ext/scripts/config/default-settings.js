// ===================================
// DEFAULT-SETTINGS.JS
// Default Configuration & Settings
// Location: scripts/config/default-settings.js
// ===================================

const DefaultSettings = {
  // ==================== WALLPAPER SETTINGS ====================
  wallpaper: {
    type: 'default', // 'default', 'preset', 'custom'
    preset: null,
    url: null,
    blur: 60, // 0-100
    darkness: 50, // 0-100
    favorites: []
  },

  // ==================== UI SETTINGS ====================
  ui: {
    theme: 'dark', // 'dark', 'light'
    animations: true,
    notifications: true,
    soundEffects: false,
    compactMode: false
  },

  // ==================== AUTO HIT SETTINGS ====================
  autoHit: {
    enabled: false,
    mode: 'list', // 'list', 'bin'
    retryDelay: 2000, // milliseconds
    maxRetries: 3,
    stopOnHit: true,
    autoRetry: true
  },

  // ==================== BYPASS SETTINGS ====================
  bypass: {
    enabled: false,
    autoEnable: false, // Auto-enable on Stripe pages
    logRequests: true
  },

  // ==================== INPUT SETTINGS ====================
  inputs: {
    bin: '',
    proxy: '',
    cards: '',
    saveInputs: true, // Save inputs between sessions
    autoValidate: true
  },

  // ==================== LOGGING SETTINGS ====================
  logging: {
    enabled: true,
    maxLogs: 500,
    autoScroll: true,
    showTimestamps: true,
    colorCoded: true,
    logToConsole: false
  },

  // ==================== NOTIFICATION SETTINGS ====================
  notifications: {
    showSuccess: true,
    showErrors: true,
    showWarnings: true,
    showInfo: false,
    duration: 3000, // milliseconds
    position: 'top-right' // 'top-right', 'top-left', 'bottom-right', 'bottom-left'
  },

  // ==================== STATS SETTINGS ====================
  stats: {
    trackStats: true,
    persistStats: true,
    resetOnLogout: false
  },

  // ==================== SECURITY SETTINGS ====================
  security: {
    autoLogout: false,
    logoutTimeout: 30, // minutes
    requireReauth: false,
    lockOnInactivity: false
  },

  // ==================== ADVANCED SETTINGS ====================
  advanced: {
    debugMode: false,
    experimentalFeatures: false,
    developerMode: false,
    customAPI: false,
    apiEndpoint: ''
  },

  // ==================== STRIPE DETECTION SETTINGS ====================
  detection: {
    autoDetect: true,
    showDetectionNotif: true,
    highlightForms: false,
    autoFillOnDetect: false
  }
};

/**
 * Get default settings
 */
function getDefaultSettings() {
  return JSON.parse(JSON.stringify(DefaultSettings));
}

/**
 * Get default value for a specific setting
 */
function getDefault(path) {
  const keys = path.split('.');
  let value = DefaultSettings;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return undefined;
    }
  }

  return value;
}

/**
 * Merge user settings with defaults
 */
function mergeWithDefaults(userSettings) {
  const defaults = getDefaultSettings();
  return deepMerge(defaults, userSettings || {});
}

/**
 * Deep merge two objects
 */
function deepMerge(target, source) {
  const output = Object.assign({}, target);

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }

  return output;
}

/**
 * Check if value is an object
 */
function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Reset specific setting to default
 */
function resetSetting(path) {
  return getDefault(path);
}

/**
 * Validate settings object
 */
function validateSettings(settings) {
  const errors = [];

  // Validate wallpaper settings
  if (settings.wallpaper) {
    if (settings.wallpaper.blur < 0 || settings.wallpaper.blur > 100) {
      errors.push('Wallpaper blur must be between 0 and 100');
    }
    if (settings.wallpaper.darkness < 0 || settings.wallpaper.darkness > 100) {
      errors.push('Wallpaper darkness must be between 0 and 100');
    }
  }

  // Validate auto hit settings
  if (settings.autoHit) {
    if (settings.autoHit.retryDelay < 100) {
      errors.push('Retry delay must be at least 100ms');
    }
    if (settings.autoHit.maxRetries < 0) {
      errors.push('Max retries cannot be negative');
    }
  }

  // Validate logging settings
  if (settings.logging) {
    if (settings.logging.maxLogs < 10) {
      errors.push('Max logs must be at least 10');
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * Get settings schema (for validation)
 */
function getSettingsSchema() {
  return {
    wallpaper: {
      type: { type: 'string', enum: ['default', 'preset', 'custom'] },
      preset: { type: 'string', nullable: true },
      url: { type: 'string', nullable: true },
      blur: { type: 'number', min: 0, max: 100 },
      darkness: { type: 'number', min: 0, max: 100 },
      favorites: { type: 'array' }
    },
    ui: {
      theme: { type: 'string', enum: ['dark', 'light'] },
      animations: { type: 'boolean' },
      notifications: { type: 'boolean' },
      soundEffects: { type: 'boolean' },
      compactMode: { type: 'boolean' }
    },
    autoHit: {
      enabled: { type: 'boolean' },
      mode: { type: 'string', enum: ['list', 'bin'] },
      retryDelay: { type: 'number', min: 100 },
      maxRetries: { type: 'number', min: 0 },
      stopOnHit: { type: 'boolean' },
      autoRetry: { type: 'boolean' }
    }
  };
}

/**
 * Export specific setting groups
 */
function exportWallpaperSettings() {
  return { ...DefaultSettings.wallpaper };
}

function exportUISettings() {
  return { ...DefaultSettings.ui };
}

function exportAutoHitSettings() {
  return { ...DefaultSettings.autoHit };
}

function exportBypassSettings() {
  return { ...DefaultSettings.bypass };
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DefaultSettings,
    getDefaultSettings,
    getDefault,
    mergeWithDefaults,
    resetSetting,
    validateSettings,
    getSettingsSchema,
    exportWallpaperSettings,
    exportUISettings,
    exportAutoHitSettings,
    exportBypassSettings
  };
}