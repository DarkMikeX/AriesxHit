// ===================================
// CRYPTO.JS
// Device Fingerprinting & SHA-256
// ===================================

const Crypto = {
  /**
   * Generate SHA-256 hash from string
   * @param {string} message - String to hash
   * @returns {Promise<string>} - Hex hash
   */
  async sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  },

  /**
   * Collect device fingerprint data
   * @returns {Object} - Device information
   */
  collectDeviceData() {
    return {
      // Screen information
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      screenDepth: window.screen.colorDepth,
      screenAvailWidth: window.screen.availWidth,
      screenAvailHeight: window.screen.availHeight,
      
      // Browser information
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      languages: navigator.languages ? navigator.languages.join(',') : '',
      
      // Time information
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),
      
      // Hardware information
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      deviceMemory: navigator.deviceMemory || 0,
      
      // Plugins (limited in modern browsers)
      plugins: this.getPlugins(),
      
      // Canvas fingerprint
      canvas: this.getCanvasFingerprint(),
      
      // WebGL fingerprint
      webgl: this.getWebGLFingerprint()
    };
  },

  /**
   * Get installed plugins
   */
  getPlugins() {
    if (!navigator.plugins || navigator.plugins.length === 0) {
      return 'none';
    }
    
    const plugins = [];
    for (let i = 0; i < navigator.plugins.length; i++) {
      plugins.push(navigator.plugins[i].name);
    }
    return plugins.sort().join(',');
  },

  /**
   * Generate canvas fingerprint
   */
  getCanvasFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Draw text
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('AriesxHit', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('AriesxHit', 4, 17);
      
      return canvas.toDataURL();
    } catch (e) {
      return 'unsupported';
    }
  },

  /**
   * Generate WebGL fingerprint
   */
  getWebGLFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (!gl) {
        return 'unsupported';
      }
      
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (!debugInfo) {
        return 'unavailable';
      }
      
      return {
        vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
        renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      };
    } catch (e) {
      return 'unsupported';
    }
  },

  /**
   * Generate device fingerprint hash
   * @returns {Promise<string>} - SHA-256 fingerprint
   */
  async generateFingerprint() {
    const deviceData = this.collectDeviceData();
    
    // Convert device data to string for hashing
    const fingerprintString = JSON.stringify(deviceData, Object.keys(deviceData).sort());
    
    // Generate SHA-256 hash
    const fingerprintHash = await this.sha256(fingerprintString);
    
    return fingerprintHash;
  },

  /**
   * Get or create fingerprint from storage
   * @returns {Promise<string>} - Fingerprint hash
   */
  async getOrCreateFingerprint() {
    // Check if fingerprint already exists
    let fingerprint = await Storage.getFingerprint();
    
    if (!fingerprint) {
      // Generate new fingerprint
      fingerprint = await this.generateFingerprint();
      
      // Save to storage
      await Storage.setFingerprint(fingerprint);
    }
    
    return fingerprint;
  },

  /**
   * Verify if current device matches stored fingerprint
   * @returns {Promise<boolean>} - True if matches
   */
  async verifyFingerprint() {
    const storedFingerprint = await Storage.getFingerprint();
    if (!storedFingerprint) {
      return false;
    }
    
    const currentFingerprint = await this.generateFingerprint();
    return storedFingerprint === currentFingerprint;
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Crypto;
}