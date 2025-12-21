// ===================================
// FINGERPRINT.JS
// Device Fingerprinting System
// Location: scripts/auth/fingerprint.js
// ===================================

const Fingerprint = {
  fingerprintCache: null,

  /**
   * Collect comprehensive device data
   */
  collectDeviceData() {
    const data = {
      // Screen information
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        availWidth: window.screen.availWidth,
        availHeight: window.screen.availHeight,
        colorDepth: window.screen.colorDepth,
        pixelDepth: window.screen.pixelDepth,
        orientation: window.screen.orientation?.type || 'unknown'
      },

      // Browser information
      browser: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        languages: navigator.languages ? navigator.languages.join(',') : '',
        vendor: navigator.vendor,
        cookieEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack,
        maxTouchPoints: navigator.maxTouchPoints || 0
      },

      // Time & location
      locale: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timezoneOffset: new Date().getTimezoneOffset(),
        locale: Intl.DateTimeFormat().resolvedOptions().locale
      },

      // Hardware information
      hardware: {
        hardwareConcurrency: navigator.hardwareConcurrency || 0,
        deviceMemory: navigator.deviceMemory || 0,
        connection: this.getConnectionInfo()
      },

      // Browser capabilities
      capabilities: {
        webgl: this.hasWebGL(),
        webrtc: this.hasWebRTC(),
        indexedDB: !!window.indexedDB,
        localStorage: this.hasLocalStorage(),
        sessionStorage: this.hasSessionStorage(),
        canvas: this.hasCanvas()
      },

      // Plugins
      plugins: this.getPlugins(),

      // Canvas fingerprint
      canvasFingerprint: this.getCanvasFingerprint(),

      // WebGL fingerprint
      webglFingerprint: this.getWebGLFingerprint(),

      // Audio fingerprint
      audioFingerprint: this.getAudioFingerprint(),

      // Fonts
      fonts: this.getAvailableFonts()
    };

    return data;
  },

  /**
   * Get network connection info
   */
  getConnectionInfo() {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return null;

    return {
      effectiveType: conn.effectiveType,
      downlink: conn.downlink,
      rtt: conn.rtt,
      saveData: conn.saveData
    };
  },

  /**
   * Check WebGL support
   */
  hasWebGL() {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
      return false;
    }
  },

  /**
   * Check WebRTC support
   */
  hasWebRTC() {
    return !!(window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection);
  },

  /**
   * Check localStorage support
   */
  hasLocalStorage() {
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Check sessionStorage support
   */
  hasSessionStorage() {
    try {
      sessionStorage.setItem('test', 'test');
      sessionStorage.removeItem('test');
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Check Canvas support
   */
  hasCanvas() {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext && canvas.getContext('2d'));
    } catch (e) {
      return false;
    }
  },

  /**
   * Get installed plugins
   */
  getPlugins() {
    if (!navigator.plugins || navigator.plugins.length === 0) {
      return [];
    }

    const plugins = [];
    for (let i = 0; i < navigator.plugins.length; i++) {
      const plugin = navigator.plugins[i];
      plugins.push({
        name: plugin.name,
        description: plugin.description,
        filename: plugin.filename
      });
    }

    return plugins;
  },

  /**
   * Generate Canvas fingerprint
   */
  getCanvasFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 50;
      const ctx = canvas.getContext('2d');

      // Draw text with various styles
      ctx.textBaseline = 'top';
      ctx.font = '14px "Arial"';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('AriesxHit 🔐', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('AriesxHit 🔐', 4, 17);

      // Draw shapes
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgb(255,0,255)';
      ctx.beginPath();
      ctx.arc(50, 50, 50, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgb(0,255,255)';
      ctx.beginPath();
      ctx.arc(100, 50, 50, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgb(255,255,0)';
      ctx.beginPath();
      ctx.arc(75, 100, 50, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fill();

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

      if (!gl) return 'unsupported';

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (!debugInfo) return 'unavailable';

      return {
        vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
        renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
        version: gl.getParameter(gl.VERSION),
        shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
        maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)
      };
    } catch (e) {
      return 'unsupported';
    }
  },

  /**
   * Generate Audio fingerprint
   */
  getAudioFingerprint() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return 'unsupported';

      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const analyser = context.createAnalyser();
      const gainNode = context.createGain();
      const scriptProcessor = context.createScriptProcessor(4096, 1, 1);

      gainNode.gain.value = 0;
      oscillator.type = 'triangle';
      oscillator.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(gainNode);
      gainNode.connect(context.destination);

      oscillator.start(0);
      
      const audioData = analyser.frequencyBinCount;
      
      oscillator.stop();
      context.close();

      return audioData.toString();
    } catch (e) {
      return 'unsupported';
    }
  },

  /**
   * Detect available fonts
   */
  getAvailableFonts() {
    const baseFonts = ['monospace', 'sans-serif', 'serif'];
    const testFonts = [
      'Arial', 'Verdana', 'Times New Roman', 'Courier New',
      'Georgia', 'Palatino', 'Garamond', 'Comic Sans MS',
      'Trebuchet MS', 'Arial Black', 'Impact'
    ];

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const text = 'mmmmmmmmmmlli';
    const textSize = '72px';

    const availableFonts = [];

    for (const font of testFonts) {
      let detected = false;
      
      for (const baseFont of baseFonts) {
        ctx.font = `${textSize} ${baseFont}`;
        const baseWidth = ctx.measureText(text).width;

        ctx.font = `${textSize} ${font}, ${baseFont}`;
        const testWidth = ctx.measureText(text).width;

        if (baseWidth !== testWidth) {
          detected = true;
          break;
        }
      }

      if (detected) {
        availableFonts.push(font);
      }
    }

    return availableFonts;
  },

  /**
   * Generate SHA-256 hash from data
   */
  async hashData(data) {
    const jsonString = JSON.stringify(data, Object.keys(data).sort());
    const msgBuffer = new TextEncoder().encode(jsonString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  },

  /**
   * Generate complete device fingerprint
   */
  async generate() {
    // Check cache
    if (this.fingerprintCache) {
      return this.fingerprintCache;
    }

    // Collect device data
    const deviceData = this.collectDeviceData();

    // Generate hash
    const fingerprintHash = await this.hashData(deviceData);

    // Cache it
    this.fingerprintCache = fingerprintHash;

    console.log('[Fingerprint] Generated:', fingerprintHash.substring(0, 16) + '...');

    return fingerprintHash;
  },

  /**
   * Get or create fingerprint from storage
   */
  async getOrCreate() {
    // Check storage first
    const stored = await Storage.getFingerprint();
    
    if (stored) {
      this.fingerprintCache = stored;
      return stored;
    }

    // Generate new
    const fingerprint = await this.generate();

    // Save to storage
    await Storage.setFingerprint(fingerprint);

    return fingerprint;
  },

  /**
   * Verify current device matches stored fingerprint
   */
  async verify() {
    const stored = await Storage.getFingerprint();
    if (!stored) return false;

    const current = await this.generate();
    return stored === current;
  },

  /**
   * Clear cached fingerprint
   */
  clearCache() {
    this.fingerprintCache = null;
  }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Fingerprint;
}