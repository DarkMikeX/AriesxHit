// ===================================
// FINGERPRINT.JS
// Browser Fingerprint Generation
// ===================================

export async function generateFingerprint() {
  const components = await collectComponents();
  const hash = await hashComponents(components);
  
  return {
    hash,
    components: {
      platform: components.platform,
      browser: detectBrowser(),
      screen: `${components.screenWidth}x${components.screenHeight}`,
      timezone: components.timezone
    }
  };
}

async function collectComponents() {
  const components = {
    // User Agent
    userAgent: navigator.userAgent,
    
    // Platform
    platform: navigator.platform,
    
    // Language
    language: navigator.language,
    languages: navigator.languages?.join(','),
    
    // Screen
    screenWidth: screen.width,
    screenHeight: screen.height,
    screenDepth: screen.colorDepth,
    pixelRatio: window.devicePixelRatio,
    
    // Timezone
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
    
    // Hardware
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: navigator.deviceMemory,
    
    // Touch
    touchSupport: 'ontouchstart' in window,
    maxTouchPoints: navigator.maxTouchPoints,
    
    // Canvas fingerprint
    canvas: await getCanvasFingerprint(),
    
    // WebGL fingerprint
    webgl: getWebGLFingerprint(),
    
    // Audio fingerprint
    audio: await getAudioFingerprint(),
    
    // Fonts
    fonts: await detectFonts(),
    
    // Plugins
    plugins: getPlugins(),
    
    // Do Not Track
    doNotTrack: navigator.doNotTrack,
    
    // Cookies enabled
    cookiesEnabled: navigator.cookieEnabled,
    
    // Storage available
    localStorage: !!window.localStorage,
    sessionStorage: !!window.sessionStorage,
    indexedDB: !!window.indexedDB
  };
  
  return components;
}

function getCanvasFingerprint() {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 50;
      
      const ctx = canvas.getContext('2d');
      
      // Draw text
      ctx.textBaseline = 'top';
      ctx.font = "14px 'Arial'";
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('AriesxHit,FP', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('AriesxHit,FP', 4, 17);
      
      // Add some shapes
      ctx.beginPath();
      ctx.arc(50, 50, 50, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fill();
      
      resolve(canvas.toDataURL().slice(-50));
    } catch (e) {
      resolve('canvas-error');
    }
  });
}

function getWebGLFingerprint() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) return 'no-webgl';
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    
    return {
      vendor: gl.getParameter(gl.VENDOR),
      renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown',
      version: gl.getParameter(gl.VERSION)
    };
  } catch (e) {
    return 'webgl-error';
  }
}

async function getAudioFingerprint() {
  return new Promise((resolve) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
        resolve('no-audio');
        return;
      }
      
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const analyser = context.createAnalyser();
      const gain = context.createGain();
      const processor = context.createScriptProcessor(4096, 1, 1);
      
      gain.gain.value = 0;
      oscillator.type = 'triangle';
      oscillator.connect(analyser);
      analyser.connect(processor);
      processor.connect(gain);
      gain.connect(context.destination);
      
      oscillator.start(0);
      
      processor.onaudioprocess = (e) => {
        const data = new Float32Array(analyser.frequencyBinCount);
        analyser.getFloatFrequencyData(data);
        
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          sum += Math.abs(data[i]);
        }
        
        oscillator.disconnect();
        processor.disconnect();
        gain.disconnect();
        context.close();
        
        resolve(sum.toString().slice(0, 10));
      };
      
      setTimeout(() => resolve('audio-timeout'), 1000);
    } catch (e) {
      resolve('audio-error');
    }
  });
}

async function detectFonts() {
  const baseFonts = ['monospace', 'sans-serif', 'serif'];
  const testFonts = [
    'Arial', 'Verdana', 'Times New Roman', 'Courier New', 
    'Georgia', 'Comic Sans MS', 'Impact', 'Trebuchet MS',
    'Arial Black', 'Lucida Console', 'Tahoma', 'Palatino'
  ];
  
  const testString = 'mmmmmmmmmmlli';
  const testSize = '72px';
  
  const span = document.createElement('span');
  span.style.position = 'absolute';
  span.style.left = '-9999px';
  span.style.fontSize = testSize;
  span.innerHTML = testString;
  document.body.appendChild(span);
  
  const baseSizes = {};
  for (const baseFont of baseFonts) {
    span.style.fontFamily = baseFont;
    baseSizes[baseFont] = { width: span.offsetWidth, height: span.offsetHeight };
  }
  
  const detectedFonts = [];
  for (const font of testFonts) {
    let detected = false;
    for (const baseFont of baseFonts) {
      span.style.fontFamily = `'${font}', ${baseFont}`;
      if (span.offsetWidth !== baseSizes[baseFont].width || 
          span.offsetHeight !== baseSizes[baseFont].height) {
        detected = true;
        break;
      }
    }
    if (detected) detectedFonts.push(font);
  }
  
  document.body.removeChild(span);
  return detectedFonts.join(',');
}

function getPlugins() {
  const plugins = [];
  for (let i = 0; i < navigator.plugins.length; i++) {
    plugins.push(navigator.plugins[i].name);
  }
  return plugins.join(',');
}

function detectBrowser() {
  const ua = navigator.userAgent;
  
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Opera')) return 'Opera';
  
  return 'Unknown';
}

async function hashComponents(components) {
  const str = JSON.stringify(components);
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}
