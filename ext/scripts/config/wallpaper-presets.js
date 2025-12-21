// ===================================
// WALLPAPER-PRESETS.JS
// Wallpaper Preset Definitions
// Location: scripts/config/wallpaper-presets.js
// ===================================

const WallpaperPresets = {
  cyber: {
    id: 'cyber',
    name: 'Cyber City',
    description: 'Futuristic city with blue tech vibes',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    thumbnail: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    colors: {
      primary: '#667eea',
      secondary: '#764ba2'
    }
  },

  anime: {
    id: 'anime',
    name: 'Anime Sunset',
    description: 'Colorful anime-style sunset',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    thumbnail: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    colors: {
      primary: '#f093fb',
      secondary: '#f5576c'
    }
  },

  abstract: {
    id: 'abstract',
    name: 'Abstract Waves',
    description: 'Modern abstract art with flowing waves',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    thumbnail: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    colors: {
      primary: '#4facfe',
      secondary: '#00f2fe'
    }
  },

  dark: {
    id: 'dark',
    name: 'Dark Matter',
    description: 'Deep space dark theme',
    gradient: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
    thumbnail: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
    colors: {
      primary: '#0f2027',
      secondary: '#2c5364'
    }
  },

  neon: {
    id: 'neon',
    name: 'Neon Lights',
    description: 'Vibrant neon pink and yellow',
    gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    thumbnail: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    colors: {
      primary: '#fa709a',
      secondary: '#fee140'
    }
  },

  matrix: {
    id: 'matrix',
    name: 'Matrix Rain',
    description: 'Green hacker matrix code',
    gradient: 'linear-gradient(135deg, #00c853 0%, #004d40 100%)',
    thumbnail: 'linear-gradient(135deg, #00c853 0%, #004d40 100%)',
    colors: {
      primary: '#00c853',
      secondary: '#004d40'
    }
  },

  purple: {
    id: 'purple',
    name: 'Purple Galaxy',
    description: 'Purple and pink galaxy',
    gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    thumbnail: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    colors: {
      primary: '#a8edea',
      secondary: '#fed6e3'
    }
  },

  blue: {
    id: 'blue',
    name: 'Blue Circuit',
    description: 'Blue tech circuit board',
    gradient: 'linear-gradient(135deg, #36d1dc 0%, #5b86e5 100%)',
    thumbnail: 'linear-gradient(135deg, #36d1dc 0%, #5b86e5 100%)',
    colors: {
      primary: '#36d1dc',
      secondary: '#5b86e5'
    }
  },

  red: {
    id: 'red',
    name: 'Red Horizon',
    description: 'Dramatic red and orange sunset',
    gradient: 'linear-gradient(135deg, #ff6a00 0%, #ee0979 100%)',
    thumbnail: 'linear-gradient(135deg, #ff6a00 0%, #ee0979 100%)',
    colors: {
      primary: '#ff6a00',
      secondary: '#ee0979'
    }
  },

  green: {
    id: 'green',
    name: 'Green Code',
    description: 'Terminal green code style',
    gradient: 'linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)',
    thumbnail: 'linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)',
    colors: {
      primary: '#56ab2f',
      secondary: '#a8e063'
    }
  }
};

/**
 * Get all presets as array
 */
function getAllPresets() {
  return Object.values(WallpaperPresets);
}

/**
 * Get preset by ID
 */
function getPresetById(id) {
  return WallpaperPresets[id] || null;
}

/**
 * Get preset names
 */
function getPresetNames() {
  return Object.keys(WallpaperPresets);
}

/**
 * Check if preset exists
 */
function presetExists(id) {
  return id in WallpaperPresets;
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    WallpaperPresets,
    getAllPresets,
    getPresetById,
    getPresetNames,
    presetExists
  };
}